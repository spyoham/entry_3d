// (v2.6.1) the game menu (P): the render distance and the mouse speed go up on the right half of
// their buttons, down on the left (v2.6 moved them to x -200 .. -10 and up was x > 0: never), and the
// picture's settings on the right switch.   usage: node test/pausemenu.mjs
import { createSim } from '../sim.mjs';
const sim = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const run = (k) => { for (let i = 0; i < k; i++) sim.frame(); };
let n = 0; while (sim.peek('gState') !== 2 && n < 5000) { run(1); n++; }
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const click = (x, y) => { sim.mouse.x = x; sim.mouse.y = y; sim.click(); run(2); };
run(10);
sim.poke('uiMode', 6); sim.poke('autoView', 0); sim.poke('viewWant', 24); sim.as('pen', () => sim.fn.setView(24)); run(2);
const v0 = sim.peek('viewWant'), s0 = sim.peek('sens');
click(-40, 45); ok(sim.peek('viewWant') === v0 + 4, `the render distance's right half: up (${v0} -> ${sim.peek('viewWant')})`);
click(-170, 45); ok(sim.peek('viewWant') === v0, `its left half: down (${sim.peek('viewWant')})`);
click(-40, 23); ok(Math.abs(sim.peek('sens') - (s0 + 0.1)) < 1e-9, `the mouse speed's right half: up (${s0} -> ${sim.peek('sens')})`);
click(-170, 23); ok(Math.abs(sim.peek('sens') - s0) < 1e-9, `its left half: down (${sim.peek('sens')})`);
const f0 = sim.peek('fogOn'); click(100, 23); ok(sim.peek('fogOn') === 1 - f0, 'fog switches');
const a0 = sim.peek('autoView'); click(100, 45); ok(sim.peek('autoView') === 1 - a0, 'the render distance kept / followed switches');
console.log(fails ? fails + ' FAILED' : 'all ok');
