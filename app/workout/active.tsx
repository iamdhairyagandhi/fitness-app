import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatDuration } from '@/lib/utils';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { Exercise } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Sample exercises for the MVP
const EXERCISES: Exercise[] = [
    { id: '1', name: 'Bench Press', category: 'barbell', muscle_groups: ['chest', 'triceps', 'shoulders'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '2', name: 'Squat', category: 'barbell', muscle_groups: ['quads', 'glutes', 'hamstrings'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '3', name: 'Deadlift', category: 'barbell', muscle_groups: ['back', 'hamstrings', 'glutes'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '4', name: 'Overhead Press', category: 'barbell', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '5', name: 'Barbell Row', category: 'barbell', muscle_groups: ['back', 'biceps'], equipment: 'barbell', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '6', name: 'Pull-Up', category: 'bodyweight', muscle_groups: ['lats', 'biceps'], equipment: 'bodyweight', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
    { id: '7', name: 'Dumbbell Curl', category: 'dumbbell', muscle_groups: ['biceps'], equipment: 'dumbbell', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: '8', name: 'Tricep Pushdown', category: 'cable', muscle_groups: ['triceps'], equipment: 'cable', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: '9', name: 'Lateral Raise', category: 'dumbbell', muscle_groups: ['shoulders'], equipment: 'dumbbell', instructions: '', tips: null, image_url: null, is_compound: false, is_custom: false, user_id: null },
    { id: '10', name: 'Leg Press', category: 'machine', muscle_groups: ['quads', 'glutes'], equipment: 'machine', instructions: '', tips: null, image_url: null, is_compound: true, is_custom: false, user_id: null },
];

export default function ActiveWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const {
        activeWorkout,
        isWorkoutActive,
        restTimerSeconds,
        isRestTimerRunning,
        startWorkout,
        finishWorkout,
        discardWorkout,
        addExerciseToWorkout,
        addSet,
        updateSet,
        removeSet,
        toggleSetComplete,
        startRestTimer,
        stopRestTimer,
        tickRestTimer,
    } = useWorkoutStore();

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Start workout if not already active
    useEffect(() => {
        if (!isWorkoutActive) {
            startWorkout('Workout');
        }
    }, []);

    // Elapsed timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Rest timer
    useEffect(() => {
        if (isRestTimerRunning) {
            restRef.current = setInterval(() => {
                tickRestTimer();
            }, 1000);
        } else {
            if (restRef.current) clearInterval(restRef.current);
            if (restTimerSeconds === 0 && restRef.current) {
                Vibration.vibrate(500);
            }
        }
        return () => {
            if (restRef.current) clearInterval(restRef.current);
        };
    }, [isRestTimerRunning, tickRestTimer, restTimerSeconds]);

    const handleFinish = () => {
        toast.confirm({
            title: 'Finish Workout',
            message: 'Save this workout?',
            confirmLabel: 'Save',
            onConfirm: () => {
                finishWorkout();
                router.back();
            },
        });
    };

    const handleDiscard = () => {
        toast.confirm({
            title: 'Discard Workout',
            message: 'Are you sure? All progress will be lost.',
            confirmLabel: 'Discard',
            destructive: true,
            onConfirm: () => {
                discardWorkout();
                router.back();
            },
        });
    };

    const filteredExercises = EXERCISES.filter((e) =>
        e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleDiscard}>
                    <Text style={styles.cancelText}>Discard</Text>
                </TouchableOpacity>
                <View style={styles.timerContainer}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
                </View>
                <TouchableOpacity onPress={handleFinish}>
                    <Text style={styles.finishText}>Finish</Text>
                </TouchableOpacity>
            </View>

            {/* Rest Timer Banner */}
            {isRestTimerRunning && (
                <TouchableOpacity style={styles.restBanner} onPress={stopRestTimer}>
                    <Text style={styles.restLabel}>Rest Timer</Text>
                    <Text style={styles.restTime}>{formatDuration(restTimerSeconds)}</Text>
                    <Text style={styles.restSkip}>Tap to skip</Text>
                </TouchableOpacity>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Exercises */}
                {activeWorkout?.exercises.map((exercise, exIdx) => (
                    <Card key={exercise.id} style={styles.exerciseCard}>
                        <View style={styles.exerciseHeader}>
                            <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                            <TouchableOpacity>
                                <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {/* Sets header */}
                        <View style={styles.setsHeader}>
                            <Text style={[styles.setHeaderText, { width: 40 }]}>SET</Text>
                            <Text style={[styles.setHeaderText, { flex: 1 }]}>PREV</Text>
                            <Text style={[styles.setHeaderText, { width: 70 }]}>KG</Text>
                            <Text style={[styles.setHeaderText, { width: 70 }]}>REPS</Text>
                            <Text style={[styles.setHeaderText, { width: 36 }]}>✓</Text>
                        </View>

                        {/* Sets */}
                        {exercise.sets.map((set, setIdx) => (
                            <View
                                key={set.id}
                                style={[
                                    styles.setRow,
                                    set.completed && styles.setRowCompleted,
                                ]}
                            >
                                <Text style={[styles.setNumber, { width: 40 }]}>
                                    {set.set_type === 'warmup' ? 'W' : set.set_number}
                                </Text>
                                <Text style={[styles.setPrev, { flex: 1 }]}>—</Text>
                                <TextInput
                                    style={styles.setInput}
                                    value={set.weight_kg?.toString() || ''}
                                    onChangeText={(v) =>
                                        updateSet(exIdx, setIdx, {
                                            weight_kg: v ? parseFloat(v) : null,
                                        })
                                    }
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={Colors.textTertiary}
                                />
                                <TextInput
                                    style={styles.setInput}
                                    value={set.reps?.toString() || ''}
                                    onChangeText={(v) =>
                                        updateSet(exIdx, setIdx, {
                                            reps: v ? parseInt(v, 10) : null,
                                        })
                                    }
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={Colors.textTertiary}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.checkButton,
                                        set.completed && styles.checkButtonActive,
                                    ]}
                                    onPress={() => {
                                        toggleSetComplete(exIdx, setIdx);
                                        if (!set.completed) {
                                            startRestTimer(90);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color={set.completed ? Colors.text : Colors.textTertiary}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Add set button */}
                        <TouchableOpacity
                            style={styles.addSetBtn}
                            onPress={() => addSet(exIdx)}
                        >
                            <Ionicons name="add" size={18} color={Colors.primary} />
                            <Text style={styles.addSetText}>Add Set</Text>
                        </TouchableOpacity>
                    </Card>
                ))}

                {/* Add Exercise Button */}
                <Button
                    title="+ Add Exercise"
                    onPress={() => setShowExercisePicker(true)}
                    variant="outline"
                    style={{ marginTop: Spacing.md }}
                />

                {/* Exercise Picker */}
                {showExercisePicker && (
                    <Card style={styles.pickerCard}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Add Exercise</Text>
                            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search exercises..."
                            placeholderTextColor={Colors.textTertiary}
                            value={exerciseSearch}
                            onChangeText={setExerciseSearch}
                            autoFocus
                        />
                        {filteredExercises.map((exercise) => (
                            <TouchableOpacity
                                key={exercise.id}
                                style={styles.pickerRow}
                                onPress={() => {
                                    addExerciseToWorkout(exercise);
                                    setShowExercisePicker(false);
                                    setExerciseSearch('');
                                }}
                            >
                                <Text style={styles.pickerExName}>{exercise.name}</Text>
                                <Text style={styles.pickerExMeta}>
                                    {exercise.muscle_groups.join(', ')} • {exercise.equipment}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Card>
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
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    cancelText: {
        color: Colors.error,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    finishText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    timerText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        fontVariant: ['tabular-nums'],
    },

    // Rest banner
    restBanner: {
        backgroundColor: Colors.primary,
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    restLabel: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        opacity: 0.8,
    },
    restTime: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
        fontVariant: ['tabular-nums'],
    },
    restSkip: {
        color: Colors.text,
        fontSize: FontSize.xs,
        opacity: 0.6,
    },

    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
        paddingTop: Spacing.md,
    },

    // Exercise card
    exerciseCard: {
        marginBottom: Spacing.md,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    exerciseName: {
        color: Colors.primary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    setsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    setHeaderText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textAlign: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        marginBottom: 2,
    },
    setRowCompleted: {
        backgroundColor: Colors.success + '15',
    },
    setNumber: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        textAlign: 'center',
    },
    setPrev: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
    setInput: {
        width: 70,
        height: 36,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.sm,
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        textAlign: 'center',
        marginHorizontal: 4,
    },
    checkButton: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkButtonActive: {
        backgroundColor: Colors.success,
    },
    addSetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.sm,
    },
    addSetText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },

    // Exercise picker
    pickerCard: {
        marginTop: Spacing.lg,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    pickerTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    searchInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        color: Colors.text,
        fontSize: FontSize.md,
        marginBottom: Spacing.md,
    },
    pickerRow: {
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    pickerExName: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    pickerExMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
});
