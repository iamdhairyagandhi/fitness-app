import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MacroBarProps {
    label: string;
    current: number;
    target: number;
    color: string;
    unit?: string;
}

export function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
    const { colors } = useTheme();
    const progress = target > 0 ? Math.min(current / target, 1) : 0;
    const isOver = current > target;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.values, { color: colors.text }, isOver && styles.overValues]}>
                    {Math.round(current)}{unit}{' '}
                    <Text style={[styles.target, { color: colors.textTertiary }]}>/ {Math.round(target)}{unit}</Text>
                </Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${Math.min(progress * 100, 100)}%`,
                            backgroundColor: isOver ? Colors.error : color,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        letterSpacing: 0.1,
    },
    values: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    overValues: {
        color: Colors.error,
    },
    target: {
        color: Colors.textTertiary,
        fontWeight: FontWeight.regular,
    },
    barBg: {
        height: 5,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
});
