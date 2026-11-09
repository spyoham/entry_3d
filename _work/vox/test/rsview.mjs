// pictures of the spark parts: node test/rsview.mjs  -> test/rs_*.png
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 6).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => { call(() => fn.runCommand(t)); const c = s.peek('CHT'); if (!/바꿨|채웠|놓았/.test(c[c.length - 1] || '')) console.log(t.padEnd(50), '->', c[c.length - 1]); };
const at = (x, y, z, yaw, pitch) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('yaw', yaw); s.poke('pitch', pitch); s.poke('flying', 1); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
s.poke('tday', 0.25); s.poke('showDbg', 0); s.poke('helpT', 0);
F(30);
const X = Math.floor(s.peek('px')), Y = 96, Z = Math.floor(s.peek('pz'));
const put = (x, y, z, b) => cmd(`/setblock ${X + x} ${Y + y} ${Z + z} ${b}`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z} ${X + 12} ${Y + 8} ${Z + 20} air`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z} ${X + 12} ${Y - 1} ${Z + 20} smooth_stone`);
// row 1 (z 4): pistons each way, in and out
const dirs = ['up', 'down', 'north', 'south', 'east', 'west'];
dirs.forEach((d, i) => put(-10 + i * 2, d === 'down' ? 1 : 0, 4, `piston[facing=${d}]`));
dirs.forEach((d, i) => put(2 + i * 2, d === 'down' ? 1 : 0, 4, `sticky_piston[facing=${d}]`));
// row 2 (z 8): observers and dispensers each way
dirs.forEach((d, i) => put(-10 + i * 2, 0, 8, `observer[facing=${d}]`));
dirs.forEach((d, i) => put(2 + i * 2, 0, 8, `dispenser[facing=${d}]`));
// row 3 (z 12): repeaters, comparators
['north', 'east', 'south', 'west'].forEach((d, i) => put(-10 + i * 2, 0, 12, `repeater[facing=${d},delay=${i + 1}]`));
['north', 'east', 'south', 'west'].forEach((d, i) => put(-2 + i * 2, 0, 12, `comparator[facing=${d}${i % 2 ? ',mode=subtract' : ''}]`));
// row 4 (z 16): a lever, wire running off it, wall levers / buttons / torches on a block
put(-10, 0, 16, 'lever'); for (let a = -9; a <= -2; a++) put(a, 0, 16, 'spark_wire');
put(-5, 0, 17, 'spark_wire'); put(-5, 0, 18, 'spark_wire'); put(-2, 0, 15, 'spark_lamp');
put(2, 0, 17, 'stone'); put(2, 1, 17, 'stone');
put(3, 0, 17, 'lever[face=wall,facing=east]'); put(1, 0, 17, 'stone_button[face=wall,facing=west]'); put(2, 0, 16, 'spark_torch[face=wall,facing=north]'); put(2, 2, 17, 'lever[face=floor]');
put(6, 0, 17, 'stone'); put(6, 1, 17, 'spark_wire'); put(7, 0, 17, 'spark_wire'); put(5, 0, 17, 'spark_wire');
F(10);
// power: the lever on, two pistons pushed out by spark blocks
call(() => { const b = fn.blockAt(X - 10, Y, Z + 16); fn.useBlock(X - 10, Y, Z + 16, b, 0); });
F(30);
at(X + 0.5, Y + 7, Z - 3, 0, -40); F(30); await s.png('test/rs_all.png');
at(X - 4.5, Y + 3.5, Z + 1, 0, -40); F(20); await s.png('test/rs_pistons.png');
at(X - 3.5, Y + 3, Z + 9.5, 0, -45); F(20); await s.png('test/rs_wire.png');
at(X + 2.5, Y + 2.5, Z + 13.5, 0, -35); F(20); await s.png('test/rs_wall.png');
// pistons pushed out: spark blocks on their sides
dirs.forEach((d, i) => { if (d === 'up') put(-10 + i * 2 + 1, 0, 4, 'spark_block'); else put(-10 + i * 2, d === 'down' ? 2 : 1, 4, 'spark_block'); });
F(30); at(X - 4.5, Y + 3.5, Z + 0, 0, -35); F(20); await s.png('test/rs_out.png');
console.log('done');
