// ===================================================================== the world
// The world has no edge: it is made in chunks of 16 x 16 columns around the player and let go
// behind. The loaded ones sit in a ring window of WS x WS columns (NCH x NCH chunk slots): a
// world column (x, z) lives at window column (x mod WS, z mod WS), so a cell is
//   wi(x, y, z) = (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1.
// Chunks are loaded within CR chunks of the player and dropped at once past that, so the loaded
// ones never fill a whole row of slots: next to a loaded chunk's slot is either its true
// neighbour or a slot not ready (CKST < 3). Code that steps from cell to cell only has to ask
// "is that slot ready".
// Per cell: W (block id), LT (light: sky * 16 + block). Per window column: HMAP, BIOM.
let W = [], LT = [], HMAP = [], BIOM = [];
let CKX = [], CKZ = [], CKST = [], CKSUB = [];          // a chunk slot: which chunk, how far made (0 none .. 5 ready)
let EDX = [], EDY = [], EDZ = [], EDB = [], EDD = [];  // every change the player made, and in which world
let logOn = 0;
let seed = 1, rs = 1;
let PERM = [], GRAD = [];
let spawnX = 8, spawnY = 40, spawnZ = 8;

function rnd() {
  rs = (rs * 48271) % 2147483647;
  return rs / 2147483647;
}
function rndI(a, b) {
  rs = (rs * 48271) % 2147483647;
  return a + Math.floor(rs / 2147483647 * (b - a + 1));
}
// the random numbers of one chunk (and one purpose): the same every time it is made
function chunkSeed(cx, cz, salt) {
  rs = mod(seed + cx * 73856093 + cz * 19349663 + salt * 83492791 + dim * 1000003, 2147483646) + 1;
  let warm = rnd() + rnd();
}
function noiseInit() {
  PERM = []; GRAD = []; GRI = [];
  rs = mod(seed, 2147483646) + 1;
  let i = 0;
  while (i < 256) { PERM.push(i); GRAD.push(rnd() * 2 - 1); GRI.push(Math.round(GRAD[i + 1] * 1024)); i = i + 1; }
  i = 256;
  while (i > 1) {
    let j = rndI(1, i);
    let t = PERM[i]; PERM[i] = PERM[j]; PERM[j] = t;
    i = i - 1;
  }
  i = 1;
  while (i <= 256) { PERM.push(PERM[i]); i = i + 1; }
}
// value noise in whole numbers (tessvm's decimal + - x are slow): at world column (X, Z), a
// lattice of P blocks; nI is -1024..1024. The smooth step and the blend are x1024 integers.
let GRI = [];
let nI = 0;
function M_inoise(X, Z, P) {
  let nxi = idiv(X, P), nzi = idiv(Z, P);
  let nu = idiv((X - nxi * P) * 1024, P), nw = idiv((Z - nzi * P) * 1024, P);
  nu = idiv(nu * nu * (3072 - 2 * nu), 1048576); nw = idiv(nw * nw * (3072 - 2 * nw), 1048576);
  let na = mod(nxi, 256) + 1, nb = mod(nzi, 256) + 1;
  let pa = PERM[na], pb = PERM[na + 1];
  let h00 = GRI[PERM[pa + nb] + 1], h01 = GRI[PERM[pa + nb + 1] + 1], h10 = GRI[PERM[pb + nb] + 1], h11 = GRI[PERM[pb + nb + 1] + 1];
  let l0 = h00 * 1024 - (h00 - h10) * nu, l1 = h01 * 1024 - (h01 - h11) * nu;
  nI = idiv(l0 * 1024 - (l0 - l1) * nw, 1048576);
}
// one lattice, -1..1
function noise2(x, z, p) {
  M_inoise(x, z, p);
  return nI / 1024;
}
// three / four lattices, each half the last (the offsets keep them apart)
function fbm3(x, z, p) {
  M_inoise(x, z, p); let s = nI * 4;
  M_inoise(x - (0 - 7919), z - (0 - 1237), idiv(p, 2)); s = s - (0 - nI * 2);
  M_inoise(x - (0 - 3011), z - (0 - 9173), idiv(p, 4)); s = s - (0 - nI);
  return s / 7168;
}
function fbm4(x, z, p) {
  M_inoise(x, z, p); let s = nI * 8;
  M_inoise(x - (0 - 7919), z - (0 - 1237), idiv(p, 2)); s = s - (0 - nI * 4);
  M_inoise(x - (0 - 3011), z - (0 - 9173), idiv(p, 4)); s = s - (0 - nI * 2);
  M_inoise(x - (0 - 5113), z - (0 - 2753), Math.max(2, idiv(p, 8))); s = s - (0 - nI);
  return s / 15360;
}

// ---------------------------------------------------------------- cells
function wi(x, y, z) { return (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1; }
function wcol(x, z) { return mod(x, WS) * WS + mod(z, WS) + 1; }
function slotOf(cx, cz) { return mod(cx, NCH) * NCH + mod(cz, NCH) + 1; }
// is the chunk of world column (x, z) made far enough to hold its blocks?
function cOK(x, z) {
  let cx = idiv(x, 16), cz = idiv(z, 16), s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1, r = 0;
  if (CKST[s] >= 3) { if (CKX[s] == cx) { if (CKZ[s] == cz) { r = 1; } } }
  return r;
}
// a block anywhere: below the world bedrock, above it air, in a chunk not made yet stone
function blockAt(x, y, z) {
  let b = 0;
  if (y < 0) { b = 6; }
  else {
    if (y < WY) {
      let cx = idiv(x, 16), cz = idiv(z, 16), s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
      b = 1;
      if (CKST[s] >= 3) { if (CKX[s] == cx) { if (CKZ[s] == cz) { b = W[(mod(x, WS) * WS + mod(z, WS)) * WY + y + 1]; } } }
    }
  }
  return b;
}
// a block put by the world (generation) or the player (logOn: written down)
function wput(x, y, z, b) {
  W[(mod(x, WS) * WS + mod(z, WS)) * WY + y + 1] = b;
  if (logOn == 1) { edPush(x, y, z, b); if (netSrv > 0) { netEdit(x, y, z, b); } }
}

// ---------------------------------------------------------------- terrain of a column
let colH = 0, colB = 0;
// the coloured bands of the red canyons
let TBAND = [I_terracotta, I_orangeTerracotta, I_terracotta, I_yellowTerracotta, I_brownTerracotta, I_terracotta, I_redTerracotta, I_terracotta, I_whiteTerracotta, I_lightGrayTerracotta, I_terracotta, I_orangeTerracotta, I_terracotta, I_brownTerracotta, I_redTerracotta, I_terracotta];
// the slow parts (land, mountains, warmth, wetness) on the corners of a 4 x 4 cell grid,
// in between straight lines: GC* for the 5 x 5 corners of one chunk
let GCC = [], GCM = [], GCT = [], GCH = [];
let gridOn = 0, gridX = 0, gridZ = 0;
function climateAt(x, z) {
  clC = fbm4(x, z, 72);
  clM = noise2(x - (0 - 2525), z - (0 - 2525), 50);
  clT = fbm3(x - (0 - 10025), z - (0 - 175), 50) * 1.3;
  clH = fbm3(x - (0 - 431), z - (0 - 13636), 46) * 1.3;
}
let clC = 0, clM = 0, clT = 0, clH = 0;
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
function columnShape(x, z) {
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
// the biome of a column without making it (for /locatebiome): bmAt
let bmAt = 0;
function biomeAt(x, z) {
  if (dim == 0) { if (flatOn == 1) { bmAt = 2; } else { gridOn = 0; columnShape(x, z); bmAt = colB; } }
  else { if (dim == 1) { ashBiome(x, z); bmAt = abm; } else { bmAt = 10; } }
}
function genColumn(x, z) {
  columnShape(x, z);
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

// ---------------------------------------------------------------- caves (worms), cut into one chunk
// A worm starts in a chunk near (made from that chunk's own random numbers), so every chunk it
// passes through cuts the same tunnel. Only cells inside the box gx0..gx1, gz0..gz1 are cut.
let gx0 = 0, gx1 = 0, gz0 = 0, gz1 = 0;
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
          while (y <= yb) {
            b = W[i];
            if (b != 0 && b != 6 && b != 7 && b != 33 && b != 35) {
              // no hole under the sea (it would drain into the cave)
              if (W[i + 1] != 7 && W[i + 1] != 33) {
                if (y <= LAVAY) { W[i] = 35; } else { W[i] = 0; }
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
// The balls of a source chunk's worms are walked once and kept (WB*, a ring cache of CVN x CVN
// source chunks); every chunk near reads them again instead of walking the worms again.
let WBX = [], WBY = [], WBZ = [], WBR = [], CVX = [], CVZ = [], CV0 = [], CVC = [];
function cavesInit() {
  WBX = []; WBY = []; WBZ = []; WBR = []; CVX = []; CVZ = []; CV0 = []; CVC = [];
  let i = 0;
  while (i < CVN * CVN) { CVX.push(999999); CVZ.push(0); CV0.push(0); CVC.push(0); i = i + 1; }
}
function wormBalls(ccx, ccz) {
  let x = ccx * 16 + rnd() * 16, z = ccz * 16 + rnd() * 16;
  let rr = rnd();
  columnShape(Math.floor(x), Math.floor(z));
  let y = 6 + rr * (colH - 4);
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
// the cached balls of source chunk (a, c): cvA (first), cvN (count)
let cvA = 0, cvN = 0;
function cavesOf(a, c) {
  let s = mod(a, CVN) * CVN + mod(c, CVN) + 1;
  if (CVX[s] != a || CVZ[s] != c) {
    // (a full pool starts again: every source chunk is walked again when asked)
    if (WBX.length > 300000) { cavesInit(); s = mod(a, CVN) * CVN + mod(c, CVN) + 1; }
    CVX[s] = a; CVZ[s] = c; CV0[s] = WBX.length + 1;
    chunkSeed(a, c, 1);
    let n = 0;
    if (rnd() < 0.62) { n = 1; if (rnd() < 0.45) { n = 2; } }
    while (n > 0) { wormBalls(a, c); n = n - 1; }
    CVC[s] = WBX.length + 1 - CV0[s];
  }
  cvA = CV0[s]; cvN = CVC[s];
}
function genCaves(cx, cz) {
  gx0 = cx * 16; gx1 = gx0 + 15; gz0 = cz * 16; gz1 = gz0 + 15;
  let a = cx - 4, c = 0, k = 0, ke = 0, r = 0, bx = 0, bz = 0;
  while (a <= cx + 4) {
    c = cz - 4;
    while (c <= cz + 4) {
      cavesOf(a, c);
      k = cvA; ke = cvA + cvN;
      while (k < ke) {
        bx = WBX[k]; bz = WBZ[k]; r = WBR[k];
        if (bx + r >= gx0) { if (bx - r <= gx1 + 1) { if (bz + r >= gz0) { if (bz - r <= gz1 + 1) { carveBall(bx, WBY[k], bz, r); } } } }
        k = k + 1;
      }
      c = c + 1;
    }
    a = a + 1;
  }
  // (v2.3.2: the lava of the deep caves stays lava - it used to cool to obsidian when there were
  // no buckets; now it can be taken, and water makes obsidian of it)
}

// ---------------------------------------------------------------- ores and trees of one chunk
// an ore blob: a short walk that replaces stone (kept inside the chunk)
function genVein(b, n, ylo, yhi) {
  let x = gx0 + rndI(0, 15), z = gz0 + rndI(0, 15), y = rndI(ylo, yhi), k = 0, i = 0, d = 0;
  while (k < n) {
    if (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1 && y >= 1 && y < WY) {
      i = (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1;
      if (W[i] == 1 || W[i] == 48) { W[i] = b; }
    }
    d = rndI(0, 5);
    if (d == 0) { x = x + 1; } if (d == 1) { x = x - 1; } if (d == 2) { y = y + 1; }
    if (d == 3) { y = y - 1; } if (d == 4) { z = z + 1; } if (d == 5) { z = z - 1; }
    k = k + 1;
  }
}
// n veins on average (the fraction by chance)
function veins(b, n, lo, hi, ylo, yhi) {
  let k = Math.floor(n);
  if (rnd() < n - k) { k = k + 1; }
  while (k > 0) { genVein(b, rndI(lo, hi), ylo, yhi); k = k - 1; }
}
let treeClip = 0;
function setIfAir(x, y, z, b) {
  if (y >= 0 && y < WY) {
    let i = (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1;
    let o = W[i];
    if (o == 0 || (BSHP[o + 1] == 1 && BTREE[o + 1] < 0 && BWATER[o + 1] == 0)) {
      if (treeClip == 0 || (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1)) { wput(x, y, z, b); }
    }
  }
}
// a tree of kind k (0 oak, 1 birch, 2 spruce, 3 mahogany, 4 acacia, 5 ebony, 6 ember, 7 indigo)
// standing on (x, y, z)
function growTreeKind(x, y, z, k) {
  if (k <= 2) { if (k == 0 && rnd() < 0.1) { bigOak(x, y, z); } else { growTree(x, y, z, k); } }
  if (k == 3) { jungleTree(x, y, z); }
  if (k == 4) { acaciaTree(x, y, z); }
  if (k == 5) { ebonyTree(x, y, z); }
  if (k == 6) { hugeFungus(x, y, z, I_emberLog, I_emberWart); }
  if (k == 7) { hugeFungus(x, y, z, I_indigoLog, I_indigoWart); }
}
function leafBall(x, y, z, r, lv) {
  let a = 0 - r;
  while (a <= r) {
    let c = 0 - r;
    while (c <= r) {
      let d = 0 - r;
      while (d <= r) { if (a * a + c * c + d * d <= r * r + 1) { if (rnd() < 0.92) { setIfAir(x + a, y + d, z + c, lv); } } d = d + 1; }
      c = c + 1;
    }
    a = a + 1;
  }
}
function bigOak(x, y, z) {
  let h = rndI(7, 10), k = 1;
  if (y + h + 4 < WY) {
    while (k <= h) { wput(x, y + k, z, 13); k = k + 1; }
    leafBall(x, y + h, z, 3, 14);
    let d = rndI(0, 3);
    wput(x + dirX(d), y + h - 2, z + dirZ(d), 13); leafBall(x + dirX(d) * 2, y + h - 2, z + dirZ(d) * 2, 2, 14);
    wput(x, y, z, 3);
  }
}
function jungleTree(x, y, z) {
  let h = rndI(8, 13), k = 1, lg = I_mahoganyLog, lv = I_mahoganyLeaves;
  if (y + h + 3 < WY) {
    while (k <= h) { wput(x, y + k, z, lg); k = k + 1; }
    leafBall(x, y + h, z, 3, lv); leafBall(x, y + h + 2, z, 2, lv);
    // vines down the sides of the crown
    let a = 0 - 3;
    while (a <= 3) { if (rnd() < 0.35) { let yy = y + h - 1; while (yy > y + h - 5) { setIfAir(x + a, yy, z - 4, I_vines); setIfAir(x + a, yy, z + 4, I_vines); yy = yy - 1; } } a = a + 1; }
    wput(x, y, z, 3);
  }
}
function acaciaTree(x, y, z) {
  let h = rndI(4, 6), k = 1, lg = I_acaciaLog, lv = I_acaciaLeaves, d = rndI(0, 3), ax = x, az = z;
  if (y + h + 4 < WY) {
    while (k <= h) { if (k > h - 2) { ax = x + dirX(d) * (k - h + 2); az = z + dirZ(d) * (k - h + 2); } wput(ax, y + k, az, lg); k = k + 1; }
    let a = 0 - 3;
    while (a <= 3) { let c = 0 - 3; while (c <= 3) { if (Math.abs(a) + Math.abs(c) <= 4) { setIfAir(ax + a, y + h + 1, az + c, lv); } if (Math.abs(a) + Math.abs(c) <= 2) { setIfAir(ax + a, y + h + 2, az + c, lv); } c = c + 1; } a = a + 1; }
    wput(x, y, z, 3);
  }
}
function ebonyTree(x, y, z) {
  let h = rndI(6, 8), k = 1, lg = I_ebonyLog, lv = I_ebonyLeaves;
  if (y + h + 4 < WY) {
    while (k <= h) { wput(x, y + k, z, lg); wput(x + 1, y + k, z, lg); wput(x, y + k, z + 1, lg); wput(x + 1, y + k, z + 1, lg); k = k + 1; }
    let a = 0 - 3;
    while (a <= 4) { let c = 0 - 3; while (c <= 4) { if (Math.abs(a - 0.5) + Math.abs(c - 0.5) <= 5.5) { setIfAir(x + a, y + h, z + c, lv); setIfAir(x + a, y + h - 1, z + c, lv); } if (Math.abs(a - 0.5) + Math.abs(c - 0.5) <= 3.5) { setIfAir(x + a, y + h + 1, z + c, lv); } c = c + 1; } a = a + 1; }
    wput(x, y, z, 3); wput(x + 1, y, z, 3); wput(x, y, z + 1, 3); wput(x + 1, y, z + 1, 3);
  }
}
// the great fungi of the depths: a stem and a cap with lanterns under it
function hugeFungus(x, y, z, st, cap) {
  let h = rndI(5, 9), k = 1;
  if (y + h + 3 < UH - 2) {
    while (k <= h) { wput(x, y + k, z, st); k = k + 1; }
    let r = 2 + rndI(0, 1), a = 0 - r;
    while (a <= r) {
      let c = 0 - r;
      while (c <= r) {
        if (a * a + c * c <= r * r + 1) {
          setIfAir(x + a, y + h + 1, z + c, cap);
          if (Math.abs(a) == r || Math.abs(c) == r) { setIfAir(x + a, y + h, z + c, cap); if (rnd() < 0.5) { setIfAir(x + a, y + h - 1, z + c, cap); } }
          else { if (rnd() < 0.12) { setIfAir(x + a, y + h, z + c, I_shroomLantern); } }
        }
        c = c + 1;
      }
      a = a + 1;
    }
    setIfAir(x, y + h + 2, z, cap);
  }
}
// a big mushroom (the mushroom islands, the ebony forests)
function hugeMushroom(x, y, z, red) {
  let h = rndI(4, 7), k = 1, cap = I_mushBrownBlock, r = 3;
  if (red == 1) { cap = I_mushRedBlock; r = 2; }
  if (y + h + 2 < WY) {
    while (k <= h) { wput(x, y + k, z, I_mushStem); k = k + 1; }
    let a = 0 - r;
    while (a <= r) {
      let c = 0 - r;
      while (c <= r) {
        if (Math.abs(a) + Math.abs(c) < r * 2) {
          setIfAir(x + a, y + h + 1, z + c, cap);
          if (red == 1) { if (Math.abs(a) == r || Math.abs(c) == r) { setIfAir(x + a, y + h, z + c, cap); setIfAir(x + a, y + h - 1, z + c, cap); } }
        }
        c = c + 1;
      }
      a = a + 1;
    }
  }
}
// trees: kind 0 oak, 1 birch, 2 spruce. y: the ground block (all of it inside one chunk when
// the world makes it: trunks only 3 .. 12 into the chunk)
function growTree(x, y, z, kind) {
  let lg = 13, lv = 14, h = rndI(4, 6);
  if (kind == 1) { lg = 23; lv = 24; h = rndI(5, 7); }
  if (kind == 2) { lg = 25; lv = 26; h = rndI(6, 9); }
  if (y + h + 2 < WY) {
    let k = 1;
    let dx = 0, dz = 0, ly = 0, r = 0;
    if (kind < 2) {
      ly = y + h - 2;
      while (ly <= y + h + 1) {
        r = 2;
        if (ly >= y + h) { r = 1; }
        dx = 0 - r;
        while (dx <= r) {
          dz = 0 - r;
          while (dz <= r) {
            if (Math.abs(dx) == r && Math.abs(dz) == r) {
              if (r == 2) { if (rnd() < 0.5) { if (ly < y + h - 1) { setIfAir(x + dx, ly, z + dz, lv); } } }
              if (r == 1) { if (ly == y + h) { if (rnd() < 0.5) { setIfAir(x + dx, ly, z + dz, lv); } } }
            } else { setIfAir(x + dx, ly, z + dz, lv); }
            dz = dz + 1;
          }
          dx = dx + 1;
        }
        ly = ly + 1;
      }
    } else {
      ly = y + h + 1;
      setIfAir(x, ly, z, lv);
      ly = ly - 1;
      r = 0;
      while (ly >= y + 3) {
        r = r + 1;
        if (r > 3) { r = 1; }
        if (r == 3) { if (ly > y + h - 3) { r = 1; } }
        dx = 0 - r;
        while (dx <= r) {
          dz = 0 - r;
          while (dz <= r) {
            if (Math.abs(dx) + Math.abs(dz) <= r + 1) { if (Math.abs(dx) < r + 1) { setIfAir(x + dx, ly, z + dz, lv); } }
            dz = dz + 1;
          }
          dx = dx + 1;
        }
        ly = ly - 1;
      }
    }
    k = 1;
    while (k <= h) { wput(x, y + k, z, lg); k = k + 1; }
    wput(x, y, z, 3);
  }
}
// the top block of a column (scanning down from the sky)
let topY = 0;
function findTop(x, z) {
  let i = (mod(x, WS) * WS + mod(z, WS)) * WY + WY;
  let y = WY - 1;
  while (y > 0) {
    if (BHC[W[i] + 1] == 1) { break; }
    if (W[i] == 7 || W[i] == 35) { break; }
    y = y - 1; i = i - 1;
  }
  topY = y;
}
// the same from height y0 down (the world's own height: the trees are not there yet)
function findTopFrom(x, z, y0) {
  let i = (mod(x, WS) * WS + mod(z, WS)) * WY + y0 + 1;
  let y = y0;
  while (y > 0) {
    if (BHC[W[i] + 1] == 1) { break; }
    if (W[i] == 7 || W[i] == 35) { break; }
    y = y - 1; i = i - 1;
  }
  topY = y;
}
// lx, lz: the column inside the chunk (0..15)
function decorate(x, z, lx, lz) {
  findTopFrom(x, z, Math.min(WY - 1, HMAP[wcol(x, z)] + 1));
  let y = topY, i = (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1;
  let b = W[i], bi = BIOM[wcol(x, z)];
  let above = W[i + 1];
  // dirt left open to the sky (a vein on a mountain) grows grass
  if (b == 3) { if (above == 0) { if (y >= SEA) { b = 2; if (bi == 6 || bi == 19 || y > SEA + 34) { b = 20; } W[i] = b; } } }
  let inner = 0, edge1 = 0;
  if (lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) { inner = 1; }
  if (lx >= 1 && lx <= 14 && lz >= 1 && lz <= 14) { edge1 = 1; }
  // the sea floor: kelp, sea grass, coral; lily pads on the swamp's water
  if (b == 7) { if (W[i + 1] == 0) { if (bi == 13) { if (rnd() < 0.05) { W[i + 1] = I_lilyPad; } } } seaFloor(x, y, z, bi, i); }
  if (y < WY - 14 && above == 0) {
    let r = rnd();
    let soil = 0;
    if (b == 2 || b == 20 || b == I_podzol || b == I_coarseDirt || b == I_mycelium) { soil = 1; }
    if (soil == 1) {
      let tc = 0, kind = 0;
      if (bi == 2) { tc = 0.006; if (rnd() < 0.2) { kind = 1; } }
      if (bi == 3) { tc = 0.06; if (rnd() < 0.35) { kind = 1; } }
      if (bi == 5) { tc = 0.05; kind = 2; }
      if (bi == 6) { tc = 0.01; kind = 2; }
      if (bi == 7) { tc = 0.02; kind = 2; if (rnd() < 0.4) { kind = 0; } }
      if (bi == 11) { tc = 0.1; kind = 3; }
      if (bi == 12) { tc = 0.008; kind = 4; }
      if (bi == 13) { tc = 0.02; kind = 0; }
      if (bi == 15) { tc = 0.11; kind = 5; }
      if (bi == 17) { tc = 0.06; kind = 1; }
      if (bi == 18) { tc = 0.04; if (rnd() < 0.4) { kind = 1; } }
      if (r < tc && inner == 1) {
        let near = 0, a = x - 2;
        while (a <= x + 2) {
          let c = z - 2;
          while (c <= z + 2) { let j = (mod(a, WS) * WS + mod(c, WS)) * WY + y + 2; if (BTREE[W[j] + 1] < 0) { if (BKIND[W[j] + 1] == W[j]) { if (BSTRIP[W[j] + 1] > 0) { near = 1; } } } c = c + 1; }
          a = a + 1;
        }
        if (near == 0) {
          if (kind == 5) { if (lx > 10 || lz > 10) { kind = 0; } }
          growTreeKind(x, y, z, kind);
          // swamp oaks carry vines
          if (bi == 13) { let k = 0; while (k < 6) { let vx = x + rndI(-2, 2), vz = z + rndI(-2, 2), vy = y + 4; if (W[wi(vx, vy, vz)] == 0) { W[wi(vx, vy, vz)] = I_vines; } k = k + 1; } }
        }
      } else {
        // big mushrooms: the mushroom islands and the ebony woods
        if (bi == 16 || bi == 15) { if (inner == 1) { if (rnd() < 0.012) { hugeMushroom(x, y, z, rndI(0, 1)); r = 9; } } }
        let g = 0.12, fl = 0.012;
        if (bi == 3) { g = 0.08; } if (bi == 7) { g = 0.04; } if (bi == 11) { g = 0.3; } if (bi == 12) { g = 0.22; } if (bi == 5) { g = 0.1; }
        if (bi == 18) { fl = 0.22; } if (bi == 16 || bi == 6 || bi == 19) { g = 0; fl = 0; } if (bi == 13) { fl = 0.02; } if (bi == 15) { g = 0.05; fl = 0; }
        if (r < tc + g) {
          W[i + 1] = 28;
          if (bi == 5 || bi == 11) { if (rnd() < 0.45) { W[i + 1] = I_fern; } }
        } else {
          if (r < tc + g + fl) { W[i + 1] = flowerFor(bi); }
          else {
            let r2 = rnd();
            if (bi == 2 || bi == 3 || bi == 5) { if (r2 < 0.0015) { W[i + 1] = I_pumpkin; } }
            if (bi == 11) { if (r2 < 0.01) { W[i + 1] = I_melon; } else { if (r2 < 0.03) { bambooAt(i); } } }
            if (bi == 5) { if (r2 < 0.008) { W[i + 1] = I_berryBush; } }
            if (bi == 15 || bi == 13 || bi == 16) { if (r2 < 0.02) { W[i + 1] = I_mushBrown; if (rnd() < 0.5) { W[i + 1] = I_mushRed; } } }
          }
        }
      }
    }
    // reeds by the water
    if (b == 2 || b == 8 || b == 3) { if (edge1 == 1) { if (rnd() < 0.18) { if (W[i + SXS] == 7 || W[i - SXS] == 7 || W[i + WY] == 7 || W[i - WY] == 7) { let h = rndI(1, 3), k = 1; while (k <= h) { W[i + k] = I_reed; k = k + 1; } } } } }
    // the deserts and the red canyons
    if (b == 8 || b == I_redSand) {
      if (bi == 4 || bi == 14) {
        if (r < 0.008 && edge1 == 1) {
          let h = rndI(1, 3), k = 1;
          if (W[i + SXS + 1] == 0 && W[i - SXS + 1] == 0 && W[i + WY + 1] == 0 && W[i - WY + 1] == 0) { while (k <= h) { W[i + k] = 19; k = k + 1; } }
        } else { if (r < 0.016) { W[i + 1] = 46; } }
      }
    }
    // spikes of packed ice
    if (bi == 19) { if (r < 0.004 && inner == 1) { iceSpike(x, y, z); } }
  }
}
function flowerFor(bi) {
  let r = rndI(1, 20), f = 30;
  if (r <= 7) { f = 29; }
  if (bi == 18) { f = FLW[rndI(1, FLW.length)]; }
  else {
    if (r == 8) { f = I_daisy; } if (r == 9) { f = I_cornflower; } if (r == 10) { f = I_bluet; } if (r == 11) { f = I_tulipRed + rndI(0, 3); }
    if (bi == 13) { f = I_orchid; }
    if (bi == 3 || bi == 17) { if (r == 12) { f = I_lilyValley; } if (r == 13) { f = I_lilac; } }
    if (bi == 2) { if (r == 14) { f = I_sunflower; } }
  }
  return f;
}
let FLW = [29, 30, I_orchid, I_allium, I_bluet, I_tulipRed, I_tulipOrange, I_tulipWhite, I_tulipPink, I_daisy, I_cornflower, I_lilyValley, I_lilac, I_peony, I_roseBush, I_hydrangea, I_cosmos];
function bambooAt(i) {
  let h = rndI(4, 10), k = 1;
  while (k <= h) { if (W[i + k] == 0) { W[i + k] = I_bamboo; } k = k + 1; }
}
function iceSpike(x, y, z) {
  let h = rndI(6, 20), k = 1;
  while (k <= h && y + k < WY - 2) {
    let r = 0;
    if (k < h * 0.4) { r = 1; }
    let a = 0 - r;
    while (a <= r) { let c = 0 - r; while (c <= r) { if (Math.abs(a) + Math.abs(c) <= r) { W[wi(x + a, y + k, z + c)] = I_packedIce; } c = c + 1; } a = a + 1; }
    k = k + 1;
  }
}
// what grows on the sea floor under (x, y, z) the water's top
function seaFloor(x, y, z, bi, i) {
  let fy = y, j = i;
  while (fy > 1 && W[j] == 7) { fy = fy - 1; j = j - 1; }
  if (fy < y - 1) {
    let r = rnd();
    if (bi == 20) {
      if (r < 0.14) {
        let ck = rndI(0, 4), kind = I_tubeCoralBlock + ck * 6;
        if (rnd() < 0.5) { W[j + 1] = kind + 2 + rndI(0, 1) * 2; } else { W[j] = kind; if (W[j + 1] == 7) { W[j + 1] = kind + 2 + rndI(0, 1) * 2; } }
      } else { if (r < 0.18) { W[j + 1] = I_seaPickle; } else { if (r < 0.3) { W[j + 1] = I_seagrass; } } }
    } else {
      if (bi == 0 || bi == 21 || bi == 13 || bi == 1) {
        if (r < 0.05) { let h = rndI(2, y - fy - 1), k = 1; while (k <= h) { if (W[j + k] == 7) { W[j + k] = I_kelp; } k = k + 1; } }
        else { if (r < 0.2) { W[j + 1] = I_seagrass; } }
      }
    }
  }
}
function genFeatures(cx, cz) {
  gx0 = cx * 16; gx1 = gx0 + 15; gz0 = cz * 16; gz1 = gz0 + 15;
  treeClip = 1;
  if (dim == 0) { if (flatOn == 0) { featuresO(cx, cz); } }
  if (dim == 1) { featuresU(cx, cz); }
  if (dim == 2) { featuresV(cx, cz); }
  treeClip = 0;
  // what the player changed here before (only this chunk's entries: save.js)
  edReplay(cx, cz);
}
function featuresO(cx, cz) {
  chunkSeed(cx, cz, 2);
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
  columnShape(cx * 16 + 8, cz * 16 + 8);
  if (colB == 7) { veins(I_oreJade, 3, 1, 2, 4, 32); }
  chunkSeed(cx, cz, 3);
  let lx = 0, lz = 0;
  while (lx < 16) {
    lz = 0;
    while (lz < 16) { decorate(gx0 + lx, gz0 + lz, lx, lz); lz = lz + 1; }
    lx = lx + 1;
  }  // now and then a broken gate frame of obsidian on the ground (with what fell off lying by it)
  chunkSeed(cx, cz, 4);
  if (rndI(1, 9) == 1) { ruinFrame(gx0 + rndI(4, 9), gz0 + rndI(5, 10)); }
  // (v2.3.2) springs in the cave walls, lava ones deep down, and a lava lake on the land now and then
  chunkSeed(cx, cz, 6);
  springs(1, 14, 7, 10, 70); springs(1, 6, 35, 6, 30);
  if (rndI(1, 40) == 1) { lavaLake(gx0 + 8, gz0 + 8); }
  // the old ruins with their gates
  featuresRuins();
  // the villages, temples, mines and the rest
  featuresStructs(cx, cz);
}
function ruinFrame(x0, z0) {
  findTop(x0 + 1, z0);
  let y0 = topY, b = W[wi(x0 + 1, y0, z0)];
  if (y0 > SEA) { if (y0 < WY - 9) { if (b == 2 || b == 3 || b == 8 || b == 1) {
    let a = x0 - 1, c = 0, y = 0;
    // a floor of old stone, clear above it
    while (a <= x0 + 4) {
      c = z0 - 1;
      while (c <= z0 + 1) {
        W[wi(a, y0, c)] = 4; if (rndI(1, 3) == 1) { W[wi(a, y0, c)] = 36; }
        y = y0 + 1; while (y <= y0 + 7) { W[wi(a, y, c)] = 0; y = y + 1; }
        c = c + 1;
      }
      a = a + 1;
    }
    // what still stands of the frame (the bottom and the low sides), the rest fallen about it
    W[wi(x0 + 1, y0 + 1, z0)] = 34; W[wi(x0 + 2, y0 + 1, z0)] = 34;
    W[wi(x0, y0 + 2, z0)] = 34; W[wi(x0, y0 + 3, z0)] = 34; W[wi(x0 + 3, y0 + 2, z0)] = 34;
    W[wi(x0 - 1, y0 + 1, z0 + 1)] = 34; W[wi(x0 + 1, y0 + 1, z0 + 1)] = 34; W[wi(x0 + 4, y0 + 1, z0)] = 34;
    W[wi(x0 + 2, y0 + 1, z0 - 1)] = 34;
    if (rndI(1, 2) == 1) { W[wi(x0 + 3, y0 + 1, z0 + 1)] = 34; } else { W[wi(x0 + 3, y0 + 1, z0)] = 34; }
    W[wi(x0 - 1, y0 + 1, z0 - 1)] = 36; W[wi(x0 + 4, y0 + 1, z0 - 1)] = 4;
  } } }
}

// ---------------------------------------------------------------- light
// LT = sky * 16 + block. A breadth-first spread through the queue LQ, one kind at a time; it
// does not step into a chunk that is not made.
let LQ = [];
let lqHead = 1, lqTail = 0;
function lqPush(i) {
  lqTail = lqTail + 1;
  if (lqTail > LQ.length) { LQ.push(i); } else { LQ[lqTail] = i; }
}
function lightSpread(which) {
  let i = 0, l = 0, y = 0, col = 0, lz = 0, lx = 0, n = 0, ln = 0, t = 0;
  while (lqHead <= lqTail) {
    i = LQ[lqHead]; lqHead = lqHead + 1;
    l = LT[i];
    if (which == 0) { l = idiv(l, 16); } else { l = l - idiv(l, 16) * 16; }
    if (l > 1) {
      ln = l - 1;
      y = mod(i - 1, WY); col = idiv(i - 1, WY); lz = mod(col, WS); lx = idiv(col, WS);
      if (y > 0) { n = i - 1; M_spread(n, ln, which); }
      if (y < WY - 1) { n = i + 1; M_spread(n, ln, which); }
      if (mod(lz, 16) != 0) { n = i - WY; M_spread(n, ln, which); }
      else { t = lz - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(lx, 16) * NCH + idiv(t, 16) + 1] >= 3) { n = (lx * WS + t) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lz, 16) != 15) { n = i + WY; M_spread(n, ln, which); }
      else { t = lz + 1; if (t >= WS) { t = 0; } if (CKST[idiv(lx, 16) * NCH + idiv(t, 16) + 1] >= 3) { n = (lx * WS + t) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lx, 16) != 0) { n = i - SXS; M_spread(n, ln, which); }
      else { t = lx - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(t, 16) * NCH + idiv(lz, 16) + 1] >= 3) { n = (t * WS + lz) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lx, 16) != 15) { n = i + SXS; M_spread(n, ln, which); }
      else { t = lx + 1; if (t >= WS) { t = 0; } if (CKST[idiv(t, 16) * NCH + idiv(lz, 16) + 1] >= 3) { n = (t * WS + lz) * WY + y + 1; M_spread(n, ln, which); } }
    }
  }
  lqHead = 1; lqTail = 0;
}
function M_spread(N, LN, WH) {
  let nb = W[N];
  if (BLOP[nb + 1] == 0) {
    let ll = LN;
    if (BHC[nb + 1] != 0) { ll = LN - 1; }
    let lt = LT[N], sk = idiv(lt, 16);
    if (WH == 0) { if (sk < ll) { LT[N] = ll * 16 + lt - sk * 16; lqPush(N); } }
    else { if (lt - sk * 16 < ll) { LT[N] = sk * 16 + ll; lqPush(N); } }
  }
}
// the sky straight down a column: 15 until the first block that stops it; skyFloor: the first
// y with full sky
let skyFloor = 0;
function skyColumn(x, z) {
  let i = (mod(x, WS) * WS + mod(z, WS)) * WY + WY, y = WY - 1, open = 1, b = 0;
  while (y >= 0) {
    b = W[i];
    if (open == 1) { if (BLOP[b + 1] == 1 || BHC[b + 1] != 0) { open = 0; skyFloor = y + 1; } }
    if (open == 1) { LT[i] = 240 + BLIT[b + 1]; } else { LT[i] = BLIT[b + 1]; }
    y = y - 1; i = i - 1;
  }
  if (open == 1) { skyFloor = 0; }
}
// relight the world columns x0..x1, z0..z1 (all heights, chunks that are made only): sky
// straight down, then spread from what is lit in the box and from the ring of cells round it
let SFL = [];
function relight(x0, x1, z0, z1) {
  let x = x0, z = 0, y = 0, i = 0, f = 0, m = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) { if (cOK(x, z) == 1) { skyColumn(x, z); SFL[wcol(x, z)] = skyFloor; } z = z + 1; }
    x = x + 1;
  }
  // sky seeds: the lit cells of a column down from the lowest floor round it
  x = x0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      if (cOK(x, z) == 1) {
        f = SFL[wcol(x, z)]; m = f;
        // (outside the box: the neighbour's own floor, when its chunk is made)
        if (x > x0) { m = Math.max(m, SFL[wcol(x - 1, z)]); } else { if (cOK(x - 1, z) == 1) { m = Math.max(m, SFL[wcol(x - 1, z)]); } }
        if (x < x1) { m = Math.max(m, SFL[wcol(x + 1, z)]); } else { if (cOK(x + 1, z) == 1) { m = Math.max(m, SFL[wcol(x + 1, z)]); } }
        if (z > z0) { m = Math.max(m, SFL[wcol(x, z - 1)]); } else { if (cOK(x, z - 1) == 1) { m = Math.max(m, SFL[wcol(x, z - 1)]); } }
        if (z < z1) { m = Math.max(m, SFL[wcol(x, z + 1)]); } else { if (cOK(x, z + 1) == 1) { m = Math.max(m, SFL[wcol(x, z + 1)]); } }
        y = f; i = (mod(x, WS) * WS + mod(z, WS)) * WY + f + 1;
        while (y <= m) { if (y < WY) { if (LT[i] >= 240) { lqPush(i); } } y = y + 1; i = i + 1; }
      }
      z = z + 1;
    }
    x = x + 1;
  }
  relightRing(x0, x1, z0, z1, 0);
  lightSpread(0);
  // block light: every source in the box, and the ring
  x = x0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      if (cOK(x, z) == 1) {
        i = (mod(x, WS) * WS + mod(z, WS)) * WY + 1; y = 0;
        while (y < WY) { if (mod(LT[i], 16) > 1) { lqPush(i); } y = y + 1; i = i + 1; }
      }
      z = z + 1;
    }
    x = x + 1;
  }
  relightRing(x0, x1, z0, z1, 1);
  lightSpread(1);
}
function relightRing(x0, x1, z0, z1, which) {
  let x = x0 - 1, z = 0, y = 0, i = 0, l = 0;
  while (x <= x1 + 1) {
    z = z0 - 1;
    while (z <= z1 + 1) {
      if (x < x0 || x > x1 || z < z0 || z > z1) {
        if (cOK(x, z) == 1) {
          i = (mod(x, WS) * WS + mod(z, WS)) * WY + 1; y = 0;
          while (y < WY) {
            l = LT[i];
            if (which == 0) { l = idiv(l, 16); } else { l = mod(l, 16); }
            if (l > 1) { lqPush(i); }
            y = y + 1; i = i + 1;
          }
        }
      }
      z = z + 1;
    }
    x = x + 1;
  }
}

// ---------------------------------------------------------------- chunks
// stages: 1 columns, 2 caves, 3 ores, trees, the player's changes (the blocks are final),
// 4 light, 5 sections (ready to draw)
let pcxW = -99999, pczW = -99999, nChunks = 0;
let lastStage = 0;
function chunkStage(s) {
  let cx = CKX[s], cz = CKZ[s], st = CKST[s];
  lastStage = lastStage * 10 + st + 1;
  if (st == 0) {
    // (half the columns a step)
    let k = CKSUB[s];
    chunkSeed(cx, cz, k);
    climateGrid(cx * 16, cz * 16);
    let a = k * 8, c = 0;
    while (a < k * 8 + 8) {
      c = 0;
      while (c < 16) {
        if (dim == 0) { if (flatOn == 1) { genFlat(cx * 16 + a, cz * 16 + c); } else { genColumn(cx * 16 + a, cz * 16 + c); } } else { if (dim == 1) { genColumnU(cx * 16 + a, cz * 16 + c); } else { genColumnV(cx * 16 + a, cz * 16 + c); } }
        c = c + 1;
      }
      a = a + 1;
    }
    gridOn = 0;
    CKSUB[s] = k + 1;
    if (k == 1) { CKSUB[s] = 0; CKST[s] = 1; }
  } else { if (st == 1) {
    if (dim == 0) { if (flatOn == 0) { genCaves(cx, cz); } }
    CKST[s] = 2;
  } else { if (st == 2) {
    genFeatures(cx, cz);
    CKST[s] = 3;
  } else { if (st == 3) {
    relight(cx * 16, cx * 16 + 15, cz * 16, cz * 16 + 15);
    CKST[s] = 4;
  } else { if (st == 4) {
    // its 2 x 2 x NSY sections, and the sections of ready neighbours that face it (their
    // faces against this chunk were left out while it was not made)
    // (a quarter of them a step)
    let k = CKSUB[s], a = idiv(k, 2), c = mod(k, 2), y = 0;
    while (y < NSY) { meshSectionAt(cx * 16 + a * 8, y * 8, cz * 16 + c * 8); y = y + 1; }
    CKSUB[s] = k + 1;
    if (k == 3) { CKSUB[s] = 0; CKST[s] = 5;
    nbRemesh(cx - 1, cz, cx * 16 - 8, cz * 16, 0, 8, 2); nbRemesh(cx + 1, cz, cx * 16 + 16, cz * 16, 0, 8, 1);
    nbRemesh(cx, cz - 1, cx * 16, cz * 16 - 8, 8, 0, 8); nbRemesh(cx, cz + 1, cx * 16, cz * 16 + 16, 8, 0, 4);
    chunkAnimals(cx, cz); }
  } } } } }
}
// the two section columns (x, z), (x + dx, z + dz) of chunk (ncx, ncz), if it is ready: the
// sections whose side `bit` was left closed
function nbRemesh(ncx, ncz, x, z, dx, dz, bit) {
  let s = slotOf(ncx, ncz);
  if (CKST[s] == 5) { if (CKX[s] == ncx) { if (CKZ[s] == ncz) {
    let y = 0, k = 0;
    while (y < NSY) {
      k = secOf(x, y * 8, z); if (mod(idiv(SCL[k], bit), 2) == 1) { remeshLater(k); }
      k = secOf(x + dx, y * 8, z + dz); if (mod(idiv(SCL[k], bit), 2) == 1) { remeshLater(k); }
      y = y + 1;
    }
  } } }
}
function chunkDrop(s) {
  let cx = CKX[s], cz = CKZ[s];
  CKST[s] = 0; CKSUB[s] = 0;
  let a = 0, c = 0, y = 0, k = 0;
  while (a < 2) { c = 0; while (c < 2) { y = 0; while (y < NSY) { k = secOf(cx * 16 + a * 8, y * 8, cz * 16 + c * 8); SOK[k] = 0; SFN[k] = 0; SEMP[k] = 1; SVIS[k] = 0; y = y + 1; } c = c + 1; } a = a + 1; }
}
// once a frame: drop what is too far, then make the nearest chunks a few stages on
function chunkWork(steps) {
  let pcx = idiv(Math.floor(px), 16), pcz = idiv(Math.floor(pz), 16), s = 0, k = 1, cx = 0, cz = 0;
  if (pcx != pcxW || pcz != pczW) {
    pcxW = pcx; pczW = pcz;
    s = 1;
    while (s <= NCH * NCH) {
      if (CKST[s] > 0) { if ((CKX[s] - pcx) * (CKX[s] - pcx) + (CKZ[s] - pcz) * (CKZ[s] - pcz) > CR * CR + 6) { chunkDrop(s); } }
      s = s + 1;
    }
  }
  nChunks = 0;
  while (k <= NOFF) {
    cx = pcx + OFFX[k]; cz = pcz + OFFZ[k]; s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
    if (CKST[s] == 5 && CKX[s] == cx && CKZ[s] == cz) { nChunks = nChunks + 1; k = k + 1; }
    else {
      if (steps > 0) {
        if (CKST[s] > 0) { if (CKX[s] != cx || CKZ[s] != cz) { chunkDrop(s); } }
        if (CKST[s] == 0) { CKX[s] = cx; CKZ[s] = cz; }
        chunkStage(s);
        steps = steps - 1;
      } else { k = k + 1; }
    }
  }
}
function worldInit() {
  effectsInit(); riding = 0; gliding = 0;
  if (W.length == 0) {
    let i = 0;
    while (i < WS * WS * WY) { W.push(0); LT.push(0); i = i + 1; }
    i = 0;
    while (i < WS * WS) { HMAP.push(0); BIOM.push(0); SFL.push(0); i = i + 1; }
    i = 0;
    while (i < NCH * NCH) { CKX.push(0); CKZ.push(0); CKST.push(0); CKSUB.push(0); i = i + 1; }
  }
}

// ---------------------------------------------------------------- a new world
let genPhase = 0, genN = 0, genMsg = '';
function genStart(s) {
  seed = s;
  fluidInit();
  noiseInit();
  worldInit();
  let i = 1;
  while (i <= NCH * NCH) { if (CKST[i] > 0) { chunkDrop(i); } i = i + 1; }
  EDX = []; EDY = []; EDZ = []; EDB = []; EDD = []; edIndex();
  logOn = 0; dim = 0; bossDead = 0; bossWake = 0;
  worldExtraInit();
  cavesInit();
  px = 8.5; pz = 8.5; pcxW = -99999; pczW = -99999;
  genPhase = 1; genN = 0;
}
// the loading screen: the chunks near the start are made before play (the rest during it)
function genStep() {
  genMsg = '지형·동굴·광물·나무·빛을 만드는 중';
  chunkWork(40);
  genN = nChunks / NSTART;
  if (nChunks >= NSTART) { genN = 1; genPhase = 7; }
}

// a dry, solid spot near the middle to start from (in the chunks made)
function findSpawn() {
  let r = 0, found = 0, x = 0, z = 0, a = 0;
  while (found == 0 && r < 24) {
    a = 0;
    while (a < 16) {
      if (found == 0) {
        x = Math.floor(8 + sind(a * 22.5) * r); z = Math.floor(8 + cosd(a * 22.5) * r);
        findTop(x, z);
        let i = wi(x, topY, z);
        let b = W[i];
        if (topY >= SEA) { if (b == 2 || b == 20 || b == 8 || b == 3) { if (W[i + 1] == 0 || W[i + 1] == 28) { found = 1; } } }
      }
      a = a + 1;
    }
    r = r + 3;
  }
  if (found == 0) { x = 8; z = 8; findTop(x, z); }
  spawnX = x + 0.5; spawnZ = z + 0.5; spawnY = topY + 1;
}
