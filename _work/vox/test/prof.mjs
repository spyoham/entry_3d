// node test/prof.mjs : the newest cpu profile in test/prof, self time by tessvm function (entry names)
import fs from 'node:fs';
const dir = 'test/prof';
const f = fs.readdirSync(dir).filter(x => x.endsWith('.cpuprofile')).sort().pop();
const p = JSON.parse(fs.readFileSync(`${dir}/${f}`));
const src = fs.existsSync('test/tess_src.js') ? fs.readFileSync('test/tess_src.js', 'utf8').split('\n') : [];
const FN = JSON.parse(fs.readFileSync('test/fnames.json')); const FNL = Object.values(FN);
const dt = {}; for (let i = 0; i < p.samples.length; i++) dt[p.samples[i]] = (dt[p.samples[i]] || 0) + (p.timeDeltas[i] || 0);
const self = {}, parent = {};
for (const n of p.nodes) for (const c of n.children || []) parent[c] = n;
const nameOf = (n) => {
    const cf = n.callFrame;
    if (cf.url === '' && cf.functionName.startsWith('F.')) { for (let k = cf.lineNumber + 2; k > cf.lineNumber - 6; k--) { const m = (src[k] || '').match(/^F\[(\d+)\] = function/); if (m) return FNL[+m[1]] || m[1]; } return 'F?' + cf.lineNumber; }
    return null;
};
// attribute runtime helpers (cast.js, ops.js) to the nearest tessvm function above them
for (const n of p.nodes) {
    let k = nameOf(n), m = n;
    while (!k && parent[m.id]) { m = parent[m.id]; k = nameOf(m); }
    k = k || n.callFrame.functionName || '(other)';
    self[k] = (self[k] || 0) + (dt[n.id] || 0);
}
const tot = Object.values(self).reduce((a, b) => a + b, 0);
Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log((v / tot * 100).toFixed(1).padStart(5), k));
