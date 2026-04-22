import { Button, Card, Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import type { Goal, WeightEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const {
        weightEntries,
        goals,
        progressPhotos,
        addWeightEntry,
        addGoal,
    } = useProgressStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'photos' | 'goals'>('overview');
    const [showWeightInput, setShowWeightInput] = useState(false);
    const [weightInput, setWeightInput] = useState('');

    const latestWeight = weightEntries[0]?.weight_kg || user?.current_weight_kg || 0;
    const isImperial = user?.unit_system === 'imperial';

    const handleLogWeight = () => {
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0 || weight > 500) {
            Alert.alert('Invalid weight', 'Please enter a valid weight');
            return;
        }

        const entry: WeightEntry = {
            id: generateId(),
            user_id: '',
            weight_kg: weight,
            body_fat_pct: null,
            logged_at: new Date().toISOString(),
            notes: null,
        };
        addWeightEntry(entry);
        setWeightInput('');
        setShowWeightInput(false);
    };

    // Generate mock chart data
    const chartData = weightEntries.length > 0
        ? weightEntries.slice(0, 14).reverse()
        : Array.from({ length: 14 }, (_, i) => ({
            id: `mock-${i}`,
            user_id: '',
            weight_kg: 80 - Math.random() * 2 + Math.sin(i / 3) * 1.5,
            body_fat_pct: null,
            logged_at: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
            notes: null,
        }));

    const maxWeight = Math.max(...chartData.map((d) => d.weight_kg));
    const minWeight = Math.min(...chartData.map((d) => d.weight_kg));
    const range = maxWeight - minWeight || 1;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Progress</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/progress/photos')}>
                        <Ionicons name="camera-outline" size={22} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabs}>
                    {(['overview', 'weight', 'photos', 'goals'] as const).map((tab) => (
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

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <View>
                        {/* Weight Summary Card */}
                        <Card style={styles.weightSummary}>
                            <View style={styles.weightHeader}>
                                <View>
                                    <Text style={styles.weightLabel}>Current Weight</Text>
                                    <Text style={styles.weightValue}>
                                        {latestWeight.toFixed(1)}{' '}
                                        <Text style={styles.weightUnit}>kg</Text>
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.logWeightBtn}
                                    onPress={() => setShowWeightInput(!showWeightInput)}
                                >
                                    <Ionicons name="add" size={20} color={Colors.primary} />
                                    <Text style={styles.logWeightText}>Log</Text>
                                </TouchableOpacity>
                            </View>

                            {showWeightInput && (
                                <View style={styles.weightInputRow}>
                                    <Input
                                        placeholder="Weight in kg"
                                        value={weightInput}
                                        onChangeText={setWeightInput}
                                        keyboardType="decimal-pad"
                                        containerStyle={{ flex: 1, marginBottom: 0 }}
                                    />
                                    <Button
                                        title="Save"
                                        onPress={handleLogWeight}
                                        size="sm"
                                        fullWidth={false}
                                        style={{ marginTop: 0 }}
                                    />
                                </View>
                            )}

                            {/* Mini Chart */}
                            <View style={styles.chart}>
                                <View style={styles.chartBars}>
                                    {chartData.map((entry, i) => {
                                        const height = ((entry.weight_kg - minWeight) / range) * 80 + 10;
                                        return (
                                            <View key={i} style={styles.chartBarContainer}>
                                                <View
                                                    style={[
                                                        styles.chartBar,
                                                        {
                                                            height,
                                                            backgroundColor:
                                                                i === chartData.length - 1
                                                                    ? Colors.primary
                                                                    : Colors.surfaceLight,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                                <View style={styles.chartLabels}>
                                    <Text style={styles.chartLabel}>
                                        {new Date(chartData[0]?.logged_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </Text>
                                    <Text style={styles.chartLabel}>Today</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <Card style={styles.statCard}>
                                <Text style={styles.statEmoji}>📏</Text>
                                <Text style={styles.statValue}>0</Text>
                                <Text style={styles.statLabel}>Measurements</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statEmoji}>📸</Text>
                                <Text style={styles.statValue}>{progressPhotos.length}</Text>
                                <Text style={styles.statLabel}>Photos</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statEmoji}>🎯</Text>
                                <Text style={styles.statValue}>
                                    {goals.filter((g) => g.status === 'active').length}
                                </Text>
                                <Text style={styles.statLabel}>Active Goals</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statEmoji}>🏆</Text>
                                <Text style={styles.statValue}>
                                    {goals.filter((g) => g.status === 'completed').length}
                                </Text>
                                <Text style={styles.statLabel}>Achieved</Text>
                            </Card>
                        </View>

                        {/* Active Goals */}
                        <Text style={styles.sectionTitle}>Active Goals</Text>
                        {goals.filter((g) => g.status === 'active').length === 0 ? (
                            <Card style={styles.emptyCard}>
                                <View style={styles.emptyContent}>
                                    <Ionicons name="flag-outline" size={36} color={Colors.textTertiary} />
                                    <Text style={styles.emptyText}>No active goals</Text>
                                    <Button
                                        title="Set a Goal"
                                        onPress={() => setActiveTab('goals')}
                                        variant="outline"
                                        size="sm"
                                        fullWidth={false}
                                    />
                                </View>
                            </Card>
                        ) : (
                            goals
                                .filter((g) => g.status === 'active')
                                .map((goal) => {
                                    const pct = Math.min(
                                        (goal.current_value / goal.target_value) * 100,
                                        100
                                    );
                                    return (
                                        <Card key={goal.id} style={styles.goalCard}>
                                            <Text style={styles.goalTitle}>{goal.title}</Text>
                                            <View style={styles.goalProgress}>
                                                <View style={styles.goalBarBg}>
                                                    <View
                                                        style={[
                                                            styles.goalBarFill,
                                                            { width: `${pct}%` },
                                                        ]}
                                                    />
                                                </View>
                                                <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
                                            </View>
                                            <Text style={styles.goalMeta}>
                                                {goal.current_value} / {goal.target_value} {goal.unit}
                                            </Text>
                                        </Card>
                                    );
                                })
                        )}
                    </View>
                )}

                {/* Weight Tab */}
                {activeTab === 'weight' && (
                    <View>
                        <Button
                            title="+ Log Today's Weight"
                            onPress={() => setShowWeightInput(true)}
                            variant="outline"
                            style={{ marginBottom: Spacing.lg }}
                        />

                        {showWeightInput && (
                            <Card style={{ marginBottom: Spacing.lg }}>
                                <View style={styles.weightInputRow}>
                                    <Input
                                        placeholder="Weight in kg"
                                        value={weightInput}
                                        onChangeText={setWeightInput}
                                        keyboardType="decimal-pad"
                                        containerStyle={{ flex: 1, marginBottom: 0 }}
                                    />
                                    <Button
                                        title="Save"
                                        onPress={handleLogWeight}
                                        size="sm"
                                        fullWidth={false}
                                    />
                                </View>
                            </Card>
                        )}

                        <Text style={styles.sectionTitle}>Weight History</Text>
                        {weightEntries.length === 0 ? (
                            <Text style={styles.emptyNote}>
                                Start logging your weight to see trends over time
                            </Text>
                        ) : (
                            weightEntries.map((entry) => (
                                <View key={entry.id} style={styles.weightRow}>
                                    <View>
                                        <Text style={styles.weightRowValue}>
                                            {entry.weight_kg.toFixed(1)} kg
                                        </Text>
                                        <Text style={styles.weightRowDate}>
                                            {new Date(entry.logged_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Photos Tab */}
                {activeTab === 'photos' && (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>Progress Photos</Text>
                        <Text style={styles.emptySubtext}>
                            Take regular progress photos to visualize your transformation
                        </Text>
                        <Button
                            title="📸 Take Progress Photo"
                            onPress={() => router.push('/progress/photos')}
                            variant="primary"
                            fullWidth={false}
                            style={{ marginTop: Spacing.lg }}
                        />
                        <Button
                            title="📏 Log Measurements"
                            onPress={() => router.push('/progress/measurements')}
                            variant="outline"
                            fullWidth={false}
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                )}

                {/* Goals Tab */}
                {activeTab === 'goals' && (
                    <View>
                        <Button
                            title="+ Create New Goal"
                            onPress={() => router.push('/progress/create-goal')}
                            variant="outline"
                            style={{ marginBottom: Spacing.lg }}
                        />

                        {goals.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No goals yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Create goals to stay motivated and track your progress
                                </Text>
                            </View>
                        ) : (
                            goals.map((goal) => {
                                const pct = Math.min(
                                    (goal.current_value / goal.target_value) * 100,
                                    100
                                );
                                return (
                                    <Card key={goal.id} style={styles.goalCard}>
                                        <View style={styles.goalHeader}>
                                            <Text style={styles.goalTitle}>{goal.title}</Text>
                                            <View
                                                style={[
                                                    styles.goalStatus,
                                                    goal.status === 'completed' && styles.goalStatusComplete,
                                                ]}
                                            >
                                                <Text style={styles.goalStatusText}>{goal.status}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.goalProgress}>
                                            <View style={styles.goalBarBg}>
                                                <View
                                                    style={[styles.goalBarFill, { width: `${pct}%` }]}
                                                />
                                            </View>
                                            <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
                                        </View>
                                        <Text style={styles.goalMeta}>
                                            {goal.current_value} / {goal.target_value} {goal.unit}
                                        </Text>
                                    </Card>
                                );
                            })
                        )}
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
    tabs: {
        flexDirection: 'row',
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
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    tabTextActive: {
        color: Colors.text,
    },

    // Weight summary
    weightSummary: {
        marginBottom: Spacing.lg,
    },
    weightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    weightLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
    weightValue: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
    },
    weightUnit: {
        color: Colors.textTertiary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.regular,
    },
    logWeightBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    logWeightText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    weightInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    chart: {
        marginTop: Spacing.lg,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 100,
    },
    chartBarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: 8,
        borderRadius: 4,
        minHeight: 4,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    chartLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statCard: {
        width: (width - Spacing.lg * 2 - Spacing.md) / 2 - 1,
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    statEmoji: {
        fontSize: 24,
        marginBottom: Spacing.sm,
    },
    statValue: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
    },
    statLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },

    // Section
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },

    // Goals
    goalCard: {
        marginBottom: Spacing.md,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    goalTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    goalStatus: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    goalStatusComplete: {
        backgroundColor: '#00B89420',
    },
    goalStatusText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        textTransform: 'capitalize',
    },
    goalProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.xs,
    },
    goalBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    goalBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
    },
    goalPct: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        width: 40,
        textAlign: 'right',
    },
    goalMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },

    // Empty
    emptyCard: {
        marginBottom: Spacing.lg,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        gap: Spacing.md,
    },
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
        textAlign: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    emptyNote: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        fontStyle: 'italic',
    },

    // Weight rows
    weightRow: {
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    weightRowValue: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },
    weightRowDate: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
});
