import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/config';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from './storage';

const fallbackKey = (key: string) => `secure-store-fallback:${key}`;
let warnedAboutSecureStore = false;

const warnSecureStoreFallback = (error: unknown) => {
    if (warnedAboutSecureStore) return;
    warnedAboutSecureStore = true;
    console.warn('[supabase] SecureStore unavailable; falling back to AsyncStorage for auth session.', error);
};

const ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
        try {
            const value = await SecureStore.getItemAsync(key);
            return value ?? await AsyncStorage.getItem(fallbackKey(key));
        } catch (error) {
            warnSecureStoreFallback(error);
            return AsyncStorage.getItem(fallbackKey(key));
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            await SecureStore.setItemAsync(key, value);
            await AsyncStorage.removeItem(fallbackKey(key));
        } catch (error) {
            warnSecureStoreFallback(error);
            await AsyncStorage.setItem(fallbackKey(key), value);
        }
    },
    removeItem: async (key: string) => {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            warnSecureStoreFallback(error);
        }
        await AsyncStorage.removeItem(fallbackKey(key));
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ExpoSecureStoreAdapter as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
