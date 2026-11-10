// redstone, the second set (v2.4.3: timing kept fresh, plates for mobs and items, levels): node test/power2.mjs
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
const settle = () => { call(() => fn.worldFlush()); F(2); };
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';
const lvl = (x, y, z) => BRS[B(x, y, z)] === 1 ? BAUX[B(x, y, z)] : -1;
const watch = (n, f) => { const v = []; for (let k = 0; k < n; k++) { F(1); v.push(f()); } return v; };

// 1 a torch does not flicker for a pulse shorter than its delay
{
  const x0 = X - 20, z0 = Z - 20;
  put(x0, Y, z0, 'stone'); put(x0, Y + 1, z0, 'spark_torch'); settle(); wait(0.5);
  ok(on(x0, Y + 1, z0) === 1, 'a torch on stone is lit');
  put(x0 + 1, Y, z0, 'spark_block'); F(1); put(x0 + 1, Y, z0, 'air');
  const v = watch(30, () => on(x0, Y + 1, z0));
  ok(v.every((q) => q === 1), 'a one-frame pulse into its block: it stays lit (' + v.join('') + ')');
}
// 2 a repeater on whose input comes back before it went off stays on (no gap)
{
  const x0 = X - 14, z0 = Z - 20;
  put(x0, Y, z0, 'spark_block'); placeAs(x0 + 1, Y, z0, 'repeater', 3, 90); put(x0 + 2, Y, z0, 'spark_lamp');
  settle(); wait(0.5);
  ok(on(x0 + 1, Y, z0) === 1 && lit(x0 + 2, Y, z0), 'a spark block -> repeater -> lamp: on');
  useAt(x0 + 1, Y, z0); useAt(x0 + 1, Y, z0); useAt(x0 + 1, Y, z0); settle();
  put(x0, Y, z0, 'air'); F(2); put(x0, Y, z0, 'spark_block');
  const v = watch(40, () => on(x0 + 1, Y, z0));
  ok(v.every((q) => q === 1), 'its input off for 2 frames (shorter than its delay 4): its output stays on (' + v.join('') + ')');
}
// 3 plates: a mob on a stone plate, an item on a wooden one (not on a stone one), weights count
{
  const x0 = X - 6, z0 = Z - 20;
  put(x0, Y, z0, 'stone_pressure_plate'); put(x0 + 1, Y, z0, 'spark_lamp');
  put(x0, Y, z0 + 3, 'oak_pressure_plate'); put(x0 + 1, Y, z0 + 3, 'spark_lamp');
  put(x0, Y, z0 + 6, 'stone_pressure_plate'); put(x0 + 1, Y, z0 + 6, 'spark_lamp');
  put(x0, Y, z0 + 9, 'light_weighted_pressure_plate'); put(x0 + 1, Y - 1, z0 + 9, 'stone'); put(x0 + 1, Y, z0 + 9, 'spark_wire');
  put(x0, Y, z0 + 12, 'heavy_weighted_pressure_plate'); put(x0 + 1, Y - 1, z0 + 12, 'stone'); put(x0 + 1, Y, z0 + 12, 'spark_wire');
  settle(); wait(0.5);
  cmd(`/summon pig ${x0 + 0.5} ${Y} ${z0 + 0.5}`);
  const drop = (z, n) => call(() => { for (let i = 0; i < n; i++) fn.dropItem(ID('cobblestone'), 1, 0, x0 + 0.5, Y + 0.3, z + 0.5, 0); });
  drop(z0 + 3, 1); drop(z0 + 6, 1); drop(z0 + 9, 3); drop(z0 + 12, 3);
  wait(1);
  ok(lit(x0 + 1, Y, z0), 'a pig on a stone plate lights the lamp');
  ok(lit(x0 + 1, Y, z0 + 3), 'an item on a wooden plate lights the lamp');
  ok(!lit(x0 + 1, Y, z0 + 6), 'an item on a stone plate does not');
  ok(lvl(x0 + 1, Y, z0 + 9) === 3, 'three items on a light weighted plate: power 3 (' + lvl(x0 + 1, Y, z0 + 9) + ')');
  ok(lvl(x0 + 1, Y, z0 + 12) === 1, 'three items on a heavy weighted plate: power 1 (' + lvl(x0 + 1, Y, z0 + 12) + ')');
  cmd('/kill @e[type=pig]'); cmd('/kill @e[type=item]');
}
// 4 an observer pointing its back into a comparator's side is a side input
{
  const x0 = X + 2, z0 = Z - 20;
  put(x0 - 1, Y, z0, 'spark_block');
  placeAs(x0, Y, z0, 'comparator', 3, 90); put(x0 + 1, Y, z0, 'spark_lamp');
  settle(); wait(0.5);
  ok(lit(x0 + 1, Y, z0), 'a spark block behind a comparator: on');
  placeAs(x0, Y, z0 - 1, 'observer', 3, 180);
  ok(BFAC[B(x0, Y, z0 - 1)] === 4, 'an observer beside it with its back to it: ' + BFAC[B(x0, Y, z0 - 1)]);
  call(() => fn.useBlock(x0, Y, z0, B(x0, Y, z0), 0));
  placeAs(x0, Y, z0 - 2, 'stone');
  const v = watch(20, () => on(x0, Y, z0 - 1) ? call(() => fn.cmpOut(x0, Y, z0, fn.blockAt(x0, Y, z0))) : -1);
  ok(v.includes(0), 'while the observer\'s back is on, it is a side input: 15 - 15 = 0 (' + v.filter((q) => q >= 0).join(',') + ')');
}
// 5 two observers face to face make a clock
{
  const x0 = X + 8, z0 = Z - 20;
  placeAs(x0, Y, z0, 'observer', 3, 90); placeAs(x0 + 1, Y, z0, 'observer', 3, 270);
  ok(BFAC[B(x0, Y, z0)] === 1 && BFAC[B(x0 + 1, Y, z0)] === 0, 'face to face');
  call(() => fn.rsSchedule(x0 + 1, Y, z0, 0.05, 1));
  const v = watch(120, () => on(x0, Y, z0));
  let flips = 0; for (let k = 1; k < v.length; k++) if (v[k] !== v[k - 1]) flips++;
  ok(flips >= 8, 'they keep pulsing each other: ' + flips + ' changes in 2 s');
}
// 6 wire up and down a step, and cut by a block over the lower wire
{
  const x0 = X + 14, z0 = Z - 20;
  put(x0 - 1, Y, z0, 'spark_block'); put(x0, Y, z0, 'spark_wire'); put(x0 + 1, Y, z0, 'stone'); put(x0 + 1, Y + 1, z0, 'spark_wire'); put(x0 + 2, Y + 1, z0, 'stone'); put(x0 + 2, Y + 2, z0, 'spark_wire');
  settle(); wait(0.3);
  ok(lvl(x0, Y, z0) === 15 && lvl(x0 + 1, Y + 1, z0) === 14 && lvl(x0 + 2, Y + 2, z0) === 13, 'up two steps: 15 14 13 (' + [lvl(x0, Y, z0), lvl(x0 + 1, Y + 1, z0), lvl(x0 + 2, Y + 2, z0)].join(' ') + ')');
  put(x0 + 1, Y + 2, z0, 'stone'); settle(); wait(0.3);
  ok(lvl(x0 + 2, Y + 2, z0) === 0, 'a block over the middle wire cuts the step up: ' + lvl(x0 + 2, Y + 2, z0));
}
// 7 a comparator reading a chest sees items put in and taken out
{
  const x0 = X - 20, z0 = Z - 12;
  put(x0, Y, z0, 'chest'); placeAs(x0 + 1, Y, z0, 'comparator', 3, 90); put(x0 + 2, Y, z0, 'spark_wire');
  settle(); wait(0.5);
  ok(lvl(x0 + 2, Y, z0) === 0, 'an empty chest: 0');
  call(() => { fn.chestFind(x0, Y, z0); s.poke('curChest', s.peek('cFound')); fn.slotSet(61, ID('cobblestone'), 64, 0); fn.slotSet(62, ID('cobblestone'), 64, 0); });
  wait(0.5);
  const l1 = lvl(x0 + 2, Y, z0);
  ok(l1 > 0, 'two stacks put in by hand: the comparator gives ' + l1);
  call(() => { fn.slotSet(61, 0, 0, 0); fn.slotSet(62, 0, 0, 0); });
  wait(0.5);
  ok(lvl(x0 + 2, Y, z0) === 0, 'taken out again: 0 (' + lvl(x0 + 2, Y, z0) + ')');
}
// 8 a piston breaks a repeater before it (does not push it)
{
  const x0 = X - 14, z0 = Z - 12;
  placeAs(x0, Y, z0, 'piston', 3, 270); placeAs(x0 + 1, Y, z0, 'repeater', 3, 90);
  ok(BRS[B(x0 + 1, Y, z0)] === 2, 'a repeater before a piston');
  put(x0 - 1, Y, z0, 'spark_block'); settle(); wait(0.5);
  ok(BRS[B(x0 + 2, Y, z0)] !== 2 && BRS[B(x0 + 1, Y, z0)] === 12, 'the piston out: the repeater broke, not pushed (' + K(B(x0 + 1, Y, z0)) + ', ' + K(B(x0 + 2, Y, z0)) + ')');
}
// 9 a trapdoor opened by power opens the way it was put, wherever the player looks
{
  const x0 = X - 8, z0 = Z - 12;
  placeAs(x0, Y, z0, 'iron_trapdoor', 3, 0);
  const side = (q) => s.peek('BVAR')[q];
  placeAs(x0 + 1, Y, z0, 'lever'); settle();
  s.poke('yaw', 90); useAt(x0 + 1, Y, z0); settle(); wait(0.2);
  const v1 = side(B(x0, Y, z0));
  useAt(x0 + 1, Y, z0); settle(); wait(0.2);
  s.poke('yaw', 270); useAt(x0 + 1, Y, z0); settle(); wait(0.2);
  const v2 = side(B(x0, Y, z0));
  ok(v1 >= 2 && v1 === v2, `opened by a lever with the player looking two ways: the same side (${v1}, ${v2})`);
  useAt(x0 + 1, Y, z0); settle(); wait(0.2);
}
// 10 /setblock comparator[facing=west]: its input from the west, out to the east (as in the genre)
{
  const x0 = X - 2, z0 = Z - 12;
  put(x0 - 1, Y, z0, 'spark_block'); put(x0, Y, z0, 'comparator[facing=west]'); put(x0 + 1, Y, z0, 'spark_lamp'); settle(); wait(0.5);
  ok(BFAC[B(x0, Y, z0)] === 1 && lit(x0 + 1, Y, z0), 'comparator[facing=west] carries a spark block west of it to a lamp east of it');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
