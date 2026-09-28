// big hits (> 0.3 damage) in the first `secs` of realistic races: wall or car, where, who
import { createSim } from '../sim.mjs';
const o = Object.assign({ trks: [1, 2, 3, 5, 6, 10, 19], runs: 3, secs: 150, fps: 10 }, JSON.parse(process.argv[2] || '{}'));
for (const trk of o.trks) for (let r = 0; r < o.runs; r++) {
    const s = createSim({ fps: o.fps }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    g(`globalThis.__L = []; globalThis.__why = '';
       carPhys = eval('(' + String(carPhys).replace('addDamage(c,', '__why = "wall"; addDamage(c,') + ')');
       carCollisions = eval('(' + String(carCollisions).replaceAll("addDamage(", '__why = "car " + a + "-" + b + (pl<pw ? " rear" : " side") + " lon " + lon.toFixed(1) + " lat " + lat.toFixed(1); addDamage(') + ')');
       const _ad = addDamage; addDamage = function(c, d){ if (raceState == ST_RACE && d > 0.3) __L.push([+raceT.toFixed(1), c, +d.toFixed(2), __why, caSeg[c-1], +caSpd[c-1].toFixed(0), +caOff[c-1].toFixed(1), +caMisT[c-1].toFixed(1), caMisK[c-1]]); __why = ''; _ad(c, d); };`);
    g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
    for (let f = 0; f < 200 && +g('raceState') !== 3; f++) s.frame();
    const H = []; let nL = 0;
    for (let f = 0; f < o.secs * o.fps; f++) { s.frame();
        H.push(JSON.parse(g('JSON.stringify([raceT, caSeg, caSpd, aiVlim, caBrk, caSteer, caOff, caYR, caAir].map(a => Array.isArray(a) ? a.slice(0, 8).map(v => +(+v).toFixed(1)) : +a.toFixed(1)))')));
        if (H.length > 30) H.shift();
        const L = JSON.parse(g('JSON.stringify(__L)'));
        if (o.hist && L.length > nL) { for (let q = nL; q < L.length; q++) { const e = L[q]; if (!String(e[3]).startsWith(o.hist)) continue; const c = e[1] - 1; console.log('--- history car', e[1], e[3]); for (const h of H) console.log(`   t ${h[0]} seg ${h[1][c]} v ${h[2][c]} vlim ${h[3][c]} brk ${h[4][c]} st ${h[5][c]} off ${h[6][c]} yr ${h[7][c]} air ${h[8][c]}`); } nL = L.length; }
    }
    for (const e of JSON.parse(g('JSON.stringify(__L)'))) console.log(`trk ${trk} t ${e[0]} car ${e[1]} d ${e[2]} ${e[3]} seg ${e[4]} v ${e[5]} off ${e[6]} mis ${e[7]}/${e[8]}`);
}
