/**
 * Mints an ephemeral OpenAI Realtime client_secret for an authenticated
 * BodyPilot user. The client uses this secret only for SDP negotiation
 * with OpenAI's WebRTC endpoint.
 *
 * Auth pattern matches openai-chat: caller sends Supabase JWT in the
 * Authorization header; we resolve the user, optionally check subscription
 * tier / rate limits, then mint a short-lived (~60s) token.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';
const ALLOWED_MODELS = new Set(['gpt-realtime-mini', 'gpt-realtime']);
const DEFAULT_MODEL = 'gpt-realtime-mini';
const ALLOWED_VOICES = new Set(['marin', 'cedar', 'alloy', 'shimmer', 'nova']);
const DEFAULT_VOICE = 'marin';

// Per-user soft rate limit (in-process; replace with a KV/DB-backed limiter
// if you deploy multiple function instances and care about a global cap).
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 25;
const recentRequests = new Map<string, number[]>();

const SAFETY_IDENTIFIER = 'bodypilot-orbit-voice';

const ORBIT_VOICE_INSTRUCTIONS = `You are Orbit, BodyPilot's friendly in-app fitness coach speaking to the user out loud.

VOICE STYLE
- Speak naturally. Use contractions ("you're", "let's", "I've").
- Reply in 1-2 short sentences, then ask a focused follow-up when it helps.
- Never read JSON, numbers character-by-character, code, or markdown out loud.
- Round numbers in speech: "about 500 milliliters", "roughly 30 grams of protein".

TOOLS
- ALWAYS call a tool to make any change. Do not say "I logged that" unless a tool actually returned success.
- For state-changing tools, call the tool first, then speak a one-sentence confirmation based on the tool's returned message.
- For read-only requests, call query_today_stats first.
- If a request is ambiguous, ask ONE clarifying question before calling a tool.
- Never invent macros. Pass food items by name with portion + meal type; the tool fills in calories/protein/carbs/fat.

SAFETY
- Never give medical, mental health, or eating-disorder advice. If asked, suggest a qualified professional.
- Never log negative quantities.`;

const ORBIT_TOOL_DEFINITIONS = [
    {
        type: 'function',
        name: 'log_water',
        description: 'Log a hydration entry for today.',
        parameters: {
            type: 'object',
            properties: { amount_ml: { type: 'number' } },
            required: ['amount_ml'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_food',
        description: 'Log one or more foods to a meal. Provide just name/quantity/unit; macros fill in automatically.',
        parameters: {
            type: 'object',
            properties: {
                meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
                items: {
                    type: 'array',
                    maxItems: 8,
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            quantity: { type: 'number' },
                            unit: { type: 'string' },
                        },
                        required: ['name', 'quantity', 'unit'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['items'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_workout_start',
        description: 'Begin a workout session and open the workout screen.',
        parameters: {
            type: 'object',
            properties: { name: { type: 'string' } },
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'log_workout_complete',
        description: "Finish the user's currently active workout.",
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        type: 'function',
        name: 'log_recovery',
        description: 'Log sleep + how the user feels today.',
        parameters: {
            type: 'object',
            properties: {
                sleep_hours: { type: 'number' },
                sleep_quality: { type: 'integer', minimum: 1, maximum: 5 },
                soreness_level: { type: 'integer', minimum: 0, maximum: 5 },
                mood: { type: 'integer', minimum: 1, maximum: 5 },
                energy_level: { type: 'integer', minimum: 1, maximum: 5 },
                stress_level: { type: 'integer', minimum: 1, maximum: 5 },
                notes: { type: 'string' },
            },
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'query_today_stats',
        description: "Read today's totals (calories, macros, water, steps, active workout, recovery).",
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        type: 'function',
        name: 'navigate',
        description: 'Open a screen. Destinations: home, nutrition, workout, recovery, progress, achievements, settings, log, cardio, meal plan, profile, water.',
        parameters: {
            type: 'object',
            properties: { destination: { type: 'string' } },
            required: ['destination'],
            additionalProperties: false,
        },
    },
    {
        type: 'function',
        name: 'end_conversation',
        description: 'End the voice session.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
];

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const stamps = (recentRequests.get(userId) ?? []).filter((t) => t > cutoff);
    if (stamps.length >= RATE_LIMIT_MAX) {
        recentRequests.set(userId, stamps);
        return false;
    }
    stamps.push(now);
    recentRequests.set(userId, stamps);
    return true;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return jsonResponse({ error: { message: 'Method not allowed' } }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!supabaseUrl || !anonKey || !apiKey) {
        return jsonResponse({ error: { message: 'Voice is not configured on the server' } }, 500);
    }

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) {
        return jsonResponse({ error: { message: 'Missing authorization token' } }, 401);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
        return jsonResponse({ error: { message: 'Invalid authorization token' } }, 401);
    }
    const userId = userData.user.id;

    if (!checkRateLimit(userId)) {
        return jsonResponse({ error: { message: 'Voice session limit reached. Try again later.' } }, 429);
    }

    let body: { model?: string; voice?: string } = {};
    try {
        body = (await req.json()) as { model?: string; voice?: string };
    } catch {
        // Empty body is fine.
    }

    const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
    const voice = body.voice && ALLOWED_VOICES.has(body.voice) ? body.voice : DEFAULT_VOICE;

    const sessionConfig = {
        type: 'realtime',
        model,
        instructions: ORBIT_VOICE_INSTRUCTIONS,
        output_modalities: ['audio'],
        tool_choice: 'auto',
        tools: ORBIT_TOOL_DEFINITIONS,
        audio: {
            input: {
                transcription: { model: 'gpt-4o-mini-transcribe' },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.55,
                    prefix_padding_ms: 200,
                    silence_duration_ms: 300,
                    create_response: true,
                    interrupt_response: true,
                },
            },
            output: { voice },
        },
    };

    const upstream = await fetch(CLIENT_SECRETS_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Safety-Identifier': SAFETY_IDENTIFIER,
        },
        body: JSON.stringify({
            session: sessionConfig,
            expires_after: { anchor: 'created_at', seconds: 60 },
        }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
        return jsonResponse(
            { error: { message: `OpenAI rejected the session: ${text.slice(0, 300)}` } },
            upstream.status,
        );
    }

    let parsed: Record<string, unknown> = {};
    try {
        parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
        return jsonResponse({ error: { message: 'Malformed response from OpenAI' } }, 502);
    }

    const value = typeof parsed.value === 'string' ? parsed.value : null;
    const expiresAt = typeof parsed.expires_at === 'number' ? parsed.expires_at : null;
    if (!value) {
        return jsonResponse({ error: { message: 'Missing client_secret value' } }, 502);
    }

    return jsonResponse({
        value,
        expires_at: expiresAt,
        model,
        voice,
    });
});
