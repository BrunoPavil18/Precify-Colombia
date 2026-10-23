import { createContext, useContext } from "react";
import { ptBR } from "./pt-BR";
import { en } from "./en";
import { ptErrors } from "./pt-BR-errors";
import { enErrors } from "./en-errors";

export const locales=["es-CO","pt-BR","en"] as const;
export type Locale=(typeof locales)[number];
const dictionary: Record<Exclude<Locale,"es-CO">,Record<string,string>> = {
 "pt-BR": {...ptBR,...ptErrors},
 en: {...en,...enErrors}
};
export const LocaleContext=createContext<Locale>("es-CO");

/**
 * Source keys are Spanish UI strings. Translations never change data schemas,
 * product IDs, monetary decimal strings, saved scenario titles or backup format.
 * Spanish is the canonical authoring language, and defaults to es-CO.
 */
export function translate(locale:Locale,original:string):string {
 if(locale==="es-CO")return original;
 const dict=dictionary[locale];
 if(Object.prototype.hasOwnProperty.call(dict,original))return dict[original]!;
 if(original.startsWith("FinancialInputError: "))return translate(locale,original.slice("FinancialInputError: ".length));
 // Validation errors with a field name followed by a stable Spanish message.
 const dynamic=original.match(/^([^:]+): (use formato decimal 1234\.50 sin separadores de miles\.|valor demasiado grande\.|use porcentaje explícito entre 0 y 100 \(ej\.: 19\.5\)\.|no puede superar 100%\.|objeto inválido\.|texto inválido\.|fecha inválida\.|lista inválida o excesiva\.|identificadores duplicados\.)$/);
 if(dynamic)return translate(locale,dynamic[1]!)+": "+translate(locale,dynamic[2]!);
 // Prefix-based error strings retain their details (file names, user-entered names).
 const prefixes=[
  "No se pudieron guardar los cambios: ","Corrige los campos: ",
  "Producto cargado: ","Escenario inválido: ","Perfil inválido: ",
  "Respaldo rechazado, sin modificaciones: ","No se pudieron borrar los datos: ",
  "Datos locales dañados o inaccesibles. No se sobrescribirán automáticamente. Exporta una copia desde el navegador antes de continuar. "
 ];
 for(const prefix of prefixes)if(original.startsWith(prefix))
   return (dict[prefix]??prefix)+translate(locale,original.slice(prefix.length));
 return original;
}
export function useTranslator() {
 const locale=useContext(LocaleContext);
 return (key:string)=>translate(locale,key);
}
export const UI_LOCALE_KEY="precify-colombia:locale";
export function readLocale():Locale {
 try {
  const value=localStorage.getItem(UI_LOCALE_KEY);
  return locales.find(l=>l===value)??"es-CO";
 }catch{return "es-CO";}
}
export function saveLocale(locale:Locale):void {
 try {localStorage.setItem(UI_LOCALE_KEY,locale);}catch{/* Navigation remains usable if storage is unavailable. */}
}
export function localizedError(locale:Locale,e:unknown):string {
 const message=e instanceof Error?e.message:String(e);
 return translate(locale,message);
}
