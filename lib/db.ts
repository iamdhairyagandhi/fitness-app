// ============================================================
// Database Service Layer
// Bridges Zustand stores ↔ Supabase persistence
// ============================================================

import type {
    BodyMeasurement,
    DietProfile,
    Exercise,
    FastingSession,
    FoodItem,
    FoodLogEntry,
    Goal,
    PersonalRecord,
    ProgressPhoto,
    RecoveryLog,
    Supplement,
    SupplementLog,
    UserProfile,
    WaterLog,
    WeightEntry,
    WorkoutSession,
    WorkoutTemplate,
} from '@/types';
import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────────────────────

function getUserId(): string | null {
    // Synchronously get user id from Supabase session cache
    // Must be called after auth is initialized
    const session = supabase.auth as any;
    return session?.currentSession?.user?.id ?? null;
}

async function getAuthUserId(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
}

// ── Profile ──────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        username: data.username || null,
        avatar_url: data.avatar_url,
        bio: data.bio || null,
        phone_number: data.phone_number || null,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        current_weight_kg: data.current_weight_kg,
        activity_level: data.activity_level || 'moderate',
        goal: data.goal || 'maintain',
        experience_level: data.experience_level || 'intermediate',
        daily_calorie_target: data.daily_calorie_target || 2000,
        protein_target_g: data.protein_target_g || 150,
        carbs_target_g: data.carbs_target_g || 200,
        fat_target_g: data.fat_target_g || 65,
        water_goal_ml: data.water_goal_ml || 2500,
        unit_system: data.unit_system || 'metric',
        preferred_rest_seconds: data.preferred_rest_seconds || 90,
        created_at: data.created_at,
        updated_at: data.updated_at,
        streak_count: data.streak_count || 0,
        xp: data.xp || 0,
        level: data.level || 1,
        workouts_completed: data.workouts_completed || 0,
        last_workout_date: data.last_workout_date,
    };
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }) {
    const { id, created_at, ...updates } = profile as any;
    const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.warn('upsertProfile error:', error.message);
        throw error;
    }
}

// ── Exercises ────────────────────────────────────────────────

export async function fetchExercises(): Promise<Exercise[]> {
    const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

    if (error || !data) return [];

    return data.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        muscle_groups: e.muscle_groups || [],
        equipment: e.equipment || 'none',
        instructions: e.instructions || '',
        tips: e.tips,
        image_url: e.image_url,
        is_compound: e.is_compound ?? false,
        is_custom: e.is_custom ?? false,
        user_id: e.user_id,
    }));
}

// ── Workout Sessions ─────────────────────────────────────────

export async function fetchRecentWorkouts(userId: string, limit = 20): Promise<WorkoutSession[]> {
    const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        template_id: w.template_id,
        name: w.name,
        started_at: w.started_at,
        completed_at: w.completed_at,
        duration_seconds: w.duration_seconds,
        total_volume_kg: w.total_volume_kg || 0,
        notes: w.notes,
        mood: w.mood,
        exercises: w.exercises || [],
        workout_mode: w.workout_mode || 'standard',
        superset_groups: w.superset_groups || [],
    }));
}

export async function saveWorkoutSession(session: WorkoutSession) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('workout_sessions').upsert({
        id: session.id,
        user_id: userId,
        template_id: session.template_id,
        name: session.name,
        started_at: session.started_at,
        completed_at: session.completed_at,
        duration_seconds: session.duration_seconds,
        total_volume_kg: session.total_volume_kg,
        notes: session.notes,
        mood: session.mood,
        exercises: session.exercises as any,
    });

    if (error) console.warn('saveWorkoutSession error:', error.message);
}

// ── Workout Templates ────────────────────────────────────────

export async function fetchWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]> {
    const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        name: t.name,
        description: t.description,
        exercises: t.exercises || [],
        estimated_duration_min: t.estimated_duration_min || 45,
        category: t.category || 'custom',
        is_public: t.is_public ?? false,
        created_at: t.created_at,
    }));
}

export async function saveWorkoutTemplate(template: WorkoutTemplate) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('workout_templates').upsert({
        id: template.id,
        user_id: userId,
        name: template.name,
        description: template.description,
        exercises: template.exercises as any,
        estimated_duration_min: template.estimated_duration_min,
        category: template.category,
        is_public: template.is_public,
        created_at: template.created_at,
    });

    if (error) console.warn('saveWorkoutTemplate error:', error.message);
}

// ── Personal Records ─────────────────────────────────────────

export async function fetchPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

    if (error || !data) return [];

    return data.map((pr) => ({
        id: pr.id,
        user_id: pr.user_id,
        exercise_id: pr.exercise_id,
        exercise_name: pr.exercise_name,
        weight_kg: pr.weight_kg,
        reps: pr.reps,
        estimated_1rm_kg: pr.estimated_1rm_kg,
        achieved_at: pr.achieved_at,
    }));
}

export async function savePersonalRecords(records: PersonalRecord[]) {
    if (records.length === 0) return;
    const userId = await getAuthUserId();
    const rows = records.map((pr) => ({
        id: pr.id,
        user_id: userId,
        exercise_id: pr.exercise_id,
        exercise_name: pr.exercise_name,
        weight_kg: pr.weight_kg,
        reps: pr.reps,
        estimated_1rm_kg: pr.estimated_1rm_kg,
        achieved_at: pr.achieved_at,
    }));

    const { error } = await supabase.from('personal_records').upsert(rows);
    if (error) console.warn('savePersonalRecords error:', error.message);
}

// ── Food Items ───────────────────────────────────────────────

export async function searchFoodItems(query: string): Promise<FoodItem[]> {
    const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(30);

    if (error || !data) return [];

    return data.map(mapFoodItem);
}

export async function saveFoodItem(item: FoodItem) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('food_items').upsert({
        id: item.id,
        name: item.name,
        brand: item.brand,
        barcode: item.barcode,
        serving_size_g: item.serving_size_g,
        serving_unit: item.serving_unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        sugar_g: item.sugar_g,
        sodium_mg: item.sodium_mg,
        is_custom: item.is_custom,
        user_id: item.is_custom ? userId : item.user_id,
        image_url: item.image_url,
    });

    if (error) console.warn('saveFoodItem error:', error.message);
}

function mapFoodItem(d: any): FoodItem {
    return {
        id: d.id,
        name: d.name,
        brand: d.brand,
        barcode: d.barcode,
        serving_size_g: d.serving_size_g,
        serving_unit: d.serving_unit || 'g',
        calories: d.calories,
        protein_g: d.protein_g,
        carbs_g: d.carbs_g,
        fat_g: d.fat_g,
        fiber_g: d.fiber_g,
        sugar_g: d.sugar_g,
        sodium_mg: d.sodium_mg,
        is_custom: d.is_custom ?? false,
        user_id: d.user_id,
        image_url: d.image_url,
    };
}

// ── Food Logs ────────────────────────────────────────────────

export async function fetchFoodLogs(userId: string, date: string): Promise<FoodLogEntry[]> {
    // date format: 'YYYY-MM-DD'
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('food_log')
        .select('*, food_items(*)')
        .eq('user_id', userId)
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay)
        .order('logged_at');

    if (error || !data) return [];

    return data.map((fl) => ({
        id: fl.id,
        user_id: fl.user_id,
        food_item_id: fl.food_item_id,
        food_item: fl.food_items ? mapFoodItem(fl.food_items) : {
            id: fl.food_item_id, name: 'Unknown', brand: null, barcode: null,
            serving_size_g: 100, serving_unit: 'g', calories: fl.calories,
            protein_g: fl.protein_g, carbs_g: fl.carbs_g, fat_g: fl.fat_g,
            fiber_g: null, sugar_g: null, sodium_mg: null, is_custom: false,
            user_id: null, image_url: null,
        },
        meal_type: fl.meal_type,
        servings: fl.servings,
        logged_at: fl.logged_at,
        calories: fl.calories,
        protein_g: fl.protein_g,
        carbs_g: fl.carbs_g,
        fat_g: fl.fat_g,
        notes: fl.notes,
        photo_uri: fl.photo_uri || null,
    }));
}

export async function saveFoodLog(entry: FoodLogEntry) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('food_log').upsert({
        id: entry.id,
        user_id: userId,
        food_item_id: entry.food_item_id,
        meal_type: entry.meal_type,
        servings: entry.servings,
        logged_at: entry.logged_at,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        notes: entry.notes,
    });

    if (error) console.warn('saveFoodLog error:', error.message);
}

export async function deleteFoodLog(entryId: string) {
    const { error } = await supabase.from('food_log').delete().eq('id', entryId);
    if (error) console.warn('deleteFoodLog error:', error.message);
}

// ── Water Logs ───────────────────────────────────────────────

export async function fetchWaterLogs(userId: string, date: string): Promise<WaterLog[]> {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('water_log')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay);

    if (error || !data) return [];

    return data.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        amount_ml: w.amount_ml,
        logged_at: w.logged_at,
    }));
}

export async function saveWaterLog(log: WaterLog) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('water_log').upsert({
        id: log.id,
        user_id: userId,
        amount_ml: log.amount_ml,
        logged_at: log.logged_at,
    });

    if (error) console.warn('saveWaterLog error:', error.message);
}

// ── Weight Entries ───────────────────────────────────────────

export async function fetchWeightEntries(userId: string, limit = 50): Promise<WeightEntry[]> {
    const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        weight_kg: w.weight_kg,
        body_fat_pct: w.body_fat_pct,
        logged_at: w.logged_at,
        notes: w.notes,
    }));
}

export async function saveWeightEntry(entry: WeightEntry) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('weight_entries').upsert({
        id: entry.id,
        user_id: userId,
        weight_kg: entry.weight_kg,
        body_fat_pct: entry.body_fat_pct,
        logged_at: entry.logged_at,
        notes: entry.notes,
    });

    if (error) console.warn('saveWeightEntry error:', error.message);
}

// ── Body Measurements ────────────────────────────────────────

export async function fetchMeasurements(userId: string, limit = 50): Promise<BodyMeasurement[]> {
    const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        logged_at: m.logged_at,
        chest_cm: m.chest_cm,
        waist_cm: m.waist_cm,
        hips_cm: m.hips_cm,
        left_arm_cm: m.left_arm_cm,
        right_arm_cm: m.right_arm_cm,
        left_thigh_cm: m.left_thigh_cm,
        right_thigh_cm: m.right_thigh_cm,
        left_calf_cm: m.left_calf_cm,
        right_calf_cm: m.right_calf_cm,
        neck_cm: m.neck_cm,
        shoulders_cm: m.shoulders_cm,
    }));
}

export async function saveMeasurement(m: BodyMeasurement) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('body_measurements').upsert({
        id: m.id,
        user_id: userId,
        logged_at: m.logged_at,
        chest_cm: m.chest_cm,
        waist_cm: m.waist_cm,
        hips_cm: m.hips_cm,
        left_arm_cm: m.left_arm_cm,
        right_arm_cm: m.right_arm_cm,
        left_thigh_cm: m.left_thigh_cm,
        right_thigh_cm: m.right_thigh_cm,
        left_calf_cm: m.left_calf_cm,
        right_calf_cm: m.right_calf_cm,
        neck_cm: m.neck_cm,
        shoulders_cm: m.shoulders_cm,
    });

    if (error) console.warn('saveMeasurement error:', error.message);
}

// ── Progress Photos ──────────────────────────────────────────

export async function fetchProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
    const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', userId)
        .order('taken_at', { ascending: false });

    if (error || !data) return [];

    return data.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        image_url: p.image_url,
        pose: p.pose,
        taken_at: p.taken_at,
        weight_kg: p.weight_kg,
        notes: p.notes,
    }));
}

export async function saveProgressPhoto(photo: ProgressPhoto) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('progress_photos').upsert({
        id: photo.id,
        user_id: userId,
        image_url: photo.image_url,
        pose: photo.pose,
        taken_at: photo.taken_at,
        weight_kg: photo.weight_kg,
        notes: photo.notes,
    });

    if (error) console.warn('saveProgressPhoto error:', error.message);
}

// ── Goals ────────────────────────────────────────────────────

export async function fetchGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((g) => ({
        id: g.id,
        user_id: g.user_id,
        title: g.title,
        description: g.description,
        goal_type: g.goal_type,
        target_value: g.target_value,
        current_value: g.current_value,
        unit: g.unit,
        start_date: g.start_date,
        target_date: g.target_date,
        completed_at: g.completed_at,
        status: g.status,
    }));
}

export async function saveGoal(goal: Goal) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('goals').upsert({
        id: goal.id,
        user_id: userId,
        title: goal.title,
        description: goal.description,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        current_value: goal.current_value,
        unit: goal.unit,
        start_date: goal.start_date,
        target_date: goal.target_date,
        completed_at: goal.completed_at,
        status: goal.status,
    });

    if (error) console.warn('saveGoal error:', error.message);
}

// ── Recovery Logs ────────────────────────────────────────────

export async function fetchRecoveryLogs(userId: string, limit = 30): Promise<RecoveryLog[]> {
    const { data, error } = await supabase
        .from('recovery_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        sleep_hours: r.sleep_hours,
        sleep_quality: r.sleep_quality,
        soreness_level: r.soreness_level,
        sore_body_parts: r.sore_body_parts || [],
        stress_level: r.stress_level,
        energy_level: r.energy_level,
        mood: r.mood,
        resting_hr: r.resting_hr,
        hrv: r.hrv,
        recovery_score: r.recovery_score,
        notes: r.notes,
    }));
}

export async function saveRecoveryLog(log: RecoveryLog) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('recovery_logs').upsert({
        id: log.id,
        user_id: userId,
        date: log.date,
        sleep_hours: log.sleep_hours,
        sleep_quality: log.sleep_quality,
        soreness_level: log.soreness_level,
        sore_body_parts: log.sore_body_parts,
        stress_level: log.stress_level,
        energy_level: log.energy_level,
        mood: log.mood,
        resting_hr: log.resting_hr,
        hrv: log.hrv,
        recovery_score: log.recovery_score,
        notes: log.notes,
    });

    if (error) console.warn('saveRecoveryLog error:', error.message);
}

// ── User Achievements ────────────────────────────────────────

export async function fetchUserAchievements(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((a) => a.achievement_id);
}

export async function saveUserAchievement(achievementId: string) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('user_achievements').upsert(
        { user_id: userId, achievement_id: achievementId },
        { onConflict: 'user_id,achievement_id' }
    );

    if (error) console.warn('saveUserAchievement error:', error.message);
}

// ── Diet Profile ─────────────────────────────────────────────

export async function fetchDietProfile(userId: string): Promise<DietProfile | null> {
    const { data, error } = await supabase
        .from('diet_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;

    return {
        template: data.template || 'standard',
        phase: data.phase || 'maintain',
        phase_start_date: data.phase_start_date,
        phase_target_date: data.phase_target_date,
        macro_cycle_enabled: data.macro_cycle_enabled ?? false,
        macro_cycle_pattern: data.macro_cycle_pattern || [],
        fasting_enabled: data.fasting_enabled ?? false,
        fasting_window_start: data.fasting_window_start,
        fasting_window_end: data.fasting_window_end,
        allergies: data.allergies || [],
        intolerances: data.intolerances || [],
        excluded_foods: data.excluded_foods || [],
        preferred_cuisines: data.preferred_cuisines || [],
    };
}

export async function saveDietProfile(profile: DietProfile) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('diet_profiles').upsert({
        user_id: userId,
        template: profile.template,
        phase: profile.phase,
        phase_start_date: profile.phase_start_date,
        phase_target_date: profile.phase_target_date,
        macro_cycle_enabled: profile.macro_cycle_enabled,
        macro_cycle_pattern: profile.macro_cycle_pattern,
        fasting_enabled: profile.fasting_enabled,
        fasting_window_start: profile.fasting_window_start,
        fasting_window_end: profile.fasting_window_end,
        allergies: profile.allergies,
        intolerances: profile.intolerances,
        excluded_foods: profile.excluded_foods,
        preferred_cuisines: profile.preferred_cuisines,
    }, { onConflict: 'user_id' });

    if (error) console.warn('saveDietProfile error:', error.message);
}

// ── Fasting Sessions ─────────────────────────────────────────

export async function fetchFastingSessions(userId: string): Promise<FastingSession[]> {
    const { data, error } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20);

    if (error || !data) return [];

    return data.map((f) => ({
        id: f.id,
        user_id: f.user_id,
        started_at: f.started_at,
        target_end_at: f.target_end_at,
        actual_end_at: f.actual_end_at,
        fasting_hours: f.fasting_hours,
        status: f.status,
        notes: f.notes,
    }));
}

export async function saveFastingSession(session: FastingSession) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('fasting_sessions').upsert({
        id: session.id,
        user_id: userId,
        started_at: session.started_at,
        target_end_at: session.target_end_at,
        actual_end_at: session.actual_end_at,
        fasting_hours: session.fasting_hours,
        status: session.status,
        notes: session.notes,
    });

    if (error) console.warn('saveFastingSession error:', error.message);
}

// ── Supplements ──────────────────────────────────────────────

export async function fetchSupplements(userId: string): Promise<Supplement[]> {
    const { data, error } = await supabase
        .from('supplements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');

    if (error || !data) return [];

    return data.map((s) => ({
        id: s.id,
        name: s.name,
        dosage: s.dosage,
        timing: s.timing,
        frequency: s.frequency,
        notes: s.notes,
    }));
}

export async function saveSupplement(supplement: Supplement) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('supplements').upsert({
        id: supplement.id,
        user_id: userId,
        name: supplement.name,
        dosage: supplement.dosage,
        timing: supplement.timing,
        frequency: supplement.frequency,
        notes: supplement.notes,
    });

    if (error) console.warn('saveSupplement error:', error.message);
}

export async function deleteSupplement(supplementId: string) {
    const { error } = await supabase.from('supplements').delete().eq('id', supplementId);
    if (error) console.warn('deleteSupplement error:', error.message);
}

export async function saveSupplementLog(log: SupplementLog) {
    const userId = await getAuthUserId();
    const { error } = await supabase.from('supplement_logs').upsert({
        id: log.id,
        user_id: userId,
        supplement_id: log.supplement_id,
        taken_at: log.taken_at,
    });

    if (error) console.warn('saveSupplementLog error:', error.message);
}

// ── Hydrate All Stores ───────────────────────────────────────
// Call this once after login to load all user data into Zustand

export async function hydrateAllStores(userId: string) {
    const [
        profile,
        exercises,
        workouts,
        templates,
        personalRecords,
        weightEntries,
        measurements,
        photos,
        goals,
        recoveryLogs,
        unlockedIds,
        dietProfile,
        fastingSessions,
        supplements,
    ] = await Promise.all([
        fetchProfile(userId),
        fetchExercises(),
        fetchRecentWorkouts(userId),
        fetchWorkoutTemplates(userId),
        fetchPersonalRecords(userId),
        fetchWeightEntries(userId),
        fetchMeasurements(userId),
        fetchProgressPhotos(userId),
        fetchGoals(userId),
        fetchRecoveryLogs(userId),
        fetchUserAchievements(userId),
        fetchDietProfile(userId),
        fetchFastingSessions(userId),
        fetchSupplements(userId),
    ]);

    // Also fetch today's nutrition
    const today = new Date().toISOString().split('T')[0];
    const [foodLogs, waterLogs] = await Promise.all([
        fetchFoodLogs(userId, today),
        fetchWaterLogs(userId, today),
    ]);

    return {
        profile,
        exercises,
        workouts,
        templates,
        personalRecords,
        weightEntries,
        measurements,
        photos,
        goals,
        recoveryLogs,
        unlockedIds,
        dietProfile,
        fastingSessions,
        supplements,
        foodLogs,
        waterLogs,
    };
}
