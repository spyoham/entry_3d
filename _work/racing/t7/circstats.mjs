// Facts for the circuit guide, from a lap driven by the AI in the game itself
// (ROSSO R5, PRO; the second, flying lap): length, DRS zones, height range, slowest corner, share of
// the lap at full throttle, lap time. usage: node t7/circstats.mjs [trk..]
import { createSim } from '../sim.mjs';
const trks = process.argv.slice(2).map(Number);
for (const t of trks) {
    const fps = 20;
    const s = createSim({ fps }); const g = (e) => s.peek(e);
    for (let i = 0; i < 3; i++) s.frame();
    g('nCars = NCAR'); g(`setupRace(${t}, 1)`); g(`R.set(caSkill, 1, 1.0, 'x')`);
    g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
    let lap = 0, vmin = 1e9, n = 0, full = 0, t0 = 0, lapT = 0;
    for (let f = 0; f < fps * 600; f++) {
        s.frame();
        if (+g('raceState') !== 3) continue;
        const l = +g('caLap[0]');
        if (l !== lap) { if (lap === 2) { lapT = +g('raceT') - t0; break; } lap = l; t0 = +g('raceT'); }
        if (lap === 2) {
            const v = Math.hypot(+g('caVX[0]'), +g('caVZ[0]')) * 3.6;
            if (v < vmin) vmin = v;
            n++; if (+g('caThr[0]') >= 0.99) full++;
        }
    }
    console.log(JSON.stringify({ trk: t, name: g(`trkName[${t - 1}]`), len: Math.round(+g('trkLen')), drs: +g('drsN'), elev: Math.round(+g('trkElev')), vmin: Math.round(vmin), full: Math.round(100 * full / n), lap: +lapT.toFixed(1) }));
}
