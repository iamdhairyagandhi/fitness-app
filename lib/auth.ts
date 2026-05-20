import { supabase } from '@/lib/supabase';
import type { Provider } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Lazy-load expo-crypto to avoid crash when native module is missing
let Crypto: typeof import('expo-crypto') | null = null;
try {
    Crypto = require('expo-crypto');
} catch {
    console.warn('[auth] expo-crypto native module unavailable — Apple sign-in disabled');
}

WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_URL = AuthSession.makeRedirectUri({
    scheme: 'fitfusion',
    path: 'auth/callback',
});

function firstParam(value: string | string[] | null | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

function extractOAuthParams(url: string) {
    const parsed = Linking.parse(url);
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
        const firstValue = firstParam(value as string | string[]);
        if (firstValue) params.set(key, firstValue);
    }

    const queryIndex = url.indexOf('?');
    const hashIndex = url.indexOf('#');
    const queryEnd = hashIndex >= 0 ? hashIndex : undefined;
    const rawQuery = queryIndex >= 0 ? url.slice(queryIndex + 1, queryEnd) : '';
    const rawHash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';

    for (const chunk of [rawQuery, rawHash]) {
        const chunkParams = new URLSearchParams(chunk);
        chunkParams.forEach((value, key) => {
            if (value && !params.has(key)) params.set(key, value);
        });
    }

    return params;
}

async function completeOAuthSignIn(provider: Provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: OAUTH_REDIRECT_URL,
            skipBrowserRedirect: Platform.OS !== 'web',
        },
    });

    if (error) throw error;

    if (Platform.OS === 'web') return data;
    if (!data?.url) throw new Error('No sign-in URL returned');

    const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);
    if (result.type !== 'success') {
        throw new Error(`${provider === 'google' ? 'Google' : 'Apple'} sign-in was cancelled`);
    }

    const params = extractOAuthParams(result.url);
    const code = params.get('code');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const oauthError = params.get('error_description') || params.get('error');

    if (oauthError) throw new Error(String(oauthError));

    if (code) {
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        return sessionData;
    }

    if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        return sessionData;
    }

    throw new Error('Sign-in did not return a valid session');
}

// ── Google sign-in via Supabase OAuth ────────────────────────

export async function signInWithGoogle() {
    return completeOAuthSignIn('google');
}

// ── Apple sign-in via Supabase OAuth ─────────────────────────

export async function signInWithApple() {
    if (!Crypto) throw new Error('expo-crypto is required for Apple sign-in but is not available');

    return completeOAuthSignIn('apple');
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

// ── Account deletion ────────────────────────────────────────

export async function deleteCurrentAccount(): Promise<void> {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) throw error;

    const result = data as { error?: { message?: string } } | null;
    if (result?.error) {
        throw new Error(result.error.message || 'Failed to delete account');
    }

    await supabase.auth.signOut();
}
