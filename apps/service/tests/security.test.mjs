import test from "node:test";
import assert from "node:assert/strict";
import {canonicalJSON,signatureForWebhook,verifyWebhookSignature} from "../security.mjs";
test("event replay equality is independent of JSONB key order",()=>{
 assert.equal(canonicalJSON({id:"a",payload:{z:1,a:2}}),canonicalJSON({payload:{a:2,z:1},id:"a"}));
 assert.notEqual(canonicalJSON({id:"a"}),canonicalJSON({id:"b"}));
});
test("webhook signature verifies exact body and timestamp in constant time",()=>{
 const key="sample-test-secret",timestamp="1793523600000";
 const body=Buffer.from('{"orderId":"x","status":"paid"}');
 const signature="sha256="+signatureForWebhook(key,timestamp,body);
 assert.equal(verifyWebhookSignature(key,timestamp,body,signature,Number(timestamp)+1000),true);
 assert.equal(verifyWebhookSignature(key,timestamp,Buffer.from("tampered"),signature,Number(timestamp)+1000),false);
 assert.equal(verifyWebhookSignature(key,timestamp,body,signature,Number(timestamp)+600000),false);
 assert.equal(verifyWebhookSignature(key,timestamp,body,"sha256=short",Number(timestamp)),false);
});
