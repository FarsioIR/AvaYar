# Ava M2 — MVP Status

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

M2 is the first **executable foundation** milestone, not the complete Ava MVP.

The next implementation milestone should connect production-grade providers and web extraction while preserving the tested pipeline contracts introduced here.
