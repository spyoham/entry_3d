// the bow shoots more than once (bowCool counts down): node test/bow.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
s.as('pen', () => { s.fn.runCommand('/clear'); s.fn.runCommand('/give @s bow 1'); s.fn.runCommand('/give @s arrow 10'); });
F(2);
const inv = () => s.peek('INVI'), invn = () => s.peek('INVN');
const ARROW = s.peek('ITKEY').indexOf('arrow'), BOW = s.peek('ITKEY').indexOf('bow');
// the bow in the hand
const bi = inv().indexOf(BOW);
s.poke('hotSel', bi + 1);
const arrows = () => inv().reduce((t, id, i) => t + (id === ARROW ? invn()[i] : 0), 0);
s.poke('pitch', 10);
ok(arrows() === 10, 'start: 10 arrows, bow in slot ' + bi);
const flying = () => s.peek('AON').filter(v => v === 2).length;
// (v3.0) drawn while held, shot when let go: a tap is no shot (under 0.1 drawn)
s.press(70); F(2); s.release(70); F(10);
ok(arrows() === 10, `a tap: no arrow (${arrows()} left)`);
const speed = () => { const a = s.peek('lastArr'); const vx = s.peek('AVX')[a - 1], vy = s.peek('AVY')[a - 1], vz = s.peek('AVZ')[a - 1]; return Math.hypot(vx, vy, vz); };
for (let shot = 1; shot <= 3; shot++) {
  s.press(70); F(70); s.release(70); F(1);
  const v = speed();
  F(60);
  ok(arrows() === 10 - shot && Math.abs(v - 32) < 1, `shot ${shot} drawn 1.2 s: ${arrows()} arrows left, speed ${v.toFixed(1)} (full 32)`);
}
// half a second: (0.25 + 1) / 3 = 0.42 of full
s.press(70); F(30); s.release(70); F(1);
{ const v = speed(); ok(arrows() === 6 && v > 11 && v < 16, `drawn 0.5 s: speed ${v.toFixed(1)} (about 13)`); }
F(60);
// the right button (tessvm's $MOUSE_BUTTONS 2) draws it as well
s.poke('$M_LOCK', 1);
s.poke('$MOUSE_BUTTONS', 2); F(70); s.poke('$MOUSE_BUTTONS', 0); F(60);
ok(arrows() === 5, `the right button held 1.2 s and let go: ${arrows()} arrows left`);
// a screen opened while drawing lets the string go without a shot
s.press(70); F(40); s.as('pen', () => s.fn.uiOpen(1)); F(2); s.release(70); F(2); s.as('pen', () => s.fn.uiClose()); F(30);
ok(arrows() === 5 && s.peek('drawId') === 0, `the inventory opened while drawing: no shot (${arrows()} left)`);
console.log(fails ? fails + ' FAILED' : 'all ok');
