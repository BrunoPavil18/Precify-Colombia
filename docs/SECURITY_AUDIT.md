# Auditoría técnica — Precify Colombia 1.0.0

**Estado:** PR consolidada en Draft; `main` preservada. No se ha hecho merge, tag, release, deployment ni ejecución de GitHub Actions.

## 1. Evidencia de validación local aportada por el propietario

Sobre Windows, con Node.js 24.19.0, pnpm 10.34.7, Vite 8.3.4:

- `pnpm install --lockfile-only --ignore-scripts`: aprobada; lockfile creado en la computadora del usuario.
- `pnpm install --frozen-lockfile --ignore-scripts`: aprobada.
- `pnpm typecheck`: aprobada para core y web.
- `pnpm lint`: aprobada, **solo ejecuta `tsc`**, no un linter independiente.
- `pnpm test`: **21/21** aprobadas en el primer ciclo.
- `pnpm build`: aprobada, compilación estática de producción.
- `pnpm audit --audit-level moderate`: `No known vulnerabilities found` en aquel conjunto de dependencias.
- `pnpm dev`: servidor Vite inició y el usuario mostró las seis vistas en escritorio.
- Pruebas funcionales observadas: alta, edición, duplicación y persistencia tras F5.

El propietario añadió el **pnpm-lock.yaml** real a la rama del PR después del primer ciclo. No se incluyeron credenciales ni servicios externos obligatorios.

## 2. Cambios posteriores sin validación local

Tras el primer ciclo se incorporaron:

- Selector de producto, edición independiente de escenarios, botón de descartar y nueva vista previa.
- Traducción estática integral de la UI al portugués brasileño e inglés, además del español colombiano preexistente.
- Selector ES/PT/EN persistente, atributo HTML lang, mensajes financieros y de confirmación traducidos.
- Informes CSV con encabezados y etiquetas de origen localizados; esquema de backup, dinero y tipos de core invariables.
- **13 pruebas adicionales escritas**: 4 del flujo de escenarios, 8 comprobaciones de internacionalización y 1 de exportación CSV multilingüe. Total **34 tests definidos**.

**No se han ejecutado los 34 tests, typecheck, build ni audit posteriores a estos últimos cambios dentro del ambiente de la asistente.** Los resultados anteriores de 21/21 no implican que los cambios recientes estén aprobados. Se requiere repetir en la máquina del propietario.

## 3. Diseño de seguridad y límites

- Implementación original; no se copiaron archivos de otros proyectos Precify.
- Core desacoplado de React; dinero COP en centavos BigInt y JSON de backup con esquema versionado.
- Backup/importación con límites de tamaño, validación estricta y confirmación antes de sobrescritura.
- CSV escapado y neutralizado contra inyección de fórmulas, incluso con columnas traducidas.
- Copia local de textos estáticos PT/EN: no requiere DeepL, API key, redes ni telemetría.
- Preferencia de idioma independiente del workspace financiero. No altera `currency: COP` ni `locale: es-CO` del backup (contrato de formato).
- Los errores provenientes de extensiones o navegador pueden escapar al control del traductor propio.
- `pnpm audit` sin avisos no prueba ausencia de vulnerabilidades; revisar lockfile, dependencias transitivas, CSP/headers del hosting y scripts instaladores.
- La interfaz todavía requiere accesibilidad real, vista móvil, flujos de backup/restore y validación financiera independiente.

## 4. Comandos obligatorios antes de cerrar el PR

~~~powershell
pnpm.cmd install --frozen-lockfile --ignore-scripts
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd audit --audit-level moderate
pnpm.cmd dev
~~~

Homologar también los pasos de [HOMOLOGACION_MANUAL.md](HOMOLOGACION_MANUAL.md) y [HOMOLOGACION_I18N.md](HOMOLOGACION_I18N.md). Mantener la `main` intacta y no disparar GitHub Actions sin autorización expresa.


## 5. Nueva evidencia del propietario — traducciones ES/PT/EN

El usuario proporcionó logs de una nueva validación local después de implementar internacionalización:

- `pnpm.cmd typecheck`: core y web correctos.
- `pnpm.cmd lint`: ambos paquetes correctos (script basado en TypeScript; no implica reglas ESLint).
- `pnpm.cmd test`: **34/34 aprobados** (22 core + 12 web), sin fallos ni tests omitidos.
- `pnpm.cmd build`: producción compilada, Vite 8.3.4, 27 módulos transformados; JavaScript comprimido con gzip ~96,62 kB.
- `pnpm.cmd dev`: servidor local Vite iniciado.
- Capturas del usuario: ES, PT y EN visualmente operativos, resultados financieros COP estables; catálogo y datos locales conservados.

**Problema de UX detectado en captura:** un producto nuevo sin editar mostraba «Descartar cambios» tras seleccionar PT/EN. Causa: el nombre de ejemplo traducido se comparaba con el nombre español de `EMPTY_INPUT`, provocando un falso positivo de cambios pendientes. Se cambió `persistedDraft` para usar el nombre de ejemplo traducido al idioma activo y se añadió una prueba de regresión estática.

**Nuevo total: 35 pruebas escritas, 34 ejecutadas y aprobadas antes de este ajuste; la última prueba y compilación posterior al ajuste todavía no fueron ejecutadas.** Repetir los comandos locales antes de declarar la PR homologada.

La nueva evidencia **no incluye un `pnpm audit` repetido después de la traducción**; el último audit reportado exitosamente fue en la validación anterior. Los diccionarios estáticos no agregaron dependencias, pero ello no sustituye la auditoría final.

## 6. Homologación automatizada más reciente — evidencia local del propietario

**Nueva ejecución en PowerShell (tras el ajuste del borrador traducido):**

- `pnpm.cmd typecheck`: correcto, `packages/core` y `apps/web`.
- `pnpm.cmd lint`: correcto, ambos paquetes; sigue basado en `tsc` y no constituye una auditoría ESLint.
- `pnpm.cmd test`: **35 tests / 35 aprobados / 0 fallos / 0 omitidos**; 22 tests de core y 13 tests web.
- `pnpm.cmd build`: correcto; Vite **8.3.4**, 27 módulos transformados, JS final **320,32 kB** (~**96,62 kB gzip**).
- `pnpm.cmd audit --audit-level moderate`: **"No known vulnerabilities found"**, sin que esto pruebe ausencia absoluta de vulnerabilidades.

**Situación:** validación automática **aprobada** en el equipo del propietario. Las pruebas browser E2E de escenarios, backup/restauración, flujo de edición, accesibilidad, dispositivos móviles y cancelación de confirmaciones siguen **pendientes de evidencia**. El nuevo test contra el falso estado "descartar cambios" pasó a nivel de contrato estático, pero también debe verificarse manualmente en el navegador.

La rama permanece en PR Draft; sin merge a `main`, sin release ni ejecución voluntaria de GitHub Actions. No se requieren nuevas dependencias por esta actualización documental.

## 7. Avances de homologación funcional (evidencia visual del propietario)

**Escenarios y cálculos probados manualmente:** contribuciones Optimista/Esperado/Conservador de COP 51.000/49.000/46.000, persistencia tras recarga F5, datos originales sin alteraciones, reversión de rascunhos sin guardado, error de descuento superior a precio, venta neta cero, descuento del 100 %, impacto COD de COP 1.000 y precisión COP 89.900,50. Esas pruebas se consideraron exitosas respecto de los casos efectivamente observados.

**Pendiente:** proyección mensual y punto de equilibrio en el panel Metas. El propietario había configurado las cifras en el formulario de edición de un escenario, no necesariamente en el panel Metas; se le indicó cargar el producto original en Productos > Editar antes de entrar en Metas. No hay evidencia todavía de exportación/reimportación completa, eliminación/cancelación, lector de pantalla ni diseño móvil.

El estado automatizado previo continúa como **35/35 pruebas locales aprobadas**, sin alertas reportadas por `pnpm audit`. No se ejecutó CI remota ni Actions.

## 8. Selector de producto para Metas — cambio de interfaz sin migración

**Validación manual anterior:** el propietario confirmó equilibrio COP 490.000 / COP 49.000 = **10 unidades**, utilidad COP 0 para 10 unidades y COP 245.000 para 15 unidades, margen neto 16,50%; los dos paneles son correctos.

**Nueva implementación en la misma PR:** Metas ahora selecciona un producto del catálogo persistido, con disponibilidad después de F5. Cambiar de producto reemplaza solo el borrador mensual del panel Metas y nunca modifica otras entidades. Los formularios de Metas guardan exclusivamente `monthlyFixed` y `monthlyUnits` en el producto seleccionado, con entrada de historial; no cambian precios, costos variables ni escenarios. Se solicita confirmación al abandonar una proyección no guardada; «Descartar cambios» no muta el banco local. Con catálogo vacío se muestra estado vacío. Mensajes estáticos añadidos a es-CO/pt-BR/en.

**Resultado real:** se añadieron **3 pruebas automatizadas** (2 contratos estáticos UI y 1 cálculo determinístico de metas). **38 tests escritos; los 35 anteriores están aprobados, los 3 nuevos y el build actualizado permanecen pendientes de ejecución local.** No declarar CI aprobada para estos cambios hasta recibir resultado. `main` no fue modificada, PR en Draft y no se ejecutó Actions.

## 9. Verificación local de Metas multproducto (evidencia posterior)

El usuario entregó capturas y logs posteriores al selector de Metas:
- `pnpm.cmd typecheck` aprobado (core/web).
- `pnpm.cmd test` **38/38 tests aprobados** (23 core, 15 web; fallos 0).
- `pnpm.cmd build` aprobado con Vite 8.3.4 (27 módulos; JS 325,76 kB, gzip 97,69 kB).
- Servidor `pnpm.cmd dev` inició en `127.0.0.1:5173`.
- Metas, producto original: gastos fijos **COP 320.000**, 10 unidades y contribución unitaria **COP 49.000** → punto de equilibrio **7**, utilidad **COP 170.000**, margen **17,17%**.
- Metas, producto duplicado: gastos fijos **COP 50.000**, 10 unidades y contribución unitaria **COP 49.000** → punto de equilibrio **2**, utilidad **COP 440.000**, margen **44,44%**.
- La selección, guardado y aislamiento de escenarios/precios/costos variables funcionaron según las capturas y el relato del usuario.

**Homologado manualmente:** selección del producto en Metas, cálculos mostrados y funcionamiento básico del guardado independiente. Confirmación al cambiar de producto con ediciones pendientes, entradas inválidas y accesibilidad móvil aún no fueron mostradas en esta ronda.

**Siguientes pasos pendientes:** informes/ranking/CSV, perfiles de costos, backup JSON, rechazo de archivo inválido, cancelación de restauración y restauración total verificada. No se ejecutaron workflows de GitHub Actions. La última auditoría de dependencias comunicada corresponde a la ronda anterior; no se repitió `pnpm audit` en los últimos logs.

## 10. Homologación de respaldo restaurado — evidencia y comparación de archivos

El propietario informó que exportó respaldos con la interfaz en portugués e inglés, borró los datos locales y consiguió **restaurar satisfactoriamente el conjunto de datos**. Se compararon mediante Python los dos archivos JSON aportados:
- Formato `precify-colombia-backup`, versión 1, moneda COP y metadata `locale: es-CO` en ambos.
- En ambos: **2 productos, 3 escenarios, 0 perfiles y 7 eventos de historial**.
- El objeto `workspace` es **idéntico** en ambos archivos: se mantienen precios, ID, costos, configuraciones mensuales, escenarios y eventos.
- La única diferencia de contenido es `exportedAt`: `2026-10-23T01:55:06.261Z` frente a `2026-10-23T01:55:23.510Z`; ello es esperado en exportaciones distintas.

Esta comparación acredita consistencia entre los dos respaldos suministrados, **no** una comprobación técnica directa del navegador después de restaurar. La restauración efectiva es un resultado de homologación **declarado por el usuario** y coherente con el contenido respaldado.

**Pendientes:** prueba de JSON inválido, cancelación de restauración y otras operaciones destructivas, perfiles de costos, exportación CSV en editor de texto (la generación del reporte se informó, pero no hay verificación detallada de las columnas), accesibilidad y móvil. La PR continúa en Draft; sin merge a main ni GitHub Actions voluntarios.
