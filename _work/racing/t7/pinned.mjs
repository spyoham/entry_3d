// v3.1: an AI car wedged nose-first against a wall is back racing within seconds
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g('rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = 1; buildTrack(1); startRace();');
g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
for (let f = 0; f < 400; f++) s.frame();
// car 3 into the wall beside a walled segment, nose 60 degrees into it, stopped
const seg = +g('(()=>{ let i = caSeg[2]; for (let k = 0; k < 60; k++) { const q = (i - 1 + k) % NSEG; if (sgHW[q] > 0) return q + 1; } return i; })()');
g(`(()=>{ const i = ${seg} - 1, w = sgW[i] - 0.9; caX[2] = sgX[i] + sgNX[i] * w; caZ[2] = sgZ[i] + sgNZ[i] * w; caY[2] = sgY[i]; caSeg[2] = ${seg};
    caYaw[2] = Math.atan2(sgDX[i], sgDZ[i]) * 180 / Math.PI + 60; caVX[2] = 0; caVZ[2] = 0; caYR[2] = 0; caSpd[2] = 0; caDmg[2] = 1; caWing[2] = 1; })()`);
let back = -1;
for (let f = 0; f < 300; f++) { s.frame(); if (process.env.DBG && f % 5 == 0 && back < 0) console.log(f / 10, g("[caSpd[2].toFixed(1), caStkT[2].toFixed(1), caStuck[2].toFixed(1), caOff[2].toFixed(1), caThr[2], caBrk[2].toFixed(1), caSteer[2].toFixed(2), caSurf[2], raceState, scOn, vscOn, caLC[2], aiVlim[2].toFixed(1), caPowD[2], caFuel[2].toFixed(1), caDNF[2], caMisT[2].toFixed(1), caBlue[2]].join(\" \")")); if (back < 0 && Math.abs(+g("caSpd[2]")) > 15) back = f / 10; }
const ok = back >= 0 && back < 12;
console.log(`${ok ? 'PASS' : 'FAIL'} wedged car racing again (over 54 km/h) after ${back} s; lap ${g('caLap[2]')}, seg ${g('caSeg[2]')} (was ${seg})`);
if (!ok) process.exitCode = 1;
