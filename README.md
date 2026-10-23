# Precify Colombia 🇨🇴

Aplicación libre e independiente para calcular precios y rentabilidad en COP. Código original bajo Apache-2.0. Sin cuentas, claves, backend, tarifas obligatorias ni integración Mastershop/Vezura.

**Estado: candidato 1.0.0 — no homologado ni publicado como release.**

## Funcionalidades
- Motor financiero desacoplado y tipado, cálculos monetarios en centavos enteros (BigInt), políticas de redondeo al alza.
- Costos, comisiones, precios sugeridos, descuentos, logística y reservas COD configurables.
- IVA opcional e ilustrativo, sin presumir una tasa universal.
- Productos, escenarios, perfiles, metas, punto de equilibrio, historial, comparador, CSV y backup JSON local.
- Interfaz en español colombiano (ES), portugués brasileño (PT) e inglés (EN), con diccionarios estáticos, idioma persistente y mensajes financieros traducidos; el cálculo siempre permanece en COP.

## Desarrollo local

Requisitos: Node.js >=20.19, pnpm 10.34.7.

~~~sh
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
~~~

Abra el servidor local anunciado por Vite. No requiere internet para usar la app después de instalar sus dependencias y generar el build estático.

El lockfile real fue generado por el propietario en Windows, instalado con --frozen-lockfile y añadido a la branch consolidada. Si añade dependencias, regenere y revise el lockfile antes de publicarlas.

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

Documentación: docs/ARCHITECTURE.md, docs/COP_POLICY.md, docs/FINANCIAL_FORMULAS.md, docs/SECURITY_AUDIT.md, docs/INTEGRATION_CONTRACT.md, [idiomas](docs/I18N.md) y [homologación multilingüe](docs/HOMOLOGACION_I18N.md).

Ningún código se tomó de repositorios Precify ajenos. La licencia de código no implica derechos sobre marcas de terceros.

## Homologación funcional de escenarios

Consulta [docs/HOMOLOGACION_MANUAL.md](docs/HOMOLOGACION_MANUAL.md) para probar la selección de un producto después de F5, las simulaciones optimista/esperada/conservadora, la vista previa en tiempo real y el botón **Descartar cambios**. Los escenarios no modifican el producto guardado. Esta mejora se encuentra en evaluación de navegador.
