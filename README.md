<div align="center">

<img src="./assets/brand/avayar-mark.png" alt="AvaYar · آوایار" width="180" />

# AvaYar · آوایار

**Persian Reading & Listening Assistant by Farsio**

Persian-first web reading, translation, summarization and text-to-speech workflows.

**بشنو، به فارسی**

[Product page](https://farsio.ir/fa/products/ava) ·
[Farsio](https://farsio.ir) ·
[M2 architecture](./docs/ava/m2/ARCHITECTURE.md) ·
[M2 status](./docs/ava/m2/MVP_STATUS.md)

</div>

---

## What AvaYar is

**AvaYar (آوایار)** is a Persian-first reading and listening product from **Farsio - فارسیو**.

The product direction is to help Persian-speaking users consume web content by extracting the main content, translating non-Persian text into fluent Persian when needed, optionally summarizing it, and reading the Persian result aloud.

AvaYar is currently an **engineering foundation**, not a production release. The repository contains the executable M2 browser shell, tests, build tooling and documented provider boundaries.

## Current status

| Area | Current state |
|---|---|
| Product | Discovery / Pre-MVP |
| Engineering milestone | **M2 — executable foundation** |
| Repository visibility | **Public** |
| Package version | `0.2.0` |
| Node.js | `>=22` |
| Public product release | Not yet |
| Production | Not launched |
| Browser Store publication | Not part of the current M2 milestone |

The current repository state intentionally distinguishes implemented capabilities from future product claims.

## Implemented in M2

The M2 executable foundation currently includes:

- Persian text input.
- Persian/non-Persian language detection using a lightweight heuristic.
- Full-text Persian listening flow.
- Deterministic local summary mode.
- Browser speech playback through the Web Speech API when speech synthesis is available.
- Play, pause, resume and stop controls.
- Playback-rate control.
- Build, lint, unit-test and smoke-test tooling.
- GitHub Actions validation.

## Deliberate M2 boundaries

AvaYar does **not** present unfinished capabilities as complete:

- Production-grade non-Persian → Persian translation is not connected yet; the provider boundary is explicit.
- Automatic extraction from arbitrary external webpages is not connected to the standalone M2 shell yet.
- Browser Web Speech APIs do not provide standardized voice-gender metadata, so a guaranteed male/female Persian voice pair is not claimed.
- M2 is the first executable foundation, not the complete AvaYar MVP.

See [M2 MVP status](./docs/ava/m2/MVP_STATUS.md) for the evidence-backed capability matrix.

## Architecture

M2 uses small ES modules with no third-party runtime dependency:

```text
src/
├── app.mjs
├── core/
│   ├── language.mjs
│   ├── pipeline.mjs
│   └── summary.mjs
└── providers/
    ├── browser-speech.mjs
    └── unconfigured-translation.mjs
```

Supporting engineering surfaces include:

- `scripts/` — development, lint, build and smoke tooling.
- `test/` — Node built-in tests.
- `.github/workflows/ci.yml` — continuous validation.
- `docs/ava/m2/` — architecture, check evidence and current MVP status.

## Local validation

Requirements:

```text
Node.js >= 22
```

Run the complete repository check:

```bash
npm run check
```

The check pipeline is defined as:

```text
lint → test → build → smoke
```

For the product-specific PowerShell gate:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Product.ps1
```

## Security and privacy baseline

AvaYar is designed around explicit security boundaries:

- No API keys, tokens or credentials belong in source control.
- Sending webpage text to external AI/TTS providers requires clear user consent and privacy disclosure.
- Browser permissions should remain minimal and justified.
- Dynamic content must use safe DOM handling rather than unsafe HTML injection.
- Sensitive page content and credentials must not be logged.
- External network paths require HTTPS and controlled error handling.

See [Security Baseline](./docs/SECURITY-BASELINE.md).

## Engineering roadmap

The next implementation work should focus on evidence-backed product capabilities:

1. Connect production-grade translation/provider boundaries.
2. Connect webpage content extraction to the tested pipeline.
3. Preserve the existing privacy and permission model.
4. Validate Persian speech behavior across supported browser environments.
5. Advance toward a private beta only after the relevant product/security gates pass.

## Product and brand

- **Parent brand:** [Farsio - فارسیو](https://farsio.ir)
- **Product:** AvaYar · آوایار
- **Product line:** Persian Reading & Listening Assistant by Farsio
- **Tagline:** بشنو، به فارسی
- **Product page:** https://farsio.ir/fa/products/ava
- **Repository:** https://github.com/FarsioIR/AvaYar

---

AvaYar is developed openly as part of the Farsio product family.
