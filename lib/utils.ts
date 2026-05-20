/** Convert kg to lbs */
export function kgToLbs(kg: number): number {
    return Math.round(kg * 2.20462 * 10) / 10;
}

/** Convert lbs to kg */
export function lbsToKg(lbs: number): number {
    return Math.round(lbs / 2.20462 * 10) / 10;
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
    return Math.round(gender === 'female' ? base - 161 : base + 5);
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
