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
