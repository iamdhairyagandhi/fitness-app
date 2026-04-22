import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { ActivityFeedItem, ReactionType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
    workout_completed: { icon: 'barbell', color: Colors.primary },
    personal_record: { icon: 'trophy', color: Colors.secondary },
    achievement_unlocked: { icon: 'medal', color: Colors.achievements },
    streak_milestone: { icon: 'flame', color: Colors.accent },
    challenge_joined: { icon: 'flag', color: Colors.analytics },
    challenge_completed: { icon: 'checkmark-circle', color: Colors.recovery },
    weight_milestone: { icon: 'scale', color: Colors.mealPlan },
    level_up: { icon: 'arrow-up-circle', color: Colors.fasting },
};

const REACTION_EMOJIS: Record<ReactionType, string> = {
    like: '👍',
    fire: '🔥',
    muscle: '💪',
    clap: '👏',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
}

interface FeedCardProps {
    item: ActivityFeedItem;
    onReact: (activityId: string, type: ReactionType) => void;
    onComment: (activityId: string) => void;
    onProfile: (userId: string) => void;
}

export function FeedCard({ item, onReact, onComment, onProfile }: FeedCardProps) {
    const actConfig = ACTIVITY_ICONS[item.activity_type] || ACTIVITY_ICONS.workout_completed;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.avatarRow}
                    onPress={() => onProfile(item.user_id)}
                >
                    <View style={[styles.avatar, { backgroundColor: actConfig.color + '20' }]}>
                        {item.profile?.avatar_url ? (
                            <Text style={styles.avatarText}>
                                {item.profile.display_name.charAt(0).toUpperCase()}
                            </Text>
                        ) : (
                            <Text style={styles.avatarText}>
                                {item.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.name}>{item.profile?.display_name || 'User'}</Text>
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                    </View>
                </TouchableOpacity>
                <View style={[styles.typeBadge, { backgroundColor: actConfig.color + '20' }]}>
                    <Ionicons name={actConfig.icon as any} size={14} color={actConfig.color} />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                ) : null}
            </View>

            {/* Metadata chips */}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
                <View style={styles.metaRow}>
                    {item.metadata.duration_min ? (
                        <View style={styles.metaChip}>
                            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{String(item.metadata.duration_min)}min</Text>
                        </View>
                    ) : null}
                    {item.metadata.volume_kg ? (
                        <View style={styles.metaChip}>
                            <Ionicons name="barbell-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{String(item.metadata.volume_kg)}kg</Text>
                        </View>
                    ) : null}
                    {item.metadata.exercise_name ? (
                        <View style={styles.metaChip}>
                            <Ionicons name="fitness-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{String(item.metadata.exercise_name)}</Text>
                        </View>
                    ) : null}
                    {item.metadata.weight_kg ? (
                        <View style={styles.metaChip}>
                            <Ionicons name="trending-up-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{String(item.metadata.weight_kg)}kg × {String(item.metadata.reps || 1)}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.reactionRow}>
                    {(['like', 'fire', 'muscle', 'clap'] as ReactionType[]).map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.reactionBtn,
                                item.user_reaction === type && styles.reactionBtnActive,
                            ]}
                            onPress={() => onReact(item.id, type)}
                        >
                            <Text style={styles.reactionEmoji}>{REACTION_EMOJIS[type]}</Text>
                        </TouchableOpacity>
                    ))}
                    {item.reactions_count > 0 ? (
                        <Text style={styles.countText}>{item.reactions_count}</Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => onComment(item.id)}
                >
                    <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
                    {item.comments_count > 0 ? (
                        <Text style={styles.countText}>{item.comments_count}</Text>
                    ) : null}
                </TouchableOpacity>
            </View>
        </View>
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
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    headerText: {
        marginLeft: Spacing.sm,
        flex: 1,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    time: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 1,
    },
    typeBadge: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        marginBottom: Spacing.sm,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        lineHeight: 22,
    },
    description: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    metaText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.sm,
    },
    reactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    reactionBtn: {
        padding: 6,
        borderRadius: BorderRadius.sm,
    },
    reactionBtnActive: {
        backgroundColor: Colors.primaryDark + '30',
    },
    reactionEmoji: {
        fontSize: 16,
    },
    commentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 6,
    },
    countText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
});
