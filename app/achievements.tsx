import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useRecoveryStore } from '@/stores/recoveryStore';
import type { Achievement } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Workout', 'Strength', 'Streak', 'Nutrition', 'Body', 'Milestone'];

export default function AchievementsScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { achievements, challenges } = useRecoveryStore();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [tab, setTab] = useState<'achievements' | 'challenges'>('achievements');

    const filtered = achievements.filter((a) => {
        if (selectedCategory === 'All') return true;
        return a.category === selectedCategory.toLowerCase();
    });

    const unlocked = filtered.filter((a) => a.unlocked_at);
    const locked = filtered.filter((a) => !a.unlocked_at);

    const renderAchievement = (a: Achievement) => (
        <Card
            key={a.id}
            style={StyleSheet.flatten([
                styles.achieveCard,
                a.unlocked_at ? { opacity: 1, borderColor: colors.primary, borderWidth: 1 } : {},
            ])}
        >
            <View style={styles.achieveRow}>
                <View style={[styles.achieveIconBox, { backgroundColor: a.unlocked_at ? colors.surfaceLight : colors.surfaceLight }]}>
                    <Text style={styles.achieveIcon}>{a.icon}</Text>
                </View>
                <View style={styles.achieveInfo}>
                    <Text style={[styles.achieveName, { color: a.unlocked_at ? colors.text : colors.textSecondary }]}>{a.title}</Text>
                    <Text style={[styles.achieveDesc, { color: colors.textTertiary }]}>{a.description}</Text>
                    {!a.unlocked_at && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
                                <View style={[styles.progressFill, { width: `${a.progress}%`, backgroundColor: colors.primary }]} />
                            </View>
                            <Text style={[styles.progressText, { color: colors.textTertiary }]}>{a.progress}%</Text>
                        </View>
                    )}
                </View>
                <View style={styles.achieveXP}>
                    <Text style={[styles.xpValue, { color: colors.secondary }]}>+{a.xp_reward}</Text>
                    <Text style={[styles.xpLabel, { color: colors.textTertiary }]}>XP</Text>
                </View>
            </View>
            {a.unlocked_at && (
                <Text style={[styles.unlockedDate, { color: colors.textTertiary }]}>
                    Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                </Text>
            )}
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'achievements' && { backgroundColor: colors.primary }]}
                    onPress={() => setTab('achievements')}
                >
                    <Text style={[styles.tabText, { color: tab === 'achievements' ? colors.textInverse : colors.textSecondary }]}>
                        🏆 Achievements
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'challenges' && { backgroundColor: colors.primary }]}
                    onPress={() => setTab('challenges')}
                >
                    <Text style={[styles.tabText, { color: tab === 'challenges' ? colors.textInverse : colors.textSecondary }]}>
                        ⚔️ Challenges
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === 'achievements' ? (
                <>
                    {/* Stats */}
                    <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{achievements.filter((a) => a.unlocked_at).length}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Unlocked</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{achievements.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {achievements.filter((a) => a.unlocked_at).reduce((sum, a) => sum + a.xp_reward, 0)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>XP Earned</Text>
                        </View>
                    </View>

                    {/* Categories */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.catChip,
                                    { backgroundColor: selectedCategory === cat ? colors.primary : colors.surface },
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catText, { color: selectedCategory === cat ? colors.textInverse : colors.textSecondary }]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                        {unlocked.length > 0 && (
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>✅ Unlocked ({unlocked.length})</Text>
                        )}
                        {unlocked.map(renderAchievement)}

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔒 Locked ({locked.length})</Text>
                        {locked.map(renderAchievement)}
                    </ScrollView>
                </>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {challenges.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active challenges</Text>
                        </View>
                    ) : (
                        challenges.map((c) => {
                            const pct = Math.min(100, Math.round((c.current_value / c.target_value) * 100));
                            return (
                                <Card key={c.id} style={styles.challengeCard}>
                                    <View style={styles.challengeHeader}>
                                        <Text style={[styles.challengeTitle, { color: colors.text }]}>{c.title}</Text>
                                        <View style={[styles.challengeStatus, { backgroundColor: c.status === 'completed' ? colors.success : colors.primary }]}>
                                            <Text style={[styles.challengeStatusText, { color: c.status === 'completed' ? colors.text : colors.textInverse }]}>
                                                {c.status === 'completed' ? '✓ Done' : c.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.challengeDesc, { color: colors.textSecondary }]}>{c.description}</Text>

                                    <View style={styles.challengeProgressContainer}>
                                        <View style={[styles.challengeProgressBar, { backgroundColor: colors.surfaceLight }]}>
                                            <View style={[styles.challengeProgressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                                        </View>
                                        <Text style={[styles.challengeProgressText, { color: colors.textSecondary }]}>
                                            {c.current_value}/{c.target_value} {c.unit}
                                        </Text>
                                    </View>

                                    <View style={styles.challengeFooter}>
                                        <Text style={[styles.challengeReward, { color: colors.secondary }]}>🏆 +{c.reward_xp} XP</Text>
                                        {c.participants && (
                                            <Text style={[styles.challengeParticipants, { color: colors.textTertiary }]}>
                                                👥 {c.participants.toLocaleString()} participants
                                            </Text>
                                        )}
                                    </View>
                                </Card>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    tabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4 },
    tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    tabTextActive: { color: Colors.text },

    statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg, marginHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    statItem: { alignItems: 'center' },
    statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    statLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    categories: { maxHeight: 44, marginVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, marginRight: Spacing.sm },
    catChipActive: { backgroundColor: Colors.primary },
    catText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    catTextActive: { color: Colors.text },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.lg, marginBottom: Spacing.md },

    achieveCard: { marginBottom: Spacing.md, opacity: 0.7 },
    achieveCardUnlocked: { opacity: 1, borderColor: Colors.primary, borderWidth: 1 },
    achieveRow: { flexDirection: 'row', alignItems: 'center' },
    achieveIconBox: { width: 52, height: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    achieveIconBoxUnlocked: { backgroundColor: 'rgba(108, 92, 231, 0.15)' },
    achieveIcon: { fontSize: 24 },
    achieveInfo: { flex: 1 },
    achieveName: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    achieveNameUnlocked: { color: Colors.text },
    achieveDesc: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    progressBar: { flex: 1, height: 4, backgroundColor: Colors.surfaceLight, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
    progressText: { color: Colors.textTertiary, fontSize: FontSize.xs },
    achieveXP: { alignItems: 'center', marginLeft: Spacing.md },
    xpValue: { color: Colors.secondary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    xpLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    unlockedDate: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.sm },

    challengeCard: { marginBottom: Spacing.md },
    challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    challengeTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
    challengeStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
    challengeStatusText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    challengeDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.md },
    challengeProgressContainer: { marginBottom: Spacing.md },
    challengeProgressBar: { height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
    challengeProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
    challengeProgressText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    challengeReward: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    challengeParticipants: { color: Colors.textTertiary, fontSize: FontSize.xs },

    empty: { alignItems: 'center', paddingTop: Spacing.huge },
    emptyText: { color: Colors.textTertiary, fontSize: FontSize.md },
});
