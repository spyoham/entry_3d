// (v2.9) items burn, the mushroom lit, crops off dirt, crawling under a trapdoor, the egg's player, //tab: node test/v29a.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const cmd = (c) => call(() => fn.runCommand(c));
const at = (x, y, z) => KEY[call(() => fn.blockAt(x, y, z))];
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
cmd(`/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y - 1} ${Z + 8} stone`); cmd(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 6} ${Z + 8} air`);
s.poke('gameMode', 0); s.poke('flying', 0); stand(X, Y, Z); F(5);
// items in lava and fire
cmd(`/setblock ${X + 4} ${Y} ${Z} lava`); cmd(`/setblock ${X + 4} ${Y} ${Z + 2} fire`); F(2);
const drop = (k, x, z) => { call(() => fn.dropItem(id(k), 1, 0, x + 0.5, Y + 0.6, z + 0.5, 0)); };
const lying = (k) => s.peek('IID').filter(v => v === id(k)).length;
drop('diamond', X + 4, Z); drop('abyss_ingot', X + 4, Z); drop('oak_planks', X + 4, Z + 2); drop('abyss_scrap', X + 4, Z + 2); drop('diamond_sword', X + 4, Z); drop('abyss_sword', X + 4, Z);
F(40);
ok(lying('diamond') === 0 && lying('oak_planks') === 0 && lying('diamond_sword') === 0, 'diamond, planks, a diamond sword burnt');
ok(lying('abyss_ingot') === 1 && lying('abyss_scrap') === 1 && lying('abyss_sword') === 1, 'the abyss ingot, scrap and sword did not');
cmd(`/fill ${X + 4} ${Y} ${Z} ${X + 4} ${Y} ${Z + 2} air`); F(20);
// the mushroom lit with flint and steel
s.poke('gameMode', 1);
call(() => fn.mobAdd(s.peek('M_BOMBSHROOM'), X + 0.5, Y, Z + 6.5)); const be = s.peek('lastMob');
const I = s.peek('INVI'), IN = s.peek('INVN'); const hs = s.peek('hotSel'); I[hs - 1] = 122; IN[hs - 1] = 1;
s.poke('mobPick', be); s.poke('pickOn', 0); s.poke('placeCool', 0); call(() => fn.useKey());
ok(s.peek('EST')[be - 1] === 6, 'flint and steel lights it (state 6)');
let gone = 0; for (let k = 1; k < 150 && !gone; k++) { F(1); if (s.peek('ET')[be - 1] === 0) gone = k; }
console.log('hp', s.peek('hp'));
ok(gone > 60 && gone < 130, `it went off after ${gone} frames`);
// crops off when the farmland under them turns to dirt
cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X - 4} ${Y - 1} ${Z - 4} farmland`); cmd(`/fill ${X - 6} ${Y} ${Z - 6} ${X - 4} ${Y} ${Z - 4} wheat_3`);
call(() => fn.setBlock(X - 5, Y - 1, Z - 5, 3));
ok(at(X - 5, Y, Z - 5) === ' ' && at(X - 4, Y, Z - 4) === 'wheat_3', 'setBlock dirt: the wheat over it went, the others stay');
cmd(`/setblock ${X - 6} ${Y - 1} ${Z - 6} dirt`);
ok(at(X - 6, Y, Z - 6) === ' ', '/setblock dirt: the wheat went: ' + at(X - 6, Y, Z - 6));
// a trapdoor closed over the head: crawl
s.poke('gameMode', 1); s.poke('flying', 0);
cmd(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 6} ${Z + 8} air`); stand(X, Y, Z); F(10);
const td = id('oak_trapdoor');
call(() => fn.setBlock(X, Y + 1, Z, td)); F(5);
ok(s.peek('swimming') === 1, 'a closed trapdoor at the head: lying down (crawling) ' + s.peek('swimming'));
ok(Math.abs(s.peek('py') - Y) < 0.05, 'not pushed up: py ' + s.peek('py'));
call(() => fn.setBlock(X, Y + 1, Z, 0)); F(5);
ok(s.peek('swimming') === 0, 'gone: standing again');
// sneaking under a 1.5 gap: a top slab at Y+1? (a slab at the top of Y+1 leaves 1.5)
call(() => fn.setBlock(X, Y + 1, Z, id('oak_slab_top'))); F(3);
ok(s.peek('sneaking') === 1 && s.peek('swimming') === 0, `a top slab at the head: sneaking ${s.peek('sneaking')} swimming ${s.peek('swimming')}`);
call(() => fn.setBlock(X, Y + 1, Z, 0)); F(5);
// the player from an egg: hit and killed, gone
s.poke('gameMode', 0);
call(() => fn.mobAdd(s.peek('M_NETPLAYER'), X + 2.5, Y, Z + 0.5)); const pe = s.peek('lastMob');
let hits = 0; while (s.peek('ET')[pe - 1] !== 0 && hits < 30) { s.poke('mobPick', pe); s.poke('attackCool', 0); s.peek('EHURT')[pe - 1] = 0; call(() => fn.attack()); F(1); hits++; }
ok(s.peek('ET')[pe - 1] === 0, `the egg's player died and went after ${hits} hits`);
// tab after //
const ac = (l) => { call(() => fn.acBuild(l)); return s.peek('ACL').slice(); };
let L = ac('//se'); ok(L.includes('set') && L.includes('sel'), '//se: ' + L.join(' '));
L = ac('//set sto'); ok(L.includes('stone'), '//set sto: ' + L.slice(0, 5).join(' '));
L = ac('//rotate '); ok(L.includes('90') && L.includes('180'), '//rotate: ' + L.join(' '));
L = ac('//stack 3 '); ok(L.includes('up') && L.includes('east'), '//stack 3: ' + L.join(' '));
L = ac('/gi'); ok(L.includes('give') && !L.includes('set'), '/gi still the commands: ' + L.join(' '));
console.log(fails ? fails + ' FAILED' : 'all ok');
