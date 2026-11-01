/** Defensive, offline CSV import for order events and ad summaries.
 * Data are locally validated before any caller chooses to persist them.
 */
import {FinancialInputError} from "./money.js";
import {currencyDigits} from "./fx.js";
import {validateAdCampaign,validateOrderEvent,type AdCampaign,type OrderEvent} from "./operations.js";

export function parseCSV(text:string):{headers:string[];rows:Record<string,string>[]} {
 if(typeof text!=="string"||text.length>2_000_000)throw new FinancialInputError("Archivo CSV demasiado grande (máximo 2 MB).");
 const input=text.replace(/^\uFEFF/,"");
 const table:string[][]=[];let line:string[]=[],cell="",quoted=false,closeQuote=false;
 for(let i=0;i<input.length;i++){
  const c=input[i]!;
  if(quoted){
   if(c==='"'&&input[i+1]==='"'){cell+='"';i++;}
   else if(c==='"'){quoted=false;closeQuote=true;}
   else cell+=c;
  }else if(c==='"'){
   if(cell!==""||closeQuote)throw new FinancialInputError("Comillas CSV inválidas.");
   quoted=true;
  }else if(c===","){
   line.push(cell);cell="";closeQuote=false;
  }else if(c==="\n"||c==="\r"){
   if(c==="\r"&&input[i+1]==="\n")i++;
   line.push(cell);cell="";closeQuote=false;
   if(line.some(v=>v!==""))table.push(line);
   line=[];
   if(table.length>10001)throw new FinancialInputError("Demasiadas filas CSV.");
  }else{
   if(closeQuote&&!/\s/.test(c))throw new FinancialInputError("Texto inválido después de comillas CSV.");
   if(closeQuote&&/\s/.test(c))continue;
   cell+=c;
  }
  if(cell.length>10000)throw new FinancialInputError("Campo CSV demasiado largo.");
 }
 if(quoted)throw new FinancialInputError("Comillas CSV sin cerrar.");
 line.push(cell);
 if(line.some(v=>v!==""))table.push(line);
 if(!table.length)throw new FinancialInputError("CSV vacío.");
 const headers=table.shift()!.map(x=>x.trim().replace(/^\uFEFF/,""));
 if(!headers.length||headers.some(x=>!x||x.length>100)||new Set(headers).size!==headers.length)
  throw new FinancialInputError("Encabezados CSV inválidos o duplicados.");
 const rows=table.map(row=>{
  if(row.length!==headers.length)throw new FinancialInputError("Fila CSV con número de columnas inválido.");
  const record:Record<string,string>={};
  headers.forEach((h,i)=>{record[h]=row[i]!;});
  return record;
 });
 return {headers,rows};
}
const required=["id","orderId","status","occurredAt"] as const;
export type OrderCSVMapping=Partial<Record<keyof OrderEvent,string>>;
export const ORDER_CSV_FIELDS=[
 "id","orderId","status","occurredAt","source","campaignId","currency",
 "grossRevenue","productCost","shippingCost","reverseShippingCost",
 "advertisingCost","otherCost","refundAmount"
] as const;
export function importOrdersCSV(csv:string,mapping:OrderCSVMapping={}):OrderEvent[]{
 const {headers,rows}=parseCSV(csv);
 const col=(field:keyof OrderEvent):string=>{
  const wanted=mapping[field]??field;
  if(!headers.includes(wanted)&&required.includes(field as (typeof required)[number]))
   throw new FinancialInputError("Columna CSV obligatoria ausente: "+field);
  return wanted;
 };
 for(const field of required)col(field);
 if(rows.length>10000)throw new FinancialInputError("Importación excede 10000 eventos.");
 const get=(row:Record<string,string>,field:keyof OrderEvent,defaultValue="")=>row[col(field)]??defaultValue;
 return rows.map(row=>{
  const currency=get(row,"currency","COP");
  const zero=currencyDigits(currency)===0?"0":currencyDigits(currency)===3?"0.000":"0.00";
  const event:OrderEvent={
   id:get(row,"id"),orderId:get(row,"orderId"),status:get(row,"status") as OrderEvent["status"],
   occurredAt:get(row,"occurredAt"),source:get(row,"source","csv"),
   campaignId:get(row,"campaignId")||null,currency,
   grossRevenue:get(row,"grossRevenue",zero),productCost:get(row,"productCost",zero),
   shippingCost:get(row,"shippingCost",zero),reverseShippingCost:get(row,"reverseShippingCost",zero),
   advertisingCost:get(row,"advertisingCost",zero),otherCost:get(row,"otherCost",zero),
   refundAmount:get(row,"refundAmount",zero)
  };
  return validateOrderEvent(event);
 });
}
export function importCampaignsCSV(csv:string,columns:Partial<Record<keyof AdCampaign,string>>={}):AdCampaign[]{
 const {headers,rows}=parseCSV(csv);
 const get=(row:Record<string,string>,field:keyof AdCampaign,defaultValue="")=>row[columns[field]??field]??defaultValue;
 for(const name of ["id","spend","observedFrom","observedTo"] as const)
  if(!headers.includes(columns[name]??name))throw new FinancialInputError("Columna CSV obligatoria ausente: "+name);
 return rows.map(row=>{const currency=get(row,"currency","COP");const zero=currencyDigits(currency)===0?"0":currencyDigits(currency)===3?"0.000":"0.00";
  return validateAdCampaign({
  id:get(row,"id"),source:get(row,"source","csv"),currency,
  spend:get(row,"spend"),impressions:get(row,"impressions","0"),clicks:get(row,"clicks","0"),
  attributedConversions:get(row,"attributedConversions","0"),
  attributedRevenue:get(row,"attributedRevenue",zero),
  observedFrom:get(row,"observedFrom"),observedTo:get(row,"observedTo")
 });});
}
export function neutralizeCsvCell(value:string):string {
 const content=String(value);
 const sanitized=/^[\s]*[=+\-@\t\r]/.test(content)?"'"+content:content;
 return '"'+sanitized.replace(/"/g,'""')+'"';
}
export function exportOperationsCSV(rows:OrderEvent[]):string {
 const fields=ORDER_CSV_FIELDS;
 const csv=[fields.join(",")];
 for(const r of rows){validateOrderEvent(r);csv.push(fields.map(f=>neutralizeCsvCell(String(r[f]??""))).join(","));}
 return "\uFEFF"+csv.join("\r\n");
}
