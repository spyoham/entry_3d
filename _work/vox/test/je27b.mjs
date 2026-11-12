// (v2.7) closer to 1.16.5, part 2: campfires going out and lit again and cooking, hoppers (5 slots,
// pointing sideways into a furnace's fuel, one hopper a pass), a comparator reading a hopper, a
// dispenser 4 ticks late and with bone meal, wall torches and ladders falling with their wall, cake
// bites, the composter, armour and saturation
// usage: node test/je27b.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => call(() => fn.runCommand(t));
const KEY = s.peek('ITKEY'), K = (b) => KEY[b], ID = (k) => KEY.indexOf(k);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const put = (x, y, z, k) => call(() => fn.setBlock(x, y, z, typeof k === 'string' ? ID(k) : k));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const hold = (k, n = 1) => { const I = s.peek('INVI'), N = s.peek('INVN'), D = s.peek('INVD'); I[0] = ID(k); N[0] = n; D[0] = 0; s.poke('hotSel', 1); };
const held = () => K(s.peek('INVI')[0]);
const use = (x, y, z) => call(() => fn.useBlock(x, y, z, fn.blockAt(x, y, z), s.peek('INVI')[0]));
F(20);
cmd('/gamerule randomTickSpeed 0'); cmd('/weather clear'); cmd('/time set noon');
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y + 6} ${Z + 12} air`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`);
s.poke('gameMode', 0);
const items = () => { const r = {}; const I = s.peek('IID'), N = s.peek('INN'); for (let i = 0; i < I.length; i++) if (I[i] > 0) r[K(I[i])] = (r[K(I[i])] || 0) + N[i]; return r; };
const clearItems = () => { const I = s.peek('IID'); for (let i = 0; i < I.length; i++) I[i] = 0; };

// ---- campfires
put(X, Y, Z, 'campfire'); F(2);
ok(s.peek('BLIT')[B(X, Y, Z)] == 15, 'a campfire burns (light 15)');
hold('wooden_shovel'); use(X, Y, Z); F(2);
ok(K(B(X, Y, Z)) === 'campfire_off' && s.peek('BLIT')[B(X, Y, Z)] == 0, `a shovel puts it out (${K(B(X, Y, Z))})`);
hold('igniter'); use(X, Y, Z); F(2);
ok(K(B(X, Y, Z)) === 'campfire', `flint and steel lights it again (${K(B(X, Y, Z))})`);
hold('water_bucket'); use(X, Y, Z); F(2);
ok(K(B(X, Y, Z)) === 'campfire_off' && held() === 'bucket', `a water bucket puts it out and is empty (${K(B(X, Y, Z))}, ${held()})`);
hold('igniter'); use(X, Y, Z); F(2);
clearItems();
hold('raw_beef', 2); use(X, Y, Z); F(2);
ok(s.peek('INVN')[0] == 1, 'raw beef is put on it');
F(60 * 25); ok(!items().steak, 'not done after 25 s');
F(60 * 6); ok(items().steak == 1, `cooked after 30 s (${JSON.stringify(items())})`);
use(X, Y, Z); hold('wooden_shovel'); use(X, Y, Z); clearItems(); F(60 * 35);
ok(!items().steak, 'put out, it does not cook');
hold('igniter'); use(X, Y, Z); F(60 * 31);
ok(items().steak == 1, 'lit again it goes on cooking');
// standing in it: hurt when lit, not when out; it does not set the player on fire
s.poke('hp', 20); s.poke('hurtT', 0); s.poke('food', 17); s.poke('sat', 0);
s.poke('px', X + 0.5); s.poke('py', Y + 0.45); s.poke('pz', Z + 0.5); s.poke('pvx', 0); s.poke('pvz', 0); F(60);
ok(s.peek('hp') < 20, `a lit campfire hurts (hp ${s.peek('hp')})`);
s.poke('px', X + 3.5); s.poke('py', Y); s.poke('pz', Z + 3.5); F(3);
ok(s.peek('fireT') <= 0, 'and does not set one on fire');
hold('wooden_shovel'); use(X, Y, Z);
s.poke('hp', 20); s.poke('px', X + 0.5); s.poke('py', Y + 0.45); s.poke('pz', Z + 0.5); F(60);
ok(s.peek('hp') == 20, `put out, it does not (hp ${s.peek('hp')})`);
s.poke('px', X + 3.5); s.poke('py', Y); s.poke('pz', Z + 3.5); F(3);
s.poke('gameMode', 1);

// ---- hoppers
const HX = X - 6;
put(HX, Y, Z, 'chest'); put(HX, Y + 1, Z, 'hopper'); put(HX + 1, Y + 1, Z, 'furnace');
const side = KEY.findIndex((k, i) => k === 'hopper_east');
put(HX, Y + 1, Z, side); F(2);
const chestOf = (x, y, z) => call(() => { fn.chestAt(x, y, z); return s.peek('cFound'); });
const hc = chestOf(HX, Y + 1, Z);
const CHI = s.peek('CHI'), CHN = s.peek('CHN');
CHI[(hc - 1) * 27] = ID('coal'); CHN[(hc - 1) * 27] = 3;
F(60 * 2);
const fu = call(() => { fn.furnaceFind(HX + 1, Y + 1, Z); return s.peek('fFound'); });
ok(fu > 0 && K(s.peek('FFI')[fu - 1]) === 'coal' && s.peek('FFN')[fu - 1] == 3, `a hopper pointing into a furnace's side fills its fuel (${fu > 0 ? K(s.peek('FFI')[fu - 1]) + ' x' + s.peek('FFN')[fu - 1] : 'none'})`);
ok(call(() => fn.chestCap(hc)) == 5, 'a hopper has 5 slots');
// a full hopper read by a comparator: 15
for (let k = 0; k < 5; k++) { CHI[(hc - 1) * 27 + k] = ID('cobblestone'); CHN[(hc - 1) * 27 + k] = 64; }
ok(call(() => fn.chestLevel(HX, Y + 1, Z)) == 15, `a full hopper reads 15 (${call(() => fn.chestLevel(HX, Y + 1, Z))})`);
for (let k = 0; k < 5; k++) { CHI[(hc - 1) * 27 + k] = 0; CHN[(hc - 1) * 27 + k] = 0; }
// a line of hoppers: one hopper a pass (0.4 s)
const LX = X + 6;
for (let i = 0; i < 4; i++) put(LX, Y + 4 - i, Z, 'hopper');
put(LX, Y, Z, 'chest');
const h0 = chestOf(LX, Y + 4, Z); CHI[(h0 - 1) * 27] = ID('stick'); CHN[(h0 - 1) * 27] = 1;
const ch = chestOf(LX, Y, Z);
let t = 0; while (t < 300 && CHI[(ch - 1) * 27] !== ID('stick')) { F(1); t++; }
ok(t >= 30 && t < 300, `an item takes passes down a line of 4 hoppers (${(t / 60).toFixed(2)} s)`);

// ---- dispensers: 4 ticks late; bone meal on a sapling
const DX = X, DZ = Z - 6;
put(DX, Y, DZ, 'dispenser'); F(2);
const dc = chestOf(DX, Y, DZ);
CHI[(dc - 1) * 27] = ID('arrow'); CHN[(dc - 1) * 27] = 5;
const arrows = () => s.peek('AON').filter(a => a > 0).length;
const a0 = arrows();
put(DX - 1, Y, DZ, 'spark_block'); F(1);
const a1 = arrows(); F(30);
ok(a1 == a0 && arrows() > a0, `a dispenser fires 4 ticks after the power (${a0} ${a1} ${arrows()})`);

// ---- wall torches and ladders
const WX = X + 3, WZ = Z + 6;
put(WX, Y, WZ, 'stone'); F(1);
s.poke('pickB', B(WX, Y, WZ)); s.poke('pickX', WX); s.poke('pickY', Y); s.poke('pickZ', WZ); s.poke('pickF', 0); s.poke('pickOn', 1);
call(() => fn.placeBlock(27, 27)); F(2);
ok(K(B(WX - 1, Y, WZ)) === 'wall_torch_a1', `a torch clicked on a wall leans on it (${K(B(WX - 1, Y, WZ))})`);
s.poke('pickF', 5); call(() => fn.placeBlock(ID('ladder'), ID('ladder'))); F(2);
ok(K(B(WX, Y, WZ + 1)).startsWith('ladder'), `a ladder on the wall (${K(B(WX, Y, WZ + 1))})`);
put(WX, Y, WZ, 0); F(2);
ok(B(WX - 1, Y, WZ) === 0 && B(WX, Y, WZ + 1) === 0, `the wall gone, both come off (${K(B(WX - 1, Y, WZ))}, ${K(B(WX, Y, WZ + 1))})`);

// ---- cake and composter
s.poke('gameMode', 0); s.poke('food', 2);
put(X + 6, Y, Z - 6, 'cake');
let bites = 0; while (B(X + 6, Y, Z - 6) !== 0 && bites < 20) { s.poke('food', 2); use(X + 6, Y, Z - 6); bites++; }
ok(bites == 7, `a cake is 7 bites (${bites})`);
put(X + 6, Y, Z - 4, 'composter'); clearItems();
hold('bread', 64); for (let i = 0; i < 20; i++) use(X + 6, Y, Z - 4);
ok(items().bone_meal == 1 || items().bone_meal == 2, `bread fills the composter to bone meal (${JSON.stringify(items())})`);
s.poke('gameMode', 1);

// ---- armour and saturation
s.poke('gameMode', 0); s.poke('hurtT', 0); s.poke('hp', 20);
const INVI = s.peek('INVI'); ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'].forEach((k, i) => { INVI[36 + i] = ID(k); });
cmd('/difficulty normal');
let tot = 0; for (let i = 0; i < 40; i++) { s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurtM(10, 'x')); tot += 20 - s.peek('hp'); }
ok(Math.abs(tot / 40 - 6) < 0.6, `iron armour (15) takes a 10 hit to 6, as the genre (it was 4) (${(tot / 40).toFixed(2)})`);
['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'].forEach((k, i) => { INVI[36 + i] = 0; });
s.poke('hp', 10); s.poke('food', 20); s.poke('sat', 5); F(60 * 3);
ok(s.peek('hp') >= 12, `full food with saturation heals fast (the genre: about 3 in 3 s) (hp 10 -> ${s.peek('hp')} in 3 s)`);
s.poke('gameMode', 1);
// ---- the chat: numbers typed one after another stay as typed (entry's + added them: 1 then 2 gave 3)
s.poke('tline', ''); for (const c of [49, 50, 48, 55, 96, 105]) call(() => fn.typeKey(c, 0));
ok(String(s.peek('tline')) === '120709', `typed 1 2 0 7 0 9: ${s.peek('tline')}`);
s.poke('tline', '5'); call(() => fn.typeKey(53, 0)); call(() => fn.typeKey(190, 0)); call(() => fn.typeKey(53, 0));
ok(String(s.peek('tline')) === '55.5', `5 5 . 5: ${s.peek('tline')}`);
console.log(fails ? fails + ' FAILED' : 'all ok');
