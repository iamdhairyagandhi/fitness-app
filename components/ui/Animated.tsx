import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// ── Fade-in entrance ─────────────────────────────────────────

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

export function FadeIn({ children, delay = 0, duration = 400, style }: FadeInProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(12);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// ── Scale on press (wrap interactive items) ──────────────────

interface ScalePressProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function ScalePress({ children, style }: ScalePressProps) {
    return <Animated.View style={style}>{children}</Animated.View>;
}

// ── Staggered list item ──────────────────────────────────────

interface StaggerItemProps {
    children: React.ReactNode;
    index: number;
    style?: ViewStyle;
}

export function StaggerItem({ children, index, style }: StaggerItemProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(16);

    useEffect(() => {
        const delay = Math.min(index * 60, 600);
        opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 180 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// ── Slide in from side ───────────────────────────────────────

interface SlideInProps {
    children: React.ReactNode;
    from?: 'left' | 'right';
    delay?: number;
    style?: ViewStyle;
}

export function SlideIn({ children, from = 'right', delay = 0, style }: SlideInProps) {
    const translateX = useSharedValue(from === 'right' ? 40 : -40);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateX.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 180 }));
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateX: translateX.value }],
    }));

    return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// ── Number counter animation ─────────────────────────────────

interface AnimatedNumberProps {
    value: number;
    style?: any;
}

export function AnimatedNumber({ value, style }: AnimatedNumberProps) {
    const animValue = useSharedValue(0);

    useEffect(() => {
        animValue.value = withTiming(value, { duration: 800 });
    }, [value]);

    const animatedProps = useAnimatedStyle(() => ({
        opacity: 1, // placeholder — text content handled by parent
    }));

    return <Animated.Text style={[animatedProps, style]}>{Math.round(value)}</Animated.Text>;
}
