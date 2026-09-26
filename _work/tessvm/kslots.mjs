// Print the kernel's data slots (variable name, list?, length now vs planned).
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(path.resolve(process.argv[2]))}`);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
console.log(await page.evaluate(() => window.__vm.kernelPlan.slots.map(s => {
  const v = window.__vm.variables[s.variable];
  return `${v.name}${s.list ? '[' + s.length + '/' + v.array.length + ']' : '=' + v.value} ${s.read ? 'r' : ''}${s.written ? 'w' : ''}`;
}).join('\n')));
await browser.close();
