// the player's pit stop: drive in (AI steering), limiter, stop, tyres, out
import { createSim } from '../sim.mjs';
const [trk = 4] = process.argv.slice(2).map(Number);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); setupRace(${trk}, 1);`);
if (+g('raceState') === 9) { g('endQuali()'); g('startGrid(1)'); }
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g(`maybeSC = function(){}`);
console.log('pit lane', g('pitA'), '->', g('pitE'), 'len', g('pitLen'), 'box0', g('pitBox0'), 'NSEG', 460, 'player box', g('caBox')[0]);
let asked = 0, last = -1;
for (let f = 0; f < 240 * fps; f++) {
    s.frame();
    const t = +g('raceT');
    if (!asked && t > 30) { g('caPit[0] = 1; pitNext = 3;'); asked = 1; console.log('asked to pit at', t.toFixed(1), 'seg', g('caSeg')[0]); }
    const p = +g('caPit')[0];
    if (p !== last) { console.log(`t=${t.toFixed(1)} pit ${last} -> ${p} seg ${g('caSeg')[0]} surf ${g('caSurf')[0]} spd ${(+g('caSpd')[0]).toFixed(1)} off ${(+g('caOff')[0]).toFixed(1)} ty ${g('caTy')[0]} wear ${(+g('caWear')[0]).toFixed(2)} radio ${g('radio')}`); last = p; }
}
console.log('stops', g('caStops')[0], 'lap', g('caLap')[0], 'ty', g('caTy')[0]);
