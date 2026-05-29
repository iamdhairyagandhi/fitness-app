-- BodyPilot Schema V6 — Food photo logging metadata

ALTER TABLE food_log
    ADD COLUMN IF NOT EXISTS photo_uri TEXT;
