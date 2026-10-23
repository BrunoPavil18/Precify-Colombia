# Precify Colombia 🇨🇴



[Español](README.md) · [Português](README.pt-BR.md) · [English](README.en.md)

**Version 2.0.1 · Free and open source · Apache License 2.0**

## Version 2.0.1 update

Version 2.0.1 stabilizes attributed versus projected campaign ROAS, stage-specific COD costs, PUM with **explicit content and comparison units** (g/kg, ml/L, cm/m), exact portfolio break-even and ES/PT/EN translations. Version 1/2 backups and previous API contracts remain compatible; legacy three-argument PUM calls retain their historical reference units. See the [integration guide](docs/INTEGRATION_V2.md), [Colombian legal scope](docs/COLOMBIA_LEGAL_V2_0_1.md), and [2.0.1 release notes](docs/RELEASE_NOTES_2.0.1.md).


## What's new in v2.0.0

Version 2 retains the v1 features and adds interactive **COD risk simulation** (created, shipped, delivered, and paid orders), **advertising/CAC/ROAS**, **price per unit of measure** (kg, L, m, each), an **estimated consumer checkout total** (included or additional tax), and **multi-product portfolio profitability** with shared fixed expenses deducted only once. Saved simulations are grouped by module and exported through JSON backup v2; v1 backups remain importable. Explicit margin bases, commercial versus contribution markup, and zero-contribution viability checks improve clarity. Localized percentage entry, accessible confirmation dialogs, a PWA offline resource shell, and opt-in updates complete the interface changes. Taxes and logistics assumptions remain user-configurable and illustrative.


Precify Colombia is an independent pricing and profitability application in **Colombian pesos (COP)**. It supports unit costs, shipping, advertising, percentage and fixed fees, cash-on-delivery (COD) reserves, discounts, target margins, suggested prices, break-even analysis, products, independent scenarios, reports, CSV export, and JSON backups. The interface supports Colombian Spanish, Brazilian Portuguese, and English.

## Where does user data live?

**In each user's browser**, under the `localStorage` key `precify-colombia:workspace:v1`. Data entered by a developer on their own computer is **not committed to GitHub or embedded in the production bundle**. A new browser/site origin starts with an empty product catalog. “Sample product” is an unsaved calculator example, not seeded catalog data.

Browser storage is scoped to the site's origin (scheme + domain + port) and browser profile. People sharing the same profile/origin can share its data. This is **not a multiuser database or cross-device sync**. Clearing site data, using private browsing, or switching devices may erase data: export backups regularly from the **Data** screen. There is no required Precify backend receiving these records.

## Development installation

Prerequisites: **Node.js >=20.19**, **pnpm 10.34.7**, and Git.

```bash
git clone https://github.com/BrunoPavil18/Precify-Colombia.git
cd Precify-Colombia
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the URL printed by Vite (typically `http://127.0.0.1:5173/`). On Windows PowerShell, `pnpm.cmd` may be needed. If `corepack enable` fails with EPERM, install Corepack shims under a user-writable directory rather than modifying protected Node.js files.

### Tests and production build

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:core
pnpm audit --audit-level moderate
```

`pnpm lint` runs a dedicated TypeScript AST source-policy checker followed by typechecking; it is not ESLint or Biome.

## Configuration and usage

Enter acquisition cost, packaging, shipping cost/revenue, advertising, COD provisions, fees, taxes (explicit user assumptions), discounts, monthly fixed expenses, units, target contribution margin, and rounding settings. **No universal Colombian tax rate or carrier fee is assumed.** Confirm legal/tax treatment with qualified local professionals.

Display example: `89.900,50` COP. Internal engine input: `89900.50` (dot decimal, no thousands separator). `feePercent: "3.00"` means 3%. Changing language does **not** change currency, saved products, or numeric input policy.

Save/duplicate products and reusable profiles under **Products**; edit independent hypotheses under **Scenarios**; select an existing product and update monthly settings under **Goals**; compare and export CSV under **Reports**; download, validate and restore versioned JSON backups (up to 2 MB) under **Data**. Backup metadata intentionally stays `currency: COP` and `locale: es-CO` as a data-format contract regardless of UI language.

## Integrating with other websites

### Full application: Node.js websites, WordPress, or any CMS

Deploy `apps/web/dist/` to an HTTPS URL, such as `https://calculator.example.com/`, then embed that URL:

```html
<iframe
  src="https://calculator.example.com/"
  title="Precify Colombia"
  loading="lazy"
  style="width:100%;height:850px;border:0"
></iframe>
```

In **WordPress**, use a **Custom HTML** block if the site's iframe policy permits, or add an ordinary link to the deployed calculator. Set CSP `frame-ancestors` and/or `X-Frame-Options` appropriately to allow only your intended parent sites. Embedded data remains on the **iframe's origin**, subject to browser third-party storage restrictions. This does **not** synchronize WordPress users/products/orders.

### Reusing the financial engine in Node.js / TypeScript

The React-independent `packages/core` workspace exports `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice`, and other typed functions:

```ts
import { EMPTY_INPUT, analyze, suggestPrice } from "@precify-colombia/core";

const input = { ...EMPTY_INPUT, acquisition: "37000.00", currentPrice: "99000.00" };
const result = analyze(input);
console.log(result.contribution); // "49000.00" given the other example costs
console.log(suggestPrice(input).price);
```

Within this pnpm monorepo, depend on `"@precify-colombia/core": "workspace:*"`. Version 2.0.0 builds portable ESM at `packages/core/dist/index.js` with TypeScript declarations at `dist/index.d.ts`. Run `pnpm --filter @precify-colombia/core build` and `pnpm verify:core` to verify the distributable output. **The core is not published to the public npm registry**. External applications must test a locally packaged build or incorporate Apache-2.0 source. There is no official WordPress plugin or HTTP API.

To reuse external store data, map it to `PriceInput`, call `validateInput` and `analyze`, and handle `FinancialInputError`. Never expose store credentials to browser users or automatically change live store prices without authorization.

See the [integration contract](docs/INTEGRATION_CONTRACT.md), [financial formulas](docs/FINANCIAL_FORMULAS.md), [architecture](docs/ARCHITECTURE.md), [security notes](docs/SECURITY_AUDIT.md), and [Apache 2.0 license](LICENSE).

**Limits:** COP only; browser-local storage; no sign-in, backend, cross-device sync, automatic commerce integrations, checkout, or WordPress plugin. Results are illustrative, not accounting or tax advice. Source license rights do not grant third-party trademark rights.

## Documentación técnica v2 / Technical v2 documentation

- [Integration API v2](docs/INTEGRATION_V2.md)
- [Colombian legal references](docs/COLOMBIA_LEGAL_V2.md)
- [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [v2 release notes](docs/RELEASE_NOTES_2.0.0.md)
