import { Card, ProgressRing } from '@/components/ui';
import { WATER_SERVING_ML } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatNumber, getPercentage } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_ICONS: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

export default function NutritionScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const { todaySummary, logWater, removeLogEntry } = useNutritionStore();

    const calorieTarget = user?.daily_calorie_target || 2200;
    const proteinTarget = user?.protein_target_g || 165;
    const carbsTarget = user?.carbs_target_g || 220;
    const fatTarget = user?.fat_target_g || 73;
    const waterTarget = user?.water_goal_ml || 2500;

    const caloriesRemaining = Math.max(calorieTarget - todaySummary.total_calories, 0);
    const calPct = getPercentage(todaySummary.total_calories, calorieTarget);

    const handleAddWater = () => {
        logWater(WATER_SERVING_ML);
    };

    const handleAddFood = (mealType: MealType) => {
        router.push(`/nutrition/food-search?meal=${mealType}`);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Nutrition</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/nutrition/ai-scanner')}>
                            <Ionicons name="camera" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/nutrition/barcode-scanner')}>
                            <Ionicons name="barcode-outline" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Nav */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNav} contentContainerStyle={styles.quickNavContent}>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/nlp-food-log')}>
                        <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
                        <Text style={styles.quickNavText}>Quick Log</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/iifym')}>
                        <Ionicons name="calculator" size={18} color={Colors.secondary} />
                        <Text style={styles.quickNavText}>IIFYM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/receipt-scanner')}>
                        <Ionicons name="receipt" size={18} color={Colors.accent} />
                        <Text style={styles.quickNavText}>Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/meal-photos')}>
                        <Ionicons name="images" size={18} color={Colors.success} />
                        <Text style={styles.quickNavText}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/nutrition-insights')}>
                        <Ionicons name="analytics" size={18} color={Colors.analytics} />
                        <Text style={styles.quickNavText}>Insights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/recipe-adjuster')}>
                        <Ionicons name="color-wand" size={18} color={Colors.fat} />
                        <Text style={styles.quickNavText}>Adjuster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/diet-settings')}>
                        <Ionicons name="options" size={18} color={Colors.primary} />
                        <Text style={styles.quickNavText}>Diet Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/recipes')}>
                        <Ionicons name="book" size={18} color={Colors.recipes} />
                        <Text style={styles.quickNavText}>Recipes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/fasting')}>
                        <Ionicons name="timer" size={18} color={Colors.secondary} />
                        <Text style={styles.quickNavText}>Fasting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/grocery-list')}>
                        <Ionicons name="cart" size={18} color={Colors.success} />
                        <Text style={styles.quickNavText}>Grocery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/meal-plan')}>
                        <Ionicons name="calendar" size={18} color={Colors.warning} />
                        <Text style={styles.quickNavText}>Meal Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickNavItem} onPress={() => router.push('/nutrition/micronutrients')}>
                        <Ionicons name="flask" size={18} color={Colors.micros} />
                        <Text style={styles.quickNavText}>Micros</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Daily Summary Card */}
                <Card style={styles.summaryCard}>
                    <View style={styles.summaryTop}>
                        <ProgressRing
                            progress={calPct}
                            size={110}
                            strokeWidth={10}
                            color={Colors.calories}
                            value={formatNumber(caloriesRemaining)}
                            label="remaining"
                            sublabel="kcal"
                        />
                        <View style={styles.summaryMacros}>
                            <View style={styles.macroRingRow}>
                                <ProgressRing
                                    progress={getPercentage(todaySummary.total_protein_g, proteinTarget)}
                                    size={60}
                                    strokeWidth={5}
                                    color={Colors.protein}
                                    value={`${Math.round(todaySummary.total_protein_g)}`}
                                    label="Protein"
                                />
                                <ProgressRing
                                    progress={getPercentage(todaySummary.total_carbs_g, carbsTarget)}
                                    size={60}
                                    strokeWidth={5}
                                    color={Colors.carbs}
                                    value={`${Math.round(todaySummary.total_carbs_g)}`}
                                    label="Carbs"
                                />
                                <ProgressRing
                                    progress={getPercentage(todaySummary.total_fat_g, fatTarget)}
                                    size={60}
                                    strokeWidth={5}
                                    color={Colors.fat}
                                    value={`${Math.round(todaySummary.total_fat_g)}`}
                                    label="Fat"
                                />
                            </View>
                        </View>
                    </View>
                </Card>

                {/* Water Tracker */}
                <Card title="Water" style={styles.waterCard}>
                    <View style={styles.waterRow}>
                        <View>
                            <Text style={styles.waterAmount}>
                                {todaySummary.water_ml}{' '}
                                <Text style={styles.waterUnit}>/ {waterTarget} ml</Text>
                            </Text>
                            <View style={styles.waterBarBg}>
                                <View
                                    style={[
                                        styles.waterBarFill,
                                        {
                                            width: `${getPercentage(todaySummary.water_ml, waterTarget)}%`,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.waterAddBtn} onPress={handleAddWater}>
                            <Ionicons name="add" size={24} color={Colors.text} />
                            <Text style={styles.waterAddText}>{WATER_SERVING_ML}ml</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Meals */}
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
                    const meals = todaySummary.meals[mealType];
                    const mealCalories = meals.reduce((acc, m) => acc + m.calories, 0);

                    return (
                        <Card key={mealType} style={styles.mealCard}>
                            <View style={styles.mealHeader}>
                                <View style={styles.mealTitleRow}>
                                    <Text style={styles.mealEmoji}>{MEAL_ICONS[mealType]}</Text>
                                    <Text style={styles.mealTitle}>
                                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                                    </Text>
                                </View>
                                <Text style={styles.mealCalories}>{mealCalories} kcal</Text>
                            </View>

                            {meals.length > 0 ? (
                                meals.map((entry) => (
                                    <View key={entry.id} style={styles.foodEntry}>
                                        <View style={styles.foodInfo}>
                                            <Text style={styles.foodName}>
                                                {entry.food_item.name}
                                            </Text>
                                            <Text style={styles.foodMacros}>
                                                {entry.servings} serving • P: {entry.protein_g}g • C:{' '}
                                                {entry.carbs_g}g • F: {entry.fat_g}g
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.foodCalories}>{entry.calories}</Text>
                                            <TouchableOpacity onPress={() => removeLogEntry(entry.id)}>
                                                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noFood}>No food logged</Text>
                            )}

                            <TouchableOpacity
                                style={styles.addFoodBtn}
                                onPress={() => handleAddFood(mealType)}
                            >
                                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                                <Text style={styles.addFoodText}>Add Food</Text>
                            </TouchableOpacity>
                        </Card>
                    );
                })}

                {/* AI Meal Suggestion */}
                <Card style={styles.aiSuggestion}>
                    <View style={styles.aiHeader}>
                        <Text style={styles.aiEmoji}>🤖</Text>
                        <Text style={styles.aiTitle}>AI Suggestion</Text>
                    </View>
                    <Text style={styles.aiText}>
                        You have {formatNumber(caloriesRemaining)} kcal and{' '}
                        {Math.max(proteinTarget - todaySummary.total_protein_g, 0).toFixed(0)}g protein
                        remaining. Try grilled chicken breast (165g) with rice (150g) and broccoli (100g) for
                        a balanced meal hitting your targets.
                    </Text>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    headerActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },

    // Quick nav
    quickNav: {
        marginBottom: Spacing.lg,
        marginHorizontal: -Spacing.lg,
    },
    quickNavContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    quickNavItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickNavText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },

    // Summary
    summaryCard: {
        marginBottom: Spacing.lg,
    },
    summaryTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    summaryMacros: {
        flex: 1,
    },
    macroRingRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },

    // Water
    waterCard: {
        marginBottom: Spacing.lg,
    },
    waterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    waterAmount: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    waterUnit: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.regular,
    },
    waterBarBg: {
        width: 180,
        height: 6,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        marginTop: Spacing.sm,
        overflow: 'hidden',
    },
    waterBarFill: {
        height: '100%',
        backgroundColor: Colors.secondary,
        borderRadius: BorderRadius.full,
    },
    waterAddBtn: {
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    waterAddText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },

    // Meals
    mealCard: {
        marginBottom: Spacing.md,
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    mealTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    mealEmoji: {
        fontSize: 20,
    },
    mealTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    mealCalories: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    foodEntry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    foodMacros: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    foodCalories: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    noFood: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        fontStyle: 'italic',
        paddingVertical: Spacing.sm,
    },
    addFoodBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
    },
    addFoodText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },

    // AI
    aiSuggestion: {
        marginTop: Spacing.sm,
        borderColor: Colors.primaryDark,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    aiEmoji: {
        fontSize: 20,
    },
    aiTitle: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    aiText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
});
