# AvaYar M5 - Native Iranian Persian Speech Status

## Implemented in this draft

- Gemini TTS replaces Edge Read Aloud in the product speech path.
- `Sulafat` selected for female narration.
- `Iapetus` selected for male narration.
- Standard Iranian Persian delivery is explicitly directed.
- Dari/Afghan Persian pronunciation is explicitly rejected.
- Sentence/newline and paragraph pause controls are generated before TTS.
- Untrusted bracketed audio tags from webpage text are neutralized.
- Long narration is chunked before synthesis.
- PCM is converted to browser-playable WAV on the server.
- `GEMINI_API_KEY` remains server-side only.
- UI privacy disclosure is updated for Gemini TTS.
- Existing playback controls remain unchanged.

## Draft gates

- lint/test/build/smoke;
- focused Persian narration tests;
- focused Gemini speech tests;
- live extraction;
- live local translation;
- live Gemini female + male synthesis;
- localhost speech API;
- secret leak scan;
- GitHub Actions on exact M5 head.

## Final quality gate

Accent and naturalness are perceptual. Automated gates verify provider, exact
voices, prompts, pause preparation, audio integrity, and regressions. Final
auditory quality acceptance remains required before M5 is marked ready.
