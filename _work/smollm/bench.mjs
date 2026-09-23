// Micro benchmark of candidate matvec lookup kernels in the real Entry runtime.
// node bench.mjs bench.ent  ->  node run-ent.mjs bench.ent --poll phase
import { compileProgram } from './ejs.mjs';
import { packEnt } from './pack.mjs';

const N = 20000, U = 32;
const ALPH = Array.from({ length: 64 }, (_, i) => String.fromCharCode(0xC0 + i)).join('');
let R = '', D3 = 'x', DG = 'x', D4 = 'x', RB = '', RE = '';
const BIG = Array.from({ length: 4864 }, (_, i) => String.fromCharCode(0x4E00 + i)).join('');
for (let k = 0; k < U; k++) { R += ALPH[(k * 37) % 64]; D3 += String(k * 97 % 999 + 1).padStart(3, '0'); DG += String(k % 9 + 1); D4 += String(k * 97 % 3999 + 1).padStart(4, '0'); RB += BIG[k * 7]; RE += BIG[4800 + k]; }
const list = (f) => Array.from({ length: U }, (_, k) => f(k));
// balanced combine tree (keeps Entry's recursive evaluation shallow)
const tree = (xs) => xs.length === 1 ? xs[0] : `str(${tree(xs.slice(0, xs.length >> 1))}, ${tree(xs.slice(xs.length >> 1))})`;
const variants = {
    base: `acc = 1;`,
    catlit: `acc = strlen(${tree(list(k => `Tu[${k * 100 + 50}]`))});`,
    catlitfar: `acc = strlen(${tree(list(k => `Tv[${k * 100 + 50}]`))});`,
    catsub4: `acc = strlen(${tree(list(k => `Tu[substr(D4, ${4 * k + 2}, ${4 * k + 5})]`))});`,
    catbigB: `acc = strlen(${tree(list(k => `Tu[indexOf(BIG, charAt(RB, ${k + 1}))]`))});`,
    catbigE: `acc = strlen(${tree(list(k => `Tu[indexOf(BIG, charAt(RE, ${k + 1}))]`))});`,
};
let src = `
let acc = 0; let phase = 0;
let ALPH = ${JSON.stringify(ALPH)}; let R = ${JSON.stringify(R)}; let D4 = ${JSON.stringify(D4)}; let BIG = ${JSON.stringify(BIG)}; let RB = ${JSON.stringify(RB)}; let RE = ${JSON.stringify(RE)};
let Tu = []; let res = [];
${Array.from({length:200},(_, i)=>`let dummy${i} = [];`).join(' ')}
let Tv = []; let T = [];
`;
const names = Object.keys(variants);
export const NAMES = names;
names.forEach((n) => {
    src += n === 'basefor'
        ? `function v_${n}() { acc = 0; for (const _ of rep(${N})) { acc = 1; } }\n`
        : `function v_${n}() { acc = 0; for (let i = 0; i < ${N}; i++) { ${variants[n]} } }\n`;
});
src += `on('start', 'bench', function () {
  for (let i = 0; i < 5000; i++) { T.push(i * 0.5); }
  let u = 'I'; for (let i = 0; i < 5000; i++) { Tu.push(u); Tv.push(u); u = str(u, 'I'); }
  waitSec(0.5);
  ${[0,1,2].flatMap(() => names).map((n, i) => `phase = ${i + 1}; waitSec(0.2); v_${n}(); res.push(acc); phase = ${i + 1}.5; waitSec(0.2);`).join('\n  ')}
  phase = 99;
});`;
const prog = compileProgram([src]);
// raw literals: replace number blocks by bare values inside the *raw variants
const unwrap = (b) => { if (Array.isArray(b)) return b.map(unwrap); if (!b || typeof b !== 'object') return b;
  if (b.type === 'number') return b.params[0]; if (b.params) b.params = b.params.map(unwrap); if (b.statements) b.statements = b.statements.map(unwrap); return b; };
for (const f of prog.functions) if (/raw$/.test(f.jsName)) {
  const c = JSON.parse(f.content);
  // only unwrap inside the loop body's set_variable expression
  const walk = (b) => { if (Array.isArray(b)) return b.forEach(walk); if (!b || typeof b !== 'object') return;
    if (b.type === 'set_variable' && b.params[1] && b.params[1].type === 'length_of_string') { b.params[1] = unwrap(b.params[1]); return; }
    (b.params || []).forEach(walk); (b.statements || []).forEach(walk); };
  walk(c); f.content = JSON.stringify(c);
}
{ const rank = (v) => v.name === 'Tv' ? 2 : v.name.startsWith('dummy') ? 1 : 0;
  prog.variables.sort((a, b) => rank(a) - rank(b)); }
import fs from 'node:fs'; fs.writeFileSync('bench.names.json', JSON.stringify(names));
const png1 = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
packEnt(process.argv[2] || 'bench.ent', {
    name: 'bench', variables: prog.variables, functions: prog.functions, messages: prog.messages,
    objects: [{ id: 'bench', name: 'bench', pictures: [{ id: '1', name: 'dot', buf: png1, w: 1, h: 1 }], script: prog.objectScripts.bench }],
    tmpDir: 'C:/Users/spyoh/AppData/Local/Temp/claude/C--Users-spyoh-entry-3d/ebda1c6e-ee56-400e-a489-09b972bc7df8/scratchpad/packtmp',
});
console.log('variants', names.join(','), 'terms per variant', N * U);
