import test from "node:test";
import assert from "node:assert/strict";
import {analyze, EMPTY_INPUT, simulatePortfolio, parseLocalizedPercent} from "@precify-colombia/core";

test("compiled ESM package resolves through its public exports map",()=>{
 const input={...EMPTY_INPUT,acquisition:"50.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",currentPrice:"100.00"};
 assert.equal(analyze(input).contribution,"50.00");
 assert.equal(parseLocalizedPercent("2,50"),"2.50");
 const mix=simulatePortfolio([{product:input,monthlyUnits:"2"}],"50.00");
 assert.equal(mix.monthlyProfit,"50.00");
});
