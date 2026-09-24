// realistic-rule scenarios in the node sim (player driven by the AI, no qualifying)
// usage: node t7/sim2.mjs sc|rain|pits trk secs
import { createSim } from '../sim.mjs';
const [what = 'sc', trkS = '4', secsS = '200'] = process.argv.slice(2);
const trk = +trkS, secs = +secsS;
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
const laps = what === 'pits' ? 4 : 3;       // lapSel: 4 = 10 laps
const wx = what === 'rain' ? 3 : 1;
g(`rules = 2; wx = ${wx}; gfx = 2; lapSel = ${laps}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk});`);
// skip qualifying: straight to the grid
g(`setupRace(${trk}, 1)`);
if (+g('raceState') === 9) { g('endQuali()'); g('startGrid(1)'); }
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
if (what === 'rain') g('wxPlanA = 40; wxPlanB = 0;');
const L = (k, n = 8, d = 1) => g(k).slice(0, n).map(v => (+v).toFixed(d)).join(',');
let scSeen = 0, overtakes = 0, lastOrder = '';
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    const t = +g('raceT');
    if (what === 'sc' && !scSeen && t > 25) { g('deploySC()'); scSeen = 1; console.log('SC deployed at', t.toFixed(1)); }
    const sc = +g('scOn');
    if (sc > 0) {
        const ord = g('srtI').slice(0, 8).join(',');
        if (lastOrder && ord !== lastOrder) overtakes++;
        lastOrder = ord;
    } else lastOrder = '';
    if (f % (fps * 5) === 0) {
        const extra = what === 'sc' ? ` sc ${sc} scCar ${g('scCar')} gaps ${L('caGap', 8, 1)} spd ${L('caSpd', 8, 0)} scSpd ${(+g('caSpd')[8]).toFixed(0)}`
            : what === 'rain' ? ` rainI ${(+g('rainI')).toFixed(2)} wetL ${(+g('wetL')).toFixed(2)} ty ${g('caTy').slice(0, 8).join('')} pit ${g('caPit').slice(0, 8).join('')} wk ${L('caWK', 8, 2)}`
            : ` lap ${g('caLap').slice(0, 8).join(',')} ty ${g('caTy').slice(0, 8).join('')} wear ${L('caWear', 8, 2)} pit ${g('caPit').slice(0, 8).join('')} stops ${g('caStops').slice(0, 8).join('')}`;
        console.log(`t=${t.toFixed(0)} st ${g('raceState')}${extra}`);
    }
}
console.log('order changes while SC/restart:', overtakes, 'pen', L('caPen', 8, 0), 'stops', g('caStops').slice(0, 8).join(','), 'dmg', L('caDmg', 8, 2), 'radio', g('radio'));
