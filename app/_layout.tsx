import { ToastProvider } from '@/components/ui';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Colors } from '@/constants/theme';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { hydrateAllStores } from '@/lib/db';
import { getLocalDateKey } from '@/lib/date';
import { buildNutritionSummary } from '@/lib/nutritionSummary';
import { addNotificationRoutingListener } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { clearWidgetSnapshot, useWidgetSync } from '@/lib/widgetSync';
import { useAppleHealthStore } from '@/stores/appleHealthStore';
import { useAuthStore } from '@/stores/authStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { Component, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

// Error boundary to catch runtime crashes
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error) { console.error('ROOT ERROR:', error); }
    render() {
        if (this.state.error) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 20 }}>
                    <Text style={{ color: '#f44', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>App Error</Text>
                    <Text style={{ color: '#fff', fontSize: 14 }}>{this.state.error.message}</Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
        },
    },
});

function RootLayoutContent() {
    const { isLoading, setSession, setLoading, setUser, setOnboarded } = useAuthStore();
    const [storesHydrated, setStoresHydrated] = useState(false);

    useWidgetSync(storesHydrated);

    const hydrateFromSupabase = useCallback(async (userId: string) => {
        try {
            const data = await hydrateAllStores(userId);

            // Profile
            if (data.profile) {
                setUser(data.profile);
                setOnboarded(!!data.profile.height_cm);
            } else {
                setUser(null);
                setOnboarded(false);
            }

            // Workout store
            const workoutStore = useWorkoutStore.getState();
            if (data.exercises.length > 0) workoutStore.setExercises(data.exercises);
            if (data.workouts.length > 0) workoutStore.setRecentWorkouts(data.workouts);
            if (data.templates.length > 0) workoutStore.setTemplates(data.templates);
            if (data.personalRecords.length > 0) workoutStore.setPersonalRecords(data.personalRecords);

            // Nutrition store — rebuild today from local-day logs and retain real history for analytics.
            const nutritionStore = useNutritionStore.getState();
            nutritionStore.setNutritionHistory(data.nutritionHistory);
            nutritionStore.setTodaySummary(buildNutritionSummary(getLocalDateKey(), data.foodLogs, data.waterLogs));

            // Progress store
            const progressStore = useProgressStore.getState();
            if (data.weightEntries.length > 0) progressStore.setWeightEntries(data.weightEntries);
            if (data.measurements.length > 0) progressStore.setMeasurements(data.measurements);
            if (data.photos.length > 0) progressStore.setProgressPhotos(data.photos);
            if (data.goals.length > 0) progressStore.setGoals(data.goals);

            // Recovery store — mark unlocked achievements
            const recoveryStore = useRecoveryStore.getState();
            if (data.recoveryLogs.length > 0) {
                // Set recovery logs + today's recovery
                const todayStr = new Date().toISOString().split('T')[0];
                const todayLog = data.recoveryLogs.find((r) => r.date === todayStr);
                if (todayLog) {
                    // Directly set today's recovery without triggering save again
                    recoveryStore.recoveryLogs = data.recoveryLogs;
                    recoveryStore.todayRecovery = todayLog;
                }
            }
            if (data.unlockedIds.length > 0) {
                const achievements = recoveryStore.achievements.map((a) =>
                    data.unlockedIds.includes(a.id)
                        ? { ...a, unlocked_at: 'loaded', progress: 100 }
                        : a
                );
                // Directly update to avoid triggering save
                useRecoveryStore.setState({ achievements });
            }
            if (data.supplements.length > 0) {
                useRecoveryStore.setState({ supplements: data.supplements });
            }

            // Meal plan store
            if (data.dietProfile) {
                useMealPlanStore.setState({ dietProfile: data.dietProfile });
            }
            if (data.fastingSessions.length > 0) {
                const active = data.fastingSessions.find((f) => f.status === 'active');
                const history = data.fastingSessions.filter((f) => f.status !== 'active');
                useMealPlanStore.setState({
                    activeFast: active || null,
                    fastHistory: history,
                });
            }

            useAppleHealthStore.getState().refreshStatus().catch(() => { });
        } catch (err) {
            console.warn('Hydration error:', err);
        } finally {
            setStoresHydrated(true);
        }
    }, [setUser, setOnboarded]);

    useEffect(() => {
        const notificationSubscription = addNotificationRoutingListener();
        const appStateSubscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                useAppleHealthStore.getState().refreshStatus().catch(() => { });
            }
        });

        // Safety timeout — never stay on loading screen forever
        const timeout = setTimeout(() => {
            console.warn('Auth check timed out, forcing loading=false');
            setLoading(false);
        }, 5000);

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeout);
            if (session) {
                setSession({ access_token: session.access_token });
                // Hydrate stores from Supabase
                hydrateFromSupabase(session.user.id).finally(() => setLoading(false));
            } else {
                setStoresHydrated(true);
                setLoading(false);
            }
        }).catch(() => {
            clearTimeout(timeout);
            setStoresHydrated(true);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session) {
                    setSession({ access_token: session.access_token });
                } else {
                    setSession(null);
                    // Clear shared widget data so widgets switch to signed-out state.
                    clearWidgetSnapshot();
                }
            }
        );

        return () => {
            notificationSubscription.remove();
            appStateSubscription.remove();
            subscription.unsubscribe();
        };
    }, [setSession, setLoading, hydrateFromSupabase]);

    if (isLoading) {
        return (
            <View style={[styles.loading, { backgroundColor: '#fff' }]}>
                <Text style={{ color: '#000', fontSize: 20, marginBottom: 10 }}>Loading BodyPilot...</Text>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <>
            <ThemedStatusBar />
            <OfflineBanner />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.background },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen
                    name="workout/active"
                    options={{
                        presentation: 'fullScreenModal',
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen name="nutrition" />
                <Stack.Screen name="progress" />
                <Stack.Screen name="social" />
                <Stack.Screen name="account-settings" />
                <Stack.Screen name="customize-macros" />
                <Stack.Screen
                    name="premium"
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen name="ai-workout" />
                <Stack.Screen name="ai-meal-plan" />
                <Stack.Screen name="weekly-report" />
                <Stack.Screen
                    name="chat"
                    options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                    }}
                />
            </Stack>
        </>
    );
}

function ThemedStatusBar() {
    const { isDark } = useTheme();
    return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <ToastProvider>
                        <RootLayoutContent />
                    </ToastProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});
