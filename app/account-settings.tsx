import { Button, Card, Input, toast } from '@/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { checkUsernameAvailable, deleteCurrentAccount, setUsername, updatePhoneNumber } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user, updateUser, logout } = useAuthStore();

    // Username
    const [username, setUsernameValue] = useState(user?.username || '');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState('');

    // Phone
    const [phone, setPhone] = useState(user?.phone_number || '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const validateUsername = (val: string) => {
        if (!val.trim()) return '';
        if (val.length < 3) return 'At least 3 characters';
        if (val.length > 30) return '30 characters max';
        if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Only letters, numbers, underscores';
        return '';
    };

    const checkAvailability = useCallback(
        async (val: string) => {
            const err = validateUsername(val);
            if (err) {
                setUsernameAvailable(null);
                setUsernameError(err);
                return;
            }
            // Don't re-check if it's the same as current
            if (val.trim().toLowerCase() === user?.username?.toLowerCase()) {
                setUsernameAvailable(null);
                setUsernameError('');
                return;
            }
            setCheckingUsername(true);
            setUsernameError('');
            try {
                const avail = await checkUsernameAvailable(val);
                setUsernameAvailable(avail);
                if (!avail) setUsernameError('Already taken');
            } catch {
                setUsernameError('Could not check');
                setUsernameAvailable(null);
            } finally {
                setCheckingUsername(false);
            }
        },
        [user?.username],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.trim().length >= 3) checkAvailability(username.trim());
            else {
                setUsernameAvailable(null);
                setUsernameError('');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, checkAvailability]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const usernameChanged =
                username.trim().toLowerCase() !== (user.username || '').toLowerCase();

            if (usernameChanged && username.trim()) {
                const err = validateUsername(username.trim());
                if (err) {
                    setErrorMsg(err);
                    setSaving(false);
                    return;
                }
                await setUsername(user.id, username.trim());
            }

            const phoneChanged = phone.trim() !== (user.phone_number || '');
            if (phoneChanged) {
                await updatePhoneNumber(user.id, phone.trim());
            }

            const updates: Record<string, any> = {};
            if (usernameChanged && username.trim()) updates.username = username.trim().toLowerCase();
            if (phoneChanged) updates.phone_number = phone.trim() || null;

            if (Object.keys(updates).length > 0) {
                updateUser(updates as any);
            }

            setSuccessMsg('Account updated!');
        } catch (e: any) {
            setErrorMsg(e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        toast.confirm({
            title: 'Delete Account?',
            message: 'This permanently deletes your BodyPilot account and associated fitness, nutrition, progress, recovery, and social data.',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                setDeleting(true);
                setErrorMsg('');
                try {
                    await deleteCurrentAccount();
                    logout();
                    toast.success('Account Deleted', 'Your account deletion request is complete.');
                    router.replace('/login' as any);
                } catch (e: any) {
                    setErrorMsg(e.message || 'Failed to delete account');
                    toast.error('Delete Failed', 'Please try again or contact support.');
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Account</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveBtn, { color: colors.primary }, saving && { opacity: 0.5 }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Username */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Username</Text>
                    <Card>
                        <Input
                            label="Username"
                            placeholder="e.g. fitpro_jake"
                            value={username}
                            onChangeText={setUsernameValue}
                            autoCapitalize="none"
                            autoCorrect={false}
                            leftIcon={<Text style={[styles.atSign, { color: colors.primary }]}>@</Text>}
                            rightIcon={
                                checkingUsername ? (
                                    <Ionicons name="hourglass-outline" size={20} color={colors.textTertiary} />
                                ) : usernameAvailable === true ? (
                                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                ) : usernameAvailable === false ? (
                                    <Ionicons name="close-circle" size={20} color={colors.error} />
                                ) : null
                            }
                        />
                        {usernameError ? <Text style={[styles.error, { color: colors.error }]}>{usernameError}</Text> : null}
                        {usernameAvailable === true ? (
                            <Text style={[styles.success, { color: colors.success }]}>Available!</Text>
                        ) : null}
                        <Text style={[styles.hint, { color: colors.textTertiary }]}>
                            Others can find you by your username on the social tab.
                        </Text>
                    </Card>

                    {/* Phone */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Phone Number</Text>
                    <Card>
                        <Input
                            label="Phone Number"
                            placeholder="+1 (555) 123-4567"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            leftIcon={<Ionicons name="call-outline" size={20} color={colors.textTertiary} />}
                        />
                        <Text style={[styles.hint, { color: colors.textTertiary }]}>
                            Optional. Used for account recovery and notifications.
                        </Text>
                    </Card>

                    {/* Email (read-only) */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Email</Text>
                    <Card>
                        <View style={styles.readOnlyRow}>
                            <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
                            <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>{user?.email || '—'}</Text>
                        </View>
                        <Text style={[styles.hint, { color: colors.textTertiary }]}>Email cannot be changed here.</Text>
                    </Card>

                    {/* Connected accounts */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Accounts</Text>
                    <Card padding={0}>
                        <View style={styles.connectedRow}>
                            <View style={styles.connectedLeft}>
                                <Ionicons name="logo-google" size={22} color="#DB4437" />
                                <Text style={[styles.connectedLabel, { color: colors.text }]}>Google</Text>
                            </View>
                            <Text style={[styles.connectedStatus, { color: colors.textTertiary }]}>
                                {user?.email?.includes('gmail') ? 'Connected' : 'Not connected'}
                            </Text>
                        </View>
                        <View style={[styles.connectedRow, styles.connectedRowBorder, { borderTopColor: colors.border }]}>
                            <View style={styles.connectedLeft}>
                                <Ionicons name="logo-apple" size={22} color={colors.text} />
                                <Text style={[styles.connectedLabel, { color: colors.text }]}>Apple</Text>
                            </View>
                            <Text style={[styles.connectedStatus, { color: colors.textTertiary }]}>Not connected</Text>
                        </View>
                    </Card>

                    {/* Account deletion */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Delete Account</Text>
                    <Card>
                        <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                            Permanently delete your account and personal BodyPilot data. This action cannot be undone.
                        </Text>
                        <Button
                            title="Delete Account"
                            onPress={handleDeleteAccount}
                            variant="danger"
                            loading={deleting}
                            disabled={saving || deleting}
                            icon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
                            style={{ marginTop: Spacing.md }}
                        />
                    </Card>

                    {successMsg ? <Text style={[styles.successMsg, { color: colors.success }]}>{successMsg}</Text> : null}
                    {errorMsg ? <Text style={[styles.errorMsg, { color: colors.error }]}>{errorMsg}</Text> : null}

                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        loading={saving}
                        size="lg"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    saveBtn: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    atSign: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    error: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.xs },
    success: { color: Colors.success, fontSize: FontSize.sm, marginTop: Spacing.xs },
    hint: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.sm, lineHeight: 18 },
    readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
    readOnlyText: { color: Colors.textSecondary, fontSize: FontSize.md },
    connectedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    connectedRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    connectedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    connectedLabel: { color: Colors.text, fontSize: FontSize.md },
    connectedStatus: { color: Colors.textTertiary, fontSize: FontSize.sm },
    dangerText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    successMsg: {
        color: Colors.success,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    errorMsg: {
        color: Colors.error,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
});
