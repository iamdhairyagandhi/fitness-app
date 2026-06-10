import WidgetBridge from '@/modules/widget-bridge';
import { DEFAULT_CALORIES, DEFAULT_WATER_GOAL_ML } from '@/constants/config';
import { getLocalDateKey } from '@/lib/date';
import { useAppleHealthStore } from '@/stores/appleHealthStore';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

const APP_GROUP_SUITE = 'group.com.dhairyagandhi.fitfusion';
const SNAPSHOT_KEY = 'bodypilot.widget.snapshot';
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 800;

export interface WidgetSnapshot {
    schemaVersion: number;
    signedIn: boolean;
    updatedAt: string;
    localDate: string;

    displayName: string | null;

    caloriesConsumed: number;
    caloriesTarget: number;
    proteinG: number;
    proteinTargetG: number;
    waterMl: number;
    waterGoalMl: number;

    streakCount: number;
    level: number;
    xp: number;
    workoutsCompleted: number;
    lastWorkoutDate: string | null;
    lastWorkoutName: string | null;
    activeWorkoutName: string | null;

    steps: number;
    activeEnergyKcal: number;
    healthStatus: string;
    healthSyncedAt: string | null;
}

const SIGNED_OUT_SNAPSHOT: WidgetSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    signedIn: false,
    updatedAt: '',
    localDate: getLocalDateKey(),
    displayName: null,
    caloriesConsumed: 0,
    caloriesTarget: DEFAULT_CALORIES,
    proteinG: 0,
    proteinTargetG: 150,
    waterMl: 0,
    waterGoalMl: DEFAULT_WATER_GOAL_ML,
    streakCount: 0,
    level: 1,
    xp: 0,
    workoutsCompleted: 0,
    lastWorkoutDate: null,
    lastWorkoutName: null,
    activeWorkoutName: null,
    steps: 0,
    activeEnergyKcal: 0,
    healthStatus: 'unsupported',
    healthSyncedAt: null,
};

function clampInt(value: number | null | undefined, fallback = 0): number {
    if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
    return Math.max(0, Math.round(value));
}

/** Build a minimal snapshot from the current state of every relevant store. */
export function buildSnapshot(): WidgetSnapshot {
    const auth = useAuthStore.getState();
    const user = auth.user;

    if (!user) return { ...SIGNED_OUT_SNAPSHOT, localDate: getLocalDateKey(), updatedAt: new Date().toISOString() };

    const nutrition = useNutritionStore.getState();
    const workout = useWorkoutStore.getState();
    const health = useAppleHealthStore.getState().snapshot;

    const summary = nutrition.todaySummary;
    const lastWorkout = workout.recentWorkouts[0];

    return {
        schemaVersion: SCHEMA_VERSION,
        signedIn: true,
        updatedAt: new Date().toISOString(),
        localDate: getLocalDateKey(),
        displayName: user.display_name ?? user.username ?? null,

        caloriesConsumed: clampInt(summary?.total_calories),
        caloriesTarget: clampInt(user.daily_calorie_target, DEFAULT_CALORIES),
        proteinG: clampInt(summary?.total_protein_g),
        proteinTargetG: clampInt(user.protein_target_g, 150),
        waterMl: clampInt(summary?.water_ml),
        waterGoalMl: clampInt(user.water_goal_ml, DEFAULT_WATER_GOAL_ML),

        streakCount: clampInt(user.streak_count),
        level: clampInt(user.level, 1),
        xp: clampInt(user.xp),
        workoutsCompleted: clampInt(user.workouts_completed),
        lastWorkoutDate: lastWorkout?.started_at ?? user.last_workout_date ?? null,
        lastWorkoutName: lastWorkout?.name ?? null,
        activeWorkoutName: workout.isWorkoutActive ? workout.activeWorkout?.name ?? null : null,

        steps: clampInt(health.steps),
        activeEnergyKcal: clampInt(health.activeEnergyKcal),
        healthStatus: health.status ?? 'unsupported',
        healthSyncedAt: health.lastSyncedAt ?? null,
    };
}

/**
 * Module-level scratch state. We only need to keep the most recently written
 * snapshot to skip redundant writes — there is one widget snapshot per device.
 */
let lastSerialized: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let isEnabled = false;

function compareIgnoringTimestamp(a: WidgetSnapshot, b: string | null): boolean {
    if (!b) return false;
    try {
        const previous = JSON.parse(b) as WidgetSnapshot;
        // updatedAt always changes; compare the value fields only.
        return (
            previous.signedIn === a.signedIn &&
            previous.localDate === a.localDate &&
            previous.caloriesConsumed === a.caloriesConsumed &&
            previous.caloriesTarget === a.caloriesTarget &&
            previous.proteinG === a.proteinG &&
            previous.proteinTargetG === a.proteinTargetG &&
            previous.waterMl === a.waterMl &&
            previous.waterGoalMl === a.waterGoalMl &&
            previous.streakCount === a.streakCount &&
            previous.level === a.level &&
            previous.workoutsCompleted === a.workoutsCompleted &&
            previous.lastWorkoutDate === a.lastWorkoutDate &&
            previous.lastWorkoutName === a.lastWorkoutName &&
            previous.activeWorkoutName === a.activeWorkoutName &&
            previous.steps === a.steps &&
            previous.activeEnergyKcal === a.activeEnergyKcal &&
            previous.healthStatus === a.healthStatus
        );
    } catch {
        return false;
    }
}

function writeNow(snapshot: WidgetSnapshot): boolean {
    if (Platform.OS !== 'ios') return false;
    if (!WidgetBridge.isAvailable()) return false;

    const payload = JSON.stringify(snapshot);
    if (compareIgnoringTimestamp(snapshot, lastSerialized)) return false;

    const ok = WidgetBridge.setSnapshot(APP_GROUP_SUITE, SNAPSHOT_KEY, payload);
    if (ok) {
        lastSerialized = payload;
        WidgetBridge.reloadAll();
    }
    return ok;
}

/**
 * Build the current snapshot and write it to the App Group immediately, then
 * reload widget timelines. Call this for "important" moments (logout, workout
 * complete, water logged, app backgrounded).
 */
export function flushWidgetSnapshot(): boolean {
    if (!isEnabled) return false;
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    return writeNow(buildSnapshot());
}

/**
 * Schedule a debounced widget write. Use this for high-frequency store
 * changes so we don't hammer UserDefaults / WidgetCenter.
 */
export function scheduleWidgetSnapshot(): void {
    if (!isEnabled) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        writeNow(buildSnapshot());
    }, DEBOUNCE_MS);
}

/** Persist the signed-out snapshot and clear any cached data on disk. */
export function clearWidgetSnapshot(): void {
    if (Platform.OS !== 'ios') return;
    if (!WidgetBridge.isAvailable()) return;
    const signedOut: WidgetSnapshot = {
        ...SIGNED_OUT_SNAPSHOT,
        localDate: getLocalDateKey(),
        updatedAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(signedOut);
    WidgetBridge.setSnapshot(APP_GROUP_SUITE, SNAPSHOT_KEY, payload);
    lastSerialized = payload;
    WidgetBridge.reloadAll();
}

/**
 * Subscribe to every Zustand store that contributes widget data. Returns an
 * unsubscribe function. The first invocation flushes immediately so widgets
 * pick up the freshly hydrated state.
 */
function attachStoreSubscriptions(): () => void {
    const subs = [
        useAuthStore.subscribe(scheduleWidgetSnapshot),
        useNutritionStore.subscribe(scheduleWidgetSnapshot),
        useWorkoutStore.subscribe(scheduleWidgetSnapshot),
        useAppleHealthStore.subscribe(scheduleWidgetSnapshot),
    ];
    return () => {
        subs.forEach((unsubscribe) => {
            try { unsubscribe(); } catch { /* ignore */ }
        });
    };
}

/**
 * React hook for the root layout: wires widget sync once hydration is done.
 * Pass `ready` as `true` once the auth/store hydration step finishes so we
 * don't overwrite real data with the empty default snapshot during launch.
 */
export function useWidgetSync(ready: boolean): void {
    const unsubscribeRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        if (!ready) return;

        isEnabled = true;
        // First write captures hydrated state.
        flushWidgetSnapshot();
        unsubscribeRef.current = attachStoreSubscriptions();

        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === 'background' || nextState === 'inactive') {
                flushWidgetSnapshot();
            } else if (nextState === 'active') {
                // Date might have rolled over while backgrounded.
                scheduleWidgetSnapshot();
            }
        };
        const appStateSub = AppState.addEventListener('change', handleAppState);

        return () => {
            isEnabled = false;
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                pendingTimer = null;
            }
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
            appStateSub.remove();
        };
    }, [ready]);
}
