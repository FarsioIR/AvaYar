# M0 Product Intake — Historical Baseline

> **Historical document.** This file records the original M0 intake decision and must not be used as AvaYar's current product-status page.
>
> Current product authority: **AvaYar 0.6.0 Stable**, released from source SHA `20d9da845c32e9873d332fb12192b38521d21232`. See the repository [`README.md`](../README.md) and the canonical [Stable release](https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0).
>
> The M0/M2 status language below is retained as engineering provenance.

## Historical M0 context

```text
PARENT-BRAND: Farsio - فارسیو
PRODUCT: AvaYar · آوایار
PRODUCT-STATUS: DISCOVERY / PRE-MVP
ENGINEERING-MILESTONE: M2 EXECUTABLE FOUNDATION
REPOSITORY: PUBLIC
PUBLIC-PRODUCT-RELEASE: NOT YET
PRODUCTION: NOT LAUNCHED
```

The block above describes the historical early-stage context, not the current Stable 0.6.0 product state.

## Historical M0 decision

```text
PORTFOLIO-INTAKE: APPROVED
PRODUCT-STATUS: DISCOVERY / PRE-MVP
INITIAL-BLUEPRINT-CODE-STATUS: NOT BUILDABLE AS PROVIDED
M0-PUBLICATION: BLOCKED
M0-PRODUCTION: BLOCKED
```

The `NOT BUILDABLE AS PROVIDED` statement above refers to the **initial M0 blueprint input**. It does not describe the current repository: later milestones established the executable runtime, extension, provider integrations, validation tooling and the accepted Stable 0.6.0 release.

## Problem

Persian-speaking users can face time, language and audio-quality friction when consuming large amounts of web content.

## Value hypothesis

A browser-oriented product can extract the main content of a page, translate or summarize it when needed, and turn the Persian output into a listening experience.

## Proposed MVP capabilities

- Main-content extraction.
- Meaning-preserving translation into Persian.
- Limited and testable summarization modes.
- Persian speech playback.
- Clear playback controls: play, pause, resume, stop and speed.
- Explicit provider configuration.
- User consent before sending webpage content to a third-party provider.

## Original M0 out-of-scope items

- Payments.
- Commercial entitlement.
- Public Browser Store publication.
- Production deployment.
- Public API.
- Mobile application.
- Voice cloning.

## Historical M0 exit criteria

- Manifest V3 architecture and bundling decisions recorded.
- Official TTS/provider choices and terms reviewed.
- Threat model recorded.
- Permissions minimized.
- Privacy flow and third-party processing documented.
- Required M1 file inventory completed.

For current product truth, use [`README.md`](../README.md) and the Stable release. For milestone history, use the versioned documents under [`docs/ava/`](./ava/).
