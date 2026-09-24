// when do cars pick up damage? (realistic, player = AI)
import { createSim } from '../sim.mjs';
const [trk = 7, secs = 200, forceSC = 1] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 1; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); setupRace(${trk}, 1);`);
if (+g('raceState') === 9) { g('endQuali()'); g('startGrid(1)'); }
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
let prev = g('caDmg').slice(0, 8).map(Number), sc = 0;
const cnt = { lap1: 0, sc: 0, other: 0 };
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    const t = +g('raceT');
    if (forceSC && !sc && t > 40) { g('deploySC()'); sc = 1; }
    const d = g('caDmg').slice(0, 8).map(Number);
    for (let c = 0; c < 8; c++) if (d[c] > prev[c] + 0.001) {
        const k = +g('scOn') > 0 ? 'sc' : (+g('caLap')[c] <= 1 ? 'lap1' : 'other');
        cnt[k]++;
        console.log(`t=${t.toFixed(1)} car ${c + 1} +${(d[c] - prev[c]).toFixed(2)} sc ${g('scOn')} lap ${g('caLap')[c]} spd ${(+g('caSpd')[c]).toFixed(0)} surf ${g('caSurf')[c]}`);
    }
    prev = d;
}
console.log(cnt, 'final dmg', g('caDmg').slice(0, 8).map(v => (+v).toFixed(2)).join(','));
