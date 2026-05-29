import { Button, Card, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { buildProgressAnalytics, type MeasurementDelta, type WeightTrendPoint } from '@/lib/progressAnalytics';
import { displayWeightFromKg, generateId, getWeightUnit, inputWeightToKg } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import type { Goal, WeightEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
type ProgressTab = 'overview' | 'weight' | 'photos' | 'goals';
type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { id: ProgressTab; label: string; icon: IconName }[] = [
    { id: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { id: 'weight', label: 'Weight', icon: 'trending-up-outline' },
    { id: 'photos', label: 'Photos', icon: 'images-outline' },
    { id: 'goals', label: 'Goals', icon: 'flag-outline' },
];

function withAlpha(color: string, opacity: number) {
    if (!color.startsWith('#') || color.length < 7) return color;
    const normalized = color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color.slice(0, 7);
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatShortDate(value: string) {
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatLength(cm: number, unitSystem?: 'metric' | 'imperial' | null) {
    if (unitSystem === 'imperial') return `${(cm / 2.54).toFixed(1)} in`;
    return `${cm.toFixed(1)} cm`;
}

function goalIcon(goalType: Goal['goal_type']): IconName {
    const icons: Record<Goal['goal_type'], IconName> = {
        weight: 'scale-outline',
        strength: 'barbell-outline',
        body_fat: 'body-outline',
        measurement: 'resize-outline',
        nutrition: 'nutrition-outline',
        workout_count: 'fitness-outline',
        streak: 'flame-outline',
        custom: 'flag-outline',
    };
    return icons[goalType];
}

function goalTypeLabel(goalType: Goal['goal_type']) {
    return goalType
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function ProgressScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const {
        weightEntries,
        measurements,
        goals,
        progressPhotos,
        addWeightEntry,
        updateGoal,
    } = useProgressStore();
    const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
    const [showWeightInput, setShowWeightInput] = useState(false);
    const [weightInput, setWeightInput] = useState('');

    const analytics = useMemo(
        () => buildProgressAnalytics({ weightEntries, measurements, progressPhotos, goals, user }),
        [goals, measurements, progressPhotos, user, weightEntries],
    );

    const recentPhotos = useMemo(
        () => [...progressPhotos].sort((a, b) => Date.parse(b.taken_at) - Date.parse(a.taken_at)).slice(0, 8),
        [progressPhotos],
    );

    const isImperial = user?.unit_system === 'imperial';
    const weightUnit = getWeightUnit(user?.unit_system);
    const displayWeight = analytics.currentWeightKg == null
        ? '--'
        : displayWeightFromKg(analytics.currentWeightKg, user?.unit_system).toFixed(1);

    const formatSignedWeight = (kg: number | null, decimals = 1) => {
        if (kg == null) return '--';
        const value = displayWeightFromKg(Math.abs(kg), user?.unit_system, decimals).toFixed(decimals);
        if (Math.abs(kg) < 0.05) return `0.0 ${weightUnit}`;
        return `${kg > 0 ? '+' : '-'}${value} ${weightUnit}`;
    };

    const formatPlainWeight = (kg: number | null, decimals = 1) => {
        if (kg == null) return '--';
        return `${displayWeightFromKg(kg, user?.unit_system, decimals).toFixed(decimals)} ${weightUnit}`;
    };

    const handleLogWeight = () => {
        const weight = parseFloat(weightInput);
        if (!Number.isFinite(weight) || weight <= 0 || weight > (isImperial ? 1100 : 500)) {
            toast.error('Invalid weight', 'Please enter a valid weight.');
            return;
        }

        const weightKg = inputWeightToKg(weight, user?.unit_system);
        const entry: WeightEntry = {
            id: generateId(),
            user_id: user?.id || '',
            weight_kg: weightKg,
            body_fat_pct: null,
            logged_at: new Date().toISOString(),
            notes: null,
        };

        addWeightEntry(entry);
        updateUser({ current_weight_kg: weightKg, weight_kg: weightKg });
        setWeightInput('');
        setShowWeightInput(false);
        toast.success('Weight logged', `${weight.toFixed(1)} ${weightUnit} saved to your progress trend.`);
    };

    const renderWeightInput = () => (
        <Card style={[styles.inlineInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.weightInputRow}>
                <Input
                    placeholder={`Weight in ${weightUnit}`}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    containerStyle={styles.weightInputContainer}
                />
                <Button title="Save" onPress={handleLogWeight} size="sm" fullWidth={false} style={styles.saveWeightButton} />
            </View>
        </Card>
    );

    const completeGoal = (goal: Goal) => {
        updateGoal(goal.id, {
            current_value: goal.target_value,
            status: 'completed',
            completed_at: new Date().toISOString(),
        });
    };

    const bumpGoal = (goal: Goal) => {
        const increment = Math.max(goal.target_value * 0.1, 1);
        const nextValue = Math.min(goal.current_value + increment, goal.target_value);
        updateGoal(goal.id, {
            current_value: Math.round(nextValue * 10) / 10,
            ...(nextValue >= goal.target_value
                ? { status: 'completed' as const, completed_at: new Date().toISOString() }
                : {}),
        });
    };

    const trendIcon: IconName = !analytics.trendKgPerWeek || Math.abs(analytics.trendKgPerWeek) < 0.05
        ? 'remove-outline'
        : analytics.trendKgPerWeek > 0
            ? 'trending-up-outline'
            : 'trending-down-outline';

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>BodyPilot progress</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => router.push('/progress/photos')}
                    >
                        <Ionicons name="camera-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabRail}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[
                                    styles.tab,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                                ]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <Ionicons name={tab.icon} size={15} color={isActive ? colors.textInverse : colors.textSecondary} />
                                <Text style={[styles.tabText, { color: isActive ? colors.textInverse : colors.textSecondary }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {activeTab === 'overview' && (
                    <View style={styles.tabContent}>
                        <Card
                            style={[
                                styles.heroCard,
                                {
                                    borderColor: withAlpha(colors.primary, 0.32),
                                    backgroundColor: colors.surface,
                                },
                            ]}
                        >
                            <View style={styles.heroTopRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.heroLabel, { color: colors.primary }]}>Current body trend</Text>
                                    <View style={styles.weightLine}>
                                        <Text style={[styles.heroWeight, { color: colors.text }]}>{displayWeight}</Text>
                                        {analytics.currentWeightKg != null && (
                                            <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>{weightUnit}</Text>
                                        )}
                                    </View>
                                    <Text style={[styles.heroCopy, { color: colors.textSecondary }]}>{analytics.statusDetail}</Text>
                                </View>
                                <View style={[styles.scoreBadge, { backgroundColor: withAlpha(colors.primary, 0.14), borderColor: withAlpha(colors.primary, 0.3) }]}>
                                    <Text style={[styles.scoreValue, { color: colors.text }]}>{analytics.checkInScore}</Text>
                                    <Text style={[styles.scoreLabel, { color: colors.primary }]}>score</Text>
                                </View>
                            </View>

                            <View style={styles.signalRow}>
                                <SignalPill
                                    icon={trendIcon}
                                    label="Trend"
                                    value={analytics.trendKgPerWeek == null ? 'Need logs' : `${formatSignedWeight(analytics.trendKgPerWeek)}/wk`}
                                    color={colors.primary}
                                />
                                <SignalPill
                                    icon="calendar-outline"
                                    label="14-day logs"
                                    value={`${analytics.weightLogsLast14}`}
                                    color={colors.analytics}
                                />
                                <SignalPill
                                    icon="flag-outline"
                                    label="Goal"
                                    value={analytics.priorityGoalPct == null ? 'Not set' : `${Math.round(analytics.priorityGoalPct)}%`}
                                    color={colors.recovery}
                                />
                            </View>

                            <WeightTrendChart
                                points={analytics.weightPoints}
                                unitSystem={user?.unit_system}
                                accent={colors.primary}
                                muted={colors.surfaceLight}
                                textColor={colors.textSecondary}
                                borderColor={colors.border}
                            />

                            <View style={[styles.nextStepCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                <View style={[styles.nextStepIcon, { backgroundColor: withAlpha(colors.primary, 0.16) }]}>
                                    <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.nextStepTitle, { color: colors.text }]}>{analytics.statusLabel}</Text>
                                    <Text style={[styles.nextStepText, { color: colors.textSecondary }]}>{analytics.recommendation}</Text>
                                </View>
                            </View>
                        </Card>

                        {showWeightInput && renderWeightInput()}

                        <View style={styles.actionGrid}>
                            <QuickAction
                                icon="add-circle-outline"
                                label="Log weight"
                                detail="Morning check-in"
                                color={colors.primary}
                                onPress={() => setShowWeightInput((value) => !value)}
                            />
                            <QuickAction
                                icon="body-outline"
                                label="Measurements"
                                detail="Waist, chest, hips"
                                color={colors.bodyComp}
                                onPress={() => router.push('/progress/measurements')}
                            />
                            <QuickAction
                                icon="camera-outline"
                                label="Photo set"
                                detail="Front / side / back"
                                color={colors.analytics}
                                onPress={() => router.push('/progress/photos')}
                            />
                            <QuickAction
                                icon="flag-outline"
                                label="Set goal"
                                detail="4-8 week target"
                                color={colors.recovery}
                                onPress={() => router.push('/progress/create-goal')}
                            />
                        </View>

                        <View style={styles.metricGrid}>
                            <MetricTile
                                icon="swap-vertical-outline"
                                label="Total change"
                                value={formatSignedWeight(analytics.totalChangeKg)}
                                detail={analytics.weightLogCount > 1 ? `${analytics.weightLogCount} weight logs` : 'Start logging'}
                                color={colors.primary}
                            />
                            <MetricTile
                                icon="pulse-outline"
                                label="Range"
                                value={formatPlainWeight(analytics.weightRangeKg)}
                                detail="Recent highs and lows"
                                color={colors.analytics}
                            />
                            <MetricTile
                                icon="body-outline"
                                label="Body fat"
                                value={analytics.bodyFatPct == null ? '--' : `${analytics.bodyFatPct.toFixed(1)}%`}
                                detail={analytics.bodyFatChangePct == null ? 'Add composition log' : `${analytics.bodyFatChangePct > 0 ? '+' : ''}${analytics.bodyFatChangePct.toFixed(1)}% change`}
                                color={colors.bodyComp}
                            />
                            <MetricTile
                                icon="images-outline"
                                label="Photo cadence"
                                value={analytics.daysSincePhoto == null ? '--' : `${analytics.daysSincePhoto}d`}
                                detail={analytics.photoCount ? `${analytics.photoCount} saved photos` : 'No photos yet'}
                                color={colors.recovery}
                            />
                        </View>

                        <SectionHeader
                            title="Body markers"
                            action="Log"
                            onPress={() => router.push('/progress/measurements')}
                        />
                        <Card style={[styles.bodyMarkersCard, { borderColor: colors.border }]}>
                            {analytics.measurementDeltas.length === 0 ? (
                                <EmptyInline
                                    icon="resize-outline"
                                    title="No measurements yet"
                                    text="Log a few body markers so the scale is not the only signal."
                                    action="Add measurements"
                                    onPress={() => router.push('/progress/measurements')}
                                />
                            ) : (
                                analytics.measurementDeltas.slice(0, 5).map((delta) => (
                                    <MeasurementRow key={delta.key} delta={delta} unitSystem={user?.unit_system} accent={colors.primary} />
                                ))
                            )}
                        </Card>

                        <SectionHeader
                            title="Goal lane"
                            action="Create"
                            onPress={() => router.push('/progress/create-goal')}
                        />
                        {analytics.activeGoals.length === 0 ? (
                            <Card style={[styles.emptyGoalCard, { borderColor: colors.border }]}>
                                <EmptyInline
                                    icon="flag-outline"
                                    title="Pick one measurable target"
                                    text="A clear goal makes every log easier to interpret."
                                    action="Create goal"
                                    onPress={() => router.push('/progress/create-goal')}
                                />
                            </Card>
                        ) : (
                            analytics.activeGoals.slice(0, 2).map((goal) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    accent={colors.primary}
                                    onBump={() => bumpGoal(goal)}
                                    onComplete={() => completeGoal(goal)}
                                />
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'weight' && (
                    <View style={styles.tabContent}>
                        <Card style={[styles.deepDiveCard, { borderColor: withAlpha(colors.primary, 0.28) }]}>
                            <View style={styles.deepDiveHeader}>
                                <View>
                                    <Text style={[styles.deepDiveLabel, { color: colors.primary }]}>Weight intelligence</Text>
                                    <Text style={[styles.deepDiveTitle, { color: colors.text }]}>
                                        {analytics.trendKgPerWeek == null ? 'Build your baseline' : `${formatSignedWeight(analytics.trendKgPerWeek)}/week`}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.smallPrimaryButton, { backgroundColor: colors.primary }]}
                                    onPress={() => setShowWeightInput((value) => !value)}
                                >
                                    <Ionicons name="add" size={18} color={colors.textInverse} />
                                    <Text style={[styles.smallPrimaryButtonText, { color: colors.textInverse }]}>Log</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.deepDiveText, { color: colors.textSecondary }]}>
                                {analytics.weightPoints.length < 3
                                    ? 'A useful scale trend needs a few check-ins. Add morning weigh-ins on separate days.'
                                    : 'Use weekly trend and range together. The trend shows direction; the range tells you how noisy the week was.'}
                            </Text>
                            <WeightTrendChart
                                points={analytics.weightPoints}
                                unitSystem={user?.unit_system}
                                accent={colors.primary}
                                muted={colors.surfaceLight}
                                textColor={colors.textSecondary}
                                borderColor={colors.border}
                                tall
                            />
                        </Card>

                        {showWeightInput && renderWeightInput()}

                        <View style={styles.weightStatsRow}>
                            <MiniStat label="Latest" value={formatPlainWeight(analytics.currentWeightKg)} />
                            <MiniStat label="Last log" value={formatSignedWeight(analytics.recentChangeKg)} />
                            <MiniStat label="Range" value={formatPlainWeight(analytics.weightRangeKg)} />
                        </View>

                        <SectionHeader title="Weight history" />
                        {weightEntries.length === 0 ? (
                            <Card style={{ borderColor: colors.border }}>
                                <EmptyInline
                                    icon="scale-outline"
                                    title="No weight logs yet"
                                    text="Log your first weight to unlock trend analysis."
                                    action="Log weight"
                                    onPress={() => setShowWeightInput(true)}
                                />
                            </Card>
                        ) : (
                            weightEntries.map((entry, index) => {
                                const previous = weightEntries[index + 1];
                                const diff = previous ? entry.weight_kg - previous.weight_kg : null;
                                return (
                                    <View key={entry.id} style={[styles.weightRow, { borderColor: colors.border }]}>
                                        <View style={[styles.weightRowIcon, { backgroundColor: index === 0 ? withAlpha(colors.primary, 0.16) : colors.surfaceLight }]}>
                                            <Ionicons name={index === 0 ? 'radio-button-on-outline' : 'ellipse-outline'} size={18} color={index === 0 ? colors.primary : colors.textTertiary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.weightRowValue, { color: colors.text }]}>
                                                {formatPlainWeight(entry.weight_kg)}
                                            </Text>
                                            <Text style={[styles.weightRowDate, { color: colors.textTertiary }]}>
                                                {formatShortDate(entry.logged_at)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.weightDeltaText, { color: diff == null ? colors.textTertiary : diff <= 0 ? colors.recovery : colors.accent }]}>
                                            {diff == null ? 'Start' : formatSignedWeight(diff)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                {activeTab === 'photos' && (
                    <View style={styles.tabContent}>
                        <Card style={[styles.photoHero, { borderColor: withAlpha(colors.analytics, 0.3) }]}>
                            <View style={styles.photoHeroContent}>
                                <View style={[styles.photoHeroIcon, { backgroundColor: withAlpha(colors.analytics, 0.16) }]}>
                                    <Ionicons name="camera-outline" size={24} color={colors.analytics} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.photoHeroTitle, { color: colors.text }]}>Monthly comparison sets</Text>
                                    <Text style={[styles.photoHeroText, { color: colors.textSecondary }]}>
                                        Take photos in the same light and pose. Compare photos with weight and measurement trend for a fuller picture.
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.photoActionRow}>
                                <Button
                                    title="Take Photo"
                                    onPress={() => router.push('/progress/photos')}
                                    fullWidth={false}
                                    style={styles.photoActionButton}
                                />
                                <Button
                                    title="Measurements"
                                    onPress={() => router.push('/progress/measurements')}
                                    variant="outline"
                                    fullWidth={false}
                                    style={styles.photoActionButton}
                                />
                            </View>
                        </Card>

                        <View style={styles.photoStatsGrid}>
                            <MetricTile
                                icon="images-outline"
                                label="Saved photos"
                                value={`${analytics.photoCount}`}
                                detail={analytics.daysSincePhoto == null ? 'No photo set' : `${analytics.daysSincePhoto} days since last`}
                                color={colors.analytics}
                            />
                            <MetricTile
                                icon="resize-outline"
                                label="Measurements"
                                value={`${analytics.measurementLogCount}`}
                                detail={analytics.latestMeasurement ? `Latest ${formatShortDate(analytics.latestMeasurement.logged_at)}` : 'None yet'}
                                color={colors.bodyComp}
                            />
                        </View>

                        <SectionHeader title="Recent photos" action="Open" onPress={() => router.push('/progress/photos')} />
                        {recentPhotos.length === 0 ? (
                            <Card style={{ borderColor: colors.border }}>
                                <EmptyInline
                                    icon="images-outline"
                                    title="No progress photos yet"
                                    text="Start with front, side, and back photos. You can compare them as your logs grow."
                                    action="Add photo"
                                    onPress={() => router.push('/progress/photos')}
                                />
                            </Card>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                                {recentPhotos.map((photo) => (
                                    <View key={photo.id} style={[styles.photoThumbCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Image source={{ uri: photo.image_url }} style={styles.photoThumb} />
                                        <View style={styles.photoMetaOverlay}>
                                            <Text style={styles.photoPose}>{photo.pose}</Text>
                                            <Text style={styles.photoDate}>{formatShortDate(photo.taken_at)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}

                {activeTab === 'goals' && (
                    <View style={styles.tabContent}>
                        <TouchableOpacity
                            style={[styles.createGoalButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/progress/create-goal')}
                        >
                            <Ionicons name="add" size={22} color={colors.textInverse} />
                            <Text style={[styles.createGoalText, { color: colors.textInverse }]}>Create New Goal</Text>
                        </TouchableOpacity>

                        <View style={styles.goalSummaryRow}>
                            <MiniStat label="Active" value={`${analytics.activeGoals.length}`} />
                            <MiniStat label="Completed" value={`${analytics.completedGoals.length}`} />
                            <MiniStat label="Top goal" value={analytics.priorityGoalPct == null ? '--' : `${Math.round(analytics.priorityGoalPct)}%`} />
                        </View>

                        <SectionHeader title="Active goals" />
                        {analytics.activeGoals.length === 0 ? (
                            <Card style={{ borderColor: colors.border }}>
                                <EmptyInline
                                    icon="flag-outline"
                                    title="No active goals"
                                    text="Set a clear target for weight, measurements, workouts, nutrition, or strength."
                                    action="Create goal"
                                    onPress={() => router.push('/progress/create-goal')}
                                />
                            </Card>
                        ) : (
                            analytics.activeGoals.map((goal) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    accent={colors.primary}
                                    onBump={() => bumpGoal(goal)}
                                    onComplete={() => completeGoal(goal)}
                                />
                            ))
                        )}

                        {analytics.completedGoals.length > 0 && (
                            <>
                                <SectionHeader title="Completed" />
                                {analytics.completedGoals.slice(0, 4).map((goal) => (
                                    <Card key={goal.id} style={[styles.completedGoalCard, { borderColor: colors.border }]}>
                                        <View style={[styles.completedIcon, { backgroundColor: withAlpha(colors.recovery, 0.16) }]}>
                                            <Ionicons name="checkmark-circle" size={20} color={colors.recovery} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.completedTitle, { color: colors.text }]}>{goal.title}</Text>
                                            <Text style={[styles.completedMeta, { color: colors.textTertiary }]}>
                                                {goal.target_value} {goal.unit} · {goal.completed_at ? formatShortDate(goal.completed_at) : 'Completed'}
                                            </Text>
                                        </View>
                                    </Card>
                                ))}
                            </>
                        )}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function SignalPill({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
    const { colors } = useTheme();
    return (
        <View style={[styles.signalPill, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Ionicons name={icon} size={14} color={color} />
            <View>
                <Text style={[styles.signalLabel, { color: colors.textTertiary }]}>{label}</Text>
                <Text style={[styles.signalValue, { color: colors.text }]}>{value}</Text>
            </View>
        </View>
    );
}

function QuickAction({ icon, label, detail, color, onPress }: { icon: IconName; label: string; detail: string; color: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}>
            <View style={[styles.quickIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.quickDetail, { color: colors.textTertiary }]}>{detail}</Text>
        </TouchableOpacity>
    );
}

function MetricTile({ icon, label, value, detail, color }: { icon: IconName; label: string; value: string; detail: string; color: string }) {
    const { colors } = useTheme();
    return (
        <Card style={[styles.metricTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.metricDetail, { color: colors.textTertiary }]}>{detail}</Text>
        </Card>
    );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
    const { colors } = useTheme();
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            {action && onPress && (
                <TouchableOpacity onPress={onPress}>
                    <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function WeightTrendChart({
    points,
    unitSystem,
    accent,
    muted,
    textColor,
    borderColor,
    tall = false,
}: {
    points: WeightTrendPoint[];
    unitSystem?: 'metric' | 'imperial' | null;
    accent: string;
    muted: string;
    textColor: string;
    borderColor: string;
    tall?: boolean;
}) {
    const max = points.length ? Math.max(...points.map((point) => point.weightKg)) : 1;
    const min = points.length ? Math.min(...points.map((point) => point.weightKg)) : 0;
    const range = Math.max(max - min, 0.4);
    const chartHeight = tall ? 142 : 108;

    return (
        <View style={[styles.chartWrap, { borderColor, backgroundColor: muted, height: chartHeight + 58 }]}>
            <View style={[styles.chartHeaderRow, { borderColor }]}>
                <Text style={[styles.chartHeaderText, { color: textColor }]}>
                    {points.length < 2 ? 'Trend needs more logs' : `${points.length}-log trajectory`}
                </Text>
                <Text style={[styles.chartHeaderText, { color: textColor }]}>
                    {points.length ? `${displayWeightFromKg(min, unitSystem).toFixed(1)}-${displayWeightFromKg(max, unitSystem).toFixed(1)} ${getWeightUnit(unitSystem)}` : '--'}
                </Text>
            </View>
            <View style={[styles.chartPlot, { height: chartHeight }]}>
                <View style={[styles.chartGuide, { backgroundColor: borderColor, top: chartHeight * 0.3 }]} />
                <View style={[styles.chartGuide, { backgroundColor: borderColor, top: chartHeight * 0.65 }]} />
                {points.length === 0 ? (
                    <View style={styles.chartEmpty}>
                        <Ionicons name="pulse-outline" size={22} color={textColor} />
                        <Text style={[styles.chartEmptyText, { color: textColor }]}>Log weight to unlock trend</Text>
                    </View>
                ) : (
                    <View style={styles.chartColumns}>
                        {points.map((point, index) => {
                            const normalized = (point.weightKg - min) / range;
                            const stemHeight = 18 + normalized * (chartHeight - 38);
                            const isLatest = index === points.length - 1;
                            return (
                                <View key={`${point.dateKey}-${index}`} style={styles.chartColumn}>
                                    <View
                                        style={[
                                            styles.chartStem,
                                            {
                                                height: stemHeight,
                                                backgroundColor: isLatest ? accent : borderColor,
                                                opacity: isLatest ? 1 : 0.78,
                                            },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.chartDot,
                                            {
                                                backgroundColor: isLatest ? accent : textColor,
                                                borderColor: muted,
                                            },
                                        ]}
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
            {points.length > 0 && (
                <View style={styles.chartFooter}>
                    <Text style={[styles.chartFooterLabel, { color: textColor }]}>{points[0].label}</Text>
                    <Text style={[styles.chartFooterLabel, { color: textColor }]}>Today</Text>
                </View>
            )}
        </View>
    );
}

function MeasurementRow({ delta, unitSystem, accent }: { delta: MeasurementDelta; unitSystem?: 'metric' | 'imperial' | null; accent: string }) {
    const { colors } = useTheme();
    const deltaLabel = delta.deltaCm == null
        ? 'new'
        : `${delta.deltaCm > 0 ? '+' : ''}${formatLength(delta.deltaCm, unitSystem)}`;

    return (
        <View style={[styles.measurementRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.measurementLabel, { color: colors.text }]}>{delta.label}</Text>
                <Text style={[styles.measurementSubtext, { color: colors.textTertiary }]}>
                    {delta.previousCm == null ? 'First logged marker' : `Previous ${formatLength(delta.previousCm, unitSystem)}`}
                </Text>
            </View>
            <Text style={[styles.measurementValue, { color: colors.text }]}>{formatLength(delta.currentCm, unitSystem)}</Text>
            <View style={[styles.deltaBadge, { backgroundColor: withAlpha(accent, 0.14) }]}>
                <Text style={[styles.deltaBadgeText, { color: accent }]}>{deltaLabel}</Text>
            </View>
        </View>
    );
}

function GoalCard({ goal, accent, onBump, onComplete }: { goal: Goal; accent: string; onBump: () => void; onComplete: () => void }) {
    const { colors } = useTheme();
    const pct = goal.target_value ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;

    return (
        <Card style={[styles.goalCard, { borderColor: colors.border }]}>
            <View style={styles.goalCardHeader}>
                <View style={[styles.goalIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
                    <Ionicons name={goalIcon(goal.goal_type)} size={20} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                    <Text style={[styles.goalMeta, { color: colors.textTertiary }]}>
                        {goalTypeLabel(goal.goal_type)} · {goal.target_date ? `Due ${formatShortDate(goal.target_date)}` : 'No deadline'}
                    </Text>
                </View>
                <Text style={[styles.goalPct, { color: accent }]}>{Math.round(pct)}%</Text>
            </View>
            {goal.description && <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>{goal.description}</Text>}
            <View style={[styles.goalTrack, { backgroundColor: colors.surfaceLight }]}>
                <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: accent }]} />
            </View>
            <View style={styles.goalFooter}>
                <Text style={[styles.goalProgressText, { color: colors.textSecondary }]}>
                    {goal.current_value} / {goal.target_value} {goal.unit}
                </Text>
                <View style={styles.goalActions}>
                    <TouchableOpacity style={[styles.goalAction, { backgroundColor: colors.surfaceLight }]} onPress={onBump}>
                        <Text style={[styles.goalActionText, { color: accent }]}>+10%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.goalAction, { backgroundColor: withAlpha(accent, 0.14) }]} onPress={onComplete}>
                        <Ionicons name="checkmark" size={15} color={accent} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    const { colors } = useTheme();
    return (
        <View style={[styles.miniStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.miniStatValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );
}

function EmptyInline({ icon, title, text, action, onPress }: { icon: IconName; title: string; text: string; action: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <View style={styles.emptyInline}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name={icon} size={24} color={colors.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={onPress}>
                <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>{action}</Text>
            </TouchableOpacity>
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
        paddingBottom: 116,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    eyebrow: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    title: {
        fontSize: FontSize.hero,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
    },
    headerButton: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    tabRail: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        minHeight: 52,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 3,
    },
    tabText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    tabContent: {
        gap: Spacing.lg,
    },
    heroCard: {
        overflow: 'hidden',
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    heroLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.xs,
    },
    weightLine: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    heroWeight: {
        fontSize: 46,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0,
    },
    heroUnit: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        paddingBottom: 7,
    },
    heroCopy: {
        fontSize: FontSize.md,
        lineHeight: 21,
        marginTop: Spacing.xs,
    },
    scoreBadge: {
        width: 84,
        height: 84,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreValue: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    scoreLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
    },
    signalRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    signalPill: {
        flex: 1,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: Spacing.sm,
        gap: Spacing.xs,
    },
    signalLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    signalValue: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    chartWrap: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginTop: Spacing.lg,
        overflow: 'hidden',
    },
    chartHeaderRow: {
        minHeight: 36,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    chartHeaderText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    chartPlot: {
        paddingHorizontal: Spacing.sm,
        justifyContent: 'flex-end',
    },
    chartGuide: {
        position: 'absolute',
        left: Spacing.sm,
        right: Spacing.sm,
        height: 1,
        opacity: 0.6,
    },
    chartColumns: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 3,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    chartColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 6,
    },
    chartStem: {
        width: 7,
        minHeight: 16,
        borderRadius: BorderRadius.full,
    },
    chartDot: {
        width: 13,
        height: 13,
        borderRadius: BorderRadius.full,
        marginTop: -4,
        borderWidth: 2,
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    chartFooterLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
    chartEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    chartEmptyText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    nextStepCard: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.md,
    },
    nextStepIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextStepTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    nextStepText: {
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 2,
    },
    inlineInputCard: {
        padding: Spacing.md,
    },
    weightInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    weightInputContainer: {
        flex: 1,
        marginBottom: 0,
    },
    saveWeightButton: {
        marginTop: 0,
        minWidth: 82,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    quickAction: {
        width: (width - Spacing.lg * 2 - Spacing.md) / 2,
        minHeight: 132,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
    },
    quickIcon: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    quickLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    quickDetail: {
        fontSize: FontSize.xs,
        marginTop: 3,
        lineHeight: 16,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    metricTile: {
        width: (width - Spacing.lg * 2 - Spacing.md) / 2,
        minHeight: 158,
    },
    metricIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    metricValue: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    metricLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    metricDetail: {
        fontSize: FontSize.xs,
        lineHeight: 16,
        marginTop: Spacing.xs,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
        marginBottom: -Spacing.xs,
    },
    sectionTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
    },
    sectionAction: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    bodyMarkersCard: {
        paddingVertical: Spacing.sm,
    },
    measurementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    measurementLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    measurementSubtext: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    measurementValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    deltaBadge: {
        minWidth: 54,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        alignItems: 'center',
    },
    deltaBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    emptyGoalCard: {
        marginBottom: Spacing.md,
    },
    emptyInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    emptyText: {
        fontSize: FontSize.sm,
        lineHeight: 18,
        marginTop: 2,
    },
    emptyButton: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    emptyButtonText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    deepDiveCard: {
        gap: Spacing.md,
    },
    deepDiveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    deepDiveLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    deepDiveTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginTop: 2,
    },
    deepDiveText: {
        fontSize: FontSize.sm,
        lineHeight: 19,
    },
    smallPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    smallPrimaryButtonText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    weightStatsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    miniStat: {
        flex: 1,
        minHeight: 78,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        justifyContent: 'center',
    },
    miniStatValue: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    miniStatLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        marginTop: 3,
    },
    weightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    weightRowIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weightRowValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    weightRowDate: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    weightDeltaText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    photoHero: {
        gap: Spacing.lg,
    },
    photoHeroContent: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    photoHeroIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoHeroTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
    },
    photoHeroText: {
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 4,
    },
    photoActionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    photoActionButton: {
        flex: 1,
    },
    photoStatsGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    photoStrip: {
        gap: Spacing.md,
        paddingRight: Spacing.lg,
    },
    photoThumbCard: {
        width: 142,
        height: 210,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    photoThumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoMetaOverlay: {
        position: 'absolute',
        left: Spacing.sm,
        right: Spacing.sm,
        bottom: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: Spacing.sm,
    },
    photoPose: {
        color: '#FFFFFF',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        textTransform: 'capitalize',
    },
    photoDate: {
        color: 'rgba(255,255,255,0.76)',
        fontSize: FontSize.xs,
        marginTop: 1,
    },
    createGoalButton: {
        minHeight: 64,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    createGoalText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    goalSummaryRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    goalCard: {
        marginBottom: Spacing.sm,
    },
    goalCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    goalIcon: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    goalMeta: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    goalPct: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    goalDescription: {
        fontSize: FontSize.sm,
        lineHeight: 18,
        marginTop: Spacing.md,
    },
    goalTrack: {
        height: 10,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginTop: Spacing.md,
    },
    goalFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
    goalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
    goalProgressText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    goalActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    goalAction: {
        minHeight: 34,
        minWidth: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    goalActionText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    completedGoalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    completedIcon: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    completedMeta: {
        fontSize: FontSize.xs,
        marginTop: 2,
    },
});
