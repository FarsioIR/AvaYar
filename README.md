<div align="center">

<img src="./assets/brand/avayar-flat.svg" alt="AvaYar · آوایار" width="180" />

# AvaYar · آوایار

**Persian Reading & Listening Assistant by Farsio**

Persian-first web reading, translation, summarization and text-to-speech workflows.

**بشنو، به فارسی**

[Product page](https://farsio.ir/fa/products/avayar) ·
[Farsio](https://farsio.ir) ·
[Stable release 0.6.0](https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0) ·
[Store readiness](./docs/STORE-READINESS-0.6.0.md)

</div>

---

## Current product status

AvaYar is a **public Stable 0.6.0 release** from **Farsio - فارسیو**.

| Area | Current state |
|---|---|
| Product | **Stable** |
| Current version | **0.6.0** |
| Accepted source SHA | `20d9da845c32e9873d332fb12192b38521d21232` |
| Release | [`avayar-v0.6.0`](https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0) |
| Supported browsers | Google Chrome / Microsoft Edge |
| Package | Manifest V3 |
| Repository visibility | Public |
| Browser Store publication | Separate distribution step; not implied by repository readiness |

The Stable 0.6.0 release is the canonical current product authority. Older M0–M8 milestone documents remain in this repository as engineering history and must not be interpreted as the current product status.

## Stable 0.6.0 capabilities

The accepted Stable release includes:

- Persian-first webpage reading.
- Full Text and Summary modes.
- English → Persian preparation.
- Real Persian neural TTS.
- Female Persian voice: **Sulafat**.
- Male Persian voice: **Iapetus**.
- Progressive audio playback for faster first-audio startup.
- Play / Pause / Resume / Stop controls.
- Chrome / Edge Manifest V3 extension packaging.
- Canonical AvaYar branding under Farsio.

Real-browser acceptance for the Stable package includes Summary and Full Text flows with both female and male voice paths, plus progressive playback and playback controls.

## Release provenance

Canonical Stable release:

- Tag: `avayar-v0.6.0`
- Accepted source SHA: `20d9da845c32e9873d332fb12192b38521d21232`
- Accepted ZIP SHA-256: `b3cb4265b5d9bb13e5bc0d6f9f726ca716270a0d692d29706f4e7596077ed375`
- Accepted preview lineage: `avayar-v0.6.0-preview-9`

The Stable ZIP is the browser-accepted package promoted from the accepted Preview 9 artifact.

## Runtime and privacy boundaries

AvaYar uses explicit browser and runtime boundaries:

- `activeTab`: access only to the tab the user invokes AvaYar on.
- `scripting`: runs the extraction bridge after explicit user action.
- `sidePanel`: renders the AvaYar reading interface.
- `storage`: persists local extension preferences such as voice and mode state.
- Optional webpage host access is used for user-invoked reading across arbitrary pages.
- Webpage text may be transmitted to the configured AvaYar HTTPS runtime for requested translation and speech operations.
- Provider credentials remain server-side and must never be embedded in the extension package.
- The product must not be described as fully local-only.

See [`docs/STORE-READINESS-0.6.0.md`](./docs/STORE-READINESS-0.6.0.md) and [`docs/SECURITY-BASELINE.md`](./docs/SECURITY-BASELINE.md).

## Historical engineering milestones

The folders under [`docs/ava/`](./docs/ava/) preserve milestone evidence from M0 onward. In particular, the M2 documents describe the earlier executable-foundation stage and are **historical** relative to Stable 0.6.0.

Do not use an older milestone status such as `Discovery / Pre-MVP`, package `0.2.0`, `MISSING PROVIDER`, or `NOT YET CONNECTED` as a statement about the current Stable release.

## Local validation

Requirements:

```text
Node.js >= 22.21.0
```

Run the complete repository check:

```bash
npm run check
```

The current repository validation pipeline includes lint, tests, build, smoke, extension validation and store-readiness checks.

For production-extension validation, use the existing production extension scripts defined in `package.json`.

## Distribution status

Stable 0.6.0 is a public GitHub release with a Chrome/Edge package. Chrome Web Store and Microsoft Edge Add-ons submission/publication are separate deliberate distribution steps and must not be inferred from the GitHub release alone.

## Product and brand

- **Parent brand:** [Farsio - فارسیو](https://farsio.ir)
- **Product:** AvaYar · آوایار
- **Product line:** Persian Reading & Listening Assistant by Farsio
- **Tagline:** بشنو، به فارسی
- **Canonical brand mark:** [`assets/brand/avayar-flat.svg`](./assets/brand/avayar-flat.svg)
- **Product page:** https://farsio.ir/fa/products/avayar
- **Repository:** https://github.com/FarsioIR/AvaYar
- **Stable release:** https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0

## Roadmap

Near-term work should focus on quality, compatibility, browser-store distribution readiness, resilience and continued validation of the released capabilities. Future work remains non-promissory until source-backed implementation and acceptance evidence exists.

---

AvaYar is developed openly as part of the Farsio product family.
