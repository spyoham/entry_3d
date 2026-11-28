// 시험: node test.mjs
// 가짜 엔트리 서버(fetch 를 바꿔치기)를 상대로 core.js 의 sweep 이 지울 것만 지우는지 본다.
// 진짜 서버에는 아무것도 보내지 않는다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

new Function(readFileSync(new URL('./core.js', import.meta.url), 'utf8'))();
const { SITE, sweep, fetchAuth } = globalThis.StoryHour;

const MIN = 60 * 1000;
const ME = 'me00000000000000000000aa';
const OTHER = 'other0000000000000000bb';

// 서버 시계는 내 컴퓨터 시계보다 3시간 빠르다고 친다: 1시간은 서버 시계로 재야 한다.
const SKEW = 3 * 60 * MIN;
const serverNow = () => Math.floor((Date.now() + SKEW) / 1000) * 1000;

function makeServer() {
  const s = {
    posts: [], // { id, created, category, user }
    login: ME, // 지금 쿠키로 로그인된 계정 (null 이면 로그아웃)
    token: 'tok-1', // 지금 통하는 x-token
    leak: false, // true 면 목록에 남의 글·다른 게시판 글이 섞여 나온다 (서버가 잘못 걸러 줄 때)
    lag: false, // true 면 지운 글이 목록에 그대로 남는다 (검색 색인이 늦을 때)
    removeCalls: [],
    removed: [],
    pageFetches: 0,
  };
  let seq = 0;
  s.add = (ageMin, user = ME, category = 'free') => {
    const id = 'p' + String(++seq).padStart(5, '0');
    s.posts.push({ id, created: serverNow() - ageMin * MIN, category, user, gone: false });
    return id;
  };
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', date: new Date(serverNow()).toUTCString() },
    });
  s.fetch = async (url, init = {}) => {
    url = String(url);
    assert.ok(url.startsWith(SITE + '/'), '엔트리 밖으로 나가는 요청: ' + url);
    if (!init.method || init.method === 'GET') {
      s.pageFetches++;
      const user = s.login ? { id: s.login, nickname: '나', xToken: s.token } : null;
      const data = { props: { initialState: { common: { user } }, pageProps: { initialState: { common: { user } } } } };
      return new Response(
        `<html><head><meta name="csrf-token" content="csrf-1" data-next-head=""/></head><body>` +
          `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`
      );
    }
    const { query, variables: v } = JSON.parse(init.body);
    if (init.headers['CSRF-Token'] !== 'csrf-1') return json({}, 403);
    if (url.endsWith('/SELECT_ENTRYSTORY')) {
      let list = s.posts.filter((p) => (s.lag || !p.gone) && (s.leak || (p.user === v.user && p.category === v.category)));
      list.sort((a, b) => b.created - a.created || (a.id < b.id ? 1 : -1));
      const total = list.length;
      if (v.searchAfter) list = list.filter((p) => p.created < v.searchAfter[0]);
      list = list.slice(0, v.pageParam.display);
      return json({
        data: {
          discussList: {
            total,
            list: list.map((p) => ({
              id: p.id,
              created: new Date(p.created).toISOString(),
              category: p.category,
              user: { id: p.user },
            })),
            searchAfter: list.length ? [list[list.length - 1].created] : null,
          },
        },
      });
    }
    if (url.endsWith('/REMOVE_DISCUSS')) {
      const keys = [...query.matchAll(/(d\d+): removeDiscuss\(id: \$(i\d+)\)/g)];
      s.removeCalls.push(keys.length);
      const data = {};
      const errors = [];
      for (const [, alias, name] of keys) {
        const p = s.posts.find((x) => x.id === v[name] && !x.gone);
        data[alias] = null;
        if (!s.login || init.headers['x-token'] !== s.token) errors.push({ statusCode: 401, path: [alias] });
        else if (!p) errors.push({ statusCode: 404, path: [alias] });
        else if (p.user !== s.login) errors.push({ statusCode: 403, path: [alias] });
        else {
          p.gone = true;
          s.removed.push(p.id);
          data[alias] = { id: p.id };
        }
      }
      return json(errors.length ? { errors, data } : { data });
    }
    return json({}, 404);
  };
  return s;
}

const envOf = () => {
  let cached = null;
  return {
    async getAuth(fresh) {
      if (fresh || !cached) cached = await fetchAuth();
      return cached;
    },
  };
};
const left = (s) => s.posts.filter((p) => !p.gone).map((p) => p.id);
let passed = 0;
async function test(name, fn) {
  const s = makeServer();
  globalThis.fetch = s.fetch;
  await fn(s);
  passed++;
  console.log('ok  ' + name);
}

await test('1시간 넘은 내 글만 지운다 (여러 쪽, 20개씩 묶어서)', async (s) => {
  const old = [];
  const fresh = [];
  for (let i = 0; i < 60; i++) fresh.push(s.add(1 + (i * 58) / 60)); // 1분 ~ 59분 전
  for (let i = 0; i < 70; i++) old.push(s.add(61 + i * 7)); // 61분 전 ~
  const r = await sweep(envOf());
  assert.equal(r.state, 'ok');
  assert.equal(r.deleted, 70);
  assert.equal(r.failed, 0);
  assert.equal(r.more, false);
  assert.deepEqual(s.removed.slice().sort(), old.slice().sort());
  assert.deepEqual(left(s).sort(), fresh.slice().sort());
  assert.ok(Math.max(...s.removeCalls) === 20, '묶음 크기: ' + s.removeCalls);
});

await test('경계: 59분 59초 된 글은 두고 1시간 1초 된 글은 지운다 (서버 시계로)', async (s) => {
  const keep = s.add(59 + 58 / 60);
  const go = s.add(60 + 2 / 60);
  // 내 컴퓨터 시계로는 둘 다 "3시간 뒤에 쓴 글"이다. 서버 시계를 안 쓰면 아무것도 못 지운다.
  const r = await sweep(envOf());
  assert.deepEqual(s.removed, [go]);
  assert.deepEqual(left(s), [keep]);
  assert.equal(r.deleted, 1);
});

await test('목록에 남의 글·다른 게시판 글이 섞여 와도 손대지 않는다', async (s) => {
  s.leak = true;
  const mine = s.add(120);
  s.add(120, OTHER);
  s.add(120, ME, 'qna');
  s.add(120, ME, 'tips');
  s.add(120, OTHER, 'qna');
  const r = await sweep(envOf());
  assert.deepEqual(s.removed, [mine]);
  assert.equal(r.found, 1);
  assert.equal(s.removeCalls.reduce((a, b) => a + b, 0), 1, '지우려 든 글 수');
});

await test('세기만 할 때는 아무것도 지우지 않는다', async (s) => {
  for (let i = 0; i < 5; i++) s.add(90 + i);
  s.add(10);
  const r = await sweep(envOf(), { dryRun: true });
  assert.equal(r.found, 5);
  assert.equal(r.deleted, 0);
  assert.equal(s.removeCalls.length, 0);
  assert.equal(left(s).length, 6);
});

await test('로그아웃 상태면 아무 요청도 보내지 않는다', async (s) => {
  s.login = null;
  s.add(500);
  const r = await sweep(envOf());
  assert.equal(r.state, 'loggedout');
  assert.equal(s.removeCalls.length, 0);
  assert.equal(left(s).length, 1);
});

await test('토큰이 낡았으면 새로 받아 다시 지운다', async (s) => {
  for (let i = 0; i < 25; i++) s.add(100 + i);
  const env = envOf();
  await env.getAuth(false); // tok-1 을 쥔 채로
  s.token = 'tok-2'; // 서버 쪽 토큰이 바뀜
  const r = await sweep(env);
  assert.equal(r.deleted, 25);
  assert.equal(r.failed, 0);
  assert.equal(left(s).length, 0);
});

await test('도는 사이 다른 계정으로 바뀌었으면 그만둔다', async (s) => {
  for (let i = 0; i < 3; i++) s.add(100 + i);
  s.add(100, OTHER);
  const env = envOf();
  await env.getAuth(false);
  s.login = OTHER;
  s.token = 'tok-other';
  const r = await sweep(env);
  assert.equal(r.deleted, 0);
  assert.equal(s.removed.length, 0);
  assert.match(r.error, /계정이 바뀌/);
});

await test('도는 사이 로그아웃되었으면 그만둔다', async (s) => {
  s.add(100);
  const env = envOf();
  await env.getAuth(false);
  s.login = null;
  const r = await sweep(env);
  assert.equal(r.state, 'loggedout');
  assert.equal(s.removed.length, 0);
});

await test('방금 지운 글이 목록에 남아 있어도 다시 지우려 들지 않는다', async (s) => {
  s.lag = true;
  const ids = [s.add(100), s.add(101), s.add(102)];
  const a = await sweep(envOf());
  assert.equal(a.deleted, 3);
  const b = await sweep(envOf(), { skip: a.deletedIds });
  assert.equal(b.found, 0);
  assert.equal(b.failed, 0);
  assert.equal(s.removeCalls.length, 1);
  assert.deepEqual(a.deletedIds.slice().sort(), ids.slice().sort());
});

await test('시간이 모자라면 멈추고 다음 차례로 넘긴다', async (s) => {
  for (let i = 0; i < 120; i++) s.add(100 + i);
  const r = await sweep(envOf(), { budgetMs: 500 });
  assert.equal(r.more, true);
  assert.ok(r.deleted > 0 && r.deleted < 120, '지운 수: ' + r.deleted);
  const r2 = await sweep(envOf());
  assert.equal(r2.more, false);
  assert.equal(left(s).length, 0);
});

console.log(`\n${passed}개 모두 통과`);
