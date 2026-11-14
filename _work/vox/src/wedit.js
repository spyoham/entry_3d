// ===================================================================== world edit (v2.8)
// The genre's WorldEdit mod, as near as it goes, for the admins alone: on a server those with op (the
// owner, SUPER) while the owner lets it be (/server worldedit on|off, the header's 16th field), in a
// single world the player while it is on (//worldedit on|off, kept with the world).
// A selection of two corners (the wand, a wooden axe: click the first, F the second; //pos1 //pos2 at
// the feet, //hpos1 //hpos2 where the eye is), then //set //replace //walls //faces //overlay
// //naturalize //count //size, //copy //cut //paste //rotate //flip, //stack //move //shift //expand
// //contract, //undo //redo, and round the feet //sphere //hsphere //cyl //hcyl //pyramid //hpyramid
// //drain //replacenear. A pattern: a block, blocks at random (stone,dirt) or by weight (70%stone,30%dirt),
// hand (the block held). A direction: me (the way of the eye), forward back left right up down north
// south east west (n s e w u d).
// Every change is one box of new blocks (WEN, x then z then y, -1 where nothing changes): put here, kept
// for //undo (what was there) and on a server sent whole as run-length text through the shared list
// ?!we (srv^id^dim^box^runs, the last 6): every screen puts it, the host keeps it in the server's
// block log. At most WEMAX cells a change.
let SY_we = [];
const WEMAX = 65536, WEB = '0123456789abcdefghijklmnopqrstuvwxyz';
let weSingle = 1, weWand = 0 - 1, weClick = 0, weChk = 0, weSeq = 0, weJoin = 0;
let we1 = 0, we1X = 0, we1Y = 0, we1Z = 0, we2 = 0, we2X = 0, we2Y = 0, we2Z = 0, weSelD = 0;
let WEN = [], WEP = [], WEW = [], WCB = [], WCT = [], WUN = [], WRD = [], WSEEN = [], WET = [], WPI = [], WPW = [];
let weS = '', weR = '', weT = '', weX0 = 0, weY0 = 0, weZ0 = 0, weX1 = 0, weY1 = 0, weZ1 = 0, weN = 0;
let wcW = 0, wcH = 0, wcL = 0, wcOX = 0, wcOY = 0, wcOZ = 0, weDX = 0, weDY = 0, weDZ = 0, wePN = 0, wePT = 0;

// ---------------------------------------------------------------- who may
function weCan() {
  let r = 0;
  if (netSrv > 0) { if (netSt == 2) { if (shWe == 1) { if (isOp(netNick) == 1) { r = 1; } } } }
  else { if (weSingle == 1) { r = 1; } }
  return r;
}
function weWandId() {
  if (weWand < 0) { weWand = 0; let i = 1; while (i <= ITKEY.length) { if (ITKEY[i] == 'wooden_axe') { weWand = i - 1; } i = i + 1; } }
  return weWand;
}
function weWandHeld() { let r = 0; if (INVI[hotSel] == weWandId()) { if (weWand > 0) { r = weCan(); } } return r; }
// the wand: a click the first corner (instead of breaking), the right button (or F) the second
function breaking(dt) {
  if (weWandHeld() == 1) {
    breakStage = 0;
    if (clickHeld == 1 && uiMode == 0) { if (weClick == 0) { weClick = 1; if (pickOn == 1) { swingT = 0.25; cmdOut(wePosSet(1, pickX, pickY, pickZ)); } } } else { weClick = 0; }
  } else { breaking0(dt); }
}
function useKey() {
  if (weWandHeld() == 1) { if (placeCool <= 0) { placeCool = 0.25; if (pickOn == 1) { cmdOut(wePosSet(2, pickX, pickY, pickZ)); } } }
  else { useKey0(); }
}
function wePosSet(k, x, y, z) {
  if (weSelD != dim) { we1 = 0; we2 = 0; weSelD = dim; }
  if (k == 1) { we1 = 1; we1X = x; we1Y = y; we1Z = z; } else { we2 = 1; we2X = x; we2Y = y; we2Z = z; }
  weS = `${k}번째 점: ${x}, ${y}, ${z}`;
  if (we1 == 1 && we2 == 1) { let sb = weSelBox(); weS = `${weS} (${weN}칸)`; }
  return weS;
}
// the selection as the box weX0 .. weZ1 (weN cells): 0 when there is none
function weSelBox() {
  let r = 0;
  if (we1 == 1 && we2 == 1 && weSelD == dim) {
    weX0 = Math.min(we1X, we2X); weX1 = Math.max(we1X, we2X); weY0 = Math.max(0, Math.min(we1Y, we2Y)); weY1 = Math.min(WY - 1, Math.max(we1Y, we2Y)); weZ0 = Math.min(we1Z, we2Z); weZ1 = Math.max(we1Z, we2Z);
    weN = (weX1 - weX0 + 1) * (weY1 - weY0 + 1) * (weZ1 - weZ0 + 1);
    r = 1;
  }
  return r;
}

// ---------------------------------------------------------------- the commands
function weCmd(c) {
  weS = '-';
  let on = weCan();
  if (cmdFromBlock != 0) { weS = '월드에딧은 플레이어만 쓸 수 있습니다'; }
  else { if (c == 'worldedit' || c == 'we') { weS = weToggle(cw(2)); }
  else { if (on == 0) {
    if (netSrv > 0) { if (shWe == 0) { weS = '이 서버에서는 월드에딧이 꺼져 있습니다 (서버 주인: /server worldedit on)'; } else { weS = '월드에딧은 서버 관리자만 쓸 수 있습니다'; } }
    else { weS = '이 세계에서는 월드에딧이 꺼져 있습니다 (//worldedit on)'; }
  }
  else { weRun(c); } } }
  return weS;
}
function weToggle(v) {
  weS = '-';
  let p = 0 - 1;
  if (lower(v) == 'on' || v == '1' || lower(v) == 'true') { p = 1; } if (lower(v) == 'off' || v == '0' || lower(v) == 'false') { p = 0; }
  if (netSrv > 0) {
    if (p < 0) { weS = `이 서버의 월드에딧: ${optOn(shWe, '켬', '끔')} (서버 주인: /server worldedit on|off)`; }
    else { if (netNick != shOwner && netNick != SUPER) { weS = '서버 주인만 바꿀 수 있습니다'; } else { netWish(`set^we^${p}`); shWe = p; weS = `이 서버의 월드에딧: ${optOn(p, '켬 (관리자만 씁니다)', '끔')}`; } }
  } else {
    if (p >= 0) { weSingle = p; }
    weS = `이 세계의 월드에딧: ${optOn(weSingle, '켬', '끔')} (//worldedit on|off)`;
  }
  return weS;
}
function weRun(c) {
  if (c == 'wand') { addItem(weWandId(), 1, 0); weS = '나무 도끼(선택 도구): 블록을 왼쪽 클릭하면 첫 점, 오른쪽 클릭하면 두 번째 점'; }
  if (c == 'pos1' || c == 'pos2') { let k = 1; if (c == 'pos2') { k = 2; } weS = wePosSet(k, Math.floor(px), Math.floor(py), Math.floor(pz)); }
  if (c == 'hpos1' || c == 'hpos2') { let k = 1; if (c == 'hpos2') { k = 2; } if (pickOn == 1) { weS = wePosSet(k, pickX, pickY, pickZ); } else { weS = '보고 있는 블록이 없습니다'; } }
  if (c == 'sel' || c == 'desel' || c == 'deselect') { we1 = 0; we2 = 0; weS = '선택을 지웠습니다'; }
  if (c == 'size') { if (weSelBox() == 1) { weS = `선택: ${weX0},${weY0},${weZ0} - ${weX1},${weY1},${weZ1} · 크기 ${weX1 - weX0 + 1}×${weY1 - weY0 + 1}×${weZ1 - weZ0 + 1} · ${weN}칸`; } else { weS = weNoSel(); } }
  if (c == 'help') { weS = '//wand //pos1 //pos2 //hpos1 //hpos2 //sel //size //count //set //replace //walls //faces //overlay //naturalize //copy //cut //paste [-a] //rotate //flip //stack //move //shift //expand //contract //undo //redo //clearhistory //sphere //hsphere //cyl //hcyl //pyramid //hpyramid //drain //replacenear //worldedit on|off'; }
  if (c == 'undo') { weS = weUndo(weCount(cw(2)), 0); }
  if (c == 'redo') { weS = weUndo(weCount(cw(2)), 1); }
  if (c == 'clearhistory') { WUN = []; WRD = []; weS = '되돌리기 기록을 지웠습니다'; }
  if (c == 'count') { weS = weCountCmd(); }
  if (c == 'set' || c == 'walls' || c == 'faces' || c == 'outline' || c == 'replace' || c == 'overlay' || c == 'naturalize') { weS = weBoxCmd(c); }
  if (c == 'copy' || c == 'cut') { weS = weCopy(c); }
  if (c == 'paste') { weS = wePaste(); }
  if (c == 'rotate') { weS = weRotate(cw(2) * 1); }
  if (c == 'flip') { weS = weFlip(cw(2)); }
  if (c == 'stack' || c == 'move') { weS = weStack(c); }
  if (c == 'shift' || c == 'expand' || c == 'contract') { weS = weReshape(c); }
  if (c == 'sphere' || c == 'hsphere' || c == 'cyl' || c == 'hcyl' || c == 'pyramid' || c == 'hpyramid') { weS = weShape(c); }
  if (c == 'drain' || c == 'replacenear') { weS = weNear(c); }
  if (weS == '-') { weS = `알 수 없는 월드에딧 명령어입니다: //${c} (//help)`; }
}
function weNoSel() { return '먼저 두 점을 고르세요 (//wand, //pos1, //pos2)'; }
function weCount(w) { let r = 1; if (isNum(w) == 1) { r = Math.max(1, Math.floor(w * 1)); } return r; }

// ---------------------------------------------------------------- patterns and masks
// a pattern into WPI (blocks) and WPW (their weights, summed in wePT): 1 if it was read
function wePattern(w) {
  WPI = []; WPW = []; wePT = 0;
  let r = 1;
  if (strlen(w) < 1 || w == 0) { r = 0; }
  else {
    splitBy(w, ',');
    WET = []; let i = 1;
    while (i <= SPL.length) { WET.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= WET.length) {
      gS = WET[i]; let wt = 1, k = indexOf(gS, '%');
      if (k > 1) { wt = substr(gS, 1, k - 1) * 1; gS = substr(gS, k + 1, strlen(gS)); }
      let b = 0 - 1;
      if (gS == 'hand') { let h = INVI[hotSel]; if (h > 0 && h < NBLOCK) { b = h; } else { if (ITPLB[h + 1] > 0) { b = ITPLB[h + 1]; } } if (h == 0) { b = 0; } }
      else { b = blockByName(gS); }
      if (b < 0 || wt <= 0) { r = 0; weT = gS; } else { WPI.push(b); WPW.push(wt); wePT = wePT + wt; }
      i = i + 1;
    }
  }
  if (r == 0) { weT = `알 수 없는 블록입니다: ${w}`; }
  return r;
}
function wePick() {
  let r = WPI[1];
  if (WPI.length > 1) { let v = rand(0, 99999) / 100000 * wePT, i = 1, acc = 0, done = 0; while (i <= WPI.length) { acc = acc + WPW[i]; if (done == 0) { if (v < acc) { r = WPI[i]; done = 1; } } i = i + 1; } }
  return r;
}
// a mask (blocks by their kinds) into WEW: 1 if it was read
function weMask(w) {
  WEW = [];
  let r = 1;
  splitBy(w, ',');
  WET = []; let i = 1;
  while (i <= SPL.length) { WET.push(SPL[i]); i = i + 1; }
  i = 1;
  while (i <= WET.length) { let b = blockByName(WET[i]); if (b < 0) { r = 0; } else { WEW.push(BKIND[b + 1]); } i = i + 1; }
  return r;
}
function weMasked(b) { let r = 0, i = 1; while (i <= WEW.length) { if (BKIND[b + 1] == WEW[i]) { r = 1; } i = i + 1; } return r; }

// ---------------------------------------------------------------- a change: WEN over the box weX0 .. weZ1
function weCells() { return (weX1 - weX0 + 1) * (weY1 - weY0 + 1) * (weZ1 - weZ0 + 1); }
function weFill(v) { WEN = []; let n = weCells(), i = 1; while (i <= n) { WEN.push(v); i = i + 1; } }
function weIx(x, y, z) { return ((x - weX0) * (weZ1 - weZ0 + 1) + (z - weZ0)) * (weY1 - weY0 + 1) + (y - weY0) + 1; }
function weTooBig() { return `범위가 너무 큽니다 (최대 ${WEMAX}칸, ${weCells()}칸)`; }
// put WEN here: kept for //undo (unless undoing: k 1 to the redo list, 2 to the undo list without
// clearing redo), sent to the others; the number of blocks changed
function weCommit(k) {
  let before = weRunsOf(1);
  let entry = `${dim}^${weX0}^${weY0}^${weZ0}^${weX1}^${weY1}^${weZ1}^${before}`;
  if (k == 1) { WRD.push(entry); } else { WUN.push(entry); if (k == 0) { WRD = []; } }
  while (WUN.length > 12) { WUN.removeAt(1); } while (WRD.length > 12) { WRD.removeAt(1); }
  let n = wePut();
  if (netSrv > 0) { if (netSt == 2) { weSend(weRunsOf(0)); if (netHost == 1) { hostKeepBox(weX0, weY0, weZ0, weX1, weY1, weZ1, dim); } } }
  return n;
}
function wePut() {
  let q0 = netQuiet; netQuiet = 1;
  bxN = 0;
  let x = weX0, i = 1;
  while (x <= weX1) {
    let z = weZ0;
    while (z <= weZ1) { let y = weY0; while (y <= weY1) { let b = WEN[i]; if (b >= 0) { boxPut(x, y, z, b); } i = i + 1; y = y + 1; } z = z + 1; }
    x = x + 1;
  }
  boxLight(weX0, weX1, weZ0, weZ1);
  netQuiet = q0;
  return bxN;
}
// WEN as runs (b 1: what is there now where WEN changes something; 0: WEN itself), into weR
function weRunsOf(b) {
  weR = '';
  let n = WEN.length, i = 1, last = 0 - 2, run = 0, x = weX0, y = weY0, z = weZ0;
  while (i <= n + 1) {
    let v = 0 - 3;
    if (i <= n) {
      v = WEN[i];
      // ((v2.9) a cell in a chunk not made yet: not known, so the undo leaves it)
      if (b == 1) { if (v >= 0) { if (cOK(x, z) == 1) { v = blockAt(x, y, z); } else { v = 0 - 1; } } }
      y = y + 1; if (y > weY1) { y = weY0; z = z + 1; if (z > weZ1) { z = weZ0; x = x + 1; } }
    }
    if (v == last && run < 46655) { run = run + 1; }
    else { if (run > 0) { let id = last; if (id < 0) { id = 46655; } weNum(id); weR = `${weR}${weT}`; weNum(run); weR = `${weR}${weT}`; } last = v; run = 1; }
    i = i + 1;
  }
  return weR;
}
function weNum(v) { weT = `${charAt(WEB, idiv(v, 1296) + 1)}${charAt(WEB, mod(idiv(v, 36), 36) + 1)}${charAt(WEB, mod(v, 36) + 1)}`; }
function weVal(s, p) { return ((indexOf(WEB, charAt(s, p)) - 1) * 36 + (indexOf(WEB, charAt(s, p + 1)) - 1)) * 36 + (indexOf(WEB, charAt(s, p + 2)) - 1); }
// runs into WEN (over the box weX0 .. weZ1)
function weFromRuns(s) {
  WEN = [];
  let p = 1, L = strlen(s), n = weCells();
  while (p + 5 <= L) {
    let id = weVal(s, p), run = weVal(s, p + 3), k = 0;
    if (id == 46655) { id = 0 - 1; }
    while (k < run) { WEN.push(id); k = k + 1; }
    p = p + 6;
  }
  while (WEN.length < n) { WEN.push(0 - 1); }
}
function weUndo(times, redo) {
  let done = 0, t = 0, total = 0;
  while (t < times) {
    let has = 0;
    if (redo == 0) { has = WUN.length; } else { has = WRD.length; }
    if (has > 0) {
      if (redo == 0) { gS = WUN[WUN.length]; WUN.removeAt(WUN.length); } else { gS = WRD[WRD.length]; WRD.removeAt(WRD.length); }
      splitBy(gS, '^');
      if (SPL.length >= 8) { if (SPL[1] * 1 == dim) {
        weX0 = SPL[2] * 1; weY0 = SPL[3] * 1; weZ0 = SPL[4] * 1; weX1 = SPL[5] * 1; weY1 = SPL[6] * 1; weZ1 = SPL[7] * 1;
        weFromRuns(SPL[8]);
        if (redo == 0) { total = total + weCommit(1); } else { total = total + weCommit(2); }
        done = done + 1;
      } }
    }
    t = t + 1;
  }
  if (redo == 0) { weS = `${done}번 되돌렸습니다 (블록 ${total}개)`; if (done == 0) { weS = '되돌릴 것이 없습니다'; } }
  else { weS = `${done}번 다시 했습니다 (블록 ${total}개)`; if (done == 0) { weS = '다시 할 것이 없습니다'; } }
  return weS;
}

// ---------------------------------------------------------------- the selection's commands
function weCountCmd() {
  weS = '-';
  if (weSelBox() == 0) { weS = weNoSel(); }
  else { if (weMask(cw(2)) == 0) { weS = `알 수 없는 블록입니다: ${cw(2)}`; }
  else {
    let n = 0, x = weX0;
    while (x <= weX1) { let z = weZ0; while (z <= weZ1) { if (cOK(x, z) == 1) { let y = weY0; while (y <= weY1) { if (weMasked(blockAt(x, y, z)) == 1) { n = n + 1; } y = y + 1; } } z = z + 1; } x = x + 1; }
    weS = `선택 안에 ${n}개 있습니다`;
  } }
  return weS;
}
function weBoxCmd(c) {
  weS = '-';
  let pat = cw(2), msk = '-';
  if (c == 'replace') { if (CMW.length >= 3) { msk = cw(2); pat = cw(3); } }
  if (c == 'naturalize') { pat = 'stone'; }
  if (weSelBox() == 0) { weS = weNoSel(); }
  else { if (weN > WEMAX) { weS = weTooBig(); }
  else { if (wePattern(pat) == 0) { weS = weT; }
  else { if (msk != '-' && weMask(msk) == 0) { weS = `알 수 없는 블록입니다: ${msk}`; }
  else {
    weFill(0 - 1);
    let x = weX0, i = 1;
    while (x <= weX1) {
      let z = weZ0;
      while (z <= weZ1) {
        let y = weY0, ok = cOK(x, z), top = 0 - 1, dirt = 0;
        // (overlay: the highest block of the column in the selection, one over it)
        if (c == 'overlay' && ok == 1) { let yy = weY1; while (yy >= weY0 && top < 0) { if (blockAt(x, yy, z) != 0) { top = yy; } yy = yy - 1; } }
        if (c == 'naturalize' && ok == 1) { dirt = 0 - 1; }
        let yy2 = weY1;
        while (y <= weY1) {
          let put = 0 - 1;
          if (ok == 1) {
            let o = blockAt(x, y, z), edge = 0;
            if (c == 'set') { put = wePick(); }
            if (c == 'walls') { if (x == weX0 || x == weX1 || z == weZ0 || z == weZ1) { put = wePick(); } }
            if (c == 'faces' || c == 'outline') { if (x == weX0 || x == weX1 || z == weZ0 || z == weZ1 || y == weY0 || y == weY1) { put = wePick(); } }
            if (c == 'replace') { if (msk == '-') { if (o != 0) { put = wePick(); } } else { if (weMasked(o) == 1) { put = wePick(); } } }
            if (c == 'overlay') { if (top >= 0 && y == top + 1) { put = wePick(); } }
            if (put == o) { put = 0 - 1; }
          }
          WEN[i] = put; i = i + 1; y = y + 1;
        }
        // (naturalize: from the top of the column down, grass, three dirt, then stone, for the solid ones)
        if (c == 'naturalize' && ok == 1) {
          let yy = weY1, depth = 0;
          while (yy >= weY0) {
            let o = blockAt(x, yy, z), j = i - 1 - (weY1 - yy);
            if (BSOL[o + 1] == 1 && BLQ[o + 1] == 0) { let nb = 1; if (depth == 0) { nb = 2; } else { if (depth <= 3) { nb = 3; } } if (blockAt(x, yy + 1, z) != 0 && depth == 0) { nb = 3; } if (nb != o) { WEN[j] = nb; } depth = depth + 1; } else { depth = 0; }
            yy = yy - 1;
          }
        }
        z = z + 1;
      }
      x = x + 1;
    }
    let n = weCommit(0);
    weS = `블록 ${n}개를 바꿨습니다`;
  } } } }
  return weS;
}
// the clipboard: WCB (x then z then y), wcW wcH wcL, and where it was from the player (wcOX ..)
function weCopy(c) {
  weS = '-';
  if (weSelBox() == 0) { weS = weNoSel(); }
  else { if (weN > WEMAX) { weS = weTooBig(); }
  else {
    WCB = [];
    let x = weX0, nf = 0;
    // ((v2.9) a cell of a chunk not made yet is left out of the paste: it read as stone)
    while (x <= weX1) { let z = weZ0; while (z <= weZ1) { let y = weY0; let ok = cOK(x, z); while (y <= weY1) { if (ok == 1) { WCB.push(blockAt(x, y, z)); } else { WCB.push(0 - 1); nf = nf + 1; } y = y + 1; } z = z + 1; } x = x + 1; }
    wcW = weX1 - weX0 + 1; wcH = weY1 - weY0 + 1; wcL = weZ1 - weZ0 + 1;
    wcOX = weX0 - Math.floor(px); wcOY = weY0 - Math.floor(py); wcOZ = weZ0 - Math.floor(pz);
    weS = `블록 ${weN}칸을 복사했습니다`; if (nf > 0) { weS = `${weS} (아직 불러오지 않은 ${nf}칸은 빼고)`; }
    if (c == 'cut') { weFill(0); let i = 1; while (i <= WCB.length) { if (WCB[i] <= 0) { WEN[i] = 0 - 1; } i = i + 1; } let n = weCommit(0); weS = `블록 ${weN}칸을 잘라 냈습니다 (${n}개 지움)`; }
  } }
  return weS;
}
function wePaste() {
  weS = '-';
  if (WCB.length == 0) { weS = '클립보드가 비어 있습니다 (//copy)'; }
  else {
    let skipAir = 0;
    if (cw(2) == '-a') { skipAir = 1; }
    weX0 = Math.floor(px) + wcOX; weY0 = Math.floor(py) + wcOY; weZ0 = Math.floor(pz) + wcOZ;
    weX1 = weX0 + wcW - 1; weY1 = weY0 + wcH - 1; weZ1 = weZ0 + wcL - 1;
    let ry0 = weY0, ry1 = weY1;
    // (the box cut to the world's height: the clipboard read by its own place)
    WEN = [];
    let x = weX0, i = 1;
    while (x <= weX1) { let z = weZ0; while (z <= weZ1) { let y = ry0; while (y <= ry1) {
      let b = WCB[i];
      if (skipAir == 1 && b == 0) { b = 0 - 1; }
      if (y < 0 || y >= WY) { b = 0 - 2; }
      WEN.push(b); i = i + 1; y = y + 1; } z = z + 1; } x = x + 1; }
    // (cells out of the world taken out: the box weY0 .. weY1 inside it)
    if (weY0 < 0 || weY1 >= WY) {
      WET = []; i = 1; while (i <= WEN.length) { WET.push(WEN[i]); i = i + 1; }
      let a0 = Math.max(0, weY0), a1 = Math.min(WY - 1, weY1), h = weY1 - weY0 + 1;
      WEN = []; i = 1;
      while (i <= WET.length) { let yy = ry0 + mod(i - 1, h); if (yy >= a0 && yy <= a1) { WEN.push(WET[i]); } i = i + 1; }
      weY0 = a0; weY1 = a1;
    }
    i = 1; while (i <= WEN.length) { if (WEN[i] == 0 - 2) { WEN[i] = 0 - 1; } i = i + 1; }
    if (weY0 > weY1) { weS = '세계 높이 밖입니다'; }
    else {
      let n = weCommit(0);
      we1 = 1; we1X = weX0; we1Y = weY0; we1Z = weZ0; we2 = 1; we2X = weX1; we2Y = weY1; we2Z = weZ1; weSelD = dim;
      weS = `붙여 넣었습니다 (블록 ${n}개, 붙인 곳이 선택됩니다)`;
    }
  }
  return weS;
}
// the clipboard turned round the vertical (90, 180, 270: clockwise seen from above) or mirrored
function weRotate(d) {
  weS = '-';
  if (WCB.length == 0) { weS = '클립보드가 비어 있습니다 (//copy)'; }
  else {
    let q = mod(Math.round(d / 90), 4), t = 0;
    while (t < q) {
      // (x, z) -> (wcL - 1 - z, x): the new width is the old length; offsets turned with it
      WCT = []; let nW = wcL, nL = wcW, a = 0;
      while (a < nW) { let c = 0; while (c < nL) { let ox = c, oz = wcL - 1 - a, y = 0; while (y < wcH) { WCT.push(WCB[(ox * wcL + oz) * wcH + y + 1]); y = y + 1; } c = c + 1; } a = a + 1; }
      WCB = []; let i = 1; while (i <= WCT.length) { WCB.push(WCT[i]); i = i + 1; }
      let ox0 = wcOX, oz0 = wcOZ;
      wcOX = 0 - (oz0 + wcL - 1); wcOZ = ox0;
      wcW = nW; wcL = nL;
      // ((v2.9) each block turned with it: stairs, doors, logs ... (they kept their way))
      i = 1; while (i <= WCB.length) { if (WCB[i] > 0) { WCB[i] = BROT[WCB[i] + 1]; } i = i + 1; }
      t = t + 1;
    }
    weS = `클립보드를 ${q * 90}도 돌렸습니다`;
  }
  return weS;
}
function weFlip(w) {
  weS = '-';
  if (WCB.length == 0) { weS = '클립보드가 비어 있습니다 (//copy)'; }
  else {
    weDir(w);
    WCT = []; let i = 1; while (i <= WCB.length) { WCT.push(WCB[i]); i = i + 1; }
    let x = 0;
    while (x < wcW) { let z = 0; while (z < wcL) { let y = 0; while (y < wcH) {
      let sx = x, sy = y, sz = z;
      if (weDX != 0) { sx = wcW - 1 - x; } if (weDY != 0) { sy = wcH - 1 - y; } if (weDZ != 0) { sz = wcL - 1 - z; }
      WCB[(x * wcL + z) * wcH + y + 1] = WCT[(sx * wcL + sz) * wcH + sy + 1];
      y = y + 1; } z = z + 1; } x = x + 1; }
    weS = '클립보드를 뒤집었습니다';
  }
  return weS;
}
// a direction word into weDX weDY weDZ (me / none: the way of the eye, up or down when looking so)
function weDir(w) {
  weDX = 0; weDY = 0; weDZ = 0;
  let f = faceOf(yaw), done = 0;
  if (w == 'up' || w == 'u') { weDY = 1; done = 1; } if (w == 'down' || w == 'd') { weDY = 0 - 1; done = 1; }
  if (w == 'north' || w == 'n') { weDZ = 0 - 1; done = 1; } if (w == 'south' || w == 's') { weDZ = 1; done = 1; }
  if (w == 'east' || w == 'e') { weDX = 1; done = 1; } if (w == 'west' || w == 'w') { weDX = 0 - 1; done = 1; }
  if (w == 'back' || w == 'b') { f = mod(f + 2, 4); } if (w == 'left' || w == 'l') { f = mod(f + 3, 4); } if (w == 'right' || w == 'r') { f = mod(f + 1, 4); }
  if (done == 0) {
    if ((w == 'me' || w == 'forward' || w == 'f' || strlen(w) < 1 || w == 0) && pitch > 50) { weDY = 1; }
    else { if ((w == 'me' || w == 'forward' || w == 'f' || strlen(w) < 1 || w == 0) && pitch < 0 - 50) { weDY = 0 - 1; }
    else { weDX = dirX(f); weDZ = dirZ(f); } }
  }
}
// //stack [n] [dir]: the selection copied n times on that way; //move [n] [dir]: moved n blocks
function weStack(c) {
  weS = '-';
  let n = 1, dw = cw(2);
  if (isNum(cw(2)) == 1) { n = Math.max(1, Math.floor(cw(2) * 1)); dw = cw(3); }
  weDir(dw);
  if (weSelBox() == 0) { weS = weNoSel(); }
  else {
    let sw = weX1 - weX0 + 1, sh = weY1 - weY0 + 1, sl = weZ1 - weZ0 + 1, step = 1;
    if (c == 'stack') { step = sw * Math.abs(weDX) + sh * Math.abs(weDY) + sl * Math.abs(weDZ); }
    else { step = n; n = 1; }
    let ax0 = weX0, ay0 = weY0, az0 = weZ0, ax1 = weX1, ay1 = weY1, az1 = weZ1;
    // the box from the selection to the last copy (or the moved place)
    let ex = weDX * step * n, ey = weDY * step * n, ez = weDZ * step * n;
    weX0 = Math.min(ax0, ax0 + ex); weX1 = Math.max(ax1, ax1 + ex); weY0 = Math.min(ay0, ay0 + ey); weY1 = Math.max(ay1, ay1 + ey); weZ0 = Math.min(az0, az0 + ez); weZ1 = Math.max(az1, az1 + ez);
    weY0 = Math.max(0, weY0); weY1 = Math.min(WY - 1, weY1);
    if (weCells() > WEMAX) { weS = weTooBig(); }
    else {
      // (the selection's blocks read first: the two may overlap)
      WCT = []; let x = ax0;
      while (x <= ax1) { let z = az0; while (z <= az1) { let y = ay0; while (y <= ay1) { WCT.push(blockAt(x, y, z)); y = y + 1; } z = z + 1; } x = x + 1; }
      weFill(0 - 1);
      if (c == 'move') { x = ax0; while (x <= ax1) { let z = az0; while (z <= az1) { let y = Math.max(0, ay0); while (y <= Math.min(WY - 1, ay1)) { WEN[weIx(x, y, z)] = 0; y = y + 1; } z = z + 1; } x = x + 1; } }
      let k = 1;
      while (k <= n) {
        let ox = weDX * step * k, oy = weDY * step * k, oz = weDZ * step * k, i = 1;
        x = ax0;
        while (x <= ax1) { let z = az0; while (z <= az1) { let y = ay0; while (y <= ay1) {
          let ty = y + oy;
          if (ty >= 0 && ty < WY) { WEN[weIx(x + ox, ty, z + oz)] = WCT[i]; }
          i = i + 1; y = y + 1; } z = z + 1; } x = x + 1; }
        k = k + 1;
      }
      let m = weCommit(0);
      if (c == 'move') { we1X = we1X + weDX * step; we1Y = we1Y + weDY * step; we1Z = we1Z + weDZ * step; we2X = we2X + weDX * step; we2Y = we2Y + weDY * step; we2Z = we2Z + weDZ * step; weS = `${step}칸 옮겼습니다 (블록 ${m}개)`; }
      else { weS = `${n}번 쌓았습니다 (블록 ${m}개)`; }
    }
  }
  return weS;
}
// //shift n [dir], //expand n [dir] | vert, //contract n [dir]: the selection's box
function weReshape(c) {
  weS = '-';
  if (weSelBox() == 0) { weS = weNoSel(); }
  else {
    if (c == 'expand' && cw(2) == 'vert') { if (we1Y <= we2Y) { we1Y = 0; we2Y = WY - 1; } else { we2Y = 0; we1Y = WY - 1; } }
    else {
      let n = 1; if (isNum(cw(2)) == 1) { n = Math.floor(cw(2) * 1); }
      weDir(cw(3));
      if (c == 'shift') { we1X = we1X + weDX * n; we2X = we2X + weDX * n; we1Y = we1Y + weDY * n; we2Y = we2Y + weDY * n; we1Z = we1Z + weDZ * n; we2Z = we2Z + weDZ * n; }
      else {
        // (expand: the face on that way goes out; contract: the face on the other way comes in)
        let s = 1; if (c == 'contract') { s = 0 - 1; }
        let gx = weDX, gy = weDY, gz = weDZ;
        if (c == 'contract') { gx = 0 - gx; gy = 0 - gy; gz = 0 - gz; }
        if (gx > 0) { if (we1X >= we2X) { we1X = we1X + n * s; } else { we2X = we2X + n * s; } } if (gx < 0) { if (we1X <= we2X) { we1X = we1X - n * s; } else { we2X = we2X - n * s; } }
        if (gy > 0) { if (we1Y >= we2Y) { we1Y = we1Y + n * s; } else { we2Y = we2Y + n * s; } } if (gy < 0) { if (we1Y <= we2Y) { we1Y = we1Y - n * s; } else { we2Y = we2Y - n * s; } }
        if (gz > 0) { if (we1Z >= we2Z) { we1Z = we1Z + n * s; } else { we2Z = we2Z + n * s; } } if (gz < 0) { if (we1Z <= we2Z) { we1Z = we1Z - n * s; } else { we2Z = we2Z - n * s; } }
      }
    }
    let r = weSelBox();
    weS = `선택: ${weX0},${weY0},${weZ0} - ${weX1},${weY1},${weZ1} (${weN}칸)`;
  }
  return weS;
}
// round the feet: //sphere p r, //cyl p r [h], //pyramid p size (h: hollow)
function weShape(c) {
  weS = '-';
  let r = cw(3) * 1, h = 1, hol = 0;
  if (charAt(c, 1) == 'h') { hol = 1; }
  if (c == 'cyl' || c == 'hcyl') { h = 1; if (isNum(cw(4)) == 1) { h = Math.max(1, Math.floor(cw(4) * 1)); } }
  if (isNum(cw(3)) == 0 || r < 1) { weS = `//${c} <블록> <반지름>`; if (c == 'cyl' || c == 'hcyl') { weS = `//${c} <블록> <반지름> [높이]`; } if (c == 'pyramid' || c == 'hpyramid') { weS = `//${c} <블록> <크기>`; } }
  else { if (wePattern(cw(2)) == 0) { weS = weT; }
  else {
    let cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz), ri = Math.ceil(r);
    if (c == 'sphere' || c == 'hsphere') { weX0 = cx - ri; weX1 = cx + ri; weY0 = cy - ri; weY1 = cy + ri; weZ0 = cz - ri; weZ1 = cz + ri; }
    if (c == 'cyl' || c == 'hcyl') { weX0 = cx - ri; weX1 = cx + ri; weY0 = cy; weY1 = cy + h - 1; weZ0 = cz - ri; weZ1 = cz + ri; }
    if (c == 'pyramid' || c == 'hpyramid') { weX0 = cx - ri + 1; weX1 = cx + ri - 1; weY0 = cy; weY1 = cy + ri - 1; weZ0 = cz - ri + 1; weZ1 = cz + ri - 1; }
    weY0 = Math.max(0, weY0); weY1 = Math.min(WY - 1, weY1);
    if (weY0 > weY1) { weS = '세계 높이 밖입니다'; }
    else { if (weCells() > WEMAX) { weS = weTooBig(); }
    else {
      weFill(0 - 1);
      let x = weX0, i = 1, rr = (r + 0.5) * (r + 0.5), ri2 = (r - 0.5) * (r - 0.5);
      while (x <= weX1) {
        let z = weZ0;
        while (z <= weZ1) {
          let ok = cOK(x, z), y = weY0;
          while (y <= weY1) {
            let dx = x - cx, dy = y - cy, dz = z - cz, inside = 0, shell = 0;
            if (c == 'sphere' || c == 'hsphere') {
              let d = dx * dx + dy * dy + dz * dz;
              if (d <= rr) { inside = 1; if (d > ri2) { shell = 1; } else { let a = (Math.abs(dx) + 1) * (Math.abs(dx) + 1) + dy * dy + dz * dz, b2 = dx * dx + (Math.abs(dy) + 1) * (Math.abs(dy) + 1) + dz * dz, c2 = dx * dx + dy * dy + (Math.abs(dz) + 1) * (Math.abs(dz) + 1); if (a > rr || b2 > rr || c2 > rr) { shell = 1; } } }
            }
            if (c == 'cyl' || c == 'hcyl') {
              let d = dx * dx + dz * dz;
              if (d <= rr) { inside = 1; let a = (Math.abs(dx) + 1) * (Math.abs(dx) + 1) + dz * dz, b2 = dx * dx + (Math.abs(dz) + 1) * (Math.abs(dz) + 1); if (a > rr || b2 > rr) { shell = 1; } }
            }
            if (c == 'pyramid' || c == 'hpyramid') {
              let lv = ri - 1 - dy;
              if (Math.abs(dx) <= lv && Math.abs(dz) <= lv) { inside = 1; if (Math.abs(dx) == lv || Math.abs(dz) == lv || dy == ri - 1) { shell = 1; } }
            }
            if (ok == 1 && inside == 1 && (hol == 0 || shell == 1)) { let b = wePick(); if (b != blockAt(x, y, z)) { WEN[i] = b; } }
            i = i + 1; y = y + 1;
          }
          z = z + 1;
        }
        x = x + 1;
      }
      let n = weCommit(0);
      weS = `블록 ${n}개를 놓았습니다`;
    } }
  } }
  return weS;
}
// //drain [r]: water and lava gone round the feet; //replacenear r from to
function weNear(c) {
  weS = '-';
  let r = 10, msk = 'water,lava', pat = 'air';
  if (c == 'drain') { if (isNum(cw(2)) == 1) { r = Math.floor(cw(2) * 1); } }
  else { r = Math.floor(cw(2) * 1); msk = cw(3); pat = cw(4); }
  if (c == 'replacenear' && (isNum(cw(2)) == 0 || CMW.length < 4)) { weS = '//replacenear <반지름> <바꿀 블록> <새 블록>'; }
  else { if (wePattern(pat) == 0) { weS = weT; }
  else { if (weMask(msk) == 0) { weS = `알 수 없는 블록입니다: ${msk}`; }
  else {
    let cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz);
    weX0 = cx - r; weX1 = cx + r; weY0 = Math.max(0, cy - r); weY1 = Math.min(WY - 1, cy + r); weZ0 = cz - r; weZ1 = cz + r;
    if (weCells() > WEMAX) { weS = weTooBig(); }
    else {
      weFill(0 - 1);
      let x = weX0, i = 1;
      while (x <= weX1) { let z = weZ0; while (z <= weZ1) { let ok = cOK(x, z), y = weY0; while (y <= weY1) {
        if (ok == 1) { let o = blockAt(x, y, z), m = weMasked(o); if (c == 'drain') { if (BLQ[o + 1] > 0) { m = 1; } } if (m == 1) { let b = wePick(); if (b != o) { WEN[i] = b; } } }
        i = i + 1; y = y + 1; } z = z + 1; } x = x + 1; }
      let n = weCommit(0);
      weS = `블록 ${n}개를 바꿨습니다`;
    }
  } } }
  return weS;
}

// ---------------------------------------------------------------- on a server: the changes to everyone
function weSend(runs) {
  weSeq = weSeq + 1;
  let id = `${netSid}.${weSeq}`;
  WET = []; let i = 1;
  while (i <= SY_we.length) { WET.push(SY_we[i]); i = i + 1; }
  WET.push(`${netSrv}^${id}^${dim}^${weX0}^${weY0}^${weZ0}^${weX1}^${weY1}^${weZ1}^${runs}`);
  while (WET.length > 6) { WET.removeAt(1); }
  SY_we = []; i = 1;
  while (i <= WET.length) { SY_we.push(WET[i]); i = i + 1; }
  weSeen(id);
}
function weSeen(id) { WSEEN.push(id); while (WSEEN.length > 40) { WSEEN.removeAt(1); } }
function weWasSeen(id) { let r = 0, i = 1; while (i <= WSEEN.length) { if (WSEEN[i] == id) { r = 1; } i = i + 1; } return r; }
// each frame on a server (net.js netInServer): the others' changes put here (those there when I came
// are in the server's blocks already)
function weStep(dt) {
  if (netSt != 2) { weJoin = 0; }
  else {
    weChk = weChk + dt;
    if (weChk >= 0.2) {
      weChk = 0;
      let i = 1;
      while (i <= SY_we.length) {
        gS = SY_we[i];
        splitBy(gS, '^');
        if (SPL.length >= 10) { if (SPL[1] * 1 == netSrv) {
          let id = SPL[2];
          if (weWasSeen(id) == 0) {
            weSeen(id);
            if (weJoin == 1 && SPL[3] * 1 == dim) {
              weX0 = SPL[4] * 1; weY0 = SPL[5] * 1; weZ0 = SPL[6] * 1; weX1 = SPL[7] * 1; weY1 = SPL[8] * 1; weZ1 = SPL[9] * 1;
              weFromRuns(SPL[10]);
              let n = wePut();
              if (netHost == 1) { hostKeepBox(weX0, weY0, weZ0, weX1, weY1, weZ1, dim); }
            }
          }
        } }
        i = i + 1;
      }
      weJoin = 1;
    }
  }
}

// ---------------------------------------------------------------- the selection drawn (its 12 edges)
function weDrawSel() {
  if (we1 == 1 && we2 == 1 && weSelD == dim) { if (weCan() == 1) {
    let x0 = Math.min(we1X, we2X), y0 = Math.min(we1Y, we2Y), z0 = Math.min(we1Z, we2Z), x1 = Math.max(we1X, we2X) + 1, y1 = Math.max(we1Y, we2Y) + 1, z1 = Math.max(we1Z, we2Z) + 1;
    pkCorner(1, x0, y0, z0); pkCorner(2, x1, y0, z0); pkCorner(3, x0, y0, z1); pkCorner(4, x1, y0, z1);
    pkCorner(5, x0, y1, z0); pkCorner(6, x1, y1, z0); pkCorner(7, x0, y1, z1); pkCorner(8, x1, y1, z1);
    let k = 1;
    while (k <= 24) { weEdge(EDGA[k], EDGA[k + 1]); k = k + 2; }
  } }
}
function weEdge(a, b) {
  let za = PKZ[a], zb = PKZ[b], ax = PKX[a], ay = PKY[a], bx = PKX[b], by = PKY[b];
  if (za > NEARZ || zb > NEARZ) {
    if (za <= NEARZ) { let t = (NEARZ - za) / (zb - za); ax = ax + (bx - ax) * t; ay = ay + (by - ay) * t; za = NEARZ; }
    if (zb <= NEARZ) { let t = (NEARZ - zb) / (za - zb); bx = bx + (ax - bx) * t; by = by + (ay - by) * t; zb = NEARZ; }
    let sx0 = ax * FOC / za, sy0 = ay * FOC / za, sx1 = bx * FOC / zb, sy1 = by * FOC / zb;
    let dx = sx1 - sx0, dy = sy1 - sy0, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 0.01) {
      let nx = 0 - dy / l * 0.7, ny = dx / l * 0.7;
      fillStop(); goto(sx0 + nx, sy0 + ny); fillColorHex('#ff9a2a'); fillStart(); goto(sx1 + nx, sy1 + ny); goto(sx1 - nx, sy1 - ny); goto(sx0 - nx, sy0 - ny);
      nFill = nFill + 1;
    }
  }
}
