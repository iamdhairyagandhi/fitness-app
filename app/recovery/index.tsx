import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getLocalDateKey } from '@/lib/date';
import { useRecoveryStore } from '@/stores/recoveryStore';
import type { MuscleGroup } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ required?: string }>();
    const isRequired = params.required === '1';
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
        if (level === 0) return colors.surfaceLight;
        if (level === 1) return 'rgba(255, 214, 10, 0.3)';
        if (level === 2) return 'rgba(255, 159, 10, 0.4)';
        return 'rgba(225, 112, 85, 0.5)';
    };

    const handleSave = () => {
        logRecovery({
            date: getLocalDateKey(),
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
        toast.success('Logged!', 'Recovery check-in saved.');
        if (isRequired) {
            router.replace('/(tabs)');
            return;
        }
        router.back();
    };

    const RatingRow = ({
        label, icon, value, onChange, hint,
    }: { label: string; icon: string; value: number; onChange: (v: any) => void; hint?: string }) => (
        <Card style={styles.ratingCard}>
            <Text style={[styles.ratingLabel, { color: colors.text }]}>{icon} {label}</Text>
            {hint ? <Text style={[styles.ratingHint, { color: colors.textTertiary }]}>{hint}</Text> : null}
            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((v) => (
                    <TouchableOpacity
                        key={v}
                        style={[
                            styles.ratingBtn,
                            { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                            v === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => onChange(v)}
                    >
                        <Text style={[styles.ratingBtnText, { color: v === value ? colors.textInverse : colors.textSecondary }]}>{v}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={[styles.ratingValueLabel, { color: colors.textTertiary }]}>{RATING_LABELS[value]}</Text>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                {isRequired ? (
                    <View style={styles.headerIcon}>
                        <Ionicons name="sunny-outline" size={22} color={colors.primary} />
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.title, { color: colors.text }]}>{isRequired ? 'Morning Check-in' : 'Recovery Check-in'}</Text>
                <View style={{ width: 24 }} />
            </View>

            {todayRecovery ? (
                <View style={styles.alreadyLogged}>
                    <View style={[styles.scoreCircle, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                        <Text style={[styles.scoreValue, { color: colors.primary }]}>{todayRecovery.recovery_score}</Text>
                        <Text style={[styles.scoreLabel, { color: colors.textTertiary }]}>Recovery Score</Text>
                    </View>
                    <Card style={styles.summaryCard}>
                        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                            Sleep: {todayRecovery.sleep_hours}h • Energy: {todayRecovery.energy_level}/5 • Mood: {todayRecovery.mood}/5
                        </Text>
                    </Card>
                    <Text style={[styles.alreadyText, { color: colors.textTertiary }]}>Already logged for today. Come back tomorrow!</Text>
                    {isRequired ? (
                        <Button
                            title="Continue to Home"
                            onPress={() => router.replace('/(tabs)')}
                            size="lg"
                            style={{ marginTop: Spacing.lg, alignSelf: 'stretch', marginHorizontal: Spacing.lg }}
                        />
                    ) : null}
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {isRequired ? (
                        <Card style={styles.morningIntroCard}>
                            <View style={styles.morningIntroHeader}>
                                <Ionicons name="pulse" size={20} color={colors.primary} />
                                <Text style={[styles.morningIntroTitle, { color: colors.text }]}>Morning readiness check</Text>
                            </View>
                            <Text style={[styles.morningIntroText, { color: colors.textSecondary }]}>
                                This is for last night’s sleep and how you feel this morning. BodyPilot uses it to adjust today’s workout intensity, recovery bias, calories, carbs, and hydration guidance.
                            </Text>
                        </Card>
                    ) : null}

                    {/* Sleep */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>😴 Sleep</Text>
                    <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>Hours slept last night.</Text>
                    <Card style={styles.sleepCard}>
                        <Text style={[styles.sleepValue, { color: colors.primary }]}>{sleepHours}h</Text>
                        <View style={styles.sleepBtns}>
                            <TouchableOpacity style={[styles.sleepBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => setSleepHours(Math.max(0, sleepHours - 0.5))}>
                                <Ionicons name="remove" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.sleepBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => setSleepHours(Math.min(14, sleepHours + 0.5))}>
                                <Ionicons name="add" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </Card>

                    <RatingRow label="Sleep Quality" icon="⭐" value={sleepQuality} onChange={setSleepQuality} hint="How restorative last night’s sleep felt." />
                    <RatingRow label="Energy Level" icon="⚡" value={energy} onChange={setEnergy} hint="Your energy this morning before training." />
                    <RatingRow label="Mood" icon="😊" value={mood} onChange={setMood} hint="Your current mood and motivation." />
                    <RatingRow label="Stress" icon="😰" value={stress} onChange={setStress} hint="Your current mental load for today." />

                    {/* Soreness */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🦴 Overall Soreness (1-5)</Text>
                    <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>How sore or beat up you feel right now.</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[
                                    styles.ratingBtn,
                                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                                    v === overallSoreness && { backgroundColor: colors.primary, borderColor: colors.primary },
                                ]}
                                onPress={() => setOverallSoreness(v as 0 | 1 | 2 | 3 | 4 | 5)}
                            >
                                <Text style={[styles.ratingBtnText, { color: v === overallSoreness ? colors.textInverse : colors.textSecondary }]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Muscle soreness map */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>💪 Muscle Soreness Map</Text>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>Tap to cycle: none → mild → moderate → severe</Text>
                    <View style={styles.muscleGrid}>
                        {SORENESS_MUSCLES.map((m) => {
                            const level = sorenessMap[m.id] || 0;
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.muscleChip, { backgroundColor: getSorenessColor(level), borderColor: colors.border }]}
                                    onPress={() => toggleSoreness(m.id)}
                                >
                                    <Text style={[styles.muscleLabel, { color: colors.text }]}>{m.label}</Text>
                                    {level > 0 && <Text style={[styles.muscleLevel, { color: colors.accent }]}>{level}/3</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Button
                        title={isRequired ? 'Save and Start Today' : 'Save Recovery Log'}
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
    headerIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    morningIntroCard: { marginBottom: Spacing.md },
    morningIntroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
    morningIntroTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    morningIntroText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    sectionHint: { fontSize: FontSize.xs, lineHeight: 17, marginTop: -Spacing.sm, marginBottom: Spacing.md },
    hint: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: Spacing.md },

    sleepCard: { alignItems: 'center' },
    sleepValue: { color: Colors.primary, fontSize: 42, fontWeight: FontWeight.bold },
    sleepBtns: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
    sleepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },

    ratingCard: { marginTop: Spacing.md },
    ratingLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
    ratingHint: { fontSize: FontSize.xs, lineHeight: 17, marginTop: -Spacing.sm, marginBottom: Spacing.md },
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
