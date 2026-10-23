# Política de seguridad

Estado: candidato 1.0.0. La web usa almacenamiento local sin cuentas ni backend; ello no garantiza seguridad absoluta.

No publique exploits o datos sensibles en issues. Utilice reporte privado de vulnerabilidades de GitHub si está disponible o un canal privado del mantenedor. Incluya impacto, versión y pasos mínimos.

Controles: cálculos en BigInt, validación estricta, backup versionado (máximo 2 MB), importación íntegra antes de reemplazo, JSON sin ejecución, React con texto escapado, CSV neutralizado contra fórmulas, sin secretos ni analytics deliberados.

**Pendientes:** lockfile y revisión de dependencias, scripts de instalación, build/test, pruebas E2E y de lector de pantalla, revisión CSP/cabeceras del host seleccionado. Un scanner sin alertas no demuestra ausencia absoluta de fallos.

No introduzca información personal, claves ni archivos confidenciales en campos del simulador.
