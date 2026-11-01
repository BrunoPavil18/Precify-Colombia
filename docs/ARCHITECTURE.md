# Arquitectura

Monorepo pnpm TypeScript. packages/core implementa API financiera pura (money, pricing, scenarios, state), sin DOM, fetch, backend o secretos. apps/web es una aplicación React y Vite que consume el paquete de workspace, presenta el español colombiano y guarda los datos mediante localStorage.

Persistencia: esquema v1 con productos, perfiles, escenarios e historial versionado. validateWorkspace valida todo antes de escribir; si el almacenamiento existente está dañado se bloquean las escrituras automáticas. Import JSON de máximo 2 MB con metadatos de formato/moneda/versión y confirmación previa a sustitución. Export CSV escapado para planillas.

No se han realizado integraciones con Vezura ni Mastershop. Los cambios de API del core deberán seguir versiones semánticas y mantener el contrato de entradas explícitas. La compilación Vite produce un sitio estático, sin necesidad de Next.js server ni servicios pagos.



## Stabilization 2.0.1

Core financial simulations remain in `packages/core/src/advanced.ts` as framework-independent, ESM-exported BigInt functions. The 2.0.1 patch adds return fields without removing historic ones, so old saved scenario inputs and v1/v2 backups remain readable. The browser app is still React/Vite using origin-scoped `localStorage`; no remote API, authentication or Vezura integration is introduced. Formatted display and legal guidance stay in `apps/web/src/AdvancedLab.tsx` and static translation dictionaries, not in canonical COP arithmetic. SW asset cache identifier increments for the patch; no financial records are intentionally put into HTTP CacheStorage.

Data integrity: a validated full-workspace comparison and `storage` event reduce accidental overwrite from stale tabs. **There is no truly atomic compare-and-swap in localStorage**. An IndexedDB migration was deliberately avoided for a safety-focused patch, and should not be undertaken without migration tests, backout, and browser E2E. Existing key `precify-colombia:workspace:v1` and JSON backup format 2 are preserved.

## Architecture extension under development — v2.1.0

The official 2.0.1 COP calculator and its local workspace remain unchanged. New `packages/core/src/fx.ts` and `global-pricing.ts` perform ISO-currency arithmetic in minor units via BigInt and explicit dated rate quotes. `operations.ts` reconciles order status events, paid revenue, campaign attribution and conditional CPA delivery matrix. `operational-csv.ts` imports/exports normalized events.

The static React app adds optional local currency, global-pricing and COD modules. Data use independent, versioned local keys (`precify-colombia:operations:v1`, `precify-colombia:global-pricing:v1`, `precify-colombia:fx-quote:v1:<base>:<quote>`); older COP JSON workspaces are never transparently migrated, overwritten or auto-uploaded.

Connected mode is an **optional, separate** Node HTTP service, backed by an operator-provisioned PostgreSQL/Supabase project. Its schema is in `apps/service/sql/001_connected_schema.sql`. Roles are per organization; service-role database credentials, Meta secrets, one-use OAuth state and AES-256-GCM encryption key remain server-side. Generic integration is by trusted server REST SDK or signed webhook; Vezura may use these later without changing or linking any other repository during development. A separate iframe-only calculator UI has no account, storage or API access.

Both browser and server enforce source attribution, ISO currency isolation and explicit distinctions between projected, imported and Meta-attributed numbers. Real data verification, multi-tenant E2E, Meta permissions and production hosting are still required before release. See [execution checkpoints](EXECUTION_CHECKPOINTS_V2_1_0.md) and [integration guide](CONNECTED_API_V2_1_0.md).
