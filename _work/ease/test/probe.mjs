import { createSim } from '../sim.mjs';
const s = createSim({ consts: { START: Number(process.argv[2] || 5) } });
for (let f = 0; f < 3; f++) s.frame();
const F = s.fn;
for (const t of [0, 0.25, 0.5, 0.75, 1]) {
  s.as('pen', () => F.evalFont(s.peek('fMt'), t));
  const a = s.peek('KT').map(v => v.toFixed(3)).join(' ');
  s.as('pen', () => F.evalFont(1, t));
  console.log(t, '|', a, '| R:', s.peek('KT').map(v => v.toFixed(3)).join(' '));
}
