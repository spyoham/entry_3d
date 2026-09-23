// Build a ladder of .ent files of increasing size out of the full build, to find out where
// playentry.org stops accepting a project (its editor shows "변수 또는 리스트의 값이 너무 많아"
// whenever /rest/project/upload answers 502, so the real threshold has to be measured).
//
//   node --max-old-space-size=8000 probe.mjs "<full .ent>" <outDir> [8,12,20,32,48]
//
// Each file keeps the whole program and a fraction of the weight data (first N layers of
// WALL/LVALL/LVMALL/SPALL + a truncated EMB), so it has the same shape as the real project
// but a chosen project.json size in MB. The probes are NOT meant to produce good text.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import cp from 'node:child_process';

const [inEnt, outDir, targetsArg] = process.argv.slice(2);
const targets = (targetsArg || '8,12,20,32,48').split(',').map(Number);
if (!inEnt || !outDir) { console.error('usage: node probe.mjs <full.ent> <outDir> [MB,MB,...]'); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'entprobe-'));
fs.copyFileSync(path.resolve(inEnt), path.join(tmp, 'in.ent'));
cp.execFileSync('tar', ['-xzf', 'in.ent'], { cwd: tmp });
fs.rmSync(path.join(tmp, 'in.ent'));
const pj = path.join(tmp, 'temp', 'project.json');
const project = JSON.parse(fs.readFileSync(pj, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const V = (n) => project.variables.find((v) => v.name === n);
const LISTS = ['WALL', 'LVALL', 'LVMALL', 'SPALL'];
const full = {};
for (const n of LISTS) full[n] = V(n).array;
const fullEMB = String(V('EMB').value);
const perLayer = full.WALL.length / 30;          // 4 matrices per layer

const fmt = (b) => (b / 1e6).toFixed(1);
for (const mb of targets) {
    // binary search the fraction that lands closest under the target project.json size
    let lo = 0, hi = 1, best = null;
    for (let it = 0; it < 12; it++) {
        const f = (lo + hi) / 2;
        const layers = Math.max(1, Math.round(30 * f));
        for (const n of LISTS) V(n).array = full[n].slice(0, layers * perLayer);
        V('EMB').value = fullEMB.slice(0, Math.round(fullEMB.length * f));
        const json = JSON.stringify(project);
        if (json.length / 1e6 <= mb) { best = { f, layers, json }; lo = f; } else hi = f;
    }
    if (!best) { console.log(`${mb}MB: even the program alone is bigger`); continue; }
    fs.writeFileSync(pj, best.json);
    cp.execFileSync('tar', ['-cf', 'out.tar', 'temp'], { cwd: tmp });
    const out = path.join(outDir, `probe ${mb}MB.ent`);
    fs.writeFileSync(out, zlib.gzipSync(fs.readFileSync(path.join(tmp, 'out.tar')), { level: 9 }));
    console.log(`probe ${mb}MB.ent  layers ${best.layers}/30  project.json ${fmt(best.json.length)} MB  .ent ${fmt(fs.statSync(out).size)} MB`);
}
fs.rmSync(tmp, { recursive: true, force: true });
