import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { fetchOpenExerciseDirectory } from '@/lib/openExerciseDirectory';
import { displayWeightFromKg, formatDuration, formatWeight, getWeightUnit, inputWeightToKg } from '@/lib/utils';
import { generateProgressionSuggestions, type ProgressionSuggestion } from '@/lib/workoutIntelligence';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { Exercise, WorkoutMode } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes'] as const;
const EQUIPMENT_FILTERS = ['All', 'Home', 'Calisthenics', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Band', 'Kettlebell'] as const;
const FULL_LIBRARY_MIN_EXERCISES = 100;

export default function ActiveWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const {
        activeWorkout,
        isWorkoutActive,
        restTimerSeconds,
        isRestTimerRunning,
        startWorkout,
        finishWorkout,
        discardWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
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
        exercises,
        setExercises,
    } = useWorkoutStore();

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [directoryLoading, setDirectoryLoading] = useState(false);
    const [directoryError, setDirectoryError] = useState<string | null>(null);
    const [directoryReloadKey, setDirectoryReloadKey] = useState(0);
    const [muscleFilter, setMuscleFilter] = useState<(typeof MUSCLE_FILTERS)[number]>('All');
    const [equipmentFilter, setEquipmentFilter] = useState<(typeof EQUIPMENT_FILTERS)[number]>('All');
    const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);
    const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
    const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
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
    const weightUnit = getWeightUnit(user?.unit_system);

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
        circuit: Colors.primary,
        emom: '#EF4444',
        amrap: '#10B981',
    };

    const handleFinish = () => {
        if (!activeWorkout || activeWorkout.exercises.length === 0) {
            Alert.alert('Empty workout', 'Add at least one exercise before finishing.');
            return;
        }

        const hasCompletedSet = activeWorkout.exercises.some((exercise) =>
            exercise.sets.some((set) => set.completed)
        );

        if (!hasCompletedSet) {
            Alert.alert('No completed sets', 'Check off at least one set before saving this workout.');
            return;
        }

        Alert.alert('Finish Workout', 'Save this workout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Save',
                onPress: () => {
                    const workoutExercises = activeWorkout.exercises.map((e) => e.exercise);
                    const completed = finishWorkout();
                    if (completed) {
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
            },
        ]);
    };

    const handleDiscard = () => {
        Alert.alert('Discard Workout', 'Are you sure? All progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                    stopRestTimer();
                discardWorkout();
                router.back();
            },
            },
        ]);
    };

    useEffect(() => {
        if (!showExercisePicker || exercises.length >= FULL_LIBRARY_MIN_EXERCISES || directoryLoading) return;

        let mounted = true;
        setDirectoryLoading(true);
        setDirectoryError(null);
        fetchOpenExerciseDirectory()
            .then((exercises) => {
                if (mounted) setExercises(exercises);
            })
            .catch((error) => {
                if (mounted) setDirectoryError(error instanceof Error ? error.message : 'Unable to load exercise directory');
            })
            .finally(() => {
                if (mounted) setDirectoryLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [directoryLoading, directoryReloadKey, exercises.length, setExercises, showExercisePicker]);

    const filteredExercises = useMemo(() => {
        const query = exerciseSearch.trim().toLowerCase();

        return exercises.filter((exercise) => {
            const matchesQuery = !query ||
                exercise.name.toLowerCase().includes(query) ||
                exercise.equipment.toLowerCase().includes(query) ||
                exercise.muscle_groups.some((muscle) => muscle.includes(query));
            return matchesQuery &&
                matchesMuscleFilter(exercise, muscleFilter) &&
                matchesEquipmentFilter(exercise, equipmentFilter);
        });
    }, [equipmentFilter, exerciseSearch, exercises, muscleFilter]);

    const addTypedSet = (exerciseIndex: number, setType: 'normal' | 'warmup' | 'volume' | 'drop' | 'failure') => {
        const nextSetIndex = activeWorkout?.exercises[exerciseIndex]?.sets.length ?? 0;
        addSet(exerciseIndex);
        setTimeout(() => updateSet(exerciseIndex, nextSetIndex, { set_type: setType }), 0);
    };

    const showExerciseActions = (exerciseIndex: number) => {
        const item = activeWorkout?.exercises[exerciseIndex];
        if (!item) return;

        Alert.alert(item.exercise.name, 'Exercise options', [
            {
                text: 'View form guide',
                onPress: () => setGuideExercise(item.exercise),
            },
            {
                text: openNotes[item.id] ? 'Hide notes' : 'Add notes',
                onPress: () => setOpenNotes((current) => ({ ...current, [item.id]: !current[item.id] })),
            },
            {
                text: 'Add warmup set',
                onPress: () => addTypedSet(exerciseIndex, 'warmup'),
            },
            {
                text: 'Add volume set',
                onPress: () => addTypedSet(exerciseIndex, 'volume'),
            },
            {
                text: 'Add failure set',
                onPress: () => addTypedSet(exerciseIndex, 'failure'),
            },
            {
                text: 'Remove exercise',
                style: 'destructive',
                onPress: () => removeExerciseFromWorkout(exerciseIndex),
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

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
                <View style={[styles.intervalBanner, { backgroundColor: Colors.primary + '18' }]}>
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
                                <TouchableOpacity onPress={() => showExerciseActions(exIdx)} hitSlop={10}>
                                    <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.exerciseMediaRow}
                                activeOpacity={0.82}
                                onPress={() => setGuideExercise(exercise.exercise)}
                            >
                                <View style={styles.exerciseThumb}>
                                    {exercise.exercise.image_url ? (
                                        <Image
                                            source={{ uri: exercise.exercise.image_url }}
                                            style={styles.exerciseThumbImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Ionicons name="body-outline" size={24} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={styles.exerciseMediaCopy}>
                                    <Text style={styles.exerciseMediaTitle}>Form guide</Text>
                                    <Text style={styles.exerciseMediaMeta} numberOfLines={1}>
                                        {formatLabel(exercise.exercise.equipment)} • {exercise.exercise.muscle_groups.map(formatLabel).slice(0, 2).join(', ')}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                            </TouchableOpacity>

                            {openNotes[exercise.id] && (
                                <TextInput
                                    style={styles.exerciseNoteInput}
                                    value={exerciseNotes[exercise.id] || ''}
                                    onChangeText={(value) => setExerciseNotes((current) => ({ ...current, [exercise.id]: value }))}
                                    placeholder="Add cues, machine setup, grip width, pain notes..."
                                    placeholderTextColor={Colors.textTertiary}
                                    multiline
                                />
                            )}

                            {/* Sets header */}
                            <View style={styles.setsHeader}>
                                <Text style={[styles.setHeaderText, { width: 40 }]}>SET</Text>
                                <Text style={[styles.setHeaderText, { flex: 1 }]}>PREV</Text>
                                <Text style={[styles.setHeaderText, { width: 70 }]}>{weightUnit.toUpperCase()}</Text>
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
                                        {set.set_type === 'warmup'
                                            ? 'W'
                                            : set.set_type === 'volume'
                                                ? 'V'
                                                : set.set_type === 'drop'
                                                    ? 'D'
                                                    : set.set_type === 'failure'
                                                        ? 'F'
                                                        : set.set_number}
                                    </Text>
                                    <Text style={[styles.setPrev, { flex: 1 }]}>—</Text>
                                    <TextInput
                                        style={styles.setInput}
                                        value={set.weight_kg ? displayWeightFromKg(set.weight_kg, user?.unit_system).toString() : ''}
                                        onChangeText={(v) =>
                                            updateSet(exIdx, setIdx, {
                                                weight_kg: v ? inputWeightToKg(parseFloat(v), user?.unit_system) : null,
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
                            placeholder="Search exercises, muscle, equipment..."
                            placeholderTextColor={Colors.textTertiary}
                            value={exerciseSearch}
                            onChangeText={setExerciseSearch}
                            autoFocus
                        />
                        <Text style={styles.filterLabel}>Muscle group</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {MUSCLE_FILTERS.map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[styles.filterChip, muscleFilter === filter && styles.filterChipActive]}
                                    onPress={() => setMuscleFilter(filter)}
                                >
                                    <Text style={[styles.filterChipText, muscleFilter === filter && styles.filterChipTextActive]}>
                                        {filter}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Text style={styles.filterLabel}>Equipment / style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {EQUIPMENT_FILTERS.map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[styles.filterChip, equipmentFilter === filter && styles.filterChipActive]}
                                    onPress={() => setEquipmentFilter(filter)}
                                >
                                    <Text style={[styles.filterChipText, equipmentFilter === filter && styles.filterChipTextActive]}>
                                        {filter}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.resultsHeader}>
                            <Text style={styles.resultsTitle}>Exercises</Text>
                            <Text style={styles.resultsCount}>
                                {directoryLoading && exercises.length < FULL_LIBRARY_MIN_EXERCISES ? 'Loading full library...' : `${filteredExercises.length} results`}
                            </Text>
                        </View>
                        {directoryError && (
                            <View style={styles.directoryNotice}>
                                <Text style={styles.directoryError}>{directoryError}</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDirectoryError(null);
                                        setDirectoryLoading(false);
                                        setDirectoryReloadKey((key) => key + 1);
                                    }}
                                >
                                    <Text style={styles.retryText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {filteredExercises.slice(0, 120).map((exercise) => (
                            <TouchableOpacity
                                key={exercise.id}
                                style={styles.pickerRow}
                                onPress={() => {
                                    addExerciseToWorkout(exercise);
                                    setShowExercisePicker(false);
                                    setExerciseSearch('');
                                }}
                            >
                                <View style={styles.pickerImageWrap}>
                                    {exercise.image_url ? (
                                        <Image source={{ uri: exercise.image_url }} style={styles.pickerImage} resizeMode="cover" />
                                    ) : (
                                        <Ionicons name="barbell-outline" size={24} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={styles.pickerInfo}>
                                    <Text style={styles.pickerExName}>{exercise.name}</Text>
                                    <Text style={styles.pickerExMeta}>
                                        {formatLabel(exercise.muscle_groups[0])} • {formatLabel(exercise.equipment)}
                                    </Text>
                                </View>
                                <Ionicons name="add-circle" size={22} color={Colors.primary} />
                            </TouchableOpacity>
                        ))}
                        {!directoryLoading && filteredExercises.length === 0 && (
                            <View style={styles.emptyPicker}>
                                <Ionicons name="search" size={28} color={Colors.textTertiary} />
                                <Text style={styles.emptyPickerText}>
                                    {exercises.length === 0 ? 'Exercise library is loading' : 'No exercises found'}
                                </Text>
                            </View>
                        )}
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
                                                        p.type === 'deload' ? Colors.primary + '18' :
                                                            '#6366F120',
                                            },
                                        ]}>
                                            <Text style={[
                                                styles.progressionBadgeText,
                                                {
                                                    color:
                                                        p.type === 'weight_increase' ? '#10B981' :
                                                            p.type === 'deload' ? Colors.primary :
                                                                '#6366F1',
                                                },
                                            ]}>
                                                {p.type.replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.progressionReason}>{p.reason}</Text>
                                    <Text style={styles.progressionTarget}>
                                        → {formatWeight(p.suggestedWeight, user?.unit_system)} × {p.suggestedReps} reps × {p.suggestedSets} sets
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

            <Modal
                visible={!!guideExercise}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setGuideExercise(null)}
            >
                {guideExercise && (
                    <View style={styles.guideContainer}>
                        <View style={[styles.guideHeader, { paddingTop: insets.top + Spacing.sm }]}>
                            <TouchableOpacity style={styles.guideClose} onPress={() => setGuideExercise(null)}>
                                <Ionicons name="close" size={22} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.guideHeaderTitle}>Exercise Guide</Text>
                            <View style={styles.guideClose} />
                        </View>
                        <ScrollView contentContainerStyle={styles.guideContent} showsVerticalScrollIndicator={false}>
                            {guideExercise.image_url ? (
                                <Image
                                    source={{ uri: guideExercise.image_url }}
                                    style={styles.guideImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.guideImageFallback}>
                                    <Ionicons name="body-outline" size={42} color={Colors.primary} />
                                </View>
                            )}
                            <Text style={styles.guideTitle}>{guideExercise.name}</Text>
                            <View style={styles.guidePills}>
                                <Text style={styles.guidePill}>{formatLabel(guideExercise.equipment)}</Text>
                                {guideExercise.muscle_groups.slice(0, 3).map((muscle) => (
                                    <Text key={muscle} style={styles.guidePill}>{formatLabel(muscle)}</Text>
                                ))}
                            </View>
                            <Text style={styles.guideSectionTitle}>Form cues</Text>
                            {(guideExercise.instructions || 'Keep control through the full range of motion. Brace, move with intent, and stop if the movement causes pain.')
                                .split('\n')
                                .filter(Boolean)
                                .slice(0, 8)
                                .map((instruction, index) => (
                                    <View key={`${guideExercise.id}-${index}`} style={styles.guideCueRow}>
                                        <Text style={styles.guideCueNumber}>{index + 1}</Text>
                                        <Text style={styles.guideCueText}>{instruction}</Text>
                                    </View>
                                ))}
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </View>
    );
}

function formatLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesMuscleFilter(exercise: Exercise, filter: (typeof MUSCLE_FILTERS)[number]) {
    const groups = exercise.muscle_groups;
    switch (filter) {
        case 'Chest':
            return groups.includes('chest');
        case 'Back':
            return groups.some((group) => ['back', 'lats', 'lower_back', 'traps'].includes(group));
        case 'Shoulders':
            return groups.includes('shoulders');
        case 'Arms':
            return groups.some((group) => ['biceps', 'triceps', 'forearms'].includes(group));
        case 'Legs':
            return groups.some((group) => ['quads', 'hamstrings', 'calves'].includes(group));
        case 'Core':
            return groups.some((group) => ['abs', 'obliques'].includes(group));
        case 'Glutes':
            return groups.includes('glutes');
        default:
            return true;
    }
}

function matchesEquipmentFilter(exercise: Exercise, filter: (typeof EQUIPMENT_FILTERS)[number]) {
    switch (filter) {
        case 'Home':
            return ['bodyweight', 'none', 'band', 'dumbbell', 'kettlebell'].includes(exercise.equipment);
        case 'Calisthenics':
            return exercise.equipment === 'bodyweight' || exercise.category === 'bodyweight';
        case 'Barbell':
            return exercise.equipment === 'barbell';
        case 'Dumbbell':
            return exercise.equipment === 'dumbbell';
        case 'Cable':
            return exercise.equipment === 'cable';
        case 'Machine':
            return exercise.equipment === 'machine';
        case 'Band':
            return exercise.equipment === 'band';
        case 'Kettlebell':
            return exercise.equipment === 'kettlebell';
        default:
            return true;
    }
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
    exerciseMediaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    exerciseThumb: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    exerciseThumbImage: {
        width: '100%',
        height: '100%',
    },
    exerciseMediaCopy: {
        flex: 1,
    },
    exerciseMediaTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    exerciseMediaMeta: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    exerciseNoteInput: {
        minHeight: 78,
        color: Colors.text,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: FontSize.sm,
        lineHeight: 19,
        textAlignVertical: 'top',
        marginBottom: Spacing.lg,
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
    filterLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
    },
    filterScroll: {
        marginBottom: Spacing.md,
    },
    filterChip: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginRight: Spacing.sm,
    },
    filterChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '18',
    },
    filterChipText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    filterChipTextActive: {
        color: Colors.primary,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    resultsTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    resultsCount: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    directoryNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    directoryError: {
        flex: 1,
        color: Colors.warning,
        fontSize: FontSize.xs,
        lineHeight: 16,
    },
    retryText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    pickerImageWrap: {
        width: 58,
        height: 58,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pickerImage: {
        width: '100%',
        height: '100%',
    },
    pickerInfo: {
        flex: 1,
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
    emptyPicker: {
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.xl,
    },
    emptyPickerText: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
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
    guideContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    guideClose: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideHeaderTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    guideContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.huge,
    },
    guideImage: {
        width: '100%',
        height: 260,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    guideImageFallback: {
        height: 220,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    guideTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        lineHeight: 32,
        fontWeight: FontWeight.heavy,
        marginBottom: Spacing.md,
    },
    guidePills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    guidePill: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        backgroundColor: Colors.primary + '18',
        borderColor: Colors.primary + '18',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        overflow: 'hidden',
    },
    guideSectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },
    guideCueRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    guideCueNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.primary,
        color: Colors.textInverse,
        textAlign: 'center',
        lineHeight: 26,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        overflow: 'hidden',
    },
    guideCueText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
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
