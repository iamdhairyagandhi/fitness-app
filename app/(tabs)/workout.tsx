import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { deleteWorkoutTemplate, saveWorkoutTemplate } from '@/lib/db';
import { requirePremium } from '@/lib/premium';
import {
    DirectoryExercise,
    EXERCISE_DIRECTORY_SOURCE,
    fetchOpenExerciseDirectory,
} from '@/lib/openExerciseDirectory';
import { formatDurationLong, formatVolume, generateId } from '@/lib/utils';
import {
    buildWorkoutHistoryInsight,
    formatMuscle,
    getWorkoutDurationSeconds,
    getWorkoutPrCount,
    getWorkoutSetCount,
    getWorkoutTopMuscles,
} from '@/lib/workoutAnalytics';
import { detectDeload } from '@/lib/workoutIntelligence';
import { useAuthStore } from '@/stores/authStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { Exercise, WorkoutSession, WorkoutSet, WorkoutTemplate, WorkoutTemplateExercise, WorkoutTemplateSet } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_EXERCISES: Record<string, Exercise> = {
    bench: { id: 'template-bench', name: 'Bench Press', category: 'barbell', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    squat: { id: 'template-squat', name: 'Back Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    deadlift: { id: 'template-deadlift', name: 'Deadlift', category: 'barbell', muscle_groups: ['back', 'hamstrings', 'glutes'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    row: { id: 'template-row', name: 'Barbell Row', category: 'barbell', muscle_groups: ['back', 'biceps'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    press: { id: 'template-press', name: 'Overhead Press', category: 'barbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    pullup: { id: 'template-pullup', name: 'Pull-Up', category: 'bodyweight', muscle_groups: ['lats', 'biceps'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    pushup: { id: 'template-pushup', name: 'Push-Up', category: 'bodyweight', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    lunge: { id: 'template-lunge', name: 'Walking Lunge', category: 'bodyweight', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    plank: { id: 'template-plank', name: 'Plank', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    curl: { id: 'template-curl', name: 'Dumbbell Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    gluteBridge: { id: 'template-glute-bridge', name: 'Glute Bridge', category: 'bodyweight', muscle_groups: ['glutes', 'hamstrings'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    hipThrust: { id: 'template-hip-thrust', name: 'Dumbbell Hip Thrust', category: 'dumbbell', muscle_groups: ['glutes', 'hamstrings'], equipment: 'dumbbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    sumoSquat: { id: 'template-sumo-squat', name: 'Dumbbell Sumo Squat', category: 'dumbbell', muscle_groups: ['glutes', 'quads', 'hamstrings'], equipment: 'dumbbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    stepUp: { id: 'template-step-up', name: 'Step-Up', category: 'bodyweight', muscle_groups: ['glutes', 'quads', 'hamstrings'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    bandWalk: { id: 'template-band-walk', name: 'Lateral Band Walk', category: 'bodyweight', muscle_groups: ['glutes'], equipment: 'band', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    deadBug: { id: 'template-dead-bug', name: 'Dead Bug', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    birdDog: { id: 'template-bird-dog', name: 'Bird Dog', category: 'bodyweight', muscle_groups: ['abs', 'lower_back', 'glutes'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    sidePlank: { id: 'template-side-plank', name: 'Side Plank', category: 'bodyweight', muscle_groups: ['abs', 'obliques'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    pilatesHundred: { id: 'template-pilates-hundred', name: 'Pilates Hundred', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    mountainClimber: { id: 'template-mountain-climber', name: 'Mountain Climber', category: 'cardio', muscle_groups: ['full_body', 'abs'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    squatToReach: { id: 'template-squat-to-reach', name: 'Squat to Reach', category: 'cardio', muscle_groups: ['full_body', 'quads', 'glutes'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    skaterStep: { id: 'template-skater-step', name: 'Skater Step', category: 'cardio', muscle_groups: ['glutes', 'quads', 'calves'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    highKnees: { id: 'template-high-knees', name: 'High Knees', category: 'cardio', muscle_groups: ['full_body', 'quads', 'calves'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    downDog: { id: 'template-downward-dog', name: 'Downward Dog', category: 'stretching', muscle_groups: ['full_body', 'hamstrings', 'calves', 'shoulders'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    catCow: { id: 'template-cat-cow', name: 'Cat-Cow', category: 'stretching', muscle_groups: ['lower_back', 'abs'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    warriorFlow: { id: 'template-warrior-flow', name: 'Warrior Flow', category: 'stretching', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    childPose: { id: 'template-child-pose', name: 'Child Pose', category: 'stretching', muscle_groups: ['lower_back', 'shoulders'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    sunSalutation: { id: 'template-sun-salutation', name: 'Sun Salutation', category: 'stretching', muscle_groups: ['full_body'], equipment: 'none', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
};

type WorkoutCategory = 'Popular' | 'Split Workouts' | 'Full-body' | 'Calisthenics' | 'Home Workout' | 'Yoga' | 'HIIT' | 'Glutes & Core' | 'Mobility';

type DirectoryTemplate = {
    id: string;
    name: string;
    description: string;
    category: WorkoutCategory;
    level: string;
    durationMin: number;
    exercises: WorkoutTemplateExercise[];
    isPublic?: boolean;
};

type BuilderExercise = WorkoutTemplateExercise & {
    intensity_percent: number;
    set_type: WorkoutSet['set_type'];
    superset_group: string | null;
    planned_sets: WorkoutTemplateSet[];
};

type AiIntensity = 'light' | 'moderate' | 'hard';
type AiWorkoutType = 'progressive_overload' | 'volume' | 'strength' | 'hypertrophy' | 'conditioning' | 'low_impact' | 'yoga_mobility';
type AiTrainingEnvironment = 'full_gym' | 'home' | 'dumbbells' | 'bodyweight';

const WORKOUT_CATEGORIES: ('All' | WorkoutCategory | 'Mine')[] = [
    'All',
    'Popular',
    'Split Workouts',
    'Full-body',
    'Calisthenics',
    'Home Workout',
    'Yoga',
    'HIIT',
    'Glutes & Core',
    'Mobility',
    'Mine',
];

const BUILDER_MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes'] as const;
const BUILDER_EQUIPMENT_FILTERS = ['All', 'Home', 'Calisthenics', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Band', 'Kettlebell'] as const;
const FULL_LIBRARY_MIN_EXERCISES = 100;
const AI_MUSCLE_OPTIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Full Body'] as const;
const AI_DURATION_OPTIONS = [30, 45, 60, 75, 90] as const;
const AI_INTENSITY_OPTIONS: { value: AiIntensity; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Technique, recovery, easier pace' },
    { value: 'moderate', label: 'Moderate', description: 'Solid work without crushing fatigue' },
    { value: 'hard', label: 'Hard', description: 'Higher effort, more rest, fewer reps' },
];
const AI_WORKOUT_TYPE_OPTIONS: { value: AiWorkoutType; label: string; description: string }[] = [
    { value: 'progressive_overload', label: 'Progressive overload', description: 'Repeatable lifts with room to add reps or load' },
    { value: 'volume', label: 'Volume', description: 'More total sets and controlled pump work' },
    { value: 'strength', label: 'Strength', description: 'Lower reps, heavier work, longer rest' },
    { value: 'hypertrophy', label: 'Hypertrophy', description: 'Muscle-building sets in the 8-12 zone' },
    { value: 'conditioning', label: 'Conditioning', description: 'Faster pace with paired movements' },
    { value: 'low_impact', label: 'Low impact', description: 'Joint-friendly sweat with no jumping required' },
    { value: 'yoga_mobility', label: 'Yoga + mobility', description: 'Flow, core control, flexibility, and recovery' },
];
const AI_TRAINING_ENVIRONMENT_OPTIONS: { value: AiTrainingEnvironment; label: string; description: string }[] = [
    { value: 'full_gym', label: 'Full gym', description: 'Prioritize machines, cables, dumbbells, and barbells' },
    { value: 'home', label: 'Home workout', description: 'Use bodyweight, bands, kettlebells, and light dumbbells' },
    { value: 'dumbbells', label: 'Dumbbells only', description: 'Build around dumbbell and bodyweight movements' },
    { value: 'bodyweight', label: 'Bodyweight', description: 'No equipment unless the database has a close substitute' },
];

function planExercise(
    exercise: Exercise,
    order: number,
    options?: Partial<Pick<WorkoutTemplateExercise, 'target_sets' | 'target_reps' | 'target_weight_kg' | 'rest_seconds' | 'notes' | 'set_type' | 'intensity_percent' | 'superset_group'>>
): WorkoutTemplateExercise {
    return {
        exercise_id: exercise.id,
        exercise,
        order,
        target_sets: options?.target_sets ?? 3,
        target_reps: normalizeRepTarget(options?.target_reps ?? '10'),
        target_weight_kg: options?.target_weight_kg ?? null,
        rest_seconds: options?.rest_seconds ?? 90,
        notes: options?.notes ?? null,
        set_type: options?.set_type ?? 'normal',
        intensity_percent: options?.intensity_percent ?? 75,
        superset_group: options?.superset_group ?? null,
        planned_sets: Array.from({ length: options?.target_sets ?? 3 }, (_, index) => ({
            id: generateId(),
            set_number: index + 1,
            set_type: options?.set_type ?? 'normal',
            target_reps: normalizeRepTarget(options?.target_reps ?? '10'),
            intensity_percent: options?.intensity_percent ?? 75,
        })),
    };
}

const WORKOUT_DIRECTORY: DirectoryTemplate[] = [
    {
        id: 'popular-strength',
        name: 'BodyPilot Strength Base',
        description: 'A simple strength session built around the big lifts.',
        category: 'Popular',
        level: 'Intermediate',
        durationMin: 55,
        exercises: [
            planExercise(BASE_EXERCISES.squat, 0, { target_sets: 4, target_reps: '5', intensity_percent: 85 }),
            planExercise(BASE_EXERCISES.bench, 1, { target_sets: 4, target_reps: '5', intensity_percent: 82 }),
            planExercise(BASE_EXERCISES.row, 2, { target_sets: 3, target_reps: '8', intensity_percent: 75 }),
            planExercise(BASE_EXERCISES.plank, 3, { target_sets: 3, target_reps: '45 sec', set_type: 'volume', intensity_percent: 70 }),
        ],
    },
    {
        id: 'split-push',
        name: 'Push Day',
        description: 'Chest, shoulders, and triceps with progressive compounds.',
        category: 'Split Workouts',
        level: 'All levels',
        durationMin: 50,
        exercises: [
            planExercise(BASE_EXERCISES.bench, 0, { target_sets: 4, target_reps: '7', intensity_percent: 80 }),
            planExercise(BASE_EXERCISES.press, 1, { target_sets: 3, target_reps: '9', intensity_percent: 75 }),
            planExercise(BASE_EXERCISES.pushup, 2, { target_sets: 3, target_reps: 'AMRAP', set_type: 'failure', intensity_percent: 90 }),
        ],
    },
    {
        id: 'split-pull',
        name: 'Pull Day',
        description: 'Back, lats, and biceps with rows and vertical pulling.',
        category: 'Split Workouts',
        level: 'All levels',
        durationMin: 50,
        exercises: [
            planExercise(BASE_EXERCISES.deadlift, 0, { target_sets: 3, target_reps: '5', intensity_percent: 85 }),
            planExercise(BASE_EXERCISES.row, 1, { target_sets: 3, target_reps: '9', intensity_percent: 75 }),
            planExercise(BASE_EXERCISES.pullup, 2, { target_sets: 3, target_reps: '8', intensity_percent: 80 }),
            planExercise(BASE_EXERCISES.curl, 3, { target_sets: 3, target_reps: '11', set_type: 'volume', intensity_percent: 70 }),
        ],
    },
    {
        id: 'full-body-basic',
        name: 'Full-Body Foundation',
        description: 'Squat, push, pull, hinge, and core in one balanced workout.',
        category: 'Full-body',
        level: 'Beginner',
        durationMin: 45,
        exercises: [
            planExercise(BASE_EXERCISES.squat, 0),
            planExercise(BASE_EXERCISES.pushup, 1, { target_reps: '13', superset_group: 'A' }),
            planExercise(BASE_EXERCISES.row, 2, { target_reps: '11', superset_group: 'A' }),
            planExercise(BASE_EXERCISES.lunge, 3, { target_reps: '10/side' }),
            planExercise(BASE_EXERCISES.plank, 4, { target_reps: '45 sec', set_type: 'volume' }),
        ],
    },
    {
        id: 'calisthenics-base',
        name: 'Calisthenics Control',
        description: 'Bodyweight strength with clean reps and core control.',
        category: 'Calisthenics',
        level: 'Beginner',
        durationMin: 35,
        exercises: [
            planExercise(BASE_EXERCISES.pushup, 0, { target_reps: 'AMRAP', set_type: 'failure', intensity_percent: 90 }),
            planExercise(BASE_EXERCISES.pullup, 1, { target_reps: '7', intensity_percent: 82 }),
            planExercise(BASE_EXERCISES.lunge, 2, { target_reps: '12/side', set_type: 'volume' }),
            planExercise(BASE_EXERCISES.plank, 3, { target_reps: '60 sec', set_type: 'volume' }),
        ],
    },
    {
        id: 'home-zero-equipment',
        name: 'Home No-Equipment',
        description: 'A fast home session for strength, conditioning, and consistency.',
        category: 'Home Workout',
        level: 'All levels',
        durationMin: 30,
        exercises: [
            planExercise(BASE_EXERCISES.pushup, 0, { target_reps: '16', superset_group: 'A' }),
            planExercise(BASE_EXERCISES.lunge, 1, { target_reps: '12/side', superset_group: 'A' }),
            planExercise(BASE_EXERCISES.plank, 2, { target_reps: '45 sec', set_type: 'volume' }),
        ],
    },
    {
        id: 'yoga-morning-flow',
        name: 'Morning Yoga Flow',
        description: 'A gentle full-body flow for mobility, breath, and feeling good before the day starts.',
        category: 'Yoga',
        level: 'Beginner',
        durationMin: 25,
        exercises: [
            planExercise(BASE_EXERCISES.catCow, 0, { target_sets: 2, target_reps: '8', set_type: 'volume', intensity_percent: 45, rest_seconds: 30 }),
            planExercise(BASE_EXERCISES.sunSalutation, 1, { target_sets: 3, target_reps: '5', set_type: 'volume', intensity_percent: 55, rest_seconds: 30 }),
            planExercise(BASE_EXERCISES.warriorFlow, 2, { target_sets: 3, target_reps: '6/side', set_type: 'volume', intensity_percent: 60, rest_seconds: 35 }),
            planExercise(BASE_EXERCISES.downDog, 3, { target_sets: 2, target_reps: '45 sec', set_type: 'volume', intensity_percent: 45, rest_seconds: 25 }),
            planExercise(BASE_EXERCISES.childPose, 4, { target_sets: 1, target_reps: '60 sec', set_type: 'volume', intensity_percent: 35, rest_seconds: 20 }),
        ],
    },
    {
        id: 'yoga-strength-core',
        name: 'Yoga Strength + Core',
        description: 'Low-impact flow with core holds, glutes, balance, and shoulder control.',
        category: 'Yoga',
        level: 'All levels',
        durationMin: 35,
        exercises: [
            planExercise(BASE_EXERCISES.sunSalutation, 0, { target_sets: 3, target_reps: '5', set_type: 'volume', intensity_percent: 58, rest_seconds: 30 }),
            planExercise(BASE_EXERCISES.warriorFlow, 1, { target_sets: 3, target_reps: '8/side', set_type: 'volume', intensity_percent: 65, rest_seconds: 40 }),
            planExercise(BASE_EXERCISES.gluteBridge, 2, { target_sets: 3, target_reps: '15', set_type: 'volume', intensity_percent: 68, rest_seconds: 45 }),
            planExercise(BASE_EXERCISES.sidePlank, 3, { target_sets: 2, target_reps: '30/side', set_type: 'volume', intensity_percent: 65, rest_seconds: 35 }),
            planExercise(BASE_EXERCISES.downDog, 4, { target_sets: 2, target_reps: '45 sec', set_type: 'volume', intensity_percent: 45, rest_seconds: 25 }),
        ],
    },
    {
        id: 'hiit-low-impact',
        name: 'Low-Impact HIIT',
        description: 'A joint-friendly sweat session with no jumping and simple full-body intervals.',
        category: 'HIIT',
        level: 'Beginner',
        durationMin: 28,
        exercises: [
            planExercise(BASE_EXERCISES.squatToReach, 0, { target_sets: 3, target_reps: '40 sec', set_type: 'volume', intensity_percent: 72, rest_seconds: 25, superset_group: 'A' }),
            planExercise(BASE_EXERCISES.skaterStep, 1, { target_sets: 3, target_reps: '40 sec', set_type: 'volume', intensity_percent: 72, rest_seconds: 25, superset_group: 'A' }),
            planExercise(BASE_EXERCISES.stepUp, 2, { target_sets: 3, target_reps: '10/side', set_type: 'volume', intensity_percent: 70, rest_seconds: 35, superset_group: 'B' }),
            planExercise(BASE_EXERCISES.deadBug, 3, { target_sets: 3, target_reps: '10/side', set_type: 'volume', intensity_percent: 62, rest_seconds: 30, superset_group: 'B' }),
        ],
    },
    {
        id: 'hiit-full-body',
        name: 'Full-Body HIIT',
        description: 'Fast bodyweight intervals for conditioning, core, and total-body energy.',
        category: 'HIIT',
        level: 'Intermediate',
        durationMin: 32,
        exercises: [
            planExercise(BASE_EXERCISES.mountainClimber, 0, { target_sets: 4, target_reps: '30 sec', set_type: 'volume', intensity_percent: 82, rest_seconds: 25, superset_group: 'A' }),
            planExercise(BASE_EXERCISES.pushup, 1, { target_sets: 4, target_reps: '10', set_type: 'volume', intensity_percent: 78, rest_seconds: 25, superset_group: 'A' }),
            planExercise(BASE_EXERCISES.highKnees, 2, { target_sets: 4, target_reps: '30 sec', set_type: 'volume', intensity_percent: 82, rest_seconds: 25, superset_group: 'B' }),
            planExercise(BASE_EXERCISES.lunge, 3, { target_sets: 4, target_reps: '10/side', set_type: 'volume', intensity_percent: 75, rest_seconds: 35, superset_group: 'B' }),
            planExercise(BASE_EXERCISES.plank, 4, { target_sets: 3, target_reps: '40 sec', set_type: 'volume', intensity_percent: 70, rest_seconds: 30 }),
        ],
    },
    {
        id: 'glutes-core-sculpt',
        name: 'Glutes + Core Sculpt',
        description: 'Dumbbell and bodyweight work for glutes, core control, and lower-body shape.',
        category: 'Glutes & Core',
        level: 'All levels',
        durationMin: 45,
        exercises: [
            planExercise(BASE_EXERCISES.hipThrust, 0, { target_sets: 4, target_reps: '10', intensity_percent: 78, rest_seconds: 75 }),
            planExercise(BASE_EXERCISES.sumoSquat, 1, { target_sets: 3, target_reps: '12', intensity_percent: 74, rest_seconds: 70 }),
            planExercise(BASE_EXERCISES.bandWalk, 2, { target_sets: 3, target_reps: '15/side', set_type: 'volume', intensity_percent: 68, rest_seconds: 45 }),
            planExercise(BASE_EXERCISES.deadBug, 3, { target_sets: 3, target_reps: '10/side', set_type: 'volume', intensity_percent: 62, rest_seconds: 35 }),
            planExercise(BASE_EXERCISES.sidePlank, 4, { target_sets: 2, target_reps: '30/side', set_type: 'volume', intensity_percent: 65, rest_seconds: 35 }),
        ],
    },
    {
        id: 'pilates-core-control',
        name: 'Pilates Core Control',
        description: 'A controlled mat-style session for deep core, posture, and stability.',
        category: 'Glutes & Core',
        level: 'Beginner',
        durationMin: 30,
        exercises: [
            planExercise(BASE_EXERCISES.pilatesHundred, 0, { target_sets: 2, target_reps: '50', set_type: 'volume', intensity_percent: 62, rest_seconds: 40 }),
            planExercise(BASE_EXERCISES.deadBug, 1, { target_sets: 3, target_reps: '10/side', set_type: 'volume', intensity_percent: 62, rest_seconds: 35 }),
            planExercise(BASE_EXERCISES.birdDog, 2, { target_sets: 3, target_reps: '10/side', set_type: 'volume', intensity_percent: 60, rest_seconds: 35 }),
            planExercise(BASE_EXERCISES.gluteBridge, 3, { target_sets: 3, target_reps: '15', set_type: 'volume', intensity_percent: 66, rest_seconds: 45 }),
            planExercise(BASE_EXERCISES.sidePlank, 4, { target_sets: 2, target_reps: '25/side', set_type: 'volume', intensity_percent: 62, rest_seconds: 35 }),
        ],
    },
    {
        id: 'mobility-recovery',
        name: 'Recovery Mobility',
        description: 'A calm reset for hips, back, shoulders, and hamstrings on lighter days.',
        category: 'Mobility',
        level: 'All levels',
        durationMin: 20,
        exercises: [
            planExercise(BASE_EXERCISES.catCow, 0, { target_sets: 2, target_reps: '8', set_type: 'volume', intensity_percent: 35, rest_seconds: 20 }),
            planExercise(BASE_EXERCISES.childPose, 1, { target_sets: 2, target_reps: '45 sec', set_type: 'volume', intensity_percent: 30, rest_seconds: 20 }),
            planExercise(BASE_EXERCISES.downDog, 2, { target_sets: 2, target_reps: '45 sec', set_type: 'volume', intensity_percent: 35, rest_seconds: 20 }),
            planExercise(BASE_EXERCISES.birdDog, 3, { target_sets: 2, target_reps: '8/side', set_type: 'volume', intensity_percent: 45, rest_seconds: 25 }),
        ],
    },
];

export default function WorkoutScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'exercises'>('templates');
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const templates = useWorkoutStore((s) => s.templates);
    const setTemplates = useWorkoutStore((s) => s.setTemplates);
    const storedExercises = useWorkoutStore((s) => s.exercises);
    const personalRecords = useWorkoutStore((s) => s.personalRecords);
    const setStoredExercises = useWorkoutStore((s) => s.setExercises);
    const startWorkoutFromTemplate = useWorkoutStore((s) => s.startWorkoutFromTemplate);
    const user = useAuthStore((s) => s.user);
    const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs);
    const [workoutQuery, setWorkoutQuery] = useState('');
    const [selectedWorkoutCategory, setSelectedWorkoutCategory] = useState<(typeof WORKOUT_CATEGORIES)[number]>('All');
    const [showCreateWorkout, setShowCreateWorkout] = useState(false);
    const [customWorkoutName, setCustomWorkoutName] = useState('');
    const [customWorkoutDescription, setCustomWorkoutDescription] = useState('');
    const [customWorkoutCategory, setCustomWorkoutCategory] = useState<WorkoutCategory>('Full-body');
    const [customWorkoutPublic, setCustomWorkoutPublic] = useState(false);
    const [showAiWorkout, setShowAiWorkout] = useState(false);
    const [aiMuscles, setAiMuscles] = useState<string[]>(['Full Body']);
    const [aiIntensity, setAiIntensity] = useState<AiIntensity>('moderate');
    const [aiDuration, setAiDuration] = useState<(typeof AI_DURATION_OPTIONS)[number]>(45);
    const [aiWorkoutType, setAiWorkoutType] = useState<AiWorkoutType>('progressive_overload');
    const [aiTrainingEnvironment, setAiTrainingEnvironment] = useState<AiTrainingEnvironment>('full_gym');
    const [aiIncludeWarmup, setAiIncludeWarmup] = useState(true);
    const [builderStep, setBuilderStep] = useState<'details' | 'exercises'>('details');
    const [builderExercises, setBuilderExercises] = useState<BuilderExercise[]>([]);
    const [builderExerciseQuery, setBuilderExerciseQuery] = useState('');
    const [builderMuscleFilter, setBuilderMuscleFilter] = useState<(typeof BUILDER_MUSCLE_FILTERS)[number]>('All');
    const [builderEquipmentFilter, setBuilderEquipmentFilter] = useState<(typeof BUILDER_EQUIPMENT_FILTERS)[number]>('All');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [exerciseDirectory, setExerciseDirectory] = useState<DirectoryExercise[]>(storedExercises as DirectoryExercise[]);
    const [directoryLoading, setDirectoryLoading] = useState(false);
    const [directoryError, setDirectoryError] = useState<string | null>(null);
    const [exerciseQuery, setExerciseQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const [selectedExercise, setSelectedExercise] = useState<DirectoryExercise | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);
    const openCreateWorkout = useCallback(() => {
        if (templates.length >= 3 && !requirePremium('unlimited_custom_templates')) return;
        setShowCreateWorkout(true);
    }, [templates.length]);

    const deload = useMemo(() => detectDeload(recentWorkouts, recoveryLogs), [recentWorkouts, recoveryLogs]);
    const historyInsight = useMemo(
        () => buildWorkoutHistoryInsight(recentWorkouts, personalRecords),
        [personalRecords, recentWorkouts],
    );
    const allWorkoutTemplates = useMemo<DirectoryTemplate[]>(() => {
        const customTemplates: DirectoryTemplate[] = templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description || 'Custom workout template',
            category: (template.category as WorkoutCategory) || 'Full-body',
            level: template.is_public ? 'Public' : 'Private',
            durationMin: template.estimated_duration_min,
            exercises: template.exercises,
            isPublic: template.is_public,
        }));
        return [...WORKOUT_DIRECTORY, ...customTemplates];
    }, [templates]);
    const filteredWorkoutTemplates = useMemo(() => {
        const query = workoutQuery.trim().toLowerCase();
        return allWorkoutTemplates.filter((template) => {
            const isMine = templates.some((saved) => saved.id === template.id);
            const matchesCategory =
                selectedWorkoutCategory === 'All' ||
                (selectedWorkoutCategory === 'Mine' && isMine) ||
                template.category === selectedWorkoutCategory;
            const matchesQuery = !query ||
                template.name.toLowerCase().includes(query) ||
                template.description.toLowerCase().includes(query) ||
                template.category.toLowerCase().includes(query);
            return matchesCategory && matchesQuery;
        });
    }, [allWorkoutTemplates, selectedWorkoutCategory, templates, workoutQuery]);
    const directoryMuscles = useMemo(
        () => ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes'],
        []
    );
    const filteredExercises = useMemo(() => {
        const query = exerciseQuery.trim().toLowerCase();
        const muscleMap: Record<string, string[]> = {
            Chest: ['chest'],
            Back: ['back', 'lats', 'lower_back', 'traps'],
            Shoulders: ['shoulders'],
            Arms: ['biceps', 'triceps', 'forearms'],
            Legs: ['quads', 'hamstrings', 'calves'],
            Core: ['abs', 'obliques'],
            Glutes: ['glutes'],
        };

        return exerciseDirectory.filter((exercise) => {
            const matchesQuery = !query ||
                exercise.name.toLowerCase().includes(query) ||
                exercise.equipment.toLowerCase().includes(query) ||
                exercise.muscle_groups.some((muscle) => muscle.includes(query));
            const selectedMuscles = muscleMap[selectedMuscle];
            const matchesMuscle = !selectedMuscles ||
                exercise.muscle_groups.some((muscle) => selectedMuscles.includes(muscle));
            return matchesQuery && matchesMuscle;
        });
    }, [exerciseDirectory, exerciseQuery, selectedMuscle]);
    const builderExerciseOptions = useMemo(() => {
        const query = builderExerciseQuery.trim().toLowerCase();
        const options = exerciseDirectory.length > 0
            ? exerciseDirectory
            : Object.values(BASE_EXERCISES);
        return options.filter((exercise) => {
            const matchesQuery = !query ||
                exercise.name.toLowerCase().includes(query) ||
                exercise.equipment.toLowerCase().includes(query) ||
                exercise.muscle_groups.some((muscle) => muscle.includes(query));
            const matchesMuscle = matchesBuilderMuscle(exercise, builderMuscleFilter);
            const matchesEquipment = matchesBuilderEquipment(exercise, builderEquipmentFilter);
            return matchesQuery && matchesMuscle && matchesEquipment;
        });
    }, [builderEquipmentFilter, builderExerciseQuery, builderMuscleFilter, exerciseDirectory]);

    const loadExerciseDirectory = useCallback(async () => {
        if (exerciseDirectory.length >= FULL_LIBRARY_MIN_EXERCISES || directoryLoading) return;
        if (storedExercises.length >= FULL_LIBRARY_MIN_EXERCISES) {
            setExerciseDirectory(storedExercises as DirectoryExercise[]);
            return;
        }
        setDirectoryLoading(true);
        setDirectoryError(null);
        try {
            const exercises = await fetchOpenExerciseDirectory();
            setExerciseDirectory(exercises);
            setStoredExercises(exercises);
        } catch (error) {
            setDirectoryError(error instanceof Error ? error.message : 'Unable to load exercise directory');
        } finally {
            setDirectoryLoading(false);
        }
    }, [directoryLoading, exerciseDirectory.length, setStoredExercises, storedExercises]);

    const openAiWorkout = useCallback(() => {
        setShowAiWorkout(true);
        loadExerciseDirectory();
    }, [loadExerciseDirectory]);

    React.useEffect(() => {
        if (activeTab === 'exercises' || showCreateWorkout || showAiWorkout) {
            loadExerciseDirectory();
        }
    }, [activeTab, loadExerciseDirectory, showAiWorkout, showCreateWorkout]);

    const startTemplateWorkout = useCallback((template: DirectoryTemplate) => {
        startWorkoutFromTemplate({
            id: template.id,
            user_id: user?.id || '',
            name: template.name,
            description: template.description,
            exercises: template.exercises,
            estimated_duration_min: template.durationMin,
            category: template.category,
            is_public: template.isPublic ?? true,
            created_at: new Date().toISOString(),
        });
        router.push('/workout/active');
    }, [startWorkoutFromTemplate, user?.id]);

    const createCustomWorkout = useCallback(() => {
        const name = customWorkoutName.trim();
        if (!name) return;

        const template: WorkoutTemplate = {
            id: editingTemplateId || generateId(),
            user_id: user?.id || '',
            name,
            description: customWorkoutDescription.trim() || null,
            exercises: builderExercises.map((exercise, index) => ({
                ...exercise,
                order: index,
                target_sets: exercise.planned_sets.length,
                target_reps: summarizeReps(exercise.planned_sets),
                planned_sets: exercise.planned_sets.map((set) => ({
                    ...set,
                    target_reps: normalizeRepTarget(set.target_reps),
                })),
                set_type: exercise.planned_sets[0]?.set_type || exercise.set_type,
                intensity_percent: exercise.planned_sets[0]?.intensity_percent ?? exercise.intensity_percent,
            })),
            estimated_duration_min: Math.max(20, builderExercises.length * 10),
            category: customWorkoutCategory,
            is_public: customWorkoutPublic,
            created_at: new Date().toISOString(),
        };

        const nextTemplates = editingTemplateId
            ? templates.map((existing) => existing.id === editingTemplateId ? template : existing)
            : [template, ...templates];
        setTemplates(nextTemplates);
        saveWorkoutTemplate(template).catch(() => { });
        setCustomWorkoutName('');
        setCustomWorkoutDescription('');
        setCustomWorkoutCategory('Full-body');
        setCustomWorkoutPublic(false);
        setBuilderExercises([]);
        setBuilderExerciseQuery('');
        setBuilderMuscleFilter('All');
        setBuilderEquipmentFilter('All');
        setBuilderStep('details');
        setEditingTemplateId(null);
        setShowCreateWorkout(false);
        setActiveTab('templates');
        setSelectedWorkoutCategory('Mine');
    }, [
        customWorkoutCategory,
        customWorkoutDescription,
        customWorkoutName,
        customWorkoutPublic,
        builderExercises,
        editingTemplateId,
        setTemplates,
        templates,
        user?.id,
    ]);

    const toggleAiMuscle = useCallback((muscle: string) => {
        setAiMuscles((current) => {
            if (muscle === 'Full Body') return ['Full Body'];
            const withoutFullBody = current.filter((item) => item !== 'Full Body');
            const nextMuscles = withoutFullBody.includes(muscle)
                ? withoutFullBody.filter((item) => item !== muscle)
                : [...withoutFullBody, muscle];
            return nextMuscles.length ? nextMuscles : ['Full Body'];
        });
    }, []);

    const createAiWorkout = useCallback(() => {
        const template = buildAiWorkoutTemplate({
            muscles: aiMuscles,
            intensity: aiIntensity,
            durationMin: aiDuration,
            workoutType: aiWorkoutType,
            trainingEnvironment: aiTrainingEnvironment,
            includeWarmup: aiIncludeWarmup,
            exerciseDirectory,
            userId: user?.id || '',
            goal: user?.goal,
            experienceLevel: user?.experience_level,
            preferredRestSeconds: user?.preferred_rest_seconds,
        });
        setTemplates([template, ...templates]);
        saveWorkoutTemplate(template).catch(() => { });
        setShowAiWorkout(false);
        setActiveTab('templates');
        setSelectedWorkoutCategory('Mine');
    }, [
        aiDuration,
        aiIncludeWarmup,
        aiIntensity,
        aiMuscles,
        aiTrainingEnvironment,
        aiWorkoutType,
        exerciseDirectory,
        setTemplates,
        templates,
        user?.experience_level,
        user?.goal,
        user?.id,
        user?.preferred_rest_seconds,
    ]);

    const resetBuilder = useCallback(() => {
        setShowCreateWorkout(false);
        setBuilderStep('details');
        setBuilderExercises([]);
        setBuilderExerciseQuery('');
        setBuilderMuscleFilter('All');
        setBuilderEquipmentFilter('All');
        setEditingTemplateId(null);
        setCustomWorkoutName('');
        setCustomWorkoutDescription('');
        setCustomWorkoutCategory('Full-body');
        setCustomWorkoutPublic(false);
    }, []);

    const deleteCustomTemplate = useCallback((template: DirectoryTemplate) => {
        const isMine = templates.some((saved) => saved.id === template.id);
        if (!isMine) return;

        Alert.alert(
            'Delete workout?',
            `"${template.name}" will be removed from your saved templates.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setTemplates(templates.filter((saved) => saved.id !== template.id));
                        deleteWorkoutTemplate(template.id).catch(() => { });
                        if (editingTemplateId === template.id) {
                            resetBuilder();
                        }
                    },
                },
            ],
        );
    }, [editingTemplateId, resetBuilder, setTemplates, templates]);

    const addBuilderExercise = useCallback((exercise: Exercise) => {
        const plannedSet = createPlannedSet(1);
        setBuilderExercises((current) => [
            ...current,
            {
                ...planExercise(exercise, current.length),
                target_sets: 1,
                intensity_percent: 75,
                set_type: 'normal',
                superset_group: null,
                planned_sets: [plannedSet],
            },
        ]);
        setBuilderExerciseQuery('');
    }, []);

    const updateBuilderExercise = useCallback((index: number, updates: Partial<BuilderExercise>) => {
        setBuilderExercises((current) =>
            current.map((exercise, exerciseIndex) =>
                exerciseIndex === index ? { ...exercise, ...updates } : exercise
            )
        );
    }, []);

    const removeBuilderExercise = useCallback((index: number) => {
        setBuilderExercises((current) =>
            current.filter((_, exerciseIndex) => exerciseIndex !== index)
                .map((exercise, exerciseIndex) => ({ ...exercise, order: exerciseIndex }))
        );
    }, []);

    const openTemplateEditor = useCallback((template: DirectoryTemplate) => {
        setEditingTemplateId(templates.some((existing) => existing.id === template.id) ? template.id : null);
        setCustomWorkoutName(template.name);
        setCustomWorkoutDescription(template.description);
        setCustomWorkoutCategory(template.category);
        setCustomWorkoutPublic(template.isPublic ?? true);
        setBuilderExercises(template.exercises.map((exercise, index) => ({
            ...exercise,
            order: index,
            target_reps: normalizeRepTarget(exercise.target_reps),
            set_type: exercise.set_type || 'normal',
            intensity_percent: exercise.intensity_percent ?? 75,
            superset_group: exercise.superset_group ?? null,
            planned_sets: exercise.planned_sets?.length
                ? exercise.planned_sets.map((set) => ({
                    ...set,
                    target_reps: normalizeRepTarget(set.target_reps),
                }))
                : Array.from({ length: Math.max(1, exercise.target_sets) }, (_, setIndex) =>
                    createPlannedSet(
                        setIndex + 1,
                        exercise.set_type || 'normal',
                        exercise.target_reps,
                        exercise.intensity_percent ?? 75
                    )
                ),
        })));
        setBuilderStep('exercises');
        setShowCreateWorkout(true);
    }, [templates]);

    const addBuilderSet = useCallback((exerciseIndex: number) => {
        setBuilderExercises((current) =>
            current.map((exercise, index) => {
                if (index !== exerciseIndex) return exercise;
                const previous = exercise.planned_sets[exercise.planned_sets.length - 1];
                const nextSets = [
                    ...exercise.planned_sets,
                    createPlannedSet(
                        exercise.planned_sets.length + 1,
                        previous?.set_type || 'normal',
                        previous?.target_reps || exercise.target_reps,
                        previous?.intensity_percent ?? exercise.intensity_percent
                    ),
                ];
                return { ...exercise, planned_sets: nextSets, target_sets: nextSets.length };
            })
        );
    }, []);

    const updateBuilderSet = useCallback((exerciseIndex: number, setIndex: number, updates: Partial<WorkoutTemplateSet>) => {
        const normalizedUpdates = updates.target_reps !== undefined
            ? { ...updates, target_reps: normalizeRepTarget(updates.target_reps) }
            : updates;
        setBuilderExercises((current) =>
            current.map((exercise, index) => {
                if (index !== exerciseIndex) return exercise;
                const plannedSets = exercise.planned_sets.map((set, currentSetIndex) =>
                    currentSetIndex === setIndex ? { ...set, ...normalizedUpdates } : set
                );
                return {
                    ...exercise,
                    planned_sets: plannedSets,
                    target_sets: plannedSets.length,
                    target_reps: summarizeReps(plannedSets),
                    set_type: plannedSets[0]?.set_type || exercise.set_type,
                    intensity_percent: plannedSets[0]?.intensity_percent ?? exercise.intensity_percent,
                };
            })
        );
    }, []);

    const removeBuilderSet = useCallback((exerciseIndex: number, setIndex: number) => {
        setBuilderExercises((current) =>
            current.map((exercise, index) => {
                if (index !== exerciseIndex) return exercise;
                const plannedSets = exercise.planned_sets
                    .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
                    .map((set, currentSetIndex) => ({ ...set, set_number: currentSetIndex + 1 }));
                const nextSets = plannedSets.length ? plannedSets : [createPlannedSet(1)];
                return {
                    ...exercise,
                    planned_sets: nextSets,
                    target_sets: nextSets.length,
                    target_reps: summarizeReps(nextSets),
                    set_type: nextSets[0]?.set_type || exercise.set_type,
                    intensity_percent: nextSets[0]?.intensity_percent ?? exercise.intensity_percent,
                };
            })
        );
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Workout</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={openCreateWorkout}>
                    <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Deload Alert */}
            {deload.shouldDeload && (
                <TouchableOpacity
                    style={styles.deloadBanner}
                    onPress={() => router.push('/workout/insights')}
                >
                    <Ionicons name="warning" size={20} color="#92400E" />
                    <View style={styles.deloadBannerText}>
                        <Text style={styles.deloadBannerTitle}>Deload Recommended</Text>
                        <Text style={styles.deloadBannerSubtext}>
                            Reduce volume by {deload.suggestedReduction}% this week
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#92400E" />
                </TouchableOpacity>
            )}

            {/* Start Workout CTA */}
            <View style={styles.ctaContainer}>
                <Button
                    title="🏋️  Start Empty Workout"
                    onPress={() => router.push('/workout/active')}
                    size="lg"
                />
                <TouchableOpacity
                    style={[styles.aiWorkoutButton, { backgroundColor: colors.surface, borderColor: colors.primary + '3D' }]}
                    onPress={openAiWorkout}
                    activeOpacity={0.84}
                >
                    <View style={[styles.aiWorkoutIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="sparkles" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.aiWorkoutCopy}>
                        <Text style={[styles.aiWorkoutTitle, { color: colors.text }]}>Create workout with AI</Text>
                        <Text style={[styles.aiWorkoutText, { color: colors.textSecondary }]}>
                            Pick muscles, time, intensity, warm-up, and training style.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/workout/warmup')}>
                        <Ionicons name="flame" size={20} color={colors.primary} />
                        <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>Warm-Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/workout/cardio')}>
                        <Ionicons name="fitness" size={20} color="#EF4444" />
                        <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>Cardio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/workout/insights')}>
                        <Ionicons name="analytics" size={20} color="#8B5CF6" />
                        <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>Insights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/workout/strength-standards')}>
                        <Ionicons name="trophy" size={20} color="#10B981" />
                        <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>Standards</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabs}>
                {(['templates', 'history', 'exercises'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, { backgroundColor: colors.surface }, activeTab === tab && styles.tabActive, activeTab === tab && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && styles.tabTextActive, activeTab === tab && { color: colors.textInverse }]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
            >
                {/* Templates Tab */}
                {activeTab === 'templates' && (
                    <View>
                        <View style={styles.templateHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Directory</Text>
                                <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>Search proven workouts or create your own</Text>
                            </View>
                            <TouchableOpacity style={[styles.createSmallButton, { backgroundColor: colors.primary }]} onPress={openCreateWorkout}>
                                <Ionicons name="add" size={18} color={colors.textInverse} />
                                <Text style={styles.createSmallButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="search" size={20} color={colors.textTertiary} />
                            <TextInput
                                value={workoutQuery}
                                onChangeText={setWorkoutQuery}
                                placeholder="Search popular, split, home workouts..."
                                placeholderTextColor={colors.textTertiary}
                                style={[styles.searchInput, { color: colors.text }]}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {WORKOUT_CATEGORIES.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        selectedWorkoutCategory === category && styles.chipActive,
                                        selectedWorkoutCategory === category && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    ]}
                                    onPress={() => setSelectedWorkoutCategory(category)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            { color: colors.textSecondary },
                                            selectedWorkoutCategory === category && styles.chipTextActive,
                                            selectedWorkoutCategory === category && { color: colors.textInverse },
                                        ]}
                                    >
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {filteredWorkoutTemplates.map((template) => {
                            const isMine = templates.some((saved) => saved.id === template.id);
                            return (
                                <TouchableOpacity
                                    key={template.id}
                                    style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                    onPress={() => openTemplateEditor(template)}
                                >
                                    <View style={[styles.templateIcon, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '28' }]}>
                                        <Ionicons name={getTemplateIcon(template.category)} size={23} color={colors.primary} />
                                    </View>
                                    <View style={styles.templateInfo}>
                                        <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                                        <Text style={[styles.templateDesc, { color: colors.textSecondary }]}>{template.description}</Text>
                                        <View style={styles.templateMeta}>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="list" size={12} color={Colors.textTertiary} />
                                                <Text style={styles.metaText}>{template.exercises.length} exercises</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                                                <Text style={styles.metaText}>{template.durationMin} min</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <Ionicons name={template.isPublic ? 'earth' : 'lock-closed'} size={12} color={Colors.textTertiary} />
                                                <Text style={styles.metaText}>{template.isPublic ? 'Public' : template.category}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.templateActions}>
                                        {isMine && (
                                            <TouchableOpacity
                                                style={[styles.templateIconButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                                                onPress={() => deleteCustomTemplate(template)}
                                                hitSlop={10}
                                                accessibilityLabel={`Delete ${template.name}`}
                                            >
                                                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.templatePlayButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                                            onPress={() => startTemplateWorkout(template)}
                                            hitSlop={10}
                                        >
                                            <Ionicons name="play" size={20} color={colors.textInverse} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity style={styles.createTemplate} onPress={openCreateWorkout}>
                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            <Text style={[styles.createTemplateText, { color: colors.primary }]}>Create Custom Template</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <View>
                        {recentWorkouts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No workout history</Text>
                                <Text style={styles.emptySubtext}>
                                    Complete your first workout to see it here
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Card style={{ ...styles.historyInsightCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                                    <View style={styles.historyInsightHeader}>
                                        <View style={styles.historyInsightCopy}>
                                            <Text style={[styles.historyInsightEyebrow, { color: colors.primary }]}>THIS WEEK</Text>
                                            <Text style={[styles.historyInsightTitle, { color: colors.text }]}>
                                                {historyInsight.workoutsThisWeek >= historyInsight.workoutsPreviousWeek
                                                    ? 'Momentum is moving.'
                                                    : 'A lighter week so far.'}
                                            </Text>
                                            <Text style={[styles.historyInsightBody, { color: colors.textSecondary }]}>
                                                {historyInsight.recommendation}
                                            </Text>
                                        </View>
                                        <View style={[styles.historyTrendBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
                                            <Ionicons
                                                name={historyInsight.weekVolumeDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                                                size={18}
                                                color={colors.primary}
                                            />
                                            <Text style={[styles.historyTrendText, { color: colors.primary }]}>
                                                {historyInsight.weekVolumeDeltaPct >= 0 ? '+' : ''}{historyInsight.weekVolumeDeltaPct}%
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.historyInsightStats}>
                                        <HistoryInsightStat label="Workouts" value={`${historyInsight.workoutsThisWeek}`} colors={colors} />
                                        <HistoryInsightStat label="Volume" value={formatVolume(historyInsight.weekVolumeKg, user?.unit_system)} colors={colors} />
                                        <HistoryInsightStat label="Sets" value={`${historyInsight.weekSets}`} colors={colors} />
                                    </View>
                                    {historyInsight.topMuscles.length > 0 && (
                                        <View style={styles.historyMuscleChips}>
                                            {historyInsight.topMuscles.slice(0, 3).map((muscle) => (
                                                <View key={muscle.muscle} style={[styles.historyMuscleChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                    <Text style={[styles.historyMuscleChipText, { color: colors.textSecondary }]}>
                                                        {formatMuscle(muscle.muscle)} · {muscle.sets} sets
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </Card>

                                {recentWorkouts.map((workout) => (
                                    <WorkoutHistoryCard
                                        key={workout.id}
                                        workout={workout}
                                        unitSystem={user?.unit_system}
                                        colors={colors}
                                    />
                                ))}
                            </>
                        )}
                    </View>
                )}

                {/* Exercises Tab */}
                {activeTab === 'exercises' && (
                    <View>
                        <View style={styles.directoryHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Exercise Directory</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Public-domain form photos and movement instructions
                                </Text>
                            </View>
                            <View style={styles.sourceBadge}>
                                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                                <Text style={styles.sourceBadgeText}>Open</Text>
                            </View>
                        </View>

                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color={Colors.textTertiary} />
                            <TextInput
                                value={exerciseQuery}
                                onChangeText={setExerciseQuery}
                                placeholder="Search exercises, equipment, muscle..."
                                placeholderTextColor={Colors.textTertiary}
                                style={styles.searchInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                        >
                            {directoryMuscles.map(
                                (group) => (
                                    <TouchableOpacity
                                        key={group}
                                        style={[styles.chip, selectedMuscle === group && styles.chipActive, selectedMuscle === group && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                        onPress={() => setSelectedMuscle(group)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedMuscle === group && styles.chipTextActive,
                                                selectedMuscle === group && { color: colors.textInverse },
                                            ]}
                                        >
                                            {group}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            )}
                        </ScrollView>

                        {directoryLoading && (
                            <View style={styles.directoryLoading}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.directoryLoadingText}>Loading open exercise directory...</Text>
                            </View>
                        )}

                        {directoryError && (
                            <TouchableOpacity style={styles.directoryError} onPress={loadExerciseDirectory}>
                                <Ionicons name="cloud-offline-outline" size={22} color={Colors.error} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.directoryErrorTitle}>Directory unavailable</Text>
                                    <Text style={styles.directoryErrorText}>Tap to retry. {directoryError}</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {!directoryLoading && !directoryError && (
                            <>
                                <Text style={styles.directoryCount}>
                                    {filteredExercises.length} movements from {EXERCISE_DIRECTORY_SOURCE.name}
                                </Text>
                                {filteredExercises.map((exercise) => (
                                    <TouchableOpacity
                                        key={exercise.id}
                                        style={styles.exerciseCard}
                                        activeOpacity={0.82}
                                        onPress={() => setSelectedExercise(exercise)}
                                    >
                                        <View style={styles.exerciseThumbWrap}>
                                            {exercise.image_url ? (
                                                <Image
                                                    source={{ uri: exercise.image_url }}
                                                    style={styles.exerciseThumb}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                                            )}
                                        </View>
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
                                            <Text style={styles.exerciseMeta} numberOfLines={1}>
                                                {formatLabel(exercise.muscle_groups[0])} • {formatLabel(exercise.equipment)}
                                            </Text>
                                            <View style={styles.exerciseTags}>
                                                {exercise.level && <Text style={styles.exerciseTag}>{formatLabel(exercise.level)}</Text>}
                                                <Text style={styles.exerciseTag}>{exercise.is_compound ? 'Compound' : 'Isolation'}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={showAiWorkout}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAiWorkout(false)}
            >
                <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.detailHeader, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
                        <TouchableOpacity style={[styles.detailClose, { backgroundColor: colors.surface }]} onPress={() => setShowAiWorkout(false)}>
                            <Ionicons name="close" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.detailHeaderTitle, { color: colors.text }]}>AI Workout</Text>
                        <TouchableOpacity style={[styles.saveTemplateButton, { backgroundColor: colors.primary }]} onPress={createAiWorkout}>
                            <Text style={styles.saveTemplateButtonText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        contentContainerStyle={[
                            styles.createWorkoutContent,
                            { paddingBottom: insets.bottom + 120 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.aiModalHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.aiWorkoutIcon, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="sparkles" size={22} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.aiModalTitle, { color: colors.text }]}>Build a workout from your profile</Text>
                                <Text style={[styles.aiModalText, { color: colors.textSecondary }]}>
                                    BodyPilot will use your onboarding goal, experience level, and the exercise database to create a saved template.
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Muscle groups</Text>
                        <View style={styles.createCategoryGrid}>
                            {AI_MUSCLE_OPTIONS.map((muscle) => {
                                const selected = aiMuscles.includes(muscle);
                                return (
                                    <TouchableOpacity
                                        key={muscle}
                                        style={[
                                            styles.createCategoryChip,
                                            { backgroundColor: colors.surface, borderColor: colors.border },
                                            selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                                        ]}
                                        onPress={() => toggleAiMuscle(muscle)}
                                    >
                                        <Text style={[styles.createCategoryText, { color: colors.textSecondary }, selected && { color: colors.textInverse }]}>
                                            {muscle}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Workout setup</Text>
                        <View style={styles.aiOptionStack}>
                            {AI_TRAINING_ENVIRONMENT_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.aiOptionRow,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        aiTrainingEnvironment === option.value && { backgroundColor: colors.primary + '12', borderColor: colors.primary },
                                    ]}
                                    onPress={() => setAiTrainingEnvironment(option.value)}
                                    activeOpacity={0.84}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.aiOptionTitle, { color: colors.text }, aiTrainingEnvironment === option.value && { color: colors.primary }]}>{option.label}</Text>
                                        <Text style={[styles.aiOptionText, { color: colors.textTertiary }]}>{option.description}</Text>
                                    </View>
                                    {aiTrainingEnvironment === option.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Intensity</Text>
                        <View style={styles.aiOptionStack}>
                            {AI_INTENSITY_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.aiOptionRow,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        aiIntensity === option.value && { backgroundColor: colors.primary + '12', borderColor: colors.primary },
                                    ]}
                                    onPress={() => setAiIntensity(option.value)}
                                    activeOpacity={0.84}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.aiOptionTitle, { color: colors.text }, aiIntensity === option.value && { color: colors.primary }]}>{option.label}</Text>
                                        <Text style={[styles.aiOptionText, { color: colors.textTertiary }]}>{option.description}</Text>
                                    </View>
                                    {aiIntensity === option.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time</Text>
                        <View style={styles.aiDurationGrid}>
                            {AI_DURATION_OPTIONS.map((minutes) => (
                                <TouchableOpacity
                                    key={minutes}
                                    style={[
                                        styles.aiDurationChip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        aiDuration === minutes && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    ]}
                                    onPress={() => setAiDuration(minutes)}
                                >
                                    <Text style={[styles.aiDurationText, { color: colors.textSecondary }, aiDuration === minutes && { color: colors.textInverse }]}>
                                        {minutes} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Workout type</Text>
                        <View style={styles.aiOptionStack}>
                            {AI_WORKOUT_TYPE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.aiOptionRow,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        aiWorkoutType === option.value && { backgroundColor: colors.primary + '12', borderColor: colors.primary },
                                    ]}
                                    onPress={() => setAiWorkoutType(option.value)}
                                    activeOpacity={0.84}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.aiOptionTitle, { color: colors.text }, aiWorkoutType === option.value && { color: colors.primary }]}>{option.label}</Text>
                                        <Text style={[styles.aiOptionText, { color: colors.textTertiary }]}>{option.description}</Text>
                                    </View>
                                    {aiWorkoutType === option.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.visibilityRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setAiIncludeWarmup((value) => !value)}
                            activeOpacity={0.84}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.visibilityTitle, { color: colors.text }]}>Add warm-up sets</Text>
                                <Text style={[styles.visibilityText, { color: colors.textTertiary }]}>
                                    {aiIncludeWarmup
                                        ? 'The first main lifts will include lighter warm-up sets.'
                                        : 'The template will only include working sets.'}
                                </Text>
                            </View>
                            <Ionicons
                                name={aiIncludeWarmup ? 'toggle' : 'toggle-outline'}
                                size={32}
                                color={aiIncludeWarmup ? colors.primary : colors.textTertiary}
                            />
                        </TouchableOpacity>

                        <Button title="Create Workout Template" onPress={createAiWorkout} size="lg" />
                    </ScrollView>
                </View>
            </Modal>

            <Modal
                visible={showCreateWorkout}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={resetBuilder}
            >
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingRoot}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                >
                    <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.detailHeader, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
                        <TouchableOpacity style={[styles.detailClose, { backgroundColor: colors.surface }]} onPress={resetBuilder}>
                            <Ionicons name="close" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.detailHeaderTitle, { color: colors.text }]}>
                            {editingTemplateId
                                ? 'Edit Workout'
                                : builderStep === 'details'
                                    ? 'Create Workout'
                                    : 'Build Template'}
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.saveTemplateButton,
                                (builderStep === 'details'
                                    ? !customWorkoutName.trim()
                                    : !customWorkoutName.trim() || builderExercises.length === 0) && styles.saveTemplateButtonDisabled,
                            ]}
                            disabled={builderStep === 'details'
                                ? !customWorkoutName.trim()
                                : !customWorkoutName.trim() || builderExercises.length === 0}
                            onPress={() => {
                                if (builderStep === 'details') {
                                    setBuilderStep('exercises');
                                    return;
                                }
                                createCustomWorkout();
                            }}
                        >
                            <Text style={styles.saveTemplateButtonText}>
                                {builderStep === 'details' && !editingTemplateId ? 'Next' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        contentContainerStyle={[
                            styles.createWorkoutContent,
                            { paddingBottom: insets.bottom + 240 },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        automaticallyAdjustKeyboardInsets
                        showsVerticalScrollIndicator={false}
                    >
                        {builderStep === 'details' ? (
                            <>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Workout name</Text>
                                <TextInput
                                    value={customWorkoutName}
                                    onChangeText={setCustomWorkoutName}
                                    placeholder="Upper Strength, Hotel Full Body..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={[styles.createInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                />
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                                <TextInput
                                    value={customWorkoutDescription}
                                    onChangeText={setCustomWorkoutDescription}
                                    placeholder="What is this workout for?"
                                    placeholderTextColor={colors.textTertiary}
                                    style={[styles.createInput, styles.createTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    multiline
                                />
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                                <View style={styles.createCategoryGrid}>
                                    {WORKOUT_CATEGORIES.filter((category): category is WorkoutCategory => category !== 'All' && category !== 'Mine').map((category) => (
                                        <TouchableOpacity
                                            key={category}
                                            style={[
                                                styles.createCategoryChip,
                                                { backgroundColor: colors.surface, borderColor: colors.border },
                                                customWorkoutCategory === category && { backgroundColor: colors.primary, borderColor: colors.primary },
                                            ]}
                                            onPress={() => setCustomWorkoutCategory(category)}
                                        >
                                            <Text
                                                style={[
                                                    styles.createCategoryText,
                                                    { color: colors.textSecondary },
                                                    customWorkoutCategory === category && { color: colors.textInverse },
                                                ]}
                                            >
                                                {category}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={[styles.visibilityRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={() => setCustomWorkoutPublic((value) => !value)}
                                >
                                    <View>
                                        <Text style={[styles.visibilityTitle, { color: colors.text }]}>
                                            {customWorkoutPublic ? 'Public workout' : 'Private workout'}
                                        </Text>
                                        <Text style={[styles.visibilityText, { color: colors.textTertiary }]}>
                                            {customWorkoutPublic
                                                ? 'Other BodyPilot users can discover this template later.'
                                                : 'Only you can see and use this template.'}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={customWorkoutPublic ? 'earth' : 'lock-closed'}
                                        size={24}
                                        color={customWorkoutPublic ? colors.primary : colors.textTertiary}
                                    />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.builderSummary}>
                                    <TouchableOpacity style={styles.builderBackButton} onPress={() => setBuilderStep('details')}>
                                        <Ionicons name="chevron-back" size={17} color={colors.primary} />
                                        <Text style={[styles.builderBackText, { color: colors.primary }]}>Details</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.builderTitle, { color: colors.text }]}>{customWorkoutName}</Text>
                                    <Text style={[styles.builderSubtext, { color: colors.textSecondary }]}>
                                        Add movements, then configure sets, reps, intensity, warmups, volume work, and supersets.
                                    </Text>
                                </View>

                                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Ionicons name="search" size={20} color={colors.textTertiary} />
                                    <TextInput
                                        value={builderExerciseQuery}
                                        onChangeText={setBuilderExerciseQuery}
                                        placeholder="Search exercises to add..."
                                        placeholderTextColor={colors.textTertiary}
                                        style={[styles.searchInput, { color: colors.text }]}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <Text style={[styles.builderFilterLabel, { color: colors.textTertiary }]}>Muscle group</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.builderFilterScroll}>
                                    {BUILDER_MUSCLE_FILTERS.map((filter) => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[
                                                styles.builderFilterChip,
                                                { backgroundColor: colors.surface, borderColor: colors.border },
                                                builderMuscleFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary },
                                            ]}
                                            onPress={() => setBuilderMuscleFilter(filter)}
                                        >
                                            <Text style={[styles.builderFilterText, { color: colors.textSecondary }, builderMuscleFilter === filter && { color: colors.textInverse }]}>
                                                {filter}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={[styles.builderFilterLabel, { color: colors.textTertiary }]}>Equipment / style</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.builderFilterScroll}>
                                    {BUILDER_EQUIPMENT_FILTERS.map((filter) => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[
                                                styles.builderFilterChip,
                                                { backgroundColor: colors.surface, borderColor: colors.border },
                                                builderEquipmentFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary },
                                            ]}
                                            onPress={() => setBuilderEquipmentFilter(filter)}
                                        >
                                            <Text style={[styles.builderFilterText, { color: colors.textSecondary }, builderEquipmentFilter === filter && { color: colors.textInverse }]}>
                                                {filter}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.builderPickerHeader}>
                                    <Text style={[styles.builderPickerTitle, { color: colors.text }]}>Add Exercise</Text>
                                    <Text style={[styles.builderPickerCount, { color: colors.textTertiary }]}>{builderExerciseOptions.length} results</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.builderVisualPicker}
                                >
                                    {builderExerciseOptions.slice(0, 60).map((exercise) => (
                                        <TouchableOpacity
                                            key={exercise.id}
                                            style={styles.builderExerciseOption}
                                            onPress={() => addBuilderExercise(exercise)}
                                            activeOpacity={0.82}
                                        >
                                            <View style={styles.builderExerciseOptionImageWrap}>
                                                {exercise.image_url ? (
                                                    <Image
                                                        source={{ uri: exercise.image_url }}
                                                        style={styles.builderExerciseOptionImage}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Ionicons name="barbell-outline" size={28} color={colors.primary} />
                                                )}
                                                <View style={styles.builderExerciseAddBadge}>
                                                    <Ionicons name="add" size={14} color={Colors.textInverse} />
                                                </View>
                                            </View>
                                            <Text style={styles.builderExerciseOptionName} numberOfLines={2}>
                                                {exercise.name}
                                            </Text>
                                            <Text style={styles.builderExerciseOptionMeta} numberOfLines={1}>
                                                {formatLabel(exercise.muscle_groups[0])} • {formatLabel(exercise.equipment)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {builderExercises.length === 0 ? (
                                    <View style={styles.builderEmpty}>
                                        <Ionicons name="barbell-outline" size={38} color={Colors.textTertiary} />
                                        <Text style={styles.emptyTitle}>No exercises yet</Text>
                                        <Text style={styles.emptySubtext}>Search above to add the first movement.</Text>
                                    </View>
                                ) : (
                                    builderExercises.map((exercise, index) => (
                                        <View key={`${exercise.exercise_id}-${index}`} style={styles.builderExerciseCard}>
                                            <View style={styles.builderExerciseHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.builderExerciseName}>{exercise.exercise.name}</Text>
                                                    <Text style={styles.builderExerciseMeta}>
                                                        {formatLabel(exercise.exercise.equipment)} • {formatLabel(exercise.exercise.muscle_groups[0])}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity onPress={() => removeBuilderExercise(index)}>
                                                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.exerciseRestRow}>
                                                <BuilderNumberField
                                                    label="Rest between sets"
                                                    value={exercise.rest_seconds}
                                                    onChange={(value) => updateBuilderExercise(index, { rest_seconds: value })}
                                                />
                                            </View>

                                            <View style={styles.setTableHeader}>
                                                <Text style={[styles.setTableHeaderText, { width: 36 }]}>Set</Text>
                                                <Text style={[styles.setTableHeaderText, { flex: 1.2 }]}>Type</Text>
                                                <Text style={[styles.setTableHeaderText, { flex: 1 }]}>Reps</Text>
                                                <Text style={[styles.setTableHeaderText, { flex: 1 }]}>%</Text>
                                                <View style={{ width: 30 }} />
                                            </View>

                                            {exercise.planned_sets.map((plannedSet, setIndex) => (
                                                <View key={plannedSet.id} style={styles.setPlanRow}>
                                                    <Text style={styles.setPlanNumber}>{setIndex + 1}</Text>
                                                    <TouchableOpacity
                                                        style={styles.setTypeIconButton}
                                                        onPress={() => updateBuilderSet(index, setIndex, {
                                                            set_type: getNextSetType(plannedSet.set_type),
                                                        })}
                                                    >
                                                        <Text style={styles.setTypeEmoji}>{getSetTypeDisplay(plannedSet.set_type).emoji}</Text>
                                                        <Text style={styles.setTypeIconLabel}>{getSetTypeDisplay(plannedSet.set_type).label}</Text>
                                                    </TouchableOpacity>
                                                    <RepStepper
                                                        value={plannedSet.target_reps}
                                                        onChange={(value) => updateBuilderSet(index, setIndex, { target_reps: value })}
                                                    />
                                                    <TextInput
                                                        value={plannedSet.intensity_percent === null ? '' : String(plannedSet.intensity_percent)}
                                                        onChangeText={(value) => updateBuilderSet(index, setIndex, {
                                                            intensity_percent: value ? Number(value.replace(/[^0-9]/g, '')) : null,
                                                        })}
                                                        keyboardType="number-pad"
                                                        style={styles.setPlanInput}
                                                        placeholder="75"
                                                        placeholderTextColor={Colors.textTertiary}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.setPlanDelete}
                                                        onPress={() => removeBuilderSet(index, setIndex)}
                                                    >
                                                        <Ionicons name="close" size={16} color={Colors.textTertiary} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            <TouchableOpacity style={styles.addSetRowButton} onPress={() => addBuilderSet(index)}>
                                                <Ionicons name="add" size={16} color={colors.primary} />
                                                <Text style={[styles.addSetRowText, { color: colors.primary }]}>Add Set Row</Text>
                                            </TouchableOpacity>

                                            <Text style={styles.builderMiniLabel}>Superset group</Text>
                                            <View style={styles.setTypeRow}>
                                                {([null, 'A', 'B', 'C'] as (string | null)[]).map((group) => (
                                                    <TouchableOpacity
                                                        key={group || 'none'}
                                                        style={[
                                                            styles.setTypeChip,
                                                            exercise.superset_group === group && styles.setTypeChipActive,
                                                        ]}
                                                        onPress={() => updateBuilderExercise(index, { superset_group: group })}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.setTypeText,
                                                                exercise.superset_group === group && styles.setTypeTextActive,
                                                            ]}
                                                        >
                                                            {group ? `Group ${group}` : 'None'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    ))
                                )}

                                <Button
                                    title="Save Workout Template"
                                    onPress={createCustomWorkout}
                                    disabled={builderExercises.length === 0}
                                    size="lg"
                                />
                            </>
                        )}
                    </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={!!selectedExercise}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedExercise(null)}
            >
                {selectedExercise && (
                    <View style={styles.detailContainer}>
                        <View style={[styles.detailHeader, { paddingTop: insets.top + Spacing.sm }]}>
                            <TouchableOpacity style={styles.detailClose} onPress={() => setSelectedExercise(null)}>
                                <Ionicons name="close" size={22} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.detailHeaderTitle}>Movement Guide</Text>
                            <View style={styles.detailClose} />
                        </View>
                        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                            {selectedExercise.image_url && (
                                <View style={styles.detailHero}>
                                    <Image
                                        source={{ uri: selectedExercise.image_url }}
                                        style={styles.detailImage}
                                        resizeMode="cover"
                                    />
                                    {selectedExercise.gallery[1] && (
                                        <Image
                                            source={{ uri: selectedExercise.gallery[1] }}
                                            style={styles.detailImage}
                                            resizeMode="cover"
                                        />
                                    )}
                                </View>
                            )}
                            <Text style={styles.detailTitle}>{selectedExercise.name}</Text>
                            <View style={styles.detailMetaGrid}>
                                <DetailPill icon="body-outline" label={formatLabel(selectedExercise.muscle_groups[0])} />
                                <DetailPill icon="barbell-outline" label={formatLabel(selectedExercise.equipment)} />
                                <DetailPill icon="speedometer-outline" label={formatLabel(selectedExercise.level || 'all levels')} />
                            </View>
                            <Text style={styles.detailSectionTitle}>Form Cues</Text>
                            {selectedExercise.instructions.split('\n').slice(0, 8).map((instruction, index) => (
                                <View key={`${selectedExercise.id}-${index}`} style={styles.instructionRow}>
                                    <Text style={styles.instructionNumber}>{index + 1}</Text>
                                    <Text style={styles.instructionText}>{instruction}</Text>
                                </View>
                            ))}
                            <Text style={styles.sourceText}>
                                Source: {EXERCISE_DIRECTORY_SOURCE.name} ({EXERCISE_DIRECTORY_SOURCE.license})
                            </Text>
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </View>
    );
}

function buildAiWorkoutTemplate({
    muscles,
    intensity,
    durationMin,
    workoutType,
    trainingEnvironment,
    includeWarmup,
    exerciseDirectory,
    userId,
    goal,
    experienceLevel,
    preferredRestSeconds,
}: {
    muscles: string[];
    intensity: AiIntensity;
    durationMin: number;
    workoutType: AiWorkoutType;
    trainingEnvironment: AiTrainingEnvironment;
    includeWarmup: boolean;
    exerciseDirectory: DirectoryExercise[];
    userId: string;
    goal?: string;
    experienceLevel?: string;
    preferredRestSeconds?: number | null;
}): WorkoutTemplate {
    const library = dedupeExercises([
        ...exerciseDirectory,
        ...Object.values(BASE_EXERCISES),
    ]);
    const focusMuscles = muscles.includes('Full Body') || muscles.length === 0
        ? ['Chest', 'Back', 'Legs', 'Shoulders', 'Core']
        : muscles;
    const effectiveTrainingEnvironment = workoutType === 'yoga_mobility'
        ? 'bodyweight'
        : workoutType === 'low_impact' && trainingEnvironment === 'full_gym'
            ? 'home'
            : trainingEnvironment;
    const exerciseCount = getAiExerciseCount(durationMin);
    const selectedExercises = selectAiExercises(library, focusMuscles, exerciseCount, effectiveTrainingEnvironment);
    const prescription = getAiPrescription(workoutType, intensity, experienceLevel, preferredRestSeconds);
    const workoutTypeLabel = AI_WORKOUT_TYPE_OPTIONS.find((option) => option.value === workoutType)?.label ?? 'AI';
    const environmentLabel = workoutType === 'yoga_mobility'
        ? 'Yoga + mobility'
        : AI_TRAINING_ENVIRONMENT_OPTIONS.find((option) => option.value === effectiveTrainingEnvironment)?.label ?? 'Workout';
    const focusLabel = focusMuscles.length >= 4 ? 'Full Body' : focusMuscles.join(' + ');
    const templateExercises = selectedExercises.map((exercise, index) => {
        const isConditioningPair = workoutType === 'conditioning' && index < 4;
        const workSetCount = Math.max(2, prescription.sets + (exercise.is_compound && intensity === 'hard' ? 1 : 0));
        const plannedSets = buildAiPlannedSets({
            setCount: workSetCount,
            reps: getAiExerciseReps(exercise, prescription.reps),
            intensityPercent: prescription.intensityPercent,
            setType: prescription.setType,
            addWarmup: includeWarmup && index < 2 && exercise.is_compound,
        });

        return {
            ...planExercise(exercise, index, {
                target_sets: plannedSets.length,
                target_reps: summarizeReps(plannedSets),
                rest_seconds: prescription.restSeconds,
                set_type: prescription.setType,
                intensity_percent: prescription.intensityPercent,
                superset_group: isConditioningPair ? (index % 2 === 0 ? 'A' : 'B') : null,
                notes: getAiExerciseNote(workoutType, goal),
            }),
            planned_sets: plannedSets,
        };
    });

    return {
        id: generateId(),
        user_id: userId,
        name: `AI ${environmentLabel}: ${focusLabel}`,
        description: [
            `${durationMin}-minute ${workoutTypeLabel.toLowerCase()} session`,
            `${environmentLabel.toLowerCase()} equipment`,
            `built for ${formatAiGoal(goal)} and ${formatAiGoal(experienceLevel)} experience`,
            includeWarmup ? 'with warm-up sets' : 'without warm-up sets',
        ].join(', ') + '.',
        exercises: templateExercises,
        estimated_duration_min: durationMin,
        category: workoutType === 'yoga_mobility'
            ? 'Yoga'
            : workoutType === 'low_impact'
                ? 'HIIT'
                : effectiveTrainingEnvironment === 'home' || effectiveTrainingEnvironment === 'bodyweight'
            ? 'Home Workout'
            : focusMuscles.length >= 4 ? 'Full-body' : 'Split Workouts',
        is_public: false,
        created_at: new Date().toISOString(),
    };
}

function dedupeExercises(exercises: Exercise[]) {
    const seen = new Set<string>();
    return exercises.filter((exercise) => {
        if (seen.has(exercise.id)) return false;
        seen.add(exercise.id);
        return true;
    });
}

function getAiExerciseCount(durationMin: number) {
    if (durationMin <= 30) return 4;
    if (durationMin <= 45) return 5;
    if (durationMin <= 60) return 6;
    if (durationMin <= 75) return 7;
    return 8;
}

function selectAiExercises(library: Exercise[], focusMuscles: string[], count: number, trainingEnvironment: AiTrainingEnvironment) {
    const selected: Exercise[] = [];
    const relevantLibrary = library.filter((exercise) => matchesAiTrainingEnvironment(exercise, trainingEnvironment));
    const quotas = getAiMuscleQuotas(focusMuscles, count);
    const selectedCounts = Object.fromEntries(focusMuscles.map((muscle) => [muscle, 0])) as Record<string, number>;
    const muscleQueue = buildAiMuscleQueue(focusMuscles, quotas);

    muscleQueue.forEach((muscle, pickIndex) => {
        if (selected.length >= count) return;
        const candidate = relevantLibrary
            .filter((exercise) => !selected.some((item) => item.id === exercise.id))
            .filter((exercise) => isAllowedAiExerciseForFocus(exercise, focusMuscles))
            .filter((exercise) => matchesAiMuscle(exercise, muscle))
            .sort((a, b) => scoreAiExerciseForMuscle(a, b, muscle, focusMuscles, trainingEnvironment, pickIndex))[0];
        if (!candidate) return;
        selected.push(candidate);
        selectedCounts[muscle] = (selectedCounts[muscle] ?? 0) + 1;
    });

    for (const muscle of focusMuscles) {
        while ((selectedCounts[muscle] ?? 0) < quotas[muscle] && selected.length < count) {
            const candidate = relevantLibrary
                .filter((exercise) => !selected.some((item) => item.id === exercise.id))
                .filter((exercise) => isAllowedAiExerciseForFocus(exercise, focusMuscles))
                .filter((exercise) => matchesAiMuscle(exercise, muscle))
                .sort((a, b) => scoreAiExerciseForMuscle(a, b, muscle, focusMuscles, trainingEnvironment, 1))[0];
            if (!candidate) break;
            selected.push(candidate);
            selectedCounts[muscle] = (selectedCounts[muscle] ?? 0) + 1;
        }
    }

    const targetMatches = relevantLibrary
        .filter((exercise) => !selected.some((item) => item.id === exercise.id))
        .filter((exercise) => isAllowedAiExerciseForFocus(exercise, focusMuscles))
        .filter((exercise) => focusMuscles.some((muscle) => matchesAiMuscle(exercise, muscle)))
        .sort((a, b) => scoreAiExerciseForFocus(a, b, focusMuscles, trainingEnvironment));
    const environmentBackfill = relevantLibrary
        .filter((exercise) => !selected.some((item) => item.id === exercise.id))
        .filter((exercise) => isAllowedAiExerciseForFocus(exercise, focusMuscles))
        .sort((a, b) => scoreAiExerciseForFocus(a, b, focusMuscles, trainingEnvironment));
    const emergencyBackfill = library
        .filter((exercise) => !selected.some((item) => item.id === exercise.id))
        .filter((exercise) => isAllowedAiExerciseForFocus(exercise, focusMuscles))
        .sort((a, b) => scoreAiExerciseForFocus(a, b, focusMuscles, trainingEnvironment));

    return [...selected, ...targetMatches, ...environmentBackfill, ...emergencyBackfill].slice(0, count);
}

function scoreAiExerciseForFocus(a: Exercise, b: Exercise, focusMuscles: string[], trainingEnvironment: AiTrainingEnvironment) {
    const aScore = Math.max(...focusMuscles.map((muscle) => getAiMuscleScore(a, muscle, focusMuscles, 1))) +
        getEquipmentScore(a.equipment, trainingEnvironment) +
        getInstructionScore(a);
    const bScore = Math.max(...focusMuscles.map((muscle) => getAiMuscleScore(b, muscle, focusMuscles, 1))) +
        getEquipmentScore(b.equipment, trainingEnvironment) +
        getInstructionScore(b);
    return bScore - aScore || a.name.localeCompare(b.name);
}

function scoreAiExerciseForMuscle(a: Exercise, b: Exercise, muscle: string, focusMuscles: string[], trainingEnvironment: AiTrainingEnvironment, pickIndex: number) {
    const aScore = getAiMuscleScore(a, muscle, focusMuscles, pickIndex) + getEquipmentScore(a.equipment, trainingEnvironment) + getInstructionScore(a);
    const bScore = getAiMuscleScore(b, muscle, focusMuscles, pickIndex) + getEquipmentScore(b.equipment, trainingEnvironment) + getInstructionScore(b);
    return bScore - aScore || a.name.localeCompare(b.name);
}

function getAiMuscleScore(exercise: Exercise, muscle: string, focusMuscles: string[], pickIndex: number) {
    const groups = exercise.muscle_groups;
    const primary = groups[0];
    const isPrimary = matchesAiPrimaryMuscle(primary, muscle);
    const isTarget = matchesAiMuscle(exercise, muscle);
    const primaryIsSelected = focusMuscles.some((focusMuscle) => matchesAiPrimaryMuscle(primary, focusMuscle));
    const compoundScore = exercise.is_compound ? (pickIndex < focusMuscles.length ? 5 : 1) : 4;
    const isolationBonus = !exercise.is_compound && ['Arms', 'Glutes', 'Core'].includes(muscle) ? 8 : 0;
    const offTargetPrimaryPenalty = primaryIsSelected || primary === 'full_body' ? 0 : -35;

    if (isPrimary) return 40 + compoundScore + isolationBonus;
    if (isTarget) return 20 + compoundScore + offTargetPrimaryPenalty;
    return -100;
}

function getAiMuscleQuotas(focusMuscles: string[], count: number) {
    const baseQuota = Math.floor(count / Math.max(1, focusMuscles.length));
    let remainder = count % Math.max(1, focusMuscles.length);
    return Object.fromEntries(focusMuscles.map((muscle) => {
        const quota = baseQuota + (remainder > 0 ? 1 : 0);
        remainder -= 1;
        return [muscle, quota];
    })) as Record<string, number>;
}

function buildAiMuscleQueue(focusMuscles: string[], quotas: Record<string, number>) {
    const queue: string[] = [];
    const maxQuota = Math.max(...Object.values(quotas), 0);
    for (let index = 0; index < maxQuota; index += 1) {
        focusMuscles.forEach((muscle) => {
            if ((quotas[muscle] ?? 0) > index) queue.push(muscle);
        });
    }
    return queue;
}

function isAllowedAiExerciseForFocus(exercise: Exercise, focusMuscles: string[]) {
    const primary = exercise.muscle_groups[0];
    if (!primary || primary === 'full_body') return true;
    return focusMuscles.some((muscle) => matchesAiPrimaryMuscle(primary, muscle));
}

function matchesAiTrainingEnvironment(exercise: Exercise, trainingEnvironment: AiTrainingEnvironment) {
    const equipment = exercise.equipment;
    if (trainingEnvironment === 'full_gym') return ['machine', 'cable', 'dumbbell', 'barbell', 'kettlebell'].includes(equipment);
    if (trainingEnvironment === 'home') return ['bodyweight', 'none', 'band', 'dumbbell', 'kettlebell'].includes(equipment);
    if (trainingEnvironment === 'dumbbells') return ['dumbbell', 'bodyweight', 'none'].includes(equipment);
    if (trainingEnvironment === 'bodyweight') return ['bodyweight', 'none'].includes(equipment);
    return true;
}

function getEquipmentScore(equipment: string, trainingEnvironment: AiTrainingEnvironment) {
    if (trainingEnvironment === 'full_gym') {
        if (['machine', 'cable'].includes(equipment)) return 8;
        if (['dumbbell', 'barbell'].includes(equipment)) return 7;
        if (equipment === 'kettlebell') return 4;
        if (equipment === 'bodyweight') return 1;
        return 0;
    }
    if (trainingEnvironment === 'home') {
        if (['bodyweight', 'band', 'dumbbell', 'kettlebell'].includes(equipment)) return 7;
        if (equipment === 'none') return 6;
        return 0;
    }
    if (trainingEnvironment === 'dumbbells') {
        if (equipment === 'dumbbell') return 9;
        if (['bodyweight', 'none'].includes(equipment)) return 5;
        return 0;
    }
    if (trainingEnvironment === 'bodyweight') {
        if (['bodyweight', 'none'].includes(equipment)) return 9;
        return 0;
    }
    return 1;
}

function getInstructionScore(exercise: Exercise) {
    return exercise.instructions ? 2 : 0;
}

function matchesAiMuscle(exercise: Exercise, muscle: string) {
    const groups = exercise.muscle_groups;
    switch (muscle) {
        case 'Chest':
            return groups.includes('chest');
        case 'Back':
            return groups.some((group) => ['back', 'lats', 'lower_back', 'traps'].includes(group));
        case 'Shoulders':
            return groups.includes('shoulders');
        case 'Arms':
            return groups.some((group) => ['biceps', 'triceps', 'forearms'].includes(group));
        case 'Legs':
            return groups.some((group) => ['quads', 'hamstrings', 'calves'].includes(group));
        case 'Glutes':
            return groups.includes('glutes');
        case 'Core':
            return groups.some((group) => ['abs', 'obliques'].includes(group));
        default:
            return true;
    }
}

function matchesAiPrimaryMuscle(primary: string | undefined, muscle: string) {
    if (!primary) return false;
    switch (muscle) {
        case 'Chest':
            return primary === 'chest';
        case 'Back':
            return ['back', 'lats', 'lower_back', 'traps'].includes(primary);
        case 'Shoulders':
            return primary === 'shoulders';
        case 'Arms':
            return ['biceps', 'triceps', 'forearms'].includes(primary);
        case 'Legs':
            return ['quads', 'hamstrings', 'calves'].includes(primary);
        case 'Glutes':
            return primary === 'glutes';
        case 'Core':
            return ['abs', 'obliques'].includes(primary);
        default:
            return true;
    }
}

function getAiPrescription(
    workoutType: AiWorkoutType,
    intensity: AiIntensity,
    experienceLevel?: string,
    preferredRestSeconds?: number | null,
) {
    const intensityDefaults: Record<AiIntensity, { sets: number; reps: string; intensityPercent: number; restSeconds: number }> = {
        light: { sets: 2, reps: '12', intensityPercent: 65, restSeconds: 60 },
        moderate: { sets: 3, reps: '10', intensityPercent: 75, restSeconds: 90 },
        hard: { sets: 3, reps: '6', intensityPercent: 85, restSeconds: 120 },
    };
    const base = intensityDefaults[intensity];
    const typeOverrides: Record<AiWorkoutType, Partial<typeof base> & { setType: WorkoutSet['set_type'] }> = {
        progressive_overload: { setType: 'normal', reps: intensity === 'hard' ? '6' : '8' },
        volume: { setType: 'volume', sets: intensity === 'hard' ? 4 : 3, reps: '12', restSeconds: 70, intensityPercent: 70 },
        strength: { setType: 'normal', sets: experienceLevel === 'beginner' ? 3 : 4, reps: '5', restSeconds: 150, intensityPercent: 85 },
        hypertrophy: { setType: 'normal', sets: 3, reps: '10', restSeconds: 75, intensityPercent: 75 },
        conditioning: { setType: 'volume', sets: 3, reps: '15', restSeconds: 45, intensityPercent: 65 },
        low_impact: { setType: 'volume', sets: 3, reps: '12', restSeconds: 40, intensityPercent: 62 },
        yoga_mobility: { setType: 'volume', sets: 2, reps: '8', restSeconds: 25, intensityPercent: 45 },
    };
    const merged = { ...base, ...typeOverrides[workoutType] };
    return {
        ...merged,
        sets: experienceLevel === 'beginner' ? Math.min(merged.sets, 3) : merged.sets,
        restSeconds: preferredRestSeconds ? Math.round((merged.restSeconds + preferredRestSeconds) / 2) : merged.restSeconds,
    };
}

function buildAiPlannedSets({
    setCount,
    reps,
    intensityPercent,
    setType,
    addWarmup,
}: {
    setCount: number;
    reps: string;
    intensityPercent: number;
    setType: WorkoutSet['set_type'];
    addWarmup: boolean;
}) {
    const sets: WorkoutTemplateSet[] = [];
    if (addWarmup) {
        sets.push(createPlannedSet(1, 'warmup', reps, 55));
    }
    for (let index = 0; index < setCount; index += 1) {
        sets.push(createPlannedSet(sets.length + 1, setType, reps, intensityPercent));
    }
    return sets;
}

function getAiExerciseReps(exercise: Exercise, reps: string) {
    if (exercise.muscle_groups.some((group) => ['abs', 'obliques'].includes(group)) && exercise.name.toLowerCase().includes('plank')) {
        return '45';
    }
    return normalizeRepTarget(reps);
}

function getAiExerciseNote(workoutType: AiWorkoutType, goal?: string) {
    if (workoutType === 'progressive_overload') return 'When all sets feel clean, add 1 rep or a small load next time.';
    if (workoutType === 'conditioning') return 'Keep rest honest and move smoothly between paired exercises.';
    if (workoutType === 'low_impact') return 'Move continuously, keep impact low, and scale range of motion as needed.';
    if (workoutType === 'yoga_mobility') return 'Use slow breathing and stay in a pain-free range of motion.';
    if (workoutType === 'strength') return 'Leave one good rep in reserve on most working sets.';
    if (goal === 'lose_fat') return 'Control tempo and keep rest periods consistent.';
    return 'Use clean form and stop the set before technique breaks.';
}

function formatAiGoal(value?: string) {
    return value ? value.replace(/_/g, ' ') : 'general fitness';
}

function formatLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createPlannedSet(
    setNumber: number,
    setType: WorkoutSet['set_type'] = 'normal',
    reps = '10',
    intensityPercent: number | null = 75
): WorkoutTemplateSet {
    return {
        id: generateId(),
        set_number: setNumber,
        set_type: setType,
        target_reps: normalizeRepTarget(reps),
        intensity_percent: intensityPercent,
    };
}

function summarizeReps(sets: WorkoutTemplateSet[]) {
    const reps = Array.from(new Set(sets.map((set) => normalizeRepTarget(set.target_reps)).filter(Boolean)));
    if (reps.length === 0) return '10';
    if (reps.length === 1) return reps[0];
    return reps.join(', ');
}

function normalizeRepTarget(value: string | number | null | undefined) {
    const raw = String(value ?? '').trim();
    if (!raw) return '10';
    const range = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (range) {
        const low = Number(range[1]);
        const high = Number(range[2]);
        return String(Math.max(1, Math.round((low + high) / 2)));
    }
    const firstNumber = raw.match(/\d+/)?.[0];
    if (firstNumber) return String(Math.max(1, Number(firstNumber)));
    return '10';
}

function getRepNumber(value: string) {
    return Number(normalizeRepTarget(value));
}

function adjustRepTarget(value: string, delta: number) {
    return String(Math.max(1, getRepNumber(value) + delta));
}

function matchesBuilderMuscle(exercise: Exercise, filter: (typeof BUILDER_MUSCLE_FILTERS)[number]) {
    const groups = exercise.muscle_groups;
    switch (filter) {
        case 'Chest':
            return groups.includes('chest');
        case 'Back':
            return groups.some((group) => ['back', 'lats', 'lower_back', 'traps'].includes(group));
        case 'Shoulders':
            return groups.includes('shoulders');
        case 'Arms':
            return groups.some((group) => ['biceps', 'triceps', 'forearms'].includes(group));
        case 'Legs':
            return groups.some((group) => ['quads', 'hamstrings', 'calves'].includes(group));
        case 'Core':
            return groups.some((group) => ['abs', 'obliques'].includes(group));
        case 'Glutes':
            return groups.includes('glutes');
        default:
            return true;
    }
}

function matchesBuilderEquipment(exercise: Exercise, filter: (typeof BUILDER_EQUIPMENT_FILTERS)[number]) {
    switch (filter) {
        case 'Home':
            return ['bodyweight', 'none', 'band', 'dumbbell', 'kettlebell'].includes(exercise.equipment);
        case 'Calisthenics':
            return exercise.equipment === 'bodyweight' || exercise.category === 'bodyweight';
        case 'Barbell':
            return exercise.equipment === 'barbell';
        case 'Dumbbell':
            return exercise.equipment === 'dumbbell';
        case 'Cable':
            return exercise.equipment === 'cable';
        case 'Machine':
            return exercise.equipment === 'machine';
        case 'Band':
            return exercise.equipment === 'band';
        case 'Kettlebell':
            return exercise.equipment === 'kettlebell';
        default:
            return true;
    }
}

const SET_TYPE_ORDER: WorkoutSet['set_type'][] = ['normal', 'warmup', 'volume', 'failure', 'drop'];

const SET_TYPE_DISPLAY: Record<WorkoutSet['set_type'], { emoji: string; label: string }> = {
    normal: { emoji: '💪', label: 'Work' },
    warmup: { emoji: '🔥', label: 'Warm' },
    volume: { emoji: '📈', label: 'Volume' },
    failure: { emoji: '⚡', label: 'Fail' },
    drop: { emoji: '⬇️', label: 'Drop' },
};

function getNextSetType(current: WorkoutSet['set_type']) {
    const index = SET_TYPE_ORDER.indexOf(current);
    return SET_TYPE_ORDER[(index + 1) % SET_TYPE_ORDER.length];
}

function getSetTypeDisplay(type: WorkoutSet['set_type']) {
    return SET_TYPE_DISPLAY[type];
}

function getTemplateIcon(category: WorkoutCategory): keyof typeof Ionicons.glyphMap {
    switch (category) {
        case 'Popular':
            return 'flame';
        case 'Split Workouts':
            return 'git-branch';
        case 'Full-body':
            return 'body';
        case 'Calisthenics':
            return 'accessibility';
        case 'Home Workout':
            return 'home';
        case 'Yoga':
            return 'leaf';
        case 'HIIT':
            return 'flash';
        case 'Glutes & Core':
            return 'fitness';
        case 'Mobility':
            return 'body-outline';
        default:
            return 'barbell';
    }
}

function BuilderNumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <View style={styles.builderField}>
            <Text style={styles.builderFieldLabel}>{label}</Text>
            <TextInput
                value={String(value)}
                onChangeText={(text) => onChange(Number(text.replace(/[^0-9]/g, '')) || 0)}
                keyboardType="number-pad"
                style={styles.builderFieldInput}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
            />
        </View>
    );
}

function RepStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const numericValue = normalizeRepTarget(value);

    return (
        <View style={styles.repStepper}>
            <TouchableOpacity
                style={styles.repStepperButton}
                onPress={() => onChange(adjustRepTarget(value, -1))}
                accessibilityLabel="Decrease reps"
            >
                <Ionicons name="remove" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
                value={numericValue}
                onChangeText={(text) => onChange(normalizeRepTarget(text))}
                keyboardType="number-pad"
                style={styles.repStepperInput}
                placeholder="10"
                placeholderTextColor={Colors.textTertiary}
                selectTextOnFocus
            />
            <TouchableOpacity
                style={styles.repStepperButton}
                onPress={() => onChange(adjustRepTarget(value, 1))}
                accessibilityLabel="Increase reps"
            >
                <Ionicons name="add" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
}

function BuilderTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <View style={styles.builderField}>
            <Text style={styles.builderFieldLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                style={styles.builderFieldInput}
                placeholder="10"
                placeholderTextColor={Colors.textTertiary}
            />
        </View>
    );
}

function DetailPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
    const { colors } = useTheme();

    return (
        <View style={styles.detailPill}>
            <Ionicons name={icon} size={14} color={colors.primary} />
            <Text style={styles.detailPillText}>{label}</Text>
        </View>
    );
}

function HistoryInsightStat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.historyInsightStat, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.historyInsightStatValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.historyInsightStatLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function WorkoutHistoryCard({
    workout,
    unitSystem,
    colors,
}: {
    workout: WorkoutSession;
    unitSystem?: 'metric' | 'imperial' | null;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const topMuscles = getWorkoutTopMuscles(workout, 3);
    const prCount = getWorkoutPrCount(workout);
    const setCount = getWorkoutSetCount(workout);
    const exercisePreview = workout.exercises.slice(0, 3).map((entry) => entry.exercise?.name).filter(Boolean);
    const duration = getWorkoutDurationSeconds(workout);

    return (
        <Card style={{ ...styles.historyCard, backgroundColor: colors.surface, borderColor: colors.border }}>
            <View style={styles.historyHeader}>
                <View style={styles.historyTitleBlock}>
                    <Text style={[styles.historyName, { color: colors.text }]} numberOfLines={1}>{workout.name}</Text>
                    <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                        {formatWorkoutDate(workout.completed_at ?? workout.started_at)}
                    </Text>
                </View>
                {prCount > 0 ? (
                    <View style={[styles.historyPrBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
                        <Ionicons name="trophy" size={13} color={colors.primary} />
                        <Text style={[styles.historyPrText, { color: colors.primary }]}>{prCount} PR</Text>
                    </View>
                ) : (
                    <View style={[styles.historyPrBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.textTertiary} />
                        <Text style={[styles.historyMutedBadgeText, { color: colors.textTertiary }]}>Logged</Text>
                    </View>
                )}
            </View>

            <View style={styles.historyStats}>
                <HistoryMetric label="Volume" value={formatVolume(workout.total_volume_kg, unitSystem)} colors={colors} />
                <HistoryMetric label="Sets" value={`${setCount}`} colors={colors} />
                <HistoryMetric label="Duration" value={formatDurationLong(duration)} colors={colors} />
            </View>

            {exercisePreview.length > 0 && (
                <View style={[styles.historyPreview, { borderTopColor: colors.border }]}>
                    <Ionicons name="barbell-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.historyPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {exercisePreview.join(' · ')}
                    </Text>
                </View>
            )}

            {topMuscles.length > 0 && (
                <View style={styles.historyMuscleChips}>
                    {topMuscles.map((muscle) => (
                        <View key={muscle.muscle} style={[styles.historyMuscleChip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '22' }]}>
                            <Text style={[styles.historyMuscleChipText, { color: colors.textSecondary }]}>
                                {formatMuscle(muscle.muscle)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </Card>
    );
}

function HistoryMetric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.historyMetric, { backgroundColor: colors.background }]}>
            <Text style={[styles.historyStatValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.historyStatLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function formatWorkoutDate(value: string) {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
        date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
    keyboardAvoidingRoot: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ctaContainer: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    tabTextActive: {
        color: Colors.text,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.xs,
    },
    sectionSubtitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginBottom: Spacing.lg,
    },

    // Templates
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    createSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    createSmallButtonText: {
        color: Colors.textInverse,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    templateIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary + '18',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },
    templateInfo: {
        flex: 1,
    },
    templateActions: {
        alignItems: 'center',
        gap: Spacing.sm,
    },
    templateIconButton: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templatePlayButton: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.24,
        shadowRadius: 12,
    },
    templateName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    templateDesc: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    templateMeta: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: Spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    createTemplate: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        marginTop: Spacing.sm,
    },
    createTemplateText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    aiWorkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '3D',
    },
    aiWorkoutIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiWorkoutCopy: {
        flex: 1,
    },
    aiWorkoutTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    aiWorkoutText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 2,
    },
    createWorkoutContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.huge,
        gap: Spacing.md,
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    createInput: {
        color: Colors.text,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
    },
    createTextArea: {
        minHeight: 92,
        textAlignVertical: 'top',
    },
    createCategoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    createCategoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    createCategoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    createCategoryText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    createCategoryTextActive: {
        color: Colors.textInverse,
    },
    visibilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: Spacing.sm,
    },
    visibilityTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    visibilityText: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 3,
        maxWidth: 280,
    },
    aiModalHero: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    aiModalTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
        lineHeight: 25,
    },
    aiModalText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginTop: Spacing.xs,
    },
    aiOptionStack: {
        gap: Spacing.sm,
    },
    aiOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    aiOptionRowActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '12',
    },
    aiOptionTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    aiOptionTitleActive: {
        color: Colors.primary,
    },
    aiOptionText: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 2,
    },
    aiDurationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    aiDurationChip: {
        minWidth: 82,
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    aiDurationChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    aiDurationText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    aiDurationTextActive: {
        color: Colors.textInverse,
    },
    saveTemplateButton: {
        minWidth: 58,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    saveTemplateButtonDisabled: {
        opacity: 0.35,
    },
    saveTemplateButtonText: {
        color: Colors.textInverse,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    builderSummary: {
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    builderBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
    },
    builderBackText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    builderTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    builderSubtext: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    builderSearchResults: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginTop: -Spacing.sm,
    },
    builderSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    builderSearchName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    builderSearchMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    builderFilterLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        marginBottom: -Spacing.xs,
    },
    builderFilterScroll: {
        marginBottom: Spacing.xs,
    },
    builderFilterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    builderFilterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    builderFilterText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    builderFilterTextActive: {
        color: Colors.textInverse,
    },
    builderPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    builderPickerTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    builderPickerCount: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    builderVisualPicker: {
        marginHorizontal: -Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xs,
    },
    builderExerciseOption: {
        width: 150,
        marginRight: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.sm,
    },
    builderExerciseOptionImageWrap: {
        height: 112,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    builderExerciseOptionImage: {
        width: '100%',
        height: '100%',
    },
    builderExerciseAddBadge: {
        position: 'absolute',
        right: 7,
        bottom: 7,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    builderExerciseOptionName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        lineHeight: 17,
        fontWeight: FontWeight.bold,
        minHeight: 34,
    },
    builderExerciseOptionMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 3,
    },
    builderEmpty: {
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.huge,
    },
    builderExerciseCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    builderExerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    builderExerciseName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    builderExerciseMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    exerciseRestRow: {
        maxWidth: 220,
    },
    builderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    builderField: {
        minWidth: 150,
        flexGrow: 1,
        gap: 6,
    },
    builderFieldLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
    },
    builderFieldInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    builderMiniLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        marginBottom: -Spacing.xs,
    },
    setTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    setTableHeaderText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
    },
    setPlanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    setPlanNumber: {
        width: 36,
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        textAlign: 'center',
    },
    setTypeIconButton: {
        width: 70,
        minHeight: 58,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    setTypeEmoji: {
        fontSize: 18,
        lineHeight: 22,
    },
    setTypeIconLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        marginTop: 1,
    },
    setPlanInput: {
        flex: 1,
        minWidth: 58,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        textAlign: 'center',
    },
    repStepper: {
        flex: 1,
        minWidth: 106,
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    repStepperButton: {
        width: 32,
        minHeight: 38,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },
    repStepperInput: {
        flex: 1,
        minWidth: 36,
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        paddingHorizontal: 4,
        paddingVertical: Spacing.sm,
        textAlign: 'center',
    },
    setPlanDelete: {
        width: 30,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addSetRowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        borderStyle: 'dashed',
    },
    addSetRowText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    setTypeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    setTypeChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    setTypeChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    setTypeText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    setTypeTextActive: {
        color: Colors.textInverse,
    },

    // History
    historyInsightCard: {
        marginBottom: Spacing.md,
        borderWidth: 1,
    },
    historyInsightHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    historyInsightCopy: {
        flex: 1,
    },
    historyInsightEyebrow: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    historyInsightTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginTop: Spacing.xs,
        lineHeight: 31,
    },
    historyInsightBody: {
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginTop: Spacing.sm,
    },
    historyTrendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    historyTrendText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    historyInsightStats: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    historyInsightStat: {
        flex: 1,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: Spacing.md,
    },
    historyInsightStatValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    historyInsightStatLabel: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    historyCard: {
        marginBottom: Spacing.md,
        borderWidth: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    historyTitleBlock: {
        flex: 1,
    },
    historyName: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    historyDate: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    historyPrBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    historyPrText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    historyMutedBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    historyStats: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    historyMetric: {
        flex: 1,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    historyStatValue: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    historyStatLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    historyPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderTopWidth: 1,
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
    },
    historyPreviewText: {
        flex: 1,
        fontSize: FontSize.sm,
    },
    historyMuscleChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    historyMuscleChip: {
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    historyMuscleChipText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },

    // Exercises
    directoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '18',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
    },
    sourceBadgeText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginVertical: Spacing.md,
    },
    searchInput: {
        flex: 1,
        color: Colors.text,
        fontSize: FontSize.md,
        padding: 0,
    },
    searchPlaceholder: {
        color: Colors.textTertiary,
        fontSize: FontSize.md,
    },
    chipScroll: {
        marginBottom: Spacing.lg,
    },
    chip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    chipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    chipTextActive: {
        color: Colors.textInverse,
    },
    directoryLoading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.huge,
        gap: Spacing.md,
    },
    directoryLoadingText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
    directoryError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: '#EF444414',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#EF444440',
    },
    directoryErrorTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    directoryErrorText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    directoryCount: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginBottom: Spacing.md,
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
    },
    exerciseThumbWrap: {
        width: 70,
        height: 70,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    exerciseThumb: {
        width: '100%',
        height: '100%',
    },
    exerciseEmoji: {
        fontSize: 24,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    exerciseMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    exerciseTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    exerciseTag: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceElevated,
        overflow: 'hidden',
    },
    detailContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    detailClose: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },
    detailHeaderTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    detailContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.huge,
    },
    detailHero: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    detailImage: {
        flex: 1,
        height: 210,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    detailTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        lineHeight: 31,
        fontWeight: FontWeight.heavy,
        marginBottom: Spacing.md,
    },
    detailMetaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    detailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '18',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
    },
    detailPillText: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    detailSectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },
    instructionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    instructionNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.primary,
        color: Colors.textInverse,
        textAlign: 'center',
        lineHeight: 26,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        overflow: 'hidden',
    },
    instructionText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
    },
    sourceText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: Spacing.lg,
        lineHeight: 17,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.huge,
        gap: Spacing.md,
    },
    emptyTitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },
    emptySubtext: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },

    // Quick actions
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 4,
    },
    quickActionText: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
    },

    // Deload banner
    deloadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: '#FEF3C7',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    deloadBannerText: { flex: 1 },
    deloadBannerTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: '#92400E',
    },
    deloadBannerSubtext: {
        fontSize: FontSize.xs,
        color: '#A16207',
        marginTop: 1,
    },
});
