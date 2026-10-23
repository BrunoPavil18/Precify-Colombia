# Contrato técnico de integración — Precify Colombia v2.0.0 (en desarrollo)

**Estado:** API candidata sin estabilidad garantizada; pendiente de build, validación de `npm pack` y prueba por un consumidor externo. No está publicada en npm.

## Motor desacoplado

Compilar primero:

```bash
pnpm --filter @precify-colombia/core build
```

El workspace `packages/core` genera `dist/index.js` (ESM) y `dist/index.d.ts` (tipos). El `exports` principal apunta al build compilado. En un monorepo pnpm consumidor, la dependencia puede ser `"@precify-colombia/core":"workspace:*"`. En otro repositorio, use un paquete local producido con `pnpm pack`, tras revisar su contenido, o incluya el código bajo Apache 2.0. No presuma una publicación pública en npm.

```ts
import {EMPTY_INPUT, analyze, suggestPrice, simulateCOD, simulatePortfolio} from "@precify-colombia/core";

const input={...EMPTY_INPUT,acquisition:"37000.00",currentPrice:"99000.00"};
const current=analyze(input);
console.log(current.contribution, current.marginOnCollectedPercent);
const price=suggestPrice(input).price;
const mix=simulatePortfolio([{product:input,monthlyUnits:"10"}],"320000.00");
```

### Contratos

- `PriceInput`: moneda COP, importes en string decimal canónico (`89900.50`), porcentajes explícitos (`19.00`) y cantidad mensual como string de entero.
- `analyze`: `marginPercent` sigue usando la **venta neta del producto** por compatibilidad con v1. `marginOnCollectedPercent` usa toda la recaudación (producto + flete recibido), `commercialMarkupPercent` se basa en precio neto/costo variable; `viability` distingue `positive`, `zero`, `negative`.
- `suggestPrice`: sigue buscando la meta de margen legado (venta neta del producto) hasta que exista una política explícita y migración contractual.
- `simulateCOD`: fracciones condicionales de pedidos enviados, entregados y pagados; no atribuye probabilidades típicas colombianas.
- `simulateCampaign`: CAC, ROAS y equilibrio estimados; no lee cuentas de anuncios.
- `pricePerMeasure`: PUM orientativo por kg/L/m/unidad.
- `consumerPricePreview`: IVA incluido/adicional/ninguno definido expresamente, sin duplicar IVA incluido.
- `simulatePortfolio`: una sola deducción de gasto fijo del negocio.
- `encodeBackup`: versión 2; `decodeBackup`: admite formatos versionados 1 y 2, conforme validación. Workspace mantiene la clave de almacenamiento v1 para preservar productos locales existentes.
- **No** API HTTP, WordPress plugin, Mastershop checkout ni credenciales.

## Segurança / seguridad / security

No aceptar valores no confiables sin pasar por `validateInput`, `decodeBackup` y las validaciones de las funciones. Los resultados de COD, campañas, IVA y PUM son **estimaciones**, no cumplimiento normativo ni decisiones fiscales automatizadas. No publicar precios ni mutar pedidos sin autorización y verificación del comerciante.

## Responsabilidades del integrador

- Identificar fuente y vigencia de costos, tasas, volúmenes y tratamiento tributario.
- Mostrar siempre la unidad y denominador de margen.
- Mantener backups protegidos y no incorporar información personal al repositorio.
- No tratar un iframe como integración de sesión/productos.
- Verificar comportamiento frente a navegadores sin soporte de almacenamiento offline.
