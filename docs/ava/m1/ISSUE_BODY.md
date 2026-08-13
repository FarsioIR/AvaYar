## Goal

Audit the real engineering/runtime state of **Ava**, a product in the **Farsio** family, and establish the shortest evidence-based path from the current repository to a working MVP.

## Product path being audited

**web/text input → extraction → language detection / Persian translation → Full or Summary → male/female Persian TTS → playback**

## M1 scope

- [ ] Inventory the actual stack, manifests, package scripts, workflows, and test surface.
- [ ] Locate real implementation signals for extraction, translation, summary, TTS, voice selection, and player behavior.
- [ ] Distinguish implementation evidence from docs/mock/placeholder signals.
- [ ] Run existing safe checks without installing or upgrading dependencies.
- [ ] Identify tracked security-sensitive filenames without publishing secret values.
- [ ] Publish a sanitized capability matrix and check evidence.
- [ ] Define the shortest implementation milestones required for the MVP.

## Non-goals

- No production deployment.
- No dependency upgrade.
- No runtime feature implementation in this audit branch.
- No secret values or private local configuration in GitHub evidence.

## Baseline

- M0 exact merged SHA: `3ed3b5ea50b43cfe734fa763a6cb7dd63b1d87ad`
- M0 release tag: `ava-m0-baseline-2026-08-13`
- M1 audit baseline SHA: `3ed3b5ea50b43cfe734fa763a6cb7dd63b1d87ad`

## Definition of Done

M1 is not complete until the audit findings are reviewed, the final audit PR is merged, an exact-SHA M1 tag is created, and a GitHub Release records the findings and next implementation milestone.
