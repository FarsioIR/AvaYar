# AvaYar Cloudflare Runtime

AvaYar's browser extension needs a stable HTTPS runtime origin before a real installable Release Candidate can be produced.

This foundation adds a production-safe Cloudflare Workers target without changing the current production service.

## Safety boundary

- No existing production deployment is modified.
- The Worker exposes only health/readiness routes until application routes are deliberately migrated and validated.
- The extension RC pipeline still fails closed unless a real HTTPS API origin is supplied.
- Gemini regional/API access remains an upstream concern; AvaYar's local/browser fallbacks remain required.

## Deployment

The repository validates this target with Wrangler dry-run. Actual Cloudflare deployment remains a deliberate separate step after the Cloudflare account is connected. After a successful preview deployment, use the resulting HTTPS Workers origin as the candidate `AVAYAR_PRODUCTION_API_BASE`, run the Extension RC workflow, and validate the extension against that runtime before any public release.
