import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { PublicProfile } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserCardProps {
    user: PublicProfile;
    onPress: (userId: string) => void;
    onFollow: (userId: string) => void;
    onUnfollow: (userId: string) => void;
    onBlock?: (userId: string) => void;
}

export function UserCard({ user, onPress, onFollow, onUnfollow, onBlock }: UserCardProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onPress(user.id)}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {user.display_name.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{user.display_name}</Text>
                {user.username ? (
                    <Text style={[styles.username, { color: colors.textTertiary }]} numberOfLines={1}>@{user.username}</Text>
                ) : null}
                <View style={styles.statsRow}>
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>Lv.{user.level}</Text>
                    <Text style={[styles.statDot, { color: colors.textTertiary }]}>·</Text>
                    <Ionicons name="flame" size={12} color={Colors.accent} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{user.streak_count}</Text>
                    <Text style={[styles.statDot, { color: colors.textTertiary }]}>·</Text>
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{user.workouts_completed} workouts</Text>
                </View>
            </View>

            <View style={styles.actions}>
                {user.follow_status === 'pending' ? (
                    <View
                        style={[styles.unfollowBtn, { borderColor: colors.border }]}
                    >
                        <Text style={[styles.unfollowText, { color: colors.textSecondary }]}>Requested</Text>
                    </View>
                ) : user.is_following ? (
                    <TouchableOpacity
                        style={[styles.unfollowBtn, { borderColor: colors.border }]}
                        onPress={() => onUnfollow(user.id)}
                    >
                        <Text style={[styles.unfollowText, { color: colors.textSecondary }]}>Following</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.followBtn, { backgroundColor: colors.primary }]}
                        onPress={() => onFollow(user.id)}
                    >
                        <Ionicons name="person-add" size={14} color={colors.textInverse} />
                        <Text style={[styles.followText, { color: colors.textInverse }]}>Follow</Text>
                    </TouchableOpacity>
                )}
                {onBlock ? (
                    <TouchableOpacity
                        accessibilityLabel={`Block ${user.display_name}`}
                        style={[styles.blockBtn, { borderColor: colors.border }]}
                        onPress={() => onBlock(user.id)}
                    >
                        <Ionicons name="ban-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: Colors.primary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    info: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    username: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 1,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    statText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
    },
    statDot: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    followText: {
        color: Colors.background,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    unfollowBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    unfollowText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    blockBtn: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
