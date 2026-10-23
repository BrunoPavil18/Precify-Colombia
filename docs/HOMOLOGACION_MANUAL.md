# Homologación funcional local — escenarios y edición

**Estado:** cambios de usabilidad publicados en la branch de desarrollo, aún pendientes de ejecutar en el navegador del usuario. No reemplazar el estado de los tests automatizados anteriores por suposiciones.

## 1. Antes de actualizar

Descarga un backup desde Datos si ya tienes productos locales. **No borres localStorage.** El cambio de interfaz no requiere migración de datos.

## 2. Selección de producto y escenarios

1. Ve a Productos. Asegúrate de tener un producto guardado con un precio actual de COP 99.000 y costo de adquisición de COP 37.000.
2. Abre Escenarios directamente desde la navegación lateral, incluso después de F5.
3. En **Producto que deseas analizar**, selecciona Producto ejemplo (no la copia).
4. Presiona **Crear escenarios faltantes**. Deben aparecer **Optimista, Esperado y Conservador**.
5. Abre Optimista, cambia únicamente Costo de adquisición a COP 35.000 y observa la vista previa. Presiona Guardar escenario.
6. Abre Conservador, cambia ese costo a COP 40.000 y guarda.
7. Esperado debe conservar COP 37.000. El producto original también debe conservar COP 37.000.
8. Regresa a Productos, entra en Editar sobre el producto original y verifica que la simulación oficial no fue cambiada por los escenarios.
9. Presiona F5 y regresa a Escenarios. Las simulaciones guardadas deben continuar disponibles para ese producto.
10. Cambia el selector al producto duplicado. Debes ver solamente los escenarios asociados a la copia (ninguno, si no creaste escenarios para ella).

Con precio actual 99.000, gastos base empaquetado 2.000, envío 7.000, comisión fija 1.000, publicidad 3.000 y otras tarifas cero, las contribuciones esperadas son:

| Escenario | Costo adquisición | Contribución por venta |
| --- | ---: | ---: |
| Optimista | COP 35.000 | COP 51.000 |
| Esperado | COP 37.000 | COP 49.000 |
| Conservador | COP 40.000 | COP 46.000 |

No se inventan costos de proveedores. Estos valores son inputs de prueba.

## 3. Descartar cambios

1. En Productos > Editar, cambia el costo de adquisición y verifica que la simulación responda.
2. **Sin presionar Guardar producto**, selecciona Descartar cambios.
3. El costo debe volver exactamente al último valor guardado, incluso si el campo contiene un texto inválido pendiente de confirmación.
4. Repite en un escenario, usando Descartar cambios en la sección de edición del escenario.
5. Cambiar de escenario cuando existen ediciones pendientes debe solicitar confirmación antes de descartarlas. Cancelar la confirmación no debe mutar datos.

Este botón revierte **ediciones no guardadas**. No reemplaza restauración de backups, historial completo de versiones o reversión de cambios ya guardados.

## 4. Checagem local / verificación de versión

Después de actualizar la branch sin sobrescribir tu pnpm-lock.yaml local:

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd dev
```

Conteo de tests escrito en código: **25** (21 existentes + 2 tests de escenarios en core + 2 controles estáticos de UI). **No declarar 25/25 aprobados hasta recibir logs reales.**

No se creó ni se disparó workflow de GitHub Actions.

## 5. Estado técnico y siguientes verificaciones (última evidencia del propietario)

El propietario ejecutó exitosamente `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test` (**35/35**), `pnpm.cmd build` y `pnpm.cmd audit --audit-level moderate` (**sin avisos conocidos**). Los casos de usuario de este documento **no se consideran aprobados solo por esas pruebas automáticas**.

**Próxima revisión funcional:** crear los tres escenarios por producto, confirmar sus contribuciones calculadas, verificar la independencia respecto del producto guardado y F5. Después, verificar «Descartar cambios» en ES/PT/EN y que cambiar de idioma sin tocar el producto de ejemplo **no** muestre falsamente ediciones pendientes.

**Verificación de datos sin riesgo:** descargar copia JSON antes de probar restauración; probar primero importación de JSON corrupto (debe rechazarse sin mutación). Solo después probar una restauración válida, confirmando explícitamente. Evitar borrar datos de prueba hasta verificar el backup.

Mantener el PR en Draft hasta reunir evidencias funcionales, de accesibilidad y de restauración.

## 6. Evidencias funcionales de escenarios y validación de entradas (23/10/2026)

El propietario proporcionó capturas y confirmó manualmente lo siguiente:

- Escenarios del producto original guardados con contribuciones correctas: Optimista COP 51.000 (adquisición 35.000), Esperado COP 49.000 (adquisición 37.000), Conservador COP 46.000 (adquisición 40.000), con precio actual COP 99.000 y demás parámetros de ejemplo constantes.
- Los escenarios permanecen después de F5 y **no** cambian el producto original.
- «Descartar alterações» en portugués restaura correctamente la última versión guardada; F5 con cambios sin guardar recupera los valores anteriores.
- Descuento fijo COP 100.000 contra precio COP 99.000: la interfaz muestra correctamente un error de descuento superior al precio.
- Descuento fijo igual al precio COP 99.000: contribución negativa COP 50.000 y margen no disponible para venta neta cero.
- Descuento porcentual de 100 %: el sistema señala que no encuentra precio viable.
- Reserva COD por COP 1.000: contribución baja COP 49.000 → COP 48.000, con el resto fijo.
- Entrada es-CO COP 89.900,50: el cálculo conserva los centavos y presenta la contribución negativa esperada (COP -4.900,50 bajo los costos mostrados).

**Estado:** escenarios, persistencia, aislamiento y descarte **homologados manualmente** en las rutas ejercitadas. El usuario se detuvo antes de validar Metas y punto de equilibrio; estos permanecen pendientes.

### Prueba de Metas pendiente — instrucciones exactas

Los campos `monthlyFixed` y `monthlyUnits` también aparecen dentro del editor de Escenarios, pero el panel específico de punto de equilibrio está en **Metas**. Tras F5, el producto activo puede restablecerse como borrador aunque el catálogo persista. Por eso:

1. Abrir **Productos → Producto ejemplo → Editar**; NO seleccionar el editor de escenario.
2. Configurar precio de venta 99.000, adquisición 37.000, empaque 2.000, costo envío 7.000, comisión fija 1.000, publicidad 3.000, tarifas/IVA/descuentos/reservas cero. Confirmar contribución COP 49.000.
3. Abrir **Metas**. Configurar gastos fijos mensuales COP 490.000 y unidades 10. Esperado: **equilibrio 10, utilidad COP 0, margen neto 0,00%**.
4. Cambiar SOLO unidades a 15. Esperado: **equilibrio 10, utilidad COP 245.000, margen neto ≈16,50%**.
5. Verificar comportamiento de botones de guardado, validaciones de unidades y persistencia del producto si el usuario decide guardar.

No etiquetar esta última etapa como homologada sin resultado del usuario.
