// ===================================================================== the lands of before (the simulator's tests only)
// (v3.5) Taken out of the work: the overworld of before v3.4 (two-dimensional noises: columnShape0, genColumn,
// its worm caves and ores), the lava pool on the land, and the depths and the void of before v3.2 (genVer 0).
// The game makes none of them any more (every world, server and map opens on the land of now); the tests
// written on the old world - 128 high, its sea at 30 - ask for it with GENV below 2, and build.mjs gives them
// this file. In the work itself these functions are empty (build.mjs OLDSTUB).
// ---------------------------------------------------------------- world.js
function climateAt(x, z) {
  clC = fbm4(x, z, 72);
  clM = noise2(x - (0 - 2525), z - (0 - 2525), 50);
  clT = fbm3(x - (0 - 10025), z - (0 - 175), 50) * 1.3;
  clH = fbm3(x - (0 - 431), z - (0 - 13636), 46) * 1.3;
}
function climateGrid(x0, z0) {
  if (GCC.length == 0) { let i = 0; while (i < 25) { GCC.push(0); GCM.push(0); GCT.push(0); GCH.push(0); i = i + 1; } }
  let a = 0, c = 0, k = 0;
  while (a < 5) {
    c = 0;
    while (c < 5) { climateAt(x0 + a * 4, z0 + c * 4); k = a * 5 + c + 1; GCC[k] = clC; GCM[k] = clM; GCT[k] = clT; GCH[k] = clH; c = c + 1; }
    a = a + 1;
  }
  gridOn = 1; gridX = x0; gridZ = z0;
}
function columnShape0(x, z) {
  let gx = x - gridX, gz = z - gridZ;
  if (gridOn == 1 && gx >= 0 && gx < 16 && gz >= 0 && gz < 16) {
    let ga = idiv(gx, 4), gc = idiv(gz, 4), fx = (gx - ga * 4) / 4, fz = (gz - gc * 4) / 4;
    let k = ga * 5 + gc + 1, w00 = (1 - fx) * (1 - fz), w01 = (1 - fx) * fz, w10 = fx * (1 - fz), w11 = fx * fz;
    clC = GCC[k] * w00 + GCC[k + 1] * w01 + GCC[k + 5] * w10 + GCC[k + 6] * w11;
    clM = GCM[k] * w00 + GCM[k + 1] * w01 + GCM[k + 5] * w10 + GCM[k + 6] * w11;
    clT = GCT[k] * w00 + GCT[k + 1] * w01 + GCT[k + 5] * w10 + GCT[k + 6] * w11;
    clH = GCH[k] * w00 + GCH[k + 1] * w01 + GCH[k + 5] * w10 + GCH[k + 6] * w11;
  } else { climateAt(x, z); }
  let c = clC, m = clM, t = clT, hm = clH;
  let e = fbm3(x - (0 - 2871), z - (0 - 214), 29);
  let h = SEA + 2 + c * 16 + e * 4;
  let mt = 0;
  // mountains: a broad rise where the noise is high, with ridged crags on it
  if (m > 0.05) {
    mt = (m - 0.05) * (m - 0.05) * 200 * (0.65 + 0.35 * e);
    let rg = 1 - Math.abs(noise2(x - (0 - 7417), z - (0 - 3191), 17));
    mt = mt * (0.75 + 0.45 * rg * rg);
    if (c < -0.1) { mt = mt * 0.3; }
    h = h + mt;
    // (the tops eased under the roof of the world)
    if (h > 96) { h = 96 + (h - 96) * 0.35; }
  }
  // rivers: the land dips to the sea along a line of the noise
  let rv = Math.abs(noise2(x - (0 - 16687), z - (0 - 21), 42));
  if (rv < 0.06) { if (h > SEA - 3) { if (mt < 6) { h = SEA - 3 + (h - SEA + 3) * rv / 0.06; } } }
  colH = Math.floor(h);
  if (colH > WY - 6) { colH = WY - 6; }
  if (colH < 6) { colH = 6; }
  // biomes: 0 ocean, 1 beach, 2 plains, 3 forest, 4 desert, 5 taiga, 6 snowy, 7 mountains, 8 frozen ocean,
  // 11 jungle, 12 savanna, 13 swamp, 14 red canyons, 15 ebony forest, 16 mushroom island, 17 birch forest,
  // 18 flower forest, 19 ice spikes, 20 warm ocean, 21 deep ocean (9, 10: the other worlds)
  let wv = noise2(x - (0 - 31337), z - (0 - 2718), 38);
  let b = 2;
  if (hm > 0.12) { b = 3; if (wv > 0.38) { b = 15; } if (wv < -0.4) { b = 17; } if (wv > 0.12 && wv < 0.24) { b = 18; } }
  if (t < -0.12) { b = 5; }
  if (t < -0.32) { b = 6; if (wv > 0.45) { b = 19; } }
  if (t > 0.3) { if (hm < 0.05) { b = 4; if (wv > 0.3) { b = 14; } } }
  if (t > 0.18) { if (hm >= 0.05 && hm < 0.2) { if (b == 2) { b = 12; } } }
  if (t > 0.22) { if (hm > 0.28) { b = 11; } }
  if (hm > 0.34) { if (t > -0.1 && t <= 0.22) { if (colH <= SEA + 4) { b = 13; } } }
  if (colH >= SEA + 20) { if (b != 14) { b = 7; } }
  if (colH <= SEA + 1) { if (b != 6 && b != 4 && b != 13 && b != 14) { b = 1; } }
  if (colH < SEA - 1) { b = 0; }
  colB = b;
  if (b == 0) {
    if (t < -0.3) { colB = 8; }
    if (t > 0.3) { colB = 20; }
    if (colH < SEA - 12) { colB = 21; }
    // now and then an island of mushrooms far out at sea
    if (c < -0.25) { if (wv > 0.55) { colB = 16; colH = SEA + 2 + Math.floor((wv - 0.55) * 30); } }
  }
  // the swamp sits low and wet
  if (colB == 13) { if (colH > SEA) { colH = SEA + Math.floor((colH - SEA) * 0.4); } }
}
function genColumn(x, z) {
  columnShape0(x, z);
  let h = colH, b = colB, ci = wcol(x, z);
  HMAP[ci] = h; BIOM[ci] = b;
  let top = 2, fill = 3, fd = 3 + rndI(0, 1);
  if (b == 1 || b == 4) { top = 8; fill = 8; }
  if (b == 6 || b == 19) { top = 20; }
  if (b == 16) { top = I_mycelium; }
  if (b == 5) { if (noise2(x, z, 7) > 0.35) { top = I_podzol; } }
  if (b == 15) { if (noise2(x, z, 6) > 0.5) { top = I_coarseDirt; } }
  if (b == 14) { top = I_redSand; fill = I_terracotta; fd = 12; }
  if (b == 7) { if (h > SEA + 30) { top = 1; fill = 1; } if (h > SEA + 34) { top = 45; } }
  if (b == 0 || b == 8) {
    top = 8; fill = 8;
    let fl = noise2(x - (0 - 94), z - (0 - 19), 12);
    if (fl > 0.35) { top = 9; fill = 9; }
    if (fl < -0.45) { top = 22; fill = 22; }
  }
  if (h < SEA - 1) { if (top == 2) { top = 3; } if (top == 20) { top = 3; } }
  let y = 0, v = 0, i = (ci - 1) * WY + 1;
  while (y < WY) {
    v = 0;
    if (y < h - fd) { v = 1; }
    else { if (y < h) { v = fill; if (fill == 8) { if (y < h - 2) { v = 21; } } if (fill == I_terracotta) { v = TBAND[mod(y, 16) + 1]; } } else { if (y == h) { v = top; } } }
    if (y > h) { if (y < SEA) { v = 7; if (y == SEA - 1) { if (b == 8 || b == 6) { v = 33; } } } }
    if (y == 0) { v = 6; }
    if (y > 0) { if (y < 4) { if (rnd() < 0.7 - y * 0.2) { v = 6; } } }
    W[i] = v; LT[i] = 0;
    y = y + 1; i = i + 1;
  }
}
function carveBall(cx, cy, cz, r) {
  let x0 = Math.max(gx0, Math.floor(cx - r)), x1 = Math.min(gx1, Math.floor(cx + r));
  let z0 = Math.max(gz0, Math.floor(cz - r)), z1 = Math.min(gz1, Math.floor(cz + r));
  if (x0 <= x1 && z0 <= z1) {
    let r2 = r * r, x = x0, y = 0, z = 0, i = 0, b = 0, dx = 0, dz = 0, h = 0, ya = 0, yb = 0;
    while (x <= x1) {
      dx = (x + 0.5 - cx) * (x + 0.5 - cx);
      z = z0;
      while (z <= z1) {
        dz = (z + 0.5 - cz) * (z + 0.5 - cz);
        // the cells of this column inside the (flattened) ball, straight from its height there
        if (dx + dz < r2) {
          h = Math.sqrt(r2 - dx - dz) / 1.3;
          ya = Math.max(1, Math.ceil(cy - h - 0.5)); yb = Math.min(WY - 2, Math.floor(cy + h - 0.5));
          y = ya;
          i = (mod(x, WS) * WS + mod(z, WS)) * WY + ya + 1;
          // ((v3.4) the new land: three blocks of ground stay under water, where the ball reaches up to it)
          if (genVer >= 2) {
            let j = i, yy = ya, tp = Math.min(WY - 2, yb + 3);
            while (yy <= tp) { if (W[j] == 7 || W[j] == 33) { yb = Math.min(yb, yy - 4); yy = tp; } yy = yy + 1; j = j + 1; }
          }
          while (y <= yb) {
            b = W[i];
            if (b != 0 && b != 6 && b != 7 && b != 33 && b != 35) {
              // no hole under the sea (it would drain into the cave)
              if (W[i + 1] != 7 && W[i + 1] != 33) {
                // ((v3.4) the new land: nor beside water (in this chunk: what a chunk is made of may not hang on
                // its neighbours being there) - it left dry pits by the rivers)
                let dry = 1;
                if (genVer >= 2) {
                  if (x > gx0) { if (W[i - SXS] == 7) { dry = 0; } } if (x < gx1) { if (W[i + SXS] == 7) { dry = 0; } }
                  if (z > gz0) { if (W[i - WY] == 7) { dry = 0; } } if (z < gz1) { if (W[i + WY] == 7) { dry = 0; } }
                }
                if (dry == 1) { if (y <= LAVAY) { W[i] = 35; } else { W[i] = 0; } }
              }
            }
            y = y + 1; i = i + 1;
          }
        }
        z = z + 1;
      }
      x = x + 1;
    }
  }
}
function wormBalls(ccx, ccz) {
  let x = ccx * 16 + rnd() * 16, z = ccz * 16 + rnd() * 16;
  let rr = rnd();
  // ((v3.4) the new land: a cave begins at a height of its own, more often low (the genre's), not by the land above)
  let y = 0;
  if (genVer >= 2) { y = 6 + rr * rnd() * 64; } else { columnShape(Math.floor(x), Math.floor(z)); y = 6 + rr * (colH - 4); }
  let yaw = rnd() * 360, pitch = (rnd() - 0.5) * 40, dyaw = 0, dp = 0;
  let n = rndI(40, 110), k = 0, r = 0;
  let wide = 1;
  if (rnd() < 0.12) { wide = 2.2; }
  let sy = 0, cy = 0, sp = 0, cp = 0;
  while (k < n) {
    r = (1.3 + 1.2 * sind(k * 180 / n)) * wide;
    if (rnd() < 0.08) { r = r * 1.5; }
    // (every other step: the balls overlap enough)
    if (mod(k, 2) == 0 || r > 2.5) { WBX.push(x); WBY.push(y); WBZ.push(z); WBR.push(r); }
    sy = sind(yaw); cy = cosd(yaw); cp = cosd(pitch); sp = sind(pitch);
    x = x + sy * cp; z = z + cy * cp; y = y + sp * 0.7;
    dyaw = dyaw * 0.85 + (rnd() - 0.5) * 12;
    dp = dp * 0.8 + (rnd() - 0.5) * 6;
    yaw = yaw + dyaw; pitch = pitch * 0.9 + dp;
    if (y < 3) { pitch = Math.abs(pitch); }
    k = k + 1;
  }
}
function oresOld(cx, cz) {
  veins(12, 20, 6, 14, 5, WY - 10);
  veins(11, 14, 4, 8, 2, 36);
  veins(10, 2.5, 4, 8, 2, 18);
  veins(16, 1.2, 3, 7, 2, 12);
  veins(40, 1.2, 3, 7, 2, 18);
  veins(3, 6, 10, 24, 5, WY - 8);
  veins(9, 5, 10, 24, 5, WY - 8);
  // v2.0: the rocks, spark ore deep down, jade in the mountains
  veins(I_granite, 1.5, 20, 34, 5, 80); veins(I_limestone, 1.5, 20, 34, 5, 80); veins(I_slate, 1.5, 20, 34, 5, 80);
  veins(I_oreSpark, 4, 4, 8, 2, 16);
  if (genVer >= 2) { colB = BIOM[wcol(cx * 16 + 8, cz * 16 + 8)]; } else { columnShape(cx * 16 + 8, cz * 16 + 8); }
  if (colB == 7) { veins(I_oreJade, 3, 1, 2, 4, 32); }
}
// ---------------------------------------------------------------- fluid.js
function lavaLake(x0, z0) {
  findTop(x0, z0);
  let s = topY, tb = W[wi(x0, s, z0)];
  if (s > SEA + 1 && s < WY - 8 && BLQ[tb + 1] == 0 && tb != 8) {
    let r = rndI(2, 4), dx = 0 - r - 1;
    while (dx <= r + 1) {
      let dz = 0 - r - 1;
      while (dz <= r + 1) {
        let x = x0 + dx, z = z0 + dz, d = dx * dx + dz * dz, y = 0;
        if (d <= r * r + 1) {
          // lava two deep under the land's top, air over it, stone under it
          y = s - 2; while (y <= s - 1) { W[wi(x, y, z)] = 35; y = y + 1; }
          y = s; while (y <= s + 4) { W[wi(x, y, z)] = 0; y = y + 1; }
          if (BSOL[W[wi(x, s - 3, z)] + 1] != 1) { W[wi(x, s - 3, z)] = 1; }
        } else {
          if (d <= (r + 1) * (r + 1) + 1) {
            // the rim: what is not solid by the lava turns to stone
            y = s - 3; while (y <= s - 1) { if (BSOL[W[wi(x, y, z)] + 1] != 1) { W[wi(x, y, z)] = 1; } y = y + 1; }
          }
        }
        dz = dz + 1;
      }
      dx = dx + 1;
    }
  }
}
// ---------------------------------------------------------------- dims.js
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
    if (y == 0 || y == UH - 1 || y == UH) { v = 6; }
    if (y > UH) { v = 0; }
    if (y == 1 || y == UH - 2) { if (rnd() < 0.5) { v = 6; } }
    W[i] = v; LT[i] = 0;
    y = y + 1; i = i + 1;
  }
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
