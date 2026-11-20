// ===================================================================== (v3.3) the fight as the genre has it: the blow's charge, the shield, the other hand, what is dropped at death

// ---------------------------------------------------------------- the blow's charge
// As 1.16.5 each thing in hand is ready again 1 / its speed seconds after a blow (or after the hand
// changed): the sword 1.6 a second, the axe 0.8 (iron 0.9, diamond and better and gold 1), the pickaxe
// 1.2, the shovel 1, the hoe 1 2 3 4 by its stuff (gold 1), the trident 1.1, anything else 4.
// attackCool (main.js counts it down) is what is left of that time, so 0 or less is a full blow; the
// charge f is the share gone by, half a tick ahead as the genre counts it. What a blow does with f is
// in attack (mobs.js).
let atkSel = 0, atkId = 0;
function atkSpeed(id) {
  let r = 4, k = ITTK[id + 1], t = ITTT[id + 1];
  if (k == 0) { r = 1.2; }
  if (k == 1) { r = 0.8; if (t == 2) { r = 0.9; } if (t >= 3) { r = 1; } }
  if (k == 2) { r = 1; }
  if (k == 3) { r = 1.6; }
  if (k == 4) { r = 1; if (t >= 1 && t <= 4) { r = Math.min(4, t + 1); } }
  if (k == 7) { r = 1.1; }
  return r;
}
function atkCharge() {
  let f = 1 - (attackCool - 0.025) * atkSpeed(INVI[hotSel]);
  if (f > 1) { f = 1; } if (f < 0) { f = 0; }
  return f;
}

// ---------------------------------------------------------------- the other hand, the shield
// INVI[41] is the other hand (slot 89 on the inventory screens, a slot left of the hotbar). F changes
// the two hands where the mouse's buttons are told (mbSeen; elsewhere F is still the use key and the
// slot is filled on the inventory screen). Holding use with a shield in either hand raises it (the
// other hand's only when the hand holds nothing that use places, eats or throws); after 0.25 s it
// stops a mob's blow (the mob that just struck, else the nearest within 4 blocks) or an arrow coming
// from the half the player looks into: no hurt, the shield worn by the hurt + 1 when that is 3 or
// more. The axe raider's blow is stopped and knocks the shield away for 5 s. The player walks as
// slowly as when eating. Another player's blow on a server (its hurt is no mob's: the nearest player
// within 4 blocks is taken for the one who struck) is stopped the same way; their axe knocks nothing
// away (what they held is not told). A stopped blow (shHit) neither bites nor knocks (mobs.js).
// kbK: what is left of a knock - each piece of the abyss armour (162..165) takes a tenth.
let shUp = 0, shT = 0, shOff = 0, shHand = 0, shotSrc = 0, mbSeen = 0, useDid = 0, spChk = 0, armDurOk = 0, shHit = 0, kbK = 1;
function kbKeep() {
  let s = 37;
  kbK = 1;
  while (s <= 40) { if (INVI[s] >= 162 && INVI[s] <= 165) { kbK = kbK - 0.1; } s = s + 1; }
}
function handSwap() {
  let a = INVI[hotSel], b = INVN[hotSel], c = INVD[hotSel];
  INVI[hotSel] = INVI[41]; INVN[hotSel] = INVN[41]; INVD[hotSel] = INVD[41];
  INVI[41] = a; INVN[41] = b; INVD[41] = c;
}
function offTake() { INVN[41] = INVN[41] - 1; if (INVN[41] <= 0) { INVI[41] = 0; INVN[41] = 0; INVD[41] = 0; } }
// use: the hand first; if it did nothing (and holds no block to put) what the other hand holds is
// used as if it were in the hand - a block or a torch put, food eaten, a thing thrown, a rocket
function useBoth() {
  useDid = 0;
  useKey();
  if (useDid == 0) {
    let o = INVI[41], m = INVI[hotSel];
    if (o > 0 && ITPLB[m + 1] == 0 && m != I_shield) { if (ITPLB[o + 1] > 0 || ITFOOD[o + 1] > 0 || ITTHROW[o + 1] > 0 || o == I_fireworkRocket) {
      handSwap(); useKey0(); handSwap();
    } }
  }
}
// the totem saves from either hand
function totemAny() {
  let r = totemSave();
  if (r == 0) { if (INVI[41] == I_totem) { handSwap(); r = totemSave(); handSwap(); } }
  return r;
}
function shieldStop(n) {
  let r = 0, sx = 0, sz = 0, by = 0;
  if (shotSrc > 0) { sx = 0 - AVX[shotSrc]; sz = 0 - AVZ[shotSrc]; by = 0 - 1; }
  else {
    let e = 1, best = 99, d = 0;
    while (e <= NMOB) {
      if (ET[e] > 0) { if ((MDMG[ET[e]] > 0 && hurtMob == 1) || (ET[e] == M_NETPLAYER && hurtMob == 0)) {
        d = (EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz);
        if (d < 16 && Math.abs(EY[e] - py) < 4) { if (EATK[e] > 0.9) { d = d - 30; } if (d < best) { best = d; by = e; } }
      } }
      e = e + 1;
    }
    if (by > 0) { sx = EX[by] - px; sz = EZ[by] - pz; }
  }
  if (by != 0) { if (sx * lookX + sz * lookZ > 0) {
    r = 1; shHit = 1; sndPlay(4);
    if (n >= 3) { if (shHand == 41) { handSwap(); wearHeld(1 + Math.floor(n)); handSwap(); } else { wearHeld(1 + Math.floor(n)); } }
    if (by > 0) { if (ET[by] == M_AXERAIDER) { shOff = 5; shT = 0; shUp = 0; msgShow('도끼에 맞아 방패를 5초 동안 들 수 없습니다', 2); } }
  } }
  return r;
}
function combatStep(dt) {
  // the hand changed: the blow charges again
  if (hotSel != atkSel || INVI[hotSel] != atkId) { atkSel = hotSel; atkId = INVI[hotSel]; attackCool = 1 / atkSpeed(atkId); }
  if (shOff > 0) { shOff = shOff - dt; }
  let want = 0, id = INVI[hotSel];
  if (uiMode == 0 && useDown() == 1 && lkNow == 1 && shOff <= 0 && eatId == 0 && drawId == 0) {
    if (id == I_shield) { want = hotSel; }
    else { if (INVI[41] == I_shield) { if (ITPLB[id + 1] == 0 && ITFOOD[id + 1] == 0 && ITTHROW[id + 1] == 0) { want = 41; } } }
  }
  if (want > 0) { shT = shT + dt; shHand = want; } else { shT = 0; }
  shUp = 0; if (shT >= 0.25) { shUp = 1; }
  if (spChk == 1) { spawnCheck(); }
  if (armDurOk == 0) { armDurInit(); }
  if (sleepT > 0) { sleepStep(dt); }
}
// asleep in a bed: 5 s lying still while the view darkens, then it is morning; Shift, a hurt or a
// screen opened wakes before that
let sleepT = 0, sleepX = 0, sleepZ = 0, sleepHp = 0;
function sleepStep(dt) {
  sleepT = sleepT - dt;
  // (taken elsewhere while lying - a command, a gate, a death - or made a spectator: awake, and not drawn
  // back to the bed)
  let away = 0;
  if (Math.abs(px - sleepX) > 0.6 || Math.abs(pz - sleepZ) > 0.6 || gameMode == 3 || dead == 1) { away = 1; }
  if (away == 0) { px = sleepX; pz = sleepZ; pvx = 0; pvz = 0; eyeH = 0.5; }
  if (key(16) || hp < sleepHp || uiMode != 0 || away == 1) { sleepT = 0; msgShow('잠에서 깼습니다', 2); }
  else { if (sleepT <= 0) { sleepT = 0; tday = 0.0; dayN = dayN + 1; sleptDay = dayN; weatherClear(); msgShow('잠을 자고 아침이 되었습니다 (되살아날 곳을 정했습니다)', 3); } }
}
// the charge under the cross while it is not full, the other hand's slot, the raised shield (a board
// low on its hand's side), blindness (only the middle is seen)
function combatHud() {
  if (sleepT > 0) { penAlpha(Math.max(15, 100 - (5 - sleepT) * 20)); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0); }
  if (EFT[25] > 0) { box(-245, 140, 245, 55, '#000000'); box(-245, -55, 245, -140, '#000000'); box(-245, 55, -75, -55, '#000000'); box(75, 55, 245, -55, '#000000'); }
  let f = atkCharge();
  if (f < 1) { box(-8, -9, 8, -12, '#303030'); box(-7, -10, -7 + 14 * f, -11, '#e8e8e8'); }
  if (INVI[41] > 0) {
    box(-116, -104, -94, -128, '#000000'); box(-115, -105, -95, -127, '#6b6b6b'); box(-114, -107, -96, -125, '#8b8b8b');
    s8 = 1; slotItem(-105, -116, INVI[41], INVN[41], INVD[41], 105); s8 = 0;
  } else { txOff(105); }
  if (shT > 0) {
    let h = Math.min(1, shT / 0.25) * 70, x = -240;
    if (shHand != 41) { x = 160; }
    box(x, -140 + h, x + 80, -140, '#5a4020'); box(x + 4, -144 + h, x + 76, -140, '#a7834f'); box(x + 34, -144 + h, x + 46, -140, '#d8d8d8');
  }
}

// ---------------------------------------------------------------- experience on the ground, instant effects
// xpAdd (blocks.js) drops what is won at a place (xpAt 1: a mob killed, an ore dug; the dead player's
// own: 7 a level, 100 at most) as an orb: a thing on the ground (I_xpOrb, its number what it is worth)
// that flies to a player within 7 blocks, joins others near it, is taken as xp (addItem) and never
// goes into a slot or a hopper. On a server it is shared as any dropped thing is.
let xpAt = 0, xpX = 0, xpY = 0, xpZ = 0;
function orbDrop(n, x, y, z) { if (n > 0) { dropItem(I_xpOrb, n, 0, x, y, z, 0); } }
// What a furnace smelted is worth experience, kept in the furnace (FUXP, not in a save) till a player
// takes a thing out of it (a hopper leaves it there) or the furnace is broken: 0.1 a thing, food 0.35,
// iron 0.7, gold, diamond and jade 1, the abyss scrap 2; a part of a point is a chance of one.
let FUXP = [];
function furXpAdd(f, id) {
  while (FUXP.length < NFUR) { FUXP.push(0); }
  let v = 0.1;
  if (ITFOOD[id + 1] > 0) { v = 0.35; }
  if (id == I_ingotIron) { v = 0.7; }
  if (id == I_ingotGold || id == I_diamond || id == I_jade) { v = 1; }
  if (id == I_scrap) { v = 2; }
  FUXP[f] = FUXP[f] + v;
}
function furXpTake(f, x, y, z) {
  if (f >= 1 && f <= FUXP.length) { if (FUXP[f] > 0) {
    let v = FUXP[f], n = Math.floor(FUXP[f]);
    if (rand(0, 999) < (v - n) * 1000) { n = n + 1; }
    FUXP[f] = 0;
    orbDrop(n, x, y, z);
  } }
}
// instant health (4 a level doubled) and instant damage (6 a level doubled, through armour)
function effectNow(k, lvl) {
  let p = 1, i = 1;
  while (i < lvl) { p = p * 2; i = i + 1; }
  if (k == 23) { hp = Math.min(20, hp + 4 * p); } else { hurtT = 0; hurtR(6 * p, '마법에 당했습니다'); }
}

// ---------------------------------------------------------------- back at the bed or the anchor
// Looked at once the chunk is in after coming back to life (spChk): a bed (spawnSet 2) that is gone,
// or an anchor (3) gone or empty, and the place is forgotten - on to where the world begins; an
// anchor gives one charge for each coming back. (A place set by /spawnpoint or before v3.3 is 1: kept.)
function ckHas(x, z) {
  let cx = idiv(x, 16), cz = idiv(z, 16), r = 0;
  let s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
  if (CKST[s] >= 3) { if (CKX[s] == cx) { if (CKZ[s] == cz) { r = 1; } } }
  return r;
}
function spawnCheck() {
  let x = Math.floor(spawnX), y = spawnY - 1, z = Math.floor(spawnZ);
  if (spawnSet < 2 || dim != spawnDim) { spChk = 0; }
  else { if (ckHas(x, z) == 1) {
    spChk = 0;
    let b = blockAt(x, y, z), ok = 0;
    if (spawnSet == 2) { if (BUSE[b + 1] == U_BED) { ok = 1; } }
    if (spawnSet == 3) { if (BUSE[b + 1] == U_ANCHOR) { let c = pvGet(3, x, y, z); if (c > 0) { ok = 1; pvSet(3, x, y, z, c - 1); powerAround(x, y, z); } } }
    if (ok == 0) { spawnSet = 0; spawnDim = 0; msgShow('집 침대나 충전된 되살아남 닻이 없어 세계의 시작점에서 되살아납니다', 4); startTravel(0, gsX + 0.5, gsZ + 0.5, 3); }
  } }
}

// ---------------------------------------------------------------- armour's wear by its piece
// As 1.16.5 a piece lasts its kind's number x its stuff's: helmet 11, chest 16, legs 15, boots 13 x
// leather 5, gold 7, chain and iron 15, diamond 33, the abyss iron 37 (the table has one number a stuff)
function armDurInit() {
  armDurOk = 1;
  let t = 0, p = 0, id = 0, m = 0, b = 0;
  while (t < 6) {
    b = 15; if (t == 0) { b = 5; } if (t == 2) { b = 33; } if (t == 3) { b = 37; } if (t == 4) { b = 7; }
    p = 0;
    while (p < 4) {
      m = 13; if (p == 0) { m = 11; } if (p == 1) { m = 16; } if (p == 2) { m = 15; }
      id = 150 + t * 4 + p; if (t >= 4) { id = 1924 + t * 4 + p; }
      ITDUR[id + 1] = m * b;
      p = p + 1;
    }
    t = t + 1;
  }
}
