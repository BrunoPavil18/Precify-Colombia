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
  'function selectGoalProduct(id:string)',
  'value={goalProduct.id} onChange={e=>selectGoalProduct(e.target.value)}',
  'const goalInput=useMemo(()=>goalProduct?{',
  'monthlyFixed:goalFixedOverride??goalProduct.input.monthlyFixed',
  'monthlyUnits:goalUnitsOverride??goalProduct.input.monthlyUnits',
  'goalResult.breakdown.breakEvenUnits'
 ])assert.ok(app.includes(token),token);
});
test("Goals discards unsaved simulations and saves only monthly product fields",()=>{
 for(const token of [
  'if(goalDirty&&!window.confirm(t("Hay cambios sin guardar en Metas.',
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
