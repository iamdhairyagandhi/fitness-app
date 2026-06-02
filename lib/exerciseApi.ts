// ── Exercise API ─────────────────────────────────────────────
// Uses ExerciseDB (free via RapidAPI) with fallback to built-in data
// For images: ExerciseDB returns GIF URLs of animated exercise demos
// ─────────────────────────────────────────────────────────────

import type { Equipment, Exercise, ExerciseCategory, MuscleGroup } from '@/types';

// ── ExerciseDB API (RapidAPI) ────────────────────────────────

const EXERCISEDB_BASE = 'https://exercisedb.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';

const exerciseDbHeaders = {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
};

// Map ExerciseDB body parts → our MuscleGroup type
const BODY_PART_MAP: Record<string, MuscleGroup> = {
    back: 'back',
    cardio: 'full_body',
    chest: 'chest',
    'lower arms': 'forearms',
    'lower legs': 'calves',
    neck: 'traps',
    shoulders: 'shoulders',
    'upper arms': 'biceps',
    'upper legs': 'quads',
    waist: 'abs',
};

const TARGET_MAP: Record<string, MuscleGroup> = {
    abductors: 'glutes',
    abs: 'abs',
    adductors: 'quads',
    biceps: 'biceps',
    calves: 'calves',
    'cardiovascular system': 'full_body',
    delts: 'shoulders',
    forearms: 'forearms',
    glutes: 'glutes',
    hamstrings: 'hamstrings',
    lats: 'lats',
    'levator scapulae': 'traps',
    pectorals: 'chest',
    quads: 'quads',
    'serratus anterior': 'chest',
    spine: 'lower_back',
    traps: 'traps',
    triceps: 'triceps',
    'upper back': 'back',
};

const EQUIPMENT_MAP: Record<string, Equipment> = {
    barbell: 'barbell',
    'body weight': 'bodyweight',
    cable: 'cable',
    dumbbell: 'dumbbell',
    'ez barbell': 'barbell',
    'olympic barbell': 'barbell',
    kettlebell: 'kettlebell',
    'leverage machine': 'machine',
    'smith machine': 'machine',
    band: 'band',
    'resistance band': 'band',
    rope: 'cable',
    'stability ball': 'other',
    medicine_ball: 'other',
    assisted: 'machine',
    roller: 'other',
    weighted: 'other',
    bosu_ball: 'other',
    hammer: 'dumbbell',
    trap_bar: 'barbell',
    tire: 'other',
    skierg_machine: 'machine',
    sled_machine: 'machine',
    upper_body_ergometer: 'machine',
    elliptical_machine: 'machine',
    stepmill_machine: 'machine',
    stationary_bike: 'machine',
};

const CATEGORY_MAP: Record<string, ExerciseCategory> = {
    barbell: 'barbell',
    'body weight': 'bodyweight',
    cable: 'cable',
    dumbbell: 'dumbbell',
    'ez barbell': 'barbell',
    'olympic barbell': 'barbell',
    kettlebell: 'other',
    'leverage machine': 'machine',
    'smith machine': 'machine',
    band: 'other',
    'resistance band': 'other',
};

interface ExerciseDBItem {
    id: string;
    name: string;
    bodyPart: string;
    target: string;
    secondaryMuscles: string[];
    equipment: string;
    gifUrl: string;
    instructions: string[];
}

function mapExerciseDBItem(item: ExerciseDBItem): Exercise {
    const primary = TARGET_MAP[item.target] || BODY_PART_MAP[item.bodyPart] || 'full_body';
    const secondary = item.secondaryMuscles
        .map((m) => TARGET_MAP[m.toLowerCase()] || BODY_PART_MAP[m.toLowerCase()])
        .filter(Boolean) as MuscleGroup[];
    const muscleGroups = Array.from(new Set([primary, ...secondary]));

    const isCompound = muscleGroups.length >= 2 ||
        ['squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull-up', 'clean', 'snatch', 'lunge', 'dip']
            .some((name) => item.name.toLowerCase().includes(name));

    return {
        id: item.id,
        name: item.name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category: CATEGORY_MAP[item.equipment] || 'other',
        muscle_groups: muscleGroups,
        equipment: EQUIPMENT_MAP[item.equipment] || 'other',
        instructions: item.instructions.join('\n'),
        tips: null,
        image_url: item.gifUrl || null,
        is_compound: isCompound,
        is_custom: false,
        user_id: null,
    };
}

/**
 * Fetch exercises from ExerciseDB API
 * Falls back to built-in data if API key is missing or request fails
 */
export async function fetchExercisesFromAPI(limit = 200, offset = 0): Promise<Exercise[]> {
    if (!RAPIDAPI_KEY) {
        return BUILTIN_EXERCISES;
    }

    try {
        const response = await fetch(
            `${EXERCISEDB_BASE}/exercises?limit=${limit}&offset=${offset}`,
            { headers: exerciseDbHeaders }
        );
        if (!response.ok) throw new Error(`ExerciseDB ${response.status}`);
        const data: ExerciseDBItem[] = await response.json();
        return data.map(mapExerciseDBItem);
    } catch (err) {
        console.warn('ExerciseDB API failed, using built-in data:', err);
        return BUILTIN_EXERCISES;
    }
}

/**
 * Search exercises by name from API
 */
export async function searchExercisesAPI(query: string): Promise<Exercise[]> {
    if (!RAPIDAPI_KEY) {
        return BUILTIN_EXERCISES.filter((e) =>
            e.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    try {
        const response = await fetch(
            `${EXERCISEDB_BASE}/exercises/name/${encodeURIComponent(query)}?limit=20`,
            { headers: exerciseDbHeaders }
        );
        if (!response.ok) throw new Error(`ExerciseDB search ${response.status}`);
        const data: ExerciseDBItem[] = await response.json();
        return data.map(mapExerciseDBItem);
    } catch {
        return BUILTIN_EXERCISES.filter((e) =>
            e.name.toLowerCase().includes(query.toLowerCase())
        );
    }
}

/**
 * Fetch exercises by muscle group
 */
export async function fetchExercisesByMuscle(muscle: string): Promise<Exercise[]> {
    if (!RAPIDAPI_KEY) {
        return BUILTIN_EXERCISES.filter((e) =>
            e.muscle_groups.some((mg) => mg.includes(muscle.toLowerCase()))
        );
    }

    try {
        const response = await fetch(
            `${EXERCISEDB_BASE}/exercises/target/${encodeURIComponent(muscle)}?limit=30`,
            { headers: exerciseDbHeaders }
        );
        if (!response.ok) throw new Error(`ExerciseDB target ${response.status}`);
        const data: ExerciseDBItem[] = await response.json();
        return data.map(mapExerciseDBItem);
    } catch {
        return BUILTIN_EXERCISES.filter((e) =>
            e.muscle_groups.some((mg) => mg.includes(muscle.toLowerCase()))
        );
    }
}

// ── Built-in exercise database (200+ exercises) ──────────────
// Used as offline fallback when ExerciseDB API is unavailable

export const BUILTIN_EXERCISES: Exercise[] = [
    // ── Chest ────────────────────────────────────────────────
    { id: 'ex001', name: 'Barbell Bench Press', category: 'barbell', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'barbell', instructions: 'Lie flat on bench. Grip bar slightly wider than shoulders. Lower to chest, press up.', tips: 'Keep feet flat, arch natural. Drive through heels.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex002', name: 'Incline Barbell Bench Press', category: 'barbell', muscle_groups: ['chest', 'shoulders', 'triceps'], equipment: 'barbell', instructions: 'Set bench to 30-45°. Grip bar, lower to upper chest, press up.', tips: 'Don\'t flare elbows excessively.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex003', name: 'Decline Barbell Bench Press', category: 'barbell', muscle_groups: ['chest', 'triceps'], equipment: 'barbell', instructions: 'Set bench to -15°. Grip bar, lower to lower chest, press up.', tips: 'Hook feet under pads for stability.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex004', name: 'Dumbbell Bench Press', category: 'dumbbell', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'dumbbell', instructions: 'Lie flat, press dumbbells up from chest level. Lower with control.', tips: 'Squeeze chest at top, full ROM.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex005', name: 'Incline Dumbbell Press', category: 'dumbbell', muscle_groups: ['chest', 'shoulders'], equipment: 'dumbbell', instructions: 'Set bench to 30-45°. Press dumbbells from chest to lockout.', tips: 'Control the negative.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex006', name: 'Dumbbell Fly', category: 'dumbbell', muscle_groups: ['chest'], equipment: 'dumbbell', instructions: 'Lie flat, arms extended above chest. Lower in wide arc, squeeze back up.', tips: 'Slight bend in elbows throughout.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex007', name: 'Cable Crossover', category: 'cable', muscle_groups: ['chest'], equipment: 'cable', instructions: 'Set pulleys high. Step forward, bring handles together in arc.', tips: 'Squeeze and hold at bottom.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex008', name: 'Chest Dip', category: 'bodyweight', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'bodyweight', instructions: 'Lean forward on dip bars. Lower until upper arms parallel, push up.', tips: 'Lean forward for more chest activation.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex009', name: 'Push-Up', category: 'bodyweight', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'bodyweight', instructions: 'Hands shoulder-width, body straight. Lower chest to floor, push up.', tips: 'Core tight, full lockout at top.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex010', name: 'Machine Chest Press', category: 'machine', muscle_groups: ['chest', 'triceps'], equipment: 'machine', instructions: 'Sit with back flat. Press handles forward, control return.', tips: 'Adjust seat so handles align with mid-chest.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex011', name: 'Pec Deck Machine', category: 'machine', muscle_groups: ['chest'], equipment: 'machine', instructions: 'Sit with arms at 90°. Bring pads together, squeeze chest.', tips: 'Don\'t use momentum.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Back ─────────────────────────────────────────────────
    { id: 'ex012', name: 'Conventional Deadlift', category: 'barbell', muscle_groups: ['back', 'hamstrings', 'glutes', 'traps'], equipment: 'barbell', instructions: 'Stand over bar, hinge at hips, grip bar. Drive through floor, lock out.', tips: 'Keep bar close to body. Neutral spine.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex013', name: 'Sumo Deadlift', category: 'barbell', muscle_groups: ['back', 'glutes', 'quads'], equipment: 'barbell', instructions: 'Wide stance, toes out. Grip inside legs, drive up.', tips: 'Push knees out over toes.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex014', name: 'Romanian Deadlift', category: 'barbell', muscle_groups: ['hamstrings', 'glutes', 'lower_back'], equipment: 'barbell', instructions: 'Hold bar at hips. Hinge forward with slight knee bend, feel hamstring stretch.', tips: 'Push hips back, bar stays close to legs.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex015', name: 'Barbell Bent-Over Row', category: 'barbell', muscle_groups: ['back', 'biceps', 'lats'], equipment: 'barbell', instructions: 'Hinge at 45°, pull bar to lower chest/upper belly.', tips: 'Squeeze shoulder blades together at top.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex016', name: 'Pendlay Row', category: 'barbell', muscle_groups: ['back', 'lats', 'biceps'], equipment: 'barbell', instructions: 'Torso parallel to floor. Pull bar from floor to chest, lower back.', tips: 'Reset on floor each rep.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex017', name: 'Pull-Up', category: 'bodyweight', muscle_groups: ['lats', 'biceps', 'back'], equipment: 'bodyweight', instructions: 'Hang from bar, palms forward. Pull chin over bar.', tips: 'Full dead hang at bottom. No kipping.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex018', name: 'Chin-Up', category: 'bodyweight', muscle_groups: ['lats', 'biceps', 'back'], equipment: 'bodyweight', instructions: 'Hang from bar, palms facing you. Pull chin over bar.', tips: 'Great for bicep development.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex019', name: 'Lat Pulldown', category: 'cable', muscle_groups: ['lats', 'biceps', 'back'], equipment: 'cable', instructions: 'Grip wide on bar. Pull to upper chest, control up.', tips: 'Drive elbows down and back.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex020', name: 'Seated Cable Row', category: 'cable', muscle_groups: ['back', 'biceps', 'lats'], equipment: 'cable', instructions: 'Sit with feet on platform. Pull handle to torso.', tips: 'Squeeze shoulder blades. Don\'t lean back excessively.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex021', name: 'Single-Arm Dumbbell Row', category: 'dumbbell', muscle_groups: ['back', 'biceps', 'lats'], equipment: 'dumbbell', instructions: 'One hand on bench. Row dumbbell to hip.', tips: 'Keep torso stable, don\'t rotate.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex022', name: 'T-Bar Row', category: 'barbell', muscle_groups: ['back', 'lats', 'biceps'], equipment: 'barbell', instructions: 'Straddle bar, row handle to chest.', tips: 'Squeeze at top, control eccentric.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex023', name: 'Face Pull', category: 'cable', muscle_groups: ['shoulders', 'traps', 'back'], equipment: 'cable', instructions: 'Set pulley high. Pull rope to face, externally rotate.', tips: 'Great for shoulder health and posture.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex024', name: 'Straight-Arm Pulldown', category: 'cable', muscle_groups: ['lats'], equipment: 'cable', instructions: 'Stand facing cable, arms straight. Push bar down to thighs.', tips: 'Feel the lat stretch at top.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex025', name: 'Hyperextension', category: 'bodyweight', muscle_groups: ['lower_back', 'glutes', 'hamstrings'], equipment: 'bodyweight', instructions: 'Position on hyperextension bench. Lower torso, raise back up.', tips: 'Don\'t hyperextend at the top.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Shoulders ────────────────────────────────────────────
    { id: 'ex026', name: 'Overhead Press', category: 'barbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', instructions: 'Stand, grip bar at shoulders. Press overhead to lockout.', tips: 'Brace core, squeeze glutes.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex027', name: 'Dumbbell Shoulder Press', category: 'dumbbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'dumbbell', instructions: 'Seated or standing. Press dumbbells from shoulders overhead.', tips: 'Don\'t bang dumbbells at top.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex028', name: 'Arnold Press', category: 'dumbbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'dumbbell', instructions: 'Start with palms facing you. Rotate and press overhead.', tips: 'Smooth rotation throughout.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex029', name: 'Lateral Raise', category: 'dumbbell', muscle_groups: ['shoulders'], equipment: 'dumbbell', instructions: 'Arms at sides. Raise dumbbells out to sides to shoulder height.', tips: 'Slight bend in elbows, control the weight.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex030', name: 'Front Raise', category: 'dumbbell', muscle_groups: ['shoulders'], equipment: 'dumbbell', instructions: 'Raise dumbbells in front to shoulder height.', tips: 'Alternate arms or both at once.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex031', name: 'Reverse Pec Deck', category: 'machine', muscle_groups: ['shoulders', 'back'], equipment: 'machine', instructions: 'Sit facing pad. Pull handles back, squeezing rear delts.', tips: 'Focus on rear delt contraction.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex032', name: 'Cable Lateral Raise', category: 'cable', muscle_groups: ['shoulders'], equipment: 'cable', instructions: 'Stand beside cable. Raise handle out to side.', tips: 'Constant tension throughout ROM.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex033', name: 'Upright Row', category: 'barbell', muscle_groups: ['shoulders', 'traps'], equipment: 'barbell', instructions: 'Narrow grip. Pull bar up to chin level.', tips: 'Don\'t go higher than uncomfortable. Wide grip is safer.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex034', name: 'Dumbbell Shrug', category: 'dumbbell', muscle_groups: ['traps'], equipment: 'dumbbell', instructions: 'Hold heavy dumbbells. Shrug shoulders up and squeeze.', tips: 'Hold at top for 2 seconds.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex035', name: 'Barbell Shrug', category: 'barbell', muscle_groups: ['traps'], equipment: 'barbell', instructions: 'Hold barbell in front. Shrug shoulders up.', tips: 'Heavy weight, controlled reps.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Arms — Biceps ────────────────────────────────────────
    { id: 'ex036', name: 'Barbell Curl', category: 'barbell', muscle_groups: ['biceps'], equipment: 'barbell', instructions: 'Stand with bar at thighs. Curl to shoulders.', tips: 'Don\'t swing body. Elbows pinned.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex037', name: 'EZ-Bar Curl', category: 'barbell', muscle_groups: ['biceps'], equipment: 'barbell', instructions: 'Use EZ bar. Curl with angled grip.', tips: 'Easier on wrists than straight bar.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex038', name: 'Dumbbell Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: 'Curl dumbbells, supinate at top.', tips: 'Full range of motion, no swinging.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex039', name: 'Hammer Curl', category: 'dumbbell', muscle_groups: ['biceps', 'forearms'], equipment: 'dumbbell', instructions: 'Neutral grip (palms in). Curl to shoulders.', tips: 'Targets brachialis and forearms.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex040', name: 'Incline Dumbbell Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: 'Sit on incline bench. Arms hanging, curl up.', tips: 'Great long head stretch at bottom.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex041', name: 'Preacher Curl', category: 'barbell', muscle_groups: ['biceps'], equipment: 'barbell', instructions: 'Rest arms on preacher pad. Curl bar up.', tips: 'Don\'t fully extend at bottom to protect elbows.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex042', name: 'Cable Curl', category: 'cable', muscle_groups: ['biceps'], equipment: 'cable', instructions: 'Stand at cable machine. Curl handle up.', tips: 'Constant tension throughout.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex043', name: 'Concentration Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: 'Sit, elbow on inner thigh. Curl dumbbell up.', tips: 'Isolates the bicep peak.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Arms — Triceps ───────────────────────────────────────
    { id: 'ex044', name: 'Close-Grip Bench Press', category: 'barbell', muscle_groups: ['triceps', 'chest'], equipment: 'barbell', instructions: 'Narrow grip on bar. Press from chest to lockout.', tips: 'Hands shoulder-width or slightly narrower.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex045', name: 'Tricep Pushdown', category: 'cable', muscle_groups: ['triceps'], equipment: 'cable', instructions: 'Set cable high. Push bar/rope down to full extension.', tips: 'Elbows pinned at sides.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex046', name: 'Overhead Tricep Extension', category: 'dumbbell', muscle_groups: ['triceps'], equipment: 'dumbbell', instructions: 'Hold dumbbell overhead. Lower behind head, extend up.', tips: 'Targets long head of tricep.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex047', name: 'Skull Crusher', category: 'barbell', muscle_groups: ['triceps'], equipment: 'barbell', instructions: 'Lie flat. Lower bar to forehead, extend up.', tips: 'Use EZ bar for wrist comfort.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex048', name: 'Tricep Dip', category: 'bodyweight', muscle_groups: ['triceps', 'chest'], equipment: 'bodyweight', instructions: 'Parallel bars, body upright. Lower and press up.', tips: 'Stay upright to target triceps more.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex049', name: 'Diamond Push-Up', category: 'bodyweight', muscle_groups: ['triceps', 'chest'], equipment: 'bodyweight', instructions: 'Hands together forming diamond. Push up.', tips: 'Great tricep builder.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex050', name: 'Cable Overhead Extension', category: 'cable', muscle_groups: ['triceps'], equipment: 'cable', instructions: 'Face away from cable. Extend rope overhead.', tips: 'Step forward for full stretch.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex051', name: 'Tricep Kickback', category: 'dumbbell', muscle_groups: ['triceps'], equipment: 'dumbbell', instructions: 'Hinge forward. Extend dumbbell behind you.', tips: 'Squeeze at full extension.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Forearms ─────────────────────────────────────────────
    { id: 'ex052', name: 'Wrist Curl', category: 'barbell', muscle_groups: ['forearms'], equipment: 'barbell', instructions: 'Forearms on bench, palms up. Curl wrists up.', tips: 'Use light weight, high reps.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex053', name: 'Reverse Wrist Curl', category: 'barbell', muscle_groups: ['forearms'], equipment: 'barbell', instructions: 'Forearms on bench, palms down. Extend wrists up.', tips: 'Strengthens extensors.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex054', name: 'Farmer\'s Walk', category: 'other', muscle_groups: ['forearms', 'traps', 'abs'], equipment: 'dumbbell', instructions: 'Hold heavy dumbbells. Walk with good posture.', tips: 'Great for grip and overall conditioning.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Legs — Quads ─────────────────────────────────────────
    { id: 'ex055', name: 'Barbell Back Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'barbell', instructions: 'Bar on upper back. Squat to parallel or below. Drive up.', tips: 'Chest up, knees track toes, brace core.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex056', name: 'Front Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'abs'], equipment: 'barbell', instructions: 'Bar on front delts, clean grip or cross-arm. Squat deep.', tips: 'Elbows high, upright torso.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex057', name: 'Goblet Squat', category: 'dumbbell', muscle_groups: ['quads', 'glutes'], equipment: 'dumbbell', instructions: 'Hold dumbbell at chest. Squat between legs.', tips: 'Great for learning squat form.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex058', name: 'Leg Press', category: 'machine', muscle_groups: ['quads', 'glutes'], equipment: 'machine', instructions: 'Sit in leg press. Push platform away, control return.', tips: 'Don\'t lock knees at top.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex059', name: 'Hack Squat', category: 'machine', muscle_groups: ['quads', 'glutes'], equipment: 'machine', instructions: 'Back against pad. Squat down and press up.', tips: 'Feet lower = more quad, higher = more glute.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex060', name: 'Leg Extension', category: 'machine', muscle_groups: ['quads'], equipment: 'machine', instructions: 'Sit in machine. Extend legs to straight.', tips: 'Squeeze at top, control the negative.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex061', name: 'Bulgarian Split Squat', category: 'dumbbell', muscle_groups: ['quads', 'glutes'], equipment: 'dumbbell', instructions: 'Rear foot on bench. Lunge down and up.', tips: 'Keep front knee tracking forward.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex062', name: 'Walking Lunge', category: 'dumbbell', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'dumbbell', instructions: 'Step forward into lunge. Alternate legs walking forward.', tips: 'Long stride = more glute. Short = more quad.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex063', name: 'Step-Up', category: 'dumbbell', muscle_groups: ['quads', 'glutes'], equipment: 'dumbbell', instructions: 'Step onto elevated platform. Drive through front heel.', tips: 'Don\'t push off back foot.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex064', name: 'Sissy Squat', category: 'bodyweight', muscle_groups: ['quads'], equipment: 'bodyweight', instructions: 'Lean back, bend knees forward over toes.', tips: 'Intense quad isolation.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Legs — Hamstrings ────────────────────────────────────
    { id: 'ex065', name: 'Lying Leg Curl', category: 'machine', muscle_groups: ['hamstrings'], equipment: 'machine', instructions: 'Lie face down. Curl weight toward glutes.', tips: 'Don\'t lift hips off pad.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex066', name: 'Seated Leg Curl', category: 'machine', muscle_groups: ['hamstrings'], equipment: 'machine', instructions: 'Sit, curl pad under thighs. Pull heels toward glutes.', tips: 'Squeeze at full contraction.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex067', name: 'Stiff-Leg Deadlift', category: 'barbell', muscle_groups: ['hamstrings', 'glutes', 'lower_back'], equipment: 'barbell', instructions: 'Like RDL but with straighter legs. Hinge at hips.', tips: 'Deeper stretch than RDL.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex068', name: 'Good Morning', category: 'barbell', muscle_groups: ['hamstrings', 'lower_back', 'glutes'], equipment: 'barbell', instructions: 'Bar on back. Hinge forward until torso parallel.', tips: 'Start light, great posterior chain exercise.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex069', name: 'Nordic Hamstring Curl', category: 'bodyweight', muscle_groups: ['hamstrings'], equipment: 'bodyweight', instructions: 'Kneel, have partner hold ankles. Lower body forward slowly.', tips: 'Gold standard for hamstring strength.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex070', name: 'Dumbbell Romanian Deadlift', category: 'dumbbell', muscle_groups: ['hamstrings', 'glutes'], equipment: 'dumbbell', instructions: 'Hold dumbbells, hinge at hips with slight knee bend.', tips: 'Same form as barbell RDL.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Legs — Glutes ────────────────────────────────────────
    { id: 'ex071', name: 'Hip Thrust', category: 'barbell', muscle_groups: ['glutes', 'hamstrings'], equipment: 'barbell', instructions: 'Back on bench, bar on hips. Drive hips up to full extension.', tips: 'Squeeze glutes hard at top.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex072', name: 'Glute Bridge', category: 'bodyweight', muscle_groups: ['glutes'], equipment: 'bodyweight', instructions: 'Lie flat, feet on floor. Drive hips up.', tips: 'Add dumbbell or band for resistance.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex073', name: 'Cable Pull-Through', category: 'cable', muscle_groups: ['glutes', 'hamstrings'], equipment: 'cable', instructions: 'Face away from cable, pull rope between legs. Hip hinge.', tips: 'Great glute activation drill.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex074', name: 'Sumo Squat', category: 'dumbbell', muscle_groups: ['glutes', 'quads'], equipment: 'dumbbell', instructions: 'Wide stance, toes out. Hold dumbbell between legs. Squat.', tips: 'Keep torso upright.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Legs — Calves ────────────────────────────────────────
    { id: 'ex075', name: 'Standing Calf Raise', category: 'machine', muscle_groups: ['calves'], equipment: 'machine', instructions: 'Stand on platform. Rise onto toes, lower with stretch.', tips: 'Full range: deep stretch at bottom, full contraction at top.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex076', name: 'Seated Calf Raise', category: 'machine', muscle_groups: ['calves'], equipment: 'machine', instructions: 'Sit with pad on thighs. Rise onto toes.', tips: 'Targets soleus more than standing.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex077', name: 'Donkey Calf Raise', category: 'machine', muscle_groups: ['calves'], equipment: 'machine', instructions: 'Lean forward, weight on hips. Rise onto toes.', tips: 'Classic old-school calf exercise.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Core / Abs ───────────────────────────────────────────
    { id: 'ex078', name: 'Crunch', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: 'Lie flat, hands behind head. Curl shoulders off floor.', tips: 'Don\'t pull on neck.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex079', name: 'Plank', category: 'bodyweight', muscle_groups: ['abs', 'obliques'], equipment: 'bodyweight', instructions: 'Forearms and toes. Hold straight body position.', tips: 'Don\'t let hips sag or pike.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex080', name: 'Hanging Leg Raise', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: 'Hang from bar. Raise legs to parallel or higher.', tips: 'Control the swing, slow negatives.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex081', name: 'Cable Crunch', category: 'cable', muscle_groups: ['abs'], equipment: 'cable', instructions: 'Kneel at cable. Crunch down against resistance.', tips: 'Round the spine to engage abs.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex082', name: 'Russian Twist', category: 'bodyweight', muscle_groups: ['obliques', 'abs'], equipment: 'bodyweight', instructions: 'Sit with feet up. Rotate torso side to side.', tips: 'Hold weight for added resistance.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex083', name: 'Ab Rollout', category: 'other', muscle_groups: ['abs'], equipment: 'other', instructions: 'Kneel with ab wheel. Roll forward, pull back.', tips: 'Engage core to prevent low back sag.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex084', name: 'Bicycle Crunch', category: 'bodyweight', muscle_groups: ['abs', 'obliques'], equipment: 'bodyweight', instructions: 'Lie flat. Alternate elbow to opposite knee.', tips: 'Slow and controlled, don\'t rush.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex085', name: 'Side Plank', category: 'bodyweight', muscle_groups: ['obliques', 'abs'], equipment: 'bodyweight', instructions: 'Support on one forearm. Hold body in straight line.', tips: 'Stack feet or stagger for stability.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex086', name: 'Dragon Flag', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: 'Lie on bench holding edges. Raise body stiff, lower slowly.', tips: 'Advanced move. Build up to it.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex087', name: 'Dead Bug', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: 'Lie flat, arms up, knees at 90°. Extend opposite arm and leg.', tips: 'Keep low back pressed into floor.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex088', name: 'Pallof Press', category: 'cable', muscle_groups: ['abs', 'obliques'], equipment: 'cable', instructions: 'Stand perpendicular to cable. Press handle straight out, resist rotation.', tips: 'Great anti-rotation core exercise.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex089', name: 'Woodchopper', category: 'cable', muscle_groups: ['obliques', 'abs'], equipment: 'cable', instructions: 'Rotate torso pulling cable from high to low diagonally.', tips: 'Pivot on feet, power from core.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex090', name: 'Decline Sit-Up', category: 'bodyweight', muscle_groups: ['abs'], equipment: 'bodyweight', instructions: 'Lie on decline bench. Sit up fully.', tips: 'Hold weight plate for added resistance.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Full Body / Olympic ──────────────────────────────────
    { id: 'ex091', name: 'Power Clean', category: 'barbell', muscle_groups: ['full_body', 'traps', 'shoulders'], equipment: 'barbell', instructions: 'From floor, explosively pull bar to shoulders. Catch in front rack.', tips: 'Triple extension: ankles, knees, hips.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex092', name: 'Clean and Jerk', category: 'barbell', muscle_groups: ['full_body'], equipment: 'barbell', instructions: 'Clean bar to shoulders. Dip and drive overhead. Split or power jerk.', tips: 'Learn each phase separately first.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex093', name: 'Snatch', category: 'barbell', muscle_groups: ['full_body'], equipment: 'barbell', instructions: 'Wide grip, pull bar from floor to overhead in one motion.', tips: 'Most technical lift. Start with snatch pulls.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex094', name: 'Thruster', category: 'barbell', muscle_groups: ['quads', 'shoulders', 'glutes'], equipment: 'barbell', instructions: 'Front squat into overhead press in one movement.', tips: 'Use the squat momentum to drive the press.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex095', name: 'Burpee', category: 'bodyweight', muscle_groups: ['full_body'], equipment: 'bodyweight', instructions: 'Squat, jump feet back, push-up, jump feet forward, jump up.', tips: 'Maintain form even when tired.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex096', name: 'Kettlebell Swing', category: 'other', muscle_groups: ['glutes', 'hamstrings', 'abs'], equipment: 'kettlebell', instructions: 'Hinge at hips, swing kettlebell to chest height.', tips: 'Power from hips, not arms.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex097', name: 'Turkish Get-Up', category: 'other', muscle_groups: ['full_body', 'shoulders', 'abs'], equipment: 'kettlebell', instructions: 'Lie flat holding weight overhead. Stand up while keeping weight up.', tips: 'Go slow. Great for stability.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex098', name: 'Man Maker', category: 'dumbbell', muscle_groups: ['full_body'], equipment: 'dumbbell', instructions: 'Push-up position on DBs. Row each side, push-up, clean, press.', tips: 'Ultimate full body movement.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex099', name: 'Battle Ropes', category: 'other', muscle_groups: ['full_body', 'shoulders', 'abs'], equipment: 'other', instructions: 'Hold rope ends. Alternate arm waves, double waves, or slams.', tips: 'Great conditioning finisher.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex100', name: 'Box Jump', category: 'bodyweight', muscle_groups: ['quads', 'glutes', 'calves'], equipment: 'bodyweight', instructions: 'Jump onto box with both feet. Stand fully, step down.', tips: 'Focus on soft landing.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Cardio ───────────────────────────────────────────────
    { id: 'ex101', name: 'Treadmill Run', category: 'cardio', muscle_groups: ['full_body'], equipment: 'machine', instructions: 'Run at chosen pace and incline.', tips: 'Vary speeds and inclines for intervals.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex102', name: 'Stationary Bike', category: 'cardio', muscle_groups: ['quads', 'hamstrings'], equipment: 'machine', instructions: 'Pedal at chosen resistance.', tips: 'Good for low-impact cardio.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex103', name: 'Rowing Machine', category: 'cardio', muscle_groups: ['full_body', 'back', 'quads'], equipment: 'machine', instructions: 'Drive with legs, pull handle to chest, lean back, return.', tips: 'Legs-back-arms, then arms-back-legs.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex104', name: 'Elliptical', category: 'cardio', muscle_groups: ['full_body'], equipment: 'machine', instructions: 'Move arms and legs in elliptical motion.', tips: 'Low impact, full body movement.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex105', name: 'Stair Climber', category: 'cardio', muscle_groups: ['quads', 'glutes', 'calves'], equipment: 'machine', instructions: 'Climb stairs at chosen pace.', tips: 'Great for lower body and cardio.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex106', name: 'Jump Rope', category: 'cardio', muscle_groups: ['calves', 'full_body'], equipment: 'other', instructions: 'Jump over rope with both feet or alternating.', tips: 'Start with basic bounce, progress to double-unders.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex107', name: 'Mountain Climbers', category: 'bodyweight', muscle_groups: ['abs', 'quads', 'shoulders'], equipment: 'bodyweight', instructions: 'Plank position. Alternate driving knees to chest.', tips: 'Keep hips level, fast pace for cardio.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex108', name: 'Jumping Jack', category: 'bodyweight', muscle_groups: ['full_body'], equipment: 'bodyweight', instructions: 'Jump feet out while raising arms. Jump back together.', tips: 'Good warm-up or active recovery.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Stretching / Mobility ────────────────────────────────
    { id: 'ex109', name: 'Foam Roll Quads', category: 'stretching', muscle_groups: ['quads'], equipment: 'other', instructions: 'Lie face down on foam roller. Roll from hip to knee.', tips: 'Pause on tender spots for 30s.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex110', name: 'Foam Roll IT Band', category: 'stretching', muscle_groups: ['quads', 'glutes'], equipment: 'other', instructions: 'Side-lying on roller. Roll outer thigh from hip to knee.', tips: 'This will be intense. Breathe through it.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex111', name: 'Pigeon Stretch', category: 'stretching', muscle_groups: ['glutes', 'hamstrings'], equipment: 'bodyweight', instructions: 'Front leg bent at 90°, back leg extended. Lean forward.', tips: 'Hold for 60-90 seconds each side.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex112', name: 'Cat-Cow Stretch', category: 'stretching', muscle_groups: ['lower_back', 'abs'], equipment: 'bodyweight', instructions: 'On all fours. Alternate arching and rounding spine.', tips: 'Great morning mobility routine.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex113', name: 'World\'s Greatest Stretch', category: 'stretching', muscle_groups: ['full_body'], equipment: 'bodyweight', instructions: 'Lunge forward, rotate torso, reach overhead. Alternate sides.', tips: 'Perfect dynamic warm-up move.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex114', name: 'Hip Flexor Stretch', category: 'stretching', muscle_groups: ['quads', 'abs'], equipment: 'bodyweight', instructions: 'Half-kneeling position. Push hips forward.', tips: 'Squeeze glute on rear leg side.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex115', name: 'Shoulder Dislocate', category: 'stretching', muscle_groups: ['shoulders'], equipment: 'band', instructions: 'Hold band wide. Pass it over head and behind back.', tips: 'Widen grip if too tight.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex116', name: 'Thoracic Spine Extension', category: 'stretching', muscle_groups: ['back', 'shoulders'], equipment: 'other', instructions: 'Lie on foam roller across upper back. Extend over roller.', tips: 'Great for desk workers.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Additional compounds & variations ────────────────────
    { id: 'ex117', name: 'Trap Bar Deadlift', category: 'barbell', muscle_groups: ['quads', 'glutes', 'back', 'hamstrings'], equipment: 'barbell', instructions: 'Stand inside trap bar. Grip handles, drive up.', tips: 'More quad-friendly than conventional.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex118', name: 'Deficit Deadlift', category: 'barbell', muscle_groups: ['back', 'hamstrings', 'glutes'], equipment: 'barbell', instructions: 'Stand on elevated surface. Deadlift with increased ROM.', tips: 'Builds strength off the floor.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex119', name: 'Pause Squat', category: 'barbell', muscle_groups: ['quads', 'glutes'], equipment: 'barbell', instructions: 'Squat down, pause 2-3 seconds at bottom, drive up.', tips: 'Builds bottom-end strength.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex120', name: 'Pin Squat', category: 'barbell', muscle_groups: ['quads', 'glutes'], equipment: 'barbell', instructions: 'Set safety pins at parallel. Squat down to pins, pause, drive up.', tips: 'Eliminates stretch reflex.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex121', name: 'Zercher Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'abs', 'back'], equipment: 'barbell', instructions: 'Hold bar in crook of elbows. Squat.', tips: 'Brutal core engagement.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex122', name: 'Safety Bar Squat', category: 'barbell', muscle_groups: ['quads', 'glutes'], equipment: 'barbell', instructions: 'Use safety squat bar. Squat as normal.', tips: 'Easier on shoulders than regular bar.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex123', name: 'Landmine Press', category: 'barbell', muscle_groups: ['shoulders', 'chest', 'triceps'], equipment: 'barbell', instructions: 'Press barbell end overhead in arc motion.', tips: 'Shoulder-friendly pressing alternative.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex124', name: 'Landmine Row', category: 'barbell', muscle_groups: ['back', 'biceps'], equipment: 'barbell', instructions: 'Straddle barbell end. Row toward chest.', tips: 'Neutral grip, easy on wrists.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex125', name: 'Dumbbell Pullover', category: 'dumbbell', muscle_groups: ['chest', 'lats'], equipment: 'dumbbell', instructions: 'Lie across bench. Hold DB overhead, lower behind head, pull back.', tips: 'Great for serratus and rib cage expansion.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex126', name: 'Meadows Row', category: 'barbell', muscle_groups: ['lats', 'back'], equipment: 'barbell', instructions: 'Stand perpendicular to landmine. Row with far arm.', tips: 'Great lat stretch and contraction.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex127', name: 'Chest-Supported Row', category: 'dumbbell', muscle_groups: ['back', 'lats'], equipment: 'dumbbell', instructions: 'Lie face down on incline bench. Row dumbbells up.', tips: 'Removes momentum and low back stress.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex128', name: 'Incline Dumbbell Fly', category: 'dumbbell', muscle_groups: ['chest'], equipment: 'dumbbell', instructions: 'Incline bench, open arms wide in arc, squeeze together at top.', tips: 'Targets upper chest.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex129', name: 'Floor Press', category: 'barbell', muscle_groups: ['chest', 'triceps'], equipment: 'barbell', instructions: 'Lie on floor. Press bar from chest, arms stop at floor.', tips: 'Limits ROM to top portion — great for lockout strength.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex130', name: 'JM Press', category: 'barbell', muscle_groups: ['triceps'], equipment: 'barbell', instructions: 'Hybrid skull crusher / close-grip bench. Lower to chin area.', tips: 'Incredible tricep builder.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex131', name: 'Reverse Lunge', category: 'dumbbell', muscle_groups: ['quads', 'glutes'], equipment: 'dumbbell', instructions: 'Step backward into lunge. Drive off front foot to stand.', tips: 'Easier on knees than forward lunge.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex132', name: 'Lateral Lunge', category: 'dumbbell', muscle_groups: ['quads', 'glutes'], equipment: 'dumbbell', instructions: 'Step wide to side, bend stepping knee. Push back to start.', tips: 'Great for adductor mobility.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex133', name: 'Single-Leg RDL', category: 'dumbbell', muscle_groups: ['hamstrings', 'glutes'], equipment: 'dumbbell', instructions: 'Stand on one leg. Hinge forward, opposite leg goes back.', tips: 'Great for balance and hamstring unilateral work.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex134', name: 'Glute-Ham Raise', category: 'bodyweight', muscle_groups: ['hamstrings', 'glutes'], equipment: 'machine', instructions: 'Position on GHD machine. Lower body forward, curl back up.', tips: 'Use hamstrings and glutes to pull up.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex135', name: 'Leg Curl with Band', category: 'other', muscle_groups: ['hamstrings'], equipment: 'band', instructions: 'Anchor band. Lie face down, curl heel toward glute against band.', tips: 'Portable hamstring work.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex136', name: 'Cable Lateral Lunge', category: 'cable', muscle_groups: ['quads', 'glutes'], equipment: 'cable', instructions: 'Anchor cable low. Step out to side against resistance.', tips: 'Add adductor work to leg day.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex137', name: 'Smith Machine Squat', category: 'machine', muscle_groups: ['quads', 'glutes'], equipment: 'machine', instructions: 'Bar on upper back in Smith machine. Squat.', tips: 'Feet slightly forward for quad focus.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex138', name: 'Cable Woodchop Low-to-High', category: 'cable', muscle_groups: ['obliques', 'abs'], equipment: 'cable', instructions: 'Set cable low. Rotate torso pulling from low to high diagonally.', tips: 'Power from rotation, not arms.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex139', name: 'Reverse Fly (Dumbbell)', category: 'dumbbell', muscle_groups: ['shoulders', 'back'], equipment: 'dumbbell', instructions: 'Bent over, raise dumbbells out to sides.', tips: 'Great for rear delts and posture.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex140', name: 'Band Pull-Apart', category: 'other', muscle_groups: ['shoulders', 'back'], equipment: 'band', instructions: 'Hold band in front. Pull apart to sides, squeeze shoulder blades.', tips: 'Do 100 daily for shoulder health.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Kettlebell ────────────────────────────────────────────
    { id: 'ex141', name: 'Kettlebell Goblet Squat', category: 'other', muscle_groups: ['quads', 'glutes'], equipment: 'kettlebell', instructions: 'Hold KB at chest. Squat deep.', tips: 'Great for squat depth and form.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex142', name: 'Kettlebell Clean', category: 'other', muscle_groups: ['full_body'], equipment: 'kettlebell', instructions: 'Swing KB from between legs to rack position at shoulder.', tips: 'Don\'t bang your wrist — rotate the bell.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex143', name: 'Kettlebell Snatch', category: 'other', muscle_groups: ['full_body', 'shoulders'], equipment: 'kettlebell', instructions: 'Swing KB from between legs to overhead in one motion.', tips: 'The "tsar" of KB exercises.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex144', name: 'Kettlebell Windmill', category: 'other', muscle_groups: ['obliques', 'shoulders'], equipment: 'kettlebell', instructions: 'KB overhead, hinge sideways touching floor with free hand.', tips: 'Great for core and shoulder stability.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex145', name: 'Kettlebell Press', category: 'other', muscle_groups: ['shoulders', 'triceps'], equipment: 'kettlebell', instructions: 'From rack position, press KB overhead.', tips: 'Squeeze glute on pressing side.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── More Machines ────────────────────────────────────────
    { id: 'ex146', name: 'Smith Machine Overhead Press', category: 'machine', muscle_groups: ['shoulders', 'triceps'], equipment: 'machine', instructions: 'Seated or standing. Press bar overhead in Smith machine.', tips: 'Good for heavy overhead work with safety.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex147', name: 'Machine Shoulder Press', category: 'machine', muscle_groups: ['shoulders', 'triceps'], equipment: 'machine', instructions: 'Sit, grip handles at shoulder height. Press up.', tips: 'Stable pressing for shoulder work.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex148', name: 'Machine Lat Pulldown (Close Grip)', category: 'machine', muscle_groups: ['lats', 'biceps'], equipment: 'machine', instructions: 'Use close/neutral grip attachment. Pull to upper chest.', tips: 'Emphasizes lower lats.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex149', name: 'Cable Face Pull with External Rotation', category: 'cable', muscle_groups: ['shoulders', 'traps'], equipment: 'cable', instructions: 'Pull rope to face, then rotate hands up to "double bicep" pose.', tips: 'Best shoulder prehab exercise.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex150', name: 'Machine Preacher Curl', category: 'machine', muscle_groups: ['biceps'], equipment: 'machine', instructions: 'Sit at preacher curl machine. Curl handle up.', tips: 'Controlled eccentric for growth.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── Calisthenics / Advanced Bodyweight ────────────────────
    { id: 'ex151', name: 'Muscle-Up', category: 'bodyweight', muscle_groups: ['lats', 'chest', 'triceps'], equipment: 'bodyweight', instructions: 'Pull up explosively, transition over bar, dip to lockout.', tips: 'Requires kip or strict strength. Advanced.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex152', name: 'Pistol Squat', category: 'bodyweight', muscle_groups: ['quads', 'glutes'], equipment: 'bodyweight', instructions: 'Single leg squat, other leg extended forward.', tips: 'Start with assisted version.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex153', name: 'Handstand Push-Up', category: 'bodyweight', muscle_groups: ['shoulders', 'triceps'], equipment: 'bodyweight', instructions: 'In handstand against wall. Lower head to floor, press up.', tips: 'Build to freestanding over time.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex154', name: 'L-Sit', category: 'bodyweight', muscle_groups: ['abs', 'quads'], equipment: 'bodyweight', instructions: 'Support on parallel bars or floor. Hold legs straight out.', tips: 'Incredible core and hip flexor strength.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex155', name: 'Archer Push-Up', category: 'bodyweight', muscle_groups: ['chest', 'triceps'], equipment: 'bodyweight', instructions: 'Wide hand push-up, shift weight to one arm alternating.', tips: 'Progression toward one-arm push-up.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex156', name: 'Front Lever', category: 'bodyweight', muscle_groups: ['lats', 'abs', 'back'], equipment: 'bodyweight', instructions: 'Hang from bar. Hold body horizontal, face up.', tips: 'Progress through tuck, single leg, full.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex157', name: 'Back Lever', category: 'bodyweight', muscle_groups: ['shoulders', 'back', 'abs'], equipment: 'bodyweight', instructions: 'Hang from bar. Hold body horizontal, face down.', tips: 'Requires strong shoulder extension.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex158', name: 'Inverted Row', category: 'bodyweight', muscle_groups: ['back', 'biceps'], equipment: 'bodyweight', instructions: 'Hang under bar, body straight. Pull chest to bar.', tips: 'Great pull-up regression.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex159', name: 'Pike Push-Up', category: 'bodyweight', muscle_groups: ['shoulders', 'triceps'], equipment: 'bodyweight', instructions: 'Hips high in pike position. Lower head to floor, press up.', tips: 'Progression toward handstand push-up.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex160', name: 'Bear Crawl', category: 'bodyweight', muscle_groups: ['full_body', 'shoulders', 'abs'], equipment: 'bodyweight', instructions: 'On all fours, knees off ground. Crawl forward.', tips: 'Great for core stability and conditioning.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Additional Isolation / Variation ──────────────────────
    { id: 'ex161', name: 'Spider Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: 'Lie face down on incline bench. Curl dumbbells with arms hanging.', tips: 'Eliminates all momentum.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex162', name: 'Bayesian Curl', category: 'cable', muscle_groups: ['biceps'], equipment: 'cable', instructions: 'Stand facing away from cable, arm behind. Curl forward.', tips: 'Great long head bicep stretch.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex163', name: 'Cross-Body Hammer Curl', category: 'dumbbell', muscle_groups: ['biceps', 'forearms'], equipment: 'dumbbell', instructions: 'Curl dumbbell across body toward opposite shoulder.', tips: 'Targets brachialis.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex164', name: 'Behind-the-Back Wrist Curl', category: 'barbell', muscle_groups: ['forearms'], equipment: 'barbell', instructions: 'Hold barbell behind back. Curl wrists up.', tips: 'Great forearm mass builder.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex165', name: 'Cable Fly (Low-to-High)', category: 'cable', muscle_groups: ['chest'], equipment: 'cable', instructions: 'Set pulleys low. Bring handles up and together in arc.', tips: 'Targets upper chest.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex166', name: 'Dumbbell Lateral Raise (Leaning)', category: 'dumbbell', muscle_groups: ['shoulders'], equipment: 'dumbbell', instructions: 'Hold a pole for balance, lean away. Lateral raise.', tips: 'Increases ROM and constant tension.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex167', name: 'Lu Raise', category: 'dumbbell', muscle_groups: ['shoulders'], equipment: 'dumbbell', instructions: 'Front raise to overhead, then lateral lower to sides.', tips: 'Full shoulder activation.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex168', name: 'Zottman Curl', category: 'dumbbell', muscle_groups: ['biceps', 'forearms'], equipment: 'dumbbell', instructions: 'Curl up supinated, rotate to pronated at top, lower pronated.', tips: 'Best of both curl worlds.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex169', name: 'Behind-the-Neck Press', category: 'barbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', instructions: 'Press barbell from behind neck overhead.', tips: 'Only if you have good shoulder mobility.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex170', name: 'Lying Tricep Extension (DB)', category: 'dumbbell', muscle_groups: ['triceps'], equipment: 'dumbbell', instructions: 'Lie flat, extend dumbbells from beside head to overhead.', tips: 'Control the negative for growth.', image_url: null, is_compound: false, is_custom: false, user_id: null },

    // ── HIIT / Conditioning ──────────────────────────────────
    { id: 'ex171', name: 'Sled Push', category: 'other', muscle_groups: ['quads', 'glutes', 'calves'], equipment: 'other', instructions: 'Push weighted sled across floor.', tips: 'Low handles = more quads. High = full body.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex172', name: 'Sled Pull', category: 'other', muscle_groups: ['back', 'hamstrings', 'biceps'], equipment: 'other', instructions: 'Pull sled toward you using rope or handles.', tips: 'Great for back and grip.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex173', name: 'Assault Bike', category: 'cardio', muscle_groups: ['full_body'], equipment: 'machine', instructions: 'Pedal and push/pull arms simultaneously.', tips: 'The hardest cardio machine. Use for intervals.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex174', name: 'Ski Erg', category: 'cardio', muscle_groups: ['lats', 'abs', 'triceps'], equipment: 'machine', instructions: 'Pull handles down in ski-like motion.', tips: 'Great for upper body conditioning.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex175', name: 'Wall Ball', category: 'other', muscle_groups: ['quads', 'shoulders', 'full_body'], equipment: 'other', instructions: 'Squat holding medicine ball. Stand and throw to target on wall.', tips: 'Classic CrossFit movement.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex176', name: 'Sprawl', category: 'bodyweight', muscle_groups: ['full_body'], equipment: 'bodyweight', instructions: 'Like a burpee without the push-up. Sprawl back, jump up.', tips: 'Fast-paced conditioning.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex177', name: 'High Knees', category: 'bodyweight', muscle_groups: ['abs', 'quads'], equipment: 'bodyweight', instructions: 'Run in place, driving knees high.', tips: 'Good warm-up or HIIT interval.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex178', name: 'Broad Jump', category: 'bodyweight', muscle_groups: ['quads', 'glutes', 'calves'], equipment: 'bodyweight', instructions: 'Jump forward as far as possible from standing.', tips: 'Swing arms for momentum.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex179', name: 'Tuck Jump', category: 'bodyweight', muscle_groups: ['quads', 'abs'], equipment: 'bodyweight', instructions: 'Jump and pull knees to chest mid-air.', tips: 'Explosive plyometric.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex180', name: 'Split Jump', category: 'bodyweight', muscle_groups: ['quads', 'glutes'], equipment: 'bodyweight', instructions: 'Lunge position. Jump and switch legs mid-air.', tips: 'Land softly in lunge.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── More Cable / Machine Isolation ────────────────────────
    { id: 'ex181', name: 'Cable Bicep Curl (Rope)', category: 'cable', muscle_groups: ['biceps'], equipment: 'cable', instructions: 'Curl rope attachment from low cable.', tips: 'Separate rope ends at top for peak contraction.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex182', name: 'Cable Tricep Kickback', category: 'cable', muscle_groups: ['triceps'], equipment: 'cable', instructions: 'Hinge forward, extend cable behind you.', tips: 'Constant tension version of DB kickback.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex183', name: 'Machine Hip Adductor', category: 'machine', muscle_groups: ['quads'], equipment: 'machine', instructions: 'Sit in machine, squeeze legs together.', tips: 'Good inner thigh work.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex184', name: 'Machine Hip Abductor', category: 'machine', muscle_groups: ['glutes'], equipment: 'machine', instructions: 'Sit in machine, push legs apart.', tips: 'Lean forward slightly for more glute medius.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex185', name: 'Hack Squat Calf Raise', category: 'machine', muscle_groups: ['calves'], equipment: 'machine', instructions: 'In hack squat, rise on toes with loaded weight.', tips: 'Heavy calf work.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex186', name: 'V-Squat Machine', category: 'machine', muscle_groups: ['quads', 'glutes'], equipment: 'machine', instructions: 'Stand in V-squat machine. Squat down and press up.', tips: 'Similar to hack squat, different angle.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex187', name: 'Pendulum Squat', category: 'machine', muscle_groups: ['quads'], equipment: 'machine', instructions: 'In pendulum machine, squat deep with body on arc path.', tips: 'Great quad isolation with safety.', image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: 'ex188', name: 'Reverse Hack Squat', category: 'machine', muscle_groups: ['glutes', 'hamstrings'], equipment: 'machine', instructions: 'Face into hack squat machine. Squat.', tips: 'Shifts focus to posterior chain.', image_url: null, is_compound: true, is_custom: false, user_id: null },

    // ── Yoga / Pilates / Mobility ─────────────────────────────
    { id: 'ex189', name: 'Downward Dog', category: 'stretching', muscle_groups: ['hamstrings', 'shoulders', 'calves'], equipment: 'bodyweight', instructions: 'Hands and feet on floor, hips high forming inverted V.', tips: 'Press heels toward floor.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex190', name: 'Warrior I', category: 'stretching', muscle_groups: ['quads', 'shoulders'], equipment: 'bodyweight', instructions: 'Lunge position, back foot angled. Arms overhead.', tips: 'Square hips forward.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex191', name: 'Warrior II', category: 'stretching', muscle_groups: ['quads', 'shoulders'], equipment: 'bodyweight', instructions: 'Wide stance, front knee bent 90°. Arms extended to sides.', tips: 'Gaze over front hand.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex192', name: 'Child\'s Pose', category: 'stretching', muscle_groups: ['lower_back', 'shoulders'], equipment: 'bodyweight', instructions: 'Kneel, sit back on heels, reach arms forward on floor.', tips: 'Great for recovery and relaxation.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex193', name: 'Cobra Stretch', category: 'stretching', muscle_groups: ['abs', 'lower_back'], equipment: 'bodyweight', instructions: 'Lie face down. Press up, extending spine back.', tips: 'Don\'t compress lower back.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex194', name: 'Thread the Needle', category: 'stretching', muscle_groups: ['back', 'shoulders'], equipment: 'bodyweight', instructions: 'On all fours. Reach one arm under body, rotating torso.', tips: 'Great thoracic rotation stretch.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex195', name: '90/90 Hip Stretch', category: 'stretching', muscle_groups: ['glutes', 'quads'], equipment: 'bodyweight', instructions: 'Sit with front and back legs at 90°. Lean forward over front leg.', tips: 'Amazing hip opener.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex196', name: 'Banded Hip Opener', category: 'stretching', muscle_groups: ['glutes', 'quads'], equipment: 'band', instructions: 'Band around thighs. Open knees against resistance.', tips: 'Activates glute medius.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex197', name: 'Couch Stretch', category: 'stretching', muscle_groups: ['quads', 'abs'], equipment: 'bodyweight', instructions: 'Foot on wall/couch behind. Lunge forward.', tips: 'Intense hip flexor and quad stretch.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex198', name: 'Jefferson Curl', category: 'stretching', muscle_groups: ['hamstrings', 'lower_back'], equipment: 'barbell', instructions: 'Stand on platform. Roll spine down one vertebra at a time, return.', tips: 'Start with bodyweight only. Progressive spinal flexibility.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex199', name: 'Scorpion Stretch', category: 'stretching', muscle_groups: ['quads', 'abs', 'shoulders'], equipment: 'bodyweight', instructions: 'Lie face down. Lift one foot, rotate it toward opposite hand.', tips: 'Great full body mobility.', image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: 'ex200', name: 'Wall Angels', category: 'stretching', muscle_groups: ['shoulders', 'back'], equipment: 'bodyweight', instructions: 'Back against wall. Slide arms up and down maintaining wall contact.', tips: 'Shoulder mobility gold. Do daily.', image_url: null, is_compound: false, is_custom: false, user_id: null },
];
