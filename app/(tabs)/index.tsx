import { HealthSourcesCard } from '@/components/HealthSourcesCard';
import { Card, ProgressRing } from '@/components/ui';
import { WATER_SERVING_ML } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { generateDailyInsight } from '@/lib/aiEngine';
import { requirePremium } from '@/lib/premium';
import { displayWeightFromKg, formatNumber, formatVolume, getGreeting, getPercentage } from '@/lib/utils';
import { useAppleHealthStore } from '@/stores/appleHealthStore';
import { useAuthStore } from '@/stores/authStore';
import {
    ALL_HOME_QUICK_ACTIONS,
    ALL_HOME_WIDGETS,
    getDefaultHomeQuickActions,
    getDefaultHomeWidgetOrder,
    type HomeQuickActionId,
    type HomeWidgetId,
    useHomeDashboardStore,
} from '@/stores/homeDashboardStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { FitnessGoal } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WidgetMeta = {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
};

type QuickActionDefinition = {
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
};

const GOAL_LABELS: Record<FitnessGoal, string> = {
    lose_fat: 'Fat loss',
    maintain: 'Maintain',
    build_muscle: 'Build muscle',
    recomp: 'Recomp',
    strength: 'Strength',
    endurance: 'Endurance',
};

const GOAL_FOCUS: Record<FitnessGoal, string> = {
    lose_fat: 'Keep calories intentional and protein high.',
    maintain: 'Protect the routine and keep your baseline steady.',
    build_muscle: 'Make the next lift count and feed recovery.',
    recomp: 'Win the day with protein, water, and a clean session.',
    strength: 'Prioritize quality sets and recovery between pushes.',
    endurance: 'Hydrate early and keep the next session sustainable.',
};

const WIDGET_META: Record<HomeWidgetId, WidgetMeta> = {
    flightDeck: {
        title: 'Flight Deck',
        description: 'Daily score, focus, and top signals.',
        icon: 'speedometer-outline',
    },
    quickActions: {
        title: 'Quick Actions',
        description: 'Your fastest logging shortcuts.',
        icon: 'flash-outline',
    },
    todayPlan: {
        title: "Today's Plan",
        description: 'Active or suggested workout.',
        icon: 'barbell-outline',
    },
    wellness: {
        title: 'Nutrition + Recovery',
        description: 'Calories, macros, water, and readiness.',
        icon: 'pulse-outline',
    },
    bodyProgress: {
        title: 'Body Progress',
        description: 'Weight trend and check-in shortcut.',
        icon: 'trending-up-outline',
    },
    recentActivity: {
        title: 'Recent Activity',
        description: 'Latest workouts and training volume.',
        icon: 'time-outline',
    },
    coachBrief: {
        title: 'Coach Brief',
        description: 'AI next-step recommendation.',
        icon: 'sparkles-outline',
    },
};

const mergeWidgetOrder = (order: HomeWidgetId[] | null, goal: FitnessGoal) => {
    const base = order ?? getDefaultHomeWidgetOrder(goal);
    const clean = base.filter((id, index) => ALL_HOME_WIDGETS.includes(id) && base.indexOf(id) === index);
    return [...clean, ...ALL_HOME_WIDGETS.filter((id) => !clean.includes(id))];
};

const mergeQuickActions = (actions: HomeQuickActionId[] | null, goal: FitnessGoal) => {
    const base = actions ?? getDefaultHomeQuickActions(goal);
    const clean = base.filter((id, index) => ALL_HOME_QUICK_ACTIONS.includes(id) && base.indexOf(id) === index);
    return (clean.length ? clean : getDefaultHomeQuickActions(goal)).slice(0, 4);
};

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const todaySummary = useNutritionStore((s) => s.todaySummary);
    const logWater = useNutritionStore((s) => s.logWater);
    const ensureToday = useNutritionStore((s) => s.ensureToday);
    const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
    const isWorkoutActive = useWorkoutStore((s) => s.isWorkoutActive);
    const templates = useWorkoutStore((s) => s.templates);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const personalRecords = useWorkoutStore((s) => s.personalRecords);
    const startWorkoutFromTemplate = useWorkoutStore((s) => s.startWorkoutFromTemplate);
    const startWorkout = useWorkoutStore((s) => s.startWorkout);
    const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs);
    const todayRecovery = useRecoveryStore((s) => s.todayRecovery);
    const weightEntries = useProgressStore((s) => s.weightEntries);
    const widgetOrderPreference = useHomeDashboardStore((s) => s.widgetOrder);
    const hiddenWidgets = useHomeDashboardStore((s) => s.hiddenWidgets);
    const quickActionPreference = useHomeDashboardStore((s) => s.quickActions);
    const density = useHomeDashboardStore((s) => s.density);
    const hasCustomized = useHomeDashboardStore((s) => s.hasCustomized);
    const moveWidget = useHomeDashboardStore((s) => s.moveWidget);
    const toggleWidget = useHomeDashboardStore((s) => s.toggleWidget);
    const toggleQuickAction = useHomeDashboardStore((s) => s.toggleQuickAction);
    const setDensity = useHomeDashboardStore((s) => s.setDensity);
    const resetForGoal = useHomeDashboardStore((s) => s.resetForGoal);
    const healthSnapshot = useAppleHealthStore((s) => s.snapshot);
    const syncAppleHealth = useAppleHealthStore((s) => s.sync);

    const [aiInsight, setAiInsight] = useState<{ text: string; type: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [customizeOpen, setCustomizeOpen] = useState(false);

    useEffect(() => {
        ensureToday();
    }, [ensureToday]);

    const goal = (user?.goal ?? 'maintain') as FitnessGoal;
    const isCompact = density === 'compact';
    const calorieTarget = user?.daily_calorie_target || 2200;
    const proteinTarget = user?.protein_target_g || 165;
    const carbsTarget = user?.carbs_target_g || 220;
    const fatTarget = user?.fat_target_g || 73;
    const waterTarget = user?.water_goal_ml || 2500;
    const streak = user?.streak_count || 0;
    const displayName = user?.display_name || 'Athlete';
    const recovery = todayRecovery || recoveryLogs[0] || null;
    const activeEnergyKcal = healthSnapshot.status === 'authorized' ? healthSnapshot.activeEnergyKcal : 0;
    const netCalories = Math.max(todaySummary.total_calories - activeEnergyKcal, 0);
    const caloriesRemaining = Math.max(calorieTarget - netCalories, 0);
    const caloriePct = getPercentage(netCalories, calorieTarget);
    const proteinPct = getPercentage(todaySummary.total_protein_g, proteinTarget);
    const waterPct = getPercentage(todaySummary.water_ml, waterTarget);
    const latestWorkout = recentWorkouts[0];
    const latestWeight = weightEntries[0]?.weight_kg || user?.current_weight_kg || user?.weight_kg || null;
    const previousWeight = weightEntries[1]?.weight_kg || null;
    const weightDelta = latestWeight && previousWeight ? latestWeight - previousWeight : null;
    const displayWeight = latestWeight ? displayWeightFromKg(latestWeight, user?.unit_system) : null;
    const displayWeightDelta = weightDelta !== null ? displayWeightFromKg(Math.abs(weightDelta), user?.unit_system) : null;
    const weightUnit = user?.unit_system === 'imperial' ? 'lb' : 'kg';
    const nextTemplate = templates[0] || null;

    const customizeWidgetOrder = useMemo(
        () => mergeWidgetOrder(widgetOrderPreference, goal),
        [goal, widgetOrderPreference],
    );

    const visibleWidgetIds = useMemo(() => {
        const visible = customizeWidgetOrder.filter((id) => !hiddenWidgets.includes(id));
        return visible.length ? visible : getDefaultHomeWidgetOrder(goal).slice(0, 1);
    }, [customizeWidgetOrder, goal, hiddenWidgets]);

    const quickActionIds = useMemo(
        () => mergeQuickActions(quickActionPreference, goal),
        [goal, quickActionPreference],
    );

    const pilotScore = useMemo(() => {
        const nutritionScore = Math.min(100, Math.round((caloriePct * 0.45) + (proteinPct * 0.35)));
        const hydrationScore = Math.min(100, Math.round(waterPct));
        const recoveryScore = recovery?.recovery_score ?? 72;
        const trainingScore = isWorkoutActive || latestWorkout ? 85 : 58;
        return Math.round(
            nutritionScore * 0.32 +
            hydrationScore * 0.18 +
            recoveryScore * 0.28 +
            trainingScore * 0.22,
        );
    }, [caloriePct, isWorkoutActive, latestWorkout, proteinPct, recovery?.recovery_score, waterPct]);

    const pilotTone = pilotScore >= 80 ? 'Ready to push' : pilotScore >= 60 ? 'Steady build' : 'Recover and reset';
    const dailyFocus = proteinPct < 70
        ? 'Prioritize protein early today.'
        : waterPct < 60
            ? 'Hydration is the easiest win right now.'
            : isWorkoutActive
                ? 'Workout is live. Keep the session clean.'
                : GOAL_FOCUS[goal];

    const onRefresh = useCallback(() => {
        ensureToday();
        setRefreshing(true);
        syncAppleHealth().catch(() => { }).finally(() => {
            setTimeout(() => setRefreshing(false), 500);
        });
    }, [ensureToday, syncAppleHealth]);

    const handleStartWorkout = useCallback(() => {
        if (isWorkoutActive) {
            router.push('/workout/active');
            return;
        }
        if (nextTemplate) {
            startWorkoutFromTemplate(nextTemplate);
        } else {
            startWorkout('Open Workout');
        }
        router.push('/workout/active');
    }, [isWorkoutActive, nextTemplate, startWorkout, startWorkoutFromTemplate]);

    const quickActionDefinitions = useMemo<Record<HomeQuickActionId, QuickActionDefinition>>(() => ({
        startWorkout: {
            label: isWorkoutActive ? 'Resume' : 'Start',
            description: 'Open the next workout.',
            icon: isWorkoutActive ? 'timer' : 'play',
            color: colors.primary,
            onPress: handleStartWorkout,
        },
        pilotLog: {
            label: 'Orbit',
            description: 'Talk to log anything.',
            icon: 'hardware-chip',
            color: colors.calories,
            onPress: () => {
                if (requirePremium('ai_quick_log')) router.push('/nutrition/nlp-food-log');
            },
        },
        logWater: {
            label: 'Water',
            description: `Add ${WATER_SERVING_ML}ml.`,
            icon: 'water',
            color: colors.secondary,
            onPress: () => logWater(WATER_SERVING_ML),
        },
        logFood: {
            label: 'Food',
            description: 'Open nutrition.',
            icon: 'restaurant',
            color: colors.protein,
            onPress: () => router.push('/(tabs)/nutrition'),
        },
        coach: {
            label: 'Coach',
            description: 'Ask BodyPilot.',
            icon: 'chatbubble-ellipses',
            color: colors.analytics,
            onPress: () => {
                if (requirePremium('ai_coach')) router.push('/chat');
            },
        },
        progress: {
            label: 'Progress',
            description: 'Open check-ins.',
            icon: 'trending-up',
            color: colors.bodyComp,
            onPress: () => router.push('/(tabs)/progress'),
        },
    }), [
        colors.analytics,
        colors.bodyComp,
        colors.calories,
        colors.primary,
        colors.protein,
        colors.secondary,
        handleStartWorkout,
        isWorkoutActive,
        logWater,
    ]);

    useEffect(() => {
        generateDailyInsight({
            name: displayName,
            calorieTarget,
            todayCalories: todaySummary.total_calories,
            proteinTarget,
            todayProtein: todaySummary.total_protein_g,
            streak,
            lastWorkout: latestWorkout?.name,
            recoveryScore: recovery?.recovery_score,
            goal,
        }).then(setAiInsight).catch(() => { });
    }, [
        calorieTarget,
        displayName,
        goal,
        latestWorkout?.name,
        proteinTarget,
        recovery?.recovery_score,
        streak,
        todaySummary.total_calories,
        todaySummary.total_protein_g,
    ]);

    const renderFlightDeck = () => (
        <LinearGradient
            colors={[colors.surfaceElevated, colors.surface, colors.background]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, isCompact && styles.heroCardCompact, { borderColor: `${colors.primary}30` }]}
        >
            <View style={styles.heroTop}>
                <View>
                    <Text style={[styles.heroEyebrow, { color: colors.primary }]}>TODAY'S FLIGHT DECK</Text>
                    <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact, { color: colors.text }]}>{pilotTone}</Text>
                    <Text style={[styles.goalBadgeText, { color: colors.textTertiary }]}>Goal: {GOAL_LABELS[goal]}</Text>
                </View>
                <ProgressRing
                    progress={pilotScore}
                    size={isCompact ? 78 : 92}
                    strokeWidth={8}
                    color={colors.primary}
                    value={`${pilotScore}`}
                    label="pilot"
                    sublabel="score"
                />
            </View>
            <Text style={[styles.heroCopy, isCompact && styles.heroCopyCompact, { color: colors.textSecondary }]}>{dailyFocus}</Text>
            <View style={styles.heroStats}>
                <SignalTile icon="nutrition" label="Net calories" value={`${formatNumber(caloriesRemaining)} left`} color={colors.calories} />
                <SignalTile icon="flame" label="Burned" value={`${formatNumber(activeEnergyKcal)} kcal`} color={colors.primary} />
                <SignalTile icon="water" label="Water" value={`${Math.round(todaySummary.water_ml / 100) / 10}L`} color={colors.secondary} />
            </View>
        </LinearGradient>
    );

    const renderQuickActions = () => (
        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
            {quickActionIds.map((actionId) => (
                <QuickAction key={actionId} {...quickActionDefinitions[actionId]} />
            ))}
        </View>
    );

    const renderTodayPlan = () => (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Today’s Plan</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/workout')}>
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>Workout tab</Text>
                </TouchableOpacity>
            </View>

            <Card style={[styles.planCard, isCompact && styles.cardCompact]}>
                <View style={styles.planHeader}>
                    <View style={[styles.planIcon, { backgroundColor: `${colors.primary}18` }]}>
                        <Ionicons name={isWorkoutActive ? 'timer' : 'barbell'} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.planTextBlock}>
                        <Text style={[styles.planTitle, { color: colors.text }]}>
                            {isWorkoutActive ? activeWorkout?.name : nextTemplate?.name || 'Open Workout'}
                        </Text>
                        <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                            {isWorkoutActive
                                ? `${activeWorkout?.exercises.length || 0} exercises in progress`
                                : nextTemplate
                                    ? `${nextTemplate.exercises.length} exercises - ${nextTemplate.estimated_duration_min} min`
                                    : 'Start a flexible session and build as you go'}
                        </Text>
                    </View>
                    <TouchableOpacity style={[styles.planStartButton, { backgroundColor: colors.primary }]} onPress={handleStartWorkout}>
                        <Ionicons name={isWorkoutActive ? 'arrow-forward' : 'play'} size={20} color={colors.textInverse} />
                    </TouchableOpacity>
                </View>
                <View style={styles.planMetrics}>
                    <MiniMetric label="Recent volume" value={formatVolume(latestWorkout?.total_volume_kg || 0, user?.unit_system)} />
                    <MiniMetric label="PRs" value={`${personalRecords.length}`} />
                    <MiniMetric label="Completed" value={`${user?.workouts_completed || recentWorkouts.length}`} />
                </View>
            </Card>
        </View>
    );

    const renderWellness = () => (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Signals</Text>
                <TouchableOpacity onPress={() => router.push('/nutrition/nutrition-insights' as any)}>
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>Insights</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.grid}>
                <Card style={[styles.gridCard, isCompact && styles.gridCardCompact]}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="nutrition" size={18} color={colors.calories} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Nutrition</Text>
                    </View>
                    <Text style={[styles.largeValue, { color: colors.text }]}>{formatNumber(netCalories)}</Text>
                    <Text style={[styles.subValue, { color: colors.textTertiary }]}>
                        net of {formatNumber(calorieTarget)} kcal
                    </Text>
                    <ProgressLine value={caloriePct} color={colors.calories} />
                    <Text style={[styles.factText, { color: colors.textSecondary }]}>
                        {formatNumber(todaySummary.total_calories)} eaten - {formatNumber(activeEnergyKcal)} burned
                    </Text>
                    <View style={styles.macroMiniRow}>
                        <MacroPill label="P" value={todaySummary.total_protein_g} target={proteinTarget} color={colors.protein} />
                        <MacroPill label="C" value={todaySummary.total_carbs_g} target={carbsTarget} color={colors.carbs} />
                        <MacroPill label="F" value={todaySummary.total_fat_g} target={fatTarget} color={colors.fat} />
                    </View>
                </Card>

                <Card style={[styles.gridCard, isCompact && styles.gridCardCompact]}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="heart" size={18} color={colors.recovery} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Recovery</Text>
                    </View>
                    <Text style={[styles.largeValue, { color: colors.text }]}>{recovery?.recovery_score ?? '--'}</Text>
                    <Text style={[styles.subValue, { color: colors.textTertiary }]}>{recovery ? 'readiness score' : 'check-in needed'}</Text>
                    <ProgressLine value={recovery?.recovery_score ?? 0} color={colors.recovery} />
                    <View style={styles.recoveryFacts}>
                        <Text style={[styles.factText, { color: colors.textSecondary }]}>Sleep {recovery?.sleep_hours ? `${recovery.sleep_hours}h` : '--'}</Text>
                        <Text style={[styles.factText, { color: colors.textSecondary }]}>Energy {recovery?.energy_level ?? '--'}/5</Text>
                    </View>
                </Card>
            </View>
        </View>
    );

    const renderBodyProgress = () => (
        <Card style={[styles.bodyCard, isCompact && styles.cardCompact]}>
            <View style={styles.cardTitleRow}>
                <Ionicons name="trending-up" size={18} color={colors.bodyComp} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Body Progress</Text>
            </View>
            <View style={styles.bodyRow}>
                <View style={styles.bodyCopy}>
                    <Text style={[styles.largeValue, { color: colors.text }]}>{displayWeight ? `${displayWeight.toFixed(1)} ${weightUnit}` : '--'}</Text>
                    <Text style={[styles.subValue, { color: colors.textTertiary }]}>
                        {weightDelta !== null && displayWeightDelta !== null
                            ? `${weightDelta >= 0 ? '+' : '-'}${displayWeightDelta.toFixed(1)} ${weightUnit} since last log`
                            : 'log weight to track trend'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: `${colors.primary}45`, backgroundColor: `${colors.primary}12` }]}
                    onPress={() => router.push('/(tabs)/progress')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Update</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );

    const renderRecentActivity = () => (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/analytics')}>
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>Analytics</Text>
                </TouchableOpacity>
            </View>

            {recentWorkouts.length === 0 && healthSnapshot.workouts.length === 0 ? (
                <Card style={[styles.emptyCard, isCompact && styles.cardCompact]}>
                    <Ionicons name="barbell-outline" size={32} color={colors.textTertiary} />
                    <View style={styles.emptyTextBlock}>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>BodyPilot and Apple Health workouts will appear here with volume, duration, and calories.</Text>
                    </View>
                </Card>
            ) : (
                [
                    ...recentWorkouts.map((workout) => ({
                        id: workout.id,
                        title: workout.name,
                        meta: `${workout.exercises.length} exercises - ${Math.round((workout.duration_seconds || 0) / 60)} min`,
                        value: formatVolume(workout.total_volume_kg, user?.unit_system),
                        icon: 'barbell' as const,
                        color: colors.primary,
                        date: workout.completed_at ?? workout.started_at,
                    })),
                    ...healthSnapshot.workouts.map((workout) => ({
                        id: `health-${workout.id}`,
                        title: workout.type,
                        meta: `Apple Health - ${workout.durationMinutes} min`,
                        value: workout.calories ? `${formatNumber(workout.calories)} kcal` : 'Health',
                        icon: 'watch' as const,
                        color: colors.calories,
                        date: workout.startDate ?? '',
                    })),
                ]
                    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                    .slice(0, 3)
                    .map((activity) => (
                        <TouchableOpacity key={activity.id} activeOpacity={0.85}>
                            <Card style={[styles.activityCard, isCompact && styles.activityCardCompact]}>
                                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}18` }]}>
                                    <Ionicons name={activity.icon} size={18} color={activity.color} />
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                                    <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>{activity.meta}</Text>
                                </View>
                                <Text style={[styles.activityValue, { color: colors.text }]}>{activity.value}</Text>
                            </Card>
                        </TouchableOpacity>
                    ))
            )}
        </View>
    );

    const renderCoachBrief = () => (
        <Card style={[styles.aiCard, isCompact && styles.cardCompact, { borderColor: `${colors.primary}30` }]}>
            <View style={styles.aiHeader}>
                <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}14` }]}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={[styles.aiBadgeText, { color: colors.primary }]}>BODY PILOT</Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        if (requirePremium('ai_coach')) router.push('/chat');
                    }}
                >
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>Ask</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.aiTitle, { color: colors.text }]}>Coach Brief</Text>
            <Text style={[styles.aiContent, { color: colors.textSecondary }]}>
                {aiInsight?.text || 'Log one meal, water, and a workout to unlock a sharper daily recommendation.'}
            </Text>
            <View style={styles.aiActions}>
                <CoachButton icon="restaurant-outline" label="AI meals" color={colors.primary} onPress={() => {
                    if (requirePremium('ai_meal_plan')) router.push('/ai-meal-plan' as any);
                }} />
                <CoachButton icon="barbell-outline" label="AI workout" color={colors.primary} onPress={() => {
                    if (requirePremium('ai_workout')) router.push('/(tabs)/workout' as any);
                }} />
                <CoachButton icon="document-text-outline" label="Report" color={colors.primary} onPress={() => {
                    if (requirePremium('weekly_report')) router.push('/weekly-report' as any);
                }} />
            </View>
        </Card>
    );

    const renderWidget = (widgetId: HomeWidgetId) => {
        switch (widgetId) {
            case 'flightDeck':
                return renderFlightDeck();
            case 'quickActions':
                return renderQuickActions();
            case 'todayPlan':
                return renderTodayPlan();
            case 'wellness':
                return renderWellness();
            case 'bodyProgress':
                return renderBodyProgress();
            case 'recentActivity':
                return renderRecentActivity();
            case 'coachBrief':
                return renderCoachBrief();
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerCopy}>
                        <Text style={[styles.greeting, { color: colors.textTertiary }]}>{getGreeting()}</Text>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={[styles.streakBadge, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/achievements')}>
                            <Ionicons name="flame" size={15} color={colors.primary} />
                            <Text style={[styles.streakCount, { color: colors.text }]}>{streak}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setCustomizeOpen(true)}
                        >
                            <Ionicons name="options" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {!hasCustomized && (
                    <TouchableOpacity
                        style={[styles.personalizePrompt, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}32` }]}
                        onPress={() => setCustomizeOpen(true)}
                    >
                        <Ionicons name="grid-outline" size={18} color={colors.primary} />
                        <View style={styles.personalizeCopy}>
                            <Text style={[styles.personalizeTitle, { color: colors.text }]}>Your home is tuned for {GOAL_LABELS[goal].toLowerCase()}</Text>
                            <Text style={[styles.personalizeText, { color: colors.textSecondary }]}>Rearrange cards, hide what you do not use, and keep shortcuts easy to reach.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>
                )}

                {visibleWidgetIds.map((widgetId) => (
                    <View key={widgetId} style={[styles.widgetBlock, isCompact && styles.widgetBlockCompact]}>
                        {renderWidget(widgetId)}
                    </View>
                ))}

                <View style={[styles.widgetBlock, isCompact && styles.widgetBlockCompact]}>
                    <HealthSourcesCard title="Home Health Sources" />
                </View>
            </ScrollView>

            <HomeCustomizeModal
                visible={customizeOpen}
                onClose={() => setCustomizeOpen(false)}
                insetsBottom={insets.bottom}
                goal={goal}
                widgetRows={customizeWidgetOrder}
                hiddenWidgets={hiddenWidgets}
                quickActionIds={quickActionIds}
                quickActionDefinitions={quickActionDefinitions}
                density={density}
                onMoveWidget={moveWidget}
                onToggleWidget={toggleWidget}
                onToggleQuickAction={toggleQuickAction}
                onSetDensity={setDensity}
                onReset={resetForGoal}
            />
        </View>
    );
}

function SignalTile({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.signalTile, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={[styles.signalLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.signalValue, { color: colors.text }]}>{value}</Text>
        </View>
    );
}

function QuickAction({ icon, label, color, onPress }: QuickActionDefinition) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.82}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon} size={21} color={color} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.miniMetric, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.miniMetricValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.miniMetricLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function ProgressLine({ value, color }: { value: number; color: string }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
        </View>
    );
}

function MacroPill({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.macroPill, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.macroPillLabel, { color }]}>{label}</Text>
            <Text style={[styles.macroPillValue, { color: colors.textSecondary }]}>{Math.round(value)}/{target}g</Text>
        </View>
    );
}

function CoachButton({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.coachButton, { backgroundColor: `${color}10` }]} onPress={onPress}>
            <Ionicons name={icon} size={15} color={color} />
            <Text style={[styles.coachButtonText, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function HomeCustomizeModal({
    visible,
    onClose,
    insetsBottom,
    goal,
    widgetRows,
    hiddenWidgets,
    quickActionIds,
    quickActionDefinitions,
    density,
    onMoveWidget,
    onToggleWidget,
    onToggleQuickAction,
    onSetDensity,
    onReset,
}: {
    visible: boolean;
    onClose: () => void;
    insetsBottom: number;
    goal: FitnessGoal;
    widgetRows: HomeWidgetId[];
    hiddenWidgets: HomeWidgetId[];
    quickActionIds: HomeQuickActionId[];
    quickActionDefinitions: Record<HomeQuickActionId, QuickActionDefinition>;
    density: 'comfortable' | 'compact';
    onMoveWidget: (widgetId: HomeWidgetId, direction: 'up' | 'down', goal?: FitnessGoal) => void;
    onToggleWidget: (widgetId: HomeWidgetId, goal?: FitnessGoal) => void;
    onToggleQuickAction: (actionId: HomeQuickActionId, goal?: FitnessGoal) => void;
    onSetDensity: (density: 'comfortable' | 'compact') => void;
    onReset: (goal?: FitnessGoal) => void;
}) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalRoot}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.customizePanel, { backgroundColor: colors.surface, paddingBottom: Math.max(insetsBottom, Spacing.lg) }]}>
                    <View style={styles.customizeHeader}>
                        <View>
                            <Text style={[styles.customizeTitle, { color: colors.text }]}>Customize Home</Text>
                            <Text style={[styles.customizeSubtitle, { color: colors.textSecondary }]}>Goal preset: {GOAL_LABELS[goal]}</Text>
                        </View>
                        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceLight }]} onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.customizeScroll}>
                        <View style={styles.customizeSection}>
                            <Text style={[styles.customizeSectionTitle, { color: colors.text }]}>Readability</Text>
                            <View style={[styles.segmentRow, { backgroundColor: colors.surfaceLight }]}>
                                {(['comfortable', 'compact'] as const).map((option) => {
                                    const active = density === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.segmentButton, active && { backgroundColor: colors.primary }]}
                                            onPress={() => onSetDensity(option)}
                                        >
                                            <Text style={[styles.segmentText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                                                {option === 'comfortable' ? 'Comfortable' : 'Compact'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.customizeSection}>
                            <View style={styles.customizeSectionHeader}>
                                <Text style={[styles.customizeSectionTitle, { color: colors.text }]}>Shortcuts</Text>
                                <Text style={[styles.customizeHint, { color: colors.textTertiary }]}>Choose up to 4</Text>
                            </View>
                            <View style={styles.actionPickerGrid}>
                                {ALL_HOME_QUICK_ACTIONS.map((actionId) => {
                                    const active = quickActionIds.includes(actionId);
                                    const action = quickActionDefinitions[actionId];
                                    return (
                                        <TouchableOpacity
                                            key={actionId}
                                            style={[
                                                styles.actionPickerChip,
                                                {
                                                    backgroundColor: active ? `${action.color}18` : colors.surfaceLight,
                                                    borderColor: active ? action.color : colors.border,
                                                },
                                            ]}
                                            onPress={() => onToggleQuickAction(actionId, goal)}
                                        >
                                            <Ionicons name={action.icon} size={18} color={active ? action.color : colors.textTertiary} />
                                            <View style={styles.actionPickerCopy}>
                                                <Text style={[styles.actionPickerLabel, { color: active ? action.color : colors.textSecondary }]}>{action.label}</Text>
                                                <Text style={[styles.actionPickerDescription, { color: colors.textTertiary }]}>{action.description}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.customizeSection}>
                            <View style={styles.customizeSectionHeader}>
                                <Text style={[styles.customizeSectionTitle, { color: colors.text }]}>Dashboard Cards</Text>
                                <Text style={[styles.customizeHint, { color: colors.textTertiary }]}>Reorder or hide</Text>
                            </View>
                            <View style={styles.widgetList}>
                                {widgetRows.map((widgetId, index) => {
                                    const meta = WIDGET_META[widgetId];
                                    const hidden = hiddenWidgets.includes(widgetId);
                                    return (
                                        <View key={widgetId} style={[styles.widgetRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                            <View style={[styles.widgetRowIcon, { backgroundColor: hidden ? colors.surface : `${colors.primary}16` }]}>
                                                <Ionicons name={meta.icon} size={18} color={hidden ? colors.textTertiary : colors.primary} />
                                            </View>
                                            <View style={styles.widgetRowCopy}>
                                                <Text style={[styles.widgetRowTitle, { color: hidden ? colors.textTertiary : colors.text }]}>{meta.title}</Text>
                                                <Text style={[styles.widgetRowDescription, { color: colors.textTertiary }]} numberOfLines={1}>{meta.description}</Text>
                                            </View>
                                            <View style={styles.widgetRowControls}>
                                                <TouchableOpacity
                                                    style={[styles.reorderButton, { opacity: index === 0 ? 0.35 : 1 }]}
                                                    onPress={() => onMoveWidget(widgetId, 'up', goal)}
                                                    disabled={index === 0}
                                                >
                                                    <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.reorderButton, { opacity: index === widgetRows.length - 1 ? 0.35 : 1 }]}
                                                    onPress={() => onMoveWidget(widgetId, 'down', goal)}
                                                    disabled={index === widgetRows.length - 1}
                                                >
                                                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.reorderButton} onPress={() => onToggleWidget(widgetId, goal)}>
                                                    <Ionicons name={hidden ? 'eye-off' : 'eye'} size={18} color={hidden ? colors.textTertiary : colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.resetButton, { borderColor: colors.border, backgroundColor: colors.surfaceLight }]}
                            onPress={() => onReset(goal)}
                        >
                            <Ionicons name="refresh" size={17} color={colors.primary} />
                            <Text style={[styles.resetButtonText, { color: colors.primary }]}>Reset to {GOAL_LABELS[goal]} preset</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 110,
    },
    scrollContentCompact: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
        gap: Spacing.md,
    },
    headerCopy: {
        flex: 1,
    },
    greeting: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        letterSpacing: 0,
        textTransform: 'uppercase',
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
        marginTop: 3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minWidth: 50,
        height: 40,
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    streakCount: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    personalizePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    personalizeCopy: {
        flex: 1,
    },
    personalizeTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    personalizeText: {
        fontSize: FontSize.xs,
        lineHeight: 18,
        marginTop: 2,
    },
    widgetBlock: {
        marginBottom: Spacing.lg,
    },
    widgetBlockCompact: {
        marginBottom: Spacing.md,
    },
    heroCard: {
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        overflow: 'hidden',
    },
    heroCardCompact: {
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
    },
    heroEyebrow: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
        marginBottom: Spacing.sm,
    },
    heroTitle: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        lineHeight: 36,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
        maxWidth: 205,
    },
    heroTitleCompact: {
        fontSize: FontSize.xxl,
        lineHeight: 30,
    },
    goalBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        marginTop: Spacing.xs,
    },
    heroCopy: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    heroCopyCompact: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        fontSize: FontSize.sm,
    },
    heroStats: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    signalTile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        minHeight: 74,
        justifyContent: 'space-between',
    },
    signalLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        marginTop: Spacing.xs,
    },
    signalValue: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionRowCompact: {
        gap: Spacing.xs,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: Spacing.md,
        minHeight: 96,
    },
    quickActionIcon: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    sectionLink: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    cardCompact: {
        padding: Spacing.md,
    },
    planCard: {},
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    planIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },
    planTextBlock: {
        flex: 1,
    },
    planTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    planSubtitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        lineHeight: 18,
        marginTop: 3,
    },
    planStartButton: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planMetrics: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    miniMetric: {
        flex: 1,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
    },
    miniMetricValue: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    miniMetricLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        marginTop: 2,
    },
    grid: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    gridCard: {
        flex: 1,
        minHeight: 198,
    },
    gridCardCompact: {
        minHeight: 174,
        padding: Spacing.md,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    cardTitle: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    largeValue: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
    },
    subValue: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 3,
        minHeight: 16,
    },
    progressTrack: {
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.border,
        overflow: 'hidden',
        marginTop: Spacing.md,
    },
    progressFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
    macroMiniRow: {
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    macroPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    macroPillLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    macroPillValue: {
        color: Colors.textSecondary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
    },
    recoveryFacts: {
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    factText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    bodyCard: {},
    bodyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
    },
    bodyCopy: {
        flex: 1,
    },
    secondaryButton: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.primary + '18',
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
    },
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyTextBlock: {
        flex: 1,
    },
    emptyTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    emptySubtitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 2,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    activityCardCompact: {
        padding: Spacing.md,
    },
    activityIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    activityMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    activityValue: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    aiCard: {
        borderColor: Colors.primary + '18',
        borderWidth: 1,
    },
    aiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.primary + '18',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    aiBadgeText: {
        color: Colors.primary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
    },
    aiTitle: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
        marginBottom: Spacing.sm,
    },
    aiContent: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 21,
    },
    aiActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    coachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.primary + '18',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    coachButtonText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.58)',
    },
    customizePanel: {
        maxHeight: '88%',
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    customizeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    customizeTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
    },
    customizeSubtitle: {
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    closeButton: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customizeScroll: {
        paddingBottom: Spacing.xl,
    },
    customizeSection: {
        marginTop: Spacing.lg,
    },
    customizeSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    customizeSectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    customizeHint: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    segmentRow: {
        flexDirection: 'row',
        borderRadius: BorderRadius.full,
        padding: 4,
        gap: 4,
        marginTop: Spacing.sm,
    },
    segmentButton: {
        flex: 1,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    segmentText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    actionPickerGrid: {
        gap: Spacing.sm,
    },
    actionPickerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    actionPickerCopy: {
        flex: 1,
    },
    actionPickerLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    actionPickerDescription: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    widgetList: {
        gap: Spacing.sm,
    },
    widgetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    widgetRowIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    widgetRowCopy: {
        flex: 1,
    },
    widgetRowTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    widgetRowDescription: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    widgetRowControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    reorderButton: {
        width: 30,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButton: {
        marginTop: Spacing.lg,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    resetButtonText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
});
