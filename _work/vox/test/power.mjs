// spark power (the redstone of this world) in the sim: node test/power.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BRS = s.peek('BRS'), BON = s.peek('BON'), BAUX = s.peek('BAUX'), BFAC = s.peek('BFAC'), BATT = s.peek('BATT');
const on = (x, y, z) => BON[B(x, y, z)];
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y + 8} ${Z + 24} air`);
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y - 1} ${Z + 24} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 12); s.poke('pz', Z - 22); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const useAt = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.useBlock(x, y, z, b, 0); });
// as the player: the face f (D6: 0 -x 1 +x 2 -y 3 +y 4 -z 5 +z) of the block next to (x, y, z) clicked, looking yaw / pitch
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', pitch);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0);
  const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it);
});
const brk = (x, y, z) => call(() => fn.breakBlock(x, y, z, 1));
const settle = () => { call(() => fn.worldFlush()); F(2); };
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';
const lvl = (x, y, z) => BRS[B(x, y, z)] === 1 ? BAUX[B(x, y, z)] : -1;

// 1 a lever by a lamp; the lamp goes out a little after
placeAs(X, Y, Z, 'spark_lamp'); placeAs(X + 1, Y, Z, 'lever');
useAt(X + 1, Y, Z); settle(); ok(lit(X, Y, Z), 'lever on -> lamp on');
useAt(X + 1, Y, Z); settle(); ok(lit(X, Y, Z), 'lever off -> the lamp still on for a moment');
wait(0.3); ok(!lit(X, Y, Z), 'lever off -> lamp off after 0.2 s');

// 2 wire: 15 down to 1
for (let a = 1; a <= 16; a++) placeAs(X + a, Y, Z + 4, 'spark_dust');
placeAs(X, Y, Z + 4, 'lever'); useAt(X, Y, Z + 4); settle();
ok(lvl(X + 1, Y, Z + 4) === 15 && lvl(X + 2, Y, Z + 4) === 14 && lvl(X + 15, Y, Z + 4) === 1 && lvl(X + 16, Y, Z + 4) === 0, 'wire power 15, 14 .. 1, 0: ' + [1, 2, 15, 16].map(a => lvl(X + a, Y, Z + 4)).join(' '));
placeAs(X + 17, Y, Z + 4, 'spark_lamp'); settle(); ok(!lit(X + 17, Y, Z + 4), 'a lamp 17 cells off stays dark');
brk(X + 16, Y, Z + 4); settle(); placeAs(X + 16, Y, Z + 4, 'spark_lamp'); settle(); ok(lit(X + 16, Y, Z + 4), 'a lamp at the 15th wire lights');
brk(X + 5, Y, Z + 4); settle(); wait(0.3); ok(lvl(X + 6, Y, Z + 4) === 0 && !lit(X + 16, Y, Z + 4), 'a wire broken: the rest 0, the lamp out');
placeAs(X + 5, Y, Z + 4, 'spark_dust'); settle(); ok(lvl(X + 6, Y, Z + 4) === 10 && lit(X + 16, Y, Z + 4), 'put back: ' + lvl(X + 6, Y, Z + 4));
useAt(X, Y, Z + 4); settle(); wait(0.3); ok(lvl(X + 1, Y, Z + 4) === 0 && !lit(X + 16, Y, Z + 4), 'lever off: all 0');

// 3 a wire passing by a lamp does not light it; one pointing into it does
for (let a = 0; a <= 4; a++) placeAs(X + a, Y, Z + 8, 'spark_dust');
placeAs(X + 2, Y, Z + 9, 'spark_lamp'); placeAs(X - 1, Y, Z + 8, 'spark_block'); settle();
ok(!lit(X + 2, Y, Z + 9), 'a line of wire going past the lamp: dark');
placeAs(X + 5, Y, Z + 8, 'spark_lamp'); settle(); ok(lit(X + 5, Y, Z + 8), 'the line ending at a lamp lights it');
ok(call(() => fn.wireArms(X + 2, Y, Z + 8)) === 10, 'the wire in a line has two arms (x): ' + call(() => fn.wireArms(X + 2, Y, Z + 8)));
brk(X - 1, Y, Z + 8); settle(); wait(0.3);

// 4 power through a block: a lever on a block lights a lamp on its far side; wire on a block lights
// a lamp beside the block but not wire beside it
put(X, Y, Z + 12, 'stone'); placeAs(X - 1, Y, Z + 12, 'lever', 0); placeAs(X + 1, Y, Z + 12, 'spark_lamp');
ok(BATT[B(X - 1, Y, Z + 12)] === 1, 'a lever on the side of a block hangs on it: att ' + BATT[B(X - 1, Y, Z + 12)]);
useAt(X - 1, Y, Z + 12); settle(); ok(lit(X + 1, Y, Z + 12), 'lever on the block -> the lamp past the block on');
useAt(X - 1, Y, Z + 12); settle(); wait(0.3); ok(!lit(X + 1, Y, Z + 12), 'lever off -> off');
brk(X, Y, Z + 12); settle(); ok(B(X - 1, Y, Z + 12) === 0, 'the block gone: the lever falls off');
put(X + 6, Y, Z + 12, 'stone'); placeAs(X + 6, Y + 1, Z + 12, 'spark_dust'); placeAs(X + 7, Y, Z + 12, 'spark_lamp'); placeAs(X + 5, Y, Z + 12, 'spark_dust'); put(X + 5, Y + 1, Z + 12, 'stone');
put(X + 6, Y, Z + 11, 'stone'); placeAs(X + 6, Y + 1, Z + 11, 'lever', 3); useAt(X + 6, Y + 1, Z + 11); settle();
ok(lvl(X + 6, Y + 1, Z + 12) === 15 && lit(X + 7, Y, Z + 12) && lvl(X + 5, Y, Z + 12) === 0, 'wire on a block: the lamp by it on, the wire by it not (' + lvl(X + 5, Y, Z + 12) + ')');

// 5 the torch: lit; out while its block is powered (a NOT); powers the block over it
put(X + 12, Y, Z, 'stone'); placeAs(X + 12, Y, Z + 1, 'spark_torch', 5); settle();
ok(K(B(X + 12, Y, Z + 1)) === 'spark_torch_a4' && on(X + 12, Y, Z + 1) === 1, 'a torch on the side of a block: ' + K(B(X + 12, Y, Z + 1)));
placeAs(X + 12, Y, Z + 2, 'spark_lamp'); settle(); ok(lit(X + 12, Y, Z + 2), 'the lit torch lights the lamp by it');
placeAs(X + 12, Y, Z - 1, 'lever', 4); useAt(X + 12, Y, Z - 1); settle(); wait(0.2);
ok(on(X + 12, Y, Z + 1) === 0, 'the block powered (a lever on it): the torch goes out');
wait(0.3); ok(!lit(X + 12, Y, Z + 2), '... and the lamp too');
useAt(X + 12, Y, Z - 1); settle(); wait(0.2); ok(on(X + 12, Y, Z + 1) === 1 && lit(X + 12, Y, Z + 2), 'lever off: the torch lit again, the lamp on');
put(X + 16, Y, Z, 'stone'); placeAs(X + 16, Y + 1, Z, 'spark_torch'); put(X + 16, Y + 2, Z, 'stone'); put(X + 17, Y + 1, Z, 'stone'); placeAs(X + 17, Y + 2, Z, 'spark_dust'); settle();
ok(lvl(X + 17, Y + 2, Z) === 15, 'a torch under a block: the wire by that block gets 15');
// a torch that powers its own block (by a repeater into it): switches fast, then burns out for a while
put(X + 20, Y, Z, 'stone'); placeAs(X + 21, Y, Z, 'spark_torch', 1);
placeAs(X + 21, Y, Z + 1, 'spark_dust'); placeAs(X + 21, Y, Z + 2, 'spark_dust'); placeAs(X + 20, Y, Z + 2, 'spark_dust');
placeAs(X + 20, Y, Z + 1, 'repeater', 3, 180); settle();
let flips = 0, last = on(X + 21, Y, Z);
for (let i = 0; i < 120; i++) { F(1); const t = on(X + 21, Y, Z); if (t !== last) { flips++; last = t; } }
let dark = 1;
for (let i = 0; i < 40; i++) { F(1); if (on(X + 21, Y, Z) === 1) dark = 0; }
ok(flips >= 6 && dark === 1, `a torch clock: switched ${flips} times in 2 s, then burnt out`);
wait(3.5); let back = 0; for (let i = 0; i < 40; i++) { F(1); if (on(X + 21, Y, Z) === 1) back = 1; }
ok(back === 1, '... and lit again later');
brk(X + 20, Y, Z + 1); settle(); wait(0.5);

// 6 repeaters: face the look, 15 out, delay, F changes it, one way only, locked from the side
for (let a = 1; a <= 15; a++) placeAs(X + a, Y, Z - 4, 'spark_dust');
placeAs(X + 16, Y, Z - 4, 'repeater', 3, 90);
ok(BFAC[B(X + 16, Y, Z - 4)] === 1, 'repeater put looking +x faces +x');
for (let a = 17; a <= 20; a++) placeAs(X + a, Y, Z - 4, 'spark_dust');
placeAs(X, Y, Z - 4, 'lever'); useAt(X, Y, Z - 4); settle();
ok(on(X + 16, Y, Z - 4) === 0, 'not on at once');
wait(0.15); ok(on(X + 16, Y, Z - 4) === 1 && lvl(X + 17, Y, Z - 4) === 15 && lvl(X + 20, Y, Z - 4) === 12, 'after 0.1 s: on, the wire after it 15 again (' + lvl(X + 17, Y, Z - 4) + ')');
useAt(X, Y, Z - 4); settle(); wait(0.15); ok(on(X + 16, Y, Z - 4) === 0 && lvl(X + 17, Y, Z - 4) === 0, 'lever off -> off');
useAt(X + 16, Y, Z - 4); useAt(X + 16, Y, Z - 4); useAt(X + 16, Y, Z - 4); ok(BAUX[B(X + 16, Y, Z - 4)] === 4, 'F three times: delay 4');
useAt(X, Y, Z - 4); settle(); wait(0.25); ok(on(X + 16, Y, Z - 4) === 0, 'delay 4: still off after 0.25 s');
wait(0.2); ok(on(X + 16, Y, Z - 4) === 1, '... on after 0.4 s');
useAt(X, Y, Z - 4); settle(); wait(0.5);
// one way: power at its front does not go back
put(X + 21, Y, Z - 4, 'spark_block'); settle(); ok(on(X + 16, Y, Z - 4) === 0 && lvl(X + 15, Y, Z - 4) === 0, 'power in front of it does not go back');
brk(X + 21, Y, Z - 4); settle();
// locked: a powered repeater pointing into its side keeps it as it is
placeAs(X + 16, Y, Z - 3, 'repeater', 3, 180); placeAs(X + 16, Y, Z - 2, 'spark_block'); settle(); wait(0.15);
ok(on(X + 16, Y, Z - 3) === 1 && BFAC[B(X + 16, Y, Z - 3)] === 4, 'a side repeater (facing -z) powered');
useAt(X, Y, Z - 4); settle(); wait(0.5); ok(on(X + 16, Y, Z - 4) === 0, 'locked by the side repeater: stays off with power at its back');
brk(X + 16, Y, Z - 2); settle(); wait(0.5); ok(on(X + 16, Y, Z - 4) === 1, 'unlocked: on');
useAt(X, Y, Z - 4); settle(); wait(0.5);

// 7 comparators: compare / subtract, chests (on clear ground at CX)
const CX = X - 20;
placeAs(CX, Y, Z - 8, 'spark_block'); placeAs(CX + 1, Y, Z - 8, 'comparator', 3, 90); placeAs(CX + 2, Y, Z - 8, 'spark_dust'); settle(); wait(0.15);
ok(lvl(CX + 2, Y, Z - 8) === 15, 'comparator from a spark block: 15 out');
for (let a = 9; a <= 21; a++) placeAs(CX + 1, Y, Z - a, 'spark_dust');
const sideLv = () => lvl(CX + 1, Y, Z - 9);
placeAs(CX + 1, Y, Z - 22, 'spark_block'); settle(); wait(0.15);
ok(sideLv() === 3 && lvl(CX + 2, Y, Z - 8) === 15, 'side lower than the back: compare gives the back (side ' + sideLv() + ')');
useAt(CX + 1, Y, Z - 8); settle(); wait(0.15);
ok(lvl(CX + 2, Y, Z - 8) === 12, 'subtract: 15 - 3 = ' + lvl(CX + 2, Y, Z - 8));
useAt(CX + 1, Y, Z - 8); brk(CX + 1, Y, Z - 22); settle(); wait(0.3);
placeAs(CX + 4, Y, Z - 8, 'chest'); placeAs(CX + 5, Y, Z - 8, 'comparator', 3, 90); placeAs(CX + 6, Y, Z - 8, 'spark_dust'); settle(); wait(0.15);
ok(lvl(CX + 6, Y, Z - 8) === 0, 'an empty chest: 0');
call(() => { fn.chestFind(CX + 4, Y, Z - 8); const c = s.peek('cFound'); const CHI = s.peek('CHI'), CHN = s.peek('CHN'); for (let k = 1; k <= 14; k++) { CHI[(c - 1) * 27 + k] = ID('cobblestone'); CHN[(c - 1) * 27 + k] = 64; } });
placeAs(CX + 5, Y + 1, Z - 8, 'stone'); brk(CX + 5, Y + 1, Z - 8); settle(); wait(0.15);
ok(lvl(CX + 6, Y, Z - 8) === 8, 'a chest half full: 8 (' + lvl(CX + 6, Y, Z - 8) + ')');

// 8 pistons: face the player, push, pull, the limit, what stops them
placeAs(X, Y, Z - 12, 'piston', 3, 0);
ok(BFAC[B(X, Y, Z - 12)] === 4, 'a piston put looking +z faces -z (to the player): ' + BFAC[B(X, Y, Z - 12)]);
put(X, Y, Z - 13, 'oak_planks'); placeAs(X + 1, Y, Z - 12, 'lever'); useAt(X + 1, Y, Z - 12); settle(); wait(0.1);
ok(K(B(X, Y, Z - 14)) === 'oak_planks' && BRS[B(X, Y, Z - 13)] === 12 && on(X, Y, Z - 12) === 1, 'pushed: planks one on, the arm out');
useAt(X + 1, Y, Z - 12); settle(); wait(0.1);
ok(B(X, Y, Z - 13) === 0 && K(B(X, Y, Z - 14)) === 'oak_planks' && on(X, Y, Z - 12) === 0, 'back: the arm gone, the planks stay');
placeAs(X + 4, Y, Z - 12, 'sticky_piston', 3, 0); put(X + 4, Y, Z - 13, 'oak_planks'); placeAs(X + 5, Y, Z - 12, 'lever'); useAt(X + 5, Y, Z - 12); settle(); wait(0.1);
useAt(X + 5, Y, Z - 12); settle(); wait(0.1);
ok(K(B(X + 4, Y, Z - 13)) === 'oak_planks' && B(X + 4, Y, Z - 14) === 0, 'a sticky piston pulls the planks back');
placeAs(X + 8, Y, Z - 12, 'piston', 3, 0); put(X + 8, Y, Z - 13, 'obsidian'); placeAs(X + 9, Y, Z - 12, 'lever'); useAt(X + 9, Y, Z - 12); settle(); wait(0.1);
ok(on(X + 8, Y, Z - 12) === 0 && K(B(X + 8, Y, Z - 13)) === 'obsidian', 'obsidian stops it');
cmd(`/fill ${X + 12} ${Y} ${Z - 24} ${X + 12} ${Y} ${Z - 13} oak_planks`);
placeAs(X + 12, Y, Z - 12, 'piston', 3, 0); placeAs(X + 13, Y, Z - 12, 'lever'); useAt(X + 13, Y, Z - 12); settle(); wait(0.1);
ok(on(X + 12, Y, Z - 12) === 1, '12 blocks: pushed');
useAt(X + 13, Y, Z - 12); settle(); wait(0.1);
put(X + 12, Y, Z - 13, 'oak_planks'); put(X + 12, Y, Z - 25, 'stone'); useAt(X + 13, Y, Z - 12); settle(); wait(0.1);
ok(on(X + 12, Y, Z - 12) === 0, '13 blocks: not pushed');
placeAs(X + 16, Y, Z - 12, 'piston', 3, 0); placeAs(X + 16, Y, Z - 13, 'spark_dust'); placeAs(X + 17, Y, Z - 12, 'lever'); useAt(X + 17, Y, Z - 12); settle(); wait(0.1);
ok(BRS[B(X + 16, Y, Z - 13)] === 12, 'wire in front is broken by the arm');
placeAs(X + 20, Y + 1, Z - 12, 'piston', 3, 0, -60); put(X + 20, Y + 2, Z - 12, 'oak_planks'); placeAs(X + 21, Y + 1, Z - 12, 'stone'); brk(X + 21, Y + 1, Z - 12);
ok(BFAC[B(X + 20, Y + 1, Z - 12)] === 3, 'looking down: the piston faces up');
placeAs(X + 20, Y, Z - 11, 'spark_block'); brk(X + 20, Y, Z - 11); placeAs(X + 21, Y + 1, Z - 12, 'spark_block'); settle(); wait(0.1);
ok(K(B(X + 20, Y + 3, Z - 12)) === 'oak_planks', 'up: the planks pushed up');
brk(X + 20, Y + 2, Z - 12); settle(); wait(0.1); ok(B(X + 20, Y + 1, Z - 12) === 0, 'the arm broken: the piston breaks too');
brk(X + 21, Y + 1, Z - 12); settle(); wait(0.1);
// the player stands where the planks go
placeAs(X + 4, Y, Z + 18, 'piston', 3, 0); put(X + 4, Y, Z + 17, 'oak_planks'); placeAs(X + 5, Y, Z + 18, 'lever');
s.poke('flying', 0); s.poke('px', X + 4.5); s.poke('py', Y); s.poke('pz', Z + 16.5); s.poke('pvy', 0);
useAt(X + 5, Y, Z + 18); settle(); wait(0.1);
ok(s.peek('pz') < Z + 16, 'the player pushed along (pz ' + s.peek('pz').toFixed(2) + ')');
s.poke('flying', 1); s.poke('px', X + 0.5); s.poke('py', Y + 12); s.poke('pz', Z - 22);

// 9 observers: a block put before it gives a pulse
placeAs(X, Y, Z + 20, 'observer', 3, 180);
ok(BFAC[B(X, Y, Z + 20)] === 5, 'an observer put looking -z faces +z (to the player): ' + BFAC[B(X, Y, Z + 20)]);
placeAs(X, Y, Z + 19, 'spark_dust'); settle(); wait(0.5);
let seen = 0;
placeAs(X, Y, Z + 21, 'stone');
for (let i = 0; i < 30; i++) { F(1); if (lvl(X, Y, Z + 19) > 0) seen = 1; }
ok(seen === 1 && lvl(X, Y, Z + 19) === 0, 'a block before it: a short pulse out of its back');

// 10 doors, a dispenser, TNT
put(X - 6, Y, Z, 'iron_door'); put(X - 6, Y + 1, Z, 'iron_door[half=upper]'); placeAs(X - 5, Y, Z, 'lever');
const d0 = B(X - 6, Y, Z); useAt(X - 5, Y, Z); settle(); ok(B(X - 6, Y, Z) !== d0, 'lever -> iron door opens');
useAt(X - 5, Y, Z); settle(); ok(B(X - 6, Y, Z) === d0, 'lever off -> it shuts');
placeAs(X - 10, Y, Z, 'dispenser', 3, 270);
ok(BFAC[B(X - 10, Y, Z)] === 1, 'a dispenser put looking -x faces +x: ' + BFAC[B(X - 10, Y, Z)]);
call(() => { fn.chestFind(X - 10, Y, Z); const c = s.peek('cFound'); s.peek('CHI')[(c - 1) * 27 + 1] = ID('diamond'); s.peek('CHN')[(c - 1) * 27 + 1] = 2; });
placeAs(X - 10, Y, Z + 1, 'lever', 5); useAt(X - 10, Y, Z + 1); settle();
call(() => { fn.chestFind(X - 10, Y, Z); }); ok(s.peek('CHN')[(s.peek('cFound') - 1) * 27 + 1] === 1, 'the dispenser gave one diamond out');
placeAs(X - 14, Y, Z, 'tnt'); placeAs(X - 15, Y, Z, 'lever'); useAt(X - 15, Y, Z); F(200); ok(B(X - 14, Y, Z) === 0, 'lever -> TNT went off');

// 11 commands
put(X - 4, Y, Z - 20, 'repeater[facing=east,delay=3]'); ok(BFAC[B(X - 4, Y, Z - 20)] === 1 && BAUX[B(X - 4, Y, Z - 20)] === 3, '/setblock repeater[facing=east,delay=3]');
put(X - 6, Y, Z - 20, 'sticky_piston[facing=down]'); ok(BFAC[B(X - 6, Y, Z - 20)] === 2, '/setblock sticky_piston[facing=down]');
put(X - 8, Y, Z - 20, 'lever[face=wall,facing=north]'); ok(BATT[B(X - 8, Y, Z - 20)] === 5 || B(X - 8, Y, Z - 20) === 0, '/setblock lever[face=wall,facing=north] hangs on +z');
put(X - 10, Y, Z - 20, 'spark_lamp'); put(X - 9, Y, Z - 20, 'lever[powered=true]'); settle(); ok(lit(X - 10, Y, Z - 20), '/setblock lever[powered=true] -> lamp on');
// the hand-opened door does not shut when a dead wire is put by it
put(X - 2, Y, Z - 16, 'oak_door'); put(X - 2, Y + 1, Z - 16, 'oak_door[half=upper]'); useAt(X - 2, Y, Z - 16); const dh = B(X - 2, Y, Z - 16);
placeAs(X - 1, Y, Z - 16, 'spark_dust'); settle(); F(10); ok(B(X - 2, Y, Z - 16) === dh, 'a door opened by hand stays open');
// a button: on for a second (stone), then off; on a wall
put(X - 14, Y, Z - 16, 'stone'); placeAs(X - 14, Y, Z - 15, 'stone_button', 5); placeAs(X - 14, Y, Z - 17, 'spark_lamp');
useAt(X - 14, Y, Z - 15); settle(); ok(lit(X - 14, Y, Z - 17), 'a button on a block: the lamp past it on');
wait(1.3); ok(!lit(X - 14, Y, Z - 17), 'a second later off');
console.log(fails ? `${fails} FAILED` : 'all ok');
