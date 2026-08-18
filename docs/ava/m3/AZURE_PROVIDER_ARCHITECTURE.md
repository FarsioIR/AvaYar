# AvaYar M3 — Azure Provider Architecture

## Decision

Use Azure for the first production-provider integration:

- Azure Translator → target language `fa`.
- Azure Speech → explicit Persian voices:
  - female: `fa-IR-DilaraNeural`
  - male: `fa-IR-FaridNeural`

## Security boundary

Provider credentials exist only in the Node server environment.

The browser calls:

- `POST /api/translate`
- `POST /api/tts`
- `GET /api/capabilities`

The browser never receives Azure subscription keys.

## Required local environment

- `AZURE_TRANSLATOR_KEY`
- `AZURE_TRANSLATOR_REGION` when the resource requires it
- `AZURE_TRANSLATOR_ENDPOINT` optionally overrides the standard endpoint
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

No real credentials belong in `.env.example`, Git history, CI logs, Issue comments, PR comments, or Release notes.

## M3 merge gate

Mocked HTTP contract tests are necessary but not sufficient.

Before M3 may merge, the local live probe must pass:

1. real non-Persian → Persian translation,
2. real `fa-IR-DilaraNeural` audio synthesis,
3. real `fa-IR-FaridNeural` audio synthesis.

Run:

`node scripts/live-azure-probe.mjs`

The finalizer must record only sanitized PASS/FAIL evidence, never keys.
