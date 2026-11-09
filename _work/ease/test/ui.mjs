// Press every control in Node and check the state answers (no exceptions, values change).
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { START: 11 } });
const run = (n = 3) => { for (let i = 0; i < n; i++) s.frame(); };
const P = s.peek;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const press = (x, y, n = 2) => { s.mouse.x = x; s.mouse.y = y; s.mouse.down = true; run(n); };
const move = (x, y, n = 2) => { s.mouse.x = x; s.mouse.y = y; run(n); };
const up = () => { s.mouse.down = false; run(2); };
const click = (x, y) => { press(x, y); up(); };
const btn = (k) => click(-220 + (k - 1) * 40, -125);
run(5);
ok(P('preN') === 11 && P('rig') === 1, 'starts at the font lab');
// slider A of WGHT: drag to the right end
const y1 = -17;
press(-150, y1); move(-110, y1); move(-100, y1); up();
ok(P('KEY')[0] > 0.9, 'slider A WGHT dragged to ' + P('KEY')[0].toFixed(2));
// slider B of SLNT row 3
const y3 = -17 - 2 * 13.5;
press(-50, y3); move(-90, y3); up();
ok(P('KEY')[7 + 2] < -0.8, 'slider B SLNT dragged to ' + P('KEY')[9].toFixed(2));
// toggle an axis tag (SQAR row 4)
const a0 = P('nAct'); click(-225, -17 - 3 * 13.5);
ok(P('nAct') === a0 + 1, 'tag SQAR switched on: n ' + a0 + ' -> ' + P('nAct'));
// manifold cycle through all four, rendering each
for (let k = 0; k < 4; k++) { btn(4); run(3); ok(true, 'manifold ' + P('fMt')); }
// eases: all 15
for (let k = 0; k < 15; k++) { btn(6); run(2); }
ok(P('easeK') === 4, 'ease cycled round to ' + P('easeK'));
// per-axis eases, click an ease chip
btn(7); ok(P('perAx') === 1, 'per axis on');
const e0 = P('EAX')[0]; click(60, y1); ok(P('EAX')[0] !== e0, 'axis ease chip ' + e0 + ' -> ' + P('EAX')[0]);
// 4 keys and the key page
btn(8); ok(P('nKeys') === 4, 'four keys'); click(-150, -5); ok(P('keyPage') === 1, 'key page C D');
press(-150, y1); move(-190, y1); up(); ok(P('KEY')[14] < -0.8, 'slider C WGHT ' + P('KEY')[14].toFixed(2));
// compare, pause, scrub
btn(9); ok(P('cmp') === 1, 'compare on');
press(-100, 8); move(0, 8); up(); ok(P('playing') === 0 && Math.abs(P('curT') - (0 + 226) / 296) < 0.01, 'scrubbed to ' + P('curT').toFixed(3));
btn(10); ok(P('playing') === 1, 'play again');
// the user's Bezier: set ease 15, drag a handle
s.poke('easeK', 15); s.poke('perAx', 0); s.poke('nKeys', 2); s.as('pen', () => s.fn.changed()); run(3);
ok(P('bzShown') === 1, 'handles shown');
const hx = 86 + 0.2 * 148, hy = 10 + (-0.35 + 0.45) / 1.9 * 86;
press(hx, hy); move(hx + 20, hy + 30); up();
ok(Math.abs(P('BZ')[0] - (0.2 + 20 / 148)) < 0.02, 'handle 1 x ' + P('BZ')[0].toFixed(3) + ' y ' + P('BZ')[1].toFixed(3));
// rotate the manifold view
const az = P('vAz'); press(160, -60); move(180, -50); up(); ok(P('vAz') !== az, 'view turned');
// word input
s.answers.push('Hello, 2026!'); btn(11); run(3); ok(P('WORD') === 'Hello, 2026!' && P('wordN') === 12, 'word ' + P('WORD'));
// every preset, a few frames each, both directions
for (let p = 1; p <= 12; p++) { s.as('pen', () => s.fn.preset(p)); s.poke('curT', 0.97); run(40); ok(true, 'preset ' + p + ' rev ' + P('rev')); }
// the 3D lab: turn key A, move key B, camera, size slider, models, place space
s.as('pen', () => s.fn.preset(12)); run(4);
const q0 = P('V').slice(320, 324).join(); const gx = P('GKX'), gy = P('GKY');
press(gx[0], gy[0]); move(gx[0] + 15, gy[0] + 5); move(gx[0] + 30, gy[0] + 10); up();
ok(P('V').slice(320, 324).join() !== q0, 'key A turned');
btn(11); ok(P('drag3') === 2, 'drag moves');
const p0 = P('V').slice(310, 313).join(); const gx2 = P('GKX'), gy2 = P('GKY');
press(gx2[1], gy2[1]); move(gx2[1] - 20, gy2[1] + 10); move(gx2[1] - 40, gy2[1] + 15); up();
ok(P('V').slice(310, 313).join() !== p0, 'key B moved ' + P('V').slice(310, 313).map(v => v.toFixed(2)));
const ca = P('cAz'); press(-200, 80); move(-170, 70); up(); ok(P('cAz') !== ca, 'camera turned');
press(140, -82); move(170, -82); up(); ok(P('K3')[0] !== 0, 'size A ' + P('K3')[0].toFixed(2));
btn(8); run(3); ok(P('model') === 2, 'box model'); btn(4); run(3); ok(P('posMode') === 2, 'box space');
btn(7); btn(9); run(30); ok(true, 'per factor + compare in the box');
press(gx2[1], gy2[1]); move(gx2[1] + 10, gy2[1]); up(); run(3);
btn(3); run(3); ok(P('rig') === 1, 'back to the font');
btn(12); ok(P('helpOn') === 1, 'help'); click(0, 0); ok(P('helpOn') === 0, 'help closed');
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
