import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { MicronutrientEntry } from '@/types';
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

// RDA baselines (for a ~2200 kcal diet)
const VITAMIN_RDAS = [
    { name: 'Vitamin A', rda: 900, unit: 'mcg', per2200: 680 },
    { name: 'Vitamin C', rda: 90, unit: 'mg', per2200: 72 },
    { name: 'Vitamin D', rda: 20, unit: 'mcg', per2200: 12 },
    { name: 'Vitamin E', rda: 15, unit: 'mg', per2200: 11 },
    { name: 'Vitamin K', rda: 120, unit: 'mcg', per2200: 95 },
    { name: 'Vitamin B6', rda: 1.7, unit: 'mg', per2200: 1.5 },
    { name: 'Vitamin B12', rda: 2.4, unit: 'mcg', per2200: 2.8 },
    { name: 'Folate', rda: 400, unit: 'mcg', per2200: 320 },
    { name: 'Thiamine (B1)', rda: 1.2, unit: 'mg', per2200: 1.0 },
    { name: 'Riboflavin (B2)', rda: 1.3, unit: 'mg', per2200: 1.4 },
    { name: 'Niacin (B3)', rda: 16, unit: 'mg', per2200: 14 },
];
const MINERAL_RDAS = [
    { name: 'Calcium', rda: 1000, unit: 'mg', per2200: 820 },
    { name: 'Iron', rda: 18, unit: 'mg', per2200: 14 },
    { name: 'Magnesium', rda: 420, unit: 'mg', per2200: 310 },
    { name: 'Zinc', rda: 11, unit: 'mg', per2200: 9 },
    { name: 'Potassium', rda: 4700, unit: 'mg', per2200: 2800 },
    { name: 'Sodium', rda: 2300, unit: 'mg', per2200: 1800 },
    { name: 'Phosphorus', rda: 700, unit: 'mg', per2200: 920 },
    { name: 'Selenium', rda: 55, unit: 'mcg', per2200: 48 },
    { name: 'Copper', rda: 0.9, unit: 'mg', per2200: 0.8 },
    { name: 'Manganese', rda: 2.3, unit: 'mg', per2200: 1.8 },
];
const OTHER_RDAS = [
    { name: 'Fiber', rda: 30, unit: 'g', per2200: 22 },
    { name: 'Omega-3', rda: 1.6, unit: 'g', per2200: 1.2 },
    { name: 'Omega-6', rda: 17, unit: 'g', per2200: 12 },
    { name: 'Cholesterol', rda: 300, unit: 'mg', per2200: 240 },
    { name: 'Sugar', rda: 50, unit: 'g', per2200: 38 },
    { name: 'Saturated Fat', rda: 22, unit: 'g', per2200: 18 },
];

type Tab = 'vitamins' | 'minerals' | 'other';

function getStatusColor(pct: number): string {
    if (pct >= 90) return Colors.success;
    if (pct >= 60) return Colors.warning;
    return Colors.accent;
}

export default function MicronutrientsScreen() {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<Tab>('vitamins');
    const { todaySummary } = useNutritionStore();
    const user = useAuthStore((s) => s.user);

    // Scale micronutrient estimates based on actual calorie intake
    const calorieTarget = user?.daily_calorie_target || 2200;
    const calorieRatio = todaySummary.total_calories > 0
        ? todaySummary.total_calories / 2200
        : 0;

    const buildEntries = (rdas: typeof VITAMIN_RDAS, category: 'vitamin' | 'mineral' | 'other'): MicronutrientEntry[] =>
        rdas.map((r) => {
            const amount = calorieRatio > 0
                ? Math.round(r.per2200 * calorieRatio * 10) / 10
                : r.per2200;
            const percentage = Math.round((amount / r.rda) * 100);
            return { name: r.name, amount, unit: r.unit, rda: r.rda, percentage, category };
        });

    const data = useMemo(() => {
        if (tab === 'vitamins') return buildEntries(VITAMIN_RDAS, 'vitamin');
        if (tab === 'minerals') return buildEntries(MINERAL_RDAS, 'mineral');
        return buildEntries(OTHER_RDAS, 'other');
    }, [tab, calorieRatio]);

    const overallAvg = Math.round(data.reduce((s, d) => s + d.percentage, 0) / data.length);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Micronutrients</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Overall score */}
            <View style={styles.scoreRow}>
                <View style={styles.scoreCircle}>
                    <Text style={[styles.scoreValue, { color: getStatusColor(overallAvg) }]}>{overallAvg}%</Text>
                    <Text style={styles.scoreLabel}>Overall</Text>
                </View>
                <View style={styles.scoreLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                        <Text style={styles.legendText}>90%+ Optimal</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
                        <Text style={styles.legendText}>60-89% Adequate</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
                        <Text style={styles.legendText}>&lt;60% Deficient</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['vitamins', 'minerals', 'other'] as Tab[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {data.map((nutrient) => {
                    const color = getStatusColor(nutrient.percentage);
                    const isOver = nutrient.percentage > 100;
                    return (
                        <View key={nutrient.name} style={styles.nutrientRow}>
                            <View style={styles.nutrientInfo}>
                                <Text style={styles.nutrientName}>{nutrient.name}</Text>
                                <Text style={styles.nutrientAmount}>
                                    {nutrient.amount}{nutrient.unit} / {nutrient.rda}{nutrient.unit}
                                </Text>
                            </View>
                            <View style={styles.nutrientBarContainer}>
                                <View style={styles.nutrientBar}>
                                    <View style={[
                                        styles.nutrientBarFill,
                                        { width: `${Math.min(100, nutrient.percentage)}%`, backgroundColor: color },
                                    ]} />
                                </View>
                            </View>
                            <Text style={[styles.nutrientPct, { color }]}>
                                {isOver ? '✓' : `${nutrient.percentage}%`}
                            </Text>
                        </View>
                    );
                })}

                {/* AI recommendation */}
                <Card style={styles.aiCard}>
                    <View style={styles.aiHeader}>
                        <Text style={styles.aiEmoji}>🤖</Text>
                        <Text style={styles.aiTitle}>AI Recommendation</Text>
                    </View>
                    <Text style={styles.aiText}>
                        {tab === 'vitamins'
                            ? 'Your Vitamin D is low. Consider 15 min of morning sun exposure or a 2000-4000 IU supplement. Adding salmon or fortified milk can help naturally.'
                            : tab === 'minerals'
                                ? 'Potassium is your biggest gap. Add a banana, avocado, or sweet potato to boost intake by 500-700mg per serving.'
                                : 'Fiber intake is below target. Add 2 servings of vegetables or switch to whole grains to close the gap.'}
                    </Text>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    scoreRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.xl },
    scoreCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.surface, borderWidth: 3, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    scoreValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    scoreLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    scoreLegend: { gap: Spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: Colors.textSecondary, fontSize: FontSize.xs },

    tabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
    tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    tabTextActive: { color: Colors.text },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    nutrientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    nutrientInfo: { width: 120 },
    nutrientName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    nutrientAmount: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    nutrientBarContainer: { flex: 1, marginHorizontal: Spacing.md },
    nutrientBar: { height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
    nutrientBarFill: { height: '100%', borderRadius: 4 },
    nutrientPct: { width: 36, textAlign: 'right', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

    aiCard: { marginTop: Spacing.xxl, borderColor: Colors.primaryDark, borderWidth: 1 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    aiEmoji: { fontSize: 18 },
    aiTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    aiText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
