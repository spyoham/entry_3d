// per-car trace of a realistic start: seg/offset/speed every `every` s
import { createSim } from '../sim.mjs';
const o = Object.assign({ trk: 2, from: 8, to: 16, every: 0.5, fps: 10, cars: [1,2,3,4,5,6,7,8] }, JSON.parse(process.argv[2] || '{}'));
const s = createSim({ fps: o.fps }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${o.trk}; buildTrack(${o.trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
for (let f = 0; f < 200 && +g('raceState') !== 3; f++) s.frame();
let t = 0;
while (t < o.to) {
    s.frame(); t = +g('raceT');
    if (t >= o.from && Math.abs(t / o.every - Math.round(t / o.every)) < 0.05) {
        const d = JSON.parse(g(`JSON.stringify([caSeg, caOff, caSpd, aiVlim, caSurf, caStuck, caThr, caBrk].map(a => a.slice(0, 8)))`));
        console.log(t.toFixed(1).padStart(5), o.cars.map(c => { const i = c - 1; return `${c}:${d[0][i]}/${d[1][i].toFixed(1)}/${d[2][i].toFixed(0)}v${Math.min(99, d[3][i]).toFixed(0)}${d[4][i] >= 2 ? '*' : ''}${d[6][i] > 0.5 ? 'T' : d[7][i] > 0 ? 'B' : ''}`; }).join(' '));
    }
}
