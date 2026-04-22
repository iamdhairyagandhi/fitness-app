import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateWorkoutPlan } from '@/lib/aiEngine';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { AIGeneratedWorkout } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOCUS_OPTIONS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Full Body'];
const DURATION_OPTIONS = [30, 45, 60, 75, 90];

export default function AIWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);

    const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
    const [duration, setDuration] = useState(45);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AIGeneratedWorkout | null>(null);

    const toggleFocus = (f: string) => {
        setSelectedFocus((prev) =>
            prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
        );
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const workout = await generateWorkoutPlan({
                goal: user?.goal || 'build_muscle',
                experience: user?.experience_level || 'intermediate',
                focusMuscles: selectedFocus.length > 0 ? selectedFocus : undefined,
                durationMin: duration,
                recentWorkouts: recentWorkouts.slice(0, 3).map((w) => w.name),
            });
            setResult(workout);
        } catch (e: any) {
            setError(e.message || 'Failed to generate workout. Make sure your API key is set.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>✨ AI Workout Generator</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {!result ? (
                    <>
                        {/* Focus muscles */}
                        <Text style={styles.sectionTitle}>Focus Areas</Text>
                        <View style={styles.chipGrid}>
                            {FOCUS_OPTIONS.map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.chip, selectedFocus.includes(f) && styles.chipActive]}
                                    onPress={() => toggleFocus(f)}
                                >
                                    <Text style={[styles.chipText, selectedFocus.includes(f) && styles.chipTextActive]}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Duration */}
                        <Text style={styles.sectionTitle}>Duration</Text>
                        <View style={styles.chipGrid}>
                            {DURATION_OPTIONS.map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.chip, duration === d && styles.chipActive]}
                                    onPress={() => setDuration(d)}
                                >
                                    <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>
                                        {d} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Info */}
                        <Card style={styles.infoCard}>
                            <Text style={styles.infoText}>
                                🧠 The AI will consider your goal ({user?.goal || 'general'}),
                                experience level ({user?.experience_level || 'intermediate'}),
                                and recent workouts to create a personalized program.
                            </Text>
                        </Card>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <Button
                            title="Generate Workout"
                            onPress={handleGenerate}
                            loading={loading}
                            size="lg"
                        />
                    </>
                ) : (
                    <>
                        {/* Generated workout result */}
                        <Card style={styles.resultCard}>
                            <Text style={styles.resultName}>{result.name}</Text>
                            {result.description ? (
                                <Text style={styles.resultDesc}>{result.description}</Text>
                            ) : null}
                            <Text style={styles.resultMeta}>
                                ⏱️ {result.estimated_duration_min} min • {result.exercises.length} exercises
                            </Text>
                        </Card>

                        {result.exercises.map((ex, i) => (
                            <Card key={i} style={styles.exerciseCard}>
                                <View style={styles.exerciseRow}>
                                    <View style={styles.exerciseNum}>
                                        <Text style={styles.exerciseNumText}>{i + 1}</Text>
                                    </View>
                                    <View style={styles.exerciseInfo}>
                                        <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                                        <Text style={styles.exerciseSets}>
                                            {ex.sets} sets × {ex.reps} reps • {ex.rest_seconds}s rest
                                        </Text>
                                        {ex.notes ? (
                                            <Text style={styles.exerciseNotes}>💡 {ex.notes}</Text>
                                        ) : null}
                                    </View>
                                </View>
                            </Card>
                        ))}

                        <View style={styles.resultActions}>
                            <Button
                                title="Generate Another"
                                onPress={() => setResult(null)}
                                variant="outline"
                                size="md"
                            />
                            <Button
                                title="Chat with Coach"
                                onPress={() => router.push('/chat')}
                                size="md"
                            />
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
        marginTop: Spacing.xl, marginBottom: Spacing.md,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1.5, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    chipTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
    infoCard: { marginTop: Spacing.xl, marginBottom: Spacing.xl },
    infoText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
    resultCard: { marginBottom: Spacing.md },
    resultName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    resultDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xs },
    resultMeta: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.sm },
    exerciseCard: { marginBottom: Spacing.sm },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    exerciseNum: {
        width: 32, height: 32, borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
    },
    exerciseNumText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
    exerciseInfo: { flex: 1 },
    exerciseName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    exerciseSets: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
    exerciseNotes: { color: Colors.textTertiary, fontSize: FontSize.xs, fontStyle: 'italic', marginTop: 4 },
    resultActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
});
