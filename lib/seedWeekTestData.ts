import { saveFoodLog, saveRecoveryLog, saveWaterLog, saveWeightEntry, saveWorkoutSession } from '@/lib/db';
import { getLocalDateKey, getRecentLocalDateKeys } from '@/lib/date';
import { buildNutritionSummary } from '@/lib/nutritionSummary';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { Exercise, FoodItem, FoodLogEntry, MealType, RecoveryLog, WaterLog, WeightEntry, WorkoutSession } from '@/types';

const TEST_TAG = '[BodyPilot 7-day simulator seed]';

function atLocalTime(dateKey: string, hour: number, minute = 0): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function calculateRecoveryScore(log: Partial<RecoveryLog>): number {
    let score = 50;
    if (log.sleep_hours) score += log.sleep_hours >= 7.5 ? 20 : log.sleep_hours >= 6.5 ? 10 : -10;
    if (log.sleep_quality) score += (log.sleep_quality - 3) * 5;
    if (log.soreness_level !== undefined) score -= log.soreness_level * 4;
    if (log.stress_level) score -= (log.stress_level - 3) * 5;
    if (log.energy_level) score += (log.energy_level - 3) * 5;
    if (log.mood) score += (log.mood - 3) * 3;
    if (log.resting_hr) score += log.resting_hr < 60 ? 10 : log.resting_hr < 70 ? 5 : log.resting_hr > 80 ? -5 : 0;
    return Math.max(0, Math.min(100, Math.round(score)));
}

const foods: FoodItem[] = [
    { id: '10000000-0000-4000-8000-000000000101', name: 'Protein oats', brand: 'BodyPilot Test', barcode: null, serving_size_g: 320, serving_unit: 'bowl', calories: 430, protein_g: 34, carbs_g: 52, fat_g: 10, fiber_g: 8, sugar_g: 11, sodium_mg: 180, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000102', name: 'Greek yogurt berries', brand: 'BodyPilot Test', barcode: null, serving_size_g: 250, serving_unit: 'bowl', calories: 260, protein_g: 28, carbs_g: 26, fat_g: 4, fiber_g: 5, sugar_g: 18, sodium_mg: 85, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000103', name: 'Chicken rice bowl', brand: 'BodyPilot Test', barcode: null, serving_size_g: 460, serving_unit: 'bowl', calories: 620, protein_g: 51, carbs_g: 71, fat_g: 13, fiber_g: 6, sugar_g: 5, sodium_mg: 720, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000104', name: 'Turkey avocado wrap', brand: 'BodyPilot Test', barcode: null, serving_size_g: 260, serving_unit: 'wrap', calories: 510, protein_g: 38, carbs_g: 48, fat_g: 18, fiber_g: 7, sugar_g: 4, sodium_mg: 820, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000105', name: 'Salmon sweet potato plate', brand: 'BodyPilot Test', barcode: null, serving_size_g: 430, serving_unit: 'plate', calories: 690, protein_g: 46, carbs_g: 58, fat_g: 28, fiber_g: 9, sugar_g: 8, sodium_mg: 520, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000106', name: 'Lean beef pasta', brand: 'BodyPilot Test', barcode: null, serving_size_g: 420, serving_unit: 'plate', calories: 740, protein_g: 48, carbs_g: 82, fat_g: 22, fiber_g: 7, sugar_g: 9, sodium_mg: 760, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000107', name: 'Protein smoothie', brand: 'BodyPilot Test', barcode: null, serving_size_g: 450, serving_unit: 'shake', calories: 360, protein_g: 42, carbs_g: 34, fat_g: 6, fiber_g: 4, sugar_g: 20, sodium_mg: 190, is_custom: true, user_id: null, image_url: null },
    { id: '10000000-0000-4000-8000-000000000108', name: 'Cottage cheese toast', brand: 'BodyPilot Test', barcode: null, serving_size_g: 220, serving_unit: 'plate', calories: 330, protein_g: 31, carbs_g: 35, fat_g: 8, fiber_g: 5, sugar_g: 6, sodium_mg: 560, is_custom: true, user_id: null, image_url: null },
];

const fallbackExercises: Exercise[] = [
    { id: '20000000-0000-4000-8000-000000000101', name: 'Bench Press', category: 'barbell', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'barbell', instructions: 'Press from chest to lockout.', tips: 'Keep shoulder blades set.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '20000000-0000-4000-8000-000000000102', name: 'Barbell Row', category: 'barbell', muscle_groups: ['back', 'biceps'], equipment: 'barbell', instructions: 'Row bar to lower ribs.', tips: 'Brace and keep torso stable.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '20000000-0000-4000-8000-000000000103', name: 'Back Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'barbell', instructions: 'Squat to depth and stand tall.', tips: 'Drive knees over toes.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '20000000-0000-4000-8000-000000000104', name: 'Romanian Deadlift', category: 'barbell', muscle_groups: ['hamstrings', 'glutes', 'back'], equipment: 'barbell', instructions: 'Hinge at hips with a neutral spine.', tips: 'Feel hamstrings stretch.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '20000000-0000-4000-8000-000000000105', name: 'Overhead Press', category: 'barbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', instructions: 'Press overhead from shoulders.', tips: 'Stack ribs over hips.', image_url: null, is_compound: true, is_custom: false, user_id: null },
];

const mealPlan: Array<{ meal: MealType; foodIndex: number; hour: number; serving: number }> = [
    { meal: 'breakfast', foodIndex: 0, hour: 8, serving: 1 },
    { meal: 'lunch', foodIndex: 2, hour: 13, serving: 1 },
    { meal: 'dinner', foodIndex: 4, hour: 19, serving: 1 },
    { meal: 'snack', foodIndex: 6, hour: 16, serving: 1 },
];

function buildFoodLogs(dateKey: string, dayIndex: number): FoodLogEntry[] {
    return mealPlan.map((meal, index) => {
        const food = foods[(meal.foodIndex + dayIndex + index) % foods.length];
        const servings = meal.serving + (dayIndex % 3 === 0 && meal.meal === 'dinner' ? 0.15 : 0);
        return {
            id: generateId(),
            user_id: '',
            food_item_id: food.id,
            food_item: food,
            meal_type: meal.meal,
            servings,
            logged_at: atLocalTime(dateKey, meal.hour, index * 7),
            calories: Math.round(food.calories * servings),
            protein_g: Math.round(food.protein_g * servings * 10) / 10,
            carbs_g: Math.round(food.carbs_g * servings * 10) / 10,
            fat_g: Math.round(food.fat_g * servings * 10) / 10,
            notes: TEST_TAG,
            photo_uri: null,
        };
    });
}

function buildWaterLogs(dateKey: string, dayIndex: number): WaterLog[] {
    const count = 8 + (dayIndex % 3);
    return Array.from({ length: count }, (_, index) => ({
        id: generateId(),
        user_id: '',
        amount_ml: 300,
        logged_at: atLocalTime(dateKey, 9 + Math.min(index, 10), (index * 11) % 60),
    }));
}

function buildWorkout(dateKey: string, dayIndex: number, exercises: Exercise[]): WorkoutSession | null {
    if (![0, 1, 3, 5, 6].includes(dayIndex)) return null;
    const names = ['Push Strength', 'Pull Hypertrophy', 'Lower Strength', 'Upper Volume', 'Full Body Conditioning'];
    const selected = [
        exercises[dayIndex % exercises.length],
        exercises[(dayIndex + 1) % exercises.length],
        exercises[(dayIndex + 2) % exercises.length],
    ];
    const startedAt = atLocalTime(dateKey, 17, 30);
    const completedAt = atLocalTime(dateKey, 18, 24 + (dayIndex % 3) * 8);
    const sessionExercises = selected.map((exercise, exerciseIndex) => {
        const baseWeight = 45 + dayIndex * 3 + exerciseIndex * 12;
        return {
            id: generateId(),
            exercise_id: exercise.id,
            exercise,
            order: exerciseIndex,
            sets: Array.from({ length: 3 }, (_, setIndex) => {
                const reps = 8 + ((dayIndex + setIndex) % 5);
                const weight = Math.round((baseWeight + setIndex * 2.5) * 10) / 10;
                return {
                    id: generateId(),
                    set_number: setIndex + 1,
                    set_type: setIndex === 0 ? 'warmup' as const : 'normal' as const,
                    reps,
                    weight_kg: weight,
                    duration_seconds: null,
                    distance_meters: null,
                    rpe: 7 + (setIndex % 3),
                    is_pr: dayIndex === 6 && exerciseIndex === 0 && setIndex === 2,
                    completed: true,
                };
            }),
        };
    });
    const totalVolume = sessionExercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0), 0), 0);

    return {
        id: generateId(),
        user_id: '',
        template_id: null,
        name: names[dayIndex % names.length],
        started_at: startedAt,
        completed_at: completedAt,
        duration_seconds: Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000),
        total_volume_kg: Math.round(totalVolume),
        notes: TEST_TAG,
        mood: (3 + (dayIndex % 3)) as 3 | 4 | 5,
        exercises: sessionExercises,
        workout_mode: dayIndex === 6 ? 'circuit' : 'standard',
        superset_groups: [],
    };
}

function buildRecovery(dateKey: string, dayIndex: number): RecoveryLog {
    const log: RecoveryLog = {
        id: generateId(),
        user_id: '',
        date: dateKey,
        sleep_hours: Math.round((6.6 + (dayIndex % 4) * 0.35) * 10) / 10,
        sleep_quality: (3 + (dayIndex % 3)) as 3 | 4 | 5,
        soreness_level: (dayIndex % 4) as 0 | 1 | 2 | 3,
        sore_body_parts: dayIndex % 2 === 0 ? ['quads'] : ['back', 'shoulders'],
        stress_level: (2 + (dayIndex % 3)) as 2 | 3 | 4,
        energy_level: (3 + (dayIndex % 3)) as 3 | 4 | 5,
        mood: (3 + (dayIndex % 3)) as 3 | 4 | 5,
        resting_hr: 61 + dayIndex,
        hrv: 52 - dayIndex + (dayIndex % 2) * 4,
        recovery_score: 0,
        notes: TEST_TAG,
    };
    return { ...log, recovery_score: calculateRecoveryScore(log) };
}

function buildWeight(dateKey: string, dayIndex: number): WeightEntry {
    return {
        id: generateId(),
        user_id: '',
        weight_kg: Math.round((78.6 - dayIndex * 0.12 + (dayIndex % 2) * 0.08) * 10) / 10,
        body_fat_pct: Math.round((18.4 - dayIndex * 0.04) * 10) / 10,
        logged_at: atLocalTime(dateKey, 7, 15),
        notes: TEST_TAG,
    };
}

export async function seedSevenDayTestData() {
    const dateKeys = getRecentLocalDateKeys(7);
    const exercisePool = useWorkoutStore.getState().exercises.length
        ? useWorkoutStore.getState().exercises
        : fallbackExercises;

    const allFoodLogs: FoodLogEntry[] = [];
    const todayWaterLogs: WaterLog[] = [];
    const summaries = dateKeys.map((dateKey, dayIndex) => {
        const foodLogs = buildFoodLogs(dateKey, dayIndex);
        const waterLogs = buildWaterLogs(dateKey, dayIndex);
        allFoodLogs.push(...foodLogs);
        if (dateKey === getLocalDateKey()) todayWaterLogs.push(...waterLogs);
        return buildNutritionSummary(dateKey, foodLogs, waterLogs);
    });

    const todaySummary = summaries[summaries.length - 1];
    useNutritionStore.setState((state) => ({
        todaySummary,
        waterLogs: todayWaterLogs,
        nutritionHistory: [
            ...state.nutritionHistory.filter((summary) => !dateKeys.includes(summary.date)),
            ...summaries,
        ].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
        recentFoods: foods.slice(0, 6),
    }));

    const workouts = dateKeys
        .map((dateKey, dayIndex) => buildWorkout(dateKey, dayIndex, exercisePool))
        .filter(Boolean) as WorkoutSession[];
    useWorkoutStore.setState((state) => ({
        recentWorkouts: [
            ...workouts.reverse(),
            ...state.recentWorkouts.filter((workout) => workout.notes !== TEST_TAG),
        ].slice(0, 20),
        exercises: state.exercises.length ? state.exercises : fallbackExercises,
    }));

    const weights = dateKeys.map(buildWeight).reverse();
    useProgressStore.setState((state) => ({
        weightEntries: [
            ...weights,
            ...state.weightEntries.filter((entry) => entry.notes !== TEST_TAG),
        ].slice(0, 50),
    }));

    const recoveryLogs = dateKeys.map(buildRecovery).reverse();
    useRecoveryStore.setState((state) => ({
        recoveryLogs: [
            ...recoveryLogs,
            ...state.recoveryLogs.filter((entry) => entry.notes !== TEST_TAG),
        ],
        todayRecovery: recoveryLogs.find((entry) => entry.date === getLocalDateKey()) || state.todayRecovery,
    }));

    await Promise.allSettled([
        ...allFoodLogs.map((log) => saveFoodLog(log)),
        ...dateKeys.flatMap((dateKey, dayIndex) => buildWaterLogs(dateKey, dayIndex).map((log) => saveWaterLog(log))),
        ...workouts.map((workout) => saveWorkoutSession(workout)),
        ...weights.map((weight) => saveWeightEntry(weight)),
        ...recoveryLogs.map((log) => saveRecoveryLog(log)),
    ]);

    return {
        days: dateKeys.length,
        meals: allFoodLogs.length,
        workouts: workouts.length,
        caloriesToday: todaySummary.total_calories,
    };
}
