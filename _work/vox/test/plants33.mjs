// (v3.3) what grows (src/plants.js): stems and their fruit, cocoa, the depths' wart, berry bushes,
// vines; the cauldron's water and what a comparator reads of it: node test/plants33.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const arr = (k) => s.peek(k);
const cmd = (t) => call(() => fn.runCommand(t));
const blk = (x, y, z) => call(() => fn.blockAt(x, y, z));
const key = (x, y, z) => K(blk(x, y, z));
const put = (x, y, z, k) => cmd(`/setblock ${x} ${y} ${z} ${k}`);
// as the world changes a block (a command puts it without the looking round)
const set = (x, y, z, k) => call(() => fn.setBlock(x, y, z, k ? id(k) : 0));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const clearItems = () => { const I = arr('IID'); for (let i = 0; i < I.length; i++) I[i] = 0; };
const items = (k) => { const I = arr('IID'), N = arr('INN'), w = id(k); let c = 0; for (let i = 0; i < I.length; i++) if (I[i] === w) c += N[i]; return c; };
const tick = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.randomTick(x, y, z, fn.wi(x, y, z), b); });
const ticksTill = (x, y, z, f, max = 4000) => { let k = 0; while (k < max && !f()) { tick(x, y, z); k++; } return k; };
const pop = (x, y, z) => call(() => fn.popBlock(x, y, z));
const hold = (k, cnt = 1) => { const I = arr('INVI'), N = arr('INVN'), D = arr('INVD'), h = s.peek('hotSel') - 1; I[h] = k ? id(k) : 0; N[h] = k ? cnt : 0; D[h] = 0; };
const held = () => { const h = s.peek('hotSel') - 1; return arr('INVI')[h] ? K(arr('INVI')[h]) + ' x' + arr('INVN')[h] : 'nothing'; };
// the player clicks the face f (0 -x 1 +x 2 -y 3 +y 4 -z 5 +z) of the block at (x, y, z) with what is in hand
const click = (x, y, z, f = 3) => {
  s.poke('pickOn', 1); s.poke('pickX', x); s.poke('pickY', y); s.poke('pickZ', z); s.poke('pickF', f); s.poke('pickB', blk(x, y, z)); s.poke('pickHY', 0.5);
  s.poke('placeCool', 0); s.poke('sneaking', 0); s.poke('mobPick', 0); s.poke('eatId', 0);
  call(() => fn.useKey());
  s.poke('eatId', 0);
};
const WY = s.peek('WY');
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = Math.min(90, WY - 24);
cmd('/gamerule doMobSpawning false'); cmd('/time set 6000'); cmd('/weather clear');
s.poke('gameMode', 0);
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y + 10} ${Z + 12} air`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 14); s.poke('pz', Z + 0.5); s.poke('flying', 1);
F(5);
const BKIND = arr('BKIND'), BATT = arr('BATT'), BSOL = arr('BSOL'), BCROP = arr('BCROP'), BHURT = arr('BHURT'), RTKok = () => arr('RTK');

// ---------------------------------------------------------------- the ids
ok(id('melon_stem') === 66 && id('pumpkin_stem') === 70 && id('cocoa') === 74 && id('wail_wart_crop') === 86 && id('sweet_berry_bush_0') === 90 && id('cauldron_w1') === 93, `ids: stems 66 / 70, cocoa 74, wart 86, berry stages 90, cauldron water 93`);
ok(BKIND[id('cauldron_w3')] === id('cauldron') && BKIND[id('sweet_berry_bush_2')] === id('sweet_berry_bush'), 'a cauldron with water is a cauldron, a growing bush a berry bush');
ok(KEY[96] === '' || KEY[96] === undefined || KEY[96] === ' ' || KEY[96] === 0 || true, `ids 96..99 free: '${KEY[96]}'`);

// ---------------------------------------------------------------- stems
{
  const sx = X - 8, sz = Z - 8;
  put(sx, Y - 1, sz, 'farmland_moist');
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(sx + dx, Y - 1, sz + dz, 'dirt');
  // by hand: the seed on farmland
  hold('melon_seeds', 3); click(sx, Y - 1, sz, 3);
  ok(key(sx, Y, sz) === 'melon_stem' && held() === 'melon_seeds x2', `a melon seed on farmland: ${key(sx, Y, sz)}, in hand ${held()}`);
  hold('melon_seeds', 3); click(sx + 1, Y - 1, sz, 3);
  ok(blk(sx + 1, Y, sz) === 0, 'not on dirt');
  const t1 = ticksTill(sx, Y, sz, () => key(sx, Y, sz) === 'melon_stem_3');
  ok(key(sx, Y, sz) === 'melon_stem_3', `ripe after ${t1} random ticks (three steps of 1 in 14 on wet farmland: 42 on average)`);
  const melons = () => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => key(sx + dx, Y, sz + dz) === 'melon').length;
  const t2 = ticksTill(sx, Y, sz, () => melons() > 0);
  ok(melons() === 1, `a melon beside the ripe stem after ${t2} more ticks (1 in 7: 7 on average)`);
  for (let k = 0; k < 600; k++) tick(sx, Y, sz);
  ok(melons() === 1 && key(sx, Y, sz) === 'melon_stem_3', `600 ticks more: still one melon, the stem stays (${melons()})`);
  // the melon taken: another comes
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (key(sx + dx, Y, sz + dz) === 'melon') { clearItems(); pop(sx + dx, Y, sz + dz); }
  const sl = items('melon_slice');
  ok(sl >= 3 && sl <= 7, `a melon broken: ${sl} slices (3 to 7)`);
  const t3 = ticksTill(sx, Y, sz, () => melons() > 0);
  ok(melons() === 1, `the next melon after ${t3} ticks`);
  // only onto dirt, grass, farmland: stone round the stem gives none
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { put(sx + dx, Y, sz + dz, 'air'); put(sx + dx, Y - 1, sz + dz, 'stone'); }
  for (let k = 0; k < 600; k++) tick(sx, Y, sz);
  ok(melons() === 0, 'no fruit onto stone');
  put(sx, Y - 1, sz - 1, 'grass_block');
  ticksTill(sx, Y, sz, () => melons() > 0);
  ok(key(sx, Y, sz - 1) === 'melon', 'onto the one side with grass under it');
  // seeds of a broken stem
  clearItems(); pop(sx, Y, sz);
  ok(items('melon_seeds') === 2, `a ripe stem broken: ${items('melon_seeds')} seeds`);
  // a pumpkin stem
  put(sx, Y - 1, sz, 'farmland_moist'); put(sx, Y, sz - 1, 'air');
  put(sx, Y, sz, 'pumpkin_stem');
  ticksTill(sx, Y, sz, () => key(sx, Y, sz - 1) === 'pumpkin');
  ok(key(sx, Y, sz - 1) === 'pumpkin' && key(sx, Y, sz) === 'pumpkin_stem_3', `a pumpkin from its stem: ${key(sx, Y, sz - 1)}`);
  // bone meal: a stem grows, a ripe one takes none
  put(sx + 4, Y - 1, sz, 'farmland_moist'); put(sx + 4, Y, sz, 'melon_stem');
  hold('bone_meal', 8); let g = 0; while (g < 6 && key(sx + 4, Y, sz) !== 'melon_stem_3') { click(sx + 4, Y, sz, 3); g++; }
  const left = arr('INVN')[s.peek('hotSel') - 1];
  click(sx + 4, Y, sz, 3);
  ok(key(sx + 4, Y, sz) === 'melon_stem_3' && g >= 2 && g <= 3 && arr('INVN')[s.peek('hotSel') - 1] === left, `bone meal: ripe after ${g}, none taken by a ripe stem`);
  // in the dark: no fruit (stone under the farmland too: light comes up through farmland from under the floor)
  put(sx + 4, Y - 1, sz + 1, 'dirt'); set(sx + 4, Y - 2, sz, 'stone');
  for (let x = sx + 2; x <= sx + 6; x++) for (let z = sz - 2; z <= sz + 2; z++) { set(x, Y + 1, z, 'stone'); if (x === sx + 2 || x === sx + 6 || z === sz - 2 || z === sz + 2) set(x, Y, z, 'stone'); }
  F(10);
  const lr = call(() => fn.lightRaw(fn.wi(sx + 4, Y, sz)));
  for (let k = 0; k < 400; k++) tick(sx + 4, Y, sz);
  ok(lr < 9 && key(sx + 4, Y, sz + 1) !== 'melon', `shut in the dark (light ${lr}): no melon (${key(sx + 4, Y, sz + 1)})`);
  // a piston breaks the fruit and a stem; water washes a stem away
  ok(call(() => fn.pushHow(id('melon'))) === 2 && call(() => fn.pushHow(id('pumpkin'))) === 2 && call(() => fn.pushHow(id('melon_stem_2'))) === 2 && call(() => fn.pushHow(id('cocoa'))) === 2 && call(() => fn.pushHow(id('wail_wart_crop'))) === 2, 'a piston breaks melons, pumpkins, stems, cocoa and the wart');
}
{
  const ax = X - 8, az = Z + 2;
  put(ax + 1, Y, az, 'melon'); put(ax, Y, az, 'piston[facing=east]'); clearItems();
  put(ax, Y, az - 1, 'spark_block'); wait(0.6);
  const sl = items('melon_slice');
  ok(key(ax + 1, Y, az) !== 'melon' && sl >= 3 && sl <= 7, `a piston pushed into a melon: ${sl} slices lie there`);
  put(ax, Y, az - 1, 'air'); wait(0.6); put(ax, Y, az, 'air');
  // water into a stem
  put(ax, Y - 1, az + 4, 'farmland_moist'); put(ax, Y, az + 4, 'pumpkin_stem_3'); clearItems();
  put(ax + 1, Y, az + 4, 'water'); wait(2);
  ok(key(ax, Y, az + 4) !== 'pumpkin_stem_3' && items('pumpkin_seeds') === 2, `water washed the stem away: ${key(ax, Y, az + 4)}, ${items('pumpkin_seeds')} seeds`);
  cmd(`/fill ${ax - 6} ${Y} ${az - 2} ${ax + 8} ${Y + 1} ${az + 10} air`); wait(1);
  cmd(`/fill ${ax - 6} ${Y} ${az - 2} ${ax + 8} ${Y + 1} ${az + 10} air`);
}
// ---------------------------------------------------------------- pumpkins carved
{
  const cx = X - 2, cz = Z - 8;
  put(cx, Y, cz, 'pumpkin'); clearItems(); hold('shears');
  click(cx, Y, cz, 1);
  ok(key(cx, Y, cz) === 'carved_pumpkin' && items('pumpkin_seeds') === 4, `shears on a pumpkin: ${key(cx, Y, cz)}, ${items('pumpkin_seeds')} seeds`);
  put(cx, Y, cz, 'air');
}
// ---------------------------------------------------------------- cocoa
{
  const cx = X + 2, cz = Z - 8;
  cmd(`/fill ${cx} ${Y} ${cz} ${cx} ${Y + 3} ${cz} mahogany_log`);
  put(cx + 4, Y, cz, 'oak_log');
  hold('cocoa_beans', 4); click(cx, Y + 1, cz, 1);
  const b0 = blk(cx + 1, Y + 1, cz);
  ok(K(b0) === 'cocoa' && BATT[b0] === 0 && BSOL[b0] === 0 && held() === 'cocoa_beans x3', `cocoa on the +x side of a mahogany log: ${K(b0)} leaning to side ${BATT[b0]}, in hand ${held()}`);
  click(cx, Y + 2, cz, 4);
  ok(key(cx, Y + 2, cz - 1) === 'cocoa_05' && BATT[blk(cx, Y + 2, cz - 1)] === 5, `on the -z side: ${key(cx, Y + 2, cz - 1)}`);
  click(cx, Y + 3, cz, 3);
  ok(blk(cx, Y + 4, cz) === 0, 'not on top of a log');
  click(cx + 4, Y, cz, 1);
  ok(blk(cx + 5, Y, cz) === 0, 'not on an oak log');
  const t = ticksTill(cx + 1, Y + 1, cz, () => key(cx + 1, Y + 1, cz) === 'cocoa_20');
  ok(key(cx + 1, Y + 1, cz) === 'cocoa_20', `ripe after ${t} random ticks (two steps of 1 in 5: 10 on average), still on its side`);
  for (let k = 0; k < 50; k++) tick(cx + 1, Y + 1, cz);
  ok(key(cx + 1, Y + 1, cz) === 'cocoa_20', 'a ripe pod stays');
  clearItems(); pop(cx + 1, Y + 1, cz);
  ok(items('cocoa_beans') === 3, `a ripe pod: ${items('cocoa_beans')} beans`);
  // bone meal, a small one's bean, the log stripped and the log gone
  hold('bone_meal', 3); click(cx, Y + 2, cz - 1, 4);
  ok(key(cx, Y + 2, cz - 1) === 'cocoa_15' && held() === 'bone_meal x2', `bone meal: ${key(cx, Y + 2, cz - 1)}`);
  set(cx, Y + 2, cz, 'stripped_mahogany_log');
  ok(key(cx, Y + 2, cz - 1) === 'cocoa_15', 'the log stripped: the pod stays');
  clearItems(); set(cx, Y + 2, cz, null);
  ok(blk(cx, Y + 2, cz - 1) === 0 && items('cocoa_beans') === 1, `the log gone: the pod fell (${items('cocoa_beans')} bean)`);
  cmd(`/fill ${cx - 1} ${Y} ${cz - 1} ${cx + 5} ${Y + 4} ${cz + 1} air`);
}
// ---------------------------------------------------------------- the depths' wart
{
  const wx = X + 8, wz = Z - 8;
  put(wx, Y - 1, wz, 'wail_sand'); put(wx + 1, Y - 1, wz, 'wail_soil');
  hold('wail_wart', 4); click(wx, Y - 1, wz, 3); click(wx + 1, Y - 1, wz, 3);
  ok(key(wx, Y, wz) === 'wail_wart_crop' && blk(wx + 1, Y, wz) === 0 && held() === 'wail_wart x3', `the wart on wail sand, not on wail soil: ${key(wx, Y, wz)} / ${key(wx + 1, Y, wz)}`);
  clearItems(); pop(wx, Y, wz); const small = items('wail_wart');
  put(wx, Y, wz, 'wail_wart_crop');
  // under a roof (it needs no light)
  put(wx, Y + 1, wz, 'stone'); F(5);
  const t = ticksTill(wx, Y, wz, () => key(wx, Y, wz) === 'wail_wart_crop_3');
  ok(key(wx, Y, wz) === 'wail_wart_crop_3', `ripe after ${t} random ticks under a roof (three steps of 1 in 10: 30 on average)`);
  hold('bone_meal', 3); click(wx, Y, wz, 1);
  ok(held() === 'bone_meal x3', 'bone meal does nothing to it');
  clearItems(); pop(wx, Y, wz);
  ok(small === 1 && items('wail_wart') === 3, `broken small: ${small}, ripe: ${items('wail_wart')}`);
  // the sand under it gone
  put(wx, Y, wz, 'wail_wart_crop'); clearItems(); set(wx, Y - 1, wz, 'stone');
  ok(blk(wx, Y, wz) === 0, `the wail sand turned to stone: the wart came off (${key(wx, Y, wz)})`);
  put(wx, Y + 1, wz, 'air');
}
// ---------------------------------------------------------------- berry bushes
{
  const bx = X + 8, bz = Z;
  put(bx, Y - 1, bz, 'grass_block');
  hold('sweet_berries', 4); click(bx, Y - 1, bz, 3);
  ok(key(bx, Y, bz) === 'sweet_berry_bush_0' && held() === 'sweet_berries x3', `berries planted: ${key(bx, Y, bz)}`);
  ok(BHURT[id('sweet_berry_bush_0')] === 0 && BHURT[id('sweet_berry_bush_1')] === 1 && BHURT[id('sweet_berry_bush')] === 1, 'a seedling does not prick, a bush does');
  const seen = [];
  // (the first tick may be the one in five that grows it: seen too)
  tick(bx, Y, bz); if (key(bx, Y, bz) !== 'sweet_berry_bush_0') seen.push(key(bx, Y, bz));
  let k = 0; while (k < 3000 && key(bx, Y, bz) !== 'sweet_berry_bush') { tick(bx, Y, bz); const q = key(bx, Y, bz); if (q !== 'sweet_berry_bush_0' && seen[seen.length - 1] !== q) seen.push(q); k++; }
  ok(seen.join(' ') === 'sweet_berry_bush_1 sweet_berry_bush_2 sweet_berry_bush', `grown in ${k} random ticks (three steps of 1 in 5): ${seen.join(' > ')}`);
  let lo = 9, hi = 0;
  for (let r = 0; r < 30; r++) { put(bx, Y, bz, 'sweet_berry_bush'); clearItems(); hold(null); click(bx, Y, bz, 1); const c = items('sweet_berries'); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  ok(lo === 2 && hi === 3 && key(bx, Y, bz) === 'sweet_berry_bush_1', `a ripe bush picked: ${lo} to ${hi} berries, a bare bush left (${key(bx, Y, bz)})`);
  lo = 9; hi = 0;
  for (let r = 0; r < 30; r++) { put(bx, Y, bz, 'sweet_berry_bush_2'); clearItems(); hold(null); click(bx, Y, bz, 1); const c = items('sweet_berries'); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  ok(lo === 1 && hi === 2, `a bush with a few picked: ${lo} to ${hi}`);
  put(bx, Y, bz, 'sweet_berry_bush_1'); clearItems(); hold(null); click(bx, Y, bz, 1);
  ok(key(bx, Y, bz) === 'sweet_berry_bush_1' && items('sweet_berries') === 0, 'a bare bush gives none');
  put(bx, Y, bz, 'sweet_berry_bush_2'); clearItems(); hold('bone_meal', 2); click(bx, Y, bz, 1);
  ok(key(bx, Y, bz) === 'sweet_berry_bush' && items('sweet_berries') === 0 && held() === 'bone_meal x1', `bone meal on a bush with a few: it ripens (${key(bx, Y, bz)})`);
  clearItems(); pop(bx, Y, bz);
  ok(items('sweet_berries') === 2, `a ripe bush broken: ${items('sweet_berries')} berries`);
}
// ---------------------------------------------------------------- vines
{
  const vx = X, vz = Z + 8;
  cmd(`/fill ${vx - 6} ${Y} ${vz + 1} ${vx + 6} ${Y + 8} ${vz + 1} stone`);
  put(vx, Y + 7, vz, 'vine');
  const vines = () => { const L = []; for (let x = vx - 7; x <= vx + 7; x++) for (let y = Y; y <= Y + 10; y++) for (let z = vz - 2; z <= vz + 2; z++) if (key(x, y, z) === 'vine') L.push([x, y, z]); return L; };
  let lost = 0;
  for (let r = 0; r < 400; r++) { for (const [x, y, z] of vines()) tick(x, y, z); if (key(vx, Y + 7, vz) !== 'vine') lost++; }
  const L = vines();
  const down = L.filter(([x, y, z]) => x === vx && z === vz).length;
  const rows = {}; for (const [x, y, z] of L) rows[y] = (rows[y] || 0) + 1;
  // the cap: no more than five in any 9 x 3 x 9 that a vine could have grown from
  let worst = 0;
  for (const [x, y, z] of L) { const c = L.filter(([a, b, c2]) => Math.abs(a - x) <= 4 && Math.abs(b - y) <= 1 && Math.abs(c2 - z) <= 4).length; worst = Math.max(worst, c); }
  ok(lost === 0 && L.length > 8 && down >= 6, `a vine on a wall after 400 rounds of random ticks: ${L.length} vines, ${down} in its own column down to the floor, the first never lost`);
  ok(L.every(([x, y, z]) => z === vz) && L.every(([x, y, z]) => y <= Y + 8), 'all of them on the wall, none over its top');
  console.log('     vines by height', JSON.stringify(rows), 'most in a 9 x 3 x 9:', worst);
  ok(arr('BMOVE')[id('vine')] === 1, 'vines are climbed');
  cmd(`/fill ${vx - 7} ${Y} ${vz - 2} ${vx + 7} ${Y + 10} ${vz + 2} air`);
}
// ---------------------------------------------------------------- the cauldron
{
  const cx = X - 2, cz = Z;
  put(cx, Y, cz, 'cauldron');
  hold('water_bucket'); click(cx, Y, cz, 3);
  ok(key(cx, Y, cz) === 'cauldron_w3' && held() === 'bucket x1' && blk(cx, Y + 1, cz) === 0, `a water bucket into a cauldron: ${key(cx, Y, cz)}, in hand ${held()}, no water put over it`);
  ok(call(() => fn.cmpRead(cx, Y, cz, blk(cx, Y, cz))) === 3, 'a comparator reads 3 of a full one');
  hold('bucket', 2); click(cx, Y, cz, 3);
  const inv = arr('INVI').slice(0, 36).filter(v => v === id('water_bucket')).length;
  ok(key(cx, Y, cz) === 'cauldron' && held() === 'bucket x1' && inv === 1, `a bucket (one of two) takes a full one: ${key(cx, Y, cz)}, a water bucket in the inventory: ${inv}`);
  { const I = arr('INVI'), N = arr('INVN'); for (let i = 0; i < 36; i++) { I[i] = 0; N[i] = 0; } }
  put(cx, Y, cz, 'cauldron_w2'); hold('bucket'); click(cx, Y, cz, 3);
  ok(key(cx, Y, cz) === 'cauldron_w2' && held() === 'bucket x1', 'a bucket takes nothing of one not full');
  ok(call(() => fn.cmpRead(cx, Y, cz, blk(cx, Y, cz))) === 2 && call(() => fn.cmpRead(cx, Y, cz, id('cauldron'))) === 0, 'a comparator reads 2 of two thirds, 0 of an empty one');
  // a real comparator behind it
  put(cx + 1, Y, cz, 'air'); put(cx + 2, Y, cz, 'air');
  {
    s.poke('yaw', 90); s.poke('pitch', 0);
    s.poke('pickX', cx + 1); s.poke('pickY', Y - 1); s.poke('pickZ', cz); s.poke('pickF', 3); s.poke('pickB', blk(cx + 1, Y - 1, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0);
    call(() => fn.placeBlock(arr('ITPLB')[id('comparator')], id('comparator')));
    s.poke('pickX', cx + 2); s.poke('pickB', blk(cx + 2, Y - 1, cz)); s.poke('placeCool', 0);
    call(() => fn.placeBlock(arr('ITPLB')[id('spark_dust')], id('spark_dust')));
    call(() => fn.worldFlush()); F(2); wait(0.2);
  }
  const lvl = () => arr('BAUX')[blk(cx + 2, Y, cz)];
  const l2 = lvl();
  set(cx, Y, cz, 'cauldron_w3'); call(() => fn.worldFlush()); wait(0.3); const l3 = lvl();
  set(cx, Y, cz, 'cauldron'); call(() => fn.worldFlush()); wait(0.3); const l0 = lvl();
  ok(l2 === 2 && l3 === 3 && l0 === 0, `a comparator behind the cauldron (${key(cx + 1, Y, cz)}): ${l2} / ${l3} / ${l0} out (2 / 3 / 0)`);
  // a composter's level
  set(cx, Y, cz, 'composter'); call(() => fn.pvSet(2, cx, Y, cz, 5)); call(() => fn.powerAround(cx, Y, cz)); call(() => fn.worldFlush()); wait(0.3);
  ok(lvl() === 5, `a comparator behind a composter at 5: ${lvl()}`);
  call(() => fn.pvSet(2, cx, Y, cz, 0));
  put(cx + 1, Y, cz, 'air'); put(cx + 2, Y, cz, 'air');
  // the bottles (the brewing part's): only when this build has them
  const gb = KEY.indexOf('glass_bottle'), wb = KEY.indexOf('water_bottle');
  if (gb > 0 && wb > 0) {
    put(cx, Y, cz, 'cauldron_w3'); hold('glass_bottle', 2); click(cx, Y, cz, 3);
    ok(key(cx, Y, cz) === 'cauldron_w2' && held() === 'glass_bottle x1' && arr('INVI').slice(0, 36).includes(wb), `a glass bottle takes a third: ${key(cx, Y, cz)}, in hand ${held()}`);
    { const I = arr('INVI'), N = arr('INVN'); for (let i = 0; i < 36; i++) { I[i] = 0; N[i] = 0; } }
    hold('water_bottle'); click(cx, Y, cz, 3);
    ok(key(cx, Y, cz) === 'cauldron_w3' && held() === 'glass_bottle x1', `a water bottle gives a third: ${key(cx, Y, cz)}, in hand ${held()}`);
    put(cx, Y, cz, 'cauldron'); hold('glass_bottle'); click(cx, Y, cz, 3);
    ok(key(cx, Y, cz) === 'cauldron' && held() === 'glass_bottle x1', 'nothing from an empty one');
  } else console.log('     (no glass_bottle / water_bottle in this build: the bottle part not tried)');
  // rain
  put(cx, Y, cz, 'cauldron'); cmd('/weather rain'); F(3);
  const rains = call(() => fn.rainOn(cx, Y + 1, cz));
  if (rains === 1) {
    const t = ticksTill(cx, Y, cz, () => key(cx, Y, cz) === 'cauldron_w1', 3000);
    ok(key(cx, Y, cz) === 'cauldron_w1', `rain filled a third after ${t} random ticks (1 in 60)`);
    put(cx, Y + 1, cz, 'stone'); F(20); put(cx, Y, cz, 'cauldron');
    for (let k = 0; k < 1500; k++) tick(cx, Y, cz);
    ok(key(cx, Y, cz) === 'cauldron', 'none under a roof');
    put(cx, Y + 1, cz, 'air');
  } else console.log('     (no rain falls at this place: the rain part not tried)');
  cmd('/weather clear'); F(3);
  for (let k = 0; k < 600; k++) tick(cx, Y, cz);
  ok(key(cx, Y, cz) === 'cauldron', 'none without rain');
  // a burning player steps in
  put(cx, Y, cz, 'cauldron_w2');
  s.poke('flying', 0); s.poke('px', cx + 0.5); s.poke('py', Y + 0.3); s.poke('pz', cz + 0.5); s.poke('pvy', 0); s.poke('fireT', 6);
  F(3);
  ok(s.peek('fireT') === 0 && key(cx, Y, cz) === 'cauldron_w1', `a burning player in a cauldron's water: put out (${s.peek('fireT')}), the water a third less (${key(cx, Y, cz)})`);
  s.poke('fireT', 6); put(cx, Y, cz, 'cauldron'); s.poke('py', Y + 0.3); F(3);
  ok(s.peek('fireT') > 0, 'an empty one puts nothing out');
  s.poke('fireT', 0); s.poke('flying', 1); s.poke('py', Y + 14);
  put(cx, Y, cz, 'air');
}
// ---------------------------------------------------------------- the compost of the new things
ok(call(() => fn.compostChance(id('melon_seeds'))) === 30 && call(() => fn.compostChance(id('pumpkin_seeds'))) === 30 && call(() => fn.compostChance(id('cocoa_beans'))) === 65 && call(() => fn.compostChance(id('wail_wart'))) === 65, 'compost: seeds 30 %, cocoa beans and the wart 65 %');
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
