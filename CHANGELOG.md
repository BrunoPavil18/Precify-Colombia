# Changelog

## [2.0.0] — en desarrollo (PR #2, NO publicada)

**Estado:** candidato incompleto, no validado por tests/build ejecutados.

- Añadidos indicadores explícitos de margen sobre precio neto del producto y sobre ingresos cobrados, markup comercial e indicador separado de markup de contribución.
- Contribución exactamente cero clasificada como no viable.
- Core experimental: COD probabilístico, publicidad/CAC/ROAS, PUM, precio público estimado y mezcla de productos.
- Primera interfaz de simuladores avanzados con diccionarios estáticos ES/PT/EN (no persiste todavía sus borradores).
- Primer control de revisión de almacenamiento para evitar sobrescrituras silenciosas entre pestañas.
- Parser de porcentajes localizado y PWA de recursos estáticos experimental.
- Preparación del core ESM tipado, pendiente de verificación con consumidor real.
- Investigación jurídica verificable en `docs/COLOMBIA_LEGAL_V2.md`.

**No completado:** persistencia de nuevos simuladores, suite E2E, lint independiente, actualización controlada PWA, auditoría de seguridad actualizada y homologación real. No lanzar v2 hasta finalizar.

## [1.0.0] — 2026-10-23 (publicada)

Primera release pública: motor COP, productos, escenarios, metas, perfiles, informes, CSV seguro, backup JSON local, ES/PT/EN, documentación abierta Apache-2.0. El mantenedor informó 38 tests locales aprobados y pruebas manuales de preservación y restauración de datos; esta evidencia es histórica y no implica aprobación de v2.
