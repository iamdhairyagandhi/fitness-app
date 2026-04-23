import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
    analyzeTrainingSplit,
    analyzeWeeklyVolumes,
    detectDeload,
    generateProgressionSuggestions,
} from '@/lib/workoutIntelligence';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VOLUME_BAR_MAX = 25; // max sets for full bar width

export default function InsightsScreen() {
    const insets = useSafeAreaInsets();
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const personalRecords = useWorkoutStore((s) => s.personalRecords);
    const exercises = useWorkoutStore((s) => s.exercises);
    const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs);
    const experienceLevel = useAuthStore((s) => s.user?.experience_level ?? 'intermediate');

    const splitAnalysis = useMemo(() => analyzeTrainingSplit(recentWorkouts, recoveryLogs, experienceLevel), [recentWorkouts, recoveryLogs, experienceLevel]);
    const weeklyVolume = useMemo(() => analyzeWeeklyVolumes(recentWorkouts), [recentWorkouts]);
    const deload = useMemo(() => detectDeload(recentWorkouts, recoveryLogs), [recentWorkouts, recoveryLogs]);
    const progression = useMemo(
        () => generateProgressionSuggestions(recentWorkouts, exercises),
        [recentWorkouts, exercises],
    );

    const hasData = recentWorkouts.length > 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Training Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {!hasData ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>No workout data yet</Text>
                        <Text style={styles.emptySubtext}>
                            Complete workouts to see training insights, deload recommendations,
                            and auto-progression suggestions
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Deload Alert */}
                        {deload.shouldDeload && (
                            <Card style={styles.deloadCard}>
                                <View style={styles.alertRow}>
                                    <Ionicons name="warning" size={24} color={Colors.warning} />
                                    <View style={styles.alertText}>
                                        <Text style={styles.alertTitle}>Deload Recommended</Text>
                                        <Text style={styles.alertReason}>{deload.reason}</Text>
                                        <Text style={styles.alertSuggestion}>
                                            Reduce volume by {deload.suggestedReduction}%
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.deloadStats}>
                                    <View style={styles.deloadStat}>
                                        <Text style={styles.deloadStatValue}>
                                            {deload.fatigueRatio.toFixed(2)}
                                        </Text>
                                        <Text style={styles.deloadStatLabel}>Fatigue Ratio</Text>
                                    </View>
                                </View>
                            </Card>
                        )}

                        {/* Training Split */}
                        <Card style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="calendar" size={20} color={Colors.primary} />
                                <Text style={styles.sectionTitle}>Training Split</Text>
                            </View>
                            <Text style={styles.splitType}>
                                Current: <Text style={styles.splitBold}>{splitAnalysis.currentSplit}</Text>
                            </Text>
                            <Text style={styles.splitType}>
                                Suggested: <Text style={styles.splitBold}>{splitAnalysis.suggestedSplit}</Text>
                            </Text>
                            <Text style={styles.splitFreq}>{splitAnalysis.reason}</Text>
                            {splitAnalysis.weeklyPlan.length > 0 && (
                                <View style={styles.freqList}>
                                    {splitAnalysis.weeklyPlan.map((day) => (
                                        <View key={day.day} style={styles.freqRow}>
                                            <Text style={styles.freqMuscle}>{day.day}</Text>
                                            <Text style={styles.freqVal}>{day.focus}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {splitAnalysis.recoveryNotes.length > 0 && (
                                <View style={styles.recList}>
                                    {splitAnalysis.recoveryNotes.map((r: string, i: number) => (
                                        <View key={i} style={styles.recRow}>
                                            <Ionicons name="bulb" size={14} color={Colors.accent} />
                                            <Text style={styles.recText}>{r}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </Card>

                        {/* Weekly Volume */}
                        <Card style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="bar-chart" size={20} color={Colors.accent} />
                                <Text style={styles.sectionTitle}>Weekly Volume</Text>
                            </View>
                            {weeklyVolume.length === 0 ? (
                                <Text style={styles.noData}>Not enough data yet</Text>
                            ) : (
                                weeklyVolume.slice(0, 4).map((wv) => (
                                    <View key={wv.weekStart} style={styles.volRow}>
                                        <Text style={styles.volMuscle}>{wv.weekStart.slice(5)}</Text>
                                        <View style={styles.volBarBg}>
                                            <View
                                                style={[
                                                    styles.volBarFill,
                                                    {
                                                        width: `${Math.min(
                                                            (wv.totalSets / VOLUME_BAR_MAX) * 100,
                                                            100,
                                                        )}%`,
                                                        backgroundColor: Colors.primary,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.volSets}>
                                            {wv.totalSets} sets
                                        </Text>
                                    </View>
                                ))
                            )}
                        </Card>

                        {/* Auto-Progression Suggestions */}
                        <Card style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="trending-up" size={20} color={Colors.success} />
                                <Text style={styles.sectionTitle}>Progression Suggestions</Text>
                            </View>
                            {progression.length === 0 ? (
                                <Text style={styles.noData}>
                                    Complete more workouts to get progression advice
                                </Text>
                            ) : (
                                progression.map((p, i) => (
                                    <View key={i} style={styles.progRow}>
                                        <View style={styles.progHeader}>
                                            <Text style={styles.progExercise}>{p.exerciseName}</Text>
                                            <View
                                                style={[
                                                    styles.progBadge,
                                                    {
                                                        backgroundColor:
                                                            p.type === 'weight_increase'
                                                                ? Colors.success + '20'
                                                                : p.type === 'deload'
                                                                    ? Colors.warning + '20'
                                                                    : Colors.primary + '20',
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.progBadgeText,
                                                        {
                                                            color:
                                                                p.type === 'weight_increase'
                                                                    ? Colors.success
                                                                    : p.type === 'deload'
                                                                        ? Colors.warning
                                                                        : Colors.primary,
                                                        },
                                                    ]}
                                                >
                                                    {p.type.replace(/_/g, ' ')}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.progSuggestion}>{p.reason}</Text>
                                        {p.suggestedWeight > 0 && (
                                            <Text style={styles.progWeight}>
                                                → {p.suggestedWeight.toFixed(1)} kg × {p.suggestedReps}
                                            </Text>
                                        )}
                                    </View>
                                ))
                            )}
                        </Card>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
    content: { flex: 1, paddingHorizontal: Spacing.md },
    emptyState: { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.sm },
    emptyText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
    emptySubtext: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: Spacing.lg },
    deloadCard: { marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.warning },
    alertRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    alertText: { flex: 1 },
    alertTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.warning },
    alertReason: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
    alertSuggestion: { fontSize: FontSize.sm, color: Colors.text, marginTop: 4, fontStyle: 'italic' },
    deloadStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    deloadStat: {
        flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
        backgroundColor: Colors.warning + '10', borderRadius: BorderRadius.sm,
    },
    deloadStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.warning },
    deloadStatLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
    sectionCard: { marginBottom: Spacing.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
    splitType: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
    splitBold: { fontWeight: FontWeight.bold, color: Colors.primary },
    splitFreq: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm },
    freqList: { gap: 6 },
    freqRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    freqMuscle: { width: 80, fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'capitalize' },
    freqBarBg: { flex: 1, height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
    freqBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
    freqVal: { width: 36, fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'right' },
    recList: { marginTop: Spacing.sm, gap: 6 },
    recRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
    recText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
    noData: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
    volRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
    volMuscle: { width: 80, fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'capitalize' },
    volBarBg: { flex: 1, height: 8, backgroundColor: Colors.surface, borderRadius: 4, overflow: 'hidden' },
    volBarFill: { height: '100%', borderRadius: 4 },
    volSets: { width: 60, fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'right' },
    progRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
    progHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progExercise: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
    progBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    progBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    progSuggestion: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
    progWeight: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success, marginTop: 2 },
});
