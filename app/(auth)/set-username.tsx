import { Button, Input } from '@/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { checkUsernameAvailable, setUsername } from '@/lib/auth';
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
    View,
} from 'react-native';

export default function SetUsernameScreen() {
    const { user, updateUser } = useAuthStore();
    const [username, setUsernameValue] = useState('');
    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const validate = (val: string) => {
        if (val.length < 3) return 'Username must be at least 3 characters';
        if (val.length > 30) return 'Username must be 30 characters or less';
        if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Only letters, numbers, and underscores';
        return '';
    };

    const checkAvailability = useCallback(async (val: string) => {
        const err = validate(val);
        if (err) {
            setAvailable(null);
            setErrorMsg(err);
            return;
        }
        setChecking(true);
        setErrorMsg('');
        try {
            const isAvailable = await checkUsernameAvailable(val);
            setAvailable(isAvailable);
            if (!isAvailable) setErrorMsg('Username is already taken');
        } catch {
            setErrorMsg('Could not check availability');
            setAvailable(null);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.trim().length >= 3) {
                checkAvailability(username.trim());
            } else {
                setAvailable(null);
                setErrorMsg('');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, checkAvailability]);

    const handleSave = async () => {
        if (!user?.id || !available) return;
        setSaving(true);
        setErrorMsg('');
        try {
            await setUsername(user.id, username.trim());
            updateUser({ username: username.trim().toLowerCase() } as any);
            router.back();
        } catch (e: any) {
            setErrorMsg(e.message || 'Failed to set username');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Choose a Username</Text>
                    <Text style={styles.subtitle}>
                        This is how others will find you. You can change it later.
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <Input
                        label="Username"
                        placeholder="e.g. fitpro_jake"
                        value={username}
                        onChangeText={setUsernameValue}
                        autoCapitalize="none"
                        autoCorrect={false}
                        leftIcon={<Text style={styles.atSign}>@</Text>}
                        rightIcon={
                            checking ? (
                                <Ionicons name="hourglass-outline" size={20} color={Colors.textTertiary} />
                            ) : available === true ? (
                                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                            ) : available === false ? (
                                <Ionicons name="close-circle" size={20} color={Colors.error} />
                            ) : null
                        }
                    />
                    {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
                    {available === true ? (
                        <Text style={styles.success}>Username is available!</Text>
                    ) : null}
                </View>

                <Button
                    title="Set Username"
                    onPress={handleSave}
                    loading={saving}
                    disabled={!available || saving}
                    size="lg"
                />

                <Button
                    title="Skip for now"
                    onPress={() => router.back()}
                    variant="ghost"
                    size="md"
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: { marginBottom: Spacing.xxxl },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        lineHeight: 22,
    },
    inputContainer: { marginBottom: Spacing.xl },
    atSign: {
        color: Colors.primary,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    error: {
        color: Colors.error,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
    },
    success: {
        color: Colors.success,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
    },
});
