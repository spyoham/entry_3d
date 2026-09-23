// ============================================================
// Things: thinkers, monster AI (p_enemy.c), attacks (p_map.c),
// damage / death / pickups (p_inter.c)
// ============================================================
const MELEERANGE = 64;
const MISSILERANGE = 2048;
const DI_NODIR = 8;
const F_JUSTHIT = 4096, F_JUSTATTACKED = 8192, F_AMBUSH = 16384;

let angResult = 0, distResult = 0, sightOk = 0, aimSlope = 0, lineTarget = 0, attackRange = 0;
let lastLook = 0, killsTotal = 0, itemsTotal = 0, secretsTotal = 0;
let plKills = 0, plItems = 0, plSecrets = 0;
// active thinkers (unordered, swap-remove)
let thk = [];
let nThk = 0;
let mThk = [];   // index in thk (0 = not thinking)
let dirX = [1, 0.7071, 0, -0.7071, -1, -0.7071, 0, 0.7071, 0];
let dirY = [0, 0.7071, 1, 0.7071, 0, -0.7071, -1, -0.7071, 0];
let secSoundTarget = [], secSoundValid = [], secSoundBlocks = [];
let soundStack = [], soundStackB = [];

function thingsInit() {
  let i = 0;
  while (i < MAXMOBJ) { thk.push(0); mThk.push(0); i = i + 1; }
  i = 0;
  while (i < NSECTORS) { secSoundTarget.push(0); secSoundValid.push(0); secSoundBlocks.push(0); i = i + 1; }
  i = 0;
  while (i < 256) { soundStack.push(0); soundStackB.push(0); i = i + 1; }
  i = 0;
  while (i < 64) { radList.push(0); i = i + 1; }
}
function addThinker(m) {
  if (mThk[m] == 0) { nThk = nThk + 1; thk[nThk] = m; mThk[m] = nThk; }
}
function removeThinker(m) {
  let k = mThk[m];
  if (k > 0) {
    let last = thk[nThk];
    thk[k] = last; mThk[last] = k;
    thk[nThk] = 0; nThk = nThk - 1;
    mThk[m] = 0;
  }
}

// ---- math helpers ----
function pointAngle(dx, dy) {
  if (dx == 0) {
    angResult = 90;
    if (dy < 0) { angResult = 270; }
  } else {
    angResult = atand(dy / dx);
    if (dx < 0) { angResult = angResult + 180; }
    angResult = mod(angResult, 360);
  }
}
function aproxDist(dx, dy) {
  let ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < ay) { distResult = ax + ay - ax / 2; } else { distResult = ax + ay - ay / 2; }
}
function hasFlag(m, f) {
  sightOk = mod(Math.floor(mFlags[m] / f), 2);
}

// ============================================================
// P_CheckSight: REJECT, then the 2D line between the eyes through the
// blockmap, narrowing the visible slope window at every two-sided line
// ============================================================
function checkSight(a, b) {
  sightOk = 0;
  let pnum = (mSec[a] - 1) * NSECTORS + mSec[b] - 1;
  let byte = rejectB[Math.floor(pnum / 8) + 1];
  if (mod(Math.floor(byte / pw2[mod(pnum, 8) + 1]), 2) == 0) {
    let x1 = mX[a], y1 = mY[a], x2 = mX[b], y2 = mY[b];
    let sz = mZ[a] + mHeight[a] - mHeight[a] / 4;
    let top = mZ[b] + mHeight[b] - sz, bot = mZ[b] - sz;
    let dx = x2 - x1, dy = y2 - y1;
    // blocks along the line (DDA)
    let bx = Math.floor((x1 - BMOX) / 128), by = Math.floor((y1 - BMOY) / 128);
    let ex = Math.floor((x2 - BMOX) / 128), ey = Math.floor((y2 - BMOY) / 128);
    let stepx = 1, stepy = 1;
    if (dx < 0) { stepx = -1; }
    if (dy < 0) { stepy = -1; }
    let tmx = 100000, tmy = 100000, tdx = 100000, tdy = 100000;
    if (dx != 0) {
      let nb = BMOX + (bx + 1) * 128;
      if (dx < 0) { nb = BMOX + bx * 128; }
      tmx = (nb - x1) / dx; tdx = 128 / Math.abs(dx);
    }
    if (dy != 0) {
      let nb = BMOY + (by + 1) * 128;
      if (dy < 0) { nb = BMOY + by * 128; }
      tmy = (nb - y1) / dy; tdy = 128 / Math.abs(dy);
    }
    validCount = validCount + 1;
    let ok = 1, go = 1, guard = 0;
    while (go == 1 && ok == 1 && guard < 64) {
      guard = guard + 1;
      if (bx >= 0 && by >= 0 && bx < BMW && by < BMH) {
        let k = bmOff[by * BMW + bx + 1];
        let ld = bmList[k];
        while (ld > 0 && ok == 1) {
          if (lnValid[ld] != validCount) {
            lnValid[ld] = validCount;
            // segment intersection: sight line vs linedef
            let lx = lnX1[ld], ly = lnY1[ld], ldx = lnDX[ld], ldy = lnDY[ld];
            let den = ldy * dx - ldx * dy;
            if (den != 0) {
              let t = ((lx - x1) * ldy - (ly - y1) * ldx) / den;      // along the sight line
              let s = ((lx - x1) * dy - (ly - y1) * dx) / den;        // along the linedef
              if (t > 0 && t < 1 && s >= 0 && s <= 1) {
                let bs = lnBack[ld];
                if (bs == 0) { ok = 0; }
                else {
                  let fs = lnFront[ld];
                  let ot = secCeil[fs], ob = secFloor[fs];
                  if (secCeil[bs] < ot) { ot = secCeil[bs]; }
                  if (secFloor[bs] > ob) { ob = secFloor[bs]; }
                  if (ot <= ob) { ok = 0; }
                  else {
                    let sl = (ob - sz) / t;
                    if (sl > bot) { bot = sl; }
                    sl = (ot - sz) / t;
                    if (sl < top) { top = sl; }
                    if (top <= bot) { ok = 0; }
                  }
                }
              }
            }
          }
          k = k + 1;
          ld = bmList[k];
        }
      }
      if (bx == ex && by == ey) { go = 0; }
      else {
        // the segment ends inside this block when the next boundary is past its end
        if (tmx > 1 && tmy > 1) { go = 0; }
        else { if (tmx < tmy) { tmx = tmx + tdx; bx = bx + stepx; } else { tmy = tmy + tdy; by = by + stepy; } }
      }
    }
    sightOk = ok;
  }
}

// ============================================================
// P_LineAttack / P_AimLineAttack along a ray through the blockmap.
// Intercepts need no sorting: the nearest blocking line is found first,
// then the nearest thing before it.
// ============================================================
let atkX = 0, atkY = 0, atkZ = 0, atkWallT = 0, atkWallLine = 0;
function traceRay(src, ang, range, slope, aimMode) {
  let x1 = mX[src], y1 = mY[src];
  let sz = mZ[src] + mHeight[src] / 2 + 8;
  let dx = cosd(ang) * range, dy = sind(ang) * range;
  let bx = Math.floor((x1 - BMOX) / 128), by = Math.floor((y1 - BMOY) / 128);
  let ex = Math.floor((x1 + dx - BMOX) / 128), ey = Math.floor((y1 + dy - BMOY) / 128);
  let stepx = 1, stepy = 1;
  if (dx < 0) { stepx = -1; }
  if (dy < 0) { stepy = -1; }
  let tmx = 100000, tmy = 100000, tdx = 100000, tdy = 100000;
  if (Math.abs(dx) > 0.001) {
    let nb = BMOX + (bx + 1) * 128;
    if (dx < 0) { nb = BMOX + bx * 128; }
    tmx = (nb - x1) / dx; tdx = 128 / Math.abs(dx);
  }
  if (Math.abs(dy) > 0.001) {
    let nb = BMOY + (by + 1) * 128;
    if (dy < 0) { nb = BMOY + by * 128; }
    tmy = (nb - y1) / dy; tdy = 128 / Math.abs(dy);
  }
  validCount = validCount + 1;
  let wallT = 1, wallLn = 0;
  let bestT = 2, best = 0, bestSlope = 0;
  let go = 1, guard = 0;
  while (go == 1 && guard < 40) {
    guard = guard + 1;
    if (bx >= 0 && by >= 0 && bx < BMW && by < BMH) {
      let b = by * BMW + bx + 1;
      // lines
      let k = bmOff[b];
      let ld = bmList[k];
      while (ld > 0) {
        if (lnValid[ld] != validCount) {
          lnValid[ld] = validCount;
          let lx = lnX1[ld], ly = lnY1[ld], ldx = lnDX[ld], ldy = lnDY[ld];
          let den = ldy * dx - ldx * dy;
          if (den != 0) {
            let t = ((lx - x1) * ldy - (ly - y1) * ldx) / den;
            let s = ((lx - x1) * dy - (ly - y1) * dx) / den;
            if (t > 0 && t < wallT && s >= 0 && s <= 1) {
              let blocks = 1;
              let bs = lnBack[ld];
              if (bs > 0) {
                let fs = lnFront[ld];
                let ot = secCeil[fs], ob = secFloor[fs];
                if (secCeil[bs] < ot) { ot = secCeil[bs]; }
                if (secFloor[bs] > ob) { ob = secFloor[bs]; }
                let zz = sz + slope * t * range;
                if (aimMode == 1) { zz = sz; }
                if (ot > ob && zz > ob && zz < ot) { blocks = 0; }
                if (aimMode == 1 && ot > ob) { blocks = 0; }
              }
              if (blocks == 1) { wallT = t; wallLn = ld; }
            }
          }
        }
        k = k + 1;
        ld = bmList[k];
      }
      // things
      let m = bmThing[b];
      while (m > 0) {
        if (m != src && mod(Math.floor(mFlags[m] / F_SHOOTABLE), 2) == 1) {
          let ox = mX[m] - x1, oy = mY[m] - y1;
          let t = (ox * dx + oy * dy) / (range * range);
          if (t > 0 && t < bestT) {
            // perpendicular distance to the ray vs the radius
            let px = ox - dx * t, py = oy - dy * t;
            if (Math.abs(px) < mRadius[m] + 2 && Math.abs(py) < mRadius[m] + 2) {
              let dist = t * range;
              let tsl = (mZ[m] + mHeight[m] - sz) / dist, bsl = (mZ[m] - sz) / dist;
              if (aimMode == 1) {
                if (tsl > -0.625 && bsl < 0.625) { bestT = t; best = m; bestSlope = (tsl + bsl) / 2; }
              } else {
                if (slope < tsl && slope > bsl) { bestT = t; best = m; }
              }
            }
          }
        }
        m = mBNext[m];
      }
    }
    if (bx == ex && by == ey) { go = 0; }
    else {
      if (tmx > 1 && tmy > 1) { go = 0; }
      else { if (tmx < tmy) { tmx = tmx + tdx; bx = bx + stepx; } else { tmy = tmy + tdy; by = by + stepy; } }
    }
  }
  lineTarget = 0;
  if (best > 0 && bestT < wallT) {
    lineTarget = best;
    if (aimMode == 1) { aimSlope = bestSlope; }
    atkX = x1 + dx * bestT; atkY = y1 + dy * bestT; atkZ = sz + slope * bestT * range;
  } else {
    if (aimMode == 1) { aimSlope = 0; }
    // stop 4 units short of the wall
    let t = wallT - 4 / range;
    if (t < 0) { t = 0; }
    atkX = x1 + dx * t; atkY = y1 + dy * t; atkZ = sz + slope * t * range;
  }
  atkWallT = wallT; atkWallLine = wallLn;
}
function aimLineAttack(src, ang, range) {
  traceRay(src, ang, range, 0, 1);
}
// hitscan attack with the slope found by aimLineAttack
function lineAttack(src, ang, range, slope, damage) {
  traceRay(src, ang, range, slope, 0);
  if (lineTarget > 0) {
    if (mod(Math.floor(mFlags[lineTarget] / F_NOBLOOD), 2) == 1) { spawnPuff(atkX, atkY, atkZ); }
    else { spawnBlood(atkX, atkY, atkZ); }
    damageMobj(lineTarget, src, src, damage);
  } else {
    if (atkWallLine > 0) {
      // puff (not against the sky)
      let fs = lnFront[atkWallLine];
      if (secSky[fs] == 0 || atkZ < secCeil[fs]) { spawnPuff(atkX, atkY, atkZ); }
      if (lnSpecial[atkWallLine] > 0 && src == plMo) { shootSpecialLine(atkWallLine); }
    }
  }
}
function spawnPuff(x, y, z) {
  spawnMobj(x, y, z + rand(-4, 4), T_PUFF);
  if (spawnResult > 0) {
    mMomZ[spawnResult] = 1; mTics[spawnResult] = mTics[spawnResult] - rand(0, 3);
    if (mTics[spawnResult] < 1) { mTics[spawnResult] = 1; }
    if (attackRange == MELEERANGE) { setMobjState(spawnResult, S_PUFF3); }
    addThinker(spawnResult);
  }
}
function spawnBlood(x, y, z) {
  spawnMobj(x, y, z + rand(-4, 4), T_BLOOD);
  if (spawnResult > 0) {
    mMomZ[spawnResult] = 2; mTics[spawnResult] = mTics[spawnResult] - rand(0, 3);
    if (mTics[spawnResult] < 1) { mTics[spawnResult] = 1; }
    addThinker(spawnResult);
  }
}

// ============================================================
// missiles
// ============================================================
function spawnMissile(src, ang, slope, type) {
  spawnMobj(mX[src], mY[src], mZ[src] + 32, type);
  let m = spawnResult;
  if (m > 0) {
    playSound(tySSee[type]);
    mTarget[m] = src;   // the shooter
    mAng[m] = ang;
    let sp = tySpeed[type];
    mMomX[m] = cosd(ang) * sp; mMomY[m] = sind(ang) * sp; mMomZ[m] = slope * sp;
    addThinker(m);
    // P_CheckMissileSpawn: advance a bit so it does not hit the shooter's wall
    mX[m] = mX[m] + mMomX[m] / 2; mY[m] = mY[m] + mMomY[m] / 2; mZ[m] = mZ[m] + mMomZ[m] / 2;
    tryMove(m, mX[m], mY[m]);
    if (tryOk == 0 && mUsed[m] == 1) { explodeMissile(m); }
  }
}
function explodeMissile(m) {
  if (mUsed[m] == 1 && mod(Math.floor(mFlags[m] / F_MISSILE), 2) == 1) {
    mMomX[m] = 0; mMomY[m] = 0; mMomZ[m] = 0;
    mFlags[m] = F_NOGRAVITY;
    playSound(tySDeath[mType[m]]);
    setMobjState(m, tyDeath[mType[m]]);
    if (mUsed[m] == 1) { mTics[m] = mTics[m] - rand(0, 3); if (mTics[m] < 1) { mTics[m] = 1; } }
  }
}
// missile touched something solid (from checkPosition)
function missileHit(m, t) {
  if (mod(Math.floor(mFlags[t] / F_SHOOTABLE), 2) == 1) {
    damageMobj(t, m, mTarget[m], rand(1, 8) * tyDamage[mType[m]]);
  }
}
// P_RadiusAttack
function radiusAttack(spot, source, damage) {
  let x = mX[spot], y = mY[spot];
  let bx1 = Math.floor((x - damage - MAXRADIUS - BMOX) / 128), bx2 = Math.floor((x + damage + MAXRADIUS - BMOX) / 128);
  let by1 = Math.floor((y - damage - MAXRADIUS - BMOY) / 128), by2 = Math.floor((y + damage + MAXRADIUS - BMOY) / 128);
  if (bx1 < 0) { bx1 = 0; }
  if (by1 < 0) { by1 = 0; }
  if (bx2 > BMW - 1) { bx2 = BMW - 1; }
  if (by2 > BMH - 1) { by2 = BMH - 1; }
  // collect first (damage can unlink things)
  let n = 0;
  let by = by1;
  while (by <= by2) {
    let bx = bx1;
    while (bx <= bx2) {
      let t = bmThing[by * BMW + bx + 1];
      while (t > 0) {
        if (mod(Math.floor(mFlags[t] / F_SHOOTABLE), 2) == 1 && n < 60) { n = n + 1; radList[n] = t; }
        t = mBNext[t];
      }
      bx = bx + 1;
    }
    by = by + 1;
  }
  let i = 1;
  while (i <= n) {
    let t = radList[i];
    let d = Math.abs(mX[t] - x);
    if (Math.abs(mY[t] - y) > d) { d = Math.abs(mY[t] - y); }
    d = d - mRadius[t];
    if (d < 0) { d = 0; }
    if (d < damage && mHealth[t] > 0) {
      checkSight(t, spot);
      if (sightOk == 1) { damageMobj(t, spot, source, damage - d); }
    }
    i = i + 1;
  }
}
let radList = [];

// ============================================================
// P_DamageMobj / P_KillMobj
// ============================================================
function damageMobj(t, inflictor, source, damage) {
  if (mod(Math.floor(mFlags[t] / F_SHOOTABLE), 2) == 1 && mHealth[t] > 0) {
    // thrust (not for the chainsaw)
    if (inflictor > 0 && !(source == plMo && plWeapon == 7)) {
      pointAngle(mX[t] - mX[inflictor], mY[t] - mY[inflictor]);
      let th = damage * 12.5 / tyMass[mType[t]];
      if (t == plMo) { th = damage * 12.5 / 100; }
      if (damage < 40 && damage > mHealth[t] && mZ[t] - mZ[inflictor] > 64 && rand(0, 1) == 1) { angResult = angResult + 180; th = th * 4; }
      mMomX[t] = mMomX[t] + cosd(angResult) * th; mMomY[t] = mMomY[t] + sind(angResult) * th;
      if (t != plMo) { addThinker(t); }
    }
    if (t == plMo) {
      if (skill == 1) { damage = damage / 2; }
      if (plArmorType > 0) {
        let saved = Math.floor(damage / 3);
        if (plArmorType == 2) { saved = Math.floor(damage / 2); }
        if (plArmor <= saved) { saved = plArmor; plArmorType = 0; }
        plArmor = plArmor - saved;
        damage = damage - saved;
      }
      damage = Math.floor(damage);
      plHealth = plHealth - damage;
      if (plHealth < 0) { plHealth = 0; }
      plAttacker = source;
      plDamageCount = plDamageCount + damage;
      if (plDamageCount > 100) { plDamageCount = 100; }
      faceHurt = damage;
      hudDirty = 1;
    }
    mHealth[t] = mHealth[t] - damage;
    if (mHealth[t] <= 0) { killMobj(source, t); }
    else {
      if (t != plMo) {
        if (rand(0, 255) < tyPain[mType[t]]) {
          mFlags[t] = mFlags[t] + F_JUSTHIT * (1 - mod(Math.floor(mFlags[t] / F_JUSTHIT), 2));
          setMobjState(t, tyPainSt[mType[t]]);
        }
        mReact[t] = 0;
        if (mThresh[t] == 0 && source > 0 && source != t) {
          mTarget[t] = source;
          mThresh[t] = 100;
          if (mState[t] == tySpawn[mType[t]] || mState[t] == stNext[tySpawn[mType[t]]]) {
            if (tySee[mType[t]] > 0) { setMobjState(t, tySee[mType[t]]); }
          }
        }
        addThinker(t);
      } else {
        if (plHealth > 0) { playSound('PLPAIN'); }
      }
    }
  }
}
function killMobj(source, t) {
  // flags: not shootable/solid(after A_Fall), corpse
  let f = mFlags[t];
  if (mod(Math.floor(f / F_SHOOTABLE), 2) == 1) { f = f - F_SHOOTABLE; }
  if (mod(Math.floor(f / F_CORPSE), 2) == 0) { f = f + F_CORPSE; }
  mFlags[t] = f;
  mHeight[t] = mHeight[t] / 4;
  if (source == plMo && mod(Math.floor(f / F_COUNTKILL), 2) == 1) { plKills = plKills + 1; hudDirty = 1; }
  if (t == plMo) {
    plHealth = 0;
    playSound('PLDETH');
    if (mHealth[t] < -50) { playSound('SLOP'); }
    msgText = 'You died.  Press SPACE to restart.';
    msgTime = 100000;
  } else {
    let ty = mType[t];
    if (mHealth[t] < 0 - tyHealth[ty] && tyXDeath[ty] > 0) { setMobjState(t, tyXDeath[ty]); }
    else { setMobjState(t, tyDeath[ty]); }
    if (mUsed[t] == 1) {
      mTics[t] = mTics[t] - rand(0, 3);
      if (mTics[t] < 1) { mTics[t] = 1; }
    }
    // drops
    if (tyDrop[ty] > 0) {
      spawnMobj(mX[t], mY[t], -30000, tyDrop[ty]);
      if (spawnResult > 0) { mSpawnTic[spawnResult] = -1; }   // dropped: half ammo
    }
    addThinker(t);
  }
}

// ============================================================
// state machine with actions (P_SetMobjState)
// ============================================================
function setMobjState(m, st) {
  let go = 1, guard = 0;
  while (go == 1 && guard < 10) {
    guard = guard + 1;
    if (st == S_NULL) {
      removeMobj(m);
      go = 0;
    } else {
      mState[m] = st; mTics[m] = stTics[st]; mSpr[m] = stFrame[st]; mFull[m] = stFull[st];
      let a = stAction[st];
      if (a > 0) { mobjAction(m, a); }
      if (mUsed[m] == 0 || mState[m] != st) { go = 0; }
      else { if (mTics[m] != 0) { go = 0; } else { st = stNext[st]; } }
    }
  }
}

function mobjAction(m, a) {
  if (a == A_Look) { aLook(m); }
  if (a == A_Chase) { aChase(m); }
  if (a == A_FaceTarget) { faceTarget(m); }
  if (a == A_PosAttack) {
    if (mTarget[m] > 0) {
      faceTarget(m);
      aimLineAttack(m, mAng[m], MISSILERANGE);
      playSound('PISTOL');
      attackRange = MISSILERANGE;
      lineAttack(m, mAng[m] + (rand(0, 255) - rand(0, 255)) / 11.4, MISSILERANGE, aimSlope, rand(1, 5) * 3);
    }
  }
  if (a == A_SPosAttack) {
    if (mTarget[m] > 0) {
      faceTarget(m);
      aimLineAttack(m, mAng[m], MISSILERANGE);
      let sl = aimSlope;
      playSound('SHOTGN');
      attackRange = MISSILERANGE;
      let i = 0;
      while (i < 3) { lineAttack(m, mAng[m] + (rand(0, 255) - rand(0, 255)) / 11.4, MISSILERANGE, sl, rand(1, 5) * 3); i = i + 1; }
    }
  }
  if (a == A_TroopAttack) {
    if (mTarget[m] > 0) {
      faceTarget(m);
      checkMelee(m);
      if (sightOk == 1) {
        playSound('CLAW');
        damageMobj(mTarget[m], m, m, rand(1, 8) * 3);
      } else {
        let tg = mTarget[m];
        aproxDist(mX[tg] - mX[m], mY[tg] - mY[m]);
        let sl = 0;
        if (distResult > 1) { sl = (mZ[tg] + mHeight[tg] / 2 - mZ[m] - 32) / distResult; }
        spawnMissile(m, mAng[m], sl, T_TROOPSHOT);
      }
    }
  }
  if (a == A_SargAttack) {
    if (mTarget[m] > 0) {
      faceTarget(m);
      checkMelee(m);
      if (sightOk == 1) { damageMobj(mTarget[m], m, m, rand(1, 10) * 4); }
    }
  }
  if (a == A_Pain) { playSound(tySPain[mType[m]]); }
  if (a == A_Scream) {
    let s = tySDeath[mType[m]];
    if (s == 'PODTH1') { s = str('PODTH', rand(1, 3)); }
    if (s == 'BGDTH1') { s = str('BGDTH', rand(1, 2)); }
    playSound(s);
  }
  if (a == A_XScream) { playSound('SLOP'); }
  if (a == A_Fall) {
    if (mod(mFlags[m], 2) == 1) { mFlags[m] = mFlags[m] - F_SOLID; }
  }
  if (a == A_Explode) { radiusAttack(m, mTarget[m], 128); }
  if (a == A_BarrelScream) { playSound('BAREXP'); }
  if (a == A_Remove) { removeMobj(m); }
}

function faceTarget(m) {
  let t = mTarget[m];
  if (t > 0) {
    if (mod(Math.floor(mFlags[m] / F_AMBUSH), 2) == 1) { mFlags[m] = mFlags[m] - F_AMBUSH; }
    pointAngle(mX[t] - mX[m], mY[t] - mY[m]);
    mAng[m] = angResult;
    if (mod(Math.floor(mFlags[t] / F_SHADOW), 2) == 1) { mAng[m] = mAng[m] + (rand(0, 255) - rand(0, 255)) / 5.7; }
  }
}
// sightOk = target in melee range and visible
function checkMelee(m) {
  sightOk = 0;
  let t = mTarget[m];
  if (t > 0) {
    aproxDist(mX[t] - mX[m], mY[t] - mY[m]);
    if (distResult < MELEERANGE - 20 + mRadius[t]) { checkSight(m, t); }
  }
}

// A_Look: wake up when the player is seen, or heard (sector sound target)
function aLook(m) {
  mThresh[m] = 0;
  let found = 0;
  let st = secSoundTarget[mSec[m]];
  if (st > 0 && plHealth > 0) {
    mTarget[m] = plMo;
    found = 1;
    if (mod(Math.floor(mFlags[m] / F_AMBUSH), 2) == 1) {
      checkSight(m, plMo);
      found = sightOk;
    }
  }
  if (found == 0) {
    lookForPlayer(m, 0);
    found = sightOk;
  }
  if (found == 1) {
    let s = tySSee[mType[m]];
    if (s == 'POSIT1') { s = str('POSIT', rand(1, 3)); }
    if (s == 'BGSIT1') { s = str('BGSIT', rand(1, 2)); }
    if (s != '') { playSound(s); }
    setMobjState(m, tySee[mType[m]]);
  }
}
// P_LookForPlayers (single player) -> sightOk
function lookForPlayer(m, allAround) {
  sightOk = 0;
  if (plHealth > 0) {
    checkSight(m, plMo);
    if (sightOk == 1 && allAround == 0) {
      pointAngle(mX[plMo] - mX[m], mY[plMo] - mY[m]);
      let an = mod(angResult - mAng[m], 360);
      if (an > 90 && an < 270) {
        aproxDist(mX[plMo] - mX[m], mY[plMo] - mY[m]);
        if (distResult > MELEERANGE) { sightOk = 0; }
      }
    }
    if (sightOk == 1) { mTarget[m] = plMo; }
  }
}

function aChase(m) {
  let ty = mType[m];
  if (mReact[m] > 0) { mReact[m] = mReact[m] - 1; }
  if (mThresh[m] > 0) {
    if (mTarget[m] == 0) { mThresh[m] = 0; }
    else { if (mHealth[mTarget[m]] <= 0) { mThresh[m] = 0; } else { mThresh[m] = mThresh[m] - 1; } }
  }
  // turn toward the movement direction (45 deg steps)
  if (mMoveDir[m] < 8) {
    let target = mMoveDir[m] * 45;
    let delta = mod(mAng[m] - target + 180, 360) - 180;
    if (delta > 0) { mAng[m] = mod(mAng[m] - 45, 360); }
    if (delta < 0) { mAng[m] = mod(mAng[m] + 45, 360); }
    if (Math.abs(delta) < 45) { mAng[m] = target; }
  }
  let t = mTarget[m];
  let done = 0;
  let tvalid = 0;
  if (t > 0) { if (mod(Math.floor(mFlags[t] / F_SHOOTABLE), 2) == 1) { tvalid = 1; } }
  if (tvalid == 0) {
    lookForPlayer(m, 1);
    if (sightOk == 0) { setMobjState(m, tySpawn[ty]); }
    done = 1;
  }
  if (done == 0 && mod(Math.floor(mFlags[m] / F_JUSTATTACKED), 2) == 1) {
    mFlags[m] = mFlags[m] - F_JUSTATTACKED;
    newChaseDir(m);
    done = 1;
  }
  if (done == 0 && tyMelee[ty] > 0) {
    checkMelee(m);
    if (sightOk == 1) {
      if (tySAttack[ty] != '') { playSound(tySAttack[ty]); }
      setMobjState(m, tyMelee[ty]);
      done = 1;
    }
  }
  if (done == 0 && tyMissile[ty] > 0 && mMoveCount[m] == 0) {
    checkMissileRange(m);
    if (sightOk == 1) {
      setMobjState(m, tyMissile[ty]);
      mFlags[m] = mFlags[m] + F_JUSTATTACKED * (1 - mod(Math.floor(mFlags[m] / F_JUSTATTACKED), 2));
      done = 1;
    }
  }
  if (done == 0) {
    mMoveCount[m] = mMoveCount[m] - 1;
    let moved = 0;
    if (mMoveCount[m] >= 0) { monsterMove(m); moved = tryOk; }
    if (moved == 0) { newChaseDir(m); }
    if (tySActive[ty] != '' && rand(0, 255) < 3) { playSound(tySActive[ty]); }
  }
}
function checkMissileRange(m) {
  let t = mTarget[m];
  checkSight(m, t);
  if (sightOk == 1) {
    if (mod(Math.floor(mFlags[m] / F_JUSTHIT), 2) == 1) {
      mFlags[m] = mFlags[m] - F_JUSTHIT;
    } else {
      if (mReact[m] > 0) { sightOk = 0; }
      else {
        aproxDist(mX[t] - mX[m], mY[t] - mY[m]);
        let d = distResult - 64;
        if (tyMelee[mType[m]] == 0) { d = d - 128; }
        if (d > 200) { d = 200; }
        if (rand(0, 255) < d) { sightOk = 0; }
      }
    }
  }
}
// P_Move -> tryOk
function monsterMove(m) {
  tryOk = 0;
  let d = mMoveDir[m];
  if (d != DI_NODIR) {
    let sp = tySpeed[mType[m]];
    tryMove(m, mX[m] + sp * dirX[d + 1], mY[m] + sp * dirY[d + 1]);
    if (tryOk == 0) {
      // open doors in the way
      if (nSpecHit > 0) {
        mMoveDir[m] = DI_NODIR;
        let k = nSpecHit;
        while (k > 0) {
          useSpecialLine(m, specHit[k]);
          if (useOk == 1) { tryOk = 1; }
          k = k - 1;
        }
      }
    } else {
      mZ[m] = mFloorZ[m];
    }
  }
}
function tryWalk(m) {
  monsterMove(m);
  if (tryOk == 1) { mMoveCount[m] = rand(0, 15); }
}
function newChaseDir(m) {
  let t = mTarget[m];
  if (t > 0) {
    let old = mMoveDir[m];
    let turnaround = DI_NODIR;
    if (old < 8) { turnaround = mod(old + 4, 8); }
    let dx = mX[t] - mX[m], dy = mY[t] - mY[m];
    let d1 = DI_NODIR, d2 = DI_NODIR;
    if (dx > 10) { d1 = 0; }
    if (dx < -10) { d1 = 4; }
    if (dy < -10) { d2 = 6; }
    if (dy > 10) { d2 = 2; }
    let done = 0;
    if (d1 != DI_NODIR && d2 != DI_NODIR) {
      // diagonal
      let dg = 1;
      if (d1 == 4 && d2 == 2) { dg = 3; }
      if (d1 == 4 && d2 == 6) { dg = 5; }
      if (d1 == 0 && d2 == 6) { dg = 7; }
      if (dg != turnaround) { mMoveDir[m] = dg; tryWalk(m); done = tryOk; }
    }
    if (done == 0) {
      if (rand(0, 255) > 200 || Math.abs(dy) > Math.abs(dx)) { let tmp = d1; d1 = d2; d2 = tmp; }
      if (d1 == turnaround) { d1 = DI_NODIR; }
      if (d2 == turnaround) { d2 = DI_NODIR; }
      if (d1 != DI_NODIR) { mMoveDir[m] = d1; tryWalk(m); done = tryOk; }
    }
    if (done == 0 && d2 != DI_NODIR) { mMoveDir[m] = d2; tryWalk(m); done = tryOk; }
    if (done == 0 && old != DI_NODIR) { mMoveDir[m] = old; tryWalk(m); done = tryOk; }
    if (done == 0) {
      let k = 0, start = 0, step = 1;
      if (rand(0, 1) == 1) { start = 7; step = -1; }
      while (k < 8 && done == 0) {
        let td = start + k * step;
        if (td != turnaround) { mMoveDir[m] = td; tryWalk(m); done = tryOk; }
        k = k + 1;
      }
    }
    if (done == 0 && turnaround != DI_NODIR) { mMoveDir[m] = turnaround; tryWalk(m); done = tryOk; }
    if (done == 0) { mMoveDir[m] = DI_NODIR; }
  }
}

// ============================================================
// P_NoiseAlert: flood the player's sound through open sector boundaries
// ============================================================
function noiseAlert() {
  soundValid = soundValid + 1;
  let sp = 1;
  soundStack[1] = mSec[plMo]; soundStackB[1] = 0;
  while (sp > 0) {
    let sec = soundStack[sp], blk = soundStackB[sp];
    sp = sp - 1;
    if (!(secSoundValid[sec] == soundValid && secSoundBlocks[sec] <= blk + 1)) {
      secSoundValid[sec] = soundValid; secSoundBlocks[sec] = blk + 1;
      secSoundTarget[sec] = plMo;
      let k = secLineFirst[sec], e = secLineFirst[sec] + secLineCount[sec];
      while (k < e) {
        let ld = secLines[k];
        let bs = lnBack[ld];
        if (bs > 0) {
          let fs = lnFront[ld];
          let ot = secCeil[fs], ob = secFloor[fs];
          if (secCeil[bs] < ot) { ot = secCeil[bs]; }
          if (secFloor[bs] > ob) { ob = secFloor[bs]; }
          if (ot > ob) {
            let other = fs;
            if (fs == sec) { other = bs; }
            let sb = mod(Math.floor(lnFlags[ld] / 64), 2);
            if (sp < 250) {
              if (sb == 1) { if (blk == 0) { sp = sp + 1; soundStack[sp] = other; soundStackB[sp] = 1; } }
              else { sp = sp + 1; soundStack[sp] = other; soundStackB[sp] = blk; }
            }
          }
        }
        k = k + 1;
      }
    }
  }
}
let soundValid = 0;

// ============================================================
// thinkers (P_MobjThinker) for all active mobjs
// ============================================================
function runThinkers() {
  let i = 1;
  while (i <= nThk) {
    let m = thk[i];
    let keep = 1;
    if (mMomX[m] != 0 || mMomY[m] != 0) { xyMovement(m); }
    if (mUsed[m] == 1) {
      if (mZ[m] != mFloorZ[m] || mMomZ[m] != 0) { zMovement(m); }
    }
    if (mUsed[m] == 1) {
      if (mTics[m] != -1) {
        mTics[m] = mTics[m] - 1;
        if (mTics[m] <= 0) { setMobjState(m, stNext[mState[m]]); }
      } else {
        if (mMomX[m] == 0 && mMomY[m] == 0 && mMomZ[m] == 0 && mZ[m] <= mFloorZ[m]) { keep = 0; }
      }
    }
    if (mUsed[m] == 0 || keep == 0) {
      removeThinker(m);   // swaps the last one into slot i
    } else {
      i = i + 1;
    }
  }
}

// pickups (P_TouchSpecialThing)
function touchSpecial(t) {
  if (plHealth > 0 && mUsed[t] == 1 && mZ[t] <= mZ[plMo] + mHeight[plMo] && mZ[t] + 8 >= mZ[plMo]) {
    let ty = mType[t];
    let kind = tyPKind[ty], amt = tyPAmount[ty];
    let took = 1;
    let snd = 'ITEMUP';
    let msg = tyPMsg[ty];
    if (kind >= 1 && kind <= 4) {
      let n = amt;
      if (mSpawnTic[t] == -1) { n = Math.floor(amt / 2); if (n < 1) { n = 1; } }
      giveAmmo(kind, n);
      took = giveOk;
    }
    if (kind == 5) {
      if (plBackpack == 0) { let a = 1; while (a <= 4) { plMaxAmmo[a] = plMaxAmmo[a] * 2; a = a + 1; } plBackpack = 1; }
      giveAmmo(1, 10); giveAmmo(2, 4); giveAmmo(3, 1); giveAmmo(4, 20);
      took = 1;
    }
    if (kind == 6) {
      if (plHealth >= 100) { took = 0; } else {
        if (amt == 25 && plHealth < 25) { msg = 'Picked up a medikit that you REALLY need!'; }
        plHealth = plHealth + amt;
        if (plHealth > 100) { plHealth = 100; }
      }
    }
    if (kind == 7) { plHealth = plHealth + 1; if (plHealth > 200) { plHealth = 200; } }
    if (kind == 8) { plArmor = plArmor + 1; if (plArmor > 200) { plArmor = 200; } if (plArmorType == 0) { plArmorType = 1; } }
    if (kind == 9) {
      if (plArmor >= amt) { took = 0; } else { plArmor = amt; plArmorType = amt / 100; }
    }
    if (kind == 10) { plHealth = plHealth + 100; if (plHealth > 200) { plHealth = 200; } snd = 'GETPOW'; }
    if (kind == 11) {
      plBerserk = 1; if (plHealth < 100) { plHealth = 100; }
      if (plWeapon != 1) { plPending = 1; }
      snd = 'GETPOW';
    }
    if (kind == 12) {
      if (plKeys[amt] == 0) { plKeys[amt] = 1; } else { took = 0; }
      snd = 'ITEMUP';
    }
    if (kind == 13) {
      // weapon: amt = weapon number
      let had = plOwned[amt];
      let ammo = wpAmmo[amt];
      giveOk = 0;
      if (ammo > 0) {
        let n = clipAmmo[ammo] * 2;
        if (mSpawnTic[t] == -1) { n = clipAmmo[ammo]; }
        giveAmmo(ammo, n);
      }
      if (had == 0) { plOwned[amt] = 1; plPending = amt; giveOk = 1; }
      took = giveOk;
      snd = 'WPNUP';
      if (took == 1) { faceGrin = 30; }
    }
    if (took == 1) {
      if (mod(Math.floor(mFlags[t] / F_COUNTITEM), 2) == 1) { plItems = plItems + 1; }
      removeMobj(t);
      plBonusCount = plBonusCount + 6;
      playSound(snd);
      msgText = msg; msgTime = 140;
      hudDirty = 1;
    }
  }
}
let giveOk = 0;
let clipAmmo = [10, 4, 1, 20];
// P_GiveAmmo (num = rounds)
function giveAmmo(a, num) {
  giveOk = 0;
  if (plAmmo[a] < plMaxAmmo[a]) {
    if (skill == 1 || skill == 5) { num = num * 2; }
    let old = plAmmo[a];
    plAmmo[a] = plAmmo[a] + num;
    if (plAmmo[a] > plMaxAmmo[a]) { plAmmo[a] = plMaxAmmo[a]; }
    giveOk = 1;
    // switch up when the current weapon is weak
    if (old == 0) {
      if (a == 1 && plWeapon == 1) { if (plOwned[4] == 1) { plPending = 4; } else { plPending = 2; } }
      if (a == 2 && (plWeapon == 1 || plWeapon == 2)) { if (plOwned[3] == 1) { plPending = 3; } }
      if (a == 4 && (plWeapon == 1 || plWeapon == 2)) { if (plOwned[6] == 1) { plPending = 6; } }
    }
  }
}
