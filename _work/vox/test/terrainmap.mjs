// cross-sections and maps of the new land (its shape, not the game's picture):
//   node test/terrainmap.mjs u [x,z] [name]   the depths round (x, z): two sections and a map (test/terrain32_<name>*.png)
//   node test/terrainmap.mjs v                 the void: a section of the island, the map of the whole, a section far out
import { createSim } from '../sim.mjs';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url))('sharp');
const WY = 128, WS = 160;
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const call = (f) => s.as('pen', f);
const go = (dim, x, z) => { s.poke('tStage', dim); s.poke('tX', x); s.poke('tZ', z); s.poke('testCmd', 4); F(2); let k = 0; while (s.peek('gState') !== 2 && k < 3000) { F(1); k++; } s.poke('gameMode', 1); s.poke('flying', 1); let last = -1, same = 0; k = 0; while (same < 40 && k < 3000) { const y = s.peek('py'); F(1); s.poke('py', y); s.poke('pvy', 0); const c = s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; } };
const ids = Object.fromEntries(['I_emberMoss', 'I_indigoMoss', 'I_wailSand', 'I_wailSoil', 'I_blackrock', 'I_magma', 'I_shroomLantern'].map((k) => [k, s.peek(k)]));
const colour = (b) => {
  if (b === 0) return [14, 6, 6]; if (b === 35) return [255, 120, 20]; if (b === 6) return [40, 40, 40]; if (b === 48) return [110, 50, 50];
  if (b === 53) return [90, 90, 100]; if (b === 50) return [255, 230, 120]; if (b === ids.I_emberMoss) return [200, 40, 40]; if (b === ids.I_indigoMoss) return [30, 170, 160];
  if (b === ids.I_wailSand || b === ids.I_wailSoil) return [120, 90, 70]; if (b === ids.I_blackrock) return [50, 46, 56]; if (b === ids.I_magma) return [200, 80, 30];
  if (b === 52) return [70, 30, 60]; if (b === 49) return [150, 130, 120]; if (b === 54) return [200, 200, 170]; if (b === 34) return [30, 20, 50]; if (b === 57) return [255, 120, 255];
  return [170, 170, 60];
};
async function section(name, x0, x1, z, ytop, sc) {
  const W = s.peek('W'), w = x1 - x0 + 1, buf = Buffer.alloc(w * sc * ytop * sc * 3);
  for (let x = x0; x <= x1; x++) {
    const ok = call(() => s.fn.cOK(x, z)) === 1, b = ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY;
    for (let y = 0; y < ytop; y++) { const c = ok ? colour(W[b + y]) : [0, 0, 60]; for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((ytop - 1 - y) * sc + d) * w * sc + (x - x0) * sc + a) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; } }
  }
  await sharp(buf, { raw: { width: w * sc, height: ytop * sc, channels: 3 } }).png().toFile(`test/terrain32_${name}.png`);
}
const which = process.argv[2] || 'u';
if (which === 'u') {
  const [bx, bz] = (process.argv[3] || '1,1').split(',').map(Number);
  go(1, bx + 0.5, bz + 0.5);
  const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz'));
  const tag = process.argv[4] || 'sec';
  await section(`${tag}1`, px - 64, px + 64, pz, 64, 6);
  await section(`${tag}2`, px - 64, px + 64, pz + 24, 64, 6);
  // the map: the floor one stands on (HMAP) as brightness, lava orange, rock from floor to roof dark
  const HMAP = s.peek('HMAP'), W = s.peek('W'), sc = 4, w = 129, buf = Buffer.alloc(w * sc * w * sc * 3);
  for (let x = px - 64; x <= px + 64; x++) for (let z = pz - 64; z <= pz + 64; z++) {
    const ci = (((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS), ok = call(() => s.fn.cOK(x, z)) === 1, h = HMAP[ci];
    let c = [0, 0, 60];
    if (ok) { const top = W[ci * WY + h]; if (h >= 61) c = [20, 20, 20]; else if (h <= 12) c = [255, 120, 20]; else { const k = 0.35 + (h - 12) / 50; const t = colour(top); c = t.map((v) => Math.min(255, v * k * 1.6)); } }
    for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((z - pz + 64) * sc + d) * w * sc + (x - px + 64) * sc + a) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; }
  }
  await sharp(buf, { raw: { width: w * sc, height: w * sc, channels: 3 } }).png().toFile(`test/terrain32_${tag}map.png`);
} else {
  go(2, 0.5, -47.5);
  s.poke('px', 0.5); s.poke('pz', 0.5); s.poke('py', 62); { let last = -1, same = 0, k = 0; while (same < 40 && k < 3000) { F(1); s.poke('py', 62); s.poke('pvy', 0); const c = s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; } }
  await section('vsec', -79, 79, 0, 72, 5);
  // the map of the whole: land by height (the small islands lighter)
  const x0 = -940, x1 = 940, st = 4, w = Math.floor((x1 - x0) / st) + 1, buf = Buffer.alloc(w * w * 3);
  for (let i = 0; i < w; i++) for (let j = 0; j < w; j++) {
    const x = x0 + i * st, z = x0 + j * st;
    call(() => s.fn.voidIsland(x, z));
    const t = s.peek('vTop'), b = s.peek('vBot'), t2 = s.peek('vTop2');
    let c = [10, 8, 20];
    if (t >= 0) { const k = 60 + (t - 26) * 6 + Math.min(40, (t - b) * 2); c = [k, k, k * 0.85]; }
    if (t2 >= 0) c = [150, 120 + (t2 - 28) * 3, 255];
    const o = (j * w + i) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
  }
  await sharp(buf, { raw: { width: w, height: w, channels: 3 } }).resize(w * 2, w * 2, { kernel: 'nearest' }).png().toFile('test/terrain32_vmap.png');
  // a section through the outer land
  const sx0 = 430, sx1 = 750, zz = -60, sc = 3, ytop = 80, sw = sx1 - sx0 + 1, sb = Buffer.alloc(sw * sc * ytop * sc * 3);
  for (let x = sx0; x <= sx1; x++) {
    call(() => s.fn.voidIsland(x, zz));
    const t = s.peek('vTop'), b = s.peek('vBot'), t2 = s.peek('vTop2'), b2 = s.peek('vBot2');
    for (let y = 0; y < ytop; y++) { const on = (y <= t && y >= b) || (y <= t2 && y >= b2); const c = on ? [200, 200, 170] : [10, 8, 20]; for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) { const o = (((ytop - 1 - y) * sc + d) * sw * sc + (x - sx0) * sc + a) * 3; sb[o] = c[0]; sb[o + 1] = c[1]; sb[o + 2] = c[2]; } }
  }
  await sharp(sb, { raw: { width: sw * sc, height: ytop * sc, channels: 3 } }).png().toFile('test/terrain32_vsec2.png');
}
console.log('done');
