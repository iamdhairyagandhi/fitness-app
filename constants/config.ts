// Supabase configuration
// Replace these with your actual Supabase project credentials
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// OpenAI configuration
export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// App constants
export const APP_NAME = 'FitFusion';
export const APP_VERSION = '1.0.0';

// Nutrition defaults
export const DEFAULT_CALORIES = 2000;
export const DEFAULT_PROTEIN_PCT = 0.30;
export const DEFAULT_CARBS_PCT = 0.40;
export const DEFAULT_FAT_PCT = 0.30;

// Water
export const DEFAULT_WATER_GOAL_ML = 2500;
export const WATER_SERVING_ML = 250;

// Admin credentials (demo/testing)
export const ADMIN_EMAIL = 'admin@fitfusion.com';
export const ADMIN_PASSWORD = 'admin123';

// Workout
export const DEFAULT_REST_SECONDS = 90;
export const MAX_SETS = 20;
export const MAX_REPS = 999;
export const MAX_WEIGHT = 2000;

// OAuth — set these in your .env file
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
