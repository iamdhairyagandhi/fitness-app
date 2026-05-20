const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4o']);
const MAX_TOKENS_LIMIT = 3000;

type ChatBody = {
    model?: string;
    messages?: unknown;
    max_tokens?: number;
    temperature?: number;
    response_format?: unknown;
    functions?: unknown;
    function_call?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

function clampMaxTokens(value: unknown) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 500;
    return Math.max(1, Math.min(Math.round(value), MAX_TOKENS_LIMIT));
}

function clampTemperature(value: unknown) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0.7;
    return Math.max(0, Math.min(value, 2));
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: { message: 'Method not allowed' } }, 405);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
        return jsonResponse({ error: { message: 'OPENAI_API_KEY is not configured' } }, 500);
    }

    let body: ChatBody;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: { message: 'Invalid JSON body' } }, 400);
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 40) {
        return jsonResponse({ error: { message: 'messages must be a non-empty array of at most 40 items' } }, 400);
    }

    const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : 'gpt-4o-mini';
    const payload: Record<string, unknown> = {
        model,
        messages: body.messages,
        max_tokens: clampMaxTokens(body.max_tokens),
        temperature: clampTemperature(body.temperature),
    };

    if (body.response_format) payload.response_format = body.response_format;
    if (Array.isArray(body.functions)) payload.functions = body.functions;
    if (body.function_call) payload.function_call = body.function_call;

    const upstream = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(text, {
        status: upstream.status,
        headers: {
            ...corsHeaders,
            'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        },
    });
});
