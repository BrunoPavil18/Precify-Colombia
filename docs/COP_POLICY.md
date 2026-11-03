# Política monetaria COP

Valores de API: strings decimales canónicos con punto y hasta 2 decimales (por ejemplo 89900.50); cálculos internos con BigInt en centavos. Pantalla es-CO: $ 89.900,50. El punto en 89.900 identifica miles, **nunca** 89,9. Porcentajes: 19 significa 19%; 0.19 significa 0,19%.

Cada deducción porcentual se redondea a centavos por half-up. Precio recomendado se redondea al alza: centavo, peso, múltiplos de 50/100/500/1000 COP o próximo precio terminado en 900/990 dentro de cada bloque de 1000 COP. Revalida la meta tras redondeo. Estas reglas comerciales no sustituyen normas de cambio COD.

Entradas negativas, NaN, Infinity, notación exponencial y múltiplos decimales se rechazan. No hay conversión de moneda en 1.0.

## Multi-currency extension planned for 2.1.0 (not yet released)

The public v2.0.1 pricing, backups and previous financial API continue to operate strictly in COP with BigInt centavos. New standalone international calculations accept a selected ISO 4217 currency and its Intl-defined number of minor digits (for example JPY 0, COP/USD/BRL 2 and BHD 3). They never mix native monetary units within a single price or order funnel and do not apply Colombian taxation to foreign markets automatically. Per-currency costs, commissions and target denominator are explicit.

The optional Frankfurter v2 public API provides indicative, generally daily exchange rates for supported pairs, not guaranteed intraday/real-time market quotes. Exact conversions operate on rate decimal strings and BigInt, and display reference date, source and offline staleness; unavailable rates must not be fabricated. Existing COP amounts and stored products are never secretly converted.

Historical prices use a separate bounded, opt-in local catalog/backup schema. Third-party connected organizations store currency codes alongside financial events and require explicit dated conversions before aggregation across currencies. There are no automatic foreign-tax classifications or cash-rounding assumptions.
