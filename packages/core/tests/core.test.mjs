import test from "node:test";
import assert from "node:assert/strict";
import {
 parseCOPInput, parseDecimal, percentBps, roundPrice, moneyDisplay,
 FinancialInputError, fromCents, EMPTY_INPUT, analyze, suggestPrice,
 maxDiscountPercent, emptyWorkspace, validateWorkspace, encodeBackup,
 decodeBackup, exportProductsCsv, defaultScenarios, compareScenarios
} from "../dist/index.js";

test("COP 89.900 is 89900 and comma decimal",()=>{
 assert.equal(parseCOPInput("89.900"),"89900.00");
 assert.equal(parseCOPInput("$ 89.900,50"),"89900.50");
 assert.equal(parseCOPInput("COP 1.000.000"),"1000000.00");
});
test("ambiguous and malformed money rejected",()=>{
 for(const s of ["89.90","1,234.00","1.2.3","-9","Infinity","NaN","01","100,123","89 900"])
  assert.throws(()=>parseCOPInput(s),FinancialInputError);
});
test("canonical money and bounds",()=>{
 assert.equal(parseDecimal("100.05"),10005n);
 for(const s of ["-1","1.001","1e4","1,000","9999999999999",""])
  assert.throws(()=>parseDecimal(s));
});
test("percent explicit",()=>{
 assert.equal(percentBps("19.50"),1950n);
 for(const s of ["101","0.123","-1","0,19","Infinity"]) assert.throws(()=>percentBps(s));
});
test("rounding to ceiling",()=>{
 assert.equal(roundPrice(12501n,"peso"),12600n);
 assert.equal(roundPrice(12501n,"50"),15000n);
 assert.equal(roundPrice(8990000n,"ending-900"),8990000n);
 assert.equal(roundPrice(9000000n,"ending-990"),9099000n);
});
test("format es-CO",()=>assert.equal(moneyDisplay("89900.50"),"$ 89.900,50"));
test("known no-fee contribution",()=>{
 const v={...EMPTY_INPUT,acquisition:"50.00",packaging:"0",shippingCost:"0",shippingCharged:"0",fixedFee:"0",advertising:"0",currentPrice:"100.00",feePercent:"0",targetMargin:"25",monthlyFixed:"75",monthlyUnits:"4"};
 const r=analyze(v);
 assert.equal(r.contribution,"50.00");
 assert.equal(r.marginPercent,"50.00");
 assert.equal(r.monthlyNet,"125.00");
 assert.equal(r.breakEvenUnits,"2");
});
test("unprofitable has no invented break even",()=>{
 const r=analyze({...EMPTY_INPUT,currentPrice:"100.00",acquisition:"500.00"});
 assert.equal(r.breakEvenUnits,null);assert.equal(r.feasible,false);
});
test("reverse formula with 20 percent target margin",()=>{
 const v={...EMPTY_INPUT,acquisition:"60.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",feePercent:"0",targetMargin:"20.00",rounding:"centavo"};
 assert.equal(suggestPrice(v).price,"75.00");
});
test("final rounding never undercuts margin",()=>{
 const v={...EMPTY_INPUT,acquisition:"60.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",feePercent:"3",targetMargin:"20",rounding:"500"};
 const s=suggestPrice(v);
 assert.ok(parseDecimal(s.result.contribution)*10000n >= 2000n*(parseDecimal(s.result.salePrice)-parseDecimal(s.result.discount)));
});
test("discount validation",()=>assert.throws(()=>analyze({...EMPTY_INPUT,discountFixed:"99000"})));
test("discount limit returns possible rate",()=>{
 const input={...EMPTY_INPUT,acquisition:"50.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",feePercent:"0",currentPrice:"100.00",targetMargin:"20"};
 assert.equal(maxDiscountPercent(input),"37.50");
});
test("IVA included is disclosed and not universal",()=>{
 const r=analyze({...EMPTY_INPUT,ivaPercent:"19.00"});
 assert.ok(parseDecimal(r.ivaIncluded)>0n);
 assert.ok(r.warnings.some(s=>s.includes("IVA ilustrativo")));
});
test("workspace roundtrip",()=>{
 const now=new Date().toISOString();const w=emptyWorkspace();
 w.products.push({id:"p-1",createdAt:now,updatedAt:now,input:{...EMPTY_INPUT}});
 const r=decodeBackup(encodeBackup(w));
 assert.equal(r.products[0].input.name,EMPTY_INPUT.name);
});
test("invalid backup cannot be restored",()=>{
 assert.throws(()=>decodeBackup('{"format":"other"}'));
 assert.throws(()=>decodeBackup("{"));
 assert.throws(()=>decodeBackup("a".repeat(2_000_001)));
});
test("invalid product fails atomically",()=>{
 const w=emptyWorkspace();w.products.push({id:"foo",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),input:{...EMPTY_INPUT,acquisition:"-99"}});
 assert.throws(()=>validateWorkspace(w));
});
test("CSV formula injection neutralized",()=>{
 const now=new Date().toISOString(),w=emptyWorkspace();
 w.products.push({id:"p",createdAt:now,updatedAt:now,input:{...EMPTY_INPUT,name:"=cmd|calc",category:"+SUM(1)"}});
 const csv=exportProductsCsv(w);
 assert.ok(csv.includes('"\'=cmd|calc"'));
 assert.ok(csv.includes('"\'+SUM(1)"'));
});
test("max-price and ratio limits",()=>{
 assert.throws(()=>suggestPrice({...EMPTY_INPUT,acquisition:"999999999999.99",targetMargin:"99.99",feePercent:"1"}),FinancialInputError);
});
test("signed bigint formatter",()=>assert.equal(fromCents(-101n),"-1.01"));

test("optimistic, expected and conservative are independent from the product",()=>{
 const original={...EMPTY_INPUT,acquisition:"37000.00",currentPrice:"99000.00",feePercent:"0.00"};
 const scenarios=defaultScenarios(original);
 scenarios[0].values.acquisition="35000.00";
 scenarios[2].values.acquisition="40000.00";
 assert.equal(original.acquisition,"37000.00");
 assert.equal(scenarios[1].values.acquisition,"37000.00");
 assert.deepEqual(scenarios.map(s=>analyze(s.values).contribution),
  ["51000.00","49000.00","46000.00"]);
 const compared=compareScenarios(scenarios);
 assert.equal(compared.length,3);
 assert.ok(BigInt(parseDecimal(compared[0].result.contribution))>BigInt(parseDecimal(compared[2].result.contribution)));
});

test("persisted scenarios survive backup and do not change original product",()=>{
 const now=new Date().toISOString();
 const workspace=emptyWorkspace();
 const baseline={...EMPTY_INPUT,acquisition:"37000.00",currentPrice:"99000.00",feePercent:"0.00"};
 workspace.products.push({id:"original",createdAt:now,updatedAt:now,input:baseline});
 workspace.scenarios=defaultScenarios(baseline).map((s,i)=>({
  id:"s"+i,productId:"original",title:s.name,note:s.note,values:s.values
 }));
 workspace.scenarios[2].values.acquisition="40000.00";
 const restored=decodeBackup(encodeBackup(workspace));
 assert.equal(restored.products[0].input.acquisition,"37000.00");
 assert.equal(restored.scenarios[2].values.acquisition,"40000.00");
 assert.equal(restored.scenarios[0].productId,"original");
});


test("CSV translations preserve canonical COP amounts, safety, and backup compatibility",()=>{
 const now=new Date().toISOString(),workspace=emptyWorkspace();
 workspace.products.push({id:"p-test",createdAt:now,updatedAt:now,
  input:{...EMPTY_INPUT,name:"=ALERT(1)",currentPrice:"89900.50",origin:"manual"}});
 const headers=["ID","Produto","Categoria","Origem","Preço atual (COP)","Contribuição (COP)","Margem (%)","Data"];
 const csv=exportProductsCsv(workspace,{headers,origin:{manual:"Entrada manual"}});
 assert.ok(csv.includes('"Produto"'));
 assert.ok(csv.includes('"Preço atual (COP)"'));
 assert.ok(csv.includes('"Entrada manual"'));
 assert.ok(csv.includes('"89900.50"'));
 assert.ok(csv.includes('"\'=ALERT(1)"'));
 assert.throws(()=>exportProductsCsv(workspace,{headers:["ID"]}),FinancialInputError);
 const restored=decodeBackup(encodeBackup(workspace));
 assert.equal(restored.products[0].input.currentPrice,"89900.50");
});


test("monthly goals reproduce break-even and remain independent of other product assumptions",()=>{
 const base={...EMPTY_INPUT,acquisition:"37000.00",currentPrice:"99000.00",
  monthlyFixed:"490000.00",monthlyUnits:"10",feePercent:"0.00"};
 const first=analyze(base);
 assert.equal(first.contribution,"49000.00");
 assert.equal(first.breakEvenUnits,"10");
 assert.equal(first.monthlyNet,"0.00");
 assert.equal(first.monthlyNetMargin,"0.00");
 const fifteen=analyze({...base,monthlyUnits:"15"});
 assert.equal(fifteen.breakEvenUnits,"10");
 assert.equal(fifteen.monthlyNet,"245000.00");
 assert.equal(fifteen.monthlyNetMargin,"16.50");
 assert.equal(base.monthlyUnits,"10");
 assert.equal(base.acquisition,"37000.00");
});
