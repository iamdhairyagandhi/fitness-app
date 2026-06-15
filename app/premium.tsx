import { Button, Card, toast } from '@/components/ui';
import {
    PREMIUM_FEATURE_COPY,
    PREMIUM_FREE_CODE,
    PREMIUM_PLANS,
    PREMIUM_PROMO_CODE,
    PremiumFeature,
    STOREKIT_IAP_ENABLED,
} from '@/constants/subscription';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscriptionStore, type PremiumPlan } from '@/stores/subscriptionStore';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HERO_FEATURES: PremiumFeature[] = [
    'ai_food_scan',
    'ai_coach',
    'ai_workout',
    'ai_meal_plan',
    'advanced_analytics',
    'apple_health',
];

export default function PremiumScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ feature?: PremiumFeature }>();
    const { isPremium, status, plan, trialEndsAt, activeUntil, activatePremium, activatePromoSubscription } = useSubscriptionStore();
    const [selectedPlan, setSelectedPlan] = React.useState<PremiumPlan>('quarterly');
    const [promoCode, setPromoCode] = React.useState('');
    const requestedFeature = params.feature && PREMIUM_FEATURE_COPY[params.feature]
        ? PREMIUM_FEATURE_COPY[params.feature]
        : null;
    const normalizedPromoCode = promoCode.trim().toUpperCase();
    const freeCodeApplied = normalizedPromoCode === PREMIUM_FREE_CODE;
    const promoApplied = selectedPlan === 'quarterly' && normalizedPromoCode === PREMIUM_PROMO_CODE;
    const selectedPlanCopy = PREMIUM_PLANS[selectedPlan];

    const handleSubscribe = () => {
        if (normalizedPromoCode && normalizedPromoCode !== PREMIUM_PROMO_CODE && normalizedPromoCode !== PREMIUM_FREE_CODE) {
            toast.error('Invalid code', 'That promo code is not active.');
            return;
        }

        if (freeCodeApplied) {
            activatePremium('yearly');
            toast.success('Premium active', 'Free Premium access has been activated.');
            router.back();
            return;
        }

        if (normalizedPromoCode === PREMIUM_PROMO_CODE && selectedPlan !== 'quarterly') {
            toast.info('3-month offer', 'This promo applies to the 3-month plan.');
            setSelectedPlan('quarterly');
            return;
        }

        if (promoApplied) {
            activatePromoSubscription('quarterly', 3);
        } else {
            activatePremium(selectedPlan);
        }

        toast.success(
            'Subscription active',
            promoApplied
                ? 'Promo applied. Your 3-month Premium subscription is active for $1.99.'
                : `${selectedPlanCopy.label} Premium subscription started.`
        );
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>BodyPilot Premium</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="sparkles" size={34} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                    Unlock AI-powered coaching
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {requestedFeature
                        ? `${requestedFeature.title} is included with Premium.`
                        : 'Turn manual tracking into personalized recommendations, automation, and deeper insights.'}
                </Text>

                {isPremium() ? (
                    <Card style={{ borderColor: colors.primary + '35' }}>
                        <View style={styles.activeRow}>
                            <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activeTitle, { color: colors.text }]}>
                                    Premium active
                                </Text>
                                <Text style={[styles.activeCopy, { color: colors.textSecondary }]}>
                                    {status === 'trialing' && trialEndsAt
                                        ? `Access ends ${new Date(trialEndsAt).toLocaleDateString()}`
                                        : activeUntil
                                            ? `Access active until ${new Date(activeUntil).toLocaleDateString()}`
                                        : `${plan ? PREMIUM_PLANS[plan].label : 'Premium'} plan enabled`}
                                </Text>
                            </View>
                        </View>
                    </Card>
                ) : null}

                <View style={styles.planRow}>
                        {(['monthly', 'quarterly', 'yearly'] as PremiumPlan[]).map((item) => {
                            const planCopy = PREMIUM_PLANS[item];
                            const selected = selectedPlan === item;
                            const showPromoPrice = item === 'quarterly' && promoApplied;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.planCard,
                                        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
                                        selected && { backgroundColor: colors.primary + '12' },
                                    ]}
                                    onPress={() => setSelectedPlan(item)}
                                    activeOpacity={0.82}
                                >
                                    {planCopy.badge ? (
                                        <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
                                            <Text style={[styles.planBadgeText, { color: colors.textInverse }]}>{planCopy.badge}</Text>
                                        </View>
                                    ) : null}
                                    <Text style={[styles.planLabel, { color: colors.text }]}>{planCopy.label}</Text>
                                    {showPromoPrice ? (
                                        <Text style={[styles.planOriginalPrice, { color: colors.textTertiary }]}>{planCopy.price}</Text>
                                    ) : null}
                                    <Text style={[styles.planPrice, { color: showPromoPrice ? colors.primary : colors.text }]}>
                                        {showPromoPrice && 'promoPrice' in planCopy ? planCopy.promoPrice : planCopy.price}
                                    </Text>
                                    <Text style={[styles.planCadence, { color: colors.textTertiary }]}>/{planCopy.cadence}</Text>
                                    <Text style={[styles.planTrial, { color: colors.primary }]}>{planCopy.trialLabel}</Text>
                                    {planCopy.savings ? <Text style={[styles.planSavings, { color: colors.textSecondary }]}>{planCopy.savings}</Text> : null}
                                </TouchableOpacity>
                            );
                        })}
                </View>

                <Card style={styles.promoCard}>
                    <View style={styles.promoHeader}>
                        <Ionicons name="ticket-outline" size={20} color={colors.primary} />
                        <Text style={[styles.promoTitle, { color: colors.text }]}>Promo code</Text>
                    </View>
                    <TextInput
                        value={promoCode}
                        onChangeText={setPromoCode}
                        placeholder="Enter code"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        style={[styles.promoInput, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: freeCodeApplied || promoApplied ? colors.primary : colors.border }]}
                    />
                    <Text style={[styles.promoHint, { color: freeCodeApplied || promoApplied ? colors.primary : colors.textTertiary }]}>
                        {freeCodeApplied
                            ? 'Free Premium code applied.'
                            : promoApplied
                                ? 'Promo applied: 3 months for $1.99.'
                                : 'Promo codes apply to eligible plans only.'}
                    </Text>
                </Card>

                <Button
                    title={isPremium() ? 'Continue' : freeCodeApplied ? 'Activate Free Premium' : promoApplied ? 'Start 3 Months for $1.99' : `Start ${selectedPlanCopy.label} Subscription`}
                    onPress={isPremium() ? () => router.back() : handleSubscribe}
                    size="lg"
                />
                {STOREKIT_IAP_ENABLED ? (
                    <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={() => toast.info('Purchases', 'Checking your App Store purchases.')}
                    >
                        <Text style={[styles.restoreText, { color: colors.textSecondary }]}>Restore purchases</Text>
                    </TouchableOpacity>
                ) : null}

                <View style={styles.featureList}>
                    {HERO_FEATURES.map((feature) => {
                        const item = PREMIUM_FEATURE_COPY[feature];
                        return (
                            <View key={feature} style={[styles.featureRow, { borderColor: colors.border }]}>
                                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '14' }]}>
                                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.featureCopy, { color: colors.textSecondary }]}>{item.description}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <Text style={[styles.footnote, { color: colors.textTertiary }]}>
                    Subscriptions are managed through your App Store account. Promo pricing applies to the 3-month plan only.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 48,
        alignItems: 'center',
    },
    heroIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
        textAlign: 'center',
        lineHeight: 40,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        textAlign: 'center',
        lineHeight: 22,
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    activeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    activeTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    activeCopy: { fontSize: FontSize.sm, marginTop: 2 },
    planRow: {
        flexDirection: 'column',
        gap: Spacing.md,
        width: '100%',
        marginTop: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    planCard: {
        minHeight: 132,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        padding: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planBadge: {
        position: 'absolute',
        top: -12,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    planBadgeText: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
    },
    planLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    planOriginalPrice: { fontSize: FontSize.sm, textDecorationLine: 'line-through', marginTop: Spacing.sm },
    planPrice: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, marginTop: Spacing.sm },
    planCadence: { fontSize: FontSize.sm },
    planTrial: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginTop: Spacing.md },
    planSavings: { fontSize: FontSize.xs, marginTop: 3 },
    promoCard: { width: '100%', marginBottom: Spacing.lg },
    promoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    promoTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    promoInput: {
        minHeight: 46,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        letterSpacing: 0,
    },
    promoHint: { fontSize: FontSize.xs, lineHeight: 17, marginTop: Spacing.sm },
    restoreButton: { paddingVertical: Spacing.md },
    restoreText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    featureList: {
        width: '100%',
        marginTop: Spacing.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    featureIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    featureCopy: { fontSize: FontSize.xs, lineHeight: 18, marginTop: 2 },
    footnote: {
        fontSize: FontSize.xs,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});
