# Política monetaria COP

Valores de API: strings decimales canónicos con punto y hasta 2 decimales (por ejemplo 89900.50); cálculos internos con BigInt en centavos. Pantalla es-CO: $ 89.900,50. El punto en 89.900 identifica miles, **nunca** 89,9. Porcentajes: 19 significa 19%; 0.19 significa 0,19%.

Cada deducción porcentual se redondea a centavos por half-up. Precio recomendado se redondea al alza: centavo, peso, múltiplos de 50/100/500/1000 COP o próximo precio terminado en 900/990 dentro de cada bloque de 1000 COP. Revalida la meta tras redondeo. Estas reglas comerciales no sustituyen normas de cambio COD.

Entradas negativas, NaN, Infinity, notación exponencial y múltiplos decimales se rechazan. No hay conversión de moneda en 1.0.
