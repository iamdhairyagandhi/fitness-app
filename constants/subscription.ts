export type PremiumFeature =
    | 'ai_food_scan'
    | 'ai_quick_log'
    | 'ai_coach'
    | 'ai_workout'
    | 'ai_meal_plan'
    | 'weekly_report'
    | 'advanced_analytics'
    | 'apple_health'
    | 'unlimited_custom_templates'
    | 'premium_themes';

export const STOREKIT_IAP_ENABLED = false;
export const PREMIUM_TEST_ACCESS_DAYS = 0;

export const PREMIUM_PRODUCT_IDS = {
    monthly: 'bodypilot_premium_monthly',
    yearly: 'bodypilot_premium_yearly',
} as const;

export const PREMIUM_PLANS = {
    monthly: {
        id: PREMIUM_PRODUCT_IDS.monthly,
        label: 'Monthly',
        price: '$9.99',
        cadence: 'month',
        trialLabel: 'Premium plan',
        badge: undefined,
        savings: undefined,
    },
    yearly: {
        id: PREMIUM_PRODUCT_IDS.yearly,
        label: 'Yearly',
        price: '$59.99',
        cadence: 'year',
        trialLabel: 'Premium plan',
        badge: 'Best value',
        savings: 'Save 50%',
    },
} as const;

export const PREMIUM_FEATURE_COPY: Record<PremiumFeature, { title: string; description: string; icon: string }> = {
    ai_food_scan: {
        title: 'AI food photo scan',
        description: 'Snap meals and get estimated calories, macros, and portions.',
        icon: 'camera-outline',
    },
    ai_quick_log: {
        title: 'AI quick food log',
        description: 'Describe what you ate and let BodyPilot structure the entry.',
        icon: 'chatbubble-ellipses-outline',
    },
    ai_coach: {
        title: 'AI coach chat',
        description: 'Ask for workout, nutrition, recovery, and progress guidance.',
        icon: 'sparkles-outline',
    },
    ai_workout: {
        title: 'AI workout generation',
        description: 'Create workouts that match your goals, equipment, and history.',
        icon: 'barbell-outline',
    },
    ai_meal_plan: {
        title: 'AI meal suggestions',
        description: 'Generate meal plans and smart substitutions for your targets.',
        icon: 'restaurant-outline',
    },
    weekly_report: {
        title: 'Weekly reports',
        description: 'Summaries and trends across training, nutrition, and progress.',
        icon: 'document-text-outline',
    },
    advanced_analytics: {
        title: 'Advanced analytics',
        description: 'Deeper workout, macro, trend, and body composition insights.',
        icon: 'analytics-outline',
    },
    apple_health: {
        title: 'Apple Health sync',
        description: 'Connect Health data for workouts, weight, and recovery context.',
        icon: 'heart-outline',
    },
    unlimited_custom_templates: {
        title: 'Unlimited custom workouts',
        description: 'Build and save as many templates and routines as you want.',
        icon: 'add-circle-outline',
    },
    premium_themes: {
        title: 'Premium themes',
        description: 'Unlock extra app color schemes and visual polish.',
        icon: 'color-palette-outline',
    },
};
