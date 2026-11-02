import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import {BusinessProvider} from "./BusinessProfiles";
import {bootstrapNativePrimary} from "./native-primary";
import EmbedCalculator from "./EmbedCalculator";
import "./styles.css";
import "./dark-theme.css";
const root=document.getElementById("root");
if(!root) throw new Error("Root element missing");
const embedded=new URL(window.location.href).searchParams.get("embed")==="1";
try{
 await bootstrapNativePrimary();
 createRoot(root).render(<React.StrictMode>{embedded?<EmbedCalculator/>:<BusinessProvider>{id=><App key={id}/>}</BusinessProvider>}</React.StrictMode>);
}catch(error){
 const detail=error instanceof Error?error.message:String(error);
 createRoot(root).render(<main className="startup-recovery" role="alert">
  <h1>Precify Financy — dados locais indisponíveis</h1>
  <p>O aplicativo não conseguiu acessar o banco SQLite com segurança. Nenhum dado foi apagado ou substituído automaticamente.</p>
  <p>Confira as permissões e o espaço em disco. Preserve os arquivos originais e seus backups antes de tentar novamente.</p>
  <pre>{detail}</pre>
  <button type="button" onClick={()=>window.location.reload()}>Tentar novamente</button>
 </main>);
}

// Registration occurs only in production. Updates are not activated without a user choice.
if(!embedded&&import.meta.env.PROD&&!("__TAURI_INTERNALS__" in window)&&"serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./sw.js").then(registration=>{
   const notify=()=>window.dispatchEvent(new Event("precify:update-ready"));
   if(registration.waiting)notify();
   registration.addEventListener("updatefound",()=>{
    const installing=registration.installing;
    installing?.addEventListener("statechange",()=>{
     if(installing.state==="installed"&&navigator.serviceWorker.controller)notify();
    });
   });
  }).catch(()=>{/* Optional capability */});
 });
}
