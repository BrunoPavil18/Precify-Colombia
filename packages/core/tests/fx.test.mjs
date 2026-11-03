import test from "node:test";
import assert from "node:assert/strict";
import {currencyDigits,currencyCatalog,minorAmount,fromMinor,convertCurrency,quoteAge} from "../dist/index.js";
const quote=(base,other,rate,date="2026-10-30")=>({base,quote:other,rate,date,source:"Frankfurter",fetchedAt:"2026-11-01T00:00:00Z"});
test("ISO currency fractional precision is respected",()=>{
 assert.equal(currencyDigits("JPY"),0);
 assert.equal(currencyDigits("COP"),2);
 assert.equal(currencyDigits("BHD"),3);
 assert.equal(minorAmount("1000.10","COP"),100010n);
 assert.equal(fromMinor(minorAmount("-123.456","BHD"),"BHD"),"-123.456");
 assert.throws(()=>minorAmount("0.01","JPY"));
 assert.ok(currencyCatalog().includes("COP"));
});
test("integer rational FX conversion avoids float error and preserves source",()=>{
 const q=quote("COP","USD","0.00025");
 assert.deepEqual(convertCurrency("4000.00","COP","USD",q),{
  amount:"1.00",currency:"USD",rate:"0.00025",rateDate:"2026-10-30",source:"Frankfurter"
 });
 assert.equal(convertCurrency("-4000.00","COP","USD",q).amount,"-1.00");
 assert.equal(convertCurrency("10.00","USD","JPY",quote("USD","JPY","153.44")).amount,"1534");
 assert.throws(()=>convertCurrency("10.00","COP","BRL",q));
 assert.throws(()=>convertCurrency("5.00","COP","USD",quote("COP","USD","0")));
});
test("dated FX observations report stale rather than invent real-time rates",()=>{
 assert.equal(quoteAge(quote("EUR","COP","4300"),"2026-11-01T12:00:00Z").stale,false);
 assert.equal(quoteAge(quote("EUR","COP","4300","2026-10-20"),"2026-11-01T12:00:00Z").stale,true);
});
