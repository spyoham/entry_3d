// what makes the project heavy: lists, functions, object scripts (JSON bytes and blocks)
import { buildProject } from '../build.mjs';
const { project } = buildProject('test/heavy.ent', {});
const lists = project.variables.filter(v => v.variableType === 'list');
const lb = lists.reduce((a, v) => a + JSON.stringify(v).length, 0);
const fb = project.functions.reduce((a, f) => a + f.content.length, 0);
const ob = project.objects.reduce((a, o) => a + JSON.stringify(o.script).length, 0);
console.log('total', JSON.stringify(project).length, 'lists', lb, 'functions', fb, 'objects', ob);
const fns = project.functions.map(f => ({ n: (f.content.match(/function_field_label","params":\["([^"]+)"/) || [])[1], blocks: f.content.split('"type"').length - 1, bytes: f.content.length })).sort((a, b) => b.blocks - a.blocks);
console.log(fns.slice(0, 15).map(f => `${f.n} ${f.blocks} ${(f.bytes / 1024).toFixed(0)}K`).join('\n'));
console.log('functions over 1500 blocks', fns.filter(f => f.blocks > 1500).length, 'over 800', fns.filter(f => f.blocks > 800).length);
const big = lists.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length).slice(0, 8).map(v => v.name + ' ' + v.array.length + ' ' + (JSON.stringify(v).length / 1024).toFixed(0) + 'K');
console.log(big.join('\n'));
