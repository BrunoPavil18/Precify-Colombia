# Precify Colombia v2.0.0 — Integration guide

**Status:** code merged into `main`, maintainer functional QA passed. This guide documents the shipped source API; no claim of independent commercial-platform certification or npm publication.

## Requirements and build

- Node.js >=20.19 and pnpm 10.34.7.
- Run from the repository root:

```bash
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @precify-colombia/core build
pnpm verify:core
```

The reusable `packages/core` package exposes ESM `dist/index.js` and type declarations `dist/index.d.ts`, with `exports["."]` resolving both. The source repository uses `"@precify-colombia/core": "workspace:*"`. It is **not published on npm**. External projects should either integrate the Apache-2.0 source or produce/test a local package (e.g., via `pnpm pack`); the maintainer validated ESM outputs, **not an npm registry installation or external consumer test**.

## Using the core

```ts
import {
  EMPTY_INPUT, analyze, suggestPrice, simulateCOD,
  simulateCampaign, pricePerMeasure, consumerPricePreview, simulatePortfolio
} from "@precify-colombia/core";

const product = {
  ...EMPTY_INPUT,
  acquisition: "37000.00",
  currentPrice: "99000.00",
};

const result = analyze(product);
console.log(result.contribution, result.marginOnCollectedPercent);
const suggestion = suggestPrice(product).price;
const unitPrice = pricePerMeasure("10000.00", "500.00", "g");
const portfolio = simulatePortfolio([{ product, monthlyUnits: "10" }], "320000.00");
```

Money: COP decimal strings with two fractional digits (`"89900.50"`). Percentages: explicit percentage strings (`"19.00"` is 19%, not 0.19%). Display in `es-CO` is separate from canonical integration format. Do not use binary floats for monetary arithmetic.

### Margin and pricing contracts
- `analyze().marginPercent` (legacy) and `marginOnProductPercent`: contribution / net product sale.
- `marginOnCollectedPercent`: contribution / total collected revenue, including separately charged shipping.
- `commercialMarkupPercent` and `contributionMarkupPercent`: explicit, distinct markup indicators. Ratios may be null if denominators are zero.
- `analyze().viability` is `"positive"`, `"zero"`, or `"negative"`. Zero contribution does not cover fixed costs.
- `suggestPrice` preserves the v1 denominator for margin targets; integrators must not silently reinterpret targets as a total-revenue margin.

### Advanced calculators
- `simulateCOD`: conditional shipped/created, delivered/shipped and paid/delivered percentages, with explicit reverse-logistics, advertising and operational-loss assumptions.
- `simulateCampaign`: hypothetical conversion, CAC, break-even ROAS, and projected return, **not measured advertising attribution**.
- `pricePerMeasure`: PUM comparison across mass, volume, linear measures, and items; legal applicability depends on product/category.
- `consumerPricePreview`: tax handling `included | additional | none`, declared fees/shipping and consumer-facing total. No automatic tax regime classification.
- `simulatePortfolio`: combined variable contribution and one shared monthly fixed-cost deduction.

### Workspace and backup contracts
- Local storage key: `precify-colombia:workspace:v1` (preserved intentionally for existing users).
- JSON backup export: version **2**; `decodeBackup` accepts v1 or v2 and validates all data before accepting it.
- The workspace includes saved advanced simulations; records are tagged by module.
- Tab-conflict detection compares full validated workspace snapshots, **not an atomic multiuser transaction**.

## Web embedding, WordPress, and PWA

Run `pnpm build` and host `apps/web/dist/` on a static HTTPS origin. For a separate site, embed it via a permitted iframe:

```html
<iframe src="https://calculator.example.com/" title="Precify Colombia" loading="lazy" style="width:100%;height:850px;border:0"></iframe>
```

For WordPress, use a Custom HTML block or link to the deployed app. The iframe **does not share products, sessions, or orders**. Embedded localStorage is subject to browser third-party storage policies, and CSP/`frame-ancestors` must allow intended hosts.

The PWA service worker caches static public resources. It does not synchronize business data, and availability of offline install/update depends on the browser. In production, deploy over HTTPS with appropriate CSP and security headers.

## Limitations, safety and compliance

- No commercial platform integration, Mastershop/Vezura modification, checkout, webhook, remote user database, mandatory external API or npm publication.
- Financial outcomes are estimates based on user assumptions. Taxes remain configurable; there is **no universal automatic 19% IVA**.
- Colombian legal references: [COLOMBIA_LEGAL_V2.md](COLOMBIA_LEGAL_V2.md). Security policy: [../SECURITY.md](../SECURITY.md). Release notes: [RELEASE_NOTES_2.0.0.md](RELEASE_NOTES_2.0.0.md).
