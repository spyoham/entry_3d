// Two .ent files that tell apart "the limit is on the uploaded file" from "the limit is on the
// project document": same program (v4), plus a filler list whose content is either highly
// compressible (big JSON, small .ent) or random (small JSON, big .ent).
//
//   node --max-old-space-size=8000 probe2.mjs <program.ent> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import cp from 'node:child_process';

const [inEnt, outDir] = process.argv.slice(2);
if (!inEnt || !outDir) { console.error('usage: node probe2.mjs <program.ent> <outDir>'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'entprobe2-'));
fs.copyFileSync(path.resolve(inEnt), path.join(tmp, 'in.ent'));
cp.execFileSync('tar', ['-xzf', 'in.ent'], { cwd: tmp });
fs.rmSync(path.join(tmp, 'in.ent'));
const pj = path.join(tmp, 'temp', 'project.json');
const base = fs.readFileSync(pj, 'utf8');
fs.mkdirSync(outDir, { recursive: true });

const ALPHA = Array.from({ length: 62 }, (_, i) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[i]).join('');
const item = (n, rand) => {
    if (!rand) return 'z'.repeat(n);                       // compresses to almost nothing
    let s = '';
    for (let i = 0; i < n; i++) s += ALPHA[(Math.random() * 62) | 0];
    return s;
};
const build = (name, targetJsonMB, rand) => {
    const project = JSON.parse(base);
    const id = 'fill';
    const perItem = 400000, want = targetJsonMB * 1e6 - base.length;
    const arr = [];
    for (let i = 0; i * perItem < want; i++) arr.push({ id: `${id}_${i}`, data: item(perItem, rand) });
    project.variables.push({ name: 'FILL', id, visible: false, value: 0, variableType: 'list', array: arr, object: null, x: 0, y: 0, isCloud: false });
    const json = JSON.stringify(project);
    fs.writeFileSync(pj, json);
    cp.execFileSync('tar', ['-cf', 'out.tar', 'temp'], { cwd: tmp });
    const out = path.join(outDir, name);
    fs.writeFileSync(out, zlib.gzipSync(fs.readFileSync(path.join(tmp, 'out.tar')), { level: 9 }));
    console.log(`${name}  project.json ${(json.length / 1e6).toFixed(1)} MB  .ent ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
};
// specs on the command line: <name>:<target project.json MB>:<zip|rand>
const specs = process.argv.slice(4);
if (!specs.length) {
    build('filler-compressible 15MB.ent', 15, false);
    build('filler-random 8MB.ent', 8, true);
} else {
    for (const s of specs) {
        const [name, mb, mode] = s.split(':');
        build(`${name}.ent`, Number(mb), mode === 'rand');
    }
}
fs.rmSync(tmp, { recursive: true, force: true });
