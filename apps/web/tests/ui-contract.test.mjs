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
