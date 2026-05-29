import { deleteFoodLog, saveFoodLog, saveWaterLog } from '@/lib/db';
import { applyXPReward } from '@/lib/gamification';
import { getLocalDateKey } from '@/lib/date';
import { createEmptyNutritionDay, upsertNutritionHistory } from '@/lib/nutritionSummary';
import AsyncStorage from '@/lib/storage';
import { generateId } from '@/lib/utils';
import type {
    DailyNutritionSummary,
    FoodItem,
    FoodLogEntry,
    MealType,
    WaterLog,
} from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

interface NutritionState {
    // Today's data
    todaySummary: DailyNutritionSummary;
    waterLogs: WaterLog[];
    nutritionHistory: DailyNutritionSummary[];

    // Search
    searchResults: FoodItem[];
    recentFoods: FoodItem[];
    isSearching: boolean;

    // Actions
    logFood: (foodItem: FoodItem, servings: number, mealType: MealType, options?: { notes?: string | null; photoUri?: string | null }) => void;
    removeLogEntry: (entryId: string) => void;
    moveLogEntry: (entryId: string, mealType: MealType) => void;
    logWater: (amountMl: number) => void;
    ensureToday: () => void;
    setTodaySummary: (summary: DailyNutritionSummary) => void;
    setNutritionHistory: (history: DailyNutritionSummary[]) => void;
    setSearchResults: (results: FoodItem[]) => void;
    setRecentFoods: (foods: FoodItem[]) => void;
    setIsSearching: (searching: boolean) => void;
    resetDaily: () => void;
}

const emptyDay = createEmptyNutritionDay;

function currentDayState(state: NutritionState): {
    todaySummary: DailyNutritionSummary;
    waterLogs: WaterLog[];
    nutritionHistory: DailyNutritionSummary[];
} {
    const today = getLocalDateKey();
    const summary = state.todaySummary?.date ? state.todaySummary : emptyDay(today);
    const history = state.nutritionHistory || [];
    const waterLogs = state.waterLogs || [];

    if (summary.date === today) {
        return {
            todaySummary: summary,
            waterLogs,
            nutritionHistory: upsertNutritionHistory(history, summary),
        };
    }

    return {
        todaySummary: emptyDay(today),
        waterLogs: [],
        nutritionHistory: upsertNutritionHistory(history, summary),
    };
}

export const useNutritionStore = create<NutritionState>()(
    persist(
        (set, get) => ({
            todaySummary: emptyDay(),
            waterLogs: [],
            nutritionHistory: [],
            searchResults: [],
            recentFoods: [],
            isSearching: false,

            logFood: (foodItem, servings, mealType, options) => {
                const current = currentDayState(get());
                const entry: FoodLogEntry = {
                    id: generateId(),
                    user_id: '',
                    food_item_id: foodItem.id,
                    food_item: foodItem,
                    meal_type: mealType,
                    servings,
                    logged_at: new Date().toISOString(),
                    calories: Math.round(foodItem.calories * servings),
                    protein_g: Math.round(foodItem.protein_g * servings * 10) / 10,
                    carbs_g: Math.round(foodItem.carbs_g * servings * 10) / 10,
                    fat_g: Math.round(foodItem.fat_g * servings * 10) / 10,
                    notes: options?.notes?.trim() || null,
                    photo_uri: options?.photoUri || null,
                };

                const { todaySummary } = current;
                const meals = { ...todaySummary.meals };
                meals[mealType] = [...meals[mealType], entry];

                const recentFoods = [
                    foodItem,
                    ...get().recentFoods.filter((food) => food.id !== foodItem.id),
                ].slice(0, 12);

                const nextSummary = {
                    ...todaySummary,
                    total_calories: todaySummary.total_calories + entry.calories,
                    total_protein_g: Math.round((todaySummary.total_protein_g + entry.protein_g) * 10) / 10,
                    total_carbs_g: Math.round((todaySummary.total_carbs_g + entry.carbs_g) * 10) / 10,
                    total_fat_g: Math.round((todaySummary.total_fat_g + entry.fat_g) * 10) / 10,
                    total_fiber_g: Math.round((todaySummary.total_fiber_g + (foodItem.fiber_g || 0) * servings) * 10) / 10,
                    meals,
                };

                set({
                    todaySummary: nextSummary,
                    waterLogs: current.waterLogs,
                    nutritionHistory: upsertNutritionHistory(current.nutritionHistory, nextSummary),
                    recentFoods,
                });

                // Persist to Supabase
                saveFoodLog(entry).catch(() => { });

                // Award XP
                const authState = useAuthStore.getState();
                if (authState.user) {
                    authState.updateUser(applyXPReward(authState.user, 'LOG_FOOD'));
                }

                // Check nutrition achievements
                const totalMeals = Object.values(get().todaySummary.meals).flat().length;
                const { useRecoveryStore } = require('./recoveryStore');
                useRecoveryStore.getState().checkAchievements({
                    meals_logged: totalMeals,
                    max_protein_day: get().todaySummary.total_protein_g,
                });
            },

            moveLogEntry: (entryId, mealType) => {
                const current = currentDayState(get());
                const { todaySummary } = current;
                const meals = { ...todaySummary.meals };
                let moved: FoodLogEntry | null = null;
                let fromMeal: MealType | null = null;

                for (const candidate of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
                    const idx = meals[candidate].findIndex((entry) => entry.id === entryId);
                    if (idx !== -1) {
                        moved = { ...meals[candidate][idx], meal_type: mealType };
                        fromMeal = candidate;
                        meals[candidate] = meals[candidate].filter((entry) => entry.id !== entryId);
                        break;
                    }
                }

                if (!moved || !fromMeal || fromMeal === mealType) return;

                meals[mealType] = [...meals[mealType], moved];
                const nextSummary = { ...todaySummary, meals };
                set({
                    todaySummary: nextSummary,
                    waterLogs: current.waterLogs,
                    nutritionHistory: upsertNutritionHistory(current.nutritionHistory, nextSummary),
                });
                saveFoodLog(moved).catch(() => { });
            },

            removeLogEntry: (entryId) => {
                const current = currentDayState(get());
                const { todaySummary } = current;
                const meals = { ...todaySummary.meals };
                let removed: FoodLogEntry | null = null;

                for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
                    const idx = meals[mealType].findIndex((e) => e.id === entryId);
                    if (idx !== -1) {
                        removed = meals[mealType][idx];
                        meals[mealType] = meals[mealType].filter((e) => e.id !== entryId);
                        break;
                    }
                }

                if (removed) {
                    const nextSummary = {
                        ...todaySummary,
                        total_calories: Math.max(0, todaySummary.total_calories - removed.calories),
                        total_protein_g: Math.max(0, Math.round((todaySummary.total_protein_g - removed.protein_g) * 10) / 10),
                        total_carbs_g: Math.max(0, Math.round((todaySummary.total_carbs_g - removed.carbs_g) * 10) / 10),
                        total_fat_g: Math.max(0, Math.round((todaySummary.total_fat_g - removed.fat_g) * 10) / 10),
                        total_fiber_g: Math.max(0, Math.round((todaySummary.total_fiber_g - (removed.food_item.fiber_g || 0) * removed.servings) * 10) / 10),
                        meals,
                    };
                    set({
                        todaySummary: nextSummary,
                        waterLogs: current.waterLogs,
                        nutritionHistory: upsertNutritionHistory(current.nutritionHistory, nextSummary),
                    });
                    // Persist deletion
                    deleteFoodLog(entryId).catch(() => { });
                }
            },

            logWater: (amountMl) => {
                const current = currentDayState(get());
                const log: WaterLog = {
                    id: generateId(),
                    user_id: '',
                    amount_ml: amountMl,
                    logged_at: new Date().toISOString(),
                };

                const { todaySummary, waterLogs } = current;
                const nextSummary = {
                    ...todaySummary,
                    water_ml: todaySummary.water_ml + amountMl,
                };
                set({
                    waterLogs: [...waterLogs, log],
                    todaySummary: nextSummary,
                    nutritionHistory: upsertNutritionHistory(current.nutritionHistory, nextSummary),
                });

                // Persist to Supabase
                saveWaterLog(log).catch(() => { });

                // Award XP
                const authState = useAuthStore.getState();
                if (authState.user) {
                    authState.updateUser(applyXPReward(authState.user, 'LOG_WATER'));
                }
            },

            ensureToday: () => {
                const current = currentDayState(get());
                set({
                    todaySummary: current.todaySummary,
                    waterLogs: current.waterLogs,
                    nutritionHistory: current.nutritionHistory,
                });
            },

            setTodaySummary: (summary) => set((state) => ({
                todaySummary: summary,
                nutritionHistory: upsertNutritionHistory(state.nutritionHistory, summary),
            })),
            setNutritionHistory: (history) => set({ nutritionHistory: history }),
            setSearchResults: (results) => set({ searchResults: results }),
            setRecentFoods: (foods) => set({ recentFoods: foods }),
            setIsSearching: (isSearching) => set({ isSearching }),
            resetDaily: () => set((state) => {
                const nextSummary = emptyDay();
                return {
                    todaySummary: nextSummary,
                    waterLogs: [],
                    nutritionHistory: upsertNutritionHistory(state.nutritionHistory, nextSummary),
                };
            }),
        }),
        {
            name: 'bodypilot-nutrition',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                todaySummary: state.todaySummary,
                waterLogs: state.waterLogs,
                nutritionHistory: state.nutritionHistory,
                recentFoods: state.recentFoods,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const current = currentDayState(state);
                useNutritionStore.setState({
                    todaySummary: current.todaySummary,
                    waterLogs: current.waterLogs,
                    nutritionHistory: current.nutritionHistory,
                });
            },
        }
    )
);
