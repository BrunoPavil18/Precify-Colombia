# Precify Colombia 🇨🇴

> **Precify Colombia 2.0.0:** versión integrada en `main` y homologada funcionalmente por el mantenedor (53 pruebas automatizadas aprobadas). La publicación de la etiqueta/release v2.0.0 se realiza por separado. Consulte [alcance y límites](docs/V2_STATUS.md).


[Español](README.md) · [Português](README.pt-BR.md) · [English](README.en.md)

**Versión 2.0.0 · Aplicación gratuita y de código abierto · Apache License 2.0**

Precify Colombia calcula precios, contribución, margen, descuentos, publicidad, fletes, reservas de pago contra entrega (COD), metas y punto de equilibrio en **pesos colombianos (COP)**. Incluye catálogo, escenarios, informes, exportación CSV, respaldo/restauración JSON e interfaz en **ES / PT / EN**. Es independiente de Vezura y de cualquier servicio comercial.

## Privacidad: cada instalación comienza vacía

Los productos, escenarios, perfiles y eventos se guardan en el **localStorage del navegador de cada usuario**, bajo la clave `precify-colombia:workspace:v1`. El repositorio y el build estático **no incluyen los datos que cargue el desarrollador en su propia computadora**. Si no hay datos locales, la aplicación inicia sin productos guardados. «Producto ejemplo» es solo un borrador demostrativo de la calculadora.

El almacenamiento está separado por origen (protocolo + dominio + puerto); usuarios distintos del mismo equipo y navegador/perfil podrían compartirlo. No es una base de datos multiusuario. Borrar datos del sitio o usar navegación privada puede eliminar los datos: **exporte respaldos periódicamente**. No se envían los datos a un backend de Precify Colombia.

## Instalación para desarrollo

Requisitos: **Node.js >=20.19** y **pnpm 10.34.7**; Git para clonar.

```bash
git clone https://github.com/BrunoPavil18/Precify-Colombia.git
cd Precify-Colombia
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Abra la URL local indicada por Vite (normalmente `http://127.0.0.1:5173/`). En Windows, si `corepack enable` produce EPERM, use Corepack con un directorio de shims del usuario (consulte las instrucciones de Corepack); no necesita instalar globalmente con privilegios elevados. En PowerShell puede ejecutar `pnpm.cmd` en lugar de `pnpm`.

### Comprobación y distribución estática

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
```

El script `lint` actual ejecuta TypeScript, **no ESLint**. La web compilada está en `apps/web/dist/`. Publique el contenido de esa carpeta mediante cualquier servidor HTTPS de archivos estáticos, configurando el tipo MIME correcto y cabeceras de seguridad. **No publique `node_modules` ni los archivos fuente como servidor de producción.** La compilación estática funciona sin cuentas y no requiere una API externa. El servidor Vite de desarrollo no es un servidor de producción.

## Configuración

Abra la Calculadora y establezca adquisición, empaque, envío, comisión fija y porcentual, publicidad, reservas COD, descuentos, IVA ilustrativo, precio de venta, margen objetivo y redondeo. Las tarifas e impuestos **no se infieren automáticamente**: deben ingresarse como hipótesis explícitas y confirmarse con asesores competentes.

**Formato de entrada de la interfaz:** `89.900,50` COP. **Formato canónico del motor:** `89900.50` (decimal con punto, sin separador de miles). Los porcentajes canónicos, por ejemplo `3.00`, representan 3%. Todas las monedas siguen siendo COP aunque se cambie el idioma visual.

En Productos guarde y duplique fichas y perfiles. Escenarios crea variantes independientes. Metas selecciona un producto y permite editar solo sus gastos fijos mensuales y unidades proyectadas. Informes exporta CSV y Datos descarga/restaura el respaldo JSON validado (hasta 2 MB). No cambie manualmente los metadatos de formato del respaldo (`currency: COP`, `locale: es-CO`).

## Integración con otros sitios

### 1. Insertar la aplicación completa (Node.js, WordPress u otro sitio)

Publique primero `apps/web/dist/` en un **origen HTTPS propio** (por ejemplo, `https://calculadora.ejemplo.com/`), luego incorpórela en una página con un iframe:

```html
<iframe
  src="https://calculadora.ejemplo.com/"
  title="Precify Colombia"
  loading="lazy"
  style="width:100%;height:850px;border:0"
></iframe>
```

En **WordPress**, utilice un bloque **HTML personalizado** si la política del sitio permite iframes. También puede enlazar directamente a la aplicación alojada. Si configura CSP `frame-ancestors` o `X-Frame-Options`, permita expresamente el sitio que la incorporará. La navegación del iframe conserva los datos **en el origen de la aplicación**, sujeto a las políticas de almacenamiento de terceros de cada navegador; esto no es sincronización con WordPress ni una integración de usuarios o productos.

### 2. Reutilizar cálculos en Node.js / TypeScript

El workspace `packages/core` exporta `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice`, `maxDiscountPercent` y tipos. En un monorepo pnpm puede declarar `"@precify-colombia/core": "workspace:*"`. Ejemplo *dentro de este repositorio*:

```ts
import { EMPTY_INPUT, analyze, suggestPrice } from "@precify-colombia/core";

const input = { ...EMPTY_INPUT, acquisition: "37000.00", currentPrice: "99000.00" };
const result = analyze(input);
console.log(result.contribution); // "49000.00" con los otros costos del ejemplo
console.log(suggestPrice(input).price);
```

**Nota técnica:** en 1.0.0 el paquete `@precify-colombia/core` es un **workspace de código fuente TypeScript**, no un paquete publicado en npm con distribución universal precompilada. Para otro repositorio, copie o incorpore el core bajo Apache 2.0, configure su compilador/bundler y resuelva sus exports `.ts`; no presuponga que `npm install @precify-colombia/core` funciona públicamente. Para una integración con WordPress/PHP sin iframe hace falta desarrollar un adaptador JS o API propio; **no existe un plugin WordPress ni una API HTTP oficial** en 1.0.0.

### 3. Integración de datos

Use un adaptador específico que traduzca su modelo de producto a `PriceInput`, invoque `validateInput` y `analyze`, y trate `FinancialInputError`. No transmita claves de API al navegador. No modifique precios de tiendas automáticamente sin autorización. Lea [el contrato técnico](docs/INTEGRATION_CONTRACT.md) y [las fórmulas](docs/FINANCIAL_FORMULAS.md).

## Arquitectura y límites

- `packages/core`: motor financiero y serialización de backup, independientes de React.
- `apps/web`: React + Vite, presentación accesible y almacenamiento local.
- Solo COP, interfaz `es-CO` por defecto, `pt-BR` y `en` disponibles.
- Sin backend, registro obligatorio, WordPress plugin, checkout, sincronización entre dispositivos ni conversión de divisas.
- Resultados informativos, no asesoría financiera/tributaria. IVA y COD dependen de parámetros ingresados por el usuario.

Consulte [arquitectura](docs/ARCHITECTURE.md), [idiomas](docs/I18N.md), [seguridad](docs/SECURITY_AUDIT.md) y [licencia Apache 2.0](LICENSE). La licencia del código no concede derechos sobre marcas de terceros.
