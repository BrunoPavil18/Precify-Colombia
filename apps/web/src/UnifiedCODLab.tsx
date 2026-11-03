import {useMemo,useState} from "react";
import {
 analyze,simulateCOD,suggestCODBreakEvenPrice,simulateCPASensitivity,
 parseDecimal,fromCents,type Product,type CODSimulationInput
} from "@precify-financy/core";
import {useTranslator} from "./i18n";

const baseInputs={
 createdOrders:"100",shippedPercent:"100",deliveredPercentOfShipped:"70",
 paidPercentOfDelivered:"90",failedAttemptCost:"15000.00",
 returnShippingCost:"10000.00",advertisingPerCreatedOrder:"15000.00",
 extraCODFeePerPaidOrder:"0",lossReservePerFailedOrder:"0"
};
const controls=[
 ["createdOrders","Pedidos creados"],
 ["shippedPercent","Envíos sobre pedidos (%)"],
 ["deliveredPercentOfShipped","Entregados sobre enviados (%)"],
 ["paidPercentOfDelivered","Pagados sobre entregados (%)"],
 ["failedAttemptCost","Intento de entrega fallido (COP)"],
 ["returnShippingCost","Logística inversa por fracaso (COP)"],
 ["advertisingPerCreatedOrder","Costo de publicidad por pedido creado (COP)"],
 ["extraCODFeePerPaidOrder","Comisión COD adicional por pedido pago (COP)"],
 ["lossReservePerFailedOrder","Reserva de pérdidas por pedido no pagado (COP)"]
] as const;
export function UnifiedCODLab({products}:{products:Product[]}){
 const t=useTranslator();
 const [selected,setSelected]=useState("");
 const [inputs,setInputs]=useState(baseInputs);
 const product=products.find(p=>p.id===selected)??products[0];
 const simulation=useMemo(()=>{
  if(!product)return {error:t("Guarda un producto para usar la precificación COD.")};
  try{
   const config:CODSimulationInput={...inputs,product:product.input};
   const result=simulateCOD(config);
   const breakEven=suggestCODBreakEvenPrice(config);
   const breakdown=analyze(product.input);
   const positive=breakdown.contribution.startsWith("-")
    ?-parseDecimal(breakdown.contribution.slice(1)):parseDecimal(breakdown.contribution);
   const perPaid=positive+parseDecimal(product.input.advertising)
    +parseDecimal(product.input.codReserve)+parseDecimal(product.input.returnsReserve)
    -parseDecimal(inputs.extraCODFeePerPaidOrder);
   if(perPaid<0n)return {result,breakEven,error:t("La contribución unitaria sin publicidad es negativa; revisa los costos.")};
   const cpa=[...new Set(["0","5000","10000","15000","20000","30000",inputs.advertisingPerCreatedOrder])];
   const rates=[...new Set(["30","40","50","60","70","80","90","100",inputs.deliveredPercentOfShipped])];
   const matrix=simulateCPASensitivity({
    currency:"COP",
    createdOrders:inputs.createdOrders,shippedPercent:inputs.shippedPercent,
    deliveredPercentOfShipped:inputs.deliveredPercentOfShipped,
    paidPercentOfDelivered:inputs.paidPercentOfDelivered,
    contributionPerPaid:fromCents(perPaid),
    failedDeliveryCost:inputs.failedAttemptCost,
    reverseShippingPerUnpaid:inputs.returnShippingCost,
    lossReservePerFailedOrder:inputs.lossReservePerFailedOrder,
    otherFixedCosts:"0"
   },rates.slice(0,20),cpa.slice(0,20));
   return {result,breakEven,matrix};
  }catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },[product,inputs,t]);
 const fields=([
  ["createdOrders","Pedidos creados"],
  ["shippedOrders","Pedidos enviados"],
  ["deliveredOrders","Entregados"],
  ["paidOrders","Pedidos pagados"],
  ["cancelledBeforeShipping","Cancelados antes de envío"],
  ["deliveryFailures","Entregas fallidas"],
  ["deliveredUnpaid","Entregados no pagados"],
  ["expectedProfit","Ganancia estimada de la cohorte"],
  ["profitPerCreatedOrder","Ganancia por pedido creado"],
  ["profitPerShippedOrder","Ganancia por pedido enviado"],
  ["profitPerPaidOrder","Ganancia por pedido pagado"]
 ] as const);
 return <section className="main-card">
  <span className="eyebrow">{t("PRECIFICACIÓN COD INTEGRADA")}</span>
  <h3>{t("Un precio, un embudo y una matriz de sensibilidad")}</h3>
  <p className="muted">{t("El análisis utiliza la ficha de producto guardada y tasas condicionales configurables. No usa pedidos pagados ficticios ni tarifas logísticas automáticas.")}</p>
  <label className="field"><span>{t("Producto guardado")}</span>
   <select value={product?.id??""} onChange={e=>setSelected(e.target.value)}>
    {products.length===0?<option value="">{t("Primero guarda un producto")}</option>:products.map(p=><option key={p.id} value={p.id}>{p.input.name}</option>)}
   </select>
  </label>
  <div className="advanced-grid">
   {controls.map(([key,label])=><label key={key} className="field">
    <span>{t(label)}</span>
    <input type="text" inputMode="decimal" value={inputs[key]}
     onChange={e=>setInputs(v=>({...v,[key]:e.target.value}))}
     onBlur={()=>{if(!inputs[key].trim())setInputs(v=>({...v,[key]:"0"}));}}/>
   </label>)}
  </div>
  {"error" in simulation&&simulation.error&&<p role="alert">{t(simulation.error)}</p>}
  {"result" in simulation&&simulation.result&&<div className="advanced-results">
   <h3>{t("Resultado COD con pérdidas por etapa")}</h3>
   <dl>{fields.map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{simulation.result?.[key]??"—"}{key.toLowerCase().includes("profit")||key==="expectedProfit"?" COP":""}</dd></div>)}</dl>
   <div className="list-row"><strong>{t("Precio mínimo de equilibrio del escenario")}</strong>
    <strong>{simulation.breakEven?.price===null?"—":"COP "+simulation.breakEven?.price}</strong></div>
   <p className="muted">{t("No garantiza conversión ni demanda; supone tasas de envío, entrega y pago constantes al cambiar el precio.")}</p>
   <h3>{t("Matriz de sensibilidad: tasa de entrega × CPA")}</h3>
   {"matrix" in simulation&&simulation.matrix&&<div className="table-scroll"><table>
    <thead><tr><th>{t("Entrega (%)")}</th>{simulation.matrix[0]?.results.map(c=><th key={c.cpa}>CPA {c.cpa}</th>)}</tr></thead>
    <tbody>{simulation.matrix.map(row=><tr key={row.deliveryPercent}><th>{row.deliveryPercent}%</th>
     {row.results.map(cell=><td key={cell.cpa} className={cell.feasible?"":"red"}>{cell.profit}</td>)}</tr>)}</tbody>
   </table></div>}
  </div>}
 </section>;
}
