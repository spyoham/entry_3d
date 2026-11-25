// ===================================================================== (v3.4) the overworld's land, made the genre's way (1.16)
// Before, a column's height came of a few 2D noises (land and sea every 70 blocks, mountains where one
// noise was high, rivers where another crossed zero) and its biome of two more (50 blocks wide): seas the
// size of ponds, rivers in rings, biomes in patches. Now the land is made as the genre makes it:
// 1. The biomes come of layers of whole numbers, each made from the one before (LOP, top to bottom):
//    islands in an ocean at 1 : 4096, zoomed (each cell becomes four, the new ones take a neighbour's value
//    at random) and grown at their edges; a climate for the land (warm, temperate, cool, icy - warm never
//    beside icy); at 1 : 256 a biome by the climate; hills and rarer kinds inside wide biomes, edges between
//    unlike ones, shores by the sea; and rivers where two regions of another noise meet - down to cells of
//    4 x 4 blocks. A biome is some hundred blocks wide, a sea some thousand.
// 2. The ground is a density in 3D, known every 4 blocks across and 8 up and straight in between: two
//    slow noises of five octaves and a third that picks between them, plus a fall with the height that
//    depends on the biomes round the column (their depth and scale, the 5 x 5 cells weighed by distance):
//    where it is above zero there is stone. So the land has cliffs and overhangs, and a biome's shape
//    runs smoothly into its neighbour's.
// 3. The top is laid on the stone from above: the biome's top and filling, as deep as a third noise says
//    (none where it is low: bare stone), gravel deep under water, sand on beaches, ice where it is cold.
// 4. Lakes are dug into the ground (a hollow of a few balls, air above and water below, only where the
//    rim is whole), not poured on it.
// In whole numbers where it is hot (tessvm's decimal + - x are slow). genVer 2 - and every world, server and
// map has it, whatever it was made with: the user did not want the old lands kept (2026-11-20), so a world
// made before opens on new land (genVer is set to GENV when it is loaded, joined or pasted). The old makers
// (world.js columnShape0 / genColumn, genVer 0 and 1) are left for the simulator's tests, which were written
// on the old land and ask for it (GENV 1); the game never runs them.
// (v3.5) The heights are the genre's own: the world 256 high, the sea's top at 63, a block for a block all the
// way down (v3.4 had the world 128 high and its sea at 30, the depths under the sea squeezed to two thirds). The
// densities are known at the heights 8 l + 1 (l 0..32) - where v3.4 knew them, so the land above the sea is
// v3.4's own, 33 blocks higher: what was built on it is moved up with it (save.js yUp).

// ---------------------------------------------------------------- the biomes of the layers
// by the genre's numbers: TBD depth x 1000, TBS scale x 1000, TBM the game's biome (BIOM), TOC 1 a
// shallow ocean 2 a deep one, TSN 1 snowy
// (the lists themselves, with the layers LOP LSA, the weights TW and the noise's directions G3X G3Y G3Z, are
// made by build.mjs: set up here they were 1,700 blocks of the work)
function terraInit() {
  lyInit();
  tcInit();
}

// ---------------------------------------------------------------- the layers
// LY: two buffers (lyA read, lyB written) of two channels each (the biome; LSEG further the river noise),
// the region each holds: la* / lb* (x, z, width, height in the layer's own cells)
let LY = [], LQX = [], LQZ = [], LQW = [], LQH = [];
let lyA = 0, lyB = 0, lax = 0, laz = 0, law = 0, lah = 0, lbx = 0, lbz = 0, lbw = 0, lbh = 0, lyR = 1, lyV = 0, lsd = 0;
function lyInit() {
  if (LY.length == 0) { let i = 0; while (i < 4096) { LY.push(0); i = i + 1; } i = 0; while (i < LOP.length) { LQX.push(0); LQZ.push(0); LQW.push(0); LQH.push(0); i = i + 1; } }
  lsd = mod(seed * 31 + 7, 1000003);
  // the layers (LOP, with their salts LSA): 1 islands, 2 zoom (fuzzy), 3 zoom, 4 land grows and wears, 5 less
  // ocean, 6 climates, 7 8 warm and icy kept apart, 9 a special few, 10 mushroom islands, 11 deep ocean, 12 the
  // biomes and the river noise, 13 zoom (both), 14 edges, 15 hills, 16 shores, 17 smooth and the rivers, 18 the
  // rivers into the biomes, 19 land grows (among biomes)
  lyKeepInit();
}
// the random numbers of a cell of a layer: lyR; the next one below N: lyV
function lySeed(x, z, s) {
  lyR = mod((mod(x * 7919 + z * 104729 + s, 46337) + 1) * (mod(x * 15485863 + z * 32452843 + s * 1299721 + lsd, 46349) + 1) + s, 2147483646) + 1;
  lyR = (lyR * 48271) % 2147483647;
}
function M_lnext(N) { lyR = (lyR * 48271) % 2147483647; lyV = mod(idiv(lyR, 128), N); }
// the regions every layer has to make for the last one to give (x, z, w, h) of 4-block cells
function lyPlan(x, z, w, h) {
  let k = LOP.length;
  while (k >= 1) {
    LQX[k] = x; LQZ[k] = z; LQW[k] = w; LQH[k] = h;
    let op = LOP[k];
    if (op == 2 || op == 3 || op == 13) {
      let x1 = x + w - 1, z1 = z + h - 1;
      x = idiv(x, 2); z = idiv(z, 2); w = idiv(x1, 2) - x + 2; h = idiv(z1, 2) - z + 2;
    } else { if (op != 6 && op != 9 && op != 12) { x = x - 1; z = z - 1; w = w + 2; h = h + 2; } }
    k = k - 1;
  }
}
// What the layers gave is kept at two points, cell by cell: after the 19th (cells of 256 blocks: the land,
// the climate, the biome) and after the 23rd (cells of 64: the hills too). The first 19 layers are three
// fifths of the work and the same for every chunk within some hundred blocks; with both kept a chunk runs
// the last eight only. LK1* 16 x 16 cells, LK2* 32 x 32, each at its place by its number mod the side.
let LK1X = [], LK1Z = [], LK1B = [], LK1N = [], LK2X = [], LK2Z = [], LK2B = [], LK2N = [];
function lyKeepInit() {
  LK1X = []; LK1Z = []; LK1B = []; LK1N = []; LK2X = []; LK2Z = []; LK2B = []; LK2N = [];
  let i = 0;
  while (i < 256) { LK1X.push(999999); LK1Z.push(0); LK1B.push(0); LK1N.push(0); i = i + 1; }
  i = 0;
  while (i < 1024) { LK2X.push(999999); LK2Z.push(0); LK2B.push(0); LK2N.push(0); i = i + 1; }
}
// is the whole region of layer k kept (k 19 or 23): then it is put into the buffer read (1), else 0
function lyKept(k) {
  let r = 1, x0 = LQX[k], z0 = LQZ[k], w = LQW[k], h = LQH[k], z = z0, o = 1;
  while (z < z0 + h) {
    let x = x0;
    while (x < x0 + w) {
      if (k == 19) { let s = mod(x, 16) * 16 + mod(z, 16) + 1; if (LK1X[s] != x || LK1Z[s] != z) { r = 0; x = x0 + w; z = z0 + h; } else { LY[o] = LK1B[s]; LY[o + 1024] = LK1N[s]; } }
      else { let s = mod(x, 32) * 32 + mod(z, 32) + 1; if (LK2X[s] != x || LK2Z[s] != z) { r = 0; x = x0 + w; z = z0 + h; } else { LY[o] = LK2B[s]; LY[o + 1024] = LK2N[s]; } }
      o = o + 1; x = x + 1;
    }
    z = z + 1;
  }
  return r;
}
// (the region layer k just wrote, kept)
function lyKeep(k) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx;
    while (x < lbx + lbw) {
      if (k == 19) { let s = mod(x, 16) * 16 + mod(z, 16) + 1; LK1X[s] = x; LK1Z[s] = z; LK1B[s] = LY[o]; LK1N[s] = LY[o + 1024]; }
      else { let s = mod(x, 32) * 32 + mod(z, 32) + 1; LK2X[s] = x; LK2Z[s] = z; LK2B[s] = LY[o]; LK2N[s] = LY[o + 1024]; }
      o = o + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// the layers run for that region: its biomes are at LY[lyA + 1 ...], row after row (z, then x)
function lyRun(x, z, w, h) {
  lyPlan(x, z, w, h);
  lyA = 0; lyB = 2048;
  let k = 1, n = LOP.length;
  if (lyKept(23) == 1) { k = 24; } else { if (lyKept(19) == 1) { k = 20; } }
  if (k > 1) { lax = LQX[k - 1]; laz = LQZ[k - 1]; law = LQW[k - 1]; lah = LQH[k - 1]; }
  while (k <= n) {
    lbx = LQX[k]; lbz = LQZ[k]; lbw = LQW[k]; lbh = LQH[k];
    let op = LOP[k], s = LSA[k];
    if (op == 1) { lyIsland(s); }
    else { if (op == 2) { lyZoom(0, s, 1); }
    else { if (op == 3) { lyZoom(0, s, 0); }
    else { if (op == 13) { lyZoom(0, s, 0); lyZoom(1024, s + 7000, 0); }
    else { if (op == 4 || op == 19) { lyGrow(s, op); }
    else { if (op == 6 || op == 9 || op == 12) { lyOwn(s, op); }
    else { if (op == 15) { lyHills(s); }
    else { if (op == 16) { lyShore(); }
    else { if (op >= 17) { lyRiver(s, op); }
    else { lyCross(s, op); } } } } } } } } }
    if (op == 14 || op == 16 || op == 19) { lyNoiseOver(); }
    if (k == 19 || k == 23) { lyKeep(k); }
    // (what was written is read next)
    let t = lyA; lyA = lyB; lyB = t;
    lax = lbx; laz = lbz; law = lbw; lah = lbh;
    k = k + 1;
  }
}
function lyIsland(s) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx;
    while (x < lbx + lbw) {
      lySeed(x, z, s);
      M_lnext(10);
      let v = 0;
      if (lyV == 0) { v = 1; }
      if (x == 0 && z == 0) { v = 1; }
      LY[o] = v; o = o + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// each cell of the layer above becomes 2 x 2: its own value at the first, a pick of two neighbours at the
// sides, the most common of the four (or a pick) at the corner (ch: the channel; fz: any of the four)
function lyZoom(ch, s, fz) {
  let z = lbz, o = lyB + ch + 1;
  while (z < lbz + lbh) {
    let x = lbx, pz = idiv(z, 2), oz = z - pz * 2;
    while (x < lbx + lbw) {
      let px0 = idiv(x, 2), ox = x - px0 * 2, ci = lyA + ch + (pz - laz) * law + px0 - lax + 1;
      let a = LY[ci], v = a;
      if (ox + oz > 0) {
        lySeed(x, z, s);
        if (ox == 0) { M_lnext(2); if (lyV == 1) { v = LY[ci + law]; } }
        else { if (oz == 0) { M_lnext(2); if (lyV == 1) { v = LY[ci + 1]; } }
        else {
          let b = LY[ci + law], c = LY[ci + 1], d = LY[ci + law + 1], pick = 1;
          if (fz == 0) {
            pick = 0;
            if (b == c && c == d) { v = b; }
            else { if (a == b && a == c) { v = a; }
            else { if (a == b && a == d) { v = a; }
            else { if (a == c && a == d) { v = a; }
            else { if (a == b && c != d) { v = a; }
            else { if (a == c && b != d) { v = a; }
            else { if (a == d && b != c) { v = a; }
            else { if (b == c && a != d) { v = b; }
            else { if (b == d && a != c) { v = b; }
            else { if (c == d && a != b) { v = c; }
            else { pick = 1; } } } } } } } } } }
          }
          if (pick == 1) { M_lnext(4); if (lyV == 1) { v = b; } if (lyV == 2) { v = c; } if (lyV == 3) { v = d; } }
        } }
      }
      LY[o] = v; o = o + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// (a layer that leaves the river noise as it is: carried over for the region written)
function lyNoiseOver() {
  let z = lbz, o = lyB + 1025;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + 1024 + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) { LY[o] = LY[ci]; o = o + 1; ci = ci + 1; x = x + 1; }
    z = z + 1;
  }
}
// land grows into the sea and the sea wears the land (by the four corner cells); op 4 among the first
// layers (the sea is 0), 19 among biomes
function lyGrow(s, op) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], nw = LY[ci - law - 1], ne = LY[ci - law + 1], sw = LY[ci + law - 1], se = LY[ci + law + 1], v = c;
      let oc = 0, onw = 0, one = 0, osw = 0, ose = 0;
      if (op == 4) { if (c == 0) { oc = 1; } if (nw == 0) { onw = 1; } if (ne == 0) { one = 1; } if (sw == 0) { osw = 1; } if (se == 0) { ose = 1; } }
      else { if (TOC[c + 1] == 1) { oc = 1; } if (TOC[nw + 1] == 1) { onw = 1; } if (TOC[ne + 1] == 1) { one = 1; } if (TOC[sw + 1] == 1) { osw = 1; } if (TOC[se + 1] == 1) { ose = 1; } }
      let no = onw + one + osw + ose;
      if (oc == 1 && no < 4) {
        // the sea by land: one of the land corners, a time in three
        lySeed(x, z, s);
        let j = 1, i = 1;
        if (ose == 0) { M_lnext(i); i = i + 1; if (lyV == 0) { j = se; } }
        if (one == 0) { M_lnext(i); i = i + 1; if (lyV == 0) { j = ne; } }
        if (onw == 0) { M_lnext(i); i = i + 1; if (lyV == 0) { j = nw; } }
        if (osw == 0) { M_lnext(i); i = i + 1; if (lyV == 0) { j = sw; } }
        M_lnext(3);
        if (lyV == 0) { v = j; } else { if (j == 4) { v = 4; } }
      } else {
        if (oc == 0 && no > 0) {
          lySeed(x, z, s);
          M_lnext(5);
          if (lyV == 0) { if (c != 4) { if (ose == 1) { v = se; } else { if (onw == 1) { v = nw; } else { if (one == 1) { v = ne; } else { v = sw; } } } } }
        }
      }
      LY[o] = v; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// the layers that look at a cell alone: 6 a climate for the land (1 warm, 3 cool, 4 icy), 9 a special few
// (bits from 256), 12 the biome by the climate, and the river noise begun
function lyOwn(s, op) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], v = c;
      lySeed(x, z, s);
      if (op == 6) { if (c != 0) { M_lnext(6); v = 1; if (lyV == 0) { v = 4; } if (lyV == 1) { v = 3; } } }
      if (op == 9) { if (c != 0) { M_lnext(13); if (lyV == 0) { M_lnext(15); v = c + (lyV + 1) * 256; } } }
      if (op == 12) {
        let sp = idiv(c, 256), cl = c - sp * 256;
        v = cl;
        if (cl >= 1 && cl <= 4) {
          if (cl == 1) { if (sp > 0) { M_lnext(3); v = 38; if (lyV == 0) { v = 39; } } else { M_lnext(6); v = 2; if (lyV == 3 || lyV == 4) { v = 35; } if (lyV == 5) { v = 1; } } }
          if (cl == 2) { if (sp > 0) { v = 21; } else { M_lnext(6); v = 4; if (lyV == 1) { v = 29; } if (lyV == 2) { v = 3; } if (lyV == 3) { v = 1; } if (lyV == 4) { v = 27; } if (lyV == 5) { v = 6; } } }
          if (cl == 3) { if (sp > 0) { v = 32; } else { M_lnext(4); v = 4; if (lyV == 1) { v = 3; } if (lyV == 2) { v = 5; } if (lyV == 3) { v = 1; } } }
          if (cl == 4) { M_lnext(4); v = 12; if (lyV == 3) { v = 30; } }
        }
        // (the river noise: a number of its own on everything but the shallow sea)
        let nv = 0;
        if (cl != 0) { M_lnext(299999); nv = lyV + 2; }
        LY[o + 1024] = nv;
      }
      LY[o] = v; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// the layers that look at the four cells beside: 5 a sea cell all in the sea is land half the times,
// 7 warm by cool or icy is temperate, 8 icy by warm or temperate is cool, 10 a mushroom island far out,
// 11 the sea all in the sea is deep, 14 the edges between biomes
function lyCross(s, op) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], n = LY[ci - law], so = LY[ci + law], w = LY[ci - 1], e = LY[ci + 1], v = c;
      if (op == 5) { if (c == 0 && n == 0 && so == 0 && w == 0 && e == 0) { lySeed(x, z, s); M_lnext(2); if (lyV == 0) { v = 1; } } }
      if (op == 7) { if (c == 1) { if (n == 3 || so == 3 || w == 3 || e == 3 || n == 4 || so == 4 || w == 4 || e == 4) { v = 2; } } }
      if (op == 8) { if (c == 4) { if (n == 1 || so == 1 || w == 1 || e == 1 || n == 2 || so == 2 || w == 2 || e == 2) { v = 3; } } }
      if (op == 10) {
        if (c == 0) { if (LY[ci - law - 1] == 0 && LY[ci - law + 1] == 0 && LY[ci + law - 1] == 0 && LY[ci + law + 1] == 0) { lySeed(x, z, s); M_lnext(100); if (lyV == 0) { v = 14; } } }
      }
      if (op == 11) { if (c == 0 && n == 0 && so == 0 && w == 0 && e == 0) { v = 24; } }
      if (op == 14) {
        if (c == 38 || c == 39) { if (lyPlat(n) + lyPlat(so) + lyPlat(w) + lyPlat(e) < 4) { v = 37; } }
        if (c == 32) { if (n != 32 || so != 32 || w != 32 || e != 32) { v = 5; } }
        if (c == 2) { if (n == 12 || so == 12 || w == 12 || e == 12) { v = 34; } }
        if (c == 6) {
          if (n == 21 || so == 21 || w == 21 || e == 21) { v = 23; }
          if (n == 2 || so == 2 || w == 2 || e == 2 || n == 30 || so == 30 || w == 30 || e == 30 || n == 12 || so == 12 || w == 12 || e == 12) { v = 1; }
        }
      }
      LY[o] = v; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
function lyPlat(b) { let r = 0; if (b == 38 || b == 39) { r = 1; } return r; }
// hills and the rarer kinds inside a biome, by the river noise (n - 2 mod 29: 1 the rare kind, 0 a hill
// and its rare kind) or a time in three; a hill only where three of the four cells beside are the same
function lyHills(s) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], nv = LY[ci + 1024], v = c, k = 0 - 1;
      if (nv >= 2) { k = mod(nv - 2, 29); }
      lySeed(x, z, s);
      if (TOC[c + 1] != 1 && k == 1) { if (c < 42) { if (TBM[c + 129] >= 0) { v = c + 128; } } }
      else {
        M_lnext(3);
        if (lyV == 0 || k == 0) {
          let l = c;
          if (c == 2) { l = 17; } if (c == 4) { l = 18; } if (c == 27) { l = 28; } if (c == 29) { l = 1; } if (c == 5) { l = 19; } if (c == 32) { l = 33; }
          if (c == 30) { l = 31; } if (c == 1) { M_lnext(3); l = 4; if (lyV == 0) { l = 18; } } if (c == 12) { l = 13; } if (c == 21) { l = 22; }
          if (c == 0) { l = 24; } if (c == 3) { l = 34; } if (c == 35) { l = 36; } if (c == 38 || c == 39) { l = 37; }
          if (c == 24) { M_lnext(3); if (lyV == 0) { M_lnext(2); l = 1; if (lyV == 1) { l = 4; } } }
          if (k == 0 && l != c) { if (l < 42) { if (TBM[l + 129] >= 0) { l = l + 128; } else { l = c; } } else { l = c; } }
          if (l != c) {
            let same = 0, n = LY[ci - law], so = LY[ci + law], w = LY[ci - 1], e = LY[ci + 1];
            if (n == c || lyPlat(n) + lyPlat(c) == 2) { same = same + 1; } if (so == c || lyPlat(so) + lyPlat(c) == 2) { same = same + 1; }
            if (w == c || lyPlat(w) + lyPlat(c) == 2) { same = same + 1; } if (e == c || lyPlat(e) + lyPlat(c) == 2) { same = same + 1; }
            if (same >= 3) { v = l; }
          }
        }
      }
      LY[o] = v; LY[o + 1024] = nv; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// the shores: a beach where land meets the sea (snowy where it is cold, stone under mountains), the
// jungle's edge, the canyons' edge of desert
function lyJungle(b) { let r = 0; if (b == 21 || b == 22 || b == 23 || b == 149 || b == 151) { r = 1; } return r; }
function lyMesa(b) { let r = 0; if (b == 37 || b == 38 || b == 39 || b == 165 || b == 166 || b == 167) { r = 1; } return r; }
function lyShore() {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], n = LY[ci - law], so = LY[ci + law], w = LY[ci - 1], e = LY[ci + 1], v = c;
      let sea = 0, shal = 0;
      if (TOC[n + 1] > 0) { sea = sea + 1; } if (TOC[so + 1] > 0) { sea = sea + 1; } if (TOC[w + 1] > 0) { sea = sea + 1; } if (TOC[e + 1] > 0) { sea = sea + 1; }
      if (TOC[n + 1] == 1) { shal = shal + 1; } if (TOC[so + 1] == 1) { shal = shal + 1; } if (TOC[w + 1] == 1) { shal = shal + 1; } if (TOC[e + 1] == 1) { shal = shal + 1; }
      if (c == 14) { if (shal > 0) { v = 15; } }
      else { if (lyJungle(c) == 1) {
        let fit = 0;
        if (lyJungle(n) == 1 || n == 4 || n == 5 || TOC[n + 1] > 0) { fit = fit + 1; } if (lyJungle(so) == 1 || so == 4 || so == 5 || TOC[so + 1] > 0) { fit = fit + 1; }
        if (lyJungle(w) == 1 || w == 4 || w == 5 || TOC[w + 1] > 0) { fit = fit + 1; } if (lyJungle(e) == 1 || e == 4 || e == 5 || TOC[e + 1] > 0) { fit = fit + 1; }
        if (fit < 4) { v = 23; } else { if (sea > 0) { v = 16; } }
      } else { if (c == 3 || c == 34 || c == 20) { if (sea > 0) { v = 25; } }
      else { if (TOC[c + 1] == 0) {
        if (TSN[c + 1] == 1) { if (sea > 0) { v = 26; } }
        else { if (c == 37 || c == 38) { if (sea == 0) { if (lyMesa(n) + lyMesa(so) + lyMesa(w) + lyMesa(e) < 4) { v = 2; } } }
        else { if (c != 7 && c != 6) { if (sea > 0) { v = 16; } } } }
      } } } }
      LY[o] = v; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// 17: the biomes made smooth, and a river (1) where the river noise of a cell and the four beside is not
// one region; 18: the rivers made smooth and laid into the biomes
function lyRiver(s, op) {
  let z = lbz, o = lyB + 1;
  while (z < lbz + lbh) {
    let x = lbx, ci = lyA + (z - laz) * law + lbx - lax + 1;
    while (x < lbx + lbw) {
      let c = LY[ci], n = LY[ci - law], so = LY[ci + law], w = LY[ci - 1], e = LY[ci + 1], v = c;
      let rc = LY[ci + 1024], rn = LY[ci + 1024 - law], rs2 = LY[ci + 1024 + law], rw = LY[ci + 1023], re = LY[ci + 1025], rv = rc;
      if (op == 17) {
        if (w == e && n == so) { lySeed(x, z, s); M_lnext(2); v = w; if (lyV == 1) { v = n; } }
        else { if (w == e) { v = w; } else { if (n == so) { v = n; } } }
        if (rc >= 2) { rc = 2 + mod(rc, 2); } if (rn >= 2) { rn = 2 + mod(rn, 2); } if (rs2 >= 2) { rs2 = 2 + mod(rs2, 2); }
        if (rw >= 2) { rw = 2 + mod(rw, 2); } if (re >= 2) { re = 2 + mod(re, 2); }
        rv = 1;
        if (rc == rn && rc == rs2 && rc == rw && rc == re) { rv = 0; }
        LY[o + 1024] = rv;
      } else {
        if (rw == re && rn == rs2) { lySeed(x, z, s); M_lnext(2); rv = rw; if (lyV == 1) { rv = rn; } }
        else { if (rw == re) { rv = rw; } else { if (rn == rs2) { rv = rn; } } }
        if (rv == 1) { if (TOC[c + 1] == 0) { v = 7; if (c == 12) { v = 11; } if (c == 14 || c == 15) { v = 15; } } }
      }
      LY[o] = v; o = o + 1; ci = ci + 1; x = x + 1;
    }
    z = z + 1;
  }
}
// the sea's warmth: a slow noise of its own (warm, lukewarm, cold, frozen), the deep seas alike
function tOcean(b, qx, qz) {
  let r = b;
  if (b == 0 || b == 24) {
    let q1 = noise2(qx * 4 - (0 - 61031), qz * 4 - (0 - 17239), 1536);
    let t = nI;
    let q2 = noise2(qx * 4 - (0 - 911), qz * 4 - (0 - 4421), 384);
    t = t - (0 - idiv(nI, 3));
    if (b == 0) { if (t > 520) { r = 44; } else { if (t > 250) { r = 45; } else { if (t < -520) { r = 10; } else { if (t < -250) { r = 46; } } } } }
    else { if (t > 250) { r = 48; } else { if (t < -520) { r = 50; } else { if (t < -250) { r = 49; } } } }
  }
  return r;
}
// the biome (the genre's number) of the 4-block cell (qx, qz) alone - no chunk made for it (/locatebiome,
// where the structures stand, the start); the last 32 asked are kept
let BQX = [], BQZ = [], BQV = [];
function tBiomeQ(qx, qz) {
  let s = mod(qx * 13 + qz * 7, 32) + 1;
  if (BQX[s] != qx || BQZ[s] != qz) {
    lyRun(qx, qz, 1, 1);
    BQX[s] = qx; BQZ[s] = qz; BQV[s] = tOcean(LY[lyA + 1], qx, qz);
  }
  return BQV[s];
}

// ---------------------------------------------------------------- the noise in 3D
// Perlin's noise in whole numbers: pn3 at (x, y, z), a lattice of p blocks across and q up; about -1024..1024
let pn3 = 0;
function noise3(x, y, z, p, q) {
  let xi = idiv(x, p), yi = idiv(y, q), zi = idiv(z, p);
  let fx = idiv((x - xi * p) * 1024, p), fy = idiv((y - yi * q) * 1024, q), fz = idiv((z - zi * p) * 1024, p);
  let gx = fx - 1024, gy = fy - 1024, gz = fz - 1024;
  // (the fade 6t^5 - 15t^4 + 10t^3, x 1024)
  let u = idiv(idiv(idiv(fx * fx, 1024) * fx, 1024) * (idiv(fx * (6 * fx - 15360), 1024) - (0 - 10240)), 1024);
  let v = idiv(idiv(idiv(fy * fy, 1024) * fy, 1024) * (idiv(fy * (6 * fy - 15360), 1024) - (0 - 10240)), 1024);
  let w = idiv(idiv(idiv(fz * fz, 1024) * fz, 1024) * (idiv(fz * (6 * fz - 15360), 1024) - (0 - 10240)), 1024);
  let xm = mod(xi, 256), ym = mod(yi, 256), zm = mod(zi, 256);
  let a = PERM[xm + 1] - (0 - ym), b = PERM[xm + 2] - (0 - ym);
  let aa = PERM[a + 1] - (0 - zm), ab = PERM[a + 2] - (0 - zm), ba = PERM[b + 1] - (0 - zm), bb = PERM[b + 2] - (0 - zm);
  let h = PERM[aa + 1] + 1, n000 = G3X[h] * fx - (0 - G3Y[h] * fy) - (0 - G3Z[h] * fz);
  h = PERM[ba + 1] + 1; let n100 = G3X[h] * gx - (0 - G3Y[h] * fy) - (0 - G3Z[h] * fz);
  h = PERM[ab + 1] + 1; let n010 = G3X[h] * fx - (0 - G3Y[h] * gy) - (0 - G3Z[h] * fz);
  h = PERM[bb + 1] + 1; let n110 = G3X[h] * gx - (0 - G3Y[h] * gy) - (0 - G3Z[h] * fz);
  h = PERM[aa + 2] + 1; let n001 = G3X[h] * fx - (0 - G3Y[h] * fy) - (0 - G3Z[h] * gz);
  h = PERM[ba + 2] + 1; let n101 = G3X[h] * gx - (0 - G3Y[h] * fy) - (0 - G3Z[h] * gz);
  h = PERM[ab + 2] + 1; let n011 = G3X[h] * fx - (0 - G3Y[h] * gy) - (0 - G3Z[h] * gz);
  h = PERM[bb + 2] + 1; let n111 = G3X[h] * gx - (0 - G3Y[h] * gy) - (0 - G3Z[h] * gz);
  let x00 = n000 * 1024 - (n000 - n100) * u, x10 = n010 * 1024 - (n010 - n110) * u, x01 = n001 * 1024 - (n001 - n101) * u, x11 = n011 * 1024 - (n011 - n111) * u;
  let y0 = idiv(x00 * 1024 - (x00 - x10) * v, 1048576), y1 = idiv(x01 * 1024 - (x01 - x11) * v, 1048576);
  pn3 = idiv(y0 * 1024 - (y0 - y1) * w, 1024);
}
// the two slow noises (five octaves each: 192 blocks across and 384 up, halved each time; the widest
// weighs 64) and the one that picks between them (three octaves from 60 across and 240 up): about -124..124
let tnV = 0;
function tNoise(x, y, z) {
  noise3(x - (0 - 3331), y, z - (0 - 7717), 60, 240); let m = pn3 * 4;
  noise3(x - (0 - 1723), y - (0 - 91), z - (0 - 2939), 30, 120); m = m - (0 - pn3 * 2);
  noise3(x - (0 - 5519), y - (0 - 37), z - (0 - 811), 15, 60); m = m - (0 - pn3);
  // (the pick: 0..1024 of the way from the first to the second; 12.8 / 20 of the widest octave + a half)
  let sel = idiv(m * 1640, 1024) - (0 - 512);
  let lo = 0, hi = 0;
  if (sel < 1024) {
    noise3(x, y, z, 192, 384); lo = pn3 * 16;
    noise3(x - (0 - 4129), y - (0 - 171), z - (0 - 613), 96, 192); lo = lo - (0 - pn3 * 8);
    noise3(x - (0 - 2281), y - (0 - 59), z - (0 - 9001), 48, 96); lo = lo - (0 - pn3 * 4);
    noise3(x - (0 - 6007), y - (0 - 23), z - (0 - 1409), 24, 48); lo = lo - (0 - pn3 * 2);
    noise3(x - (0 - 733), y - (0 - 11), z - (0 - 3767), 12, 24); lo = lo - (0 - pn3);
  }
  if (sel > 0) {
    noise3(x - (0 - 8111), y - (0 - 613), z - (0 - 5237), 192, 384); hi = pn3 * 16;
    noise3(x - (0 - 947), y - (0 - 331), z - (0 - 7103), 96, 192); hi = hi - (0 - pn3 * 8);
    noise3(x - (0 - 3463), y - (0 - 127), z - (0 - 2207), 48, 96); hi = hi - (0 - pn3 * 4);
    noise3(x - (0 - 5879), y - (0 - 71), z - (0 - 4513), 24, 48); hi = hi - (0 - pn3 * 2);
    noise3(x - (0 - 1987), y - (0 - 29), z - (0 - 6661), 12, 24); hi = hi - (0 - pn3);
  }
  // (x 4 / 1024: the widest octave weighs 64; tnV is the density x 16)
  if (sel <= 0) { tnV = idiv(lo, 16); } else { if (sel >= 1024) { tnV = idiv(hi, 16); } else { tnV = idiv(lo * 1024 - (lo - hi) * sel, 16384); } }
}

// ---------------------------------------------------------------- a chunk's biomes and densities, kept
// TC: 64 chunks at a time (the place by the chunk's number mod 8 each way; (v3.5) 16 before: the trees ask the
// chunks round the one being made, and those are made soon after), TCS cells each: 81 biomes (the
// 9 x 9 cells of 4 blocks from 2 before the chunk), 72 the points the columns pick their biome by, 25
// marks (is that column of densities worked out) and 25 x TKN densities x 16 (every 4 blocks, every 8 up)
let TC = [], TCKX = [], TCKZ = [], tce = 0, TVD = [], TYM = [];
function tcInit() {
  if (TC.length == 0) { let i = 0; while (i < TCS * 64) { TC.push(0); i = i + 1; } i = 0; while (i < 64) { TCKX.push(999999); TCKZ.push(0); i = i + 1; } i = 0; while (i <= TKN) { TVD.push(0); TYM.push(0); i = i + 1; } }
  let k = 1;
  while (k <= 64) { TCKX[k] = 999999; k = k + 1; }
  // (TW: the weights of the 5 x 5 cells round a column, 10 / root(d2 + 0.2), x 1000)
  // the height of each level the densities are known at: 8 l + 1
  let l = 0;
  while (l < TKN) { TYM[l + 1] = l * 8 + 1; l = l + 1; }
  PTX = []; PTZ = []; PTH = []; PTB = []; BQX = []; BQZ = []; BQV = [];
  k = 0;
  while (k < 64) { PTX.push(999999); PTZ.push(0); PTH.push(0); PTB.push(0); BQX.push(999999); BQZ.push(0); BQV.push(0); k = k + 1; }
}
// the chunk's place in TC (tce: its first cell - 1), its biomes made when it is not there
function tEntry(cx, cz) {
  let s = mod(cx, 8) * 8 + mod(cz, 8) + 1;
  tce = (s - 1) * TCS;
  if (TCKX[s] != cx || TCKZ[s] != cz) {
    TCKX[s] = cx; TCKZ[s] = cz;
    let qx0 = cx * 4 - 2, qz0 = cz * 4 - 2;
    lyRun(qx0, qz0, 9, 9);
    let j = 0, o = tce + 1, src = lyA + 1;
    while (j < 9) { let i = 0; while (i < 9) { TC[o] = tOcean(LY[src], qx0 + i, qz0 + j); o = o + 1; src = src + 1; i = i + 1; } j = j + 1; }
    // (the point of each of the 6 x 6 cells from 1 before the chunk: its middle moved by up to 1.5 blocks, x 16)
    j = 0; o = tce + 82;
    while (j < 6) {
      let i = 0;
      while (i < 6) {
        let qx = cx * 4 - 1 + i, qz = cz * 4 - 1 + j;
        lySeed(qx, qz, 4321);
        M_lnext(49); TC[o] = (qx * 4 + 2) * 16 + lyV - 24;
        M_lnext(49); TC[o + 1] = (qz * 4 + 2) * 16 + lyV - 24;
        o = o + 2; i = i + 1;
      }
      j = j + 1;
    }
    o = tce + 154; j = 0;
    while (j < 25) { TC[o + j] = 0; j = j + 1; }
  }
}
// the densities of column (i, j) (0..4 each) of the chunk in tce, once
function tDens(cx, cz, i, j) {
  let ck = i * 5 + j, mk = tce + 154 + ck;
  if (TC[mk] == 0) {
    TC[mk] = 1;
    // the depth and scale of the biomes round it (the genre's weights: nearer cells more, deeper cells
    // less, a cell higher than the middle one half)
    let d0c = TBD[TC[tce + (j + 2) * 9 + i + 2 + 1] + 1], fs = 0, fd = 0, fw = 0, a = 0, k = 1;
    while (a < 5) {
      let c = 0;
      while (c < 5) {
        let b = TC[tce + (j + c) * 9 + i + a + 1], d = TBD[b + 1], w = TW[k] * 1000;
        if (d > d0c) { w = idiv(w, 2); }
        w = idiv(w, d - (0 - 2000));
        fs = fs - (0 - TBS[b + 1] * w); fd = fd - (0 - d * w); fw = fw - (0 - w);
        c = c + 1; k = k + 1;
      }
      a = a + 1;
    }
    let dep = fd / fw / 1000 * 0.5 - 0.125, sc = fs / fw / 1000 * 0.9 + 0.1;
    let d0 = dep * 0.265625, d1 = 96 / sc;
    let x = cx * 16 + i * 4, z = cz * 16 + j * 4, l = 0, o = tce + 180 + ck * TKN;
    while (l < TKN) {
      let ym = TYM[l + 1], d8 = (1 - ym / 128 - 0.46875 + d0) * d1;
      if (d8 > 0) { d8 = d8 * 4; }
      let dn = Math.round(d8 * 16);
      // (where the noise could not change the sign it is left out)
      if (dn < 1200 && dn > -1200) { tNoise(x, ym, z); dn = dn - (0 - tnV); }
      if (dn > 4000) { dn = 4000; } if (dn < -4000) { dn = -4000; }
      // (under the world's top the land ends: eased to -10 over the last three levels)
      if (l > TKN - 4) { dn = idiv((dn + 160) * (TKN - 1 - l), 3) - 160; }
      TC[o + l] = dn;
      l = l + 1;
    }
  }
}
// the densities of the column (lx, lz) of the chunk (0..15) at the TKN levels: TVD (the four columns of
// densities round it worked out when they are not)
function tProfile(cx, cz, lx, lz) {
  let i = idiv(lx, 4), j = idiv(lz, 4), fx = lx - i * 4, fz = lz - j * 4;
  tDens(cx, cz, i, j);
  let o00 = tce + 179 + (i * 5 + j) * TKN, l = 1;
  if (fx == 0 && fz == 0) { while (l <= TKN) { TVD[l] = TC[o00 + l] * 16; l = l + 1; } }
  else {
    tDens(cx, cz, i + 1, j); tDens(cx, cz, i, j + 1); tDens(cx, cz, i + 1, j + 1);
    let w00 = (4 - fx) * (4 - fz), w10 = fx * (4 - fz), w01 = (4 - fx) * fz, w11 = fx * fz, o10 = o00 + TKN * 5, o01 = o00 + TKN, o11 = o00 + TKN * 6;
    while (l <= TKN) { TVD[l] = TC[o00 + l] * w00 - (0 - TC[o10 + l] * w10) - (0 - TC[o01 + l] * w01) - (0 - TC[o11 + l] * w11); l = l + 1; }
  }
}
// the biome (the genre's number) of column (x, z), by the nearest of the four cell points round it
let tbI = 0;
function tBiomeCol(cx, cz, x, z) {
  let lx = x - cx * 16, lz = z - cz * 16, a = idiv(lx + 2, 4), c = idiv(lz + 2, 4);
  let o = tce + 82 + (c * 6 + a) * 2, X = x * 16 + 8, Z = z * 16 + 8, best = 0, d = 0;
  let bx = TC[o] - X, bz = TC[o + 1] - Z;
  best = bx * bx - (0 - bz * bz); tbI = TC[tce + (c + 1) * 9 + a + 1 + 1];
  bx = TC[o + 2] - X; bz = TC[o + 3] - Z; d = bx * bx - (0 - bz * bz);
  if (d < best) { best = d; tbI = TC[tce + (c + 1) * 9 + a + 2 + 1]; }
  bx = TC[o + 12] - X; bz = TC[o + 13] - Z; d = bx * bx - (0 - bz * bz);
  if (d < best) { best = d; tbI = TC[tce + (c + 2) * 9 + a + 1 + 1]; }
  bx = TC[o + 14] - X; bz = TC[o + 15] - Z; d = bx * bx - (0 - bz * bz);
  if (d < best) { best = d; tbI = TC[tce + (c + 2) * 9 + a + 2 + 1]; }
}
// the land's top at column (x, z) from the densities alone (as genColumn finds it): for where a structure
// stands before its chunk is made. The last 64 asked are kept.
let PTX = [], PTZ = [], PTH = [], PTB = [];
function tPoint(x, z) {
  let s = mod(x * 31 + z * 17, 64) + 1;
  if (PTX[s] != x || PTZ[s] != z) {
    let cx = idiv(x, 16), cz = idiv(z, 16);
    tEntry(cx, cz);
    tProfile(cx, cz, x - cx * 16, z - cz * 16);
    let l = TKN - 1, top = 0;
    while (l >= 1 && top == 0) {
      if (TVD[l] > 0 || TVD[l + 1] > 0) {
        let t = 7;
        while (t >= 0 && top == 0) { if (TVD[l] * (8 - t) - (0 - TVD[l + 1] * t) > 0) { top = (l - 1) * 8 + t + 1; } t = t - 1; }
      }
      l = l - 1;
    }
    tBiomeCol(cx, cz, x, z);
    PTX[s] = x; PTZ[s] = z; PTH[s] = Math.max(1, top); PTB[s] = TBM[tbI + 1];
  }
  colH = PTH[s]; colB = PTB[s];
}

// ---------------------------------------------------------------- a column made
// the noise the top is laid by, about -8..8 (the genre's surface noise x 15)
let tsN = 0;
function tSurf(x, z) {
  M_inoise(x - (0 - 811), z - (0 - 3559), 64); tsN = nI * 4;
  M_inoise(x - (0 - 7919), z - (0 - 1237), 32); tsN = tsN - (0 - nI * 2);
  M_inoise(x - (0 - 3011), z - (0 - 9173), 16); tsN = tsN - (0 - nI);
  tsN = tsN / 900;
}
function genColumn2(x, z) {
  let cx = idiv(x, 16), cz = idiv(z, 16), ci = wcol(x, z);
  tProfile(cx, cz, x - cx * 16, z - cz * 16);
  tBiomeCol(cx, cz, x, z);
  let tb = tbI, b = TBM[tb + 1];
  tSurf(x, z);
  let sn = tsN, sd = Math.floor(sn / 3 + 3 + rnd() * 0.25);
  // the biome's top, filling and what lies under water
  let top = 2, fill = 3, uw = 9, cold = TSN[tb + 1];
  if (b == 1 || b == 4) { top = 8; fill = 8; uw = 8; }
  if (b == 6 || b == 19 || b == 27) { top = 20; }
  if (tb == 26) { top = 8; fill = 8; }
  if (b == 16) { top = I_mycelium; }
  if (b == 14) { top = I_redSand; fill = I_terracotta; uw = I_redSand; }
  if (b == 20) { top = 8; fill = 8; uw = 8; }
  if (tb == 45 || tb == 48) { uw = 8; }
  if (tb == 25) { top = 1; fill = 1; uw = 1; }
  if (tb == 3 || tb == 34 || tb == 20) { if (sn > 1) { top = 1; fill = 1; } }
  if (tb == 131 || tb == 162) { if (sn < -1 || sn > 2) { top = 9; fill = 9; } else { if (sn > 1) { top = 1; fill = 1; } } }
  if (tb == 32 || tb == 33 || tb == 160 || tb == 161) { if (sn > 1.75) { top = I_coarseDirt; } else { if (sn > -0.95) { top = I_podzol; } } }
  if (tb == 163 || tb == 164) { if (sn > 1.75) { top = 1; fill = 1; } else { if (sn > -0.5) { top = I_coarseDirt; } } }
  // (sand, gravel and clay in patches under shallow water)
  let q0 = noise2(x - (0 - 94), z - (0 - 19), 12);
  let fl = nI;
  // (a level of 8 cells at a time: where both its ends are air above the sea, or stone under a top long
  // laid, the cells are written straight - most of a column)
  // ((v3.5) between the levels 8 l + 1 and 8 l + 9 lie the cells 8 l + 1 .. 8 l + 8: the topmost run is of 7,
  // 249..255, and cell 0 under the lowest is the world's floor)
  let y = WY - 1, i = (ci - 1) * WY + WY, l = TKN - 1, t = 7, t0 = 6, v0 = 0, v1 = 0, run = 0 - 1, hm = 0, v = 0, md = 0, sol = 0;
  while (l >= 1) {
    v0 = TVD[l]; v1 = TVD[l + 1];
    md = 2;
    if (v0 > 0 && v1 > 0) { md = 1; } else { if (v0 <= 0 && v1 <= 0) { md = 0; } }
    if (md == 0 && y >= SEA + 7) {
      t = 0;
      while (t <= t0) { W[i] = 0; LT[i] = 0; i = i - 1; t = t + 1; }
      y = y - t0 - 1; run = 0 - 1;
      if (fill == 21) { fill = 8; }
    } else { if (md == 1 && run == 0 && y >= 12) {
      t = 0;
      while (t < 8) { W[i] = 1; LT[i] = 0; i = i - 1; t = t + 1; }
      y = y - 8;
    } else {
      t = t0;
      while (t >= 0) {
        v = 0; sol = md;
        if (md == 2) { sol = 0; if (v0 * (8 - t) - (0 - v1 * t) > 0) { sol = 1; } }
        if (sol == 1) {
          v = 1;
          if (hm == 0) { hm = y; }
          if (run == 0 - 1) {
            // the first stone under air or water: the top goes on it
            run = sd;
            if (sd <= 0) { run = 0; if (y < SEA - 1 && b != 14) { v = uw; } }
            else {
              if (y >= SEA - 1) {
                v = top;
                if (b == 14) { if (y > SEA + 16) { v = I_orangeTerracotta; run = 30; } else { run = 18; } }
                if (b == 7 || b == 6 || b == 27 || b == 5) { if (y > SEA + 31 && top == 2) { v = 20; } }
                if (b == 7) { if (y > SEA + 46) { v = 45; } }
                // (a swamp's ground at the water's height: a pool, where its noise says)
                if (b == 13) { if (y == SEA - 1) { if (fl > 0) { v = 7; } } }
              } else {
                if (y < SEA - 7 - sd) { v = uw; run = 0; if (uw != 9) { run = sd; } }
                else {
                  v = fill;
                  if (fl > 300) { v = 8; } if (fl < -520) { v = 22; }
                  if (b == 26 && fl > 120) { v = 8; }
                }
                if (b == 14) { v = I_redSand; }
              }
            }
          } else {
            if (run > 0) {
              run = run - 1; v = fill;
              if (fill == 8) { if (run == 0 && sd > 1) { v = 21; if (y > SEA - 4) { run = rndI(0, 3); if (run > 0) { fill = 21; } } } }
              if (fill == I_terracotta) { v = TBAND[mod(y, 16) + 1]; }
              if (fill == 21) { v = 21; }
            }
          }
        } else {
          run = 0 - 1;
          if (fill == 21) { fill = 8; }
          if (y < SEA) {
            v = 7;
            // (ice on the cold water: all of a frozen river and of the land's own water, most of a frozen sea)
            if (y == SEA - 1) { if (cold == 1) { if (tb != 10 && tb != 50) { v = 33; } else { if (fl > -200) { v = 33; } } } }
          }
        }
        // (the floor's rock: all of the lowest cell, less of each of the four above)
        if (y < 5) { if (rnd() < 1 - y * 0.2) { v = 6; } }
        W[i] = v; LT[i] = 0;
        y = y - 1; i = i - 1; t = t - 1;
      }
    } }
    t0 = 7;
    l = l - 1;
  }
  W[i] = 6; LT[i] = 0;
  HMAP[ci] = Math.max(1, hm); BIOM[ci] = b;
}

// ---------------------------------------------------------------- a lake dug into the ground
// (the genre's lake: a hollow of four to seven balls in a box of 16 x 8 x 16 - here the chunk itself, so it
// never reaches into a chunk not made - air in its upper half, the liquid in its lower; only where no liquid
// touches the upper half's rim and the lower half's rim is solid)
let LKM = [], LKA = [], LKC = [], LKE = [];
function tLake(liq, yq) {
  if (LKM.length == 0) { let i = 0; while (i < 2048) { LKM.push(0); i = i + 1; } i = 0; while (i < 16) { LKA.push(0); LKC.push(0); LKE.push(0); i = i + 1; } }
  let x0 = gx0, z0 = gz0, y = yq, i = wi(x0 + 8, y, z0 + 8);
  while (y > 5 && W[i] == 0) { y = y - 1; i = i - 1; }
  if (y > 8 && y < WY - 12) {
    y = y - 4;
    let k = 0;
    while (k < 2048) { LKM[k + 1] = 0; k = k + 1; }
    let n = rndI(4, 7), q = 0;
    while (q < n) {
      let d0 = rnd() * 6 + 3, d1 = rnd() * 4 + 2, d2 = rnd() * 6 + 3;
      let ax = rnd() * (16 - d0 - 2) + 1 + d0 / 2, ay = rnd() * (8 - d1 - 4) + 2 + d1 / 2, az = rnd() * (16 - d2 - 2) + 1 + d2 / 2;
      // (each axis' share of the ball's reach, x 4096, once: LKA across, LKC along, LKE up)
      let a = 1;
      while (a < 15) { let ux = (a - ax) / (d0 / 2), uz = (a - az) / (d2 / 2); LKA[a] = Math.floor(ux * ux * 4096); LKC[a] = Math.floor(uz * uz * 4096); a = a + 1; }
      a = 1;
      while (a < 7) { let uy = (a - ay) / (d1 / 2); LKE[a] = Math.floor(uy * uy * 4096); a = a + 1; }
      a = 1;
      while (a < 15) {
        let ua = LKA[a];
        if (ua < 4096) {
          let c = 1;
          while (c < 15) {
            let uc = ua - (0 - LKC[c]);
            if (uc < 4096) {
              let e = 1, m = (a * 16 + c) * 8 + 1;
              while (e < 7) { if (uc - (0 - LKE[e]) < 4096) { LKM[m + e] = 1; } e = e + 1; }
            }
            c = c + 1;
          }
        }
        a = a + 1;
      }
      q = q + 1;
    }
    // the rim: a cell not of the hollow beside one that is
    let ok = 1, a = 0;
    while (a < 16 && ok == 1) {
      let c = 0;
      while (c < 16 && ok == 1) {
        let e = 0;
        while (e < 8 && ok == 1) {
          let m = (a * 16 + c) * 8 + e + 1;
          if (LKM[m] == 0) {
            let rim = 0;
            if (a < 15) { if (LKM[m + 128] == 1) { rim = 1; } } if (a > 0) { if (LKM[m - 128] == 1) { rim = 1; } }
            if (c < 15) { if (LKM[m + 8] == 1) { rim = 1; } } if (c > 0) { if (LKM[m - 8] == 1) { rim = 1; } }
            if (e < 7) { if (LKM[m + 1] == 1) { rim = 1; } } if (e > 0) { if (LKM[m - 1] == 1) { rim = 1; } }
            if (rim == 1) {
              let wb = W[wi(x0 + a, y + e, z0 + c)];
              if (e >= 4) { if (BLQ[wb + 1] > 0) { ok = 0; } }
              else { if (BSOL[wb + 1] != 1 && wb != liq) { ok = 0; } }
            }
          }
          e = e + 1;
        }
        c = c + 1;
      }
      a = a + 1;
    }
    if (ok == 1) {
      a = 0;
      while (a < 16) {
        let c = 0;
        while (c < 16) {
          let e = 7, cb = BIOM[wcol(x0 + a, z0 + c)];
          while (e >= 0) {
            if (LKM[(a * 16 + c) * 8 + e + 1] == 1) {
              let j = wi(x0 + a, y + e, z0 + c);
              if (e >= 4) {
                W[j] = 0;
                // (what stood on it goes with it; the earth it opens to the sky grows grass)
                if (BSOL[W[j + 1] + 1] != 1 && BLQ[W[j + 1] + 1] == 0) { W[j + 1] = 0; }
              } else {
                W[j] = liq;
                if (liq == 7 && e == 3) { if (cb == 6 || cb == 19 || cb == 27 || cb == 8) { if (W[j + 1] == 0) { W[j] = 33; } } }
              }
            } else {
              if (e >= 3 && e < 7) { if (LKM[(a * 16 + c) * 8 + e + 2] == 1) {
                let j = wi(x0 + a, y + e, z0 + c);
                if (W[j] == 3) { if (BSOL[W[j + 2] + 1] != 1 && BSOL[W[j + 3] + 1] != 1) { W[j] = 2; if (cb == 16) { W[j] = I_mycelium; } if (cb == 6 || cb == 19 || cb == 27) { W[j] = 20; } } }
              } }
            }
            e = e - 1;
          }
          c = c + 1;
        }
        a = a + 1;
      }
    }
  }
}

// ---------------------------------------------------------------- where a new world begins
// land to start on, looked for from the middle outward (the genre looks for a biome to live in near 0, 0):
// tsX, tsZ
let tsX = 8, tsZ = 8;
function tStart() {
  let r = 0, found = 0;
  tsX = 8; tsZ = 8;
  while (r <= 1536 && found == 0) {
    let a = 0, st = 360;
    if (r > 0) { st = Math.max(15, 5760 / r); }
    while (a < 360 && found == 0) {
      let x = Math.floor(8 + sind(a) * r), z = Math.floor(8 + cosd(a) * r);
      let tb = tBiomeQ(idiv(x, 4), idiv(z, 4));
      if (tb == 1 || tb == 4 || tb == 5 || tb == 18 || tb == 19 || tb == 27 || tb == 35 || tb == 21 || tb == 22 || tb == 129 || tb == 132 || tb == 29) {
        // (and not at its very edge: the cells 16 blocks away are land too)
        let e1 = tBiomeQ(idiv(x, 4) + 4, idiv(z, 4)), e2 = tBiomeQ(idiv(x, 4) - 4, idiv(z, 4)), e3 = tBiomeQ(idiv(x, 4), idiv(z, 4) + 4), e4 = tBiomeQ(idiv(x, 4), idiv(z, 4) - 4);
        if (TOC[e1 + 1] == 0 && TOC[e2 + 1] == 0 && TOC[e3 + 1] == 0 && TOC[e4 + 1] == 0 && e1 != 7 && e2 != 7 && e3 != 7 && e4 != 7) { found = 1; tsX = x; tsZ = z; }
      }
      a = a + st;
    }
    r = r + 48;
  }
}
