import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { chatCompletion, buildCoachingSystemPrompt, type OpenAIMessage } from '@/lib/openai';
import { OPENAI_API_KEY } from '@/constants/config';
import { generateId } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const QUICK_PROMPTS = [
    { icon: '🥗', text: 'Suggest a meal for my remaining macros' },
    { icon: '💪', text: 'Create a workout for today' },
    { icon: '📊', text: 'Analyze my progress this week' },
    { icon: '💤', text: 'Tips for better recovery' },
];

// Fallback responses when no API key is set
const DEMO_RESPONSES: Record<string, string> = {
    default: "I'm your FitFusion AI Coach! 💪\n\nTo enable live AI responses, add your OpenAI API key to the .env file (EXPO_PUBLIC_OPENAI_API_KEY).\n\nIn the meantime, I can still help you navigate the app. Try logging a workout, tracking your meals, or checking your progress!",
    meal: "Here's a balanced meal suggestion for your remaining macros:\n\n🍗 **Grilled Chicken Breast** (150g) — 248 kcal, 46g protein, 0g carbs, 5g fat\n🍚 **Brown Rice** (150g cooked) — 168 kcal, 4g protein, 36g carbs, 1g fat\n🥦 **Steamed Broccoli** (100g) — 35 kcal, 2g protein, 7g carbs, 0g fat\n\n**Total: ~451 kcal | 52g protein | 43g carbs | 6g fat**\n\nThis hits your protein target nicely while keeping fats low!",
    workout: "Here's a solid workout for today:\n\n**Upper Body Push (45 min)**\n\n1. Bench Press — 4×8 @ moderate weight\n2. Overhead Press — 3×10\n3. Incline DB Press — 3×12\n4. Lateral Raises — 3×15\n5. Tricep Pushdowns — 3×12\n6. Face Pulls — 3×15\n\n💡 **Tip:** Rest 90-120s between compound sets, 60s for isolation. Focus on controlled eccentrics!",
    progress: "Based on your activity:\n\n📈 **This Week's Summary:**\n- Workouts completed: Track more to see trends!\n- Average calorie adherence: Keep logging to build data\n- Protein goal hit: Aim for 4+ days this week\n\n🎯 **Focus Areas:**\n1. Consistency is key — try to log every meal\n2. Hit your protein target daily for optimal results\n3. Progressive overload — try to add weight or reps each week\n\nKeep pushing! Every workout counts. 🔥",
    recovery: "Here are my top recovery tips:\n\n😴 **Sleep:** Aim for 7-9 hours. This is when most muscle repair happens.\n\n💧 **Hydration:** Hit your water goal daily. Dehydration impairs recovery by 20-30%.\n\n🍗 **Post-Workout Nutrition:** Eat 20-40g protein within 2 hours of training.\n\n🧘 **Active Recovery:** Light walking, stretching, or yoga on rest days.\n\n🔄 **Deload Week:** Every 4-6 weeks, reduce volume by 40-50% to let your body catch up.\n\n📱 **Track Everything:** Use FitFusion to log sleep quality, soreness, and energy levels!",
};

function getDemoResponse(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('meal') || lower.includes('food') || lower.includes('eat') || lower.includes('macro')) return DEMO_RESPONSES.meal;
    if (lower.includes('workout') || lower.includes('exercise') || lower.includes('train')) return DEMO_RESPONSES.workout;
    if (lower.includes('progress') || lower.includes('week') || lower.includes('analyze')) return DEMO_RESPONSES.progress;
    if (lower.includes('recovery') || lower.includes('sleep') || lower.includes('rest') || lower.includes('tip')) return DEMO_RESPONSES.recovery;
    return DEMO_RESPONSES.default;
}

export default function AIChatScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const todaySummary = useNutritionStore((s) => s.todaySummary);
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hey${user?.display_name ? ` ${user.display_name}` : ''}! 👋 I'm your FitFusion AI Coach.\n\nI can help with:\n• Meal suggestions based on your remaining macros\n• Workout programming and exercise tips\n• Progress analysis and goal setting\n• Recovery and lifestyle advice\n\nWhat would you like help with?`,
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

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
            let responseText: string;

            if (OPENAI_API_KEY) {
                // Build conversation history for API
                const systemPrompt = buildCoachingSystemPrompt({
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
                });

                const apiMessages: OpenAIMessage[] = [
                    { role: 'system', content: systemPrompt },
                    ...messages.slice(-10).map((m) => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                    })),
                    { role: 'user' as const, content: text.trim() },
                ];

                responseText = await chatCompletion(apiMessages);
            } else {
                // Demo mode
                await new Promise((resolve) => setTimeout(resolve, 1000));
                responseText = getDemoResponse(text);
            }

            const assistantMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, user, todaySummary, recentWorkouts]);

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatar}>🤖</Text>
                    </View>
                )}
                <View style={[styles.messageContent, isUser ? styles.userContent : styles.assistantContent]}>
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.content}</Text>
                </View>
            </View>
        );
    }, []);

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
                        {OPENAI_API_KEY ? 'Powered by GPT-4o' : 'Demo Mode'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setMessages([messages[0]])}>
                    <Ionicons name="refresh-outline" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

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

            {/* Quick prompts (show when conversation is fresh) */}
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

            {/* Loading indicator */}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    headerCenter: { alignItems: 'center' },
    headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    headerSubtitle: { color: Colors.textTertiary, fontSize: FontSize.xs },

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
