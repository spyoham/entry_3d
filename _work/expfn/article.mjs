// The pictures of the write-up (root: "엔트리 exp 함수 만든 방법"): two charts, two cards, and the three
// functions as the editor draws them (a function is one long row of blocks: cut into rows and stacked).
// usage: node article.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ensureServer } from '../gmp/erun.mjs';
import { HERE } from './lib.mjs';
import { NAME, VERSION } from './build.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const OUT = path.join(HERE, '..', '..', '엔트리 exp 함수 만든 방법');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

// ---------- charts and cards: plain HTML, photographed ----------
const CSS = `body{margin:0;background:#fff;font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#1c2330}
.wrap{width:1000px;padding:36px 44px;box-sizing:border-box}
h1{font-size:30px;margin:0 0 6px} .sub{font-size:19px;color:#5b6577;margin:0 0 26px}
.row{display:flex;align-items:center;margin:11px 0} .name{width:230px;font-size:22px;text-align:right;padding-right:16px;box-sizing:border-box}
.track{flex:1;position:relative;height:36px;border-left:1px solid #c5ccd8} .bar{height:36px;background:#3b74d6;border-radius:0 4px 4px 0}
.bar.dim{background:#9aa5b8} .val{position:absolute;top:3px;font-size:22px;font-weight:700;padding-left:10px}
.note{font-size:18px;color:#5b6577;margin-top:20px}
.card{border:1px solid #d5dbe6;border-radius:10px;padding:18px 24px;margin:14px 0} .card h2{font-size:23px;margin:0 0 10px}
.f{font-family:Consolas,"D2Coding",monospace;font-size:22px;line-height:1.7;white-space:pre-wrap}
.k{color:#2a5fc0;font-weight:700} table{border-collapse:collapse;font-size:20px;width:100%} td,th{border-bottom:1px solid #d5dbe6;padding:9px 8px;text-align:right} th:first-child,td:first-child{text-align:left}
th{color:#5b6577;font-weight:600}`;
const bars = (title, sub, rows, unit, note) => {
    const max = Math.max(...rows.map(r => r[1]));
    return `<div class="wrap"><h1>${title}</h1><p class="sub">${sub}</p>${rows.map(([n, v, dim]) =>
        `<div class="row"><div class="name">${n}</div><div class="track"><div class="bar${dim ? ' dim' : ''}" style="width:${(v / max * 78).toFixed(2)}%"></div><div class="val" style="left:${(v / max * 78).toFixed(2)}%">${v}${unit}</div></div></div>`).join('')}<p class="note">${note}</p></div>`;
};
const pages = {
    '사진1 속도 비교': bars('함수 한 번 부르는 데 걸리는 시간', '함수 몸통만, 실제 엔트리 엔진에서 측정 (짧을수록 빠름)',
        [['원본 (exp 종결)', 38.6, 1], ['exp 정밀', 31.7], ['exp', 20.5], ['exp 표', 18.3]], ' µs', '1 µs = 100만분의 1초. 부르는 쪽의 반복과 호출 비용 17.4 µs는 뺀 값. 회색 = 원본'),
    '사진2 블록 하나의 값': bars('블록 하나가 걸리는 시간', '같은 블록 20개를 이어 붙여 잰 값',
        [['제곱', 0.40], ['루트', 0.44], ['리스트 읽기', 0.47], ['ln, tan, 합치기', 0.5], ['몫', 0.65], ['나머지', 0.79], ['지역 변수 정하기', 0.92], ['빼기, 더하기', 1.4, 1], ['곱하기', 1.7, 1], ['나누기', 2.7, 1]], ' µs', '회색 = 사칙연산 (엔트리가 BigNumber로 계산). 파랑 = 그냥 실수 계산'),
    '사진3 원본과 새 방법': `<div class="wrap"><h1>e^x 를 만드는 두 가지 길</h1><p class="sub">둘 다 e^x = 10^n × e^r 로 나누고, 마지막에 뉴턴법으로 다듬는다</p>
<div class="card"><h2>원본 (exp 종결)</h2><div class="f">y = 10^n × (1 + r/128)^128          오차 0.5%
y = y × (1 + x − ln y)               뉴턴법 <span class="k">3번</span>
사칙연산 <span class="k">15개</span></div></div>
<div class="card"><h2>exp</h2><div class="f">y = tan(45° + r·K)^8192 에 "e" 와 n 을 글자로 붙임
                                     오차 0.00000076%
결과 = y − y × (ln y − x)            뉴턴법 <span class="k">1번</span>
사칙연산 <span class="k">4개</span></div></div>
<div class="card"><h2>왜 탄젠트인가</h2><div class="f">(1 + t)^N       = e^(Nt − N·t²/2 …)      제곱 항이 남는다
tan(45° + t)^N  = e^(2Nt + N·(4/3)t³ …)  제곱 항이 없다</div></div></div>`,
    '사진7 정확도': `<div class="wrap"><h1>정확도 (마지막 자리가 몇 칸 틀리나)</h1><p class="sub">구간마다 400개 값, 최대 / 평균. 1칸 = 17자리 숫자의 맨 끝 자리 하나</p>
<table><tr><th></th><th>|x| &lt; 1</th><th>|x| &lt; 10</th><th>|x| &lt; 100</th><th>|x| &lt; 700</th></tr>
<tr><td>원본 (exp 종결)</td><td>1.7 / 0.5</td><td>11 / 2.0</td><td>89 / 17</td><td>983 / 111</td></tr>
<tr><td>exp</td><td>1.4 / 0.4</td><td>12 / 2.0</td><td>98 / 18</td><td>1074 / 120</td></tr>
<tr><td>exp 정밀</td><td>2.8 / 0.7</td><td>2.8 / 0.7</td><td>2.3 / 0.7</td><td>3.1 / 0.7</td></tr>
<tr><td>exp 표</td><td>4.2 / 1.0</td><td>4.2 / 1.1</td><td>3.6 / 0.9</td><td>4.2 / 0.9</td></tr></table>
<div class="card" style="margin-top:26px"><h2>몇 가지 값</h2><table style="font-size:14.5px">
<tr><th>x</th><th>참값</th><th>exp</th><th>exp 정밀</th><th>exp 표</th></tr>
<tr><td>1</td><td>2.718281828459045</td><td>2.7182818284590455</td><td>2.718281828459045</td><td>2.718281828459046</td></tr>
<tr><td>ln 2</td><td>2</td><td>2</td><td>2</td><td>2.0000000000000004</td></tr>
<tr><td>100</td><td>2.6881171418161356e+43</td><td>2.6881171418161133e+43</td><td>2.6881171418161356e+43</td><td>2.688117141816135e+43</td></tr>
<tr><td>-1000</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>710</td><td>Infinity</td><td>NaN</td><td>Infinity</td><td>Infinity</td></tr></table></div></div>`,
};
const pg = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1.5 });
for (const [name, html] of Object.entries(pages)) {
    await pg.setContent(`<style>${CSS}</style>${html}`);
    await (await pg.$('.wrap')).screenshot({ path: path.join(OUT, name + '.png') });
}

// ---------- the functions in the editor ----------
await ensureServer();
const W = 7000;
const page = await browser.newPage({ viewport: { width: W, height: 700 } });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const b64 = fs.readFileSync(path.join(HERE, '..', '..', `${NAME} v${VERSION}.ent`)).toString('base64');
await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    Entry.clearProject(); Entry.loadProject(await r.json());
}, b64);
await page.waitForTimeout(2000);
const shots = ['사진4 exp 블록', '사진5 exp 정밀 블록', '사진6 exp 표 블록'];
const info = [];
for (let i = 0; i < 3; i++) {
    await page.evaluate((i) => Entry.Func.edit(Object.values(Entry.variableContainer.functions_)[i]), i);
    await page.waitForTimeout(1500);
    // the function's blocks alone, copied onto a white sheet over the page (the board dims the object's
    // own script behind them, and cuts off what does not fit)
    const box = await page.evaluate(() => {
        const g = Entry.Func.targetFunc.content.getThreads()[0].getFirstBlock().view.svgGroup;
        const bb = g.getBBox();
        document.getElementById('sheet')?.remove();
        const d = document.createElement('div');
        d.id = 'sheet';
        d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', bb.width + 12); svg.setAttribute('height', bb.height + 12);
        svg.style.cssText = 'display:block;background:#fff;';
        const c = g.cloneNode(true);
        c.setAttribute('transform', 'translate(' + (6 - bb.x) + ',' + (6 - bb.y) + ')');
        svg.appendChild(c); d.appendChild(svg); document.body.appendChild(d);
        return { width: bb.width + 12, height: bb.height + 12 };
    });
    const clip = { x: 0, y: 0, width: Math.min(box.width, W), height: box.height };
    const raw = await page.screenshot({ clip });
    await page.evaluate(() => document.getElementById('sheet').remove());
    info.push({ name: shots[i], w: Math.round(clip.width), h: Math.round(clip.height) });
    // cut the long row into rows of 1150 and stack them
    const RW = 1150, rows = Math.ceil(clip.width / RW);
    await pg.setViewportSize({ width: RW + 40, height: 400 });
    await pg.setContent(`<style>body{margin:0;background:#fff}.w{width:${RW + 40}px;padding:14px 20px;box-sizing:border-box;background:#fff}
.r{width:${RW}px;height:${clip.height}px;margin:8px 0;background:url(data:image/png;base64,${raw.toString('base64')}) no-repeat;border-radius:4px}</style>
<div class="w">${Array.from({ length: rows }, (_, k) => `<div class="r" style="background-position:-${k * RW}px 0"></div>`).join('')}</div>`);
    await (await pg.$('.w')).screenshot({ path: path.join(OUT, shots[i] + '.png') });
    await page.evaluate(() => (Entry.Func.cancelEdit ? Entry.Func.cancelEdit() : Entry.Func.save()));
    await page.waitForTimeout(800);
}
console.log(JSON.stringify(info), fs.readdirSync(OUT));
await browser.close();
