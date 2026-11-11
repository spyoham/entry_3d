// v1.4: effects, game rules and commands; the smithing table; the shell box; the void eye and the
// old ruins with their gate; the far gate, the void cities and their ships, the glider; boats; the
// wanderer and the shell-bug.

// ---------------------------------------------------------------- effects
// 1 speed, 2 slowness, 3 haste, 4 jump boost, 5 regeneration, 6 resistance, 7 fire resistance,
// 8 night vision, 9 saturation, 10 levitation, 11 slow falling, 12 water breathing
let EFT = [], EFL = [];
let EFK = ['speed', 'slowness', 'haste', 'jump_boost', 'regeneration', 'resistance', 'fire_resistance', 'night_vision', 'saturation', 'levitation', 'slow_falling', 'water_breathing'];
let EFKO = ['신속', '구속', '성급함', '점프 강화', '재생', '저항', '화염 저항', '야간 투시', '포화', '공중 부양', '느린 낙하', '수중 호흡'];
let nightVis = 0, efRegenT = 0;
function effectsInit() {
  EFT = []; EFL = [];
  let k = 0;
  while (k < 12) { EFT.push(0); EFL.push(0); k = k + 1; }
  nightVis = 0;
}
function effectAdd(k, sec, lvl) { EFT[k] = sec; EFL[k] = lvl; }
// the level of effect k now (0: none)
function fx(k) {
  let r = 0;
  if (EFT[k] > 0) { r = EFL[k]; }
  return r;
}
function effectsStep(dt) {
  let k = 1;
  while (k <= 12) { if (EFT[k] > 0) { EFT[k] = EFT[k] - dt; if (EFT[k] <= 0) { EFT[k] = 0; } } k = k + 1; }
  if (fx(5) > 0) {
    efRegenT = efRegenT + dt;
    if (efRegenT >= 2.5 / fx(5)) { efRegenT = 0; if (hp < 20) { hp = hp + 1; } }
  }
  if (fx(9) > 0) { food = Math.min(20, food + fx(9)); sat = Math.min(food, sat + 2 * fx(9)); }
  let nv = 0;
  if (fx(8) > 0) { nv = 1; }
  if (nv != nightVis) { nightVis = nv; ltkDark = 0 - 99; }
  if (fx(12) > 0) { air = 300; }
}
function romanOf(n) {
  let r = `${n}`;
  if (n == 1) { r = 'I'; } if (n == 2) { r = 'II'; } if (n == 3) { r = 'III'; } if (n == 4) { r = 'IV'; } if (n == 5) { r = 'V'; }
  return r;
}
// the effects on the screen (top right)
function effectsHud() {
  let k = 1, y = 128, j = 96;
  while (k <= 12) {
    if (EFT[k] > 0) {
      if (j <= 101) {
        let s = Math.floor(EFT[k]);
        let mm = idiv(s, 60), ss = mod(s, 60), sp = '';
        if (ss < 10) { sp = '0'; }
        tx(j, `${EFKO[k]} ${romanOf(EFL[k])}  ${mm}:${sp}${ss}`, 236, y, 7, '#f0f0ff', 2);
        j = j + 1; y = y - 11;
      }
    }
    k = k + 1;
  }
  while (j <= 101) { txOff(j); j = j + 1; }
}

// ---------------------------------------------------------------- the smithing table
// slots 54 the diamond piece, 55 the abyss ingot, 56 what comes out
let SMI1 = 0, SMN1 = 0, SMD1 = 0, SMI2 = 0, SMN2 = 0, smOut = 0;
function smithMatch() {
  smOut = 0;
  if (SMI2 == 128) { if (SMN2 > 0) { let k = 1; while (k <= SMA.length) { if (SMA[k] == SMI1) { smOut = SMB[k]; } k = k + 1; } } }
}
function smithTake() {
  SMI1 = 0; SMN1 = 0; SMD1 = 0;
  SMN2 = SMN2 - 1; if (SMN2 <= 0) { SMI2 = 0; SMN2 = 0; }
  smithMatch();
}
function smithBack() {
  if (SMI1 > 0) { addItem(SMI1, SMN1, SMD1); if (addLeft > 0) { dropItem(SMI1, addLeft, SMD1, px, py + 1, pz, 1); } }
  if (SMI2 > 0) { addItem(SMI2, SMN2, 0); if (addLeft > 0) { dropItem(SMI2, addLeft, 0, px, py + 1, pz, 1); } }
  SMI1 = 0; SMN1 = 0; SMD1 = 0; SMI2 = 0; SMN2 = 0; smOut = 0;
}

// ---------------------------------------------------------------- the shell box: a chest that keeps what is in it when broken
// (its chest number rides on the item as its wear; 2 in CHON: carried)
function shellBoxPlaced(x, y, z, du) {
  if (du > 0) { if (du <= NCHEST) { if (CHON[du] == 2) { CHON[du] = 1; CHX[du] = x; CHY[du] = y + dim * 1000; CHZ[du] = z; } } }
}
function shellBoxBroken(x, y, z, b) {
  chestFind(x, y, z);
  let c = cFound;
  if (c > 0) { CHON[c] = 2; }
  if (mod(gameMode, 2) == 0) { dropItem(b, 1, c, x + 0.5, y + 0.3, z + 0.5, 0); }
}
function shellBoxOpen(x, y, z) {
  chestAt(x, y, z);
  if (cFound > 0) { curChest = cFound; uiOpen(4); } else { msgShow('상자가 너무 많습니다', 2); }
}

// ---------------------------------------------------------------- the old ruins (three, round the world's middle)
let ruX = 0, ruZ = 0;
let RUY = 16;
function ruinAt(k) {
  let a = mod(seed * 37, 360) + k * 120;
  let r = 560 + mod(seed * 13 + k * 71, 160);
  ruX = Math.round(cosd(a) * r); ruZ = Math.round(sind(a) * r);
}
// what the ruin holds at (dx, dy, dz) from its middle (-1: nothing of it)
function ruinCell(dx, dy, dz, k) {
  let v = 0 - 1, ax = Math.abs(dx), az = Math.abs(dz), h = mod(dx * 7 + dy * 13 + dz * 31 + k * 5, 11);
  let br = 60;
  if (h == 0) { br = 36; } if (h == 1) { br = 4; }
  // the gate room
  if (ax <= 9 && az <= 9 && dy >= 0 && dy <= 7) {
    v = 0;
    if (ax == 9 || az == 9 || dy == 0 || dy == 7) { v = br; }
    // doors to the halls
    if (ax == 9 && az <= 1 && dy >= 1 && dy <= 3) { v = 0; }
    if (az == 9 && ax <= 1 && dy >= 1 && dy <= 3) { v = 0; }
    // lights in the walls
    if (dy == 4) { if (ax == 9 && az == 5) { v = 50; } if (az == 9 && ax == 5) { v = 50; } }
    // the gate frame (twelve) round a 3 x 3 hole, on the floor
    if (dy == 1) {
      if (ax <= 1 && az == 2 || az <= 1 && ax == 2) {
        v = 61;
        if (mod(dx * 3 + dz * 5 + k * 7 + seed, 10) == 0) { v = 62; }
      }
    }
    // a chest in a corner
    if (dy == 1) { if (dx == 7 && dz == 7) { v = 37; } }
  } else {
    // four halls out of it
    if (dy >= 0 && dy <= 4) {
      if (az <= 2 && ax > 9 && ax <= 32) { v = 0; if (az == 2 || dy == 0 || dy == 4 || ax == 32) { v = br; } }
      if (ax <= 2 && az > 9 && az <= 32) { v = 0; if (ax == 2 || dy == 0 || dy == 4 || az == 32) { v = br; } }
    }
  }
  return v;
}
function featuresRuins() {
  let k = 0;
  while (k < 3) {
    ruinAt(k);
    if (ruX + 32 >= gx0 && ruX - 32 <= gx1 && ruZ + 32 >= gz0 && ruZ - 32 <= gz1) {
      let x = Math.max(gx0, ruX - 32);
      while (x <= Math.min(gx1, ruX + 32)) {
        let z = Math.max(gz0, ruZ - 32);
        while (z <= Math.min(gz1, ruZ + 32)) {
          let y = 0;
          while (y <= 7) {
            let v = ruinCell(x - ruX, y, z - ruZ, k);
            if (v >= 0) { W[wi(x, RUY + y, z)] = v; }
            y = y + 1;
          }
          z = z + 1;
        }
        x = x + 1;
      }
    }
    k = k + 1;
  }
}
// an eye set in a frame: all twelve, and the gate opens
function frameEye(x, y, z) {
  setBlock(x, y, z, 62);
  sndPlay(6);
  let k = 0;
  while (k < 3) {
    ruinAt(k);
    if (Math.abs(x - ruX) <= 2 && Math.abs(z - ruZ) <= 2) {
      let n = 0, a = 0 - 2;
      while (a <= 2) { let c = 0 - 2; while (c <= 2) { if (blockAt(ruX + a, y, ruZ + c) == 62) { n = n + 1; } c = c + 1; } a = a + 1; }
      if (n >= 12) {
        a = 0 - 1;
        while (a <= 1) { let c = 0 - 1; while (c <= 1) { setBlock(ruX + a, y, ruZ + c, 56); c = c + 1; } a = a + 1; }
        msgShow('관문이 열렸습니다! 들어가면 공허의 섬으로 갑니다', 5); sndPlay(7);
      } else { msgShow(`공허의 눈 ${n} / 12`, 2); }
    }
    k = k + 1;
  }
}
// the eye thrown: it flies toward the nearest ruin (the overworld only)
function eyeThrow() {
  let a = 1, s = 0;
  while (a <= NARR) { if (s == 0) { if (AON[a] == 0) { s = a; } } a = a + 1; }
  if (s > 0) {
    let best = 0, bd = 999999999, k = 0, bx = 0, bz = 0;
    while (k < 3) { ruinAt(k); let d = (ruX - px) * (ruX - px) + (ruZ - pz) * (ruZ - pz); if (d < bd) { bd = d; bx = ruX; bz = ruZ; } k = k + 1; }
    let dx = bx - px, dz = bz - pz, l = Math.sqrt(dx * dx + dz * dz) + 0.01;
    AON[s] = 6; AXX[s] = px; AYY[s] = py + 1.5; AZZ[s] = pz; AAGE[s] = 0; ASTK[s] = 0;
    if (dim == 0) {
      // close: it sinks toward the ruin
      let sp = 9; if (l < 12) { sp = l * 0.6; }
      AVX[s] = dx / l * sp; AVZ[s] = dz / l * sp; AVY[s] = 2.5;
      if (l < 12) { AVY[s] = 0 - 1.5; }
    } else { AVX[s] = 0; AVZ[s] = 0; AVY[s] = 1; }
    takeHeld(1); placeCool = 0.5; sndPlay(1);
  }
}

// ---------------------------------------------------------------- the far gates and the void cities
// a city in chunk (cx, cz)? (on a far island, one chunk in 9 or so)
let ciX = 0, ciZ = 0, ciY = 0, ciH = 0, ciShip = 0;
function cityIn(cx, cz) {
  let r = 0;
  if (Math.abs(cx * 16) > 400 || Math.abs(cz * 16) > 400) {
    let h = mod(cx * 73856093 + cz * 19349663 + seed * 83492791, 1000);
    if (h < 110) {
      ciX = cx * 16 + 6; ciZ = cz * 16 + 8;
      voidIsland(ciX, ciZ);
      if (vTop > 0) { if (vTop - vBot >= 3) { r = 1; ciY = vTop + 1; ciH = 18 + mod(h * 7, 12); ciShip = 0; if (mod(h, 5) < 2) { ciShip = 1; } } }
    }
  }
  return r;
}
// the city: a violet tower with floors, windows and lights, a chest at the top; now and then a
// ship moored beside it with the glider in its hold
function featuresCity(cx, cz) {
  if (cityIn(cx, cz) == 1) {
    let k = 0, a = 0, c = 0, b = 0, top = ciH;
    while (k <= top + 3) {
      a = 0 - 3;
      while (a <= 3) {
        c = 0 - 3;
        while (c <= 3) {
          b = 0 - 1;
          if (k <= top) {
            b = 0;
            if (Math.abs(a) == 3 || Math.abs(c) == 3) { b = 65; if (mod(k, 6) == 3 || mod(k, 6) == 4) { if (a == 0 || c == 0) { b = 0; } } if (Math.abs(a) == 3 && Math.abs(c) == 3) { b = 55; } }
            if (mod(k, 6) == 0) { if (Math.abs(a) < 3 && Math.abs(c) < 3) { b = 65; if (k > 0 && a == 2 && c == 2) { b = 0; } } }
            if (mod(k, 6) == 5) { if (Math.abs(a) == 2 && Math.abs(c) == 2) { b = 50; } }
            if (k == 1 || k == 2) { if (c == 0 - 3 && a == 0) { b = 0; } }
          } else {
            // the crown
            if (Math.abs(a) == 3 || Math.abs(c) == 3) { if (mod(a + c, 2) == 0) { b = 55; } }
          }
          if (b >= 0) { if (ciY + k < WY - 1) { W[wi(ciX + a, ciY + k, ciZ + c)] = b; } }
          c = c + 1;
        }
        a = a + 1;
      }
      k = k + 1;
    }
    // a way up inside: a stair of violet bricks round the walls (one step a block)
    k = 1;
    while (k < top) {
      let s = mod(k, 16), sa = 0, sc = 0;
      if (s < 4) { sa = s - 2; sc = 2; } else { if (s < 8) { sa = 2; sc = 2 - (s - 4); } else { if (s < 12) { sa = 2 - (s - 8); sc = 0 - 2; } else { sa = 0 - 2; sc = (s - 12) - 2; } } }
      W[wi(ciX + sa, ciY + k, ciZ + sc)] = 65;
      // (room to climb)
      if (ciY + k + 1 < WY - 1) { if (mod(k + 1, 6) == 0) { W[wi(ciX + sa, ciY + k + 1, ciZ + sc)] = 0; } }
      if (ciY + k + 2 < WY - 1) { if (mod(k + 2, 6) == 0) { W[wi(ciX + sa, ciY + k + 2, ciZ + sc)] = 0; } }
      k = k + 1;
    }
    if (ciY + top + 1 < WY - 1) { W[wi(ciX, ciY + top + 1, ciZ)] = 37; }
    if (ciShip == 1) {
      // the ship: along z, beside the tower, in the air
      let sy = ciY + Math.floor(top / 2), sx = ciX + 7;
      let L = 0 - 6;
      while (L <= 6) {
        let wdt = 2; if (Math.abs(L) >= 5) { wdt = 1; } if (Math.abs(L) == 6) { wdt = 0; }
        a = 0 - wdt;
        while (a <= wdt) {
          if (sy < WY - 6) {
            W[wi(sx + a, sy, ciZ + L)] = 65;
            if (Math.abs(a) == wdt) { W[wi(sx + a, sy + 1, ciZ + L)] = 65; W[wi(sx + a, sy + 2, ciZ + L)] = 55; }
            else { W[wi(sx + a, sy + 1, ciZ + L)] = 5; }
          }
          a = a + 1;
        }
        L = L + 1;
      }
      // a mast, and the chest with the glider on the deck
      k = 2; while (k <= 7) { if (sy + k < WY - 1) { W[wi(sx, sy + k, ciZ + 2)] = 54; } k = k + 1; }
      W[wi(sx, sy + 2, ciZ - 2)] = 37;
      W[wi(sx - 1, sy + 2, ciZ - 3)] = 50;
    }
  }
}
// the far gate in the void: two cells on the warden's island once it is gone
function featuresFarGate() {
  if (bossDead == 1) {
    if (50 >= gx0 && 50 <= gx1 && 0 >= gz0 && 0 <= gz1) {
      findTop(50, 0);
      if (topY > 0) { if (topY + 2 < WY) { W[wi(50, topY + 1, 0)] = 63; W[wi(50, topY + 2, 0)] = 63; } }
    }
  }
}
function farGateOpen() {
  findTop(50, 0);
  setBlock(50, topY + 1, 0, 63); setBlock(50, topY + 2, 0, 63);
}
// through a far gate: from the middle out to a city, or back
function farGateGo() {
  if (Math.abs(px) < 200 && Math.abs(pz) < 200) {
    // the nearest city out along +x
    let cx = 30, found = 0, bx = 600, bz = 0;
    while (cx < 60 && found == 0) {
      let cz = 0 - 6;
      while (cz <= 6 && found == 0) { if (cityIn(cx, cz) == 1) { found = 1; bx = ciX - 6; bz = ciZ - 6; } cz = cz + 1; }
      cx = cx + 1;
    }
    startTravel(2, bx + 0.5, bz + 0.5, 4);
  } else { startTravel(2, 46.5, 0.5, 5); }
}
// arriving through a far gate: on the ground near, else a small floor; a gate back beside
function farArrive() {
  let x = Math.floor(px), z = Math.floor(pz);
  findTop(x, z);
  if (topY < 20) {
    let a = 0 - 2;
    while (a <= 2) { let c = 0 - 2; while (c <= 2) { setBlock(x + a, 40, z + c, 54); c = c + 1; } a = a + 1; }
    findTop(x, z);
  }
  py = topY + 1;
  if (travelKind == 4) { setBlock(x + 3, topY + 1, z, 63); setBlock(x + 3, topY + 2, z, 63); setBlock(x + 3, topY, z, 54); }
}

// ---------------------------------------------------------------- the glider
let gliding = 0;
function gliderOn() {
  let r = 0;
  if (INVI[38] == 173) { if (INVD[38] < ITDUR[174] - 1) { r = 1; } }
  return r;
}
// a step of gliding (in blocks a tick, as the original falls do: dt in seconds)
let glideWearT = 0;
function glideStep(dt) {
  let k = dt * 20;
  let vx = pvx / 20, vy = pvy / 20, vz = pvz / 20;
  let f = 0 - pitch;
  let lx = sind(yaw) * cosd(pitch), lz = cosd(yaw) * cosd(pitch);
  let hl = Math.sqrt(lx * lx + lz * lz), hv = Math.sqrt(vx * vx + vz * vz);
  let cf = cosd(f), c2 = cf * cf;
  vy = vy + (0 - 0.08 + c2 * 0.06) * k;
  if (vy < 0) { if (hl > 0.001) { let d = vy * (0 - 0.1) * c2 * k; vy = vy + d; vx = vx + lx / hl * d; vz = vz + lz / hl * d; } }
  if (f < 0) { if (hl > 0.001) { let d = hv * (0 - sind(f)) * 0.04 * k; vy = vy + d * 3.2; vx = vx - lx / hl * d; vz = vz - lz / hl * d; } }
  if (hl > 0.001) { vx = vx + (lx / hl * hv - vx) * 0.1 * k; vz = vz + (lz / hl * hv - vz) * 0.1 * k; }
  vx = vx * (1 - 0.01 * k); vy = vy * (1 - 0.02 * k); vz = vz * (1 - 0.01 * k);
  pvx = vx * 20; pvy = vy * 20; pvz = vz * 20;
  fallTop = py;
  glideWearT = glideWearT + dt;
  if (glideWearT >= 1) { glideWearT = 0; if (mod(gameMode, 2) == 0) { INVD[38] = INVD[38] + 1; } }
}

// ---------------------------------------------------------------- boats
let riding = 0;
function boatPlace() {
  // on the water picked (or the cell before what is picked), at its top
  let x = 0, y = 0, z = 0, ok = 0;
  if (pickOn == 1) {
    pickNeighbour(); x = nbX; y = nbY; z = nbZ;
    if (BLQ[pickB + 1] == 7) { x = pickX; y = pickY; z = pickZ; }
    ok = 1;
  } else {
    // water under the look within 5 blocks
    let t = 1;
    while (t <= 5 && ok == 0) { let qx = Math.floor(camX + lookX * t), qy = Math.floor(camY + lookY * t), qz = Math.floor(camZ + lookZ * t); if (BLQ[blockAt(qx, qy, qz) + 1] == 7) { ok = 1; x = qx; y = qy; z = qz; } t = t + 0.5; }
  }
  if (ok == 1) {
    while (BLQ[blockAt(x, y + 1, z) + 1] == 7 && y < WY - 2) { y = y + 1; }
    let by = y + 0.6;
    if (BLQ[blockAt(x, y, z) + 1] != 7) { by = y; }
    mobAdd(13, x + 0.5, by, z + 0.5);
    // (v2.3.2) it faces the way the player looks (it went on a heading of its own)
    if (lastMob > 0) { EYAW[lastMob] = mod(yaw, 360); EST[lastMob] = 0; }
    if (mod(gameMode, 2) == 0) { takeHeld(1); }
    placeCool = 0.4;
  }
}
function boatStep(e, dt) {
  let w = MW[13] / 2;
  let inWt = 0;
  let b0 = blockAt(Math.floor(EX[e]), Math.floor(EY[e] + 0.1), Math.floor(EZ[e])), b1 = blockAt(Math.floor(EX[e]), Math.floor(EY[e] - 0.3), Math.floor(EZ[e]));
  if (BLQ[b0 + 1] == 7 || BLQ[b1 + 1] == 7) { inWt = 1; }
  // (v2.3.2) a hit wears off (boats do not take the mobs' step that counted it down: one hit and no more)
  if (EHURT[e] > 0) { EHURT[e] = EHURT[e] - dt; }
  let sp = 0, turn = 0;
  if (riding == e) {
    if (key(87)) { sp = 1; } if (key(83)) { sp = 0 - 0.5; }
    if (key(65)) { turn = 1; } if (key(68)) { turn = 0 - 1; }
    if (uiMode != 0) { sp = 0; turn = 0; }
  }
  EYAW[e] = EYAW[e] + turn * 90 * dt;
  let top = 8; if (inWt == 0) { top = 1.2; }
  let tx = sind(EYAW[e]) * sp * top, tz = cosd(EYAW[e]) * sp * top;
  let a = Math.min(1, 1.5 * dt);
  if (inWt == 0) { a = Math.min(1, 6 * dt); }
  EVX[e] = EVX[e] + (tx - EVX[e]) * a; EVZ[e] = EVZ[e] + (tz - EVZ[e]) * a;
  // floats at the top of the water, falls elsewhere
  if (inWt == 1) {
    // the top water cell under it: the boat's bottom sits a little under the surface
    let sy = Math.floor(EY[e] + 0.1);
    if (BLQ[blockAt(Math.floor(EX[e]), sy, Math.floor(EZ[e])) + 1] != 7) { sy = sy - 1; }
    while (BLQ[blockAt(Math.floor(EX[e]), sy + 1, Math.floor(EZ[e])) + 1] == 7) { sy = sy + 1; }
    // (the top of flowing water is lower)
    let tb = blockAt(Math.floor(EX[e]), sy, Math.floor(EZ[e])), top2 = 1;
    if (BLV[tb + 1] >= 1 && BLV[tb + 1] <= 7) { top2 = (16 - 2 * BLV[tb + 1]) / 16; }
    let want = sy + top2 - 0.28;
    EVY[e] = (want - EY[e]) * 4;
    // the current carries it
    flowAt(Math.floor(EX[e]), sy, Math.floor(EZ[e]));
    EVX[e] = EVX[e] + flX * 3 * dt; EVZ[e] = EVZ[e] + flZ * 3 * dt;
  } else { EVY[e] = EVY[e] - 32 * dt; if (EVY[e] < -40) { EVY[e] = 0 - 40; } }
  bmX = EX[e]; bmY = EY[e]; bmZ = EZ[e]; bmW = w; bmH = 0.55;
  bodyMove(EVX[e] * dt, EVY[e] * dt, EVZ[e] * dt);
  if (bmHitY == 1) { EVY[e] = 0; }
  if (bmHitX == 1) { EVX[e] = 0; } if (bmHitZ == 1) { EVZ[e] = 0; }
  EX[e] = bmX; EY[e] = bmY; EZ[e] = bmZ;
  if (riding == e) { px = EX[e]; py = EY[e] + 0.25; pz = EZ[e]; pvx = 0; pvy = 0; pvz = 0; fallTop = py; }
  if (EY[e] < -10) { ET[e] = 0; }
}

// ---------------------------------------------------------------- the wanderer and the shell-bug
// the wanderer goes for you when you look it in the eyes (or hit it), and slips away when hurt
function wanderStep(e, dt) {
  if (EST[e] == 4) { if (ETM[e] <= 0) { EST[e] = 0; } }
  else {
    if (mod(gameMode, 2) == 0 && dead == 0) {
      let hx = EX[e] - camX, hy = EY[e] + 2.6 - camY, hz = EZ[e] - camZ;
      let d = Math.sqrt(hx * hx + hy * hy + hz * hz);
      if (d < 24) { if (d > 0.5) {
        let dot = (hx * lookX + hy * lookY + hz * lookZ) / d;
        if (dot > 0.996) { if (sightLine(camX, camY, camZ, EX[e], EY[e] + 2.6, EZ[e]) == 1) { EST[e] = 4; ETM[e] = 30; sndPlay(4); } }
      } }
    }
  }
}
function wanderTeleport(e) {
  let k = 0, done = 0;
  while (k < 12 && done == 0) {
    let x = Math.floor(EX[e] + rand(-12, 12)), z = Math.floor(EZ[e] + rand(-12, 12)), y = Math.floor(EY[e]) + 6;
    if (cOK(x, z) == 1) {
      let j = 0;
      while (j < 14 && BSOL[blockAt(x, y - 1, z) + 1] == 0) { y = y - 1; j = j + 1; }
      if (BSOL[blockAt(x, y - 1, z) + 1] == 1) { if (blockAt(x, y, z) == 0 && blockAt(x, y + 1, z) == 0 && blockAt(x, y + 2, z) == 0) {
        EX[e] = x + 0.5; EY[e] = y; EZ[e] = z + 0.5; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; done = 1;
      } }
    }
    k = k + 1;
  }
}
// the shell-bug: sits still, opens and shoots a slow bolt that follows you
function shellStep(e, dt) {
  ETM[e] = ETM[e] - dt; EHURT[e] = EHURT[e] - dt; EATK[e] = EATK[e] - dt;
  let dx = px - EX[e], dy = py + 1 - EY[e], dz = pz - EZ[e];
  let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  EYAW[e] = atan2d(dx, dz);
  if (d < 16 && mod(gameMode, 2) == 0 && dead == 0) {
    if (EATK[e] <= 0) {
      if (sightLine(EX[e], EY[e] + 0.8, EZ[e], px, py + 1.2, pz) == 1) { arrowShoot(EX[e], EY[e] + 1.1, EZ[e], px, py + 1.2, pz, 4); EATK[e] = 2 + rand(0, 20) / 10; }
    }
  }
}
// the bolt (AON 5) and the eye (AON 6), each frame
function boltStep(a, dt) {
  if (AON[a] == 5) {
    let dx = px - AXX[a], dy = py + 1 - AYY[a], dz = pz - AZZ[a], d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
    let f = Math.min(1, 1.6 * dt);
    AVX[a] = AVX[a] + (dx / d * 5 - AVX[a]) * f; AVY[a] = AVY[a] + (dy / d * 5 - AVY[a]) * f; AVZ[a] = AVZ[a] + (dz / d * 5 - AVZ[a]) * f;
    AXX[a] = AXX[a] + AVX[a] * dt; AYY[a] = AYY[a] + AVY[a] * dt; AZZ[a] = AZZ[a] + AVZ[a] * dt;
    if (BSOL[blockAt(Math.floor(AXX[a]), Math.floor(AYY[a]), Math.floor(AZZ[a])) + 1] == 1) { AON[a] = 0; }
    if (Math.abs(AXX[a] - px) < 0.5 && Math.abs(AZZ[a] - pz) < 0.5 && AYY[a] > py && AYY[a] < py + 1.8) {
      hurt(4, '껍질벌레의 탄환에 맞았습니다'); effectAdd(10, 5, 1); AON[a] = 0;
    }
    if (AAGE[a] > 10) { AON[a] = 0; }
  }
  if (AON[a] == 6) {
    AXX[a] = AXX[a] + AVX[a] * dt; AYY[a] = AYY[a] + AVY[a] * dt; AZZ[a] = AZZ[a] + AVZ[a] * dt;
    if (AAGE[a] > 1.8) {
      if (rand(1, 5) == 1) { msgShow('공허의 눈이 부서졌습니다', 2); sndPlay(7); }
      else { dropItem(171, 1, 0, AXX[a], AYY[a], AZZ[a], 0); }
      AON[a] = 0;
    }
  }
}
// in the void: wanderers on the islands, shell-bugs about the cities near
function spawnVoid() {
  if (nHostile + nPassive < 14) {
    let a = rand(0, 359), r = rand(14, 36);
    let x = Math.floor(px + sind(a) * r), z = Math.floor(pz + cosd(a) * r);
    if (cOK(x, z) == 1) {
      findTop(x, z);
      if (topY > 20) { if (blockAt(x, topY + 1, z) == 0 && blockAt(x, topY + 2, z) == 0 && blockAt(x, topY + 3, z) == 0) { if (nWander() < 5) { mobAdd(11, x + 0.5, topY + 1.02, z + 0.5); } } }
    }
  }
  // shell-bugs: on the city floors near
  let cx = Math.floor(px / 16), cz = Math.floor(pz / 16), i = cx - 3;
  while (i <= cx + 3) {
    let j = cz - 3;
    while (j <= cz + 3) {
      if (cityIn(i, j) == 1) {
        if (nShell() < 4) { if (rand(1, 4) == 1) {
          let k = 6 * rand(1, Math.max(1, idiv(ciH, 6))), sa = rand(-2, 2), sc = rand(-2, 2);
          let x = ciX + sa, y = ciY + k + 1, z = ciZ + sc;
          if (cOK(x, z) == 1) { if (blockAt(x, y, z) == 0 && BSOL[blockAt(x, y - 1, z) + 1] == 1) { if (mobInCell(x, y, z) == 0) { mobAdd(12, x + 0.5, y, z + 0.5); } } }
        } }
      }
      j = j + 1;
    }
    i = i + 1;
  }
}
function nWander() {
  let n = 0, e = 1;
  while (e <= NMOB) { if (ET[e] == 11) { n = n + 1; } e = e + 1; }
  return n;
}
function nShell() {
  let n = 0, e = 1;
  while (e <= NMOB) { if (ET[e] == 12) { n = n + 1; } e = e + 1; }
  return n;
}

// ---------------------------------------------------------------- v2.0: weather
// wthr 0 clear, 1 rain (snow where it is cold), 2 thunder; wthrT seconds until it changes
let wthr = 0, wthrT = 600, thunderT = 10;
function weatherStep(dt) {
  // ((v2.6.1) on a server only the host's weather turns; the others follow it)
  let mine = 1;
  if (netSrv > 0) { if (netSt == 2 && netHost == 0) { mine = 0; } }
  if (grWeather == 1 && mine == 1) {
    wthrT = wthrT - dt;
    if (wthrT <= 0) {
      if (wthr == 0) { wthr = 1; if (rand(1, 10) <= 3) { wthr = 2; } wthrT = rand(120, 480); }
      else { wthr = 0; wthrT = rand(600, 1500); }
    }
  }
  if (wthr == 2) { if (dim == 0) {
    thunderT = thunderT - dt;
    if (thunderT <= 0) { thunderT = rand(6, 22); lightning(px + rand(-40, 40), py, pz + rand(-40, 40)); }
  } }
}
function weatherClear() { wthr = 0; wthrT = rand(600, 1500); }
// a bolt from the sky onto the top of (x, z): a flash, fire where it lands, hurt near it
function lightning(x, y, z) {
  let bx = Math.floor(x), bz = Math.floor(z);
  flashT = 0.2; sndPlay(7);
  if (cOK(bx, bz) == 1) {
    findTop(bx, bz);
    let ty = topY + 1;
    if (grFireTick == 1) { if (blockAt(bx, ty, bz) == 0) { if (BSOL[blockAt(bx, ty - 1, bz) + 1] > 0) { setBlock(bx, ty, bz, I_fire); } } }
    if ((px - x) * (px - x) + (pz - z) * (pz - z) < 9) { if (Math.abs(py - ty) < 4) { hurtT = 0; hurt(5, '번개에 맞았습니다'); } }
    let e = 1;
    while (e <= NMOB) { if (ET[e] > 0) { if ((EX[e] - x) * (EX[e] - x) + (EZ[e] - z) * (EZ[e] - z) < 9) { EHURT[e] = 0; mobHurt(e, 5, 0, 0); } } e = e + 1; }
  }
}
// rain or snow over the picture (where the sky is over the player)
function drawWeather() {
  if (wthr > 0 && dim == 0 && headWater == 0) {
    let i = wi(Math.floor(px), Math.min(WY - 1, Math.floor(py + 2)), Math.floor(pz));
    let open = 0;
    if (py + 2 >= WY) { open = 1; } else { if (cOK(Math.floor(px), Math.floor(pz)) == 1) { if (idiv(LT[i], 16) >= 14) { open = 1; } } }
    let bi = BIOM[wcol(Math.floor(px), Math.floor(pz))];
    if (bi == 4 || bi == 14 || bi == 12) { open = 0; }
    if (open == 1) {
      let snow = 0;
      if (bi == 6 || bi == 19 || bi == 8 || py > SEA + 45) { snow = 1; }
      let k = 0, n = 70, t = frameNo;
      fillStop();
      while (k < n) {
        let sx = mod(k * 97 + Math.floor(yaw * 3), 480) - 240, sy = 135 - mod(k * 61 + t * (9 - snow * 6) + k * 13, 290);
        if (snow == 1) {
          sx = sx + sind(t * 4 + k * 40) * 4;
          M_rect(sx - 1, sy + 1, sx + 1, sy - 1, '#f4f8ff');
        } else {
          fillStop(); goto(sx, sy); fillColorHex('#a8c0e8'); fillStart(); goto(sx + 0.7, sy); goto(sx - 1.3, sy - 9); goto(sx - 2, sy - 9);
        }
        k = k + 1;
      }
      fillStop();
    }
  }
}
