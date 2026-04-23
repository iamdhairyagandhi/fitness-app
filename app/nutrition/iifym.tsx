/**
 * IIFYM (If It Fits Your Macros) Mode — Phase C #24
 *
 * Shows remaining macro budget with AI food suggestions to fill gaps
 */

import { Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { calculateIIFYMBudget } from '@/lib/nutritionIntelligence';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { IIFYMBudget, IIFYMSuggestion, MealType } from '@/types';
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

function MacroBar({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
    const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
    const remaining = Math.max(target - consumed, 0);
    const isOver = consumed > target;

    return (
        <View style={styles.macroBarContainer}>
            <View style={styles.macroBarHeader}>
                <Text style={styles.macroBarLabel}>{label}</Text>
                <Text style={[styles.macroBarValue, isOver && { color: Colors.accent }]}>
                    {Math.round(consumed)} / {Math.round(target)}
                    {!isOver && <Text style={styles.macroBarRemaining}> ({Math.round(remaining)} left)</Text>}
                    {isOver && <Text style={styles.macroBarOver}> (over!)</Text>}
                </Text>
            </View>
            <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: isOver ? Colors.accent : color }]} />
            </View>
        </View>
    );
}

export default function IIFYMScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { todaySummary, logFood } = useNutritionStore();

    const [selectedMeal, setSelectedMeal] = useState<MealType>('snack');

    const target = {
        calories: user?.daily_calorie_target ?? 2200,
        protein_g: user?.protein_target_g ?? 165,
        carbs_g: user?.carbs_target_g ?? 220,
        fat_g: user?.fat_target_g ?? 73,
    };

    const consumed = {
        calories: todaySummary.total_calories,
        protein_g: todaySummary.total_protein_g,
        carbs_g: todaySummary.total_carbs_g,
        fat_g: todaySummary.total_fat_g,
    };

    const budget = useMemo<IIFYMBudget>(
        () => calculateIIFYMBudget(consumed, target),
        [consumed.calories, consumed.protein_g, consumed.carbs_g, consumed.fat_g,
        target.calories, target.protein_g, target.carbs_g, target.fat_g]
    );

    // Determine primary need
    const protPct = consumed.protein_g / (target.protein_g || 1);
    const carbPct = consumed.carbs_g / (target.carbs_g || 1);
    const fatPct = consumed.fat_g / (target.fat_g || 1);
    let primaryNeed = 'Balanced';
    if (protPct < carbPct && protPct < fatPct) primaryNeed = 'Protein';
    else if (carbPct < protPct && carbPct < fatPct) primaryNeed = 'Carbs';
    else if (fatPct < protPct && fatPct < carbPct) primaryNeed = 'Fat';

    const handleQuickLog = (suggestion: IIFYMSuggestion) => {
        logFood(
            {
                id: generateId(),
                name: suggestion.name,
                brand: 'IIFYM Suggestion',
                barcode: null,
                serving_size_g: 0,
                serving_unit: 'serving',
                calories: suggestion.calories,
                protein_g: suggestion.protein_g,
                carbs_g: suggestion.carbs_g,
                fat_g: suggestion.fat_g,
                fiber_g: null,
                sugar_g: null,
                sodium_mg: null,
                is_custom: false,
                user_id: null,
                image_url: null,
            },
            suggestion.servings,
            selectedMeal,
        );
        toast.success('Logged!', `${suggestion.name} added to ${selectedMeal}`);
    };

    const calPct = target.calories > 0 ? Math.round((consumed.calories / target.calories) * 100) : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>IIFYM</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Budget Overview */}
                <Card style={styles.budgetCard}>
                    <View style={styles.budgetHeader}>
                        <View>
                            <Text style={styles.budgetCalLabel}>Remaining</Text>
                            <Text style={styles.budgetCalValue}>{budget.remaining.calories}</Text>
                            <Text style={styles.budgetCalUnit}>kcal</Text>
                        </View>
                        <View style={styles.budgetPctCircle}>
                            <Text style={styles.budgetPctText}>{calPct}%</Text>
                            <Text style={styles.budgetPctLabel}>used</Text>
                        </View>
                    </View>

                    <MacroBar label="Protein" consumed={consumed.protein_g} target={target.protein_g} color={Colors.protein} />
                    <MacroBar label="Carbs" consumed={consumed.carbs_g} target={target.carbs_g} color={Colors.carbs} />
                    <MacroBar label="Fat" consumed={consumed.fat_g} target={target.fat_g} color={Colors.fat} />
                </Card>

                {/* Primary Need Badge */}
                <View style={styles.needBadge}>
                    <Ionicons name="nutrition" size={16} color={Colors.secondary} />
                    <Text style={styles.needText}>
                        Primary need: <Text style={styles.needHighlight}>{primaryNeed}</Text>
                        {primaryNeed === 'Protein' && ` — ${Math.round(budget.remaining.protein_g)}g to go`}
                        {primaryNeed === 'Carbs' && ` — ${Math.round(budget.remaining.carbs_g)}g to go`}
                        {primaryNeed === 'Fat' && ` — ${Math.round(budget.remaining.fat_g)}g to go`}
                    </Text>
                </View>

                {/* Meal Selector for Quick Log */}
                <View style={styles.mealRow}>
                    <Text style={styles.sectionTitle}>Log to:</Text>
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.mealChip, selectedMeal === m && styles.mealChipActive]}
                            onPress={() => setSelectedMeal(m)}
                        >
                            <Text style={[styles.mealLabel, selectedMeal === m && styles.mealLabelActive]}>
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Suggestions */}
                <Text style={styles.sectionTitle}>Suggestions to fill your macros</Text>

                {budget.remaining.calories <= 0 ? (
                    <View style={styles.fullBanner}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                        <Text style={styles.fullText}>You've hit your calorie target for today!</Text>
                    </View>
                ) : (
                    budget.suggestions.map((s, i) => (
                        <View key={i} style={styles.suggestionCard}>
                            <View style={styles.suggestionInfo}>
                                <Text style={styles.suggestionName}>{s.name}</Text>
                                <Text style={styles.suggestionReason}>{s.reason}</Text>
                                <View style={styles.suggestionMacros}>
                                    <Text style={[styles.macroChip, { color: Colors.calories }]}>{s.calories} kcal</Text>
                                    <Text style={[styles.macroChip, { color: Colors.protein }]}>P {s.protein_g}g</Text>
                                    <Text style={[styles.macroChip, { color: Colors.carbs }]}>C {s.carbs_g}g</Text>
                                    <Text style={[styles.macroChip, { color: Colors.fat }]}>F {s.fat_g}g</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.quickLogBtn} onPress={() => handleQuickLog(s)}>
                                <Ionicons name="add-circle" size={28} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                {/* Manual Search Link */}
                <TouchableOpacity
                    style={styles.searchLink}
                    onPress={() => router.push(`/nutrition/food-search?meal=${selectedMeal}`)}
                >
                    <Ionicons name="search" size={18} color={Colors.primary} />
                    <Text style={styles.searchLinkText}>Search for specific food</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    budgetCard: { marginBottom: Spacing.lg },
    budgetHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    budgetCalLabel: { color: Colors.textTertiary, fontSize: FontSize.sm },
    budgetCalValue: { color: Colors.text, fontSize: FontSize.xxxl, fontWeight: FontWeight.heavy },
    budgetCalUnit: { color: Colors.textTertiary, fontSize: FontSize.md },
    budgetPctCircle: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
    },
    budgetPctText: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    budgetPctLabel: { color: Colors.textTertiary, fontSize: FontSize.xxs },

    macroBarContainer: { marginBottom: Spacing.md },
    macroBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    macroBarLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    macroBarValue: { color: Colors.textSecondary, fontSize: FontSize.sm },
    macroBarRemaining: { color: Colors.textTertiary },
    macroBarOver: { color: Colors.accent },
    macroBarBg: {
        height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4,
        overflow: 'hidden',
    },
    macroBarFill: { height: '100%', borderRadius: 4 },

    needBadge: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.sm,
        padding: Spacing.md, marginBottom: Spacing.lg,
    },
    needText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
    needHighlight: { color: Colors.secondary, fontWeight: FontWeight.bold },

    mealRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold,
        marginBottom: Spacing.md,
    },
    mealChip: {
        paddingHorizontal: Spacing.md, paddingVertical: 6,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    mealChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    mealLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
    mealLabelActive: { color: Colors.primary },

    fullBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.success + '15', borderRadius: BorderRadius.md,
        padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    fullText: { color: Colors.success, fontSize: FontSize.md, fontWeight: FontWeight.medium },

    suggestionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
    },
    suggestionInfo: { flex: 1 },
    suggestionName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    suggestionReason: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    suggestionMacros: { flexDirection: 'row', gap: Spacing.md, marginTop: 6 },
    macroChip: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    quickLogBtn: { paddingLeft: Spacing.md },

    searchLink: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.md,
    },
    searchLinkText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
