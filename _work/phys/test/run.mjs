// Run a scene in Node (the same program through the JS backend), print what it measures.
//   node test/run.mjs scene mode seconds [every] [png-prefix] [K=V ...]
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const kv = Object.fromEntries(a.filter(x => /^\w+=/.test(x)).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const [scene, mode, secs, every, png] = a.filter(x => !/^\w+=/.test(x));
const s = createSim({ consts: kv });
s.frame();
s.poke('running', 0);
const F = s.fn;
s.as('pen', () => { F.sceneLoad(Number(scene)); F.setMode(Number(mode)); F.stepPlan(); });
const frames = Math.round(Number(secs || 1) * 30), ev = Number(every || 10);
const t0 = performance.now();
console.log('dtAcc', s.peek('dtAcc'), 'stepsFrame', s.peek('stepsFrame'), 'stepH', s.peek('stepH'), 'nT', s.peek('nT'), 'nN', s.peek('nN'), 'nF', s.peek('nF'));
for (let f = 1; f <= frames; f++) {
    s.as('pen', () => { F.stepPlan(); for (let k = 0; k < s.peek('stepsFrame'); k++) F.stepAll(); });
    if (f % ev === 0 || f === frames) {
        s.as('pen', () => { F.energy(); F.sceneText(); });
        const P = s.peek;
        console.log(`t ${P('simT').toFixed(3)} E ${P('eTot').toFixed(5)} (k ${P('eKin').toFixed(4)} p ${P('ePot').toFixed(4)} el ${P('eElastic').toFixed(4)}) nC ${P('nC')} | ${P('mText')}`);
        if (png) { s.as('pen', () => F.render()); await s.png(`${png}_${String(f).padStart(4, '0')}.png`); }
    }
}
console.log('ms', (performance.now() - t0).toFixed(0), 'cg/step', (s.peek('cgSum') / s.peek('stepN')).toFixed(1), 'contact rounds/step', (s.peek('itSum') / s.peek('stepN')).toFixed(1));
