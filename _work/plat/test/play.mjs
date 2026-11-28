// node test/play.mjs : the tool in the Node simulator - standing, jump height, a bot through stage 1, pictures
import { createSim } from '../sim.mjs';
const sim = createSim();
const P = (n) => sim.peek(n);
const run = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
run(30);
ok(Math.abs(P('내Y')) < 0.01 && P('땅에_있음') === 1, `stands on the first platform (y ${P('내Y')})`);
// one jump, key held
sim.keys.add(32); let top = 0; for (let i = 0; i < 80; i++) { sim.frame(); top = Math.max(top, P('내Y')); if (i === 40) sim.keys.delete(32); }
ok(top > 2.0 && top < 2.4, `jump height ${top.toFixed(2)}`);
run(30);
await sim.png('test/s1_start.png');
// a bot: towards each waypoint, hopping
async function bot(way, name, maxFrames = 3600) {
    let w = 0, f = 0, hold = 0;
    for (; f < maxFrames && w < way.length && P('스테이지_끝') !== 1; f++) {
        const stage = P('스테이지');
        const [tx, tz, wait] = way[w];
        const dx = tx - P('내X'), dz = tz - P('내Z');
        sim.keys.delete(87); sim.keys.delete(83); sim.keys.delete(68); sim.keys.delete(65);
        if (dz > 0.25) sim.keys.add(87); if (dz < -0.25) sim.keys.add(83);
        if (dx > 0.25) sim.keys.add(68); if (dx < -0.25) sim.keys.add(65);
        const far = Math.hypot(dx, dz);
        // jump where the platform under the feet ends
        const g = P('밟은_물체');
        let edge = false;
        if (g > 0 && far > 0.6) { const ax = P('내X') + dx / far * 0.6, az = P('내Z') + dz / far * 0.6, X = P('물체X')[g - 1], Z = P('물체Z')[g - 1]; edge = ax < X || ax > X + P('가로')[g - 1] || az < Z || az > Z + P('세로')[g - 1]; }
        if (edge && hold <= 0 && !(wait && wait())) { sim.keys.add(32); hold = 30; }
        if (--hold === 5) sim.keys.delete(32);
        if (far < 0.5 && P('땅에_있음') === 1) w++;
        sim.frame();
        if (P('스테이지') !== stage) break;
        if (f % 120 === 0 && process.env.SHOTS) await sim.png(`test/${name}_${f}.png`);
    }
    return { f, w };
}
const s1 = await bot([[0, 8], [0, 14], [5, 14], [10, 14], [10, 20], [10, 27], [4, 27]], 's1');
ok(P('스테이지') === 2, `stage 1 finished by the bot in ${s1.f} frames (waypoint ${s1.w}, 태엽 seen)`);
run(5);
await sim.png('test/s2_start.png');
// rewind: the first moving platform goes back
run(120); const z1 = P('물체Z')[2]; sim.keys.add(69); run(60); sim.keys.delete(69); const z2 = P('물체Z')[2];
ok(z2 < z1 && P('되감기_게이지') < 3.1, `rewind moves the platform back (${z1.toFixed(2)} -> ${z2.toFixed(2)}), gauge ${P('되감기_게이지').toFixed(2)}`);
// fall: back to the start
sim.keys.add(65); run(200); sim.keys.delete(65); run(120);
ok(Math.abs(P('내X')) < 0.5 && P('내Y') > -0.5, `fell and came back (x ${P('내X').toFixed(2)} y ${P('내Y').toFixed(2)})`);
console.log('fills in a frame', sim.stats.fills, '| text:', sim.text('안내'));
sim.poke('스테이지', 3); sim.as('붓', () => sim.fn.스테이지_불러오기()); run(10);
await sim.png('test/s3_start.png');
process.exit(fail ? 1 : 0);
