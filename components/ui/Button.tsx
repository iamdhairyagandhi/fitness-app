import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    style,
    textStyle,
    fullWidth = true,
}: ButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.base,
                styles[variant],
                styles[`size_${size}`],
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.text}
                    size="small"
                />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            styles[`text_${variant}`],
                            styles[`text_${size}`],
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    fullWidth: {
        width: '100%',
    },
    primary: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    secondary: {
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: Colors.error + '15',
        borderWidth: 1,
        borderColor: Colors.error + '30',
    },
    disabled: {
        opacity: 0.45,
    },
    size_sm: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        height: 36,
    },
    size_md: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        height: 48,
    },
    size_lg: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
        height: 56,
    },
    text: {
        fontWeight: FontWeight.semibold,
        letterSpacing: 0.2,
    },
    text_primary: {
        color: Colors.text,
    },
    text_secondary: {
        color: Colors.text,
    },
    text_outline: {
        color: Colors.primary,
    },
    text_ghost: {
        color: Colors.primary,
    },
    text_danger: {
        color: Colors.error,
    },
    text_sm: {
        fontSize: FontSize.sm,
    },
    text_md: {
        fontSize: FontSize.md,
    },
    text_lg: {
        fontSize: FontSize.lg,
    },
});
