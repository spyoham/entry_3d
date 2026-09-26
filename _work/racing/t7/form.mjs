// v3.0 formation lap: the field goes round in grid order and stops in its boxes
// usage: node t7/form.mjs [trk] [aiPlayer 1|0]
import { createSim } from '../sim.mjs';
const [trk = 1, aiP = 1] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 2; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
if (aiP) g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g('endQuali()');
g('startGrid(selCar)');
for (let f = 0; f < 3000; f++) {
    s.frame();
    const rs = +g('raceState');
    if (f % 50 === 0 || rs !== 14) console.log((f / 10).toFixed(0), 'st', rs, 'formT', (+g('formT')).toFixed(0), 'spd', g('caSpd.slice(0,8).map(v=>Math.round(v)).join(",")'), 'D', g('caFormD.slice(0,8).map(v=>Math.round(v)).join(",")'), 'ok', g('caFormOk.slice(0,8).join("")'), 'dmg', g('caDmg.slice(0,8).map(v=>v.toFixed(1)).join(",")'), 'grid', g('caGrid.slice(0,8).join("")'));
    if (rs !== 14) break;
}
