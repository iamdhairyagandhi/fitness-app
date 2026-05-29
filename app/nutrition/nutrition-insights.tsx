/**
 * Nutrition Insights — Phase C #20, #21, #22
 *
 * Adaptive Calorie Targets + Metabolic Adaptation Detection + Gut Health Score
 */

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
    calculateAdaptiveCalories,
    calculateGutHealthScore,
    detectMetabolicAdaptation,
} from '@/lib/nutritionIntelligence';
import { getLocalDateKey } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import type { AdaptiveCalorieData, GutHealthScore, MetabolicAdaptation, WeightLog } from '@/types';
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

type Tab = 'calories' | 'adaptation' | 'gut';

export default function NutritionInsightsScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { todaySummary, nutritionHistory } = useNutritionStore();
    const weightEntries = useProgressStore((s) => s.weightEntries);

    const [tab, setTab] = useState<Tab>('calories');

    const calorieTarget = user?.daily_calorie_target ?? 2200;
    const goal = user?.goal ?? 'maintain';

    const weightLogs = useMemo<WeightLog[]>(() => weightEntries
        .map((entry) => ({
            date: getLocalDateKey(new Date(entry.logged_at)),
            weight_kg: entry.weight_kg,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)), [weightEntries]);

    const calorieHistory = useMemo(() => {
        const byDate = new Map(nutritionHistory.map((summary) => [summary.date, summary.total_calories]));
        byDate.set(todaySummary.date, todaySummary.total_calories);
        return Array.from(byDate.entries())
            .map(([date, calories]) => ({ date, calories }))
            .filter((entry) => entry.calories > 0)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [nutritionHistory, todaySummary]);

    const adaptiveData = useMemo<AdaptiveCalorieData>(
        () => calculateAdaptiveCalories(weightLogs, calorieHistory, calorieTarget, goal),
        [weightLogs, calorieHistory, calorieTarget, goal]
    );

    const metabolicData = useMemo<MetabolicAdaptation>(
        () => detectMetabolicAdaptation(weightLogs, calorieHistory, calorieTarget, goal),
        [weightLogs, calorieHistory, calorieTarget, goal]
    );

    // Collect all food logs from today for gut health
    const allFoodLogs = useMemo(() => {
        return Object.values(todaySummary.meals).flat();
    }, [todaySummary]);

    const gutHealth = useMemo<GutHealthScore>(
        () => calculateGutHealthScore(allFoodLogs),
        [allFoodLogs]
    );

    const TABS: { key: Tab; label: string; icon: string }[] = [
        { key: 'calories', label: 'Adaptive Cal', icon: 'trending-up' },
        { key: 'adaptation', label: 'Metabolism', icon: 'pulse' },
        { key: 'gut', label: 'Gut Health', icon: 'leaf' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Nutrition Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Ionicons
                            name={t.icon as any}
                            size={16}
                            color={tab === t.key ? Colors.primary : Colors.textTertiary}
                        />
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {tab === 'calories' && <AdaptiveCaloriesTab data={adaptiveData} currentTarget={calorieTarget} />}
                {tab === 'adaptation' && <MetabolicTab data={metabolicData} />}
                {tab === 'gut' && <GutHealthTab data={gutHealth} />}
            </ScrollView>
        </View>
    );
}

// ── Adaptive Calories Tab ────────────────────────────────────

function AdaptiveCaloriesTab({ data, currentTarget }: { data: AdaptiveCalorieData; currentTarget: number }) {
    return (
        <View style={styles.tabContent}>
            {/* TDEE Estimate */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="flame" size={20} color={Colors.calories} />
                    <Text style={styles.cardTitle}>Estimated TDEE</Text>
                </View>
                <Text style={styles.bigNumber}>{data.currentTDEE}</Text>
                <Text style={styles.bigNumberLabel}>kcal / day</Text>
                <View style={styles.confidenceBar}>
                    <View style={[styles.confidenceFill, { width: `${data.tdeeConfidence}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{data.tdeeConfidence}% confidence (more data = better accuracy)</Text>
            </View>

            {/* Adjustment */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="trending-up" size={20} color={data.adjustment >= 0 ? Colors.success : Colors.accent} />
                    <Text style={styles.cardTitle}>Calorie Adjustment</Text>
                </View>
                <View style={styles.adjustRow}>
                    <View style={styles.adjustItem}>
                        <Text style={styles.adjustLabel}>Current Target</Text>
                        <Text style={styles.adjustValue}>{currentTarget}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} />
                    <View style={styles.adjustItem}>
                        <Text style={styles.adjustLabel}>Suggested</Text>
                        <Text style={[styles.adjustValue, { color: Colors.primary }]}>{data.adjustedCalories}</Text>
                    </View>
                </View>
                <View style={styles.adjustmentBadge}>
                    <Text style={styles.adjustmentBadgeText}>
                        {data.adjustment >= 0 ? '+' : ''}{data.adjustment} kcal
                    </Text>
                </View>
            </View>

            {/* Weight Trend */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="scale" size={20} color={Colors.secondary} />
                    <Text style={styles.cardTitle}>Weight Trend</Text>
                </View>
                <View style={styles.trendRow}>
                    <View style={styles.trendItem}>
                        <Text style={styles.trendLabel}>Weekly change</Text>
                        <Text style={[styles.trendValue, {
                            color: data.weeklyWeightTrend < 0 ? Colors.success : data.weeklyWeightTrend > 0 ? Colors.warning : Colors.text
                        }]}>
                            {data.weeklyWeightTrend > 0 ? '+' : ''}{data.weeklyWeightTrend} kg/wk
                        </Text>
                    </View>
                    <View style={styles.trendItem}>
                        <Text style={styles.trendLabel}>Expected</Text>
                        <Text style={styles.trendValue}>
                            {data.expectedWeeklyChange > 0 ? '+' : ''}{data.expectedWeeklyChange} kg/wk
                        </Text>
                    </View>
                </View>
            </View>

            {/* Reason */}
            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>{data.reason}</Text>
            </View>
        </View>
    );
}

// ── Metabolic Adaptation Tab ─────────────────────────────────

function MetabolicTab({ data }: { data: MetabolicAdaptation }) {
    const severityColors: Record<string, string> = {
        none: Colors.success,
        mild: Colors.warning,
        moderate: Colors.secondary,
        severe: Colors.accent,
    };

    const recommendationIcons: Record<string, string> = {
        continue: 'checkmark-circle',
        refeed: 'restaurant',
        diet_break: 'pause-circle',
        reverse_diet: 'trending-up',
    };

    return (
        <View style={styles.tabContent}>
            {/* Status Card */}
            <View style={[styles.card, data.detected && { borderColor: severityColors[data.severity], borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusDot, { backgroundColor: severityColors[data.severity] }]} />
                    <Text style={styles.cardTitle}>
                        {data.detected ? 'Adaptation Detected' : 'No Adaptation'}
                    </Text>
                </View>
                <Text style={[styles.statusLabel, { color: severityColors[data.severity] }]}>
                    {data.severity.toUpperCase()}
                </Text>
                {data.detected && (
                    <Text style={styles.stallText}>Weight stalled for ~{data.stallWeeks} weeks</Text>
                )}
            </View>

            {/* Metrics */}
            {data.detected && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Analysis</Text>
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{data.stallWeeks}</Text>
                            <Text style={styles.metricLabel}>Stall Weeks</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{data.expectedLoss} kg</Text>
                            <Text style={styles.metricLabel}>Expected Loss</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{data.actualLoss} kg</Text>
                            <Text style={styles.metricLabel}>Actual Loss</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{data.avgDeficit}</Text>
                            <Text style={styles.metricLabel}>Avg Deficit</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Recommendation */}
            <View style={styles.recommendCard}>
                <View style={styles.cardHeader}>
                    <Ionicons
                        name={(recommendationIcons[data.recommendation] ?? 'help-circle') as any}
                        size={24}
                        color={Colors.primary}
                    />
                    <Text style={styles.cardTitle}>Recommendation</Text>
                </View>
                <View style={styles.recommendBadge}>
                    <Text style={styles.recommendBadgeText}>
                        {data.recommendation.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.recommendText}>{data.recommendationText}</Text>
            </View>
        </View>
    );
}

// ── Gut Health Tab ───────────────────────────────────────────

function GutHealthTab({ data }: { data: GutHealthScore }) {
    const getColor = (score: number) => {
        if (score >= 70) return Colors.success;
        if (score >= 40) return Colors.warning;
        return Colors.accent;
    };

    return (
        <View style={styles.tabContent}>
            {/* Overall Score */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Overall Gut Health</Text>
                <View style={styles.scoreCircle}>
                    <Text style={[styles.scoreValue, { color: getColor(data.overall) }]}>{data.overall}</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreBars}>
                    <ScoreBar label="Fiber Diversity" score={data.fiberDiversity} color={Colors.success} />
                    <ScoreBar label="Fermented Foods" score={data.fermentedFoodScore} color={Colors.secondary} />
                    <ScoreBar label="Prebiotics" score={data.prebioticScore} color={Colors.primary} />
                </View>
            </View>

            {/* Food Sources */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Detected Sources</Text>

                {data.uniqueFiberSources.length > 0 && (
                    <View style={styles.sourceSection}>
                        <Text style={styles.sourceLabel}>Fiber ({data.uniqueFiberSources.length} sources)</Text>
                        <View style={styles.chipRow}>
                            {data.uniqueFiberSources.map((f) => (
                                <View key={f} style={[styles.chip, { backgroundColor: Colors.success + '20' }]}>
                                    <Text style={[styles.chipText, { color: Colors.success }]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {data.fermentedFoods.length > 0 && (
                    <View style={styles.sourceSection}>
                        <Text style={styles.sourceLabel}>Fermented ({data.fermentedFoods.length})</Text>
                        <View style={styles.chipRow}>
                            {data.fermentedFoods.map((f) => (
                                <View key={f} style={[styles.chip, { backgroundColor: Colors.secondary + '20' }]}>
                                    <Text style={[styles.chipText, { color: Colors.secondary }]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {data.prebioticFoods.length > 0 && (
                    <View style={styles.sourceSection}>
                        <Text style={styles.sourceLabel}>Prebiotics ({data.prebioticFoods.length})</Text>
                        <View style={styles.chipRow}>
                            {data.prebioticFoods.map((f) => (
                                <View key={f} style={[styles.chip, { backgroundColor: Colors.primary + '20' }]}>
                                    <Text style={[styles.chipText, { color: Colors.primary }]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {data.uniqueFiberSources.length === 0 && data.fermentedFoods.length === 0 && data.prebioticFoods.length === 0 && (
                    <Text style={styles.noSourcesText}>Log more foods to see gut health analysis. The score improves as you eat diverse fiber, fermented, and prebiotic foods throughout the week.</Text>
                )}
            </View>

            {/* Suggestions */}
            {data.suggestions.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Suggestions</Text>
                    {data.suggestions.map((s, i) => (
                        <View key={i} style={styles.suggestionRow}>
                            <Ionicons name="bulb" size={16} color={Colors.secondary} />
                            <Text style={styles.suggestionText}>{s}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
    return (
        <View style={styles.scoreBarContainer}>
            <View style={styles.scoreBarHeader}>
                <Text style={styles.scoreBarLabel}>{label}</Text>
                <Text style={[styles.scoreBarValue, { color }]}>{score}%</Text>
            </View>
            <View style={styles.scoreBarBg}>
                <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    tabBar: {
        flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 4,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    },
    tabActive: { backgroundColor: Colors.surfaceLight },
    tabText: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    tabTextActive: { color: Colors.primary },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    tabContent: { gap: Spacing.md },
    card: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    cardTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    bigNumber: { color: Colors.calories, fontSize: FontSize.hero, fontWeight: FontWeight.heavy, textAlign: 'center' },
    bigNumberLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md },
    confidenceBar: {
        height: 6, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden',
    },
    confidenceFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
    confidenceText: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.xs, textAlign: 'center' },
    adjustRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.md,
    },
    adjustItem: { alignItems: 'center' },
    adjustLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    adjustValue: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.heavy },
    adjustmentBadge: {
        alignSelf: 'center', backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    },
    adjustmentBadgeText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    trendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
    trendItem: { alignItems: 'center' },
    trendLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    trendValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    infoCard: {
        flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    infoText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusLabel: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, textAlign: 'center', marginVertical: Spacing.sm },
    stallText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
    metricItem: {
        flex: 1, minWidth: '40%', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
        padding: Spacing.md, alignItems: 'center',
    },
    metricValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    metricLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    recommendCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.primary + '40',
    },
    recommendBadge: {
        alignSelf: 'flex-start', backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.sm,
    },
    recommendBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    recommendText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    scoreCircle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginVertical: Spacing.md },
    scoreValue: { fontSize: FontSize.hero, fontWeight: FontWeight.heavy },
    scoreMax: { color: Colors.textTertiary, fontSize: FontSize.lg },
    scoreBars: { gap: Spacing.md },
    scoreBarContainer: { gap: Spacing.xs },
    scoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    scoreBarLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
    scoreBarValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    scoreBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden' },
    scoreBarFill: { height: '100%', borderRadius: BorderRadius.full },
    sourceSection: { marginTop: Spacing.md },
    sourceLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
    chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    noSourcesText: { color: Colors.textTertiary, fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 20 },
    suggestionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    suggestionText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
});
