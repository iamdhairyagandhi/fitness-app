-- ============================================================
-- BodyPilot Schema V2 — Phase 3 additions
-- Run after 001_initial_schema.sql
-- ============================================================

-- ── Add missing columns to profiles ──────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
    ADD COLUMN IF NOT EXISTS preferred_rest_seconds INTEGER DEFAULT 90,
    ADD COLUMN IF NOT EXISTS workouts_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_workout_date TIMESTAMPTZ;

-- ── Recovery Logs ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recovery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sleep_hours NUMERIC,
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    soreness_level INTEGER NOT NULL DEFAULT 0 CHECK (soreness_level BETWEEN 0 AND 5),
    sore_body_parts TEXT[] NOT NULL DEFAULT '{}',
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),
    resting_hr INTEGER,
    hrv INTEGER,
    recovery_score INTEGER NOT NULL DEFAULT 50,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_logs_user ON recovery_logs(user_id, date DESC);

ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recovery" ON recovery_logs FOR ALL USING (user_id = auth.uid());

-- ── User Achievements ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements" ON user_achievements FOR ALL USING (user_id = auth.uid());

-- ── Diet Profiles ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS diet_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    template TEXT NOT NULL DEFAULT 'standard',
    phase TEXT NOT NULL DEFAULT 'maintain',
    phase_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    phase_target_date DATE,
    macro_cycle_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    macro_cycle_pattern TEXT[] NOT NULL DEFAULT '{}',
    fasting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    fasting_window_start TEXT,
    fasting_window_end TEXT,
    allergies TEXT[] NOT NULL DEFAULT '{}',
    intolerances TEXT[] NOT NULL DEFAULT '{}',
    excluded_foods TEXT[] NOT NULL DEFAULT '{}',
    preferred_cuisines TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE diet_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own diet profile" ON diet_profiles FOR ALL USING (user_id = auth.uid());

-- ── Fasting Sessions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fasting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_end_at TIMESTAMPTZ NOT NULL,
    actual_end_at TIMESTAMPTZ,
    fasting_hours NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'broken')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_fasting_user ON fasting_sessions(user_id, started_at DESC);

ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fasting" ON fasting_sessions FOR ALL USING (user_id = auth.uid());

-- ── Supplements ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL DEFAULT '',
    timing TEXT NOT NULL DEFAULT 'morning',
    frequency TEXT NOT NULL DEFAULT 'daily',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    supplement_id UUID NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplements" ON supplements FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own supplement logs" ON supplement_logs FOR ALL USING (user_id = auth.uid());

-- ── Triggers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS diet_profiles_updated_at ON diet_profiles;
CREATE TRIGGER diet_profiles_updated_at
    BEFORE UPDATE ON diet_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
