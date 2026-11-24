// What the stage shows and the one loop that asks, compresses and restores.

let inp = '', n = 0, encBits = 0, decN = 0, clipped = '', runs = 0;
let tOrig = ' ', tCode = ' ', tRest = ' ', tBits = ' ', tMsg = ' ';

const NL = '\n';
const PROMPT = '영어 문장을 입력하세요';
const RULE = '쓸 수 있는 글자: 영문 대문자·소문자, 띄어쓰기, 쉼표(,) 마침표(.) 물음표(?) 느낌표(!)';
const RULE2 = '압축된 비트(0과 1)를 그대로 넣거나 # 뒤에 짧은 코드를 넣으면 문장으로 풉니다.';
const HELLO = '영어 문장을 배운 AI가 다음에 올 글자를 맞힙니다. 잘 맞힌 글자일수록 적은 비트로 적습니다.';
const BITHEAD = '④ 낱말마다 든 비트   적을수록 AI가 잘 맞힌 낱말 (그냥 적으면 글자마다 8비트)';

// clipped <- s, cut to m letters
function clip(s, m) {
  let L = strlen(s);
  clipped = s;
  if (L > m) { clipped = str(substr(s, 1, m), ' …'); }
}

// clipped <- the first nb bits of s as 0s and 1s, eight to a group and BINROW groups to a row,
// BINMAX bits at most
function binRows(s, nb) {
  let a = 1, b = 0, g = 0, m = nb, more = 0;
  if (m > BINMAX) { m = BINMAX; more = 1; }
  clipped = '';
  while (a <= m) {
    b = a + 7;
    if (b > m) { b = m; }
    if (g > 0) {
      if (mod(g, BINROW) == 0) { clipped = str(clipped, NL); } else { clipped = str(clipped, ' '); }
    }
    clipped = str(clipped, substr(s, a, b));
    a = b + 1;
    g = g + 1;
  }
  if (more == 1) { clipped = str(clipped, ' …'); }
}

on('start', 'main', function () {
  let i = 0, k = 0, bad = 0, step = 0, mode = 0, go = 0, same = 0, pct = 0, bpc = 0, digits = 0, others = 0;
  let tail = '';
  hideAnswer();
  tMsg = str(HELLO, NL, RULE, NL, RULE2);
  for (;;) {
    ask(PROMPT);
    inp = answer();
    n = strlen(inp);
    go = 0; bad = 0;
    // what was typed: 0s and 1s (and spaces) are bits, # begins a short code, anything else is a sentence
    digits = 0; others = 0; i = 1;
    while (i <= n) {
      k = indexOf('0 1', charAt(inp, i));
      if (k == 0) { others = others + 1; } else {
        if (k != 2) { digits = digits + 1; }
      }
      i = i + 1;
    }
    mode = 1;
    if (others == 0 && digits > 0) { mode = 3; }
    if (indexOf(inp, '#') == 1) { mode = 2; }

    if (mode == 1) {
      i = 1;
      while (i <= n) {
        if (indexOf(SYMS, charAt(inp, i)) == 0) { bad = i; i = n; }
        i = i + 1;
      }
      if (bad > 0) {
        tMsg = str('쓸 수 없는 글자가 있습니다: ', bad, '번째 글자  ', charAt(inp, bad), NL, RULE, NL, RULE2);
      } else {
        if (n > MAXN) { tMsg = str('문장이 너무 깁니다. ', MAXN, '글자까지 됩니다. (지금 ', n, '글자)'); } else { go = 1; }
      }
    }
    if (mode == 2) {
      i = 2;
      while (i <= n) {
        if (indexOf(B64, charAt(inp, i)) == 0) { bad = i; i = n; }
        i = i + 1;
      }
      if (bad > 0) {
        tMsg = str('코드에 쓸 수 없는 글자가 있습니다: ', bad, '번째 글자  ', charAt(inp, bad), NL, '짧은 코드는 영문자, 숫자, + - 로만 되어 있습니다.');
      } else {
        if (n < 2) { tMsg = '# 뒤에 코드를 붙여 주세요.'; } else { go = 1; }
      }
    }
    if (mode == 3) { go = 1; }

    if (go == 1) {
      tMsg = str(HELLO, NL, RULE, NL, RULE2);
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
          binRows(bin, nbits);
          tCode = str('② 압축 중…   ', i - 1, ' / ', n, '글자   ', nbits, '비트', NL, clipped);
        }
        encEnd();
        pct = Math.round(encBits * 1000 / (n * 8)) / 10;
        bpc = Math.round(encBits * 100 / n) / 100;
        binRows(encBin, encBits);
        tail = ' ';
        if (strlen(out) <= CODEMAX) { tail = str('   ·   짧은 코드 #', out); }
        tCode = str('② 압축   ', encBits, '비트   (원본의 ', pct, '%, 한 글자에 ', bpc, '비트)', tail, NL, clipped);
        src = out;
      } else {
        tOrig = '① 원본   (압축된 것만 입력했습니다)';
        if (mode == 2) {
          src = substr(inp, 2, n);
          codeToBits();
        } else {
          bitsToCode(inp);
        }
        binRows(encBin, encBits);
        tCode = str('② 압축된 비트   ', encBits, '비트', NL, clipped);
      }

      // ---- restore, from the code alone ----
      tRest = '③ 복원 중…';
      decBegin();
      if (decN > MAXN) {
        tRest = '③ 복원   풀 수 없습니다. (압축된 비트가 아닙니다)';
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
          clip(dec, CLIP1);
          tRest = str('③ 복원 중…   ', i - 1, ' / ', decN, '글자', NL, clipped);
        }
        clip(dec, CLIP1);
        if (mode == 1) {
          same = 0;
          if (strlen(dec) == n) {
            if (indexOf(str('<', dec, '>'), str('<', inp, '>')) == 1) { same = 1; }
          }
          if (same == 1) {
            tRest = str('③ 복원   0과 1만 보고 되살린 문장 · 원본과 한 글자도 다르지 않습니다', NL, clipped);
          } else {
            tRest = str('③ 복원   원본과 다릅니다! (오류)', NL, clipped);
          }
        } else {
          tRest = str('③ 복원   0과 1을 푼 문장 · ', decN, '글자 × 8비트 = ', decN * 8, '비트', NL, clipped);
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
