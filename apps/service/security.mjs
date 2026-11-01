import {createHmac,timingSafeEqual} from "node:crypto";

export function canonicalJSON(value){
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(canonicalJSON).join(",")+"]";
 return "{"+Object.keys(value).sort().filter(k=>value[k]!==undefined)
  .map(k=>JSON.stringify(k)+":"+canonicalJSON(value[k])).join(",")+"}";
}
export function signatureForWebhook(secret,timestamp,raw){
 return createHmac("sha256",secret).update(String(timestamp)+".").update(raw).digest("hex");
}
export function verifyWebhookSignature(secret,timestamp,raw,received,now=Date.now()){
 const at=Number(timestamp);
 if(!Number.isSafeInteger(at)||Math.abs(now-at)>300000)return false;
 if(typeof received!=="string"||!/^sha256=[a-f0-9]{64}$/i.test(received))return false;
 const expected=Buffer.from(signatureForWebhook(secret,timestamp,raw),"hex");
 const actual=Buffer.from(received.slice(7),"hex");
 return actual.length===expected.length&&timingSafeEqual(expected,actual);
}
