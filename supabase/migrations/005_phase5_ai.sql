-- ============================================================
-- FitFusion Schema V5 — Phase 5: Advanced AI
-- Run after 004_auth_enhancements.sql
-- ============================================================

-- ── Chat conversations ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON chat_conversations
    FOR ALL USING (user_id = auth.uid());

-- ── Chat messages ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages" ON chat_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM chat_conversations WHERE user_id = auth.uid()
        )
    );

-- ── AI weekly reports ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    workouts_completed INTEGER NOT NULL DEFAULT 0,
    total_volume_kg NUMERIC NOT NULL DEFAULT 0,
    avg_calories NUMERIC NOT NULL DEFAULT 0,
    avg_protein_g NUMERIC NOT NULL DEFAULT 0,
    weight_change_kg NUMERIC DEFAULT 0,
    new_prs INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    recovery_avg NUMERIC DEFAULT 0,
    ai_summary TEXT NOT NULL DEFAULT '',
    ai_recommendations JSONB NOT NULL DEFAULT '[]',
    highlights JSONB NOT NULL DEFAULT '[]',
    correlation_insights JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user ON ai_weekly_reports(user_id, week_start DESC);

ALTER TABLE ai_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own reports" ON ai_weekly_reports
    FOR ALL USING (user_id = auth.uid());

-- ── AI daily insights cache ─────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_daily_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    insight_text TEXT NOT NULL,
    insight_type TEXT NOT NULL DEFAULT 'general',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

ALTER TABLE ai_daily_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own insights" ON ai_daily_insights
    FOR ALL USING (user_id = auth.uid());

-- ── Triggers ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
