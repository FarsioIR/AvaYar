# AvaYar 0.6.0 — Store Readiness Contract

Tracking: Issue #61

This document is the release contract for moving AvaYar from the verified `0.6.0 preview-3` prerelease to stable `0.6.0`.

## Product baseline

- Browser package: Manifest V3
- Browsers: Google Chrome and Microsoft Edge
- Canonical product page: `https://farsio.ir/fa/products/avayar`
- Current validated online runtime: `https://avayar-runtime-preview.amotef.workers.dev`
- Stable publication is not claimed until the complete acceptance checklist is closed.

## Permission rationale

AvaYar uses these required extension permissions:

- `activeTab`: access only the tab the user explicitly invokes AvaYar on.
- `scripting`: execute the extraction bridge after explicit user action.
- `sidePanel`: render the AvaYar reading interface.
- `storage`: persist local extension preferences such as voice/mode state.

The development manifest contains localhost host permissions for local engineering only. Production packaging must remove `localhost` and `127.0.0.1` and inject one explicit HTTPS AvaYar API origin.

`optional_host_permissions` covers `http://*/*` and `https://*/*` because AvaYar is a user-invoked webpage reader and must support arbitrary pages. These permissions are optional rather than permanently granted. Store copy must explain that page access happens only when the user invokes AvaYar.

The stable package must not add broad privileged permissions such as `tabs`, `cookies`, `history`, `downloads`, `webRequest`, `webRequestBlocking`, `management`, or `debugger`.

## Data-flow disclosure

When the user invokes AvaYar on a page:

1. the extension extracts readable page text from the active page;
2. Persian text can be read or summarized;
3. English text may be sent to the configured AvaYar HTTPS runtime for translation to Persian;
4. server-side speech may be attempted when available;
5. when server TTS is unavailable, AvaYar can fall back to the browser Persian Web Speech capability;
6. provider credentials remain server-side and must never be embedded in the extension package.

The extension must not claim that all processing is local. Store privacy disclosures must accurately state that webpage text can be transmitted to the AvaYar runtime for requested translation/speech operations.

## Stable artifact gates

Before stable release:

- `npm run check` PASS
- `npm run check:store-readiness` PASS
- production extension build PASS
- production extension validation PASS
- RC metadata generation PASS
- Manifest V3 version equals `0.6.0`
- no `localhost`, `127.0.0.1`, development API override or build placeholder in the stable service worker
- exactly one explicit HTTPS AvaYar runtime origin is present in production host permissions in addition to the canonical Farsio origin where applicable
- no provider key/token/credential is present in the extension artifact
- SHA-256 checksum for the final ZIP is recorded

## Manual acceptance matrix

Both Chrome and Edge must be checked from the exact final package:

- install/load succeeds
- canonical AvaYar icon and branding render correctly
- Persian article → Full
- Persian article → Summary
- English article → translated Full
- English article → translated Summary
- female voice path
- male voice path
- Play
- Pause
- Resume
- Stop
- backend unavailable message is actionable
- provider/rate-limit unavailable state is controlled and does not leak raw upstream errors

## Store listing readiness

Chrome Web Store and Microsoft Edge Add-ons listing material must remain factual and consistent with the implementation:

- product name: `AvaYar · آوایار`
- version: `0.6.0`
- concise description focused on reading, Persian translation and summarization
- permission rationale aligned with this document
- privacy disclosure aligned with the actual data flow above
- canonical product/support URL under `farsio.ir`
- approved AvaYar brand assets only

Store submission/publication is a separate deliberate step. Repository readiness must never be presented as proof that either store has approved or published AvaYar.

## Release provenance

Stable `0.6.0` may be tagged and published only from the exact commit whose CI, package validation and manual acceptance evidence are recorded in Issue #61. Farsio AvaYar Release Notes must then be updated to the same stable version/date and provenance.