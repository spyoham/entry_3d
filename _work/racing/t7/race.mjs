// v7 race smoke test in the node sim: the player's car is driven by the AI.
// usage: node t7/race.mjs trk rules(1|2) secs [wx] [gfx] [laps(lapSel)] [mode]
import { createSim } from '../sim.mjs';
const [trk = 1, rules = 1, secs = 60, wx = 1, gfx = 2, lapSel = 2, mode = 1] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = ${rules}; wx = ${wx}; gfx = ${gfx}; lapSel = ${lapSel}; gMode = ${mode}; applyWeather();`);
g(`selTrk = ${trk}; buildTrack(${trk})`);
g(`doStartRace()`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const st = { off: 0, n: 0, maxState: {}, pits: 0, stops: 0 };
let lastState = -1;
const t0 = Date.now();
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    const rs = g('raceState');
    if (rs !== lastState) { console.log(`t=${(f / fps).toFixed(1)} state ${lastState} -> ${rs}`); lastState = rs; }
    if (rs === 10) { g('startGrid(selCar)'); }        // qualifying results -> the grid
    if (rs === 5 && f % 50 === 0) { /* done */ }
    if (rs === 3 && f % (fps * 10) === 0) {
        const c = g('caLap').slice(0, 8), p = g('caPit').slice(0, 8), w = g('caWear').slice(0, 8), ty = g('caTy').slice(0, 8);
        console.log(`t=${(f / fps).toFixed(0)} laps ${c.join(',')} pit ${p.join(',')} wear ${w.map(v => v.toFixed(2)).join(',')} ty ${ty.join(',')} wetL ${(+g('wetL')).toFixed(2)} sc ${g('scOn')} spd1 ${(+g('caSpd')[0]).toFixed(1)}`);
    }
}
console.log('wall', Date.now() - t0, 'ms; state', g('raceState'), 'raceT', (+g('raceT')).toFixed(1), 'ranks', g('caRank').slice(0, 8).join(','));
console.log('pen', g('caPen').slice(0, 8).join(','), 'TL', g('caTL').slice(0, 8).join(','), 'stops', g('caStops').slice(0, 8).join(','), 'dmg', g('caDmg').slice(0, 8).map(v => (+v).toFixed(2)).join(','));
console.log('bestLaps', g('caBest').slice(0, 8).map(v => (+v).toFixed(2)).join(','), 'quali', g('caQT').slice(0, 8).map(v => (+v).toFixed(2)).join(','), 'grid', g('caGrid').slice(0, 8).join(','));
console.log('texts', s.R.snd, 'radio', g('radio'), 'msg', g('msg'));
await s.png(new URL(`./race_${trk}_${rules}.png`, import.meta.url).pathname);
