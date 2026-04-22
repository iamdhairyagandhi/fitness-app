import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { analyzeCorrelations, generateWeeklyReport } from '@/lib/aiEngine';
import { fetchWeeklyReports, saveWeeklyReport } from '@/lib/chatDb';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { CorrelationInsight } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportData {
    summary: string;
    recommendations: string[];
    highlights: string[];
    correlations: CorrelationInsight[];
    stats: {
        workouts: number;
        totalVolume: number;
        avgCalories: number;
        avgProtein: number;
        weightChange: number;
        newPRs: number;
        streak: number;
        recoveryAvg: number;
    };
    weekStart: string;
    weekEnd: string;
}

function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

export default function WeeklyReportScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const personalRecords = useWorkoutStore((s) => s.personalRecords);
    const { recoveryLogs } = useRecoveryStore();
    const { weightEntries } = useProgressStore();

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pastReports, setPastReports] = useState<any[]>([]);
    const [showPast, setShowPast] = useState(false);

    const week = getWeekRange();

    const loadPastReports = useCallback(async () => {
        if (!user?.id) return;
        const reports = await fetchWeeklyReports(user.id, 5);
        setPastReports(reports);
    }, [user?.id]);

    useEffect(() => {
        loadPastReports();
    }, [loadPastReports]);

    const generateReport = async () => {
        setLoading(true);
        setError('');
        try {
            // Gather this week's data
            const weekWorkouts = recentWorkouts.filter((w) =>
                w.started_at >= week.start && w.completed_at,
            );
            const totalVolume = weekWorkouts.reduce((s, w) => s + w.total_volume_kg, 0);
            const weekRecovery = recoveryLogs.filter((r) => r.date >= week.start);
            const recoveryAvg = weekRecovery.length
                ? weekRecovery.reduce((s, r) => s + r.recovery_score, 0) / weekRecovery.length
                : 0;

            // Weight change
            const recentWeights = weightEntries
                .filter((w) => w.logged_at >= week.start)
                .sort((a, b) => a.logged_at.localeCompare(b.logged_at));
            const weightChange = recentWeights.length >= 2
                ? recentWeights[recentWeights.length - 1].weight_kg - recentWeights[0].weight_kg
                : 0;

            // PRs this week
            const weekPRs = personalRecords.filter((pr) => pr.achieved_at >= week.start);

            // Also compute correlations locally
            const correlations = analyzeCorrelations(recentWorkouts, recoveryLogs);

            // Generate AI report
            const aiResult = await generateWeeklyReport({
                workouts: weekWorkouts,
                avgCalories: user?.daily_calorie_target || 2000, // approximate
                avgProtein: user?.protein_target_g || 150,
                weightChange,
                newPRs: weekPRs.length,
                streakDays: user?.streak_count || 0,
                recoveryAvg,
                recoveryLogs: weekRecovery,
                goal: user?.goal || 'maintain',
                experience: user?.experience_level || 'intermediate',
            });

            const reportData: ReportData = {
                summary: aiResult.summary,
                recommendations: aiResult.recommendations,
                highlights: aiResult.highlights,
                correlations: [...aiResult.correlations, ...correlations],
                stats: {
                    workouts: weekWorkouts.length,
                    totalVolume,
                    avgCalories: user?.daily_calorie_target || 0,
                    avgProtein: user?.protein_target_g || 0,
                    weightChange,
                    newPRs: weekPRs.length,
                    streak: user?.streak_count || 0,
                    recoveryAvg,
                },
                weekStart: week.start,
                weekEnd: week.end,
            };

            setReport(reportData);

            // Persist
            if (user?.id) {
                saveWeeklyReport({
                    user_id: user.id,
                    week_start: week.start,
                    week_end: week.end,
                    workouts_completed: weekWorkouts.length,
                    total_volume_kg: totalVolume,
                    avg_calories: user.daily_calorie_target || 0,
                    avg_protein_g: user.protein_target_g || 0,
                    weight_change_kg: weightChange,
                    new_prs: weekPRs.length,
                    streak_days: user.streak_count || 0,
                    recovery_avg: recoveryAvg,
                    ai_summary: aiResult.summary,
                    ai_recommendations: aiResult.recommendations,
                    highlights: aiResult.highlights,
                    correlation_insights: reportData.correlations,
                }).catch(() => { });
            }
        } catch (e: any) {
            setError(e.message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const getCorrelationColor = (corr: number) => {
        if (corr > 0.3) return Colors.success;
        if (corr < -0.3) return Colors.error;
        return Colors.textTertiary;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>📊 Weekly Report</Text>
                <TouchableOpacity onPress={() => setShowPast(!showPast)}>
                    <Ionicons name="time-outline" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Past reports list */}
                {showPast && pastReports.length > 0 && (
                    <Card style={styles.pastCard}>
                        <Text style={styles.pastTitle}>Previous Reports</Text>
                        {pastReports.map((r: any) => (
                            <TouchableOpacity key={r.id} style={styles.pastItem}>
                                <Text style={styles.pastDate}>{r.week_start} → {r.week_end}</Text>
                                <Text style={styles.pastStats}>
                                    {r.workouts_completed} workouts • {Math.round(r.total_volume_kg)}kg
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Card>
                )}

                {!report ? (
                    <>
                        <Card style={styles.weekCard}>
                            <Text style={styles.weekLabel}>This Week</Text>
                            <Text style={styles.weekDates}>{week.start} → {week.end}</Text>
                        </Card>

                        {/* Quick stats */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {recentWorkouts.filter((w) => w.started_at >= week.start).length}
                                </Text>
                                <Text style={styles.statLabel}>Workouts</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{user?.streak_count || 0}</Text>
                                <Text style={styles.statLabel}>Streak</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {recoveryLogs.length > 0
                                        ? Math.round(
                                            recoveryLogs
                                                .filter((r) => r.date >= week.start)
                                                .reduce((s, r) => s + r.recovery_score, 0) /
                                            Math.max(recoveryLogs.filter((r) => r.date >= week.start).length, 1),
                                        )
                                        : '—'}
                                </Text>
                                <Text style={styles.statLabel}>Recovery</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {personalRecords.filter((pr) => pr.achieved_at >= week.start).length}
                                </Text>
                                <Text style={styles.statLabel}>PRs</Text>
                            </View>
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <Button
                            title="Generate AI Report"
                            onPress={generateReport}
                            loading={loading}
                            size="lg"
                        />
                    </>
                ) : (
                    <>
                        {/* Stats bar */}
                        <View style={styles.statsGrid}>
                            {[
                                { label: 'Workouts', value: report.stats.workouts },
                                { label: 'Volume', value: `${Math.round(report.stats.totalVolume)}kg` },
                                { label: 'Streak', value: `${report.stats.streak}d` },
                                { label: 'Recovery', value: `${Math.round(report.stats.recoveryAvg)}%` },
                            ].map((s) => (
                                <View key={s.label} style={styles.statBox}>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* AI Summary */}
                        <Card style={styles.summaryCard}>
                            <View style={styles.aiBadgeRow}>
                                <Text style={styles.aiBadge}>✨ AI Summary</Text>
                            </View>
                            <Text style={styles.summaryText}>{report.summary}</Text>
                        </Card>

                        {/* Highlights */}
                        {report.highlights.length > 0 && (
                            <Card style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>🏆 Highlights</Text>
                                {report.highlights.map((h, i) => (
                                    <View key={i} style={styles.listItem}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.listText}>{h}</Text>
                                    </View>
                                ))}
                            </Card>
                        )}

                        {/* Recommendations */}
                        {report.recommendations.length > 0 && (
                            <Card style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>💡 Recommendations</Text>
                                {report.recommendations.map((r, i) => (
                                    <View key={i} style={styles.listItem}>
                                        <Text style={styles.recNum}>{i + 1}.</Text>
                                        <Text style={styles.listText}>{r}</Text>
                                    </View>
                                ))}
                            </Card>
                        )}

                        {/* Correlation Insights */}
                        {report.correlations.length > 0 && (
                            <Card style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>🔗 Patterns & Correlations</Text>
                                {report.correlations.map((c, i) => (
                                    <View key={i} style={styles.corrItem}>
                                        <View style={styles.corrHeader}>
                                            <Text style={styles.corrMetrics}>
                                                {c.metric_a} ↔ {c.metric_b}
                                            </Text>
                                            <View style={[styles.corrBadge, { backgroundColor: getCorrelationColor(c.correlation) + '20' }]}>
                                                <Text style={[styles.corrBadgeText, { color: getCorrelationColor(c.correlation) }]}>
                                                    {c.correlation > 0 ? '+' : ''}{(c.correlation * 100).toFixed(0)}%
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.corrDesc}>{c.description}</Text>
                                        <Text style={styles.corrRec}>→ {c.recommendation}</Text>
                                    </View>
                                ))}
                            </Card>
                        )}

                        <Button
                            title="Regenerate Report"
                            onPress={() => { setReport(null); generateReport(); }}
                            variant="outline"
                            size="md"
                        />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    weekCard: { marginBottom: Spacing.lg, alignItems: 'center' },
    weekLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: 4 },
    weekDates: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    statsGrid: {
        flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg,
    },
    statBox: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md, alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    statLabel: { color: Colors.textTertiary, fontSize: FontSize.xxs, marginTop: 2 },
    error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
    pastCard: { marginBottom: Spacing.lg },
    pastTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    pastItem: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
    pastDate: { color: Colors.text, fontSize: FontSize.sm },
    pastStats: { color: Colors.textTertiary, fontSize: FontSize.xs },
    summaryCard: { marginBottom: Spacing.md },
    aiBadgeRow: { marginBottom: Spacing.sm },
    aiBadge: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    summaryText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 22 },
    sectionCard: { marginBottom: Spacing.md },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    listItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    bullet: { color: Colors.primary, fontSize: FontSize.md },
    recNum: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 20 },
    listText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, flex: 1 },
    corrItem: { marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    corrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    corrMetrics: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    corrBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs },
    corrBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    corrDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xs },
    corrRec: { color: Colors.primary, fontSize: FontSize.sm, fontStyle: 'italic' },
});
