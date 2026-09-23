import { buildData } from './build.mjs';
const D = await buildData();
const { M } = D.ex;
// which sector is the player start in? brute force via BSP in JS
const nodes = M.nodes;
let n = nodes.length - 1, x = -416, y = 256, ss;
for (;;) { const nd = nodes[n]; const side = ((y - nd.y) * nd.dx < (x - nd.x) * nd.dy) ? 0 : 1; const c = nd.child[side]; if (c & 0x8000) { ss = c & 0x7fff; break; } n = c; }
const g = M.segs[M.ssectors[ss].first]; const sec = M.sides[M.lines[g.line].side[g.dir]].sector;
console.log('start sector', sec, M.sectors[sec]);
for (const f of D.ex.flats) console.log(f.name, f.cols[0], f.cols[3]);
