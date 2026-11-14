// 엔트리 보관함 초기화 — 페이지(MAIN world)에서 돈다.
// 만들기 화면(/ws/...)이나 자기 마이페이지(/profile/<내 id>)에서 패널을 띄운다.
// 보관함은 사이트가 axios로 부르는 REST API를 쓴다:
//   목록 GET /rest/backpack  → [{ _id, type: "object"|"block", title, imgPath, ... }]
//   삭제 DELETE /rest/backpack/<_id>  (보관함 항목의 × 버튼과 같은 것)
(() => {
  if (window.__backpackCleanLoaded) return;
  window.__backpackCleanLoaded = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function me() {
    try {
      const u = window.__NEXT_DATA__?.props?.pageProps?.initialState?.common?.user;
      return u && u.id ? u : null;
    } catch (e) {
      return null;
    }
  }

  function errText(status, body) {
    if (status === 401) return '로그인이 필요합니다 (401)';
    if (status === 403) return '권한이 없습니다 (403)';
    if (status === 404) return '이미 없는 항목입니다 (404)';
    const m = body && ((body.errors && body.errors[0] && body.errors[0].message) || body.error || body.message);
    if (m === 'EMPTY USER') return '로그인이 필요합니다';
    return m ? String(m) : '오류 ' + status;
  }

  // 사이트와 같은 요청 (쿠키 포함). 서버가 응답 없이 붙잡으면 10초에 끊고 쉬었다 다시 (5번까지).
  async function rest(method, path) {
    for (let attempt = 0; ; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10000);
      let res, text;
      try {
        res = await fetch(path, { method, credentials: 'include', signal: ac.signal });
        text = await res.text();
        if ((res.status === 429 || res.status >= 500) && attempt < 5) throw new Error('HTTP ' + res.status);
      } catch (e) {
        clearTimeout(timer);
        if (attempt < 5) { await sleep(2000 * (attempt + 1)); continue; }
        throw new Error(e.name === 'AbortError' ? '응답 없음(시간 초과)' : e.message);
      }
      clearTimeout(timer);
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) {}
      return { status: res.status, ok: res.ok, body };
    }
  }

  async function list() {
    const r = await rest('GET', '/rest/backpack?c=' + Date.now());
    if (!r.ok) throw new Error(errText(r.status, r.body));
    if (!Array.isArray(r.body)) throw new Error('목록을 읽지 못했습니다');
    return r.body.filter((x) => x && x._id);
  }

  // null = 지워짐(또는 이미 없음), 아니면 오류 문구
  async function remove(id) {
    const r = await rest('DELETE', '/rest/backpack/' + encodeURIComponent(id));
    if (r.ok || r.status === 404) return null;
    return errText(r.status, r.body);
  }

  // 만들기 화면에서 보관함이 열려 있으면 사이트가 목록을 다시 받아 그리게 한다.
  function refreshView() {
    try {
      const pg = window.Entry && Entry.playground;
      const v = pg && pg.backPackView;
      if (v && !v.hasClass('entryRemove')) Entry.dispatchEvent('showBackPack');
    } catch (e) {}
  }

  // ---------- 패널 ----------
  let panel = null;
  let running = false;
  let stopFlag = false;
  let found = null; // 미리 센 항목

  function el(tag, style, text) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (text != null) e.textContent = text;
    return e;
  }

  const BTN =
    'display:block;width:100%;margin-top:8px;padding:8px 10px;border:0;border-radius:6px;' +
    'font:600 13px sans-serif;cursor:pointer;color:#fff;';

  function describe(items) {
    const obj = items.filter((x) => x.type === 'object').length;
    const blk = items.filter((x) => x.type === 'block').length;
    const etc = items.length - obj - blk;
    return `오브젝트 ${obj}개, 블록 ${blk}개` + (etc ? `, 기타 ${etc}개` : '');
  }

  function buildPanel() {
    const p = el(
      'div',
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:260px;padding:14px;' +
        'background:#fff;color:#222;border:1px solid #ccc;border-radius:10px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.18);font:13px/1.5 sans-serif;'
    );
    const head = el('div', 'display:flex;justify-content:space-between;align-items:center;font-weight:700;');
    head.append(el('span', '', '보관함 초기화'));
    const close = el('button', 'border:0;background:none;font-size:16px;cursor:pointer;color:#888;', '×');
    close.onclick = () => { if (!running) { p.remove(); panel = null; hiddenFor = location.pathname; } };
    head.append(close);
    p.append(head);

    const status = el('div', 'margin-top:8px;white-space:pre-line;', '먼저 보관함을 세어 보세요.');
    p.append(status);

    const bar = el('div', 'margin-top:8px;height:6px;background:#eee;border-radius:3px;overflow:hidden;display:none;');
    const fill = el('div', 'height:100%;width:0;background:#e5484d;transition:width .2s;');
    bar.append(fill);
    p.append(bar);

    const countBtn = el('button', BTN + 'background:#4f80ff;', '내 보관함 세기');
    const confirmRow = el('label', 'display:none;margin-top:10px;font-size:12px;cursor:pointer;');
    const chk = el('input');
    chk.type = 'checkbox';
    chk.style.marginRight = '6px';
    confirmRow.append(chk, document.createTextNode('되돌릴 수 없다는 것을 압니다'));
    const delBtn = el('button', BTN + 'background:#e5484d;display:none;opacity:.5;', '모두 삭제');
    delBtn.disabled = true;
    const stopBtn = el('button', BTN + 'background:#666;display:none;', '멈추기');

    chk.onchange = () => {
      delBtn.disabled = !chk.checked;
      delBtn.style.opacity = chk.checked ? '1' : '.5';
    };

    countBtn.onclick = async () => {
      countBtn.disabled = true;
      status.textContent = '세는 중…';
      confirmRow.style.display = 'none';
      delBtn.style.display = 'none';
      try {
        found = await list();
        if (!found.length) {
          status.textContent = '보관함이 이미 비어 있습니다.';
        } else {
          status.textContent = `보관함에 ${found.length}개가 있습니다.\n(${describe(found)})`;
          confirmRow.style.display = 'block';
          delBtn.style.display = 'block';
          delBtn.textContent = `${found.length}개 모두 삭제`;
        }
      } catch (e) {
        status.textContent = '세기 실패: ' + e.message;
      }
      countBtn.disabled = false;
    };

    delBtn.onclick = async () => {
      if (!chk.checked || running || !found) return;
      running = true;
      stopFlag = false;
      countBtn.style.display = 'none';
      confirmRow.style.display = 'none';
      delBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      bar.style.display = 'block';

      const done = new Set();
      const failed = new Map(); // id -> 메시지
      let queue = found.map((x) => x._id);
      let planned = queue.length;
      let fatal = null;

      // 다 지운 뒤 목록을 다시 받아 남은 것(실패한 것, 그 사이 들어온 것 말고 처음 센 것)을 지운다 (최대 3바퀴).
      const firstIds = new Set(queue);
      for (let round = 0; round < 3 && !stopFlag && !fatal; round++) {
        if (round > 0) {
          status.textContent = `남은 것이 있는지 다시 확인하는 중… (${round + 1}바퀴)`;
          await sleep(1000);
          let now;
          try { now = await list(); } catch (e) { status.textContent = '다시 세기 실패: ' + e.message; break; }
          const still = new Set(now.map((x) => x._id));
          for (const id of [...failed.keys()]) {
            failed.delete(id);
            if (!still.has(id)) done.add(id);
          }
          queue = [...still].filter((id) => firstIds.has(id) && !done.has(id));
          for (const id of firstIds) if (!still.has(id)) done.add(id);
          planned = done.size + queue.length;
        }
        if (!queue.length) break;
        for (const id of queue) {
          if (stopFlag) break;
          let err;
          try { err = await remove(id); } catch (e) { err = e.message; }
          if (err) failed.set(id, err);
          else done.add(id);
          // 로그인이 풀렸으면 더 해 봐야 소용없다.
          if (err && /로그인/.test(err)) { fatal = err; break; }
          fill.style.width = Math.round(((done.size + failed.size) / Math.max(planned, 1)) * 100) + '%';
          status.textContent = `삭제 중… ${done.size} / ${planned}` + (failed.size ? `\n실패 ${failed.size}` : '');
          await sleep(150);
        }
        if (!failed.size) break;
      }

      running = false;
      stopBtn.style.display = 'none';
      stopBtn.textContent = '멈추기';
      countBtn.style.display = 'block';
      chk.checked = false;
      chk.onchange();
      found = null;
      let msg = (stopFlag ? '멈췄습니다. ' : '끝났습니다. ') + `${done.size}개 삭제`;
      if (failed.size) {
        msg += `, ${failed.size}개 실패`;
        msg += `\n(예: ${fatal || failed.values().next().value})`;
        console.warn('[보관함 초기화] 실패:', Object.fromEntries(failed));
      }
      status.textContent = msg;
      refreshView();
    };

    stopBtn.onclick = () => { stopFlag = true; stopBtn.textContent = '멈추는 중…'; };

    p.append(countBtn, confirmRow, delBtn, stopBtn);
    return p;
  }

  // 만들기 화면이거나 내 마이페이지일 때 패널을 붙인다. 페이지 안 이동도 따라간다.
  let hiddenFor = null;
  function tick() {
    const u = me();
    const seg = location.pathname.split('/');
    const here = seg[1] === 'ws' || (!!u && seg[1] === 'profile' && seg[2] === u.id);
    if (here && !panel && hiddenFor !== location.pathname) {
      panel = buildPanel();
      document.body.append(panel);
    } else if (!here && panel && !running) {
      panel.remove();
      panel = null;
    }
    if (!here) hiddenFor = null;
  }
  setInterval(tick, 1000);
  tick();
})();
