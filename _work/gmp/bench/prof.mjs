// Count executed blocks per source line / function in the real Entry runtime.
// usage: node bench/prof.mjs <file.ent> [topN]
import fs from 'node:fs';
import { runEnt } from '../erun.mjs';
const file = process.argv[2];
const topN = Number(process.argv[3] || 40);
let counts;
const r = await runEnt(file, {
    timeout: 3600000,
    onPage: async (page) => {
        await page.evaluate(() => {
            window.__cnt = new Map();
            const orig = Entry.Scope.prototype.run;
            Entry.Scope.prototype.run = function (e, t) { const id = this.block && this.block.id; window.__cnt.set(id, (window.__cnt.get(id) || 0) + 1); return orig.call(this, e, t); };
        });
    },
    after: async (page) => { counts = await page.evaluate(() => [...window.__cnt.entries()]); },
});
const L = JSON.parse(fs.readFileSync(file + '.lines.json', 'utf8'));
const perLine = new Map(); let total = 0;
for (const [id, c] of counts) { const ln = L.blockLines[id] || 0; perLine.set(ln, (perLine.get(ln) || 0) + c); total += c; }
const fnOf = []; let cur = '(top)';
L.srcLines.forEach((t, i) => { const m = t.match(/^function (\w+)|^on\('(\w+)', '(\w+)'/); if (m) cur = m[1] || (m[2] + ':' + m[3]); fnOf[i + 1] = cur; });
const perFn = new Map();
for (const [ln, c] of perLine) perFn.set(fnOf[ln] || '?', (perFn.get(fnOf[ln] || '?') || 0) + c);
console.log('wall', r.ms, 'ms, blocks', total, '=> ', (r.ms * 1000 / total).toFixed(2), 'us/block');
console.log('per function:'); [...perFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([f, c]) => console.log(String(c).padStart(12), (100 * c / total).toFixed(1).padStart(5) + '%', f));
console.log('per line:'); [...perLine.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).forEach(([ln, c]) => console.log(String(c).padStart(12), (100 * c / total).toFixed(1).padStart(5) + '%', 'L' + ln, (L.srcLines[ln - 1] || '').trim().slice(0, 120)));
