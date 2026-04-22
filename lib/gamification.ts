import type { UserProfile } from '@/types';

// XP rewards for various actions
export const XP_REWARDS = {
    COMPLETE_WORKOUT: 100,
    LOG_FOOD: 10,
    LOG_WATER: 5,
    LOG_WEIGHT: 20,
    LOG_MEASUREMENT: 30,
    TAKE_PROGRESS_PHOTO: 25,
    COMPLETE_GOAL: 200,
    MAINTAIN_STREAK: 50, // bonus per day of streak
    FIRST_WORKOUT: 200,  // one-time bonus
} as const;

// Level thresholds (XP needed to reach each level)
const LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200,
    6500, 8000, 9700, 11600, 13700, 16000, 18500, 21200, 24100, 27200,
    30500, 34000, 37700, 41600, 45700, 50000, 55000, 60000, 66000, 72000,
    80000, 88000, 97000, 107000, 118000, 130000, 145000, 160000, 180000, 200000,
];

/**
 * Get the level for a given XP amount
 */
export function getLevelForXP(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
}

/**
 * Get XP progress within current level (0 to 1)
 */
export function getLevelProgress(xp: number): number {
    const level = getLevelForXP(xp);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;
    return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(xp: number): number {
    const level = getLevelForXP(xp);
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 10000;
    return nextThreshold - xp;
}

/**
 * Calculate new streak count based on last activity date
 */
export function calculateStreak(lastActivityDate: string | null, currentStreak: number): number {
    if (!lastActivityDate) return 1; // first activity ever

    const last = new Date(lastActivityDate);
    const now = new Date();
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return currentStreak; // same day, no change
    if (diffDays === 1) return currentStreak + 1; // consecutive day
    return 1; // streak broken, restart
}

/**
 * Apply XP reward and update user profile
 */
export function applyXPReward(
    user: UserProfile,
    reward: keyof typeof XP_REWARDS,
): Partial<UserProfile> {
    const xpGain = XP_REWARDS[reward];
    const newXP = user.xp + xpGain;
    const newLevel = getLevelForXP(newXP);

    return {
        xp: newXP,
        level: newLevel,
    };
}

/**
 * Get level title based on level number
 */
export function getLevelTitle(level: number): string {
    if (level <= 5) return 'Rookie';
    if (level <= 10) return 'Regular';
    if (level <= 15) return 'Dedicated';
    if (level <= 20) return 'Warrior';
    if (level <= 25) return 'Champion';
    if (level <= 30) return 'Elite';
    if (level <= 35) return 'Legend';
    return 'Mythic';
}
