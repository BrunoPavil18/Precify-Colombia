/**
 * Device-v2 published catalog snapshot. Financial order cursors remain independent.
 * A complete, deduplicated paginated snapshot is required before publishing locally.
 * Product costs are intentionally NOT in this public storefront contract.
 */
const text=(v,max)=>typeof v==="string"&&v.length>0&&v.length<=max;
const price=/^(0|[1-9][0-9]{0,12})(?:\.[0-9]{1,2})?$/;
export function validateCatalogPage(input,requested){
 if(!input||typeof input!=="object"||input.version!==1||input.kind!=="published-products"||
    !Number.isSafeInteger(input.page)||input.page!==requested||input.page<1||
    input.pageSize!==24||!Number.isSafeInteger(input.total)||input.total<0||input.total>12000||
    !Number.isSafeInteger(input.totalPages)||input.totalPages!==Math.max(1,Math.ceil(input.total/24))||
    !Array.isArray(input.products)||input.products.length>24)
  throw Error("Invalid published catalog page");
 const products=input.products.map(row=>{
  if(!row||typeof row!=="object"||!Number.isSafeInteger(row.id)||row.id<1||
    !(row.mastershopProductId===null||Number.isSafeInteger(row.mastershopProductId)&&row.mastershopProductId>0)||
    !text(row.name,200)||!text(row.slug,220)||!text(row.currency,3)||!/^[A-Z]{3}$/.test(row.currency)||
    typeof row.price!=="string"||!price.test(row.price)||
    !(row.imageUrl===null||typeof row.imageUrl==="string"&&row.imageUrl.length<=2048&&
      (()=>{try{const u=new URL(row.imageUrl);return u.protocol==="https:"||u.protocol==="http:";}catch{return false;}})()))
   throw Error("Invalid published product");
  return {id:row.id,mastershopProductId:row.mastershopProductId,slug:row.slug,
   name:row.name,price:row.price,currency:row.currency,imageUrl:row.imageUrl};
 });
 if(requested<input.totalPages&&products.length!==24)throw Error("Incomplete intermediate catalog page");
 if(input.total===0&&products.length!==0)throw Error("Nonempty zero catalog");
 return {page:input.page,total:input.total,totalPages:input.totalPages,products};
}
export async function fetchPublishedCatalog(connector,{maxProducts=2400}={}){
 if(typeof connector?.catalogPage!=="function")throw Error("Store does not support the device-v2 catalog endpoint");
 const first=validateCatalogPage(await connector.catalogPage(1),1);
 if(first.total>maxProducts)throw Error("Published catalog exceeds device snapshot limit; no partial import");
 const items=[...first.products],seen=new Set(items.map(p=>p.id));
 if(seen.size!==items.length)throw Error("Duplicate source product ID");
 for(let page=2;page<=first.totalPages;page++){
  const current=validateCatalogPage(await connector.catalogPage(page),page);
  if(current.total!==first.total||current.totalPages!==first.totalPages)
   throw Error("Catalog changed during pagination; previous local snapshot preserved");
  for(const product of current.products){
   if(seen.has(product.id))throw Error("Catalog changed during pagination: duplicated product");
   seen.add(product.id);items.push(product);
  }
 }
 if(items.length!==first.total)throw Error("Incomplete catalog; previous local snapshot preserved");
 return items;
}
