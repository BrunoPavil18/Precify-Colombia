export const dictionaries = {
 "es-CO": {
  title:"Precify Colombia", subtitle:"Precios inteligentes, decisiones claras",
  calculator:"Calculadora",products:"Productos",scenarios:"Escenarios",
  goals:"Metas",reports:"Informes",data:"Datos y privacidad",
  save:"Guardar producto", apply:"Aplicar", delete:"Eliminar", cancel:"Cancelar",
  backup:"Descargar copia de seguridad",import:"Restaurar copia",clear:"Borrar datos",
  warning:"Resultados orientativos. Consulta a un contador para el tratamiento tributario."
 },
 "pt-BR": {
  title:"Precify Colombia",subtitle:"Preços inteligentes, decisões claras",
  calculator:"Calculadora",products:"Produtos",scenarios:"Cenários",
  goals:"Metas",reports:"Relatórios",data:"Dados e privacidade",
  save:"Salvar produto",apply:"Aplicar",delete:"Excluir",cancel:"Cancelar",
  backup:"Baixar backup",import:"Restaurar backup",clear:"Apagar dados",
  warning:"Resultados ilustrativos. Consulte um contador sobre tributos."
 },
 "en": {
  title:"Precify Colombia",subtitle:"Smart prices, clear decisions",
  calculator:"Calculator",products:"Products",scenarios:"Scenarios",
  goals:"Goals",reports:"Reports",data:"Data & privacy",
  save:"Save product",apply:"Apply",delete:"Delete",cancel:"Cancel",
  backup:"Download backup",import:"Restore backup",clear:"Clear data",
  warning:"Estimates only. Consult a professional about tax treatment."
 }
} as const;
export type Locale=keyof typeof dictionaries;
