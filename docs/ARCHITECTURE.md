# Arquitectura

Monorepo pnpm TypeScript. packages/core implementa API financiera pura (money, pricing, scenarios, state), sin DOM, fetch, backend o secretos. apps/web es una aplicación React y Vite que consume el paquete de workspace, presenta el español colombiano y guarda los datos mediante localStorage.

Persistencia: esquema v1 con productos, perfiles, escenarios e historial versionado. validateWorkspace valida todo antes de escribir; si el almacenamiento existente está dañado se bloquean las escrituras automáticas. Import JSON de máximo 2 MB con metadatos de formato/moneda/versión y confirmación previa a sustitución. Export CSV escapado para planillas.

No se han realizado integraciones con Vezura ni Mastershop. Los cambios de API del core deberán seguir versiones semánticas y mantener el contrato de entradas explícitas. La compilación Vite produce un sitio estático, sin necesidad de Next.js server ni servicios pagos.



## Stabilization 2.0.1

Core financial simulations remain in `packages/core/src/advanced.ts` as framework-independent, ESM-exported BigInt functions. The 2.0.1 patch adds return fields without removing historic ones, so old saved scenario inputs and v1/v2 backups remain readable. The browser app is still React/Vite using origin-scoped `localStorage`; no remote API, authentication or Vezura integration is introduced. Formatted display and legal guidance stay in `apps/web/src/AdvancedLab.tsx` and static translation dictionaries, not in canonical COP arithmetic. SW asset cache identifier increments for the patch; no financial records are intentionally put into HTTP CacheStorage.

Data integrity: a validated full-workspace comparison and `storage` event reduce accidental overwrite from stale tabs. **There is no truly atomic compare-and-swap in localStorage**. An IndexedDB migration was deliberately avoided for a safety-focused patch, and should not be undertaken without migration tests, backout, and browser E2E. Existing key `precify-colombia:workspace:v1` and JSON backup format 2 are preserved.
