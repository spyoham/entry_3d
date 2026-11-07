// E7 for "노하우 팁/최적화": frames drawn on every other tick ("oxoxox") when a tick plus a draw no longer fit in 16 ms.
// The project only moves a sprite every tick. The harness adds a fixed cost to every tick (W ms) and to every
// draw (R ms) by busy-waiting, then logs when ticks run and when the stage really draws.
// usage: node skip.mjs  -> skip.json
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { B } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { ensureServer } from '../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const script = [B('when_run_button_click', [null]), B('repeat_inf', [null], [[
    B('move_x', [B('number', ['1']), null]), B('_if', [B('boolean_basic_operator', [B('coordinate_object', [null, 'self', null, 'x']), 'GREATER', B('number', ['200'])]), null], [[B('locate_x', [B('number', ['-200']), null])]])]])];
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const file = path.join(HERE, 'skip.ent');
packEnt(file, { name: '프레임 실험', tmpDir: path.join(HERE, '.pack-skip'), variables: [], functions: [], speed: 60,
    objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: [script] }] });

const CASES = [
    { W: 4, R: 2, tick: 16 }, { W: 10, R: 4, tick: 16 }, { W: 12, R: 6, tick: 16 }, { W: 8, R: 10, tick: 16 },
    { W: 14, R: 6, tick: 16 }, { W: 20, R: 4, tick: 16 }, { W: 12, R: 6, tick: 33 }, { W: 14, R: 6, tick: 33 }, { W: 12, R: 6, tick: 22 }, { W: 14, R: 6, tick: 22 }, { W: 2, R: 18, tick: 16 }, { W: 2, R: 34, tick: 16 },
];
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    Entry.clearProject(); Entry.loadProject(await r.json());
}, fs.readFileSync(file).toString('base64'));
await page.waitForTimeout(1500);
await page.evaluate(() => {
    Entry.engine.toggleRun();
    const S = window.__S = { W: 0, R: 0, n: 0, ticks: [], draws: [] };
    const busy = (ms) => { const e = performance.now() + ms; while (performance.now() < e); };
    const orig = Entry.engine.update;
    S.wrapped = () => { const t = performance.now(); orig(); S.n++; busy(S.W); S.ticks.push(t); };
    S.setTick = (ms) => { clearInterval(Entry.engine.ticker); Entry.tickTime = ms; Entry.engine.ticker = setInterval(S.wrapped, ms); };
    S.setTick(16);
    const of = Entry.stage.updateForce.bind(Entry.stage);
    Entry.stage.updateForce = () => { const t = performance.now(); of(); busy(S.R); S.draws.push([t, S.n]); };
});
const out = [];
for (const c of CASES) {
    await page.evaluate((c) => { const S = window.__S; S.W = c.W; S.R = c.R; if (Entry.tickTime !== c.tick) S.setTick(c.tick); }, c);
    await page.waitForTimeout(1000);
    await page.evaluate(() => { window.__S.ticks = []; window.__S.draws = []; window.__S.t0 = performance.now(); });
    await page.waitForTimeout(3000);
    const { ticks, draws, t0 } = await page.evaluate(() => ({ ticks: window.__S.ticks, draws: window.__S.draws, t0: window.__S.t0 }));
    const span = (performance.now ? 3000 : 3000) / 1000;
    const shown = new Set(draws.map(d => d[1]));
    const first = draws.length ? draws[0][1] : 0;
    let pattern = ''; for (let k = first; k < first + 24; k++) pattern += shown.has(k) ? 'o' : 'x';
    const r = { ...c, tps: +(ticks.length / span).toFixed(1), fps: +(draws.length / span).toFixed(1), pattern };
    out.push(r); console.log(JSON.stringify(r));
}
await browser.close();
fs.writeFileSync(path.join(HERE, 'skip.json'), JSON.stringify({ when: new Date().toISOString(), cases: out }, null, 1));
