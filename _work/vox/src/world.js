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
// (v3.5, 11-26) CKRD: may the spark parts of the chunk work - 0 not yet (a chunk beside it, or corner to corner,
// is still to come: one of the circle round the player, or one the world keeps), 1 yes but a chunk beside it is
// not made and will not be (the parts on that edge wait: power.js rsReady), 2 yes. CKRV: put back from the log
// with parts in it that have not been looked at yet (sparkReady).
// A part put back was looked at as soon as its own chunk and the cells beside it were there. A wire reads its
// power from up to 15 cells off, and a chunk not made reads as stone: a net reaching into a chunk still to come
// lost the source it had there, went dark, and the repeaters and latches behind it took that for a signal - a
// machine laid over many chunks came back changed, by the order its chunks were made in. (The calculator brought
// over from the genre: 124 cells other than saved, its sums wrong.)
let CKRV = [], CKRD = [], ckVer = 0, rdVer = 0 - 1, rdPX = 0, rdPZ = 0, rdKeep = 0, rdSim = 0;
let NB8X = [-1, 1, 0, 0, -1, 1, -1, 1], NB8Z = [0, 0, -1, 1, -1, -1, 1, 1];
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
// (v3.5, 11-26) is the chunk of (x, z) lit (stage 4): the light's own question. A chunk whose blocks are made and
// whose light is not yet worked out holds in LT what the slot's last chunk left (the columns are no longer
// written dark while they are made: 65,536 writes a chunk that the light stage wrote over at once) - so light
// neither spreads into it, nor is taken from it, nor taken back through it, until its own turn (chunkStage
// 3), which begins from the sky and from the lit chunks round it.
function cLit(x, z) {
  let cx = idiv(x, 16), cz = idiv(z, 16), s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1, r = 0;
  if (CKST[s] >= 4) { if (CKX[s] == cx) { if (CKZ[s] == cz) { r = 1; } } }
  return r;
}
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
  rsVer = rsVer + 1;
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
let clC = 0, clM = 0, clT = 0, clH = 0;
// ((v3.4) a world made from v3.4 on has the land of terra.js (genVer 2): its top and biome from there)
function columnShape(x, z) { if (genVer >= 2) { tPoint(x, z); } else { columnShape0(x, z); } }
// the biome of a column without making it (for /locatebiome): bmAt
let bmAt = 0;
function biomeAt(x, z) {
  if (dim == 0) { if (flatOn == 1) { bmAt = 2; } else { if (genVer >= 2) { bmAt = TBM[tBiomeQ(idiv(x, 4), idiv(z, 4)) + 1]; } else { gridOn = 0; columnShape(x, z); bmAt = colB; } } }
  else { if (dim == 1) { ashBiome(x, z); bmAt = abm; } else { bmAt = 10; } }
}

// ---------------------------------------------------------------- caves (worms), cut into one chunk
// A worm starts in a chunk near (made from that chunk's own random numbers), so every chunk it
// passes through cuts the same tunnel. Only cells inside the box gx0..gx1, gz0..gz1 are cut.
let gx0 = 0, gx1 = 0, gz0 = 0, gz1 = 0;
// The balls of a source chunk's worms are walked once and kept (WB*, a ring cache of CVN x CVN
// source chunks); every chunk near reads them again instead of walking the worms again.
let WBX = [], WBY = [], WBZ = [], WBR = [], CVX = [], CVZ = [], CV0 = [], CVC = [];
// ((v3.5) a ball's reach up and down WBV, and for a ravine's the place of its table in RVS (WBK, 0 a cave's))
let WBV = [], WBK = [], RVS = [], RVT = [], TQ = [];
function cavesInit() {
  WBX = []; WBY = []; WBZ = []; WBR = []; CVX = []; CVZ = []; CV0 = []; CVC = []; WBV = []; WBK = []; RVS = []; TQ = [];
  if (RVT.length == 0) { let j = 0; while (j < WY) { RVT.push(0); j = j + 1; } }
  let i = 0;
  while (i < CVN * CVN) { CVX.push(999999); CVZ.push(0); CV0.push(0); CVC.push(0); i = i + 1; }
}
// ---------------------------------------------------------------- (v3.5) the genre's caves
// A chunk in seven begins caves: a few starts (often none), each low more often than high; at a start one
// tunnel, or a round room with up to four tunnels out of it. A tunnel runs up to 112 blocks, turning and
// swelling toward its middle, and a wide one forks once into two narrow ones. A chunk in fifty begins a
// ravine: a tunnel three times as high as wide, its walls stepped by the height. Walked once for the source
// chunk and kept as balls (WB*), as the worms were.
function ballPush(x, y, z, r, v, k) { WBX.push(x); WBY.push(y); WBZ.push(z); WBR.push(r); WBV.push(v); WBK.push(k); }
function caveTunnel(x0, y0, z0, w, yaw0, pitch0, j0, len) {
  let x = x0, y = y0, z = z0, yaw = yaw0, pitch = pitch0, j = j0;
  let br = rndI(0, idiv(len, 2) - 1) + idiv(len, 4), steep = rndI(1, 6), f = 0, g = 0, d = 0, cp = 0;
  while (j < len) {
    d = 1.5 + sind(j * 180 / len) * w;
    cp = cosd(pitch);
    x = x + cosd(yaw) * cp; y = y + sind(pitch); z = z + sind(yaw) * cp;
    if (steep == 1) { pitch = pitch * 0.92; } else { pitch = pitch * 0.7; }
    pitch = pitch + g * 0.1; yaw = yaw + f * 0.1;
    g = g * 0.9; f = f * 0.75;
    g = g + (rnd() - rnd()) * rnd() * 114.6; f = f + (rnd() - rnd()) * rnd() * 229.2;
    if (j == br && w > 1) {
      // the fork: two narrow tunnels to either side, from here to the same end
      TQ.push(x); TQ.push(y); TQ.push(z); TQ.push(rnd() * 0.5 + 0.5); TQ.push(yaw - 90); TQ.push(pitch / 3); TQ.push(j); TQ.push(len);
      TQ.push(x); TQ.push(y); TQ.push(z); TQ.push(rnd() * 0.5 + 0.5); TQ.push(yaw + 90); TQ.push(pitch / 3); TQ.push(j); TQ.push(len);
      j = len;
    } else {
      // (three steps in four are cut; of a wide tunnel every other one is enough - the balls overlap)
      if (rndI(1, 4) != 1) { if (d < 2 || mod(j, 2) == 0) { ballPush(x, y, z, d, d, 0); } }
    }
    j = j + 1;
  }
}
function cavesNew(a, c) {
  if (rndI(1, 7) == 1) {
    let n = rndI(0, 14);
    n = rndI(0, n); n = rndI(0, n);
    while (n > 0) {
      let x = a * 16 + rndI(0, 15), yt = rndI(0, 119) + 7, z = c * 16 + rndI(0, 15), tun = 1;
      let y = rndI(0, yt);
      if (rndI(1, 4) == 1) {
        let w0 = 2.5 + rnd() * 6;
        ballPush(x + 1, y, z, w0, w0 * 0.5, 0);
        tun = tun + rndI(0, 3);
      }
      while (tun > 0) {
        let yaw = rnd() * 360, pitch = (rnd() - 0.5) * 14.3, w = rnd() * 2 + rnd();
        if (rndI(1, 10) == 1) { w = w * (rnd() * rnd() * 3 + 1); }
        let len = 112 - rndI(0, 27);
        caveTunnel(x, y, z, w, yaw, pitch, 0, len);
        tun = tun - 1;
      }
      let q = 1;
      while (q < TQ.length) { caveTunnel(TQ[q], TQ[q + 1], TQ[q + 2], TQ[q + 3], TQ[q + 4], TQ[q + 5], TQ[q + 6], TQ[q + 7]); q = q + 8; }
      TQ = [];
      n = n - 1;
    }
  }
}
function ravineNew(a, c) {
  let x = a * 16 + rndI(0, 15), yt = rndI(0, 39) + 7, z = c * 16 + rndI(0, 15);
  let y = rndI(0, yt) + 20;
  let yaw = rnd() * 360, pitch = (rnd() - 0.5) * 14.3, w = (rnd() * 2 + rnd()) * 2, len = 112 - rndI(0, 27);
  // how much narrower the ravine is at each height (1 .. 4), in steps a few blocks high
  let k = RVS.length + 1, i = 0, st = 1;
  while (i < WY) { if (i == 0 || rndI(1, 3) == 1) { st = 1 + rnd() * rnd(); st = st * st; } RVS.push(st); i = i + 1; }
  let f = 0, g = 0, d = 0, e = 0, cp = 0, j = 0;
  while (j < len) {
    d = 1.5 + sind(j * 180 / len) * w; e = d * 3;
    d = d * (rnd() * 0.25 + 0.75); e = e * (rnd() * 0.25 + 0.75);
    cp = cosd(pitch);
    x = x + cosd(yaw) * cp; y = y + sind(pitch); z = z + sind(yaw) * cp;
    pitch = pitch * 0.7 + g * 0.05; yaw = yaw + f * 0.05;
    g = g * 0.8; f = f * 0.5;
    g = g + (rnd() - rnd()) * rnd() * 114.6; f = f + (rnd() - rnd()) * rnd() * 229.2;
    if (rndI(1, 4) != 1) { if (d < 2 || mod(j, 2) == 0) { ballPush(x, y, z, d, e, k); } }
    j = j + 1;
  }
}
// a ball cut out of the chunk: a cave's is round with a flat floor (0.7 of its reach under the middle), a
// ravine's (k > 0) upright, as wide at each height as its table says
function carveEll(cx, cy, cz, rh, rv, k) {
  let x0 = Math.max(gx0, Math.floor(cx - rh)), x1 = Math.min(gx1, Math.floor(cx + rh));
  let z0 = Math.max(gz0, Math.floor(cz - rh)), z1 = Math.min(gz1, Math.floor(cz + rh));
  if (x0 <= x1 && z0 <= z1) {
    let x = x0, z = 0, y = 0, i = 0, j = 0, b = 0, ya = 0, yb = 0, q = 0, dx = 0, dz = 0, h = 0, lo = 0, qi = 0, yy = 0, tp = 0, cut = 0, dry = 0;
    let ylo = Math.max(1, Math.ceil(cy - rv - 0.5)), yhi = Math.min(WY - 2, Math.floor(cy + rv - 0.5));
    if (k > 0) {
      // (how far out each height is cut, x 4096 of the reach squared: once for the ball)
      y = ylo;
      while (y <= yhi) { dz = (y + 0.5 - cy) / rv; RVT[y - ylo + 1] = Math.floor((1 - dz * dz / 6) / RVS[k + y] * 4096); y = y + 1; }
    }
    while (x <= x1) {
      dx = (x + 0.5 - cx) / rh; dx = dx * dx;
      z = z0;
      while (z <= z1) {
        dz = (z + 0.5 - cz) / rh; q = dx + dz * dz;
        if (q < 1) {
          if (k == 0) {
            h = Math.sqrt(1 - q) * rv; lo = Math.min(h, rv * 0.7);
            ya = Math.max(1, Math.ceil(cy - lo - 0.5)); yb = Math.min(WY - 2, Math.floor(cy + h - 0.5));
          } else { ya = ylo; yb = yhi; qi = Math.floor(q * 4096); }
          i = (mod(x, WS) * WS + mod(z, WS)) * WY + ya + 1;
          // (three blocks of ground stay under water, where the ball reaches up to it)
          j = i; yy = ya; tp = Math.min(WY - 2, yb + 3);
          while (yy <= tp) { if (W[j] == 7 || W[j] == 33) { yb = Math.min(yb, yy - 4); yy = tp; } yy = yy + 1; j = j + 1; }
          y = ya;
          while (y <= yb) {
            b = W[i];
            if (b != 0 && b != 6 && b != 7 && b != 33 && b != 35) {
              cut = 1;
              if (k > 0) { if (qi >= RVT[y - ylo + 1]) { cut = 0; } }
              if (cut == 1) {
                // (nor beside water, in this chunk: what a chunk is made of may not hang on its neighbours)
                dry = 1;
                if (x > gx0) { if (W[i - SXS] == 7) { dry = 0; } } if (x < gx1) { if (W[i + SXS] == 7) { dry = 0; } }
                if (z > gz0) { if (W[i - WY] == 7) { dry = 0; } } if (z < gz1) { if (W[i + WY] == 7) { dry = 0; } }
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
    if (genVer >= 3) { cavesNew(a, c); chunkSeed(a, c, 8); if (rndI(1, 50) == 1) { ravineNew(a, c); } }
    else { if (rnd() < 0.62) { n = 1; if (rnd() < 0.45) { n = 2; } } }
    while (n > 0) { wormBalls(a, c); n = n - 1; }
    CVC[s] = WBX.length + 1 - CV0[s];
  }
  cvA = CV0[s]; cvN = CVC[s];
}
function genCaves(cx, cz) {
  gx0 = cx * 16; gx1 = gx0 + 15; gz0 = cz * 16; gz1 = gz0 + 15;
  // ((v3.5) the genre's tunnels are up to 112 blocks long: the source chunks seven away each way)
  let rg = 4;
  if (genVer >= 3) { rg = 7; }
  let a = cx - rg, c = 0, k = 0, ke = 0, r = 0, bx = 0, bz = 0;
  while (a <= cx + rg) {
    c = cz - rg;
    while (c <= cz + rg) {
      cavesOf(a, c);
      k = cvA; ke = cvA + cvN;
      while (k < ke) {
        bx = WBX[k]; bz = WBZ[k]; r = WBR[k];
        if (bx + r >= gx0) { if (bx - r <= gx1 + 1) { if (bz + r >= gz0) { if (bz - r <= gz1 + 1) { if (genVer >= 3) { carveEll(bx, WBY[k], bz, r, WBV[k], WBK[k]); } else { carveBall(bx, WBY[k], bz, r); } } } } }
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
  while (k > 0) { if (hi == 0) { genLump(b, ylo, yhi); } else { genVein(b, rndI(lo, hi), ylo, yhi); } k = k - 1; }
}
let treeClip = 0;
// (a tree's own block: inside the chunk being made only, while the world makes it)
function tput(x, y, z, b) { if (treeClip == 0 || (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1)) { wput(x, y, z, b); } }
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
    while (k <= h) { tput(x, y + k, z, 13); k = k + 1; }
    leafBall(x, y + h, z, 3, 14);
    let d = rndI(0, 3);
    tput(x + dirX(d), y + h - 2, z + dirZ(d), 13); leafBall(x + dirX(d) * 2, y + h - 2, z + dirZ(d) * 2, 2, 14);
    tput(x, y, z, 3);
  }
}
function jungleTree(x, y, z) {
  let h = rndI(8, 13), k = 1, lg = I_mahoganyLog, lv = I_mahoganyLeaves;
  if (y + h + 3 < WY) {
    while (k <= h) { tput(x, y + k, z, lg); k = k + 1; }
    leafBall(x, y + h, z, 3, lv); leafBall(x, y + h + 2, z, 2, lv);
    // vines down the sides of the crown
    let a = 0 - 3;
    while (a <= 3) { if (rnd() < 0.35) { let yy = y + h - 1; while (yy > y + h - 5) { setIfAir(x + a, yy, z - 4, I_vines); setIfAir(x + a, yy, z + 4, I_vines); yy = yy - 1; } } a = a + 1; }
    tput(x, y, z, 3);
  }
}
function acaciaTree(x, y, z) {
  let h = rndI(4, 6), k = 1, lg = I_acaciaLog, lv = I_acaciaLeaves, d = rndI(0, 3), ax = x, az = z;
  if (y + h + 4 < WY) {
    while (k <= h) { if (k > h - 2) { ax = x + dirX(d) * (k - h + 2); az = z + dirZ(d) * (k - h + 2); } tput(ax, y + k, az, lg); k = k + 1; }
    let a = 0 - 3;
    while (a <= 3) { let c = 0 - 3; while (c <= 3) { if (Math.abs(a) + Math.abs(c) <= 4) { setIfAir(ax + a, y + h + 1, az + c, lv); } if (Math.abs(a) + Math.abs(c) <= 2) { setIfAir(ax + a, y + h + 2, az + c, lv); } c = c + 1; } a = a + 1; }
    tput(x, y, z, 3);
  }
}
function ebonyTree(x, y, z) {
  let h = rndI(6, 8), k = 1, lg = I_ebonyLog, lv = I_ebonyLeaves;
  if (y + h + 4 < WY) {
    while (k <= h) { tput(x, y + k, z, lg); tput(x + 1, y + k, z, lg); tput(x, y + k, z + 1, lg); tput(x + 1, y + k, z + 1, lg); k = k + 1; }
    let a = 0 - 3;
    while (a <= 4) { let c = 0 - 3; while (c <= 4) { if (Math.abs(a - 0.5) + Math.abs(c - 0.5) <= 5.5) { setIfAir(x + a, y + h, z + c, lv); setIfAir(x + a, y + h - 1, z + c, lv); } if (Math.abs(a - 0.5) + Math.abs(c - 0.5) <= 3.5) { setIfAir(x + a, y + h + 1, z + c, lv); } c = c + 1; } a = a + 1; }
    tput(x, y, z, 3); tput(x + 1, y, z, 3); tput(x, y, z + 1, 3); tput(x + 1, y, z + 1, 3);
  }
}
// the great fungi of the depths: a stem and a cap with lanterns under it
function hugeFungus(x, y, z, st, cap) {
  let h = rndI(5, 9), k = 1;
  if (y + h + 3 < UH - 2) {
    while (k <= h) { tput(x, y + k, z, st); k = k + 1; }
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
    while (k <= h) { tput(x, y + k, z, I_mushStem); k = k + 1; }
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
    while (k <= h) { tput(x, y + k, z, lg); k = k + 1; }
    tput(x, y, z, 3);
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
  if (b == 3) { if (above == 0) { if (y >= SEA || (genVer >= 2 && y == SEA - 1)) { b = 2; if (bi == 6 || bi == 19 || bi == 27 || y > SEA + 34) { b = 20; } W[i] = b; } } }
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
      if (bi == 27) { tc = 0.05; kind = 2; }
      if (bi == 7) { tc = 0.02; kind = 2; if (rnd() < 0.4) { kind = 0; } }
      if (bi == 11) { tc = 0.1; kind = 3; }
      if (bi == 12) { tc = 0.008; kind = 4; }
      if (bi == 13) { tc = 0.02; kind = 0; }
      if (bi == 15) { tc = 0.11; kind = 5; }
      if (bi == 17) { tc = 0.06; kind = 1; }
      if (bi == 18) { tc = 0.04; if (rnd() < 0.4) { kind = 1; } }
      if (r < tc && inner == 1 && genVer < 3) {
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
        if (bi == 18) { fl = 0.22; } if (bi == 16 || bi == 6 || bi == 19) { g = 0; fl = 0; } if (bi == 27) { g = 0.03; fl = 0; } if (bi == 13) { fl = 0.02; } if (bi == 15) { g = 0.05; fl = 0; }
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
// ---------------------------------------------------------------- (v3.5) the trees of the land
// Where a tree stands is a matter of its column alone - a number made of the seed and (x, z), smaller than
// the four beside it and under what the column's biome asks (TTHR, of 1048576: ten trees a chunk in a forest,
// fifty in a jungle, one in twenty chunks on a plain - the genre's counts). So a chunk knows the trees of the
// chunks round it without their being made, and puts the part of each that reaches into it: no tree is cut
// at a border, and none is kept from the three columns by one (they stood only 3 .. 12 into a chunk). The
// ground of a tree beside the chunk is the land's own top there (terra.js tPoint).
let TTHR = [0, 0, 840, 45729, 0, 45729, 840, 4210, 0, 0, 0, 175553, 5270, 10700, 0, 118168, 0, 45729, 27630, 0, 0, 0, 0, 0, 0, 0, 0, 45729];
let TRH = [];
function treeHash(x, z) {
  let r = mod((mod(x * 7919 + z * 104729 + 577, 46337) + 1) * (mod(x * 15485863 + z * 32452843 + lsd, 46349) + 1), 2147483646) + 1;
  r = (r * 48271) % 2147483647;
  return mod(idiv(r, 64), 1048576);
}
function treesO(cx, cz) {
  if (TRH.length == 0) { let q = 0; while (q < 784) { TRH.push(0); q = q + 1; } }
  let a = 0, c = 0, k = 1, h = 0, x = 0, z = 0, bi = 0, y0 = 0, ok = 0, ci = 0, kind = 0, rk = 0;
  while (a < 28) { c = 0; while (c < 28) { TRH[k] = treeHash(gx0 + a - 6, gz0 + c - 6); k = k + 1; c = c + 1; } a = a + 1; }
  a = 1;
  while (a < 27) {
    c = 1;
    while (c < 27) {
      k = a * 28 + c + 1; h = TRH[k];
      if (h < 175553) { if (h < TRH[k - 28]) { if (h < TRH[k + 28]) { if (h < TRH[k - 1]) { if (h < TRH[k + 1]) {
        x = gx0 + a - 6; z = gz0 + c - 6; ok = 0;
        if (a >= 6 && a <= 21 && c >= 6 && c <= 21) {
          ci = wcol(x, z); bi = BIOM[ci]; y0 = HMAP[ci];
          if (h < TTHR[bi + 1]) {
            // (in this chunk: only where the ground is still there - no cave, lake or sand took it)
            let i = (ci - 1) * WY + y0 + 1, b = W[i];
            if (b == 2 || b == 20 || b == I_podzol || b == I_coarseDirt || b == I_mycelium) { if (BSOL[W[i + 1] + 1] != 1 && BLQ[W[i + 1] + 1] == 0) { ok = 1; } }
          }
        } else {
          let ncx = idiv(x, 16), ncz = idiv(z, 16);
          tEntry(ncx, ncz); tBiomeCol(ncx, ncz, x, z); bi = TBM[tbI + 1];
          if (h < TTHR[bi + 1]) { tPoint(x, z); y0 = colH; ok = 1; }
        }
        if (ok == 1) { if (y0 >= SEA && y0 < WY - 24) {
          // (the tree's own random numbers: the same from whichever chunk it is put)
          rs = mod(h * 2039 + x * 73856093 + z * 19349663 + seed, 2147483646) + 1;
          rk = rnd(); rk = rnd();
          kind = 0;
          if (bi == 2 || bi == 3) { if (rk < 0.2) { kind = 1; } }
          if (bi == 5 || bi == 6 || bi == 27) { kind = 2; }
          if (bi == 7) { kind = 2; if (rk < 0.34) { kind = 0; } }
          if (bi == 11) { kind = 3; } if (bi == 12) { kind = 4; } if (bi == 15) { kind = 5; } if (bi == 17) { kind = 1; }
          if (bi == 18) { if (rk < 0.4) { kind = 1; } }
          growTreeKind(x, y0, z, kind);
          // swamp oaks carry vines
          if (bi == 13) { let v = 0; while (v < 6) { let vx = x + rndI(-2, 2), vz = z + rndI(-2, 2); setIfAir(vx, y0 + 4, vz, I_vines); v = v + 1; } }
        } }
      } } } } }
      c = c + 1;
    }
    a = a + 1;
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
      if (bi == 26) { if (r < 0.15) { W[j + 1] = I_seagrass; } }
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
// ((v3.5) the ores at the genre's heights and in its numbers a chunk: coal to 127, iron to 63, gold to 31 (and
// to 79 in the red canyons), spark ore and diamonds to 15, lapis about 16, jade one by one in the mountains;
// earth, gravel and the three rocks in lumps)
function oresNew(cx, cz) {
  veins(3, 10, 0, 0, 0, WY - 1); veins(9, 8, 0, 0, 0, WY - 1);
  veins(I_granite, 10, 0, 0, 0, 79); veins(I_limestone, 10, 0, 0, 0, 79); veins(I_slate, 10, 0, 0, 0, 79);
  veins(12, 20, 22, 28, 1, 127);
  veins(11, 20, 5, 8, 1, 63);
  veins(10, 2, 5, 8, 1, 31);
  veins(I_oreSpark, 8, 4, 7, 1, 15);
  veins(16, 1, 5, 7, 1, 15);
  let ly = rndI(0, 15) + rndI(0, 15);
  veins(40, 1, 4, 6, ly, ly);
  colB = BIOM[wcol(cx * 16 + 8, cz * 16 + 8)];
  if (colB == 14) { veins(10, 20, 5, 8, 32, 79); }
  if (colB == 7) { veins(I_oreJade, rndI(3, 8), 1, 1, 4, 31); }
}
// a lump of b in the stone: a flat ball of some fifty blocks (its three reaches squared into 4096, in whole numbers)
function genLump(b, ylo, yhi) {
  let x = gx0 + rndI(0, 15), z = gz0 + rndI(0, 15), y = rndI(ylo, yhi);
  let ra = rndI(20, 35), rc = rndI(20, 35), re = rndI(12, 20);
  if (y <= HMAP[wcol(x, z)] + 3) {
    let qa = idiv(409600, ra * ra), qc = idiv(409600, rc * rc), qe = idiv(409600, re * re);
    let a = Math.max(gx0, x - 3), a1 = Math.min(gx1, x + 3), c0 = Math.max(gz0, z - 3), c1 = Math.min(gz1, z + 3), e0 = Math.max(1, y - 2), e1 = Math.min(WY - 2, y + 2);
    while (a <= a1) {
      let c = c0, da = (a - x) * (a - x) * qa;
      while (c <= c1) {
        let dc = da - (0 - (c - z) * (c - z) * qc);
        if (dc < 4096) {
          let e = e0, i = (mod(a, WS) * WS + mod(c, WS)) * WY + e0 + 1;
          while (e <= e1) { if (dc - (0 - (e - y) * (e - y) * qe) < 4096) { if (W[i] == 1) { W[i] = b; } } e = e + 1; i = i + 1; }
        }
        c = c + 1;
      }
      a = a + 1;
    }
  }
}
function featuresO(cx, cz) {
  chunkSeed(cx, cz, 2);
  if (genVer >= 3) { oresNew(cx, cz); } else { oresOld(cx, cz); }
  featuresO2(cx, cz);
}
function featuresO2(cx, cz) {
  // ((v3.4) a lake in one chunk of four, dug into the ground where it holds water (terra.js), before the trees;
  // (v3.5) and of lava in one of eight, nearly all of them under the ground)
  if (genVer >= 2) {
    chunkSeed(cx, cz, 7);
    if (rndI(1, 4) == 1) { tLake(7, rndI(0, WY - 1)); }
    if (rndI(1, 8) == 1) { let lt = rndI(0, 247) + 7, ly = rndI(0, lt); if (ly < SEA || rndI(1, 10) == 1) { tLake(35, ly); } }
  }
  chunkSeed(cx, cz, 3);
  let lx = 0, lz = 0;
  while (lx < 16) {
    lz = 0;
    while (lz < 16) { decorate(gx0 + lx, gz0 + lz, lx, lz); lz = lz + 1; }
    lx = lx + 1;
  }
  if (genVer >= 3) { treesO(cx, cz); }
  // now and then a broken gate frame of obsidian on the ground (with what fell off lying by it)
  chunkSeed(cx, cz, 4);
  if (rndI(1, 9) == 1) { ruinFrame(gx0 + rndI(4, 9), gz0 + rndI(5, 10)); }
  // (v2.3.2) springs in the cave walls, lava ones deep down, and a lava lake on the land now and then
  chunkSeed(cx, cz, 6);
  // ((v3.5) the genre's numbers: fifty tries for water, twenty for lava, the low heights more often)
  if (genVer >= 3) { springs(1, 50, 7, 0 - 1, 0); springs(1, 20, 35, 0 - 2, 0); }
  else { springs(1, 14, 7, 10, 70); springs(1, 6, 35, 6, 30); if (rndI(1, 40) == 1) { lavaLake(gx0 + 8, gz0 + 8); } }
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
// ((11-26) across a chunk's border only into a chunk that is lit: cLit)
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
      else { t = lz - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(lx, 16) * NCH + idiv(t, 16) + 1] >= 4) { n = (lx * WS + t) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lz, 16) != 15) { n = i + WY; M_spread(n, ln, which); }
      else { t = lz + 1; if (t >= WS) { t = 0; } if (CKST[idiv(lx, 16) * NCH + idiv(t, 16) + 1] >= 4) { n = (lx * WS + t) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lx, 16) != 0) { n = i - SXS; M_spread(n, ln, which); }
      else { t = lx - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(t, 16) * NCH + idiv(lz, 16) + 1] >= 4) { n = (t * WS + lz) * WY + y + 1; M_spread(n, ln, which); } }
      if (mod(lx, 16) != 15) { n = i + SXS; M_spread(n, ln, which); }
      else { t = lx + 1; if (t >= WS) { t = 0; } if (CKST[idiv(t, 16) * NCH + idiv(lz, 16) + 1] >= 4) { n = (t * WS + lz) * WY + y + 1; M_spread(n, ln, which); } }
    }
  }
  lqHead = 1; lqTail = 0;
}
function M_spread(N, LN, WH) {
  let nb = W[N];
  if (BLOP[nb + 1] == 0) {
    // ((v2.7) water, leaves, ice cost one a cell like air, as the genre: they stop only the sky's
    // straight fall (it was two: the sea floor was dark seven down)
    let ll = LN;
    let lt = LT[N], sk = idiv(lt, 16);
    if (WH == 0) { if (sk < ll) { LT[N] = ll * 16 + lt - sk * 16; lqPush(N); } }
    else { if (lt - sk * 16 < ll) { LT[N] = sk * 16 + ll; lqPush(N); } }
  }
}
// the sky straight down a column: 15 until the first block that stops it; skyFloor: the first
// y with full sky
// ((v3.5) skyTop: the highest cell that holds anything - the air over it is lit straight)
let skyFloor = 0, skyTop = 0;
function skyColumn(x, z) {
  let i = (mod(x, WS) * WS + mod(z, WS)) * WY + WY, y = WY - 1, open = 1, b = 0, v = 0;
  // ((11-26) written only where it is not so already: the air over the slot's last chunk was as bright, and a
  // write makes a new value each time)
  while (y >= 0) { if (W[i] != 0) { break; } if (LT[i] != 240) { LT[i] = 240; } y = y - 1; i = i - 1; }
  skyTop = y;
  while (y >= 0) {
    b = W[i];
    if (open == 1) { if (BLOP[b + 1] == 1 || BHC[b + 1] != 0) { open = 0; skyFloor = y + 1; } }
    // ((11-26) as above: under the ground most cells are as dark as the last chunk's were)
    if (open == 1) { v = 240 + BLIT[b + 1]; } else { v = BLIT[b + 1]; }
    if (LT[i] != v) { LT[i] = v; }
    y = y - 1; i = i - 1;
  }
  if (open == 1) { skyFloor = 0; }
}
// relight the world columns x0..x1, z0..z1 (all heights, chunks that are made only): sky
// straight down, then spread from what is lit in the box and from the ring of cells round it
let SFL = [], STP = [], CKTOP = [], rlTop = 0;
// (v2.6) the settings: light worked out (1) or not (0: every cell as under the open sky, nothing
// lit again when blocks change - the dear part, 29 x 29 columns a change)
let lightOn = 1;
function relight(x0, x1, z0, z1) {
  if (lightOn == 1) { relight1(x0, x1, z0, z1); } else { lightFlat(x0, x1, z0, z1); }
}
function lightFlat(x0, x1, z0, z1) {
  let x = x0, z = 0, y = 0, i = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      if (cOK(x, z) == 1) {
        i = (mod(x, WS) * WS + mod(z, WS)) * WY + 1; y = 0; while (y < WY) { LT[i] = 240; y = y + 1; i = i + 1; }
        // ((v3.5) and the column's highest block, as skyColumn finds it)
        y = WY - 1; i = i - 1;
        while (y >= 0) { if (W[i] != 0) { break; } y = y - 1; i = i - 1; }
        STP[wcol(x, z)] = y; if (y > rlTop) { rlTop = y; }
      }
      z = z + 1;
    }
    x = x + 1;
  }
}
// switched: the chunks made are lit again (or made flat) and meshed again, a few a frame (LRQ the
// chunk's slot, LRM 0 its columns' sky first, 1 then the light spread, 2 flat)
let LRQ = [], LRM = [];
function lightSet(on) {
  lightOn = on;
  LRQ = []; LRM = [];
  let s = 1, m = 2;
  if (on == 1) { m = 0; }
  // ((11-26) the chunks lit and waiting to be meshed too)
  while (s <= NCH * NCH) { if (CKST[s] >= 4) { LRQ.push(s); LRM.push(m); } s = s + 1; }
  if (on == 1) { s = 1; while (s <= NCH * NCH) { if (CKST[s] >= 4) { LRQ.push(s); LRM.push(1); } s = s + 1; } }
}
function lightRedoStep() {
  let n = 0;
  while (n < 4 && LRQ.length > 0) {
    let s = LRQ[1], m = LRM[1];
    LRQ.removeAt(1); LRM.removeAt(1);
    if (CKST[s] >= 4) {
      let cx = CKX[s], cz = CKZ[s];
      if (m == 0) { let x = cx * 16; while (x < cx * 16 + 16) { let z = cz * 16; while (z < cz * 16 + 16) { skyColumn(x, z); SFL[wcol(x, z)] = skyFloor; STP[wcol(x, z)] = skyTop; z = z + 1; } x = x + 1; } n = n + 1; }
      else {
        if (m == 1) { relight1(cx * 16, cx * 16 + 15, cz * 16, cz * 16 + 15); } else { lightFlat(cx * 16, cx * 16 + 15, cz * 16, cz * 16 + 15); }
        let a = 0;
        while (a < 2) { let c = 0; while (c < 2) { let y = 0; while (y < NSY) { remeshLater(secOf(cx * 16 + a * 8, y * 8, cz * 16 + c * 8)); y = y + 1; } c = c + 1; } a = a + 1; }
        n = 4;
      }
    }
  }
}
// (v2.6) a cell's own light became e: more spreads from it; less is taken back from what it lit (the
// cells lit less than it, one step on from it) and those still lit by others spread again (the
// genre's way). It was the whole 29 x 29 columns round it each time (a lamp's clock was slow)
let RMX = [], RMY = [], RMZ = [], RML = [];
function blockLightSet(x, y, z, e) {
  if (y >= 0 && y < WY && cLit(x, z) == 1) {
    let i = wi(x, y, z), cur = mod(LT[i], 16), sk = LT[i] - cur;
    if (e > cur) { LT[i] = sk + e; lqPush(i); lightSpread(1); }
    if (e < cur) {
      LT[i] = sk;
      RMX = []; RMY = []; RMZ = []; RML = [];
      RMX.push(x); RMY.push(y); RMZ.push(z); RML.push(cur);
      let h = 1;
      while (h <= RMX.length && h < 6000) {
        let cx = RMX[h], cy = RMY[h], cz = RMZ[h], l = RML[h], d = 0;
        while (d < 6) {
          let nx = cx + DX6[d + 1], ny = cy + DY6[d + 1], nz = cz + DZ6[d + 1];
          if (ny >= 0 && ny < WY) { if (cLit(nx, nz) == 1) {
            let j = wi(nx, ny, nz), bl = mod(LT[j], 16);
            if (bl > 0) {
              if (bl < l) {
                LT[j] = LT[j] - bl; RMX.push(nx); RMY.push(ny); RMZ.push(nz); RML.push(bl);
                // (a light of its own: back, and spread again)
                let own = BLIT[W[j] + 1];
                if (own > 0) { LT[j] = LT[j] + own; lqPush(j); }
              } else { lqPush(j); }
            }
          } }
          d = d + 1;
        }
        h = h + 1;
      }
      if (e > 0) { LT[i] = sk + e; lqPush(i); }
      lightSpread(1);
      RMX = []; RMY = []; RMZ = []; RML = [];
    }
  }
}
// (v2.6) one cell that stops or dims the light differently now (a block put or broken, one moved by a
// piston): both lights worked out from it alone, as the genre - what it lit, or what came through it,
// taken back (ch 0 the sky: also the open sky straight down from it), then spread again from what is
// left, and from the open sky over it when it lets that through. It was the 29 x 29 columns round it.
function lvOf(i, ch) { let r = mod(LT[i], 16); if (ch == 0) { r = idiv(LT[i], 16); } return r; }
function lvSet(i, ch, v) { if (ch == 0) { LT[i] = v * 16 + mod(LT[i], 16); } else { LT[i] = LT[i] - mod(LT[i], 16) + v; } }
function lightTake(ch, x, y, z, l0) {
  RMX = []; RMY = []; RMZ = []; RML = [];
  RMX.push(x); RMY.push(y); RMZ.push(z); RML.push(l0);
  let h = 1;
  while (h <= RMX.length && h < 20000) {
    let cx = RMX[h], cy = RMY[h], cz = RMZ[h], l = RML[h], d = 0;
    while (d < 6) {
      let nx = cx + DX6[d + 1], ny = cy + DY6[d + 1], nz = cz + DZ6[d + 1];
      if (ny >= 0 && ny < WY) { if (cLit(nx, nz) == 1) {
        let j = wi(nx, ny, nz), bl = lvOf(j, ch);
        if (bl > 0) {
          // (less than it: from it; the open sky's 15 straight down: from it too)
          if (bl < l || (ch == 0 && d == 2 && bl == 15 && l == 15)) {
            lvSet(j, ch, 0); RMX.push(nx); RMY.push(ny); RMZ.push(nz); RML.push(bl);
            if (ch == 1) { let own = BLIT[W[j] + 1]; if (own > 0) { lvSet(j, 1, own); lqPush(j); } }
          } else { lqPush(j); }
        }
      } }
      d = d + 1;
    }
    h = h + 1;
  }
  RMX = []; RMY = []; RMZ = []; RML = [];
}
function lightCell(x, y, z) {
  if (y >= 0 && y < WY && cLit(x, z) == 1) {
    let i = wi(x, y, z), b = W[i], s = lvOf(i, 0), d = 0;
    // the sky
    if (s > 0) { lvSet(i, 0, 0); lightTake(0, x, y, z, s); }
    if (BLOP[b + 1] == 0) {
      if (BHC[b + 1] == 0) {
        let up = 15; if (y + 1 < WY) { up = lvOf(wi(x, y + 1, z), 0); }
        if (up == 15) {
          let yy = y, k = i;
          while (yy >= 0) {
            let bb = W[k];
            if (BLOP[bb + 1] == 1 || BHC[bb + 1] != 0) { yy = 0 - 1; }
            else { lvSet(k, 0, 15); lqPush(k); yy = yy - 1; k = k - 1; }
          }
        }
      }
      d = 0;
      while (d < 6) {
        let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1];
        if (ny >= 0 && ny < WY) { if (cLit(nx, nz) == 1) { let j = wi(nx, ny, nz); if (lvOf(j, 0) > 1) { lqPush(j); } } }
        d = d + 1;
      }
    }
    lightSpread(0);
    // the blocks' light
    let c = lvOf(i, 1);
    if (c > 0) { lvSet(i, 1, 0); lightTake(1, x, y, z, c); }
    if (BLOP[b + 1] == 0) {
      d = 0;
      while (d < 6) {
        let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1];
        if (ny >= 0 && ny < WY) { if (cLit(nx, nz) == 1) { let j = wi(nx, ny, nz); if (lvOf(j, 1) > 1) { lqPush(j); } } }
        d = d + 1;
      }
    }
    if (BLIT[b + 1] > 0) { lvSet(i, 1, Math.max(lvOf(i, 1), BLIT[b + 1])); lqPush(i); }
    lightSpread(1);
  }
}
function relight1(x0, x1, z0, z1) {
  let x = x0, z = 0, y = 0, i = 0, f = 0, m = 0, mx = 0, k = 0;
  rlTop = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) { if (cLit(x, z) == 1) { skyColumn(x, z); k = wcol(x, z); SFL[k] = skyFloor; STP[k] = skyTop; if (skyFloor > mx) { mx = skyFloor; } if (skyTop > rlTop) { rlTop = skyTop; } } z = z + 1; }
    x = x + 1;
  }
  // sky seeds: the lit cells of a column down from the lowest floor round it
  x = x0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      if (cLit(x, z) == 1) {
        f = SFL[wcol(x, z)]; m = f;
        // (outside the box: the neighbour's own floor, when its chunk is made)
        if (x > x0) { m = Math.max(m, SFL[wcol(x - 1, z)]); } else { if (cLit(x - 1, z) == 1) { m = Math.max(m, SFL[wcol(x - 1, z)]); } }
        if (x < x1) { m = Math.max(m, SFL[wcol(x + 1, z)]); } else { if (cLit(x + 1, z) == 1) { m = Math.max(m, SFL[wcol(x + 1, z)]); } }
        if (z > z0) { m = Math.max(m, SFL[wcol(x, z - 1)]); } else { if (cLit(x, z - 1) == 1) { m = Math.max(m, SFL[wcol(x, z - 1)]); } }
        if (z < z1) { m = Math.max(m, SFL[wcol(x, z + 1)]); } else { if (cLit(x, z + 1) == 1) { m = Math.max(m, SFL[wcol(x, z + 1)]); } }
        y = f; i = (mod(x, WS) * WS + mod(z, WS)) * WY + f + 1;
        while (y <= m) { if (y < WY) { if (LT[i] >= 240) { lqPush(i); } } y = y + 1; i = i + 1; }
      }
      z = z + 1;
    }
    x = x + 1;
  }
  // ((v3.5) of the ring only what is not above every floor of the box: the open sky over that lights nothing more)
  relightRing(x0, x1, z0, z1, 0, Math.min(WY - 1, mx));
  lightSpread(0);
  // block light: every source in the box, and the ring
  x = x0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      if (cLit(x, z) == 1) {
        i = (mod(x, WS) * WS + mod(z, WS)) * WY + 1; y = 0; m = STP[wcol(x, z)];
        while (y <= m) { if (mod(LT[i], 16) > 1) { lqPush(i); } y = y + 1; i = i + 1; }
      }
      z = z + 1;
    }
    x = x + 1;
  }
  relightRing(x0, x1, z0, z1, 1, WY - 1);
  lightSpread(1);
}
function relightRing(x0, x1, z0, z1, which, ymax) {
  let x = x0 - 1, z = 0, y = 0, i = 0, l = 0;
  while (x <= x1 + 1) {
    z = z0 - 1;
    while (z <= z1 + 1) {
      if (x < x0 || x > x1 || z < z0 || z > z1) {
        if (cLit(x, z) == 1) {
          i = (mod(x, WS) * WS + mod(z, WS)) * WY + 1; y = 0;
          while (y <= ymax) {
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
let pcxW = -99999, pczW = -99999, nChunks = 0, ckBurst = 0;
let lastStage = 0;
function chunkStage(s) {
  let cx = CKX[s], cz = CKZ[s], st = CKST[s];
  lastStage = lastStage * 10 + st + 1;
  if (st == 0) {
    // (half the columns a step)
    let k = CKSUB[s];
    chunkSeed(cx, cz, k);
    let ng = 0;
    if (dim == 0 && flatOn == 0) { if (genVer >= 2) { ng = 1; tEntry(cx, cz); } else { climateGrid(cx * 16, cz * 16); } }
    let a = k * 8, c = 0;
    while (a < k * 8 + 8) {
      c = 0;
      while (c < 16) {
        if (dim == 0) { if (flatOn == 1) { genFlat(cx * 16 + a, cz * 16 + c); } else { if (ng == 1) { genColumn2(cx * 16 + a, cz * 16 + c); } else { genColumn(cx * 16 + a, cz * 16 + c); } } } else { if (dim == 1) { genColumnU(cx * 16 + a, cz * 16 + c); } else { genColumnV(cx * 16 + a, cz * 16 + c); } }
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
    // ((11-26) its parts put back are looked at later: sparkReady)
    CKRV[s] = rpParts; ckVer = ckVer + 1;
  } else { if (st == 3) {
    rlTop = 0;
    // ((11-26) lit from here on: the light of the chunks round it comes in while its own is worked out)
    CKST[s] = 4;
    relight(cx * 16, cx * 16 + 15, cz * 16, cz * 16 + 15);
    CKTOP[s] = rlTop;
    // ((11-26) lit: the sections of meshed neighbours whose side toward this chunk was left closed - it was after
    // this chunk's own meshing; a side is open to a chunk that is lit, mesh.js)
    nbRemesh(cx - 1, cz, cx * 16 - 8, cz * 16, 0, 8, 2); nbRemesh(cx + 1, cz, cx * 16 + 16, cz * 16, 0, 8, 1);
    nbRemesh(cx, cz - 1, cx * 16, cz * 16 - 8, 8, 0, 8); nbRemesh(cx, cz + 1, cx * 16, cz * 16 + 16, 8, 0, 4);
    // (its animals now, as before for every chunk round the player: its meshing may wait long)
    chunkAnimals(cx, cz);
  } else { if (st == 4) {
    // its 2 x 2 x NSY sections, and the sections of ready neighbours that face it (their
    // faces against this chunk were left out while it was not made)
    // (a quarter of them a step)
    let k = CKSUB[s], a = idiv(k, 2), c = mod(k, 2), y = 0;
    // ((v3.5) the sections over the chunk's highest block are known to be empty: not looked through)
    // ((11-26) and not handed to the mesher: what an empty section is, written here - most of a chunk's sections)
    let x0 = cx * 16 + a * 8, z0 = cz * 16 + c * 8, sb = secOf(x0, 0, z0), top = idiv(CKTOP[s], 8), q = 0;
    while (y < NSY) {
      if (y > top) { q = sb + y; SOX[q] = x0; SOZ[q] = z0; SFN[q] = 0; SOK[q] = 1; SCL[q] = 0; SEMP[q] = 1; SVIS[q] = 68719476735; }
      else { meshSectionAt(x0, y * 8, z0); }
      y = y + 1;
    }
    meshVer = meshVer + 1;
    CKSUB[s] = k + 1;
    if (k == 3) { CKSUB[s] = 0; CKST[s] = 5; }
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
  meshVer = meshVer + 1;
  let cx = CKX[s], cz = CKZ[s];
  CKST[s] = 0; CKSUB[s] = 0; CKRV[s] = 0; CKRD[s] = 0; ckVer = ckVer + 1;
  let a = 0, c = 0, y = 0, k = 0;
  // ((11-26) and its places in the face pool given back: mesh.js poolFree)
  while (a < 2) { c = 0; while (c < 2) { y = 0; while (y < NSY) { k = secOf(cx * 16 + a * 8, y * 8, cz * 16 + c * 8); SOK[k] = 0; SFN[k] = 0; SEMP[k] = 1; SVIS[k] = 0; if (SFC[k] > 0) { poolFree(k); } y = y + 1; } c = c + 1; } a = a + 1; }
}
// (v3.5, 11-26) A chunk was meshed as soon as it was lit, its sides toward chunks not made yet left closed, and
// those sections meshed again when each such neighbour came: made nearest first, a chunk has two of its four
// neighbours still to come, so two of its four section columns were meshed twice and one three times - of 36,000
// meshings of sections that hold anything on a flight, 14,700 were such repeats, and meshing is half of what a
// chunk costs. Now a chunk waits at stage 4 until its four neighbours are lit, and the work goes to them first
// (mwS): every section is meshed once. A neighbour outside the circle of chunks to make (CR) is made - to its
// light, no further - only when the waiting chunk is within the view (it stays within the circle chunks are
// kept in, CR * CR + 6, so no slot is taken that two chunks would want); a chunk farther than the view waits
// for the player to come nearer (mwGo 0). Were such a neighbour beyond even that, the side is left closed as before.
// The four corner neighbours are waited for as well: the shade in a face's corners (aoOf) looks at the cells
// beside the one the face looks into, and at a chunk's corner those are the corner neighbour's - read before it
// was made, they were whatever the slot last held, and nothing meshed that section again.
// (v3.5, 11-26) The chunks a world keeps: made (to their light - not meshed unless near) and held while the player
// is in the box of them or a chunk outside it, whatever the circle round the player. A machine wider than the
// circle works whole: the calculator brought over from the genre is 137 blocks by 106, and the parts of a chunk
// not made stand still. They come with a map (mapdata.js keep=) and are kept with the world (save.js KEEP).
// The window holds NCH x NCH chunks and a chunk's slot is its place mod NCH, so a kept chunk and a chunk of the
// circle ten apart want one slot: the kept one has it (the nine chunks round the player always have theirs) -
// ten chunks off is beyond the view, or at the far end of the machine one stands at the other end of.
// Outside that box the world keeps nothing: the chunks go as the player leaves them, the machine stops.
let KCX = [], KCZ = [], KSL = [], keepOn = 0, kbX0 = 0, kbX1 = 0, kbZ0 = 0, kbZ1 = 0;
// (v3.5, 11-26) The simulation distance, apart from the chunks drawn (the user: "시뮬레이션 거리와 렌더링 청크를
// 별개로"). The chunks drawn are the circle round the player (CR, and of it what the view reaches); the chunks at
// work - spark parts, water, what grows - are every chunk made, and with a simulation distance above the circle's
// the square of chunks within simR of the player's (2 simR + 1 a side) is made as well: to their light (stage 4),
// never meshed unless of the circle. simWant is the player's choice, CR (the circle alone, as it always was) to
// SIMMAX - six, the reach the calculator of the genre wants from its keys, and all the window holds: 13 slots a
// side, a chunk's slot its place mod 13, so the chunks of the square never want one slot. The square's chunks are
// made after the circle's and the kept ones', nearest ring first, and go when the player's chunk leaves them more
// than simR behind.
let simWant = 4, simR = 0, simWas = 0, ckLeft = 0, ckDid = 0;
function simSet(v) {
  simWant = Math.max(CR, Math.min(SIMMAX, v));
  simR = 0; if (simWant > CR) { simR = simWant; }
}
function keepClear() {
  KCX = []; KCZ = []; keepOn = 0;
  let i = 1;
  while (i <= KSL.length) { KSL[i] = 0; i = i + 1; }
}
function keepAdd(cx, cz) {
  if (KSL.length == 0) { let i = 0; while (i < NCH * NCH) { KSL.push(0); i = i + 1; } }
  let s = slotOf(cx, cz);
  if (KSL[s] == 0) {
    if (KCX.length == 0) { kbX0 = cx; kbX1 = cx; kbZ0 = cz; kbZ1 = cz; }
    KCX.push(cx); KCZ.push(cz); KSL[s] = KCX.length;
    kbX0 = Math.min(kbX0, cx); kbX1 = Math.max(kbX1, cx); kbZ0 = Math.min(kbZ0, cz); kbZ1 = Math.max(kbZ1, cz);
  }
}
// is slot s kept for another chunk than (cx, cz)
function keepBars(s, cx, cz) {
  let r = 0;
  if (keepOn == 1) { let k = KSL[s]; if (k > 0) { if (KCX[k] != cx || KCZ[k] != cz) { r = 1; } } }
  return r;
}
// is the chunk in slot s one the world is keeping now
function keptAt(s) {
  let r = 0;
  if (keepOn == 1) { let k = KSL[s]; if (k > 0) { if (KCX[k] == CKX[s]) { if (KCZ[k] == CKZ[s]) { r = 1; } } } }
  return r;
}
let mwS = 0, mwX = 0, mwZ = 0, mwGo = 0;
function meshWait(cx, cz, pcx, pcz) {
  mwS = 0; mwGo = 1;
  let k = 0, ncx = 0, ncz = 0, s = 0, d = 0, out = 0, need = 0 - 1, ok = 0, dx = 0, dz = 0;
  while (k < 8) {
    ncx = cx; ncz = cz;
    if (k == 0) { ncx = cx - 1; } if (k == 1) { ncx = cx + 1; } if (k == 2) { ncz = cz - 1; } if (k == 3) { ncz = cz + 1; }
    if (k == 4) { ncx = cx - 1; ncz = cz - 1; } if (k == 5) { ncx = cx + 1; ncz = cz - 1; } if (k == 6) { ncx = cx - 1; ncz = cz + 1; } if (k == 7) { ncx = cx + 1; ncz = cz + 1; }
    s = mod(ncx, NCH) * NCH + mod(ncz, NCH) + 1;
    ok = 0;
    if (CKST[s] >= 4) { if (CKX[s] == ncx) { if (CKZ[s] == ncz) { ok = 1; } } }
    if (ok == 0) { if (mwS == 0) {
      d = (ncx - pcx) * (ncx - pcx) + (ncz - pcz) * (ncz - pcz);
      if (d <= CR * CR) { mwS = s; mwX = ncx; mwZ = ncz; }
      else {
        if (need < 0) {
          // (is any of this chunk within the view)
          dx = cx * 16 - Math.floor(px); if (dx < 0) { dx = Math.floor(px) - cx * 16 - 15; if (dx < 0) { dx = 0; } }
          dz = cz * 16 - Math.floor(pz); if (dz < 0) { dz = Math.floor(pz) - cz * 16 - 15; if (dz < 0) { dz = 0; } }
          need = 0; if (dx * dx + dz * dz <= viewR2) { need = 1; }
        }
        if (need == 1) { if (d <= CR * CR + 6) { mwS = s; mwX = ncx; mwZ = ncz; } } else { out = 1; }
      }
    } }
    k = k + 1;
  }
  if (mwS == 0) { if (out == 1) { mwGo = 0; } }
}
// once a frame: drop what is too far, then make the nearest chunks a few stages on
// ((11-26) `steps` is what the frame may spend, in units of about a millisecond of this computer's: a stage
// costs what it was measured to on a flight (half the columns 4, the caves 3, ores and trees 5, the light 5, a quarter of
// the sections 2: CKW). It was two stages a frame whatever they were - two halves of columns took 10 ms, two
// quarters of sections 4. A stage dearer than what is left waits for the next frame, unless nothing was done yet.)
let CKW = [4, 3, 5, 5, 2];
function chunkWork(steps) {
  let pcx = idiv(Math.floor(px), 16), pcz = idiv(Math.floor(pz), 16), s = 0, k = 1, cx = 0, cz = 0, did = 0, w = 0;
  // ((11-26) the chunks the world keeps: while the player is in their box or a chunk outside it)
  keepOn = 0;
  if (KCX.length > 0) { if (dim == 0) { if (pcx >= kbX0 - 1 && pcx <= kbX1 + 1 && pcz >= kbZ0 - 1 && pcz <= kbZ1 + 1) { keepOn = 1; } } }
  if (pcx != pcxW || pcz != pczW || simR != simWas) {
    simWas = simR;
    // ((11-26) come from afar - a new world, another world, a teleport: main.js gives the chunks twice the work
    // for the next second, the view being empty)
    if (Math.abs(pcx - pcxW) > 1 || Math.abs(pcz - pczW) > 1) { ckBurst = 60; }
    pcxW = pcx; pczW = pcz;
    s = 1;
    while (s <= NCH * NCH) {
      if (CKST[s] > 0) { if ((CKX[s] - pcx) * (CKX[s] - pcx) + (CKZ[s] - pcz) * (CKZ[s] - pcz) > CR * CR + 6) { if (keptAt(s) == 0) { if (Math.abs(CKX[s] - pcx) > simR || Math.abs(CKZ[s] - pcz) > simR) { chunkDrop(s); } } } }
      s = s + 1;
    }
  }
  nChunks = 0;
  while (k <= NOFF) {
    cx = pcx + OFFX[k]; cz = pcz + OFFZ[k]; s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
    if (CKST[s] == 5 && CKX[s] == cx && CKZ[s] == cz) { nChunks = nChunks + 1; k = k + 1; }
    else {
      if (steps > 0) {
        // ((11-26) its slot held by a chunk the world keeps: left to that one (not for the nine round the player))
        let yld = 0;
        if (k > 9) { yld = keepBars(s, cx, cz); }
        if (yld == 0) { if (CKST[s] > 0) { if (CKX[s] != cx || CKZ[s] != cz) { chunkDrop(s); } } }
        if (yld == 1) { k = k + 1; }
        else {
          if (CKST[s] == 0) { CKX[s] = cx; CKZ[s] = cz; }
          // ((11-26) before its meshing begins: its neighbours lit)
          mwS = 0; mwGo = 1;
          if (CKST[s] == 4) { if (CKSUB[s] == 0) { meshWait(cx, cz, pcx, pcz); } }
          // (a neighbour whose slot a kept chunk holds is not made: that side stays closed)
          if (mwS > 0) { if (keepBars(mwS, mwX, mwZ) == 1) { mwS = 0; mwGo = 1; } }
          if (mwS > 0) { if (CKST[mwS] > 0) { if (CKX[mwS] != mwX || CKZ[mwS] != mwZ) { chunkDrop(mwS); } } }
          if (mwS > 0) {
            if (CKST[mwS] == 0) { CKX[mwS] = mwX; CKZ[mwS] = mwZ; }
            w = CKW[CKST[mwS] + 1];
            if (w <= steps || did == 0) { chunkStage(mwS); steps = steps - w; did = 1; } else { steps = 0; }
          } else {
            if (mwGo == 1) {
              w = CKW[CKST[s] + 1];
              if (w <= steps || did == 0) { chunkStage(s); steps = steps - w; did = 1; } else { steps = 0; }
            } else { k = k + 1; }
          }
        }
      } else { k = k + 1; }
    }
  }
  ckLeft = steps; ckDid = did;
  chunkKeep(pcx, pcz);
  chunkSim(pcx, pcz);
  sparkReady(pcx, pcz);
}
// (v3.5, 11-26) which chunks' spark parts may work (CKRD), worked out again when a chunk came or went or the
// player changed chunk; and the chunks put back from the log that may work now have their parts looked at
function sparkReady(pcx, pcz) {
  let s = 1, n = 0;
  if (ckVer != rdVer || pcx != rdPX || pcz != rdPZ || keepOn != rdKeep || simR != rdSim) {
    rdVer = ckVer; rdPX = pcx; rdPZ = pcz; rdKeep = keepOn; rdSim = simR;
    while (s <= NCH * NCH) {
      let r = 0;
      if (CKST[s] >= 3) {
        let cx = CKX[s], cz = CKZ[s], k = 0;
        r = 2;
        while (k < 8) {
          let ncx = cx + NB8X[k + 1], ncz = cz + NB8Z[k + 1], t = mod(ncx, NCH) * NCH + mod(ncz, NCH) + 1, ok = 0;
          if (CKST[t] >= 3) { if (CKX[t] == ncx) { if (CKZ[t] == ncz) { ok = 1; } } }
          if (ok == 0) {
            // (is it to come: the chunk the world keeps in that slot, or - the slot kept for no other - one of the circle)
            let come = 0, kk = 0;
            if (keepOn == 1) { kk = KSL[t]; }
            if (kk > 0) { if (KCX[kk] == ncx) { if (KCZ[kk] == ncz) { come = 1; } } }
            if (come == 0) { if ((ncx - pcx) * (ncx - pcx) + (ncz - pcz) * (ncz - pcz) <= CR * CR) { if (kk == 0 || (Math.abs(ncx - pcx) <= 1 && Math.abs(ncz - pcz) <= 1)) { come = 1; } } }
            // ((11-26) or one of the square of the simulation distance)
            if (come == 0) { if (simR > 0) { if (kk == 0) { if (Math.abs(ncx - pcx) <= simR) { if (Math.abs(ncz - pcz) <= simR) { come = 1; } } } } }
            if (come == 1) { r = 0; } else { if (r == 2) { if (k < 4) { r = 1; } } }
          }
          k = k + 1;
        }
      }
      CKRD[s] = r;
      s = s + 1;
    }
  }
  s = 1;
  while (s <= NCH * NCH && n < 2) {
    if (CKRV[s] == 1) { if (CKRD[s] > 0) { CKRV[s] = 0; edReview(CKX[s], CKZ[s]); n = n + 1; } }
    s = s + 1;
  }
}
function chunkKeep(pcx, pcz) {
  let k = 1, cx = 0, cz = 0, s = 0, w = 0, skip = 0, steps = ckLeft, did = ckDid;
  // ((11-26) then the chunks the world keeps, to their light)
  if (keepOn == 1) {
    k = 1;
    while (k <= KCX.length && steps > 0) {
      cx = KCX[k]; cz = KCZ[k]; s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
      // (but the slot of one of the nine chunks round the player is theirs)
      skip = 0;
      if (mod(cx - pcx + 1, NCH) <= 2 && mod(cz - pcz + 1, NCH) <= 2) { if (Math.abs(cx - pcx) > 1 || Math.abs(cz - pcz) > 1) { skip = 1; } }
      if (skip == 1) { k = k + 1; }
      else {
        if (CKST[s] > 0) { if (CKX[s] != cx || CKZ[s] != cz) { chunkDrop(s); } }
        if (CKST[s] == 0) { CKX[s] = cx; CKZ[s] = cz; }
        if (CKST[s] < 4) {
          w = CKW[CKST[s] + 1];
          if (w <= steps || did == 0) { chunkStage(s); steps = steps - w; did = 1; } else { steps = 0; }
        } else { k = k + 1; }
      }
    }
  }
  ckLeft = steps; ckDid = did;
}
// ((11-26) then the chunks of the simulation distance's square that are not of the circle, to their light)
function chunkSim(pcx, pcz) {
  let k = 1, cx = 0, cz = 0, s = 0, w = 0, steps = ckLeft, did = ckDid, go = 1;
  if (simR > 0) {
    while (k <= NSOF && steps > 0 && go == 1) {
      if (SOFD[k] > simR) { go = 0; }
      else {
        cx = pcx + SOFX[k]; cz = pcz + SOFZ[k]; s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
        // (a slot held for a chunk the world keeps is that one's)
        if (keepBars(s, cx, cz) == 1) { k = k + 1; }
        else {
          if (CKST[s] > 0) { if (CKX[s] != cx || CKZ[s] != cz) { chunkDrop(s); } }
          if (CKST[s] == 0) { CKX[s] = cx; CKZ[s] = cz; }
          if (CKST[s] < 4) {
            w = CKW[CKST[s] + 1];
            if (w <= steps || did == 0) { chunkStage(s); steps = steps - w; did = 1; } else { steps = 0; }
          } else { k = k + 1; }
        }
      }
    }
  }
  ckLeft = steps; ckDid = did;
}
function worldInit() {
  effectsInit(); riding = 0; gliding = 0;
  if (W.length == 0) {
    let i = 0;
    while (i < WS * WS * WY) { W.push(0); LT.push(0); i = i + 1; }
    i = 0;
    while (i < WS * WS) { HMAP.push(0); BIOM.push(0); SFL.push(0); STP.push(WY - 1); i = i + 1; }
    i = 0;
    while (i < NCH * NCH) { CKX.push(0); CKZ.push(0); CKST.push(0); CKSUB.push(0); CKTOP.push(WY - 1); CKRV.push(0); CKRD.push(0); i = i + 1; }
  }
}

// ---------------------------------------------------------------- a new world
let genPhase = 0, genN = 0, genMsg = '';
// (v3.2) the kind of the other worlds' land: 0 as before v3.2 (a world or a server made before keeps its
// land), 1 the new depths and void (dims.js); (v3.4) 2 and the overworld of terra.js
let genVer = 1;
// ((v3.4) where a world begins: (8, 8) in the old lands; in the new one land found near it (terra.js tStart))
let gsX = 8, gsZ = 8, genOld = 0;
function genCentre() {
  gsX = 8; gsZ = 8;
  if (genVer >= 2 && flatOn == 0) { tStart(); gsX = tsX; gsZ = tsZ; }
}
// (after genStart, once genVer is the world's own: the player there, the chunks made round it)
function genOrigin() {
  genCentre();
  px = gsX + 0.5; pz = gsZ + 0.5; pcxW = -99999; pczW = -99999;
}
function genStart(s) {
  seed = s; genVer = GENV; gsX = 8; gsZ = 8;
  fluidInit();
  noiseInit();
  terraInit();
  worldInit();
  let i = 1;
  while (i <= NCH * NCH) { if (CKST[i] > 0) { chunkDrop(i); } i = i + 1; }
  EDX = []; EDY = []; EDZ = []; EDB = []; EDD = []; edIndex();
  // ((11-26) nothing kept, the cells hashed where they are)
  keepClear(); hoX = 0; hoY = 0; hoZ = 0;
  // (and no comparator's output of the world before)
  CMX = []; CMY = []; CMZ = []; CMD = []; CML = [];
  // (nor a torch's goings-out, nor a light waiting to be worked out)
  tbClear();
  llH = 1; llN = 0; { let q = 1; while (q <= LLF.length) { if (LLF[q] != 0) { LLF[q] = 0; } q = q + 1; } }
  logOn = 0; dim = 0; bossDead = 0; bossWake = 0; bossHP = 0; bossE = 0;
  worldExtraInit();
  cavesInit();
  px = 8.5; pz = 8.5; pcxW = -99999; pczW = -99999;
  genPhase = 1; genN = 0;
}
// the loading screen: the chunks near the start are made before play (the rest during it)
function genStep() {
  genMsg = '지형·동굴·광물·나무·빛을 만드는 중';
  chunkWork(120);
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
        x = Math.floor(gsX + sind(a * 22.5) * r); z = Math.floor(gsZ + cosd(a * 22.5) * r);
        findTop(x, z);
        let i = wi(x, topY, z);
        let b = W[i];
        if (topY >= SEA) { if (b == 2 || b == 20 || b == 8 || b == 3) { if (W[i + 1] == 0 || W[i + 1] == 28) { found = 1; } } }
      }
      a = a + 1;
    }
    r = r + 3;
  }
  if (found == 0) { x = gsX; z = gsZ; findTop(x, z); }
  spawnX = x + 0.5; spawnZ = z + 0.5; spawnY = topY + 1;
}
