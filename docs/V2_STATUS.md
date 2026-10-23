# Precify Colombia v2.0.0 — estado de implementación consolidada

**Branch:** `feat/precify-colombia-v2`  
**PR única:** [#2](https://github.com/BrunoPavil18/Precify-Colombia/pull/2) — merged into `main` on 2026-10-23  
**Base:** `main` idéntica al tag público `v1.0.0` al crear el branch.  
**Estado actual:** v2.0.0 merged into `main`, with maintainer QA (53 automated tests, 24 manual checks). GitHub tag/release publication is managed separately. Previous chronological entries below document the development process and should be read as historical snapshots.

## Implementaciones realizadas en código

1. **Finanzas:** `analyze` conserva las propiedades históricas `marginPercent` (contribución / venta neta de producto) y `markupPercent` (contribución / costo variable), pero incorpora denominadores explícitos: `marginOnCollectedPercent`, `marginOnProductPercent`, `commercialMarkupPercent`, `contributionMarkupPercent`, estado de viabilidad y `canCoverFixedCosts`. La contribución cero deja de ser viable. La función `suggestPrice` mantiene temporalmente el denominador legado, documentado, sin cambiar en silencio la fórmula de recomendaciones.
2. **Simuladores nuevos:** `packages/core/src/advanced.ts` ofrece COD probabilístico, campañas/CAC/ROAS, PUM (masa/volumen/longitud/unidad), vista previa del precio público y mix multiproducto. No se descargan tarifas de transportadoras ni impuestos oficiales.
3. **Interfaz:** `apps/web/src/AdvancedLab.tsx`, sección Avanzado en navegación, ES/PT/EN, campos editables y resultados. Simulaciones guardadas en el workspace, cargables después de F5, exportables mediante backup y eliminables explícitamente.
4. **Persistencia:** formato aditivo `advancedSimulations` validado; importación de backups **v1 y v2**, nuevo respaldo v2 sin descartar información v1. Escrituras comparan `updatedAt` para detectar cambios concurrentes; el evento `storage` bloquea pestaña desactualizada. La detección NO equivale a bloqueo transaccional: dos escrituras simultáneas pueden superar la verificación y requieren validación E2E. Los registros de simulación se validan con los parsers financieros durante importación.
5. **PWA inicial:** manifest, icono, service worker de cache de shell/recursos estáticos y registro en producción. No hay caché de API ni datos de comerciantes. Se añadió aviso de actualización pendiente y botón explícito para activar el nuevo SW, además de limpieza de cachés antiguos de la app. Todavía falta homologar las actualizaciones en navegador y probar offline/online.
6. **Compatibilidad de biblioteca:** paquete `@precify-colombia/core` apunta a `dist/index.js` + `dist/index.d.ts`. Scripts root preparados para compilar core antes de dev/typecheck. No se hizo paquete npm ni publicación.
7. **COP y porcentajes:** parser localizado acepta `19,50` o `19.50`, canonicaliza `19.50`. El motor mantiene BigInt em centavos; no cambia moneda por idioma.
8. **Móvil:** navegación inferior de sidebar en pantalla estrecha cambia a grid flexible evitando scrollbar horizontal anterior.
9. **Fuentes colombianas:** [documentación datada](COLOMBIA_LEGAL_V2.md) con 1480/2011, 2439/2024, SIC/PUM, DIAN/IVA, protección de datos 1581/2012. Ningún modo se presenta como certificado legal.

## Observaciones financieras que deben homologarse

- **Margen legado vs total:** COP 100.000 neto de producto + COP 20.000 frete recibido - COP 50.000 costos = COP 70.000 contribución. Margen sobre producto 70%; sobre total 58,33%. La recomendación de precio se basa todavía en la primera razón.
- **Markups:** markup comercial en v2 se calcula `(venta neta del producto - costo variable) / costo variable`; comparabilidad con costos no vendidos, recuperación de impuestos y frete requiere revisión comercial.
- **COD:** las tres probabilidades se aplican condicionalmente y las pérdidas se modelan con reservas explícitas. El inventario no recuperado debe añadirse a reserva; no hay hechos verificables por plataforma. No duplicar publicidad/reserva del producto en el módulo.
- **Marketing:** CAC/ROAS parten de impresiones, conversión atribuida y gasto hipotético. No certifican atribución causal ni ventas efectivas.
- **PUM:** precio por kilogramo, litro, metro o unidad; aplicación jurídica puede depender de producto/presentación.
- **Mix:** gastos fijos únicos del negocio se descuentan una vez; no sumar los gastos fijos que cada ficha pueda mostrar por separado.

## Testes escritos, não executados nesta sessão

- `packages/core/tests/advanced.test.mjs`: cobertura adicional de margens, zero, COD 100%/0%, campanhas, PUM, IVA incluído/adicional, carteira, parser percentual, backups v1/v2.
- Testes originais da v1 permanecem no repositório.
- **Não há execução comprovada dos testes v2, typecheck, lint, build, audit ou E2E.** A rede do contêiner não alcançou `github.com` para clonar o repositório. Nenhum GitHub Actions foi acionado.

### Comandos locais de validação obrigatória

```powershell
git fetch origin
git switch feat/precify-colombia-v2
git pull --ff-only origin feat/precify-colombia-v2
pnpm.cmd install --frozen-lockfile --ignore-scripts
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd audit --audit-level moderate
pnpm.cmd dev
```

Se algum comando falhar, corrigir na mesma PR antes de homologar. O `lint` atual **ainda executa só TypeScript**, portanto não atende ao requisito de linter dedicado. Não alegar sucesso.

## Pendências bloqueantes antes de v2.0.0

- Construir/validar um linter dedicado e atualizar lockfile sem dependências desnecessárias.
- Adicionar E2E reais de cancelamento, teclado, mobile, multiaba, importação de JSON corrompido, atualização/offline PWA.
- Guard universal para todas as transições entre produto, perfil, cenário, metas, reset e criação; preferir modal acessível próprio no lugar de `window.confirm`.
- Fortalecer CAS multiaba com revisão robusta/solução de conflito e recuperação; `updatedAt` isolado não é prova de exclusão mútua.
- Validar estritamente todos os campos de `AdvancedSimulationRecord.inputs` durante importação, não somente chaves/tamanho; proteger against payloads complexos.
- Testar exportação/importação v1/v2 real, realizar backup pré-migração se o formato persistido for modificado.
- Completar fluxo PWA de aviso, consentimento e ativação da atualização, ciclo de exclusão de caches antigos e testes offline.
- Formalizar contratos e exemplos de consumidor Node/Next.js, verificar pacote ESM tipado num projeto externo real.
- Completar orientações regulatórias configuráveis por regime/categoria sem automatizar tributação.
- Rever métricas de marketing, estimativas de lucro, bases de impostos/comissões e viabilidade de preços com amostras independentes.
- Documentar a homologação final e só então solicitar autorização explícita de merge e publicação.

## Restrições preservadas

`main` não alterada, tag/release `v1.0.0` intocadas, nenhuma Vezura/Mastershop modificada, sem contas, nuvem obrigatória, taxa presumida de 19%, deploy pago ou workflow automático. **Não fazer merge nem publicar v2 enquanto houver pendências bloqueantes.**

## Auditoría por hallazgo

Consultar [V2_AUDIT_MATRIX.md](V2_AUDIT_MATRIX.md) para el mapa F-01...F-11 y el estado no homologado por módulo.

## Nueva evidencia local de ejecución — propietario (posterior al commit a9b6ba2)

El propietario ejecutó en Windows con pnpm 10.34.7:
- `pnpm.cmd typecheck`: **APROBADO**, core y web.
- `pnpm.cmd lint`: **APROBADO**; el verificador AST independiente examinó **15 archivos TypeScript** y luego se ejecutó typecheck en ambos proyectos.
- `pnpm.cmd test`: **49/49** (34 core, 15 web), sin fallos ni omisiones.
- `pnpm.cmd build`: **APROBADO**; Vite **8.3.4**, **29 módulos**, JS **354,49 kB / 105,25 kB gzip**.
- `pnpm.cmd audit --audit-level moderate`: resultado anterior `No known vulnerabilities found`; **no se repitió dentro del último lote de comandos**.

Estas verificaciones sustituyen la anotación anterior de ausencia de ejecución para **typecheck, AST lint, tests y build** en el estado probado. No prueban la seguridad absoluta, ni equivalen a E2E de navegador/PWA o revisión independiente de las hipótesis financieras.

**Quedan pendientes:** homologación visual/funcional de los nuevos simuladores; persistencia de backups v1/v2 reales; cambio de pestañas concurrentes; comportamiento PWA offline/actualizaciones; accesibilidad móvil y teclado; revisión de fórmulas y cumplimiento colombiano; validación de empaquetado del core externo. La PR sigue Draft, sin aprobación de merge ni release.

## Homologación final comunicada por el mantenedor — 23/10/2026

**Resultados locales reales (Windows):**
- `pnpm.cmd typecheck`: correcto para core y web.
- `pnpm.cmd lint`: correcto; **15 archivos** examinados por el validador AST y typecheck correcto.
- `pnpm.cmd test`: **51/51** (34 core + 17 web), 0 fallos.
- `pnpm.cmd build`: correcto, Vite 8.3.4, 29 módulos; JS 355,33 kB (105,61 kB gzip).
- `pnpm.cmd audit --audit-level moderate`: **No known vulnerabilities found**.

**Comprobaciones manuales declaradas por el mantenedor:** la restauración de un backup procedente de v1 funcionó; el mantenedor indicó que **todos los puntos del checklist de homologación funcional propuesto** funcionaron, incluyendo persistencia/recuperación, protección de borradores, conflictos entre pestañas, PWA/offline y revisión de experiencia multilingüe/móvil/accesibilidad. Se trata de evidencia declarada por el mantenedor, no de un ensayo E2E automatizado ni una evaluación independiente de accesibilidad.

**Observación de alcance:** no consta ejecución de `pnpm pack` ni consumo desde un proyecto externo; continúa pendiente la revisión especializada de bases fiscales, escenarios financieros extremos y conformidad jurídica. `window.confirm` aún figura en flujos de la UI y la protección multiaba basada en `updatedAt` no es una transacción atómica. Estas limitaciones deben ser aceptadas expresamente o subsanadas antes de merge/release.

La PR #2 sigue Draft. No existe autorización de merge/release y no se solicitó GitHub Actions.

## Cierre técnico adicional de la PR — posterior a 51/51

Se sustituyeron todas las invocaciones detectadas de `window.confirm` en la interfaz por un diálogo propio con `role="alertdialog"`, foco inicial en Cancelar, Escape para cancelar y contención de Tab entre las dos acciones. **Cancelar no ejecuta la mutación**; los handlers confirman antes de escribir o eliminar. Pendiente comprobación manual de foco, lectores de pantalla y navegación.

La protección multiaba ahora compara el **workspace validado completo** antes de escribir, evitando colisiones por `updatedAt` idéntico. **Límite persistente:** localStorage no ofrece compare-and-swap atómico para carreras verdaderamente simultáneas; no se debe prometer serialización fuerte de escritura. En navegadores con varias pestañas el evento `storage` continúa bloqueando las obsoletas. Se necesitaría migrar a IndexedDB con transacciones o un sistema de exclusión confiable para garantías más fuertes.

Se agregó `pnpm.cmd verify:core`, que compila el núcleo ESM y verifica entrada, tipos y cálculos desde el archivo distribuible, pero **aún no se ha ejecutado** ni equivale a instalación externa real. No se publicó npm.

**Cumplimiento colombiano:** la calculadora es informativa, tasas de IVA configurables con cero por defecto, y el estudio legal en `docs/COLOMBIA_LEGAL_V2.md` no es certificación. El asesoramiento profesional por categoría/régimen permanece fuera del alcance de una herramienta genérica y no debe presentarse como validación jurídica exhaustiva.

Se agregaron **dos pruebas de contrato UI** para diálogo y comparación de snapshot. Si antes eran 51 pruebas, el código actual define potencialmente **53**; no declarar ese total aprobado sin nuevos logs.

La revisión final del mantenedor deberá ejecutar:
```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd verify:core
pnpm.cmd audit --audit-level moderate
```

Después verificar Cancelar y Confirmar en eliminación, importación, reset, cambio de producto/escenario, modal por teclado y conflictos entre dos pestañas. Nada de merge/release/Actions sin autorización.

## Verificación posterior a la corrección de diálogos — 23/10/2026

El mantenedor ejecutó el código actualizado en Windows:
- `pnpm.cmd typecheck`: **aprobado** en core y web.
- `pnpm.cmd lint`: **aprobado**, análisis AST de 15 archivos más TypeScript.
- `pnpm.cmd test`: **53/53 aprobados** (34 core y 19 web), 0 fallos.
- `pnpm.cmd build`: **aprobado** con Vite 8.3.4, 29 módulos, JS 356,83 kB / 106,15 kB gzip.

Estas pruebas confirman que la corrección de los 17 errores de paréntesis y la actualización de los contratos de prueba pasan en el entorno del mantenedor. `verify:core` y `audit` aprobaron en la ronda inmediatamente anterior, antes de estos cambios limitados a interfaz/pruebas.

**Sin embargo**, la sustitución por diálogos propios y su comportamiento real de cancelación, foco y accesibilidad todavía merecen una comprobación visual tras la última modificación; los tests web son mayoritariamente contratos estáticos de fuente. La exclusión mutua fuerte entre pestañas sigue sin transacciones atómicas. El proyecto continúa como candidato **sin autorización de merge ni de release**.

## Validación manual de diálogos — 23/10/2026

El mantenedor informó **23/24 verificaciones aprobadas** en el checklist de aceptación: eliminación y recuperación de simulaciones, protección de borradores de calculadora y metas, cancelación de importación y eliminación general, navegación accesible con Tab/Escape/Enter, filtrado de simulaciones por módulo, formato COP/ROAS, localización ES/PT/EN y modal en móvil. **Pendiente:** probar cambiar a otro escenario con un costo editado sin guardar y cancelar el descarte. No se atribuye aprobación a esta comprobación no realizada.

La captura de la vista de datos en móvil detectó el encabezado desactualizado «VERSIÓN 1.0.0»; se actualizó a «VERSIÓN 2.0.0» en App.tsx y se añadieron traducciones ES/PT/EN de la nueva etiqueta. Estos últimos commits **no tienen todavía ejecución de typecheck/lint/test/build posterior**.

No se autorizó merge, publicación ni uso de GitHub Actions.
