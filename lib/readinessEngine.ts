import type { DailyNutritionSummary, FitnessGoal, MuscleGroup, RecoveryLog, WorkoutSession } from '@/types';

export type ReadinessLevel = 'green' | 'normal' | 'yellow' | 'red';
export type WorkoutAdjustment = 'progress' | 'maintain' | 'reduce_volume' | 'recovery_day';
export type NutritionAdjustment = 'fuel_performance' | 'maintain' | 'protect_recovery' | 'ease_deficit';

export type ReadinessPlan = {
    score: number;
    level: ReadinessLevel;
    title: string;
    summary: string;
    workout: {
        adjustment: WorkoutAdjustment;
        volumeMultiplier: number;
        intensityCap: number | null;
        avoidMuscles: MuscleGroup[];
        title: string;
        guidance: string;
    };
    nutrition: {
        adjustment: NutritionAdjustment;
        calorieTarget: number;
        proteinTarget: number;
        carbsTarget: number;
        fatTarget: number;
        title: string;
        guidance: string;
        periWorkoutCarbsG: number;
    };
    drivers: string[];
};

type BuildReadinessPlanInput = {
    recovery: RecoveryLog | null;
    recoveryLogs?: RecoveryLog[];
    recentWorkouts?: WorkoutSession[];
    todaySummary?: DailyNutritionSummary | null;
    yesterdaySummary?: DailyNutritionSummary | null;
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    goal?: FitnessGoal | string | null;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function roundMacro(value: number) {
    return Math.max(0, Math.round(value));
}

function average(values: number[]) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getLevel(score: number): ReadinessLevel {
    if (score >= 80) return 'green';
    if (score >= 60) return 'normal';
    if (score >= 40) return 'yellow';
    return 'red';
}

function getWorkoutAdjustment(level: ReadinessLevel): Pick<ReadinessPlan['workout'], 'adjustment' | 'volumeMultiplier' | 'intensityCap'> {
    if (level === 'green') return { adjustment: 'progress', volumeMultiplier: 1, intensityCap: null };
    if (level === 'normal') return { adjustment: 'maintain', volumeMultiplier: 1, intensityCap: null };
    if (level === 'yellow') return { adjustment: 'reduce_volume', volumeMultiplier: 0.85, intensityCap: 8 };
    return { adjustment: 'recovery_day', volumeMultiplier: 0.55, intensityCap: 6 };
}

function buildScore(input: BuildReadinessPlanInput) {
    const { recovery, recoveryLogs = [], recentWorkouts = [], yesterdaySummary, calorieTarget, proteinTarget } = input;
    const drivers: string[] = [];
    let score = recovery?.recovery_score ?? 68;

    if (!recovery) drivers.push('No recovery check-in yet, so BodyPilot is using a conservative baseline.');

    if ((recovery?.sleep_hours ?? 7) < 6.5) {
        score -= 8;
        drivers.push('Sleep was under 6.5 hours.');
    } else if ((recovery?.sleep_hours ?? 0) >= 7.5) {
        score += 4;
        drivers.push('Sleep duration supports harder training.');
    }

    if ((recovery?.stress_level ?? 3) >= 4) {
        score -= 7;
        drivers.push('Stress is elevated.');
    }

    if ((recovery?.energy_level ?? 3) <= 2) {
        score -= 8;
        drivers.push('Energy is low.');
    }

    if ((recovery?.soreness_level ?? 2) >= 4) {
        score -= 8;
        drivers.push('Soreness is high.');
    }

    const recentRecoveryAvg = average(recoveryLogs.slice(0, 4).map((log) => log.recovery_score));
    if (recentRecoveryAvg > 0 && recentRecoveryAvg < 50) {
        score -= 6;
        drivers.push('Recovery has been trending low over recent check-ins.');
    }

    const lastWorkout = recentWorkouts[0];
    if (lastWorkout?.completed_at) {
        const hoursSinceWorkout = (Date.now() - new Date(lastWorkout.completed_at).getTime()) / 36e5;
        if (hoursSinceWorkout < 20 && lastWorkout.total_volume_kg > 0) {
            score -= 5;
            drivers.push('You trained recently, so fatigue may still be carrying over.');
        }
    }

    const yesterday = yesterdaySummary ?? null;
    if (yesterday && yesterday.total_calories > 0) {
        if (yesterday.total_calories < calorieTarget * 0.72) {
            score -= 5;
            drivers.push('Yesterday’s calories were low for recovery.');
        }
        if (yesterday.total_protein_g < proteinTarget * 0.72) {
            score -= 4;
            drivers.push('Yesterday’s protein was light.');
        }
        if (yesterday.water_ml > 0 && yesterday.water_ml < 1500) {
            score -= 3;
            drivers.push('Hydration was low yesterday.');
        }
    }

    return { score: clamp(Math.round(score), 0, 100), drivers };
}

export function buildReadinessPlan(input: BuildReadinessPlanInput): ReadinessPlan {
    const { recovery, calorieTarget, proteinTarget, carbsTarget, fatTarget, goal } = input;
    const { score, drivers } = buildScore(input);
    const level = getLevel(score);
    const soreMuscles = recovery?.sore_body_parts ?? [];
    const workoutBase = getWorkoutAdjustment(level);
    const fatLoss = goal === 'lose_fat';
    const hardTraining = level === 'green' || level === 'normal';

    let nutritionAdjustment: NutritionAdjustment = 'maintain';
    let adjustedCalories = calorieTarget;
    let adjustedCarbs = carbsTarget;
    let adjustedFat = fatTarget;
    let periWorkoutCarbsG = hardTraining ? 35 : 0;

    if (level === 'green') {
        nutritionAdjustment = 'fuel_performance';
        adjustedCarbs += 25;
        adjustedCalories += 100;
        periWorkoutCarbsG = 45;
    } else if (level === 'yellow') {
        nutritionAdjustment = 'protect_recovery';
        adjustedCarbs += 15;
        adjustedFat = Math.max(35, adjustedFat - 5);
        periWorkoutCarbsG = 30;
    } else if (level === 'red') {
        nutritionAdjustment = fatLoss ? 'ease_deficit' : 'protect_recovery';
        adjustedCalories += fatLoss ? 150 : 75;
        adjustedCarbs += 20;
        periWorkoutCarbsG = 0;
    }

    const titles: Record<ReadinessLevel, string> = {
        green: 'Green day',
        normal: 'Steady day',
        yellow: 'Yellow day',
        red: 'Recovery day',
    };

    const workoutTitles: Record<WorkoutAdjustment, string> = {
        progress: 'Push if warmups move well',
        maintain: 'Run the plan as written',
        reduce_volume: 'Reduce volume 10-20%',
        recovery_day: 'Bias recovery or technique',
    };

    const nutritionTitles: Record<NutritionAdjustment, string> = {
        fuel_performance: 'Fuel the session',
        maintain: 'Keep targets steady',
        protect_recovery: 'Protect recovery',
        ease_deficit: 'Ease the deficit today',
    };

    const workoutGuidance = level === 'red'
        ? 'Choose mobility, walking, Zone 2, or a light technique session. Avoid PRs and failure sets.'
        : level === 'yellow'
            ? `Keep the workout, but use about ${Math.round(workoutBase.volumeMultiplier * 100)}% of planned volume and stop 2 reps before failure.`
            : level === 'green'
                ? 'The plan can progress today. Add load or reps only if warmups feel crisp.'
                : 'Keep the planned workout. No need to force extra volume.';

    const nutritionGuidance = level === 'red'
        ? 'Keep protein high and avoid punishing low activity with a steep deficit. Simple meals, fluids, and carbs will help recovery.'
        : level === 'yellow'
            ? 'Keep protein high and put some carbs near training. Do not chase an aggressive deficit on low-recovery days.'
            : level === 'green'
                ? 'Keep protein covered and bias carbs around training so the harder session has fuel.'
                : 'Stay close to your normal targets and keep hydration moving.';

    return {
        score,
        level,
        title: titles[level],
        summary: `${titles[level]}: ${workoutTitles[workoutBase.adjustment]}. ${nutritionTitles[nutritionAdjustment]}.`,
        workout: {
            ...workoutBase,
            avoidMuscles: soreMuscles,
            title: workoutTitles[workoutBase.adjustment],
            guidance: soreMuscles.length
                ? `${workoutGuidance} Sore areas flagged: ${soreMuscles.map((muscle) => muscle.replace('_', ' ')).join(', ')}.`
                : workoutGuidance,
        },
        nutrition: {
            adjustment: nutritionAdjustment,
            calorieTarget: Math.round(adjustedCalories),
            proteinTarget: roundMacro(proteinTarget),
            carbsTarget: roundMacro(adjustedCarbs),
            fatTarget: roundMacro(adjustedFat),
            title: nutritionTitles[nutritionAdjustment],
            guidance: nutritionGuidance,
            periWorkoutCarbsG,
        },
        drivers: drivers.slice(0, 4),
    };
}
