import { Colors } from '@/constants/theme';
import { hydrateAllStores } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { FoodLogEntry, MealType } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

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

    const hydrateFromSupabase = useCallback(async (userId: string) => {
        try {
            const data = await hydrateAllStores(userId);

            // Profile
            if (data.profile) {
                setUser(data.profile);
                setOnboarded(true);
            }

            // Workout store
            const workoutStore = useWorkoutStore.getState();
            if (data.exercises.length > 0) workoutStore.setExercises(data.exercises);
            if (data.workouts.length > 0) workoutStore.setRecentWorkouts(data.workouts);
            if (data.templates.length > 0) workoutStore.setTemplates(data.templates);
            if (data.personalRecords.length > 0) workoutStore.setPersonalRecords(data.personalRecords);

            // Nutrition store — rebuild today summary from food logs
            if (data.foodLogs.length > 0 || data.waterLogs.length > 0) {
                const meals: Record<MealType, FoodLogEntry[]> = {
                    breakfast: [], lunch: [], dinner: [], snack: [],
                };
                let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalFiber = 0;
                for (const fl of data.foodLogs) {
                    meals[fl.meal_type].push(fl);
                    totalCal += fl.calories;
                    totalP += fl.protein_g;
                    totalC += fl.carbs_g;
                    totalF += fl.fat_g;
                }
                const waterMl = data.waterLogs.reduce((s, w) => s + w.amount_ml, 0);
                const nutritionStore = useNutritionStore.getState();
                nutritionStore.setTodaySummary({
                    date: new Date().toISOString().split('T')[0],
                    total_calories: totalCal,
                    total_protein_g: totalP,
                    total_carbs_g: totalC,
                    total_fat_g: totalF,
                    total_fiber_g: totalFiber,
                    water_ml: waterMl,
                    meals,
                });
            }

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
        } catch (err) {
            console.warn('Hydration error:', err);
        }
    }, [setUser, setOnboarded]);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession({ access_token: session.access_token });
                // Hydrate stores from Supabase
                hydrateFromSupabase(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        }).catch(() => {
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session) {
                    setSession({ access_token: session.access_token });
                } else {
                    setSession(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [setSession, setLoading, hydrateFromSupabase]);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
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

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <RootLayoutContent />
        </QueryClientProvider>
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
