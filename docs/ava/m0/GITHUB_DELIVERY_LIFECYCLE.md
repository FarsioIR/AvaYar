# Ava — Mandatory GitHub Delivery Lifecycle

Every meaningful Ava milestone must be visible and auditable in GitHub.

## Required lifecycle

1. **Linked GitHub Issue**
   - Define problem, scope, acceptance criteria, risks, and evidence requirements.

2. **Dedicated branch**
   - Branch from the current default branch.
   - Keep one coherent milestone per branch.

3. **Intentional commits**
   - Commit only milestone-relevant changes.
   - Never commit secrets, credentials, private dumps, or raw sensitive evidence.

4. **Pull Request**
   - Link the Issue.
   - Explain scope, testing, evidence, risk, and rollback considerations.

5. **Checks and evidence**
   - Run applicable lint, type-check, tests, build, security checks, and smoke tests.
   - Publish sanitized evidence to the PR/repository when useful.
   - Local-only evidence is not considered completed project progress.

6. **Merge**
   - Merge only after required checks are successful or an explicit, documented exception exists.

7. **Exact-SHA tag**
   - Resolve the merged commit SHA.
   - Create the release tag on that exact SHA.
   - Never tag an unmerged branch tip as the final milestone release.

8. **GitHub Release**
   - Release from the exact-SHA tag.
   - Include scope, evidence, known limitations, and follow-up Issues.

## Definition of Done

A meaningful milestone is **not done** until Issue → branch/commit → PR → checks/evidence → merge → exact-SHA tag → GitHub Release is complete.

## Security rule

Only sanitized evidence is publishable. Secrets, tokens, credentials, private customer data, production dumps, private keys, and sensitive local configuration must never be added to Git history or GitHub Release assets.
