import { Card } from '@/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TERMS_SECTIONS = [
    {
        title: 'Use of BodyPilot',
        body: 'BodyPilot helps you record and understand fitness, nutrition, recovery, and progress information. You are responsible for the information you enter and for choosing whether suggestions fit your situation.',
    },
    {
        title: 'Health information',
        body: 'BodyPilot is not a medical device and does not replace professional medical advice, diagnosis, or treatment. Talk with a qualified professional before starting a new fitness, nutrition, supplement, or recovery plan.',
    },
    {
        title: 'Accounts and data',
        body: 'Keep your sign-in information secure. You may export supported local data from Settings and request account deletion from Account Settings.',
    },
    {
        title: 'Subscriptions',
        body: 'Premium features may require an active subscription. Subscription availability, renewal, and cancellation are handled through the applicable app marketplace.',
    },
    {
        title: 'Acceptable use',
        body: 'Do not misuse the app, attempt to disrupt service, reverse engineer protected parts of the product, or upload content that infringes rights, violates law, harasses others, or is sexually explicit, hateful, threatening, abusive, spam, or otherwise objectionable.',
    },
    {
        title: 'Community safety',
        body: 'BodyPilot has no tolerance for objectionable content or abusive users. Users can report objectionable posts, hide posts, and block abusive users from community surfaces. We may remove content, restrict accounts, or terminate access for violations.',
    },
];

export default function TermsScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Terms</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Card style={{ ...styles.heroCard, borderColor: colors.primary + '35' }}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Terms of Service</Text>
                    <Text style={[styles.updatedText, { color: colors.textTertiary }]}>Last updated May 24, 2026</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                        These terms summarize the rules for using BodyPilot and its fitness, nutrition, recovery, progress, AI, and social features.
                    </Text>
                </Card>

                {TERMS_SECTIONS.map((section) => (
                    <Card key={section.title} style={styles.termCard}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{section.body}</Text>
                    </Card>
                ))}
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
    headerButton: { width: 36, height: 36, justifyContent: 'center' },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    heroCard: { borderWidth: 1.5, marginTop: Spacing.md, marginBottom: Spacing.lg },
    heroIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    heroTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    updatedText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        marginTop: Spacing.xs,
        textTransform: 'uppercase',
    },
    heroBody: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.md },
    termCard: { marginBottom: Spacing.md },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    bodyText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
