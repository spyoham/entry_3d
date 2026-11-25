// (v3.5) the overworld (src/terra.js, 256 high) looked at: node test/terra35.mjs [seed] [name]
//   test/terra35_<name>_top.png   the made chunks from above (the top block's colour, lighter the higher)
//   test/terra35_<name>_sec1/2.png two sections through the start
//   test/terra35_<name>_far.png   1024 x 1024 blocks round the start from the densities alone (every 4th column)
// and what it counts: the time a chunk takes here, water above the sea's height, land floating in the air
import { createSim } from '../sim.mjs';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url))('sharp');
const WY = 256, WS = 160, SEA = 63;
const seed = +(process.argv[2] || 12345), name = process.argv[3] || 's' + seed;
const t0 = Date.now();
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const call = (f) => s.as('pen', () => f(s.fn));
console.log(`seed ${seed}: in the world after ${n} frames, ${((Date.now() - t0) / 1000).toFixed(1)} s; start (${s.peek('gsX')}, ${s.peek('gsZ')}), player at ${[s.peek('px'), s.peek('py'), s.peek('pz')].map((v) => Math.round(v))}, genVer ${s.peek('genVer')}`);
s.poke('gameMode', 1); s.poke('flying', 1); s.poke('grMobs', 0);
if (process.env.AT) { const [ax, az] = process.env.AT.split(',').map(Number); s.poke('tX', ax + 0.5); s.poke('tY', 150); s.poke('tZ', az + 0.5); s.poke('tYaw', 0); s.poke('tPitch', 0); s.poke('testCmd', 1); F(900); }
F(400);
const KEY = s.peek('ITKEY'), id = (k) => KEY.indexOf(k);
const COL = {};
const setc = (k, c) => { const i = typeof k === 'number' ? k : id(k); if (i >= 0) COL[i] = c; };
setc(0, [200, 220, 255]); setc(1, [128, 128, 128]); setc(2, [96, 160, 64]); setc(3, [134, 96, 67]); setc(7, [50, 90, 200]); setc(8, [220, 210, 160]); setc(9, [150, 140, 135]);
setc(20, [240, 245, 250]); setc(21, [200, 190, 140]); setc(22, [160, 165, 180]); setc(33, [170, 210, 250]); setc(35, [255, 110, 20]); setc(6, [40, 40, 40]); setc(45, [250, 250, 255]);
setc(28, [110, 180, 70]); setc(19, [40, 120, 40]);
for (const [k, c] of [['podzol', [110, 85, 40]], ['coarse_dirt', [120, 90, 60]], ['mycelium', [130, 110, 130]], ['red_sand', [190, 105, 50]], ['terracotta', [150, 95, 70]], ['orange_terracotta', [165, 90, 45]]]) setc(k, c);
const BTREE = s.peek('BTREE'), BLEAF = s.peek('BLEAF'), BLQ = s.peek('BLQ'), BSOL = s.peek('BSOL');
const colour = (b) => { if (COL[b]) return COL[b]; if (BLEAF[b] === 1) return [40, 110, 40]; if (BTREE[b] !== 0) return [100, 75, 45]; if (BLQ[b] > 0) return [50, 90, 200]; if (BSOL[b] === 1) return [150, 120, 100]; return [120, 190, 90]; };
const W = s.peek('W'), HMAP = s.peek('HMAP');
const wcol = (x, z) => (((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS);
const ok = (x, z) => call((fn) => fn.cOK(x, z)) === 1;
const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz'));
async function top(file) {
  const R = 72, w = R * 2 + 1, sc = 4, buf = Buffer.alloc(w * sc * w * sc * 3);
  let waterHigh = 0, cols = 0, floats = 0;
  for (let x = px - R; x <= px + R; x++) for (let z = pz - R; z <= pz + R; z++) {
    let c = [0, 0, 40];
    if (ok(x, z)) {
      const b0 = wcol(x, z) * WY; let y = WY - 1;
      while (y > 0 && W[b0 + y] === 0) y--;
      const b = W[b0 + y]; c = colour(b).slice(); cols++;
      const sh = b === 7 || b === 33 ? 1 : 0.55 + Math.min(0.6, Math.max(-0.2, (y - SEA) / 90));
      c = c.map((v) => Math.max(0, Math.min(255, Math.round(v * sh))));
      // water above the sea's height (a lake or a spring's stream), and a column whose top stands on air
      for (let yy = SEA; yy < WY; yy++) if (W[b0 + yy] === 7) { waterHigh++; break; }
      const h = HMAP[wcol(x, z)]; if (h > 2 && W[b0 + h - 1] === 0 && W[b0 + h - 2] === 0) floats++;
    }
    for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((z - pz + R) * sc + d) * w * sc + (x - px + R) * sc + a) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; }
  }
  await sharp(buf, { raw: { width: w * sc, height: w * sc, channels: 3 } }).png().toFile(file);
  console.log(`made columns ${cols}: with water above the sea's height ${waterHigh} (${(waterHigh / cols * 100).toFixed(1)} %), overhangs ${floats} (${(floats / cols * 100).toFixed(1)} %)`);
}
async function section(file, z) {
  const R = 72, w = R * 2 + 1, sc = 3, H = 200, buf = Buffer.alloc(w * sc * H * sc * 3);
  for (let x = px - R; x <= px + R; x++) {
    const good = ok(x, z), b0 = wcol(x, z) * WY;
    for (let y = 0; y < H; y++) { const c = good ? colour(W[b0 + y]) : [0, 0, 40]; for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((H - 1 - y) * sc + d) * w * sc + (x - px + R) * sc + a) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; } }
  }
  await sharp(buf, { raw: { width: w * sc, height: H * sc, channels: 3 } }).png().toFile(file);
}
await top(`test/terra35_${name}_top.png`);
await section(`test/terra35_${name}_sec1.png`, pz);
await section(`test/terra35_${name}_sec2.png`, pz + 40);
// the caves from above: every column's open cells under the ground between two heights (darker the more), lava red
async function slice(file, y0, y1) {
  const R = 72, w = R * 2 + 1, sc = 4, buf = Buffer.alloc(w * sc * w * sc * 3); let open = 0, all = 0;
  for (let x = px - R; x <= px + R; x++) for (let z = pz - R; z <= pz + R; z++) {
    let c = [0, 0, 40];
    if (ok(x, z)) {
      const b0 = wcol(x, z) * WY, h = HMAP[wcol(x, z)]; let n = 0, lava = 0;
      for (let y = y0; y <= Math.min(y1, h - 4); y++) { all++; if (W[b0 + y] === 0) { n++; open++; } if (W[b0 + y] === 35) lava++; }
      const v = Math.max(40, 235 - n * 28); c = lava ? [255, 110, 20] : [v, v, v];
    }
    for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((z - pz + R) * sc + d) * w * sc + (x - px + R) * sc + a) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; }
  }
  await sharp(buf, { raw: { width: w * sc, height: w * sc, channels: 3 } }).png().toFile(file);
  console.log(`open cells under the ground, heights ${y0}..${y1}: ${(open / all * 100).toFixed(1)} %`);
}
await slice(`test/terra35_${name}_caves.png`, 11, 60);
{ const cnt = {}; for (let x = px - 64; x <= px + 64; x++) for (let z = pz - 64; z <= pz + 64; z++) if (ok(x, z)) { const b0 = wcol(x, z) * WY; for (let y = 1; y < 130; y++) { const b = W[b0 + y]; if (/_ore$/.test(KEY[b] || '') || /^ore/.test(KEY[b] || '')) cnt[KEY[b]] = (cnt[KEY[b]] || 0) + 1; } }
  const nch = 129 * 129 / 256; console.log('ores a chunk:', Object.entries(cnt).map(([k, v]) => `${k} ${(v / nch).toFixed(1)}`).join(', ')); }
// the biomes and heights of the made part
{ const BIOM = s.peek('BIOM'), BN = s.peek('BNAMES'), cnt = {}; let hmin = 999, hmax = 0, hs = 0, k = 0;
  for (let x = px - 64; x <= px + 64; x++) for (let z = pz - 64; z <= pz + 64; z++) if (ok(x, z)) { const ci = wcol(x, z); cnt[BN[BIOM[ci]]] = (cnt[BN[BIOM[ci]]] || 0) + 1; const h = HMAP[ci]; hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); hs += h; k++; }
  console.log('biomes here:', JSON.stringify(cnt), `heights ${hmin}..${hmax}, mean ${(hs / k).toFixed(1)} (the sea ${SEA})`); }
// time: chunks made flying
{ const t1 = Date.now(), n0 = s.peek('nChunks'); s.poke('tX', px + 300); s.poke('tY', 140); s.poke('tZ', pz); s.poke('testCmd', 1); F(600); const made = s.peek('nChunks') - n0; console.log(`flying: ${made} chunks in ${Date.now() - t1} ms (600 frames)`); }
if (process.argv[4] === 'far') {
  const R = 512, st = 4, w = (R * 2) / st, buf = Buffer.alloc(w * w * 3), t1 = Date.now();
  const BCOL = { 0: [40, 70, 170], 21: [25, 45, 130], 20: [60, 120, 200], 8: [150, 180, 230], 1: [225, 215, 160], 2: [120, 180, 80], 3: [60, 130, 50], 4: [220, 200, 120], 5: [50, 100, 70], 6: [235, 240, 245], 7: [130, 130, 130], 11: [40, 160, 40], 12: [170, 170, 70], 13: [70, 100, 70], 14: [190, 100, 50], 15: [40, 80, 30], 16: [150, 110, 150], 17: [110, 160, 90], 18: [130, 180, 110], 19: [200, 230, 250], 26: [70, 110, 220], 27: [190, 215, 205] };
  for (let i = 0; i < w; i++) for (let j = 0; j < w; j++) {
    const x = px - R + i * st, z = pz - R + j * st;
    call((fn) => fn.tPoint(x, z));
    const h = s.peek('colH'), b = s.peek('colB'); let c = (BCOL[b] || [255, 0, 255]).slice();
    if (h >= SEA - 1) { const sh = 0.7 + Math.min(0.5, (h - SEA) / 100); c = c.map((v) => Math.min(255, Math.round(v * sh))); } else { const sh = Math.max(0.5, 1 - (SEA - h) / 40); c = [40 * sh, 80 * sh, 190 * sh].map(Math.round); if (b === 8) c = [150, 180, 230]; }
    const o = (j * w + i) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
  }
  await sharp(buf, { raw: { width: w, height: w, channels: 3 } }).resize(w * 2, w * 2, { kernel: 'nearest' }).png().toFile(`test/terra35_${name}_far.png`);
  console.log(`far map: ${w * w} points in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
}
