# M8 validation evidence

## Phase A — Summary Intelligence

### Local test run — 2026-08-24

Command:

```powershell
npm test
```

Result: **32 passed / 2 failed**.

Failing assertions:

1. `test/summary.test.mjs` — `summary is shorter than a multi-sentence source`
2. `test/pipeline.test.mjs` — `summary mode applies after translation`

Root cause: the first M8 implementation intentionally returned the source unchanged for inputs below 180 words. That optimization violates an existing product invariant: whenever Summary mode receives a multi-sentence source, the output must be materially shorter than the source, including after translation.

Decision: keep the long-article 300–500-word bounded strategy, but introduce a proportional target for short and medium multi-sentence inputs instead of returning them unchanged. Extraction remains frozen and unchanged.

### Fix prepared

Commit: `ecd21c1 fix: summarize short multi-sentence inputs`

Behavioral changes:

- multi-sentence inputs with 80 words or fewer target roughly 55% of source words;
- inputs with 81–180 words target roughly 50% of source words;
- long-article targets remain bounded at 120 / 190 / 300 / 400 words by source size;
- intro/conclusion retention is now subject to the target budget instead of being appended unconditionally;
- final defensive invariant prevents Summary mode from returning text equal to or longer than a source with more than two sentences.

### Automated validation — PASS

After syncing the corrective commits, the local validation gate passed:

- `npm test`: **34 passed / 0 failed**
- `npm run build:extension`: PASS
- `npm run check:extension`: PASS
- working tree: clean

GitHub Actions Ava CI run #51 also passed lint, unit tests, build, smoke test, and Manifest V3 package validation.

### Manual Persian article validation — PASS

The Digiato Galaxy A27 review was tested in Summary mode. The resulting summary was materially shorter than the source, excluded extraction/ad/benchmark noise, and retained the article introduction, important product observations, competitive trade-offs, and final buying recommendation.

Quality follow-up: the current extractive ranker is somewhat camera-heavy. This is a future ranking-quality refinement and does not reopen the frozen extraction pipeline.

## Phase B — Voice Experience

### Manual browser gate — BLOCKED pending local server startup

On 2026-08-24, pressing Play in the unpacked Chrome extension produced the expected actionable Private Beta error:

`سرور محلی آوایار در دسترس نیست. برای Private Beta ابتدا در پوشه پروژه «npm run dev» را اجرا کنید و سپس دوباره تلاش کنید.`

This is not a TTS regression. The M6 Private Beta architecture intentionally requires the local AvaYar backend to be running. `npm run dev` launches the Windows startup wrapper, which starts `scripts/dev-server.mjs` on `127.0.0.1:4173`. The `/api/tts` route additionally requires a server-side `GEMINI_API_KEY`; the extension must not contain the provider credential.

Next manual gate:

```powershell
cd C:\Projects\AvaYar
npm run dev
```

Keep that terminal running, verify `http://127.0.0.1:4173/healthz`, then retry Summary playback with the female and male voices. If speech is not configured, diagnose the server-side `GEMINI_API_KEY` configuration rather than placing any credential in the extension.