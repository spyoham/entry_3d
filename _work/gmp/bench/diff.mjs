// Differential test: run an EJS snippet (start handler body pushing to OUT)
// in real Entry and in the JS backend, print where they differ.
// usage: node bench/diff.mjs snippet.js
import fs from 'node:fs';
import { libSources, loadLib } from '../lib.mjs';
import { buildEnt } from '../entbuild.mjs';
import { runEnt } from '../erun.mjs';
const demo = fs.readFileSync(new URL('../src/demo_calc.js', import.meta.url), 'utf8');
const body = fs.readFileSync(process.argv[2], 'utf8');
const p = `let done = 0; let a = 0; let b = 0; let c = 0; let d = 0; let f = 0; let OUT = [];\non('start', 'main', function () {\n${body}\n done = 1;\n});\n`;
const RR = loadLib([demo, p]); const g = RR.handlers[0].gen(); while (!g.next().done); const want = RR.peek('OUT');
buildEnt('bench/diff.ent', libSources([demo, p]));
const r = await Promise.race([runEnt('bench/diff.ent', { timeout: 120000, lists: ['OUT'] }), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), Number(process.env.TO || 120000)))]);
console.log('entry done', r.done, r.ms, 'ms', r.errors.slice(0, 2));
const got = r.vars.OUT || [];
for (let i = 0; i < Math.max(want.length, got.length); i++) { const ok = String(got[i]) === String(want[i]); console.log(ok ? ' OK  ' : ' DIFF', i, String(got[i]).slice(0, 90), ok ? '' : '\n      want ' + String(want[i]).slice(0, 90)); }
process.exit(0);
