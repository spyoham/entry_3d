// v3.1.0 the whole-race replay and highlights, in the node sim: a 5-lap
// grand prix driven by the AI (the buffer fills and halves once), the cars'
// real places kept on the side and compared with the replay's, the moments
// and clips, and the keys on the results screen (V, UP, H, ENTER) and in the
// pause menu.
// usage: node t9/replay.mjs [circuit] [laps option 1-4]
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 5);
const lapSel = +(process.argv[3] || 3);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
const L = (n, i) => g(`${n}[${i - 1}]`);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; wx = 1; gfx = 2; lapSel = ${lapSel}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
for (let i = 0; i < 3; i++) s.frame();
g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
// the truth: every car's place when each sample is taken, and car 1 every frame
const truth = new Map();
const path1 = [];
let lastN = 0;
let frames = 0;
while (frames < 20000) {
    s.frame(); frames++;
    const st = +g('raceState');
    const n = +g('rfN');
    if (n !== lastN && n > lastN) {
        const t = (n - 1) * +g('rfDT');
        truth.set(Math.round(t * 1000), [1, 2, 3, 4, 5, 6, 7, 8].map((c) => [+L('caX', c), +L('caZ', c)]));
    }
    lastN = n;
    if (st === 3 && +g('lightsOut') > 0) path1.push([+g('raceT'), +L('caX', 1), +L('caZ', 1)]);
    if (st === 5 && [1, 2, 3, 4, 5, 6, 7, 8].every((c) => +L('caFin', c) > 0 || +L('caDNF', c) > 0)) break;
}
const raceT = +g('raceT');
ok(+g('raceState') === 5, `the race is over at ${raceT.toFixed(0)} s (${g('nLaps')} laps, P${g('finished')})`);
const rfN = +g('rfN'), rfDT = +g('rfDT');
ok(rfDT === (raceT > 0.5 * 1100 ? 1 : 0.5) && Math.abs((rfN - 1) * rfDT - raceT) < 2 * rfDT, `buffer: ${rfN} samples ${rfDT} s apart (${((rfN - 1) * rfDT).toFixed(0)} s of race)`);
// at the samples: the replay puts each car where it was
let errs = [];
for (const [ms, cars] of truth) {
    const t = ms / 1000;
    if (Math.abs(t / rfDT - Math.round(t / rfDT)) > 1e-6) continue;          // (dropped when the buffer halved)
    if (t > (rfN - 1) * rfDT) continue;
    cars.forEach(([x, z], i) => { g(`rfAt(${i + 1}, ${t})`); if (+g('oRF') > 0) { const e = Math.hypot(+g('oRX') - x, +g('oRZ') - z); errs.push(e); if (process.env.DBG && e > 1) console.log('big', e.toFixed(2), 'car', i + 1, 't', t, 'p', (+g('oRP')).toFixed(2), 'o', (+g('oRO')).toFixed(1)); } });
}
errs.sort((a, b) => a - b);
const p99 = errs[Math.floor(errs.length * 0.99)];
ok(errs.length > 1000 && p99 < 0.3 && errs[errs.length - 1] < 1.0, `at the samples: ${errs.length} places, median ${errs[errs.length >> 1].toFixed(2)} m, 99% ${p99.toFixed(2)} m, worst ${errs[errs.length - 1].toFixed(2)} m`);
// between them: car 1's path, interpolated along the track
let between = [];
for (const [t, x, z] of path1) { g(`rfAt(1, ${t})`); if (+g('oRF') > 0) between.push(Math.hypot(+g('oRX') - x, +g('oRZ') - z)); }
between.sort((a, b) => a - b);
const med = between[between.length >> 1], p95 = between[Math.floor(between.length * 0.95)];
ok(med < 3 && p95 < 8, `every frame of car 1: median ${med.toFixed(2)} m, 95% ${p95.toFixed(2)} m off (between samples ${rfDT} s apart)`);
// the moments and clips
const hn = +g('hxN');
const kinds = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => [...Array(hn).keys()].filter((i) => +L('hxK', i + 1) === k).length);
ok(hn >= 2 && kinds[0] === 1 && kinds[6] === 1, `moments: ${hn} (start ${kinds[0]}, passes ${kinds[1]}, passed ${kinds[2]}, lead ${kinds[3]}, off ${kinds[4]}, retired ${kinds[5]}, finish ${kinds[6]}, win ${kinds[7]})`);
g('hxClips()');
const hc = +g('hcN');
const clips = [...Array(hc).keys()].map((i) => [+L('hcA', i + 1), +L('hcB', i + 1), +L('hcC', i + 1)]);
const end = (rfN - 1) * rfDT;
ok(hc >= 2 && clips.every(([a, b], i) => a >= 0 && b <= end + 1e-6 && b > a && (i === 0 || a >= clips[i - 1][1])) && clips[0][0] === 0,
    `${hc} clips in race order, apart, inside the race: ${clips.map(([a, b, c]) => `${a.toFixed(0)}-${b.toFixed(0)}s car ${c}`).join(', ')}`);
g('hxCaption(1)');
const cap1 = String(g('oHC'));
g(`hxCaption(${hc})`);
ok(cap1 === 'THE START' && /^LAP \d+ /.test(String(g('oHC'))), `captions: '${cap1}' ... '${g('oHC')}'`);
// the keys on the results screen
const press = (k) => { s.keys.add(k); s.frame(); s.keys.delete(k); s.frame(); };
const x1 = +L('caX', 1);
press(86);
ok(+g('raceState') === 11 && +g('rpSrc') === 1 && +g('rpCar') === 1, 'V: the whole race from the start');
press(38); press(38);
const t0 = +g('rfT');
for (let i = 0; i < 20; i++) s.frame();
ok(+g('rpSpd') === 4 && Math.abs(+g('rfT') - t0 - 20 * 0.1 * 4) < 0.05, `UP twice: x${L('rpSpdV', +g('rpSpd'))}, ${(+g('rfT') - t0).toFixed(1)} s of race in 2 s`);
g('updateHud()');
ok(String(L('txS', 9)) === 'FULL RACE' && String(L('txS', 13)).includes(' / '), `HUD: '${L('txS', 9)}' '${L('txS', 13)}'`);
press(72);
ok(+g('rpSrc') === 2 && +g('hcK') === 1 && +g('rpSpd') === 2, 'H: the highlights from the first clip');
let seen = new Set([1]);
for (let i = 0; i < 400 && seen.size < Math.min(3, hc); i++) { s.frame(); seen.add(+g('hcK')); }
g('updateHud()');
ok(seen.size >= Math.min(3, hc) && String(L('txS', 14)).length > 3, `clips play one after another (${[...seen].join(', ')}), caption '${L('txS', 14)}'`);
s.keys.add(13); s.frame();
ok(+g('raceState') === 5 && Math.abs(+L('caX', 1) - x1) < 1e-9, 'ENTER: back to the results, the cars where they were');
s.keys.delete(13); s.frame();
press(72);
ok(+g('raceState') === 11 && +g('rpSrc') === 2, 'H straight from the results: the highlights');
press(27);
// mid-race: the pause menu still has the last minute (V) and the highlights so far (H)
g(`doStartRace();`);
for (let i = 0; i < 700; i++) s.frame();
g('prevState = raceState; raceState = ST_PAUSE');
press(86);
ok(+g('raceState') === 11 && +g('rpSrc') === 0, 'pause, V: the last minute in detail (as before)');
press(13);
press(72);
ok(+g('raceState') === 11 && +g('rpSrc') === 2 && +g('hcN') >= 1, `pause, H: the highlights so far (${g('hcN')} clips)`);
press(13);
ok(+g('raceState') === 6, 'and back to the pause menu');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
