import {
    type AppleHealthSnapshot,
    getAppleHealthStatus,
    readAppleHealthSnapshot,
    requestAppleHealthAccess,
} from '@/lib/appleHealth';
import { getLocalDateKey } from '@/lib/date';
import AsyncStorage from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useProgressStore } from './progressStore';

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

function syncHealthWeightToProgress(snapshot: AppleHealthSnapshot) {
    if (snapshot.status !== 'authorized' || !snapshot.currentWeightKg) return;

    const progressStore = useProgressStore.getState();
    const today = getLocalDateKey();
    const hasHealthWeightToday = progressStore.weightEntries.some((entry) => (
        getLocalDateKey(new Date(entry.logged_at)) === today &&
        entry.notes === 'Imported from Apple Health'
    ));

    if (hasHealthWeightToday) return;

    progressStore.addWeightEntry({
        id: generateId(),
        user_id: '',
        weight_kg: snapshot.currentWeightKg,
        body_fat_pct: null,
        logged_at: new Date().toISOString(),
        notes: 'Imported from Apple Health',
    });
}

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
                    syncHealthWeightToProgress(snapshot);
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
                    syncHealthWeightToProgress(snapshot);
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
