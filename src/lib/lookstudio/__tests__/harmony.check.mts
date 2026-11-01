import { classifyColor } from "../harmony.ts";
const cases: [string,string][] = [["#6E1F2B","red"],["#1F6B4A","green"],["#1E2D55","blue"],["#E7A9B0","pink"],["#C9962B","yellow"],["#1F6E73","teal"],["#EFE7D6","white"],["#A3182B","red"],["#5C3A21","brown"],["#000000","black"],["#D8C3A5","neutral"],["#6A2C70","purple"],["#C8602E","orange"]];
let ok=0; for (const [h,e] of cases){const g=classifyColor(h); console.log(h,g,g===e?"OK":"FAIL expected "+e); if(g===e) ok++;}
console.log(ok+"/"+cases.length);
