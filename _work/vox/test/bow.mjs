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
for (let shot = 1; shot <= 3; shot++) {
  s.press(70); F(2); s.release(70); F(60);
  ok(arrows() === 10 - shot, `shot ${shot}: ${arrows()} arrows left, ${flying()} of the player's arrows out`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');
