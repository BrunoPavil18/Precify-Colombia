import {useMemo,useState} from "react";
import {simulateCOD,simulateCampaign,pricePerMeasure,consumerPricePreview,simulatePortfolio,
 type Product,type Workspace,type AdvancedSimulationRecord,type CODSimulationInput,type CampaignInput,type PUMUnit} from "@precify-colombia/core";
import {useTranslator} from "./i18n";

const controls=(type:"cod"|"campaign")=>type==="cod"
 ?[{k:"createdOrders",label:"Pedidos creados"},{k:"shippedPercent",label:"Pedidos enviados (%)"},{k:"deliveredPercentOfShipped",label:"Entregas completadas (%)"},{k:"paidPercentOfDelivered",label:"Entregas pagadas (%)"},{k:"failedAttemptCost",label:"Costo de intento fallido (COP)"},{k:"returnShippingCost",label:"Logística inversa (COP)"},{k:"advertisingPerCreatedOrder",label:"Publicidad por pedido creado (COP)"},{k:"extraCODFeePerPaidOrder",label:"Comisión COD adicional por pago (COP)"},{k:"lossReservePerFailedOrder",label:"Reserva por pedido fallido (COP)"}]
 :[{k:"impressions",label:"Visitas o impresiones"},{k:"conversionPercent",label:"Conversión (%)"},{k:"advertisingSpend",label:"Inversión publicitaria (COP)"},{k:"attributedRevenue",label:"Ingresos atribuidos (COP)"},{k:"refundPercent",label:"Devoluciones (%)"}];
const initialCOD={createdOrders:"100",shippedPercent:"100",deliveredPercentOfShipped:"100",paidPercentOfDelivered:"100",failedAttemptCost:"0",returnShippingCost:"0",advertisingPerCreatedOrder:"0",extraCODFeePerPaidOrder:"0",lossReservePerFailedOrder:"0"};
const initialCampaign={impressions:"1000",conversionPercent:"2.00",advertisingSpend:"0",attributedRevenue:"0",refundPercent:"0"};
type Pane="cod"|"campaign"|"pum"|"consumer"|"portfolio";
const panes:Pane[]=["cod","campaign","pum","consumer","portfolio"];
const currencyKeys=new Set(["expectedProfit","profitPerCreatedOrder","profitPerPaidOrder","cac","maxCAC","attributedRevenueAfterRefunds","projectedProfit","pricePerUnit","consumerTotal","netProduct","tax","shipping","otherCharges","totalContribution","monthlyProfit","weightedContribution"]);
const countKeys=new Set(["createdOrders","shippedOrders","deliveredOrders","paidOrders","failedOrders","conversions","totalUnits","breakEvenUnits"]);
function displayAdvancedResult(key:string,value:string|number):string{
 const raw=String(value);
 if(currencyKeys.has(key)){
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(raw))return raw;
  const negative=raw.startsWith("-");
  const [whole,fraction=""]=raw.replace("-","").split(".");
  const grouped=whole!.replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return (negative?"−":"")+"COP "+grouped+(fraction&&!/^0+$/.test(fraction)?","+fraction.padEnd(2,"0"):"");
 }
 if(countKeys.has(key))return raw;
 if(key==="netMargin")return raw.replace(".",",")+"%";
 if(key==="roas"||key==="breakEvenRoas")return raw.replace(".",",")+"×";
 return raw;
}

export function AdvancedLab({workspace,onSave,onDelete,onDirty}:{
 workspace:Workspace;onSave:(record:AdvancedSimulationRecord)=>boolean;
 onDelete:(id:string)=>void;onDirty:(dirty:boolean)=>void
}){
 const t=useTranslator();
 const [pane,setPane]=useState<Pane>("cod");
 const [selected,setSelected]=useState("");
 const [cod,setCOD]=useState(initialCOD);
 const [campaign,setCampaign]=useState(initialCampaign);
 const [measure,setMeasure]=useState({price:"10000.00",quantity:"500.00",unit:"g" as PUMUnit});
 const [preview,setPreview]=useState({productPrice:"99000.00",discount:"0",additionalFees:"0",shippingCharged:"0",taxMode:"included" as "included"|"additional"|"none",taxPercent:"0"});
 const [fixed,setFixed]=useState("0");
 const [quantities,setQuantities]=useState<Record<string,string>>({});
 const product:Product|undefined=workspace.products.find(p=>p.id===selected)??workspace.products[0];
 const outcome=useMemo(()=>{
  try{
   if(pane==="cod"){if(!product)return {error:"Primero guarda un producto"};return {data:simulateCOD({...cod,product:product.input} as CODSimulationInput)};}
   if(pane==="campaign"){if(!product)return {error:"Primero guarda un producto"};return {data:simulateCampaign({...campaign,product:product.input} as CampaignInput)};}
   if(pane==="pum")return {data:pricePerMeasure(measure.price,measure.quantity,measure.unit)};
   if(pane==="consumer")return {data:consumerPricePreview(preview)};
   if(workspace.products.length===0)return {error:"Primero guarda un producto"};
   return {data:simulatePortfolio(workspace.products.map(p=>({product:p.input,monthlyUnits:quantities[p.id]??"0"})),fixed)};
  }catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },[pane,product,cod,campaign,measure,preview,workspace.products,quantities,fixed]);
 function snapshot(){
  const inputs:Record<string,string>=pane==="cod"?{...cod}:pane==="campaign"?{...campaign}
   :pane==="pum"?{...measure}
   :pane==="consumer"?{...preview}
   :{monthlyFixed:fixed,quantities:JSON.stringify(quantities)};
  const record:AdvancedSimulationRecord={
   id:globalThis.crypto?.randomUUID?.().replace(/-/g,"").slice(0,22)??("a"+Date.now().toString(36)),
   kind:pane,productId:(pane==="cod"||pane==="campaign")?product?.id??null:null,
   at:new Date().toISOString(),label:pane+" · "+new Date().toLocaleDateString(),inputs
  };
  if(onSave(record))onDirty(false);
 }
 function load(record:AdvancedSimulationRecord){
  setPane(record.kind);
  if(record.productId)setSelected(record.productId);
  const v=record.inputs;
  if(record.kind==="cod")setCOD({...initialCOD,...v});
  if(record.kind==="campaign")setCampaign({...initialCampaign,...v});
  if(record.kind==="pum")setMeasure({price:v.price??"0",quantity:v.quantity??"1",unit:(v.unit??"unit") as PUMUnit});
  if(record.kind==="consumer")setPreview({productPrice:v.productPrice??"0",discount:v.discount??"0",additionalFees:v.additionalFees??"0",shippingCharged:v.shippingCharged??"0",taxPercent:v.taxPercent??"0",taxMode:(v.taxMode??"none") as typeof preview.taxMode});
  if(record.kind==="portfolio"){
   setFixed(v.monthlyFixed??"0");
   try{const q=JSON.parse(v.quantities??"{}") as Record<string,string>;setQuantities(q);}
   catch{setQuantities({});}
  }
  onDirty(false);
 }
 function field(label:string,value:string,onChange:(value:string)=>void){
  return <label className="field" key={label}><span>{t(label)}</span><input type="text" inputMode="decimal" value={value} onChange={e=>{onChange(e.target.value);onDirty(true);}}/></label>;
 }
 return <section className="main-card advanced-lab">
  <span className="eyebrow">{t("SIMULADORES FINANCIEROS AVANZADOS")}</span>
  <h2>{t("Decisiones con supuestos explícitos")}</h2>
  <p className="muted">{t("Todos los valores son simulaciones ingresadas por el usuario, no tarifas oficiales. Los borradores de esta sección no modifican productos guardados.")}</p>
  <div className="advanced-tabs" role="group" aria-label={t("Tipo de simulación")}>
   {panes.map(p=><button key={p} className={p===pane?"primary":"secondary"} aria-pressed={p===pane} onClick={()=>{setPane(p);onDirty(true);}}>{t(({cod:"Riesgo COD",campaign:"Publicidad y CAC",pum:"Precio por unidad",consumer:"Precio al consumidor",portfolio:"Cartera multiproducto"} as Record<Pane,string>)[p])}</button>)}
  </div>
  {(pane==="cod"||pane==="campaign")&&<label className="field"><span>{t("Producto que deseas analizar")}</span><select value={product?.id??""} onChange={e=>{setSelected(e.target.value);onDirty(true);}}>
   {workspace.products.length===0?<option value="">{t("Primero guarda un producto")}</option>:workspace.products.map(p=><option key={p.id} value={p.id}>{p.input.name}</option>)}
  </select></label>}
  <div className="advanced-grid">
   {pane==="cod"&&controls("cod").map(x=>field(x.label,cod[x.k as keyof typeof cod],v=>setCOD(a=>({...a,[x.k]:v}))))}
   {pane==="campaign"&&controls("campaign").map(x=>field(x.label,campaign[x.k as keyof typeof campaign],v=>setCampaign(a=>({...a,[x.k]:v}))))}
   {pane==="pum"&&<>{field("Precio total (COP)",measure.price,v=>setMeasure(a=>({...a,price:v})))}
    {field("Cantidad de contenido",measure.quantity,v=>setMeasure(a=>({...a,quantity:v})))}
    <label className="field"><span>{t("Unidad de medida")}</span><select value={measure.unit} onChange={e=>{setMeasure(a=>({...a,unit:e.target.value as PUMUnit}));onDirty(true);}}>
    {(["g","kg","ml","l","cm","m","unit"] as const).map(u=><option key={u} value={u}>{u}</option>)}</select></label></>}
   {pane==="consumer"&&<>
    {(["productPrice","discount","additionalFees","shippingCharged","taxPercent"] as const).map((key,i)=>field(t(["Precio base (COP)","Descuento (COP)","Cargos adicionales (COP)","Frete (COP)","IVA configurado (%)"][i]!),preview[key],v=>setPreview(a=>({...a,[key]:v}))))}
    <label className="field"><span>{t("Tratamiento tributario ilustrativo")}</span><select value={preview.taxMode} onChange={e=>{setPreview(a=>({...a,taxMode:e.target.value as typeof preview.taxMode}));onDirty(true);}}>
     <option value="included">{t("Impuesto incluido")}</option><option value="additional">{t("Impuesto adicional")}</option><option value="none">{t("Sin impuesto")}</option>
    </select></label></>}
   {pane==="portfolio"&&<>{field("Gastos fijos únicos del negocio (COP)",fixed,setFixed)}
    {workspace.products.map(p=>field(t("Unidades mensuales de")+" "+p.input.name,quantities[p.id]??"0",v=>setQuantities(a=>({...a,[p.id]:v}))))}</>}
  </div>
  <div className="advanced-results" aria-live="polite">
    <h3>{t("Resultados orientativos")}</h3>
    {"error" in outcome?<p role="alert">{t(outcome.error??"")}</p>:
    <dl>{Object.entries(outcome.data??{}).filter(([k,v])=>typeof v==="string"||typeof v==="number").map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{displayAdvancedResult(key,value as string|number)}</dd></div>)}</dl>}
  </div>
  <div className="advanced-actions"><button className="primary" onClick={snapshot} disabled={!!("error" in outcome)}>{t("Guardar simulación")}</button></div>
  {workspace.advancedSimulations.some(record=>record.kind===pane)&&<section className="advanced-saved"><h3>{t("Simulaciones guardadas")}</h3>
   {workspace.advancedSimulations.filter(row=>row.kind===pane).slice().reverse().map(row=><div key={row.id} className="list-row"><button className="secondary" onClick={()=>load(row)}>{row.label}</button>
    <button className="danger" onClick={()=>onDelete(row.id)}>{t("Eliminar")}</button></div>)}
  </section>}
  <p className="muted">{t("Estas estimaciones no certifican cumplimiento tributario ni legal. Confirma tarifas, tratamiento de IVA y obligaciones de información con asesores locales.")}</p>
 </section>;
}
