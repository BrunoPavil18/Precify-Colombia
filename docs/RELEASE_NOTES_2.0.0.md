# 🇨🇴 Precify Colombia v2.0.0 — Advanced Financial Intelligence

**Free, open-source pricing and profitability software for Colombian commerce.**

Precify Colombia 2.0.0 expands the original COP pricing calculator into an advanced business simulation toolkit. It preserves the privacy-first, browser-local experience and every core capability introduced in v1, while adding COD delivery risk, advertising economics, Colombian unit-price comparisons, consumer price previews, portfolio profitability, PWA support, and safer editing workflows.

## ✨ Everything from v1.0.0

### 💰 Accurate COP pricing
- Unit acquisition, packaging, shipping and advertising costs.
- Fixed fees and configurable percentage charges.
- Cash-on-delivery and returns reserves, optional tax assumptions and combined discounts.
- Contribution per sale, target contribution margin, markup analysis, suggested prices, maximum estimated discount and commercial price rounding.
- BigInt-based exact monetary calculations using canonical COP decimal strings.

### 📦 Products, scenarios, and goals
- Private browser-local product catalog: create, edit, duplicate and remove products.
- Reusable cost profiles and independent optimistic, expected and conservative scenarios.
- Monthly sales projections, business fixed-cost estimates and break-even calculations.

### 📊 Reports and data control
- Product contribution comparisons and cost-sensitivity indicators.
- Local history, CSV exports with spreadsheet formula-injection safeguards.
- Versioned, validated JSON backup export and restore.
- Spanish (es-CO), Portuguese (pt-BR) and English interface, always calculating in COP.

## 🚀 What's new in v2.0.0

### 1. Advanced COD risk simulation
Model created, shipped, delivered, and successfully paid orders using user-defined conditional probabilities. Estimate failed-delivery costs, reverse logistics, per-order acquisition advertising, additional COD commissions, and operational loss reserves. Compare expected profit per created order and per paid order. **No logistics benchmark or default Colombian carrier tariff is claimed.**

### 2. Advertising, CAC, and ROAS
Simulate impressions, conversion rate, customer acquisition cost, estimated maximum CAC, ROAS, break-even ROAS, attributed revenue after refunds, and projected campaign contribution. Metrics are based on merchant-entered assumptions, not connected ad accounts or automatically verified attribution.

### 3. Price per Unit of Measure (PUM)
Calculate comparable unit prices by mass (g/kg), volume (ml/L), length (cm/m), or item count. This is a calculation aid; mandatory public PUM display depends on applicable Colombian requirements and product categories.

### 4. Consumer-facing price preview
Break down the product price, fixed discount, user-declared VAT treatment (tax already included, tax added, or no tax), optional charges, shipping, and estimated consumer total. Included tax is not added a second time. **IVA is not automatically fixed at 19% for every product.**

### 5. Multi-product profitability
Project contribution across different products and estimated monthly sales volumes, including weighted average contribution, combined profit, and break-even units based on the simulated mix. Shared monthly fixed costs are deducted **once**, not on every product line.

### 6. Clearer profitability metrics
- Separate contribution margin on net product sales from margin on total collected revenue.
- Distinguish traditional commercial markup from contribution-based markup.
- Correctly classify zero contribution as unable to cover fixed expenses.
- Preserve the original suggested-price target denominator for backward compatibility; labels explain the distinction.

### 7. Saved advanced simulations and compatible backups
- Save, restore and remove simulations in their own module, without mixing COD and portfolio records.
- Export v2 JSON backups and **restore existing v1 backups**.
- Keep existing localStorage data on the same application origin; stale-tab checks compare complete validated snapshots.
- Protect unsaved drafts and destructive actions with dedicated, keyboard-accessible confirmation dialogs.

### 8. PWA and offline resources
An application manifest, installable icon, versioned static-resource service worker, and opt-in update activation support use where the browser permits it. Local business data remain outside public asset caches. Offline availability depends on prior asset loading and browser capabilities.

### 9. Typed, reusable financial core
`@precify-colombia/core` builds distributable ESM JavaScript and TypeScript declarations, with `pnpm verify:core` to validate the compiled exports. The package is **not published to npm** and there is no automatic WordPress, Vezura, Mastershop, checkout, or webhook integration.

### 10. UX, localization and documentation
- Responsive mobile navigation and formatted COP/percentage/ROAS outputs.
- Static ES/PT/EN dictionaries without paid translation services.
- More explicit error states, local-only storage warnings, and cancel-safe dialogs.
- Dated Colombian legal and commercial information covering consumer rights, ecommerce, IVA/DIAN, PUM/SIC, and personal data protections.

## 🔒 Privacy and limitations

No required sign-in, analytics connection, cloud database or paid external API. Workspace data stay in each user's browser origin; deleting site storage may delete data, so **export backups regularly**. `localStorage` stale-write detection is **not an atomic multi-tab transaction**.

Financial, tax, logistical, and legal content is illustrative, not accounting advice, legal certification, tax filing, or a guarantee of commercial compliance.

## ✅ Testing and validation

The maintainer reported:
- **53/53 automated tests passing** (34 core, 19 web).
- TypeScript typecheck, dedicated AST source lint (15 files), and production Vite build passing.
- Compiled ESM entrypoint/type declaration verification passing.
- Dependency audit reporting **no known vulnerabilities** at the moderate threshold.
- 24 manual acceptance checks passing, including v1 backup restoration, scenario persistence, confirmation-dialog cancellations, keyboard interaction and mobile review.

No GitHub Actions execution was requested. Passing tests and a dependency audit do not constitute independent security or regulatory certification.

## 🛠️ Install and build

Requires Node.js >=20.19, pnpm 10.34.7 and Git.

```bash
git clone https://github.com/BrunoPavil18/Precify-Colombia.git
cd Precify-Colombia
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Production and verification:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:core
pnpm audit --audit-level moderate
```

Windows PowerShell may require `pnpm.cmd`. Deploy `apps/web/dist/` to an HTTPS static host; do not use the development server in production.

## 📚 Documentation

- [Español — README](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/README.md)
- [Português — README](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/README.pt-BR.md)
- [English — README](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/README.en.md)
- [Integration guide](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/docs/INTEGRATION_V2.md)
- [Colombian regulatory references](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/docs/COLOMBIA_LEGAL_V2.md)
- [Security policy](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/SECURITY.md) · [Changelog](https://github.com/BrunoPavil18/Precify-Colombia/blob/main/CHANGELOG.md)

## ⚖️ License

**Apache License 2.0.** Independently developed, available to Colombian merchants and developers without requiring any particular commerce platform.

**Precify Colombia v2.0.0 — Smarter pricing. Deeper insights. Your data, your control.** 🇨🇴
