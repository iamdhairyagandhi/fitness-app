import type {
    BodyMeasurement,
    Goal,
    ProgressPhoto,
    WeightEntry,
} from '@/types';
import { create } from 'zustand';

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

export const useProgressStore = create<ProgressState>((set, get) => ({
    weightEntries: [],
    measurements: [],
    progressPhotos: [],
    goals: [],

    setWeightEntries: (weightEntries) => set({ weightEntries }),
    addWeightEntry: (entry) =>
        set({ weightEntries: [entry, ...get().weightEntries] }),

    setMeasurements: (measurements) => set({ measurements }),
    addMeasurement: (measurement) =>
        set({ measurements: [measurement, ...get().measurements] }),

    setProgressPhotos: (progressPhotos) => set({ progressPhotos }),
    addProgressPhoto: (photo) =>
        set({ progressPhotos: [photo, ...get().progressPhotos] }),

    setGoals: (goals) => set({ goals }),
    addGoal: (goal) => set({ goals: [goal, ...get().goals] }),
    updateGoal: (goalId, updates) =>
        set({
            goals: get().goals.map((g) =>
                g.id === goalId ? { ...g, ...updates } : g
            ),
        }),
}));
