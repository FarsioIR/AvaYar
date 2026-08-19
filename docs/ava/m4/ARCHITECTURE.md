# AvaYar M4 — Secure Webpage Extraction Architecture

## Goal

Connect public webpage content extraction to AvaYar's tested Persian
translation/listening pipeline without introducing broad browser permissions or
an unsafe general-purpose server fetch primitive.

## Extraction boundary

M4 accepts only public `https://` URLs on port 443.

The server extraction path:

1. parses and validates the URL;
2. rejects embedded credentials, localhost and non-HTTPS targets;
3. resolves DNS before the request;
4. rejects private, local, link-local, reserved or mixed public/private results;
5. pins the validated IP into the HTTPS request to reduce DNS-rebinding risk;
6. follows at most three redirects, re-running the full validation for each;
7. applies a request timeout and a 2 MiB HTML response limit;
8. accepts HTML/XHTML content only;
9. parses the HTML without executing page scripts or loading page resources;
10. uses Mozilla Readability to recover the useful article text;
11. returns plain text only, capped at 80,000 characters.

## Pipeline

The browser shell sends only the URL to `/api/extract`.

The extracted plain text is placed into the existing input and immediately uses
the existing AvaYar pipeline:

`extract -> language detection -> local translation when needed -> full/summary -> Persian TTS`

Translation remains local after model download.

Speech remains an explicit external network boundary through Edge Read Aloud.

## Permission model

M4 does not add `<all_urls>`, Chrome extension host permissions or Store
publication. Browser-extension `activeTab` extraction remains a later adapter
option after the standalone private-beta gate is proven.

## Security

- no raw HTML is injected into the UI;
- no remote page scripts are executed;
- no page text is logged;
- private network destinations are blocked;
- redirects cannot bypass destination validation;
- all remote extraction traffic is HTTPS;
- TTS disclosure remains visible before public release.
