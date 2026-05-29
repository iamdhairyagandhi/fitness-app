import AsyncStorage from '@/lib/storage';
import type { FitnessGoal } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type HomeWidgetId =
    | 'flightDeck'
    | 'quickActions'
    | 'todayPlan'
    | 'wellness'
    | 'bodyProgress'
    | 'recentActivity'
    | 'coachBrief';

export type HomeQuickActionId =
    | 'startWorkout'
    | 'pilotLog'
    | 'logWater'
    | 'logFood'
    | 'coach'
    | 'progress';

export type HomeDensity = 'comfortable' | 'compact';

interface HomeDashboardState {
    widgetOrder: HomeWidgetId[] | null;
    hiddenWidgets: HomeWidgetId[];
    quickActions: HomeQuickActionId[] | null;
    density: HomeDensity;
    hasCustomized: boolean;
    setWidgetOrder: (order: HomeWidgetId[]) => void;
    moveWidget: (widgetId: HomeWidgetId, direction: 'up' | 'down', goal?: FitnessGoal) => void;
    toggleWidget: (widgetId: HomeWidgetId, goal?: FitnessGoal) => void;
    setQuickActions: (actions: HomeQuickActionId[]) => void;
    toggleQuickAction: (actionId: HomeQuickActionId, goal?: FitnessGoal) => void;
    setDensity: (density: HomeDensity) => void;
    resetForGoal: (goal?: FitnessGoal) => void;
}

export const ALL_HOME_WIDGETS: HomeWidgetId[] = [
    'flightDeck',
    'quickActions',
    'todayPlan',
    'wellness',
    'bodyProgress',
    'recentActivity',
    'coachBrief',
];

export const ALL_HOME_QUICK_ACTIONS: HomeQuickActionId[] = [
    'startWorkout',
    'pilotLog',
    'logWater',
    'logFood',
    'coach',
    'progress',
];

const DEFAULT_QUICK_ACTIONS: Record<FitnessGoal | 'default', HomeQuickActionId[]> = {
    lose_fat: ['pilotLog', 'logWater', 'startWorkout', 'progress'],
    maintain: ['startWorkout', 'pilotLog', 'logWater', 'coach'],
    build_muscle: ['startWorkout', 'pilotLog', 'logFood', 'progress'],
    recomp: ['startWorkout', 'pilotLog', 'logWater', 'progress'],
    strength: ['startWorkout', 'progress', 'logFood', 'coach'],
    endurance: ['startWorkout', 'logWater', 'pilotLog', 'progress'],
    default: ['startWorkout', 'pilotLog', 'logWater', 'progress'],
};

const DEFAULT_WIDGET_ORDER: Record<FitnessGoal | 'default', HomeWidgetId[]> = {
    lose_fat: ['flightDeck', 'quickActions', 'wellness', 'todayPlan', 'bodyProgress', 'coachBrief', 'recentActivity'],
    maintain: ['flightDeck', 'quickActions', 'todayPlan', 'wellness', 'bodyProgress', 'coachBrief', 'recentActivity'],
    build_muscle: ['flightDeck', 'quickActions', 'todayPlan', 'wellness', 'recentActivity', 'bodyProgress', 'coachBrief'],
    recomp: ['flightDeck', 'quickActions', 'todayPlan', 'wellness', 'bodyProgress', 'coachBrief', 'recentActivity'],
    strength: ['flightDeck', 'quickActions', 'todayPlan', 'recentActivity', 'bodyProgress', 'wellness', 'coachBrief'],
    endurance: ['flightDeck', 'quickActions', 'todayPlan', 'wellness', 'bodyProgress', 'recentActivity', 'coachBrief'],
    default: ['flightDeck', 'quickActions', 'todayPlan', 'wellness', 'bodyProgress', 'recentActivity', 'coachBrief'],
};

const uniqueKnownWidgets = (order: HomeWidgetId[]) => {
    const cleaned = order.filter((id, index) => ALL_HOME_WIDGETS.includes(id) && order.indexOf(id) === index);
    return [...cleaned, ...ALL_HOME_WIDGETS.filter((id) => !cleaned.includes(id))];
};

const uniqueKnownActions = (actions: HomeQuickActionId[]) => {
    return actions.filter((id, index) => ALL_HOME_QUICK_ACTIONS.includes(id) && actions.indexOf(id) === index).slice(0, 4);
};

export const getDefaultHomeWidgetOrder = (goal?: FitnessGoal) => DEFAULT_WIDGET_ORDER[goal ?? 'default'] ?? DEFAULT_WIDGET_ORDER.default;
export const getDefaultHomeQuickActions = (goal?: FitnessGoal) => DEFAULT_QUICK_ACTIONS[goal ?? 'default'] ?? DEFAULT_QUICK_ACTIONS.default;

export const useHomeDashboardStore = create<HomeDashboardState>()(
    persist(
        (set, get) => ({
            widgetOrder: null,
            hiddenWidgets: [],
            quickActions: null,
            density: 'comfortable',
            hasCustomized: false,

            setWidgetOrder: (order) => set({ widgetOrder: uniqueKnownWidgets(order), hasCustomized: true }),

            moveWidget: (widgetId, direction, goal) => {
                const order = uniqueKnownWidgets(get().widgetOrder ?? getDefaultHomeWidgetOrder(goal));
                const index = order.indexOf(widgetId);
                if (index === -1) return;
                const nextIndex = direction === 'up' ? index - 1 : index + 1;
                if (nextIndex < 0 || nextIndex >= order.length) return;
                const next = [...order];
                [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
                set({ widgetOrder: next, hasCustomized: true });
            },

            toggleWidget: (widgetId, goal) => {
                const order = uniqueKnownWidgets(get().widgetOrder ?? getDefaultHomeWidgetOrder(goal));
                const hidden = get().hiddenWidgets;
                const visibleCount = order.filter((id) => !hidden.includes(id)).length;
                const isHidden = hidden.includes(widgetId);
                if (!isHidden && visibleCount <= 1) return;
                set({
                    hiddenWidgets: isHidden ? hidden.filter((id) => id !== widgetId) : [...hidden, widgetId],
                    widgetOrder: order,
                    hasCustomized: true,
                });
            },

            setQuickActions: (actions) => set({ quickActions: uniqueKnownActions(actions), hasCustomized: true }),

            toggleQuickAction: (actionId, goal) => {
                const current = uniqueKnownActions(get().quickActions ?? getDefaultHomeQuickActions(goal));
                const exists = current.includes(actionId);
                if (exists && current.length <= 1) return;
                if (exists) {
                    set({ quickActions: current.filter((id) => id !== actionId), hasCustomized: true });
                    return;
                }
                const next = current.length >= 4 ? [...current.slice(0, 3), actionId] : [...current, actionId];
                set({ quickActions: next, hasCustomized: true });
            },

            setDensity: (density) => set({ density, hasCustomized: true }),

            resetForGoal: (goal) => set({
                widgetOrder: getDefaultHomeWidgetOrder(goal),
                hiddenWidgets: [],
                quickActions: getDefaultHomeQuickActions(goal),
                density: 'comfortable',
                hasCustomized: false,
            }),
        }),
        {
            name: 'bodypilot-home-dashboard',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                widgetOrder: state.widgetOrder,
                hiddenWidgets: state.hiddenWidgets,
                quickActions: state.quickActions,
                density: state.density,
                hasCustomized: state.hasCustomized,
            }),
        },
    ),
);
