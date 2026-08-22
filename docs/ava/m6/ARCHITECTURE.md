# AvaYar M6 architecture

M6 adds an installable Manifest V3 browser client without moving provider
credentials into the browser.

## Trust boundaries

- The side panel starts extraction only after a user click.
- `activeTab` and `scripting` replace persistent page access.
- The first extraction on a site requests optional access only for that origin.
- The content script is injected on demand and reads visible text only.
- The service worker is the extension's single backend transport boundary.
- Gemini and translation credentials remain on the AvaYar server.
- The UI renders provider and page output with `textContent`, never raw HTML.

## Client flow

1. User opens the side panel and clicks **Read current page**.
2. The side panel injects `content-script.mjs` into the active tab.
3. The content script returns title, URL and normalized visible text.
4. Non-Persian text is sent to `/api/translate` through the service worker.
5. Full or summary text remains visible in the panel.
6. Playback sends only the prepared Persian text and voice choice to `/api/tts`.
7. The service worker returns WAV bytes; the panel owns playback controls.

## Mobile boundary

The future mobile client should reuse the HTTP contracts for capabilities,
translation and speech. Browser-only extraction and Chrome APIs must remain in
the extension adapter rather than entering the shared product core.
