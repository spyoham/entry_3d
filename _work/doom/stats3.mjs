import { readWad, readMap, readTextures } from './wad.mjs';
const w = readWad('freedoom-0.13.0/freedoom1.wad');
const M=readMap(w,'E1M1');
const tex=readTextures(w);
// texture usage by wall area
const area={};
const V=M.verts;
for(const L of M.lines){ const len=Math.hypot(V[L.v2].x-V[L.v1].x,V[L.v2].y-V[L.v1].y);
 const s0=M.sides[L.side[0]], s1=L.side[1]!==65535?M.sides[L.side[1]]:null;
 const f=M.sectors[s0.sector], b=s1?M.sectors[s1.sector]:null;
 const add=(t,h)=>{ if(t!=='-'&&h>0) area[t]=(area[t]||0)+len*h; };
 if(!b){ add(s0.mid,f.ceil-f.floor);} else { for(const [s,F,Bk] of [[s0,f,b],[s1,b,f]]){ add(s.upper,F.ceil-Bk.ceil); add(s.lower,Bk.floor-F.floor); if(s.mid!=='-') add(s.mid,Math.min(F.ceil,Bk.ceil)-Math.max(F.floor,Bk.floor)); } }
}
const e=Object.entries(area).sort((a,b)=>b[1]-a[1]);
console.log('textures used',e.length);
console.log(e.map(([k,v])=>`${k}:${tex[k]?tex[k].w+'x'+tex[k].h:'?'}:${Math.round(v/1000)}`).join(' '));
const hs=M.sectors.map(s=>s.ceil-s.floor); console.log('max sector height',Math.max(...hs));
const bm=M.blockmap; console.log('blockmap bytes',bm.length,'cols',bm.readInt16LE(4),'rows',bm.readInt16LE(6),'words',bm.length/2);
console.log('reject bytes', M.reject.length);
