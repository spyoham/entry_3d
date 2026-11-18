// ===================================================================== other worlds
// dim 0 the overworld, 1 the ashen depths (잿빛 심연), 2 the void (공허의 섬).
// The depths are a cavern between a floor and a ceiling of ashstone over a lava sea, with rock
// pillars, glowing crystals, fire-stone ore and the bridges of ruined black-brick forts.
// The void is islands of void stone over nothing: the warden's island at the middle, ringed by
// tall pillars with warding crystals on top, and far out more islands with towers.
let dim = 0, bossDead = 0;

// ---------------------------------------------------------------- the ashen depths
// (v3.2) Two lands: a world or a server made before v3.2 keeps the one it had (genVer 0: a floor and a
// ceiling with pillars, genColumnU0 / featuresU0 as they were), a new one gets the cavern world below.
function genColumnU(x, z) { if (genVer == 0) { genColumnU0(x, z); } else { genColumnU1(x, z); } }
function featuresU(cx, cz) { if (genVer == 0) { featuresU0(cx, cz); } else { featuresU1(cx, cz); } }
// (the noise in whole numbers as a function: nI. The macro written out a dozen times a column made the
// two new generators 3400 blocks bigger; a call each is a few thousand calls a chunk)
function inoise(x, z, p) { M_inoise(x, z, p); }
// The cavern world (genVer 1), a column at a time, in whole numbers (M_inoise: -1024..1024):
// - a floor that rolls from under the lava sea (level 12, about a third of the land) up to hills,
// - a roof with hanging rock, walls and columns where a "pinch" field squeezes floor and roof together
//   (gently at first, then steeply: halls, narrow ways between them, columns wider at foot and head),
// - two shelves at about 27 and 41 where their fields (more so near the walls) say: thin at their edge,
//   so they overhang; one too near the floor is a step of the floor, one too near the roof hangs from it,
// - the wailing valleys wide and open (the pinch and the shelves fade, the floor comes out of the lava,
//   the roof is higher), the basalt deltas low and broken: lava pockets and many small basalt spikes.
// HMAP is the floor one stands on: the ground, or over the lava the lowest shelf.
function genColumnU1(x, z) {
  // the part of the depths (as ashBiome), and how far into a valley (vq) and a delta (dq) this is, 0..1024
  inoise(x - (0 - 7001), z - (0 - 3331), 70); let ba = nI;
  inoise(x - (0 - 1203), z - (0 - 9907), 64); let bb = nI;
  let bm = 9, vq = 0, dq = 0;
  if (ba > 256) { bm = 22; if (bb >= 205) { bm = 23; } }
  if (ba <= 0 - 308) {
    bm = 24; vq = Math.min(1024, (0 - 308 - ba) * 8 - (0 - 200));
    if (bb > 256) { bm = 25; dq = Math.min(vq, (bb - 256) * 16 - (0 - 300)); }
  }
  inoise(x - (0 - 911), z - (0 - 377), 44); let fa = nI;
  inoise(x - (0 - 5113), z - (0 - 2753), 17); let fb = nI;
  inoise(x - (0 - 5531), z - (0 - 2711), 36); let ca = nI;
  inoise(x - (0 - 333), z - (0 - 6667), 9); let cb = nI;
  inoise(x - (0 - 3313), z - (0 - 7177), 52); let wa = nI;
  inoise(x - (0 - 4421), z - (0 - 8111), 21); let wb = nI;
  inoise(x - (0 - 1777), z - (0 - 913), 13); let wc = nI;
  inoise(x - (0 - 6203), z - (0 - 1511), 34); let wd = nI;
  inoise(x - (0 - 7501), z - (0 - 4441), 30); let sa = nI;
  inoise(x - (0 - 2103), z - (0 - 9607), 24); let sb = nI;
  // the floor and the roof
  let fl = 12 - (0 - idiv(fa * 9 - (0 - fb * 4), 1024)), ce = 56 - (0 - idiv(ca * 4, 1024)), spk = 0;
  if (cb > 420) { ce = ce - idiv((cb - 420) * 8, 604); }
  // hills of the floor and rock hanging from the roof: two fields that share a part, so a hill often
  // meets a hanging mass (a wall, a wide column) - but not always (a hill alone, a mass alone)
  let hf = idiv(wa * 5 - (0 - wb * 3), 8), hg = idiv(wa * 4 - (0 - wd * 4), 8), hill = 0, hang = 0;
  if (hf > 100) { hill = idiv((hf - 100) * 40, 1024); }
  if (hg > 150) { hang = idiv((hg - 150) * 44, 1024); }
  if (vq > 0) {
    // the valleys: open and wide (little of either), their floor out of the lava, a higher roof
    hill = hill - idiv(hill * vq * 3, 4096); hang = hang - idiv(hang * vq * 3, 4096);
    if (fl < 15) { fl = fl - (0 - idiv((15 - fl) * vq, 1024)); }
    ce = ce - (0 - idiv(vq * 3, 1024));
    if (dq > 0) {
      // the deltas: low and broken, lava in the hollows, basalt spikes
      fl = fl - (0 - idiv((11 - (0 - idiv((cb - (0 - 100)) * 5, 1024)) - fl) * dq, 1024));
      if (dq > 300) { inoise(x - (0 - 4441), z - (0 - 1123), 5); if (nI > 380) { spk = idiv((nI - 380) * dq, 55000); fl = fl - (0 - spk); } }
    }
  }
  // slim columns: floor and roof drawn together at 30 (gently, then steeply: wider at foot and head)
  if (wc > 690) {
    let p2 = Math.min(1024, (wc - 690) * 14);
    p2 = idiv(p2 * p2, 1024);
    if (fl < 30) { hill = Math.max(hill, idiv((30 - fl) * p2, 1024)); }
    if (ce > 30) { hang = Math.max(hang, idiv((ce - 30) * p2, 1024)); }
  }
  fl = fl - (0 - hill); ce = ce - hang;
  if (ce > 61) { ce = 61; }
  if (fl < 2) { fl = 2; }
  // the shelves (cells bA..tA and bB..tB), more of them by the hills
  let hasA = 0, tA = 0, bA = 0, hasB = 0, tB = 0, bB = 0, th = 0;
  let mB = sb - (0 - idiv(hf, 3)) - idiv(vq, 3), candB = 0;
  if (mB > 300) {
    tB = 41 - (0 - idiv(ca * 3 - (0 - fb * 2), 1024)); th = Math.min(5, 1 - (0 - idiv(mB - 300, 130))); bB = tB - th - (0 - 1);
    // (too near the roof: the roof comes down to its underside)
    if (tB - (0 - 4) > ce) { if (bB < ce) { ce = bB; } } else { candB = 1; }
  }
  let mA = sa - (0 - idiv(hf, 3)) - idiv(vq, 3);
  if (mA > 200) {
    tA = 27 - (0 - idiv(ca * 4, 1024)); th = Math.min(6, 1 - (0 - idiv(mA - 200, 130))); bA = tA - th - (0 - 1);
    // (room under it: a shelf; just over the floor: a step of the floor; else nothing)
    if (bA - fl >= 4) { if (tA - (0 - 4) <= ce) { hasA = 1; } }
    else { if (tA > fl) { if (tA - fl <= 4) { if (tA - (0 - 3) < ce) { fl = tA; } } } }
  }
  if (candB == 1) { let base = fl; if (hasA == 1) { base = tA; } if (bB - base >= 4) { hasB = 1; } }
  // what it is made of
  let top = 48, under = 48, deep = 48;
  if (bm == 22) { top = I_emberMoss; } if (bm == 23) { top = I_indigoMoss; }
  if (bm == 24) { top = I_wailSand; under = I_wailSoil; if (fb > 0) { top = I_wailSoil; } }
  if (bm == 25) { top = 53; under = I_blackrock; if (cb > 205) { top = I_blackrock; } if (fb > 460) { top = I_magma; } }
  if (bm == 9) { if (fb > 307) { top = 49; } }
  if (cb > 614) { top = 53; under = 53; deep = 53; }
  let roof = deep, topS = top, ub = 3;
  if (bm == 25) { if (cb > 0) { roof = I_blackrock; } }
  if (spk > 0) { top = 53; under = 53; ub = Math.max(3, spk); }
  // (under the lava no moss; a column of rock from floor to roof)
  if (fl <= 11) { if (top != I_magma) { top = under; } }
  let hm = fl;
  if (fl <= 11) { if (hasA == 1) { hm = tA; } else { if (hasB == 1) { hm = tB; } } }
  if (ce <= fl - (0 - 2)) { fl = UH - 3; ce = UH - 2; hasA = 0; hasB = 0; top = deep; under = deep; hm = fl; }
  let ci = wcol(x, z);
  HMAP[ci] = hm; BIOM[ci] = bm;
  // the column: bedrock, floor, the open part with its shelves (lava up to 12), roof, bedrock
  let i = (ci - 1) * WY + 1, y = 2, e = fl - ub - 1;
  W[i] = 6; LT[i] = 0; i = i + 1;
  if (rnd() < 0.5) { W[i] = 6; } else { W[i] = deep; }
  LT[i] = 0; i = i + 1;
  while (y <= e) { W[i] = deep; LT[i] = 0; i = i + 1; y = y + 1; }
  while (y < fl) { W[i] = under; LT[i] = 0; i = i + 1; y = y + 1; }
  W[i] = top; LT[i] = 0; i = i + 1; y = y + 1;
  e = ce - 1;
  if (hasA == 1) { e = bA - 1; } else { if (hasB == 1) { e = bB - 1; } }
  while (y <= e && y <= 12) { W[i] = 35; LT[i] = 0; i = i + 1; y = y + 1; }
  while (y <= e) { W[i] = 0; LT[i] = 0; i = i + 1; y = y + 1; }
  if (hasA == 1) {
    while (y < tA) { W[i] = deep; LT[i] = 0; i = i + 1; y = y + 1; }
    W[i] = topS; LT[i] = 0; i = i + 1; y = y + 1;
    e = ce - 1;
    if (hasB == 1) { e = bB - 1; }
    while (y <= e) { W[i] = 0; LT[i] = 0; i = i + 1; y = y + 1; }
  }
  if (hasB == 1) {
    while (y < tB) { W[i] = deep; LT[i] = 0; i = i + 1; y = y + 1; }
    W[i] = topS; LT[i] = 0; i = i + 1; y = y + 1;
    e = ce - 1;
    while (y <= e) { W[i] = 0; LT[i] = 0; i = i + 1; y = y + 1; }
  }
  e = UH - 3;
  while (y <= e) { W[i] = roof; LT[i] = 0; i = i + 1; y = y + 1; }
  if (rnd() < 0.5) { W[i] = 6; } else { W[i] = roof; }
  LT[i] = 0; i = i + 1; y = y + 1;
  while (y < WY) { W[i] = 6; LT[i] = 0; i = i + 1; y = y + 1; }
}
// what grows and lies in a chunk of the cavern world
function featuresU1(cx, cz) {
  chunkSeed(cx, cz, 6);
  springs(48, 22, 35, 12, 60);
  chunkSeed(cx, cz, 2);
  veins(51, 6, 3, 7, 14, 54);
  veins(I_oreQuartz, 8, 4, 10, 10, 58); veins(I_oreAshGold, 5, 4, 10, 10, 58);
  veins(I_blackrock, 2, 20, 40, 10, 54);
  // the ground of every column: the forests' fungus trees (where there is room over them), roots and
  // sprouts; the valleys' bones and blue fire; the deltas' basalt stumps
  let lx = 0;
  while (lx < 16) {
    let lz = 0;
    while (lz < 16) {
      let x = gx0 + lx, z = gz0 + lz, ci = wcol(x, z), y = HMAP[ci], bi = BIOM[ci], i = wi(x, y, z), r = rnd();
      if (y > 12 && y < UH - 6) { if (W[i + 1] == 0) {
        if (bi == 22 || bi == 23) {
          if (W[i] == I_emberMoss || W[i] == I_indigoMoss) {
            if (r < 0.035 && lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) { if (roomOver(i, 13) == 1) { growTreeKind(x, y, z, 6 + bi - 22); } }
            else {
              if (r < 0.2) { if (bi == 22) { W[i + 1] = I_emberRoots; } else { W[i + 1] = I_indigoRoots; } }
              else { if (r < 0.24) { if (bi == 23) { W[i + 1] = I_indigoSapling; } else { W[i + 1] = I_emberSapling; } } else { if (r < 0.3) { if (bi == 23) { W[i + 1] = I_ashSprouts; } } } }
            }
          }
        }
        if (bi == 24) {
          if (r < 0.006) { if (roomOver(i, 6) == 1) { fossilAsh(x, y + 1, z); } }
          else { if (r < 0.02) { W[i + 1] = I_wailFire; } }
        }
        if (bi == 25) { if (r < 0.04) { let h = rndI(1, 3), k = 1; while (k <= h) { if (W[i + k] == 0) { W[i + k] = 53; } k = k + 1; } } }
      } }
      // vines hanging from the roof of the forests
      if (bi == 22 || bi == 23) {
        if (rnd() < 0.04) {
          let yy = UH - 3;
          while (yy > y + 4 && W[wi(x, yy, z)] != 0) { yy = yy - 1; }
          if (yy > y + 4) { let n = rndI(2, 8), vb = I_emberVines; if (bi == 23) { vb = I_indigoVines; } while (n > 0 && yy > y + 2 && W[wi(x, yy, z)] == 0) { W[wi(x, yy, z)] = vb; yy = yy - 1; n = n - 1; } }
        }
      }
      lz = lz + 1;
    }
    lx = lx + 1;
  }
  // the shelves over the ground: a few tries a chunk find a top by looking down, and put there what its
  // ground grows
  let k = 0;
  while (k < 26) {
    let x = gx0 + rndI(0, 15), z = gz0 + rndI(0, 15), y = rndI(24, 50), i = wi(x, y, z), n = 0;
    while (n < 10 && W[i] == 0) { i = i - 1; n = n + 1; }
    if (n > 0 && n < 10) {
      let g = W[i];
      if (g == I_emberMoss) { if (rnd() < 0.7) { W[i + 1] = I_emberRoots; } else { W[i + 1] = I_emberSapling; } }
      if (g == I_indigoMoss) { if (rnd() < 0.6) { W[i + 1] = I_indigoRoots; } else { W[i + 1] = I_ashSprouts; } }
      if (g == I_wailSand || g == I_wailSoil) { if (rnd() < 0.3) { W[i + 1] = I_wailFire; } }
    }
    k = k + 1;
  }
  featuresBastion(cx, cz);
  chunkSeed(cx, cz, 5);
  // the ashen debris, deep and rare (whatever is round it)
  veins(59, 1.6, 1, 3, 8, 22);
  veins(49, 3, 10, 20, 12, 30);
  // glowing crystals: under the roof, and under the shelves and the hanging rock
  k = rndI(1, 3);
  while (k > 0) {
    let x = gx0 + rndI(2, 13), z = gz0 + rndI(2, 13), y = UH - 3;
    while (y > 20 && W[wi(x, y, z)] != 0) { y = y - 1; }
    if (y > 20) { if (W[wi(x, y + 1, z)] == 48) { genBlob(x, y, z, 50, rndI(5, 14), 0 - 1); } }
    k = k - 1;
  }
  k = rndI(1, 3);
  while (k > 0) {
    let x = gx0 + rndI(2, 13), z = gz0 + rndI(2, 13), y = rndI(24, 52), i = wi(x, y, z), n = 0;
    // (from inside the rock down to the first open cell)
    if (W[i] != 0) {
      while (n < 10 && W[i] != 0 && y > 15) { i = i - 1; y = y - 1; n = n + 1; }
      if (W[i] == 0 && W[i + 1] == 48) { genBlob(x, y, z, 50, rndI(4, 10), 0 - 1); }
    }
    k = k - 1;
  }
  // the fort lines that cross this chunk
  let a = 0;
  while (a < 16) {
    if (fortX(gz0 + a) == 1) { fortRun(gx0, gz0 + a, 1, 0); }
    if (fortZ(gx0 + a) == 1) { fortRun(gx0 + a, gz0, 0, 1); }
    a = a + 1;
  }
}
// are the n cells over cell i open
function roomOver(i, n) {
  let k = 1, r = 1;
  while (k <= n) { if (W[i + k] != 0) { r = 0; k = n; } k = k + 1; }
  return r;
}
// (genVer 0: the land as it was before v3.2)
function genColumnU0(x, z) {
  let f = 14 + Math.floor(fbm3(x - (0 - 911), z - (0 - 377), 32) * 7);
  let c = 47 + Math.floor(fbm3(x - (0 - 5531), z - (0 - 2711), 28) * 7);
  // pillars from floor to ceiling, and wider walls of the caverns
  let pl = noise2(x - (0 - 1777), z - (0 - 913), 11);
  let wall = fbm3(x - (0 - 3313), z - (0 - 7177), 40);
  if (pl > 0.62 || wall > 0.42) { f = c; }
  let sand = noise2(x - (0 - 333), z - (0 - 6667), 14);
  let bas = noise2(x - (0 - 4441), z - (0 - 1123), 9);
  let ci = wcol(x, z);
  ashBiome(x, z);
  HMAP[ci] = f; BIOM[ci] = abm;
  // the ground of each part of the depths: moss of the two forests, the wailing sand of the
  // valleys, basalt and black rock of the deltas
  let top = 48, under = 48;
  if (abm == 22) { top = I_emberMoss; } if (abm == 23) { top = I_indigoMoss; }
  if (abm == 24) { top = I_wailSand; under = I_wailSoil; if (sand > 0) { top = I_wailSoil; } }
  if (abm == 25) { top = 53; under = I_blackrock; if (bas > 0.2) { top = I_blackrock; } if (sand > 0.45) { top = I_magma; } }
  let y = 0, v = 0, i = (ci - 1) * WY + 1;
  while (y < WY) {
    v = 0;
    if (y <= f) { v = 48; if (y >= f - 3) { v = under; } if (y == f) { v = top; if (abm == 9) { if (sand > 0.3) { v = 49; } } } if (bas > 0.6) { v = 53; } }
    if (y >= c) { v = 48; if (bas > 0.6) { v = 53; } if (abm == 25) { if (bas > 0) { v = I_blackrock; } } }
    if (v == 0) { if (y <= 12) { v = 35; } }
    if (y == 0 || y >= UH - 1) { v = 6; }
    if (y == 1 || y == UH - 2) { if (rnd() < 0.5) { v = 6; } }
    W[i] = v; LT[i] = 0;
    y = y + 1; i = i + 1;
  }
}
// a fort bridge runs along a line every 80 blocks (x lines and z lines), where the noise says a
// fort stands; where two meet there is a room with chests
function fortX(z) {
  let r = 0;
  if (mod(z, 80) == 40) { M_inoise(0, idiv(z, 80) * 37 - (0 - 4021), 3); if (nI > 0 - 200) { r = 1; } }
  return r;
}
function fortZ(x) {
  let r = 0;
  if (mod(x, 80) == 40) { M_inoise(idiv(x, 80) * 37 - (0 - 811), 0, 3); if (nI > 0 - 200) { r = 1; } }
  return r;
}
// the part of the depths a column is in: abm (9 wastes, 22 ember forest, 23 indigo forest,
// 24 wailing valley, 25 basalt deltas)
let abm = 9;
function ashBiome(x, z) {
  let a = noise2(x - (0 - 7001), z - (0 - 3331), 70), b = noise2(x - (0 - 1203), z - (0 - 9907), 64);
  abm = 9;
  if (a > 0.25) { abm = 22; if (b > 0.2) { abm = 23; } }
  if (a < -0.3) { abm = 24; if (b > 0.25) { abm = 25; } }
}
function featuresU0(cx, cz) {
  // (v2.3.2) lava falls from the walls and the roof of the depths
  chunkSeed(cx, cz, 6);
  springs(48, 12, 35, 12, 60);
  chunkSeed(cx, cz, 2);
  veins(51, 6, 3, 7, 14, 50);
  veins(I_oreQuartz, 8, 4, 10, 10, 54); veins(I_oreAshGold, 5, 4, 10, 10, 54);
  veins(I_blackrock, 2, 20, 40, 10, 50);
  // the forests, the valleys and the deltas: what grows and lies on their floor
  let lx = 0;
  while (lx < 16) {
    let lz = 0;
    while (lz < 16) {
      let x = gx0 + lx, z = gz0 + lz, ci = wcol(x, z), y = HMAP[ci], bi = BIOM[ci], i = wi(x, y, z), r = rnd();
      if (y > 13 && y < UH - 6) { if (W[i + 1] == 0) {
        if (bi == 22 || bi == 23) {
          let inner = 0;
          if (lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) { inner = 1; }
          if (r < 0.03 && inner == 1) { growTreeKind(x, y, z, 6 + bi - 22); }
          else {
            if (r < 0.2) { if (bi == 22) { W[i + 1] = I_emberRoots; } else { W[i + 1] = I_indigoRoots; } }
            else { if (r < 0.24) { W[i + 1] = I_emberSapling + (bi - 22) * 0; if (bi == 23) { W[i + 1] = I_indigoSapling; } } else { if (r < 0.3) { if (bi == 23) { W[i + 1] = I_ashSprouts; } } } }
          }
        }
        if (bi == 24) {
          if (r < 0.006) { fossilAsh(x, y + 1, z); }
          else { if (r < 0.02) { W[i + 1] = I_wailFire; } }
        }
        if (bi == 25) { if (r < 0.05) { let h = rndI(1, 4), k = 1; while (k <= h) { W[i + k] = 53; k = k + 1; } } }
      } }
      // vines hanging from the ceiling of the forests
      if (bi == 22 || bi == 23) {
        if (rnd() < 0.03) {
          let yy = UH - 3;
          while (yy > y + 4 && W[wi(x, yy, z)] != 0) { yy = yy - 1; }
          if (yy > y + 4) { let n = rndI(2, 7), vb = I_emberVines; if (bi == 23) { vb = I_indigoVines; } while (n > 0 && yy > y + 2) { W[wi(x, yy, z)] = vb; yy = yy - 1; n = n - 1; } }
        }
      }
      lz = lz + 1;
    }
    lx = lx + 1;
  }
  featuresBastion(cx, cz);
  chunkSeed(cx, cz, 5);
  // the ashen debris, deep and rare (whatever is round it)
  veins(59, 1.6, 1, 3, 8, 22);
  veins(49, 3, 10, 20, 12, 30);
  // glowing crystals hanging from the ceiling
  let k = rndI(1, 3);
  while (k > 0) {
    let x = gx0 + rndI(2, 13), z = gz0 + rndI(2, 13), y = UH - 3;
    while (y > 20 && W[wi(x, y, z)] != 0) { y = y - 1; }
    if (y > 20) { if (W[wi(x, y + 1, z)] == 48) { genBlob(x, y, z, 50, rndI(5, 14), 0 - 1); } }
    k = k - 1;
  }
  // the fort lines that cross this chunk
  let a = 0;
  while (a < 16) {
    if (fortX(gz0 + a) == 1) { fortRun(gx0, gz0 + a, 1, 0); }
    if (fortZ(gx0 + a) == 1) { fortRun(gx0 + a, gz0, 0, 1); }
    a = a + 1;
  }
}
// a crystal blob grows down (dir -1) from where it hangs
function genBlob(x, y, z, b, n, dir) {
  let k = 0, d = 0;
  while (k < n) {
    if (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1 && y > 1 && y < UH - 1) {
      let i = wi(x, y, z);
      if (W[i] == 0) { W[i] = b; }
    }
    d = rndI(0, 4);
    if (d == 0) { x = x + 1; } if (d == 1) { x = x - 1; } if (d == 2) { y = y + dir; } if (d == 3) { z = z + 1; } if (d == 4) { z = z - 1; }
    k = k + 1;
  }
}
// 16 blocks of a bridge along (dx, dz) through (x, z): a floor at FORTY, low walls, a pillar down
// to the ground every 8 blocks, and a room where it crosses another line
function fortRun(x, z, dx, dz) {
  let t = 0, s = 0, y = 0, wx = 0, wz = 0, b = 0;
  while (t < 16) {
    let ax = x + dx * t, az = z + dz * t;
    let cross = 0;
    if (dx == 1) { if (fortZ(ax) == 1) { cross = 1; } } else { if (fortX(az) == 1) { cross = 1; } }
    s = 0 - 2;
    while (s <= 2) {
      wx = ax + dz * s; wz = az + dx * s;
      if (wx >= gx0 && wx <= gx1 && wz >= gz0 && wz <= gz1) {
        // floor; walls on the sides (lower where the room is)
        fortSet(wx, FORTY, wz, 52);
        y = FORTY + 1;
        while (y <= FORTY + 4) {
          b = 0;
          if (s == 0 - 2 || s == 2) { if (y <= FORTY + 1) { b = 52; } if (cross == 1) { b = 0; } }
          if (y == FORTY + 4) { if (cross == 0) { b = 52; } }
          fortSet(wx, y, wz, b);
          y = y + 1;
        }
        // pillars down to the ground
        if (mod(ax * dx + az * dz, 8) == 0) { if (s == 0 - 2 || s == 2) {
          y = FORTY - 1;
          while (y > 1) { let i = wi(wx, y, wz); if (W[i] == 48 || W[i] == 49 || W[i] == 53) { y = 0; } else { W[i] = 52; y = y - 1; } }
        } }
      }
      s = s + 1;
    }
    // the room: a chest in each corner of the crossing
    if (cross == 1) {
      if (s == 3) {
        let cxs = ax + dz * 2 - dx * 0, czs = az + dx * 2;
        if (cxs >= gx0 && cxs <= gx1 && czs >= gz0 && czs <= gz1) { fortSet(cxs, FORTY + 1, czs, 37); let spx = ax - dz * 0, spz = az; if (spx >= gx0 && spx <= gx1 && spz >= gz0 && spz <= gz1) { W[wi(spx, FORTY + 1, spz)] = I_spawner_flameSpirit; spawnerNote(spx, FORTY + 1, spz); } }
      }
    }
    t = t + 1;
  }
}
function fortSet(x, y, z, b) {
  let i = wi(x, y, z);
  if (W[i] != 6) { W[i] = b; }
}

// ---------------------------------------------------------------- the void
// the island top and bottom of a column (vTop < vBot: none); (v3.2) and of a small island over or
// under it (vTop2 < vBot2: none)
let vTop = 0, vBot = 0, vTop2 = 0 - 1, vBot2 = 0;
// (v3.2) Two lands, as the depths: genVer 0 keeps voidIsland0 (the land before v3.2).
function voidIsland(x, z) { vTop2 = 0 - 1; vBot2 = 0; if (genVer == 0) { voidIsland0(x, z); } else { voidIsland1(x, z); } }
// The void of genVer 1, in whole numbers:
// - the warden's island: about 72 across to its ragged edge (63..81), its top at 40 in the middle and
//   gently uneven away from it; underneath it tapers from 29 deep in the middle to a thin rim, with
//   hanging spikes,
// - then nothing out to about 330,
// - then the outer land: many islands of all sizes from a broad field (few and small where the ring
//   begins), each flat on top at a height of its own (28..48, changing slowly from place to place), thick
//   in the middle and ragged underneath; and small floating islands at any height between and over them
//   (one in some cells of a 22-block grid: 2 to 6 across, a cone underneath).
function voidIsland1(x, z) {
  vTop = 0 - 1; vBot = 0;
  let d2 = x * x - (0 - z * z);
  if (d2 < 8100) {
    inoise(x - (0 - 6011), z - (0 - 913), 26); let e1 = nI;
    let rr = 72 - (0 - idiv(e1 * 9, 1024));
    if (d2 < rr * rr) {
      inoise(x - (0 - 2203), z - (0 - 517), 9); let e2 = nI;
      inoise(x - (0 - 4421), z - (0 - 8111), 5); let e3 = nI;
      let k2 = idiv(d2 * 1024, rr * rr);
      vTop = 40;
      if (d2 > 100) { vTop = 40 - (0 - idiv((e2 - (0 - e1)) * Math.min(700, d2 - 100), 490000)); }
      let dep = 3 - (0 - idiv((1024 - k2) * 26, 1024)) - (0 - idiv(e2 * 3, 1024));
      if (e3 > 450) { dep = dep - (0 - idiv((e3 - 450) * (1024 - k2), 60000)); }
      if (dep < 1) { dep = 1; }
      if (dep > 34) { dep = 34; }
      vBot = vTop - dep;
    }
  } else { if (d2 > 108900) {
    inoise(x - (0 - 911), z - (0 - 3001), 88); let n1 = nI;
    inoise(x - (0 - 7919), z - (0 - 1237), 31); let n2 = nI;
    inoise(x - (0 - 3011), z - (0 - 9173), 11); let n3 = nI;
    let n = idiv(n1 * 4 - (0 - n2 * 2) - (0 - n3), 7), thr = 120;
    if (d2 < 176400) { thr = 120 - (0 - idiv(176400 - d2, 120)); }
    if (n > thr) {
      inoise(x - (0 - 2203), z - (0 - 517), 150); let hq = nI;
      let t = n - thr;
      vTop = 38 - (0 - idiv(hq * 10, 1024));
      if (n3 > 350) { if (t > 40) { vTop = vTop - (0 - 1); } }
      let od = Math.min(26, 2 - (0 - idiv(t, 12))) - (0 - idiv(n3 * 2, 1024));
      if (t > 100) { inoise(x - (0 - 4421), z - (0 - 8111), 5); if (nI > 450) { od = od - (0 - idiv((nI - 450) * Math.min(t, 400), 30000)); } }
      if (od < 1) { od = 1; }
      vBot = vTop - od;
    }
    // a small island of this grid cell
    // (the cell's numbers from the world's shuffled table, as the noise's: 0..255 each)
    let gx = idiv(x, 22), gz = idiv(z, 22);
    let h = PERM[PERM[mod(gx, 256) + 1] + mod(gz, 256) + 1];
    if (h < 72) {
      let h2 = PERM[PERM[mod(gz - (0 - 77), 256) + 1] + mod(gx, 256) + 1];
      let r = 2 - (0 - mod(h, 5)), ox = gx * 22 - (0 - 6) - (0 - mod(h2, 10)), oz = gz * 22 - (0 - 6) - (0 - mod(idiv(h2, 10), 10));
      let q = (x - ox) * (x - ox) - (0 - (z - oz) * (z - oz)), r2 = r * r - (0 - 1);
      if (q <= r2) {
        let t2 = 28 - (0 - mod(h2 * 7 - (0 - h), 34)), dp = 1 - (0 - idiv((r2 - q) * (r - (0 - 2)), r2));
        // (not into the island of this column)
        if (vTop < 0 || t2 - dp > vTop - (0 - 3) || t2 < vBot - 3) { vTop2 = t2; vBot2 = t2 - dp - (0 - 1); }
      }
    }
  } }
}
function voidIsland0(x, z) {
  vTop = 0 - 1; vBot = 0;
  let d = Math.sqrt(x * x + z * z);
  let e = fbm3(x - (0 - 6011), z - (0 - 913), 20);
  if (d < 62 + e * 10) {
    let k = d / (62 + e * 10);
    vTop = 40 + Math.floor(e * 2);
    vBot = Math.floor(40 - (1 - k * k) * 26 - e * 3);
  } else {
    if (d > 380) {
      let n = fbm3(x - (0 - 911), z - (0 - 3001), 56);
      if (n > 0.18) {
        let h = (n - 0.18) * 60;
        vTop = 36 + Math.floor(e * 4);
        vBot = Math.floor(vTop - h);
      }
    }
  }
}
function genColumnV(x, z) {
  voidIsland(x, z);
  let ci = wcol(x, z), hm = vTop;
  if (vTop2 > hm) { hm = vTop2; }
  HMAP[ci] = hm; BIOM[ci] = 10;
  let y = 0, i = (ci - 1) * WY + 1;
  // ((v3.2) most columns of the void are empty: written without asking)
  if (hm < 0) { while (y < WY) { W[i] = 0; LT[i] = 0; y = y + 1; i = i + 1; } }
  else {
    // (the one or two runs of stone, the lower first)
    let l0 = vBot, h0 = vTop, l1 = 0, h1 = 0 - 1;
    if (vTop < 0) { l0 = vBot2; h0 = vTop2; }
    else { if (vTop2 >= 0) { if (vBot2 > vTop) { l1 = vBot2; h1 = vTop2; } else { l0 = vBot2; h0 = vTop2; l1 = vBot; h1 = vTop; } } }
    while (y < l0) { W[i] = 0; LT[i] = 0; y = y + 1; i = i + 1; }
    while (y <= h0) { W[i] = 54; LT[i] = 0; y = y + 1; i = i + 1; }
    if (h1 >= 0) {
      while (y < l1) { W[i] = 0; LT[i] = 0; y = y + 1; i = i + 1; }
      while (y <= h1) { W[i] = 54; LT[i] = 0; y = y + 1; i = i + 1; }
    }
    while (y < WY) { W[i] = 0; LT[i] = 0; y = y + 1; i = i + 1; }
  }
}
// the eight pillars round the middle (an obsidian round tower each, a warding crystal on top)
function pillarAt(k) { pilX = Math.round(cosd(k * 45 + 10) * 34); pilZ = Math.round(sind(k * 45 + 10) * 34); pilH = 52 + mod(k * 5, 9); pilR = 2 + mod(k, 2); }
let pilX = 0, pilZ = 0, pilH = 0, pilR = 0;
function featuresV(cx, cz) {
  chunkSeed(cx, cz, 2);
  let k = 0;
  while (k < 8) {
    pillarAt(k);
    if (pilX + pilR >= gx0 && pilX - pilR <= gx1 && pilZ + pilR >= gz0 && pilZ - pilR <= gz1) {
      let a = pilX - pilR;
      while (a <= pilX + pilR) {
        let c = pilZ - pilR;
        while (c <= pilZ + pilR) {
          if (a >= gx0 && a <= gx1 && c >= gz0 && c <= gz1) { if ((a - pilX) * (a - pilX) + (c - pilZ) * (c - pilZ) <= pilR * pilR + 1) {
            let y = 30;
            while (y <= pilH) { W[wi(a, y, c)] = 34; y = y + 1; }
          } }
          c = c + 1;
        }
        a = a + 1;
      }
      if (pilX >= gx0 && pilX <= gx1 && pilZ >= gz0 && pilZ <= gz1) { if (bossDead == 0) { W[wi(pilX, pilH + 1, pilZ)] = 57; } }
    }
    k = k + 1;
  }
  // the way home, once the warden is gone
  if (bossDead == 1) { gateAt(0, 41, 0, 0); }
  // the far gate once the warden is gone, the cities on the far islands
  featuresFarGate();
  featuresCity(cx, cz);
  if (genVer == 1) { voidSpires(cx, cz); }
}
// (v3.2) on the outer islands: spires of void stone, a glowing rod on their tip (a few in some chunks;
// not where a city stands)
function voidSpires(cx, cz) {
  if (cx * cx - (0 - cz * cz) > 400) { if (cityIn(cx, cz) == 0) {
    chunkSeed(cx, cz, 9);
    let k = rndI(0, 3) - 1;
    while (k > 0) {
      let x = gx0 + rndI(2, 13), z = gz0 + rndI(2, 13), y = HMAP[wcol(x, z)];
      if (y > 20 && y < WY - 20) {
        let i = wi(x, y, z);
        if (W[i] == 54 && W[i + 1] == 0) {
          let h = rndI(5, 13), j = 1, f = idiv(h, 3);
          while (j <= h) { W[i + j] = 54; j = j + 1; }
          W[i + h + 1] = I_voidRod;
          // its foot: the four cells round it, a third as high
          j = 1;
          while (j <= f) {
            if (W[i + SXS + j] == 0) { W[i + SXS + j] = 54; } if (W[i - SXS + j] == 0) { W[i - SXS + j] = 54; }
            if (W[i + WY + j] == 0) { W[i + WY + j] = 54; } if (W[i - WY + j] == 0) { W[i - WY + j] = 54; }
            j = j + 1;
          }
        }
      }
      k = k - 1;
    }
  } }
}
// a 3 x 3 floor of gate (in this chunk only)
function gateAt(x, y, z, b) {
  let a = x - 1;
  while (a <= x + 1) {
    let c = z - 1;
    while (c <= z + 1) { if (a >= gx0 && a <= gx1 && c >= gz0 && c <= gz1) { W[wi(a, y, c)] = 56; } c = c + 1; }
    a = a + 1;
  }
}
// a hollow tower of void bricks with a chest at the top
function towerAt(x, y, z, h) {
  let k = 0, a = 0, c = 0, b = 0;
  while (k <= h) {
    a = 0 - 2;
    while (a <= 2) {
      c = 0 - 2;
      while (c <= 2) {
        b = 0;
        if (Math.abs(a) == 2 || Math.abs(c) == 2) { b = 55; if (k == 2 || k == 3) { if (a == 0 || c == 0) { b = 0; } } }
        if (k == 0 || k == h) { b = 55; }
        if (k == h - 4) { if (Math.abs(a) < 2 && Math.abs(c) < 2) { b = 55; } }
        if (y + k < WY - 1) { W[wi(x + a, y + k, z + c)] = b; }
        c = c + 1;
      }
      a = a + 1;
    }
    k = k + 1;
  }
  if (y + h - 3 < WY - 1) { W[wi(x, y + h - 3, z)] = 37; }
  if (y + 1 < WY - 1) { W[wi(x, y + 1, z)] = 27; }
}

// ---------------------------------------------------------------- the sky of each world
let dimAmb = 0;
function dimSky() {
  if (dim == 1) {
    dark = 0; dimAmb = 12; starA = 0;
    skyHex = '#300c08'; skyMidHex = '#401008'; voidHex = '#200604';
    fogTarget(96, 34, 22);
  }
  if (dim == 2) {
    dark = 4; dimAmb = 8; starA = 1;
    skyHex = '#0e0a18'; skyMidHex = '#140e22'; voidHex = '#08060e'; starHex = '#d8d0f0';
    fogTarget(22, 16, 34);
  }
}
function fogTarget(r, g, b) {
  if (Math.abs(r - fogR) + Math.abs(g - fogG) + Math.abs(b - fogB) > 6) {
    if (ctPos >= NCOL * 192) { fogR = r; fogG = g; fogB = b; fogHex = rgb(r, g, b); ctPos = 0; }
  }
  if (ctPos < NCOL * 192) { ctBuild(Math.min(4000, NCOL * 192 - ctPos)); }
}

// ---------------------------------------------------------------- gates
// the fire veil: an obsidian frame (inside 2..21 wide, 3..21 high) lit inside with the igniter
let gateOK = 0;
function lightGate(x, y, z) {
  gateOK = 0;
  if (dim != 2) {
    tryFrame(x, y, z, 1, 0);
    if (gateOK == 0) { tryFrame(x, y, z, 0, 1); }
  }
}
function tryFrame(x, y, z, dx, dz) {
  let yb = y, k = 0;
  while (k < 22 && blockAt(x, yb - 1, z) == 0) { yb = yb - 1; k = k + 1; }
  if (blockAt(x, yb - 1, z) == 34) {
    let l = 0, r = 0;
    k = 0; while (k < 22 && blockAt(x - dx * (l + 1), yb, z - dz * (l + 1)) == 0) { l = l + 1; k = k + 1; }
    k = 0; while (k < 22 && blockAt(x + dx * (r + 1), yb, z + dz * (r + 1)) == 0) { r = r + 1; k = k + 1; }
    let w = l + r + 1, x0 = x - dx * l, z0 = z - dz * l;
    let h = 0;
    k = 0; while (k < 22 && blockAt(x0, yb + h, z0) == 0) { h = h + 1; k = k + 1; }
    if (w >= 2 && w <= 21 && h >= 3 && h <= 21) {
      // every frame block, and nothing inside
      let ok = 1, a = 0 - 1, b = 0;
      while (a <= w) {
        b = 0 - 1;
        while (b <= h) {
          let bx = x0 + dx * a, bz = z0 + dz * a, bk = blockAt(bx, yb + b, bz);
          let edge = 0;
          if (a == 0 - 1 || a == w) { edge = 1; } if (b == 0 - 1 || b == h) { edge = edge + 2; }
          if (edge == 0) { if (bk != 0) { ok = 0; } }
          if (edge == 1 || edge == 2) { if (bk != 34) { ok = 0; } }
          b = b + 1;
        }
        a = a + 1;
      }
      if (ok == 1) {
        a = 0;
        while (a < w) { b = 0; while (b < h) { setBlock(x0 + dx * a, yb + b, z0 + dz * a, 47); b = b + 1; } a = a + 1; }
        gateOK = 1;
      }
    }
  }
}
// the veil goes when its frame is broken: every veil cell joined to (x, y, z)
let veilN = 0;
function veilBreak(x, y, z) {
  if (veilN < 500) {
    if (blockAt(x, y, z) == 47) {
      veilN = veilN + 1;
      setBlock(x, y, z, 0);
      veilBreak(x + 1, y, z); veilBreak(x - 1, y, z); veilBreak(x, y + 1, z); veilBreak(x, y - 1, z); veilBreak(x, y, z + 1); veilBreak(x, y, z - 1);
    }
  }
}

// ---------------------------------------------------------------- travel between worlds
// gState 3: the new world's chunks round the player are made, then the player is put down
let travelTo = 0, travelKind = 0, gateT = 0, gateCool = 0;
function startTravel(nd, x, z, kind) {
  // ((v3.0) the tamed of the world left are kept for when the player comes back)
  if (kind <= 5) { petsPack(); }
  // ((v3.0, 11-18) on a server my mobs to the others near them first (they went with the world))
  netMobsLeave();
  let s = 1;
  while (s <= NCH * NCH) { if (CKST[s] > 0) { chunkDrop(s); } s = s + 1; }
  thingsInit(); fluidInit();
  dim = nd; travelKind = kind;
  px = x; pz = z; py = 40; pvx = 0; pvy = 0; pvz = 0; flying = 0;
  pcxW = -99999; pczW = -99999;
  ltkDark = 0 - 1;
  fogR = 0 - 99; ctPos = NCOL * 192;
  gState = 3; genN = 0;
  uiMode = 0; txClear();
  setView(viewWant);
}
function travelFrame() {
  chunkWork(40);
  genN = nChunks / NSTART;
  eraseAll();
  dirtBack(10);
  let t = '잿빛 심연으로 가는 중';
  if (dim == 0) { t = '지상으로 돌아가는 중'; }
  if (dim == 2) { t = '공허의 섬으로 가는 중'; }
  if (travelKind == 6) { t = '세계를 불러오는 중'; }
  if (travelKind == 7) { t = `${shName}에 접속하는 중`; }
  tx(1, t, 0, 30, 12, '#ffffff', 0);
  box(-101, -13, 101, -23, '#000000');
  box(-100, -14, -100 + 200 * Math.min(1, genN), -22, '#c070ff');
  fillStop();
  if (nChunks >= NSTART) { arrive(); }
}
// where to stand: a fire gate near (kind 1), the void's landing, or the overworld's spawn
function arrive() {
  let x = Math.floor(px), z = Math.floor(pz);
  if (travelKind == 1) {
    findVeil(x, z);
    if (veilY < 0) { makeGateNear(x, z); findVeil(x, z); }
    px = veilX + 0.5; pz = veilZ + 0.5; py = veilY; gateCool = 1;
  }
  if (travelKind == 2) {
    // the edge of the warden's island, facing the middle
    findTop(0, 0 - 48);
    px = 0.5; pz = 0 - 47.5; py = topY + 1; yaw = 0;
    // ((v3.2) on a server bossStep makes it, once no other screen has it)
    if (bossDead == 0 && netSrv == 0) { bossSpawn(); }
  }
  if (travelKind == 3) { if (spawnSet == 0) { findSpawn(); } px = spawnX; py = spawnY; pz = spawnZ; respawn0(); }
  if (travelKind == 4 || travelKind == 5) { farArrive(); }
  if (travelKind == 6) { arriveKept(); }
  if (travelKind == 7) { netArrive(); }
  if (travelKind <= 5) { petsRestore(); }
  fallTop = py; gateCool = 1;
  gState = 2; txClear();
  lockReq();
  if (dim == 1) { msgShow('잿빛 심연', 3); }
  if (dim == 2) { if (travelKind == 2) { msgShow('공허의 섬 - 수호 수정을 부수고 공허의 수호자를 쓰러뜨리세요', 5); } if (travelKind == 4) { msgShow('바깥 섬 - 보랏빛 도시를 찾아보세요', 5); } }
}
// a fire veil within 16 columns (its lowest cell)
let veilX = 0, veilY = 0 - 1, veilZ = 0;
function findVeil(x, z) {
  veilY = 0 - 1;
  let best = 9999, a = x - 16;
  while (a <= x + 16) {
    let c = z - 16;
    while (c <= z + 16) {
      if (cOK(a, c) == 1) {
        let i = wi(a, 1, c), y = 1;
        while (y < WY - 1) {
          if (W[i] == 47) { if (W[i - 1] != 47) { let d = (a - x) * (a - x) + (c - z) * (c - z); if (d < best) { best = d; veilX = a; veilY = y; veilZ = c; } } }
          y = y + 1; i = i + 1;
        }
      }
      c = c + 1;
    }
    a = a + 1;
  }
}
// no gate there yet: a frame with its veil on the nearest floor (a ledge of stone when there is
// none), and room cut round it
function makeGateNear(x, z) {
  let y = 0 - 1, a = 0, best = 9999;
  // a floor: an empty cell above something solid, with four cells of room above it
  let r = 0;
  while (r <= 12 && y < 0) {
    a = 0;
    while (a < 12 && y < 0) {
      let tx = Math.floor(x + sind(a * 30) * r), tz = Math.floor(z + cosd(a * 30) * r), ty = 16;
      while (ty < UH - 6 && y < 0) {
        if (BSOL[blockAt(tx, ty - 1, tz) + 1] == 1 && blockAt(tx, ty - 1, tz) != 35) {
          if (blockAt(tx, ty, tz) == 0 && blockAt(tx, ty + 1, tz) == 0 && blockAt(tx, ty + 2, tz) == 0 && blockAt(tx, ty + 3, tz) == 0) { y = ty; x = tx; z = tz; }
        }
        ty = ty + 1;
      }
      a = a + 1;
    }
    r = r + 3;
  }
  if (y < 0) { y = 30; }
  // room and a ledge under it
  let i = 0 - 1, j = 0, k = 0;
  while (i <= 2) {
    j = 0 - 2;
    while (j <= 2) {
      k = 0;
      while (k <= 4) { setBlock(x + i, y + k, z + j, 0); k = k + 1; }
      if (BSOL[blockAt(x + i, y - 1, z + j) + 1] == 0) { setBlock(x + i, y - 1, z + j, 48); }
      j = j + 1;
    }
    i = i + 1;
  }
  // the frame (4 x 5 along x) and the veil
  i = 0 - 1;
  while (i <= 2) {
    k = 0 - 1;
    while (k <= 3) {
      if (i == 0 - 1 || i == 2 || k == 0 - 1 || k == 3) { setBlock(x + i, y + k, z, 34); } else { setBlock(x + i, y + k, z, 47); }
      k = k + 1;
    }
    i = i + 1;
  }
  worldFlush();
}
// in the veil / on a void gate long enough: off to the other world
function gateStep(dt) {
  let b0 = blockAt(Math.floor(px), Math.floor(py + 0.2), Math.floor(pz)), b1 = blockAt(Math.floor(px), Math.floor(py + 1.2), Math.floor(pz));
  let inV = 0, onG = 0;
  if (b0 == 47 || b1 == 47) { inV = 1; }
  let onF = 0;
  if (b0 == 63 || b1 == 63) { onF = 1; }
  if (b0 == 56 || blockAt(Math.floor(px), Math.floor(py - 0.2), Math.floor(pz)) == 56) { onG = 1; }
  if (inV + onG + onF == 0) { gateCool = 0; gateT = 0; }
  else {
    if (gateCool == 0) {
      gateT = gateT + dt;
      let need = 2.5;
      if (gameMode == 1 || onG == 1 || onF == 1) { need = 0.4; }
      if (gateT >= need) {
        gateT = 0;
        if (onF == 1) { farGateGo(); } else { if (inV == 1) {
          if (dim == 0) { startTravel(1, Math.floor(px / 8) + 0.5, Math.floor(pz / 8) + 0.5, 1); }
          else { startTravel(0, Math.floor(px) * 8 + 0.5, Math.floor(pz) * 8 + 0.5, 1); }
        } else {
          if (dim == 2) { startTravel(0, spawnX, spawnZ, 3); } else { startTravel(2, 0.5, 0 - 47.5, 2); }
        } }
      }
    }
  }
}
// the void key: a 3 x 3 gate on the floor in front (the overworld and the depths)
function useVoidKey() {
  if (dim != 2) {
    if (pickOn == 1) {
      let x = pickX, y = pickY, z = pickZ, a = x - 1, ok = 1;
      while (a <= x + 1) { let c = z - 1; while (c <= z + 1) { if (BSOL[blockAt(a, y, c) + 1] == 0) { ok = 0; } c = c + 1; } a = a + 1; }
      if (ok == 1) {
        a = x - 1;
        while (a <= x + 1) { let c = z - 1; while (c <= z + 1) { setBlock(a, y, c, 56); c = c + 1; } a = a + 1; }
        if (mod(gameMode, 2) == 0) { takeHeld(1); }
        msgShow('공허 관문이 열렸습니다. 올라서면 공허의 섬으로 갑니다', 4);
      } else { msgShow('공허 관문은 3 x 3 평평한 바닥에 놓아야 합니다', 3); }
    }
  } else { msgShow('공허 안에서는 쓸 수 없습니다', 2); }
}

// ---------------------------------------------------------------- the warden of the void
// While any warding crystal stands on the pillars, the warden sleeps: it only circles the
// island, and nothing hurts it. The last crystal broken, it wakes: it circles, dives at the
// player, and every other turn lands on the middle of the island for a while (then it can be
// hit freely). Killed: its heart drops and the gate home opens in the middle of the island.
// (v3.2) On a server there is one warden for everyone in the void: it is a mob like the others
// (netmob.js: one owner runs it, the rest see it from the owner's line and their blows go to the
// owner), with a number of its own (BOSSU) so two screens never make two. It goes for the nearest
// player. Its death is told to all ('W') and kept in the server's settings (shBoss): the gate home
// is there for whoever comes later, and the warden is not there again the next time.
let bossE = 0, bossPh = 0, bossT = 0, bossAng = 0, nCrystal = 8, bossN = 0, bossWake = 0, bossHold = 0, bossHP = 0;
function bossSpawn() {
  nmDet = 900000001;
  mobAdd(10, 0.5, 52, 0.5);
  nmDet = 0;
  bossE = lastMob; bossPh = 0; bossT = 0;
  // (the one that was here when its owner went away: as hurt as it was)
  if (bossE > 0) { if (bossHP > 0) { EHP[bossE] = bossHP; } }
}
function bossStep(dt) {
  if (bossDead == 0) {
    if (bossE > 0) { if (ET[bossE] != 10) { bossE = 0; } }
    if (bossE == 0) { let f = 1; while (f <= NMOB) { if (ET[f] == 10) { bossE = f; } f = f + 1; } }
    // (none: mine to make - on a server after a moment, when no other line has it)
    if (bossE == 0) { bossHold = bossHold + dt; if (netSrv == 0 || bossHold > 1.5) { if (nmTaken(900000001) == 0) { bossSpawn(); } } }
    else { bossHold = 0; }
    let e = bossE;
    if (e > 0) {
      bossHP = EHP[e];
      // the crystals still standing (a pillar in a chunk not made counts as standing)
      nCrystal = 0;
      let k = 0;
      while (k < 8) { pillarAt(k); if (cOK(pilX, pilZ) == 0) { nCrystal = nCrystal + 1; } else { if (blockAt(pilX, pilH + 1, pilZ) == 57) { nCrystal = nCrystal + 1; } } k = k + 1; }
      // the last crystal gone: it wakes (and circles a while first: time to come down)
      if (nCrystal == 0) { if (bossWake == 0) { bossWake = 1; msgShow('공허의 수호자가 깨어났습니다!', 4); } }
      if (ERK[e] == 0) { bossMove(e, dt); }
    }
  }
}
function bossMove(e, dt) {
  if (e > 0) {
    if (e > 0) {
      EHURT[e] = EHURT[e] - dt; EATK[e] = EATK[e] - dt;
      bossT = bossT + dt;
      let tx = 0, ty = 0, tz = 0, sp = 9, can = 1;
      if (nCrystal > 0) { bossPh = 0; bossT = 0 - 6; }
      // (the nearest player who can be hurt: tgK 0 me)
      mobTarget(e);
      if (tgK == 0) { if (mod(gameMode, 2) != 0 || dead != 0) { can = 0; } }
      if (bossPh == 0) {
        bossAng = bossAng + dt * 16;
        tx = cosd(bossAng) * 40; tz = sind(bossAng) * 40; ty = 52 + sind(bossT * 40) * 3;
        if (nCrystal == 0) { if (bossT > 6) { if (can == 1) {
          bossT = 0; bossN = bossN + 1;
          if (mod(bossN, 2) == 0) { bossPh = 2; } else { bossPh = 1; }
        } } }
      } else { if (bossPh == 1) {
        tx = tgX; ty = tgY + 1; tz = tgZ; sp = 15;
        if (bossT > 5) { bossPh = 0; bossT = 0; }
      } else {
        // landed on the middle of the island
        findTop(0, 0);
        tx = 0.5; ty = topY + 1; tz = 0.5; sp = 8;
        if (bossT > 9) { bossPh = 0; bossT = 0; }
      } }
      let dx = tx - EX[e], dy = ty - EY[e] - 1.5, dz = tz - EZ[e];
      if (bossPh == 2) { dy = ty - EY[e]; }
      let d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
      let f = Math.min(1, 2 * dt);
      if (bossPh == 2) { if (d < 1) { f = 1; sp = 0; } }
      EVX[e] = EVX[e] + (dx / d * sp - EVX[e]) * f;
      EVY[e] = EVY[e] + (dy / d * sp - EVY[e]) * f;
      EVZ[e] = EVZ[e] + (dz / d * sp - EVZ[e]) * f;
      EX[e] = EX[e] + EVX[e] * dt; EY[e] = EY[e] + EVY[e] * dt; EZ[e] = EZ[e] + EVZ[e] * dt;
      if (EY[e] < 30) { EY[e] = 30; }
      if (bossPh != 2) { EYAW[e] = atan2d(EVX[e], EVZ[e]); }
      EWALK[e] = EWALK[e] + dt * 2;
      // awake, it hits what it runs into (on the ground less often)
      if (nCrystal == 0) {
        let hx = px - EX[e], hy = py + 0.9 - EY[e] - 1.5, hz = pz - EZ[e];
        if (hx * hx + hy * hy + hz * hz < 9) { if (EATK[e] <= 0) {
          EATK[e] = 1.2;
          if (bossPh == 2) { EATK[e] = 2; }
          hurtM(MDMG[10], '공허의 수호자에게 당했습니다');
          let hl = Math.sqrt(hx * hx + hz * hz) + 0.01;
          pvx = pvx + hx / hl * 4; pvz = pvz + hz / hl * 4;
          if (bossPh == 1) { bossPh = 0; bossT = 0; }
        } }
        // ((v3.2) and the others of the server: the blow is told to them)
        let i = 1;
        while (i <= NPLN) {
          let pk = NPL[i], ox = NPX[pk] - EX[e], oy = NPY[pk] + 0.9 - EY[e] - 1.5, oz = NPZ[pk] - EZ[e];
          if (ox * ox + oy * oy + oz * oz < 9) { if (EATK[e] <= 0) {
            EATK[e] = 1.2;
            let ol = Math.sqrt(ox * ox + oz * oz) + 0.01;
            tgK = pk; netMobStrike(e, 10, ox / ol * 4, oz / ol * 4);
            if (bossPh == 1) { bossPh = 0; bossT = 0; }
          } }
          i = i + 1;
        }
      }
    }
  }
}
// (mobs.js mobHurt0, on its owner's screen)
function bossDies(e) {
  bossFall();
  if (netSrv > 0) { if (netSt == 2) { evAdd('W', ' '); if (netHost == 1) { shBoss = 1; metaWrite(netSrv); } } }
}
// it is gone, here and (heard: 'W') on every screen of the server
function bossFall() {
  if (bossDead == 0) {
    bossDead = 1; bossHP = 0;
    msgShow('공허의 수호자를 쓰러뜨렸습니다! 섬 가운데의 관문으로 집에 갈 수 있습니다', 8);
    if (dim == 2) {
      let f = 1;
      while (f <= NMOB) { if (ET[f] == 10) { if (ERK[f] > 0) { ET[f] = 0; ERK[f] = 0; } } f = f + 1; }
      // the gate home: 3 x 3 on the middle of the island
      findTop(0, 0);
      let y = topY + 1, a = 0 - 1;
      while (a <= 1) { let c = 0 - 1; while (c <= 1) { setBlock(a, y - 1, c, 56); c = c + 1; } a = a + 1; }
      farGateOpen();
      winT = 12;
    }
  }
}
let winT = 0;
// a warding crystal goes off: it hurts what is within 4 blocks (break it from your full reach)
function crystalBreak(x, y, z) {
  setBlock(x, y, z, 0);
  // ((v3.2) one an arrow broke was told to nobody (only what the player's own hand does is): the others
  // kept their crystal)
  if (netUserAct == 0) { netSay('b', `${x}^${y}^${z}^0^${dim}`); if (netSrv > 0 && netSt == 2 && netHost == 1) { hostKeepEdit(x, y, z, 0, dim); } }
  sndPlay(7);
  let dx = px - x - 0.5, dy = py + 1 - y, dz = pz - z - 0.5;
  if (dx * dx + dy * dy + dz * dz < 16) { hurt(6, '수호 수정이 터졌습니다'); }
  if (nCrystal - 1 > 0) { msgShow(`수호 수정이 부서졌습니다 (남은 수정 ${nCrystal - 1})`, 3); }
  else { msgShow('마지막 수정이 부서졌습니다 - 공허의 수호자가 깨어납니다!', 4); }
}

// bones of something great in the wailing valleys
function fossilAsh(x, y, z) {
  if (x - 2 >= gx0 && x + 2 <= gx1 && z - 2 >= gz0 && z + 2 <= gz1) {
    let k = 0;
    while (k < 5) { W[wi(x, y + k, z)] = I_boneBlock; k = k + 1; }
    W[wi(x - 1, y + 3, z)] = I_boneBlock; W[wi(x + 1, y + 3, z)] = I_boneBlock; W[wi(x - 2, y + 2, z)] = I_boneBlock; W[wi(x + 2, y + 2, z)] = I_boneBlock;
  }
}
