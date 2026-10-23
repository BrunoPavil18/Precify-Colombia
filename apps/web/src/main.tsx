import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
const root=document.getElementById("root");
if(!root) throw new Error("Root element missing");
createRoot(root).render(<React.StrictMode><App/></React.StrictMode>);

// Registration occurs only in production. Updates are not activated without a user choice.
if(import.meta.env.PROD&&"serviceWorker" in navigator){
 window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(()=>{/* Optional capability */});});
}
