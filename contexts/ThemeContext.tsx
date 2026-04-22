// ── Theme Context ────────────────────────────────────────────
// Provides light/dark/system theme switching across the app
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'system';

// ── Color Palettes ───────────────────────────────────────────

const DarkColors = {
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    primaryDark: '#0284C7',
    secondary: '#F59E0B',
    secondaryLight: '#FBBF24',
    secondaryDark: '#D97706',
    accent: '#F43F5E',
    accentLight: '#FB7185',
    warning: '#F59E0B',
    success: '#10B981',
    error: '#EF4444',
    background: '#0C0C0F',
    surface: '#16161D',
    surfaceLight: '#1E1F28',
    surfaceElevated: '#262733',
    text: '#F4F4F6',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    textInverse: '#0C0C0F',
    border: '#1F2029',
    borderLight: '#2A2B38',
    protein: '#F97316',
    carbs: '#6366F1',
    fat: '#EAB308',
    calories: '#0EA5E9',
    recovery: '#10B981',
    fasting: '#8B5CF6',
    supplements: '#EC4899',
    recipes: '#F97316',
    achievements: '#F59E0B',
    analytics: '#6366F1',
    mealPlan: '#14B8A6',
    bodyComp: '#8B5CF6',
    micros: '#10B981',
    overlay: 'rgba(12, 12, 15, 0.8)',
    overlayLight: 'rgba(255, 255, 255, 0.04)',
    glass: 'rgba(22, 22, 29, 0.85)',
} as const;

const LightColors = {
    primary: '#0284C7',
    primaryLight: '#0EA5E9',
    primaryDark: '#0369A1',
    secondary: '#D97706',
    secondaryLight: '#F59E0B',
    secondaryDark: '#B45309',
    accent: '#E11D48',
    accentLight: '#F43F5E',
    warning: '#D97706',
    success: '#059669',
    error: '#DC2626',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceLight: '#F1F5F9',
    surfaceElevated: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#F8FAFC',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    protein: '#EA580C',
    carbs: '#4F46E5',
    fat: '#CA8A04',
    calories: '#0284C7',
    recovery: '#059669',
    fasting: '#7C3AED',
    supplements: '#DB2777',
    recipes: '#EA580C',
    achievements: '#D97706',
    analytics: '#4F46E5',
    mealPlan: '#0D9488',
    bodyComp: '#7C3AED',
    micros: '#059669',
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.04)',
    glass: 'rgba(255, 255, 255, 0.9)',
} as const;

export type ThemeColors = {
    [K in keyof typeof DarkColors]: string;
};

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    isDark: true,
    colors: DarkColors,
    setMode: () => { },
});

const THEME_STORAGE_KEY = '@fitfusion_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
            if (stored === 'dark' || stored === 'light' || stored === 'system') {
                setModeState(stored);
            }
        }).catch(() => { });
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => { });
    }, []);

    const isDark = mode === 'dark' || (mode === 'system' && systemScheme !== 'light');
    const colors = isDark ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export { DarkColors, LightColors };

