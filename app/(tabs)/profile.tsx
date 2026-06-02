import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getLevelProgress } from '@/lib/gamification';
import { imageOnlyPickerOptions, requestPhotoLibraryAccess } from '@/lib/imagePickerPermissions';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROFILE_CHARACTERS = [
    { id: 'pilot', label: 'Pilot', glyph: '▲', tint: '#9DFF00' },
    { id: 'power', label: 'Power', glyph: '⚡', tint: '#38BDF8' },
    { id: 'focus', label: 'Focus', glyph: '◆', tint: '#A78BFA' },
    { id: 'flame', label: 'Fire', glyph: '🔥', tint: '#FF6B35' },
    { id: 'iron', label: 'Iron', glyph: '🏋️', tint: '#F8FAFC' },
    { id: 'runner', label: 'Run', glyph: '🏃', tint: '#34D399' },
    { id: 'apple', label: 'Fuel', glyph: '🍏', tint: '#84CC16' },
    { id: 'star', label: 'Star', glyph: '✦', tint: '#FACC15' },
];

const CHARACTER_PREFIX = 'character:';
const HELP_URL = 'https://iamdhairyagandhi.github.io/fitness-app/help/';
const FEEDBACK_URL = 'https://iamdhairyagandhi.github.io/fitness-app/feedback/';
const PRIVACY_POLICY_URL = 'https://iamdhairyagandhi.github.io/fitness-app/privacy/';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user, logout, updateUser } = useAuthStore();
    const { recentWorkouts, personalRecords } = useWorkoutStore();
    const [characterPickerOpen, setCharacterPickerOpen] = useState(false);

    const displayName = user?.display_name || 'Athlete';
    const email = user?.email || 'user@bodypilot.app';
    const usernameDisplay = user?.username ? `@${user.username}` : null;
    const avatarUrl = user?.avatar_url || null;
    const selectedCharacter = useMemo(() => {
        if (!avatarUrl?.startsWith(CHARACTER_PREFIX)) return null;
        const id = avatarUrl.replace(CHARACTER_PREFIX, '');
        return PROFILE_CHARACTERS.find((character) => character.id === id) || PROFILE_CHARACTERS[0];
    }, [avatarUrl]);
    const level = user?.level || 1;
    const xp = user?.xp || 0;
    const levelProgress = getLevelProgress(xp);
    const workoutCount = user?.workouts_completed || recentWorkouts.length;
    const streakCount = user?.streak_count || 0;
    const prCount = personalRecords.length;

    const handleLogout = () => {
        toast.confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            confirmLabel: 'Sign Out',
            destructive: true,
            onConfirm: async () => {
                await supabase.auth.signOut();
                logout();
                router.replace('/(auth)');
            },
        });
    };

    const handlePickPhoto = async () => {
        const hasAccess = await requestPhotoLibraryAccess();
        if (!hasAccess) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            ...imageOnlyPickerOptions,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (result.canceled || !result.assets[0]?.uri) return;

        updateUser({ avatar_url: result.assets[0].uri });
        toast.success('Profile updated', 'Your profile photo has been saved.');
    };

    const handleSelectCharacter = (characterId: string) => {
        updateUser({ avatar_url: `${CHARACTER_PREFIX}${characterId}` });
        setCharacterPickerOpen(false);
        toast.success('Profile updated', 'Your profile character has been saved.');
    };

    const handleRemoveAvatar = () => {
        updateUser({ avatar_url: null });
        toast.success('Profile updated', 'Your avatar has been removed.');
    };

    const handleOpenUrl = async (url: string, label: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) throw new Error(`Cannot open ${url}`);
            await Linking.openURL(url);
        } catch (error) {
            console.warn(`Could not open ${label}:`, error);
            toast.error('Could Not Open Link', `Please try ${label} again later.`);
        }
    };

    const settingsGroups = [
        {
            title: 'Profile & Account',
            items: [
                { icon: 'key-outline' as const, label: 'Account Details', description: 'Username, phone, email, connected accounts, account safety', onPress: () => router.push('/account-settings' as any) },
                { icon: 'sparkles-outline' as const, label: 'BodyPilot Premium', description: 'Subscription, trial, and AI feature access', onPress: () => router.push('/premium' as any) },
            ],
        },
        {
            title: 'Settings & Preferences',
            items: [
                { icon: 'settings-outline' as const, label: 'App Settings', description: 'Units, rest timer, theme, colors, notifications', onPress: () => router.push('/settings') },
                { icon: 'options-outline' as const, label: 'Customize Macros', description: 'Calories, protein, carbs, fat, and water targets', onPress: () => router.push('/customize-macros' as any) },
            ],
        },
        {
            title: 'Health & Planning',
            items: [
                { icon: 'fitness-outline' as const, label: 'Fitness Goals', description: 'Create or update your active goals', onPress: () => router.push('/progress/create-goal') },
                { icon: 'body-outline' as const, label: 'Body Measurements', description: 'Weight and body measurement tracking', onPress: () => router.push('/progress/measurements') },
                { icon: 'nutrition-outline' as const, label: 'Diet Preferences', description: 'Diet style, restrictions, and meal planning context', onPress: () => router.push('/nutrition/diet-settings') },
                { icon: 'watch-outline' as const, label: 'Wearable Devices', description: 'Apple Health and activity sync', onPress: () => router.push('/health') },
                { icon: 'analytics-outline' as const, label: 'Analytics', description: 'Progress trends and performance reports', onPress: () => router.push('/analytics') },
                { icon: 'trophy-outline' as const, label: 'Achievements', description: 'Badges and consistency milestones', onPress: () => router.push('/achievements') },
            ],
        },
        {
            title: 'Support',
            items: [
                { icon: 'help-circle-outline' as const, label: 'Help & FAQ', description: 'Answers to common setup and tracking questions', onPress: () => handleOpenUrl(HELP_URL, 'help') },
                { icon: 'chatbubble-outline' as const, label: 'Send Feedback', description: 'Report an issue or request an improvement', onPress: () => handleOpenUrl(FEEDBACK_URL, 'feedback') },
                { icon: 'document-text-outline' as const, label: 'Privacy Policy', description: 'How BodyPilot handles your data', onPress: () => handleOpenUrl(PRIVACY_POLICY_URL, 'privacy policy') },
                { icon: 'information-circle-outline' as const, label: 'About BodyPilot', description: 'Version, product info, and app details', onPress: () => router.push('/about' as any) },
            ],
        },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

                {/* Profile Card */}
                <Card style={styles.profileCard}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                        {selectedCharacter ? (
                            <Text style={[styles.characterGlyph, { color: selectedCharacter.tint }]}>
                                {selectedCharacter.glyph}
                            </Text>
                        ) : avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.avatarActions}>
                        <TouchableOpacity
                            style={[styles.avatarAction, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                            onPress={handlePickPhoto}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="image-outline" size={16} color={colors.primary} />
                            <Text style={[styles.avatarActionText, { color: colors.text }]}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.avatarAction, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                            onPress={() => setCharacterPickerOpen(true)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="happy-outline" size={16} color={colors.primary} />
                            <Text style={[styles.avatarActionText, { color: colors.text }]}>Character</Text>
                        </TouchableOpacity>
                        {avatarUrl ? (
                            <TouchableOpacity
                                style={[styles.avatarAction, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                                onPress={handleRemoveAvatar}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="trash-outline" size={16} color={colors.error} />
                                <Text style={[styles.avatarActionText, { color: colors.text }]}>Remove</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
                    {usernameDisplay ? (
                        <Text style={[styles.usernameText, { color: colors.textTertiary }]}>{usernameDisplay}</Text>
                    ) : null}
                    <Text style={[styles.userEmail, { color: colors.textTertiary }]}>{email}</Text>

                    {/* Level & XP */}
                    <View style={styles.levelContainer}>
                        <View style={[styles.levelBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.levelText, { color: colors.primary }]}>Level {level}</Text>
                        </View>
                        <View style={styles.xpBar}>
                            <View style={[styles.xpBarBg, { backgroundColor: colors.surfaceLight }]}>
                                <View
                                    style={[
                                        styles.xpBarFill,
                                        { width: `${levelProgress}%`, backgroundColor: colors.primary },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.xpText, { color: colors.textSecondary }]}>{xp} XP</Text>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{workoutCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Workouts</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{streakCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Day Streak</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{prCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>PRs</Text>
                        </View>
                    </View>
                </Card>

                {/* Settings Groups */}
                {settingsGroups.map((group) => (
                    <View key={group.title} style={styles.settingsGroup}>
                        <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{group.title}</Text>
                        <Card padding={0}>
                            {group.items.map((item, index) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.settingsRow,
                                        index < group.items.length - 1 && styles.settingsRowBorder,
                                        index < group.items.length - 1 && { borderBottomColor: colors.border },
                                    ]}
                                    onPress={item.onPress}
                                    activeOpacity={0.6}
                                >
                                    <View style={[styles.settingsIconWrap, { backgroundColor: colors.surfaceLight }]}>
                                        <Ionicons name={item.icon} size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.settingsCopy}>
                                        <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
                                        <Text style={[styles.settingsDescription, { color: colors.textTertiary }]}>{item.description}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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

                <Text style={[styles.version, { color: colors.textTertiary }]}>BodyPilot v4.0.0 (Phase 4)</Text>
            </ScrollView>

            <Modal
                transparent
                visible={characterPickerOpen}
                animationType="fade"
                onRequestClose={() => setCharacterPickerOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.characterSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.characterHeader}>
                            <View>
                                <Text style={[styles.characterTitle, { color: colors.text }]}>Choose Character</Text>
                                <Text style={[styles.characterSubtitle, { color: colors.textSecondary }]}>
                                    Pick a profile style that fits your training mood.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.modalClose, { backgroundColor: colors.surfaceLight }]}
                                onPress={() => setCharacterPickerOpen(false)}
                            >
                                <Ionicons name="close" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.characterGrid}>
                            {PROFILE_CHARACTERS.map((character) => {
                                const active = selectedCharacter?.id === character.id;
                                return (
                                    <TouchableOpacity
                                        key={character.id}
                                        style={[
                                            styles.characterOption,
                                            { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                                            active && { borderColor: colors.primary },
                                        ]}
                                        onPress={() => handleSelectCharacter(character.id)}
                                        activeOpacity={0.82}
                                    >
                                        <View style={[styles.characterPreview, { backgroundColor: colors.background }]}>
                                            <Text style={[styles.characterPreviewGlyph, { color: character.tint }]}>
                                                {character.glyph}
                                            </Text>
                                        </View>
                                        <Text style={[styles.characterLabel, { color: colors.textSecondary }]}>
                                            {character.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: Colors.text,
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.heavy,
    },
    characterGlyph: {
        fontSize: 38,
        fontWeight: FontWeight.heavy,
    },
    avatarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    avatarAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    avatarActionText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
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
    usernameText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        marginTop: 2,
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
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    settingsIconWrap: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsCopy: {
        flex: 1,
    },
    settingsLabel: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.1,
    },
    settingsDescription: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        lineHeight: 17,
        marginTop: 3,
    },

    version: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        textAlign: 'center',
        marginTop: Spacing.xxl,
        marginBottom: Spacing.lg,
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.62)',
        padding: Spacing.lg,
    },
    characterSheet: {
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    characterHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    characterTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    characterSubtitle: {
        fontSize: FontSize.sm,
        marginTop: 4,
        maxWidth: 250,
    },
    modalClose: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    characterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    characterOption: {
        width: '23%',
        minWidth: 68,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        gap: 6,
    },
    characterPreview: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    characterPreviewGlyph: {
        fontSize: 24,
        fontWeight: FontWeight.heavy,
    },
    characterLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.semibold,
    },
});
