// ===================================================================== items
// inventory slots 1..36 (1..9 the hotbar): id, count, wear
let INVI = [], INVN = [], INVD = [];
let hotSel = 1, addLeft = 0;
let CGI = [0, 0, 0, 0, 0, 0, 0, 0, 0], CGN = [0, 0, 0, 0, 0, 0, 0, 0, 0], cgSize = 2;
let craftOut = 0, craftCnt = 0;
let curI = 0, curN = 0, curD = 0;
let uiMode = 0, uiPage = 0, curFur = 0, curChest = 0;

function invInit() {
  INVI = []; INVN = []; INVD = [];
  let i = 0;
  while (i < 40) { INVI.push(0); INVN.push(0); INVD.push(0); i = i + 1; }
  i = 1;
  while (i <= 9) { CGI[i] = 0; CGN[i] = 0; i = i + 1; }
  curI = 0; curN = 0; curD = 0; hotSel = 1;
}
// put n of id into the inventory: onto stacks of it first, then into empty slots (hotbar
// first); addLeft: what did not fit
function addItem(id, n, du) {
  let st = ITST[id + 1], i = 1, room = 0;
  if (st > 1) {
    while (i <= 36 && n > 0) {
      if (INVI[i] == id) { room = st - INVN[i]; if (room > 0) { room = Math.min(room, n); INVN[i] = INVN[i] + room; n = n - room; } }
      i = i + 1;
    }
  }
  i = 1;
  while (i <= 36 && n > 0) {
    if (INVI[i] == 0) { room = Math.min(st, n); INVI[i] = id; INVN[i] = room; INVD[i] = du; n = n - room; }
    i = i + 1;
  }
  addLeft = n;
}
function takeHeld(n) {
  INVN[hotSel] = INVN[hotSel] - n;
  if (INVN[hotSel] <= 0) { INVI[hotSel] = 0; INVN[hotSel] = 0; INVD[hotSel] = 0; }
}
// the tool in hand wears; it breaks when worn through
function wearHeld(n) {
  if (mod(gameMode, 2) == 0) {
    let id = INVI[hotSel];
    if (ITDUR[id + 1] > 0) {
      // ((v2.9) unbreaking lets some of it go; the damage is under the charms in the number)
      INVD[hotSel] = INVD[hotSel] + enWear(id, INVD[hotSel], n, 0);
      if (dmgOf(INVD[hotSel]) >= ITDUR[id + 1]) { INVI[hotSel] = 0; INVN[hotSel] = 0; INVD[hotSel] = 0; sndPlay(7); msgShow(`${ITNAME[id + 1]}이(가) 부서졌습니다`, 2); }
    }
  }
}
// Q: one of what is in hand (all of it with Shift) thrown ahead
function dropHeld() {
  let id = INVI[hotSel];
  if (id > 0) {
    let n = 1;
    if (key(16)) { n = INVN[hotSel]; }
    dropItem(id, n, INVD[hotSel], camX + lookX * 0.4, camY - 0.3 + lookY * 0.4, camZ + lookZ * 0.4, 2);
    takeHeld(n);
  }
}

// ---------------------------------------------------------------- crafting
function craftMatch() {
  craftOut = 0; craftCnt = 0;
  let r0 = 9, r1 = -1, c0 = 9, c1 = -1, k = 0, row = 0, col = 0;
  while (k < cgSize * cgSize) {
    if (CGI[k + 1] > 0) { row = idiv(k, cgSize); col = mod(k, cgSize); r0 = Math.min(r0, row); r1 = Math.max(r1, row); c0 = Math.min(c0, col); c1 = Math.max(c1, col); }
    k = k + 1;
  }
  if (r1 >= 0) {
    let h = r1 - r0 + 1, w = c1 - c0 + 1, r = 1;
    while (r <= NREC && craftOut == 0) {
      if (RW[r] == w && RH[r] == h) {
        let ok = 1, okm = RM[r], i = 0, j = 0, g = 0, rc = 0;
        while (i < h) {
          j = 0;
          while (j < w) {
            g = CGI[(r0 + i) * cgSize + c0 + j + 1];
            rc = RC[(r - 1) * 9 + i * 3 + j + 1];
            if (g != rc) { if (rc >= 0 || g == 0) { ok = 0; } else { if (ITTAG[g + 1] != 0 - rc) { ok = 0; } } }
            if (okm == 1) { rc = RC[(r - 1) * 9 + i * 3 + (w - 1 - j) + 1]; if (g != rc) { if (rc >= 0 || g == 0) { okm = 0; } else { if (ITTAG[g + 1] != 0 - rc) { okm = 0; } } } }
            j = j + 1;
          }
          i = i + 1;
        }
        if (ok == 1 || okm == 1) { craftOut = ROUT[r]; craftCnt = RCNT[r]; }
      }
      r = r + 1;
    }
  }
}
// take the result once (to the cursor)
function craftTake() {
  if (craftOut > 0) {
    let k = 1;
    while (k <= cgSize * cgSize) { if (CGI[k] > 0) { if (CGI[k] == I_milkBucket || CGI[k] == I_waterBucket || CGI[k] == I_lavaBucket) { addItem(I_bucket, 1, 0); if (addLeft > 0) { dropItem(I_bucket, 1, 0, px, py + 1, pz, 1); } } CGN[k] = CGN[k] - 1; if (CGN[k] <= 0) { CGI[k] = 0; CGN[k] = 0; } } k = k + 1; }
    sndPlay(6);
  }
}

// ---------------------------------------------------------------- furnaces and chests
let FUX = [], FUY = [], FUZ = [], FUON = [], FII = [], FIN = [], FFI = [], FFN = [], FOI = [], FON = [], FUB = [], FUBM = [], FUP = [], FUF = [];
let CHX = [], CHY = [], CHZ = [], CHON = [], CHI = [], CHN = [], CHD = [];
function storesInit() {
  FUX = []; FUY = []; FUZ = []; FUON = []; FII = []; FIN = []; FFI = []; FFN = []; FOI = []; FON = []; FUB = []; FUBM = []; FUP = []; FUF = [];
  CHX = []; CHY = []; CHZ = []; CHON = []; CHI = []; CHN = []; CHD = [];
  let i = 0;
  while (i < NFUR) { FUX.push(0); FUY.push(0); FUZ.push(0); FUON.push(0); FII.push(0); FIN.push(0); FFI.push(0); FFN.push(0); FOI.push(0); FON.push(0); FUB.push(0); FUBM.push(0); FUP.push(0); FUF.push(1); i = i + 1; }
  i = 0;
  while (i < NCHEST) { CHX.push(0); CHY.push(0); CHZ.push(0); CHON.push(0); i = i + 1; }
  i = 0;
  while (i < NCHEST * 27) { CHI.push(0); CHN.push(0); CHD.push(0); i = i + 1; }
}
let fFound = 0;
function furnaceFind(x, y, z) {
  fFound = 0;
  let i = 1;
  while (i <= NFUR) { if (FUON[i] == 1) { if (FUX[i] == x && FUY[i] == y + dim * 1000 && FUZ[i] == z) { fFound = i; } } i = i + 1; }
}
function furnaceAt(x, y, z) {
  furnaceFind(x, y, z);
  if (fFound == 0) {
    let i = 1;
    while (i <= NFUR && fFound == 0) { if (FUON[i] == 0) { fFound = i; } i = i + 1; }
    if (fFound > 0) { let f = fFound; FUON[f] = 1; FUX[f] = x; FUY[f] = y + dim * 1000; FUZ[f] = z; FII[f] = 0; FIN[f] = 0; FFI[f] = 0; FFN[f] = 0; FOI[f] = 0; FON[f] = 0; FUB[f] = 0; FUBM[f] = 0; FUP[f] = 0; FUF[f] = 1; if (blockAt(x, y, z) != 18) { FUF[f] = 2; } }
  }
}
function furnaceOpen(x, y, z) {
  furnaceAt(x, y, z);
  if (fFound > 0) { curFur = fFound; uiOpen(3); } else { msgShow('화로가 너무 많습니다', 2); }
}
let smeltOut = 0;
function smeltOf(id) {
  smeltOut = 0;
  let i = 1;
  while (i <= SMI.length) { if (SMI[i] == id) { smeltOut = SMO[i]; } i = i + 1; }
}
function furnacesStep(dt) {
  let f = 1;
  while (f <= NFUR) {
    if (FUON[f] == 1) {
      smeltOf(FII[f]);
      let can = 0;
      if (FIN[f] > 0) { if (smeltOut > 0) { if (FOI[f] == 0 || (FOI[f] == smeltOut && FON[f] < ITST[smeltOut + 1])) { can = 1; } } }
      if (FUB[f] <= 0) {
        if (can == 1) { if (FFN[f] > 0) { if (ITFUEL[FFI[f] + 1] > 0) {
          FUB[f] = ITFUEL[FFI[f] + 1]; FUBM[f] = FUB[f];
          FFN[f] = FFN[f] - 1; if (FFN[f] <= 0) { FFI[f] = 0; FFN[f] = 0; }
        } } }
      }
      if (FUB[f] > 0) {
        FUB[f] = FUB[f] - dt;
        if (can == 1) {
          FUP[f] = FUP[f] + dt * FUF[f];
          if (FUP[f] >= SMELTT) {
            FUP[f] = 0;
            FIN[f] = FIN[f] - 1; if (FIN[f] <= 0) { FII[f] = 0; FIN[f] = 0; }
            FOI[f] = smeltOut; FON[f] = FON[f] + 1;
          }
        } else { FUP[f] = 0; }
      } else { FUP[f] = Math.max(0, FUP[f] - dt * 2); }
    }
    f = f + 1;
  }
}
let cFound = 0;
// (v2.4.4) n of an item into chest c (a stack of it with room, else an empty slot): 1 when it went in
// ((v2.7) as the genre: a hopper has 5 slots, a dispenser and a dropper 9, a chest 27)
function chestCap(c) {
  let r = 27;
  if (c > 0 && c <= CHON.length) { if (CHON[c] == 1) { if (idiv(CHY[c], 1000) == dim) {
    let b = blockAt(CHX[c], CHY[c] - dim * 1000, CHZ[c]);
    if (BKIND[b + 1] == I_hopper) { r = 5; } if (BRS[b + 1] == RS_DISPENSER) { r = 9; }
  } } }
  return r;
}
function chestTake(c, id, n, d) {
  let k = 1, f = 0, base = (c - 1) * 27, cap = chestCap(c);
  while (k <= cap) { if (f == 0) { if (CHI[base + k] == id && CHD[base + k] == d && CHN[base + k] + n <= ITST[id + 1]) { f = k; } } k = k + 1; }
  k = 1;
  while (k <= cap) { if (f == 0) { if (CHI[base + k] == 0) { f = k; } } k = k + 1; }
  let r = 0;
  if (f > 0) { if (CHI[base + f] == 0) { CHI[base + f] = id; CHN[base + f] = 0; CHD[base + f] = d; } CHN[base + f] = CHN[base + f] + n; r = 1; chestTouched(c); chestSay(c, f); }
  return r;
}
// (v2.4.4) a slot of chest c changed by the world (a dispenser, a hopper): the others hear it
function chestSay(c, k) {
  if (netSrv > 0) { if (netSt == 2) {
    let base = (c - 1) * 27, y = CHY[c] - dim * 1000;
    gS2 = `${CHX[c]}^${y}^${CHZ[c]}^${k}^${CHI[base + k]}^${CHN[base + k]}^${CHD[base + k]}`;
    netSay('x', gS2); if (netHost == 1) { hostKeepChest(gS2); }
  } }
}
// (v2.4.4) hoppers: every 0.4 s one item from a container over it (or the items lying on it) into it,
// and one from it into a container (or a furnace's top) under it; held while powered. (They did
// nothing.) On a server the host's screen does it and tells the others.
// ((v2.7) a hopper that took an item waits its 8 ticks before passing one on (HRCV: the pass it took
// one), so an item goes one hopper a pass, not down a whole line at once)
let hopT = 0, hopPass = 0, HRCV = [];
function hoppersStep(dt) {
  hopT = hopT + dt;
  if (hopT >= 0.4) {
    hopT = 0; hopPass = hopPass + 1;
    while (HRCV.length < NCHEST) { HRCV.push(0); }
    if (netSrv == 0 || netSt != 2 || netHost == 1) {
      let c = 1;
      while (c <= NCHEST) {
        if (CHON[c] == 1) { if (idiv(CHY[c], 1000) == dim) {
          let x = CHX[c], y = CHY[c] - dim * 1000, z = CHZ[c];
          if (cOK(x, z) == 1) { let hb = blockAt(x, y, z); if (BKIND[hb + 1] == I_hopper) { if (powerIn(x, y, z, 0 - 1) == 0) { hopperWork(c, x, y, z, BFAC[hb + 1]); } } }
        } }
        c = c + 1;
      }
    }
  }
}
function hopperWork(c, x, y, z, hf) {
  let base = (c - 1) * 27, k = 1, f = 0;
  // ((v2.7) out the way it points: the first item that fits into the container there (from the side
  // into a furnace's fuel, from above its input); not in the pass it took one)
  let ox = x + DX6[hf + 1], oy = y + DY6[hf + 1], oz = z + DZ6[hf + 1], moved = 0;
  if (HRCV[c] != hopPass) {
    // (a container there that was never opened counts too)
    let tb = blockAt(ox, oy, oz), tc = 0, tf = 0;
    if (BUSE[tb + 1] == U_CHEST) { chestAt(ox, oy, oz); tc = cFound; }
    if (BUSE[tb + 1] == U_FURNACE) { furnaceAt(ox, oy, oz); tf = fFound; }
    k = 1;
    while (k <= 5 && moved == 0) {
      if (CHI[base + k] > 0) {
        let id = CHI[base + k];
        if (tc > 0) { moved = chestTake(tc, id, 1, CHD[base + k]); if (moved == 1) { HRCV[tc] = hopPass; } }
        else { if (tf > 0) {
          if (hf == 2) { if (FII[tf] == 0 || (FII[tf] == id && FIN[tf] < ITST[id + 1])) { FII[tf] = id; FIN[tf] = FIN[tf] + 1; moved = 1; } }
          else { if (ITFUEL[id + 1] > 0) { if (FFI[tf] == 0 || (FFI[tf] == id && FFN[tf] < ITST[id + 1])) { FFI[tf] = id; FFN[tf] = FFN[tf] + 1; moved = 1; } } }
        } }
        if (moved == 1) { f = k; }
      }
      k = k + 1;
    }
    if (moved == 1) { CHN[base + f] = CHN[base + f] - 1; if (CHN[base + f] <= 0) { CHI[base + f] = 0; CHN[base + f] = 0; CHD[base + f] = 0; } chestTouched(c); chestSay(c, f); }
  }
  // in: one from a container over it (the first that fits), else the items lying on it
  chestFind(x, y + 1, z);
  if (cFound > 0) {
    let a = cFound, ab = (a - 1) * 27, g = 0, cap = chestCap(a);
    k = 1;
    while (k <= cap && g == 0) { if (CHI[ab + k] > 0) { if (chestTake(c, CHI[ab + k], 1, CHD[ab + k]) == 1) { g = k; } } k = k + 1; }
    if (g > 0) { CHN[ab + g] = CHN[ab + g] - 1; if (CHN[ab + g] <= 0) { CHI[ab + g] = 0; CHN[ab + g] = 0; CHD[ab + g] = 0; } chestTouched(a); chestSay(a, g); HRCV[c] = hopPass; }
  } else {
    furnaceFind(x, y + 1, z);
    if (fFound > 0) { if (FON[fFound] > 0) { if (chestTake(c, FOI[fFound], 1, 0) == 1) { FON[fFound] = FON[fFound] - 1; if (FON[fFound] <= 0) { FOI[fFound] = 0; FON[fFound] = 0; } } } }
    else {
      let i = 1;
      while (i <= NITM) {
        if (IID[i] > 0) { if (Math.floor(IXX[i]) == x && Math.floor(IZZ[i]) == z && IYY[i] >= y && IYY[i] < y + 1.6) {
          let n = INN[i];
          while (n > 0) { if (chestTake(c, IID[i], 1, IDU[i]) == 1) { n = n - 1; } else { INN[i] = n; n = 0 - 1; } }
          if (n == 0) { IID[i] = 0; }
        } }
        i = i + 1;
      }
    }
  }
}
// (v2.4.3) what is in chest c changed: the comparators reading it (next to it, or through a block) ask again
function chestTouched(c) {
  if (c > 0 && c <= CHON.length) { if (CHON[c] == 1) { if (idiv(CHY[c], 1000) == dim) { powerAround(CHX[c], CHY[c] - dim * 1000, CHZ[c]); } } }
}
function chestFind(x, y, z) {
  cFound = 0;
  let i = 1;
  while (i <= NCHEST) { if (CHON[i] == 1) { if (CHX[i] == x && CHY[i] == y + dim * 1000 && CHZ[i] == z) { cFound = i; } } i = i + 1; }
}
function chestAt(x, y, z) {
  chestFind(x, y, z);
  if (cFound == 0) {
    let i = 1;
    while (i <= NCHEST && cFound == 0) { if (CHON[i] == 0) { cFound = i; } i = i + 1; }
    if (cFound > 0) {
      let c = cFound; CHON[c] = 1; CHX[c] = x; CHY[c] = y + dim * 1000; CHZ[c] = z; chestNew = 1;
      let k = 1;
      while (k <= 27) { CHI[(c - 1) * 27 + k] = 0; CHN[(c - 1) * 27 + k] = 0; CHD[(c - 1) * 27 + k] = 0; k = k + 1; }
    }
  }
}
let chestNew = 0;
function chestOpen(x, y, z) {
  chestNew = 0;
  chestAt(x, y, z);
  // a chest the world made (the depths, the void): its loot the first time it is opened
  if (chestNew == 1) {
    lootUnder = blockAt(x, y - 1, z);
    let lt = lootAt(x, y, z);
    if (lt > 0) { lootTable(cFound, lt); } else { if (dim != 0 || lootUnder == 60) { chestLoot(cFound); } }
  }
  if (cFound > 0) { curChest = cFound; curCap = chestCap(cFound); uiOpen(4); trapOpen(x, y, z); } else { msgShow('상자가 너무 많습니다', 2); }
}
let curCap = 27;
// (v2.5) a trapped chest looked in gives power (1: the player here; the genre counts the players)
let tcOn = 0, tcX = 0, tcY = 0, tcZ = 0, tcD = 0;
function trapOpen(x, y, z) {
  if (BRS[blockAt(x, y, z) + 1] == RS_TRAPPED) { tcOn = 1; tcX = x; tcY = y; tcZ = z; tcD = dim; powerAround(x, y, z); }
}
function trapLevel(x, y, z) {
  let r = 0;
  if (tcOn == 1) { if (tcX == x && tcY == y && tcZ == z && tcD == dim) { r = 1; } }
  return r;
}
// a furnace or chest broken: what was in it falls out
function chestOrFurnaceGone(x, y, z, b) {
  if (BUSE[b + 1] == U_FURNACE) {
    furnaceFind(x, y, z);
    if (fFound > 0) {
      let f = fFound;
      if (FIN[f] > 0) { dropItem(FII[f], FIN[f], 0, x + 0.5, y + 0.5, z + 0.5, 1); }
      if (FFN[f] > 0) { dropItem(FFI[f], FFN[f], 0, x + 0.5, y + 0.5, z + 0.5, 1); }
      if (FON[f] > 0) { dropItem(FOI[f], FON[f], 0, x + 0.5, y + 0.5, z + 0.5, 1); }
      FUON[f] = 0;
    }
  }
  if (BUSE[b + 1] == U_CHEST && b != I_voidChest) {
    chestFind(x, y, z);
    if (cFound > 0) {
      let k = 1, j = 0;
      while (k <= 27) { j = (cFound - 1) * 27 + k; if (CHI[j] > 0) { dropItem(CHI[j], CHN[j], CHD[j], x + 0.5, y + 0.5, z + 0.5, 1); } k = k + 1; }
      CHON[cFound] = 0;
    }
  }
}

// ---------------------------------------------------------------- slots of the screens
// 1..36 inventory, 41..49 crafting grid, 50 result, 51 furnace input, 52 fuel, 53 output,
// 61..87 chest, 101.. the creative list; (v2.9) 57 the enchanting table's item, 58 its lapis,
// 59 60 the anvil's two, 88 what it makes
let gI = 0, gN = 0, gD = 0;
function slotGet(s) {
  gI = 0; gN = 0; gD = 0;
  if (s <= 40) { gI = INVI[s]; gN = INVN[s]; gD = INVD[s]; }
  else { if (s <= 49) { gI = CGI[s - 40]; gN = CGN[s - 40]; }
  else { if (s == 50) { gI = craftOut; gN = craftCnt; }
  else { if (s == 51) { gI = FII[curFur]; gN = FIN[curFur]; }
  else { if (s == 52) { gI = FFI[curFur]; gN = FFN[curFur]; }
  else { if (s == 53) { gI = FOI[curFur]; gN = FON[curFur]; }
  else { if (s == 54) { gI = SMI1; gN = SMN1; gD = SMD1; } else { if (s == 55) { gI = SMI2; gN = SMN2; } else { if (s == 56) { gI = smOut; gN = 1; gD = SMD1; }
  else { if (s >= 57 && s <= 60) { if (s == 57) { gI = ENI; gN = ENN; gD = END; } if (s == 58) { gI = ELI; gN = ELN; } if (s == 59) { gI = AN1I; gN = AN1N; gD = AN1D; } if (s == 60) { gI = AN2I; gN = AN2N; gD = AN2D; } }
  else { if (s == 88) { gI = anOut; gN = 1; gD = anOutD; }
  else { if (s <= 87) { let j = (curChest - 1) * 27 + s - 60; gI = CHI[j]; gN = CHN[j]; gD = CHD[j]; }
  else { let k = uiPage * 36 + s - 100; gI = palAt(k); gN = ITST[gI + 1]; } } } } } } } } } } } }
  if (gI == 0) { gN = 0; gD = 0; }
}
function slotSet(s, i, n, d) {
  if (n <= 0) { i = 0; n = 0; d = 0; }
  if (s <= 40) { INVI[s] = i; INVN[s] = n; INVD[s] = d; }
  else { if (s <= 49) { CGI[s - 40] = i; CGN[s - 40] = n; craftMatch(); }
  else { if (s == 51) { FII[curFur] = i; FIN[curFur] = n; }
  else { if (s == 52) { FFI[curFur] = i; FFN[curFur] = n; }
  else { if (s == 53) { FOI[curFur] = i; FON[curFur] = n; }
  else { if (s == 54) { SMI1 = i; SMN1 = n; SMD1 = d; smithMatch(); } else { if (s == 55) { SMI2 = i; SMN2 = n; smithMatch(); }
  else { if (s >= 57 && s <= 60) { if (s == 57) { ENI = i; ENN = n; END = d; } if (s == 58) { ELI = i; ELN = n; } if (s == 59) { AN1I = i; AN1N = n; AN1D = d; anvilMatch(); } if (s == 60) { AN2I = i; AN2N = n; AN2D = d; anvilMatch(); } }
  else { if (s >= 61) { if (s <= 87) { let j = (curChest - 1) * 27 + s - 60; CHI[j] = i; CHN[j] = n; CHD[j] = d; chestTouched(curChest); } } } } } } } } } }
}
// a click on slot s: btn 0 the left button, 1 the right, 2 the middle; sh 1 with Shift
// ((v3.0) as the genre's: the right button takes half or puts one, Shift moves the stack across
// (it was Shift that took half or put one, the buttons not being told apart), the middle one in
// creative takes a full stack of it)
// ((v2.9) armour with the curse of binding does not come off but in creative; the anvil's result is taken by anvilTake)
function slotClick(s, btn, sh) {
  let go = 1;
  if (s >= 37 && s <= 40 && mod(gameMode, 2) == 0) { if (INVI[s] > 0) { if (armLv(s, 27) > 0) { if (curI == 0 || sh == 1) { go = 0; msgShow('귀속 저주: 벗을 수 없습니다', 1.5); } } } }
  if (s == 57) { if (curI > 0 && sh == 0) { if (ITENC[curI + 1] <= 0 || curN > 1 && btn == 0) { go = 0; } } }
  if (s == 58) { if (curI > 0 && sh == 0 && curI != 119) { go = 0; } }
  if (s == 88) { go = 0; if (curI == 0) { anvilTake(sh); } }
  if (go == 1) { slotClick0(s, btn, sh); }
}
function slotClick0(s, btn, sh) {
  slotGet(s);
  let si = gI, sn = gN, sd = gD;
  if (s == 56) {
    // the smithing result: onto an empty cursor (Shift: into the inventory)
    if (smOut > 0) {
      if (sh == 1) { addItem(smOut, 1, SMD1); if (addLeft > 0) { dropItem(smOut, addLeft, SMD1, px, py + 1, pz, 1); } smithTake(); sndPlay(6); }
      else { if (curI == 0) { curI = smOut; curN = 1; curD = SMD1; smithTake(); sndPlay(6); } }
    }
  } else { if (s == 50) {
    // the crafting result: onto the cursor (Shift: as many as can be made, into the inventory)
    if (si > 0) {
      if (sh == 1) {
        let k = 0;
        while (k < 64 && craftOut > 0) {
          let o = craftOut, c = craftCnt;
          addItem(o, c, 0);
          if (addLeft > 0) { k = 99; dropItem(o, addLeft, 0, px, py + 1, pz, 1); }
          craftTake(); craftMatch();
          k = k + 1;
        }
      } else {
        if (curI == 0 || (curI == si && curN + sn <= ITST[si + 1])) {
          if (curI == 0) { curI = si; curN = sn; curD = 0; } else { curN = curN + sn; }
          craftTake(); craftMatch();
        }
      }
    }
  } else { if (s >= 101) {
    // the creative list: a full stack onto the cursor (the right button: one; Shift: a full stack
    // into the inventory); what is on the cursor goes back into the list
    if (curI > 0) { curI = 0; curN = 0; curD = 0; }
    else { if (si > 0) {
      if (sh == 1) { addItem(si, sn, 0); }
      else { curI = si; curN = sn; if (btn == 1) { curN = 1; } curD = 0; }
    } }
  } else {
    let isOut = 0;
    if (s == 53) { isOut = 1; }
    if (sh == 1) { if (si > 0) { quickMove(s); } }
    else { if (btn == 2) {
      // the middle button: in creative a full stack of it onto an empty cursor
      if (gameMode == 1 && curI == 0 && si > 0) { curI = si; curN = ITST[si + 1]; curD = sd; }
    } else { if (curI == 0) {
      if (si > 0) {
        let take = sn;
        if (btn == 1) { take = Math.ceil(sn / 2); }
        curI = si; curN = take; curD = sd;
        slotSet(s, si, sn - take, sd);
      }
    } else {
      if (isOut == 0) {
        let put = curN;
        if (btn == 1) { put = 1; }
        if (slotTakes(s, curI) == 1) {
          if (si == 0) { slotSet(s, curI, put, curD); curN = curN - put; }
          else {
            if (si == curI && ITST[si + 1] > 1) {
              put = Math.min(put, ITST[si + 1] - sn);
              slotSet(s, si, sn + put, sd); curN = curN - put;
            } else { slotSet(s, curI, curN, curD); curI = si; curN = sn; curD = sd; }
          }
        }
      } else {
        // the furnace output: only taken
        if (si == curI) { if (curN + sn <= ITST[si + 1]) { curN = curN + sn; slotSet(s, 0, 0, 0); } }
      }
      if (curN <= 0) { curI = 0; curN = 0; curD = 0; }
    } } }
  } } }
}
// may slot s hold id: the fuel slot only fuel, an armour slot only its piece
function slotTakes(s, id) {
  let r = 1;
  if (s == 52) { if (ITFUEL[id + 1] <= 0) { r = 0; } }
  if (s >= 37 && s <= 40) { if (ITSLOT[id + 1] != s - 36) { r = 0; } }
  return r;
}
// ((v3.0) Shift and a click: the stack across, as the genre's - between the inventory and the hotbar,
// into the open chest or furnace (what smelts to its input, fuel to its fuel) and out of it, armour
// onto its slot; out of the grid, the furnace, the chest, the other screens' slots into the inventory.
// From a chest or a furnace's output the hotbar is filled first, from its right end.)
function quickMove(s) {
  if (s <= 36) {
    slotGet(s);
    let id = gI, done = 0;
    if (uiMode == 4) { moveTo(s, 61, 60 + curCap); done = 1; }
    if (uiMode == 3) { smeltOf(id); if (smeltOut > 0) { moveTo(s, 51, 51); done = 1; } else { if (ITFUEL[id + 1] > 0) { moveTo(s, 52, 52); done = 1; } } }
    if (done == 0 && (uiMode == 1 || uiMode == 5)) { if (ITK[id + 1] == 4) { if (INVI[36 + ITSLOT[id + 1]] == 0) { moveTo(s, 36 + ITSLOT[id + 1], 36 + ITSLOT[id + 1]); done = 1; } } }
    if (done == 0) { if (s >= 10) { moveTo(s, 1, 9); } else { moveTo(s, 10, 36); } }
  } else {
    if ((s >= 61 && s <= 87) || s == 53) { moveTo(s, 9, 1); moveTo(s, 36, 10); }
    else { moveTo(s, 10, 36); moveTo(s, 1, 9); }
  }
}
// slot s into slots a..b (b < a: from a down), onto stacks of it first, then into empty ones
function moveTo(s, a, b) {
  slotGet(s);
  let id = gI, n = gN, d = gD, st = ITST[gI + 1], step = 1, k = a, put = 0;
  if (b < a) { step = 0 - 1; }
  if (id > 0) {
    if (st > 1) {
      while (n > 0 && (k - b) * step <= 0) {
        if (k != s) { slotGet(k); if (gI == id) { put = Math.min(st - gN, n); if (put > 0) { slotSet(k, id, gN + put, gD); n = n - put; } } }
        k = k + step;
      }
    }
    k = a;
    while (n > 0 && (k - b) * step <= 0) {
      if (k != s) { slotGet(k); if (gI == 0) { if (slotTakes(k, id) == 1) { put = Math.min(st, n); slotSet(k, id, put, d); n = n - put; } } }
      k = k + step;
    }
    slotSet(s, id, n, d);
  }
}
// ((v3.0) a stack on the cursor drawn over slots with a button held, as the genre's: on letting go the
// left button shares it out evenly (what does not divide stays on the cursor), the right one puts one
// in each; over one slot alone it is a click there. DRS the slots passed, dragBtn the button.)
let dragOn = 0, dragBtn = 0, DRS = [];
function dragOk(s) {
  let r = 0;
  if (s <= 36 || (s >= 41 && s <= 49) || s == 51 || s == 52 || (s >= 61 && s <= 87)) {
    if (slotTakes(s, curI) == 1) { slotGet(s); if (gI == 0) { r = 1; } else { if (gI == curI && ITST[gI + 1] > gN) { r = 1; } } }
  }
  return r;
}
function dragStep(held) {
  if (held == 1) {
    if (uiHover > 0 && DRS.length < curN) { if (dragOk(uiHover) == 1) {
      let i = 1, has = 0;
      while (i <= DRS.length) { if (DRS[i] == uiHover) { has = 1; } i = i + 1; }
      if (has == 0) { DRS.push(uiHover); }
    } }
  } else {
    dragOn = 0;
    if (DRS.length == 1) { slotClick(DRS[1], dragBtn, 0); }
    else {
      let per = 1, i = 1;
      if (dragBtn == 0) { per = Math.floor(curN / DRS.length); }
      while (i <= DRS.length && curN > 0) {
        let s = DRS[i];
        slotGet(s);
        let put = Math.min(per, ITST[curI + 1] - gN);
        if (gI == 0) { slotSet(s, curI, put, curD); } else { slotSet(s, gI, gN + put, gD); }
        curN = curN - put;
        i = i + 1;
      }
      if (curN <= 0) { curI = 0; curN = 0; curD = 0; }
    }
    DRS = [];
  }
}
function uiOpen(m) {
  uiMode = m; uiPage = 0; dragOn = 0; DRS = [];
  cgSize = 2;
  if (m == 2) { cgSize = 3; }
  craftMatch();
  mouseFree();
  txClear();
}
// closing: what is in the grid and on the cursor goes back (or falls)
function uiClose() {
  if (tcOn == 1) { tcOn = 0; if (tcD == dim) { powerAround(tcX, tcY, tcZ); } }
  let k = 1;
  while (k <= 9) {
    if (CGI[k] > 0) { addItem(CGI[k], CGN[k], 0); if (addLeft > 0) { dropItem(CGI[k], addLeft, 0, px, py + 1, pz, 1); } CGI[k] = 0; CGN[k] = 0; }
    k = k + 1;
  }
  if (curI > 0) {
    if (uiMode != 5) { addItem(curI, curN, curD); if (addLeft > 0) { dropItem(curI, addLeft, curD, px, py + 1, pz, 1); } }
    curI = 0; curN = 0; curD = 0;
  }
  craftOut = 0; craftCnt = 0;
  smithBack();
  // ((v2.9) the enchanting table's and the anvil's things go back too)
  if (ENI > 0) { addItem(ENI, ENN, END); if (addLeft > 0) { dropItem(ENI, addLeft, END, px, py + 1, pz, 1); } }
  if (ELI > 0) { addItem(ELI, ELN, 0); if (addLeft > 0) { dropItem(ELI, addLeft, 0, px, py + 1, pz, 1); } }
  if (AN1I > 0) { addItem(AN1I, AN1N, AN1D); if (addLeft > 0) { dropItem(AN1I, addLeft, AN1D, px, py + 1, pz, 1); } }
  if (AN2I > 0) { addItem(AN2I, AN2N, AN2D); if (addLeft > 0) { dropItem(AN2I, addLeft, AN2D, px, py + 1, pz, 1); } }
  ENI = 0; ENN = 0; END = 0; ELI = 0; ELN = 0; AN1I = 0; AN1N = 0; AN1D = 0; AN2I = 0; AN2N = 0; AN2D = 0; anOut = 0;
  uiMode = 0;
  txClear();
}
// the start kit (creative: a bar of building blocks)
function startKit() {
  invInit();
  if (gameMode == 1) {
    let k = 1;
    while (k <= 9) { INVI[k] = KIT[k]; INVN[k] = ITST[KIT[k] + 1]; k = k + 1; }
  }
}

// what a fort chest (the depths) or a tower chest (the void) holds
let lootUnder = 0;
function chestLoot(c) {
  let n = rand(4, 8), k = 0, j = 0, id = 0, cnt = 0;
  while (k < n) {
    j = (c - 1) * 27 + rand(1, 27);
    let r = rand(1, 100);
    if (dim == 0) {
      // the old ruin
      id = 102; cnt = rand(1, 5);
      if (r > 25) { id = 105; cnt = rand(1, 3); }
      if (r > 45) { id = 170; cnt = rand(1, 2); }
      if (r > 62) { id = 103; cnt = rand(1, 3); }
      if (r > 75) { id = 101; cnt = rand(2, 6); }
      if (r > 85) { id = 171; cnt = 1; }
      if (r > 93) { id = 104; cnt = rand(1, 2); }
    } else { if (dim == 1) {
      id = 102; cnt = rand(1, 4);
      if (r > 30) { id = 103; cnt = rand(1, 3); }
      if (r > 50) { id = 123; cnt = rand(1, 3); }
      if (r > 65) { id = 34; cnt = rand(2, 6); }
      if (r > 78) { id = 115; cnt = rand(4, 12); }
      if (r > 86) { id = 109; cnt = rand(2, 5); }
      if (r > 93) { id = 104; cnt = rand(1, 2); }
      if (r > 97) { id = 125; cnt = 1; }
    } else {
      id = 104; cnt = rand(1, 3);
      if (r > 35) { id = 102; cnt = rand(3, 8); }
      if (r > 55) { id = 103; cnt = rand(2, 6); }
      if (r > 70) { id = 154 + rand(0, 3); cnt = 1; }
      if (r > 85) { id = 158 + rand(0, 3); cnt = 1; }
      if (r > 93) { id = 133; cnt = 1; }
      if (r > 97) { id = 128; cnt = 1; }
    } }
    CHI[j] = id; CHN[j] = cnt; CHD[j] = 0;
    k = k + 1;
  }
  // ((v2.9) an enchanted book now and then)
  if (rand(1, 3) == 1) { j = (c - 1) * 27 + rand(1, 27); CHI[j] = I_enchantedBook; CHN[j] = 1; CHD[j] = enRandomBook(); }
  // a ship's hold (on its deck of planks): the glider
  if (dim == 2) { if (lootUnder == 5) { CHI[(c - 1) * 27 + 14] = 173; CHN[(c - 1) * 27 + 14] = 1; CHD[(c - 1) * 27 + 14] = 0; } }
}

// the creative list: the tab uiTab (NCAT: what the search found)
let uiTab = 0, SRCH = [], srchText = '';
function palLen() {
  let r = SRCH.length;
  if (uiTab < NCAT) { r = PALCN[uiTab + 1]; }
  return r;
}
function palAt(k) {
  let r = 0;
  if (k >= 1 && k <= palLen()) { if (uiTab < NCAT) { r = PALC[PALC0[uiTab + 1] + k - 1]; } else { r = SRCH[k]; } }
  return r;
}
function palSearch() {
  mouseFree();
  ask('찾을 아이템 이름 (한국어나 영어 일부)');
  let s = lower(answer());
  askDone();
  SRCH = [];
  if (strlen(s) > 0) {
    let id = 1;
    while (id < NITEM) {
      if (ITCAT[id + 1] >= 0) { if (indexOf(ITNAME[id + 1], s) > 0 || indexOf(ITKEY[id + 1], s) > 0) { SRCH.push(id); } }
      id = id + 1;
    }
  }
  srchText = s; uiTab = NCAT; uiPage = 0;
}
