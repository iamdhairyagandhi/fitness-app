import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import {
    AppleHealthSnapshot,
    getAppleHealthStatus,
    readAppleHealthSnapshot,
    requestAppleHealthAccess,
} from '@/lib/appleHealth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMPTY_SNAPSHOT: AppleHealthSnapshot = {
    status: 'available',
    connectedAt: null,
    lastSyncedAt: null,
    steps: 0,
    activeEnergyKcal: 0,
    currentWeightKg: null,
    latestHeartRateBpm: null,
    workouts: [],
};

function formatDate(value: string | null) {
    if (!value) return 'Not synced yet';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusCopy(status: AppleHealthSnapshot['status']) {
    if (status === 'authorized') return 'Connected';
    if (status === 'native-unavailable') return 'Rebuild needed';
    if (status === 'unsupported') return 'Unavailable';
    if (status === 'denied') return 'Permission denied';
    return 'Ready to connect';
}

export default function HealthScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [snapshot, setSnapshot] = useState<AppleHealthSnapshot>(EMPTY_SNAPSHOT);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    const loadSnapshot = async () => {
        setLoading(true);
        try {
            const status = await getAppleHealthStatus();
            if (status === 'authorized') {
                setSnapshot(await readAppleHealthSnapshot());
            } else {
                setSnapshot({ ...EMPTY_SNAPSHOT, status });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSnapshot();
    }, []);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const status = await requestAppleHealthAccess();
            if (status === 'authorized') {
                const nextSnapshot = await readAppleHealthSnapshot();
                setSnapshot(nextSnapshot);
                toast.success('Apple Health connected', 'BodyPilot can now read your Health data.');
            } else if (status === 'native-unavailable') {
                setSnapshot({ ...EMPTY_SNAPSHOT, status });
                toast.info('Rebuild needed', 'Rebuild the iOS app to enable native Apple Health.');
            } else {
                setSnapshot({ ...EMPTY_SNAPSHOT, status });
                toast.info('Apple Health unavailable', 'Health permissions were not granted.');
            }
        } finally {
            setConnecting(false);
        }
    };

    const handleSync = async () => {
        setConnecting(true);
        try {
            setSnapshot(await readAppleHealthSnapshot());
            toast.success('Synced', 'Latest Apple Health data loaded.');
        } finally {
            setConnecting(false);
        }
    };

    const MetricCard = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={icon} size={22} color={colors.primary} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Apple Health</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Card style={{ ...styles.heroCard, borderColor: colors.primary + '35' }}>
                    <View style={styles.heroTop}>
                        <View style={[styles.healthIcon, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="heart" size={28} color={colors.primary} />
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: colors.primary + '14' }]}>
                            <Text style={[styles.statusText, { color: colors.primary }]}>{statusCopy(snapshot.status)}</Text>
                        </View>
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Bring Health data into BodyPilot.</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                        Sync steps, workouts, active energy, heart rate, and body weight so plans and recovery cues can adapt to your real activity.
                    </Text>

                    {snapshot.status === 'native-unavailable' ? (
                        <View style={[styles.notice, { backgroundColor: colors.warning + '16', borderColor: colors.warning + '45' }]}>
                            <Ionicons name="construct-outline" size={18} color={colors.warning} />
                            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                                Native HealthKit is installed in JS. Rebuild the iOS app before testing the Apple Health permission sheet.
                            </Text>
                        </View>
                    ) : null}

                    <Button
                        title={snapshot.status === 'authorized' ? 'Sync Now' : 'Connect Apple Health'}
                        onPress={snapshot.status === 'authorized' ? handleSync : handleConnect}
                        loading={connecting}
                        icon={<Ionicons name={snapshot.status === 'authorized' ? 'sync' : 'link'} size={18} color={colors.textInverse} />}
                        style={styles.primaryButton}
                    />
                </Card>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Snapshot</Text>
                {loading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking Apple Health...</Text>
                    </View>
                ) : (
                    <View style={styles.metricGrid}>
                        <MetricCard icon="footsteps" label="Steps today" value={snapshot.steps.toLocaleString()} />
                        <MetricCard icon="flame" label="Active kcal" value={`${snapshot.activeEnergyKcal}`} />
                        <MetricCard icon="scale" label="Weight" value={snapshot.currentWeightKg ? `${snapshot.currentWeightKg.toFixed(1)} kg` : '--'} />
                        <MetricCard icon="pulse" label="Heart rate" value={snapshot.latestHeartRateBpm ? `${snapshot.latestHeartRateBpm} bpm` : '--'} />
                    </View>
                )}

                <Card>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Sync Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Connected</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(snapshot.connectedAt)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last sync</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(snapshot.lastSyncedAt)}</Text>
                    </View>
                </Card>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Health Workouts</Text>
                <Card>
                    {snapshot.workouts.length > 0 ? (
                        snapshot.workouts.map((workout) => (
                            <View key={workout.id} style={[styles.workoutRow, { borderBottomColor: colors.border }]}>
                                <View style={[styles.workoutIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="fitness" size={18} color={colors.primary} />
                                </View>
                                <View style={styles.workoutCopy}>
                                    <Text style={[styles.workoutName, { color: colors.text }]}>{workout.type}</Text>
                                    <Text style={[styles.workoutMeta, { color: colors.textTertiary }]}>
                                        {workout.durationMinutes} min{workout.calories ? ` • ${workout.calories} kcal` : ''}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            Recent Apple Health workouts will appear here after permission is granted and Health has workout data.
                        </Text>
                    )}
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    headerSpacer: { width: 24 },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 110 },
    heroCard: { borderWidth: 1 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    healthIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
    statusPill: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    heroTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.heavy, letterSpacing: -0.2 },
    heroBody: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm },
    notice: {
        flexDirection: 'row',
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.lg,
    },
    noticeText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 19 },
    primaryButton: { marginTop: Spacing.lg },
    sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
    loadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    metricCard: {
        width: '47.5%',
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    metricValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.heavy },
    metricLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    cardTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
    detailLabel: { color: Colors.textTertiary, fontSize: FontSize.sm },
    detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    workoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    workoutIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    workoutCopy: { flex: 1 },
    workoutName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    workoutMeta: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
