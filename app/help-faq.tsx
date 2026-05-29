import { Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUPPORT_URL = 'https://fudqcomgwnjxcqgocfuw.supabase.co/functions/v1/support';

const FAQ_ITEMS = [
    {
        question: 'How do I export my data?',
        answer: 'Go to Settings, then Data & Privacy, and choose Export My Data. BodyPilot exports workout and measurement records when local data is available.',
    },
    {
        question: 'Where do I change units or reminders?',
        answer: 'Open Settings from Profile. Units, theme, rest timer, and local reminder preferences are grouped near the top of the screen.',
    },
    {
        question: 'How do I delete my account?',
        answer: 'Open Profile, Account Settings, then Delete Account. This starts permanent account deletion for your BodyPilot data.',
    },
    {
        question: 'Why are some features marked Premium?',
        answer: 'Premium tools are included in this release. Future subscription options will be managed through the App Store if they are offered.',
    },
];

export default function HelpFaqScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    const handleContactSupport = async () => {
        try {
            const canOpen = await Linking.canOpenURL(SUPPORT_URL);
            if (!canOpen) throw new Error(`Cannot open ${SUPPORT_URL}`);
            await Linking.openURL(SUPPORT_URL);
        } catch (error) {
            console.warn('Could not open support:', error);
            toast.error('Could Not Open Support', 'Please try again later.');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Help & FAQ</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Card style={{ ...styles.heroCard, borderColor: colors.primary + '35' }}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="help-circle" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>BodyPilot support</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                        Answers for common account, data, settings, and Premium questions.
                    </Text>
                    <TouchableOpacity
                        style={[styles.supportButton, { backgroundColor: colors.primary }]}
                        onPress={handleContactSupport}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color={colors.textInverse} />
                        <Text style={[styles.supportButtonText, { color: colors.textInverse }]}>Contact Support</Text>
                    </TouchableOpacity>
                </Card>

                {FAQ_ITEMS.map((item) => (
                    <Card key={item.question} style={styles.faqCard}>
                        <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
                        <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.answer}</Text>
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
    heroBody: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
    supportButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        marginTop: Spacing.lg,
    },
    supportButtonText: { color: Colors.textInverse, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    faqCard: { marginBottom: Spacing.md },
    question: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    answer: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
