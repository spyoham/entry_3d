import { createSim } from '../sim.mjs';
const o = Object.assign({ trk: 1, car: 2, s0: 300, s1: 314, secs: 80, fps: 10, rules: 2 }, JSON.parse(process.argv[2] || '{}'));
const s = createSim({ fps: o.fps }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = ${o.rules}; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${o.trk}; buildTrack(${o.trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
if (o.rules == 2) { g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();'); }
for (let f = 0; f < 200 && +g('raceState') !== 3; f++) s.frame();
const c = o.car - 1; let prev = null;
for (let f = 0; f < o.secs * o.fps; f++) { s.frame();
  const d = JSON.parse(g(`JSON.stringify([raceT, caSeg[${c}], caSpd[${c}], aiVlim[${c}], caBrk[${c}], caThr[${c}], caSteer[${c}], caLock[${c}], caBrD[${c}], caBrT[${c}], caWK[${c}], trkGripK, caOff[${c}], caLap[${c}]])`));
  if (d[1] >= o.s0 && d[1] <= o.s1 && d[13] >= 1) console.log(d.map((v, i) => i == 0 ? v.toFixed(1) : typeof v === 'number' ? +v.toFixed(2) : v).join(' '), prev ? 'dec ' + ((prev - d[2]) * o.fps).toFixed(1) : ''); prev = d[2]; }
