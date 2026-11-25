// (v3.4; v3.5: the world 256 high, its caves and its trees across the chunks' borders) the land is the same whatever way one comes to it: two games of one seed, one walks to a place in
// steps (its kept layers, chunks and points filled on the way), the other comes from the far side - every cell
// of the chunks both have made is the same (what two players on a server must see): node test/terradet.mjs [seed]
import { createSim } from '../sim.mjs';
const WY = 256, WS = 160;
const seed = +(process.argv[2] || 777);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const mk = () => { const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3, BENCH: 1 } }); let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; } s.poke('grTick', 0); s.poke('gameMode', 1); s.poke('flying', 1); return s; };
const go = (s, x, z, fr = 500) => { s.poke('tX', x + 0.5); s.poke('tY', 190); s.poke('tZ', z + 0.5); s.poke('tYaw', 0); s.poke('tPitch', 0); s.poke('testCmd', 1); for (let i = 0; i < fr; i++) { s.poke('py', 190); s.poke('pvy', 0); s.frame(); } };
const A = mk(), B = mk();
// (a spring's water and lava run on as time goes: how far they have come is not the land's)
// (so a cell that is water or lava on either side is left out: also what the running water washed away or cooled)
const BLQ = A.peek('BLQ'), liq = (b) => BLQ[b] > 0;
// (nor a cell beside one: lava met by water turns to stone there)
const wet = (Wl, i) => [1, -1, WY, -WY, WS * WY, -WS * WY].some((d) => { const j = (i + d + Wl.length) % Wl.length; return liq(Wl[j]); });
const sx = A.peek('gsX'), sz = A.peek('gsZ');
ok(A.peek('genVer') === 3 && sx === B.peek('gsX') && sz === B.peek('gsZ'), `both begin at the same place (${sx}, ${sz}), on the new land`);
for (const [dx, dz] of [[320, 40], [-200, 260]]) {
  const tx = sx + dx, tz = sz + dz;
  for (let k = 1; k <= 8; k++) go(A, Math.round(sx + dx * k / 8), Math.round(sz + dz * k / 8), 260);
  go(A, tx, tz, 400);
  go(B, tx + 400, tz - 350, 300); go(B, tx + 90, tz + 60, 300); go(B, tx, tz, 500);
  const WA = A.peek('W'), WB = B.peek('W'), HA = A.peek('HMAP'), HB = B.peek('HMAP'), BA = A.peek('BIOM'), BB = B.peek('BIOM');
  let cols = 0, diff = 0, hd = 0; const ex = [];
  for (let x = tx - 60; x <= tx + 60; x++) for (let z = tz - 60; z <= tz + 60; z++) {
    if (A.as('pen', () => A.fn.cOK(x, z)) !== 1 || B.as('pen', () => B.fn.cOK(x, z)) !== 1) continue;
    const sa = A.peek('CKST')[A.as('pen', () => A.fn.slotOf(Math.floor(x / 16), Math.floor(z / 16))) - 1], sb = B.peek('CKST')[B.as('pen', () => B.fn.slotOf(Math.floor(x / 16), Math.floor(z / 16))) - 1];
    if (sa < 4 || sb < 4) continue;   // ((11-26) made and lit: a chunk is meshed only when its neighbours are)
    const ci = (((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS), b0 = ci * WY; cols++;
    if (HA[ci] !== HB[ci] || BA[ci] !== BB[ci]) hd++;
    for (let y = 0; y < WY; y++) if (WA[b0 + y] !== WB[b0 + y] && !liq(WA[b0 + y]) && !liq(WB[b0 + y]) && !wet(WA, b0 + y) && !wet(WB, b0 + y)) { diff++; if (ex.length < 6) ex.push(`${x},${y},${z}:${WA[b0 + y]}/${WB[b0 + y]}`); }
  }
  ok(cols > 5000 && diff === 0 && hd === 0, `round (${tx}, ${tz}): ${cols} columns made on both, cells that differ ${diff} (running water and lava apart), tops or biomes that differ ${hd} ${ex.join(' ')}`);
}
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);
