-- ============================================================
-- BodyPilot Schema V8 — Web Questionnaire Leads
-- Run after 007_social_media_storage.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    display_name TEXT,
    unit_system TEXT NOT NULL DEFAULT 'imperial' CHECK (unit_system IN ('metric', 'imperial')),
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    age_years INTEGER,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    target_weight_kg NUMERIC,
    activity_level TEXT DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    goal TEXT DEFAULT 'maintain' CHECK (goal IN ('lose_fat', 'maintain', 'build_muscle', 'recomp', 'strength', 'endurance')),
    experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    training_days INTEGER,
    session_minutes INTEGER,
    equipment TEXT,
    diet_style TEXT,
    meals_per_day INTEGER,
    tracking_style TEXT,
    sleep_hours NUMERIC,
    stress_level TEXT,
    motivation TEXT,
    pace TEXT DEFAULT 'balanced',
    daily_calorie_target INTEGER,
    protein_target_g INTEGER,
    carbs_target_g INTEGER,
    fat_target_g INTEGER,
    water_goal_ml INTEGER,
    preferred_rest_seconds INTEGER DEFAULT 90,
    raw_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    claimed_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_leads_email_created
    ON onboarding_leads (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_leads_claimed_user
    ON onboarding_leads (claimed_user_id);

ALTER TABLE onboarding_leads ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON onboarding_leads TO anon;
GRANT INSERT ON onboarding_leads TO authenticated;

DROP POLICY IF EXISTS "Anyone can submit onboarding leads" ON onboarding_leads;
CREATE POLICY "Anyone can submit onboarding leads"
    ON onboarding_leads
    FOR INSERT
    WITH CHECK (claimed_user_id IS NULL AND claimed_at IS NULL);

DROP FUNCTION IF EXISTS claim_latest_onboarding_lead();
CREATE OR REPLACE FUNCTION claim_latest_onboarding_lead()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lead onboarding_leads%ROWTYPE;
    profile_email TEXT;
BEGIN
    SELECT email INTO profile_email
    FROM auth.users
    WHERE id = auth.uid();

    IF auth.uid() IS NULL OR profile_email IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO lead
    FROM onboarding_leads
    WHERE lower(email) = lower(profile_email)
      AND claimed_user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF lead.id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE profiles
    SET
        display_name = COALESCE(NULLIF(lead.display_name, ''), profiles.display_name),
        gender = COALESCE(lead.gender, profiles.gender),
        height_cm = COALESCE(lead.height_cm, profiles.height_cm),
        weight_kg = COALESCE(lead.weight_kg, profiles.weight_kg),
        current_weight_kg = COALESCE(lead.weight_kg, profiles.current_weight_kg),
        activity_level = COALESCE(lead.activity_level, profiles.activity_level),
        goal = COALESCE(lead.goal, profiles.goal),
        experience_level = COALESCE(lead.experience_level, profiles.experience_level),
        daily_calorie_target = COALESCE(lead.daily_calorie_target, profiles.daily_calorie_target),
        protein_target_g = COALESCE(lead.protein_target_g, profiles.protein_target_g),
        carbs_target_g = COALESCE(lead.carbs_target_g, profiles.carbs_target_g),
        fat_target_g = COALESCE(lead.fat_target_g, profiles.fat_target_g),
        water_goal_ml = COALESCE(lead.water_goal_ml, profiles.water_goal_ml),
        unit_system = COALESCE(lead.unit_system, profiles.unit_system),
        preferred_rest_seconds = COALESCE(lead.preferred_rest_seconds, profiles.preferred_rest_seconds),
        bio = COALESCE(
            'Goal: ' || replace(COALESCE(lead.goal, 'maintain'), '_', ' ') ||
            ' | ' || COALESCE(lead.training_days::TEXT, '4') || ' days/week' ||
            ' | ' || COALESCE(lead.equipment, 'mixed') || ' training',
            profiles.bio
        ),
        updated_at = now()
    WHERE id = auth.uid();

    UPDATE onboarding_leads
    SET claimed_user_id = auth.uid(),
        claimed_at = now()
    WHERE id = lead.id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_latest_onboarding_lead() TO authenticated;
