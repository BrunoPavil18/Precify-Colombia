# Homologación manual multilingüe

**Pendiente de validación en navegador tras los cambios de i18n.** Nunca confundir test escrito con test ejecutado.

| Caso | ES | PT | EN |
|---|---|---|---|
| Navegación, títulos, encabezado, estado vacío | ☐ | ☐ | ☐ |
| Formularios de producto, etiquetas, ayudas y validaciones | ☐ | ☐ | ☐ |
| Cálculo en COP y resultados financieros iguales | ☐ | ☐ | ☐ |
| Crear / editar / descartar cambios sin pérdida de datos | ☐ | ☐ | ☐ |
| Escenarios y copia sin alterar producto original | ☐ | ☐ | ☐ |
| Metas, punto de equilibrio, informes y fechas | ☐ | ☐ | ☐ |
| Avisos de IVA/COD y premisas financieras | ☐ | ☐ | ☐ |
| Dialogos: eliminación, restauración y confirmación | ☐ | ☐ | ☐ |
| CSV traducido, backup JSON compatible | ☐ | ☐ | ☐ |
| Selección persistente después de F5 | ☐ | ☐ | ☐ |
| Navegación de teclado, `html.lang`, móvil | ☐ | ☐ | ☐ |

### Seguridad y datos

La etiqueta de idioma se guarda como preferencia separada y no modifica el contrato financiero. Exporta un backup antes de probar operaciones destructivas. Prueba cancelar cada confirmación de borrado/restauración. No uses datos reales.

### Repetir validaciones automáticas localmente

~~~powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd audit --audit-level moderate
pnpm.cmd dev
~~~

La suite añade 8 tests estáticos de cobertura, mensajes, formatos y persistencia. No se ejecutó GitHub Actions.
