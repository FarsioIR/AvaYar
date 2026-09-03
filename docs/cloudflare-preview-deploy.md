# AvaYar Cloudflare Preview Deploy

This milestone adds a GitHub Actions deployment gate for a Cloudflare Workers preview runtime. Deployment requires repository/environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and must target the `avayar-preview` GitHub Environment.

The preview workflow runs the full AvaYar quality gate, validates the Worker bundle, deploys `avayar-runtime-preview`, captures the HTTPS deployment URL, smoke-tests `/health`, and records the runtime URL for the Extension RC pipeline.

Production safety boundary: this workflow does not touch DNS, custom domains, databases, billing, or an existing production Worker. Application routes remain fail-closed until separately migrated and validated.
