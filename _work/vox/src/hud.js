// ===================================================================== text
// One text object `txt` clones itself NTX times; clone k shows slot k of the TX* lists and
// redraws only when the slot's version moves. Monospace: centre / right from the advance.
let txt$slot = 0;
let txt$v = 0 - 1;
let TXS = [], TXX = [], TXY = [], TXZ = [], TXC = [], TXV = [];
const TXW = 1000, TXH = 28, TXF = 20, TXCW = 0.5, BLANK = '​';
const TXSZ = (TXW + TXH) / 2 / TXF;
const ASCII = ' !"#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~';
let txUsed = 0;
function emOf(s) {
  let n = strlen(s), w = 0, i = 1;
  while (i <= n) { if (indexOf(ASCII, charAt(s, i)) > 0) { w = w + 1; } else { w = w + 2; } i = i + 1; }
  return w * TXCW;
}
// x, y: anchor; sz: font px; al: 0 centre, 1 left, 2 right
function tx(i, s, x, y, sz, col, al) {
  let gx = x;
  if (al != 1) {
    let w = emOf(s) * sz;
    if (al == 0) { gx = x - w / 2; } else { gx = x - w; }
  }
  gx = gx + TXW / 2 * sz / TXF;
  let ch = 0;
  if (TXS[i] != s) { TXS[i] = s; ch = 1; }
  if (TXX[i] != gx) { TXX[i] = gx; ch = 1; }
  if (TXY[i] != y) { TXY[i] = y; ch = 1; }
  if (TXZ[i] != sz) { TXZ[i] = sz; ch = 1; }
  if (TXC[i] != col) { TXC[i] = col; ch = 1; }
  if (ch > 0) { TXV[i] = TXV[i] + 1; }
}
function txOff(i) {
  if (TXS[i] != BLANK) { TXS[i] = BLANK; TXV[i] = TXV[i] + 1; }
}
function txClear() {
  let i = 1;
  while (i <= NTX) { txOff(i); i = i + 1; }
}
on('start', 'txt', function () {
  hide();
  let k = 1;
  while (k <= NTX) {
    TXS.push(BLANK); TXX.push(0); TXY.push(0); TXZ.push(TXF); TXC.push('#ffffff'); TXV.push(0);
    k = k + 1;
  }
  k = 1;
  while (k <= NTX) { txt$slot = k; cloneSelf(); k = k + 1; }
  txt$slot = 0;
});
on('clone', 'txt', function () {
  show();
  for (;;) {
    if (TXV[txt$slot] != txt$v) {
      txt$v = TXV[txt$slot];
      write(TXS[txt$slot]);
      textColorHex(TXC[txt$slot]);
      setSize(TXZ[txt$slot] * TXSZ);
      goto(TXX[txt$slot], TXY[txt$slot]);
    }
  }
});

// ---------------------------------------------------------------- pen helpers
function M_box(x0, y0, x1, y1, col) {
  fillStop(); goto(x0, y0); fillColorHex(col); fillStart(); goto(x1, y0); goto(x1, y1); goto(x0, y1);
}
function box(x0, y0, x1, y1, col) { M_box(x0, y0, x1, y1, col); }
// a framed panel in the grey of block-game windows
function panel(x0, y0, x1, y1) {
  box(x0 - 1, y0 + 1, x1 + 1, y1 - 1, '#1e1e1e');
  box(x0, y0, x1, y1, '#c6c6c6');
  box(x0, y0, x1 - 2, y0 - 2, '#ffffff');
  box(x0, y0, x0 + 2, y1 + 2, '#ffffff');
  box(x1 - 2, y0 - 2, x1, y1, '#555555');
  box(x0 + 2, y1 + 2, x1, y1, '#555555');
}
function slotBox(cx, cy) {
  box(cx - 9, cy + 9, cx + 9, cy - 9, '#8b8b8b');
  box(cx - 9, cy + 9, cx + 8, cy + 8, '#373737');
  box(cx - 9, cy + 9, cx - 8, cy - 8, '#373737');
  box(cx + 8, cy + 8, cx + 9, cy - 9, '#ffffff');
  box(cx - 8, cy - 8, cx + 9, cy - 9, '#ffffff');
}
// a button: hovered when the pointer is over it
let btnHot = 0;
function button(x0, y0, x1, y1, label, ti, on) {
  btnHot = 0;
  let mx = mouseX(), my = mouseY();
  if (mx >= x0 && mx <= x1 && my <= y0 && my >= y1) { btnHot = 1; }
  let c = '#6f6f6f';
  if (btnHot == 1) { c = '#7f8fc8'; }
  if (on == 0) { c = '#3c3c3c'; btnHot = 0; }
  box(x0, y0, x1, y1, '#000000');
  box(x0 + 1, y0 - 1, x1 - 1, y1 + 1, c);
  box(x0 + 1, y0 - 1, x1 - 1, y0 - 3, '#a8a8a8');
  box(x0 + 1, y1 + 3, x1 - 1, y1 + 1, '#4a4a4a');
  let tc = '#e0e0e0';
  if (btnHot == 1) { tc = '#ffffa0'; }
  if (on == 0) { tc = '#8a8a8a'; }
  tx(ti, label, (x0 + x1) / 2, (y0 + y1) / 2 + 1, 9, tc, 0);
}

// ---------------------------------------------------------------- item pictures
// the rects of a picture (8 x 8, u right, v down) at (x, y) top-left, s px a pixel, brightness k
function iconRects(r, re, x, y, s, k) {
  let u0 = 0;
  while (r < re) {
    u0 = x + RU0[r] * s;
    M_box(u0, y - RV0[r] * s, x + RU1[r] * s, y - RV1[r] * s, CT[RCOL[r] + k * 8 + 1]);
    r = r + 1;
  }
}
// rects on a parallelogram: o + e * u/8 + f * v/8
function faceRects(t, ox, oy, ex, ey, fx, fy, k) {
  let tb = TBASE[t];
  if (tb >= 0) {
    fillStop(); goto(ox, oy); fillColorHex(CT[tb + k * 8 + 1]); fillStart(); goto(ox + ex, oy + ey); goto(ox + ex + fx, oy + ey + fy); goto(ox + fx, oy + fy);
  }
  let r = TR0[t], re = r + TRN[t], u0 = 0, v0 = 0, u1 = 0, v1 = 0;
  // s8 1: the few biggest rects only; 3: none (but a see-through texture is only its rects)
  if (s8 == 1) { re = r + TRF[t]; }
  if (s8 == 3) { if (tb >= 0) { re = r; } else { re = r + TRF[t]; } }
  while (r < re) {
    u0 = RU0[r] / 8; v0 = RV0[r] / 8; u1 = RU1[r] / 8; v1 = RV1[r] / 8;
    fillStop(); goto(ox + ex * u0 + fx * v0, oy + ey * u0 + fy * v0); fillColorHex(CT[RCOL[r] + k * 8 + 1]); fillStart();
    goto(ox + ex * u1 + fx * v0, oy + ey * u1 + fy * v0); goto(ox + ex * u1 + fx * v1, oy + ey * u1 + fy * v1); goto(ox + ex * u0 + fx * v1, oy + ey * u0 + fy * v1);
    r = r + 1;
  }
}
let s8 = 0;
// an item's picture centred at (x, y), about 2 * s wide
function drawIcon(id, x, y, s) {
  if (id > 0) {
    if (ITISO[id + 1] == 1) {
      // a block: three faces of a cube
      let h = s * 0.87, q = s * 0.5;
      faceRects(BTT[id + 1], x - h, y + q, h, q, h, 0 - q, 23);
      let keep = s8;
      if (s8 == 1) { s8 = 3; }
      faceRects(BTS[id + 1], x - h, y + q, h, 0 - q, 0, 0 - s, 18);
      faceRects(BTS[id + 1], x, y, h, q, 0, 0 - s, 14);
      s8 = keep;
    } else {
      iconRects(IC0[id + 1], IC0[id + 1] + ICN[id + 1], x - s, y + s, s / 4, 23);
    }
  }
}
// an item in a slot: picture, count, wear bar
function slotItem(cx, cy, id, n, d, ti) {
  if (id > 0) {
    drawIcon(id, cx, cy, 7);
    if (ITDUR[id + 1] > 0) { if (d > 0) {
      let f = 1 - d / ITDUR[id + 1];
      box(cx - 7, cy - 6, cx + 7, cy - 8, '#000000');
      let c = '#40e040';
      if (f < 0.5) { c = '#e0e040'; } if (f < 0.2) { c = '#e04040'; }
      box(cx - 7, cy - 6, cx - 7 + 14 * f, cy - 7, c);
    } }
  }
  if (ti > 0) {
    if (n > 1) { tx(ti, `${n}`, cx + 9, cy - 3, 7, '#ffffff', 2); } else { txOff(ti); }
  }
}

// ---------------------------------------------------------------- the game's HUD
let msgText = '', msgT = 0, nameT = 0, nameShown = 0, showDbg = 0, lastHot = 0;
function msgShow(s, t) { msgText = s; msgT = t; }
function drawHud(dt) {
  fillStop();
  // the cross in the middle
  box(-6, 0.7, 6, -0.7, '#e8e8e8');
  box(-0.7, 6, 0.7, -6, '#e8e8e8');
  // the hotbar
  let x0 = -91, y0 = -116, k = 1;
  box(x0 - 1, y0 + 12, x0 + 183, y0 - 12, '#000000');
  box(x0, y0 + 11, x0 + 182, y0 - 11, '#6b6b6b');
  s8 = 1;
  while (k <= 9) {
    let cx = x0 + 11 + (k - 1) * 20;
    box(cx - 9, y0 + 9, cx + 9, y0 - 9, '#8b8b8b');
    slotItem(cx, y0, INVI[k], INVN[k], INVD[k], k);
    k = k + 1;
  }
  s8 = 0;
  let sx = x0 + 11 + (hotSel - 1) * 20;
  box(sx - 12, y0 + 12, sx + 12, y0 + 10, '#ffffff'); box(sx - 12, y0 - 10, sx + 12, y0 - 12, '#ffffff');
  box(sx - 12, y0 + 12, sx - 10, y0 - 12, '#ffffff'); box(sx + 10, y0 + 12, sx + 12, y0 - 12, '#ffffff');
  if (gameMode == 0) {
    // armour over the hearts (a plate a point pair)
    let def = armorDef();
    if (def > 0) {
      let j = 0;
      while (j < 10) {
        let ax = x0 + j * 8 + 4, ay = y0 + 29;
        if (def >= j * 2 + 1) {
          box(ax - 3, ay + 3, ax + 3, ay - 3, '#202020');
          let c = '#d8d8d8';
          if (def == j * 2 + 1) { c = '#8a8a8a'; }
          box(ax - 2, ay + 2, ax + 2, ay - 2, c);
        }
        j = j + 1;
      }
    }
    // hearts (left) and food (right), two halves each
    let i = 0;
    while (i < 10) {
      let hx = x0 + i * 8 + 4, fx = x0 + 182 - i * 8 - 4, hy = y0 + 20;
      iconRects(HI0[1], HI0[1] + HIN[1], hx - 4, hy + 4, 1, 23);
      if (hp >= i * 2 + 2) { iconRects(HI0[2], HI0[2] + HIN[2], hx - 4, hy + 4, 1, 23); }
      else { if (hp == i * 2 + 1) { iconRects(HI0[3], HI0[3] + HIN[3], hx - 4, hy + 4, 1, 23); } }
      iconRects(HI0[4], HI0[4] + HIN[4], fx - 4, hy + 4, 1, 23);
      if (food >= i * 2 + 2) { iconRects(HI0[5], HI0[5] + HIN[5], fx - 4, hy + 4, 1, 23); }
      else { if (food == i * 2 + 1) { iconRects(HI0[6], HI0[6] + HIN[6], fx - 4, hy + 4, 1, 23); } }
      if (headWater == 1 || air < 300) {
        if (air > i * 30) { iconRects(HI0[7], HI0[7] + HIN[7], fx - 4, hy + 13, 1, 23); }
      }
      i = i + 1;
    }
  }
  // the name of what was just taken in hand
  if (INVI[hotSel] != lastHot) { lastHot = INVI[hotSel]; nameT = 2; }
  nameT = nameT - dt;
  if (nameT > 0) { if (INVI[hotSel] > 0) { tx(10, ITNAME[INVI[hotSel] + 1], 0, y0 + 40, 9, '#ffffff', 0); } else { txOff(10); } } else { txOff(10); }
  // the warden's life across the top
  let showB = 0;
  if (dim == 2) { if (bossDead == 0) { if (bossE > 0) { if (ET[bossE] == 10) { showB = 1; } } } }
  if (showB == 1) {
    box(-101, 127, 101, 121, '#000000');
    box(-100, 126, -100 + 200 * Math.max(0, EHP[bossE]) / MHP[10], 122, '#c040ff');
    tx(93, `공허의 수호자 · 남은 수호 수정 ${nCrystal}`, 0, 134, 7, '#f0e0ff', 0);
  } else { txOff(93); }
  if (winT > 0) { winT = winT - dt; tx(94, '승리!', 0, 70, 22, '#ffe880', 0); tx(95, '공허의 수호자를 쓰러뜨렸습니다 · 수호자의 심장을 주워 가세요', 0, 48, 8, '#ffffff', 0); }
  else { txOff(94); txOff(95); }
  msgT = msgT - dt;
  if (msgT > 0) { tx(11, msgText, 0, 40, 9, '#ffff80', 0); } else { txOff(11); }
  if (showDbg == 1) {
    let bn = BNAMES[BIOM[wcol(Math.floor(px), Math.floor(pz))] + 1];
    tx(12, `XYZ ${Math.floor(px * 10) / 10} / ${Math.floor(py * 10) / 10} / ${Math.floor(pz * 10) / 10}  ${bn}`, -236, 128, 7, '#ffffff', 1);
    tx(13, `FPS ${fpsShow} (k${kStep})  청크 ${nChunks}  면 ${nFace}/${nScan}  칠 ${nFill}  구역 ${nVS}  시야 ${viewR}`, -236, 118, 7, '#ffffff', 1);
    let li = lightAt(px, py + 1, pz);
    tx(14, `빛 ${li}  시각 ${timeText()}  시드 ${seed}  몹 ${nHostile}/${nPassive}`, -236, 108, 7, '#ffffff', 1);
  } else { txOff(12); txOff(13); txOff(14); }
}
function timeText() {
  let m = Math.floor(tday * 1440 + 360);
  m = mod(m, 1440);
  let h = idiv(m, 60), mm = mod(m, 60);
  let s = `${h}:`;
  if (mm < 10) { s = `${s}0`; }
  return `${s}${mm}`;
}
// the hand, or the block / tool in it, low right; it swings when used
function drawHand() {
  let sw = 0;
  if (swingT > 0) { sw = sind(swingT / 0.3 * 180); }
  let bx = 150 - sw * 40 + sind(bob * 57) * 4, by = -100 - sw * 20 + Math.abs(cosd(bob * 57)) * 3;
  let id = INVI[hotSel];
  let lv = lightAt(px, py + 1.6, pz);
  let k = BIDX[lv * 8 + 3 + 1];
  if (id == 0) {
    // an arm
    fillStop(); goto(bx - 20, by + 40); fillColorHex(CT[CSKIN + k * 8 + 1]); fillStart(); goto(bx + 14, by + 34); goto(bx + 40, by - 60); goto(bx - 2, by - 60);
    fillStop(); goto(bx - 20, by + 40); fillColorHex(CT[CSKIN + Math.max(0, k - 4) * 8 + 1]); fillStart(); goto(bx - 2, by - 60); goto(bx - 14, by - 60); goto(bx - 28, by + 30);
  } else {
    if (ITISO[id + 1] == 1) {
      let s = 34, h = s * 0.87, q = s * 0.5, x = bx - 10, y = by + 10;
      faceRects(BTT[id + 1], x - h, y + q, h, q, h, 0 - q, k);
      faceRects(BTS[id + 1], x - h, y + q, h, 0 - q, 0, 0 - s, Math.max(0, k - 4));
      faceRects(BTS[id + 1], x, y, h, q, 0, 0 - s, Math.max(0, k - 8));
    } else {
      iconRects(IC0[id + 1], IC0[id + 1] + ICN[id + 1], bx - 40, by + 50, 8, k);
    }
  }
}

// ---------------------------------------------------------------- screens
// the slot under the pointer for the open screen (0 none) and its centre
let slX = 0, slY = 0;
function slotXY(s) {
  if (s <= 9) { slX = -72 + (s - 1) * 18; slY = -78; }
  else { if (s <= 36) { slX = -72 + mod(s - 10, 9) * 18; slY = -18 - idiv(s - 10, 9) * 18; }
  else { if (s <= 40) { slX = -72; slY = 66 - (s - 37) * 18; }
  else { if (s <= 49) {
    let k = s - 41;
    if (cgSize == 2) { slX = 6 + mod(k, 2) * 18; slY = 62 - idiv(k, 2) * 18; }
    else { slX = -52 + mod(k, 3) * 18; slY = 66 - idiv(k, 3) * 18; }
  } else { if (s == 50) { if (cgSize == 2) { slX = 66; slY = 53; } else { slX = 40; slY = 48; } }
  else { if (s == 51) { slX = -24; slY = 66; } else { if (s == 52) { slX = -24; slY = 30; } else { if (s == 53) { slX = 36; slY = 48; }
  else { if (s <= 87) { slX = -72 + mod(s - 61, 9) * 18; slY = 66 - idiv(s - 61, 9) * 18; }
  else { slX = -72 + mod(s - 101, 9) * 18; slY = 70 - idiv(s - 101, 9) * 18; } } } } } } } } }
}
// is slot s part of the screen now?
function slotIn(s) {
  let r = 0;
  if (s <= 36) { r = 1; }
  if (s >= 37 && s <= 40) { if (uiMode == 1) { r = 1; } else { r = 0; } }
  if (s >= 41 && s <= 49) { if (uiMode == 1) { if (s - 40 <= 4) { r = 1; } } if (uiMode == 2) { r = 1; } }
  if (s == 50) { if (uiMode == 1 || uiMode == 2) { r = 1; } }
  if (s >= 51 && s <= 53) { if (uiMode == 3) { r = 1; } }
  if (s >= 61 && s <= 87) { if (uiMode == 4) { r = 1; } }
  if (s >= 101 && s <= 136) { if (uiMode == 5) { r = 1; } }
  if (uiMode == 5) { if (s >= 10 && s <= 36) { r = 0; } }
  return r;
}
let SLOTS = [];
function slotsInit() {
  SLOTS = [];
  let s = 1;
  while (s <= 40) { SLOTS.push(s); s = s + 1; }
  s = 41; while (s <= 53) { SLOTS.push(s); s = s + 1; }
  s = 61; while (s <= 87) { SLOTS.push(s); s = s + 1; }
  s = 101; while (s <= 136) { SLOTS.push(s); s = s + 1; }
}
function invScreen() {
  // the world dims behind
  penAlpha(45); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0);
  fillStop();
  let top = 92, title = '제작';
  if (uiMode == 2) { title = '작업대'; }
  if (uiMode == 3) { title = '화로'; }
  if (uiMode == 4) { title = '상자'; }
  if (uiMode == 5) { title = `크리에이티브 (${uiPage + 1}/${Math.ceil(PAL.length / 36)})  ← → 쪽 넘기기`; }
  panel(-88, top, 88, -94);
  tx(20, title, -80, top - 6, 8, '#404040', 1);
  if (uiMode <= 4) { tx(21, '소지품', -80, 0, 8, '#404040', 1); } else { txOff(21); }
  let i = 1, s = 0, ti = 22, hov = 0;
  let mx = mouseX(), my = mouseY();
  while (i <= SLOTS.length) {
    s = SLOTS[i];
    if (slotIn(s) == 1) {
      slotXY(s);
      slotBox(slX, slY);
      if (mx >= slX - 9 && mx < slX + 9 && my <= slY + 9 && my > slY - 9) {
        hov = s;
        box(slX - 8, slY + 8, slX + 8, slY - 8, '#a8a8a8');
      }
      slotGet(s);
      slotItem(slX, slY, gI, gN, gD, ti);
      ti = ti + 1;
    }
    i = i + 1;
  }
  while (ti <= 90) { txOff(ti); ti = ti + 1; }
  // arrows, the fire
  if (uiMode == 1) { box(42, 55, 52, 51, '#8b8b8b'); fillStop(); goto(52, 59); fillColorHex('#8b8b8b'); fillStart(); goto(58, 53); goto(52, 47); }
  if (uiMode == 2) { box(16, 50, 26, 46, '#8b8b8b'); fillStop(); goto(26, 54); fillColorHex('#8b8b8b'); fillStart(); goto(32, 48); goto(26, 42); }
  if (uiMode == 3) {
    let p = FUP[curFur] / SMELTT;
    box(0, 50, 22, 46, '#8b8b8b');
    if (p > 0) { box(0, 50, 22 * p, 46, '#ffffff'); }
    let fl = 0;
    if (FUBM[curFur] > 0) { fl = FUB[curFur] / FUBM[curFur]; }
    box(-30, 56, -18, 40, '#8b8b8b');
    if (fl > 0) { box(-30, 40 + 16 * fl, -18, 40, '#f08020'); box(-27, 40 + 10 * fl, -21, 40, '#f8e040'); }
  }
  // what is on the cursor follows it; the name of what is under it
  if (curI > 0) { slotItem(mx, my, curI, curN, curD, 91); } else { txOff(91); }
  if (hov > 0) {
    slotGet(hov);
    if (gI > 0) {
      if (curI == 0) {
        let nm = ITNAME[gI + 1];
        let w = emOf(nm) * 8 + 8;
        box(mx + 10, my + 14, mx + 10 + w, my + 2, '#100010');
        tx(92, nm, mx + 14, my + 11, 8, '#ffffff', 1);
      } else { txOff(92); }
    } else { txOff(92); }
  } else { txOff(92); }
  uiHover = hov;
}
let uiHover = 0;

// a dark screen with a big title and buttons: pause, death, title
let menuSel = 0;
function pauseScreen() {
  penAlpha(40); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0);
  tx(20, '게임 메뉴', 0, 92, 14, '#ffffff', 0);
  menuSel = 0;
  button(-90, 70, 90, 50, '게임으로 돌아가기', 21, 1); if (btnHot == 1) { menuSel = 1; }
  button(-90, 44, 90, 24, `시야 거리: ${viewR} 블록`, 22, 1); if (btnHot == 1) { menuSel = 2; }
  button(-90, 18, 90, -2, `마우스 감도: ${Math.round(sens * 100)}%`, 23, 1); if (btnHot == 1) { menuSel = 3; }
  let gm = '서바이벌';
  if (gameMode == 1) { gm = '크리에이티브'; }
  button(-90, -8, 90, -28, `게임 모드: ${gm}`, 24, 1); if (btnHot == 1) { menuSel = 4; }
  let so = '끔';
  if (sndOn == 1) { so = '켬'; }
  button(-90, -34, 90, -54, `소리: ${so}`, 25, 1); if (btnHot == 1) { menuSel = 5; }
  button(-90, -66, 90, -86, '타이틀 화면으로', 26, 1); if (btnHot == 1) { menuSel = 6; }
  tx(27, '시야·감도는 왼쪽(좌반)·오른쪽(우반)을 눌러 줄이기·늘리기', 0, -100, 7, '#c0c0c0', 0);
}
function deathScreen() {
  penAlpha(30); box(-245, 140, 245, -140, '#a00000'); fillStop(); penAlpha(0);
  tx(20, '죽었습니다!', 0, 60, 18, '#ffffff', 0);
  tx(21, deathMsg, 0, 30, 9, '#ffffff', 0);
  menuSel = 0;
  button(-90, 0, 90, -20, '다시 태어나기', 22, 1); if (btnHot == 1) { menuSel = 1; }
  button(-90, -28, 90, -48, '타이틀 화면으로', 23, 1); if (btnHot == 1) { menuSel = 2; }
}
