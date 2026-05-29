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

const APP_DETAILS = [
    { label: 'Version', value: '1.0.0' },
    { label: 'App', value: 'BodyPilot' },
    { label: 'Category', value: 'Health & Fitness' },
];

export default function AboutScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>About</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Card style={{ ...styles.heroCard, borderColor: colors.primary + '35' }}>
                    <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.logoText, { color: colors.textInverse }]}>BP</Text>
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>BodyPilot</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                        A fitness companion for workout tracking, nutrition logging, progress monitoring, recovery habits, goals, and coaching tools.
                    </Text>
                </Card>

                <Card padding={0}>
                    {APP_DETAILS.map((item, index) => (
                        <View
                            key={item.label}
                            style={[
                                styles.detailRow,
                                index > 0 && styles.detailRowBorder,
                                index > 0 && { borderTopColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{item.value}</Text>
                        </View>
                    ))}
                </Card>

                <Card style={styles.copyCard}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Data stance</Text>
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                        BodyPilot is built around user-controlled health and fitness data. The app does not sell user data or use third-party advertising tracking.
                    </Text>
                </Card>
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
    heroCard: { alignItems: 'center', borderWidth: 1.5, marginTop: Spacing.md, marginBottom: Spacing.lg },
    logoMark: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    logoText: { color: Colors.textInverse, fontSize: FontSize.xl, fontWeight: FontWeight.heavy },
    heroTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.heavy },
    heroBody: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
    },
    detailRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    detailLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
    detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'right' },
    copyCard: { marginTop: Spacing.lg },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    bodyText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
