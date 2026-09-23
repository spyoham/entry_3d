globalThis.__jsPatch = (js) => js.replace('function markSolid(x1,x2){', 'function markSolid(x1,x2){R.log(x1,x2,sLo.slice(),sHi.slice());');
const { createSim } = await import('./sim.mjs');
let n = 0;
const sim = await createSim();
sim.R.log = (a, b, lo, hi) => { if (n++ < 12) console.log('mark', a.toFixed(1), b.toFixed(1), '|', lo.map((v, i) => `[${v.toFixed(0)},${hi[i].toFixed(0)}]`).join(' ')); };
sim.frame(); sim.frame();
