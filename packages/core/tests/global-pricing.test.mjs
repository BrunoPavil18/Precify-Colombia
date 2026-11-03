import test from "node:test";
import assert from "node:assert/strict";
import {globalPrice,globalSuggestedPrice} from "../dist/index.js";
const make=(currency)=>({currency,salePrice:"100.00",acquisition:"50.00",packaging:"0",
 shippingCost:"0",shippingCharged:"0",fixedFee:"0",advertising:"0",
 returnsReserve:"0",codReserve:"0",discountPercent:"0",discountFixed:"0",
 feePercent:"0",taxDeductionPercent:"0",targetMargin:"20",monthlyFixed:"75.00",monthlyUnits:"4"});
test("multi-currency contribution is native, not a COP conversion",()=>{
 const brl=globalPrice(make("BRL"));
 assert.equal(brl.contribution,"50.00");
 assert.equal(brl.marginOnProductPercent,"50.00");
 assert.equal(globalSuggestedPrice(make("BRL")).suggestedPrice,"62.50");
 const jpy={...make("JPY"),salePrice:"100",acquisition:"50",monthlyFixed:"75"};
 assert.equal(globalPrice(jpy).contribution,"50");
 assert.equal(globalSuggestedPrice(jpy).suggestedPrice,"63");
});
test("three-decimal currencies respect minor units and target denominators",()=>{
 const bhd={...make("BHD"),salePrice:"10.000",acquisition:"5.000",monthlyFixed:"0.000"};
 assert.equal(globalPrice(bhd).contribution,"5.000");
 assert.equal(globalSuggestedPrice(bhd).suggestedPrice,"6.250");
 assert.throws(()=>globalPrice({...bhd,salePrice:"10.0000"}));
});
