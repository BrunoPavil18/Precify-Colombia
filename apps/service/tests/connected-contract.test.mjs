import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const service=readFileSync(new URL("../server.mjs",import.meta.url),"utf8");
const schema=readFileSync(new URL("../sql/001_connected_schema.sql",import.meta.url),"utf8");
const ui=readFileSync(new URL("../../web/src/ConnectedLab.tsx",import.meta.url),"utf8");

test("operational erasure is one scoped SQL transaction rather than partial sequential HTTP deletes",()=>{
 const sql=schema.slice(schema.indexOf("create or replace function public.precify_erase_operational_data"));
 assert.ok(sql.includes("pg_advisory_xact_lock"));
 for(const table of ["precify_order_events","precify_campaigns","precify_prices","precify_meta_accounts",
  "precify_meta_connections","precify_oauth_states","precify_webhooks","precify_api_keys"])
  assert.match(sql,new RegExp("delete from public\\."+table+" where org_id=p_org"));
 assert.match(sql,/revoke all on function public\.precify_erase_operational_data\(uuid\)/);
 assert.match(sql,/grant execute on function public\.precify_erase_operational_data\(uuid\) to service_role/);
 assert.match(service,/await authorize\(auth,org,"owner"\);\s*\/\/ Single database transaction/);
 assert.match(service,/await rpc\("precify_erase_operational_data",\{p_org:org\}\)/);
 assert.doesNotMatch(service,/for\(const table of \["precify_order_events"/);
});
test("campaign and order imports share database locking and resolve idempotence within transactions",()=>{
 for(const name of ["precify_import_order_batch","precify_import_campaign_batch"]){
  const start=schema.indexOf("create or replace function public."+name);
  const end=schema.indexOf("end $$;",start);
  assert.ok(start>=0&&end>start);
  const sql=schema.slice(start,end);
  assert.match(sql,/pg_advisory_xact_lock\(hashtextextended\(p_org::text, 2100\)\)/);
 }
 assert.match(service,/await rpc\("precify_import_campaign_batch",\{p_org:org,p_campaigns:/);
 assert.match(service,/await rpc\("precify_import_order_batch",\{p_org:org,p_events:/);
 assert.match(service,/Conflicting duplicate campaign ID/);
});
test("PostgREST void RPC does not attempt to parse an empty response as JSON",()=>{
 assert.match(service,/if\(response.status===204\)return null;\s*const responseText=await response.text\(\);\s*return responseText\?JSON.parse\(responseText\):null/);
});
test("connected browser caches only the consented organization and avoids duplicate refresh",()=>{
 assert.match(ui,/cacheConsent&&consentOrg===org/);
 assert.match(ui,/setDashboard\(null\);setCacheConsent\(false\);setConsentOrg\(null\)/);
 assert.match(ui,/const current=await ensureFreshSession\(session\)/);
 assert.doesNotMatch(ui,/await renewSession\(session\)/);
});
