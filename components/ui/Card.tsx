import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    style?: StyleProp<ViewStyle>;
    padding?: number;
    variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, title, subtitle, style, padding = Spacing.lg, variant = 'default' }: CardProps) {
    const { colors } = useTheme();
    const themedCard = {
        backgroundColor: variant === 'outlined' ? 'transparent' : variant === 'elevated' ? colors.surfaceLight : colors.surface,
        borderColor: colors.border,
    };

    return (
        <View style={[styles.card, variant === 'elevated' && styles.elevated, variant === 'outlined' && styles.outlined, themedCard, { padding }, style]}>
            {title && (
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
                </View>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    elevated: {
        backgroundColor: Colors.surfaceLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 5,
    },
    outlined: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    header: {
        marginBottom: Spacing.md,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        letterSpacing: 0.1,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
});
