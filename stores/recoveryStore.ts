import { deleteSupplement, saveRecoveryLog, saveSupplement, saveSupplementLog, saveUserAchievement } from '@/lib/db';
import { postActivity } from '@/lib/socialDb';
import { generateId } from '@/lib/utils';
import type {
    Achievement,
    Challenge,
    RecoveryLog,
    Supplement,
    SupplementLog
} from '@/types';
import { create } from 'zustand';

// ── Built-in achievements ────────────────────────────────────

const ACHIEVEMENTS: Achievement[] = [
    // Workout achievements
    { id: 'a1', title: 'First Steps', description: 'Complete your first workout', icon: '🏋️', category: 'workout', requirement_type: 'workouts_completed', requirement_value: 1, xp_reward: 100, unlocked_at: null, progress: 0 },
    { id: 'a2', title: 'Getting Started', description: 'Complete 10 workouts', icon: '💪', category: 'workout', requirement_type: 'workouts_completed', requirement_value: 10, xp_reward: 250, unlocked_at: null, progress: 0 },
    { id: 'a3', title: 'Gym Rat', description: 'Complete 50 workouts', icon: '🐀', category: 'workout', requirement_type: 'workouts_completed', requirement_value: 50, xp_reward: 500, unlocked_at: null, progress: 0 },
    { id: 'a4', title: 'Iron Warrior', description: 'Complete 100 workouts', icon: '⚔️', category: 'workout', requirement_type: 'workouts_completed', requirement_value: 100, xp_reward: 1000, unlocked_at: null, progress: 0 },
    { id: 'a5', title: 'Living Legend', description: 'Complete 365 workouts', icon: '🏆', category: 'workout', requirement_type: 'workouts_completed', requirement_value: 365, xp_reward: 5000, unlocked_at: null, progress: 0 },

    // Strength achievements
    { id: 'a10', title: 'PR Machine', description: 'Set 10 personal records', icon: '📈', category: 'strength', requirement_type: 'prs_set', requirement_value: 10, xp_reward: 300, unlocked_at: null, progress: 0 },
    { id: 'a11', title: 'One Plate Club', description: 'Bench 135 lbs / 60 kg', icon: '🔵', category: 'strength', requirement_type: 'bench_1rm', requirement_value: 60, xp_reward: 200, unlocked_at: null, progress: 0 },
    { id: 'a12', title: 'Two Plate Club', description: 'Bench 225 lbs / 100 kg', icon: '🔴', category: 'strength', requirement_type: 'bench_1rm', requirement_value: 100, xp_reward: 500, unlocked_at: null, progress: 0 },
    { id: 'a13', title: 'Three Plate Club', description: 'Bench 315 lbs / 140 kg', icon: '⚫', category: 'strength', requirement_type: 'bench_1rm', requirement_value: 140, xp_reward: 1000, unlocked_at: null, progress: 0 },
    { id: 'a14', title: '1000 lb Club', description: 'Total 1000 lbs across S/B/D', icon: '👑', category: 'strength', requirement_type: 'sbd_total', requirement_value: 454, xp_reward: 2000, unlocked_at: null, progress: 0 },

    // Streak achievements
    { id: 'a20', title: 'Consistent', description: 'Maintain a 7-day streak', icon: '🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 7, xp_reward: 150, unlocked_at: null, progress: 0 },
    { id: 'a21', title: 'Dedicated', description: 'Maintain a 30-day streak', icon: '🔥🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 30, xp_reward: 500, unlocked_at: null, progress: 0 },
    { id: 'a22', title: 'Unstoppable', description: 'Maintain a 100-day streak', icon: '🔥🔥🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 100, xp_reward: 1500, unlocked_at: null, progress: 0 },
    { id: 'a23', title: 'Year of Iron', description: 'Maintain a 365-day streak', icon: '💎', category: 'streak', requirement_type: 'streak_days', requirement_value: 365, xp_reward: 5000, unlocked_at: null, progress: 0 },

    // Nutrition achievements
    { id: 'a30', title: 'Macro Master', description: 'Hit all macro targets for 7 days', icon: '🎯', category: 'nutrition', requirement_type: 'macro_days', requirement_value: 7, xp_reward: 300, unlocked_at: null, progress: 0 },
    { id: 'a31', title: 'Protein King', description: 'Log 200g+ protein in a day', icon: '🥩', category: 'nutrition', requirement_type: 'max_protein_day', requirement_value: 200, xp_reward: 150, unlocked_at: null, progress: 0 },
    { id: 'a32', title: 'Hydration Hero', description: 'Hit water goal 30 days in a row', icon: '💧', category: 'nutrition', requirement_type: 'water_streak', requirement_value: 30, xp_reward: 400, unlocked_at: null, progress: 0 },
    { id: 'a33', title: 'Food Logger', description: 'Log 100 meals', icon: '📝', category: 'nutrition', requirement_type: 'meals_logged', requirement_value: 100, xp_reward: 250, unlocked_at: null, progress: 0 },

    // Body achievements
    { id: 'a40', title: 'Transformation Begins', description: 'Log 10 weigh-ins', icon: '⚖️', category: 'body', requirement_type: 'weight_logs', requirement_value: 10, xp_reward: 100, unlocked_at: null, progress: 0 },
    { id: 'a41', title: 'Visual Progress', description: 'Take 10 progress photos', icon: '📸', category: 'body', requirement_type: 'photos_taken', requirement_value: 10, xp_reward: 200, unlocked_at: null, progress: 0 },
    { id: 'a42', title: 'Data Driven', description: 'Log measurements 10 times', icon: '📏', category: 'body', requirement_type: 'measurements_logged', requirement_value: 10, xp_reward: 200, unlocked_at: null, progress: 0 },

    // Milestone achievements
    { id: 'a50', title: 'Volume King', description: 'Lift 100,000 kg total volume', icon: '🏗️', category: 'milestone', requirement_type: 'total_volume', requirement_value: 100000, xp_reward: 1000, unlocked_at: null, progress: 0 },
    { id: 'a51', title: 'Million Pound Club', description: 'Lift 1,000,000 lbs total', icon: '🌟', category: 'milestone', requirement_type: 'total_volume', requirement_value: 453592, xp_reward: 5000, unlocked_at: null, progress: 0 },
    { id: 'a52', title: 'Level 10', description: 'Reach level 10', icon: '🎖️', category: 'milestone', requirement_type: 'level', requirement_value: 10, xp_reward: 500, unlocked_at: null, progress: 0 },
    { id: 'a53', title: 'Level 25', description: 'Reach level 25', icon: '🏅', category: 'milestone', requirement_type: 'level', requirement_value: 25, xp_reward: 2000, unlocked_at: null, progress: 0 },
];

// ── Built-in challenges ──────────────────────────────────────

function getWeekChallenge(): Challenge {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    return {
        id: `challenge-week-${now.toISOString().split('T')[0]}`,
        title: '7-Day Workout Challenge',
        description: 'Complete at least 4 workouts this week',
        type: 'weekly',
        start_date: now.toISOString(),
        end_date: weekEnd.toISOString(),
        target_value: 4,
        current_value: 0,
        unit: 'workouts',
        reward_xp: 200,
        status: 'active',
        participants: 12453,
    };
}

// ── Store ────────────────────────────────────────────────────

interface RecoveryState {
    // Recovery
    recoveryLogs: RecoveryLog[];
    todayRecovery: RecoveryLog | null;

    // Achievements
    achievements: Achievement[];
    recentlyUnlocked: Achievement[];

    // Challenges
    challenges: Challenge[];

    // Supplements
    supplements: Supplement[];
    supplementLogs: SupplementLog[];

    // Actions - Recovery
    logRecovery: (log: Omit<RecoveryLog, 'id' | 'user_id' | 'recovery_score'>) => void;

    // Actions - Achievements
    checkAchievements: (stats: Record<string, number>) => Achievement[];
    dismissUnlocked: () => void;

    // Actions - Challenges
    updateChallengeProgress: (challengeId: string, value: number) => void;

    // Actions - Supplements
    addSupplement: (supplement: Supplement) => void;
    removeSupplement: (id: string) => void;
    logSupplement: (supplementId: string) => void;
}

function computeRecoveryScore(log: Partial<RecoveryLog>): number {
    let score = 50; // baseline

    if (log.sleep_hours) {
        if (log.sleep_hours >= 7.5) score += 20;
        else if (log.sleep_hours >= 6.5) score += 10;
        else score -= 10;
    }
    if (log.sleep_quality) score += (log.sleep_quality - 3) * 5;
    if (log.soreness_level !== undefined) score -= log.soreness_level * 4;
    if (log.stress_level) score -= (log.stress_level - 3) * 5;
    if (log.energy_level) score += (log.energy_level - 3) * 5;
    if (log.mood) score += (log.mood - 3) * 3;
    if (log.resting_hr) {
        if (log.resting_hr < 60) score += 10;
        else if (log.resting_hr < 70) score += 5;
        else if (log.resting_hr > 80) score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
    recoveryLogs: [],
    todayRecovery: null,
    achievements: ACHIEVEMENTS,
    recentlyUnlocked: [],
    challenges: [getWeekChallenge()],
    supplements: [],
    supplementLogs: [],

    logRecovery: (log) => {
        const recovery: RecoveryLog = {
            ...log,
            id: generateId(),
            user_id: '',
            recovery_score: computeRecoveryScore(log),
        };
        set({
            todayRecovery: recovery,
            recoveryLogs: [recovery, ...get().recoveryLogs],
        });
        saveRecoveryLog(recovery).catch(() => { });
    },

    checkAchievements: (stats) => {
        const { achievements } = get();
        const newlyUnlocked: Achievement[] = [];

        const updated = achievements.map((a) => {
            if (a.unlocked_at) return a; // already unlocked

            const currentVal = stats[a.requirement_type] || 0;
            const progress = Math.min(100, Math.round((currentVal / a.requirement_value) * 100));

            if (currentVal >= a.requirement_value) {
                const unlocked = { ...a, progress: 100, unlocked_at: new Date().toISOString() };
                newlyUnlocked.push(unlocked);
                return unlocked;
            }

            return { ...a, progress };
        });

        if (newlyUnlocked.length > 0) {
            set({
                achievements: updated,
                recentlyUnlocked: [...get().recentlyUnlocked, ...newlyUnlocked],
            });
            // Persist each new achievement
            newlyUnlocked.forEach((a) => {
                saveUserAchievement(a.id).catch(() => { });
                postActivity(
                    'achievement_unlocked',
                    `Unlocked: ${a.title}`,
                    a.description,
                    { achievement_id: a.id },
                ).catch(() => { });
            });
        }

        return newlyUnlocked;
    },

    dismissUnlocked: () => set({ recentlyUnlocked: [] }),

    updateChallengeProgress: (challengeId, value) => {
        const { challenges } = get();
        set({
            challenges: challenges.map((c) => {
                if (c.id !== challengeId) return c;
                const newVal = c.current_value + value;
                return {
                    ...c,
                    current_value: newVal,
                    status: newVal >= c.target_value ? 'completed' : c.status,
                };
            }),
        });
    },

    addSupplement: (supplement) => {
        set({ supplements: [...get().supplements, supplement] });
        saveSupplement(supplement).catch(() => { });
    },

    removeSupplement: (id) => {
        set({ supplements: get().supplements.filter((s) => s.id !== id) });
        deleteSupplement(id).catch(() => { });
    },

    logSupplement: (supplementId) => {
        const log = { id: generateId(), supplement_id: supplementId, taken_at: new Date().toISOString() };
        set({
            supplementLogs: [...get().supplementLogs, log],
        });
        saveSupplementLog(log).catch(() => { });
    },
}));
