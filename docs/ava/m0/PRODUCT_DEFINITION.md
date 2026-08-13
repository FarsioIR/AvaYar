# Ava — Product Definition (M0)

Status: **Baseline / Pre-MVP**
Product family: **Farsio**
Product name: **Ava**
Repository: **AmirMotefaker/farsismart-listen**

## Problem

People often find useful long-form content on the web but do not have enough time or attention to read it. Persian-speaking users face an additional barrier when the source content is in English or another language.

## Product promise

Ava turns readable web content into useful Persian audio.

For a supported page or supplied text, Ava should be able to:

1. obtain the primary readable text,
2. detect its language,
3. translate non-Persian content into fluent, natural Persian,
4. provide two listening modes:
   - full-content Persian audio,
   - summarized Persian audio,
5. provide selectable male and female Persian voices,
6. provide normal playback controls.

## Primary user journey

1. User gives Ava a webpage URL or supported text input.
2. Ava extracts or receives the meaningful text.
3. Ava detects the source language.
4. If needed, Ava translates the content into fluent Persian.
5. User chooses **Full** or **Summary**.
6. User chooses a **Male** or **Female** voice.
7. Ava generates/streams Persian speech.
8. User listens with play, pause, seek, and speed controls.

## Core functional capabilities

- Web/article text extraction
- Text normalization
- Language detection
- Translation to Persian when required
- Persian summarization
- Persian text-to-speech
- Male voice option
- Female voice option
- Full-content mode
- Summary mode
- Playback controls
- Explicit error states and retry behavior

## Quality bar

Ava must optimize for:

- faithful meaning,
- fluent Persian,
- intelligible pronunciation,
- low-friction listening,
- predictable handling of long content,
- transparent failure states,
- privacy-aware processing.

## Product boundaries for M0

M0 establishes the product contract and delivery baseline. It does **not** claim that all runtime capabilities are already implemented.

Implementation claims must be supported by code, tests, CI evidence, and a released GitHub milestone.
