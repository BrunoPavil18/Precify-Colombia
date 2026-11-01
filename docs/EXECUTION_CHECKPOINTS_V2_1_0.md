# Precify Colombia 2.1.0 — Execution checkpoints

> **Canonical handoff and recovery document.** Updated whenever a coherent implementation increment is committed. This is one consolidated version and **not** authorization to merge, publish or enable GitHub Actions.

**Started:** 2026-11-01
**Branch:** `feat/precify-colombia-v2.1.0` (branched from `main`, v2.0.1 baseline)
**Repository:** https://github.com/BrunoPavil18/Precify-Colombia
**Owner direction:** deliver all 2.1.0 capabilities together; do not touch Vezura's repository; make the Precify app itself directly embeddable/integrable into Vezura and other websites. No intermediate PR/release or general code audits until consolidated delivery.

## Planned delivery contract
- Preserve existing COP BigInt financial core, local-first app, v1/v2 JSON backups, ES/PT/EN and public APIs.
- Add opt-in connected mode: accounts, organizations, role-based access, durable server storage, history, export/erasure, and a clear separation between local simulated and remote observed data.
- Add generic authenticated REST API, signed and idempotent webhook ingestion, CSV order/ad imports, delivery funnel, campaign-to-order reconciliation.
- Add Meta Facebook Ads OAuth connection, multiple accounts, insights import, security of refreshable credentials and disconnect; external access and review requirements cannot be bypassed.
- Add COD unified pricing, CPA-vs-delivery sensitivity, dashboards, competitor price tracking by user-supplied records, price change history and reporting.
- Add support for multiple ISO currencies with explicit FX quotes, dates, source, no silently mixed-currency arithmetic, stale/offline cached rate fallback. Prefer no-key Frankfurter v2 daily indicative source, not a real-time trading feed.
- Make web embeddable from a hosted URL or integration API and reusable core package. Don't modify the Vezura repo and do not add native Mastershop/Shopify/Nuvemshop integration.
- Maintain offline local simulator and last synced read-only reports when connection is lost; never imply offline external operations synchronize instantly.

## Checkpoints
| ID | State | Summary | Evidence / commit |
|---|---|---|---|
| CP00 | COMPLETE | Created feature branch and this durable recovery document | See branch commit history |
| CP01 | IMPLEMENTED — UNVERIFIED | ISO minor-unit conversions, Frankfurter daily FX per-pair cache, offline fallback, independent exchange page, PT/EN strings, unit tests | See commits following CP00; run build/typecheck/tests before marking COMPLETE |
| CP02 | IN PROGRESS | COD event funnel, ad attribution reconciliation, CPA sensitivity and tests committed; CSV mapping and UI pending | See core operations commits |
| CP03 | NEXT | Build opt-in connected-service data model, API, authorization, tenant boundaries and durable persistence | Pending |
| CP04 | NEXT | Add Meta OAuth + insights integration; secure tokens, API/webhook contract and operational metrics | Pending |
| CP05 | NEXT | Integrate dashboard, accounts, import, history, reports and embed UI; static translations | Pending |
| CP06 | NEXT | Compatibility, automated tests, production/offline/browser verification, docs and release preparation | Pending |

## Decisions and hard safety boundaries
1. A merchant must explicitly opt in to any network data sync; existing browser workspaces are untouched unless they authorize import or sync.
2. Store money as canonical decimal-string/integer minor units, and never perform financial calculations by multiplying untrusted JS floating-point numbers.
3. Store exchange-rate observations with `base`, `quote`, `rate`, `date`, `source` and `fetchedAt`; offline calculations are indicative and must display staleness.
4. Never accept unverified Facebook access tokens from query strings; OAuth credentials and webhook signing secrets must stay server side.
5. Distinguish estimated performance, imported operational facts, and attributed ad-platform metrics. Do not infer conversions paid without source evidence.
6. Do not create or execute GitHub Actions; no changes to main, tags, releases, Vezura or commercial services during implementation.
7. Do not mark tests as run until local execution evidence exists; container GitHub DNS access has failed.

## Handoff instructions
On the next ChatGPT conversation, provide this document path and request a fresh fetch from **the current feature branch**, not main. Continue at the first checkpoint not marked COMPLETE, preserving existing commits and outputs. Read the latest commit SHA and pending blockers. Do not restart from the original plan or redo general audits. Work is not finished until all required modules are integrated and verified, and there is one final consolidated handoff.

### 2026-11-01 incremental checkpoint
- Created `packages/core/src/fx.ts` and `packages/core/tests/fx.test.mjs` (pure integer conversion; configurable ISO currencies), `apps/web/src/CurrencyLab.tsx` (Frankfurter daily quotes with local cache and offline fallback), and integrated currency navigation. Existing COP pricing workflow untouched.
- Created `packages/core/src/operations.ts` and tests for event-based order funnel, source-identified reconciliations and CPA × delivery matrix. Exported from core. No external platform credentials connected.
- **Environment limitation:** this agent's container cannot resolve github.com; GitHub connector has been used for commits. Build/tests of this branch have not yet been executed. No general audit, CI, PR, merge or release.
