import { readWad, readMap } from './wad.mjs';
const w = readWad('freedoom-0.13.0/freedoom1.wad');
for (let e=1;e<=1;e++) for (let m=1;m<=9;m++) { const n=`E${e}M${m}`; if (w.find(n)<0) continue; const M=readMap(w,n);
 const mons=M.things.filter(t=>[3004,9,3001,3002,58,3005,3003,3006,16,7,65,66,67,68,69,64,84,71,3006].includes(t.type)&&(t.flags&4)).length;
 console.log(n,'lines',M.lines.length,'segs',M.segs.length,'ss',M.ssectors.length,'nodes',M.nodes.length,'sectors',M.sectors.length,'verts',M.verts.length,'things',M.things.length,'monsters(UV)',mons);}
