// time buildTrack (doStartRace) in the node sim: node t8/ltime.mjs trk gfx
import { createSim } from '../sim.mjs';
const [trk = 1, gfx = 3] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = ${gfx}; gfxSel = ${gfx}; selTrk = ${trk}; applyWeather();`);
const a = performance.now(); g('doStartRace()'); const b = performance.now();
let t1 = 0, t2 = 0;
for (const f of ['stripReach', 'scGround']) { try { g(`${f} = (function (f) { return function () { const a = performance.now(); f(); R.t_${f} = (R.t_${f} || 0) + performance.now() - a; }; })(${f})`); } catch (e) { } }
g('doStartRace()');
console.log(`trk ${trk}: doStartRace ${(b - a).toFixed(0)} ms; stripReach ${(s.R.t_stripReach || 0).toFixed(0)} ms, scGround ${(s.R.t_scGround || 0).toFixed(0)} ms, objects ${g('scN')}`);
