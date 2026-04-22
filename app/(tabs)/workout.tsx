import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatDurationLong, formatNumber } from '@/lib/utils';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SAMPLE_TEMPLATES = [
    {
        id: '1',
        name: 'Push Day',
        description: 'Chest, Shoulders, Triceps',
        exercises: 6,
        duration: '45-60 min',
        emoji: '💪',
    },
    {
        id: '2',
        name: 'Pull Day',
        description: 'Back, Biceps, Rear Delts',
        exercises: 6,
        duration: '45-60 min',
        emoji: '🏋️',
    },
    {
        id: '3',
        name: 'Leg Day',
        description: 'Quads, Hamstrings, Glutes, Calves',
        exercises: 7,
        duration: '50-70 min',
        emoji: '🦵',
    },
    {
        id: '4',
        name: 'Upper Body',
        description: 'Full upper body workout',
        exercises: 8,
        duration: '50-65 min',
        emoji: '⚡',
    },
    {
        id: '5',
        name: 'Full Body',
        description: 'Hit every muscle group',
        exercises: 8,
        duration: '60-75 min',
        emoji: '🔥',
    },
];

export default function WorkoutScreen() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'exercises'>('templates');
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Workout</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {/* Start Workout CTA */}
            <View style={styles.ctaContainer}>
                <Button
                    title="🏋️  Start Empty Workout"
                    onPress={() => router.push('/workout/active')}
                    size="lg"
                />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabs}>
                {(['templates', 'history', 'exercises'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
                }
            >
                {/* Templates Tab */}
                {activeTab === 'templates' && (
                    <View>
                        <Text style={styles.sectionTitle}>Workout Templates</Text>
                        <Text style={styles.sectionSubtitle}>Tap a template to start, or create your own</Text>

                        {SAMPLE_TEMPLATES.map((template) => (
                            <TouchableOpacity
                                key={template.id}
                                style={styles.templateCard}
                                activeOpacity={0.7}
                                onPress={() => router.push('/workout/active')}
                            >
                                <Text style={styles.templateEmoji}>{template.emoji}</Text>
                                <View style={styles.templateInfo}>
                                    <Text style={styles.templateName}>{template.name}</Text>
                                    <Text style={styles.templateDesc}>{template.description}</Text>
                                    <View style={styles.templateMeta}>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="list" size={12} color={Colors.textTertiary} />
                                            <Text style={styles.metaText}>{template.exercises} exercises</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                                            <Text style={styles.metaText}>{template.duration}</Text>
                                        </View>
                                    </View>
                                </View>
                                <Ionicons name="play-circle" size={32} color={Colors.primary} />
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.createTemplate}>
                            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                            <Text style={styles.createTemplateText}>Create Custom Template</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <View>
                        {recentWorkouts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No workout history</Text>
                                <Text style={styles.emptySubtext}>
                                    Complete your first workout to see it here
                                </Text>
                            </View>
                        ) : (
                            recentWorkouts.map((workout) => (
                                <Card key={workout.id} style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <Text style={styles.historyName}>{workout.name}</Text>
                                        <Text style={styles.historyDate}>
                                            {new Date(workout.started_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyStats}>
                                        <View style={styles.historyStat}>
                                            <Text style={styles.historyStatValue}>
                                                {workout.exercises.length}
                                            </Text>
                                            <Text style={styles.historyStatLabel}>Exercises</Text>
                                        </View>
                                        <View style={styles.historyStat}>
                                            <Text style={styles.historyStatValue}>
                                                {formatDurationLong(workout.duration_seconds || 0)}
                                            </Text>
                                            <Text style={styles.historyStatLabel}>Duration</Text>
                                        </View>
                                        <View style={styles.historyStat}>
                                            <Text style={styles.historyStatValue}>
                                                {formatNumber(workout.total_volume_kg)} kg
                                            </Text>
                                            <Text style={styles.historyStatLabel}>Volume</Text>
                                        </View>
                                    </View>
                                </Card>
                            ))
                        )}
                    </View>
                )}

                {/* Exercises Tab */}
                {activeTab === 'exercises' && (
                    <View>
                        <Text style={styles.sectionTitle}>Exercise Library</Text>
                        <TouchableOpacity style={styles.searchBar}>
                            <Ionicons name="search" size={20} color={Colors.textTertiary} />
                            <Text style={styles.searchPlaceholder}>Search exercises...</Text>
                        </TouchableOpacity>

                        {/* Muscle group chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                        >
                            {['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'].map(
                                (group) => (
                                    <TouchableOpacity
                                        key={group}
                                        style={[styles.chip, group === 'All' && styles.chipActive]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                group === 'All' && styles.chipTextActive,
                                            ]}
                                        >
                                            {group}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            )}
                        </ScrollView>

                        {/* Sample exercises */}
                        {[
                            { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', icon: '🏋️' },
                            { name: 'Squat', muscle: 'Quads', equipment: 'Barbell', icon: '🦵' },
                            { name: 'Deadlift', muscle: 'Back', equipment: 'Barbell', icon: '💪' },
                            { name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', icon: '🏋️' },
                            { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', icon: '🏋️' },
                            { name: 'Pull-Up', muscle: 'Back', equipment: 'Bodyweight', icon: '🤸' },
                            { name: 'Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', icon: '💪' },
                            { name: 'Tricep Pushdown', muscle: 'Triceps', equipment: 'Cable', icon: '💪' },
                            { name: 'Leg Press', muscle: 'Quads', equipment: 'Machine', icon: '🦵' },
                            { name: 'Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', icon: '🏋️' },
                        ].map((exercise, i) => (
                            <TouchableOpacity key={i} style={styles.exerciseRow}>
                                <Text style={styles.exerciseEmoji}>{exercise.icon}</Text>
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                                    <Text style={styles.exerciseMeta}>
                                        {exercise.muscle} • {exercise.equipment}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ctaContainer: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    tabTextActive: {
        color: Colors.text,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.xs,
    },
    sectionSubtitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginBottom: Spacing.lg,
    },

    // Templates
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    templateEmoji: {
        fontSize: 32,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    templateDesc: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    templateMeta: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: Spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    createTemplate: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        marginTop: Spacing.sm,
    },
    createTemplateText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // History
    historyCard: {
        marginBottom: Spacing.md,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    historyName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    historyDate: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },
    historyStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    historyStat: {
        alignItems: 'center',
    },
    historyStatValue: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    historyStatLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },

    // Exercises
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginVertical: Spacing.md,
    },
    searchPlaceholder: {
        color: Colors.textTertiary,
        fontSize: FontSize.md,
    },
    chipScroll: {
        marginBottom: Spacing.lg,
    },
    chip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    chipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    chipTextActive: {
        color: Colors.text,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    exerciseEmoji: {
        fontSize: 24,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    exerciseMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.huge,
        gap: Spacing.md,
    },
    emptyTitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },
    emptySubtext: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },
});
