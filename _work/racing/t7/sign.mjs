// signs of steering, yaw, body roll and pitch (a quick look)
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g('rules = 0; gMode = 4; selTrk = 1; applyWeather(); doStartRace();');
g('playerInput = function(){ caThr[0] = raceT > 6 ? 0 : 1; caBrk[0] = raceT > 6 ? 1 : 0; caSteer[0] = raceT > 3 && raceT < 5 ? 1 : 0; caHB[0] = 0; }');
while (+g('raceState') !== 3) s.frame();
for (let f = 0; f < 240; f++) { s.frame(); if (f % 15 == 0) console.log(g('[raceT.toFixed(1), caYaw[0].toFixed(1), caYR[0].toFixed(1), caRoll[0].toFixed(2), caPitch[0].toFixed(2), caSpd[0].toFixed(1)].join(" ")')); }
