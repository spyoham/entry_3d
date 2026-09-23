// Does opening Entry's 속성 > 변수/리스트 panel survive a project with ~75M chars of data?
// Loads an .ent, opens the variable view, then selects the list view, reporting heap and crashes.
//   node panel_test.mjs <file.ent>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');

const file = process.argv[2];
const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
let crashed = false;
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => { crashed = true; console.log('PAGE CRASHED'); });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
const heap = async (tag) => { try { console.log(tag, 'heap', await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6)), 'MB'); } catch (e) { console.log(tag, 'heap n/a', String(e.message).slice(0, 60)); } };

const b64 = fs.readFileSync(file).toString('base64');
console.log('loading', file);
const loaded = await page.evaluate(async (b) => {
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    if (!r.ok) return { ok: false, status: r.status };
    const project = await r.json();
    Entry.clearProject();
    Entry.loadProject(project);
    return { ok: true };
}, b64);
console.log('load', loaded);
await page.waitForTimeout(8000);
await heap('after load');

for (const step of [
    ['open 속성 (variable view)', () => { Entry.playground.changeViewMode('variable'); return 'ok'; }],
    ['select 리스트 tab', () => { Entry.variableContainer.selectFilter('list'); return 'ok'; }],
    ['click WALL (open its item list)', () => {
        const l = Entry.variableContainer.lists_.find((v) => v.name_ === 'WALL');
        Entry.variableContainer.select(l);
        return l ? 'selected ' + l.name_ : 'not found';
    }],
]) {
    const t = Date.now();
    try {
        const r = await page.evaluate(`(${step[1].toString()})()`);
        console.log(step[0], '->', r, Date.now() - t, 'ms');
    } catch (e) {
        console.log(step[0], '-> THREW', String(e.message).split('\n')[0].slice(0, 200), Date.now() - t, 'ms');
    }
    if (crashed) break;
    await page.waitForTimeout(3000);
    await heap('  ');
}
console.log('crashed:', crashed, '| errors:', errors.length ? errors.slice(0, 5) : 'none');
if (!crashed) await browser.close();
