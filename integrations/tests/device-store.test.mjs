import test from "node:test";
import assert from "node:assert/strict";
import {createMySQLDeviceStore} from "../device-store-mysql.mjs";
test("MySQL one-use invitation rolls back concurrent redemption; lookups and replay checks",async()=>{
 const enrollment={used:false},devices=new Map(),nonces=new Set(),transactions=[];
 const connection={
  async beginTransaction(){transactions.push("begin");},
  async commit(){transactions.push("commit");},
  async rollback(){transactions.push("rollback");},
  release(){transactions.push("release");},
  async execute(sql,values){
   if(sql.startsWith("UPDATE precify_financy_enrollments")){
    if(enrollment.used)return[{affectedRows:0}];
    enrollment.used=true;return[{affectedRows:1}];
   }
   if(sql.startsWith("SELECT subject FROM precify_financy_enrollments"))return[[{subject:"merchant"}]];
   if(sql.startsWith("INSERT INTO precify_financy_devices")){
    devices.set(values[0],{subject:values[1],public_jwk:values[2],scopes:values[3],revoked_at:null});return[{affectedRows:1}];
   }
   throw Error("Unexpected SQL "+sql);
  }
 };
 const pool={
  async getConnection(){return connection;},
  async execute(sql,values){
   if(sql.startsWith("SELECT subject,public_jwk")){
    const entry=devices.get(values[0]);return[entry?[entry]:[]];
   }
   if(sql.startsWith("INSERT IGNORE")){
    const value=values.join(":");if(nonces.has(value))return[{affectedRows:0}];
    nonces.add(value);return[{affectedRows:1}];
   }
   throw Error("Unexpected pool SQL");
  }
 };
 const store=createMySQLDeviceStore(pool);
 const grant={codeHash:"f".repeat(64),deviceId:"a".repeat(32),publicKey:{kty:"OKP",crv:"Ed25519",x:"b".repeat(43)}};
 assert.deepEqual(await store.redeem(grant),{subject:"merchant"});
 assert.equal(await store.redeem({...grant,deviceId:"c".repeat(32)}),null);
 assert.equal(transactions.filter(x=>x==="commit").length,1);
 assert.equal(transactions.filter(x=>x==="rollback").length,1);
 const value=await store.lookup(grant.deviceId);
 assert.deepEqual(value.scopes,["finance:read"]);
 assert.equal(value.subject,"merchant");
 assert.equal(await store.useNonce(grant.deviceId,"n".repeat(32)),true);
 assert.equal(await store.useNonce(grant.deviceId,"n".repeat(32)),false);
});
