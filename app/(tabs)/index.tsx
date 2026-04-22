import { Card, MacroBar, ProgressRing } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateDailyInsight } from '@/lib/aiEngine';
import { formatNumber, getGreeting, getPercentage } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const todaySummary = useNutritionStore((s) => s.todaySummary);
    const logWater = useNutritionStore((s) => s.logWater);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const recoveryLogs = useRecoveryStore((s) => s.recoveryLogs);

    const [aiInsight, setAiInsight] = useState<{ text: string; type: string } | null>(null);

    // Defaults for demo
    const calorieTarget = user?.daily_calorie_target || 2200;
    const proteinTarget = user?.protein_target_g || 165;
    const carbsTarget = user?.carbs_target_g || 220;
    const fatTarget = user?.fat_target_g || 73;
    const waterTarget = user?.water_goal_ml || 2500;
    const streak = user?.streak_count || 0;
    const displayName = user?.display_name || 'Athlete';

    const caloriesPct = getPercentage(todaySummary.total_calories, calorieTarget);
    const caloriesRemaining = Math.max(calorieTarget - todaySummary.total_calories, 0);

    // Generate AI insight
    useEffect(() => {
        const lastRecovery = recoveryLogs[recoveryLogs.length - 1];
        generateDailyInsight({
            name: displayName,
            calorieTarget,
            todayCalories: todaySummary.total_calories,
            proteinTarget,
            todayProtein: todaySummary.total_protein_g,
            streak,
            lastWorkout: recentWorkouts[0]?.name,
            recoveryScore: lastRecovery?.recovery_score,
            goal: user?.goal || 'maintain',
        }).then(setAiInsight).catch(() => { });
    }, [todaySummary.total_calories, todaySummary.total_protein_g, streak]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.name}>{displayName} 👋</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.streakBadge}>
                            <Text style={styles.streakIcon}>🔥</Text>
                            <Text style={styles.streakCount}>{streak}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.notifButton}>
                            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calorie Ring Card */}
                <Card style={styles.calorieCard}>
                    <View style={styles.calorieRow}>
                        <ProgressRing
                            progress={caloriesPct}
                            size={130}
                            strokeWidth={10}
                            color={Colors.calories}
                            value={formatNumber(caloriesRemaining)}
                            label="remaining"
                            sublabel="kcal"
                        />
                        <View style={styles.calorieDetails}>
                            <View style={styles.calorieItem}>
                                <Text style={styles.calorieItemLabel}>Eaten</Text>
                                <Text style={styles.calorieItemValue}>
                                    {formatNumber(todaySummary.total_calories)}
                                </Text>
                            </View>
                            <View style={styles.calorieDivider} />
                            <View style={styles.calorieItem}>
                                <Text style={styles.calorieItemLabel}>Target</Text>
                                <Text style={styles.calorieItemValue}>
                                    {formatNumber(calorieTarget)}
                                </Text>
                            </View>
                            <View style={styles.calorieDivider} />
                            <View style={styles.calorieItem}>
                                <Text style={styles.calorieItemLabel}>Burned</Text>
                                <Text style={styles.calorieItemValue}>0</Text>
                            </View>
                        </View>
                    </View>

                    {/* Macro bars */}
                    <View style={styles.macros}>
                        <MacroBar
                            label="Protein"
                            current={todaySummary.total_protein_g}
                            target={proteinTarget}
                            color={Colors.protein}
                        />
                        <MacroBar
                            label="Carbs"
                            current={todaySummary.total_carbs_g}
                            target={carbsTarget}
                            color={Colors.carbs}
                        />
                        <MacroBar
                            label="Fat"
                            current={todaySummary.total_fat_g}
                            target={fatTarget}
                            color={Colors.fat}
                        />
                    </View>
                </Card>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/workout/active')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary + '15' }]}>
                            <Ionicons name="barbell" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.quickActionText}>Start{'\n'}Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/(tabs)/nutrition')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: Colors.protein + '15' }]}>
                            <Ionicons name="restaurant" size={24} color={Colors.protein} />
                        </View>
                        <Text style={styles.quickActionText}>Log{'\n'}Food</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/(tabs)/progress')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: Colors.success + '15' }]}>
                            <Ionicons name="scale" size={24} color={Colors.success} />
                        </View>
                        <Text style={styles.quickActionText}>Log{'\n'}Weight</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction} onPress={() => logWater(250)}>
                        <View style={[styles.quickActionIcon, { backgroundColor: Colors.secondary + '15' }]}>
                            <Ionicons name="water" size={24} color={Colors.secondary} />
                        </View>
                        <Text style={styles.quickActionText}>Log{'\n'}Water</Text>
                    </TouchableOpacity>
                </View>

                {/* Water Tracker Mini */}
                <Card title="Water Intake" style={styles.waterCard}>
                    <View style={styles.waterContent}>
                        <View style={styles.waterInfo}>
                            <Text style={styles.waterAmount}>
                                {todaySummary.water_ml} <Text style={styles.waterUnit}>ml</Text>
                            </Text>
                            <Text style={styles.waterTarget}>of {waterTarget} ml</Text>
                        </View>
                        <View style={styles.waterGlasses}>
                            {Array.from({ length: 8 }).map((_, i) => {
                                const filled = todaySummary.water_ml >= (i + 1) * (waterTarget / 8);
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.waterGlass,
                                            filled && styles.waterGlassFilled,
                                        ]}
                                    >
                                        <Ionicons
                                            name="water"
                                            size={16}
                                            color={filled ? Colors.secondary : Colors.textTertiary}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </Card>

                {/* Recent Workouts */}
                <Text style={styles.sectionTitle}>Recent Workouts</Text>
                {recentWorkouts.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Ionicons name="barbell-outline" size={40} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>No workouts yet</Text>
                            <Text style={styles.emptySubtext}>Start your first workout to see it here</Text>
                        </View>
                    </Card>
                ) : (
                    recentWorkouts.slice(0, 3).map((workout) => (
                        <Card key={workout.id} style={styles.workoutCard}>
                            <View style={styles.workoutRow}>
                                <View style={styles.workoutIcon}>
                                    <Ionicons name="barbell" size={20} color={Colors.primary} />
                                </View>
                                <View style={styles.workoutInfo}>
                                    <Text style={styles.workoutName}>{workout.name}</Text>
                                    <Text style={styles.workoutMeta}>
                                        {workout.exercises.length} exercises • {Math.round((workout.duration_seconds || 0) / 60)}min
                                    </Text>
                                </View>
                                <Text style={styles.workoutVolume}>
                                    {formatNumber(workout.total_volume_kg)} kg
                                </Text>
                            </View>
                        </Card>
                    ))
                )}

                {/* Explore More */}
                <Text style={styles.sectionTitle}>Explore</Text>
                <View style={styles.exploreGrid}>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/recovery')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.recovery + '15' }]}>
                            <Ionicons name="heart" size={22} color={Colors.recovery} />
                        </View>
                        <Text style={styles.exploreLabel}>Recovery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/achievements')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.achievements + '15' }]}>
                            <Ionicons name="trophy" size={22} color={Colors.achievements} />
                        </View>
                        <Text style={styles.exploreLabel}>Achievements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/analytics')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.analytics + '15' }]}>
                            <Ionicons name="analytics" size={22} color={Colors.analytics} />
                        </View>
                        <Text style={styles.exploreLabel}>Analytics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/nutrition/fasting')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.fasting + '15' }]}>
                            <Ionicons name="timer" size={22} color={Colors.fasting} />
                        </View>
                        <Text style={styles.exploreLabel}>Fasting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/nutrition/recipes')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.recipes + '15' }]}>
                            <Ionicons name="restaurant" size={22} color={Colors.recipes} />
                        </View>
                        <Text style={styles.exploreLabel}>Recipes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/recovery/supplements')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.supplements + '15' }]}>
                            <Ionicons name="medical" size={22} color={Colors.supplements} />
                        </View>
                        <Text style={styles.exploreLabel}>Supplements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/nutrition/meal-plan')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.mealPlan + '15' }]}>
                            <Ionicons name="calendar" size={22} color={Colors.mealPlan} />
                        </View>
                        <Text style={styles.exploreLabel}>Meal Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/progress/body-composition')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.bodyComp + '15' }]}>
                            <Ionicons name="body" size={22} color={Colors.bodyComp} />
                        </View>
                        <Text style={styles.exploreLabel}>Body Comp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exploreItem} onPress={() => router.push('/nutrition/micronutrients')}>
                        <View style={[styles.exploreIcon, { backgroundColor: Colors.micros + '15' }]}>
                            <Ionicons name="flask" size={22} color={Colors.micros} />
                        </View>
                        <Text style={styles.exploreLabel}>Micros</Text>
                    </TouchableOpacity>
                </View>

                {/* AI Insight Card */}
                <Card style={styles.aiCard}>
                    <View style={styles.aiHeader}>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>✨ AI</Text>
                        </View>
                        <Text style={styles.aiTitle}>Daily Insight</Text>
                    </View>
                    <Text style={styles.aiContent}>
                        {aiInsight?.text || 'Start logging your meals and workouts to get personalized AI insights about your nutrition, recovery, and performance.'}
                    </Text>
                    <View style={styles.aiActions}>
                        <TouchableOpacity style={styles.aiCta} onPress={() => router.push('/chat')}>
                            <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                            <Text style={styles.aiCtaText}>AI Coach</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiCta} onPress={() => router.push('/ai-workout' as any)}>
                            <Ionicons name="barbell-outline" size={14} color={Colors.primary} />
                            <Text style={styles.aiCtaText}>AI Workout</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiCta} onPress={() => router.push('/ai-meal-plan' as any)}>
                            <Ionicons name="restaurant-outline" size={14} color={Colors.primary} />
                            <Text style={styles.aiCtaText}>AI Meals</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiCta} onPress={() => router.push('/weekly-report' as any)}>
                            <Ionicons name="analytics-outline" size={14} color={Colors.primary} />
                            <Text style={styles.aiCtaText}>Report</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    greeting: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        fontWeight: FontWeight.medium,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        letterSpacing: -0.3,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    streakIcon: {
        fontSize: 14,
    },
    streakCount: {
        color: Colors.text,
        fontWeight: FontWeight.bold,
        fontSize: FontSize.sm,
    },
    notifButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },

    // Calorie card
    calorieCard: {
        marginBottom: Spacing.xl,
    },
    calorieRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xl,
    },
    calorieDetails: {
        flex: 1,
        gap: Spacing.md,
    },
    calorieItem: {},
    calorieItemLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    calorieItemValue: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    calorieDivider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    macros: {
        marginTop: Spacing.xl,
    },

    // Quick actions
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
        letterSpacing: 0.1,
    },
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    quickAction: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickActionIcon: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    quickActionText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xxs,
        textAlign: 'center',
        fontWeight: FontWeight.medium,
        lineHeight: 14,
    },

    // Water
    waterCard: {
        marginBottom: Spacing.xl,
    },
    waterContent: {
        gap: Spacing.md,
    },
    waterInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.sm,
    },
    waterAmount: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
    },
    waterUnit: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.regular,
    },
    waterTarget: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },
    waterGlasses: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    waterGlass: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waterGlassFilled: {
        backgroundColor: Colors.primary + '18',
    },

    // Empty state
    emptyCard: {
        marginBottom: Spacing.xl,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        gap: Spacing.sm,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    emptySubtext: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },

    // Workout cards
    workoutCard: {
        marginBottom: Spacing.md,
    },
    workoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    workoutIcon: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    workoutMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    workoutVolume: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },

    // AI Card
    aiCard: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
        borderColor: Colors.primary + '30',
        borderWidth: 1,
        backgroundColor: Colors.surfaceLight,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    aiBadge: {
        backgroundColor: Colors.primary + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.xs,
    },
    aiBadgeText: {
        color: Colors.primary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.5,
    },
    aiTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    aiContent: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    aiCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    aiCtaText: {
        color: Colors.primary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.semibold,
    },
    aiActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },

    // Explore grid
    exploreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    exploreItem: {
        width: (width - Spacing.xl * 2 - Spacing.sm * 2) / 3,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    exploreIcon: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    exploreLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.medium,
        textAlign: 'center',
    },
});
