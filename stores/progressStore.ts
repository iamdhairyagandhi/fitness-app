import { saveGoal, saveMeasurement, saveProgressPhoto, saveWeightEntry } from '@/lib/db';
import { applyXPReward } from '@/lib/gamification';
import type {
    BodyMeasurement,
    Goal,
    ProgressPhoto,
    WeightEntry,
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './authStore';

function awardXP(reward: 'LOG_WEIGHT' | 'LOG_MEASUREMENT' | 'TAKE_PROGRESS_PHOTO' | 'COMPLETE_GOAL') {
    const authState = useAuthStore.getState();
    if (authState.user) {
        authState.updateUser(applyXPReward(authState.user, reward));
    }
}

interface ProgressState {
    weightEntries: WeightEntry[];
    measurements: BodyMeasurement[];
    progressPhotos: ProgressPhoto[];
    goals: Goal[];

    setWeightEntries: (entries: WeightEntry[]) => void;
    addWeightEntry: (entry: WeightEntry) => void;
    setMeasurements: (measurements: BodyMeasurement[]) => void;
    addMeasurement: (measurement: BodyMeasurement) => void;
    setProgressPhotos: (photos: ProgressPhoto[]) => void;
    addProgressPhoto: (photo: ProgressPhoto) => void;
    setGoals: (goals: Goal[]) => void;
    addGoal: (goal: Goal) => void;
    updateGoal: (goalId: string, updates: Partial<Goal>) => void;
}

function checkBodyAchievements() {
    const { useRecoveryStore } = require('./recoveryStore');
    const state = useProgressStore.getState();
    useRecoveryStore.getState().checkAchievements({
        weight_logs: state.weightEntries.length,
        photos_taken: state.progressPhotos.length,
        measurements_logged: state.measurements.length,
    });
}

export const useProgressStore = create<ProgressState>()(
    persist(
        (set, get) => ({
    weightEntries: [],
    measurements: [],
    progressPhotos: [],
    goals: [],

    setWeightEntries: (weightEntries) => set({ weightEntries }),
    addWeightEntry: (entry) => {
        set({ weightEntries: [entry, ...get().weightEntries] });
        saveWeightEntry(entry).catch(() => { });
        awardXP('LOG_WEIGHT');
        checkBodyAchievements();
    },

    setMeasurements: (measurements) => set({ measurements }),
    addMeasurement: (measurement) => {
        set({ measurements: [measurement, ...get().measurements] });
        saveMeasurement(measurement).catch(() => { });
        awardXP('LOG_MEASUREMENT');
        checkBodyAchievements();
    },

    setProgressPhotos: (progressPhotos) => set({ progressPhotos }),
    addProgressPhoto: (photo) => {
        set({ progressPhotos: [photo, ...get().progressPhotos] });
        saveProgressPhoto(photo).catch(() => { });
        awardXP('TAKE_PROGRESS_PHOTO');
        checkBodyAchievements();
    },

    setGoals: (goals) => set({ goals }),
    addGoal: (goal) => {
        set({ goals: [goal, ...get().goals] });
        saveGoal(goal).catch(() => { });
    },
    updateGoal: (goalId, updates) => {
        set({
            goals: get().goals.map((g) =>
                g.id === goalId ? { ...g, ...updates } : g
            ),
        });

        // Award XP when a goal is completed
        const updated = get().goals.find((g) => g.id === goalId);
        if (updated?.status === 'completed' || (updates.current_value && updated && updated.current_value >= updated.target_value)) {
            awardXP('COMPLETE_GOAL');
        }
        // Persist
        if (updated) saveGoal(updated).catch(() => { });
    },
}),
        {
            name: 'fitfusion-progress',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                weightEntries: state.weightEntries,
                measurements: state.measurements,
                goals: state.goals,
            }),
        }
    )
);
