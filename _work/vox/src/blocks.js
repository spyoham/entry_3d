// ===================================================================== what blocks do (v2.0)
// Putting blocks down by the way the player faces (stairs, logs, doors, beds ...), F on blocks
// (doors, gates, levers, beds, signs, pots ...), tools on blocks (hoe, shovel, axe, buckets, bone
// meal, shears), explosions, crops and the slow life of the world (random ticks).

// the facing from the look: 0 +z, 1 +x, 2 -z, 3 -x
function faceOf(yw) { return mod(Math.round(yw / 90), 4); }
function dirX(f) { let r = 0; if (f == 1) { r = 1; } if (f == 3) { r = 0 - 1; } return r; }
function dirZ(f) { let r = 0; if (f == 0) { r = 1; } if (f == 2) { r = 0 - 1; } return r; }
function freeAt(x, y, z) {
  let o = blockAt(x, y, z), r = 0;
  if (o == 0 || BLQ[o + 1] > 0 || (BSHP[o + 1] == 1 && BCROP[o + 1] < 0 && BWATER[o + 1] == 0) || BSPEC[o + 1] == 10 || o == I_snowLayer) { r = 1; }
  if (y < 0 || y >= WY) { r = 0; }
  return r;
}
function soilAt(b) {
  let r = 0;
  if (b == 2 || b == 3 || b == 20 || b == I_podzol || b == I_coarseDirt || b == I_mycelium || b == I_farmland || b == I_farmlandWet || b == I_grassPath) { r = 1; }
  return r;
}
// does block b stand on `under` (and next to what)?
function standsOn(b, under, x, y, z) {
  let n = BNEED[b + 1], r = 1;
  if (n == N_SOIL) { r = soilAt(under); if (b == 46) { if (under == 8 || under == I_redSand || BKIND[under + 1] == I_terracotta) { r = 1; } } }
  if (n == N_FLOOR) { if (BSOL[under + 1] == 0) { r = 0; } }
  if (n == N_BELOW) { if (under == 0 || BSHP[under + 1] == 1 || BLQ[under + 1] > 0) { r = 0; } }
  if (n == N_ASHEN) { r = 0; if (under == 48 || under == I_emberMoss || under == I_indigoMoss || under == I_wailSoil || under == I_wailSand) { r = 1; } }
  if (n == N_FARM) { r = 0; if (under == I_farmland || under == I_farmlandWet) { r = 1; } }
  if (n == N_REED) { r = 0; if (soilAt(under) == 1 || under == 8 || under == I_redSand || under == b) { r = 1; } }
  if (n == N_DARK) { if (BSOL[under + 1] == 0) { r = 0; } }
  if (n == N_WATER) { r = 0; if (BLQ[under + 1] == 7 || BSOL[under + 1] > 0) { r = 1; } }
  if (b == 19) { r = 0; if (under == 8 || under == I_redSand || under == 19) { r = 1; } }
  if (BWATER[b + 1] == 1) { if (BLQ[blockAt(x, y, z) + 1] != 7) { if (BLQ[blockAt(x, y + 1, z) + 1] != 7) { r = 0; } } }
  return r;
}

// ---------------------------------------------------------------- F
function useKey() {
  if (placeCool <= 0) {
    let id = INVI[hotSel];
    let used = 0;
    if (gameMode == 3) {
      // the spectator: a look at a mob rides along with its eyes
      used = 1;
      if (mobPick > 0) { specMob = mobPick; msgShow(`${MNAME[ET[mobPick]]}의 눈으로 봅니다 (Shift: 그만)`, 3); }
    }
    if (used == 0) { if (mobPick > 0) {
      let et = ET[mobPick];
      if (et == 13 || isCart(et) == 1) { riding = mobPick; used = 1; placeCool = 0.4; }
      if (et == 3) { if (ITTK[id + 1] == 5) { if (EST[mobPick] != 9) { EST[mobPick] = 9; dropItem(32, rand(1, 3), 0, EX[mobPick], EY[mobPick] + 1, EZ[mobPick], 0); wearHeld(1); sndPlay(6); used = 1; placeCool = 0.3; } } }
      if (et == M_VILLAGER) { tradeOpen(mobPick); used = 1; }
      if (et == 2) { if (id == I_bucket) { takeHeld(1); addItem(I_milkBucket, 1, 0); used = 1; placeCool = 0.3; } }
    } }
    if (pickOn == 1 && used == 0) {
      if (sneaking == 0 || id == 0) { used = useBlock(pickX, pickY, pickZ, pickB, id); }
    }
    if (used == 0) { if (id > 0) { used = useItem(id); } }
    if (used == 0) { if (id > 0) {
      if (gameMode != 2) { if (ITPLB[id + 1] > 0) { if (pickOn == 1) { placeBlock(ITPLB[id + 1], id); } } }
    } }
  }
}
// F on a block: 1 when something happened
function useBlock(x, y, z, b, id) {
  let u = BUSE[b + 1], used = 1;
  if (u == U_CRAFT) { uiOpen(2); }
  else { if (u == U_FURNACE) { furnaceOpen(x, y, z); }
  else { if (u == U_CHEST) { if (b == I_voidChest) { voidChestOpen(); } else { chestOpen(x, y, z); } }
  else { if (u == U_SMITH) { uiOpen(8); }
  else { if (u == U_SHELL) { shellBoxOpen(x, y, z); }
  else { if (u == U_DOOR) { doorToggle(x, y, z, b); }
  else { if (u == U_TRAPDOOR || u == U_GATE) { toggleSimple(x, y, z, b); }
  else { if (u == U_LEVER) { leverToggle(x, y, z, b); }
  else { if (u == U_BUTTON) { buttonPress(x, y, z); }
  else { if (u == U_BED) { bedUse(x, y, z, b); }
  else { if (u == U_SIGN) { signUse(x, y, z, id); }
  else { if (u == U_NOTE) { if (BKIND[b + 1] == I_noteBlock) { noteTune(x, y, z, b); } else { sndPlay(6); msgShow('♪', 1); } }
  else { if (u == U_CAKE) { cakeEat(x, y, z); }
  else { if (u == U_COMPOST) { used = composterUse(id); }
  else { if (u == U_REPAIR) { repairHeld(b); }
  else { if (u == U_BELL) { bellRing(x, y, z); msgShow('댕-', 1); }
  else { if (u == U_POT) { used = potUse(x, y, z, b, id); }
  else { if (u == U_COMMAND) { commandBlockEdit(x, y, z); }
  else { if (u == U_CAMPFIRE) { used = campfireCook(id); }
  else { if (u == U_ENCHANT) { enchantHeld(); }
  else { if (u == U_LODESTONE) { used = 0; if (id == I_compass) { lodeX = x; lodeZ = z; lodeOn = 1; msgShow('나침반이 이 자석석을 가리킵니다', 2); used = 1; } }
  else { if (u == U_ANCHOR) { anchorUse(x, y, z, id); }
  else { if (u == U_RS) { rsUse(x, y, z, b); }
  else { used = 0; } } } } } } } } } } } } } } } } } } } } } } }
  if (used == 0) { used = toolOnBlock(x, y, z, b, id); }
  if (used == 1) { placeCool = Math.max(placeCool, 0.25); swingT = 0.3; }
  return used;
}
// F with an item in hand (not on a block that answers)
function useItem(id) {
  let used = 0;
  if (ITFOOD[id + 1] > 0) { eat(id); used = 1; placeCool = 0.4; }
  if (id == I_milkBucket) { effectsInit(); INVI[hotSel] = I_bucket; used = 1; placeCool = 0.4; sndPlay(5); }
  if (id == 122) { used = 1; placeCool = 0.3; if (pickOn == 1) { ignite(); } }
  if (id == I_fireCharge) { used = 1; placeCool = 0.3; if (pickOn == 1) { ignite(); if (mod(gameMode, 2) == 0) { takeHeld(1); } } }
  if (id == 124) { used = 1; placeCool = 0.5; useVoidKey(); }
  if (id == 125) { used = 1; shootBow(); }
  if (id == 171) { used = 1; let fr = 0; if (pickOn == 1) { if (pickB == 61) { fr = 1; } } if (fr == 1) { if (mod(gameMode, 2) == 0) { takeHeld(1); } placeCool = 0.3; frameEye(pickX, pickY, pickZ); } else { eyeThrow(); } }
  if (id == 174) { used = 1; boatPlace(); }
  // (v2.5) a minecart onto the rail clicked
  if (id == I_minecart || id == I_tntMinecart) { used = 1; if (pickOn == 1) { if (BRS[pickB + 1] == RS_RAIL) { let t = M_MINECART; if (id == I_tntMinecart) { t = M_TNTCART; } cartPlace(t, pickX, pickY, pickZ); if (mod(gameMode, 2) == 0) { takeHeld(1); } placeCool = 0.4; } } }
  if (id == I_compass) { used = 1; placeCool = 0.5; compassShow(); }
  if (id == I_clock) { used = 1; placeCool = 0.5; msgShow(`지금 ${timeText()} (${dayN + 1}일째)`, 2); }
  if (ITTHROW[id + 1] > 0) { used = 1; placeCool = 0.3; throwIt(ITTHROW[id + 1]); if (mod(gameMode, 2) == 0) { takeHeld(1); } }
  if (ITSPAWN[id + 1] > 0) { used = 1; placeCool = 0.3; if (pickOn == 1) { pickNeighbour(); mobAdd(ITSPAWN[id + 1], nbX + 0.5, nbY, nbZ + 0.5); if (lastMob > 0) { EST[lastMob] = 0; } if (mod(gameMode, 2) == 0) { takeHeld(1); } } }
  if (id == I_bucket || id == I_waterBucket || id == I_lavaBucket) { used = 1; placeCool = 0.3; bucketUse(id); }
  if (ITK[id + 1] == 4) { used = 1; placeCool = 0.3; let s = 36 + ITSLOT[id + 1]; let ti = INVI[s], tn = INVN[s], td = INVD[s]; INVI[s] = id; INVN[s] = 1; INVD[s] = INVD[hotSel]; INVI[hotSel] = ti; INVN[hotSel] = tn; INVD[hotSel] = td; sndPlay(6); }
  return used;
}
// a hoe, shovel or axe on a block; bone meal; a plant into a pot
function toolOnBlock(x, y, z, b, id) {
  let used = 0, tk = ITTK[id + 1];
  if (gameMode == 2) { tk = 0 - 1; }
  if (tk == 4) { if (b == 2 || b == 3 || b == I_grassPath || b == I_coarseDirt) { if (blockAt(x, y + 1, z) == 0) { setBlock(x, y, z, I_farmland); if (b == I_coarseDirt) { setBlock(x, y, z, 3); } wearHeld(1); sndPlay(2); used = 1; } } }
  if (tk == 2) { if (b == 2 || b == 20) { if (blockAt(x, y + 1, z) == 0) { setBlock(x, y, z, I_grassPath); wearHeld(1); sndPlay(2); used = 1; } } }
  if (tk == 1) { if (BSTRIP[b + 1] > 0) { setBlock(x, y, z, BSTRIP[b + 1]); wearHeld(1); sndPlay(2); used = 1; } }
  if (id == I_boneMeal) { used = boneMeal(x, y, z, b); }
  return used;
}

// ---------------------------------------------------------------- C: copy the block looked at (creative)
// The genre's pick block: the item of the block looked at goes into the hand. A hotbar slot that
// has it already is chosen; else the slot in hand if it is empty, else the first empty one, else
// the one in hand is replaced (a full stack). Only in creative.
function pickCopy() {
  if (gameMode != 1) { msgShow('블록 복사(C)는 크리에이티브 모드에서만 됩니다', 1.5); }
  else { if (pickOn == 1) {
    let id = pickItem(pickB);
    if (id > 0) {
      let k = 1, at = 0;
      while (k <= 9) { if (at == 0) { if (INVI[k] == id) { at = k; } } k = k + 1; }
      if (at == 0) {
        if (INVI[hotSel] == 0) { at = hotSel; }
        else { k = 1; while (k <= 9) { if (at == 0) { if (INVI[k] == 0) { at = k; } } k = k + 1; } }
        if (at == 0) { at = hotSel; }
        INVI[at] = id; INVN[at] = ITST[id + 1]; INVD[at] = 0;
      }
      hotSel = at;
      msgShow(`${ITNAME[id + 1]}`, 1);
    }
  } }
}
// the item a block is (its kind; a part with no item of its own: what it drops), 0 none
function pickItem(b) {
  let id = 0;
  if (b > 0 && BLQ[b + 1] == 0) {
    id = BKIND[b + 1];
    if (ITNAME[id + 1] == ' ' || ITPLB[id + 1] == 0) { id = BDROP[b + 1]; }
    if (id > 0) { if (ITNAME[id + 1] == ' ') { id = 0; } }
  }
  return id;
}

// ---------------------------------------------------------------- putting blocks down
// b: the block of the item (its kind), id: the item (taken from the hand)
function placeBlock(b, id) {
  let du0 = INVD[hotSel];
  pickNeighbour();
  let x = nbX, y = nbY, z = nbZ;
  // a plant or snow clicked is replaced itself
  if (freeAt(pickX, pickY, pickZ) == 1) { if (pickB != 0) { x = pickX; y = pickY; z = pickZ; } }
  let pl = BPLC[b + 1], f = faceOf(yaw), put = b, ok = 1, x2 = 0, y2 = 0 - 1, z2 = 0, put2 = 0;
  // a slab onto its other half: the double block
  if (pl == P_SLAB) {
    if (BKIND[pickB + 1] == b) {
      if (BVAR[pickB + 1] == 0 && pickF == 3) { x = pickX; y = pickY; z = pickZ; put = b + 2; }
      if (BVAR[pickB + 1] == 1 && pickF == 2) { x = pickX; y = pickY; z = pickZ; put = b + 2; }
    }
    if (put == b) {
      let o = blockAt(x, y, z);
      if (BKIND[o + 1] == b && BVAR[o + 1] < 2) { put = b + 2; }
      else { if (pickF == 2 || (pickF != 3 && pickHY > 0.5)) { put = b + 1; } }
    }
  }
  if (put == b + 2 && pl == P_SLAB) { if (blockAt(x, y, z) == b + 2) { ok = 0; } }
  else { if (freeAt(x, y, z) == 0) { ok = 0; } }
  if (y < 0 || y >= WY || cOK(x, z) == 0) { ok = 0; }
  if (pl == P_AXIS) { if (pickF < 2) { put = BAXX[b + 1]; } if (pickF >= 4) { put = BAXZ[b + 1]; } }
  if (pl == P_STAIRS) { put = b + f; if (pickF == 2 || (pickF != 3 && pickHY > 0.5)) { put = b + f + 4; } }
  if (pl == P_DOOR) { let s = mod(f + 2, 4); put = b + s; x2 = x; y2 = y + 1; z2 = z; put2 = b + 4 + s; if (freeAt(x, y + 1, z) == 0) { ok = 0; } if (BSOL[blockAt(x, y - 1, z) + 1] == 0) { ok = 0; } }
  if (pl == P_TRAPDOOR) { if (pickF == 2 || (pickF != 3 && pickHY > 0.5)) { put = b + 1; } trapKeep(x, y, z, mod(f + 2, 4)); }
  if (pl == P_GATE) { if (mod(f, 2) == 1) { put = b + 1; } }
  if (pl == P_RAIL) { if (mod(f, 2) == 1) { put = b + 1; } }
  if (pl == P_BED) { x2 = x + dirX(f); y2 = y; z2 = z + dirZ(f); put = b + f; put2 = b + 4 + f; if (freeAt(x2, y2, z2) == 0) { ok = 0; } }
  if (pl == P_LADDER) {
    let s = mod(f + 2, 4);
    if (pickF == 0) { s = 1; } if (pickF == 1) { s = 3; } if (pickF == 4) { s = 0; } if (pickF == 5) { s = 2; }
    put = b + s;
  }
  // not into the player or a mob
  if (BSOL[put + 1] > 0) {
    if (x + 1 > px - 0.3 && x < px + 0.3 && z + 1 > pz - 0.3 && z < pz + 0.3 && y + 1 > py && y < py + 1.8) { if (gameMode != 3) { ok = 0; } }
    if (mobInCell(x, y, z) == 1) { ok = 0; }
  }
  if (y2 >= 0) { if (x2 + 1 > px - 0.3 && x2 < px + 0.3 && z2 + 1 > pz - 0.3 && z2 < pz + 0.3 && y2 + 1 > py && y2 < py + 1.8) { ok = 0; } }
  let under = blockAt(x, y - 1, z), sb = b;
  // spark parts: the variant by the face clicked and the look (a wall lever needs no floor)
  if (BRS[b + 1] > 0) { let rp = rsPut(b); if (rp < 0) { ok = 0; } else { put = rp; sb = rp; } }
  if (standsOn(sb, under, x, y, z) == 0) { ok = 0; }
  if (b == 27 || BNEED[sb + 1] == N_TORCH) { ok = 1; if (freeAt(x, y, z) == 0) { ok = 0; } if (BSOL[under + 1] == 0) { if (pickF == 2 || BSOL[pickB + 1] == 0) { ok = 0; } } }
  if (ok == 1) {
    if (netSrv > 0) { plugRun('place', ITKEY[b + 1], netNick); }
    setBlock(x, y, z, put);
    // (v2.4.4: a note block, command block or dispenser put next to power already on takes it as
    // what it had: it does not sound or fire, as in the genre)
    if (BRS[put + 1] == RS_NOTE || BRS[put + 1] == RS_COMMAND || BRS[put + 1] == RS_DISPENSER) { let pw = 0; if (powerIn(x, y, z, 0 - 1) > 0) { pw = 1; } edgeSet(x, y, z, pw); }
    if (y2 >= 0) { setBlock(x2, y2, z2, put2); }
    // (v2.5) the rails by a rail put turn to it
    if (BRS[put + 1] == RS_RAIL) { railJoin(x, y, z); }
    sndPlay(2);
    swingT = 0.3;
    placeCool = 0.2;
    if (mod(gameMode, 2) == 0) { takeHeld(1); }
    if (BUSE[b + 1] == U_FURNACE) { furnaceAt(x, y, z); }
    if (BUSE[b + 1] == U_CHEST) { chestAt(x, y, z); }
    if (BUSE[b + 1] == U_SHELL) { shellBoxPlaced(x, y, z, du0); }
  }
}
// the other half of a door or a bed goes with it
function partnerGone(x, y, z, b, byP) {
  let pl = BPLC[b + 1], v = BVAR[b + 1], k = BKIND[b + 1];
  if (pl == P_DOOR) {
    let h = mod(idiv(v, 4), 2), oy = y + 1;
    if (h == 1) { oy = y - 1; }
    if (BKIND[blockAt(x, oy, z) + 1] == k) { setBlock(x, oy, z, 0); if (h == 1) { if (byP == 1) { if (mod(gameMode, 2) == 0) { dropItem(k, 1, 0, x + 0.5, oy + 0.3, z + 0.5, 0); } } } }
  }
  if (pl == P_BED) {
    let h = idiv(v, 4), f = mod(v, 4), ox = x + dirX(f), oz = z + dirZ(f);
    if (h == 1) { ox = x - dirX(f); oz = z - dirZ(f); }
    if (BKIND[blockAt(ox, y, oz) + 1] == k) { setBlock(ox, y, oz, 0); if (h == 1) { if (byP == 1) { if (mod(gameMode, 2) == 0) { dropItem(k, 1, 0, ox + 0.5, y + 0.3, oz + 0.5, 0); } } } }
  }
}

// ---------------------------------------------------------------- doors, gates, levers, buttons
function doorToggle(x, y, z, b) {
  let k = BKIND[b + 1], v = BVAR[b + 1], h = mod(idiv(v, 4), 2), o = idiv(v, 8), s = mod(v, 4), oy = y + 1;
  if (h == 1) { oy = y - 1; }
  let no = 1 - o;
  setBlock(x, y, z, k + no * 8 + h * 4 + s);
  if (BKIND[blockAt(x, oy, z) + 1] == k) { setBlock(x, oy, z, k + no * 8 + (1 - h) * 4 + s); }
  sndPlay(6);
}
function doorSet(x, y, z, b, open) {
  let v = BVAR[b + 1];
  if (idiv(v, 8) != open) { doorToggle(x, y, z, b); }
}
// (v2.4.3) the side a trapdoor opens to, kept by its place (a closed one's variant has none): set
// when it is put or opened by hand, used when power opens it
let TDX = [], TDY = [], TDZ = [], TDS = [], tdN = 0;
function trapKeep(x, y, z, s) {
  let i = 1, f = 0;
  while (i <= TDX.length) { if (TDX[i] == x && TDY[i] == y + dim * 1000 && TDZ[i] == z) { f = i; } i = i + 1; }
  if (f == 0) {
    if (TDX.length < 256) { TDX.push(0); TDY.push(0); TDZ.push(0); TDS.push(0); f = TDX.length; }
    else { tdN = mod(tdN, 256) + 1; f = tdN; }
  }
  TDX[f] = x; TDY[f] = y + dim * 1000; TDZ[f] = z; TDS[f] = s;
}
function trapSide(x, y, z) {
  let i = 1, r = 0 - 1;
  while (i <= TDX.length) { if (TDX[i] == x && TDY[i] == y + dim * 1000 && TDZ[i] == z) { r = TDS[i]; } i = i + 1; }
  // (not known: against a full block beside it, else the first side)
  if (r < 0) {
    r = 0; let s = 3;
    while (s >= 0) { if (BSOL[blockAt(x - dirX(s), y, z - dirZ(s)) + 1] == 1) { r = s; } s = s - 1; }
  }
  return r;
}
// a trapdoor (closed 0 / 1, open 2 .. 5) or a gate (closed 0 / 1, open 2 / 3)
function toggleSimple(x, y, z, b) {
  let k = BKIND[b + 1], v = BVAR[b + 1], f = faceOf(yaw);
  if (BPLC[k + 1] == P_GATE) { if (v < 2) { v = v + 2; } else { v = v - 2; } }
  else { if (v < 2) { v = 2 + v * 4 + mod(f + 2, 4); trapKeep(x, y, z, mod(f + 2, 4)); } else { v = idiv(v - 2, 4); } }
  setBlock(x, y, z, k + v);
  sndPlay(6);
}
// pressed buttons and plates: on for a while
// pressed buttons, plates, targets: how long yet (PRT), the power (PRL), the world (PRD), and for
// plates how many stood on it since the last frame (PRC; v2.4.3: mobs, other players and items too,
// the weighted ones by the count)
let PRX = [], PRY = [], PRZ = [], PRT = [], PRL = [], PRD = [], PRC = [];
let prF = 0;
function pressFind(x, y, z) {
  let i = 1, f = 0;
  while (i <= PRX.length) { if (PRX[i] == x && PRY[i] == y && PRZ[i] == z && PRD[i] == dim) { f = i; } i = i + 1; }
  if (f == 0) {
    i = 1;
    while (i <= PRX.length) { if (f == 0) { if (PRT[i] <= 0) { f = i; } } i = i + 1; }
    if (f == 0) { PRX.push(0); PRY.push(0); PRZ.push(0); PRT.push(0); PRL.push(0); PRD.push(0); PRC.push(0); f = PRX.length; }
    PRX[f] = x; PRY[f] = y; PRZ[f] = z; PRD[f] = dim; PRT[f] = 0; PRL[f] = 0; PRC[f] = 0;
  }
  prF = f;
}
function pressAdd(x, y, z, t) { pressAddL(x, y, z, t, 15); }
function pressAddL(x, y, z, t, l) {
  pressFind(x, y, z);
  let f = prF;
  if (PRT[f] <= 0 || PRL[f] != l) { PRT[f] = t; PRL[f] = l; powerAround(x, y, z); } else { PRT[f] = Math.max(PRT[f], t); }
}
// the power of the button, plate or target at (x, y, z): 0..15
function pressLevel(x, y, z) {
  let i = 1, r = 0;
  while (i <= PRX.length) { if (PRT[i] > 0) { if (PRX[i] == x && PRY[i] == y && PRZ[i] == z && PRD[i] == dim) { r = PRL[i]; } } i = i + 1; }
  return r;
}
function pressedAt(x, y, z) { let r = 0; if (pressLevel(x, y, z) > 0) { r = 1; } return r; }
// a plate's power for n on it (kind = its aux: 0 wood, 1 stone, 2 light weighted, 3 heavy weighted)
function plateLevel(k, n) { let r = 15; if (k == 2) { r = Math.min(15, n); } if (k == 3) { r = Math.min(15, Math.ceil(n / 10)); } return r; }
function buttonPress(x, y, z) {
  // (v2.4.4) pressed again while it is down: nothing (it kept it down longer); the others see it too
  if (pressLevel(x, y, z) == 0) { pressAdd(x, y, z, BAUX[blockAt(x, y, z) + 1] / 10); sndPlay(1); netSay('p', `${x}^${y}^${z}^${dim}`); }
}
// something on the cell (x, y, z): who 0 the player, a mob or another player, 1 an item (a stone
// plate does not feel items)
function plateHit(x, y, z, who) {
  let b = blockAt(x, y, z);
  // (v2.5) string between tripwire hooks
  if (BRS[b + 1] == RS_TRIP) { tripHit(x, y, z); }
  if (BSPEC[b + 1] == 5) {
    let k = BAUX[b + 1];
    if (who == 0 || k != 1) {
      pressFind(x, y, z);
      let f = prF;
      PRC[f] = PRC[f] + 1;
      let l = plateLevel(k, PRC[f]);
      PRT[f] = Math.max(PRT[f], 0.6);
      if (l > PRL[f]) { PRL[f] = l; powerAround(x, y, z); }
    }
  }
}
function plateStep(x, y, z) { plateHit(x, y, z, 0); }
function pressStep(dt) {
  let i = 1;
  while (i <= PRX.length) {
    if (PRT[i] > 0) {
      PRT[i] = PRT[i] - dt;
      if (PRT[i] <= 0) {
        PRT[i] = 0; PRL[i] = 0; PRC[i] = 0;
        if (PRD[i] == dim) {
          powerAround(PRX[i], PRY[i], PRZ[i]);
          // (v2.5) a tripwire hook goes off
          let hb = blockAt(PRX[i], PRY[i], PRZ[i]);
          if (BRS[hb + 1] == RS_HOOK) { if (BON[hb + 1] == 1) { setBlock(PRX[i], PRY[i], PRZ[i], hookId(BATT[hb + 1], 0)); } }
        }
      }
      else {
        // (a plate: the weight now; fewer on it goes down at once, nothing on it waits for its time)
        if (PRC[i] > 0) {
          let b = blockAt(PRX[i], PRY[i], PRZ[i]);
          if (BSPEC[b + 1] == 5) { let l = plateLevel(BAUX[b + 1], PRC[i]); if (l != PRL[i]) { PRL[i] = l; powerAround(PRX[i], PRY[i], PRZ[i]); } }
          PRC[i] = 0;
        }
      }
    }
    i = i + 1;
  }
}

// ---------------------------------------------------------------- spark power: see power.js
// the power each switched cell had when it was last asked (EG*): the change is what counts
let EGX = [], EGY = [], EGZ = [], EGD = [], EGS = [];
let egWas = 0;
function edgeSet(x, y, z, on) {
  let i = 1, f = 0;
  egWas = 0;
  while (i <= EGX.length) { if (EGX[i] == x && EGY[i] == y && EGZ[i] == z && EGD[i] == dim) { f = i; } i = i + 1; }
  if (f == 0) { EGX.push(x); EGY.push(y); EGZ.push(z); EGD.push(dim); EGS.push(on); if (rsReplay == 1) { egWas = on; } }
  else { egWas = EGS[f]; EGS[f] = on; }
}

// ---------------------------------------------------------------- TNT and explosions
let TNX = [], TNY = [], TNZ = [], TNT_T = [];
// lit TNT (v2.4.4): TND its world, TNO 1 when its blast leaves items here (see worldDrops). The fuse
// is the genre's 4 s (set off by another blast 0.5..1.5 s, the same on every screen); it goes on
// when the block is broken or moved (it is lit: broken, it gives no TNT back)
let TND = [], TNO = [];
function tntPrime(x, y, z) { tntLight(x, y, z, worldDrops(), 4); }
function tntLit(x, y, z) {
  let i = 1, r = 0;
  while (i <= TNX.length) { if (TNT_T[i] > 0) { if (TNX[i] == x && TNY[i] == y && TNZ[i] == z && TND[i] == dim) { r = 1; } } i = i + 1; }
  return r;
}
function tntLight(x, y, z, o, t) {
  if (tntLit(x, y, z) == 0) {
    let i = 1, f = 0;
    while (i <= TNX.length) { if (f == 0) { if (TNT_T[i] <= 0) { f = i; } } i = i + 1; }
    if (f == 0) { TNX.push(0); TNY.push(0); TNZ.push(0); TNT_T.push(0); TND.push(0); TNO.push(0); f = TNX.length; }
    TNX[f] = x; TNY[f] = y; TNZ[f] = z; TNT_T[f] = t; TND[f] = dim; TNO[f] = o;
    sndPlay(1); msgShow('치익...', 1.5);
  }
}
function tntStep(dt) {
  let i = 1;
  while (i <= TNX.length) {
    if (TNT_T[i] > 0) { if (TND[i] == dim) {
      TNT_T[i] = TNT_T[i] - dt;
      if (TNT_T[i] <= 0) {
        TNT_T[i] = 0;
        if (cOK(TNX[i], TNZ[i]) == 1) {
          if (blockAt(TNX[i], TNY[i], TNZ[i]) == I_tnt) { setBlock(TNX[i], TNY[i], TNZ[i], 0); }
          exDrops = TNO[i]; explode(TNX[i] + 0.5, TNY[i] + 0.5, TNZ[i] + 0.5, 4, 1); exDrops = 1;
        }
      }
    } }
    i = i + 1;
  }
}
// (v2.4.4) a blast a player or a mob of mine made: here, and the same blast on the other screens
function explodeShared(cx, cy, cz, r) {
  netSay('e', `${cx}^${cy}^${cz}^${r}^${dim}`);
  explode(cx, cy, cz, r, 1);
}
// (v2.4.4) the blast's own dice: the same for the same blast on every screen (each screen made its
// own crater)
function exRoll(x, y, z, n) { return mod(Math.abs(x * 7919 + y * 104729 + z * 1299709 + exSeed), n); }
let exDrops = 1, exSeed = 0;
// a blast of radius r at a point: blocks broken (some fall as items), TNT near set off, bodies hurt
function explode(cx, cy, cz, r, breakIt) {
  sndPlay(7);
  if (grGrief == 0) { breakIt = 0; }
  if (breakIt == 1) {
    exSeed = Math.floor(cx * 31 + cy * 57 + cz * 101);
    let x0 = Math.floor(cx - r), x1 = Math.floor(cx + r), y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(WY - 1, Math.floor(cy + r)), z0 = Math.floor(cz - r), z1 = Math.floor(cz + r);
    let x = x0, y = 0, z = 0, d = 0, b = 0;
    logOn = 1;
    while (x <= x1) {
      z = z0;
      while (z <= z1) {
        if (cOK(x, z) == 1) {
          y = y0;
          while (y <= y1) {
            d = (x + 0.5 - cx) * (x + 0.5 - cx) + (y + 0.5 - cy) * (y + 0.5 - cy) + (z + 0.5 - cz) * (z + 0.5 - cz);
            if (d < r * r * (0.7 + exRoll(x, y, z, 31) / 100)) {
              b = W[wi(x, y, z)];
              if (b != 0 && BHARD[b + 1] >= 0 && BHARD[b + 1] < 40 && BLQ[b + 1] == 0) {
                if (b == I_tnt) { tntLight(x, y, z, exDrops, 0.5 + exRoll(x, y, z, 11) / 10); }
                else {
                  if (exRoll(z, x, y, 3) == 0) { if (grTileDrops == 1 && exDrops == 1) { if (BDROP[b + 1] > 0) { dropItem(BDROP[b + 1], 1, 0, x + 0.5, y + 0.5, z + 0.5, 0); } } }
                  if (BUSE[b + 1] == U_CHEST || BUSE[b + 1] == U_FURNACE) { chestOrFurnaceGone(x, y, z, b); }
                  if (BRS[b + 1] > 0) { if (XPW.length < 96) { XPW.push(x); XPW.push(y); XPW.push(z); } }
                  wput(x, y, z, 0); markDirty(x, y, z); rsTell(x, y, z);
                  if (netSrv > 0) { if (netHost == 1) { hostKeepEdit(x, y, z, 0, dim); } }
                }
              }
            }
            y = y + 1;
          }
        }
        z = z + 1;
      }
      x = x + 1;
    }
    logOn = 0;
    let q = 1;
    while (q < XPW.length) { powerAround(XPW[q], XPW[q + 1], XPW[q + 2]); q = q + 3; }
    XPW = [];
    lbX0 = Math.min(lbX0, x0 - 14); lbX1 = Math.max(lbX1, x1 + 14); lbZ0 = Math.min(lbZ0, z0 - 14); lbZ1 = Math.max(lbZ1, z1 + 14);
  }
  // the player and the mobs
  let dd = Math.sqrt((px - cx) * (px - cx) + (py + 0.9 - cy) * (py + 0.9 - cy) + (pz - cz) * (pz - cz));
  if (dd < r * 2) {
    let f = 1 - dd / (r * 2);
    hurtT = 0; hurt(Math.round(f * f * r * 6 + f), '폭발했습니다');
    pvx = pvx + (px - cx) / (dd + 0.1) * f * 14; pvz = pvz + (pz - cz) / (dd + 0.1) * f * 14; pvy = pvy + f * 9;
  }
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) {
      let md = Math.sqrt((EX[e] - cx) * (EX[e] - cx) + (EY[e] + 0.5 - cy) * (EY[e] + 0.5 - cy) + (EZ[e] - cz) * (EZ[e] - cz));
      if (md < r * 2) { let f2 = 1 - md / (r * 2); mobHurt(e, Math.round(f2 * f2 * r * 6 + f2), EX[e] - cx, EZ[e] - cz); }
    }
    e = e + 1;
  }
  flashT = 0.15;
}
let flashT = 0;
let XPW = [];

// ---------------------------------------------------------------- fire
function ignite() {
  if (pickB == I_tnt) { tntLight(pickX, pickY, pickZ, 1, 4); netSay('n', `${pickX}^${pickY}^${pickZ}^${dim}`); wearHeld(1); }
  else {
    if (pickB == I_anchor) { setBlock(pickX, pickY, pickZ, 0); explodeShared(pickX + 0.5, pickY + 0.5, pickZ + 0.5, 5); }
    else {
      pickNeighbour();
      lightGate(nbX, nbY, nbZ);
      if (gateOK == 1) { wearHeld(1); sndPlay(2); }
      else {
        if (blockAt(nbX, nbY, nbZ) == 0 && BSOL[blockAt(nbX, nbY - 1, nbZ) + 1] > 0) {
          let fb = I_fire;
          if (blockAt(nbX, nbY - 1, nbZ) == I_wailSand || blockAt(nbX, nbY - 1, nbZ) == I_wailSoil) { fb = I_wailFire; }
          setBlock(nbX, nbY, nbZ, fb); wearHeld(1); sndPlay(2);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- buckets
// a liquid looked at (the pick ray passes through them): lqX ..
let lqX = 0, lqY = 0, lqZ = 0, lqB = 0;
function liquidRay() {
  let t = 0.3, b = 0;
  lqB = 0;
  while (t <= 5 && lqB == 0) {
    let x = Math.floor(camX + lookX * t), y = Math.floor(camY + lookY * t), z = Math.floor(camZ + lookZ * t);
    b = blockAt(x, y, z);
    if (BLQ[b + 1] > 0 && BLV[b + 1] == 0) { lqB = b; lqX = x; lqY = y; lqZ = z; }
    else { if (BSOL[b + 1] > 0) { t = 99; } }
    t = t + 0.25;
  }
}
function bucketUse(id) {
  if (id == I_bucket) {
    liquidRay();
    if (lqB > 0) {
      setBlock(lqX, lqY, lqZ, 0);
      let full = I_waterBucket;
      if (lqB == 35) { full = I_lavaBucket; }
      if (mod(gameMode, 2) == 0) { takeHeld(1); if (INVI[hotSel] == 0) { INVI[hotSel] = full; INVN[hotSel] = 1; } else { addItem(full, 1, 0); } }
      sndPlay(5);
    }
  } else {
    if (pickOn == 1) {
      pickNeighbour();
      let lq = 7;
      if (id == I_lavaBucket) { lq = 35; }
      if (freeAt(nbX, nbY, nbZ) == 1) {
        if (dim == 1 && lq == 7) { msgShow('물이 금세 증발했습니다', 2); }
        else { setBlock(nbX, nbY, nbZ, lq); }
        if (mod(gameMode, 2) == 0) { INVI[hotSel] = I_bucket; }
        sndPlay(5);
      }
    }
  }
}

// ---------------------------------------------------------------- growing
// bone meal: a crop a stage or two on, a sapling to a tree, flowers about on grass
function boneMeal(x, y, z, b) {
  let used = 0;
  if (BCROP[b + 1] >= 0 && BCROP[b + 1] < 3) { setBlock(x, y, z, BKIND[b + 1] + Math.min(3, BCROP[b + 1] + rand(1, 2))); used = 1; }
  if (BTREE[b + 1] >= 0) { if (rand(1, 3) == 1) { treeFrom(x, y, z, b); } used = 1; }
  if (b == 2) {
    let k = 0;
    while (k < 12) {
      let a = x + rand(-3, 3), c = z + rand(-3, 3);
      if (blockAt(a, y, c) == 2 && blockAt(a, y + 1, c) == 0) {
        let r = rand(1, 10), pb = 28;
        if (r == 1) { pb = 29; } if (r == 2) { pb = 30; } if (r == 3) { pb = I_tulipRed + rand(0, 3); }
        setBlock(a, y + 1, c, pb);
      }
      k = k + 1;
    }
    used = 1;
  }
  if (used == 1) { if (mod(gameMode, 2) == 0) { takeHeld(1); } sndPlay(5); }
  return used;
}
// a sapling (or fungus) grows into its tree
function treeFrom(x, y, z, b) {
  let kind = BTREE[b + 1];
  logOn = 1;
  wput(x, y, z, 0);
  growTreeKind(x, y - 1, z, kind);
  logOn = 0;
  let a = x - 4;
  while (a <= x + 4) { let c = z - 4; while (c <= z + 4) { let yy = y - 1; while (yy <= y + 20) { if (yy < WY) { markDirty(a, yy, c); } yy = yy + 4; } c = c + 4; } a = a + 4; }
  lbX0 = Math.min(lbX0, x - 16); lbX1 = Math.max(lbX1, x + 16); lbZ0 = Math.min(lbZ0, z - 16); lbZ1 = Math.max(lbZ1, z + 16);
}
// the world near the player lives a little each half second: saplings, grass, crops, cane,
// fire, farmland, coral out of water
let growT = 0;
function randomTicks(dt) {
  growT = growT + dt;
  if (growT > 0.5) {
    growT = 0;
    let k = 0, n = 30 * grTick / 3;
    while (k < n) {
      let x = Math.floor(px) + rand(-24, 24), z = Math.floor(pz) + rand(-24, 24), y = rand(1, WY - 12);
      if (cOK(x, z) == 1) {
        let i = wi(x, y, z);
        let b = W[i];
        if (BTREE[b + 1] >= 0) {
          if (idiv(LT[i], 16) >= 9 || mod(LT[i], 16) >= 9 || dim == 1) { if (rand(1, 6) == 1) { treeFrom(x, y, z, b); } }
        }
        if (b == 3) {
          if (W[i + 1] == 0) { if (idiv(LT[i + 1], 16) >= 9) {
            if (blockAt(x + 1, y, z) == 2 || blockAt(x - 1, y, z) == 2 || blockAt(x, y, z + 1) == 2 || blockAt(x, y, z - 1) == 2) { setBlock(x, y, z, 2); }
          } }
        }
        if (b == 2) { if (BHC[W[i + 1] + 1] == 1) { setBlock(x, y, z, 3); } }
        // crops grow in the light, faster on wet farmland
        if (BCROP[b + 1] >= 0 && BCROP[b + 1] < 3) {
          if (idiv(LT[i], 16) >= 9 || mod(LT[i], 16) >= 9) { let ch = 4; if (W[i - 1] == I_farmlandWet) { ch = 2; } if (rand(1, ch) == 1) { setBlock(x, y, z, b + 1); } }
        }
        if (b == I_farmland) { if (waterWithin(x, y, z) == 1) { setBlock(x, y, z, I_farmlandWet); } else { if (BCROP[W[i + 1] + 1] < 0) { if (rand(1, 4) == 1) { setBlock(x, y, z, 3); } } } }
        if (b == I_farmlandWet) { if (waterWithin(x, y, z) == 0) { setBlock(x, y, z, I_farmland); } }
        // reeds, bamboo and cactus grow taller
        if (b == I_reed || b == I_bamboo || b == 19) {
          if (W[i + 1] == 0) { if (W[i - 1] != b || W[i - 2] != b) { if (rand(1, 4) == 1) { setBlock(x, y + 1, z, b); } } }
        }
        if (BSPEC[b + 1] == 10) { if (rand(1, 3) == 1) { let ub = W[i - 1]; if (ub != 48 && ub != I_wailSand && ub != I_wailSoil && ub != I_magma) { setBlock(x, y, z, 0); } } }
        if (BWET[b + 1] > 0 && BFALL[b + 1] == 0) { if (waterNear(x, y, z) == 0) { setBlock(x, y, z, BWET[b + 1]); } }
        if (b == I_wetSponge) { if (dim == 1) { setBlock(x, y, z, I_sponge); } }
      }
      k = k + 1;
    }
  }
}
function waterWithin(x, y, z) {
  let r = 0, a = x - 4;
  while (a <= x + 4 && r == 0) { let c = z - 4; while (c <= z + 4) { if (BLQ[blockAt(a, y, c) + 1] == 7) { r = 1; } c = c + 1; } a = a + 1; }
  return r;
}

// ---------------------------------------------------------------- beds, signs, pots, cake, ...
let spawnDim = 0, dayN = 0, spawnSet = 0;
function bedUse(x, y, z, b) {
  if (dim != 0) { msgShow('여기서는 잘 수 없습니다! 침대가 터집니다', 2); setBlock(x, y, z, 0); partnerGone(x, y, z, b, 0); explodeShared(x + 0.5, y + 0.5, z + 0.5, 4); }
  else {
    spawnX = x + 0.5; spawnY = y + 1; spawnZ = z + 0.5; spawnDim = 0; spawnSet = 1;
    if (dark >= 7) {
      if (nearHostile(8) == 0) { tday = 0.0; dayN = dayN + 1; weatherClear(); msgShow('잠을 자고 아침이 되었습니다 (되살아날 곳을 정했습니다)', 3); }
      else { msgShow('근처에 몬스터가 있어 잘 수 없습니다', 2); }
    } else { msgShow('되살아날 곳을 정했습니다 (밤에만 잘 수 있습니다)', 2); }
  }
}
function nearHostile(r) {
  let e = 1, n = 0;
  while (e <= NMOB) { if (ET[e] > 0) { if (MHOST[ET[e]] == 1) { if (Math.abs(EX[e] - px) < r && Math.abs(EZ[e] - pz) < r && Math.abs(EY[e] - py) < 5) { n = n + 1; } } } e = e + 1; }
  return n;
}
// signs: their words (looked at, they are shown)
let SGX = [], SGY = [], SGZ = [], SGT = [], SGD = [];
function signUse(x, y, z, id) {
  let k = signFind(x, y, z);
  if (k == 0 || sneaking == 1) {
    mouseFree();
    ask('표지판에 쓸 글을 입력하세요');
    let s = answer();
    askDone();
    if (k == 0) { SGX.push(x); SGY.push(y); SGZ.push(z); SGT.push(s); SGD.push(dim); } else { SGT[k] = s; }
    netSign(x, y, z, s);
    lockReq();
  } else { msgShow(SGT[k], 4); }
}
function signFind(x, y, z) {
  let i = 1, r = 0;
  while (i <= SGX.length) { if (SGX[i] == x && SGY[i] == y && SGZ[i] == z && SGD[i] == dim) { r = i; } i = i + 1; }
  return r;
}
function potUse(x, y, z, b, id) {
  let used = 0;
  if (b == I_flowerPot) {
    if (id > 0) { if (ITK[id + 1] == 0) { if (BPOT[id + 1] > 0) { setBlock(x, y, z, BPOT[id + 1]); if (mod(gameMode, 2) == 0) { takeHeld(1); } used = 1; sndPlay(2); } } }
  } else {
    // a potted plant back into the hand
    let k = 1, pl = 0;
    while (k < NBLOCK) { if (BPOT[k + 1] == b) { pl = k; } k = k + 1; }
    if (pl > 0) { addItem(pl, 1, 0); setBlock(x, y, z, I_flowerPot); used = 1; sndPlay(2); }
  }
  return used;
}
function cakeEat(x, y, z) {
  if (food < 20 || mod(gameMode, 2) == 1) { food = Math.min(20, food + 2); sat = Math.min(food, sat + 0.4); sndPlay(5); if (rand(1, 7) == 1) { setBlock(x, y, z, 0); } }
}
function composterUse(id) {
  let used = 0;
  if (id > 0) { if (ITK[id + 1] == 0 && (BSHP[id + 1] == 1 || BLEAF[id + 1] == 1) || id == I_wheatSeeds || id == I_wheat || id == I_beetSeeds || id == I_carrot || id == I_potato || id == I_melonSlice || id == 105) {
    takeHeld(1); used = 1; sndPlay(5);
    if (rand(1, 7) == 1) { dropItem(I_boneMeal, 1, 0, px, py + 1, pz, 0); msgShow('뼛가루가 나왔습니다', 1.5); }
  } }
  return used;
}
// the anvil mends the tool in hand (a level, if there is one), the grindstone a quarter of it
function repairHeld(b) {
  let id = INVI[hotSel];
  if (ITDUR[id + 1] > 0 && INVD[hotSel] > 0) {
    if (b == I_grindstone) { INVD[hotSel] = Math.max(0, INVD[hotSel] - Math.ceil(ITDUR[id + 1] / 4)); xpAdd(2); msgShow('숫돌로 갈았습니다', 2); }
    else {
      if (xpLevel >= 1 || mod(gameMode, 2) == 1) { if (mod(gameMode, 2) == 0) { xpLevel = xpLevel - 1; } INVD[hotSel] = 0; msgShow(`${ITNAME[id + 1]}을(를) 고쳤습니다`, 2); sndPlay(6); }
      else { msgShow('경험치 레벨이 1 필요합니다', 2); }
    }
  } else { msgShow('손에 든 닳은 도구를 고칠 수 있습니다', 2); }
}
// the table of charms: three levels and a lapis make the tool in hand as good as new and tougher
function enchantHeld() {
  let id = INVI[hotSel];
  if (ITDUR[id + 1] > 0) {
    let li = 0, k = 1;
    while (k <= 36) { if (INVI[k] == 119) { li = k; } k = k + 1; }
    if ((xpLevel >= 3 && li > 0) || mod(gameMode, 2) == 1) {
      if (mod(gameMode, 2) == 0) { xpLevel = xpLevel - 3; INVN[li] = INVN[li] - 1; if (INVN[li] <= 0) { INVI[li] = 0; } }
      INVD[hotSel] = 0 - Math.floor(ITDUR[id + 1] / 2);
      msgShow(`${ITNAME[id + 1]}에 마법을 걸었습니다 (내구도 +50%)`, 3); sndPlay(7);
    } else { msgShow('경험치 3레벨과 청금석 1개가 필요합니다', 2); }
  } else { msgShow('도구나 무기를 들고 쓰세요', 2); }
}
function campfireCook(id) {
  let used = 0;
  smeltOf(id);
  if (smeltOut > 0) { if (ITFOOD[smeltOut + 1] > 0) { takeHeld(1); addItem(smeltOut, 1, 0); used = 1; sndPlay(5); } }
  return used;
}
let lodeOn = 0, lodeX = 0, lodeZ = 0;
function compassShow() {
  let tx2 = spawnX, tz2 = spawnZ, nm = '되살아날 곳';
  if (lodeOn == 1) { tx2 = lodeX; tz2 = lodeZ; nm = '자석석'; }
  let a = mod(atan2d(tx2 - px, tz2 - pz) - yaw + 540, 360) - 180, d = Math.round(Math.sqrt((tx2 - px) * (tx2 - px) + (tz2 - pz) * (tz2 - pz)));
  let w = '앞';
  if (a > 30) { w = '오른쪽'; } if (a < -30) { w = '왼쪽'; } if (Math.abs(a) > 135) { w = '뒤'; }
  msgShow(`${nm}: ${w}으로 ${d}블록`, 2);
}
// the anchor of the depths: glow crystal charges it, then it is where you come back (in the depths)
let anchorCh = 0;
function anchorUse(x, y, z, id) {
  if (id == I_glowCrystal) { anchorCh = Math.min(4, anchorCh + 1); if (mod(gameMode, 2) == 0) { takeHeld(1); } msgShow(`되살아남 닻 충전 ${anchorCh} / 4`, 2); }
  else {
    if (dim == 1) { if (anchorCh > 0) { spawnX = x + 0.5; spawnY = y + 1; spawnZ = z + 0.5; spawnDim = 1; spawnSet = 1; msgShow('잿빛 심연에서 되살아납니다', 2); } else { msgShow('빛수정으로 충전하세요', 2); } }
    else { msgShow('닻이 터집니다!', 2); setBlock(x, y, z, 0); explodeShared(x + 0.5, y + 0.5, z + 0.5, 5); }
  }
}
// the void chest: one store for all of them
function voidChestOpen() { curChest = NCHEST; CHON[NCHEST] = 3; uiOpen(4); }
// command blocks: their commands, run when they get power
let CBX = [], CBY = [], CBZ = [], CBT = [], CBD = [];
function commandBlockEdit(x, y, z) {
  // (v2.4.4: on a server only its ops: a command block runs with every right)
  if (netSrv > 0 && iAmOp() == 0) { msgShow('서버에서는 관리자만 명령 블록을 고칠 수 있습니다', 2); }
  else { if (gameMode == 1) {
    mouseFree();
    ask('명령 블록에 넣을 명령어 (전원이 들어오면 실행)');
    let s = answer();
    askDone();
    let k = cbFind(x, y, z);
    if (k == 0) { CBX.push(x); CBY.push(y); CBZ.push(z); CBT.push(s); CBD.push(dim); } else { CBT[k] = s; }
    lockReq();
    msgShow('명령을 넣었습니다', 2);
  } else { msgShow('명령 블록은 크리에이티브에서만 고칠 수 있습니다', 2); } }
}
function cbFind(x, y, z) {
  let i = 1, r = 0;
  while (i <= CBX.length) { if (CBX[i] == x && CBY[i] == y && CBZ[i] == z && CBD[i] == dim) { r = i; } i = i + 1; }
  return r;
}
function commandBlockRun(x, y, z) {
  let k = cbFind(x, y, z);
  // (v2.4.4: ~ is the block's middle, as in the genre: it was one block up)
  if (k > 0) { cmdX = x + 0.5; cmdY = y + 0.5; cmdZ = z + 0.5; cmdFromBlock = 1; runCommand(CBT[k]); cmdFromBlock = 0; }
}

// ---------------------------------------------------------------- experience
let xpPts = 0, xpLevel = 0;
function xpNeed(l) {
  let r = 2 * l + 7;
  if (l >= 16) { r = 5 * l - 38; } if (l >= 31) { r = 9 * l - 158; }
  return r;
}
function xpAdd(n) {
  xpPts = xpPts + n;
  while (xpPts >= xpNeed(xpLevel)) { xpPts = xpPts - xpNeed(xpLevel); xpLevel = xpLevel + 1; if (mod(xpLevel, 5) == 0) { sndPlay(6); } }
}

// ---------------------------------------------------------------- things thrown: snowballs, eggs, void pearls
function throwIt(k) {
  let a = 1, s = 0;
  while (a <= NARR) { if (s == 0) { if (AON[a] == 0) { s = a; } } a = a + 1; }
  if (s > 0) {
    AXX[s] = camX + lookX * 0.4; AYY[s] = camY - 0.1 + lookY * 0.4; AZZ[s] = camZ + lookZ * 0.4;
    AVX[s] = lookX * 22; AVY[s] = lookY * 22 + 2; AVZ[s] = lookZ * 22; AAGE[s] = 0; ASTK[s] = 0;
    AON[s] = 6 + k;
    swingT = 0.3; sndPlay(1);
  }
}
// where a thrown thing lands (AON 7 snowball, 8 egg, 9 void pearl)
function thrownHit(a) {
  let k = AON[a];
  if (k == 8) { if (rand(1, 8) == 1) { mobAdd(4, AXX[a], AYY[a], AZZ[a]); } }
  if (k == 9) {
    px = AXX[a]; py = Math.floor(AYY[a]) + 0.05; pz = AZZ[a];
    let n = 0;
    solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3);
    while (solidHit == 1 && n < 4) { py = py + 1; n = n + 1; solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3); }
    pvx = 0; pvy = 0; pvz = 0; fallTop = py;
    hurtT = 0; hurt(3, '공허 진주에 다쳤습니다');
    sndPlay(7);
  }
  AON[a] = 0;
}

// ---------------------------------------------------------------- spawners
// a list of the spawners the world made (or the player put), and their turns
let SPX = [], SPY = [], SPZ = [], SPD = [], SPT = [];
function spawnerNote(x, y, z) {
  let i = 1, f = 0;
  while (i <= SPX.length) { if (SPX[i] == x && SPY[i] == y && SPZ[i] == z && SPD[i] == dim) { f = 1; } i = i + 1; }
  if (f == 0) { SPX.push(x); SPY.push(y); SPZ.push(z); SPD.push(dim); SPT.push(rand(5, 15)); }
}
function spawnersStep(dt) {
  let i = 1;
  while (i <= SPX.length) {
    if (SPD[i] == dim) {
      let dx = SPX[i] + 0.5 - px, dz = SPZ[i] + 0.5 - pz, dy = SPY[i] - py;
      if (dx * dx + dz * dz + dy * dy < 256) {
        SPT[i] = SPT[i] - dt;
        if (SPT[i] <= 0) {
          SPT[i] = rand(10, 30);
          let b = blockAt(SPX[i], SPY[i], SPZ[i]);
          if (BSPEC[b + 1] == 6) {
            if (mod(gameMode, 2) == 0 && difficulty > 0 && grMobs == 1) {
              let n = rand(1, 3), k = 0;
              while (k < n) {
                let x = SPX[i] + rand(-3, 3), z = SPZ[i] + rand(-3, 3), y = SPY[i];
                if (blockAt(x, y, z) == 0 && blockAt(x, y + 1, z) == 0 && BSOL[blockAt(x, y - 1, z) + 1] > 0) { if (nearMobs(SPX[i], SPY[i], SPZ[i]) < 6) { mobAdd(BSPAWN[b + 1], x + 0.5, y, z + 0.5); } }
                k = k + 1;
              }
            }
          }
        }
      }
    }
    i = i + 1;
  }
}
function nearMobs(x, y, z) {
  let e = 1, n = 0;
  while (e <= NMOB) { if (ET[e] > 0) { if (Math.abs(EX[e] - x) < 9 && Math.abs(EZ[e] - z) < 9) { n = n + 1; } } e = e + 1; }
  return n;
}
// once a frame
function blocksStep(dt) {
  pressStep(dt); tntStep(dt); spawnersStep(dt); hoppersStep(dt); rsStep(dt); saveStep(dt);
  if (flashT > 0) { flashT = flashT - dt; }
  // what the eye rests on: a sign's words
  if (pickOn == 1) { if (BUSE[pickB + 1] == U_SIGN) { if (pickB != I_lectern) { let k = signFind(pickX, pickY, pickZ); if (k > 0) { if (msgT < 0.5) { msgShow(SGT[k], 0.6); } } } } }
  // the light sensors follow the day
  sensorT = sensorT + dt;
  if (sensorT > 3) { sensorT = 0; if (dark != sensorDark) { sensorDark = dark; sensorsAround(); } }
  // (v2.4.4: the sensors round the player are known to sensorStep after this)
}
let sensorT = 0, sensorDark = 0 - 1;
function sensorsAround() {
  let x = Math.floor(px) - 12;
  while (x <= Math.floor(px) + 12) {
    let z = Math.floor(pz) - 12;
    while (z <= Math.floor(pz) + 12) {
      if (cOK(x, z) == 1) { let y = Math.max(1, Math.floor(py) - 10); while (y < Math.min(WY - 1, Math.floor(py) + 10)) { if (BSPEC[W[wi(x, y, z)] + 1] == 9) { sensorKeep(x, y, z); powerAround(x, y, z); } y = y + 1; } }
      z = z + 1;
    }
    x = x + 1;
  }
}
// a new world: what the old one wrote down goes
function worldExtraInit() {
  SGX = []; SGY = []; SGZ = []; SGT = []; SGD = [];
  LTX = []; LTY = []; LTZ = []; LTT = []; LTD = [];
  SPX = []; SPY = []; SPZ = []; SPD = []; SPT = [];
  CBX = []; CBY = []; CBZ = []; CBT = []; CBD = [];
  PMT = []; PMX = []; PMY = []; PMZ = []; SMX = []; SMZ = [];
  PRX = []; PRY = []; PRZ = []; PRT = []; PRL = []; PRD = []; PRC = []; TNX = []; TNY = []; TNZ = []; TNT_T = []; TND = []; TNO = []; EGX = []; EGY = []; EGZ = []; EGD = []; EGS = []; XPW = [];
  CHT = []; CHTT = []; CHL = []; chScroll = 0;
  xpPts = 0; xpLevel = 0; dayN = 0; spawnDim = 0; spawnSet = 0; lodeOn = 0; anchorCh = 0; specMob = 0; difficulty = 2; gameTicks = 0;
  weatherClear(); gamerulesInit();
}

// ---------------------------------------------------------------- trading with the people of the villages
// four offers a villager (from its slot and the seed): what it wants -> what it gives
let TRA = [I_wheat, I_potato, I_carrot, 101, I_paper, 32, I_jade, I_jade, I_jade, I_jade, I_jade, I_jade, I_jade, 115, I_string, I_jade];
let TRAN = [20, 26, 22, 15, 24, 18, 1, 3, 1, 2, 4, 1, 6, 16, 14, 1];
let TRB = [I_jade, I_jade, I_jade, I_jade, I_jade, I_jade, I_bread, 132, 102, 125, 133, 27, 155, I_jade, I_jade, I_glowCrystal];
let TRBN = [1, 1, 1, 1, 1, 1, 6, 1, 4, 1, 1, 8, 1, 1, 1, 2];
let trMob = 0, trSel = 0;
function tradeOpen(e) { trMob = e; uiMode = 10; mouseFree(); txClear(); }
function tradeOffer(k) { return mod(trMob * 5 + k * 4 + seed + k * k, 16) + 1; }
function tradeScreen() {
  penAlpha(45); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0);
  panel(-110, 92, 110, -40);
  tx(20, `${MNAME[M_VILLAGER]}과 바꾸기 (클릭) · E 닫기`, -102, 86, 8, '#404040', 1);
  let k = 0, mx = mouseX(), my = mouseY();
  trSel = 0;
  while (k < 4) {
    let o = tradeOffer(k), y0 = 70 - k * 26, y1 = y0 - 22, hot = 0;
    if (mx >= -100 && mx <= 100 && my <= y0 && my >= y1) { hot = 1; trSel = k + 1; }
    let c = '#8b8b8b';
    if (hot == 1) { c = '#a8b8e8'; }
    box(-100, y0, 100, y1, c);
    slotItem(-80, y0 - 11, TRA[o], TRAN[o], 0, 21 + k * 3);
    tx(22 + k * 3, `${ITNAME[TRA[o] + 1]} ${TRAN[o]}개 → ${ITNAME[TRB[o] + 1]} ${TRBN[o]}개`, -62, y0 - 8, 7, '#202020', 1);
    slotItem(80, y0 - 11, TRB[o], TRBN[o], 0, 23 + k * 3);
    k = k + 1;
  }
}
function tradeInput() {
  if (keyHit(69) == 1 || keyHit(27) == 1 || ET[trMob] != M_VILLAGER) { uiMode = 0; txClear(); lockReq(); }
  else {
    if (clickLatch == 1) { if (trSel > 0) {
      let o = tradeOffer(trSel - 1), have = 0, k = 1;
      while (k <= 36) { if (INVI[k] == TRA[o]) { have = have + INVN[k]; } k = k + 1; }
      if (have >= TRAN[o] || mod(gameMode, 2) == 1) {
        let n = TRAN[o];
        k = 1;
        while (k <= 36 && n > 0) { if (INVI[k] == TRA[o]) { let t = Math.min(n, INVN[k]); INVN[k] = INVN[k] - t; n = n - t; if (INVN[k] <= 0) { INVI[k] = 0; INVN[k] = 0; INVD[k] = 0; } } k = k + 1; }
        addItem(TRB[o], TRBN[o], 0); if (addLeft > 0) { dropItem(TRB[o], addLeft, 0, px, py + 1, pz, 0); }
        sndPlay(6); xpAdd(rand(1, 3));
      } else { msgShow(`${ITNAME[TRA[o] + 1]}이(가) ${TRAN[o]}개 필요합니다`, 2); }
    } }
  }
}
