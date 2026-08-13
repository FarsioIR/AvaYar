# Ava — MVP Scope (M0)

## MVP objective

Deliver the smallest trustworthy Ava experience that proves this loop end-to-end:

**input content → Persian transformation → Full/Summary choice → Male/Female Persian audio → playback**

## P0 capabilities

### 1. Input
- Accept at least one real user input flow for webpage content.
- Provide a text-input fallback if webpage extraction fails or is unavailable.

### 2. Content extraction
- Preserve headings and paragraphs where useful.
- Remove navigation, ads, duplicated chrome, and obvious boilerplate where technically feasible.
- Return a clear extraction error instead of silently generating unrelated output.

### 3. Language handling
- Detect Persian versus non-Persian source content.
- Keep already-Persian content in Persian.
- Translate non-Persian source content to fluent Persian before Persian TTS.

### 4. Two listening modes
- Full: represent the useful source content without intentional summarization.
- Summary: produce a materially shorter Persian summary that preserves the main ideas.

### 5. Voice choice
- At least one male Persian voice.
- At least one female Persian voice.
- The UI must make the selected voice explicit.

### 6. Playback
- Play / pause.
- Seek or restart.
- Playback-speed control.
- Loading, ready, and error states.

## MVP acceptance criteria

A candidate MVP is not accepted until all of these are evidenced:

- A real webpage can complete the end-to-end path.
- An English source can produce fluent Persian output.
- A Persian source does not undergo unnecessary translation.
- Both Full and Summary modes work.
- Both Male and Female voice options work.
- Long content has an explicit handling strategy.
- Failures are visible and actionable.
- No repository secret is committed.
- Automated checks run in GitHub Actions.
- The milestone is merged through PR and released from the exact merged SHA.

## P1 candidates after MVP

- Browser extension / share-sheet integrations.
- Reading queue and history.
- User accounts and cross-device sync.
- More Persian voices.
- Personal speed/voice defaults.
- Audio caching and resumable listening.
- Rich source citation/navigation.
- Native mobile applications.

P1 items are candidates, not commitments, until separately approved through GitHub Issues.
