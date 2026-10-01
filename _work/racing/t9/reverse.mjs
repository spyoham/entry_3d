// v3.0.1: steering while reversing. A car backing up with the wheel turned
// right swings its tail right (its nose turns left: yaw goes down), at every
// reverse speed, the same as the low-speed model; going forwards nothing
// changed. Also: held full lock in reverse does not spin the car.
// usage: node t9/reverse.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ fps: 30 });
for (let i = 0; i < 5; i++) s.frame();
s.peek('gMode = M_PR; selTrk = 5; buildTrack(5); doStartRace();');
for (let i = 0; i < 90; i++) s.frame();
const g = (e) => s.peek(e);
const turn = (v, st, steps = 15, thr = 0, brk = 0) => {
    g(`raceState = ST_RACE; caHold[0] = 0; caAir[0] = 0; caSurf[0] = 0; caYR[0] = 0; caYaw[0] = 0; caVX[0] = 0; caVZ[0] = ${v}; caSpd[0] = ${v}; caThr[0] = ${thr}; caBrk[0] = ${brk}; caSteer[0] = ${st}; caHB[0] = 0`);
    let mx = 0;
    for (let k = 0; k < steps; k++) { g('dt = 1/30; carPhys(1)'); mx = Math.max(mx, Math.abs(+g('caYR[0]'))); }
    // (the car's yaw, and where it went: x is to the right of where it faced)
    return { yaw: +g('caYaw[0]'), x: +g('caX[0]'), mx };
};
const x0 = () => +g('caX[0]');
for (const v of [-1, -2, -3, -5, -8, -12, -16]) {
    const r = turn(v, 1);
    ok(r.yaw < -0.05, `reverse at ${-v} m/s, steering right: the nose turns left (yaw ${r.yaw.toFixed(2)} deg)`);
    const l = turn(v, -1);
    ok(l.yaw > 0.05 && Math.abs(l.yaw + r.yaw) < 1e-6, `... and steering left the mirror image (${l.yaw.toFixed(2)})`);
}
for (const v of [3, 8, 20, 40]) {
    const r = turn(v, 1);
    ok(r.yaw > 0.05, `forwards at ${v} m/s, steering right: the nose turns right (${r.yaw.toFixed(2)})`);
}
// backing up with the throttle (S held) and full right lock for 3 s
g('raceState = ST_RACE; caHold[0] = 0; caYR[0] = 0; caYaw[0] = 0; caVX[0] = 0; caVZ[0] = 0; caSpd[0] = 0');
let mx = 0, minV = 0;
for (let k = 0; k < 90; k++) {
    g('caThr[0] = 0; caBrk[0] = 1; caSteer[0] = 1; caHB[0] = 0; dt = 1/30; carPhys(1)');
    mx = Math.max(mx, Math.abs(+g('caYR[0]')));
    minV = Math.min(minV, +g('caSpd[0]'));
}
ok(minV < -5 && +g('caYaw[0]') < -20 && mx < 120, `3 s backing up on full right lock: speed ${minV.toFixed(1)} m/s, turned ${(+g('caYaw[0]')).toFixed(0)} deg, yaw rate at most ${mx.toFixed(0)} deg/s (no spin)`);
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
