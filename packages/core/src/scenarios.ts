import { analyze, suggestPrice, type PriceInput } from "./pricing.js";
export type Scenario = { id:string; name:string; note:string; values:PriceInput };
export function compareScenarios(rows:Scenario[]) {
  return rows.map(s=>({id:s.id,name:s.name,note:s.note,price:suggestPrice(s.values).price,result:analyze(s.values)}));
}
export function defaultScenarios(input:PriceInput):Scenario[] {
 return [
  {id:"optimista",name:"Optimista",note:"Edite costos para reflejar condiciones favorables.",values:{...input}},
  {id:"esperado",name:"Esperado",note:"Hipótesis de operación normal.",values:{...input}},
  {id:"conservador",name:"Conservador",note:"Ajuste reservas y costos para ensayar riesgo.",values:{...input}}
 ];
}
