import { ChallengeCard } from '@/components/social/ChallengeCard';
import { FeedCard } from '@/components/social/FeedCard';
import { LeaderboardRow } from '@/components/social/LeaderboardRow';
import { UserCard } from '@/components/social/UserCard';
import { Button, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { useSocialStore } from '@/stores/socialStore';
import type { ActivityVisibility } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type SocialTab = 'feed' | 'search' | 'challenges' | 'leaderboard';

export default function SocialScreen() {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<SocialTab>('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeText, setComposeText] = useState('');
    const [composeVisibility, setComposeVisibility] = useState<ActivityVisibility>('public');
    const [leaderboardSort, setLeaderboardSort] = useState<'xp' | 'weekly_volume' | 'streak_count' | 'weekly_workouts'>('xp');
    const user = useAuthStore((s) => s.user);

    const {
        feed, feedLoading, feedMode, setFeedMode, loadFeed, loadMoreFeed,
        searchResults, searchLoading, searchPeople,
        follow, unfollow, react, saveActivity, hideActivity, reportActivityAction, blockUserAction, publishActivity,
        challenges, challengesLoading, loadChallenges,
        joinChallengeAction, leaveChallengeAction,
        leaderboard, leaderboardLoading, loadLeaderboard,
    } = useSocialStore();

    useEffect(() => {
        loadFeed(true, feedMode);
        loadChallenges();
        loadLeaderboard(leaderboardSort);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 'feed') await loadFeed(true, feedMode);
        else if (activeTab === 'challenges') await loadChallenges();
        else if (activeTab === 'leaderboard') await loadLeaderboard(leaderboardSort);
        setRefreshing(false);
    }, [activeTab, feedMode, leaderboardSort, loadFeed, loadChallenges, loadLeaderboard]);

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

    const handlePublishPost = async () => {
        const content = composeText.trim();
        if (!content) {
            toast.error('Nothing to share', 'Write a quick update first.');
            return;
        }

        const title = content.length > 72 ? `${content.slice(0, 72)}...` : content;
        await publishActivity(
            'manual_post',
            title,
            content.length > 72 ? content : undefined,
            { source: 'composer' },
            composeVisibility,
        );
        setComposeText('');
        setComposeOpen(false);
        toast.success('Shared', composeVisibility === 'private' ? 'Saved privately to your activity.' : 'Your update is live.');
    };

    const handleLeaderboardSort = (sort: typeof leaderboardSort) => {
        setLeaderboardSort(sort);
        loadLeaderboard(sort);
    };

    const tabs: { key: SocialTab; label: string; icon: string }[] = [
        { key: 'feed', label: 'Feed', icon: 'newspaper' },
        { key: 'search', label: 'Find', icon: 'search' },
        { key: 'challenges', label: 'Challenges', icon: 'flag' },
        { key: 'leaderboard', label: 'Rankings', icon: 'podium' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerEyebrow, { color: colors.textTertiary }]}>Accountability hub</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
                </View>
                <TouchableOpacity
                    style={[styles.composeButton, { backgroundColor: colors.primary }]}
                    onPress={() => setComposeOpen(true)}
                >
                    <Ionicons name="add" size={22} color={colors.textInverse} />
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, { backgroundColor: colors.surface }, activeTab === tab.key && styles.tabActive, activeTab === tab.key && { backgroundColor: colors.primary + '18' }]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={18}
                            color={activeTab === tab.key ? colors.primary : Colors.textTertiary}
                        />
                        <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === tab.key && styles.tabTextActive, activeTab === tab.key && { color: colors.primary }]}>
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
                            onSave={saveActivity}
                            onHide={hideActivity}
                            onReport={reportActivityAction}
                            onBlock={blockUserAction}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    onEndReached={loadMoreFeed}
                    onEndReachedThreshold={0.5}
                    ListHeaderComponent={
                        <View>
                            <View style={[styles.hubHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[styles.hubIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="people-outline" size={22} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.hubTitle, { color: colors.text }]}>Train in public, improve with context.</Text>
                                    <Text style={[styles.hubSubtitle, { color: colors.textSecondary }]}>
                                        Share wins, follow real progress, and compete where the numbers mean something.
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.feedSwitcher, { backgroundColor: colors.surface }]}>
                                {(['following', 'discover'] as const).map((mode) => {
                                    const active = feedMode === mode;
                                    return (
                                        <TouchableOpacity
                                            key={mode}
                                            style={[styles.feedSwitchItem, active && { backgroundColor: colors.primary }]}
                                            onPress={() => setFeedMode(mode)}
                                        >
                                            <Ionicons
                                                name={mode === 'following' ? 'people-outline' : 'compass-outline'}
                                                size={16}
                                                color={active ? colors.textInverse : colors.textSecondary}
                                            />
                                            <Text style={[styles.feedSwitchText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                                                {mode === 'following' ? 'Following' : 'Discover'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={[styles.sharePrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setComposeOpen(true)}
                            >
                                <View style={[styles.shareAvatar, { backgroundColor: colors.primary + '18' }]}>
                                    <Text style={[styles.shareAvatarText, { color: colors.primary }]}>
                                        {user?.display_name?.charAt(0)?.toUpperCase() || 'B'}
                                    </Text>
                                </View>
                                <Text style={[styles.sharePromptText, { color: colors.textSecondary }]}>Share a workout, win, note, or accountability check-in...</Text>
                                <Ionicons name="send-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>

                            <View style={[styles.safetyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                                <View style={styles.safetyCopy}>
                                    <Text style={[styles.safetyTitle, { color: colors.text }]}>Community safety controls</Text>
                                    <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
                                        Use the menu on any post to report objectionable content, hide it, or block abusive users.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        feedLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={styles.emptyLoader} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="newspaper-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No activity yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    {feedMode === 'following'
                                        ? 'Follow people or switch to Discover to find public progress updates.'
                                        : 'Public activity will show here as the BodyPilot community grows.'}
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
                        <ActivityIndicator size="small" color={colors.primary} style={styles.emptyLoader} />
                    ) : searchResults.length > 0 ? (
                        searchResults.map((u) => (
                            <UserCard
                                key={u.id}
                                user={u}
                                onPress={handleProfile}
                                onFollow={follow}
                                onUnfollow={unfollow}
                                onBlock={blockUserAction}
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListHeaderComponent={
                        <View>
                            <View style={[styles.challengeIntro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="flag-outline" size={22} color={colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.challengeIntroTitle, { color: colors.text }]}>Challenges should move by themselves.</Text>
                                    <Text style={[styles.challengeIntroText, { color: colors.textSecondary }]}>
                                        Workout count and volume challenges now update when workouts are finished.
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.createChallengeBtn, { borderColor: colors.primary + '40' }]}
                                onPress={() => router.push('/social/create-challenge')}
                            >
                                <Ionicons name="add-circle" size={20} color={colors.primary} />
                                <Text style={[styles.createChallengeText, { color: colors.primary }]}>Create Challenge</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    ListEmptyComponent={
                        challengesLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={styles.emptyLoader} />
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListHeaderComponent={
                        <View style={styles.leaderboardHeader}>
                            <Text style={[styles.leaderboardTitle, { color: colors.text }]}>Weekly Rankings</Text>
                            <Text style={[styles.leaderboardSubtitle, { color: colors.textSecondary }]}>Filter by the kind of consistency you care about.</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
                                {[
                                    { key: 'xp' as const, label: 'XP' },
                                    { key: 'weekly_volume' as const, label: 'Volume' },
                                    { key: 'weekly_workouts' as const, label: 'Workouts' },
                                    { key: 'streak_count' as const, label: 'Streak' },
                                ].map((sort) => {
                                    const active = leaderboardSort === sort.key;
                                    return (
                                        <TouchableOpacity
                                            key={sort.key}
                                            style={[styles.sortChip, { backgroundColor: colors.surface, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                            onPress={() => handleLeaderboardSort(sort.key)}
                                        >
                                            <Text style={[styles.sortChipText, { color: active ? colors.textInverse : colors.textSecondary }]}>{sort.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    }
                    ListEmptyComponent={
                        leaderboardLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={styles.emptyLoader} />
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

            <Modal
                visible={composeOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setComposeOpen(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.composeSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.composeHeader}>
                            <Text style={[styles.composeTitle, { color: colors.text }]}>Share progress</Text>
                            <TouchableOpacity onPress={() => setComposeOpen(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            value={composeText}
                            onChangeText={setComposeText}
                            placeholder="What are you working on today?"
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            style={[styles.composeInput, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                            textAlignVertical="top"
                        />

                        <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>Who can see this?</Text>
                        <View style={styles.visibilityRow}>
                            {[
                                { key: 'public' as const, label: 'Public', icon: 'globe-outline' as const },
                                { key: 'followers' as const, label: 'Friends', icon: 'people-outline' as const },
                                { key: 'private' as const, label: 'Private', icon: 'lock-closed-outline' as const },
                            ].map((option) => {
                                const active = composeVisibility === option.key;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.visibilityOption, { backgroundColor: colors.surfaceLight, borderColor: colors.border }, active && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
                                        onPress={() => setComposeVisibility(option.key)}
                                    >
                                        <Ionicons name={option.icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                                        <Text style={[styles.visibilityOptionText, { color: active ? colors.primary : colors.textSecondary }]}>{option.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Button title="Post Update" onPress={handlePublishPost} disabled={!composeText.trim()} />
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerEyebrow: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    composeButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
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
    hubHero: {
        flexDirection: 'row',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    hubIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hubTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    hubSubtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 19,
        marginTop: 4,
    },
    feedSwitcher: {
        flexDirection: 'row',
        borderRadius: BorderRadius.lg,
        padding: 4,
        marginBottom: Spacing.md,
    },
    feedSwitchItem: {
        flex: 1,
        minHeight: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    feedSwitchText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    sharePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    shareAvatar: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareAvatarText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    sharePromptText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 18,
    },
    safetyCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    safetyCopy: {
        flex: 1,
    },
    safetyTitle: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    safetyText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        lineHeight: 18,
        marginTop: 2,
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
    challengeIntro: {
        flexDirection: 'row',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    challengeIntroTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.heavy,
    },
    challengeIntroText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 18,
        marginTop: 3,
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
    sortChips: {
        gap: Spacing.sm,
        paddingTop: Spacing.md,
    },
    sortChip: {
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    sortChipText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.68)',
    },
    composeSheet: {
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        borderWidth: 1,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxxl,
    },
    composeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    composeTitle: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.heavy,
    },
    composeInput: {
        minHeight: 132,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        fontSize: FontSize.md,
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    composeLabel: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.sm,
    },
    visibilityRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    visibilityOption: {
        flex: 1,
        minHeight: 44,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    visibilityOptionText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
});
