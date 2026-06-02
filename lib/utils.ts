/** Convert kg to lbs */
export function kgToLbs(kg: number): number {
    return kg * 2.20462;
}

/** Convert lbs to kg */
export function lbsToKg(lbs: number): number {
    return lbs / 2.20462;
}

/** Convert cm to feet and inches string */
export function cmToFtIn(cm: number): string {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
}

export type UnitSystem = 'metric' | 'imperial';

export function getWeightUnit(unitSystem?: UnitSystem | null): 'kg' | 'lb' {
    return unitSystem === 'imperial' ? 'lb' : 'kg';
}

export function displayWeightFromKg(kg: number, unitSystem?: UnitSystem | null, decimals = 1): number {
    const value = unitSystem === 'imperial' ? kgToLbs(kg) : kg;
    return Number(value.toFixed(decimals));
}

export function inputWeightToKg(weight: number, unitSystem?: UnitSystem | null): number {
    return unitSystem === 'imperial' ? lbsToKg(weight) : weight;
}

export function formatWeight(kg: number, unitSystem?: UnitSystem | null, decimals = 1): string {
    return `${displayWeightFromKg(kg, unitSystem, decimals).toFixed(decimals)} ${getWeightUnit(unitSystem)}`;
}

export function formatVolume(kg: number, unitSystem?: UnitSystem | null): string {
    const value = unitSystem === 'imperial' ? kgToLbs(kg) : kg;
    return `${formatNumber(Math.round(value))} ${getWeightUnit(unitSystem)}`;
}

/** Calculate estimated 1RM using Epley formula */
export function estimate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
}

/** Calculate TDEE from BMR and activity level */
export function calculateTDEE(bmr: number, activityLevel: string): number {
    const multipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

/** Calculate BMR using Mifflin-St Jeor equation */
export function calculateBMR(
    weightKg: number,
    heightCm: number,
    ageYears: number,
    gender: 'male' | 'female' | 'other'
): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    if (gender === 'female') return Math.round(base - 161);
    if (gender === 'male') return Math.round(base + 5);
    return Math.round(base - 78);
}

export type CaloriePlanGoal = 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp' | 'strength' | 'endurance';
export type CaloriePlanPace = 'steady' | 'balanced' | 'aggressive';

export interface NutritionPlanInput {
    weightKg: number;
    heightCm: number;
    ageYears: number;
    gender: 'male' | 'female' | 'other';
    activityLevel: string;
    goal: CaloriePlanGoal;
    pace: CaloriePlanPace;
    dietStyle?: 'balanced' | 'high_protein' | 'vegetarian' | 'low_carb' | null;
    targetWeightKg?: number | null;
}

export interface NutritionPlanResult {
    bmr: number;
    tdee: number;
    calorieTarget: number;
    calorieDelta: number;
    weeklyEnergyDelta: number;
    estimatedWeeklyWeightChangeKg: number;
    estimatedWeeksToTarget: number | null;
    targetWeightKg: number | null;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number;
    mathSummary: string;
}

const KCAL_PER_KG_BODY_WEIGHT = 7700;

function roundToNearest(value: number, nearest: number) {
    return Math.round(value / nearest) * nearest;
}

function getGoalDailyEnergyDelta(weightKg: number, goal: CaloriePlanGoal, pace: CaloriePlanPace) {
    const paceFactor = { steady: 0.75, balanced: 1, aggressive: 1.25 }[pace];
    const weeklyFatLossRate = {
        lose_fat: 0.0075,
        recomp: 0.0035,
        maintain: 0,
        build_muscle: 0,
        strength: 0,
        endurance: 0,
    }[goal] * paceFactor;
    const weeklyGainRate = {
        lose_fat: 0,
        recomp: 0,
        maintain: 0,
        build_muscle: 0.0025,
        strength: 0.0015,
        endurance: 0,
    }[goal] * paceFactor;

    if (weeklyFatLossRate > 0) {
        const dailyDeficit = (weightKg * weeklyFatLossRate * KCAL_PER_KG_BODY_WEIGHT) / 7;
        return -Math.min(Math.max(dailyDeficit, 250), goal === 'lose_fat' ? 750 : 400);
    }

    if (weeklyGainRate > 0) {
        const dailySurplus = (weightKg * weeklyGainRate * KCAL_PER_KG_BODY_WEIGHT) / 7;
        return Math.min(Math.max(dailySurplus, 125), goal === 'build_muscle' ? 450 : 300);
    }

    return 0;
}

export function buildNutritionPlan(input: NutritionPlanInput): NutritionPlanResult {
    const bmr = calculateBMR(input.weightKg, input.heightCm, input.ageYears, input.gender);
    const tdee = calculateTDEE(bmr, input.activityLevel);
    const rawDelta = getGoalDailyEnergyDelta(input.weightKg, input.goal, input.pace);
    const calorieFloor = input.gender === 'female' ? 1200 : 1500;
    const calorieCeiling = Math.max(tdee + 650, calorieFloor + 300);
    const calorieTarget = roundToNearest(clamp(tdee + rawDelta, calorieFloor, calorieCeiling), 25);
    const calorieDelta = calorieTarget - tdee;

    let proteinPerKg = 1.8;
    let fatPct = 0.28;
    if (input.goal === 'lose_fat' || input.goal === 'recomp') proteinPerKg = 2.1;
    if (input.goal === 'build_muscle' || input.goal === 'strength') proteinPerKg = 1.9;
    if (input.goal === 'endurance') proteinPerKg = 1.6;
    if (input.dietStyle === 'high_protein') proteinPerKg = Math.max(proteinPerKg, 2.2);
    if (input.dietStyle === 'vegetarian') proteinPerKg = Math.max(proteinPerKg, 1.9);
    if (input.dietStyle === 'low_carb') fatPct = 0.4;

    const protein = Math.round(input.weightKg * proteinPerKg);
    const minFatG = Math.round(input.weightKg * 0.6);
    const fat = Math.max(minFatG, Math.round((calorieTarget * fatPct) / 9));
    const carbs = Math.max(50, Math.round((calorieTarget - protein * 4 - fat * 9) / 4));
    const waterMl = Math.round(input.weightKg * (input.activityLevel === 'very_active' ? 42 : 36));
    const weeklyEnergyDelta = calorieDelta * 7;
    const estimatedWeeklyWeightChangeKg = weeklyEnergyDelta / KCAL_PER_KG_BODY_WEIGHT;
    const targetWeightKg = input.targetWeightKg ?? null;
    const kgToTarget = targetWeightKg != null ? targetWeightKg - input.weightKg : null;
    const estimatedWeeksToTarget = kgToTarget != null && Math.abs(estimatedWeeklyWeightChangeKg) > 0.05 && Math.sign(kgToTarget) === Math.sign(estimatedWeeklyWeightChangeKg)
        ? Math.max(1, Math.ceil(Math.abs(kgToTarget / estimatedWeeklyWeightChangeKg)))
        : null;
    const direction = calorieDelta < 0 ? 'deficit' : calorieDelta > 0 ? 'surplus' : 'maintenance target';
    const weeklyChangeLabel = Math.abs(estimatedWeeklyWeightChangeKg) < 0.05
        ? 'roughly stable body weight'
        : `${Math.abs(estimatedWeeklyWeightChangeKg).toFixed(2)} kg/week ${estimatedWeeklyWeightChangeKg < 0 ? 'loss' : 'gain'}`;

    return {
        bmr,
        tdee,
        calorieTarget,
        calorieDelta,
        weeklyEnergyDelta,
        estimatedWeeklyWeightChangeKg,
        estimatedWeeksToTarget,
        targetWeightKg,
        protein,
        carbs,
        fat,
        waterMl,
        mathSummary: `BMR ${bmr} kcal + activity = TDEE ${tdee} kcal. Your target is ${calorieTarget} kcal, a ${Math.abs(calorieDelta)} kcal/day ${direction}. Over a week that is ${Math.abs(weeklyEnergyDelta)} kcal, which estimates ${weeklyChangeLabel}.`,
    };
}

/** Format duration in seconds to mm:ss */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format duration in seconds to readable string */
export function formatDurationLong(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

/** Get greeting based on time of day */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

/** Calculate macro calories */
export function macroCalories(proteinG: number, carbsG: number, fatG: number): number {
    return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
}

/** Generate a UUID v4 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/** Format number with commas */
export function formatNumber(n: number): string {
    return n.toLocaleString();
}

/** Get percentage, capped at 100 */
export function getPercentage(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
}
