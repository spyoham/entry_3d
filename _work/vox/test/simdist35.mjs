// (v3.5, 11-26) The simulation distance, apart from the chunks drawn (the user: "시뮬레이션 거리와 렌더링 청크를
// 별개로 두게 하고, 시뮬레이션 거리는 계산기가 잘 돌아갈 정도를 한계로").
//   node test/simdist35.mjs [map.txt]
//  - as the game begins the chunks made are the circle's, as they always were;
//  - with the distance at 6 every chunk of the square 13 a side is made to its light, and none outside the
//    circle is meshed; the parts of all of them may work;
//  - the square goes with the player, and back at 4 the chunks outside the circle go;
//  - the distance stays within 4 .. 6; a click goes round;
//  - (with the map) the calculator of the genre WITHOUT its list of chunks to keep, the player at its keys:
//    at 6 it adds, multiplies and divides rightly; at 4 its far end is not there.
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
{
  const s = createSim({ consts: { AUTOSEED: 4242, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3, BENCH: 1 } });
  const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
  const call = (f) => s.as('pen', () => f(s.fn));
  { let n = 0; while (s.peek('gState') !== 2 && n < 20000) { F(); n++; } }
  const NC = Math.round(Math.sqrt(s.peek('CKX').length));
  const count = () => {
    const CKX = s.peek('CKX'), CKZ = s.peek('CKZ'), CKST = s.peek('CKST'), CKRD = s.peek('CKRD');
    const pcx = Math.floor(s.peek('px') / 16), pcz = Math.floor(s.peek('pz') / 16);
    const r = { made: 0, meshed: 0, lit: 0, sq: 0, sqReady: 0, far: 0, meshedOut: 0, pcx, pcz };
    for (let i = 0; i < CKX.length; i++) {
      if (CKST[i] <= 0) continue;
      r.made++;
      const dx = CKX[i] - pcx, dz = CKZ[i] - pcz, cheb = Math.max(Math.abs(dx), Math.abs(dz));
      if (CKST[i] === 5) { r.meshed++; if (dx * dx + dz * dz > 16) r.meshedOut++; }
      if (CKST[i] >= 4) { r.lit++; if (cheb <= 6) { r.sq++; if (CKRD[i] > 0) r.sqReady++; } }
      if (cheb > 6) r.far++;
    }
    return r;
  };
  const settle = (max = 6000) => { let last = -1, same = 0, n = 0; while (n < max && same < 120) { F(); n++; const c = count(); const v = c.lit * 1000 + c.meshed; if (v === last) same++; else { same = 0; last = v; } } return n; };
  ok(NC === 13 && s.peek('simWant') === 4 && s.peek('simR') === 0, `the window is ${NC} chunks a side; the distance begins at ${s.peek('simWant')} (the circle alone)`);
  settle();
  const c0 = count();
  ok(c0.meshed >= 9 && c0.meshed <= 49 && c0.meshedOut === 0 && c0.made <= 69, `at 4: ${c0.made} chunks made, ${c0.meshed} of the circle's 49 meshed (the view reaches no further)`);
  call((fn) => fn.simSet(6)); const n6 = settle();
  const c1 = count();
  ok(c1.sq === 169 && c1.far === 0, `at 6: all 169 chunks of the square are lit after ${n6} frames (${c1.made} made)`);
  ok(c1.meshed <= 49 && c1.meshedOut === 0, `and none outside the circle is meshed: ${c1.meshed} meshed, all of the circle`);
  ok(c1.sqReady >= 121, `the parts of ${c1.sqReady} of them may work (all but the outermost ring, whose far neighbours never come: at least 121)`);
  // the square goes with the player
  s.poke('px', s.peek('px') + 48); settle();
  const c2 = count();
  ok(c2.sq === 169 && c2.far === 0 && c2.pcx === c1.pcx + 3, `three chunks on, the square is round the player again: ${c2.sq} lit, none left behind`);
  call((fn) => fn.simSet(4)); F(5);
  const c3 = count();
  ok(c3.made <= 69, `back at 4 the chunks outside the circle go: ${c3.made} made`);
  call((fn) => fn.simSet(9)); const hi = s.peek('simWant'); call((fn) => fn.simSet(1)); const lo = s.peek('simWant');
  call((fn) => fn.simSet(6)); call((fn) => fn.simNext()); const round = s.peek('simWant');
  ok(hi === 6 && lo === 4 && round === 4, `the distance stays within 4 .. 6 (9 -> ${hi}, 1 -> ${lo}); a click at 6 goes round to ${round}`);
}
// the calculator without its list of chunks to keep
const file = process.argv[2] || process.env.MAP || new URL('../../../calculator_map.txt', import.meta.url);
if (!fs.existsSync(file)) { console.log('no map (' + (file.pathname || file) + '): the calculator is not tried'); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(0); }
{
  const text = fs.readFileSync(file, 'utf8').replace(/;keep=[-\d,]*/, '');
  const more = text.split('|')[11] || '';
  const [hx, , hz] = /hash=(-?\d+),(-?\d+),(-?\d+)/.exec(more).slice(1).map(Number), DZ = -hz;
  // ((11-28) a map put down mirrored - hash= ends with a 1 - has the save's x at hx - x)
  const GX = (x) => (/hash=-?\d+,-?\d+,-?\d+,1/.test(more) ? hx - x : x - hx);
  const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
  const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
  const call = (f) => s.as('pen', () => f(s.fn));
  F(30);
  call((fn) => fn.menuGo(2)); F(3);
  s.poke('$CLIPBOARD', text); F(2);
  s.poke('cwMode', 1); s.poke('cwName', 'calc');
  call((fn) => fn.worldNew(fn.worldFree()));
  { let n = 0; while (s.peek('gState') !== 2 && n < 20000) { F(); n++; } }
  ok(s.peek('KCX').length === 0, 'the map is taken without a list of chunks to keep');
  const cells = text.split('|')[5].split(';').filter(Boolean).map((e) => e.split(',').map(Number));
  let other = 0;
  const there = () => { const W = s.peek('W'), CKX = s.peek('CKX'), CKZ = s.peek('CKZ'), CKST = s.peek('CKST'), NC = Math.round(Math.sqrt(CKX.length)), WS = NC * 16, md = (a, m) => ((a % m) + m) % m; let n = 0; other = 0; for (const [x, y, z, b] of cells) { const cx = Math.floor(x / 16), cz = Math.floor(z / 16), sl = md(cx, NC) * NC + md(cz, NC); if (CKX[sl] === cx && CKZ[sl] === cz && CKST[sl] >= 4) { n++; if (W[(md(x, WS) * WS + md(z, WS)) * 256 + y] !== b) other++; } } return n; };
  F(600);
  const n4 = there();
  ok(n4 < cells.length && other === 0, `at 4 only ${n4} of its ${cells.length} blocks are in chunks made - and those are as they were saved (${other} other: the parts by a chunk not there stand still)`);
  call((fn) => fn.simSet(6));
  { let n = 0; while (n < 4000 && there() < cells.length) { F(20); n += 20; } ok(there() === cells.length && other === 0, `at 6 all ${cells.length} are, ${n} frames on, each as it was saved (${other} other)`); }
  F(300);
  const B = (x, y, z) => call((fn) => fn.blockAt(GX(x), y, z + DZ));
  const lampOn = s.peek('ITKEY').indexOf('spark_lamp') + 1;
  const SEG = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': ' ', '0000001': '-', '1110011': 9, '0011111': 6, '1110010': 7 };
  const lit = (x, y) => (B(x, y, 32) === lampOn ? 1 : 0);
  const digit = (k, y0) => { const x0 = 29 + 8 * k; const key = '' + lit(x0 + 2, y0 + 8) + lit(x0, y0 + 6) + lit(x0, y0 + 2) + lit(x0 + 2, y0) + lit(x0 + 4, y0 + 2) + lit(x0 + 4, y0 + 6) + lit(x0 + 2, y0 + 4); return key in SEG ? SEG[key] : '?'; };
  const row = (y0, n) => { let r = ''; for (let k = n - 1; k >= 0; k--) r += digit(k, y0); return r.replace(/ /g, ''); };
  const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
  const OPS = { '+': -1, '-': -2, '*': -3, '/': -4, c: 1 };
  const rest = (max = 6000) => { let q = 0, n = 0; while (n < max && q < 60) { F(); n++; if (s.peek('scN') === 0 && s.peek('BEX').length === 0 && s.peek('MVX').length === 0) q++; else q = 0; } return n; };
  const press = (y, z) => { call((fn) => fn.buttonPress(GX(33), y, z + DZ)); F(6); rest(); };
  const lever = () => { call((fn) => fn.leverToggle(GX(33), 85, 2 + DZ, fn.blockAt(GX(33), 85, 2 + DZ))); rest(); };
  for (const [a, op, b] of [[12, '+', 34], [7, '-', 9], [12, '*', 12], [100, '/', 7]]) {
    press(85, OPS.c);
    for (const d of String(a)) press(...NUM[d]);
    lever();
    for (const d of String(b)) press(...NUM[d]);
    call((fn) => fn.buttonPress(GX(33), 85, OPS[op] + DZ)); F(6); rest();
    const want = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : Math.floor(a * 100 / b), got = row(71, 5);
    ok(got === String(want), `at 6, with no chunks kept by the map: ${a} ${op} ${b} = ${got}`);
    lever();
  }
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);
