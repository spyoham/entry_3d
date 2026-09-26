// v2.6 per-wheel tyres in a realistic race, every car driven by the AI:
// the player's four wheels (temperature C / wear %) over time and, at the
// end, the field's temperatures, wear and grip.
// usage: node t7/wheels.mjs [trk] [secs] [wx] [lapSel]
import { createSim } from '../sim.mjs';
const [trk = 1, secs = 240, wx = 1, lapSel = 2] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = ${wx}; gfx = 2; lapSel = ${lapSel}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const W = (c) => g(`(()=>{ const b = ${c} * 4, o = []; for (let k = 0; k < 4; k++) o.push(Math.round(whT[b + k]) + '/' + Math.round(whW[b + k] * 100)); return o.join(' '); })()`);
let hot = 0, cold = 0, n = 0;
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    const rs = +g('raceState');
    if (rs === 10) g('startGrid(selCar)');
    if (rs === 9 && +g('raceT') > 3) g('endQuali()');
    if (rs === 3) {
        const [h, cl] = JSON.parse(g(`(()=>{ let h = 0, c = 0; for (let i = 0; i < nCars * 4; i++) { const t = caTy[Math.floor(i / 4)] - 1; if (whT[i] > tyThi[t]) h++; if (whT[i] < tyTlo[t]) c++; } return JSON.stringify([h, c]); })()`));
        hot += h; cold += cl; n += +g('nCars') * 4;
    }
    if (rs === 3 && f % (fps * 10) === 0) {
        console.log(`t=${(f / fps).toFixed(0).padStart(4)} lap ${g('caLap[0]')} ${g('tyName[caTy[0]-1]').padEnd(6)} FL FR RL RR ${W(0)}  | car2 ${W(1)}  axF ${(+g('caAxF[0]')).toFixed(3)} axR ${(+g('caAxR[0]')).toFixed(3)} wk ${(+g('caWK[0]')).toFixed(3)} wetL ${(+g('wetL')).toFixed(2)}`);
    }
}
console.log(`state ${g('raceState')}; share of wheel-time over the window ${(100 * hot / n).toFixed(1)} %, under it ${(100 * cold / n).toFixed(1)} %`);
console.log('best laps', g('caBest').slice(0, 8).map(v => (+v).toFixed(2)).join(','), 'stops', g('caStops').slice(0, 8).join(','));
