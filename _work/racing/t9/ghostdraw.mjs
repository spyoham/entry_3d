// v3.3.1: how the time-trial ghost reaches the pen. A see-through fill whose
// colour or transparency differs from the one before starts a new group of
// the pen, and tessvm draws each such group into a texture of its own: the
// ghost must be a few groups, fade near the camera, and not be drawn with the
// camera inside it. The player's car is parked on the grid of a time trial
// and the ghost put d metres ahead of it.
// usage: node t9/ghostdraw.mjs [circuit]     (RSRC=<older src> to compare)
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 5);
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const sim = createSim({ fps: 30 });
sim.R.nick = 'alice';
for (let i = 0; i < 30; i++) sim.frame();
sim.peek(`gfx = 3; gMode = M_TT; ghSel = 1; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
for (let i = 0; i < 900 && +sim.peek('raceState') !== 3; i++) sim.frame();
// every fill of a frame: colour and transparency
sim.R.fills = [];
sim.peek(`fillColorHex = (function (f) { return function (c) { R.fc = c; f(c); }; })(fillColorHex)`);
sim.peek(`penAlpha = (function (f) { return function (v) { R.ft = +v; f(v); }; })(penAlpha)`);
sim.peek(`fillStop = (function (f) { return function () { R.fills.push([R.fc, R.ft || 0]); f(); }; })(fillStop)`);
sim.peek(`eraseAll = (function (f) { return function () { R.fills.length = 0; f(); }; })(eraseAll)`);

const x = +sim.peek('caX')[0], z = +sim.peek('caZ')[0], yaw = +sim.peek('caYaw')[0];
// one frame's see-through fills: how many, in how many groups, how see-through
const look = (d, gfx, cam, ghost = 1) => {
    const gx = x + d * Math.sin(yaw * Math.PI / 180), gz = z + d * Math.cos(yaw * Math.PI / 180);
    sim.peek(`gfx = ${gfx}; gfxSel = ${gfx}; camMode = ${cam}; caLap[0] = 1; caLapT[0] = raceT; ghN = ${ghost ? 600 : 0}; ghTime = 999;
        for (let i = 0; i < 600; i++) { ghX[i] = ${gx}; ghZ[i] = ${gz}; ghW[i] = ${yaw}; }`);
    for (let i = 0; i < 8; i++) sim.frame();
    const f = sim.R.fills.slice();
    const see = f.filter((q) => q[1] > 0);
    let groups = 0;
    for (let i = 0; i < f.length; i++) if (f[i][1] > 0 && (i === 0 || f[i - 1][0] !== f[i][0] || f[i - 1][1] !== f[i][1])) groups++;
    const gd = Math.hypot(+sim.peek('caX')[8] - +sim.peek('camX'), +sim.peek('caY')[8] - +sim.peek('camY'), +sim.peek('caZ')[8] - +sim.peek('camZ'));
    return { fills: f.length, see: see.length, groups, tr: [...new Set(see.map((q) => q[1]))], colours: new Set(see.map((q) => q[0])).size, gd, on: +sim.peek('ghostOn') };
};

// chase camera
let a = look(4, 3, 0);
ok(a.on === 1 && a.see >= 20 && a.groups <= 3 && a.tr.length === 1 && a.tr[0] === 45,
    `chase camera, ghost 4 m ahead (${a.gd.toFixed(1)} m off the camera): ${a.see} see-through fills in ${a.groups} groups (${a.colours} colours), transparency ${a.tr}`);
a = look(0, 3, 0);
ok(a.see >= 20 && a.groups <= 3 && a.tr[0] === 45, `chase camera, ghost on the car (${a.gd.toFixed(1)} m): ${a.see} fills in ${a.groups} groups, transparency ${a.tr}`);
a = look(40, 2, 0);
ok(a.see >= 10 && a.groups <= 3, `HIGH, ghost 40 m ahead: ${a.see} fills in ${a.groups} groups`);
a = look(-5, 3, 0);
ok(a.groups <= 3 && (a.see === 0 || a.tr[0] > 45), `chase camera, ghost 5 m behind the car (${a.gd.toFixed(1)} m off the camera): ${a.see} fills in ${a.groups} groups, transparency ${a.tr.length ? a.tr : '-'}`);

// cockpit camera: thinner as it nears, gone with the camera inside it
const b12 = look(12, 3, 1);
ok(b12.see >= 20 && b12.groups <= 3 && b12.tr[0] === 45, `cockpit, ghost 12 m ahead (${b12.gd.toFixed(1)} m): ${b12.see} fills in ${b12.groups} groups, transparency ${b12.tr}`);
const b6 = look(6, 3, 1);
ok(b6.see >= 20 && b6.groups <= 3 && b6.tr.length === 1 && b6.tr[0] > 45 && b6.tr[0] <= 90, `cockpit, ghost 6 m ahead (${b6.gd.toFixed(1)} m): ${b6.see} fills in ${b6.groups} groups, transparency ${b6.tr}`);
const b0 = look(0, 3, 1);
const n0 = look(0, 3, 1, 0);
ok(b0.on === 1 && b0.see === 0 && b0.fills === n0.fills, `cockpit, ghost on the car (${b0.gd.toFixed(1)} m): ${b0.see} see-through fills, ${b0.fills} fills in all (${n0.fills} without a ghost)`);

// LOW: the ghost is solid and lit face by face, as before - but not around the camera
const l10 = look(10, 1, 0);
const l10n = look(10, 1, 0, 0);
ok(l10.see === 0 && l10.fills > l10n.fills + 15, `LOW, ghost 10 m ahead: solid, ${l10.fills - l10n.fills} fills, none see-through`);
const l0 = look(0, 1, 1);
const l0n = look(0, 1, 1, 0);
ok(l0.fills === l0n.fills, `LOW, cockpit, ghost on the car: ${l0.fills} fills (${l0n.fills} without a ghost)`);

// the pen is left opaque
ok(+sim.peek('penTr') === 0, 'the pen is opaque again after the frame');
if (process.env.SHOT) { look(5, 3, 0); await sim.png(process.env.SHOT); }
console.log(fails ? `${fails} FAILED` : 'all passed');
