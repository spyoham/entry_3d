// what differs between two .ent builds: counts, and the biggest single items
// (functions by content size and by block count, lists, objects, variables)
import fs from 'node:fs';
import zlib from 'node:zlib';
export const readProject = (f) => {
    const tar = zlib.gunzipSync(fs.readFileSync(f));
    let off = 0;
    while (off + 512 <= tar.length) {
        const name = tar.slice(off, off + 100).toString().replace(/\0.*$/, '');
        if (!name) break;
        const size = parseInt(tar.slice(off + 124, off + 136).toString().replace(/\0.*$/, '').trim() || '0', 8);
        if (name === 'temp/project.json') return JSON.parse(tar.slice(off + 512, off + 512 + size).toString());
        off += 512 + Math.ceil(size / 512) * 512;
    }
};
const nb = (x) => { let n = 0; const go = (y) => { if (Array.isArray(y)) y.forEach(go); else if (y && typeof y === 'object') { if (y.type) n++; Object.values(y).forEach(go); } }; go(x); return n; };
const depth = (x) => { let m = 0; const go = (y, d) => { if (Array.isArray(y)) y.forEach(z => go(z, d)); else if (y && typeof y === 'object') { if (y.type) { m = Math.max(m, d); } Object.values(y).forEach(z => go(z, y.type ? d + 1 : d)); } }; go(x, 0); return m; };
if (import.meta.url === `file://${process.argv[1]}`) for (const f of process.argv.slice(2)) {
    const p = readProject(f);
    const fns = p.functions.map(fn => { const c = JSON.parse(fn.content); const lab = JSON.stringify(c).match(/"function_field_label","params":\["([^"]+)"/); return { name: lab ? lab[1] : fn.id, bytes: fn.content.length, blocks: nb(c), depth: depth(c), locals: (fn.localVariables || []).length }; });
    const by = (k) => [...fns].sort((a, b) => b[k] - a[k]).slice(0, 5).map(x => `${x.name}:${x[k]}`).join(' ');
    const v = p.variables, lists = v.filter(x => x.variableType === 'list');
    console.log(`== ${f}: vars ${v.length - lists.length} lists ${lists.length} funcs ${fns.length} objects ${p.objects.length} messages ${(p.messages || []).length}`);
    console.log('  by bytes ', by('bytes'));
    console.log('  by blocks', by('blocks'));
    console.log('  by depth ', by('depth'));
    console.log('  by locals', by('locals'));
    console.log('  object scripts', p.objects.map(o => `${o.name}:${o.script.length}:${nb(JSON.parse(o.script))}blk:${depth(JSON.parse(o.script))}deep`).join(' '));
    console.log('  names: longest var', Math.max(...v.map(x => x.name.length)), 'realtime', v.filter(x => x.isRealTime).length, 'cloud', v.filter(x => x.isCloud).length);
}
