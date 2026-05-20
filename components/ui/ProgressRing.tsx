import { Colors, FontSize, FontWeight } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
    label?: string;
    value?: string;
    sublabel?: string;
}

export function ProgressRing({
    progress,
    size = 100,
    strokeWidth = 8,
    color = Colors.primary,
    bgColor = Colors.border,
    label,
    value,
    sublabel,
}: ProgressRingProps) {
    const { colors } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size} style={styles.svg}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={bgColor === Colors.border ? colors.border : bgColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={styles.labelContainer}>
                {value && <Text style={[styles.value, { fontSize: size > 80 ? FontSize.xl : FontSize.md, color: colors.text }]}>{value}</Text>}
                {label && <Text style={[styles.label, { fontSize: size > 80 ? FontSize.xs : 9, color: colors.textSecondary }]}>{label}</Text>}
                {sublabel && <Text style={[styles.sublabel, { fontSize: 9, color: colors.textTertiary }]}>{sublabel}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        position: 'absolute',
    },
    labelContainer: {
        alignItems: 'center',
    },
    value: {
        color: Colors.text,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.5,
    },
    label: {
        color: Colors.textSecondary,
        fontWeight: FontWeight.medium,
        marginTop: 1,
    },
    sublabel: {
        color: Colors.textTertiary,
        marginTop: 0,
    },
});
