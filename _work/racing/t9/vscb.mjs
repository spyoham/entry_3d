// v30 B repeated: how often does the (AI-driven) player get a penalty under the VSC, and why
import { createSim } from '../sim.mjs';
const N = +(process.argv[2] || 20);
let pen = 0;
for (let r = 0; r < N; r++) {
    const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = 5; buildTrack(5); doStartRace();`);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    g(`globalThis.__P = []; const _p = penalise; penalise = function(c, secs, why){ if (c == 1) { const o = srtI[caRank[0]]; __P.push([+raceT.toFixed(1), why.slice(9, 25), "me", caSeg[0], +caU[0].toFixed(2), +caOff[0].toFixed(1), +caSpd[0].toFixed(1), "car", o, caSeg[o-1], +caU[o-1].toFixed(2), +caOff[o-1].toFixed(1), +caSpd[o-1].toFixed(1), "pit", caPit[o-1], "surf", caSurf[o-1], "yel", aiYel[o-1]]); } _p(c, secs, why); };`);
    g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
    for (let f = 0; f < 120 && +g('raceState') !== 3; f++) s.frame();
    for (let f = 0; f < 400; f++) s.frame();
    g('vscOn = 0; scOn = 0; scCar = 0; deployVSC()');
    for (let f = 0; f < 500; f++) s.frame();
    const P = JSON.parse(g('JSON.stringify(__P)'));
    if (P.length) { pen++; console.log('run', r, JSON.stringify(P)); }
}
console.log('penalised in', pen, 'of', N);
