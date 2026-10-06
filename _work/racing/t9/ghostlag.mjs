// where a time trial against a ghost spends its frames: an AI-driven time
// trial with the ghost on, every frame's cost (wall time in the sim, fills,
// quads) and the frames that stand out.
// usage: node t9/ghostlag.mjs [circuit] [laps] [ghSel] [gfx]
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 5);
const laps = +(process.argv[3] || 4);
const ghSel = +(process.argv[4] || 1);
const gfx = +(process.argv[5] || 3);
const fps = 30;

const sim = createSim({ fps });
sim.R.nick = 'alice';
for (let i = 0; i < 30; i++) sim.frame();
// fills a frame, and how many of them see-through
let fills = 0, seeFills = 0, alphaSets = 0;
sim.peek(`gfx = ${gfx}; gMode = M_TT; ghSel = ${ghSel}; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
sim.peek(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
sim.peek(`quad = (function (f) { return function (a, b, c, d, m) { R.nQuad = (R.nQuad || 0) + 1; if (penTr > 0) { R.nSee = (R.nSee || 0) + 1; } f(a, b, c, d, m); }; })(quad)`);
const fnames = ['updateGhost', 'ghostRec', 'profileStep', 'lapDone', 'drawCar', 'sampleTrack', 'wrUpload', 'loadPbGhost', 'lapGhost', 'saveProfile', 'selfCheck', 'rankStep', 'rankWatch'];
for (const n of fnames) {
    sim.peek(`${n} = (function (f) { return function () { const t0 = performance.now(); const r = f.apply(this, arguments); (R.fT ||= {})['${n}'] = ((R.fT || {})['${n}'] || 0) + performance.now() - t0; (R.fN ||= {})['${n}'] = ((R.fN || {})['${n}'] || 0) + 1; return r; }; })(${n})`);
}

const rows = [];
let lap = 0;
for (let f = 0; f < 900 * fps; f++) {
    sim.R.nQuad = 0; sim.R.nSee = 0; sim.R.fT = {}; sim.R.fN = {};
    const t0 = performance.now();
    sim.frame();
    const ms = performance.now() - t0;
    const l = +sim.peek('caLap')[0];
    rows.push({
        f, ms, lap: l, lt: +sim.peek('raceT') - +sim.peek('caLapT')[0], q: sim.R.nQuad, see: sim.R.nSee, gh: +sim.peek('ghostOn'),
        gd: Math.hypot(+sim.peek('caX')[8] - +sim.peek('caX')[0], +sim.peek('caZ')[8] - +sim.peek('caZ')[0]),
        gseg: +sim.peek('caSeg')[8], seg: +sim.peek('caSeg')[0], tr: +sim.peek('caTr')[8], fT: sim.R.fT, st: +sim.peek('raceState'), rec: +sim.peek('pRecNow'),
    });
    if (l > lap) { lap = l; console.log(`lap ${l} at frame ${f}, last ${(+sim.peek('lastLap')).toFixed(2)}, ghN ${sim.peek('ghN')}`); }
    if (l > laps) break;
}
const race = rows.filter((r) => r.st === 3 && r.lap >= 1);
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const m = med(race.map((r) => r.ms));
console.log(`frames ${race.length}, median ${m.toFixed(2)} ms, p99 ${race.map((r) => r.ms).sort((x, y) => x - y)[Math.floor(race.length * 0.99)].toFixed(2)} ms, max ${Math.max(...race.map((r) => r.ms)).toFixed(2)} ms`);
for (const on of [0, 1]) {
    const a = race.filter((r) => r.gh === on);
    if (a.length) console.log(`ghost ${on ? 'on ' : 'off'}: ${a.length} frames, median ${med(a.map((r) => r.ms)).toFixed(2)} ms, quads ${med(a.map((r) => r.q))}, see-through quads max ${Math.max(...a.map((r) => r.see))}`);
}
// by how near the ghost is
for (const [lo, hi] of [[0, 3], [3, 8], [8, 20], [20, 60], [60, 1e9]]) {
    const a = race.filter((r) => r.gh === 1 && r.gd >= lo && r.gd < hi);
    if (a.length) console.log(`ghost ${lo}-${hi} m: ${a.length} frames, median ${med(a.map((r) => r.ms)).toFixed(2)} ms, quads ${med(a.map((r) => r.q))}, see ${med(a.map((r) => r.see))}, max ms ${Math.max(...a.map((r) => r.ms)).toFixed(2)}`);
}
console.log('worst frames:');
for (const r of race.slice().sort((x, y) => y.ms - x.ms).slice(0, 25)) {
    console.log(`  f ${r.f} lap ${r.lap} lt ${r.lt.toFixed(2)} ${r.ms.toFixed(2)} ms quads ${r.q} see ${r.see} ghost ${r.gh} ${r.gd.toFixed(1)} m tier ${r.tr} seg ${r.seg}/${r.gseg} rec ${r.rec} ` +
        Object.entries(r.fT).filter(([, v]) => v > 0.3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' '));
}
// the ghost's ring against where it really is
let off = 0;
for (const r of race) if (r.gh === 1) { const d = Math.abs(r.gseg - r.seg); if (r.gd < 5 && Math.min(d, 9999) > 8 && d < 1e6) off++; }
console.log(`frames with the ghost within 5 m but its ring more than 8 from the player's: ${off}`);
