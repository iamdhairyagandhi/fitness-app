import { AI_PROXY_ENABLED } from '@/constants/config';
import { HEALTH_CITATIONS } from '@/constants/healthCitations';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { chatWithFunctions, type AIResponse } from '@/lib/aiEngine';
import { buildCoachingSystemPrompt, type OpenAIMessage } from '@/lib/openai';
import { requirePremium } from '@/lib/premium';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { AIGeneratedMealPlan, AIGeneratedWorkout, ChatMessage } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Quick prompts ────────────────────────────────────────────

const QUICK_PROMPTS = [
    { icon: '🥗', text: 'Suggest a meal for my remaining macros' },
    { icon: '💪', text: 'Create a workout for today' },
    { icon: '📊', text: 'Analyze my progress this week' },
    { icon: '💤', text: 'Tips for better recovery' },
    { icon: '🍽️', text: 'Generate a 3-day meal plan' },
    { icon: '🔥', text: 'How should I adjust my diet phase?' },
];

// ── Demo fallback responses ──────────────────────────────────

const DEMO_RESPONSES: Record<string, string> = {
    default: "I'm your BodyPilot AI Coach! 💪\n\nLive AI responses are not configured yet.\n\nIn the meantime, I can still help you navigate the app. Try logging a workout, tracking your meals, or checking your progress!",
    meal: "Here's a balanced meal suggestion for your remaining macros:\n\n🍗 **Grilled Chicken Breast** (150g) — 248 kcal, 46g protein, 0g carbs, 5g fat\n🍚 **Brown Rice** (150g cooked) — 168 kcal, 4g protein, 36g carbs, 1g fat\n🥦 **Steamed Broccoli** (100g) — 35 kcal, 2g protein, 7g carbs, 0g fat\n\n**Total: ~451 kcal | 52g protein | 43g carbs | 6g fat**\n\nSources: Dietary Guidelines for Americans.",
    workout: "Here's a solid workout for today:\n\n**Upper Body Push (45 min)**\n\n1. Bench Press — 4×8 @ moderate weight\n2. Overhead Press — 3×10\n3. Incline DB Press — 3×12\n4. Lateral Raises — 3×15\n5. Tricep Pushdowns — 3×12\n6. Face Pulls — 3×15\n\n💡 Rest 90-120s between compounds, 60s for isolation.\n\nSources: HHS Physical Activity Guidelines, ACSM position stands.",
    progress: "📈 **This Week's Summary:**\n- Track more workouts to see trends!\n- Protein goal: aim for 4+ days this week\n\n🎯 **Focus Areas:**\n1. Log every meal for complete data\n2. Hit protein target daily\n3. Add weight or reps each week\n\nKeep pushing! 🔥",
    recovery: "😴 **Sleep:** 7-9 hours for muscle repair\n💧 **Hydration:** Hit your water goal daily\n🍗 **Post-Workout:** 20-40g protein within 2 hours\n🧘 **Active Recovery:** Light movement on rest days\n🔄 **Deload:** Every 4-6 weeks, reduce volume by 40-50%\n\nSources: HHS Physical Activity Guidelines, CDC Adult Physical Activity Guidelines, ACSM position stands.",
    mealplan: "Here's a sample day:\n\n🌅 **Breakfast** — Protein Oats (420 kcal, 35g protein)\n☀️ **Lunch** — Greek Protein Bowl (480 kcal, 42g protein)\n🌙 **Dinner** — Chicken Stir Fry (380 kcal, 38g protein)\n🍿 **Snack** — Greek Yogurt + Berries (160 kcal, 15g protein)\n\n**Total: ~1,440 kcal | 130g protein**\n\nSources: Dietary Guidelines for Americans.",
    diet: "📈 **Bulking:** +10-20% above maintenance, focus strength gains\n📉 **Cutting:** -20-25%, high protein to preserve muscle\n⚖️ **Maintenance:** Great for recomp, train hard, eat at maintenance\n🔁 **Reverse Diet:** After a long cut, +50-100 kcal/week\n\nSources: Dietary Guidelines for Americans, ACSM position stands.",
};

function getDemoResponse(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('meal plan') || lower.includes('generate')) return DEMO_RESPONSES.mealplan;
    if (lower.includes('meal') || lower.includes('food') || lower.includes('eat') || lower.includes('macro')) return DEMO_RESPONSES.meal;
    if (lower.includes('workout') || lower.includes('exercise') || lower.includes('train') || lower.includes('create')) return DEMO_RESPONSES.workout;
    if (lower.includes('progress') || lower.includes('week') || lower.includes('analyze')) return DEMO_RESPONSES.progress;
    if (lower.includes('recovery') || lower.includes('sleep') || lower.includes('rest') || lower.includes('tip')) return DEMO_RESPONSES.recovery;
    if (lower.includes('diet') || lower.includes('phase') || lower.includes('bulk') || lower.includes('cut')) return DEMO_RESPONSES.diet;
    return DEMO_RESPONSES.default;
}

// ── AI Generated Content Cards ───────────────────────────────

function WorkoutCard({ workout }: { workout: AIGeneratedWorkout }) {
    return (
        <View style={cardStyles.container}>
            <View style={cardStyles.header}>
                <Text style={cardStyles.icon}>💪</Text>
                <Text style={cardStyles.title}>{workout.name}</Text>
            </View>
            {workout.description ? (
                <Text style={cardStyles.desc}>{workout.description}</Text>
            ) : null}
            <Text style={cardStyles.meta}>{workout.estimated_duration_min} min • {workout.exercises.length} exercises</Text>
            {workout.exercises.map((ex, i) => (
                <View key={i} style={cardStyles.row}>
                    <Text style={cardStyles.rowNum}>{i + 1}.</Text>
                    <View style={cardStyles.rowContent}>
                        <Text style={cardStyles.rowTitle}>{ex.exercise_name}</Text>
                        <Text style={cardStyles.rowMeta}>{ex.sets} × {ex.reps} • {ex.rest_seconds}s rest</Text>
                        {ex.notes ? <Text style={cardStyles.rowNotes}>{ex.notes}</Text> : null}
                    </View>
                </View>
            ))}
        </View>
    );
}

function MealPlanCard({ plan }: { plan: AIGeneratedMealPlan }) {
    return (
        <View style={cardStyles.container}>
            <View style={cardStyles.header}>
                <Text style={cardStyles.icon}>🍽️</Text>
                <Text style={cardStyles.title}>{plan.name}</Text>
            </View>
            {plan.days.map((day, di) => (
                <View key={di} style={cardStyles.daySection}>
                    <Text style={cardStyles.dayTitle}>{day.day}</Text>
                    {day.meals.map((meal, mi) => (
                        <View key={mi} style={cardStyles.mealRow}>
                            <Text style={cardStyles.mealType}>{meal.meal_type}</Text>
                            <Text style={cardStyles.mealName}>{meal.name}</Text>
                            <Text style={cardStyles.mealMacros}>
                                {meal.calories} kcal • {meal.protein_g}P / {meal.carbs_g}C / {meal.fat_g}F
                            </Text>
                        </View>
                    ))}
                    <Text style={cardStyles.dayTotal}>
                        Day total: {day.total_calories} kcal | {day.total_protein_g}P / {day.total_carbs_g}C / {day.total_fat_g}F
                    </Text>
                </View>
            ))}
        </View>
    );
}

// ── Main Screen ──────────────────────────────────────────────

export default function AIChatScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const todaySummary = useNutritionStore((s) => s.todaySummary);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const { dietProfile, activeFast } = useMealPlanStore();
    const { recoveryLogs } = useRecoveryStore();
    const flatListRef = useRef<FlatList>(null);
    const {
        activeConversationId,
        messages: storedMessages,
        addLocalMessage,
        sendMessage: persistMessage,
        startNewConversation,
    } = useChatStore();

    // Merge stored messages with welcome message
    const welcomeMsg: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey${user?.display_name ? ` ${user.display_name}` : ''}! 👋 I'm your BodyPilot AI Coach.\n\nI can help with:\n• **Workout plans** — I'll create structured programs you can follow\n• **Meal plans** — Custom plans fitted to your exact macros\n• **Progress analysis** — Data-driven insights on your trends\n• **Recovery advice** — Based on your sleep and stress data\n\nWhat would you like help with?`,
        timestamp: new Date().toISOString(),
    };

    const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
    const [generatedWorkouts, setGeneratedWorkouts] = useState<Record<string, AIGeneratedWorkout>>({});
    const [generatedMealPlans, setGeneratedMealPlans] = useState<Record<string, AIGeneratedMealPlan>>({});
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Load stored messages when conversation is opened
    useEffect(() => {
        if (storedMessages.length > 0) {
            setMessages([welcomeMsg, ...storedMessages]);
        }
    }, [storedMessages]);

    // Auto-create conversation if none active
    const ensureConversation = useCallback(async () => {
        if (!activeConversationId && user?.id) {
            return await startNewConversation(user.id, 'AI Coach Chat');
        }
        return activeConversationId;
    }, [activeConversationId, user?.id, startNewConversation]);

    const buildSystemPrompt = useCallback(() => {
        const lastRecovery = recoveryLogs[recoveryLogs.length - 1];
        return buildCoachingSystemPrompt({
            name: user?.display_name,
            goal: user?.goal,
            experience: user?.experience_level,
            calorieTarget: user?.daily_calorie_target,
            proteinTarget: user?.protein_target_g,
            carbsTarget: user?.carbs_target_g,
            fatTarget: user?.fat_target_g,
            todayCalories: todaySummary.total_calories,
            todayProtein: todaySummary.total_protein_g,
            recentWorkouts: recentWorkouts.slice(0, 5).map((w) => w.name),
            streak: user?.streak_count,
            dietTemplate: dietProfile?.template,
            dietPhase: dietProfile?.phase,
            recoveryScore: lastRecovery?.recovery_score ?? undefined,
            sleepHours: lastRecovery?.sleep_hours ?? undefined,
            fastingActive: !!activeFast,
        });
    }, [user, todaySummary, recentWorkouts, dietProfile, activeFast, recoveryLogs]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;
        if (!requirePremium('ai_coach')) return;

        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Ensure we have a conversation for persistence
            const convId = await ensureConversation();
            if (convId) {
                persistMessage('user', text.trim()).catch(() => { });
            }

            let responseText: string;
            let functionCall: AIResponse['functionCall'] | undefined;

            if (AI_PROXY_ENABLED) {
                const systemPrompt = buildSystemPrompt();
                const apiMessages: OpenAIMessage[] = [
                    { role: 'system', content: systemPrompt },
                    ...messages.filter((m) => m.id !== 'welcome').slice(-12).map((m) => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                    })),
                    { role: 'user' as const, content: text.trim() },
                ];

                const result = await chatWithFunctions(apiMessages, { maxTokens: 2000 });
                responseText = result.text;
                functionCall = result.functionCall;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 800));
                responseText = getDemoResponse(text);
            }

            const assistantMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toISOString(),
                metadata: functionCall
                    ? { functionName: functionCall.functionName, args: functionCall.args }
                    : undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Store structured data for rendering cards
            if (functionCall?.functionName === 'create_workout') {
                setGeneratedWorkouts((prev) => ({
                    ...prev,
                    [assistantMessage.id]: functionCall!.args as unknown as AIGeneratedWorkout,
                }));
            } else if (functionCall?.functionName === 'generate_meal_plan') {
                setGeneratedMealPlans((prev) => ({
                    ...prev,
                    [assistantMessage.id]: functionCall!.args as unknown as AIGeneratedMealPlan,
                }));
            }

            // Persist assistant message
            if (convId) {
                persistMessage('assistant', responseText, functionCall
                    ? { functionName: functionCall.functionName, args: functionCall.args }
                    : undefined).catch(() => { });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Please try again.';
            const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: `Sorry, I encountered an error. ${message}`,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, buildSystemPrompt, ensureConversation, persistMessage]);

    const handleNewChat = useCallback(() => {
        setMessages([welcomeMsg]);
        setGeneratedWorkouts({});
        setGeneratedMealPlans({});
        if (user?.id) {
            startNewConversation(user.id, 'AI Coach Chat');
        }
    }, [user?.id, startNewConversation]);

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
        const isUser = item.role === 'user';
        const workout = generatedWorkouts[item.id];
        const mealPlan = generatedMealPlans[item.id];

        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatar}>🤖</Text>
                    </View>
                )}
                <View style={[styles.messageContent, isUser ? styles.userContent : styles.assistantContent]}>
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                        {item.content}
                    </Text>
                    {workout ? <WorkoutCard workout={workout} /> : null}
                    {mealPlan ? <MealPlanCard plan={mealPlan} /> : null}
                </View>
            </View>
        );
    }, [generatedWorkouts, generatedMealPlans]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>AI Coach</Text>
                    <Text style={styles.headerSubtitle}>
                        {AI_PROXY_ENABLED ? 'Live AI' : 'AI unavailable'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
                        <Ionicons name="add-circle-outline" size={22} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.headerBtn}>
                        <Ionicons name="time-outline" size={22} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat history sidebar (simple inline for now) */}
            {showHistory && (
                <View style={styles.historyPanel}>
                    <Text style={styles.historyTitle}>Chat History</Text>
                    {useChatStore.getState().conversations.length === 0 ? (
                        <Text style={styles.historyEmpty}>No saved conversations yet</Text>
                    ) : (
                        useChatStore.getState().conversations.slice(0, 10).map((conv) => (
                            <TouchableOpacity
                                key={conv.id}
                                style={[
                                    styles.historyItem,
                                    conv.id === activeConversationId && styles.historyItemActive,
                                ]}
                                onPress={() => {
                                    useChatStore.getState().openConversation(conv.id);
                                    setShowHistory(false);
                                }}
                            >
                                <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.historyItemText} numberOfLines={1}>{conv.title}</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Quick prompts */}
            {messages.length <= 1 && (
                <View style={styles.quickPrompts}>
                    {QUICK_PROMPTS.map((prompt) => (
                        <TouchableOpacity
                            key={prompt.text}
                            style={styles.quickPromptBtn}
                            onPress={() => sendMessage(prompt.text)}
                        >
                            <Text style={styles.quickPromptIcon}>{prompt.icon}</Text>
                            <Text style={styles.quickPromptText}>{prompt.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.sourcesPanel}>
                <Text style={styles.sourcesTitle}>Health sources used by AI Coach</Text>
                <Text style={styles.sourcesCopy}>
                    Fitness and nutrition guidance is educational, not medical diagnosis or treatment.
                </Text>
                {HEALTH_CITATIONS.map((source) => (
                    <TouchableOpacity
                        key={source.url}
                        style={styles.sourceLink}
                        onPress={() => Linking.openURL(source.url)}
                    >
                        <Ionicons name="link-outline" size={14} color={Colors.primary} />
                        <Text style={styles.sourceLinkText}>{source.organization}: {source.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Loading */}
            {isLoading && (
                <View style={styles.loadingRow}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatar}>🤖</Text>
                    </View>
                    <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                </View>
            )}

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask your AI coach..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
                    onPress={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={input.trim() && !isLoading ? Colors.text : Colors.textTertiary}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    headerSubtitle: { color: Colors.textTertiary, fontSize: FontSize.xs },
    headerActions: { flexDirection: 'row', gap: Spacing.sm },
    headerBtn: { padding: 4 },

    historyPanel: {
        backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, maxHeight: 200,
    },
    historyTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    historyEmpty: { color: Colors.textTertiary, fontSize: FontSize.sm },
    historyItem: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    historyItemActive: { backgroundColor: Colors.primary + '15' },
    historyItemText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },

    messageList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    messageBubble: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm },
    userBubble: { justifyContent: 'flex-end' },
    assistantBubble: { justifyContent: 'flex-start' },
    avatarContainer: {
        width: 32, height: 32, borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    },
    avatar: { fontSize: 18 },
    messageContent: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md },
    userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    assistantContent: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
    messageText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20 },
    userMessageText: { color: Colors.text },

    quickPrompts: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
    quickPromptBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    quickPromptIcon: { fontSize: 18 },
    quickPromptText: { color: Colors.text, fontSize: FontSize.sm },

    sourcesPanel: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    sourcesTitle: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    sourcesCopy: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        lineHeight: 17,
        marginTop: 3,
        marginBottom: Spacing.sm,
    },
    sourceLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: 3,
    },
    sourceLinkText: {
        flex: 1,
        color: Colors.primary,
        fontSize: FontSize.xs,
        lineHeight: 17,
    },

    loadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    },
    typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    typingText: { color: Colors.textTertiary, fontSize: FontSize.sm },

    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
        borderTopWidth: 1, borderTopColor: Colors.border,
    },
    input: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        color: Colors.text, fontSize: FontSize.md, maxHeight: 100,
        borderWidth: 1, borderColor: Colors.border,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: Colors.surfaceLight },
});

// ── Card Styles ──────────────────────────────────────────────

const cardStyles = StyleSheet.create({
    container: {
        marginTop: Spacing.md, backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    icon: { fontSize: 20 },
    title: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
    desc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm },
    meta: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: Spacing.md },
    row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    rowNum: { color: Colors.textTertiary, fontSize: FontSize.sm, width: 20 },
    rowContent: { flex: 1 },
    rowTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    rowMeta: { color: Colors.textTertiary, fontSize: FontSize.xs },
    rowNotes: { color: Colors.textSecondary, fontSize: FontSize.xs, fontStyle: 'italic', marginTop: 2 },
    daySection: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
    dayTitle: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    mealRow: { marginBottom: Spacing.sm },
    mealType: { color: Colors.textTertiary, fontSize: FontSize.xxs, textTransform: 'uppercase', letterSpacing: 0.5 },
    mealName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    mealMacros: { color: Colors.textSecondary, fontSize: FontSize.xs },
    dayTotal: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: Spacing.xs },
});
