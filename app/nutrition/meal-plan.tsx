import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Card, Button } from '@/components/ui';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useAuthStore } from '@/stores/authStore';
import { generateId } from '@/lib/utils';
import type { MealPlan, MealPlanDay, MealPlanItem, MacroCycleDay } from '@/types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Demo meal suggestions to auto-fill
const DEMO_MEALS: Record<string, MealPlanItem[]> = {
    breakfast: [
        { recipe_id: 'r1', food_item_id: null, name: 'Protein Overnight Oats', servings: 1, calories: 420, protein_g: 35, carbs_g: 48, fat_g: 10 },
        { recipe_id: 'r8', food_item_id: null, name: 'Banana Protein Pancakes', servings: 1, calories: 340, protein_g: 30, carbs_g: 38, fat_g: 8 },
        { recipe_id: 'r6', food_item_id: null, name: 'Egg White Veggie Omelette', servings: 1, calories: 220, protein_g: 28, carbs_g: 8, fat_g: 8 },
    ],
    lunch: [
        { recipe_id: 'r3', food_item_id: null, name: 'Greek Protein Bowl', servings: 1, calories: 480, protein_g: 42, carbs_g: 35, fat_g: 18 },
        { recipe_id: 'r7', food_item_id: null, name: 'Turkey Taco Lettuce Wraps', servings: 1, calories: 310, protein_g: 32, carbs_g: 12, fat_g: 14 },
    ],
    dinner: [
        { recipe_id: 'r2', food_item_id: null, name: 'Chicken Stir Fry', servings: 1, calories: 380, protein_g: 38, carbs_g: 20, fat_g: 14 },
        { recipe_id: 'r4', food_item_id: null, name: 'Salmon with Sweet Potato', servings: 1, calories: 520, protein_g: 36, carbs_g: 42, fat_g: 20 },
        { recipe_id: 'r5', food_item_id: null, name: 'Vegan Lentil Curry', servings: 1, calories: 350, protein_g: 18, carbs_g: 50, fat_g: 8 },
    ],
    snack: [
        { recipe_id: null, food_item_id: null, name: 'Greek Yogurt + Berries', servings: 1, calories: 160, protein_g: 15, carbs_g: 18, fat_g: 3 },
        { recipe_id: null, food_item_id: null, name: 'Protein Shake', servings: 1, calories: 150, protein_g: 25, carbs_g: 5, fat_g: 2 },
    ],
};

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildDay(date: string, dayType: MacroCycleDay): MealPlanDay {
    const b = pickRandom(DEMO_MEALS.breakfast);
    const l = pickRandom(DEMO_MEALS.lunch);
    const d = pickRandom(DEMO_MEALS.dinner);
    const s = pickRandom(DEMO_MEALS.snack);
    const all = [b, l, d, s];
    return {
        date,
        day_type: dayType,
        meals: { breakfast: [b], lunch: [l], dinner: [d], snack: [s] },
        total_calories: all.reduce((t, m) => t + m.calories, 0),
        total_protein_g: all.reduce((t, m) => t + m.protein_g, 0),
        total_carbs_g: all.reduce((t, m) => t + m.carbs_g, 0),
        total_fat_g: all.reduce((t, m) => t + m.fat_g, 0),
    };
}

export default function MealPlanScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { activeMealPlan, mealPlans, addMealPlan, setActiveMealPlan, dietProfile } = useMealPlanStore();
    const [selectedDay, setSelectedDay] = useState(0);

    const calTarget = user?.daily_calorie_target || 2200;

    const handleGenerate = () => {
        const now = new Date();
        const days: MealPlanDay[] = [];
        const pattern = dietProfile.macro_cycle_enabled
            ? dietProfile.macro_cycle_pattern
            : ['moderate', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate'] as MacroCycleDay[];

        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getTime() + i * 86400000);
            days.push(buildDay(d.toISOString().split('T')[0], pattern[i % pattern.length]));
        }

        const plan: MealPlan = {
            id: generateId(),
            user_id: '',
            name: `Week of ${now.toLocaleDateString()}`,
            start_date: now.toISOString().split('T')[0],
            end_date: new Date(now.getTime() + 6 * 86400000).toISOString().split('T')[0],
            days,
            created_at: now.toISOString(),
            source: 'ai_generated',
        };

        addMealPlan(plan);
        setActiveMealPlan(plan);
        Alert.alert('Plan Created!', '7-day meal plan generated from your recipes.');
    };

    const plan = activeMealPlan;
    const dayData = plan?.days[selectedDay];

    const renderMealSlot = (label: string, emoji: string, items: MealPlanItem[]) => (
        <Card key={label} style={styles.mealSlot}>
            <View style={styles.mealSlotHeader}>
                <Text style={styles.mealEmoji}>{emoji}</Text>
                <Text style={styles.mealLabel}>{label}</Text>
                <Text style={styles.mealCals}>
                    {items.reduce((s, i) => s + i.calories, 0)} kcal
                </Text>
            </View>
            {items.map((item, idx) => (
                <View key={idx} style={styles.mealItem}>
                    <Text style={styles.mealItemName}>{item.name}</Text>
                    <Text style={styles.mealItemMacros}>
                        P:{item.protein_g}g  C:{item.carbs_g}g  F:{item.fat_g}g
                    </Text>
                </View>
            ))}
            {items.length === 0 && (
                <TouchableOpacity style={styles.addMealBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addMealText}>Add {label}</Text>
                </TouchableOpacity>
            )}
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Meal Planner</Text>
                <TouchableOpacity onPress={() => router.push('/nutrition/grocery-list')}>
                    <Ionicons name="cart-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {plan ? (
                <>
                    {/* Day selector */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
                        {plan.days.map((day, idx) => {
                            const isActive = idx === selectedDay;
                            const d = new Date(day.date);
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                                    onPress={() => setSelectedDay(idx)}
                                >
                                    <Text style={[styles.dayChipWeekday, isActive && styles.dayChipWeekdayActive]}>
                                        {DAY_NAMES[idx].slice(0, 3)}
                                    </Text>
                                    <Text style={[styles.dayChipDate, isActive && styles.dayChipDateActive]}>
                                        {d.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {dayData && (
                        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                            {/* Day summary */}
                            <Card style={styles.daySummary}>
                                <View style={styles.daySummaryRow}>
                                    <View style={styles.daySumItem}>
                                        <Text style={styles.daySumValue}>{dayData.total_calories}</Text>
                                        <Text style={styles.daySumLabel}>kcal</Text>
                                    </View>
                                    <View style={styles.daySumDivider} />
                                    <View style={styles.daySumItem}>
                                        <Text style={[styles.daySumValue, { color: Colors.protein }]}>{dayData.total_protein_g}g</Text>
                                        <Text style={styles.daySumLabel}>Protein</Text>
                                    </View>
                                    <View style={styles.daySumDivider} />
                                    <View style={styles.daySumItem}>
                                        <Text style={[styles.daySumValue, { color: Colors.carbs }]}>{dayData.total_carbs_g}g</Text>
                                        <Text style={styles.daySumLabel}>Carbs</Text>
                                    </View>
                                    <View style={styles.daySumDivider} />
                                    <View style={styles.daySumItem}>
                                        <Text style={[styles.daySumValue, { color: Colors.fat }]}>{dayData.total_fat_g}g</Text>
                                        <Text style={styles.daySumLabel}>Fat</Text>
                                    </View>
                                </View>
                                {/* Target comparison */}
                                <View style={styles.targetBar}>
                                    <View style={[styles.targetFill, { width: `${Math.min(100, (dayData.total_calories / calTarget) * 100)}%` }]} />
                                </View>
                                <Text style={styles.targetText}>
                                    {dayData.total_calories > calTarget ? `+${dayData.total_calories - calTarget}` : `${calTarget - dayData.total_calories} remaining`} of {calTarget} kcal target
                                </Text>
                            </Card>

                            {/* Meal slots */}
                            {renderMealSlot('Breakfast', '🌅', dayData.meals.breakfast)}
                            {renderMealSlot('Lunch', '☀️', dayData.meals.lunch)}
                            {renderMealSlot('Dinner', '🌙', dayData.meals.dinner)}
                            {renderMealSlot('Snack', '🍿', dayData.meals.snack)}

                            <Button
                                title="Regenerate This Day"
                                variant="outline"
                                onPress={() => {
                                    Alert.alert('Coming Soon', 'AI-powered day regeneration will be available in Phase 3.');
                                }}
                                style={{ marginTop: Spacing.lg }}
                            />
                        </ScrollView>
                    )}
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
                    <Text style={styles.emptySubtext}>
                        Generate a personalized 7-day meal plan based on your diet preferences and calorie targets
                    </Text>
                    <Button
                        title="Generate 7-Day Plan"
                        onPress={handleGenerate}
                        size="lg"
                        style={{ marginTop: Spacing.xxl, width: '100%' }}
                    />

                    {mealPlans.length > 0 && (
                        <View style={styles.pastPlans}>
                            <Text style={styles.pastTitle}>Past Plans</Text>
                            {mealPlans.map((p) => (
                                <TouchableOpacity key={p.id} style={styles.pastPlan} onPress={() => setActiveMealPlan(p)}>
                                    <Text style={styles.pastName}>{p.name}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    dayScroll: { maxHeight: 70, marginBottom: Spacing.md },
    dayScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
    dayChip: { width: 56, height: 64, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
    dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    dayChipWeekday: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    dayChipWeekdayActive: { color: Colors.text },
    dayChipDate: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 2 },
    dayChipDateActive: { color: Colors.text },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    daySummary: { marginBottom: Spacing.md },
    daySummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    daySumItem: { flex: 1, alignItems: 'center' },
    daySumValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    daySumLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    daySumDivider: { width: 1, height: 30, backgroundColor: Colors.border },
    targetBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.md },
    targetFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
    targetText: { color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center', marginTop: 4 },

    mealSlot: { marginBottom: Spacing.md },
    mealSlotHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    mealEmoji: { fontSize: 18, marginRight: Spacing.sm },
    mealLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
    mealCals: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    mealItem: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
    mealItemName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    mealItemMacros: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    addMealBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
    addMealText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    emptyTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.lg },
    emptySubtext: { color: Colors.textTertiary, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },

    pastPlans: { marginTop: Spacing.xxl, width: '100%' },
    pastTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    pastPlan: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    pastName: { color: Colors.textSecondary, fontSize: FontSize.md },
});
