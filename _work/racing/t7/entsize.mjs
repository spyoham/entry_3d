// what makes up an .ent: project.json size, per-section bytes, longest lists,
// counts of variables / lists / functions / blocks, biggest scripts
// usage: node t7/entsize.mjs file.ent [...]
import fs from 'node:fs';
import zlib from 'node:zlib';
const readEnt = (f) => {
    const tar = zlib.gunzipSync(fs.readFileSync(f));
    let off = 0; const files = {};
    while (off + 512 <= tar.length) {
        const name = tar.slice(off, off + 100).toString().replace(/\0.*$/, '');
        if (!name) break;
        const size = parseInt(tar.slice(off + 124, off + 136).toString().replace(/\0.*$/, '').trim() || '0', 8);
        files[name] = tar.slice(off + 512, off + 512 + size);
        off += 512 + Math.ceil(size / 512) * 512;
    }
    return files;
};
for (const f of process.argv.slice(2)) {
    const files = readEnt(f);
    const pj = files['temp/project.json'];
    const p = JSON.parse(pj.toString());
    const sec = Object.fromEntries(Object.keys(p).map(k => [k, JSON.stringify(p[k]).length]));
    const vars = p.variables || [];
    const lists = vars.filter(v => v.variableType === 'list');
    const longest = lists.map(l => [l.name, (l.array || []).length, JSON.stringify(l.array || []).length]).sort((a, b) => b[2] - a[2]).slice(0, 8);
    const objs = p.objects.map(o => [o.name, o.script.length]);
    const funcs = (p.functions || []).map(fn => [fn.id, fn.content.length]).sort((a, b) => b[1] - a[1]);
    let blocks = 0; const count = (x) => { if (Array.isArray(x)) x.forEach(count); else if (x && typeof x === 'object') { if (x.type) blocks++; Object.values(x).forEach(count); } };
    for (const o of p.objects) count(JSON.parse(o.script));
    for (const fn of p.functions || []) count(JSON.parse(fn.content));
    const other = Object.entries(files).filter(([n]) => n !== 'temp/project.json').reduce((a, [, b]) => a + b.length, 0);
    console.log(`== ${f}: ent ${fs.statSync(f).size} B, project.json ${pj.length} B, assets ${other} B`);
    console.log('  sections', JSON.stringify(sec));
    console.log(`  variables ${vars.length - lists.length}, lists ${lists.length}, functions ${(p.functions || []).length}, blocks ${blocks}, list items total ${lists.reduce((a, l) => a + (l.array || []).length, 0)}`);
    console.log('  biggest lists [name, items, bytes]', JSON.stringify(longest));
    console.log('  objects [name, script bytes]', JSON.stringify(objs));
    console.log('  biggest functions', JSON.stringify(funcs.slice(0, 5)), 'total', funcs.reduce((a, b) => a + b[1], 0));
}
