// when and where do cars collect track-limit strikes? (realistic, player = AI)
import { createSim } from '../sim.mjs';
const [trk = 4, secs = 240] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; wx = 1; gfx = 1; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); setupRace(${trk}, 1);`);
if (+g('raceState') === 9) { g('endQuali()'); g('startGrid(1)'); }
if (process.env.NOPERS) g('drvAgg = drvAgg.map(()=>0.5); drvDef = drvDef.map(()=>0); drvErr = drvErr.map(()=>0);');
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g(`maybeSC = function(){}`);
let prev = g('caTL').slice(0, 8).map(Number);
const why = {};
for (let f = 0; f < secs * fps; f++) {
    s.frame();
    if (+g('raceState') === 3) g('limitsStep()');
    const tl = g('caTL').slice(0, 8).map(Number);
    for (let c = 0; c < 8; c++) if (tl[c] > prev[c]) {
        const seg = g('caSeg')[c], off = (+g('caOff')[c]).toFixed(1), w = (+g('sgW')[seg - 1]).toFixed(1), cv = (+g('sgCurv')[seg - 1]).toFixed(4);
        console.log(`t=${(+g('raceT')).toFixed(1)} car ${c + 1} strike ${tl[c]} seg ${seg} off ${off} w ${w} curv ${cv} surf ${g('caSurf')[c]} spd ${(+g('caSpd')[c]).toFixed(0)} dmg ${(+g('caDmg')[c]).toFixed(2)} mis ${(+g('caMisT')[c]).toFixed(1)}`);
    }
    prev = tl;
}
console.log('strikes', g('caTL').slice(0, 8).join(','), 'laps', g('caLap').slice(0, 8).join(','));
