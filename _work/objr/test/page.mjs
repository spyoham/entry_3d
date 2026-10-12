// The page that puts a model into the work: an OBJ file in, an .ent out, and that .ent run
// in plain Entry and in tessvm (the model must be there without any reading).
//   node test/page.mjs [file.obj|knot:NU:NV ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { runEnt } from '../../gmp/erun.mjs';
import { knot, vase } from '../models.mjs';
import { NAME } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const pageFile = path.join(HERE, '..', '..', '..', `${NAME} 모델 넣기.html`);
const tmp = path.join(HERE, '..', '.pagetest');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const args = process.argv.slice(2);
const inputs = args.length ? args : ['vase', 'knot:420:18'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1000, height: 1100 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(url.pathToFileURL(pageFile).href);
let bad = 0, k = 0;
for (const inp of inputs) {
    k++;
    const m = /^knot:(\d+):(\d+)(:tri)?$/.exec(inp);
    const text = inp === 'vase' ? vase() : m ? knot({ p: 3, q: 7, nu: +m[1], nv: +m[2], R: 2.2, r: 0.9, tube: 0.3, quads: !m[3] }) : fs.readFileSync(inp, 'utf8');
    const objFile = path.join(tmp, `m${k}.obj`);
    fs.writeFileSync(objFile, text);
    const t0 = Date.now();
    await page.setInputFiles('#file', objFile);
    await page.waitForFunction((n) => Number(document.body.dataset.done) >= n || document.body.dataset.error, k, { timeout: 120000 });
    const err = await page.evaluate(() => document.body.dataset.error);
    if (err) { console.log(inp, 'FAIL', err); bad++; continue; }
    const stats = await page.evaluate(() => [...document.querySelectorAll('#stats tr')].map(tr => tr.innerText.replace(/\s+/g, ' ')).join(' | '));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
    const ent = path.join(tmp, `m${k}.ent`);
    await dl.saveAs(ent);
    await page.screenshot({ path: path.join(HERE, '..', 'shots', `page_${k}.png`) });
    const want = await page.evaluate(() => { const R = state.P.R; return { nFaces: R.peek('nFaces'), nVerts: R.peek('nVerts'), nPages: R.peek('nPages'), nLv: R.peek('nLv'), closed: R.peek('closed') }; });
    const json = zlib.gunzipSync(fs.readFileSync(ent)).length;
    console.log(`${inp}: ${(text.length / 1024).toFixed(0)} KB -> ${(fs.statSync(ent).size / 1024).toFixed(0)} KB .ent (project ${(json / 1048576).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s; ${stats}`);
    const same = (got) => Object.keys(want).every(key => String(got[key]) === String(want[key]));
    // plain Entry: the model itself is up without any reading
    const r = await runEnt(ent, { vars: ['nFaces', 'nVerts', 'nPages', 'nLv', 'closed', 'shownLv', 'ldOn', 'shownOut'], timeout: 20000, hiresTimer: false,
        after: async (pg) => { const d = await pg.evaluate(() => document.querySelector('#entryCanvas').toDataURL('image/png')); fs.writeFileSync(path.join(HERE, '..', 'shots', `page_${k}_entry.png`), Buffer.from(d.split(',')[1], 'base64')); } });
    const okE = same(r.vars) && r.vars.shownLv == 1 && r.vars.ldOn == 0 && !r.errors.length;
    console.log('  entry ', okE ? 'PASS' : 'FAIL', JSON.stringify(r.vars), r.errors.slice(0, 2).join(' '));
    if (!okE) bad++;
    // tessvm (its vm in Node)
    const EXT = path.join(HERE, '../../tessvm/ext');
    const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
    const d = path.join(tmp, 'x'); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    cp.execSync('tar -xf -', { cwd: d, input: zlib.gunzipSync(fs.readFileSync(ent)) });
    const work = JSON.parse(fs.readFileSync(path.join(d, 'temp/project.json'), 'utf8')); work.id = 'local';
    const { toTessProject } = await imp('page/tess-project.js');
    const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
    const vm = new Vm({ kernel: null, store: null });
    vm.load(toTessProject(work).project);
    vm.start();
    const get = (n) => { const v = vm.variables.find(v => v.name === n); return v ? v.value : undefined; };
    let ticks = 0;
    for (; ticks < 600; ticks++) { vm.tick(); if (get('shownLv') == 1 && ticks > 20) break; }
    const got = Object.fromEntries(['nFaces', 'nVerts', 'nPages', 'nLv', 'closed', 'shownLv', 'ldOn'].map(n => [n, get(n)]));
    const okT = same(got) && got.shownLv == 1 && got.ldOn == 0 && !vm.errors.length;
    console.log('  tessvm', okT ? 'PASS' : 'FAIL', 'ticks', ticks, JSON.stringify(got), JSON.stringify(vm.errors.slice(0, 2)));
    if (!okT) bad++;
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
