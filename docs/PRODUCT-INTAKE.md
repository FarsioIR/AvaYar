# M0 Product Intake — Historical Baseline

> This document records the original M0 intake decision. It is a historical product baseline, not the current repository-status page.
>
> Current engineering status: **M2 — executable foundation**. See [`docs/ava/m2/MVP_STATUS.md`](./ava/m2/MVP_STATUS.md).

## Current context

```text
PARENT-BRAND: Farsio - فارسیو
PRODUCT: AvaYar · آوایار
PRODUCT-STATUS: DISCOVERY / PRE-MVP
ENGINEERING-MILESTONE: M2 EXECUTABLE FOUNDATION
REPOSITORY: PUBLIC
PUBLIC-PRODUCT-RELEASE: NOT YET
PRODUCTION: NOT LAUNCHED
```

## Historical M0 decision

```text
PORTFOLIO-INTAKE: APPROVED
PRODUCT-STATUS: DISCOVERY / PRE-MVP
INITIAL-BLUEPRINT-CODE-STATUS: NOT BUILDABLE AS PROVIDED
M0-PUBLICATION: BLOCKED
M0-PRODUCTION: BLOCKED
```

The `NOT BUILDABLE AS PROVIDED` statement above refers to the **initial M0 blueprint input**. It does not describe the current repository: M1 and M2 work later established an executable runtime foundation, validation tooling and documented architecture.

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

For current implementation evidence, use the versioned milestone documents under [`docs/ava/`](./ava/).
