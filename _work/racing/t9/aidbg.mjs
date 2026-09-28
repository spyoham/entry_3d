// one car through a stretch of rings: target offset, aim distance, steering
import { createSim } from '../sim.mjs';
const o = Object.assign({ trk: 5, car: 2, s0: 58, s1: 72, secs: 40, fps: 10, solo: 0 }, JSON.parse(process.argv[2] || '{}'));
const s = createSim({ fps: o.fps }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${o.trk}; buildTrack(${o.trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
let src = g('String(aiDrive)');
// log just before the aim point is computed
src = src.replace(/let tx=/, `if (c == ${o.car}) __D.push([+raceT.toFixed(2), s, +caU[c-1].toFixed(2), +caOff[c-1].toFixed(2), +tgtOff.toFixed(2), +da.toFixed(1), +nearCv.toFixed(4), +sp.toFixed(1), +vlim.toFixed(1), +caSteer[c-1].toFixed(2), +caYR[c-1].toFixed(1), caSurf[c-1]]); let tx=`);
g(`globalThis.__D = []; aiDrive = eval('(' + ${JSON.stringify(src)} + ')')`);
g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
if (o.solo) g(`nCars = 1; ${o.car != 1 ? '' : ''}`);
for (let f = 0; f < 200 && +g('raceState') !== 3; f++) s.frame();
for (let f = 0; f < o.secs * o.fps; f++) s.frame();
const D = JSON.parse(g('JSON.stringify(__D)'));
let last = -1;
for (const d of D) if (d[1] >= o.s0 && d[1] <= o.s1 && d[0] !== last) { last = d[0]; console.log('t', d[0], 'seg', d[1], 'u', d[2], 'off', d[3], 'tgt', d[4], 'da', d[5], 'nCv', d[6], 'sp', d[7], 'vlim', d[8], 'steer', d[9], 'yr', d[10], 'surf', d[11]); }
