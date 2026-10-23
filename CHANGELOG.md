# Changelog

## [2.0.1] — unreleased candidate, under validation

- Fixed campaign projected profit to account for projected refunds, separated attributed ROAS and projected ROAS, and exposed attribution mismatch and reconciliation data.
- Corrected COD failed-attempt cost incidence to dispatched-but-undelivered orders, exposed cancellations, unpaid deliveries and per-shipped-order profit.
- Preserved mathematical PUM output and added separately truncated two-decimal SIC-oriented presentation, with exact fraction and conditional legal guidance.
- Fixed constant-mix break-even to use exact aggregate ratios instead of a prematurely rounded mean.
- Updated user interface metrics, ES/PT/EN translations, package version, PWA static cache identifier and regression cases.
- Preserved `suggestPrice`/discount margin-target contract, local workspace/backups and all v2.0.0 releases.

**Not yet verified locally:** patch typecheck, lint, tests, build, audit, E2E/offline browser and independent tax/legal certification. GitHub PR remains open until acceptance.


## [2.0.0] — 2026-10-23 (merged into `main`; release/tag published separately)

### Added
- Advanced COD risk simulator separating created, shipped, delivered, and paid orders with explicit reserves and costs.
- Campaign simulator: hypothetical conversion, CAC, maximum CAC, ROAS, break-even ROAS, returns and projected contribution.
- Price per unit of measure (PUM) across mass, volume, length and individual units.
- Consumer price preview distinguishing tax included, tax added, or no tax, plus shipping, charges and discounts.
- Multi-product portfolio simulator, weighted contribution and a single shared monthly fixed-cost deduction.
- Saved advanced simulations grouped by module and version 2 JSON backup export, with v1 import support.
- PWA manifest, installable icon, offline static-asset caching and consent-driven service worker updates.
- Compiled ESM `@precify-colombia/core` entry point and TypeScript declarations; `pnpm verify:core` checks built artifacts.
- A dedicated TypeScript AST source-policy lint step in addition to typechecking.

### Improved
- Explicit contribution margin denominators (net product sale versus total collected revenue) and separate commercial/contribution markup.
- Zero contribution is no longer presented as financially viable.
- Localized percentage parsing; COP amounts and ratio units in the advanced interface.
- Own accessible confirmation dialogs with cancellation and keyboard navigation instead of native browser confirmations.
- Unsaved-draft navigation safeguards, full-workspace snapshot conflict detection across tabs, responsive navigation and static ES/PT/EN dictionaries.
- Legal/financial guidance with dated official Colombian references and stated limitations.

### Validation reported by maintainer
- 53 automated tests passed: 34 core + 19 web.
- Typecheck, AST lint (15 source files), production build, and ESM output verification passed.
- Dependency audit at moderate level reported no known vulnerabilities.
- 24 manual functional checks reported passed, including backup import from v1.

### Known limits
- Browser `localStorage` is not an atomic, synchronized multiuser database: simultaneous writes may still race.
- Static web tests do not replace a comprehensive accessibility audit, professional financial review or external legal/tax advice.
- PWA availability and iframe storage depend on browser security policies and origin.
- No npm publication, WordPress plugin, checkout integration, automatic Colombian tax compliance or mandatory cloud services.

## [1.0.0] — 2026-10-23

Initial public release: precise COP pricing core, products, independent scenarios, goals, profiles, reports, CSV safeguards, browser-local history, JSON backup and restore, and Spanish/Portuguese/English interface. Apache-2.0.
