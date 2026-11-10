// a world saved and opened again: the effects stay, redstone goes on working: node test/reload.mjs
import { createSim } from '../sim.mjs';
const mk = (c) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0, ...c } });
const F = (sim, k = 1) => { for (let i = 0; i < k; i++) { try { sim.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const s = mk({ AUTOSEED: 1234, AUTOMODE: 1 });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(s); n++; }
F(s, 20);
const call = (sim, f) => sim.as('pen', f), cmd = (sim, t) => call(sim, () => sim.fn.runCommand(t));
const KEY = s.peek('ITKEY'), ID = (k) => KEY.indexOf(k);
const B = (sim, x, y, z) => call(sim, () => sim.fn.blockAt(x, y, z)), K = (sim, x, y, z) => KEY[B(sim, x, y, z)];
const BON = s.peek('BON');
const X = Math.floor(s.peek('px')) + 3, Y = 100, Z = Math.floor(s.peek('pz')) + 3;
cmd(s, `/fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 12} ${Y + 4} ${Z + 12} air`);
cmd(s, `/fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 12} ${Y - 1} ${Z + 12} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 6); s.poke('pz', Z - 3); s.poke('flying', 1);
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (sim, x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(sim, () => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  sim.poke('yaw', yaw); sim.poke('pitch', pitch);
  sim.poke('pickX', cx); sim.poke('pickY', cy); sim.poke('pickZ', cz); sim.poke('pickF', f); sim.poke('pickB', sim.fn.blockAt(cx, cy, cz)); sim.poke('pickHY', 0.9); sim.poke('placeCool', 0);
  sim.poke('netUserAct', 1); sim.poke('logOn', 1);
  const it = ID(key); sim.fn.placeBlock(sim.peek('ITPLB')[it], it);
});
const useAt = (sim, x, y, z) => call(sim, () => { const b = sim.fn.blockAt(x, y, z); sim.fn.useBlock(x, y, z, b, 0); });
const settle = (sim) => { call(sim, () => sim.fn.worldFlush()); F(sim, 3); };
const lit = (sim, x, y, z) => K(sim, x, y, z) === 'spark_lamp_on';
// a lever, a wire, a lamp
placeAs(s, X, Y, Z, 'lever'); placeAs(s, X + 1, Y, Z, 'spark_dust'); placeAs(s, X + 2, Y, Z, 'spark_lamp');
settle(s);
useAt(s, X, Y, Z); settle(s); F(s, 10);
ok(lit(s, X + 2, Y, Z), 'before: lever on, lamp on');
useAt(s, X, Y, Z); settle(s); F(s, 30);
ok(!lit(s, X + 2, Y, Z), 'before: lever off, lamp off');
// a slow clock: a torch on a block, wire round into a repeater (delay 4) back into the block
const CX = X + 6;
cmd(s, `/setblock ${CX} ${Y} ${Z} stone`); placeAs(s, CX + 1, Y, Z, 'spark_torch', 1);
placeAs(s, CX + 1, Y, Z + 1, 'spark_dust'); placeAs(s, CX + 1, Y, Z + 2, 'spark_dust'); placeAs(s, CX, Y, Z + 2, 'spark_dust');
placeAs(s, CX, Y, Z + 1, 'repeater', 3, 180); settle(s);
// (the repeater's delay to 4: F three times)
for (let i = 0; i < 3; i++) useAt(s, CX, Y, Z + 1);
settle(s);
const flipsOf = (sim, frames) => { let f = 0, last = BON[B(sim, CX + 1, Y, Z)]; for (let i = 0; i < frames; i++) { F(sim, 1); const t = BON[B(sim, CX + 1, Y, Z)]; if (t !== last) { f++; last = t; } } return f; };
const f0 = flipsOf(s, 360);
ok(f0 >= 4, `before: the clock runs (${f0} switches in 6 s)`);
// a command block on a lever left on (it gave a diamond once), a lamp lit by a torch
const QX = X + 2, QZ = Z + 6;
placeAs(s, QX, Y, QZ, 'command_block');
call(s, () => { s.peek('CBX').push(QX); s.peek('CBY').push(Y); s.peek('CBZ').push(QZ); s.peek('CBT').push('/give @s diamond 1'); s.peek('CBD').push(0); });
placeAs(s, QX - 1, Y, QZ, 'lever'); settle(s);
useAt(s, QX - 1, Y, QZ); settle(s); F(s, 10);
const dia = (sim) => sim.peek('INVI').reduce((t, x, i) => t + (x === ID('diamond') ? sim.peek('INVN')[i] : 0), 0);
const d0 = dia(s);
ok(d0 >= 1, `before: the command block ran once (${d0} diamond)`);
// effects
cmd(s, '/effect give @s night_vision 600 0'); cmd(s, '/effect give @s speed 600 1');
const eft = s.peek('EFT').slice(), efl = s.peek('EFL').slice();
ok(eft[7] > 500 && eft[0] > 500, `effects on: night vision ${eft[7].toFixed(0)} s, speed ${eft[0].toFixed(0)} s`);
// (v2.4.3) an observer clock (two face to face), and a sticky piston held out across a chunk's edge
const OX = X + 2, OZ = Z - 4;
placeAs(s, OX, Y, OZ, 'observer', 3, 90); placeAs(s, OX + 1, Y, OZ, 'observer', 3, 270);
call(s, () => s.fn.rsSchedule(OX + 1, Y, OZ, 0.05, 1));
const obsFlips = (sim, frames) => { let f = 0, last = BON[B(sim, OX, Y, OZ)]; for (let i = 0; i < frames; i++) { F(sim, 1); const q = BON[B(sim, OX, Y, OZ)]; if (q !== last) { f++; last = q; } } return f; };
ok(obsFlips(s, 120) >= 8, 'before: the observer clock runs');
const EX = Math.ceil((X + 12) / 16) * 16 - 1, EZ = Z - 8;
cmd(s, `/setblock ${EX - 1} ${Y} ${EZ} spark_block`); cmd(s, `/setblock ${EX} ${Y} ${EZ} sticky_piston[facing=east]`); settle(s); F(s, 20);
const BRS = s.peek('BRS');
const held = (sim) => BRS[B(sim, EX, Y, EZ)] === 11 && BON[B(sim, EX, Y, EZ)] === 1 && BRS[B(sim, EX + 1, Y, EZ)] === 12;
ok(held(s), `before: the piston at x ${EX} is out, its arm at x ${EX + 1} in the next chunk`);
// keep it, and open it again in a new run
s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '다시 열기');
call(s, () => s.fn.saveGame(1));
const save = s.peek('AT_세계1').slice();
const t = mk({});
F(t, 30);
t.poke('AT_세계1', save); t.poke('AT_확장프로그램', 1);
call(t, () => t.fn.loadGame(1));
n = 0; while (t.peek('gState') !== 2 && n < 6000) { F(t); n++; }
F(t, 30);
const eft2 = t.peek('EFT'), efl2 = t.peek('EFL');
ok(eft2[7] > 400 && eft2[0] > 400 && efl2[0] === efl[0], `after: night vision ${(+eft2[7]).toFixed(0)} s, speed ${(+eft2[0]).toFixed(0)} s level ${efl2[0]}`);
const f1 = flipsOf(t, 360);
ok(obsFlips(t, 120) >= 8, 'after: the observer clock runs again');
ok(held(t), 'after: the piston on the edge of a chunk is still out (it did not break)');
ok(f1 >= 4, `after: the clock still runs (${f1} switches in 6 s)`);
useAt(t, X, Y, Z); settle(t); F(t, 10);
ok(lit(t, X + 2, Y, Z), 'after: lever on, lamp on');
useAt(t, X, Y, Z); settle(t); F(t, 30);
ok(!lit(t, X + 2, Y, Z), 'after: lever off, lamp off');
ok(dia(t) === d0, `after: the powered command block did not run again (${dia(t)} diamonds)`);
// walking far away and back (the chunks dropped and made again): the clock goes on
t.poke('px', X + 400); t.poke('pz', Z + 400); F(t, 400);
t.poke('px', X + 0.5); t.poke('pz', Z - 3); t.poke('py', Y + 6); F(t, 400);
const f2 = flipsOf(t, 360);
ok(obsFlips(t, 120) >= 8, 'after going far and back: the observer clock runs');
ok(held(t), 'after going far and back: the piston is still out');
ok(f2 >= 4, `after going far and coming back: the clock runs (${f2} switches in 6 s)`);
console.log(fails ? fails + ' FAILED' : 'all ok');
