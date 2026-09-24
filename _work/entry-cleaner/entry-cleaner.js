// 엔트리 변수·함수 일괄 삭제기
// 엔트리 만들기 화면(playentry.org/ws/...)에서 실행하면 오른쪽 위에 창이 뜨고,
// 고른 종류(변수 / 리스트 / 함수 / 신호)를 한 번에 지웁니다.
// 엔트리가 쓰는 삭제 함수(Entry.variableContainer)를 그대로 부르므로
// 삭제 버튼을 하나씩 누르는 것과 결과가 같습니다. 되돌리기(Ctrl+Z)는 안 됩니다.
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

    async function removeFunctions() {
        if (E.Func && E.Func.targetFunc) E.do('funcEditEnd', 'cancel');
        const funcs = kinds[2].list();
        let i = 0;
        for (const func of funcs) {
            // 작품과 다른 함수 안에 놓인 이 함수 블록을 먼저 치우고(엔트리 삭제 버튼과 같은 순서) 함수를 지운다
            await E.Utils.removeBlockByTypeAsync(`func_${func.id}`);
            if (vc.functions_[func.id]) vc.removeFunction({ id: func.id });
            msg(`함수 삭제 중... ${++i}/${funcs.length}`);
            await tick();
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
            if (E.engine && E.engine.state !== 'stop') E.engine.toggleStop();
            const has = (key) => chosen.some((k) => k.key === key);
            if (has('func')) await removeFunctions();
            if (has('var')) removeVars(kinds[0].list(), 'variables_');
            if (has('list')) removeVars(kinds[1].list(), 'lists_');
            if (has('msg')) removeMessages();
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
