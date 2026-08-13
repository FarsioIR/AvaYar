## Ava M1 engineering/runtime audit

Closes #9

This draft PR publishes the first sanitized engineering evidence pass for Ava.

### Product path audited

**web/text input → extraction → language detection / Persian translation → Full or Summary → male/female Persian TTS → playback**

### Included

- repository/stack inventory,
- capability code-signal matrix,
- existing check surface,
- GitHub Actions inventory,
- security-sensitive filename signal,
- local sanitized analysis bundle for deeper source review.

### Important

This PR is intentionally **DRAFT**. Code-signal matches are not being claimed as implemented features.

Before M1 can merge/release:

- [ ] Review selected relevant source files.
- [ ] Classify each capability as implemented / partial / mock / broken / missing.
- [ ] Identify exact MVP blockers.
- [ ] Define the shortest implementation milestone sequence.
- [ ] Update audit evidence.
- [ ] Run/record applicable checks.
- [ ] Merge.
- [ ] Tag the exact merged SHA.
- [ ] Publish the M1 GitHub Release.
