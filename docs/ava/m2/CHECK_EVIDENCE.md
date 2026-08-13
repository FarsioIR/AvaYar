# Ava M2 — Check Evidence

Generated: 1405-05-22 10:19:50 +03:30

Repository: **AmirMotefaker/farsismart-listen**
Issue: **#11**
Branch: **agent/ava-m2-executable-foundation-v1**
M1 exact merged SHA: **793c8e78ff773bf0c04c36e0fecea23a791ae684**
M2 baseline SHA: **793c8e78ff773bf0c04c36e0fecea23a791ae684**
Node: **v26.5.0**

## Local validation

| Gate | Status | Exit code |
|---|---|---:|
| lint | PASS | 0 |
| test | PASS | 0 |
| build | PASS | 0 |
| smoke | PASS | 0 |

## Executable capability evidence

- Persian text input: implemented in browser shell.
- Persian/non-Persian detection: implemented and unit-tested.
- Full mode: implemented and unit-tested through the pipeline.
- Summary mode: implemented with deterministic local Persian summarization and tests.
- Non-Persian translation: explicit provider boundary; not falsely claimed as implemented.
- Persian speech: browser Web Speech adapter.
- Male/female selection: preference plumbing exists; true gender guarantee is explicitly deferred because browser voice metadata is not standardized.
- Playback: play, pause, resume, stop, and rate control.
- CI: GitHub Actions validates lint, tests, build, and smoke.

## Safety / scope

- No secret values are required by M2.
- No production credentials are added.
- No third-party dependency install is required.
- Build output `dist/` is generated for checks and intentionally not committed.

## Release gate

Do not merge/tag/release until the PR checks are observed and the final GitHub lifecycle gate is run.
