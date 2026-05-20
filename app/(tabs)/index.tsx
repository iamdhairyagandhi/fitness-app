import { Card, ProgressRing } from '@/components/ui';
import { WATER_SERVING_ML } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { generateDailyInsight } from '@/lib/aiEngine';
import { displayWeightFromKg, formatNumber, formatVolume, getGreeting, getPercentage } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const todaySummary = useNutritionStore((s) => s.todaySummary);
    const logWater = useNutritionStore((s) => s.logWater);
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

    const [aiInsight, setAiInsight] = useState<{ text: string; type: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const calorieTarget = user?.daily_calorie_target || 2200;
    const proteinTarget = user?.protein_target_g || 165;
    const carbsTarget = user?.carbs_target_g || 220;
    const fatTarget = user?.fat_target_g || 73;
    const waterTarget = user?.water_goal_ml || 2500;
    const streak = user?.streak_count || 0;
    const displayName = user?.display_name || 'Athlete';
    const recovery = todayRecovery || recoveryLogs[0] || null;
    const caloriesRemaining = Math.max(calorieTarget - todaySummary.total_calories, 0);
    const caloriePct = getPercentage(todaySummary.total_calories, calorieTarget);
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

    const pilotScore = useMemo(() => {
        const nutritionScore = Math.min(100, Math.round((caloriePct * 0.45) + (proteinPct * 0.35)));
        const hydrationScore = Math.min(100, Math.round(waterPct));
        const recoveryScore = recovery?.recovery_score ?? 72;
        const trainingScore = isWorkoutActive || latestWorkout ? 85 : 58;
        return Math.round(
            nutritionScore * 0.32 +
            hydrationScore * 0.18 +
            recoveryScore * 0.28 +
            trainingScore * 0.22
        );
    }, [caloriePct, isWorkoutActive, latestWorkout, proteinPct, recovery?.recovery_score, waterPct]);

    const pilotTone = pilotScore >= 80 ? 'Ready to push' : pilotScore >= 60 ? 'Steady build' : 'Recover and reset';
    const dailyFocus = proteinPct < 70
        ? 'Prioritize protein early today.'
        : waterPct < 60
            ? 'Hydration is the easiest win right now.'
            : isWorkoutActive
                ? 'Workout is live. Keep the session clean.'
                : 'Execute the next planned action.';

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 900);
    }, []);

    const handleStartWorkout = () => {
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
    };

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
            goal: user?.goal || 'maintain',
        }).then(setAiInsight).catch(() => { });
    }, [
        calorieTarget,
        displayName,
        latestWorkout?.name,
        proteinTarget,
        recovery?.recovery_score,
        streak,
        todaySummary.total_calories,
        todaySummary.total_protein_g,
        user?.goal,
    ]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
            >
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.textTertiary }]}>{getGreeting()}</Text>
                        <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.streakBadge} onPress={() => router.push('/achievements')}>
                            <Ionicons name="flame" size={15} color={colors.primary} />
                            <Text style={styles.streakCount}>{streak}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/chat')}>
                            <Ionicons name="sparkles" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <LinearGradient
                    colors={[colors.surfaceElevated, colors.surface, colors.background]}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.heroCard, { borderColor: `${colors.primary}30` }]}
                >
                    <View style={styles.heroTop}>
                        <View>
                            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>TODAY'S FLIGHT DECK</Text>
                            <Text style={[styles.heroTitle, { color: colors.text }]}>{pilotTone}</Text>
                        </View>
                        <ProgressRing
                            progress={pilotScore}
                            size={92}
                            strokeWidth={8}
                            color={colors.primary}
                            value={`${pilotScore}`}
                            label="pilot"
                            sublabel="score"
                        />
                    </View>
                    <Text style={[styles.heroCopy, { color: colors.textSecondary }]}>{dailyFocus}</Text>
                    <View style={styles.heroStats}>
                        <SignalTile icon="nutrition" label="Calories" value={`${formatNumber(caloriesRemaining)} left`} color={colors.calories} />
                        <SignalTile icon="water" label="Water" value={`${Math.round(todaySummary.water_ml / 100) / 10}L`} color={colors.secondary} />
                        <SignalTile icon="heart" label="Recovery" value={`${recovery?.recovery_score ?? '--'}`} color={colors.recovery} />
                    </View>
                </LinearGradient>

                <View style={styles.actionRow}>
                    <QuickAction icon="play" label="Start" color={colors.primary} onPress={handleStartWorkout} />
                    <QuickAction icon="restaurant" label="Food" color={colors.protein} onPress={() => router.push('/(tabs)/nutrition')} />
                    <QuickAction icon="water" label="Water" color={colors.secondary} onPress={() => logWater(WATER_SERVING_ML)} />
                    <QuickAction icon="chatbubble-ellipses" label="Coach" color={colors.analytics} onPress={() => router.push('/chat')} />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Today’s Plan</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/workout')}>
                        <Text style={[styles.sectionLink, { color: colors.primary }]}>Workout tab</Text>
                    </TouchableOpacity>
                </View>

                <Card style={styles.planCard}>
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
                                        ? `${nextTemplate.exercises.length} exercises · ${nextTemplate.estimated_duration_min} min`
                                        : 'Start a flexible session and build as you go'}
                            </Text>
                        </View>
                        <TouchableOpacity style={[styles.planStartButton, { backgroundColor: colors.primary }]} onPress={handleStartWorkout}>
                            <Ionicons name={isWorkoutActive ? 'arrow-forward' : 'play'} size={20} color={colors.background} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.planMetrics}>
                        <MiniMetric label="Recent volume" value={formatVolume(latestWorkout?.total_volume_kg || 0, user?.unit_system)} />
                        <MiniMetric label="PRs" value={`${personalRecords.length}`} />
                        <MiniMetric label="Completed" value={`${user?.workouts_completed || recentWorkouts.length}`} />
                    </View>
                </Card>

                <View style={styles.grid}>
                    <Card style={styles.gridCard}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="nutrition" size={18} color={colors.calories} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Nutrition</Text>
                        </View>
                        <Text style={[styles.largeValue, { color: colors.text }]}>{formatNumber(todaySummary.total_calories)}</Text>
                        <Text style={[styles.subValue, { color: colors.textTertiary }]}>of {formatNumber(calorieTarget)} kcal</Text>
                        <ProgressLine value={caloriePct} color={colors.calories} />
                        <View style={styles.macroMiniRow}>
                            <MacroPill label="P" value={todaySummary.total_protein_g} target={proteinTarget} color={colors.protein} />
                            <MacroPill label="C" value={todaySummary.total_carbs_g} target={carbsTarget} color={colors.carbs} />
                            <MacroPill label="F" value={todaySummary.total_fat_g} target={fatTarget} color={colors.fat} />
                        </View>
                    </Card>

                    <Card style={styles.gridCard}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="heart" size={18} color={colors.recovery} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Recovery</Text>
                        </View>
                        <Text style={[styles.largeValue, { color: colors.text }]}>{recovery?.recovery_score ?? '--'}</Text>
                        <Text style={[styles.subValue, { color: colors.textTertiary }]}>{recovery ? 'readiness score' : 'check-in needed'}</Text>
                        <ProgressLine value={recovery?.recovery_score ?? 0} color={colors.recovery} />
                        <View style={styles.recoveryFacts}>
                            <Text style={styles.factText}>Sleep {recovery?.sleep_hours ? `${recovery.sleep_hours}h` : '--'}</Text>
                            <Text style={styles.factText}>Energy {recovery?.energy_level ?? '--'}/5</Text>
                        </View>
                    </Card>
                </View>

                <Card style={styles.bodyCard}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="trending-up" size={18} color={colors.bodyComp} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Body Progress</Text>
                    </View>
                    <View style={styles.bodyRow}>
                        <View>
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

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => router.push('/analytics')}>
                        <Text style={[styles.sectionLink, { color: colors.primary }]}>Analytics</Text>
                    </TouchableOpacity>
                </View>

                {recentWorkouts.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Ionicons name="barbell-outline" size={32} color={colors.textTertiary} />
                        <View style={styles.emptyTextBlock}>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Your completed workouts will appear here with volume and duration.</Text>
                        </View>
                    </Card>
                ) : (
                    recentWorkouts.slice(0, 3).map((workout) => (
                        <TouchableOpacity key={workout.id} activeOpacity={0.85}>
                            <Card style={styles.activityCard}>
                                <View style={[styles.activityIcon, { backgroundColor: `${colors.primary}18` }]}>
                                    <Ionicons name="barbell" size={18} color={colors.primary} />
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={[styles.activityTitle, { color: colors.text }]}>{workout.name}</Text>
                                    <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>
                                        {workout.exercises.length} exercises · {Math.round((workout.duration_seconds || 0) / 60)} min
                                    </Text>
                                </View>
                                <Text style={[styles.activityValue, { color: colors.text }]}>{formatVolume(workout.total_volume_kg, user?.unit_system)}</Text>
                            </Card>
                        </TouchableOpacity>
                    ))
                )}

                <Card style={{ ...styles.aiCard, borderColor: `${colors.primary}30` }}>
                    <View style={styles.aiHeader}>
                        <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}14` }]}>
                            <Ionicons name="sparkles" size={14} color={colors.primary} />
                            <Text style={[styles.aiBadgeText, { color: colors.primary }]}>BODY PILOT</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/chat')}>
                            <Text style={[styles.sectionLink, { color: colors.primary }]}>Ask</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.aiTitle, { color: colors.text }]}>Coach Brief</Text>
                    <Text style={[styles.aiContent, { color: colors.textSecondary }]}>
                        {aiInsight?.text || 'Log one meal, water, and a workout to unlock a sharper daily recommendation.'}
                    </Text>
                    <View style={styles.aiActions}>
                        <CoachButton icon="restaurant-outline" label="AI meals" color={colors.primary} onPress={() => router.push('/ai-meal-plan' as any)} />
                        <CoachButton icon="barbell-outline" label="AI workout" color={colors.primary} onPress={() => router.push('/ai-workout' as any)} />
                        <CoachButton icon="document-text-outline" label="Report" color={colors.primary} onPress={() => router.push('/weekly-report' as any)} />
                    </View>
                </Card>
            </ScrollView>
        </View>
    );
}

function SignalTile({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
    const { colors } = useTheme();

    return (
        <View style={styles.signalTile}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={[styles.signalLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.signalValue, { color: colors.text }]}>{value}</Text>
        </View>
    );
}

function QuickAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 110,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
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
    heroCard: {
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        overflow: 'hidden',
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
    heroCopy: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
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
        marginBottom: Spacing.xl,
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
    planCard: {
        marginBottom: Spacing.lg,
    },
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
        marginBottom: Spacing.lg,
    },
    gridCard: {
        flex: 1,
        minHeight: 198,
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
    bodyCard: {
        marginBottom: Spacing.xl,
    },
    bodyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
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
        marginBottom: Spacing.lg,
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
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
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
});
