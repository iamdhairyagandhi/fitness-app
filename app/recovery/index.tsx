import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Card, Button } from '@/components/ui';
import { useRecoveryStore } from '@/stores/recoveryStore';
import type { MuscleGroup } from '@/types';

const SORENESS_MUSCLES: { id: MuscleGroup; label: string }[] = [
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'biceps', label: 'Biceps' },
    { id: 'triceps', label: 'Triceps' },
    { id: 'quads', label: 'Quads' },
    { id: 'hamstrings', label: 'Hamstrings' },
    { id: 'glutes', label: 'Glutes' },
    { id: 'calves', label: 'Calves' },
    { id: 'abs', label: 'Abs' },
    { id: 'forearms', label: 'Forearms' },
    { id: 'traps', label: 'Traps' },
];

const RATING_LABELS: Record<number, string> = {
    1: 'Awful', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Great',
};

export default function RecoveryLogScreen() {
    const insets = useSafeAreaInsets();
    const { logRecovery, todayRecovery } = useRecoveryStore();

    const [sleepHours, setSleepHours] = useState(7.5);
    const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [overallSoreness, setOverallSoreness] = useState<0 | 1 | 2 | 3 | 4 | 5>(2);
    const [sorenessMap, setSorenessMap] = useState<Record<MuscleGroup, number>>({} as any);
    const [restingHR, setRestingHR] = useState<number | null>(null);

    const toggleSoreness = (muscle: MuscleGroup) => {
        setSorenessMap((prev) => {
            const current = prev[muscle] || 0;
            const next = current >= 3 ? 0 : current + 1;
            if (next === 0) {
                const { [muscle]: _, ...rest } = prev;
                return rest as Record<MuscleGroup, number>;
            }
            return { ...prev, [muscle]: next };
        });
    };

    const getSorenessColor = (level: number) => {
        if (level === 0) return Colors.surface;
        if (level === 1) return 'rgba(255, 214, 10, 0.3)';
        if (level === 2) return 'rgba(255, 159, 10, 0.4)';
        return 'rgba(225, 112, 85, 0.5)';
    };

    const handleSave = () => {
        logRecovery({
            date: new Date().toISOString().split('T')[0],
            sleep_hours: sleepHours,
            sleep_quality: sleepQuality,
            soreness_level: overallSoreness,
            sore_body_parts: Object.keys(sorenessMap) as MuscleGroup[],
            energy_level: energy,
            mood,
            stress_level: stress,
            resting_hr: restingHR,
            hrv: null,
            notes: null,
        });
        Alert.alert('Logged!', 'Recovery check-in saved.', [{ text: 'OK', onPress: () => router.back() }]);
    };

    const RatingRow = ({
        label, icon, value, onChange,
    }: { label: string; icon: string; value: number; onChange: (v: any) => void }) => (
        <Card style={styles.ratingCard}>
            <Text style={styles.ratingLabel}>{icon} {label}</Text>
            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((v) => (
                    <TouchableOpacity
                        key={v}
                        style={[styles.ratingBtn, v === value && styles.ratingBtnActive]}
                        onPress={() => onChange(v)}
                    >
                        <Text style={[styles.ratingBtnText, v === value && styles.ratingBtnTextActive]}>{v}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.ratingValueLabel}>{RATING_LABELS[value]}</Text>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Recovery Check-in</Text>
                <View style={{ width: 24 }} />
            </View>

            {todayRecovery ? (
                <View style={styles.alreadyLogged}>
                    <View style={styles.scoreCircle}>
                        <Text style={styles.scoreValue}>{todayRecovery.recovery_score}</Text>
                        <Text style={styles.scoreLabel}>Recovery Score</Text>
                    </View>
                    <Card style={styles.summaryCard}>
                        <Text style={styles.summaryText}>
                            Sleep: {todayRecovery.sleep_hours}h • Energy: {todayRecovery.energy_level}/5 • Mood: {todayRecovery.mood}/5
                        </Text>
                    </Card>
                    <Text style={styles.alreadyText}>Already logged for today. Come back tomorrow!</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Sleep */}
                    <Text style={styles.sectionTitle}>😴 Sleep</Text>
                    <Card style={styles.sleepCard}>
                        <Text style={styles.sleepValue}>{sleepHours}h</Text>
                        <View style={styles.sleepBtns}>
                            <TouchableOpacity style={styles.sleepBtn} onPress={() => setSleepHours(Math.max(0, sleepHours - 0.5))}>
                                <Ionicons name="remove" size={20} color={Colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.sleepBtn} onPress={() => setSleepHours(Math.min(14, sleepHours + 0.5))}>
                                <Ionicons name="add" size={20} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    </Card>

                    <RatingRow label="Sleep Quality" icon="⭐" value={sleepQuality} onChange={setSleepQuality} />
                    <RatingRow label="Energy Level" icon="⚡" value={energy} onChange={setEnergy} />
                    <RatingRow label="Mood" icon="😊" value={mood} onChange={setMood} />
                    <RatingRow label="Stress" icon="😰" value={stress} onChange={setStress} />

                    {/* Soreness */}
                    <Text style={styles.sectionTitle}>🦴 Overall Soreness (1-5)</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.ratingBtn, v === overallSoreness && styles.ratingBtnActive]}
                                onPress={() => setOverallSoreness(v as 0 | 1 | 2 | 3 | 4 | 5)}
                            >
                                <Text style={[styles.ratingBtnText, v === overallSoreness && styles.ratingBtnTextActive]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Muscle soreness map */}
                    <Text style={styles.sectionTitle}>💪 Muscle Soreness Map</Text>
                    <Text style={styles.hint}>Tap to cycle: none → mild → moderate → severe</Text>
                    <View style={styles.muscleGrid}>
                        {SORENESS_MUSCLES.map((m) => {
                            const level = sorenessMap[m.id] || 0;
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.muscleChip, { backgroundColor: getSorenessColor(level) }]}
                                    onPress={() => toggleSoreness(m.id)}
                                >
                                    <Text style={styles.muscleLabel}>{m.label}</Text>
                                    {level > 0 && <Text style={styles.muscleLevel}>{level}/3</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Button
                        title="Save Recovery Log"
                        onPress={handleSave}
                        size="lg"
                        style={{ marginTop: Spacing.xxl }}
                    />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    hint: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: Spacing.md },

    sleepCard: { alignItems: 'center' },
    sleepValue: { color: Colors.primary, fontSize: 42, fontWeight: FontWeight.bold },
    sleepBtns: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
    sleepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },

    ratingCard: { marginTop: Spacing.md },
    ratingLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
    ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    ratingBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
    ratingBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    ratingBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    ratingBtnTextActive: { color: Colors.text },
    ratingValueLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center' },

    muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    muscleChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, minWidth: '30%', alignItems: 'center' },
    muscleLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    muscleLevel: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginTop: 2 },

    alreadyLogged: { flex: 1, alignItems: 'center', paddingTop: Spacing.huge },
    scoreCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.surface, borderWidth: 4, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
    scoreValue: { color: Colors.primary, fontSize: 48, fontWeight: FontWeight.bold },
    scoreLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
    summaryCard: { marginHorizontal: Spacing.lg },
    summaryText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
    alreadyText: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.lg },
});
