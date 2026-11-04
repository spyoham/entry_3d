// The checks against theory, in Node (the same program): the hanging bar (scene 11), the
// box that turns over (12), the box sliding down a slope (13), the beam (7) - each in both modes.
//   node test/verify.mjs
import { createSim } from '../sim.mjs';

function run(scene, mode, secs, poke = {}) {
    const s = createSim({ consts: {} });
    s.frame(); s.poke('running', 0);
    const F = s.fn;
    s.as('pen', () => { F.sceneLoad(scene); F.setMode(mode); });
    for (const [k, v] of Object.entries(poke)) s.poke(k, v);
    for (let f = 0; f < Math.round(secs * 30); f++) s.as('pen', () => { F.stepPlan(); for (let k = 0; k < s.peek('stepsFrame'); k++) F.stepAll(); });
    s.as('pen', () => { F.energy(); F.sceneText(); });
    return s;
}
const g = 9.81;
const bar = (m) => { const s = run(11, m, 3); return `${s.peek('mText')}  (이론: 처음 ${(1000 * g * 0.36 / 1e5 * 1000).toFixed(2)} mm, ${(2 * 0.6 / 10).toFixed(4)} s, 멈추면 ${(1000 * g * 0.36 / 2e5 * 1000).toFixed(2)} mm)`; };
const dzh = (m) => run(12, m, 4).peek('mText') + '  (오일러 방정식 RK4 1e-5 s: 1.2762 s, 3.8285 s, 에너지 16.61645)';
const slope = (m) => run(13, m, 1).peek('mText') + `  (이론 g(sin30 - 0.3 cos30) = ${(g * (0.5 - 0.3 * Math.cos(Math.PI / 6))).toFixed(4)})`;
const beam = (m) => run(7, m, 3).peek('mText');
for (const [name, f] of [['막대', bar], ['자네베코프', dzh], ['경사면', slope], ['외팔보', beam]]) {
    for (const m of [1, 2]) console.log(name, m === 1 ? '정확' : '빠름', '|', f(m));
}
