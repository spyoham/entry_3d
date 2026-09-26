// v6.0: the player's pit stop mini game (rules.js pmStep). Stationary time for
//  A  SPACE with the marker dead centre every wheel      (about 2.2 s)
//  B  nothing pressed: the crew does it on its own       (about 5 s)
//  C  SPACE at once every wheel: cross-threaded nuts      (slow)
//  D  a new nose on top: the stop lasts at least that
import { createSim } from '../sim.mjs';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
function stop(mode, dmg = 0) {
    const s = createSim({ fps: 60 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 3; i++) s.frame();
    g('rules = R_SIM; nCars = NCAR'); g('setupRace(2, 1)');
    for (let i = 0; i < 60 * 12 && ![3, 9].includes(+g('raceState')); i++) s.frame();
    g(`caDmg[0] = ${dmg}; pitStop(1)`);
    let t = 0, pressed = 0, radio = '';
    for (let i = 0; i < 60 * 20; i++) {
        s.keys.delete(32);
        if (+g('pmOn') > 0) {
            const pos = +g('pmPos'), pt = +g('pmT');
            if (mode === 'A' && Math.abs(pos - 0.5) < 0.03 && pt > 0.1) s.keys.add(32);
            if (mode === 'C' && pt > 0.02 && pt < 0.05) s.keys.add(32);
            if (mode === 'D' && Math.abs(pos - 0.5) < 0.03 && pt > 0.1) s.keys.add(32);
            if (s.keys.has(32)) pressed++;
        }
        s.frame();
        if (+g('caPit[0]') !== 3) break;
        t += 1 / 60;
        radio = g('radio');
    }
    return { t, pressed, radio, res: [1, 2, 3, 4].map((k) => g('pmR' + k)).join('') };
}
const A = stop('A'), B = stop('B'), C = stop('C'), D = stop('D', 0.5);
console.log(JSON.stringify({ A, B, C, D }));
ok(A.t > 1.9 && A.t < 2.6 && A.res === '1111', `A perfect: ${A.t.toFixed(2)} s, wheels ${A.res}, "${A.radio}"`);
ok(B.t > 4 && B.t < 6.5 && B.res === '3333', `B nothing pressed: ${B.t.toFixed(2)} s, wheels ${B.res}`);
ok(C.t > A.t + 2 && C.res === '3333', `C too early: ${C.t.toFixed(2)} s, wheels ${C.res}`);
ok(D.t > 3.5 && D.t < A.t + 3, `D perfect with a new nose: ${D.t.toFixed(2)} s (at least the repair)`);
