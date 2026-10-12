// Builds "엔트리 OBJ 렌더러 모델 넣기.html" (repo root, opens straight from disk): the page that
// reads an OBJ file with the work's own program (its JS form) and hands back an .ent with
// the model already in its lists.
// usage: node gen-page.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject, NAME } from './build.mjs';
import { compileToJS } from './ejs.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const tmp = path.join(HERE, '.page.ent');
const { project, src, C } = buildProject(tmp);
fs.rmSync(tmp, { force: true });
const consts = Object.fromEntries(Object.entries(C).filter(([k]) => !['TESTOBJ', 'LEGACY', 'PLAIN', 'SLIM'].includes(k)));
const program = Object.entries(consts).map(([k, v]) => `const ${k}=${JSON.stringify(v)};`).join(String.fromCharCode(10)) + String.fromCharCode(10) + compileToJS([src]);
const DOT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const dotPath = project.objects.find(o => o.id === 'pen').sprite.pictures[0].fileurl;
const tpl = JSON.stringify({ project, program, consts: { NP: C.NP, NQ: C.NQ, PG: C.PG, BGCOL: C.BGCOL }, dot: DOT, dotPath }).replace(/</g, String.fromCharCode(92) + 'u003c');
const body = fs.readFileSync(path.join(HERE, 'page.src.html'), 'utf8').replace('/*TEMPLATE*/', () => tpl);
const full = ['<!doctype html>', '<html lang="ko">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width,initial-scale=1">', '</head>', '<body>', body, '</body>', '</html>', ''].join(String.fromCharCode(10));
const out = path.join(HERE, '..', '..', `${NAME} 모델 넣기.html`);
fs.writeFileSync(out, full);
console.log('wrote', out, full.length, 'bytes');
