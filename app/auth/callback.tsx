import { Colors } from '@/constants/theme';
import { claimLatestOnboardingLead, fetchProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * Supabase auth callback handler.
 * Handles OAuth redirects and email confirmation links.
 */
export default function AuthCallbackScreen() {
    const params = useLocalSearchParams<{
        access_token?: string;
        refresh_token?: string;
        code?: string;
        error?: string;
        error_description?: string;
    }>();
    const { setOnboarded, setSession, setUser } = useAuthStore();

    useEffect(() => {
        async function handleCallback() {
            try {
                if (params.error || params.error_description) {
                    throw new Error(String(params.error_description || params.error));
                }

                if (params.code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
                    if (error) throw error;
                }

                // On web, Supabase handles the hash fragment automatically.
                // On native, we try to set session from the redirect params.
                if (params.access_token && params.refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });
                    if (error) throw error;
                }

                // Get the current session
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setSession({ access_token: session.access_token });
                    await claimLatestOnboardingLead();

                    const profile = await fetchProfile(session.user.id);
                    if (profile) {
                        setUser(profile);
                    }

                    if (profile?.height_cm) {
                        setOnboarded(true);
                        router.replace('/(tabs)');
                    } else {
                        setOnboarded(false);
                        router.replace('/(auth)/onboarding');
                    }
                } else {
                    router.replace('/login' as any);
                }
            } catch {
                router.replace('/login' as any);
            }
        }

        handleCallback();
    }, [params, setOnboarded, setSession, setUser]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.text}>Confirming your account...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 16,
    },
    text: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
});
