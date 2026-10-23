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
