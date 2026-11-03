# Precify Financy 2.1.0 — Supabase live database verification

Date: **2026-11-01**. Status: **DATABASE SCHEMA & TRANSACTION SMOKE PASSED; application E2E pending**.

## Target and limits

- Supabase project: `ugjwlckfscgspjaufsak` (Precif-Colombia, Precify organization).
- Database: PostgreSQL 17.11, project status ACTIVE_HEALTHY.
- This is an isolated Precify project, **not the Vezura database**. Its dashboard labels the default branch as production, so schema applies to the project's own primary database.
- No merchant/customer data, environment secrets, access tokens or Meta authorizations were used.
- The GitHub `main`, release 2.0.1 and Vezura repository were not modified.

## Applied, versioned migrations

| Supabase migration | Repository source | Result |
|---|---|---|
| `20261101132135_precify_colombia_210_connected_schema_initial` | `apps/service/sql/001_connected_schema.sql` | Success |
| `20261101132339_precify_colombia_210_security_hardening` | `apps/service/sql/002_security_hardening.sql` | Success |

The follow-up fixes five `search_path` advisory warnings for all five security-invoker RPC functions and creates an index on `precify_oauth_states(org_id)`.

## Direct, real PostgreSQL evidence

- 11 `public.precify_*` tables exist, all RLS-enabled. They start with zero rows.
- `anon` and `authenticated` have no direct SELECT privileges; `service_role` has database read/write privileges.
- All five `precify_*` functions are explicitly non-executable by `anon`/`authenticated`, executable by `service_role`, with pinned empty search paths.
- Tested real functions on actual PostgreSQL using two synthetic organizations and a transaction rolled back at the end:
  - Organization creation inserts the owner membership.
  - Order event batch insert and idempotent replay.
  - Conflicting order event causes batch rollback, without partially adding another event.
  - Campaign insert/upsert for the same source and currency.
  - Conflicting campaign source causes atomic batch rollback.
  - OAuth state consumption succeeds only once.
  - Operational erasure removes data for tenant A but preserves its membership and an audit entry.
  - Tenant B's orders and campaigns remain intact.
  - Additional smoke executed with `SET LOCAL ROLE service_role` validates RPC execution by the runtime DB role.
- The committed, independently re-executed suite is `apps/service/sql/tests/connected_live_smoke.sql`; its `BEGIN ... ROLLBACK` design leaves no synthetic records.
- A post-test count explicitly confirmed **zero** organizations, memberships, orders, campaigns, prices, OAuth states and audit events.

## Database advisors after hardening

- **Security warnings:** none for function search paths. 11 informational `rls_enabled_no_policy` notices remain intentionally: this version's API is server-mediated using a protected secret/service-role key and app-side membership validation. No direct Data API access is granted to user/anon roles. Do **not** silence this by adding permissive policies.
- **Performance:** no missing FK index after adding the OAuth organization index. 2 informational `unused_index` notices are expected while the database is empty; retain those indices for normal workloads.
- Advisors: https://supabase.com/dashboard/project/ugjwlckfscgspjaufsak/advisors/security and https://supabase.com/dashboard/project/ugjwlckfscgspjaufsak/advisors/performance .

## Still not verified

- Running the separate Precify Node HTTP backend with real **server-held** Supabase secret/publishable keys and verifying Auth JWTs and organizational role checks end-to-end.
- Truly concurrent two-connection import/erasure races (the sequential atomic rollback and advisory-lock definitions were tested, not simultaneous load).
- Real signed webhooks, OAuth Meta permission approval and insights imports, browser-based accounts/teams, cross-browser session refresh, PWA, iframe and offline E2E.
- Production privacy/authorization penetration review.

Do not publish the connected service as fully homologated or merge the single draft [PR #4](https://github.com/BrunoPavil18/Precify-Financy/pull/4) solely on this database evidence.
