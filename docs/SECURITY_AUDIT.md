# Auditoría técnica — 22/10/2026

Estado: inspección inicial; **no homologado**. Versiones directas revisadas: pnpm 10.34.7 (posterior a correcciones de advisories de agosto 2026), React/React DOM 19.3.1 (se evitó React inicial antiguo), Vite 8.3.4 y plugin React 6.1.2. La revisión estática **no** sustituye auditoría transitiva con lockfile.

Confirmado: se partió de main con solo LICENSE; no se copió código de referencias Precify. No se crearon workflows ni se invocó GitHub Actions. Validación de costos BigInt, esquema JSON versionado, límite de 2 MB, invalidación completa de backups corruptos, confirmación antes de reemplazo, CSV neutralizado y React sin dangerouslySetInnerHTML.

Pendiente: pnpm no está instalado y el shell no pudo acceder a GitHub/npm (DNS de github.com inaccesible); **no** se ejecutaron instalación, pruebas, typecheck, lint, build, audit de dependencias ni pruebas E2E/a11y reales. El lockfile no fue generado. No se puede afirmar CI verde ni ausencia de vulnerabilidades.

Obligatorio antes del merge: generar y revisar pnpm-lock.yaml con pnpm 9.15.9 y --lockfile-only --ignore-scripts; instalación --frozen-lockfile; typecheck, lint, tests, build y audit local; inspección de scripts pós-instalação; pruebas manuales de móvil, lector de pantalla/teclado, datos corruptos y backups. Revisar CSP/headers para cada host; marca y obligaciones tributarias quedan por validar externamente.

Limitaciones conocidas: traducción PT/EN parcial, IVA ilustrativo, localStorage susceptible a borrado o extensiones, ausencia de sincronización. No se ha lanzado ninguna release.
