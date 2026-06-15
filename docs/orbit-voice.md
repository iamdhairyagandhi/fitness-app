# Orbit Voice — Realtime conversational voice assistant

Orbit Voice replaces the old push-to-talk dictation flow with a
streaming, barge-in capable voice agent powered by OpenAI's Realtime
API over WebRTC. The user holds a single full-duplex call with Orbit
that can log water/food/workouts/recovery and answer questions about
today's stats out loud.

```
┌────────────┐  Supabase JWT   ┌─────────────────────────┐
│  RN client │ ──────────────▶│ realtime-session edge fn │
│            │ ◀──────────────│ (mints ephemeral key)    │
└─────┬──────┘  client_secret └────────────┬─────────────┘
      │                                    │
      │  SDP offer (Bearer client_secret)  │
      ▼                                    │
┌─────────────────────────────────────────────────────────┐
│           OpenAI Realtime (WebRTC + data ch)            │
│  PCM audio in/out, "oai-events" data channel for JSON    │
└─────────────────────────────────────────────────────────┘
```

## Files

- `lib/orbit/persona.ts` – the Orbit system prompt.
- `lib/orbit/types.ts` – shared types (`OrbitConnectionState`, etc.).
- `lib/orbit/tools.ts` – tool JSON-schema definitions **plus** handlers
  that mutate Zustand stores. Input clamping, route allow-list, and
  `call_id` dedup live here.
- `lib/orbit/audioCoordinator.ts` – tiny arbiter that stops legacy
  `expo-speech` / `expo-speech-recognition` before Orbit grabs the
  AVAudioSession (and vice versa).
- `lib/orbit/realtime.ts` – `OrbitRealtimeSession` class: mints token,
  opens `RTCPeerConnection` + `'oai-events'` data channel, two-phase
  tool handling (cancel in-flight audio → run handler →
  `function_call_output` → fresh `response.create`), background-aware
  disconnect.
- `app/orbit/voice.tsx` – full-screen modal with pulsing orb,
  live transcript, mute / interrupt / hang-up controls.
- `supabase/functions/realtime-session/index.ts` – auth-gated Edge
  Function that calls `POST /v1/realtime/client_secrets` with the
  Orbit persona, tool list, server-VAD config, and returns the
  ephemeral key to the client.

## How it works at runtime

1. User taps the orb on `/orbit/voice`.
2. RN calls `supabase.functions.invoke('realtime-session', ...)` with
   the user's Supabase JWT.
3. Edge function checks per-user rate limit (25 sessions/hr) and POSTs
   to `https://api.openai.com/v1/realtime/client_secrets` with a session
   config (`gpt-realtime-mini`, voice `marin`, server VAD 300ms,
   transcription model `gpt-4o-mini-transcribe`, tool defs).
4. RN client gets `{ value, expires_at, model, voice }`.
5. RN client calls `getUserMedia({ audio: true })` (uses the mic
   permission already declared in `app.json`).
6. RN creates `RTCPeerConnection`, adds local mic track, creates the
   `'oai-events'` data channel, generates an SDP offer.
7. POST the SDP to
   `https://api.openai.com/v1/realtime/calls?model=<model>` with
   `Authorization: Bearer <client_secret.value>` and
   `Content-Type: application/sdp`. The answer comes back as SDP and
   is set as the remote description.
8. Audio flows full-duplex. `'oai-events'` carries JSON events:
   transcript deltas, function call args, errors, etc.
9. When the model calls a tool, the client:
   - sends `response.cancel` + `output_audio_buffer.clear` to stop the
     "let me check…" filler audio;
   - runs the JS handler from `ORBIT_TOOL_HANDLERS`;
   - sends `conversation.item.create` with `function_call_output`;
   - sends `response.create` so the model speaks a grounded confirmation.
10. On background → mic muted, then disconnect after 30s.
11. On `end_conversation` tool or hang-up button → close peer + data
    channel + audio tracks; release the audio coordinator lock.

## Provisioning

### One-time on Supabase

```bash
# 1. Make sure OPENAI_API_KEY is set in Supabase project secrets
supabase secrets set OPENAI_API_KEY=sk-...

# 2. Deploy the edge function
supabase functions deploy realtime-session
```

The key must have access to the GA Realtime API
(`gpt-realtime-mini`, `gpt-realtime`).

### One-time on the Mac

```bash
npm install
cd ios && pod install && cd ..
npx expo prebuild --platform ios --clean
npx expo run:ios            # dev client
# or
npm run build:ios           # EAS production build
```

`react-native-webrtc` is a fully native module: it cannot run in Expo
Go. You always need a dev client or production EAS build.

### Required entitlements / capabilities

- Microphone usage (already in `app.json`:
  `NSMicrophoneUsageDescription`).
- No additional entitlements are needed. Orbit Voice does **not**
  request `UIBackgroundModes: audio`; the call pauses when the app
  backgrounds and ends after a 30s grace period. This keeps App Store
  review simple.

## Cost / safety knobs

- Default model: `gpt-realtime-mini`. Override per call by passing
  `{ model: 'gpt-realtime' }` to `session.connect()`.
- Default voice: `marin`. Allow-list: `marin`, `cedar`, `alloy`,
  `shimmer`, `nova`.
- Hard session timeout (client-side): 10 minutes.
- Background grace: 30s.
- Per-user rate limit (server-side): 25 sessions / hour. Replace the
  in-memory map with a Redis/KV store if you horizontal-scale.
- Server VAD: `silence_duration_ms: 300`, `threshold: 0.55`. Tweak
  for noisy gym environments via the Edge Function.

Realtime API pricing (as of writing) is significantly higher than text
chat. Treat this as a paid-tier or quota-limited feature in production.

## Adding a new voice tool

1. Add the handler in `lib/orbit/tools.ts` (the `ORBIT_TOOL_HANDLERS`
   map) and a JSON schema in `ORBIT_TOOL_DEFINITIONS`.
2. Add the **same** JSON schema in
   `supabase/functions/realtime-session/index.ts` (`ORBIT_TOOL_DEFINITIONS`
   constant). They must match.
3. If the tool ends the call, add its name to `ORBIT_TERMINATING_TOOLS`.
4. Re-deploy the edge function.

## Troubleshooting

- **"Voice needs a custom dev build…"** — `react-native-webrtc` isn't
  in the native bundle. Run prebuild + `pod install` + a fresh
  `expo run:ios` or EAS build.
- **"Could not start a voice session"** — Edge function not deployed,
  `OPENAI_API_KEY` missing, or user is on the rate limit (25/hr).
- **No audio plays back** — make sure another in-process audio owner
  (e.g. Orbit Log dictation) hasn't grabbed the AVAudioSession. The
  audio coordinator handles this automatically when both flows live
  in this app, but native iOS calls (FaceTime, Phone) will preempt
  Orbit and require a reconnect.
- **Latency feels poor** — confirm the SDP exchange completes and you
  see `'connected'` state. If you're on a flaky network, ICE candidate
  gathering may stall; the WebRTC stack will eventually time out and
  surface an error.
