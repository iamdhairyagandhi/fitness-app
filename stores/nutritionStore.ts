import { deleteFoodLog, saveFoodLog, saveWaterLog } from '@/lib/db';
import { applyXPReward } from '@/lib/gamification';
import { generateId } from '@/lib/utils';
import type {
    DailyNutritionSummary,
    FoodItem,
    FoodLogEntry,
    MealType,
    WaterLog,
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

interface NutritionState {
    // Today's data
    todaySummary: DailyNutritionSummary;
    waterLogs: WaterLog[];

    // Search
    searchResults: FoodItem[];
    recentFoods: FoodItem[];
    isSearching: boolean;

    // Actions
    logFood: (foodItem: FoodItem, servings: number, mealType: MealType) => void;
    removeLogEntry: (entryId: string) => void;
    logWater: (amountMl: number) => void;
    setTodaySummary: (summary: DailyNutritionSummary) => void;
    setSearchResults: (results: FoodItem[]) => void;
    setRecentFoods: (foods: FoodItem[]) => void;
    setIsSearching: (searching: boolean) => void;
    resetDaily: () => void;
}

const emptyDay = (): DailyNutritionSummary => ({
    date: new Date().toISOString().split('T')[0],
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
});

export const useNutritionStore = create<NutritionState>()(
    persist(
        (set, get) => ({
            todaySummary: emptyDay(),
            waterLogs: [],
            searchResults: [],
            recentFoods: [],
            isSearching: false,

            logFood: (foodItem, servings, mealType) => {
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
                    notes: null,
                };

                const { todaySummary } = get();
                const meals = { ...todaySummary.meals };
                meals[mealType] = [...meals[mealType], entry];

                set({
                    todaySummary: {
                        ...todaySummary,
                        total_calories: todaySummary.total_calories + entry.calories,
                        total_protein_g: todaySummary.total_protein_g + entry.protein_g,
                        total_carbs_g: todaySummary.total_carbs_g + entry.carbs_g,
                        total_fat_g: todaySummary.total_fat_g + entry.fat_g,
                        meals,
                    },
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

            removeLogEntry: (entryId) => {
                const { todaySummary } = get();
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
                    set({
                        todaySummary: {
                            ...todaySummary,
                            total_calories: todaySummary.total_calories - removed.calories,
                            total_protein_g: todaySummary.total_protein_g - removed.protein_g,
                            total_carbs_g: todaySummary.total_carbs_g - removed.carbs_g,
                            total_fat_g: todaySummary.total_fat_g - removed.fat_g,
                            meals,
                        },
                    });
                    // Persist deletion
                    deleteFoodLog(entryId).catch(() => { });
                }
            },

            logWater: (amountMl) => {
                const log: WaterLog = {
                    id: generateId(),
                    user_id: '',
                    amount_ml: amountMl,
                    logged_at: new Date().toISOString(),
                };

                const { todaySummary, waterLogs } = get();
                set({
                    waterLogs: [...waterLogs, log],
                    todaySummary: {
                        ...todaySummary,
                        water_ml: todaySummary.water_ml + amountMl,
                    },
                });

                // Persist to Supabase
                saveWaterLog(log).catch(() => { });

                // Award XP
                const authState = useAuthStore.getState();
                if (authState.user) {
                    authState.updateUser(applyXPReward(authState.user, 'LOG_WATER'));
                }
            },

            setTodaySummary: (summary) => set({ todaySummary: summary }),
            setSearchResults: (results) => set({ searchResults: results }),
            setRecentFoods: (foods) => set({ recentFoods: foods }),
            setIsSearching: (isSearching) => set({ isSearching }),
            resetDaily: () => set({ todaySummary: emptyDay(), waterLogs: [] }),
        }),
        {
            name: 'fitfusion-nutrition',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                todaySummary: state.todaySummary,
                waterLogs: state.waterLogs,
                recentFoods: state.recentFoods,
            }),
        }
    )
);
