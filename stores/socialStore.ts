// ============================================================
// Social Store — Zustand store for social features
// ============================================================

import type {
    ActivityFeedItem,
    ChallengeParticipant,
    Comment,
    LeaderboardEntry,
    PublicProfile,
    ReactionType,
    SocialChallenge,
} from '@/types';
import { create } from 'zustand';
import {
    deleteComment,
    fetchActivityFeed,
    fetchChallengeLeaderboard,
    fetchChallenges,
    fetchComments,
    fetchLeaderboard,
    followUser,
    joinChallenge,
    leaveChallenge,
    postActivity,
    postComment,
    searchUsers,
    toggleReaction,
    unfollowUser,
} from '@/lib/socialDb';
import type { ActivityType } from '@/types';

interface SocialState {
    // Feed
    feed: ActivityFeedItem[];
    feedPage: number;
    feedLoading: boolean;
    feedHasMore: boolean;

    // Search
    searchResults: PublicProfile[];
    searchLoading: boolean;

    // Challenges
    challenges: SocialChallenge[];
    challengesLoading: boolean;
    challengeLeaderboard: ChallengeParticipant[];

    // Leaderboard
    leaderboard: LeaderboardEntry[];
    leaderboardLoading: boolean;

    // Comments
    activeComments: Comment[];
    commentsLoading: boolean;

    // Actions
    loadFeed: (refresh?: boolean) => Promise<void>;
    loadMoreFeed: () => Promise<void>;
    searchPeople: (query: string) => Promise<void>;
    follow: (userId: string) => Promise<void>;
    unfollow: (userId: string) => Promise<void>;
    react: (activityId: string, type: ReactionType) => Promise<void>;
    loadComments: (activityId: string) => Promise<void>;
    addComment: (activityId: string, content: string) => Promise<void>;
    removeComment: (commentId: string) => Promise<void>;
    publishActivity: (type: ActivityType, title: string, description?: string, metadata?: Record<string, unknown>) => Promise<void>;
    loadChallenges: () => Promise<void>;
    joinChallengeAction: (challengeId: string) => Promise<void>;
    leaveChallengeAction: (challengeId: string) => Promise<void>;
    loadChallengeLeaderboard: (challengeId: string) => Promise<void>;
    loadLeaderboard: (sortBy?: 'xp' | 'weekly_volume' | 'streak_count' | 'weekly_workouts') => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
    feed: [],
    feedPage: 0,
    feedLoading: false,
    feedHasMore: true,

    searchResults: [],
    searchLoading: false,

    challenges: [],
    challengesLoading: false,
    challengeLeaderboard: [],

    leaderboard: [],
    leaderboardLoading: false,

    activeComments: [],
    commentsLoading: false,

    loadFeed: async (refresh = false) => {
        set({ feedLoading: true });
        const page = refresh ? 0 : get().feedPage;
        const items = await fetchActivityFeed(page);
        set({
            feed: refresh ? items : [...get().feed, ...items],
            feedPage: page,
            feedLoading: false,
            feedHasMore: items.length >= 20,
        });
    },

    loadMoreFeed: async () => {
        if (get().feedLoading || !get().feedHasMore) return;
        const nextPage = get().feedPage + 1;
        set({ feedLoading: true, feedPage: nextPage });
        const items = await fetchActivityFeed(nextPage);
        set({
            feed: [...get().feed, ...items],
            feedLoading: false,
            feedHasMore: items.length >= 20,
        });
    },

    searchPeople: async (query: string) => {
        if (!query.trim()) {
            set({ searchResults: [], searchLoading: false });
            return;
        }
        set({ searchLoading: true });
        const results = await searchUsers(query);
        set({ searchResults: results, searchLoading: false });
    },

    follow: async (userId: string) => {
        await followUser(userId);
        // Update search results optimistically
        set({
            searchResults: get().searchResults.map((p) =>
                p.id === userId ? { ...p, is_following: true, follow_status: 'accepted' as const } : p,
            ),
        });
    },

    unfollow: async (userId: string) => {
        await unfollowUser(userId);
        set({
            searchResults: get().searchResults.map((p) =>
                p.id === userId ? { ...p, is_following: false, follow_status: 'none' as const } : p,
            ),
        });
    },

    react: async (activityId: string, type: ReactionType) => {
        const feed = get().feed;
        const item = feed.find((f) => f.id === activityId);
        if (!item) return;

        const wasReacted = item.user_reaction === type;
        // Optimistic update
        set({
            feed: feed.map((f) =>
                f.id === activityId
                    ? {
                        ...f,
                        user_reaction: wasReacted ? null : type,
                        reactions_count: f.reactions_count + (wasReacted ? -1 : f.user_reaction ? 0 : 1),
                    }
                    : f,
            ),
        });
        await toggleReaction(activityId, type);
    },

    loadComments: async (activityId: string) => {
        set({ commentsLoading: true });
        const comments = await fetchComments(activityId);
        set({ activeComments: comments, commentsLoading: false });
    },

    addComment: async (activityId: string, content: string) => {
        const comment = await postComment(activityId, content);
        if (comment) {
            set({ activeComments: [...get().activeComments, comment] });
            // Update feed comment count
            set({
                feed: get().feed.map((f) =>
                    f.id === activityId ? { ...f, comments_count: f.comments_count + 1 } : f,
                ),
            });
        }
    },

    removeComment: async (commentId: string) => {
        const comment = get().activeComments.find((c) => c.id === commentId);
        await deleteComment(commentId);
        set({ activeComments: get().activeComments.filter((c) => c.id !== commentId) });
        if (comment) {
            set({
                feed: get().feed.map((f) =>
                    f.id === comment.activity_id ? { ...f, comments_count: Math.max(0, f.comments_count - 1) } : f,
                ),
            });
        }
    },

    publishActivity: async (type, title, description, metadata) => {
        await postActivity(type, title, description, metadata);
    },

    loadChallenges: async () => {
        set({ challengesLoading: true });
        const challenges = await fetchChallenges();
        set({ challenges, challengesLoading: false });
    },

    joinChallengeAction: async (challengeId: string) => {
        const success = await joinChallenge(challengeId);
        if (success) {
            set({
                challenges: get().challenges.map((c) =>
                    c.id === challengeId
                        ? { ...c, participant_count: c.participant_count + 1, user_participation: { id: '', challenge_id: challengeId, user_id: '', current_value: 0, status: 'active', joined_at: new Date().toISOString(), completed_at: null } }
                        : c,
                ),
            });
        }
    },

    leaveChallengeAction: async (challengeId: string) => {
        const success = await leaveChallenge(challengeId);
        if (success) {
            set({
                challenges: get().challenges.map((c) =>
                    c.id === challengeId
                        ? { ...c, participant_count: Math.max(0, c.participant_count - 1), user_participation: null }
                        : c,
                ),
            });
        }
    },

    loadChallengeLeaderboard: async (challengeId: string) => {
        const leaderboard = await fetchChallengeLeaderboard(challengeId);
        set({ challengeLeaderboard: leaderboard });
    },

    loadLeaderboard: async (sortBy = 'xp') => {
        set({ leaderboardLoading: true });
        const entries = await fetchLeaderboard(sortBy);
        set({ leaderboard: entries, leaderboardLoading: false });
    },
}));
