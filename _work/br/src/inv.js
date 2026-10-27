// ===================================================================== v1.2: the inventory (Tab or I)
// The player's things on one screen, with the pointer free: the three guns with their five
// attachment slots, the spare attachments (an attachment that fits none of the guns now goes in
// the backpack instead of staying on the ground), and the backpack (ammunition, meds, throwables,
// armour) with its weight. Click a slot to take its attachment off, click a spare one to put it on
// the chosen gun, the cross beside a line drops one of it; "auto" puts the best attachments on the
// best guns, the better gun in slot 1.
let INVA = [];
let invSel = 1, invMsg = '', invMsgT = 0, invInit = 0;
let ASH = ['소음기', '보정기', '소염기', '도트', '홀로', '2배', '4배', '8배', '수직', '앵글', '레이저', '대용량', '퀵드로', '전술', '볼받침'];
let SLOTS = ['총구', '조준', '손잡이', '탄창', '개머리'];
let INVROW = [];

function invReset() {
  if (invInit == 0) { invInit = 1; let i = 1; while (i <= 15) { INVA.push(0); i = i + 1; } i = 1; while (i <= 16) { INVROW.push(0); i = i + 1; } }
  let i = 1;
  while (i <= 15) { INVA[i] = 0; i = i + 1; }
  invOpen = 0; invSel = 1;
}
function spareN() {
  let n = 0, i = 1;
  while (i <= 15) { n = n + INVA[i]; i = i + 1; }
  return n;
}
// a spare attachment into the backpack when there is room: 1 taken
function spareAdd(ai) {
  let r = 0;
  if (loadOf(1) + ITW[NGUN + ai] <= capOf(1)) { INVA[ai] = INVA[ai] + 1; r = 1; }
  return r;
}
function invSay(s) { invMsg = s; invMsgT = 2.5; }
function invToggle() {
  if (invOpen == 0) {
    invOpen = 1; mapOpen = 0; invSel = ECUR[1];
    if ($M_LOCK != 0) { $M_LOCK = 0; lockAskT = 0; }
  } else { invOpen = 0; lockReq(); }
  txClear();
}
function gunIn(s) {
  let g = EG1[1];
  if (s == 2) { g = EG2[1]; }
  if (s == 3) { g = EG3[1]; }
  return g;
}
function attOf(s) {
  let a = EA1[1];
  if (s == 2) { a = EA2[1]; }
  if (s == 3) { a = EA3[1]; }
  return a;
}
function setAtt(s, a) {
  if (s == 1) { EA1[1] = a; }
  if (s == 2) { EA2[1] = a; }
  if (s == 3) { EA3[1] = a; }
}
// the attachment in slot k of gun s off, into the backpack (or on the ground when it is full)
function invDetach(s, k) {
  let a = attOf(s), ai = attIn(a, k);
  if (ai > 0) {
    setAtt(s, attPut(a, k, 0));
    if (spareAdd(ai) == 1) { invSay(`${ANAME[ai]}: 가방에 넣었습니다`); } else { itemAdd(NGUN + ai, plX + sind(plYaw) * 80, plY + 2, plZ + cosd(plYaw) * 80, 1); invSay(`가방이 가득 차서 ${ANAME[ai]}을(를) 바닥에 놓았습니다`); }
    // (a smaller magazine: the rounds over the new size go back to the pack)
    let g = gunIn(s);
    if (k == 4) { invMagFit(s, g); }
    playerGunStats(); sfx(SND_EQUIP, 0);
  }
}
function invMagFit(s, g) {
  let full = magSize(g, attOf(s)), m = EM1[1];
  if (s == 2) { m = EM2[1]; }
  if (s == 3) { m = EM3[1]; }
  if (m > full) {
    ammoAdd(1, GAMMO[g], m - full);
    if (s == 1) { EM1[1] = full; }
    if (s == 2) { EM2[1] = full; }
    if (s == 3) { EM3[1] = full; }
  }
}
// a spare attachment onto the chosen gun (what was in that slot goes to the backpack)
function invEquip(ai) {
  let s = invSel, g = gunIn(s);
  if (g == 0) { invSay('고른 칸에 총이 없습니다'); }
  else { if (attFits(g, ai) == 0) { invSay(`${ANAME[ai]}은(는) ${GNAME[g]}에 맞지 않습니다`); }
  else {
    let k = ASLOT[ai], a = attOf(s), old = attIn(a, k);
    INVA[ai] = INVA[ai] - 1;
    setAtt(s, attPut(a, k, ai));
    if (old > 0) { INVA[old] = INVA[old] + 1; }
    if (k == 4) { invMagFit(s, g); }
    playerGunStats(); sfx(SND_EQUIP, 0);
    invSay(`${GNAME[g]}에 ${ANAME[ai]}을(를) 달았습니다`);
  } }
}
// how many of item it the player carries (ammo, meds, throwables)
function invCount(it) {
  let n = 0;
  if (it >= 31) { if (it <= 36) { n = ammoOf(1, it - 30); } }
  if (it == 46) { n = EBAND[1]; }
  if (it == 47) { n = EKIT[1]; }
  if (it == 48) { n = EMED[1]; }
  if (it == 49) { n = EDRK[1]; }
  if (it == 50) { n = EPILL[1]; }
  if (it == 51) { n = EFRAG[1]; }
  if (it == 52) { n = ESMK[1]; }
  return n;
}
function invDrop(it) {
  let n = 1;
  if (it <= 36) { n = Math.min(30, invCount(it)); ammoAdd(1, it - 30, 0 - n); }
  if (it == 46) { EBAND[1] = EBAND[1] - 1; }
  if (it == 47) { EKIT[1] = EKIT[1] - 1; }
  if (it == 48) { EMED[1] = EMED[1] - 1; }
  if (it == 49) { EDRK[1] = EDRK[1] - 1; }
  if (it == 50) { EPILL[1] = EPILL[1] - 1; }
  if (it == 51) { EFRAG[1] = EFRAG[1] - 1; }
  if (it == 52) { ESMK[1] = ESMK[1] - 1; }
  itemAdd(it, plX + sind(plYaw) * 80 + rand(-20, 20), plY + 2, plZ + cosd(plYaw) * 80 + rand(-20, 20), n);
  invSay(`${ITN[it]} ${n}개를 버렸습니다`);
}
// is ammunition t used by one of the guns
function ammoUsed(t) {
  let r = 0;
  if (EG1[1] > 0) { if (GAMMO[EG1[1]] == t) { r = 1; } }
  if (EG2[1] > 0) { if (GAMMO[EG2[1]] == t) { r = 1; } }
  if (EG3[1] > 0) { if (GAMMO[EG3[1]] == t) { r = 1; } }
  return r;
}
function invDropUnused() {
  let t = 1, n = 0;
  while (t <= 6) {
    if (ammoUsed(t) == 0) { if (ammoOf(1, t) > 0) { itemAdd(30 + t, plX + sind(plYaw) * 80 + rand(-30, 30), plY + 2, plZ + cosd(plYaw) * 80 + rand(-30, 30), ammoOf(1, t)); n = n + ammoOf(1, t); EAMMO[t] = 0; } }
    t = t + 1;
  }
  if (n > 0) { invSay(`안 쓰는 탄 ${n}발을 버렸습니다`); } else { invSay('버릴 탄이 없습니다'); }
}
// the two primary slots change places (what is in hand stays in hand)
function invSwap() {
  let g = EG1[1], a = EA1[1], m = EM1[1], f = fireMode[1];
  EG1[1] = EG2[1]; EA1[1] = EA2[1]; EM1[1] = EM2[1]; fireMode[1] = fireMode[2];
  EG2[1] = g; EA2[1] = a; EM2[1] = m; fireMode[2] = f;
  if (ECUR[1] == 1) { ECUR[1] = 2; } else { if (ECUR[1] == 2) { ECUR[1] = 1; } }
  if (invSel == 1) { invSel = 2; } else { if (invSel == 2) { invSel = 1; } }
  if (gunNow(1) == 0) { if (EG1[1] > 0) { ECUR[1] = 1; } }
  playerGunStats();
}
// how much gun class cl wants attachment ai (higher first): ATW[(cl - 1) * 15 + ai]. Muzzle: a sniper's or
// marksman's rifle the suppressor, the others the compensator; sight: the sniper 8x, the marksman and the
// rifles 4x, the short guns the red dot; grip: vertical, angled, laser; the big magazine; the tactical stock
let ATW = [1,3,2,3,2,1,1,1,3,2,1,2,1,2,1,1,3,2,3,2,1,1,1,3,2,1,2,1,2,1,1,3,2,3,2,4,5,1,3,2,1,2,1,2,1,3,2,1,2,1,4,5,3,3,2,1,2,1,2,1,3,2,1,2,1,3,4,5,3,2,1,2,1,2,1,1,3,2,3,2,1,1,1,3,2,1,2,1,2,1,1,3,2,3,2,4,5,1,3,2,1,2,1,2,1];
function attWant(cl, ai) { return ATW[(cl - 1) * 15 + ai]; }
// everything off, the better gun to slot 1, then each gun (the long ones first) takes the best it can
function invAuto() {
  let i = 1, s = 1, before = spareN();
  while (s <= 3) {
    let a = attOf(s), k = 1;
    while (k <= 5) { let ai = attIn(a, k); if (ai > 0) { INVA[ai] = INVA[ai] + 1; } k = k + 1; }
    setAtt(s, 0);
    s = s + 1;
  }
  if (EG2[1] > 0) { if (EG1[1] == 0 || GTIER[EG2[1]] > GTIER[EG1[1]]) { invSwap(); } }
  // order: a marksman's or sniper's rifle first (the scopes go to it)
  let o1 = 1, o2 = 2;
  if (EG2[1] > 0) { if (GCLS[EG2[1]] == 4 || GCLS[EG2[1]] == 5) { if (EG1[1] == 0 || GCLS[EG1[1]] < 4 || GCLS[EG1[1]] > 5) { o1 = 2; o2 = 1; } } }
  let n = 0, j = 1;
  while (j <= 3) {
    s = o1;
    if (j == 2) { s = o2; }
    if (j == 3) { s = 3; }
    let g = gunIn(s);
    if (g > 0) {
      let k = 1;
      while (k <= 5) {
        let best = 0, bw = 0;
        i = 1;
        while (i <= 15) {
          if (INVA[i] > 0) { if (ASLOT[i] == k) { if (attFits(g, i) == 1) { let w = attWant(GCLS[g], i); if (w > bw) { bw = w; best = i; } } } }
          i = i + 1;
        }
        if (best > 0) { INVA[best] = INVA[best] - 1; setAtt(s, attPut(attOf(s), k, best)); n = n + 1; }
        k = k + 1;
      }
      invMagFit(s, g);
    }
    j = j + 1;
  }
  playerGunStats(); sfx(SND_EQUIP, 0);
  invSay(`정리했습니다 · 총에 단 부착물 ${n}개 · 예비 ${spareN()}개`);
}

// ---------------------------------------------------------------- the screen
function xbtn(x0, y0) {
  hudBox(x0, y0, x0 + 10, y0 + 10, '#3a2428');
  hudLine(x0 + 2.5, y0 + 2.5, x0 + 7.5, y0 + 7.5, 1, '#ff8a7a'); hudLine(x0 + 2.5, y0 + 7.5, x0 + 7.5, y0 + 2.5, 1, '#ff8a7a');
}
function inBox(x0, y0, x1, y1) {
  let r = 0, mx = mouseX(), my = mouseY();
  if (mx > x0) { if (mx < x1) { if (my > y0) { if (my < y1) { r = 1; } } } }
  return r;
}
function invScreen(dt) {
  invMsgT = Math.max(0, invMsgT - dt);
  hurtT = Math.max(0, hurtT - dt);
  let clk = clickLatch;
  hudBox(-245, -140, 245, 140, '#0d1317');
  hudBox(-245, 118, 245, 140, '#131d25');
  hudBox(-245, 117, 245, 118, '#c89a2a');
  tx(1, '인벤토리', -236, 123, 11, C_W, 1);
  tx(2, '칸을 누르면 빼기 · 예비 부착물을 누르면 고른 총에 달기 · X 버리기 · Tab 닫기', 236, 129, 6, C_DIM, 2);
  let hs = `체력 ${Math.round(Math.max(0, EHP[1]))}   부스트 ${Math.round(EBOOST[1])}   생존 ${alive}`;
  let hc = C_DIM;
  if (hurtT > 0) { hs = `${hs}   공격받는 중!`; hc = C_RED; }
  tx(3, hs, 236, 121, 7, hc, 2);
  // the guns
  let s = 1;
  while (s <= 3) {
    let top = 112 - (s - 1) * 66, g = gunIn(s), a = attOf(s);
    let bg = '#172027';
    if (invSel == s) { bg = '#22303a'; }
    hudBox(-238, top - 62, -32, top, bg);
    if (invSel == s) { hudBox(-238, top - 1.2, -32, top, '#c89a2a'); }
    let hd = `${s}  비어 있음`;
    if (s == 3) { hd = '3  권총 칸 · 비어 있음'; }
    if (g > 0) {
      let m = EM1[1];
      if (s == 2) { m = EM2[1]; }
      if (s == 3) { m = EM3[1]; }
      hd = `${s}  ${GNAME[g]}   ${m} / ${ammoOf(1, GAMMO[g])}  ${AMNAME[GAMMO[g]]}`;
      if (ECUR[1] == s) { hd = `${hd}  (손에 듦)`; }
    }
    let hcol = C_DIM;
    if (g > 0) { hcol = C_W; }
    tx(3 + s, hd, -232, top - 9, 7.5, hcol, 1);
    if (clk == 1) { if (inBox(-238, top - 16, -32, top) == 1) { invSel = s; } }
    let k = 1;
    while (k <= 5) {
      let x0 = -233 + (k - 1) * 40, y0 = top - 58, ai = attIn(a, k);
      let can = 0;
      if (g > 0) { if (attCount(g, k) > 0) { can = 1; } }
      let bc = '#11181d';
      if (can == 1) { bc = '#1d2830'; }
      if (ai > 0) { bc = '#2e4050'; }
      hudBox(x0, y0, x0 + 37, y0 + 36, bc);
      let slot = 6 + (s - 1) * 5 + k;
      if (ai > 0) { tx(slot, ASH[ai], x0 + 18.5, y0 + 15, 7, C_W, 0); hudBox(x0, y0, x0 + 37, y0 + 2, '#c89a2a'); }
      else { if (can == 1) { tx(slot, SLOTS[k], x0 + 18.5, y0 + 15, 6, '#5d6c78', 0); } else { tx(slot, '-', x0 + 18.5, y0 + 15, 6, '#3a4650', 0); } }
      if (clk == 1) { if (inBox(x0, y0, x0 + 37, y0 + 36) == 1) { invSel = s; if (ai > 0) { invDetach(s, k); } } }
      k = k + 1;
    }
    s = s + 1;
  }
  if (btn(-238, -100, -32, -86, 34, '자동 정리 (좋은 부착물을 좋은 총에)', 1, 7) == 1) { invAuto(); }
  if (btn(-238, -118, -136, -104, 35, '1 · 2 바꾸기', 0, 7) == 1) { invSwap(); invSay('1번과 2번 총을 바꿨습니다'); }
  if (btn(-133, -118, -32, -104, 33, '안 쓰는 탄 버리기', 0, 7) == 1) { invDropUnused(); }
  // the spare attachments
  hudBox(-26, -136, 94, 112, '#141c22');
  tx(22, `예비 부착물 ${spareN()}개`, -20, 104, 8, '#c8b48a', 1);
  let i = 1, row = 0;
  while (i <= 15) {
    if (INVA[i] > 0) { if (row < 10) {
      row = row + 1;
      let y1 = 96 - (row - 1) * 14;
      let fit = 0;
      if (attFits(gunIn(invSel), i) == 1) { fit = 1; }
      let lb = `${ANAME[i]} x${INVA[i]}`;
      if (btn(-22, y1 - 12, 76, y1, 22 + row, lb, fit, 6.5) == 1) { invEquip(i); }
      xbtn(79, y1 - 11);
      if (clk == 1) { if (inBox(79, y1 - 11, 89, y1 - 1) == 1) { INVA[i] = INVA[i] - 1; itemAdd(NGUN + i, plX + sind(plYaw) * 80, plY + 2, plZ + cosd(plYaw) * 80, 1); invSay(`${ANAME[i]}을(를) 버렸습니다`); } }
    } }
    i = i + 1;
  }
  while (row < 10) { row = row + 1; txOff(22 + row); }
  if (spareN() == 0) { tx(23, '없음 · 맞는 총이 없는 부착물을 주우면 여기로', -20, 90, 5.5, '#5d6c78', 1); }
  else { tx(52, '노란 칸: 고른 총에 맞음', -20, -128, 5.5, '#5d6c78', 1); }
  // the backpack
  hudBox(100, -136, 238, 112, '#141c22');
  let ld = loadOf(1), cp = capOf(1);
  tx(36, `가방 ${EPACK[1]}레벨 · 무게 ${Math.round(ld)} / ${cp}`, 106, 104, 8, '#c8b48a', 1);
  hudBox(106, 92, 232, 95, '#28333c');
  let wc = '#7fd07f';
  if (ld > cp * 0.85) { wc = '#ff9a40'; }
  hudBox(106, 92, 106 + 126 * Math.min(1, ld / cp), 95, wc);
  let n = 0, it = 31;
  while (it <= 52) {
    let ok = 0;
    if (it <= 36) { ok = 1; }
    if (it >= 46) { ok = 1; }
    if (ok == 1) { if (invCount(it) > 0) { if (n < 13) { n = n + 1; INVROW[n] = it; } } }
    it = it + 1;
  }
  let r = 1;
  while (r <= 13) {
    if (r <= n) {
      let it2 = INVROW[r], y1 = 86 - (r - 1) * 13;
      let col = C_W, lb = `${ITN[it2]}   ${invCount(it2)}`;
      if (it2 <= 36) { if (ammoUsed(it2 - 30) == 1) { col = C_GOLD; } else { col = '#7a8690'; lb = `${lb}  (안 씀)`; } }
      tx(36 + r, lb, 108, y1 - 8, 7, col, 1);
      xbtn(222, y1 - 11);
      if (clk == 1) { if (inBox(222, y1 - 11, 232, y1 - 1) == 1) { invDrop(it2); } }
    } else { txOff(36 + r); }
    r = r + 1;
  }
  if (n == 0) { tx(37, '비어 있음', 108, 78, 7, '#5d6c78', 1); }
  tx(50, `헬멧 ${EHEL[1]}레벨   조끼 ${EVES[1]}레벨`, 106, -122, 7, C_SKY, 1);
  if (invMsgT > 0) { tx(51, invMsg, -135, -131, 6, C_GOLD, 0); } else { txOff(51); }
}
