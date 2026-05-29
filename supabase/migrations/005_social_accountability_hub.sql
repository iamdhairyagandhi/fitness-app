-- ============================================================
-- BodyPilot Schema V5 — Social Accountability Hub
-- Run after 004_auth_enhancements.sql
-- ============================================================

-- ── Activity visibility + richer activity types ──────────────

ALTER TABLE activity_feed
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'followers', 'private'));

ALTER TABLE activity_feed
    DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

ALTER TABLE activity_feed
    ADD CONSTRAINT activity_feed_activity_type_check CHECK (activity_type IN (
        'workout_completed',
        'personal_record',
        'achievement_unlocked',
        'streak_milestone',
        'challenge_joined',
        'challenge_completed',
        'weight_milestone',
        'level_up',
        'manual_post',
        'progress_photo',
        'body_milestone',
        'recipe_shared',
        'shared_activity'
    ));

UPDATE activity_feed
SET visibility = CASE WHEN is_public THEN 'public' ELSE 'followers' END
WHERE visibility IS NULL;

DROP POLICY IF EXISTS "Users can see public activities" ON activity_feed;
CREATE POLICY "Users can see visible activities" ON activity_feed
    FOR SELECT USING (
        user_id = auth.uid()
        OR visibility = 'public'
        OR (
            visibility = 'followers'
            AND user_id IN (
                SELECT following_id FROM followers
                WHERE follower_id = auth.uid() AND status = 'accepted'
            )
        )
    );

-- ── Saves ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_activities_user ON saved_activities(user_id, created_at DESC);

ALTER TABLE saved_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own saved activities" ON saved_activities
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can save activities" ON saved_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unsave own activities" ON saved_activities
    FOR DELETE USING (user_id = auth.uid());

-- ── Blocking ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own blocks" ON blocked_users
    FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "Users can block users" ON blocked_users
    FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users can remove own blocks" ON blocked_users
    FOR DELETE USING (blocker_id = auth.uid());

-- ── Reports / moderation queue ───────────────────────────────

CREATE TABLE IF NOT EXISTS activity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activity_feed(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT 'inappropriate',
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(reporter_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_reports_status ON activity_reports(status, created_at DESC);

ALTER TABLE activity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON activity_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users can see own reports" ON activity_reports
    FOR SELECT USING (reporter_id = auth.uid());

-- ── Challenge invites ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES social_challenges(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(challenge_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_invites_invitee ON challenge_invites(invitee_id, status);

ALTER TABLE challenge_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see challenge invites" ON challenge_invites
    FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());
CREATE POLICY "Users can create challenge invites" ON challenge_invites
    FOR INSERT WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "Invitees can update challenge invites" ON challenge_invites
    FOR UPDATE USING (invitee_id = auth.uid());

-- ── Clubs / teams foundation ─────────────────────────────────

CREATE TABLE IF NOT EXISTS social_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES social_clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

ALTER TABLE social_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see public clubs" ON social_clubs
    FOR SELECT USING (
        visibility = 'public'
        OR owner_id = auth.uid()
        OR id IN (SELECT club_id FROM social_club_members WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can create clubs" ON social_clubs
    FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update clubs" ON social_clubs
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can see club members" ON social_club_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR club_id IN (SELECT id FROM social_clubs WHERE visibility = 'public')
    );
CREATE POLICY "Users can join clubs" ON social_club_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Challenge anti-cheat audit trail ─────────────────────────

CREATE TABLE IF NOT EXISTS challenge_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES social_challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'suspicious_progress',
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_audit_events_challenge ON challenge_audit_events(challenge_id, created_at DESC);

ALTER TABLE challenge_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own challenge audit events" ON challenge_audit_events
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can see own challenge audit events" ON challenge_audit_events
    FOR SELECT USING (user_id = auth.uid());
