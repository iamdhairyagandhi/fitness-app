import { Button, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { upsertProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { calculateBMR, calculateTDEE, lbsToKg } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import type { ActivityLevel, ExperienceLevel, FitnessGoal } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const STEPS = ['body', 'goal', 'training', 'nutrition', 'lifestyle', 'plan'] as const;
type Step = (typeof STEPS)[number];
type UnitSystem = 'metric' | 'imperial';

const goalLabels: Record<FitnessGoal, string> = {
    lose_fat: 'Lose fat',
    maintain: 'Maintain',
    build_muscle: 'Build muscle',
    recomp: 'Recomposition',
    strength: 'Get stronger',
    endurance: 'Improve endurance',
};

const activityLabels: Record<ActivityLevel, string> = {
    sedentary: 'Mostly seated',
    light: 'Light movement',
    moderate: 'Moderate',
    active: 'Active',
    very_active: 'Very active',
};

const experienceLabels: Record<ExperienceLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    elite: 'Elite',
};

function numberFrom(value: string, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function feetInchesToCm(feet: string, inches: string) {
    const ft = numberFrom(feet);
    const inch = numberFrom(inches);
    return Math.round((ft * 12 + inch) * 2.54);
}

function cmToFeetParts(cm: number) {
    const totalInches = Math.round(cm / 2.54);
    return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export default function OnboardingScreen() {
    const [step, setStep] = useState(0);
    const [planSlide, setPlanSlide] = useState(0);
    const [saving, setSaving] = useState(false);
    const { setOnboarded, setUser } = useAuthStore();

    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
    const [age, setAge] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [heightFt, setHeightFt] = useState('');
    const [heightIn, setHeightIn] = useState('');
    const [weight, setWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');

    const [goal, setGoal] = useState<FitnessGoal | null>(null);
    const [pace, setPace] = useState<'steady' | 'balanced' | 'aggressive'>('balanced');
    const [motivation, setMotivation] = useState<'appearance' | 'performance' | 'health' | 'confidence' | null>(null);

    const [experience, setExperience] = useState<ExperienceLevel | null>(null);
    const [trainingDays, setTrainingDays] = useState('');
    const [sessionMinutes, setSessionMinutes] = useState('');
    const [equipment, setEquipment] = useState<'gym' | 'home' | 'bodyweight' | 'mixed' | null>(null);

    const [dietStyle, setDietStyle] = useState<'balanced' | 'high_protein' | 'vegetarian' | 'low_carb' | null>(null);
    const [mealsPerDay, setMealsPerDay] = useState('');
    const [trackingStyle, setTrackingStyle] = useState<'simple' | 'macro' | 'photo' | null>(null);

    const [activity, setActivity] = useState<ActivityLevel | null>(null);
    const [sleepHours, setSleepHours] = useState('');
    const [stressLevel, setStressLevel] = useState<'low' | 'medium' | 'high' | null>(null);

    const currentStep = STEPS[step];

    const measurements = useMemo(() => {
        const weightKg = unitSystem === 'metric' ? numberFrom(weight, 75) : lbsToKg(numberFrom(weight, 165));
        const targetWeightKg = targetWeight
            ? unitSystem === 'metric'
                ? numberFrom(targetWeight)
                : lbsToKg(numberFrom(targetWeight))
            : null;
        const height = unitSystem === 'metric' ? numberFrom(heightCm, 175) : feetInchesToCm(heightFt, heightIn) || 175;
        const ageYears = numberFrom(age, 25);
        return {
            ageYears,
            height,
            weightKg,
            targetWeightKg,
            weightLabel: unitSystem === 'metric' ? `${Math.round(weightKg)} kg` : `${Math.round(weightKg * 2.20462)} lb`,
            targetWeightLabel: targetWeightKg
                ? unitSystem === 'metric'
                    ? `${Math.round(targetWeightKg)} kg`
                    : `${Math.round(targetWeightKg * 2.20462)} lb`
                : 'Not set',
            heightLabel: unitSystem === 'metric'
                ? `${Math.round(height)} cm`
                : `${cmToFeetParts(height).feet}'${cmToFeetParts(height).inches}"`,
        };
    }, [age, heightCm, heightFt, heightIn, targetWeight, unitSystem, weight]);

    const plan = useMemo(() => {
        const selectedGoal = goal || 'maintain';
        const selectedActivity = activity || 'moderate';
        const selectedExperience = experience || 'intermediate';
        const trainingDaysNum = clamp(Math.round(numberFrom(trainingDays, 4)), 2, 7);
        const sessionMinutesNum = clamp(Math.round(numberFrom(sessionMinutes, 50)), 25, 120);
        const mealsNum = clamp(Math.round(numberFrom(mealsPerDay, 3)), 2, 6);
        const sleepNum = clamp(numberFrom(sleepHours, 7), 4, 10);

        const bmr = calculateBMR(measurements.weightKg, measurements.height, measurements.ageYears, gender || 'male');
        const tdee = calculateTDEE(bmr, selectedActivity);

        const paceAdjustments = { steady: 0.9, balanced: 1, aggressive: 1.1 };
        const paceMultiplier = paceAdjustments[pace];

        let calorieTarget = tdee;
        if (selectedGoal === 'lose_fat') calorieTarget = Math.round(tdee * (0.86 - 0.06 * paceMultiplier));
        else if (selectedGoal === 'build_muscle') calorieTarget = Math.round(tdee * (1.06 + 0.04 * paceMultiplier));
        else if (selectedGoal === 'strength') calorieTarget = Math.round(tdee * 1.05);
        else if (selectedGoal === 'endurance') calorieTarget = Math.round(tdee * 1.02);

        let proteinPct = 0.3;
        let carbsPct = 0.4;
        let fatPct = 0.3;
        if (selectedGoal === 'lose_fat') { proteinPct = 0.36; carbsPct = 0.34; fatPct = 0.3; }
        if (selectedGoal === 'build_muscle') { proteinPct = 0.3; carbsPct = 0.45; fatPct = 0.25; }
        if (selectedGoal === 'endurance') { proteinPct = 0.25; carbsPct = 0.5; fatPct = 0.25; }
        if (dietStyle === 'low_carb') { proteinPct = 0.35; carbsPct = 0.25; fatPct = 0.4; }
        if (dietStyle === 'high_protein') { proteinPct = Math.max(proteinPct, 0.36); carbsPct = 0.37; fatPct = 0.27; }

        const protein = Math.round((calorieTarget * proteinPct) / 4);
        const carbs = Math.round((calorieTarget * carbsPct) / 4);
        const fat = Math.round((calorieTarget * fatPct) / 9);
        const waterMl = Math.round(measurements.weightKg * (selectedActivity === 'very_active' ? 42 : 36));
        const restSeconds = selectedExperience === 'beginner' ? 90 : selectedGoal === 'strength' ? 150 : 75;

        const weeklyFocus = selectedGoal === 'lose_fat'
            ? 'calorie consistency, protein, and repeatable training'
            : selectedGoal === 'build_muscle'
                ? 'progressive overload, enough food, and recovery'
                : selectedGoal === 'strength'
                    ? 'heavy compounds, longer rests, and tracking PRs'
                    : selectedGoal === 'endurance'
                        ? 'cardio capacity, hydration, and sustainable volume'
                        : 'balanced habits and trend tracking';

        const recoveryFlag = sleepNum < 6.5 || stressLevel === 'high'
            ? 'Recovery needs attention, so BodyPilot will bias toward sustainable targets.'
            : 'Recovery looks workable, so your plan can progress steadily.';

        return {
            bmr,
            tdee,
            calorieTarget,
            protein,
            carbs,
            fat,
            waterMl,
            restSeconds,
            trainingDaysNum,
            sessionMinutesNum,
            mealsNum,
            sleepNum,
            weeklyFocus,
            recoveryFlag,
        };
    }, [activity, dietStyle, experience, gender, goal, measurements, mealsPerDay, pace, sessionMinutes, sleepHours, stressLevel, trainingDays]);

    const canProceed = () => {
        switch (currentStep) {
            case 'body':
                return !!gender && !!age && !!weight && (unitSystem === 'metric' ? !!heightCm : !!heightFt);
            case 'goal':
                return !!goal && !!motivation;
            case 'training':
                return !!experience && !!trainingDays && !!sessionMinutes && !!equipment;
            case 'nutrition':
                return !!dietStyle && !!mealsPerDay && !!trackingStyle;
            case 'lifestyle':
                return !!activity && !!sleepHours && !!stressLevel;
            case 'plan':
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep === 'plan') {
            if (planSlide < 2) {
                setPlanSlide(planSlide + 1);
            } else {
                handleComplete();
            }
            return;
        }

        setStep(step + 1);
    };

    const handleBack = () => {
        if (currentStep === 'plan' && planSlide > 0) {
            setPlanSlide(planSlide - 1);
            return;
        }
        setStep(Math.max(0, step - 1));
    };

    const handleComplete = async () => {
        setSaving(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const userId = session?.user.id || '';

        const userProfile = {
            id: userId,
            email: session?.user.email || '',
            display_name: session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || 'Athlete',
            username: null,
            avatar_url: session?.user.user_metadata?.avatar_url || null,
            bio: `${goalLabels[goal || 'maintain']} | ${plan.trainingDaysNum} days/week | ${equipment || 'mixed'} training | ${dietStyle || 'balanced'} nutrition`,
            phone_number: null,
            date_of_birth: null,
            gender: gender || 'other',
            height_cm: measurements.height,
            current_weight_kg: measurements.weightKg,
            activity_level: activity || 'moderate' as const,
            goal: goal || 'maintain' as const,
            experience_level: experience || 'intermediate' as const,
            daily_calorie_target: plan.calorieTarget,
            protein_target_g: plan.protein,
            carbs_target_g: plan.carbs,
            fat_target_g: plan.fat,
            water_goal_ml: plan.waterMl,
            unit_system: unitSystem,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            streak_count: 0,
            xp: 0,
            level: 1,
            weight_kg: measurements.weightKg,
            preferred_rest_seconds: plan.restSeconds,
            workouts_completed: 0,
            last_workout_date: null,
        };

        setUser(userProfile);

        if (userId) {
            try {
                await upsertProfile(userProfile);
            } catch {
                setSaving(false);
                toast.error('Save Failed', 'Please try completing onboarding again.');
                return;
            }
        }

        setOnboarded(true);
        setSaving(false);
        router.replace('/(tabs)');
    };

    const renderChoice = <T extends string>(
        value: T,
        currentValue: T | null,
        setter: (v: T) => void,
        label: string,
        description: string,
        icon: keyof typeof Ionicons.glyphMap,
    ) => (
        <TouchableOpacity
            key={value}
            style={[styles.choice, currentValue === value && styles.choiceActive]}
            onPress={() => setter(value)}
            activeOpacity={0.76}
        >
            <View style={[styles.choiceIcon, currentValue === value && styles.choiceIconActive]}>
                <Ionicons name={icon} size={20} color={currentValue === value ? Colors.textInverse : Colors.primary} />
            </View>
            <View style={styles.choiceCopy}>
                <Text style={[styles.choiceTitle, currentValue === value && styles.choiceTitleActive]}>{label}</Text>
                <Text style={styles.choiceDescription}>{description}</Text>
            </View>
            {currentValue === value && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
        </TouchableOpacity>
    );

    const renderChip = <T extends string>(value: T, currentValue: T, setter: (v: T) => void, label: string) => (
        <TouchableOpacity
            key={value}
            style={[styles.segment, currentValue === value && styles.segmentActive]}
            onPress={() => setter(value)}
        >
            <Text style={[styles.segmentText, currentValue === value && styles.segmentTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderPlanSlide = () => {
        if (planSlide === 0) {
            return (
                <View>
                    <Text style={styles.eyebrow}>Your baseline</Text>
                    <Text style={styles.title}>Here is the starting map</Text>
                    <Text style={styles.subtitle}>These numbers anchor your plan. They can be adjusted later as your data improves.</Text>
                    <View style={styles.metricGrid}>
                        <Metric label="BMR" value={`${plan.bmr}`} detail="cal/day" color={Colors.calories} />
                        <Metric label="TDEE" value={`${plan.tdee}`} detail="cal/day" color={Colors.secondary} />
                        <Metric label="Height" value={measurements.heightLabel} detail="recorded" color={Colors.recovery} />
                        <Metric label="Weight" value={measurements.weightLabel} detail="current" color={Colors.bodyComp} />
                    </View>
                </View>
            );
        }

        if (planSlide === 1) {
            return (
                <View>
                    <Text style={styles.eyebrow}>Goal strategy</Text>
                    <Text style={styles.title}>{goalLabels[goal || 'maintain']} with a {pace} pace</Text>
                    <Text style={styles.subtitle}>{plan.weeklyFocus}. {plan.recoveryFlag}</Text>
                    <View style={styles.timeline}>
                        <TimelineRow icon="calendar-outline" title={`${plan.trainingDaysNum} training days/week`} detail={`${plan.sessionMinutesNum} minute sessions, ${equipment || 'mixed'} setup`} />
                        <TimelineRow icon="barbell-outline" title={`${experienceLabels[experience || 'intermediate']} progression`} detail={`Rest target around ${plan.restSeconds}s between key sets`} />
                        <TimelineRow icon="moon-outline" title={`${plan.sleepNum}h sleep baseline`} detail={`${stressLevel || 'medium'} stress context factored into the pace`} />
                    </View>
                </View>
            );
        }

        return (
            <View>
                <Text style={styles.eyebrow}>Nutrition targets</Text>
                <Text style={styles.title}>Your first daily targets</Text>
                <Text style={styles.subtitle}>A practical starting point for {trackingStyle || 'macro'} tracking across {plan.mealsNum} meals per day.</Text>
                <View style={styles.caloriePanel}>
                    <Text style={styles.calorieValue}>{plan.calorieTarget}</Text>
                    <Text style={styles.calorieLabel}>calories/day</Text>
                </View>
                <View style={styles.macroBars}>
                    <Macro label="Protein" value={plan.protein} color={Colors.protein} max={Math.max(plan.protein, plan.carbs, plan.fat)} />
                    <Macro label="Carbs" value={plan.carbs} color={Colors.carbs} max={Math.max(plan.protein, plan.carbs, plan.fat)} />
                    <Macro label="Fat" value={plan.fat} color={Colors.fat} max={Math.max(plan.protein, plan.carbs, plan.fat)} />
                </View>
                <Text style={styles.waterText}>Hydration target: {Math.round(plan.waterMl / 100) / 10} L/day</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
                </View>
                <Text style={styles.stepText}>{step + 1}/{STEPS.length}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {currentStep === 'body' && (
                    <View>
                        <Text style={styles.eyebrow}>Body profile</Text>
                        <Text style={styles.title}>Tell us how to measure progress</Text>
                        <Text style={styles.subtitle}>Choose the units you use every day. BodyPilot stores the math cleanly in the background.</Text>

                        <View style={styles.segmentRow}>
                            {renderChip('metric', unitSystem, setUnitSystem, 'cm / kg')}
                            {renderChip('imperial', unitSystem, setUnitSystem, 'ft / lb')}
                        </View>

                        <Text style={styles.sectionLabel}>Gender</Text>
                        <View style={styles.threeColumn}>
                            {(['male', 'female', 'other'] as const).map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.smallChoice, gender === item && styles.smallChoiceActive]}
                                    onPress={() => setGender(item)}
                                >
                                    <Text style={[styles.smallChoiceText, gender === item && styles.smallChoiceTextActive]}>
                                        {item.charAt(0).toUpperCase() + item.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input label="Age" placeholder="25" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
                        {unitSystem === 'metric' ? (
                            <Input label="Height (cm)" placeholder="175" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" maxLength={3} />
                        ) : (
                            <View style={styles.inputRow}>
                                <View style={styles.inputHalf}>
                                    <Input label="Feet" placeholder="5" value={heightFt} onChangeText={setHeightFt} keyboardType="number-pad" maxLength={1} />
                                </View>
                                <View style={styles.inputHalf}>
                                    <Input label="Inches" placeholder="10" value={heightIn} onChangeText={setHeightIn} keyboardType="number-pad" maxLength={2} />
                                </View>
                            </View>
                        )}
                        <Input label={`Current weight (${unitSystem === 'metric' ? 'kg' : 'lb'})`} placeholder={unitSystem === 'metric' ? '75' : '165'} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} />
                    </View>
                )}

                {currentStep === 'goal' && (
                    <View>
                        <Text style={styles.eyebrow}>Goal design</Text>
                        <Text style={styles.title}>What are we building toward?</Text>
                        <Text style={styles.subtitle}>Your answer shapes calories, macros, training emphasis, and the insights you see first.</Text>
                        <View style={styles.options}>
                            {renderChoice('lose_fat', goal, setGoal, 'Lose fat', 'Lean down while preserving muscle and energy.', 'flame-outline')}
                            {renderChoice('build_muscle', goal, setGoal, 'Build muscle', 'Prioritize growth, strength, and enough food.', 'barbell-outline')}
                            {renderChoice('recomp', goal, setGoal, 'Recomposition', 'Improve muscle and body composition together.', 'body-outline')}
                            {renderChoice('strength', goal, setGoal, 'Get stronger', 'Focus on PRs, compounds, and recovery between heavy sessions.', 'trophy-outline')}
                            {renderChoice('endurance', goal, setGoal, 'Improve endurance', 'Build stamina, consistency, and cardio capacity.', 'pulse-outline')}
                            {renderChoice('maintain', goal, setGoal, 'Maintain', 'Keep healthy habits stable and measurable.', 'shield-checkmark-outline')}
                        </View>
                        <Input label={`Target weight (${unitSystem === 'metric' ? 'kg' : 'lb'}, optional)`} placeholder={unitSystem === 'metric' ? '72' : '158'} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" maxLength={5} />
                        <Text style={styles.sectionLabel}>Preferred pace</Text>
                        <View style={styles.segmentRow}>
                            {renderChip('steady', pace, setPace, 'Steady')}
                            {renderChip('balanced', pace, setPace, 'Balanced')}
                            {renderChip('aggressive', pace, setPace, 'Focused')}
                        </View>
                        <Text style={styles.sectionLabel}>Primary motivation</Text>
                        <View style={styles.options}>
                            {renderChoice('appearance', motivation, setMotivation, 'Look different', 'Body composition, confidence, and photos.', 'sparkles-outline')}
                            {renderChoice('performance', motivation, setMotivation, 'Perform better', 'Strength, stamina, sports, or gym progress.', 'flash-outline')}
                            {renderChoice('health', motivation, setMotivation, 'Feel healthier', 'Energy, habits, mobility, and longevity.', 'heart-outline')}
                            {renderChoice('confidence', motivation, setMotivation, 'Build confidence', 'Consistency and visible proof that you are improving.', 'person-circle-outline')}
                        </View>
                    </View>
                )}

                {currentStep === 'training' && (
                    <View>
                        <Text style={styles.eyebrow}>Training setup</Text>
                        <Text style={styles.title}>Make the plan fit your real week</Text>
                        <Text style={styles.subtitle}>A good plan is not heroic. It fits the equipment, time, and experience you actually have.</Text>
                        <View style={styles.options}>
                            {renderChoice('beginner', experience, setExperience, 'Beginner', 'New or returning after a long break.', 'leaf-outline')}
                            {renderChoice('intermediate', experience, setExperience, 'Intermediate', 'You know the basics and train consistently.', 'trending-up-outline')}
                            {renderChoice('advanced', experience, setExperience, 'Advanced', 'You track performance and manage fatigue.', 'analytics-outline')}
                            {renderChoice('elite', experience, setExperience, 'Elite', 'Highly experienced or competitive.', 'ribbon-outline')}
                        </View>
                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input label="Days/week" placeholder="4" value={trainingDays} onChangeText={setTrainingDays} keyboardType="number-pad" maxLength={1} />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input label="Minutes/session" placeholder="50" value={sessionMinutes} onChangeText={setSessionMinutes} keyboardType="number-pad" maxLength={3} />
                            </View>
                        </View>
                        <Text style={styles.sectionLabel}>Equipment access</Text>
                        <View style={styles.options}>
                            {renderChoice('gym', equipment, setEquipment, 'Full gym', 'Barbells, machines, cables, cardio equipment.', 'business-outline')}
                            {renderChoice('home', equipment, setEquipment, 'Home setup', 'Dumbbells, bands, bench, or a small setup.', 'home-outline')}
                            {renderChoice('bodyweight', equipment, setEquipment, 'Bodyweight', 'Minimal equipment and movement-first plans.', 'accessibility-outline')}
                            {renderChoice('mixed', equipment, setEquipment, 'Mixed', 'Some gym days, some home or travel days.', 'shuffle-outline')}
                        </View>
                    </View>
                )}

                {currentStep === 'nutrition' && (
                    <View>
                        <Text style={styles.eyebrow}>Nutrition style</Text>
                        <Text style={styles.title}>Choose tracking that you will keep using</Text>
                        <Text style={styles.subtitle}>We will start with targets, then adjust based on logs and progress trends.</Text>
                        <View style={styles.options}>
                            {renderChoice('balanced', dietStyle, setDietStyle, 'Balanced', 'Flexible meals with protein, carbs, and fats.', 'restaurant-outline')}
                            {renderChoice('high_protein', dietStyle, setDietStyle, 'High protein', 'More protein-forward targets and reminders.', 'egg-outline')}
                            {renderChoice('vegetarian', dietStyle, setDietStyle, 'Vegetarian', 'Plant-forward meals with protein support.', 'leaf-outline')}
                            {renderChoice('low_carb', dietStyle, setDietStyle, 'Lower carb', 'Higher fat and protein, lower carbohydrate target.', 'nutrition-outline')}
                        </View>
                        <Input label="Meals per day" placeholder="3" value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="number-pad" maxLength={1} />
                        <Text style={styles.sectionLabel}>Tracking preference</Text>
                        <View style={styles.options}>
                            {renderChoice('simple', trackingStyle, setTrackingStyle, 'Simple targets', 'Calories, protein, and water first.', 'checkmark-done-outline')}
                            {renderChoice('macro', trackingStyle, setTrackingStyle, 'Macro detail', 'Protein, carbs, fats, and daily totals.', 'pie-chart-outline')}
                            {renderChoice('photo', trackingStyle, setTrackingStyle, 'Photo assisted', 'Use scans/photos when logging feels tedious.', 'camera-outline')}
                        </View>
                    </View>
                )}

                {currentStep === 'lifestyle' && (
                    <View>
                        <Text style={styles.eyebrow}>Recovery context</Text>
                        <Text style={styles.title}>How much load can your week handle?</Text>
                        <Text style={styles.subtitle}>Sleep, stress, and activity help BodyPilot avoid plans that look perfect on paper and collapse by Friday.</Text>
                        <View style={styles.options}>
                            {renderChoice('sedentary', activity, setActivity, 'Mostly seated', 'Desk job, low daily movement.', 'desktop-outline')}
                            {renderChoice('light', activity, setActivity, 'Light movement', 'Some walking or errands most days.', 'walk-outline')}
                            {renderChoice('moderate', activity, setActivity, 'Moderate', 'Regular movement outside workouts.', 'bicycle-outline')}
                            {renderChoice('active', activity, setActivity, 'Active', 'Physical job or consistently high steps.', 'trail-sign-outline')}
                            {renderChoice('very_active', activity, setActivity, 'Very active', 'Athletic schedule or highly physical work.', 'flame-outline')}
                        </View>
                        <Input label="Average sleep (hours)" placeholder="7" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" maxLength={4} />
                        <Text style={styles.sectionLabel}>Stress level</Text>
                        <View style={styles.segmentRow}>
                            {renderChip('low', stressLevel || 'medium', (v) => setStressLevel(v), 'Low')}
                            {renderChip('medium', stressLevel || 'medium', (v) => setStressLevel(v), 'Medium')}
                            {renderChip('high', stressLevel || 'medium', (v) => setStressLevel(v), 'High')}
                        </View>
                    </View>
                )}

                {currentStep === 'plan' && (
                    <View>
                        {renderPlanSlide()}
                        <View style={styles.slideDots}>
                            {[0, 1, 2].map((dot) => <View key={dot} style={[styles.dot, planSlide === dot && styles.dotActive]} />)}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.navButtons}>
                {step > 0 && (
                    <Button title="Back" onPress={handleBack} variant="ghost" fullWidth={false} style={styles.backButton} />
                )}
                <Button
                    title={currentStep === 'plan' ? (planSlide < 2 ? 'Next insight' : 'Start my plan') : 'Continue'}
                    onPress={handleNext}
                    disabled={!canProceed() || saving}
                    loading={saving}
                    style={styles.continueButton}
                    size="lg"
                />
            </View>
        </KeyboardAvoidingView>
    );
}

function Metric({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
    return (
        <View style={styles.metricTile}>
            <View style={[styles.metricAccent, { backgroundColor: color }]} />
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricDetail}>{detail}</Text>
        </View>
    );
}

function TimelineRow({ icon, title, detail }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
    return (
        <View style={styles.timelineRow}>
            <View style={styles.timelineIcon}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
            <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{title}</Text>
                <Text style={styles.timelineDetail}>{detail}</Text>
            </View>
        </View>
    );
}

function Macro({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
    return (
        <View style={styles.macroRow}>
            <View style={styles.macroTop}>
                <Text style={styles.macroLabel}>{label}</Text>
                <Text style={styles.macroValue}>{value}g</Text>
            </View>
            <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${Math.max(12, (value / max) * 100)}%`, backgroundColor: color }]} />
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
        marginBottom: Spacing.xl,
    },
    progressBar: {
        flex: 1,
        height: 5,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    stepText: {
        width: 34,
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        textAlign: 'right',
    },
    scrollContent: {
        paddingHorizontal: Spacing.xxl,
        paddingBottom: Spacing.huge,
    },
    eyebrow: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
        lineHeight: 38,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
        marginBottom: Spacing.xxl,
    },
    sectionLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    segment: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        paddingHorizontal: Spacing.sm,
    },
    segmentActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    segmentText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        textAlign: 'center',
    },
    segmentTextActive: {
        color: Colors.textInverse,
    },
    threeColumn: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    smallChoice: {
        flex: 1,
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    smallChoiceActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    smallChoiceText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    smallChoiceTextActive: {
        color: Colors.primary,
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    inputHalf: {
        flex: 1,
    },
    options: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    choice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        minHeight: 82,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    choiceActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    choiceIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.overlayLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceIconActive: {
        backgroundColor: Colors.primary,
    },
    choiceCopy: {
        flex: 1,
        gap: 3,
    },
    choiceTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    choiceTitleActive: {
        color: Colors.primaryLight,
    },
    choiceDescription: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 18,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    metricTile: {
        width: '47%',
        minHeight: 126,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    metricAccent: {
        width: 28,
        height: 4,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.lg,
    },
    metricLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        textTransform: 'uppercase',
    },
    metricValue: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginTop: Spacing.xs,
    },
    metricDetail: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
    },
    timeline: {
        gap: Spacing.md,
    },
    timelineRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    timelineIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.overlayLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineCopy: {
        flex: 1,
    },
    timelineTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.xs,
    },
    timelineDetail: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 19,
    },
    caloriePanel: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.xl,
    },
    calorieValue: {
        color: Colors.text,
        fontSize: 48,
        fontWeight: FontWeight.heavy,
    },
    calorieLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    macroBars: {
        gap: Spacing.lg,
    },
    macroRow: {
        gap: Spacing.sm,
    },
    macroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroLabel: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    macroValue: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    macroTrack: {
        height: 10,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    macroFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
    waterText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
    slideDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xxxl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.borderLight,
    },
    dotActive: {
        width: 24,
        backgroundColor: Colors.primary,
    },
    navButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        paddingTop: Spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.background,
    },
    backButton: {
        flex: 1,
    },
    continueButton: {
        flex: 2,
    },
});
