// v3.2.0 damage beyond the front wing (realistic): which hits break what,
// how a bent suspension / a flat tyre / a damaged engine drive, worn tyres
// going flat, the engine giving up, the pit stop, the AI pitting with a
// puncture, the HUD line - and that an undamaged car drives exactly as
// before (RSRC: the old sources to compare with).
// usage: node t9/damage.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mk = (rules, trk = 5, gm = 3) => {
    const s = createSim({ fps: 30 });
    for (let i = 0; i < 5; i++) s.frame();
    s.peek(`rules = ${rules}; wx = 1; applyWeather(); gMode = ${gm}; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
    for (let i = 0; i < 4; i++) s.frame();
    if (+s.peek('raceState') === 9) { s.peek('endQuali(); startGrid(selCar);'); }
    if (+s.peek('raceState') === 14) { s.peek('formSkip(); formEnd();'); }
    return s;
};
const s = mk(2);
const g = (e) => s.peek(e);
const L = (n, i) => +g(`${n}[${i - 1}]`);
// chance always (Math is shared by every sim in this process: put it back after)
const MR = Math.random;
const always = () => { Math.random = () => 0; };
const reset = () => g('caDmg[0] = 0; caWing[0] = 0; caDmgS[0] = 0; caPunc[0] = 0; caDmgE[0] = 0; caEngT[0] = 0; caFail[0] = 0; caDNF[0] = 0');
always();
// a hit on the right front
reset();
g('dmgSide = 1; dmgFront = 1; addDamage(1, 0.3)');
ok(L('caDmgS', 1) > 0.2 && L('caDmgSd', 1) === 1 && L('caPunc', 1) === 2 && L('caDmgE', 1) === 0, `a 0.3 hit on the right front: suspension ${L('caDmgS', 1).toFixed(2)} (right), puncture wheel ${L('caPunc', 1)} (FR), no engine damage`);
ok(String(g('radio')).includes('PUNCTURE - FRONT RIGHT'), `radio: '${g('radio')}'`);
reset();
g('dmgSide = -1; dmgFront = 0; addDamage(1, 0.6)');
ok(L('caPunc', 1) === 3 && L('caDmgSd', 1) === -1 && L('caDmgE', 1) > 0.3, `a 0.6 hit on the left rear: puncture wheel ${L('caPunc', 1)} (RL), engine ${L('caDmgE', 1).toFixed(2)}`);
reset();
g('addDamage(1, 0.05)');
ok(L('caDmgS', 1) === 0 && L('caPunc', 1) === 0, 'a light touch (0.05): only the wing');
// how they drive: straight ahead at 40 m/s, hands off, for 1.5 s
const drive = (setup, steps = 45) => {
    g(`raceState = ST_RACE; caHold[0] = 0; caAir[0] = 0; caSurf[0] = 0; caYR[0] = 0; caYaw[0] = 0; caVX[0] = 0; caVZ[0] = 40; caSpd[0] = 40; caThr[0] = 1; caBrk[0] = 0; caSteer[0] = 0; caHB[0] = 0; caX[0] = 0; caZ[0] = 0; ${setup}`);
    for (let k = 0; k < steps; k++) g('dt = 1/30; carPhys(1)');
    return { yaw: L('caYaw', 1), x: L('caX', 1), roll: L('caRoll', 1) };
};
reset();
const clean = drive('');
reset();
const sr = drive('caDmgS[0] = 0.6; caDmgSd[0] = 1');
reset();
const sl = drive('caDmgS[0] = 0.6; caDmgSd[0] = -1');
ok(Math.abs(clean.yaw) < 0.01 && sr.yaw > 1 && sl.yaw < -1 && Math.abs(sr.yaw + sl.yaw) < 0.25 * Math.abs(sr.yaw), `suspension bent on the right pulls right (${sr.yaw.toFixed(2)} deg), on the left pulls left (${sl.yaw.toFixed(2)}), undamaged straight (${clean.yaw.toFixed(3)})`);
reset();
const pfl = drive('caPunc[0] = 1');
reset();
const prr = drive('caPunc[0] = 4');
ok(pfl.yaw < -1 && prr.yaw > 1 && prr.yaw < 15 && pfl.yaw > -15, `a flat front left pulls left (${pfl.yaw.toFixed(2)} deg in 1.5 s), a flat rear right right (${prr.yaw.toFixed(2)}) - no spin`);
ok(pfl.roll > 1 && prr.roll < -1, `and the car leans onto the flat (roll ${pfl.roll.toFixed(2)} / ${prr.roll.toFixed(2)})`);
// the grip that is left: the most lateral g on full lock at 30 m/s
const grip = (setup) => {
    g(`raceState = ST_RACE; caYR[0] = 0; caYaw[0] = 0; caVX[0] = 0; caVZ[0] = 30; caSpd[0] = 30; caThr[0] = 0.5; caSteer[0] = 1; ${setup}`);
    let mx = 0;
    for (let k = 0; k < 40; k++) { g('dt = 1/30; carPhys(1)'); mx = Math.max(mx, Math.abs(L('caYR', 1))); }
    return mx;
};
reset();
const g0 = grip('');
reset();
const g1 = grip('caPunc[0] = 2');
reset();
const g2 = grip('caDmgS[0] = 1; caDmgSd[0] = 1');
ok(g1 < g0 * 0.8 && g2 < g0, `turning on full lock: yaw rate ${g0.toFixed(0)} clean, ${g1.toFixed(0)} with a flat front, ${g2.toFixed(0)} with the suspension gone`);
// power and top speed (carTick3 sets caPowD / caTopD)
reset();
g('carTick3(1, 0.1, 40)');
const p0 = [L('caPowD', 1), L('caTopD', 1)];
g('caPunc[0] = 1; caDmgE[0] = 0.5; carTick3(1, 0.1, 40)');
const p1 = [L('caPowD', 1), L('caTopD', 1)];
ok(p1[0] - p0[0] > 0.24 && p1[1] - p0[1] > 0.29, `a flat tyre and half an engine: power -${((p1[0] - p0[0]) * 100).toFixed(0)}%, top speed -${((p1[1] - p0[1]) * 100).toFixed(0)}%`);
// worn to the canvas: it goes flat
reset();
g('whW[2] = 0.05; dmgTick(1, 0.1); whW[2] = 1');
ok(L('caPunc', 1) === 3, `a rear-left tyre worn to 5%: puncture wheel ${L('caPunc', 1)}`);
// the engine past 0.9 gives up after 25 s
reset();
g('caDmgE[0] = 0.95; let k = 0; while (k < 240) { dmgTick(1, 0.1); k = k + 1; }');
ok(L('caDNF', 1) === 0, 'engine at 95%: still running after 24 s');
g('k = 0; while (k < 20) { dmgTick(1, 0.1); k = k + 1; }');
ok(L('caDNF', 1) === 1 && String(g('radio')).includes('ENGINE FAILURE'), `...retired at 26 s: '${g('radio')}'`);
g('raceState = ST_RACE; finished = 0');
// the pit stop: new tyres, the suspension, not the engine
reset();
// (an AI car: the player's stop time comes from the wheel-gun game)
g('caPitN[1] = TY_M; caDmg[1] = 0; caPunc[1] = 0; caDmgS[1] = 0; caDmgE[1] = 0; pitStop(2)');
const pt0 = L('caPitT', 2);
g('caPitN[1] = TY_M; caPunc[1] = 2; caDmgS[1] = 0.5; caDmgE[1] = 0.4; pitStop(2)');
const pt = L('caPitT', 2);
ok(L('caPunc', 2) === 0 && L('caDmgS', 2) === 0 && Math.abs(L('caDmgE', 2) - 0.4) < 1e-9 && Math.abs(pt - pt0 - 3) < 1e-6, `pit stop: puncture and suspension fixed, engine not (${L('caDmgE', 2)}); ${pt0.toFixed(1)} s -> ${pt.toFixed(1)} s with the suspension`);
// the HUD line
reset();
g('caPunc[0] = 1; caDmgS[0] = 0.3; caDmgE[0] = 0.2; hudSim()');
ok(String(g('txS[25]')).includes('FLAT FL') && String(g('txS[25]')).includes('SUSP 30%') && String(g('txS[25]')).includes('ENG 20%'), `HUD: '${g('txS[25]')}'`);
// sparks off the rim near the camera
reset();
g('caPunc[0] = 1; caSpd[0] = 30; camX = caX[0] + 5; camZ = caZ[0]; spN = 0');
for (let k = 0; k < 10; k++) g('carSparks(1)');
ok(+g('spN') > 0, `a flat tyre drags its rim: ${g('spN')} sparks`);
// arcade: no damage at all (a sim is built on the real Math.random)
Math.random = MR;
const a = mk(1);
Math.random = () => 0;
a.peek('dmgSide = 1; dmgFront = 1; addDamage(1, 0.6)');
Math.random = MR;
ok(+a.peek('caDmgS[0]') === 0 && +a.peek('caPunc[0]') === 0 && +a.peek('caDmg[0]') === 0, 'arcade: hits do no damage (as before)');
// the AI pits with a puncture
const r = mk(2, 5, 1);
r.peek('playerInput = function () { aiPlan(1); aiDrive(1); }');
for (let i = 0; i < 30 * 30; i++) r.frame();
r.peek('caPunc[2] = 2');
const st0 = +r.peek('caStops[2]');
let pitted = false, fixed = false;
for (let i = 0; i < 30 * 200 && !fixed; i++) { r.frame(); if (+r.peek('caPit[2]') > 0) pitted = true; if (pitted && +r.peek('caPunc[2]') === 0) fixed = true; }
ok(pitted && fixed && +r.peek('caStops[2]') === st0 + 1, `an AI car with a flat tyre pits and comes out on new tyres (stops ${st0} -> ${r.peek('caStops[2]')})`);
// an undamaged car drives exactly as before: a time trial lap's first 20 s
const t = mk(1, 5, 3);
t.peek('playerInput = function () { aiPlan(1); aiDrive(1); }');
for (let i = 0; i < 30 * 20; i++) t.frame();
console.log('TRACE', (+t.peek('caX[0]')).toFixed(9), (+t.peek('caZ[0]')).toFixed(9), (+t.peek('caYaw[0]')).toFixed(9));
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
