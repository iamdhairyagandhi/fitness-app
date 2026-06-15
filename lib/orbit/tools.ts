/**
 * Tool registry for Orbit Voice.
 *
 * Each tool has:
 *   - a JSON schema definition that ships to the OpenAI Realtime model
 *   - a typed handler that mutates Zustand stores or reads state
 *
 * Handlers are pure JS (no UI) so they're testable and reusable.
 * All numeric inputs are clamped; all routes are allow-listed.
 */

import { router } from 'expo-router';
import { generateId } from '@/lib/utils';
import { getLocalDateKey } from '@/lib/date';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAppleHealthStore } from '@/stores/appleHealthStore';
import { useAuthStore } from '@/stores/authStore';
import { parseNaturalLanguageFood, parseNaturalLanguageFoodDemo } from '@/lib/nutritionIntelligence';
import { AI_PROXY_ENABLED } from '@/constants/config';
import type { MealType } from '@/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OrbitToolResult {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
}

export interface OrbitToolDefinition {
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export type OrbitToolHandler = (
    args: Record<string, unknown>,
) => Promise<OrbitToolResult> | OrbitToolResult;

// ---------------------------------------------------------------------------
// Input clamping helpers
// ---------------------------------------------------------------------------

const MEAL_TYPES: ReadonlyArray<MealType> = ['breakfast', 'lunch', 'dinner', 'snack'];

function clampNumber(value: unknown, min: number, max: number): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
}

function clampInt(value: unknown, min: number, max: number): number | null {
    const n = clampNumber(value, min, max);
    return n === null ? null : Math.round(n);
}

function coerceMeal(value: unknown): MealType {
    if (typeof value === 'string') {
        const v = value.toLowerCase() as MealType;
        if (MEAL_TYPES.includes(v)) return v;
    }
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
}

function inferUnit(unit: unknown, defaultUnit = 'serving'): string {
    if (typeof unit === 'string' && unit.trim()) return unit.trim();
    return defaultUnit;
}

// ---------------------------------------------------------------------------
// Allow-listed routes for navigate()
// ---------------------------------------------------------------------------

const NAVIGATE_ALLOWLIST: Record<string, string> = {
    home: '/',
    dashboard: '/',
    nutrition: '/nutrition',
    workout: '/workout',
    workouts: '/workout',
    recovery: '/recovery',
    progress: '/progress',
    achievements: '/achievements',
    settings: '/settings',
    log: '/nutrition/nlp-food-log',
    'food log': '/nutrition/nlp-food-log',
    water: '/nutrition',
    cardio: '/workout/cardio',
    'meal plan': '/nutrition/meal-plan',
    profile: '/settings',
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleLogWater(args: Record<string, unknown>): Promise<OrbitToolResult> {
    const amount = clampInt(args.amount_ml, 50, 4000);
    if (amount === null) {
        return { success: false, message: "I couldn't make out how much water — try a number in milliliters or ounces." };
    }
    useNutritionStore.getState().logWater(amount);
    return {
        success: true,
        message: `Logged ${amount} milliliters of water.`,
        data: { amount_ml: amount },
    };
}

interface RawFoodItem {
    name?: unknown;
    quantity?: unknown;
    unit?: unknown;
    calories?: unknown;
    protein_g?: unknown;
    carbs_g?: unknown;
    fat_g?: unknown;
    fiber_g?: unknown;
}

async function handleLogFood(args: Record<string, unknown>): Promise<OrbitToolResult> {
    const rawItems = Array.isArray(args.items) ? (args.items as RawFoodItem[]) : [];
    if (rawItems.length === 0) {
        return { success: false, message: "Tell me at least one food and roughly how much." };
    }
    if (rawItems.length > 8) rawItems.length = 8;

    const meal = coerceMeal(args.meal);
    const logFood = useNutritionStore.getState().logFood;

    let logged = 0;
    const summaries: string[] = [];

    for (const raw of rawItems) {
        const name = typeof raw.name === 'string' ? raw.name.trim() : '';
        if (!name) continue;
        const quantity = clampNumber(raw.quantity, 0.1, 5000) ?? 1;
        const unit = inferUnit(raw.unit);

        // If macros missing, fall back to the existing NLP parser (single phrase).
        const hasMacros = typeof raw.calories === 'number';
        let macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };

        if (hasMacros) {
            macros = {
                calories: clampInt(raw.calories, 0, 5000) ?? 0,
                protein_g: clampNumber(raw.protein_g, 0, 500) ?? 0,
                carbs_g: clampNumber(raw.carbs_g, 0, 1000) ?? 0,
                fat_g: clampNumber(raw.fat_g, 0, 500) ?? 0,
                fiber_g: clampNumber(raw.fiber_g, 0, 200) ?? 0,
            };
        } else {
            try {
                const phrase = `${quantity} ${unit} ${name}`;
                const parsed = AI_PROXY_ENABLED
                    ? await parseNaturalLanguageFood(phrase)
                    : parseNaturalLanguageFoodDemo(phrase);
                const first = parsed.items[0];
                macros = first
                    ? {
                        calories: first.calories,
                        protein_g: first.protein_g,
                        carbs_g: first.carbs_g,
                        fat_g: first.fat_g,
                        fiber_g: first.fiber_g,
                    }
                    : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
            } catch {
                macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
            }
        }

        logFood(
            {
                id: generateId(),
                name,
                brand: 'Orbit',
                barcode: null,
                serving_size_g: quantity,
                serving_unit: unit,
                calories: macros.calories,
                protein_g: macros.protein_g,
                carbs_g: macros.carbs_g,
                fat_g: macros.fat_g,
                fiber_g: macros.fiber_g,
                sugar_g: null,
                sodium_mg: null,
                is_custom: false,
                user_id: null,
                image_url: null,
            },
            1,
            meal,
            { notes: `Voice-logged via Orbit (${unit})` },
        );

        logged += 1;
        summaries.push(`${name} (~${Math.round(macros.calories)} cal)`);
    }

    if (logged === 0) {
        return { success: false, message: "I couldn't read any of those food items. Try again with one item and a portion." };
    }

    return {
        success: true,
        message: `Logged ${logged} item${logged === 1 ? '' : 's'} to ${meal}: ${summaries.join(', ')}.`,
        data: { logged_count: logged, meal },
    };
}

function handleLogWorkoutStart(args: Record<string, unknown>): OrbitToolResult {
    const rawName = typeof args.name === 'string' ? args.name.trim() : '';
    const name = rawName || 'Voice workout';
    useWorkoutStore.getState().startWorkout(name);
    try {
        router.push('/workout' as never);
    } catch {
        // Router may not be ready; not fatal.
    }
    return {
        success: true,
        message: `Started "${name}". I opened your workout screen so you can add sets.`,
        data: { name },
    };
}

function handleLogWorkoutComplete(): OrbitToolResult {
    const finished = useWorkoutStore.getState().finishWorkout();
    if (!finished) {
        return { success: false, message: 'No active workout to finish.' };
    }
    return {
        success: true,
        message: `Finished "${finished.name}".`,
        data: { name: finished.name },
    };
}

function handleLogRecovery(args: Record<string, unknown>): OrbitToolResult {
    const sleepHours = clampNumber(args.sleep_hours, 0, 16);
    const soreness = clampInt(args.soreness_level, 0, 5);
    const mood = clampInt(args.mood, 1, 5);
    const energy = clampInt(args.energy_level, 1, 5);
    const stress = clampInt(args.stress_level, 1, 5);
    const sleepQuality = clampInt(args.sleep_quality, 1, 5);
    const notes = typeof args.notes === 'string' ? args.notes.slice(0, 280) : null;

    const hasAny = sleepHours !== null || soreness !== null || mood !== null
        || energy !== null || stress !== null || sleepQuality !== null || !!notes;
    if (!hasAny) {
        return { success: false, message: 'Give me at least one recovery detail — sleep, soreness, mood, or stress.' };
    }

    useRecoveryStore.getState().logRecovery({
        date: getLocalDateKey(),
        sleep_hours: sleepHours,
        sleep_quality: (sleepQuality ?? null) as 1 | 2 | 3 | 4 | 5 | null,
        soreness_level: (soreness ?? 0) as 0 | 1 | 2 | 3 | 4 | 5,
        sore_body_parts: [],
        stress_level: (stress ?? null) as 1 | 2 | 3 | 4 | 5 | null,
        energy_level: (energy ?? null) as 1 | 2 | 3 | 4 | 5 | null,
        mood: (mood ?? null) as 1 | 2 | 3 | 4 | 5 | null,
        resting_hr: null,
        hrv: null,
        notes,
    });

    const summaryParts: string[] = [];
    if (sleepHours !== null) summaryParts.push(`${sleepHours}h sleep`);
    if (soreness !== null) summaryParts.push(`soreness ${soreness}/5`);
    if (mood !== null) summaryParts.push(`mood ${mood}/5`);

    return {
        success: true,
        message: `Logged recovery: ${summaryParts.join(', ') || 'noted'}.`,
        data: { sleep_hours: sleepHours, soreness_level: soreness, mood, energy_level: energy },
    };
}

function handleQueryTodayStats(): OrbitToolResult {
    const nutrition = useNutritionStore.getState();
    const workout = useWorkoutStore.getState();
    const recovery = useRecoveryStore.getState();
    const health = useAppleHealthStore.getState().snapshot;

    const summary = nutrition.todaySummary;
    const todayRecovery = recovery.todayRecovery;

    return {
        success: true,
        message: 'Here are today\'s totals.',
        data: {
            calories: Math.round(summary.total_calories),
            protein_g: Math.round(summary.total_protein_g),
            carbs_g: Math.round(summary.total_carbs_g),
            fat_g: Math.round(summary.total_fat_g),
            water_ml: Math.round(summary.water_ml),
            steps: health.status === 'authorized' ? health.steps : null,
            active_energy_kcal: health.status === 'authorized' ? Math.round(health.activeEnergyKcal) : null,
            active_workout: workout.activeWorkout?.name ?? null,
            recovery_score: todayRecovery?.recovery_score ?? null,
            sleep_hours: todayRecovery?.sleep_hours ?? null,
        },
    };
}

function handleNavigate(args: Record<string, unknown>): OrbitToolResult {
    const target = typeof args.destination === 'string' ? args.destination.toLowerCase().trim() : '';
    const route = NAVIGATE_ALLOWLIST[target];
    if (!route) {
        return {
            success: false,
            message: `I can't open that. Try home, nutrition, workout, recovery, progress, or achievements.`,
        };
    }
    try {
        router.push(route as never);
        return { success: true, message: `Opening ${target}.`, data: { route } };
    } catch (error) {
        return { success: false, message: 'Could not open that screen right now.' };
    }
}

function handleEndConversation(): OrbitToolResult {
    return { success: true, message: 'Catch you later — Orbit signing off.' };
}

// ---------------------------------------------------------------------------
// OpenAI tool schema (must match the keys in TOOL_HANDLERS below)
// ---------------------------------------------------------------------------

export const ORBIT_TOOL_DEFINITIONS: OrbitToolDefinition[] = [
    {
        type: 'function',
        name: 'log_water',
        description: "Log a hydration entry for today. Use whenever the user mentions drinking water, fluid, or hydration.",
        parameters: {
            type: 'object',
            properties: {
                amount_ml: {
                    type: 'number',
                    description: 'Amount in milliliters. If the user said ounces, convert (1 oz ≈ 30 ml).',
                },
            },
            required: ['amount_ml'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_food',
        description: "Log one or more foods to a meal. Provide just name/quantity/unit; the app fills in macros. Use 'meal' if the user names a meal; otherwise the time of day will pick one.",
        parameters: {
            type: 'object',
            properties: {
                meal: {
                    type: 'string',
                    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                },
                items: {
                    type: 'array',
                    maxItems: 8,
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            quantity: { type: 'number' },
                            unit: { type: 'string', description: "e.g. 'g', 'oz', 'cup', 'serving', 'slice'" },
                        },
                        required: ['name', 'quantity', 'unit'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['items'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_workout_start',
        description: 'Begin a workout session and open the workout screen.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Short workout label, e.g. "Push Day".' },
            },
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_workout_complete',
        description: 'Finish the user\'s currently active workout.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        type: 'function',
        name: 'log_recovery',
        description: 'Log how the user slept and feels today. All fields optional but at least one must be provided.',
        parameters: {
            type: 'object',
            properties: {
                sleep_hours: { type: 'number' },
                sleep_quality: { type: 'integer', minimum: 1, maximum: 5 },
                soreness_level: { type: 'integer', minimum: 0, maximum: 5 },
                mood: { type: 'integer', minimum: 1, maximum: 5 },
                energy_level: { type: 'integer', minimum: 1, maximum: 5 },
                stress_level: { type: 'integer', minimum: 1, maximum: 5 },
                notes: { type: 'string' },
            },
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'query_today_stats',
        description: "Read the user's current totals for today (calories, macros, water, steps, active workout, recovery score). Call before answering questions like 'how am I doing today?'.",
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        type: 'function',
        name: 'navigate',
        description: "Open a screen in the app. Allowed destinations: home, nutrition, workout, recovery, progress, achievements, settings, log, cardio, meal plan, profile, water.",
        parameters: {
            type: 'object',
            properties: {
                destination: { type: 'string' },
            },
            required: ['destination'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'end_conversation',
        description: 'End the voice session. Use when the user says goodbye or is clearly done.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
];

// Lazily-resolved handler map. Keys must match `name` above.
export const ORBIT_TOOL_HANDLERS: Record<string, OrbitToolHandler> = {
    log_water: handleLogWater,
    log_food: handleLogFood,
    log_workout_start: handleLogWorkoutStart,
    log_workout_complete: handleLogWorkoutComplete,
    log_recovery: handleLogRecovery,
    query_today_stats: handleQueryTodayStats,
    navigate: handleNavigate,
    end_conversation: handleEndConversation,
};

// Tools marked here will cause the WebRTC client to disconnect the session
// after the model finishes its confirmation response.
export const ORBIT_TERMINATING_TOOLS = new Set<string>(['end_conversation']);

export function isUserAuthenticatedForVoice(): boolean {
    const { session } = useAuthStore.getState();
    return Boolean(session?.access_token);
}
