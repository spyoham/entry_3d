// 엔트리 이야기 1시간 뒤 삭제 — 배경(service worker)과 엔트리 탭(content script)이 같이 쓰는 부분.
// 하는 일: 로그인한 계정이 쓴 엔트리 이야기 글 가운데 쓴 지 1시간이 넘은 것을 찾아 지운다.
// 댓글은 목록에 나오지 않으므로 건드리지 않는다 (글을 지우면 그 글에 달린 댓글은 글과 함께 안 보이게 된다).
(() => {
  const SITE = 'https://playentry.org';
  const MAX_AGE_MS = 60 * 60 * 1000; // 이보다 오래된 글을 지운다
  const BATCH = 20; // 한 요청에 지우는 글 수 (안 되면 저절로 줄인다)
  const BUDGET_MS = 60 * 1000; // 한 번 도는 데 쓰는 시간. 넘으면 다음 차례에 이어서 한다.

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const LIST_Q = `query SELECT_ENTRYSTORY($pageParam: PageParam $user: String $category: String $term: String $searchType: String $searchAfter: JSON){
    discussList(pageParam: $pageParam user: $user category: $category term: $term searchType: $searchType searchAfter: $searchAfter){
      total
      list { id created category user { id } }
      searchAfter
    }
  }`;

  // 페이지에 들어 있는 로그인 정보 (__NEXT_DATA__ 의 common.user)
  function userFromNextData(text) {
    try {
      const p = JSON.parse(text).props;
      const of = (s) => s && s.common && s.common.user;
      const u = of(p.pageProps && p.pageProps.initialState) || of(p.initialState);
      return u && u.id ? { id: u.id, nickname: u.nickname || '', xToken: u.xToken || '' } : null;
    } catch (e) {
      return null;
    }
  }

  function authFromHtml(html) {
    const meta = (html.match(/<meta[^>]+name="csrf-token"[^>]*>/) || [''])[0];
    const csrf = (meta.match(/content="([^"]*)"/) || [])[1] || '';
    const data = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    return { csrf, user: userFromNextData(data && data[1]) };
  }

  // 엔트리 페이지를 새로 받아 지금 로그인 정보를 읽는다.
  async function fetchAuth() {
    const res = await fetch(SITE + '/community/entrystory/list', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('엔트리 페이지를 못 받음 (HTTP ' + res.status + ')');
    return authFromHtml(await res.text());
  }

  function errOf(e) {
    const code = (e && e.statusCode) || 0;
    let text = (e && e.message) || '';
    if (!text) {
      text =
        code === 401 ? '로그인이 필요합니다 (401)' : code === 403 ? '권한이 없습니다 (403)' : code ? '오류 ' + code : 'GraphQL 오류';
    }
    return { code, text };
  }

  // 돌려주는 것: { json, now } — now 는 서버 시계 (응답의 Date 헤더). 내 컴퓨터 시계가 틀려도 1시간을 바르게 잰다.
  async function gql(auth, name, query, variables) {
    const headers = { 'content-type': 'application/json', 'CSRF-Token': auth.csrf, 'x-client-type': 'Client' };
    if (auth.user && auth.user.xToken) headers['x-token'] = auth.user.xToken;
    // 요청을 몰아 보내면 서버가 응답 없이 붙잡고 있을 때가 있다: 10초 넘으면 끊고 쉬었다 다시.
    for (let attempt = 0; ; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10000);
      try {
        const res = await fetch(SITE + '/graphql/' + name, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ query, variables }),
          signal: ac.signal,
        });
        if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
        if (!res.ok) {
          const e = new Error('HTTP ' + res.status);
          e.status = res.status;
          throw e;
        }
        const json = await res.json();
        const date = Date.parse(res.headers.get('date') || '');
        return { json, now: Number.isFinite(date) ? date : Date.now() };
      } catch (e) {
        if (e.status || attempt >= 2) {
          const err = new Error(e.name === 'AbortError' ? '응답 없음(시간 초과)' : e.message);
          err.status = e.status;
          throw err;
        }
        await sleep(2000 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // 한 요청에 여러 개를 지운다: d0: removeDiscuss(id: $i0) d1: ... 서버는 별칭마다 따로 실행한다.
  // removeDiscuss 는 사이트의 글 삭제 버튼이 쓰는 것. 돌려주는 것: id -> null(성공) 또는 { code, text }.
  async function removeMany(auth, ids) {
    const vars = {};
    const defs = [];
    const fields = [];
    ids.forEach((id, k) => {
      vars['i' + k] = id;
      defs.push(`$i${k}: ID`);
      fields.push(`d${k}: removeDiscuss(id: $i${k}){ id }`);
    });
    const q = `mutation REMOVE_DISCUSS(${defs.join(' ')}) { ${fields.join(' ')} }`;
    const { json } = await gql(auth, 'REMOVE_DISCUSS', q, vars);
    const errs = (json && json.errors) || [];
    const out = new Map();
    ids.forEach((id, k) => {
      const ok = json && json.data && json.data['d' + k];
      out.set(id, ok ? null : errOf(errs.find((e) => e.path && e.path[0] === 'd' + k) || errs[0]));
    });
    return out;
  }

  // 한 번 돈다. env.getAuth(fresh) 는 { csrf, user } 를 준다 (fresh 면 새로 받아서).
  // opts: dryRun(세기만), skip(방금 지워서 다시 볼 필요 없는 id들), budgetMs
  // 돌려주는 것: { state: 'ok' | 'loggedout', nickname, found, deleted, failed, deletedIds, more, error }
  async function sweep(env, opts = {}) {
    const started = Date.now();
    const budget = opts.budgetMs || BUDGET_MS;
    const over = () => Date.now() - started > budget;
    const skip = new Set(opts.skip || []);

    let auth = await env.getAuth(false);
    if (!auth.user) return { state: 'loggedout' };
    const uid = auth.user.id;
    const out = {
      state: 'ok',
      nickname: auth.user.nickname,
      found: 0,
      deleted: 0,
      failed: 0,
      deletedIds: [],
      more: false,
      error: '',
    };

    // 토큰이 낡았으면 한 번만 새로 받는다. 그 사이 다른 계정이 되었으면 그만둔다 (다음 차례에 그 계정으로 다시 본다).
    let refreshed = false;
    const refresh = async () => {
      refreshed = true;
      auth = await env.getAuth(true);
      if (!auth.user) {
        out.state = 'loggedout';
        return false;
      }
      if (auth.user.id !== uid) {
        out.error = '로그인한 계정이 바뀌었습니다';
        out.more = true;
        return false;
      }
      return true;
    };

    let batch = BATCH;
    const remove = async (ids) => {
      const queue = ids.slice();
      while (queue.length) {
        if (over()) {
          out.more = true;
          return false;
        }
        const chunk = queue.splice(0, batch);
        let res;
        try {
          res = await removeMany(auth, chunk);
        } catch (e) {
          if ((e.status === 401 || e.status === 403) && !refreshed) {
            if (!(await refresh())) return false;
            queue.unshift(...chunk);
          } else if (batch > 1) {
            // 묶음째 안 되면 반으로 줄여 다시
            batch = Math.max(1, batch >> 1);
            queue.unshift(...chunk);
            await sleep(2000);
          } else {
            out.failed += chunk.length;
            out.error = e.message;
          }
          continue;
        }
        const again = [];
        for (const [id, err] of res) {
          if (!err) {
            out.deleted++;
            out.deletedIds.push(id);
          } else if (err.code === 401 && !refreshed) {
            again.push(id);
          } else {
            out.failed++;
            out.error = err.text;
          }
        }
        if (again.length) {
          if (!(await refresh())) return false;
          queue.unshift(...again);
        }
        await sleep(300);
      }
      return true;
    };

    const seen = new Set();
    let searchAfter = null;
    const maxPages = opts.dryRun ? 40 : 400;
    for (let page = 0; ; page++) {
      if (over() || page >= maxPages) {
        out.more = true;
        break;
      }
      const { json, now } = await gql(auth, 'SELECT_ENTRYSTORY', LIST_Q, {
        category: 'free',
        searchType: 'scroll',
        term: 'all',
        user: uid,
        pageParam: { display: 50, sort: 'created' },
        searchAfter,
      });
      if (json.errors && json.errors.length) throw new Error(errOf(json.errors[0]).text);
      const L = json.data && json.data.discussList;
      if (!L) break;

      let fresh = 0;
      const old = [];
      for (const x of L.list || []) {
        if (!x || !x.id || seen.has(x.id)) continue;
        seen.add(x.id);
        fresh++;
        // 내 글이고, 엔트리 이야기이고, 쓴 시각을 알고, 1시간이 지난 것만
        if (!x.user || x.user.id !== uid || x.category !== 'free') continue;
        const t = Date.parse(x.created);
        if (!Number.isFinite(t) || now - t < MAX_AGE_MS) continue;
        if (skip.has(x.id)) continue;
        old.push(x.id);
      }
      out.found += old.length;
      if (!opts.dryRun && old.length && !(await remove(old))) break;
      if (!fresh || !L.searchAfter) break; // 빈 쪽이거나 같은 쪽이 또 오면 끝
      searchAfter = L.searchAfter;
      await sleep(300);
    }
    return out;
  }

  globalThis.StoryHour = { SITE, MAX_AGE_MS, sweep, fetchAuth, authFromHtml, userFromNextData };
})();
