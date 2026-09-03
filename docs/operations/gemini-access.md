# Gemini access and network diagnostics

## Current validated state

AvaYar uses `GEMINI_API_KEY` for Gemini-backed translation and Persian speech. The current speech provider is `gemini-tts`, with `gemini-3.1-flash-tts-preview` and the approved Persian voice preferences configured by the application.

The September 2026 validation isolated a Google-side access blocker rather than an AvaYar runtime defect:

- `GEMINI_API_KEY` was loaded successfully.
- Google Cloud project `gen-lang-client-0774458086` exists and the Generative Language API is enabled.
- Gemini API quota is available, including a free-tier quota entry for Gemini 3.1 Flash TTS.
- The API key is restricted to the Gemini API and is bound to its Google-managed service account.
- A VPN egress route through Istanbul, Turkey was confirmed before testing.
- `GET /v1beta/models` returned HTTP 403.
- `gemini-3.1-flash:generateContent` returned HTTP 403.
- `gemini-3.1-flash-tts-preview:generateContent` returned HTTP 403.

Because both ordinary text generation and TTS are rejected, this is not a TTS-only failure and should not be treated as an AvaYar code regression.

## Network / VPN requirement

Gemini availability depends on the caller's supported network and region. Operators and users in restricted network locations may need a supported-country network route or VPN before Gemini-backed features can work.

A VPN is a prerequisite check, not a guaranteed fix. The validated Turkey VPN route still received HTTP 403, so persistent 403 responses after changing network routes must be investigated as Google project, API-key, account-policy, or service-access problems.

Never add VPN-specific bypass logic to AvaYar application code.

## Diagnostic commands

Use the repository diagnostics before changing runtime code:

```powershell
$env:GEMINI_API_KEY = Read-Host "Gemini API Key"
node .\scripts\diagnose-gemini-ci-route.mjs
node .\scripts\live-gemini-speech-probe.mjs
Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
```

Classification guidance:

- HTTP 200: API route is available; investigate any later application-specific failure normally.
- HTTP 400: route/authentication reached Google; inspect request/model configuration.
- HTTP 403: do not modify AvaYar blindly; check network region, key/project status, account policy, and Google service access.
- HTTP 429: authentication and routing work; inspect quota/rate limits.

## Secret handling

Gemini API keys must never be committed, printed in CI logs, included in screenshots, or pasted into issues/PRs. If a key is exposed, rotate it immediately and update the relevant runtime secret.

## Production safety

The external Gemini access incident must not trigger unverified production changes. Development can continue on non-Gemini product work while the provider-access incident remains tracked separately.