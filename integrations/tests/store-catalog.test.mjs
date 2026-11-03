import test from "node:test";
import assert from "node:assert/strict";
import {fetchPublishedCatalog,validateCatalogPage} from "../store-catalog.mjs";
const row=n=>({id:n,mastershopProductId:n,slug:"product-"+n,name:"Producto "+n,
 price:"60000.00",currency:"COP",imageUrl:null});
const page=(n,total=25)=>({version:1,kind:"published-products",page:n,pageSize:24,
 total,totalPages:Math.max(1,Math.ceil(total/24)),
 products:Array.from({length:Math.max(0,Math.min(24,total-(n-1)*24))},(_,i)=>row((n-1)*24+i+1))});
test("complete snapshot only commits after all pages are validated",async()=>{
 const called=[];
 const records=await fetchPublishedCatalog({catalogPage:async n=>{called.push(n);return page(n);}});
 assert.equal(records.length,25);assert.deepEqual(called,[1,2]);
 assert.equal(records[24].name,"Producto 25");
});
test("an empty store catalog is still a valid complete snapshot",async()=>{
 const records=await fetchPublishedCatalog({catalogPage:async()=>page(1,0)});
 assert.deepEqual(records,[]);
});
test("duplicate products and unstable pagination are rejected",async()=>{
 await assert.rejects(fetchPublishedCatalog({catalogPage:async n=>{
  const p=page(n);if(n===2)p.products[0].id=1;return p;
 }}),/duplicated/);
 await assert.rejects(fetchPublishedCatalog({catalogPage:async n=>page(n,n===1?25:26)}),/changed/);
});
test("incomplete or excessively large catalog never produces partial snapshot",async()=>{
 await assert.rejects(fetchPublishedCatalog({catalogPage:async()=>page(1,2401)}),/exceeds/);
 await assert.rejects(fetchPublishedCatalog({catalogPage:async n=>n===2?{...page(2),products:[]}:page(1)}),/Incomplete/);
});
test("rejects unexpected catalog fields, private costs and invalid prices by decoding to public fields only",()=>{
 const v=page(1,1);v.products[0].sourceCost="secret-not-exported";
 assert.equal("sourceCost" in validateCatalogPage(v,1).products[0],false);
 v.products[0].price="-10.00";
 assert.throws(()=>validateCatalogPage(v,1),/Invalid published product/);
});
