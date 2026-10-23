/**
 * Dedicated AST-based source linter. No external npm tooling is fetched at runtime.
 * Uses the versioned TypeScript parser already present in packages/core.
 * This is deliberately small; it does not replace comprehensive ESLint/Biome policies.
 */
import {createRequire} from "node:module";
import {readdirSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join,relative,resolve} from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const requireCore=createRequire(new URL("../packages/core/package.json",import.meta.url));
const ts=requireCore("typescript");
const checked=["packages/core/src","apps/web/src"];
let scanned=0;
const errors=[];
const list=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>
 e.isDirectory()?list(join(dir,e.name)):/\.tsx?$/.test(e.name)?[join(dir,e.name)]:[]);
for(const path of checked.flatMap(x=>list(join(root,x)))){
 const source=readFileSync(path,"utf8");
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const name=relative(root,path).replaceAll("\\","/");
 scanned++;
 for(const problem of file.parseDiagnostics){
  const loc=file.getLineAndCharacterOfPosition(problem.start??0);
  errors.push(`${name}:${loc.line+1}:${loc.character+1}: syntax: ${ts.flattenDiagnosticMessageText(problem.messageText," ")}`);
 }
 if(source.includes("@ts-ignore"))errors.push(`${name}: no @ts-ignore; prefer explainable @ts-expect-error`);
 const check=(node)=>{
  const loc=file.getLineAndCharacterOfPosition(node.getStart(file));
  const report=(message)=>errors.push(`${name}:${loc.line+1}:${loc.character+1}: ${message}`);
  if(ts.isCallExpression(node)){
   const expr=node.expression;
   if(ts.isIdentifier(expr)&&["eval","Function"].includes(expr.text))report("dynamic code evaluation forbidden");
   if(ts.isPropertyAccessExpression(expr)&&ts.isIdentifier(expr.expression)){
    if(expr.expression.text==="document"&&expr.name.text==="write")report("document.write forbidden");
    if(expr.expression.text==="localStorage"&&expr.name.text==="clear")report("do not clear unrelated site data");
    if(expr.expression.text==="console"&&["log","debug"].includes(expr.name.text))report("remove debug logging");
   }
  }
  if(ts.isPropertyAccessExpression(node)&&node.name.text==="dangerouslySetInnerHTML")report("unsafe HTML insertion forbidden");
  if(node.kind===ts.SyntaxKind.AnyKeyword)report("explicit any forbidden in application/core sources");
  ts.forEachChild(node,check);
 };
 check(file);
}
if(errors.length){for(const err of errors)process.stderr.write(err+"\n");process.exitCode=1;}
else process.stdout.write(`Precify AST lint passed: ${scanned} TypeScript source files.\n`);
