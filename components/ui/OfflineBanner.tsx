// ── Offline Banner ───────────────────────────────────────────
// Shows a banner when the device is offline
// ─────────────────────────────────────────────────────────────

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOffline(!state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (!isOffline) return null;

    return (
        <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutUp.duration(300)}
            style={styles.banner}
        >
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.text}>You're offline — data will sync when connected</Text>
        </Animated.View>
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
