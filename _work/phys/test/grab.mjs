// Grabbing in Node: scene 6, take hold of the big jelly ball at its top and pull the pointer
// up and to the side; the ball's middle should follow.  node test/grab.mjs [mode] [png]
import { createSim } from '../sim.mjs';
const mode = Number(process.argv[2] || 2), png = process.argv[3];
const s = createSim({ consts: {} });
s.frame(); s.poke('running', 0);
const F = s.fn;
s.as('pen', () => { F.sceneLoad(6); F.setMode(mode); F.stepPlan(); });
const n = s.peek('stepsFrame');
const mid = () => { const P = s.peek('PY'), X = s.peek('PX'), a = s.peek('SBN0')[0], b = s.peek('SBN1')[0]; let x = 0, y = 0; for (let i = a - 1; i < b; i++) { x += X[i]; y += P[i]; } return [x / (b - a + 1), y / (b - a + 1)]; };
for (let f = 0; f < 15; f++) s.as('pen', () => { for (let k = 0; k < n; k++) F.stepAll(); });
s.as('pen', () => F.render());
// the top node of the ball on the stage
const SX = s.peek('SX'), SY = s.peek('SY'), PY = s.peek('PY'), a = s.peek('SBN0')[0], b = s.peek('SBN1')[0];
let top = a; for (let i = a; i <= b; i++) if (PY[i - 1] > PY[top - 1]) top = i;
const [sx, sy] = [SX[top - 1], SY[top - 1]];
s.as('pen', () => F.grabPick(sx, sy));
console.log('picked', s.peek('grabN'), 'nodes; ball middle before', mid().map(v => v.toFixed(3)));
for (let f = 1; f <= 45; f++) {
    s.poke('grabSX', sx + f * 1.5); s.poke('grabSY', sy + f * 2);
    s.as('pen', () => { F.render(); for (let k = 0; k < n; k++) F.stepAll(); });
    if (f % 15 === 0) { s.as('pen', () => F.energy()); console.log('frame', f, 'middle', mid().map(v => v.toFixed(3)), 'E', s.peek('eTot').toFixed(2), 'el', s.peek('eElastic').toFixed(2)); }
}
if (png) { s.as('pen', () => F.render()); await s.png(png); }
s.poke('grabN', 0);
for (let f = 0; f < 30; f++) s.as('pen', () => { for (let k = 0; k < n; k++) F.stepAll(); });
console.log('let go, 1 s later middle', mid().map(v => v.toFixed(3)));
