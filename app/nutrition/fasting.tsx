import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FASTING_PRESETS = [
    { label: '16:8', hours: 16 },
    { label: '18:6', hours: 18 },
    { label: '20:4', hours: 20 },
    { label: 'OMAD', hours: 23 },
    { label: '24h', hours: 24 },
    { label: '36h', hours: 36 },
];

export default function FastingScreen() {
    const insets = useSafeAreaInsets();
    const { activeFast, fastHistory, startFast, endFast } = useMealPlanStore();
    const [now, setNow] = useState(new Date());

    // Tick timer
    useEffect(() => {
        if (!activeFast) return;
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, [activeFast]);

    const getElapsed = () => {
        if (!activeFast) return { h: 0, m: 0, s: 0, pct: 0 };
        const start = new Date(activeFast.started_at).getTime();
        const target = new Date(activeFast.target_end_at).getTime();
        const elapsed = now.getTime() - start;
        const total = target - start;
        const pct = Math.min(100, (elapsed / total) * 100);
        const totalSec = Math.floor(elapsed / 1000);
        return {
            h: Math.floor(totalSec / 3600),
            m: Math.floor((totalSec % 3600) / 60),
            s: totalSec % 60,
            pct,
        };
    };

    const elapsed = getElapsed();

    const handleEndFast = () => {
        toast.confirm({
            title: 'End Fast',
            message: 'Are you sure you want to end this fast?',
            confirmLabel: 'End Fast',
            destructive: true,
            onConfirm: endFast,
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Fasting Timer</Text>
                <View style={{ width: 24 }} />
            </View>

            {activeFast ? (
                /* Active fast view */
                <View style={styles.activeContainer}>
                    <View style={styles.timerCircle}>
                        {/* Progress ring background */}
                        <View style={[styles.progressRingBg, { borderColor: Colors.surfaceLight }]} />
                        {/* Simple progress indicator */}
                        <View style={styles.timerContent}>
                            <Text style={styles.timerLabel}>ELAPSED</Text>
                            <Text style={styles.timerValue}>
                                {String(elapsed.h).padStart(2, '0')}:{String(elapsed.m).padStart(2, '0')}:{String(elapsed.s).padStart(2, '0')}
                            </Text>
                            <Text style={styles.timerPct}>{Math.round(elapsed.pct)}%</Text>
                        </View>
                    </View>

                    <Card style={styles.fastInfoCard}>
                        <View style={styles.fastInfoRow}>
                            <View style={styles.fastInfoItem}>
                                <Text style={styles.fastInfoLabel}>Started</Text>
                                <Text style={styles.fastInfoValue}>
                                    {new Date(activeFast.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <View style={styles.fastInfoDivider} />
                            <View style={styles.fastInfoItem}>
                                <Text style={styles.fastInfoLabel}>Target</Text>
                                <Text style={styles.fastInfoValue}>{activeFast.fasting_hours}h</Text>
                            </View>
                            <View style={styles.fastInfoDivider} />
                            <View style={styles.fastInfoItem}>
                                <Text style={styles.fastInfoLabel}>End At</Text>
                                <Text style={styles.fastInfoValue}>
                                    {new Date(activeFast.target_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    {elapsed.pct >= 100 && (
                        <Card style={styles.completeBanner}>
                            <Text style={styles.completeText}>🎉 Fast Complete!</Text>
                            <Text style={styles.completeSubtext}>You've reached your target. Great job!</Text>
                        </Card>
                    )}

                    <Button
                        title="End Fast"
                        onPress={handleEndFast}
                        variant="outline"
                        size="lg"
                        style={{ marginTop: Spacing.xl }}
                    />
                </View>
            ) : (
                /* Start fast view */
                <View style={styles.startContainer}>
                    <Text style={styles.startTitle}>Start a Fast</Text>
                    <Text style={styles.startSubtitle}>Choose your fasting protocol</Text>

                    <View style={styles.presetGrid}>
                        {FASTING_PRESETS.map((p) => (
                            <TouchableOpacity
                                key={p.label}
                                style={styles.presetCard}
                                onPress={() => {
                                    startFast(p.hours);
                                }}
                            >
                                <Text style={styles.presetLabel}>{p.label}</Text>
                                <Text style={styles.presetHours}>{p.hours}h fast</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Fast history */}
                    {fastHistory.length > 0 && (
                        <View style={styles.historySection}>
                            <Text style={styles.historyTitle}>Recent Fasts</Text>
                            {fastHistory.slice(0, 5).map((f) => {
                                const start = new Date(f.started_at);
                                const end = f.actual_end_at ? new Date(f.actual_end_at) : null;
                                const actualHours = end
                                    ? ((end.getTime() - start.getTime()) / 3600000).toFixed(1)
                                    : '—';
                                return (
                                    <Card key={f.id} style={styles.historyCard}>
                                        <View style={styles.historyRow}>
                                            <View>
                                                <Text style={styles.historyDate}>{start.toLocaleDateString()}</Text>
                                                <Text style={styles.historyMeta}>Target: {f.fasting_hours}h</Text>
                                            </View>
                                            <View style={styles.historyRight}>
                                                <Text style={styles.historyHours}>{actualHours}h</Text>
                                                <Text style={[
                                                    styles.historyStatus,
                                                    { color: f.status === 'completed' ? Colors.success : Colors.textTertiary }
                                                ]}>
                                                    {f.status === 'completed' ? '✓ Done' : f.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </Card>
                                );
                            })}
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

    activeContainer: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl },
    timerCircle: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl },
    progressRingBg: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 8, borderColor: Colors.surfaceLight },
    timerContent: { alignItems: 'center' },
    timerLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2, marginBottom: Spacing.xs },
    timerValue: { color: Colors.text, fontSize: 42, fontWeight: FontWeight.bold, fontVariant: ['tabular-nums'] },
    timerPct: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 4 },

    fastInfoCard: { width: '100%' },
    fastInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fastInfoItem: { flex: 1, alignItems: 'center' },
    fastInfoDivider: { width: 1, height: 30, backgroundColor: Colors.border },
    fastInfoLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: 4 },
    fastInfoValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },

    completeBanner: { width: '100%', marginTop: Spacing.lg, backgroundColor: 'rgba(0, 206, 206, 0.1)', borderColor: Colors.secondary },
    completeText: { color: Colors.secondary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
    completeSubtext: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 4 },

    startContainer: { flex: 1, paddingHorizontal: Spacing.lg },
    startTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center', marginTop: Spacing.xxl },
    startSubtitle: { color: Colors.textTertiary, fontSize: FontSize.md, textAlign: 'center', marginBottom: Spacing.xxl },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
    presetCard: {
        width: '30%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
        alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
    },
    presetLabel: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    presetHours: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },

    historySection: { marginTop: Spacing.xxl },
    historyTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    historyCard: { marginBottom: Spacing.sm },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyDate: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    historyMeta: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    historyRight: { alignItems: 'flex-end' },
    historyHours: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    historyStatus: { fontSize: FontSize.xs, marginTop: 2 },
});
