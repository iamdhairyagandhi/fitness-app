import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// ── Google sign-in via Supabase OAuth ────────────────────────

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AuthSession.makeRedirectUri({ path: 'auth/callback' }),
      queryParams: {
        // hint: the Google client IDs for platform-specific flows
        ...(Platform.OS === 'web' && GOOGLE_WEB_CLIENT_ID
          ? { client_id: GOOGLE_WEB_CLIENT_ID }
          : {}),
      },
    },
  });

  if (error) throw error;

  // On web, Supabase opens the URL automatically.
  // On native, we need to open the browser manually.
  if (data?.url && Platform.OS !== 'web') {
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      AuthSession.makeRedirectUri({ path: 'auth/callback' }),
    );
    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled');
    }
  }

  return data;
}

// ── Apple sign-in via Supabase OAuth ─────────────────────────

export async function signInWithApple() {
  // Generate a nonce for security
  const rawNonce = Crypto.getRandomBytes(16)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: AuthSession.makeRedirectUri({ path: 'auth/callback' }),
    },
  });

  if (error) throw error;

  if (data?.url && Platform.OS !== 'web') {
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      AuthSession.makeRedirectUri({ path: 'auth/callback' }),
    );
    if (result.type !== 'success') {
      throw new Error('Apple sign-in was cancelled');
    }
  }

  return data;
}

// ── Username helpers ─────────────────────────────────────────

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const cleaned = username.trim().toLowerCase();
  if (cleaned.length < 3 || cleaned.length > 30) return false;
  if (!/^[a-z0-9_]+$/.test(cleaned)) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', cleaned)
    .maybeSingle();

  if (error) throw error;
  return !data; // available if no row found
}

export async function setUsername(userId: string, username: string): Promise<void> {
  const cleaned = username.trim().toLowerCase();
  const { error } = await supabase
    .from('profiles')
    .update({ username: cleaned })
    .eq('id', userId);

  if (error) throw error;
}

// ── Phone number helpers ─────────────────────────────────────

export async function updatePhoneNumber(userId: string, phone: string): Promise<void> {
  const cleaned = phone.trim();
  const { error } = await supabase
    .from('profiles')
    .update({ phone_number: cleaned })
    .eq('id', userId);

  if (error) throw error;
}
