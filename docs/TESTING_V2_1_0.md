# Precify Colombia 2.1.0 — Consolidated acceptance guide

**Status: NOT RUN / NOT HOMOLOGATED.** This document is a final-test specification, not evidence that the checks passed. No GitHub Actions should be used without explicit approval. The v2.0.1 `main` remains the stable release.

## One-shot local verification (Windows)

On the feature branch, with Node.js >=20.19 and pnpm 10.34.7:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd check:connected-api
pnpm.cmd build
pnpm.cmd verify:core
pnpm.cmd audit --audit-level moderate
```

The top-level `test` now covers core, web, backend security and the server-side integration SDK. The web test suite has static/source-level contracts, **not a replacement for end-to-end browser testing**. Treat any failure as a blocker before the final single PR.

## Financial core regression
- COP 2.0.1 price suggestions, PUM, v1/v2 backups, margin target denominator and rounding produce identical results to the released baseline.
- Native multi-currency pricing in COP, BRL, USD, JPY (0 decimals) and BHD (3 decimals), exact minor units, negative input rejection, discounts and zero/negative contribution; export/import and saved price history.
- FX: current no-key Frankfurter v2 data, provenance, source, rate timestamp, no-rate errors, offline stale cached pair, explicit lack of live interbank prices.
- Imported COD events: cancelled pre-shipment, shipped but failed, delivered unpaid, paid, refund without physical return, reverse shipping only for actual returns, duplicate ID replay vs conflict, sparse event field persistence.
- Compare campaign-level source IDs only over compatible time windows; no double counting cross levels, currencies, shipping, advertising or refunds.
- CPA sensitivity: 0/100% boundaries and mixed loss scenarios.
- CSV: BOM, CRLF, quoted commas/newlines, malformed quotes, 2 MB limit, 10k row limit, mapped columns, formula injection neutralization and same-ID conflicts.

## Offline and PWA
- Build and **serve production assets** over localhost HTTPS or deployed origin; first load online.
- Disconnect and refresh: original COP calculator, previously saved ISO products, COD dashboard, imported CSV, CPA matrix and cached FX quote must remain functional.
- If FX pair was never requested, show missing quote rather than inventing a conversion.
- Opt in to connected report caching, load report, disconnect and refresh; show stale cached summary with explicit date; disallow remote modifications while offline.
- Withdraw cache consent, confirm cached report is removed. Log out, confirm connected report data is removed for all organizations.
- Check SW upgrades do not cache API/auth requests or persist bearer tokens.

## Web embed for Vezura/other sites
- Host the static Precify web on a **separate origin**, permit only approved frame ancestors.
- Open `/?embed=1&lang=pt-BR` in a sandboxed iframe from another domain.
- Confirm ES/PT/EN, responsive sizing, no account, no localStorage access, no credential transfer, no unwanted telemetry or SW registration.
- Prove an iframe has no direct access to a Vezura order, customer session or private API key.

## Connected service
- Provision an isolated test PostgreSQL/Supabase project and apply `apps/service/sql/001_connected_schema.sql` manually; configure a separate server on HTTPS and public anon key only in Vite.
- Create two accounts and two organizations; verify viewer/analyst/admin/owner boundaries on each mutation and reads. An API key from org A must be rejected by org B.
- Create and revoke scoped API keys; signed webhook HMAC success, changed body/expired timestamp/replay/conflicting event, atomic batch rollback and no overwrites.
- Test exports, price history, account team assignment, deletion of operational data and full-org cascade after owner confirmation. Verify other organizations remain intact.
- Test API pagination over 500 rows, predictable ordering and fail-closed cap behavior; ensure dashboard never presents truncated totals as complete.
- Verify auth refresh token renewal, expiry, forbidden token, lost connection, stale cached reports.
- Test Vezura-style server-side SDK against the dedicated test API. Never put the secret in browser code.
- Run a focused professional security/penetration review before connecting real merchant data.

## Meta marketing integration (external requirements)
- Configure a real Meta developer app with `ads_read`, correct redirect URL, authorized Business/Ad Account and necessary app review/advanced access.
- Test OAuth state expiry and one-time atomic use, encrypted token storage, disconnect and expired token refresh/re-authentication.
- Import multiple ad accounts; verify cursor-pagination completeness, campaign/adset/ad levels and age/gender aggregate breakdowns.
- Confirm campaign-to-paid-order matching requires explicit raw source IDs and date; attributed conversions must not be displayed as confirmed paid orders.
- Confirm Meta terms, quotas, usage and privacy policies before real merchant deployment.

## Legal / operational limitations
- Tax classifications and legal compliance are **never automatic**, regardless of chosen ISO currency.
- FX rates are indicative daily references, not instant live trading quotes.
- Commercial hosting, privacy notice, controller/processor obligations and retention policies must be configured before opening real user registrations.
- No GitHub Actions, merge, PR opening or release as part of this unverified feature work.

## Acceptance record
| Area | Evidence | State |
|---|---|---|
| Core unit and regression | GitHub Actions #41303902552 | PASS: 61 core tests |
| TypeScript & lint | GitHub Actions #41303902552 | PASS |
| Production build / package | GitHub Actions #41303902552 | PASS |
| Service syntax/security SDK | GitHub Actions #41303902552 | PASS: syntax + 2 security + 1 SDK test |
| Browser accessibility/PWA | Offline/production browser walkthrough | Not executed |
| PostgreSQL/Meta | Isolated credentials and external service checks | Not configured |
| Legal/professional review | External scope-specific review | Not performed |

## Recorded GitHub Actions validation — 2026-11-01

The owner authorized a temporary, feature-branch-specific GitHub Actions gate. [Run #41303902552](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41303902552) **passed**, including `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm typecheck`, `pnpm lint` (existing AST lint implementation, not ESLint), `pnpm test` (61 core + 22 web + 2 service security + 1 server-side SDK = 86 total), `pnpm check:connected-api`, `pnpm build`, `pnpm verify:core` and `pnpm audit --audit-level moderate` with no known vulnerabilities reported.

Four preceding Actions attempts failed and were repaired. All checks above are backed by the GitHub job logs, not assertions inferred from source. Automated success does **not** cover real browser E2E, offline/PWA upgrades, production hosting, real Meta consent/permission verification, Supabase tenant/isolation E2E, operational financial reconciliation against live merchant datasets or penetration testing. These remain blocking for production-connected launch. No release or merge is authorized by CI success alone.
