# AvaYar M3 MVP status

## Provider milestone

M3 now uses a keyless free-provider architecture.

| Capability | M3 implementation | Gate |
|---|---|---|
| Non-Persian -> Persian | Local M2M100 q8 through Transformers.js | live local translation |
| Source-language detection | `franc-min` for common languages, English fallback when uncertain | unit contract |
| Persian female TTS | Edge Read Aloud `fa-IR-DilaraNeural` | live audio |
| Persian male TTS | Edge Read Aloud `fa-IR-FaridNeural` | live audio |
| API keys | None | secret-free contract |
| Browser credentials | None | architectural |
| Existing lint/test/build/smoke | Preserved | `npm run check` |

## Boundary

Translation is local after the model is downloaded. TTS remains an external
network call through Edge Read Aloud and therefore needs a clear privacy
disclosure before public release.

The Edge Read Aloud endpoint is not a contractual Azure API and has no AvaYar
SLA. The provider boundary and live health gate exist so it can be replaced
without changing the browser client.

## M3 lifecycle

The PR stays draft until the automated migration script has observed:

- local unit/build/smoke PASS,
- real M2M100 English -> Persian PASS,
- live Dilara audio PASS,
- live Farid audio PASS,
- GitHub Actions PASS.
