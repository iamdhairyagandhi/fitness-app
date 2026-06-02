import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { generateMealPlan } from '@/lib/aiEngine';
import { requirePremium } from '@/lib/premium';
import { useAuthStore } from '@/stores/authStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import type { AIGeneratedMealPlan } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS_OPTIONS = [1, 3, 5, 7];

export default function AIMealPlanScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const { dietProfile } = useMealPlanStore();

    const [numDays, setNumDays] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AIGeneratedMealPlan | null>(null);
    const [expandedDay, setExpandedDay] = useState<number | null>(0);

    const handleGenerate = async () => {
        if (!requirePremium('ai_meal_plan')) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const plan = await generateMealPlan({
                calorieTarget: user?.daily_calorie_target || 2200,
                proteinTarget: user?.protein_target_g || 150,
                carbsTarget: user?.carbs_target_g || 220,
                fatTarget: user?.fat_target_g || 70,
                dietTemplate: dietProfile?.template,
                allergies: dietProfile?.allergies,
                excludedFoods: dietProfile?.excluded_foods,
                cuisines: dietProfile?.preferred_cuisines,
                numDays,
            });
            setResult(plan);
            setExpandedDay(0);
        } catch {
            setError('Could not generate a meal plan right now. Please try again in a moment.');
        } finally {
            setLoading(false);
        }
    };

    const getMealIcon = (type: string) => {
        switch (type) {
            case 'breakfast': return '🌅';
            case 'lunch': return '☀️';
            case 'dinner': return '🌙';
            case 'snack': return '🍿';
            default: return '🍽️';
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>AI Meal Planner</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {!result ? (
                    <>
                        {/* Macro targets display */}
                        <Card style={styles.targetCard}>
                            <Text style={[styles.targetTitle, { color: colors.text }]}>Your Daily Targets</Text>
                            <View style={styles.targetRow}>
                                <View style={styles.targetItem}>
                                    <Text style={[styles.targetValue, { color: colors.text }]}>{user?.daily_calorie_target || 2200}</Text>
                                    <Text style={[styles.targetLabel, { color: colors.textTertiary }]}>kcal</Text>
                                </View>
                                <View style={styles.targetItem}>
                                    <Text style={[styles.targetValue, { color: colors.protein }]}>{user?.protein_target_g || 150}g</Text>
                                    <Text style={[styles.targetLabel, { color: colors.textTertiary }]}>Protein</Text>
                                </View>
                                <View style={styles.targetItem}>
                                    <Text style={[styles.targetValue, { color: colors.carbs }]}>{user?.carbs_target_g || 220}g</Text>
                                    <Text style={[styles.targetLabel, { color: colors.textTertiary }]}>Carbs</Text>
                                </View>
                                <View style={styles.targetItem}>
                                    <Text style={[styles.targetValue, { color: colors.fat }]}>{user?.fat_target_g || 70}g</Text>
                                    <Text style={[styles.targetLabel, { color: colors.textTertiary }]}>Fat</Text>
                                </View>
                            </View>
                            {dietProfile?.template && dietProfile.template !== 'standard' ? (
                                <Text style={[styles.dietBadge, { color: colors.textSecondary }]}>🏷️ {dietProfile.template.replace('_', ' ')}</Text>
                            ) : null}
                        </Card>

                        {/* Number of days */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Plan Duration</Text>
                        <View style={styles.chipGrid}>
                            {DAYS_OPTIONS.map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        numDays === d && { backgroundColor: colors.surfaceLight, borderColor: colors.primary },
                                    ]}
                                    onPress={() => setNumDays(d)}
                                >
                                    <Text style={[styles.chipText, { color: numDays === d ? colors.primary : colors.textSecondary }]}>
                                        {d} day{d > 1 ? 's' : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Card style={styles.infoCard}>
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                🧠 The AI will create a meal plan that hits your macro targets, respects your
                                diet preferences{dietProfile?.allergies?.length ? ` and avoids your allergens` : ''}.
                            </Text>
                        </Card>

                        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

                        <Button
                            title="Generate Meal Plan"
                            onPress={handleGenerate}
                            loading={loading}
                            size="lg"
                        />
                    </>
                ) : (
                    <>
                        <Card style={styles.resultHeader}>
                            <Text style={[styles.resultName, { color: colors.text }]}>{result.name}</Text>
                            <Text style={[styles.resultMeta, { color: colors.textTertiary }]}>
                                📅 {result.days.length} day{result.days.length > 1 ? 's' : ''} •
                                {' '}{result.days[0]?.meals?.length || 0} meals/day
                            </Text>
                        </Card>

                        {result.days.map((day, di) => (
                            <Card key={di} style={styles.dayCard}>
                                <TouchableOpacity
                                    style={styles.dayHeader}
                                    onPress={() => setExpandedDay(expandedDay === di ? null : di)}
                                >
                                    <Text style={[styles.dayTitle, { color: colors.primary }]}>{day.day}</Text>
                                    <View style={styles.dayStats}>
                                        <Text style={[styles.dayCals, { color: colors.textSecondary }]}>{day.total_calories} kcal</Text>
                                        <Ionicons
                                            name={expandedDay === di ? 'chevron-up' : 'chevron-down'}
                                            size={18}
                                            color={colors.textTertiary}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {expandedDay === di && (
                                    <View style={styles.dayContent}>
                                        {day.meals.map((meal, mi) => (
                                            <View key={mi} style={[styles.mealItem, { borderTopColor: colors.border }]}>
                                                <View style={styles.mealHeader}>
                                                    <Text style={styles.mealIcon}>{getMealIcon(meal.meal_type)}</Text>
                                                    <View style={styles.mealInfo}>
                                                        <Text style={[styles.mealType, { color: colors.textTertiary }]}>{meal.meal_type}</Text>
                                                        <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
                                                    </View>
                                                    <Text style={[styles.mealCals, { color: colors.textSecondary }]}>{meal.calories}</Text>
                                                </View>
                                                <View style={styles.mealMacros}>
                                                    <Text style={[styles.macroChip, { color: colors.protein }]}>
                                                        P: {meal.protein_g}g
                                                    </Text>
                                                    <Text style={[styles.macroChip, { color: colors.carbs }]}>
                                                        C: {meal.carbs_g}g
                                                    </Text>
                                                    <Text style={[styles.macroChip, { color: colors.fat }]}>
                                                        F: {meal.fat_g}g
                                                    </Text>
                                                </View>
                                                {meal.ingredients && meal.ingredients.length > 0 ? (
                                                    <Text style={[styles.ingredients, { color: colors.textTertiary }]}>
                                                        {meal.ingredients.join(', ')}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        ))}
                                        <View style={[styles.dayTotals, { borderTopColor: colors.border }]}>
                                            <Text style={[styles.dayTotalText, { color: colors.textSecondary }]}>
                                                Total: {day.total_calories} kcal |
                                                {' '}{day.total_protein_g}P / {day.total_carbs_g}C / {day.total_fat_g}F
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </Card>
                        ))}

                        <View style={styles.resultActions}>
                            <Button
                                title="Generate Another"
                                onPress={() => setResult(null)}
                                variant="outline"
                                size="md"
                            />
                            <Button
                                title="Chat with Coach"
                                onPress={() => router.push('/chat')}
                                size="md"
                            />
                        </View>
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
    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
        marginTop: Spacing.xl, marginBottom: Spacing.md,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    chipTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
    targetCard: { marginTop: Spacing.md },
    targetTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    targetRow: { flexDirection: 'row', justifyContent: 'space-around' },
    targetItem: { alignItems: 'center' },
    targetValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    targetLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    dietBadge: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.md, textAlign: 'center' },
    infoCard: { marginTop: Spacing.xl, marginBottom: Spacing.xl },
    infoText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
    resultHeader: { marginBottom: Spacing.md },
    resultName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    resultMeta: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.xs },
    dayCard: { marginBottom: Spacing.sm },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayTitle: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    dayStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dayCals: { color: Colors.textSecondary, fontSize: FontSize.sm },
    dayContent: { marginTop: Spacing.md },
    mealItem: {
        paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    mealHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    mealIcon: { fontSize: 20 },
    mealInfo: { flex: 1 },
    mealType: { color: Colors.textTertiary, fontSize: FontSize.xxs, textTransform: 'uppercase', letterSpacing: 0.5 },
    mealName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    mealCals: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    mealMacros: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
    macroChip: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    ingredients: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.xs, fontStyle: 'italic' },
    dayTotals: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
    dayTotalText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textAlign: 'center' },
    resultActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
});
