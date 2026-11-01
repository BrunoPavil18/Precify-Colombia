import {useMemo} from "react";
import {analyze,type Product,type Workspace} from "@precify-colombia/core";
import {useTranslator} from "./i18n";
import {UIIcon} from "./UIIcon";

type Item={p:Product;result:ReturnType<typeof analyze>|null;error:string|null};
type Target="calculadora"|"productos"|"escenarios"|"metas"|"informes"|"operaciones"|"cod"|"marketing"|"cpa"|"conectado";
export function OverviewDashboard({workspace,ranked,format,onNavigate,date}:{
 workspace:Workspace;ranked:Item[];format:(value:string|null|undefined)=>string;
 onNavigate:(page:Target)=>void;date:(value:string)=>string
}){
 const t=useTranslator();
 const stats=useMemo(()=>{
  const valid=ranked.filter((row):row is Item&{result:ReturnType<typeof analyze>}=>!!row.result);
  return {valid:valid.length,unviable:valid.filter(row=>!row.result.feasible).length,leader:valid.find(row=>row.result.feasible)??valid[0]??null};
 },[ranked]);
 const actions=[
  {page:"calculadora" as const,icon:"calculator",title:"Calcular precio",desc:"Costos, descuentos y margen"},
  {page:"cod" as const,icon:"cod",title:"Simular riesgo COD",desc:"Envíos, rechazos y pagos"},
  {page:"marketing" as const,icon:"marketing",title:"Analizar marketing y CAC",desc:"CPA, ROAS y límites"},
  {page:"operaciones" as const,icon:"orders",title:"Ver operaciones",desc:"Pedidos y rentabilidad"}
 ];
 return <div className="overview-page">
  <div className="overview-welcome">
   <div><div className="eyebrow">{t("TU CENTRO FINANCIERO")}</div>
    <h2>{t("Tu negocio, en perspectiva.")}</h2>
    <p>{t("Una vista de tu información local. No se inventan ventas ni resultados.")}</p>
   </div>
   <button className="primary" onClick={()=>onNavigate("calculadora")}><UIIcon name="calculator" size={17}/>{t("Nuevo cálculo")}</button>
  </div>
  <div className="overview-stats">
   <div className="overview-stat"><span>{t("Productos guardados")}</span><strong>{workspace.products.length}</strong><small>{t("Catálogo en este dispositivo")}</small><UIIcon name="products" size={22}/></div>
   <div className="overview-stat"><span>{t("Escenarios")}</span><strong>{workspace.scenarios.length}</strong><small>{t("Simulaciones vinculadas")}</small><UIIcon name="scenarios" size={22}/></div>
   <div className="overview-stat"><span>{t("Análisis guardados")}</span><strong>{workspace.advancedSimulations.length}</strong><small>{t("COD, CAC y otras simulaciones")}</small><UIIcon name="activity" size={22}/></div>
   <div className="overview-stat"><span>{t("Productos a revisar")}</span><strong className={stats.unviable?"negative-number":""}>{stats.unviable}</strong><small>{t("Contribución no viable entre los calculables")}</small><UIIcon name="shield" size={22}/></div>
  </div>
  {workspace.products.length===0?<section className="overview-onboarding main-card">
   <div className="onboarding-icon"><UIIcon name="spark" size={30}/></div>
   <div><span className="eyebrow">{t("PRIMEROS PASOS")}</span><h3>{t("Empieza con tu primer producto")}</h3>
   <p>{t("Registra sus costos, descubre el precio mínimo y después compara escenarios, COD y CAC. No necesitas conectar una tienda ni crear una cuenta.")}</p>
   <div className="actions"><button className="primary" onClick={()=>onNavigate("calculadora")}>{t("Crear primer producto")} <UIIcon name="arrow" size={17}/></button>
    <button className="secondary" onClick={()=>onNavigate("cod")}>{t("Explorar simulador COD")}</button></div></div>
  </section>:<div className="overview-insights">
   <section className="main-card overview-leader"><div className="section-head"><div><span className="eyebrow">{t("DATOS DECLARADOS / SIMULADOS")}</span><h3>{t("Referencia de contribución unitaria")}</h3></div><UIIcon name="activity" size={21}/></div>
    {stats.leader?<><div className="overview-best-name">{stats.leader.p.input.name}</div>
     <strong className="overview-best-value">{format(stats.leader.result.contribution)}</strong>
     <p className="muted">{t("Por unidad, según los costos informados. No es lucro real observado.")}</p>
     <div className="overview-inline-stats"><span>{t("Margen estimado")}: <strong>{stats.leader.result.marginPercent??"—"}%</strong></span><span>{t("Precio declarado")}: <strong>{format(stats.leader.p.input.currentPrice)}</strong></span></div>
     <button className="secondary" onClick={()=>onNavigate("informes")}>{t("Comparar productos")} <UIIcon name="arrow" size={16}/></button></>:<p className="muted">{t("No hay productos con valores válidos para calcular.")}</p>}
   </section>
   <section className="main-card overview-recent"><div className="section-head"><div><span className="eyebrow">{t("ACTIVIDAD LOCAL")}</span><h3>{t("Últimos cambios")}</h3></div><UIIcon name="activity" size={20}/></div>
   {workspace.history.length===0?<p className="muted">{t("No hay cambios registrados todavía.")}</p>:
    <div className="overview-timeline">{workspace.history.slice(-4).reverse().map(h=><div key={h.id}><span className="timeline-dot"/><div><strong>{h.snapshot.name}</strong><small>{t(h.action)} · {date(h.at)}</small></div></div>)}</div>}
   <button className="secondary" onClick={()=>onNavigate("informes")}>{t("Ver informes e histórico")} <UIIcon name="arrow" size={16}/></button></section>
  </div>}
  <section className="overview-shortcuts"><div className="section-head"><div><span className="eyebrow">{t("ACCESOS DIRECTOS")}</span><h3>{t("¿Qué quieres analizar?")}</h3></div></div>
   <div className="overview-action-grid">{actions.map(a=><button className="overview-action" key={a.page} onClick={()=>onNavigate(a.page)}><span className="overview-action-icon"><UIIcon name={a.icon} size={22}/></span><span><strong>{t(a.title)}</strong><small>{t(a.desc)}</small></span><UIIcon name="arrow" size={17}/></button>)}</div>
  </section>
  <div className="overview-footnote"><UIIcon name="shield" size={16}/><span>{t("El panel solo resume los datos guardados localmente. Conectar fuentes es siempre opcional.")}</span></div>
 </div>;
}
