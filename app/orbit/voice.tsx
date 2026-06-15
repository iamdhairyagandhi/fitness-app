/**
 * Orbit Voice — full-screen conversational voice mode powered by
 * the OpenAI Realtime API over WebRTC.
 *
 * Tap the orb to connect. The orb pulses with audio level. Live transcript
 * scrolls underneath. Tool activity appears as ephemeral chips when Orbit
 * logs water/food/workouts/etc. Background → mute + 30s grace, then disconnect.
 */

import { toast } from '@/components/ui';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { OrbitRealtimeSession } from '@/lib/orbit/realtime';
import type {
    OrbitConnectionState,
    OrbitRealtimeError,
    OrbitToolActivity,
    OrbitTranscriptEntry,
} from '@/lib/orbit/types';
import { isUserAuthenticatedForVoice } from '@/lib/orbit/tools';
import { useStoresHydrated } from '@/lib/storesHydrated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Animated,
    AppState,
    type AppStateStatus,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKGROUND_GRACE_MS = 30_000;
const MAX_SESSION_MS = 10 * 60 * 1000;

type TranscriptMap = Record<string, OrbitTranscriptEntry>;

const stateLabel: Record<OrbitConnectionState, string> = {
    idle: 'Tap to talk',
    requesting_token: 'Connecting…',
    requesting_mic: 'Requesting mic…',
    negotiating: 'Negotiating…',
    connected: 'Listening',
    disconnecting: 'Hanging up…',
    error: 'Reconnect',
};

export default function OrbitVoiceScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const storesHydrated = useStoresHydrated();

    const [state, setState] = React.useState<OrbitConnectionState>('idle');
    const [muted, setMuted] = React.useState(false);
    const [transcripts, setTranscripts] = React.useState<TranscriptMap>({});
    const [transcriptOrder, setTranscriptOrder] = React.useState<string[]>([]);
    const [activity, setActivity] = React.useState<OrbitToolActivity | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [speaking, setSpeaking] = React.useState(false);

    const sessionRef = React.useRef<OrbitRealtimeSession | null>(null);
    const pulseAnim = React.useRef(new Animated.Value(0)).current;
    const scrollRef = React.useRef<ScrollView>(null);
    const backgroundTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const activityTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const isConnected = state === 'connected';
    const isConnecting = state === 'requesting_token' || state === 'requesting_mic' || state === 'negotiating';

    // ---------------------------------------------------------------------
    // Pulse animation tied to speaking state
    // ---------------------------------------------------------------------
    React.useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: speaking ? 1 : isConnected ? 0.6 : 0.2,
                    duration: speaking ? 320 : 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: speaking ? 0.6 : isConnected ? 0.3 : 0,
                    duration: speaking ? 320 : 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim, speaking, isConnected]);

    const stopSession = React.useCallback(async () => {
        const session = sessionRef.current;
        sessionRef.current = null;
        if (sessionTimerRef.current) {
            clearTimeout(sessionTimerRef.current);
            sessionTimerRef.current = null;
        }
        if (backgroundTimerRef.current) {
            clearTimeout(backgroundTimerRef.current);
            backgroundTimerRef.current = null;
        }
        try {
            await session?.disconnect();
        } catch {
            // best-effort
        }
        setSpeaking(false);
        setMuted(false);
    }, []);

    const startSession = React.useCallback(async () => {
        if (sessionRef.current) return;
        if (!isUserAuthenticatedForVoice()) {
            setErrorMessage('Sign in to use Orbit Voice.');
            return;
        }
        if (!storesHydrated) {
            setErrorMessage('Loading your data — try again in a moment.');
            return;
        }
        setErrorMessage(null);
        setTranscripts({});
        setTranscriptOrder([]);
        setActivity(null);

        const session = new OrbitRealtimeSession();
        sessionRef.current = session;

        session.on('state', (next) => {
            setState(next);
            if (next === 'idle' || next === 'error') {
                setSpeaking(false);
            }
        });
        session.on('error', (err: OrbitRealtimeError) => {
            setErrorMessage(err.message);
            toast.error('Voice error', err.message.slice(0, 120));
        });
        session.on('transcript', (entry) => {
            setTranscripts((prev) => ({ ...prev, [entry.id]: entry }));
            setTranscriptOrder((prev) => (prev.includes(entry.id) ? prev : [...prev, entry.id]));
        });
        session.on('tool', (act) => {
            setActivity(act);
            if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
            activityTimerRef.current = setTimeout(() => setActivity(null), 4000);
            if (!act.success) {
                toast.info(`Couldn't ${act.name.replace(/_/g, ' ')}`, act.summary);
            }
        });
        session.on('speakingStarted', () => setSpeaking(true));
        session.on('speakingStopped', () => setSpeaking(false));

        try {
            await session.connect();
            sessionTimerRef.current = setTimeout(() => {
                toast.info('Voice session ended', 'Tap to restart Orbit.');
                void stopSession();
            }, MAX_SESSION_MS);
        } catch {
            // Error already surfaced via on('error') / on('state').
        }
    }, [storesHydrated, stopSession]);

    // ---------------------------------------------------------------------
    // App background → mute, then disconnect after grace.
    // ---------------------------------------------------------------------
    React.useEffect(() => {
        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'active') {
                if (backgroundTimerRef.current) {
                    clearTimeout(backgroundTimerRef.current);
                    backgroundTimerRef.current = null;
                }
                sessionRef.current?.setMuted(false);
                setMuted(false);
            } else {
                sessionRef.current?.setMuted(true);
                setMuted(true);
                if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
                backgroundTimerRef.current = setTimeout(() => {
                    void stopSession();
                }, BACKGROUND_GRACE_MS);
            }
        });
        return () => sub.remove();
    }, [stopSession]);

    // Cleanup on unmount.
    React.useEffect(() => () => { void stopSession(); }, [stopSession]);

    const handleToggle = () => {
        if (sessionRef.current && (isConnected || isConnecting)) {
            void stopSession();
        } else {
            void startSession();
        }
    };

    const handleMuteToggle = () => {
        const session = sessionRef.current;
        if (!session) return;
        const next = !muted;
        session.setMuted(next);
        setMuted(next);
    };

    const handleInterrupt = () => {
        sessionRef.current?.interrupt();
    };

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1.18],
    });
    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.55],
    });

    const orbColor = isConnected
        ? speaking ? colors.primary : colors.primaryLight ?? colors.primary
        : colors.surfaceElevated ?? colors.surface;

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.back()}
                    accessibilityLabel="Close voice"
                >
                    <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Orbit Voice</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{stateLabel[state]}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/nutrition/nlp-food-log' as never)}
                    accessibilityLabel="Switch to text chat"
                >
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.orbWrap}>
                <Animated.View
                    style={[
                        styles.orbHalo,
                        {
                            backgroundColor: colors.primary,
                            opacity: pulseOpacity,
                            transform: [{ scale: pulseScale }],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.orbHalo,
                        styles.orbHaloOuter,
                        {
                            backgroundColor: colors.primary,
                            opacity: Animated.multiply(pulseOpacity, 0.5),
                            transform: [{ scale: Animated.multiply(pulseScale, 1.3) }],
                        },
                    ]}
                />
                <TouchableOpacity
                    style={[styles.orb, { backgroundColor: orbColor, borderColor: colors.primary }]}
                    onPress={handleToggle}
                    disabled={state === 'disconnecting'}
                    activeOpacity={0.85}
                    accessibilityLabel={isConnected ? 'End Orbit Voice' : 'Start Orbit Voice'}
                >
                    <Ionicons
                        name={isConnected ? 'stop' : isConnecting ? 'ellipsis-horizontal' : 'mic'}
                        size={56}
                        color={isConnected ? colors.background : colors.primary}
                    />
                </TouchableOpacity>
            </View>

            {activity ? (
                <View
                    style={[
                        styles.activityChip,
                        {
                            backgroundColor: activity.success ? colors.primary + '22' : colors.warning + '22',
                            borderColor: activity.success ? colors.primary + '55' : colors.warning + '55',
                        },
                    ]}
                >
                    <Ionicons
                        name={activity.success ? 'checkmark-circle' : 'alert-circle'}
                        size={16}
                        color={activity.success ? colors.primary : colors.warning}
                    />
                    <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={1}>
                        {activity.summary}
                    </Text>
                </View>
            ) : null}

            <ScrollView
                ref={scrollRef}
                style={styles.transcript}
                contentContainerStyle={styles.transcriptContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {transcriptOrder.length === 0 && state === 'idle' ? (
                    <View style={[styles.helperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.helperTitle, { color: colors.text }]}>Try saying…</Text>
                        {EXAMPLE_PHRASES.map((phrase) => (
                            <Text key={phrase} style={[styles.helperLine, { color: colors.textSecondary }]}>
                                • {phrase}
                            </Text>
                        ))}
                    </View>
                ) : null}

                {transcriptOrder.map((id) => {
                    const entry = transcripts[id];
                    if (!entry || !entry.text.trim()) return null;
                    const isAssistant = entry.role === 'assistant';
                    return (
                        <View
                            key={id}
                            style={[
                                styles.bubble,
                                {
                                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                                    backgroundColor: isAssistant ? colors.surface : colors.primary + '22',
                                    borderColor: isAssistant ? colors.border : colors.primary + '55',
                                },
                            ]}
                        >
                            <Text style={[styles.bubbleText, { color: colors.text }]}>{entry.text}</Text>
                        </View>
                    );
                })}

                {errorMessage ? (
                    <View
                        style={[
                            styles.bubble,
                            styles.errorBubble,
                            { backgroundColor: colors.warning + '15', borderColor: colors.warning + '55' },
                        ]}
                    >
                        <Text style={[styles.bubbleText, { color: colors.warning }]}>{errorMessage}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={handleMuteToggle}
                    disabled={!isConnected}
                    accessibilityLabel={muted ? 'Unmute' : 'Mute'}
                >
                    <Ionicons
                        name={muted ? 'mic-off' : 'mic'}
                        size={22}
                        color={isConnected ? (muted ? colors.warning : colors.text) : colors.textTertiary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={handleInterrupt}
                    disabled={!isConnected}
                    accessibilityLabel="Interrupt"
                >
                    <Ionicons name="hand-left" size={22} color={isConnected ? colors.text : colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, styles.endButton, { borderColor: colors.warning + '55' }]}
                    onPress={() => void stopSession()}
                    disabled={state === 'idle'}
                    accessibilityLabel="End session"
                >
                    <Ionicons name="call" size={22} color={state === 'idle' ? colors.textTertiary : colors.warning} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const EXAMPLE_PHRASES = [
    'Just had two eggs and toast for breakfast',
    'Log 500 ml of water',
    'Start a push workout',
    'Slept seven hours, mood is a four',
    'How am I doing today?',
    'Open my progress',
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold as '700',
    },
    headerSubtitle: {
        fontSize: FontSize.xs,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    orbWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.lg,
        height: 240,
    },
    orb: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    orbHalo: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    orbHaloOuter: {
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    activityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: Spacing.sm,
        alignSelf: 'center',
        maxWidth: '95%',
    },
    activityText: {
        fontSize: FontSize.sm,
        marginLeft: Spacing.xs,
    },
    transcript: {
        flex: 1,
    },
    transcriptContent: {
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
    },
    bubbleText: {
        fontSize: FontSize.md,
        lineHeight: Platform.OS === 'ios' ? 22 : 24,
    },
    errorBubble: {
        alignSelf: 'center',
    },
    helperCard: {
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 4,
    },
    helperTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold as '700',
        marginBottom: Spacing.xs,
    },
    helperLine: {
        fontSize: FontSize.sm,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: Spacing.md,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    endButton: {
        // tinted by colors.warning border
    },
});
