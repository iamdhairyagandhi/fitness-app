// FitFusion Design System
// Premium wellness aesthetic — warm, motivating, clean

export const Colors = {
    // Core palette — sophisticated teal + warm amber
    primary: '#0EA5E9',          // Sky blue — trust, clarity, focus
    primaryLight: '#38BDF8',
    primaryDark: '#0284C7',

    secondary: '#F59E0B',        // Warm amber — achievement, energy
    secondaryLight: '#FBBF24',
    secondaryDark: '#D97706',

    accent: '#F43F5E',           // Rose — alerts, urgency (used sparingly)
    accentLight: '#FB7185',
    warning: '#F59E0B',          // Amber
    success: '#10B981',          // Emerald — goals met, positive
    error: '#EF4444',            // Clean red for errors

    // Backgrounds — deep warm neutrals (not pure black)
    background: '#0C0C0F',
    surface: '#16161D',
    surfaceLight: '#1E1F28',
    surfaceElevated: '#262733',

    // Text — warm whites, clear hierarchy
    text: '#F4F4F6',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    textInverse: '#0C0C0F',

    // Borders — subtle, warm
    border: '#1F2029',
    borderLight: '#2A2B38',

    // Macro colors — distinctive, muted elegance
    protein: '#F97316',          // Warm orange
    carbs: '#6366F1',            // Indigo
    fat: '#EAB308',              // Gold
    calories: '#0EA5E9',         // Sky blue (matches primary)

    // Feature colors — harmonious palette
    recovery: '#10B981',         // Emerald
    fasting: '#8B5CF6',          // Violet
    supplements: '#EC4899',      // Pink
    recipes: '#F97316',          // Orange
    achievements: '#F59E0B',     // Amber
    analytics: '#6366F1',        // Indigo
    mealPlan: '#14B8A6',         // Teal
    bodyComp: '#8B5CF6',         // Violet
    micros: '#10B981',           // Emerald

    // Transparent overlays
    overlay: 'rgba(12, 12, 15, 0.8)',
    overlayLight: 'rgba(255, 255, 255, 0.04)',
    glass: 'rgba(22, 22, 29, 0.85)',
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
