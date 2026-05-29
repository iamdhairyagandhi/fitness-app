import { getDayName, getLocalDateKey } from '@/lib/date';
import type { DailyNutritionSummary, FitnessGoal, WeightEntry } from '@/types';

export type NutritionTrendDay = {
    date: string;
    label: string;
    calories: number;
    proteinG: number;
    waterMl: number;
    calorieDelta: number;
    calorieRatio: number;
    waterRatio: number;
    logged: boolean;
};

export type CalorieTrendInsight = {
    loggedDays: number;
    averageCalories: number;
    averageDelta: number;
    netBalance: number;
    inTargetDays: number;
    adherencePct: number;
    projectedWeightChangeKg: number;
    currentDeficitStreak: number;
    bestDay: NutritionTrendDay | null;
    highestDay: NutritionTrendDay | null;
    lowestDay: NutritionTrendDay | null;
    message: string;
};

export type WaterTrendInsight = {
    averageWaterMl: number;
    hitDays: number;
    adherencePct: number;
    averageGapMl: number;
    bestStreak: number;
    currentStreak: number;
    bestDay: NutritionTrendDay | null;
    message: string;
};

export type WeightTrendInsight = {
    points: {
        date: string;
        label: string;
        weightKg: number;
    }[];
    latestKg: number | null;
    changeKg: number;
    trendKgPerWeek: number;
    movingAverageKg: number | null;
    previousMovingAverageKg: number | null;
    rangeKg: number;
    loggedDays: number;
    message: string;
};

export type NutritionTrendInsights = {
    days: NutritionTrendDay[];
    calories: CalorieTrendInsight;
    water: WaterTrendInsight;
    weight: WeightTrendInsight;
};

const CALORIES_PER_KG = 7700;

function average(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function currentBooleanStreak(values: boolean[]) {
    let streak = 0;
    for (let index = values.length - 1; index >= 0; index--) {
        if (!values[index]) break;
        streak += 1;
    }
    return streak;
}

function bestBooleanStreak(values: boolean[]) {
    let best = 0;
    let current = 0;
    for (const value of values) {
        current = value ? current + 1 : 0;
        best = Math.max(best, current);
    }
    return best;
}

function formatGoal(goal: FitnessGoal) {
    switch (goal) {
        case 'lose_fat':
            return 'fat loss';
        case 'build_muscle':
            return 'muscle gain';
        case 'recomp':
            return 'recomposition';
        case 'strength':
            return 'strength';
        case 'endurance':
            return 'endurance';
        default:
            return 'maintenance';
    }
}

export function buildNutritionTrendInsights({
    summaries,
    weightEntries,
    calorieTarget,
    waterTargetMl,
    goal,
}: {
    summaries: (DailyNutritionSummary | null)[];
    weightEntries: WeightEntry[];
    calorieTarget: number;
    waterTargetMl: number;
    goal: FitnessGoal;
}): NutritionTrendInsights {
    const days = summaries.map((summary) => {
        const date = summary?.date ?? '';
        const calories = summary?.total_calories ?? 0;
        const waterMl = summary?.water_ml ?? 0;
        const proteinG = summary?.total_protein_g ?? 0;
        return {
            date,
            label: date ? getDayName(date) : '',
            calories,
            proteinG,
            waterMl,
            calorieDelta: calories - calorieTarget,
            calorieRatio: calorieTarget > 0 ? calories / calorieTarget : 0,
            waterRatio: waterTargetMl > 0 ? waterMl / waterTargetMl : 0,
            logged: calories > 0 || waterMl > 0 || proteinG > 0,
        };
    });

    const loggedCalorieDays = days.filter((day) => day.calories > 0);
    const inRangeDays = loggedCalorieDays.filter((day) => Math.abs(day.calorieDelta) <= calorieTarget * 0.1);
    const netBalance = Math.round(loggedCalorieDays.reduce((sum, day) => sum + day.calorieDelta, 0));
    const avgCalories = Math.round(average(loggedCalorieDays.map((day) => day.calories)));
    const avgDelta = Math.round(average(loggedCalorieDays.map((day) => day.calorieDelta)));
    const currentDeficitStreak = currentBooleanStreak(days.map((day) => day.calories > 0 && day.calories < calorieTarget));
    const highestDay = loggedCalorieDays.length ? [...loggedCalorieDays].sort((a, b) => b.calories - a.calories)[0] : null;
    const lowestDay = loggedCalorieDays.length ? [...loggedCalorieDays].sort((a, b) => a.calories - b.calories)[0] : null;
    const bestDay = loggedCalorieDays.length
        ? [...loggedCalorieDays].sort((a, b) => Math.abs(a.calorieDelta) - Math.abs(b.calorieDelta))[0]
        : null;

    const calories: CalorieTrendInsight = {
        loggedDays: loggedCalorieDays.length,
        averageCalories: avgCalories,
        averageDelta: avgDelta,
        netBalance,
        inTargetDays: inRangeDays.length,
        adherencePct: loggedCalorieDays.length ? Math.round((inRangeDays.length / loggedCalorieDays.length) * 100) : 0,
        projectedWeightChangeKg: Math.round((netBalance / CALORIES_PER_KG) * 10) / 10,
        currentDeficitStreak,
        bestDay,
        highestDay,
        lowestDay,
        message: getCalorieMessage({ loggedDays: loggedCalorieDays.length, avgDelta, adherencePct: loggedCalorieDays.length ? Math.round((inRangeDays.length / loggedCalorieDays.length) * 100) : 0, goal }),
    };

    const waterDays = days.filter((day) => day.waterMl > 0);
    const waterHitFlags = days.map((day) => day.waterMl >= waterTargetMl);
    const waterHitDays = waterHitFlags.filter(Boolean).length;
    const avgWaterMl = Math.round(average(waterDays.map((day) => day.waterMl)));
    const averageGapMl = Math.max(0, waterTargetMl - avgWaterMl);

    const water: WaterTrendInsight = {
        averageWaterMl: avgWaterMl,
        hitDays: waterHitDays,
        adherencePct: days.length ? Math.round((waterHitDays / days.length) * 100) : 0,
        averageGapMl,
        bestStreak: bestBooleanStreak(waterHitFlags),
        currentStreak: currentBooleanStreak(waterHitFlags),
        bestDay: waterDays.length ? [...waterDays].sort((a, b) => b.waterMl - a.waterMl)[0] : null,
        message: getWaterMessage({ waterDays: waterDays.length, averageGapMl, hitDays: waterHitDays, target: waterTargetMl }),
    };

    const sortedWeights = [...weightEntries]
        .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
        .slice(-14);
    const latest = sortedWeights.at(-1) ?? null;
    const first = sortedWeights[0] ?? null;
    const daysBetween = first && latest
        ? Math.max(1, (new Date(latest.logged_at).getTime() - new Date(first.logged_at).getTime()) / 86400000)
        : 1;
    const changeKg = first && latest ? latest.weight_kg - first.weight_kg : 0;
    const trendKgPerWeek = Math.round((changeKg / daysBetween) * 7 * 10) / 10;
    const latestThree = sortedWeights.slice(-3);
    const previousThree = sortedWeights.slice(-6, -3);
    const weights = sortedWeights.map((entry) => entry.weight_kg);
    const weight: WeightTrendInsight = {
        points: sortedWeights.map((entry) => ({
            date: getLocalDateKey(new Date(entry.logged_at)),
            label: getDayName(getLocalDateKey(new Date(entry.logged_at))),
            weightKg: entry.weight_kg,
        })),
        latestKg: latest?.weight_kg ?? null,
        changeKg: Math.round(changeKg * 10) / 10,
        trendKgPerWeek,
        movingAverageKg: latestThree.length ? Math.round(average(latestThree.map((entry) => entry.weight_kg)) * 10) / 10 : null,
        previousMovingAverageKg: previousThree.length ? Math.round(average(previousThree.map((entry) => entry.weight_kg)) * 10) / 10 : null,
        rangeKg: weights.length ? Math.round((Math.max(...weights) - Math.min(...weights)) * 10) / 10 : 0,
        loggedDays: sortedWeights.length,
        message: getWeightMessage({ loggedDays: sortedWeights.length, trendKgPerWeek, rangeKg: weights.length ? Math.max(...weights) - Math.min(...weights) : 0, goal }),
    };

    return { days, calories, water, weight };
}

function getCalorieMessage({ loggedDays, avgDelta, adherencePct, goal }: { loggedDays: number; avgDelta: number; adherencePct: number; goal: FitnessGoal }) {
    if (loggedDays === 0) return 'Log meals for a few days and BodyPilot will show your calorie consistency and likely scale direction.';
    if (adherencePct >= 70) return `Strong consistency for ${formatGoal(goal)}. Keep meals similar and adjust only if the scale trend disagrees.`;
    if (avgDelta > 300) return 'Calories are running high this week. Pre-plan one lower-calorie meal or swap a snack for protein plus fruit.';
    if (avgDelta < -500) return 'Your deficit is aggressive. Watch energy, training quality, and hunger before pushing lower.';
    return 'Your average is close, but day-to-day swings are wide. Aim for fewer large spikes and dips.';
}

function getWaterMessage({ waterDays, averageGapMl, hitDays, target }: { waterDays: number; averageGapMl: number; hitDays: number; target: number }) {
    if (waterDays === 0) return 'Start with one bottle before lunch and one before dinner to build a measurable hydration baseline.';
    if (hitDays >= 5) return 'Hydration is consistent. Keep this stable so appetite, training, and weigh-ins are easier to interpret.';
    if (averageGapMl > target * 0.35) return 'Hydration is meaningfully below target. Add two scheduled water check-ins instead of relying on memory.';
    return `You are about ${averageGapMl}ml short on average. One extra glass usually closes the gap.`;
}

function getWeightMessage({ loggedDays, trendKgPerWeek, rangeKg, goal }: { loggedDays: number; trendKgPerWeek: number; rangeKg: number; goal: FitnessGoal }) {
    if (loggedDays < 3) return 'Log weight at least 3 mornings per week to separate real trend from water fluctuation.';
    if (rangeKg > 1.2) return 'Daily scale weight is noisy this week. Judge progress from the moving average, not one weigh-in.';
    if (goal === 'lose_fat' && trendKgPerWeek > 0.1) return 'Scale trend is moving up while the goal is fat loss. Check calorie consistency and weekend intake.';
    if ((goal === 'build_muscle' || goal === 'strength') && trendKgPerWeek < -0.1) return 'Weight is drifting down. Add a small calorie bump if performance or recovery is slipping.';
    if (goal === 'maintain' && Math.abs(trendKgPerWeek) <= 0.2) return 'Weight is holding steady. Your current intake looks close to maintenance.';
    return 'Trend direction is usable. Compare it with calorie adherence before changing targets.';
}
