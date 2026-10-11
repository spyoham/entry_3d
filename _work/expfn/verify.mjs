// The shipped files, as shipped: the functions are read back out of the .ent (and must be the .eo's too),
// then timed and graded in the real engine next to the reference.
// usage: node verify.mjs            (PER=points per range, default 400)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { bench, HERE } from './lib.mjs';
import { ref } from './cands.mjs';
import { ulpErr } from './hp.mjs';
import { NAME, VERSION } from './build.mjs';
const ROOT = path.join(HERE, '..', '..');
function member(file, name) {   // one file out of a .tar.gz
    const t = zlib.gunzipSync(fs.readFileSync(file));
    for (let o = 0; o + 512 <= t.length;) {
        const nm = t.toString('utf8', o, o + 100).replace(/\0.*$/, '');
        if (!nm) break;
        const size = parseInt(t.toString('ascii', o + 124, o + 136).replace(/\0.*$/, '').trim(), 8);
        if (nm === name) return t.subarray(o + 512, o + 512 + size).toString('utf8');
        o += 512 + Math.ceil(size / 512) * 512;
    }
    throw new Error(name + ' not in ' + file);
}
const proj = JSON.parse(member(path.join(ROOT, `${NAME} v${VERSION}.ent`), 'temp/project.json'));
const obj = JSON.parse(member(path.join(ROOT, `${NAME} v${VERSION}.eo`), 'object/object.json'));
if (JSON.stringify(proj.functions) !== JSON.stringify(obj.functions)) throw new Error('.ent and .eo carry different functions');
if (proj.objects[0].script !== obj.objects[0].script) throw new Error('.ent and .eo carry different scripts');
const shipped = proj.functions.map((fn, i) => ({ name: ['exp', 'expx'][i], prebuilt: { fn, id: fn.id } }));

let seed = 2026; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const RANGES = [['|x| < 0.001', 1e-3], ['|x| < 1', 1], ['|x| < 10', 10], ['|x| < 100', 100], ['|x| < 700', 700]];
const PER = Number(process.env.PER || 400);
const special = [0, 1, -1, Math.log(2), 0.5, 2, 10, -745.2, -1000, 709.78, 710];
const xt = [...RANGES.flatMap(([, w]) => Array.from({ length: PER }, () => (rnd() * 2 - 1) * w)), ...special];
const xs = Array.from({ length: 200 }, (_, i) => (i - 100) * 0.37 + 0.123456789);
const base = { name: 'id', locals: ['v'], body: [['v', 'x']], ret: '$v' };
const r = await bench([base, ref, ...shipped], { xs, xt, reps: 5, rounds: 14 });
const label = { ref: '원본 (exp 종결)', exp: 'exp', expx: 'exp 정밀' };
console.log(`call + loop alone: ${r[0].us.toFixed(1)} us`);
console.log('name'.padEnd(18), 'blocks', 'us/call'.padStart(8), ' | ', RANGES.map(([n]) => n.padStart(16)).join(''), '   (max, mean error in ulp)');
const stat = {};
for (const o of r.slice(1)) {
    const cols = RANGES.map((_, k) => {
        const e = o.values.slice(k * PER, (k + 1) * PER).map((v, i) => Math.abs(ulpErr(Number(v), xt[k * PER + i])));
        if (e.some(Number.isNaN)) throw new Error(o.name + ': not a number inside the range');
        return [Math.max(...e), e.reduce((a, b) => a + b, 0) / e.length];
    });
    stat[o.name] = { us: o.us - r[0].us, cols };
    console.log(label[o.name].padEnd(18), String(o.count).padStart(6), (o.us - r[0].us).toFixed(1).padStart(8), ' | ', cols.map(([m, a]) => `${m.toFixed(1).padStart(8)} ${a.toFixed(2).padStart(6)}`.padStart(16)).join(''));
}
console.log('\nx'.padEnd(21), 'Math.exp'.padEnd(24), Object.keys(stat).map(n => label[n].padEnd(24)).join(''));
special.forEach((x, i) => console.log(String(x).padEnd(20), String(Math.exp(x)).padEnd(24), r.slice(1).map(o => String(o.values[RANGES.length * PER + i]).padEnd(24)).join('')));
// what the manual says of them
const fail = [];
if (!(stat.exp.us < stat.ref.us * 0.65)) fail.push('exp is not 35% quicker than the reference');
if (!(stat.expx.us < stat.ref.us)) fail.push('exp 정밀 is not quicker than the reference');
if (!(stat.exp.cols[0][0] <= 2 && stat.exp.cols[1][0] <= 2)) fail.push('exp is off by more than 2 ulp under |x| < 1');
if (!stat.expx.cols.every(([m]) => m <= 4)) fail.push('exp 정밀 is off by more than 4 ulp somewhere');
console.log(fail.length ? 'FAIL: ' + fail.join('; ') : 'PASS');
process.exit(fail.length ? 1 : 0);
