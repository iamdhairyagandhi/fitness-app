/**
 * Orbit Log
 *
 * A conversational logging robot that turns natural language into confirmable
 * food, water, recovery, and workout entries.
 */

import { Button, toast } from '@/components/ui';
import { AI_PROXY_ENABLED } from '@/constants/config';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import {
    guessMealFromText,
    parseOrbitActions,
    shouldParseFood,
    type OrbitLogAction,
} from '@/lib/orbitLogParser';
import {
    parseNaturalLanguageFood,
    parseNaturalLanguageFoodDemo,
} from '@/lib/nutritionIntelligence';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { MealType, NLPFoodParseResult } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatMessage = {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    tone?: 'default' | 'success' | 'warning';
};

type SpeechPermissionResponse = {
    granted: boolean;
    canAskAgain?: boolean;
    restricted?: boolean;
};

type SpeechRecognitionResultEvent = {
    isFinal: boolean;
    results: { transcript?: string }[];
};

type SpeechRecognitionErrorEvent = {
    error?: string;
    message?: string;
};

type SpeechRecognitionOptions = {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
    addsPunctuation?: boolean;
    requiresOnDeviceRecognition?: boolean;
    contextualStrings?: string[];
    iosTaskHint?: 'dictation' | 'search' | 'confirmation' | 'unspecified';
    iosCategory?: {
        category: 'playAndRecord' | 'record' | 'playback' | 'ambient' | 'soloAmbient' | 'multiRoute';
        categoryOptions?: string[];
        mode?: string;
    };
    volumeChangeEventOptions?: {
        enabled?: boolean;
        intervalMillis?: number;
    };
};

type SpeechRecognitionEventMap = {
    start: undefined;
    end: undefined;
    error: SpeechRecognitionErrorEvent;
    result: SpeechRecognitionResultEvent;
    volumechange: { value: number };
};

type SpeechSubscription = { remove: () => void };

type SpeechRecognitionModule = {
    requestPermissionsAsync: () => Promise<SpeechPermissionResponse>;
    requestMicrophonePermissionsAsync?: () => Promise<SpeechPermissionResponse>;
    isRecognitionAvailable?: () => boolean;
    supportsOnDeviceRecognition?: () => boolean;
    start: (options: SpeechRecognitionOptions) => void;
    stop: () => void;
    abort: () => void;
    addListener?: <EventName extends keyof SpeechRecognitionEventMap>(
        eventName: EventName,
        listener: (event: SpeechRecognitionEventMap[EventName]) => void,
    ) => SpeechSubscription;
};

type TextToSpeechModule = {
    speak: (id: string, text: string, options: { language?: string; pitch?: number; rate?: number }) => void;
    stop: () => Promise<void>;
};

function getSpeechRecognitionModule(): SpeechRecognitionModule | null {
    try {
        return requireOptionalNativeModule<SpeechRecognitionModule>('ExpoSpeechRecognition');
    } catch {
        return null;
    }
}

function getTextToSpeechModule(): TextToSpeechModule | null {
    try {
        return requireOptionalNativeModule<TextToSpeechModule>('ExpoSpeech');
    } catch {
        return null;
    }
}

const MEAL_OPTIONS: { label: string; value: MealType; icon: string }[] = [
    { label: 'Breakfast', value: 'breakfast', icon: '🌅' },
    { label: 'Lunch', value: 'lunch', icon: '☀️' },
    { label: 'Dinner', value: 'dinner', icon: '🌙' },
    { label: 'Snack', value: 'snack', icon: '🍿' },
];

const QUICK_EXAMPLES = [
    'Log Greek yogurt with berries for breakfast and 500ml water',
    'Find what I should eat after a hard leg day',
    'Slept 7.5 hours, energy 4, stress low, sore legs',
    'Start a leg day workout',
];

const SPEECH_CONTEXT = [
    'Orbit',
    'log',
    'breakfast',
    'lunch',
    'dinner',
    'snack',
    'water',
    'sleep',
    'slept',
    'recovery',
    'stress',
    'energy',
    'sore',
    'workout',
    'training',
    'push day',
    'pull day',
    'leg day',
    'calories',
    'protein',
    'carbs',
    'fat',
    'grams',
    'serving',
    'chicken',
    'rice',
    'yogurt',
    'oats',
    'eggs',
    'protein shake',
    'banana',
    'salad',
    'coffee',
];

const BOT_NAME = 'Orbit';

const mealName = (meal: MealType) => meal.charAt(0).toUpperCase() + meal.slice(1);

const isConfirmPhrase = (phrase: string) => /\b(yes|confirm|log it|save it|do it|looks good|that's right|that is right)\b/i.test(phrase.trim());

function getOrbitGuidanceReply(phrase: string): string | null {
    const normalized = phrase.trim().toLowerCase();
    const soundsLikeQuestion = /\b(what should|what can|find|search|look up|recommend|suggest|how much|help me)\b/i.test(normalized);
    if (!soundsLikeQuestion) return null;

    if (/\b(post[- ]?workout|after.*workout|leg day|push day|pull day|trained|training)\b/i.test(normalized)) {
        return 'After training, go protein plus carbs. Good picks: Greek yogurt with banana, chicken and rice, eggs with toast, or a protein shake with oats. Tell me what you choose and I can prep the log.';
    }

    if (/\b(sleep|tired|recovery|sore|stress|hrv)\b/i.test(normalized)) {
        return 'For recovery, I would check sleep, soreness, stress, and hydration first. Tell me those details in one sentence and I can prepare a recovery log.';
    }

    if (/\b(water|hydration|drink)\b/i.test(normalized)) {
        return 'A simple hydration target is steady water through the day, then extra around training. Say an amount like "log 500ml water" and I will add it.';
    }

    if (/\b(food|eat|meal|breakfast|lunch|dinner|snack|protein|calories)\b/i.test(normalized)) {
        return 'Give me your goal or what ingredients you have, and I can narrow it down. If you already ate, say the meal and portion and I will prepare the log.';
    }

    return 'I can help with food, training, water, sleep, and recovery. Ask naturally, or tell me what happened and I will prepare a review card.';
}

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: 'intro',
        role: 'assistant',
        text: 'I am Orbit. Speak naturally, and I will turn what I hear into something you can review before it is saved.',
    },
];

export default function NLPFoodLogScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { logFood, logWater } = useNutritionStore();
    const logRecovery = useRecoveryStore((state) => state.logRecovery);
    const startWorkout = useWorkoutStore((state) => state.startWorkout);
    const logCompletedWorkout = useWorkoutStore((state) => state.logCompletedWorkout);
    const scrollRef = React.useRef<ScrollView>(null);

    const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [text, setText] = React.useState('');
    const [lastPhrase, setLastPhrase] = React.useState('');
    const [isParsing, setIsParsing] = React.useState(false);
    const [result, setResult] = React.useState<NLPFoodParseResult | null>(null);
    const [selectedMeal, setSelectedMeal] = React.useState<MealType>('lunch');
    const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
    const [pendingActions, setPendingActions] = React.useState<OrbitLogAction[]>([]);
    const [speechReady, setSpeechReady] = React.useState(true);
    const [isListening, setIsListening] = React.useState(false);
    const [voiceLevel, setVoiceLevel] = React.useState(0);
    const [voiceError, setVoiceError] = React.useState<string | null>(null);
    const speechModuleRef = React.useRef<SpeechRecognitionModule | null>(null);
    const parsePhraseRef = React.useRef<(phrase: string) => void>(() => undefined);
    const parsingRef = React.useRef(false);
    const lastFinalTranscriptRef = React.useRef('');
    const speechSubscriptionsRef = React.useRef<SpeechSubscription[]>([]);
    const messagesRef = React.useRef<ChatMessage[]>(INITIAL_MESSAGES);
    const textToSpeechRef = React.useRef<TextToSpeechModule | null>(null);

    const speakOrbitReply = React.useCallback((textToSpeak: string) => {
        const cleanText = textToSpeak.trim();
        if (!cleanText) return;

        try {
            const textToSpeech = textToSpeechRef.current ?? getTextToSpeechModule();
            textToSpeechRef.current = textToSpeech;
            if (!textToSpeech) return;

            void textToSpeech.stop();
            textToSpeech.speak(generateId(), cleanText, {
                language: 'en-US',
                pitch: 1.02,
                rate: Platform.OS === 'ios' ? 0.52 : 0.95,
            });
        } catch {
            // Speech should never block the text conversation.
        }
    }, []);

    const appendMessage = React.useCallback((message: Omit<ChatMessage, 'id'>) => {
        const nextMessage = { ...message, id: generateId() };
        messagesRef.current = [...messagesRef.current, nextMessage];
        setMessages(messagesRef.current);
        if (message.role === 'assistant') {
            speakOrbitReply(message.text);
        }
    }, [speakOrbitReply]);

    const appendMessageOnce = React.useCallback((message: Omit<ChatMessage, 'id'>) => {
        const lastMessage = messagesRef.current[messagesRef.current.length - 1];
        if (lastMessage?.role === message.role && lastMessage.text === message.text) return;

        const nextMessage = { ...message, id: generateId() };
        messagesRef.current = [...messagesRef.current, nextMessage];
        setMessages(messagesRef.current);
        if (message.role === 'assistant') {
            speakOrbitReply(message.text);
        }
    }, [speakOrbitReply]);

    const handleParse = React.useCallback(async (overrideText?: string) => {
        const phrase = (overrideText ?? text).trim();
        if (!phrase || isParsing) return;

        setText('');
        setLastPhrase(phrase);
        setResult(null);
        setPendingActions([]);
        setSelectedItems(new Set());
        appendMessage({ role: 'user', text: phrase });

        if (isConfirmPhrase(phrase)) {
            appendMessage({
                role: 'assistant',
                text: 'Use the review card below to confirm exactly what should be saved. I will keep every log editable before it lands in your history.',
            });
            return;
        }

        setIsParsing(true);

        try {
            const nextActions = parseOrbitActions(phrase);
            const nextMeal = guessMealFromText(phrase);
            setSelectedMeal(nextMeal);
            setPendingActions(nextActions);

            let parsed: NLPFoodParseResult | null = null;
            if (shouldParseFood(phrase)) {
                parsed = AI_PROXY_ENABLED
                    ? await parseNaturalLanguageFood(phrase)
                    : parseNaturalLanguageFoodDemo(phrase);

                setResult(parsed);
                setSelectedItems(new Set(parsed.items.map((_, index) => index)));
            }

            const foodCount = parsed?.items.length ?? 0;
            const actionCount = nextActions.length;
            const totalCount = foodCount + actionCount;
            const guidanceReply = totalCount ? null : getOrbitGuidanceReply(phrase);
            appendMessage({
                role: 'assistant',
                text: guidanceReply ?? (totalCount
                    ? `I prepared ${totalCount} log${totalCount > 1 ? 's' : ''}: ${foodCount ? `${foodCount} food estimate${foodCount > 1 ? 's' : ''}` : ''}${foodCount && actionCount ? ', plus ' : ''}${actionCount ? `${actionCount} health/action item${actionCount > 1 ? 's' : ''}` : ''}. Review them and confirm when they look right.`
                    : 'I did not find a loggable detail yet. Try saying something like “I ate chicken and rice, drank 500ml water, slept 7 hours.”'),
                tone: totalCount || guidanceReply ? 'default' : 'warning',
            });
        } catch {
            appendMessage({
                role: 'assistant',
                text: 'I had trouble reading that. Try one natural sentence with the food, water, sleep, or workout details you remember.',
                tone: 'warning',
            });
            toast.error('Could not parse log', 'Try adding portions, time, or a little more detail.');
        } finally {
            setIsParsing(false);
        }
    }, [appendMessage, isParsing, text]);

    React.useEffect(() => {
        parsePhraseRef.current = (phrase: string) => {
            void handleParse(phrase);
        };
    }, [handleParse]);

    React.useEffect(() => {
        parsingRef.current = isParsing;
    }, [isParsing]);

    const clearSpeechListeners = React.useCallback(() => {
        speechSubscriptionsRef.current.forEach((subscription) => subscription.remove());
        speechSubscriptionsRef.current = [];
    }, []);

    const attachSpeechListeners = React.useCallback((module: SpeechRecognitionModule) => {
        clearSpeechListeners();

        if (!module.addListener) {
            const message = `Voice logging is unavailable in this build. You can still type what you want ${BOT_NAME} to log.`;
            setSpeechReady(false);
            setVoiceError(message);
            appendMessage({ role: 'assistant', text: message, tone: 'warning' });
            return false;
        }

        speechSubscriptionsRef.current = [
            module.addListener('start', () => {
                setIsListening(true);
                setVoiceError(null);
                setSpeechReady(true);
                setVoiceLevel(0.2);
            }),
            module.addListener('end', () => {
                setIsListening(false);
                setVoiceLevel(0);
            }),
            module.addListener('error', (event) => {
                setIsListening(false);
                setVoiceLevel(0);
                if (event.error === 'aborted') return;

                const message = event.error === 'not-allowed'
                    ? 'Microphone permission is off. Open Settings and allow microphone access for BodyPilot.'
                    : event.error === 'no-speech' || event.error === 'speech-timeout'
                        ? 'I did not catch that. Try speaking closer to the phone.'
                        : event.error === 'service-not-allowed'
                            ? Platform.OS === 'ios'
                                ? 'The iOS speech service is not available right now. On Simulator, check I/O > Audio Input. On a phone, make sure Dictation is enabled.'
                                : 'Speech recognition is not available on this device.'
                            : event.error === 'language-not-supported'
                                ? 'English speech recognition files are not available on this device.'
                                : event.error === 'audio-capture'
                                    ? 'The microphone is unavailable or busy. Check the Simulator audio input or close another app using the mic.'
                                    : event.error === 'network'
                                        ? 'Speech recognition could not connect. Check internet and try again.'
                                        : `Voice logging is unavailable right now. You can still type what you want ${BOT_NAME} to log.`;
                setVoiceError(message);
                appendMessageOnce({ role: 'assistant', text: message, tone: 'warning' });
            }),
            module.addListener('result', (event) => {
                const transcript = event.results[0]?.transcript?.trim();
                if (!transcript) return;

                setText(transcript);
                if (!event.isFinal || parsingRef.current) return;

                const normalized = transcript.toLowerCase();
                if (lastFinalTranscriptRef.current === normalized) return;

                lastFinalTranscriptRef.current = normalized;
                parsePhraseRef.current(transcript);
            }),
            module.addListener('volumechange', (event) => {
                const normalizedLevel = Math.min(1, Math.max(0.12, (event.value + 2) / 12));
                setVoiceLevel(normalizedLevel);
            }),
        ];

        return true;
    }, [appendMessage, appendMessageOnce, clearSpeechListeners]);

    React.useEffect(() => {
        return () => {
            clearSpeechListeners();
            void textToSpeechRef.current?.stop();
            try {
                speechModuleRef.current?.abort();
            } catch {
                // Ignore native cleanup errors while the screen is closing.
            }
        };
    }, [clearSpeechListeners]);

    const startListening = React.useCallback(async () => {
        const module = speechModuleRef.current ?? getSpeechRecognitionModule();
        speechModuleRef.current = module;

        if (!module) {
            setSpeechReady(false);
            const message = 'Voice logging needs a rebuilt iOS app before the microphone module is available.';
            setVoiceError(message);
            appendMessage({ role: 'assistant', text: message, tone: 'warning' });
            toast.info('Rebuild needed', 'Create a new native build to enable verbal logging.');
            return;
        }

        try {
            if (!attachSpeechListeners(module)) return;

            // Prefer iOS on-device recognition so Orbit only needs microphone access.
            // It also avoids the flaky combined Speech Recognition permission path.
            const useOnDeviceRecognition = Platform.OS === 'ios';
            const permission = useOnDeviceRecognition && module.requestMicrophonePermissionsAsync
                ? await module.requestMicrophonePermissionsAsync()
                : await module.requestPermissionsAsync();
            if (!permission.granted) {
                const message = permission.restricted
                    ? 'Voice logging is restricted on this device.'
                    : permission.canAskAgain === false
                        ? 'Microphone permission is disabled. Open Settings to turn it back on.'
                        : 'Microphone permission is needed for verbal logging.';
                setVoiceError(message);
                appendMessageOnce({ role: 'assistant', text: message, tone: 'warning' });
                if (permission.canAskAgain === false) {
                    toast.error('Permission needed', 'Open iOS Settings and allow microphone access.');
                }
                return;
            }

            setText('');
            setResult(null);
            setPendingActions([]);
            setVoiceError(null);
            lastFinalTranscriptRef.current = '';
            module.start({
                lang: 'en-US',
                interimResults: true,
                continuous: false,
                addsPunctuation: true,
                requiresOnDeviceRecognition: useOnDeviceRecognition,
                contextualStrings: SPEECH_CONTEXT,
                iosTaskHint: 'dictation',
                iosCategory: {
                    category: 'playAndRecord',
                    categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
                    mode: 'measurement',
                },
                volumeChangeEventOptions: {
                    enabled: true,
                    intervalMillis: 150,
                },
            });
        } catch {
            const message = `I could not start listening. You can still type what you want ${BOT_NAME} to log.`;
            setIsListening(false);
            setVoiceError(message);
            appendMessageOnce({ role: 'assistant', text: message, tone: 'warning' });
        }
    }, [appendMessage, appendMessageOnce, attachSpeechListeners]);

    const stopListening = React.useCallback(() => {
        try {
            speechModuleRef.current?.stop();
        } catch {
            setIsListening(false);
        }
    }, []);

    const openAppSettings = React.useCallback(() => {
        void Linking.openSettings();
    }, []);

    const toggleItem = (index: number) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleLogSelected = () => {
        const hasFoodToLog = Boolean(result && selectedItems.size > 0);
        if (!hasFoodToLog && pendingActions.length === 0) return;

        let foodCount = 0;
        let waterCount = 0;
        let recoveryCount = 0;
        let workoutCount = 0;
        let shouldOpenWorkout = false;

        if (result) {
            Array.from(selectedItems).forEach((idx) => {
                const item = result.items[idx];
                if (!item) return;

                logFood(
                    {
                        id: generateId(),
                        name: item.name,
                        brand: BOT_NAME,
                        barcode: null,
                        serving_size_g: item.quantity,
                        serving_unit: item.unit,
                        calories: item.calories,
                        protein_g: item.protein_g,
                        carbs_g: item.carbs_g,
                        fat_g: item.fat_g,
                        fiber_g: item.fiber_g,
                        sugar_g: null,
                        sodium_mg: null,
                        is_custom: false,
                        user_id: null,
                        image_url: null,
                    },
                    1,
                    selectedMeal,
                    { notes: result.rawText || lastPhrase || null },
                );
                foodCount++;
            });
        }

        pendingActions.forEach((action) => {
            if (action.kind === 'water') {
                logWater(action.amountMl);
                waterCount++;
                return;
            }

            if (action.kind === 'recovery') {
                logRecovery(action.log);
                recoveryCount++;
                return;
            }

            if (action.kind === 'workout_start') {
                startWorkout(action.name);
                workoutCount++;
                shouldOpenWorkout = true;
                return;
            }

            logCompletedWorkout({
                name: action.name,
                durationMinutes: action.durationMinutes,
                notes: action.notes,
            });
            workoutCount++;
        });

        const summary = [
            foodCount ? `${foodCount} food${foodCount > 1 ? 's' : ''}` : null,
            waterCount ? `${waterCount} water log${waterCount > 1 ? 's' : ''}` : null,
            recoveryCount ? `${recoveryCount} recovery log${recoveryCount > 1 ? 's' : ''}` : null,
            workoutCount ? `${workoutCount} workout action${workoutCount > 1 ? 's' : ''}` : null,
        ].filter(Boolean).join(', ');

        toast.success('Logged', summary || 'Orbit saved your update.');
        appendMessage({
            role: 'assistant',
            text: `Done. I logged ${summary || 'your update'}. You can keep talking if there is more to add.`,
            tone: 'success',
        });
        setResult(null);
        setPendingActions([]);
        setSelectedItems(new Set());
        setLastPhrase('');

        if (shouldOpenWorkout) {
            router.push('/workout/active');
        }
    };

    const selectedFoods = React.useMemo(
        () => result?.items.filter((_, index) => selectedItems.has(index)) ?? [],
        [result, selectedItems],
    );
    const totalCalories = selectedFoods.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = selectedFoods.reduce((sum, item) => sum + item.protein_g, 0);
    const totalCarbs = selectedFoods.reduce((sum, item) => sum + item.carbs_g, 0);
    const totalFat = selectedFoods.reduce((sum, item) => sum + item.fat_g, 0);
    const preparedLogCount = pendingActions.length + selectedItems.size;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleBlock}>
                    <Text style={[styles.title, { color: colors.text }]}>{BOT_NAME}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>Your logging robot</Text>
                </View>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                <View style={[styles.robotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.robotAvatar,
                            {
                                backgroundColor: isListening ? colors.primary : colors.primary + '18',
                                borderColor: isListening ? colors.primary : colors.primary + '30',
                            },
                        ]}
                        onPress={isListening ? stopListening : startListening}
                        disabled={isParsing}
                        activeOpacity={0.86}
                    >
                        <Ionicons
                            name={isListening ? 'stop' : 'mic'}
                            size={28}
                            color={isListening ? colors.textInverse : colors.primary}
                        />
                    </TouchableOpacity>
                    <View style={styles.robotCopy}>
                        <View style={styles.robotTitleRow}>
                            <Text style={[styles.robotTitle, { color: colors.text }]}>
                                {isListening ? 'Listening' : 'Ask Orbit'}
                            </Text>
                            <View style={[styles.modeBadge, { backgroundColor: colors.primary + '14' }]}>
                                <Text style={[styles.modeBadgeText, { color: colors.primary }]}>Voice first</Text>
                            </View>
                        </View>
                        <Text style={[styles.robotText, { color: colors.textSecondary }]}>
                            {isListening
                                ? (text.trim() || 'Say a meal, workout, recovery note, or question.')
                                : 'Talk, type, or search your day. Orbit prepares the next action and waits for your confirmation.'}
                        </Text>
                    </View>
                </View>

                {(isListening || voiceError || !speechReady) && (
                    <View
                        style={[
                            styles.voiceStatus,
                            {
                                backgroundColor: isListening ? colors.primary + '16' : colors.warning + '14',
                                borderColor: isListening ? colors.primary + '42' : colors.warning + '42',
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.voicePulse,
                                {
                                    backgroundColor: isListening ? colors.primary : colors.warning,
                                    transform: [{ scale: isListening ? 0.75 + voiceLevel * 0.45 : 1 }],
                                },
                            ]}
                        />
                        <View style={styles.voiceStatusCopy}>
                            <Text style={[styles.voiceStatusTitle, { color: isListening ? colors.primary : colors.warning }]}>
                                {isListening ? 'Listening...' : !speechReady ? 'Rebuild needed' : 'Voice needs attention'}
                            </Text>
                            <Text style={[styles.voiceStatusText, { color: colors.textSecondary }]}>
                                {isListening
                                    ? 'Say what you ate, drank, slept, or trained. I will prepare the review card.'
                                    : voiceError ?? 'Create a new native build to activate the microphone module.'}
                            </Text>
                        </View>
                        {voiceError?.includes('Settings') && (
                            <TouchableOpacity onPress={openAppSettings} style={styles.settingsButton}>
                                <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Settings</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.messages}>
                    {messages.map((message) => {
                        const isUser = message.role === 'user';
                        const toneColor = message.tone === 'success'
                            ? colors.success
                            : message.tone === 'warning'
                                ? colors.warning
                                : colors.primary;

                        return (
                            <View
                                key={message.id}
                                style={[styles.messageRow, isUser && styles.messageRowUser]}
                            >
                                {!isUser && (
                                    <View style={[styles.messageIcon, { backgroundColor: toneColor + '18' }]}>
                                        <Ionicons name="hardware-chip" size={14} color={toneColor} />
                                    </View>
                                )}
                                <View
                                    style={[
                                        styles.messageBubble,
                                        {
                                            backgroundColor: isUser ? colors.primary : colors.surface,
                                            borderColor: isUser ? colors.primary : colors.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.messageText, { color: isUser ? colors.textInverse : colors.textSecondary }]}>
                                        {message.text}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {isParsing && (
                        <View style={styles.messageRow}>
                            <View style={[styles.messageIcon, { backgroundColor: colors.primary + '18' }]}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                            <View style={[styles.messageBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                                    Reading your message and preparing logs...
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {!result && pendingActions.length === 0 && (
                    <View style={styles.examplesSection}>
                        <Text style={[styles.sectionKicker, { color: colors.textTertiary }]}>Try saying</Text>
                        <View style={styles.examplesWrap}>
                            {QUICK_EXAMPLES.map((example) => (
                                <TouchableOpacity
                                    key={example}
                                    style={[styles.exampleChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={() => handleParse(example)}
                                    disabled={isParsing}
                                >
                                    <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{example}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {pendingActions.length > 0 && (
                    <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={[styles.resultTitle, { color: colors.text }]}>Ready to log</Text>
                                <Text style={[styles.resultSubtitle, { color: colors.textTertiary }]}>
                                    {BOT_NAME} found app actions in your message.
                                </Text>
                            </View>
                            <View style={[styles.totalBadge, { backgroundColor: colors.primary + '18' }]}>
                                <Text style={[styles.totalBadgeValue, { color: colors.primary }]}>{pendingActions.length}</Text>
                                <Text style={[styles.totalBadgeLabel, { color: colors.textTertiary }]}>items</Text>
                            </View>
                        </View>

                        <View style={styles.actionList}>
                            {pendingActions.map((action) => (
                                <View
                                    key={action.id}
                                    style={[styles.actionRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                                >
                                    <View style={[styles.actionIcon, { backgroundColor: colors.primary + '16' }]}>
                                        <Ionicons name={action.icon} size={18} color={colors.primary} />
                                    </View>
                                    <View style={styles.actionCopy}>
                                        <Text style={[styles.actionTitle, { color: colors.text }]}>{action.label}</Text>
                                        <Text style={[styles.actionDetail, { color: colors.textTertiary }]}>{action.detail}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {(!result || result.items.length === 0) && (
                            <Button
                                title={`Confirm ${preparedLogCount} log${preparedLogCount > 1 ? 's' : ''}`}
                                onPress={handleLogSelected}
                                disabled={preparedLogCount === 0}
                                style={styles.logButton}
                            />
                        )}
                    </View>
                )}

                {result && result.items.length > 0 && (
                    <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={[styles.resultTitle, { color: colors.text }]}>Food estimates</Text>
                                <Text style={[styles.resultSubtitle, { color: colors.textTertiary }]}>Tap foods to include, then confirm every log together.</Text>
                            </View>
                            <View style={[styles.totalBadge, { backgroundColor: colors.primary + '18' }]}>
                                <Text style={[styles.totalBadgeValue, { color: colors.primary }]}>{Math.round(totalCalories)}</Text>
                                <Text style={[styles.totalBadgeLabel, { color: colors.textTertiary }]}>kcal</Text>
                            </View>
                        </View>

                        <View style={styles.mealRow}>
                            {MEAL_OPTIONS.map((meal) => {
                                const active = selectedMeal === meal.value;
                                return (
                                    <TouchableOpacity
                                        key={meal.value}
                                        style={[
                                            styles.mealChip,
                                            {
                                                backgroundColor: active ? colors.primary + '18' : colors.surfaceLight,
                                                borderColor: active ? colors.primary : colors.border,
                                            },
                                        ]}
                                        onPress={() => setSelectedMeal(meal.value)}
                                    >
                                        <Text style={styles.mealIcon}>{meal.icon}</Text>
                                        <Text style={[styles.mealLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                                            {meal.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.foodList}>
                            {result.items.map((item, index) => {
                                const selected = selectedItems.has(index);
                                const confidence = Math.min(100, Math.max(0, Math.round(item.confidence * 100)));
                                return (
                                    <TouchableOpacity
                                        key={`${item.name}-${index}`}
                                        style={[
                                            styles.foodCard,
                                            {
                                                backgroundColor: selected ? colors.primary + '10' : colors.surfaceLight,
                                                borderColor: selected ? colors.primary : colors.border,
                                            },
                                        ]}
                                        onPress={() => toggleItem(index)}
                                        activeOpacity={0.82}
                                    >
                                        <View style={[styles.foodCheck, { backgroundColor: selected ? colors.primary : colors.surface }]}>
                                            <Ionicons
                                                name={selected ? 'checkmark' : 'add'}
                                                size={18}
                                                color={selected ? colors.textInverse : colors.textTertiary}
                                            />
                                        </View>
                                        <View style={styles.foodInfo}>
                                            <View style={styles.foodTopLine}>
                                                <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <Text style={[styles.confidenceText, { color: colors.textTertiary }]}>
                                                    {confidence}% sure
                                                </Text>
                                            </View>
                                            <Text style={[styles.foodServing, { color: colors.textTertiary }]}>
                                                {item.quantity} {item.unit}
                                            </Text>
                                            <View style={styles.macroRow}>
                                                <Text style={[styles.macroText, { color: colors.calories }]}>{Math.round(item.calories)} kcal</Text>
                                                <Text style={[styles.macroText, { color: colors.protein }]}>P {Math.round(item.protein_g)}g</Text>
                                                <Text style={[styles.macroText, { color: colors.carbs }]}>C {Math.round(item.carbs_g)}g</Text>
                                                <Text style={[styles.macroText, { color: colors.fat }]}>F {Math.round(item.fat_g)}g</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={[styles.summaryPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View>
                                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Selected total</Text>
                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                    {Math.round(totalCalories)} kcal
                                </Text>
                            </View>
                            <View style={styles.summaryMacros}>
                                <Text style={[styles.summaryMacro, { color: colors.protein }]}>P {Math.round(totalProtein)}g</Text>
                                <Text style={[styles.summaryMacro, { color: colors.carbs }]}>C {Math.round(totalCarbs)}g</Text>
                                <Text style={[styles.summaryMacro, { color: colors.fat }]}>F {Math.round(totalFat)}g</Text>
                            </View>
                        </View>

                        <Text style={[styles.estimateNote, { color: colors.textTertiary }]}>
                            Estimates can be imperfect. Confirm portions before logging, especially for homemade meals.
                        </Text>

                        <Button
                            title={pendingActions.length
                                ? `Confirm ${preparedLogCount} log${preparedLogCount > 1 ? 's' : ''}`
                                : `Log to ${mealName(selectedMeal)}`}
                            onPress={handleLogSelected}
                            disabled={preparedLogCount === 0}
                            style={styles.logButton}
                        />
                    </View>
                )}

                {result && result.items.length === 0 && (
                    <View style={[styles.emptyResult, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="alert-circle-outline" size={30} color={colors.textTertiary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            I could not find food items in that message. Try adding a portion, like "1 cup rice" or "170g yogurt".
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View
                style={[
                    styles.composerWrap,
                    {
                        paddingBottom: Math.max(insets.bottom, Spacing.md),
                        backgroundColor: colors.background,
                        borderTopColor: colors.border,
                    },
                ]}
            >
                <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.micButton,
                            {
                                backgroundColor: isListening ? colors.primary : colors.primary + '14',
                                borderColor: isListening ? colors.primary : colors.primary + '30',
                            },
                        ]}
                        onPress={isListening ? stopListening : startListening}
                        disabled={isParsing}
                    >
                        <Ionicons
                            name={isListening ? 'stop' : 'mic'}
                            size={20}
                            color={isListening ? colors.textInverse : colors.primary}
                        />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.composerInput, { color: colors.text }]}
                        value={text}
                        onChangeText={setText}
                        onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
                        placeholder={isListening ? 'Listening...' : `Ask or tell ${BOT_NAME}...`}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        maxLength={500}
                        editable={!isParsing && !isListening}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: text.trim() && !isParsing ? colors.primary : colors.surfaceLight },
                        ]}
                        onPress={() => handleParse()}
                        disabled={!text.trim() || isParsing}
                    >
                        <Ionicons
                            name="arrow-up"
                            size={20}
                            color={text.trim() && !isParsing ? colors.textInverse : colors.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleBlock: {
        alignItems: 'center',
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    headerSubtitle: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.medium,
        marginTop: 2,
    },
    doneText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    robotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    robotAvatar: {
        width: 58,
        height: 58,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    robotCopy: {
        flex: 1,
    },
    robotTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    robotTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    modeBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    modeBadgeText: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
    },
    robotText: {
        fontSize: FontSize.sm,
        lineHeight: 20,
        marginTop: 3,
    },
    voiceStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    voicePulse: {
        width: 16,
        height: 16,
        borderRadius: BorderRadius.full,
    },
    voiceStatusCopy: {
        flex: 1,
    },
    voiceStatusTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    voiceStatusText: {
        fontSize: FontSize.xs,
        lineHeight: 18,
        marginTop: 2,
    },
    settingsButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    settingsButtonText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    messages: {
        gap: Spacing.sm,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        maxWidth: '94%',
    },
    messageRowUser: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageIcon: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageBubble: {
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        maxWidth: '88%',
    },
    messageText: {
        fontSize: FontSize.sm,
        lineHeight: 21,
        fontWeight: FontWeight.medium,
    },
    examplesSection: {
        marginTop: Spacing.lg,
    },
    sectionKicker: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        letterSpacing: 0,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    examplesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    exampleChip: {
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    exampleText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
    resultCard: {
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.lg,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    resultTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    resultSubtitle: {
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    totalBadge: {
        minWidth: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
    },
    totalBadgeValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    totalBadgeLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.medium,
    },
    mealRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    mealChip: {
        flexGrow: 1,
        flexBasis: '47%',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    mealIcon: {
        fontSize: 15,
    },
    mealLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    foodList: {
        gap: Spacing.sm,
    },
    actionList: {
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    actionIcon: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCopy: {
        flex: 1,
    },
    actionTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    actionDetail: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        marginTop: 2,
    },
    foodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    foodCheck: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodInfo: {
        flex: 1,
    },
    foodTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    foodName: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    confidenceText: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
    },
    foodServing: {
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    macroRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    macroText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    summaryPanel: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
    },
    summaryLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        marginTop: 2,
    },
    summaryMacros: {
        alignItems: 'flex-end',
        gap: 3,
    },
    summaryMacro: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
    },
    estimateNote: {
        fontSize: FontSize.xs,
        lineHeight: 18,
        marginTop: Spacing.sm,
    },
    logButton: {
        marginTop: Spacing.md,
    },
    emptyResult: {
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginTop: Spacing.lg,
    },
    emptyText: {
        fontSize: FontSize.sm,
        lineHeight: 21,
        textAlign: 'center',
    },
    composerWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
    },
    composer: {
        minHeight: 56,
        maxHeight: 132,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        paddingLeft: Spacing.md,
        paddingRight: Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    composerInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 104,
        fontSize: FontSize.md,
        lineHeight: 21,
        paddingTop: 10,
        paddingBottom: 10,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
