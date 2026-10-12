// Models for the tests: the examples, and files written the awkward ways OBJ files are.
import { knot, vase, terrain, car } from '../models.mjs';

const cube = (o = 0) => [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => `v ${x + o} ${y} ${z}`);
// (outward: counter-clockwise seen from outside)
const cubeFaces = [[1, 4, 3, 2], [5, 6, 7, 8], [1, 2, 6, 5], [2, 3, 7, 6], [3, 4, 8, 7], [4, 1, 5, 8]];

// every awkward thing at once: comments holding the letters v and f, tabs, runs of spaces,
// CR LF, a joined line, a/b/c, a//c and a/b corners, negative numbers, a five-cornered face,
// numbers written +1, 1., .5 and 1e0, vertex colours, vn / vt / vp / s / g / o / l / p records,
// a material before any face, a material never defined, a face of a vertex that does not exist
export const awkward = () => [
    '# a test: v 1 f 2 are words of this comment, and so is this v',
    'mtllib none.mtl',
    'newmtl red', 'Ka 0.1 0.1 0.1', 'Kd 1 0.2 0.1', 'Ks 0.5 0.5 0.5', 'Ns 96.0', 'd 1', 'illum 2',
    'newmtl\tblue', '   Kd   0.1\t0.3   1.0  ',
    'o box one', 'g side v f',
    'v +1 1. -1 0.5 0.5 0.5', 'v 1e0 -1 -1', 'v -1 -1 -1.000', 'v -1 1 -1',
    'v 1 1 1', 'v 1.0 -1.0 1.0', 'v -1 -1 1', 'v -1 1 1 1.0',
    'vn 0 0 1', 'vn 0 1 0', 'vt 0.5 0.5', 'vt 0 0 0', 'vp 0.1 0.2',
    's 1', 'usemtl red',
    'f 1/1/1 2/2/1 3/1/1 4/2/1',
    'f 5//2 8//2 7//2 6//2',
    'usemtl blue',
    'f 1/1 5/2 6/1 2/2',
    'f -7 -3 \\', '  -2 -6',
    's off', 'usemtl nothing',
    'f 3 7 8 4', 'f 5 1 4 8',
    'l 1 2 3', 'p 4',
    '# a roof of five corners over it, and a face of a vertex that is not there',
    'v 1 1.5 -1', 'v 1 1.5 1', 'v 0 2.2 1', 'v -1 1.5 1', 'v -1 1.5 -1', 'v 0 2.2 -1',
    'f 10 11 12 13 14', 'f 9 10 99',
    'f 9 9 10',
].join('\r\n') + '\r\n';

export const CASES = [
    ['cube', ['# cube', ...cube(), ...cubeFaces.map(f => 'f ' + f.join(' '))].join('\n')],
    // (wound inwards: closed, and the normals are turned)
    ['cube-inside-out', ['# cube', ...cube(), ...cubeFaces.map(f => 'f ' + [...f].reverse().join(' '))].join('\n')],
    ['awkward', awkward()],
    // every face with vertices of its own (as a file made from an STL is): closed all the same
    ['cube-soup', ['# soup', ...cubeFaces.flatMap((f, k) => [...f.map(i => cube()[i - 1].replace(/-1/g, '-1.0')), `f ${k * 4 + 1} ${k * 4 + 2} ${k * 4 + 3}`, `f -4 -2 -1`])].join('\n')],
    ['car', car()],
    ['knot', knot({ normals: true })],
    ['vase', vase()],
    ['hills', terrain()],
    // a model of several pages, read with small pages so the page seams are many
    ['knot-pages', knot({ nu: 60, nv: 10 }), { PG: 300, LODMAX: 200, HKN: 311, LOD1MIN: 400, LOD2MIN: 100 }],
    // more than fits: the rest is left out
    ['knot-overflow', knot({ nu: 60, nv: 10, quads: false }), { PG: 60, NP: 4, NQ: 3, LOD1MIN: 100, LOD2MIN: 50, LODMAX: 40, HKN: 61 }],
    ['big-knot', knot({ p: 3, q: 7, nu: 420, nv: 18, R: 2.2, r: 0.9, tube: 0.3 })],
];
