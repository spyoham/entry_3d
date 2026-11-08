// random play: node test/stress.mjs [seed] [frames]
import { createSim } from '../sim.mjs';
const seed = Number(process.argv[2] || 777), N = Number(process.argv[3] || 4000);
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
s.poke('tday', 0.55);   // dusk: the dark comes
let rs = 1; const R = () => (rs = (rs * 48271) % 2147483647) / 2147483647;
const keys = [87, 65, 83, 68, 32, 16, 70, 81, 69, 49, 50, 51, 82];
const t0 = Date.now();
const stats = { kills: 0, deaths: 0, ui: 0 };
for (let i = 0; i < N; i++) {
  if (i % 20 === 0) {
    s.keys.clear();
    for (const k of keys) if (R() < (k === 69 ? 0.004 : k === 70 ? 0.15 : k === 32 ? 0.3 : 0.2)) s.keys.add(k);
    s.mouse.down = R() < 0.7; if (R() < 0.3) s.poke('pitch', -40 - R() * 40);
    s.poke('mAccX', (R() - 0.5) * 80); s.poke('mAccY', (R() - 0.5) * 30);
    if (R() < 0.05) s.click();
  }
  if (s.peek('uiMode') !== 0 && R() < 0.05) { s.mouse.x = (R() - 0.5) * 160; s.mouse.y = (R() - 0.5) * 160; s.click(); stats.ui++; }
  if (s.peek('uiMode') === 7) { stats.deaths++; s.as('pen', () => s.fn.respawn()); }
  if (s.peek('uiMode') === 6 && R() < 0.2) s.poke('uiMode', 0);
  try { s.frame(); } catch (e) { console.log('frame', i, 'ERROR', e.message); console.log(e.stack.split('\n').slice(1, 6).join('\n')); process.exit(1); }
}
console.log('ok', N, 'frames in', Date.now() - t0, 'ms; hp', s.peek('hp'), 'food', s.peek('food'), 'hostile', s.peek('nHostile'), 'passive', s.peek('nPassive'), 'dark', s.peek('dark'), JSON.stringify(stats), 'pos', s.peek('px').toFixed(1), s.peek('py').toFixed(1), s.peek('pz').toFixed(1));
console.log('inv', s.peek('INVI').map((id, i) => id ? `${id}x${s.peek('INVN')[i]}` : '').filter(Boolean).join(' '));
