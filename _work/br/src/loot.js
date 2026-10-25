// ===================================================================== loot
// Items lying in the world: a pool of NW slots, each on its cell's list (WCH head, WNX next).
// item ids: 1..15 guns, 16..30 attachments, 31..36 ammo, 37..39 helmet, 40..42 vest, 43..45 backpack,
// 46 bandage, 47 first aid kit, 48 med kit, 49 energy drink, 50 painkiller, 51 frag, 52 smoke
const NW = 3600;
let WIT = [], WX = [], WY = [], WZ = [], WN = [], WNX = [], WCH = [], WYAW = [];
let wFree = 0, nItems = 0;
let pickItem = 0, pickD = 0;

function lootInit() {
  let i = 1;
  while (i <= NW) { WIT.push(0); WX.push(0); WY.push(0); WZ.push(0); WN.push(0); WNX.push(0); WYAW.push(0); i = i + 1; }
  i = 1;
  while (i <= CELLS * CELLS) { WCH.push(0); i = i + 1; }
}
function lootClear() {
  let i = 1;
  while (i <= NW) { WIT[i] = 0; WNX[i] = i + 1; i = i + 1; }
  WNX[NW] = 0; wFree = 1;
  i = 1;
  while (i <= CELLS * CELLS) { WCH[i] = 0; i = i + 1; }
  nItems = 0;
}
// a new item in the world: its slot in itemNew (0 when full)
let itemNew = 0;
function itemAdd(it, x, y, z, n) {
  let k = wFree;
  itemNew = k;
  if (k > 0) {
    wFree = WNX[k];
    WIT[k] = it; WX[k] = x; WY[k] = y; WZ[k] = z; WN[k] = n; WYAW[k] = rand(0, 359);
    let c = Math.floor(z / CS) * CELLS + Math.floor(x / CS) + 1;
    WNX[k] = WCH[c]; WCH[c] = k;
    nItems = nItems + 1;
  }
}
// take slot k out of the world
function itemRemove(k) {
  let c = Math.floor(WZ[k] / CS) * CELLS + Math.floor(WX[k] / CS) + 1;
  let p = WCH[c];
  if (p == k) { WCH[c] = WNX[k]; } else {
    let go = 1;
    while (go == 1) { if (p == 0) { go = 0; } else { if (WNX[p] == k) { WNX[p] = WNX[k]; go = 0; } else { p = WNX[p]; } } }
  }
  WIT[k] = 0;
  WNX[k] = wFree; wFree = k;
  nItems = nItems - 1;
}

// a random item for a spot of tier t (1 village .. 3 military)
function rollItem(t) {
  let r = rand(1, 100), it = 0;
  if (r <= 26) {
    // a gun: the tier decides how good
    let g = 0, tries = 0;
    while (g == 0) {
      let c = rand(1, NGUN);
      let gt = GTIER[c];
      if (gt <= t + 1) { if (gt == 4) { if (rand(1, 100) <= 25) { g = c; } } else { g = c; } }
      if (t == 1) { if (gt >= 3) { if (rand(1, 100) > 30) { g = 0; } } }
      tries = tries + 1;
      if (tries > 20) { g = 2; }
    }
    it = g;
  } else {
    if (r <= 40) { it = 30 + rand(1, 6); }
    else { if (r <= 52) { it = NGUN + rand(1, NATT); }
    else { if (r <= 58) { it = 36 + lvRoll(t); }
    else { if (r <= 64) { it = 39 + lvRoll(t); }
    else { if (r <= 69) { it = 42 + lvRoll(t); }
    else { if (r <= 80) { it = 46; }
    else { if (r <= 85) { it = 47; }
    else { if (r <= 87) { it = 48; }
    else { if (r <= 91) { it = 49; }
    else { if (r <= 93) { it = 50; }
    else { if (r <= 97) { it = 51; } else { it = 52; } } } } } } } } } } }
  }
  return it;
}
function lvRoll(t) {
  let r = rand(1, 100), lv = 1;
  if (r > 70 - t * 12) { lv = 2; }
  if (r > 96 - t * 4) { lv = 3; }
  return lv;
}
function countOf(it) {
  let n = 1;
  if (it >= 31) { if (it <= 36) { n = AMBOX[it - 30]; } }
  if (it == 46) { n = 5; }
  return n;
}
// fill the world: most spots get something; a gun comes with its ammo
function lootSpawn() {
  lootClear();
  let i = 1;
  while (i <= LSX.length) {
    if (rand(1, 100) <= 72) {
      let it = rollItem(LST[i]);
      itemAdd(it, LSX[i] + rand(-30, 30), LSY[i], LSZ[i] + rand(-30, 30), countOf(it));
      if (it <= NGUN) { itemAdd(30 + GAMMO[it], LSX[i] + rand(-50, 50), LSY[i], LSZ[i] + rand(-50, 50), AMBOX[GAMMO[it]]); }
      if (rand(1, 100) <= 25) { let it2 = rollItem(LST[i]); itemAdd(it2, LSX[i] + rand(-60, 60), LSY[i], LSZ[i] + rand(-60, 60), countOf(it2)); }
    }
    i = i + 1;
  }
}

// ---------------------------------------------------------------- taking
// how much room the backpack has left (ammo, meds, throwables count)
function capOf(e) { return 140 + EPACK[e] * 60; }
function loadOf(e) {
  let w = 0, t = 1;
  while (t <= 6) { w = w + ammoOf(e, t) * ITW[30 + t]; t = t + 1; }
  w = w + EBAND[e] * 2 + EKIT[e] * 10 + EMED[e] * 20 + EDRK[e] * 4 + EPILL[e] * 10 + EFRAG[e] * 12 + ESMK[e] * 14;
  return w;
}
// e takes item slot k if it is useful: tookLast 1 taken, 2 part of it, 0 left
let tookLast = 0;
function takeItem(e, k) {
  let it = WIT[k], n = WN[k], took = 0;
  let x = WX[k], y = WY[k], z = WZ[k];
  if (it <= NGUN) {
    // a gun: an empty slot, or swap with a worse one
    let pistol = 0;
    if (GCLS[it] == 1) { pistol = 1; }
    if (pistol == 1) {
      if (EG3[e] == 0) { EG3[e] = it; EA3[e] = 0; EM3[e] = 0; took = 1; } else { if (GTIER[EG3[e]] < GTIER[it]) { itemAdd(EG3[e], x, y, z, 1); EG3[e] = it; EA3[e] = 0; EM3[e] = 0; took = 1; } }
    } else {
      if (EG1[e] == 0) { EG1[e] = it; EA1[e] = 0; EM1[e] = 0; took = 1; if (ECUR[e] == 3) { if (e > 1) { ECUR[e] = 1; } } }
      else { if (EG2[e] == 0) { EG2[e] = it; EA2[e] = 0; EM2[e] = 0; took = 1; }
      else {
        // replace the worse primary (the player: the one in hand)
        let s = 1;
        if (e == 1) { s = ECUR[1]; if (s == 3) { s = 1; } } else { if (GTIER[EG2[e]] < GTIER[EG1[e]]) { s = 2; } }
        let old = EG1[e];
        if (s == 2) { old = EG2[e]; }
        if (e == 1 || GTIER[old] < GTIER[it]) {
          itemAdd(old, x, y, z, 1);
          dropAtts(e, s, x, y, z);
          if (s == 1) { EG1[e] = it; EA1[e] = 0; EM1[e] = 0; } else { EG2[e] = it; EA2[e] = 0; EM2[e] = 0; }
          took = 1;
        }
      } }
    }
    if (took == 1) { if (e == 1) { if (gunNow(1) == 0) { ECUR[1] = 1; } playerGunStats(); } }
  } else {
    if (it <= NGUN + NATT) {
      took = attachTo(e, it - NGUN);
    } else {
      if (it <= 36) {
        let room = Math.floor((capOf(e) - loadOf(e)) / ITW[it]);
        let m = Math.min(room, n);
        if (m > 0) { ammoAdd(e, it - 30, m); WN[k] = n - m; took = 1; if (WN[k] > 0) { took = 2; } }
      } else {
        if (it <= 39) { if (it - 36 > EHEL[e]) { if (EHEL[e] > 0) { itemAdd(36 + EHEL[e], x, y, z, 1); } EHEL[e] = it - 36; EHELD[e] = 80 + EHEL[e] * 40; took = 1; } }
        else { if (it <= 42) { if (it - 39 > EVES[e]) { if (EVES[e] > 0) { itemAdd(39 + EVES[e], x, y, z, 1); } EVES[e] = it - 39; EVESD[e] = 80 + EVES[e] * 50; took = 1; } }
        else { if (it <= 45) { if (it - 42 > EPACK[e]) { if (EPACK[e] > 0) { itemAdd(42 + EPACK[e], x, y, z, 1); } EPACK[e] = it - 42; took = 1; } }
        else {
          if (loadOf(e) + ITW[it] <= capOf(e)) {
            if (it == 46) { EBAND[e] = EBAND[e] + n; }
            if (it == 47) { EKIT[e] = EKIT[e] + 1; }
            if (it == 48) { EMED[e] = EMED[e] + 1; }
            if (it == 49) { EDRK[e] = EDRK[e] + 1; }
            if (it == 50) { EPILL[e] = EPILL[e] + 1; }
            if (it == 51) { EFRAG[e] = EFRAG[e] + 1; }
            if (it == 52) { ESMK[e] = ESMK[e] + 1; }
            took = 1;
          }
        } } }
      }
    }
  }
  if (took == 1) { itemRemove(k); }
  if (took > 0) { if (e == 1) { sfx(SND_PICK, 0); pickMsg = ITN[it]; pickMsgT = 1.2; } }
  tookLast = took;
}
let pickMsg = '', pickMsgT = 0;
// an attachment onto a gun that takes it and has the slot free (the gun in hand first)
let POW2 = [1, 2, 4, 8, 16, 32, 64, 128, 256];
function attachTo(e, ai) {
  let s = ASLOT[ai], ok = 0, k = 1;
  let order1 = ECUR[e];
  while (k <= 4) {
    let sl = k - 1;
    if (k == 1) { sl = order1; }
    if (sl >= 1) { if (sl <= 3) { if (ok == 0) {
      let g = 0, a = 0;
      if (sl == 1) { g = EG1[e]; a = EA1[e]; }
      if (sl == 2) { g = EG2[e]; a = EA2[e]; }
      if (sl == 3) { g = EG3[e]; a = EA3[e]; }
      if (g > 0) { if (mod(idiv(AFITS[ai], POW2[GCLS[g] + 1]), 2) == 1) { if (attIn(a, s) == 0) {
        a = attPut(a, s, ai);
        if (sl == 1) { EA1[e] = a; }
        if (sl == 2) { EA2[e] = a; }
        if (sl == 3) { EA3[e] = a; }
        ok = 1;
      } } }
    } } }
    k = k + 1;
  }
  if (e == 1) { if (ok == 1) { playerGunStats(); } }
  return ok;
}
// drop the attachments of slot s
function dropAtts(e, s, x, y, z) {
  let a = EA1[e];
  if (s == 2) { a = EA2[e]; }
  if (s == 3) { a = EA3[e]; }
  let k = 1;
  while (k <= 5) { let ai = attIn(a, k); if (ai > 0) { itemAdd(NGUN + ai, x + rand(-40, 40), y, z + rand(-40, 40), 1); } k = k + 1; }
}
// on death: everything on the ground in a small heap
function dropAll(e) {
  let x = EX[e], y = EY[e] + 2, z = EZ[e];
  if (EG1[e] > 0) { itemAdd(EG1[e], x + 40, y, z, 1); dropAtts(e, 1, x, y, z); }
  if (EG2[e] > 0) { itemAdd(EG2[e], x - 40, y, z, 1); dropAtts(e, 2, x, y, z); }
  if (EG3[e] > 0) { itemAdd(EG3[e], x, y, z + 40, 1); dropAtts(e, 3, x, y, z); }
  let t = 1;
  while (t <= 6) { if (ammoOf(e, t) > 0) { itemAdd(30 + t, x + rand(-60, 60), y, z + rand(-60, 60), ammoOf(e, t)); EAMMO[(e - 1) * 6 + t] = 0; } t = t + 1; }
  if (EHEL[e] > 0) { itemAdd(36 + EHEL[e], x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EVES[e] > 0) { itemAdd(39 + EVES[e], x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EPACK[e] > 0) { itemAdd(42 + EPACK[e], x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EBAND[e] > 0) { itemAdd(46, x + rand(-50, 50), y, z + rand(-50, 50), EBAND[e]); }
  if (EKIT[e] > 0) { itemAdd(47, x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EMED[e] > 0) { itemAdd(48, x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EDRK[e] > 0) { itemAdd(49, x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  if (EFRAG[e] > 0) { itemAdd(51, x + rand(-50, 50), y, z + rand(-50, 50), 1); }
  itemAdd(53, x, y, z, 0);
  EG1[e] = 0; EG2[e] = 0; EG3[e] = 0; EHEL[e] = 0; EVES[e] = 0; EPACK[e] = 0;
}

// the nearest item the player can take (in reach, roughly where they look)
function findPick() {
  pickItem = 0; pickD = 260;
  let cx = Math.floor((plX - 1600) / CS), cz = Math.floor((plZ - 1600) / CS);
  let iz = cz;
  while (iz <= cz + 1) {
    let ix = cx;
    while (ix <= cx + 1) {
      if (ix >= 0 && ix < CELLS && iz >= 0 && iz < CELLS) {
        let k = WCH[iz * CELLS + ix + 1];
        while (k > 0) {
          if (WIT[k] != 53) {
            let dx = WX[k] - plX, dz = WZ[k] - plZ, dy = WY[k] - plY;
            if (Math.abs(dy) < 150) {
              let d = Math.sqrt(dx * dx + dz * dz);
              // in front counts as nearer
              let fw = (dx * sind(plYaw) + dz * cosd(plYaw)) / (d + 1);
              let score = d * (1.4 - fw * 0.6);
              if (score < pickD) { pickD = score; pickItem = k; }
            }
          }
          k = WNX[k];
        }
      }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
}
function playerLoot() {
  findPick();
  if (pickItem > 0) {
    if (keyHit(70) == 1) { takeItem(1, pickItem); }
  }
}

// ---------------------------------------------------------------- healing (anyone)
// start using item kind: 1 bandage, 2 kit, 3 med kit, 4 drink, 5 painkiller
function useHeal(e, kind) {
  let ok = 0;
  if (EUSE[e] <= 0) {
    if (kind == 1) { if (EBAND[e] > 0) { if (EHP[e] < 75) { ok = 1; EUSE[e] = 4; } } }
    if (kind == 2) { if (EKIT[e] > 0) { if (EHP[e] < 75) { ok = 1; EUSE[e] = 6; } } }
    if (kind == 3) { if (EMED[e] > 0) { if (EHP[e] < 100) { ok = 1; EUSE[e] = 8; } } }
    if (kind == 4) { if (EDRK[e] > 0) { if (EBOOST[e] < 100) { ok = 1; EUSE[e] = 4; } } }
    if (kind == 5) { if (EPILL[e] > 0) { if (EBOOST[e] < 100) { ok = 1; EUSE[e] = 6; } } }
    if (ok == 1) { EUSEK[e] = kind; if (e == 1) { sfx(SND_HEAL, 0); } }
  }
}
function healStep(e, dt) {
  if (EUSE[e] > 0) {
    EUSE[e] = EUSE[e] - dt;
    if (EUSE[e] <= 0) {
      EUSE[e] = 0;
      let k = EUSEK[e];
      if (k == 1) { EBAND[e] = EBAND[e] - 1; EHP[e] = Math.min(75, EHP[e] + 10); }
      if (k == 2) { EKIT[e] = EKIT[e] - 1; EHP[e] = Math.max(EHP[e], 75); }
      if (k == 3) { EMED[e] = EMED[e] - 1; EHP[e] = 100; }
      if (k == 4) { EDRK[e] = EDRK[e] - 1; EBOOST[e] = Math.min(100, EBOOST[e] + 40); }
      if (k == 5) { EPILL[e] = EPILL[e] - 1; EBOOST[e] = Math.min(100, EBOOST[e] + 60); }
    }
  }
  // the boost heals slowly
  if (EBOOST[e] > 0) {
    EBOOST[e] = EBOOST[e] - dt * 0.9;
    if (EHP[e] < 100) { EHP[e] = Math.min(100, EHP[e] + dt * (0.4 + EBOOST[e] / 60)); }
  }
}
// the best heal for e now: 1..5 or 0
function bestHeal(e) {
  let k = 0;
  if (EHP[e] < 100) { if (EMED[e] > 0) { if (EHP[e] < 45) { k = 3; } } }
  if (k == 0) { if (EHP[e] < 75) { if (EKIT[e] > 0) { if (EHP[e] < 55) { k = 2; } } } }
  if (k == 0) { if (EHP[e] < 75) { if (EBAND[e] > 0) { k = 1; } } }
  if (k == 0) { if (EHP[e] < 75) { if (EKIT[e] > 0) { k = 2; } } }
  if (k == 0) { if (EHP[e] < 100) { if (EMED[e] > 0) { if (EHP[e] < 75) { k = 3; } } } }
  if (k == 0) { if (EBOOST[e] < 60) { if (EPILL[e] > 0) { k = 5; } else { if (EDRK[e] > 0) { k = 4; } } } }
  return k;
}

// ---------------------------------------------------------------- items on the ground, drawn
function drawItemDyn(k, dist) {
  let it = WIT[k];
  if (it > 0) { if (dist < 2600) { if (inView(WX[k], WY[k] + 20, WZ[k], 60) == 1) {
    let lod = 1;
    if (dist > 1200) { lod = 2; }
    let q = (ITM[it] - 1) * 3 + lod + 1;
    if (it <= NGUN) { q = (ITM[it] - 1) * 3 + lod + 1; }
    drawWorldModel(q, WX[k], WY[k], WZ[k], WYAW[k], 10, fogOf(dist));
  } } }
}
