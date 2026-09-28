// R-restart in realistic: does the player get retired afterwards?
import { createSim } from '../sim.mjs';
const [trk = 5, when = 'race', t1 = 30, t2 = 120] = process.argv.slice(2);
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const run = (secs, each) => { for (let f = 0; f < secs * 10; f++) { s.frame(); if (each && each(f) === false) break; } };
const st = () => `state ${g('raceState')} t ${(+g('raceT')).toFixed(1)} fuel ${(+g('caFuel[0]')).toFixed(2)} R ${(+g('caFuelR[0]')).toExponential(2)} fail ${g('caFail[0]')} dnf ${g('caDNF[0]')} fin ${g('finished')} lap ${g('caLap[0]')}`;
if (when === 'quali') { run(+t1); console.log('before R:', st()); g('restartRace()'); }
else {
  g('endQuali()'); g('startGrid(selCar)');
  if (when === 'form') { run(+t1); console.log('before R:', st()); g('restartRace()'); }
  else { g('formSkip(); formEnd();'); run(+t1); console.log('before R:', st());
    if (when === 'pause') { g('prevState = raceState; raceState = ST_PAUSE;'); }
    g('restartRace()'); }
}
console.log('after R:', st());
let dnfAt = -1;
run(+t2, (f) => { if (+g('raceState') === 14 && f % 10 == 0) {} if (dnfAt < 0 && +g('caDNF[0]') > 0) { dnfAt = f / 10; console.log('DNF at', dnfAt, st(), g('radio')); } if (f % 100 == 0) console.log(f/10, st()); });
