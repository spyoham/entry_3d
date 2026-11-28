// (v3.5, 11-28) What the spark engine has yet to do when a world is left (power.js rsWorldNew, rsOwn): a kept world
// left by "save and leave" and opened again goes on with it - a signal on its way through ten slow repeaters
// arrives; another world entered instead has none of it.   node test/rsworld35.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, AUTOSEED: 1234, AUTOMODE: 1 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(); n++; }
F(20);
const call = (f) => s.as('pen', f), cmd = (t) => call(() => s.fn.runCommand(t));
const KEY = s.peek('ITKEY'), ID = (k) => KEY.indexOf(k);
const B = (x, y, z) => call(() => s.fn.blockAt(x, y, z)), K = (x, y, z) => KEY[B(x, y, z)];
const X = Math.floor(s.peek('px')) + 3, Y = 100, Z = Math.floor(s.peek('pz')) + 14;
cmd(`/fill ${X - 3} ${Y - 1} ${Z - 16} ${X + 3} ${Y + 3} ${Z + 3} air`);
cmd(`/fill ${X - 3} ${Y - 1} ${Z - 16} ${X + 3} ${Y - 1} ${Z + 3} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 6); s.poke('pz', Z - 6); s.poke('flying', 1);
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', pitch);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', s.fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0);
  s.poke('netUserAct', 1); s.poke('logOn', 1);
  const it = ID(key); s.fn.placeBlock(s.peek('ITPLB')[it], it);
});
const useAt = (x, y, z) => call(() => { const b = s.fn.blockAt(x, y, z); s.fn.useBlock(x, y, z, b, 0); });
const settle = () => { call(() => s.fn.worldFlush()); F(3); };
const lit = () => K(X, Y, Z - 12) === 'spark_lamp_on';
const busy = () => s.peek('scN') + s.peek('BEX').length + s.peek('MVX').length;
// a lever, a wire, ten repeaters of four ticks each, a lamp: two seconds from the lever to the lamp
placeAs(X, Y, Z, 'lever'); placeAs(X, Y, Z - 1, 'spark_dust');
for (let i = 2; i <= 11; i++) { placeAs(X, Y, Z - i, 'repeater', 3, 180); for (let q = 0; q < 3; q++) useAt(X, Y, Z - i); }
placeAs(X, Y, Z - 12, 'spark_lamp');
settle(); F(60);
ok(K(X, Y, Z - 5).startsWith('repeater') && !lit() && busy() === 0, `built: ${K(X, Y, Z)}, ${K(X, Y, Z - 1)}, ${K(X, Y, Z - 2)} ... ${K(X, Y, Z - 12)}, at rest`);
useAt(X, Y, Z); settle();
{ let k = 0; while (!lit() && k < 600) { F(); k++; } ok(lit() && k > 60, `the lever on: the lamp lights ${(k / 60).toFixed(1)} s later`); }
useAt(X, Y, Z); settle();
{ let k = 0; while ((lit() || busy() > 0) && k < 900) { F(); k++; } ok(!lit(), 'the lever off: the lamp is out'); }
// kept in the middle of the signal's way, as the game menu's "save and leave" does (main.js menuSel 6)
s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '도는 중');
const leave = () => { call(() => { s.fn.saveGame(1); if (s.peek('dead') === 0) s.poke('rsOwn', s.peek('worldCur')); s.poke('uiMode', 0); s.poke('gState', 0); s.fn.txClear(); }); };
useAt(X, Y, Z); settle(); F(40);
const due0 = busy();
ok(!lit() && due0 > 0, `the lever on again, the signal on its way (${due0} due): saved and left`);
leave();
F(180);
ok(s.peek('gState') === 0 && busy() === due0, `three seconds at the title, its land made behind it: what was due waits (${busy()})`);
call(() => s.fn.loadGame(1));
ok(busy() === due0 && s.peek('rsOwn') === 0, `the same world opened again: what was due is still due (${busy()})`);
n = 0; while (s.peek('gState') !== 2 && n < 6000) { F(); n++; }
{ let k = 0; while (!lit() && k < 900) { F(); k++; } ok(lit(), `and the signal arrives: the lamp lights (${(k / 60).toFixed(1)} s in)`); }
// the same, and another world entered instead: nothing of it is due there
useAt(X, Y, Z); settle();
{ let k = 0; while ((lit() || busy() > 0) && k < 900) { F(); k++; } }
useAt(X, Y, Z); settle(); F(40);
ok(!lit() && busy() > 0, `on its way once more (${busy()} due): saved and left`);
leave();
F(30);
call(() => { s.fn.menuGo(2); });
F(3);
s.poke('cwMode', 1); s.poke('cwName', '다른 세계');
call(() => s.fn.worldNew(2));
ok(busy() === 0 && s.peek('rsOwn') === 0, `a new world made instead: nothing is due in it (${busy()})`);
n = 0; while (s.peek('gState') !== 2 && n < 6000) { F(); n++; }
F(120);
ok(busy() === 0, 'nor two seconds into it');
// and the first world opened after that one: its signal is gone with what was due (as after the page is loaded anew),
// the parts are asked again and the lamp lights all the same
leave();
F(30);
call(() => s.fn.loadGame(1));
n = 0; while (s.peek('gState') !== 2 && n < 6000) { F(); n++; }
{ let k = 0; while (!lit() && k < 900) { F(); k++; } ok(lit(), `the first world after another: its parts asked again, the lamp lights (${(k / 60).toFixed(1)} s in)`); }
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);
