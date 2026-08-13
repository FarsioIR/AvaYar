# Ava M2 — Executable Foundation Architecture

## Goal

Establish the first executable Ava runtime after M1 proved that no runtime implementation exists in the repository or its Git history.

## Runtime shape

The M2 browser shell uses small ES modules with no third-party runtime dependency:

- `src/core/language.mjs` — lightweight Persian/non-Persian detection.
- `src/core/summary.mjs` — deterministic Persian extractive summary.
- `src/core/pipeline.mjs` — orchestration contract: translate when needed, then full/summary.
- `src/providers/unconfigured-translation.mjs` — explicit M2 boundary for non-Persian input.
- `src/providers/browser-speech.mjs` — browser Web Speech adapter with rate and best-effort Persian voice selection.
- `src/app.mjs` — browser UI and playback flow.
- `scripts/*` — dependency-free development, build, lint, and smoke tooling.
- `test/*` — Node built-in tests.
- `.github/workflows/ci.yml` — GitHub Actions validation.

## What is genuinely executable in M2

- Persian text input.
- Persian/non-Persian detection.
- Full Persian listening text.
- Deterministic Persian summary mode.
- Browser speech playback when Web Speech synthesis is available.
- Pause, resume, stop, and playback-rate control.
- Male/female *preference* passed into the speech adapter.
- Build, lint, unit tests, and HTTP smoke test.

## Deliberate boundaries

M2 does not pretend external capabilities exist:

1. Non-Persian input stops with an explicit translation-provider-not-configured error.
2. Browser Web Speech does not expose standardized voice gender metadata, so M2 cannot guarantee a true male/female pair.
3. Automatic extraction from arbitrary external web pages is not connected to the standalone browser shell yet.

These are implementation milestones, not hidden mocks.
