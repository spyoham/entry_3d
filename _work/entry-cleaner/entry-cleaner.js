// 엔트리 변수·함수 일괄 삭제기
// 엔트리 만들기 화면(playentry.org/ws/...)에서 실행하면 오른쪽 위에 창이 뜨고,
// 고른 종류(변수 / 리스트 / 함수 / 신호)를 한 번에 지웁니다.
// 결과는 엔트리의 삭제 버튼을 하나씩 누른 것과 같습니다 (함수를 지우면 놓여 있던 그 함수 블록도 사라짐).
// 다만 하나씩 지우지 않고 한 번에 치워서, 함수가 1000개를 넘어도 몇 초 안에 끝납니다.
// 되돌리기(Ctrl+Z)는 안 됩니다.  시험: node test.mjs
(() => {
    const E = window.Entry;
    if (!E || !E.variableContainer || !E.container) {
        alert('엔트리 만들기 화면(작품 만들기/수정하기)에서 실행해 주세요.');
        return;
    }
    const old = document.getElementById('entry-cleaner-panel');
    if (old) old.remove();

    const vc = E.variableContainer;
    const kinds = [
        { key: 'var', label: '변수', on: true, list: () => [...vc.variables_] },
        { key: 'list', label: '리스트', on: true, list: () => [...vc.lists_] },
        { key: 'func', label: '함수', on: true, list: () => Object.values(vc.functions_ || {}) },
        { key: 'msg', label: '신호', on: false, list: () => [...(vc.messages_ || [])] },
    ];

    const panel = document.createElement('div');
    panel.id = 'entry-cleaner-panel';
    panel.style.cssText =
        'position:fixed;top:70px;right:20px;z-index:2147483647;width:250px;padding:14px 16px;' +
        'background:#fff;color:#222;border:2px solid #4f80ff;border-radius:10px;' +
        'box-shadow:0 6px 24px rgba(0,0,0,.25);font:14px/1.5 sans-serif;';
    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<b>변수·함수 일괄 삭제</b>' +
        '<span data-x style="cursor:pointer;font-size:18px;padding:0 4px">×</span></div>' +
        kinds
            .map(
                (k) =>
                    `<label style="display:block;cursor:pointer"><input type="checkbox" data-k="${k.key}"${k.on ? ' checked' : ''}> ` +
                    `${k.label} <span data-n="${k.key}" style="color:#888"></span></label>`
            )
            .join('') +
        '<button data-go style="margin-top:10px;width:100%;padding:8px;border:0;border-radius:6px;' +
        'background:#ff5a5a;color:#fff;font-weight:bold;cursor:pointer">선택한 것 모두 삭제</button>' +
        '<div data-msg style="margin-top:8px;font-size:12px;color:#555;white-space:pre-line">' +
        '되돌릴 수 없으니 먼저 작품을 복사해 두세요.</div>';
    document.body.appendChild(panel);

    const $ = (q) => panel.querySelector(q);
    const msg = (t) => ($('[data-msg]').textContent = t);
    const refreshCounts = () =>
        kinds.forEach((k) => ($(`[data-n="${k.key}"]`).textContent = `(${k.list().length}개)`));
    refreshCounts();
    $('[data-x]').onclick = () => panel.remove();

    const tick = () => new Promise((r) => setTimeout(r, 0));

    // 속성 탭이 열려 있으면 엔트리는 함수 블록 하나가 사라질 때마다 변수·함수 목록을 통째로 다시 그린다
    // (variableContainer.removeRef → updateList). 가장 오래 걸리던 곳이라, 지우는 동안은 막고 끝에 한 번만 그린다.
    async function withoutListRedraw(work) {
        const own = Object.prototype.hasOwnProperty.call(vc, 'updateList');
        const saved = vc.updateList;
        vc.updateList = () => {};
        try {
            await work();
        } finally {
            if (own) vc.updateList = saved;
            else delete vc.updateList;
        }
    }

    // 엔트리 삭제 버튼은 함수 하나마다 작품 전체와 남은 함수 전부를 훑고 목록을 다시 그려서
    // 함수가 1000개면 그 일을 1000번 한다. 여기서는 함수를 모두 지우므로
    //  - 오브젝트 코드는 한 번만 읽어 함수 블록을 뺀 뒤 다시 넣고
    //  - 함수 안에 놓인 다른 함수 블록은 함수째 사라지니 건드리지 않고
    //  - 목록은 끝에 한 번만 그린다.
    // 코드를 읽어서 고치는 까닭: 화면에 떠 있지 않은 오브젝트에서는 엔트리의 블록 삭제가
    // 다른 블록 칸 안에 든 값 함수 블록을 칸에서 떼어 내지 못해, 지운 함수의 블록이 저장본에 남는다.

    // 칸이 비면 엔트리가 채워 넣는 기본 블록 (FieldBlock.inspectBlock 과 같은 차례)
    function emptySlot(parentType, index) {
        const slot = ((E.block[parentType] || {}).params || [])[index] || {};
        const byAccept = { boolean: 'True', string: 'text', number: 'number' };
        const type = slot.blockType || slot.defaultType || byAccept[String(slot.accept).toLowerCase()];
        return type ? { type } : null;
    }

    // 블록 줄에서 함수 블록을 뺀다. 뒤에 붙은 블록은 그 자리에 이어 붙는다.
    function cleanBlocks(blocks, types, count) {
        const kept = [];
        for (const b of blocks) {
            if (!b || typeof b !== 'object') continue;
            if (types.has(b.type)) {
                count.n++;
                continue;
            }
            if (Array.isArray(b.params)) {
                b.params = b.params.map((p, i) => {
                    if (!p || typeof p !== 'object' || !p.type) return p;
                    if (types.has(p.type)) {
                        count.n++;
                        return emptySlot(b.type, i);
                    }
                    return cleanBlocks([p], types, count)[0];
                });
            }
            if (Array.isArray(b.statements)) {
                b.statements = b.statements.map((s) => (Array.isArray(s) ? cleanBlocks(s, types, count) : s));
            }
            kept.push(b);
        }
        return kept;
    }

    function cleanScript(script, types) {
        const count = { n: 0 };
        const threads = [];
        for (const thread of script.toJSON()) {
            const head = thread[0];
            const kept = cleanBlocks(thread, types, count);
            if (!kept.length) continue;
            // 맨 앞 블록이 빠졌으면 덩어리가 있던 자리를 다음 블록이 물려받는다
            if (kept[0] !== head && head) {
                kept[0].x = head.x;
                kept[0].y = head.y;
            }
            threads.push(kept);
        }
        if (count.n) script.load(threads);
        return count.n;
    }

    async function removeFunctions() {
        if (E.Func && E.Func.targetFunc) E.do('funcEditEnd', 'cancel');
        const funcs = kinds[2].list();
        if (!funcs.length) return;
        const types = new Set(funcs.map((f) => `func_${f.id}`));
        let last = performance.now();
        const breathe = async (text) => {
            if (performance.now() - last < 100) return;
            msg(text);
            await tick();
            last = performance.now();
        };

        E.dispatchEvent('removeFunctionsStart');
        try {
            let n = 0;
            for (const { script } of E.container.getAllObjects()) {
                n += cleanScript(script, types);
                await breathe(`함수 블록 치우는 중... ${n}개`);
            }
            let i = 0;
            for (const func of funcs) {
                func.destroy();
                delete vc.functions_[func.id];
                i++;
                await breathe(`함수 삭제 중... ${i}/${funcs.length}`);
            }
        } finally {
            E.dispatchEvent('removeFunctionsEnd');
        }
    }

    // 변수·리스트는 하나씩 removeVariable 하면 매번 블록 꾸러미를 다시 그려 느리므로 한 번에 지운다
    function removeVars(arr, key) {
        arr.forEach((v) => {
            if (vc.selected === v) vc.select(null);
            v.remove();
        });
        const gone = new Set(arr);
        vc[key] = vc[key].filter((v) => !gone.has(v));
    }

    function removeMessages() {
        if (kinds[3].list().includes(vc.selected)) vc.select(null);
        vc.messages_ = [];
    }

    $('[data-go]').onclick = async () => {
        const chosen = kinds.filter((k) => $(`[data-k="${k.key}"]`).checked);
        if (!chosen.length) return msg('지울 종류를 골라 주세요.');
        const summary = chosen.map((k) => `${k.label} ${k.list().length}개`).join(', ');
        if (!confirm(`${summary}를 삭제합니다.\n되돌릴 수 없습니다. 계속할까요?`)) return;

        const btn = $('[data-go]');
        btn.disabled = true;
        btn.style.opacity = '.5';
        try {
            // 실행 중이면 다 멈출 때까지 기다린다 (멈추는 도중에는 코드를 다시 넣을 수 없다)
            if (E.engine && E.engine.state !== 'stop') await E.engine.toggleStop();
            const has = (key) => chosen.some((k) => k.key === key);
            await withoutListRedraw(async () => {
                if (has('func')) await removeFunctions();
                if (has('var')) removeVars(kinds[0].list(), 'variables_');
                if (has('list')) removeVars(kinds[1].list(), 'lists_');
                if (has('msg')) removeMessages();
            });
            E.playground.reloadPlayground();
            vc.updateList();
            refreshCounts();
            const left = chosen.filter((k) => k.list().length).map((k) => `${k.label} ${k.list().length}개`);
            msg(
                left.length
                    ? `일부 남음: ${left.join(', ')}\n한 번 더 눌러 보세요.`
                    : `완료: ${summary} 삭제.\n저장해야 반영됩니다.`
            );
        } catch (err) {
            console.error(err);
            refreshCounts();
            msg('오류가 났습니다: ' + err.message + '\n(콘솔에 자세한 내용)');
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    };
})();
