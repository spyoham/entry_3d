// What the stage shows and the one loop that asks, compresses and restores.

let inp = '', n = 0, encBits = 0, decN = 0, clipped = '', runs = 0;
let tOrig = ' ', tCode = ' ', tRest = ' ', tBits = ' ', tMsg = ' ';

const NL = '\n';
const PROMPT = '영어 문장을 입력하세요';
const RULE = '쓸 수 있는 글자: 영문 대문자·소문자, 띄어쓰기, 쉼표(,) 마침표(.) 물음표(?) 느낌표(!)   ·   코드를 풀려면 # 뒤에 코드';
const HELLO = '영어 문장을 배운 AI가 다음에 올 글자를 맞힙니다. 잘 맞힌 글자일수록 적은 비트로 적습니다.';
const BITHEAD = '④ 낱말마다 든 비트   적을수록 AI가 잘 맞힌 낱말 (그냥 적으면 글자마다 8비트)';

// clipped <- s, cut to m letters
function clip(s, m) {
  let L = strlen(s);
  clipped = s;
  if (L > m) { clipped = str(substr(s, 1, m), ' …'); }
}

// clipped <- a code in rows of CW letters, two rows at most (a code has no spaces to wrap at)
function clipCode(s) {
  let L = strlen(s);
  clipped = s;
  if (L > CW) {
    if (L > CW * 2) { clipped = str(substr(s, 1, CW), NL, substr(s, CW + 1, CW * 2 - 2), ' …'); } else { clipped = str(substr(s, 1, CW), NL, substr(s, CW + 1, L)); }
  }
}

on('start', 'main', function () {
  let i = 0, k = 0, bad = 0, step = 0, mode = 0, go = 0, same = 0, pct = 0, bpc = 0;
  hideAnswer();
  tMsg = str(HELLO, NL, RULE);
  for (;;) {
    ask(PROMPT);
    inp = answer();
    n = strlen(inp);
    go = 0; bad = 0;
    if (indexOf(inp, '#') == 1) { mode = 2; } else { mode = 1; }

    if (mode == 1) {
      i = 1;
      while (i <= n) {
        if (indexOf(SYMS, charAt(inp, i)) == 0) { bad = i; i = n; }
        i = i + 1;
      }
      if (bad > 0) {
        tMsg = str('쓸 수 없는 글자가 있습니다: ', bad, '번째 글자  ', charAt(inp, bad), NL, RULE);
      } else {
        if (n > MAXN) { tMsg = str('문장이 너무 깁니다. ', MAXN, '글자까지 됩니다. (지금 ', n, '글자)'); } else { go = 1; }
      }
    } else {
      i = 2;
      while (i <= n) {
        if (indexOf(B64, charAt(inp, i)) == 0) { bad = i; i = n; }
        i = i + 1;
      }
      if (bad > 0) {
        tMsg = str('코드에 쓸 수 없는 글자가 있습니다: ', bad, '번째 글자  ', charAt(inp, bad), NL, '코드는 영문자, 숫자, + - 로만 되어 있습니다.');
      } else {
        if (n < 2) { tMsg = '# 뒤에 코드를 붙여 주세요.'; } else { go = 1; }
      }
    }

    if (go == 1) {
      tMsg = str(HELLO, NL, RULE);
      tRest = ' '; tBits = ' ';
      if (mode == 1) {
        // ---- compress ----
        clip(inp, CLIPN);
        tOrig = str('① 원본   ', n, '글자 × 8비트 = ', n * 8, '비트', NL, clipped);
        tCode = '② 압축 중…';
        encBegin(n);
        step = idiv(n + 39, 40);
        if (step > 24) { step = 24; }
        i = 1;
        for (;;) {
          k = 0;
          while (k < step && i <= n) {
            encChar(indexOf(SYMS, charAt(inp, i)));
            i = i + 1; k = k + 1;
          }
          if (i > n) { break; }
          clipCode(out);
          tCode = str('② 압축 중…   ', i - 1, ' / ', n, '글자', NL, clipped);
        }
        encEnd();
        pct = Math.round(encBits * 1000 / (n * 8)) / 10;
        bpc = Math.round(encBits * 100 / n) / 100;
        clipCode(out);
        tCode = str('② 압축   ', encBits, '비트 = 코드 ', strlen(out), '글자   (원본의 ', pct, '%, 한 글자에 ', bpc, '비트)', NL, clipped);
        src = out;
      } else {
        src = substr(inp, 2, n);
        tOrig = '① 원본   (코드만 입력했습니다)';
        clipCode(src);
        tCode = str('② 압축 코드   ', strlen(src), '글자 = ', strlen(src) * 6, '비트', NL, clipped);
      }

      // ---- restore, from the code alone ----
      tRest = '③ 복원 중…';
      decBegin();
      if (decN > MAXN) {
        tRest = '③ 복원   이 코드는 풀 수 없습니다. (잘못된 코드)';
      } else {
        step = idiv(decN + 39, 40);
        if (step > 24) { step = 24; }
        i = 1;
        for (;;) {
          k = 0;
          while (k < step && i <= decN) {
            decChar();
            i = i + 1; k = k + 1;
          }
          if (i > decN) { break; }
          clip(dec, CLIPN);
          tRest = str('③ 복원 중…   ', i - 1, ' / ', decN, '글자', NL, clipped);
        }
        clip(dec, CLIPN);
        if (mode == 1) {
          same = 0;
          if (strlen(dec) == n) {
            if (indexOf(str('<', dec, '>'), str('<', inp, '>')) == 1) { same = 1; }
          }
          if (same == 1) {
            tRest = str('③ 복원   코드만 보고 되살린 문장 · 원본과 한 글자도 다르지 않습니다', NL, clipped);
          } else {
            tRest = str('③ 복원   원본과 다릅니다! (오류)', NL, clipped);
          }
        } else {
          tRest = str('③ 복원   코드를 푼 문장 · ', decN, '글자 × 8비트 = ', decN * 8, '비트', NL, clipped);
        }
        flushWord();
        if (wlMore == 1) { wl = str(wl, '…'); }
        tBits = str(BITHEAD, NL, wl);
      }
      runs = runs + 1;
    }
  }
});

on('start', 'orig', function () {
  let shown = '';
  for (;;) { if (tOrig != shown) { shown = tOrig; write(shown); } }
});
on('start', 'code', function () {
  let shown = '';
  for (;;) { if (tCode != shown) { shown = tCode; write(shown); } }
});
on('start', 'rest', function () {
  let shown = '';
  for (;;) { if (tRest != shown) { shown = tRest; write(shown); } }
});
on('start', 'bits', function () {
  let shown = '';
  for (;;) { if (tBits != shown) { shown = tBits; write(shown); } }
});
on('start', 'msg', function () {
  let shown = '';
  for (;;) { if (tMsg != shown) { shown = tMsg; write(shown); } }
});
