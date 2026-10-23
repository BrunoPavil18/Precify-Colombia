# Fórmulas y supuestos

No sustituye orientación contable/fiscal. Los impuestos y reservas de logística son **hipótesis editables**.

Sea P el precio inicial, d el descuento porcentual (escala 0..1), D el descuento fijo, H el envío cobrado al cliente, V la suma de adquisición, embalaje, transporte, comisión fija, publicidad, reserva COD y devoluciones; q suma de porcentajes de comisiones/deducciones sobre el producto después de descuentos y t el IVA configurable incluido en el precio del producto.

S = P - redondeo(P*d) - D
IVA ilustrativo = redondeo(S*t/(1+t))
Deducciones = redondeo(S*q) + IVA
Contribución M = S + H - V - deducciones
Margen contribución = 100*M/S (indefinido si S=0)
Markup **de contribución sobre costos variables** = 100*M/V (indefinido si V=0)
Utilidad mensual estimada = M*unidades - gastos_fijos
Equilibrio unidades = ceil(gastos_fijos/M) solamente si M>0

El precio objetivo es el mínimo P pre-descuento positivo que cumple M/S >= margen_meta, encontrado con bisección BigInt y luego elevado al siguiente valor de redondeo comercial. Se vuelve a comprobar el margen final. Caso sin descuentos ni IVA con tasas homogéneas: P=(V-H)/(1-q-meta) para denominador positivo.

El descuento máximo se calcula para el precio actual, **aislando** el porcentaje y suponiendo descuento fijo cero; no representa máximo de campañas combinadas.

Ejemplos independientes:
- Adquisición 60, otros gastos 0, descuentos 0, tasas 0, meta 20% => recomendado 75 COP.
- Precio 100, costo 50, tasas 0, meta 20% => descuento porcentual aislado máximo 37,50%.
- Precio 100, costo 50, gastos fijos 75, cuatro unidades/mes => contribución 50, equilibrio 2, utilidad mensual 125.

La versión 1.0 no implementa créditos fiscales, retenciones, base de IVA del envío ni mezclas de inventario; consulte a un contador.



## 2.0.1 corrections — advanced simulations (2026-10-23)

**Campaigns:** reported attributed ROAS = `(attributedRevenue - attributedRevenue × refundRate) / adSpend`; **projected** gross revenue = `estimatedConversions × net unit collected revenue`; projected returns = `projectedGrossRevenue × refundRate`; projected contribution/profit = `estimatedConversions × perUnitContributionExcludingProductAdvertising - projectedReturns - totalCampaignAdSpend`. The latter is a **scenario estimate** that assumes each refunded sale loses all collected revenue while incurring its cost. The API now exposes both bases, projected ROAS, mismatch flag and difference rather than pretending that arbitrary attributed revenue reconciles with the projection. Zero conversions cannot create positive projected profit. Product-level estimated advertising is removed before deducting campaign spend to avoid double counting. This is NOT realized net accounting profit.

**COD:** failed delivery attempt expense is assessed on **shipped but undelivered** orders, not orders never shipped. Reverse shipping assumed for undelivered orders and delivered-but-unpaid orders; uncollected-order loss reserves still apply per failed-to-pay order when configured. Conditional count estimates are rounded to discrete orders, with assumptions shown. Expose profit per created, shipped and paid order (null where denominator is zero). Product advertising/COD/returns reserves are removed from per-paid contribution before stage-specific charges are applied; remaining inventory-loss risk requires explicit reserves.

**PUM:** the historic `pricePerUnit` returns the mathematically rounded centavo amount; `regulatoryTruncatedPrice` is separately **truncated** to two decimal places for use only when the SIC context makes that appropriate. `exactPriceFraction` retains integer ratio components before presentation.

**Portfolio:** fixed-composition break-even = `ceil(sharedFixedCosts × totalProjectedUnits / aggregateProjectedContribution)`, with **no early rounding of average contribution**. This assumes projected sales mix remains fixed and contributions are positive; when the denominator is nonpositive or volume zero, no break-even units can be computed. The shared monthly fixed cost is deducted exactly once.

**Suggested price and margin target:** `suggestPrice` and `maxDiscountPercent` intentionally preserve the v1 contract (contribution divided by **net product sale**, not total collected revenue). Their target is not automatically converted to a total-revenue margin in a patch release. `marginOnCollectedPercent` remains a separate output. Never silently mix them.
