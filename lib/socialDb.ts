// ============================================================
// Social Database Service Layer
// Bridges social Zustand store ↔ Supabase persistence
// ============================================================

import type {
    ActivityFeedItem,
    ActivityType,
    ChallengeParticipant,
    Comment,
    FollowRelation,
    LeaderboardEntry,
    PublicProfile,
    ReactionType,
    SocialChallenge,
} from '@/types';
import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────────────────────

async function getAuthUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
}

// ── Profile Search ───────────────────────────────────────────

export async function searchUsers(query: string): Promise<PublicProfile[]> {
    const userId = await getAuthUserId();
    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio, is_public, level, xp, streak_count, workouts_completed')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', userId || '')
        .limit(20);

    if (error || !data) return [];

    // Check follow status for each result
    const enriched: PublicProfile[] = [];
    for (const p of data) {
        let follow_status: 'none' | 'pending' | 'accepted' = 'none';
        if (userId) {
            const { data: rel } = await supabase
                .from('followers')
                .select('status')
                .eq('follower_id', userId)
                .eq('following_id', p.id)
                .single();
            if (rel) follow_status = rel.status as 'pending' | 'accepted';
        }
        enriched.push({
            ...p,
            bio: p.bio || '',
            followers_count: 0,
            following_count: 0,
            is_following: follow_status === 'accepted',
            follow_status,
        });
    }
    return enriched;
}

export async function fetchPublicProfile(targetUserId: string): Promise<PublicProfile | null> {
    const userId = await getAuthUserId();

    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio, is_public, level, xp, streak_count, workouts_completed')
        .eq('id', targetUserId)
        .single();

    if (error || !data) return null;

    // Get follow counts
    const { data: counts } = await supabase.rpc('get_follow_counts', { p_user_id: targetUserId });
    const fc = counts?.[0] || { followers_count: 0, following_count: 0 };

    // Check follow status
    let follow_status: 'none' | 'pending' | 'accepted' = 'none';
    if (userId && userId !== targetUserId) {
        const { data: rel } = await supabase
            .from('followers')
            .select('status')
            .eq('follower_id', userId)
            .eq('following_id', targetUserId)
            .single();
        if (rel) follow_status = rel.status as 'pending' | 'accepted';
    }

    return {
        ...data,
        bio: data.bio || '',
        followers_count: Number(fc.followers_count) || 0,
        following_count: Number(fc.following_count) || 0,
        is_following: follow_status === 'accepted',
        follow_status,
    };
}

// ── Followers ────────────────────────────────────────────────

export async function followUser(targetUserId: string): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase.from('followers').insert({
        follower_id: userId,
        following_id: targetUserId,
        status: 'accepted', // Auto-accept for now; change to 'pending' for private profiles
    });
    return !error;
}

export async function unfollowUser(targetUserId: string): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);
    return !error;
}

export async function fetchFollowers(targetUserId: string): Promise<FollowRelation[]> {
    const { data, error } = await supabase
        .from('followers')
        .select('id, follower_id, following_id, status, created_at, profiles!followers_follower_id_fkey(id, display_name, username, avatar_url, level, xp, streak_count, workouts_completed, bio, is_public)')
        .eq('following_id', targetUserId)
        .eq('status', 'accepted');

    if (error || !data) return [];
    return data.map((r: any) => ({
        ...r,
        profile: r.profiles ? { ...r.profiles, followers_count: 0, following_count: 0 } : undefined,
    }));
}

export async function fetchFollowing(targetUserId: string): Promise<FollowRelation[]> {
    const { data, error } = await supabase
        .from('followers')
        .select('id, follower_id, following_id, status, created_at, profiles!followers_following_id_fkey(id, display_name, username, avatar_url, level, xp, streak_count, workouts_completed, bio, is_public)')
        .eq('follower_id', targetUserId)
        .eq('status', 'accepted');

    if (error || !data) return [];
    return data.map((r: any) => ({
        ...r,
        profile: r.profiles ? { ...r.profiles, followers_count: 0, following_count: 0 } : undefined,
    }));
}

// ── Activity Feed ────────────────────────────────────────────

export async function fetchActivityFeed(page = 0, limit = 20): Promise<ActivityFeedItem[]> {
    const userId = await getAuthUserId();
    const offset = page * limit;

    const { data, error } = await supabase
        .from('activity_feed')
        .select(`
            id, user_id, activity_type, title, description, metadata, is_public, created_at,
            profiles!activity_feed_user_id_fkey(display_name, username, avatar_url, level)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error || !data) return [];

    // Enrich with reaction/comment counts + user's reaction
    const items: ActivityFeedItem[] = [];
    for (const row of data as any[]) {
        const { data: rxCount } = await supabase
            .from('reactions')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', row.id);

        const { data: cmtCount } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', row.id);

        let user_reaction: ReactionType | null = null;
        if (userId) {
            const { data: myRx } = await supabase
                .from('reactions')
                .select('reaction_type')
                .eq('activity_id', row.id)
                .eq('user_id', userId)
                .single();
            if (myRx) user_reaction = myRx.reaction_type as ReactionType;
        }

        items.push({
            id: row.id,
            user_id: row.user_id,
            activity_type: row.activity_type,
            title: row.title,
            description: row.description,
            metadata: row.metadata || {},
            is_public: row.is_public,
            created_at: row.created_at,
            profile: row.profiles || undefined,
            reactions_count: (rxCount as any)?.length ?? 0,
            comments_count: (cmtCount as any)?.length ?? 0,
            user_reaction,
        });
    }
    return items;
}

export async function fetchUserActivities(targetUserId: string, limit = 20): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase
        .from('activity_feed')
        .select(`
            id, user_id, activity_type, title, description, metadata, is_public, created_at,
            profiles!activity_feed_user_id_fkey(display_name, username, avatar_url, level)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        activity_type: row.activity_type,
        title: row.title,
        description: row.description,
        metadata: row.metadata || {},
        is_public: row.is_public,
        created_at: row.created_at,
        profile: row.profiles || undefined,
        reactions_count: 0,
        comments_count: 0,
        user_reaction: null,
    }));
}

export async function postActivity(
    activityType: ActivityType,
    title: string,
    description?: string,
    metadata?: Record<string, unknown>,
): Promise<string | null> {
    const userId = await getAuthUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('activity_feed')
        .insert({
            user_id: userId,
            activity_type: activityType,
            title,
            description: description || null,
            metadata: metadata || {},
        })
        .select('id')
        .single();

    if (error || !data) return null;
    return data.id;
}

// ── Reactions ────────────────────────────────────────────────

export async function toggleReaction(activityId: string, reactionType: ReactionType): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    // Check existing reaction
    const { data: existing } = await supabase
        .from('reactions')
        .select('id, reaction_type')
        .eq('user_id', userId)
        .eq('activity_id', activityId)
        .single();

    if (existing) {
        if (existing.reaction_type === reactionType) {
            // Remove reaction
            await supabase.from('reactions').delete().eq('id', existing.id);
            return false;
        } else {
            // Change reaction type
            await supabase.from('reactions').delete().eq('id', existing.id);
            await supabase.from('reactions').insert({
                user_id: userId,
                activity_id: activityId,
                reaction_type: reactionType,
            });
            return true;
        }
    }

    // Add new reaction
    const { error } = await supabase.from('reactions').insert({
        user_id: userId,
        activity_id: activityId,
        reaction_type: reactionType,
    });
    return !error;
}

// ── Comments ─────────────────────────────────────────────────

export async function fetchComments(activityId: string): Promise<Comment[]> {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            id, user_id, activity_id, content, created_at, updated_at,
            profiles!comments_user_id_fkey(display_name, username, avatar_url)
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

    if (error || !data) return [];
    return (data as any[]).map((c) => ({
        ...c,
        profile: c.profiles || undefined,
    }));
}

export async function postComment(activityId: string, content: string): Promise<Comment | null> {
    const userId = await getAuthUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('comments')
        .insert({
            user_id: userId,
            activity_id: activityId,
            content,
        })
        .select('id, user_id, activity_id, content, created_at, updated_at')
        .single();

    if (error || !data) return null;
    return data;
}

export async function deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    return !error;
}

// ── Challenges ───────────────────────────────────────────────

export async function fetchChallenges(): Promise<SocialChallenge[]> {
    const userId = await getAuthUserId();

    const { data, error } = await supabase
        .from('social_challenges')
        .select(`
            *,
            profiles!social_challenges_creator_id_fkey(display_name, username, avatar_url)
        `)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    const challenges: SocialChallenge[] = [];
    for (const c of data as any[]) {
        // Get participant count
        const { count } = await supabase
            .from('challenge_participants')
            .select('id', { count: 'exact', head: true })
            .eq('challenge_id', c.id);

        // Check user participation
        let user_participation: ChallengeParticipant | null = null;
        if (userId) {
            const { data: part } = await supabase
                .from('challenge_participants')
                .select('*')
                .eq('challenge_id', c.id)
                .eq('user_id', userId)
                .single();
            if (part) user_participation = part;
        }

        challenges.push({
            ...c,
            creator: c.profiles || undefined,
            participant_count: count || 0,
            user_participation,
        });
    }
    return challenges;
}

export async function createChallenge(challenge: {
    title: string;
    description?: string;
    challenge_type: string;
    target_value: number;
    unit: string;
    end_date: string;
    reward_xp?: number;
    is_public?: boolean;
}): Promise<SocialChallenge | null> {
    const userId = await getAuthUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('social_challenges')
        .insert({
            creator_id: userId,
            ...challenge,
        })
        .select('*')
        .single();

    if (error || !data) return null;

    // Auto-join as creator
    await supabase.from('challenge_participants').insert({
        challenge_id: data.id,
        user_id: userId,
    });

    return { ...data, participant_count: 1, user_participation: null, creator: undefined };
}

export async function joinChallenge(challengeId: string): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase.from('challenge_participants').insert({
        challenge_id: challengeId,
        user_id: userId,
    });
    return !error;
}

export async function leaveChallenge(challengeId: string): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
    return !error;
}

export async function fetchChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]> {
    const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
            *,
            profiles!challenge_participants_user_id_fkey(display_name, username, avatar_url, level)
        `)
        .eq('challenge_id', challengeId)
        .order('current_value', { ascending: false });

    if (error || !data) return [];
    return (data as any[]).map((p) => ({
        ...p,
        profile: p.profiles || undefined,
    }));
}

export async function updateChallengeProgress(challengeId: string, value: number): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('challenge_participants')
        .update({ current_value: value })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
    return !error;
}

// ── Leaderboard ──────────────────────────────────────────────

export async function fetchLeaderboard(sortBy: 'xp' | 'weekly_volume' | 'streak_count' | 'weekly_workouts' = 'xp'): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
        .from('leaderboard_weekly')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(50);

    if (error || !data) return [];
    return (data as LeaderboardEntry[]).map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ── Username ─────────────────────────────────────────────────

export async function updateUsername(username: string): Promise<boolean> {
    const userId = await getAuthUserId();
    if (!userId) return false;

    const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', userId);
    return !error;
}
