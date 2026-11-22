// 일괄 삭제기 시험: 함수가 많은 작품을 만들어 지우고, 걸린 시간과 남은 것을 본다.
//   먼저 entry-vibe-coding 에서 npm start, 그다음
//   node test.mjs [함수 수=1000] [삭제기 파일=entry-cleaner.js] [결과 저장 파일]
//   STATE=attr 속성 탭의 함수 목록을 연 채로 / STATE=edit 함수 하나를 고치는 화면에서 / STATE=code 블록 탭에서 / STATE=run 작품을 실행하는 도중에
// 결과 저장 파일을 주면 지운 뒤의 작품(블록 id 뺀 것)을 적어 두어 두 판의 결과를 견줄 수 있다.
import { readFileSync, writeFileSync } from 'node:fs';
import { bootEditor } from '../../entry-vibe-coding/tools/lib/editor-harness.mjs';

const N = +(process.argv[2] || 1000);
const file = process.argv[3] || new URL('entry-cleaner.js', import.meta.url);
const out = process.argv[4];
const code = readFileSync(file, 'utf8');

const { browser, page, pageErrors } = await bootEditor();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('  [pageerror]', String(e.stack).slice(0, 900)));
page.on('console', (m) => (m.type() === 'error' || m.text().startsWith('[t]')) && console.log('  [console]', m.text().slice(0, 200)));

// 함수 N개: 셋 중 하나는 값 함수, 함수마다 다른 함수를 부르는 블록이 들어 있다.
// 오브젝트 둘의 코드에도 함수 블록이 놓이고, 일부는 함수 블록 칸 안에 함수 블록이 들어 있다.
// 시험 함수들은 서로를 끝없이 부르므로, 실행 중 시험(STATE=run)에서는 덩어리가 저절로 돌지 않게 머리 블록을 바꾼다
const head = process.env.STATE === 'run' ? 'when_object_click' : 'when_run_button_click';
const made = await page.evaluate(async ({ N, head }) => {
    const fid = (i) => 'f' + (i % N).toString(36).padStart(3, '0');
    const isValue = (i) => i % N % 3 === 0;
    const num = (v) => ({ type: 'number', params: [String(v)] });
    const valueOf = (i) => {
        let k = i % N;
        while (!isValue(k)) k = (k + 1) % N;
        return k;
    };
    const normalOf = (i) => {
        let k = i % N;
        while (isValue(k)) k = (k + 1) % N;
        return k;
    };
    const callV = (i, arg) => ({ type: `func_${fid(valueOf(i))}`, params: [arg || num(1)] });
    const callN = (i, arg) => ({ type: `func_${fid(normalOf(i))}`, params: [arg || num(1)] });
    const move = (arg) => ({ type: 'move_direction', params: [arg, null] });

    const functions = [];
    for (let i = 0; i < N; i++) {
        const id = fid(i);
        const param = { type: `stringParam_p${id}`, params: [] };
        const label = {
            type: 'function_field_label',
            params: [`함수${i}`, { type: 'function_field_string', params: [param, null] }],
        };
        const body = [
            move(num(10)),
            move(param),
            callN(i + 1, callV(i + 2)),
            move(callV(i + 5, callV(i + 7))),
            { type: 'repeat_basic', params: [num(3), null], statements: [[callN(i + 11), move(num(2))]] },
            move(num(1)),
            move(num(3)),
            callN(i + 13),
        ];
        const value = isValue(i);
        functions.push({
            id,
            type: value ? 'value' : 'normal',
            localVariables: [],
            useLocalVariables: false,
            content: JSON.stringify([
                [
                    {
                        x: 50,
                        y: 30,
                        type: value ? 'function_create_value' : 'function_create',
                        params: value ? [label, null, null, callV(i + 3)] : [label, null],
                        statements: [body],
                    },
                ],
            ]),
        });
    }

    const threads = (seed) => {
        const t = [];
        for (let k = 0; k < N; k += 4) {
            t.push([
                { type: head, x: 40 + (k % 40) * 30, y: 40 + k * 3 },
                move(num(5)),
                callN(seed + k),
                move(callV(seed + k + 1, callV(seed + k + 2, callV(seed + k + 3)))),
                {
                    type: 'repeat_basic',
                    params: [num(2), null],
                    statements: [[callN(seed + k + 2, callV(seed + k)), move(num(7)), callN(seed + k + 3)]],
                },
                move(num(9)),
            ]);
        }
        // 함수 블록만으로 된 덩어리, 함수 블록으로 시작하는 덩어리
        t.push([callN(seed), callN(seed + 1), callN(seed + 2)]);
        t.push([callN(seed + 3), move(num(4))]);
        t.push([callV(seed + 4, callV(seed + 5))]);
        return t;
    };

    const project = Entry.exportProject();
    const first = project.objects[0];
    const second = JSON.parse(JSON.stringify(first));
    second.id = 'obj2';
    second.name = '둘째';
    second.sprite.pictures.forEach((p, i) => (p.id = 'o2p' + i));
    (second.sprite.sounds || []).forEach((s, i) => (s.id = 'o2s' + i));
    second.selectedPictureId = second.sprite.pictures[0].id;
    first.script = JSON.stringify(threads(0));
    second.script = JSON.stringify(threads(17));
    project.objects = [first, second];
    project.functions = functions;
    project.variables = [];
    for (let i = 0; i < 300; i++) {
        project.variables.push({ name: `변수${i}`, id: 'v' + i, visible: false, value: 0, variableType: 'variable', object: null, x: 0, y: 0 });
        project.variables.push({ name: `리스트${i}`, id: 'l' + i, visible: false, value: 0, variableType: 'list', object: null, x: 0, y: 0, width: 100, height: 120, array: [{ data: 1 }] });
    }
    Entry.clearProject();
    const tLoad = performance.now();
    Entry.loadProject(project);
    const loadSec = (performance.now() - tLoad) / 1000;
    await new Promise((r) => setTimeout(r, 2000));
    const count = (o) => Object.keys(o.script._blockMap).length;
    // 지우기 전 블록을 오브젝트마다 'id 종류' 로 적어 둔다 (엔트리의 블록 id 는 네 글자라 가끔 겹치므로 개수까지 센다)
    window.__tally = (script) => {
        const m = new Map();
        const walk = (b) => {
            if (!b || typeof b !== 'object') return;
            if (Array.isArray(b)) return b.forEach(walk);
            if (!b.type) return;
            const k = b.id + ' ' + b.type;
            m.set(k, (m.get(k) || 0) + 1);
            (b.params || []).forEach(walk);
            (b.statements || []).forEach(walk);
        };
        walk(script.toJSON());
        return m;
    };
    window.__before = Entry.container.getAllObjects().map((o) => window.__tally(o.script));
    return {
        loadSec: +loadSec.toFixed(1),
        funcs: Object.keys(Entry.variableContainer.functions_).length,
        vars: Entry.variableContainer.variables_.length,
        lists: Entry.variableContainer.lists_.length,
        blocks: Entry.container.getAllObjects().map(count),
    };
}, { N, head });
console.log('만든 작품:', JSON.stringify(made));

const state = process.env.STATE || '';
if (state) {
    const mode = await page.evaluate(async (state) => {
        if (state === 'code') Entry.playground.changeViewMode('code');
        if (state === 'attr' || state === 'edit') {
            Entry.playground.changeViewMode('variable');
            Entry.variableContainer.selectFilter('func');
        }
        if (state === 'edit') Entry.Func.edit(Object.keys(Entry.variableContainer.functions_)[5]);
        if (state === 'run') Entry.engine.toggleRun();
        await new Promise((r) => setTimeout(r, 1500));
        return { viewMode: Entry.playground.viewMode_, filter: Entry.variableContainer.viewMode_, editing: !!Entry.Func.targetFunc, engine: Entry.engine.state };
    }, state);
    console.log('화면 상태:', JSON.stringify(mode));
}
// HOOK=파일: 삭제기를 넣기 전에 페이지에서 돌릴 코드 (시간 재는 덫 따위)
if (process.env.HOOK) await page.addScriptTag({ content: readFileSync(process.env.HOOK, 'utf8') });
await page.addScriptTag({ content: code });
// CPUPROF=파일: 지우는 동안의 CPU 프로파일을 적어 둔다 (크롬 개발자 도구 Performance 탭에서 열림)
let cdp;
if (process.env.CPUPROF) {
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.start');
}
const t0 = Date.now();
// 누른 뒤 한참 멈춰 있어도 기다리도록 page.click 대신 직접 누른다
await page.evaluate(() => void setTimeout(() => document.querySelector('#entry-cleaner-panel [data-go]').click(), 0));
const text = await page
    .waitForFunction(
        () => {
            const m = document.querySelector('#entry-cleaner-panel [data-msg]').textContent;
            return /^(완료|일부 남음|오류)/.test(m) && m;
        },
        null,
        { timeout: 3_600_000, polling: 50 }
    )
    .then((h) => h.jsonValue());
const sec = (Date.now() - t0) / 1000;
if (cdp) writeFileSync(process.env.CPUPROF, JSON.stringify((await cdp.send('Profiler.stop')).profile));
console.log(`함수 ${N}개: ${sec.toFixed(2)}초`);
console.log('창 글:', text.replace(/\n/g, ' / '));

const after = await page.evaluate(() => {
    const strip = (v) => {
        if (Array.isArray(v)) return v.map(strip);
        if (v && typeof v === 'object') {
            const o = {};
            for (const k of Object.keys(v)) if (k !== 'id') o[k] = strip(v[k]);
            return o;
        }
        return v;
    };
    const p = Entry.exportProject();
    const scripts = p.objects.map((o) => strip(JSON.parse(o.script)));
    const all = JSON.stringify(scripts);
    const menu = Entry.getMainWS().blockMenu.code;
    return {
        funcs: p.functions.length,
        vars: p.variables.length,
        funcBlocksLeft: (all.match(/"type":"func_/g) || []).length,
        blocks: Entry.container.getAllObjects().map((o) => Object.keys(o.script._blockMap).length),
        threads: scripts.map((s) => s.length),
        menuFuncBlocks: Object.values(menu._blockMap).filter((b) => /^func_/.test(b.type)).length,
        // 남은 블록은 id 와 종류가 그대로여야 하고, 새로 생긴 것은 빈 칸을 채운 기본 블록뿐이어야 한다
        strangers: Entry.container.getAllObjects().flatMap((o, i) => {
            const bad = [];
            for (const [k, n] of window.__tally(o.script)) {
                const had = window.__before[i].get(k) || 0;
                if (n > had && !['number', 'text', 'True'].includes(k.split(' ')[1])) bad.push(k);
            }
            return bad;
        }),
        // 함수 블록이 아니고 함수 블록 칸 안에 들어 있지도 않던 블록은 하나도 줄지 않아야 한다
        kept: Entry.container.getAllObjects().map((o) => [...window.__tally(o.script).values()].reduce((a, b) => a + b, 0)),
        editing: !!Entry.Func.targetFunc,
        listRows: document.querySelectorAll('.entryVariableListElementWorkspace, .entryVariableSplitterWorkspace li, .list').length,
        scripts,
    };
});
const { scripts, ...summary } = after;
console.log('지운 뒤:', JSON.stringify(summary));
if (out) writeFileSync(out, JSON.stringify(scripts));

// 지운 뒤에도 편집기가 멀쩡한지: 함수를 새로 만들고, 실행했다 멈춘다
const alive = await page.evaluate(async () => {
    Entry.variableContainer.createFunction({ id: 'newf', type: 'normal' });
    Entry.do('funcEditEnd', 'save');
    Entry.engine.toggleRun();
    await new Promise((r) => setTimeout(r, 500));
    const state = Entry.engine.state;
    Entry.engine.toggleStop();
    return { funcs: Object.keys(Entry.variableContainer.functions_).length, state };
});
console.log('그 뒤 새 함수·실행:', JSON.stringify(alive));
console.log('페이지 오류:', pageErrors.length ? pageErrors.slice(0, 5) : '없음');
await browser.close();
const ok = !summary.funcs && !summary.funcBlocksLeft && !summary.menuFuncBlocks && !summary.strangers.length && !summary.editing && /^완료/.test(text) && !pageErrors.length;
console.log(ok ? 'OK' : 'FAIL');
process.exit(ok ? 0 : 1);
