// ── Theme Context ────────────────────────────────────────────
// Provides light/dark/system mode plus selectable BodyPilot palettes.
// Most of the app imports Colors from constants/theme, so the provider
// keeps that shared object in sync with the selected palette.
// ─────────────────────────────────────────────────────────────

import { Colors } from '@/constants/theme';
import AsyncStorage from '@/lib/storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemeScheme =
    | 'bodypilot'
    | 'matrix'
    | 'midnight'
    | 'graphite'
    | 'crimson'
    | 'ocean'
    | 'daylight'
    | 'mint';

type SchemeTone = 'dark' | 'light';

export type ThemeColors = {
    [K in keyof typeof Colors]: string;
};

type SchemeDefinition = {
    id: ThemeScheme;
    name: string;
    description: string;
    tone: SchemeTone;
    colors: ThemeColors;
};

const darkBase: ThemeColors = {
    primary: '#A7FF00',
    primaryLight: '#C6FF4D',
    primaryDark: '#7CC000',
    secondary: '#FFFFFF',
    secondaryLight: '#F5F5F5',
    secondaryDark: '#B7B7B7',
    accent: '#F43F5E',
    accentLight: '#FB7185',
    warning: '#EAB308',
    success: '#10B981',
    error: '#EF4444',
    background: '#000000',
    surface: '#101010',
    surfaceLight: '#171717',
    surfaceElevated: '#202020',
    text: '#FFFFFF',
    textSecondary: '#B7B7B7',
    textTertiary: '#777777',
    textInverse: '#000000',
    border: '#1F1F1F',
    borderLight: '#343434',
    protein: '#F97316',
    carbs: '#6366F1',
    fat: '#EAB308',
    calories: '#A7FF00',
    recovery: '#10B981',
    fasting: '#8B5CF6',
    supplements: '#EC4899',
    recipes: '#F97316',
    achievements: '#A7FF00',
    analytics: '#6366F1',
    mealPlan: '#14B8A6',
    bodyComp: '#8B5CF6',
    micros: '#10B981',
    overlay: 'rgba(0, 0, 0, 0.82)',
    overlayLight: 'rgba(255, 255, 255, 0.06)',
    glass: 'rgba(16, 16, 16, 0.9)',
};

const lightBase: ThemeColors = {
    ...darkBase,
    primary: '#7CC000',
    primaryLight: '#A7FF00',
    primaryDark: '#5C8F00',
    secondary: '#000000',
    secondaryLight: '#171717',
    secondaryDark: '#343434',
    accent: '#E11D48',
    accentLight: '#F43F5E',
    warning: '#CA8A04',
    success: '#059669',
    error: '#DC2626',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceLight: '#F4F4F4',
    surfaceElevated: '#FFFFFF',
    text: '#000000',
    textSecondary: '#4A4A4A',
    textTertiary: '#777777',
    textInverse: '#FFFFFF',
    border: '#E5E5E5',
    borderLight: '#D4D4D4',
    protein: '#EA580C',
    carbs: '#4F46E5',
    fat: '#CA8A04',
    calories: '#7CC000',
    recovery: '#059669',
    fasting: '#7C3AED',
    supplements: '#DB2777',
    recipes: '#EA580C',
    achievements: '#7CC000',
    analytics: '#4F46E5',
    mealPlan: '#0D9488',
    bodyComp: '#7C3AED',
    micros: '#059669',
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.04)',
    glass: 'rgba(255, 255, 255, 0.9)',
};

function palette(id: ThemeScheme, name: string, description: string, tone: SchemeTone, colors: Partial<ThemeColors>): SchemeDefinition {
    return {
        id,
        name,
        description,
        tone,
        colors: { ...(tone === 'dark' ? darkBase : lightBase), ...colors },
    };
}

export const THEME_SCHEMES: SchemeDefinition[] = [
    palette('bodypilot', 'BodyPilot Lime', 'Black, white, and electric lime.', 'dark', {}),
    palette('matrix', 'Matrix Green', 'Softer green on charcoal for lower glare.', 'dark', {
        primary: '#22C55E',
        primaryLight: '#86EFAC',
        primaryDark: '#15803D',
        background: '#030705',
        surface: '#0B1210',
        surfaceLight: '#111C18',
        surfaceElevated: '#17231E',
        border: '#1E2E27',
        calories: '#22C55E',
        achievements: '#22C55E',
    }),
    palette('midnight', 'Midnight Blue', 'Cool blue-black with cyan accents.', 'dark', {
        primary: '#38BDF8',
        primaryLight: '#7DD3FC',
        primaryDark: '#0284C7',
        background: '#020617',
        surface: '#0B1220',
        surfaceLight: '#111827',
        surfaceElevated: '#172033',
        border: '#1E293B',
        calories: '#38BDF8',
        analytics: '#60A5FA',
        achievements: '#38BDF8',
    }),
    palette('graphite', 'Graphite', 'Neutral monochrome with muted lime.', 'dark', {
        primary: '#D4FF4F',
        primaryLight: '#EAFF9A',
        primaryDark: '#9BC322',
        background: '#080808',
        surface: '#151515',
        surfaceLight: '#202020',
        surfaceElevated: '#292929',
        border: '#303030',
        textSecondary: '#C9C9C9',
        calories: '#D4FF4F',
    }),
    palette('crimson', 'Crimson Night', 'Dark burgundy with warm red accents.', 'dark', {
        primary: '#FB7185',
        primaryLight: '#FDA4AF',
        primaryDark: '#E11D48',
        accent: '#A7FF00',
        background: '#100508',
        surface: '#190A0E',
        surfaceLight: '#241014',
        surfaceElevated: '#30171D',
        border: '#3A1F26',
        calories: '#FB7185',
        achievements: '#FB7185',
    }),
    palette('ocean', 'Ocean Teal', 'Low-contrast teal and deep navy.', 'dark', {
        primary: '#2DD4BF',
        primaryLight: '#5EEAD4',
        primaryDark: '#0F766E',
        background: '#021011',
        surface: '#081819',
        surfaceLight: '#102223',
        surfaceElevated: '#173032',
        border: '#1F3B3E',
        calories: '#2DD4BF',
        mealPlan: '#14B8A6',
        achievements: '#2DD4BF',
    }),
    palette('daylight', 'Daylight', 'Clean white with BodyPilot lime.', 'light', {}),
    palette('mint', 'Soft Mint', 'Warm off-white with gentle green accents.', 'light', {
        primary: '#16A34A',
        primaryLight: '#86EFAC',
        primaryDark: '#15803D',
        background: '#F7FAF4',
        surface: '#FFFFFF',
        surfaceLight: '#EEF5EA',
        surfaceElevated: '#FFFFFF',
        border: '#DCE8D5',
        text: '#121A12',
        textSecondary: '#425242',
        calories: '#16A34A',
        achievements: '#16A34A',
    }),
];

const SCHEME_MAP = Object.fromEntries(THEME_SCHEMES.map((scheme) => [scheme.id, scheme])) as Record<ThemeScheme, SchemeDefinition>;

interface ThemeContextType {
    mode: ThemeMode;
    scheme: ThemeScheme;
    isDark: boolean;
    colors: ThemeColors;
    schemes: SchemeDefinition[];
    setMode: (mode: ThemeMode) => void;
    setScheme: (scheme: ThemeScheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    scheme: 'bodypilot',
    isDark: true,
    colors: darkBase,
    schemes: THEME_SCHEMES,
    setMode: () => { },
    setScheme: () => { },
});

const THEME_STORAGE_KEY = '@bodypilot_theme_mode';
const SCHEME_STORAGE_KEY = '@bodypilot_theme_scheme';

function resolveScheme(scheme: ThemeScheme, isDark: boolean) {
    const selected = SCHEME_MAP[scheme] || SCHEME_MAP.bodypilot;
    if (selected.tone === (isDark ? 'dark' : 'light')) return selected;
    return isDark ? SCHEME_MAP.bodypilot : SCHEME_MAP.daylight;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('dark');
    const [scheme, setSchemeState] = useState<ThemeScheme>('bodypilot');

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(THEME_STORAGE_KEY),
            AsyncStorage.getItem(SCHEME_STORAGE_KEY),
        ]).then(([storedMode, storedScheme]) => {
            if (storedMode === 'dark' || storedMode === 'light' || storedMode === 'system') {
                setModeState(storedMode);
            }
            if (storedScheme && storedScheme in SCHEME_MAP) {
                setSchemeState(storedScheme as ThemeScheme);
            }
        }).catch(() => { });
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => { });
    }, []);

    const setScheme = useCallback((newScheme: ThemeScheme) => {
        setSchemeState(newScheme);
        AsyncStorage.setItem(SCHEME_STORAGE_KEY, newScheme).catch(() => { });
        const tone = SCHEME_MAP[newScheme].tone;
        setModeState(tone);
        AsyncStorage.setItem(THEME_STORAGE_KEY, tone).catch(() => { });
    }, []);

    const isDark = mode === 'dark' || (mode === 'system' && systemScheme !== 'light');
    const activeScheme = resolveScheme(scheme, isDark);
    const colors = useMemo(() => activeScheme.colors, [activeScheme]);

    Object.assign(Colors, colors);

    return (
        <ThemeContext.Provider value={{ mode, scheme, isDark, colors, schemes: THEME_SCHEMES, setMode, setScheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export const DarkColors = darkBase;
export const LightColors = lightBase;
