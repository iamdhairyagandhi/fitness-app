import { create } from 'zustand';

/**
 * Tiny shared atom for "all Zustand stores have been hydrated from Supabase
 * (or we've confirmed there is no session)". Features that mutate stores
 * — widget snapshot writer, Orbit Voice tool calls — should gate themselves
 * behind this so they don't overwrite real server data with cold-start
 * defaults during launch.
 */
interface StoresHydratedState {
    hydrated: boolean;
    setHydrated: (value: boolean) => void;
}

export const useStoresHydratedStore = create<StoresHydratedState>((set) => ({
    hydrated: false,
    setHydrated: (value) => set({ hydrated: value }),
}));

export const useStoresHydrated = () => useStoresHydratedStore((state) => state.hydrated);

export const setStoresHydrated = (value: boolean) => {
    useStoresHydratedStore.getState().setHydrated(value);
};

export const getStoresHydrated = () => useStoresHydratedStore.getState().hydrated;
