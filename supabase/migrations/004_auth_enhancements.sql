-- ============================================================
-- FitFusion Schema V4 — Auth Enhancements
-- Run after 003_social_features.sql
-- ============================================================

-- ── Add phone_number to profiles ─────────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ── Index for phone number uniqueness (allow nulls) ──────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone
    ON profiles(phone_number) WHERE phone_number IS NOT NULL;
