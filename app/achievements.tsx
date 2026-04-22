import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
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
        <Card key={a.id} style={StyleSheet.flatten([styles.achieveCard, a.unlocked_at ? styles.achieveCardUnlocked : {}])}>
            <View style={styles.achieveRow}>
                <View style={[styles.achieveIconBox, a.unlocked_at && styles.achieveIconBoxUnlocked]}>
                    <Text style={styles.achieveIcon}>{a.icon}</Text>
                </View>
                <View style={styles.achieveInfo}>
                    <Text style={[styles.achieveName, a.unlocked_at && styles.achieveNameUnlocked]}>{a.title}</Text>
                    <Text style={styles.achieveDesc}>{a.description}</Text>
                    {!a.unlocked_at && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${a.progress}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{a.progress}%</Text>
                        </View>
                    )}
                </View>
                <View style={styles.achieveXP}>
                    <Text style={styles.xpValue}>+{a.xp_reward}</Text>
                    <Text style={styles.xpLabel}>XP</Text>
                </View>
            </View>
            {a.unlocked_at && (
                <Text style={styles.unlockedDate}>
                    Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                </Text>
            )}
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Achievements</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'achievements' && styles.tabActive]}
                    onPress={() => setTab('achievements')}
                >
                    <Text style={[styles.tabText, tab === 'achievements' && styles.tabTextActive]}>
                        🏆 Achievements
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'challenges' && styles.tabActive]}
                    onPress={() => setTab('challenges')}
                >
                    <Text style={[styles.tabText, tab === 'challenges' && styles.tabTextActive]}>
                        ⚔️ Challenges
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === 'achievements' ? (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{achievements.filter((a) => a.unlocked_at).length}</Text>
                            <Text style={styles.statLabel}>Unlocked</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{achievements.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {achievements.filter((a) => a.unlocked_at).reduce((sum, a) => sum + a.xp_reward, 0)}
                            </Text>
                            <Text style={styles.statLabel}>XP Earned</Text>
                        </View>
                    </View>

                    {/* Categories */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                        {unlocked.length > 0 && (
                            <Text style={styles.sectionTitle}>✅ Unlocked ({unlocked.length})</Text>
                        )}
                        {unlocked.map(renderAchievement)}

                        <Text style={styles.sectionTitle}>🔒 Locked ({locked.length})</Text>
                        {locked.map(renderAchievement)}
                    </ScrollView>
                </>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {challenges.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No active challenges</Text>
                        </View>
                    ) : (
                        challenges.map((c) => {
                            const pct = Math.min(100, Math.round((c.current_value / c.target_value) * 100));
                            return (
                                <Card key={c.id} style={styles.challengeCard}>
                                    <View style={styles.challengeHeader}>
                                        <Text style={styles.challengeTitle}>{c.title}</Text>
                                        <View style={[styles.challengeStatus, { backgroundColor: c.status === 'completed' ? Colors.success : Colors.primary }]}>
                                            <Text style={styles.challengeStatusText}>
                                                {c.status === 'completed' ? '✓ Done' : c.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.challengeDesc}>{c.description}</Text>

                                    <View style={styles.challengeProgressContainer}>
                                        <View style={styles.challengeProgressBar}>
                                            <View style={[styles.challengeProgressFill, { width: `${pct}%` }]} />
                                        </View>
                                        <Text style={styles.challengeProgressText}>
                                            {c.current_value}/{c.target_value} {c.unit}
                                        </Text>
                                    </View>

                                    <View style={styles.challengeFooter}>
                                        <Text style={styles.challengeReward}>🏆 +{c.reward_xp} XP</Text>
                                        {c.participants && (
                                            <Text style={styles.challengeParticipants}>
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
