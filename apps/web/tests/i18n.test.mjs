import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=read("../src/App.tsx");
const i18n=read("../src/i18n/index.ts");
const source=read("../../../packages/core/src/pricing.ts");
const asData=(file)=>{
 const text=read("../src/i18n/"+file);
 return JSON.parse(text.slice(text.indexOf("{"),text.lastIndexOf("}")+1));
};
const pt={...asData("pt-BR.ts"),...asData("pt-BR-errors.ts")};
const en={...asData("en.ts"),...asData("en-errors.ts")};

test("Portuguese and English have identical static message coverage",()=>{
 const keys=x=>Object.keys(x).sort();
 assert.deepEqual(keys(pt),keys(en));
 assert.ok(keys(pt).length>300);
});
test("every static translation has a usable nonempty translated value",()=>{
 for(const [language,data] of [["pt-BR",pt],["en",en]]){
  for(const [key,value] of Object.entries(data)){
   assert.ok(key.length>0,language+": empty key");
   assert.equal(typeof value,"string",key);
   assert.ok(value.trim().length>0,language+": "+key);
  }
 }
});
test("every t-literal in the React app resolves in both dictionaries",()=>{
 const keys=[...app.matchAll(/\bt\("([^"]+)"\)/g)].map(m=>m[1]);
 assert.ok(keys.length>140);
 for(const key of keys){
  assert.ok(Object.hasOwn(pt,key),"pt-BR missing: "+key);
  assert.ok(Object.hasOwn(en,key),"en missing: "+key);
 }
});
test("dynamic finance field labels, help and navigation strings are translated",()=>{
 const specs=[...app.matchAll(/\{key:"[^"]+",label:"([^"]+)",help:"([^"]+)"\}/g)].flatMap(m=>[m[1],m[2]]);
 assert.ok(specs.length>=20);
 for(const key of specs){assert.ok(key in pt,"pt missing "+key);assert.ok(key in en,"en missing "+key);}
 for(const key of ["Calculadora","Productos","Escenarios","Metas","Informes","Datos","Guardar producto","Borrar todos los datos"]){
  assert.ok(key in pt&&key in en);
 }
});
test("financial assumptions and warnings have localized equivalents",()=>{
 const warnings=[...source.matchAll(/warnings\.push\("([^"]+)"\)/g)].map(m=>m[1]);
 assert.ok(warnings.length>=3);
 for(const key of warnings)assert.ok(key in pt&&key in en,"missing warning: "+key);
 for(const key of ["Margen de contribución = ingreso cobrado − deducciones − costos variables.","COD y devoluciones son reservas editables, no tarifas verificadas.","El descuento supera el precio del producto."]){
  assert.ok(key in pt&&key in en,"missing formula/validation: "+key);
 }
});
test("locale survives reload without modifying financial workspace schema",()=>{
 assert.ok(app.includes('useState<Locale>(readLocale)'));
 assert.ok(app.includes("saveLocale(lang)"));
 assert.ok(app.includes("document.documentElement.lang=locale"));
 assert.ok(i18n.includes('precify-colombia:locale'));
 assert.ok(i18n.includes('??"es-CO"'));
 assert.ok(!i18n.includes("JSON.stringify(workspace)"));
});
test("input unit, currency and backup metadata remain Colombian and canonical",()=>{
 assert.ok(app.includes("parseCOPInput(text)"));
 assert.ok(app.includes('className="unit">COP'));
 assert.ok(app.includes('formatMoneySAMPLE_DO_NOT_USE')===false);
 assert.ok(app.includes('exportProductsCsv(workspace,{'));
 assert.ok(app.includes('precify-colombia-backup.json'));
});
test("destructive dialogs are localized and static dictionaries need no network",()=>{
 assert.ok(app.includes('askConfirmation(t("¿Borrar DEFINITIVAMENTE'));
 assert.ok(app.includes('askConfirmation(t("¿Reemplazar TODOS'));
 assert.ok(app.includes('askConfirmation(t("¿Eliminar «")'));
 for(const text of [app,i18n,read("../src/i18n/pt-BR.ts"),read("../src/i18n/en.ts")])
  for(const forbidden of ["fetch(","eval(","dangerouslySetInnerHTML","XMLHttpRequest"])
   assert.ok(!text.includes(forbidden),forbidden);
});

test("translated blank products do not appear modified until a real user edit",()=>{
 assert.ok(app.includes('savedProduct?.input??{...EMPTY_INPUT,name:t("Producto ejemplo")}'),
  "default comparison should use the localized placeholder product name");
 assert.ok(app.includes('const hasUnsavedDraft=dirtyMoney.size>0||JSON.stringify(draft)!==JSON.stringify(persistedDraft)'));
 assert.ok(app.includes('if(!activeId&&["Producto ejemplo","Produto de exemplo","Sample product"].includes(draft.name))'));
 assert.ok(app.includes("setDraft(d=>({...d,name:translate(lang,\"Producto ejemplo\")}))"));
});
