// A/B frame check: the same races in the node sim from two src folders, frame
// for frame (seeded random, fixed step), and how many pixels differ.
// usage: node t7/pixcmp.mjs <other src dir> ['{"trks":[1,2,19],"frames":240,"every":40,"gfx":2}']
import cp from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url))('sharp');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const [other, js] = process.argv.slice(2);
if (process.env.PIXCMP_CHILD) {
    // child: render and dump raw frames
    let seed = 12345;   // mulberry32
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const { createSim } = await import('../sim.mjs');
    const o = JSON.parse(process.env.PIXCMP_CHILD);
    const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    const out = [];
    for (const t of o.trks) {
        seed = 12345 + t;   // (the compiler draws random block ids: reseed here)
        g(`rules = 1; gMode = 1; gfx = ${o.gfx}; gfxSel = ${o.gfx}; selTrk = ${t}; applyWeather(); (typeof doStartRace === 'function' ? doStartRace() : startRace());`);
        let f = 0;
        while (f < o.frames) {
            s.frame(); f++;
            if (f > 60) g('camCar = 2');
            if (f % o.every === 0) out.push(Buffer.from(s.pixels).toString('base64'));
        }
    }
    fs.writeFileSync(o.file, JSON.stringify(out));
    process.exit(0);
}
const o = Object.assign({ trks: [1, 2, 19], frames: 240, every: 40, gfx: 2 }, JSON.parse(js || '{}'));
const run = (src, tag) => {
    const file = path.join(os.tmpdir(), `pixcmp_${tag}.json`);
    cp.execFileSync('node', [url.fileURLToPath(import.meta.url)], { env: { ...process.env, RSRC: src || '', PIXCMP_CHILD: JSON.stringify({ ...o, file }) }, stdio: 'inherit', maxBuffer: 1 << 28 });
    return JSON.parse(fs.readFileSync(file, 'utf8')).map((b) => Buffer.from(b, 'base64'));
};
const A = run(path.resolve(other), 'a');
const B = run('', 'b');
let worst = 0;
A.forEach((a, k) => {
    let n = 0, big = 0;
    for (let i = 0; i < a.length; i += 3) {
        const d = Math.max(Math.abs(a[i] - B[k][i]), Math.abs(a[i + 1] - B[k][i + 1]), Math.abs(a[i + 2] - B[k][i + 2]));
        if (d > 0) n++;
        if (d > 24) big++;
    }
    worst = Math.max(worst, n);
    console.log(`frame ${k + 1}: ${n} px differ (${big} by more than 24)`);
    if (o.png && n > 0) for (const [tag, buf] of [['a', a], ['b', B[k]]]) sharp(buf, { raw: { width: 480, height: 270, channels: 3 } }).png().toFile(path.join(o.png, `pix_${k + 1}_${tag}.png`));
});
console.log('worst', worst, 'of', A[0].length / 3);
