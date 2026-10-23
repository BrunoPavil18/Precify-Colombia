# Precify Colombia v2.0.0 — estado de implementación consolidada

**Branch:** `feat/precify-colombia-v2`  
**PR única:** [#2](https://github.com/BrunoPavil18/Precify-Colombia/pull/2) — Draft  
**Base:** `main` idéntica al tag público `v1.0.0` al crear el branch.  
**Estado:** DESARROLLO / NO HOMOLOGADO. La release v1.0.0 permanece intacta.

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
