// flags text slots rewritten on every frame of a static screen (slot collisions)
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
for (let i = 0; i < 3; i++) s.frame();
const check = (label) => {
    for (let i = 0; i < 12; i++) s.frame();
    const v0 = g('txV').slice();
    for (let i = 0; i < 4; i++) s.frame();
    const v1 = g('txV');
    const hot = [];
    v1.forEach((v, i) => { if (v - v0[i] >= 4) hot.push(i + 1 + ':' + g('txS')[i]); });
    console.log(label.padEnd(10), hot.length ? 'REWRITTEN EVERY FRAME ' + hot.join(', ') : 'ok');
};
for (let m = 1; m <= 9; m++) { g(`menuSel = ${m}`); check('menu ' + m); }
g('raceState = ST_CARSEL'); check('carsel');
g('raceState = ST_TRKSEL'); check('trksel');
g('menuSel = 1'); g('raceState = ST_MENU'); g('startRace()'); g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
check('count');
