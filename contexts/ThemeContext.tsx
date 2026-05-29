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
    | 'pulse'
    | 'endurance'
    | 'rings'
    | 'club'
    | 'trail'
    | 'steel'
    | 'daylight'
    | 'mint'
    | 'cloud'
    | 'sunrise';

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
    palette('pulse', 'Pulse Studio', 'Black studio base with red, cyan, and violet energy.', 'dark', {
        primary: '#FF4F68',
        primaryLight: '#FF8AA0',
        primaryDark: '#C9183A',
        accent: '#34D3FF',
        accentLight: '#7CE7FF',
        warning: '#F59E0B',
        success: '#34D399',
        background: '#050406',
        surface: '#111114',
        surfaceLight: '#1A1A20',
        surfaceElevated: '#24242C',
        border: '#2D2B34',
        borderLight: '#3E3B47',
        protein: '#FF7A1A',
        carbs: '#6D6BFF',
        fat: '#F8C436',
        calories: '#FF4F68',
        recovery: '#1DD6A5',
        fasting: '#9B5CFF',
        supplements: '#F05BD8',
        recipes: '#FF8A3D',
        achievements: '#34D3FF',
        analytics: '#6D6BFF',
        mealPlan: '#1DD6A5',
        bodyComp: '#F05BD8',
        micros: '#34D399',
        glass: 'rgba(17, 17, 20, 0.92)',
    }),
    palette('endurance', 'Endurance Orange', 'Carbon black with orange drive and cool recovery tones.', 'dark', {
        primary: '#FC4C02',
        primaryLight: '#FF8A4C',
        primaryDark: '#B93800',
        accent: '#36C5F0',
        accentLight: '#7DDDF8',
        success: '#2DD4BF',
        background: '#060606',
        surface: '#12110F',
        surfaceLight: '#1C1A16',
        surfaceElevated: '#26231D',
        border: '#332F27',
        borderLight: '#463F34',
        textSecondary: '#C9C2B8',
        protein: '#FC4C02',
        carbs: '#4F8CFF',
        fat: '#FFC247',
        calories: '#FC4C02',
        recovery: '#22C55E',
        fasting: '#A78BFA',
        supplements: '#F472B6',
        recipes: '#FF8A4C',
        achievements: '#36C5F0',
        analytics: '#4F8CFF',
        mealPlan: '#2DD4BF',
        bodyComp: '#A78BFA',
        micros: '#22C55E',
        glass: 'rgba(18, 17, 15, 0.92)',
    }),
    palette('rings', 'Performance Rings', 'Soft black with balanced cyan, pink, lime, and gold.', 'dark', {
        primary: '#32D3FF',
        primaryLight: '#8BE9FF',
        primaryDark: '#0796C0',
        accent: '#FF2D8F',
        accentLight: '#FF7ABA',
        warning: '#FFD23F',
        success: '#7BD88F',
        background: '#030507',
        surface: '#101417',
        surfaceLight: '#182026',
        surfaceElevated: '#202A32',
        border: '#27323C',
        borderLight: '#354655',
        protein: '#FF7A3D',
        carbs: '#32D3FF',
        fat: '#FFD23F',
        calories: '#B6F500',
        recovery: '#7BD88F',
        fasting: '#B967FF',
        supplements: '#FF2D8F',
        recipes: '#FF9E2C',
        achievements: '#B6F500',
        analytics: '#32D3FF',
        mealPlan: '#20D6C7',
        bodyComp: '#B967FF',
        micros: '#7BD88F',
        glass: 'rgba(16, 20, 23, 0.92)',
    }),
    palette('club', 'Club Night', 'Deep navy-black with lime, amber, and violet accents.', 'dark', {
        primary: '#D7FF45',
        primaryLight: '#ECFF91',
        primaryDark: '#98B91C',
        accent: '#8B5CF6',
        accentLight: '#C4B5FD',
        warning: '#F59E0B',
        success: '#14B8A6',
        background: '#050814',
        surface: '#101421',
        surfaceLight: '#171D2C',
        surfaceElevated: '#222A3B',
        border: '#28344C',
        borderLight: '#3A4864',
        textSecondary: '#C3CAD8',
        protein: '#F97316',
        carbs: '#60A5FA',
        fat: '#FBBF24',
        calories: '#D7FF45',
        recovery: '#14B8A6',
        fasting: '#8B5CF6',
        supplements: '#F472B6',
        recipes: '#F97316',
        achievements: '#D7FF45',
        analytics: '#60A5FA',
        mealPlan: '#14B8A6',
        bodyComp: '#C084FC',
        micros: '#34D399',
        glass: 'rgba(16, 20, 33, 0.92)',
    }),
    palette('trail', 'Trail Mode', 'Forest night with sunrise amber and river blue highlights.', 'dark', {
        primary: '#E5A72F',
        primaryLight: '#FFD37A',
        primaryDark: '#A86F11',
        accent: '#54C6EB',
        accentLight: '#A1E5FA',
        warning: '#F59E0B',
        success: '#74C69D',
        background: '#040806',
        surface: '#0F1711',
        surfaceLight: '#172217',
        surfaceElevated: '#202D20',
        border: '#2A3A2B',
        borderLight: '#3D503F',
        textSecondary: '#C7D1C3',
        protein: '#E8792E',
        carbs: '#54C6EB',
        fat: '#E5A72F',
        calories: '#D7E66B',
        recovery: '#74C69D',
        fasting: '#A78BFA',
        supplements: '#F472B6',
        recipes: '#E8792E',
        achievements: '#D7E66B',
        analytics: '#54C6EB',
        mealPlan: '#2DD4BF',
        bodyComp: '#A78BFA',
        micros: '#74C69D',
        glass: 'rgba(15, 23, 17, 0.92)',
    }),
    palette('steel', 'Steel Blue', 'Quiet graphite with blue steel, coral, and sage.', 'dark', {
        primary: '#7BA7D9',
        primaryLight: '#B6D4F5',
        primaryDark: '#3F6F9F',
        accent: '#FF6B6B',
        accentLight: '#FFA3A3',
        warning: '#D9A441',
        success: '#84CC9C',
        background: '#06080A',
        surface: '#12161A',
        surfaceLight: '#1B2026',
        surfaceElevated: '#252B32',
        border: '#303842',
        borderLight: '#46515E',
        textSecondary: '#C7CCD1',
        protein: '#FF8A4C',
        carbs: '#7BA7D9',
        fat: '#D9A441',
        calories: '#A7C7E7',
        recovery: '#84CC9C',
        fasting: '#B794F4',
        supplements: '#F687B3',
        recipes: '#FF8A4C',
        achievements: '#A7C7E7',
        analytics: '#7BA7D9',
        mealPlan: '#6DD3C4',
        bodyComp: '#B794F4',
        micros: '#84CC9C',
        glass: 'rgba(18, 22, 26, 0.92)',
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
    palette('cloud', 'Cloud Trainer', 'Bright paper UI with blue, teal, orange, and gold.', 'light', {
        primary: '#2563EB',
        primaryLight: '#60A5FA',
        primaryDark: '#1D4ED8',
        accent: '#F97316',
        accentLight: '#FDBA74',
        warning: '#D97706',
        success: '#0F9F6E',
        background: '#F6F8FB',
        surface: '#FFFFFF',
        surfaceLight: '#EDF2F7',
        surfaceElevated: '#FFFFFF',
        border: '#DCE3EA',
        borderLight: '#C9D4E0',
        text: '#111827',
        textSecondary: '#4B5563',
        textTertiary: '#7A8491',
        protein: '#EA580C',
        carbs: '#4F46E5',
        fat: '#D97706',
        calories: '#2563EB',
        recovery: '#0F9F6E',
        fasting: '#7C3AED',
        supplements: '#DB2777',
        recipes: '#EA580C',
        achievements: '#0F9F6E',
        analytics: '#2563EB',
        mealPlan: '#0D9488',
        bodyComp: '#7C3AED',
        micros: '#059669',
        overlay: 'rgba(15, 23, 42, 0.42)',
        overlayLight: 'rgba(37, 99, 235, 0.06)',
        glass: 'rgba(255, 255, 255, 0.92)',
    }),
    palette('sunrise', 'Warm Reset', 'Calm warm light with coral, navy, mint, and amber.', 'light', {
        primary: '#F97372',
        primaryLight: '#FDA4AF',
        primaryDark: '#E4485F',
        accent: '#2563EB',
        accentLight: '#93C5FD',
        warning: '#D99A25',
        success: '#2F9E76',
        background: '#FAF7F2',
        surface: '#FFFFFF',
        surfaceLight: '#F2ECE4',
        surfaceElevated: '#FFFFFF',
        border: '#E7DED2',
        borderLight: '#D8CDBF',
        text: '#1E1B18',
        textSecondary: '#575047',
        textTertiary: '#877D70',
        protein: '#F97316',
        carbs: '#4F46E5',
        fat: '#D99A25',
        calories: '#F97372',
        recovery: '#2F9E76',
        fasting: '#8B5CF6',
        supplements: '#DB2777',
        recipes: '#F97316',
        achievements: '#2563EB',
        analytics: '#2563EB',
        mealPlan: '#0D9488',
        bodyComp: '#8B5CF6',
        micros: '#2F9E76',
        overlay: 'rgba(30, 27, 24, 0.42)',
        overlayLight: 'rgba(249, 115, 114, 0.08)',
        glass: 'rgba(255, 255, 255, 0.92)',
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
