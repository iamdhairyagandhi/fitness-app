import { Card, MacroBar, ProgressRing } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatNumber, getGreeting, getPercentage } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
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
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);

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
                        <View style={[styles.quickActionIcon, { backgroundColor: '#6C5CE720' }]}>
                            <Ionicons name="barbell" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.quickActionText}>Start{'\n'}Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/(tabs)/nutrition')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B6B20' }]}>
                            <Ionicons name="restaurant" size={24} color={Colors.accent} />
                        </View>
                        <Text style={styles.quickActionText}>Log{'\n'}Food</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/(tabs)/progress')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#00CECE20' }]}>
                            <Ionicons name="scale" size={24} color={Colors.secondary} />
                        </View>
                        <Text style={styles.quickActionText}>Log{'\n'}Weight</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#FDCB6E20' }]}>
                            <Ionicons name="water" size={24} color={Colors.warning} />
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

                {/* AI Insight Card */}
                <Card style={styles.aiCard}>
                    <View style={styles.aiHeader}>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>✨ AI</Text>
                        </View>
                        <Text style={styles.aiTitle}>Daily Insight</Text>
                    </View>
                    <Text style={styles.aiContent}>
                        Start logging your meals and workouts to get personalized AI insights
                        about your nutrition timing, recovery, and performance patterns.
                    </Text>
                    <TouchableOpacity style={styles.aiCta} onPress={() => router.push('/chat')}>
                        <Text style={styles.aiCtaText}>Chat with AI Coach</Text>
                        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </TouchableOpacity>
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
    greeting: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    streakIcon: {
        fontSize: 16,
    },
    streakCount: {
        color: Colors.text,
        fontWeight: FontWeight.bold,
        fontSize: FontSize.md,
    },
    notifButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
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
        marginTop: Spacing.sm,
    },
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.md,
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
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    quickActionText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        textAlign: 'center',
        fontWeight: FontWeight.medium,
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
        backgroundColor: '#00CECE20',
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
        backgroundColor: '#6C5CE720',
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
        borderColor: Colors.primaryDark,
        borderWidth: 1,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    aiBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    aiBadgeText: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
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
    },
    aiCtaText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
});
