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

Next gate: pull the branch, rerun `npm test`, then rerun extension build/package checks before manual article validation.
