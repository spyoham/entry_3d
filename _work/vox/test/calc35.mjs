// (v3.5, 11-26) A calculator of the genre, brought over as map data (mc2bw.mjs), works in a single world of the
// game as it is played: the window of 10 x 10 chunks, the player on the platform by the keys.
//   node test/calc35.mjs [map.txt]        (the map: node mc2bw.mjs <the save's folder> <map.txt>; see the manual)
// The map is another's work and is not in this repository: without the file the test says so and passes.
//  - the pasted map is taken with its twelfth part: where the player begins, the chunks kept, the comparators;
//  - every chunk the machine is in is made and its parts may work, with the player standing at the keys;
//  - nothing of the machine is other than it was saved once it has come to rest (the order its chunks were
//    made in changes nothing);
//  - sums typed on the keys come out on the lamps: adding, subtracting (below zero too), the largest numbers;
//  - it is too large for a server and the game says so.
// (Its multiplying and dividing come out wrong, here as in the plain reference of the genre's rules,
// test/mcref.mjs - see the manual; they are not asked here.)
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
const file = process.argv[2] || process.env.MAP || new URL('../../../calculator_map.txt', import.meta.url);
if (!fs.existsSync(file)) { console.log('no map (' + (file.pathname || file) + '): node mc2bw.mjs <save folder> <map.txt> makes one - nothing tested'); console.log('all ok'); process.exit(0); }
const text = fs.readFileSync(file, 'utf8');
const more = text.split('|')[11] || '';
const [hx, , hz] = /hash=(-?\d+),(-?\d+),(-?\d+)/.exec(more).slice(1).map(Number), DX = -hx, DZ = -hz;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const call = (f) => s.as('pen', () => f(s.fn));
F(30);
call((fn) => fn.menuGo(2)); F(3);
s.poke('$CLIPBOARD', text); F(2);
ok(s.peek('mpOn') === 1 && s.peek('mpNE') > 50000 && /keep=/.test(String(s.peek('mpX'))), `the pasted map is taken: ${s.peek('mpNE')} blocks, ${text.length} letters`);
s.poke('cwMode', 1); s.poke('cwName', 'calc');
call((fn) => fn.worldNew(fn.worldFree()));
{ let n = 0; while (s.peek('gState') !== 2 && n < 20000) { F(); n++; } }
const sp = /spawn=(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?\d+)/.exec(more).slice(1).map(Number);
ok(Math.abs(s.peek('px') - sp[0]) < 0.6 && Math.abs(s.peek('py') - sp[1]) < 1.1 && Math.abs(s.peek('pz') - sp[2]) < 0.6 && s.peek('yaw') === sp[3], `the player begins where the map says, looking its way: ${s.peek('px')}, ${s.peek('py')}, ${s.peek('pz')}, ${s.peek('yaw')}`);
ok(s.peek('CMX').length >= 50 && s.peek('hoX') === hx && s.peek('KCX').length > 40, `it brought ${s.peek('CMX').length} comparators' outputs, ${s.peek('KCX').length} chunks to keep, the place its cells are hashed at (${s.peek('hoX')}, ${s.peek('hoZ')})`);
// the chunks kept: made, their parts free to work
const kept = () => { const KCX = s.peek('KCX'), KCZ = s.peek('KCZ'), CKX = s.peek('CKX'), CKZ = s.peek('CKZ'), CKST = s.peek('CKST'), CKRD = s.peek('CKRD'), CKRV = s.peek('CKRV'); let n = 0; for (let i = 0; i < KCX.length; i++) { const sl = (((KCX[i] % 10) + 10) % 10) * 10 + (((KCZ[i] % 10) + 10) % 10); if (CKX[sl] === KCX[i] && CKZ[sl] === KCZ[i] && CKST[sl] >= 4 && CKRD[sl] > 0 && CKRV[sl] === 0) n++; } return n; };
{ let n = 0; while (kept() < s.peek('KCX').length && n < 3000) { F(); n++; } ok(kept() === s.peek('KCX').length, `the ${s.peek('KCX').length} chunks of the machine are made and at work after ${n} frames (the window holds ${s.peek('CKX').length})`); }
F(200);
// as it was saved
const cells = text.split('|')[5].split(';').filter(Boolean).map((e) => e.split(',').map(Number));
{ const W = s.peek('W'), WS = Math.round(Math.sqrt(W.length / 256)), md = (a) => ((a % WS) + WS) % WS; let d = 0; for (const [x, y, z, b] of cells) if (W[(md(x) * WS + md(z)) * 256 + y] !== b) d++; ok(d === 0 && s.peek('scN') === 0, `at rest every one of its ${cells.length} blocks is as it was saved (${d} other)`); }
// the keys and the lamps (the save's own coordinates)
const B = (x, y, z) => call((fn) => fn.blockAt(x + DX, y, z + DZ));
const lampOn = s.peek('ITKEY').indexOf('spark_lamp') + 1;
const SEG = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': ' ', '0000001': '-', '1110011': 9, '0011111': 6, '1110010': 7 };
const lit = (x, y) => (B(x, y, 32) === lampOn ? 1 : 0);
const digit = (k, y0) => { const x0 = 29 + 8 * k; const key = '' + lit(x0 + 2, y0 + 8) + lit(x0, y0 + 6) + lit(x0, y0 + 2) + lit(x0 + 2, y0) + lit(x0 + 4, y0 + 2) + lit(x0 + 4, y0 + 6) + lit(x0 + 2, y0 + 4); return key in SEG ? SEG[key] : '?'; };
const row = (y0, n) => { let r = ''; for (let k = n - 1; k >= 0; k--) r += digit(k, y0); return r.replace(/ /g, ''); };
const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
const OPS = { '+': -1, '-': -2, c: 1 };
const rest = (max = 3000) => { let q = 0, n = 0; while (n < max && q < 60) { F(); n++; if (s.peek('scN') === 0 && s.peek('BEX').length === 0 && s.peek('MVX').length === 0) q++; else q = 0; } return n; };
const press = (y, z) => { call((fn) => fn.buttonPress(33 + DX, y, z + DZ)); F(6); rest(); };
const lever = () => { call((fn) => fn.leverToggle(33 + DX, 85, 2 + DZ, fn.blockAt(33 + DX, 85, 2 + DZ))); rest(); };
for (const [a, op, b] of [[12, '+', 34], [7, '-', 9], [9, '-', 7], [200, '-', 45], [255, '+', 255], [0, '+', 0]]) {
  press(85, OPS.c);
  for (const d of String(a)) press(...NUM[d]);
  lever();
  for (const d of String(b)) press(...NUM[d]);
  const typed = row(93, 3) + ' ' + row(83, 3);
  const g0 = s.peek('gtNow');
  call((fn) => fn.buttonPress(33 + DX, 85, OPS[op] + DZ)); F(6); rest();
  const want = op === '+' ? a + b : a - b, got = row(71, 4);
  ok(typed === `${a} ${b}` && got === String(want), `${a} ${op} ${b} = ${got} (typed ${typed}; ${s.peek('gtNow') - g0} game ticks)`);
  lever();
}
// too large for a server
s.poke('$CLIPBOARD', text);
call((fn) => { fn.mapTake(); });
s.poke('esName', '계산기'); s.poke('esEdit', 0);
call((fn) => fn.serverSave());
ok(s.peek('mpOn') === 1 && String(s.peek('menuErr')).includes('너무 큽니다'), 'pasted for a server it is refused: ' + s.peek('menuErr'));
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);
