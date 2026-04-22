import { upsertProfile } from '@/lib/db';
import { postActivity } from '@/lib/socialDb';
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
        // Post social activity for milestones
        if (updates.level && current.level && updates.level > current.level) {
            postActivity('level_up', `Reached Level ${updates.level}!`, undefined, { level: updates.level }).catch(() => { });
        }
        if (updates.streak_count && current.streak_count && updates.streak_count > current.streak_count && updates.streak_count % 7 === 0) {
            postActivity('streak_milestone', `${updates.streak_count}-day streak!`, `Staying consistent for ${updates.streak_count} days`, { streak: updates.streak_count }).catch(() => { });
        }
    },
    setSession: (session) => set({ session }),
    setLoading: (isLoading) => set({ isLoading }),
    setOnboarded: (isOnboarded) => set({ isOnboarded }),
    setAdmin: (isAdmin) => set({ isAdmin }),
    logout: () => set({ user: null, session: null, isOnboarded: false, isAdmin: false }),
}));
