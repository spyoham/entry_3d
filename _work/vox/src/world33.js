// ===================================================================== (v3.3) the world's rules: the warden's fight, the ash-folk, carts with a chest or a hopper, riders, big chests

// ---------------------------------------------------------------- each mob: its air, its seat
// EAIR: the seconds its head has been under water (a zombie: the seconds it has pushed at a door);
// 1000 + the cart or boat it sits in. WDRN: the kinds that drown; WRID: the kinds that get into a
// cart or a boat (no flyer, none of the water, none 1.4 wide or more)
let EAIR = [], WDRN = [], WRID = [];
function w33Init() {
  EAIR = [];
  let i = 0;
  while (i < NMOB) { EAIR.push(0); i = i + 1; }
  if (WDRN.length == 0) {
    let t = 1;
    while (t <= NMOBT) {
      let a = 1, b = 1;
      if (MSWIM[t] == 1 || MAI[t] == 9 || isDead(t) == 1 || t == M_SKELETON || t == M_STRAY || t == M_BLACKSKEL || t == M_BONEHORSE || t == M_BONEKING || t == M_GOLEM || t == M_ROTPIG || t == M_ROTBOAR || t == M_PHANTOM || t == M_NETPLAYER) { a = 0; }
      if (MSWIM[t] == 1 || MAI[t] == 9 || MFLY[t] == 1 || MW[t] >= 1.4 || t == M_NETPLAYER) { b = 0; }
      WDRN.push(a); WRID.push(b);
      t = t + 1;
    }
  }
}
// (mobs.js mobStep, before a mob's own step)
function worldMob(e, t, dt) {
  if (EAIR[e] >= 1000) { riderKeep(e); }
  // (an ash-folk looking at its gold stands and strikes nobody)
  if (t == M_ASHPIG) { if (ETG[e] > 0) { golemT = 1; golemWant = 0; golemYaw = EYAW[e]; } }
  if (mod(frameNo + e, 15) == 7) { worldSlow(e, t, dt * 15); }
}
function worldSlow(e, t, dt) {
  // air: fifteen seconds with the head under, then 2 a second
  if (WDRN[t] == 1) { if (EAIR[e] < 1000) {
    if (headIn(e) == 1) { EAIR[e] = EAIR[e] + dt; if (EAIR[e] >= 15) { EAIR[e] = EAIR[e] - 1; if (grDrown == 1) { EHURT[e] = 0; mobHurt(e, 2, 0, 0); } } }
    else { EAIR[e] = 0; }
  } }
  if (ET[e] == t) {
    if (t == M_ASHPIG) { ashSlow(e, dt); }
    if (grGrief == 1) {
      if (t == 11) { if (netSrv == 0 || netHost == 1) { wanderBlock(e); } }
      if (difficulty == 3) { if (t == M_ZOMBIE || t == M_HUSK || t == M_ZOMBIEVILLAGER) { if (EAIR[e] < 1000) { doorPush(e, dt); } } }
    }
  }
}
// a block changed by the world, told to the others of a server and kept there
function worldSet(x, y, z, b) {
  setBlock(x, y, z, b);
  if (netSrv > 0) { if (netSt == 2) { evAdd('b', `${x}^${y}^${z}^${b}^${dim}`); if (netHost == 1) { hostKeepEdit(x, y, z, b, dim); } } }
}
// (mobs.js mobHurt0: a mob dies) a cart's store falls out, the wanderer's block drops
function worldDied(e, t) {
  if (t == M_CHESTCART || t == M_HOPPERCART) { cartSpill(e); }
  if (t == 11) { if (EVAR[e] > 0) { dropItem(EVAR[e], 1, 0, EX[e], EY[e] + 0.5, EZ[e], 0); EVAR[e] = 0; } }
}
// (mobs.js mobHurt0) do things drop: doMobLoot for the living, doEntityDrops for boats and carts
function dropsOn(t) {
  let r = grLoot;
  if (t == M_BOAT) { r = GRV[25]; } else { if (isCart(t) == 1) { r = GRV[25]; } }
  return r;
}

// ---------------------------------------------------------------- riders
// a mob touching an empty cart or boat gets in and stays (the cart's ETG: who sits in it) until the
// cart is broken or the player, sneaking, clicks it with an empty hand
function riderKeep(e) {
  let c = EAIR[e] - 1000, ok = 0;
  if (c >= 1) { if (c <= NMOB) { if (ET[c] == M_BOAT || ET[c] == M_MINECART) { if (ETG[c] == e) { ok = 1; } } } }
  if (ok == 1) { EX[e] = EX[c]; EY[e] = EY[c] + 0.15; EZ[e] = EZ[c]; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; EFALL[e] = 0 - 999; }
  else { EAIR[e] = 0; }
}
// (rails.js cartStep, extra.js boatStep)
function cartRider(e) {
  let r = ETG[e];
  if (r > 0) {
    let ok = 0;
    if (r <= NMOB) { if (ET[r] > 0) { if (EAIR[r] == 1000 + e) { ok = 1; } } }
    if (ok == 0) { ETG[e] = 0; }
  } else {
    if (ECNV[e] > 0) { ECNV[e] = ECNV[e] - 1; }
    else { if (riding != e) { if (mod(frameNo + e, 10) == 0) { cartTakes(e); } } }
  }
}
function cartTakes(e) {
  let f = 1, got = 0, t = 0;
  while (f <= NMOB && got == 0) {
    t = ET[f];
    if (t > 0) { if (WRID[t] == 1) { if (EAIR[f] < 1000 && riding != f && EOWN[f] != 2) {
      if (Math.abs(EX[f] - EX[e]) < 0.5 + MW[t] * 0.5 && Math.abs(EZ[f] - EZ[e]) < 0.5 + MW[t] * 0.5 && Math.abs(EY[f] - EY[e]) < 1) { if (ET[e] != M_MINECART || t != M_GOLEM) { got = f; } }
    } } }
    f = f + 1;
  }
  if (got > 0) { ETG[e] = got; EAIR[got] = 1000 + e; }
}
// who sits in cart c gets out, to the side of it that is free; the cart takes nobody for three seconds
// (the click below, a lit activator rail)
function riderOff(c) {
  let f = ETG[c], sx = cosd(EYAW[c]) * 1.1, sz = 0 - sind(EYAW[c]) * 1.1;
  if (f > 0) {
    if (BSOL[blockAt(Math.floor(EX[c] + sx), Math.floor(EY[c] + 0.3), Math.floor(EZ[c] + sz)) + 1] == 1) { sx = 0 - sx; sz = 0 - sz; }
    ETG[c] = 0; ECNV[c] = 90;
    if (f <= NMOB) { EAIR[f] = 0; if (BSOL[blockAt(Math.floor(EX[c] + sx), Math.floor(EY[c] + 0.3), Math.floor(EZ[c] + sz)) + 1] != 1) { EX[f] = EX[c] + sx; EZ[f] = EZ[c] + sz; } }
  }
}
// (blocks.js useKey0) a click on a cart or on who sits in one: 1 when the click was taken
function cartClick(e) {
  let r = 0, t = ET[e], c = 0;
  if (EAIR[e] >= 1000) { if (sneaking == 1 && INVI[hotSel] == 0) { c = EAIR[e] - 1000; } }
  else { if (t == M_BOAT || isCart(t) == 1) { c = e; } }
  if (c > 0) {
    if (ET[c] == M_CHESTCART || ET[c] == M_HOPPERCART) {
      r = 1;
      cartStoreOf(c);
      if (cFound > 0) { curChest = cFound; curCap = chestCap(cFound); uiOpen(4); ashGuard(I_chest); } else { msgShow('상자가 너무 많습니다', 2); }
    } else { if (ETG[c] > 0) {
      r = 1;
      if (sneaking == 1 && INVI[hotSel] == 0) { riderOff(c); } else { msgShow('누가 타고 있습니다 (웅크리고 빈손으로 누르면 내립니다)', 2); }
    } }
  }
  return r;
}

// ---------------------------------------------------------------- carts with a chest or a hopper
// What is in one lies in a chest record at no place: x the cart's own number (its EVAR), y 500, z 0 a
// chest (27 slots) or 1 a hopper (5). So it is saved with the chests, told on a server slot by slot as
// a chest's is, and found again by a cart that was kept while its chunk was away.
let WCS = [], wLive = 0, wcrT = 0, wDeadSeen = 0;
function cartKind(id) {
  let t = 0;
  if (id == I_minecart) { t = M_MINECART; } if (id == I_tntMinecart) { t = M_TNTCART; }
  if (id == I_chestMinecart) { t = M_CHESTCART; } if (id == I_hopperMinecart) { t = M_HOPPERCART; }
  return t;
}
function cartStoreOf(e) {
  cFound = 0;
  if (EVAR[e] == 0) { if (ERK[e] == 0) { EVAR[e] = rand(1, 99999999); } }
  if (EVAR[e] > 0) { chestAt(EVAR[e], 500, ET[e] - M_CHESTCART); }
}
// the store of the cart standing in that cell (cFound 0: none)
function cartStoreAt(x, y, z) {
  cFound = 0;
  let k = 1, e = 0, f = 0;
  while (k <= WCS.length) {
    e = WCS[k];
    if (ET[e] == M_CHESTCART || ET[e] == M_HOPPERCART) { if (Math.floor(EX[e]) == x && Math.floor(EZ[e]) == z && Math.floor(EY[e] + 0.01) == y) { f = e; } }
    k = k + 1;
  }
  if (f > 0) { cartStoreOf(f); }
}
function cartSpill(e) {
  if (EVAR[e] > 0) {
    chestFind(EVAR[e], 500, ET[e] - M_CHESTCART);
    if (cFound > 0) {
      let c = cFound, k = 1, j = 0;
      while (k <= 27) {
        j = (c - 1) * 27 + k;
        if (CHI[j] > 0) { if (GRV[25] == 1) { dropItem(CHI[j], CHN[j], CHD[j], EX[e], EY[e] + 0.5, EZ[e], 1); } CHI[j] = 0; CHN[j] = 0; CHD[j] = 0; chestSay(c, k); }
        k = k + 1;
      }
      CHON[c] = 0;
    }
  }
}
// one thing out of chest a into chest c: 1 when it went
function chestPull(c, a) {
  let ab = (a - 1) * 27, g = 0, cap = chestCap(a), k = 1;
  while (k <= cap && g == 0) { if (CHI[ab + k] > 0) { if (chestTake(c, CHI[ab + k], 1, CHD[ab + k]) == 1) { g = k; } } k = k + 1; }
  if (g > 0) { CHN[ab + g] = CHN[ab + g] - 1; if (CHN[ab + g] <= 0) { CHI[ab + g] = 0; CHN[ab + g] = 0; CHD[ab + g] = 0; } chestTouched(a); chestSay(a, g); g = 1; }
  return g;
}
// the things lying within r of (cx, cz), from cy to two blocks over it, into chest c
// ((v3.2) another player's thing: asked of its owner (netmob.js); (v3.3) an orb of experience is no thing)
function chestSuck(c, cx, cy, cz, r) {
  let i = 1;
  while (i <= NITM) {
    if (IID[i] > 0 && IID[i] != I_xpOrb) { if (Math.abs(IXX[i] - cx) <= r && Math.abs(IZZ[i] - cz) <= r && IYY[i] >= cy && IYY[i] < cy + 2) {
      if (IRK[i] > 0) { netItemHopper(i, c); }
      else {
        let n = INN[i];
        while (n > 0) { if (chestTake(c, IID[i], 1, IDU[i]) == 1) { n = n - 1; } else { INN[i] = n; n = 0 - 1; } }
        if (n == 0) { IID[i] = 0; }
      }
    } }
    i = i + 1;
  }
}
// a cart with a hopper: one thing from the container over it, else the things lying in its cell and a
// block round it (held on a lit activator rail)
function hcartWork(e) {
  cartRail(EX[e], EY[e], EZ[e]);
  let held = 0;
  if (cRail > 0) { if (BAUX[cRail + 1] == 3) { if (BON[cRail + 1] == 1) { held = 1; } } }
  if (held == 0) {
    cartStoreOf(e);
    let c = cFound, x = Math.floor(EX[e]), y = Math.floor(EY[e] + 0.01), z = Math.floor(EZ[e]);
    if (c > 0) {
      cFound = 0;
      if (BUSE[blockAt(x, y + 1, z) + 1] == U_CHEST) { chestAt(x, y + 1, z); }
      if (cFound > 0) { if (chestPull(c, cFound) == 1) { held = 1; } }
      else { chestSuck(c, EX[e], EY[e] - 0.5, EZ[e], 1); }
    }
  }
}
// (items.js hoppersStep, each 0.4 s) the carts with a store here; the hoppers' carts work; too many
// mobs in a cell; the angered forgive the dead
function worldPass() {
  WCS = []; wLive = 0;
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) { wLive = wLive + 1; if (ET[e] == M_CHESTCART || ET[e] == M_HOPPERCART) { WCS.push(e); } }
    e = e + 1;
  }
  // (a hopper's cart works on the screen that runs it; the crowd is counted on one screen: the host's)
  e = 1;
  while (e <= WCS.length) { if (ET[WCS[e]] == M_HOPPERCART) { if (ERK[WCS[e]] == 0) { hcartWork(WCS[e]); } } e = e + 1; }
  wcrT = wcrT + 0.4;
  if (wcrT >= 0.5) { wcrT = wcrT - 0.5; if (GRV[28] > 0) { if (wLive > GRV[28]) { if (netSrv == 0 || netSt != 2 || netHost == 1) { cramStep(GRV[28]); } } } }
  if (dead != 0) {
    if (wDeadSeen == 0) { wDeadSeen = 1; if (GRV[24] == 1) { e = 1; while (e <= NMOB) { if (ET[e] > 0) { if (EST[e] == 4) { if (MHOST[ET[e]] == 0) { EST[e] = 0; } } } e = e + 1; } } }
  } else { wDeadSeen = 0; }
}
// maxEntityCramming: more than that many in one cell (the same column, within two blocks up or down:
// they hop), and those over it are hurt 6 (each half second)
let CRH = [];
function cramStep(cram) {
  let e = 1, h = 0;
  if (CRH.length == 0) { while (h < 64) { CRH.push(0); h = h + 1; } }
  h = 1; while (h <= 64) { CRH[h] = 0; h = h + 1; }
  while (e <= NMOB) { if (ET[e] > 0) { h = mod(Math.floor(EX[e] + 60000) * 7 + Math.floor(EZ[e] + 60000) * 13, 64) + 1; CRH[h] = CRH[h] + 1; } e = e + 1; }
  h = 1;
  while (h <= 64) { if (CRH[h] > cram) { cramHeap(h, cram); } h = h + 1; }
}
function cramHeap(h, cram) {
  let e = 1, n = 0, x = 0, y = 0, z = 0;
  while (e <= NMOB) {
    if (ET[e] > 0) { if (mod(Math.floor(EX[e] + 60000) * 7 + Math.floor(EZ[e] + 60000) * 13, 64) + 1 == h) {
      if (n == 0) { x = Math.floor(EX[e]); y = EY[e]; z = Math.floor(EZ[e]); }
      if (Math.floor(EX[e]) == x && Math.abs(EY[e] - y) < 2 && Math.floor(EZ[e]) == z) {
        n = n + 1;
        if (n > cram) { if (MAI[ET[e]] != 9) { EHURT[e] = 0; mobHurt(e, 6, 0, 0); } }
      }
    } }
    e = e + 1;
  }
}

// ---------------------------------------------------------------- the ash-folk
// One who wears no gold is gone for (within 16 blocks, in survival); gold on, it leaves you be.
// Opening a chest or breaking gold or a chest near them angers them for 30 s, as a blow does.
// A gold ingot thrown to one or put in its hand: it looks at it for 6 s (and strikes nobody), then
// throws something back. The young do not fight and give nothing. ETG: above 0 the seconds of looking
// left, under 0 the seconds of anger left; EVAR 1: its anger has been counted.
function goldWorn() {
  let r = 0, s = 37;
  while (s <= 40) { if (INVI[s] >= 1940) { if (INVI[s] <= 1943) { r = 1; } } s = s + 1; }
  return r;
}
function ashSlow(e, dt) {
  if (isBaby(e) == 1) { EST[e] = 0; }
  else {
    let dx = px - EX[e], dy = py - EY[e], dz = pz - EZ[e], near = 0;
    if (dx * dx + dy * dy + dz * dz < 256) { if (mod(gameMode, 2) == 0 && dead == 0 && difficulty > 0) { near = 1; } }
    if (EST[e] == 4) {
      // (struck while it looked at its gold: the gold is gone and it fights)
      if (ETG[e] > 0) { ETG[e] = 0; }
      if (EVAR[e] == 0) { EVAR[e] = 1; ETG[e] = 0 - 30; }
      if (ETG[e] < 0) { ETG[e] = Math.min(0, ETG[e] + dt); }
      else { if (near == 0 || goldWorn() == 1) { EST[e] = 0; EVAR[e] = 0; } }
    } else {
      EVAR[e] = 0;
      if (ETG[e] > 0) { ETG[e] = ETG[e] - dt; if (ETG[e] <= 0) { ETG[e] = 0; ashGift(e); } }
      else {
        if (near == 1 && goldWorn() == 0) { EST[e] = 4; EVAR[e] = 1; ETG[e] = 0; }
        else { ashTakes(e); }
      }
    }
  }
}
// a gold ingot lying within its reach
function ashTakes(e) {
  let i = 1, g = 0;
  while (i <= NITM && g == 0) {
    if (IID[i] == I_ingotGold) { if (IRK[i] == 0) { if (Math.abs(IXX[i] - EX[e]) < 1.5 && Math.abs(IZZ[i] - EZ[e]) < 1.5 && Math.abs(IYY[i] - EY[e]) < 1.5) { g = i; } } }
    i = i + 1;
  }
  if (g > 0) { INN[g] = INN[g] - 1; if (INN[g] <= 0) { IID[g] = 0; } ETG[e] = 6; sndPlay(6); }
}
// (blocks.js useKey0) a gold ingot put in its hand: 1 when it took it
function ashGive(e) {
  let r = 0;
  if (isBaby(e) == 0) { if (ETG[e] <= 0 && EST[e] != 4) { ETG[e] = 6; r = 1; if (mod(gameMode, 2) == 0) { takeHeld(1); } sndPlay(6); } }
  return r;
}
// what it gives for the gold: the genre's table (of 459), with this world's things - item, weight,
// least, most (item -1 a potion of fire resistance, -2 one to throw, -3 a bottle of water)
let ASHT = [I_book, 5, 1, 1, 157, 8, 1, 1, 0 - 2, 8, 1, 1, 0 - 1, 8, 1, 1, 0 - 3, 10, 1, 1, I_ironNugget, 10, 10, 36, 170, 10, 2, 4, 114, 20, 3, 9, I_quartz, 20, 5, 12,
  34, 40, 1, 1, I_glintObsidian, 40, 1, 3, I_fireCharge, 40, 1, 1, 117, 40, 2, 4, I_wailSand, 40, 2, 8, I_ashBrick, 40, 2, 8, 115, 40, 6, 12, 9, 40, 8, 16, I_blackrock, 40, 8, 16];
function ashGift(e) {
  let r = rand(1, 459), k = 1, id = 0, n = 1, du = 0, hit = 0;
  while (k <= ASHT.length && hit == 0) {
    r = r - ASHT[k + 1];
    if (r <= 0) { hit = 1; id = ASHT[k]; n = rand(ASHT[k + 2], ASHT[k + 3]); }
    k = k + 4;
  }
  if (id < 0) { ashPotion(0 - id); id = gI; du = gD; }
  if (id > 0) {
    dropItem(id, n, du, EX[e], EY[e] + 1.2, EZ[e], 0);
    // (thrown to the player when near)
    if (lastItem > 0) { let dx = px - EX[e], dz = pz - EZ[e], d = Math.sqrt(dx * dx + dz * dz) + 0.01; if (d < 12) { IVX[lastItem] = dx / d * 3; IVZ[lastItem] = dz / d * 3; IVY[lastItem] = 4; } }
    sndPlay(6);
  }
}
// (the potions are brew.js's: by their names, a fire charge when there is none) gI the item, gD what rides on it
function ashPotion(k) {
  gI = I_fireCharge; gD = 0;
  if (k == 3) { let w = itemByName('water_bottle'); if (w > 0) { gI = w; } }
  else {
    let p = itemByName('potion');
    if (k == 2) { p = itemByName('splash_potion'); }
    if (p > 0) { gI = p; gD = ashPotD; }
  }
}
// (brew.js: what rides on a potion says which it is - 5 fire resistance)
let ashPotD = 5;
// (items.js chestOrFurnaceGone, chestOpen: a block broken, a chest opened) gold or a chest touched
// within 16 blocks of the ash-folk: they are angered
function ashGuard(b) {
  if (b == 10 || b == 42 || b == I_oreAshGold || b == I_gildedBlackrock || BUSE[b + 1] == U_CHEST) { if (netApplying == 0) { if (mod(gameMode, 2) == 0) {
    let e = 1;
    while (e <= NMOB) {
      if (ET[e] == M_ASHPIG) { if (ERK[e] == 0) { if ((EX[e] - px) * (EX[e] - px) + (EY[e] - py) * (EY[e] - py) + (EZ[e] - pz) * (EZ[e] - pz) < 256) { if (isBaby(e) == 0) { EST[e] = 4; EVAR[e] = 0; ETM[e] = 30; } } } }
      e = e + 1;
    }
  } } }
}

// ---------------------------------------------------------------- cheap tricks of the monsters
// the dead on hard push at a wooden door before them: 12 s and it is broken
function doorPush(e, dt) {
  let x = Math.floor(EX[e] + sind(EYAW[e]) * 0.7), y = Math.floor(EY[e] + 0.2), z = Math.floor(EZ[e] + cosd(EYAW[e]) * 0.7), b = blockAt(x, y, z), d = 0;
  if (BPLC[b + 1] == P_DOOR) { if (BTOOL[b + 1] != 1) { d = 1; } }
  if (d == 1) {
    EAIR[e] = EAIR[e] + dt;
    if (EAIR[e] >= 12) {
      EAIR[e] = 0;
      if (BPLC[blockAt(x, y - 1, z) + 1] == P_DOOR) { y = y - 1; }
      if (BPLC[blockAt(x, y + 1, z) + 1] == P_DOOR) { worldSet(x, y + 1, z, 0); }
      worldSet(x, y, z, 0);
      sndPlay(2);
    }
  } else { EAIR[e] = 0; }
}
// the wanderer takes a block up now and then (its EVAR) and puts it down somewhere later
function wanderBlock(e) {
  let x = Math.floor(EX[e]) + rand(-2, 2), y = Math.floor(EY[e]) + rand(0, 2), z = Math.floor(EZ[e]) + rand(-2, 2), b = blockAt(x, y, z);
  if (EVAR[e] == 0) {
    if (rand(1, 5) <= 2) { if (b == 2 || b == 3 || b == 8 || b == 9 || b == 22 || b == I_pumpkin || b == I_melon || b == I_tnt) { if (BSOL[blockAt(x, y + 1, z) + 1] == 0) { EVAR[e] = b; worldSet(x, y, z, 0); } } }
  } else {
    if (rand(1, 200) == 1) { if (b == 0) { if (BSOL[blockAt(x, y - 1, z) + 1] == 1) { worldSet(x, y, z, EVAR[e]); EVAR[e] = 0; } } }
  }
}

// ---------------------------------------------------------------- the warden's fight
// (dims.js bossStep, on its owner's screen) the nearest crystal within 32 blocks (bk: its pillar + 1,
// 0 none) mends it 1 each half second, and a beam is seen (its EVAR); that crystal broken while it
// mends: 10 hurt
let wdCry = 0, wdHealT = 0, wdShot = 0, padY = 0, eggY = 0;
function wardenHeal(e, bk, dt) {
  if (wdCry > 0) { if (bk != wdCry) {
    pillarAt(wdCry - 1);
    if (cOK(pilX, pilZ) == 1) { if (blockAt(pilX, pilH + 1, pilZ) != 57) { EHURT[e] = 0; mobHurt0(e, 10, 0, 0); } }
  } }
  wdCry = bk;
  if (ET[e] == 10) {
    EVAR[e] = bk;
    if (bk > 0) { wdHealT = wdHealT + dt; if (wdHealT >= 0.5) { wdHealT = wdHealT - 0.5; if (EHP[e] < MHP[10]) { EHP[e] = EHP[e] + 1; } } }
  } else { wdCry = 0; }
}
// (mobs.js drawMob)
function wardenBeam(e, fog) {
  pillarAt(EVAR[e] - 1);
  fwSeg(EX[e], EY[e] + 1.5, EZ[e], pilX + 0.5, pilH + 1.5, pilZ + 0.5, 0.1, CBEAM, 23, fog);
}
// a slow ball of its breath at the one it goes for (within 64 blocks): where it lands, a cloud
function wardenShot(e) {
  let dx = tgX - EX[e], dy = tgY - EY[e], dz = tgZ - EZ[e];
  if (dx * dx + dy * dy + dz * dz < 4096) { shotEn = 0 - 4; arrowShoot(EX[e], EY[e] + 1, EZ[e], tgX, tgY + 0.2, tgZ, 2); shotEn = 0; sndPlay(5); }
}
// its breath lying on the ground: 3 blocks round, three seconds, 3 hurt a second through armour
// (an arrow of its own kind, AON 19: seen and felt on every screen of a server)
function wardenCloud(x, y, z) {
  arrowShoot(x, y, z, x + 1, y, z, 11);
  if (lastArr > 0) { AON[lastArr] = 19; AVX[lastArr] = 0; AVY[lastArr] = 0; AVZ[lastArr] = 0; AXX[lastArr] = x; netArrowSay(lastArr); }
}
function cloudStep(a, dt) {
  if (AAGE[a] >= 3) { AON[a] = 0; }
  else { if (AAGE[a] >= ASTK[a]) {
    ASTK[a] = ASTK[a] + 1;
    if ((px - AXX[a]) * (px - AXX[a]) + (pz - AZZ[a]) * (pz - AZZ[a]) < 9 && Math.abs(py - AYY[a]) < 2.5) { hurtMob = 1; hurtR(3, '수호자의 숨결에 당했습니다'); hurtMob = 0; }
  } }
}
function drawCloud(a, fog) {
  let k = 0, sx = 0, sz = 0;
  while (k < 3) {
    sx = sind(k * 60 + frameNo * 3) * 3; sz = cosd(k * 60 + frameNo * 3) * 3;
    fwSeg(AXX[a] - sx, AYY[a] + 0.2, AZZ[a] - sz, AXX[a] + sx, AYY[a] + 0.2, AZZ[a] + sz, 0.3, CPOT, 20, fog);
    k = k + 1;
  }
}
// (dims.js arrive) where one comes into the void: 5 x 5 of obsidian with three cells of air over it,
// made again each time (padY: its level)
function wardenPad(x, y, z) {
  if (y < 20) { y = 48; }
  padY = y;
  let a = x - 2, c = 0, k = 0;
  while (a <= x + 2) {
    c = z - 2;
    while (c <= z + 2) {
      if (blockAt(a, y, c) != 34) { setBlock(a, y, c, 34); }
      k = 1;
      while (k <= 3) { if (blockAt(a, y + k, c) != 0) { setBlock(a, y + k, c, 0); } k = k + 1; }
      c = c + 1;
    }
    a = a + 1;
  }
}

// ---------------------------------------------------------------- gates to the depths
// The gates gone through or lit are remembered (GTK: dim, x, z each): a gate leads to the nearest
// one known within 128 blocks in the overworld, 16 in the depths, else to the place across (where
// one is found within 16 blocks or made).
let GTK = [], gtSeed = 0, gtX = 0, gtZ = 0;
function gateKnown(d, x, z) {
  if (gtSeed != seed + netSrv * 7919) { GTK = []; gtSeed = seed + netSrv * 7919; }
  let k = 1, f = 0;
  while (k <= GTK.length) { if (GTK[k] == d) { if (Math.abs(GTK[k + 1] - x) < 4 && Math.abs(GTK[k + 2] - z) < 4) { f = 1; } } k = k + 3; }
  if (f == 0) { if (GTK.length >= 120) { GTK = []; } GTK.push(d); GTK.push(x); GTK.push(z); }
}
// from the gate here to dim d at (x, z): gtX, gtZ where to
function gateTo(d, x, z, r) {
  gateKnown(dim, Math.floor(px), Math.floor(pz));
  gtX = x; gtZ = z;
  let k = 1, best = r * r + 1, dd = 0;
  while (k <= GTK.length) {
    if (GTK[k] == d) { dd = (GTK[k + 1] - x) * (GTK[k + 1] - x) + (GTK[k + 2] - z) * (GTK[k + 2] - z); if (dd < best) { best = dd; gtX = GTK[k + 1]; gtZ = GTK[k + 2]; } }
    k = k + 3;
  }
}
