// water and lava that flow as in the genre: node test/fluid.mjs
import { createSim } from '../sim.mjs';
const mk = (c) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0, ...c } });
const s = mk({ AUTOSEED: 1234, AUTOMODE: 1 });
const F = (sim, k = 1) => { for (let i = 0; i < k; i++) { try { sim.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(s); n++; }
F(s, 20);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (sim, f) => sim.as('pen', f), cmd = (sim, t) => call(sim, () => sim.fn.runCommand(t));
const KEY = s.peek('ITKEY'), ID = (k) => KEY.indexOf(k), BLQ = s.peek('BLQ'), BLV = s.peek('BLV');
const B = (sim, x, y, z) => call(sim, () => sim.fn.blockAt(x, y, z));
const q = (sim, x, y, z) => BLQ[B(sim, x, y, z)], lv = (sim, x, y, z) => (BLQ[B(sim, x, y, z)] ? BLV[B(sim, x, y, z)] : -1);
const sec = (sim, t) => F(sim, Math.ceil(t * 60));
const X0 = Math.floor(s.peek('px')) + 40, Y = 100, Z0 = Math.floor(s.peek('pz'));
s.poke('px', X0 + 0.5); s.poke('pz', Z0 - 30); s.poke('py', Y + 20); s.poke('flying', 1);
const goto = (x0, z0) => { s.poke('px', x0 + 0.5); s.poke('pz', z0 - 16); s.poke('py', Y + 12); s.poke('flying', 1); let k = 0; while (k < 3000 && !(call(s, () => s.fn.cOK(x0 - 12, z0 - 12)) === 1 && call(s, () => s.fn.cOK(x0 + 12, z0 + 12)) === 1)) { F(s); k++; } F(s, 30); };
const pad = (x0, z0, r) => { goto(x0, z0); cmd(s, `/fill ${x0 - r} ${Y} ${z0 - r} ${x0 + r} ${Y + 6} ${z0 + r} air`); cmd(s, `/fill ${x0 - r} ${Y - 1} ${z0 - r} ${x0 + r} ${Y - 1} ${z0 + r} stone`); };
const set = (x, y, z, k) => call(s, () => s.fn.setBlock(x, y, z, k === 'air' ? 0 : ID(k)));
// 1 a source on a floor: levels 1..7 out to 7 blocks, nothing at 8
let X = X0, Z = Z0;
pad(X, Z, 10);
set(X, Y, Z, 'water'); sec(s, 6);
const row = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(d => lv(s, X + d, Y, Z));
ok(JSON.stringify(row) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, -1]), 'a source spreads: levels ' + row.join(' '));
ok(lv(s, X + 3, Y, Z + 3) === 6 && lv(s, X + 4, Y, Z + 4) === -1, 'and round (by steps): ' + lv(s, X + 3, Y, Z + 3) + ' ' + lv(s, X + 4, Y, Z + 4));
ok(lv(s, X, Y + 1, Z) === -1 && lv(s, X + 1, Y - 1, Z) === -1, 'not up, not into the floor');
// (a source put by a command flows too)
cmd(s, `/setblock ${X} ${Y} ${Z + 6} water`); sec(s, 2);
ok(lv(s, X + 1, Y, Z + 6) >= 1, '/setblock water flows: ' + lv(s, X + 1, Y, Z + 6));
cmd(s, `/setblock ${X} ${Y} ${Z + 6} air`); sec(s, 3);
// 2 the source taken: it all goes back
set(X, Y, Z, 'air'); sec(s, 5);
let left = 0; for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) if (q(s, X + dx, Y, Z + dz)) left++;
ok(left === 0, 'source taken away: all the flowing water gone (' + left + ' left)');
// 3 over an edge: it falls, and spreads at the bottom
X = X0 + 30; pad(X, Z, 10);
cmd(s, `/fill ${X - 10} ${Y + 3} ${Z - 2} ${X - 2} ${Y + 3} ${Z + 2} stone`);
set(X - 4, Y + 4, Z, 'water'); sec(s, 6);
ok(q(s, X - 1, Y + 4, Z) === 7 && lv(s, X - 1, Y + 3, Z) === 8 && lv(s, X - 1, Y + 1, Z) === 8, `off the edge it falls: ${lv(s, X - 1, Y + 4, Z)} / ${lv(s, X - 1, Y + 3, Z)} ${lv(s, X - 1, Y + 2, Z)} ${lv(s, X - 1, Y + 1, Z)}`);
ok(lv(s, X - 1, Y, Z) === 8 && lv(s, X, Y, Z) === 1 && lv(s, X + 6, Y, Z) === 7, `at the bottom it spreads from the fall: ${[0, 1, 2, 6, 7].map(d => lv(s, X - 1 + d, Y, Z)).join(' ')}`);
// 4 toward the nearest hole: a hole 3 to +x, the other ways stay dry
X = X0 + 60; pad(X, Z, 10);
cmd(s, `/fill ${X + 3} ${Y - 1} ${Z} ${X + 3} ${Y - 4} ${Z} air`);
cmd(s, `/fill ${X + 3} ${Y - 5} ${Z} ${X + 3} ${Y - 5} ${Z} stone`);
set(X, Y, Z, 'water'); sec(s, 4);
ok(q(s, X + 2, Y, Z) === 7 && q(s, X + 3, Y - 2, Z) === 7, 'it runs to the hole and down it');
ok(q(s, X - 1, Y, Z) === 0 && q(s, X, Y, Z + 1) === 0, `the other ways stay dry: -x ${lv(s, X - 1, Y, Z)} +z ${lv(s, X, Y, Z + 1)}`);
// 5 two sources with a gap: a third
X = X0 + 90; pad(X, Z, 6);
cmd(s, `/fill ${X - 1} ${Y} ${Z - 1} ${X + 1} ${Y} ${Z - 1} stone`); cmd(s, `/fill ${X - 1} ${Y} ${Z + 1} ${X + 1} ${Y} ${Z + 1} stone`);
cmd(s, `/fill ${X - 2} ${Y} ${Z} ${X - 2} ${Y} ${Z} stone`); cmd(s, `/fill ${X + 2} ${Y} ${Z} ${X + 2} ${Y} ${Z} stone`);
set(X - 1, Y, Z, 'water'); set(X + 1, Y, Z, 'water'); sec(s, 3);
ok(lv(s, X, Y, Z) === 0, 'two sources make a third between them: ' + lv(s, X, Y, Z));
// 6 lava: slow and short (3 blocks on the surface world)
X = X0 + 120; pad(X, Z, 8);
set(X, Y, Z, 'lava'); sec(s, 3);
const r1 = [1, 2].map(d => lv(s, X + d, Y, Z)).join(' ');
sec(s, 12);
const rl = [0, 1, 2, 3, 4].map(d => lv(s, X + d, Y, Z));
ok(JSON.stringify(rl) === JSON.stringify([0, 2, 4, 6, -1]), `lava spreads 3 blocks, levels 2 4 6: ${rl.join(' ')} (after 3 s: ${r1})`);
ok(s.peek('BLIT')[B(s, X + 2, Y, Z)] === 15, 'flowing lava gives light');
// 7 lava meets water: the source turns to obsidian, flowing lava to cobblestone
set(X - 3, Y, Z, 'water'); sec(s, 6);
const kinds = [0, 1, 2, 3].map(d => KEY[B(s, X - d, Y, Z)]);
ok(kinds.includes('obsidian') || kinds.includes('cobblestone'), 'lava and water: ' + kinds.join(' '));
// 8 a torch in the way is washed out (and drops)
X = X0 + 150; pad(X, Z, 6);
set(X + 2, Y, Z, 'torch'); set(X, Y, Z, 'water'); sec(s, 3);
ok(q(s, X + 2, Y, Z) === 7, 'a torch washed out: ' + KEY[B(s, X + 2, Y, Z)]);
// 9 buckets: a source fills it, flowing water does not
s.poke('gameMode', 0);
cmd(s, '/clear'); cmd(s, '/give @s bucket 1');
s.poke('hotSel', s.peek('INVI').indexOf(ID('bucket')) + 1);
const look = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y + 1.5); s.poke('pz', z - 2.5); s.poke('yaw', 0); s.poke('pitch', -38); F(s, 3); };
look(X + 3, Y, Z);
call(s, () => s.fn.bucketUse(ID('bucket'))); F(s, 2);
ok(s.peek('INVI')[s.peek('hotSel') - 1] === ID('bucket'), 'a bucket on flowing water: still empty');
look(X, Y, Z);
call(s, () => s.fn.bucketUse(ID('bucket'))); F(s, 2);
ok(s.peek('INVI')[s.peek('hotSel') - 1] === ID('water_bucket') && q(s, X, Y, Z) !== 7 || lv(s, X, Y, Z) > 0, 'a bucket on the source: water bucket, the source gone: ' + KEY[s.peek('INVI')[s.peek('hotSel') - 1]]);
sec(s, 4);
ok(q(s, X + 2, Y, Z) === 0, 'its flowing water goes back');
s.poke('gameMode', 1);
// 10 the current carries the player
X = X0 + 180; pad(X, Z, 10);
cmd(s, `/fill ${X - 8} ${Y} ${Z - 1} ${X + 8} ${Y + 1} ${Z - 1} stone`); cmd(s, `/fill ${X - 8} ${Y} ${Z + 1} ${X + 8} ${Y + 1} ${Z + 1} stone`);
cmd(s, `/fill ${X - 9} ${Y} ${Z} ${X - 9} ${Y} ${Z} stone`);
set(X - 8, Y, Z, 'water'); sec(s, 4);
s.poke('flying', 0); s.poke('px', X - 4.5); s.poke('pz', Z + 0.5); s.poke('py', Y); s.poke('pvx', 0); s.poke('pvz', 0);
const x0 = s.peek('px'); F(s, 60);
ok(s.peek('px') - x0 > 0.8, `the current carries the player: ${(s.peek('px') - x0).toFixed(2)} blocks in 1 s`);
s.poke('flying', 1);
// 11 a hole dug by a lake: water runs in, not at once
X = X0 + 210; pad(X, Z, 6);
cmd(s, `/fill ${X - 3} ${Y} ${Z - 3} ${X - 1} ${Y} ${Z + 3} water`);
cmd(s, `/fill ${X} ${Y} ${Z - 3} ${X + 4} ${Y} ${Z + 3} stone`);
sec(s, 1);
set(X, Y, Z, 'air'); F(s, 2);
const at0 = q(s, X, Y, Z);
sec(s, 1);
ok(at0 === 0 && q(s, X, Y, Z) === 7, `a block mined by a lake: water runs in after a moment (${at0} -> ${lv(s, X, Y, Z)})`);
ok(s.peek('fqN') < 300, 'the queue is quiet after: ' + s.peek('fqN'));
// 12 kept and opened again: a source placed by the player flows again
X = X0 + 240; pad(X, Z, 8);
s.poke('netUserAct', 1); set(X, Y, Z, 'water'); s.poke('netUserAct', 0); sec(s, 5);
s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '물'); s.poke('px', X + 0.5); s.poke('pz', Z - 10); s.poke('py', Y + 10);
call(s, () => s.fn.saveGame(1));
const t = mk({});
F(t, 30);
t.poke('AT_세계1', s.peek('AT_세계1').slice()); t.poke('AT_확장프로그램', 1);
call(t, () => t.fn.loadGame(1));
n = 0; while (t.peek('gState') !== 2 && n < 6000) { F(t); n++; }
console.log('  after load: queue', t.peek('fqN'), 'source', lv(t, X, Y, Z), 'cOK', call(t, () => t.fn.cOK(X + 3, Z)), 'pos', t.peek('px').toFixed(1), t.peek('pz').toFixed(1));
F(t, 400);
console.log('  later: queue', t.peek('fqN'), 'fqTime', t.peek('fqTime').toFixed(1));
ok(q(t, X, Y, Z) === 7 && lv(t, X + 3, Y, Z) === 3, `after opening it again the source flows again: ${[0, 1, 2, 3].map(d => lv(t, X + d, Y, Z)).join(' ')}`);
const EDB = s.peek('EDB'), flowLogged = EDB.filter(b => BLQ[b] && BLV[b] > 0).length;
ok(flowLogged === 0, `flowing water is not written in the log of changes (${flowLogged} of ${EDB.length})`);
console.log(fails ? fails + ' FAILED' : 'all ok');
