/**
 * Audio session coordinator.
 *
 * iOS AVAudioSession is a shared singleton. Several Orbit features want
 * exclusive use of the mic / playback route: legacy STT (`expo-speech-recognition`),
 * TTS (`expo-speech`), and now WebRTC (Orbit Voice). If two of them grab
 * the session with different categories/modes, you get echo, missing audio,
 * or recording failures.
 *
 * This module is a tiny in-process arbiter:
 *   - Anything that wants the audio session calls `acquireAudio(owner)` first.
 *   - The currently-held owner is asked to release before the new one starts.
 *   - On release, the runtime is allowed to deactivate via WebRTC's own logic.
 *
 * We intentionally avoid touching AVAudioSession directly here; the WebRTC
 * stack and `expo-speech*` modules each manage their own native session
 * configuration when they start/stop. Coordination is at the JS layer.
 */

import { requireOptionalNativeModule } from 'expo';

export type AudioOwner = 'speech-recognition' | 'speech-tts' | 'orbit-voice' | null;

type ReleaseCallback = () => Promise<void> | void;

let currentOwner: AudioOwner = null;
let releaseCurrent: ReleaseCallback | null = null;

interface SpeechRecognitionLike {
    abort?: () => void;
    stop?: () => void;
}

interface SpeechLike {
    stop?: () => Promise<void> | void;
}

/**
 * Forcefully tear down any other in-process audio consumers before
 * a new owner takes the AVAudioSession.
 */
async function stopOtherConsumers(nextOwner: AudioOwner) {
    if (currentOwner && currentOwner !== nextOwner && releaseCurrent) {
        try {
            await releaseCurrent();
        } catch {
            // Best-effort.
        }
    }

    // Also defensively stop the global expo-speech-recognition + expo-speech
    // modules even if no JS owner was tracking them (e.g. they were started
    // on a different screen that didn't go through this coordinator).
    if (nextOwner !== 'speech-recognition') {
        try {
            const rec = requireOptionalNativeModule<SpeechRecognitionLike>('ExpoSpeechRecognition');
            rec?.abort?.();
        } catch {
            // Ignore — module may not be installed in dev.
        }
    }
    if (nextOwner !== 'speech-tts') {
        try {
            const tts = requireOptionalNativeModule<SpeechLike>('ExpoSpeech');
            await tts?.stop?.();
        } catch {
            // Ignore.
        }
    }
}

export async function acquireAudio(owner: AudioOwner, release: ReleaseCallback) {
    await stopOtherConsumers(owner);
    currentOwner = owner;
    releaseCurrent = release;
}

export function releaseAudio(owner: AudioOwner) {
    if (currentOwner === owner) {
        currentOwner = null;
        releaseCurrent = null;
    }
}

export function getCurrentAudioOwner(): AudioOwner {
    return currentOwner;
}
