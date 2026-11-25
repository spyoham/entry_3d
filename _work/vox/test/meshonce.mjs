// (v3.5, 11-26) a chunk is meshed once, after its eight neighbours are lit (world.js meshWait): node test/meshonce.mjs [seed]
//  - nothing was ever put on the list of sections to mesh again (it was two sections in five);
//  - every chunk any of which is within the view is meshed, at the view of 32 blocks and of 48;
//  - a section meshed again now, with everything round it made, has the faces, the corner shades and the
//    see-through sides it was given when it was made;
//  - the light of a chunk worked out again is the light it has.
import { createSim } from '../sim.mjs';
const WY = 256, WS = 160, NSY = WY / 8, NCH = 10;
const seed = +(process.argv[2] || 777);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3, BENCH: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
s.poke('grTick', 0); s.poke('gameMode', 1); s.poke('flying', 1);
const F = (f) => s.as('pen', f);
const frames = (k) => { for (let i = 0; i < k; i++) { s.poke('py', 150); s.poke('pvy', 0); s.poke('fqN', 0); s.frame(); } };
const go = (x, z, fr) => { s.poke('tX', x + 0.5); s.poke('tY', 150); s.poke('tZ', z + 0.5); s.poke('tYaw', 0); s.poke('tPitch', 0); s.poke('testCmd', 1); frames(fr); };
const faces = (k) => {
  const SG = s.peek('SG'), FP = s.peek('FP'), FT = s.peek('FT'), FN = s.peek('FN'), FA = s.peek('FA'), g = [];
  for (let i = 0; i < 15; i++) { const a = []; for (let f = SG[k * 16 + i]; f < SG[k * 16 + i + 1]; f++) a.push(FP[f - 1] + ':' + FT[f - 1] + ':' + FN[f - 1] + ':' + FA[f - 1]); a.sort(); g.push(a.join(' ')); }
  return g.join('|') + '#' + s.peek('SVIS')[k];
};
const check = (view, name) => {
  const px = s.peek('px'), pz = s.peek('pz'), CKST = s.peek('CKST'), CKX = s.peek('CKX'), CKZ = s.peek('CKZ');
  const at = (cx, cz) => { const k = (((cx % NCH) + NCH) % NCH) * NCH + (((cz % NCH) + NCH) % NCH); return CKX[k] === cx && CKZ[k] === cz ? CKST[k] : 0; };
  // the chunks within the view
  let need = 0, meshed = 0, lit = 0; const miss = [];
  const pcx = Math.floor(px / 16), pcz = Math.floor(pz / 16);
  for (let cx = pcx - 5; cx <= pcx + 5; cx++) for (let cz = pcz - 5; cz <= pcz + 5; cz++) {
    const st = at(cx, cz); if (st >= 4) lit++; if (st === 5) meshed++;
    const dx = Math.max(cx * 16 - Math.floor(px), Math.floor(px) - cx * 16 - 15, 0), dz = Math.max(cz * 16 - Math.floor(pz), Math.floor(pz) - cz * 16 - 15, 0);
    if (dx * dx + dz * dz <= view * view) { need++; if (st !== 5) miss.push(cx - pcx + ',' + (cz - pcz) + ':' + st); }
  }
  ok(miss.length === 0 && need >= 9, `${name}: the ${need} chunks within ${view} blocks are meshed (${meshed} meshed, ${lit} lit) ${miss.slice(0, 8).join(' ')}`);
  ok(s.peek('RQ').length === 0 && s.peek('rqN') === 0, `${name}: no section was ever listed to be meshed again`);
  // each meshed section, meshed again now
  const SOK = s.peek('SOK'); let secs = 0, diff = 0, nf = 0; const ex = [];
  const SOX = s.peek('SOX'), SOZ = s.peek('SOZ');
  for (let k = 0; k < SOK.length; k++) if (SOK[k] === 1) {
    // (of the chunks whose neighbours are still there: one let go behind the player closes the side toward it)
    const cx = Math.floor(SOX[k] / 16), cz = Math.floor(SOZ[k] / 16); let all = 1;
    for (let p = -1; p <= 1; p++) for (let q = -1; q <= 1; q++) if (at(cx + p, cz + q) < 4) all = 0;
    if (all === 0) continue;
    const a = faces(k); F(() => s.fn.meshSection(k + 1)); const b = faces(k); secs++; nf += s.peek('SFN')[k];
    if (a !== b) { diff++; if (ex.length < 5) ex.push(s.peek('SOX')[k] + ',' + (k % NSY) * 8 + ',' + s.peek('SOZ')[k]); }
  }
  ok(secs > 1000 && diff === 0, `${name}: ${secs} sections (${nf} faces) meshed again are as they were made: ${diff} differ ${ex.join(' ')}`);
  // the light of each lit chunk whose neighbours are lit, worked out again
  const L0 = s.peek('LT').slice(); let chunks = 0;
  for (let cx = pcx - 5; cx <= pcx + 5; cx++) for (let cz = pcz - 5; cz <= pcz + 5; cz++) {
    let all = 1; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (at(cx + a, cz + c) < 4) all = 0;
    if (all === 1) { chunks++; F(() => s.fn.relight(cx * 16, cx * 16 + 15, cz * 16, cz * 16 + 15)); }
  }
  const L1 = s.peek('LT'); let ld = 0; for (let i = 0; i < L0.length; i++) if (L0[i] !== L1[i]) ld++;
  ok(chunks >= 9 && ld === 0, `${name}: the light of ${chunks} chunks worked out again: ${ld} cells differ`);
};
const sx = s.peek('gsX'), sz = s.peek('gsZ');
frames(400);
check(32, 'where the world begins');
go(sx + 900, sz - 400, 500);
check(32, 'a far place');
// a walk of 100 blocks, a chunk a second
for (let k = 1; k <= 25; k++) { go(sx + 900 + k * 4, sz - 400 + k * 3, 60); }
frames(300);
check(32, 'after a walk');
F(() => s.fn.setView(48)); s.poke('viewWant', 48); s.poke('autoView', 0);
frames(400);
check(48, 'with the view at 48');
go(sx - 500, sz + 700, 600);
check(48, 'a far place, the view at 48');
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);
