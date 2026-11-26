// (v3.2) the land of the depths and the void: node test/terrain32.mjs [PICS=1]
// A new world (genVer 1) has the cavern world and the new void; a world from before (genVer 0) keeps its land.
import { createSim } from '../sim.mjs';
import { createRequire } from 'node:module';
const PICS = process.argv.includes('PICS=1');
let okN = 0, badN = 0;
const ok = (c, m) => { if (c) okN++; else badN++; console.log(c ? 'ok  ' : 'FAIL', m); };
const WY = 128, UH = 64, WS = 208;      // (the window: 13 chunks a side since 11-27)
function world(genVer) {
  const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
  let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
  const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
  const call = (f) => s.as('pen', f);
  s.poke('genVer', genVer);
  const go = (dim, x, z) => {
    s.poke('tStage', dim); s.poke('tX', x); s.poke('tZ', z); s.poke('testCmd', 4); F(2);
    let k = 0; while (s.peek('gState') !== 2 && k < 3000) { F(1); k++; }
    s.poke('gameMode', 1); s.poke('flying', 1);
    // the chunks round the player
    let last = -1, same = 0; k = 0;
    while (same < 40 && k < 3000) { const y = s.peek('py'); F(1); s.poke('py', y); s.poke('pvy', 0); const c = s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; }
  };
  const col = (x, z) => { const W = s.peek('W'); const b = ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY; return W.slice(b, b + WY); };
  const hm = (x, z) => s.peek('HMAP')[(((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)];
  const loaded = (x, z) => call(() => s.fn.cOK(x, z)) === 1;
  return { s, F, call, go, col, hm, loaded };
}
const SOLID = (b) => b !== 0 && b !== 35 && b !== 7;
const shots = [];
async function shot(w, name, x, y, z, yaw, pitch) {
  if (!PICS) return;
  if (w.s.peek('viewR') < 48) { w.s.poke('autoView', 0); w.s.poke('viewWant', 48); w.call(() => w.s.fn.setView(48)); }
  w.s.poke('px', x); w.s.poke('py', y); w.s.poke('pz', z); w.s.poke('yaw', yaw); w.s.poke('pitch', pitch); w.s.poke('pvy', 0);
  for (let i = 0; i < 12; i++) { w.s.frame(); w.s.poke('py', y); w.s.poke('pvy', 0); }
  const f = `test/terrain32_${name}.png`;
  await w.s.png(f); shots.push(f);
}

// ---------------------------------------------------------------- the depths, new
{
  const w = world(1);
  w.go(1, 1.5, 1.5);
  ok(w.s.peek('dim') === 1, `in the depths (chunks ${w.s.peek('nChunks')})`);
  const px = Math.floor(w.s.peek('px')), pz = Math.floor(w.s.peek('pz'));
  let cols = 0, stand = 0, real = 0, lava = 0, air = 0, cells = 0, multi = 0, glow = 0, solidCol = 0;
  const band = [0, 0, 0], biome = {};
  const BIOM = w.s.peek('BIOM'), BSOL = w.s.peek('BSOL');
  for (let x = px - 56; x <= px + 56; x++) for (let z = pz - 56; z <= pz + 56; z++) {
    if (!w.loaded(x, z)) continue;
    const c = w.col(x, z), h = w.hm(x, z);
    cols++;
    const bi = BIOM[(((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)]; biome[bi] = (biome[bi] || 0) + 1;
    if (h > 12 && h < UH - 3) { stand++; if (SOLID(c[h]) && BSOL[c[h + 1]] === 0) real++; }
    if (h >= UH - 3) solidCol++;
    let l = 0, surf = 0;
    for (let y = 1; y <= 12; y++) if (c[y] === 35) l = 1;
    lava += l;
    for (let y = 13; y <= 61; y++) { cells++; if (c[y] === 0) air++; if (c[y] === 50) glow++; }
    for (let y = 13; y < 58; y++) if (SOLID(c[y]) && c[y + 1] === 0 && c[y + 2] === 0 && c[y + 3] === 0) { surf++; if (y <= 21) band[0]++; else if (y <= 34) band[1]++; else band[2]++; }
    if (surf >= 2) multi++;
  }
  console.log(`columns ${cols}: standable ${stand} (real ${real}), all rock ${solidCol}, with lava ${lava}, air ${(air / cells * 100).toFixed(1)}%, floors low/mid/high ${band.join('/')}, with two floors or more ${multi}, glow ${glow}, biomes ${JSON.stringify(biome)}`);
  ok(cols > 5000, 'chunks made');
  ok(stand / cols > 0.55, `a floor to stand on over the lava in most columns (${(stand / cols * 100).toFixed(0)}%)`);
  ok(real / stand > 0.97, `HMAP is a real surface (${(real / stand * 100).toFixed(1)}%)`);
  ok(lava / cols > 0.1 && lava / cols < 0.6, `a lava sea (${(lava / cols * 100).toFixed(0)}% of the columns)`);
  ok(air / cells > 0.3 && air / cells < 0.75, `open space ${(air / cells * 100).toFixed(0)}%`);
  ok(band[0] > 300 && band[1] > 300 && band[2] > 300, 'floors at three heights (ground, lower shelf, upper shelf)');
  ok(multi / cols > 0.08, `overhangs: ${(multi / cols * 100).toFixed(0)}% of the columns have a floor over a floor`);
  ok(solidCol / cols > 0.03 && solidCol / cols < 0.4, `walls and columns (${(solidCol / cols * 100).toFixed(0)}% all rock)`);
  ok(glow > 20, `glowing crystals (${glow})`);
  // a gate made here stands on a floor with room (makeGateNear, as arriving through a fire veil)
  w.call(() => { w.s.fn.makeGateNear(px + 5, pz + 5); w.s.fn.findVeil(px + 5, pz + 5); });
  const vy = w.s.peek('veilY'), vx = w.s.peek('veilX'), vz = w.s.peek('veilZ');
  ok(vy > 12 && vy < 58, `a gate can be made near (${vx}, ${vy}, ${vz})`);
  // pictures: from the ground and from the air, several ways
  if (PICS) {
    let k = 0;
    for (const [dx, dz] of [[0, 0], [24, 8], [-20, 28], [30, -30], [-34, -12], [8, 40]]) {
      const x = px + dx, z = pz + dz, h = w.hm(x, z);
      if (h >= UH - 3) continue;
      await shot(w, `u${k}a`, x + 0.5, Math.max(h, 12) + 2.7, z + 0.5, 40 + k * 70, -4);
      await shot(w, `u${k}b`, x + 0.5, Math.min(48, Math.max(h, 12) + 14), z + 0.5, 200 + k * 50, -28);
      k++;
    }
  }
  // the other parts of the depths: the nearest of each, looked at the same way
  const near = {};
  for (let r = 16; r <= 900; r += 16) for (let a = 0; a < 360; a += 12) {
    const x = Math.round(Math.cos(a / 57.3) * r), z = Math.round(Math.sin(a / 57.3) * r);
    w.call(() => w.s.fn.ashBiome(x, z)); const b = w.s.peek('abm');
    w.call(() => w.s.fn.ashBiome(x + 20, z + 20)); const b2 = w.s.peek('abm');
    w.call(() => w.s.fn.ashBiome(x - 20, z - 20)); const b3 = w.s.peek('abm');
    if (b === b2 && b === b3 && !near[b]) near[b] = [x, z];
  }
  console.log('parts found', JSON.stringify(near));
  const NAME = { 22: 'ember forest', 23: 'indigo forest', 24: 'wailing valley', 25: 'basalt deltas' };
  const count = (cx, cz, f, only) => { let n = 0, cols = 0, rock = 0, lav = 0; const W = w.s.peek('W'), BM = w.s.peek('BIOM'); for (let x = cx - 40; x <= cx + 40; x++) for (let z = cz - 40; z <= cz + 40; z++) { if (!w.loaded(x, z)) continue; if (only && BM[(((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)] !== only) continue; cols++; const b = ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY; if (w.hm(x, z) >= UH - 3) rock++; let l = 0; for (let y = 2; y < 62; y++) { if (f(W[b + y])) n++; if (y <= 12 && W[b + y] === 35) l = 1; } lav += l; } return { n, cols, rock, lav }; };
  const ID = (n) => w.s.peek(n);
  for (const bi of [22, 23, 24, 25]) {
    if (!near[bi]) { console.log('(no', NAME[bi], 'within 900 blocks)'); continue; }
    const [bx, bz] = near[bi];
    w.go(1, bx + 0.5, bz + 0.5);
    const qx = Math.floor(w.s.peek('px')), qz = Math.floor(w.s.peek('pz'));
    if (bi === 22 || bi === 23) {
      const moss = bi === 22 ? ID('I_emberMoss') : ID('I_indigoMoss'), vine = bi === 22 ? ID('I_emberVines') : ID('I_indigoVines');
      const a = count(qx, qz, (v) => v === moss), c = count(qx, qz, (v) => v === vine), d = count(qx, qz, (v) => v === ID('I_shroomLantern'));
      ok(a.n > 800 && c.n > 10 && d.n > 0, `the ${NAME[bi]} at ${bx} ${bz}: moss ${a.n}, vines ${c.n}, lanterns of its trees ${d.n}`);
    }
    if (bi === 24) { const a = count(qx, qz, (v) => v === ID('I_wailSand') || v === ID('I_wailSoil'), 24); ok(a.n > 2000 && a.rock / a.cols < 0.08, `the wailing valley at ${bx} ${bz}: its ground ${a.n}, open (${(a.rock / a.cols * 100).toFixed(0)}% all rock)`); }
    if (bi === 25) { const a = count(qx, qz, (v) => v === 53, 25); ok(a.n > 1500 && a.lav / a.cols > 0.1, `the basalt deltas at ${bx} ${bz}: basalt ${a.n}, lava in ${(a.lav / a.cols * 100).toFixed(0)}% of the columns`); }
    const h = w.hm(qx, qz);
    await shot(w, `b${bi}a`, qx + 0.5, Math.min(52, Math.max(h < UH - 3 ? h : 30, 12) + 2.7), qz + 0.5, 30, -4);
    await shot(w, `b${bi}b`, qx + 0.5, Math.min(50, Math.max(h < UH - 3 ? h : 30, 12) + 13), qz + 0.5, 210, -26);
  }
  // a fort line: its floor is there, the way over it is open (it cuts through the land), its pillars stand
  {
    let fz = null;
    for (let z = 40; z < 1000 && fz === null; z += 80) { if (w.call(() => w.s.fn.fortX(z)) === 1) fz = z; else if (w.call(() => w.s.fn.fortX(-z)) === 1) fz = -z; }
    if (fz === null) console.log('(no fort line within 1000 blocks)');
    else {
      w.go(1, 20.5, fz + 12.5);
      const qx = Math.floor(w.s.peek('px')), gx = w.s.peek('veilX');
      let fl = 0, open = 0, n = 0, foot = 0, feet = 0;
      for (let x = qx - 40; x <= qx + 40; x++) { if (!w.loaded(x, fz)) continue; const c = w.col(x, fz); n++; if (c[30] === 52) fl++; if (!SOLID(c[31]) && !SOLID(c[32]) && !SOLID(c[33])) open++; }
      for (let x = qx - 40; x <= qx + 40; x++) { if (((x % 8) + 8) % 8 !== 0 || !w.loaded(x, fz - 2) || Math.abs(x - gx) < 6) continue; const c = w.col(x, fz - 2); feet++; let y = 29; while (y > 1 && c[y] === 52) y--; if (y < 29 && (SOLID(c[y]) || y === 1)) foot++; if (y === 29 && SOLID(c[29])) foot++; }
      ok(n > 40 && fl === n && open >= n * 0.9, `the fort bridge at z ${fz}: floor ${fl}/${n}, open over it ${open}`);
      ok(feet > 0 && foot === feet, `its pillars stand on the ground or the sea's bed (${foot}/${feet})`);
      await shot(w, 'fort', qx + 0.5, 32, fz + 0.5, 90, -8);
    }
  }
  // a bastion: its walls are whole, its hall is open, it stands on pillars
  {
    let best = null;
    for (let rx = -3; rx <= 3; rx++) for (let rz = -3; rz <= 3; rz++) { w.call(() => w.s.fn.structIn(16, rx, rz)); if (w.s.peek('stOk') === 1) { const x = w.s.peek('stX'), z = w.s.peek('stZ'); if (!best || Math.hypot(x, z) < Math.hypot(best[0], best[1])) best = [x, z]; } }
    if (!best) console.log('(no bastion near)');
    else {
      w.go(1, best[0] + 20.5, best[1] + 0.5);
      const [bx, bz] = best, BR = w.s.peek('I_blackrockBricks'), CR = w.s.peek('I_crackedBlackrockBricks');
      let wall = 0, wn = 0, hall = 0, hn = 0, legs = 0, ln = 0;
      for (let d = -14; d <= 14; d++) { if (!w.loaded(bx + d, bz - 14)) continue; const c = w.col(bx + d, bz - 14); for (let y = 24; y <= 33; y++) { wn++; if (c[y] === BR || c[y] === CR) wall++; } }
      for (let d = -8; d <= 8; d += 4) { if (!w.loaded(bx + d, bz + 5)) continue; const c = w.col(bx + d, bz + 5); for (let y = 19; y <= 23; y++) { hn++; if (!SOLID(c[y])) hall++; } }
      for (let d = -14; d <= 14; d += 14) { if (!w.loaded(bx + d, bz + 14)) continue; const c = w.col(bx + d, bz + 14); ln++; let y = 17; while (y > 1 && c[y] === w.s.peek('I_blackrock')) y--; if (SOLID(c[y]) || c[y] === 6) legs++; }
      ok(wn > 100 && wall > wn * 0.9, `the bastion at ${bx} ${bz}: its wall ${wall}/${wn}`);
      ok(hall > hn * 0.8 && ln > 0 && legs === ln, `its hall is open (${hall}/${hn}), it stands on something (${legs}/${ln})`);
      await shot(w, 'bast', bx + 24.5, 30, bz + 0.5, 270, -6);
    }
  }
  w.go(1, 1.5, 1.5);
  // the land without the game: the old columns are not these
  let diff = 0, n = 0;
  for (let x = px - 30; x <= px + 30; x += 6) for (let z = pz - 30; z <= pz + 30; z += 6) {
    if (!w.loaded(x, z)) continue;
    const h1 = w.hm(x, z); w.call(() => w.s.fn.genColumnU0(x, z)); const h0 = w.hm(x, z); w.call(() => w.s.fn.genColumnU(x, z));
    n++; if (h0 !== h1) diff++;
  }
  ok(diff > n * 0.6, `the new land is not the old one (${diff}/${n} floors differ)`);
}

// ---------------------------------------------------------------- the void, new
{
  const w = world(1);
  w.go(2, 0.5, -47.5);
  ok(w.s.peek('dim') === 2, `in the void at ${w.s.peek('px').toFixed(1)} ${w.s.peek('py').toFixed(1)} ${w.s.peek('pz').toFixed(1)}`);
  const top = (x, z) => { w.call(() => w.s.fn.findTop(x, z)); return w.s.peek('topY'); };
  ok(top(0, -48) >= 37 && top(0, -48) <= 43, `land where one arrives (${top(0, -48)})`);
  // (to the middle: the whole island in the window)
  w.s.poke('px', 0.5); w.s.poke('pz', 0.5); w.s.poke('py', 62);
  { let last = -1, same = 0, k = 0; while (same < 40 && k < 3000) { w.F(1); w.s.poke('py', 62); w.s.poke('pvy', 0); const c = w.s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; } }
  ok(top(0, 0) === 40, `the middle of the island at 40 (${top(0, 0)})`);
  ok(top(50, 0) >= 37 && top(50, 0) <= 43, `land at the far gate's place (${top(50, 0)})`);
  let cr = 0, ob = 0;
  for (let k = 0; k < 8; k++) {
    w.call(() => w.s.fn.pillarAt(k));
    const x = w.s.peek('pilX'), z = w.s.peek('pilZ'), h = w.s.peek('pilH'), c = w.col(x, z);
    if (c[h + 1] === 57) cr++; if (c[h] === 34 && c[31] === 34) ob++;
  }
  ok(cr === 8 && ob === 8, `the eight pillars with their crystals (${cr}, ${ob})`);
  ok(w.s.peek('bossE') > 0 && w.s.peek('nCrystal') === 8, `the warden is there, asleep (crystals ${w.s.peek('nCrystal')})`);
  // its shape: top heights, the underside
  const isl = (x, z) => { w.call(() => w.s.fn.voidIsland(x, z)); return [w.s.peek('vTop'), w.s.peek('vBot'), w.s.peek('vTop2'), w.s.peek('vBot2')]; };
  let tmin = 99, tmax = 0, dmid = 0, drim = 0, nr = 0, rmin = 999, rmax = 0;
  for (let a = 0; a < 360; a += 5) {
    let r = 0; while (r < 100 && isl(Math.round(Math.cos(a / 57.3) * r), Math.round(Math.sin(a / 57.3) * r))[0] >= 0) r++;
    rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
    const [t, b] = isl(Math.round(Math.cos(a / 57.3) * (r - 3)), Math.round(Math.sin(a / 57.3) * (r - 3)));
    drim += t - b; nr++;
    for (let q = 10; q < r - 2; q += 7) { const [t2] = isl(Math.round(Math.cos(a / 57.3) * q), Math.round(Math.sin(a / 57.3) * q)); tmin = Math.min(tmin, t2); tmax = Math.max(tmax, t2); }
  }
  dmid = isl(0, 0)[0] - isl(0, 0)[1];
  console.log(`island: edge at ${rmin}..${rmax}, top ${tmin}..${tmax}, ${dmid} thick in the middle, ${(drim / nr).toFixed(1)} near the rim`);
  ok(rmin >= 58 && rmax <= 84 && rmax - rmin >= 6, 'a broad island with a ragged edge');
  ok(tmax - tmin >= 2 && tmax - tmin <= 6, 'a gently uneven top');
  ok(dmid >= 24 && drim / nr < 10, 'thick in the middle, thin at the rim');
  // the gap, and the outer land
  let gap = 0, gn = 0;
  for (let x = -320; x <= 320; x += 9) for (let z = -320; z <= 320; z += 9) { const d = Math.hypot(x, z); if (d > 90 && d < 325) { gn++; const v = isl(x, z); if (v[0] >= 0 || v[2] >= 0) gap++; } }
  ok(gap === 0, `nothing between the island and the outer land (${gap}/${gn})`);
  let land = 0, small = 0, on = 0, hs = new Set(), thick = 0;
  for (let x = 420; x <= 900; x += 4) for (let z = -240; z <= 240; z += 4) { on++; const v = isl(x, z); if (v[0] >= 0) { land++; hs.add(v[0]); if (v[0] - v[1] >= 12) thick++; } if (v[2] >= 0) small++; }
  console.log(`outer land: ${(land / on * 100).toFixed(0)}% of the columns, tops ${Math.min(...hs)}..${Math.max(...hs)}, thick ${thick}, small islands' columns ${small}`);
  ok(land / on > 0.15 && land / on < 0.6, 'islands and gaps between them');
  ok(Math.max(...hs) - Math.min(...hs) >= 8, 'islands at heights of their own');
  ok(small > 50 && thick > 100, 'small floating islands, and big thick ones');
  // cities still find land, the far gate still finds one
  let city = 0;
  for (let cx = 26; cx < 60; cx++) for (let cz = -8; cz <= 8; cz++) if (w.call(() => w.s.fn.cityIn(cx, cz)) === 1) city++;
  ok(city >= 3, `cities on the outer islands (${city} in 34 x 17 chunks)`);
  await shot(w, 'v0', 0.5, 43, -47.5, 0, 6);
  await shot(w, 'v1', -34, 64, -34, 45, -32);
  await shot(w, 'v2', 0.5, 6, -58, 0, 38);
  await shot(w, 'v2b', 84, 44, 6, 270, -6);
  // the warden falls: the gate home in the middle of the island, the far gate at its place
  w.s.poke('px', 0.5); w.s.poke('pz', 0.5); w.s.poke('py', 62);
  // (back in the middle after the pictures: the island in the window again, the warden there)
  { let last = -1, same = 0, k = 0; while ((same < 60 || !(w.s.peek('bossE') > 0)) && k < 3000) { w.F(1); w.s.poke('py', 62); w.s.poke('pvy', 0); const c = w.s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; } }
  w.call(() => { for (let k = 0; k < 8; k++) { w.s.fn.pillarAt(k); w.s.fn.setBlock(w.s.peek('pilX'), w.s.peek('pilH') + 1, w.s.peek('pilZ'), 0); } });
  for (let i = 0; i < 60; i++) { w.F(1); w.s.poke('py', 62); w.s.poke('pvy', 0); }
  w.call(() => { w.s.fn.mobHurt(w.s.peek('bossE'), 999, 0, 0); });
  w.F(5);
  const B = (x, y, z) => w.call(() => w.s.fn.blockAt(x, y, z));
  const ft = top(50, 0);
  ok(w.s.peek('bossDead') === 1 && B(0, 40, 0) === 56 && B(1, 40, -1) === 56 && B(50, ft + 1, 0) === 63, `the warden fallen: the gate home at the middle (${B(0, 40, 0)}), the far gate (${B(50, ft + 1, 0)})`);
  // out to the far land: made, with spires
  w.s.poke('bossDead', 1);
  let bx = 600, bz = 0, found = false;
  for (let cx = 30; cx < 60 && !found; cx++) for (let cz = -6; cz <= 6 && !found; cz++) if (w.call(() => w.s.fn.cityIn(cx, cz)) === 1) { found = true; bx = w.s.peek('ciX') - 6; bz = w.s.peek('ciZ') - 6; }
  w.call(() => w.s.fn.startTravel(2, bx + 0.5, bz + 0.5, 4));
  let k = 0; while (w.s.peek('gState') !== 2 && k < 3000) { w.F(1); k++; }
  w.s.poke('gameMode', 1); w.s.poke('flying', 1);
  { let last = -1, same = 0; k = 0; while (same < 40 && k < 3000) { const y = w.s.peek('py'); w.F(1); w.s.poke('py', y); w.s.poke('pvy', 0); const c = w.s.peek('nChunks'); if (c === last) same++; else { same = 0; last = c; } k++; } }
  const fx = Math.floor(w.s.peek('px')), fz = Math.floor(w.s.peek('pz'));
  ok(w.s.peek('py') > 20, `arrived on the outer land at ${fx} ${w.s.peek('py').toFixed(0)} ${fz}`);
  let rods = 0, stone = 0, cityB = 0;
  const ROD = w.s.peek('I_voidRod') ?? null;
  const W = w.s.peek('W');
  for (let x = fx - 56; x <= fx + 56; x++) for (let z = fz - 56; z <= fz + 56; z++) {
    if (!w.loaded(x, z)) continue;
    const b = ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY;
    for (let y = 10; y < 100; y++) { const v = W[b + y]; if (v === 54) stone++; if (v === 65) cityB++; if (ROD !== null && v === ROD) rods++; }
  }
  console.log(`out there: void stone ${stone}, city bricks ${cityB}, rods ${rods} (rod id ${ROD})`);
  ok(stone > 20000, 'the outer land is made');
  ok(cityB > 100, 'a city stands on it');
  if (ROD !== null) ok(rods > 0, 'spires with their rods');
  await shot(w, 'v3', fx + 0.5, w.s.peek('py') + 2, fz + 0.5, 30, -2);
  await shot(w, 'v4', fx - 16, w.s.peek('py') + 22, fz - 16, 45, -35);
  await shot(w, 'v5', fx + 14, w.s.peek('py') - 16, fz + 22, 210, 30);
  await shot(w, 'v6', fx - 30, w.s.peek('py') + 6, fz + 10, 100, -8);
}

// ---------------------------------------------------------------- a world from before: its land as it was
{
  const w = world(0);
  w.go(1, 1.5, 1.5);
  const px = Math.floor(w.s.peek('px')), pz = Math.floor(w.s.peek('pz'));
  // (the values the old generator gave for seed 1234, taken from genColumnU0 / voidIsland0 as they were kept)
  const GOLD_U = { '0,0': null, '10,-7': null, '-13,22': null, '25,25': null, '-30,-18': null };
  let same = 0, n = 0, rows = [];
  for (const key of Object.keys(GOLD_U)) {
    const [x, z] = key.split(',').map(Number);
    const h1 = w.hm(x, z), c1 = w.col(x, z);
    w.call(() => w.s.fn.genColumnU0(x, z));
    const h0 = w.hm(x, z), c0 = w.col(x, z);
    // (rows 1 and 62 are bedrock by chance; ores, plants and forts came after: only rock/open/lava is looked at)
    let d = 0;
    for (let y = 2; y < 62; y++) { const a = c1[y] === 0 ? 0 : c1[y] === 35 ? 35 : 1, b = c0[y] === 0 ? 0 : c0[y] === 35 ? 35 : 1; if (a !== b) d++; }
    n++; if (h0 === h1 && d <= 12) same++;
    rows.push(`${key}:${h1}/${h0}/${d}`);
  }
  console.log('old depths: floor in the world / from genColumnU0 / cells that differ (features):', rows.join(' '));
  ok(same === n, `a world from before has the old depths (${same}/${n})`);
  const GOLD_H = [43, 12, 13, 10, 47];
  const got = Object.keys(GOLD_U).map((key) => { const [x, z] = key.split(',').map(Number); return w.hm(x, z); });
  ok(JSON.stringify(got) === JSON.stringify(GOLD_H), `the old floors of seed 1234 (${got.join(' ')})`);
  w.go(2, 0.5, -47.5);
  const isl = (x, z) => { w.call(() => w.s.fn.voidIsland(x, z)); return [w.s.peek('vTop'), w.s.peek('vBot'), w.s.peek('vTop2')]; };
  const isl0 = (x, z) => { w.call(() => w.s.fn.voidIsland0(x, z)); return [w.s.peek('vTop'), w.s.peek('vBot')]; };
  let eq = 0, m = 0;
  for (const [x, z] of [[0, 0], [30, 10], [-55, 20], [70, 0], [150, 150], [420, 60], [500, -200], [640, 33], [-700, 90]]) { const a = isl(x, z), b = isl0(x, z); m++; if (a[0] === b[0] && a[1] === b[1] && a[2] === -1) eq++; }
  ok(eq === m, `and the old void (${eq}/${m})`);
  const GOLD_V = [[40, 13], [40, 19], [40, 34]];
  const gv = [[0, 0], [30, 10], [-55, 20]].map(([x, z]) => isl0(x, z));
  ok(JSON.stringify(gv) === JSON.stringify(GOLD_V), `the old island of seed 1234 (${JSON.stringify(gv)})`);
  const top = (x, z) => { w.call(() => w.s.fn.findTop(x, z)); return w.s.peek('topY'); };
  ok(top(0, 0) === gv[0][0], `made as the old one (top ${top(0, 0)})`);
}

if (PICS && shots.length) {
  const sharp = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url))('sharp');
  const tw = 480, thh = 270, per = 4, rows = Math.ceil(shots.length / per);
  const comp = [];
  for (let i = 0; i < shots.length; i++) comp.push({ input: await sharp(shots[i]).resize(tw, thh).toBuffer(), left: (i % per) * tw, top: Math.floor(i / per) * thh });
  await sharp({ create: { width: tw * per, height: thh * rows, channels: 3, background: '#000' } }).composite(comp).png().toFile('test/terrain32_sheet.png');
  console.log('sheet test/terrain32_sheet.png of', shots.length);
}
console.log(`${okN} ok, ${badN} failed`);
process.exit(badN ? 1 : 0);
