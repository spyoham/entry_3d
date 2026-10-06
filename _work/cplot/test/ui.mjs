// The controls, in the simulator: keys, the pointer, the formula box, the read-out.
//   node test/ui.mjs
import { createSim } from '../sim.mjs';
let bad = 0;
const ok = (c, what, ...more) => { if (!c) { bad++; console.log('FAIL', what, ...more); } };
const s = createSim();
const run = (n) => { for (let i = 0; i < n; i++) s.frame(); };
const press = (code, n = 3) => { s.keys.add(code); run(n); s.keys.delete(code); run(2); };
const enter = (text) => { s.answers.push(text); press(13); };
run(3);
ok(s.peek('helpOn') === 1 && s.base.help.visible, 'help shown at the start');
ok(s.text('top') === 'f(z) = (z^2-1)(z-2-i)^2/(z^2+2+2i)', 'first formula', s.text('top'));
press(50);
ok(s.peek('helpOn') === 0 && !s.base.help.visible, 'a key hides the help');
ok(s.text('top') === 'f(z) = z', 'key 2', s.text('top'));
s.settle();
// the read-out
s.mouse.x = 64; s.mouse.y = -32; run(2);
ok(s.text('bot') === 'z = 1 - 0.5i   f(z) = 1 - 0.5i   |f| = 1.118   arg = -27°   눈금 1', 'read-out', s.text('bot'));
// a formula typed in
enter('z^2');
ok(s.text('top') === 'f(z) = z^2', 'typed formula', s.text('top'));
run(2);
ok(s.text('bot').includes('f(z) = 0.75 - i   |f|'), 'read-out of z^2', s.text('bot'));
enter('2^^z');
ok(s.text('top').startsWith('식이 맞지 않습니다 (3번째 글자)'), 'error shown', s.text('top'));
ok(s.peek('fsrc') === 'z^2' && s.peek('cerr') === 0, 'the old formula stays');
run(260);
ok(s.text('top') === 'f(z) = z^2', 'error goes away', s.text('top'));
enter('');
ok(s.text('top') === 'f(z) = z^2', 'empty answer changes nothing');
enter('(1+2i)^(3-i)');
ok(s.text('top') === '(1+2i)^(3-i) = -27.43638199 + 19.78931037i', 'calculator', s.text('top'));
enter('e^(i pi)');
ok(s.text('top') === 'e^(i pi) = -1' || /^e\^\(i pi\) = -1 [+-] \d\.\d+e-1[67]i$/.test(s.text('top')), 'calculator: Euler', s.text('top'));
enter('1/3');
ok(s.text('top') === '1/3 = 0.3333333333', 'calculator: 1/3', s.text('top'));
enter('zeta(2)');
ok(s.text('top') === 'zeta(2) = 1.644934067', 'calculator: zeta(2)', s.text('top'));
enter('gamma(5)');
ok(s.text('top') === 'gamma(5) = 24', 'calculator: gamma(5)', s.text('top'));
enter('zeta(-1)');
ok(s.text('top') === 'zeta(-1) = -0.08333333333', 'calculator: zeta(-1)', s.text('top'));
enter('1/e^50');
ok(s.text('top') === '1/e^50 = 1.928749848e-22', 'calculator: a small quotient', s.text('top'));
enter('z^3-1');
// zoom keeps the point under the pointer
s.mouse.x = 100; s.mouse.y = 50; run(2);
const at = () => [s.peek('vcx') + s.mouse.x * s.peek('vupp'), s.peek('vcy') + s.mouse.y * s.peek('vupp')];
const p0 = at(); const u0 = s.peek('vupp');
press(90);
ok(s.peek('vupp') === u0 / 2, 'zoom in halves the scale', s.peek('vupp'));
ok(Math.abs(at()[0] - p0[0]) < 1e-12 && Math.abs(at()[1] - p0[1]) < 1e-12, 'zoom keeps the pointed point');
press(88); press(88);
ok(s.peek('vupp') === u0 * 2, 'zoom out');
press(82);
ok(s.peek('vcx') === 0 && s.peek('vcy') === 0 && s.peek('vupp') === 0.015625, 'R resets the view');
// dragging
s.mouse.x = 0; s.mouse.y = 0; run(2);
s.mouse.down = true; run(1);
for (let i = 1; i <= 10; i++) { s.mouse.x = 6 * i; s.mouse.y = 3 * i; run(1); }
s.mouse.down = false; run(1);
ok(Math.abs(s.peek('vcx') + 60 * 0.015625) < 1e-12 && Math.abs(s.peek('vcy') + 30 * 0.015625) < 1e-12, 'drag moves the view', s.peek('vcx'), s.peek('vcy'));
// arrows
const x1 = s.peek('vcx'); s.keys.add(39); run(5); s.keys.delete(39); run(1);
ok(Math.abs(s.peek('vcx') - x1 - 5 * 6 * 0.015625) < 1e-12, 'arrow key', s.peek('vcx') - x1);
// colour mode, axes
const m0 = s.peek('cmode'); press(67); ok(s.peek('cmode') === (m0 + 1) % 4, 'C changes the colour mode');
s.settle();
ok(s.base.axes.pen.strokes.length > 2, 'axes drawn', s.base.axes.pen.strokes.length);
press(65); run(2); ok(s.base.axes.pen.strokes.length === 0, 'A hides the axes');
press(65);
// a long drag on a slow machine: the clones must not pile up, and the picture must end right
s.poke('budget', 60); s.poke('paceKnown', 1); s.poke('fpsNow', 17); s.poke('bFail', 61);
s.mouse.x = -100; s.mouse.y = -50; run(1); s.mouse.down = true;
let maxAlive = 0;
for (let i = 0; i < 900; i++) { s.mouse.x = -100 + (i % 200); s.mouse.y = -50 + (i % 77); s.poke('budget', 60); run(1); maxAlive = Math.max(maxAlive, s.stats.clones); }
s.mouse.down = false;
ok(maxAlive < 60, 'clones during a long drag', maxAlive);
s.poke('budget', 20000);
const n = s.settle();
ok(s.peek('rState') === 0 && s.peek('pcx') === s.peek('vcx') && s.peek('pupp') === s.peek('vupp'), 'picture of the last view', n);
ok(s.stats.clones < 60, 'clones at rest', s.stats.clones);
// ---- v1.1: zeros and poles by a click, the parameters a and t
const click = (x, y) => { s.mouse.x = x; s.mouse.y = y; run(1); s.mouse.down = true; run(2); s.mouse.down = false; run(2); };
press(82);
enter('z^3-1');
click(67, 3);
ok(s.text('top') === '영점 z = 1', 'click finds the zero 1', s.text('top'));
click(-30, 58);
ok(s.text('top') === '영점 z = -0.5 + 0.8660254038i', 'click finds another zero', s.text('top'));
ok(s.peek('MKX').length === 2 && s.peek('MKK')[0] === 1, 'two markers', s.peek('MKX').length);
click(-30, 57);
ok(s.peek('MKX').length === 2, 'the same zero is marked once');
enter('(z^2-1)(z-2-i)^2/(z^2+2+2i)');
ok(s.peek('MKX').length === 0, 'a new formula clears the markers');
click(125, 60);
ok(s.text('top') === '영점 z = 2 + i  (2겹)', 'a double zero', s.text('top'));
click(-50, 100);
ok(s.text('top') === '극 z = -0.6435942529 + 1.553773974i', 'a pole', s.text('top'));
enter('e^z');
click(10, 10);
ok(s.text('top') === '가까운 영점이나 극을 찾지 못했습니다', 'nothing to find', s.text('top'));
run(400);
ok(s.text('top') === 'f(z) = e^z', 'the message goes away', s.text('top'));
enter('1/z^3');
click(4, -3);
ok(s.text('top') === '극 z = 0  (3겹)' || /^극 z = -?\d\.\d+e-\d+/.test(s.text('top')), 'a triple pole', s.text('top'));
// a: follows the pointer while S is held
enter('z^2+a');
ok(s.text('top') === 'f(z) = z^2+a   a = 1', 'a in the label', s.text('top'));
s.mouse.x = 32; s.mouse.y = -64; s.keys.add(83); run(2); s.keys.delete(83); run(1);
ok(s.peek('aRe') === 0.5 && s.peek('aIm') === -1 && s.text('top') === 'f(z) = z^2+a   a = 0.5 - i', 'S moves a', s.text('top'));
s.mouse.x = 0; s.mouse.y = 0; run(2);
ok(s.text('bot').startsWith('z = 0   f(z) = 0.5 - i'), 'the read-out uses a', s.text('bot'));
s.poke('budget', 20000); s.settle();
ok(s.peek('pAr') === 0.5 && s.peek('pAi') === -1, 'the picture is of that a');
// t: runs, stops with the space bar
enter('z^3+e^(it)');
const t0 = s.peek('tPar'); run(60);
ok(Math.abs(s.peek('tPar') - t0 - 1) < 0.02, 't runs with the clock', s.peek('tPar') - t0);
ok(/^f\(z\) = z\^3\+e\^\(it\)   t = [\d.]+ ▶$/.test(s.text('top')), 't in the label', s.text('top'));
ok(s.peek('rLevel') <= s.peek('baseLevel'), 'while t runs only the first pass is drawn', s.peek('rLevel'));
press(32);
const t1 = s.peek('tPar'); run(30);
ok(s.peek('tPar') === t1 && s.text('top').endsWith('■'), 'space stops t', s.text('top'));
s.settle();
ok(s.peek('rLevel') === s.peek('maxLevel') && s.peek('pT') === t1, 'stopped: the picture is finished at that t', s.peek('rLevel'));
press(32);
// the examples one after another: every one must compile
press(49);
for (let i = 2; i <= 21; i++) { press(190); ok(s.peek('cerr') === 0 && s.peek('exAt') === (i - 1) % 20 + 1, 'example ' + i, s.text('top')); }
ok(s.text('top').startsWith('f(z) = (z^2-1)(z-2-i)^2'), 'the examples wrap around', s.text('top'));
press(188);
ok(s.peek('exAt') === 20, 'and back');
press(82);
// numbers
const fmt = (v) => { s.fn.fmt(v); return s.peek('fs'); };
const FM = [[0, '0'], [0.1 + 0.2, '0.3'], [12345.678, '12346'], [-3.14159265, '-3.1416'], [1e-7, '1e-7'], [123456789, '1.2346e8'], [0.001234567, '0.0012346'], [0.00012345, '1.2345e-4'], [999999.5, '1000000'], [-1e300, '-1e300'], [Infinity, '∞'], [-Infinity, '-∞'], [1, '1'], [100, '100'], [99999.4, '99999'], [2.5e-310, '2.5e-310']];
for (const [v, want] of FM) ok(fmt(v) === want, 'fmt ' + v, fmt(v), 'want', want);
console.log(bad ? `FAIL ${bad}` : 'PASS', 'max clones during the long drag', maxAlive);
process.exit(bad ? 1 : 0);
