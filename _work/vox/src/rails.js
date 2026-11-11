// ===================================================================== rails and minecarts (v2.5)
// Rails (BRS RS_RAIL): BAUX the kind (0 rail, 1 powered, 2 detector, 3 activator), BFAC the shape
// (0 along z, 1 along x, 2 .. 5 going up to +x, -x, -z, +z, 6 .. 9 the curves +z+x, +z-x, -z-x,
// -z+x: plain rails only), BON on (powered and activator rails). Each shape has two ends RE*1 RE*2
// (dx, dy, dz: dy 1 the end one up). A rail put joins the rails by it (and turns them toward it
// when they are free), as the genre. Powered and activator rails are on with power by them or along
// up to 8 of their kind joined in a line; a detector rail gives power while a cart is on it.
// Minecarts (mobs M_MINECART, M_TNTCART) run along the rails: down a slope faster, a powered rail
// on pushes them (or starts one standing against a block), off brakes them; an activator rail on
// lets the rider off and lights a TNT cart. Ridden as a boat (F, Shift off).
let REX1 = [0, -1, -1, -1, 0, 0, 0, 0, 0, 0], REY1 = [0, 0, 0, 1, 1, 0, 0, 0, 0, 0], REZ1 = [-1, 0, 0, 0, -1, -1, 1, 1, -1, -1];
let REX2 = [0, 1, 1, 1, 0, 0, 1, 0 - 1, 0 - 1, 1], REY2 = [0, 0, 1, 0, 0, 1, 0, 0, 0, 0], REZ2 = [1, 0, 0, 0, 1, 1, 0, 0, 0, 0];
let RAILID = [];
function railId(k, s, on) {
  if (RAILID.length == 0) {
    let i = 0;
    while (i < 80) { RAILID.push(0); i = i + 1; }
    let b = 1;
    while (b < NBLOCK) { if (BRS[b + 1] == RS_RAIL) { RAILID[(BAUX[b + 1] * 10 + BFAC[b + 1]) * 2 + BON[b + 1] + 1] = b; } b = b + 1; }
  }
  let r = RAILID[(k * 10 + s) * 2 + on + 1];
  if (r == 0) { r = RAILID[(k * 10 + s) * 2 + 1]; }
  if (r == 0) { r = RAILID[k * 20 + 1]; }
  return r;
}
function isRail(b) { let r = 0; if (BRS[b + 1] == RS_RAIL) { r = 1; } return r; }
// the height of the end of rail b at (x, y, z) the way (dx, dz) (-1000: no end that way)
function railEnd(x, y, z, b, dx, dz) {
  let s = BFAC[b + 1], r = 0 - 1000;
  if (REX1[s + 1] == dx && REZ1[s + 1] == dz) { r = y + REY1[s + 1]; }
  if (REX2[s + 1] == dx && REZ2[s + 1] == dz) { r = y + REY2[s + 1]; }
  return r;
}
// the rail joined to rail b at (x, y, z) the way (dx, dz): its y (-1000: none)
function railLink(x, y, z, b, dx, dz) {
  let h = railEnd(x, y, z, b, dx, dz), r = 0 - 1000;
  if (h > 0 - 1000) {
    let k = 0 - 1;
    while (k <= 0) {
      let ny = h + k, nb = blockAt(x + dx, ny, z + dz);
      if (BRS[nb + 1] == RS_RAIL) { if (railEnd(x + dx, ny, z + dz, nb, 0 - dx, 0 - dz) == h) { r = ny; } }
      k = k + 1;
    }
  }
  return r;
}
function railLinks(x, y, z, b) {
  let s = BFAC[b + 1], n = 0;
  if (railLink(x, y, z, b, REX1[s + 1], REZ1[s + 1]) > 0 - 1000) { n = n + 1; }
  if (railLink(x, y, z, b, REX2[s + 1], REZ2[s + 1]) > 0 - 1000) { n = n + 1; }
  return n;
}
// the shape with ends (ax, az) and (bx, bz) (up: 1 the a end one up, 2 the b end); -1: none
function railShape2(ax, az, bx, bz, up) {
  let r = 0 - 1;
  if (ax == 0 && bx == 0 && az == 0 - bz) { r = 0; if (up == 1) { if (az < 0) { r = 4; } else { r = 5; } } if (up == 2) { if (bz < 0) { r = 4; } else { r = 5; } } }
  if (az == 0 && bz == 0 && ax == 0 - bx) { r = 1; if (up == 1) { if (ax > 0) { r = 2; } else { r = 3; } } if (up == 2) { if (bx > 0) { r = 2; } else { r = 3; } } }
  if (r < 0 && up == 0) {
    let zz = az + bz, xx = ax + bx;
    if (zz == 1 && xx == 1) { r = 6; } if (zz == 1 && xx == 0 - 1) { r = 7; } if (zz == 0 - 1 && xx == 0 - 1) { r = 8; } if (zz == 0 - 1 && xx == 1) { r = 9; }
  }
  return r;
}
// a rail by (x, y, z) the way (dx, dz) that could join one put there: rcY its y, rcUp 1 one up
let rcY = 0, rcUp = 0;
function railCan(x, y, z, dx, dz) {
  let r = 0, k = 1;
  rcUp = 0;
  while (k >= 0 - 1) {
    let ny = y + k, nb = blockAt(x + dx, ny, z + dz);
    if (r == 0 && BRS[nb + 1] == RS_RAIL) {
      // (one up: its end toward here must be low, at y + 1; level or one down: it can turn to here)
      let back = railEnd(x + dx, ny, z + dz, nb, 0 - dx, 0 - dz);
      let ok = 0;
      if (back > 0 - 1000) { if (k == 1) { if (back == y + 1) { ok = 1; } } else { if (back == y) { ok = 1; } } }
      if (ok == 0) { if (railLinks(x + dx, ny, z + dz, nb) < 2) { ok = 1; } }
      if (ok == 1) { r = 1; rcY = ny; if (k == 1) { rcUp = 1; } }
    }
    k = k - 1;
  }
  return r;
}
// the shape of a rail of kind kd put at (x, y, z) (f4: the way the player looks)
function railPick(x, y, z, kd, f4) {
  let n = railCan(x, y, z, 0, 0 - 1), nU = rcUp, s = railCan(x, y, z, 0, 1), sU = rcUp;
  let e = railCan(x, y, z, 1, 0), eU = rcUp, w = railCan(x, y, z, 0 - 1, 0), wU = rcUp;
  let r = mod(f4, 2);
  if (n + s + e + w == 1) { if (n == 1 || s == 1) { r = 0; } else { r = 1; } }
  if (kd == 0) {
    if (s == 1 && e == 1) { r = 6; } if (s == 1 && w == 1) { r = 7; } if (n == 1 && w == 1) { r = 8; } if (n == 1 && e == 1) { r = 9; }
  }
  if (e == 1 && w == 1) { r = 1; }
  if (n == 1 && s == 1) { r = 0; }
  if (r == 0) { if (nU == 1) { r = 4; } if (sU == 1) { r = 5; } }
  if (r == 1) { if (eU == 1) { r = 2; } if (wU == 1) { r = 3; } }
  return r;
}
// the rails by a rail just put at (x, y, z) turn to it when free (and go up to it when one down)
function railJoin(x, y, z) {
  let b = blockAt(x, y, z), s = BFAC[b + 1], q = 1;
  while (q <= 2) {
    let dx = REX1[s + 1], dz = REZ1[s + 1];
    if (q == 2) { dx = REX2[s + 1]; dz = REZ2[s + 1]; }
    if (railLink(x, y, z, b, dx, dz) < 0 - 999) {
      let h = railEnd(x, y, z, b, dx, dz), k = 0, done = 0;
      while (k >= 0 - 1 && done == 0) {
        let ny = h + k, nx = x + dx, nz = z + dz, nb = blockAt(nx, ny, nz);
        if (BRS[nb + 1] == RS_RAIL) {
          if (railLinks(nx, ny, nz, nb) < 2) {
            // its end that stays (joined to another), else the one across from here
            let ns = BFAC[nb + 1], kx = dx, kz = dz, up = 0;
            if (railLink(nx, ny, nz, nb, REX1[ns + 1], REZ1[ns + 1]) > 0 - 1000) { kx = REX1[ns + 1]; kz = REZ1[ns + 1]; }
            if (railLink(nx, ny, nz, nb, REX2[ns + 1], REZ2[ns + 1]) > 0 - 1000) { kx = REX2[ns + 1]; kz = REZ2[ns + 1]; }
            if (k == 0 - 1) { up = 2; }
            let sh = railShape2(kx, kz, 0 - dx, 0 - dz, up);
            if (sh >= 6 && BAUX[nb + 1] != 0) { sh = 0 - 1; }
            if (sh >= 0) { if (sh != ns) { setBlock(nx, ny, nz, railId(BAUX[nb + 1], sh, BON[nb + 1])); } }
            done = 1;
          } else { done = 1; }
        }
        k = k - 1;
      }
    }
    q = q + 1;
  }
}
// powered and activator rails: power by them, or along up to 8 of their kind joined in a line
function railPowered(x, y, z, b) {
  let r = 0;
  if (powerIn(x, y, z, 0 - 1) > 0) { r = 1; }
  else { if (railSeek(x, y, z, b, 1) == 1) { r = 1; } else { if (railSeek(x, y, z, b, 2) == 1) { r = 1; } } }
  return r;
}
function railSeek(x, y, z, b, side) {
  let s = BFAC[b + 1], dx = REX1[s + 1], dz = REZ1[s + 1];
  if (side == 2) { dx = REX2[s + 1]; dz = REZ2[s + 1]; }
  let k = 0, r = 0, cx = x, cy = y, cz = z, cb = b;
  while (k < 8 && r == 0) {
    let ny = railLink(cx, cy, cz, cb, dx, dz);
    if (ny < 0 - 999) { k = 8; }
    else {
      let nx = cx + dx, nz = cz + dz, nb = blockAt(nx, ny, nz);
      if (BAUX[nb + 1] != BAUX[b + 1]) { k = 8; }
      else {
        if (powerIn(nx, ny, nz, 0 - 1) > 0) { r = 1; }
        let s2 = BFAC[nb + 1];
        if (REX1[s2 + 1] == 0 - dx && REZ1[s2 + 1] == 0 - dz) { dx = REX2[s2 + 1]; dz = REZ2[s2 + 1]; } else { dx = REX1[s2 + 1]; dz = REZ1[s2 + 1]; }
        cx = nx; cy = ny; cz = nz; cb = nb;
      }
    }
    k = k + 1;
  }
  return r;
}
// a rail's state for the commands: shape=..., powered=
function railState(b, st) {
  let s = BFAC[b + 1], on = 0;
  if (indexOf(st, 'north_south') > 0) { s = 0; } if (indexOf(st, 'east_west') > 0) { s = 1; }
  if (indexOf(st, 'ascending_east') > 0) { s = 2; } if (indexOf(st, 'ascending_west') > 0) { s = 3; }
  if (indexOf(st, 'ascending_north') > 0) { s = 4; } if (indexOf(st, 'ascending_south') > 0) { s = 5; }
  if (indexOf(st, 'south_east') > 0) { s = 6; } if (indexOf(st, 'south_west') > 0) { s = 7; }
  if (indexOf(st, 'north_west') > 0) { s = 8; } if (indexOf(st, 'north_east') > 0) { s = 9; }
  if (indexOf(st, 'powered=true') > 0) { on = 1; }
  if (s >= 6 && BAUX[b + 1] != 0) { s = 0; }
  return railId(BAUX[b + 1], s, on);
}

// ---------------------------------------------------------------- minecarts
let cRail = 0, cRY = 0;
function isCart(t) { let r = 0; if (t == M_MINECART || t == M_TNTCART) { r = 1; } return r; }
// the rail a cart at (x, y, z) is on (cRail 0: none), cRY its y
function cartRail(x, y, z) {
  let rx = Math.floor(x), rz = Math.floor(z), ry = Math.floor(y + 0.01), b = blockAt(rx, ry, rz);
  cRail = 0; cRY = ry;
  if (BRS[b + 1] == RS_RAIL) { cRail = b; }
  else { b = blockAt(rx, ry - 1, rz); if (BRS[b + 1] == RS_RAIL) { cRail = b; cRY = ry - 1; } }
}
// a cart put on the rail at (x, y, z)
function cartPlace(t, x, y, z) {
  mobAdd(t, x + 0.5, y + 0.0625, z + 0.5);
  if (lastMob > 0) { EVX[lastMob] = 0; EVY[lastMob] = 0; EVZ[lastMob] = 0; EST[lastMob] = 0; ETM[lastMob] = 0; let s = BFAC[blockAt(x, y, z) + 1]; EYAW[lastMob] = 0; if (s == 1 || s == 2 || s == 3) { EYAW[lastMob] = 90; } }
}
function cartStep(e, dt) {
  if (EHURT[e] > 0) { EHURT[e] = EHURT[e] - dt; }
  let sp = Math.sqrt(EVX[e] * EVX[e] + EVZ[e] * EVZ[e]);
  let n = Math.min(4, 1 + Math.floor(sp * dt / 0.2)), h = dt / n, k = 0;
  while (k < n && ET[e] > 0) { cartMove(e, h); k = k + 1; }
  if (ET[e] > 0) {
    // a lit TNT cart: off in 4 s
    if (ET[e] == M_TNTCART) { if (EST[e] == 1) { ETM[e] = ETM[e] - dt; if (ETM[e] <= 0) { ET[e] = 0; if (riding == e) { riding = 0; } explodeShared(EX[e], EY[e] + 0.5, EZ[e], 4); } } }
  }
  if (ET[e] > 0) {
    if (riding == e) { px = EX[e]; py = EY[e] + 0.1; pz = EZ[e]; pvx = 0; pvy = 0; pvz = 0; fallTop = py; }
    sp = Math.sqrt(EVX[e] * EVX[e] + EVZ[e] * EVZ[e]);
    if (sp > 0.05) { EYAW[e] = atan2d(EVX[e], EVZ[e]); }
    if (EY[e] < 0 - 10) { ET[e] = 0; }
  }
}
function cartMove(e, h) {
  cartRail(EX[e], EY[e], EZ[e]);
  if (cRail > 0) {
    let b = cRail, s = BFAC[b + 1], kd = BAUX[b + 1], rx = Math.floor(EX[e]), ry = cRY, rz = Math.floor(EZ[e]);
    let x1 = rx + 0.5 + REX1[s + 1] * 0.5, z1 = rz + 0.5 + REZ1[s + 1] * 0.5, x2 = rx + 0.5 + REX2[s + 1] * 0.5, z2 = rz + 0.5 + REZ2[s + 1] * 0.5;
    let dx = x2 - x1, dz = z2 - z1, dl = Math.sqrt(dx * dx + dz * dz);
    dx = dx / dl; dz = dz / dl;
    // its whole speed, along the rail the way it went
    let sp = Math.sqrt(EVX[e] * EVX[e] + EVZ[e] * EVZ[e]);
    if (EVX[e] * dx + EVZ[e] * dz < 0) { sp = 0 - sp; }
    // down a slope faster, up it slower
    if (REY2[s + 1] > REY1[s + 1]) { sp = sp - 3.125 * h; } if (REY1[s + 1] > REY2[s + 1]) { sp = sp + 3.125 * h; }
    // the rider starts it the way they look; the player walking into it pushes it
    if (riding == e) { if (uiMode == 0) { if (key(87)) { if (Math.abs(sp) < 1) { let lk = lookX * dx + lookZ * dz; if (lk > 0.1) { sp = 2; } if (lk < 0 - 0.1) { sp = 0 - 2; } } } } }
    else { if (Math.abs(px - EX[e]) < 0.8 && Math.abs(pz - EZ[e]) < 0.8 && Math.abs(py - EY[e]) < 1) { let pv = pvx * dx + pvz * dz; if (pv * sp >= 0) { if (Math.abs(sp) < Math.abs(pv)) { sp = pv; } } } }
    // powered rails: on pushes it on (or off a block it stands against), off brakes it
    if (kd == 1) {
      if (BON[b + 1] == 1) {
        if (Math.abs(sp) > 0.2) { if (sp > 0) { sp = sp + 24 * h; } else { sp = sp - 24 * h; } }
        else {
          if (BSOL[blockAt(rx + REX1[s + 1], ry, rz + REZ1[s + 1]) + 1] == 1) { sp = 2; }
          if (BSOL[blockAt(rx + REX2[s + 1], ry, rz + REZ2[s + 1]) + 1] == 1) { sp = 0 - 2; }
        }
      } else { if (Math.abs(sp) < 0.6) { sp = 0; } else { sp = sp * (1 - Math.min(1, 14 * h)); } }
    }
    // detector rails: power while it is on; activator rails on: the rider off, a TNT cart lit
    if (kd == 2) { pressAddL(rx, ry, rz, 0.5, 15); }
    if (kd == 3) { if (BON[b + 1] == 1) {
      if (riding == e) { riding = 0; py = EY[e] + 1; pvy = 2; }
      if (ET[e] == M_TNTCART) { if (EST[e] == 0) { EST[e] = 1; ETM[e] = 4; sndPlay(1); } }
    } }
    // rolling slows it (an empty cart much more)
    let fr = 0.06; if (riding != e) { fr = 0.8; }
    sp = sp * (1 - fr * h);
    sp = Math.max(0 - 8, Math.min(8, sp));
    // onto the rail's line, along it; not into a wall
    let t = (EX[e] - x1) * dx + (EZ[e] - z1) * dz, ox = EX[e], oz = EZ[e];
    t = t + sp * h;
    let nx = x1 + dx * t, nz = z1 + dz * t, fx = nx + dx * 0.45, fz = nz + dz * 0.45;
    if (sp < 0) { fx = nx - dx * 0.45; fz = nz - dz * 0.45; }
    let fy = ry + REY1[s + 1] + (REY2[s + 1] - REY1[s + 1]) * Math.max(0, Math.min(1, t / dl));
    if (BSOL[blockAt(Math.floor(fx), Math.floor(fy + 0.3), Math.floor(fz)) + 1] == 1 && (Math.floor(fx) != rx || Math.floor(fz) != rz)) {
      sp = 0;
      t = Math.max(0, Math.min(dl, (ox - x1) * dx + (oz - z1) * dz));
      nx = x1 + dx * t; nz = z1 + dz * t;
    }
    EVX[e] = dx * sp; EVZ[e] = dz * sp; EVY[e] = 0;
    EX[e] = nx; EZ[e] = nz;
    EY[e] = ry + 0.0625 + REY1[s + 1] + (REY2[s + 1] - REY1[s + 1]) * Math.max(0, Math.min(1, t / dl));
  } else {
    // off the rails: falls, slides to a stop
    EVY[e] = EVY[e] - 32 * h; if (EVY[e] < 0 - 40) { EVY[e] = 0 - 40; }
    bmX = EX[e]; bmY = EY[e]; bmZ = EZ[e]; bmW = 0.49; bmH = 0.7;
    bodyMove(EVX[e] * h, EVY[e] * h, EVZ[e] * h);
    if (bmHitY == 1) { EVY[e] = 0; }
    if (bmHitX == 1) { EVX[e] = 0; } if (bmHitZ == 1) { EVZ[e] = 0; }
    if (bmGround == 1) { EVX[e] = EVX[e] * (1 - Math.min(1, 6 * h)); EVZ[e] = EVZ[e] * (1 - Math.min(1, 6 * h)); }
    EX[e] = bmX; EY[e] = bmY; EZ[e] = bmZ;
  }
}
