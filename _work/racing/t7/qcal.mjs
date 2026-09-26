// qualifying calibration: each AI car's real best lap (arcade, no wear) vs the
// ideal lap from its speed profile. usage: node t7/qcal.mjs trk secs
import { createSim } from '../sim.mjs';
const [trk = 1, secs = 300] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; wx = 1; gfx = 1; lapSel = 4; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
for (let f = 0; f < secs * fps; f++) s.frame();
const best = g('caBest').slice(0, 8);
const ideal = [];
for (let c = 1; c <= 8; c++) { g(`speedProfile(caGrip[${c - 1}], caTop[${c - 1}]); lapIdeal();`); ideal.push(+g('oLap')); }
const skill = g('caSkill').slice(0, 8);
const r = best.map((b, i) => (b > 0 ? b / ideal[i] * skill[i] : NaN));
console.log('trk', trk, 'best', best.map(v => (+v).toFixed(1)).join(' '));
console.log('ideal', ideal.map(v => v.toFixed(1)).join(' '));
console.log('best/ideal*skill', r.map(v => v.toFixed(3)).join(' '), 'mean AI', (r.slice(1).filter(x => x > 0).reduce((a, b) => a + b, 0) / r.slice(1).filter(x => x > 0).length).toFixed(3));
