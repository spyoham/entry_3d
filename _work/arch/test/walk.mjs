// Play stages by a script in Node and check they can be finished.
//   node test/walk.mjs [stage ...] [--shots]
// A script (walks.mjs) is a list of steps; positions are in the current room's coordinates:
//   ['go', x, z]                walk to (x, z)
//   ['thru', room, x, z]        walk towards (x, z) until in `room` (a room name of the stage)
//   ['look', x, y, z]           turn to look at a point
//   ['e'] / ['x']               press E / X
//   ['jump']                    press space once
//   ['wait', s]                 do nothing for s seconds
//   ['hold', keyCode, s]        hold a key
//   ['yaw', deg]                set the heading
//   ['shot', name]              save a picture to test/walk_<stage>_<name>.png
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
import { makeWorld } from '../levels.mjs';
import { WALKS as W1, NEG, REC } from './walks.mjs';
const negMode = process.argv.includes('--neg');
const recMode = process.argv.includes('--rec');
const WALKS = negMode ? NEG : recMode ? REC : W1;
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const shots = args.includes('--shots');
const W = makeWorld();
const list = args.filter(a => /^\d+$/.test(a)).map(Number);
const stages = list.length ? list : [...W.stages.map((_, i) => i + 1), 25];
let fails = 0;
for (const st of stages) {
    const script = WALKS[st];
    if (!script) { console.log(`stage ${st}: no script`); fails++; continue; }
    const real = st === 25 ? 24 : st;
    const s = createSim({ consts: { AUTOSTART: real } });
    s.frame();
    s.poke('maxD', 3);
    const S = W.stages[real - 1];
    const roomIdx = (name) => { const r = W.rooms.slice(S.r0, S.r1).find(r => r.name === name); if (!r) throw new Error('room ' + name); return r.idx; };
    const P = (n) => s.peek(n);
    let frames = 0, ok = true, why = '';
    const step = (n = 1) => { for (let i = 0; i < n; i++) { s.frame(1 / 60); frames++; if (P('stage') !== real) return true; } return false; };
    const press = (code) => { s.keys.add(code); step(2); s.keys.delete(code); step(2); };
    const steer = (x, z) => { const dx = x - P('px'), dz = z - P('pz'); s.poke('yaw', Math.atan2(dx, dz) * 180 / Math.PI); return Math.hypot(dx, dz); };
    try {
        for (const [k, ...a] of script) {
            if (P('stage') !== real || P('stageClear') === 1) break;
            if (k === 'records') { const O = P('OT'), C = P('ORC'); O.forEach((t, i) => { if (t == 11) C[i] = 1; }); }
            if (k === 'go') {
                let n = 0;
                s.keys.add(87);
                while (steer(a[0], a[1]) > 0.15 * P('psc') + 0.05) { if (step()) break; if (++n > 60 * 20) throw new Error(`go ${a} stuck at ${P('px').toFixed(2)},${P('pz').toFixed(2)} room ${P('pr')}`); }
                s.keys.delete(87); step(3);
            }
            if (k === 'thru') {
                const r = roomIdx(a[0]);
                let n = 0;
                s.keys.add(87);
                while (P('pr') !== r) { steer(a[1], a[2]); if (step()) break; if (++n > 60 * 20) throw new Error(`thru ${a} stuck at ${P('px').toFixed(2)},${P('py').toFixed(2)},${P('pz').toFixed(2)} room ${P('pr')}`); }
                s.keys.delete(87); step(10);
            }
            if (k === 'look') {
                const dx = a[0] - P('px'), dy = a[1] - (P('py') + 1.6 * P('psc')), dz = a[2] - P('pz');
                s.poke('yaw', Math.atan2(dx, dz) * 180 / Math.PI);
                s.poke('pitch', Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI);
                step(2);
            }
            if (k === 'cross') { // walk heading a[1] until a[0] portal crossings
                const c0 = P('crossN'); let n = 0;
                s.keys.add(87);
                while (P('crossN') < c0 + a[0]) { s.poke('yaw', a[1]); if (step()) break; if (++n > 60 * 30) throw new Error('cross stuck'); }
                s.keys.delete(87); step(5);
            }
            if (k === 'yaw') { s.poke('yaw', a[0]); s.poke('pitch', a[1] || 0); step(2); }
            if (k === 'e') press(69);
            if (k === 'x') press(88);
            if (k === 'jump') { s.keys.add(32); step(3); s.keys.delete(32); }
            if (k === 'wait') step(Math.round(a[0] * 60));
            if (k === 'hold') { s.keys.add(a[0]); step(Math.round(a[1] * 60)); s.keys.delete(a[0]); }
            if (k === 'holdgo') { // hold W toward heading a[0] for a[1] s
                s.poke('yaw', a[0]); s.keys.add(87); step(Math.round(a[1] * 60)); s.keys.delete(87);
            }
            if (k === 'say') console.log(`  [${st}] ${a[0]}: msg="${P('msgText')}" room=${P('pr')} pos=${P('px').toFixed(2)},${P('py').toFixed(2)},${P('pz').toFixed(2)} psc=${P('psc')} held=${P('held')}`);
            if (k === 'shot' && shots) await s.png(path.join(HERE, `walk_${st}_${a[0]}.png`));
        }
        if (recMode) { console.log(`rec ${st}: ${P('recHave') > 0 ? 'found' : 'NOT FOUND'} pos ${P('px').toFixed(2)},${P('py').toFixed(2)},${P('pz').toFixed(2)}`); if (P('recHave') == 0) fails++; continue; }
        // the core is reached: the next stage follows
        let n = 0;
        while (P('stage') === real && P('endingOn') !== 1 && n < 200) { step(); n++; }
        if (P('stage') === real && P('endingOn') !== 1) { ok = false; why = `not cleared: room ${P('pr')} pos ${P('px').toFixed(2)},${P('py').toFixed(2)},${P('pz').toFixed(2)} msg "${P('msgText')}"`; }
    } catch (e) { ok = false; why = e.message; }
    if (negMode) { console.log(`neg ${st}: ${ok ? 'BROKEN (cleared without the trick)' : 'ok, blocked: ' + why}`); if (ok) fails++; }
    else { console.log(`stage ${st} ${W.stages[real - 1].name}: ${ok ? 'OK' : 'FAIL ' + why} (${(frames / 60).toFixed(1)} s)`); if (!ok) fails++; }
}
process.exit(fails ? 1 : 0);
