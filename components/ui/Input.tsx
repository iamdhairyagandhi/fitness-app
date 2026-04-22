import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Input({
    label,
    error,
    containerStyle,
    leftIcon,
    rightIcon,
    style,
    ...props
}: InputProps) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputWrapper, focused && styles.inputFocused, error && styles.inputError]}>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        leftIcon ? styles.inputWithLeftIcon : null,
                        rightIcon ? styles.inputWithRightIcon : null,
                        style,
                    ]}
                    placeholderTextColor={Colors.textTertiary}
                    selectionColor={Colors.primary}
                    onFocus={(e) => {
                        setFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        props.onBlur?.(e);
                    }}
                    {...props}
                />
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        marginBottom: Spacing.sm,
        letterSpacing: 0.1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inputFocused: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
    },
    inputError: {
        borderColor: Colors.error,
    },
    input: {
        flex: 1,
        color: Colors.text,
        fontSize: FontSize.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        height: 48,
    },
    inputWithLeftIcon: {
        paddingLeft: Spacing.xs,
    },
    inputWithRightIcon: {
        paddingRight: Spacing.xs,
    },
    iconLeft: {
        paddingLeft: Spacing.md,
    },
    iconRight: {
        paddingRight: Spacing.md,
    },
    error: {
        color: Colors.error,
        fontSize: FontSize.xs,
        marginTop: Spacing.xs,
    },
});
