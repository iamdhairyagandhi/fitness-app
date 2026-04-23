import { Button } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.primary, Colors.background]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.6 }}
                style={styles.gradient}
            />

            <View style={styles.content}>
                {/* Logo area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>FF</Text>
                    </View>
                    <Text style={styles.appName}>FitFusion</Text>
                    <Text style={styles.tagline}>
                        Your AI-powered fitness companion.{'\n'}
                        Train smarter. Eat better. Transform.
                    </Text>
                </View>

                {/* Features preview */}
                <View style={styles.features}>
                    {[
                        { icon: '💪', text: 'Smart Workout Tracking' },
                        { icon: '🍎', text: 'AI Nutrition Scanner' },
                        { icon: '📊', text: 'Body Composition Analytics' },
                        { icon: '🤖', text: 'AI Personal Coach' },
                    ].map((feature) => (
                        <View key={feature.text} style={styles.featureRow}>
                            <Text style={styles.featureIcon}>{feature.icon}</Text>
                            <Text style={styles.featureText}>{feature.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Auth buttons */}
                <View style={styles.buttons}>
                    <Button
                        title="Get Started"
                        onPress={() => router.push('/signup' as any)}
                        variant="primary"
                        size="lg"
                    />
                    <Button
                        title="I already have an account"
                        onPress={() => router.push('/login' as any)}
                        variant="ghost"
                        size="md"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        justifyContent: 'space-between',
        paddingTop: 80,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    logoText: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    appName: {
        color: Colors.text,
        fontSize: FontSize.hero,
        fontWeight: FontWeight.heavy,
        letterSpacing: -1,
    },
    tagline: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.md,
        lineHeight: 22,
    },
    features: {
        gap: Spacing.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    featureIcon: {
        fontSize: 24,
    },
    featureText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
    buttons: {
        gap: Spacing.md,
    },
});
