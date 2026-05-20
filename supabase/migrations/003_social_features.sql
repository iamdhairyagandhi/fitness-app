-- ============================================================
-- BodyPilot Schema V3 — Phase 4: Social Features
-- Run after 002_phase3_additions.sql
-- ============================================================

-- ── Add username + bio to profiles ───────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- ── Followers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id, status);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own follows" ON followers
    FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());
CREATE POLICY "Users can follow others" ON followers
    FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users can unfollow" ON followers
    FOR DELETE USING (follower_id = auth.uid());
CREATE POLICY "Users can update follow status" ON followers
    FOR UPDATE USING (following_id = auth.uid());

-- ── Activity Feed ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'workout_completed', 'personal_record', 'achievement_unlocked',
        'streak_milestone', 'challenge_joined', 'challenge_completed',
        'weight_milestone', 'level_up'
    )),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC) WHERE is_public = TRUE;

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see public activities" ON activity_feed
    FOR SELECT USING (
        is_public = TRUE
        OR user_id = auth.uid()
        OR user_id IN (
            SELECT following_id FROM followers
            WHERE follower_id = auth.uid() AND status = 'accepted'
        )
    );
CREATE POLICY "Users can create own activities" ON activity_feed
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own activities" ON activity_feed
    FOR DELETE USING (user_id = auth.uid());

-- ── Reactions (likes) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'fire', 'muscle', 'clap')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_activity ON reactions(activity_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see reactions" ON reactions FOR SELECT USING (TRUE);
CREATE POLICY "Users can react" ON reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON reactions
    FOR DELETE USING (user_id = auth.uid());

-- ── Comments ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_activity ON comments(activity_id, created_at);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see comments" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "Users can comment" ON comments
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can edit own comments" ON comments
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE USING (user_id = auth.uid());

-- ── Challenges ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'workout_count', 'total_volume', 'streak', 'steps', 'calories_burned', 'custom'
    )),
    target_value NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 100,
    is_public BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_dates ON social_challenges(start_date, end_date);

ALTER TABLE social_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see public challenges" ON social_challenges
    FOR SELECT USING (is_public = TRUE OR creator_id = auth.uid());
CREATE POLICY "Users can create challenges" ON social_challenges
    FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators can update challenges" ON social_challenges
    FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators can delete challenges" ON social_challenges
    FOR DELETE USING (creator_id = auth.uid());

-- ── Challenge Participants ───────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES social_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see participants" ON challenge_participants FOR SELECT USING (TRUE);
CREATE POLICY "Users can join challenges" ON challenge_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON challenge_participants
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can leave challenges" ON challenge_participants
    FOR DELETE USING (user_id = auth.uid());

-- ── Leaderboard materialized view (refresh periodically) ────

CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.xp,
    p.level,
    p.streak_count,
    p.workouts_completed,
    COALESCE(SUM(ws.total_volume_kg), 0) AS weekly_volume,
    COUNT(ws.id) AS weekly_workouts
FROM profiles p
LEFT JOIN workout_sessions ws ON ws.user_id = p.id
    AND ws.completed_at >= DATE_TRUNC('week', CURRENT_DATE)
WHERE p.is_public = TRUE
GROUP BY p.id;

-- ── Triggers ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Helper: Get follower/following counts ────────────────────

CREATE OR REPLACE FUNCTION get_follow_counts(p_user_id UUID)
RETURNS TABLE(followers_count BIGINT, following_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM followers WHERE following_id = p_user_id AND status = 'accepted'),
        (SELECT COUNT(*) FROM followers WHERE follower_id = p_user_id AND status = 'accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
