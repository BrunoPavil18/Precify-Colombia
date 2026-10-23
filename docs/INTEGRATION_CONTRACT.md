# Contrato de integración futura

Se expone @precify-colombia/core: validateInput, analyze, suggestPrice, maxDiscountPercent, validateWorkspace, encodeBackup y decodeBackup. Entrada PriceInput de strings monetarios decimales canónicos con moneda COP y porcentaje explícito (por ejemplo feePercent: "3.00"). Salida Breakdown y warnings documentados.

La Vezura, si más adelante se autoriza, será consumidora, no requisito. Un adaptador **solo lectura** podría transformar producto, variante y costos cuya fuente esté validada. Prohibido exponer secretos en el navegador, crear pedidos o modificar precios durante esta fase. Los datos del core no dependen de geolocalización, DeepL, Mastershop ni servicios externos.
