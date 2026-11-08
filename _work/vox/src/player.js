// ===================================================================== the player
let px = 64, py = 40, pz = 64, pvx = 0, pvy = 0, pvz = 0, yaw = 0, pitch = 0;
let onGround = 0, inWater = 0, inLava = 0, headWater = 0, flying = 0, sneaking = 0, sprinting = 0;
let gameMode = 0, hp = 20, food = 20, sat = 5, exhaust = 0, air = 300, regenT = 0, starveT = 0, hurtT = 0, hurtFlash = 0;
let fallTop = 0, lavaT = 0, cactusT = 0, drownT = 0, dead = 0, deathMsg = '';
let jumpWas = 0, spaceTapT = 0, wTapT = 0, wWas = 0, bob = 0, walkDist = 0;
let pickOn = 0, pickX = 0, pickY = 0, pickZ = 0, pickF = 0, pickB = 0, pickT = 99, mobPick = 0;
let breakT = 0, breakStage = 0, breakX = -1, breakY = -1, breakZ = -1, breakCool = 0, swingT = 0, placeCool = 0, attackCool = 0;

// ---------------------------------------------------------------- bodies (player, mobs)
// box: centre (bmX, bmZ), feet bmY, half width bmW, height bmH; moved by (dx, dy, dz) against
// solid blocks one axis at a time. bmHitX/Y/Z: stopped on that axis; bmGround: landed.
let bmX = 0, bmY = 0, bmZ = 0, bmW = 0.3, bmH = 1.8, bmHitX = 0, bmHitY = 0, bmHitZ = 0, bmGround = 0;
let solidHit = 0;
function solidIn(x0, x1, y0, y1, z0, z1) {
  solidHit = 0;
  let x = x0, y = 0, z = 0, b = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      y = y0;
      while (y <= y1) {
        b = 0;
        if (x < 0 || x >= SZ || z < 0 || z >= SZ) { b = 6; }
        else { if (y >= 0 && y < WY) { b = W[(x * SZ + z) * WY + y + 1]; } else { if (y < 0) { b = 6; } } }
        if (BSOL[b + 1] == 1) { solidHit = 1; }
        y = y + 1;
      }
      z = z + 1;
    }
    x = x + 1;
  }
}
function bodyMove(dx, dy, dz) {
  bmHitX = 0; bmHitY = 0; bmHitZ = 0; bmGround = 0;
  // in steps of under half a block
  let n = Math.ceil(Math.max(Math.abs(dx), Math.max(Math.abs(dy), Math.abs(dz))) / 0.45);
  if (n < 1) { n = 1; }
  let sx = dx / n, sy = dy / n, sz = dz / n, k = 0, e = 0.001;
  while (k < n) {
    // y
    if (sy != 0) {
      let ny = bmY + sy;
      solidIn(Math.floor(bmX - bmW), Math.floor(bmX + bmW - e), Math.floor(ny), Math.floor(ny + bmH - e), Math.floor(bmZ - bmW), Math.floor(bmZ + bmW - e));
      if (solidHit == 1) {
        if (sy < 0) { ny = Math.floor(ny) + 1; bmGround = 1; } else { ny = Math.floor(ny + bmH) - bmH - e; }
        bmHitY = 1; sy = 0;
      }
      bmY = ny;
    }
    if (sx != 0) {
      let nx = bmX + sx;
      solidIn(Math.floor(nx - bmW), Math.floor(nx + bmW - e), Math.floor(bmY), Math.floor(bmY + bmH - e), Math.floor(bmZ - bmW), Math.floor(bmZ + bmW - e));
      if (solidHit == 1) {
        if (sx > 0) { nx = Math.floor(nx + bmW) - bmW - e; } else { nx = Math.floor(nx - bmW) + 1 + bmW + e; }
        bmHitX = 1; sx = 0;
      }
      bmX = nx;
    }
    if (sz != 0) {
      let nz = bmZ + sz;
      solidIn(Math.floor(bmX - bmW), Math.floor(bmX + bmW - e), Math.floor(bmY), Math.floor(bmY + bmH - e), Math.floor(nz - bmW), Math.floor(nz + bmW - e));
      if (solidHit == 1) {
        if (sz > 0) { nz = Math.floor(nz + bmW) - bmW - e; } else { nz = Math.floor(nz - bmW) + 1 + bmW + e; }
        bmHitZ = 1; sz = 0;
      }
      bmZ = nz;
    }
    k = k + 1;
  }
}
// is there ground right under the box (for sneaking at edges, mobs at cliffs)?
function groundUnder(x, y, z, w) {
  solidIn(Math.floor(x - w), Math.floor(x + w - 0.001), Math.floor(y - 0.1), Math.floor(y - 0.1), Math.floor(z - w), Math.floor(z + w - 0.001));
  return solidHit;
}
// what the body is in: water / lava anywhere in it
let inW = 0, inL = 0, inC = 0;
function bodyIn(x, y, z, w, h) {
  inW = 0; inL = 0; inC = 0;
  let x0 = Math.floor(x - w), x1 = Math.floor(x + w), y0 = Math.floor(y + 0.1), y1 = Math.floor(y + h - 0.1), z0 = Math.floor(z - w), z1 = Math.floor(z + w);
  if (x0 < 0) { x0 = 0; } if (z0 < 0) { z0 = 0; } if (x1 > SZ - 1) { x1 = SZ - 1; } if (z1 > SZ - 1) { z1 = SZ - 1; }
  if (y0 < 0) { y0 = 0; } if (y1 > WY - 1) { y1 = WY - 1; }
  let a = x0, c = 0, k = 0, i = 0, yy = 0;
  while (a <= x1) {
    c = z0;
    while (c <= z1) {
      i = (a * SZ + c) * WY + y0 + 1; yy = y0;
      while (yy <= y1) {
        k = W[i];
        if (k == 7) { inW = 1; } if (k == 35) { inL = 1; }
        yy = yy + 1; i = i + 1;
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
      while (c <= Math.floor(z + w + 0.05)) { if (a >= 0 && a < SZ && c >= 0 && c < SZ) { if (W[(a * SZ + c) * WY + y0 + 1] == 19) { inC = 1; } } c = c + 1; }
      a = a + 1;
    }
  }
}

// ---------------------------------------------------------------- moving
function playerMove(dt) {
  let fw = 0, st = 0;
  if (key(87)) { fw = fw + 1; } if (key(83)) { fw = fw - 1; }
  if (key(68)) { st = st + 1; } if (key(65)) { st = st - 1; }
  if (uiMode != 0) { fw = 0; st = 0; }
  // sprint: W twice quickly, or R held
  wTapT = wTapT + dt;
  if (key(87)) { if (wWas == 0) { if (wTapT < 0.3) { sprinting = 1; } wTapT = 0; } wWas = 1; } else { wWas = 0; }
  if (key(82)) { if (fw > 0) { sprinting = 1; } }
  if (fw <= 0) { sprinting = 0; }
  if (gameMode == 0) { if (food <= 6) { sprinting = 0; } }
  sneaking = 0;
  if (key(16)) { if (uiMode == 0) { sneaking = 1; sprinting = 0; } }
  bodyIn(px, py, pz, 0.3, 1.8);
  inWater = inW; inLava = inL;
  let sp = 4.3;
  if (sprinting == 1) { sp = 5.6; }
  if (sneaking == 1) { if (flying == 0) { sp = 1.3; } }
  if (flying == 1) { sp = 10.9; if (sprinting == 1) { sp = 21.6; } }
  if (inWater == 1 || inLava == 1) { if (flying == 0) { sp = sp * 0.45; } }
  let l = Math.sqrt(fw * fw + st * st);
  let wx = 0, wz = 0;
  if (l > 0) {
    let sy = sind(yaw), cy = cosd(yaw);
    wx = (fw * sy + st * cy) / l * sp; wz = (fw * cy - st * sy) / l * sp;
  }
  // a little slide: speed follows the wish quickly on the ground, slowly in the air
  let acc = 14;
  if (onGround == 0) { acc = 3.5; }
  if (flying == 1) { acc = 8; }
  if (inWater == 1) { acc = 6; }
  let a = Math.min(1, acc * dt);
  pvx = pvx + (wx - pvx) * a; pvz = pvz + (wz - pvz) * a;
  // creative flying: Space twice
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
      pvy = pvy - 32 * dt;
      if (pvy < -60) { pvy = -60; }
      if (spc) { if (onGround == 1) { pvy = 8.9; exhaust = exhaust + 0.05; if (sprinting == 1) { exhaust = exhaust + 0.15; pvx = pvx * 1.25; pvz = pvz * 1.25; } } }
    }
  }
  jumpWas = 0;
  if (spc) { jumpWas = 1; }
  let ox = px, oz = pz;
  bmX = px; bmY = py; bmZ = pz; bmW = 0.3; bmH = 1.8;
  let mx = pvx * dt, mz = pvz * dt;
  // sneaking keeps the feet on the block
  if (sneaking == 1) { if (onGround == 1) { if (flying == 0) {
    if (groundUnder(px + mx, py, pz, 0.3) == 0) { mx = 0; }
    if (groundUnder(px + mx, py, pz + mz, 0.3) == 0) { mz = 0; }
  } } }
  bodyMove(mx, pvy * dt, mz);
  if (bmHitX == 1) { pvx = 0; } if (bmHitZ == 1) { pvz = 0; }
  if (bmHitY == 1) { pvy = 0; }
  let was = onGround;
  onGround = bmGround;
  if (flying == 1) { if (onGround == 1) { if (gameMode == 1) { flying = 0; } } }
  px = bmX; py = bmY; pz = bmZ;
  // falling
  if (onGround == 0) { if (py > fallTop) { fallTop = py; } if (pvy > 0) { fallTop = py; } }
  if (onGround == 1) {
    if (was == 0) {
      let fd = fallTop - py;
      if (fd > 3.4) { if (gameMode == 0) { if (inWater == 0) { hurt(Math.floor(fd - 3), '높은 곳에서 떨어졌습니다'); } } }
    }
    fallTop = py;
  }
  if (flying == 1) { fallTop = py; }
  // world edges
  if (px < 0.4) { px = 0.4; } if (pz < 0.4) { pz = 0.4; } if (px > SZ - 0.4) { px = SZ - 0.4; } if (pz > SZ - 0.4) { pz = SZ - 0.4; }
  if (py < -20) { hurt(4, '세계 밖으로 떨어졌습니다'); }
  // walking: the view bobs, hunger goes
  let moved = Math.sqrt((px - ox) * (px - ox) + (pz - oz) * (pz - oz));
  if (onGround == 1) { walkDist = walkDist + moved; bob = bob + moved * 2.2; }
  if (sprinting == 1) { exhaust = exhaust + moved * 0.1; } else { exhaust = exhaust + moved * 0.01; }
  // the eye: under water?
  headWater = 0;
  let hb = blockAt(Math.floor(px), Math.floor(py + 1.62), Math.floor(pz));
  if (hb == 7) { headWater = 1; }
}

// ---------------------------------------------------------------- health and hunger
function hurt(n, why) {
  if (gameMode == 0) { if (dead == 0) { if (hurtT <= 0) {
    hp = hp - n; hurtT = 0.5; hurtFlash = 0.35; exhaust = exhaust + 0.1;
    sndPlay(3);
    if (hp <= 0) { hp = 0; die(why); }
  } } }
}
function survival(dt) {
  hurtT = hurtT - dt; hurtFlash = hurtFlash - dt;
  if (gameMode == 1) { hp = 20; food = 20; air = 300; }
  else {
    while (exhaust >= 4) { exhaust = exhaust - 4; if (sat > 0) { sat = Math.max(0, sat - 1); } else { if (food > 0) { food = food - 1; } } }
    regenT = regenT + dt;
    if (regenT >= 4) {
      regenT = 0;
      if (food >= 18) { if (hp < 20) { hp = hp + 1; exhaust = exhaust + 6; } }
      if (food == 0) { if (hp > 1) { hurtT = 0; hurt(1, '굶주렸습니다'); } }
    }
    // breath
    if (headWater == 1) {
      air = air - 20 * dt;
      if (air <= 0) { air = 0; drownT = drownT + dt; if (drownT >= 1) { drownT = 0; hurtT = 0; hurt(2, '물에 빠졌습니다'); } }
    } else { air = Math.min(300, air + 300 * dt); }
    if (inLava == 1) { lavaT = lavaT + dt; if (lavaT >= 0.5) { lavaT = 0; hurtT = 0; hurt(4, '용암에 빠졌습니다'); } }
    bodyIn(px, py, pz, 0.3, 1.8);
    if (inC == 1) { cactusT = cactusT + dt; if (cactusT >= 0.5) { cactusT = 0; hurt(1, '선인장에 찔렸습니다'); } }
  }
}
function die(why) {
  dead = 1; deathMsg = why; uiClose(); uiMode = 7;
  // everything carried falls where the player died
  let i = 1;
  while (i <= 36) {
    if (INVI[i] > 0) { dropItem(INVI[i], INVN[i], INVD[i], px, py + 1, pz, 1); INVI[i] = 0; INVN[i] = 0; INVD[i] = 0; }
    i = i + 1;
  }
  mouseFree();
}
function respawn() {
  dead = 0; hp = 20; food = 20; sat = 5; air = 300; exhaust = 0;
  px = spawnX; py = spawnY; pz = spawnZ; pvx = 0; pvy = 0; pvz = 0; fallTop = py;
  // the spot may have been built over: up to the first free space
  let k = 0;
  bmW = 0.3; bmH = 1.8;
  solidIn(Math.floor(px - 0.3), Math.floor(px + 0.3), Math.floor(py), Math.floor(py + 1.79), Math.floor(pz - 0.3), Math.floor(pz + 0.3));
  while (solidHit == 1 && k < WY) {
    py = py + 1; k = k + 1;
    solidIn(Math.floor(px - 0.3), Math.floor(px + 0.3), Math.floor(py), Math.floor(py + 1.79), Math.floor(pz - 0.3), Math.floor(pz + 0.3));
  }
  uiMode = 0;
}
// eating (F with food in hand)
function eat(id) {
  let f = ITFOOD[id + 1];
  if (food < 20 || gameMode == 1) {
    food = Math.min(20, food + f); sat = Math.min(food, sat + f * 0.6);
    if (id == 112) { if (rand(1, 10) <= 8) { exhaust = exhaust + 12; msgShow('배가 아픕니다...', 2); } }
    takeHeld(1);
    sndPlay(5);
    swingT = 0.3;
  }
}

// ---------------------------------------------------------------- what the eye looks at
// blocks: a grid walk from the eye (plants and torches count, liquids do not)
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
    }
    k = k + 1;
  }
  if (found == 1) {
    if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 0 && y < WY) { pickOn = 1; pickX = x; pickY = y; pickZ = z; pickF = face; pickB = b; pickT = t; }
  }
  // a mob nearer than the block?
  mobPick = mobRay(ex, ey, ez, dx, dy, dz, Math.min(reach - 1.5, pickT));
  if (mobPick > 0) { pickOn = 0; }
}
// the cell next to the picked block on the side that was hit
let nbX = 0, nbY = 0, nbZ = 0;
function pickNeighbour() {
  nbX = pickX; nbY = pickY; nbZ = pickZ;
  if (pickF == 0) { nbX = nbX - 1; } if (pickF == 1) { nbX = nbX + 1; } if (pickF == 2) { nbY = nbY - 1; }
  if (pickF == 3) { nbY = nbY + 1; } if (pickF == 4) { nbZ = nbZ - 1; } if (pickF == 5) { nbZ = nbZ + 1; }
}

// ---------------------------------------------------------------- breaking
// seconds to break block b with what is in hand; harvest: it drops
let harvest = 0;
function breakTime(b) {
  let h = BHARD[b + 1], id = INVI[hotSel], kind = 0 - 1, tier = 0 - 1, sp = 1;
  if (id >= TOOL0) { kind = ITTK[id + 1]; tier = ITTT[id + 1]; }
  let tool = BTOOL[b + 1];
  // a tool kind 0 pickaxe, 1 axe, 2 shovel == block tool 1, 2, 3
  if (tool > 0) { if (kind + 1 == tool) { sp = TSPEED[tier + 1]; } }
  if (kind == 3) { if (BLEAF[b + 1] == 1) { sp = 1.5; } if (b == 19) { sp = 1.5; } }
  harvest = 1;
  if (BTIER[b + 1] >= 0) { harvest = 0; if (kind == 0) { if (tier >= BTIER[b + 1]) { harvest = 1; } } }
  let t = h * 1.5 / sp;
  if (harvest == 0) { t = h * 5 / sp; }
  if (h < 0) { t = 99999; }
  return t;
}
function breaking(dt) {
  breakCool = breakCool - dt;
  breakStage = 0;
  if (pickOn == 1 && clickHeld == 1 && uiMode == 0) {
    if (pickX != breakX || pickY != breakY || pickZ != breakZ) { breakX = pickX; breakY = pickY; breakZ = pickZ; breakT = 0; }
    swingT = Math.max(swingT, 0.25);
    if (breakCool <= 0) {
      let bt = breakTime(pickB);
      if (gameMode == 1) { bt = 0; }
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
  if (byP == 1) {
    let bt0 = breakTime(b);
    sndPlay(2);
    if (gameMode == 0) {
      exhaust = exhaust + 0.005;
      if (harvest == 1) { blockDrops(b, x, y, z); }
      let id = INVI[hotSel];
      if (id >= TOOL0) { if (BHARD[b + 1] > 0) { wearHeld(1); } }
    }
  }
  setBlock(x, y, z, 0);
  // ice leaves water
  if (b == 33) { if (gameMode == 0) { setBlock(x, y, z, 7); } }
  chestOrFurnaceGone(x, y, z, b);
}
function blockDrops(b, x, y, z) {
  let d = BDROP[b + 1], n = BDROPN[b + 1];
  if (b == 9) { if (rand(1, 10) == 1) { d = 118; } }
  if (BLEAF[b + 1] == 1) {
    d = 0;
    if (rand(1, 20) == 1) { d = 31; n = 1; }
    if (b == 14) { if (rand(1, 40) == 1) { d = 105; n = 1; } }
  }
  if (b == 40) { n = rand(4, 8); }
  if (b == 46) { n = rand(0, 2); }
  if (d > 0) { if (n > 0) { dropItem(d, n, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
}

// ---------------------------------------------------------------- changing the world
// every change goes through here: the sections to mesh again and the light box are noted and
// done once at the end of the frame (worldFlush)
let lbX0 = 9999, lbX1 = -1, lbZ0 = 9999, lbZ1 = -1, dirtyN = 0;
let DIRTY = [], SDIRTY = [];
function setBlock(x, y, z, b) {
  if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 0 && y < WY) {
    W[(x * SZ + z) * WY + y + 1] = b;
    markDirty(x, y, z);
    lbX0 = Math.min(lbX0, x - 14); lbX1 = Math.max(lbX1, x + 14); lbZ0 = Math.min(lbZ0, z - 14); lbZ1 = Math.max(lbZ1, z + 14);
    if (b == 0) { blockGone(x, y, z); }
    // a block that cannot stand where it is now
    let up = blockAt(x, y + 1, z);
    if (b == 0 || BSOL[b + 1] == 0) {
      if (BSHP[up + 1] == 1 || BSHP[up + 1] == 2 || up == 19) { if (y + 1 < WY) { if (gameMode == 0) { blockDrops(up, x, y + 1, z); } setBlock(x, y + 1, z, 0); } }
      if (up == 8 || up == 9) { fallBlock(x, y + 1, z); }
    }
    if (b == 8 || b == 9) { fallBlock(x, y, z); }
  }
}
function markDirty(x, y, z) {
  markSec(secOf(x, y, z));
  let lx = mod(x, 8), ly = mod(y, 8), lz = mod(z, 8);
  if (lx == 0) { if (x > 0) { markSec(secOf(x - 1, y, z)); } }
  if (lx == 7) { if (x < SZ - 1) { markSec(secOf(x + 1, y, z)); } }
  if (ly == 0) { if (y > 0) { markSec(secOf(x, y - 1, z)); } }
  if (ly == 7) { if (y < WY - 1) { markSec(secOf(x, y + 1, z)); } }
  if (lz == 0) { if (z > 0) { markSec(secOf(x, y, z - 1)); } }
  if (lz == 7) { if (z < SZ - 1) { markSec(secOf(x, y, z + 1)); } }
}
function markSec(s) {
  if (SDIRTY[s] != 1) { SDIRTY[s] = 1; dirtyN = dirtyN + 1; if (dirtyN > DIRTY.length) { DIRTY.push(s); } else { DIRTY[dirtyN] = s; } }
}
function worldFlush() {
  if (lbX1 >= 0) { relight(lbX0, lbX1, lbZ0, lbZ1); lbX0 = 9999; lbX1 = -1; lbZ0 = 9999; lbZ1 = -1; }
  let i = 1;
  while (i <= dirtyN) { meshSection(DIRTY[i]); SDIRTY[DIRTY[i]] = 0; i = i + 1; }
  dirtyN = 0;
}
// sand and gravel drop to the first support
function fallBlock(x, y, z) {
  let b = blockAt(x, y, z), y2 = y;
  while (y2 > 0 && (blockAt(x, y2 - 1, z) == 0 || blockAt(x, y2 - 1, z) == 7 || BSHP[blockAt(x, y2 - 1, z) + 1] == 1)) { y2 = y2 - 1; }
  if (y2 < y) {
    W[(x * SZ + z) * WY + y + 1] = 0; markDirty(x, y, z);
    W[(x * SZ + z) * WY + y2 + 1] = b; markDirty(x, y2, z);
    // what stood on it falls after it
    let up = blockAt(x, y + 1, z);
    if (up == 8 || up == 9) { fallBlock(x, y + 1, z); }
  }
}
// a hole opened next to water (or lava): it runs in, and down
function blockGone(x, y, z) {
  let lq = 0;
  if (blockAt(x, y + 1, z) == 7) { lq = 7; }
  if (blockAt(x - 1, y, z) == 7 || blockAt(x + 1, y, z) == 7 || blockAt(x, y, z - 1) == 7 || blockAt(x, y, z + 1) == 7) { lq = 7; }
  if (lq == 0) { if (blockAt(x, y + 1, z) == 35 || blockAt(x - 1, y, z) == 35 || blockAt(x + 1, y, z) == 35 || blockAt(x, y, z - 1) == 35 || blockAt(x, y, z + 1) == 35) { lq = 35; } }
  if (lq > 0) {
    flowN = 0;
    flowInto(x, y, z, lq, 0);
  }
}
let flowN = 0;
function flowInto(x, y, z, lq, side) {
  if (flowN < 40) {
    if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 1 && y < WY) {
      let b = W[(x * SZ + z) * WY + y + 1];
      if (b == 0 || BSHP[b + 1] == 1 || b == 27) {
        flowN = flowN + 1;
        W[(x * SZ + z) * WY + y + 1] = lq; markDirty(x, y, z);
        lbX0 = Math.min(lbX0, x - 14); lbX1 = Math.max(lbX1, x + 14); lbZ0 = Math.min(lbZ0, z - 14); lbZ1 = Math.max(lbZ1, z + 14);
        let below = blockAt(x, y - 1, z);
        if (below == 0 || BSHP[below + 1] == 1) { flowInto(x, y - 1, z, lq, 0); }
        else {
          // spread a little on the ground (side counts how far it has gone)
          if (side < 2) {
            if (BSOL[below + 1] == 1) {
              flowInto(x + 1, y, z, lq, side + 1); flowInto(x - 1, y, z, lq, side + 1);
              flowInto(x, y, z + 1, lq, side + 1); flowInto(x, y, z - 1, lq, side + 1);
            }
          }
        }
      } else {
        // water meets lava
        if (lq == 7) { if (b == 35) { W[(x * SZ + z) * WY + y + 1] = 34; markDirty(x, y, z); } }
        if (lq == 35) { if (b == 7) { W[(x * SZ + z) * WY + y + 1] = 4; markDirty(x, y, z); } }
      }
    }
  }
}

// ---------------------------------------------------------------- placing and using (F)
function useKey() {
  if (placeCool <= 0) {
    let id = INVI[hotSel];
    let used = 0;
    // a block that opens something
    if (pickOn == 1) {
      if (sneaking == 0) {
        if (pickB == 17) { uiOpen(2); used = 1; }
        if (pickB == 18) { furnaceOpen(pickX, pickY, pickZ); used = 1; }
        if (pickB == 37) { chestOpen(pickX, pickY, pickZ); used = 1; }
      }
    }
    if (used == 0) {
      if (id > 0) {
        if (ITFOOD[id + 1] > 0) { eat(id); used = 1; placeCool = 0.4; }
      }
    }
    if (used == 0) { if (id > 0) { if (id < 100) { if (pickOn == 1) { placeBlock(id); } } } }
  }
}
function placeBlock(b) {
  pickNeighbour();
  let x = nbX, y = nbY, z = nbZ;
  // a plant, water or air there can be replaced; a click on a plant replaces the plant itself
  if (BSHP[pickB + 1] == 1) { if (pickB != 31) { x = pickX; y = pickY; z = pickZ; } }
  if (x >= 0 && x < SZ && z >= 0 && z < SZ && y >= 0 && y < WY) {
    let o = W[(x * SZ + z) * WY + y + 1];
    let ok = 0;
    if (o == 0 || o == 7 || o == 35 || BSHP[o + 1] == 1) { ok = 1; }
    // not into the player or a mob
    if (BSOL[b + 1] == 1) {
      if (x + 1 > px - 0.3 && x < px + 0.3 && z + 1 > pz - 0.3 && z < pz + 0.3 && y + 1 > py && y < py + 1.8) { ok = 0; }
      if (mobInCell(x, y, z) == 1) { ok = 0; }
    }
    // plants need ground, torches something solid under or beside them
    let under = blockAt(x, y - 1, z);
    if (BSHP[b + 1] == 1) { if (under != 2 && under != 3 && under != 20) { ok = 0; } if (b == 46) { if (under == 8) { ok = 1; } } }
    if (b == 19) { if (under != 8 && under != 19) { ok = 0; } }
    if (b == 27) { if (BSOL[under + 1] == 0) { if (pickF == 2 || BSOL[pickB + 1] == 0) { ok = 0; } } }
    if (ok == 1) {
      setBlock(x, y, z, b);
      sndPlay(2);
      swingT = 0.3;
      placeCool = 0.2;
      if (gameMode == 0) { takeHeld(1); }
      if (b == 18) { furnaceAt(x, y, z); }
      if (b == 37) { chestAt(x, y, z); }
    }
  }
}

// a sapling now and then grows into a tree (the ones near the player)
let growT = 0;
function randomTicks(dt) {
  growT = growT + dt;
  if (growT > 0.5) {
    growT = 0;
    let k = 0;
    while (k < 30) {
      let x = Math.floor(px) + rand(-24, 24), z = Math.floor(pz) + rand(-24, 24), y = rand(1, WY - 12);
      if (x >= 2 && x < SZ - 2 && z >= 2 && z < SZ - 2) {
        let b = W[(x * SZ + z) * WY + y + 1];
        if (b == 31) {
          if (SKL[(x * SZ + z) * WY + y + 1] >= 9 || BKL[(x * SZ + z) * WY + y + 1] >= 9) {
            if (rand(1, 6) == 1) {
              let kind = 0;
              if (BIOM[x * SZ + z + 1] == 5 || BIOM[x * SZ + z + 1] == 6) { kind = 2; }
              W[(x * SZ + z) * WY + y + 1] = 0;
              growTree(x, y - 1, z, kind);
              let a = x - 3;
              while (a <= x + 3) { let c = z - 3; while (c <= z + 3) { let yy = y - 1; while (yy <= y + 10) { if (yy < WY) { markDirty(a, yy, c); } yy = yy + 4; } c = c + 3; } a = a + 3; }
              markDirty(x, y + 9, z);
              lbX0 = Math.min(lbX0, x - 16); lbX1 = Math.max(lbX1, x + 16); lbZ0 = Math.min(lbZ0, z - 16); lbZ1 = Math.max(lbZ1, z + 16);
            }
          }
        }
        // grass spreads to lit dirt next to it, and dies under a block
        if (b == 3) {
          if (W[(x * SZ + z) * WY + y + 2] == 0) {
            if (SKL[(x * SZ + z) * WY + y + 2] >= 9) {
              if (blockAt(x + 1, y, z) == 2 || blockAt(x - 1, y, z) == 2 || blockAt(x, y, z + 1) == 2 || blockAt(x, y, z - 1) == 2) { setBlock(x, y, z, 2); }
            }
          }
        }
        if (b == 2) { if (BHC[W[(x * SZ + z) * WY + y + 2] + 1] == 1) { setBlock(x, y, z, 3); } }
      }
      k = k + 1;
    }
  }
}
