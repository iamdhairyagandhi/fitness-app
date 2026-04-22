import type { UserProfile } from '@/types';
import { create } from 'zustand';

interface AuthState {
    user: UserProfile | null;
    session: { access_token: string } | null;
    isLoading: boolean;
    isOnboarded: boolean;
    isAdmin: boolean;
    setUser: (user: UserProfile | null) => void;
    setSession: (session: { access_token: string } | null) => void;
    setLoading: (loading: boolean) => void;
    setOnboarded: (onboarded: boolean) => void;
    setAdmin: (isAdmin: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isOnboarded: false,
    isAdmin: false,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setLoading: (isLoading) => set({ isLoading }),
    setOnboarded: (isOnboarded) => set({ isOnboarded }),
    setAdmin: (isAdmin) => set({ isAdmin }),
    logout: () => set({ user: null, session: null, isOnboarded: false, isAdmin: false }),
}));
