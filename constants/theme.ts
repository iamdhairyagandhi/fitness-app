// BodyPilot Design System
// Minimal performance aesthetic — black, white, and electric lime

export const Colors = {
    // Core palette — BodyPilot black + electric lime
    primary: '#A7FF00',
    primaryLight: '#C6FF4D',
    primaryDark: '#7CC000',

    secondary: '#FFFFFF',
    secondaryLight: '#F5F5F5',
    secondaryDark: '#B7B7B7',

    accent: '#F43F5E',           // Rose — alerts, urgency (used sparingly)
    accentLight: '#FB7185',
    warning: '#EAB308',
    success: '#10B981',          // Emerald — goals met, positive
    error: '#EF4444',            // Clean red for errors

    // Backgrounds
    background: '#000000',
    surface: '#101010',
    surfaceLight: '#171717',
    surfaceElevated: '#202020',

    // Text — warm whites, clear hierarchy
    text: '#FFFFFF',
    textSecondary: '#B7B7B7',
    textTertiary: '#777777',
    textInverse: '#000000',

    // Borders — subtle, warm
    border: '#1F1F1F',
    borderLight: '#343434',

    // Macro colors — distinctive, muted elegance
    protein: '#F97316',          // Warm orange
    carbs: '#6366F1',            // Indigo
    fat: '#EAB308',              // Gold
    calories: '#A7FF00',

    // Feature colors — harmonious palette
    recovery: '#10B981',         // Emerald
    fasting: '#8B5CF6',          // Violet
    supplements: '#EC4899',      // Pink
    recipes: '#F97316',          // Orange
    achievements: '#A7FF00',
    analytics: '#6366F1',        // Indigo
    mealPlan: '#14B8A6',         // Teal
    bodyComp: '#8B5CF6',         // Violet
    micros: '#10B981',           // Emerald

    // Transparent overlays
    overlay: 'rgba(0, 0, 0, 0.82)',
    overlayLight: 'rgba(255, 255, 255, 0.06)',
    glass: 'rgba(16, 16, 16, 0.9)',
} as const;

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const;

export const BorderRadius = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
} as const;

export const FontSize = {
    xxs: 10,
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    xxxl: 32,
    hero: 40,
} as const;

export const FontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
};

// Shadows — reusable elevation presets
export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 5,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    }),
} as const;
