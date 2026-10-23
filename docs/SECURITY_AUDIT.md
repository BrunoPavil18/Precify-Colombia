# Auditoría técnica — Precify Colombia 1.0.0

**Estado:** PR consolidada en Draft; `main` preservada. No se ha hecho merge, tag, release, deployment ni ejecución de GitHub Actions.

## 1. Evidencia de validación local aportada por el propietario

Sobre Windows, con Node.js 24.19.0, pnpm 10.34.7, Vite 8.3.4:

- `pnpm install --lockfile-only --ignore-scripts`: aprobada; lockfile creado en la computadora del usuario.
- `pnpm install --frozen-lockfile --ignore-scripts`: aprobada.
- `pnpm typecheck`: aprobada para core y web.
- `pnpm lint`: aprobada, **solo ejecuta `tsc`**, no un linter independiente.
- `pnpm test`: **21/21** aprobadas en el primer ciclo.
- `pnpm build`: aprobada, compilación estática de producción.
- `pnpm audit --audit-level moderate`: `No known vulnerabilities found` en aquel conjunto de dependencias.
- `pnpm dev`: servidor Vite inició y el usuario mostró las seis vistas en escritorio.
- Pruebas funcionales observadas: alta, edición, duplicación y persistencia tras F5.

El propietario añadió el **pnpm-lock.yaml** real a la rama del PR después del primer ciclo. No se incluyeron credenciales ni servicios externos obligatorios.

## 2. Cambios posteriores sin validación local

Tras el primer ciclo se incorporaron:

- Selector de producto, edición independiente de escenarios, botón de descartar y nueva vista previa.
- Traducción estática integral de la UI al portugués brasileño e inglés, además del español colombiano preexistente.
- Selector ES/PT/EN persistente, atributo HTML lang, mensajes financieros y de confirmación traducidos.
- Informes CSV con encabezados y etiquetas de origen localizados; esquema de backup, dinero y tipos de core invariables.
- **13 pruebas adicionales escritas**: 4 del flujo de escenarios, 8 comprobaciones de internacionalización y 1 de exportación CSV multilingüe. Total **34 tests definidos**.

**No se han ejecutado los 34 tests, typecheck, build ni audit posteriores a estos últimos cambios dentro del ambiente de la asistente.** Los resultados anteriores de 21/21 no implican que los cambios recientes estén aprobados. Se requiere repetir en la máquina del propietario.

## 3. Diseño de seguridad y límites

- Implementación original; no se copiaron archivos de otros proyectos Precify.
- Core desacoplado de React; dinero COP en centavos BigInt y JSON de backup con esquema versionado.
- Backup/importación con límites de tamaño, validación estricta y confirmación antes de sobrescritura.
- CSV escapado y neutralizado contra inyección de fórmulas, incluso con columnas traducidas.
- Copia local de textos estáticos PT/EN: no requiere DeepL, API key, redes ni telemetría.
- Preferencia de idioma independiente del workspace financiero. No altera `currency: COP` ni `locale: es-CO` del backup (contrato de formato).
- Los errores provenientes de extensiones o navegador pueden escapar al control del traductor propio.
- `pnpm audit` sin avisos no prueba ausencia de vulnerabilidades; revisar lockfile, dependencias transitivas, CSP/headers del hosting y scripts instaladores.
- La interfaz todavía requiere accesibilidad real, vista móvil, flujos de backup/restore y validación financiera independiente.

## 4. Comandos obligatorios antes de cerrar el PR

~~~powershell
pnpm.cmd install --frozen-lockfile --ignore-scripts
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd audit --audit-level moderate
pnpm.cmd dev
~~~

Homologar también los pasos de [HOMOLOGACION_MANUAL.md](HOMOLOGACION_MANUAL.md) y [HOMOLOGACION_I18N.md](HOMOLOGACION_I18N.md). Mantener la `main` intacta y no disparar GitHub Actions sin autorización expresa.
