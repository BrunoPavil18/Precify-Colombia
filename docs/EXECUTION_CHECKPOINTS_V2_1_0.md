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
| CP01 | IMPLEMENTED — UNVERIFIED | ISO minor-unit FX converter/cache; native international pricing with independent saved catalog, price history and JSON backup, ES/PT/EN UI | Code committed; build/typecheck/tests and offline browser checks pending |
| CP02 | IMPLEMENTED — UNVERIFIED | COD event funnel, ad reconciliation, CPA matrix, CSV mapping, browser-local operational dashboard, manual competitor price history and exports | Core operations, operational-csv and OperationsLab commits; tests pending |
| CP03 | IMPLEMENTED — UNVERIFIED | PostgreSQL/Supabase tables + RLS/revoked grants, organization roles, backend identity validation, REST, API keys, webhook signatures, export/deletion, connected web UI | apps/service server + SQL + ConnectedLab; needs deployment and integration tests |
| CP04 | IMPLEMENTED — EXTERNAL VALIDATION PENDING | Meta OAuth one-use state, token expiry/exchange, accounts, cursor-paginated insights at campaign/adset/ad level, aggregate demographics, disconnect, v26.0 default | Real Meta credentials, review, permissions, pagination acceptance and deployed integration still pending |
| CP05 | IN PROGRESS | Local dashboard, connected summaries, optional sessions/teams, generic REST + server SDK and stateless standalone iframe calculator, ES/PT/EN strings | UI QA, integration and pricing-history UX validation pending |
| CP06 | AUTOMATED PASS — EXTERNAL PENDING | Node 22 GitHub Actions approved: install, typecheck, AST lint, 86/86 tests, service syntax, Vite production build, ESM package check, dependency audit. PostgreSQL/Meta/E2E PWA still untested. | Run #41303902552; docs/TESTING_V2_1_0.md |

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

### Additional checkpoint — 2026-11-01
- Added native global pricing in arbitrary supported ISO currencies with variable minor units while preserving COP-only v2.0.1 API; separate currency calculator UI and quote cache.
- Added defensively parsed and mapped CSV imports for order events/campaigns, COD dashboards, CPA sensitivity and dated manually recorded competitor prices.
- Added connected-mode PostgreSQL/Supabase SQL schema, explicit tenant membership roles, server REST service, shared-secret HMAC webhooks, scoped server API keys, Meta authorization initial flow and reporting, and optional login UI. Backend secrets are server only; default local UI does not require account.
- Added [connected integration/deployment guide](CONNECTED_API_V2_1_0.md). **Vezura repository untouched.** Supabase project and Meta app are not configured by this work.
- Current code is **NOT TESTED / NOT DEPLOYED / NOT RELEASE READY**. Remaining: production-grade pagination/token lifecycle, full integrity/authorization tests, international calculations UI review, offline/PWA integration, final docs, compatibility and functional validation.
- Do not merge/publish or claim functional completeness. Continue from this checkpoint on the same branch.

### Resume checkpoint — 2026-11-01 after connection interruption

**New commits since the interruption** (all on `feat/precify-colombia-v2.1.0`, with no merge):
- Embedded iframe calculator (`?embed=1&lang=pt-BR`) for Vezura/other sites: no account, storage or API credentials. Hosted page requires separate origin and framing policy. Web service worker is not registered in embedded mode.
- Reconciliation safety: sparse paid/refunded order status events retain previously supplied sale amounts, costs and campaign ID; conflicting duplicate IDs are rejected; refunds without a physical return do not automatically incur reverse shipping. Meta campaign reconciliation matches raw campaign IDs only at campaign level and within the recorded time range.
- Monetary validation: unsupported fictional ISO currency identifiers and negative operational costs are rejected, while signed calculated results remain allowed. Native pricing and conversions remain separate from legacy COP pricing.
- Database: tenant-scoped, transactional order-event batches via `precify_import_order_batch`, one-time OAuth state consumption, paginated financial reports that fail rather than silently truncate, optional per-user auth session refresh and owner-confirmed organization deletion.
- Meta: `v26.0` default replacing old `v24.0`, multiple insight levels, cursor pagination (fail closed if capped), permission-scoped demographic aggregates, encrypted token handling and expiry checks.
- Security/privacy UX: explicit import/backup restore, recovery of damaged raw local data, offline-cache consent revocation and full-org deletion confirmation. New ES/PT/EN strings and source-level translation coverage tests.
- Documentation: `docs/CONNECTED_API_V2_1_0.md` explains direct Vezura iframe and server-side SDK routes. **No changes to the Vezura repository.**

**Known blockers / honesty requirements:** Node/TypeScript builds and automated tests on this feature branch have **not** been executed in this environment (GitHub DNS inaccessible); no PostgreSQL/Supabase project, live Meta app credentials, browser/iframe hosting or actual third-party login were connected. No guarantee of full functionality or compliance until acceptance. The only verification in this turn has been GitHub branch/file reads and GitHub-confirmed commits, together with focused static checks of relevant source translations.

**Next steps (continue in the SAME branch, not from main):** finish connected-service consistency, integration/security checks and UI details; run one consolidated local `pnpm install --frozen-lockfile`, typecheck/lint/unit/integration tests, build, SDK tests, browser/offline PWA checks, Postgres tenant isolation, Meta OAuth and webhook smoke tests (when external credentials are provided), then final overall audit/documentation and ONE PR. No GitHub Actions, merge or release yet.

### Additional saved-state checkpoint (2026-11-01)
- Global ISO pricing now saves separate international products with bounded historical sale prices, safe cross-tab collision detection, export/restore, corrupted-raw-data rescue and explicit destructive confirmation. It does **not** rewrite old COP v1/v2 backups.
- Connected financial reports now support user-consented offline cache restoration after a lost connection and clear cache when consent is revoked/logout occurs; the server rejects incomplete paginated aggregates.
- Marketing campaign/order reconciliation now respects exact raw source campaign IDs, campaign-level only, and the reported date window; Meta ad/adset breakdowns are never automatically treated as verified paid orders.
- Server onboarding includes owner-confirmed deletion of an entire tenant and an atomic order batch import. Direct host-independent iframe and server-side Vezura-compatible API integration have separate security boundaries.
- Updated ES/PT/EN READMEs to show 2.1.0 **unreleased development**; updated architecture, COP/ISO policy and direct integration guide; created [consolidated QA guide](TESTING_V2_1_0.md). Root local test script now includes backend security and SDK tests, but **no automated suite or deployed integration has been executed**.
- **Next continuation priority:** code/test-driven integration closure (typed endpoint contracts, backend permissions and connected-report accuracy), final i18n/UI responsiveness, then consolidated local CI-less verification and one final PR only. Do not treat branch as homologated or publish it.

### Latest incremental checkpoint — 2026-11-01 (resume after interruption)

- **New international catalog**: `apps/web/src/global-storage.ts`, `GlobalPricingLab.tsx` now support saving native ISO products, up to 500 entries, recorded price history, explicit confirmed restore, independent JSON backups, cross-tab conflict locks and raw-damaged-data rescue. Preserves all 2.0.1 COP products/backups.
- **Operations and ad reconciliation**: sparse status events no longer erase earlier nonzero amounts, duplicate event IDs with differing payloads fail, refunded orders without actual physical returns do not automatically incur reverse shipping, and Meta campaign attribution checks matching raw campaign ID and source date window; documented semantics still need financial regression tests.
- **Connected API**: atomic PostgreSQL import procedure, paginated reads (fail closed above configured cap), signed webhooks, optional session refresh, explicit owner-only full-organization deletion, cached read-only organization summaries on lost connectivity and cache removal on opt-out/logout.
- **Direct integration**: static, no-account `?embed=1&lang=pt-BR` calculator on a separate origin; server SDK for trusted third-party backends, including Vezura. Never expose privileged API keys in an iframe.
- **Currency source**: Frankfurter v2 confirmed to provide indicative **daily** data, not live prices. Meta default upgraded to Marketing API v26.0. No key/permission was provisioned or activated.
- **Documentation**: ES/PT/EN READMEs, architecture, COP/ISO policy, CHANGELOG marked **2.1.0 UNRELEASED**, integration and consolidated QA instructions in `docs/TESTING_V2_1_0.md`. Responsive styles added for connected/local/iframe modules.
- **Verification actually executed**: GitHub connector read/commit confirmation and limited syntax-only parsing of the service, security helper and server integration SDK; all three parsed successfully. **No typecheck, full lint, automated tests, production build, PWA E2E, isolated PostgreSQL test or Meta live integration test was executed.** Do NOT mark this branch homologated.
- **Git policy**: no GitHub Actions intentionally executed, no PR yet, no merge, no release. The `main` remains the v2.0.1 baseline; Vezura untouched.

**Resume next**: finish focused typed API/React integration review, security permissions/remote report edge cases and multilingual UX; then run the consolidated suite in `docs/TESTING_V2_1_0.md`. A live external acceptance environment requires a separate authorized Supabase project and approved Meta app. Do not run Github Actions. Only after real local verification create **one consolidated PR**.

### 2026-11-01 — explicit GitHub Actions authorization
The owner explicitly authorized GitHub Actions for validation in this conversation. The GitHub connector has no workflow-dispatch operation and this repository has no workflow on `main`; no change to `main` is authorized. A temporary feature-branch-only workflow is therefore limited to pushes affecting `.github/validation-trigger-2.1.0.txt` (normal code/PR pushes do not run it), one Ubuntu/Node22/pnpm10 job, 12-minute maximum, read-only token, no secrets, no deployment or release. Results are not yet known. Once evidence is gathered, remove the temporary workflow and trigger so it cannot start again accidentally. Real Meta/Postgres/browser checks are not replaced by this run.

### Evidence: owner-authorized GitHub Actions — 2026-11-01

The owner explicitly authorized using GitHub Actions for this branch. A temporary, single-branch signal-only workflow ran **five** focused validation attempts (no PR/push-wide automation, no matrix, no release, no deployment):

- [#41303397947](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303397947) — failed: missing nonnegative helper import and optional currency precision type.
- [#41303498834](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303498834) — failed: COP rounding precision returned 0 in the runner's ICU instead of required 2, and unfinished JSX block.
- [#41303643271](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303643271) — failed: undefined campaign reconciliation type and static i18n regex.
- [#41303762517](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303762517) — failed: missing delete-confirmation translation and stale ESM version assert.
- [#41303902552](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303902552) — **SUCCESS** (commit `dbff5604c9aa3dd9b0968af9b38172293391f498`): frozen install, TypeScript, AST lint, 61 core tests, 22 web tests, 2 service security tests, 1 server SDK integration test = **86/86 tests**, service syntax, production build, ESM exports, `pnpm audit --audit-level moderate` reporting **no known vulnerabilities**.

The total five run durations recorded by GitHub are 23s, 24s, 30s, 37s and 44s (2m38s of elapsed run time; actual billed minutes depend on GitHub's own accounting). The temporary workflow and signal should be removed after recording results. Code changes after the successful SHA are limited to documentation and removal of this temporary CI infrastructure.

**Not covered by this successful Actions job:** real Supabase/PostgreSQL schema migration and tenant-isolation E2E, Meta OAuth/account permissions and real Ads insights, webhook live endpoint, iframe/browser device coverage and offline/PWA E2E, penetration and jurisdiction-specific regulatory review. Do not mark production/homologation complete; no merge or release was authorized.

### Final CI cleanup confirmation — 2026-11-01
The temporary `.github/workflows/validate-v2.1.0-once.yml` and `.github/validation-trigger-2.1.0.txt` were both removed from the feature branch after GitHub Actions success #41303902552. GitHub shows five completed validation runs, with no further run on the cleanup commits. No ongoing automatic push/PR workflow was retained; the `main` baseline remains unchanged. The source code validated by CI differs from the final feature-branch HEAD only by documentation/CI-file cleanup. Not yet production-homologated due to external integration and browser acceptance gaps.

### Connected-mode consistency pass — 2026-11-01, after owner asked to proceed

No user account, paid service, Meta credentials, Supabase deployment or Vezura changes required for this pass.

- Fixed operational-data deletion: now calls `precify_erase_operational_data` (one PostgreSQL transaction), instead of deleting eight groups sequentially and risking partial erasure. Preserves organization, members and a minimal audit record.
- Fixed campaign batch imports: `precify_import_campaign_batch` uses the same tenant-specific transaction/advisory-lock convention as order events and deletions. Conflicting same-ID campaigns from different sources/currencies are rejected; current same-source observations can still be updated.
- Corrected PostgREST RPC handling of empty/204 responses; empty `void` RPC result is no longer parsed as JSON.
- Web connected mode uses one token-refresh path, obtains explicit report-cache consent for each organization, and clears the previous report when switching organizations.
- Added four source/SQL contract regression tests in `apps/service/tests/connected-contract.test.mjs`; **these assert API and SQL contracts, not actual PostgreSQL transaction execution**.

**Owner-authorized CI evidence:**
- [#41308887058](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41308887058): failed because of a duplicate `body` variable in the server's RPC response parser and a cache-consent guard not applied; both corrected.
- [#41309016163](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41309016163): **SUCCESS** with frozen install, typecheck, AST lint, 61 core + 22 web + 6 service + 1 SDK tests = **90/90**, service syntax check, production build, ESM verification and no known moderate-or-higher dependency vulnerabilities.
- Removed temporary workflow and signal after validation. Neither `main` nor Vezura was changed. No automatic Actions configured.

**Remaining external acceptance:** run the schema and real tenant-boundary/transaction tests in a dedicated Supabase/PostgreSQL test project; connect a real, approved Meta Ads application to verify OAuth and campaign insights; do browser-level iframe/offline/PWA tests. Do not call the connected service fully homologated without these. A production-connected launch will require deployment accounts, application registration, redirect URLs and secure credentials, but **no such user action is required to finish the current repository-only work**.

### Single consolidated PR — draft for external acceptance
- Opened **[PR #4](https://github.com/BrunoPavil18/Precify-Colombia/pull/4)** from `feat/precify-colombia-v2.1.0` to `main` as **DRAFT** after successful automated contract checks. This is the only v2.1.0 PR; not a merged or released version.
- The PR description records completed modules and remaining real database/Meta/browser verification. It may be converted to ready only after unresolved acceptance conditions are addressed; no merge/release without the owner's explicit approval.
- The GitHub temporary validation workflows were removed; the last source-affecting commit was validated successfully by Actions #41309016163, with later commits limited to documentation/CI cleanup.
- No immediate action is required from the owner for repository work; provisioning a dedicated Supabase test project and a real Meta developer app will require an explicit setup decision before those external flows can be authenticated.
