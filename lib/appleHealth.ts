import AsyncStorage from '@/lib/storage';
import { Platform, TurboModuleRegistry } from 'react-native';

type AppleHealthModule = {
    isHealthDataAvailable?: () => boolean;
    requestAuthorization?: (permissions: { toRead?: string[]; toShare?: string[] }) => Promise<boolean>;
    queryStatisticsForQuantity?: (identifier: string, statistics: string[], options?: Record<string, unknown>) => Promise<any>;
    queryQuantitySamples?: (identifier: string, options: Record<string, unknown>) => Promise<any[]>;
    queryWorkoutSamples?: (options: Record<string, unknown>) => Promise<any[]>;
};

export type AppleHealthStatus = 'unsupported' | 'native-unavailable' | 'available' | 'authorized' | 'denied';

export type AppleHealthSnapshot = {
    status: AppleHealthStatus;
    connectedAt: string | null;
    lastSyncedAt: string | null;
    steps: number;
    activeEnergyKcal: number;
    currentWeightKg: number | null;
    latestHeartRateBpm: number | null;
    workouts: {
        id: string;
        type: string;
        durationMinutes: number;
        calories: number | null;
        startDate: string | null;
    }[];
};

const STORAGE_KEY = '@bodypilot_apple_health_state';

const READ_TYPES = [
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierDistanceWalkingRunning',
    'HKWorkoutTypeIdentifier',
];

const SHARE_TYPES = [
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierDietaryEnergyConsumed',
    'HKQuantityTypeIdentifierDietaryProtein',
    'HKQuantityTypeIdentifierDietaryCarbohydrates',
    'HKQuantityTypeIdentifierDietaryFatTotal',
    'HKWorkoutTypeIdentifier',
];

function getAppleHealth(): AppleHealthModule | null {
    if (Platform.OS !== 'ios') return null;
    if (!isNitroAvailable()) return null;
    try {
        return require('@kingstinct/react-native-healthkit') as AppleHealthModule;
    } catch (error) {
        console.warn('[appleHealth] HealthKit native module unavailable:', error);
        return null;
    }
}

function isNitroAvailable() {
    const globalWithNitro = global as typeof globalThis & { NitroModulesProxy?: unknown };
    if (globalWithNitro.NitroModulesProxy) return true;

    try {
        return Boolean(TurboModuleRegistry.get('NitroModules'));
    } catch {
        return false;
    }
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function numberFromQuantity(value: any): number {
    if (!value) return 0;
    if (typeof value.quantity === 'number') return value.quantity;
    return Number(value.quantity || 0);
}

async function getStoredState() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (!stored) return { connectedAt: null, lastSyncedAt: null, status: 'available' as AppleHealthStatus };
    try {
        return JSON.parse(stored) as { connectedAt: string | null; lastSyncedAt: string | null; status: AppleHealthStatus };
    } catch {
        return { connectedAt: null, lastSyncedAt: null, status: 'available' as AppleHealthStatus };
    }
}

async function saveStoredState(state: { connectedAt: string | null; lastSyncedAt: string | null; status: AppleHealthStatus }) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function getAppleHealthStatus(): Promise<AppleHealthStatus> {
    if (Platform.OS !== 'ios') return 'unsupported';
    const HealthKit = getAppleHealth();
    if (!HealthKit?.isHealthDataAvailable) return 'native-unavailable';

    try {
        return HealthKit.isHealthDataAvailable() ? (await getStoredState()).status : 'unsupported';
    } catch {
        return 'native-unavailable';
    }
}

export async function requestAppleHealthAccess(): Promise<AppleHealthStatus> {
    if (Platform.OS !== 'ios') return 'unsupported';
    const HealthKit = getAppleHealth();
    if (!HealthKit?.requestAuthorization || !HealthKit?.isHealthDataAvailable) return 'native-unavailable';

    try {
        if (!HealthKit.isHealthDataAvailable()) return 'unsupported';
        const granted = await HealthKit.requestAuthorization({
            toRead: READ_TYPES,
            toShare: SHARE_TYPES,
        });
        const now = new Date().toISOString();
        const state = {
            status: granted ? 'authorized' as AppleHealthStatus : 'denied' as AppleHealthStatus,
            connectedAt: granted ? now : null,
            lastSyncedAt: null,
        };
        await saveStoredState(state);
        return state.status;
    } catch (error) {
        console.warn('[appleHealth] authorization failed:', error);
        return 'native-unavailable';
    }
}

export async function readAppleHealthSnapshot(): Promise<AppleHealthSnapshot> {
    const stored = await getStoredState();
    const HealthKit = getAppleHealth();
    const base: AppleHealthSnapshot = {
        status: await getAppleHealthStatus(),
        connectedAt: stored.connectedAt,
        lastSyncedAt: stored.lastSyncedAt,
        steps: 0,
        activeEnergyKcal: 0,
        currentWeightKg: null,
        latestHeartRateBpm: null,
        workouts: [],
    };

    if (base.status !== 'authorized' || !HealthKit) return base;

    const todayFilter = {
        filter: {
            date: {
                startDate: startOfToday(),
                endDate: new Date(),
            },
        },
    };

    try {
        const [steps, energy, weightSamples, heartRateSamples, workouts] = await Promise.all([
            HealthKit.queryStatisticsForQuantity?.('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
                ...todayFilter,
                unit: 'count',
            }),
            HealthKit.queryStatisticsForQuantity?.('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
                ...todayFilter,
                unit: 'kcal',
            }),
            HealthKit.queryQuantitySamples?.('HKQuantityTypeIdentifierBodyMass', {
                limit: 1,
                ascending: false,
                unit: 'kg',
            }),
            HealthKit.queryQuantitySamples?.('HKQuantityTypeIdentifierHeartRate', {
                limit: 1,
                ascending: false,
                unit: 'count/min',
            }),
            HealthKit.queryWorkoutSamples?.({
                limit: 5,
                ascending: false,
            }),
        ]);

        const nextSnapshot = {
            ...base,
            steps: Math.round(numberFromQuantity(steps?.sumQuantity)),
            activeEnergyKcal: Math.round(numberFromQuantity(energy?.sumQuantity)),
            currentWeightKg: weightSamples?.[0]?.quantity ? Number(weightSamples[0].quantity) : null,
            latestHeartRateBpm: heartRateSamples?.[0]?.quantity ? Math.round(Number(heartRateSamples[0].quantity)) : null,
            workouts: (workouts || []).slice(0, 5).map((workout: any, index: number) => ({
                id: workout.uuid || `${workout.workoutActivityType}-${index}`,
                type: String(workout.workoutActivityType || 'Workout').replace('HKWorkoutActivityType', ''),
                durationMinutes: Math.round(numberFromQuantity(workout.duration) / 60),
                calories: workout.totalEnergyBurned ? Math.round(numberFromQuantity(workout.totalEnergyBurned)) : null,
                startDate: workout.startDate ? new Date(workout.startDate).toISOString() : null,
            })),
            lastSyncedAt: new Date().toISOString(),
        };

        await saveStoredState({
            status: 'authorized',
            connectedAt: nextSnapshot.connectedAt,
            lastSyncedAt: nextSnapshot.lastSyncedAt,
        });

        return nextSnapshot;
    } catch (error) {
        console.warn('[appleHealth] snapshot failed:', error);
        return base;
    }
}
