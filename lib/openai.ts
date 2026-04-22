import { OPENAI_API_KEY } from '@/constants/config';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

/**
 * Send a chat completion request to OpenAI GPT-4o-mini
 */
export async function chatCompletion(
    messages: OpenAIMessage[],
    options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: options?.maxTokens ?? 500,
            temperature: options?.temperature ?? 0.7,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? '';
}

/**
 * Analyze a food photo using GPT-4o Vision
 */
export async function analyzeFoodPhoto(base64Image: string): Promise<string> {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

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

    const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 800,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Vision API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? '';
}

/**
 * Build the FitFusion coaching system prompt with user context
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
}): string {
    return `You are FitFusion AI Coach, a friendly, knowledgeable fitness and nutrition assistant.

User Profile:
- Name: ${context.name || 'User'}
- Goal: ${context.goal || 'general fitness'}
- Experience: ${context.experience || 'intermediate'}
- Daily targets: ${context.calorieTarget || 2200} kcal, ${context.proteinTarget || 150}g protein, ${context.carbsTarget || 220}g carbs, ${context.fatTarget || 70}g fat
- Today's intake: ${context.todayCalories || 0} kcal, ${context.todayProtein || 0}g protein
- Current streak: ${context.streak || 0} days
${context.recentWorkouts?.length ? `- Recent workouts: ${context.recentWorkouts.join(', ')}` : ''}

Guidelines:
- Be encouraging but honest
- Give specific, actionable advice
- Reference their goals and progress
- Keep responses concise (2-4 paragraphs max)
- For meal suggestions, include estimated macros
- For workout advice, suggest specific exercises, sets, and reps
- Use emoji sparingly for emphasis`;
}
