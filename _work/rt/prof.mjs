// Line-level CPU profile of an .ent under tessvm: hot lines of the generated JS, and deopt reasons.
// usage: node prof.mjs file.ent [ms=4000] [warm=3000] [topLines=40]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const [file, ms = 4000, warm = 3000, top = 40] = process.argv.slice(2);
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(path.resolve(file))}`);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
await page.waitForTimeout(Number(warm));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
await cdp.send('Profiler.start');
await page.waitForTimeout(Number(ms));
const { profile } = await cdp.send('Profiler.stop');
const src = await page.evaluate(() => window.__progSrc);
fs.writeFileSync('prog.js', src);
const lines = src.split('\n');
const dt = new Map(); profile.samples.forEach((s, i) => dt.set(s, (dt.get(s) || 0) + (profile.timeDeltas[i] || 0)));
let total = 0; for (const t of dt.values()) total += t;
const lineT = new Map(), fnT = new Map(), deopt = new Map();
for (const n of profile.nodes) {
    const t = dt.get(n.id) || 0; const cf = n.callFrame;
    const key = cf.functionName + ' ' + cf.url.split('/').pop() + ':' + cf.lineNumber;
    fnT.set(key, (fnT.get(key) || 0) + t);
    if (n.deoptReason) deopt.set(key + ' :: ' + n.deoptReason, (deopt.get(key + ' :: ' + n.deoptReason) || 0) + 1);
    if ((!cf.url || cf.url.startsWith('VM')) && n.positionTicks) for (const p of n.positionTicks) lineT.set(p.line, (lineT.get(p.line) || 0) + p.ticks);
}
console.log('total ms', (total / 1000).toFixed(0));
for (const [k, t] of [...fnT].sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log((100 * t / total).toFixed(1).padStart(5) + '%  ' + k);
console.log('-- deopts'); for (const [k, c] of deopt) console.log(c, k);
const ticks = [...lineT.values()].reduce((a, b) => a + b, 0);
console.log('-- hot lines (of', ticks, 'ticks in the program)');
for (const [l, t] of [...lineT].sort((a, b) => b[1] - a[1]).slice(0, Number(top))) console.log(String(t).padStart(6), String(l).padStart(5), (lines[l - 3] || '').trim().slice(0, 150));
await browser.close();
