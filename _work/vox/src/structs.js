// ===================================================================== structures (v2.0)
// The genre's kinds of places, in this work's own designs: villages, the sandstone pyramid, the
// jungle temple, the swamp hut, igloos, watchtowers, the ebony mansion, the sea temple, wrecks,
// sea ruins, buried chests, ruined gates, mines, wells, fossils, dungeons; in the depths the
// black-rock bastions. Each kind has its places on a grid of regions (one at most in a region,
// where the noise and the biome let it); a chunk being made builds the part of every structure
// near it that falls inside it (sput writes only inside the chunk), so a structure comes out the
// same whichever chunk is made first.
//
// kinds: 1 village 2 desert_pyramid 3 jungle_temple 4 swamp_hut 5 igloo 6 pillager_outpost
// 7 mansion 8 monument 9 shipwreck 10 ocean_ruin 11 buried_treasure 12 ruined_portal 13 stronghold
// 14 mineshaft 15 fortress 16 bastion_remnant 17 void_city
let STKEY = ['village', 'desert_pyramid', 'jungle_temple', 'swamp_hut', 'igloo', 'pillager_outpost', 'mansion', 'monument', 'shipwreck', 'ocean_ruin', 'buried_treasure', 'ruined_portal', 'stronghold', 'mineshaft', 'fortress', 'bastion_remnant', 'void_city'];
let STNAME = ['마을', '사막 피라미드', '밀림 사원', '늪 오두막', '이글루', '약탈자 감시탑', '흑단 저택', '바다 신전', '난파선', '바다 유적', '묻힌 보물', '무너진 관문', '옛 유적', '폐광', '잿빛 요새', '흑암 보루', '보랏빛 도시'];
// region size (blocks), how far the structure reaches from its middle, the world it is in
let STREG = [320, 384, 384, 320, 288, 352, 1280, 640, 256, 192, 160, 0, 0, 256, 0, 384, 0];
let STRAD = [44, 12, 9, 6, 5, 8, 26, 30, 12, 7, 2, 0, 0, 56, 0, 22, 0];
let STDIM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2];
function structByName(nm) {
  let r = 0, k = 1;
  while (k <= STKEY.length) { if (STKEY[k] == nm || STNAME[k] == nm) { r = k; } k = k + 1; }
  if (nm == 'temple' || nm == 'desert_temple') { r = 2; } if (nm == 'witch_hut') { r = 4; } if (nm == 'woodland_mansion') { r = 7; } if (nm == 'ocean_monument') { r = 8; }
  if (nm == 'buried_chest' || nm == 'treasure') { r = 11; } if (nm == 'nether_fortress') { r = 15; } if (nm == 'bastion') { r = 16; } if (nm == 'end_city' || nm == 'city') { r = 17; }
  return r;
}

// ---------------------------------------------------------------- where they are
// the structure of kind t in region (rx, rz): stOk, its middle stX stZ, ground stY, a variant stV
let stOk = 0, stX = 0, stZ = 0, stY = 0, stV = 0;
function stSeed(t, x, z) { rs = mod(seed * 7 + x * 341873128 + z * 132897987 + t * 1000003 + dim * 77, 2147483646) + 1; let w = rnd() + rnd(); }
function structIn(t, rx, rz) {
  stOk = 0;
  let reg = STREG[t];
  if (reg > 0) {
    stSeed(t, rx, rz);
    let chance = 0.7;
    if (t == 7) { chance = 0.9; } if (t == 11) { chance = 0.5; }
    if (rnd() < chance) {
      let m = STRAD[t] + 8;
      stX = rx * reg + m + Math.floor(rnd() * (reg - m * 2)); stZ = rz * reg + m + Math.floor(rnd() * (reg - m * 2));
      stV = rndI(0, 7);
      // not on top of the start (the first minutes are for the player)
      if (Math.abs(stX) + Math.abs(stZ) > 96 || t == 14 || t == 11) {
        if (dim == 0) {
          let gk = gridOn;
          gridOn = 0; columnShape(stX, stZ); gridOn = gk;
          stY = colH;
          let b = colB, ok = 0;
          if (t == 1) { if (b == 2 || b == 4 || b == 12 || b == 5 || b == 6) { ok = 1; } }
          if (t == 2) { if (b == 4) { ok = 1; } }
          if (t == 3) { if (b == 11) { ok = 1; } }
          if (t == 4) { if (b == 13) { ok = 1; } }
          if (t == 5) { if (b == 6 || b == 19) { ok = 1; } }
          if (t == 6) { if (b == 2 || b == 12 || b == 4 || b == 5 || b == 6) { ok = 1; } }
          if (t == 7) { if (b == 15) { ok = 1; } }
          if (t == 8) { if (b == 21) { ok = 1; } }
          if (t == 9) { if (b == 0 || b == 21 || b == 20 || b == 8 || b == 1) { ok = 1; } }
          if (t == 10) { if (b == 0 || b == 20 || b == 8) { ok = 1; } }
          if (t == 11) { if (b == 1) { ok = 1; } }
          if (t == 14) { ok = 1; stY = 18 + mod(stV * 7, 16); }
          // the ground must be flat enough for the buildings that stand on it
          if (ok == 1) { if (t <= 7) { if (stY < SEA) { ok = 0; } if (stY > SEA + 40) { ok = 0; } } }
          stOk = ok;
        }
        if (dim == 1) { if (t == 16) { stOk = 1; stY = 20; } }
      }
    }
  }
}
// the nearest of kind t from (x, z): locOk, locX, locZ
let locOk = 0, locX = 0, locZ = 0;
function locateStruct(t, x, z) {
  locOk = 0;
  let best = 999999999;
  if (STDIM[t] != dim) { locOk = 0; }
  else {
    if (t == 13) { let k = 0; while (k < 3) { ruinAt(k); let d = (ruX - x) * (ruX - x) + (ruZ - z) * (ruZ - z); if (d < best) { best = d; locOk = 1; locX = ruX; locZ = ruZ; } k = k + 1; } }
    if (t == 12) {
      let a = idiv(x, 16) - 12;
      while (a <= idiv(x, 16) + 12) { let c = idiv(z, 16) - 12; while (c <= idiv(z, 16) + 12) { chunkSeed(a, c, 4); if (rndI(1, 9) == 1) { let fx2 = a * 16 + rndI(4, 9), fz2 = c * 16 + rndI(5, 10); let d = (fx2 - x) * (fx2 - x) + (fz2 - z) * (fz2 - z); if (d < best) { best = d; locOk = 1; locX = fx2; locZ = fz2; } } c = c + 1; } a = a + 1; }
    }
    if (t == 15) {
      let a = idiv(z, 80) - 4;
      while (a <= idiv(z, 80) + 4) { let fz2 = a * 80 + 40; if (fortX(fz2) == 1) { let d = (fz2 - z) * (fz2 - z); if (d < best) { best = d; locOk = 1; locX = x; locZ = fz2; } } a = a + 1; }
      a = idiv(x, 80) - 4;
      while (a <= idiv(x, 80) + 4) { let fx3 = a * 80 + 40; if (fortZ(fx3) == 1) { let d = (fx3 - x) * (fx3 - x); if (d < best) { best = d; locOk = 1; locX = fx3; locZ = z; } } a = a + 1; }
    }
    if (t == 17) {
      let a = idiv(x, 16) - 40;
      while (a <= idiv(x, 16) + 40) { let c = idiv(z, 16) - 40; while (c <= idiv(z, 16) + 40) { if (cityIn(a, c) == 1) { let d = (ciX - x) * (ciX - x) + (ciZ - z) * (ciZ - z); if (d < best) { best = d; locOk = 1; locX = ciX; locZ = ciZ; } } c = c + 4; } a = a + 4; }
    }
    if (STREG[t] > 0) {
      let reg = STREG[t], rx = idiv(x, reg), rz = idiv(z, reg), r = 0;
      while (r <= 8 && locOk == 0) {
        let a = rx - r;
        while (a <= rx + r) {
          let c = rz - r;
          while (c <= rz + r) {
            if (Math.abs(a - rx) == r || Math.abs(c - rz) == r) {
              structIn(t, a, c);
              if (stOk == 1) { let d = (stX - x) * (stX - x) + (stZ - z) * (stZ - z); if (d < best) { best = d; locOk = 1; locX = stX; locZ = stZ; } }
            }
            c = c + 1;
          }
          a = a + 1;
        }
        r = r + 1;
      }
    }
  }
}

// ---------------------------------------------------------------- building inside one chunk
// sput: a block, only inside the chunk being made (gx0 .. gx1, gz0 .. gz1)
function sput(x, y, z, b) {
  if (x >= gx0) { if (x <= gx1) { if (z >= gz0) { if (z <= gz1) { if (y >= 1) { if (y < WY) { W[(mod(x, WS) * WS + mod(z, WS)) * WY + y + 1] = b; } } } } } }
}
// does the box (x0, z0) .. (x1, z1) reach into the chunk?
function inChunk(x0, z0, x1, z1) {
  let r = 0;
  if (x1 >= gx0 && x0 <= gx1 && z1 >= gz0 && z0 <= gz1) { r = 1; }
  return r;
}
function sbox(x0, y0, z0, x1, y1, z1, b) {
  let a = Math.max(x0, gx0), ae = Math.min(x1, gx1);
  while (a <= ae) {
    let c = Math.max(z0, gz0), ce = Math.min(z1, gz1);
    while (c <= ce) {
      let y = Math.max(1, y0), i = (mod(a, WS) * WS + mod(c, WS)) * WY + y + 1;
      while (y <= y1 && y < WY) { W[i] = b; y = y + 1; i = i + 1; }
      c = c + 1;
    }
    a = a + 1;
  }
}
// walls of b round the box (x0 .. x1, z0 .. z1) from y0 to y1, air inside
function swalls(x0, y0, z0, x1, y1, z1, b) {
  sbox(x0, y0, z0, x1, y1, z1, b);
  sbox(x0 + 1, y0, z0 + 1, x1 - 1, y1, z1 - 1, 0);
}
// the ground made up under a floor: b from y - 1 down to the first solid block
function sfound(x0, z0, x1, z1, y, b) {
  let a = Math.max(x0, gx0), ae = Math.min(x1, gx1);
  while (a <= ae) {
    let c = Math.max(z0, gz0), ce = Math.min(z1, gz1);
    while (c <= ce) {
      let yy = y - 1, i = (mod(a, WS) * WS + mod(c, WS)) * WY + yy + 1, n = 0;
      while (yy > 1 && n < 16 && (W[i] == 0 || W[i] == 7 || BSHP[W[i] + 1] == 1 || BLEAF[W[i] + 1] == 1)) { W[i] = b; yy = yy - 1; i = i - 1; n = n + 1; }
      c = c + 1;
    }
    a = a + 1;
  }
}
// a chest with loot of table lt (written down so its first opening fills it)
let LTX = [], LTY = [], LTZ = [], LTT = [], LTD = [];
function schest(x, y, z, lt) {
  if (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1 && y >= 1 && y < WY) {
    W[wi(x, y, z)] = 37;
    let k = 1, f = 0;
    while (k <= LTX.length) { if (LTX[k] == x && LTY[k] == y && LTZ[k] == z && LTD[k] == dim) { f = 1; } k = k + 1; }
    if (f == 0) { LTX.push(x); LTY.push(y); LTZ.push(z); LTT.push(lt); LTD.push(dim); }
  }
}
function sspawner(x, y, z, b) {
  if (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1 && y >= 1 && y < WY) { W[wi(x, y, z)] = b; spawnerNote(x, y, z); }
}
function lootAt(x, y, z) {
  let k = 1, r = 0;
  while (k <= LTX.length) { if (LTX[k] == x && LTY[k] == y && LTZ[k] == z && LTD[k] == dim) { r = LTT[k]; LTT[k] = 0 - 1; } k = k + 1; }
  if (r < 0) { r = 0; }
  return r;
}
// the loot tables (build data LOOT0 / LOOTN / LOOTR0 / LOOTR1, items LOOTI / LOOTLO / LOOTHI / LOOTW)
function lootTable(c, lt) {
  let n = rand(LOOTR0[lt], LOOTR1[lt]), k = 0, tw = 0, i = LOOT0[lt], ie = i + LOOTN[lt];
  while (i < ie) { tw = tw + LOOTW[i]; i = i + 1; }
  while (k < n) {
    let r = rand(1, tw), j = LOOT0[lt], acc = 0, pick = LOOT0[lt];
    while (j < ie) { acc = acc + LOOTW[j]; if (acc >= r) { if (pick == LOOT0[lt]) { if (acc - LOOTW[j] < r) { pick = j; } } } j = j + 1; }
    let s = (c - 1) * 27 + rand(1, 27);
    CHI[s] = LOOTI[pick]; CHN[s] = rand(LOOTLO[pick], LOOTHI[pick]); CHD[s] = 0;
    k = k + 1;
  }
}
// mobs that live in a structure come once (the first time its middle chunk is made)
let SMX = [], SMZ = [];
function structMobsOnce(x, z) {
  let k = 1, f = 0;
  while (k <= SMX.length) { if (SMX[k] == x && SMZ[k] == z) { f = 1; } k = k + 1; }
  if (f == 0) { SMX.push(x); SMZ.push(z); }
  return 1 - f;
}

// ---------------------------------------------------------------- each chunk: every structure near it
function featuresStructs(cx, cz) {
  let x0 = cx * 16, z0 = cz * 16, t = 1;
  while (t <= 11) {
    if (STREG[t] > 0) {
      let reg = STREG[t], r = STRAD[t];
      let ra = idiv(x0 - r, reg), rb = idiv(x0 + 15 + r, reg), qa = idiv(z0 - r, reg), qb = idiv(z0 + 15 + r, reg);
      let a = ra;
      while (a <= rb) {
        let c = qa;
        while (c <= qb) {
          structIn(t, a, c);
          if (stOk == 1) { if (inChunk(stX - r, stZ - r, stX + r, stZ + r) == 1) { buildStruct(t); } }
          c = c + 1;
        }
        a = a + 1;
      }
    }
    t = t + 1;
  }
  // mines under everything
  let reg = STREG[14], r = STRAD[14], a = idiv(x0 - r, reg);
  while (a <= idiv(x0 + 15 + r, reg)) {
    let c = idiv(z0 - r, reg);
    while (c <= idiv(z0 + 15 + r, reg)) { structIn(14, a, c); if (stOk == 1) { mineshaft(); } c = c + 1; }
    a = a + 1;
  }
  // small things kept inside the chunk: dungeons, wells, fossils
  chunkSeed(cx, cz, 7);
  if (rnd() < 0.22) { dungeon(x0 + rndI(4, 11), rndI(10, 46), z0 + rndI(4, 11)); }
  if (rnd() < 0.01) { let wx = x0 + rndI(4, 11), wz = z0 + rndI(4, 11); findTop(wx, wz); if (W[wi(wx, topY, wz)] == 8) { if (BIOM[wcol(wx, wz)] == 4) { desertWell(wx, topY, wz); } } }
  if (rnd() < 0.015) { fossil(x0 + rndI(3, 10), rndI(14, 34), z0 + rndI(3, 10)); }
}
function buildStruct(t) {
  stSeed(t, stX, stZ);
  if (t == 1) { village(); }
  if (t == 2) { pyramid(); }
  if (t == 3) { jungleTemple(); }
  if (t == 4) { swampHut(); }
  if (t == 5) { igloo(); }
  if (t == 6) { outpost(); }
  if (t == 7) { mansion(); }
  if (t == 8) { monument(); }
  if (t == 9) { shipwreck(); }
  if (t == 10) { oceanRuin(); }
  if (t == 11) { buriedTreasure(); }
}
// the ground under a point (where the terrain stands, from the noise)
function groundY(x, z) { let gk = gridOn; gridOn = 0; columnShape(x, z); gridOn = gk; return colH; }

// ---------------------------------------------------------------- villages
// wood of the village by its biome: planks, log, stairs, slab (variant ids)
let vPl = 5, vLog = 13, vSt = 0, vSl = 0, vFen = 0, vDoor = 0, vWall = 4, vRoof = 0;
function villageWood(b) {
  vPl = I_planks; vLog = 13; vSt = I_oakStairs; vSl = I_oakSlab; vFen = I_oakFence; vDoor = I_oakDoor; vWall = 4; vRoof = I_oakStairs;
  if (b == 5 || b == 6) { vPl = I_sprucePlanks; vLog = 25; vSt = I_spruceStairs; vSl = I_spruceSlab; vFen = I_spruceFence; vDoor = I_spruceDoor; vRoof = I_spruceStairs; }
  if (b == 12) { vPl = I_acaciaPlanks; vLog = I_acaciaLog; vSt = I_acaciaStairs; vSl = I_acaciaSlab; vFen = I_acaciaFence; vDoor = I_acaciaDoor; vRoof = I_acaciaStairs; vWall = I_terracotta; }
  if (b == 4) { vPl = I_smoothSandstone; vLog = I_cutSandstone; vSt = I_sandstoneStairs; vSl = I_sandstoneSlab; vFen = I_sandstoneWall; vDoor = I_oakDoor; vWall = 21; vRoof = I_sandstoneStairs; }
}
let vBiome = 0;
function village() {
  let cxv = stX, czv = stZ, gy = stY;
  vBiome = colB;
  gridOn = 0; columnShape(cxv, czv); vBiome = colB;
  villageWood(vBiome);
  let arms = 4, d = 0;
  // the paths: four arms of 20 .. 34 blocks
  while (d < 4) {
    let len = 26 + mod(stV * 5 + d * 7, 15), k = 3;
    while (k <= len) {
      let x = cxv + dirX(d) * k, z = czv + dirZ(d) * k, s = 0 - 1;
      while (s <= 1) {
        let wx = x + dirZ(d) * s, wz = z + dirX(d) * s;
        if (inChunk(wx, wz, wx, wz) == 1) {
          let h = groundY(wx, wz);
          if (h >= SEA) { sput(wx, h, wz, I_grassPath); sput(wx, h + 1, wz, 0); sput(wx, h + 2, wz, 0); }
          else { sput(wx, SEA - 1, wz, vPl); }
        }
        s = s + 1;
      }
      k = k + 1;
    }
    // buildings along this arm, both sides
    let slot = 0;
    while (slot < 3) {
      let dist = 16 + slot * 9;
      if (dist < len) {
        let side = 0 - 1;
        while (side <= 1) {
          let kind = mod(stV * 3 + d * 5 + slot * 7 + side + 11, 9);
          let bx = cxv + dirX(d) * dist + dirZ(d) * side * 7, bz = czv + dirZ(d) * dist + dirX(d) * side * 7;
          // the building faces the path: its door toward it
          let ofx = dirZ(d) * side, ofz = dirX(d) * side, face = 0;
          if (ofx > 0) { face = 3; } if (ofx < 0) { face = 1; } if (ofz > 0) { face = 2; } if (ofz < 0) { face = 0; }
          vBuilding(kind, bx, bz, face);
          side = side + 2;
        }
      }
      slot = slot + 1;
    }
    d = d + 1;
  }
  // the well in the middle
  if (inChunk(cxv - 3, czv - 3, cxv + 3, czv + 3) == 1) {
    sfound(cxv - 2, czv - 2, cxv + 2, czv + 2, gy, 4);
    sbox(cxv - 2, gy, czv - 2, cxv + 2, gy, czv + 2, 4);
    sbox(cxv - 2, gy + 1, czv - 2, cxv + 2, gy + 5, czv + 2, 0);
    sbox(cxv - 1, gy - 3, czv - 1, cxv + 1, gy, czv + 1, 4);
    sbox(cxv, gy - 2, czv, cxv, gy, czv, 7);
    sbox(cxv - 1, gy + 1, czv - 1, cxv + 1, gy + 1, czv + 1, I_cobbleWall);
    sbox(cxv, gy + 1, czv, cxv, gy + 1, czv, 0);
    sput(cxv - 1, gy + 2, czv - 1, vFen); sput(cxv + 1, gy + 2, czv - 1, vFen); sput(cxv - 1, gy + 2, czv + 1, vFen); sput(cxv + 1, gy + 2, czv + 1, vFen);
    sput(cxv - 1, gy + 3, czv - 1, vFen); sput(cxv + 1, gy + 3, czv - 1, vFen); sput(cxv - 1, gy + 3, czv + 1, vFen); sput(cxv + 1, gy + 3, czv + 1, vFen);
    sbox(cxv - 1, gy + 4, czv - 1, cxv + 1, gy + 4, czv + 1, vSl);
    sput(cxv + 2, gy + 1, czv + 2, I_bell);
  }
  // its people and their keeper (once)
  if (inChunk(cxv, czv, cxv, czv) == 1) {
    if (structMobsOnce(cxv, czv) == 1) {
      let n = 3 + mod(stV, 4), k = 0;
      while (k < n) { structMob(M_VILLAGER, cxv + 0.5 + rndI(-6, 6), gy + 1, czv + 0.5 + rndI(-6, 6)); k = k + 1; }
      structMob(M_GOLEM, cxv + 4.5, gy + 1, czv + 0.5);
    }
  }
}
// one building of a village: kind 0..1 small house, 2 big house, 3 farm, 4 farm, 5 smithy,
// 6 tower with the bell, 7 lamp, 8 small house (its middle at (x, z), the door toward face)
function vBuilding(kind, x, z, face) {
  if (inChunk(x - 6, z - 6, x + 6, z + 6) == 1) {
    let gy = groundY(x, z);
    if (gy >= SEA) {
      if (kind == 0 || kind == 1 || kind == 8) { vHouse(x, gy, z, 2, 2, face, kind); }
      if (kind == 2) { vHouse(x, gy, z, 3, 4, face, kind); }
      if (kind == 3 || kind == 4) { vFarm(x, gy, z, kind); }
      if (kind == 5) { vSmithy(x, gy, z, face); }
      if (kind == 6) { vTower(x, gy, z, face); }
      if (kind == 7) { vLamp(x, gy, z); }
    }
  }
}
// a house of half sizes hx, hz (walls at +-h), a roof of stairs, a bed, a table, a window each side
function vHouse(x, gy, z, hx, hz, face, kind) {
  if (mod(face, 2) == 1) { let t = hx; hx = hz; hz = t; }
  let x0 = x - hx, x1 = x + hx, z0 = z - hz, z1 = z + hz, h = 4;
  sfound(x0, z0, x1, z1, gy, 4);
  sbox(x0, gy, z0, x1, gy, z1, 4);
  sbox(x0, gy + 1, z0, x1, gy + h + 4, z1, 0);
  swalls(x0, gy + 1, z0, x1, gy + h - 1, z1, vPl);
  // the corners in logs
  sbox(x0, gy + 1, z0, x0, gy + h - 1, z0, vLog); sbox(x1, gy + 1, z0, x1, gy + h - 1, z0, vLog);
  sbox(x0, gy + 1, z1, x0, gy + h - 1, z1, vLog); sbox(x1, gy + 1, z1, x1, gy + h - 1, z1, vLog);
  sbox(x0 + 1, gy + 1, z0 + 1, x1 - 1, gy + 1, z1 - 1, 0);
  sbox(x0 + 1, gy, z0 + 1, x1 - 1, gy, z1 - 1, vPl);
  // windows
  sput(x0, gy + 2, z, I_glassPane); sput(x1, gy + 2, z, I_glassPane); sput(x, gy + 2, z0, I_glassPane); sput(x, gy + 2, z1, I_glassPane);
  // the door (on the side face): its two halves, closing that side
  let dx = x + dirX(face) * hx, dz = z + dirZ(face) * hz;
  if (mod(face, 2) == 1) { dx = x + dirX(face) * hx; dz = z; } else { dx = x; dz = z + dirZ(face) * hz; }
  let s = face;
  sput(dx, gy + 1, dz, vDoor + s); sput(dx, gy + 2, dz, vDoor + 4 + s);
  sput(dx + dirX(face), gy, dz + dirZ(face), 4); sput(dx + dirX(face), gy + 1, dz + dirZ(face), 0); sput(dx + dirX(face), gy + 2, dz + dirZ(face), 0);
  sput(dx + dirX(face), gy + 3, dz + dirZ(face), 27);
  // the roof: a ceiling of planks and a ridge of slabs
  sbox(x0, gy + h, z0, x1, gy + h, z1, vPl);
  sbox(x0 + 1, gy + h + 1, z0 + 1, x1 - 1, gy + h + 1, z1 - 1, vSl);
  // inside: a bed, a table, a light, a chest now and then
  let ix = x - dirX(face) * (hx - 1), iz = z - dirZ(face) * (hz - 1);
  let bedC = I_redBed;
  if (mod(kind, 2) == 1) { bedC = I_blueBed; }
  sput(ix + dirZ(face) + dirX(face), gy + 1, iz + dirX(face) + dirZ(face), bedC + mod(face + 2, 4));
  sput(ix + dirZ(face), gy + 1, iz + dirX(face), bedC + 4 + mod(face + 2, 4));
  sput(ix - dirZ(face), gy + 1, iz - dirX(face), 17);
  sput(x, gy + h - 1, z, I_lantern);
  if (kind == 2 || kind == 8) { schest(ix - dirZ(face) * 0, gy + 1, iz, 1); }
  if (kind == 2) { sput(x + dirZ(face), gy + 1, z + dirX(face), I_bookshelf); sput(x - dirZ(face), gy + 1, z - dirX(face), I_flowerPot); }
}
function vFarm(x, gy, z, kind) {
  let x0 = x - 3, x1 = x + 3, z0 = z - 4, z1 = z + 4;
  sfound(x0, z0, x1, z1, gy, 3);
  sbox(x0, gy, z0, x1, gy, z1, vLog);
  sbox(x0 + 1, gy, z0 + 1, x1 - 1, gy, z1 - 1, I_farmlandWet);
  sbox(x, gy, z0 + 1, x, gy, z1 - 1, 7);
  sbox(x0, gy + 1, z0, x1, gy + 3, z1, 0);
  let crop = I_wheatCrop;
  if (kind == 4) { crop = I_carrotCrop; if (mod(stV, 2) == 1) { crop = I_potatoCrop; } }
  if (vBiome == 5 || vBiome == 6) { if (kind == 4) { crop = I_beetCrop; } }
  let a = x0 + 1;
  while (a <= x1 - 1) { if (a != x) { let c = z0 + 1; while (c <= z1 - 1) { sput(a, gy + 1, c, crop + mod(a * 3 + c * 5, 4)); c = c + 1; } } a = a + 1; }
}
function vSmithy(x, gy, z, face) {
  let x0 = x - 3, x1 = x + 3, z0 = z - 3, z1 = z + 3;
  sfound(x0, z0, x1, z1, gy, 4);
  sbox(x0, gy, z0, x1, gy, z1, 4);
  sbox(x0, gy + 1, z0, x1, gy + 6, z1, 0);
  // posts and a roof, open sides
  sbox(x0, gy + 1, z0, x0, gy + 3, z0, vLog); sbox(x1, gy + 1, z0, x1, gy + 3, z0, vLog); sbox(x0, gy + 1, z1, x0, gy + 3, z1, vLog); sbox(x1, gy + 1, z1, x1, gy + 3, z1, vLog);
  sbox(x0, gy + 4, z0, x1, gy + 4, z1, I_cobbleSlab);
  sbox(x0 + 1, gy + 1, z0 + 1, x0 + 2, gy + 1, z0 + 1, 4);
  sput(x0 + 1, gy + 1, z0 + 2, 18); sput(x0 + 2, gy + 1, z0 + 2, I_blastFurnace);
  sput(x + 1, gy + 1, z + 1, I_anvil); sput(x1 - 1, gy + 1, z0 + 1, I_grindstone);
  schest(x1 - 1, gy + 1, z1 - 1, 2);
  sput(x, gy + 3, z, I_lantern);
}
function vTower(x, gy, z, face) {
  let x0 = x - 2, x1 = x + 2, z0 = z - 2, z1 = z + 2, h = 9;
  sfound(x0, z0, x1, z1, gy, 4);
  sbox(x0, gy, z0, x1, gy, z1, 4);
  swalls(x0, gy + 1, z0, x1, gy + h, z1, 4);
  sbox(x0, gy + 1, z0, x0, gy + h, z0, vLog); sbox(x1, gy + 1, z0, x1, gy + h, z0, vLog); sbox(x0, gy + 1, z1, x0, gy + h, z1, vLog); sbox(x1, gy + 1, z1, x1, gy + h, z1, vLog);
  // a ladder up the inside, the bell and windows at the top
  let k = gy + 1;
  while (k <= gy + h) { sput(x0 + 1, k, z, I_ladder + 3); k = k + 1; }
  sput(x + dirX(face) * 2, gy + 1, z + dirZ(face) * 2, 0); sput(x + dirX(face) * 2, gy + 2, z + dirZ(face) * 2, 0);
  sbox(x0 + 1, gy + h - 3, z0 + 1, x1 - 1, gy + h - 3, z1 - 1, vPl); sput(x0 + 1, gy + h - 3, z, I_ladder + 3);
  sput(x, gy + h - 2, z, I_bell);
  sput(x0, gy + h - 1, z, I_glassPane); sput(x1, gy + h - 1, z, I_glassPane); sput(x, gy + h - 1, z0, I_glassPane); sput(x, gy + h - 1, z1, I_glassPane);
  sbox(x0, gy + h + 1, z0, x1, gy + h + 1, z1, I_cobbleSlab);
}
function vLamp(x, gy, z) {
  sput(x, gy, z, 4); sput(x, gy + 1, z, vFen); sput(x, gy + 2, z, vFen); sput(x, gy + 3, z, I_lantern);
}

// ---------------------------------------------------------------- the sandstone pyramid (with its hidden room)
function pyramid() {
  let x = stX, z = stZ, gy = stY, k = 0;
  sfound(x - 10, z - 10, x + 10, z + 10, gy, 21);
  while (k <= 10) {
    let r = 10 - k;
    sbox(x - r, gy + k, z - r, x + r, gy + k, z + r, 21);
    k = k + 1;
  }
  // the hall inside, the doorway, the coloured floor
  sbox(x - 5, gy + 1, z - 5, x + 5, gy + 4, z + 5, 0);
  sbox(x - 4, gy + 5, z - 4, x + 4, gy + 5, z + 4, 0);
  sbox(x - 1, gy + 1, z - 10, x + 1, gy + 3, z - 6, 0);
  sbox(x - 5, gy, z - 5, x + 5, gy, z + 5, I_cutSandstone);
  sput(x, gy, z, I_blueTerracotta); sput(x - 1, gy, z, I_orangeTerracotta); sput(x + 1, gy, z, I_orangeTerracotta); sput(x, gy, z - 1, I_orangeTerracotta); sput(x, gy, z + 1, I_orangeTerracotta);
  sbox(x - 5, gy + 1, z - 5, x - 5, gy + 4, z - 5, I_chiseledSandstone); sbox(x + 5, gy + 1, z - 5, x + 5, gy + 4, z - 5, I_chiseledSandstone);
  sbox(x - 5, gy + 1, z + 5, x - 5, gy + 4, z + 5, I_chiseledSandstone); sbox(x + 5, gy + 1, z + 5, x + 5, gy + 4, z + 5, I_chiseledSandstone);
  // the shaft down under the middle (the room of four chests, TNT under its plate)
  sbox(x, gy - 10, z, x, gy, z, 0); sput(x, gy, z, 0);
  let ry = gy - 12;
  swalls(x - 2, ry, z - 2, x + 2, ry + 3, z + 2, 21);
  sbox(x - 2, ry, z - 2, x + 2, ry, z + 2, I_cutSandstone);
  sbox(x - 1, ry - 2, z - 1, x + 1, ry - 2, z + 1, I_tnt);
  sput(x, ry + 1, z, I_stonePlate);
  sbox(x - 1, ry + 1, z - 1, x + 1, ry + 3, z + 1, 0); sput(x, ry + 1, z, I_stonePlate);
  schest(x - 2, ry + 1, z, 3); schest(x + 2, ry + 1, z, 3); schest(x, ry + 1, z - 2, 3); schest(x, ry + 1, z + 2, 3);
  sbox(x - 2, ry + 4, z - 2, x + 2, ry + 4, z + 2, 21); sput(x, ry + 4, z, 0);
}
// ---------------------------------------------------------------- the jungle temple
function jungleTemple() {
  let x = stX, z = stZ, gy = stY;
  sfound(x - 6, z - 7, x + 6, z + 7, gy, 36);
  sbox(x - 6, gy, z - 7, x + 6, gy, z + 7, 36);
  swalls(x - 6, gy + 1, z - 7, x + 6, gy + 6, z + 7, 36);
  sbox(x - 6, gy + 1, z - 7, x + 6, gy + 1, z + 7, 4); sbox(x - 5, gy + 1, z - 6, x + 5, gy + 1, z + 6, 0);
  sbox(x - 6, gy + 7, z - 7, x + 6, gy + 7, z + 7, I_mossyStoneBricks);
  sbox(x - 4, gy + 8, z - 5, x + 4, gy + 10, z + 5, 36); sbox(x - 3, gy + 8, z - 4, x + 3, gy + 9, z + 4, 0);
  sbox(x - 3, gy + 11, z - 4, x + 3, gy + 11, z + 4, I_mossyStoneBricks);
  sbox(x - 1, gy + 1, z - 7, x + 1, gy + 3, z - 7, 0);
  sput(x - 2, gy + 4, z - 7, I_chiseledStoneBricks); sput(x + 2, gy + 4, z - 7, I_chiseledStoneBricks);
  sbox(x - 5, gy + 4, z - 6, x + 5, gy + 4, z + 6, I_mossyStoneBricks);
  sbox(x - 1, gy + 4, z - 1, x + 1, gy + 4, z + 1, 0);
  // the chest rooms, the lever, the trap's dispenser
  schest(x + 4, gy + 1, z + 5, 4); schest(x - 4, gy + 5, z + 5, 4);
  // (the lever on the +x wall, the dispenser in the -x wall looking into the room: power.js variants)
  sput(x + 4, gy + 2, z - 5, I_lever + 4); sput(x - 5, gy + 2, z, I_dispenser + 4);
  sbox(x, gy + 5, z, x, gy + 7, z, 0);
  let k = 0;
  while (k < 10) { sput(x - 6 + rndI(0, 12), gy + rndI(2, 10), z - 7, I_vines); k = k + 1; }
}
// ---------------------------------------------------------------- the swamp hut on its stilts
function swampHut() {
  let x = stX, z = stZ, fy = Math.max(stY, SEA) + 3, s = I_sprucePlanks;
  let a = x - 2;
  while (a <= x + 2) { let c = z - 3; while (c <= z + 3) { if ((a == x - 2 || a == x + 2) && (c == z - 3 || c == z + 3)) { let yy = fy - 1, i = 0; while (yy > 1 && i < 10) { let b2 = W[wi(a, yy, c)]; if (inChunk(a, c, a, c) == 1) { if (b2 == 0 || b2 == 7 || BSHP[b2 + 1] == 1 || BLEAF[b2 + 1] == 1) { sput(a, yy, c, 25); yy = yy - 1; i = i + 1; } else { i = 99; } } else { i = 99; } } } c = c + 1; } a = a + 1; }
  sbox(x - 2, fy, z - 3, x + 2, fy, z + 3, s);
  swalls(x - 2, fy + 1, z - 3, x + 2, fy + 3, z + 3, s);
  sbox(x - 2, fy + 1, z - 3, x - 2, fy + 3, z - 3, 25); sbox(x + 2, fy + 1, z - 3, x + 2, fy + 3, z - 3, 25);
  sbox(x - 2, fy + 1, z + 3, x - 2, fy + 3, z + 3, 25); sbox(x + 2, fy + 1, z + 3, x + 2, fy + 3, z + 3, 25);
  sbox(x - 3, fy + 4, z - 4, x + 3, fy + 4, z + 4, I_spruceSlab);
  sput(x, fy + 1, z - 3, 0); sput(x, fy + 2, z - 3, 0);
  sput(x - 2, fy + 2, z, I_glassPane); sput(x + 2, fy + 2, z, I_glassPane);
  sput(x + 1, fy + 1, z + 2, I_cauldron); sput(x - 1, fy + 1, z + 2, 17); sput(x - 1, fy + 2, z + 2, I_potted_mushRed);
  sput(x, fy + 3, z, I_lantern);
}
// ---------------------------------------------------------------- the igloo (and now and then its cellar)
function igloo() {
  let x = stX, z = stZ, gy = stY, a = 0 - 3;
  while (a <= 3) {
    let c = 0 - 3;
    while (c <= 3) {
      let d = a * a + c * c;
      if (d <= 12) { let hh = 4; if (d > 5) { hh = 3; } if (d > 9) { hh = 2; } sbox(x + a, gy + 1, z + c, x + a, gy + hh, z + c, 45); }
      c = c + 1;
    }
    a = a + 1;
  }
  sbox(x - 2, gy + 1, z - 2, x + 2, gy + 2, z + 2, 0); sbox(x - 1, gy + 3, z - 1, x + 1, gy + 3, z + 1, 0);
  sbox(x - 2, gy, z - 2, x + 2, gy, z + 2, 45);
  sbox(x, gy + 1, z - 4, x, gy + 2, z - 3, 0); sput(x, gy + 3, z - 4, 45); sput(x - 1, gy + 1, z - 4, 45); sput(x + 1, gy + 1, z - 4, 45); sput(x - 1, gy + 2, z - 4, 45); sput(x + 1, gy + 2, z - 4, 45);
  sput(x - 1, gy + 1, z + 2, I_redBed + 2); sput(x - 1, gy + 1, z + 1, I_redBed + 6);
  sput(x + 2, gy + 1, z, 18); sput(x + 2, gy + 1, z + 1, 17); sput(x, gy + 1, z, I_whiteCarpet);
  sput(x - 2, gy + 2, z - 1, I_lantern);
  if (mod(stV, 2) == 0) {
    // the cellar: a ladder down, a room with a chest and a brewing stand
    sput(x + 1, gy, z - 1, I_spruceTrapdoor);
    let k = gy - 1;
    while (k > gy - 8) { sput(x + 1, k, z - 1, I_ladder + 2); sput(x + 1, k, z - 2, 1); k = k - 1; }
    swalls(x - 2, gy - 12, z - 2, x + 3, gy - 8, z + 3, I_stoneBricks);
    sbox(x - 2, gy - 12, z - 2, x + 3, gy - 12, z + 3, I_stoneBricks);
    sput(x + 1, gy - 8, z - 1, I_ladder + 2);
    schest(x - 1, gy - 11, z + 2, 5); sput(x + 2, gy - 11, z + 2, I_brewingStand); sput(x, gy - 9, z, I_lantern);
  }
}
// ---------------------------------------------------------------- the raiders' watchtower
function outpost() {
  let x = stX, z = stZ, gy = stY, h = 17;
  sfound(x - 4, z - 4, x + 4, z + 4, gy, 4);
  sbox(x - 3, gy, z - 3, x + 3, gy, z + 3, 4);
  sbox(x - 3, gy + 1, z - 3, x + 3, gy + h + 4, z + 3, 0);
  // four ebony posts, floors at two heights, a fenced top
  sbox(x - 3, gy + 1, z - 3, x - 3, gy + h, z - 3, I_ebonyLog); sbox(x + 3, gy + 1, z - 3, x + 3, gy + h, z - 3, I_ebonyLog);
  sbox(x - 3, gy + 1, z + 3, x - 3, gy + h, z + 3, I_ebonyLog); sbox(x + 3, gy + 1, z + 3, x + 3, gy + h, z + 3, I_ebonyLog);
  sbox(x - 2, gy + 1, z - 3, x + 2, gy + 6, z - 3, I_birchPlanks); sbox(x - 2, gy + 1, z + 3, x + 2, gy + 6, z + 3, I_birchPlanks);
  sbox(x - 3, gy + 1, z - 2, x - 3, gy + 6, z + 2, I_birchPlanks); sbox(x + 3, gy + 1, z - 2, x + 3, gy + 6, z + 2, I_birchPlanks);
  sput(x, gy + 1, z - 3, 0); sput(x, gy + 2, z - 3, 0);
  sbox(x - 3, gy + 7, z - 3, x + 3, gy + 7, z + 3, I_ebonyPlanks);
  sbox(x - 4, gy + h, z - 4, x + 4, gy + h, z + 4, I_ebonyPlanks);
  sbox(x - 4, gy + h + 1, z - 4, x + 4, gy + h + 1, z - 4, I_ebonyFence); sbox(x - 4, gy + h + 1, z + 4, x + 4, gy + h + 1, z + 4, I_ebonyFence);
  sbox(x - 4, gy + h + 1, z - 3, x - 4, gy + h + 1, z + 3, I_ebonyFence); sbox(x + 4, gy + h + 1, z - 3, x + 4, gy + h + 1, z + 3, I_ebonyFence);
  sbox(x - 4, gy + h + 4, z - 4, x + 4, gy + h + 4, z + 4, I_ebonySlab);
  sbox(x + 3, gy + 7, z + 2, x + 3, gy + h, z + 2, I_ebonyPlanks);
  let k = gy + 1;
  while (k <= gy + h) { sput(x + 2, k, z + 2, I_ladder + 1); k = k + 1; }
  schest(x - 2, gy + h + 1, z - 2, 6); sput(x - 2, gy + 8, z + 2, I_grayBanner);
  if (inChunk(x, z, x, z) == 1) { if (structMobsOnce(x, z) == 1) { structMob(M_RAIDER, x + 0.5, gy + h + 1, z + 0.5); structMob(M_RAIDER, x + 0.5, gy + 1, z + 0.5); structMob(M_RAIDER, x + 4.5, gy + 1, z + 5.5); } }
}
// ---------------------------------------------------------------- the ebony mansion
function mansion() {
  let x = stX, z = stZ, gy = stY, w = 15, d = 11, fl = 0;
  sfound(x - w, z - d, x + w, z + d, gy, 4);
  sbox(x - w, gy, z - d, x + w, gy, z + d, 4);
  sbox(x - w, gy + 1, z - d, x + w, gy + 14, z + d, 0);
  while (fl < 2) {
    let y0 = gy + 1 + fl * 5;
    swalls(x - w, y0, z - d, x + w, y0 + 4, z + d, I_ebonyPlanks);
    sbox(x - w, y0 - 1, z - d, x + w, y0 - 1, z + d, I_ebonyPlanks);
    if (fl == 0) { sbox(x - w, y0 - 1, z - d, x + w, y0 - 1, z + d, 4); }
    // log posts and windows
    let a = x - w;
    while (a <= x + w) { sbox(a, y0, z - d, a, y0 + 4, z - d, I_ebonyLog); sbox(a, y0, z + d, a, y0 + 4, z + d, I_ebonyLog); a = a + 5; }
    a = x - w + 2;
    while (a <= x + w - 2) { if (mod(a - x + w, 5) != 0) { sput(a, y0 + 2, z - d, I_glassPane); sput(a, y0 + 2, z + d, I_glassPane); } a = a + 1; }
    // rooms: inner walls of birch, doorways
    sbox(x - w + 1, y0, z, x + w - 1, y0 + 3, z, I_birchPlanks);
    a = x - w + 10;
    while (a < x + w) { sbox(a, y0, z - d + 1, a, y0 + 3, z + d - 1, I_birchPlanks); a = a + 10; }
    a = x - w + 5;
    while (a < x + w) { sbox(a, y0, z, a, y0 + 1, z, 0); a = a + 10; }
    a = x - w + 10;
    while (a < x + w) { sbox(a, y0, z - 3, a, y0 + 1, z - 3, 0); sbox(a, y0, z + 3, a, y0 + 1, z + 3, 0); a = a + 10; }
    // carpets, lights and a chest in some rooms
    a = x - w + 5;
    while (a < x + w) {
      sbox(a - 2, y0, z - 5, a + 2, y0, z - 3, I_redCarpet); sput(a, y0 + 3, z - 6, I_lantern); sput(a, y0 + 3, z + 6, I_lantern);
      if (mod(a + fl * 7 + stV, 3) == 0) { schest(a + 3, y0, z + d - 1, 7); }
      if (mod(a + fl, 2) == 0) { sput(a - 3, y0, z + d - 1, I_bookshelf); sput(a - 3, y0 + 1, z + d - 1, I_bookshelf); }
      a = a + 10;
    }
    fl = fl + 1;
  }
  // the door, the stairs up, the roof
  sbox(x, gy + 1, z - d, x, gy + 2, z - d, 0); sput(x, gy + 1, z - d, I_ebonyDoor + 2); sput(x, gy + 2, z - d, I_ebonyDoor + 6);
  let k = 0;
  while (k < 5) { if (k < 4) { sput(x - w + 2 + k, gy + 5, z - d + 2, 0); sput(x - w + 2 + k, gy + 6, z - d + 2, 0); } sput(x - w + 2 + k, gy + 1 + k, z - d + 2, I_ebonyStairs + 1); k = k + 1; }
  let r = 0;
  while (r <= 4) { sbox(x - w - 1 + r, gy + 11 + r, z - d - 1 + r, x + w + 1 - r, gy + 11 + r, z + d + 1 - r, I_cobbleSlab); sbox(x - w + r, gy + 11 + r, z - d + r, x + w - r, gy + 11 + r, z + d - r, I_ebonyPlanks); r = r + 1; }
  if (inChunk(x, z, x, z) == 1) { if (structMobsOnce(x, z) == 1) { k = 0; while (k < 4) { structMob(M_RAIDER, x - w + 4 + k * 7 + 0.5, gy + 1, z + 4.5); k = k + 1; } } }
}
// ---------------------------------------------------------------- the sea temple
function monument() {
  let x = stX, z = stZ, by = Math.max(3, stY), top = SEA - 3, w = 28;
  // the base, three steps up, the core with its gold, the halls full of water
  let k = 0;
  while (k < 4) {
    let r = w - k * 6, y0 = by + k * 4, y1 = Math.min(top, y0 + 3);
    if (y0 <= top) {
      sbox(x - r, y0, z - r, x + r, y1, z + r, I_aquaBricks);
      sbox(x - r + 1, y0, z - r + 1, x + r - 1, y1 - 1, z + r - 1, 7);
      sbox(x - r, y1, z - r, x + r, y1, z + r, I_darkAquastone);
    }
    k = k + 1;
  }
  sbox(x - w, by, z - w, x + w, by, z + w, I_aquastone);
  // pillars and lanterns in the halls
  let a = x - w + 4;
  while (a <= x + w - 4) {
    let c = z - w + 4;
    while (c <= z + w - 4) {
      if (Math.abs(a - x) > 6 || Math.abs(c - z) > 6) { sbox(a, by + 1, c, a, by + 3, c, I_aquastone); sput(a, by + 4, c, I_aquaLantern); }
      c = c + 8;
    }
    a = a + 8;
  }
  // the gold of the heart
  swalls(x - 4, by + 1, z - 4, x + 4, by + 6, z + 4, I_darkAquastone);
  sbox(x - 3, by + 1, z - 3, x + 3, by + 5, z + 3, 7);
  sbox(x - 1, by + 1, z - 1, x, by + 2, z, 42); sput(x + 1, by + 1, z + 1, 42);
  sbox(x - 1, by + 3, z - 4, x + 1, by + 4, z - 4, 7);
  // the gate
  sbox(x - 2, by + 1, z - w, x + 2, by + 4, z - w + 6, 7);
  sput(x - 3, by + 5, z - w, I_aquaLantern); sput(x + 3, by + 5, z - w, I_aquaLantern);
}
// ---------------------------------------------------------------- wrecks, sea ruins, buried chests, wells, fossils, dungeons
function shipwreck() {
  let x = stX, z = stZ, ax = mod(stV, 2), fy = 0, b = I_sprucePlanks;
  findTopFloor(x, z);
  fy = flY + 1;
  if (mod(stV, 3) == 1) { b = I_planks; }
  // the hull along x (ax 0) or z (ax 1), 20 long, a deck, a mast, broken at one end now and then
  let L = 9, k = 0 - L;
  while (k <= L) {
    let wid = 3;
    if (Math.abs(k) > 6) { wid = 2; } if (Math.abs(k) > 8) { wid = 1; }
    let s = 0 - wid;
    while (s <= wid) {
      let hx = x + k, hz = z + s;
      if (ax == 1) { hx = x + s; hz = z + k; }
      let broken = 0;
      if (mod(stV, 4) == 0) { if (k > 4) { broken = 1; } }
      if (broken == 0) {
        sput(hx, fy, hz, b);
        if (Math.abs(s) == wid) { sbox(hx, fy + 1, hz, hx, fy + 3, hz, b); }
        else { sbox(hx, fy + 1, hz, hx, fy + 3, hz, 7); }
        if (k < 4 && k > 0 - 6) { if (Math.abs(s) < wid) { sput(hx, fy + 3, hz, b); } }
      }
      s = s + 1;
    }
    k = k + 1;
  }
  sbox(x, fy + 4, z, x, fy + 10, z, 25);
  sbox(x, fy + 4, z, x, fy + 10, z, 25);
  let c1x = x - 5, c1z = z, c2x = x + 3, c2z = z;
  if (ax == 1) { c1x = x; c1z = z - 5; c2x = x; c2z = z + 3; }
  schest(c1x, fy + 1, c1z, 8); schest(c2x, fy + 1, c2z, 9);
}
// the floor under the sea at (x, z): flY
let flY = 0;
function findTopFloor(x, z) {
  let h = groundY(x, z);
  flY = h;
}
function oceanRuin() {
  let x = stX, z = stZ, fy = groundY(x, z), br = I_stoneBricks, mo = I_mossyStoneBricks;
  if (mod(stV, 2) == 1) { br = 21; mo = I_cutSandstone; }
  sbox(x - 4, fy, z - 4, x + 4, fy, z + 4, br);
  let a = x - 4;
  while (a <= x + 4) {
    let c = z - 4;
    while (c <= z + 4) {
      if (a == x - 4 || a == x + 4 || c == z - 4 || c == z + 4) { let hh = 1 + mod(a * 7 + c * 3 + stV, 4); let yy = 1; while (yy <= hh) { let bb = br; if (mod(a + c + yy, 3) == 0) { bb = mo; } sput(a, fy + yy, c, bb); yy = yy + 1; } }
      c = c + 1;
    }
    a = a + 1;
  }
  schest(x, fy + 1, z, 10);
  sput(x + 2, fy + 1, z + 2, I_seaPickle);
}
function buriedTreasure() {
  let x = stX, z = stZ, gy = groundY(x, z);
  schest(x, gy - 2, z, 11);
}
function desertWell(x, y, z) {
  sbox(x - 2, y, z - 2, x + 2, y, z + 2, 21);
  sput(x, y, z, 7); sput(x, y - 1, z, 7); sbox(x - 1, y - 2, z - 1, x + 1, y - 2, z + 1, 21);
  sput(x - 1, y + 1, z, I_sandstoneSlab); sput(x + 1, y + 1, z, I_sandstoneSlab); sput(x, y + 1, z - 1, I_sandstoneSlab); sput(x, y + 1, z + 1, I_sandstoneSlab);
  sbox(x - 1, y + 1, z - 1, x - 1, y + 2, z - 1, 21); sbox(x + 1, y + 1, z - 1, x + 1, y + 2, z - 1, 21); sbox(x - 1, y + 1, z + 1, x - 1, y + 2, z + 1, 21); sbox(x + 1, y + 1, z + 1, x + 1, y + 2, z + 1, 21);
  sbox(x - 1, y + 3, z - 1, x + 1, y + 3, z + 1, I_sandstoneSlab);
}
function fossil(x, y, z) {
  // a spine and ribs of bone, a little coal round them
  let k = 0;
  while (k < 6) {
    sput(x + k, y, z + 2, I_boneBlock);
    if (mod(k, 2) == 0) { sput(x + k, y + 1, z, I_boneBlock); sput(x + k, y + 2, z + 1, I_boneBlock); sput(x + k, y + 2, z + 3, I_boneBlock); sput(x + k, y + 1, z + 4, I_boneBlock); }
    k = k + 1;
  }
  if (rnd() < 0.5) { sput(x + 2, y - 1, z + 2, 12); sput(x + 4, y + 3, z + 2, 12); }
}
// a dungeon: a room of cobble and moss, a spawner in the middle, a chest or two
function dungeon(x, y, z) {
  if (W[wi(x, y, z)] == 1 && W[wi(x, y + 4, z)] == 1) {
    let a = x - 3;
    while (a <= x + 3) {
      let c = z - 3;
      while (c <= z + 3) {
        let yy = y - 1;
        while (yy <= y + 3) {
          let b = 0;
          if (a == x - 3 || a == x + 3 || c == z - 3 || c == z + 3 || yy == y - 1 || yy == y + 3) { b = 4; if (rnd() < 0.4) { b = 36; } }
          sput(a, yy, c, b);
          yy = yy + 1;
        }
        c = c + 1;
      }
      a = a + 1;
    }
    let m = rndI(0, 3), sb = I_spawner_zombie;
    if (m == 1) { sb = I_spawner_skeleton; } if (m == 2) { sb = I_spawner_spider; }
    sspawner(x, y, z, sb);
    schest(x - 2, y, z + 2, 14);
    if (rnd() < 0.5) { schest(x + 2, y, z - 2, 14); }
  }
}
// ---------------------------------------------------------------- mines: corridors of plank and fence
function mineshaft() {
  let k = 0, n = 10 + mod(stV, 6);
  let x = stX, y = stY, z = stZ;
  // the room in the middle
  if (inChunk(x - 6, z - 6, x + 6, z + 6) == 1) { sbox(x - 5, y - 1, z - 5, x + 5, y - 1, z + 5, 3); sbox(x - 5, y, z - 5, x + 5, y + 4, z + 5, 0); }
  let sx = x, sz = z, sy = y, d = rndI(0, 3);
  while (k < n) {
    let len = rndI(10, 26), rs0 = rs;
    mineRun(sx, sy, sz, d, len);
    rs = rs0;
    sx = sx + dirX(d) * len; sz = sz + dirZ(d) * len;
    if (rnd() < 0.3) { sy = Math.max(8, Math.min(50, sy + rndI(-4, 4))); }
    // turn left or right, or back to the middle for another branch
    if (rnd() < 0.3) { sx = x; sz = z; sy = y; d = rndI(0, 3); } else { d = mod(d + 1 + rndI(0, 1) * 2, 4); }
    k = k + 1;
  }
}
function mineRun(x, y, z, d, len) {
  let ex = x + dirX(d) * len, ez = z + dirZ(d) * len;
  if (inChunk(Math.min(x, ex) - 2, Math.min(z, ez) - 2, Math.max(x, ex) + 2, Math.max(z, ez) + 2) == 1) {
    let t = 0;
    while (t <= len) {
      let cx2 = x + dirX(d) * t, cz2 = z + dirZ(d) * t, s = 0 - 1;
      while (s <= 1) {
        let wx = cx2 + dirZ(d) * s, wz = cz2 + dirX(d) * s;
        if (inChunk(wx, wz, wx, wz) == 1) {
          let i = wi(wx, y, wz);
          // (not into the sea or the open air)
          if (W[i + 3] != 7) {
            sbox(wx, y, wz, wx, y + 2, wz, 0);
            if (BSOL[W[i - 1] + 1] == 0) { W[i - 1] = I_planks; }
            if (s == 0) { if (rnd() < 0.7) { W[i] = I_rail + mod(d, 2); } }
            if (mod(t, 4) == 0) {
              if (s != 0) { sbox(wx, y, wz, wx, y + 1, wz, I_oakFence); }
              W[i + 2] = I_planks;
            }
            if (rnd() < 0.04) { if (s != 0) { W[i + 2] = I_cobweb; } }
            if (mod(t, 12) == 6) { if (s == 1) { W[i + 1] = 27; } }
          }
        }
        s = s + 1;
      }
      if (mod(t * 7 + len, 37) == 0) { let qx = cx2 + dirZ(d), qz = cz2 + dirX(d); if (inChunk(qx, qz, qx, qz) == 1) { schest(qx, y, qz, 13); } }
      if (mod(t * 11 + len, 97) == 0) { if (inChunk(cx2, cz2, cx2, cz2) == 1) { sspawner(cx2, y, cz2, I_spawner_spider); } }
      t = t + 1;
    }
  }
}
// ---------------------------------------------------------------- the black-rock bastion of the depths
function featuresBastion(cx, cz) {
  let reg = STREG[16], r = STRAD[16], x0 = cx * 16, z0 = cz * 16, a = idiv(x0 - r, reg);
  while (a <= idiv(x0 + 15 + r, reg)) {
    let c = idiv(z0 - r, reg);
    while (c <= idiv(z0 + 15 + r, reg)) { structIn(16, a, c); if (stOk == 1) { if (inChunk(stX - r, stZ - r, stX + r, stZ + r) == 1) { stSeed(16, stX, stZ); bastion(); } } c = c + 1; }
    a = a + 1;
  }
}
function bastion() {
  let x = stX, z = stZ, y = 18, w = 14, h = 16;
  sbox(x - w, y, z - w, x + w, y + h, z + w, I_blackrockBricks);
  sbox(x - w + 2, y + 1, z - w + 2, x + w - 2, y + h - 1, z + w - 2, 0);
  // floors with holes, gold in the middle, chests round it
  sbox(x - w + 2, y + 6, z - w + 2, x + w - 2, y + 6, z + w - 2, I_polishedBlackrock);
  sbox(x - 4, y + 6, z - 4, x + 4, y + 6, z + 4, 0);
  sbox(x - w + 2, y + 11, z - w + 2, x + w - 2, y + 11, z + w - 2, I_polishedBlackrock);
  sbox(x - 2, y + 1, z - 2, x + 2, y + 1, z + 2, I_gildedBlackrock);
  sput(x, y + 2, z, 42); sput(x + 1, y + 2, z, 42); sput(x, y + 2, z + 1, 42);
  schest(x - 6, y + 1, z - 6, 15); schest(x + 6, y + 7, z + 6, 15); schest(x - 6, y + 12, z + 6, 15);
  // doorways, lava moat now and then, cracked bricks and lanterns
  sbox(x - 1, y + 1, z - w, x + 1, y + 4, z - w + 1, 0); sbox(x - w, y + 1, z - 1, x - w + 1, y + 4, z + 1, 0);
  let k = 0;
  while (k < 30) { sput(x - w + rndI(0, w * 2), y + rndI(0, h), z - w + rndI(0, 1) * w * 2, I_crackedBlackrockBricks); k = k + 1; }
  k = 0;
  while (k < 8) { sput(x - w + 3 + k * 3, y + 4, z - w + 2, I_wailLantern); sput(x - w + 3 + k * 3, y + 9, z + w - 2, I_wailLantern); k = k + 1; }
  // pillars down to the ground
  let a = x - w;
  while (a <= x + w) { let c = z - w; while (c <= z + w) { let yy = y - 1, n = 0; while (yy > 1 && n < 20) { if (inChunk(a, c, a, c) == 1) { let b = W[wi(a, yy, c)]; if (b == 0 || b == 35) { W[wi(a, yy, c)] = I_blackrock; yy = yy - 1; n = n + 1; } else { n = 99; } } else { n = 99; } } c = c + w; } a = a + w; }
  if (inChunk(x, z, x, z) == 1) { if (structMobsOnce(x, z) == 1) { k = 0; while (k < 4) { structMob(M_ASHPIG, x - 5 + k * 3 + 0.5, y + 1, z + 5.5); k = k + 1; } structMob(M_ASHBOAR, x + 0.5, y + 7, z - 6.5); } }
}
// mobs of a structure wait until the chunk they stand in is ready
let PMT = [], PMX = [], PMY = [], PMZ = [];
function structMob(t, x, y, z) { PMT.push(t); PMX.push(x); PMY.push(y); PMZ.push(z); }
function pendingMobs() {
  let k = PMT.length;
  while (k >= 1) {
    if (cOK(Math.floor(PMX[k]), Math.floor(PMZ[k])) == 1) {
      if (CKST[slotOf(idiv(Math.floor(PMX[k]), 16), idiv(Math.floor(PMZ[k]), 16))] == 5) {
        mobAdd(PMT[k], PMX[k], PMY[k], PMZ[k]);
        if (lastMob > 0) { EST[lastMob] = 0; }
        PMT.removeAt(k); PMX.removeAt(k); PMY.removeAt(k); PMZ.removeAt(k);
      }
    }
    k = k - 1;
  }
}
