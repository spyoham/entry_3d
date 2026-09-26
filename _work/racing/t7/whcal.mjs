// calibrate the wheel heat: mean temperature per wheel position over a
// race stint on each circuit (medium tyres, dry), every car on the AI
// usage: WH="whA=1;whB=0.3" node t7/whcal.mjs [secs]
import { createSim } from '../sim.mjs';
const secs = +(process.argv[2] || 150);
const out = [];
for (const trk of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    g(`rules = 2; wx = ${process.env.WX || 1}; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
    if (process.env.WH) g(process.env.WH);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    const sum = [0, 0, 0, 0], mx = [0, 0, 0, 0]; let n = 0, t0 = -1;
    for (let f = 0; f < 4000; f++) {
        s.frame();
        const rs = +g('raceState');
        if (rs === 9 && +g('raceT') > 3) g('endQuali()');
        if (rs === 10) g('startGrid(selCar)');
        if (rs === 3) {
            if (t0 < 0) t0 = f;
            if (f - t0 > 400) {     // after the first 40 s
                const v = JSON.parse(g(`(()=>{ const o = [0,0,0,0]; for (let c = 0; c < nCars; c++) for (let k = 0; k < 4; k++) o[k] += whT[c * 4 + k] / nCars; return JSON.stringify(o); })()`));
                v.forEach((x, k) => { sum[k] += x; mx[k] = Math.max(mx[k], x); }); n++;
            }
            if (f - t0 > secs * 10) break;
        }
    }
    out.push(`${String(g(`trkName[${trk - 1}]`)).padEnd(17)} mean FL FR RL RR ${sum.map(x => Math.round(x / n)).join(' ')}   field-mean peak ${mx.map(Math.round).join(' ')}   wear ${g('(()=>{let w=0;for(let c=0;c<nCars;c++)w+=caWear[c];return Math.round(100*w/nCars)})()')}%`);
}
console.log(out.join('\n'));
