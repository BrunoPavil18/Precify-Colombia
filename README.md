# Precify Colombia 🇨🇴

Aplicación libre e independiente para calcular precios y rentabilidad en COP. Código original bajo Apache-2.0. Sin cuentas, claves, backend, tarifas obligatorias ni integración Mastershop/Vezura.

**Estado: candidato 1.0.0 — no homologado ni publicado como release.**

## Funcionalidades
- Motor financiero desacoplado y tipado, cálculos monetarios en centavos enteros (BigInt), políticas de redondeo al alza.
- Costos, comisiones, precios sugeridos, descuentos, logística y reservas COD configurables.
- IVA opcional e ilustrativo, sin presumir una tasa universal.
- Productos, escenarios, perfiles, metas, punto de equilibrio, historial, comparador, CSV y backup JSON local.
- Español colombiano como idioma de contenido. Estructura de diccionarios PT/EN disponible, traducción completa pendiente.

## Desarrollo local

Requisitos: Node.js >=20.19, pnpm 10.34.7.

~~~sh
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
~~~

Abra el servidor local anunciado por Vite. No requiere internet para usar la app después de instalar sus dependencias y generar el build estático.

**Atención:** en esta entrega todavía NO se generó el pnpm-lock.yaml por bloqueo de red del ambiente de ejecución. Antes de homologar, un mantenedor deberá ejecutar pnpm install --lockfile-only --ignore-scripts, revisar el lockfile y versionarlo; solo entonces el comando con --frozen-lockfile será reproducible.

## Validación

~~~sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
node scripts/verify-local.mjs
~~~

No declare los comandos aprobados sin ejecutarlos. El build Vite se exporta a apps/web/dist. Inspeccione el despliegue para definir CSP/cabeceras HTTP.

## Uso

Introduzca valores COP visibles como 89.900,50 (ochenta y nueve mil novecientos pesos con cincuenta centavos). Las tasas son porcentajes explícitos: 19 significa 19 %, no una fracción decimal inferida.

Abra Calculadora, ajuste costos, margen, tasas, descuentos y redondeo; guarde el producto. En Escenarios pruebe hipótesis independientes. Metas calcula el punto de equilibrio; Informes permite comparar resultados y exportar. Datos permite descargar, validar y restaurar copias JSON antes de sobrescribir o borrar datos.

**Advertencia:** localStorage puede perderse si se limpian datos del sitio, cambia de navegador/dispositivo o se usa modo incógnito. Descargue respaldos periódicos. Esta aplicación no es asesoría contable o fiscal colombiana.

Documentación: docs/ARCHITECTURE.md, docs/COP_POLICY.md, docs/FINANCIAL_FORMULAS.md, docs/SECURITY_AUDIT.md, docs/INTEGRATION_CONTRACT.md.

Ningún código se tomó de repositorios Precify ajenos. La licencia de código no implica derechos sobre marcas de terceros.
