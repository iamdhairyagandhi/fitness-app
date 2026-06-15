/**
 * OrbitRealtimeSession
 *
 * Manages a single OpenAI Realtime voice call over WebRTC.
 *
 * High-level flow:
 *   1. Mint an ephemeral client_secret via our Supabase Edge Function.
 *   2. Get mic permission via `react-native-webrtc`'s `getUserMedia`.
 *   3. Open RTCPeerConnection + 'oai-events' data channel.
 *   4. Generate SDP offer, POST to https://api.openai.com/v1/realtime/calls
 *      with `Content-Type: application/sdp`, apply SDP answer.
 *   5. Listen on the data channel for transcript/tool/error events.
 *   6. On tool call: cancel any in-flight audio response, execute the tool,
 *      send `conversation.item.create` (function_call_output) followed by
 *      an explicit `response.create` so the model speaks a confirmation.
 *
 * Cancellation semantics:
 *   - User barge-in → server VAD fires; we also forward `output_audio_buffer.clear`.
 *   - Tool result → before adding the function_call_output we send
 *     `response.cancel` + `output_audio_buffer.clear` so the model doesn't
 *     keep talking over the side-effect message.
 *   - App background → mute + 30s grace, then disconnect.
 */

import EventEmitter from 'eventemitter3';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/utils';
import { acquireAudio, releaseAudio } from './audioCoordinator';
import { ORBIT_TERMINATING_TOOLS, ORBIT_TOOL_HANDLERS, type OrbitToolHandler, type OrbitToolResult } from './tools';
import type {
    OrbitConnectionState,
    OrbitRealtimeError,
    OrbitToolActivity,
    OrbitTranscriptEntry,
    OrbitVoiceModel,
    OrbitVoiceVoice,
} from './types';

// `react-native-webrtc` provides these at runtime when the native module is
// installed and prebuilt. We use a soft-require so the JS bundles & type-checks
// cleanly on machines that haven't run pod-install yet (e.g. Windows dev).
interface WebRTCBindings {
    RTCPeerConnection: typeof RTCPeerConnection;
    mediaDevices: { getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> };
}

function loadWebRTC(): WebRTCBindings | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('react-native-webrtc') as WebRTCBindings;
        if (mod?.RTCPeerConnection && mod?.mediaDevices) return mod;
    } catch {
        // Module not installed yet; voice button will surface a helpful error.
    }
    return null;
}

export interface OrbitSessionOptions {
    model?: OrbitVoiceModel;
    voice?: OrbitVoiceVoice;
}

interface ServerEventBase {
    type: string;
    event_id?: string;
}

interface FunctionCallArgumentsDoneEvent extends ServerEventBase {
    type: 'response.function_call_arguments.done';
    call_id: string;
    name: string;
    arguments: string;
    response_id?: string;
}

interface AudioTranscriptDeltaEvent extends ServerEventBase {
    type:
    | 'response.output_audio_transcript.delta'
    | 'response.audio_transcript.delta';
    delta: string;
    response_id: string;
    item_id: string;
}

interface AudioTranscriptDoneEvent extends ServerEventBase {
    type:
    | 'response.output_audio_transcript.done'
    | 'response.audio_transcript.done';
    transcript: string;
    response_id: string;
    item_id: string;
}

interface InputTranscriptionDeltaEvent extends ServerEventBase {
    type: 'conversation.item.input_audio_transcription.delta';
    delta: string;
    item_id: string;
}

interface InputTranscriptionCompletedEvent extends ServerEventBase {
    type: 'conversation.item.input_audio_transcription.completed';
    transcript: string;
    item_id: string;
}

interface InputSpeechStartedEvent extends ServerEventBase {
    type: 'input_audio_buffer.speech_started';
}

interface InputSpeechStoppedEvent extends ServerEventBase {
    type: 'input_audio_buffer.speech_stopped';
}

interface ErrorEvent extends ServerEventBase {
    type: 'error';
    error: { type: string; message: string; code?: string };
}

type ServerEvent =
    | FunctionCallArgumentsDoneEvent
    | AudioTranscriptDeltaEvent
    | AudioTranscriptDoneEvent
    | InputTranscriptionDeltaEvent
    | InputTranscriptionCompletedEvent
    | InputSpeechStartedEvent
    | InputSpeechStoppedEvent
    | ErrorEvent
    | ServerEventBase;

interface MintTokenResponse {
    value: string;
    expires_at?: number;
    model: string;
    voice?: string;
}

const REALTIME_CALL_URL = 'https://api.openai.com/v1/realtime/calls';
const EDGE_FUNCTION_NAME = 'realtime-session';

export interface OrbitSessionEvents {
    state: (next: OrbitConnectionState) => void;
    error: (err: OrbitRealtimeError) => void;
    transcript: (entry: OrbitTranscriptEntry) => void;
    tool: (activity: OrbitToolActivity) => void;
    speakingStarted: () => void;
    speakingStopped: () => void;
}

export class OrbitRealtimeSession extends EventEmitter<OrbitSessionEvents> {
    private state: OrbitConnectionState = 'idle';
    private peer: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private localStream: MediaStream | null = null;
    private currentAssistantItemId: string | null = null;
    private pendingTranscript: Map<string, string> = new Map();
    private inFlightToolCalls: Set<string> = new Set();
    private endRequested = false;
    private toolHandlers: Record<string, OrbitToolHandler>;
    private muted = false;

    constructor(toolHandlers: Record<string, OrbitToolHandler> = ORBIT_TOOL_HANDLERS) {
        super();
        this.toolHandlers = toolHandlers;
    }

    getState(): OrbitConnectionState {
        return this.state;
    }

    private setState(next: OrbitConnectionState) {
        this.state = next;
        this.emit('state', next);
    }

    /** Open a fresh realtime voice session. Resolves once SDP is negotiated. */
    async connect(options: OrbitSessionOptions = {}): Promise<void> {
        if (this.state !== 'idle' && this.state !== 'error') {
            return;
        }

        const webrtc = loadWebRTC();
        if (!webrtc) {
            const err: OrbitRealtimeError = {
                code: 'webrtc_not_installed',
                message: 'Voice needs a custom dev build with react-native-webrtc. Run prebuild + install on macOS.',
            };
            this.emit('error', err);
            this.setState('error');
            throw new Error(err.message);
        }

        this.endRequested = false;

        // Acquire the audio session before WebRTC asks for the mic.
        await acquireAudio('orbit-voice', () => this.disconnect());

        try {
            this.setState('requesting_token');
            const token = await this.mintEphemeralKey(options);

            this.setState('requesting_mic');
            const localStream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
            this.localStream = localStream;

            this.setState('negotiating');
            const peer = new webrtc.RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            this.peer = peer;

            // Add local mic track.
            for (const track of localStream.getAudioTracks()) {
                peer.addTrack(track, localStream);
            }

            // We must add a recv transceiver so remote audio arrives.
            // react-native-webrtc plays the remote stream automatically through
            // the iOS audio session — no <audio> tag needed.
            try {
                peer.addTransceiver('audio', { direction: 'recvonly' });
            } catch {
                // Some platforms infer this from getUserMedia.
            }

            const dataChannel = peer.createDataChannel('oai-events');
            this.dataChannel = dataChannel;
            this.wireDataChannel(dataChannel);

            // Wait briefly for the data channel to open so we can immediately
            // send a `response.create` greeting after SDP completes.
            peer.addEventListener?.('connectionstatechange' as never, (() => {
                const cs = (peer as unknown as { connectionState?: string }).connectionState;
                if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
                    this.handleFatalError({ code: 'connection_state', message: `Connection ${cs}` });
                }
            }) as never);

            const offer = await peer.createOffer({});
            await peer.setLocalDescription(offer);

            const sdpOffer = (peer.localDescription?.sdp ?? offer.sdp) || '';
            const sdpResp = await fetch(`${REALTIME_CALL_URL}?model=${encodeURIComponent(token.model)}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token.value}`,
                    'Content-Type': 'application/sdp',
                },
                body: sdpOffer,
            });
            if (!sdpResp.ok) {
                const text = await sdpResp.text().catch(() => '');
                throw new Error(`SDP exchange failed (${sdpResp.status}): ${text.slice(0, 200)}`);
            }
            const answerSdp = await sdpResp.text();
            await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp } as RTCSessionDescriptionInit);

            // Wait for data channel to open before declaring connected.
            await this.waitForDataChannelOpen(dataChannel, 8000);

            this.setState('connected');
            // Kick the first turn so Orbit greets immediately.
            this.sendEvent({ type: 'response.create', response: {} });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to connect.';
            await this.cleanup();
            this.handleFatalError({ code: 'connect_failed', message: msg });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.state === 'idle' || this.state === 'disconnecting') return;
        this.setState('disconnecting');
        await this.cleanup();
        this.setState('idle');
    }

    setMuted(muted: boolean) {
        if (!this.localStream) return;
        this.muted = muted;
        for (const track of this.localStream.getAudioTracks()) {
            track.enabled = !muted;
        }
    }

    isMuted(): boolean {
        return this.muted;
    }

    sendTextInput(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        this.sendEvent({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: trimmed }],
            },
        });
        this.sendEvent({ type: 'response.create', response: {} });
    }

    /** Cancel any in-flight model response (e.g. user wants to interrupt). */
    interrupt() {
        this.sendEvent({ type: 'response.cancel' });
        this.sendEvent({ type: 'output_audio_buffer.clear' });
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    private async mintEphemeralKey(options: OrbitSessionOptions): Promise<MintTokenResponse> {
        const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
            body: {
                model: options.model,
                voice: options.voice,
                platform: Platform.OS,
            },
        });

        if (error) {
            throw new Error(error.message || 'Could not start a voice session');
        }
        const payload = data as MintTokenResponse & { error?: { message?: string } };
        if (payload?.error) {
            throw new Error(payload.error.message || 'Voice session refused');
        }
        if (!payload?.value || !payload?.model) {
            throw new Error('Voice session token was malformed');
        }
        return payload;
    }

    private wireDataChannel(channel: RTCDataChannel) {
        channel.addEventListener?.('message', ((event: MessageEvent) => {
            this.handleServerEventRaw(typeof event.data === 'string' ? event.data : '');
        }) as never);
        channel.addEventListener?.('error', ((event: Event) => {
            const native = event as unknown as { error?: { message?: string } };
            const msg = native.error?.message || 'Data channel error';
            this.handleFatalError({ code: 'datachannel_error', message: msg });
        }) as never);
    }

    private waitForDataChannelOpen(channel: RTCDataChannel, timeoutMs: number): Promise<void> {
        if (channel.readyState === 'open') return Promise.resolve();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Data channel did not open in time'));
            }, timeoutMs);
            const onOpen = () => {
                clearTimeout(timer);
                channel.removeEventListener?.('open', onOpen as never);
                resolve();
            };
            channel.addEventListener?.('open', onOpen as never);
        });
    }

    private sendEvent(event: Record<string, unknown>) {
        const channel = this.dataChannel;
        if (!channel || channel.readyState !== 'open') return;
        try {
            channel.send(JSON.stringify(event));
        } catch (err) {
            // Channel may have just closed; not fatal.
        }
    }

    private handleServerEventRaw(raw: string) {
        if (!raw) return;
        let event: ServerEvent;
        try {
            event = JSON.parse(raw) as ServerEvent;
        } catch {
            return;
        }
        this.handleServerEvent(event);
    }

    private handleServerEvent(event: ServerEvent) {
        switch (event.type) {
            case 'response.output_audio_transcript.delta':
            case 'response.audio_transcript.delta':
                this.handleAssistantDelta(event as AudioTranscriptDeltaEvent);
                break;
            case 'response.output_audio_transcript.done':
            case 'response.audio_transcript.done':
                this.handleAssistantDone(event as AudioTranscriptDoneEvent);
                break;
            case 'conversation.item.input_audio_transcription.delta':
                this.handleUserDelta(event as InputTranscriptionDeltaEvent);
                break;
            case 'conversation.item.input_audio_transcription.completed':
                this.handleUserCompleted(event as InputTranscriptionCompletedEvent);
                break;
            case 'input_audio_buffer.speech_started':
                this.emit('speakingStarted');
                break;
            case 'input_audio_buffer.speech_stopped':
                this.emit('speakingStopped');
                break;
            case 'response.function_call_arguments.done':
                void this.handleFunctionCall(event as FunctionCallArgumentsDoneEvent);
                break;
            case 'response.done':
                if (this.endRequested) {
                    void this.disconnect();
                }
                break;
            case 'error':
                this.emit('error', {
                    code: (event as ErrorEvent).error?.code || (event as ErrorEvent).error?.type || 'unknown',
                    message: (event as ErrorEvent).error?.message || 'Realtime error',
                });
                break;
            default:
                break;
        }
    }

    private handleAssistantDelta(event: AudioTranscriptDeltaEvent) {
        const id = event.item_id;
        const prev = this.pendingTranscript.get(id) ?? '';
        const next = prev + (event.delta || '');
        this.pendingTranscript.set(id, next);
        this.currentAssistantItemId = id;
        this.emit('transcript', {
            id,
            role: 'assistant',
            text: next,
            isFinal: false,
            receivedAt: Date.now(),
        });
    }

    private handleAssistantDone(event: AudioTranscriptDoneEvent) {
        const id = event.item_id;
        this.pendingTranscript.delete(id);
        this.emit('transcript', {
            id,
            role: 'assistant',
            text: event.transcript || '',
            isFinal: true,
            receivedAt: Date.now(),
        });
    }

    private handleUserDelta(event: InputTranscriptionDeltaEvent) {
        const id = event.item_id;
        const prev = this.pendingTranscript.get(id) ?? '';
        const next = prev + (event.delta || '');
        this.pendingTranscript.set(id, next);
        this.emit('transcript', {
            id,
            role: 'user',
            text: next,
            isFinal: false,
            receivedAt: Date.now(),
        });
    }

    private handleUserCompleted(event: InputTranscriptionCompletedEvent) {
        const id = event.item_id;
        this.pendingTranscript.delete(id);
        this.emit('transcript', {
            id,
            role: 'user',
            text: event.transcript || '',
            isFinal: true,
            receivedAt: Date.now(),
        });
    }

    private async handleFunctionCall(event: FunctionCallArgumentsDoneEvent) {
        if (this.inFlightToolCalls.has(event.call_id)) return;
        this.inFlightToolCalls.add(event.call_id);

        const handler = this.toolHandlers[event.name];
        let result: OrbitToolResult;
        if (!handler) {
            result = {
                success: false,
                message: `I don't have a tool called ${event.name}.`,
            };
        } else {
            let parsedArgs: Record<string, unknown> = {};
            try {
                parsedArgs = event.arguments ? JSON.parse(event.arguments) : {};
            } catch {
                result = { success: false, message: 'Tool arguments were not valid JSON.' };
                this.respondToTool(event, { success: false, message: 'Invalid arguments' });
                this.inFlightToolCalls.delete(event.call_id);
                return;
            }
            try {
                result = await handler(parsedArgs);
            } catch (err) {
                result = {
                    success: false,
                    message: err instanceof Error ? err.message : 'Tool failed unexpectedly.',
                };
            }
        }

        if (ORBIT_TERMINATING_TOOLS.has(event.name)) {
            this.endRequested = true;
        }

        this.respondToTool(event, result);
        this.emit('tool', {
            id: generateId(),
            name: event.name,
            summary: result.message,
            success: result.success,
            completedAt: Date.now(),
        });
        this.inFlightToolCalls.delete(event.call_id);
    }

    private respondToTool(event: FunctionCallArgumentsDoneEvent, result: OrbitToolResult) {
        // Cancel any audio still being synthesized for the model's "thinking" turn,
        // then submit the function_call_output and ask for a fresh response so the
        // model speaks a real, grounded confirmation.
        this.sendEvent({ type: 'response.cancel' });
        this.sendEvent({ type: 'output_audio_buffer.clear' });
        this.sendEvent({
            type: 'conversation.item.create',
            item: {
                type: 'function_call_output',
                call_id: event.call_id,
                output: JSON.stringify(result),
            },
        });
        this.sendEvent({
            type: 'response.create',
            response: {
                instructions: 'Reply in one short sentence to confirm the result above. Do not call another tool unless the user asked for it.',
            },
        });
    }

    private handleFatalError(err: OrbitRealtimeError) {
        this.emit('error', err);
        void this.cleanup();
        this.setState('error');
    }

    private async cleanup() {
        try { this.dataChannel?.close?.(); } catch { /* noop */ }
        this.dataChannel = null;
        try { this.peer?.close?.(); } catch { /* noop */ }
        this.peer = null;
        if (this.localStream) {
            for (const track of this.localStream.getAudioTracks()) {
                try { track.stop(); } catch { /* noop */ }
            }
            this.localStream = null;
        }
        this.currentAssistantItemId = null;
        this.pendingTranscript.clear();
        this.inFlightToolCalls.clear();
        releaseAudio('orbit-voice');
    }
}
