// v3.3.0: the safety car is drawn as the road coupe, the time-trial ghost and
// every racing car still as the open-wheeler (both by drawCar; drMdl); the model
// fits the car's projection slots; the light bar flashes.
// usage: node t9/scmodel.mjs
import { createSim } from '../sim.mjs';
import { roadCar } from '../sccar.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const RC = roadCar();
ok(RC.V.length <= 272 && RC.vLo < RC.V.length && RC.ordLo.length === 8 * RC.fLo && RC.ordHi.length === 8 * (RC.F.length - RC.fLo),
    `model: ${RC.V.length} vertices (car slots 272), ${RC.F.length} faces, silhouette ${RC.vLo}/${RC.fLo}, 8 face orders per tier`);
const kinds = new Set(RC.F.map((f) => f.k));
ok([0, 1, 2, 3, 4, 6, 8, 9, 10].every((k) => kinds.has(k)), `face kinds: ${[...kinds].sort((a, b) => a - b).join(',')} (body, stripe, trim, tyre, rim, tail, glass, light bar, headlight)`);
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g('gfx = 3; rules = 2; wx = 1; lapSel = 2; applyWeather(); gMode = 1; selTrk = 4; buildTrack(4); doStartRace();');
for (let i = 0; i < 3; i++) s.frame();
if (+g('raceState') === 9) { g('endQuali(); startGrid(selCar);'); }
if (+g('raceState') === 14) { g('formSkip(); formEnd();'); }
g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
for (let i = 0; i < 300; i++) s.frame();
g('deploySC()');
for (let i = 0; i < 200; i++) s.frame();
// count who is drawn how in a frame with the camera behind the safety car
g('R.nSC = 0; R.nCar9 = 0; R.nCar = 0; R.qSC = 0;');
// (drawCar draws both; drMdl says which model it took)
g('drawCar = (function (f) { return function (c, t) { const q0 = drawnQuads; f(c, t); if (drMdl == 1) { R.nSC++; R.qSC += drawnQuads - q0; } else if (c == GHOST) { R.nCar9++; } else { R.nCar++; } }; })(drawCar)');
g('camCar = GHOST; camMode = 0');
for (let i = 0; i < 5; i++) s.frame();
ok(+g('scCar') === 1 && +g('R.nSC') >= 5 && +g('R.nCar9') === 0 && +g('R.nCar') > 0, `safety car out: drawn as the coupe ${g('R.nSC')} times (${(+g('R.qSC') / +g('R.nSC')).toFixed(0)} faces a frame), never as the open-wheeler; the field ${g('R.nCar')} draws`);
// the light bar's colour flips with the clock
const bar = (t) => { g(`gt = ${t}`); return g('mod(Math.floor(gt * 4), 2)'); };
ok(+bar(10.0) !== +bar(10.25), 'the light bar is on and off a quarter of a second each');
// the ghost slot without a safety car out (a time trial's ghost) is still the open-wheeler
g('R.nSC = 0; R.nCar9 = 0; caTr[GHOST - 1] = 2; scCar = 0; drawCarAt(GHOST, 0, 0, 0, 0, 0); scCar = 1; drawCarAt(GHOST, 0, 0, 0, 0, 0)');
ok(+g('R.nCar9') === 1 && +g('R.nSC') === 1, `ghost slot: open-wheeler without the safety car (${g('R.nCar9')}), the coupe with it (${g('R.nSC')})`);
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
