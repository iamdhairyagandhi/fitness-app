import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatDuration } from '@/lib/utils';
import { generateProgressionSuggestions, type ProgressionSuggestion } from '@/lib/workoutIntelligence';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { Exercise, WorkoutMode } from '@/types';
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
        setWorkoutMode,
        addSupersetGroup,
        removeSupersetGroup,
    } = useWorkoutStore();

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [showModePicker, setShowModePicker] = useState(false);
    const [progressionResults, setProgressionResults] = useState<ProgressionSuggestion[] | null>(null);
    const [showSupersetPicker, setShowSupersetPicker] = useState(false);
    const [supersetSelection, setSupersetSelection] = useState<number[]>([]);
    // Circuit round counter
    const [circuitRound, setCircuitRound] = useState(1);
    const [circuitTotalRounds, setCircuitTotalRounds] = useState(3);
    // EMOM/AMRAP timer
    const [emomInterval, setEmomInterval] = useState(60); // seconds per EMOM round
    const [emomRound, setEmomRound] = useState(0);
    const [emomTimeLeft, setEmomTimeLeft] = useState(60);
    const [amrapTimeLeft, setAmrapTimeLeft] = useState(0);
    const [amrapDuration, setAmrapDuration] = useState(600); // 10 min default
    const [intervalRunning, setIntervalRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentMode = activeWorkout?.workout_mode ?? 'standard';

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

    // EMOM / AMRAP interval timer
    useEffect(() => {
        if (!intervalRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            if (currentMode === 'emom') {
                setEmomTimeLeft((t) => {
                    if (t <= 1) {
                        Vibration.vibrate([100, 100, 100]);
                        setEmomRound((r) => r + 1);
                        return emomInterval;
                    }
                    return t - 1;
                });
            } else if (currentMode === 'amrap') {
                setAmrapTimeLeft((t) => {
                    if (t <= 1) {
                        Vibration.vibrate([200, 200, 200, 200]);
                        setIntervalRunning(false);
                        return 0;
                    }
                    return t - 1;
                });
            }
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [intervalRunning, currentMode, emomInterval]);

    const startEmom = () => {
        setEmomRound(1);
        setEmomTimeLeft(emomInterval);
        setIntervalRunning(true);
    };

    const startAmrap = () => {
        setAmrapTimeLeft(amrapDuration);
        setIntervalRunning(true);
    };

    const MODE_LABELS: Record<WorkoutMode, string> = {
        standard: 'Standard',
        superset: 'Superset',
        circuit: 'Circuit',
        emom: 'EMOM',
        amrap: 'AMRAP',
    };

    const MODE_COLORS: Record<WorkoutMode, string> = {
        standard: Colors.primary,
        superset: '#8B5CF6',
        circuit: '#F59E0B',
        emom: '#EF4444',
        amrap: '#10B981',
    };

    const handleFinish = () => {
        toast.confirm({
            title: 'Finish Workout',
            message: 'Save this workout?',
            confirmLabel: 'Save',
            onConfirm: () => {
                // Grab exercises before finishing (finishWorkout clears activeWorkout)
                const workoutExercises = activeWorkout?.exercises.map((e) => e.exercise) ?? [];
                const completed = finishWorkout();
                if (completed) {
                    // Compute progression suggestions for next session
                    const { recentWorkouts } = useWorkoutStore.getState();
                    const suggestions = generateProgressionSuggestions(recentWorkouts, workoutExercises);
                    if (suggestions.length > 0) {
                        setProgressionResults(suggestions);
                    } else {
                        router.back();
                    }
                } else {
                    router.back();
                }
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
                    <TouchableOpacity
                        style={[styles.modeBadge, { backgroundColor: MODE_COLORS[currentMode] + '20' }]}
                        onPress={() => setShowModePicker(!showModePicker)}
                    >
                        <Text style={[styles.modeBadgeText, { color: MODE_COLORS[currentMode] }]}>
                            {MODE_LABELS[currentMode]}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={MODE_COLORS[currentMode]} />
                    </TouchableOpacity>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
                </View>
                <TouchableOpacity onPress={handleFinish}>
                    <Text style={styles.finishText}>Finish</Text>
                </TouchableOpacity>
            </View>

            {/* Mode Picker Dropdown */}
            {showModePicker && (
                <View style={styles.modeDropdown}>
                    {(Object.keys(MODE_LABELS) as WorkoutMode[]).map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.modeOption, currentMode === m && styles.modeOptionActive]}
                            onPress={() => {
                                setWorkoutMode(m);
                                setShowModePicker(false);
                                setIntervalRunning(false);
                            }}
                        >
                            <View style={[styles.modeOptionDot, { backgroundColor: MODE_COLORS[m] }]} />
                            <Text style={[styles.modeOptionText, currentMode === m && { color: MODE_COLORS[m] }]}>
                                {MODE_LABELS[m]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* EMOM Timer Banner */}
            {currentMode === 'emom' && (
                <View style={[styles.intervalBanner, { backgroundColor: '#EF444415' }]}>
                    {!intervalRunning ? (
                        <View style={styles.intervalSetup}>
                            <Text style={styles.intervalLabel}>EMOM Interval (sec):</Text>
                            <TouchableOpacity onPress={() => setEmomInterval(Math.max(10, emomInterval - 10))}>
                                <Ionicons name="remove-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={styles.intervalValue}>{emomInterval}</Text>
                            <TouchableOpacity onPress={() => setEmomInterval(emomInterval + 10)}>
                                <Ionicons name="add-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.intervalStartBtn} onPress={startEmom}>
                                <Ionicons name="play" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.intervalRunning} onPress={() => setIntervalRunning(false)}>
                            <Text style={styles.intervalRoundText}>Round {emomRound}</Text>
                            <Text style={styles.intervalTimeText}>{formatDuration(emomTimeLeft)}</Text>
                            <Text style={styles.intervalTapText}>Tap to stop</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* AMRAP Timer Banner */}
            {currentMode === 'amrap' && (
                <View style={[styles.intervalBanner, { backgroundColor: '#10B98115' }]}>
                    {!intervalRunning ? (
                        <View style={styles.intervalSetup}>
                            <Text style={styles.intervalLabel}>AMRAP Duration (min):</Text>
                            <TouchableOpacity onPress={() => setAmrapDuration(Math.max(60, amrapDuration - 60))}>
                                <Ionicons name="remove-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={styles.intervalValue}>{Math.round(amrapDuration / 60)}</Text>
                            <TouchableOpacity onPress={() => setAmrapDuration(amrapDuration + 60)}>
                                <Ionicons name="add-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.intervalStartBtn, { backgroundColor: '#10B981' }]} onPress={startAmrap}>
                                <Ionicons name="play" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.intervalRunning} onPress={() => setIntervalRunning(false)}>
                            <Text style={[styles.intervalTimeText, { color: amrapTimeLeft < 60 ? Colors.error : '#10B981' }]}>
                                {formatDuration(amrapTimeLeft)}
                            </Text>
                            <Text style={styles.intervalTapText}>Tap to stop</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Circuit Round Counter */}
            {currentMode === 'circuit' && (
                <View style={[styles.intervalBanner, { backgroundColor: '#F59E0B15' }]}>
                    <View style={styles.intervalSetup}>
                        <Text style={styles.intervalLabel}>Circuit Round:</Text>
                        <TouchableOpacity onPress={() => setCircuitRound(Math.max(1, circuitRound - 1))}>
                            <Ionicons name="remove-circle" size={28} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.intervalValue}>{circuitRound}/{circuitTotalRounds}</Text>
                        <TouchableOpacity onPress={() => setCircuitRound(circuitRound + 1)}>
                            <Ionicons name="add-circle" size={28} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.intervalLabel, { flex: 0 }]}>of</Text>
                        <TouchableOpacity onPress={() => setCircuitTotalRounds(Math.max(1, circuitTotalRounds - 1))}>
                            <Ionicons name="remove-circle-outline" size={22} color={Colors.textTertiary} />
                        </TouchableOpacity>
                        <Text style={styles.intervalValue}>{circuitTotalRounds}</Text>
                        <TouchableOpacity onPress={() => setCircuitTotalRounds(circuitTotalRounds + 1)}>
                            <Ionicons name="add-circle-outline" size={22} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Superset Groups Display */}
            {currentMode === 'superset' && (activeWorkout?.superset_groups ?? []).length > 0 && (
                <View style={styles.supersetGroupsBar}>
                    {activeWorkout!.superset_groups.map((g) => (
                        <TouchableOpacity
                            key={g.id}
                            style={styles.supersetGroupTag}
                            onPress={() => removeSupersetGroup(g.id)}
                        >
                            <Ionicons name="link" size={12} color="#8B5CF6" />
                            <Text style={styles.supersetGroupTagText}>{g.name}</Text>
                            <Ionicons name="close-circle" size={14} color="#8B5CF670" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

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
                {activeWorkout?.exercises.map((exercise, exIdx) => {
                    const supersetGroup = (activeWorkout.superset_groups ?? []).find(
                        (g) => g.exerciseIndices.includes(exIdx)
                    );
                    const isSelectedForSuperset = supersetSelection.includes(exIdx);
                    return (
                        <Card key={exercise.id} style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                                    {supersetGroup && (
                                        <View style={styles.supersetBadge}>
                                            <Ionicons name="link" size={10} color="#fff" />
                                        </View>
                                    )}
                                    <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                                </View>
                                {currentMode === 'superset' && !supersetGroup && (
                                    <TouchableOpacity
                                        style={[styles.supersetSelectBtn, isSelectedForSuperset && styles.supersetSelectBtnActive]}
                                        onPress={() => {
                                            setSupersetSelection((prev) =>
                                                prev.includes(exIdx) ? prev.filter((i) => i !== exIdx) : [...prev, exIdx]
                                            );
                                        }}
                                    >
                                        <Ionicons
                                            name={isSelectedForSuperset ? 'checkbox' : 'square-outline'}
                                            size={18}
                                            color={isSelectedForSuperset ? '#8B5CF6' : Colors.textTertiary}
                                        />
                                    </TouchableOpacity>
                                )}
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
                    );
                })}

                {/* Superset Group Button */}
                {currentMode === 'superset' && supersetSelection.length >= 2 && (
                    <TouchableOpacity
                        style={styles.createSupersetBtn}
                        onPress={() => {
                            const names = supersetSelection
                                .map((i) => activeWorkout?.exercises[i]?.exercise.name)
                                .filter(Boolean)
                                .join(' + ');
                            addSupersetGroup(names, [...supersetSelection], 60);
                            setSupersetSelection([]);
                        }}
                    >
                        <Ionicons name="link" size={18} color="#fff" />
                        <Text style={styles.createSupersetText}>
                            Group {supersetSelection.length} as Superset
                        </Text>
                    </TouchableOpacity>
                )}

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

            {/* Post-Workout Progression Modal */}
            {progressionResults && (
                <View style={styles.progressionOverlay}>
                    <View style={styles.progressionModal}>
                        <Text style={styles.progressionTitle}>💪 Next Session Suggestions</Text>
                        <Text style={styles.progressionSubtitle}>
                            Based on today's performance
                        </Text>
                        <ScrollView style={styles.progressionList} showsVerticalScrollIndicator={false}>
                            {progressionResults.map((p, i) => (
                                <View key={i} style={styles.progressionItem}>
                                    <View style={styles.progressionItemHeader}>
                                        <Text style={styles.progressionExName}>{p.exerciseName}</Text>
                                        <View style={[
                                            styles.progressionBadge,
                                            {
                                                backgroundColor:
                                                    p.type === 'weight_increase' ? '#10B98120' :
                                                        p.type === 'deload' ? '#F59E0B20' :
                                                            '#6366F120',
                                            },
                                        ]}>
                                            <Text style={[
                                                styles.progressionBadgeText,
                                                {
                                                    color:
                                                        p.type === 'weight_increase' ? '#10B981' :
                                                            p.type === 'deload' ? '#F59E0B' :
                                                                '#6366F1',
                                                },
                                            ]}>
                                                {p.type.replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.progressionReason}>{p.reason}</Text>
                                    <Text style={styles.progressionTarget}>
                                        → {p.suggestedWeight.toFixed(1)} kg × {p.suggestedReps} reps × {p.suggestedSets} sets
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.progressionDismissBtn}
                            onPress={() => {
                                setProgressionResults(null);
                                router.back();
                            }}
                        >
                            <Text style={styles.progressionDismissText}>Got It</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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

    // Mode picker
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    modeBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    modeDropdown: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight,
    },
    modeOptionActive: {
        backgroundColor: Colors.primary + '20',
    },
    modeOptionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modeOptionText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
    },

    // EMOM/AMRAP interval
    intervalBanner: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    intervalSetup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    intervalLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
        flex: 1,
    },
    intervalValue: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        width: 40,
        textAlign: 'center',
    },
    intervalStartBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.sm,
    },
    intervalRunning: {
        alignItems: 'center',
    },
    intervalRoundText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeight.semibold,
    },
    intervalTimeText: {
        fontSize: FontSize.xxxl || 40,
        fontWeight: FontWeight.bold,
        color: '#EF4444',
        fontVariant: ['tabular-nums'] as any,
    },
    intervalTapText: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
    },

    // Post-workout progression modal
    progressionOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    progressionModal: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        width: '100%',
        maxHeight: '80%',
    },
    progressionTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    progressionSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: Spacing.md,
    },
    progressionList: {
        maxHeight: 350,
    },
    progressionItem: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    progressionItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressionExName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        flex: 1,
    },
    progressionBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    progressionBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    progressionReason: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    progressionTarget: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.success,
        marginTop: 4,
    },
    progressionDismissBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    progressionDismissText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },

    // Superset grouping
    supersetGroupsBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    supersetGroupTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: '#8B5CF620',
    },
    supersetGroupTagText: {
        fontSize: FontSize.xs,
        color: '#8B5CF6',
        fontWeight: FontWeight.semibold,
    },
    supersetBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    supersetSelectBtn: {
        padding: 4,
    },
    supersetSelectBtnActive: {
        backgroundColor: '#8B5CF610',
        borderRadius: BorderRadius.sm,
    },
    createSupersetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        backgroundColor: '#8B5CF6',
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    createSupersetText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
});
