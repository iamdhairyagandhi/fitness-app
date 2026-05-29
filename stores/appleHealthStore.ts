import {
    type AppleHealthSnapshot,
    getAppleHealthStatus,
    readAppleHealthSnapshot,
    requestAppleHealthAccess,
} from '@/lib/appleHealth';
import AsyncStorage from '@/lib/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const EMPTY_APPLE_HEALTH_SNAPSHOT: AppleHealthSnapshot = {
    status: 'available',
    connectedAt: null,
    lastSyncedAt: null,
    steps: 0,
    activeEnergyKcal: 0,
    currentWeightKg: null,
    latestHeartRateBpm: null,
    workouts: [],
};

interface AppleHealthState {
    snapshot: AppleHealthSnapshot;
    isSyncing: boolean;
    refreshStatus: () => Promise<AppleHealthSnapshot>;
    requestAccess: () => Promise<AppleHealthSnapshot>;
    sync: () => Promise<AppleHealthSnapshot>;
}

export const useAppleHealthStore = create<AppleHealthState>()(
    persist(
        (set, get) => ({
            snapshot: EMPTY_APPLE_HEALTH_SNAPSHOT,
            isSyncing: false,

            refreshStatus: async () => {
                const status = await getAppleHealthStatus();
                const snapshot = status === 'authorized'
                    ? await get().sync()
                    : { ...EMPTY_APPLE_HEALTH_SNAPSHOT, status };
                set({ snapshot });
                return snapshot;
            },

            requestAccess: async () => {
                set({ isSyncing: true });
                try {
                    const status = await requestAppleHealthAccess();
                    const snapshot = status === 'authorized'
                        ? await readAppleHealthSnapshot()
                        : { ...EMPTY_APPLE_HEALTH_SNAPSHOT, status };
                    set({ snapshot });
                    return snapshot;
                } finally {
                    set({ isSyncing: false });
                }
            },

            sync: async () => {
                set({ isSyncing: true });
                try {
                    const snapshot = await readAppleHealthSnapshot();
                    set({ snapshot });
                    return snapshot;
                } finally {
                    set({ isSyncing: false });
                }
            },
        }),
        {
            name: 'bodypilot-apple-health-store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ snapshot: state.snapshot }),
        },
    ),
);
