/**
 * Minimal server-side integration client for Vezura or any trusted backend.
 * API keys must NEVER be bundled in client-side JavaScript.
 */
export class PrecifyConnectedClient {
 constructor({baseURL,apiKey,fetchImpl=fetch}){
  const url=new URL(baseURL);
  if(url.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(url.hostname))
   throw new Error("Precify API needs HTTPS");
  if(typeof apiKey!=="string"||!/^prc_live_[a-f0-9]{64}$/.test(apiKey))
   throw new Error("Invalid server API key");
  this.baseURL=url.origin;this.apiKey=apiKey;this.fetch=fetchImpl;
 }
 async call(orgId,path,method="GET",body){
  if(!/^[a-f0-9-]{36}$/i.test(orgId))throw new Error("Invalid organization ID");
  const url=this.baseURL+"/v1/orgs/"+encodeURIComponent(orgId)+path;
  const response=await this.fetch(url,{method,headers:{"Authorization":"ApiKey "+this.apiKey,
   "Accept":"application/json","Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error??"Precify connected API error "+response.status);
  return result;
 }
 dashboard(orgId){return this.call(orgId,"/dashboard");}
 orders(orgId){return this.call(orgId,"/orders");}
 campaigns(orgId){return this.call(orgId,"/campaigns");}
 sendOrderEvents(orgId,events){return this.call(orgId,"/orders/import","POST",events);}
 sendAdReports(orgId,campaigns){return this.call(orgId,"/campaigns/import","POST",campaigns);}
 exportData(orgId){return this.call(orgId,"/export");}
}
