/**
 * FitFusion AI Engine — Phase 5
 *
 * Provides:
 * - Function-calling chat completions (the AI can create workouts, meal plans, log food, etc.)
 * - Structured workout generation
 * - Structured meal plan generation
 * - Weekly report analysis
 * - Daily insight generation
 * - Correlation analysis
 */

import { OPENAI_API_KEY } from '@/constants/config';
import type { OpenAIMessage } from '@/lib/openai';
import { buildCoachingSystemPrompt } from '@/lib/openai';
import type {
    AIGeneratedMealPlan,
    AIGeneratedWorkout,
    CorrelationInsight,
    RecoveryLog,
    WeeklyReport,
    WorkoutSession,
} from '@/types';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// ── OpenAI Function Definitions ──────────────────────────────

const AI_FUNCTIONS = [
    {
        name: 'create_workout',
        description: 'Create a structured workout plan for the user. Call this when the user asks you to create, generate, or suggest a workout.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Workout name, e.g. "Upper Body Push Day"' },
                description: { type: 'string', description: 'Brief description of the workout' },
                estimated_duration_min: { type: 'number', description: 'Estimated duration in minutes' },
                exercises: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            exercise_name: { type: 'string' },
                            sets: { type: 'number' },
                            reps: { type: 'string', description: 'e.g. "8-12" or "5"' },
                            rest_seconds: { type: 'number' },
                            notes: { type: 'string' },
                        },
                        required: ['exercise_name', 'sets', 'reps', 'rest_seconds'],
                    },
                },
            },
            required: ['name', 'exercises', 'estimated_duration_min'],
        },
    },
    {
        name: 'generate_meal_plan',
        description: 'Generate a multi-day meal plan fitted to the user\'s macro targets. Call this when the user asks for a meal plan.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Meal plan name' },
                days: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            day: { type: 'string', description: 'e.g. "Monday" or "Day 1"' },
                            meals: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
                                        name: { type: 'string' },
                                        calories: { type: 'number' },
                                        protein_g: { type: 'number' },
                                        carbs_g: { type: 'number' },
                                        fat_g: { type: 'number' },
                                        ingredients: { type: 'array', items: { type: 'string' } },
                                        instructions: { type: 'string' },
                                    },
                                    required: ['meal_type', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
                                },
                            },
                            total_calories: { type: 'number' },
                            total_protein_g: { type: 'number' },
                            total_carbs_g: { type: 'number' },
                            total_fat_g: { type: 'number' },
                        },
                        required: ['day', 'meals', 'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g'],
                    },
                },
            },
            required: ['name', 'days'],
        },
    },
    {
        name: 'analyze_progress',
        description: 'Provide a structured progress analysis with metrics and recommendations. Call this when the user asks about their progress or weekly summary.',
        parameters: {
            type: 'object',
            properties: {
                summary: { type: 'string', description: 'Overall progress summary' },
                strengths: { type: 'array', items: { type: 'string' } },
                improvements: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
            },
            required: ['summary', 'strengths', 'improvements', 'recommendations'],
        },
    },
];

// ── Chat with function calling ───────────────────────────────

export interface FunctionCallResult {
    functionName: string;
    args: Record<string, unknown>;
    textResponse: string;
}

export interface AIResponse {
    text: string;
    functionCall?: FunctionCallResult;
}

export async function chatWithFunctions(
    messages: OpenAIMessage[],
    options?: { maxTokens?: number; temperature?: number },
): Promise<AIResponse> {
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
            max_tokens: options?.maxTokens ?? 2000,
            temperature: options?.temperature ?? 0.7,
            functions: AI_FUNCTIONS,
            function_call: 'auto',
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    if (choice?.message?.function_call) {
        const fc = choice.message.function_call;
        let args: Record<string, unknown> = {};
        try {
            args = JSON.parse(fc.arguments);
        } catch { /* empty */ }

        // Now get a natural language description of what was generated
        const followUp = await fetch(OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    ...messages,
                    choice.message,
                    {
                        role: 'function',
                        name: fc.name,
                        content: JSON.stringify(args),
                    },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        let textResponse = '';
        if (followUp.ok) {
            const followUpData = await followUp.json();
            textResponse = followUpData.choices[0]?.message?.content ?? '';
        }

        return {
            text: textResponse,
            functionCall: {
                functionName: fc.name,
                args,
                textResponse,
            },
        };
    }

    return { text: choice?.message?.content ?? '' };
}

// ── Workout generation ───────────────────────────────────────

export async function generateWorkoutPlan(context: {
    goal: string;
    experience: string;
    focusMuscles?: string[];
    durationMin?: number;
    equipment?: string[];
    recentWorkouts?: string[];
}): Promise<AIGeneratedWorkout> {
    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are an expert strength coach. Generate a structured workout plan.
The user's goal is: ${context.goal}
Experience level: ${context.experience}
${context.focusMuscles?.length ? `Focus muscles: ${context.focusMuscles.join(', ')}` : ''}
${context.durationMin ? `Target duration: ${context.durationMin} min` : ''}
${context.equipment?.length ? `Available equipment: ${context.equipment.join(', ')}` : 'All equipment available'}
${context.recentWorkouts?.length ? `Recent workouts (avoid overlap): ${context.recentWorkouts.join(', ')}` : ''}

You MUST call the create_workout function with the workout data.`,
        },
        { role: 'user', content: 'Create a workout plan for me based on my profile.' },
    ];

    const result = await chatWithFunctions(messages, { maxTokens: 2000, temperature: 0.6 });

    if (result.functionCall?.functionName === 'create_workout') {
        return result.functionCall.args as unknown as AIGeneratedWorkout;
    }

    // Fallback: parse from text
    throw new Error('AI did not generate a structured workout');
}

// ── Meal plan generation ─────────────────────────────────────

export async function generateMealPlan(context: {
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    dietTemplate?: string;
    allergies?: string[];
    excludedFoods?: string[];
    cuisines?: string[];
    numDays?: number;
}): Promise<AIGeneratedMealPlan> {
    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are an expert nutritionist. Generate a structured meal plan.
Daily targets: ${context.calorieTarget} kcal, ${context.proteinTarget}g protein, ${context.carbsTarget}g carbs, ${context.fatTarget}g fat
${context.dietTemplate ? `Diet: ${context.dietTemplate}` : ''}
${context.allergies?.length ? `Allergies: ${context.allergies.join(', ')}` : ''}
${context.excludedFoods?.length ? `Excluded foods: ${context.excludedFoods.join(', ')}` : ''}
${context.cuisines?.length ? `Preferred cuisines: ${context.cuisines.join(', ')}` : ''}
Number of days: ${context.numDays || 3}

You MUST call the generate_meal_plan function with the meal plan data.
Each day should hit the calorie and macro targets as closely as possible.`,
        },
        { role: 'user', content: `Generate a ${context.numDays || 3}-day meal plan that fits my macros.` },
    ];

    const result = await chatWithFunctions(messages, { maxTokens: 3000, temperature: 0.6 });

    if (result.functionCall?.functionName === 'generate_meal_plan') {
        return result.functionCall.args as unknown as AIGeneratedMealPlan;
    }

    throw new Error('AI did not generate a structured meal plan');
}

// ── Weekly report generation ─────────────────────────────────

export async function generateWeeklyReport(data: {
    workouts: WorkoutSession[];
    avgCalories: number;
    avgProtein: number;
    weightChange: number;
    newPRs: number;
    streakDays: number;
    recoveryAvg: number;
    recoveryLogs: RecoveryLog[];
    goal: string;
    experience: string;
}): Promise<{
    summary: string;
    recommendations: string[];
    highlights: string[];
    correlations: CorrelationInsight[];
}> {
    if (!OPENAI_API_KEY) {
        return {
            summary: getOfflineWeeklySummary(data),
            recommendations: getOfflineRecommendations(data),
            highlights: getOfflineHighlights(data),
            correlations: [],
        };
    }

    const workoutDesc = data.workouts
        .map((w) => `${w.name} (${w.exercises.length} exercises, ${w.total_volume_kg}kg volume)`)
        .join('; ');

    const recoveryDesc = data.recoveryLogs
        .map((r) => `${r.date}: sleep ${r.sleep_hours}h, score ${r.recovery_score}/100, energy ${r.energy_level}/5`)
        .join('; ');

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are a fitness analytics AI. Analyze the user's weekly data and provide insights.
Return JSON with: { "summary": string, "recommendations": string[], "highlights": string[], "correlations": [{"metric_a": string, "metric_b": string, "correlation": number, "description": string, "recommendation": string}] }
Be specific and data-driven. Reference actual numbers.`,
        },
        {
            role: 'user',
            content: `Weekly stats:
- Goal: ${data.goal}, Experience: ${data.experience}
- Workouts: ${data.workouts.length} sessions. ${workoutDesc}
- Avg calories: ${data.avgCalories}, Avg protein: ${data.avgProtein}g
- Weight change: ${data.weightChange > 0 ? '+' : ''}${data.weightChange}kg
- New PRs: ${data.newPRs}
- Streak: ${data.streakDays} days
- Recovery avg: ${data.recoveryAvg}/100
- Recovery logs: ${recoveryDesc || 'none recorded'}

Analyze this data and identify patterns, correlations, and recommendations.`,
        },
    ];

    try {
        const response = await fetch(OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 1500,
                temperature: 0.5,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) throw new Error('API error');

        const result = await response.json();
        const parsed = JSON.parse(result.choices[0]?.message?.content || '{}');

        return {
            summary: parsed.summary || '',
            recommendations: parsed.recommendations || [],
            highlights: parsed.highlights || [],
            correlations: (parsed.correlations || []).map((c: any, i: number) => ({
                id: `corr-${i}`,
                ...c,
            })),
        };
    } catch {
        return {
            summary: getOfflineWeeklySummary(data),
            recommendations: getOfflineRecommendations(data),
            highlights: getOfflineHighlights(data),
            correlations: [],
        };
    }
}

// ── Daily insight generation ─────────────────────────────────

export async function generateDailyInsight(context: {
    name: string;
    calorieTarget: number;
    todayCalories: number;
    proteinTarget: number;
    todayProtein: number;
    streak: number;
    lastWorkout?: string;
    recoveryScore?: number;
    goal: string;
}): Promise<{ text: string; type: string }> {
    if (!OPENAI_API_KEY) {
        return getOfflineDailyInsight(context);
    }

    const messages: OpenAIMessage[] = [
        {
            role: 'system',
            content: `You are FitFusion AI. Generate a single concise daily insight (2-3 sentences max) for the user.
Be specific to their data. Use one relevant emoji. Return JSON: {"text": string, "type": "nutrition"|"workout"|"recovery"|"motivation"|"general"}`,
        },
        {
            role: 'user',
            content: `Name: ${context.name}, Goal: ${context.goal}
Today: ${context.todayCalories}/${context.calorieTarget} kcal, ${context.todayProtein}/${context.proteinTarget}g protein
Streak: ${context.streak} days
${context.lastWorkout ? `Last workout: ${context.lastWorkout}` : 'No recent workout'}
${context.recoveryScore != null ? `Recovery: ${context.recoveryScore}/100` : ''}`,
        },
    ];

    try {
        const response = await fetch(OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 200,
                temperature: 0.8,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) throw new Error('API error');
        const result = await response.json();
        const parsed = JSON.parse(result.choices[0]?.message?.content || '{}');
        return { text: parsed.text || '', type: parsed.type || 'general' };
    } catch {
        return getOfflineDailyInsight(context);
    }
}

// ── Correlation analysis ─────────────────────────────────────

export function analyzeCorrelations(
    workouts: WorkoutSession[],
    recoveryLogs: RecoveryLog[],
): CorrelationInsight[] {
    const insights: CorrelationInsight[] = [];

    // Sleep hours vs recovery score
    const sleepRecovery = recoveryLogs.filter((r) => r.sleep_hours != null && r.recovery_score > 0);
    if (sleepRecovery.length >= 3) {
        const avgSleep = sleepRecovery.reduce((s, r) => s + (r.sleep_hours || 0), 0) / sleepRecovery.length;
        const goodSleep = sleepRecovery.filter((r) => (r.sleep_hours || 0) >= 7);
        const poorSleep = sleepRecovery.filter((r) => (r.sleep_hours || 0) < 7);
        const goodAvgRecovery = goodSleep.length ? goodSleep.reduce((s, r) => s + r.recovery_score, 0) / goodSleep.length : 0;
        const poorAvgRecovery = poorSleep.length ? poorSleep.reduce((s, r) => s + r.recovery_score, 0) / poorSleep.length : 0;

        if (goodSleep.length > 0 && poorSleep.length > 0) {
            const diff = goodAvgRecovery - poorAvgRecovery;
            const corr = Math.min(diff / 50, 1);
            insights.push({
                id: 'sleep-recovery',
                metric_a: 'Sleep Hours',
                metric_b: 'Recovery Score',
                correlation: Math.round(corr * 100) / 100,
                description: `When you sleep 7+ hours (avg ${avgSleep.toFixed(1)}h), your recovery score is ${Math.round(goodAvgRecovery)} vs ${Math.round(poorAvgRecovery)} on poor sleep nights.`,
                recommendation: diff > 10
                    ? 'Prioritize 7+ hours of sleep — it significantly boosts your recovery.'
                    : 'Your sleep patterns show consistent recovery. Keep it up!',
            });
        }
    }

    // Workout frequency vs volume progress
    if (workouts.length >= 4) {
        const sorted = [...workouts].sort((a, b) => a.started_at.localeCompare(b.started_at));
        const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
        const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
        const firstAvgVol = firstHalf.reduce((s, w) => s + w.total_volume_kg, 0) / firstHalf.length;
        const secondAvgVol = secondHalf.reduce((s, w) => s + w.total_volume_kg, 0) / secondHalf.length;

        if (firstAvgVol > 0) {
            const volumeChange = ((secondAvgVol - firstAvgVol) / firstAvgVol) * 100;
            insights.push({
                id: 'volume-progression',
                metric_a: 'Training Frequency',
                metric_b: 'Volume Progression',
                correlation: Math.min(Math.max(volumeChange / 100, -1), 1),
                description: `Your training volume ${volumeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(volumeChange))}% over the period.`,
                recommendation: volumeChange > 5
                    ? 'Great progressive overload! Keep gradually increasing volume.'
                    : volumeChange < -5
                        ? 'Volume trending down — consider a structured progression plan.'
                        : 'Volume is stable. Try adding a small increment to drive adaptation.',
            });
        }
    }

    // Stress vs energy
    const stressEnergy = recoveryLogs.filter((r) => r.stress_level != null && r.energy_level != null);
    if (stressEnergy.length >= 3) {
        const highStress = stressEnergy.filter((r) => (r.stress_level || 0) >= 4);
        const lowStress = stressEnergy.filter((r) => (r.stress_level || 0) <= 2);
        const highStressEnergy = highStress.length ? highStress.reduce((s, r) => s + (r.energy_level || 0), 0) / highStress.length : 0;
        const lowStressEnergy = lowStress.length ? lowStress.reduce((s, r) => s + (r.energy_level || 0), 0) / lowStress.length : 0;

        if (highStress.length > 0 && lowStress.length > 0) {
            insights.push({
                id: 'stress-energy',
                metric_a: 'Stress Level',
                metric_b: 'Energy Level',
                correlation: -Math.min((lowStressEnergy - highStressEnergy) / 3, 1),
                description: `On high-stress days your energy averages ${highStressEnergy.toFixed(1)}/5 vs ${lowStressEnergy.toFixed(1)}/5 on calm days.`,
                recommendation: highStressEnergy < lowStressEnergy - 0.5
                    ? 'Stress is impacting your energy. Consider lighter workouts on high-stress days.'
                    : 'You handle stress well — your energy stays consistent regardless.',
            });
        }
    }

    return insights;
}

// ── Offline fallbacks ────────────────────────────────────────

function getOfflineWeeklySummary(data: {
    workouts: WorkoutSession[];
    avgCalories: number;
    avgProtein: number;
    weightChange: number;
    newPRs: number;
    streakDays: number;
}): string {
    const parts: string[] = [];
    parts.push(`You completed ${data.workouts.length} workout${data.workouts.length !== 1 ? 's' : ''} this week.`);
    if (data.avgCalories > 0) parts.push(`Average daily intake was ${Math.round(data.avgCalories)} kcal with ${Math.round(data.avgProtein)}g protein.`);
    if (data.weightChange !== 0) parts.push(`Weight ${data.weightChange > 0 ? 'up' : 'down'} ${Math.abs(data.weightChange).toFixed(1)}kg.`);
    if (data.newPRs > 0) parts.push(`You hit ${data.newPRs} new personal record${data.newPRs !== 1 ? 's' : ''}! 🎉`);
    if (data.streakDays > 0) parts.push(`Streak: ${data.streakDays} days strong. 🔥`);
    return parts.join(' ');
}

function getOfflineRecommendations(data: {
    workouts: WorkoutSession[];
    avgProtein: number;
    recoveryAvg: number;
}): string[] {
    const recs: string[] = [];
    if (data.workouts.length < 3) recs.push('Try to hit at least 3 workouts per week for optimal progress.');
    if (data.avgProtein < 100) recs.push('Increase protein intake — aim for at least 1.6g per kg of body weight.');
    if (data.recoveryAvg < 60) recs.push('Your recovery is low. Focus on sleep quality and stress management.');
    if (data.workouts.length >= 5) recs.push('Great frequency! Make sure to include at least 1-2 rest days.');
    if (recs.length === 0) recs.push('Keep up the great work! Consistency is your biggest advantage.');
    return recs;
}

function getOfflineHighlights(data: {
    workouts: WorkoutSession[];
    newPRs: number;
    streakDays: number;
}): string[] {
    const highlights: string[] = [];
    if (data.workouts.length > 0) {
        const totalVolume = data.workouts.reduce((s, w) => s + w.total_volume_kg, 0);
        highlights.push(`Moved ${Math.round(totalVolume).toLocaleString()}kg total volume`);
    }
    if (data.newPRs > 0) highlights.push(`${data.newPRs} new personal record${data.newPRs !== 1 ? 's' : ''}`);
    if (data.streakDays >= 7) highlights.push(`${data.streakDays}-day streak maintained`);
    return highlights;
}

function getOfflineDailyInsight(context: {
    todayCalories: number;
    calorieTarget: number;
    todayProtein: number;
    proteinTarget: number;
    streak: number;
    lastWorkout?: string;
}): { text: string; type: string } {
    const calPct = context.calorieTarget > 0 ? Math.round((context.todayCalories / context.calorieTarget) * 100) : 0;
    const protPct = context.proteinTarget > 0 ? Math.round((context.todayProtein / context.proteinTarget) * 100) : 0;

    if (calPct === 0 && protPct === 0) {
        if (context.streak > 0) {
            return {
                text: `🔥 ${context.streak}-day streak! Start logging today's meals to keep the momentum going.`,
                type: 'motivation',
            };
        }
        return {
            text: '💡 Start your day right — log your first meal to track your nutrition progress.',
            type: 'general',
        };
    }

    if (protPct < 50 && calPct > 60) {
        return {
            text: `🥩 You've hit ${calPct}% of calories but only ${protPct}% of protein. Prioritize protein-rich foods for your remaining meals.`,
            type: 'nutrition',
        };
    }

    if (calPct >= 90 && protPct >= 80) {
        return {
            text: `✅ Great nutrition day — ${calPct}% calories, ${protPct}% protein. You're crushing your targets!`,
            type: 'nutrition',
        };
    }

    if (context.streak >= 7) {
        return {
            text: `🔥 ${context.streak}-day streak! Consistency compounds. You're building habits that last.`,
            type: 'motivation',
        };
    }

    return {
        text: `📊 ${calPct}% of daily calories, ${protPct}% of protein target. ${100 - calPct > 30 ? 'Room for a solid meal!' : 'Almost there!'}`,
        type: 'nutrition',
    };
}
