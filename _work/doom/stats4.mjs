import { readWad, readMap, readTextures } from './wad.mjs';
const w = readWad('freedoom-0.13.0/freedoom1.wad');
const M=readMap(w,'E1M1'); const tex=readTextures(w);
const used=new Set(); for(const s of M.sides) for(const t of [s.upper,s.lower,s.mid]) if(t!=='-') used.add(t);
for (const sw of [2,4,8]) { let n=0, uniq=new Set();
 for(const t of used){ const T=tex[t]; const ns=Math.max(1,Math.round(T.w/sw)); n+=ns;
   for(let i=0;i<ns;i++){ const x=Math.floor((i+0.5)*T.w/ns); let key=T.h+':'; for(let y=0;y<T.h;y++) key+=T.px[y*T.w+x]+','; uniq.add(key);} }
 console.log('stripw',sw,'strips',n,'unique',uniq.size); }
