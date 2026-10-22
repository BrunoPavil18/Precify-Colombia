import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
test("main accessibility landmarks and feedback exist",()=>{for(const token of ['<main','aria-live','<label','<nav','<button'])assert.ok(app.includes(token),token)});
test("no dangerous HTML or hidden remote services",()=>{for(const token of ['dangerouslySetInnerHTML','eval(','fetch(','XMLHttpRequest'])assert.ok(!app.includes(token),token)});
