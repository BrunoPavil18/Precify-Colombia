# Precify Financy 2.1.0 — Connected Service (work in progress)

**Important:** this is an opt-in service under active development, not a publicly hosted or audited service. The free, offline calculator continues to work without any account, server or integration.

## Configuration

1. Deploy a dedicated PostgreSQL/Supabase project (free/self-hosted options depend on your operator).
2. Review and apply both versioned migrations in order: `apps/service/sql/001_connected_schema.sql`, then `apps/service/sql/002_security_hardening.sql`. Do not reapply already recorded migrations.
3. Copy `apps/service/.env.example` into your deployment's secret manager. Generate a 32-byte random encryption key and provide its **64-character hex representation**. Set TLS origins and secrets. Never put the Supabase service-role key or Meta app secret in the frontend.
4. Build the core before launching: `pnpm --filter @precify-financy/core build`; then `node apps/service/server.mjs`.
5. Deploy behind HTTPS. The service binds to 127.0.0.1 by default and can be reverse-proxied; set a fixed allowed web origin.
6. For optional web login, set only the three `VITE_` variables for Supabase's PUBLIC anon key, URL and Precify API origin.

**No external API credentials or hosting have been created by this repository.** Nothing automatically registers a Facebook app or grants ads permissions.

## Generic API for Vezura and any other website

The service exposes `/v1/orgs/:id/orders/import`, `campaigns/import`, `orders`, `campaigns`, `dashboard`, `export`, `prices`, and related organization/team management routes.

After authenticating a user and creating an organization, its owner can issue a one-time API key via `POST /v1/orgs/:id/api-keys` using JSON `{"scope":"write"}`. Integrators should call the API from a **trusted backend**, never embed the API key in browser JavaScript, HTML, or mobile app source.

Example, run on the integration server:
```bash
curl -X POST https://api.precify.example.com/v1/orgs/ORG_UUID/orders/import \
  -H 'Authorization: ApiKey prc_live_REPLACE' -H 'Content-Type: application/json' \
  -d '[{"id":"event-1","orderId":"order-1","source":"vezura","occurredAt":"2026-11-01T12:00:00Z","status":"created","campaignId":null,"currency":"COP","grossRevenue":"99000.00","productCost":"40000.00","shippingCost":"0","reverseShippingCost":"0","advertisingCost":"0","otherCost":"0","refundAmount":"0"}]'
```

This is **generic** integration — no dependency on Mastershop/Shopify/Nuvemshop or Vezura-specific code. The Vezura repository is not modified. Users may also embed the hosted Precify UI by iframe where framing/storage policies permit. A shared logged-in session and synchronization of products/orders require explicit integration work; an iframe by itself does not provide either.

### Webhook ingestion

`POST /v1/orgs/:id/webhooks` (org admin/owner) creates an endpoint and returns a secret **once**. Sender computes HMAC SHA-256 over:

`timestamp + "." + exact_utf8_request_body`

Send `X-Precify-Timestamp` as milliseconds since Unix epoch and `X-Precify-Signature: sha256=<hex>`. The server rejects timestamps outside five minutes, invalid signatures and conflicting event IDs. The same event ID is idempotent. A webhook does **not** contain API keys.

### Authentication, teams and isolation

The web login uses Supabase Auth password flows; account confirmation may be required. The API validates user bearer tokens with Supabase Auth and **then** checks every request's organization membership. Roles: viewer, analyst, admin, owner. Server-to-server API keys are per-org, scoped to read/write and stored only as SHA-256 hashes. Organizations and records are segregated by organization ID. PostgreSQL tables have RLS enabled and direct anon/authenticated grants removed; the trusted service-role key is server-only.

**Deployment requirements:** configure TLS, CSP, monitoring, secure backups, retention rules, abuse prevention, password policies, email confirmation, Meta review and a strong secret manager. This implementation has not been penetration tested.

### Facebook Ads

An org admin with a user session calls `POST /v1/orgs/:id/meta/connect`. The service returns an OAuth URL with a ten-minute, one-time state persisted in Postgres. After callback, the access token is encrypted server-side with AES-256-GCM. `GET /v1/orgs/:id/meta/accounts` discovers ad accounts authorized to that user; `POST /v1/orgs/:id/meta/sync` accepts `{"accountId":"act_...","since":"YYYY-MM-DD","until":"YYYY-MM-DD"}` and imports source-labeled campaign insights. Access is read-only (`ads_read`).

Meta may demand Business Verification, App Review and Advanced Access for customers outside app roles; none of those approvals are bypassed by code. Never present partial paginated results as complete. Insights are **attributed by Meta**, not proof of paid COD orders. Orders must include a matching explicit campaign ID to reconcile.

## Offline policy

Calculator, locally imported events, CPA matrix and last FX observations remain in browser local storage. Connected reports are read-only while offline using only explicit previously cached data. Authentication, Meta synchronization, webhooks, and any remote changes need connectivity. Never silently auto-upload preexisting local backups.

## Caveats and planned acceptance

Full Postgres integration, multi-user authorization, Meta business approval, live webhook senders and production PWA/offline behavior cannot be validated without a configured deployment and credentials. Treat server code as **not yet production-certified** until acceptance checks run. No GitHub Actions, merge or release are authorized by this work.

## Direct website integration — Vezura and other sites

Precify now exposes **two independent integration methods**, without changing Vezura or requiring a native commerce-platform connector.

### A. Embed the free, stateless calculator

After hosting the Precify web build at `https://precify.example.com`, include a sandboxed iframe in your store's information/tools page:

```html
<iframe
  title="Precify Financy – Financial Calculator"
  src="https://precify.example.com/?embed=1"
  style="width:100%;min-height:820px;border:0"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin allow-popups"
></iframe>
```

Embed from a **separate Precify origin** rather than a same-origin store path; this avoids giving a same-origin script-enabled sandbox the power to relax its parent-controlled restrictions. The optional URL parameter `&lang=pt-BR` starts the iframe in Portuguese without reading local storage.\n\nEmbedded mode renders only the standalone international pricing calculator in ES/PT/EN. It **does not use login, localStorage, customer cookies, store order access or the connected service**. It performs calculations within the iframe. A browser with restrictive third-party storage or connectivity can still use it after the public application assets load. The static-site host must explicitly allow embedding using an appropriate `Content-Security-Policy: frame-ancestors` policy. Never weaken framing permissions for the authenticated full dashboard solely to make the public calculator embeddable.

Do not confuse this with *signed-in integration*: embedded mode is a calculator, not automatic sharing of the Vezura customer's cart, financial records or advertising account.

### B. Server-to-server connected operations

Use `integrations/precify-client.mjs` from the Vezura **server**, or any other backend, with a per-organization API key kept in a secret manager:

```js
import {PrecifyConnectedClient} from "./precify-client.mjs";
const client=new PrecifyConnectedClient({
  baseURL:process.env.PRECIFY_API_URL,
  apiKey:process.env.PRECIFY_API_KEY
});
await client.sendOrderEvents(process.env.PRECIFY_ORG_ID,[orderEvent]);
const report=await client.dashboard(process.env.PRECIFY_ORG_ID);
```

Do not call the above SDK directly in browser bundles; its key is privileged and intended for a trusted backend only. Orders must use stable, unique event IDs for idempotent delivery. The PostgreSQL batch import procedure uses a tenant-scoped transaction to avoid partially imported batches and conflicting replays.

The v2.1.0 features are not yet deployed or independently penetration-tested. A Vezura integration still requires future backend configuration and Vezura-side implementation, intentionally **outside this Precify branch**.

### C. Source package

`@precify-financy/core` exports both the unchanged COP financial contract and separate international operations, FX and global-pricing functions. Compiling local source does **not** imply npm package publication.

## FX and limitations

Frankfurter v2 exposes no-key, generally daily reference rates: https://frankfurter.dev/ . It is **not** a live trading-price feed. The app stores selected rates by base/quote with timestamp, displays stale/offline status and never assumes a rate when none is available. Supported ISO codes can exceed the set of currency pairs currently published by a given provider; failures must be explicit. Native international pricing uses values in exactly one selected currency, independently of exchange conversion.

## Additional privacy and security safeguards

- Complete organization deletion is a separate, owner-only, explicitly confirmed action that cascades to child tables; deleting only operational data does not delete membership.
- Authenticated web sessions attempt refresh shortly before expiry and clear locally cached connected reports on logout or withdrawn cache consent.
- API/webhook event uploads use a privileged, transactional SQL routine for conflict-safe idempotency; generic dataset reads are paginated with hard caps rather than silently truncated.
- The Meta connector targets Marketing API `v26.0` by default; live integration requires valid provider credentials, permissions and an operational deployment.
- Full reports, webhook tests, PWA offline usage and third-party embedding require browser/host validation before claiming production readiness.

## Transaction-safe operations — current 2.1.0 candidate

After upgrading the feature branch in a **dedicated test project**, reapply `apps/service/sql/001_connected_schema.sql` explicitly. The script uses idempotent `create if not exists` and `create or replace function` statements: older installations of the development schema need the updated functions `precify_import_campaign_batch` and `precify_erase_operational_data`, as well as the previous `precify_import_order_batch`. Do **not** apply it to a merchant's existing production database without a reviewed migration/backup.

The server owner-only `DELETE /v1/orgs/:id/data` now uses **one PostgreSQL transaction** and an organization-scoped advisory lock to delete only that organization's operational events, campaigns, prices, Meta connections, OAuth states, API keys and webhook secrets. Memberships and the organization survive. A minimal audit of erasure remains. Full-organization deletion is a **separate**, explicitly ID-confirmed owner action.

Order and campaign imports share the advisory lock; same-ID campaign updates must retain source and currency, while conflicting duplicate IDs within one batch are rejected. `void` RPC success may have an empty response body, handled by the server. This design has passed real PostgreSQL function tests and rollback-only two-tenant smoke tests on the dedicated Precify Supabase project, but true simultaneous sessions, deployed HTTP authorization, live webhooks and third-party authentication remain untested. See [database evidence](SUPABASE_LIVE_VALIDATION_2026-11-01.md).

The React connected UI caches read-only financial summaries only with permission for the **selected organization**, avoids two refresh-token renewals per request and clears the previous organization's visible report on selection. Cache is optional; the legacy local COP workspace remains independent.

[Successful CI after these changes (90 tests)](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41309016163). No real Meta credentials, automatic deployment or GitHub Actions workflow remain configured.

## Supabase 2026 API key transition

The connected backend now prefers `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from a **private server environment**. Existing `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY` remain accepted as fallback. For the current React build, set the public `VITE_SUPABASE_ANON_KEY` variable to a **publishable** or legacy anon key; do not place any secret/server key in a `VITE_` variable.

Supabase documents its migration away from legacy JWT API keys. See https://supabase.com/docs/guides/getting-started/api-keys and https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys. The opaque secret key must remain on the backend and be used only with the project's trusted Supabase gateway; this has not yet been proven with this application's real project or account. Never copy keys into this PR or a chat message.


## Novo: sincronização em que cada site é a fonte de verdade (2.1.0 candidata)

Para negócios que já guardam seu próprio histórico, **não é obrigatório importar os dados para o servidor Precify**. Consulte [o contrato independente de sincronização por site](SITE_OWNED_SYNC_V2_1_0.md), que usa `identity` e `changes` com cursor e token de leitura da própria loja. O consumidor PWA local armazena seus dados consentidos no IndexedDB, atualiza sob demanda/periódica e não depende de credenciais da API administrativa do serviço Precify.

O modo REST opcional acima continua válido e separado. A Vezura e Hostinger não foram modificadas ou implantadas nesta branch, e o protocolo só funciona quando a loja fornecer seus endpoints. A sincronização é de leitura; alterações da planilha/lançamentos manuais não são enviadas de volta silenciosamente.
