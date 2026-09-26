// A/B tessvm bench: builds run in turn on each circuit, `reps` rounds, with the
// CPU slowed down (Chrome's CPU throttling) to stand in for a low-end PC.
// Averages the race2..race4 tick (ms per tick) and fps; prints a table.
// usage: node t7/abench.mjs '{"builds":["a.ent","b.ent"],"trks":[1,2,19],"reps":3,"throttle":4,"gfx":2}'
// (needs `node ../tessvm/tsrv.mjs 3100` running)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const o = Object.assign({ trks: [1, 2, 19], reps: 3, throttle: 4, gfx: 2, secs: 16 }, JSON.parse(process.argv[2] || '{}'));
const TV = path.join(HERE, '..', '..', 'tessvm');
const res = {};   // build -> trk -> [{tick, fps}]
const scr = {};
for (const t of o.trks) {
    const f = path.join(os.tmpdir(), `abench_${t}_${o.gfx}.json`);
    cp.execFileSync('node', [path.join(HERE, 'mkb.mjs'), f, JSON.stringify({ trk: t, gfx: o.gfx, secs: o.secs })]);
    // slow the CPU down from the race on only: loading and the menus at full speed
    const st = JSON.parse(fs.readFileSync(f, 'utf8'));
    st.splice(st.findIndex((x) => x.fps === 'start'), 0, { throttle: o.throttle });
    fs.writeFileSync(f, JSON.stringify(st));
    scr[t] = f;
}
for (let r = 0; r < o.reps; r++) {
    for (const t of o.trks) {
        const order = r % 2 ? [...o.builds].reverse() : o.builds;
        for (const b of order) {
            const out = cp.execFileSync('node', [path.join(TV, 'trun.mjs'), path.resolve(b), '--ms', '500', '--script', scr[t]], { cwd: TV, encoding: 'utf8', maxBuffer: 1 << 26 });
            const ticks = [], fpss = [];
            for (const m of out.matchAll(/fps race([234]) ([\d.]+) tick ms ([\d.]+)/g)) { fpss.push(+m[2]); ticks.push(+m[3]); }
            const sm = /fps start [\d.]+ tick ms [\d.]+ max ([\d.]+)/.exec(out);
            const sel = /\{"trk":"?(\d+)"?,"gfx":(\d+)/.exec(out);
            if (!sel || +sel[1] !== t || +sel[2] !== o.gfx) console.log('!! menu picked', sel && sel[0], 'wanted trk', t, 'gfx', o.gfx);
            const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
            ((res[b] ??= {})[t] ??= []).push({ tick: avg(ticks), fps: avg(fpss), startMax: sm ? +sm[1] : 0 });
            console.log(`rep ${r + 1} trk ${t} ${path.basename(b)}  tick ${avg(ticks).toFixed(2)} ms  fps ${avg(fpss).toFixed(1)}  longest start tick ${sm ? sm[1] : '?'} ms`);
        }
    }
}
console.log(`\n== throttle x${o.throttle}, gfx ${o.gfx}: mean tick ms (fps)`);
const base = o.builds[0];
for (const b of o.builds) {
    let line = path.basename(b).padEnd(16);
    for (const t of o.trks) {
        const a = res[b][t];
        const tk = a.reduce((x, y) => x + y.tick, 0) / a.length, fp = a.reduce((x, y) => x + y.fps, 0) / a.length;
        const b0 = res[base][t].reduce((x, y) => x + y.tick, 0) / res[base][t].length;
        line += `  trk${t} ${tk.toFixed(2)} (${fp.toFixed(1)}) ${b === base ? '' : ((tk / b0 - 1) * 100).toFixed(1) + '%'}`;
    }
    console.log(line);
}
if (o.out) fs.writeFileSync(o.out, JSON.stringify(res));
