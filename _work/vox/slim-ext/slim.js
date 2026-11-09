// 엔트리 작품 줄여 저장 — runs in the page of playentry.org (the MAIN world, from document_start).
// 1. Entry.exportProject() (what saving, the save-to-computer and the auto backup all call) gives the
//    project without the block fields that only repeat Entry's defaults (x, y, movable, deletable,
//    emphasized, readOnly, copyable, assemble, empty extensions/statements). Entry fills them in again
//    when it loads a work, so nothing changes but the size (about half).
// 2. The save request (graphql UPDATE_PROJECT / CREATE_PROJECT) gets 3 minutes instead of the site's
//    20 seconds, so a big work on a slow line is not cut off; its body is slimmed again as a backstop.
// 3. Putting an object or blocks in the backpack (보관함, POST /rest/backpack) sends them slimmed too.
(() => {
  if (window.__entrySlim) return;
  window.__entrySlim = true;
  const TAG = '[엔트리 작품 줄이기]';
  const DEFAULTS = { x: 0, y: 0, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true };
  const SAVE_TIMEOUT = 180000;

  function slimWalk(b, st) {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { for (const x of b) slimWalk(x, st); return; }
    if (typeof b.type === 'string') {
      for (const k in DEFAULTS) if (k in b && b[k] === DEFAULTS[k]) { delete b[k]; st.n++; }
      if (Array.isArray(b.extensions) && !b.extensions.length) { delete b.extensions; st.n++; }
      if (Array.isArray(b.statements) && !b.statements.length) { delete b.statements; st.n++; }
    }
    if (Array.isArray(b.params)) for (const p of b.params) slimWalk(p, st);
    if (Array.isArray(b.statements)) for (const s of b.statements) slimWalk(s, st);
  }
  // a script is kept as a JSON string (or as the array itself)
  function slimScript(s, st) {
    if (typeof s === 'string') {
      if (!s) return s;
      const v = JSON.parse(s); const before = st.n; slimWalk(v, st);
      return st.n === before ? s : JSON.stringify(v);
    }
    slimWalk(s, st); return s;
  }
  function slimProject(p) {
    const st = { n: 0 };
    if (!p || typeof p !== 'object') return 0;
    for (const f of Array.isArray(p.functions) ? p.functions : []) if (f && f.content) f.content = slimScript(f.content, st);
    for (const o of Array.isArray(p.objects) ? p.objects : []) if (o && o.script) o.script = slimScript(o.script, st);
    return st.n;
  }
  // a backpack item: {objects: [{script}], functions: [{content}], ...} for an object,
  // {script: '[[...]]', functions, ...} for blocks
  function slimItem(item) {
    if (!item || typeof item !== 'object') return 0;
    let n = slimProject(item);
    if (item.script) { const st = { n: 0 }; item.script = slimScript(item.script, st); n += st.n; }
    return n;
  }
  window.__entrySlimProject = slimProject;   // for checking by hand in the console
  window.__entrySlimItem = slimItem;

  // a small note at the bottom of the page
  let toastEl = null, toastT = 0;
  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;' +
          'background:#1f3a2b;color:#e8f3ec;font:14px/1.5 "Malgun Gothic",sans-serif;padding:10px 16px;border-radius:8px;' +
          'box-shadow:0 4px 16px rgba(0,0,0,.25);pointer-events:none;max-width:90vw;text-align:center';
      }
      toastEl.textContent = msg;
      if (!toastEl.isConnected) document.body.appendChild(toastEl);
      clearTimeout(toastT); toastT = setTimeout(() => toastEl.remove(), 6000);
    } catch (e) { /* the page has no body yet */ }
  }

  // 1. wrap Entry.exportProject once Entry is there (and again if the page ever puts back its own)
  let lastRemoved = 0;
  function hook() {
    const E = window.Entry;
    if (!E || typeof E.exportProject !== 'function' || E.exportProject.__slim) return;
    const orig = E.exportProject;
    const wrapped = function (...args) {
      const r = orig.apply(this, args);
      try { lastRemoved = slimProject(r); } catch (e) { console.warn(TAG, '줄이지 못하고 그대로 둡니다', e); }
      return r;
    };
    wrapped.__slim = true;
    E.exportProject = wrapped;
    console.info(TAG, '켜짐: 저장할 때 블록의 기본값을 뺍니다.');
  }
  hook();
  setInterval(hook, 1000);

  // 2. the save request
  const SAVE = /\/graphql\/(UPDATE_PROJECT|CREATE_PROJECT)(\?|$)/;
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || String(input);
      if (SAVE.test(url) && init && typeof init.body === 'string') {
        const body = JSON.parse(init.body);
        const more = slimProject(body && body.variables);
        init = Object.assign({}, init);
        if (more) init.body = JSON.stringify(body);
        // the site aborts after 20 s; give it longer, still giving up in the end
        const ac = new AbortController();
        setTimeout(() => ac.abort(), SAVE_TIMEOUT);
        init.signal = ac.signal;
        const mb = (new Blob([init.body]).size / 1e6).toFixed(1);
        const n = (lastRemoved + more).toLocaleString('ko-KR');
        console.info(TAG, `저장 요청 ${mb} MB, 뺀 기본값 ${n}개`);
        toast(`작품 줄이기: 기본값 ${n}개를 빼고 ${mb} MB로 저장합니다`);
      }
    } catch (e) { console.warn(TAG, '저장 요청을 손대지 못했습니다', e); }
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || String(input);
      if (init && typeof init.body === 'string' && isBackpackPost(init.method || 'GET', url)) init = Object.assign({}, init, { body: slimBackpackBody(init.body) });
    } catch (e) { console.warn(TAG, '보관함 요청을 손대지 못했습니다', e); }
    return origFetch.call(this, input, init);
  };

  // 3. putting an object or blocks in the backpack (보관함): POST /rest/backpack, sent by axios (XHR)
  function isBackpackPost(method, url) {
    if (String(method).toUpperCase() !== 'POST') return false;
    try { return new URL(url, location.href).pathname.replace(/\/+$/, '') === '/rest/backpack'; } catch (e) { return false; }
  }
  function slimBackpackBody(body) {
    const r = JSON.parse(body);
    const n = slimItem(r && r.item);
    if (!n) return body;
    const out = JSON.stringify(r);
    const mb = (x) => (new Blob([x]).size / 1e6).toFixed(2);
    console.info(TAG, `보관함에 넣기 ${mb(body)} MB -> ${mb(out)} MB, 뺀 기본값 ${n.toLocaleString('ko-KR')}개`);
    toast(`작품 줄이기: 보관함에 기본값 ${n.toLocaleString('ko-KR')}개를 빼고 ${mb(out)} MB로 넣습니다`);
    return out;
  }
  const XHR = XMLHttpRequest.prototype, origOpen = XHR.open, origSend = XHR.send;
  XHR.open = function (method, url, ...rest) {
    this.__slimBackpack = isBackpackPost(method, String(url));
    return origOpen.call(this, method, url, ...rest);
  };
  XHR.send = function (body) {
    if (this.__slimBackpack && typeof body === 'string') {
      try { body = slimBackpackBody(body); } catch (e) { console.warn(TAG, '보관함 요청을 손대지 못했습니다', e); }
    }
    return origSend.call(this, body);
  };
})();
