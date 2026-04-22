// ============================================================
// FitFusion Type Definitions
// ============================================================

// ── User & Auth ──────────────────────────────────────────────

export interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    phone_number: string | null;
    date_of_birth: string | null;
    gender: 'male' | 'female' | 'other' | null;
    height_cm: number | null;
    weight_kg: number | null;
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
    preferred_rest_seconds: number;
    created_at: string;
    updated_at: string;
    streak_count: number;
    xp: number;
    level: number;
    workouts_completed: number;
    last_workout_date: string | null;
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
    metadata?: Record<string, unknown>;
}

export interface ChatConversation {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages?: ChatMessage[];
    last_message?: string;
}

// ── AI Types ─────────────────────────────────────────────────

export type AIFunctionName =
    | 'create_workout'
    | 'generate_meal_plan'
    | 'log_food'
    | 'set_goal'
    | 'analyze_progress'
    | 'get_weekly_report';

export interface AIFunctionCall {
    name: AIFunctionName;
    arguments: Record<string, unknown>;
}

export interface AIDailyInsight {
    id: string;
    user_id: string;
    date: string;
    insight_text: string;
    insight_type: 'nutrition' | 'workout' | 'recovery' | 'general' | 'motivation';
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface AIGeneratedWorkout {
    name: string;
    description: string;
    estimated_duration_min: number;
    exercises: {
        exercise_name: string;
        sets: number;
        reps: string;
        rest_seconds: number;
        notes?: string;
    }[];
}

export interface AIGeneratedMealPlan {
    name: string;
    days: {
        day: string;
        meals: {
            meal_type: MealType;
            name: string;
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
            ingredients?: string[];
            instructions?: string;
        }[];
        total_calories: number;
        total_protein_g: number;
        total_carbs_g: number;
        total_fat_g: number;
    }[];
}

// ── Diet & Meal Planning ─────────────────────────────────────

export type DietTemplate =
    | 'standard'
    | 'keto'
    | 'paleo'
    | 'vegan'
    | 'vegetarian'
    | 'mediterranean'
    | 'carnivore'
    | 'whole30'
    | 'dash'
    | 'iifym'
    | 'intermittent_fasting'
    | 'custom';

export type DietPhase = 'bulk' | 'cut' | 'maintain' | 'reverse_diet' | 'recomp';

export type MacroCycleDay = 'high_carb' | 'low_carb' | 'moderate' | 'refeed' | 'rest_day';

export interface DietProfile {
    template: DietTemplate;
    phase: DietPhase;
    phase_start_date: string;
    phase_target_date: string | null;
    macro_cycle_enabled: boolean;
    macro_cycle_pattern: MacroCycleDay[]; // e.g. ['high_carb','low_carb','moderate','low_carb','high_carb','moderate','refeed']
    fasting_enabled: boolean;
    fasting_window_start: string | null; // "20:00"
    fasting_window_end: string | null;   // "12:00"
    allergies: string[];
    intolerances: string[];
    excluded_foods: string[];
    preferred_cuisines: string[];
}

export interface MicronutrientEntry {
    name: string;
    amount: number;
    unit: string;
    rda: number;
    percentage: number; // of RDA
    category: 'vitamin' | 'mineral' | 'other';
}

export interface Recipe {
    id: string;
    name: string;
    description: string;
    image_url: string | null;
    prep_time_min: number;
    cook_time_min: number;
    servings: number;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    tags: string[];
    diet_tags: DietTemplate[];
    cuisine: string;
    difficulty: 'easy' | 'medium' | 'hard';
    is_favorited: boolean;
    rating: number | null;
    source: 'built_in' | 'ai_generated' | 'community' | 'custom';
}

export interface RecipeIngredient {
    food_item_id: string | null;
    name: string;
    amount: number;
    unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

export interface MealPlan {
    id: string;
    user_id: string;
    name: string;
    start_date: string;
    end_date: string;
    days: MealPlanDay[];
    created_at: string;
    source: 'ai_generated' | 'manual' | 'template';
}

export interface MealPlanDay {
    date: string;
    day_type: MacroCycleDay;
    meals: {
        breakfast: MealPlanItem[];
        lunch: MealPlanItem[];
        dinner: MealPlanItem[];
        snack: MealPlanItem[];
    };
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
}

export interface MealPlanItem {
    recipe_id: string | null;
    food_item_id: string | null;
    name: string;
    servings: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

export interface GroceryList {
    id: string;
    meal_plan_id: string;
    items: GroceryItem[];
    created_at: string;
}

export interface GroceryItem {
    name: string;
    amount: number;
    unit: string;
    category: string; // 'produce', 'dairy', 'meat', 'grains', etc.
    checked: boolean;
    estimated_cost: number | null;
}

// ── Fasting ──────────────────────────────────────────────────

export interface FastingSession {
    id: string;
    user_id: string;
    started_at: string;
    target_end_at: string;
    actual_end_at: string | null;
    fasting_hours: number;
    status: 'active' | 'completed' | 'broken';
    notes: string | null;
}

// ── Recovery & Health ────────────────────────────────────────

export interface RecoveryLog {
    id: string;
    user_id: string;
    date: string;
    sleep_hours: number | null;
    sleep_quality: 1 | 2 | 3 | 4 | 5 | null;
    soreness_level: 0 | 1 | 2 | 3 | 4 | 5; // 0=none, 5=extreme
    sore_body_parts: MuscleGroup[];
    stress_level: 1 | 2 | 3 | 4 | 5 | null;
    energy_level: 1 | 2 | 3 | 4 | 5 | null;
    mood: 1 | 2 | 3 | 4 | 5 | null;
    resting_hr: number | null;
    hrv: number | null;
    recovery_score: number; // 0-100 computed score
    notes: string | null;
}

export interface SorenessEntry {
    muscle_group: MuscleGroup;
    severity: 1 | 2 | 3 | 4 | 5;
}

// ── Gamification ─────────────────────────────────────────────

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'workout' | 'nutrition' | 'streak' | 'strength' | 'body' | 'social' | 'milestone';
    requirement_type: string;
    requirement_value: number;
    xp_reward: number;
    unlocked_at: string | null;
    progress: number; // 0-100
}

export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    start_date: string;
    end_date: string;
    target_value: number;
    current_value: number;
    unit: string;
    reward_xp: number;
    status: 'active' | 'completed' | 'failed';
    participants?: number;
}

// ── Analytics ────────────────────────────────────────────────

export interface WeeklyReport {
    id: string;
    user_id: string;
    week_start: string;
    week_end: string;
    workouts_completed: number;
    total_volume_kg: number;
    avg_calories: number;
    avg_protein_g: number;
    weight_change_kg: number;
    new_prs: number;
    streak_days: number;
    recovery_avg: number;
    ai_summary: string;
    ai_recommendations: string[];
    highlights: string[];
}

export interface TrainingVolumeData {
    muscle_group: MuscleGroup;
    sets: number;
    reps: number;
    volume_kg: number;
    period: 'week' | 'month';
}

export interface CorrelationInsight {
    id: string;
    metric_a: string;
    metric_b: string;
    correlation: number; // -1 to 1
    description: string;
    recommendation: string;
}

export interface NutritionHeatmapDay {
    date: string;
    score: number; // 0-100 adherence
    calories_delta: number;
    protein_hit: boolean;
}

// ── Supplements ──────────────────────────────────────────────

export interface Supplement {
    id: string;
    name: string;
    dosage: string;
    timing: string; // 'morning', 'pre-workout', 'post-workout', 'evening'
    frequency: 'daily' | 'workout_days' | 'as_needed';
    notes: string | null;
}

export interface SupplementLog {
    id: string;
    supplement_id: string;
    taken_at: string;
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

// ── Social ───────────────────────────────────────────────────

export interface PublicProfile {
    id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string;
    is_public: boolean;
    level: number;
    xp: number;
    streak_count: number;
    workouts_completed: number;
    followers_count: number;
    following_count: number;
    is_following?: boolean;
    follow_status?: 'none' | 'pending' | 'accepted';
}

export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export interface FollowRelation {
    id: string;
    follower_id: string;
    following_id: string;
    status: FollowStatus;
    created_at: string;
    profile?: PublicProfile;
}

export type ActivityType =
    | 'workout_completed'
    | 'personal_record'
    | 'achievement_unlocked'
    | 'streak_milestone'
    | 'challenge_joined'
    | 'challenge_completed'
    | 'weight_milestone'
    | 'level_up';

export type ReactionType = 'like' | 'fire' | 'muscle' | 'clap';

export interface ActivityFeedItem {
    id: string;
    user_id: string;
    activity_type: ActivityType;
    title: string;
    description: string | null;
    metadata: Record<string, unknown>;
    is_public: boolean;
    created_at: string;
    profile?: {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
        level: number;
    };
    reactions_count: number;
    comments_count: number;
    user_reaction?: ReactionType | null;
}

export interface Reaction {
    id: string;
    user_id: string;
    activity_id: string;
    reaction_type: ReactionType;
    created_at: string;
}

export interface Comment {
    id: string;
    user_id: string;
    activity_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    profile?: {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
    };
}

export type ChallengeType = 'workout_count' | 'total_volume' | 'streak' | 'steps' | 'calories_burned' | 'custom';

export interface SocialChallenge {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    challenge_type: ChallengeType;
    target_value: number;
    unit: string;
    start_date: string;
    end_date: string;
    reward_xp: number;
    is_public: boolean;
    max_participants: number;
    created_at: string;
    creator?: {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
    };
    participant_count: number;
    user_participation?: ChallengeParticipant | null;
}

export interface ChallengeParticipant {
    id: string;
    challenge_id: string;
    user_id: string;
    current_value: number;
    status: 'active' | 'completed' | 'dropped';
    joined_at: string;
    completed_at: string | null;
    profile?: {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
        level: number;
    };
}

export interface LeaderboardEntry {
    id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    xp: number;
    level: number;
    streak_count: number;
    workouts_completed: number;
    weekly_volume: number;
    weekly_workouts: number;
    rank?: number;
}
