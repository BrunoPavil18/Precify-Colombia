export interface Identity{deviceId:string;publicKey:JsonWebKey;privateKey:CryptoKey}
export declare function generateDeviceIdentity():Promise<Identity>;
export declare function activateDevice(args:{baseURL:string;code:string;identity:Identity;fetchImpl?:typeof fetch}):Promise<{subject:string;deviceId:string}>;
export declare function signDeviceRequest(args:{url:string;deviceId:string;privateKey:CryptoKey;clock?:()=>number;nonce?:()=>string}):Promise<Record<string,string>>;
export declare function createDeviceConnector(args:{id:string;baseURL:string;identity:Identity;fetchImpl?:typeof fetch}):{id:string;identify():Promise<string>;pull(cursor:string|null,limit?:number):Promise<{changes:Array<{kind:"order"|"campaign";id:string;operation:"upsert"|"delete";value?:Record<string,unknown>}>;nextCursor:string|null;hasMore:boolean}>};
