import { DEFAULT_REST_SECONDS } from '@/constants/config';
import { savePersonalRecords, saveWorkoutSession } from '@/lib/db';
import { applyXPReward, calculateStreak } from '@/lib/gamification';
import { postActivity } from '@/lib/socialDb';
import { generateId } from '@/lib/utils';
import type {
    Exercise,
    PersonalRecord,
    SupersetGroup,
    UserProfile,
    WorkoutMode,
    WorkoutSession,
    WorkoutSessionExercise,
    WorkoutSet,
    WorkoutTemplate,
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

interface WorkoutState {
    // Active workout
    activeWorkout: WorkoutSession | null;
    isWorkoutActive: boolean;
    restTimerSeconds: number;
    isRestTimerRunning: boolean;

    // Data
    templates: WorkoutTemplate[];
    recentWorkouts: WorkoutSession[];
    personalRecords: PersonalRecord[];
    exercises: Exercise[];

    // Actions - Active Workout
    startWorkout: (name: string, templateId?: string, mode?: WorkoutMode) => void;
    finishWorkout: () => WorkoutSession | null;
    discardWorkout: () => void;
    addExerciseToWorkout: (exercise: Exercise) => void;
    removeExerciseFromWorkout: (exerciseIndex: number) => void;
    addSet: (exerciseIndex: number) => void;
    updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<WorkoutSet>) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;
    toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
    setWorkoutMode: (mode: WorkoutMode) => void;
    addSupersetGroup: (name: string, exerciseIndices: number[], restBetween: number) => void;
    removeSupersetGroup: (groupId: string) => void;

    // Actions - Rest Timer
    startRestTimer: (seconds?: number) => void;
    stopRestTimer: () => void;
    tickRestTimer: () => void;

    // Actions - Data
    setTemplates: (templates: WorkoutTemplate[]) => void;
    setRecentWorkouts: (workouts: WorkoutSession[]) => void;
    setPersonalRecords: (records: PersonalRecord[]) => void;
    setExercises: (exercises: Exercise[]) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
    persist(
        (set, get) => ({
            activeWorkout: null,
            isWorkoutActive: false,
            restTimerSeconds: 0,
            isRestTimerRunning: false,
            templates: [],
            recentWorkouts: [],
            personalRecords: [],
            exercises: [],

            startWorkout: (name, templateId, mode) => {
                const workout: WorkoutSession = {
                    id: generateId(),
                    user_id: '',
                    template_id: templateId || null,
                    name,
                    started_at: new Date().toISOString(),
                    completed_at: null,
                    duration_seconds: null,
                    total_volume_kg: 0,
                    notes: null,
                    mood: null,
                    exercises: [],
                    workout_mode: mode ?? 'standard',
                    superset_groups: [],
                };
                set({ activeWorkout: workout, isWorkoutActive: true });
            },

            finishWorkout: () => {
                const { activeWorkout, personalRecords } = get();
                if (!activeWorkout) return null;

                const completedAt = new Date().toISOString();
                const startedAt = new Date(activeWorkout.started_at).getTime();
                const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

                let totalVolume = 0;
                const newPRs: PersonalRecord[] = [];

                for (const ex of activeWorkout.exercises) {
                    for (const s of ex.sets) {
                        if (s.completed && s.weight_kg && s.reps) {
                            totalVolume += s.weight_kg * s.reps;

                            // PR auto-detection: check if this set beats existing records
                            const estimated1RM = s.reps === 1
                                ? s.weight_kg
                                : Math.round(s.weight_kg * (1 + s.reps / 30));

                            const existingPR = personalRecords.find(
                                (pr) => pr.exercise_id === ex.exercise_id
                            );

                            if (!existingPR || estimated1RM > existingPR.estimated_1rm_kg) {
                                // Mark the set as a PR
                                s.is_pr = true;

                                // Remove old PR for this exercise from newPRs list (keep best)
                                const existingNewPR = newPRs.findIndex(
                                    (pr) => pr.exercise_id === ex.exercise_id
                                );
                                if (existingNewPR !== -1) {
                                    if (estimated1RM > newPRs[existingNewPR].estimated_1rm_kg) {
                                        newPRs[existingNewPR] = {
                                            id: generateId(),
                                            user_id: '',
                                            exercise_id: ex.exercise_id,
                                            exercise_name: ex.exercise.name,
                                            weight_kg: s.weight_kg,
                                            reps: s.reps,
                                            estimated_1rm_kg: estimated1RM,
                                            achieved_at: completedAt,
                                        };
                                    }
                                } else {
                                    newPRs.push({
                                        id: generateId(),
                                        user_id: '',
                                        exercise_id: ex.exercise_id,
                                        exercise_name: ex.exercise.name,
                                        weight_kg: s.weight_kg,
                                        reps: s.reps,
                                        estimated_1rm_kg: estimated1RM,
                                        achieved_at: completedAt,
                                    });
                                }
                            }
                        }
                    }
                }

                // Merge new PRs: replace existing exercise PRs, keep others
                const updatedPRs = [
                    ...personalRecords.filter(
                        (pr) => !newPRs.some((npr) => npr.exercise_id === pr.exercise_id)
                    ),
                    ...newPRs,
                ];

                const finished: WorkoutSession = {
                    ...activeWorkout,
                    completed_at: completedAt,
                    duration_seconds: durationSeconds,
                    total_volume_kg: Math.round(totalVolume),
                };

                set({
                    activeWorkout: null,
                    isWorkoutActive: false,
                    recentWorkouts: [finished, ...get().recentWorkouts],
                    personalRecords: updatedPRs,
                });

                // Persist to Supabase (fire-and-forget)
                saveWorkoutSession(finished).catch(() => { });
                if (newPRs.length > 0) savePersonalRecords(newPRs).catch(() => { });

                // Post to social feed
                const durationMin = Math.round((finished.duration_seconds || 0) / 60);
                postActivity(
                    'workout_completed',
                    `Completed ${finished.name}`,
                    `${finished.exercises.length} exercises · ${durationMin}min · ${Math.round(totalVolume)}kg volume`,
                    { duration_min: durationMin, volume_kg: Math.round(totalVolume), exercise_count: finished.exercises.length },
                ).catch(() => { });

                if (newPRs.length > 0) {
                    for (const pr of newPRs) {
                        postActivity(
                            'personal_record',
                            `New PR: ${pr.exercise_name}`,
                            `${pr.weight_kg}kg × ${pr.reps} (Est. 1RM: ${pr.estimated_1rm_kg}kg)`,
                            { exercise_name: pr.exercise_name, weight_kg: pr.weight_kg, reps: pr.reps },
                        ).catch(() => { });
                    }
                }

                // Award XP for completing workout
                const authState = useAuthStore.getState();
                if (authState.user) {
                    const user = authState.user;
                    const isFirst = get().recentWorkouts.length === 1; // only the one we just added
                    const xpUpdate = applyXPReward(user, isFirst ? 'FIRST_WORKOUT' : 'COMPLETE_WORKOUT');
                    const newStreak = calculateStreak(user.last_workout_date || null, user.streak_count);

                    let mergedUpdate: Partial<UserProfile> = {
                        ...xpUpdate,
                        streak_count: newStreak,
                        workouts_completed: (user.workouts_completed || 0) + 1,
                        last_workout_date: new Date().toISOString(),
                    };

                    // Award streak bonus XP if streak > 1
                    if (newStreak > 1) {
                        const streakUpdate = applyXPReward(
                            { ...user, ...xpUpdate },
                            'MAINTAIN_STREAK',
                        );
                        mergedUpdate = { ...mergedUpdate, ...streakUpdate };
                    }

                    authState.updateUser(mergedUpdate);

                    // Check achievements
                    const { useRecoveryStore } = require('./recoveryStore');
                    const recoveryState = useRecoveryStore.getState();
                    recoveryState.checkAchievements({
                        workouts_completed: (user.workouts_completed || 0) + 1,
                        streak_days: newStreak,
                        prs_set: updatedPRs.length,
                        total_volume: Math.round(totalVolume) + get().recentWorkouts.reduce((s, w) => s + (w.total_volume_kg || 0), 0),
                        level: (xpUpdate.level || user.level || 1),
                    });

                    // Update weekly challenge progress
                    const challenges = recoveryState.challenges;
                    const activeChallenge = challenges.find((c: { status: string }) => c.status === 'active');
                    if (activeChallenge) {
                        recoveryState.updateChallengeProgress(activeChallenge.id, 1);
                    }
                }

                return finished;
            },

            discardWorkout: () => {
                set({ activeWorkout: null, isWorkoutActive: false });
            },

            addExerciseToWorkout: (exercise) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const newExercise: WorkoutSessionExercise = {
                    id: generateId(),
                    exercise_id: exercise.id,
                    exercise,
                    order: activeWorkout.exercises.length,
                    sets: [
                        {
                            id: generateId(),
                            set_number: 1,
                            set_type: 'normal',
                            reps: null,
                            weight_kg: null,
                            duration_seconds: null,
                            distance_meters: null,
                            rpe: null,
                            is_pr: false,
                            completed: false,
                        },
                    ],
                };

                set({
                    activeWorkout: {
                        ...activeWorkout,
                        exercises: [...activeWorkout.exercises, newExercise],
                    },
                });
            },

            removeExerciseFromWorkout: (exerciseIndex) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;
                const exercises = [...activeWorkout.exercises];
                exercises.splice(exerciseIndex, 1);
                set({ activeWorkout: { ...activeWorkout, exercises } });
            },

            addSet: (exerciseIndex) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const exercises = [...activeWorkout.exercises];
                const exercise = { ...exercises[exerciseIndex] };
                const lastSet = exercise.sets[exercise.sets.length - 1];

                exercise.sets = [
                    ...exercise.sets,
                    {
                        id: generateId(),
                        set_number: exercise.sets.length + 1,
                        set_type: 'normal',
                        reps: lastSet?.reps || null,
                        weight_kg: lastSet?.weight_kg || null,
                        duration_seconds: null,
                        distance_meters: null,
                        rpe: null,
                        is_pr: false,
                        completed: false,
                    },
                ];
                exercises[exerciseIndex] = exercise;
                set({ activeWorkout: { ...activeWorkout, exercises } });
            },

            updateSet: (exerciseIndex, setIndex, updates) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const exercises = [...activeWorkout.exercises];
                const exercise = { ...exercises[exerciseIndex] };
                const sets = [...exercise.sets];
                sets[setIndex] = { ...sets[setIndex], ...updates };
                exercise.sets = sets;
                exercises[exerciseIndex] = exercise;
                set({ activeWorkout: { ...activeWorkout, exercises } });
            },

            removeSet: (exerciseIndex, setIndex) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const exercises = [...activeWorkout.exercises];
                const exercise = { ...exercises[exerciseIndex] };
                exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
                exercises[exerciseIndex] = exercise;
                set({ activeWorkout: { ...activeWorkout, exercises } });
            },

            toggleSetComplete: (exerciseIndex, setIndex) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const exercises = [...activeWorkout.exercises];
                const exercise = { ...exercises[exerciseIndex] };
                const sets = [...exercise.sets];
                sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
                exercise.sets = sets;
                exercises[exerciseIndex] = exercise;
                set({ activeWorkout: { ...activeWorkout, exercises } });
            },

            startRestTimer: (seconds = DEFAULT_REST_SECONDS) => {
                set({ restTimerSeconds: seconds, isRestTimerRunning: true });
            },

            stopRestTimer: () => {
                set({ restTimerSeconds: 0, isRestTimerRunning: false });
            },

            tickRestTimer: () => {
                const { restTimerSeconds } = get();
                if (restTimerSeconds <= 1) {
                    set({ restTimerSeconds: 0, isRestTimerRunning: false });
                } else {
                    set({ restTimerSeconds: restTimerSeconds - 1 });
                }
            },

            setTemplates: (templates) => set({ templates }),
            setRecentWorkouts: (recentWorkouts) => set({ recentWorkouts }),
            setPersonalRecords: (personalRecords) => set({ personalRecords }),
            setExercises: (exercises) => set({ exercises }),

            setWorkoutMode: (mode) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;
                set({ activeWorkout: { ...activeWorkout, workout_mode: mode } });
            },

            addSupersetGroup: (name, exerciseIndices, restBetween) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;
                const group: SupersetGroup = {
                    id: generateId(),
                    name,
                    exerciseIndices,
                    restBetweenRounds: restBetween,
                };
                set({
                    activeWorkout: {
                        ...activeWorkout,
                        superset_groups: [...activeWorkout.superset_groups, group],
                    },
                });
            },

            removeSupersetGroup: (groupId) => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;
                set({
                    activeWorkout: {
                        ...activeWorkout,
                        superset_groups: activeWorkout.superset_groups.filter((g) => g.id !== groupId),
                    },
                });
            },
        }),
        {
            name: 'fitfusion-workout',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                templates: state.templates,
                recentWorkouts: state.recentWorkouts,
                personalRecords: state.personalRecords,
                exercises: state.exercises,
            }),
        }
    )
);
