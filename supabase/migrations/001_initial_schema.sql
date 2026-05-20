-- BodyPilot Database Schema
-- Run this in your Supabase SQL editor to set up all tables

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Athlete',
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  activity_level TEXT DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT DEFAULT 'maintain' CHECK (goal IN ('lose_fat', 'maintain', 'build_muscle', 'recomp', 'strength', 'endurance')),
  experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  daily_calorie_target INTEGER DEFAULT 2000,
  protein_target_g INTEGER DEFAULT 150,
  carbs_target_g INTEGER DEFAULT 200,
  fat_target_g INTEGER DEFAULT 65,
  water_goal_ml INTEGER DEFAULT 2500,
  unit_system TEXT DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
  streak_count INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Athlete')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- EXERCISES
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'cardio', 'stretching', 'other')),
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT NOT NULL DEFAULT 'none' CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other', 'none')),
  instructions TEXT DEFAULT '',
  tips TEXT,
  image_url TEXT,
  is_compound BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKOUT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  estimated_duration_min INTEGER DEFAULT 45,
  category TEXT DEFAULT 'custom',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume_kg NUMERIC DEFAULT 0,
  notes TEXT,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERSONAL RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  estimated_1rm_kg NUMERIC NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOOD ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  serving_size_g NUMERIC NOT NULL DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC,
  sugar_g NUMERIC,
  sodium_mg NUMERIC,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items USING gin(to_tsvector('english', name));

-- ============================================================
-- FOOD LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS food_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings NUMERIC NOT NULL DEFAULT 1,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log(user_id, logged_at);

-- ============================================================
-- WATER LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS water_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WEIGHT ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  body_fat_pct NUMERIC,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, logged_at);

-- ============================================================
-- BODY MEASUREMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  left_arm_cm NUMERIC,
  right_arm_cm NUMERIC,
  left_thigh_cm NUMERIC,
  right_thigh_cm NUMERIC,
  left_calf_cm NUMERIC,
  right_calf_cm NUMERIC,
  neck_cm NUMERIC,
  shoulders_cm NUMERIC
);

-- ============================================================
-- PROGRESS PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  pose TEXT CHECK (pose IN ('front', 'side', 'back')),
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  weight_kg NUMERIC,
  notes TEXT
);

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weight', 'strength', 'body_fat', 'measurement', 'nutrition', 'workout_count', 'streak', 'custom')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises: users can see all non-custom + their own custom exercises
CREATE POLICY "Users can view exercises" ON exercises FOR SELECT USING (NOT is_custom OR user_id = auth.uid());
CREATE POLICY "Users can insert custom exercises" ON exercises FOR INSERT WITH CHECK (user_id = auth.uid() AND is_custom = TRUE);

-- Workout templates: users manage their own
CREATE POLICY "Users manage own templates" ON workout_templates FOR ALL USING (user_id = auth.uid());

-- Workout sessions: users manage their own
CREATE POLICY "Users manage own sessions" ON workout_sessions FOR ALL USING (user_id = auth.uid());

-- Personal records: users manage their own
CREATE POLICY "Users manage own PRs" ON personal_records FOR ALL USING (user_id = auth.uid());

-- Food items: users can see all non-custom + their own
CREATE POLICY "Users can view food items" ON food_items FOR SELECT USING (NOT is_custom OR user_id = auth.uid());
CREATE POLICY "Users can insert custom food" ON food_items FOR INSERT WITH CHECK (user_id = auth.uid() AND is_custom = TRUE);

-- Food log: users manage their own
CREATE POLICY "Users manage own food log" ON food_log FOR ALL USING (user_id = auth.uid());

-- Water log: users manage their own
CREATE POLICY "Users manage own water log" ON water_log FOR ALL USING (user_id = auth.uid());

-- Weight entries: users manage their own
CREATE POLICY "Users manage own weight" ON weight_entries FOR ALL USING (user_id = auth.uid());

-- Body measurements: users manage their own
CREATE POLICY "Users manage own measurements" ON body_measurements FOR ALL USING (user_id = auth.uid());

-- Progress photos: users manage their own
CREATE POLICY "Users manage own photos" ON progress_photos FOR ALL USING (user_id = auth.uid());

-- Goals: users manage their own
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- SEED DATA: Default exercises
-- ============================================================
INSERT INTO exercises (name, category, muscle_groups, equipment, is_compound, is_custom) VALUES
  ('Bench Press', 'barbell', ARRAY['chest', 'triceps', 'shoulders'], 'barbell', TRUE, FALSE),
  ('Incline Bench Press', 'barbell', ARRAY['chest', 'shoulders', 'triceps'], 'barbell', TRUE, FALSE),
  ('Dumbbell Bench Press', 'dumbbell', ARRAY['chest', 'triceps', 'shoulders'], 'dumbbell', TRUE, FALSE),
  ('Squat', 'barbell', ARRAY['quads', 'glutes', 'hamstrings'], 'barbell', TRUE, FALSE),
  ('Front Squat', 'barbell', ARRAY['quads', 'glutes'], 'barbell', TRUE, FALSE),
  ('Deadlift', 'barbell', ARRAY['back', 'hamstrings', 'glutes'], 'barbell', TRUE, FALSE),
  ('Romanian Deadlift', 'barbell', ARRAY['hamstrings', 'glutes', 'lower_back'], 'barbell', TRUE, FALSE),
  ('Overhead Press', 'barbell', ARRAY['shoulders', 'triceps'], 'barbell', TRUE, FALSE),
  ('Barbell Row', 'barbell', ARRAY['back', 'biceps'], 'barbell', TRUE, FALSE),
  ('Pull-Up', 'bodyweight', ARRAY['lats', 'biceps'], 'bodyweight', TRUE, FALSE),
  ('Chin-Up', 'bodyweight', ARRAY['lats', 'biceps'], 'bodyweight', TRUE, FALSE),
  ('Dips', 'bodyweight', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', TRUE, FALSE),
  ('Push-Up', 'bodyweight', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', TRUE, FALSE),
  ('Dumbbell Curl', 'dumbbell', ARRAY['biceps'], 'dumbbell', FALSE, FALSE),
  ('Hammer Curl', 'dumbbell', ARRAY['biceps', 'forearms'], 'dumbbell', FALSE, FALSE),
  ('Tricep Pushdown', 'cable', ARRAY['triceps'], 'cable', FALSE, FALSE),
  ('Skull Crusher', 'barbell', ARRAY['triceps'], 'barbell', FALSE, FALSE),
  ('Lateral Raise', 'dumbbell', ARRAY['shoulders'], 'dumbbell', FALSE, FALSE),
  ('Face Pull', 'cable', ARRAY['shoulders', 'traps'], 'cable', FALSE, FALSE),
  ('Leg Press', 'machine', ARRAY['quads', 'glutes'], 'machine', TRUE, FALSE),
  ('Leg Extension', 'machine', ARRAY['quads'], 'machine', FALSE, FALSE),
  ('Leg Curl', 'machine', ARRAY['hamstrings'], 'machine', FALSE, FALSE),
  ('Calf Raise', 'machine', ARRAY['calves'], 'machine', FALSE, FALSE),
  ('Cable Fly', 'cable', ARRAY['chest'], 'cable', FALSE, FALSE),
  ('Lat Pulldown', 'cable', ARRAY['lats', 'biceps'], 'cable', TRUE, FALSE),
  ('Seated Cable Row', 'cable', ARRAY['back', 'biceps'], 'cable', TRUE, FALSE),
  ('Plank', 'bodyweight', ARRAY['abs'], 'bodyweight', FALSE, FALSE),
  ('Hanging Leg Raise', 'bodyweight', ARRAY['abs'], 'bodyweight', FALSE, FALSE),
  ('Cable Crunch', 'cable', ARRAY['abs'], 'cable', FALSE, FALSE),
  ('Hip Thrust', 'barbell', ARRAY['glutes', 'hamstrings'], 'barbell', TRUE, FALSE)
ON CONFLICT DO NOTHING;
