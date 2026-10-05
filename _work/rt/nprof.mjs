// Inclusive time per Entry function from a Node --cpu-prof run of nrun.mjs
// usage: node nprof.mjs file.ent [frames]
import fs from 'node:fs';
import cp from 'node:child_process';
const [file, frames = 250] = process.argv.slice(2);
fs.rmSync('.prof', { recursive: true, force: true });
const out = cp.execSync(`node --cpu-prof --cpu-prof-dir=.prof --cpu-prof-interval 150 nrun.mjs ${file} ${frames} 60`).toString();
const p = JSON.parse(fs.readFileSync('.prof/' + fs.readdirSync('.prof')[0]));
const byId = new Map(p.nodes.map(n => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
const dt = new Map(); p.samples.forEach((s, i) => dt.set(s, (dt.get(s) || 0) + (p.timeDeltas[i] || 0)));
const incl = new Map(), self = new Map(); let tot = 0, inTick = 0;
for (const [id, t] of dt) {
    tot += t;
    const cf0 = byId.get(id).callFrame; const k0 = cf0.functionName + ' ' + cf0.url.split('/').pop() + ':' + cf0.lineNumber;
    self.set(k0, (self.get(k0) || 0) + t);
    let x = id, found = null, tick = false;
    while (x !== undefined) { const cf = byId.get(x).callFrame; if (!found && cf.functionName === 'F.<computed>') found = cf.lineNumber; if (cf.functionName === 'tick') tick = true; x = parent.get(x); }
    if (tick) { inTick += t; incl.set(found ?? 'other', (incl.get(found ?? 'other') || 0) + t); }
}
console.log(out.trim());
console.log('in tick', (100 * inTick / tot).toFixed(1) + '% of the run; by Entry function (line of its start in the generated program):');
for (const [k, t] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log((100 * t / inTick).toFixed(1).padStart(6) + '%  ' + k);
console.log('self:'); for (const [k, t] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log((100 * t / tot).toFixed(1).padStart(6) + '%  ' + k);

// hot lines of the biggest function (own code only; helpers it calls are in `self` above)
const src = fs.readFileSync('prog_node.js', 'utf8').split(String.fromCharCode(10));
const top = [...incl].filter(([k]) => k !== 'other').sort((a, b) => b[1] - a[1])[0][0];
const selfLines = new Map();
for (const n of p.nodes) if (n.callFrame.functionName === 'F.<computed>' && n.callFrame.lineNumber === top && n.positionTicks) for (const q of n.positionTicks) selfLines.set(q.line, (selfLines.get(q.line) || 0) + q.ticks);
const total = [...selfLines.values()].reduce((a, b) => a + b, 0);
console.log('hot lines of function at', top, '(self ticks', total + ')');
for (const [l, t] of [...selfLines].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[4] || 45))) console.log(String(t).padStart(5), String(l).padStart(5), (src[l - 3] || '').trim().slice(0, 140));
