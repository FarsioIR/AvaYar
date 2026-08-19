# AvaYar M3 — keyless free-provider architecture

## Decision

M3 no longer requires an Azure account or API credentials.

### Translation

- Runtime: local Node.js inference through `@huggingface/transformers`.
- Model: `Xenova/m2m100_418M`, derived from Meta M2M100.
- Precision: q8.
- Target: Persian (`fa`).
- Model files are downloaded on first use and cached locally.
- No translation API key is required.
- Page text is not sent to a translation SaaS endpoint.
- `franc-min` provides best-effort source-language detection for common languages.
- For short/uncertain text, the default source language is `en`.

### Persian speech

- Runtime: server-side `msedge-tts`.
- Endpoint family: Microsoft Edge Read Aloud.
- Female voice: `fa-IR-DilaraNeural`.
- Male voice: `fa-IR-FaridNeural`.
- No Azure subscription, portal login, or Speech API key is required.

## Important production boundary

Edge Read Aloud is a keyless consumer-facing service rather than a contractual
Azure Speech API. It is suitable for the current M3 free-provider path, but its
upstream behavior can change. AvaYar therefore keeps speech behind a provider
boundary and validates it with a live health probe before lifecycle promotion.

## Privacy boundary

Translation runs locally after model download. Speech text is sent to the Edge
Read Aloud service to synthesize audio. The UI/product privacy disclosure must
make that network boundary clear before public release.

## Validation

```text
npm run check
npm run live:free-provider
```

The live gate must verify:

1. English -> Persian local translation returns Persian script.
2. `fa-IR-DilaraNeural` returns non-empty audio.
3. `fa-IR-FaridNeural` returns non-empty audio.
