import type { DailyNutritionSummary, FoodLogEntry, MealType, WaterLog } from '@/types';
import { getLocalDateKey } from './date';

export function createEmptyNutritionDay(date: string = getLocalDateKey()): DailyNutritionSummary {
    return {
        date,
        total_calories: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        total_fat_g: 0,
        total_fiber_g: 0,
        water_ml: 0,
        meals: {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: [],
        },
    };
}

export function buildNutritionSummary(
    date: string,
    foodLogs: FoodLogEntry[] = [],
    waterLogs: WaterLog[] = []
): DailyNutritionSummary {
    const meals: Record<MealType, FoodLogEntry[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
    };

    let totalCal = 0;
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    let totalFiber = 0;

    foodLogs.forEach((log) => {
        meals[log.meal_type].push(log);
        totalCal += log.calories;
        totalP += log.protein_g;
        totalC += log.carbs_g;
        totalF += log.fat_g;
        totalFiber += (log.food_item.fiber_g || 0) * log.servings;
    });

    return {
        date,
        total_calories: Math.round(totalCal),
        total_protein_g: Math.round(totalP * 10) / 10,
        total_carbs_g: Math.round(totalC * 10) / 10,
        total_fat_g: Math.round(totalF * 10) / 10,
        total_fiber_g: Math.round(totalFiber * 10) / 10,
        water_ml: waterLogs.reduce((sum, log) => sum + log.amount_ml, 0),
        meals,
    };
}

export function upsertNutritionHistory(
    history: DailyNutritionSummary[],
    summary: DailyNutritionSummary,
    limit = 30
): DailyNutritionSummary[] {
    return [
        ...history.filter((day) => day.date !== summary.date),
        summary,
    ]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-limit);
}
