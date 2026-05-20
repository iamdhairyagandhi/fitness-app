import type { Equipment, Exercise, ExerciseCategory, MuscleGroup } from '@/types';

const FREE_EXERCISE_DB_URL =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FREE_EXERCISE_IMAGE_BASE =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export const EXERCISE_DIRECTORY_SOURCE = {
    name: 'Free Exercise DB',
    license: 'Unlicense / public domain',
    url: 'https://github.com/yuhonas/free-exercise-db',
};

type FreeExercise = {
    id: string;
    name: string;
    force: string | null;
    level: 'beginner' | 'intermediate' | 'expert' | null;
    mechanic: 'compound' | 'isolation' | null;
    equipment: string | null;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    instructions: string[];
    category: string;
    images: string[];
};

export type DirectoryExercise = Exercise & {
    level: string | null;
    force: string | null;
    mechanic: string | null;
    directory_source: typeof EXERCISE_DIRECTORY_SOURCE.name;
    gallery: string[];
};

let exerciseDirectoryPromise: Promise<DirectoryExercise[]> | null = null;
let exerciseDirectoryCache: DirectoryExercise[] | null = null;

const MUSCLE_MAP: Record<string, MuscleGroup> = {
    abdominals: 'abs',
    abductors: 'glutes',
    adductors: 'quads',
    biceps: 'biceps',
    calves: 'calves',
    chest: 'chest',
    forearms: 'forearms',
    glutes: 'glutes',
    hamstrings: 'hamstrings',
    lats: 'lats',
    'lower back': 'lower_back',
    'middle back': 'back',
    neck: 'traps',
    quadriceps: 'quads',
    shoulders: 'shoulders',
    traps: 'traps',
    triceps: 'triceps',
};

const EQUIPMENT_MAP: Record<string, Equipment> = {
    bands: 'band',
    barbell: 'barbell',
    'body only': 'bodyweight',
    cable: 'cable',
    dumbbell: 'dumbbell',
    kettlebells: 'kettlebell',
    machine: 'machine',
    'medicine ball': 'other',
    other: 'other',
    'e-z curl bar': 'barbell',
    'exercise ball': 'other',
    'foam roll': 'other',
};

const CATEGORY_MAP: Record<string, ExerciseCategory> = {
    cardio: 'cardio',
    olympic: 'barbell',
    plyometrics: 'bodyweight',
    powerlifting: 'barbell',
    strength: 'other',
    stretching: 'stretching',
    strongman: 'other',
};

function titleCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function mapMuscles(primary: string[], secondary: string[]) {
    return Array.from(
        new Set(
            [...primary, ...secondary]
                .map((muscle) => MUSCLE_MAP[muscle.toLowerCase()])
                .filter(Boolean)
        )
    ) as MuscleGroup[];
}

function mapExercise(item: FreeExercise): DirectoryExercise {
    const gallery = item.images.map((image) => `${FREE_EXERCISE_IMAGE_BASE}${image}`);
    const muscleGroups = mapMuscles(item.primaryMuscles, item.secondaryMuscles);
    const equipment = item.equipment ? EQUIPMENT_MAP[item.equipment.toLowerCase()] : undefined;

    return {
        id: `free-db:${item.id}`,
        name: titleCase(item.name),
        category: CATEGORY_MAP[item.category.toLowerCase()] || 'other',
        muscle_groups: muscleGroups.length ? muscleGroups : ['full_body'],
        equipment: equipment || 'other',
        instructions: item.instructions.join('\n'),
        tips: item.level ? `${titleCase(item.level)} level movement` : null,
        image_url: gallery[0] || null,
        is_compound: item.mechanic === 'compound',
        is_custom: false,
        user_id: null,
        level: item.level,
        force: item.force,
        mechanic: item.mechanic,
        directory_source: EXERCISE_DIRECTORY_SOURCE.name,
        gallery,
    };
}

export async function fetchOpenExerciseDirectory(limit?: number): Promise<DirectoryExercise[]> {
    if (!limit && exerciseDirectoryCache) return exerciseDirectoryCache;
    if (!limit && exerciseDirectoryPromise) return exerciseDirectoryPromise;

    const loadPromise = fetch(FREE_EXERCISE_DB_URL)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Exercise directory failed: ${response.status}`);
            }

            const data = (await response.json()) as FreeExercise[];
            const mapped = (limit ? data.slice(0, limit) : data).map(mapExercise);
            if (!limit) exerciseDirectoryCache = mapped;
            return mapped;
        })
        .finally(() => {
            if (!limit) exerciseDirectoryPromise = null;
        });

    if (!limit) exerciseDirectoryPromise = loadPromise;
    return loadPromise;
}
