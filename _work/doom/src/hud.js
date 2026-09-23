// ============================================================
// HUD, screens and the helper objects
//  hud: status bar numbers / keys / arms / messages (stamps, redrawn when dirty)
//  face, weapon, flash, overlay (palette flash), sky, screen (title, menu,
//  intermission), automap
// Doom's 320x200 screen maps to the 480x270 stage: x*1.5, y*1.35
// ============================================================
const SX = 1.5, SY = 1.35;
let hudDirty = 1, hudAge = 0, msgText = '', msgTime = 0, msgShown = '';
let faceCos = 0, faceTimer = 0, faceGrin = 0, faceHurt = 0, faceLook = 0, faceRamp = 0;
let wpnCos = 0, wpnX = 0, wpnY = -400, flCos = 0, flX = 0, flY = -400;
let skyX = 0, ovRed = 0, ovGold = 0;
let gameState = 0, skill = 3, menuSel = 2, scrDirty = 1, keyWait = 0, amOn = 0, amKeyHeld = 0;
let wiTimer = 0, wiKills = 0, wiItems = 0, wiSecrets = 0, wiTime = 0, wiStage = 0;
let lvlTics = 0;

function playSound(s) {
  if (s != '') { sound(s); }
}

// ---- patch drawing (hud / screen stampers) ----
// top-left of a patch at doom (x, y) minus its offsets
function hudPatch(pic, x, y) {
  costume(pic);
  goto((x - hpLX[pic] + hpW[pic] / 2 - 160) * SX, 135 - (y - hpTY[pic] + hpH[pic] / 2) * SY);
  stamp();
}
// STlib_drawNum: right-aligned at x, digits of the given font (first = '0' costume)
function hudNum(n, x, y, first, digits) {
  let v = Math.floor(n);
  let w = hpW[first];
  if (v < 0) { v = 0; }
  if (v == 0) { hudPatch(first, x - w, y); }
  let k = 0;
  while (v > 0 && k < digits) {
    x = x - w;
    hudPatch(first + mod(v, 10), x, y);
    v = Math.floor(v / 10);
    k = k + 1;
  }
}
// HU font text at doom (x, y)
function hudText(t, x, y) {
  let i = 1, n = strlen(t);
  while (i <= n) {
    let ch = charAt(t, i);
    let g = 0;
    if (ch != ' ') { g = indexOf(FONTSTR, ch); }
    if (g > 0) {
      let pic = fontGlyph[g];
      hudPatch(pic, x, y);
      x = x + hpW[pic];
    } else { x = x + 4; }
    i = i + 1;
  }
}

function hudDraw() {
  eraseAll();
  let a = wpAmmo[plWeapon];
  if (a > 0) { hudNum(plAmmo[a], 44, 171, HP_STTNUM0, 3); }
  hudNum(plHealth, 90, 171, HP_STTNUM0, 3);
  hudPatch(HP_STTPRCNT, 90, 171);
  // arms 2..7
  let i = 0;
  while (i < 6) {
    let fnt = HP_STGNUM0;
    if (plOwned[i + 2] == 1) { fnt = HP_STYSNUM0; }
    hudPatch(fnt + i + 2, 111 + mod(i, 3) * 12, 172 + Math.floor(i / 3) * 10);
    i = i + 1;
  }
  hudNum(plArmor, 221, 171, HP_STTNUM0, 3);
  hudPatch(HP_STTPRCNT, 221, 171);
  i = 1;
  while (i <= 3) {
    if (plKeys[i] == 1) { hudPatch(HP_STKEYS0 + i - 1, 239, 171 + (i - 1) * 10); }
    i = i + 1;
  }
  i = 1;
  while (i <= 4) {
    hudNum(plAmmo[i], 288, 173 + (i - 1) * 6, HP_STYSNUM0, 3);
    hudNum(plMaxAmmo[i], 314, 173 + (i - 1) * 6, HP_STYSNUM0, 3);
    i = i + 1;
  }
  if (msgTime > 0) { hudText(msgText, 0, 0); }
  goto(0, -400);
}

// face (ST_updateFaceWidget, simplified): called every tic
function faceThink() {
  let p = 4 - Math.floor(plHealth / 20);
  if (p < 0) { p = 0; }
  if (p > 4) { p = 4; }
  let base = HP_FACE0 + p * 8;
  if (plHealth <= 0) { faceCos = HP_STFDEAD0; }
  else {
    if (faceHurt > 0) {
      if (faceHurt > 20) { faceCos = base + 5; faceTimer = 35; }
      else {
        faceCos = base + 7;
        if (plAttacker > 0 && plAttacker != plMo) {
          pointAngle(mX[plAttacker] - plX, mY[plAttacker] - plY);
          let d = mod(angResult - plAng + 180, 360) - 180;
          if (d > 30) { faceCos = base + 4; }
          if (d < -30) { faceCos = base + 3; }
        }
        faceTimer = 35;
      }
      faceHurt = 0;
    } else {
      if (faceGrin > 0) { faceCos = base + 6; faceGrin = faceGrin - 1; faceTimer = 1; }
      else {
        if (inFire == 1) { faceRamp = faceRamp + 1; } else { faceRamp = 0; }
        if (faceRamp > 70) { faceCos = base + 7; faceTimer = 1; }
        faceTimer = faceTimer - 1;
        if (faceTimer <= 0) {
          faceLook = rand(0, 2);
          faceCos = base + faceLook;
          faceTimer = 17 + rand(0, 35);
        }
      }
    }
    if (faceTimer > 0 && faceCos < HP_FACE0) { faceCos = base; }
  }
}

// weapon / flash sprites (psprites) -> costume + position globals
function pspriteView() {
  let lv = 0;
  let e = secLight[plSec] + extraLight * 16;
  if (e < 168) { lv = 1; if (e < 112) { lv = 2; } }
  wpnY = -400; flY = -400;
  if (psState > 0 && amOn == 0) {
    let pic = stWpn[psState];
    if (pic > 0) {
      wpnCos = pic + lv;
      wpnX = (psSX - wpLX[pic] + wpW[pic] / 2 - 160) * SX;
      wpnY = 135 - (psSY - wpTY[pic] + wpH[pic] / 2) * SY;
    }
  }
  if (flState > 0 && amOn == 0) {
    let pic = stWpn[flState];
    if (pic > 0) {
      flCos = pic;
      flX = (psSX - wpLX[pic] + wpW[pic] / 2 - 160) * SX;
      flY = 135 - (psSY - wpTY[pic] + wpH[pic] / 2) * SY;
    }
  }
  // sky: 1024 texture columns per turn, texel = 1.875 px (see build)
  skyX = (mod(vang * 1024 / 360 - SKYC + 128, 256) - 128) * 1.875;
  // palette flashes (P_PlayerThink / ST_doPaletteStuff)
  ovRed = 0; ovGold = 0;
  if (plDamageCount > 0) { ovRed = plDamageCount; if (ovRed > 70) { ovRed = 70; } plDamageCount = plDamageCount - 1; }
  if (plBonusCount > 0) { ovGold = plBonusCount * 3; if (ovGold > 30) { ovGold = 30; } plBonusCount = plBonusCount - 1; }
}

on('start', 'hud', function () {
  goto(0, -400);
  for (;;) {
    if (gameState == 2) {
      if (msgTime > 0) {
        msgTime = msgTime - 1;
        if (msgTime == 0) { hudDirty = 1; }
      }
      if (msgText != msgShown) { msgShown = msgText; hudDirty = 1; }
      // redraw now and then too: Entry's stage re-sort after image loading drops stamps
      hudAge = hudAge + 1;
      if (hudAge > 40) { hudDirty = 1; }
      if (hudDirty == 1) { hudDirty = 0; hudAge = 0; hudDraw(); }
    } else {
      if (hudDirty != 2) { eraseAll(); hudDirty = 2; }
    }
  }
});
on('start', 'face', function () {
  for (;;) {
    if (gameState == 2) { show(); if (faceCos > 0) { costume(faceCos); } } else { hide(); }
  }
});
on('start', 'statusbar', function () {
  for (;;) {
    if (gameState == 2) { show(); } else { hide(); }
  }
});
on('start', 'weapon', function () {
  for (;;) {
    if (gameState == 2 && wpnY > -300) { show(); costume(wpnCos); goto(wpnX, wpnY); } else { hide(); }
  }
});
on('start', 'flash', function () {
  for (;;) {
    if (gameState == 2 && flY > -300) { show(); costume(flCos); goto(flX, flY); } else { hide(); }
  }
});
on('start', 'overlay', function () {
  let last = -1;
  for (;;) {
    let v = 0;
    if (gameState == 2) {
      if (ovRed > 0) { v = 1; } else { if (ovGold > 0) { v = 2; } }
    }
    if (v == 0) { hide(); } else {
      show();
      if (v == 1) { costume(1); effect('transparency', 100 - ovRed); }
      else { costume(2); effect('transparency', 100 - ovGold); }
    }
  }
});
on('start', 'sky', function () {
  for (;;) {
    if (gameState == 2 && amOn == 0) { show(); goto(skyX, SKYY); } else { hide(); }
  }
});
on('start', 'amback', function () {
  for (;;) {
    if (gameState == 2 && amOn == 1) { show(); } else { hide(); }
  }
});

// ============================================================
// automap (pen): seen lines around the player, north up
// ============================================================
const AMSCALE = 0.18;
function drawAutomap() {
  eraseAll();
  penSize(1);
  let i = 1, n = lnX1.length;
  let cx = plX, cy = plY;
  while (i <= n) {
    if (lnSeen[i] == 1) {
      let x1 = (lnX1[i] - cx) * AMSCALE, y1 = (lnY1[i] - cy) * AMSCALE + 21;
      let x2 = (lnX2[i] - cx) * AMSCALE, y2 = (lnY2[i] - cy) * AMSCALE + 21;
      if (!((x1 < -240 && x2 < -240) || (x1 > 240 && x2 > 240) || (y1 < -92 && y2 < -92) || (y1 > 135 && y2 > 135))) {
        let b = lnBack[i];
        if (b == 0) { penColor('#fc0000'); }
        else {
          let f = lnFront[i];
          if (secFloor[f] != secFloor[b]) { penColor('#bc7844'); }
          else { if (secCeil[f] != secCeil[b]) { penColor('#fcfc00'); } else { penColor('#808080'); } }
          if (lnSpecial[i] > 0 && (lnSpecial[i] == 1 || lnSpecial[i] == 26 || lnSpecial[i] == 117)) { penColor('#fcfc00'); }
        }
        if (mod(Math.floor(lnFlags[i] / 128), 2) == 0) {
          penUp(); goto(x1, y1); penDown(); goto(x2, y2); penUp();
        }
      }
    }
    i = i + 1;
  }
  // player arrow
  penColor('#ffffff'); penSize(2);
  let ax = cosd(plAng) * 8, ay = sind(plAng) * 8;
  penUp(); goto(0 - ax, 21 - ay); penDown(); goto(ax, 21 + ay);
  goto(ax - cosd(plAng - 30) * 5, 21 + ay - sind(plAng - 30) * 5); penUp();
  goto(ax, 21 + ay); penDown(); goto(ax - cosd(plAng + 30) * 5, 21 + ay - sind(plAng + 30) * 5); penUp();
  goto(0, -400);
}
on('start', 'automap', function () {
  let wasOn = 0;
  for (;;) {
    if (gameState == 2 && amOn == 1) { drawAutomap(); wasOn = 1; }
    else { if (wasOn == 1) { eraseAll(); wasOn = 0; } }
  }
});

// ============================================================
// title / skill menu / intermission (screen stamper)
// ============================================================
function screenDraw() {
  eraseAll();
  if (gameState == 0 || gameState == 1) {
    hudPatch(SP_TITLEPIC, 0, 0);
    if (gameState == 0) {
      if (mod(Math.floor(timer() * 2), 2) == 0) { hudText('PRESS ENTER', 118, 186); }
    } else {
      hudPatch(SP_M_NEWG, 96, 14);
      hudPatch(SP_M_SKILL, 54, 38);
      hudPatch(SP_M_JKILL, 48, 63);
      hudPatch(SP_M_ROUGH, 48, 79);
      hudPatch(SP_M_HURT, 48, 95);
      hudPatch(SP_M_ULTRA, 48, 111);
      hudPatch(SP_M_NMARE, 48, 127);
      let sk = SP_M_SKULL1;
      if (mod(Math.floor(timer() * 4), 2) == 1) { sk = SP_M_SKULL2; }
      hudPatch(sk, 16, 58 + (skill - 1) * 16);
    }
  }
  if (gameState == 3) {
    hudPatch(SP_WIMAP0, 0, 0);
    // "E1M1 finished"
    hudPatch(SP_WILV00, (320 - hpW[SP_WILV00]) / 2, 2);
    hudPatch(SP_WIF, (320 - hpW[SP_WIF]) / 2, 2 + hpH[SP_WILV00] * 5 / 4);
    let lh = hpH[SP_WINUM0] * 3 / 2;
    hudPatch(SP_WIOSTK, 50, 50);
    hudPatch(SP_WIOSTI, 50, 50 + lh);
    hudPatch(SP_WISCRT2, 50, 50 + 2 * lh);
    if (wiStage >= 1) { hudPatch(SP_WIPCNT, 270, 50); hudNum(wiKills, 270, 50, SP_WINUM0, 3); }
    if (wiStage >= 2) { hudPatch(SP_WIPCNT, 270, 50 + lh); hudNum(wiItems, 270, 50 + lh, SP_WINUM0, 3); }
    if (wiStage >= 3) { hudPatch(SP_WIPCNT, 270, 50 + 2 * lh); hudNum(wiSecrets, 270, 50 + 2 * lh, SP_WINUM0, 3); }
    hudPatch(SP_WITIME, 16, 168);
    hudPatch(SP_WIPAR, 176, 168);
    if (wiStage >= 4) {
      // time mm:ss right-aligned at x 160, par 30 s at x 304
      let sec = Math.floor(wiTime);
      hudNum(mod(sec, 60), 160, 168, SP_WINUM0, 2);
      if (mod(sec, 60) < 10) { hudPatch(SP_WINUM0, 160 - 2 * hpW[SP_WINUM0], 168); }
      hudPatch(SP_WICOLON, 160 - 2 * hpW[SP_WINUM0] - hpW[SP_WICOLON], 168);
      hudNum(Math.floor(sec / 60), 160 - 2 * hpW[SP_WINUM0] - hpW[SP_WICOLON], 168, SP_WINUM0, 2);
      hudNum(30, 304, 168, SP_WINUM0, 2);
      hudPatch(SP_WICOLON, 304 - 2 * hpW[SP_WINUM0] - hpW[SP_WICOLON], 168);
      hudPatch(SP_WINUM0, 304 - 2 * hpW[SP_WINUM0] - hpW[SP_WICOLON] - hpW[SP_WINUM0], 168);
    }
    if (wiStage >= 5 && mod(Math.floor(timer() * 2), 2) == 0) { hudText('PRESS ENTER', 118, 190); }
  }
  goto(0, -400);
}
on('start', 'screen', function () {
  goto(0, -400);
  let lastState = -1, lastBlink = -1;
  for (;;) {
    let blink = Math.floor(timer() * 4);
    if (gameState != 2) {
      if (gameState != lastState || blink != lastBlink || scrDirty == 1) {
        scrDirty = 0; lastBlink = blink;
        screenDraw();
      }
    } else {
      if (lastState != 2) { eraseAll(); }
    }
    lastState = gameState;
  }
});
