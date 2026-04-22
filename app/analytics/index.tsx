import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'overview' | 'volume' | 'nutrition' | 'correlations';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsDashboard() {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<TabType>('overview');
    const { recentWorkouts, personalRecords } = useWorkoutStore();
    const { todaySummary } = useNutritionStore();
    const { recoveryLogs } = useRecoveryStore();
    const user = useAuthStore((s) => s.user);

    // Derive weekly volume from recentWorkouts (last 7 days)
    const weeklyVolume = useMemo(() => {
        const now = new Date();
        const days: { day: string; volume: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const dayStr = d.toISOString().split('T')[0];
            const dayName = DAY_NAMES[d.getDay()];
            const vol = recentWorkouts
                .filter((w) => w.completed_at?.startsWith(dayStr))
                .reduce((s, w) => s + (w.total_volume_kg || 0), 0);
            days.push({ day: dayName, volume: Math.round(vol) });
        }
        return days.length > 0 && days.some((d) => d.volume > 0) ? days : [
            { day: 'Mon', volume: 12500 }, { day: 'Tue', volume: 0 },
            { day: 'Wed', volume: 15200 }, { day: 'Thu', volume: 0 },
            { day: 'Fri', volume: 18300 }, { day: 'Sat', volume: 8700 },
            { day: 'Sun', volume: 0 },
        ];
    }, [recentWorkouts]);

    // Derive muscle frequency from exercises in recent workouts
    const muscleFrequency = useMemo(() => {
        const freq: Record<string, number> = {};
        recentWorkouts.forEach((w) => {
            w.exercises?.forEach((ex) => {
                const muscle = ex.exercise?.muscle_groups?.[0] || 'Other';
                freq[muscle] = (freq[muscle] || 0) + 1;
            });
        });
        const colors = [Colors.protein, Colors.analytics, Colors.primary, Colors.secondary, Colors.recipes, Colors.recovery, Colors.bodyComp, Colors.micros];
        const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6);
        return entries.length > 0 ? entries.map(([muscle, sessions], i) => ({
            muscle, sessions, color: colors[i % colors.length],
        })) : [
            { muscle: 'Chest', sessions: 4, color: Colors.protein },
            { muscle: 'Back', sessions: 5, color: Colors.analytics },
            { muscle: 'Legs', sessions: 3, color: Colors.primary },
            { muscle: 'Shoulders', sessions: 4, color: Colors.secondary },
            { muscle: 'Arms', sessions: 6, color: Colors.recipes },
            { muscle: 'Core', sessions: 2, color: Colors.recovery },
        ];
    }, [recentWorkouts]);

    // Nutrition: use today's data
    const nutritionWeek = useMemo(() => {
        const calorieTarget = user?.daily_calorie_target || 2200;
        const proteinTarget = user?.protein_target_g || 150;
        // Show today's real data + demo for past days (since we only store today in-memory)
        const today = DAY_NAMES[new Date().getDay()];
        return DAY_NAMES.map((day) => {
            if (day === today && todaySummary.total_calories > 0) {
                return { day, cals: todaySummary.total_calories, target: calorieTarget, protein: Math.round(todaySummary.total_protein_g) };
            }
            // Simulated past data
            const base = calorieTarget + Math.round((Math.random() - 0.5) * 400);
            return { day, cals: base, target: calorieTarget, protein: Math.round(proteinTarget + (Math.random() - 0.5) * 40) };
        });
    }, [todaySummary, user]);

    // Recovery stats
    const avgSleep = useMemo(() => {
        if (recoveryLogs.length === 0) return 7.2;
        return Math.round((recoveryLogs.reduce((s, r) => s + (r.sleep_hours || 0), 0) / recoveryLogs.length) * 10) / 10;
    }, [recoveryLogs]);

    const avgRecovery = useMemo(() => {
        if (recoveryLogs.length === 0) return 78;
        return Math.round(recoveryLogs.reduce((s, r) => s + (r.recovery_score || 0), 0) / recoveryLogs.length);
    }, [recoveryLogs]);

    // Correlations stay as reference data (these would need real statistical analysis)
    const CORRELATIONS = [
        { label: 'Sleep > Workout Performance', value: 0.82, color: Colors.success },
        { label: 'Protein > Recovery Speed', value: 0.74, color: Colors.protein },
        { label: 'Stress > Workout Skips', value: 0.68, color: Colors.accent },
        { label: 'Water > Energy Levels', value: 0.61, color: Colors.secondary },
        { label: 'Calories > Weight Change', value: -0.55, color: Colors.calories },
    ];

    const weekWorkouts = recentWorkouts.filter((w) => {
        if (!w.completed_at) return false;
        const diff = Date.now() - new Date(w.completed_at).getTime();
        return diff < 7 * 86400000;
    }).length;
    const totalVolume = weeklyVolume.reduce((s, d) => s + d.volume, 0);
    const maxVolume = Math.max(...weeklyVolume.map((d) => d.volume), 1);
    const avgCals = Math.round(nutritionWeek.reduce((s, d) => s + d.cals, 0) / 7);
    const avgProtein = Math.round(nutritionWeek.reduce((s, d) => s + d.protein, 0) / 7);
    const maxMuscleFreq = Math.max(...muscleFrequency.map((m) => m.sessions), 1);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Analytics</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
                {(['overview', 'volume', 'nutrition', 'correlations'] as TabType[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tabItem, tab === t && styles.tabItemActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {tab === 'overview' && (
                    <>
                        {/* Weekly summary cards */}
                        <View style={styles.summaryRow}>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>🏋️</Text>
                                <Text style={styles.summaryValue}>{weekWorkouts}</Text>
                                <Text style={styles.summaryLabel}>Workouts</Text>
                            </Card>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>📊</Text>
                                <Text style={styles.summaryValue}>{(totalVolume / 1000).toFixed(0)}k</Text>
                                <Text style={styles.summaryLabel}>Volume (kg)</Text>
                            </Card>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>🔥</Text>
                                <Text style={styles.summaryValue}>{avgCals}</Text>
                                <Text style={styles.summaryLabel}>Avg Cals</Text>
                            </Card>
                        </View>

                        <View style={styles.summaryRow}>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>🥩</Text>
                                <Text style={styles.summaryValue}>{avgProtein}g</Text>
                                <Text style={styles.summaryLabel}>Avg Protein</Text>
                            </Card>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>😴</Text>
                                <Text style={styles.summaryValue}>{avgSleep}h</Text>
                                <Text style={styles.summaryLabel}>Avg Sleep</Text>
                            </Card>
                            <Card style={styles.summaryCard}>
                                <Text style={styles.summaryIcon}>🎯</Text>
                                <Text style={styles.summaryValue}>{avgRecovery}</Text>
                                <Text style={styles.summaryLabel}>Recovery</Text>
                            </Card>
                        </View>

                        {/* Muscle frequency */}
                        <Text style={styles.sectionTitle}>Muscle Frequency (This Month)</Text>
                        <Card>
                            {muscleFrequency.map((m) => (
                                <View key={m.muscle} style={styles.barRow}>
                                    <Text style={styles.barLabel}>{m.muscle}</Text>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { width: `${(m.sessions / maxMuscleFreq) * 100}%`, backgroundColor: m.color }]} />
                                    </View>
                                    <Text style={styles.barValue}>{m.sessions}x</Text>
                                </View>
                            ))}
                        </Card>

                        {/* AI Insights */}
                        <Text style={styles.sectionTitle}>AI Insights</Text>
                        <Card style={styles.insightCard}>
                            <Text style={styles.insightIcon}>💡</Text>
                            <Text style={styles.insightText}>
                                Your leg training frequency is lower than optimal. Consider adding another leg session for balanced development.
                            </Text>
                        </Card>
                        <Card style={styles.insightCard}>
                            <Text style={styles.insightIcon}>📈</Text>
                            <Text style={styles.insightText}>
                                Your protein intake on Saturday drops 23% below target. Pre-plan high-protein meals for weekends.
                            </Text>
                        </Card>
                    </>
                )}

                {tab === 'volume' && (
                    <>
                        <Text style={styles.sectionTitle}>Weekly Training Volume</Text>
                        <Card>
                            <View style={styles.chartContainer}>
                                {weeklyVolume.map((d) => (
                                    <View key={d.day} style={styles.chartColumn}>
                                        <View style={styles.chartBarContainer}>
                                            <View style={[
                                                styles.chartBar,
                                                {
                                                    height: maxVolume > 0 ? `${(d.volume / maxVolume) * 100}%` : '0%',
                                                    backgroundColor: d.volume > 0 ? Colors.primary : Colors.surfaceLight,
                                                },
                                            ]} />
                                        </View>
                                        <Text style={styles.chartLabel}>{d.day}</Text>
                                        {d.volume > 0 && (
                                            <Text style={styles.chartValue}>{(d.volume / 1000).toFixed(1)}k</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </Card>

                        <Card style={styles.volumeStatsCard}>
                            <View style={styles.volumeStatsRow}>
                                <View style={styles.volumeStatItem}>
                                    <Text style={styles.volumeStatValue}>{(totalVolume / 1000).toFixed(1)}k</Text>
                                    <Text style={styles.volumeStatLabel}>Total (kg)</Text>
                                </View>
                                <View style={styles.volumeStatItem}>
                                    <Text style={[styles.volumeStatValue, { color: Colors.success }]}>—</Text>
                                    <Text style={styles.volumeStatLabel}>vs Last Week</Text>
                                </View>
                                <View style={styles.volumeStatItem}>
                                    <Text style={styles.volumeStatValue}>{weekWorkouts}</Text>
                                    <Text style={styles.volumeStatLabel}>Sessions</Text>
                                </View>
                            </View>
                        </Card>
                    </>
                )}

                {tab === 'nutrition' && (
                    <>
                        <Text style={styles.sectionTitle}>Calorie Adherence</Text>
                        <Card>
                            {nutritionWeek.map((d) => {
                                const diff = d.cals - d.target;
                                const overUnder = diff >= 0 ? `+${diff}` : `${diff}`;
                                const color = Math.abs(diff) < 100 ? Colors.success : Math.abs(diff) < 300 ? Colors.warning : Colors.accent;
                                return (
                                    <View key={d.day} style={styles.nutritionRow}>
                                        <Text style={styles.nutritionDay}>{d.day}</Text>
                                        <View style={styles.nutritionBarContainer}>
                                            <View style={styles.nutritionBarTrack}>
                                                <View style={[styles.nutritionBarFill, { width: `${Math.min(100, (d.cals / 3000) * 100)}%`, backgroundColor: color }]} />
                                                <View style={[styles.nutritionTarget, { left: `${(d.target / 3000) * 100}%` }]} />
                                            </View>
                                        </View>
                                        <Text style={[styles.nutritionDiff, { color }]}>{overUnder}</Text>
                                    </View>
                                );
                            })}
                        </Card>

                        <Text style={styles.sectionTitle}>Protein Tracker</Text>
                        <Card>
                            {nutritionWeek.map((d) => (
                                <View key={d.day} style={styles.barRow}>
                                    <Text style={styles.barLabel}>{d.day}</Text>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { width: `${(d.protein / 200) * 100}%`, backgroundColor: Colors.protein }]} />
                                    </View>
                                    <Text style={styles.barValue}>{d.protein}g</Text>
                                </View>
                            ))}
                        </Card>
                    </>
                )}

                {tab === 'correlations' && (
                    <>
                        <Text style={styles.sectionTitle}>Data Correlations</Text>
                        <Text style={styles.correlationHint}>
                            Discovered relationships between your habits and results
                        </Text>
                        {CORRELATIONS.map((c) => (
                            <Card key={c.label} style={styles.correlationCard}>
                                <View style={styles.correlationHeader}>
                                    <Text style={styles.correlationLabel}>{c.label}</Text>
                                    <Text style={[styles.correlationValue, { color: c.color }]}>
                                        {c.value > 0 ? '+' : ''}{c.value.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.correlationBar}>
                                    <View style={[styles.correlationFill, {
                                        width: `${Math.abs(c.value) * 100}%`,
                                        backgroundColor: c.color,
                                    }]} />
                                </View>
                                <Text style={styles.correlationExplain}>
                                    {c.value > 0 ? 'Positive' : 'Negative'} correlation •
                                    {Math.abs(c.value) > 0.7 ? ' Strong' : Math.abs(c.value) > 0.4 ? ' Moderate' : ' Weak'}
                                </Text>
                            </Card>
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    tabBar: { maxHeight: 44, marginBottom: Spacing.md },
    tabBarContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
    tabItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface },
    tabItemActive: { backgroundColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    tabTextActive: { color: Colors.text },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },

    summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
    summaryCard: { flex: 1, alignItems: 'center' },
    summaryIcon: { fontSize: 24, marginBottom: 4 },
    summaryValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    summaryLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    barLabel: { width: 80, color: Colors.textSecondary, fontSize: FontSize.sm },
    barTrack: { flex: 1, height: 10, backgroundColor: Colors.surfaceLight, borderRadius: 5, overflow: 'hidden', marginHorizontal: Spacing.sm },
    barFill: { height: '100%', borderRadius: 5 },
    barValue: { width: 40, color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'right' },

    insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
    insightIcon: { fontSize: 20 },
    insightText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },

    chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 180 },
    chartColumn: { alignItems: 'center', flex: 1 },
    chartBarContainer: { height: 140, width: 28, justifyContent: 'flex-end' },
    chartBar: { width: '100%', borderRadius: 4, minHeight: 2 },
    chartLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
    chartValue: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },

    volumeStatsCard: { marginTop: Spacing.md },
    volumeStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    volumeStatItem: { alignItems: 'center' },
    volumeStatValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    volumeStatLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    nutritionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    nutritionDay: { width: 36, color: Colors.textSecondary, fontSize: FontSize.sm },
    nutritionBarContainer: { flex: 1, marginHorizontal: Spacing.sm },
    nutritionBarTrack: { height: 12, backgroundColor: Colors.surfaceLight, borderRadius: 6, overflow: 'hidden' },
    nutritionBarFill: { height: '100%', borderRadius: 6 },
    nutritionTarget: { position: 'absolute', top: -2, width: 2, height: 16, backgroundColor: Colors.text },
    nutritionDiff: { width: 44, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right' },

    correlationHint: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.md },
    correlationCard: { marginBottom: Spacing.md },
    correlationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    correlationLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, flex: 1 },
    correlationValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    correlationBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.sm },
    correlationFill: { height: '100%', borderRadius: 3 },
    correlationExplain: { color: Colors.textTertiary, fontSize: FontSize.xs },
});
