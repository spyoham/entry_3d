// ===================================================================== (v2.7) closer to 1.16.5
// the world's own life as the genre's: random ticks at the genre's rate, leaves that fall away
// from no log, fire that spreads, burns and goes out, blasts stopped by what they hit, sponges

// ---------------------------------------------------------------- random ticks
// the genre gives 3 random ticks to each 16 x 16 x 16 section a game tick: each cell one in 68 s
// on average. Here the cells within 32 of the player, all heights (64 x 64 x WY), at that rate
// (randomTickSpeed scales it): 7700 a second at 128 high, a few per frame for each that matters.
// It was 30 picks each half second over 48 x 48 (a cell once in 77 minutes: saplings took hours).
let RTK = [], rtAcc = 0, wcAcc = 0;
function rtInit() {
  RTK = [];
  let b = 0;
  while (b < BSOL.length) {
    let r = 0;
    if (BTREE[b + 1] >= 0 && BTREE[b + 1] < 6) { r = 1; }
    if (b == 2 || b == 20 || b == I_farmland || b == I_farmlandWet || b == I_reed || b == I_bamboo || b == 19 || b == I_kelp) { r = 1; }
    if (BCROP[b + 1] >= 0 && BCROP[b + 1] < 3) { r = 1; }
    if (BSPEC[b + 1] == 10) { r = 1; }
    if (BWET[b + 1] > 0 && BFALL[b + 1] == 0) { r = 1; }
    if (b == I_wetSponge || b == 33 || b == I_snowLayer || BLQ[b + 1] == 35 || BLEAF[b + 1] == 1) { r = 1; }
    RTK.push(r);
    b = b + 1;
  }
}
function randomTicks(dt) {
  if (RTK.length == 0) { rtInit(); }
  rtAcc = rtAcc + dt * 64 * 64 * WY / 68.3 * grTick / 3;
  let n = Math.floor(rtAcc);
  rtAcc = rtAcc - n;
  if (n > 800) { n = 800; }
  let k = 0, x0 = Math.floor(px) - 32, z0 = Math.floor(pz) - 32, x = 0, z = 0, y = 0;
  while (k < n) {
    x = x0 + rand(0, 63); z = z0 + rand(0, 63); y = rand(0, WY - 1);
    if (cOK(x, z) == 1) { let i = wi(x, y, z), b = W[i]; if (RTK[b + 1] == 1) { randomTick(x, y, z, i, b); } }
    k = k + 1;
  }
  weatherCols(dt);
  campfireStep(dt);
  leafStep(dt);
  fireStep(dt);
}
// the light a cell has now (the sky dimmed by night) and its raw light (the sky full)
function lightNow(i) { return Math.max(idiv(LT[i], 16) - dark, mod(LT[i], 16)); }
function lightRaw(i) { return Math.max(idiv(LT[i], 16), mod(LT[i], 16)); }
function randomTick(x, y, z, i, b) {
  let up = 0; if (y + 1 < WY) { up = W[i + 1]; }
  // saplings: in the light of 9, two steps of 1 in 7 (crimson / warped fungi grow only by bone meal)
  if (BTREE[b + 1] >= 0) { if (y + 1 < WY) { if (lightNow(i + 1) >= 9) { if (rand(1, 14) == 1) { treeFrom(x, y, z, b); } } } }
  // grass: dies under an opaque block or water, spreads to dirt round it (x, z +-1, y -3 .. +1)
  if (b == 2 || b == 20) {
    if ((BLOP[up + 1] == 1 && up != I_snowLayer) || BLQ[up + 1] == 7) { setBlock(x, y, z, 3); }
    else {
      if (lightNow(i + 1) >= 9) {
        let t = 0;
        while (t < 4) {
          let tx = x + rand(-1, 1), ty = y + rand(-3, 1), tz = z + rand(-1, 1);
          if (ty >= 0 && ty < WY - 1) { if (blockAt(tx, ty, tz) == 3) {
            let ta = blockAt(tx, ty + 1, tz);
            if (BLOP[ta + 1] == 0 && BLQ[ta + 1] != 7) { if (ta == I_snowLayer) { setBlock(tx, ty, tz, 20); } else { setBlock(tx, ty, tz, 2); } }
          } }
          t = t + 1;
        }
      }
    }
  }
  // crops: the genre's chance, 1 / (25 / f + 1), f from the farmland under it and round it (wet 3,
  // dry 1; a quarter for the ones round) - two of the genre's 8 stages to each of these 4
  if (BCROP[b + 1] >= 0 && BCROP[b + 1] < 3) {
    if (lightRaw(i) >= 9) {
      let f = 1, a = 0 - 1;
      while (a <= 1) {
        let c = 0 - 1;
        while (c <= 1) {
          let fb = blockAt(x + a, y - 1, z + c), g = 0;
          if (fb == I_farmland) { g = 1; } if (fb == I_farmlandWet) { g = 3; }
          if (a != 0 || c != 0) { g = g / 4; }
          f = f + g;
          c = c + 1;
        }
        a = a + 1;
      }
      if (rand(0, Math.floor(25 / f) * 2 + 1) == 0) { setBlock(x, y, z, b + 1); }
    }
  }
  // farmland: wet by water within 4 (its height and one up) or rain; drying takes a while; dry with
  // nothing growing on it turns to dirt
  if (b == I_farmland || b == I_farmlandWet) {
    let wet = waterWithin(x, y, z);
    if (wet == 0) { wet = waterWithin(x, y + 1, z); }
    if (wet == 0) { wet = rainOn(x, y + 1, z); }
    if (wet == 1) { if (b == I_farmland) { setBlock(x, y, z, I_farmlandWet); } }
    else {
      if (b == I_farmlandWet) { if (rand(1, 7) == 1) { setBlock(x, y, z, I_farmland); } }
      else { if (BCROP[up + 1] < 0) { setBlock(x, y, z, 3); } }
    }
  }
  // cane and cactus: a cell more each 16 ticks up to 3 high; bamboo 1 in 3 in the light up to 16
  if (b == I_reed || b == 19) {
    if (b == I_reed) { if (W[i - 1] != b) { if (reedWater(x, y - 1, z) == 0) { popBlock(x, y, z); b = 0; } } }
    if (b != 0) { if (up == 0 && y + 1 < WY) { if (W[i - 1] != b || W[i - 2] != b) { if (rand(1, 16) == 1) {
      setBlock(x, y + 1, z, b);
      if (b == 19) { if (cactusOk(x, y + 1, z) == 0) { popBlock(x, y + 1, z); } }
    } } } }
  }
  if (b == I_bamboo) {
    if (up == 0 && y + 1 < WY) { if (lightNow(i + 1) >= 9) { if (rand(1, 3) == 1) {
      let h = 1; while (h < 17 && y - h >= 0 && W[i - h] == b) { h = h + 1; }
      if (h < 16) { setBlock(x, y + 1, z, b); }
    } } }
  }
  // kelp: the top grows into water over it, 14 % a tick, up to 25
  if (b == I_kelp) {
    if (y + 1 < WY) { if (BLQ[up + 1] == 7 && BLV[up + 1] == 0) { if (rand(1, 7) == 1) {
      let h = 1; while (h < 26 && y - h >= 0 && W[i - h] == b) { h = h + 1; }
      if (h < 25) { setBlock(x, y + 1, z, b); }
    } } }
  }
  // fire: kept going by its own clock (fireAdd); one that was not on it is put on it
  if (BSPEC[b + 1] == 10) { fireAdd(x, y, z, 0); }
  // coral out of water dies
  if (BWET[b + 1] > 0 && BFALL[b + 1] == 0) { if (waterNear(x, y, z) == 0) { if (BLQ[blockAt(x, y - 1, z) + 1] != 7) { setBlock(x, y, z, BWET[b + 1]); } } }
  if (b == I_wetSponge) { if (dim == 1) { setBlock(x, y, z, I_sponge); } }
  // ice and snow melt by a block's light over 11 (the sun does not melt them)
  if (b == 33) { if (mod(LT[i], 16) > 10) { if (dim == 1) { setBlock(x, y, z, 0); } else { setBlock(x, y, z, 7); } } }
  if (b == I_snowLayer) { if (mod(LT[i], 16) > 11) { setBlock(x, y, z, 0); } }
  // a leaf now and then looks for its log (one put by a command, one cut off long ago)
  if (BLEAF[b + 1] == 1) { if (rand(1, 4) == 1) { leafLook(x, y, z, 0); } }
  // lava sets fire to what burns near it
  if (BLQ[b + 1] == 35) { lavaFire(x, y, z); }
}
// a block taken off as if broken by the world (drops by the rules)
function popBlock(x, y, z) {
  let b = blockAt(x, y, z);
  if (b > 0) { if (worldDrops() == 1) { blockDrops(b, x, y, z); } setBlock(x, y, z, 0); }
}
// sugar cane needs water by the block it stands on
function reedWater(x, y, z) {
  let r = 0;
  if (BLQ[blockAt(x + 1, y, z) + 1] == 7 || BLQ[blockAt(x - 1, y, z) + 1] == 7 || BLQ[blockAt(x, y, z + 1) + 1] == 7 || BLQ[blockAt(x, y, z - 1) + 1] == 7) { r = 1; }
  if (blockAt(x + 1, y, z) == 33 || blockAt(x - 1, y, z) == 33 || blockAt(x, y, z + 1) == 33 || blockAt(x, y, z - 1) == 33) { r = 1; }
  return r;
}
// a cactus stands only with nothing solid (or lava) beside it
function cactusOk(x, y, z) {
  let r = 1;
  M_jco(x + 1, y, z); M_jco(x - 1, y, z); M_jco(x, y, z + 1); M_jco(x, y, z - 1);
  if (coBad == 1) { r = 0; } coBad = 0;
  return r;
}
let coBad = 0;
function M_jco(X, Y, Z) { let cb = blockAt(X, Y, Z); if (BSOL[cb + 1] > 0 || BLQ[cb + 1] == 35) { coBad = 1; } }
// room for a tree over a sapling (a roof stops it)
function treeRoom(x, y, z) {
  let r = 1, yy = y + 1;
  while (yy <= y + 4) {
    if (yy >= WY) { r = 0; } else { let b = blockAt(x, yy, z); if (b != 0 && BLEAF[b + 1] == 0 && BSHP[b + 1] != 1 && BLQ[b + 1] == 0) { r = 0; } }
    yy = yy + 1;
  }
  return r;
}
// snow settles and water freezes in cold places while it rains (a column in each chunk now and
// then, as the genre), where the sky is open and a block's light is under 10
function weatherCols(dt) {
  if (wthr > 0 && dim == 0) {
    wcAcc = wcAcc + dt * 20;
    let n = Math.floor(wcAcc); wcAcc = wcAcc - n;
    let k = 0;
    while (k < n && k < 8) {
      let x = Math.floor(px) + rand(-32, 31), z = Math.floor(pz) + rand(-32, 31);
      if (cOK(x, z) == 1) {
        findTop(x, z); let y = topY;
        let bi = BIOM[wcol(x, z)];
        if (y >= 0 && y < WY - 1) { if (bi == 6 || bi == 19 || bi == 8 || y > SEA + 45) { if (rainOn(x, y + 1, z) == 1) {
          let i = wi(x, y, z), b = W[i];
          if (mod(LT[i + 1], 16) < 10) {
            if (b == 7) { setBlock(x, y, z, 33); }
            else { if (W[i + 1] == 0 && BSOL[b + 1] == 1 && BSHP[b + 1] == 0 && BLOP[b + 1] == 1) { setBlock(x, y + 1, z, I_snowLayer); } }
          }
        } } }
      }
      k = k + 1;
    }
  }
}

// ---------------------------------------------------------------- leaves
// as the genre: leaves more than 6 steps (through leaves) from a log fall away, each at its own
// random time (1 .. 60 s), dropping what leaves drop. When a log goes, the leaves within 7 steps of
// it are looked at (LR*: the places, LD*: one leaf each, LDM 0 look, 1 fall when due); a random
// tick on a leaf looks too. Leaves a player put stay (LPX..: their places, this session).
let LRX = [], LRY = [], LRZ = [];
let LDX = [], LDY = [], LDZ = [], LDT = [], LDM = [], ldTime = 0, ldP = 1;
let LPX = [], LPY = [], LPZ = [];
let LBX = [], LBY = [], LBZ = [], LBD = [];
let LHK = [], LHG = [], lhGen = 0, LHN = 2048, lhWork = 0;
function leafNear(x, y, z) {
  if (netApplying == 0 && LRX.length < 256) { LRX.push(x); LRY.push(y); LRZ.push(z); }
}
function leafLook(x, y, z, t) {
  if (LDX.length < 4000) { LDX.push(x); LDY.push(y); LDZ.push(z); LDT.push(ldTime + t); LDM.push(0); }
}
function leafPlaced(x, y, z) {
  if (LPX.length >= 4096) { LPX.removeAt(1); LPY.removeAt(1); LPZ.removeAt(1); }
  LPX.push(x); LPY.push(y + dim * 1000); LPZ.push(z);
}
function leafKeptByPlayer(x, y, z) {
  let r = 0, k = 1, yd = y + dim * 1000;
  while (k <= LPX.length) { if (LPX[k] == x) { if (LPZ[k] == z) { if (LPY[k] == yd) { r = 1; k = LPX.length; } } } k = k + 1; }
  return r;
}
// seen in this search (an open hash of the cells, a new generation each search)
function lhSeen(x, y, z) {
  if (LHK.length == 0) { let j = 0; while (j < LHN) { LHK.push(0); LHG.push(0); j = j + 1; } }
  let key = ((x + 60000) * 120000 + z + 60000) * 256 + y, i = mod(key, LHN) + 1, r = 0, n = 0;
  while (n < LHN) {
    if (LHG[i] != lhGen) { LHG[i] = lhGen; LHK[i] = key; n = LHN; }
    else { if (LHK[i] == key) { r = 1; n = LHN; } else { i = i + 1; if (i > LHN) { i = 1; } n = n + 1; } }
  }
  return r;
}
// the leaves within 7 steps of a log that went: each looked at soon
function leafRegion(x, y, z) {
  lhGen = lhGen + 1;
  LBX = []; LBY = []; LBZ = []; LBD = [];
  LBX.push(x); LBY.push(y); LBZ.push(z); LBD.push(0); let s0 = lhSeen(x, y, z);
  let h = 1;
  while (h <= LBX.length && h <= 500) {
    let cx = LBX[h], cy = LBY[h], cz = LBZ[h], d = LBD[h], k = 1;
    while (k <= 6) {
      let nx = cx + DX6[k], ny = cy + DY6[k], nz = cz + DZ6[k];
      if (ny >= 0 && ny < WY) { if (cOK(nx, nz) == 1) {
        let b = W[wi(nx, ny, nz)];
        lhWork = lhWork + 1;
        if (BLEAF[b + 1] == 1) { if (lhSeen(nx, ny, nz) == 0) { leafLook(nx, ny, nz, rand(0, 10) / 20); if (d < 6) { LBX.push(nx); LBY.push(ny); LBZ.push(nz); LBD.push(d + 1); } } }
      } }
      k = k + 1;
    }
    h = h + 1;
  }
  LBX = []; LBY = []; LBZ = []; LBD = [];
}
// a log within 6 steps of the leaf at (x, y, z)? (a part of the world not made yet counts as one)
function leafHeld(x, y, z) {
  lhGen = lhGen + 1;
  LBX = []; LBY = []; LBZ = []; LBD = [];
  LBX.push(x); LBY.push(y); LBZ.push(z); LBD.push(0); let s0 = lhSeen(x, y, z);
  let h = 1, found = 0;
  while (h <= LBX.length && found == 0 && h <= 600) {
    let cx = LBX[h], cy = LBY[h], cz = LBZ[h], d = LBD[h], k = 1;
    while (k <= 6 && found == 0) {
      let nx = cx + DX6[k], ny = cy + DY6[k], nz = cz + DZ6[k];
      if (ny >= 0 && ny < WY) {
        if (cOK(nx, nz) == 0) { found = 1; }
        else {
          let b = W[wi(nx, ny, nz)];
          lhWork = lhWork + 1;
          if (mod(BJE[b + 1], 2) == 1) { found = 1; }
          else { if (BLEAF[b + 1] == 1 && d < 5) { if (lhSeen(nx, ny, nz) == 0) { LBX.push(nx); LBY.push(ny); LBZ.push(nz); LBD.push(d + 1); } } }
        }
      }
      k = k + 1;
    }
    h = h + 1;
  }
  if (h > 600) { found = 1; }
  LBX = []; LBY = []; LBZ = []; LBD = [];
  return found;
}
function leafStep(dt) {
  ldTime = ldTime + dt;
  lhWork = 0;
  if (LRX.length > 0) {
    let x = LRX[1], y = LRY[1], z = LRZ[1];
    LRX.removeAt(1); LRY.removeAt(1); LRZ.removeAt(1);
    leafRegion(x, y, z);
  }
  let n = 0;
  while (n < 60 && lhWork < 2500 && LDX.length > 0) {
    if (ldP > LDX.length) { ldP = 1; }
    let i = ldP, drop = 0;
    if (LDT[i] <= ldTime) {
      let x = LDX[i], y = LDY[i], z = LDZ[i], b = 0 - 1;
      if (cOK(x, z) == 1) { b = blockAt(x, y, z); }
      if (BLEAF[b + 1] == 1 && b >= 0 && grLeaf == 1) {
        if (leafHeld(x, y, z) == 1 || leafKeptByPlayer(x, y, z) == 1) { drop = 1; }
        else {
          if (LDM[i] == 0) { LDM[i] = 1; LDT[i] = ldTime + rand(10, 600) / 10; ldP = ldP + 1; }
          else {
            if (worldDrops() == 1 || mod(gameMode, 2) == 1) { dropBare = 1; blockDrops(b, x, y, z); dropBare = 0; }
            setBlock(x, y, z, 0); drop = 1;
          }
        }
      } else { drop = 1; }
      if (drop == 1) {
        let last = LDX.length;
        LDX[i] = LDX[last]; LDY[i] = LDY[last]; LDZ[i] = LDZ[last]; LDT[i] = LDT[last]; LDM[i] = LDM[last];
        LDX.removeAt(last); LDY.removeAt(last); LDZ.removeAt(last); LDT.removeAt(last); LDM.removeAt(last);
      }
    } else { ldP = ldP + 1; }
    n = n + 1;
  }
}
let grLeaf = 1, dropBare = 0;

// ---------------------------------------------------------------- fire
// as the genre's: each fire has its clock (1.5 .. 2 s) and age (0 .. 15). It goes out in the rain,
// on a block that does not burn when old, burns its neighbours away by their flammability (or
// spreads onto them), and lights the air round it (3 x 3 x 6) by the catch of the blocks there.
// On netherrack, magma and soul blocks it never dies. doFireTick off: nothing of this.
let FRX = [], FRY = [], FRZ = [], FRA = [], FRT = [], frTime = 0;
function fireAdd(x, y, z, age) {
  if (netApplying == 0) {
    let k = 1, f = 0, yd = y + dim * 1000;
    while (k <= FRX.length) { if (FRX[k] == x) { if (FRZ[k] == z) { if (FRY[k] == yd) { f = k; k = FRX.length; } } } k = k + 1; }
    if (f > 0) { if (age > FRA[f]) { FRA[f] = age; } }
    if (f == 0 && FRX.length < 512) { FRX.push(x); FRY.push(yd); FRZ.push(z); FRA.push(age); FRT.push(frTime + 1.5 + rand(0, 10) / 20); }
  }
}
function flamOf(b) { return mod(BFLAM[b + 1], 1000); }
function catchOf(b) { return idiv(BFLAM[b + 1], 1000); }
function fireEternal(below) { let r = 0; if (below == 48 || below == I_magma || below == I_wailSand || below == I_wailSoil) { r = 1; } if (dim == 2 && below == 6) { r = 1; } return r; }
function fireStep(dt) {
  frTime = frTime + dt;
  let k = 1;
  while (k <= FRX.length) {
    let gone = 0;
    if (FRY[k] < dim * 1000 || FRY[k] >= dim * 1000 + 1000) { gone = 1; }
    else { if (FRT[k] <= frTime) {
      FRT[k] = frTime + 1.5 + rand(0, 10) / 20;
      gone = fireTick(FRX[k], FRY[k] - dim * 1000, FRZ[k], k);
    } }
    if (gone == 1) { FRX.removeAt(k); FRY.removeAt(k); FRZ.removeAt(k); FRA.removeAt(k); FRT.removeAt(k); } else { k = k + 1; }
  }
}
// one fire's turn: 1 when it is no longer kept
function fireTick(x, y, z, k) {
  let gone = 0;
  if (cOK(x, z) == 0) { gone = 1; }
  else {
    let b = blockAt(x, y, z);
    if (BSPEC[b + 1] != 10 || grFireTick == 0) { gone = 1; }
    else {
      let below = blockAt(x, y - 1, z), inf = fireEternal(below), age = FRA[k];
      // the rain puts it out
      if (inf == 0 && rainOn(x, y, z) == 1 && rand(0, 99) < 20 + age * 3) { setBlock(x, y, z, 0); gone = 1; }
      if (gone == 0) {
        if (rand(0, 2) == 2) { age = Math.min(15, age + 1); FRA[k] = age; }
        if (inf == 0) {
          if (fireFuel(x, y, z) == 0) {
            if (BSOL[below + 1] == 0 || age > 3) { setBlock(x, y, z, 0); gone = 1; }
          } else { if (age == 15 && rand(1, 4) == 1 && flamOf(below) == 0) { setBlock(x, y, z, 0); gone = 1; } }
        }
      }
      if (gone == 0) {
        // burning the blocks by it
        fireCatch(x + 1, y, z, 300, age); fireCatch(x - 1, y, z, 300, age); fireCatch(x, y - 1, z, 250, age);
        fireCatch(x, y + 1, z, 250, age); fireCatch(x, y, z - 1, 300, age); fireCatch(x, y, z + 1, 300, age);
        // spreading through the air round it
        let a = x - 1;
        while (a <= x + 1) {
          let c = z - 1;
          while (c <= z + 1) {
            let yy = y - 1;
            while (yy <= y + 4) {
              if (a != x || c != z || yy != y) { if (yy >= 0 && yy < WY) { if (blockAt(a, yy, c) == 0) {
                let ch = 100; if (yy > y + 1) { ch = ch + (yy - y - 1) * 100; }
                let en = fireCatchAround(a, yy, c);
                if (en > 0) {
                  let l = (en + 40 + difficulty * 7) / (age + 30);
                  if (l > 0 && rand(0, ch - 1) <= l) { if (rainOn(a, yy, c) == 0) { fireSet(a, yy, c, Math.min(15, age + idiv(rand(0, 4), 4))); } }
                }
              } } }
              yy = yy + 1;
            }
            c = c + 1;
          }
          a = a + 1;
        }
      }
    }
  }
  return gone;
}
function fireSet(x, y, z, age) {
  let f = I_fire; if (blockAt(x, y - 1, z) == I_wailSand || blockAt(x, y - 1, z) == I_wailSoil) { f = I_wailFire; }
  setBlock(x, y, z, f); fireAdd(x, y, z, age);
}
// is there something that burns by this cell (fire may stay)
function fireFuel(x, y, z) {
  let r = 0;
  if (flamOf(blockAt(x + 1, y, z)) > 0 || flamOf(blockAt(x - 1, y, z)) > 0 || flamOf(blockAt(x, y + 1, z)) > 0 || flamOf(blockAt(x, y - 1, z)) > 0 || flamOf(blockAt(x, y, z + 1)) > 0 || flamOf(blockAt(x, y, z - 1)) > 0) { r = 1; }
  return r;
}
// the most catch among the six round an air cell
function fireCatchAround(x, y, z) {
  return Math.max(Math.max(catchOf(blockAt(x + 1, y, z)), catchOf(blockAt(x - 1, y, z))), Math.max(Math.max(catchOf(blockAt(x, y + 1, z)), catchOf(blockAt(x, y - 1, z))), Math.max(catchOf(blockAt(x, y, z + 1)), catchOf(blockAt(x, y, z - 1)))));
}
// a block by the fire burns away (or catches) by its flammability; TNT is lit
function fireCatch(x, y, z, ch, age) {
  if (y >= 0 && y < WY) {
    let b = blockAt(x, y, z), f = flamOf(b);
    if (f > 0) { if (rand(0, ch - 1) < f) {
      if (b == I_tnt) { tntLight(x, y, z, 1, 4); }
      else {
        if (rand(0, age + 9) < 5 && rainOn(x, y, z) == 0) { fireSet(x, y, z, Math.min(15, age + idiv(rand(0, 4), 4))); }
        else { setBlock(x, y, z, 0); }
      }
    } }
  }
}
// lava's random tick: fire on what burns near it (a few cells up and round it)
function lavaFire(x, y, z) {
  if (grFireTick == 1) {
    let i = rand(0, 2);
    if (i > 0) {
      let a = x, yy = y, c = z, s = 0;
      while (s < i) {
        a = a + rand(-1, 1); yy = yy + 1; c = c + rand(-1, 1);
        if (yy >= WY) { s = i; }
        else {
          let b = blockAt(a, yy, c);
          if (b == 0) { if (fireCatchAround(a, yy, c) > 0 || fireFuel(a, yy, c) == 1) { fireSet(a, yy, c, 0); s = i; } }
          else { if (BSOL[b + 1] > 0) { s = i; } }
        }
        s = s + 1;
      }
    } else {
      let t = 0;
      while (t < 3) {
        let a = x + rand(-1, 1), c = z + rand(-1, 1);
        if (y + 1 < WY) { if (blockAt(a, y + 1, c) == 0 && flamOf(blockAt(a, y, c)) > 0) { fireSet(a, y + 1, c, 0); } }
        t = t + 1;
      }
    }
  }
}

// ---------------------------------------------------------------- sponges
// a dry sponge put in or by water takes up to 65 water cells within 6 steps and is wet
function spongeSoak(x, y, z) {
  if (dim != 1) {
    lhGen = lhGen + 1;
    LBX = []; LBY = []; LBZ = []; LBD = [];
    LBX.push(x); LBY.push(y); LBZ.push(z); LBD.push(0); let s0 = lhSeen(x, y, z);
    let h = 1, took = 0;
    while (h <= LBX.length && took < 65) {
      let cx = LBX[h], cy = LBY[h], cz = LBZ[h], d = LBD[h], k = 1;
      while (k <= 6 && took < 65) {
        let nx = cx + DX6[k], ny = cy + DY6[k], nz = cz + DZ6[k];
        if (ny >= 0 && ny < WY) { if (lhSeen(nx, ny, nz) == 0) {
          let b = blockAt(nx, ny, nz);
          if (BLQ[b + 1] == 7 || BWATER[b + 1] == 1) {
            took = took + 1;
            if (BWATER[b + 1] == 1) { popBlock(nx, ny, nz); }
            lqLog = 1; setBlock(nx, ny, nz, 0);
            if (d < 5) { LBX.push(nx); LBY.push(ny); LBZ.push(nz); LBD.push(d + 1); }
          }
        } }
        k = k + 1;
      }
      h = h + 1;
    }
    LBX = []; LBY = []; LBZ = []; LBD = [];
    if (took > 0) { setBlock(x, y, z, I_wetSponge); }
  }
}

// ---------------------------------------------------------------- what a change does round it
// (called from setBlock: the cell's old and new blocks)
function jeChanged(x, y, z, old, b) {
  if (netApplying == 0) {
    // a log or leaf gone: the leaves by it look again
    if (mod(BJE[old + 1], 2) == 1 && mod(BJE[b + 1], 2) == 0) { leafNear(x, y, z); }
    if (BSPEC[b + 1] == 10) { fireAdd(x, y, z, 0); }
    // a hopper put works at once (it ran only once opened or given an item)
    if (BKIND[b + 1] == I_hopper && BKIND[old + 1] != I_hopper) { chestAt(x, y, z); }
    if (b == I_sponge) { spongeSoak(x, y, z); }
    if (BLQ[b + 1] == 7) { M_jsp(x + 1, y, z); M_jsp(x - 1, y, z); M_jsp(x, y + 1, z); M_jsp(x, y - 1, z); M_jsp(x, y, z + 1); M_jsp(x, y, z - 1); }
    // water gone: cane that stood by it falls
    if (BLQ[old + 1] == 7 && BLQ[b + 1] != 7) { M_jrw(x + 1, y + 1, z); M_jrw(x - 1, y + 1, z); M_jrw(x, y + 1, z + 1); M_jrw(x, y + 1, z - 1); }
    // a wall torch or a ladder that leaned on it comes off
    if (BSOL[b + 1] != 1) { M_jwt(x + 1, y, z, 0); M_jwt(x - 1, y, z, 1); M_jwt(x, y, z + 1, 4); M_jwt(x, y, z - 1, 5); }
    // something solid by a cactus breaks it
    if (BSOL[b + 1] > 0 || BLQ[b + 1] == 35) { M_jcb(x + 1, y, z); M_jcb(x - 1, y, z); M_jcb(x, y, z + 1); M_jcb(x, y, z - 1); }
  }
}
function M_jwt(X, Y, Z, A) {
  let tb = blockAt(X, Y, Z);
  if (BSHP[tb + 1] == 2 && BATT[tb + 1] == A && BRS[tb + 1] == 0) { popBlock(X, Y, Z); }
  if (BPLC[tb + 1] == P_LADDER) { if (X + dirX(BVAR[tb + 1]) == X + DX6[A + 1] && Z + dirZ(BVAR[tb + 1]) == Z + DZ6[A + 1]) { popBlock(X, Y, Z); } }
}
function M_jsp(X, Y, Z) { if (blockAt(X, Y, Z) == I_sponge) { spongeSoak(X, Y, Z); } }
function M_jrw(X, Y, Z) { if (blockAt(X, Y, Z) == I_reed) { if (blockAt(X, Y - 1, Z) != I_reed) { if (reedWater(X, Y - 1, Z) == 0) { popBlock(X, Y, Z); } } } }
function M_jcb(X, Y, Z) { if (blockAt(X, Y, Z) == 19) { popBlock(X, Y, Z); } }
