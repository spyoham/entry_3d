// Copy the variable / list VALUES of one .ent into another .ent, by name, offline.
//
//   node --max-old-space-size=8000 state_copy.mjs <donor.ent> <target.ent> <out.ent> [--only A,B,...] [--dry]
//
// Why: the big data of the SmolLM port (WALL 45M chars, EMB 13.8M chars, ...) can be loaded
// and run by Entry, but it can NOT be typed/pasted into Entry's variable & list editor - the
// panel re-renders the whole value on every change, so the renderer process dies. Patch the
// file instead of the page: take the program from <target.ent> (the version you are working
// on) and the data from <donor.ent> (a full build, e.g. "SmolLM2-135M (2.67비트) v5.ent").
//
// Only `value` / `array` are copied; ids, visibility, order and everything else in the target
// project (scripts, functions, objects, assets) are left untouched. Names present in the
// target but not in the donor are reported and left as they are.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import cp from 'node:child_process';

const args = process.argv.slice(2);
const [donorEnt, targetEnt, outEnt] = args.filter((a) => !a.startsWith('--'));
const only = (() => { const i = args.indexOf('--only'); return i < 0 ? null : new Set(args[i + 1].split(',')); })();
const dry = args.includes('--dry');
if (!donorEnt || !targetEnt || (!outEnt && !dry)) {
    console.error('usage: node state_copy.mjs <donor.ent> <target.ent> <out.ent> [--only A,B] [--dry]');
    process.exit(1);
}

const untar = (ent, dir) => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    // this tar mangles absolute Windows paths ("C:/x" = host:path), so copy the archive in
    // and run it with relative arguments only
    fs.copyFileSync(path.resolve(ent), path.join(dir, 'in.ent'));
    cp.execFileSync('tar', ['-xzf', 'in.ent'], { cwd: dir });
    fs.rmSync(path.join(dir, 'in.ent'));
    const p = path.join(dir, 'temp', 'project.json');
    if (!fs.existsSync(p)) throw new Error('no temp/project.json in ' + ent);
    return p;
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'entstate-'));
const donorJson = untar(donorEnt, path.join(tmp, 'donor'));
const targetDir = path.join(tmp, 'target');
const targetJson = untar(targetEnt, targetDir);

const donor = JSON.parse(fs.readFileSync(donorJson, 'utf8'));
const target = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
const src = new Map(donor.variables.map((v) => [v.name, v]));

const rows = [];
let missing = [];
for (const v of target.variables) {
    if (only && !only.has(v.name)) continue;
    const s = src.get(v.name);
    if (!s) { missing.push(v.name); continue; }
    if (s.variableType !== v.variableType) throw new Error(`${v.name}: donor is ${s.variableType}, target is ${v.variableType}`);
    if (v.variableType === 'list') {
        const before = v.array.length, after = s.array.length;
        if (!dry) v.array = s.array.map((it, i) => ({ id: `${v.id}_${i}`, data: it.data }));
        const chars = s.array.reduce((a, it) => a + String(it.data).length, 0);
        if (before !== after || chars > 1000) rows.push(['L', v.name, `${before} -> ${after} items`, chars]);
    } else {
        const before = String(v.value).length, after = String(s.value).length;
        if (!dry) v.value = s.value;
        if (before !== after || after > 1000) rows.push(['V', v.name, `${before} -> ${after} chars`, after]);
    }
}
const extra = donor.variables.filter((v) => !target.variables.some((t) => t.name === v.name)).map((v) => v.name);
for (const r of rows) console.log(r[0], r[1].padEnd(10), r[2]);
if (missing.length) console.log('not in donor (left alone):', missing.join(' '));
if (extra.length) console.log('donor-only (not copied):', extra.join(' '));
const chars = target.variables.reduce((a, v) => a + (v.variableType === 'list' ? v.array.reduce((b, it) => b + String(it.data).length, 0) : String(v.value).length), 0);
console.log('data after copy:', (chars / 1e6).toFixed(1), 'M chars');

if (!dry) {
    fs.writeFileSync(targetJson, JSON.stringify(target));
    cp.execFileSync('tar', ['-cf', 'out.tar', 'temp'], { cwd: targetDir });
    fs.writeFileSync(path.resolve(outEnt), zlib.gzipSync(fs.readFileSync(path.join(targetDir, 'out.tar')), { level: 9 }));
    console.log('wrote', outEnt, (fs.statSync(path.resolve(outEnt)).size / 1e6).toFixed(1), 'MB');
}
fs.rmSync(tmp, { recursive: true, force: true });
