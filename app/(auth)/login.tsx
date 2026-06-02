import { Button, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { isReviewerDemoLogin, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { hydrateAllStores } from '@/lib/db';
import { getLocalDateKey } from '@/lib/date';
import { buildNutritionSummary } from '@/lib/nutritionSummary';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const { setSession, setUser, setOnboarded } = useAuthStore();

    const finishLogin = async (session: Session) => {
        setSession({ access_token: session.access_token });

        // Hydrate stores from Supabase
        try {
            const hydrated = await hydrateAllStores(session.user.id);

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

                const nutritionStore = useNutritionStore.getState();
                nutritionStore.setNutritionHistory(hydrated.nutritionHistory);
                nutritionStore.setTodaySummary(buildNutritionSummary(getLocalDateKey(), hydrated.foodLogs, hydrated.waterLogs));

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
        } catch (error) {
            // Hydration failed; still let them in, onboarding will set things up.
            console.error('Hydration failed:', error);
            toast.warning('Welcome!', 'Your profile will be set up next');
            router.replace('/(auth)/onboarding');
        }
    };

    const startReviewerDemo = () => {
        const now = new Date().toISOString();
        setSession({ access_token: 'review-demo-session' });
        setUser({
            id: 'review-demo-user',
            email: 'app-review@bodypilot.app',
            display_name: 'Apple Reviewer',
            username: 'apple_reviewer',
            avatar_url: 'character:bolt',
            bio: 'BodyPilot review demo account',
            phone_number: null,
            date_of_birth: null,
            gender: null,
            height_cm: 178,
            weight_kg: 78,
            current_weight_kg: 78,
            activity_level: 'moderate',
            goal: 'recomp',
            experience_level: 'intermediate',
            daily_calorie_target: 2200,
            protein_target_g: 165,
            carbs_target_g: 230,
            fat_target_g: 70,
            water_goal_ml: 2800,
            unit_system: 'imperial',
            preferred_rest_seconds: 90,
            created_at: now,
            updated_at: now,
            streak_count: 4,
            xp: 620,
            level: 3,
            workouts_completed: 8,
            last_workout_date: now,
        });
        setOnboarded(true);
        toast.success('Review Access', 'Reviewer account is ready.');
        router.replace('/(tabs)');
    };

    const handleLogin = async () => {
        setErrorMsg('');
        if (!acceptedTerms) {
            setErrorMsg('Please agree to the Terms before signing in.');
            return;
        }

        if (!email.trim() || !password.trim()) {
            setErrorMsg('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isReviewerDemoLogin(email, password)) {
                startReviewerDemo();
                return;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                toast.error('Login Failed', error.message);
                setErrorMsg(error.message);
                setLoading(false);
                return;
            }

            if (!data.session) {
                toast.error('Error', 'No session returned');
                return;
            }

            await finishLogin(data.session);
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (signIn: () => Promise<any>, label: 'Google' | 'Apple') => {
        setErrorMsg('');
        if (!acceptedTerms) {
            setErrorMsg(`Please agree to the Terms before continuing with ${label}.`);
            return;
        }

        setLoading(true);
        try {
            const result = await signIn();
            const session = result?.session || (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error(`${label} sign-in did not return a session`);
            await finishLogin(session);
        } catch (e: any) {
            const message = e.message || `${label} sign-in failed`;
            setErrorMsg(message);
            toast.error(`${label} Sign-In Failed`, message);
        } finally {
            setLoading(false);
        }
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

                    <TermsAcceptance accepted={acceptedTerms} onToggle={() => setAcceptedTerms((value) => !value)} />

                    <Button
                        title={acceptedTerms ? 'Sign In' : 'Accept Terms to Sign In'}
                        onPress={handleLogin}
                        loading={loading}
                        disabled={!acceptedTerms}
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
                            style={[styles.socialButton, !acceptedTerms && styles.socialButtonDisabled]}
                            onPress={() => handleSocialLogin(signInWithGoogle, 'Google')}
                            disabled={!acceptedTerms || loading}
                        >
                            <Ionicons name="logo-google" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.socialButton, !acceptedTerms && styles.socialButtonDisabled]}
                            onPress={() => handleSocialLogin(signInWithApple, 'Apple')}
                            disabled={!acceptedTerms || loading}
                        >
                            <Ionicons name="logo-apple" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.replace('signup')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function TermsAcceptance({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.termsCard, accepted && styles.termsCardAccepted]}
            onPress={onToggle}
            activeOpacity={0.82}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
        >
            <View style={styles.termsTopRow}>
                <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
                    {accepted ? <Ionicons name="checkmark" size={19} color={Colors.textInverse} /> : null}
                </View>
                <View style={styles.termsCopy}>
                    <Text style={styles.termsRequired}>Required before continuing</Text>
                    <Text style={styles.termsTitle}>Accept BodyPilot&apos;s Terms</Text>
                </View>
            </View>
            <Text style={styles.termsText}>
                Tap this box to agree to the{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/terms' as any)}>
                    Terms of Service
                </Text>
                , including the no-tolerance policy for objectionable content and abusive users.
            </Text>
            <View style={styles.termsFooter}>
                <Ionicons
                    name={accepted ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={16}
                    color={accepted ? Colors.success : Colors.warning}
                />
                <Text style={[styles.termsStatus, accepted && styles.termsStatusAccepted]}>
                    {accepted ? 'Terms accepted' : 'Sign-in buttons unlock after you accept'}
                </Text>
            </View>
        </TouchableOpacity>
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
    socialButtonDisabled: {
        opacity: 0.45,
    },
    termsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.warning,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    termsCardAccepted: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    termsTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    checkbox: {
        width: 30,
        height: 30,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: Colors.warning,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    checkboxActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    termsCopy: {
        flex: 1,
    },
    termsRequired: {
        color: Colors.warning,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    termsTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    termsText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    termsLink: {
        color: Colors.primary,
        fontWeight: FontWeight.bold,
    },
    termsFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    termsStatus: {
        color: Colors.warning,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    termsStatusAccepted: {
        color: Colors.success,
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
