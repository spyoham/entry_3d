// Takes the default fields out of every block of an .ent again (as the build does with SLIM=1).
// Entry fills them back in when it opens a work and writes them all when it saves it, which
// makes the project about twice the size; this strips them from such a saved file.
//   node slim-ent.mjs in.ent [out.ent]      (out defaults to in-slim.ent)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import zlib from 'node:zlib';

const DEFAULTS = { x: 0, y: 0, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true };
let removed = 0;
function slimWalk(b) {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { for (const x of b) slimWalk(x); return; }
    if (typeof b.type === 'string') {
        for (const k in DEFAULTS) if (k in b && b[k] === DEFAULTS[k]) { delete b[k]; removed++; }
        if (Array.isArray(b.extensions) && !b.extensions.length) { delete b.extensions; removed++; }
        if (Array.isArray(b.statements) && !b.statements.length) { delete b.statements; removed++; }
    }
    if (b.params) for (const p of b.params) slimWalk(p);
    if (b.statements) for (const s of b.statements) slimWalk(s);
}
// a script is kept as a JSON string (or, in some saves, as the array itself)
const slimScript = (s) => {
    if (typeof s === 'string') { if (!s) return s; const v = JSON.parse(s); slimWalk(v); return JSON.stringify(v); }
    slimWalk(s); return s;
};

const inFile = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(inFile)) { console.log('usage: node slim-ent.mjs in.ent [out.ent]'); process.exit(1); }
const outFile = path.resolve(process.argv[3] || inFile.replace(/\.ent$/i, '') + '-slim.ent');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-ent-'));
try {
    cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(inFile)), maxBuffer: 1 << 30 });
    const pj = path.join(tmp, 'temp', 'project.json');
    const before = fs.statSync(pj).size;
    const project = JSON.parse(fs.readFileSync(pj, 'utf8'));
    for (const f of project.functions || []) if (f.content) f.content = slimScript(f.content);
    for (const o of project.objects || []) if (o.script) o.script = slimScript(o.script);
    fs.writeFileSync(pj, JSON.stringify(project));
    const after = fs.statSync(pj).size;
    // the same tar.gz layout (temp/... inside)
    const tar = cp.execSync('tar -cf - temp', { cwd: tmp, maxBuffer: 1 << 30 });
    fs.writeFileSync(outFile, zlib.gzipSync(tar, { level: 9 }));
    console.log(`project.json ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB (${removed} default fields taken out)`);
    console.log(`${path.basename(inFile)} ${(fs.statSync(inFile).size / 1e6).toFixed(2)} MB -> ${path.basename(outFile)} ${(fs.statSync(outFile).size / 1e6).toFixed(2)} MB`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
