// ============================================================
// Reading an OBJ file, and keeping it within Entry's lists
//
// A list of plain Entry holds 5000 items and no more, so the model is kept in
// pages. A page is a small model of its own: up to PG faces, and the vertices
// those faces use (up to PG, numbered within the page). A vertex that faces of
// two pages share is kept in both. What this buys is that no loop of the
// renderer ever needs a list longer than 5000, nor has to work out which list
// an index falls in: it runs through one page's lists, then the next page's.
//
// A face is a triangle or a four-cornered face (FE holds the fourth corner, or
// 0). Four-cornered faces are kept whole: one face to look at and one shape to
// fill where two triangles would be two of each. A face of more corners is cut
// into four-cornered ones (and a triangle if a corner is left over).
//
// The text is the file as it arrives through the answer box: the browser
// turns its line ends into spaces, so there are no lines any more, only words.
// The reader therefore goes by words alone:
//   v x y z            a vertex (anything after the three numbers is passed over)
//   f a b c ...        a face; a/b/c forms and negative numbers are taken
//   usemtl name        the material of the faces that follow
//   newmtl name, Kd r g b    (from a .mtl file pasted along) a material's colour
// and every other word is passed over. A `v` is believed only if three numbers
// follow it, so a stray "v" in a comment does no harm.
//
// The words are cut from a short buffer (index_of_string and substring are
// single blocks working at the browser's own speed), which is filled from the
// whole text CH characters at a time - a word costs about ten blocks however
// long it is.
//
// As they are read, the vertices go to the raw store (RX, RY, RZ: pages of
// their own, by the file's numbering). A face then asks for each corner's
// place in the page being filled; RM remembers that place (with a stamp that
// tells the page), so a vertex is copied into a page once.
// ============================================================
let TZ = [], HD = [], RAMP = [];
let PNV = [], PNF = [], PBG = [];           // vertices, faces and large faces of each page
let MN = [], MR = [], MG = [], MB = [];     // materials: name, colour (-1: none given)
let nPages = 0, nFaces = 0, nVerts = 0, rawN = 0, nMat = 0;

let ldT = ' ', ldLen = 0, ldPos = 1, ldW = '#', ldSt = 0, ldEnd = 0, ldOn = 0, ldGeo = 0, ldFull = 0;
let ldVX = 0, ldVY = 0, ldG0 = 0, ldG1 = 0, ldG2 = 0, ldFc = 0;
let pg = 1, pnv = 0, pnf = 0, stampLo = 0, stampN = 0;
let curMb = 1, curMat = 1, defMat = 0, matHit = 0, matKeep = 0, matNew = 0, matBase = 0;
let ck = 0, nBad = 0, nDrop = 0, tokCap = 600, nDup = 0, wLo = 0, wSeq = 0, wNB = 1, wPages = 0;
let fp = 0, fst = 0, bbN = 0, bx0 = 0, bx1 = 0, by0 = 0, by1 = 0, bz0 = 0, bz1 = 0, bcx = 0, bcy = 0, bcz = 0, bk = 1, vol = 0;
let lodG = 0, lodCs = 1, lodNV = 0, lodNF = 0, lodLv = 0;
let CT = [], HK = [], VMAP = [], LSX = [], LSY = [], LSZ = [], LCN = [], LFA = [], LFB = [], LFC = [], LFE = [], LFM = [];
let LVA = [0, 0, 0], LVB = [0, 0, 0], LVC = [0, 0, 0], LVN = [0, 0, 0], LVG = [0, 0, 0];
let nLv = 0, closed = 0, flipped = 0, ldMsg = ' ', modelName = ' ';

function M_put(L, i, v) {
  if (L.length < i) { L.push(v); } else { L[i] = v; }
}

// The materials. A text may bring a model, a model with its materials (the .mtl pasted
// along, before or after), or materials alone - for the model that is there, or for the
// one pasted next. So: the materials a text names are new ones, looked up among
// themselves (above matBase). When the text turns out to hold a model, the old ones are
// dropped and the new ones move down (modelReset). When it holds none, the old ones of
// the same names take the new colours (matMerge) and the new ones stay for the next text.
// the material called nm (made if it is new) -> matHit
function matFind(nm) {
  let k = matBase + 1;
  matHit = 0;
  while (k <= nMat && matHit == 0) {
    if (MN[k] == nm) { matHit = k; }
    k = k + 1;
  }
  if (matHit == 0) {
    if (nMat < MAXM) {
      nMat = nMat + 1; matHit = nMat; matNew = 1;
      M_put(MN, nMat, nm); M_put(MR, nMat, -1); M_put(MG, nMat, -1); M_put(MB, nMat, -1);
    } else { matHit = MAXM; }
  }
}

// a new model: what the last one left is forgotten (the lists keep their
// length and are written over)
function modelReset() {
  let k = 0, j = 0;
  rawN = 0; pg = 1; pnv = 0; pnf = 0;
  stampN = stampN + 1; stampLo = stampN * 8192;
  nBad = 0; nDrop = 0; ck = 0; ldFull = 0; ldGeo = 1; nDup = 0;
  wSeq = wSeq + 1; wLo = wSeq * 1048576;
  nLv = 0; nPages = 0; nFaces = 0; nVerts = 0;
  if (matBase > 0) {
    k = matBase + 1; j = 2;
    while (k <= nMat) { MN[j] = MN[k]; MR[j] = MR[k]; MG[j] = MG[k]; MB[j] = MB[k]; k = k + 1; j = j + 1; }
    if (curMat > matBase) { curMat = curMat - matBase + 1; } else { curMat = 1; }
    if (defMat > matBase) { defMat = defMat - matBase + 1; } else { defMat = 0; }
    nMat = j - 1; matBase = 1;
    MR[1] = -1; MG[1] = -1; MB[1] = -1;
  }
  curMb = (curMat - 1) * RS + 1;
}
function matMerge() {
  let m = matBase + 1, k = 0;
  while (m <= nMat) {
    k = 2;
    while (k <= matBase) {
      if (MN[k] == MN[m]) { MR[k] = MR[m]; MG[k] = MG[m]; MB[k] = MB[m]; }
      k = k + 1;
    }
    m = m + 1;
  }
}

function loadInit() {
  nMat = 0;
  matFind('-');
  while (PNV.length < NPT) { PNV.push(0); PNF.push(0); PBG.push(0); }
}

// the text t is to be read (it is read a part each frame by loadStep)
function loadBegin(t) {
  // (the '# #' at the end: a word that ends the last face, and one more so that the
  // last word read has something after its space)
  let s = `# ${t} # #`, k = 0;
  // tabs, line ends and the line-joining backslash are spaces; runs of spaces are one space
  s = replace(s, TAB, ' ');
  s = replace(s, LF, ' ');
  s = replace(s, CR, ' ');
  s = replace(s, BSL, ' ');
  while (indexOf(s, '  ') > 0) { s = replace(s, '  ', ' '); }
  ldT = s; ldLen = strlen(s); ldPos = 1; ldW = '#'; ldSt = 0; ldEnd = 0; ldGeo = 0; ldOn = 1; ldFc = 0;
  defMat = 0; matNew = 0; curMat = 1; curMb = 1;
  matBase = nMat;
  if (matKeep == 1) { matBase = 0; }
  // heads for the chains of vertices at one place: about one to a vertex the text may hold
  k = idiv(ldLen, 40 * PG) + 1;
  if (k > NQ) { k = NQ; }
  while (wPages < k) { wPages = wPages + 1; whGrow(wPages); }
  wNB = k * PG;
}

// one edge of a face with its direction: the sum over the model is 0 when every edge has
// its opposite (a closed surface whose faces all turn the same way)
function M_edge(u, v) {
  if (u < v) { ck = ck + mod(u * 65599 + v, 1000003); } else { ck = ck - mod(v * 65599 + u, 1000003); }
}
// Many files give a place more than once (a vertex for every face that meets there). Such
// vertices are found as they are read - a hash of the three numbers leads to the chain of
// the vertices read before that share it - and a later one only points at the first (RM
// below 0). The faces then use the first: fewer vertices to turn, and a surface that is
// closed is seen to be closed.
// the face of the file's vertices e0, e1, e2 and e3 (0: a triangle) into the page being filled
function M_emit() {
  bad = 0;
  if (e0 < 1 || e1 < 1 || e2 < 1 || e3 < 0 || e0 > rawN || e1 > rawN || e2 > rawN || e3 > rawN) { bad = 1; }
  if (e0 > RAWCAP || e1 > RAWCAP || e2 > RAWCAP || e3 > RAWCAP) { bad = 1; }
  if (bad == 1) { nBad = nBad + 1; }
  else {
    if (nDup > 0) {
      M_canon(e0);
      M_canon(e1);
      M_canon(e2);
      if (e3 > 0) { M_canon(e3); }
    }
    // (a corner twice: nothing to fill)
    if (e0 != e1 && e1 != e2 && e0 != e2 && e3 != e0 && e3 != e1 && e3 != e2) {
      M_edge(e0, e1);
      M_edge(e1, e2);
      if (e3 == 0) { M_edge(e2, e0); }
      else {
        M_edge(e2, e3);
        M_edge(e3, e0);
      }
      if (pnf >= PG || pnv + 4 > PG) {
        // the page is full: the next one
        if (pg >= NP) { ldFull = 1; }
        else {
          PNV[pg] = pnv; PNF[pg] = pnf;
          pg = pg + 1; pnv = 0; pnf = 0;
          stampN = stampN + 1; stampLo = stampN * 8192;
        }
      }
      if (ldFull == 1) { nDrop = nDrop + 1; }
      else {
        M_corner(e0, la);
        M_corner(e1, lb);
        M_corner(e2, lc);
        ld = 0;
        if (e3 > 0) { M_corner(e3, ld); }
        pnf = pnf + 1;
        M_facePut();
      }
    }
  }
}

// up to n words of the text
function parseStep(n) {
  let w = ldW, st = ldSt, k = 0, tok = '#', c = 0, g = 0, j = 0, hd = 0, em = 0, bad = 0;
  let vx = ldVX, vy = ldVY, g0 = ldG0, g1 = ldG1, g2 = ldG2, fc = ldFc, e0 = 0, e1 = 0, e2 = 0, e3 = 0;
  let qq = 0, kk = 0, m = 0, x = 0, y = 0, z = 0, miss = 0, la = 0, lb = 0, lc = 0, ld = 0, h = 0, hq = 0, hk = 0, j0 = 0, cn = 0, rm = 0;
  for (const _ of rep(n)) {
   if (ldEnd == 0) {
    k = indexOf(w, ' ');
    if (k == 0 || k == strlen(w)) {
      // no whole word with something after it left in the buffer: more of the text.
      // (So the buffer is never emptied - a function's local variable reads '' back as 0.)
      if (ldPos > ldLen) { ldEnd = 1; }
      else {
        c = ldPos + CH - 1;
        if (c > ldLen) { c = ldLen; }
        w = `${w}${substr(ldT, ldPos, c)}`;
        ldPos = c + 1;
      }
    } else {
      if (k > 1) {
        tok = substr(w, 1, k - 1);
        hd = 0;
        if (st > 0) {
          if (st == 4) {
            // a corner of a face. The corners gather: at the fourth a four-cornered face
            // goes out and its last edge is the first of the next; three left at the end
            // of the face are a triangle.
            if (indexOf('-0123456789', charAt(tok, 1)) > 0) {
              hd = 1;
              j = indexOf(tok, '/');
              if (j > 1) { tok = substr(tok, 1, j - 1); }
              g = tok * 1;
              if (g < 0) { g = rawN + 1 + g; }
              if (fc == 3) { e0 = g0; e1 = g1; e2 = g2; e3 = g; em = 1; g1 = g; fc = 2; }
              else {
                if (fc == 0) { g0 = g; }
                else {
                  if (fc == 1) { g1 = g; } else { g2 = g; }
                }
                fc = fc + 1;
              }
            } else {
              if (fc == 3) { e0 = g0; e1 = g1; e2 = g2; e3 = 0; em = 1; }
              st = 0; fc = 0;
            }
          } else {
            if (st <= 3) {
              // a coordinate of a vertex
              if (indexOf('-+.0123456789', charAt(tok, 1)) > 0) {
                hd = 1;
                if (st == 1) { vx = tok; st = 2; }
                else {
                  if (st == 2) { vy = tok; st = 3; }
                  else {
                    if (ldGeo == 0) { modelReset(); }
                    // a vertex at this place before?
                    h = idiv(mod((vx * 12.9898 + vy * 78.233 + tok * 37.719) * 43758.5453, wNB), 1);
                    if (h >= wNB) { h = 0; }
                    hq = idiv(h, PG); hk = h - hq * PG + 1;
                    M_whGet();
                    if (j > wLo) { j = j - wLo; } else { j = 0; }
                    j0 = j; cn = 0;
                    while (j > 0 && cn == 0) { M_chain(); }
                    rawN = rawN + 1;
                    if (rawN <= RAWCAP) {
                      rm = 0;
                      if (cn > 0) { rm = 0 - cn; nDup = nDup + 1; }
                      qq = idiv(rawN - 1, PG); kk = rawN - qq * PG;
                      M_rawPut();
                      if (cn == 0) { M_whSet(); }
                    }
                    st = 0;
                  }
                }
              } else { st = 0; }
            } else {
              hd = 1;
              if (st == 7) { matFind(tok); curMat = matHit; curMb = (matHit - 1) * RS + 1; st = 0; }
              else {
                if (st == 8) { matFind(tok); defMat = matHit; st = 0; }
                else {
                  // Kd r g b
                  if (indexOf('.0123456789', charAt(tok, 1)) > 0 && defMat > 0) {
                    c = Math.round(tok * 255);
                    if (c > 255) { c = 255; }
                    if (st == 9) { MR[defMat] = c; st = 10; }
                    else {
                      if (st == 10) { MG[defMat] = c; st = 11; }
                      else { MB[defMat] = c; st = 0; matNew = 1; }
                    }
                  } else { st = 0; hd = 0; }
                }
              }
            }
          }
        }
        if (em == 1) {
          em = 0;
          M_emit();
        }
        if (hd == 0) {
          c = indexOf(' v f usemtl newmtl Kd ', ` ${tok} `);
          if (c > 0) {
            if (c == 1) { st = 1; }
            else {
              if (c == 3) { st = 4; fc = 0; }
              else {
                if (c == 5) { st = 7; }
                else {
                  if (c == 12) { st = 8; } else { st = 9; }
                }
              }
            }
          }
        }
      }
      w = substr(w, k + 1, strlen(w));
    }
   }
  }
  ldW = w; ldSt = st; ldVX = vx; ldVY = vy; ldG0 = g0; ldG1 = g1; ldG2 = g2; ldFc = fc;
}

// ---- after the reading: each page is made ready -------------------------
// the box around the vertices
function M_bbox(VX, VY, VZ) {
  let i = 1, x = 0, a0 = bx0, a1 = bx1, b0 = by0, b1 = by1, c0 = bz0, c1 = bz1;
  if (bbN == 0) { a0 = VX[1] * 1; a1 = a0; b0 = VY[1] * 1; b1 = b0; c0 = VZ[1] * 1; c1 = c0; bbN = 1; }
  for (const _ of rep(n)) {
    x = VX[i] * 1;
    if (x < a0) { a0 = x; }
    if (x > a1) { a1 = x; }
    x = VY[i] * 1;
    if (x < b0) { b0 = x; }
    if (x > b1) { b1 = x; }
    x = VZ[i] * 1;
    if (x < c0) { c0 = x; }
    if (x > c1) { c1 = x; }
    i = i + 1;
  }
  bx0 = a0; bx1 = a1; by0 = b0; by1 = b1; bz0 = c0; bz1 = c1;
}
// the vertices as whole numbers: the middle of the box at 0, its corner VS away
function M_norm(VX, VY, VZ) {
  let i = 1, cx = bcx, cy = bcy, cz = bcz, k = bk;
  for (const _ of rep(n)) {
    VX[i] = Math.round((VX[i] - cx) * k);
    VY[i] = Math.round((VY[i] - cy) * k);
    VZ[i] = Math.round((VZ[i] - cz) * k);
    i = i + 1;
  }
}
// the lists the renderer writes in, as long as the page needs
function M_grow(SX, SY, LK, CL) {
  while (SX.length < nv) { SX.push(0); SY.push(0); }
  while (TZ.length < nv) { TZ.push(0); }
  while (CL.length < n) { CL.push(0); LK.push(0); }
}
// each face's plane: the unit normal (times MS) and where the plane lies along it.
// The normal is the cross product of the two diagonals, (c - a) x (d - b) - which for a
// triangle, taking d = c, is the usual (b - a) x (c - a).
// (P: the page. Faces as large as a fifth of the model across are counted: a model that has
// such faces gets its depths worked out the careful way - see the renderer.)
function M_fnorm(VX, VY, VZ, FA, FB, FC, FE, NA, NB, NC, ND, SX, SY, LK, CL, P) {
  let nbg = 0, i = 1, a = 0, ax = 0, ay = 0, pz = 0, ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0, nx = 0, ny = 0, nz = 0, l = 0, v = 0;
  M_grow(SX, SY, LK, CL);
  for (const _ of rep(n)) {
    a = FA[i]; ax = VX[a]; ay = VY[a]; pz = VZ[a];
    a = FC[i]; ux = VX[a] - ax; uy = VY[a] - ay; uz = VZ[a] - pz;
    if (FE[i] > 0) { a = FE[i]; }
    vx = VX[a]; vy = VY[a]; vz = VZ[a];
    a = FB[i]; vx = vx - VX[a]; vy = vy - VY[a]; vz = vz - VZ[a];
    nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx;
    l = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (l > BIGL) { nbg = nbg + 1; }
    if (l > 0) {
      v = v + nx * ax + ny * ay + nz * pz;
      l = MS / l;
      nx = Math.round(nx * l); ny = Math.round(ny * l); nz = Math.round(nz * l);
      M_put(NA, i, nx); M_put(NB, i, ny); M_put(NC, i, nz); M_put(ND, i, nx * ax + ny * ay + nz * pz);
    } else {
      M_put(NA, i, 0); M_put(NB, i, 0); M_put(NC, i, 0); M_put(ND, i, 0);
    }
    i = i + 1;
  }
  vol = vol + v;
  PBG[P] = nbg;
}
// the normals the other way round (a closed model whose faces were wound inwards)
function M_neg(NA, NB, NC, ND) {
  let i = 1;
  for (const _ of rep(n)) {
    NA[i] = 0 - NA[i]; NB[i] = 0 - NB[i]; NC[i] = 0 - NC[i]; ND[i] = 0 - ND[i];
    i = i + 1;
  }
}

// ---- the coarse models ---------------------------------------------------
// The space is cut into lodG cells a side. All the vertices in a cell become
// one vertex (their middle). A face whose corners fall in four or three
// different cells stays as a four-cornered face or a triangle, the others
// vanish, and of faces that became the same only one is kept (HK: a hash of
// the corners, turned so the least comes first).
function M_lodA(VX, VY, VZ, FA, FB, FC, FE, FM) {
  let i = 1, c = 0, id = 0, a = 0, b = 0, cc = 0, d = 0, t = 0, key = 0, h = 0, x = 0, y = 0, z = 0;
  let G = lodG, G2 = lodG * lodG, cs = lodCs, lv = lodNV, lf = lodNF;
  for (const _ of rep(nv)) {
    x = VX[i]; y = VY[i]; z = VZ[i];
    c = idiv(x + VS, cs) + G * idiv(y + VS, cs) + G2 * idiv(z + VS, cs) + 1;
    id = CT[c];
    if (id == 0) {
      lv = lv + 1; id = lv; CT[c] = id;
      M_put(LSX, id, x); M_put(LSY, id, y); M_put(LSZ, id, z); M_put(LCN, id, 1);
    } else {
      LSX[id] = LSX[id] + x; LSY[id] = LSY[id] + y; LSZ[id] = LSZ[id] + z; LCN[id] = LCN[id] + 1;
    }
    VMAP[i] = id;
    i = i + 1;
  }
  i = 1;
  for (const _ of rep(n)) {
    a = VMAP[FA[i]]; b = VMAP[FB[i]]; cc = VMAP[FC[i]]; d = 0;
    if (FE[i] > 0) {
      d = VMAP[FE[i]];
      // (two neighbouring corners in one cell: a triangle is left)
      if (d == a || d == cc) { d = 0; }
      else {
        if (a == b) { b = cc; cc = d; d = 0; }
        else {
          if (b == cc) { cc = d; d = 0; }
        }
      }
    }
    if (a != b && b != cc && a != cc && b != d && lf < LODMAX) {
      // the least corner first
      t = a;
      if (b < t) { t = b; }
      if (cc < t) { t = cc; }
      if (d > 0 && d < t) { t = d; }
      while (a != t) {
        h = a; a = b; b = cc;
        if (d > 0) { cc = d; d = h; } else { cc = h; }
      }
      key = ((a * 4096 + b) * 4096 + cc) * 4096 + d;
      h = mod(key, HKN) + 1;
      while (HK[h] != 0 && HK[h] != key) {
        h = h + 1;
        if (h > HKN) { h = 1; }
      }
      if (HK[h] == 0) {
        HK[h] = key; lf = lf + 1;
        M_put(LFA, lf, a); M_put(LFB, lf, b); M_put(LFC, lf, cc); M_put(LFE, lf, d); M_put(LFM, lf, FM[i]);
      }
    }
    i = i + 1;
  }
  lodNV = lv; lodNF = lf;
}
function M_lodStore(VX, VY, VZ, FA, FB, FC, FE, FM) {
  let i = 1, c = 0;
  for (const _ of rep(lodNV)) {
    c = LCN[i];
    M_put(VX, i, Math.round(LSX[i] / c)); M_put(VY, i, Math.round(LSY[i] / c)); M_put(VZ, i, Math.round(LSZ[i] / c));
    i = i + 1;
  }
  i = 1;
  for (const _ of rep(lodNF)) {
    M_put(FA, i, LFA[i]); M_put(FB, i, LFB[i]); M_put(FC, i, LFC[i]); M_put(FE, i, LFE[i]); M_put(FM, i, LFM[i]);
    i = i + 1;
  }
}
function lodClear() {
  let i = 1, n = lodG * lodG * lodG;
  while (CT.length < n) { CT.push(0); }
  while (HK.length < HKN) { HK.push(0); }
  while (VMAP.length < PG) { VMAP.push(0); }
  for (const _ of rep(n)) { CT[i] = 0; i = i + 1; }
  i = 1;
  for (const _ of rep(HKN)) { HK[i] = 0; i = i + 1; }
  lodNV = 0; lodNF = 0;
  lodCs = (2 * VS + 1) / lodG;
}

// the colours: for each material RS steps from dark to light
function M_hex(v) {
  hv = Math.round(v);
  if (hv > 255) { hv = 255; }
  if (hv < 0) { hv = 0; }
  s = `${s}${HX[hv + 1]}`;
}
function rampBuild() {
  let m = 1, j = 0, r = 0, g = 0, b = 0, t = 0, c = 0, s = '#', o = 1, h = 0, hv = 0;
  while (m <= nMat) {
    r = MR[m]; g = MG[m]; b = MB[m];
    if (colMode == 1 || (r < 0 && nMat <= 2)) { r = 214; g = 184; b = 150; }
    else {
      if (colMode == 2) { r = 150; g = 186; b = 226; }
      else {
        if (r < 0) {
          // no colour given: one of twelve
          h = mod(m - 2, 12) * 3 + 1;
          r = AUTOC[h]; g = AUTOC[h + 1]; b = AUTOC[h + 2];
        }
      }
    }
    j = 0;
    while (j < RS) {
      // light from where the eye is: 0 edge-on .. 1 face-on, a floor of ambient light,
      // and a little white at the very front
      t = j / NSH;
      if (t > 1) { t = 1; }
      h = 0.2 + 0.8 * t;
      c = 0;
      if (t > 0.9) { c = (t - 0.9) * 300; }
      s = '#';
      M_hex(r * h + c);
      M_hex(g * h + c);
      M_hex(b * h + c);
      M_put(RAMP, o, s);
      o = o + 1; j = j + 1;
    }
    m = m + 1;
  }
}

// what there is to draw: the model itself, then the coarse ones
function levelsBuild() {
  let f = 0, v = 0, p = 1;
  let g = 0;
  while (p <= nPages) { f = f + PNF[p]; v = v + PNV[p]; g = g + PBG[p]; p = p + 1; }
  nFaces = f; nVerts = v;
  LVA[1] = 1; LVB[1] = nPages; LVN[1] = f; LVC[1] = v + 2 * f; LVG[1] = g;
  nLv = 1;
  p = NP + 1;
  while (p <= NPT) {
    // (a coarse model is drawn with both sides: every face of it costs the whole 3)
    if (PNF[p] > 0) { nLv = nLv + 1; LVA[nLv] = p; LVB[nLv] = p; LVN[nLv] = PNF[p]; LVC[nLv] = PNV[p] + 3 * PNF[p]; LVG[nLv] = PBG[p]; }
    p = p + 1;
  }
}

// a part of the work on the text each frame; ldOn says where it stands
//   1 reading   2 box   3 whole numbers   4 planes   5 coarse models   6 turning inside out   0 done
function loadStep() {
  let p = 0, r = 0;
  if (ldOn == 1) {
    parseStep(tokCap);
    ldMsg = `읽는 중 ${idiv(ldPos * 100, ldLen + 1)}%`;
    if (ldEnd == 1) {
      ldT = ' '; ldW = '#';
      if (ldGeo == 0) {
        // no model in it: a .mtl alone gives the materials their colours
        if (matNew == 1) { matMerge(); matKeep = 1; rampBuild(); viewGen = viewGen + 1; ldMsg = ' '; }
        else { ldMsg = '꼭짓점(v)과 면(f)을 찾지 못했습니다'; }
        ldOn = 0;
      } else {
        matKeep = 0;
        PNV[pg] = pnv; PNF[pg] = pnf;
        nPages = pg;
        if (pnf == 0) { nPages = pg - 1; }
        p = NP + 1;
        while (p <= NPT) { PNV[p] = 0; PNF[p] = 0; PBG[p] = 0; p = p + 1; }
        if (nPages == 0) { ldMsg = '면(f)이 없습니다'; ldOn = 0; nLv = 0; viewGen = viewGen + 1; }
        else { ldOn = 2; fp = 1; bbN = 0; }
      }
    }
  } else {
    ldMsg = `다듬는 중 ${ldOn - 1}/5`;
    if (ldOn == 2) {
      pageOp(fp, 1);
      fp = fp + 1;
      if (fp > nPages) {
        bcx = (bx0 + bx1) / 2; bcy = (by0 + by1) / 2; bcz = (bz0 + bz1) / 2;
        r = Math.sqrt((bx1 - bx0) * (bx1 - bx0) + (by1 - by0) * (by1 - by0) + (bz1 - bz0) * (bz1 - bz0)) / 2;
        if (r > 0) { bk = VS / r; } else { bk = 1; }
        ldOn = 3; fp = 1;
      }
    } else {
      if (ldOn == 3) {
        pageOp(fp, 2);
        fp = fp + 1;
        if (fp > nPages) { ldOn = 4; fp = 1; vol = 0; }
      } else {
        if (ldOn == 4) {
          pageOp(fp, 3);
          fp = fp + 1;
          if (fp > nPages) {
            levelsBuild();
            ldOn = 5; lodLv = 1; fst = 0;
            lodG = 16;
          }
        } else {
          if (ldOn == 5) { lodStep(); }
          else {
            // closed and wound inwards: the normals are turned
            closed = 0; flipped = 0;
            if (ck == 0 && nBad == 0 && nDrop == 0) { closed = 1; }
            if (closed == 1 && vol < 0) {
              flipped = 1;
              p = 1;
              while (p <= NPT) {
                if (PNF[p] > 0) { pageOp(p, 4); }
                p = p + 1;
              }
            }
            levelsBuild();
            rampBuild();
            sideSet();
            viewReset();
            pickWas = 9;
            ldOn = 0; ldMsg = ' ';
          }
        }
      }
    }
  }
}

// the coarse models, a page a frame. Level 1 (NP + 1) is made when the model
// has more than LOD1MIN faces, level 2 (NP + 2) when more than LOD2MIN;
// a level that would not fit is tried again with larger cells.
function lodStep() {
  let need = 0, tp = NP + lodLv, v0 = 0;
  if (lodLv == 1 && nFaces > LOD1MIN) { need = 1; }
  if (lodLv == 2 && nFaces > LOD2MIN) { need = 1; }
  if (need == 0) { fst = 9; }
  if (fst == 0) { lodClear(); fst = 1; fp = 1; }
  else {
    if (fst == 1) {
      pageOp(fp, 5);
      fp = fp + 1;
      if (fp > nPages) {
        if (lodNF >= LODMAX && lodG > 4) {
          lodG = lodG - 3; fst = 0;
        } else {
          // (a coarse model with nearly as many faces as the model is no use)
          if (lodNF * 10 > nFaces * 7 || lodNF < 4) { fst = 9; }
          else {
            if (lodLv == 1) { lodStore1(); } else { lodStore2(); }
            PNV[tp] = lodNV; PNF[tp] = lodNF;
            // (its planes; the volume is the model's own)
            v0 = vol;
            pageOp(tp, 3);
            vol = v0;
            fst = 9;
          }
        }
      }
    }
  }
  if (fst == 9) {
    if (lodLv == 1) { lodLv = 2; fst = 0; lodG = idiv(lodG, 2); }
    else { ldOn = 6; }
  }
}
