import { buildData } from './build.mjs';
const D = await buildData();
const { M } = D.ex; const V = M.verts;
M.lines.forEach((l, i) => {
  const a = V[l.v1], b = V[l.v2];
  if (Math.min(a.x, b.x) < -500 && Math.max(a.x, b.x) > -700 && Math.min(a.y,b.y) < 400 && Math.max(a.y,b.y) > 100) {
    const s0 = M.sides[l.side[0]], s1 = l.side[1] !== 65535 ? M.sides[l.side[1]] : null;
    console.log(i, a, b, 'flags', l.flags, 'sp', l.special, 'S0', s0.sector, s0.upper, s0.mid, s0.lower, JSON.stringify(M.sectors[s0.sector]).slice(0,60), s1 ? ['S1', s1.sector, s1.upper, s1.mid, s1.lower, JSON.stringify(M.sectors[s1.sector]).slice(0,60)].join(' ') : '');
  }
});
