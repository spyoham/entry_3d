// ===================================================================== the world
// Cells: W (block id), SKL (sky light 0..15), BKL (block light 0..15), one item a cell.
// cell (x, y, z) -> (x * SZ + z) * WY + y + 1: a column is WY items in a row (y fastest).
let W = [], SKL = [], BKL = [], LT = [];
let HMAP = [], BIOM = [];          // a column: the top solid y (before caves and trees), the biome
let seed = 1, rs = 1;
let PERM = [], GRAD = [];
let spawnX = 64, spawnY = 40, spawnZ = 64;

function rnd() {
  rs = (rs * 48271) % 2147483647;
  return rs / 2147483647;
}
function rndI(a, b) {
  rs = (rs * 48271) % 2147483647;
  return a + Math.floor(rs / 2147483647 * (b - a + 1));
}
function noiseInit() {
  PERM = []; GRAD = [];
  let i = 0;
  while (i < 256) { PERM.push(i); GRAD.push(rnd() * 2 - 1); i = i + 1; }
  // shuffle, then the second half repeats the first
  i = 256;
  while (i > 1) {
    let j = rndI(1, i);
    let t = PERM[i]; PERM[i] = PERM[j]; PERM[j] = t;
    i = i - 1;
  }
  i = 1;
  while (i <= 256) { PERM.push(PERM[i]); i = i + 1; }
}
// value noise -1..1 (smooth step between lattice values)
let nV = 0;
function M_noise(X, Z) {
  let nxi = Math.floor(X), nzi = Math.floor(Z);
  let nfx = X - nxi, nfz = Z - nzi;
  let nu = nfx * nfx * (3 - 2 * nfx), nw = nfz * nfz * (3 - 2 * nfz);
  let na = mod(nxi, 256) + 1, nb = mod(nzi, 256) + 1;
  let pa = PERM[na], pb = PERM[na + 1];
  let h00 = GRAD[PERM[pa + nb] + 1], h01 = GRAD[PERM[pa + nb + 1] + 1], h10 = GRAD[PERM[pb + nb] + 1], h11 = GRAD[PERM[pb + nb + 1] + 1];
  let l0 = h00 + (h10 - h00) * nu, l1 = h01 + (h11 - h01) * nu;
  nV = l0 + (l1 - l0) * nw;
}
function noise2(x, z) {
  M_noise(x, z);
  return nV;
}
function fbm3(x, z) {
  M_noise(x, z); let s = nV;
  M_noise(x * 2 + 17.3, z * 2 + 5.1); s = s + nV * 0.5;
  M_noise(x * 4 + 3.7, z * 4 + 31.9); s = s + nV * 0.25;
  return s / 1.75;
}
function fbm4(x, z) {
  M_noise(x, z); let s = nV;
  M_noise(x * 2 + 17.3, z * 2 + 5.1); s = s + nV * 0.5;
  M_noise(x * 4 + 3.7, z * 4 + 31.9); s = s + nV * 0.25;
  M_noise(x * 8 + 51.1, z * 8 + 11.3); s = s + nV * 0.125;
  return s / 1.875;
}

function cellOf(x, y, z) { return (x * SZ + z) * WY + y + 1; }
// a block anywhere: below the world bedrock, outside air
function blockAt(x, y, z) {
  let b = 0;
  if (y < 0) { b = 6; }
  if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 0 && y < WY) { b = W[(x * SZ + z) * WY + y + 1]; }
  return b;
}

// ---------------------------------------------------------------- generation, a step a frame
// genPhase: 1 columns, 2 caves, 3 ores, 4 trees and plants, 5 light, 6 sections, 7 done
let genPhase = 0, genI = 0, genN = 0, genMsg = '';
let colH = 0, colB = 0;
function columnShape(x, z) {
  let c = fbm4(x * 0.014 + 0.5, z * 0.014 + 0.5);
  let e = fbm3(x * 0.035 + 100.5, z * 0.035 + 7.5);
  let m = noise2(x * 0.02 + 50.5, z * 0.02 + 50.5);
  let t = fbm3(x * 0.02 + 200.5, z * 0.02 + 3.5) * 1.3;
  let hm = fbm3(x * 0.022 + 9.5, z * 0.022 + 300.5) * 1.3;
  let h = SEA + 2 + c * 16 + e * 4;
  let mt = 0;
  if (m > 0.2) { mt = (m - 0.2) * (m - 0.2) * 110 * (0.6 + 0.4 * e); if (c < -0.1) { mt = mt * 0.3; } h = h + mt; }
  // rivers: the land dips to the sea along a line of the noise
  let rv = Math.abs(noise2(x * 0.024 + 400.5, z * 0.024 + 0.5));
  if (rv < 0.06) { if (h > SEA - 3) { if (mt < 6) { h = SEA - 3 + (h - SEA + 3) * rv / 0.06; } } }
  colH = Math.floor(h);
  if (colH > WY - 6) { colH = WY - 6; }
  if (colH < 6) { colH = 6; }
  // biomes: 0 ocean, 1 beach, 2 plains, 3 forest, 4 desert, 5 taiga, 6 snowy, 7 mountains
  let b = 2;
  if (hm > 0.12) { b = 3; }
  if (t < -0.12) { b = 5; }
  if (t < -0.32) { b = 6; }
  if (t > 0.3) { if (hm < 0.05) { b = 4; } }
  if (colH >= SEA + 20) { b = 7; }
  if (colH <= SEA + 1) { if (b != 6) { if (b != 4) { b = 1; } } }
  if (colH < SEA - 1) { b = 0; }
  colB = b;
  // (the cold of the biome comes with the column: an ocean in the cold freezes over)
  if (b == 0) { if (t < -0.3) { colB = 8; } }
}
// one column of blocks pushed in order (x, z ascending: the order of the cell index)
function genColumn(x, z) {
  columnShape(x, z);
  let h = colH, b = colB;
  HMAP.push(h); BIOM.push(b);
  let top = 2, fill = 3, fd = 3 + rndI(0, 1);
  if (b == 1 || b == 4) { top = 8; fill = 8; }
  if (b == 6) { top = 20; }
  if (b == 7) { if (h > SEA + 30) { top = 1; fill = 1; } if (h > SEA + 34) { top = 45; } }
  if (b == 0 || b == 8) {
    top = 8; fill = 8;
    let fl = noise2(x * 0.08 + 7.5, z * 0.08 + 1.5);
    if (fl > 0.35) { top = 9; fill = 9; }
    if (fl < -0.45) { top = 22; fill = 22; }
  }
  if (h < SEA - 1) { if (top == 2) { top = 3; } if (top == 20) { top = 3; } }
  let y = 0, v = 0;
  while (y < WY) {
    v = 0;
    if (y < h - fd) { v = 1; }
    else { if (y < h) { v = fill; if (fill == 8) { if (y < h - 2) { v = 21; } } } else { if (y == h) { v = top; } } }
    if (y > h) { if (y < SEA) { v = 7; if (y == SEA - 1) { if (b == 8 || b == 6) { v = 33; } } } }
    if (y == 0) { v = 6; }
    if (y > 0) { if (y < 4) { if (rnd() < 0.7 - y * 0.2) { v = 6; } } }
    W.push(v); SKL.push(0); BKL.push(0); LT.push(0);
    y = y + 1;
  }
}

// caves: worms that cut round tunnels (lava below LAVAY)
function carveBall(cx, cy, cz, r) {
  let x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(SZ - 2, Math.floor(cx + r));
  let y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(WY - 2, Math.floor(cy + r));
  let z0 = Math.max(1, Math.floor(cz - r)), z1 = Math.min(SZ - 2, Math.floor(cz + r));
  let r2 = r * r, x = x0, y = 0, z = 0, i = 0, b = 0, dx = 0, dy = 0, dz = 0;
  while (x <= x1) {
    dx = (x + 0.5 - cx) * (x + 0.5 - cx);
    z = z0;
    while (z <= z1) {
      dz = (z + 0.5 - cz) * (z + 0.5 - cz);
      y = y0;
      i = (x * SZ + z) * WY + y0 + 1;
      while (y <= y1) {
        dy = (y + 0.5 - cy) * 1.3;
        if (dx + dz + dy * dy < r2) {
          b = W[i];
          if (b != 0 && b != 6 && b != 7 && b != 33 && b != 35) {
            // no hole under the sea (it would drain into the cave)
            if (W[i + 1] != 7 && W[i + 1] != 33) {
              if (y <= LAVAY) { W[i] = 35; } else { W[i] = 0; }
              // the grass that loses its dirt stays: a cave mouth in a hillside
            }
          }
        }
        y = y + 1; i = i + 1;
      }
      z = z + 1;
    }
    x = x + 1;
  }
}
function genWorm() {
  let x = rnd() * SZ, z = rnd() * SZ;
  let ci = Math.floor(x) * SZ + Math.floor(z) + 1;
  let y = 6 + rnd() * (HMAP[ci] - 4);
  let yaw = rnd() * 360, pitch = (rnd() - 0.5) * 40, dyaw = 0, dp = 0;
  let n = rndI(40, 130), k = 0, r = 0;
  let wide = 1;
  if (rnd() < 0.12) { wide = 2.2; }
  while (k < n) {
    r = (1.3 + 1.2 * sind(k * 180 / n)) * wide;
    if (rnd() < 0.08) { r = r * 1.5; }
    carveBall(x, y, z, r);
    x = x + sind(yaw) * cosd(pitch);
    z = z + cosd(yaw) * cosd(pitch);
    y = y + sind(pitch) * 0.7;
    dyaw = dyaw * 0.85 + (rnd() - 0.5) * 12;
    dp = dp * 0.8 + (rnd() - 0.5) * 6;
    yaw = yaw + dyaw; pitch = pitch * 0.9 + dp;
    if (y < 3) { pitch = Math.abs(pitch); }
    k = k + 1;
  }
}
// an ore blob: a short walk that replaces stone
function genVein(b, n, ylo, yhi) {
  let x = rndI(1, SZ - 2), z = rndI(1, SZ - 2), y = rndI(ylo, yhi), k = 0, i = 0, d = 0;
  while (k < n) {
    if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 1 && y < WY) {
      i = (x * SZ + z) * WY + y + 1;
      if (W[i] == 1) { W[i] = b; }
    }
    d = rndI(0, 5);
    if (d == 0) { x = x + 1; } if (d == 1) { x = x - 1; } if (d == 2) { y = y + 1; }
    if (d == 3) { y = y - 1; } if (d == 4) { z = z + 1; } if (d == 5) { z = z - 1; }
    k = k + 1;
  }
}
function setIfAir(x, y, z, b) {
  if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 0 && y < WY) {
    let i = (x * SZ + z) * WY + y + 1;
    let o = W[i];
    if (o == 0 || o == 28 || o == 29 || o == 30) { W[i] = b; }
  }
}
// trees: kind 0 oak, 1 birch, 2 spruce. y: the ground block
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
    while (k <= h) { W[(x * SZ + z) * WY + y + k + 1] = lg; k = k + 1; }
    W[(x * SZ + z) * WY + y + 1] = 3;
  }
}
// the top block of a column (scanning down from the sky), -1 when none
let topY = 0;
function findTop(x, z) {
  let i = (x * SZ + z) * WY + WY;
  let y = WY - 1;
  while (y > 0) {
    if (BHC[W[i] + 1] == 1) { break; }
    if (W[i] == 7 || W[i] == 35) { break; }
    y = y - 1; i = i - 1;
  }
  topY = y;
}
function decorate(x, z) {
  findTop(x, z);
  let y = topY, i = (x * SZ + z) * WY + y + 1;
  let b = W[i], bi = BIOM[x * SZ + z + 1];
  let above = W[i + 1];
  // dirt left open to the sky (a vein on a mountain) grows grass
  if (b == 3) { if (above == 0) { if (y >= SEA) { b = 2; if (bi == 6 || y > SEA + 34) { b = 20; } W[i] = b; } } }
  if (y < WY - 12 && above == 0) {
    let r = rnd();
    let edge = 0;
    if (x < 3 || z < 3 || x > SZ - 4 || z > SZ - 4) { edge = 1; }
    if (b == 2 || b == 20) {
      let tc = 0, kind = 0;
      if (bi == 2) { tc = 0.006; kind = 0; if (rnd() < 0.2) { kind = 1; } }
      if (bi == 3) { tc = 0.05; kind = 0; if (rnd() < 0.35) { kind = 1; } }
      if (bi == 5) { tc = 0.04; kind = 2; }
      if (bi == 6) { tc = 0.008; kind = 2; }
      if (bi == 7) { tc = 0.02; kind = 2; if (rnd() < 0.4) { kind = 0; } }
      if (r < tc && edge == 0) {
        // keep trees apart: no log next to this one
        let near = 0, a = x - 2;
        while (a <= x + 2) {
          let c = z - 2;
          while (c <= z + 2) { let j = (a * SZ + c) * WY + y + 2; if (W[j] == 13 || W[j] == 23 || W[j] == 25) { near = 1; } c = c + 1; }
          a = a + 1;
        }
        if (near == 0) { growTree(x, y, z, kind); }
      } else {
        if (b == 2) {
          let g = 0.12;
          if (bi == 3) { g = 0.08; }
          if (bi == 7) { g = 0.04; }
          if (r < tc + g) { W[i + 1] = 28; }
          else { if (r < tc + g + 0.012) { W[i + 1] = 29; if (rnd() < 0.5) { W[i + 1] = 30; } } }
        }
      }
    }
    if (b == 8) {
      if (bi == 4) {
        if (r < 0.008 && edge == 0) {
          let h = rndI(1, 3), k = 1;
          if (W[i + SZ * WY + 1] == 0 && W[i - SZ * WY + 1] == 0 && W[i + WY + 1] == 0 && W[i - WY + 1] == 0) {
            while (k <= h) { W[i + k] = 19; k = k + 1; }
          }
        } else { if (r < 0.014) { W[i + 1] = 46; } }
      }
    }
  }
}

// ---------------------------------------------------------------- light
// a breadth-first spread through the queue LQ (cells), for one light list at a time
let LQ = [];
let lqHead = 1, lqTail = 0;
function lqPush(i) {
  lqTail = lqTail + 1;
  if (lqTail > LQ.length) { LQ.push(i); } else { LQ[lqTail] = i; }
}
// spread sky (which 0) or block (which 1) light from the queue
function lightSpread(which) {
  let i = 0, l = 0, y = 0, col = 0, z = 0, x = 0, n = 0, ln = 0;
  while (lqHead <= lqTail) {
    i = LQ[lqHead]; lqHead = lqHead + 1;
    if (which == 0) { l = SKL[i]; } else { l = BKL[i]; }
    if (l > 1) {
      ln = l - 1;
      y = mod(i - 1, WY); col = idiv(i - 1, WY); z = mod(col, SZ); x = idiv(col, SZ);
      if (y > 0) { n = i - 1; M_spread(n, ln, which); }
      if (y < WY - 1) { n = i + 1; M_spread(n, ln, which); }
      if (z > 0) { n = i - WY; M_spread(n, ln, which); }
      if (z < SZ - 1) { n = i + WY; M_spread(n, ln, which); }
      if (x > 0) { n = i - SXS; M_spread(n, ln, which); }
      if (x < SZ - 1) { n = i + SXS; M_spread(n, ln, which); }
    }
  }
  lqHead = 1; lqTail = 0;
}
function M_spread(N, LN, WH) {
  let nb = W[N];
  if (BLOP[nb + 1] == 0) {
    let ll = LN;
    if (BHC[nb + 1] != 0) { ll = LN - 1; }
    if (WH == 0) { if (SKL[N] < ll) { SKL[N] = ll; LT[N] = ll * 16 + BKL[N]; lqPush(N); } }
    else { if (BKL[N] < ll) { BKL[N] = ll; LT[N] = SKL[N] * 16 + ll; lqPush(N); } }
  }
}
// the sky straight down a column: 15 until the first block that stops it; returns the first y
// with less than full sky
let skyFloor = 0;
function skyColumn(x, z) {
  let i = (x * SZ + z) * WY + WY, y = WY - 1, open = 1, b = 0;
  while (y >= 0) {
    b = W[i];
    if (open == 1) { if (BLOP[b + 1] == 1 || BHC[b + 1] != 0) { open = 0; skyFloor = y + 1; } }
    if (open == 1) { SKL[i] = 15; } else { SKL[i] = 0; }
    BKL[i] = BLIT[b + 1];
    LT[i] = SKL[i] * 16 + BKL[i];
    y = y - 1; i = i - 1;
  }
  if (open == 1) { skyFloor = 0; }
}
// relight the columns x0..x1, z0..z1 (all heights): sky straight down, then spread from what
// is lit in the box and from the ring of cells round it
let SFL = [];
function relight(x0, x1, z0, z1) {
  if (x0 < 0) { x0 = 0; } if (z0 < 0) { z0 = 0; } if (x1 > SZ - 1) { x1 = SZ - 1; } if (z1 > SZ - 1) { z1 = SZ - 1; }
  let x = x0, z = 0, y = 0, i = 0, f = 0, m = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) { skyColumn(x, z); SFL[x * SZ + z + 1] = skyFloor; z = z + 1; }
    x = x + 1;
  }
  // sky seeds: the lit cells of a column down from the lowest floor round it
  x = x0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      f = SFL[x * SZ + z + 1]; m = f;
      if (x > x0) { m = Math.max(m, SFL[(x - 1) * SZ + z + 1]); } else { if (x > 0) { m = WY - 1; } }
      if (x < x1) { m = Math.max(m, SFL[(x + 1) * SZ + z + 1]); } else { if (x < SZ - 1) { m = WY - 1; } }
      if (z > z0) { m = Math.max(m, SFL[x * SZ + z]); } else { if (z > 0) { m = WY - 1; } }
      if (z < z1) { m = Math.max(m, SFL[x * SZ + z + 2]); } else { if (z < SZ - 1) { m = WY - 1; } }
      y = f; i = (x * SZ + z) * WY + f + 1;
      while (y <= m) { if (y < WY) { if (SKL[i] == 15) { lqPush(i); } } y = y + 1; i = i + 1; }
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
      i = (x * SZ + z) * WY + 1; y = 0;
      while (y < WY) { if (BKL[i] > 1) { lqPush(i); } y = y + 1; i = i + 1; }
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
      if (x >= 0 && x < SZ && z >= 0 && z < SZ) {
        if (x < x0 || x > x1 || z < z0 || z > z1) {
          i = (x * SZ + z) * WY + 1; y = 0;
          while (y < WY) {
            if (which == 0) { l = SKL[i]; } else { l = BKL[i]; }
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

// ---------------------------------------------------------------- one step of the generation
function genStart(s) {
  seed = s; rs = s % 2147483646 + 1;
  let warm = rnd() + rnd();
  noiseInit();
  W = []; SKL = []; BKL = []; LT = []; HMAP = []; BIOM = []; SFL = [];
  genPhase = 1; genI = 0;
}
function genStep() {
  let k = 0;
  if (genPhase == 1) {
    genMsg = '지형 만드는 중';
    // a whole x row of columns a step
    while (k < 2) {
      if (genI < SZ) {
        let z = 0;
        while (z < SZ) { genColumn(genI, z); SFL.push(0); z = z + 1; }
        genI = genI + 1;
      }
      k = k + 1;
    }
    genN = genI / SZ;
    if (genI >= SZ) { genPhase = 2; genI = 0; }
  } else { if (genPhase == 2) {
    genMsg = '동굴 파는 중';
    let n = Math.floor(SZ * SZ / 256 * 1.6);
    while (k < 6) { if (genI < n) { genWorm(); genI = genI + 1; } k = k + 1; }
    genN = genI / n;
    if (genI >= n) { genPhase = 3; genI = 0; }
  } else { if (genPhase == 3) {
    genMsg = '광물 묻는 중';
    let a = SZ * SZ / 256;
    let j = 0;
    while (j < 20 * a) { genVein(12, rndI(6, 14), 5, WY - 10); j = j + 1; }
    j = 0; while (j < 14 * a) { genVein(11, rndI(4, 8), 2, 36); j = j + 1; }
    j = 0; while (j < 2.5 * a) { genVein(10, rndI(4, 8), 2, 18); j = j + 1; }
    j = 0; while (j < 1.2 * a) { genVein(16, rndI(3, 7), 2, 12); j = j + 1; }
    j = 0; while (j < 1.2 * a) { genVein(40, rndI(3, 7), 2, 18); j = j + 1; }
    j = 0; while (j < 6 * a) { genVein(3, rndI(10, 24), 5, WY - 8); j = j + 1; }
    j = 0; while (j < 5 * a) { genVein(9, rndI(10, 24), 5, WY - 8); j = j + 1; }
    genN = 1;
    genPhase = 4; genI = 0;
  } else { if (genPhase == 4) {
    genMsg = '나무 심는 중';
    while (k < 4) {
      if (genI < SZ) {
        let z = 0;
        while (z < SZ) { decorate(genI, z); z = z + 1; }
        genI = genI + 1;
      }
      k = k + 1;
    }
    genN = genI / SZ;
    if (genI >= SZ) { genPhase = 5; genI = 0; }
  } else { if (genPhase == 5) {
    genMsg = '빛 계산하는 중';
    relight(0, SZ - 1, 0, SZ - 1);
    genN = 1;
    genPhase = 6; genI = 0;
  } else { if (genPhase == 6) {
    genMsg = '블록 면 만드는 중';
    while (k < 96) { if (genI < NSEC) { genI = genI + 1; meshSection(genI); } k = k + 1; }
    genN = genI / NSEC;
    if (genI >= NSEC) { genPhase = 7; genN = 1; }
  } } } } } }
}

// a dry, solid spot near the middle to start from
function findSpawn() {
  let r = 0, found = 0, x = 0, z = 0, a = 0;
  while (found == 0 && r < SZ / 2) {
    a = 0;
    while (a < 16) {
      if (found == 0) {
        x = Math.floor(SZ / 2 + sind(a * 22.5) * r); z = Math.floor(SZ / 2 + cosd(a * 22.5) * r);
        findTop(x, z);
        let b = W[(x * SZ + z) * WY + topY + 1];
        if (topY >= SEA) { if (b == 2 || b == 20 || b == 8 || b == 3) { if (W[(x * SZ + z) * WY + topY + 2] == 0 || W[(x * SZ + z) * WY + topY + 2] == 28) { found = 1; } } }
      }
      a = a + 1;
    }
    r = r + 3;
  }
  if (found == 0) { x = SZ / 2; z = SZ / 2; findTop(x, z); }
  spawnX = x + 0.5; spawnZ = z + 0.5; spawnY = topY + 1;
}
