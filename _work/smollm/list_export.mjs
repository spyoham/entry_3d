// Export the big weight lists of a SmolLM .ent to one-item-per-line .txt files and empty them.
// Row strings use all 256 Latin-1 chars; the line-breaking/control ones (C0, DEL, C1) are
// remapped to U+0100.. in both the list data and the alphabet variables (ALP0-15, ALPH, EMB).
// usage: node list_export.mjs <project.json in> <project.json out> <txt dir> [EMB source .ent project.json]
import fs from 'node:fs';
import path from 'node:path';
const [inp, outp, dir, embSrc] = process.argv.slice(2);
const BIG = ['WALL', 'LVALL', 'LVMALL', 'SPALL'];
const bad = [];
for (let c = 0; c < 0x20; c++) bad.push(c);
for (let c = 0x7f; c <= 0x9f; c++) bad.push(c);
const map = new Map(bad.map((c, i) => [String.fromCharCode(c), String.fromCharCode(0x100 + i)]));
const re = /[\x00-\x1f\x7f-\x9f]/g;
const fix = (s) => s.replace(re, (ch) => map.get(ch));
const p = JSON.parse(fs.readFileSync(inp, 'utf8'));
fs.mkdirSync(dir, { recursive: true });
for (const v of p.variables) {
    if (v.variableType === 'list' && BIG.includes(v.name)) {
        const items = v.array.map((it) => fix(String(it.data)));
        for (const s of items) if (/[\r\n\u0085\u2028\u2029]/.test(s) || s !== s.trim()) throw new Error('unsafe item in ' + v.name);
        fs.writeFileSync(path.join(dir, v.name + '.txt'), items.join('\n'), 'utf8');
        console.log(v.name, items.length, 'items', (fs.statSync(path.join(dir, v.name + '.txt')).size / 1e6).toFixed(1), 'MB');
        v.array = [];
    }
    if (v.variableType === 'variable' && (/^ALP\d+$/.test(v.name) || v.name === 'ALPH')) {
        v.value = fix(String(v.value));
        if (new Set(v.value.replace(/가/g, '')).size !== 256) throw new Error('alphabet ' + v.name);
    }
}
if (embSrc) {
    const e = JSON.parse(fs.readFileSync(embSrc, 'utf8')).variables.find((v) => v.name === 'EMB').value;
    fs.writeFileSync(path.join(dir, 'EMB (변수값).txt'), fix(e), 'utf8');
    console.log('EMB', e.length, 'chars');
}
fs.writeFileSync(outp, JSON.stringify(p));
