// (v2.7) closer to 1.16.5: the body (jump height, fall hurt, sneaking under a low ceiling, armour),
// blasts by blast resistance (stone, dirt, water, obsidian), leaves without a log, fire spreading and
// going out, sponges, cane by water, water washing wire away, random-tick rules
// usage: node test/je27.mjs
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
F(20);
cmd('/gamerule randomTickSpeed 0'); cmd('/weather clear'); cmd('/time set noon');
const count = (x0, y0, z0, x1, y1, z1, f) => { let c = 0; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (f(B(x, y, z))) c++; return c; };
const stand = (x, y, z) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('flying', 0); s.poke('fallTop', y); s.poke('onGround', 0); };

// ---- the body
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y + 8} ${Z + 8} air`);
cmd(`/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y - 1} ${Z + 8} stone`);
s.poke('gameMode', 0); s.poke('hp', 20); s.poke('food', 17); s.poke('sat', 0);
for (const dt of [1 / 60, 1 / 30, 1 / 15]) {
  stand(X + 0.5, Y, Z + 0.5); for (let i = 0; i < 10; i++) s.frame(dt);
  s.press(32); let top = Y;
  for (let i = 0; i < 3 / dt; i++) { s.frame(dt); top = Math.max(top, s.peek('py')); if (i == 2) s.release(32); }
  s.release(32);
  ok(top - Y > 1.18 && top - Y < 1.29, `a jump is 1.25 high at ${Math.round(1 / dt)} frames a second (${(top - Y).toFixed(3)})`);
}
// fall hurt: 4 down -> 1 (rounded up: 3.6 -> 1 too), difficulty does not scale it
cmd('/difficulty hard'); F(2);
s.poke('hp', 20); s.poke('hurtT', 0); stand(X + 0.5, Y + 4, Z + 0.5); F(90);
ok(s.peek('hp') == 19, `a fall of 4 takes 1 on hard (hp ${s.peek('hp')})`);
s.poke('hp', 20); s.poke('hurtT', 0); stand(X + 0.5, Y + 3.6, Z + 0.5); F(90);
ok(s.peek('hp') == 19, `a fall of 3.6 takes 1, rounded up (hp ${s.peek('hp')})`);
s.poke('hp', 20); s.poke('hurtT', 0); stand(X + 0.5, Y + 2.9, Z + 0.5); F(90);
ok(s.peek('hp') == 20, `a fall of 2.9 takes nothing (hp ${s.peek('hp')})`);
// diamond armour does not stop a fall
const ARMOR = ['diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots'].map(ID);
if (ARMOR.every(a => a > 0)) {
  const INVI = s.peek('INVI'); ARMOR.forEach((a, i) => { INVI[37 + i - 1] = a; });
  s.poke('hp', 20); s.poke('hurtT', 0); stand(X + 0.5, Y + 8, Z + 0.5); F(120);
  ok(s.peek('hp') == 15, `full diamond armour does not soften a fall of 8: 5 (hp ${s.peek('hp')})`);
  ARMOR.forEach((a, i) => { INVI[37 + i - 1] = 0; });
} else console.log('(no diamond armour keys)', ARMOR);
cmd('/difficulty normal');
// sneaking under a ceiling 1.5 up stays down
cmd(`/setblock ${X + 3} ${Y + 1} ${Z} stone_slab[type=top]`); F(2);
stand(X + 3.5, Y, Z + 0.5); F(5);
s.press(16); F(10); s.release(16); F(10);
ok(s.peek('sneaking') == 1, `under a ceiling 1.5 high the body stays crouched (sneaking ${s.peek('sneaking')}, block ${K(B(X + 3, Y + 1, Z))})`);
stand(X - 3.5, Y, Z + 0.5); s.press(16); F(10); s.release(16); F(10);
ok(s.peek('sneaking') == 0, 'in the open it stands up');
s.poke('gameMode', 1);

// ---- blasts
const blastIn = (mat, bx) => {
  cmd(`/fill ${bx - 4} ${Y} ${Z - 4} ${bx + 4} ${Y + 8} ${Z + 4} ${mat}`); cmd(`/setblock ${bx} ${Y + 4} ${Z} air`); F(2);
  call(() => fn.explode(bx + 0.5, Y + 4.5, Z + 0.5, 4, 1)); F(2);
  return count(bx - 4, Y, Z - 4, bx + 4, Y + 8, Z + 4, b => b === 0);
};
const inStone = blastIn('stone', X - 20), inDirt = blastIn('dirt', X + 20);
ok(inStone > 1 && inStone < 60 && inDirt > inStone * 2, `TNT in stone: a small hole (${inStone} cells), in dirt a big one (${inDirt})`);
cmd(`/fill ${X + 28} ${Y} ${Z - 4} ${X + 36} ${Y + 8} ${Z + 4} stone`);
cmd(`/setblock ${X + 32} ${Y + 4} ${Z} water`); F(2);
call(() => fn.explode(X + 32.5, Y + 4.5, Z + 0.5, 4, 1)); F(2);
ok(count(X + 28, Y, Z - 4, X + 36, Y + 8, Z + 4, b => b === 0) == 0, 'TNT in water breaks nothing');
cmd(`/fill ${X - 2} ${Y} ${Z + 18} ${X + 2} ${Y + 4} ${Z + 22} obsidian`); cmd(`/setblock ${X} ${Y + 2} ${Z + 20} air`); F(2);
call(() => fn.explode(X + 0.5, Y + 2.5, Z + 20.5, 4, 1)); F(2);
ok(count(X - 2, Y, Z + 18, X + 2, Y + 4, Z + 22, b => K(b) === 'obsidian') == 124, 'obsidian round a blast stands');

// ---- leaves
const LX = X - 14;
{ const Z = 26;
cmd(`/fill ${LX - 6} ${Y} ${Z - 6} ${LX + 10} ${Y + 6} ${Z + 6} air`);
put(LX, Y, Z, 'oak_log');
for (let i = 1; i <= 7; i++) put(LX + i, Y, Z, 'oak_leaves');
F(2);
for (let i = 1; i <= 7; i++) call(() => fn.leafLook(LX + i, Y, Z, 0));   // as random ticks would
F(60 * 62);
ok(K(B(LX + 6, Y, Z)) === 'oak_leaves' && B(LX + 7, Y, Z) === 0, `a leaf 6 from the log stays, one 7 away falls (${K(B(LX + 6, Y, Z))}, ${K(B(LX + 7, Y, Z))})`);
put(LX, Y, Z, 0); F(60 * 30);
const half = count(LX + 1, Y, Z, LX + 6, Y, Z, b => b !== 0); F(60 * 32);
ok(count(LX + 1, Y, Z, LX + 6, Y, Z, b => b !== 0) == 0, `the log gone, its leaves fall away one by one within a minute (${half} of 6 left after 30 s)`);
// leaves a player put stay
call(() => fn.leafPlaced(LX + 1, Y + 3, Z)); put(LX + 1, Y + 3, Z, 'oak_leaves'); call(() => fn.leafLook(LX + 1, Y + 3, Z, 0)); F(60 * 62);
ok(K(B(LX + 1, Y + 3, Z)) === 'oak_leaves', 'leaves put by a player stay');
}

// ---- fire
const FX = X + 10;
{ const Z = -20;
cmd(`/fill ${FX - 6} ${Y - 1} ${Z - 6} ${FX + 6} ${Y + 8} ${Z + 6} air`);
cmd(`/fill ${FX - 2} ${Y} ${Z - 2} ${FX + 2} ${Y} ${Z + 2} oak_planks`);
cmd(`/fill ${FX + 5} ${Y} ${Z} ${FX + 5} ${Y} ${Z} stone`);
put(FX, Y + 1, Z, 'fire'); put(FX + 5, Y + 1, Z, 'fire');
F(60 * 45);
ok(K(B(FX + 5, Y + 1, Z)) !== 'fire', 'fire on stone with nothing to burn goes out');
F(60 * 50);
const planks = count(FX - 2, Y, Z - 2, FX + 2, Y, Z + 2, b => K(b) === 'oak_planks');
ok(planks < 25, `fire on planks spreads and burns them away (${planks} of 25 left)`);
cmd('/gamerule doFireTick false');
}

// ---- sponge, cane, wire washed away
const SX = X - 10;
{ const Z = -20;
cmd(`/fill ${SX - 5} ${Y - 1} ${Z - 5} ${SX + 5} ${Y + 3} ${Z + 5} stone`);
cmd(`/fill ${SX - 4} ${Y} ${Z - 4} ${SX + 4} ${Y + 1} ${Z + 4} water`); F(30);
put(SX, Y + 1, Z, 'sponge'); F(5);
ok(K(B(SX, Y + 1, Z)) === 'wet_sponge' && count(SX - 4, Y, Z - 4, SX + 4, Y + 1, Z + 4, b => K(b) === 'water') < 100, `a sponge takes the water up (${count(SX - 4, Y, Z - 4, SX + 4, Y + 1, Z + 4, b => K(b) === 'water')} water left of 161)`);
}
const CX = X + 18;
{ const Z = -6;
cmd(`/fill ${CX - 3} ${Y - 1} ${Z - 3} ${CX + 3} ${Y + 3} ${Z + 3} air`);
cmd(`/fill ${CX - 3} ${Y - 1} ${Z - 3} ${CX + 3} ${Y - 1} ${Z + 3} sand`);
ok(call(() => fn.standsOn(ID('reeds'), ID('sand'), CX, Y, Z)) == 0, 'cane does not go on sand with no water by it');
cmd(`/setblock ${CX + 1} ${Y - 1} ${Z} water`); F(2);
ok(call(() => fn.standsOn(ID('reeds'), ID('sand'), CX, Y, Z)) == 1, 'with water by the sand it does');
put(CX, Y, Z, 'reeds'); put(CX + 1, Y - 1, Z, 'stone'); F(5);
ok(B(CX, Y, Z) === 0, `its water gone, the cane comes off (${K(B(CX, Y, Z))})`);
cmd(`/fill ${CX - 3} ${Y} ${Z - 3} ${CX + 3} ${Y} ${Z + 3} air`);
put(CX + 2, Y, Z, 'spark_wire'); put(CX, Y, Z, 'water'); F(120);
ok(K(B(CX + 2, Y, Z)) !== 'spark_wire', `water washes wire away (${K(B(CX + 2, Y, Z))})`);
put(CX - 2, Y, Z + 2, 'poppy');
ok(call(() => fn.freeAt(CX - 2, Y, Z + 2)) == 0 && (put(CX - 2, Y, Z - 2, 'grass'), call(() => fn.freeAt(CX - 2, Y, Z - 2)) == 1), 'a flower is not taken over by a block put, tall grass is');

// ---- random ticks: grass climbs a step, crops by the genre's odds
}
const GX = X;
{ const Z = 22;
cmd(`/fill ${GX - 3} ${Y - 1} ${Z - 3} ${GX + 3} ${Y + 3} ${Z + 3} air`);
put(GX, Y, Z, 'grass_block'); put(GX + 1, Y + 1, Z, 'dirt'); F(2);
let grown = 0;
for (let i = 0; i < 400 && !grown; i++) { call(() => fn.randomTick(GX, Y, Z, fn.wi(GX, Y, Z), B(GX, Y, Z))); if (K(B(GX + 1, Y + 1, Z)) === 'grass_block') grown = 1; }
ok(grown, 'grass spreads one up to dirt beside it');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
