// time renderWorld in the node sim over a race (a structural cost proxy):
// node t8/rtime.mjs trk gfx frames   (RSRC=other/src for another build)
import { createSim } from '../sim.mjs';
const [trk = 1, gfx = 2, frames = 400] = process.argv.slice(2).map(Number);
let seed = 99; Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = ${gfx}; gfxSel = ${gfx}; selTrk = ${trk}; applyWeather(); doStartRace();`);
let t = 0, n = 0, q = 0, calls = 0;
s.R.tAcc = (d) => { t += d; n++; };
g(`renderWorld = (function (f) { return function () { const a = performance.now(); f(); R.tAcc(performance.now() - a); }; })(renderWorld)`);
g(`drawScn = (function (f) { return function (o, h) { R.nScn = (R.nScn || 0) + 1; f(o, h); }; })(drawScn)`);
for (let i = 0; i < frames; i++) { s.frame(); if (i > 60) g('camCar = 2'); q += +g('drawnQuads'); }
console.log(`trk ${trk} gfx ${gfx}: ${(t / n).toFixed(3)} ms/render over ${n}, quads/frame ${(q / frames).toFixed(0)}, drawScn/frame ${((s.R.nScn || 0) / n).toFixed(0)}`);
