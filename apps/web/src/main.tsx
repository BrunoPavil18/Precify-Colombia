import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
const root=document.getElementById("root");
if(!root) throw new Error("Root element missing");
createRoot(root).render(<React.StrictMode><App/></React.StrictMode>);

// Registration occurs only in production. Updates are not activated without a user choice.
if(import.meta.env.PROD&&"serviceWorker" in navigator){
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
