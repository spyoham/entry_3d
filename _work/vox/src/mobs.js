// ===================================================================== things that move
// mobs (slots 1..NMOB), items lying about (1..NITM), arrows (1..NARR)
let ET = [], EX = [], EY = [], EZ = [], EVX = [], EVY = [], EVZ = [], EYAW = [], EHP = [], EST = [], ETM = [], EHURT = [], EWALK = [], EATK = [], EBURN = [], EGND = [], EWY = [];
let IID = [], INN = [], IDU = [], IXX = [], IYY = [], IZZ = [], IVX = [], IVY = [], IVZ = [], IAGE = [];
let AXX = [], AYY = [], AZZ = [], AVX = [], AVY = [], AVZ = [], AAGE = [], AON = [], ASTK = [];
let nHostile = 0, nPassive = 0, spawnT = 0;

function thingsInit() {
  ET = []; EX = []; EY = []; EZ = []; EVX = []; EVY = []; EVZ = []; EYAW = []; EHP = []; EST = []; ETM = []; EHURT = []; EWALK = []; EATK = []; EBURN = []; EGND = []; EWY = [];
  IID = []; INN = []; IDU = []; IXX = []; IYY = []; IZZ = []; IVX = []; IVY = []; IVZ = []; IAGE = [];
  AXX = []; AYY = []; AZZ = []; AVX = []; AVY = []; AVZ = []; AAGE = []; AON = []; ASTK = [];
  let i = 0;
  while (i < NMOB) { ET.push(0); EX.push(0); EY.push(0); EZ.push(0); EVX.push(0); EVY.push(0); EVZ.push(0); EYAW.push(0); EHP.push(0); EST.push(0); ETM.push(0); EHURT.push(0); EWALK.push(0); EATK.push(0); EBURN.push(0); EGND.push(0); EWY.push(0); i = i + 1; }
  i = 0;
  while (i < NITM) { IID.push(0); INN.push(0); IDU.push(0); IXX.push(0); IYY.push(0); IZZ.push(0); IVX.push(0); IVY.push(0); IVZ.push(0); IAGE.push(0); i = i + 1; }
  i = 0;
  while (i < NARR) { AXX.push(0); AYY.push(0); AZZ.push(0); AVX.push(0); AVY.push(0); AVZ.push(0); AAGE.push(0); AON.push(0); ASTK.push(0); i = i + 1; }
}
function mobAdd(t, x, y, z) {
  let i = 1, e = 0;
  while (i <= NMOB) { if (e == 0) { if (ET[i] == 0) { e = i; } } i = i + 1; }
  if (e > 0) {
    ET[e] = t; EX[e] = x; EY[e] = y; EZ[e] = z; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; EYAW[e] = rand(0, 359); EWY[e] = EYAW[e];
    EHP[e] = MHP[t]; EST[e] = 0; ETM[e] = rand(1, 40) / 10; EHURT[e] = 0; EWALK[e] = 0; EATK[e] = 0; EBURN[e] = 0; EGND[e] = 0;
  }
  lastMob = e;
}
let lastMob = 0;
// animals on the grass of a chunk just made (a few chunks in ten)
function chunkAnimals(cx, cz) {
  if (nPassive < ANIMALS) {
    chunkSeed(cx, cz, 4);
    if (rnd() < 0.18) {
      let x = cx * 16 + rndI(3, 12), z = cz * 16 + rndI(3, 12);
      findTop(x, z);
      let i = wi(x, topY, z);
      if (W[i] == 2 || W[i] == 20) {
        if (W[i + 1] == 0 || W[i + 1] == 28) {
          let t = rndI(1, 4), n = rndI(2, 4), j = 0;
          while (j < n) {
            mobAdd(t, x + 0.5 + rndI(-10, 10) / 10, topY + 1.05, z + 0.5 + rndI(-10, 10) / 10);
            j = j + 1; nPassive = nPassive + 1;
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- spawning in the dark
function spawnStep(dt) {
  spawnT = spawnT + dt;
  if (spawnT > 0.6) {
    spawnT = 0;
    nHostile = 0; nPassive = 0;
    let i = 1;
    while (i <= NMOB) {
      if (ET[i] > 0) {
        if (MHOST[ET[i]] == 1) {
          nHostile = nHostile + 1;
          // far away ones go
          if ((EX[i] - px) * (EX[i] - px) + (EZ[i] - pz) * (EZ[i] - pz) > 56 * 56) { ET[i] = 0; }
        } else { nPassive = nPassive + 1; }
      }
      i = i + 1;
    }
    if (BENCH == 0) { if (dim == 1) { spawnDepths(); } }
    if (BENCH == 0) { if (dim == 0) { if (gameMode == 0 || SPAWNC == 1) {
      if (nHostile < 10) {
        let a = rand(0, 359), r = rand(18, 40);
        let x = Math.floor(px + sind(a) * r), z = Math.floor(pz + cosd(a) * r);
        if (cOK(x, z) == 1) {
          // a spot: on the surface (night) or deep in a cave
          findTop(x, z);
          let y = topY + 1;
          if (rand(1, 3) == 1) { y = rand(5, Math.max(6, topY - 4)); }
          let i2 = wi(x, y, z);
          if (y > 1 && y < WY - 2) {
            if (W[i2] == 0 && W[i2 + 1] == 0 && BSOL[W[i2 - 1] + 1] == 1 && W[i2 - 1] != 19) {
              let lv = Math.max(idiv(LT[i2], 16) - dark, mod(LT[i2], 16));
              if (lv <= 7) {
                let r2 = rand(1, 100), t = 5;
                if (r2 > 45) { t = 6; } if (r2 > 80) { t = 7; }
                mobAdd(t, x + 0.5, y + 0.02, z + 0.5);
              }
            }
          }
        }
      }
    } } }
  }
}
// in the depths: on any floor near, in any light (a wraith floats, a toad sits)
function spawnDepths() {
  if (nHostile < 8) {
    let a = rand(0, 359), r = rand(14, 32);
    let x = Math.floor(px + sind(a) * r), z = Math.floor(pz + cosd(a) * r), y = rand(14, 44);
    if (cOK(x, z) == 1) {
      let k = 0;
      while (k < 12 && BSOL[blockAt(x, y - 1, z) + 1] == 0) { y = y - 1; k = k + 1; }
      if (blockAt(x, y, z) == 0 && blockAt(x, y + 1, z) == 0 && BSOL[blockAt(x, y - 1, z) + 1] == 1) {
        if (rand(1, 100) <= 45) { mobAdd(8, x + 0.5, y + 1.5, z + 0.5); } else { mobAdd(9, x + 0.5, y + 0.02, z + 0.5); }
      }
    }
  }
}

// ---------------------------------------------------------------- mobs each frame
function mobsStep(dt) {
  let e = 1;
  while (e <= NMOB) {
    // (far from the player they rest: only the ones near are worth the time)
    if (ET[e] > 0) {
      if (cOK(Math.floor(EX[e]), Math.floor(EZ[e])) == 0) { ET[e] = 0; }
      else { if (ET[e] != 10) { if ((EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz) < 1600) { mobStep(e, dt); } } }
    }
    e = e + 1;
  }
}
function mobStep(e, dt) {
  let t = ET[e];
  let w = MW[t] / 2, h = MH[t];
  let dxp = px - EX[e], dzp = pz - EZ[e], dyp = py - EY[e];
  let dist = Math.sqrt(dxp * dxp + dzp * dzp);
  let want = 0, wy = EYAW[e], spd = MSPD[t];
  ETM[e] = ETM[e] - dt; EHURT[e] = EHURT[e] - dt; EATK[e] = EATK[e] - dt;
  if (MHOST[t] == 1) {
    // hostile: after the player when near (not in creative)
    if (dist < 16 && gameMode == 0 && dead == 0) {
      wy = atan2d(dxp, dzp);
      want = 1;
      if (t == 8) {
        if (dist < 7) { want = 0 - 1; } else { if (dist < 13) { want = 0; } }
        if (EATK[e] <= 0) { if (dist < 22) {
          if (sightLine(EX[e], EY[e] + 1.2, EZ[e], px, py + 1.5, pz) == 1) {
            arrowShoot(EX[e], EY[e] + 1.2, EZ[e], px, py + 1.2, pz, 2);
            EATK[e] = 2.5 + rand(0, 10) / 10;
          }
        } }
      }
      if (t == 9) {
        want = 0;
        if (EGND[e] == 1) { if (ETM[e] <= 0) { ETM[e] = 0.9 + rand(0, 8) / 10; EVY[e] = 7.5; want = 1.8; EYAW[e] = wy; } }
        else { want = 1.8; }
        if (dist < 1.4) { if (Math.abs(dyp) < 1.2) { if (EATK[e] <= 0) { EATK[e] = 1; hurt(MDMG[t], `${MNAME[t]}에게 당했습니다`); pvx = pvx + dxp / (dist + 0.01) * 4; pvz = pvz + dzp / (dist + 0.01) * 4; pvy = 4; } } }
      }
      if (t == 6) {
        // the archer keeps its distance and shoots
        if (dist < 6) { want = 0 - 1; }
        if (dist < 10) { if (dist > 3) { want = 0; } }
        if (EATK[e] <= 0) { if (dist < 14) {
          if (sightLine(EX[e], EY[e] + 1.5, EZ[e], px, py + 1.5, pz) == 1) {
            arrowShoot(EX[e], EY[e] + 1.5, EZ[e], px, py + 1.2, pz, 0);
            EATK[e] = 2 + rand(0, 10) / 10;
          }
        } }
      } else { if (t < 8) {
        if (dist < 1.2 + w) { if (Math.abs(dyp) < 1.5) { if (EATK[e] <= 0) {
          EATK[e] = 1;
          hurt(MDMG[t], `${MNAME[t]}에게 당했습니다`);
          // knocked back
          pvx = pvx + dxp / (dist + 0.01) * 5; pvz = pvz + dzp / (dist + 0.01) * 5; pvy = 4;
        } } }
        // the spider leaps
        if (t == 7) { if (dist < 4) { if (EGND[e] == 1) { if (rand(1, 30) == 1) { EVY[e] = 6; } } } }
      } }
    } else {
      if (ETM[e] <= 0) { ETM[e] = rand(20, 60) / 10; EST[e] = rand(0, 2); EWY[e] = rand(0, 359); }
      if (EST[e] == 1) { want = 0.5; wy = EWY[e]; }
    }
    // burning in the sun
    if (MBURN[t] == 1) {
      EBURN[e] = 0;
      if (dark <= 2 && dim == 0) {
        let ci = wi(Math.floor(EX[e]), Math.floor(EY[e] + 1.5), Math.floor(EZ[e]));
        if (EY[e] + 1.5 < WY) { if (LT[ci] >= 240) { if (headIn(e) == 0) { EBURN[e] = 1; } } }
      }
      if (EBURN[e] == 1) { if (rand(1, 60) == 1) { mobHurt(e, 1, 0, 0); } }
    }
  } else {
    // animals wander, and run when hurt
    if (EST[e] == 3) { want = 1.6; wy = EWY[e]; if (ETM[e] <= 0) { EST[e] = 0; } }
    else {
      if (ETM[e] <= 0) { ETM[e] = rand(20, 80) / 10; EST[e] = rand(0, 1); EWY[e] = EYAW[e] + rand(-120, 120); }
      if (EST[e] == 1) { want = 0.6; wy = EWY[e]; }
    }
  }
  // turn toward wy
  let dyaw = wy - EYAW[e];
  while (dyaw > 180) { dyaw = dyaw - 360; } while (dyaw < -180) { dyaw = dyaw + 360; }
  EYAW[e] = EYAW[e] + dyaw * Math.min(1, 8 * dt);
  let tx = sind(EYAW[e]) * spd * want, tz = cosd(EYAW[e]) * spd * want;
  if (want < 0) { tx = 0 - sind(wy) * spd; tz = 0 - cosd(wy) * spd; }
  // animals stop at cliffs and water
  if (MHOST[t] == 0) { if (want != 0) {
    let ax = Math.floor(EX[e] + sind(EYAW[e]) * (w + 0.6)), az = Math.floor(EZ[e] + cosd(EYAW[e]) * (w + 0.6)), ay = Math.floor(EY[e]);
    let ab = blockAt(ax, ay - 1, az);
    if (BSOL[ab + 1] == 0) { if (BSOL[blockAt(ax, ay - 2, az) + 1] == 0 || ab == 7) { tx = 0; tz = 0; EWY[e] = EYAW[e] + 180; } }
  } }
  let a = Math.min(1, 10 * dt);
  if (EGND[e] == 0) { a = Math.min(1, 2 * dt); }
  EVX[e] = EVX[e] + (tx - EVX[e]) * a; EVZ[e] = EVZ[e] + (tz - EVZ[e]) * a;
  bodyIn(EX[e], EY[e], EZ[e], w, h);
  if (MFLY[t] == 1) {
    let ty = py + 2.5 + sind(frameNo * 3 + e * 40) * 0.8;
    if (dist > 24) { ty = EY[e]; }
    EVY[e] = EVY[e] + ((ty - EY[e]) * 1.5 - EVY[e]) * Math.min(1, 3 * dt);
  } else {
    if (inW == 1 || inL == 1) {
      EVY[e] = EVY[e] - 6 * dt; if (EVY[e] < 1.5) { EVY[e] = EVY[e] + 14 * dt; }
      if (inL == 1) { if (MFIRE[t] == 0) { if (rand(1, 20) == 1) { mobHurt(e, 2, 0, 0); } } }
    } else { EVY[e] = EVY[e] - 32 * dt; }
  }
  if (EVY[e] < -40) { EVY[e] = -40; }
  bmX = EX[e]; bmY = EY[e]; bmZ = EZ[e]; bmW = w; bmH = h;
  bodyMove(EVX[e] * dt, EVY[e] * dt, EVZ[e] * dt);
  let hit = 0;
  if (bmHitX == 1 || bmHitZ == 1) { hit = 1; }
  if (bmHitY == 1) { EVY[e] = 0; }
  EGND[e] = bmGround;
  // a wall in the way: jump it
  if (hit == 1) { if (bmGround == 1) { if (want != 0) { EVY[e] = 8.4; } } }
  EX[e] = bmX; EY[e] = bmY; EZ[e] = bmZ;
  let sp = Math.sqrt(EVX[e] * EVX[e] + EVZ[e] * EVZ[e]);
  EWALK[e] = EWALK[e] + sp * dt * 3.2;
  if (EY[e] < -10) { ET[e] = 0; }
}
function headIn(e) {
  let b = blockAt(Math.floor(EX[e]), Math.floor(EY[e] + MH[ET[e]] - 0.2), Math.floor(EZ[e]));
  let r = 0;
  if (b == 7) { r = 1; }
  return r;
}
function atan2d(x, z) {
  let a = 0;
  if (Math.abs(z) < 0.00001) { if (x > 0) { a = 90; } else { a = -90; } }
  else { a = atand(x / z); if (z < 0) { a = a + 180; } }
  return a;
}
// a mob hit (by the player: knocked away from (fx, fz))
function mobHurt(e, n, fx, fz) {
  if (ET[e] == 10) { if (nCrystal > 0) { n = 0; msgShow('수호 수정이 수호자를 지키고 있습니다', 1.5); } }
  if (EHURT[e] <= 0 && n > 0) {
    EHP[e] = EHP[e] - n; EHURT[e] = 0.5;
    sndPlay(4);
    if (fx != 0 || fz != 0) {
      let l = Math.sqrt(fx * fx + fz * fz) + 0.001;
      EVX[e] = fx / l * 6; EVZ[e] = fz / l * 6; EVY[e] = 5;
    }
    let t = ET[e];
    if (MHOST[t] == 0) { EST[e] = 3; ETM[e] = 3; EWY[e] = atan2d(EX[e] - px, EZ[e] - pz); }
    if (EHP[e] <= 0) {
      if (t == 10) { bossDies(e); }
      // drops
      let k = MD0[t], n2 = 0;
      while (k < MD0[t] + MDN[t]) {
        n2 = rand(MDLO[k], MDHI[k]);
        if (n2 > 0) { dropItem(MDI[k], n2, 0, EX[e], EY[e] + 0.5, EZ[e], 0); }
        k = k + 1;
      }
      ET[e] = 0;
    }
  }
}
// a ray against the mobs' boxes: the nearest one closer than tmax (0: none)
function mobRay(ox, oy, oz, dx, dy, dz, tmax) {
  let best = 0, bt = tmax, e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) {
      let w = MW[ET[e]] / 2 + 0.05, h = MH[ET[e]];
      let t0 = 0, t1 = bt, ok = 1, a = 0, b = 0, tt = 0;
      // x slab
      if (Math.abs(dx) < 0.00001) { if (ox < EX[e] - w || ox > EX[e] + w) { ok = 0; } }
      else { a = (EX[e] - w - ox) / dx; b = (EX[e] + w - ox) / dx; if (a > b) { tt = a; a = b; b = tt; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (Math.abs(dy) < 0.00001) { if (oy < EY[e] || oy > EY[e] + h) { ok = 0; } }
      else { a = (EY[e] - oy) / dy; b = (EY[e] + h - oy) / dy; if (a > b) { tt = a; a = b; b = tt; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (Math.abs(dz) < 0.00001) { if (oz < EZ[e] - w || oz > EZ[e] + w) { ok = 0; } }
      else { a = (EZ[e] - w - oz) / dz; b = (EZ[e] + w - oz) / dz; if (a > b) { tt = a; a = b; b = tt; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (ok == 1) { if (t0 <= t1) { if (t0 < bt) { bt = t0; best = e; } } }
    }
    e = e + 1;
  }
  return best;
}
function mobInCell(x, y, z) {
  let r = 0, e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) {
      let w = MW[ET[e]] / 2;
      if (x + 1 > EX[e] - w && x < EX[e] + w && z + 1 > EZ[e] - w && z < EZ[e] + w && y + 1 > EY[e] && y < EY[e] + MH[ET[e]]) { r = 1; }
    }
    e = e + 1;
  }
  return r;
}
// the player's swing at the picked mob
function attack() {
  if (mobPick > 0) { if (attackCool <= 0) {
    let id = INVI[hotSel], dmg = 1;
    if (ITTK[id + 1] >= 0) { dmg = ITDMG[id + 1]; wearHeld(1); }
    if (gameMode == 1) { dmg = 99; }
    let crit = 0;
    if (onGround == 0) { if (pvy < 0) { crit = 1; dmg = Math.floor(dmg * 1.5); } }
    mobHurt(mobPick, dmg, EX[mobPick] - px, EZ[mobPick] - pz);
    exhaust = exhaust + 0.1;
    attackCool = 0.45; swingT = 0.3;
  } }
}
// a straight line between two points free of opaque blocks?
function sightLine(x0, y0, z0, x1, y1, z1) {
  let d = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (z1 - z0) * (z1 - z0));
  let n = Math.ceil(d * 2), k = 1, ok = 1;
  while (k < n && ok == 1) {
    if (BHC[blockAt(Math.floor(x0 + (x1 - x0) * k / n), Math.floor(y0 + (y1 - y0) * k / n), Math.floor(z0 + (z1 - z0) * k / n)) + 1] == 1) { ok = 0; }
    k = k + 1;
  }
  return ok;
}

// ---------------------------------------------------------------- arrows
function arrowShoot(x, y, z, tx, ty, tz, own) {
  let i = 1, a = 0;
  while (i <= NARR) { if (a == 0) { if (AON[i] == 0) { a = i; } } i = i + 1; }
  if (a > 0) {
    let dx = tx - x, dy = ty - y, dz = tz - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
    let sp = 18;
    AON[a] = 1 + own; AXX[a] = x + dx / d * 0.6; AYY[a] = y; AZZ[a] = z + dz / d * 0.6;
    if (own == 0) {
      // aim a little up for the drop, and miss a little
      AVX[a] = dx / d * sp + rand(-10, 10) / 20; AVY[a] = dy / d * sp + d * 0.9; AVZ[a] = dz / d * sp + rand(-10, 10) / 20;
    } else {
      if (own == 2) { sp = 11; }
      if (own == 1) { sp = 32; AYY[a] = y + dy / d * 0.6; }
      AVX[a] = dx / d * sp; AVY[a] = dy / d * sp; AVZ[a] = dz / d * sp;
    }
    AAGE[a] = 0; ASTK[a] = 0;
  }
}
function arrowsStep(dt) {
  let a = 1;
  while (a <= NARR) {
    if (AON[a] > 0) {
      AAGE[a] = AAGE[a] + dt;
      if (ASTK[a] == 0) {
        if (AON[a] != 3) { AVY[a] = AVY[a] - 20 * dt; }
        let nx = AXX[a] + AVX[a] * dt, ny = AYY[a] + AVY[a] * dt, nz = AZZ[a] + AVZ[a] * dt;
        let hb = blockAt(Math.floor(nx), Math.floor(ny), Math.floor(nz));
        // the player's arrow breaks a warding crystal
        if (hb == 57) { if (AON[a] == 2) { crystalBreak(Math.floor(nx), Math.floor(ny), Math.floor(nz)); AON[a] = 0; } }
        if (BSOL[hb + 1] == 1) { ASTK[a] = 1; AAGE[a] = 0; if (AON[a] == 3) { AON[a] = 0; } }
        else { AXX[a] = nx; AYY[a] = ny; AZZ[a] = nz; }
        // the player
        if (AON[a] == 1 || AON[a] == 3) {
          if (Math.abs(AXX[a] - px) < 0.45 && Math.abs(AZZ[a] - pz) < 0.45 && AYY[a] > py && AYY[a] < py + 1.8) {
            if (AON[a] == 3) { hurt(5, '불덩이에 맞았습니다'); } else { hurt(rand(2, 4), '화살에 맞았습니다'); }
            pvx = pvx + AVX[a] * 0.2; pvz = pvz + AVZ[a] * 0.2;
            AON[a] = 0;
          }
        }
        // the player's arrow: the mobs
        if (AON[a] == 2) {
          let e = 1;
          while (e <= NMOB) {
            if (ET[e] > 0) { if (AON[a] == 2) {
              let w = MW[ET[e]] / 2 + 0.1;
              if (Math.abs(AXX[a] - EX[e]) < w && Math.abs(AZZ[a] - EZ[e]) < w && AYY[a] > EY[e] && AYY[a] < EY[e] + MH[ET[e]]) {
                mobHurt(e, 7, AVX[a], AVZ[a]); AON[a] = 0;
              }
            } }
            e = e + 1;
          }
        }
      } else {
        if (AAGE[a] > 8) { AON[a] = 0; }
        // a stuck arrow can be picked up
        if (Math.abs(AXX[a] - px) < 1 && Math.abs(AZZ[a] - pz) < 1 && Math.abs(AYY[a] - py - 0.5) < 1.5) { if (AON[a] <= 2) { if (gameMode == 0) { if (rand(1, 2) == 1 || AON[a] == 2) { addItem(115, 1, 0); } } } AON[a] = 0; }
      }
      if (AAGE[a] > 20) { AON[a] = 0; }
    }
    a = a + 1;
  }
}

// ---------------------------------------------------------------- items lying about
// (thrown 1: away from the player, a little up)
function dropItem(id, n, du, x, y, z, thrown) {
  let i = 1, s = 0, oldest = 1;
  while (i <= NITM) { if (s == 0) { if (IID[i] == 0) { s = i; } } if (IAGE[i] > IAGE[oldest]) { oldest = i; } i = i + 1; }
  if (s == 0) { s = oldest; }
  IID[s] = id; INN[s] = n; IDU[s] = du; IXX[s] = x; IYY[s] = y; IZZ[s] = z; IAGE[s] = 0;
  IVX[s] = rand(-10, 10) / 10; IVZ[s] = rand(-10, 10) / 10; IVY[s] = 3;
  if (thrown == 1) { IVX[s] = rand(-30, 30) / 10; IVZ[s] = rand(-30, 30) / 10; IVY[s] = 4; }
  if (thrown == 2) { IVX[s] = lookX * 6; IVY[s] = lookY * 6 + 2; IVZ[s] = lookZ * 6; IAGE[s] = 0 - 1.5; }
}
function itemsStep(dt) {
  let i = 1;
  while (i <= NITM) {
    if (IID[i] > 0) {
      IAGE[i] = IAGE[i] + dt;
      IVY[i] = IVY[i] - 20 * dt;
      bmX = IXX[i]; bmY = IYY[i]; bmZ = IZZ[i]; bmW = 0.12; bmH = 0.25;
      bodyMove(IVX[i] * dt, IVY[i] * dt, IVZ[i] * dt);
      IXX[i] = bmX; IYY[i] = bmY; IZZ[i] = bmZ;
      if (bmHitY == 1) { IVY[i] = 0; IVX[i] = IVX[i] * 0.5; IVZ[i] = IVZ[i] * 0.5; }
      if (bmHitX == 1) { IVX[i] = 0; } if (bmHitZ == 1) { IVZ[i] = 0; }
      if (bmGround == 1) { IVX[i] = IVX[i] * (1 - Math.min(1, 6 * dt)); IVZ[i] = IVZ[i] * (1 - Math.min(1, 6 * dt)); }
      // in a block (it was built over): up
      solidIn(Math.floor(IXX[i]), Math.floor(IXX[i]), Math.floor(IYY[i] + 0.1), Math.floor(IYY[i] + 0.1), Math.floor(IZZ[i]), Math.floor(IZZ[i]));
      if (solidHit == 1) { IYY[i] = Math.floor(IYY[i] + 0.1) + 1; }
      // picked up when close
      if (dead == 0) { if (IAGE[i] > 0.5) {
        let dx = px - IXX[i], dy = py + 0.8 - IYY[i], dz = pz - IZZ[i];
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 2.6) {
          if (d2 < 0.8) {
            addItem(IID[i], INN[i], IDU[i]);
            if (addLeft < INN[i]) { sndPlay(6); }
            INN[i] = addLeft;
            if (addLeft == 0) { IID[i] = 0; } else { IAGE[i] = 0 - 1; }
          } else { IVX[i] = dx * 4; IVY[i] = dy * 4 + 1; IVZ[i] = dz * 4; }
        }
      } }
      if (IAGE[i] > 300 || IYY[i] < -10) { IID[i] = 0; }
    }
    i = i + 1;
  }
}

// ---------------------------------------------------------------- drawing them
function bucketThings() {
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) {
      let h = MH[ET[e]];
      if ((EX[e] - camX) * (EX[e] - camX) + (EZ[e] - camZ) * (EZ[e] - camZ) < viewR2) {
        inView(EX[e], EY[e] + h / 2, EZ[e], h);
        if (inV == 1) { bucketThing(0 - e, EX[e], EY[e] + Math.min(h / 2, 0.9), EZ[e]); }
      }
    }
    e = e + 1;
  }
  let i = 1;
  while (i <= NITM) {
    if (IID[i] > 0) { inView(IXX[i], IYY[i], IZZ[i], 0.4); if (inV == 1) { bucketThing(0 - 100 - i, IXX[i], IYY[i] + 0.1, IZZ[i]); } }
    i = i + 1;
  }
  let a = 1;
  while (a <= NARR) {
    if (AON[a] > 0) { inView(AXX[a], AYY[a], AZZ[a], 0.6); if (inV == 1) { bucketThing(0 - 200 - a, AXX[a], AYY[a], AZZ[a]); } }
    a = a + 1;
  }
}
function drawThing(id, d2) {
  let fog = FOGL[d2 + 1];
  if (id < 100) { drawMob(id, fog); }
  else { if (id < 200) { drawItemThing(id - 100, fog); } else { drawArrow(id - 200, fog); } }
}
// the light where a thing stands (0..15 with the night)
function lightAt(x, y, z) {
  let lv = 15 - dark;
  if (y >= 0 && y < WY) { if (cOK(Math.floor(x), Math.floor(z)) == 1) {
    let i = wi(Math.floor(x), Math.floor(y), Math.floor(z));
    lv = Math.max(idiv(LT[i], 16) - dark, mod(LT[i], 16));
  } }
  if (lv < dimAmb) { lv = dimAmb; }
  return lv;
}

// a box model: corners turned by the mob's yaw (and the limb's swing), boxes far to near.
// Whole numbers: model units are 1/160 block (BX0 ..), turns x1024, so a corner is in
// 1/160 x 2^20 block (MK a block) before the camera's turn.
let BXS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], BXD = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let PSX = [0, 0, 0, 0, 0, 0, 0, 0], PSY = [0, 0, 0, 0, 0, 0, 0, 0];
let mdX = 0, mdY = 0, mdZ = 0, mdSy = 0, mdCy = 1, mdSwing = 0, mdLv = 15, mdFog = 0, mdTint = 0;
let mdOX = 0, mdOY = 0, mdOZ = 0, mdSs = 0, mdCs = 1024, behindAny = 0;
function drawMob(e, fog) {
  let t = ET[e];
  mdX = EX[e]; mdY = EY[e]; mdZ = EZ[e];
  mdSy = Math.round(sind(EYAW[e]) * 1024); mdCy = Math.round(cosd(EYAW[e]) * 1024);
  let sw = sind(EWALK[e] * 57) * 35 * Math.min(1, Math.sqrt(EVX[e] * EVX[e] + EVZ[e] * EVZ[e]));
  mdSs = Math.round(sind(sw) * 1024); mdCs = Math.round(cosd(sw) * 1024);
  mdOX = Math.round((mdX - camX) * MK); mdOY = Math.round((mdY - camY) * MK); mdOZ = Math.round((mdZ - camZ) * MK);
  mdLv = lightAt(mdX, mdY + 0.5, mdZ); mdFog = fog;
  mdTint = 0;
  if (EHURT[e] > 0.2) { mdTint = 1; }
  if (EBURN[e] == 1) { if (mod(frameNo, 10) < 2) { mdTint = 2; } }
  // order the boxes by distance of their middles (in the camera's depth)
  let b = MB0[t], be = b + MBN[t], n = 0, cxm = 0, cym = 0, czm = 0, wx = 0, wz = 0, dd = 0, j = 0;
  while (b < be) {
    cxm = BX0[b] + BX1[b]; cym = BY0[b] + BY1[b]; czm = BZ0[b] + BZ1[b];
    wx = mdOX + (cxm * mdCy + czm * mdSy) * 512; wz = mdOZ + (czm * mdCy - cxm * mdSy) * 512;
    dd = r31 * wx + r32 * (mdOY + cym * 524288) + r33 * wz;
    n = n + 1;
    j = n;
    while (j > 1) { if (BXD[j - 1] < dd) { BXS[j] = BXS[j - 1]; BXD[j] = BXD[j - 1]; j = j - 1; } else { break; } }
    BXS[j] = b; BXD[j] = dd;
    b = b + 1;
  }
  let k = 1;
  while (k <= n) { drawBox(BXS[k]); k = k + 1; }
}
function drawBox(b) {
  let x0 = BX0[b], y0 = BY0[b], z0 = BZ0[b], x1 = BX1[b], y1 = BY1[b], z1 = BZ1[b];
  let part = BPART[b], ss = 0, cs = 1024;
  if (part == 1 || part == 4) { ss = mdSs; cs = mdCs; } if (part == 2 || part == 3) { ss = 0 - mdSs; cs = mdCs; }
  let pyv = y1, pzv = idiv(z0 + z1, 2);
  let k = 0, lx = 0, ly = 0, lz = 0, ry = 0, rz = 0, wx = 0, wy = 0, wz = 0, vz = 0, behind = 0, sy = mdSy, cy = mdCy;
  let a1 = r11, a3 = r13, b1 = r21, b2 = r22, b3 = r23, c1 = r31, c2 = r32, c3 = r33, foc = FOC, ox = mdOX, oy = mdOY, oz = mdOZ;
  while (k < 8) {
    if (k >= 4) { lx = x1; } else { lx = x0; }
    if (mod(k, 4) >= 2) { ly = y1; } else { ly = y0; }
    if (mod(k, 2) == 1) { lz = z1; } else { lz = z0; }
    // the limb swings about its top
    ry = ly * 1024; rz = lz * 1024;
    if (ss != 0) { ry = pyv * 1024 + (ly - pyv) * cs - (lz - pzv) * ss; rz = pzv * 1024 + (ly - pyv) * ss + (lz - pzv) * cs; }
    wx = ox + lx * 1024 * cy + rz * sy; wy = oy + ry * 1024; wz = oz + rz * cy - lx * 1024 * sy;
    vz = c1 * wx + c2 * wy + c3 * wz;
    if (vz < 40000000000) { behind = 1; vz = 40000000000; }
    PSX[k + 1] = (a1 * wx + a3 * wz) * foc / vz; PSY[k + 1] = (b1 * wx + b2 * wy + b3 * wz) * foc / vz;
    k = k + 1;
  }
  if (behind == 0) {
    let c = BCOL[b];
    // faces (corner numbers + 1), drawn when they turn to the eye
    boxFace(1, 2, 4, 3, c, 0); boxFace(5, 7, 8, 6, c, 1);
    boxFace(1, 5, 6, 2, c, 2); boxFace(3, 4, 8, 7, c, 3);
    boxFace(1, 3, 7, 5, c, 4); boxFace(2, 6, 8, 4, c, 5);
  }
}
function boxFace(a, b, c, d, col, dir) {
  let ax = PSX[a], ay = PSY[a];
  let area = (PSX[b] - ax) * (PSY[c] - ay) - (PSY[b] - ay) * (PSX[c] - ax);
  if (area < 0) {
    let kb = BIDX[mdLv * 8 + dir + 1] * 8;
    let hx = CT[col + kb + mdFog + 1];
    if (mdTint == 1) { hx = CT[CHURT + kb + mdFog + 1]; }
    if (mdTint == 2) { hx = CT[CFLAME + kb + mdFog + 1]; }
    fillStop(); goto(ax, ay); fillColorHex(hx); fillStart(); goto(PSX[b], PSY[b]); goto(PSX[c], PSY[c]); goto(PSX[d], PSY[d]);
    nFill = nFill + 1;
  }
}
// an item lying about: a small turning block (or a flat card for the rest)
function drawItemThing(i, fog) {
  let id = IID[i];
  let a = IAGE[i] * 90, bobv = sind(IAGE[i] * 150) * 0.06;
  mdX = IXX[i]; mdY = IYY[i] + 0.08 + bobv; mdZ = IZZ[i];
  mdSy = Math.round(sind(a) * 1024); mdCy = Math.round(cosd(a) * 1024); mdTint = 0;
  mdOX = Math.round((mdX - camX) * MK); mdOY = Math.round((mdY - camY) * MK); mdOZ = Math.round((mdZ - camZ) * MK);
  mdLv = lightAt(mdX, mdY + 0.2, mdZ); mdFog = fog;
  // 1/160 block: a 0.24 block cube, or a thin card
  let s = 19, sz = 19, sh = 38;
  if (ITK[id + 1] != 0) { sz = 4; sh = 46; }
  let k = 0, lx = 0, ly = 0, lz = 0, wx = 0, wy = 0, wz = 0, vz = 0, behind = 0, foc = FOC;
  while (k < 8) {
    if (k >= 4) { lx = s; } else { lx = 0 - s; }
    if (mod(k, 4) >= 2) { ly = sh; } else { ly = 0; }
    if (mod(k, 2) == 1) { lz = sz; } else { lz = 0 - sz; }
    wx = mdOX + (lx * mdCy + lz * mdSy) * 1024; wy = mdOY + ly * 1048576; wz = mdOZ + (lz * mdCy - lx * mdSy) * 1024;
    vz = r31 * wx + r32 * wy + r33 * wz;
    if (vz < 40000000000) { behind = 1; vz = 40000000000; }
    PSX[k + 1] = (r11 * wx + r13 * wz) * foc / vz; PSY[k + 1] = (r21 * wx + r22 * wy + r23 * wz) * foc / vz;
    k = k + 1;
  }
  if (behind == 0) {
    let ct = ITC1[id + 1], cs = ITC2[id + 1];
    boxFace(1, 2, 4, 3, cs, 0); boxFace(5, 7, 8, 6, cs, 1);
    boxFace(1, 5, 6, 2, cs, 2); boxFace(3, 4, 8, 7, ct, 3);
    boxFace(1, 3, 7, 5, cs, 4); boxFace(2, 6, 8, 4, cs, 5);
  }
}
function drawArrow(a, fog) {
  let l = Math.sqrt(AVX[a] * AVX[a] + AVY[a] * AVY[a] + AVZ[a] * AVZ[a]) + 0.001;
  let hx = AXX[a] + AVX[a] / l * 0.25, hy = AYY[a] + AVY[a] / l * 0.25, hz = AZZ[a] + AVZ[a] / l * 0.25;
  let tx = AXX[a] - AVX[a] / l * 0.25, ty = AYY[a] - AVY[a] / l * 0.25, tz = AZZ[a] - AVZ[a] / l * 0.25;
  if (ASTK[a] == 1) { hx = AXX[a]; hy = AYY[a]; hz = AZZ[a]; }
  let dx = hx - camX, dy = hy - camY, dz = hz - camZ, vz = r31 * dx + r32 * dy + r33 * dz;
  let ex = tx - camX, ey = ty - camY, ez = tz - camZ, wz = r31 * ex + r32 * ey + r33 * ez;
  if (vz > 2000 && wz > 2000) {
    let ax = (r11 * dx + r13 * dz) * FOC / vz, ay = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz;
    let bx = (r11 * ex + r13 * ez) * FOC / wz, by = (r21 * ex + r22 * ey + r23 * ez) * FOC / wz;
    let w = 0.03 * 16384 * FOC / vz + 0.4;
    let ux = bx - ax, uy = by - ay, ul = Math.sqrt(ux * ux + uy * uy) + 0.001;
    let nx = 0 - uy / ul * w, ny = ux / ul * w;
    let col = CARROW, kb = 20;
    if (AON[a] == 3) { col = CFLAME; kb = 23; nx = nx * 5; ny = ny * 5; }
    fillStop(); goto(ax + nx, ay + ny); fillColorHex(CT[col + kb * 8 + fog + 1]); fillStart(); goto(bx + nx, by + ny); goto(bx - nx, by - ny); goto(ax - nx, ay - ny);
    nFill = nFill + 1;
  }
}
