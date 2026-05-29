import { getLocalDateKey } from '@/lib/date';
import type { BodyMeasurement, Goal, ProgressPhoto, UserProfile, WeightEntry } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export type MeasurementKey =
    | 'chest_cm'
    | 'waist_cm'
    | 'hips_cm'
    | 'shoulders_cm'
    | 'left_arm_cm'
    | 'right_arm_cm'
    | 'left_thigh_cm'
    | 'right_thigh_cm'
    | 'left_calf_cm'
    | 'right_calf_cm'
    | 'neck_cm';

export type MeasurementDelta = {
    key: MeasurementKey;
    label: string;
    currentCm: number;
    previousCm: number | null;
    deltaCm: number | null;
};

export type WeightTrendPoint = {
    dateKey: string;
    label: string;
    weightKg: number;
    bodyFatPct: number | null;
};

export type ProgressAnalytics = {
    currentWeightKg: number | null;
    previousWeightKg: number | null;
    totalChangeKg: number | null;
    recentChangeKg: number | null;
    trendKgPerWeek: number | null;
    weightRangeKg: number | null;
    weightLogCount: number;
    weightLogsLast14: number;
    weightPoints: WeightTrendPoint[];
    bodyFatPct: number | null;
    bodyFatChangePct: number | null;
    latestMeasurement: BodyMeasurement | null;
    measurementDeltas: MeasurementDelta[];
    measurementLogCount: number;
    latestPhoto: ProgressPhoto | null;
    photoCount: number;
    daysSincePhoto: number | null;
    activeGoals: Goal[];
    completedGoals: Goal[];
    priorityGoal: Goal | null;
    priorityGoalPct: number | null;
    weightGoalRemainingKg: number | null;
    checkInScore: number;
    statusLabel: string;
    statusDetail: string;
    recommendation: string;
};

export const MEASUREMENT_LABELS: { key: MeasurementKey; label: string }[] = [
    { key: 'waist_cm', label: 'Waist' },
    { key: 'chest_cm', label: 'Chest' },
    { key: 'hips_cm', label: 'Hips' },
    { key: 'shoulders_cm', label: 'Shoulders' },
    { key: 'left_arm_cm', label: 'Left arm' },
    { key: 'right_arm_cm', label: 'Right arm' },
    { key: 'left_thigh_cm', label: 'Left thigh' },
    { key: 'right_thigh_cm', label: 'Right thigh' },
    { key: 'left_calf_cm', label: 'Left calf' },
    { key: 'right_calf_cm', label: 'Right calf' },
    { key: 'neck_cm', label: 'Neck' },
];

function timeOf(value: string) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
}

function dateLabel(dateKey: string) {
    const [, month, day] = dateKey.split('-').map(Number);
    return `${month}/${day}`;
}

function clamp(value: number, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max);
}

function normalizeWeightTarget(goal: Goal) {
    const unit = goal.unit.toLowerCase();
    if (unit.includes('lb')) return goal.target_value / 2.20462;
    return goal.target_value;
}

function getGoalProgress(goal: Goal) {
    if (!goal.target_value) return 0;
    return clamp((goal.current_value / goal.target_value) * 100);
}

function getWeightGoalProgress(goal: Goal, weightPoints: WeightTrendPoint[], currentWeightKg: number | null) {
    if (currentWeightKg == null || weightPoints.length === 0) return null;
    const targetKg = normalizeWeightTarget(goal);
    const startPoint = weightPoints[0];
    const startKg = startPoint.weightKg;
    const totalDelta = targetKg - startKg;
    const currentDelta = currentWeightKg - startKg;

    if (Math.abs(totalDelta) < 0.1) return 100;
    if (totalDelta > 0) return clamp((currentDelta / totalDelta) * 100);
    return clamp((currentDelta / totalDelta) * 100);
}

function buildWeightPoints(weightEntries: WeightEntry[], user: UserProfile | null): WeightTrendPoint[] {
    const sorted = [...weightEntries]
        .filter((entry) => Number.isFinite(entry.weight_kg) && entry.weight_kg > 0)
        .sort((a, b) => timeOf(a.logged_at) - timeOf(b.logged_at));

    const dailyLatest = new Map<string, WeightEntry>();
    sorted.forEach((entry) => {
        dailyLatest.set(getLocalDateKey(new Date(entry.logged_at)), entry);
    });

    const points = Array.from(dailyLatest.entries()).map(([dateKey, entry]) => ({
        dateKey,
        label: dateLabel(dateKey),
        weightKg: entry.weight_kg,
        bodyFatPct: entry.body_fat_pct,
    }));

    if (points.length === 0) {
        const profileWeight = user?.current_weight_kg || user?.weight_kg || null;
        if (profileWeight) {
            const dateKey = getLocalDateKey();
            return [{ dateKey, label: dateLabel(dateKey), weightKg: profileWeight, bodyFatPct: null }];
        }
    }

    return points.slice(-21);
}

function buildMeasurementDeltas(measurements: BodyMeasurement[]) {
    const [latest, previous] = [...measurements].sort((a, b) => timeOf(b.logged_at) - timeOf(a.logged_at));
    if (!latest) return [];

    return MEASUREMENT_LABELS
        .map(({ key, label }) => {
            const current = latest[key];
            if (current == null) return null;
            const previousValue = previous?.[key] ?? null;
            return {
                key,
                label,
                currentCm: current,
                previousCm: previousValue,
                deltaCm: previousValue == null ? null : current - previousValue,
            };
        })
        .filter(Boolean) as MeasurementDelta[];
}

function getRecommendation({
    user,
    weightLogsLast14,
    trendKgPerWeek,
    activeGoals,
    daysSincePhoto,
    measurementLogCount,
}: {
    user: UserProfile | null;
    weightLogsLast14: number;
    trendKgPerWeek: number | null;
    activeGoals: Goal[];
    daysSincePhoto: number | null;
    measurementLogCount: number;
}) {
    if (weightLogsLast14 < 3) {
        return 'Log three morning weigh-ins this week so BodyPilot can separate real trend from normal day-to-day fluctuation.';
    }
    if (measurementLogCount === 0) {
        return 'Add waist, chest, and hip measurements once. They make fat loss or muscle gain easier to confirm when scale weight is noisy.';
    }
    if (daysSincePhoto == null || daysSincePhoto > 21) {
        return 'Take front, side, and back progress photos this week. Monthly photo sets are the easiest way to see visual change.';
    }
    if (activeGoals.length === 0) {
        return 'Create one measurable goal for the next 4-8 weeks so progress has a clear target.';
    }
    if (trendKgPerWeek != null && user?.goal === 'lose_fat' && trendKgPerWeek > 0.15) {
        return 'Your recent scale trend is moving up. Review weekly calories and keep training performance steady before changing everything.';
    }
    if (trendKgPerWeek != null && user?.goal === 'build_muscle' && trendKgPerWeek < -0.1) {
        return 'Your recent scale trend is drifting down. If muscle gain is the goal, consider a small calorie increase and watch strength numbers.';
    }
    return 'Keep the check-in rhythm: weight 3-5x weekly, measurements every 2 weeks, and photos monthly.';
}

export function buildProgressAnalytics({
    weightEntries,
    measurements,
    progressPhotos,
    goals,
    user,
}: {
    weightEntries: WeightEntry[];
    measurements: BodyMeasurement[];
    progressPhotos: ProgressPhoto[];
    goals: Goal[];
    user: UserProfile | null;
}): ProgressAnalytics {
    const weightPoints = buildWeightPoints(weightEntries, user);
    const currentPoint = weightPoints[weightPoints.length - 1] ?? null;
    const previousPoint = weightPoints[weightPoints.length - 2] ?? null;
    const firstPoint = weightPoints[0] ?? null;
    const currentWeightKg = currentPoint?.weightKg ?? null;
    const previousWeightKg = previousPoint?.weightKg ?? null;
    const totalChangeKg = currentWeightKg != null && firstPoint ? currentWeightKg - firstPoint.weightKg : null;
    const recentChangeKg = currentWeightKg != null && previousWeightKg != null ? currentWeightKg - previousWeightKg : null;
    const minWeight = weightPoints.length ? Math.min(...weightPoints.map((point) => point.weightKg)) : null;
    const maxWeight = weightPoints.length ? Math.max(...weightPoints.map((point) => point.weightKg)) : null;
    const weightRangeKg = minWeight != null && maxWeight != null ? maxWeight - minWeight : null;
    const daysBetween = firstPoint && currentPoint
        ? Math.max(1, (timeOf(`${currentPoint.dateKey}T12:00:00`) - timeOf(`${firstPoint.dateKey}T12:00:00`)) / DAY_MS)
        : 1;
    const trendKgPerWeek = firstPoint && currentPoint && weightPoints.length > 1
        ? ((currentPoint.weightKg - firstPoint.weightKg) / daysBetween) * 7
        : null;

    const now = Date.now();
    const weightLogsLast14 = weightEntries.filter((entry) => now - timeOf(entry.logged_at) <= 14 * DAY_MS).length;
    const bodyFatEntries = [...weightEntries]
        .filter((entry) => entry.body_fat_pct != null)
        .sort((a, b) => timeOf(b.logged_at) - timeOf(a.logged_at));
    const latestBodyFat = bodyFatEntries[0]?.body_fat_pct ?? null;
    const previousBodyFat = bodyFatEntries[1]?.body_fat_pct ?? null;
    const bodyFatChangePct = latestBodyFat != null && previousBodyFat != null ? latestBodyFat - previousBodyFat : null;

    const sortedMeasurements = [...measurements].sort((a, b) => timeOf(b.logged_at) - timeOf(a.logged_at));
    const latestMeasurement = sortedMeasurements[0] ?? null;
    const measurementDeltas = buildMeasurementDeltas(sortedMeasurements);

    const sortedPhotos = [...progressPhotos].sort((a, b) => timeOf(b.taken_at) - timeOf(a.taken_at));
    const latestPhoto = sortedPhotos[0] ?? null;
    const daysSincePhoto = latestPhoto ? Math.max(0, Math.floor((now - timeOf(latestPhoto.taken_at)) / DAY_MS)) : null;

    const activeGoals = goals.filter((goal) => goal.status === 'active');
    const completedGoals = goals.filter((goal) => goal.status === 'completed');
    const priorityGoal = activeGoals.find((goal) => goal.goal_type === 'weight') ?? activeGoals[0] ?? null;
    const priorityGoalPct = priorityGoal
        ? priorityGoal.goal_type === 'weight'
            ? getWeightGoalProgress(priorityGoal, weightPoints, currentWeightKg) ?? getGoalProgress(priorityGoal)
            : getGoalProgress(priorityGoal)
        : null;
    const weightGoalRemainingKg = priorityGoal?.goal_type === 'weight' && currentWeightKg != null
        ? normalizeWeightTarget(priorityGoal) - currentWeightKg
        : null;

    const checkInScore = Math.round(
        clamp(weightLogsLast14 / 6, 0, 1) * 38
        + clamp(measurements.length / 4, 0, 1) * 24
        + clamp(progressPhotos.length / 4, 0, 1) * 20
        + clamp((activeGoals.length + completedGoals.length) / 3, 0, 1) * 18
    );

    const statusLabel = checkInScore >= 78 ? 'Dialed in' : checkInScore >= 48 ? 'Building rhythm' : 'Needs baseline';
    const statusDetail = checkInScore >= 78
        ? 'Your progress data is strong enough to spot trends.'
        : checkInScore >= 48
            ? 'A few more check-ins will sharpen the picture.'
            : 'Start with weight, measurements, and one photo set.';

    return {
        currentWeightKg,
        previousWeightKg,
        totalChangeKg,
        recentChangeKg,
        trendKgPerWeek,
        weightRangeKg,
        weightLogCount: weightEntries.length,
        weightLogsLast14,
        weightPoints,
        bodyFatPct: latestBodyFat,
        bodyFatChangePct,
        latestMeasurement,
        measurementDeltas,
        measurementLogCount: measurements.length,
        latestPhoto,
        photoCount: progressPhotos.length,
        daysSincePhoto,
        activeGoals,
        completedGoals,
        priorityGoal,
        priorityGoalPct,
        weightGoalRemainingKg,
        checkInScore,
        statusLabel,
        statusDetail,
        recommendation: getRecommendation({
            user,
            weightLogsLast14,
            trendKgPerWeek,
            activeGoals,
            daysSincePhoto,
            measurementLogCount: measurements.length,
        }),
    };
}
