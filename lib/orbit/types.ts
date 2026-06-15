export type OrbitConnectionState =
    | 'idle'
    | 'requesting_token'
    | 'requesting_mic'
    | 'negotiating'
    | 'connected'
    | 'disconnecting'
    | 'error';

export interface OrbitTranscriptEntry {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    isFinal: boolean;
    receivedAt: number;
}

export interface OrbitToolActivity {
    id: string;
    name: string;
    summary: string;
    success: boolean;
    completedAt: number;
}

export interface OrbitRealtimeError {
    code: string;
    message: string;
}

export type OrbitVoiceModel =
    | 'gpt-realtime-mini'
    | 'gpt-realtime';

export type OrbitVoiceVoice =
    | 'marin'
    | 'cedar'
    | 'alloy'
    | 'shimmer'
    | 'nova';
