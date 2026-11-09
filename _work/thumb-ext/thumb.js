// 엔트리 썸네일 APNG - runs in the page of playentry.org (the MAIN world, from document_start).
// The site saves a work's thumbnail by its own code (WebAssembly): it reads the stage canvas with
// entryCanvas.toDataURL() (no arguments) and uploads that to /rest/picture/project/thumbnail/<id>.
// When an APNG is chosen for the work open now, that one call gives the APNG instead, so the site
// uploads it as it would its own picture. Nothing else reads the canvas that way.
// The APNG is kept in this browser (IndexedDB of playentry.org), one for each work (by its id;
// 'new' for a work not saved yet, moved to its id when it is first saved).
(() => {
  if (window.__entryThumb) return;
  window.__entryThumb = true;
  const TAG = '[엔트리 썸네일 APNG]';

  // ---------------------------------------------------------------- keeping the pictures
  const openDb = () => new Promise((ok, no) => {
    const r = indexedDB.open('entry-thumb-apng', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
  const idb = async (mode, fn) => {
    const db = await openDb();
    return new Promise((ok, no) => {
      const tx = db.transaction('files', mode), req = fn(tx.objectStore('files'));
      tx.oncomplete = () => ok(req ? req.result : undefined); tx.onerror = () => no(tx.error);
    });
  };
  const dbGet = (k) => idb('readonly', (s) => s.get(k));
  const dbPut = (k, v) => idb('readwrite', (s) => s.put(v, k));
  const dbDel = (k) => idb('readwrite', (s) => s.delete(k));

  // the work open now: its id (from Entry or the address), or 'new'
  const workId = () => {
    const E = window.Entry, m = location.pathname.match(/\/ws\/([0-9a-f]{24})/);
    return (E && E.projectId) || (m && m[1]) || 'new';
  };
  // toDataURL is synchronous: the picture of the work open now (or of 'new') is kept at hand
  const cache = {};
  let cachedFor = '';
  async function refresh() {
    const id = workId();
    for (const k of [id, 'new']) { try { cache[k] = (await dbGet(k)) || null; } catch (e) { cache[k] = null; } }
    cachedFor = id;
    render();
  }
  setInterval(() => { if (workId() !== cachedFor) refresh(); }, 1500);
  const chosen = () => cache[workId()] || cache.new || null;
  const chosenKey = () => (cache[workId()] ? workId() : cache.new ? 'new' : '');

  // ---------------------------------------------------------------- the swap
  let lastSwap = '';
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    if (args.length === 0 && this.id === 'entryCanvas') {
      const c = chosen();
      if (c && c.on) { lastSwap = chosenKey(); console.info(TAG, '썸네일 대신', c.name); return c.url; }
    }
    return origToDataURL.apply(this, args);
  };
  // the upload: say how it went; a picture kept as 'new' goes to the work's id
  const THUMB = /\/rest\/picture\/project\/thumbnail\/([0-9a-f]{24})/;
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || String(input);
    const m = url.match(THUMB);
    const p = origFetch.call(this, input, init);
    if (m) {
      const swapped = lastSwap; lastSwap = '';
      p.then(async (res) => {
        if (!swapped) return;
        if (res.ok) {
          toast('APNG 썸네일을 올렸습니다');
          if (swapped === 'new') { const v = cache.new; await dbPut(m[1], v); await dbDel('new'); cache[m[1]] = v; cache.new = null; render(); }
        } else toast(`APNG 썸네일을 올리지 못했습니다 (서버 응답 ${res.status}). 파일이 너무 크면 줄여 보세요`, true);
        console.info(TAG, '썸네일 올림', res.status);
      }, (e) => { if (swapped) toast('APNG 썸네일을 올리지 못했습니다: ' + e.message, true); });
    }
    return p;
  };

  // ---------------------------------------------------------------- reading a file
  // a PNG's size and whether it moves (an acTL chunk before the first IDAT)
  function pngInfo(buf) {
    const b = new Uint8Array(buf), dv = new DataView(buf);
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    if (b.length < 33 || sig.some((v, i) => b[i] !== v)) return null;
    const info = { w: dv.getUint32(16), h: dv.getUint32(20), frames: 1 };
    let o = 8;
    while (o + 8 <= b.length) {
      const len = dv.getUint32(o), type = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
      if (type === 'acTL') info.frames = dv.getUint32(o + 8);
      if (type === 'IDAT' || type === 'IEND') break;
      o += 12 + len;
    }
    return info;
  }
  function toDataUrl(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return 'data:image/png;base64,' + btoa(s);
  }
  async function choose(file) {
    const buf = await file.arrayBuffer(), info = pngInfo(buf);
    if (!info) { toast('PNG나 APNG 파일이 아닙니다', true); return; }
    const v = { name: file.name, url: toDataUrl(buf), w: info.w, h: info.h, frames: info.frames, bytes: buf.byteLength, on: true };
    const k = workId();
    await dbPut(k, v); cache[k] = v;
    if (k !== 'new' && cache.new) { await dbDel('new'); cache.new = null; }
    render();
    toast(info.frames > 1 ? `${file.name}: 다음에 저장할 때 썸네일로 올라갑니다` : `${file.name}: 움직이지 않는 PNG입니다. 그래도 썸네일로 씁니다`);
  }

  // ---------------------------------------------------------------- on the page
  let btn = null, panel = null, toastEl = null, toastT = 0;
  const css = (el, s) => { el.style.cssText = s; return el; };
  function toast(msg, bad) {
    if (!document.body) return;
    if (!toastEl) toastEl = css(document.createElement('div'), 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;color:#fff;font:14px/1.5 "Malgun Gothic",sans-serif;padding:10px 16px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);pointer-events:none;max-width:90vw;text-align:center');
    toastEl.style.background = bad ? '#8a2a22' : '#1f3a5a';
    toastEl.textContent = msg;
    if (!toastEl.isConnected) document.body.appendChild(toastEl);
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.remove(), 6000);
  }
  const onEditor = () => /^\/ws\//.test(location.pathname);
  function build() {
    btn = css(document.createElement('button'), 'position:fixed;right:16px;bottom:16px;z-index:2147483646;padding:8px 12px;border:0;border-radius:18px;background:#2f5f9a;color:#fff;font:600 13px "Malgun Gothic",sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)');
    btn.type = 'button'; btn.textContent = '썸네일 APNG';
    btn.onclick = () => { panel.hidden = !panel.hidden; render(); };
    panel = css(document.createElement('div'), 'position:fixed;right:16px;bottom:60px;z-index:2147483646;width:300px;padding:14px;border-radius:10px;background:#fff;color:#222;font:13px/1.5 "Malgun Gothic",sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)');
    panel.hidden = true;
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.png,.apng,image/png,image/apng'; file.hidden = true;
    file.onchange = () => { if (file.files[0]) choose(file.files[0]); file.value = ''; };
    panel.innerHTML = '<b style="font-size:14px">썸네일 APNG</b><div data-k="who" style="color:#666;margin:2px 0 8px"></div>' +
      '<div data-k="pic" style="background:#eee;border-radius:6px;aspect-ratio:16/9;display:grid;place-items:center;overflow:hidden;color:#888">고른 그림 없음</div>' +
      '<div data-k="info" style="margin:6px 0;color:#444"></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button data-k="pick" type="button">APNG 고르기</button><button data-k="toggle" type="button"></button><button data-k="del" type="button">지우기</button></div>' +
      '<div style="margin-top:8px;color:#666">저장할 때 이 그림이 엔트리가 찍은 화면 대신 썸네일로 올라갑니다. 16:9(예: 640×360)가 알맞습니다</div>';
    panel.appendChild(file);
    for (const b of panel.querySelectorAll('button')) css(b, 'padding:5px 10px;border:1px solid #bbb;border-radius:6px;background:#f6f6f6;cursor:pointer;font:inherit');
    panel.querySelector('[data-k=pick]').onclick = () => file.click();
    panel.querySelector('[data-k=toggle]').onclick = async () => { const k = chosenKey(); if (!k) return; cache[k].on = !cache[k].on; await dbPut(k, cache[k]); render(); };
    panel.querySelector('[data-k=del]').onclick = async () => { const k = chosenKey(); if (!k) return; await dbDel(k); cache[k] = null; render(); toast('지웠습니다. 다음 저장부터 엔트리가 찍은 화면이 썸네일이 됩니다'); };
    document.body.append(btn, panel);
  }
  let lastSig = '';
  function render() {
    if (!document.body) return;
    if (!btn && onEditor()) build();
    if (!btn) return;
    btn.hidden = !onEditor(); if (btn.hidden) panel.hidden = true;
    const c = chosen(), id = workId();
    // (only when something changed: the picture would start over)
    const sig = [btn.hidden, panel.hidden, id, c ? c.name + c.on + c.bytes : ''].join('|');
    if (sig === lastSig) return;
    lastSig = sig;
    btn.textContent = c && c.on ? '썸네일 APNG ●' : '썸네일 APNG';
    if (panel.hidden) return;
    const q = (k) => panel.querySelector(`[data-k=${k}]`);
    q('who').textContent = id === 'new' ? '이 작품: 아직 저장하지 않은 새 작품' : '이 작품: ' + id;
    q('pic').innerHTML = '';
    if (c) { const im = css(document.createElement('img'), 'width:100%;height:100%;object-fit:contain'); im.src = c.url; q('pic').appendChild(im); }
    else q('pic').textContent = '고른 그림 없음';
    let info = '';
    if (c) {
      info = `${c.name} · ${c.w}×${c.h} · ${c.frames > 1 ? c.frames + '장면 움직임' : '움직이지 않음'} · ${c.bytes >= 1e6 ? (c.bytes / 1e6).toFixed(2) + ' MB' : Math.max(1, Math.round(c.bytes / 1e3)) + ' KB'}`;
      if (Math.abs(c.w / c.h - 16 / 9) > 0.05) info += ' · 16:9가 아니어서 잘리거나 여백이 생길 수 있습니다';
      if (!c.on) info += ' · 꺼 둠';
    }
    q('info').textContent = info;
    q('toggle').textContent = c && !c.on ? '켜기' : '끄기';
    q('toggle').disabled = q('del').disabled = !c;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
  // (the site changes pages without loading them)
  setInterval(render, 2000);
  window.__entryThumbTest = { refresh, chosen, workId, cache, pngInfo, choose };
})();
