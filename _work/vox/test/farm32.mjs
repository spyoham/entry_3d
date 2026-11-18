// (v3.2) what farms are built on: water carries mobs and things, a fall hurts, monsters come in any dark
// room 24 blocks away, things stack and go into hoppers, animals are kept: node test/farm32.mjs
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
const WY = s.peek('WY');
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = Math.min(80, WY - 24);
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
const arr = (k) => s.peek(k);
const at = (k, e) => arr(k)[e - 1], put = (k, e, v) => { arr(k)[e - 1] = v; };
const clearMobs = () => { const ET = arr('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0; };
const clearItems = () => { const I = arr('IID'); for (let i = 0; i < I.length; i++) I[i] = 0; };
const add = (t, x, y, z) => { call(() => fn.mobAdd(t, x, y, z)); return s.peek('lastMob'); };
const blk = (x, y, z) => call(() => fn.blockAt(x, y, z));
const items = (k) => { const I = arr('IID'), N = arr('INN'); let c = 0; for (let i = 0; i < I.length; i++) if (I[i] === (typeof k === 'string' ? id(k) : k)) c += N[i]; return c; };
console.log('world height', WY, 'mob slots', s.peek('NMOB'), 'thing slots', s.peek('NITM'));
// a stone floor in the air, creative, no spawning while the pieces are tried
cmd(`/fill ${X - 14} ${Y - 1} ${Z - 14} ${X + 14} ${Y - 1} ${Z + 14} stone`); cmd(`/fill ${X - 14} ${Y} ${Z - 14} ${X + 14} ${Y + 8} ${Z + 14} air`);
s.poke('flying', 0); s.poke('gameMode', 1); stand(X, Y, Z); s.poke('grMobs', 0); s.poke('difficulty', 2); F(5);

// ---- 1. flowing water carries a mob (a channel 8 long: a source at one end, walls on the sides)
cmd(`/fill ${X + 2} ${Y} ${Z + 4} ${X + 11} ${Y} ${Z + 6} stone`); cmd(`/fill ${X + 3} ${Y} ${Z + 5} ${X + 10} ${Y} ${Z + 5} air`);
cmd(`/setblock ${X + 3} ${Y} ${Z + 5} water`); F(200);
let e = add(M('zombie'), X + 4.5, Y + 0.1, Z + 5.5); put('EST', e, 0);
const x0 = at('EX', e); F(150);
ok(at('ET', e) > 0 && at('EX', e) > x0 + 3, `a zombie in the stream was carried: ${x0.toFixed(1)} -> ${at('EX', e).toFixed(1)}`);
clearMobs();
// ... and a thing lying in it
call(() => fn.dropItem(id('cobblestone'), 5, 0, X + 4.5, Y + 0.5, Z + 5.5, 0));
let it = s.peek('lastItem'); const ix0 = arr('IXX')[it - 1]; F(120);
ok(arr('IID')[it - 1] > 0 && arr('IXX')[it - 1] > ix0 + 3, `a thing in the stream was carried: ${ix0.toFixed(1)} -> ${arr('IXX')[it - 1].toFixed(1)}`);
clearItems();
cmd(`/fill ${X + 2} ${Y} ${Z + 4} ${X + 11} ${Y} ${Z + 6} air`); F(30);

// ---- 2. a fall hurts a mob: 4 blocks nothing much, 23 and more kills a zombie (20), and it drops its things
s.poke('gameMode', 0); s.poke('hp', 20);
e = add(M('zombie'), X + 6.5, Y + 4.2, Z + 0.5); put('EST', e, 0); F(60);
ok(at('ET', e) === M('zombie') && at("EHP", e) >= 17, `a fall of 4 (and the sun a little): ${at('EHP', e)}`);
clearMobs();
e = add(M('zombie'), X + 6.5, Y + 12.2, Z + 0.5); F(90);
ok(at('ET', e) === M('zombie') && at('EHP', e) <= 11 && at('EHP', e) >= 8, `a fall of 12 took 9 (and the sun a little): ${at('EHP', e)}`);
clearMobs(); clearItems();
let died = 0;
for (let k = 0; k < 6; k++) { e = add(M('zombie'), X + 6.5, Y + 23.5, Z + 0.5); put('ESZ', e, 1); put('EAGE', e, 0); F(120); if (at('ET', e) === 0) died++; clearMobs(); }
ok(died === 6, `a fall of 23 kills: ${died}/6`);
ok(items('rotten_flesh') > 0, `its things lie there: flesh ${items('rotten_flesh')}`);
clearItems();
// a chicken flutters down, a fall into water does not hurt
e = add(M('chicken'), X + 6.5, Y + 20, Z + 0.5); F(150);
ok(at('ET', e) === M('chicken') && at('EHP', e) === 4, 'a chicken is not hurt by a fall');
clearMobs();
cmd(`/fill ${X + 5} ${Y} ${Z - 1} ${X + 7} ${Y} ${Z + 1} stone`); cmd(`/setblock ${X + 6} ${Y} ${Z} water`); F(10);
s.poke('gameMode', 1); e = add(M('zombie'), X + 6.5, Y + 23.5, Z + 0.5); put('ESZ', e, 1); put('EAGE', e, 0); F(120); s.poke('gameMode', 0);
ok(at('ET', e) === M('zombie') && at('EHP', e) >= 16, `a fall into water (the sun burns a little): ${at('EHP', e)}`);
clearMobs(); cmd(`/fill ${X + 5} ${Y} ${Z - 1} ${X + 7} ${Y} ${Z + 1} air`); F(10);
// a cactus pricks, a block round the head chokes
cmd(`/setblock ${X + 8} ${Y - 1} ${Z + 8} sand`); cmd(`/setblock ${X + 8} ${Y} ${Z + 8} cactus`);
e = add(M('cow'), X + 9.4, Y + 0.05, Z + 8.5); put('EST', e, 9); put('ETM', e, 99); const hpc = at('EHP', e); F(90);
ok(at('ET', e) === 0 || at('EHP', e) < hpc, `a cow by a cactus is pricked: ${hpc} -> ${at('EHP', e)}`);
clearMobs(); cmd(`/setblock ${X + 8} ${Y} ${Z + 8} air`);
// (in creative, so that it does not run at the player; the block where its head is at that moment)
s.poke('gameMode', 1); e = add(M('zombie'), X - 6.5, Y + 0.05, Z + 0.5); put('EST', e, 0); put('ETM', e, 99); F(2); cmd(`/setblock ${Math.floor(at('EX', e))} ${Y + 1} ${Math.floor(at('EZ', e))} stone`); F(50); s.poke('gameMode', 0);
ok(at('ET', e) === 0 || at('EHP', e) < 20, `a block put round its head chokes it: ${at('EHP', e)}`);
clearMobs(); cmd(`/setblock ${X - 7} ${Y + 1} ${Z} air`); clearItems();

// ---- 3. two heaps of a thing lying together are one
call(() => fn.dropItem(id('cobblestone'), 5, 0, X + 2.5, Y + 0.3, Z - 4.5, 0)); call(() => fn.dropItem(id('cobblestone'), 7, 0, X + 2.5, Y + 0.3, Z - 4.5, 0));
{ const I = arr('IID'); for (let i = 0; i < I.length; i++) if (I[i] > 0) { arr('IVX')[i] = 0; arr('IVZ')[i] = 0; } }
stand(X - 10, Y, Z - 10); F(80);
{ const I = arr('IID'), N = arr('INN'); let heaps = 0, tot = 0; for (let i = 0; i < I.length; i++) if (I[i] === id('cobblestone')) { heaps++; tot += N[i]; } ok(heaps === 1 && tot === 12, `one heap of 12: heaps ${heaps}, in all ${tot}`); }
clearItems();

// ---- 4. a stream carries a thing onto a hopper, which takes it
cmd(`/fill ${X + 2} ${Y} ${Z - 9} ${X + 9} ${Y} ${Z - 7} stone`); cmd(`/fill ${X + 3} ${Y} ${Z - 8} ${X + 8} ${Y} ${Z - 8} air`);
cmd(`/setblock ${X + 8} ${Y - 1} ${Z - 8} hopper`); cmd(`/setblock ${X + 3} ${Y} ${Z - 8} water`); F(200);
call(() => fn.dropItem(id('cobblestone'), 3, 0, X + 4.5, Y + 0.5, Z - 7.5, 0)); F(260);
call(() => fn.chestFind(X + 8, Y - 1, Z - 8));
{ const c = s.peek('cFound'); let got = 0; if (c > 0) { const CHI = arr('CHI'), CHN = arr('CHN'); for (let k = 0; k < 5; k++) if (CHI[(c - 1) * 27 + k] === id('cobblestone')) got += CHN[(c - 1) * 27 + k]; } ok(got === 3, `the hopper at the stream's end has them: ${got}`); }
clearItems(); cmd(`/fill ${X + 2} ${Y} ${Z - 9} ${X + 9} ${Y} ${Z - 7} air`); cmd(`/setblock ${X + 8} ${Y - 1} ${Z - 8} stone`); F(20);

// ---- 5. monsters: none within 24 blocks, none on glass or in the light; in a dark room 30 blocks off
clearMobs(); s.poke('gameMode', 0); s.poke('hp', 20); s.poke('grMobs', 1); s.poke('tday', 0.5);
// (noon, high over the land: the only dark floor in reach is the room made here - a box 30 blocks east)
const RX = X + 30;
cmd(`/fill ${RX - 5} ${Y - 1} ${Z - 5} ${RX + 5} ${Y + 3} ${Z + 5} stone`); cmd(`/fill ${RX - 4} ${Y} ${Z - 4} ${RX + 4} ${Y + 2} ${Z + 4} air`);
stand(X, Y, Z); F(30);
const inRoom = () => { const ET = arr('ET'), EX = arr('EX'), EZ = arr('EZ'), EY = arr('EY'); let c = 0; for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && s.peek('MHOST')[ET[i] - 1] === 1 && Math.abs(EX[i] - RX - 0.5) < 5 && Math.abs(EZ[i] - Z - 0.5) < 5 && EY[i] >= Y - 0.5 && EY[i] < Y + 3) c++; return c; };
const nearOnes = () => { const ET = arr('ET'), EX = arr('EX'), EZ = arr('EZ'), EY = arr('EY'); let c = 0; for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && s.peek('MHOST')[ET[i] - 1] === 1 && Math.hypot(EX[i] - X - 0.5, EY[i] - Y, EZ[i] - Z - 0.5) < 23) c++; return c; };
let seen = 0, tooNear = 0;
// (the tries a few minutes of play make, at once)
for (let k = 0; k < 400 && seen < 3; k++) { s.poke('grMobs', 0); call(() => { for (let q = 0; q < 200; q++) fn.spawnTry(); }); seen = Math.max(seen, inRoom()); tooNear += nearOnes(); if (seen < 3) { const ET = arr('ET'), EX = arr('EX'); for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && Math.abs(EX[i] - RX - 0.5) >= 5) ET[i] = 0; } }
s.poke('grMobs', 1);
ok(seen >= 1, `monsters came in the dark room 30 blocks off: ${seen}`);
ok(tooNear === 0, `none within 23 blocks: ${tooNear}`);
// one who waits 60 blocks over it all: nothing comes (all of it is more than 48 away)
stand(X, Y + 60 > WY - 3 ? WY - 3 : Y + 60, Z); s.poke('flying', 1); clearMobs();
call(() => { for (let q = 0; q < 20000; q++) fn.spawnTry(); });
ok(arr('ET').filter((v) => v > 0).length === 0, `from 48 blocks over it nothing comes: ${arr('ET').filter((v) => v > 0).length}`);
s.poke('flying', 0); stand(X, Y, Z);
// the same room with a glass floor: none; with a torch in the middle of a small room: none
clearMobs(); cmd(`/fill ${RX - 4} ${Y - 1} ${Z - 4} ${RX + 4} ${Y - 1} ${Z + 4} glass`);
seen = 0; for (let k = 0; k < 400; k++) { call(() => { for (let q = 0; q < 200; q++) fn.spawnTry(); }); seen = Math.max(seen, inRoom()); const ET = arr('ET'), EX = arr('EX'); for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && Math.abs(EX[i] - RX - 0.5) >= 5) ET[i] = 0; }
ok(seen === 0, `none on a glass floor: ${seen}`);
s.poke('grMobs', 0); clearMobs();
// peaceful: the monsters go
e = add(M('zombie'), X + 5.5, Y + 0.05, Z + 0.5); s.poke('difficulty', 0); s.poke('grMobs', 1); F(40);
ok(at('ET', e) === 0, 'peaceful: a monster is gone');
s.poke('difficulty', 2); s.poke('grMobs', 0); clearMobs();

// ---- 6. animals are kept: a cow left behind (its chunk out of the window) is there again, once
s.poke('gameMode', 1);
e = add(M('cow'), X + 3.5, Y + 0.05, Z + 0.5); put('EHP', e, 7); put('EVAR', e, 0);
const cows = () => arr('ET').filter((v) => v === M('cow')).length;
ok(cows() === 1, 'one cow');
// far away (the window follows), then back
const far = 16 * 14;
stand(X + far, Y + 10, Z); s.poke('flying', 1); F(400);
ok(cows() === 0 && arr('KPT').length >= 1, `away: no cow alive, kept ${arr('KPT').length}`);
stand(X, Y, Z); F(500);
ok(cows() === 1, `back: the cow is there again, once: ${cows()}`);
{ const i = arr('ET').indexOf(M('cow')); ok(i >= 0 && arr('EHP')[i] === 7, `as it was (hp 7): ${i >= 0 ? arr('EHP')[i] : '-'}`); }
ok(arr('KPT').length === 0, `nothing left in the kept lists: ${arr('KPT').length}`);
s.poke('flying', 0); clearMobs();

// ---- 7. a piston breaks a ripe crop: its crop and seeds drop (it was one seed)
clearItems();
cmd(`/setblock ${X - 4} ${Y - 1} ${Z - 4} farmland`); cmd(`/setblock ${X - 4} ${Y} ${Z - 4} wheat[age=3]`);
const ripe = blk(X - 4, Y, Z - 4);
if (ripe === 0) { console.log('   (no ripe wheat by /setblock here: skipped)'); }
else {
  s.poke('gameMode', 0); s.poke('hp', 20);
  cmd(`/setblock ${X - 5} ${Y} ${Z - 4} piston[facing=east]`); cmd(`/setblock ${X - 6} ${Y} ${Z - 4} spark_block`); F(40);
  ok(blk(X - 4, Y, Z - 4) !== ripe, 'the piston broke the wheat');
  // (the wheat itself, and 0 to 3 seeds: before it was one seed only)
  ok(items(s.peek('I_wheat')) >= 1, `it dropped its wheat: ${items(s.peek('I_wheat'))} (and seeds ${items('wheat_seeds')})`);
  s.poke('gameMode', 1);
}
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);
