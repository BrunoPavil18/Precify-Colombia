import {existsSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import assert from "node:assert/strict";
const base=resolve("packages/core");
const p=JSON.parse(readFileSync(resolve(base,"package.json"),"utf8"));
assert.equal(p.version,"2.0.1");
assert.equal(p.exports["."].default,"./dist/index.js");
assert.equal(p.exports["."].types,"./dist/index.d.ts");
for(const relative of ["dist/index.js","dist/index.d.ts"])
 assert.ok(existsSync(resolve(base,relative)),relative+" is missing");
const api=await import(pathToFileURL(resolve(base,"dist/index.js")).href);
for(const name of ["analyze","suggestPrice","simulateCOD","simulateCampaign","pricePerMeasure","consumerPricePreview","simulatePortfolio"])
 assert.equal(typeof api[name],"function",name+" is missing");
const input={...api.EMPTY_INPUT,acquisition:"50.00",packaging:"0",shippingCost:"0",fixedFee:"0",advertising:"0",currentPrice:"100.00"};
assert.equal(api.analyze(input).contribution,"50.00");
console.log("Packaged ESM entrypoint and type declarations verified; npm publication not performed.");
