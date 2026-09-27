// v6.2 draw-order survey: random cameras over circuits, the painter's picture
// against the depth-buffered reference (sim SIMZ). Prints the share of pixels
// that differ per shot and saves the worst.
// usage: SIMZ=1 node t8/zsurvey.mjs '{"trks":[1,2],"n":12,"gfx":3,"seed":1,"out":"dir","keep":4}'
//   (RSRC=other/src to survey another build's sources)
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import url from 'node:url';
process.env.SIMZ = '1';
const o = Object.assign({ trks: [1], n: 12, gfx: 3, seed: 1, keep: 3, kinds: ['high', 'low', 'chase'] }, JSON.parse(process.argv[2] || '{}'));
if (!process.env.ZS_CHILD && o.trks.length > 1) {
    // a fresh process per circuit (memory, and the random block ids)
    const all = [];
    for (const t of o.trks) {
        const r = cp.execFileSync('node', [url.fileURLToPath(import.meta.url), JSON.stringify({ ...o, trks: [t] })], { env: { ...process.env, ZS_CHILD: '1' }, maxBuffer: 1 << 26 }).toString();
        process.stdout.write(r);
        const m = r.match(/^TRK (\d+) mean ([\d.]+) max ([\d.]+)/m);
        if (m) all.push([+m[1], +m[2], +m[3]]);
    }
    console.log('ALL mean', (all.reduce((a, b) => a + b[1], 0) / all.length).toFixed(3), 'max', Math.max(...all.map(a => a[2])).toFixed(2));
    process.exit(0);
}
let seed = 777;
Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { createSim } = await import('../sim.mjs');
const trk = o.trks[0];
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = ${o.gfx}; gfxSel = ${o.gfx}; selTrk = ${trk}; applyWeather(); doStartRace();`);
for (let i = 0; i < 60; i++) s.frame();
g('photoEnter()');
if (process.env.ZEXEC) g(process.env.ZEXEC);
let rs = o.seed * 1000 + trk * 7919;
const rnd = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };
const N = +g('NSEG');
const res = [];
for (let k = 0; k < o.n; k++) {
    const kind = o.kinds[k % o.kinds.length];
    const r = 1 + Math.floor(rnd() * N);
    const rx = +g(`sgX[${r - 1}]`), ry = +g(`sgY[${r - 1}]`), rz = +g(`sgZ[${r - 1}]`);
    const hd = Math.atan2(+g(`sgDX[${r - 1}]`), +g(`sgDZ[${r - 1}]`));
    let x, y, z, yaw, pitch, fov = 70;
    if (kind === 'chase') {
        // behind and above a car on the road, looking down it
        x = rx - Math.sin(hd) * 7; z = rz - Math.cos(hd) * 7; y = ry + 2.6; yaw = hd * 180 / Math.PI; pitch = -6;
    } else {
        const b = rnd() * Math.PI * 2, d = kind === 'high' ? 40 + rnd() * 100 : 12 + rnd() * 40;
        const up = kind === 'high' ? 20 + rnd() * 60 : 3 + rnd() * 10;
        x = rx + Math.sin(b) * d; z = rz + Math.cos(b) * d; y = ry + up;
        yaw = Math.atan2(rx - x, rz - z) * 180 / Math.PI; pitch = -Math.atan2(up, d) * 180 / Math.PI;
        fov = 50 + rnd() * 30;
    }
    g(`phX = ${x}; phY = ${y}; phZ = ${z}; phX0 = ${x}; phZ0 = ${z}; phYaw = ${yaw}; phPitch = ${pitch}; phFov = ${fov}; phHelp = 0; actKey = 0`);
    g('photoStep()');
    const tmp = path.join(o.out || '.', `zs_${trk}_${k}.png`);
    const f = 100 * await s.zpng(tmp.replace(/\.png$/, '_z.png'), tmp.replace(/\.png$/, '_d.png'));
    await s.png(tmp);
    res.push({ k, kind, r, f, file: tmp, cam: [x, y, z, yaw, pitch, fov].map(v => +v.toFixed(1)) });
}
res.sort((a, b) => b.f - a.f);
for (const q of res.slice(o.keep)) for (const suf of ['', '_z', '_d']) fs.rmSync(q.file.replace(/\.png$/, suf + '.png'), { force: true });
for (const q of res) console.log(`trk ${trk} shot ${q.k} ${q.kind} ring ${q.r} diff ${q.f.toFixed(2)}% cam ${JSON.stringify(q.cam)}`);
console.log(`TRK ${trk} mean ${(res.reduce((a, b) => a + b.f, 0) / res.length).toFixed(3)} max ${res[0].f.toFixed(2)}`);
