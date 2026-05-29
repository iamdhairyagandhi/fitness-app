import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@/lib/storage';
import { PREMIUM_TEST_ACCESS_DAYS, STOREKIT_IAP_ENABLED, type PremiumFeature } from '@/constants/subscription';

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'expired';
export type PremiumPlan = 'monthly' | 'yearly';

interface SubscriptionState {
    status: SubscriptionStatus;
    plan: PremiumPlan | null;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    activeUntil: string | null;
    isPremium: () => boolean;
    canUseFeature: (feature: PremiumFeature) => boolean;
    startTrial: (plan: PremiumPlan) => void;
    activatePremium: (plan: PremiumPlan) => void;
    expirePremium: () => void;
    resetSubscription: () => void;
}

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const isFuture = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() > Date.now();
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
                const { status, trialEndsAt, activeUntil } = get();
                if (status === 'active') return STOREKIT_IAP_ENABLED && (!activeUntil || isFuture(activeUntil));
                if (status === 'trialing') return isFuture(trialEndsAt);
                return false;
            },

            canUseFeature: () => get().isPremium(),

            startTrial: (plan) => {
                const now = new Date();
                set({
                    status: 'trialing',
                    plan,
                    trialStartedAt: now.toISOString(),
                    trialEndsAt: addDays(now, PREMIUM_TEST_ACCESS_DAYS).toISOString(),
                    activeUntil: null,
                });
            },

            activatePremium: (plan) => {
                if (!STOREKIT_IAP_ENABLED) {
                    get().startTrial(plan);
                    return;
                }

                set({
                    status: 'active',
                    plan,
                    trialStartedAt: null,
                    trialEndsAt: null,
                    activeUntil: null,
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
