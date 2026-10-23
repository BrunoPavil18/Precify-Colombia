# Seguridad — Precify Colombia

**Última actualización:** 23/10/2026. La release v1.0.0 está publicada. La branch de v2.0.0 se encuentra en desarrollo y **no está homologada**.

## Modelo de datos

No se requiere backend, cuenta, geolocalización ni servicio comercial externo. Productos, escenarios y preferencias permanecen en `localStorage` vinculado al origen/perfil del navegador; otros scripts con acceso al mismo origen pueden leer esos datos. No guarde secretos, información de clientes ni credenciales allí. Haga backups periódicos fuera del navegador. El uso de `localStorage` no exime obligaciones de protección de datos.

## Controles

- Dinero canónico en COP con centavos BigInt.
- Validación de productos y límites de tamaño/cantidad en backups JSON.
- Los CSV neutralizan fórmulas inicialmente peligrosas.
- La nueva protección de concurrencia detecta revisiones externas y bloquea mutaciones de la pestaña desactualizada; no constituye sincronización multiusuario transaccional.
- PWA experimental almacena únicamente shell HTML, archivos estáticos y recursos públicos. Nunca responder con datos financieros ni llamadas API cacheadas.
- No introducir dependencia, código ejecutable desconocido, credenciales o scripts de instalación no auditados.

## Reportar fallos

Evite divulgar exploits activos y datos sensibles en issues públicos. Utilice reporte privado de vulnerabilidades en GitHub si está habilitado, o un contacto privado del mantenedor, indicando versión afectada, impacto y reproducción segura.

## Pendencias obligatorias antes de v2

Revisión de dependencias/lockfile, lint independiente real, build/tests locales y E2E, multi-tab concurrente, backup malformado, escape de texto, PWA offline/actualización, CSP y headers de hosting. La ausencia de alertas en un scanner no prueba seguridad absoluta.
