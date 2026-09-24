// entry-cleaner.js 를 북마클릿으로 바꿔 install.html 을 만든다.  node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const src = readFileSync(new URL('entry-cleaner.js', dir), 'utf8');
const code = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.trim())
    .join('\n');
const href = 'javascript:' + encodeURIComponent(code);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>엔트리 일괄 삭제기</title>
<style>
body{font:16px/1.7 sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#222}
a.bm{display:inline-block;padding:10px 18px;background:#4f80ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold}
textarea{width:100%;height:160px;font:12px monospace}
code{background:#f1f1f1;padding:1px 4px;border-radius:3px}
</style></head><body>
<h1>엔트리 변수·함수 일괄 삭제기</h1>
<h2>방법 1 · 즐겨찾기(북마클릿)</h2>
<ol>
<li>즐겨찾기 막대를 켭니다 (<code>Ctrl+Shift+B</code>).</li>
<li>아래 파란 버튼을 즐겨찾기 막대로 <b>끌어다 놓습니다</b>.</li>
<li>엔트리에서 작품 만들기/수정 화면을 연 뒤 그 즐겨찾기를 누릅니다.</li>
<li>오른쪽 위 창에서 지울 종류를 고르고 <b>선택한 것 모두 삭제</b> → 저장.</li>
</ol>
<p><a class="bm" href="${esc(href)}">엔트리 일괄 삭제</a></p>
<h2>방법 2 · 콘솔에 붙여넣기</h2>
<p>엔트리 만들기 화면에서 <code>F12</code> → Console 탭에 아래 코드를 붙여넣고 Enter.
(처음이면 크롬이 <code>allow pasting</code> 을 먼저 입력하라고 할 수 있습니다.)</p>
<textarea readonly onclick="this.select()">${esc(src)}</textarea>
<h2>주의</h2>
<ul>
<li>되돌리기가 안 됩니다. 먼저 작품을 복사(사본 저장)해 두세요.</li>
<li>함수를 지우면 작품 곳곳에 놓인 그 함수 블록도 함께 지워집니다 (엔트리 삭제 버튼과 같음).</li>
<li>변수·리스트를 지우면 그것을 쓰던 블록은 남지만 빈 칸이 됩니다.</li>
<li>지운 뒤 <b>저장</b>해야 반영됩니다.</li>
</ul>
</body></html>
`;
writeFileSync(new URL('install.html', dir), html);
console.log('install.html written, bookmarklet', href.length, 'chars');
