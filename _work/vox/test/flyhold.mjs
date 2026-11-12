// (v2.7.4) creative flight: Space and Shift together hold still in the air: node test/flyhold.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
s.poke('gameMode', 1); s.poke('flying', 1); s.poke('py', s.peek('py') + 30); s.poke('pvy', 0); F(30);
const y0 = s.peek('py');
s.press(32); s.press(16); F(120);
const y1 = s.peek('py');
ok(Math.abs(y1 - y0) < 0.2 && s.peek('flying') === 1, `Space + Shift: still (${y0.toFixed(2)} -> ${y1.toFixed(2)})`);
s.release(16); F(60);
ok(s.peek('py') > y1 + 3, `Space alone: up (${s.peek('py').toFixed(2)})`);
s.release(32); s.press(16); const y2 = s.peek('py'); F(60);
ok(s.peek('py') < y2 - 3, `Shift alone: down (${s.peek('py').toFixed(2)})`);
s.release(16);
console.log(fails ? fails + ' FAILED' : 'all ok');
