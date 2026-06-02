import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIWorkoutRedirectScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    useEffect(() => {
        const timer = setTimeout(() => router.replace('/(tabs)/workout'), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/workout')}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.content}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>Opening AI workout builder</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    The latest workout creator now lives in the Workout tab.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backButton: { paddingHorizontal: 20, paddingVertical: 14, alignSelf: 'flex-start' },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
});
