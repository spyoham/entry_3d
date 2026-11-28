const $ = (id) => document.getElementById(id);
const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function lastText(s) {
  if (!s) return '아직 없음';
  const head = hhmm(s.at) + ' · ';
  if (s.state === 'loggedout') return head + '엔트리에 로그인되어 있지 않음';
  if (s.state !== 'ok') return head + '오류: ' + (s.error || '알 수 없음');
  let t = head + (s.nickname ? s.nickname + ' · ' : '') + `${s.deleted}개 삭제`;
  if (s.failed) t += `, ${s.failed}개 실패` + (s.error ? `\n(${s.error})` : '');
  else if (s.error) t += `\n(${s.error})`;
  if (s.more) t += '\n남은 글은 다음 차례에 이어서 지웁니다';
  return t;
}

async function render() {
  const { enabled, status, total } = await chrome.storage.local.get(['enabled', 'status', 'total']);
  $('on').checked = !!enabled;
  $('last').textContent = lastText(status);
  $('total').textContent = `${total || 0}개 삭제`;
  if (enabled) $('now').textContent = '켜짐 — 1분마다 확인합니다';
  return !!enabled;
}

// 꺼져 있을 때: 켜면 바로 지워질 글이 몇 개인지 미리 센다 (지우지 않음).
let previewNo = 0;
async function preview() {
  const no = ++previewNo;
  $('now').textContent = '꺼짐 — 지워질 글을 세는 중…';
  const r = await chrome.runtime.sendMessage({ type: 'storyhour-preview' }).catch(() => null);
  if (no !== previewNo || $('on').checked) return;
  if (!r || r.state === 'error') $('now').textContent = '꺼짐 — 세지 못함: ' + ((r && r.error) || '응답 없음');
  else if (r.state === 'loggedout') $('now').textContent = '꺼짐 — 엔트리에 로그인되어 있지 않습니다';
  else
    $('now').textContent =
      `꺼짐 — 지금 켜면 ${r.nickname || '내'} 계정의 1시간 넘은 글 ${r.found}${r.more ? '개 이상' : '개'}이 바로 지워집니다`;
}

async function runNow() {
  $('go').disabled = true;
  $('now').textContent = '확인하는 중…';
  await chrome.runtime.sendMessage({ type: 'storyhour-run' }).catch(() => null);
  $('go').disabled = false;
  await render();
}

$('on').onchange = async () => {
  const enabled = $('on').checked;
  await chrome.storage.local.set({ enabled });
  if (enabled) {
    previewNo++;
    await runNow();
  } else {
    await render();
    preview();
  }
};

$('go').onclick = async () => {
  if ($('on').checked) await runNow();
  else preview();
};

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && (ch.status || ch.total)) render();
});

render().then((enabled) => {
  if (!enabled) preview();
});
