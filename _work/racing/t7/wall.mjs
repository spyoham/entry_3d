// Speed lost against a wall: the player's car is put beside a barrier on
// Monaco at 216 km/h, full throttle, wheel straight, heading into the wall
// at a given angle; speed is read after 0.5 s and 1 s. fps changes how many
// physics steps that is (the loss should not depend on it).
// usage: node t7/wall.mjs [fps]
import { createSim } from '../sim.mjs';
const fps = +(process.argv[2] || 60);
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g('rules = 1; gMode = 4; paSel = 3; selTrk = 1; applyWeather(); doStartRace();');
// a walled straight ring
const seg = g('(()=>{ for (let i = 40; i < 460; i++) { if (sgHW[i-1] > 0 && Math.abs(sgCurv[i-1]) < 0.001 && Math.abs(sgCurv[i]) < 0.001 && Math.abs(sgCurv[i+2]) < 0.001) return i; } return 0; })()');
g('playerInput = function(){ caThr[0] = 1; caBrk[0] = 0; caSteer[0] = 0; caHB[0] = 0; caErsOn[0] = 0; }');
while (+g('raceState') !== 3) s.frame();
const trial = (angle) => {
    g(`(()=>{ const i = ${seg} - 1; const w = sgW[i] - 1.0; caX[0] = sgX[i] + sgNX[i] * w; caZ[0] = sgZ[i] + sgNZ[i] * w; caY[0] = sgY[i];
        const a = Math.atan2(sgDX[i], sgDZ[i]) * 180 / Math.PI + ${angle}; caYaw[0] = a; const v = 60;
        caVX[0] = Math.sin(a * Math.PI / 180) * v; caVZ[0] = Math.cos(a * Math.PI / 180) * v; caYR[0] = 0; caSeg[0] = ${seg}; caSpd[0] = v; })()`);
    const out = [];
    for (let f = 1; f <= fps; f++) { s.frame(); if (f === Math.round(fps / 2) || f === fps) out.push(Math.round(Math.hypot(+g('caVX')[0], +g('caVZ')[0]) * 3.6)); }
    return out;
};
console.log(`fps ${fps}, walled ring ${seg}; start 216 km/h, full throttle`);
for (const a of [0.5, 2, 5, 15, 30]) { const [h, f] = trial(a); console.log(`  ${String(a).padStart(4)} deg into the wall: ${h} km/h after 0.5 s, ${f} km/h after 1 s`); }
