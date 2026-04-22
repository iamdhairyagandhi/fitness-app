import { LeaderboardRow } from '@/components/social/LeaderboardRow';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { fetchChallengeLeaderboard } from '@/lib/socialDb';
import { useAuthStore } from '@/stores/authStore';
import { useSocialStore } from '@/stores/socialStore';
import type { ChallengeParticipant } from '@/types';
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

export default function ChallengeDetailScreen() {
    const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
    const { challenges, joinChallengeAction, leaveChallengeAction } = useSocialStore();
    const currentUser = useAuthStore((s) => s.user);

    const challenge = challenges.find((c) => c.id === challengeId);
    const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!challengeId) return;
        fetchChallengeLeaderboard(challengeId).then((p) => {
            setParticipants(p);
            setLoading(false);
        });
    }, [challengeId]);

    if (!challenge) {
        return (
            <View style={styles.loadingContainer}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.errorText}>Challenge not found</Text>
            </View>
        );
    }

    const daysLeft = Math.max(0, Math.ceil(
        (new Date(challenge.end_date).getTime() - Date.now()) / 86400000
    ));
    const isJoined = !!challenge.user_participation;

    return (
        <View style={styles.container}>
            <FlatList
                data={participants}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <LeaderboardRow
                        entry={{
                            id: item.user_id,
                            display_name: item.profile?.display_name || 'User',
                            username: item.profile?.username || null,
                            avatar_url: item.profile?.avatar_url || null,
                            xp: item.current_value,
                            level: item.profile?.level || 1,
                            streak_count: 0,
                            workouts_completed: 0,
                            weekly_volume: 0,
                            weekly_workouts: 0,
                        }}
                        rank={index + 1}
                        onPress={(userId) => router.push({ pathname: '/social/profile', params: { userId } })}
                        isCurrentUser={item.user_id === currentUser?.id}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.text} />
                        </TouchableOpacity>

                        {/* Challenge Info */}
                        <View style={styles.infoCard}>
                            <Text style={styles.title}>{challenge.title}</Text>
                            {challenge.description ? (
                                <Text style={styles.description}>{challenge.description}</Text>
                            ) : null}

                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="trophy-outline" size={16} color={Colors.secondary} />
                                    <Text style={styles.metaText}>+{challenge.reward_xp} XP</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="people-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.metaText}>{challenge.participant_count} joined</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="time-outline" size={16} color={Colors.accent} />
                                    <Text style={styles.metaText}>{daysLeft}d left</Text>
                                </View>
                            </View>

                            <View style={styles.targetRow}>
                                <Text style={styles.targetLabel}>Target:</Text>
                                <Text style={styles.targetValue}>
                                    {challenge.target_value} {challenge.unit}
                                </Text>
                            </View>

                            {isJoined ? (
                                <TouchableOpacity
                                    style={styles.leaveBtn}
                                    onPress={() => leaveChallengeAction(challenge.id)}
                                >
                                    <Text style={styles.leaveText}>Leave Challenge</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.joinBtn}
                                    onPress={() => joinChallengeAction(challenge.id)}
                                >
                                    <Text style={styles.joinText}>Join Challenge</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.sectionTitle}>Leaderboard</Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ paddingTop: 40 }} />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No participants yet</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.lg,
        paddingTop: 60,
    },
    errorText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.xxl,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        marginBottom: Spacing.lg,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginBottom: Spacing.sm,
    },
    description: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
        marginBottom: Spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginBottom: Spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    targetLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
    },
    targetValue: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    joinBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    joinText: {
        color: Colors.background,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    leaveBtn: {
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    leaveText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: Spacing.xxl,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
});
