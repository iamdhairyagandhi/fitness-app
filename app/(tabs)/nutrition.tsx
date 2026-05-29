import { HealthSourcesCard } from '@/components/HealthSourcesCard';
import { Button, Card, ProgressRing } from '@/components/ui';
import { WATER_SERVING_ML } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getRecentLocalDateKeys } from '@/lib/date';
import {
    buildNutritionTrendInsights,
    type CalorieTrendInsight,
    type NutritionTrendDay,
    type WaterTrendInsight,
    type WeightTrendInsight,
} from '@/lib/nutritionAnalytics';
import AsyncStorage from '@/lib/storage';
import { requirePremium } from '@/lib/premium';
import { displayWeightFromKg, formatNumber, getPercentage, getWeightUnit } from '@/lib/utils';
import { useAppleHealthStore } from '@/stores/appleHealthStore';
import { useAuthStore } from '@/stores/authStore';
import { DIET_TEMPLATES, useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useProgressStore } from '@/stores/progressStore';
import type { DietPhase, DietTemplate, FoodLogEntry, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    Animated,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_ICONS: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

type MealDropZone = {
    mealType: MealType;
    y: number;
    height: number;
};

export default function NutritionScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const { todaySummary, nutritionHistory, logFood, logWater, recentFoods, removeLogEntry, moveLogEntry, ensureToday } = useNutritionStore();
    const healthSnapshot = useAppleHealthStore((s) => s.snapshot);
    const syncAppleHealth = useAppleHealthStore((s) => s.sync);
    const { dietProfile, setDietProfile } = useMealPlanStore();
    const weightEntries = useProgressStore((s) => s.weightEntries);
    const [showDietSetup, setShowDietSetup] = React.useState(false);
    const [setupTemplate, setSetupTemplate] = React.useState<DietTemplate>(dietProfile.template);
    const [setupPhase, setSetupPhase] = React.useState<DietPhase>(dietProfile.phase);
    const [setupAllergies, setSetupAllergies] = React.useState<string[]>(dietProfile.allergies);
    const [setupExclusions, setSetupExclusions] = React.useState<string[]>(dietProfile.excluded_foods);
    const [setupCuisines, setSetupCuisines] = React.useState<string[]>(dietProfile.preferred_cuisines);
    const mealCardRefs = React.useRef<Record<MealType, View | null>>({
        breakfast: null,
        lunch: null,
        dinner: null,
        snack: null,
    });
    const mealDropZones = React.useRef<MealDropZone[]>([]);
    const [draggingEntryId, setDraggingEntryId] = React.useState<string | null>(null);
    const [hoverMeal, setHoverMeal] = React.useState<MealType | null>(null);

    React.useEffect(() => {
        ensureToday();
        syncAppleHealth().catch(() => { });
    }, [ensureToday, syncAppleHealth]);

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

    const activeEnergyKcal = healthSnapshot.status === 'authorized' ? healthSnapshot.activeEnergyKcal : 0;
    const netCalories = Math.max(todaySummary.total_calories - activeEnergyKcal, 0);
    const caloriesRemaining = Math.max(calorieTarget - netCalories, 0);
    const calPct = getPercentage(netCalories, calorieTarget);
    const macroTotal = Math.max(
        todaySummary.total_protein_g * 4 + todaySummary.total_carbs_g * 4 + todaySummary.total_fat_g * 9,
        1
    );
    const microScore = Math.min(
        100,
        Math.round(((todaySummary.total_fiber_g || 0) / 30) * 35 + (todaySummary.total_calories / calorieTarget) * 45 + (todaySummary.water_ml / waterTarget) * 20)
    );
    const weekDateKeys = React.useMemo(() => getRecentLocalDateKeys(7), [todaySummary.date]);
    const weekSummaries = React.useMemo(() => {
        const byDate = new Map(nutritionHistory.map((summary) => [summary.date, summary]));
        byDate.set(todaySummary.date, todaySummary);
        return weekDateKeys.map((date) => byDate.get(date) ?? {
            date,
            total_calories: 0,
            total_protein_g: 0,
            total_carbs_g: 0,
            total_fat_g: 0,
            total_fiber_g: 0,
            water_ml: 0,
            meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
        });
    }, [nutritionHistory, todaySummary, weekDateKeys]);
    const nutritionTrends = React.useMemo(
        () => buildNutritionTrendInsights({
            summaries: weekSummaries,
            weightEntries,
            calorieTarget,
            waterTargetMl: waterTarget,
            goal: user?.goal ?? 'maintain',
        }),
        [calorieTarget, user?.goal, waterTarget, weekSummaries, weightEntries],
    );

    const handleAddWater = () => {
        logWater(WATER_SERVING_ML);
    };

    const handleAddFood = (mealType: MealType) => {
        router.push(`/nutrition/food-search?meal=${mealType}`);
    };

    const handleQuickRecent = (foodId: string) => {
        const food = recentFoods.find((item) => item.id === foodId);
        if (!food) return;
        Alert.alert('Log Food', `Add ${food.name} to which meal?`, [
            ...(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => ({
                text: mealType.charAt(0).toUpperCase() + mealType.slice(1),
                onPress: () => logFood(food, 1, mealType),
            })),
            { text: 'Cancel', style: 'cancel' as const },
        ]);
    };

    const measureMealDropZones = React.useCallback(() => {
        const nextZones: MealDropZone[] = [];
        MEAL_ORDER.forEach((mealType) => {
            mealCardRefs.current[mealType]?.measureInWindow((_x, y, _width, height) => {
                nextZones.push({ mealType, y, height });
                if (nextZones.length === MEAL_ORDER.length) {
                    mealDropZones.current = nextZones;
                }
            });
        });
    }, []);

    const getMealAtPageY = React.useCallback((pageY: number) => {
        return mealDropZones.current.find((zone) => pageY >= zone.y && pageY <= zone.y + zone.height)?.mealType ?? null;
    }, []);

    const handleFoodDrop = React.useCallback((entryId: string, fromMeal: MealType, pageY: number) => {
        const targetMeal = getMealAtPageY(pageY);
        setHoverMeal(null);
        setDraggingEntryId(null);
        if (targetMeal && targetMeal !== fromMeal) {
            moveLogEntry(entryId, targetMeal);
        }
    }, [getMealAtPageY, moveLogEntry]);

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
                scrollEnabled={!draggingEntryId}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Nutrition</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => {
                                if (requirePremium('ai_food_scan')) router.push('/nutrition/ai-scanner');
                            }}
                        >
                            <Ionicons name="camera" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/nutrition/barcode-scanner')}>
                            <Ionicons name="barcode-outline" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Nav */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNav} contentContainerStyle={styles.quickNavContent}>
                    <TouchableOpacity
                        style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => {
                            if (requirePremium('ai_quick_log')) router.push('/nutrition/nlp-food-log');
                        }}
                    >
                        <Ionicons name="hardware-chip" size={18} color={colors.primary} />
                        <Text style={[styles.quickNavText, { color: colors.textSecondary }]}>Orbit</Text>
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
                    <TouchableOpacity
                        style={[styles.quickNavItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => {
                            if (requirePremium('advanced_analytics')) router.push('/nutrition/nutrition-insights');
                        }}
                    >
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
                        <View style={styles.todaySignalRow}>
                            <TodaySignal label="Logged" value={`${formatNumber(todaySummary.total_calories)}`} caption="food kcal" colors={colors} />
                            <TodaySignal label="Burned" value={`${formatNumber(activeEnergyKcal)}`} caption="Health kcal" colors={colors} />
                            <TodaySignal label="Protein gap" value={`${Math.max(0, Math.round(proteinTarget - todaySummary.total_protein_g))}g`} caption="left today" colors={colors} />
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

                    <WeightTrendSlide
                        trend={nutritionTrends.weight}
                        unitSystem={user?.unit_system}
                        colors={colors}
                    />

                    <CalorieTrendSlide
                        days={nutritionTrends.days}
                        trend={nutritionTrends.calories}
                        calorieTarget={calorieTarget}
                        unitSystem={user?.unit_system}
                        colors={colors}
                    />

                    <WaterTrendSlide
                        days={nutritionTrends.days}
                        trend={nutritionTrends.water}
                        waterTarget={waterTarget}
                        colors={colors}
                    />
                </ScrollView>

                <HealthSourcesCard title="Nutrition Sources" />

                <Card style={styles.logHubCard}>
                    <View style={styles.logHubHeader}>
                        <View>
                            <Text style={[styles.logHubTitle, { color: colors.text }]}>Log Food</Text>
                            <Text style={[styles.logHubSubtitle, { color: colors.textTertiary }]}>Talk to Orbit, search foods, or scan labels.</Text>
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
                        <TouchableOpacity
                            style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]}
                            onPress={() => {
                                if (requirePremium('ai_quick_log')) router.push('/nutrition/nlp-food-log');
                            }}
                        >
                            <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Orbit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]} onPress={() => router.push('/nutrition/barcode-scanner')}>
                            <Ionicons name="barcode-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Barcode</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logHubAction, { borderColor: colors.primary + '28', backgroundColor: colors.primary + '14' }]} onPress={() => router.push('/nutrition/create-food')}>
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                            <Text style={[styles.logHubActionText, { color: colors.primary }]}>Custom Food</Text>
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
                {MEAL_ORDER.map((mealType) => {
                    const meals = todaySummary.meals[mealType];
                    const mealCalories = meals.reduce((acc, m) => acc + m.calories, 0);

                    return (
                        <View
                            key={mealType}
                            ref={(ref) => { mealCardRefs.current[mealType] = ref; }}
                            collapsable={false}
                            onLayout={measureMealDropZones}
                        >
                            <Card
                                style={{
                                    ...styles.mealCard,
                                    ...(draggingEntryId && hoverMeal === mealType ? styles.mealCardDropActive : {}),
                                    ...(draggingEntryId && hoverMeal === mealType
                                        ? { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                                        : {}),
                                }}
                            >
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
                                    <DraggableFoodEntry
                                        key={entry.id}
                                        entry={entry}
                                        colors={colors}
                                        onMoveEntry={moveLogEntry}
                                        onRemoveEntry={removeLogEntry}
                                        onDragStart={(entryId) => {
                                            measureMealDropZones();
                                            setDraggingEntryId(entryId);
                                        }}
                                        onDragMove={(pageY) => setHoverMeal(getMealAtPageY(pageY))}
                                        onDragEnd={(pageY) => handleFoodDrop(entry.id, mealType, pageY)}
                                    />
                                ))
                            ) : (
                                <Text style={styles.noFood}>
                                    {draggingEntryId && hoverMeal === mealType ? 'Drop here' : 'No food logged'}
                                </Text>
                            )}

                            <TouchableOpacity
                                style={styles.addFoodBtn}
                                onPress={() => handleAddFood(mealType)}
                            >
                                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                <Text style={[styles.addFoodText, { color: colors.primary }]}>Add Food</Text>
                            </TouchableOpacity>
                            </Card>
                        </View>
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

function TodaySignal({ label, value, caption, colors }: { label: string; value: string; caption: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.todaySignal, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.todaySignalValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.todaySignalLabel, { color: colors.textTertiary }]}>{label}</Text>
            <Text style={[styles.todaySignalCaption, { color: colors.textSecondary }]} numberOfLines={1}>{caption}</Text>
        </View>
    );
}

function WeightTrendSlide({
    trend,
    unitSystem,
    colors,
}: {
    trend: WeightTrendInsight;
    unitSystem?: 'metric' | 'imperial' | null;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const weightUnit = getWeightUnit(unitSystem);
    const points = trend.points;
    const weights = points.map((point) => point.weightKg);
    const min = weights.length ? Math.min(...weights) : 0;
    const max = weights.length ? Math.max(...weights) : 1;
    const range = Math.max(max - min, 0.1);
    const latest = trend.latestKg !== null ? `${displayWeightFromKg(trend.latestKg, unitSystem).toFixed(1)} ${weightUnit}` : '--';

    return (
        <Card style={{ ...styles.dashboardSlide, ...styles.trendSlide }}>
            <View style={styles.trendHeader}>
                <View style={styles.trendHeaderCopy}>
                    <Text style={[styles.slideTitle, { color: colors.text }]}>Weight Trend</Text>
                    <Text style={[styles.trendSubtext, { color: colors.textTertiary }]}>Moving average matters more than one weigh-in.</Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '28' }]}>
                    <Text style={[styles.trendPillValue, { color: colors.primary }]}>{formatWeightDelta(trend.trendKgPerWeek, unitSystem)}/wk</Text>
                </View>
            </View>

            {points.length >= 2 ? (
                <View style={[styles.weightPlot, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {points.map((point) => {
                        const bottom = 10 + ((point.weightKg - min) / range) * 78;
                        return (
                            <View key={`${point.date}-${point.weightKg}`} style={styles.weightPointColumn}>
                                <View style={styles.weightPointRail}>
                                    <View
                                        style={[
                                            styles.weightPoint,
                                            {
                                                bottom: `${bottom}%`,
                                                backgroundColor: point === points[points.length - 1] ? colors.primary : colors.textSecondary,
                                                borderColor: colors.background,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.trendDayLabel, { color: colors.textTertiary }]}>{point.label.slice(0, 1)}</Text>
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={[styles.trendEmptyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="scale-outline" size={24} color={colors.primary} />
                    <Text style={[styles.trendEmptyText, { color: colors.textSecondary }]}>Log a few morning weights to unlock the trend line.</Text>
                </View>
            )}

            <View style={styles.trendMetricGrid}>
                <TrendMetric label="Latest" value={latest} colors={colors} />
                <TrendMetric label="3-log avg" value={trend.movingAverageKg ? `${displayWeightFromKg(trend.movingAverageKg, unitSystem).toFixed(1)} ${weightUnit}` : '--'} colors={colors} />
                <TrendMetric label="Range" value={formatWeightDelta(Math.abs(trend.rangeKg), unitSystem, false)} colors={colors} />
            </View>
            <Text style={[styles.trendInsightText, { color: colors.textSecondary }]}>{trend.message}</Text>
        </Card>
    );
}

function CalorieTrendSlide({
    days,
    trend,
    calorieTarget,
    unitSystem,
    colors,
}: {
    days: NutritionTrendDay[];
    trend: CalorieTrendInsight;
    calorieTarget: number;
    unitSystem?: 'metric' | 'imperial' | null;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const maxRatio = Math.max(1.15, ...days.map((day) => day.calorieRatio), 1);

    return (
        <Card style={{ ...styles.dashboardSlide, ...styles.trendSlide }}>
            <View style={styles.trendHeader}>
                <View style={styles.trendHeaderCopy}>
                    <Text style={[styles.slideTitle, { color: colors.text }]}>Weekly Calories</Text>
                    <Text style={[styles.trendSubtext, { color: colors.textTertiary }]}>Target range, net balance, and likely scale effect.</Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '28' }]}>
                    <Text style={[styles.trendPillValue, { color: colors.primary }]}>{trend.adherencePct}%</Text>
                    <Text style={[styles.trendPillLabel, { color: colors.textTertiary }]}>in range</Text>
                </View>
            </View>

            <View style={styles.calorieChartRow}>
                {days.map((day, index) => {
                    const height = Math.max(8, (Math.min(day.calorieRatio, maxRatio) / maxRatio) * 100);
                    const color = !day.logged ? colors.border : Math.abs(day.calorieDelta) <= calorieTarget * 0.1 ? colors.primary : day.calorieDelta > 0 ? Colors.accent : Colors.warning;
                    return (
                        <View key={`${day.date}-${index}`} style={styles.calorieDayColumn}>
                            <View style={[styles.calorieTrack, { backgroundColor: colors.background }]}>
                                <View style={[styles.calorieTargetLine, { bottom: `${(1 / maxRatio) * 100}%`, backgroundColor: colors.textTertiary }]} />
                                <View style={[styles.calorieFill, { height: `${height}%`, backgroundColor: color }]} />
                            </View>
                            <Text style={[styles.trendDayLabel, { color: colors.textTertiary }]}>{day.label.slice(0, 1)}</Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.trendMetricGrid}>
                <TrendMetric label="Avg/day" value={trend.averageCalories ? `${formatNumber(trend.averageCalories)} kcal` : '--'} colors={colors} />
                <TrendMetric label="Net" value={`${trend.netBalance >= 0 ? '+' : ''}${formatNumber(trend.netBalance)} kcal`} colors={colors} />
                <TrendMetric label="Scale est." value={formatWeightDelta(trend.projectedWeightChangeKg, unitSystem)} colors={colors} />
            </View>
            <Text style={[styles.trendInsightText, { color: colors.textSecondary }]}>{trend.message}</Text>
        </Card>
    );
}

function WaterTrendSlide({
    days,
    trend,
    waterTarget,
    colors,
}: {
    days: NutritionTrendDay[];
    trend: WaterTrendInsight;
    waterTarget: number;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <Card style={{ ...styles.dashboardSlide, ...styles.trendSlide }}>
            <View style={styles.trendHeader}>
                <View style={styles.trendHeaderCopy}>
                    <Text style={[styles.slideTitle, { color: colors.text }]}>Water Rhythm</Text>
                    <Text style={[styles.trendSubtext, { color: colors.textTertiary }]}>Hydration consistency makes hunger and weigh-ins easier to read.</Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: colors.analytics + '18', borderColor: colors.analytics + '28' }]}>
                    <Text style={[styles.trendPillValue, { color: colors.analytics }]}>{trend.hitDays}/7</Text>
                    <Text style={[styles.trendPillLabel, { color: colors.textTertiary }]}>hit</Text>
                </View>
            </View>

            <View style={styles.waterRhythmRow}>
                {days.map((day, index) => {
                    const ratio = Math.min(day.waterRatio, 1.25);
                    return (
                        <View key={`${day.date}-${index}`} style={styles.waterDayColumn}>
                            <View style={[styles.waterBottle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View
                                    style={[
                                        styles.waterBottleFill,
                                        {
                                            height: `${Math.max(8, ratio * 100)}%`,
                                            backgroundColor: day.waterMl >= waterTarget ? colors.analytics : colors.analytics + '88',
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.trendDayLabel, { color: colors.textTertiary }]}>{day.label.slice(0, 1)}</Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.trendMetricGrid}>
                <TrendMetric label="Avg/day" value={`${formatNumber(trend.averageWaterMl)} ml`} colors={colors} />
                <TrendMetric label="Gap" value={trend.averageGapMl ? `${formatNumber(trend.averageGapMl)} ml` : '0 ml'} colors={colors} />
                <TrendMetric label="Best streak" value={`${trend.bestStreak}d`} colors={colors} />
            </View>
            <Text style={[styles.trendInsightText, { color: colors.textSecondary }]}>{trend.message}</Text>
        </Card>
    );
}

function TrendMetric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[styles.trendMetric, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.trendMetricValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[styles.trendMetricLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function formatWeightDelta(kg: number, unitSystem?: 'metric' | 'imperial' | null, showSign = true) {
    const value = displayWeightFromKg(kg, unitSystem);
    const prefix = showSign && value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)} ${getWeightUnit(unitSystem)}`;
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

function DraggableFoodEntry({
    entry,
    colors,
    onMoveEntry,
    onRemoveEntry,
    onDragStart,
    onDragMove,
    onDragEnd,
}: {
    entry: FoodLogEntry;
    colors: ReturnType<typeof useTheme>['colors'];
    onMoveEntry: (entryId: string, mealType: MealType) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string) => void;
    onDragMove: (pageY: number) => void;
    onDragEnd: (pageY: number) => void;
}) {
    const drag = React.useRef(new Animated.ValueXY()).current;
    const [isDragging, setIsDragging] = React.useState(false);

    const resetDrag = React.useCallback(() => {
        Animated.spring(drag, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            speed: 22,
            bounciness: 4,
        }).start(() => setIsDragging(false));
    }, [drag]);

    const panResponder = React.useMemo(
        () => PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_event, gesture) =>
                Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderGrant: () => {
                drag.setValue({ x: 0, y: 0 });
                setIsDragging(true);
                onDragStart(entry.id);
            },
            onPanResponderMove: (_event, gesture) => {
                drag.setValue({ x: 0, y: gesture.dy });
                onDragMove(gesture.moveY);
            },
            onPanResponderRelease: (_event, gesture) => {
                onDragEnd(gesture.moveY);
                resetDrag();
            },
            onPanResponderTerminate: () => {
                onDragEnd(-1);
                resetDrag();
            },
        }),
        [drag, entry.id, onDragEnd, onDragMove, onDragStart, resetDrag]
    );

    return (
        <Animated.View
            style={[
                styles.foodEntry,
                isDragging && styles.foodEntryDragging,
                isDragging && {
                    backgroundColor: colors.primary + '14',
                    borderColor: colors.primary,
                    transform: drag.getTranslateTransform(),
                },
            ]}
        >
            <View style={styles.foodDragHandle} {...panResponder.panHandlers}>
                <Ionicons name="reorder-three" size={18} color={colors.textTertiary} />
            </View>
            {entry.photo_uri ? (
                <Image source={{ uri: entry.photo_uri }} style={styles.foodPhotoThumb} resizeMode="cover" />
            ) : null}
            <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{entry.food_item.name}</Text>
                <Text style={styles.foodMacros}>
                    {entry.servings} serving • P: {entry.protein_g}g • C:{' '}
                    {entry.carbs_g}g • F: {entry.fat_g}g
                </Text>
                {entry.notes ? (
                    <Text style={styles.foodNotes} numberOfLines={2}>{entry.notes}</Text>
                ) : null}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.moveMealRow}
                >
                    {MEAL_ORDER.map((targetMeal) => {
                        const active = entry.meal_type === targetMeal;
                        return (
                            <TouchableOpacity
                                key={targetMeal}
                                style={[
                                    styles.moveMealChip,
                                    { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '22' : colors.surfaceLight },
                                ]}
                                onPress={() => onMoveEntry(entry.id, targetMeal)}
                            >
                                <Text style={styles.moveMealEmoji}>{MEAL_ICONS[targetMeal]}</Text>
                                <Text style={[styles.moveMealText, { color: active ? colors.primary : colors.textTertiary }]}>
                                    {targetMeal}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
            <View style={styles.foodTrailing}>
                <Text style={styles.foodCalories}>{entry.calories}</Text>
                <TouchableOpacity onPress={() => onRemoveEntry(entry.id)}>
                    <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
            </View>
        </Animated.View>
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
        minHeight: 284,
    },
    trendSlide: {
        minHeight: 284,
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
    todaySignalRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    todaySignal: {
        flex: 1,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    todaySignalValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    todaySignalLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        marginTop: 1,
    },
    todaySignalCaption: {
        fontSize: FontSize.xxs,
        marginTop: 2,
    },
    trendHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    trendHeaderCopy: {
        flex: 1,
    },
    trendSubtext: {
        fontSize: FontSize.xs,
        lineHeight: 17,
        marginTop: -Spacing.sm,
    },
    trendPill: {
        minWidth: 72,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
    },
    trendPillValue: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    trendPillLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        marginTop: -1,
    },
    weightPlot: {
        height: 96,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.sm,
        paddingBottom: 20,
        marginBottom: Spacing.md,
    },
    weightPointColumn: {
        flex: 1,
        alignItems: 'center',
    },
    weightPointRail: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    weightPoint: {
        position: 'absolute',
        alignSelf: 'center',
        width: 12,
        height: 12,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
    },
    trendDayLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        marginTop: 4,
    },
    trendEmptyBox: {
        minHeight: 96,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    trendEmptyText: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 18,
    },
    trendMetricGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    trendMetric: {
        flex: 1,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    trendMetricValue: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    trendMetricLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    trendInsightText: {
        fontSize: FontSize.sm,
        lineHeight: 19,
    },
    calorieChartRow: {
        height: 104,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    calorieDayColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    calorieTrack: {
        width: '100%',
        height: 82,
        borderRadius: BorderRadius.full,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        position: 'relative',
    },
    calorieTargetLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.65,
        zIndex: 2,
    },
    calorieFill: {
        width: '100%',
        borderRadius: BorderRadius.full,
    },
    waterRhythmRow: {
        height: 104,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    waterDayColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    waterBottle: {
        width: '100%',
        height: 82,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    waterBottleFill: {
        width: '100%',
        borderTopLeftRadius: BorderRadius.md,
        borderTopRightRadius: BorderRadius.md,
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
    mealCardDropActive: {
        borderWidth: 1.5,
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
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
    },
    foodEntryDragging: {
        zIndex: 20,
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    foodDragHandle: {
        width: 20,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodPhotoThumb: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
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
    foodNotes: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        marginTop: Spacing.xs,
        lineHeight: 16,
    },
    moveMealRow: {
        gap: Spacing.xs,
        paddingTop: Spacing.sm,
        paddingRight: Spacing.md,
    },
    moveMealChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    moveMealEmoji: {
        fontSize: 12,
    },
    moveMealText: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.semibold,
        textTransform: 'capitalize',
    },
    foodCalories: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    foodTrailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
