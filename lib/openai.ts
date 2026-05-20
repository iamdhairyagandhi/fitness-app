import { AI_PROXY_ENABLED } from '@/constants/config';
import { supabase } from '@/lib/supabase';

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
    content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

export interface OpenAIChatCompletionResponse {
    choices: {
        message?: {
            role: string;
            content?: string;
            function_call?: {
                name: string;
                arguments: string;
            };
        };
    }[];
}

export interface OpenAIChatCompletionRequest {
    model: string;
    messages: OpenAIMessage[];
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: string };
    functions?: unknown[];
    function_call?: 'auto' | 'none' | { name: string };
}

export async function createOpenAIChatCompletion(
    body: OpenAIChatCompletionRequest,
): Promise<OpenAIChatCompletionResponse> {
    if (!AI_PROXY_ENABLED) {
        throw new Error('AI proxy not configured');
    }

    const { data, error } = await supabase.functions.invoke('openai-chat', { body });
    if (error) {
        throw new Error(error.message || 'AI request failed');
    }

    const response = data as OpenAIChatCompletionResponse & { error?: { message?: string } };
    if (response?.error) {
        throw new Error(response.error.message || 'AI request failed');
    }

    return response;
}

/**
 * Send a chat completion request to OpenAI GPT-4o-mini
 */
export async function chatCompletion(
    messages: OpenAIMessage[],
    options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
    const data = await createOpenAIChatCompletion({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: options?.maxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
    });

    return data.choices[0]?.message?.content ?? '';
}

/**
 * Analyze a food photo using GPT-4o Vision
 */
export async function analyzeFoodPhoto(base64Image: string): Promise<string> {
    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: 'You are a nutrition expert. Analyze the food in the image and return a JSON array of detected food items with estimated nutrition values. Each item should have: name, serving_size_g, calories, protein_g, carbs_g, fat_g. Be concise and accurate.',
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: 'What foods do you see in this image? Estimate the nutrition values.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
        },
    ];

    const data = await createOpenAIChatCompletion({
        model: 'gpt-4o',
        messages,
        max_tokens: 800,
        temperature: 0.3,
    });

    return data.choices[0]?.message?.content ?? '';
}

/**
 * Build the BodyPilot coaching system prompt with user context
 */
export function buildCoachingSystemPrompt(context: {
    name?: string;
    goal?: string;
    experience?: string;
    calorieTarget?: number;
    proteinTarget?: number;
    carbsTarget?: number;
    fatTarget?: number;
    todayCalories?: number;
    todayProtein?: number;
    recentWorkouts?: string[];
    streak?: number;
    dietTemplate?: string;
    dietPhase?: string;
    recoveryScore?: number;
    sleepHours?: number;
    bodyFatPct?: number;
    fastingActive?: boolean;
}): string {
    return `You are BodyPilot AI Coach, a friendly, knowledgeable fitness and nutrition assistant.

User Profile:
- Name: ${context.name || 'User'}
- Goal: ${context.goal || 'general fitness'}
- Experience: ${context.experience || 'intermediate'}
- Daily targets: ${context.calorieTarget || 2200} kcal, ${context.proteinTarget || 150}g protein, ${context.carbsTarget || 220}g carbs, ${context.fatTarget || 70}g fat
- Today's intake: ${context.todayCalories || 0} kcal, ${context.todayProtein || 0}g protein
- Current streak: ${context.streak || 0} days
${context.recentWorkouts?.length ? `- Recent workouts: ${context.recentWorkouts.join(', ')}` : ''}
${context.dietTemplate ? `- Diet template: ${context.dietTemplate}` : ''}
${context.dietPhase ? `- Diet phase: ${context.dietPhase}` : ''}
${context.recoveryScore != null ? `- Today's recovery score: ${context.recoveryScore}/100` : ''}
${context.sleepHours != null ? `- Last sleep: ${context.sleepHours}h` : ''}
${context.bodyFatPct != null ? `- Body fat: ~${context.bodyFatPct}%` : ''}
${context.fastingActive ? `- Currently fasting` : ''}

Guidelines:
- Be encouraging but honest
- Give specific, actionable advice
- Reference their goals, diet plan, and recovery data
- Keep responses concise (2-4 paragraphs max)
- For meal suggestions, respect their diet template and include estimated macros
- For workout advice, consider recovery score and recent training
- For recovery advice, reference their sleep quality and soreness
- Suggest progressive overload based on experience level
- Use emoji sparingly for emphasis`;
}
