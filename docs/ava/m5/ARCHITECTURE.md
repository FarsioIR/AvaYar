# AvaYar M5 - Native Iranian Persian Speech Architecture

## Goal

M5 replaces the M4 Edge Read Aloud speech provider with Gemini TTS and adds a
provider-independent Persian narration preparation layer.

## Product requirement

AvaYar speech must sound like natural contemporary standard Persian spoken in
Iran. Functional audio bytes are not a sufficient product-quality gate.

## Speech provider

- provider: Gemini TTS;
- model: `gemini-3.1-flash-tts-preview`;
- female voice: `Sulafat` (Warm);
- male voice: `Iapetus` (Clear);
- target delivery: standard Iranian Persian (`fa-IR`);
- API credential: server-side `GEMINI_API_KEY` only.

The browser never receives the API key.

## Narration preparation

Before synthesis, both Full and Summary listening text pass through the same
normalizer:

- normalize line endings and whitespace;
- preserve punctuation;
- neutralize bracketed input so webpage text cannot inject Gemini audio tags;
- line break after sentence punctuation -> `[medium pause]`;
- line break without sentence punctuation -> `[short pause]`;
- blank-line paragraph boundary -> `[long pause]`;
- split long narration into bounded chunks.

The Gemini director prompt requires exact recitation, native standard Iranian
Persian, no Dari/Afghan Persian pronunciation, punctuation-aware cadence, and
treats transcript content as untrusted quoted text rather than instructions.

## Audio and playback

Gemini API TTS returns 24 kHz 16-bit mono PCM. AvaYar wraps concatenated PCM
chunks into a WAV response. Browser-side playback rate and the existing
Play/Pause/Resume/Stop controls remain provider-independent.

## Privacy boundary

Translation remains local after the M2M100 model is available. Speech is a
network boundary: the final Persian Full/Summary listening text is sent to
Google Gemini TTS only when the user presses Play.


## Gemini SDK and Windows proxy routing

M5 uses the official `@google/genai` JavaScript SDK and the Interactions API
for speech synthesis. AvaYar does not hardcode a proxy address.

On Windows, `scripts/start-avayar-windows.ps1` asks .NET's current
`HttpClient.DefaultProxy` for the route to the Gemini API. If Windows routes
Gemini through an authorized user proxy, the launcher passes that route only to
the AvaYar Node child through `HTTP_PROXY` / `HTTPS_PROXY`,
`NODE_USE_ENV_PROXY=1`, and `--use-env-proxy`. Localhost remains in `NO_PROXY`.

This preserves the machine's existing network policy and does not change
Windows proxy settings.

## Official Gemini TTS transport resilience

AvaYar keeps the official Gemini Interactions TTS API as the primary transport.

If Interactions returns the specific HTTP 400 `invalid_request` failure, AvaYar
falls back to the official `@google/genai` `models.generateContent()` speech
path with the same model, narration prompt, and voice. The fallback requests
`AUDIO` output with `speechConfig.voiceConfig.prebuiltVoiceConfig`.

HTTP 429 handling remains bounded and retry-aware on both official transports.
Other Interactions failures do not trigger this fallback.
