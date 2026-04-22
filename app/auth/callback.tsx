import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * OAuth callback handler.
 * Supabase redirects here after Google/Apple sign-in.
 * It extracts tokens from the URL fragment and sets the session.
 */
export default function AuthCallbackScreen() {
    const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
    const { setSession } = useAuthStore();

    useEffect(() => {
        async function handleCallback() {
            try {
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
                    router.replace('/(tabs)');
                } else {
                    router.replace('/(auth)/login');
                }
            } catch {
                router.replace('/(auth)/login');
            }
        }

        handleCallback();
    }, [params, setSession]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.text}>Signing you in...</Text>
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
