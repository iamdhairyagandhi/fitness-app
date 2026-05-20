import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { SocialChallenge } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CHALLENGE_ICONS: Record<string, string> = {
    workout_count: 'barbell',
    total_volume: 'trending-up',
    streak: 'flame',
    steps: 'walk',
    calories_burned: 'flash',
    custom: 'flag',
};

interface ChallengeCardProps {
    challenge: SocialChallenge;
    onPress: (id: string) => void;
    onJoin: (id: string) => void;
    onLeave: (id: string) => void;
}

export function ChallengeCard({ challenge, onPress, onJoin, onLeave }: ChallengeCardProps) {
    const { colors } = useTheme();
    const icon = CHALLENGE_ICONS[challenge.challenge_type] || 'flag';
    const daysLeft = Math.max(0, Math.ceil(
        (new Date(challenge.end_date).getTime() - Date.now()) / 86400000
    ));
    const isJoined = !!challenge.user_participation;
    const progress = isJoined && challenge.target_value > 0
        ? Math.min(100, Math.round((challenge.user_participation!.current_value / challenge.target_value) * 100))
        : 0;

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onPress(challenge.id)}>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Ionicons name={icon as any} size={20} color={Colors.analytics} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{challenge.title}</Text>
                    <Text style={[styles.creator, { color: colors.textTertiary }]}>
                        by {challenge.creator?.display_name || 'Unknown'}
                    </Text>
                </View>
                <View style={styles.xpBadge}>
                    <Text style={styles.xpText}>+{challenge.reward_xp} XP</Text>
                </View>
            </View>

            {challenge.description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{challenge.description}</Text>
            ) : null}

            {/* Progress bar (if joined) */}
            {isJoined ? (
                <View style={styles.progressWrap}>
                    <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {challenge.user_participation!.current_value} / {challenge.target_value} {challenge.unit}
                    </Text>
                </View>
            ) : null}

            <View style={styles.footer}>
                <View style={styles.footerStats}>
                    <View style={styles.stat}>
                        <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>{challenge.participant_count}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>{daysLeft}d left</Text>
                    </View>
                </View>

                {isJoined ? (
                    <TouchableOpacity
                        style={styles.leaveBtn}
                        onPress={() => onLeave(challenge.id)}
                    >
                        <Text style={styles.leaveText}>Leave</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                        onPress={() => onJoin(challenge.id)}
                    >
                        <Text style={[styles.joinText, { color: colors.textInverse }]}>Join</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.analytics + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    creator: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    xpBadge: {
        backgroundColor: Colors.secondary + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    xpText: {
        color: Colors.secondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    description: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    progressWrap: {
        marginBottom: Spacing.sm,
    },
    progressBar: {
        height: 6,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.analytics,
        borderRadius: 3,
    },
    progressText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.sm,
    },
    footerStats: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
    },
    joinBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    joinText: {
        color: Colors.background,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    leaveBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    leaveText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
});
