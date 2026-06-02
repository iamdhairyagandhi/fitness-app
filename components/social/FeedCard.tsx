import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { ActivityFeedItem, ReactionType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
    workout_completed: { icon: 'barbell', color: Colors.primary },
    personal_record: { icon: 'trophy', color: Colors.secondary },
    achievement_unlocked: { icon: 'medal', color: Colors.achievements },
    streak_milestone: { icon: 'flame', color: Colors.accent },
    challenge_joined: { icon: 'flag', color: Colors.analytics },
    challenge_completed: { icon: 'checkmark-circle', color: Colors.recovery },
    weight_milestone: { icon: 'scale', color: Colors.mealPlan },
    level_up: { icon: 'arrow-up-circle', color: Colors.fasting },
    manual_post: { icon: 'chatbox-ellipses', color: Colors.primary },
    progress_photo: { icon: 'camera', color: Colors.analytics },
    body_milestone: { icon: 'body', color: Colors.bodyComp },
    recipe_shared: { icon: 'restaurant', color: Colors.recipes },
    shared_activity: { icon: 'repeat', color: Colors.mealPlan },
};

const REACTION_EMOJIS: Record<ReactionType, string> = {
    like: '👍',
    fire: '🔥',
    muscle: '💪',
    clap: '👏',
};

const REPORT_REASONS = [
    { label: 'Harassment or abusive behavior', value: 'harassment' },
    { label: 'Hate, threats, or violence', value: 'threats_or_hate' },
    { label: 'Sexual or explicit content', value: 'explicit_content' },
    { label: 'Spam or misleading content', value: 'spam' },
    { label: 'Unsafe health advice', value: 'unsafe_health_advice' },
    { label: 'Other objectionable content', value: 'other' },
];

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
    onSave?: (activityId: string, shouldSave: boolean) => void;
    onHide?: (activityId: string) => void;
    onReport?: (activityId: string, targetUserId: string, reason?: string) => void;
    onBlock?: (targetUserId: string) => void;
}

export function FeedCard({ item, onReact, onComment, onProfile, onSave, onHide, onReport, onBlock }: FeedCardProps) {
    const { colors } = useTheme();
    const actConfig = ACTIVITY_ICONS[item.activity_type] || ACTIVITY_ICONS.workout_completed;
    const activityColor = item.activity_type === 'workout_completed' ? colors.primary : actConfig.color;
    const visibility = item.visibility || (item.is_public ? 'public' : 'followers');

    const openReportMenu = () => {
        Alert.alert('Report post', 'What is wrong with this update?', [
            ...REPORT_REASONS.map((reason) => ({
                text: reason.label,
                style: reason.value === 'other' ? 'default' as const : undefined,
                onPress: () => {
                    onReport?.(item.id, item.user_id, reason.value);
                    Alert.alert('Report sent', 'Thanks. This post is hidden from your feed while it is reviewed.');
                },
            })),
            { text: 'Cancel', style: 'cancel' as const },
        ]);
    };

    const confirmBlockUser = () => {
        Alert.alert(
            'Block user?',
            'You will no longer see this user in your feed or search results. Existing follows between you will be removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: () => {
                        onBlock?.(item.user_id);
                        Alert.alert('User blocked', 'You will no longer see updates from this user.');
                    },
                },
            ],
        );
    };

    const openPostMenu = () => {
        Alert.alert(item.title, 'Choose what to do with this update.', [
            {
                text: item.is_saved ? 'Unsave' : 'Save',
                onPress: () => onSave?.(item.id, !item.is_saved),
            },
            {
                text: 'Hide from feed',
                onPress: () => onHide?.(item.id),
            },
            {
                text: 'Report',
                style: 'destructive',
                onPress: openReportMenu,
            },
            {
                text: 'Block user',
                style: 'destructive',
                onPress: confirmBlockUser,
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.avatarRow}
                    onPress={() => onProfile(item.user_id)}
                >
                    <View style={[styles.avatar, { backgroundColor: activityColor + '20' }]}>
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
                        <Text style={[styles.name, { color: colors.text }]}>{item.profile?.display_name || 'User'}</Text>
                        <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo(item.created_at)}</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <View style={[styles.visibilityPill, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        <Ionicons
                            name={visibility === 'public' ? 'globe-outline' : visibility === 'followers' ? 'people-outline' : 'lock-closed-outline'}
                            size={12}
                            color={colors.textTertiary}
                        />
                        <Text style={[styles.visibilityText, { color: colors.textTertiary }]}>
                            {visibility === 'followers' ? 'Friends' : visibility}
                        </Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: activityColor + '20' }]}>
                        <Ionicons name={actConfig.icon as any} size={14} color={activityColor} />
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton} onPress={openPostMenu}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </View>

            {item.activity_type !== 'manual_post' && (
                <View style={[styles.shareCardHeader, { backgroundColor: activityColor + '14', borderColor: activityColor + '2C' }]}>
                    <Ionicons name={actConfig.icon as any} size={16} color={activityColor} />
                    <Text style={[styles.shareCardHeaderText, { color: activityColor }]}>
                        {item.activity_type === 'workout_completed'
                            ? 'Workout logged'
                            : item.activity_type === 'personal_record'
                                ? 'Personal record'
                                : item.activity_type === 'challenge_completed'
                                    ? 'Challenge win'
                                    : 'Milestone'}
                    </Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                {item.description ? (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
                ) : null}
            </View>

            {/* Metadata chips */}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
                <View style={styles.metaRow}>
                    {item.metadata.duration_min ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
                            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{String(item.metadata.duration_min)}min</Text>
                        </View>
                    ) : null}
                    {item.metadata.volume_kg ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
                            <Ionicons name="barbell-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{String(item.metadata.volume_kg)}kg</Text>
                        </View>
                    ) : null}
                    {item.metadata.exercise_name ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
                            <Ionicons name="fitness-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{String(item.metadata.exercise_name)}</Text>
                        </View>
                    ) : null}
                    {item.metadata.weight_kg ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
                            <Ionicons name="trending-up-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{String(item.metadata.weight_kg)}kg × {String(item.metadata.reps || 1)}</Text>
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
                                item.user_reaction === type && { backgroundColor: colors.primary + '22' },
                            ]}
                            onPress={() => onReact(item.id, type)}
                        >
                            <Text style={styles.reactionEmoji}>{REACTION_EMOJIS[type]}</Text>
                        </TouchableOpacity>
                    ))}
                    {item.reactions_count > 0 ? (
                        <Text style={[styles.countText, { color: colors.textSecondary }]}>{item.reactions_count}</Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => onComment(item.id)}
                >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                    {item.comments_count > 0 ? (
                        <Text style={[styles.countText, { color: colors.textSecondary }]}>{item.comments_count}</Text>
                    ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => onSave?.(item.id, !item.is_saved)}
                >
                    <Ionicons name={item.is_saved ? 'bookmark' : 'bookmark-outline'} size={16} color={item.is_saved ? activityColor : colors.textSecondary} />
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    visibilityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    visibilityText: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        textTransform: 'capitalize',
    },
    moreButton: {
        padding: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    shareCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        marginBottom: Spacing.sm,
    },
    shareCardHeaderText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
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
