// ===================================================================== (v3.3) brewing and potions, fishing, the crossbow and the rest of the charms
// Potions. One item for the drunk ones and one for the thrown: which potion lies in the slot's number
// (d = p + 20 x v: p 1 awkward, 2 night vision, 3 invisibility, 4 leaping, 5 fire resistance, 6 swiftness,
// 7 slowness, 8 water breathing, 9 healing, 10 harming, 11 poison, 12 regeneration, 13 strength,
// 14 weakness, 15 slow falling; v 0 plain, 1 long, 2 strong). PEF: the effect (23 and 24 are done at
// once, here), PT0 / PT1 / PT2 the seconds of the plain, the long and the strong one (0: there is none).
let PEF = [0, 8, 27, 4, 7, 1, 2, 12, 23, 24, 16, 5, 14, 18, 11];
let PT0 = [0, 180, 180, 180, 180, 180, 90, 180, 1, 1, 45, 45, 180, 90, 90];
let PT1 = [0, 480, 480, 480, 480, 480, 240, 480, 0, 0, 90, 90, 480, 240, 240];
let PT2 = [0, 0, 0, 90, 0, 90, 20, 0, 1, 1, 21, 22, 90, 0, 0];
let PKO = ['어색한 물약', '야간 투시', '투명화', '도약', '화염 저항', '신속', '감속', '수중 호흡', '즉시 회복', '즉시 피해', '독', '재생', '힘', '나약함', '느린 낙하'];
let poEf = 0, poLv = 1, poSec = 0, brOI = 0, brOD = 0;
function potionOf(d) {
  let p = mod(d, 20), v = idiv(d, 20);
  poEf = 0; poLv = 1; poSec = 0;
  if (p >= 1 && p <= 15) {
    poEf = PEF[p]; poSec = PT0[p];
    if (v == 1) { poSec = PT1[p]; }
    if (v == 2) { poSec = PT2[p]; poLv = 2; if (p == 7) { poLv = 4; } }
  }
}
// the words under a potion's name (into enS, as an item's charms)
function potionDesc(d) {
  let p = mod(d, 20);
  if (p >= 1 && p <= 15) {
    potionOf(d);
    enS = PKO[p];
    if (poLv > 1) { enS = `${enS} ${romanOf(poLv)}`; }
    if (poSec > 1) { let ss = mod(poSec, 60); if (ss < 10) { enS = `${enS} (${idiv(poSec, 60)}:0${ss})`; } else { enS = `${enS} (${idiv(poSec, 60)}:${ss})`; } }
  }
}
// potion d on the player (k: how much of it, 1 drunk, less at the edge of a splash)
function potionApply(d, k) {
  potionOf(d);
  if (poEf == 23) { hp = Math.min(20, hp + Math.round(4 * poLv * k)); }
  else { if (poEf == 24) { let n = Math.round(6 * poLv * k); if (n > 0) { hurtT = 0; hurtM(n, '마법에 당했습니다'); } }
  else { if (poEf > 0) {
    let s = Math.round(poSec * k);
    if (s > 0) { if (fx(poEf) <= poLv) { if (fx(poEf) < poLv || EFT[poEf] < s) { effectAdd(poEf, s, poLv); } } }
  } } }
}
// what ingredient ing makes of the bottle (id, d): brOI, brOD (0: nothing)
function brewOut(ing, id, d) {
  brOI = 0; brOD = 0;
  let p = mod(d, 20), v = idiv(d, 20), q = 0;
  if (id == I_waterBottle) {
    if (ing == I_wailWart) { brOI = I_potion; brOD = 1; }
    if (ing == I_fermentedEye) { brOI = I_potion; brOD = 14; }
  }
  if (id == I_potion || id == I_splashPotion) { if (p >= 1 && p <= 15) {
    if (ing == I_gunpowder) { if (id == I_potion) { brOI = I_splashPotion; brOD = d; } }
    if (ing == I_sparkDust) { if (v == 0) { if (PT1[p] > 0) { brOI = id; brOD = p + 20; } } }
    if (ing == I_glowDust) { if (v == 0) { if (PT2[p] > 0) { brOI = id; brOD = p + 40; } } }
    if (ing == I_fermentedEye) {
      // the eye turns it: night vision to invisibility, leaping and swiftness to slowness (not their
      // strong ones), healing and poison to harming (a long poison to the plain one)
      let nv = v;
      if (p == 2) { q = 3; }
      if (p == 4 || p == 6) { if (v < 2) { q = 7; } }
      if (p == 9 || p == 11) { q = 10; if (v == 1) { nv = 0; } }
      if (q > 0) { brOI = id; brOD = q + 20 * nv; }
    }
    if (p == 1) {
      if (ing == I_sugar) { q = 6; } if (ing == I_rabbitFoot) { q = 4; } if (ing == I_blazePowder) { q = 13; }
      if (ing == I_glisterMelon) { q = 9; } if (ing == I_spiderEye) { q = 11; } if (ing == I_ghostTear) { q = 12; }
      if (ing == I_magmaCream) { q = 5; } if (ing == I_pufferfish) { q = 8; } if (ing == I_goldenCarrot) { q = 2; }
      if (ing == I_membrane) { q = 15; }
      if (q > 0) { brOI = id; brOD = q; }
    }
  } }
}

// ---------------------------------------------------------------- the brewing stand
// It keeps its things as a chest does (the chest record of its cell: slots 1 to 3 the bottles, 4 what is
// brewed in, 5 the blaze powder; the count of slot 6, which no screen shows and which holds no item, is
// how many brews the powder burning is still good for). So a world kept, a server and the map text keep
// it as they keep a chest. A brew takes 20 s and one of the ingredient, a powder is good for 20 brews.
// It works while its chunk is there; on a server the host's screen does it (as the hoppers).
let brT = 0, BRT = [];
function brewStandsStep(dt) {
  brT = brT + dt;
  if (brT >= 0.5) {
    let el = brT, c = 1;
    brT = 0;
    while (BRT.length < NCHEST) { BRT.push(0); }
    while (c <= NCHEST) {
      if (CHON[c] == 1) {
        if (CHI[(c - 1) * 27 + 4] > 0) { if (idiv(CHY[c], 1000) == dim) { brewStand(c, (c - 1) * 27, el); } } else { BRT[c] = 0; }
      }
      c = c + 1;
    }
  }
}
function brewStand(c, base, el) {
  let k = 1, any = 0, ing = CHI[base + 4];
  while (k <= 3) {
    if (CHI[base + k] >= I_waterBottle) { if (CHI[base + k] <= I_splashPotion) { brewOut(ing, CHI[base + k], CHD[base + k]); if (brOI > 0) { any = 1; } } }
    k = k + 1;
  }
  if (any == 1) {
    if (cOK(CHX[c], CHZ[c]) == 0) { any = 0; }
    else { if (blockAt(CHX[c], CHY[c] - dim * 1000, CHZ[c]) != I_brewingStand) { any = 0; } }
  }
  if (any == 1) {
    let host = 1;
    if (netSrv > 0) { if (netSt == 2) { if (netHost == 0) { host = 0; } } }
    if (CHN[base + 6] <= 0) { if (host == 1) { if (CHI[base + 5] == I_blazePowder) {
      CHN[base + 5] = CHN[base + 5] - 1; if (CHN[base + 5] <= 0) { CHI[base + 5] = 0; CHN[base + 5] = 0; CHD[base + 5] = 0; }
      CHI[base + 6] = 0; CHN[base + 6] = 20; CHD[base + 6] = 0;
      chestSay(c, 5); chestSay(c, 6);
    } } }
    if (CHN[base + 6] > 0) {
      BRT[c] = BRT[c] + el;
      if (BRT[c] >= 20) {
        BRT[c] = 0;
        if (host == 1) {
          k = 1;
          while (k <= 3) {
            if (CHI[base + k] >= I_waterBottle) { if (CHI[base + k] <= I_splashPotion) {
              brewOut(ing, CHI[base + k], CHD[base + k]);
              if (brOI > 0) { CHI[base + k] = brOI; CHN[base + k] = 1; CHD[base + k] = brOD; chestSay(c, k); }
            } }
            k = k + 1;
          }
          CHN[base + 4] = CHN[base + 4] - 1; if (CHN[base + 4] <= 0) { CHI[base + 4] = 0; CHN[base + 4] = 0; CHD[base + 4] = 0; }
          CHN[base + 6] = CHN[base + 6] - 1;
          chestSay(c, 4); chestSay(c, 6); chestTouched(c);
          if (uiMode == 4 && curChest == c) { sndPlay(6); }
        }
      }
    } else { BRT[c] = 0; }
  } else { BRT[c] = 0; }
}
function brewOpen(x, y, z) {
  chestAt(x, y, z);
  if (cFound > 0) { curChest = cFound; curCap = 5; uiOpen(4); } else { msgShow('상자가 너무 많습니다', 2); }
}
// over the chest screen when it is a brewing stand's: its name, what the slots are for, how far the brew is
function brewScreen() {
  let c = curChest, on = 0;
  if (curCap == 5) { if (c > 0 && c < NCHEST) { if (CHON[c] == 1) { if (blockAt(CHX[c], CHY[c] - dim * 1000, CHZ[c]) == I_brewingStand) { on = 1; } } } }
  if (on == 1) {
    let t = 0, ch = CHN[(c - 1) * 27 + 6];
    if (c <= BRT.length) { t = BRT[c]; }
    tx(20, '양조대', -80, 86, 8, '#404040', 1);
    tx(105, '병 · 병 · 병', -54, 52, 6, '#404040', 0);
    tx(106, '재료', -18, 52, 6, '#404040', 0);
    tx(107, '연료', 0, 52, 6, '#404040', 0);
    box(20, 70, 80, 64, '#8b8b8b');
    if (t > 0) { box(20, 70, 20 + 3 * t, 64, '#ffffff'); }
    box(20, 60, 80, 57, '#8b8b8b');
    if (ch > 0) { box(20, 60, 20 + 3 * ch, 57, '#f08020'); }
    gS = `남은 연료 ${ch}회`;
    if (t > 0) { gS = `양조 중 ${Math.ceil(20 - t)}초 · 남은 연료 ${ch}회`; }
    tx(108, gS, 84, 46, 6, '#404040', 2);
  }
}

// ---------------------------------------------------------------- in the hand: bottles, potions, the rod, the crossbow
// useLatch: one press does one thing (a rod cast, a crossbow shot) however long the button is held
let drinkId = 0, drinkT = 0, useLatch = 0, cbOn = 0, cbT = 0;
let fishA = 0, fishSt = 0, fishT = 0, fishB = 0, fishSlot = 0, fishLure = 0, fishLuck = 0;
let soulSp = 1, soulD = 0, soulX = 0, soulZ = 0, invisK = 1, prcAny = 0, PRCN = [];
function brewUse(id) {
  let r = 0;
  if (id >= I_glassBottle) { if (id <= I_crossbowLoaded) {
    if (id == I_potion || id == I_waterBottle) { r = 1; if (drinkId != id) { drinkId = id; drinkT = 0; } }
    if (id == I_glassBottle) {
      liquidRay();
      if (lqB > 0) { if (BLQ[lqB + 1] == 7) {
        r = 1; placeCool = 0.3; sndPlay(5);
        if (mod(gameMode, 2) == 0) { takeHeld(1); }
        addItem(I_waterBottle, 1, 0); if (addLeft > 0) { dropItem(I_waterBottle, 1, 0, px, py + 1, pz, 1); }
      } }
    }
    if (id == I_splashPotion) { r = 1; placeCool = 0.3; splashThrow(); }
    if (id == I_fishingRod) { r = 1; if (useLatch == 0) { useLatch = 1; placeCool = 0.3; fishUse(); } }
    if (id == I_crossbow) {
      r = 1;
      if (cbOn == 0 && useLatch == 0) {
        if (bowArrow() > 0 || gameMode == 1) { cbOn = 1; cbT = 0; } else { useLatch = 1; msgShow('화살이 없습니다', 1.5); }
      }
    }
    if (id == I_crossbowLoaded) { r = 1; if (useLatch == 0) { useLatch = 1; placeCool = 0.3; crossbowShoot(); } }
  } }
  return r;
}
// each frame of the game (from frostStep)
function brewPlayerStep(dt) {
  let id = INVI[hotSel], dn = 0;
  if (uiMode == 0) { if (dead == 0) { dn = useDown(); } }
  if (dn == 0) { useLatch = 0; }
  // a potion or water drunk: 1.6 s with the button held, the bottle stays
  if (drinkId > 0) {
    if (dn == 1 && id == drinkId) {
      drinkT = drinkT + dt; swingT = Math.max(swingT, 0.1);
      if (mod(Math.floor(drinkT * 5), 2) == 0) { if (frac(drinkT * 5) < dt * 5) { sndPlay(5); } }
      if (drinkT >= 1.6) {
        if (id == I_potion) { potionApply(INVD[hotSel], 1); }
        if (mod(gameMode, 2) == 0) { INVI[hotSel] = I_glassBottle; INVN[hotSel] = 1; INVD[hotSel] = 0; }
        drinkId = 0; drinkT = 0; placeCool = 0.5; useLatch = 1;
      }
    } else { drinkId = 0; drinkT = 0; }
  }
  // the crossbow drawn: 1.25 s (a quarter less a level of quick charge), then it is loaded and stays so
  if (cbOn == 1) {
    if (dn == 1 && id == I_crossbow) {
      cbT = cbT + dt; swingT = Math.max(swingT, 0.1);
      if (cbT >= 1.25 - 0.25 * heldLv(34)) {
        let a = bowArrow();
        cbOn = 0; cbT = 0; useLatch = 1;
        if (a > 0 || gameMode == 1) {
          if (gameMode != 1) { INVN[a] = INVN[a] - 1; if (INVN[a] <= 0) { INVI[a] = 0; INVN[a] = 0; } }
          INVI[hotSel] = I_crossbowLoaded; sndPlay(6);
        }
      }
    } else { cbOn = 0; cbT = 0; }
  }
  // the float is taken in when the rod leaves the hand or it is 32 blocks away
  if (fishA > 0) {
    let gone = 0;
    if (AON[fishA] != 14 || id != I_fishingRod || hotSel != fishSlot || dead == 1) { gone = 1; }
    else { if ((AXX[fishA] - px) * (AXX[fishA] - px) + (AZZ[fishA] - pz) * (AZZ[fishA] - pz) > 1024) { gone = 1; } }
    if (gone == 1) { if (AON[fishA] == 14) { AON[fishA] = 0; } fishA = 0; }
  }
  // soul speed (charm 38, boots): quicker on wail sand and soil, and 4 in 100 a block it wears the boots
  soulSp = 1;
  if (underB == I_wailSand || underB == I_wailSoil) {
    let l = armLv(40, 38);
    if (l > 0) {
      soulSp = 1.3 + 0.105 * l;
      soulD = Math.min(2, soulD + Math.sqrt((px - soulX) * (px - soulX) + (pz - soulZ) * (pz - soulZ)));
      if (soulD >= 1) { soulD = soulD - 1; if (mod(gameMode, 2) == 0) { if (rand(1, 100) <= 4) { INVD[40] = INVD[40] + enWear(INVI[40], INVD[40], 1, 1); } } }
    }
  }
  soulX = px; soulZ = pz;
  // invisible: monsters notice from 7 in 100 of their distance, and 17.5 more for each piece of armour worn
  invisK = 1;
  if (fx(27) > 0) { let s = 37; invisK = 0.07; while (s <= 40) { if (INVI[s] > 0) { invisK = invisK + 0.175; } s = s + 1; } }
  // a piercing arrow that stuck or is gone pierces no more
  if (prcAny == 1) {
    let a = 1, n = 0;
    while (a <= NARR) { if (PRCN[a] > 0) { if (AON[a] != 2 || ASTK[a] == 1) { PRCN[a] = 0; } else { n = 1; } } a = a + 1; }
    prcAny = n;
  }
}
// what some food does more (after it is eaten): a stew leaves its bowl
function brewAte(id) {
  if (id == I_beetSoup || id == I_mushStew) { if (mod(gameMode, 2) == 0) {
    if (INVI[hotSel] == 0) { INVI[hotSel] = I_bowl; INVN[hotSel] = 1; INVD[hotSel] = 0; }
    else { addItem(I_bowl, 1, 0); if (addLeft > 0) { dropItem(I_bowl, 1, 0, px, py + 1, pz, 1); } }
  } }
  if (id == I_chickenRaw) { if (rand(1, 10) <= 3) { effectAdd(15, 30, 1); } }
  if (id == I_pufferfish) { effectAdd(16, 60, 2); effectAdd(15, 15, 3); effectAdd(26, 15, 1); }
  if (id == I_spiderEye) { effectAdd(16, 5, 1); }
}

// ---------------------------------------------------------------- the thrown potion (AON 13)
function splashThrow() {
  let a = 1, s = 0;
  while (a <= NARR) { if (s == 0) { if (AON[a] == 0) { s = a; } } a = a + 1; }
  if (s > 0) {
    AXX[s] = camX + lookX * 0.4; AYY[s] = camY - 0.1 + lookY * 0.4; AZZ[s] = camZ + lookZ * 0.4;
    AVX[s] = lookX * 13; AVY[s] = lookY * 13 + 4; AVZ[s] = lookZ * 13; AAGE[s] = 0; ASTK[s] = 0;
    AON[s] = 13; AEN[s] = INVD[hotSel]; APW[s] = 0;
    swingT = 0.3; sndPlay(1);
    netArrowSay(s);
    if (mod(gameMode, 2) == 0) { takeHeld(1); }
  }
}
// the things of this file in the arrows' slots: 13 a thrown potion, 14 the rod's float, 15 a trident coming back
function brewShotStep(a, dt) {
  let k = AON[a];
  if (k == 13) {
    AVY[a] = AVY[a] - 20 * dt;
    let nx = AXX[a] + AVX[a] * dt, ny = AYY[a] + AVY[a] * dt, nz = AZZ[a] + AVZ[a] * dt, hit = 0, e = 1;
    if (BSOL[blockAt(Math.floor(nx), Math.floor(ny), Math.floor(nz)) + 1] > 0) { hit = 1; } else { AXX[a] = nx; AYY[a] = ny; AZZ[a] = nz; }
    if (APW[a] < 0 && AAGE[a] < 0.3) { e = NMOB + 1; }
    while (e <= NMOB && hit == 0) {
      if (ET[e] > 0) {
        let w = MW[ET[e]] / 2 + 0.1;
        if (Math.abs(AXX[a] - EX[e]) < w && Math.abs(AZZ[a] - EZ[e]) < w && AYY[a] > EY[e] && AYY[a] < EY[e] + MH[ET[e]]) { hit = 1; }
      }
      e = e + 1;
    }
    if (hit == 1) { if (APW[a] >= 0) { splashHit(a); } AON[a] = 0; }
  }
  if (k == 14) { floatStep(a, dt); }
  if (k == 15) { tridentBack(a, dt); }
  if (k > 15) { AON[a] = 0; }
}
// where it breaks: on every mob within 4 blocks, less the farther (harming, and healing on the dead that
// walk, hurt; healing mends; poison takes what it would in its time, never the last point), and on the
// thrower if near. (The other effects are the player's only: a mob has none.)
function splashHit(a) {
  let d = AEN[a], x = AXX[a], y = AYY[a], z = AZZ[a], e = 1;
  potionOf(d);
  let ef = poEf, lv = poLv, sec = poSec;
  sndPlay(7);
  while (e <= NMOB) {
    if (ET[e] > 0) {
      let q = (EX[e] - x) * (EX[e] - x) + (EY[e] + 0.5 - y) * (EY[e] + 0.5 - y) + (EZ[e] - z) * (EZ[e] - z);
      if (q < 16) {
        let part = 1 - Math.sqrt(q) / 4, t = ET[e], und = isDead(t), n = 0;
        if (t == M_SKELETON || t == M_BLACKSKEL) { und = 1; }
        if (ef == 24) { if (und == 0) { n = 6 * lv * part; } else { EHP[e] = Math.min(MHP[t], EHP[e] + 4 * lv * part); } }
        if (ef == 23) { if (und == 1) { n = 6 * lv * part; } else { EHP[e] = Math.min(MHP[t], EHP[e] + 4 * lv * part); } }
        if (ef == 16) { if (und == 0) { n = Math.min(EHP[e] - 1, sec * 0.8 * lv * part); } }
        n = Math.round(n);
        if (n > 0) { if (isProxy(e) == 1) { netHit(e, n); } else { pKill = 1; EHURT[e] = 0; mobHurt(e, n, 0, 0); pKill = 0; } }
      }
    }
    e = e + 1;
  }
  let pq = (px - x) * (px - x) + (py + 0.9 - y) * (py + 0.9 - y) + (pz - z) * (pz - z);
  if (pq < 16) { potionApply(d, 1 - Math.sqrt(pq) / 4); }
}
function brewShotDraw(a, fog) {
  let x = AXX[a], y = AYY[a], z = AZZ[a];
  if (AON[a] == 13) { fwSeg(x, y + 0.12, z, x, y - 0.12, z, 0.1, CPOT, 20, fog); }
  if (AON[a] == 14) {
    fwSeg(x, y + 0.14, z, x, y, z, 0.07, CFWR, 20, fog); fwSeg(x, y, z, x, y - 0.1, z, 0.07, CFANG, 20, fog);
    // its line to the hand
    if (APW[a] >= 0) { fwSeg(x, y + 0.14, z, camX + lookX * 0.8 + lookZ * 0.3, camY - 0.25, camZ + lookZ * 0.8 - lookX * 0.3, 0.008, CFANG, 20, fog); }
  }
  if (AON[a] == 15) { fwSeg(x, y, z, x - AVX[a] * 0.04, y - AVY[a] * 0.04, z - AVZ[a] * 0.04, 0.06, CBEAM, 16, fog); }
}

// ---------------------------------------------------------------- fishing
// The rod used throws its float (AON 14; fishSt 0 flying, 1 on the water, 2 a bite, 3 on the ground).
// On water a bite comes after 5 to 30 s (5 less a level of lure): the float dips for a second, and the
// rod used then pulls out a catch - 85 in 100 a fish (cod 60, salmon 25, a tropical fish 2, a pufferfish
// 13), 10 junk, 5 a treasure; a level of luck of the sea takes 1.95 from the junk and gives 2.1 to the
// treasure - with 1 to 6 experience, and wears the rod a point. (The float is seen by its owner only.)
function fishUse() {
  if (fishA > 0) { if (AON[fishA] != 14) { fishA = 0; } }
  if (fishA == 0) {
    let a = 1, s = 0;
    while (a <= NARR) { if (s == 0) { if (AON[a] == 0) { s = a; } } a = a + 1; }
    if (s > 0) {
      AXX[s] = camX + lookX * 0.4; AYY[s] = camY - 0.1 + lookY * 0.4; AZZ[s] = camZ + lookZ * 0.4;
      AVX[s] = lookX * 13; AVY[s] = lookY * 13 + 4; AVZ[s] = lookZ * 13; AAGE[s] = 0; ASTK[s] = 0;
      AON[s] = 14; AEN[s] = 0; APW[s] = 0;
      fishA = s; fishSt = 0; fishSlot = hotSel;
      enDec(I_fishingRod, INVD[hotSel]); fishLure = ENL[36]; fishLuck = ENL[37];
      swingT = 0.3; sndPlay(1);
    }
  } else {
    if (fishSt == 2) { fishCatch(fishA); }
    AON[fishA] = 0; fishA = 0; swingT = 0.3;
  }
}
function fishWait() { fishT = Math.max(1, rand(50, 300) / 10 - 5 * fishLure); }
function floatStep(a, dt) {
  AAGE[a] = 1;
  if (a != fishA || APW[a] < 0) { AON[a] = 0; }
  else {
    if (fishSt == 0) {
      AVY[a] = AVY[a] - 20 * dt;
      let nx = AXX[a] + AVX[a] * dt, ny = AYY[a] + AVY[a] * dt, nz = AZZ[a] + AVZ[a] * dt;
      let hb = blockAt(Math.floor(nx), Math.floor(ny), Math.floor(nz));
      if (BLQ[hb + 1] == 7) { fishSt = 1; AXX[a] = nx; AZZ[a] = nz; fishB = Math.floor(ny) + 0.85; AYY[a] = fishB; fishWait(); sndPlay(5); }
      else { if (BSOL[hb + 1] > 0) { fishSt = 3; } else { AXX[a] = nx; AYY[a] = ny; AZZ[a] = nz; } }
    } else {
      if (fishSt == 1) {
        fishT = fishT - dt; AYY[a] = fishB + sind(frameNo * 6) * 0.03;
        if (fishT <= 0) { fishSt = 2; fishT = 1; AYY[a] = fishB - 0.3; sndPlay(5); }
      } else {
        if (fishSt == 2) { fishT = fishT - dt; if (fishT <= 0) { fishSt = 1; AYY[a] = fishB; fishWait(); } }
      }
    }
  }
}
// item id with the charms an enchanting table would give it for 30 levels, worn a little: its number
function fishEnch(id) {
  enGen(id, 30, rand(1, 2000000000));
  enDec(id, 0);
  let k = 1;
  while (k <= ENGK.length) { ENL[ENGK[k]] = ENGL[k]; k = k + 1; }
  return enEnc(id, rand(0, idiv(ITDUR[id + 1], 4)));
}
// a second book (the ten later charms) with charm k at a level at random
function enBook2(k) {
  if (ENL.length < 38) { enInit(); }
  let j = 1;
  while (j <= 38) { ENL[j] = 0; j = j + 1; }
  ENL[k] = rand(1, ENMAX[k]);
  return enEnc(I_enchantedBook2, 0);
}
function fishCatch(a) {
  let r = rand(1, 1000), tre = 50 + 21 * fishLuck, junk = 100 - 19.5 * fishLuck, id = I_codRaw, d = 0, n = 1, f = rand(1, 100);
  if (r <= tre) {
    f = rand(1, 5);
    if (f == 1) { id = 125; d = fishEnch(125); }
    if (f == 2) { if (rand(1, 4) == 1) { id = I_enchantedBook2; d = enBook2(rand(29, 37)); } else { id = I_enchantedBook; d = enRandomBook(); } }
    if (f == 3) { id = I_fishingRod; d = fishEnch(I_fishingRod); }
    if (f == 4) { id = I_tinyNote; }
    if (f == 5) { id = I_saddle; }
  } else {
    if (r <= tre + junk) {
      f = rand(1, 11);
      id = I_bowl;
      if (f == 2) { id = 117; } if (f == 3) { id = 113; } if (f == 4) { id = I_waterBottle; } if (f == 5) { id = 114; }
      if (f == 6) { id = 100; } if (f == 7) { id = I_inkSac; n = 10; } if (f == 8) { id = 112; } if (f == 9) { id = I_tripwireHook; }
      if (f == 10) { id = I_fishingRod; d = rand(6, 57); } if (f == 11) { id = I_lilyPad; }
    } else {
      if (f > 60) { id = I_salmonRaw; } if (f > 85) { id = I_tropicalFish; } if (f > 87) { id = I_pufferfish; }
    }
  }
  dropItem(id, n, d, AXX[a], AYY[a] + 0.4, AZZ[a], 0);
  if (lastItem > 0) { IVX[lastItem] = (px - AXX[a]) / 0.9; IVZ[lastItem] = (pz - AZZ[a]) / 0.9; IVY[lastItem] = (py + 1 - AYY[a]) / 0.9 + 9; }
  xpAdd(rand(1, 6)); wearHeld(1); sndPlay(6);
}

// ---------------------------------------------------------------- the crossbow
// Loaded (another item, I_crossbowLoaded, with the same number: its charms and wear) it shoots at the next
// use: an arrow at 1.05 of a full bow's speed that hurts 6 to 11. Multishot (33): three, 10 degrees
// apart, the outer two not to be picked up, three points of wear. Piercing (35): through a mob a level.
function crossbowShoot() {
  enDec(INVI[hotSel], INVD[hotSel]);
  let ms = ENL[33], pc = ENL[35], k = 0 - ms;
  while (PRCN.length < NARR) { PRCN.push(0); }
  while (k <= ms) {
    let yw = yaw + k * 10;
    shotEn = 0; if (k != 0) { shotEn = 1; }
    shotPow = 1.05;
    arrowShoot(camX, camY - 0.1, camZ, camX + sind(yw) * cosd(pitch) * 20, camY - 0.1 + sind(pitch) * 20, camZ + cosd(yw) * cosd(pitch) * 20, 1);
    if (lastArr > 0) { APW[lastArr] = rand(6, 11) / 7; PRCN[lastArr] = pc; if (pc > 0) { prcAny = 1; } }
    k = k + 1;
  }
  shotEn = 0; shotPow = 1;
  INVI[hotSel] = I_crossbow;
  wearHeld(1 + 2 * ms); swingT = 0.3; sndPlay(1);
}
// the player's arrow a hit mob e: does it go on (1)? It is put past the mob, so it meets the next one
function pierceOn(a, e) {
  let r = 0;
  if (prcAny == 1) { if (AON[a] == 2) { if (PRCN[a] > 0) {
    let l = Math.sqrt(AVX[a] * AVX[a] + AVZ[a] * AVZ[a]) + 0.01, w = 1.2;
    if (ET[e] > 0) { w = MW[ET[e]] + 0.4; }
    PRCN[a] = PRCN[a] - 1; r = 1;
    AXX[a] = AXX[a] + AVX[a] / l * w; AZZ[a] = AZZ[a] + AVZ[a] / l * w;
  } } }
  return r;
}

// ---------------------------------------------------------------- the trident's charms
// (a thrown trident's number is in its AEN: -100 - d)
// impaling (32): 2.5 a level more on what lives in water; channeling (31): lightning on the one hit in a
// thunderstorm under the open sky
function tridentHits(a, e) {
  let r = 0;
  if (AEN[a] <= 0 - 100) {
    enDec(I_trident, 0 - AEN[a] - 100);
    if (ENL[32] > 0) { if (MSWIM[ET[e]] > 0) { r = 2.5 * ENL[32]; } }
    if (ENL[31] > 0) { if (wthr == 2) { if (rainOn(Math.floor(EX[e]), Math.floor(EY[e]) + 2, Math.floor(EZ[e])) == 1) { lightning(EX[e], EY[e], EZ[e]); } } }
  }
  return r;
}
// loyalty (29): where it stops it turns and comes back to its thrower (AON 15), quicker the higher
function tridentLoyal(a) {
  let r = 0;
  if (AEN[a] <= 0 - 100) { if (APW[a] >= 0) { if (enLv(I_trident, 0 - AEN[a] - 100, 29) > 0) { r = 1; AON[a] = 15; ASTK[a] = ENL[29]; AAGE[a] = 0; } } }
  return r;
}
function tridentBack(a, dt) {
  let dx = px - AXX[a], dy = py + 1 - AYY[a], dz = pz - AZZ[a], d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01, sp = 10 + 6 * ASTK[a];
  if (APW[a] < 0) { AON[a] = 0; }
  else {
    if (d < 1.2 && dead == 0) {
      let du = 0 - AEN[a] - 100 + 1;
      AON[a] = 0; sndPlay(6);
      addItem(I_trident, 1, du); if (addLeft > 0) { dropItem(I_trident, 1, du, px, py + 1, pz, 0); }
    } else {
      if (AAGE[a] > 15) { ASTK[a] = 0; tridentDrop0(a); }
      else { AVX[a] = dx / d * sp; AVY[a] = dy / d * sp; AVZ[a] = dz / d * sp; AXX[a] = AXX[a] + AVX[a] * dt; AYY[a] = AYY[a] + AVY[a] * dt; AZZ[a] = AZZ[a] + AVZ[a] * dt; }
    }
  }
}
// riptide (30): in water or rain the trident let go carries its thrower and stays in the hand; dry it
// does nothing (1: the trident has riptide, it is not thrown)
function riptideGo() {
  let r = 0, l = heldLv(30);
  if (l > 0) {
    r = 1;
    if (inW == 1 || rainOn(Math.floor(px), Math.floor(py) + 1, Math.floor(pz)) == 1) {
      let v = 9 + 6 * l;
      pvx = lookX * v; pvy = lookY * v + 4; pvz = lookZ * v; fallTop = py;
      wearHeld(1); sndPlay(2); swingT = 0.3;
    }
  }
  return r;
}
