## Goal

Establish the official M0 baseline for **Ava**, a product in the **Farsio** family.

Ava converts useful web/text content into Persian listening experiences. Non-Persian content is translated into fluent Persian first. The user can listen to either the full content or a Persian summary, using a selectable male or female voice.

## Scope

- [ ] Publish Ava product definition.
- [ ] Publish MVP scope and acceptance criteria.
- [ ] Publish mandatory GitHub delivery lifecycle.
- [ ] Publish sanitized repository baseline evidence.
- [ ] Audit existing runtime implementation after baseline merge.
- [ ] Identify the shortest path to a working end-to-end MVP.

## Acceptance criteria for this M0 baseline

- Product problem and promise are explicit.
- Full vs Summary listening modes are explicit.
- Non-Persian → fluent Persian translation behavior is explicit.
- Male and Female Persian voice requirement is explicit.
- GitHub lifecycle is mandatory:
  Issue → branch/commit → PR → checks/evidence → merge → exact-SHA tag → GitHub Release.
- Baseline evidence contains no secrets.
- Follow-up engineering work is tracked in GitHub.

## Delivery branch

`agent/ava-m0-product-baseline-v1`

## Definition of Done

This Issue is complete only after the M0 PR is merged, an exact-SHA tag is created on the merged commit, and a GitHub Release is published.
