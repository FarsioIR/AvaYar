# Issue #55 — Cloudflare preview deploy entry-point fix

Preview run `33733060048` proved that Cloudflare credentials, GitHub Environment secrets, repository quality gates, and the Wrangler dry-run are healthy. The actual deploy failed because the Wrangler Action command did not receive an entry point.

The preview workflow now passes `cloudflare/worker.mjs` and the compatibility date explicitly to both dry-run and deploy commands. This keeps the preview deployment independent from Wrangler config-file discovery/version differences while preserving `wrangler.jsonc` as the canonical repository configuration.

Production safety remains unchanged: only the isolated `avayar-runtime-preview` Worker can be deployed by the manual preview workflow. No DNS, database, billing, custom domain, or existing production Worker is modified.
