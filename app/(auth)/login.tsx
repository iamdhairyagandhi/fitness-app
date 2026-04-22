import { Button, Input } from '@/components/ui';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { signInWithApple, signInWithGoogle } from '@/lib/auth';
import { hydrateAllStores } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { FoodLogEntry, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { setSession, setAdmin, setUser, setOnboarded } = useAuthStore();

    const handleLogin = async () => {
        setErrorMsg('');
        if (!email.trim() || !password.trim()) {
            setErrorMsg('Please fill in all fields');
            return;
        }

        // Admin bypass — skip Supabase
        if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            setAdmin(true);
            setSession({ access_token: 'admin-token' });
            router.replace('/(tabs)');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            Alert.alert('Login Failed', error.message);
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            setSession({ access_token: data.session.access_token });

            // Hydrate stores from Supabase
            try {
                const hydrated = await hydrateAllStores(data.session.user.id);

                if (hydrated.profile) {
                    setUser(hydrated.profile);
                }

                // Check if user has completed onboarding (height_cm is set during onboarding)
                const needsOnboarding = !hydrated.profile?.height_cm;

                if (!needsOnboarding) {
                    setOnboarded(true);

                    // Populate stores
                    const ws = useWorkoutStore.getState();
                    if (hydrated.exercises.length) ws.setExercises(hydrated.exercises);
                    if (hydrated.workouts.length) ws.setRecentWorkouts(hydrated.workouts);
                    if (hydrated.templates.length) ws.setTemplates(hydrated.templates);
                    if (hydrated.personalRecords.length) ws.setPersonalRecords(hydrated.personalRecords);

                    if (hydrated.foodLogs.length || hydrated.waterLogs.length) {
                        const meals: Record<MealType, FoodLogEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
                        let cal = 0, p = 0, c = 0, f = 0;
                        for (const fl of hydrated.foodLogs) {
                            meals[fl.meal_type].push(fl);
                            cal += fl.calories; p += fl.protein_g; c += fl.carbs_g; f += fl.fat_g;
                        }
                        const water = hydrated.waterLogs.reduce((s, w) => s + w.amount_ml, 0);
                        useNutritionStore.getState().setTodaySummary({
                            date: new Date().toISOString().split('T')[0],
                            total_calories: cal, total_protein_g: p, total_carbs_g: c, total_fat_g: f, total_fiber_g: 0,
                            water_ml: water, meals,
                        });
                    }

                    const ps = useProgressStore.getState();
                    if (hydrated.weightEntries.length) ps.setWeightEntries(hydrated.weightEntries);
                    if (hydrated.measurements.length) ps.setMeasurements(hydrated.measurements);
                    if (hydrated.photos.length) ps.setProgressPhotos(hydrated.photos);
                    if (hydrated.goals.length) ps.setGoals(hydrated.goals);

                    if (hydrated.unlockedIds.length) {
                        const rs = useRecoveryStore.getState();
                        const achievements = rs.achievements.map((a) =>
                            hydrated.unlockedIds.includes(a.id) ? { ...a, unlocked_at: 'loaded', progress: 100 } : a
                        );
                        useRecoveryStore.setState({ achievements });
                    }
                    if (hydrated.supplements.length) useRecoveryStore.setState({ supplements: hydrated.supplements });
                    if (hydrated.dietProfile) useMealPlanStore.setState({ dietProfile: hydrated.dietProfile });
                    if (hydrated.fastingSessions.length) {
                        const active = hydrated.fastingSessions.find((f) => f.status === 'active');
                        useMealPlanStore.setState({
                            activeFast: active || null,
                            fastHistory: hydrated.fastingSessions.filter((f) => f.status !== 'active'),
                        });
                    }

                    router.replace('/(tabs)');
                } else {
                    router.replace('/(auth)/onboarding');
                }
            } catch {
                // Hydration failed — still let them in, onboarding will set things up
                router.replace('/(auth)/onboarding');
            }
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
                    />

                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} />}
                        rightIcon={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={Colors.textTertiary}
                                />
                            </TouchableOpacity>
                        }
                    />

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        size="lg"
                    />

                    {errorMsg ? (
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    ) : null}

                    {/* Social login divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social buttons */}
                    <View style={styles.socialButtons}>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={async () => {
                                setErrorMsg('');
                                try {
                                    await signInWithGoogle();
                                } catch (e: any) {
                                    setErrorMsg(e.message || 'Google sign-in failed');
                                }
                            }}
                        >
                            <Ionicons name="logo-google" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={async () => {
                                setErrorMsg('');
                                try {
                                    await signInWithApple();
                                } catch (e: any) {
                                    setErrorMsg(e.message || 'Apple sign-in failed');
                                }
                            }}
                        >
                            <Ionicons name="logo-apple" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        marginTop: Spacing.sm,
    },
    form: {
        flex: 1,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: Spacing.xxl,
        marginTop: -Spacing.sm,
    },
    forgotPasswordText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xxl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginHorizontal: Spacing.md,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xxl,
    },
    footerText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    footerLink: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    errorText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
});
