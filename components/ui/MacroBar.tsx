import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
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
    const progress = target > 0 ? Math.min(current / target, 1) : 0;
    const isOver = current > target;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>{label}</Text>
                <Text style={[styles.values, isOver && styles.overValues]}>
                    {Math.round(current)}{unit}{' '}
                    <Text style={styles.target}>/ {Math.round(target)}{unit}</Text>
                </Text>
            </View>
            <View style={styles.barBg}>
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
        marginBottom: Spacing.xs,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
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
        height: 6,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
    },
});
