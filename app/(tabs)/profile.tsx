import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getLevelProgress } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Image,
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
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.info('Permission needed', 'Allow photo library access to choose a profile photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    const settingsGroups = [
        {
            title: 'Account',
            items: [
                { icon: 'person-outline' as const, label: 'Edit Profile', onPress: () => router.push('/settings') },
                { icon: 'key-outline' as const, label: 'Account Settings', onPress: () => router.push('/account-settings' as any) },
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
                { icon: 'heart-outline' as const, label: 'Apple Health / Google Fit', onPress: () => router.push('/health') },
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
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{workoutCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Workouts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{streakCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Day Streak</Text>
                        </View>
                        <View style={styles.statDivider} />
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
                                    <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                                    <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
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

                <Text style={styles.version}>BodyPilot v4.0.0 (Phase 4)</Text>
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
