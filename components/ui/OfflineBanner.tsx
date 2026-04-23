// ── Offline Banner ───────────────────────────────────────────
// Shows a banner when the device is offline
// ─────────────────────────────────────────────────────────────

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // On web, use the browser's navigator.onLine API
        if (Platform.OS === 'web') {
            const update = () => setIsOffline(!navigator.onLine);
            update();
            window.addEventListener('online', update);
            window.addEventListener('offline', update);
            return () => {
                window.removeEventListener('online', update);
                window.removeEventListener('offline', update);
            };
        }
        // On native, use NetInfo
        let unsubscribe: (() => void) | undefined;
        (async () => {
            try {
                const NetInfo = (await import('@react-native-community/netinfo')).default;
                unsubscribe = NetInfo.addEventListener((state) => {
                    setIsOffline(!state.isConnected);
                });
            } catch {
                // NetInfo unavailable — ignore
            }
        })();
        return () => unsubscribe?.();
    }, []);

    if (!isOffline) return null;

    return (
        <View style={styles.banner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.text}>You're offline — data will sync when connected</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.error,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    text: {
        color: '#fff',
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
});
