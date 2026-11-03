# Precify Financy

> **2.1 Vezura catalog candidate:** published products sync into a separate read-only local mirror; see [architecture and QA](docs/VEZURA_CATALOG_MIRROR_V2_1_0.md). Requires store PR #119 rollout and Windows acceptance.




[Español](README.md) · [Português](README.pt-BR.md) · [English](README.en.md)

**Version 2.1.0 in development (UNRELEASED) · Latest stable version: 2.0.1 · Apache License 2.0**

**Final 2.1.0 candidate audit:** [Precify Financy — consolidated verification](docs/FINANCY_FINAL_AUDIT.md). TS/BigInt financial engine, Windows SQLite primary storage and Ed25519 installation credentials. Live store acceptance still requires the merchant server.


## 2.1.0 dark-first redesign — consolidated candidate

Implemented a **Jet Black `#121212`** theme, task-first grouped navigation, new **Overview** dashboard, direct COD/CAC/CPA/PUM entry points, searchable catalog, report filters, smooth default microinteractions and a mobile navigation drawer. Existing financial formulas and offline behavior remain intact. **118 automated tests** and real Chromium UI acceptance (19 routes, save and reload) passed. [Delivery record](docs/REDESIGN_DELIVERY_V2_1_0.md) · [CI evidence](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400964119). This is still an unreleased draft; Vezura was not modified.

## Version 2.1.0 development — not production-certified

This feature branch adds native ISO-currency pricing, dated daily FX references with offline caches, an independent international catalog, a COD funnel, CPA matrix, CSV imports, dashboards and an optional REST service with organizations, roles, signed webhooks and Facebook Ads. A stateless iframe calculator (`?embed=1`) can be embedded in Vezura or another website **without modifying Vezura's repository**. Connected capabilities require PostgreSQL/Supabase, Meta credentials and external integration testing; they are NOT production-ready. [Progress checkpoints](docs/EXECUTION_CHECKPOINTS_V2_1_0.md) · [Integration guide](docs/CONNECTED_API_V2_1_0.md).

## Store-owned, local-first integration — device protocol v2 (2.1.0 candidate)

**Recommended path:** in **Connections → Connect your own stores**, a merchant administrator enables the Precify v2 API on the store backend and issues a separate single-use invitation code for **each installation**. Add the store's name and HTTPS URL, then paste its invitation into the store card and activate that device. Each installation has its own Ed25519 identity; no Precify-hosted user account is required. Store orders and campaigns remain on the merchant server while clients are offline. The app syncs when open and authorized; there is **no native background synchronization while the app is closed**.

**Storage:** on Windows, native SQLite is authoritative for business-scoped financial records and transactionally cached merchant events. Non-exportable device keys remain in the WebView2 WebCrypto store. The browser PWA instead uses web storage/IndexedDB with per-site consent. The legacy bearer-token v1 adapter is kept only for existing integrations.

**Current state:** Vezura's Device API v2 backend is merged in its codebase (PR #118). Published catalog support is proposed in PR #119 and requires merge/deploy; live order synchronization still requires production acceptance. [v2 protocol and MySQL/Postgres examples](docs/STORE_DEVICE_API_V2.md) · [Vezura integration requirements](docs/VEZURA_INTEGRATION_NEXT.md).

## Version 2.0.1 update

Version 2.0.1 stabilizes attributed versus projected campaign ROAS, stage-specific COD costs, PUM with **explicit content and comparison units** (g/kg, ml/L, cm/m), exact portfolio break-even and ES/PT/EN translations. Version 1/2 backups and previous API contracts remain compatible; legacy three-argument PUM calls retain their historical reference units. See the [integration guide](docs/INTEGRATION_V2.md), [Colombian legal scope](docs/COLOMBIA_LEGAL_V2_0_1.md), and [2.0.1 release notes](docs/RELEASE_NOTES_2.0.1.md).


## What's new in v2.0.0

Version 2 retains the v1 features and adds interactive **COD risk simulation** (created, shipped, delivered, and paid orders), **advertising/CAC/ROAS**, **price per unit of measure** (kg, L, m, each), an **estimated consumer checkout total** (included or additional tax), and **multi-product portfolio profitability** with shared fixed expenses deducted only once. Saved simulations are grouped by module and exported through JSON backup v2; v1 backups remain importable. Explicit margin bases, commercial versus contribution markup, and zero-contribution viability checks improve clarity. Localized percentage entry, accessible confirmation dialogs, a PWA offline resource shell, and opt-in updates complete the interface changes. Taxes and logistics assumptions remain user-configurable and illustrative.


Precify Financy is an independent pricing and profitability application in **Colombian pesos (COP)**. It supports unit costs, shipping, advertising, percentage and fixed fees, cash-on-delivery (COD) reserves, discounts, target margins, suggested prices, break-even analysis, products, independent scenarios, reports, CSV export, and JSON backups. The interface supports Colombian Spanish, Brazilian Portuguese, and English.

## Where does user data live?

**In each user's browser**, under the `localStorage` key `precify-financy:workspace:v1`. Data entered by a developer on their own computer is **not committed to GitHub or embedded in the production bundle**. A new browser/site origin starts with an empty product catalog. “Sample product” is an unsaved calculator example, not seeded catalog data.

Browser storage is scoped to the site's origin (scheme + domain + port) and browser profile. People sharing the same profile/origin can share its data. This is **not a multiuser database or cross-device sync**. Clearing site data, using private browsing, or switching devices may erase data: export backups regularly from the **Data** screen. There is no required Precify backend receiving these records.

## Development installation

Prerequisites: **Node.js >=20.19**, **pnpm 10.34.7**, and Git.

```bash
git clone https://github.com/BrunoPavil18/Precify-Financy.git
cd Precify-Financy
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
  title="Precify Financy"
  loading="lazy"
  style="width:100%;height:850px;border:0"
></iframe>
```

In **WordPress**, use a **Custom HTML** block if the site's iframe policy permits, or add an ordinary link to the deployed calculator. Set CSP `frame-ancestors` and/or `X-Frame-Options` appropriately to allow only your intended parent sites. Embedded data remains on the **iframe's origin**, subject to browser third-party storage restrictions. This does **not** synchronize WordPress users/products/orders.

### Reusing the financial engine in Node.js / TypeScript

The React-independent `packages/core` workspace exports `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice`, and other typed functions:

```ts
import { EMPTY_INPUT, analyze, suggestPrice } from "@precify-financy/core";

const input = { ...EMPTY_INPUT, acquisition: "37000.00", currentPrice: "99000.00" };
const result = analyze(input);
console.log(result.contribution); // "49000.00" given the other example costs
console.log(suggestPrice(input).price);
```

Within this pnpm monorepo, depend on `"@precify-financy/core": "workspace:*"`. Version 2.0.0 builds portable ESM at `packages/core/dist/index.js` with TypeScript declarations at `dist/index.d.ts`. Run `pnpm --filter @precify-financy/core build` and `pnpm verify:core` to verify the distributable output. **The core is not published to the public npm registry**. External applications must test a locally packaged build or incorporate Apache-2.0 source. There is no official WordPress plugin or HTTP API.

To reuse external store data, map it to `PriceInput`, call `validateInput` and `analyze`, and handle `FinancialInputError`. Never expose store credentials to browser users or automatically change live store prices without authorization.

See the [integration contract](docs/INTEGRATION_CONTRACT.md), [financial formulas](docs/FINANCIAL_FORMULAS.md), [architecture](docs/ARCHITECTURE.md), [security notes](docs/SECURITY_AUDIT.md), and [Apache 2.0 license](LICENSE).

**Limits:** COP and indicative ISO pricing are available; Windows uses SQLite and the PWA uses browser storage. No live merchant order sync, background desktop service, checkout or official WordPress plugin has been deployed; each store needs its own v2 server adapter. Results are illustrative, not accounting or tax advice. Source license rights do not grant third-party trademark rights.

## Documentación técnica v2 / Technical v2 documentation

- [Integration API v2](docs/INTEGRATION_V2.md)
- [Colombian legal references](docs/COLOMBIA_LEGAL_V2.md)
- [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [v2 release notes](docs/RELEASE_NOTES_2.0.0.md)

## Precify Tauri desktop and isolated businesses (2.1.0 candidate)

The financial engine **remains TypeScript/BigInt** to preserve parity with the PWA. The Windows app uses Rust for its native window and per-business SQLite snapshots; native SQLite is now authoritative for Windows financial records; browser storage is a read projection. Separate businesses and an all-business overview are available without fabricated profits or cross-currency totals. [Decision](docs/FINANCIAL_ENGINE_RUST_DECISION_2026-11-02.md) · [Implementation and limits](docs/MULTI_BUSINESS_DESKTOP_V2_1_0.md). Vezura has not been changed.
