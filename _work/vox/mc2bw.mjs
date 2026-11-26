// (v3.5, 11-26) A world save of the genre's Java edition (1.13 .. 1.16.5 and on: mcworld.mjs) into Block World's
// map data, the text pasted on the new-world or new-server screen (src/mapdata.js):
//   node mc2bw.mjs <world folder> <out.txt> [dx=..] [dy=0] [dz=..] [ymin=..] [flat=...] [box=x0,y0,z0,x1,y1,z1] [keep=0]
// The save's flat layers are the map's (a flat world of the same layers), and every block over them goes into
// the map at (x + dx, y + dy, z + dz) with the block of this world that is the same thing: the spark parts by
// their state (power, facing, delay, mode, lit), slabs by their half, the rest by their name. What this world
// has no block for is listed and left out. Signs keep their words (a sign here is read, not written on).
// The block numbers are read from the game itself (the simulator), so the table follows content.mjs.
// With the blocks the map says (its twelfth part, src/mapdata.js): where the save's player stood and looked
// (spawn=), the outputs of the comparators that are on (cmp=), the chunks the machine is in for the world to
// keep made (keep=: a machine wider than the circle of chunks round the player works whole), and how far it
// was moved (hash=: its wires settle in the order they did where it was made). Without dx and dz the map is
// moved less than a chunk each way, to where the machine takes the fewest chunks (keep=0: no chunks kept).
import fs from 'node:fs';
import { createSim } from './sim.mjs';
import { readLevel, eachBlock, eachChunk } from './mcworld.mjs';

// D6 of this world: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z (power.js)
const D6 = { west: 0, east: 1, down: 2, up: 3, north: 4, south: 5 }, OP = [1, 0, 3, 2, 5, 4];
const RS = { wire: 1, repeater: 2, comparator: 3, torch: 4, lever: 5, button: 6, block: 8, piston: 11, head: 12, lamp: 13 };

export function bwTables() {
  const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
  for (let i = 0; i < 5; i++) s.frame();
  const T = {};
  for (const n of ['ITKEY', 'BRS', 'BFAC', 'BATT', 'BAUX', 'BON', 'BKIND', 'BVAR']) T[n] = s.peek(n).slice();
  T.kind = new Map();
  for (let b = 1; b < T.BRS.length; b++) { const k = T.BKIND[b]; if (!T.kind.has(k)) T.kind.set(k, []); T.kind.get(k).push(b); }
  T.byKey = new Map();
  for (let b = 1; b < T.BRS.length; b++) if (T.BKIND[b] === b) T.byKey.set(String(T.ITKEY[b]), b);
  return T;
}
// the block of this world for a block of the save: a number, or -1 (nothing here is it)
export function makeMapper(T) {
  const kindOf = (key) => { const k = T.byKey.get(key); if (k === undefined) throw new Error('no block ' + key); return k; };
  const find = (key, test) => { const k = kindOf(key); for (const b of T.kind.get(k)) if (test(b)) return b; throw new Error('no variant of ' + key); };
  const on = (p) => (p.powered === 'true' || p.lit === 'true' || p.extended === 'true' ? 1 : 0);
  // what a part hangs on: the floor, the ceiling, or the wall behind it
  const hung = (p) => (p.face === 'floor' ? 2 : p.face === 'ceiling' ? 3 : OP[D6[p.facing]]);
  const memo = new Map();
  const map1 = (name, p) => {
    if (name === 'redstone_wire') return kindOf('spark_wire') + Number(p.power || 0);
    if (name === 'redstone_torch') return find('spark_torch', (b) => T.BATT[b] === 2 && T.BON[b] === on(p));
    if (name === 'redstone_wall_torch') return find('spark_torch', (b) => T.BATT[b] === OP[D6[p.facing]] && T.BON[b] === on(p));
    // (facing names the side the signal comes in at: it goes out the other way)
    if (name === 'repeater') return find('repeater', (b) => T.BFAC[b] === OP[D6[p.facing]] && T.BAUX[b] === Number(p.delay || 1) && T.BON[b] === on(p));
    if (name === 'comparator') return find('comparator', (b) => T.BFAC[b] === OP[D6[p.facing]] && T.BAUX[b] === (p.mode === 'subtract' ? 1 : 0) && T.BON[b] === on(p));
    if (name === 'redstone_lamp') return find('spark_lamp', (b) => T.BRS[b] === RS.lamp && T.BON[b] === on(p));
    if (name === 'redstone_block') return kindOf('spark_block');
    if (name === 'lever') return find('lever', (b) => T.BATT[b] === hung(p) && T.BON[b] === on(p));
    if (/_button$/.test(name)) { const key = T.byKey.has(name) ? name : name === 'stone_button' || /blackstone/.test(name) ? 'stone_button' : 'oak_button'; return find(key, (b) => T.BATT[b] === hung(p)); }
    if (name === 'piston' || name === 'sticky_piston') return find(name, (b) => T.BFAC[b] === D6[p.facing] && T.BON[b] === on(p));
    if (name === 'piston_head') return find('piston_head', (b) => T.BFAC[b] === D6[p.facing] && T.BAUX[b] === (p.type === 'sticky' ? 1 : 0));
    if (/_wall_sign$|_sign$/.test(name)) { const key = name.replace('_wall_sign', '_sign'); return kindOf(T.byKey.has(key) ? key : 'oak_sign'); }
    if (/_slab$/.test(name) && T.byKey.has(name)) { const v = p.type === 'top' ? 1 : p.type === 'double' ? 2 : 0; return find(name, (b) => T.BVAR[b] === v); }
    // the rest: the block of the same name, when it is one block and no part
    if (T.byKey.has(name)) { const k = T.byKey.get(name); if (T.kind.get(k).length === 1 && T.BRS[k] === 0) return k; }
    return -1;
  };
  return (name, p) => {
    const key = name + '|' + Object.keys(p).sort().map((q) => q + '=' + p[q]).join(',');
    if (!memo.has(key)) memo.set(key, map1(name, p));
    return memo.get(key);
  };
}
// a sign's four lines (JSON text components) as one line
function signText(t) {
  const line = (s) => { try { const j = JSON.parse(s); return typeof j === 'string' ? j : (j.text || '') + (j.extra || []).map((e) => (typeof e === 'string' ? e : e.text || '')).join(''); } catch (e) { return String(s || ''); } };
  return [t.Text1, t.Text2, t.Text3, t.Text4].map(line).map((s) => s.trim()).filter(Boolean).join(' ');
}
const enc = (s) => String(s).replace(/\|/g, '｜').replace(/~/g, '∼').replace(/\^/g, '＾').replace(/;/g, ',');

// the save in `dir` as map data: { text, blocks, signs, skipped: { name: count }, box }
const PART = /^(redstone_wire|redstone_torch|redstone_wall_torch|repeater|comparator|redstone_lamp|redstone_block|lever|.*_button|piston|sticky_piston|piston_head|observer|dispenser|dropper|hopper|.*pressure_plate|target|tnt|note_block|.*_door|.*trapdoor|.*fence_gate|.*rail)$/;
// the chunks a machine moved by (dx, dz) is in: every chunk with a block of it, and the chunk beside wherever a
// part is within two cells of a chunk's edge (a part asks about the cells two steps from it)
function chunksOf(cells, dx, dz) {
  const set = new Set(), add = (x, z) => set.add(Math.floor(x / 16) + ',' + Math.floor(z / 16));
  for (const [x0, , z0, part] of cells) {
    const x = x0 + dx, z = z0 + dz;
    add(x, z);
    if (part) { add(x - 2, z); add(x + 2, z); add(x, z - 2); add(x, z + 2); add(x - 1, z - 1); add(x + 1, z - 1); add(x - 1, z + 1); add(x + 1, z + 1); }
  }
  const list = [...set].map((k) => k.split(',').map(Number));
  const xs = list.map((c) => c[0]), zs = list.map((c) => c[1]);
  return { list, spanX: Math.max(...xs) - Math.min(...xs) + 1, spanZ: Math.max(...zs) - Math.min(...zs) + 1 };
}
export function convert(dir, { dx, dy = 0, dz, ymin, flat, box, signs: signWords, keep = 1 } = {}) {
  const L = readLevel(dir);
  // the flat layers of the save (1.13 .. 1.15: generatorOptions.layers; 1.16: WorldGenSettings)
  let layers = null;
  const go = L.generatorOptions;
  if (L.generatorName === 'flat' && go && go.layers) layers = go.layers;
  const wg = L.WorldGenSettings && L.WorldGenSettings.dimensions && L.WorldGenSettings.dimensions['minecraft:overworld'];
  if (!layers && wg && wg.generator && wg.generator.settings && wg.generator.settings.layers) layers = wg.generator.settings.layers;
  if (!layers && !flat) throw new Error('the save is not a flat world: give flat=... and ymin=...');
  const T = bwTables(), map = makeMapper(T);
  if (!flat) flat = layers.map((l) => { const n = String(l.block).replace(/^minecraft:/, ''); if (!T.byKey.has(n)) throw new Error('no block for the layer ' + n); return (l.height > 1 ? l.height + '*' : '') + n; }).join(',');
  if (ymin === undefined) ymin = layers ? layers.reduce((a, l) => a + Number(l.height), 0) : 0;
  const raw = [], skipped = {}, bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  eachBlock(dir, (x, y, z, name, p) => {
    if (y < ymin) return;
    if (box && (x < box[0] || y < box[1] || z < box[2] || x > box[3] || y > box[4] || z > box[5])) return;
    const b = map(name, p);
    if (b < 0) { skipped[name] = (skipped[name] || 0) + 1; return; }
    raw.push([x, y, z, PART.test(name) ? 1 : 0, b]);
  });
  // (not told where: moved less than a chunk each way, to where the machine is in the fewest chunks)
  if (dx === undefined || dz === undefined) {
    let best = null;
    for (let a = 0; a < 16; a++) for (let c = 0; c < 16; c++) {
      if ((dx !== undefined && a !== ((dx % 16) + 16) % 16) || (dz !== undefined && c !== ((dz % 16) + 16) % 16)) continue;
      const k = chunksOf(raw, a, c), cost = Math.max(k.spanX, k.spanZ) * 10000 + (k.spanX + k.spanZ) * 100 + k.list.length;
      if (!best || cost < best.cost) best = { a, c, cost };
    }
    if (dx === undefined) dx = best.a;
    if (dz === undefined) dz = best.c;
  }
  const kept = chunksOf(raw, dx, dz);
  const out = [];
  for (const [x, y, z, , b] of raw) {
    const X = x + dx, Y = y + dy, Z = z + dz;
    out.push([X, Y, Z, b]);
    bb[0] = Math.min(bb[0], X); bb[1] = Math.min(bb[1], Y); bb[2] = Math.min(bb[2], Z); bb[3] = Math.max(bb[3], X); bb[4] = Math.max(bb[4], Y); bb[5] = Math.max(bb[5], Z);
  }
  // (column by column, bottom up: what a part stands or hangs on is there before it)
  out.sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1]);
  const signs = [];
  eachChunk(dir, (c) => { for (const t of c.blockEntities) if (t.id === 'minecraft:sign' && t.y >= ymin) {
    let w = signText(t);
    if (signWords && signWords[w] !== undefined) w = signWords[w];
    if (w) signs.push(`${t.x + dx},${t.y + dy},${t.z + dz},0^${enc(w)}`);
  } });
  // the twelfth part: the place the cells are hashed at, where the player stood and looked, the chunks kept, the comparators
  const more = [`hash=${-dx},${-dy},${-dz}`];
  const P = L.Player;
  let spawn = null;
  if (P && P.Pos) {
    // (the genre's yaw: 0 south, 90 west; here 0 is +z and 90 +x)
    const yaw = P.Rotation ? ((Math.round(360 - P.Rotation[0]) % 360) + 360) % 360 : -1;
    spawn = [Math.round((P.Pos[0] + dx) * 10) / 10, Math.round(P.Pos[1] + dy), Math.round((P.Pos[2] + dz) * 10) / 10, yaw];
    more.push('spawn=' + spawn.join(','));
  }
  if (keep) more.push('keep=' + kept.list.map((c) => c.join(',')).join(','));
  const cmp = [];
  eachChunk(dir, (c) => { for (const t of c.blockEntities) if (t.id === 'minecraft:comparator' && t.y >= ymin && t.OutputSignal > 0) cmp.push([t.x + dx, t.y + dy, t.z + dz, t.OutputSignal].join(',')); });
  if (cmp.length) more.push('cmp=' + cmp.join(','));
  const text = `BWMAP1|1|${flat}|3|0|${out.length ? out.map((e) => e.join(',') + ',0').join(';') + ';' : '-'}|-|${signs.length ? signs.join('~') : '-'}|-|-|-|${more.join(';')}`;
  return { text, blocks: out.length, signs: signs.length, skipped, box: bb, flat, cells: out, dx, dy, dz, kept, spawn, comparators: cmp.length };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [dir, outFile, ...rest] = process.argv.slice(2);
  if (!dir || !outFile) { console.log('node mc2bw.mjs <world folder> <out.txt> [dx=0] [dy=0] [dz=0] [ymin=n] [flat=layers] [box=x0,y0,z0,x1,y1,z1]'); process.exit(0); }
  const o = {};
  for (const a of rest) { const [k, v] = a.split('='); o[k] = k === 'flat' ? v : k === 'box' ? v.split(',').map(Number) : Number(v); }
  const r = convert(dir, o);
  fs.writeFileSync(outFile, r.text);
  console.log(`${r.blocks} blocks, ${r.signs} signs, ${r.text.length} letters -> ${outFile}`);
  console.log(`layers ${r.flat} | moved by ${r.dx}, ${r.dy}, ${r.dz} | x ${r.box[0]}..${r.box[3]}, y ${r.box[1]}..${r.box[4]}, z ${r.box[2]}..${r.box[5]}`);
  console.log(`chunks ${r.kept.list.length} (${r.kept.spanX} by ${r.kept.spanZ}${r.kept.spanX > 9 || r.kept.spanZ > 9 ? ' - wider than the window of chunks holds with the player by it' : ''}) | the player at ${r.spawn ? r.spawn.join(', ') : '-'} | comparators on ${r.comparators}`);
  const sk = Object.keys(r.skipped);
  if (sk.length) console.log('left out (no such block here): ' + sk.map((k) => k + ' ' + r.skipped[k]).join(', '));
}
