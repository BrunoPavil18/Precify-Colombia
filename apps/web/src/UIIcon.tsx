import type {SVGProps} from "react";

/** Lightweight, consistent line icons; no external font, network or icon CDN. */
const paths:Record<string,string>={
 home:"M3 10.5 12 3l9 7.5V21h-7v-7H10v7H3z",
 calculator:"M5 3h14v18H5z M8 7h8 M8 11h2 M14 11h2 M8 15h2 M14 15h2",
 products:"M4 7 12 3l8 4v10l-8 4-8-4z M4 7l8 5 8-5 M12 12v9",
 scenarios:"M4 4v16 M4 8h8l-4 4 4 4H4 M15 7h5 M15 12h5 M15 17h5",
 goals:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 11v2",
 unit:"M4 5h16 M4 9h16 M4 13h16 M4 17h16 M8 5v12 M16 5v12",
 consumer:"M4 7h16l-1.5 14h-13z M8 7V5a4 4 0 0 1 8 0v2",
 portfolio:"M3 7h18v14H3z M8 7V4h8v3 M3 12h18 M11 12v9",
 global:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2c5 5 5 15 0 20 M12 2c-5 5-5 15 0 20",
 orders:"M3 4h18v16H3z M7 9h10 M7 13h7 M7 17h4",
 cod:"M3 12h3l3 6 5-12 3 6h4",
 marketing:"M3 11h4l11-6v14L7 13H3z M7 13l2 7h3",
 matrix:"M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h18 M3 15h18",
 import:"M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4",
 reports:"M3 21V3 M3 21h18 M7 16v-4 M12 16V7 M17 16v-7",
 competitors:"M4 4h7v16H4z M13 9h7v11h-7z M7.5 8h0",
 connected:"M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l2-2",
 currency:"M3 7h18 M3 17h18 M9 3 5 7l4 4 M15 13l4 4-4 4",
 data:"M4 6c0-2 16-2 16 0s-16 2-16 0z M4 6v12c0 2 16 2 16 0V6 M4 12c0 2 16 2 16 0",
 more:"M5 12h.01 M12 12h.01 M19 12h.01",
 menu:"M4 6h16 M4 12h16 M4 18h16",
 close:"M5 5l14 14 M19 5 5 19",
 arrow:"M5 12h14 M13 6l6 6-6 6",
 activity:"M3 12h4l3-7 4 14 3-7h4",
 shield:"M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z M8 12l3 3 5-6",
 settings:"M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
 spark:"M12 2l2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1z",
 chevron:"M6 9l6 6 6-6"
};
export function UIIcon({name,size=19,...props}:SVGProps<SVGSVGElement>&{name:string;size?:number}){
 return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]??paths.spark}/></svg>;
}
