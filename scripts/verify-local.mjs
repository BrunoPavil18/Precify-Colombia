import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
if(!existsSync("pnpm-lock.yaml")){
 console.error("Falta pnpm-lock.yaml. Genérelo, revíselo y agréguelo antes de homologar.");
 process.exit(2);
}
const steps=[["pnpm",["install","--frozen-lockfile","--ignore-scripts"]],["pnpm",["typecheck"]],["pnpm",["lint"]],["pnpm",["test"]],["pnpm",["build"]],["pnpm",["audit","--audit-level","moderate"]]];
for(const [bin,args] of steps){
 const cmd=bin+" "+args.join(" ");
 console.log("==> "+cmd);
 const child=spawnSync(bin,args,{stdio:"inherit",shell:process.platform==="win32"});
 if(child.error||child.status!==0){console.error("FALLÓ: "+cmd);process.exit(child.status??1);}
}
console.log("Revisión automática local completada; falta aún la homologación manual en navegador.");
