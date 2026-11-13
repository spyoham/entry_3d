// 엔트리 이야기 일괄 삭제 — 페이지(MAIN world)에서 돈다.
// 로그인한 사람이 자기 마이페이지(/profile/<내 id>)에 있을 때만 패널을 띄운다.
(() => {
  if (window.__storyCleanLoaded) return;
  window.__storyCleanLoaded = true;

  const LIST_Q = `query SELECT_ENTRYSTORY($pageParam: PageParam $user: String $category: String $term: String $searchType: String $searchAfter: JSON){
    discussList(pageParam: $pageParam user: $user category: $category term: $term searchType: $searchType searchAfter: $searchAfter){
      total
      list { id user { id } }
      searchAfter
    }
  }`;
  const BATCH = 20; // 한 요청에 지우는 글 수 (안 되면 저절로 줄인다)

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function me() {
    try {
      const u = window.__NEXT_DATA__?.props?.pageProps?.initialState?.common?.user;
      return u && u.id ? u : null;
    } catch (e) {
      return null;
    }
  }

  // raw: GraphQL 오류가 있어도 던지지 않고 {data, errors}를 그대로 준다 (묶음 삭제에서 하나하나 보려고).
  async function gql(name, query, variables, raw) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const headers = {
      'content-type': 'application/json',
      'CSRF-Token': csrf,
      'x-client-type': 'Client',
    };
    const u = me();
    if (u && u.xToken) headers['x-token'] = u.xToken;
    // 요청을 몰아 보내면 서버가 응답 없이 붙잡고 있을 때가 있다: 10초 넘으면 끊고 쉬었다 다시.
    for (let attempt = 0; ; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10000);
      let res, j;
      try {
        res = await fetch('/graphql/' + name, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ query, variables }),
          signal: ac.signal,
        });
        if ((res.status === 429 || res.status >= 500) && attempt < 5) throw new Error('HTTP ' + res.status);
        if (res.ok) j = await res.json();
      } catch (e) {
        clearTimeout(timer);
        if (attempt < 5) { await sleep(2000 * (attempt + 1)); continue; }
        throw new Error(e.name === 'AbortError' ? '응답 없음(시간 초과)' : e.message);
      }
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (raw) return j;
      if (j.errors && j.errors.length) throw new Error(errText(j.errors[0]));
      return j.data;
    }
  }

  function errText(e) {
    if (!e) return '알 수 없는 오류';
    if (e.message) return e.message;
    if (e.statusCode === 401) return '로그인이 필요합니다 (401)';
    if (e.statusCode === 403) return '권한이 없습니다 (403)';
    return e.statusCode ? '오류 ' + e.statusCode : 'GraphQL 오류';
  }

  // 한 요청에 여러 개를 지운다: d0: removeDiscuss(id: $i0) d1: ... 서버는 별칭마다 따로 실행한다.
  // 돌려주는 것: id -> null(성공) 또는 오류 문구.
  async function removeMany(ids) {
    const vars = {};
    const defs = [];
    const fields = [];
    ids.forEach((id, k) => {
      vars['i' + k] = id;
      defs.push(`$i${k}: ID`);
      fields.push(`d${k}: removeDiscuss(id: $i${k}){ id }`);
    });
    const q = `mutation REMOVE_DISCUSS(${defs.join(' ')}) { ${fields.join(' ')} }`;
    const j = await gql('REMOVE_DISCUSS', q, vars, true);
    const errs = (j && j.errors) || [];
    const out = new Map();
    ids.forEach((id, k) => {
      const r = j && j.data && j.data['d' + k];
      out.set(id, r ? null : errText(errs.find((e) => e.path && e.path[0] === 'd' + k) || errs[0]));
    });
    return out;
  }

  // 내 엔트리 이야기 id를 전부 모은다.
  async function collect(uid, onProgress) {
    const ids = [];
    const seen = new Set();
    let searchAfter = null;
    let total = 0;
    for (let page = 0; page < 2000; page++) {
      const d = await gql('SELECT_ENTRYSTORY', LIST_Q, {
        category: 'free',
        searchType: 'scroll',
        term: 'all',
        user: uid,
        pageParam: { display: 50, sort: 'created' },
        searchAfter,
      });
      const L = d && d.discussList;
      if (!L) break;
      total = L.total || 0;
      let fresh = 0;
      for (const x of L.list || []) {
        if (!x || !x.id || seen.has(x.id)) continue;
        seen.add(x.id);
        fresh++;
        if (!x.user || x.user.id === uid) ids.push(x.id);
      }
      if (onProgress) onProgress(ids.length, total);
      if (!fresh || !L.searchAfter) break; // 빈 페이지거나 같은 페이지가 또 오면 끝
      searchAfter = L.searchAfter;
      await sleep(300);
    }
    return { ids, total };
  }

  // ---------- 패널 ----------
  let panel = null;
  let running = false;
  let stopFlag = false;
  let found = null; // 미리 센 id 목록

  function el(tag, style, text) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (text != null) e.textContent = text;
    return e;
  }

  const BTN =
    'display:block;width:100%;margin-top:8px;padding:8px 10px;border:0;border-radius:6px;' +
    'font:600 13px sans-serif;cursor:pointer;color:#fff;';

  function buildPanel() {
    const p = el(
      'div',
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:260px;padding:14px;' +
        'background:#fff;color:#222;border:1px solid #ccc;border-radius:10px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.18);font:13px/1.5 sans-serif;'
    );
    const head = el('div', 'display:flex;justify-content:space-between;align-items:center;font-weight:700;');
    head.append(el('span', '', '엔트리 이야기 일괄 삭제'));
    const close = el('button', 'border:0;background:none;font-size:16px;cursor:pointer;color:#888;', '×');
    close.onclick = () => { if (!running) { p.remove(); panel = null; hiddenFor = location.pathname; } };
    head.append(close);
    p.append(head);

    const status = el('div', 'margin-top:8px;white-space:pre-line;', '먼저 글 수를 세어 보세요.');
    p.append(status);

    const bar = el('div', 'margin-top:8px;height:6px;background:#eee;border-radius:3px;overflow:hidden;display:none;');
    const fill = el('div', 'height:100%;width:0;background:#e5484d;transition:width .2s;');
    bar.append(fill);
    p.append(bar);

    const countBtn = el('button', BTN + 'background:#4f80ff;', '내 엔트리 이야기 세기');
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
      const u = me();
      if (!u) { status.textContent = '로그인 정보를 찾지 못했습니다. 새로고침해 보세요.'; return; }
      countBtn.disabled = true;
      status.textContent = '세는 중…';
      try {
        const r = await collect(u.id, (n, t) => { status.textContent = `세는 중… ${n} / ${t}`; });
        found = r.ids;
        if (!found.length) {
          status.textContent = '지울 엔트리 이야기가 없습니다.';
        } else {
          status.textContent = `엔트리 이야기 ${found.length}개를 찾았습니다.`;
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
      if (!chk.checked || running) return;
      const u = me();
      if (!u) return;
      running = true;
      stopFlag = false;
      countBtn.style.display = 'none';
      confirmRow.style.display = 'none';
      delBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      bar.style.display = 'block';

      const done = new Set();
      const failed = new Map(); // id -> 메시지
      let queue = found ? found.slice() : [];
      let planned = queue.length;
      let batch = BATCH;

      // 검색 색인이 늦게 따라올 수 있으니 다 지운 뒤 다시 모아 남은 것을 지운다 (최대 5바퀴).
      for (let round = 0; round < 5 && !stopFlag; round++) {
        if (round > 0) {
          status.textContent = `남은 글이 있는지 다시 확인하는 중… (${round + 1}바퀴)`;
          await sleep(2000);
          let r;
          try {
            r = await collect(u.id, (n) => { status.textContent = `남은 글 확인 중… ${n}개 (${round + 1}바퀴)`; });
          } catch (e) { status.textContent = '다시 세기 실패: ' + e.message; break; }
          // 실패로 친 것 중 목록에서 사라진 것은 실제로 지워진 것, 남은 것은 한 번 더 시도.
          const still = new Set(r.ids);
          for (const id of [...failed.keys()]) {
            failed.delete(id);
            if (!still.has(id)) done.add(id);
          }
          queue = r.ids.filter((id) => !done.has(id));
          planned = done.size + queue.length;
        }
        if (!queue.length) break;
        let i = 0;
        while (i < queue.length && !stopFlag) {
          const chunk = queue.slice(i, i + batch);
          try {
            const res = await removeMany(chunk);
            for (const [id, err] of res) {
              if (err) failed.set(id, err);
              else done.add(id);
            }
            i += chunk.length;
          } catch (e) {
            // 묶음째 안 되면 반으로 줄여 다시; 하나짜리도 안 되면 실패로 치고 넘어간다.
            if (batch > 1) {
              batch = Math.max(1, batch >> 1);
              await sleep(2000);
              continue;
            }
            failed.set(chunk[0], e.message);
            i += 1;
          }
          const n = done.size + failed.size;
          fill.style.width = Math.round((n / Math.max(planned, 1)) * 100) + '%';
          status.textContent =
            `삭제 중… ${done.size} / ${planned}` + (failed.size ? `\n실패 ${failed.size}` : '') + `\n(한 번에 ${batch}개)`;
          await sleep(300);
        }
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
        const first = failed.values().next().value;
        msg += `\n(예: ${first})`;
        console.warn('[엔트리 이야기 일괄 삭제] 실패:', Object.fromEntries(failed));
      }
      status.textContent = msg;
    };

    stopBtn.onclick = () => { stopFlag = true; stopBtn.textContent = '멈추는 중…'; };

    p.append(countBtn, confirmRow, delBtn, stopBtn);
    return p;
  }

  // 마이페이지인지 (주소 /profile/<내 id>...) 보고 패널을 붙이거나 뗀다. 페이지 안 이동도 따라간다.
  let hiddenFor = null;
  function tick() {
    const u = me();
    const seg = location.pathname.split('/');
    const onMyPage = !!u && seg[1] === 'profile' && seg[2] === u.id;
    if (onMyPage && !panel && hiddenFor !== location.pathname) {
      panel = buildPanel();
      document.body.append(panel);
    } else if (!onMyPage && panel && !running) {
      panel.remove();
      panel = null;
    }
    if (!onMyPage) hiddenFor = null;
  }
  setInterval(tick, 1000);
  tick();
})();
