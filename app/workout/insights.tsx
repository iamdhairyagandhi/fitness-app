import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { buildWorkoutHistoryInsight, formatMuscle } from '@/lib/workoutAnalytics';
import {
    analyzeTrainingSplit,
    analyzeWeeklyVolumes,
    detectDeload,
    generateProgressionSuggestions,
    type ProgressionSuggestion,
} from '@/lib/workoutIntelligence';
import { formatDurationLong, formatVolume, formatWeight } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function formatProgressionTarget(item: ProgressionSuggestion, unitSystem?: 'metric' | 'imperial' | null) {
    if (item.type === 'weight_increase') {
        return `Try ${formatWeight(item.suggestedWeight, unitSystem)} for ${item.suggestedReps} reps across ${item.suggestedSets} sets.`;
    }
    if (item.type === 'rep_increase') {
        return `Keep ${formatWeight(item.suggestedWeight, unitSystem)} and aim for ${item.suggestedReps} reps per set.`;
    }
    if (item.type === 'deload') {
        return `Ease back to ${formatWeight(item.suggestedWeight, unitSystem)} and rebuild clean reps.`;
    }
    if (item.type === 'set_increase') {
        return `Add a set and hold ${formatWeight(item.suggestedWeight, unitSystem)} for ${item.suggestedReps} reps.`;
    }
    return `Repeat ${formatWeight(item.suggestedWeight, unitSystem)} and focus on cleaner reps.`;
}

export default function InsightsScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const personalRecords = useWorkoutStore((s) => s.personalRecords);
    const exercises = useWorkoutStore((s) => s.exercises);
    const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs);
    const user = useAuthStore((s) => s.user);
    const experienceLevel = user?.experience_level ?? 'intermediate';

    const splitAnalysis = useMemo(() => analyzeTrainingSplit(recentWorkouts, recoveryLogs, experienceLevel), [recentWorkouts, recoveryLogs, experienceLevel]);
    const weeklyVolume = useMemo(() => analyzeWeeklyVolumes(recentWorkouts), [recentWorkouts]);
    const deload = useMemo(() => detectDeload(recentWorkouts, recoveryLogs), [recentWorkouts, recoveryLogs]);
    const progression = useMemo(
        () => generateProgressionSuggestions(recentWorkouts, exercises)
            .filter((item) => !(item.type === 'weight_increase' && item.suggestedWeight <= item.previousWeight))
            .slice(0, 5),
        [recentWorkouts, exercises],
    );
    const insight = useMemo(
        () => buildWorkoutHistoryInsight(recentWorkouts, personalRecords),
        [personalRecords, recentWorkouts],
    );

    const hasData = recentWorkouts.length > 0;
    const avgRecovery = recoveryLogs.slice(0, 7).length
        ? recoveryLogs.slice(0, 7).reduce((sum, log) => sum + (log.recovery_score ?? 60), 0) / recoveryLogs.slice(0, 7).length
        : 70;
    const readinessScore = clamp(
        Math.round(avgRecovery * 0.55 + Math.min(insight.workoutsThisWeek * 9, 28) + (insight.prCount > 0 ? 6 : 0) + (deload.shouldDeload ? -18 : 8)),
        0,
        100,
    );
    const maxDailyVolume = Math.max(1, ...insight.dailyVolume.map((day) => day.volumeKg));
    const maxMuscleSets = Math.max(1, ...insight.topMuscles.map((muscle) => muscle.sets));
    const currentWeekVolume = weeklyVolume[0]?.totalVolume ?? insight.weekVolumeKg;
    const previousWeekVolume = weeklyVolume[1]?.totalVolume ?? insight.previousWeekVolumeKg;

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Training Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {!hasData ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="analytics" size={42} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>Your training story starts after one logged workout.</Text>
                        <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                            BodyPilot will turn completed sets into weekly volume, muscle balance, PR momentum, and next-session suggestions.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Card style={{ ...styles.heroCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                            <View style={styles.heroTop}>
                                <View style={styles.heroCopy}>
                                    <Text style={[styles.eyebrow, { color: colors.primary }]}>READINESS</Text>
                                    <Text style={[styles.heroTitle, { color: colors.text }]}>
                                        {deload.shouldDeload ? 'Recover before you push.' : insight.weekVolumeDeltaPct > 20 ? 'Strong week. Control the climb.' : 'Progress is building.'}
                                    </Text>
                                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>{insight.recommendation}</Text>
                                </View>
                                <View style={[styles.scoreOrb, { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}>
                                    <Text style={[styles.scoreValue, { color: colors.text }]}>{readinessScore}</Text>
                                    <Text style={[styles.scoreLabel, { color: colors.textTertiary }]}>score</Text>
                                </View>
                            </View>
                            <View style={styles.heroMetrics}>
                                <MetricPill label="Workouts" value={`${insight.workoutsThisWeek}`} colors={colors} />
                                <MetricPill label="Volume" value={formatVolume(insight.weekVolumeKg, user?.unit_system)} colors={colors} />
                                <MetricPill label="PRs" value={`${insight.prCount}`} colors={colors} />
                            </View>
                        </Card>

                        <View style={styles.grid}>
                            <InsightStat icon="flame" label="Streak" value={`${insight.consistencyStreak}d`} color={colors.primary} colors={colors} />
                            <InsightStat icon="time" label="Avg session" value={formatDurationLong(insight.avgDurationSeconds)} color={Colors.analytics} colors={colors} />
                            <InsightStat icon="barbell" label="Sets" value={`${insight.weekSets}`} color={Colors.recovery} colors={colors} />
                            <InsightStat icon="trending-up" label="Trend" value={`${insight.weekVolumeDeltaPct >= 0 ? '+' : ''}${insight.weekVolumeDeltaPct}%`} color={insight.weekVolumeDeltaPct >= 0 ? colors.primary : Colors.warning} colors={colors} />
                        </View>

                        {deload.shouldDeload && (
                            <Card style={{ ...styles.alertCard, backgroundColor: Colors.warning + '12', borderColor: Colors.warning + '55' }}>
                                <Ionicons name="warning" size={24} color={Colors.warning} />
                                <View style={styles.alertText}>
                                    <Text style={[styles.alertTitle, { color: colors.text }]}>Deload recommended</Text>
                                    <Text style={[styles.alertReason, { color: colors.textSecondary }]}>{deload.reason}</Text>
                                    <Text style={styles.alertSuggestion}>Reduce weekly work by {deload.suggestedReduction}% and keep technique crisp.</Text>
                                </View>
                            </Card>
                        )}

                        <Card style={{ ...styles.sectionCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>7-day volume map</Text>
                                <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>
                                    {formatVolume(currentWeekVolume, user?.unit_system)} this week
                                </Text>
                            </View>
                            <View style={styles.chartRow}>
                                {insight.dailyVolume.map((day) => (
                                    <View key={day.dateKey} style={styles.dayColumn}>
                                        <View style={[styles.dayBarTrack, { backgroundColor: colors.background }]}>
                                            <View
                                                style={[
                                                    styles.dayBarFill,
                                                    {
                                                        height: `${Math.max(8, (day.volumeKg / maxDailyVolume) * 100)}%`,
                                                        backgroundColor: day.volumeKg > 0 ? colors.primary : colors.border,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{day.label}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={[styles.weekCompare, { borderTopColor: colors.border }]}>
                                <Text style={[styles.compareText, { color: colors.textSecondary }]}>Previous week</Text>
                                <Text style={[styles.compareValue, { color: colors.text }]}>{formatVolume(previousWeekVolume, user?.unit_system)}</Text>
                            </View>
                        </Card>

                        <Card style={{ ...styles.sectionCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Muscle balance</Text>
                                <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>sets this week</Text>
                            </View>
                            {insight.topMuscles.length === 0 ? (
                                <Text style={[styles.noData, { color: colors.textTertiary }]}>Complete sets to see muscle distribution.</Text>
                            ) : (
                                insight.topMuscles.map((muscle) => (
                                    <View key={muscle.muscle} style={styles.muscleRow}>
                                        <Text style={[styles.muscleName, { color: colors.text }]}>{formatMuscle(muscle.muscle)}</Text>
                                        <View style={[styles.muscleBarTrack, { backgroundColor: colors.background }]}>
                                            <View style={[styles.muscleBarFill, { width: `${(muscle.sets / maxMuscleSets) * 100}%`, backgroundColor: colors.primary }]} />
                                        </View>
                                        <Text style={[styles.muscleSets, { color: colors.textSecondary }]}>{muscle.sets}</Text>
                                    </View>
                                ))
                            )}
                        </Card>

                        <Card style={{ ...styles.sectionCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Next-session targets</Text>
                                <Ionicons name="sparkles" size={18} color={colors.primary} />
                            </View>
                            {progression.length === 0 ? (
                                <Text style={[styles.noData, { color: colors.textTertiary }]}>
                                    Log the same movement twice to unlock auto-progression suggestions.
                                </Text>
                            ) : (
                                progression.map((item) => (
                                    <View key={`${item.exerciseId}-${item.type}`} style={[styles.targetRow, { borderTopColor: colors.border }]}>
                                        <View style={styles.targetCopy}>
                                            <Text style={[styles.targetName, { color: colors.text }]}>{item.exerciseName}</Text>
                                            <Text style={[styles.targetReason, { color: colors.textSecondary }]}>
                                                {formatProgressionTarget(item, user?.unit_system)}
                                            </Text>
                                        </View>
                                        <View style={[styles.targetBadge, { backgroundColor: colors.primary + '18' }]}>
                                            <Text style={[styles.targetBadgeText, { color: colors.primary }]}>
                                                {item.type === 'weight_increase' ? 'Load' : item.type === 'rep_increase' ? 'Reps' : item.type === 'deload' ? 'Ease' : 'Hold'}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </Card>

                        <Card style={{ ...styles.sectionCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Split guidance</Text>
                                <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>{splitAnalysis.currentSplit}</Text>
                            </View>
                            <Text style={[styles.splitReason, { color: colors.textSecondary }]}>{splitAnalysis.reason}</Text>
                            <View style={styles.planList}>
                                {splitAnalysis.weeklyPlan.slice(0, 5).map((day) => (
                                    <View key={day.day} style={[styles.planRow, { backgroundColor: colors.background }]}>
                                        <Text style={[styles.planDay, { color: colors.primary }]}>{day.day}</Text>
                                        <Text style={[styles.planFocus, { color: colors.text }]}>{day.focus}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function MetricPill({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.metricPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function InsightStat({ icon, label, value, color, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    content: { flex: 1, paddingHorizontal: Spacing.md },
    emptyState: { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.md },
    emptyIcon: {
        width: 84,
        height: 84,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, textAlign: 'center' },
    emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.lg },
    heroCard: { marginBottom: Spacing.md, borderWidth: 1 },
    heroTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
    heroCopy: { flex: 1 },
    eyebrow: { fontSize: FontSize.xs, fontWeight: FontWeight.heavy, letterSpacing: 0 },
    heroTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, marginTop: Spacing.xs, lineHeight: 32 },
    heroBody: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
    scoreOrb: {
        width: 88,
        height: 88,
        borderRadius: BorderRadius.full,
        borderWidth: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy },
    scoreLabel: { fontSize: FontSize.xs, marginTop: -2 },
    heroMetrics: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    metricPill: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md },
    metricValue: { fontSize: FontSize.md, fontWeight: FontWeight.heavy },
    metricLabel: { fontSize: FontSize.xs, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: {
        width: '48.5%',
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy },
    statLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    alertCard: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md, borderWidth: 1 },
    alertText: { flex: 1 },
    alertTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    alertReason: { fontSize: FontSize.sm, marginTop: 3, lineHeight: 19 },
    alertSuggestion: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
    sectionCard: { marginBottom: Spacing.md, borderWidth: 1 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.heavy },
    sectionHint: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    chartRow: { height: 132, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm },
    dayColumn: { flex: 1, alignItems: 'center', gap: Spacing.sm },
    dayBarTrack: { width: '100%', height: 104, borderRadius: BorderRadius.full, justifyContent: 'flex-end', overflow: 'hidden' },
    dayBarFill: { width: '100%', borderRadius: BorderRadius.full },
    dayLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    weekCompare: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.md },
    compareText: { fontSize: FontSize.sm },
    compareValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    muscleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    muscleName: { width: 92, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    muscleBarTrack: { flex: 1, height: 10, borderRadius: BorderRadius.full, overflow: 'hidden' },
    muscleBarFill: { height: '100%', borderRadius: BorderRadius.full },
    muscleSets: { width: 28, textAlign: 'right', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    noData: { fontSize: FontSize.sm, lineHeight: 20 },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.md },
    targetCopy: { flex: 1 },
    targetName: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    targetReason: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 3 },
    targetBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full },
    targetBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.heavy },
    splitReason: { fontSize: FontSize.sm, lineHeight: 20 },
    planList: { gap: Spacing.sm, marginTop: Spacing.md },
    planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: BorderRadius.md, padding: Spacing.md },
    planDay: { fontSize: FontSize.sm, fontWeight: FontWeight.heavy },
    planFocus: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
