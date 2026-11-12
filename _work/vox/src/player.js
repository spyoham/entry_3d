// ===================================================================== the player
// gameMode: 0 survival, 1 creative, 2 adventure (no breaking or building), 3 spectator (through
// everything, nothing touched)
let px = 64, py = 40, pz = 64, pvx = 0, pvy = 0, pvz = 0, yaw = 0, pitch = 0;
let onGround = 0, inWater = 0, inLava = 0, headWater = 0, flying = 0, sneaking = 0, sprinting = 0;
// ((v2.8) swimming: the body lying down, 0.6 high (also crawling where there is no room to stand up))
let swimming = 0;
let gameMode = 0, hp = 20, food = 20, sat = 5, exhaust = 0, air = 300, regenT = 0, starveT = 0, hurtT = 0, hurtFlash = 0;
let fallTop = 0, lavaT = 0, cactusT = 0, drownT = 0, dead = 0, deathMsg = '';
let jumpWas = 0, spaceTapT = 0, wTapT = 0, wWas = 0, bob = 0, walkDist = 0;
let pickOn = 0, pickX = 0, pickY = 0, pickZ = 0, pickF = 0, pickB = 0, pickT = 99, mobPick = 0, pickHY = 0;
let breakT = 0, breakStage = 0, breakX = -1, breakY = -1, breakZ = -1, breakCool = 0, swingT = 0, placeCool = 0, attackCool = 0;
let specSpeed = 1, wasHitX = 0;
// (v2.7) as 1.16.5: hurtRaw - a hurt armour does not stop (a fall, drowning, hunger, the void, a
// block on the head, burning); hurtMob - a mob's (scaled by the difficulty); lastDmg - the hurt
// that started the half second when no other lands (a bigger one lands for the difference);
// fireT - seconds left on fire; wasSneak / inBush / pMoved / eatId, eatT (eating takes 1.6 s)
let inFireB = 0, inSoul = 0, hurtRaw = 0, hurtMob = 0, lastDmg = 0, fireT = 0, burnT = 0, fastT = 0, chokeT = 0, wasSneak = 0, inBush = 0, pMoved = 0, eatId = 0, eatT = 0, armTough = 0;

// ---------------------------------------------------------------- bodies (player, mobs)
// box: centre (bmX, bmZ), feet bmY, half width bmW, height bmH; moved by (dx, dy, dz) against
// the boxes of the blocks one axis at a time. bmHitX/Y/Z: stopped on that axis; bmGround: landed.
// bmStep: how high a step it may walk up (on the ground).
let bmX = 0, bmY = 0, bmZ = 0, bmW = 0.3, bmH = 1.8, bmHitX = 0, bmHitY = 0, bmHitZ = 0, bmGround = 0, bmStep = 0;
let solidHit = 0, hTop = 0, hBot = 0, hX0 = 0, hX1 = 0, hZ0 = 0, hZ1 = 0;
// (v2.6) a move takes only the boxes ahead of the body the way it goes (hfA 1 down, 2 up, 3 +x,
// 4 -x, 5 +z, 6 -z; hfV the face), as the genre: one it is already in is let be. A trapdoor shut
// at the head stopped the fall there and put the body on top of it (up through the trapdoor)
let hfA = 0, hfV = 0;
// any solid cell (full or shaped) in the cells x0..x1, y0..y1, z0..z1
function solidIn(x0, x1, y0, y1, z0, z1) {
  solidHit = 0;
  let x = x0, y = 0, z = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      y = y0;
      while (y <= y1) { if (BSOL[blockAt(x, y, z) + 1] > 0) { solidHit = 1; } y = y + 1; }
      z = z + 1;
    }
    x = x + 1;
  }
}
// what of the blocks' boxes is inside the box (ax0, ay0, az0) .. (ax1, ay1, az1): solidHit and the
// bounds of what was hit (hTop the highest top, hBot the lowest bottom, hX0 .. hZ1 the sides)
function M_hit(QX0, QY0, QZ0, QX1, QY1, QZ1) {
  if (QX1 > ax0 && QX0 < ax1 && QY1 > ay0 && QY0 < ay1 && QZ1 > az0 && QZ0 < az1 && (hfA == 0 || (hfA == 1 && QY1 <= hfV) || (hfA == 2 && QY0 >= hfV) || (hfA == 3 && QX0 >= hfV) || (hfA == 4 && QX1 <= hfV) || (hfA == 5 && QZ0 >= hfV) || (hfA == 6 && QZ1 <= hfV))) {
    solidHit = 1;
    if (QY1 > hTop) { hTop = QY1; } if (QY0 < hBot) { hBot = QY0; }
    if (QX0 < hX0) { hX0 = QX0; } if (QX1 > hX1) { hX1 = QX1; } if (QZ0 < hZ0) { hZ0 = QZ0; } if (QZ1 > hZ1) { hZ1 = QZ1; }
  }
}
function solidBox(ax0, ax1, ay0, ay1, az0, az1) {
  solidHit = 0; hTop = -99999; hBot = 99999; hX0 = 99999; hX1 = -99999; hZ0 = 99999; hZ1 = -99999;
  let x0 = Math.floor(ax0), x1 = Math.floor(ax1), y0 = Math.floor(ay0), y1 = Math.floor(ay1), z0 = Math.floor(az0), z1 = Math.floor(az1);
  let x = x0, y = 0, z = 0, b = 0, s = 0, k = 0, ke = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      // (the cell under the box too: a fence or a wall reaches half a block over its own cell)
      y = y0 - 1;
      while (y <= y1) {
        b = blockAt(x, y, z); s = BSOL[b + 1];
        if (s == 1) { if (y >= y0) { M_hit(x, y, z, x + 1, y + 1, z + 1); } }
        if (s == 2) {
          if (y >= y0 || BTALL[b + 1] == 1) {
            k = BCB0[b + 1]; ke = k + BCBN[b + 1];
            while (k < ke) { M_hit(x + CBX0[k] / 16, y + CBY0[k] / 16, z + CBZ0[k] / 16, x + CBX1[k] / 16, y + CBY1[k] / 16, z + CBZ1[k] / 16); k = k + 1; }
            if (BCONN[b + 1] > 0) {
              let cb = connOf(x, y, z, b), c = BCONN[b + 1], sd = 0;
              while (sd < 4) {
                if (mod(cb, 2) == 1) { k = ARMC[(c - 1) * 4 + sd + 1]; M_hit(x + CBX0[k] / 16, y + CBY0[k] / 16, z + CBZ0[k] / 16, x + CBX1[k] / 16, y + CBY1[k] / 16, z + CBZ1[k] / 16); }
                cb = idiv(cb, 2); sd = sd + 1;
              }
            }
          }
        }
        y = y + 1;
      }
      z = z + 1;
    }
    x = x + 1;
  }
}
function bodyMove(dx, dy, dz) {
  bmHitX = 0; bmHitY = 0; bmHitZ = 0; bmGround = 0;
  let n = Math.ceil(Math.max(Math.abs(dx), Math.max(Math.abs(dy), Math.abs(dz))) / 0.45);
  if (n < 1) { n = 1; }
  let sx = dx / n, sy = dy / n, sz = dz / n, k = 0, e = 0.001, w = bmW;
  while (k < n) {
    if (sy != 0) {
      let ny = bmY + sy;
      // (down: what ends below the body's middle (a floor it sank into a little still holds it);
      // up: what is over the head or but a little into it)
      if (sy < 0) { hfA = 1; hfV = bmY + 0.5; } else { hfA = 2; hfV = bmY + bmH - 0.2; }
      solidBox(bmX - w, bmX + w, ny, ny + bmH, bmZ - w, bmZ + w);
      hfA = 0;
      if (solidHit == 1) {
        if (sy < 0) { ny = hTop; bmGround = 1; } else { ny = hBot - bmH - e; }
        bmHitY = 1; sy = 0;
      }
      bmY = ny;
    }
    if (sx != 0) {
      let nx = bmX + sx;
      if (sx > 0) { hfA = 3; hfV = bmX + w - 0.2; } else { hfA = 4; hfV = bmX - w + 0.2; }
      solidBox(nx - w, nx + w, bmY, bmY + bmH, bmZ - w, bmZ + w);
      hfA = 0;
      if (solidHit == 1) {
        let top = hTop, lo = hX0, hi = hX1, stepped = 0;
        if (bmStep > 0) { if (top > bmY) { if (top - bmY <= bmStep) {
          solidBox(nx - w, nx + w, top + e, top + e + bmH, bmZ - w, bmZ + w);
          if (solidHit == 0) { bmY = top + e; stepped = 1; }
        } } }
        if (stepped == 0) {
          if (sx > 0) { nx = lo - w - e; } else { nx = hi + w + e; }
          if (Math.abs(nx - bmX) > Math.abs(sx) + 0.01) { nx = bmX; }
          bmHitX = 1; sx = 0;
        }
      }
      bmX = nx;
    }
    if (sz != 0) {
      let nz = bmZ + sz;
      if (sz > 0) { hfA = 5; hfV = bmZ + w - 0.2; } else { hfA = 6; hfV = bmZ - w + 0.2; }
      solidBox(bmX - w, bmX + w, bmY, bmY + bmH, nz - w, nz + w);
      hfA = 0;
      if (solidHit == 1) {
        let top = hTop, lo = hZ0, hi = hZ1, stepped = 0;
        if (bmStep > 0) { if (top > bmY) { if (top - bmY <= bmStep) {
          solidBox(bmX - w, bmX + w, top + e, top + e + bmH, nz - w, nz + w);
          if (solidHit == 0) { bmY = top + e; stepped = 1; }
        } } }
        if (stepped == 0) {
          if (sz > 0) { nz = lo - w - e; } else { nz = hi + w + e; }
          if (Math.abs(nz - bmZ) > Math.abs(sz) + 0.01) { nz = bmZ; }
          bmHitZ = 1; sz = 0;
        }
      }
      bmZ = nz;
    }
    k = k + 1;
  }
}
// is there ground right under the box (sneaking at edges, mobs at cliffs)?
function groundUnder(x, y, z, w) {
  solidBox(x - w, x + w, y - 0.1, y, z - w, z + w);
  return solidHit;
}
// what the body is in: water / lava anywhere in it, something that hurts by it, something to
// climb, a web; and what it stands on (underB)
let inW = 0, inL = 0, inC = 0, inClimb = 0, inWeb = 0, underB = 0;
function bodyIn(x, y, z, w, h) {
  inW = 0; inL = 0; inC = 0; inClimb = 0; inWeb = 0; inBush = 0; inFireB = 0; inSoul = 0;
  let x0 = Math.floor(x - w), x1 = Math.floor(x + w), y0 = Math.floor(y + 0.1), y1 = Math.floor(y + h - 0.1), z0 = Math.floor(z - w), z1 = Math.floor(z + w);
  if (y0 < 0) { y0 = 0; } if (y1 > WY - 1) { y1 = WY - 1; }
  let a = x0, c = 0, k = 0, yy = 0;
  while (a <= x1) {
    c = z0;
    while (c <= z1) {
      yy = y0;
      while (yy <= y1) {
        k = blockAt(a, yy, c);
        if (BLQ[k + 1] == 7) { inW = 1; } if (BLQ[k + 1] == 35) { inL = 1; }
        if (BWATER[k + 1] == 1) { inW = 1; }
        if (BMOVE[k + 1] == 1) { if (yy == y0) { inClimb = 1; } } if (BMOVE[k + 1] == 3) { inWeb = 1; }
        if (k == I_berryBush) { inBush = 1; }
        if (BHURT[k + 1] == 2) { inC = 2; if (BSPEC[k + 1] == 10) { inFireB = 1; } if (k == I_wailFire || k == I_wailCampfire) { inSoul = 1; } } if (BHURT[k + 1] == 1) { if (BSHP[k + 1] != 0) { inC = 1; } }
        yy = yy + 1;
      }
      c = c + 1;
    }
    a = a + 1;
  }
  // a cactus right next to the box (touching, not in)
  if (y0 < WY) {
    a = Math.floor(x - w - 0.05);
    while (a <= Math.floor(x + w + 0.05)) {
      c = Math.floor(z - w - 0.05);
      while (c <= Math.floor(z + w + 0.05)) { if (blockAt(a, y0, c) == 19) { inC = 1; } c = c + 1; }
      a = a + 1;
    }
  }
  underB = blockAt(Math.floor(x), Math.floor(y - 0.05), Math.floor(z));
  // ((v2.7) standing on a cactus hurts too)
  if (underB == 19) { inC = 1; }
}

// ---------------------------------------------------------------- moving
function playerMove(dt) {
  if (riding > 0) { if (ET[riding] != 13 && isCart(ET[riding]) == 0) { riding = 0; } }
  if (gameMode == 3) { riding = 0; spectatorMove(dt); }
  else {
    if (riding > 0) {
      if (key(16)) { if (uiMode == 0) { riding = 0; py = py + 0.9; pvy = 2; } }
      else { px = EX[riding]; py = EY[riding] + 0.25; if (isCart(ET[riding]) == 1) { py = EY[riding] + 0.1; } pz = EZ[riding]; pvx = 0; pvy = 0; pvz = 0; fallTop = py; onGround = 1; }
    } else {
      if (cOK(Math.floor(px), Math.floor(pz)) == 0) { pvx = 0; pvy = 0; pvz = 0; fallTop = py; }
      else { playerMove2(dt); }
    }
  }
}
// the spectator: flies through everything (the wheel sets the speed)
function spectatorMove(dt) {
  flying = 1; onGround = 0; fallTop = py; sneaking = 0;
  let fw = 0, st = 0, up = 0;
  if (uiMode == 0) {
    if (key(87)) { fw = fw + 1; } if (key(83)) { fw = fw - 1; }
    if (key(68)) { st = st + 1; } if (key(65)) { st = st - 1; }
    if (key(32)) { up = up + 1; } if (key(16)) { up = up - 1; }
  }
  let sp = 10.9 * specSpeed;
  if (key(82)) { sp = sp * 2; }
  let sy = sind(yaw), cy = cosd(yaw), l = Math.sqrt(fw * fw + st * st);
  let wx = 0, wz = 0;
  if (l > 0) { wx = (fw * sy + st * cy) / l * sp; wz = (fw * cy - st * sy) / l * sp; }
  let a = Math.min(1, 8 * dt);
  pvx = pvx + (wx - pvx) * a; pvz = pvz + (wz - pvz) * a; pvy = pvy + (up * sp * 0.7 - pvy) * a;
  px = px + pvx * dt; py = py + pvy * dt; pz = pz + pvz * dt;
  if (py < -30) { py = -30; } if (py > WY + 60) { py = WY + 60; }
  headWater = 0;
  if (BLQ[blockAt(Math.floor(px), Math.floor(py + 1.62), Math.floor(pz)) + 1] == 7) { headWater = 1; }
}
function playerMove2(dt) {
  eatStep(dt);
  let fw = 0, st = 0;
  if (key(87)) { fw = fw + 1; } if (key(83)) { fw = fw - 1; }
  if (key(68)) { st = st + 1; } if (key(65)) { st = st - 1; }
  if (uiMode != 0) { fw = 0; st = 0; }
  wTapT = wTapT + dt;
  if (key(87)) { if (wWas == 0) { if (wTapT < 0.3) { sprinting = 1; } wTapT = 0; } wWas = 1; } else { wWas = 0; }
  if (key(82)) { if (fw > 0) { sprinting = 1; } }
  if (fw <= 0) { sprinting = 0; }
  if (mod(gameMode, 2) == 0) { if (food <= 6) { sprinting = 0; } }
  sneaking = 0;
  if (key(16)) { if (uiMode == 0) { sneaking = 1; sprinting = 0; } }
  // ((v2.7) sneaking the body is 1.5 high: it stays down under a ceiling lower than 1.8)
  if (sneaking == 0 && wasSneak == 1 && flying == 0) { solidBox(px - 0.29, px + 0.29, py + 0.05, py + 1.8, pz - 0.29, pz + 0.29); if (solidHit == 1) { sneaking = 1; sprinting = 0; } }
  wasSneak = sneaking;
  bodyIn(px, py, pz, 0.3, 1.8);
  inWater = inW; inLava = inL;
  // ((v2.8) as the genre: sprinting with the head under water lies the body down and swims the way of
  // the eye (up and down too); out of the water or no longer sprinting it stands up where there is
  // room, else it crawls on (through a gap 1 high)
  if (flying == 0 && riding == 0 && gliding == 0 && dead == 0) {
    if (swimming == 0) { if (sprinting == 1 && headWater == 1 && inWater == 1) { swimming = 1; } }
    else { if (sprinting == 0 || inWater == 0) { solidBox(px - 0.29, px + 0.29, py + 0.05, py + 1.8, pz - 0.29, pz + 0.29); if (solidHit == 0) { swimming = 0; } } }
  } else { swimming = 0; }
  if (swimming == 1) { sneaking = 0; }
  // (v2.3.2) flowing water carries the player along
  if (inW == 1 || inL == 1) { flowAt(Math.floor(px), Math.floor(py + 0.3), Math.floor(pz)); let cs = 2.6; if (inL == 1) { cs = 0.9; } if (flying == 0) { pvx = pvx + flX * cs * dt * 3; pvz = pvz + flZ * cs * dt * 3; } }
  let sp = 4.3;
  if (sprinting == 1) { sp = 5.6; }
  if (sneaking == 1) { if (flying == 0) { sp = 1.3; } }
  if (flying == 1) { sp = 10.9; if (sprinting == 1) { sp = 21.6; } }
  // ((v2.7) lava holds back far more than water (0.8 m/s); sprinting stops in water and at a wall)
  if (inWater == 1 || inLava == 1) { if (flying == 0) { if (swimming == 0 || sprinting == 0 || inLava == 1) { sp = sp * 0.45; } if (inLava == 1) { sp = sp * 0.42; } } }
  // (sprinting goes on in water only to swim: with the head under water, or swimming)
  if (inWater == 1 && flying == 0) { if (swimming == 0 && headWater == 0) { sprinting = 0; } }
  // (crawling out of the water: as slow as sneaking)
  if (swimming == 1 && inWater == 0) { sp = 1.3; }
  if (wasHitX == 1) { sprinting = 0; }
  if (eatId > 0) { if (flying == 0) { sp = sp * 0.2; } sprinting = 0; }
  // what is under the feet or round the body: sand that holds, honey, a web
  let mv = BMOVE[underB + 1];
  if (flying == 0) {
    if (mv == 2) { sp = sp * 0.4; } if (mv == 7) { sp = sp * 0.4; }
    // ((v2.7) the elastic block holds the feet (1.2 m/s walking), the berry bush catches)
    if (mv == 4) { if (onGround == 1 && sneaking == 0) { sp = sp * 0.28; } }
    if (inBush == 1) { sp = sp * 0.37; }
    if (inWeb == 1) { sp = sp * 0.15; }
  }
  sp = sp * (1 + 0.2 * fx(1)) * Math.max(0.1, 1 - 0.15 * fx(2));
  let l = Math.sqrt(fw * fw + st * st);
  let wx = 0, wz = 0;
  if (l > 0) {
    let sy = sind(yaw), cy = cosd(yaw);
    wx = (fw * sy + st * cy) / l * sp; wz = (fw * cy - st * sy) / l * sp;
    // (swimming: as much of it along the ground as the eye looks along it)
    if (swimming == 1 && inWater == 1) { let cp = cosd(pitch); wx = wx * cp; wz = wz * cp; }
  }
  // ((v2.7) in the air the speed is kept as the genre (0.91 a tick: 1.9 a second; it was 3.5), ice
  // 0.98 (2.3), blue ice 0.989 (2.1; it was 0.8), the elastic block 0.8 (6.35))
  let acc = 14;
  if (onGround == 0) { acc = 1.9; }
  if (onGround == 1) { if (mv == 5) { acc = 2.3; } if (mv == 6) { acc = 2.1; } if (mv == 4) { acc = 6.35; } }
  if (flying == 1) { acc = 8; }
  if (inWater == 1) { acc = 6; } if (inLava == 1) { acc = 14; }
  let a = Math.min(1, acc * dt);
  if (gliding == 0) { pvx = pvx + (wx - pvx) * a; pvz = pvz + (wz - pvz) * a; }
  let spc = key(32);
  if (uiMode != 0) { spc = 0; }
  spaceTapT = spaceTapT + dt;
  if (spc) { if (jumpWas == 0) { if (gameMode == 1) { if (spaceTapT < 0.3) { flying = 1 - flying; pvy = 0; spaceTapT = 9; } else { spaceTapT = 0; } } } }
  let vA = pvy;
  if (flying == 1) {
    let vy = 0;
    if (spc) { vy = 7.5; }
    if (sneaking == 1) { vy = 0 - 7.5; }
    // ((v2.7.4) Space and Shift together: held still in the air, as for placing blocks there)
    if (spc) { if (sneaking == 1) { vy = 0; } }
    pvy = pvy + (vy - pvy) * Math.min(1, 10 * dt);
  } else {
    if (inWater == 1 || inLava == 1) {
      // ((v2.7) as the genre: sinking 0.4 m/s and rising 2.8 in water (it sank at 3 m/s), 0.8 in lava)
      let vt = 0 - 0.4, rk = 4.5;
      if (spc) { vt = 2.8; }
      if (inLava == 1) { rk = 13.9; vt = 0 - 0.8; if (spc) { vt = 0.8; } }
      // ((v2.8) swimming: up and down the way of the eye, held still when not going on; Space up, Shift down)
      if (swimming == 1 && inLava == 0) { vt = 0; rk = 6; if (fw > 0 && sprinting == 1) { vt = sind(pitch) * sp; } if (spc) { vt = Math.max(vt, 2.8); } if (key(16)) { vt = Math.min(vt, 0 - 2.8); } }
      pvy = pvy + (vt - pvy) * Math.min(1, rk * dt);
      fallTop = py;
    } else {
      if (gliding == 0) { if (onGround == 0) { if (pvy < 0) { if (keyHit(32) == 1) { if (gliderOn() == 1) { gliding = 1; } } } } }
      if (gliding == 1) { if (onGround == 1 || gliderOn() == 0) { gliding = 0; } }
      if (gliding == 1) { glideStep(dt); vA = pvy; }
      else {
        pvy = pvy - 32 * dt;
        if (fx(10) > 0) { pvy = pvy + (0.9 * fx(10) - pvy) * Math.min(1, 5 * dt) + 32 * dt; fallTop = py; vA = pvy; }
        if (fx(11) > 0) { if (pvy < -1.8) { pvy = 0 - 1.8; vA = pvy; } fallTop = py; }
      }
      if (pvy < -60) { pvy = -60; vA = pvy; }
      // ((v2.7) 1.25 high (the move of the frame is the mean of its speeds, so the same at any frame
      // rate: it was 1.3 .. 1.8 high), a sprint jump pushes on 2 m/s the way of the eye (it was x 1.25))
      if (spc) { if (onGround == 1) { let jv = Math.sqrt(80.1 + 32 * fx(4)); if (mv == 7) { jv = jv * 0.5; } pvy = jv - 32 * dt; vA = jv; exhaust = exhaust + 0.05; if (sprinting == 1) { exhaust = exhaust + 0.15; pvx = pvx + sind(yaw) * 2; pvz = pvz + cosd(yaw) * 2; } } }
    }
    // ladders, vines, scaffolding: up when pushing on or Space, held when sneaking
    if (inClimb == 1) {
      if (pvy < -3) { pvy = -3; }
      if (spc || (wasHitX == 1 && l > 0)) { pvy = 2.35; }
      if (sneaking == 1) { if (pvy < 0) { pvy = 0; } }
      fallTop = py; vA = pvy;
    }
    // ((v2.7) a web all but stops the fall, a bush slows it)
    if (inWeb == 1) { if (pvy < -0.1) { pvy = -0.1; } if (pvy > 0.4) { pvy = 0.4; } fallTop = py; vA = pvy; }
    if (inBush == 1) { if (pvy < -1.5) { pvy = -1.5; vA = pvy; } fallTop = py; }
    // ((v2.7) the honey block's side: sliding down it slowly)
    if (onGround == 0 && pvy < -2.6) { let hy = Math.floor(py + 0.3);
      if (blockAt(Math.floor(px + 0.36), hy, Math.floor(pz)) == I_honeyBlock || blockAt(Math.floor(px - 0.36), hy, Math.floor(pz)) == I_honeyBlock || blockAt(Math.floor(px), hy, Math.floor(pz + 0.36)) == I_honeyBlock || blockAt(Math.floor(px), hy, Math.floor(pz - 0.36)) == I_honeyBlock) { pvy = 0 - 1; vA = pvy; fallTop = py; } }
  }
  jumpWas = 0;
  if (spc) { jumpWas = 1; }
  let ox = px, oz = pz;
  bmX = px; bmY = py; bmZ = pz; bmW = 0.3; bmH = 1.8; bmStep = 0;
  if (sneaking == 1 && flying == 0) { bmH = 1.5; }
  if (swimming == 1) { bmH = 0.6; }
  if (onGround == 1 && flying == 0) { bmStep = 0.6; }
  let mx = pvx * dt, mz = pvz * dt;
  if (sneaking == 1) { if (onGround == 1) { if (flying == 0) {
    solidBox(px + mx - 0.3, px + mx + 0.3, py - 0.6, py, pz - 0.3, pz + 0.3); if (solidHit == 0) { mx = 0; }
    solidBox(px + mx - 0.3, px + mx + 0.3, py - 0.6, py, pz + mz - 0.3, pz + mz + 0.3); if (solidHit == 0) { mz = 0; }
  } } }
  let vyWas = pvy;
  bodyMove(mx, (vA + pvy) * 0.5 * dt, mz);
  bmStep = 0;
  wasHitX = 0;
  if (bmHitX == 1) { pvx = 0; wasHitX = 1; } if (bmHitZ == 1) { pvz = 0; wasHitX = 1; }
  if (bmHitY == 1) { pvy = 0; }
  let was = onGround;
  onGround = bmGround;
  if (flying == 1) { if (onGround == 1) { if (gameMode == 1) { flying = 0; } } }
  px = bmX; py = bmY; pz = bmZ;
  if (onGround == 0) { if (py > fallTop) { fallTop = py; } if (pvy > 0) { fallTop = py; } }
  if (onGround == 1) {
    let ub = blockAt(Math.floor(px), Math.floor(py - 0.05), Math.floor(pz));
    if (was == 0) {
      let fd = fallTop - py;
      // ((v2.7) as 1.16.5: the hurt is (fall - 3) x the block's share, rounded up (it was rounded down,
      // and the share taken before the 3); the elastic block throws back and takes no hurt unless
      // sneaking, a bed throws back two thirds and halves it, hay and honey a fifth)
      let fm = 1;
      if (BMOVE[ub + 1] == 4 && sneaking == 0) { fm = 0; if (vyWas < -1) { pvy = 0 - vyWas * 0.9; onGround = 0; } }
      if (ub == I_hayBale || ub == I_honeyBlock) { fm = 0.2; }
      if (BPLC[ub + 1] == P_BED) { fm = 0.5; if (sneaking == 0) { if (vyWas < -1) { pvy = 0 - vyWas * 0.66; onGround = 0; } } }
      let fh = (fd - 3 - fx(4)) * fm;
      if (fh > 0.03) { if (mod(gameMode, 2) == 0) { if (inWater == 0) { if (grFall == 1) { hurtR(Math.ceil(fh - 0.03), '높은 곳에서 떨어졌습니다'); } } } }
      // landing on farmland tramples it (by chance: fall - 0.5) and the crop on it comes off
      if (ub == I_farmland || ub == I_farmlandWet) { if (rand(0, 9999) / 10000 < fd - 0.5) {
        let tx = Math.floor(px), ty = Math.floor(py - 0.05), tz = Math.floor(pz), cb = blockAt(tx, ty + 1, tz);
        if (cb > 0) { if (BSOL[cb + 1] == 0) { if (mod(gameMode, 2) == 0 && netApplying == 0) { blockDrops(cb, tx, ty + 1, tz); } setBlock(tx, ty + 1, tz, 0); } }
        setBlock(tx, ty, tz, 3);
      } }
    }
    fallTop = py;
    // the magma block burns (unless sneaking)
    if (ub == I_magma) { if (sneaking == 0) { inC = 3; } }
    plateStep(Math.floor(px), Math.floor(py), Math.floor(pz));
  }
  if (flying == 1) { fallTop = py; }
  if (py < -20) { hurtR(4, '세계 밖으로 떨어졌습니다'); }
  let moved = Math.sqrt((px - ox) * (px - ox) + (pz - oz) * (pz - oz));
  pMoved = moved;
  if (onGround == 1) { walkDist = walkDist + moved; bob = bob + moved * 2.2; }
  // ((v2.7) as 1.16.5: walking costs nothing, sprinting on the ground 0.1 a metre, swimming 0.01)
  if (sprinting == 1 && onGround == 1) { exhaust = exhaust + moved * 0.1; } else { if (inWater == 1) { exhaust = exhaust + moved * 0.01; } }
  headWater = 0;
  // ((v2.8) at the eye: lower when swimming)
  let hb = blockAt(Math.floor(px), Math.floor(py + Math.min(1.62, eyeH)), Math.floor(pz));
  if (BLQ[hb + 1] == 7 || BWATER[hb + 1] == 1) { headWater = 1; }
}

// ---------------------------------------------------------------- health and hunger
// ((v2.7) as 1.16.5: a mob's hurt is scaled by the difficulty (easy n/2 + 1, hard x 1.5; it was
// every hurt, falls too, and easy halved), armour by def - n / (2 + toughness / 4) (at least def / 5)
// / 25 and worn by n / 4 (it was a flat 4 % a point, at least 1, and every hurt wore it, falls too);
// some hurts go through armour (hurtR); within the half second a bigger hurt lands for the rest)
function hurtM(n, why) { hurtMob = 1; hurt(n, why); hurtMob = 0; }
function hurtR(n, why) { hurtRaw = 1; hurt(n, why); hurtRaw = 0; }
function hurt(n, why) {
  if (mod(gameMode, 2) == 0) { if (dead == 0) {
    if (hurtMob == 1) { if (difficulty == 0) { n = 0; } if (difficulty == 1) { n = Math.min(n, n / 2 + 1); } if (difficulty == 3) { n = n * 1.5; } }
    let go = 1;
    if (hurtT > 0) { if (n > lastDmg) { let d0 = lastDmg; lastDmg = n; n = n - d0; go = 2; } else { go = 0; } }
    if (go > 0) {
      if (go == 1) { lastDmg = n; }
      let def = 0; if (hurtRaw == 0) { def = armorDef(); }
      if (def > 0) { let red = Math.min(20, Math.max(def / 5, def - n / (2 + armTough / 4))); armorWear(Math.max(1, Math.floor(n / 4))); n = n * (1 - red / 25); }
      if (fx(6) > 0) { n = n * Math.max(0, 1 - 0.2 * fx(6)); }
      // (whole points: a part is a chance of one more)
      n = Math.floor(n + rand(0, 998) / 1000);
      if (n > 0) {
        hp = hp - n; hurtFlash = 0.35; exhaust = exhaust + 0.1;
        sndPlay(3);
        if (hp <= 0) { hp = 0; die(why); }
      }
      if (go == 1) { hurtT = 0.5; }
    }
  } }
}
let DIFF = [0.5, 0.5, 1, 1.5], difficulty = 2;
function survival(dt) {
  hurtT = hurtT - dt; hurtFlash = hurtFlash - dt;
  if (mod(gameMode, 2) == 1) { hp = 20; food = 20; air = 300; }
  else {
    while (exhaust >= 4) { exhaust = exhaust - 4; if (sat > 0) { sat = Math.max(0, sat - 1); } else { if (food > 0) { if (difficulty > 0) { food = food - 1; } } } }
    // ((v2.7) as 1.16.5: full food with saturation heals fast (a point every half second while
    // the saturation lasts, it was only the slow way), else at 18 or more a point in 4 s; peaceful:
    // a point a second and food back; starving stops at 10 on easy (it was 5), 1 normal, none hard)
    regenT = regenT + dt; fastT = fastT + dt;
    if (difficulty == 0) {
      if (regenT >= 1) { regenT = 0; if (grRegen == 1) { if (hp < 20) { hp = hp + 1; } } if (food < 20) { food = food + 1; } }
    } else {
      if (food == 20 && sat > 0 && hp < 20 && grRegen == 1) {
        if (fastT >= 0.5 * Math.max(1, 6 / sat)) { fastT = 0; hp = hp + 1; exhaust = exhaust + 6; regenT = 0; }
      } else {
        fastT = 0;
        if (regenT >= 4) {
          regenT = 0;
          if (grRegen == 1) { if (food >= 18) { if (hp < 20) { hp = hp + 1; exhaust = exhaust + 6; } } }
          if (food == 0) { if (hp > 10 || (difficulty == 2 && hp > 1) || difficulty == 3) { hurtT = 0; hurtR(1, '굶주렸습니다'); } }
        }
      }
    }
    if (headWater == 1) {
      air = air - 20 * dt;
      if (air <= 0) { air = 0; drownT = drownT + dt; if (drownT >= 1) { drownT = 0; hurtT = 0; if (grDrown == 1) { hurtR(2, '물에 빠졌습니다'); } } }
    } else { air = Math.min(300, air + 80 * dt); }
    if (inLava == 1 && fx(7) == 0) { lavaT = lavaT + dt; if (lavaT >= 0.5) { lavaT = 0; hurtT = 0; if (grFire == 1) { hurt(4, '용암에 빠졌습니다'); } } }
    bodyIn(px, py, pz, 0.3, 1.8);
    // ((v2.7) burning goes on after the fire (8 s, lava 15 s), a point a second through armour, out in
    // water or rain under the sky)
    if (inL == 1) { fireT = Math.max(fireT, 15); } if (inFireB == 1) { fireT = Math.max(fireT, 8); }
    if (inW == 1) { fireT = 0; }
    if (fireT > 0) {
      fireT = fireT - dt; burnT = burnT + dt;
      if (wthr > 0) { if (rainOn(Math.floor(px), Math.floor(py + 1.62), Math.floor(pz)) == 1) { fireT = 0; } }
      if (burnT >= 1) { burnT = 0; if (fx(7) == 0 && grFire == 1 && inC != 2 && inL == 0) { hurtT = 0; hurtR(1, '불에 탔습니다'); } }
    }
    // ((v2.7) the head in a solid block chokes)
    let hb = blockAt(Math.floor(px), Math.floor(py + eyeH), Math.floor(pz));
    if (BLOP[hb + 1] == 1 && BSHP[hb + 1] == 0 && BSOL[hb + 1] > 0) { chokeT = chokeT + dt; if (chokeT >= 0.5) { chokeT = 0; hurtT = 0; hurtR(1, '벽 속에서 숨이 막혔습니다'); } } else { chokeT = 0; }
    // (a berry bush pricks only while moving)
    if (inBush == 1 && inC == 1 && pMoved < 0.003) { inC = 0; if (underB == 19) { inC = 1; } }
    if (inC > 0 || underB == I_magma && sneaking == 0) {
      cactusT = cactusT + dt;
      if (cactusT >= 0.5) {
        cactusT = 0;
        if (inC == 2) { if (fx(7) == 0 && grFire == 1) { let fd = 1; if (inSoul == 1) { fd = 2; } hurt(fd, '불에 탔습니다'); } }
        else { if (underB == I_magma) { if (fx(7) == 0 && grFire == 1) { hurt(1, '바닥이 용암처럼 뜨거웠습니다'); } } else { hurt(1, '찔렸습니다'); } }
      }
    }
  }
}
function die(why) {
  dead = 1; deathMsg = why; uiClose(); uiMode = 7;
  if (netSrv > 0) { evAdd('c', `${netNick}: ${netClean(why)}`); plugRun('death', ' ', netNick); }
  let i = 1;
  while (i <= 40) {
    if (grKeep == 0) { if (INVI[i] > 0) { dropItem(INVI[i], INVN[i], INVD[i], px, py + 1, pz, 1); INVI[i] = 0; INVN[i] = 0; INVD[i] = 0; } }
    i = i + 1;
  }
  if (grKeep == 0) { xpLevel = 0; xpPts = 0; }
  riding = 0; gliding = 0; effectsInit();
  mouseFree();
  if (grImmediate == 1) { respawn(); }
}
function respawn() {
  if (dim != spawnDim) { dead = 0; hp = 20; food = 20; sat = 5; air = 300; exhaust = 0; uiMode = 0; startTravel(spawnDim, spawnX, spawnZ, 3); }
  else { respawn0(); }
}
function respawn0() {
  dead = 0; hp = 20; food = 20; sat = 5; air = 300; exhaust = 0;
  px = spawnX; py = spawnY; pz = spawnZ; pvx = 0; pvy = 0; pvz = 0; fallTop = py;
  let k = 0;
  solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3);
  while (solidHit == 1 && k < WY) { py = py + 1; k = k + 1; solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3); }
  uiMode = 0;
}
// ((v2.7) eating takes 1.6 s with F held (slow walking meanwhile); it was at once)
function eatStart(id) {
  if (food < 20 || mod(gameMode, 2) == 1 || id == I_goldenApple) { if (eatId != id) { eatId = id; eatT = 0; } }
}
function eatStep(dt) {
  if (eatId > 0) {
    if (key(70) && uiMode == 0 && INVI[hotSel] == eatId && dead == 0) {
      eatT = eatT + dt; swingT = Math.max(swingT, 0.1);
      if (mod(Math.floor(eatT * 5), 2) == 0) { if (frac(eatT * 5) < dt * 5) { sndPlay(5); } }
      if (eatT >= 1.6) { let e = eatId; eatId = 0; eatT = 0; eat(e); }
    } else { eatId = 0; eatT = 0; }
  }
}
// the genre's saturation share of a food (saturation = food x it x 2)
function satOf(id) {
  let m = 0.6;
  if (id == I_porkCooked || id == I_steak) { m = 0.8; }
  if (id == I_goldenApple || id == I_goldenCarrot) { m = 1.2; }
  if (id == I_flesh || id == I_cookie || id == I_berries) { m = 0.1; }
  if (id == I_melonSlice || id == I_pumpkinPie || id == I_potato || id == I_porkRaw || id == I_beefRaw || id == I_chickenRaw || id == I_apple || id == I_driedKelp) { m = 0.3; }
  return m;
}
function eat(id) {
  let f = ITFOOD[id + 1];
  if (food < 20 || mod(gameMode, 2) == 1 || id == I_goldenApple) {
    food = Math.min(20, food + f); sat = Math.min(food, sat + f * satOf(id) * 2);
    if (id == 112) { if (rand(1, 10) <= 8) { exhaust = exhaust + 12; msgShow('배가 아픕니다...', 2); } }
    if (id == I_goldenApple) { effectAdd(5, 5, 2); effectAdd(6, 120, 1); }
    takeHeld(1);
    if (id == I_beetSoup || id == I_mushStew) { if (INVI[hotSel] == 0) { INVI[hotSel] = 0; } }
    sndPlay(5);
    swingT = 0.3;
  }
}

// ---------------------------------------------------------------- what the eye looks at
let lookX = 0, lookY = 0, lookZ = 0;
function pickRay() {
  let ex = camX, ey = camY, ez = camZ;
  let dx = sind(yaw) * cosd(pitch), dy = sind(pitch), dz = cosd(yaw) * cosd(pitch);
  lookX = dx; lookY = dy; lookZ = dz;
  let reach = 4.5;
  if (gameMode == 1) { reach = 5; }
  let x = Math.floor(ex), y = Math.floor(ey), z = Math.floor(ez);
  let stx = 1, sty = 1, stz = 1;
  if (dx < 0) { stx = -1; } if (dy < 0) { sty = -1; } if (dz < 0) { stz = -1; }
  let tdx = 99999, tdy = 99999, tdz = 99999;
  if (Math.abs(dx) > 0.00001) { tdx = Math.abs(1 / dx); }
  if (Math.abs(dy) > 0.00001) { tdy = Math.abs(1 / dy); }
  if (Math.abs(dz) > 0.00001) { tdz = Math.abs(1 / dz); }
  let tmx = 99999, tmy = 99999, tmz = 99999;
  if (dx > 0) { tmx = (x + 1 - ex) * tdx; } if (dx < 0) { tmx = (ex - x) * tdx; }
  if (dy > 0) { tmy = (y + 1 - ey) * tdy; } if (dy < 0) { tmy = (ey - y) * tdy; }
  if (dz > 0) { tmz = (z + 1 - ez) * tdz; } if (dz < 0) { tmz = (ez - z) * tdz; }
  let t = 0, face = 0, b = 0, found = 0, k = 0;
  pickOn = 0; pickT = 99;
  // ((v2.8) a block not a whole cube is picked by its boxes: the rest of its cell lets the look go on)
  pbFace = 0 - 1;
  while (found == 0 && t <= reach && k < 20) {
    if (tmx < tmy && tmx < tmz) { x = x + stx; t = tmx; tmx = tmx + tdx; face = 0; if (stx < 0) { face = 1; } }
    else { if (tmy < tmz) { y = y + sty; t = tmy; tmy = tmy + tdy; face = 2; if (sty < 0) { face = 3; } }
    else { z = z + stz; t = tmz; tmz = tmz + tdz; face = 4; if (stz < 0) { face = 5; } } }
    if (t <= reach) {
      b = blockAt(x, y, z);
      if (y >= WY) { b = 0; }
      if (b != 0 && BLQ[b + 1] == 0) { found = 1; }
      if (b == I_barrier) { if (gameMode != 1) { found = 0; } }
      if (found == 1) { if (pbWhole(b) == 0) { pbBoxes(x, y, z, b); if (pbRay(x, y, z, ex, ey, ez, dx, dy, dz) == 0) { found = 0; } else { if (pbT <= reach) { t = pbT; face = pbFace; } else { found = 0; } } } }
    }
    k = k + 1;
  }
  if (found == 1) {
    if (y >= 0 && y < WY && cOK(x, z) == 1) { pickOn = 1; pickX = x; pickY = y; pickZ = z; pickF = face; pickB = b; pickT = t; pickHY = frac(ey + dy * t); pbBounds(b); }
  }
  mobPick = mobRay(ex, ey, ez, dx, dy, dz, Math.min(reach - 1.5, pickT));
  if (mobPick > 0) { pickOn = 0; }
  if (gameMode == 3) { pickOn = 0; }
}
// ---------------------------------------------------------------- (v2.8) the shapes blocks are picked by
// PBX0 .. PBZ1 the boxes of a block in 1/16 of its cell (pbN of them): a cross plant 2..14 wide and
// 13 high (cane 16), a torch its stick and flame (leaning on its wall), a shaped block its model's
// boxes with the arms to the sides it joins and a stair's corner; pbRay the nearest box the look
// enters (pbT, pbFace), pbBounds what is outlined (pkB0X .. pkB1Z, the cell's 0..1).
let PBX0 = [], PBY0 = [], PBZ0 = [], PBX1 = [], PBY1 = [], PBZ1 = [], pbN = 0, pbT = 0, pbFace = 0;
let pkB0X = 0, pkB0Y = 0, pkB0Z = 0, pkB1X = 1, pkB1Y = 1, pkB1Z = 1;
function pbWhole(b) { let r = 1, sh = BSHP[b + 1]; if (sh == 1 || sh == 2 || sh == 5) { r = 0; } return r; }
function pbAdd(a, b, c, d, e, f) {
  pbN = pbN + 1;
  if (pbN > PBX0.length) { PBX0.push(0); PBY0.push(0); PBZ0.push(0); PBX1.push(0); PBY1.push(0); PBZ1.push(0); }
  PBX0[pbN] = Math.max(0, a); PBY0[pbN] = Math.max(0, b); PBZ0[pbN] = Math.max(0, c); PBX1[pbN] = Math.min(16, d); PBY1[pbN] = Math.min(16, e); PBZ1[pbN] = Math.min(16, f);
}
function pbBoxes(x, y, z, b) {
  pbN = 0;
  let sh = BSHP[b + 1];
  if (sh == 5) {
    let m = BMDL[b + 1];
    if (BPLC[b + 1] == P_STAIRS) { m = stairShape(x, y, z, b, m); }
    let k = MD0[m], ke = k + MDN[m];
    while (k < ke) { pbAdd(MBX0[k], MBY0[k], MBZ0[k], MBX1[k], MBY1[k], MBZ1[k]); k = k + 1; }
    let c = BCONN[b + 1];
    if (c > 0) {
      let a = connOf(x, y, z, b), s = 0;
      while (s < 4) {
        if (mod(a, 2) == 1) { let am = ARMM[(c - 1) * 4 + s + 1]; k = MD0[am]; ke = k + MDN[am]; while (k < ke) { pbAdd(MBX0[k], MBY0[k], MBZ0[k], MBX1[k], MBY1[k], MBZ1[k]); k = k + 1; } }
        a = idiv(a, 2); s = s + 1;
      }
    }
  } else {
    if (sh == 1) { if (b == I_reed) { pbAdd(2, 0, 2, 14, 16, 14); } else { pbAdd(2, 0, 2, 14, 13, 14); } }
    else {
      if (sh == 2) {
        let a = BATT[b + 1], ox = 0, oy = 0, oz = 0;
        if (a >= 0) { if (a != 2) { ox = DX6[a + 1] * 5; oz = DZ6[a + 1] * 5; oy = 3; } }
        pbAdd(6 + ox, oy, 6 + oz, 10 + ox, 12.5 + oy, 10 + oz);
      } else { pbAdd(0, 0, 0, 16, 16, 16); }
    }
  }
}
// the nearest of the boxes the look from (ex, ey, ez) the way (dx, dy, dz) enters (from outside): 1 if one
function pbRay(x, y, z, ex, ey, ez, dx, dy, dz) {
  let r = 0, i = 1;
  pbT = 99999; pbFace = 0 - 1;
  while (i <= pbN) {
    let t0 = 0 - 99999, t1 = 99999, f = 0 - 1, ok = 1;
    // (each axis: where the look is between the box's two planes)
    let a0 = x + PBX0[i] / 16, a1 = x + PBX1[i] / 16;
    if (Math.abs(dx) < 0.000001) { if (ex < a0 || ex > a1) { ok = 0; } }
    else { let u = (a0 - ex) / dx, v = (a1 - ex) / dx, g = 0; if (dx < 0) { u = (a1 - ex) / dx; v = (a0 - ex) / dx; g = 1; } if (u > t0) { t0 = u; f = g; } if (v < t1) { t1 = v; } }
    a0 = y + PBY0[i] / 16; a1 = y + PBY1[i] / 16;
    if (Math.abs(dy) < 0.000001) { if (ey < a0 || ey > a1) { ok = 0; } }
    else { let u = (a0 - ey) / dy, v = (a1 - ey) / dy, g = 2; if (dy < 0) { u = (a1 - ey) / dy; v = (a0 - ey) / dy; g = 3; } if (u > t0) { t0 = u; f = g; } if (v < t1) { t1 = v; } }
    a0 = z + PBZ0[i] / 16; a1 = z + PBZ1[i] / 16;
    if (Math.abs(dz) < 0.000001) { if (ez < a0 || ez > a1) { ok = 0; } }
    else { let u = (a0 - ez) / dz, v = (a1 - ez) / dz, g = 4; if (dz < 0) { u = (a1 - ez) / dz; v = (a0 - ez) / dz; g = 5; } if (u > t0) { t0 = u; f = g; } if (v < t1) { t1 = v; } }
    if (ok == 1 && t0 <= t1 && t0 >= 0 && f >= 0) { if (t0 < pbT) { pbT = t0; pbFace = f; r = 1; } }
    i = i + 1;
  }
  return r;
}
// what is outlined: the boxes' bounds (a whole cube: the cell)
function pbBounds(b) {
  pkB0X = 0; pkB0Y = 0; pkB0Z = 0; pkB1X = 1; pkB1Y = 1; pkB1Z = 1;
  if (pbWhole(b) == 0) {
    if (pbN > 0) {
      pkB0X = 16; pkB0Y = 16; pkB0Z = 16; pkB1X = 0; pkB1Y = 0; pkB1Z = 0;
      let i = 1;
      while (i <= pbN) {
        pkB0X = Math.min(pkB0X, PBX0[i]); pkB0Y = Math.min(pkB0Y, PBY0[i]); pkB0Z = Math.min(pkB0Z, PBZ0[i]);
        pkB1X = Math.max(pkB1X, PBX1[i]); pkB1Y = Math.max(pkB1Y, PBY1[i]); pkB1Z = Math.max(pkB1Z, PBZ1[i]);
        i = i + 1;
      }
      pkB0X = pkB0X / 16; pkB0Y = pkB0Y / 16; pkB0Z = pkB0Z / 16; pkB1X = pkB1X / 16; pkB1Y = pkB1Y / 16; pkB1Z = pkB1Z / 16;
    }
  }
}
let nbX = 0, nbY = 0, nbZ = 0;
function pickNeighbour() {
  nbX = pickX; nbY = pickY; nbZ = pickZ;
  if (pickF == 0) { nbX = nbX - 1; } if (pickF == 1) { nbX = nbX + 1; } if (pickF == 2) { nbY = nbY - 1; }
  if (pickF == 3) { nbY = nbY + 1; } if (pickF == 4) { nbZ = nbZ - 1; } if (pickF == 5) { nbZ = nbZ + 1; }
}

// ---------------------------------------------------------------- breaking
// tools: kind 0 pickaxe .. 4 hoe, 5 shears == block tool 1 .. 6
let harvest = 0;
function breakTime(b) {
  let h = BHARD[b + 1], id = INVI[hotSel], kind = 0 - 1, tier = 0 - 1, sp = 1;
  if (ITTK[id + 1] >= 0) { kind = ITTK[id + 1]; tier = ITTT[id + 1]; }
  let tool = BTOOL[b + 1];
  if (tool > 0) { if (kind + 1 == tool) { if (kind == 5) { sp = 5; } else { sp = TSPEED[tier + 1]; } } }
  if (kind == 3) { if (BLEAF[b + 1] == 1) { sp = 1.5; } if (b == 19) { sp = 1.5; } if (b == I_cobweb) { sp = 15; } }
  if (kind == 5) { if (b == I_cobweb) { sp = 15; } if (BLEAF[b + 1] == 1) { sp = 15; } }
  harvest = 1;
  if (BTIER[b + 1] >= 0) { harvest = 0; if (kind == 0) { if (TLEVEL[tier + 1] >= BTIER[b + 1]) { harvest = 1; } } }
  let t = h * 1.5 / sp / (1 + 0.2 * fx(3));
  if (harvest == 0) { t = h * 5 / sp / (1 + 0.2 * fx(3)); }
  // ((v2.7) as the genre: x 5 with the head in water, x 5 more off the ground (it was x 5 only
  // in water and off the ground))
  if (headWater == 1) { t = t * 5; }
  if (onGround == 0 && flying == 0 && riding == 0) { t = t * 5; }
  if (h < 0) { t = 99999; }
  return t;
}
function breaking0(dt) {
  breakCool = breakCool - dt;
  breakStage = 0;
  if (pickOn == 1 && clickHeld == 1 && uiMode == 0 && gameMode != 2) {
    if (pickX != breakX || pickY != breakY || pickZ != breakZ) {
      breakX = pickX; breakY = pickY; breakZ = pickZ; breakT = 0;
      // (v2.5) a note block hit plays its note
      if (BKIND[pickB + 1] == I_noteBlock) { notePlay(pickX, pickY, pickZ, pickB); }
    }
    swingT = Math.max(swingT, 0.25);
    if (breakCool <= 0) {
      let bt = breakTime(pickB);
      if (gameMode == 1) { bt = 0; if (ITTK[INVI[hotSel] + 1] == 3) { bt = 99999; } }
      breakT = breakT + dt;
      if (bt > 0) { breakStage = Math.min(9, Math.floor(breakT / bt * 10)); }
      if (breakT >= bt) {
        breakBlock(pickX, pickY, pickZ, 1);
        breakT = 0; breakX = -1;
        // ((v2.7) 5 ticks after a block that took time, none after one that breaks at once: it was
        // the other way round)
        breakCool = 0.25;
        if (bt <= 0.05) { breakCool = 0.05; }
        if (gameMode == 1) { breakCool = 0.22; }
      } else { if (mod(Math.floor(breakT * 4), 2) == 0) { if (frac(breakT * 4) < dt * 4) { sndPlay(1); } } }
    }
  } else { breakT = 0; breakX = -1; }
}
// take a block away (by the player when byP 1: drops and wears the tool)
function breakBlock(x, y, z, byP) {
  let b = blockAt(x, y, z);
  // (v2.5) string broken but by shears: its hooks go on
  if (BRS[b + 1] == RS_TRIP) { if (ITTK[INVI[hotSel] + 1] != 5) { tripHit(x, y, z); } }
  if (netSrv > 0) { if (byP == 1) { plugRun('break', ITKEY[b + 1], netNick); } }
  if (byP == 1) {
    let bt0 = breakTime(b);
    sndPlay(2);
    if (mod(gameMode, 2) == 0) {
      exhaust = exhaust + 0.005;
      if (harvest == 1) { if (grTileDrops == 1) { blockDrops(b, x, y, z); } }
      let id = INVI[hotSel];
      if (ITTK[id + 1] >= 0) { if (BHARD[b + 1] > 0) { if (ITTK[id + 1] == 3) { wearHeld(2); } else { wearHeld(1); } } }
    }
  }
  if (BUSE[b + 1] == U_SHELL) { shellBoxBroken(x, y, z, b); }
  setBlock(x, y, z, 0);
  partnerGone(x, y, z, b, byP);
  if (b == 57) { crystalBreak(x, y, z); }
  if (b == 33) { if (mod(gameMode, 2) == 0) { if (dim != 1) { let ib = blockAt(x, y - 1, z); if (BSOL[ib + 1] > 0 || BLQ[ib + 1] > 0) { setBlock(x, y, z, 7); } } } }
  chestOrFurnaceGone(x, y, z, b);
}
function blockDrops(b, x, y, z) {
  let d = BDROP[b + 1], n = BDROPN[b + 1], held = INVI[hotSel];
  if (dropBare == 1) { held = 0; }
  // (v2.4.4) lit TNT gives nothing back (it goes off anyway)
  if (b == I_tnt) { if (tntLit(x, y, z) == 1) { d = 0; } }
  if (b == 9) { if (rand(1, 10) == 1) { d = 118; } }
  if (BLEAF[b + 1] == 1) {
    d = 0;
    if (ITTK[held + 1] == 5) { d = b; n = 1; }
    else {
      // ((v2.7) as 1.16.5: a sapling 1 in 20 (jungle-like 1 in 40), sticks 1 in 50, an apple 1 in 200,
      // each its own roll (the last one hit took the place of the others)
      let sc = 20; if (b == I_mahoganyLeaves) { sc = 40; }
      if (rand(1, sc) == 1) { if (BSAP[b + 1] > 0) { dropItem(BSAP[b + 1], 1, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
      if (rand(1, 50) == 1) { dropItem(100, rand(1, 2), 0, x + 0.5, y + 0.3, z + 0.5, 0); }
      if (b == 14 || b == I_ebonyLeaves) { if (rand(1, 200) == 1) { dropItem(105, 1, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
    }
  }
  if (b == 40) { n = rand(4, 8); }
  if (BUSE[b + 1] == U_SHELL) { d = 0; }
  if (b == 46) { n = rand(0, 2); }
  if (b == 28 || b == I_fern) { if (rand(1, 8) == 1) { d = I_wheatSeeds; n = 1; } }
  if (b == I_glowCrystal) { n = rand(2, 4); }
  if (b == I_oreSpark) { n = rand(4, 5); }
  if (b == I_oreAshGold) { n = rand(2, 6); }
  if (b == I_melon) { n = rand(3, 7); }
  if (b == I_cobweb || b == I_vines || BSHP[b + 1] == 1 && BCROP[b + 1] < 0 && d == 0) { if (ITTK[held + 1] == 5) { d = b; n = 1; } }
  if (b == I_cobweb) { if (ITTK[held + 1] != 5) { if (ITTK[held + 1] != 3) { d = 0; } } }
  // crops: the ripe ones give their crop and seeds
  if (BCROP[b + 1] == 3) {
    let k = BKIND[b + 1];
    if (k == I_wheatCrop) { dropItem(I_wheatSeeds, rand(0, 3), 0, x + 0.5, y + 0.3, z + 0.5, 0); }
    if (k == I_beetCrop) { dropItem(I_beetSeeds, rand(1, 3), 0, x + 0.5, y + 0.3, z + 0.5, 0); }
    if (k == I_carrotCrop || k == I_potatoCrop) { n = rand(2, 4); }
  }
  if (d != b) { let xp = oreXp(b); if (xp > 0) { xpAdd(xp); } }
  if (d > 0) { if (n > 0) { dropItem(d, n, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
}

// ((v2.7) the genre's experience: coal 0-2, diamond and jade 3-7, lapis and quartz 2-5, spark 1-5,
// ashen gold 0-1, a spawner 15-43)
function oreXp(b) {
  let r = 0;
  if (BXP[b + 1] > 0) { r = rand(0, BXP[b + 1]); }
  if (b == 12) { r = rand(0, 2); } if (b == 16 || b == I_oreJade) { r = rand(3, 7); }
  if (b == 40 || b == I_oreQuartz) { r = rand(2, 5); } if (b == I_oreSpark) { r = rand(1, 5); }
  if (b == I_oreAshGold) { r = rand(0, 1); } if (BSPEC[b + 1] == 6) { r = rand(15, 43); }
  return r;
}
// ---------------------------------------------------------------- changing the world
let lbX0 = 9999, lbX1 = -1, lbZ0 = 9999, lbZ1 = -1, dirtyN = 0;
let DIRTY = [], SDIRTY = [];
function setBlock(x, y, z, b) {
  if (y >= 0 && y < WY && cOK(x, z) == 1) {
    let old = W[wi(x, y, z)];
    logOn = lqLog; wput(x, y, z, b); logOn = 0;
    if (old == 34) { if (b != 34) { veilN = 0; veilBreak(x + 1, y, z); veilBreak(x - 1, y, z); veilBreak(x, y + 1, z); veilBreak(x, y - 1, z); veilBreak(x, y, z + 1); veilBreak(x, y, z - 1); } }
    markDirty(x, y, z);
    // (liquid flowing over air and back is not lit again - the dear part, 29 x 29 columns: flowing
    // lava's own light comes with the next change near it, its source lights the place already)
    let relit = 1;
    if (lqLog == 0) { if (BLOP[old + 1] == 0 && BLOP[b + 1] == 0) { relit = 0; } }
    // ((v2.6) nor when the two stop and dim the light alike (stone put for stone, a door turned): only
    // a light that changes (a lamp, a torch put, lit or out) is spread or taken back from its cell)
    if (relit == 1) { if (BLOP[old + 1] == BLOP[b + 1] && BHC[old + 1] == BHC[b + 1]) {
      relit = 0;
      if (BLIT[old + 1] != BLIT[b + 1]) { if (lightOn == 1) { blockLightSet(x, y, z, BLIT[b + 1]); } }
    } }
    // ((v2.6) worked out from this cell alone: lightCell)
    if (relit == 1) { if (lightOn == 1) { lightCell(x, y, z); } }
    // a block that cannot stand where it is now
    let up = blockAt(x, y + 1, z);
    if (b == 0 || BSOL[b + 1] == 0) {
      if (y + 1 < WY) {
        // (a spark part hung on a wall is not stood on)
        let hangs = 1; if (BATT[up + 1] >= 0) { if (BATT[up + 1] != 2) { hangs = 0; } }
        if (hangs == 1) { if (BSHP[up + 1] == 1 || BSHP[up + 1] == 2 || up == 19 || (BNEED[up + 1] > 0 && BNEED[up + 1] != N_ANY)) {
          if (BPLC[up + 1] != P_DOOR || BSHP[b + 1] == 0) { if (mod(gameMode, 2) == 0 && netApplying == 0) { blockDrops(up, x, y + 1, z); } setBlock(x, y + 1, z, 0); }
        } }
        if (BFALL[up + 1] == 1) { fallBlock(x, y + 1, z); }
      }
    }
    if (BFALL[b + 1] == 1) { fallBlock(x, y, z); }
    // concrete powder by water sets
    if (BWET[b + 1] > 0) { if (BFALL[b + 1] == 1) { if (waterNear(x, y, z) == 1) { logOn = 1; wput(x, y, z, BWET[b + 1]); logOn = 0; } } }
    if (BLQ[b + 1] == 7) { wetAround(x, y, z); }
    // spark power: the cells round look again (two steps out when a part came or went)
    // (v2.5) but a spark block, as the genre's, tells only the cells by it: a piston that takes power
    // reaching the cell over it does not notice one put there (a BUD switch) until something by it changes
    let two = 0;
    if (BRS[old + 1] > 0 && BRS[old + 1] != RS_BLOCK) { two = 1; }
    if (BRS[b + 1] > 0 && BRS[b + 1] != RS_BLOCK) { two = 1; }
    if (two == 1) { rsNotify(x, y, z, 3); } else { rsNotify(x, y, z, 2); }
    // (v2.3.2) liquid by the change looks again: it runs into a hole, goes back when its source went
    fluidNotify(x, y, z);
    // ((v2.7) leaves, fire, sponges, cane and cactus by it)
    jeChanged(x, y, z, old, b);
  }
}
function waterNear(x, y, z) {
  let r = 0;
  if (BLQ[blockAt(x + 1, y, z) + 1] == 7 || BLQ[blockAt(x - 1, y, z) + 1] == 7 || BLQ[blockAt(x, y + 1, z) + 1] == 7 || BLQ[blockAt(x, y, z + 1) + 1] == 7 || BLQ[blockAt(x, y, z - 1) + 1] == 7) { r = 1; }
  return r;
}
function wetAround(x, y, z) {
  M_wet(x + 1, y, z); M_wet(x - 1, y, z); M_wet(x, y - 1, z); M_wet(x, y, z + 1); M_wet(x, y, z - 1);
}
function M_wet(X, Y, Z) {
  let wb = blockAt(X, Y, Z);
  if (BWET[wb + 1] > 0) { if (BFALL[wb + 1] == 1) { logOn = 1; wput(X, Y, Z, BWET[wb + 1]); logOn = 0; markDirty(X, Y, Z); } }
}
function markDirty(x, y, z) {
  markSec(secOf(x, y, z));
  let lx = mod(x, 8), ly = mod(y, 8), lz = mod(z, 8);
  if (lx == 0) { markSec(secOf(x - 1, y, z)); }
  if (lx == 7) { markSec(secOf(x + 1, y, z)); }
  if (ly == 0) { if (y > 0) { markSec(secOf(x, y - 1, z)); } }
  if (ly == 7) { if (y < WY - 1) { markSec(secOf(x, y + 1, z)); } }
  if (lz == 0) { markSec(secOf(x, y, z - 1)); }
  if (lz == 7) { markSec(secOf(x, y, z + 1)); }
}
function markSec(s) {
  if (SDIRTY[s] != 1) { SDIRTY[s] = 1; dirtyN = dirtyN + 1; if (dirtyN > DIRTY.length) { DIRTY.push(s); } else { DIRTY[dirtyN] = s; } }
}
function worldFlush() {
  if (lbX1 >= 0) { if (lightOn == 1) { relight(lbX0, lbX1, lbZ0, lbZ1); } lbX0 = 9999; lbX1 = -1; lbZ0 = 9999; lbZ1 = -1; }
  let i = 1;
  while (i <= dirtyN) { if (SOK[DIRTY[i]] == 1) { meshSection(DIRTY[i]); } SDIRTY[DIRTY[i]] = 0; i = i + 1; }
  dirtyN = 0;
}
// sand, gravel, concrete powder, anvils drop to the first support
function fallBlock(x, y, z) {
  let b = blockAt(x, y, z), y2 = y, go = 1;
  while (y2 > 0 && go == 1) {
    let fb = blockAt(x, y2 - 1, z);
    if (fb == 0 || BLQ[fb + 1] > 0 || mod(idiv(BJE[fb + 1], 2), 2) == 1) { y2 = y2 - 1; if (BWET[b + 1] > 0 && BLQ[fb + 1] == 7) { go = 0; } } else { go = 0; }
  }
  if (y2 < y) {
    logOn = 1; wput(x, y, z, 0); wput(x, y2, z, b); logOn = 0;
    markDirty(x, y, z); markDirty(x, y2, z);
    if (lightOn == 1) { lightCell(x, y, z); lightCell(x, y2, z); }
    fluidNotify(x, y, z);
    rsTell(x, y, z); rsTell(x, y2, z);
    if (BWET[b + 1] > 0) { if (waterNear(x, y2, z) == 1 || BLQ[blockAt(x, y2 + 1, z) + 1] == 7) { logOn = 1; wput(x, y2, z, BWET[b + 1]); logOn = 0; } }
    let up = blockAt(x, y + 1, z);
    if (BFALL[up + 1] == 1) { fallBlock(x, y + 1, z); }
  }
}
// (before v2.3.2 a hole by water was filled at once, 40 cells deep: now fluid.js)

// ---------------------------------------------------------------- bow and armour
let bowCool = 0;
function shootBow() {
  if (bowCool <= 0) {
    let k = 1, a = 0;
    while (k <= 36) { if (a == 0) { if (INVI[k] == 115) { a = k; } } k = k + 1; }
    if (a > 0 || gameMode == 1) {
      if (gameMode != 1) { INVN[a] = INVN[a] - 1; if (INVN[a] <= 0) { INVI[a] = 0; INVN[a] = 0; } }
      arrowShoot(camX, camY - 0.1, camZ, camX + lookX * 20, camY - 0.1 + lookY * 20, camZ + lookZ * 20, 1);
      wearHeld(1); bowCool = 0.6; swingT = 0.3; sndPlay(1);
    } else { msgShow('화살이 없습니다', 1.5); }
  }
}
function armorDef() {
  let d = 0, k = 37; armTough = 0;
  while (k <= 40) { if (INVI[k] > 0) { let v = ITDEF[INVI[k] + 1]; d = d + mod(v, 100); armTough = armTough + idiv(v, 100); } k = k + 1; }
  return d;
}
function armorWear(w) {
  let k = 37;
  while (k <= 40) {
    if (INVI[k] > 0) {
      INVD[k] = INVD[k] + w;
      if (INVD[k] >= ITDUR[INVI[k] + 1]) { msgShow(`${ITNAME[INVI[k] + 1]}이(가) 부서졌습니다`, 2); INVI[k] = 0; INVN[k] = 0; INVD[k] = 0; sndPlay(7); }
    }
    k = k + 1;
  }
}
