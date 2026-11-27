// (v3.5, 11-28) The log of changed blocks made short (save.js edCompact) keeps every cell however long the log.
// Its table of cells was 65,536 places whatever the log held: a log of more cells than that found no place for the
// rest and dropped them - a world of 100,000 changed blocks lost a third of them at its first save - and near that
// many it went round the whole table for every entry. Now the table grows with the log, and a log in which no cell
// can be written twice (the cells' own table is on) is not gone through at all.
//   node test/edbig35.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
{ let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; } }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => call(() => fn.runCommand(t));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
s.poke('px', 8.5); s.poke('py', 126); s.poke('pz', 8.5); s.poke('flying', 1);
F(5);
const WY = Math.round(s.peek('W').length / (s.peek('CKX').length * 256));
const Y0 = WY - 30, Y1 = WY - 3, H = Y1 - Y0 + 1;
const n0 = s.peek('EDX').length;
// four boxes of 30 x 30 x H cells: more cells than the old table had places
const BOX = [[-22, -22], [8, -22], [-22, 8], [8, 8]], per = 30 * 30 * H;
for (const [x, z] of BOX) cmd(`/fill ${x} ${Y0} ${z} ${x + 29} ${Y1} ${z + 29} glass`);
F(3);
const key = (x, y, z) => x * 1000003 + z * 1009 + y;
const want = new Map();
for (const [x0, z0] of BOX) for (let x = x0; x < x0 + 30; x++) for (let z = z0; z < z0 + 30; z++) for (let y = Y0; y <= Y1; y++) want.set(key(x, y, z), 'glass');
// one box written over (the cells' table is off past 90,000 entries: these may be written as new lines), a part of
// another taken out again
cmd(`/fill ${BOX[0][0]} ${Y0} ${BOX[0][1]} ${BOX[0][0] + 29} ${Y1} ${BOX[0][1] + 29} stone`);
for (let x = BOX[0][0]; x < BOX[0][0] + 30; x++) for (let z = BOX[0][1]; z < BOX[0][1] + 30; z++) for (let y = Y0; y <= Y1; y++) want.set(key(x, y, z), 'stone');
cmd(`/fill ${BOX[3][0]} ${Y1} ${BOX[3][1]} ${BOX[3][0] + 29} ${Y1} ${BOX[3][1] + 29} air`);
for (let x = BOX[3][0]; x < BOX[3][0] + 30; x++) for (let z = BOX[3][1]; z < BOX[3][1] + 30; z++) want.set(key(x, Y1, z), ' ');
F(3);
const before = s.peek('EDX').length;
ok(4 * per > 65536 && before >= n0 + 4 * per, `${4 * per} cells changed (the old table had 65,536 places); the log holds ${before} lines`);
// made short: every cell once, each with what it holds now
const t0 = Date.now();
s.poke('edDup', 1);
call(() => fn.edCompact());
const ms = Date.now() - t0;
const EDX = s.peek('EDX'), EDY = s.peek('EDY'), EDZ = s.peek('EDZ'), EDB = s.peek('EDB'), KEY = s.peek('ITKEY');
const got = new Map();
let twice = 0;
for (let i = 0; i < EDX.length; i++) { const k = key(EDX[i], EDY[i], EDZ[i]); if (got.has(k)) twice++; got.set(k, String(KEY[EDB[i]])); }
let lost = 0, wrong = 0;
for (const [k, v] of want) { if (!got.has(k)) lost++; else if (got.get(k) !== v) wrong++; }
ok(lost === 0 && wrong === 0 && twice === 0, `made short (${ms} ms): ${EDX.length} lines, every one of the ${want.size} cells there once with the block it holds (${lost} lost, ${wrong} other, ${twice} twice)`);
ok(s.peek('EHN') >= EDX.length * 2, `the table is ${s.peek('EHN')} places for ${EDX.length} lines`);
// with the cells' table on and nothing written twice it is not gone through
{
  const g0 = s.peek('ehGen');
  ok(s.peek('edDup') === 0, 'after it no cell is in the log twice');
  call(() => fn.edCompact());
  ok(s.peek('ehGen') === g0 && s.peek('EDX').length === EDX.length, 'asked again with nothing new it does nothing');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);
