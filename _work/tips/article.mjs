// The pictures of the write-up "노하우 팁/최적화": charts from result.json (bench.mjs), cards, and
// block scripts as the editor draws them (a small demo project, each script cut out on white).
// usage: node article.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { ensureServer } from '../gmp/erun.mjs';
import { B, newId } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const OUT = path.join(HERE, '..', '..', '노하우 팁', '최적화');
fs.mkdirSync(OUT, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.join(HERE, 'result.json'), 'utf8'));
const R2 = JSON.parse(fs.readFileSync(path.join(HERE, 'result2.json'), 'utf8')).results;   // bench2.mjs
const u2 = (k) => (R2[k].us ?? R2[k].usPerClone).toFixed(1);
const one = (k) => Number(R.results[k][0]);
const best = (k) => Math.min(...R.results['E3 ' + k].map(Number));
const empty = best('empty loop');
const stmt = (k) => best(k) - empty;      // one statement, the loop's share taken off
const f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);

const CSS = `body{margin:0;background:#fff;font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#1c2330}
.wrap{width:1000px;padding:36px 44px;box-sizing:border-box;background:#fff}
h1{font-size:30px;margin:0 0 6px} .sub{font-size:19px;color:#5b6577;margin:0 0 26px}
.row{display:flex;align-items:center;margin:10px 0} .name{width:300px;font-size:21px;text-align:right;padding-right:16px;box-sizing:border-box}
.track{flex:1;position:relative;height:34px;border-left:1px solid #c5ccd8} .bar{height:34px;background:#3b74d6;border-radius:0 4px 4px 0}
.bar.dim{background:#9aa5b8} .bar.warn{background:#d0613f} .val{position:absolute;top:3px;font-size:21px;font-weight:700;padding-left:10px;white-space:nowrap}
.note{font-size:18px;color:#5b6577;margin-top:20px;line-height:1.5}
.card{border:1px solid #d5dbe6;border-radius:10px;padding:18px 24px;margin:14px 0} .card h2{font-size:23px;margin:0 0 10px}
table{border-collapse:collapse;font-size:20px;width:100%} td,th{border-bottom:1px solid #d5dbe6;padding:10px 8px;text-align:left;vertical-align:top} th{color:#5b6577;font-weight:600}
td.r,th.r{text-align:right} .k{color:#2a5fc0;font-weight:700} .bad{color:#c4472a;font-weight:700} .good{color:#2a7f4f;font-weight:700}
.grp{font-size:19px;color:#5b6577;margin:18px 0 2px 300px;font-weight:600}`;
// rows: [name, value, style, label?] or ['#group title']
const bars = (title, sub, rows, unit, note, digits = 1) => {
    const vals = rows.filter(r => r[0][0] !== '#').map(r => r[1]);
    const max = Math.max(...vals);
    return `<div class="wrap"><h1>${title}</h1><p class="sub">${sub}</p>${rows.map((r) => {
        if (r[0][0] === '#') return `<div class="grp">${r[0].slice(1)}</div>`;
        const [n, v, cls = '', label] = r; const w = Math.max(v / max * 74, 0.4).toFixed(2);
        return `<div class="row"><div class="name">${n}</div><div class="track"><div class="bar ${cls}" style="width:${w}%"></div><div class="val" style="left:${w}%">${label ?? v.toFixed(digits) + unit}</div></div></div>`;
    }).join('')}<p class="note">${note}</p></div>`;
};

// ---------- 사진1: 틱과 화면 ----------
const tl = (() => {
    const X = (ms) => 40 + ms * 13;            // 16 ms = 208 px
    let s = '';
    for (let t = 0; t <= 64; t += 16) s += `<div style="position:absolute;left:${X(t)}px;top:40px;height:330px;border-left:1px dashed #c5ccd8"></div><div style="position:absolute;left:${X(t) - 16}px;top:378px;font-size:17px;color:#5b6577">${t} ms</div>`;
    const box = (ms, w, top, text, color) => `<div style="position:absolute;left:${X(ms)}px;top:${top}px;width:${w * 13}px;height:40px;background:${color};color:#fff;font-size:16px;line-height:40px;padding:0 6px;box-sizing:border-box;border-radius:4px;overflow:hidden;white-space:nowrap">${text}</div>`;
    const lab = (top, text) => `<div style="position:absolute;left:0;top:${top}px;font-size:19px;font-weight:700">${text}</div>`;
    s += lab(52, '① 보통 반복: 틱마다 한 바퀴') + lab(172, '② 무지연 반복: 한 틱에 수천 바퀴') + lab(292, '③ 화면 그리기 (따로 도는 시계)');
    for (let t = 0; t < 64; t += 16) s += box(t + 0.5, 3.4, 84, '바퀴', '#3b74d6') + box(t + 4.1, 11.4, 84, '쉼', '#c9d0dc');
    s += box(0.5, 10.5, 204, '수천 바퀴', '#2a7f4f') + box(11.2, 4.3, 204, '쉼', '#c9d0dc');
    for (let t = 0; t < 64; t += 16) s += box(t + 4, 5, 324, '그리기', '#d08a2f');
    return `<div class="wrap"><h1>엔트리는 16 ms마다 한 번씩 블록을 실행한다</h1><p class="sub">엔진 틱(초당 62.5번)과 화면 그리기는 서로 다른 시계로 돈다</p>
<div style="position:relative;height:410px">${s}</div>
<p class="note">틱마다 모든 스크립트가 한 번씩 차례로 실행되고, 스크립트는 "쉬는 지점"을 만나면 다음 틱으로 넘긴다. 반복 블록은 몸체를 한 번 끝낼 때마다 쉰다. 화면은 틱 사이에만 그려지므로, 한 틱이 길어지면 화면도 그만큼 늦어진다.</p></div>`;
})();

// ---------- 사진7: 붓 쌓기 (SVG 꺾은선) ----------
const pen = (() => {
    const W = 860, H = 380, P = 60;
    const A = R.FA.map(Number), Bv = R.FB.map(Number), n = A.length, max = Math.ceil(Math.max(...Bv) / 100) * 100;
    const x = (i) => P + i * (W - P - 20) / (n - 1), y = (v) => H - 40 - v * (H - 70) / max;
    const line = (arr, c) => `<polyline fill="none" stroke="${c}" stroke-width="4" points="${arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
    let grid = '';
    for (let v = 0; v <= max; v += 100) grid += `<line x1="${P}" x2="${W - 20}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e7ef"/><text x="${P - 10}" y="${y(v) + 6}" font-size="16" text-anchor="end" fill="#5b6577">${v}</text>`;
    for (let i = 0; i < n; i += 10) grid += `<text x="${x(i)}" y="${H - 12}" font-size="16" text-anchor="middle" fill="#5b6577">${i + 1}</text>`;
    const avg = (a) => a.slice(1).reduce((s, v) => s + v, 0) / (a.length - 1);
    return `<div class="wrap"><h1>붓 그림을 지우지 않고 쌓으면 점점 느려진다</h1><p class="sub">장마다 선 ${300}개를 긋는다. 한 장에 걸린 시간(ms), 가로축은 몇 번째 장</p>
<svg width="${W}" height="${H}" font-family="Malgun Gothic">${grid}${line(A, '#3b74d6')}${line(Bv, '#d0613f')}
<text x="${x(2)}" y="${y(max) + 4}" font-size="19" text-anchor="start" fill="#d0613f" font-weight="700">지우지 않음 (선 ${(300 * n).toLocaleString()}개까지 쌓임)</text>
<text x="${x(n - 1) - 6}" y="${y(avg(A)) - 14}" font-size="19" text-anchor="end" fill="#3b74d6" font-weight="700">장마다 "모든 붓 지우기" (평균 ${Math.round(avg(A))} ms)</text></svg>
<p class="note">그은 선은 지울 때까지 모두 남아 있고, 화면을 그릴 때마다 처음부터 다시 그려진다. 그래서 지우지 않으면 그린 양에 비례해 한 장이 길어진다. (이 측정은 편집기의 CreateJS 그리기에서 했다. WebGL 그리기에서는 선을 하나 그을 때마다 그 붓의 선 전체를 다시 나눈다.)</p></div>`;
})();

const E2v = (k) => one('E2 ' + k);
const pages = {
    '사진1 틱과 화면': tl,
    '사진2 반복 방식 비교': bars('반복 1000바퀴에 걸리는 시간', '몸체는 "x를 (x + 1)로 정하기" 하나. 실제 엔트리 엔진에서 측정',
        [['보통 반복하기', one('E1 plain') * 1000, 'warn', `${Math.round(one('E1 plain') * 1000).toLocaleString()} ms (16초)`],
         ['무지연 반복', one('E1 trick') * 1000, '', `${f1(one('E1 trick') * 1000)} ms`],
         ['재귀 함수', one('E1 recursion') * 1000, '', `${f1(one('E1 recursion') * 1000)} ms`]], ' ms',
        `보통 반복은 한 바퀴마다 다음 틱(16 ms)까지 쉰다. 무지연 반복은 약 ${Math.round(one('E1 plain') / one('E1 trick')).toLocaleString()}배, 재귀 함수는 약 ${Math.round(one('E1 plain') / one('E1 recursion')).toLocaleString()}배 빠르다. 막대가 안 보일 만큼 짧다.`),
    '사진4 숨은 쉼표': bars('무지연 반복 안에서 한 바퀴에 걸리는 시간', '같은 무지연 반복에 아래 블록 하나를 넣었다',
        [['만일/아니면, 양쪽 다 채움', E2v('if-else both filled'), '', `${f2(E2v('if-else both filled'))} ms`],
         ['빈 "아니면", 그쪽으로 안 감', E2v('empty else, not taken'), '', `${f2(E2v('empty else, not taken'))} ms`],
         ['빈 "아니면"으로 들어감', E2v('empty else, taken'), 'warn', `${f1(E2v('empty else, taken'))} ms`],
         ['빈 함수 부르기', E2v('empty function call'), 'warn', `${f1(E2v('empty function call'))} ms`],
         ['0 초 기다리기', E2v('wait 0 seconds'), 'warn', `${f1(E2v('wait 0 seconds'))} ms`]], ' ms',
        '빨간 막대는 한 바퀴마다 한 틱(16 ms)을 쉰 것. 빈 가지로 들어가거나 빈 함수를 부르면, 엔트리는 "실행할 첫 블록이 없다"며 그 자리에서 다음 틱으로 넘긴다. 무지연 반복이 1000배 느려진다.'),
    '사진6 블록 하나의 값': bars('계산 블록 하나가 걸리는 시간', '함수의 지역 변수에 계산 결과를 넣는 문장 하나 (9번 재서 가장 짧은 값, µs)',
        [['지역 변수 = 1', stmt('local = 1'), 'dim'], ['지역 변수 = 전역 변수 c', stmt('local = c'), 'dim'],
         ['#변수 둘을 읽어 계산'],
         ['c + d (소수)', stmt('local = c + d (decimal)'), 'warn'], ['c × d (소수)', stmt('local = c × d (decimal)'), 'warn'], ['c ÷ d (소수)', stmt('local = c ÷ d (decimal)'), 'warn'],
         ['a + b (정수)', stmt('local = a + b (whole)'), 'warn'],
         ['c + d 옛 블록', stmt('local = c + d (old block)')], ['c × d 옛 블록', stmt('local = c × d (old block)')],
         ['몫 (a ÷ b)', stmt('local = quotient a / b')],
         ['#하나를 읽어 계산'], ['c 의 제곱', stmt('local = square of c')], ['리스트 37번째 항목', stmt('local = item 37 of list')]], ' µs',
        '빨간 막대 = 보통 사칙연산 블록. 엔트리는 소수 오차를 없애려고 큰 수 계산 도구(BigNumber)로 사칙연산을 한다. 옛 사칙연산 블록, 제곱, 몫, 리스트 읽기는 그냥 계산한다. 전역 변수 읽기에도 0.3 µs쯤 든다.', 2),
    '사진7 값을 담는 곳': bars('값 하나를 담는 데 걸리는 시간', '문장 하나 (9번 재서 가장 짧은 값, µs)',
        [['함수 지역 변수에 정하기', stmt('local = 1')], ['숨긴 리스트의 항목 바꾸기', stmt('replace item, hidden list')],
         ['숨긴 전역 변수에 정하기', stmt('global x = 1 (hidden)'), 'warn'], ['보이는 전역 변수에 정하기', stmt('global xv = 1 (shown)'), 'warn'],
         ['전역 변수에 1 만큼 더하기', stmt('change x by 1'), 'warn'], ['보이는 리스트의 항목 바꾸기', stmt('replace item, shown list'), 'warn']], ' µs',
        '전역 변수는 값을 바꿀 때마다 화면의 변수 창을 고치고 다시 그리기를 요청한다(숨겨도 일부는 남는다). 보이는 리스트는 바꿀 때마다 보이는 줄을 모두 새로 만든다. 계산 중간값은 함수 지역 변수나 숨긴 리스트에 두고, 전역 변수에는 마지막에 한 번만 넣는다.', 1),
    '사진8 붓 쌓기': pen,
    '사진9 숫자 함정': `<div class="wrap"><h1>엔트리 숫자 블록의 함정</h1><p class="sub">실제 엔트리 엔진에서 계산한 값</p>
<table><tr><th>블록</th><th>결과</th><th>알아 둘 점</th></tr>
<tr><td>0.5 에 (0.00000012 × 1) 만큼 더하기</td><td class="bad">${R.results['E5 0.5 change by (0.00000012 x 1)'][0]}</td><td>"만큼 더하기"는 두 값 가운데 소수 자릿수가 긴 쪽에 맞춰 반올림한다. 그런데 자릿수를 글자로 세서, 1.2e-7 처럼 지수로 적힌 수는 "2e-7" 네 글자를 네 자리로 본다</td></tr>
<tr><td>0.5 를 (0.5 + 0.00000012) 로 정하기</td><td class="good">${R.results['E5 0.5 set to w + 0.00000012'][0]}</td><td>소수를 쌓을 때는 "정하기"를 쓴다</td></tr>
<tr><td>0.1 + 0.2</td><td class="good">${R.results['E5 0.1 + 0.2'][0]}</td><td>보통 사칙연산은 십진 계산이라 딱 맞는다</td></tr>
<tr><td>0.1 + 0.2 (옛 블록)</td><td>${R.results['E5 0.1 + 0.2 old block'][0]}</td><td>옛 블록은 그냥 계산이라 끝자리가 흔들린다. 정수끼리는 같다</td></tr>
<tr><td>0.000000000000001 ÷ 7</td><td class="bad">${R.results['E5 1e-15 / 7'][0]}</td><td>나눗셈은 소수 20자리에서 반올림한다. 아주 작은 몫은 유효숫자가 줄어든다</td></tr>
<tr><td>1 ÷ 300000000000000000000</td><td class="bad">${R.results['E5 1 / 3e20'][0]}</td><td>몫이 0.00000000000000000001 보다 작으면 0</td></tr>
<tr><td>0.0001 부터 0.9999 사이의 무작위 수, 2000번</td><td class="bad">0 이 ${R.results['E5 zeros of rand(0.0001,0.9999) in 2000'][0]}번</td><td>경계에 소수가 있으면 소수 둘째 자리로 반올림한다. (0 부터 999999 사이의 무작위 수) ÷ 1000000 을 쓴다</td></tr>
</table></div>`,
    '사진10 여러 블록의 값': (() => {
        const row = (name, k, note, cls = '') => `<tr><td>${name}</td><td class="r ${cls}">${u2(k)} µs</td><td>${note}</td></tr>`;
        const grp = (t) => `<tr><td colspan="3" style="color:#5b6577;font-weight:600;padding-top:16px">${t}</td></tr>`;
        return `<div class="wrap"><h1>여러 블록이 걸리는 시간</h1><p class="sub">문장 하나 (7번 재서 가장 짧은 값). 비교: 지역 변수 = 1 은 0.9 µs, 소수 더하기는 2.9 µs</p>
<table><col style="width:330px"><col style="width:120px"><col>
${grp('변수 찾기')}
${row('전역 변수 읽기 (맨 앞 변수)', 'local = global made first of 300', '')}
${row('전역 변수 읽기 (300개 뒤 변수)', 'local = global made last of 300', '엔진은 변수를 목록 앞에서부터 찾는다', 'bad')}
${row('함수 매개변수 읽기', 'local = parameter', '찾지 않고 바로 꺼낸다', 'good')}
${grp('리스트 (4000칸, 숨김)')}
${row('맨 뒤에 넣기 / 지우기', 'add at end, delete last (each)', '')}
${row('맨 앞에 넣기 / 지우기', 'insert at 1, delete 1 (each)', '4000칸에서는 맨 뒤와 거의 같다')}
${row('2000번째 항목 읽기', 'local = item 2000 of 4000', '몇 번째든 같다')}
${row('~이(가) 포함되어 있는가 (없음)', 'local = list contains (absent)', '처음부터 끝까지 본다. 길이에 비례', 'bad')}
${grp('글자')}
${row('합치기 / n번째 글자 / 길이', 'local = join two texts', '1.3 ~ 1.8 µs. 사칙연산보다 싸다')}
${grp('오브젝트 (CreateJS 그리기)')}
${row('x: y: 위치로 이동하기', 'move to x: y:', '')}
${row('방향 정하기', 'turn to (direction)', '')}
${row('모양 바꾸기', 'change costume', '')}
${row('투명도 효과 바꾸기', 'change transparency', '')}
${row('색깔 효과 바꾸기', 'change color effect', '투명도의 두 배')}
${row('글상자 쓰기', 'textbox write', '블록만. 글자 그림은 그릴 때 만든다')}
${row('말하기', 'say (speech bubble)', '', 'bad')}
${row('~에 닿았는가 (멀리 있음)', 'local = touching other object', '상자가 안 겹치면 바로 끝난다')}
${row('~에 닿았는가 (겹쳐 있음)', 'local = touching overlapping object', '겹치면 픽셀까지 비교한다', 'bad')}
${grp('복제본과 신호')}
${row('복제본 만들기', 'create clone (plain)', '')}
${row('복제본 만들기 (지역 리스트 1000칸)', 'create clone (1000-item local list)', '지역 리스트를 통째로 복사한다', 'bad')}
${row('신호 보내기', 'send signal (no receivers)', '한 틱에 50번 보내면 받는 스크립트 50개가 모두 돈다')}
</table><p class="note">오브젝트 블록은 블록 자체의 시간이고, 화면을 다시 그리는 시간은 따로 든다. 편집기의 CreateJS 그리기에서 쟀다. playentry의 WebGL 그리기에서는 효과와 충돌 판정의 값이 다를 수 있다.</p></div>`;
    })(),
    '사진11 두 엔진': `<div class="wrap"><h1>순정 엔트리와 tessvm은 병목이 다르다</h1><p class="sub">tessvm = 엔트리 작품을 자바스크립트로 바꿔 실행하는 크롬 확장</p>
<table><col style="width:190px"><col style="width:340px"><col><tr><th></th><th>순정 엔트리</th><th>tessvm</th></tr>
<tr><td>블록 하나</td><td>0.3 ~ 2 µs</td><td>수 ns (수백 배 빠름)</td></tr>
<tr><td>소수 사칙연산</td><td>1 ~ 3 µs</td><td>정수 3 ns, 소수 15 ~ 250 ns</td></tr>
<tr><td>반복 한 바퀴</td><td>16 ms 쉼 (무지연 반복이면 안 쉼)</td><td>1/60 초 쉼 (무지연 반복이면 안 쉼)</td></tr>
<tr><td>한 틱이 길어지면</td><td>화면이 늦어진다</td><td>4틱까지 몰아서 돌고 한 번 그림. 타이머가 틱으로 가서 게임이 느려진다</td></tr>
<tr><td>리스트</td><td>5000칸 (넘기면 맨 앞이 지워짐)</td><td>한도 없음</td></tr>
<tr><td>숫자 상수</td><td>블록 하나</td><td>글자 "5"로 바뀌어 쓸 때마다 숫자로 바꿈</td></tr>
<tr><td>붓</td><td>선마다 따로 그림</td><td>같은 색 선 16개 이상이 이어지면 한 번에 그림</td></tr>
<tr><td class="k">그래서 줄일 것</td><td class="k">블록 수</td><td class="k">소수 계산과 그리기 횟수</td></tr></table>
<p class="note">tessvm 값은 지금까지 작품을 만들며 잰 값이다. 둘 다 실행하려면 5000칸 한도는 순정에, 빠르기는 tessvm에 맞춘다.</p></div>`,
    '사진12 작품 사례': (() => {
        const cases = [
            ['exp 함수 (순정)', '사칙연산 15개 → 4개', 38.6, 20.5, ' µs'],
            ['OBJ 렌더러 (순정)', '옛 사칙연산 블록', 122, 108, ' ms'],
            ['레이싱 (tessvm)', '정수로 계산', 21, 6, ' ms'],
            ['레이트레이서 (tessvm)', '재귀 → 무지연 반복', 29, 13.5, ' ms'],
            ['레이트레이서 (tessvm)', '숫자 상수를 지역 변수로', 23, 19, ' ms'],
            ['레이트레이서 (tessvm)', '붓 선을 같은 색끼리', 15, 1.3, ' ms'],
            ['레이싱 저장 (순정)', '0만 든 리스트는 비워 저장', 16.26, 12.39, ' MB'],
        ];
        return `<div class="wrap"><h1>실제 작품에 적용한 결과</h1><p class="sub">바꾸기 전(회색)과 바꾼 뒤(파랑). 바꾸기 전을 100으로 맞춘 길이</p>${cases.map(([n, how, a, b, u]) =>
            `<div style="margin:14px 0"><div style="font-size:20px"><b>${n}</b> · ${how}</div>
<div class="row" style="margin:4px 0"><div class="track" style="border:0"><div class="bar dim" style="width:80%"></div><div class="val" style="left:80%">${a}${u}</div></div></div>
<div class="row" style="margin:4px 0"><div class="track" style="border:0"><div class="bar" style="width:${(b / a * 80).toFixed(1)}%"></div><div class="val" style="left:${(b / a * 80).toFixed(1)}%">${b}${u}</div></div></div></div>`).join('')}
<p class="note">레이싱 틱은 "13~21 ms → 5~6 ms"(싱가포르 ULTRA)의 큰 쪽 값. 레이트레이서 재귀판은 27~31 ms, 무지연 반복판은 13~14 ms의 가운데 값. 출처는 각 작품의 설명서와 작업 기록.</p></div>`;
    })(),
    '사진13 점검표': `<div class="wrap"><h1>무거운 작품 점검표</h1><p class="sub">위에서부터 효과가 큰 순서</p>
<table>
<tr><td class="k">1</td><td>무거운 반복의 몸체 끝에 <b>&lt;이번 반복 건너뛰기 가 아니다&gt; 이(가) 될 때까지 기다리기</b>를 넣었나 (몸체가 끝나는 모든 길에)</td></tr>
<tr><td class="k">2</td><td>그 반복 안에 빈 "아니면", 빈 함수, 0초 기다리기, 신호 보내고 기다리기가 없나</td></tr>
<tr><td class="k">3</td><td>값을 돌려주는 함수 안에 반복이나 기다리기가 없나. 몸체가 비어 있지 않나</td></tr>
<tr><td class="k">4</td><td>계산 중간값을 함수 지역 변수에 두었나. 계산에 쓰는 변수와 리스트를 숨겼나. 쓰지 않는 변수를 지웠고, 자주 쓰는 변수가 변수 목록 앞쪽에 있나</td></tr>
<tr><td class="k">5</td><td>사칙연산 수를 줄였나 (제곱·몫·나머지·리스트 읽기로 바꾸기, 같은 값 다시 계산하지 않기, 순정이면 옛 사칙연산 블록)</td></tr>
<tr><td class="k">6</td><td>한 장의 그림을 한 틱 안에서 "모든 붓 지우기 → 전부 그리기"로 끝내나. 지우지 않고 쌓지 않나</td></tr>
<tr><td class="k">7</td><td>위치는 "x: y: 위치로 이동하기" 한 블록으로. 필요 없는 붓과 채우기는 멈췄나</td></tr>
<tr><td class="k">8</td><td>그리고/또는 의 양쪽은 모두 계산된다. 비싼 조건은 만일을 겹쳐 썼나</td></tr>
<tr><td class="k">9</td><td>신호와 복제본을 매 장 돌리는 계산에 쓰지 않나. 복제할 오브젝트에 큰 지역 리스트가 없나. 충돌은 좌표로 먼저 걸렀나</td></tr>
<tr><td class="k">10</td><td>리스트가 5000칸을 넘지 않나. 저장 크기가 16 MB 아래인가</td></tr>
<tr><td class="k">11</td><td>소수를 쌓을 때 "만큼 더하기" 대신 "정하기"를 썼나. 무작위 실수는 정수로 뽑아 나눴나</td></tr>
<tr><td class="k">12</td><td>바꾸기 전과 뒤를 번갈아 여러 번 재서 가장 짧은 값끼리 비교했나</td></tr>
</table></div>`,
};
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1.5 });
for (const [name, html] of Object.entries(pages)) {
    await pg.setContent(`<style>${CSS}</style>${html}`);
    await (await pg.$('.wrap')).screenshot({ path: path.join(OUT, name + '.png') });
}

// ---------- 블록 사진: 데모 작품을 편집기에 열고 스크립트를 하나씩 오려 냄 ----------
const vx = newId(), vi = newId();
const num = (v) => B('number', [String(v)]);
const get = (id) => B('get_variable', [id, null]);
const inc = () => B('set_variable', [vx, B('calc_basic', [get(vx), 'PLUS', num(1)]), null]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const at = (blocks, x, y) => { blocks[0].x = x; blocks[0].y = y; return blocks; };
const scripts = [
    at([B('when_run_button_click', [null]), B('repeat_basic', [num(1000), null], [[inc()]])], 40, 40),
    at([B('when_run_button_click', [null]), B('repeat_basic', [num(1000), null], [[inc(), trick()]])], 40, 260),
    at([B('when_run_button_click', [null]), B('repeat_basic', [num(1000), null], [[
        B('if_else', [B('boolean_basic_operator', [get(vx), 'GREATER', num(10)]), null, null], [[B('set_variable', [vx, num(0), null])], []]), inc(), trick()]])], 40, 480),
    at([B('when_run_button_click', [null]), B('repeat_basic', [num(1000), null], [[
        B('_if', [B('boolean_basic_operator', [get(vx), 'GREATER', num(10)]), null], [[B('set_variable', [vx, num(0), null])]]), inc(), trick()]])], 40, 760),
];
const variable = (name, id) => ({ name, id, value: 0, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 });
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const demo = path.join(HERE, 'demo.ent');
packEnt(demo, { name: '예시', tmpDir: path.join(HERE, '.pack-demo'), variables: [variable('x', vx), variable('i', vi)], functions: [], speed: 60,
    objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: scripts }] });
await ensureServer();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1.5 });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    Entry.clearProject(); Entry.loadProject(await r.json());
}, fs.readFileSync(demo).toString('base64'));
await page.waitForTimeout(2500);
const cut = async (i) => {
    const box = await page.evaluate((i) => {
        const th = Entry.container.getAllObjects()[0].script.getThreads()[i];
        const g = th.getFirstBlock().view.svgGroup;   // the first block's group holds the whole script
        const bb = g.getBBox();
        document.getElementById('sheet')?.remove();
        const d = document.createElement('div'); d.id = 'sheet';
        d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', bb.width + 12); svg.setAttribute('height', bb.height + 12);
        svg.style.cssText = 'display:block;background:#fff;';
        const c = g.cloneNode(true); c.setAttribute('transform', `translate(${6 - bb.x},${6 - bb.y})`);
        svg.appendChild(c); d.appendChild(svg); document.body.appendChild(d);
        return { width: Math.ceil(bb.width + 12), height: Math.ceil(bb.height + 12) };
    }, i);
    const png = await page.screenshot({ clip: { x: 0, y: 0, ...box } });
    await page.evaluate(() => document.getElementById('sheet').remove());
    return 'data:image/png;base64,' + png.toString('base64');
};
const img = []; for (let i = 0; i < scripts.length; i++) img.push(await cut(i));
const panel = (title, src, cap, color) => `<div style="flex:1;min-width:0"><div style="font-size:22px;font-weight:700;color:${color};margin-bottom:8px">${title}</div>
<div style="border:1px solid #d5dbe6;border-radius:10px;padding:14px;background:#fff"><img src="${src}" style="max-width:100%;zoom:0.6667"></div><p class="note" style="margin-top:10px">${cap}</p></div>`;
const blockPages = {
    '사진3 무지연 반복 블록': `<div class="wrap"><h1>보통 반복과 무지연 반복</h1><p class="sub">몸체 맨 끝에 기다리기 블록 하나를 넣는다</p><div style="display:flex;gap:28px">
${panel('보통 반복 — 16초', img[0], '몸체가 끝날 때마다 다음 틱까지 쉰다.', '#c4472a')}
${panel('무지연 반복 — 0.01초', img[1], '"이번 반복 건너뛰기"를 조건 칸에서 실행하면 반복 처음으로 돌아가면서 쉬지 않는다.', '#2a7f4f')}</div>
<p class="note">명령 블록 "이번 반복 건너뛰기"가 조건 칸에 들어간 모양이라 편집기에서 끌어다 놓아서는 만들 수 없다. 이 블록이 든 오브젝트 파일을 불러와 복사해 쓴다. 반복이 도는 동안 화면은 멈추므로, 한 장을 그리는 데 필요한 만큼만 돌린다.</p></div>`,
    '사진5 빈 아니면': `<div class="wrap"><h1>빈 "아니면"을 지운다</h1><p class="sub">두 스크립트는 같은 일을 한다</p><div style="display:flex;gap:28px">
${panel('느림 — 빈 아니면으로 들어갈 때마다 16 ms', img[2], '"아니면" 쪽이 비어 있다. x가 10 이하인 바퀴마다 한 틱을 쉰다.', '#c4472a')}
${panel('빠름 — 만일만 쓴다', img[3], '아니면이 필요 없으면 "만일 (이)라면" 블록으로 바꾼다.', '#2a7f4f')}</div></div>`,
};
for (const [name, html] of Object.entries(blockPages)) {
    await pg.setViewportSize({ width: 1000, height: 600 });
    await pg.setContent(`<style>${CSS}</style>${html}`);
    await pg.waitForTimeout(300);
    await (await pg.$('.wrap')).screenshot({ path: path.join(OUT, name + '.png') });
}
console.log(fs.readdirSync(OUT));
await browser.close();
