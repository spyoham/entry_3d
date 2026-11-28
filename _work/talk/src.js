// ===================================================================== 둘만의 토론방
// A board two nicknames write on and everybody reads, kept by Entry Sync alone (?! lists).
//   대주제 > 소주제 > 글 > 댓글 > 대댓글 ... : one tree. A row is 'parent^time^text'; a row's id is the letter of
//   its list and its place in it ('a3', 'b12'), so a row is never taken out: a deleted one is 'parent^time^'.
//   ?!a is written by NICK1's page alone and ?!b by NICK2's alone - Entry Sync sends a list whole, and two pages
//   writing one list undo each other's rows.
const NICK1 = '코딩재미있어', NICK2 = 'IKAE';
// the screen: NROW lines of COLS columns (a 12 px fixed-width font: 6 px a column), the buttons under them
const NROW = 13, COLS = 72, ROWTOP = 110, ROWH = 15, BTNY = -100, MAXLEN = 400;
const ASCII = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const SPACES = '            ';
let SY_ = 0;
let SY_a = [], SY_b = [];
// ?!v: changed with every write (a deleted row leaves the lengths as they were); ?!made: 1 once anything was ever
// written - a page that has it knows the room's rows have come; ?!hb: the room kept awake (see hbStep)
let SY_v = 0, SY_made = 0, SY_hb = 0;

let me = 0, setupDone = 0;
// the nodes: 1..LA are ?!a's rows, LA+1..N ?!b's, ROOT = N+1
let LA = 0, LB = 0, N = 0, ROOT = 1;
let nPar = [], nTime = [], nText = [], nDel = [], nVis = [], nCnt = [], nFirst = [], nLast = [], nNext = [], ord = [];
let pPar = '0', pTime = 0, pText = ' ', pOk = 0, gRest = '';
// where the reader is: the container shown (an id) and the post picked in a thread
let curId = '0', selId = '', jumpId = '', cur = 1, sel = 0, depth = 0, top = 1;
// the whole view, a line each, and the NROW lines of it on the screen
let vT = [], vC = [], vN = [];
let scrT = [], scrC = [], scrN = [], btnT = [];
let drawV = 0, rowBorn = 0, btnBorn = 0;
let row$i = 0, row$v = 0, btn$i = 0, btn$v = 0;
let gInd = '', gLine = '', gW = 0, gMark = '', gName = '', gId = '', gS = '', gHead = '', headShown = '';
let dirty = 1, lastSig = '', lastBuild = 0, now = 0, t0 = 0, connT = 0 - 1, ready = 0;
let clickN = 0, clickSeen = 0, clickX = 0, clickY = 0, keyCmd = 0;
let want = 0, askPid = '0', askMsg = '', delId = '', gAns = '', busy = 0;
let flash = '', flashT = 0, statS = ' ', statShown = '';
let hbId = 0, hbN = 0, hbSeen = 0 - 1, hbWall = 0 - 1, hbPrev = 0 - 1, hbGap = 0, hbGapV = 0, stale = 0;

function wallNow() { return dateHour() * 3600 + dateMin() * 60 + dateSec(); }
function wallDiff(a, b) { return mod(a - b + 86400, 86400); }
function stampNow() { return ((((((dateYear() - 2000) * 100 + dateMonth()) * 100 + dateDay()) * 100 + dateHour()) * 100 + dateMin()) * 100) + dateSec(); }
function fmt(t) {
  gS = `${t}`;
  if (strlen(gS) == 12) { gS = `${substr(gS, 3, 4)}/${substr(gS, 5, 6)} ${substr(gS, 7, 8)}:${substr(gS, 9, 10)}`; } else { gS = '-'; }
  return gS;
}
// 1 or 2: who may write (the whole nickname, capitals as they are); 0: a reader
function who() {
  let r = 0;
  gS = nickname();
  if (strlen(gS) == strlen(NICK1)) { if (indexOf(gS, NICK1) == 1) { r = 1; } }
  if (strlen(gS) == strlen(NICK2)) { if (indexOf(gS, NICK2) == 1) { r = 2; } }
  return r;
}

// ---------------------------------------------------------------- the room kept awake
// The room server keeps nothing of what is written after ten silent seconds, until somebody new connects: every page
// writes ?!hb every two seconds unless another did. A page that itself stood still for nine seconds (a hidden tab)
// looks three times first: if nobody wrote meanwhile, what it writes next may not be kept - `stale`, and a writer
// is told to reload.
function hbStep() {
  let w = wallNow(), v = 0;
  if (SY_ == 1) {
    if (hbPrev >= 0) { if (wallDiff(w, hbPrev) >= 9) { hbGap = 1; hbGapV = SY_hb * 1; hbWall = w; stale = 1; } }
    hbPrev = w;
    if (hbWall < 0 || wallDiff(w, hbWall) >= 2) {
      hbWall = w;
      v = SY_hb * 1;
      if (hbGap > 0) {
        if (v != hbGapV) { hbGap = 0; stale = 0; }
        else { hbGap = hbGap + 1; if (hbGap > 3) { hbGap = 0; hbSeen = v; } }
      }
      if (hbGap == 0) {
        if (v == hbSeen) {
          if (hbId == 0) { hbId = rand(1000, 9999); }
          hbN = mod(hbN + 1, 1000);
          v = hbId * 1000 + hbN;
          SY_hb = v;
        }
        hbSeen = v;
      }
    }
  } else { hbWall = 0 - 1; hbSeen = 0 - 1; hbPrev = 0 - 1; hbGap = 0; }
}

// ---------------------------------------------------------------- the rows read
function parse(s) {
  let a = indexOf(s, '^'), n = strlen(s), b = 0, m = 0;
  pOk = 0; pPar = '0'; pTime = 0; pText = ' ';
  if (a > 1 && a < n) {
    pPar = substr(s, 1, a - 1);
    gRest = substr(s, a + 1, n);
    b = indexOf(gRest, '^'); m = strlen(gRest);
    if (b > 1) {
      pTime = substr(gRest, 1, b - 1) * 1;
      if (pTime > 0) { } else { pTime = 0; }
      pOk = 2;
      if (b < m) { pText = substr(gRest, b + 1, m); pOk = 1; }
    }
  }
}
function idx(id) {
  let r = 0 - 1, n = strlen(id), k = 0;
  if (n >= 2) {
    k = substr(id, 2, n) * 1;
    if (k >= 1 && k == Math.floor(k)) {
      if (indexOf(id, 'a') == 1) { if (k <= LA) { r = k; } }
      if (indexOf(id, 'b') == 1) { if (k <= LB) { r = LA + k; } }
    }
  } else { if (n == 1) { if (indexOf(id, '0') == 1) { r = ROOT; } } }
  return r;
}
function idOf(n) {
  if (n == ROOT) { gId = '0'; } else { if (n <= LA) { gId = `a${n}`; } else { gId = `b${n - LA}`; } }
  return gId;
}
function build() {
  let i = 1, j = 1, k = 0, p = 0, v = 0;
  LA = SY_a.length; LB = SY_b.length; N = LA + LB; ROOT = N + 1;
  nPar = []; nTime = []; nText = []; nDel = []; nVis = []; nCnt = []; nFirst = []; nLast = []; nNext = []; ord = [];
  while (i <= N) {
    if (i <= LA) { parse(SY_a[i]); } else { parse(SY_b[i - LA]); }
    p = idx(pPar);
    if (p == i) { p = 0 - 1; }
    // nDel: 0 a row, 1 a deleted one, 2 one that cannot be read
    v = 0;
    if (pOk == 2) { v = 1; }
    if (pOk == 0 || p < 1) { v = 2; p = ROOT; }
    nPar.push(p); nTime.push(pTime); nText.push(pText); nDel.push(v);
    nVis.push(0); nCnt.push(0); nFirst.push(0); nLast.push(0); nNext.push(0);
    i++;
  }
  nPar.push(0); nTime.push(0); nText.push(' '); nDel.push(0); nVis.push(1); nCnt.push(0); nFirst.push(0); nLast.push(0); nNext.push(0);
  // both lists are in the order they were written: one walk puts all rows in the order of their times
  i = 1; j = 1;
  while (i <= LA || j <= LB) {
    if (i > LA) { ord.push(LA + j); j++; }
    else {
      if (j > LB) { ord.push(i); i++; }
      else { if (nTime[i] <= nTime[LA + j]) { ord.push(i); i++; } else { ord.push(LA + j); j++; } }
    }
  }
  // the latest first: a deleted row is shown only while something under it is
  k = N;
  while (k >= 1) {
    i = ord[k];
    v = 0;
    if (nDel[i] == 0) { v = 1; }
    if (nDel[i] == 1) { if (nCnt[i] > 0) { v = 1; } }
    nVis[i] = v;
    if (v == 1) { p = nPar[i]; nCnt[p] = nCnt[p] + 1; }
    k--;
  }
  k = 1;
  while (k <= N) {
    i = ord[k];
    if (nVis[i] == 1) {
      p = nPar[i];
      if (nFirst[p] == 0) { nFirst[p] = i; } else { nNext[nLast[p]] = i; }
      nLast[p] = i;
    }
    k++;
  }
  // where the reader is, in the rows as they are now
  cur = idx(curId);
  if (cur < 1) { cur = ROOT; }
  depth = 0; i = cur;
  while (i != ROOT && depth < 4) { i = nPar[i]; depth++; }
  if (depth > 2) { cur = ROOT; depth = 0; }
  if (cur != ROOT) { if (nVis[cur] == 0) { cur = ROOT; depth = 0; } }
  if (cur == ROOT) { curId = '0'; }
  sel = 0;
  if (depth == 2) { if (strlen(selId) > 0) { sel = idx(selId); if (sel < 1) { sel = 0; } } }
  if (sel > 0) { if (nVis[sel] == 0) { sel = 0; } }
  if (sel == 0) { selId = ''; }
}

// ---------------------------------------------------------------- the view
// (a letter of the keyboard is one column wide, any other two)
function line(c, col) { vT.push(`${gInd}${gLine}`); vC.push(col); vN.push(c); }
function wrap(s, w, c, col) {
  let n = strlen(s), i = 1, cw = 0, ch = ' ';
  gLine = ''; gW = 0;
  while (i <= n) {
    ch = charAt(s, i);
    cw = 2;
    if (indexOf(ASCII, ch) > 0) { cw = 1; }
    if (gW + cw > w) { line(c, col); gLine = ''; gW = 0; }
    gLine = `${gLine}${ch}`; gW = gW + cw;
    i++;
  }
  if (gW > 0) { line(c, col); }
}
function clip(s, w) {
  let n = strlen(s), i = 1, cw = 0, ch = ' ', full = 0;
  gLine = ''; gW = 0;
  while (i <= n && full == 0) {
    ch = charAt(s, i);
    cw = 2;
    if (indexOf(ASCII, ch) > 0) { cw = 1; }
    if (gW + cw > w - 2) { full = 1; gLine = `${gLine}…`; }
    else { gLine = `${gLine}${ch}`; gW = gW + cw; }
    i++;
  }
  return gLine;
}
function nameOf(c) {
  gName = NICK1;
  if (c > LA) { gName = NICK2; }
  return gName;
}
function emit(c, d) {
  let dd = d, col = 0;
  if (dd > 5) { dd = 5; }
  if (d == 0 && vT.length > 0) { vT.push(' '); vC.push(0); vN.push(0); }
  gInd = '';
  if (dd > 0) { gInd = substr(SPACES, 1, dd * 2); }
  col = 1;
  if (c > LA) { col = 2; }
  gMark = '';
  if (d > 0) { gMark = '└ '; }
  if (c == sel) { col = 3; gMark = '▶ '; }
  gLine = `${gMark}${nameOf(c)} · ${fmt(nTime[c])}`;
  line(c, col);
  if (c != sel) { col = 0; }
  gInd = `${gInd}  `;
  if (nDel[c] == 1) { gLine = '(지운 글)'; line(c, 4); }
  else { wrap(nText[c], COLS - dd * 2 - 2, c, col); }
}
function render() {
  let c = 0, d = 0, k = 0, p = 0;
  vT = []; vC = []; vN = [];
  if (depth < 2) {
    c = nFirst[cur];
    while (c > 0) {
      gInd = '';
      if (nDel[c] == 1) { gLine = '▸ (지운 주제)'; } else { gLine = `▸ ${clip(nText[c], COLS - 2)}`; }
      line(c, 0);
      if (depth == 0) { gLine = `    소주제 ${nCnt[c]}개 · ${nameOf(c)} · ${fmt(nTime[c])}`; }
      else { gLine = `    글 ${nCnt[c]}개 · ${nameOf(c)} · ${fmt(nTime[c])}`; }
      if (c > LA) { line(c, 2); } else { line(c, 1); }
      c = nNext[c];
    }
    if (vT.length == 0) {
      gInd = '';
      if (depth == 0) { gLine = '아직 대주제가 없습니다'; } else { gLine = '아직 소주제가 없습니다'; }
      line(0, 4);
    }
  } else {
    c = nFirst[cur]; d = 0;
    while (c > 0) {
      emit(c, d);
      if (nFirst[c] > 0) { c = nFirst[c]; d++; }
      else {
        k = 0;
        while (c != cur && k == 0) { if (nNext[c] == 0) { c = nPar[c]; d--; } else { k = 1; } }
        if (c == cur) { c = 0; } else { c = nNext[c]; }
      }
    }
    if (vT.length == 0) { gInd = ''; gLine = '아직 글이 없습니다'; line(0, 4); }
  }
  // the path
  gHead = '토론방';
  if (depth == 1) { gHead = `토론방 › ${clip(nText[cur], COLS - 10)}`; }
  if (depth == 2) { p = nPar[cur]; gHead = `토론방 › ${clip(nText[p], 26)}`; gHead = `${gHead} › ${clip(nText[cur], 34)}`; }
  // the post just written is brought into sight
  if (strlen(jumpId) > 0) {
    c = idx(jumpId); jumpId = ''; k = 1;
    while (k <= vN.length) { if (vN[k] == c) { top = k - 2; k = vN.length; } k++; }
  }
  // the buttons: back, (up, down: see page), write, delete
  btnT[1] = ' '; btnT[4] = ' '; btnT[5] = ' ';
  if (depth > 0) { btnT[1] = '← 뒤로'; }
  if (me > 0) {
    if (depth == 0) { btnT[4] = '+ 대주제'; }
    if (depth == 1) { btnT[4] = '+ 소주제'; }
    if (depth == 2) { if (sel > 0) { btnT[4] = '↳ 답글 쓰기'; } else { btnT[4] = '+ 글쓰기'; } }
    c = delTarget();
    if (c > 0) { if (c == cur) { btnT[5] = '× 주제 지우기'; } else { btnT[5] = '× 지우기'; } }
  }
  page();
}
// what the delete button would delete: the post picked, or the empty topic the reader is in - the writer's own
function delTarget() {
  let c = 0, r = 0;
  if (depth > 0) { c = cur; }
  if (sel > 0) { c = sel; }
  if (c > 0) {
    if (nCnt[c] == 0 && nDel[c] == 0) {
      if (me == 1 && c <= LA) { r = c; }
      if (me == 2 && c > LA) { r = c; }
    }
  }
  return r;
}
function page() {
  let n = vT.length, i = 1, mx = 0;
  mx = n - NROW + 1;
  if (mx < 1) { mx = 1; }
  if (top > mx) { top = mx; }
  if (top < 1) { top = 1; }
  while (i <= NROW) {
    if (top + i - 1 <= n) { scrT[i] = vT[top + i - 1]; scrC[i] = vC[top + i - 1]; scrN[i] = vN[top + i - 1]; }
    else { scrT[i] = ' '; scrC[i] = 0; scrN[i] = 0; }
    i++;
  }
  btnT[2] = ' '; btnT[3] = ' ';
  if (top > 1) { btnT[2] = '▲ 위로'; }
  if (top < mx) { btnT[3] = '▼ 아래로'; }
  drawV = drawV + 1;
}

// ---------------------------------------------------------------- what the reader does
function say(s) { flash = s; flashT = now; }
function mayWrite() {
  let r = 0;
  if (me == 0) { say(`글은 ${NICK1}, ${NICK2} 님만 쓸 수 있습니다`); }
  else {
    if (SY_ != 1) { say('Entry Sync에 연결되어야 쓸 수 있습니다'); }
    else {
      if (ready == 0) { say('방의 기록을 받는 중입니다. 잠시 뒤에 다시 눌러 주세요'); }
      else { if (stale == 1) { say('오래 멈춰 있었습니다. 새로고침(F5)한 뒤에 써 주세요'); } else { r = 1; } }
    }
  }
  return r;
}
function onButton(k) {
  let c = 0;
  if (k == 1 && depth > 0) {
    c = nPar[cur]; curId = idOf(c); selId = ''; top = 1; dirty = 1;
  }
  if (k == 2) { top = top - (NROW - 2); page(); }
  if (k == 3) { top = top + (NROW - 2); page(); }
  if (k == 4 && want == 0) {
    if (mayWrite() == 1) {
      askPid = curId;
      askMsg = '새 대주제의 이름 (빈 칸이면 취소)';
      if (depth == 1) { askMsg = '새 소주제의 이름 (빈 칸이면 취소)'; }
      if (depth == 2) {
        askMsg = '새 글 (빈 칸이면 취소)';
        if (sel > 0) { askPid = selId; askMsg = `${nameOf(sel)} 님에게 답글 (빈 칸이면 취소)`; }
      }
      want = 1;
    }
  }
  if (k == 5 && want == 0) {
    c = delTarget();
    if (c > 0) { if (mayWrite() == 1) { delId = idOf(c); want = 2; } }
  }
}
function onClick() {
  let r = 0, c = 0;
  if (clickY < ROWTOP && clickY > ROWTOP - NROW * ROWH) {
    r = Math.floor((ROWTOP - clickY) / ROWH) + 1;
    if (r >= 1 && r <= NROW) {
      c = scrN[r];
      if (c > 0) {
        if (depth < 2) { curId = idOf(c); selId = ''; top = 1; dirty = 1; }
        else { if (c == sel) { selId = ''; } else { selId = idOf(c); } dirty = 1; }
      }
    }
  }
  if (clickY < BTNY + 11 && clickY > BTNY - 11) {
    r = Math.floor((clickX + 240) / 96) + 1;
    if (r >= 1 && r <= 5) { if (strlen(btnT[r]) > 1) { onButton(r); } }
  }
}
// the answer typed, as a row of the writer's own list
function post() {
  let n = strlen(gAns);
  if (n > 0 && me > 0) {
    if (n > MAXLEN) { gAns = substr(gAns, 1, MAXLEN); }
    gS = `${askPid}^${stampNow()}^${gAns}`;
    if (me == 1) { SY_a.push(gS); jumpId = `a${SY_a.length}`; } else { SY_b.push(gS); jumpId = `b${SY_b.length}`; }
    SY_v = rand(1, 999999);
    if (SY_made != 1) { SY_made = 1; }
    selId = ''; dirty = 1;
  }
}
function erase() {
  let k = 0, n = strlen(delId);
  if (n >= 2 && me > 0) {
    k = substr(delId, 2, n) * 1;
    if (me == 1 && indexOf(delId, 'a') == 1) { if (k >= 1 && k <= SY_a.length) { parse(SY_a[k]); if (pOk > 0) { SY_a[k] = `${pPar}^${pTime}^`; if (delId == curId) { curId = pPar; } } } }
    if (me == 2 && indexOf(delId, 'b') == 1) { if (k >= 1 && k <= SY_b.length) { parse(SY_b[k]); if (pOk > 0) { SY_b[k] = `${pPar}^${pTime}^`; if (delId == curId) { curId = pPar; } } } }
    SY_v = rand(1, 999999);
    selId = ''; dirty = 1;
    say('지웠습니다');
  }
}
function status() {
  if (SY_ == 1) {
    if (connT < 0) { connT = now; }
    ready = 0;
    if (SY_made == 1) { ready = 1; }
    if (wallDiff(now, connT) >= 8) { ready = 1; }
    if (me > 0) {
      statS = `● ${nickname()} 님 · 글을 쓸 수 있습니다`;
      if (ready == 0) { statS = '● 방의 기록을 받는 중...'; }
      if (stale == 1) { statS = '● 오래 멈춰 있었습니다 · 새로고침(F5)한 뒤에 글을 써 주세요'; }
    } else { statS = `● 읽기 전용 · 글은 ${NICK1}, ${NICK2} 님만 쓸 수 있습니다`; }
  } else {
    connT = 0 - 1; ready = 0;
    if (wallDiff(now, t0) < 6) { statS = '○ Entry Sync에 연결하는 중...'; }
    else { statS = '○ 연결 안 됨 · Entry Sync 확장을 켜고 다시 시작하면 대화가 보입니다'; }
  }
  if (strlen(flash) > 0) { if (wallDiff(now, flashT) < 4) { statS = flash; } else { flash = ''; } }
}
function step() {
  now = wallNow();
  gS = `${SY_a.length}/${SY_b.length}/${SY_v}`;
  if (gS != lastSig) { lastSig = gS; dirty = 1; }
  if (wallDiff(now, lastBuild) >= 5) { dirty = 1; }
  // (the rows first: what a click names is a place in the rows as they are now)
  if (dirty == 1) { dirty = 0; lastBuild = now; build(); render(); }
  if (clickN != clickSeen) { clickSeen = clickN; onClick(); }
  if (keyCmd > 0) { onButton(keyCmd); keyCmd = 0; }
  if (dirty == 1) { dirty = 0; lastBuild = now; build(); render(); }
  status();
}

on('start', 'head', function () {
  let i = 1;
  hideAnswer();
  me = who();
  t0 = wallNow(); lastBuild = t0;
  scrT = []; scrC = []; scrN = []; btnT = [];
  while (i <= NROW) { scrT.push(' '); scrC.push(0); scrN.push(0); i++; }
  i = 1;
  while (i <= 5) { btnT.push(' '); i++; }
  setupDone = 1;
  for (;;) {
    step();
    if (gHead != headShown) { headShown = gHead; write(gHead); }
  }
});
on('click', 'head', function () { clickX = mouseX(); clickY = mouseY(); clickN = clickN + 1; });
on('key:38', 'head', function () { keyCmd = 2; });
on('key:40', 'head', function () { keyCmd = 3; });

// the lines of the screen
on('start', 'row', function () {
  let i = 1;
  hide();
  waitUntil(setupDone == 1);
  while (i <= NROW) { cloneSelf(); i++; }
  // (here, not in the thread that asks: the room must be written to while an answer is being typed)
  for (;;) { hbStep(); }
});
on('clone', 'row', function () {
  rowBorn = rowBorn + 1;
  row$i = rowBorn; row$v = 0 - 1;
  goto(0, ROWTOP - ROWH / 2 - (row$i - 1) * ROWH);
  show();
  for (;;) {
    if (row$v != drawV) {
      row$v = drawV;
      write(scrT[row$i]);
      if (scrC[row$i] == 0) { textColorHex('#e9edf3'); }
      if (scrC[row$i] == 1) { textColorHex('#7fd0ff'); }
      if (scrC[row$i] == 2) { textColorHex('#ffb974'); }
      if (scrC[row$i] == 3) { textColorHex('#ffe45c'); }
      if (scrC[row$i] == 4) { textColorHex('#8a94a6'); }
    }
  }
});
on('start', 'btn', function () {
  let i = 1;
  hide();
  waitUntil(setupDone == 1);
  while (i <= 5) { cloneSelf(); i++; }
});
on('clone', 'btn', function () {
  btnBorn = btnBorn + 1;
  btn$i = btnBorn; btn$v = 0 - 1;
  goto(btn$i * 96 - 288, BTNY);
  for (;;) {
    if (btn$v != drawV) {
      btn$v = drawV;
      if (strlen(btnT[btn$i]) > 1) { write(` ${btnT[btn$i]} `); show(); } else { hide(); }
    }
  }
});
// the bottom line: the state
on('start', 'foot', function () {
  for (;;) {
    if (statS != statShown) { statShown = statS; write(statS); }
  }
});
// the questions, in a thread of their own: the screen goes on showing what comes in while an answer is typed
on('start', 'ask', function () {
  for (;;) {
    if (want == 1) {
      ask(askMsg);
      gAns = answer();
      post();
      want = 0;
    }
    if (want == 2) {
      ask('지우려면 1 (그 밖에는 취소)');
      gAns = answer();
      if (strlen(gAns) == 1) { if (indexOf(gAns, '1') == 1) { erase(); } }
      want = 0;
    }
  }
});
