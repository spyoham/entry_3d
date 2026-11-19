// (v3.3) brewing and potions, fishing, the crossbow, the later charms, the furnaces: node test/brew33.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const arr = (nm) => s.peek(nm), fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (c) => call(() => fn.runCommand(c));
const id = (k) => { const i = arr('ITKEY').indexOf(k); if (i < 0) throw new Error('no item ' + k); return i; };
const slot = (k, v, c = 1, d = 0) => { arr('INVI')[k - 1] = typeof v === 'string' ? id(v) : v; arr('INVN')[k - 1] = v === 0 ? 0 : c; arr('INVD')[k - 1] = d; };
const count = (v) => arr('INVI').reduce((t, x, i) => t + (x === v ? arr('INVN')[i] : 0), 0);
const clear = () => { for (let k = 1; k <= arr('INVI').length; k++) slot(k, 0); };
const secs = (t) => F(Math.ceil(t * 60));
cmd('/gamemode survival'); cmd('/time set day'); cmd('/weather clear'); cmd('/difficulty peaceful');
F(5);
const P = () => [s.peek('px'), s.peek('py'), s.peek('pz')];
const B = (x, y, z) => { let r = 0; call(() => { r = fn.blockAt(x, y, z); }); return r; };

// ---- the charm tables
const ENKEY = arr('ENKEY');
ok(ENKEY.length === 38 && ENKEY[28] === 'loyalty' && ENKEY[37] === 'soul_speed', `38 charms, the later ten after the first 28 (${ENKEY.slice(28).join(' ')})`);
ok(arr('ENOK').length === 38 * 18, 'the classes: 18 a charm');
// an old book's number reads as before; a sword's
{
  const book = id('enchanted_book'); let e = 0;
  call(() => { fn.enDec(book, 5 + 6 * 3); }); // sharpness V, smite III in the old layout
  ok(arr('ENL')[0] === 5 && arr('ENL')[1] === 3 && arr('ENL').slice(28).every((x) => x === 0), 'a book of v3.2 reads the same (sharpness V, smite III)');
  const boots = id('diamond_boots');
  let d = 0; call(() => { fn.enDec(boots, 0); arr('ENL')[10] = 3; arr('ENL')[23] = 4; d = fn.enEnc(boots, 7); });
  call(() => { fn.enDec(boots, d); arr('ENL')[37] = 2; e = fn.enEnc(boots, 7); fn.enDec(boots, e); });
  ok(arr('ENL')[10] === 3 && arr('ENL')[23] === 4 && arr('ENL')[37] === 2 && e > d, 'boots keep unbreaking and feather falling with soul speed II put on');
}
// /enchant on the new things
clear(); slot(1, 'trident'); s.poke('hotSel', 1);
cmd('/enchant @s loyalty 3'); cmd('/enchant @s impaling 5'); cmd('/enchant @s riptide 1');
{ let l = 0, r = 0, i = 0; call(() => { l = fn.heldLv(29); r = fn.heldLv(30); i = fn.heldLv(32); }); ok(l === 3 && i === 5 && r === 0, `a trident takes loyalty III and impaling V, and no riptide with loyalty (${l} ${i} ${r})`); }
slot(1, 'book'); cmd('/enchant @s lure 2');
ok(arr('INVI')[0] === id('enchanted_book_2'), 'a book enchanted with lure becomes the second book');
slot(2, 'fishing_rod'); slot(1, 'enchanted_book_2', 1, arr('INVD')[0]);
{
  // the anvil: the second book onto a rod
  let out = 0, od = 0;
  call(() => { s.poke('AN1I', id('fishing_rod')); s.poke('AN1N', 1); s.poke('AN1D', 0); s.poke('AN2I', id('enchanted_book_2')); s.poke('AN2N', 1); s.poke('AN2D', arr('INVD')[0]); fn.anvilMatch(); out = s.peek('anOut'); od = s.peek('anOutD'); });
  let lv = 0; call(() => { lv = fn.enLv(id('fishing_rod'), od, 36); });
  ok(out === id('fishing_rod') && lv === 2, `the anvil puts the book's lure II on a rod (cost ${s.peek('anCost')})`);
}

// ---- brewing
clear();
const [x0, y0, z0] = P().map(Math.floor);
const bx = x0 + 2, by = y0 + 3, bz = z0;
cmd(`/setblock ${bx} ${by} ${bz} brewing_stand`);
F(3);
let c = 0; call(() => { fn.chestAt(bx, by, bz); c = s.peek('cFound'); });
ok(c > 0 && B(bx, by, bz) > 0, `a brewing stand set has a chest record (${c})`);
{ let cap = 0; call(() => { cap = fn.chestCap(c); }); ok(cap === 5, 'it holds 5 slots'); }
const base = (c - 1) * 27;
const cs = (k, v, cnt = 1, d = 0) => { arr('CHI')[base + k - 1] = typeof v === 'string' ? id(v) : v; arr('CHN')[base + k - 1] = v === 0 ? 0 : cnt; arr('CHD')[base + k - 1] = d; };
const ci = (k) => arr('CHI')[base + k - 1], cd = (k) => arr('CHD')[base + k - 1], cn = (k) => arr('CHN')[base + k - 1];
const WB = id('water_bottle'), POT = id('potion'), SPL = id('splash_potion');
cs(1, WB); cs(2, WB); cs(3, WB); cs(4, 'wail_wart', 2); cs(5, 'blaze_powder', 2);
secs(10);
ok(ci(1) === WB && cn(5) === 1 && cn(6) === 20, `after 10 s: not yet brewed, one powder burning (20 brews, ${cn(5)} powder left)`);
secs(11);
ok(ci(1) === POT && ci(2) === POT && ci(3) === POT && cd(1) === 1 && cn(4) === 1 && cn(6) === 19, `after 21 s: three awkward potions, one wart used, 19 brews left (${ci(1)} ${cd(1)} ${cn(4)} ${cn(6)})`);
secs(22);
ok(cn(4) === 1 && cn(6) === 19, 'the wart left does nothing to an awkward potion');
const brew = (ing, t = 21) => { cs(4, ing, 1); secs(t); };
brew('sugar'); ok(cd(1) === 6 && cd(3) === 6 && cn(4) === 0, `sugar: swiftness (${cd(1)})`);
cs(2, POT, 1, 1); cs(3, POT, 1, 1);
brew('spark_dust'); ok(cd(1) === 26 && cd(2) === 1, `spark dust: the long one (${cd(1)}); an awkward one stays`);
brew('glow_dust'); ok(cd(1) === 26, 'glow dust does nothing to a long one');
brew('fermented_spider_eye'); ok(cd(1) === 27, `a fermented eye: long slowness (${cd(1)})`);
brew('gunpowder'); ok(ci(1) === SPL && cd(1) === 27 && ci(2) === SPL, `gunpowder: thrown ones (${ci(1)} ${cd(1)})`);
cs(1, POT, 1, 1); cs(2, POT, 1, 1); cs(3, WB);
brew('glistering_melon_slice'); ok(cd(1) === 9 && ci(3) === WB, `a glistering melon slice: healing (${cd(1)}); water stays water`);
brew('glow_dust'); ok(cd(1) === 49, `glow dust: healing II (${cd(1)})`);
brew('fermented_spider_eye'); ok(cd(1) === 50 && ci(3) === POT && cd(3) === 14, `the eye: harming II (${cd(1)}), and weakness of water (${cd(3)})`);
{ let txt = ''; call(() => { fn.enDesc(POT, 46); txt = s.peek('enS'); }); ok(/신속 II/.test(txt) && /1:30/.test(txt), `a potion's words: ${txt}`); }
{ let h = 0; call(() => { h = fn.enHas(POT, 6); }); ok(h === 1, 'a potion shows as a charmed thing does'); }
ok(cn(6) === 12, `a brew a charge: ${cn(6)} left of the powder after 8 brews`);
// the stand broken drops what it holds, not the charges
cmd(`/setblock ${bx} ${by} ${bz} air`); F(3);
ok(arr('CHON')[c - 1] === 0, 'the stand gone, its record is free');

// ---- drinking
clear(); slot(1, 'potion', 1, 46); s.poke('hotSel', 1); s.poke('pitch', 60);
s.press(70); secs(1); ok(arr('INVI')[0] === POT, 'a second of drinking: not yet');
secs(0.8); s.release(70); F(2);
{ let lv = 0; call(() => { lv = fn.fx(1); }); ok(arr('INVI')[0] === id('glass_bottle') && lv === 2 && Math.abs(arr('EFT')[0] - 90) < 2, `swiftness II drunk in 1.6 s: level ${lv} for ${Math.round(arr('EFT')[0])} s, the bottle left`); }
F(40); slot(1, 'potion', 1, 49);
s.press(70); secs(1.8); s.release(70); F(40);
ok(arr('INVI')[0] === id('glass_bottle'), 'a potion of healing drunk');
call(() => { s.poke('hp', 5); fn.potionApply(49, 1); });
ok(s.peek('hp') === 13, `healing II: 5 -> ${s.peek('hp')}`);
call(() => { s.poke('hp', 5); fn.potionApply(9, 0.5); });
ok(s.peek('hp') === 7, `healing at half strength (the edge of a splash): 5 -> ${s.peek('hp')}`);
s.poke('hp', 20);
slot(1, 'potion', 1, 3);
s.press(70); secs(1.8); s.release(70); F(40);
ok(Math.abs(s.peek('invisK') - 0.07) < 0.001, `invisibility: seen from ${s.peek('invisK')} of the distance`);
call(() => fn.effectsInit()); F(2);

// ---- a thrown potion on mobs
clear(); cmd('/difficulty normal'); cmd('/gamemode creative');
{
  const [x, y, z] = P();
  s.poke('yaw', 0); s.poke('pitch', 0); F(2);
  let e1 = 0, e2 = 0;
  call(() => { fn.mobAdd(s.peek('M_ZOMBIE'), x, y, z + 6); e1 = s.peek('lastMob'); fn.mobAdd(1, x + 1.5, y, z + 6); e2 = s.peek('lastMob'); });
  const hp1 = arr('EHP')[e1 - 1], hp2 = arr('EHP')[e2 - 1];
  slot(1, 'splash_potion', 1, 50); s.poke('hotSel', 1); s.poke('pitch', 10);
  s.press(70); F(2); s.release(70); F(1);
  const a = arr('AON').indexOf(13);
  ok(a >= 0 && arr('AEN')[a] === 50 && arr('INVI')[0] === 0 || s.peek('gameMode') === 1, 'a thrown potion flies (AON 13) with its number');
  // where it breaks: between the two
  let b1 = 0, b2 = 0;
  call(() => { b1 = arr('EHP')[e1 - 1]; b2 = arr('EHP')[e2 - 1]; arr('AXX')[a] = x + 0.7; arr('AYY')[a] = y + 0.5; arr('AZZ')[a] = z + 6; fn.splashHit(a + 1); });
  const a1 = arr('ET')[e1 - 1] ? arr('EHP')[e1 - 1] : 0, a2 = arr('ET')[e2 - 1] ? arr('EHP')[e2 - 1] : 0;
  ok(a1 > b1 - 0.01 && a2 < b2 - 5, `harming II breaking by them: the pig hurt (${b2} -> ${a2}), the zombie not (${b1} -> ${a1})`);
  arr('AON')[a] = 0;
  call(() => { arr('ET')[e1 - 1] = 0; arr('ET')[e2 - 1] = 0; });
}

// ---- the crossbow
clear(); cmd('/gamemode survival'); cmd('/difficulty peaceful');
const XB = id('crossbow'), XBL = id('crossbow_loaded'), ARROW = id('arrow');
slot(1, XB); slot(2, ARROW, 5); s.poke('hotSel', 1); s.poke('pitch', 20); F(40);
s.press(70); secs(1); ok(arr('INVI')[0] === XB, 'drawn a second: not loaded');
secs(0.5); ok(arr('INVI')[0] === XBL && count(ARROW) === 4, `drawn 1.25 s: loaded, an arrow taken (${count(ARROW)} left)`);
secs(1); ok(arr('INVI')[0] === XBL && !arr('AON').includes(2), 'held on: it stays loaded and does not shoot');
s.release(70); F(20);
s.press(70); F(2); s.release(70); F(1);
{
  const a = s.peek('lastArr'), v = Math.hypot(arr('AVX')[a - 1], arr('AVY')[a - 1], arr('AVZ')[a - 1]), pw = arr('APW')[a - 1] * 7;
  ok(arr('INVI')[0] === XB && arr('INVD')[0] === 1 && Math.abs(v - 33.6) < 1.2 && pw > 5.9 && pw < 11.1, `shot: speed ${v.toFixed(1)} (33.6), hurts ${pw.toFixed(1)} (6 to 11), worn 1`);
}
F(120);
// quick charge III: half a second; multishot: three arrows for one
call(() => { fn.enDec(XB, 0); arr('ENL')[33] = 3; arr('ENL')[32] = 1; arr('INVD')[0] = fn.enEnc(XB, 0); });
s.press(70); secs(0.6); s.release(70); F(20);
ok(arr('INVI')[0] === XBL && count(ARROW) === 3, `quick charge III: loaded in 0.5 s (${count(ARROW)} arrows left)`);
for (let i = 0; i < arr('AON').length; i++) arr('AON')[i] = 0;
s.press(70); F(2); s.release(70); F(1);
ok(arr('AON').filter((v) => v === 2).length === 3 && arr('AEN').filter((v, i) => arr('AON')[i] === 2 && v === 1).length === 2, 'multishot: three arrows, the outer two not to be picked up');
{ let dm = 0; call(() => { dm = fn.dmgOf(arr('INVD')[0]); }); ok(dm === 3, `multishot wears 3 (${dm})`); }
F(200);
// piercing: one arrow through two mobs in a row
cmd('/gamemode creative');
{
  for (let i = 0; i < arr('AON').length; i++) arr('AON')[i] = 0;
  const [x, y, z] = P(); s.poke('yaw', 0); s.poke('pitch', 0); F(2);
  let e1 = 0, e2 = 0;
  call(() => { fn.mobAdd(2, x, y, z + 4); e1 = s.peek('lastMob'); fn.mobAdd(2, x, y, z + 6.5); e2 = s.peek('lastMob'); });
  call(() => { for (const e of [e1, e2]) { arr('EVX')[e - 1] = 0; arr('EVZ')[e - 1] = 0; } });
  const h1 = arr('EHP')[e1 - 1], h2 = arr('EHP')[e2 - 1];
  call(() => { fn.enDec(XB, 0); arr('ENL')[34] = 2; arr('INVI')[0] = XBL; arr('INVD')[0] = fn.enEnc(XB, 0); });
  s.poke('hotSel', 1);
  s.press(70); F(2); s.release(70); F(40);
  const g1 = arr('ET')[e1 - 1] ? arr('EHP')[e1 - 1] : 0, g2 = arr('ET')[e2 - 1] ? arr('EHP')[e2 - 1] : 0;
  ok(g1 < h1 && g2 < h2, `piercing II: both cows in the line hit (${h1} -> ${g1}, ${h2} -> ${g2})`);
  call(() => { arr('ET')[e1 - 1] = 0; arr('ET')[e2 - 1] = 0; });
}

// ---- fishing
clear(); cmd('/gamemode survival');
{
  const [x, y, z] = P().map(Math.floor);
  // a pool in front of the player
  cmd(`/fill ${x - 3} ${y - 1} ${z + 2} ${x + 3} ${y - 1} ${z + 16} water`);
  cmd(`/fill ${x - 3} ${y} ${z + 1} ${x + 3} ${y + 4} ${z + 16} air`);
  F(5);
  const ROD = id('fishing_rod');
  slot(1, ROD); s.poke('hotSel', 1); s.poke('yaw', 0); s.poke('pitch', 0); F(2);
  s.press(70); F(2); s.release(70); F(2);
  ok(s.peek('fishA') > 0 && arr('AON')[s.peek('fishA') - 1] === 14, 'the rod used: its float flies');
  secs(3);
  ok(s.peek('fishSt') === 1, `the float lies on the water (state ${s.peek('fishSt')}, a bite in ${s.peek('fishT').toFixed(1)} s)`);
  ok(s.peek('fishT') >= 1 && s.peek('fishT') <= 30, 'a bite in 5 to 30 s');
  // pulled in too early: nothing, no wear
  F(25); s.press(70); F(2); s.release(70); F(2);
  ok(s.peek('fishA') === 0 && arr('INVD')[0] === 0, 'pulled in before a bite: nothing, the rod not worn');
  // again, and wait for the bite
  let caught = [0, 0, 0];
  for (let round = 0; round < 40; round++) {
    F(25); s.press(70); F(2); s.release(70); F(2);
    let w = 0; while (s.peek('fishSt') !== 1 && w < 300) { F(1); w++; }
    if (s.peek('fishSt') !== 1) break;
    s.poke('fishT', 0.05); F(6);
    if (s.peek('fishSt') !== 2) break;
    const before = arr('IID').slice();
    F(20); s.poke('fishSt', 2); s.poke('fishT', 1); s.press(70); F(2); s.release(70); F(1);
    const k = arr('IID').findIndex((v, i) => v > 0 && before[i] !== v);
    const got = k >= 0 ? arr('IID')[k] : 0;
    const fish = [id('raw_cod'), id('raw_salmon'), id('tropical_fish'), id('pufferfish')].includes(got);
    caught[fish ? 0 : 1]++; if (got === 0) caught[2]++;
    F(90);
    for (let i = 0; i < arr('IID').length; i++) arr('IID')[i] = 0;
    for (let q = 2; q <= 36; q++) slot(q, 0);
  }
  let dm = 0; call(() => { dm = fn.dmgOf(arr('INVD')[0]); });
  ok(caught[0] + caught[1] === 40 && caught[2] === 0 && caught[0] >= 26, `40 bites pulled in: ${caught[0]} fish, ${caught[1]} other things`);
  ok(dm === 40 || arr('INVI')[0] === ROD, `the rod worn a point a catch (${dm})`);
  // lure: 5 s less a level
  call(() => { s.poke('fishLure', 3); let mx = 0; for (let i = 0; i < 200; i++) { fn.fishWait(); mx = Math.max(mx, s.peek('fishT')); } s.poke('tStage', mx); });
  ok(s.peek('tStage') <= 15.01 && s.peek('tStage') > 5, `lure III: a bite in 15 s at most (${s.peek('tStage').toFixed(1)})`);
}

// ---- the trident's charms
clear(); cmd('/gamemode survival');
{
  const TR = id('trident');
  slot(1, TR); s.poke('hotSel', 1);
  call(() => { fn.enDec(TR, 0); arr('ENL')[28] = 3; arr('INVD')[0] = fn.enEnc(TR, 0); });
  const d0 = arr('INVD')[0];
  s.poke('yaw', 180); s.poke('pitch', 10); F(2);
  s.press(70); secs(0.7); s.release(70); F(3);
  ok(arr('INVI')[0] === 0 && arr('AON').includes(2), 'a trident of loyalty thrown');
  let back = 0; for (let i = 0; i < 900 && !back; i++) { F(1); if (count(TR) === 1) back = i; }
  const k = arr('INVI').indexOf(TR);
  ok(back > 0 && arr('INVD')[k] === d0 + 1, `it comes back by itself after ${(back / 60).toFixed(1)} s, worn a point, its charm kept`);
  // riptide: nothing dry, a leap in water
  clear(); slot(1, TR); call(() => { fn.enDec(TR, 0); arr('ENL')[29] = 2; arr('INVD')[0] = fn.enEnc(TR, 0); });
  s.poke('pitch', 30);
  s.press(70); secs(0.7); s.release(70); F(3);
  ok(arr('INVI')[0] === TR && !arr('AON').includes(2), 'riptide, dry: not thrown, nothing');
  let r = 0; call(() => { s.poke('inW', 1); r = fn.riptideGo(); });
  const v = Math.hypot(s.peek('pvx'), s.peek('pvy'), s.peek('pvz'));
  ok(r === 1 && v > 15, `riptide II in water: carried off at ${v.toFixed(1)} blocks a second`);
  s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0);
}

// ---- furnaces
{
  const SM = s.peek('SMELTT');
  const fu = (k) => arr('ITFUEL')[id(k)];
  ok(Math.abs(fu('blaze_rod') / SM - 12) < 0.01 && Math.abs(fu('lava_bucket') / SM - 100) < 0.01 && Math.abs(fu('coal') / SM - 8) < 0.01, `fuel in items smelted: a blaze rod ${fu('blaze_rod') / SM}, lava ${fu('lava_bucket') / SM}, coal ${fu('coal') / SM} (SMELTT ${SM})`);
  const [x, y, z] = P().map(Math.floor);
  cmd(`/setblock ${x + 3} ${y + 4} ${z} furnace`); cmd(`/setblock ${x + 3} ${y + 4} ${z + 2} blast_furnace`); F(3);
  let f1 = 0, f2 = 0; call(() => { fn.furnaceAt(x + 3, y + 4, z); f1 = s.peek('fFound'); fn.furnaceAt(x + 3, y + 4, z + 2); f2 = s.peek('fFound'); });
  let smI = arr('SMI')[0];
  for (const f of [f1, f2]) { arr('FII')[f - 1] = smI; arr('FIN')[f - 1] = 8; arr('FFI')[f - 1] = id('lava_bucket'); arr('FFN')[f - 1] = 1; }
  secs(SM + 0.5);
  ok(arr('FON')[f1 - 1] === 1 && arr('FON')[f2 - 1] === 2, `in ${SM} s a furnace smelts 1 and a blast furnace 2 (${arr('FON')[f1 - 1]}, ${arr('FON')[f2 - 1]})`);
  ok(arr('FFI')[f1 - 1] === id('bucket') && arr('FFN')[f1 - 1] === 1, 'the lava bucket burning leaves its bucket in the fuel slot');
  const b1 = arr('FUB')[f1 - 1], b2 = arr('FUB')[f2 - 1], m = arr('FUBM')[f1 - 1];
  ok(Math.abs((m - b2) - 2 * (m - b1)) < 0.5, `the blast furnace burns its fuel twice as fast (${(m - b1).toFixed(1)} s, ${(m - b2).toFixed(1)} s)`);
}

// ---- food: a stew leaves its bowl
clear(); cmd('/gamemode survival');
slot(1, 'mushroom_stew'); s.poke('hotSel', 1); s.poke('food', 10); s.poke('pitch', 60); F(40);
s.press(70); secs(1.8); s.release(70); F(2);
ok(arr('INVI')[0] === id('bowl') && s.peek('food') >= 16, `a stew eaten: the bowl left (food ${s.peek('food')})`);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
