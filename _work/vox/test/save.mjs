// keeping a world: node test/save.mjs
import { createSim } from '../sim.mjs';
const mk = (c) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0, ...c } });
const s = mk({ AUTOSEED: 4321, AUTOMODE: 0 });
const F = (sim, k = 1) => { for (let i = 0; i < k; i++) { try { sim.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(s); n++; }
F(s, 30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (sim, f) => sim.as('pen', f), cmd = (sim, t) => call(sim, () => sim.fn.runCommand(t));
const KEY = s.peek('ITKEY'), B = (sim, x, y, z) => KEY[call(sim, () => sim.fn.blockAt(x, y, z))];
const X = Math.floor(s.peek('px')), Y = Math.floor(s.peek('py')), Z = Math.floor(s.peek('pz'));
// changes: blocks, a chest with things in it, a sign, the inventory, the time, a game rule, a redstone line
cmd(s, `/fill ${X + 2} ${Y} ${Z + 2} ${X + 4} ${Y + 2} ${Z + 4} gold_block`);
cmd(s, `/setblock ${X - 3} ${Y} ${Z} chest`); call(s, () => s.fn.chestAt(X - 3, Y, Z));
call(s, () => { s.fn.chestFind(X - 3, Y, Z); const c = s.peek('cFound'); s.peek('CHI')[(c - 1) * 27 + 5] = KEY.indexOf('diamond'); s.peek('CHN')[(c - 1) * 27 + 5] = 7; });
cmd(s, '/give @s emerald 12'); cmd(s, '/time set 6000'); cmd(s, '/gamerule keepInventory true'); cmd(s, '/xp add @s 5 levels');
for (let i = 0; i < 300; i++) { cmd(s, `/setblock ${X + 6} ${Y} ${Z} ${i % 2 ? 'stone' : 'dirt'}`); }
const ed0 = s.peek('EDX').length;
s.poke('px', X + 0.5); s.poke('pz', Z - 6.5); s.poke('py', Y + 4); s.poke('flying', 1); s.poke('yaw', 77);
F(s, 5);
s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '시험 세계');
call(s, () => s.fn.saveGame(1));
const save = s.peek('AT_세계1').slice();
ok(save[0] === 'BW22' && save[1] === '시험 세계' && save[save.length - 5] === 'END' && save[save.length - 4] === 'CHEAT' && save[save.length - 2] === 'FLAT', `written: ${save.length} items`);
ok(ed0 < 60 && s.peek('EDX').length <= ed0, `300 changes of one cell kept as one entry (v2.4.3: the newest entry takes the change): ${ed0} -> ${s.peek('EDX').length}`);
const tday = s.peek('tday'), inv = s.peek('INVI').slice(), invn = s.peek('INVN').slice();
// a new run: the title, the kept list put back (as tessvm does), then 이어하기
const t = mk({});
F(t, 30);
ok(t.peek('gState') === 0, 'a new run starts at the title');
t.poke('AT_세계1', save); t.poke('AT_확장프로그램', 1);
ok(call(t, () => t.fn.svHas()) === 1, 'the title sees the kept world');
call(t, () => t.fn.loadGame(1));
n = 0; while (t.peek('gState') !== 2 && n < 6000) { F(t); n++; }
F(t, 10);
ok(t.peek('gState') === 2 && t.peek('seed') === 4321, `back in the world (seed ${t.peek('seed')}, after ${n} frames)`);
ok(Math.abs(t.peek('px') - (X + 0.5)) < 0.01 && Math.abs(t.peek('pz') - (Z - 6.5)) < 0.01 && Math.abs(t.peek('yaw') - 77) < 0.01, `where the player stood: ${t.peek('px')} ${t.peek('py')} ${t.peek('pz')}`);
ok(B(t, X + 3, Y + 1, Z + 3) === 'gold_block' && B(t, X + 6, Y, Z) === 'stone', 'the blocks changed are there');
call(t, () => t.fn.chestFind(X - 3, Y, Z)); const c = t.peek('cFound');
ok(c > 0 && t.peek('CHI')[(c - 1) * 27 + 5] === KEY.indexOf('diamond') && t.peek('CHN')[(c - 1) * 27 + 5] === 7, 'the chest and its diamonds');
ok(JSON.stringify(t.peek('INVI')) === JSON.stringify(inv) && JSON.stringify(t.peek('INVN')) === JSON.stringify(invn), 'the inventory');
ok(Math.abs(t.peek('tday') - tday) < 0.01 && t.peek('xpLevel') === 5 && t.peek('grKeep') == 1, `time ${t.peek('tday').toFixed(3)}, level ${t.peek('xpLevel')}, keepInventory ${t.peek('grKeep')}`);
console.log(fails ? fails + ' FAILED' : 'all ok');
