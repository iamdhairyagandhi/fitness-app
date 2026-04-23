import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateCoolDown, generateWarmUp } from '@/lib/workoutIntelligence';
import type { MuscleGroup } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MUSCLE_CHIPS: { label: string; value: MuscleGroup }[] = [
    { label: 'Chest', value: 'chest' },
    { label: 'Back', value: 'back' },
    { label: 'Shoulders', value: 'shoulders' },
    { label: 'Quads', value: 'quads' },
    { label: 'Hamstrings', value: 'hamstrings' },
    { label: 'Glutes', value: 'glutes' },
    { label: 'Biceps', value: 'biceps' },
    { label: 'Triceps', value: 'triceps' },
    { label: 'Abs', value: 'abs' },
    { label: 'Calves', value: 'calves' },
];

const TYPE_ICONS: Record<string, string> = {
    cardio_warmup: 'fitness',
    dynamic_stretch: 'body',
    activation: 'flash',
    mobility: 'accessibility',
    static_stretch: 'leaf',
    foam_roll: 'ellipse',
    breathing: 'cloud',
};

export default function WarmUpScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ muscles?: string }>();
    const initialMuscles = params.muscles ? (params.muscles.split(',') as MuscleGroup[]) : [];

    const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>(initialMuscles);
    const [phase, setPhase] = useState<'warmup' | 'cooldown'>('warmup');
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

    const warmUp = useMemo(() => generateWarmUp(selectedMuscles), [selectedMuscles]);
    const coolDown = useMemo(() => generateCoolDown(selectedMuscles), [selectedMuscles]);

    const toggleMuscle = (muscle: MuscleGroup) => {
        setSelectedMuscles((prev) =>
            prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
        );
        setCompletedItems(new Set());
    };

    const toggleComplete = (name: string) => {
        setCompletedItems((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const items = phase === 'warmup' ? warmUp : coolDown;
    const completedCount = items.filter((e) => completedItems.has(e.name)).length;
    const progress = items.length > 0 ? completedCount / items.length : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {phase === 'warmup' ? 'Warm-Up' : 'Cool-Down'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Phase Toggle */}
            <View style={styles.phaseToggle}>
                <TouchableOpacity
                    style={[styles.phaseBtn, phase === 'warmup' && styles.phaseBtnActive]}
                    onPress={() => setPhase('warmup')}
                >
                    <Ionicons name="flame" size={16} color={phase === 'warmup' ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.phaseBtnText, phase === 'warmup' && styles.phaseBtnTextActive]}>
                        Warm-Up
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.phaseBtn, phase === 'cooldown' && styles.phaseBtnActive]}
                    onPress={() => setPhase('cooldown')}
                >
                    <Ionicons name="snow" size={16} color={phase === 'cooldown' ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.phaseBtnText, phase === 'cooldown' && styles.phaseBtnTextActive]}>
                        Cool-Down
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Muscle Selection (warm-up only) */}
                {phase === 'warmup' && (
                    <View style={styles.muscleSection}>
                        <Text style={styles.sectionTitle}>Target Muscles</Text>
                        <View style={styles.muscleChips}>
                            {MUSCLE_CHIPS.map((m) => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[
                                        styles.chip,
                                        selectedMuscles.includes(m.value) && styles.chipActive,
                                    ]}
                                    onPress={() => toggleMuscle(m.value)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selectedMuscles.includes(m.value) && styles.chipTextActive,
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Progress */}
                <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {completedCount}/{items.length}
                    </Text>
                </View>

                {/* Exercise List */}
                {items.map((item, idx) => {
                    const isComplete = completedItems.has(item.name);
                    const iconName = TYPE_ICONS[item.type] ?? 'fitness';
                    return (
                        <TouchableOpacity
                            key={`${item.name}-${idx}`}
                            onPress={() => toggleComplete(item.name)}
                        >
                            <Card style={isComplete ? { ...styles.exerciseCard, ...styles.exerciseCardDone } : styles.exerciseCard}>
                                <View style={styles.exerciseRow}>
                                    <View style={[styles.exerciseIcon, isComplete && styles.exerciseIconDone]}>
                                        <Ionicons
                                            name={isComplete ? 'checkmark' : (iconName as any)}
                                            size={20}
                                            color={isComplete ? '#fff' : Colors.primary}
                                        />
                                    </View>
                                    <View style={styles.exerciseInfo}>
                                        <Text style={[styles.exerciseName, isComplete && styles.exerciseNameDone]}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.exerciseMeta}>
                                            {'reps' in item && (item as any).reps
                                                ? `${(item as any).reps} · `
                                                : ''}
                                            {'duration' in item ? (item as any).duration : ''}
                                        </Text>
                                        <Text style={styles.exerciseInstructions}>
                                            {item.instructions}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    );
                })}

                {/* Empty state */}
                {phase === 'warmup' && selectedMuscles.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="body" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>Select target muscles above</Text>
                        <Text style={styles.emptySubtext}>
                            We'll generate a dynamic warm-up for your workout
                        </Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Start Workout Button */}
            {progress >= 0.8 && (
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
                    <Button
                        title={phase === 'warmup' ? 'Start Workout →' : 'Done'}
                        onPress={() => {
                            if (phase === 'warmup') {
                                router.push('/workout/active');
                            } else {
                                router.back();
                            }
                        }}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
    phaseToggle: {
        flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4,
    },
    phaseBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, gap: 6,
    },
    phaseBtnActive: { backgroundColor: Colors.primary },
    phaseBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
    phaseBtnTextActive: { color: '#fff' },
    content: { flex: 1, paddingHorizontal: Spacing.md },
    muscleSection: { marginBottom: Spacing.md },
    sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
    muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    progressBar: {
        flex: 1, height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
    progressText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
    exerciseCard: { marginBottom: Spacing.sm },
    exerciseCardDone: { opacity: 0.7 },
    exerciseRow: { flexDirection: 'row', gap: Spacing.md },
    exerciseIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    exerciseIconDone: { backgroundColor: Colors.success },
    exerciseInfo: { flex: 1 },
    exerciseName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
    exerciseNameDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
    exerciseMeta: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
    exerciseInstructions: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
    emptyState: { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.sm },
    emptyText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
    emptySubtext: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
        backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    },
});
