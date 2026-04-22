import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { PublicProfile } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserCardProps {
    user: PublicProfile;
    onPress: (userId: string) => void;
    onFollow: (userId: string) => void;
    onUnfollow: (userId: string) => void;
}

export function UserCard({ user, onPress, onFollow, onUnfollow }: UserCardProps) {
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(user.id)}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {user.display_name.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{user.display_name}</Text>
                {user.username ? (
                    <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
                ) : null}
                <View style={styles.statsRow}>
                    <Text style={styles.statText}>Lv.{user.level}</Text>
                    <Text style={styles.statDot}>·</Text>
                    <Ionicons name="flame" size={12} color={Colors.accent} />
                    <Text style={styles.statText}>{user.streak_count}</Text>
                    <Text style={styles.statDot}>·</Text>
                    <Text style={styles.statText}>{user.workouts_completed} workouts</Text>
                </View>
            </View>

            {user.is_following ? (
                <TouchableOpacity
                    style={styles.unfollowBtn}
                    onPress={() => onUnfollow(user.id)}
                >
                    <Text style={styles.unfollowText}>Following</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.followBtn}
                    onPress={() => onFollow(user.id)}
                >
                    <Ionicons name="person-add" size={14} color={Colors.background} />
                    <Text style={styles.followText}>Follow</Text>
                </TouchableOpacity>
            )}
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
});
