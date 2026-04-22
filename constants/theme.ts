// FitFusion Design System
// Dark-first, futuristic fitness aesthetic

export const Colors = {
    // Core palette
    primary: '#6C5CE7',      // Electric purple
    primaryLight: '#A29BFE',
    primaryDark: '#5A4BD1',

    secondary: '#00CECE',    // Cyan/teal accent
    secondaryLight: '#55EFC4',
    secondaryDark: '#00B894',

    accent: '#FF6B6B',       // Coral for alerts, calories
    accentLight: '#FF8E8E',
    warning: '#FDCB6E',      // Yellow for warnings
    success: '#00B894',      // Green for goals met
    error: '#E17055',        // Red-orange for errors

    // Backgrounds (dark theme)
    background: '#0F0F0F',
    surface: '#1A1A2E',
    surfaceLight: '#232342',
    surfaceElevated: '#2D2D4A',

    // Text
    text: '#FFFFFF',
    textSecondary: '#A0A0B8',
    textTertiary: '#6C6C80',
    textInverse: '#0F0F0F',

    // Borders
    border: '#2A2A40',
    borderLight: '#3A3A55',

    // Macro colors
    protein: '#FF6B6B',
    carbs: '#6C5CE7',
    fat: '#FDCB6E',
    calories: '#00CECE',

    // Transparent overlays
    overlay: 'rgba(15, 15, 15, 0.7)',
    overlayLight: 'rgba(255, 255, 255, 0.05)',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
} as const;

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
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
