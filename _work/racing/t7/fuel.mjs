// v3.0 fuel: burn per lap against the load, the AI's lift-and-coast share,
// brake temperatures; every car on the AI (skip qualifying and formation)
// usage: node t7/fuel.mjs [trk] [lapSel] [secs]
import { createSim } from '../sim.mjs';
const [trk = 5, lapSel = 3, secs = 400] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = ${lapSel}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); startRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
let lc = 0, n = 0, bmax = 0, bsum = 0;
console.log('laps', g('nLaps'), 'load', (+g('caFuel[0]')).toFixed(1), 'R', (+g('caFuelR[0]')).toFixed(4), 'estLap', (+g('estLap')).toFixed(1), 'raceDur', (+g('raceDur')).toFixed(0));
for (let f = 0; f < secs * 10; f++) {
    s.frame();
    if (+g('raceState') === 3) {
        const v = JSON.parse(g('JSON.stringify([caLC.slice(1,8).reduce((a,b)=>a+b,0), caBrT[0]])'));
        lc += v[0]; n += 7; bmax = Math.max(bmax, v[1]); bsum += v[1];
    }
    if (f % 600 === 0) console.log((f / 10).toFixed(0), 'lap', g('caLap.slice(0,8).join(",")'), 'fuel', g('caFuel.slice(0,8).map(v=>v.toFixed(1)).join(",")'), 'perLap', g('caFuelL.slice(0,8).map(v=>v.toFixed(1)).join(",")'), 'brT', g('caBrT.slice(0,4).map(Math.round).join(",")'));
    if (+g('raceState') === 5 && f % 50 === 0) { if (+g('caFin.slice(0,8).filter(x=>x>0).length') >= 8) break; }
}
console.log('AI lift-and-coast share', (100 * lc / n).toFixed(1), '%; player brake mean', Math.round(bsum / (n / 7)), 'max', Math.round(bmax));
console.log('best', g('caBest.slice(0,8).map(v=>v.toFixed(1)).join(",")'), 'fuel left', g('caFuel.slice(0,8).map(v=>v.toFixed(1)).join(",")'), 'DNF', g('caDNF.slice(0,8).join("")'), 'fail', g('caFail.slice(0,8).join("")'));
