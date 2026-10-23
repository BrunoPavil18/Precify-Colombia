# Precify Colombia 1.0.0 — Release Notes 🇨🇴

**Proposed tag:** `v1.0.0`  
**Target branch:** `main`  
**License:** Apache License 2.0  
**Status:** release notes prepared; GitHub Release/tag must be published separately by a maintainer.

## First official stable source release

Precify Colombia is an original, free, open-source, browser-local pricing application for Colombian commerce, in COP. It runs without required accounts, external APIs, commercial services, or backend.

### Included

- TypeScript financial engine with exact integer-cent arithmetic, explicit rates, rounding and input validation.
- Unit acquisition, packaging, shipping, fixed and percentage fees, advertising, COD and return provisions, illustrative IVA, discounts and recommended pricing.
- Contribution, markup, contribution margin, projected monthly net earnings and break-even calculations.
- Saved products, reusable cost profiles, isolated optimistic/expected/conservative scenarios and product-specific monthly goals.
- Local reports, CSV export, versioned JSON backup and restore, protected local storage.
- Colombian Spanish, Brazilian Portuguese, and English static interfaces.

### Storage and privacy

A clean installation or new browser site origin starts with no stored products, scenarios, profiles, or history. User workspace data is saved only in browser `localStorage`, under `precify-colombia:workspace:v1`. Developer sample data is not embedded into source or distribution builds. The calculator's sample fields are **not** a saved product. Export JSON backups regularly; data may be lost if site storage is cleared.

### Integration

- **Web/WordPress:** build `apps/web/dist/`, host over HTTPS, optionally iframe the hosted UI. No WordPress plugin or live commerce synchronization is provided.
- **Node.js/TypeScript:** reuse `packages/core` as source within a pnpm workspace or bundled derivative. The core is not published to npm as part of this release.
- Read [Spanish installation instructions](../README.md), [Portuguese instructions](../README.pt-BR.md), and [English instructions](../README.en.md) for integration details.

### Validation evidence

The maintainer locally reported:
- `pnpm typecheck`: passed.
- `pnpm test`: **38/38** tests passed (23 core + 15 web).
- `pnpm build`: passed with Vite 8.3.4.
- An earlier `pnpm audit --audit-level moderate` reported no known vulnerabilities. This is not proof of absolute security.
- Manual checks covered product persistence, scenario isolation, goals, multilingual UI, and backup deletion/restoration.

**Known follow-ups:** improve horizontal overflow of the mobile navigation, add a dedicated lint tool, extend automated browser E2E/accessibility tests, test malformed-backup recovery and cancellation flows. These items are not presented as completed.

### No bundled personal data

No backup files, merchant products, saved scenarios or localStorage databases are distributed with the app. Do not add personal backup JSON exports to this repository or a release asset.

### Suggested GitHub publication

In the repository, choose **Releases → Draft a new release**, create tag `v1.0.0` targeting the current `main`, title it **Precify Colombia 1.0.0**, paste this document (omit publication instructions), and publish when ready. Do not enable automated build/deploy or GitHub Actions. GitHub's source-code ZIP/tar.gz assets are enough for this source release; the build can be generated locally.
