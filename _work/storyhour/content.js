// 엔트리 탭 안에서 도는 부분. 배경이 시키면 이 탭의 로그인 정보로 한 번 돈다
// (사이트가 스스로 보내는 요청과 같은 자리에서 보내므로 가장 확실하다).
(() => {
  const { sweep, fetchAuth, userFromNextData } = globalThis.StoryHour;

  const env = {
    async getAuth(fresh) {
      if (fresh) return fetchAuth();
      const meta = document.querySelector('meta[name="csrf-token"]');
      const data = document.getElementById('__NEXT_DATA__');
      return { csrf: (meta && meta.getAttribute('content')) || '', user: userFromNextData(data && data.textContent) };
    },
  };

  chrome.runtime.onMessage.addListener((m, sender, reply) => {
    if (!m) return;
    if (m.type === 'storyhour-ping') {
      reply({ visible: document.visibilityState === 'visible' });
    } else if (m.type === 'storyhour-sweep') {
      sweep(env, m.opts || {}).then(reply, (e) => reply({ state: 'error', error: e.message }));
      return true; // 답은 나중에
    }
  });
})();
