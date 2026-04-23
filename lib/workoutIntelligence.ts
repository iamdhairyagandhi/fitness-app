// ── Workout Intelligence Engine ──────────────────────────────
// Phase B: Auto-progression, deload detection, strength standards,
// VO2 max estimation, heart rate zones, training volume analysis
// ─────────────────────────────────────────────────────────────

import type {
    Exercise,
    ExperienceLevel,
    MuscleGroup,
    PersonalRecord,
    RecoveryLog,
    WorkoutSession,
    WorkoutSessionExercise,
    WorkoutSet,
} from '@/types';

// ── Types ────────────────────────────────────────────────────

export type WorkoutMode = 'standard' | 'superset' | 'circuit' | 'emom' | 'amrap';

export interface ProgressionSuggestion {
    exerciseId: string;
    exerciseName: string;
    previousWeight: number;
    previousReps: number;
    previousSets: number;
    suggestedWeight: number;
    suggestedReps: number;
    suggestedSets: number;
    reason: string;
    type: 'weight_increase' | 'rep_increase' | 'set_increase' | 'deload' | 'maintain';
}

export interface ProgressionRule {
    exerciseId: string;
    strategy: 'linear' | 'double_progression' | 'wave' | 'rpe_based';
    weightIncrementKg: number;
    repRange: [number, number]; // e.g. [8, 12]
    targetRPE: number | null;
}

export interface DeloadRecommendation {
    shouldDeload: boolean;
    reason: string;
    weeklyVolumes: number[];
    fatigueRatio: number;
    suggestedReduction: number; // percentage
}

export interface StrengthLevel {
    exercise: string;
    estimated1RM: number;
    bodyweightRatio: number;
    level: 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';
    percentile: number;
    nextLevel: string;
    nextLevelWeight: number;
}

export interface WeeklyVolume {
    weekStart: string;
    totalSets: number;
    totalVolume: number;
    muscleGroupVolume: Record<string, number>;
}

export interface CardioSession {
    id: string;
    type: 'run' | 'cycle' | 'walk' | 'hike' | 'swim';
    startedAt: string;
    completedAt: string | null;
    durationSeconds: number;
    distanceMeters: number;
    elevationGainMeters: number;
    avgPaceMinPerKm: number;
    avgSpeedKmh: number;
    calories: number;
    avgHeartRate: number | null;
    maxHeartRate: number | null;
    routeCoords: { lat: number; lng: number; alt?: number; timestamp: number }[];
    splits: { km: number; paceMinPerKm: number; elevationDelta: number }[];
}

export interface VO2MaxEstimate {
    value: number;
    method: 'cooper' | 'rockport' | 'hr_based';
    fitnessLevel: string;
    percentile: number;
    date: string;
}

export type HRZone = 1 | 2 | 3 | 4 | 5;

export interface HeartRateZones {
    maxHR: number;
    restingHR: number;
    zones: {
        zone: HRZone;
        name: string;
        minBPM: number;
        maxBPM: number;
        description: string;
        color: string;
    }[];
}

export interface WarmUpExercise {
    name: string;
    duration: string;
    reps: string;
    instructions: string;
    type: 'dynamic_stretch' | 'activation' | 'mobility' | 'cardio_warmup';
}

export interface CoolDownExercise {
    name: string;
    duration: string;
    instructions: string;
    type: 'static_stretch' | 'foam_roll' | 'breathing';
}

// ── 1. Auto-Progression Engine ───────────────────────────────

const DEFAULT_INCREMENTS: Record<string, number> = {
    barbell: 2.5,
    dumbbell: 2.0,
    machine: 2.5,
    cable: 2.5,
    bodyweight: 0,
    kettlebell: 4.0,
    band: 0,
    other: 2.5,
    none: 0,
};

export function getDefaultProgressionRule(exercise: Exercise): ProgressionRule {
    const isCompound = exercise.is_compound;
    const equipment = exercise.equipment || 'other';

    return {
        exerciseId: exercise.id,
        strategy: isCompound ? 'linear' : 'double_progression',
        weightIncrementKg: DEFAULT_INCREMENTS[equipment] ?? 2.5,
        repRange: isCompound ? [3, 6] : [8, 12],
        targetRPE: null,
    };
}

export function generateProgressionSuggestions(
    recentWorkouts: WorkoutSession[],
    exercises: Exercise[],
    customRules?: Record<string, ProgressionRule>,
): ProgressionSuggestion[] {
    const suggestions: ProgressionSuggestion[] = [];

    // Group last two sessions' exercises
    const exerciseHistory = buildExerciseHistory(recentWorkouts);

    for (const [exerciseId, sessions] of Object.entries(exerciseHistory)) {
        if (sessions.length < 1) continue;
        const latest = sessions[0];
        const previous = sessions.length > 1 ? sessions[1] : null;

        const exercise = exercises.find((e) => e.id === exerciseId);
        if (!exercise) continue;

        const rule = customRules?.[exerciseId] ?? getDefaultProgressionRule(exercise);
        const suggestion = computeProgression(exercise, latest, previous, rule);
        if (suggestion) suggestions.push(suggestion);
    }

    return suggestions;
}

function buildExerciseHistory(
    workouts: WorkoutSession[],
): Record<string, WorkoutSessionExercise[]> {
    const history: Record<string, WorkoutSessionExercise[]> = {};

    // Sort workouts newest first
    const sorted = [...workouts].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

    for (const workout of sorted) {
        for (const ex of workout.exercises) {
            if (!history[ex.exercise_id]) history[ex.exercise_id] = [];
            if (history[ex.exercise_id].length < 5) {
                history[ex.exercise_id].push(ex);
            }
        }
    }

    return history;
}

function computeProgression(
    exercise: Exercise,
    latest: WorkoutSessionExercise,
    previous: WorkoutSessionExercise | null,
    rule: ProgressionRule,
): ProgressionSuggestion | null {
    const completedSets = latest.sets.filter((s) => s.completed && s.set_type === 'normal');
    if (completedSets.length === 0) return null;

    const avgWeight = avg(completedSets.map((s) => s.weight_kg ?? 0));
    const avgReps = avg(completedSets.map((s) => s.reps ?? 0));
    const setCount = completedSets.length;
    const [minRep, maxRep] = rule.repRange;

    // Check if all sets hit top of rep range → increase weight
    const allHitMax = completedSets.every((s) => (s.reps ?? 0) >= maxRep);
    // Check if struggling (below minimum reps)
    const struggling = completedSets.some((s) => (s.reps ?? 0) < minRep);

    if (struggling) {
        return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            previousWeight: avgWeight,
            previousReps: Math.round(avgReps),
            previousSets: setCount,
            suggestedWeight: Math.round(avgWeight * 0.9 * 2) / 2,
            suggestedReps: maxRep,
            suggestedSets: setCount,
            reason: `You struggled at ${avgWeight}kg. Try reducing to ${Math.round(avgWeight * 0.9 * 2) / 2}kg and build back up.`,
            type: 'deload',
        };
    }

    if (allHitMax && rule.strategy === 'double_progression') {
        // Double progression: increase weight, drop to min reps
        const newWeight = roundToNearest(avgWeight + rule.weightIncrementKg, rule.weightIncrementKg);
        return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            previousWeight: avgWeight,
            previousReps: Math.round(avgReps),
            previousSets: setCount,
            suggestedWeight: newWeight,
            suggestedReps: minRep,
            suggestedSets: setCount,
            reason: `Hit ${maxRep} reps on all sets! Increase to ${newWeight}kg and work from ${minRep} reps.`,
            type: 'weight_increase',
        };
    }

    if (allHitMax && rule.strategy === 'linear') {
        const newWeight = roundToNearest(avgWeight + rule.weightIncrementKg, rule.weightIncrementKg);
        return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            previousWeight: avgWeight,
            previousReps: Math.round(avgReps),
            previousSets: setCount,
            suggestedWeight: newWeight,
            suggestedReps: Math.round(avgReps),
            suggestedSets: setCount,
            reason: `Completed all sets at ${avgWeight}kg × ${Math.round(avgReps)}. Add ${rule.weightIncrementKg}kg.`,
            type: 'weight_increase',
        };
    }

    // Not yet hitting max reps → suggest rep increase
    if (!allHitMax && !struggling) {
        return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            previousWeight: avgWeight,
            previousReps: Math.round(avgReps),
            previousSets: setCount,
            suggestedWeight: avgWeight,
            suggestedReps: Math.min(Math.round(avgReps) + 1, maxRep),
            suggestedSets: setCount,
            reason: `Keep ${avgWeight}kg and aim for ${Math.min(Math.round(avgReps) + 1, maxRep)} reps per set.`,
            type: 'rep_increase',
        };
    }

    return null;
}

// ── 2. Deload Detection ──────────────────────────────────────

export function analyzeWeeklyVolumes(workouts: WorkoutSession[], weeks: number = 6): WeeklyVolume[] {
    const now = new Date();
    const result: WeeklyVolume[] = [];

    for (let w = 0; w < weeks; w++) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);

        const weekWorkouts = workouts.filter((wo) => {
            const d = new Date(wo.started_at);
            return d >= weekStart && d < weekEnd;
        });

        let totalSets = 0;
        let totalVolume = 0;
        const muscleGroupVolume: Record<string, number> = {};

        for (const wo of weekWorkouts) {
            for (const ex of wo.exercises) {
                const completedSets = ex.sets.filter((s) => s.completed);
                totalSets += completedSets.length;

                for (const set of completedSets) {
                    const vol = (set.weight_kg ?? 0) * (set.reps ?? 0);
                    totalVolume += vol;
                    for (const mg of ex.exercise?.muscle_groups ?? []) {
                        muscleGroupVolume[mg] = (muscleGroupVolume[mg] ?? 0) + vol;
                    }
                }
            }
        }

        result.push({
            weekStart: weekStart.toISOString().split('T')[0],
            totalSets,
            totalVolume,
            muscleGroupVolume,
        });
    }

    return result;
}

export function detectDeload(
    workouts: WorkoutSession[],
    recoveryLogs: RecoveryLog[],
): DeloadRecommendation {
    const volumes = analyzeWeeklyVolumes(workouts, 5);
    const weeklyVolumes = volumes.map((v) => v.totalVolume);

    if (weeklyVolumes.length < 4) {
        return {
            shouldDeload: false,
            reason: 'Not enough training history (need 4+ weeks)',
            weeklyVolumes,
            fatigueRatio: 0,
            suggestedReduction: 0,
        };
    }

    // Calculate fatigue ratio: current week vs 4-week average
    const current = weeklyVolumes[0];
    const fourWeekAvg = avg(weeklyVolumes.slice(1, 5));
    const fatigueRatio = fourWeekAvg > 0 ? current / fourWeekAvg : 1;

    // Check recovery trends
    const recentRecovery = recoveryLogs.slice(0, 7);
    const avgRecoveryScore = recentRecovery.length > 0
        ? avg(recentRecovery.map((r) => r.recovery_score ?? 50))
        : 50;
    const avgSoreness = recentRecovery.length > 0
        ? avg(recentRecovery.map((r) => r.soreness_level ?? 3))
        : 3;

    // Volume has been increasing for 4+ weeks
    const volumeIncreasing = weeklyVolumes.length >= 4 &&
        weeklyVolumes[0] > weeklyVolumes[1] &&
        weeklyVolumes[1] > weeklyVolumes[2] &&
        weeklyVolumes[2] > weeklyVolumes[3];

    // Trigger deload conditions
    const highFatigue = fatigueRatio > 1.3;
    const lowRecovery = avgRecoveryScore < 40;
    const highSoreness = avgSoreness > 4;
    const prolongedOverreach = volumeIncreasing && fatigueRatio > 1.15;

    const shouldDeload = highFatigue || lowRecovery || highSoreness || prolongedOverreach;

    let reason = 'Training load is well managed. Keep going!';
    let suggestedReduction = 0;

    if (highFatigue) {
        reason = `Volume is ${Math.round((fatigueRatio - 1) * 100)}% above your 4-week average. Time for a deload.`;
        suggestedReduction = 40;
    } else if (lowRecovery) {
        reason = `Recovery score averaging ${Math.round(avgRecoveryScore)}/100 this week. Your body needs rest.`;
        suggestedReduction = 50;
    } else if (highSoreness) {
        reason = `Soreness levels elevated (${avgSoreness.toFixed(1)}/5). Consider backing off.`;
        suggestedReduction = 35;
    } else if (prolongedOverreach) {
        reason = 'Volume has increased for 4 consecutive weeks. A deload week will help you peak.';
        suggestedReduction = 30;
    }

    return {
        shouldDeload,
        reason,
        weeklyVolumes,
        fatigueRatio,
        suggestedReduction,
    };
}

// ── 3. Strength Standards ────────────────────────────────────

// Strength standards based on bodyweight multipliers
// Source: Symmetric Strength / ExRx / Strength Level population data
interface StrengthStandard {
    exercise: string;
    exerciseIds: string[];
    levels: Record<'male' | 'female', number[]>; // [beginner, novice, intermediate, advanced, elite] as BW multipliers
}

const STRENGTH_STANDARDS: StrengthStandard[] = [
    {
        exercise: 'Bench Press',
        exerciseIds: ['1', 'ex001', 'bench_press', 'barbell_bench_press'],
        levels: {
            male: [0.5, 0.75, 1.0, 1.5, 2.0],
            female: [0.25, 0.5, 0.75, 1.0, 1.5],
        },
    },
    {
        exercise: 'Squat',
        exerciseIds: ['2', 'ex002', 'squat', 'barbell_squat', 'back_squat'],
        levels: {
            male: [0.75, 1.0, 1.5, 2.0, 2.75],
            female: [0.5, 0.75, 1.0, 1.5, 2.0],
        },
    },
    {
        exercise: 'Deadlift',
        exerciseIds: ['3', 'ex003', 'deadlift', 'barbell_deadlift'],
        levels: {
            male: [1.0, 1.25, 1.75, 2.5, 3.25],
            female: [0.5, 1.0, 1.25, 1.75, 2.5],
        },
    },
    {
        exercise: 'Overhead Press',
        exerciseIds: ['4', 'ex004', 'overhead_press', 'ohp', 'barbell_overhead_press'],
        levels: {
            male: [0.35, 0.55, 0.75, 1.0, 1.4],
            female: [0.2, 0.35, 0.5, 0.75, 1.0],
        },
    },
    {
        exercise: 'Barbell Row',
        exerciseIds: ['5', 'ex005', 'barbell_row', 'bent_over_row'],
        levels: {
            male: [0.5, 0.75, 1.0, 1.5, 2.0],
            female: [0.3, 0.5, 0.75, 1.0, 1.4],
        },
    },
    {
        exercise: 'Pull-Up',
        exerciseIds: ['6', 'ex006', 'pull_up', 'pullup', 'chin_up'],
        levels: {
            male: [0, 0.05, 0.2, 0.5, 1.0], // added weight as BW ratio
            female: [0, 0, 0.05, 0.25, 0.5],
        },
    },
    {
        exercise: 'Dumbbell Curl',
        exerciseIds: ['7', 'ex007', 'bicep_curl', 'dumbbell_curl'],
        levels: {
            male: [0.1, 0.15, 0.25, 0.35, 0.45], // per hand
            female: [0.05, 0.1, 0.15, 0.2, 0.3],
        },
    },
    {
        exercise: 'Leg Press',
        exerciseIds: ['10', 'ex010', 'leg_press'],
        levels: {
            male: [1.5, 2.0, 3.0, 4.0, 5.5],
            female: [1.0, 1.5, 2.0, 3.0, 4.0],
        },
    },
];

const LEVEL_NAMES = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'] as const;

export function calculateStrengthLevels(
    personalRecords: PersonalRecord[],
    bodyweightKg: number,
    gender: 'male' | 'female' | 'other' | null,
): StrengthLevel[] {
    const sex = gender === 'female' ? 'female' : 'male';
    const results: StrengthLevel[] = [];

    for (const standard of STRENGTH_STANDARDS) {
        const pr = personalRecords.find((r) =>
            standard.exerciseIds.some((id) =>
                r.exercise_id === id || r.exercise_name.toLowerCase().includes(standard.exercise.toLowerCase()),
            ),
        );
        if (!pr) continue;

        const e1rm = pr.estimated_1rm_kg;
        const bwRatio = bodyweightKg > 0 ? e1rm / bodyweightKg : 0;
        const thresholds = standard.levels[sex];

        let levelIdx = 0;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (bwRatio >= thresholds[i]) {
                levelIdx = i;
                break;
            }
        }

        const level = LEVEL_NAMES[levelIdx];
        const percentile = calculatePercentile(levelIdx, bwRatio, thresholds);
        const nextIdx = Math.min(levelIdx + 1, thresholds.length - 1);
        const nextLevelWeight = thresholds[nextIdx] * bodyweightKg;

        results.push({
            exercise: standard.exercise,
            estimated1RM: e1rm,
            bodyweightRatio: Math.round(bwRatio * 100) / 100,
            level,
            percentile,
            nextLevel: levelIdx < 4 ? LEVEL_NAMES[nextIdx] : 'elite',
            nextLevelWeight: Math.round(nextLevelWeight * 2) / 2,
        });
    }

    return results;
}

function calculatePercentile(levelIdx: number, ratio: number, thresholds: number[]): number {
    // Map level to approximate population percentile
    const basePcts = [5, 20, 50, 80, 95];
    if (levelIdx >= thresholds.length - 1) return 97;

    const base = basePcts[levelIdx];
    const next = basePcts[Math.min(levelIdx + 1, basePcts.length - 1)];
    const lowerT = thresholds[levelIdx];
    const upperT = thresholds[Math.min(levelIdx + 1, thresholds.length - 1)];

    if (upperT === lowerT) return base;
    const progress = (ratio - lowerT) / (upperT - lowerT);
    return Math.round(base + progress * (next - base));
}

// ── 4. 1RM Estimation ────────────────────────────────────────

export function estimate1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    // Brzycki formula
    return Math.round((weight * (36 / (37 - reps))) * 10) / 10;
}

export function estimateWeight(oneRM: number, targetReps: number): number {
    if (targetReps <= 0 || oneRM <= 0) return 0;
    if (targetReps === 1) return oneRM;
    return Math.round(oneRM * (37 - targetReps) / 36 * 2) / 2;
}

// ── 5. VO2 Max Estimation ────────────────────────────────────

export function estimateVO2MaxCooper(distanceMeters: number): VO2MaxEstimate {
    // Cooper 12-minute run test formula
    const vo2max = (distanceMeters - 504.9) / 44.73;
    return {
        value: Math.round(vo2max * 10) / 10,
        method: 'cooper',
        fitnessLevel: getVO2FitnessLevel(vo2max),
        percentile: getVO2Percentile(vo2max),
        date: new Date().toISOString(),
    };
}

export function estimateVO2MaxFromRun(
    distanceMeters: number,
    durationSeconds: number,
    avgHeartRate?: number,
    age: number = 30,
): VO2MaxEstimate {
    if (avgHeartRate && avgHeartRate > 0) {
        // Firstbeat-style VO2max from HR + pace
        const speedMPS = distanceMeters / durationSeconds;
        const speedKPH = speedMPS * 3.6;
        // ACSM running equation: VO2 = 3.5 + speed(m/min)*0.2
        const speedMPM = speedMPS * 60;
        const vo2AtPace = 3.5 + speedMPM * 0.2;
        // Adjust for heart rate: VO2max ≈ VO2atPace * (maxHR / avgHR)
        const estMaxHR = 220 - age;
        const vo2max = vo2AtPace * (estMaxHR / avgHeartRate);
        return {
            value: Math.round(Math.min(vo2max, 85) * 10) / 10,
            method: 'hr_based',
            fitnessLevel: getVO2FitnessLevel(vo2max),
            percentile: getVO2Percentile(vo2max),
            date: new Date().toISOString(),
        };
    }

    // Rockport walking test adaptation for running
    const durationMin = durationSeconds / 60;
    const distanceKm = distanceMeters / 1000;
    const speedKPH = distanceKm / (durationMin / 60);
    // Simple pace-based estimate
    const paceMinPerKm = durationMin / distanceKm;
    // Rough mapping: 4 min/km ≈ 60 VO2max, 6 min/km ≈ 40, 8 min/km ≈ 28
    const vo2max = Math.max(15, 92 - 8 * paceMinPerKm);

    return {
        value: Math.round(vo2max * 10) / 10,
        method: 'rockport',
        fitnessLevel: getVO2FitnessLevel(vo2max),
        percentile: getVO2Percentile(vo2max),
        date: new Date().toISOString(),
    };
}

function getVO2FitnessLevel(vo2max: number): string {
    if (vo2max >= 55) return 'Excellent';
    if (vo2max >= 46) return 'Good';
    if (vo2max >= 38) return 'Average';
    if (vo2max >= 30) return 'Below Average';
    return 'Poor';
}

function getVO2Percentile(vo2max: number): number {
    if (vo2max >= 60) return 95;
    if (vo2max >= 55) return 85;
    if (vo2max >= 50) return 75;
    if (vo2max >= 46) return 60;
    if (vo2max >= 42) return 50;
    if (vo2max >= 38) return 40;
    if (vo2max >= 34) return 25;
    if (vo2max >= 30) return 15;
    return 5;
}

// ── 6. Heart Rate Zones ──────────────────────────────────────

export function calculateHRZones(age: number, restingHR: number = 60): HeartRateZones {
    const maxHR = 220 - age;
    // Karvonen formula: target = ((maxHR - restingHR) × %intensity) + restingHR
    const hrr = maxHR - restingHR;

    return {
        maxHR,
        restingHR,
        zones: [
            {
                zone: 1,
                name: 'Recovery',
                minBPM: Math.round(restingHR + hrr * 0.5),
                maxBPM: Math.round(restingHR + hrr * 0.6),
                description: 'Easy effort, warm-up & cool-down',
                color: '#6B7280',
            },
            {
                zone: 2,
                name: 'Aerobic',
                minBPM: Math.round(restingHR + hrr * 0.6),
                maxBPM: Math.round(restingHR + hrr * 0.7),
                description: 'Fat burning, endurance base',
                color: '#0EA5E9',
            },
            {
                zone: 3,
                name: 'Tempo',
                minBPM: Math.round(restingHR + hrr * 0.7),
                maxBPM: Math.round(restingHR + hrr * 0.8),
                description: 'Improving aerobic capacity',
                color: '#10B981',
            },
            {
                zone: 4,
                name: 'Threshold',
                minBPM: Math.round(restingHR + hrr * 0.8),
                maxBPM: Math.round(restingHR + hrr * 0.9),
                description: 'Lactate threshold training',
                color: '#F59E0B',
            },
            {
                zone: 5,
                name: 'Max Effort',
                minBPM: Math.round(restingHR + hrr * 0.9),
                maxBPM: maxHR,
                description: 'Sprint intervals, peak power',
                color: '#EF4444',
            },
        ],
    };
}

export function getCurrentHRZone(
    heartRate: number,
    zones: HeartRateZones,
): { zone: HRZone; name: string; color: string } | null {
    for (const z of zones.zones) {
        if (heartRate >= z.minBPM && heartRate <= z.maxBPM) {
            return { zone: z.zone, name: z.name, color: z.color };
        }
    }
    if (heartRate > zones.maxHR) {
        return { zone: 5, name: 'Max Effort', color: '#EF4444' };
    }
    return null;
}

// ── 7. Warm-Up & Cool-Down Generator ─────────────────────────

const DYNAMIC_WARMUPS: Record<string, WarmUpExercise[]> = {
    chest: [
        { name: 'Arm Circles', duration: '30s', reps: '15 each direction', instructions: 'Stand with arms extended, make small circles gradually increasing size', type: 'dynamic_stretch' },
        { name: 'Band Pull-Aparts', duration: '30s', reps: '15', instructions: 'Hold resistance band at chest height, pull apart squeezing shoulder blades', type: 'activation' },
        { name: 'Push-Up to Downward Dog', duration: '60s', reps: '8', instructions: 'Do a push-up, then push hips up into downward dog. Return and repeat', type: 'mobility' },
    ],
    back: [
        { name: 'Cat-Cow Stretch', duration: '30s', reps: '10', instructions: 'On hands and knees, alternate between arching and rounding your spine', type: 'mobility' },
        { name: 'Band Face Pulls', duration: '30s', reps: '15', instructions: 'Pull band to face with elbows high, squeeze rear delts', type: 'activation' },
        { name: 'Dead Hang', duration: '30s', reps: '2 × 15s', instructions: 'Hang from pull-up bar with relaxed shoulders to decompress spine', type: 'dynamic_stretch' },
    ],
    shoulders: [
        { name: 'Arm Circles', duration: '30s', reps: '15 each direction', instructions: 'Progress from small to large circles', type: 'dynamic_stretch' },
        { name: 'Wall Slides', duration: '45s', reps: '10', instructions: 'Back against wall, slide arms up maintaining contact', type: 'mobility' },
        { name: 'Band Dislocates', duration: '30s', reps: '10', instructions: 'Hold band wide, pass it over and behind your head in an arc', type: 'mobility' },
    ],
    legs: [
        { name: 'Leg Swings', duration: '30s', reps: '15 each leg', instructions: 'Hold onto support, swing leg forward and back', type: 'dynamic_stretch' },
        { name: 'Bodyweight Squats', duration: '45s', reps: '15', instructions: 'Full depth squats focusing on opening hips', type: 'activation' },
        { name: 'Walking Lunges', duration: '60s', reps: '10 each leg', instructions: 'Long stride, knee barely touching ground', type: 'activation' },
        { name: 'Hip Circles', duration: '30s', reps: '10 each direction', instructions: 'Stand on one leg, circle the other leg at the hip', type: 'mobility' },
    ],
    arms: [
        { name: 'Wrist Circles', duration: '20s', reps: '10 each direction', instructions: 'Rotate wrists in both directions', type: 'mobility' },
        { name: 'Band Curls', duration: '30s', reps: '15', instructions: 'Light resistance band curls to warm up biceps', type: 'activation' },
        { name: 'Tricep Extensions', duration: '30s', reps: '15', instructions: 'Light overhead band extensions', type: 'activation' },
    ],
    core: [
        { name: 'Dead Bug', duration: '45s', reps: '10 each side', instructions: 'Lie on back, extend opposite arm and leg while maintaining flat back', type: 'activation' },
        { name: 'Bird Dog', duration: '45s', reps: '8 each side', instructions: 'On hands and knees, extend opposite arm and leg', type: 'activation' },
        { name: 'Thoracic Rotations', duration: '30s', reps: '8 each side', instructions: 'Side-lying, rotate upper body opening chest to ceiling', type: 'mobility' },
    ],
};

const GENERAL_WARMUP: WarmUpExercise = {
    name: 'Light Cardio',
    duration: '3-5 min',
    reps: '',
    instructions: 'Brisk walk, light jog, or jumping jacks to elevate heart rate',
    type: 'cardio_warmup',
};

const COOL_DOWN_EXERCISES: CoolDownExercise[] = [
    { name: "Child's Pose", duration: '45s', instructions: 'Knees wide, arms extended, sink hips back', type: 'static_stretch' },
    { name: 'Spinal Twist', duration: '30s each side', instructions: 'Lie on back, drop knees to one side, look opposite', type: 'static_stretch' },
    { name: 'Deep Breathing', duration: '60s', instructions: '4-count inhale, 4-count hold, 6-count exhale. Repeat 5 times', type: 'breathing' },
];

const TARGETED_COOLDOWNS: Record<string, CoolDownExercise[]> = {
    chest: [
        { name: 'Chest Doorway Stretch', duration: '30s each side', instructions: 'Arm on doorframe at 90°, lean forward gently', type: 'static_stretch' },
        { name: 'Floor Chest Opener', duration: '30s', instructions: 'Lie face down, arms out to T, roll to one side', type: 'static_stretch' },
    ],
    back: [
        { name: 'Cat-Cow Stretch', duration: '30s', instructions: 'Alternate arching and rounding spine on all fours', type: 'static_stretch' },
        { name: 'Lat Hang Stretch', duration: '30s each side', instructions: 'Grab doorframe or bar overhead, lean away to stretch lat', type: 'static_stretch' },
    ],
    shoulders: [
        { name: 'Cross-Body Shoulder Stretch', duration: '30s each side', instructions: 'Pull arm across chest with opposite hand', type: 'static_stretch' },
        { name: 'Shoulder Behind-Back Stretch', duration: '30s each side', instructions: 'Reach one arm behind head, pull elbow with other hand', type: 'static_stretch' },
    ],
    legs: [
        { name: 'Standing Quad Stretch', duration: '30s each side', instructions: 'Pull heel to glute, keep knees together', type: 'static_stretch' },
        { name: 'Standing Hamstring Stretch', duration: '30s each side', instructions: 'Foot on low surface, hinge forward at hips', type: 'static_stretch' },
        { name: 'Pigeon Stretch', duration: '30s each side', instructions: 'Front shin perpendicular, back leg extended, fold forward', type: 'static_stretch' },
        { name: 'Standing Calf Stretch', duration: '30s each side', instructions: 'Wall lean, straight back leg, heel down', type: 'static_stretch' },
    ],
    arms: [
        { name: 'Wrist Flexor Stretch', duration: '20s each side', instructions: 'Extend arm, pull fingers back with other hand', type: 'static_stretch' },
        { name: 'Tricep Overhead Stretch', duration: '30s each side', instructions: 'Reach hand behind head, push elbow down', type: 'static_stretch' },
    ],
    core: [
        { name: 'Cobra Stretch', duration: '30s', instructions: 'Lie face down, push chest up, hips on floor', type: 'static_stretch' },
        { name: 'Seated Spinal Twist', duration: '30s each side', instructions: 'Sit tall, twist torso placing opposite elbow outside knee', type: 'static_stretch' },
    ],
};

export function generateWarmUp(muscleGroups: MuscleGroup[]): WarmUpExercise[] {
    const exercises: WarmUpExercise[] = [GENERAL_WARMUP];
    const seen = new Set<string>();

    // Map muscle groups to warmup categories
    const categories = new Set<string>();
    for (const mg of muscleGroups) {
        if (['chest', 'pectorals'].some((k) => mg.includes(k))) categories.add('chest');
        if (['back', 'lats', 'traps', 'rhomboids'].some((k) => mg.includes(k))) categories.add('back');
        if (['shoulder', 'deltoid'].some((k) => mg.includes(k))) categories.add('shoulders');
        if (['quad', 'hamstring', 'glute', 'calf', 'hip'].some((k) => mg.includes(k))) categories.add('legs');
        if (['bicep', 'tricep', 'forearm'].some((k) => mg.includes(k))) categories.add('arms');
        if (['core', 'abs', 'oblique'].some((k) => mg.includes(k))) categories.add('core');
    }

    for (const cat of categories) {
        const warmups = DYNAMIC_WARMUPS[cat] ?? [];
        for (const w of warmups) {
            if (!seen.has(w.name)) {
                seen.add(w.name);
                exercises.push(w);
            }
        }
    }

    // Cap at 8 exercises
    return exercises.slice(0, 8);
}

export function generateCoolDown(muscleGroups: MuscleGroup[] = []): CoolDownExercise[] {
    const exercises: CoolDownExercise[] = [];
    const seen = new Set<string>();

    if (muscleGroups.length > 0) {
        // Map muscle groups to cooldown categories
        const categories = new Set<string>();
        for (const mg of muscleGroups) {
            if (['chest', 'pectorals'].some((k) => mg.includes(k))) categories.add('chest');
            if (['back', 'lats', 'traps', 'rhomboids'].some((k) => mg.includes(k))) categories.add('back');
            if (['shoulder', 'deltoid'].some((k) => mg.includes(k))) categories.add('shoulders');
            if (['quad', 'hamstring', 'glute', 'calf', 'hip'].some((k) => mg.includes(k))) categories.add('legs');
            if (['bicep', 'tricep', 'forearm'].some((k) => mg.includes(k))) categories.add('arms');
            if (['core', 'abs', 'oblique'].some((k) => mg.includes(k))) categories.add('core');
        }

        for (const cat of categories) {
            const stretches = TARGETED_COOLDOWNS[cat] ?? [];
            for (const s of stretches) {
                if (!seen.has(s.name)) {
                    seen.add(s.name);
                    exercises.push(s);
                }
            }
        }
    }

    // Always include the base cool-down essentials
    for (const ex of COOL_DOWN_EXERCISES) {
        if (!seen.has(ex.name)) {
            seen.add(ex.name);
            exercises.push(ex);
        }
    }

    return exercises.slice(0, 8);
}

// ── 8. Training Split Analysis ───────────────────────────────

export interface SplitRecommendation {
    currentSplit: string;
    suggestedSplit: string;
    reason: string;
    weeklyPlan: { day: string; focus: string; muscles: string[] }[];
    recoveryNotes: string[];
}

export function analyzeTrainingSplit(
    workouts: WorkoutSession[],
    recoveryLogs: RecoveryLog[],
    experience: ExperienceLevel,
): SplitRecommendation {
    // Analyze last 2 weeks of training
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentWorkouts = workouts.filter(
        (w) => new Date(w.started_at) > twoWeeksAgo,
    );

    const daysPerWeek = Math.round((recentWorkouts.length / 2) * 10) / 10;

    // Count muscle group frequency
    const mgFrequency: Record<string, number> = {};
    for (const wo of recentWorkouts) {
        for (const ex of wo.exercises) {
            for (const mg of ex.exercise?.muscle_groups ?? []) {
                mgFrequency[mg] = (mgFrequency[mg] ?? 0) + 1;
            }
        }
    }

    // Determine current split pattern
    const currentSplit = detectCurrentSplit(recentWorkouts);

    // Suggest based on frequency and experience
    const { suggestedSplit, weeklyPlan, reason } = suggestOptimalSplit(
        daysPerWeek,
        experience,
        mgFrequency,
    );

    // Recovery notes
    const recoveryNotes: string[] = [];
    const avgRecovery = recoveryLogs.length > 0
        ? avg(recoveryLogs.slice(0, 7).map((r) => r.recovery_score ?? 50))
        : 50;

    if (avgRecovery < 40) {
        recoveryNotes.push('Recovery is low. Consider adding a rest day or reducing volume.');
    }
    if (daysPerWeek > 6) {
        recoveryNotes.push('Training 6+ days/week. Ensure at least 1 full rest day.');
    }

    // Check for imbalances
    const pushVol = (mgFrequency['chest'] ?? 0) + (mgFrequency['shoulders'] ?? 0) + (mgFrequency['triceps'] ?? 0);
    const pullVol = (mgFrequency['back'] ?? 0) + (mgFrequency['lats'] ?? 0) + (mgFrequency['biceps'] ?? 0);
    if (pushVol > pullVol * 1.5) {
        recoveryNotes.push('Push volume significantly exceeds pull volume. Add more back/pulling work.');
    }
    if (pullVol > pushVol * 1.5) {
        recoveryNotes.push('Pull volume exceeds push volume. Consider balancing with more pressing.');
    }

    return { currentSplit, suggestedSplit, reason, weeklyPlan, recoveryNotes };
}

function detectCurrentSplit(workouts: WorkoutSession[]): string {
    if (workouts.length === 0) return 'Unknown';
    // Simple heuristic based on workout names and muscle distribution
    const names = workouts.map((w) => w.name.toLowerCase());
    if (names.some((n) => n.includes('push')) && names.some((n) => n.includes('pull'))) return 'Push/Pull/Legs';
    if (names.some((n) => n.includes('upper')) && names.some((n) => n.includes('lower'))) return 'Upper/Lower';
    if (names.some((n) => n.includes('full body'))) return 'Full Body';
    if (names.some((n) => n.includes('chest')) && names.some((n) => n.includes('back'))) return 'Bro Split';
    return 'Mixed';
}

function suggestOptimalSplit(
    daysPerWeek: number,
    experience: ExperienceLevel,
    _mgFrequency: Record<string, number>,
): { suggestedSplit: string; weeklyPlan: { day: string; focus: string; muscles: string[] }[]; reason: string } {
    if (daysPerWeek <= 2 || experience === 'beginner') {
        return {
            suggestedSplit: 'Full Body (2-3x/week)',
            reason: 'Full body sessions maximize frequency per muscle group with limited training days.',
            weeklyPlan: [
                { day: 'Mon', focus: 'Full Body A', muscles: ['chest', 'back', 'legs', 'shoulders'] },
                { day: 'Wed', focus: 'Full Body B', muscles: ['back', 'chest', 'legs', 'arms'] },
                { day: 'Fri', focus: 'Full Body C', muscles: ['legs', 'shoulders', 'back', 'core'] },
            ],
        };
    }

    if (daysPerWeek <= 4 || experience === 'intermediate') {
        return {
            suggestedSplit: 'Upper/Lower (4x/week)',
            reason: 'Hitting each muscle 2x/week balances volume and recovery for intermediate lifters.',
            weeklyPlan: [
                { day: 'Mon', focus: 'Upper A', muscles: ['chest', 'back', 'shoulders', 'arms'] },
                { day: 'Tue', focus: 'Lower A', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
                { day: 'Thu', focus: 'Upper B', muscles: ['back', 'chest', 'shoulders', 'arms'] },
                { day: 'Fri', focus: 'Lower B', muscles: ['hamstrings', 'quads', 'glutes', 'core'] },
            ],
        };
    }

    return {
        suggestedSplit: 'Push/Pull/Legs (5-6x/week)',
        reason: 'High frequency split maximizes volume distribution for advanced lifters.',
        weeklyPlan: [
            { day: 'Mon', focus: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
            { day: 'Tue', focus: 'Pull', muscles: ['back', 'biceps', 'rear delts'] },
            { day: 'Wed', focus: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
            { day: 'Thu', focus: 'Push', muscles: ['shoulders', 'chest', 'triceps'] },
            { day: 'Fri', focus: 'Pull', muscles: ['back', 'biceps', 'traps'] },
            { day: 'Sat', focus: 'Legs', muscles: ['hamstrings', 'quads', 'glutes', 'core'] },
        ],
    };
}

// ── Utilities ────────────────────────────────────────────────

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function roundToNearest(value: number, increment: number): number {
    if (increment === 0) return Math.round(value);
    return Math.round(value / increment) * increment;
}
