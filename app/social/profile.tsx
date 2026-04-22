import { FeedCard } from '@/components/social/FeedCard';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { fetchPublicProfile, fetchUserActivities, followUser, unfollowUser } from '@/lib/socialDb';
import { useAuthStore } from '@/stores/authStore';
import { useSocialStore } from '@/stores/socialStore';
import type { ActivityFeedItem, PublicProfile } from '@/types';
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

export default function UserProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const currentUser = useAuthStore((s) => s.user);
    const { react } = useSocialStore();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (!userId) return;
        (async () => {
            const [p, acts] = await Promise.all([
                fetchPublicProfile(userId),
                fetchUserActivities(userId),
            ]);
            if (p) {
                setProfile(p);
                setIsFollowing(p.is_following || false);
            }
            setActivities(acts);
            setLoading(false);
        })();
    }, [userId]);

    const handleFollow = async () => {
        if (!userId) return;
        if (isFollowing) {
            await unfollowUser(userId);
            setIsFollowing(false);
            if (profile) setProfile({ ...profile, followers_count: profile.followers_count - 1 });
        } else {
            await followUser(userId);
            setIsFollowing(true);
            if (profile) setProfile({ ...profile, followers_count: profile.followers_count + 1 });
        }
    };

    const isOwnProfile = currentUser?.id === userId;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>User not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={activities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedCard
                        item={item}
                        onReact={react}
                        onComment={(id) => router.push({ pathname: '/social/comments', params: { activityId: id } })}
                        onProfile={() => { }}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        {/* Back button */}
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.text} />
                        </TouchableOpacity>

                        {/* Profile Header */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>
                                    {profile.display_name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.displayName}>{profile.display_name}</Text>
                            {profile.username ? (
                                <Text style={styles.username}>@{profile.username}</Text>
                            ) : null}
                            {profile.bio ? (
                                <Text style={styles.bio}>{profile.bio}</Text>
                            ) : null}
                        </View>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.workouts_completed}</Text>
                                <Text style={styles.statLabel}>Workouts</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.followers_count}</Text>
                                <Text style={styles.statLabel}>Followers</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.following_count}</Text>
                                <Text style={styles.statLabel}>Following</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.streak_count}</Text>
                                <Text style={styles.statLabel}>Streak</Text>
                            </View>
                        </View>

                        {/* Follow button */}
                        {!isOwnProfile ? (
                            <TouchableOpacity
                                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                                onPress={handleFollow}
                            >
                                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        {/* Activity label */}
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No recent activity</Text>
                    </View>
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
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
    profileHeader: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    avatarLargeText: {
        color: Colors.primary,
        fontSize: FontSize.hero,
        fontWeight: FontWeight.bold,
    },
    displayName: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    username: {
        color: Colors.textTertiary,
        fontSize: FontSize.md,
        marginTop: 2,
    },
    bio: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginTop: Spacing.sm,
        maxWidth: 280,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
    },
    statLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    followBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    followBtnActive: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    followBtnText: {
        color: Colors.background,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    followBtnTextActive: {
        color: Colors.textSecondary,
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
