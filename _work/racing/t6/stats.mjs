// per-frame work counters in the node sim: quads submitted/drawn, scenery objects, projected vertices
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 1), gfx = +(process.argv[3] || 2), secs = +(process.argv[4] || 20);
const fps = 5;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`gfx = ${gfx}`); g(`selTrk = ${trk}`); g(`buildTrack(${trk})`);
g(`startRace()`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g(`globalThis.__C = { q: 0, scn: 0, scnOff: 0, scnOffV: 0, scnV: 0, pv: 0, car: 0, carOff: 0, seg: 0, segOff: 0 }`);
g(`{ const q0 = quad; quad = function(a,b,c,d,m){ __C.q++; return q0(a,b,c,d,m); }; }`);
g(`{ const p0 = projSlots; projSlots = function(a,b){ __C.pv += b - a + 1; return p0(a,b); }; }`);
g(`{ const d0 = drawScn; drawScn = function(o,h){ __C.scn++; const a = drawnQuads; const r = d0(o,h); if (drawnQuads == a) { __C.scnOff++; __C.scnOffV += gtVN[scT[o-1]-1]; } __C.scnV += gtVN[scT[o-1]-1]; return r; }; }`);
g(`{ const d0 = drawCar; drawCar = function(c,t){ __C.car++; const a = drawnQuads; const r = d0(c,t); if (drawnQuads == a) __C.carOff++; return r; }; }`);
g(`{ const d0 = drawSeg; drawSeg = function(i,b0,b1,l){ __C.seg++; const a = drawnQuads; const r = d0(i,b0,b1,l); if (drawnQuads == a) __C.segOff++; return r; }; }`);
const acc = { q: 0, dq: 0, scn: 0, pv: 0, car: 0, n: 0, scnOff: 0, scnOffV: 0, scnV: 0, carOff: 0, seg: 0, segOff: 0 };
for (let f = 0; f < secs * fps; f++) {
    g(`__C.q = 0; __C.scn = 0; __C.pv = 0; __C.car = 0; __C.scnOff = 0; __C.scnOffV = 0; __C.scnV = 0; __C.carOff = 0; __C.seg = 0; __C.segOff = 0;`);
    s.frame();
    if (f > 3 * fps) { const C = g('__C'); for (const k of ['scnOff','scnOffV','scnV','carOff','seg','segOff']) acc[k] += C[k]; acc.q += C.q; acc.scn += C.scn; acc.pv += C.pv; acc.car += C.car; acc.dq += g('drawnQuads'); acc.n++; }
}
const r = (x) => Math.round(x / acc.n);
console.log(`trk ${trk} gfx ${gfx}: quads submitted ${r(acc.q)} drawn ${r(acc.dq)}  scenery objs ${r(acc.scn)}  projected verts ${r(acc.pv)}  cars ${r(acc.car)}  nVis ${g('nVis')}`);
console.log(`   scenery off-screen ${r(acc.scnOff)}/${r(acc.scn)} objs, verts ${r(acc.scnOffV)}/${r(acc.scnV)};  cars off ${r(acc.carOff)}/${r(acc.car)};  segs with nothing drawn ${r(acc.segOff)}/${r(acc.seg)}`);
