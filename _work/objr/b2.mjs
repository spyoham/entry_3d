// Variants of the hot loops, timed in plain Entry (microseconds an item).
//   node b2.mjs
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath } from './legacy.mjs';
import { runEnt } from '../gmp/erun.mjs';
import path from 'node:path'; import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const N = 1000;
const rnd = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const tests = [];
const T = (name, per, fn) => tests.push({ name, per, fn });
let src = `let done = 0; let BT = [];
let VX = ${JSON.stringify(rnd(N, i => Math.round(Math.sin(i) * 15000)))}, VY = ${JSON.stringify(rnd(N, i => Math.round(Math.cos(i * 1.7) * 15000)))}, VZ = ${JSON.stringify(rnd(N, i => Math.round(Math.sin(i * 2.3) * 15000)))};
let SX = ${JSON.stringify(rnd(N, i => i % 200 - 100))}, SY = ${JSON.stringify(rnd(N, i => (i * 7) % 200 - 100))}, TZ = ${JSON.stringify(rnd(N, i => 300000000 + (i * 7919) % 90000000))};
let FA = ${JSON.stringify(rnd(N, i => i % 997 + 1))}, FB = ${JSON.stringify(rnd(N, i => (i * 3) % 997 + 1))}, FC = ${JSON.stringify(rnd(N, i => (i * 7) % 997 + 1))};
let NA = ${JSON.stringify(rnd(N, i => Math.round(Math.sin(i * 1.1) * 4096)))}, NB = ${JSON.stringify(rnd(N, i => Math.round(Math.cos(i * 1.3) * 4096)))}, NC = ${JSON.stringify(rnd(N, i => Math.round(Math.sin(i * 0.7) * 4096)))}, ND = ${JSON.stringify(rnd(N, i => 0))}, FM = ${JSON.stringify(rnd(N, i => 1))};
let LK = ${JSON.stringify(rnd(N, i => 0))}, CL = ${JSON.stringify(rnd(N, i => '#808080'))}, HD = ${JSON.stringify(rnd(1100, i => 0))}, RAMP = ${JSON.stringify(rnd(40, i => '#8090a0'))};
let xa0 = 2000000, xa1 = 100000, xa2 = -900000, xa3 = 0, xb0 = 300000, xb1 = 2100000, xb2 = 500000, xb3 = 0, xc0 = -1500, xc1 = 2000, xc2 = -3200, xc3 = 368640000;
let eyeX = 30000, eyeY = -40000, eyeZ = 64000, wOff = 500000000, bktW = 1000000, dB = 0, dR = 0;
`;
// ---- transform ----
T('xf: 8 statements (now)', N, `function NAME() { let i = 1, x = 0, y = 0, z = 0, w = 0, a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3, c0 = xc0, c1 = xc1, c2 = xc2, c3 = xc3;
  for (const _ of rep(${N})) { x = VX[i]; y = VY[i]; z = VZ[i]; w = c0 * x + c1 * y + c2 * z + c3; TZ[i] = w; SX[i] = (a0 * x + a1 * y + a2 * z + a3) / w; SY[i] = (b0 * x + b1 * y + b2 * z + b3) / w; i = i + 1; } }`);
T('xf: 4 statements', N, `function NAME() { let i = 1, a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3, c0 = xc0, c1 = xc1, c2 = xc2, c3 = xc3;
  for (const _ of rep(${N})) { TZ[i] = c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3; SX[i] = (a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3) / TZ[i]; SY[i] = (b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3) / TZ[i]; i = i + 1; } }`);
T('xf: 4 statements, globals for the matrix', N, `function NAME() { let i = 1;
  for (const _ of rep(${N})) { TZ[i] = xc0 * VX[i] + xc1 * VY[i] + xc2 * VZ[i] + xc3; SX[i] = (xa0 * VX[i] + xa1 * VY[i] + xa2 * VZ[i] + xa3) / TZ[i]; SY[i] = (xb0 * VX[i] + xb1 * VY[i] + xb2 * VZ[i] + xb3) / TZ[i]; i = i + 1; } }`);
T('xf: 4 statements, two a round', N, `function NAME() { let i = 1, a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3, c0 = xc0, c1 = xc1, c2 = xc2, c3 = xc3;
  for (const _ of rep(${N / 2})) { TZ[i] = c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3; SX[i] = (a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3) / TZ[i]; SY[i] = (b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3) / TZ[i]; i = i + 1;
   TZ[i] = c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3; SX[i] = (a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3) / TZ[i]; SY[i] = (b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3) / TZ[i]; i = i + 1; } }`);
T('xf: 3 statements (w in a local), no TZ', N, `function NAME() { let i = 1, w = 0, a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3, c0 = xc0, c1 = xc1, c2 = xc2, c3 = xc3;
  for (const _ of rep(${N})) { SX[i] = (a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3) / (c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3); SY[i] = (b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3) / (c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3); i = i + 1; } }`);
T('xf: no perspective (2 statements + i)', N, `function NAME() { let i = 1, a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3;
  for (const _ of rep(${N})) { SX[i] = a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3; SY[i] = b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3; i = i + 1; } }`);
T('loop alone: i = i + 1', N, `function NAME() { let i = 1; for (const _ of rep(${N})) { i = i + 1; } }`);
T('loop alone, while', N, `function NAME() { let i = 1; while (i <= ${N}) { i = i + 1; } }`);
T('one list write a round', N, `function NAME() { let i = 1; for (const _ of rep(${N})) { TZ[i] = 0; i = i + 1; } }`);
// ---- pass ----
const PASS0 = `s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i]; if (s > 0) { w = TZ[FA[i]] + TZ[FB[i]] + TZ[FC[i]]; b = idiv(w - w0, bw); LK[i] = HD[b]; HD[b] = i; CL[i] = RAMP[FM[i] + idiv(s * 30, w)]; } i = i + 1;`;
T('ps: now', N, `function NAME() { let i = 1, s = 0, w = 0, b = 0, ex = eyeX, ey = eyeY, ez = eyeZ, w0 = wOff, bw = bktW; for (const _ of rep(${N})) { ${PASS0} } }`);
const PASS1 = `s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i]; if (s > 0) { b = idiv(TZ[FA[i]] + TZ[FB[i]] + TZ[FC[i]] - w0, bw); LK[i] = HD[b]; HD[b] = i; CL[i] = RAMP[FM[i] + idiv(s, w0 + b * bw)]; } i = i + 1;`;
T('ps: no w', N, `function NAME() { let i = 1, s = 0, b = 0, ex = eyeX, ey = eyeY, ez = eyeZ, w0 = wOff, bw = bktW; for (const _ of rep(${N})) { ${PASS1} } }`);
T('ps: no w, two a round', N, `function NAME() { let i = 1, s = 0, b = 0, ex = eyeX, ey = eyeY, ez = eyeZ, w0 = wOff, bw = bktW; for (const _ of rep(${N / 2})) { ${PASS1} ${PASS1} } }`);
T('ps: the test alone', N, `function NAME() { let i = 1, s = 0, ex = eyeX, ey = eyeY, ez = eyeZ; for (const _ of rep(${N})) { s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i]; i = i + 1; } }`);
T('ps: the test in the if', N, `function NAME() { let i = 1, s = 0, ex = eyeX, ey = eyeY, ez = eyeZ; for (const _ of rep(${N})) { if (NA[i] * ex + NB[i] * ey + NC[i] * ez > ND[i]) { s = 1; } i = i + 1; } }`);
// ---- draw ----
T('tri: stop, a=, goto, colour, start, a=, goto, a=, goto', N, `function NAME() { let i = 1, a = 0; eraseAll(); for (const _ of rep(${N})) { fillStop(); a = FA[i]; goto(SX[a], SY[a]); fillColorHex(CL[i]); fillStart(); a = FB[i]; goto(SX[a], SY[a]); a = FC[i]; goto(SX[a], SY[a]); i = i + 1; } fillStop(); eraseAll(); }`);
T('tri: stop, goto, colour, start, goto, goto', N, `function NAME() { let i = 1; eraseAll(); for (const _ of rep(${N})) { fillStop(); goto(SX[FA[i]], SY[FA[i]]); fillColorHex(CL[i]); fillStart(); goto(SX[FB[i]], SY[FB[i]]); goto(SX[FC[i]], SY[FC[i]]); i = i + 1; } fillStop(); eraseAll(); }`);
T('tri: goto, colour, goto, goto, goto', N, `function NAME() { let i = 1; eraseAll(); fillStart(); for (const _ of rep(${N})) { goto(SX[FA[i]], SY[FA[i]]); fillColorHex(CL[i]); goto(SX[FB[i]], SY[FB[i]]); goto(SX[FC[i]], SY[FC[i]]); goto(SX[FA[i]], SY[FA[i]]); i = i + 1; } fillStop(); eraseAll(); }`);
T('one goto', N, `function NAME() { let i = 1; for (const _ of rep(${N})) { goto(SX[i], SY[i]); i = i + 1; } }`);
T('one fillColorHex', N, `function NAME() { let i = 1; eraseAll(); for (const _ of rep(${N})) { fillColorHex(CL[i]); i = i + 1; } eraseAll(); }`);
T('fillStop + fillStart', N, `function NAME() { let i = 1; eraseAll(); for (const _ of rep(${N})) { fillStop(); fillStart(); i = i + 1; } fillStop(); eraseAll(); }`);

const only = new RegExp(process.argv[2] || '.');
for (let k = tests.length - 1; k >= 0; k--) if (!only.test(tests[k].name)) tests.splice(k, 1);
const names = tests.map((t, k) => 'bn' + k);
tests.forEach((t, k) => { src += t.fn.replace('NAME', names[k]) + '\n'; });
src += `on('start', 'pen', function () { let t0 = 0, r = 0, best = 0;\n` + names.map((n, k) => `best = 1000000; r = 0; while (r < 5) { t0 = timer(); ${n}(); t0 = (timer() - t0) * 1000000 / ${tests[k].per}; if (t0 < best) { best = t0; } r = r + 1; } BT.push(best); waitSec(0);`).join('\n') + `\ndone = 1; });\n`;
const prog = compileProgram([declareImplicit(expandMacros(src).src)], {});
if (process.env.LEGACY) legacyMath(prog);
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const out = path.join(HERE, 'b2.ent');
packEnt(out, { name: 'b2', tmpDir: path.join(HERE, '.pack'), variables: prog.variables, functions: prog.functions, messages: prog.messages, objects: [{ id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen }], speed: 60 });
const r = await runEnt(out, { vars: ['done'], lists: ['BT'], timeout: 120000 });
if (r.errors.length) console.log(r.errors.slice(0, 3));
(r.vars.BT || []).forEach((v, i) => console.log(Number(v).toFixed(1).padStart(7), 'us ', tests[i].name));
