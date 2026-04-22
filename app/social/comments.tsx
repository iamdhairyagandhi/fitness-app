import { Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useSocialStore } from '@/stores/socialStore';
import { useAuthStore } from '@/stores/authStore';
import type { Comment } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

export default function CommentsScreen() {
    const { activityId } = useLocalSearchParams<{ activityId: string }>();
    const currentUser = useAuthStore((s) => s.user);
    const { activeComments, commentsLoading, loadComments, addComment, removeComment } = useSocialStore();
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (activityId) loadComments(activityId);
    }, [activityId, loadComments]);

    const handleSend = async () => {
        if (!activityId || !newComment.trim()) return;
        await addComment(activityId, newComment.trim());
        setNewComment('');
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentRow}>
            <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                    {item.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
            </View>
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={styles.commentName}>{item.profile?.display_name || 'User'}</Text>
                    <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
            </View>
            {item.user_id === currentUser?.id ? (
                <TouchableOpacity onPress={() => removeComment(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={14} color={Colors.textTertiary} />
                </TouchableOpacity>
            ) : null}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Comments</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Comments list */}
            {commentsLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={activeComments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComment}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubble-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>No comments yet</Text>
                            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                        </View>
                    }
                />
            )}

            {/* Input */}
            <View style={styles.inputRow}>
                <View style={styles.inputWrap}>
                    <Input
                        placeholder="Write a comment..."
                        value={newComment}
                        onChangeText={setNewComment}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                    />
                </View>
                <TouchableOpacity
                    style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!newComment.trim()}
                >
                    <Ionicons name="send" size={18} color={newComment.trim() ? Colors.background : Colors.textTertiary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    loader: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    commentRow: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentAvatarText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    commentContent: {
        flex: 1,
        marginLeft: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    commentName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    commentTime: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
    },
    commentText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    deleteBtn: {
        padding: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    inputWrap: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: Colors.surfaceLight,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        gap: Spacing.sm,
    },
    emptyText: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },
    emptySubtext: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
});
