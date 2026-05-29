import { getDayName, getLocalDateKey, getRecentLocalDateKeys } from '@/lib/date';
import type { PersonalRecord, WorkoutSession } from '@/types';

export type WorkoutDayPoint = {
    dateKey: string;
    label: string;
    volumeKg: number;
    sets: number;
    workouts: number;
};

export type MuscleVolumePoint = {
    muscle: string;
    sets: number;
    volumeKg: number;
};

export type WorkoutHistoryInsight = {
    workoutsThisWeek: number;
    workoutsPreviousWeek: number;
    weekVolumeKg: number;
    previousWeekVolumeKg: number;
    weekVolumeDeltaPct: number;
    weekSets: number;
    avgDurationSeconds: number;
    prCount: number;
    consistencyStreak: number;
    bestWorkout: WorkoutSession | null;
    topMuscles: MuscleVolumePoint[];
    dailyVolume: WorkoutDayPoint[];
    recommendation: string;
};

function completedSets(workout: WorkoutSession) {
    return workout.exercises.flatMap((exercise) =>
        exercise.sets
            .filter((set) => set.completed)
            .map((set) => ({ set, exercise })),
    );
}

export function getWorkoutDateKey(workout: WorkoutSession): string {
    return getLocalDateKey(new Date(workout.completed_at ?? workout.started_at));
}

export function getWorkoutSetCount(workout: WorkoutSession): number {
    return completedSets(workout).length;
}

export function getWorkoutPrCount(workout: WorkoutSession): number {
    return completedSets(workout).filter(({ set }) => set.is_pr).length;
}

export function getWorkoutDurationSeconds(workout: WorkoutSession): number {
    if (workout.duration_seconds) return workout.duration_seconds;
    if (!workout.completed_at) return 0;
    return Math.max(0, Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 1000));
}

export function getWorkoutTopMuscles(workout: WorkoutSession, limit = 3): MuscleVolumePoint[] {
    const muscleMap: Record<string, MuscleVolumePoint> = {};

    for (const { set, exercise } of completedSets(workout)) {
        const muscles = exercise.exercise?.muscle_groups ?? [];
        const volume = (set.weight_kg ?? 0) * (set.reps ?? 0);
        for (const muscle of muscles) {
            if (!muscleMap[muscle]) muscleMap[muscle] = { muscle, sets: 0, volumeKg: 0 };
            muscleMap[muscle].sets += 1;
            muscleMap[muscle].volumeKg += volume;
        }
    }

    return Object.values(muscleMap)
        .sort((a, b) => b.sets - a.sets || b.volumeKg - a.volumeKg)
        .slice(0, limit);
}

export function buildWorkoutHistoryInsight(
    workouts: WorkoutSession[],
    personalRecords: PersonalRecord[] = [],
    today: Date = new Date(),
): WorkoutHistoryInsight {
    const currentWeekKeys = getRecentLocalDateKeys(7, today);
    const previousWeekEnd = new Date(today);
    previousWeekEnd.setDate(today.getDate() - 7);
    const previousWeekKeys = getRecentLocalDateKeys(7, previousWeekEnd);
    const currentSet = new Set(currentWeekKeys);
    const previousSet = new Set(previousWeekKeys);

    const currentWeekWorkouts = workouts.filter((workout) => currentSet.has(getWorkoutDateKey(workout)));
    const previousWeekWorkouts = workouts.filter((workout) => previousSet.has(getWorkoutDateKey(workout)));

    const weekVolumeKg = currentWeekWorkouts.reduce((sum, workout) => sum + (workout.total_volume_kg || 0), 0);
    const previousWeekVolumeKg = previousWeekWorkouts.reduce((sum, workout) => sum + (workout.total_volume_kg || 0), 0);
    const weekSets = currentWeekWorkouts.reduce((sum, workout) => sum + getWorkoutSetCount(workout), 0);
    const durationTotal = currentWeekWorkouts.reduce((sum, workout) => sum + getWorkoutDurationSeconds(workout), 0);
    const prCount = currentWeekWorkouts.reduce((sum, workout) => sum + getWorkoutPrCount(workout), 0);
    const personalRecordCount = personalRecords.filter((record) => currentSet.has(getLocalDateKey(new Date(record.achieved_at)))).length;

    const dailyVolume = currentWeekKeys.map((dateKey) => {
        const dayWorkouts = currentWeekWorkouts.filter((workout) => getWorkoutDateKey(workout) === dateKey);
        return {
            dateKey,
            label: getDayName(dateKey),
            volumeKg: dayWorkouts.reduce((sum, workout) => sum + (workout.total_volume_kg || 0), 0),
            sets: dayWorkouts.reduce((sum, workout) => sum + getWorkoutSetCount(workout), 0),
            workouts: dayWorkouts.length,
        };
    });

    const topMuscleMap: Record<string, MuscleVolumePoint> = {};
    for (const workout of currentWeekWorkouts) {
        for (const point of getWorkoutTopMuscles(workout, 99)) {
            if (!topMuscleMap[point.muscle]) topMuscleMap[point.muscle] = { muscle: point.muscle, sets: 0, volumeKg: 0 };
            topMuscleMap[point.muscle].sets += point.sets;
            topMuscleMap[point.muscle].volumeKg += point.volumeKg;
        }
    }

    const bestWorkout = [...currentWeekWorkouts].sort((a, b) => (b.total_volume_kg || 0) - (a.total_volume_kg || 0))[0] ?? null;
    const activeDaySet = new Set(workouts.map(getWorkoutDateKey));
    let consistencyStreak = 0;
    for (let index = 0; index < 30; index++) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        if (!activeDaySet.has(getLocalDateKey(date))) break;
        consistencyStreak += 1;
    }

    const weekVolumeDeltaPct = previousWeekVolumeKg > 0
        ? Math.round(((weekVolumeKg - previousWeekVolumeKg) / previousWeekVolumeKg) * 100)
        : weekVolumeKg > 0 ? 100 : 0;

    const topMuscles = Object.values(topMuscleMap)
        .sort((a, b) => b.sets - a.sets || b.volumeKg - a.volumeKg)
        .slice(0, 5);

    const recommendation = getTrainingRecommendation({
        workoutsThisWeek: currentWeekWorkouts.length,
        weekVolumeDeltaPct,
        topMuscles,
        prCount: prCount + personalRecordCount,
        weekSets,
    });

    return {
        workoutsThisWeek: currentWeekWorkouts.length,
        workoutsPreviousWeek: previousWeekWorkouts.length,
        weekVolumeKg,
        previousWeekVolumeKg,
        weekVolumeDeltaPct,
        weekSets,
        avgDurationSeconds: currentWeekWorkouts.length ? Math.round(durationTotal / currentWeekWorkouts.length) : 0,
        prCount: prCount + personalRecordCount,
        consistencyStreak,
        bestWorkout,
        topMuscles,
        dailyVolume,
        recommendation,
    };
}

function getTrainingRecommendation(input: {
    workoutsThisWeek: number;
    weekVolumeDeltaPct: number;
    topMuscles: MuscleVolumePoint[];
    prCount: number;
    weekSets: number;
}): string {
    if (input.workoutsThisWeek === 0) {
        return 'Log one short workout today. Even a 20 minute full-body session will unlock useful trend tracking.';
    }
    if (input.weekVolumeDeltaPct > 35 && input.workoutsThisWeek >= 3) {
        return 'Volume jumped sharply this week. Keep the next session technique-focused or trim one set per exercise.';
    }
    if (input.weekVolumeDeltaPct < -25 && input.workoutsThisWeek <= 2) {
        return 'Training dropped from last week. Schedule a simple repeatable session to rebuild momentum.';
    }
    if (input.prCount > 0) {
        return 'You hit a PR recently. Repeat the main lift once more before adding more volume.';
    }
    if (input.topMuscles.length > 0 && input.topMuscles[0].sets >= Math.max(10, input.weekSets * 0.45)) {
        return `${formatMuscle(input.topMuscles[0].muscle)} is dominating your week. Balance it with a lower-volume opposing muscle session.`;
    }
    return 'Your week looks balanced. Keep one hard lift, one volume accessory, and one recovery-biased session in rotation.';
}

export function formatMuscle(muscle: string): string {
    return muscle.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
