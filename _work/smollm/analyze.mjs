// min time per variant from run-ent --poll output (b.log) ; waits of 0.2s subtracted
import fs from 'node:fs';
const names = JSON.parse(fs.readFileSync('bench.names.json', 'utf8'));
const terms = Number(process.argv[2] || 640000);
const L = fs.readFileSync('b.log', 'utf8').split('\n').filter(l => l.startsWith('poll')).map(l => { const m = l.match(/=([\d.]+) at (\d+)/); return [Number(m[1]), Number(m[2])]; });
const best = {};
for (let i = 0; i < L.length - 1; i++) if (Number.isInteger(L[i][0]) && L[i][0] > 0 && L[i][0] < 99) { const d = L[i + 1][1] - L[i][1] - 200; const n = names[(L[i][0] - 1) % names.length]; best[n] = Math.min(best[n] ?? 1e9, d); }
for (const n of names) console.log(n.padEnd(12), String(best[n]).padStart(6), 'ms', ((best[n] - best.base) / terms * 1000).toFixed(2), 'us/term');
