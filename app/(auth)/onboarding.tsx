import { Button, Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { upsertProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { calculateBMR, calculateTDEE } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import type { ActivityLevel, ExperienceLevel, FitnessGoal } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

const STEPS = [
    'basics',      // gender, age, height, weight
    'goal',        // fitness goal
    'experience',  // experience level
    'activity',    // activity level
] as const;

type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
    const [step, setStep] = useState<number>(0);
    const { setOnboarded, setUser } = useAuthStore();

    // Form data
    const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
    const [age, setAge] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [goal, setGoal] = useState<FitnessGoal | null>(null);
    const [experience, setExperience] = useState<ExperienceLevel | null>(null);
    const [activity, setActivity] = useState<ActivityLevel | null>(null);

    const currentStep = STEPS[step];

    const canProceed = () => {
        switch (currentStep) {
            case 'basics': return gender && age && heightCm && weightKg;
            case 'goal': return goal !== null;
            case 'experience': return experience !== null;
            case 'activity': return activity !== null;
            default: return false;
        }
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        // Calculate TDEE and macro targets from onboarding data
        const w = parseFloat(weightKg) || 75;
        const h = parseFloat(heightCm) || 175;
        const a = parseInt(age) || 25;
        const g = gender || 'male';

        const bmr = calculateBMR(w, h, a, g);
        const tdee = calculateTDEE(bmr, activity || 'moderate');

        // Adjust calories based on goal
        let calorieTarget = tdee;
        if (goal === 'lose_fat') calorieTarget = Math.round(tdee * 0.80); // 20% deficit
        else if (goal === 'build_muscle') calorieTarget = Math.round(tdee * 1.10); // 10% surplus
        else if (goal === 'recomp') calorieTarget = tdee;
        else if (goal === 'strength') calorieTarget = Math.round(tdee * 1.05); // small surplus

        // Calculate macro split based on goal
        let proteinPct = 0.30, carbsPct = 0.40, fatPct = 0.30;
        if (goal === 'lose_fat') { proteinPct = 0.35; carbsPct = 0.35; fatPct = 0.30; }
        else if (goal === 'build_muscle') { proteinPct = 0.30; carbsPct = 0.45; fatPct = 0.25; }
        else if (goal === 'strength') { proteinPct = 0.30; carbsPct = 0.40; fatPct = 0.30; }

        const proteinTarget = Math.round((calorieTarget * proteinPct) / 4);
        const carbsTarget = Math.round((calorieTarget * carbsPct) / 4);
        const fatTarget = Math.round((calorieTarget * fatPct) / 9);

        // Get user ID from Supabase session (if real user)
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || '';

        const userProfile = {
            id: userId,
            email: sessionData?.session?.user?.email || '',
            display_name: sessionData?.session?.user?.user_metadata?.display_name || '',
            avatar_url: null,
            date_of_birth: null,
            gender: g,
            height_cm: h,
            current_weight_kg: w,
            activity_level: activity || 'moderate' as const,
            goal: goal || 'maintain' as const,
            experience_level: experience || 'intermediate' as const,
            daily_calorie_target: calorieTarget,
            protein_target_g: proteinTarget,
            carbs_target_g: carbsTarget,
            fat_target_g: fatTarget,
            water_goal_ml: Math.round(w * 33),
            unit_system: 'metric' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            streak_count: 0,
            xp: 0,
            level: 1,
            weight_kg: w,
            preferred_rest_seconds: 90,
            workouts_completed: 0,
            last_workout_date: null,
        };

        // Set user profile in store
        setUser(userProfile);

        // Persist to Supabase (fire-and-forget for real users)
        if (userId) {
            upsertProfile(userProfile).catch(() => {});
        }

        setOnboarded(true);
        router.replace('/(tabs)');
    };

    const renderOption = <T extends string>(
        value: T,
        currentValue: T | null,
        setter: (v: T) => void,
        label: string,
        description: string,
        icon: string,
    ) => (
        <TouchableOpacity
            key={value}
            style={[
                styles.optionCard,
                currentValue === value && styles.optionCardActive,
            ]}
            onPress={() => setter(value)}
            activeOpacity={0.7}
        >
            <Text style={styles.optionIcon}>{icon}</Text>
            <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, currentValue === value && styles.optionLabelActive]}>
                    {label}
                </Text>
                <Text style={styles.optionDesc}>{description}</Text>
            </View>
            {currentValue === value && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${((step + 1) / STEPS.length) * 100}%` },
                        ]}
                    />
                </View>
                <Text style={styles.stepText}>
                    {step + 1} of {STEPS.length}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Step: Basics */}
                {currentStep === 'basics' && (
                    <View>
                        <Text style={styles.title}>Let's get to know you</Text>
                        <Text style={styles.subtitle}>This helps us personalize your experience</Text>

                        <Text style={styles.sectionLabel}>Gender</Text>
                        <View style={styles.genderRow}>
                            {(['male', 'female', 'other'] as const).map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.genderChip,
                                        gender === g && styles.genderChipActive,
                                    ]}
                                    onPress={() => setGender(g)}
                                >
                                    <Text style={[
                                        styles.genderChipText,
                                        gender === g && styles.genderChipTextActive,
                                    ]}>
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="Age"
                            placeholder="25"
                            value={age}
                            onChangeText={setAge}
                            keyboardType="number-pad"
                            maxLength={3}
                        />

                        <Input
                            label="Height (cm)"
                            placeholder="175"
                            value={heightCm}
                            onChangeText={setHeightCm}
                            keyboardType="number-pad"
                            maxLength={3}
                        />

                        <Input
                            label="Weight (kg)"
                            placeholder="75"
                            value={weightKg}
                            onChangeText={setWeightKg}
                            keyboardType="decimal-pad"
                            maxLength={5}
                        />
                    </View>
                )}

                {/* Step: Goal */}
                {currentStep === 'goal' && (
                    <View>
                        <Text style={styles.title}>What's your main goal?</Text>
                        <Text style={styles.subtitle}>We'll tailor everything around this</Text>

                        <View style={styles.options}>
                            {renderOption('lose_fat', goal, setGoal, 'Lose Fat', 'Shed body fat while preserving muscle', '🔥')}
                            {renderOption('build_muscle', goal, setGoal, 'Build Muscle', 'Gain lean muscle mass', '💪')}
                            {renderOption('recomp', goal, setGoal, 'Body Recomposition', 'Lose fat and gain muscle simultaneously', '⚡')}
                            {renderOption('strength', goal, setGoal, 'Get Stronger', 'Focus on strength and PRs', '🏋️')}
                            {renderOption('endurance', goal, setGoal, 'Improve Endurance', 'Better cardio and stamina', '🏃')}
                            {renderOption('maintain', goal, setGoal, 'Maintain', 'Stay where I am, stay healthy', '✅')}
                        </View>
                    </View>
                )}

                {/* Step: Experience */}
                {currentStep === 'experience' && (
                    <View>
                        <Text style={styles.title}>Training experience?</Text>
                        <Text style={styles.subtitle}>This helps us set the right intensity</Text>

                        <View style={styles.options}>
                            {renderOption('beginner', experience, setExperience, 'Beginner', 'New to working out (< 6 months)', '🌱')}
                            {renderOption('intermediate', experience, setExperience, 'Intermediate', '6 months to 2 years of training', '🌿')}
                            {renderOption('advanced', experience, setExperience, 'Advanced', '2+ years of consistent training', '🌳')}
                            {renderOption('elite', experience, setExperience, 'Elite', 'Competitive / 5+ years', '⭐')}
                        </View>
                    </View>
                )}

                {/* Step: Activity Level */}
                {currentStep === 'activity' && (
                    <View>
                        <Text style={styles.title}>Daily activity level?</Text>
                        <Text style={styles.subtitle}>Outside of your workouts</Text>

                        <View style={styles.options}>
                            {renderOption('sedentary', activity, setActivity, 'Sedentary', 'Desk job, minimal movement', '🪑')}
                            {renderOption('light', activity, setActivity, 'Lightly Active', 'Some walking, light activity', '🚶')}
                            {renderOption('moderate', activity, setActivity, 'Moderately Active', 'Regular movement throughout the day', '🚴')}
                            {renderOption('active', activity, setActivity, 'Very Active', 'Physical job or very active lifestyle', '⚡')}
                            {renderOption('very_active', activity, setActivity, 'Extremely Active', 'Athlete or highly physical job', '🔥')}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Navigation buttons */}
            <View style={styles.navButtons}>
                {step > 0 && (
                    <Button
                        title="Back"
                        onPress={() => setStep(step - 1)}
                        variant="ghost"
                        fullWidth={false}
                        style={{ flex: 1 }}
                    />
                )}
                <Button
                    title={step === STEPS.length - 1 ? "Let's Go! 🚀" : 'Continue'}
                    onPress={handleNext}
                    disabled={!canProceed()}
                    style={{ flex: step > 0 ? 2 : 1 }}
                    size="lg"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: 60,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
    },
    stepText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xxl,
        paddingBottom: Spacing.xxxl,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        marginBottom: Spacing.xxl,
    },
    sectionLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        marginBottom: Spacing.sm,
    },
    genderRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    genderChip: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    genderChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    genderChipText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    genderChipTextActive: {
        color: Colors.primary,
    },
    options: {
        gap: Spacing.md,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    optionCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    optionIcon: {
        fontSize: 28,
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    optionLabelActive: {
        color: Colors.primary,
    },
    optionDesc: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    navButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
