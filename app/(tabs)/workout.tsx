import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { saveWorkoutTemplate } from '@/lib/db';
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
};

type WorkoutCategory = 'Popular' | 'Split Workouts' | 'Full-body' | 'Calisthenics' | 'Home Workout';

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

const WORKOUT_CATEGORIES: ('All' | WorkoutCategory | 'Mine')[] = [
    'All',
    'Popular',
    'Split Workouts',
    'Full-body',
    'Calisthenics',
    'Home Workout',
    'Mine',
];

const BUILDER_MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes'] as const;
const BUILDER_EQUIPMENT_FILTERS = ['All', 'Home', 'Calisthenics', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Band', 'Kettlebell'] as const;
const FULL_LIBRARY_MIN_EXERCISES = 100;

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

    React.useEffect(() => {
        if (activeTab === 'exercises' || showCreateWorkout) {
            loadExerciseDirectory();
        }
    }, [activeTab, loadExerciseDirectory, showCreateWorkout]);

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

                        {filteredWorkoutTemplates.map((template) => (
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
                                <TouchableOpacity
                                    style={[styles.templatePlayButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                                    onPress={() => startTemplateWorkout(template)}
                                    hitSlop={10}
                                >
                                    <Ionicons name="play" size={20} color={colors.textInverse} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}

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
                    <View style={styles.detailContainer}>
                    <View style={[styles.detailHeader, { paddingTop: insets.top + Spacing.sm }]}>
                        <TouchableOpacity style={styles.detailClose} onPress={resetBuilder}>
                            <Ionicons name="close" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>
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
                                <Text style={styles.inputLabel}>Workout name</Text>
                                <TextInput
                                    value={customWorkoutName}
                                    onChangeText={setCustomWorkoutName}
                                    placeholder="Upper Strength, Hotel Full Body..."
                                    placeholderTextColor={Colors.textTertiary}
                                    style={styles.createInput}
                                />
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    value={customWorkoutDescription}
                                    onChangeText={setCustomWorkoutDescription}
                                    placeholder="What is this workout for?"
                                    placeholderTextColor={Colors.textTertiary}
                                    style={[styles.createInput, styles.createTextArea]}
                                    multiline
                                />
                                <Text style={styles.inputLabel}>Category</Text>
                                <View style={styles.createCategoryGrid}>
                                    {WORKOUT_CATEGORIES.filter((category): category is WorkoutCategory => category !== 'All' && category !== 'Mine').map((category) => (
                                        <TouchableOpacity
                                            key={category}
                                            style={[
                                                styles.createCategoryChip,
                                                customWorkoutCategory === category && styles.createCategoryChipActive,
                                            ]}
                                            onPress={() => setCustomWorkoutCategory(category)}
                                        >
                                            <Text
                                                style={[
                                                    styles.createCategoryText,
                                                    customWorkoutCategory === category && styles.createCategoryTextActive,
                                                ]}
                                            >
                                                {category}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={styles.visibilityRow}
                                    onPress={() => setCustomWorkoutPublic((value) => !value)}
                                >
                                    <View>
                                        <Text style={styles.visibilityTitle}>
                                            {customWorkoutPublic ? 'Public workout' : 'Private workout'}
                                        </Text>
                                        <Text style={styles.visibilityText}>
                                            {customWorkoutPublic
                                                ? 'Other BodyPilot users can discover this template later.'
                                                : 'Only you can see and use this template.'}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={customWorkoutPublic ? 'earth' : 'lock-closed'}
                                        size={24}
                                        color={customWorkoutPublic ? colors.primary : Colors.textTertiary}
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
                                    <Text style={styles.builderTitle}>{customWorkoutName}</Text>
                                    <Text style={styles.builderSubtext}>
                                        Add movements, then configure sets, reps, intensity, warmups, volume work, and supersets.
                                    </Text>
                                </View>

                                <View style={styles.searchBar}>
                                    <Ionicons name="search" size={20} color={Colors.textTertiary} />
                                    <TextInput
                                        value={builderExerciseQuery}
                                        onChangeText={setBuilderExerciseQuery}
                                        placeholder="Search exercises to add..."
                                        placeholderTextColor={Colors.textTertiary}
                                        style={styles.searchInput}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <Text style={styles.builderFilterLabel}>Muscle group</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.builderFilterScroll}>
                                    {BUILDER_MUSCLE_FILTERS.map((filter) => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[styles.builderFilterChip, builderMuscleFilter === filter && styles.builderFilterChipActive]}
                                            onPress={() => setBuilderMuscleFilter(filter)}
                                        >
                                            <Text style={[styles.builderFilterText, builderMuscleFilter === filter && styles.builderFilterTextActive]}>
                                                {filter}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.builderFilterLabel}>Equipment / style</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.builderFilterScroll}>
                                    {BUILDER_EQUIPMENT_FILTERS.map((filter) => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[styles.builderFilterChip, builderEquipmentFilter === filter && styles.builderFilterChipActive]}
                                            onPress={() => setBuilderEquipmentFilter(filter)}
                                        >
                                            <Text style={[styles.builderFilterText, builderEquipmentFilter === filter && styles.builderFilterTextActive]}>
                                                {filter}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.builderPickerHeader}>
                                    <Text style={styles.builderPickerTitle}>Add Exercise</Text>
                                    <Text style={styles.builderPickerCount}>{builderExerciseOptions.length} results</Text>
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
