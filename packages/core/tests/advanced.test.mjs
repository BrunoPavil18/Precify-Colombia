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
 assert.equal(b.paidOrders,"0");// Ten delivered-but-unpaid orders incur COP 2.00 reverse shipping each, plus COP 30.00 advertising.
 assert.equal(b.deliveredUnpaid,"10");assert.equal(b.deliveryFailures,"0");
 assert.equal(b.expectedProfit,"-50.00");assert.equal(b.profitPerPaidOrder,null);
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

test("COD non-shipped orders never incur failed delivery attempts",()=>{
 const input={product:base,createdOrders:"10",shippedPercent:"0",deliveredPercentOfShipped:"100",
 paidPercentOfDelivered:"100",failedAttemptCost:"9.00",returnShippingCost:"3.00",
 advertisingPerCreatedOrder:"2.00",extraCODFeePerPaidOrder:"0",lossReservePerFailedOrder:"0"};
 const a=simulateCOD(input);
 assert.equal(a.cancelledBeforeShipping,"10");assert.equal(a.deliveryFailures,"0");
 assert.equal(a.expectedProfit,"-20.00");assert.equal(a.profitPerShippedOrder,null);
 const b=simulateCOD({...input,shippedPercent:"100",deliveredPercentOfShipped:"0"});
 assert.equal(b.deliveryFailures,"10");assert.equal(b.expectedProfit,"-140.00");
});
test("campaign projected profit reconciles refunds separately from attributed ROAS",()=>{
 const params={product:base,impressions:"1000",conversionPercent:"2.00",advertisingSpend:"100.00",
 attributedRevenue:"0.00",refundPercent:"100.00"};
 const x=simulateCampaign(params);
 assert.equal(x.conversions,"20");
 assert.equal(x.roas,"0.00");
 assert.equal(x.projectedProfit,"-1100.00");
 assert.equal(x.attributionMismatch,true);
 assert.equal(x.projectedRevenue,"2000.00");
 assert.equal(x.projectedRoas,"0.00");
 const zero=simulateCampaign({...params,conversionPercent:"0",refundPercent:"0"});
 assert.equal(zero.projectedProfit,"-100.00");assert.equal(zero.cac,null);
});
test("PUM preserves math rounding while reporting SIC-style truncated presentation separately",()=>{
 const x=pricePerMeasure("1000.00","6.00","unit");
 assert.equal(x.pricePerUnit,"166.67");
 assert.equal(x.regulatoryTruncatedPrice,"166.66");
 assert.equal(x.exactPriceFraction.numerator,"10000000");
 assert.equal(x.exactPriceFraction.denominator,"600");
});
test("portfolio break-even avoids prematurely rounded average",()=>{
 const low={...base,acquisition:"99.99"};
 const r=simulatePortfolio([{product:low,monthlyUnits:"3"}],"0.02");
 assert.equal(r.breakEvenUnits,"2");
 assert.equal(r.totalContribution,"0.03");
 assert.equal(simulatePortfolio([{product:low,monthlyUnits:"0"}],"0.02").breakEvenUnits,null);
});

test("COD charged only on transport events even with partial shipment and delivered unpaid",()=>{
 const params={product:base,createdOrders:"100",shippedPercent:"50",deliveredPercentOfShipped:"80",
 paidPercentOfDelivered:"50",failedAttemptCost:"7.00",returnShippingCost:"4.00",
 advertisingPerCreatedOrder:"1.00",extraCODFeePerPaidOrder:"2.00",lossReservePerFailedOrder:"3.00"};
 const r=simulateCOD(params);
 assert.equal(r.cancelledBeforeShipping,"50");
 assert.equal(r.deliveryFailures,"10");
 assert.equal(r.deliveredUnpaid,"20");
 assert.equal(r.paidOrders,"20");
 // 20*(50-2) - 100*1 - 10*7 - 80*3 - 30*4 = 430
 assert.equal(r.expectedProfit,"430.00");
 assert.equal(r.profitPerShippedOrder,"8.60");
});
test("campaign keeps attributed revenue separate from projected orders",()=>{
 const params={product:base,impressions:"100",conversionPercent:"10",advertisingSpend:"100.00",attributedRevenue:"3000.00",refundPercent:"20"};
 const r=simulateCampaign(params);
 assert.equal(r.conversions,"10");
 assert.equal(r.projectedRevenue,"1000.00");
 assert.equal(r.projectedRefunds,"200.00");
 assert.equal(r.projectedProfit,"200.00");
 assert.equal(r.attributedRevenueAfterRefunds,"2400.00");
 assert.equal(r.roas,"24.00");
 assert.equal(r.projectedRoas,"8.00");
 assert.equal(r.attributionMismatch,true);
});
test("fixed mix portfolio break-even uses exact aggregate contribution, not rounded average",()=>{
 const a={...base,acquisition:"99.97"};
 const b={...base,acquisition:"99.99"};
 const result=simulatePortfolio([{product:a,monthlyUnits:"1"},{product:b,monthlyUnits:"2"}],"0.03");
 // Three units contribute five centavos: ceil(3*3/5)=2
 assert.equal(result.totalContribution,"0.05");
 assert.equal(result.breakEvenUnits,"2");
 assert.equal(result.fixedMixAssumption,true);
});
