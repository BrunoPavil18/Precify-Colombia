# Matriz de auditoría v1 → trabajo en v2

**Fecha de evaluación inicial:** 23/10/2026. **Estado actual:** PR #2 merged into `main`, maintainer validation reported 53 tests and 24 manual checks. **The table preserves the original audit snapshot**; follow [V2_STATUS.md](V2_STATUS.md) and [CHANGELOG](../CHANGELOG.md) for the completed implementation and limitations.

| ID | Hallazgo de auditoría | Código existente en v2 | Estado de aceptación |
|---|---|---|---|
| F-01 | Margen producto vs total recaudado | `Breakdown.marginOnProductPercent`, `marginOnCollectedPercent`; ambas métricas en calculadora | Implementado en código; falta homologar los denominadores y visualización integral |
| F-02 | Markup comercial vs contribución/costo | `commercialMarkupPercent` y `contributionMarkupPercent` | Implementado; fórmula y denominadores sujetos a revisión financiera |
| F-03 | IVA/flete, régimen tributario | Vista previa de IVA incluido/adicional/ninguno y referencias DIAN | **Parcial**: falta perfil fiscal completo, créditos, bases por impuesto y revisión de tratamiento del frete |
| F-04 | COD como reserva manual | `simulateCOD` con ratios enviados/entregados/pagados y reservas por falla | Función e interfaz; faltan pruebas E2E y validación de hipótesis reales |
| F-05 | Pérdida de rascunho | Guardas para nuevo/abrir/duplicar, perfiles y cambio de escenario | **Parcial**: aún hay `window.confirm`; pendiente modal accesible y verificación exhaustiva de cada transición |
| F-06 | Concurrencia multiaba | Comparación optimista de `updatedAt`, evento `storage` | **Parcial**: no garantiza atomicidad frente a escrituras simultáneas |
| F-07 | Lint no real + tests no E2E | `scripts/lint.mjs` analizador AST independiente con TypeScript; tests Node agregados | **Parcial**: no reemplaza ESLint/Biome; faltan E2E y ejecución |
| F-08 | Changelog/seguridad antiguos | `CHANGELOG.md`, `SECURITY.md` actualizados para referencia v1 estable / v2 WIP | Documentado |
| F-09 | Porcentaje localizado | `parseLocalizedPercent` y campo UI con coma o punto | Implementado sin ejecución real |
| F-10 | Core TS no distribuible | Export map ESM/dist JS + tipos, test de consumidor por nombre de paquete | No se empacó ni probó consumidor externo |
| F-11 | Contribución cero viable | `viability`, `canCoverFixedCosts`, `feasible>0` | Implementado; tests escritos sin ejecución |

## Módulos adicionales

- **PUM:** massa/volume/comprimento/unidades, referencial informativo.
- **Consumidor:** desglose precio neto, IVA declarado, flete y otros cargos sin doble IVA incluido.
- **Marketing:** conversión, CAC, CAC máximo, ROAS, retorno hipotético.
- **Cartera:** volumen por producto, contribución combinada y gastos fijos descontados una vez.
- **PWA:** manifiesto, icono, caché de recursos y opción explícita para activar SW esperando actualización. Sin verificación offline.
- **Persistencia:** `advancedSimulations` aditivo al workspace local, backup versión 2, importación compatible con versión 1; lectura estricta con fórmulas de simulación. Falta ensayo con backups reales y navegación multiaba.
- **Idiomas:** nuevos textos ES/PT/EN en diccionarios estáticos; falta revisión lingüística por usuario y cobertura automática de todas las claves dinámicas.

## Seguridad y economía de CI

- No se crearon workflows automáticos, matrices, despliegue, release ni publicación npm.
- **No se ejecutó GitHub Actions.** Mantener esta política hasta autorización expresa.
- La auditoría de paquetes v1 no certifica la v2.
- Toda funcionalidad que todavía no recibió ejecución local se considera **no homologada**.
- `main` y el tag/release `v1.0.0` intactos.

## Bloqueantes

1. Ejecutar `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm audit --audit-level moderate`, corregir errores, repetir.
2. Homologar en navegador, teclado, móvil, múltiples pestañas, backup v1/v2, actualización PWA y modo offline (desconectando red).
3. Revisar expresamente tasas, bases e hipótesis de IVA/COD con profesionales colombianos antes de afirmar conformidad.
4. Completar guardas de rascunho y mensajes de error para acciones destructivas/restore con modal accesible.
5. Ensayar `pnpm pack` y el consumo del core desde proyecto externo, con tipos y módulos ESM.
6. Actualizar métricas de informes para denominadores inequívocos y aprobar decisiones sobre márgenes recomendados.
7. Incorporar un linter industrial y tests E2E con lockfile reproducible antes de declararlo obligatorio en release.

**No realizar merge de esta PR ni publicar v2.0.0 hasta cumplir los criterios.**
