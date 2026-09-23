import { createSim } from './sim.mjs';
const [trk = 2, from = 40, to = 72] = process.argv.slice(2).map(Number);
const fps = +(process.env.FPS || 5);
const s = createSim({ fps });
for (let i = 0; i < 3; i++) s.frame();
const g = (e) => s.peek(e);
g(`renderWorld = function(){}`);
g(`nCars = NCAR`); g(`setupRace(${trk}, 1)`); g(`R.set(caSkill, 1, 1.0, 'x')`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const curv = g('sgCurv'); const NSEG = g('NSEG');
for (let f = 0; f < 60 * fps; f++) {
    s.frame();
    const seg = g('caSeg[0]');
    if (g('raceState') === 3 && seg >= from && seg <= to && g('caLap[0]') === 1)
        console.log(seg, 'R', Math.round(1 / Math.abs(curv[seg - 1])), 'kmh', Math.round(Math.hypot(g('caVX[0]'), g('caVZ[0]')) * 3.6), 'vlim', Math.round(g('aiVlim[0]') * 3.6), 'thr', g('caThr[0]'), 'brk', +(+g('caBrk[0]')).toFixed(2), 'off', +g('caOff[0]').toFixed(1), 'surf', g('caSurf[0]'), 'st', +g('caSteer[0]').toFixed(2), 'yr', Math.round(g('caYR[0]')), 'vlat', +(g('caVX[0]')*Math.cos(g('caYaw[0]')*Math.PI/180)-g('caVZ[0]')*Math.sin(g('caYaw[0]')*Math.PI/180)).toFixed(1), 'drift', Math.round(g('caDrift[0]')));
}
