import { Button, Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignUpScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { setSession } = useAuthStore();

    const handleSignUp = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { display_name: name.trim() },
            },
        });

        if (error) {
            Alert.alert('Sign Up Failed', error.message);
            setMessage(error.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            setSession({ access_token: data.session.access_token });
            router.replace('/(auth)/onboarding');
        } else {
            const msg = 'Check your email for a confirmation link, then come back and log in.';
            Alert.alert('Check your email', msg);
            setMessage(msg);
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Start your transformation today</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Full Name"
                        placeholder="John Doe"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoComplete="name"
                        leftIcon={<Ionicons name="person-outline" size={20} color={Colors.textTertiary} />}
                    />

                    <Input
                        label="Email"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
                    />

                    <Input
                        label="Password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} />}
                    />

                    <Button
                        title="Create Account"
                        onPress={handleSignUp}
                        loading={loading}
                        size="lg"
                    />

                    {message ? (
                        <View style={styles.messageContainer}>
                            <Text style={styles.messageText}>{message}</Text>
                            <Button
                                title="Go to Login"
                                onPress={() => router.replace('/(auth)/login')}
                                variant="outline"
                                size="md"
                            />
                        </View>
                    ) : null}

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialButtons}>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-google" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-apple" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                        <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        color: Colors.text,
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.heavy,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        marginTop: Spacing.sm,
    },
    form: {
        flex: 1,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xxl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        color: Colors.textTertiary,
        fontSize: FontSize.sm,
        marginHorizontal: Spacing.md,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xxl,
    },
    footerText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    footerLink: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    messageText: {
        color: Colors.secondary,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    messageContainer: {
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
});
