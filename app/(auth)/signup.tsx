import { Button, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { fetchProfile } from '@/lib/db';
import { EMAIL_CONFIRM_REDIRECT_URL, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const { setSession, setUser, setOnboarded } = useAuthStore();

    const finishSocialSignIn = async (session: Session) => {
        setSession({ access_token: session.access_token });
        const profile = await fetchProfile(session.user.id);

        if (profile) {
            setUser(profile);
        }

        if (profile?.height_cm) {
            setOnboarded(true);
            router.replace('/(tabs)');
        } else {
            setOnboarded(false);
            router.replace('/(auth)/onboarding');
        }
    };

    const handleSignUp = async () => {
        if (!acceptedTerms) {
            toast.error('Terms required', 'Please agree to the Terms before creating an account.');
            return;
        }

        if (!name.trim() || !email.trim() || !password.trim()) {
            toast.error('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            toast.error('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL,
                data: { display_name: name.trim() },
            },
        });

        if (error) {
            toast.error('Sign Up Failed', error.message);
            setMessage(error.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            setSession({ access_token: data.session.access_token });
            router.replace('/onboarding' as any);
        } else {
            const msg = 'Check your email for a confirmation link. It will bring you back to BodyPilot automatically.';
            toast.info('Check your email', msg);
            setMessage(msg);
        }
        setLoading(false);
    };

    const handleSocialSignUp = async (signIn: () => Promise<any>, label: 'Google' | 'Apple') => {
        if (!acceptedTerms) {
            toast.error('Terms required', `Please agree to the Terms before continuing with ${label}.`);
            return;
        }

        setMessage('');
        setLoading(true);
        try {
            const result = await signIn();
            const session = result?.session || (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error(`${label} sign-in did not return a session`);
            await finishSocialSignIn(session);
        } catch (e: any) {
            setMessage(e.message || `${label} sign-in failed`);
        } finally {
            setLoading(false);
        }
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

                    <TermsAcceptance accepted={acceptedTerms} onToggle={() => setAcceptedTerms((value) => !value)} />

                    <Button
                        title={acceptedTerms ? 'Create Account' : 'Accept Terms to Create Account'}
                        onPress={handleSignUp}
                        loading={loading}
                        disabled={!acceptedTerms}
                        size="lg"
                    />

                    {message ? (
                        <View style={styles.messageContainer}>
                            <Text style={styles.messageText}>{message}</Text>
                            <Button
                                title="Go to Login"
                                onPress={() => router.replace('/login' as any)}
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
                        <TouchableOpacity
                            style={[styles.socialButton, !acceptedTerms && styles.socialButtonDisabled]}
                            onPress={() => handleSocialSignUp(signInWithGoogle, 'Google')}
                            disabled={!acceptedTerms || loading}
                        >
                            <Ionicons name="logo-google" size={22} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.socialButton, !acceptedTerms && styles.socialButtonDisabled]}
                            onPress={() => handleSocialSignUp(signInWithApple, 'Apple')}
                            disabled={!acceptedTerms || loading}
                        >
                            <Ionicons name="logo-apple" size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.replace('/login' as any)}>
                        <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function TermsAcceptance({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.termsCard, accepted && styles.termsCardAccepted]}
            onPress={onToggle}
            activeOpacity={0.82}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
        >
            <View style={styles.termsTopRow}>
                <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
                    {accepted ? <Ionicons name="checkmark" size={19} color={Colors.textInverse} /> : null}
                </View>
                <View style={styles.termsCopy}>
                    <Text style={styles.termsRequired}>Required before continuing</Text>
                    <Text style={styles.termsTitle}>Accept BodyPilot&apos;s Terms</Text>
                </View>
            </View>
            <Text style={styles.termsText}>
                Tap this box to agree to the{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/terms' as any)}>
                    Terms of Service
                </Text>
                , including the no-tolerance policy for objectionable content and abusive users.
            </Text>
            <View style={styles.termsFooter}>
                <Ionicons
                    name={accepted ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={16}
                    color={accepted ? Colors.success : Colors.warning}
                />
                <Text style={[styles.termsStatus, accepted && styles.termsStatusAccepted]}>
                    {accepted ? 'Terms accepted' : 'Account buttons unlock after you accept'}
                </Text>
            </View>
        </TouchableOpacity>
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
    socialButtonDisabled: {
        opacity: 0.45,
    },
    termsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.warning,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    termsCardAccepted: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    termsTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    checkbox: {
        width: 30,
        height: 30,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: Colors.warning,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    checkboxActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    termsCopy: {
        flex: 1,
    },
    termsRequired: {
        color: Colors.warning,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.heavy,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    termsTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    termsText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    termsLink: {
        color: Colors.primary,
        fontWeight: FontWeight.bold,
    },
    termsFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    termsStatus: {
        color: Colors.warning,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    termsStatusAccepted: {
        color: Colors.success,
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
