// (v3.0) the genre's other creatures: node test/v30.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const cmd = (c) => call(() => fn.runCommand(c));
const M = (n) => s.peek('M_' + n.toUpperCase());
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
const arr = (k) => s.peek(k);
const at = (k, e) => arr(k)[e - 1], put = (k, e, v) => { arr(k)[e - 1] = v; };
const clearMobs = () => { const ET = arr('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0; };
const add = (t, x, y, z) => { call(() => fn.mobAdd(t, x, y, z)); return s.peek('lastMob'); };
const hold = (k, n = 1) => { const hs = s.peek('hotSel'); arr('INVI')[hs - 1] = typeof k === 'string' ? id(k) : k; arr('INVN')[hs - 1] = n; arr('INVD')[hs - 1] = 0; };
const use = (e, k) => { hold(k, 10); return call(() => fn.mobUse(e, typeof k === 'string' ? id(k) : k)); };
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`); cmd(`/fill ${X - 12} ${Y} ${Z - 12} ${X + 12} ${Y + 8} ${Z + 12} air`);
s.poke('flying', 0); stand(X, Y, Z); s.poke('grMobs', 0); F(5);
// every kind lives a while near a player in survival without an error
s.poke('gameMode', 0); s.poke('difficulty', 2);
const NT = s.peek('NMOBT');
ok(NT === 74, 'kinds: ' + NT);
for (let t = 1; t <= NT; t++) {
  if (t === M('netPlayer') || t === M('warden')) continue;
  clearMobs(); s.poke('hp', 20); s.poke('dead', 0);
  const e = add(t, X + 4.5, Y + 0.05, Z + 0.5);
  F(30); s.poke('hp', 20); s.poke('dead', 0);
}
ok(true, 'all kinds stepped and drawn');
clearMobs(); s.poke('gameMode', 1); stand(X, Y, Z); F(2);
// the jelly lump falls apart into smaller ones, and those into small ones
let e = add(M('slime'), X + 3.5, Y, Z + 0.5); put('EHURT', e, 0); call(() => fn.mobHurt(e, 99, 0, 0));
ok(arr('ET').filter(v => v === M('slimeM')).length >= 2, 'a big jelly lump falls into middle ones');
clearMobs();
// a zombie under water for 30 s drowns into a drowned
cmd(`/fill ${X + 6} ${Y} ${Z - 1} ${X + 8} ${Y + 3} ${Z + 1} water`);
e = add(M('zombie'), X + 7.5, Y, Z + 0.5); put('ECNV', e, 29.5); F(40);
ok(at('ET', e) === M('drowned'), 'a zombie long under water is a drowned: ' + at('ET', e));
cmd(`/fill ${X + 6} ${Y} ${Z - 1} ${X + 8} ${Y + 3} ${Z + 1} air`); clearMobs();
// a wolf tamed with bones, sits and stands
e = add(M('wolf'), X + 2.5, Y, Z + 0.5);
let k = 0; while (at('EOWN', e) === 0 && k < 40) { use(e, 'bone'); k++; }
ok(at('EOWN', e) === 1, `a wolf tamed after ${k} bones`);
use(e, 0); ok(at('EOWN', e) === 2, 'F: it sits'); use(e, 0); ok(at('EOWN', e) === 1, 'F: it stands');
// the tamed wolf goes for what the player hit
const sk = add(M('zombie'), X + 5.5, Y, Z + 3.5); put('EHP', sk, 200);
s.poke('mobPick', sk); s.poke('attackCool', 0); call(() => fn.attack());
ok(s.peek('petTgt') === sk, 'the hit one is the pets\' target');
let hp0 = at('EHP', sk); F(240);
ok(at('EHP', sk) < hp0 - 3, `the wolf bit it: ${hp0} -> ${at('EHP', sk)}`);
clearMobs();
// two cows fed wheat: a young one
const c1 = add(M('cow'), X + 2.5, Y, Z + 0.5), c2 = add(M('cow'), X + 3.5, Y, Z + 1.5);
use(c1, s.peek('I_wheat')); use(c2, s.peek('I_wheat'));
ok(at('ELOVE', c1) > 0 && at('ELOVE', c2) > 0, 'both in love');
F(200);
const babies = []; arr('ET').forEach((v, i) => { if (v === M('cow') && arr('ESZ')[i] === 0.5) babies.push(i + 1); });
ok(babies.length === 1, 'a calf: ' + babies.length);
if (babies.length) { put('EAGE', babies[0], -0.5); F(40); ok(at('ESZ', babies[0]) === 1, 'it grows up'); }
ok(at('ELOVE', c1) < 0, 'the parents rest after');
clearMobs();
// a horse: tried till tamed, saddled, ridden (W goes, the rider sits on it)
s.poke('gameMode', 0);
e = add(M('horse'), X + 2.5, Y, Z + 0.5); put('ETG', e, 100);
use(e, 0); ok(s.peek('riding') === e, 'on the untamed horse');
F(120); ok(at('EOWN', e) === 1, 'tamed (a temper of 100)');
s.poke('riding', 0); F(2);
ok(use(e, 'saddle') === 1 && at('EVAR', e) % 2 === 1, 'saddled');
use(e, 0); ok(s.peek('riding') === e, 'on it again');
s.poke('yaw', 90); const hx0 = at('EX', e);
s.press(87); F(60); s.release(87);
ok(Math.abs(at('EX', e) - hx0) > 3, `W: it went ${(at('EX', e) - hx0).toFixed(1)} along x`);
ok(Math.abs(s.peek('py') - at('EY', e) - 1.6 * 0.82) < 0.05, 'the rider sits on its back');
s.press(16); F(2); s.release(16); F(2); ok(s.peek('riding') === 0, 'Shift: off');
clearMobs();
// effects: poison stops at one, withering goes on, hunger tires
s.poke('food', 0); s.poke('sat', 0); s.poke('hp', 6); call(() => fn.effectAdd(16, 20, 1)); F(500);
ok(s.peek('hp') === 1, 'poison down to 1: ' + s.peek('hp'));
s.poke('hp', 20); call(() => fn.effectsInit()); s.poke('hp', 4); call(() => fn.effectAdd(17, 30, 1)); F(700);
ok(s.peek('dead') === 1 || s.peek('hp') <= 0, 'withering kills');
call(() => fn.respawn()); F(5); s.poke('dead', 0); s.poke('hp', 20); s.poke('food', 20); call(() => fn.effectsInit()); stand(X, Y, Z); F(5);
const ex0 = s.peek('exhaust'); call(() => fn.effectAdd(15, 10, 1)); F(100);
ok(s.peek('exhaust') - ex0 > 0.15, 'hunger tires: ' + (s.peek('exhaust') - ex0).toFixed(2));
call(() => fn.effectsInit());
// the cave spider's bite poisons (normal)
s.poke('hp', 20); stand(X, Y, Z);
e = add(M('caveSpider'), X + 1.5, Y, Z + 0.5); F(60);
ok(s.peek('EFT')[16 - 1] > 0, 'bitten by a cave spider: poisoned');
clearMobs(); call(() => fn.effectsInit()); s.poke('hp', 20);
// the guardian's beam: three seconds of sight
cmd(`/fill ${X + 3} ${Y} ${Z - 2} ${X + 7} ${Y + 4} ${Z + 2} water`);
e = add(M('guardian'), X + 5.5, Y + 1, Z + 0.5); put('EATK', e, 0);
let beamed = 0; for (let i = 0; i < 300; i++) { F(1); if (at('EST', e) === 7) beamed = 1; }
ok(beamed === 1 && s.peek('hp') < 20, `the guardian's beam: charged ${beamed}, hp ${s.peek('hp')}`);
cmd(`/fill ${X + 3} ${Y} ${Z - 2} ${X + 7} ${Y + 4} ${Z + 2} air`); clearMobs(); s.poke('hp', 20);
// the witch's potions; the conjurer's fangs and spirits
e = add(M('witch'), X + 6.5, Y, Z + 0.5); put('EATK', e, 0); F(200);
const efs = s.peek('EFT'); ok(s.peek('hp') < 20 || efs[2 - 1] > 0 || efs[16 - 1] > 0 || efs[18 - 1] > 0, `the witch's potion reached: hp ${s.peek('hp')}`);
clearMobs(); call(() => fn.effectsInit()); s.poke('hp', 20);
e = add(M('conjurer'), X + 6.5, Y, Z + 0.5); put('EATK', e, 0);
let fangs = 0; for (let i = 0; i < 400; i++) { F(1); fangs = Math.max(fangs, s.peek('AON').filter(v => v === 12).length); }
ok(fangs > 0 || arr('ET').includes(M('sprite')), `the conjurer cast: fangs ${fangs}, spirits ${arr('ET').filter(v => v === M('sprite')).length}`);
clearMobs(); s.poke('hp', 20); s.poke('dead', 0);
// the shell: shut it takes a fifth
s.poke('gameMode', 1);
e = add(M('shellbug'), X + 6.5, Y, Z + 0.5); F(2); put('EVAR', e, 0); put('EHURT', e, 0);
call(() => fn.mobHurt(e, 10, 0, 0)); ok(Math.abs(at('EHP', e) - 28) < 0.01, 'shut: 10 -> 2: ' + at('EHP', e));
put('EVAR', e, 60); put('EHURT', e, 0); call(() => fn.mobHurt(e, 10, 0, 0)); ok(Math.abs(at('EHP', e) - 18) < 0.01, 'open: 10: ' + at('EHP', e));
clearMobs();
// building: the snow keeper, the iron keeper, the king of the black bones
const bx = X - 6, bz = Z - 6;
const build = (x, y, z, k) => { call(() => fn.setBlock(x, y, z, id(k))); call(() => fn.buildMob(x, y, z, id(k))); };
call(() => fn.setBlock(bx, Y, bz, id('snow_block'))); call(() => fn.setBlock(bx, Y + 1, bz, id('snow_block'))); build(bx, Y + 2, bz, 'carved_pumpkin');
ok(arr('ET').includes(M('snowKeeper')) && call(() => fn.blockAt(bx, Y + 1, bz)) === 0, 'a snow keeper built');
for (const [dx, dy] of [[0, 0], [0, 1], [-1, 1], [1, 1]]) call(() => fn.setBlock(bx + 3 + dx, Y + dy, bz, id('iron_block')));
build(bx + 3, Y + 2, bz, 'carved_pumpkin');
ok(arr('ET').includes(M('golem')), 'an iron keeper built');
for (const [dx, dy] of [[0, 0], [0, 1], [-1, 1], [1, 1]]) call(() => fn.setBlock(bx + 8 + dx, Y + dy, bz, id('wail_sand')));
build(bx + 7, Y + 2, bz, 'black_skeleton_skull'); build(bx + 9, Y + 2, bz, 'black_skeleton_skull');
ok(!arr('ET').includes(M('boneKing')), 'two skulls: nothing yet');
build(bx + 8, Y + 2, bz, 'black_skeleton_skull');
const ke = arr('ET').indexOf(M('boneKing')) + 1;
ok(ke > 0, 'the third skull: the king wakes');
clearMobs();
// a villager killed by a zombie on hard is one of them
s.poke('difficulty', 3); s.poke('gameMode', 1);
cmd(`/fill ${X + 2} ${Y} ${Z - 1} ${X + 4} ${Y + 1} ${Z + 1} stone`); cmd(`/setblock ${X + 3} ${Y} ${Z} air`); cmd(`/setblock ${X + 3} ${Y + 1} ${Z} air`); cmd(`/fill ${X + 4} ${Y} ${Z} ${X + 4} ${Y + 1} ${Z} air`);
const v = add(M('villager'), X + 3.5, Y, Z + 0.5); add(M('zombie'), X + 5.5, Y, Z + 0.5);
for (let i = 0; i < 600 && at('ET', v) === M('villager'); i++) F(1);
ok(at('ET', v) === M('zombieVillager'), 'the villager rose as a zombie villager');
arr('ET').forEach((t, i) => { if (t === M('zombie')) arr('ET')[i] = 0; });
use(v, 'golden_apple'); ok(at('EVAR', v) === 2, 'given a golden apple: curing');
put('ECNV', v, 0.01); F(3); ok(at('ET', v) === M('villager'), `cured: ${at('ET', v)} ${at('EVAR', v)} ${at('ECNV', v)}`);
clearMobs(); s.poke('difficulty', 2); cmd(`/fill ${X + 2} ${Y} ${Z - 1} ${X + 4} ${Y + 1} ${Z + 1} air`);
// lightning: a pig is a rotted ash-folk, a mushroom charged
const pg = add(M('pig'), X + 3.5, Y, Z + 0.5), bm = add(M('bombshroom'), X + 3.5, Y, Z + 1.5);
call(() => fn.lightning(X + 3.5, Y, Z + 1));
ok(at('ET', pg) === M('rotPig'), 'the pig struck: ' + at('ET', pg));
ok(at('EVAR', bm) === 1, 'the mushroom charged');
clearMobs();
// rare drops only for the player's kills; xp too
s.poke('gameMode', 0);
let skulls = 0; const xp0 = s.peek('xpPts') + s.peek('xpLevel') * 100;
for (let i = 0; i < 400; i++) { const b = add(M('blackskel'), X + 3.5, Y, Z + 0.5); put('EHURT', b, 0); s.poke('pKill', 1); call(() => fn.mobHurt(b, 99, 0, 0)); s.poke('pKill', 0); skulls += s.peek('IID').filter(v => v === id('black_skeleton_skull')).length; for (let j = 1; j <= s.peek('IID').length; j++) arr('IID')[j - 1] = 0; }
ok(skulls >= 2 && skulls <= 25, `black skulls of 400 kills (2.5%): ${skulls}`);
const xp1 = s.peek('xpPts') + s.peek('xpLevel') * 100; ok(xp1 > xp0, 'xp for the kills');
for (let i = 1; i <= s.peek('IID').length; i++) arr('IID')[i - 1] = 0;
// pets kept with the world
clearMobs();
e = add(M('cat'), X + 2.5, Y, Z + 0.5); put('EOWN', e, 2);
call(() => fn.petsPack()); clearMobs(); call(() => fn.petsRestore());
const ce = arr('ET').indexOf(M('cat')) + 1;
ok(ce > 0 && at('EOWN', ce) === 2, 'a sitting cat kept and back');
clearMobs();
// the trident: thrown, it hits and lies there
s.poke('gameMode', 0); stand(X, Y, Z); s.poke('yaw', 90); s.poke('pitch', 0); F(2);
e = add(M('zombie'), X + 6.5, Y, Z + 0.5); put('EHP', e, 100); F(1);
hold('trident'); call(() => fn.tridentThrow());
ok(arr('INVI')[s.peek('hotSel') - 1] === 0, 'thrown: out of the hand');
F(60);
ok(at('EHP', e) < 100 || s.peek('IID').includes(id('trident')), `it hit or lies: hp ${at('EHP', e)}`);
ok(s.peek('IID').includes(id('trident')), 'the trident lies to be picked up');
clearMobs();
// a raid: waves by the village, the hero after
s.poke('gameMode', 0);
s.poke('raidOn', 1); s.poke('raidX', X); s.poke('raidZ', Z); s.poke('raidWave', 0); s.poke('raidN', 2); s.poke('raidT', 0);
F(3); ok(s.peek('raidWave') === 1 && arr('EOWN').filter(v => v === -1).length >= 2, 'the first wave: ' + arr('EOWN').filter(v => v === -1).length);
const kill = () => { arr('ET').forEach((t, i) => { if (t && arr('EOWN')[i] === -1) arr('ET')[i] = 0; }); };
kill(); s.poke('raidT', 0); F(3); ok(s.peek('raidWave') === 2, 'the second wave');
kill(); s.poke('raidT', 0); F(3); ok(s.peek('raidOn') === 0 && s.peek('EFT')[22 - 1] > 0, 'won: the hero of the village');
console.log(fails ? fails + ' FAILED' : 'all ok');
