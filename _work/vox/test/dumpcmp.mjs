// node test/dumpcmp.mjs a b : two dumps of test/tess.mjs (LOAD=n DUMP=1, TAG=a / TAG=b) - the columns both made hold
// the same cells and light, and every section meshed in b is the same in a (faces as a set, what it lets see through)
import fs from 'node:fs';
if (process.argv.length < 4) { console.log('usage: node test/dumpcmp.mjs a b (dumps of test/tess.mjs LOAD=n DUMP=1 with TAG=a, TAG=b)'); process.exit(0); }
const [a, b] = process.argv.slice(2).map((n) => JSON.parse(fs.readFileSync(new URL('./dump_' + n + '.json', import.meta.url), 'utf8')));
let wc = 0, lc = 0, nc = 0, sf = 0, sv = 0, sn = 0, miss = 0; const ex = [];
for (const k of Object.keys(b.cols)) { if (!a.cols[k]) continue; nc++; if (a.cols[k][0] !== b.cols[k][0]) { wc++; if (ex.length < 6) ex.push('cells ' + k); } if (a.cols[k][1] !== b.cols[k][1]) { lc++; if (ex.length < 6) ex.push('light ' + k); } }
for (const k of Object.keys(b.secs)) { if (!a.secs[k]) { miss++; continue; } sn++; if (a.secs[k][0] !== b.secs[k][0] || a.secs[k][1] !== b.secs[k][1]) { sf++; if (ex.length < 12) ex.push('faces ' + k + ' ' + a.secs[k][0] + '/' + b.secs[k][0]); } if (a.secs[k][2] !== b.secs[k][2]) { sv++; if (ex.length < 12) ex.push('vis ' + k); } }
console.log('columns in both', nc, '(a', Object.keys(a.cols).length, 'b', Object.keys(b.cols).length + '): cells differ', wc, 'light differs', lc);
console.log('sections of b in a', sn, '(a', Object.keys(a.secs).length, 'b', Object.keys(b.secs).length, 'only in b', miss + '): faces differ', sf, 'vis differs', sv);
if (ex.length) console.log(ex.join('; '));
console.log(wc + lc + sf + sv === 0 ? 'all the same' : 'DIFFERENT');
