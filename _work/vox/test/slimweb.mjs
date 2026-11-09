// checks the browser page slim-ent.html in Node: node test/slimweb.mjs some.ent
// fattens the .ent the way Entry saves it, slims it with the page's own code, and compares.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import cp from 'node:child_process'; import zlib from 'node:zlib';
const html = fs.readFileSync(new URL('../slim-ent.html', import.meta.url), 'utf8');
const core = html.match(/<script id="slim-core">([\s\S]*?)<\/script>/)[1];
const slimEnt = new Function(core + '\nreturn slimEnt;')();
const inFile = path.resolve(process.argv[2]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slimweb-'));
const untar = (buf, dir) => { fs.mkdirSync(dir, { recursive: true }); cp.execSync('tar -xf -', { cwd: dir, input: zlib.gunzipSync(buf), maxBuffer: 1 << 30 }); return JSON.parse(fs.readFileSync(path.join(dir, 'temp', 'project.json'), 'utf8')); };
const orig = untar(fs.readFileSync(inFile), path.join(tmp, 'a'));
// fatten: every block gets Entry's defaults
const fat = (b) => { if (!b || typeof b !== 'object') return; if (Array.isArray(b)) return b.forEach(fat);
  if (typeof b.type === 'string') { Object.assign(b, { x: 0, y: 0, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true }, { ...b }); b.extensions ??= []; b.statements ??= []; }
  (b.params || []).forEach(fat); (b.statements || []).forEach(fat); };
const fatScript = (s) => typeof s === 'string' && s ? (() => { const v = JSON.parse(s); fat(v); return JSON.stringify(v); })() : s;
const pj = JSON.parse(JSON.stringify(orig));
for (const f of pj.functions || []) if (f.content) f.content = fatScript(f.content);
for (const o of pj.objects || []) if (o.script) o.script = fatScript(o.script);
fs.writeFileSync(path.join(tmp, 'a', 'temp', 'project.json'), JSON.stringify(pj));
const fatEnt = zlib.gzipSync(cp.execSync('tar -cf - temp', { cwd: path.join(tmp, 'a'), maxBuffer: 1 << 30 }));
const r = await slimEnt(new Uint8Array(fatEnt));
console.log(`fat project.json ${(r.before / 1e6).toFixed(1)} MB -> ${(r.after / 1e6).toFixed(1)} MB, ${r.removed} fields; .ent ${(fatEnt.length / 1e6).toFixed(2)} -> ${(r.out.length / 1e6).toFixed(2)} MB`);
const back = untar(Buffer.from(r.out), path.join(tmp, 'b'));
const same = JSON.stringify(back) === JSON.stringify(orig);
const files = (d) => cp.execSync('tar -tzf -', { input: d, maxBuffer: 1 << 30 }).toString().split('\n').filter(Boolean).sort().join();
console.log(same ? 'ok   project.json is the same as the original' : 'FAIL project.json differs');
console.log(files(fs.readFileSync(inFile)) === files(Buffer.from(r.out)) ? 'ok   the same files inside' : 'FAIL the files inside differ');
const again = await slimEnt(r.out); console.log(again.removed === 0 ? 'ok   slimming again takes nothing out' : 'FAIL ' + again.removed);
fs.writeFileSync(path.join(tmp, 'web-slim.ent'), r.out); console.log('out', path.join(tmp, 'web-slim.ent'));
