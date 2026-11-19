// (v3.3) the mesher's quick ways (a section of nothing, a section of whole blocks only) find the very
// faces the plain way finds: two games of one seed, one with MESHFAST 0, flown the same way, the sections'
// faces compared (as sets: a section's faces may come in another order).
// usage: node test/meshfast33.mjs [seed]
import { createSim } from '../sim.mjs';
const seed = Number(process.argv[2] || 1234);
const run = (fast) => {
  const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, MESHFAST: fast } });
  let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
  s.poke('helpT', 0); s.poke('gameMode', 1); s.poke('flying', 1);
  // (no random ticks, no weather: grass that spreads or dies would make two runs differ by itself)
  const G = s.peek('GRV').slice(); G[13] = 0; G[5] = 0; s.poke('GRV', G); s.poke('grTick', 0); s.poke('grWeather', 0);
  const snaps = [];
  for (const [x, y, z] of [[0, 0, 0], [40, -30, 25], [90, 20, -60], [140, -45, 10]]) {
    if (x) { s.poke('px', s.peek('px') + x); s.poke('py', Math.max(8, s.peek('py') + y)); s.poke('pz', s.peek('pz') + z); }
    for (let i = 0; i < 400; i++) { s.poke('pvy', 0); s.frame(); }
    const SF0 = s.peek('SF0'), SFN = s.peek('SFN'), SVIS = s.peek('SVIS'), SOX = s.peek('SOX'), SOZ = s.peek('SOZ'), SOK = s.peek('SOK');
    const FP = s.peek('FP'), FT = s.peek('FT'), FN = s.peek('FN'), FA = s.peek('FA');
    const m = new Map(); let faces = 0, full = 0;
    for (let k = 0; k < SF0.length; k++) {
      if (!SOK[k]) continue;
      const L = [];
      for (let j = 0; j < SFN[k]; j++) { const q = SF0[k] - 1 + j; L.push(FP[q] + ':' + FT[q] + ':' + FN[q] + ':' + FA[q]); }
      L.sort(); faces += L.length; if (SVIS[k] === 0) full++;
      m.set(SOX[k] + ',' + SOZ[k] + ',' + (k % 16), SVIS[k] + '|' + L.join(' '));
    }
    snaps.push({ m, faces, full });
  }
  return snaps;
};
const A = run(0), B = run(process.env.SAME ? 0 : 1);
let fails = 0;
A.forEach((a, i) => {
  const b = B[i]; let diff = 0, both = 0;
  for (const [k, v] of a.m) { if (b.m.has(k)) { both++; if (b.m.get(k) !== v) { diff++; if (diff < 4) { const x = v.split(/[| ]/), y = b.m.get(k).split(/[| ]/); console.log('  differs', k, x.length, y.length, x.filter(e => !y.includes(e)).slice(0, 4).join(' '), '<>', y.filter(e => !x.includes(e)).slice(0, 4).join(' ')); } } } }
  const good = diff === 0 && both > 50 && a.faces > 0;
  console.log(good ? 'ok  ' : 'FAIL', `place ${i}: ${both} sections in both, ${a.faces} / ${b.faces} faces, ${a.full} closed ones, ${diff} differ`);
  if (!good) fails++;
});
console.log(fails ? fails + ' FAILED' : 'all ok');
