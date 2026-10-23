# Integration contract — Precify Colombia v2.0.1

**Canonical guide:** [INTEGRATION_V2.md](INTEGRATION_V2.md). This document replaces the outdated version 1 source-only package assumptions.

The independent `@precify-colombia/core` package is compiled with `pnpm --filter @precify-colombia/core build` and exposes `dist/index.js` (ESM) plus `dist/index.d.ts` (TypeScript declarations). Run `pnpm verify:core` to check the built entrypoint. **It has not been published on npm.**

Public exports include `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice`, `maxDiscountPercent`, `simulateCOD`, `simulateCampaign`, `pricePerMeasure`, `consumerPricePreview`, `simulatePortfolio`, `validateWorkspace`, `encodeBackup`, and `decodeBackup`.

COP monetary values use canonical strings such as `"89900.50"`, not localized `"89.900,50"`. Percentage inputs use explicit decimal percentage strings such as `"3.00"` for 3%. Keep margins' denominators explicit. Browser locale changes presentation only, not money or financial calculations.

No Vezura/Mastershop changes, automatic order/webhook operations, HTTP API, or WordPress plugin are included. An external consumer may build its own adapter, subject to data-validation, security, privacy and licensing review. The Apache-2.0 software license does not remove consumer-law or tax obligations.

### 2.0.1 PUM contract

`pricePerMeasure(price, quantity, contentUnit, referenceUnit?)` accepts a fourth, optional compatible reference unit; three-argument integrations retain their historical normalized result. Both input and reference units are explicit in the new UI, and no local data migration is needed. See [the main integration guide](INTEGRATION_V2.md).
