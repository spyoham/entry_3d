// 엔트리 작품 일괄 비공개
// 내 프로필의 작품 탭(/profile/<내 id>/project)에 체크박스를 달고,
// 고른 작품 가운데 공개 중인 것만 toggleIsopenProject 로 비공개로 바꾼다.
(() => {
  'use strict';

  const PROJECT_HREF_RE = /^\/project\/([0-9a-f]{24})(?:[/?#]|$)/;
  const GAP_MS = 250; // 요청 사이 간격

  const selected = new Set();
  let lastClickedId = null;
  let running = false;
  let bar = null;
  let observer = null;

  // ---------- 로그인 정보 ----------

  function nextState() {
    try {
      const nd = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
      const p = nd.props || {};
      return (p.pageProps && p.pageProps.initialState) || p.initialState || null;
    } catch (e) {
      return null;
    }
  }

  function xToken() {
    return nextState()?.common?.user?.xToken || null;
  }

  // 로그인한 사용자 id. 서버에 묻고, 안 되면 __NEXT_DATA__ 를 본다.
  let myIdCache = null;
  async function myId() {
    if (myIdCache) return myIdCache;
    try {
      const d = await gql('SELECT_ME_ID', 'query SELECT_ME_ID { me { id } }', {});
      myIdCache = d?.me?.id || null;
    } catch (e) {
      const u = nextState()?.common?.user;
      myIdCache = (u && (u.id || u._id)) || null;
    }
    return myIdCache;
  }

  // ---------- GraphQL ----------

  async function gql(opName, query, variables) {
    const headers = {
      'Content-Type': 'application/json',
      'x-client-type': 'Client',
    };
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrf) headers['CSRF-Token'] = csrf;
    const token = xToken();
    if (token) headers['x-token'] = token;

    const res = await fetch(`/graphql/${opName}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors && json.errors.length) {
      throw new Error(json.errors[0].message || 'GraphQL 오류');
    }
    return json.data;
  }

  const Q_PROJECT = `query SELECT_PROJECT_ISOPEN($id: ID!) {
    project(id: $id) { id name isopen user { id } }
  }`;
  const M_TOGGLE = `mutation TOGGLE_ISOPEN_PROJECT($id: ID!) {
    toggleIsopenProject(id: $id) { status result }
  }`;

  const getProject = async (id) => (await gql('SELECT_PROJECT_ISOPEN', Q_PROJECT, { id })).project;
  const toggleIsopen = async (id) => (await gql('TOGGLE_ISOPEN_PROJECT', M_TOGGLE, { id })).toggleIsopenProject;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 페이지 판별 ----------

  function profileIdInPath() {
    const m = location.pathname.match(/^\/profile\/([0-9a-f]{24})(?:\/project)?\/?$/);
    return m ? m[1] : null;
  }

  async function isMyProjectPage() {
    const pid = profileIdInPath();
    return !!(pid && pid === (await myId()));
  }

  // ---------- 작품 카드 ----------

  // 작품 링크를 품은 가장 가까운 <li> 를 카드로 본다.
  function findCards() {
    const cards = new Map();
    for (const a of document.querySelectorAll('a[href^="/project/"]')) {
      const m = a.getAttribute('href').match(PROJECT_HREF_RE);
      if (!m) continue;
      const li = a.closest('li');
      if (!li || li.closest('.epx-bar')) continue;
      if (!cards.has(li)) cards.set(li, m[1]);
    }
    return cards;
  }

  function cardIds() {
    return [...findCards().values()];
  }

  function decorate() {
    for (const [li, id] of findCards()) {
      if (li.dataset.epxId === id) continue;
      // React 가 같은 <li> 에 다른 작품을 다시 그렸을 수 있다
      li.querySelectorAll(':scope > .epx-check, :scope > .epx-badge').forEach((el) => el.remove());
      li.dataset.epxId = id;
      li.classList.add('epx-card');

      const label = document.createElement('label');
      label.className = 'epx-check';
      label.title = '선택 (Shift+클릭: 범위 선택)';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = selected.has(id);
      label.appendChild(box);
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target !== box) return;
        onCheck(id, box.checked, e.shiftKey);
      });
      li.prepend(label);
      paintCard(li);
    }
  }

  function onCheck(id, checked, shift) {
    if (running) return;
    if (shift && lastClickedId && lastClickedId !== id) {
      const ids = cardIds();
      const a = ids.indexOf(lastClickedId);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        for (const x of ids.slice(lo, hi + 1)) checked ? selected.add(x) : selected.delete(x);
      }
    } else {
      checked ? selected.add(id) : selected.delete(id);
    }
    lastClickedId = id;
    refresh();
  }

  function paintCard(li) {
    const id = li.dataset.epxId;
    const on = selected.has(id);
    li.classList.toggle('epx-selected', on);
    const box = li.querySelector(':scope > .epx-check input');
    if (box) {
      box.checked = on;
      box.disabled = running;
    }
  }

  function setBadge(id, text, kind) {
    for (const li of document.querySelectorAll(`li[data-epx-id="${id}"]`)) {
      let b = li.querySelector(':scope > .epx-badge');
      if (!b) {
        b = document.createElement('span');
        li.appendChild(b);
      }
      b.className = `epx-badge epx-${kind}`;
      b.textContent = text;
    }
  }

  // ---------- 도구 막대 ----------

  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'epx-bar';
    bar.innerHTML = `
      <span class="epx-title">작품 일괄 비공개</span>
      <span class="epx-count"></span>
      <button type="button" data-act="all">보이는 작품 모두 선택</button>
      <button type="button" data-act="none">선택 해제</button>
      <button type="button" data-act="run" class="epx-primary">선택한 작품 비공개</button>
      <span class="epx-status"></span>`;
    bar.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (!act || running) return;
      if (act === 'all') cardIds().forEach((id) => selected.add(id));
      if (act === 'none') selected.clear();
      if (act === 'run') return runPrivate();
      refresh();
    });
    document.body.appendChild(bar);
  }

  function status(text) {
    if (bar) bar.querySelector('.epx-status').textContent = text;
  }

  function refresh() {
    if (!bar) return;
    bar.querySelector('.epx-count').textContent = `${selected.size}개 선택`;
    for (const btn of bar.querySelectorAll('button')) btn.disabled = running;
    bar.querySelector('[data-act="run"]').disabled = running || selected.size === 0;
    document.querySelectorAll('li.epx-card').forEach(paintCard);
  }

  // ---------- 실행 ----------

  async function runPrivate() {
    const me = await myId();
    if (!me) {
      status('로그인 정보를 찾지 못했습니다. 새로고침 후 다시 해 보세요.');
      return;
    }
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`선택한 작품 ${ids.length}개를 비공개로 바꿉니다. 계속할까요?`)) return;

    running = true;
    refresh();
    let done = 0, already = 0, failed = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      status(`${i + 1} / ${ids.length} 처리 중…`);
      setBadge(id, '처리 중', 'busy');
      try {
        const p = await getProject(id);
        if (!p) throw new Error('작품을 찾을 수 없음');
        if (p.user?.id !== me) throw new Error('내 작품이 아님');
        if (!p.isopen) {
          already++;
          setBadge(id, '이미 비공개', 'ok');
        } else {
          // 공개 ↔ 비공개를 뒤집는 요청이므로, 공개일 때만 한 번 보낸다.
          await toggleIsopen(id);
          await sleep(GAP_MS);
          const after = await getProject(id);
          if (after && after.isopen === false) {
            done++;
            setBadge(id, '비공개됨', 'ok');
          } else {
            throw new Error('바뀌지 않음');
          }
        }
        selected.delete(id);
      } catch (err) {
        failed++;
        setBadge(id, `실패: ${err.message}`, 'err');
        console.warn('[엔트리 작품 일괄 비공개]', id, err);
      }
      await sleep(GAP_MS);
    }

    running = false;
    refresh();
    lastPath = null; // 실행 중에 다른 페이지로 갔다면 이제 정리한다
    check();
    status(`완료: 비공개로 바꿈 ${done}, 이미 비공개 ${already}, 실패 ${failed}`);
  }

  // ---------- 페이지 이동 감시 (Next.js 클라이언트 라우팅) ----------

  function activate() {
    if (!bar) buildBar();
    decorate();
    refresh();
    if (!observer) {
      let pending = false;
      observer = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          decorate();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function deactivate() {
    if (running) return;
    observer?.disconnect();
    observer = null;
    bar?.remove();
    bar = null;
    selected.clear();
    lastClickedId = null;
    document.querySelectorAll('.epx-check, .epx-badge').forEach((el) => el.remove());
    document.querySelectorAll('li.epx-card').forEach((li) => {
      li.classList.remove('epx-card', 'epx-selected');
      delete li.dataset.epxId;
    });
  }

  let lastPath = null;
  async function check() {
    if (location.pathname === lastPath) return;
    const path = (lastPath = location.pathname);
    const mine = profileIdInPath() ? await isMyProjectPage() : false;
    if (path !== location.pathname) return; // 기다리는 사이 또 이동함
    mine ? activate() : deactivate();
  }

  check();
  setInterval(check, 500);
})();
