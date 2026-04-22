import { upsertProfile } from '@/lib/db';
import type { UserProfile } from '@/types';
import { create } from 'zustand';

interface AuthState {
    user: UserProfile | null;
    session: { access_token: string } | null;
    isLoading: boolean;
    isOnboarded: boolean;
    isAdmin: boolean;
    setUser: (user: UserProfile | null) => void;
    updateUser: (updates: Partial<UserProfile>) => void;
    setSession: (session: { access_token: string } | null) => void;
    setLoading: (loading: boolean) => void;
    setOnboarded: (onboarded: boolean) => void;
    setAdmin: (isAdmin: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    isOnboarded: false,
    isAdmin: false,
    setUser: (user) => set({ user }),
    updateUser: (updates) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
        set({ user: updated });
        // Fire-and-forget persist to Supabase (only for real users)
        if (updated.id && !get().isAdmin) {
            upsertProfile(updated).catch(() => { });
        }
    },
    setSession: (session) => set({ session }),
    setLoading: (isLoading) => set({ isLoading }),
    setOnboarded: (isOnboarded) => set({ isOnboarded }),
    setAdmin: (isAdmin) => set({ isAdmin }),
    logout: () => set({ user: null, session: null, isOnboarded: false, isAdmin: false }),
}));
