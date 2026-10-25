import{h as s}from"./index-BnCuO7oO.js";/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i={name:"download",size:24,node:[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]};i.node;const l=s(i);function c(t){if(t==null)return"";let e=Array.isArray(t)?t.join(", "):typeof t=="object"?JSON.stringify(t):String(t);return/^[=+\-@\t\r]/.test(e)&&(e="'"+e),/[";\n\r,]/.test(e)&&(e='"'+e.replace(/"/g,'""')+'"'),e}function f(t,e){const a=e.map(n=>c(n.label)).join(";"),r=t.map(n=>e.map(o=>c(n[o.key])).join(";")).join(`\r
`);return"\uFEFF"+a+`\r
`+r}function u(t,e,a="text/csv;charset=utf-8"){const r=new Blob([e],{type:a}),n=URL.createObjectURL(r),o=document.createElement("a");o.href=n,o.download=t,o.click(),setTimeout(()=>URL.revokeObjectURL(n),1e3)}export{l as D,u as d,f as t};
