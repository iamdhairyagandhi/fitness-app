import { HEALTH_CITATIONS, type HealthCitation } from '@/constants/healthCitations';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from './ui';

type HealthSourcesCardProps = {
    title?: string;
    citations?: HealthCitation[];
};

export function HealthSourcesCard({
    title = 'Health Sources',
    citations = HEALTH_CITATIONS,
}: HealthSourcesCardProps) {
    const { colors } = useTheme();

    return (
        <Card style={[styles.card, { borderColor: colors.border }]} padding={Spacing.md} variant="outlined">
            <View style={styles.header}>
                <View style={[styles.icon, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="library-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.headerCopy}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                        References used for health and nutrition guidance.
                    </Text>
                </View>
            </View>

            {citations.map((citation) => (
                <TouchableOpacity
                    key={citation.url}
                    style={[styles.sourceRow, { borderTopColor: colors.border }]}
                    onPress={() => Linking.openURL(citation.url)}
                    activeOpacity={0.75}
                >
                    <View style={styles.sourceCopy}>
                        <Text style={[styles.sourceLabel, { color: colors.text }]}>{citation.label}</Text>
                        <Text style={[styles.sourceOrg, { color: colors.textTertiary }]}>{citation.organization}</Text>
                    </View>
                    <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
            ))}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    icon: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCopy: {
        flex: 1,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        lineHeight: 16,
        marginTop: 2,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.xs,
        marginTop: Spacing.xs,
    },
    sourceCopy: {
        flex: 1,
    },
    sourceLabel: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    sourceOrg: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        marginTop: 2,
    },
});
