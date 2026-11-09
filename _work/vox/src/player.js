// ===================================================================== the player
// gameMode: 0 survival, 1 creative, 2 adventure (no breaking or building), 3 spectator (through
// everything, nothing touched)
let px = 64, py = 40, pz = 64, pvx = 0, pvy = 0, pvz = 0, yaw = 0, pitch = 0;
let onGround = 0, inWater = 0, inLava = 0, headWater = 0, flying = 0, sneaking = 0, sprinting = 0;
let gameMode = 0, hp = 20, food = 20, sat = 5, exhaust = 0, air = 300, regenT = 0, starveT = 0, hurtT = 0, hurtFlash = 0;
let fallTop = 0, lavaT = 0, cactusT = 0, drownT = 0, dead = 0, deathMsg = '';
let jumpWas = 0, spaceTapT = 0, wTapT = 0, wWas = 0, bob = 0, walkDist = 0;
let pickOn = 0, pickX = 0, pickY = 0, pickZ = 0, pickF = 0, pickB = 0, pickT = 99, mobPick = 0, pickHY = 0;
let breakT = 0, breakStage = 0, breakX = -1, breakY = -1, breakZ = -1, breakCool = 0, swingT = 0, placeCool = 0, attackCool = 0;
let specSpeed = 1, wasHitX = 0;

// ---------------------------------------------------------------- bodies (player, mobs)
// box: centre (bmX, bmZ), feet bmY, half width bmW, height bmH; moved by (dx, dy, dz) against
// the boxes of the blocks one axis at a time. bmHitX/Y/Z: stopped on that axis; bmGround: landed.
// bmStep: how high a step it may walk up (on the ground).
let bmX = 0, bmY = 0, bmZ = 0, bmW = 0.3, bmH = 1.8, bmHitX = 0, bmHitY = 0, bmHitZ = 0, bmGround = 0, bmStep = 0;
let solidHit = 0, hTop = 0, hBot = 0, hX0 = 0, hX1 = 0, hZ0 = 0, hZ1 = 0;
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
  if (QX1 > ax0 && QX0 < ax1 && QY1 > ay0 && QY0 < ay1 && QZ1 > az0 && QZ0 < az1) {
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
      solidBox(bmX - w, bmX + w, ny, ny + bmH, bmZ - w, bmZ + w);
      if (solidHit == 1) {
        if (sy < 0) { ny = hTop; bmGround = 1; } else { ny = hBot - bmH - e; }
        bmHitY = 1; sy = 0;
      }
      bmY = ny;
    }
    if (sx != 0) {
      let nx = bmX + sx;
      solidBox(nx - w, nx + w, bmY, bmY + bmH, bmZ - w, bmZ + w);
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
      solidBox(bmX - w, bmX + w, bmY, bmY + bmH, nz - w, nz + w);
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
  inW = 0; inL = 0; inC = 0; inClimb = 0; inWeb = 0;
  let x0 = Math.floor(x - w), x1 = Math.floor(x + w), y0 = Math.floor(y + 0.1), y1 = Math.floor(y + h - 0.1), z0 = Math.floor(z - w), z1 = Math.floor(z + w);
  if (y0 < 0) { y0 = 0; } if (y1 > WY - 1) { y1 = WY - 1; }
  let a = x0, c = 0, k = 0, yy = 0;
  while (a <= x1) {
    c = z0;
    while (c <= z1) {
      yy = y0;
      while (yy <= y1) {
        k = blockAt(a, yy, c);
        if (k == 7) { inW = 1; } if (k == 35) { inL = 1; }
        if (BWATER[k + 1] == 1) { inW = 1; }
        if (BMOVE[k + 1] == 1) { inClimb = 1; } if (BMOVE[k + 1] == 3) { inWeb = 1; }
        if (BHURT[k + 1] == 2) { inC = 2; } if (BHURT[k + 1] == 1) { if (BSHP[k + 1] != 0) { inC = 1; } }
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
}

// ---------------------------------------------------------------- moving
function playerMove(dt) {
  if (riding > 0) { if (ET[riding] != 13) { riding = 0; } }
  if (gameMode == 3) { riding = 0; spectatorMove(dt); }
  else {
    if (riding > 0) {
      if (key(16)) { if (uiMode == 0) { riding = 0; py = py + 0.9; pvy = 2; } }
      else { px = EX[riding]; py = EY[riding] + 0.25; pz = EZ[riding]; pvx = 0; pvy = 0; pvz = 0; fallTop = py; onGround = 1; }
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
  if (blockAt(Math.floor(px), Math.floor(py + 1.62), Math.floor(pz)) == 7) { headWater = 1; }
}
function playerMove2(dt) {
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
  bodyIn(px, py, pz, 0.3, 1.8);
  inWater = inW; inLava = inL;
  let sp = 4.3;
  if (sprinting == 1) { sp = 5.6; }
  if (sneaking == 1) { if (flying == 0) { sp = 1.3; } }
  if (flying == 1) { sp = 10.9; if (sprinting == 1) { sp = 21.6; } }
  if (inWater == 1 || inLava == 1) { if (flying == 0) { sp = sp * 0.45; } }
  // what is under the feet or round the body: sand that holds, honey, a web
  let mv = BMOVE[underB + 1];
  if (flying == 0) {
    if (mv == 2) { sp = sp * 0.45; } if (mv == 7) { sp = sp * 0.4; }
    if (inWeb == 1) { sp = sp * 0.15; }
  }
  sp = sp * (1 + 0.2 * fx(1)) * Math.max(0.1, 1 - 0.15 * fx(2));
  let l = Math.sqrt(fw * fw + st * st);
  let wx = 0, wz = 0;
  if (l > 0) {
    let sy = sind(yaw), cy = cosd(yaw);
    wx = (fw * sy + st * cy) / l * sp; wz = (fw * cy - st * sy) / l * sp;
  }
  let acc = 14;
  if (onGround == 0) { acc = 3.5; }
  if (onGround == 1) { if (mv == 5) { acc = 1.6; } if (mv == 6) { acc = 0.8; } }
  if (flying == 1) { acc = 8; }
  if (inWater == 1) { acc = 6; }
  let a = Math.min(1, acc * dt);
  if (gliding == 0) { pvx = pvx + (wx - pvx) * a; pvz = pvz + (wz - pvz) * a; }
  let spc = key(32);
  if (uiMode != 0) { spc = 0; }
  spaceTapT = spaceTapT + dt;
  if (spc) { if (jumpWas == 0) { if (gameMode == 1) { if (spaceTapT < 0.3) { flying = 1 - flying; pvy = 0; spaceTapT = 9; } else { spaceTapT = 0; } } } }
  if (flying == 1) {
    let vy = 0;
    if (spc) { vy = 7.5; }
    if (sneaking == 1) { vy = 0 - 7.5; }
    pvy = pvy + (vy - pvy) * Math.min(1, 10 * dt);
  } else {
    if (inWater == 1 || inLava == 1) {
      pvy = pvy - 9 * dt;
      if (pvy < -3) { pvy = -3; }
      if (spc) { pvy = Math.min(pvy + 30 * dt, 3.2); }
      fallTop = py;
    } else {
      if (gliding == 0) { if (onGround == 0) { if (pvy < 0) { if (keyHit(32) == 1) { if (gliderOn() == 1) { gliding = 1; } } } } }
      if (gliding == 1) { if (onGround == 1 || gliderOn() == 0) { gliding = 0; } }
      if (gliding == 1) { glideStep(dt); }
      else {
        pvy = pvy - 32 * dt;
        if (fx(10) > 0) { pvy = pvy + (0.9 * fx(10) - pvy) * Math.min(1, 5 * dt) + 32 * dt; fallTop = py; }
        if (fx(11) > 0) { if (pvy < -1.8) { pvy = 0 - 1.8; } fallTop = py; }
      }
      if (pvy < -60) { pvy = -60; }
      if (spc) { if (onGround == 1) { let jv = Math.sqrt(79.2 + 32 * fx(4)); if (mv == 7) { jv = jv * 0.5; } pvy = jv; exhaust = exhaust + 0.05; if (sprinting == 1) { exhaust = exhaust + 0.15; pvx = pvx * 1.25; pvz = pvz * 1.25; } } }
    }
    // ladders, vines, scaffolding: up when pushing on or Space, held when sneaking
    if (inClimb == 1) {
      if (pvy < -3) { pvy = -3; }
      if (spc || (wasHitX == 1 && l > 0)) { pvy = 3; }
      if (sneaking == 1) { if (pvy < 0) { pvy = 0; } }
      fallTop = py;
    }
    if (inWeb == 1) { if (pvy < -1) { pvy = -1; } if (pvy > 1) { pvy = 1; } fallTop = py; }
  }
  jumpWas = 0;
  if (spc) { jumpWas = 1; }
  let ox = px, oz = pz;
  bmX = px; bmY = py; bmZ = pz; bmW = 0.3; bmH = 1.8; bmStep = 0;
  if (onGround == 1 && flying == 0) { bmStep = 0.6; }
  let mx = pvx * dt, mz = pvz * dt;
  if (sneaking == 1) { if (onGround == 1) { if (flying == 0) {
    if (groundUnder(px + mx, py, pz, 0.3) == 0) { mx = 0; }
    if (groundUnder(px + mx, py, pz + mz, 0.3) == 0) { mz = 0; }
  } } }
  let vyWas = pvy;
  bodyMove(mx, pvy * dt, mz);
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
      // the elastic block throws the body back up (but not when sneaking)
      if (BMOVE[ub + 1] == 4 && sneaking == 0) { if (vyWas < -3) { pvy = 0 - vyWas * 0.85; onGround = 0; fd = 0; } }
      if (ub == I_hayBale) { fd = fd * 0.2; }
      if (BPLC[ub + 1] == P_BED) { fd = fd * 0.5; }
      if (fd > 3.4) { if (mod(gameMode, 2) == 0) { if (inWater == 0) { if (grFall == 1) { hurt(Math.floor(fd - 3), '높은 곳에서 떨어졌습니다'); } } } }
      // landing on farmland tramples it
      if (fd > 1) { if (ub == I_farmland || ub == I_farmlandWet) { setBlock(Math.floor(px), Math.floor(py - 0.05), Math.floor(pz), 3); } }
    }
    fallTop = py;
    // the magma block burns (unless sneaking)
    if (ub == I_magma) { if (sneaking == 0) { inC = 3; } }
    plateStep(Math.floor(px), Math.floor(py), Math.floor(pz));
  }
  if (flying == 1) { fallTop = py; }
  if (py < -20) { hurt(4, '세계 밖으로 떨어졌습니다'); }
  let moved = Math.sqrt((px - ox) * (px - ox) + (pz - oz) * (pz - oz));
  if (onGround == 1) { walkDist = walkDist + moved; bob = bob + moved * 2.2; }
  if (sprinting == 1) { exhaust = exhaust + moved * 0.1; } else { exhaust = exhaust + moved * 0.01; }
  headWater = 0;
  let hb = blockAt(Math.floor(px), Math.floor(py + 1.62), Math.floor(pz));
  if (hb == 7 || BWATER[hb + 1] == 1) { headWater = 1; }
}

// ---------------------------------------------------------------- health and hunger
function hurt(n, why) {
  if (mod(gameMode, 2) == 0) { if (dead == 0) { if (hurtT <= 0) {
    let def = armorDef();
    if (def > 0) { n = Math.max(1, Math.round(n * (1 - Math.min(20, def) * 0.04))); armorWear(); }
    if (fx(6) > 0) { n = Math.round(n * Math.max(0, 1 - 0.2 * fx(6))); }
    n = Math.round(n * DIFF[difficulty + 1]);
    if (n > 0) {
      hp = hp - n; hurtT = 0.5; hurtFlash = 0.35; exhaust = exhaust + 0.1;
      sndPlay(3);
      if (hp <= 0) { hp = 0; die(why); }
    }
  } } }
}
let DIFF = [0.5, 0.5, 1, 1.5], difficulty = 2;
function survival(dt) {
  hurtT = hurtT - dt; hurtFlash = hurtFlash - dt;
  if (mod(gameMode, 2) == 1) { hp = 20; food = 20; air = 300; }
  else {
    while (exhaust >= 4) { exhaust = exhaust - 4; if (sat > 0) { sat = Math.max(0, sat - 1); } else { if (food > 0) { if (difficulty > 0) { food = food - 1; } } } }
    regenT = regenT + dt;
    if (regenT >= 4) {
      regenT = 0;
      if (grRegen == 1) { if (food >= 18 || difficulty == 0) { if (hp < 20) { hp = hp + 1; exhaust = exhaust + 6; } } }
      if (food == 0) { if (hp > 10 - difficulty * 5 || difficulty == 3) { if (hp > 1 || difficulty == 3) { hurtT = 0; hurt(1, '굶주렸습니다'); } } }
    }
    if (headWater == 1) {
      air = air - 20 * dt;
      if (air <= 0) { air = 0; drownT = drownT + dt; if (drownT >= 1) { drownT = 0; hurtT = 0; if (grDrown == 1) { hurt(2, '물에 빠졌습니다'); } } }
    } else { air = Math.min(300, air + 300 * dt); }
    if (inLava == 1 && fx(7) == 0) { lavaT = lavaT + dt; if (lavaT >= 0.5) { lavaT = 0; hurtT = 0; if (grFire == 1) { hurt(4, '용암에 빠졌습니다'); } } }
    bodyIn(px, py, pz, 0.3, 1.8);
    if (inC > 0 || underB == I_magma && sneaking == 0) {
      cactusT = cactusT + dt;
      if (cactusT >= 0.5) {
        cactusT = 0;
        if (inC == 2) { if (fx(7) == 0 && grFire == 1) { hurt(1, '불에 탔습니다'); } }
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
function eat(id) {
  let f = ITFOOD[id + 1];
  if (food < 20 || mod(gameMode, 2) == 1 || id == I_goldenApple) {
    food = Math.min(20, food + f); sat = Math.min(food, sat + f * 0.6);
    if (id == 112) { if (rand(1, 10) <= 8) { exhaust = exhaust + 12; msgShow('배가 아픕니다...', 2); } }
    if (id == I_goldenApple) { effectAdd(5, 5, 2); effectAdd(6, 120, 1); }
    if (id == I_goldenCarrot) { sat = Math.min(food, sat + 8); }
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
  while (found == 0 && t <= reach && k < 20) {
    if (tmx < tmy && tmx < tmz) { x = x + stx; t = tmx; tmx = tmx + tdx; face = 0; if (stx < 0) { face = 1; } }
    else { if (tmy < tmz) { y = y + sty; t = tmy; tmy = tmy + tdy; face = 2; if (sty < 0) { face = 3; } }
    else { z = z + stz; t = tmz; tmz = tmz + tdz; face = 4; if (stz < 0) { face = 5; } } }
    if (t <= reach) {
      b = blockAt(x, y, z);
      if (y >= WY) { b = 0; }
      if (b != 0 && b != 7 && b != 35) { found = 1; }
      if (b == I_barrier) { if (gameMode != 1) { found = 0; } }
    }
    k = k + 1;
  }
  if (found == 1) {
    if (y >= 0 && y < WY && cOK(x, z) == 1) { pickOn = 1; pickX = x; pickY = y; pickZ = z; pickF = face; pickB = b; pickT = t; pickHY = frac(ey + dy * t); }
  }
  mobPick = mobRay(ex, ey, ez, dx, dy, dz, Math.min(reach - 1.5, pickT));
  if (mobPick > 0) { pickOn = 0; }
  if (gameMode == 3) { pickOn = 0; }
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
  if (harvest == 0) { t = h * 5 / sp; }
  if (inWater == 1) { if (onGround == 0) { t = t * 5; } }
  if (h < 0) { t = 99999; }
  return t;
}
function breaking(dt) {
  breakCool = breakCool - dt;
  breakStage = 0;
  if (pickOn == 1 && clickHeld == 1 && uiMode == 0 && gameMode != 2) {
    if (pickX != breakX || pickY != breakY || pickZ != breakZ) { breakX = pickX; breakY = pickY; breakZ = pickZ; breakT = 0; }
    swingT = Math.max(swingT, 0.25);
    if (breakCool <= 0) {
      let bt = breakTime(pickB);
      if (gameMode == 1) { bt = 0; if (ITTK[INVI[hotSel] + 1] == 3) { bt = 99999; } }
      breakT = breakT + dt;
      if (bt > 0) { breakStage = Math.min(9, Math.floor(breakT / bt * 10)); }
      if (breakT >= bt) {
        breakBlock(pickX, pickY, pickZ, 1);
        breakT = 0; breakX = -1;
        breakCool = 0.25;
        if (bt > 0.05) { breakCool = 0.05; }
        if (gameMode == 1) { breakCool = 0.22; }
      } else { if (mod(Math.floor(breakT * 4), 2) == 0) { if (frac(breakT * 4) < dt * 4) { sndPlay(1); } } }
    }
  } else { breakT = 0; breakX = -1; }
}
// take a block away (by the player when byP 1: drops and wears the tool)
function breakBlock(x, y, z, byP) {
  let b = blockAt(x, y, z);
  if (netSrv > 0) { if (byP == 1) { plugRun('break', ITKEY[b + 1], netNick); } }
  if (byP == 1) {
    let bt0 = breakTime(b);
    sndPlay(2);
    if (mod(gameMode, 2) == 0) {
      exhaust = exhaust + 0.005;
      if (harvest == 1) { if (grTileDrops == 1) { blockDrops(b, x, y, z); } }
      let id = INVI[hotSel];
      if (ITTK[id + 1] >= 0) { if (BHARD[b + 1] > 0) { wearHeld(1); } }
    }
  }
  if (BUSE[b + 1] == U_SHELL) { shellBoxBroken(x, y, z, b); }
  setBlock(x, y, z, 0);
  partnerGone(x, y, z, b, byP);
  if (b == 57) { crystalBreak(x, y, z); }
  if (b == 33) { if (mod(gameMode, 2) == 0) { if (blockAt(x, y - 1, z) != 0) { setBlock(x, y, z, 7); } } }
  chestOrFurnaceGone(x, y, z, b);
}
function blockDrops(b, x, y, z) {
  let d = BDROP[b + 1], n = BDROPN[b + 1], held = INVI[hotSel];
  if (b == 9) { if (rand(1, 10) == 1) { d = 118; } }
  if (BLEAF[b + 1] == 1) {
    d = 0;
    if (ITTK[held + 1] == 5) { d = b; n = 1; }
    else {
      if (rand(1, 20) == 1) { d = BSAP[b + 1]; n = 1; }
      if (rand(1, 40) == 1) { d = 100; n = rand(1, 2); }
      if (b == 14 || b == I_ebonyLeaves) { if (rand(1, 40) == 1) { d = 105; n = 1; } }
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
  if (BXP[b + 1] > 0) { if (d != b) { xpAdd(rand(0, BXP[b + 1])); } }
  if (d > 0) { if (n > 0) { dropItem(d, n, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
}

// ---------------------------------------------------------------- changing the world
let lbX0 = 9999, lbX1 = -1, lbZ0 = 9999, lbZ1 = -1, dirtyN = 0;
let DIRTY = [], SDIRTY = [];
function setBlock(x, y, z, b) {
  if (y >= 0 && y < WY && cOK(x, z) == 1) {
    let old = W[wi(x, y, z)];
    logOn = 1; wput(x, y, z, b); logOn = 0;
    if (old == 34) { if (b != 34) { veilN = 0; veilBreak(x + 1, y, z); veilBreak(x - 1, y, z); veilBreak(x, y + 1, z); veilBreak(x, y - 1, z); veilBreak(x, y, z + 1); veilBreak(x, y, z - 1); } }
    markDirty(x, y, z);
    lbX0 = Math.min(lbX0, x - 14); lbX1 = Math.max(lbX1, x + 14); lbZ0 = Math.min(lbZ0, z - 14); lbZ1 = Math.max(lbZ1, z + 14);
    if (b == 0) { blockGone(x, y, z); }
    // a block that cannot stand where it is now
    let up = blockAt(x, y + 1, z);
    if (b == 0 || BSOL[b + 1] == 0) {
      if (y + 1 < WY) {
        // (a spark part hung on a wall is not stood on)
        let hangs = 1; if (BATT[up + 1] >= 0) { if (BATT[up + 1] != 2) { hangs = 0; } }
        if (hangs == 1) { if (BSHP[up + 1] == 1 || BSHP[up + 1] == 2 || up == 19 || (BNEED[up + 1] > 0 && BNEED[up + 1] != N_ANY)) {
          if (BPLC[up + 1] != P_DOOR || BSHP[b + 1] == 0) { if (mod(gameMode, 2) == 0) { blockDrops(up, x, y + 1, z); } setBlock(x, y + 1, z, 0); }
        } }
        if (BFALL[up + 1] == 1) { fallBlock(x, y + 1, z); }
      }
    }
    if (BFALL[b + 1] == 1) { fallBlock(x, y, z); }
    // concrete powder by water sets
    if (BWET[b + 1] > 0) { if (BFALL[b + 1] == 1) { if (waterNear(x, y, z) == 1) { logOn = 1; wput(x, y, z, BWET[b + 1]); logOn = 0; } } }
    if (b == 7) { wetAround(x, y, z); }
    // spark power: the cells round look again (two steps out when a part came or went)
    if (BRS[old + 1] > 0 || BRS[b + 1] > 0) { rsNotify(x, y, z, 3); } else { rsNotify(x, y, z, 2); }
  }
}
function waterNear(x, y, z) {
  let r = 0;
  if (blockAt(x + 1, y, z) == 7 || blockAt(x - 1, y, z) == 7 || blockAt(x, y + 1, z) == 7 || blockAt(x, y, z + 1) == 7 || blockAt(x, y, z - 1) == 7) { r = 1; }
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
  if (lbX1 >= 0) { relight(lbX0, lbX1, lbZ0, lbZ1); lbX0 = 9999; lbX1 = -1; lbZ0 = 9999; lbZ1 = -1; }
  let i = 1;
  while (i <= dirtyN) { if (SOK[DIRTY[i]] == 1) { meshSection(DIRTY[i]); } SDIRTY[DIRTY[i]] = 0; i = i + 1; }
  dirtyN = 0;
}
// sand, gravel, concrete powder, anvils drop to the first support
function fallBlock(x, y, z) {
  let b = blockAt(x, y, z), y2 = y;
  while (y2 > 0 && (blockAt(x, y2 - 1, z) == 0 || blockAt(x, y2 - 1, z) == 7 || BSHP[blockAt(x, y2 - 1, z) + 1] == 1)) { y2 = y2 - 1; }
  if (y2 < y) {
    logOn = 1; wput(x, y, z, 0); wput(x, y2, z, b); logOn = 0;
    markDirty(x, y, z); markDirty(x, y2, z);
    if (BWET[b + 1] > 0) { if (waterNear(x, y2, z) == 1 || blockAt(x, y2 + 1, z) == 7) { logOn = 1; wput(x, y2, z, BWET[b + 1]); logOn = 0; } }
    let up = blockAt(x, y + 1, z);
    if (BFALL[up + 1] == 1) { fallBlock(x, y + 1, z); }
  }
}
// a hole opened next to water (or lava): it runs in, and down
function blockGone(x, y, z) {
  let lq = 0;
  if (blockAt(x, y + 1, z) == 7) { lq = 7; }
  if (blockAt(x - 1, y, z) == 7 || blockAt(x + 1, y, z) == 7 || blockAt(x, y, z - 1) == 7 || blockAt(x, y, z + 1) == 7) { lq = 7; }
  if (lq == 0) { if (blockAt(x, y + 1, z) == 35 || blockAt(x - 1, y, z) == 35 || blockAt(x + 1, y, z) == 35 || blockAt(x, y, z - 1) == 35 || blockAt(x, y, z + 1) == 35) { lq = 35; } }
  if (lq > 0) { flowN = 0; flowInto(x, y, z, lq, 0); }
}
let flowN = 0;
function flowInto(x, y, z, lq, side) {
  if (flowN < 40) {
    if (y >= 1 && y < WY && cOK(x, z) == 1) {
      let b = W[wi(x, y, z)];
      if (b == 0 || (BSHP[b + 1] == 1 && BWATER[b + 1] == 0) || b == 27 || BSPEC[b + 1] == 10) {
        flowN = flowN + 1;
        logOn = 1; wput(x, y, z, lq); logOn = 0; markDirty(x, y, z);
        lbX0 = Math.min(lbX0, x - 14); lbX1 = Math.max(lbX1, x + 14); lbZ0 = Math.min(lbZ0, z - 14); lbZ1 = Math.max(lbZ1, z + 14);
        if (lq == 7) { wetAround(x, y, z); }
        let below = blockAt(x, y - 1, z);
        if (below == 0 || BSHP[below + 1] == 1) { flowInto(x, y - 1, z, lq, 0); }
        else {
          if (side < 2) {
            if (BSOL[below + 1] > 0) {
              flowInto(x + 1, y, z, lq, side + 1); flowInto(x - 1, y, z, lq, side + 1);
              flowInto(x, y, z + 1, lq, side + 1); flowInto(x, y, z - 1, lq, side + 1);
            }
          }
        }
      } else {
        logOn = 1;
        if (lq == 7) { if (b == 35) { wput(x, y, z, 34); markDirty(x, y, z); } }
        if (lq == 35) { if (b == 7) { wput(x, y, z, 4); markDirty(x, y, z); } }
        logOn = 0;
      }
    }
  }
}

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
  let d = 0, k = 37;
  while (k <= 40) { if (INVI[k] > 0) { d = d + ITDEF[INVI[k] + 1]; } k = k + 1; }
  return d;
}
function armorWear() {
  let k = 37;
  while (k <= 40) {
    if (INVI[k] > 0) {
      INVD[k] = INVD[k] + 1;
      if (INVD[k] >= ITDUR[INVI[k] + 1]) { msgShow(`${ITNAME[INVI[k] + 1]}이(가) 부서졌습니다`, 2); INVI[k] = 0; INVN[k] = 0; INVD[k] = 0; sndPlay(7); }
    }
    k = k + 1;
  }
}
