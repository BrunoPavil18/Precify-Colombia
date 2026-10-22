# Arquitectura

Monorepo pnpm TypeScript. packages/core implementa API financiera pura (money, pricing, scenarios, state), sin DOM, fetch, backend o secretos. apps/web es una aplicación React y Vite que consume el paquete de workspace, presenta el español colombiano y guarda los datos mediante localStorage.

Persistencia: esquema v1 con productos, perfiles, escenarios e historial versionado. validateWorkspace valida todo antes de escribir; si el almacenamiento existente está dañado se bloquean las escrituras automáticas. Import JSON de máximo 2 MB con metadatos de formato/moneda/versión y confirmación previa a sustitución. Export CSV escapado para planillas.

No se han realizado integraciones con Vezura ni Mastershop. Los cambios de API del core deberán seguir versiones semánticas y mantener el contrato de entradas explícitas. La compilación Vite produce un sitio estático, sin necesidad de Next.js server ni servicios pagos.
