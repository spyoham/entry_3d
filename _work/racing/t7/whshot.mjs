// screenshots of the v2.6 tyre HUD: realistic race, chase and onboard, with the check panel open
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 2);
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 3; lapSel = 2; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); startRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
for (let f = 0; f < 1300; f++) {
    s.frame();
    const rs = +g('raceState');
    if (rs === 9 && +g('raceT') > 3) g('endQuali()');
    if (rs === 10) g('startGrid(selCar)');
    if (rs === 3 && +g('raceT') > 55) break;
}
await s.png(new URL('./wh_a.png', import.meta.url).pathname);
g('whShow = 1; camMode = 1;'); s.frame(); s.frame();
await s.png(new URL('./wh_b.png', import.meta.url).pathname);
console.log(g('whAdv'), g('whSt.join(",")'), g('caPitch[0].toFixed(2)'), g('caRoll[0].toFixed(2)'));
