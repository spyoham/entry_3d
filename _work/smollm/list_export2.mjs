// Second pass: move the remaining large variables/lists of the v2 .ent out to .txt files.
// Numbers are written without exponent notation (Entry '+' concatenates strings like "1e-7").
// usage: node list_export2.mjs <project.json in> <project.json out> <txt dir>
import fs from 'node:fs';
import path from 'node:path';
const [inp, outp, dir] = process.argv.slice(2);
const LISTS = ['EXPT', 'SILU', 'DG'];
const VARS = ['MG', 'LVE', ...Array.from({ length: 15 }, (_, k) => `ALP${k + 1}`)];
const num = (x) => {
    if (typeof x !== 'number') return String(x);
    let s = String(x);
    if (/e/i.test(s)) s = x.toFixed(22).replace(/0+$/, '').replace(/\.$/, '');
    return s;
};
const unsafe = (s) => /[\r\n\u0085\u2028\u2029]/.test(s) || s !== s.trim();
const p = JSON.parse(fs.readFileSync(inp, 'utf8'));
fs.mkdirSync(dir, { recursive: true });
for (const v of p.variables) {
    if (v.variableType === 'list' && LISTS.includes(v.name)) {
        const items = v.array.map((it) => num(it.data));
        for (const s of items) if (unsafe(s) || !/^-?\d+\.?\d*$/.test(s)) throw new Error('bad item ' + v.name + ' ' + s);
        for (let i = 0; i < items.length; i++) if (Math.abs(items[i] * 1 - v.array[i].data) > 1e-15 * Math.max(1, Math.abs(v.array[i].data))) throw new Error('precision ' + v.name);
        fs.writeFileSync(path.join(dir, v.name + '.txt'), items.join('\n'), 'utf8');
        console.log('list', v.name, items.length);
        v.array = [];
    }
    if (v.variableType === 'variable' && VARS.includes(v.name)) {
        const s = String(v.value);
        if (unsafe(s)) throw new Error('unsafe var ' + v.name);
        fs.writeFileSync(path.join(dir, `${v.name} (변수값).txt`), s, 'utf8');
        console.log('var', v.name, s.length);
        v.value = 0;
    }
}
fs.writeFileSync(outp, JSON.stringify(p));
