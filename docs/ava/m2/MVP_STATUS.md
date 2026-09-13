# Ava M2 — MVP Status

> **Historical milestone document.** This file describes the M2 executable-foundation state and is preserved as engineering provenance.
>
> It is **not** the current AvaYar product-status page. Current authority is **AvaYar 0.6.0 Stable**, released from source SHA `20d9da845c32e9873d332fb12192b38521d21232`. See [`../../../README.md`](../../../README.md) and the [Stable release](https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0).

| Product capability | M2 status | Evidence |
|---|---|---|
| Text input | IMPLEMENTED | Browser textarea and pipeline validation |
| Persian language detection | IMPLEMENTED / HEURISTIC | `src/core/language.mjs` + unit tests |
| Non-Persian → Persian translation | MISSING PROVIDER | Explicit provider boundary and visible error |
| Full mode | IMPLEMENTED | Pipeline + UI |
| Summary mode | IMPLEMENTED / LOCAL HEURISTIC | `src/core/summary.mjs` + tests |
| Persian speech playback | IMPLEMENTED / BROWSER-DEPENDENT | Web Speech adapter |
| Guaranteed female Persian voice | NOT YET GUARANTEED | Browser voice metadata is non-standard |
| Guaranteed male Persian voice | NOT YET GUARANTEED | Browser voice metadata is non-standard |
| Play / pause / resume / stop | IMPLEMENTED | Browser speech adapter + UI |
| Playback speed | IMPLEMENTED | UI rate control |
| Automatic webpage extraction | NOT YET CONNECTED | Core milestone after executable shell |
| CI | IMPLEMENTED | GitHub Actions: lint, tests, build, smoke |

## M2 definition

M2 was the first **executable foundation** milestone, not the complete Ava MVP.

The statements above intentionally preserve the M2-era capability snapshot. Later milestones connected the production-grade flows that culminated in the accepted Stable 0.6.0 release; therefore M2 statuses such as `MISSING PROVIDER`, `NOT YET GUARANTEED`, and `NOT YET CONNECTED` must not be reused as current product claims.
