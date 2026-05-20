import { Button, Card, ProgressRing } from '@/components/ui';
import { WATER_SERVING_ML } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@/lib/storage';
import { displayWeightFromKg, formatNumber, getPercentage, getWeightUnit } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { DIET_TEMPLATES, useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import type { DietPhase, DietTemplate, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    Modal,
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
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const { todaySummary, logFood, logWater, recentFoods, removeLogEntry } = useNutritionStore();
    const { dietProfile, setDietProfile } = useMealPlanStore();
    const weightEntries = useProgressStore((s) => s.weightEntries);
    const [showDietSetup, setShowDietSetup] = React.useState(false);
    const [setupTemplate, setSetupTemplate] = React.useState<DietTemplate>(dietProfile.template);
    const [setupPhase, setSetupPhase] = React.useState<DietPhase>(dietProfile.phase);
    const [setupAllergies, setSetupAllergies] = React.useState<string[]>(dietProfile.allergies);
    const [setupExclusions, setSetupExclusions] = React.useState<string[]>(dietProfile.excluded_foods);
    const [setupCuisines, setSetupCuisines] = React.useState<string[]>(dietProfile.preferred_cuisines);

    React.useEffect(() => {
        let mounted = true;
        AsyncStorage.getItem('bodypilot-nutrition-diet-setup-complete')
            .then((value) => {
                if (mounted) setShowDietSetup(value !== 'true');
            })
            .catch(() => {
                if (mounted) setShowDietSetup(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const calorieTarget = user?.daily_calorie_target || 2200;
    const proteinTarget = user?.protein_target_g || 165;
    const carbsTarget = user?.carbs_target_g || 220;
    const fatTarget = user?.fat_target_g || 73;
    const waterTarget = user?.water_goal_ml || 2500;

    const caloriesRemaining = Math.max(calorieTarget - todaySummary.total_calories, 0);
    const calPct = getPercentage(todaySummary.total_calories, calorieTarget);
    const macroTotal = Math.max(
        todaySummary.total_protein_g * 4 + todaySummary.total_carbs_g * 4 + todaySummary.total_fat_g * 9,
        1
    );
    const microScore = Math.min(
        100,
        Math.round(((todaySummary.total_fiber_g || 0) / 30) * 35 + (todaySummary.total_calories / calorieTarget) * 45 + (todaySummary.water_ml / waterTarget) * 20)
    );
    const weightTrend = weightEntries.slice(0, 7).reverse();
    const latestWeight = weightEntries[0]?.weight_kg || user?.current_weight_kg || 0;
    const weightUnit = getWeightUnit(user?.unit_system);
    const weeklyCalories = [0.82, 0.94, 1.05, 0.88, 0.97, 0.76, todaySummary.total_calories / calorieTarget];
    const weeklyWater = [0.7, 0.95, 0.82, 1.1, 0.64, 0.9, todaySummary.water_ml / waterTarget];
    const deficitStreak = weeklyCalories.reduceRight((streak, ratio) => ratio < 1 ? streak + 1 : streak, 0);

    const handleAddWater = () => {
        logWater(WATER_SERVING_ML);
    };

    const handleAddFood = (mealType: MealType) => {
        router.push(`/nutrition/food-search?meal=${mealType}`);
    };

    const handleQuickRecent = (foodId: string) => {
        const food = recentFoods.find((item) => item.id === foodId);
        if (!food) return;
        Alert.alert('Quick Log', `Add ${food.name} to which meal?`, [
            ...(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => ({
                text: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                onPress: () => logFood(food, 1, mealType),
            })),
            { text: 'Cancel', style: 'cancel' as const },
        ]);
    };

    const toggleSetupValue = (value: string, values: string[], setter: (next: string[]) => void) => {
        setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    };

    const saveDietSetup = async () => {
        setDietProfile({
            template: setupTemplate,
            phase: setupPhase,
            phase_start_date: new Date().toISOString(),
            allergies: setupAllergies,
            excluded_foods: setupExclusions,
            preferred_cuisines: setupCuisines,
        });
        await AsyncStorage.setItem('bodypilot-nutrition-diet-setup-complete', 'true');
        setShowDietSetup(false);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Nutrition</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/ai-scanner')}>
                            <Ionicons name="camera" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/barcode-scanner')}>
                            <Ionicons name="barcode-outline" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Nav */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNav} contentContainerStyle={styles.quickNavContent}>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/nlp-food-log')}>
                        <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Quick Log</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/iifym')}>
                        <Ionicons name="calculator" size={18} color={colors.secondary} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>IIFYM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/receipt-scanner')}>
                        <Ionicons name="receipt" size={18} color={Colors.accent} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/meal-photos')}>
                        <Ionicons name="images" size={18} color={Colors.success} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/nutrition-insights')}>
                        <Ionicons name="analytics" size={18} color={Colors.analytics} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Insights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/recipe-adjuster')}>
                        <Ionicons name="color-wand" size={18} color={Colors.fat} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Adjuster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/diet-settings')}>
                        <Ionicons name="options" size={18} color={colors.primary} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Diet Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/recipes')}>
                        <Ionicons name="book" size={18} color={Colors.recipes} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Recipes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/fasting')}>
                        <Ionicons name="timer" size={18} color={colors.secondary} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Fasting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/grocery-list')}>
                        <Ionicons name="cart" size={18} color={Colors.success} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Grocery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/meal-plan')}>
                        <Ionicons name="calendar" size={18} color={Colors.warning} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Meal Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/micronutrients')}>
                        <Ionicons name="flask" size={18} color={Colors.micros} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Micros</Text>
                    </TouchableOpacity>
                </ScrollView>

                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.dashboardCarousel}
                    contentContainerStyle={styles.dashboardCarouselContent}
                >
                    <Card style={styles.dashboardSlide}>
                        <View style={styles.summaryTop}>
                            <ProgressRing
                                progress={calPct}
                                size={110}
                                strokeWidth={10}
                                color={colors.calories}
                                value={formatNumber(caloriesRemaining)}
                                label="remaining"
                                sublabel="kcal"
                            />
                            <View style={styles.summaryMacros}>
                                <Text style={[styles.slideTitle, { color: colors.text }]}>Calories & Macros</Text>
                                <View style={styles.macroBarStack}>
                                    <MacroTrack label="Protein" color={colors.protein} value={todaySummary.total_protein_g} target={proteinTarget} />
                                    <MacroTrack label="Carbs" color={colors.carbs} value={todaySummary.total_carbs_g} target={carbsTarget} />
                                    <MacroTrack label="Fat" color={colors.fat} value={todaySummary.total_fat_g} target={fatTarget} />
                                </View>
                            </View>
                        </View>
                    </Card>

                    <Card style={styles.dashboardSlide}>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>Macro Split & Micros</Text>
                        <View style={styles.splitBar}>
                            <View style={[styles.splitSegment, { flex: todaySummary.total_protein_g * 4 || 1, backgroundColor: Colors.protein }]} />
                            <View style={[styles.splitSegment, { flex: todaySummary.total_carbs_g * 4 || 1, backgroundColor: Colors.carbs }]} />
                            <View style={[styles.splitSegment, { flex: todaySummary.total_fat_g * 9 || 1, backgroundColor: Colors.fat }]} />
                        </View>
                        <View style={styles.microGrid}>
                            <MetricTile label="Protein kcal" value={`${Math.round((todaySummary.total_protein_g * 4 / macroTotal) * 100)}%`} color={Colors.protein} />
                            <MetricTile label="Carb kcal" value={`${Math.round((todaySummary.total_carbs_g * 4 / macroTotal) * 100)}%`} color={Colors.carbs} />
                            <MetricTile label="Fat kcal" value={`${Math.round((todaySummary.total_fat_g * 9 / macroTotal) * 100)}%`} color={Colors.fat} />
                            <MetricTile label="Micro score" value={`${microScore}%`} color={Colors.micros} />
                        </View>
                    </Card>

                    <Card style={styles.dashboardSlide}>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>Weight Trend</Text>
                        <View style={styles.chartArea}>
                            {(weightTrend.length ? weightTrend : Array.from({ length: 7 }, (_, index) => ({ weight_kg: latestWeight || 75 + index * 0.2 }))).map((entry, index, arr) => {
                                const weights = arr.map((item) => item.weight_kg);
                                const min = Math.min(...weights);
                                const max = Math.max(...weights);
                                const height = max === min ? 42 : 28 + ((entry.weight_kg - min) / (max - min)) * 70;
                                return <View key={index} style={[styles.weightBar, { height, backgroundColor: colors.primary }]} />;
                            })}
                        </View>
                        <Text style={styles.chartCaption}>
                            {latestWeight
                                ? `${displayWeightFromKg(latestWeight, user?.unit_system).toFixed(1)} ${weightUnit} latest`
                                : 'Log weight to personalize this chart'}
                        </Text>
                    </Card>

                    <Card style={styles.dashboardSlide}>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>Weekly Calories</Text>
                        <View style={styles.barChartRow}>
                            {weeklyCalories.map((ratio, index) => (
                                <View key={index} style={styles.dayBarWrap}>
                                    <View style={[styles.dayBar, { height: 34 + Math.min(ratio, 1.25) * 72, backgroundColor: ratio <= 1 ? colors.primary : Colors.accent }]} />
                                    <Text style={styles.dayLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
                                </View>
                            ))}
                        </View>
                    </Card>

                    <Card style={styles.dashboardSlide}>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>Water & Deficit Streak</Text>
                        <View style={styles.barChartRow}>
                            {weeklyWater.map((ratio, index) => (
                                <View key={index} style={styles.dayBarWrap}>
                                    <View style={[styles.dayBar, { height: 30 + Math.min(ratio, 1.2) * 78, backgroundColor: Colors.secondary }]} />
                                    <Text style={styles.dayLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.streakBadge}>
                            <Ionicons name="flame" size={18} color={colors.primary} />
                            <Text style={styles.streakText}>{deficitStreak} day calorie deficit streak</Text>
                        </View>
                    </Card>
                </ScrollView>

                <Card style={styles.logHubCard}>
                    <View style={styles.logHubHeader}>
                        <View>
                            <Text style={[styles.logHubTitle, { color: colors.text }]}>Log Food</Text>
                            <Text style={[styles.logHubSubtitle, { color: colors.textTertiary }]}>Search foods, scan labels, or reuse recent foods.</Text>
                        </View>
                    </View>
                    <View style={styles.mealQuickGrid}>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
                            <TouchableOpacity
                                key={mealType}
                                style={[styles.mealQuickButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                                onPress={() => handleAddFood(mealType)}
                            >
                                <Text style={styles.mealQuickEmoji}>{MEAL_ICONS[mealType]}</Text>
                                <Text style={[styles.mealQuickText, { color: colors.textSecondary }]}>
                                    {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.logHubActions}>
                        <TouchableOpacity style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]} onPress={() => router.push('/nutrition/barcode-scanner')}>
                            <Ionicons name="barcode-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Barcode</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]} onPress={() => router.push('/nutrition/create-food')}>
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Custom Food</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]} onPress={() => router.push('/nutrition/recipes')}>
                            <Ionicons name="book-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Recipes</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {recentFoods.length > 0 && (
                    <View style={styles.recentSection}>
                        <View style={styles.recentHeader}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Recent Foods</Text>
                            <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>Tap to log 1 serving</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
                            {recentFoods.slice(0, 10).map((food) => (
                                <TouchableOpacity
                                    key={food.id}
                                    style={[styles.recentFoodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={() => handleQuickRecent(food.id)}
                                >
                                    <Text style={[styles.recentFoodName, { color: colors.text }]} numberOfLines={2}>{food.name}</Text>
                                    <Text style={[styles.recentFoodMeta, { color: colors.textSecondary }]}>{food.calories} kcal</Text>
                                    <View style={styles.recentMacroRow}>
                                        <Text style={[styles.recentMacro, { color: Colors.protein }]}>P {food.protein_g}g</Text>
                                        <Text style={[styles.recentMacro, { color: Colors.carbs }]}>C {food.carbs_g}g</Text>
                                        <Text style={[styles.recentMacro, { color: Colors.fat }]}>F {food.fat_g}g</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

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
                                            backgroundColor: colors.primary,
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
                                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                <Text style={[styles.addFoodText, { color: colors.primary }]}>Add Food</Text>
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

            <Modal visible={showDietSetup} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.setupContainer, { paddingTop: insets.top }]}>
                    <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.setupEyebrow}>Nutrition Setup</Text>
                        <Text style={styles.setupTitle}>Personalize meal suggestions</Text>
                        <Text style={styles.setupCopy}>
                            These answers become context for BodyPilot when calculating meals, recipes, and macro guidance.
                        </Text>

                        <Text style={styles.setupSection}>Diet style</Text>
                        <View style={styles.setupChipGrid}>
                            {(Object.keys(DIET_TEMPLATES) as DietTemplate[]).slice(0, 8).map((template) => (
                                <SetupChip
                                    key={template}
                                    label={DIET_TEMPLATES[template].name}
                                    active={setupTemplate === template}
                                    onPress={() => setSetupTemplate(template)}
                                />
                            ))}
                        </View>

                        <Text style={styles.setupSection}>Goal phase</Text>
                        <View style={styles.setupChipGrid}>
                            {(['cut', 'maintain', 'recomp', 'bulk'] as DietPhase[]).map((phase) => (
                                <SetupChip
                                    key={phase}
                                    label={phase.replace('_', ' ')}
                                    active={setupPhase === phase}
                                    onPress={() => setSetupPhase(phase)}
                                />
                            ))}
                        </View>

                        <Text style={styles.setupSection}>Allergies / restrictions</Text>
                        <View style={styles.setupChipGrid}>
                            {['Dairy', 'Gluten', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Fish', 'Sesame'].map((item) => (
                                <SetupChip
                                    key={item}
                                    label={item}
                                    active={setupAllergies.includes(item)}
                                    onPress={() => toggleSetupValue(item, setupAllergies, setSetupAllergies)}
                                />
                            ))}
                        </View>

                        <Text style={styles.setupSection}>Foods to avoid</Text>
                        <View style={styles.setupChipGrid}>
                            {['Red meat', 'Pork', 'Seafood', 'Spicy food', 'Artificial sweeteners', 'Protein powder'].map((item) => (
                                <SetupChip
                                    key={item}
                                    label={item}
                                    active={setupExclusions.includes(item)}
                                    onPress={() => toggleSetupValue(item, setupExclusions, setSetupExclusions)}
                                />
                            ))}
                        </View>

                        <Text style={styles.setupSection}>Cuisine preferences</Text>
                        <View style={styles.setupChipGrid}>
                            {['American', 'Mediterranean', 'Mexican', 'Indian', 'Asian', 'Italian'].map((item) => (
                                <SetupChip
                                    key={item}
                                    label={item}
                                    active={setupCuisines.includes(item)}
                                    onPress={() => toggleSetupValue(item, setupCuisines, setSetupCuisines)}
                                />
                            ))}
                        </View>

                        <Button title="Save Nutrition Profile" onPress={saveDietSetup} size="lg" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

function MacroTrack({ label, color, value, target }: { label: string; color: string; value: number; target: number }) {
    const { colors } = useTheme();

    return (
        <View>
            <View style={styles.trackHeader}>
                <Text style={[styles.trackLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.trackValue, { color: colors.textTertiary }]}>{Math.round(value)} / {target}g</Text>
            </View>
            <View style={[styles.trackBg, { backgroundColor: colors.surfaceLight }]}>
                <View style={[styles.trackFill, { width: `${Math.min(100, (value / target) * 100)}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

function MetricTile({ label, value, color }: { label: string; value: string; color: string }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.metricTile, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function SetupChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.setupChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                active && styles.setupChipActive,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={onPress}
        >
            <Text style={[styles.setupChipText, { color: colors.textSecondary }, active && styles.setupChipTextActive, active && { color: colors.textInverse }]}>{label}</Text>
        </TouchableOpacity>
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

    dashboardCarousel: {
        marginHorizontal: -Spacing.lg,
        marginBottom: Spacing.lg,
    },
    dashboardCarouselContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    dashboardSlide: {
        width: 330,
        minHeight: 190,
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
    slideTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },
    macroBarStack: {
        gap: Spacing.md,
    },
    trackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    trackLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    trackValue: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    trackBg: {
        height: 7,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.border,
        overflow: 'hidden',
    },
    trackFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
    splitBar: {
        flexDirection: 'row',
        height: 12,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        backgroundColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    splitSegment: {
        height: '100%',
    },
    microGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    metricTile: {
        width: '48%',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    metricValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
    },
    metricLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    chartArea: {
        height: 112,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
    },
    weightBar: {
        flex: 1,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        minHeight: 28,
    },
    chartCaption: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: Spacing.md,
    },
    barChartRow: {
        height: 130,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    dayBarWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    dayBar: {
        width: '70%',
        borderRadius: BorderRadius.full,
        minHeight: 24,
    },
    dayLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary + '18',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignSelf: 'flex-start',
        marginTop: Spacing.md,
    },
    streakText: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    logHubCard: {
        marginBottom: Spacing.lg,
    },
    logHubHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    logHubTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    logHubSubtitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 2,
        maxWidth: 250,
    },
    mealQuickGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    mealQuickButton: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    mealQuickEmoji: {
        fontSize: 18,
    },
    mealQuickText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    logHubActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    logHubAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        backgroundColor: Colors.primary + '18',
    },
    logHubActionText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    recentSection: {
        marginBottom: Spacing.lg,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionLabel: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    sectionHint: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    recentScroll: {
        marginHorizontal: -Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    recentFoodCard: {
        width: 146,
        minHeight: 104,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginRight: Spacing.sm,
    },
    recentFoodName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        lineHeight: 18,
        fontWeight: FontWeight.bold,
    },
    recentFoodMeta: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        marginTop: Spacing.sm,
        fontWeight: FontWeight.semibold,
    },
    recentMacroRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    recentMacro: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
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

    // Diet setup
    setupContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    setupContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 48,
    },
    setupEyebrow: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    setupTitle: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
        lineHeight: 38,
    },
    setupCopy: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 23,
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    setupSection: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
    },
    setupChipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    setupChip: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    setupChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    setupChipText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        textTransform: 'capitalize',
    },
    setupChipTextActive: {
        color: Colors.background,
    },
});
