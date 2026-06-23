import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@/lib/storage';
import { PREMIUM_USER_EMAILS, STOREKIT_IAP_ENABLED, type PremiumFeature } from '@/constants/subscription';
import { useAuthStore } from './authStore';

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'expired';
export type PremiumPlan = 'monthly' | 'quarterly' | 'yearly';

interface SubscriptionState {
    status: SubscriptionStatus;
    plan: PremiumPlan | null;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    activeUntil: string | null;
    isPremium: () => boolean;
    canUseFeature: (feature: PremiumFeature) => boolean;
    activatePremium: (plan: PremiumPlan) => void;
    activatePromoSubscription: (plan: PremiumPlan, months: number) => void;
    expirePremium: () => void;
    resetSubscription: () => void;
}

const isFuture = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() > Date.now();
};

const isPremiumUserEmail = () => {
    const { session, user } = useAuthStore.getState();
    const email = (user?.email || session?.email)?.trim().toLowerCase();
    return !!email && PREMIUM_USER_EMAILS.includes(email as (typeof PREMIUM_USER_EMAILS)[number]);
};

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set, get) => ({
            status: 'free',
            plan: null,
            trialStartedAt: null,
            trialEndsAt: null,
            activeUntil: null,

            isPremium: () => {
                if (isPremiumUserEmail()) return true;

                const { status, trialEndsAt, activeUntil } = get();
                if (status === 'active') return STOREKIT_IAP_ENABLED && (!activeUntil || isFuture(activeUntil));
                if (status === 'trialing') return isFuture(trialEndsAt);
                return false;
            },

            canUseFeature: () => get().isPremium(),

            activatePremium: (plan) => {
                set({
                    status: 'active',
                    plan,
                    trialStartedAt: null,
                    trialEndsAt: null,
                    activeUntil: null,
                });
            },

            activatePromoSubscription: (plan, months) => {
                const now = new Date();
                const activeUntil = new Date(now);
                activeUntil.setMonth(activeUntil.getMonth() + months);
                set({
                    status: 'active',
                    plan,
                    trialStartedAt: null,
                    trialEndsAt: null,
                    activeUntil: activeUntil.toISOString(),
                });
            },

            expirePremium: () => set({ status: 'expired', activeUntil: new Date().toISOString() }),

            resetSubscription: () => set({
                status: 'free',
                plan: null,
                trialStartedAt: null,
                trialEndsAt: null,
                activeUntil: null,
            }),
        }),
        {
            name: 'bodypilot-subscription',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                status: state.status,
                plan: state.plan,
                trialStartedAt: state.trialStartedAt,
                trialEndsAt: state.trialEndsAt,
                activeUntil: state.activeUntil,
            }),
        }
    )
);
