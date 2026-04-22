// ============================================================
// FitFusion Type Definitions
// ============================================================

// ── User & Auth ──────────────────────────────────────────────

export interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    date_of_birth: string | null;
    gender: 'male' | 'female' | 'other' | null;
    height_cm: number | null;
    current_weight_kg: number | null;
    activity_level: ActivityLevel;
    goal: FitnessGoal;
    experience_level: ExperienceLevel;
    daily_calorie_target: number;
    protein_target_g: number;
    carbs_target_g: number;
    fat_target_g: number;
    water_goal_ml: number;
    unit_system: 'metric' | 'imperial';
    created_at: string;
    updated_at: string;
    streak_count: number;
    xp: number;
    level: number;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp' | 'strength' | 'endurance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

// ── Workouts ─────────────────────────────────────────────────

export interface Exercise {
    id: string;
    name: string;
    category: ExerciseCategory;
    muscle_groups: MuscleGroup[];
    equipment: Equipment;
    instructions: string;
    tips: string | null;
    image_url: string | null;
    is_compound: boolean;
    is_custom: boolean;
    user_id: string | null;
}

export type ExerciseCategory =
    | 'barbell'
    | 'dumbbell'
    | 'machine'
    | 'cable'
    | 'bodyweight'
    | 'cardio'
    | 'stretching'
    | 'other';

export type MuscleGroup =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'forearms'
    | 'quads'
    | 'hamstrings'
    | 'glutes'
    | 'calves'
    | 'abs'
    | 'obliques'
    | 'traps'
    | 'lats'
    | 'lower_back'
    | 'full_body';

export type Equipment =
    | 'barbell'
    | 'dumbbell'
    | 'machine'
    | 'cable'
    | 'bodyweight'
    | 'kettlebell'
    | 'band'
    | 'other'
    | 'none';

export interface WorkoutTemplate {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    exercises: WorkoutTemplateExercise[];
    estimated_duration_min: number;
    category: string;
    is_public: boolean;
    created_at: string;
}

export interface WorkoutTemplateExercise {
    exercise_id: string;
    exercise: Exercise;
    order: number;
    target_sets: number;
    target_reps: string; // e.g., "8-12" or "5"
    target_weight_kg: number | null;
    rest_seconds: number;
    notes: string | null;
}

export interface WorkoutSession {
    id: string;
    user_id: string;
    template_id: string | null;
    name: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    total_volume_kg: number;
    notes: string | null;
    mood: 1 | 2 | 3 | 4 | 5 | null;
    exercises: WorkoutSessionExercise[];
}

export interface WorkoutSessionExercise {
    id: string;
    exercise_id: string;
    exercise: Exercise;
    order: number;
    sets: WorkoutSet[];
}

export interface WorkoutSet {
    id: string;
    set_number: number;
    set_type: 'normal' | 'warmup' | 'drop' | 'failure';
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    distance_meters: number | null;
    rpe: number | null; // Rate of Perceived Exertion 1-10
    is_pr: boolean;
    completed: boolean;
}

export interface PersonalRecord {
    id: string;
    user_id: string;
    exercise_id: string;
    exercise_name: string;
    weight_kg: number;
    reps: number;
    estimated_1rm_kg: number;
    achieved_at: string;
}

// ── Nutrition ────────────────────────────────────────────────

export interface FoodItem {
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    serving_size_g: number;
    serving_unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
    is_custom: boolean;
    user_id: string | null;
    image_url: string | null;
}

export interface FoodLogEntry {
    id: string;
    user_id: string;
    food_item_id: string;
    food_item: FoodItem;
    meal_type: MealType;
    servings: number;
    logged_at: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    notes: string | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyNutritionSummary {
    date: string;
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    total_fiber_g: number;
    water_ml: number;
    meals: {
        breakfast: FoodLogEntry[];
        lunch: FoodLogEntry[];
        dinner: FoodLogEntry[];
        snack: FoodLogEntry[];
    };
}

export interface WaterLog {
    id: string;
    user_id: string;
    amount_ml: number;
    logged_at: string;
}

// ── Body & Progress ──────────────────────────────────────────

export interface WeightEntry {
    id: string;
    user_id: string;
    weight_kg: number;
    body_fat_pct: number | null;
    logged_at: string;
    notes: string | null;
}

export interface BodyMeasurement {
    id: string;
    user_id: string;
    logged_at: string;
    chest_cm: number | null;
    waist_cm: number | null;
    hips_cm: number | null;
    left_arm_cm: number | null;
    right_arm_cm: number | null;
    left_thigh_cm: number | null;
    right_thigh_cm: number | null;
    left_calf_cm: number | null;
    right_calf_cm: number | null;
    neck_cm: number | null;
    shoulders_cm: number | null;
}

export interface ProgressPhoto {
    id: string;
    user_id: string;
    image_url: string;
    pose: 'front' | 'side' | 'back';
    taken_at: string;
    weight_kg: number | null;
    notes: string | null;
}

// ── Goals ────────────────────────────────────────────────────

export interface Goal {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    goal_type: GoalType;
    target_value: number;
    current_value: number;
    unit: string;
    start_date: string;
    target_date: string | null;
    completed_at: string | null;
    status: 'active' | 'completed' | 'abandoned';
}

export type GoalType =
    | 'weight'         // reach target body weight
    | 'strength'       // lift target weight on an exercise
    | 'body_fat'       // reach target body fat %
    | 'measurement'    // reach target measurement
    | 'nutrition'      // maintain calorie/macro target
    | 'workout_count'  // complete X workouts
    | 'streak'         // maintain X day streak
    | 'custom';

// ── AI / Chat ────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DailyStats {
    date: string;
    calories_consumed: number;
    calories_target: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
    water_target_ml: number;
    workout_completed: boolean;
    workout_duration_min: number;
    steps: number;
    streak_count: number;
}
