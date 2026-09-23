// ============================================================
// Specials: doors, lifts, floors, switches, exit (p_doors.c, p_plats.c,
// p_floor.c, p_switch.c, p_spec.c) and sector lighting (p_lights.c)
// ============================================================
const USERANGE = 64;
// sector movers
let secMover = [], secMDir = [], secMSpeed = [], secMTop = [], secMLow = [], secMHigh = [], secMCount = [], secMKind = [];
let movers = [];
let nMovers = 0;
// light effects
let ltSec = [], ltType = [], ltCount = [], ltMin = [], ltMax = [], ltDark = [], ltBright = [];
let nLights = 0;
// switch buttons (revert after 1 s)
let btSide = [], btPart = [], btTex = [], btTime = [];
let nButtons = 0;
let useOk = 0, exitLevel = 0, lowResult = 0;

function specialsInit() {
  let i = 0;
  while (i < NSECTORS) {
    secMover.push(0); secMDir.push(0); secMSpeed.push(0); secMTop.push(0); secMLow.push(0); secMHigh.push(0); secMCount.push(0); secMKind.push(0);
    movers.push(0); ltSec.push(0); ltType.push(0); ltCount.push(0); ltMin.push(0); ltMax.push(0); ltDark.push(0); ltBright.push(0);
    i = i + 1;
  }
  i = 0;
  while (i < 16) { btSide.push(0); btPart.push(0); btTex.push(0); btTime.push(0); i = i + 1; }
}

function levelSpecials() {
  nMovers = 0; nLights = 0; nButtons = 0; exitLevel = 0;
  secretsTotal = 0;
  let s = 1;
  while (s <= NSECTORS) {
    secMover[s] = 0;
    let sp = secSpecial[s];
    if (sp == 9) { secretsTotal = secretsTotal + 1; }
    if (sp == 1 || sp == 2 || sp == 3 || sp == 4 || sp == 8 || sp == 12 || sp == 13 || sp == 17) {
      nLights = nLights + 1;
      ltSec[nLights] = s; ltType[nLights] = sp;
      ltMax[nLights] = secLight[s];
      findMinLight(s, secLight[s]);
      ltMin[nLights] = lowResult;
      if (lowResult == secLight[s] && sp != 1 && sp != 8 && sp != 17) { ltMin[nLights] = 0; }
      ltCount[nLights] = rand(1, 8);
      ltDark[nLights] = 15; ltBright[nLights] = 5;
      if (sp == 3 || sp == 12) { ltDark[nLights] = 35; }
      if (sp == 12 || sp == 13) { ltCount[nLights] = 1; }
      if (sp == 8) { ltCount[nLights] = -1; }
    }
    s = s + 1;
  }
}

// ---- neighbour searches (P_Find...Surrounding) -> lowResult ----
function findMinLight(sec, max) {
  lowResult = max;
  let k = secLineFirst[sec], e = secLineFirst[sec] + secLineCount[sec];
  while (k < e) {
    let ld = secLines[k];
    let o = lnFront[ld];
    if (o == sec) { o = lnBack[ld]; }
    if (o > 0) { if (secLight[o] < lowResult) { lowResult = secLight[o]; } }
    k = k + 1;
  }
}
function findLowestCeiling(sec) {
  lowResult = 32000;
  let k = secLineFirst[sec], e = secLineFirst[sec] + secLineCount[sec];
  while (k < e) {
    let ld = secLines[k];
    let o = lnFront[ld];
    if (o == sec) { o = lnBack[ld]; }
    if (o > 0) { if (secCeil[o] < lowResult) { lowResult = secCeil[o]; } }
    k = k + 1;
  }
}
function findLowestFloor(sec) {
  lowResult = secFloor[sec];
  let k = secLineFirst[sec], e = secLineFirst[sec] + secLineCount[sec];
  while (k < e) {
    let ld = secLines[k];
    let o = lnFront[ld];
    if (o == sec) { o = lnBack[ld]; }
    if (o > 0) { if (secFloor[o] < lowResult) { lowResult = secFloor[o]; } }
    k = k + 1;
  }
}

function addMover(sec) {
  if (secMover[sec] == 0) { nMovers = nMovers + 1; movers[nMovers] = sec; }
}

// ---- doors: kind 0 open-wait-close, 1 open and stay, 2 blazing open-wait-close ----
function doorOpen(sec, kind, who) {
  if (secMover[sec] == 1) {
    // DR re-activation: a closing door re-opens, an open one closes (players only)
    if (secMDir[sec] == -1) { secMDir[sec] = 1; playDoorSound(kind, 1); }
    else { if (who == plMo && secMKind[sec] != 1) { secMDir[sec] = -1; playDoorSound(kind, 0); } }
  } else {
    if (secMover[sec] == 0) {
      addMover(sec);
      secMover[sec] = 1; secMKind[sec] = kind; secMDir[sec] = 1;
      secMSpeed[sec] = 2;
      if (kind == 2) { secMSpeed[sec] = 8; }
      findLowestCeiling(sec);
      secMTop[sec] = lowResult - 4;
      if (secMTop[sec] != secCeil[sec]) { playDoorSound(kind, 1); }
    }
  }
}
function playDoorSound(kind, opening) {
  if (kind == 2) { if (opening == 1) { playSound('BDOPN'); } else { playSound('BDCLS'); } }
  else { if (opening == 1) { playSound('DOROPN'); } else { playSound('DORCLS'); } }
}
// ---- lift: down, wait 3 s, up ----
function platStart(sec) {
  if (secMover[sec] == 0) {
    addMover(sec);
    secMover[sec] = 2; secMSpeed[sec] = 4; secMDir[sec] = -1;
    findLowestFloor(sec);
    secMLow[sec] = lowResult;
    if (secMLow[sec] > secFloor[sec]) { secMLow[sec] = secFloor[sec]; }
    secMHigh[sec] = secFloor[sec];
    playSound('PSTART');
  }
}
// ---- floor lower to lowest neighbour ----
function floorLower(sec) {
  if (secMover[sec] == 0) {
    addMover(sec);
    secMover[sec] = 3; secMSpeed[sec] = 1; secMDir[sec] = -1;
    findLowestFloor(sec);
    secMLow[sec] = lowResult;
  }
}

// do all things in the sector still fit (floor f, ceiling c)?  -> useOk
function sectorFits(sec, f, c) {
  useOk = 1;
  let k = secSSFirst[sec], e = secSSFirst[sec] + secSSCount[sec];
  while (k < e) {
    let m = ssThing[secSS[k]];
    while (m > 0) {
      if (mod(mFlags[m], 2) == 1 || m == plMo) {
        if (c - f < mHeight[m]) { useOk = 0; }
      }
      m = mSSNext[m];
    }
    k = k + 1;
  }
}
// after a plane moved: refresh things' floor/ceiling (P_ChangeSector)
function sectorMoved(sec, oldFloor) {
  secClass(sec);
  let k = secSSFirst[sec], e = secSSFirst[sec] + secSSCount[sec];
  while (k < e) {
    let m = ssThing[secSS[k]];
    while (m > 0) {
      let onFloor = 0;
      if (mZ[m] <= mFloorZ[m]) { onFloor = 1; }
      let nx = mSSNext[m];
      checkPosition(m, mX[m], mY[m]);
      mFloorZ[m] = tmFloorZ; mCeilZ[m] = tmCeilZ;
      if (onFloor == 1 || mZ[m] < mFloorZ[m]) { mZ[m] = mFloorZ[m]; }
      if (mZ[m] + mHeight[m] > mCeilZ[m] && mZ[m] > mFloorZ[m]) { mZ[m] = mCeilZ[m] - mHeight[m]; if (mZ[m] < mFloorZ[m]) { mZ[m] = mFloorZ[m]; } }
      if (m != plMo && mThk[m] == 0) { addThinker(m); }
      m = nx;
    }
    k = k + 1;
  }
}

function runMovers() {
  let i = 1;
  while (i <= nMovers) {
    let sec = movers[i];
    let t = secMover[sec];
    let done = 0;
    if (t == 1) {
      // door
      let d = secMDir[sec];
      if (d == 0) {
        secMCount[sec] = secMCount[sec] - 1;
        if (secMCount[sec] <= 0) { secMDir[sec] = -1; playDoorSound(secMKind[sec], 0); }
      }
      if (d == 1) {
        let nc = secCeil[sec] + secMSpeed[sec];
        if (nc >= secMTop[sec]) {
          nc = secMTop[sec];
          if (secMKind[sec] == 1) { done = 1; } else { secMDir[sec] = 0; secMCount[sec] = 150; }
        }
        secCeil[sec] = nc;
        sectorMoved(sec, secFloor[sec]);
      }
      if (d == -1) {
        let nc = secCeil[sec] - secMSpeed[sec];
        if (nc <= secFloor[sec]) { nc = secFloor[sec]; }
        sectorFits(sec, secFloor[sec], nc);
        if (useOk == 0) {
          secMDir[sec] = 1; playDoorSound(secMKind[sec], 1);
        } else {
          secCeil[sec] = nc;
          sectorMoved(sec, secFloor[sec]);
          if (nc <= secFloor[sec]) { done = 1; }
        }
      }
    }
    if (t == 2) {
      // lift
      let d = secMDir[sec];
      if (d == 0) {
        secMCount[sec] = secMCount[sec] - 1;
        if (secMCount[sec] <= 0) {
          if (secFloor[sec] <= secMLow[sec]) { secMDir[sec] = 1; } else { secMDir[sec] = -1; }
          playSound('PSTART');
        }
      }
      if (d == -1) {
        let of = secFloor[sec];
        let nf = of - secMSpeed[sec];
        if (nf <= secMLow[sec]) { nf = secMLow[sec]; secMDir[sec] = 0; secMCount[sec] = 105; playSound('PSTOP'); }
        secFloor[sec] = nf;
        sectorMoved(sec, of);
      }
      if (d == 1) {
        let of = secFloor[sec];
        let nf = of + secMSpeed[sec];
        if (nf >= secMHigh[sec]) { nf = secMHigh[sec]; }
        sectorFits(sec, nf, secCeil[sec]);
        if (useOk == 0) { secMDir[sec] = 0; secMCount[sec] = 105; playSound('PSTART'); }
        else {
          secFloor[sec] = nf;
          sectorMoved(sec, of);
          if (nf >= secMHigh[sec]) { done = 1; playSound('PSTOP'); }
        }
      }
    }
    if (t == 3) {
      let of = secFloor[sec];
      let nf = of - secMSpeed[sec];
      if (nf <= secMLow[sec]) { nf = secMLow[sec]; done = 1; playSound('PSTOP'); }
      if (mod(levelTime, 8) == 0) { playSound('STNMOV'); }
      secFloor[sec] = nf;
      sectorMoved(sec, of);
    }
    if (done == 1) {
      secMover[sec] = 0;
      movers[i] = movers[nMovers]; nMovers = nMovers - 1;
    } else { i = i + 1; }
  }
}

function runLights() {
  let i = 1;
  while (i <= nLights) {
    let s = ltSec[i], ty = ltType[i];
    if (ty == 8) {
      // glow: 8 units per tic between min and max
      let l = secLight[s] + ltCount[i] * 8;
      if (l <= ltMin[i]) { l = ltMin[i]; ltCount[i] = 1; }
      if (l >= ltMax[i]) { l = ltMax[i]; ltCount[i] = -1; }
      secLight[s] = l;
    } else {
      ltCount[i] = ltCount[i] - 1;
      if (ltCount[i] <= 0) {
        if (ty == 1) {
          // random flash
          if (secLight[s] == ltMax[i]) { secLight[s] = ltMin[i]; ltCount[i] = rand(1, 8); }
          else { secLight[s] = ltMax[i]; ltCount[i] = rand(1, 64); }
        } else {
          if (ty == 17) {
            let amount = rand(0, 3) * 16;
            if (ltMax[i] - amount < ltMin[i]) { secLight[s] = ltMin[i]; } else { secLight[s] = ltMax[i] - amount; }
            ltCount[i] = 4;
          } else {
            // strobes
            if (secLight[s] == ltMin[i]) { secLight[s] = ltMax[i]; ltCount[i] = ltBright[i]; }
            else { secLight[s] = ltMin[i]; ltCount[i] = ltDark[i]; }
          }
        }
      }
    }
    i = i + 1;
  }
}

// ---- switches ----
function changeSwitch(ld, useAgain) {
  let side = lnSide0[ld];
  let changed = 0;
  let t = sdTop[side];
  if (t > 0) { if (txSwitch[t] > 0) { sdTop[side] = txSwitch[t]; changed = 1; if (useAgain == 1) { addButton(side, 1, t); } } }
  t = sdMid[side];
  if (changed == 0 && t > 0) { if (txSwitch[t] > 0) { sdMid[side] = txSwitch[t]; changed = 2; if (useAgain == 1) { addButton(side, 2, t); } } }
  t = sdBot[side];
  if (changed == 0 && t > 0) { if (txSwitch[t] > 0) { sdBot[side] = txSwitch[t]; changed = 3; if (useAgain == 1) { addButton(side, 3, t); } } }
  if (changed > 0) {
    sideTex(side);
    if (lnSpecial[ld] == 11) { playSound('SWTCHX'); } else { playSound('SWTCHN'); }
  }
  if (useAgain == 0) { lnSpecial[ld] = 0; }
}
function addButton(side, part, tex) {
  if (nButtons < 16) { nButtons = nButtons + 1; btSide[nButtons] = side; btPart[nButtons] = part; btTex[nButtons] = tex; btTime[nButtons] = 35; }
}
function runButtons() {
  let i = 1;
  while (i <= nButtons) {
    btTime[i] = btTime[i] - 1;
    if (btTime[i] <= 0) {
      let side = btSide[i];
      if (btPart[i] == 1) { sdTop[side] = btTex[i]; }
      if (btPart[i] == 2) { sdMid[side] = btTex[i]; }
      if (btPart[i] == 3) { sdBot[side] = btTex[i]; }
      sideTex(side);
      playSound('SWTCHN');
      btSide[i] = btSide[nButtons]; btPart[i] = btPart[nButtons]; btTex[i] = btTex[nButtons]; btTime[i] = btTime[nButtons];
      nButtons = nButtons - 1;
    } else { i = i + 1; }
  }
}

// tagged sectors -> action (1 door open-stay, 2 lift, 3 floor lower)
function tagAction(tag, what) {
  let s = 1;
  while (s <= NSECTORS) {
    if (secTag[s] == tag) {
      if (what == 1) { doorOpen(s, 1, 0); }
      if (what == 2) { platStart(s); }
      if (what == 3) { floorLower(s); }
    }
    s = s + 1;
  }
}

// P_UseSpecialLine -> useOk
function useSpecialLine(who, ld) {
  useOk = 0;
  let sp = lnSpecial[ld];
  let ok = 1;
  if (who != plMo) {
    if (mod(Math.floor(lnFlags[ld] / 32), 2) == 1) { ok = 0; }
    if (sp != 1) { ok = 0; }
  }
  if (ok == 1 && sp > 0) {
    // manual doors: the door is the back sector
    if (sp == 1 || sp == 26 || sp == 27 || sp == 28 || sp == 117 || sp == 31 || sp == 32 || sp == 33 || sp == 34) {
      let key = 0;
      if (sp == 26 || sp == 32) { key = 1; }
      if (sp == 27 || sp == 34) { key = 2; }
      if (sp == 28 || sp == 33) { key = 3; }
      let haveKey = 1;
      if (key > 0) {
        haveKey = plKeys[key];
        if (haveKey == 0 && who == plMo) {
          if (key == 1) { msgText = 'You need a blue key to open this door'; }
          if (key == 2) { msgText = 'You need a yellow key to open this door'; }
          if (key == 3) { msgText = 'You need a red key to open this door'; }
          msgTime = 140; playSound('OOF');
        }
      }
      let door = lnBack[ld];
      if (haveKey == 1 && door > 0) {
        let kind = 0;
        if (sp == 117) { kind = 2; }
        if (sp >= 31 && sp <= 34) { kind = 1; }
        doorOpen(door, kind, who);
        useOk = 1;
      }
    }
    if (sp == 11) { changeSwitch(ld, 0); exitLevel = 1; useOk = 1; }
    if (sp == 23) { tagAction(lnTag[ld], 3); changeSwitch(ld, 0); useOk = 1; }
    if (sp == 62) { tagAction(lnTag[ld], 2); changeSwitch(ld, 1); useOk = 1; }
    if (sp == 103) { tagAction(lnTag[ld], 1); changeSwitch(ld, 0); useOk = 1; }
    if (sp == 21) { tagAction(lnTag[ld], 2); changeSwitch(ld, 0); useOk = 1; }
  }
}
// walk-over triggers
function crossSpecialLine(ld, m) {
  let sp = lnSpecial[ld];
  if (m == plMo) {
    if (sp == 2) { tagAction(lnTag[ld], 1); lnSpecial[ld] = 0; }
    if (sp == 88) { tagAction(lnTag[ld], 2); }
    if (sp == 10) { tagAction(lnTag[ld], 2); lnSpecial[ld] = 0; }
    if (sp == 52) { exitLevel = 1; }
  } else {
    if (sp == 88) { tagAction(lnTag[ld], 2); }
  }
}
function shootSpecialLine(ld) {
  if (lnSpecial[ld] == 46) { tagAction(lnTag[ld], 1); }
}

// P_UseLines: first line in front of the player within USERANGE
function useLines() {
  let x1 = plX, y1 = plY;
  let dx = cosd(plAng) * USERANGE, dy = sind(plAng) * USERANGE;
  let bx1 = Math.floor((x1 - USERANGE - BMOX) / 128), bx2 = Math.floor((x1 + USERANGE - BMOX) / 128);
  let by1 = Math.floor((y1 - USERANGE - BMOY) / 128), by2 = Math.floor((y1 + USERANGE - BMOY) / 128);
  if (bx1 < 0) { bx1 = 0; }
  if (by1 < 0) { by1 = 0; }
  if (bx2 > BMW - 1) { bx2 = BMW - 1; }
  if (by2 > BMH - 1) { by2 = BMH - 1; }
  validCount = validCount + 1;
  let bestT = 2, best = 0, blockT = 2;
  let by = by1;
  while (by <= by2) {
    let bx = bx1;
    while (bx <= bx2) {
      let k = bmOff[by * BMW + bx + 1];
      let ld = bmList[k];
      while (ld > 0) {
        if (lnValid[ld] != validCount) {
          lnValid[ld] = validCount;
          let lx = lnX1[ld], ly = lnY1[ld], ldx = lnDX[ld], ldy = lnDY[ld];
          let den = ldy * dx - ldx * dy;
          if (den != 0) {
            let t = ((lx - x1) * ldy - (ly - y1) * ldx) / den;
            let s = ((lx - x1) * dy - (ly - y1) * dx) / den;
            if (t > 0 && t <= 1 && s >= 0 && s <= 1) {
              if (lnSpecial[ld] > 0) { if (t < bestT) { bestT = t; best = ld; } }
              else {
                let bs = lnBack[ld];
                let blocks = 1;
                if (bs > 0) {
                  let fs = lnFront[ld];
                  let ot = secCeil[fs], ob = secFloor[fs];
                  if (secCeil[bs] < ot) { ot = secCeil[bs]; }
                  if (secFloor[bs] > ob) { ob = secFloor[bs]; }
                  if (ot > ob) { blocks = 0; }
                }
                if (blocks == 1 && t < blockT) { blockT = t; }
              }
            }
          }
        }
        k = k + 1;
        ld = bmList[k];
      }
      bx = bx + 1;
    }
    by = by + 1;
  }
  if (best > 0 && bestT < blockT) {
    // only from the front side
    let side = lnDY[best] * (x1 - lnX1[best]) - lnDX[best] * (y1 - lnY1[best]);
    if (side > 0 || lnBack[best] > 0) { useSpecialLine(plMo, best); }
  } else {
    if (blockT <= 1) { playSound('NOWAY'); }
  }
}

// P_PlayerInSpecialSector
function playerSectorSpecial() {
  let s = plSec;
  if (mZ[plMo] <= secFloor[s]) {
    let sp = secSpecial[s];
    if (sp == 9) { plSecrets = plSecrets + 1; secSpecial[s] = 0; msgText = 'A secret is revealed!'; msgTime = 100; hudDirty = 1; }
    if (mod(levelTime, 32) == 0) {
      if (sp == 5) { damageMobj(plMo, 0, 0, 10); }
      if (sp == 7) { damageMobj(plMo, 0, 0, 5); }
      if (sp == 16 || sp == 4) { damageMobj(plMo, 0, 0, 20); }
    }
  }
}
