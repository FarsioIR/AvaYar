# AvaYar M4 — Secure Webpage Extraction Status

## Implemented in this draft milestone

- public HTTPS URL input in the AvaYar shell;
- secure server-side HTML acquisition boundary;
- public-IP validation and IP-pinned HTTPS requests;
- redirect revalidation;
- timeout and response-size limits;
- HTML-only content gate;
- Mozilla Readability extraction;
- plain-text-only browser handoff;
- automatic connection to the existing Persian listening pipeline;
- removal of stale Azure UI wording;
- privacy disclosure for the Edge Read Aloud speech boundary;
- unit tests for URL policy and readable-text extraction;
- live `https://example.com/` extraction probe.

## Deliberate M4 boundaries

- no authenticated/private webpage extraction;
- no localhost or private-network extraction;
- no arbitrary HTTP URLs;
- no browser-wide host permission;
- no Browser Store publication;
- no claim that Edge Read Aloud provides a contractual production SLA.

## Draft PR gate

The M4 PR remains draft until:

- local lint/test/build/smoke PASS;
- live public HTTPS extraction PASS;
- M3 keyless translation/TTS regression probe PASS;
- GitHub Actions PASS;
- Chrome + Edge manual acceptance is completed in the next recovery/finalizer step.
