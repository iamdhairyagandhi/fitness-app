import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Card, ProgressRing } from '@/components/ui';
import { useProgressStore } from '@/stores/progressStore';
import { useAuthStore } from '@/stores/authStore';

// Navy BF% formula (circumference method estimate)
function estimateBF(weight_kg: number, waist_cm: number, neck_cm: number, height_cm: number, gender: string): number {
    if (gender === 'female') {
        // Needs hip measurement too — simplified
        return 163.205 * Math.log10(waist_cm - neck_cm) - 97.684 * Math.log10(height_cm) - 78.387;
    }
    return 86.010 * Math.log10(waist_cm - neck_cm) - 70.041 * Math.log10(height_cm) + 36.76;
}

function getFFMI(weight_kg: number, height_cm: number, bf_pct: number): number {
    const fatMass = weight_kg * (bf_pct / 100);
    const leanMass = weight_kg - fatMass;
    const heightM = height_cm / 100;
    return leanMass / (heightM * heightM);
}

function getBFCategory(bf: number, gender: string): { label: string; color: string } {
    if (gender === 'female') {
        if (bf < 14) return { label: 'Essential Fat', color: Colors.error };
        if (bf < 21) return { label: 'Athletic', color: Colors.success };
        if (bf < 25) return { label: 'Fitness', color: Colors.secondaryDark };
        if (bf < 32) return { label: 'Average', color: Colors.warning };
        return { label: 'Above Average', color: Colors.accent };
    }
    if (bf < 6) return { label: 'Essential Fat', color: Colors.error };
    if (bf < 14) return { label: 'Athletic', color: Colors.success };
    if (bf < 18) return { label: 'Fitness', color: Colors.secondaryDark };
    if (bf < 25) return { label: 'Average', color: Colors.warning };
    return { label: 'Above Average', color: Colors.accent };
}

type Tab = 'overview' | 'trends' | 'comparison';

export default function BodyCompositionScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { weightEntries, measurements } = useProgressStore();
    const [tab, setTab] = useState<Tab>('overview');

    const gender = user?.gender || 'male';
    const height_cm = user?.height_cm || 178;
    const latestWeight = weightEntries.length > 0 ? weightEntries[0].weight_kg : user?.weight_kg || 80;

    // Get latest measurements
    const latestMeasurement = measurements.length > 0 ? measurements[0] : null;
    const waist = latestMeasurement?.waist_cm || 84;
    const neck = latestMeasurement?.neck_cm || 38;

    const bf = Math.max(5, Math.min(50, estimateBF(latestWeight, waist, neck, height_cm, gender)));
    const bfRounded = Math.round(bf * 10) / 10;
    const category = getBFCategory(bfRounded, gender);
    const leanMass = latestWeight * (1 - bf / 100);
    const fatMass = latestWeight * (bf / 100);
    const ffmi = getFFMI(latestWeight, height_cm, bf);
    const bmi = latestWeight / Math.pow(height_cm / 100, 2);

    // Simulated historical data
    const weightHistory = weightEntries.length > 0
        ? weightEntries.slice(0, 8).reverse()
        : [
            { weight_kg: 82, logged_at: '2026-03-01' },
            { weight_kg: 81.5, logged_at: '2026-03-08' },
            { weight_kg: 81, logged_at: '2026-03-15' },
            { weight_kg: 80.5, logged_at: '2026-03-22' },
            { weight_kg: 80.2, logged_at: '2026-03-29' },
            { weight_kg: 80, logged_at: '2026-04-05' },
            { weight_kg: 79.8, logged_at: '2026-04-12' },
            { weight_kg: 80, logged_at: '2026-04-19' },
        ];

    const maxW = Math.max(...weightHistory.map((w) => w.weight_kg));
    const minW = Math.min(...weightHistory.map((w) => w.weight_kg));
    const range = maxW - minW || 1;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Body Composition</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['overview', 'trends', 'comparison'] as Tab[]).map((t) => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {tab === 'overview' && (
                    <>
                        {/* Body fat visual */}
                        <Card style={styles.bfCard}>
                            <View style={styles.bfRow}>
                                <ProgressRing
                                    progress={Math.min(100, bfRounded * 2)}
                                    size={120}
                                    strokeWidth={10}
                                    color={category.color}
                                    value={`${bfRounded}%`}
                                    label="Body Fat"
                                />
                                <View style={styles.bfDetails}>
                                    <View style={[styles.categoryBadge, { backgroundColor: category.color + '30' }]}>
                                        <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
                                    </View>
                                    <View style={styles.bfStat}>
                                        <Text style={styles.bfStatLabel}>Lean Mass</Text>
                                        <Text style={styles.bfStatValue}>{leanMass.toFixed(1)} kg</Text>
                                    </View>
                                    <View style={styles.bfStat}>
                                        <Text style={styles.bfStatLabel}>Fat Mass</Text>
                                        <Text style={styles.bfStatValue}>{fatMass.toFixed(1)} kg</Text>
                                    </View>
                                    <View style={styles.bfStat}>
                                        <Text style={styles.bfStatLabel}>Method</Text>
                                        <Text style={styles.bfStatValue}>Navy Formula</Text>
                                    </View>
                                </View>
                            </View>
                        </Card>

                        {/* Key metrics */}
                        <View style={styles.metricsRow}>
                            <Card style={styles.metricCard}>
                                <Text style={styles.metricValue}>{bmi.toFixed(1)}</Text>
                                <Text style={styles.metricLabel}>BMI</Text>
                            </Card>
                            <Card style={styles.metricCard}>
                                <Text style={styles.metricValue}>{ffmi.toFixed(1)}</Text>
                                <Text style={styles.metricLabel}>FFMI</Text>
                            </Card>
                            <Card style={styles.metricCard}>
                                <Text style={styles.metricValue}>{latestWeight.toFixed(1)}</Text>
                                <Text style={styles.metricLabel}>Weight (kg)</Text>
                            </Card>
                        </View>

                        {/* Composition bar */}
                        <Text style={styles.sectionTitle}>Body Composition Split</Text>
                        <Card>
                            <View style={styles.compBar}>
                                <View style={[styles.compSegLean, { flex: 100 - bfRounded }]} />
                                <View style={[styles.compSegFat, { flex: bfRounded }]} />
                            </View>
                            <View style={styles.compLegendRow}>
                                <View style={styles.compLegend}>
                                    <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                                    <Text style={styles.legendText}>Lean {(100 - bfRounded).toFixed(1)}%</Text>
                                </View>
                                <View style={styles.compLegend}>
                                    <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
                                    <Text style={styles.legendText}>Fat {bfRounded}%</Text>
                                </View>
                            </View>
                        </Card>

                        {/* FFMI interpretation */}
                        <Card style={styles.ffmiCard}>
                            <Text style={styles.ffmiTitle}>📊 FFMI Interpretation</Text>
                            <Text style={styles.ffmiText}>
                                {ffmi < 18 ? 'Below average muscularity. Focus on progressive overload and caloric surplus for growth.'
                                : ffmi < 20 ? 'Average muscularity. Consistent training and nutrition will push you higher.'
                                : ffmi < 22 ? 'Above average. Your training is paying off! Keep progressing.'
                                : ffmi < 25 ? 'Excellent muscularity. You\'re in elite natural territory.'
                                : 'Exceptional. You\'ve built an impressive physique.'}
                            </Text>
                            <View style={styles.ffmiScale}>
                                {[16, 18, 20, 22, 25].map((threshold) => (
                                    <View key={threshold} style={[styles.ffmiMark, ffmi >= threshold && styles.ffmiMarkActive]}>
                                        <Text style={[styles.ffmiMarkText, ffmi >= threshold && styles.ffmiMarkTextActive]}>{threshold}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    </>
                )}

                {tab === 'trends' && (
                    <>
                        <Text style={styles.sectionTitle}>Weight Trend</Text>
                        <Card>
                            <View style={styles.chart}>
                                {weightHistory.map((w, idx) => {
                                    const pct = ((w.weight_kg - minW) / range) * 100;
                                    return (
                                        <View key={idx} style={styles.chartCol}>
                                            <View style={styles.chartBarContainer}>
                                                <View style={[styles.chartBar, { height: `${Math.max(10, pct)}%` }]} />
                                            </View>
                                            <Text style={styles.chartLabel}>{w.weight_kg.toFixed(1)}</Text>
                                            <Text style={styles.chartDate}>{new Date(w.logged_at).getDate()}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </Card>

                        <View style={styles.trendStats}>
                            <Card style={styles.trendStat}>
                                <Text style={styles.trendStatLabel}>8-Week Change</Text>
                                <Text style={[styles.trendStatValue, { color: Colors.success }]}>
                                    {(weightHistory[weightHistory.length - 1].weight_kg - weightHistory[0].weight_kg).toFixed(1)} kg
                                </Text>
                            </Card>
                            <Card style={styles.trendStat}>
                                <Text style={styles.trendStatLabel}>Weekly Avg</Text>
                                <Text style={styles.trendStatValue}>
                                    {((weightHistory[weightHistory.length - 1].weight_kg - weightHistory[0].weight_kg) / 8).toFixed(2)} kg/wk
                                </Text>
                            </Card>
                        </View>

                        <Card style={styles.aiCard}>
                            <Text style={styles.aiEmoji}>💡</Text>
                            <Text style={styles.aiText}>
                                Your weight loss rate of ~0.25kg/week is sustainable and optimal for preserving lean mass during a cut. Keep protein at 1.8g/kg to maximize muscle retention.
                            </Text>
                        </Card>
                    </>
                )}

                {tab === 'comparison' && (
                    <>
                        <Text style={styles.sectionTitle}>Your Stats vs Averages</Text>
                        {[
                            { label: 'Body Fat', yours: `${bfRounded}%`, avg: gender === 'male' ? '18-25%' : '25-31%', icon: '🎯' },
                            { label: 'BMI', yours: bmi.toFixed(1), avg: '18.5-24.9', icon: '📏' },
                            { label: 'FFMI', yours: ffmi.toFixed(1), avg: gender === 'male' ? '17-20' : '14-17', icon: '💪' },
                            { label: 'Lean Mass', yours: `${leanMass.toFixed(1)}kg`, avg: gender === 'male' ? '55-70kg' : '38-50kg', icon: '🏗️' },
                            { label: 'Waist', yours: `${waist}cm`, avg: gender === 'male' ? '<94cm' : '<80cm', icon: '📐' },
                        ].map((item) => (
                            <Card key={item.label} style={styles.compCard}>
                                <View style={styles.compRow}>
                                    <Text style={styles.compIcon}>{item.icon}</Text>
                                    <View style={styles.compInfo}>
                                        <Text style={styles.compLabel}>{item.label}</Text>
                                        <View style={styles.compValues}>
                                            <View style={styles.compCol}>
                                                <Text style={styles.compColLabel}>You</Text>
                                                <Text style={styles.compColValue}>{item.yours}</Text>
                                            </View>
                                            <View style={styles.compDivider} />
                                            <View style={styles.compCol}>
                                                <Text style={styles.compColLabel}>Healthy Range</Text>
                                                <Text style={styles.compColValue}>{item.avg}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
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

    tabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
    tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    tabTextActive: { color: Colors.text },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xl, marginBottom: Spacing.md },

    bfCard: {},
    bfRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
    bfDetails: { flex: 1, gap: Spacing.sm },
    categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
    categoryText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    bfStat: { flexDirection: 'row', justifyContent: 'space-between' },
    bfStatLabel: { color: Colors.textTertiary, fontSize: FontSize.sm },
    bfStatValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

    metricsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
    metricCard: { flex: 1, alignItems: 'center' },
    metricValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    metricLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    compBar: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden' },
    compSegLean: { backgroundColor: Colors.primary, height: '100%' },
    compSegFat: { backgroundColor: Colors.accent, height: '100%' },
    compLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.md },
    compLegend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: Colors.textSecondary, fontSize: FontSize.sm },

    ffmiCard: { marginTop: Spacing.md },
    ffmiTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    ffmiText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
    ffmiScale: { flexDirection: 'row', justifyContent: 'space-around' },
    ffmiMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    ffmiMarkActive: { backgroundColor: Colors.primary },
    ffmiMarkText: { color: Colors.textTertiary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    ffmiMarkTextActive: { color: Colors.text },

    chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160 },
    chartCol: { alignItems: 'center', flex: 1 },
    chartBarContainer: { height: 120, width: 20, justifyContent: 'flex-end' },
    chartBar: { width: '100%', borderRadius: 4, backgroundColor: Colors.primary },
    chartLabel: { color: Colors.textSecondary, fontSize: 9, marginTop: 4 },
    chartDate: { color: Colors.textTertiary, fontSize: 9, marginTop: 1 },

    trendStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
    trendStat: { flex: 1 },
    trendStatLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: 4 },
    trendStatValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    aiCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginTop: Spacing.xl, borderColor: Colors.primaryDark, borderWidth: 1 },
    aiEmoji: { fontSize: 20 },
    aiText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 },

    compCard: { marginBottom: Spacing.md },
    compRow: { flexDirection: 'row', alignItems: 'center' },
    compIcon: { fontSize: 24, marginRight: Spacing.md },
    compInfo: { flex: 1 },
    compLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    compValues: { flexDirection: 'row', alignItems: 'center' },
    compCol: { flex: 1 },
    compColLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    compColValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
    compDivider: { width: 1, height: 30, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
});
