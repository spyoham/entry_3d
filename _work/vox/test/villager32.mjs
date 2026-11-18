// (v3.2) the village folk at work, hens, sheep, mushrooms, bone meal: node test/villager32.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const cmd = (c) => call(() => fn.runCommand(c));
const M = (n) => s.peek('M_' + n.toUpperCase());
const I = (n) => s.peek('I_' + n);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
const arr = (k) => s.peek(k);
const at = (k, e) => arr(k)[e - 1], put = (k, e, v) => { arr(k)[e - 1] = v; };
const clearMobs = () => { const ET = arr('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0; const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; };
const add = (t, x, y, z) => { call(() => fn.mobAdd(t, x, y, z)); return s.peek('lastMob'); };
const setb = (x, y, z, b) => call(() => fn.setBlock(x, y, z, b));
const blk = (x, y, z) => call(() => fn.blockAt(x, y, z));
const think = (e, k = 1) => { for (let i = 0; i < k; i++) call(() => fn.villThink(e)); };
// (one out of work looks round every other time: till it has a job block)
const claim = (e) => { for (let i = 0; i < 60 && at('ECNV', e) === 0; i++) call(() => fn.villThink(e)); };
const VFD = s.peek('VFD');
// what a villager is (as villGet unpacks its EVAR)
const vill = (e) => { call(() => fn.villGet(at('EVAR', e))); return { p: s.peek('vP'), l: s.peek('vL'), k: s.peek('vK'), d: s.peek('vD'), x: s.peek('vX'), s: s.peek('vS') }; };
const offer = (e, k) => { call(() => fn.villGet(at('EVAR', e))); s.poke('trMob', e); call(() => fn.vOffer(k)); return [s.peek('voA'), s.peek('voAN'), s.peek('voB'), s.peek('voBN'), s.peek('voD'), s.peek('voM'), s.peek('voU')]; };
const give = (slot, id, n) => { arr('INVI')[slot - 1] = id; arr('INVN')[slot - 1] = n; arr('INVD')[slot - 1] = 0; };
const count = (id) => { let c = 0; const a = arr('INVI'), b = arr('INVN'); for (let i = 0; i < 36; i++) if (a[i] === id) c += b[i]; return c; };
const clearInv = () => { for (let i = 1; i <= 36; i++) give(i, 0, 0); };
const trade = (e, k) => { s.poke('trMob', e); s.poke('trSel', k + 1); call(() => fn.villClick()); };
const hold = (e, x, z) => { put('EX', e, x + 0.5); put('EZ', e, z + 0.5); put('EVX', e, 0); put('EVZ', e, 0); };
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`); cmd(`/fill ${X - 12} ${Y} ${Z - 12} ${X + 12} ${Y + 8} ${Z + 12} air`);
s.poke('flying', 0); stand(X, Y, Z); s.poke('grMobs', 0); s.poke('gameMode', 1); F(5);

// ---------------------------------------------------------------- a job block gives a profession
let e = add(M('villager'), X + 2.5, Y + 0.05, Z + 0.5);
F(10);
ok(vill(e).p === 0, 'a villager with no job block near has no profession');
setb(X + 3, Y, Z, I('lectern'));
F(1200);
let v = vill(e);
ok(v.p === 2 && v.l === 1 && v.s > 0 && at('ECNV', e) > 0, `a lectern near: a librarian by the game's own clock (profession ${v.p}, level ${v.l}, seed ${v.s})`);
call(() => fn.jobAt(at('ECNV', e)));
ok(s.peek('jbX') === X + 3 && s.peek('jbY') === Y && s.peek('jbZ') === Z, 'its job block is the lectern');
const e2 = add(M('villager'), X + 4.5, Y + 0.05, Z + 0.5);
think(e2, 6);
ok(vill(e2).p === 0, 'a second villager does not take the same block');
setb(X + 5, Y, Z + 1, I('composter')); claim(e2);
ok(vill(e2).p === 1, 'it takes the composter put for it: a farmer');
// ---------------------------------------------------------------- its offers are its own
const o0 = JSON.stringify([offer(e, 0), offer(e, 1)]);
ok(offer(e, 0)[0] > 0 && offer(e, 0)[2] > 0 && JSON.stringify(offer(e, 0)) !== JSON.stringify(offer(e, 1)), 'two different offers at the first level: ' + o0);
// kept and brought back (its chunk out of the window and in again): the same villager
const evar = at('EVAR', e), ecnv = at('ECNV', e);
call(() => fn.keptPut(e)); put('ET', e, 0);
ok(arr('KPT').length === 1, 'kept');
add(M('pig'), X - 5.5, Y, Z - 5.5);
call(() => fn.petsRestore());
e = arr('ET').findIndex((t, i) => t === M('villager') && arr('EVAR')[i] === evar) + 1;
ok(e > 0 && at('ECNV', e) === ecnv && JSON.stringify([offer(e, 0), offer(e, 1)]) === o0, 'brought back in another slot: the same work and offers');
// ---------------------------------------------------------------- nobody traded: the block gone, the work gone; another block, other offers
const seeds = new Set([vill(e).s]);
let differ = 0;
for (let r = 0; r < 6; r++) {
  setb(X + 3, Y, Z, 0); hold(e, X + 2, Z); think(e, 1);
  if (r === 0) ok(vill(e).p === 0 && at('ECNV', e) === 0, 'the lectern broken before any trade: out of work');
  setb(X + 3, Y, Z, I('lectern')); claim(e);
  seeds.add(vill(e).s);
  if (JSON.stringify([offer(e, 0), offer(e, 1)]) !== o0) differ++;
}
ok(vill(e).p === 2 && seeds.size >= 5 && differ >= 1, `the lectern put again: a librarian with new offers each time (${seeds.size} seeds in 7, ${differ} of 6 unlike the first)`);
// a book among a novice librarian's offers within some tries (two of its three first offers)
let book = 0, tries = 0;
while (book === 0 && tries < 40) { setb(X + 3, Y, Z, 0); think(e, 1); setb(X + 3, Y, Z, I('lectern')); claim(e); tries++; if (offer(e, 0)[4] > 0 || offer(e, 1)[4] > 0) book = 1; }
const bk = offer(e, 0)[4] > 0 ? 0 : 1, bo = offer(e, bk);
call(() => fn.enDesc(I('enchantedBook'), bo[4]));
ok(book === 1 && bo[2] === I('enchantedBook') && bo[1] >= 5 && bo[1] <= 64, `a charmed book offered after ${tries} tries: ${s.peek('enS')} for ${bo[1]} jade`);
// ---------------------------------------------------------------- trading: paid, given, used, locked
s.poke('gameMode', 0); clearInv(); give(1, I('jade'), 64); give(2, I('jade'), 64);
const xp0 = vill(e).x;
trade(e, bk);
ok(count(I('jade')) === 128 - bo[1] && count(I('enchantedBook')) === 1, `the book bought for ${bo[1]} jade`);
const got = arr('INVI').findIndex((x) => x === I('enchantedBook'));
ok(arr('INVD')[got] === bo[4], 'the book has the charm that was shown');
v = vill(e);
ok(v.k === 1 && v.x > xp0 && offer(e, bk)[6] === 1, `the villager has traded: locked, xp ${v.x}, the offer used once`);
const locked = JSON.stringify([offer(e, 0).slice(0, 5), offer(e, 1).slice(0, 5)]);
setb(X + 3, Y, Z, 0); hold(e, X + 2, Z); think(e, 3);
ok(vill(e).p === 2 && at('ECNV', e) === 0 && JSON.stringify([offer(e, 0).slice(0, 5), offer(e, 1).slice(0, 5)]) === locked, 'its lectern broken after a trade: still a librarian with the same offers');
setb(X + 3, Y, Z, I('composter')); think(e, 12);
ok(vill(e).p === 2 && at('ECNV', e) === 0, 'a composter is not its kind of block');
setb(X + 3, Y, Z, I('lectern')); claim(e);
ok(at('ECNV', e) > 0 && JSON.stringify([offer(e, 0).slice(0, 5), offer(e, 1).slice(0, 5)]) === locked, 'a lectern again: its job block, the offers as they were');
// with not enough to pay: nothing
clearInv(); give(1, I('jade'), 1);
const u0 = offer(e, bk)[6];
if (bo[1] > 1) { trade(e, bk); ok(count(I('jade')) === 1 && offer(e, bk)[6] === u0, 'too little jade: no trade'); }
// the trade screen draws and takes a click on an offer (the mouse over the first row)
call(() => fn.tradeOpen(e)); F(3);
ok(s.peek('uiMode') === 10, 'the trade screen is open and draws');
call(() => fn.tradeOpen(e2)); F(3);
s.poke('uiMode', 0); call(() => fn.txClear()); F(2);
// ---------------------------------------------------------------- learning: more offers
s.poke('gameMode', 1);
let lv0 = vill(e).l, tr = 0;
while (vill(e).l === 1 && tr < 30) { const k = offer(e, 0)[6] < offer(e, 0)[5] ? 0 : 1; trade(e, k); tr++; }
v = vill(e);
ok(lv0 === 1 && v.l === 2 && v.x >= 10, `after ${tr} more trades it is level ${v.l} (xp ${v.x})`);
ok(offer(e, 2)[0] > 0 && offer(e, 3)[0] > 0, 'two more offers at the second level');
put('EVAR', e, at('EVAR', e) + 2 * 16 * 8 * 2 * 4 * (246 - vill(e).x));   // xp nearly at the top
trade(e, 2);
ok(vill(e).l === 5, 'with enough xp: a master (level 5)');
let all = 0; for (let k = 0; k < 10; k++) if (offer(e, k)[0] > 0 && offer(e, k)[2] > 0) all++;
ok(all === 10, 'ten offers');
// ---------------------------------------------------------------- sold out, and filled again by its job block
let sold = 0;
for (let i = 0; i < 20; i++) trade(e, 3);
const so = offer(e, 3);
ok(so[6] === so[5], `an offer is sold out after ${so[5]} trades`);
clearInv(); trade(e, 3);
ok(offer(e, 3)[6] === so[5] && count(so[2]) === 0, 'sold out: nothing more of it');
hold(e, X + 2, Z); put('EAGE', e, 0); think(e, 1);
ok(offer(e, 3)[6] === 0 && at('EAGE', e) > s.peek('gameTicks'), 'by its lectern the offers are filled again (and not again before half a day)');
for (let i = 0; i < 3; i++) trade(e, 3);
think(e, 3);
ok(offer(e, 3)[6] === 3, 'not filled again at once');
// ---------------------------------------------------------------- a child: food, and a bed to spare
clearMobs(); cmd(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 2} ${Z + 8} air`);
const a = add(M('villager'), X + 2.5, Y + 0.05, Z + 0.5), b = add(M('villager'), X + 5.5, Y + 0.05, Z + 0.5);
const bed = I('redBed');
setb(X + 6, Y, Z + 3, bed); setb(X + 6, Y, Z + 4, bed + 4); setb(X + 4, Y, Z + 3, bed); setb(X + 4, Y, Z + 4, bed + 4);
ok(call(() => fn.bedsNear(a)) === 2, 'two beds counted (their head halves)');
call(() => fn.dropItem(I('bread'), 3, 0, X + 2.5, Y + 0.3, Z + 0.5, 0)); call(() => fn.dropItem(I('carrot'), 12, 0, X + 5.5, Y + 0.3, Z + 0.5, 0));
think(a, 1); think(b, 1);
ok(Math.floor(at('ETG', a) / VFD) === 12 && Math.floor(at('ETG', b) / VFD) === 12 && arr('IID').every((x) => x === 0), 'three loaves and twelve carrots picked up: both are willing');
ok(arr('ET').filter((t) => t === M('villager')).length === 2 && at('ELOVE', b) < 0 && at('ELOVE', b) >= -20, 'two beds for two: no child (they wait a little)');
setb(X + 2, Y, Z + 3, bed); setb(X + 2, Y, Z + 4, bed + 4);
put('ELOVE', a, 0); put('ELOVE', b, 0); hold(a, X + 2, Z); hold(b, X + 3, Z + 1); think(a, 1);
const kids = []; arr('ET').forEach((t, i) => { if (t === M('villager') && arr('ESZ')[i] === 0.5) kids.push(i + 1); });
ok(kids.length === 1 && at('EAGE', kids[0]) === -1200, 'a third bed: a child, twenty minutes to grow');
ok(at('ELOVE', a) === -300 && at('ELOVE', b) === -300 && Math.floor(at('ETG', a) / VFD) === 0, 'the parents rest five minutes, their food eaten');
think(kids[0], 4);
ok(vill(kids[0]).p === 0, 'a child takes no work');
// ---------------------------------------------------------------- the iron keeper they call
clearMobs();
const g1 = add(M('villager'), X + 2.5, Y + 0.05, Z + 0.5), g2 = add(M('villager'), X + 3.5, Y + 0.05, Z + 1.5), g3 = add(M('villager'), X + 1.5, Y + 0.05, Z + 1.5);
const golems = () => arr('ET').filter((t) => t === M('golem')).length;
setb(X + 2, Y, Z + 3, 0); setb(X + 2, Y, Z + 4, 0);
for (let i = 0; i < 3000 && golems() === 0; i++) call(() => fn.villKeeper(g1));
ok(golems() === 0, 'three villagers with two beds: no keeper');
setb(X + 2, Y, Z + 3, bed); setb(X + 2, Y, Z + 4, bed + 4);
for (let i = 0; i < 3000 && golems() === 0; i++) call(() => fn.villKeeper(g2));
ok(golems() === 0, 'only the lowest of a group calls one (a group counts once)');
let calm = 0; while (golems() === 0 && calm < 20000) { call(() => fn.villKeeper(g1)); calm++; }
ok(golems() === 1, `three villagers and three beds: a keeper after ${calm} looks (about one in 280 when calm)`);
const gi = arr('ET').findIndex((t) => t === M('golem')) + 1;
ok(Math.abs(at('EX', gi) - at('EX', g1)) <= 9 && blk(Math.floor(at('EX', gi)), Math.floor(at('EY', gi)) - 1, Math.floor(at('EZ', gi))) > 0, 'it stands on a block within 8 of them');
for (let i = 0; i < 3000; i++) call(() => fn.villKeeper(g1));
ok(golems() === 1, 'while a keeper is within 16 blocks no other comes');
put('ET', gi, 0);
const zo = add(M('zombie'), X + 6.5, Y + 0.05, Z + 0.5);
let scared = 0; while (golems() === 0 && scared < 2000) { put('EX', zo, X + 6.5); put('EZ', zo, Z + 0.5); call(() => fn.villKeeper(g1)); scared++; }
ok(golems() === 1 && scared < 400, `a monster near: a keeper after ${scared} looks (about one in 23)`);
// ---------------------------------------------------------------- cured: its work back, and cheaper
clearMobs(); cmd(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 2} ${Z + 8} air`);
e = add(M('villager'), X + 2.5, Y + 0.05, Z + 0.5);
setb(X + 3, Y, Z, I('composter')); claim(e);
s.poke('gameMode', 1); trade(e, 0);
const ck = offer(e, 0)[1] > 1 ? 0 : 1, before = offer(e, ck), pb = vill(e);
s.poke('hitBy', M('zombie')); s.poke('difficulty', 3);
ok(call(() => fn.villagerTurn(e)) === 1 && at('ET', e) === M('zombieVillager') && at('EVAR', e) === 0 && at('ETG', e) === 0, 'killed by the dead: one of them');
s.poke('hitBy', 0); s.poke('gameMode', 0); give(s.peek('hotSel'), I('goldenApple'), 1);
ok(call(() => fn.mobUse(e, I('goldenApple'))) === 1 && at('EVAR', e) === 2, 'a golden apple: the cure begins');
put('ECNV', e, Math.floor(at('ECNV', e) / 1024) * 1024 + 0.3); s.poke('gameMode', 1); put('EHP', e, 20); put('EFIR', e, 0);
stand(X, Y, Z); F(40);
v = vill(e);
ok(at('ET', e) === M('villager') && v.p === pb.p && v.s === pb.s && v.k === 1 && v.d === 1, `cured: a farmer again with its seed, one cure noted (${JSON.stringify(v)})`);
const after = offer(e, ck);
ok(after[0] === before[0] && after[2] === before[2] && after[1] === Math.max(1, Math.round(before[1] * 0.7)) && after[1] < before[1], `the same offer, cheaper: ${before[1]} -> ${after[1]}`);
// ---------------------------------------------------------------- hens lay, sheep graze, mushrooms spread, bone meal
clearMobs(); cmd(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 2} ${Z + 8} air`);
const hen = add(M('chicken'), X + 2.5, Y + 0.05, Z + 0.5);
F(3);
ok(at('ECNV', hen) >= 295 && at('ECNV', hen) <= 600, `a hen's first egg is 5 to 10 minutes off (${Math.round(at('ECNV', hen))} s)`);
put('ECNV', hen, 0.2); F(30);
ok(arr('IID').includes(I('egg')) && at('ECNV', hen) >= 295, 'the time up: an egg on the ground, the next 5 to 10 minutes off');
clearMobs();
cmd(`/fill ${X + 1} ${Y - 1} ${Z - 1} ${X + 3} ${Y - 1} ${Z + 1} grass_block`);
const sh = add(M('sheep'), X + 2.5, Y + 0.05, Z + 0.5);
ok(at('EVAR', sh) === 1, 'a sheep has its coat');
s.poke('gameMode', 0); give(s.peek('hotSel'), I('shears'), 1);
ok(call(() => fn.sheepShear(sh)) === 1 && at('EVAR', sh) === 0 && arr('IID').includes(32), 'shorn: wool on the ground, no coat');
ok(call(() => fn.sheepShear(sh)) === 0, 'a shorn sheep gives no more wool');
F(200);
ok(at('EVAR', sh) === 0 || blk(Math.floor(at('EX', sh)), Y - 1, Math.floor(at('EZ', sh))) !== 2, 'the coat is not back by itself in seconds');
let gz = 0; put('EVAR', sh, 0);
while (at('EVAR', sh) === 0 && gz < 2000) { hold(sh, X + 2, Z); put('EY', sh, Y); put('EGND', sh, 1); call(() => fn.sheepGraze(sh)); gz++; }
ok(at('EVAR', sh) === 1 && blk(X + 2, Y - 1, Z) === 3, `it grazed (after ${gz} looks): the grass is dirt, the coat is back`);
clearMobs(); s.poke('gameMode', 1);
// a dark room: mushrooms spread, up to five
cmd(`/fill ${X - 10} ${Y} ${Z - 10} ${X - 2} ${Y + 3} ${Z - 2} stone`); cmd(`/fill ${X - 9} ${Y} ${Z - 9} ${X - 3} ${Y + 2} ${Z - 3} air`);
F(20);
const mb = I('mushBrown');
setb(X - 6, Y, Z - 6, mb);
const mush = () => { let c = 0; for (let x = X - 9; x <= X - 3; x++) for (let z = Z - 9; z <= Z - 3; z++) for (let y = Y; y <= Y + 2; y++) if (blk(x, y, z) === mb) c++; return c; };
for (let i = 0; i < 400; i++) for (let x = X - 9; x <= X - 3; x++) for (let z = Z - 9; z <= Z - 3; z++) if (blk(x, Y, z) === mb) call(() => fn.mushSpread(x, Y, z, mb));
const mc = mush();
ok(mc >= 2 && mc <= 8, `a mushroom in the dark spreads, and stops (${mc})`);
setb(X + 6, Y, Z + 6, mb);
for (let i = 0; i < 300; i++) call(() => fn.mushSpread(X + 6, Y, Z + 6, mb));
let lit = 0; for (let x = X + 5; x <= X + 7; x++) for (let z = Z + 5; z <= Z + 7; z++) if (blk(x, Y, z) === mb) lit++;
ok(lit === 1, 'not in the daylight');
// bone meal: bamboo up, kelp up into water, cane not
setb(X + 6, Y, Z - 6, I('bamboo'));
ok(call(() => fn.boneMeal(X + 6, Y, Z - 6, I('bamboo'))) === 1 && blk(X + 6, Y + 1, Z - 6) === I('bamboo'), 'bone meal: bamboo grows');
setb(X + 4, Y, Z - 6, I('reed'));
ok(call(() => fn.boneMeal(X + 4, Y, Z - 6, I('reed'))) === 0 && blk(X + 4, Y + 1, Z - 6) === 0, 'bone meal does nothing for cane');
console.log(fails === 0 ? 'all ok' : `${fails} FAILED`);
process.exit(fails ? 1 : 0);
