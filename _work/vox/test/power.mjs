// spark power (the redstone of this world) in the sim: node test/power.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => KEY.indexOf(k), K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y + 6} ${Z + 12} air`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 8); s.poke('pz', Z - 10); s.poke('flying', 1);
F(5);
// the player's own way of putting things down and using them
const put = (x, y, z, key) => { cmd(`/setblock ${x} ${y} ${z} ${key}`); };
const useAt = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.useBlock(x, y, z, b, 0); });
const placeAs = (x, y, z, key) => call(() => { s.poke('pickX', x); s.poke('pickY', y - 1); s.poke('pickZ', z); s.poke('pickF', 3); s.poke('pickB', fn.blockAt(x, y - 1, z)); s.poke('pickHY', 0.9); const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it); });
const brk = (x, y, z) => call(() => fn.breakBlock(x, y, z, 1));
const flush = () => { call(() => fn.worldFlush()); F(1); };
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';
// 1 a lever by a lamp
placeAs(X, Y, Z, 'spark_lamp'); placeAs(X + 1, Y, Z, 'lever');
useAt(X + 1, Y, Z); flush(); ok(lit(X, Y, Z), 'lever on -> lamp on');
useAt(X + 1, Y, Z); flush(); ok(!lit(X, Y, Z), 'lever off -> lamp off');
// 2 a line of wire
placeAs(X, Y, Z + 4, 'spark_lamp'); placeAs(X + 6, Y, Z + 4, 'lever');
for (let a = 1; a <= 5; a++) placeAs(X + a, Y, Z + 4, 'spark_dust');
ok(K(B(X + 3, Y, Z + 4)) === 'spark_wire', 'dust placed as wire: ' + K(B(X + 3, Y, Z + 4)));
useAt(X + 6, Y, Z + 4); flush(); ok(lit(X, Y, Z + 4), 'lever -> 5 wires -> lamp on');
brk(X + 3, Y, Z + 4); flush(); ok(!lit(X, Y, Z + 4), 'a wire broken -> lamp off');
placeAs(X + 3, Y, Z + 4, 'spark_dust'); flush(); ok(lit(X, Y, Z + 4), 'the wire put back -> lamp on');
useAt(X + 6, Y, Z + 4); flush(); ok(!lit(X, Y, Z + 4), 'lever off -> lamp off');
// 3 a button: on for a second
placeAs(X, Y, Z - 4, 'spark_lamp'); placeAs(X + 1, Y, Z - 4, 'stone_button');
useAt(X + 1, Y, Z - 4); flush(); ok(lit(X, Y, Z - 4), 'button -> lamp on');
F(90); ok(!lit(X, Y, Z - 4), 'a second and a half later -> lamp off');
// 4 a spark block and a spark torch
placeAs(X - 4, Y, Z, 'spark_lamp'); placeAs(X - 5, Y, Z, 'spark_block'); flush(); ok(lit(X - 4, Y, Z), 'spark block placed -> lamp on');
brk(X - 5, Y, Z); flush(); ok(!lit(X - 4, Y, Z), 'spark block broken -> lamp off');
placeAs(X - 5, Y, Z, 'spark_torch'); flush(); ok(lit(X - 4, Y, Z), 'spark torch placed -> lamp on');
brk(X - 5, Y, Z); flush(); ok(!lit(X - 4, Y, Z), 'spark torch broken -> lamp off');
// 5 the lamp put down next to a lever already on
placeAs(X - 8, Y, Z, 'lever'); useAt(X - 8, Y, Z); placeAs(X - 9, Y, Z, 'spark_lamp'); flush(); ok(lit(X - 9, Y, Z), 'lamp put by a lever already on -> on');
// 6 an iron door and a lever
put(X + 4, Y, Z - 8, 'iron_door'); put(X + 4, Y + 1, Z - 8, 'iron_door[half=upper]'); placeAs(X + 5, Y, Z - 8, 'lever');
const d0 = B(X + 4, Y, Z - 8);
useAt(X + 5, Y, Z - 8); flush(); const dOpen = B(X + 4, Y, Z - 8), uOpen = B(X + 4, Y + 1, Z - 8);
ok(dOpen !== d0, 'lever -> iron door opens: ' + K(d0) + ' -> ' + K(dOpen) + ' / upper ' + K(uOpen));
useAt(X + 5, Y, Z - 8); flush(); ok(B(X + 4, Y, Z - 8) === d0, 'lever off -> door shuts: ' + K(B(X + 4, Y, Z - 8)));
// 7 wire up a step
placeAs(X - 6, Y, Z + 8, 'spark_lamp'); placeAs(X - 4, Y, Z + 8, 'stone'); put(X - 3, Y, Z + 8, 'stone'); placeAs(X - 5, Y, Z + 8, 'spark_dust'); placeAs(X - 4, Y + 1, Z + 8, 'spark_dust'); placeAs(X - 3, Y + 1, Z + 8, 'lever');
useAt(X - 3, Y + 1, Z + 8); flush(); ok(lit(X - 6, Y, Z + 8), 'wire up a step -> lamp on');
// 8 TNT by a lever
placeAs(X + 9, Y, Z + 9, 'tnt'); placeAs(X + 10, Y, Z + 9, 'lever'); useAt(X + 10, Y, Z + 9); F(200); ok(B(X + 9, Y, Z + 9) === 0, 'lever -> TNT went off');
// 9 a piston pushes the block over it
placeAs(X + 8, Y, Z - 4, 'piston'); put(X + 8, Y + 1, Z - 4, 'oak_planks'); placeAs(X + 9, Y, Z - 4, 'lever'); useAt(X + 9, Y, Z - 4); flush();
ok(K(B(X + 8, Y + 2, Z - 4)) === 'oak_planks' && B(X + 8, Y + 1, Z - 4) === 0, 'piston pushed the planks up: ' + K(B(X + 8, Y + 1, Z - 4)) + ' / ' + K(B(X + 8, Y + 2, Z - 4)));
// 10 /setblock a lever turned on next to a lamp
put(X - 8, Y, Z - 8, 'spark_lamp'); put(X - 7, Y, Z - 8, 'lever[powered=true]'); flush(); ok(lit(X - 8, Y, Z - 8), '/setblock lever[powered=true] -> lamp on');
// 11 a repeater carries the line
placeAs(X, Y, Z + 11, 'spark_lamp'); placeAs(X + 1, Y, Z + 11, 'spark_dust'); placeAs(X + 2, Y, Z + 11, 'repeater'); placeAs(X + 3, Y, Z + 11, 'spark_dust'); placeAs(X + 4, Y, Z + 11, 'lever');
useAt(X + 4, Y, Z + 11); flush(); ok(lit(X, Y, Z + 11), 'lever -> wire -> repeater -> wire -> lamp on');
// 12 a pressure plate under the player
placeAs(X + 4, Y, Z + 2, 'spark_lamp'); placeAs(X + 5, Y, Z + 2, 'stone_pressure_plate');
s.poke('flying', 0); s.poke('px', X + 5.5); s.poke('py', Y); s.poke('pz', Z + 2.5); s.poke('pvy', 0); F(10); ok(lit(X + 4, Y, Z + 2), 'standing on the plate -> lamp on');
s.poke('px', X + 7.5); F(80); ok(!lit(X + 4, Y, Z + 2), 'off the plate -> lamp off');

// 13 the same button a second time
F(120); useAt(X + 1, Y, Z - 4); flush(); ok(lit(X, Y, Z - 4), 'the button pressed again -> lamp on'); F(90);
// 14 a step of wire put down last
placeAs(X + 10, Y, Z - 10, 'spark_lamp'); put(X + 8, Y, Z - 10, 'stone'); put(X + 7, Y, Z - 10, 'stone'); placeAs(X + 7, Y + 1, Z - 10, 'lever'); useAt(X + 7, Y + 1, Z - 10);
placeAs(X + 9, Y, Z - 10, 'spark_dust'); placeAs(X + 8, Y + 1, Z - 10, 'spark_dust'); flush(); ok(lit(X + 10, Y, Z - 10), 'the step wire put down last -> lamp on');
// 15 the stone under a lever that is on goes: the lever falls, the lamp goes out
brk(X + 7, Y, Z - 10); flush(); ok(!lit(X + 10, Y, Z - 10), 'lever fallen -> lamp off: ' + K(B(X + 7, Y + 1, Z - 10)));
// 16 a piston pushes once for each switching on (two ways in to it)
placeAs(X - 10, Y, Z - 4, 'piston'); put(X - 10, Y + 1, Z - 4, 'oak_planks'); placeAs(X - 9, Y, Z - 4, 'spark_dust'); placeAs(X - 9, Y, Z - 3, 'spark_dust'); placeAs(X - 10, Y, Z - 3, 'lever');
useAt(X - 10, Y, Z - 3); flush(); ok(K(B(X - 10, Y + 2, Z - 4)) === 'oak_planks' && B(X - 10, Y + 3, Z - 4) === 0, 'pushed once: ' + K(B(X - 10, Y + 2, Z - 4)) + ' / ' + K(B(X - 10, Y + 3, Z - 4)));
// 17 a trapdoor up top stays up top after power on and off
put(X - 10, Y + 2, Z + 4, 'oak_trapdoor[half=top]'); put(X - 10, Y + 2, Z + 5, 'stone'); placeAs(X - 10, Y, Z + 5, 'stone'); put(X - 10, Y + 3, Z + 5, 'lever');
useAt(X - 10, Y + 3, Z + 5); flush(); const tOpen = K(B(X - 10, Y + 2, Z + 4)); useAt(X - 10, Y + 3, Z + 5); flush();
ok(K(B(X - 10, Y + 2, Z + 4)) === 'oak_trapdoor_top', 'trapdoor top: ' + tOpen + ' -> ' + K(B(X - 10, Y + 2, Z + 4)));
// 18 a door opened by hand stays open when the power round it changes
put(X - 2, Y, Z - 10, 'oak_door'); put(X - 2, Y + 1, Z - 10, 'oak_door[half=upper]'); useAt(X - 2, Y, Z - 10); const dh = B(X - 2, Y, Z - 10);
placeAs(X - 1, Y, Z - 10, 'spark_dust'); flush(); F(10);
ok(B(X - 2, Y, Z - 10) === dh, 'the hand-opened door with an unpowered wire put by it stays open: ' + K(B(X - 2, Y, Z - 10)));
console.log(fails ? `${fails} FAILED` : 'all ok');
