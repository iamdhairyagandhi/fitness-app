import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { getLevelProgress } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();
    const { recentWorkouts, personalRecords } = useWorkoutStore();

    const displayName = user?.display_name || 'Athlete';
    const email = user?.email || 'user@fitfusion.app';
    const level = user?.level || 1;
    const xp = user?.xp || 0;
    const levelProgress = getLevelProgress(xp);
    const workoutCount = user?.workouts_completed || recentWorkouts.length;
    const streakCount = user?.streak_count || 0;
    const prCount = personalRecords.length;

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    logout();
                    router.replace('/(auth)');
                },
            },
        ]);
    };

    const settingsGroups = [
        {
            title: 'Account',
            items: [
                { icon: 'person-outline' as const, label: 'Edit Profile', onPress: () => router.push('/settings') },
                { icon: 'fitness-outline' as const, label: 'Fitness Goals', onPress: () => router.push('/progress/create-goal') },
                { icon: 'nutrition-outline' as const, label: 'Nutrition Targets', onPress: () => router.push('/nutrition/diet-settings') },
                { icon: 'body-outline' as const, label: 'Body Measurements', onPress: () => router.push('/progress/measurements') },
            ],
        },
        {
            title: 'Preferences',
            items: [
                { icon: 'scale-outline' as const, label: 'Units & Settings', onPress: () => router.push('/settings') },
                { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => router.push('/settings') },
                { icon: 'trophy-outline' as const, label: 'Achievements', onPress: () => router.push('/achievements') },
                { icon: 'analytics-outline' as const, label: 'Analytics', onPress: () => router.push('/analytics') },
            ],
        },
        {
            title: 'Integrations',
            items: [
                { icon: 'watch-outline' as const, label: 'Wearable Devices', onPress: () => { } },
                { icon: 'heart-outline' as const, label: 'Apple Health / Google Fit', onPress: () => { } },
            ],
        },
        {
            title: 'Support',
            items: [
                { icon: 'help-circle-outline' as const, label: 'Help & FAQ', onPress: () => { } },
                { icon: 'chatbubble-outline' as const, label: 'Send Feedback', onPress: () => { } },
                { icon: 'document-text-outline' as const, label: 'Privacy Policy', onPress: () => { } },
                { icon: 'information-circle-outline' as const, label: 'About', onPress: () => { } },
            ],
        },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Profile</Text>

                {/* Profile Card */}
                <Card style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{email}</Text>

                    {/* Level & XP */}
                    <View style={styles.levelContainer}>
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>Level {level}</Text>
                        </View>
                        <View style={styles.xpBar}>
                            <View style={styles.xpBarBg}>
                                <View
                                    style={[
                                        styles.xpBarFill,
                                        { width: `${levelProgress}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.xpText}>{xp} XP</Text>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{workoutCount}</Text>
                            <Text style={styles.statLabel}>Workouts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{streakCount}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{prCount}</Text>
                            <Text style={styles.statLabel}>PRs</Text>
                        </View>
                    </View>
                </Card>

                {/* Settings Groups */}
                {settingsGroups.map((group) => (
                    <View key={group.title} style={styles.settingsGroup}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        <Card padding={0}>
                            {group.items.map((item, index) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.settingsRow,
                                        index < group.items.length - 1 && styles.settingsRowBorder,
                                    ]}
                                    onPress={item.onPress}
                                    activeOpacity={0.6}
                                >
                                    <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                                    <Text style={styles.settingsLabel}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </Card>
                    </View>
                ))}

                {/* Sign Out */}
                <Button
                    title="Sign Out"
                    onPress={handleLogout}
                    variant="danger"
                    style={{ marginTop: Spacing.lg }}
                />

                <Text style={styles.version}>FitFusion v4.0.0 (Phase 4)</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        paddingVertical: Spacing.xl,
        letterSpacing: -0.3,
    },

    // Profile card
    profileCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    avatarText: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    userName: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.2,
    },
    userEmail: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 4,
    },
    levelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.xl,
        width: '100%',
    },
    levelBadge: {
        backgroundColor: Colors.primary + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    levelText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.3,
    },
    xpBar: {
        flex: 1,
        gap: 4,
    },
    xpBarBg: {
        height: 6,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
    },
    xpText: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: Spacing.xxl,
        width: '100%',
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.border,
    },
    statValue: {
        color: Colors.text,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.3,
    },
    statLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        marginTop: 4,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        fontWeight: FontWeight.medium,
    },

    // Settings
    settingsGroup: {
        marginBottom: Spacing.lg,
    },
    groupTitle: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.semibold,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    settingsLabel: {
        flex: 1,
        color: Colors.text,
        fontSize: FontSize.md,
        letterSpacing: 0.1,
    },

    version: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        textAlign: 'center',
        marginTop: Spacing.xxl,
        marginBottom: Spacing.lg,
        letterSpacing: 0.5,
    },
});
