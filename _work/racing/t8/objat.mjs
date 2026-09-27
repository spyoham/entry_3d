// which scenery objects paint a given pixel of a shot (sim stage coords)
import { createSim } from '../sim.mjs';
const o = JSON.parse(process.argv[2]);
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = 3; gfxSel = 3; selTrk = ${o.trk}; applyWeather(); doStartRace();`);
for (let i = 0; i < 60; i++) s.frame();
g('photoEnter()');
if (o.exec) g(o.exec);
const [x, y, z, yaw, pitch, fov] = o.cam;
g(`phX = ${x}; phY = ${y}; phZ = ${z}; phX0 = ${x}; phZ0 = ${z}; phYaw = ${yaw}; phPitch = ${pitch}; phFov = ${fov}; phHelp = 0; actKey = 0`);
const hits = new Set();
g(`drawScn = (function (f) { return function (ob, hi) { R.curObj = ob; f(ob, hi); R.curObj = 0; }; })(drawScn)`);
const px = s.pixels; const W = 480;
let last = null;
s.R.onFill = () => {};
// sample the pixel after each object
g(`drawScn = (function (f) { return function (ob, hi) { f(ob, hi); R.probe(ob); }; })(drawScn)`);
let prev = null;
s.R.probe = (ob) => { const k = ((135 - o.py) * W + (o.px + 240)) * 3; const c = [px[k], px[k + 1], px[k + 2]].join(','); if (c !== prev) hits.add(ob); prev = c; };
g('photoStep()');
for (const ob of hits) console.log('obj', ob, ['scT', 'scX', 'scY', 'scZ', 'scK', 'scKY', 'scKZ', 'scOf', 'scRa', 'scRb', 'scLod'].map(n => n + '=' + (+g(`${n}[${ob - 1}]`)).toFixed(1)).join(' '));
