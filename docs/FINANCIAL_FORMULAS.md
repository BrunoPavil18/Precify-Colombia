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
