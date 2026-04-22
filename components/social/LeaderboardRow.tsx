import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { LeaderboardEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    rank: number;
    onPress: (userId: string) => void;
    isCurrentUser?: boolean;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

export function LeaderboardRow({ entry, rank, onPress, isCurrentUser }: LeaderboardRowProps) {
    const isTopThree = rank <= 3;

    return (
        <TouchableOpacity
            style={[styles.row, isCurrentUser && styles.currentUserRow]}
            onPress={() => onPress(entry.id)}
        >
            <View style={[styles.rankBadge, isTopThree && { backgroundColor: RANK_COLORS[rank - 1] + '30' }]}>
                {isTopThree ? (
                    <Ionicons name="medal" size={16} color={RANK_COLORS[rank - 1]} />
                ) : (
                    <Text style={styles.rankText}>{rank}</Text>
                )}
            </View>

            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {entry.display_name.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {entry.display_name}
                    {isCurrentUser ? ' (you)' : ''}
                </Text>
                <View style={styles.statsRow}>
                    <Text style={styles.stat}>Lv.{entry.level}</Text>
                    <Ionicons name="flame" size={11} color={Colors.accent} />
                    <Text style={styles.stat}>{entry.streak_count}</Text>
                </View>
            </View>

            <View style={styles.score}>
                <Text style={styles.scoreValue}>{formatNumber(entry.xp)}</Text>
                <Text style={styles.scoreLabel}>XP</Text>
            </View>
        </TouchableOpacity>
    );
}

function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    currentUserRow: {
        borderColor: Colors.primary + '60',
        backgroundColor: Colors.primary + '08',
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.sm,
    },
    avatarText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    info: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    stat: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    score: {
        alignItems: 'flex-end',
    },
    scoreValue: {
        color: Colors.secondary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    scoreLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
    },
});
