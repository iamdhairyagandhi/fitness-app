import { Button } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
    const { isLoading, isOnboarded, user } = useAuthStore();

    useEffect(() => {
        if (isLoading) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            router.replace(isOnboarded && user?.height_cm ? '/(tabs)' : '/(auth)/onboarding');
        }).catch(() => { });
    }, [isLoading, isOnboarded, user?.height_cm]);

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    pointerEvents="none"
                    colors={['#081104', '#020402', Colors.background]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.86 }}
                    style={styles.gradient}
                />
                <LinearGradient
                    pointerEvents="none"
                    colors={[Colors.primary + '18', Colors.primary + '05', Colors.primary + '00']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.topSheen}
                />
                <View style={styles.brandRow}>
                    <View style={styles.logoCrop}>
                        <Image
                            source={require('../../assets/bodypilot-wordmark-white.png')}
                            style={styles.wordmark}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                <View style={styles.hero}>
                    <Text style={styles.kicker}>AI FITNESS COACH</Text>
                    <Text style={styles.headline}>Train with a plan that adapts to your body.</Text>
                    <Text style={styles.tagline}>
                        BodyPilot turns workouts, food logs, recovery, and progress into clear daily targets.
                    </Text>
                </View>

                <View style={styles.dashboard}>
                    <View style={styles.dashboardHeader}>
                        <View>
                            <Text style={styles.dashboardLabel}>Today&apos;s Pilot</Text>
                            <Text style={styles.dashboardTitle}>Lean Strength</Text>
                        </View>
                        <View style={styles.scoreBadge}>
                            <Text style={styles.score}>92</Text>
                        </View>
                    </View>

                    <View style={styles.ringRow}>
                        <View style={styles.ring}>
                            <View style={styles.ringInner}>
                                <Text style={styles.ringValue}>74%</Text>
                                <Text style={styles.ringLabel}>target</Text>
                            </View>
                        </View>
                        <View style={styles.stack}>
                            <MiniMetric icon="flame" label="Calories" value="1,840 / 2,250" />
                            <MiniMetric icon="barbell" label="Training" value="Push + core" />
                            <MiniMetric icon="moon" label="Recovery" value="Ready to progress" />
                        </View>
                    </View>

                    <View style={styles.macroPreview}>
                        <MacroPill label="Protein" value="152g" width="82%" />
                        <MacroPill label="Carbs" value="218g" width="64%" />
                        <MacroPill label="Fat" value="61g" width="48%" />
                    </View>
                </View>

                <View style={styles.proofGrid}>
                    <Proof icon="scan-outline" label="Scan meals" />
                    <Proof icon="analytics-outline" label="Track trends" />
                    <Proof icon="chatbubble-ellipses-outline" label="Ask coach" />
                </View>

                <View style={styles.buttons}>
                    <Button
                        title="Start Your Plan"
                        onPress={() => router.push('signup')}
                        variant="primary"
                        size="lg"
                    />
                    <Button
                        title="I already have an account"
                        onPress={() => router.push('login')}
                        variant="ghost"
                        size="md"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function MiniMetric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
        <View style={styles.miniMetric}>
            <View style={styles.miniIcon}>
                <Ionicons name={icon} size={15} color={Colors.primary} />
            </View>
            <View style={styles.miniCopy}>
                <Text style={styles.miniLabel}>{label}</Text>
                <Text style={styles.miniValue}>{value}</Text>
            </View>
        </View>
    );
}

function MacroPill({ label, value, width }: { label: string; value: string; width: `${number}%` }) {
    return (
        <View style={styles.macroPill}>
            <View style={[styles.macroFill, { width }]} />
            <Text style={styles.macroText}>{label}</Text>
            <Text style={styles.macroValue}>{value}</Text>
        </View>
    );
}

function Proof({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
    return (
        <View style={styles.proof}>
            <Ionicons name={icon} size={18} color={Colors.primary} />
            <Text style={styles.proofText}>{label}</Text>
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
        left: -Spacing.xxl,
        right: -Spacing.xxl,
        height: 660,
    },
    topSheen: {
        position: 'absolute',
        top: 0,
        left: -Spacing.xxl,
        right: -Spacing.xxl,
        height: 220,
        opacity: 0.72,
    },
    scroll: {
        flex: 1,
        backgroundColor: '#020402',
    },
    content: {
        paddingHorizontal: Spacing.xxl,
        paddingTop: 60,
        paddingBottom: 34,
        overflow: 'hidden',
    },
    brandRow: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    logoCrop: {
        width: 360,
        height: 86,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    wordmark: {
        width: 700,
        height: 250,
    },
    hero: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    kicker: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 3,
        marginBottom: Spacing.md,
    },
    headline: {
        color: Colors.text,
        fontSize: 40,
        lineHeight: 44,
        fontWeight: FontWeight.heavy,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    tagline: {
        color: Colors.textSecondary,
        fontSize: FontSize.lg,
        textAlign: 'center',
        lineHeight: 25,
        maxWidth: 330,
    },
    dashboard: {
        backgroundColor: '#090909',
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 32,
    },
    dashboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    dashboardLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    dashboardTitle: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        marginTop: 2,
    },
    scoreBadge: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    score: {
        color: Colors.textInverse,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.heavy,
    },
    ringRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    ring: {
        width: 126,
        height: 126,
        borderRadius: 63,
        borderWidth: 12,
        borderColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
    },
    ringInner: {
        width: 86,
        height: 86,
        borderRadius: 43,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050505',
    },
    ringValue: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    ringLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        textTransform: 'uppercase',
    },
    stack: {
        flex: 1,
        gap: Spacing.lg,
    },
    miniMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    miniIcon: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniCopy: {
        flex: 1,
    },
    miniLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    miniValue: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        marginTop: 1,
    },
    macroPreview: {
        gap: Spacing.sm,
    },
    macroPill: {
        height: 34,
        borderRadius: BorderRadius.full,
        backgroundColor: '#151515',
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
    },
    macroFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: Colors.primary + '28',
        borderRadius: BorderRadius.full,
    },
    macroText: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    macroValue: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.heavy,
    },
    proofGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xxl,
    },
    proof: {
        flex: 1,
        minHeight: 70,
        borderRadius: BorderRadius.md,
        backgroundColor: '#0E0E0E',
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        padding: Spacing.sm,
    },
    proofText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        textAlign: 'center',
    },
    buttons: {
        gap: Spacing.md,
    },
});
