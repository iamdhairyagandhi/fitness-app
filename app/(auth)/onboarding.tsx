import { Button, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { upsertProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { buildNutritionPlan, formatNumber, lbsToKg } from '@/lib/utils';
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

type UnitSystem = 'metric' | 'imperial';
type Gender = 'male' | 'female' | 'other';
type Pace = 'steady' | 'balanced' | 'aggressive';
type Motivation = 'appearance' | 'performance' | 'health' | 'confidence';
type Equipment = 'gym' | 'home' | 'bodyweight' | 'mixed';
type DietStyle = 'balanced' | 'high_protein' | 'vegetarian' | 'low_carb';
type TrackingStyle = 'simple' | 'macro' | 'photo';
type StressLevel = 'low' | 'medium' | 'high';
type QuestionId =
    | 'units'
    | 'gender'
    | 'age'
    | 'height'
    | 'weight'
    | 'goal'
    | 'targetWeight'
    | 'pace'
    | 'motivation'
    | 'experience'
    | 'trainingDays'
    | 'sessionMinutes'
    | 'equipment'
    | 'dietStyle'
    | 'mealsPerDay'
    | 'trackingStyle'
    | 'activity'
    | 'sleep'
    | 'stress'
    | 'planBaseline'
    | 'planStrategy'
    | 'customTargets'
    | 'planNutrition';

const QUESTIONS: QuestionId[] = [
    'units',
    'gender',
    'age',
    'height',
    'weight',
    'goal',
    'targetWeight',
    'pace',
    'motivation',
    'experience',
    'trainingDays',
    'sessionMinutes',
    'equipment',
    'dietStyle',
    'mealsPerDay',
    'trackingStyle',
    'activity',
    'sleep',
    'stress',
    'planBaseline',
    'planStrategy',
    'customTargets',
    'planNutrition',
];

const goalLabels: Record<FitnessGoal, string> = {
    lose_fat: 'Lose fat',
    maintain: 'Maintain',
    build_muscle: 'Build muscle',
    recomp: 'Recomposition',
    strength: 'Get stronger',
    endurance: 'Improve endurance',
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
    const [questionIndex, setQuestionIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const { setOnboarded, setUser } = useAuthStore();

    const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
    const [gender, setGender] = useState<Gender | null>(null);
    const [age, setAge] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [heightFt, setHeightFt] = useState('');
    const [heightIn, setHeightIn] = useState('');
    const [weight, setWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [goal, setGoal] = useState<FitnessGoal | null>(null);
    const [pace, setPace] = useState<Pace>('balanced');
    const [motivation, setMotivation] = useState<Motivation | null>(null);
    const [experience, setExperience] = useState<ExperienceLevel | null>(null);
    const [trainingDays, setTrainingDays] = useState('');
    const [sessionMinutes, setSessionMinutes] = useState('');
    const [equipment, setEquipment] = useState<Equipment | null>(null);
    const [dietStyle, setDietStyle] = useState<DietStyle | null>(null);
    const [mealsPerDay, setMealsPerDay] = useState('');
    const [trackingStyle, setTrackingStyle] = useState<TrackingStyle | null>(null);
    const [activity, setActivity] = useState<ActivityLevel | null>(null);
    const [sleepHours, setSleepHours] = useState('');
    const [stressLevel, setStressLevel] = useState<StressLevel | null>(null);
    const [customCalories, setCustomCalories] = useState('');
    const [customProtein, setCustomProtein] = useState('');
    const [customCarbs, setCustomCarbs] = useState('');
    const [customFat, setCustomFat] = useState('');
    const [customWater, setCustomWater] = useState('');

    const currentQuestion = QUESTIONS[questionIndex];
    const isPlanQuestion = currentQuestion.startsWith('plan');

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
        const nutrition = buildNutritionPlan({
            weightKg: measurements.weightKg,
            heightCm: measurements.height,
            ageYears: measurements.ageYears,
            gender: gender || 'male',
            activityLevel: selectedActivity,
            goal: selectedGoal,
            pace,
            dietStyle,
            targetWeightKg: measurements.targetWeightKg,
        });

        return {
            ...nutrition,
            restSeconds: selectedExperience === 'beginner' ? 90 : selectedGoal === 'strength' ? 150 : 75,
            trainingDaysNum,
            sessionMinutesNum,
            mealsNum,
            sleepNum,
            weeklyFocus: selectedGoal === 'lose_fat'
                ? 'calorie consistency, protein, and repeatable training'
                : selectedGoal === 'build_muscle'
                    ? 'progressive overload, enough food, and recovery'
                    : selectedGoal === 'strength'
                        ? 'heavy compounds, longer rests, and tracking PRs'
                        : selectedGoal === 'endurance'
                            ? 'cardio capacity, hydration, and sustainable volume'
                            : 'balanced habits and trend tracking',
            recoveryFlag: sleepNum < 6.5 || stressLevel === 'high'
                ? 'Recovery needs attention, so BodyPilot will bias toward sustainable targets.'
                : 'Recovery looks workable, so your plan can progress steadily.',
        };
    }, [activity, dietStyle, experience, gender, goal, measurements, mealsPerDay, pace, sessionMinutes, sleepHours, stressLevel, trainingDays]);

    const targets = useMemo(() => ({
        calories: Math.round(numberFrom(customCalories, plan.calorieTarget)),
        protein: Math.round(numberFrom(customProtein, plan.protein)),
        carbs: Math.round(numberFrom(customCarbs, plan.carbs)),
        fat: Math.round(numberFrom(customFat, plan.fat)),
        waterMl: Math.round(numberFrom(customWater, plan.waterMl)),
    }), [customCalories, customCarbs, customFat, customProtein, customWater, plan]);

    const targetDelta = targets.calories - plan.tdee;
    const targetWeeklyChangeKg = (targetDelta * 7) / 7700;
    const customTimelineWeeks = measurements.targetWeightKg != null && Math.abs(targetWeeklyChangeKg) > 0.05 && Math.sign(measurements.targetWeightKg - measurements.weightKg) === Math.sign(targetWeeklyChangeKg)
        ? Math.max(1, Math.ceil(Math.abs((measurements.targetWeightKg - measurements.weightKg) / targetWeeklyChangeKg)))
        : plan.estimatedWeeksToTarget;

    const canProceed = () => {
        switch (currentQuestion) {
            case 'gender': return !!gender;
            case 'age': return !!age;
            case 'height': return unitSystem === 'metric' ? !!heightCm : !!heightFt;
            case 'weight': return !!weight;
            case 'goal': return !!goal;
            case 'motivation': return !!motivation;
            case 'experience': return !!experience;
            case 'trainingDays': return !!trainingDays;
            case 'sessionMinutes': return !!sessionMinutes;
            case 'equipment': return !!equipment;
            case 'dietStyle': return !!dietStyle;
            case 'mealsPerDay': return !!mealsPerDay;
            case 'trackingStyle': return !!trackingStyle;
            case 'activity': return !!activity;
            case 'sleep': return !!sleepHours;
            case 'stress': return !!stressLevel;
            default: return true;
        }
    };

    const handleNext = () => {
        if (questionIndex < QUESTIONS.length - 1) {
            setQuestionIndex((index) => index + 1);
            return;
        }
        handleComplete();
    };

    const handleBack = () => {
        setQuestionIndex((index) => Math.max(0, index - 1));
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
            daily_calorie_target: targets.calories,
            protein_target_g: targets.protein,
            carbs_target_g: targets.carbs,
            fat_target_g: targets.fat,
            water_goal_ml: targets.waterMl,
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

    const renderQuestion = () => {
        switch (currentQuestion) {
            case 'units':
                return (
                    <>
                        <QuestionHeader eyebrow="Body profile" title="Which units do you use?" subtitle="This controls how BodyPilot asks for weight and height." />
                        <View style={styles.segmentRow}>
                            {renderChip('imperial', unitSystem, setUnitSystem, 'ft / lb')}
                            {renderChip('metric', unitSystem, setUnitSystem, 'cm / kg')}
                        </View>
                    </>
                );
            case 'gender':
                return (
                    <>
                        <QuestionHeader eyebrow="Body profile" title="What should we use for baseline calculations?" subtitle="This helps estimate BMR and calorie targets." />
                        <View style={styles.options}>
                            {renderChoice('male', gender, setGender, 'Male', 'Use male BMR assumptions.', 'male-outline')}
                            {renderChoice('female', gender, setGender, 'Female', 'Use female BMR assumptions.', 'female-outline')}
                            {renderChoice('other', gender, setGender, 'Other', 'Use a neutral starting point.', 'person-outline')}
                        </View>
                    </>
                );
            case 'age':
                return (
                    <>
                        <QuestionHeader eyebrow="Body profile" title="How old are you?" subtitle="Age helps personalize energy and recovery estimates." />
                        <Input label="Age" placeholder="25" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
                    </>
                );
            case 'height':
                return (
                    <>
                        <QuestionHeader eyebrow="Body profile" title="What is your height?" subtitle="We use this for calorie estimates and body composition context." />
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
                    </>
                );
            case 'weight':
                return (
                    <>
                        <QuestionHeader eyebrow="Body profile" title="What is your current weight?" subtitle="This is your starting point. You can update it anytime." />
                        <Input label={`Current weight (${unitSystem === 'metric' ? 'kg' : 'lb'})`} placeholder={unitSystem === 'metric' ? '75' : '165'} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} />
                    </>
                );
            case 'goal':
                return (
                    <>
                        <QuestionHeader eyebrow="Goal design" title="What are we building toward?" subtitle="This shapes calories, macros, training emphasis, and insights." />
                        <View style={styles.options}>
                            {renderChoice('lose_fat', goal, setGoal, 'Lose fat', 'Lean down while preserving muscle and energy.', 'flame-outline')}
                            {renderChoice('build_muscle', goal, setGoal, 'Build muscle', 'Prioritize growth, strength, and enough food.', 'barbell-outline')}
                            {renderChoice('recomp', goal, setGoal, 'Recomposition', 'Improve muscle and body composition together.', 'body-outline')}
                            {renderChoice('strength', goal, setGoal, 'Get stronger', 'Focus on PRs, compounds, and recovery.', 'trophy-outline')}
                            {renderChoice('endurance', goal, setGoal, 'Improve endurance', 'Build stamina and cardio capacity.', 'pulse-outline')}
                            {renderChoice('maintain', goal, setGoal, 'Maintain', 'Keep healthy habits stable and measurable.', 'shield-checkmark-outline')}
                        </View>
                    </>
                );
            case 'targetWeight':
                return (
                    <>
                        <QuestionHeader eyebrow="Goal design" title="Do you have a target weight?" subtitle="Optional. Skip this if your goal is performance or consistency first." />
                        <Input label={`Target weight (${unitSystem === 'metric' ? 'kg' : 'lb'})`} placeholder={unitSystem === 'metric' ? '72' : '158'} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" maxLength={5} />
                    </>
                );
            case 'pace':
                return (
                    <>
                        <QuestionHeader eyebrow="Goal design" title="How hard should the first plan push?" subtitle="You can adjust this later after real logs come in." />
                        <View style={styles.segmentRow}>
                            {renderChip('steady', pace, setPace, 'Steady')}
                            {renderChip('balanced', pace, setPace, 'Balanced')}
                            {renderChip('aggressive', pace, setPace, 'Focused')}
                        </View>
                    </>
                );
            case 'motivation':
                return (
                    <>
                        <QuestionHeader eyebrow="Goal design" title="What matters most right now?" subtitle="This helps BodyPilot choose the right tone and reminders." />
                        <View style={styles.options}>
                            {renderChoice('appearance', motivation, setMotivation, 'Look different', 'Body composition, confidence, and photos.', 'sparkles-outline')}
                            {renderChoice('performance', motivation, setMotivation, 'Perform better', 'Strength, stamina, sports, or gym progress.', 'flash-outline')}
                            {renderChoice('health', motivation, setMotivation, 'Feel healthier', 'Energy, habits, mobility, and longevity.', 'heart-outline')}
                            {renderChoice('confidence', motivation, setMotivation, 'Build confidence', 'Consistency and visible proof.', 'person-circle-outline')}
                        </View>
                    </>
                );
            case 'experience':
                return (
                    <>
                        <QuestionHeader eyebrow="Training setup" title="What is your training experience?" subtitle="This changes progression speed and rest guidance." />
                        <View style={styles.options}>
                            {renderChoice('beginner', experience, setExperience, 'Beginner', 'New or returning after a long break.', 'leaf-outline')}
                            {renderChoice('intermediate', experience, setExperience, 'Intermediate', 'You know the basics and train consistently.', 'trending-up-outline')}
                            {renderChoice('advanced', experience, setExperience, 'Advanced', 'You track performance and manage fatigue.', 'analytics-outline')}
                            {renderChoice('elite', experience, setExperience, 'Elite', 'Highly experienced or competitive.', 'ribbon-outline')}
                        </View>
                    </>
                );
            case 'trainingDays':
                return (
                    <>
                        <QuestionHeader eyebrow="Training setup" title="How many days per week can you train?" subtitle="Pick the number you can actually repeat." />
                        <Input label="Training days per week" placeholder="4" value={trainingDays} onChangeText={setTrainingDays} keyboardType="number-pad" maxLength={1} />
                    </>
                );
            case 'sessionMinutes':
                return (
                    <>
                        <QuestionHeader eyebrow="Training setup" title="How long is a normal workout?" subtitle="This keeps workouts realistic instead of bloated." />
                        <Input label="Minutes per session" placeholder="50" value={sessionMinutes} onChangeText={setSessionMinutes} keyboardType="number-pad" maxLength={3} />
                    </>
                );
            case 'equipment':
                return (
                    <>
                        <QuestionHeader eyebrow="Training setup" title="What equipment do you have?" subtitle="A good plan fits your real setup." />
                        <View style={styles.options}>
                            {renderChoice('gym', equipment, setEquipment, 'Full gym', 'Barbells, machines, cables, cardio equipment.', 'business-outline')}
                            {renderChoice('home', equipment, setEquipment, 'Home setup', 'Dumbbells, bands, bench, or a small setup.', 'home-outline')}
                            {renderChoice('bodyweight', equipment, setEquipment, 'Bodyweight', 'Minimal equipment and movement-first plans.', 'accessibility-outline')}
                            {renderChoice('mixed', equipment, setEquipment, 'Mixed', 'Some gym days, some home or travel days.', 'shuffle-outline')}
                        </View>
                    </>
                );
            case 'dietStyle':
                return (
                    <>
                        <QuestionHeader eyebrow="Nutrition style" title="Which nutrition style fits you?" subtitle="This changes macro defaults and meal guidance." />
                        <View style={styles.options}>
                            {renderChoice('balanced', dietStyle, setDietStyle, 'Balanced', 'Flexible meals with protein, carbs, and fats.', 'restaurant-outline')}
                            {renderChoice('high_protein', dietStyle, setDietStyle, 'High protein', 'More protein-forward targets and reminders.', 'egg-outline')}
                            {renderChoice('vegetarian', dietStyle, setDietStyle, 'Vegetarian', 'Plant-forward meals with protein support.', 'leaf-outline')}
                            {renderChoice('low_carb', dietStyle, setDietStyle, 'Lower carb', 'Higher fat and protein, lower carbohydrates.', 'nutrition-outline')}
                        </View>
                    </>
                );
            case 'mealsPerDay':
                return (
                    <>
                        <QuestionHeader eyebrow="Nutrition style" title="How many meals do you usually eat?" subtitle="This helps split targets into something usable." />
                        <Input label="Meals per day" placeholder="3" value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="number-pad" maxLength={1} />
                    </>
                );
            case 'trackingStyle':
                return (
                    <>
                        <QuestionHeader eyebrow="Nutrition style" title="How do you want to track food?" subtitle="BodyPilot can start simple and get more detailed later." />
                        <View style={styles.options}>
                            {renderChoice('simple', trackingStyle, setTrackingStyle, 'Simple targets', 'Calories, protein, and water first.', 'checkmark-done-outline')}
                            {renderChoice('macro', trackingStyle, setTrackingStyle, 'Macro detail', 'Protein, carbs, fats, and daily totals.', 'pie-chart-outline')}
                            {renderChoice('photo', trackingStyle, setTrackingStyle, 'Photo assisted', 'Use scans/photos when logging feels tedious.', 'camera-outline')}
                        </View>
                    </>
                );
            case 'activity':
                return (
                    <>
                        <QuestionHeader eyebrow="Recovery context" title="How active are you outside workouts?" subtitle="This helps estimate real daily calorie burn." />
                        <View style={styles.options}>
                            {renderChoice('sedentary', activity, setActivity, 'Mostly seated', 'Desk job, low daily movement.', 'desktop-outline')}
                            {renderChoice('light', activity, setActivity, 'Light movement', 'Some walking or errands most days.', 'walk-outline')}
                            {renderChoice('moderate', activity, setActivity, 'Moderate', 'Regular movement outside workouts.', 'bicycle-outline')}
                            {renderChoice('active', activity, setActivity, 'Active', 'Physical job or consistently high steps.', 'trail-sign-outline')}
                            {renderChoice('very_active', activity, setActivity, 'Very active', 'Athletic schedule or highly physical work.', 'flame-outline')}
                        </View>
                    </>
                );
            case 'sleep':
                return (
                    <>
                        <QuestionHeader eyebrow="Recovery context" title="How much do you sleep?" subtitle="Recovery affects how aggressive the plan should be." />
                        <Input label="Average sleep (hours)" placeholder="7" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" maxLength={4} />
                    </>
                );
            case 'stress':
                return (
                    <>
                        <QuestionHeader eyebrow="Recovery context" title="What is your stress level?" subtitle="This helps avoid plans that collapse by Friday." />
                        <View style={styles.segmentRow}>
                            {renderChip('low', stressLevel || 'medium', (v) => setStressLevel(v), 'Low')}
                            {renderChip('medium', stressLevel || 'medium', (v) => setStressLevel(v), 'Medium')}
                            {renderChip('high', stressLevel || 'medium', (v) => setStressLevel(v), 'High')}
                        </View>
                    </>
                );
            case 'planBaseline':
                return (
                    <>
                        <QuestionHeader eyebrow="Your baseline" title="Here is the starting map" subtitle="These numbers anchor your plan. They can be adjusted later as your data improves." />
                        <View style={styles.metricGrid}>
                            <Metric label="BMR" value={`${plan.bmr}`} detail="cal/day" color={Colors.calories} />
                            <Metric label="TDEE" value={`${plan.tdee}`} detail="cal/day" color={Colors.secondary} />
                            <Metric label="Height" value={measurements.heightLabel} detail="recorded" color={Colors.recovery} />
                            <Metric label="Weight" value={measurements.weightLabel} detail="current" color={Colors.bodyComp} />
                        </View>
                    </>
                );
            case 'planStrategy':
                return (
                    <>
                        <QuestionHeader eyebrow="Goal strategy" title={`${goalLabels[goal || 'maintain']} with a ${pace} pace`} subtitle={`${plan.weeklyFocus}. ${plan.recoveryFlag}`} />
                        <View style={styles.timeline}>
                            <TimelineRow icon="calendar-outline" title={`${plan.trainingDaysNum} training days/week`} detail={`${plan.sessionMinutesNum} minute sessions, ${equipment || 'mixed'} setup`} />
                            <TimelineRow icon="barbell-outline" title={`${experienceLabels[experience || 'intermediate']} progression`} detail={`Rest target around ${plan.restSeconds}s between key sets`} />
                            <TimelineRow icon="moon-outline" title={`${plan.sleepNum}h sleep baseline`} detail={`${stressLevel || 'medium'} stress context factored into the pace`} />
                        </View>
                    </>
                );
            case 'customTargets':
                return (
                    <>
                        <QuestionHeader eyebrow="Custom targets" title="Want to adjust the numbers?" subtitle="These are optional. Leave a field blank to use BodyPilot's recommendation." />
                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input label="Calories" placeholder={`${plan.calorieTarget}`} value={customCalories} onChangeText={setCustomCalories} keyboardType="number-pad" maxLength={5} />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input label="Protein (g)" placeholder={`${plan.protein}`} value={customProtein} onChangeText={setCustomProtein} keyboardType="number-pad" maxLength={4} />
                            </View>
                        </View>
                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input label="Carbs (g)" placeholder={`${plan.carbs}`} value={customCarbs} onChangeText={setCustomCarbs} keyboardType="number-pad" maxLength={4} />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input label="Fat (g)" placeholder={`${plan.fat}`} value={customFat} onChangeText={setCustomFat} keyboardType="number-pad" maxLength={4} />
                            </View>
                        </View>
                        <Input label="Water (ml)" placeholder={`${plan.waterMl}`} value={customWater} onChangeText={setCustomWater} keyboardType="number-pad" maxLength={5} />
                        <Text style={styles.mathText}>
                            Current target: {formatNumber(targets.calories)} kcal, {targets.protein}g protein, {targets.carbs}g carbs, {targets.fat}g fat, {Math.round(targets.waterMl / 100) / 10} L water.
                        </Text>
                    </>
                );
            case 'planNutrition':
                return (
                    <>
                        <QuestionHeader eyebrow="Nutrition targets" title="Your first daily targets" subtitle={`A practical starting point for ${trackingStyle || 'macro'} tracking across ${plan.mealsNum} meals per day.`} />
                        <View style={styles.caloriePanel}>
                            <Text style={styles.calorieValue}>{targets.calories}</Text>
                            <Text style={styles.calorieLabel}>calories/day</Text>
                        </View>
                        <View style={styles.macroBars}>
                            <Macro label="Protein" value={targets.protein} color={Colors.protein} max={Math.max(targets.protein, targets.carbs, targets.fat)} />
                            <Macro label="Carbs" value={targets.carbs} color={Colors.carbs} max={Math.max(targets.protein, targets.carbs, targets.fat)} />
                            <Macro label="Fat" value={targets.fat} color={Colors.fat} max={Math.max(targets.protein, targets.carbs, targets.fat)} />
                        </View>
                        <Text style={styles.waterText}>Hydration target: {Math.round(targets.waterMl / 100) / 10} L/day</Text>
                        <Text style={styles.mathText}>
                            Math: BMR {formatNumber(plan.bmr)} kcal plus your activity gives an estimated TDEE of {formatNumber(plan.tdee)} kcal. This target is {Math.abs(targetDelta)} kcal/day {targetDelta < 0 ? 'below' : targetDelta > 0 ? 'above' : 'at'} maintenance, or {formatNumber(Math.abs(targetDelta * 7))} kcal/week. Using about 7,700 kcal per kg, that estimates {Math.abs(targetWeeklyChangeKg) < 0.05 ? 'roughly stable weight' : `${Math.abs(targetWeeklyChangeKg).toFixed(2)} kg/week ${targetWeeklyChangeKg < 0 ? 'loss' : 'gain'}`}{customTimelineWeeks ? `, or about ${customTimelineWeeks} weeks to your target weight.` : '.'}
                        </Text>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }]} />
                </View>
                <Text style={styles.stepText}>{questionIndex + 1}/{QUESTIONS.length}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderQuestion()}
            </ScrollView>

            <View style={styles.navButtons}>
                {questionIndex > 0 && (
                    <Button title="Back" onPress={handleBack} variant="ghost" fullWidth={false} style={styles.backButton} />
                )}
                <Button
                    title={questionIndex === QUESTIONS.length - 1 ? 'Start my plan' : isPlanQuestion ? 'Next insight' : 'Next'}
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

function QuestionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
    return (
        <View>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
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
        width: 50,
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        textAlign: 'right',
    },
    scrollContent: {
        flexGrow: 1,
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
        marginBottom: Spacing.xxxl,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    segment: {
        flex: 1,
        minHeight: 48,
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
    mathText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginTop: Spacing.xl,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
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
