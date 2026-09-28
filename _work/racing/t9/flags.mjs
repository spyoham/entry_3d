// How eventful is the start of a realistic race? (all cars on the AI)
// usage: node t9/flags.mjs '{"trks":[1,2,5],"runs":3,"secs":150,"lapSel":3}'
// Counts per race: AI mistakes, contact damage hits, incidents (yellow), VSC,
// safety car, failures, DNFs, and the time of the first yellow.
import { createSim } from '../sim.mjs';
const o = Object.assign({ trks: [1, 2, 5], runs: 3, secs: 150, lapSel: 3, player: 'ai' }, JSON.parse(process.argv[2] || '{}'));
const tot = {}; const add = (k, v) => { tot[k] = (tot[k] || 0) + v; };
let races = 0;
for (const trk of o.trks) for (let r = 0; r < o.runs; r++) {
    const s = createSim({ fps: o.fps || 10 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    g(`rules = 2; wx = 1; gfx = 2; lapSel = ${o.lapSel}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    g(`globalThis.__n = {mis:0, hit:0, big:0, inc:0, incOff:0, vsc:0, sc:0, dnf:0, yel1:-1, rear:0, side:0, rear20:0, side20:0};
       carCollisions = eval('(' + String(carCollisions).replace('if((rel<0)){let hv=(0-rel);', 'if((rel<0)){let hv=(0-rel); if(hv>2.5 && raceState == ST_RACE){const k=(pl<pw)?"rear":"side"; __n[k]++; if (raceT < 20) __n[k+"20"]++;}') + ')');
       const _ad = addDamage; addDamage = function(c, d){ if (rules == 2 && raceState == ST_RACE) { if (d > 0.08) __n.hit++; if (d > 0.3) __n.big++; } _ad(c, d); };
       const _in = incident; incident = function(c){ if (raceState == ST_RACE) { if (caYelT[c - 1] <= 0) { __n.inc++; if (caSurf[c - 1] >= 2 && caOffT[c - 1] > 0.8) __n.incOff++; if (__n.yel1 < 0) __n.yel1 = raceT; } } _in(c); };
       const _dv = deployVSC; deployVSC = function(){ const a = vscOn; _dv(); if (a == 0 && vscOn == 1) __n.vsc++; };
       const _ds = deploySC; deploySC = function(){ __n.sc++; _ds(); };
       const _rc = retireCar; retireCar = function(c){ if (caDNF[c - 1] < 1) __n.dnf++; _rc(c); };`);
    g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
    for (let f = 0; f < 120 && +g('raceState') !== 3; f++) s.frame();
    let rk0 = [];
    const mis0 = new Array(9).fill(0), fail0 = new Array(9).fill(0), exc0 = new Array(9).fill(false), big0 = new Array(9).fill(0);
    for (let f = 0; f < o.secs * (o.fps || 10); f++) {
        s.frame();
        const m = JSON.parse(g('JSON.stringify([caMisT.slice(0,8), caFail.slice(0,8), caSurf.slice(0,8), caOff.slice(0,8), caSeg.slice(0,8).map(q => sgW[q-1]), caRank.slice(0,8)])'));
        if (f > 0 && rk0.length) for (let c = 0; c < 8; c++) if (m[5][c] < rk0[c]) add('pass', rk0[c] - m[5][c]);
        rk0 = m[5];
        for (let c = 0; c < 8; c++) {
            const off = m[2][c] >= 2 && m[2][c] != 6;
            if (off && !exc0[c]) add('exc', 1);
            if (off && Math.abs(m[3][c]) > m[4][c] + 1 && !big0[c]) { add('exc1m', 1); big0[c] = 1;
                if (o.log) { const q = JSON.parse(g(`JSON.stringify([raceT, caSeg[${c}], sgCurv[caSeg[${c}]-1], caSpd[${c}], aiVlim[${c}], caMisT[${c}], caLap[${c}], caSurf[${c}]])`));
                    let cv = 0; for (let k = -6; k <= 2; k++) { const v = +g(`sgCurv[mod(${q[1]} - 1 + ${k}, NSEG)]`); if (Math.abs(v) > Math.abs(cv)) cv = v; }
                    console.log(`  1m trk ${trk} t ${q[0].toFixed(1)} car ${c + 1} seg ${q[1]} ${cv * m[3][c] > 0 ? 'IN ' : 'OUT'} R ${Math.round(1 / Math.abs(cv))} off ${m[3][c].toFixed(1)}/${m[4][c].toFixed(1)} v ${(q[3] * 3.6).toFixed(0)} lim ${(q[4] * 3.6).toFixed(0)} mis ${q[5].toFixed(1)} lap ${q[6]} surf ${q[7]}`); } }
            if (!off) big0[c] = 0;
            exc0[c] = off;
            if (m[0][c] > 1.0 && mis0[c] <= 1.0) add('mis', 1);
            if (m[1][c] > 0 && fail0[c] === 0) add('fail', 1);
            mis0[c] = m[0][c]; fail0[c] = m[1][c];
        }
    }
    const n = JSON.parse(g('JSON.stringify(__n)'));
    for (const k of ['hit', 'big', 'inc', 'incOff', 'vsc', 'sc', 'dnf', 'rear', 'side', 'rear20', 'side20']) add(k, n[k]);
    add('prog', +g('(() => { let t = 0; for (let c = 0; c < 8; c++) t += caLap[c] * NSEG + caSeg[c]; return t / 8 / NSEG; })()'));
    add('flagRace', n.inc + n.vsc + n.sc > 0 ? 1 : 0);
    races++;
    if (!o.quiet) console.log(`trk ${trk} run ${r}: lap ${g('Math.max(...caLap.slice(0,8))')} ${JSON.stringify(n)}`);
}
console.log('per race:', Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +(v / races).toFixed(2)])), 'races', races);
