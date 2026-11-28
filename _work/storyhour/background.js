// 배경: 1분마다 깨어나 한 번 돈다.
// 보이는 엔트리 탭이 있으면 그 탭에 시키고, 없으면 여기서 직접 한다 (엔트리 탭을 닫아 두어도 된다).
importScripts('core.js');
const { SITE, sweep, fetchAuth } = globalThis.StoryHour;

const ALARM = 'storyhour';
const AUTH_TTL = 5 * 60 * 1000; // 직접 할 때 로그인 정보를 다시 받는 간격
const RECENT_TTL = 15 * 60 * 1000; // 지운 글이 목록(검색 색인)에 잠깐 더 남을 수 있어, 그동안은 다시 지우려 들지 않는다
const LOCK_MS = 4 * 60 * 1000;

function ensureAlarm() {
  chrome.alarms.get(ALARM, (a) => {
    if (!a) chrome.alarms.create(ALARM, { periodInMinutes: 1 });
  });
}

async function showBadge() {
  const { enabled } = await chrome.storage.local.get('enabled');
  chrome.action.setBadgeBackgroundColor({ color: '#e5484d' });
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
}

chrome.runtime.onInstalled.addListener((d) => {
  ensureAlarm();
  showBadge();
  // 처음 깔면 꺼진 채로 설명 화면을 연다. 켜야 지우기 시작한다.
  if (d.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});
chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  showBadge();
});
ensureAlarm();

const bgEnv = {
  async getAuth(fresh) {
    const { auth } = await chrome.storage.session.get('auth');
    if (!fresh && auth && Date.now() - auth.at < AUTH_TTL) return auth;
    const a = await fetchAuth();
    await chrome.storage.session.set({ auth: { ...a, at: Date.now() } });
    return a;
  },
};

function ask(tabId, msg, ms) {
  return Promise.race([
    chrome.tabs.sendMessage(tabId, msg).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), ms)),
  ]);
}

// 한 번 돈다: 보이는 엔트리 탭 → 여기서 직접 → (그래도 안 되면) 가려진 엔트리 탭.
async function run(opts) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: SITE + '/*', discarded: false });
  } catch (e) {}
  const alive = (
    await Promise.all(
      tabs.slice(0, 8).map(async (t) => {
        const p = await ask(t.id, { type: 'storyhour-ping' }, 1000);
        return p ? { id: t.id, visible: !!p.visible } : null;
      })
    )
  ).filter(Boolean);
  const viaTab = async (t) => {
    const r = await ask(t.id, { type: 'storyhour-sweep', opts }, 100000);
    return r && r.state === 'ok' ? { ...r, via: 'tab' } : null;
  };

  const visible = alive.find((t) => t.visible);
  if (visible) {
    const r = await viaTab(visible);
    if (r) return r;
  }
  let direct;
  try {
    direct = { ...(await sweep(bgEnv, opts)), via: 'bg' };
  } catch (e) {
    direct = { state: 'error', error: e.message, via: 'bg' };
  }
  const worked = direct.state === 'ok' && !(direct.failed && !direct.deleted);
  const hidden = alive.find((t) => t !== visible);
  if (!worked && hidden) {
    const r = await viaTab(hidden);
    if (r) return r;
  }
  return direct;
}

async function tick(force) {
  const { enabled } = await chrome.storage.local.get('enabled');
  if (!enabled) return null;
  const { runningSince } = await chrome.storage.session.get('runningSince');
  if (runningSince && Date.now() - runningSince < LOCK_MS) return null; // 앞 차례가 아직 도는 중
  await chrome.storage.session.set({ runningSince: Date.now() });
  try {
    const st = await chrome.storage.local.get(['recent', 'total']);
    const recent = {};
    for (const [id, at] of Object.entries(st.recent || {})) if (Date.now() - at < RECENT_TTL) recent[id] = at;
    if (force) await chrome.storage.session.remove('auth');
    const r = await run({ skip: Object.keys(recent) });
    for (const id of r.deletedIds || []) recent[id] = Date.now();
    const status = {
      at: Date.now(),
      state: r.state,
      nickname: r.nickname || '',
      deleted: r.deleted || 0,
      failed: r.failed || 0,
      error: r.error || '',
      more: !!r.more,
      via: r.via,
    };
    await chrome.storage.local.set({ recent, total: (st.total || 0) + status.deleted, status });
    return status;
  } finally {
    await chrome.storage.session.remove('runningSince');
  }
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) tick(false).catch((e) => console.warn('[엔트리 이야기 1시간 뒤 삭제]', e));
});

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && ch.enabled) showBadge();
});

// 팝업에서: 지금 한 번 돌기 / 지워질 글 수만 세기
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!m) return;
  if (m.type === 'storyhour-run') {
    tick(true).then(reply, (e) => reply({ state: 'error', error: e.message }));
    return true;
  }
  if (m.type === 'storyhour-preview') {
    chrome.storage.session
      .remove('auth')
      .then(() => run({ dryRun: true }))
      .then(reply, (e) => reply({ state: 'error', error: e.message }));
    return true;
  }
});
