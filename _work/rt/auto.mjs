// Watch AUTO pick a level: node auto.mjs file.ent [seconds=24] [throttle=0] [keys]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const [file, secs = 24, throttle = 0, keys = ''] = process.argv.slice(2);
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(path.resolve(file))}`);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
if (Number(throttle)) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) }); }
await page.evaluate(() => window.__handle.start());
const key = (type, code, keyCode) => page.evaluate(([type, code, keyCode]) => document.body.dispatchEvent(new KeyboardEvent(type, { code, key: code, keyCode, which: keyCode, bubbles: true })), [type, code, keyCode]);
const g = () => page.evaluate(() => { const v = (n) => { const x = window.__vm.variables.find(v => v.name === n); return x ? x.value : null; }; return { q: v('qLevel'), tps: v('tpsNow'), rays: v('nsamp'), still: v('still'), hold: v('qHold'), err: window.__vm.errors.length, fr: window.__vm.frame, auto: v('autoQ'), il: v('ilace') }; });
let line = '';
for (let t = 0; t < Number(secs); t += 2) {
    if (keys && t === 8) await key('keydown', 'ArrowRight', 39);
    if (keys && t === 14) await key('keyup', 'ArrowRight', 39);
    await page.waitForTimeout(2000);
    const r = await g();
    line += ` ${t + 2}s:Q${r.q}/${r.tps}/f${r.fr}/r${r.rays}`;
    if (r.err) line += '!ERR';
}
console.log(line);
if (process.argv[6]) { const c = await page.$('canvas'); await c.screenshot({ path: process.argv[6] }); }
await browser.close();
