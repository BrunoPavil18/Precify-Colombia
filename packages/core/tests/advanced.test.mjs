import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_INPUT, analyze, simulateCOD, simulateCampaign, pricePerMeasure,
 consumerPricePreview, simulatePortfolio, parseLocalizedPercent, emptyWorkspace, encodeBackup, decodeBackup } from "../dist/index.js";

const base={...EMPTY_INPUT,acquisition:"50.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",currentPrice:"100.00",monthlyFixed:"0",monthlyUnits:"10"};
test("margin denominator includes separately charged shipping and retains legacy",()=>{
 const r=analyze({...base,shippingCharged:"20.00"});
 assert.equal(r.contribution,"70.00");
 assert.equal(r.marginPercent,"70.00");
 assert.equal(r.marginOnProductPercent,"70.00");
 assert.equal(r.marginOnCollectedPercent,"58.33");
 assert.equal(r.markupPercent,"140.00");
 assert.equal(r.commercialMarkupPercent,"100.00");
});
test("zero contribution is not viable",()=>{
 const r=analyze({...base,acquisition:"100.00"});
 assert.equal(r.viability,"zero");assert.equal(r.feasible,false);
 assert.equal(r.canCoverFixedCosts,false);assert.equal(r.breakEvenUnits,null);
});
test("COD 100 percent paid and 0 percent paid limits",()=>{
 const values={product:base,createdOrders:"10",shippedPercent:"100",deliveredPercentOfShipped:"100",
 paidPercentOfDelivered:"100",failedAttemptCost:"5",returnShippingCost:"2",
 advertisingPerCreatedOrder:"3",extraCODFeePerPaidOrder:"0",lossReservePerFailedOrder:"0"};
 const a=simulateCOD(values);
 assert.equal(a.paidOrders,"10");assert.equal(a.expectedProfit,"470.00");
 const b=simulateCOD({...values,paidPercentOfDelivered:"0"});
 assert.equal(b.paidOrders,"0");assert.equal(b.expectedProfit,"-80.00");assert.equal(b.profitPerPaidOrder,null);
});
test("PUM scales 500 grams to kilograms",()=>{
 assert.equal(pricePerMeasure("10000.00","500.00","g").pricePerUnit,"20000.00");
 assert.equal(pricePerMeasure("9000.00","1.50","l").pricePerUnit,"6000.00");
 assert.throws(()=>pricePerMeasure("500.00","0","kg"));
});
test("consumer totals never double count included tax",()=>{
 const params={productPrice:"100.00",discount:"10.00",additionalFees:"2.00",
 shippingCharged:"5.00",taxPercent:"19.00",taxMode:"included"};
 assert.equal(consumerPricePreview(params).consumerTotal,"97.00");
 assert.equal(consumerPricePreview({...params,taxMode:"additional"}).consumerTotal,"114.10");
});
test("portfolio charges fixed expenses once",()=>{
 const r=simulatePortfolio([{product:base,monthlyUnits:"10"},{product:{...base,name:"Segundo"},monthlyUnits:"5"}],"400.00");
 assert.equal(r.totalContribution,"750.00");assert.equal(r.monthlyProfit,"350.00");
 assert.equal(r.breakEvenUnits,"8");
});
test("campaign derived CAC and break-even ROAS",()=>{
 const r=simulateCampaign({product:base,impressions:"1000",conversionPercent:"2.00",
 advertisingSpend:"100.00",attributedRevenue:"2000.00",refundPercent:"0.00"});
 assert.equal(r.conversions,"20");assert.equal(r.cac,"5.00");
 assert.equal(r.maxCAC,"50.00");assert.equal(r.breakEvenRoas,"2.00");
});

test("localized percentage accepts explicit comma or dot, never grouping or scientific",()=>{
 assert.equal(parseLocalizedPercent("19,50"),"19.50");
 assert.equal(parseLocalizedPercent("19.50"),"19.50");
 for(const bad of ["1.000,00","1e2","19,500","-1","101","19.5.0"])
  assert.throws(()=>parseLocalizedPercent(bad));
});

test("v2 simulation backup roundtrip and legacy v1 import",()=>{
 const w=emptyWorkspace();
 w.advancedSimulations.push({id:"adv1",kind:"pum",productId:null,at:new Date().toISOString(),
 label:"Test PUM",inputs:{price:"10000.00",quantity:"500.00",unit:"g"}});
 const parsed=JSON.parse(encodeBackup(w));
 assert.equal(parsed.backupVersion,2);
 const restored=decodeBackup(JSON.stringify(parsed));
 assert.equal(restored.advancedSimulations.length,1);
 assert.equal(restored.advancedSimulations[0].inputs.quantity,"500.00");
 parsed.backupVersion=1;
 delete parsed.workspace.advancedSimulations;
 assert.equal(decodeBackup(JSON.stringify(parsed)).advancedSimulations.length,0);
});
test("invalid advanced snapshot rejects restore",()=>{
 const w=emptyWorkspace();
 w.advancedSimulations.push({id:"x",kind:"cod",productId:null,at:new Date().toISOString(),
 label:"Bad",inputs:{unexpectedCode:"evil"}});
 assert.throws(()=>encodeBackup(w));
});
