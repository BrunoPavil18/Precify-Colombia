import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
test("main accessibility landmarks and feedback exist",()=>{for(const token of ['<main','aria-live','<label','<nav','<button'])assert.ok(app.includes(token),token)});
test("no dangerous HTML or hidden remote services",()=>{for(const token of ['dangerouslySetInnerHTML','eval(','fetch(','XMLHttpRequest'])assert.ok(!app.includes(token),token)});

test("scenarios select persisted products and show independent draft results",()=>{
 for(const token of ["Producto que deseas analizar","scenariosForProduct","defaultScenarios(product.input)",
  "VISTA PREVIA DE ESTE ESCENARIO","Guardar escenario"])
  assert.ok(app.includes(token),token);
});
test("discard restores persisted draft and remounts localized inputs",()=>{
 for(const token of ["function restoreSavedDraft()","setDraft({...persistedDraft})",
  "setEditorRevision(n=>n+1)","Descartar cambios"])
  assert.ok(app.includes(token),token);
});


test("Goals selects a persisted product independently of the calculator and scenarios",()=>{
 for(const token of [
  'const goalProduct=workspace.products.find(p=>p.id===goalProductId)',
  '??workspace.products.find(p=>p.id===activeId)??workspace.products[0]',
  'async function selectGoalProduct(id:string)',
  'value={goalProduct.id} onChange={e=>selectGoalProduct(e.target.value)}',
  'const goalInput=useMemo(()=>goalProduct?{',
  'monthlyFixed:goalFixedOverride??goalProduct.input.monthlyFixed',
  'monthlyUnits:goalUnitsOverride??goalProduct.input.monthlyUnits',
  'goalResult.breakdown.breakEvenUnits'
 ])assert.ok(app.includes(token),token);
});
test("Goals discards unsaved simulations and saves only monthly product fields",()=>{
 for(const token of [
  'if(goalDirty&&!(await askConfirmation(t("Hay cambios sin guardar en Metas.',
  'function saveGoalChanges(){',
  'if(goalMoneyUnvalidated)',
  'monthlyFixed:goalInput.monthlyFixed,monthlyUnits:goalInput.monthlyUnits',
  'products:w.products.map(p=>p.id!==goalProduct.id?p:',
  'snapshot:{...goalProduct.input,monthlyFixed:goalInput.monthlyFixed',
  'function resetGoalDraft(){',
  'disabled={!goalDirty||goalMoneyUnvalidated||!!goalResult.error}',
  'setGoalProductId(selected?.id??"");resetGoalDraft()'
 ])assert.ok(app.includes(token),token);
 assert.ok(!app.slice(app.indexOf('function saveGoalChanges(){'),app.indexOf('function restoreSavedDraft(){')).includes('scenarios:w.scenarios'),
  "saving a goal must never edit scenarios");
});

test("advanced saved simulations are scoped to the active section",()=>{
 const lab=readFileSync(new URL("../src/AdvancedLab.tsx",import.meta.url),"utf8");
 assert.ok(lab.includes('workspace.advancedSimulations.some(record=>record.kind===pane)'));
 assert.ok(lab.includes('workspace.advancedSimulations.filter(row=>row.kind===pane).slice().reverse().map(row=>'));
 assert.ok(lab.includes('onDelete(row.id)'));
});

test("advanced financial outputs carry clear COP, percentage and ROAS units",()=>{
 const lab=readFileSync(new URL("../src/AdvancedLab.tsx",import.meta.url),"utf8");
 for(const key of ['expectedProfit','pricePerUnit','totalContribution','monthlyProfit','netMargin','breakEvenRoas'])
  assert.ok(lab.includes('"'+key+'"'),key);
 assert.ok(lab.includes('displayAdvancedResult(key,value as string|number)'));
 assert.ok(lab.includes('COP '));
});

test("native confirmation APIs are replaced by cancel-safe accessible dialogs",()=>{
 assert.ok(!app.includes("window.confirm("));
 for(const token of ['role="alertdialog"','aria-modal="true"','answerConfirmation(false)','event.key==="Escape"','data-confirm-button','askConfirmation('])assert.ok(app.includes(token),token);
});
test("saved workspace writes compare complete state before mutation",()=>{
 const storage=readFileSync(new URL("../src/storage.ts",import.meta.url),"utf8");
 assert.ok(storage.includes('JSON.stringify(current)!==JSON.stringify(validateWorkspace(expected))'));
 assert.ok(app.includes('persistWorkspace(next,wasStored.current?workspace:undefined)'));
});


test("advanced calculations do not expose internal reconciliation metadata in result cards",()=>{
 const lab=readFileSync(new URL("../src/AdvancedLab.tsx",import.meta.url),"utf8");
 assert.ok(lab.includes('k!=="revenueMethod"&&k!=="reconciliationNotice"'));
 assert.ok(lab.includes('role="note"'));
 assert.ok(lab.includes('t(String(outcome.data.reconciliationNotice))'));
});
test("empty advanced numeric fields normalize to zero on blur, not during typing",()=>{
 const lab=readFileSync(new URL("../src/AdvancedLab.tsx",import.meta.url),"utf8");
 assert.ok(lab.includes('onBlur={()=>{if(value.trim()===""){onChange("0");onDirty(true);}}}'));
 assert.ok(lab.includes('onChange(e.target.value);onDirty(true);'));
});


test("Windows site sync uses native SQLite in the same file as financial snapshots",()=>{
 const store=readFileSync(new URL("../src/website-sync-db.ts",import.meta.url),"utf8");
 for(const operation of ["site_sync_checkpoint","site_sync_apply","site_sync_rows","site_sync_purge"])
  assert.ok(store.includes(operation),operation);
 assert.ok(store.includes("supportsDesktopSQLite()"));
 const fs=readFileSync(new URL("../../desktop/src-tauri/src/native_snapshots.rs",import.meta.url),"utf8");
 const feed=readFileSync(new URL("../../desktop/src-tauri/src/site_sync.rs",import.meta.url),"utf8");
 const same='join("precify-financy-local.db")';
 assert.ok(fs.includes(same)&&feed.includes(same),"native records and feed must share one database file");
 const primary=readFileSync(new URL("../src/native-primary.ts",import.meta.url),"utf8");
 assert.ok(primary.includes('await bridge()("desktop_snapshot_put"'),"disk must commit before browser projection");
 assert.ok(primary.indexOf('await bridge()("desktop_snapshot_put"') < primary.indexOf('localStorage.setItem(storeKey(businessId,kind),data);',primary.indexOf('await bridge()("desktop_snapshot_put"')));
});

test("connection hub prioritizes v2 device enrollment over optional legacy accounts",()=>{
 const website=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(app.indexOf("<WebsiteSyncLab visible=")<app.indexOf("showAdvancedConnected&&<ConnectedLab/>"));
 assert.ok(app.includes("aria-expanded={showAdvancedConnected}"));
 assert.ok(website.includes("STORE_DEVICE_API_V2.md"));
 assert.ok(website.includes("sites.length===0"));
 for(const txt of ["Novas conexões: protocolo v2.","New connections use protocol v2.","Conexiones nuevas: protocolo v2."])
  assert.ok(website.includes(txt),txt);
 assert.ok(!website.includes("O token não é salvo em disco"));
});
test("operational cross-tab conflict watches the selected business-specific key",()=>{
 const ops=readFileSync(new URL("../src/OperationsLab.tsx",import.meta.url),"utf8");
 assert.ok(ops.includes("if(e.key===storageKey())"));
 assert.ok(!ops.includes("if(e.key===KEY)"));
});

test("connection hub uses defined SVG icons and browser storage feedback is accurate",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(app.includes('name="chevron" size={18}'));
 assert.ok(!app.includes('"chevron-up"')&&!app.includes('"chevron-down"'));
 assert.ok(app.includes('nativePrimary()?"Datos confirmados en SQLite local.":"Datos guardados en este navegador."'));
});
test("native SQLite startup fails visibly without auto-resetting user data",()=>{
 const main=readFileSync(new URL("../src/main.tsx",import.meta.url),"utf8");
 assert.ok(main.includes('await bootstrapNativePrimary()'));
 assert.ok(main.includes('catch(error)'));
 assert.ok(main.includes('role="alert"'));
 assert.ok(main.includes('Nenhum dado foi apagado ou substituído automaticamente.'));
});

test("optional cloud upload uses active business storage and requires explicit destination acknowledgment",()=>{
 const connected=readFileSync(new URL("../src/ConnectedLab.tsx",import.meta.url),"utf8");
 assert.ok(connected.includes("businessKey(LOCAL_OPERATIONS,getBusinessScope())"));
 assert.ok(!connected.includes("localStorage.getItem(LOCAL_OPERATIONS)"));
 assert.ok(connected.includes("if(!session||!selected||!confirmLocalUpload||!current)return"));
 assert.ok(connected.includes("disabled={busy||offline||!confirmLocalUpload||!current}"));
 assert.ok(connected.includes("setConfirmLocalUpload(false);setDashboard(null)"));
});

test("integration guide is in-app rather than relying on WebView2 external links",()=>{
 const src=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 for(const token of ['setGuideOpen(value=>!value)','aria-expanded={guideOpen}','aria-controls="precify-site-integration-guide"','role="region"','POST /precify/v2/activate','GET  /precify/v2/changes'])
  assert.ok(src.includes(token),token);
 assert.ok(src.includes("onFocus={e=>e.target.select()}"),"external-document fallback URL must be selectable");
});
test("device activation is recoverable if invitation is consumed before the local confirmation",()=>{
 const vault=readFileSync(new URL("../src/device-vault.ts",import.meta.url),"utf8");
 for(const token of ["readStoredDevice", "if(!previous)await saveDevice(businessId,siteId,identity)", "createDeviceConnector", "const recovered=await readDevice", "store.put({scope:scope(businessId,siteId),identity})"])
  assert.ok(vault.includes(token),token);
 assert.ok(vault.indexOf('if(!previous)await saveDevice(businessId,siteId,identity)')<vault.indexOf('await activateDevice({baseURL,code,identity})'));
});
test("connector effect registers asynchronous cleanup before device identity requests resolve",()=>{
 const src=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 assert.ok(src.includes("let stopped=false,handler:()=>void=()=>{},teardown:()=>void=()=>{}"));
 assert.ok(src.indexOf("tasks.push(()=>{stopped=true;teardown()")<src.indexOf("const init=async()=>"));
 assert.ok(src.includes("if(stopped)teardown();"));
 assert.ok(src.includes("const next=loadSites(businessId).map"));
});

test("disconnect waits for the whole in-flight sync including local report refresh",()=>{
 const src=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 assert.ok(src.includes("if(existing)return existing;"));
 assert.ok(src.includes("running.current.set(site.id,task)"));
 assert.ok(src.includes("if(running.current.get(site.id)===task)running.current.delete(site.id)"));
 assert.ok(src.includes("try{await running.current.get(site.id);}"));
});

test("store sync does not present operational-only events as verified financial profit",()=>{
 const lab=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 assert.match(lab,/financialCompleteness\?:string/);
 assert.match(lab,/financialCompleteness==="verified"/);
 assert.match(lab,/projectedNet:financialComplete\?result\.projectedNet:null/);
 assert.match(lab,/Resultado financeiro não disponível/);
});


test("published catalog is a separate, explicit local mirror and never overwrites manual products",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const store=readFileSync(new URL("../src/store-catalog.ts",import.meta.url),"utf8");
 const web=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 assert.ok(app.includes('page==="productos"&&<StoreCatalogPanel businessId='));
 assert.ok(app.includes('async function openStoreProductDraft(product:StoreProduct)'));
 assert.ok(app.includes("setStoreDraftPending(true)"));
 assert.ok(app.includes('{storeDraftPending?<div role="alert" className="error-box">'),"unknown store cost must suppress profit output");
 assert.ok(app.includes('const zero="0.00"'),"never import sample financial acquisition costs");
 assert.ok(app.includes('if(storeDraftPending)'),"draft cannot be saved before user cost review");
 assert.ok(store.includes('nativeWrite("catalog-mirror"'));
 assert.ok(web.includes("fetchPublishedCatalog(connector as ReturnType<typeof createDeviceConnector>)"));
});
test("store consent pauses without purging and deletion requires confirmation",()=>{
 const web=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 const start=web.indexOf("async function pause(site:Site)");
 const end=web.indexOf("async function add()",start);
 const pause=web.slice(start,end);
 assert.ok(start>0&&pause.includes("enabled:false"));
 assert.ok(!pause.includes("purgeSiteCache("), "pausing must not delete order events");
 assert.ok(!pause.includes("clearStoreCatalog("), "pausing must preserve product mirror");
 assert.ok(web.includes("confirmRemove===site.id"));
 assert.ok(web.includes("Confirmar exclusão"));
 assert.ok(web.includes("await clearStoreCatalog(businessId,site.id)"));
 assert.ok(web.includes('className="consent-row"'));
});
test("financial completion must be opt-in verified, not assumed from missing marker",()=>{
 const web=readFileSync(new URL("../src/WebsiteSyncLab.tsx",import.meta.url),"utf8");
 assert.ok(web.includes('financialCompleteness==="verified"'));
 assert.ok(!web.includes('financialCompleteness!=="operational_only"'));
});
test("native web and SQLite read the same catalog-mirror snapshot kind",()=>{
 const primary=readFileSync(new URL("../src/native-primary.ts",import.meta.url),"utf8");
 const bridge=readFileSync(new URL("../src/desktop-snapshots.ts",import.meta.url),"utf8");
 const rust=readFileSync(new URL("../../desktop/src-tauri/src/native_snapshots.rs",import.meta.url),"utf8");
 for(const src of [primary,bridge,rust])assert.ok(src.includes('"catalog-mirror"'));
});
