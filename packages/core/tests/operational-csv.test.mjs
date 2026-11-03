import test from "node:test";
import assert from "node:assert/strict";
import {parseCSV,importOrdersCSV,neutralizeCsvCell,exportOperationsCSV,computeCODFunnel} from "../dist/index.js";
test("quoted CSV including embedded comma and newline parses safely",()=>{
 const parsed=parseCSV('id,label\r\ne1,"hello, ""world"""\r\ne2,"two\nlines"\r\n');
 assert.equal(parsed.rows[0].label,'hello, "world"');
 assert.equal(parsed.rows[1].label,"two\nlines");
 assert.throws(()=>parseCSV('id,id\n1,2'));
 assert.throws(()=>parseCSV('id\n"unfinished'));
});
test("CSV mapping creates source-identified valid COD events",()=>{
 const data="event,order,status,time,amount\ne1,order-1,created,2026-10-20T12:00:00Z,100.00\ne2,order-1,paid,2026-10-21T12:00:00Z,100.00";
 const records=importOrdersCSV(data,{id:"event",orderId:"order",occurredAt:"time",grossRevenue:"amount"});
 assert.equal(records.length,2);assert.equal(records[0].currency,"COP");
 assert.equal(computeCODFunnel(records).paid,1);
 assert.equal(importOrdersCSV(exportOperationsCSV(records)).length,2);
});
test("spreadsheet formula injection is neutralized, invalid csv rejected",()=>{
 assert.equal(neutralizeCsvCell("=SUM(A1:A3)"),'"\'=SUM(A1:A3)"');
 assert.throws(()=>importOrdersCSV("id,orderId,status,occurredAt\n=e1,o1,created,2026-10-20T12:00:00Z"));
 assert.throws(()=>parseCSV("a\n"+"0".repeat(2000001)));
});
