import { router } from 'expo-router';
import { STOREKIT_IAP_ENABLED, type PremiumFeature } from '@/constants/subscription';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function requirePremium(feature: PremiumFeature): boolean {
    if (!STOREKIT_IAP_ENABLED) {
        return true;
    }

    if (useSubscriptionStore.getState().canUseFeature(feature)) {
        return true;
    }

    router.push(`/premium?feature=${feature}` as any);
    return false;
}
