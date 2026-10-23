# Precify Colombia 2.0.1 — Colombia: normative scope and financial presentation

**Verified on 2026-10-23.** Informational interpretation based on cited official publications, not a legal compliance certification, tax determination, or substitute for Colombian professional advice.

## Consumer prices and ecommerce

- **Law 1480/2011:** the seller's duty to inform consumers about price, conditions, and charges depends on the actual retail offer. The Precify calculator does not place orders or publish binding product listings. [Official Gestor Normativo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306).
- **Law 2439/2024:** changes Colombian ecommerce consumer protections. A **15-calendar-day** refund deadline applies to withdrawal/retracto in the conditions expressly set out in its Article 3. It must not be automatically applied to every refund, complaint, return, or simulated loss. [Official text](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116).

## PUM — price per unit of measure

[Superintendencia de Industria y Comercio (SIC), Circular Única Title II, PDF edition dated 2025-02-28](https://sedeelectronica.sic.gov.co/sites/default/files/normativa/Titulo%20II-%20Versi%C3%B3n%2028-02-2025..pdf), sections 2.3.3 and 2.3.3.4: the cited title requires PUM indication in applicable contexts with **two truncated decimal places** and lists explicit exceptions and category-/presentation-based rules. Some product contexts and special offers have extra conditions. This is not a universal rule applicable identically to every commodity or seller.

The SIC's [2026-03-20 notice concerning a judicial decision](https://sedeelectronica.sic.gov.co/noticias/la-sic-publica-fallo-judicial-y-advierte-empresas-sobre-obligacion-de-informar-el-precio-por-unidad-de-medida-pum) reiterates duties for merchants offering food and beverages through physical and electronic channels. It is evidence of enforcement scope, **not proof that all categories receive identical treatment**.

Version 2.0.1 intentionally keeps `pricePerUnit` as the mathematical **rounded-to-centavo** result of v2.0.0 for API/backward compatibility. Separately, `regulatoryTruncatedPrice` reports the two-decimal truncated amount, and `exactPriceFraction` exposes an integer numerator/denominator to avoid intermediate precision loss. The user interface explains that legal applicability is conditional. It does **not** automatically infer regulated product categories or generate publishable retail tags.

The PDF edition checked above predates today; we also verified the SIC's March 2026 notice. A definitive assertion of **fully consolidated Circular Única through October 2026** needs legal review of any later amendments, which this release does not claim.

## Tax treatment (DIAN / IVA)

The Colombian tax base, exclusions, exemptions, transportation/freight, input-tax credit, and applicability of the 19% general IVA rate are dependent on facts, product type, contracting and tax status. The app leaves rates configurable and uses only illustrative calculations; it does not certify the applicable IVA classification. [DIAN legal compilation](https://normograma.dian.gov.co/dian/compilacion/); [DIAN](https://www.dian.gov.co/). Included tax and added tax are distinct simulation modes; users must separately verify whether freight/other fees enter an actual taxable base.

## Data protection

[Law 1581/2012](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) governs processing of Colombian personal data, subject to its statutory scope/exceptions. Origin-scoped `localStorage` reduces server transmission but does not constitute a blanket exemption from handling personal data responsibly. Users should avoid personal customer records in financial scenarios and encrypt/protect exported backup files when appropriate.

## Obligations and implementation status

| Topic | Software implementation | Who must assess legal applicability |
|---|---|---|
| PUM arithmetic / display | Exact-ratio data, rounded result, and separate two-decimal truncated display | Merchant, for each product/category and SIC rules |
| Consumer final price | Informative estimate of product, discounts, configured tax and charges | Seller responsible for advertised retail prices |
| Refunds | Financial scenarios accept configurable return/refund assumptions | Merchant subject to actual transaction and retracto conditions |
| IVA | Rates configurable; no universal compulsory 19% default | Taxpayer, accounting/tax adviser |
| Personal data | Browser-local records, validation and JSON backups | Any controller/processor within Law 1581 scope |

**Do not claim this tool automatically complies with DIAN/SIC or supplies tax/legal advice.**
