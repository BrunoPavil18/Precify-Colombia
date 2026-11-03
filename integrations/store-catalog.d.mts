export interface PublishedStoreProduct{id:number;mastershopProductId:number|null;slug:string;name:string;price:string;currency:string;imageUrl:string|null}
export declare function validateCatalogPage(raw:unknown,requested:number):{page:number;total:number;totalPages:number;products:PublishedStoreProduct[]};
export declare function fetchPublishedCatalog(
 connector:{catalogPage:(page:number)=>Promise<unknown>},config?:{maxProducts?:number}
):Promise<PublishedStoreProduct[]>;
