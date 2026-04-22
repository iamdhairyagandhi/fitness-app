import { FeedCard } from '@/components/social/FeedCard';
import { UserCard } from '@/components/social/UserCard';
import { ChallengeCard } from '@/components/social/ChallengeCard';
import { LeaderboardRow } from '@/components/social/LeaderboardRow';
import { Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSocialStore } from '@/stores/socialStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type SocialTab = 'feed' | 'search' | 'challenges' | 'leaderboard';

export default function SocialScreen() {
    const [activeTab, setActiveTab] = useState<SocialTab>('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const user = useAuthStore((s) => s.user);

    const {
        feed, feedLoading, loadFeed, loadMoreFeed,
        searchResults, searchLoading, searchPeople,
        follow, unfollow, react,
        challenges, challengesLoading, loadChallenges,
        joinChallengeAction, leaveChallengeAction,
        leaderboard, leaderboardLoading, loadLeaderboard,
    } = useSocialStore();

    useEffect(() => {
        loadFeed(true);
        loadChallenges();
        loadLeaderboard();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 'feed') await loadFeed(true);
        else if (activeTab === 'challenges') await loadChallenges();
        else if (activeTab === 'leaderboard') await loadLeaderboard();
        setRefreshing(false);
    }, [activeTab, loadFeed, loadChallenges, loadLeaderboard]);

    useEffect(() => {
        if (activeTab === 'search' && searchQuery.length >= 2) {
            const timer = setTimeout(() => searchPeople(searchQuery), 400);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, activeTab, searchPeople]);

    const handleProfile = (userId: string) => {
        router.push({ pathname: '/social/profile', params: { userId } });
    };

    const handleComment = (activityId: string) => {
        router.push({ pathname: '/social/comments', params: { activityId } });
    };

    const handleChallengePress = (challengeId: string) => {
        router.push({ pathname: '/social/challenge', params: { challengeId } });
    };

    const tabs: { key: SocialTab; label: string; icon: string }[] = [
        { key: 'feed', label: 'Feed', icon: 'newspaper' },
        { key: 'search', label: 'Find', icon: 'search' },
        { key: 'challenges', label: 'Challenges', icon: 'flag' },
        { key: 'leaderboard', label: 'Rankings', icon: 'podium' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community</Text>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={18}
                            color={activeTab === tab.key ? Colors.primary : Colors.textTertiary}
                        />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'feed' && (
                <FlatList
                    data={feed}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <FeedCard
                            item={item}
                            onReact={react}
                            onComment={handleComment}
                            onProfile={handleProfile}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    onEndReached={loadMoreFeed}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        feedLoading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="newspaper-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No activity yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    Follow friends and complete workouts to see activity here
                                </Text>
                            </View>
                        )
                    }
                />
            )}

            {activeTab === 'search' && (
                <ScrollView style={styles.scrollContent} contentContainerStyle={styles.listContent}>
                    <Input
                        placeholder="Search by name or username..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        leftIcon={<Ionicons name="search" size={18} color={Colors.textTertiary} />}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.emptyLoader} />
                    ) : searchResults.length > 0 ? (
                        searchResults.map((u) => (
                            <UserCard
                                key={u.id}
                                user={u}
                                onPress={handleProfile}
                                onFollow={follow}
                                onUnfollow={unfollow}
                            />
                        ))
                    ) : searchQuery.length >= 2 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No users found</Text>
                            <Text style={styles.emptySubtitle}>Try a different search term</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Find friends</Text>
                            <Text style={styles.emptySubtitle}>Search by name or username to connect</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {activeTab === 'challenges' && (
                <FlatList
                    data={challenges}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ChallengeCard
                            challenge={item}
                            onPress={handleChallengePress}
                            onJoin={joinChallengeAction}
                            onLeave={leaveChallengeAction}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListHeaderComponent={
                        <TouchableOpacity
                            style={styles.createChallengeBtn}
                            onPress={() => router.push('/social/create-challenge')}
                        >
                            <Ionicons name="add-circle" size={20} color={Colors.primary} />
                            <Text style={styles.createChallengeText}>Create Challenge</Text>
                        </TouchableOpacity>
                    }
                    ListEmptyComponent={
                        challengesLoading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="flag-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No active challenges</Text>
                                <Text style={styles.emptySubtitle}>Create one to compete with friends!</Text>
                            </View>
                        )
                    }
                />
            )}

            {activeTab === 'leaderboard' && (
                <FlatList
                    data={leaderboard}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <LeaderboardRow
                            entry={item}
                            rank={index + 1}
                            onPress={handleProfile}
                            isCurrentUser={item.id === user?.id}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListHeaderComponent={
                        <View style={styles.leaderboardHeader}>
                            <Text style={styles.leaderboardTitle}>Weekly Rankings</Text>
                            <Text style={styles.leaderboardSubtitle}>Based on total XP earned</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        leaderboardLoading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="podium-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No rankings yet</Text>
                                <Text style={styles.emptySubtitle}>Complete workouts to appear on the leaderboard</Text>
                            </View>
                        )
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
    },
    tabActive: {
        backgroundColor: Colors.primary + '15',
    },
    tabText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
    tabTextActive: {
        color: Colors.primary,
        fontWeight: FontWeight.semibold,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    scrollContent: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        gap: Spacing.sm,
    },
    emptyTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },
    emptySubtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        textAlign: 'center',
        maxWidth: 260,
    },
    emptyLoader: {
        paddingTop: 80,
    },
    createChallengeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        borderStyle: 'dashed',
    },
    createChallengeText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    leaderboardHeader: {
        marginBottom: Spacing.lg,
    },
    leaderboardTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    leaderboardSubtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
});
