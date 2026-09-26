// v6.0 photo mode and graphics AUTO.
//  A  pause, O: photo mode; W flies the camera forward, SPACE hides the help,
//     O goes back to the pause screen
//  B  from a replay, O and back
//  C  AUTO on a machine drawing 30 fps: the distances come down to the floor
//     and ULTRA's extras go; at 60 fps they come back
import { createSim } from '../sim.mjs';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const s = createSim({ fps: 60 }); const g = (e) => s.peek(e);
const tap = (k) => { s.keys.add(k); s.frame(); s.keys.delete(k); s.frame(); };
for (let i = 0; i < 3; i++) s.frame();
g('gfx = 3; gfxSel = 3; nCars = NCAR'); g('setupRace(2, 1)');
for (let i = 0; i < 60 * 12 && +g('raceState') !== 3; i++) s.frame();
for (let i = 0; i < 120; i++) s.frame();
tap(80);
const paused = +g('raceState');
tap(79);
const inPhoto = +g('raceState');
const x0 = +g('camX'), z0 = +g('camZ'), yaw = +g('phYaw');
s.keys.add(87); for (let i = 0; i < 60; i++) s.frame(); s.keys.delete(87);
const moved = Math.hypot(+g('camX') - x0, +g('camZ') - z0);
tap(32);
const help = +g('phHelp');
tap(79);
ok(paused === 6 && inPhoto === 15 && moved > 9 && moved < 15 && help === 0 && +g('raceState') === 6,
    `A pause ${paused} -> photo ${inPhoto}, flew ${moved.toFixed(1)} m in 1 s (yaw ${yaw.toFixed(0)}), help ${help}, back to ${g('raceState')}`);
tap(86);
const inReplay = +g('raceState');
for (let i = 0; i < 30; i++) s.frame();
tap(79);
const photo2 = +g('raceState');
tap(79);
ok(inReplay === 11 && photo2 === 15 && +g('raceState') === 11, `B replay ${inReplay} -> photo ${photo2} -> ${g('raceState')}`);
tap(13);
tap(80);
// C: AUTO; the clock second now ticks every 30 frames (30 fps) or 60 (60 fps)
let fr = 0, per = 30;
s.R.dateSecFn = () => Math.floor(fr / per) % 60;
g('gfxSel = 4; gfx = 3; gfQ = 1; afCap = 1');
const run = (secs) => { for (let i = 0; i < secs * per; i++) { fr++; s.frame(); } };
run(24);
const q30 = +g('gfQ'), gx30 = +g('gfx'), fps30 = +g('afFps');
per = 60; fr = 0;
run(240);
const q60 = +g('gfQ'), gx60 = +g('gfx'), fps60 = +g('afFps');
ok(q30 === 0.45 && gx30 === 2 && q60 >= 0.8 && gx60 === 3, `C 30 fps (${fps30}): quality ${q30}, gfx ${gx30}; then 60 fps (${fps60}) for 240 s: ${q60}, gfx ${gx60}`);
