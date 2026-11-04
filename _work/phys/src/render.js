// ============================================================
// The picture: filled faces drawn from the far ones to the near ones (each face hung
// on the chain of its depth bucket, so nothing is sorted), on a checkered ground with
// round shadows. Light from above and in front; soft bodies can be coloured by their
// elastic energy density instead.
// Plain Entry smooths the edges of fills and leaves hairlines between faces, so there
// every face also gets its edges drawn as pen lines of its own colour (the pen's layer
// lies under the fills and shows through the hairlines). tessvm needs none.
// ============================================================
let camTX = 0, camTY = 0.2, camTZ = 0, camD = 2.2, az = 30, el = 22, viewGen = 1, shownGen = 0, colMode = 0, isTess = 0;
let eyeX = 0, eyeY = 0, eyeZ = 0, fwX = 0, fwY = 0, fwZ = 0, rtX = 0, rtY = 0, rtZ = 0, upX = 0, upY = 0, upZ = 0;
let GPX = [], GPY = [], GPZ = [], nGV = 0, eMax = 1;

// a face; its corners are turned to go round anticlockwise seen from outside later (faceFix)
function addFace(a, b, c, d, r, g, bl, s) {
  if (nF < FCAP) {
    nF = nF + 1;
    GA[nF] = a; GB[nF] = b; GC[nF] = c; GD[nF] = d; GR[nF] = Math.round(r); GG[nF] = Math.round(g); GBL[nF] = Math.round(bl); GS[nF] = s;
    faceFix(nF);
  }
}
// the corner's place at the time the face is made (soft: world, rigid: the body's frame)
function M_vget(v, x, y, z) {
  if (v > RVO) { x = LX[v - RVO]; y = LY[v - RVO]; z = LZ[v - RVO]; }
  else { x = PX[v]; y = PY[v]; z = PZ[v]; }
}
// faces of convex bodies: outward is away from the middle (fixC*)
function faceFix(f) {
  let ax = 0, ay = 0, az0 = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0, dx = 0, dy = 0, dz = 0, nx = 0, ny = 0, nz = 0, t = 0, v = GD[f];
  M_vget(GA[f], ax, ay, az0); M_vget(GB[f], bx, by, bz); M_vget(GC[f], cx, cy, cz);
  if (v > 0) {
    M_vget(v, dx, dy, dz);
    nx = (cy - ay) * (dz - bz) - (cz - az0) * (dy - by); ny = (cz - az0) * (dx - bx) - (cx - ax) * (dz - bz); nz = (cx - ax) * (dy - by) - (cy - ay) * (dx - bx);
  } else {
    nx = (by - ay) * (cz - az0) - (bz - az0) * (cy - ay); ny = (bz - az0) * (cx - ax) - (bx - ax) * (cz - az0); nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }
  if (nx * (ax - fixCX) + ny * (ay - fixCY) + nz * (az0 - fixCZ) < 0) {
    // the other way round
    if (v > 0) { t = GB[f]; GB[f] = GD[f]; GD[f] = t; } else { t = GB[f]; GB[f] = GC[f]; GC[f] = t; }
  }
}
let fixCX = 0, fixCY = 0, fixCZ = 0;

function M_lv(x, y, z) {
  nL = nL + 1;
  LX[nL] = x; LY[nL] = y; LZ[nL] = z; LB[nL] = r;
}
// the faces of rigid body r, in its own frame
function rigidMesh(r) {
  let st = 0, i = 0, j = 0, v0 = nL, a = RA[r], b = RB[r], c = RC[r], th = 0, ph = 0, s = 0, cr = RCR[r], cg = RCG[r], cb = RCB[r], k = 0, p0 = 0;
  fixCX = 0; fixCY = 0; fixCZ = 0;
  if (RIM[r] == 0) { st = -1; }
  if (RK[r] == 2) {
    k = 1;
    for (const _ of rep(8)) { M_lv(SGX[k] * a, SGY[k] * b, SGZ[k] * c); k = k + 1; }
    v0 = v0 + RVO;
    // the faces of x a little darker and those of z a little lighter: a turn shows
    addFace(v0 + 1, v0 + 3, v0 + 7, v0 + 5, cr * 0.82, cg * 0.82, cb * 0.82, st);
    addFace(v0 + 2, v0 + 4, v0 + 8, v0 + 6, cr * 0.82, cg * 0.82, cb * 0.82, st);
    addFace(v0 + 1, v0 + 2, v0 + 6, v0 + 5, cr, cg, cb, st);
    addFace(v0 + 3, v0 + 4, v0 + 8, v0 + 7, cr, cg, cb, st);
    addFace(v0 + 1, v0 + 2, v0 + 4, v0 + 3, Math.min(255, cr * 1.1 + 20), Math.min(255, cg * 1.1 + 20), Math.min(255, cb * 1.1 + 20), st);
    addFace(v0 + 5, v0 + 6, v0 + 8, v0 + 7, Math.min(255, cr * 1.1 + 20), Math.min(255, cg * 1.1 + 20), Math.min(255, cb * 1.1 + 20), st);
  } else {
    // a sphere: poles and SPR rings of SPS points, in two colours by halves so a turn shows
    M_lv(0, a, st);
    i = 1;
    while (i <= SPR) {
      th = 180 * i / (SPR + 1);
      j = 0;
      while (j < SPS) {
        ph = 360 * j / SPS;
        M_lv(a * sind(th) * cosd(ph), a * cosd(th), a * sind(th) * sind(ph));
        j = j + 1;
      }
      i = i + 1;
    }
    M_lv(0, 0 - a, st);
    v0 = v0 + RVO;
    j = 0;
    while (j < SPS) {
      s = 1;
      if (j * 2 >= SPS) { s = 0.7; }
      k = (j + 1) % SPS;
      addFace(v0 + 1, v0 + 2 + j, v0 + 2 + k, 0, cr * s, cg * s, cb * s, st);
      i = 1;
      while (i < SPR) {
        p0 = v0 + 2 + (i - 1) * SPS;
        addFace(p0 + j, p0 + SPS + j, p0 + SPS + k, p0 + k, cr * s, cg * s, cb * s, st);
        i = i + 1;
      }
      p0 = v0 + 2 + (SPR - 1) * SPS;
      addFace(p0 + j, v0 + 2 + SPR * SPS, p0 + k, 0, cr * s, cg * s, cb * s, st);
      j = j + 1;
    }
  }
}

// the camera: eye, forward, right, up
function camera() {
  let ca = cosd(az), sa = sind(az), ce = cosd(el), se = sind(el);
  eyeX = camTX + camD * sa * ce; eyeY = camTY + camD * se; eyeZ = camTZ + camD * ca * ce;
  fwX = 0 - sa * ce; fwY = 0 - se; fwZ = 0 - ca * ce;
  rtX = ca; rtY = 0; rtZ = 0 - sa;
  upX = rtY * fwZ - rtZ * fwY; upY = rtZ * fwX - rtX * fwZ; upZ = rtX * fwY - rtY * fwX;
}
// world point (x y z) to the stage: sx sy, depth z0 (z0 <= NEAR: behind)
function M_proj(x, y, z) {
  px = x - eyeX; py = y - eyeY; pz = z - eyeZ;
  z0 = px * fwX + py * fwY + pz * fwZ;
  if (z0 > NEAR) {
    sx = FOC * (px * rtX + py * rtY + pz * rtZ) / z0;
    sy = FOC * (px * upX + py * upY + pz * upZ) / z0;
  }
}

function colourOf(r, g, b) {
  if (r > 255) { r = 255; } if (g > 255) { g = 255; } if (b > 255) { b = 255; }
  if (r < 0) { r = 0; } if (g < 0) { g = 0; } if (b < 0) { b = 0; }
  return str('#', HX[Math.round(r) + 1], HX[Math.round(g) + 1], HX[Math.round(b) + 1]);
}
// energy density to a colour: blue, cyan, green, yellow, red
function rampR(v) { let r = 0; if (v > 0.5) { r = 255; } else { if (v > 0.25) { r = (v - 0.25) * 4 * 255; } } return r; }
function rampG(v) { let g = 0; if (v < 0.25) { g = v * 4 * 255; } else { if (v < 0.75) { g = 255; } else { g = (1 - v) * 4 * 255; } } return g; }
function rampB(v) { let b = 0; if (v < 0.25) { b = 255; } else { if (v < 0.5) { b = (0.5 - v) * 4 * 255; } } return b; }

function background() {
  eraseAll();
  fillStop();
  penUp();
  penColorHex(BGCOL);
  penSize(290);
  goto(-250, 0);
  penDown();
  goto(250, 0);
  penUp();
  penSize(1);
}

// a filled face of 3 or 4 points (the stage places) in colour col
function M_fill4(a, b, c, d, col) {
  if (isTess == 0) {
    penUp();
    fillStop();
    goto(SX[a], SY[a]);
    penColorHex(col);
    fillColorHex(col);
    fillStart();
    penDown();
    goto(SX[b], SY[b]);
    goto(SX[c], SY[c]);
    if (d > 0) { goto(SX[d], SY[d]); }
    goto(SX[a], SY[a]);
    penUp();
  } else {
    fillStop();
    goto(SX[a], SY[a]);
    fillColorHex(col);
    fillStart();
    goto(SX[b], SY[b]);
    goto(SX[c], SY[c]);
    if (d > 0) { goto(SX[d], SY[d]); }
  }
}

function render() {
  let i = 1, r = 0, k = 0, j = 0, x = 0, y = 0, z = 0, px = 0, py = 0, pz = 0, z0 = 0, sx = 0, sy = 0, a = 0, b = 0, c = 0, d = 0;
  let nx = 0, ny = 0, nz = 0, n = 0, lam = 0, sh = 0, w = 0, bk = 0, bs = NBK / (camD * 2.6), cr = 0, cg = 0, cb = 0, v = 0, col = ' ', m = 0, n0 = 0;
  let ax = 0, ay = 0, azz = 0;
  camera();
  if (colMode == 1) {
    // the colours of energy density: scaled to the largest node there is now (eased)
    softElastic();
    m = 0;
    for (const _ of rep(nN)) { if (NEC[i] > 0) { NE[i] = NE[i] / NEC[i]; if (NE[i] > m) { m = NE[i]; } } i = i + 1; }
    if (m > eMax) { eMax = m; } else { eMax = eMax * 0.9 + m * 0.1; }
    if (eMax <= 0) { eMax = 1; }
  }
  // places: soft nodes as they are, rigid vertices through their body
  i = 1;
  for (const _ of rep(nN)) {
    x = PX[i]; y = PY[i]; z = PZ[i];
    WX[i] = x; WY[i] = y; WZ[i] = z;
    M_proj(x, y, z);
    TZ[i] = z0; SX[i] = sx; SY[i] = sy;
    i = i + 1;
  }
  i = 1;
  for (const _ of rep(nL)) {
    r = LB[i];
    x = RX[r] + R11[r] * LX[i] + R12[r] * LY[i] + R13[r] * LZ[i];
    y = RY[r] + R21[r] * LX[i] + R22[r] * LY[i] + R23[r] * LZ[i];
    z = RZ[r] + R31[r] * LX[i] + R32[r] * LY[i] + R33[r] * LZ[i];
    k = RVO + i;
    WX[k] = x; WY[k] = y; WZ[k] = z;
    M_proj(x, y, z);
    TZ[k] = z0; SX[k] = sx; SY[k] = sy;
    i = i + 1;
  }
  // faces: seen from the front and in front of the eye, onto the chains
  i = 1;
  for (const _ of rep(nF)) {
    a = GA[i]; b = GB[i]; c = GC[i]; d = GD[i];
    if (d > 0) {
      ax = WX[c] - WX[a]; ay = WY[c] - WY[a]; azz = WZ[c] - WZ[a];
      x = WX[d] - WX[b]; y = WY[d] - WY[b]; z = WZ[d] - WZ[b];
      w = TZ[a] + TZ[b] + TZ[c] + TZ[d];
      v = Math.min(TZ[a], TZ[b], TZ[c], TZ[d]);
    } else {
      ax = WX[b] - WX[a]; ay = WY[b] - WY[a]; azz = WZ[b] - WZ[a];
      x = WX[c] - WX[a]; y = WY[c] - WY[a]; z = WZ[c] - WZ[a];
      w = (TZ[a] + TZ[b] + TZ[c]) * 4 / 3;
      v = Math.min(TZ[a], TZ[b], TZ[c]);
    }
    nx = ay * z - azz * y; ny = azz * x - ax * z; nz = ax * y - ay * x;
    if (v > NEAR && nx * (eyeX - WX[a]) + ny * (eyeY - WY[a]) + nz * (eyeZ - WZ[a]) > 0) {
      n = Math.sqrt(nx * nx + ny * ny + nz * nz);
      lam = (nx * LIX + ny * LIY + nz * LIZ) / n;
      if (lam < 0) { lam = 0; }
      sh = 0.42 + 0.58 * lam;
      if (colMode == 1 && GS[i] > 0) {
        v = (NE[a] + NE[b] + NE[c]) / eMax / 3;
        if (d > 0) { v = (NE[a] + NE[b] + NE[c] + NE[d]) / eMax / 4; }
        if (v > 1) { v = 1; }
        v = Math.sqrt(v);
        CL[i] = colourOf(rampR(v) * sh, rampG(v) * sh, rampB(v) * sh);
      } else {
        CL[i] = colourOf(GR[i] * sh, GG[i] * sh, GBL[i] * sh);
      }
      // (the faces of bodies that never move - slopes, stands - are mostly under or behind
      // what moves on them, and big: they count by their farthest corner)
      if (GS[i] < 0) {
        w = Math.max(TZ[a], TZ[b], TZ[c]);
        if (d > 0) { w = Math.max(w, TZ[d]); }
        w = w * 4;
      }
      bk = Math.floor(w * bs / 4) + 1;
      if (bk > NBK) { bk = NBK; }
      LK[i] = HD[bk];
      HD[bk] = i;
    }
    i = i + 1;
  }
  background();
  drawGround();
  drawShadows();
  // the chains, far to near
  bk = NBK;
  for (const _ of rep(NBK)) {
    i = HD[bk];
    HD[bk] = 0;
    while (i > 0) {
      col = CL[i];
      M_fill4(GA[i], GB[i], GC[i], GD[i], col);
      i = LK[i];
    }
    bk = bk - 1;
  }
  // what is held: a band from the node to the pointer
  if (grabN > 0) {
    x = SX[grabI]; y = SY[grabI]; nx = grabSX - x; ny = grabSY - y; n = Math.sqrt(nx * nx + ny * ny) + 0.001;
    nx = nx / n * 1.5; ny = ny / n * 1.5;
    fillStop();
    goto(x - ny, y + nx);
    fillColorHex('#ffd84a');
    fillStart();
    goto(x + ny, y - nx); goto(grabSX + ny, grabSY - nx); goto(grabSX - ny, grabSY + nx);
    fillStop();
    goto(grabSX - 3, grabSY - 3);
    fillStart();
    goto(grabSX + 3, grabSY - 3); goto(grabSX + 3, grabSY + 3); goto(grabSX - 3, grabSY + 3);
  }
  fillStop();
  penUp();
  shownGen = viewGen;
}

// the checkered ground, gN x gN squares of gS
function drawGround() {
  let i = 0, j = 0, k = 1, x = 0, z = 0, px = 0, py = 0, pz = 0, z0 = 0, sx = 0, sy = 0, a = 0, h = gN * gS / 2, col = ' ';
  if (gN > 0) {
    // the grid points, kept (for the stage) after the soft and rigid places
    k = RVO + LCAP - (gN + 1) * (gN + 1);
    j = 0;
    while (j <= gN) {
      i = 0;
      while (i <= gN) {
        x = i * gS - h; z = j * gS - h;
        M_proj(x, 0, z);
        k = k + 1;
        TZ[k] = z0; SX[k] = sx; SY[k] = sy;
        i = i + 1;
      }
      j = j + 1;
    }
    k = RVO + LCAP - (gN + 1) * (gN + 1);
    j = 0;
    while (j < gN) {
      i = 0;
      while (i < gN) {
        a = k + j * (gN + 1) + i + 1;
        if (TZ[a] > NEAR && TZ[a + 1] > NEAR && TZ[a + gN + 1] > NEAR && TZ[a + gN + 2] > NEAR) {
          col = GCOL1;
          if ((i + j) % 2 == 1) { col = GCOL2; }
          M_fill4(a, a + 1, a + gN + 2, a + gN + 1, col);
        }
        i = i + 1;
      }
      j = j + 1;
    }
  }
}

// a round shadow under each body that moves, smaller the higher it is
function drawShadows() {
  let r = 2, b = 1, k = 0, x = 0, z = 0, ra = 0, rb = 0, hh = 0, s = 0, px = 0, py = 0, pz = 0, z0 = 0, sx = 0, sy = 0, ok = 0;
  if (gN > 0) {
    for (const _ of rep(nR - 1)) {
      if (RIM[r] > 0) {
        hh = RY[r] - RBR[r];
        if (hh < 1.5) {
          if (hh < 0) { hh = 0; }
          s = 1 / (1 + hh * 1.5);
          ra = RBR[r] * 0.85 * s;
          if (RK[r] == 1) { ra = RA[r] * s; }
          M_shadow(RX[r], RZ[r], ra, ra);
        }
      }
      r = r + 1;
    }
    for (const _ of rep(nSB)) {
      hh = SBY0[b];
      if (hh < 1.5) {
        if (hh < 0) { hh = 0; }
        s = 1 / (1 + hh * 1.5);
        M_shadow((SBX0[b] + SBX1[b]) / 2, (SBZ0[b] + SBZ1[b]) / 2, (SBX1[b] - SBX0[b]) / 2 * 1.05 * s, (SBZ1[b] - SBZ0[b]) / 2 * 1.05 * s);
      }
      b = b + 1;
    }
  }
}
function M_shadow(cx, cz, ra, rb) {
  ok = 1;
  k = RVO + LCAP - (gN + 1) * (gN + 1) - 16;
  for (const _ of rep(12)) {
    k = k + 1;
    M_proj(cx + ra * cosd((k % 12) * 30), 0.001, cz + rb * sind((k % 12) * 30));
    if (z0 <= NEAR) { ok = 0; }
    SX[k] = sx; SY[k] = sy;
  }
  if (ok == 1) {
    k = RVO + LCAP - (gN + 1) * (gN + 1) - 16;
    fillStop();
    penUp();
    goto(SX[k + 1], SY[k + 1]);
    fillColorHex(SHCOL);
    fillStart();
    for (const _ of rep(11)) { k = k + 1; goto(SX[k + 1], SY[k + 1]); }
    fillStop();
  }
}
