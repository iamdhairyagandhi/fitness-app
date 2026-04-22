import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
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

    const displayName = user?.display_name || 'Athlete';
    const email = user?.email || 'user@fitfusion.app';
    const level = user?.level || 1;
    const xp = user?.xp || 0;

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
                { icon: 'person-outline' as const, label: 'Edit Profile', onPress: () => { } },
                { icon: 'fitness-outline' as const, label: 'Fitness Goals', onPress: () => { } },
                { icon: 'nutrition-outline' as const, label: 'Nutrition Targets', onPress: () => { } },
                { icon: 'body-outline' as const, label: 'Body Measurements', onPress: () => { } },
            ],
        },
        {
            title: 'Preferences',
            items: [
                { icon: 'scale-outline' as const, label: 'Units (Metric/Imperial)', onPress: () => { } },
                { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => { } },
                { icon: 'moon-outline' as const, label: 'Appearance', onPress: () => { } },
                { icon: 'language-outline' as const, label: 'Language', onPress: () => { } },
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
                                        { width: `${Math.min((xp % 1000) / 10, 100)}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.xpText}>{xp} XP</Text>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Workouts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
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

                <Text style={styles.version}>FitFusion v1.0.0</Text>
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
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
        paddingVertical: Spacing.lg,
    },

    // Profile card
    profileCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
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
    },
    userEmail: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    levelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.lg,
        width: '100%',
    },
    levelBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    levelText: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
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
    },
    statLabel: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: 2,
    },

    // Settings
    settingsGroup: {
        marginBottom: Spacing.lg,
    },
    groupTitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    },

    version: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        textAlign: 'center',
        marginTop: Spacing.xl,
        marginBottom: Spacing.lg,
    },
});
