# Precify Colombia v2.0.1 — Financial Reliability and Colombian Compliance Clarifications

**Release v2.0.1.** This patch refines the v2.0.0 financial simulation engine, retains COP-only operation and browser-local storage, and does not add accounts, commercial integrations, paid services or remote telemetry.

## Fixes
- **Campaigns / CAC / ROAS:** projected campaign profit now subtracts estimated refunds consistently; displayed attributed ROAS and projected ROAS are separated. When attributed revenue differs from conversions × estimated unit revenue, the simulator shows a reconciliation warning instead of silently mixing bases.
- **COD:** failed delivery attempts now apply only to shipped-but-undelivered orders, not orders cancelled before shipping. Additional stage counts and per-shipped-order projected profit clarify non-delivery, delivered-unpaid and paid events.
- **PUM:** keeps the rounded mathematical result and adds separate, conditionally applicable two-decimal truncated presentation. Users can now select content and comparison units independently (g/kg, ml/L, cm/m), while legacy three-argument API callers retain their previous reference behavior.
- **Portfolio:** exact weighted constant-mix break-even avoids errors introduced by rounding unit averages prematurely.
- **Margin targets:** unchanged v1/v2 suggested-price contract; explicit denominator remains contribution / net product sale, not total revenue including freight.
- **COP and privacy:** BigInt amounts, version 2 JSON backups, v1 import compatibility, and the existing `precify-colombia:workspace:v1` browser storage key remain intact.
- **PWA and UI:** versioned static cache revision and clearer ES/PT/EN labels.

## Colombian legal context
The [SIC Circular Única Title II (2025-02-28 edition)](https://sedeelectronica.sic.gov.co/sites/default/files/normativa/Titulo%20II-%20Versi%C3%B3n%2028-02-2025..pdf) describes conditional PUM display with truncated two-decimal figures; the [SIC March 2026 notice](https://sedeelectronica.sic.gov.co/noticias/la-sic-publica-fallo-judicial-y-advierte-empresas-sobre-obligacion-de-informar-el-precio-por-unidad-de-medida-pum) addresses food and beverage merchants. [Law 1480/2011](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306), [Law 2439/2024](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116) and [Law 1581/2012](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) are documented according to their scope. No automatic DIAN/SIC compliance, blanket 19% IVA, or universal PUM obligation is claimed.

## Verify locally before publishing

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:core
pnpm audit --audit-level moderate
```

Production output: `apps/web/dist/`. Node.js >=20.19 and pnpm 10.34.7. In Windows PowerShell you may need `pnpm.cmd`.

**Validation reported by the maintainer:** 63/63 automated tests passed (42 financial core, 21 web), TypeScript typecheck, AST lint (15 TS sources) and Vite production build passed. Compiled ESM output verification and dependency audit passed earlier on this patch branch before the latest PUM/UI documentation edits. A full browser E2E/accessibility/PWA production audit and a professional legal review were not performed; automated web tests include static source contracts.

**Limitations:** localStorage remains non-transactional during truly simultaneous tab writes; offline install depends on the browser; accounting/tax/legal outcomes remain informative. No npm package, checkout or Vezura integration was introduced.

See [technical formulas](../docs/FINANCIAL_FORMULAS.md), [Colombian scope](COLOMBIA_LEGAL_V2_0_1.md), and [Security](../SECURITY.md). Licensed under Apache 2.0.
