// ============================================================
// Game core: things (mobjs), movement/collision (p_map.c), player
// ============================================================
const MAXMOBJ = 700;
const VIEWHEIGHT = 41;
const MAXSTEP = 24;
const FRICTION = 0.90625;
const GRAVITY = 1;
const PLAYERRADIUS = 16;
const MAXRADIUS = 32;
// mobj flags (info.mjs MF)
const F_SOLID = 1, F_SHOOTABLE = 2, F_SPECIAL = 4, F_COUNTKILL = 8, F_COUNTITEM = 16, F_SHADOW = 32, F_MISSILE = 64, F_NOBLOOD = 128, F_CORPSE = 256, F_FLOAT = 512, F_SPAWNCEIL = 1024, F_NOGRAVITY = 2048;

// ---- view (read by the renderer) ----
let vx = 0, vy = 0, vz = 0, vang = 0;
// ---- player ----
let plX = 0, plY = 0, plZ = 0, plAng = 0, plMomX = 0, plMomY = 0, plMomZ = 0, plMo = 0;
let plViewH = VIEWHEIGHT, plDeltaVH = 0, plBob = 0, plFloorZ = 0, plCeilZ = 0, plSec = 0;
let gametic = 0, levelTime = 0, tAccum = 0, tLast = 0;
// ---- collision scratch (P_CheckPosition results) ----
let tmX = 0, tmY = 0, tmFloorZ = 0, tmCeilZ = 0, tmDropZ = 0, tmOk = 0, tmThing = 0, tmBT = 0, tmBB = 0, tmBL = 0, tmBR = 0, tmHit = 0;
let validCount = 0, psResult = 0, psSS = 0, nSpecHit = 0;

// mobj arrays (1..MAXMOBJ)
let mX = [], mY = [], mZ = [], mAng = [], mSpr = [], mFull = [], mSSNext = [], mSSPrev = [], mSec = [], mSS = [];
let mType = [], mState = [], mTics = [], mFlags = [], mHealth = [], mRadius = [], mHeight = [];
let mMomX = [], mMomY = [], mMomZ = [], mFloorZ = [], mCeilZ = [], mBlock = [], mBNext = [], mBPrev = [];
let mTarget = [], mMoveDir = [], mMoveCount = [], mReact = [], mThresh = [], mUsed = [], mValid = [], mSpawnTic = [];
let freeHead = 0;
let ssThing = [], bmThing = [];
let specHit = [];

function gameInit() {
  let i = 0;
  while (i < MAXMOBJ) {
    mX.push(0); mY.push(0); mZ.push(0); mAng.push(0); mSpr.push(0); mFull.push(0); mSSNext.push(0); mSSPrev.push(0); mSec.push(0); mSS.push(0);
    mType.push(0); mState.push(0); mTics.push(0); mFlags.push(0); mHealth.push(0); mRadius.push(0); mHeight.push(0);
    mMomX.push(0); mMomY.push(0); mMomZ.push(0); mFloorZ.push(0); mCeilZ.push(0); mBlock.push(0); mBNext.push(0); mBPrev.push(0);
    mTarget.push(0); mMoveDir.push(0); mMoveCount.push(0); mReact.push(0); mThresh.push(0); mUsed.push(0); mValid.push(0); mSpawnTic.push(0);
    i = i + 1;
  }
  i = 0;
  while (i < NSUBSECTORS) { ssThing.push(0); i = i + 1; }
  i = 0;
  while (i < BMW * BMH) { bmThing.push(0); i = i + 1; }
  i = 0;
  while (i < 64) { specHit.push(0); i = i + 1; }
  // free list through mSSNext
  i = MAXMOBJ;
  freeHead = 0;
  while (i > 0) { mSSNext[i] = freeHead; freeHead = i; i = i - 1; }
}

// ---- BSP point location -> psResult = sector ----
function pointSector(x, y) {
  let n = ROOTNODE;
  while (n > 0) {
    if ((y - ndY[n]) * ndDX[n] < (x - ndX[n]) * ndDY[n]) { n = ndC0[n]; } else { n = ndC1[n]; }
  }
  psSS = 0 - n;
  psResult = ssSec[psSS];
}

// ---- links ----
function unlinkThing(m) {
  // subsector list
  let p = mSSPrev[m], nx = mSSNext[m];
  if (p > 0) { mSSNext[p] = nx; } else { ssThing[mSS[m]] = nx; }
  if (nx > 0) { mSSPrev[nx] = p; }
  // block list
  let b = mBlock[m];
  if (b > 0) {
    p = mBPrev[m]; nx = mBNext[m];
    if (p > 0) { mBNext[p] = nx; } else { bmThing[b] = nx; }
    if (nx > 0) { mBPrev[nx] = p; }
  }
}
function linkThing(m) {
  pointSector(mX[m], mY[m]);
  let s = psSS;
  mSec[m] = psResult; mSS[m] = s;
  mSSPrev[m] = 0; mSSNext[m] = ssThing[s];
  if (ssThing[s] > 0) { mSSPrev[ssThing[s]] = m; }
  ssThing[s] = m;
  let bx = Math.floor((mX[m] - BMOX) / 128), by = Math.floor((mY[m] - BMOY) / 128);
  mBlock[m] = 0;
  if (bx >= 0 && by >= 0 && bx < BMW && by < BMH) {
    let b = by * BMW + bx + 1;
    mBlock[m] = b;
    mBPrev[m] = 0; mBNext[m] = bmThing[b];
    if (bmThing[b] > 0) { mBPrev[bmThing[b]] = m; }
    bmThing[b] = m;
  }
}

// ---- state machine ----
function setState(m, st) {
  mState[m] = st;
  mTics[m] = stTics[st];
  mSpr[m] = stFrame[st];
  mFull[m] = stFull[st];
}

// ---- spawn ----
let spawnResult = 0;
function spawnMobj(x, y, z, type) {
  let m = freeHead;
  spawnResult = 0;
  if (m > 0) {
    freeHead = mSSNext[m];
    mUsed[m] = 1;
    mX[m] = x; mY[m] = y; mType[m] = type; mAng[m] = 0;
    mFlags[m] = tyFlags[type]; mHealth[m] = tyHealth[type]; mRadius[m] = tyRadius[type]; mHeight[m] = tyHeight[type];
    mMomX[m] = 0; mMomY[m] = 0; mMomZ[m] = 0; mTarget[m] = 0; mMoveDir[m] = 8; mMoveCount[m] = 0; mReact[m] = 8; mThresh[m] = 0;
    mSpawnTic[m] = gametic;
    setState(m, tySpawn[type]);
    linkThing(m);
    mFloorZ[m] = secFloor[mSec[m]]; mCeilZ[m] = secCeil[mSec[m]];
    mZ[m] = z;
    if (z == -30000) { mZ[m] = mFloorZ[m]; }
    if (z == 30000) { mZ[m] = mCeilZ[m] - mHeight[m]; }
    spawnResult = m;
  }
}
function removeMobj(m) {
  unlinkThing(m);
  mUsed[m] = 0; mSpr[m] = 0;
  mSSNext[m] = freeHead; freeHead = m;
}

// ============================================================
// P_CheckPosition / P_TryMove (lines + things through the blockmap)
// ============================================================
function checkPosition(m, x, y) {
  let r = mRadius[m];
  tmThing = m; tmX = x; tmY = y; tmOk = 1; tmHit = 0;
  tmBT = y + r; tmBB = y - r; tmBL = x - r; tmBR = x + r;
  pointSector(x, y);
  tmFloorZ = secFloor[psResult]; tmDropZ = tmFloorZ; tmCeilZ = secCeil[psResult];
  validCount = validCount + 1;
  nSpecHit = 0;
  let isMissile = mod(Math.floor(mFlags[m] / F_MISSILE), 2);
  let mySolid = mod(mFlags[m], 2);
  // things
  let bx1 = Math.floor((tmBL - BMOX - MAXRADIUS) / 128), bx2 = Math.floor((tmBR - BMOX + MAXRADIUS) / 128);
  let by1 = Math.floor((tmBB - BMOY - MAXRADIUS) / 128), by2 = Math.floor((tmBT - BMOY + MAXRADIUS) / 128);
  if (bx1 < 0) { bx1 = 0; }
  if (by1 < 0) { by1 = 0; }
  if (bx2 > BMW - 1) { bx2 = BMW - 1; }
  if (by2 > BMH - 1) { by2 = BMH - 1; }
  let by = by1;
  while (by <= by2 && tmOk == 1) {
    let bx = bx1;
    while (bx <= bx2 && tmOk == 1) {
      let t = bmThing[by * BMW + bx + 1];
      while (t > 0 && tmOk == 1) {
        if (t != m) {
          let fl = mFlags[t];
          if (mod(fl, 2) == 1 || mod(Math.floor(fl / F_SPECIAL), 2) == 1) {
            let bl = mRadius[t] + r;
            if (Math.abs(mX[t] - x) < bl && Math.abs(mY[t] - y) < bl) {
              if (mod(Math.floor(fl / F_SPECIAL), 2) == 1) {
                // pickups: only the player collects
                if (m == plMo) { touchSpecial(t); }
              } else {
                if (isMissile == 1) {
                  // missile hits a solid thing (not its shooter)
                  if (t != mTarget[m]) {
                    if (mZ[m] <= mZ[t] + mHeight[t] && mZ[m] + mHeight[m] >= mZ[t]) { tmOk = 0; tmHit = t; }
                  }
                } else {
                  if (mySolid == 1) { tmOk = 0; tmHit = t; }
                }
              }
            }
          }
        }
        t = mBNext[t];
      }
      bx = bx + 1;
    }
    by = by + 1;
  }
  // lines
  bx1 = Math.floor((tmBL - BMOX) / 128); bx2 = Math.floor((tmBR - BMOX) / 128);
  by1 = Math.floor((tmBB - BMOY) / 128); by2 = Math.floor((tmBT - BMOY) / 128);
  if (bx1 < 0) { bx1 = 0; }
  if (by1 < 0) { by1 = 0; }
  if (bx2 > BMW - 1) { bx2 = BMW - 1; }
  if (by2 > BMH - 1) { by2 = BMH - 1; }
  by = by1;
  while (by <= by2 && tmOk == 1) {
    let bx = bx1;
    while (bx <= bx2 && tmOk == 1) {
      let k = bmOff[by * BMW + bx + 1];
      let ld = bmList[k];
      while (ld > 0 && tmOk == 1) {
        if (lnValid[ld] != validCount) {
          lnValid[ld] = validCount;
          if (tmBR > lnBL[ld] && tmBL < lnBR[ld] && tmBT > lnBB[ld] && tmBB < lnBT[ld]) {
            // box on line side
            let x1 = lnX1[ld], y1 = lnY1[ld], dx = lnDX[ld], dy = lnDY[ld];
            let s1 = dy * (tmBL - x1) - dx * (tmBT - y1), s2 = dy * (tmBR - x1) - dx * (tmBT - y1);
            let s3 = dy * (tmBL - x1) - dx * (tmBB - y1), s4 = dy * (tmBR - x1) - dx * (tmBB - y1);
            let pos = 0, neg = 0;
            if (s1 > 0) { pos = pos + 1; } else { neg = neg + 1; }
            if (s2 > 0) { pos = pos + 1; } else { neg = neg + 1; }
            if (s3 > 0) { pos = pos + 1; } else { neg = neg + 1; }
            if (s4 > 0) { pos = pos + 1; } else { neg = neg + 1; }
            if (pos > 0 && neg > 0) {
              let bsec = lnBack[ld];
              if (bsec == 0) { tmOk = 0; }
              else {
                let lf = lnFlags[ld];
                if (isMissile == 0 && mod(lf, 2) == 1) { tmOk = 0; }
                if (m != plMo && mod(Math.floor(lf / 2), 2) == 1) { tmOk = 0; }
                if (tmOk == 1) {
                  let fsec = lnFront[ld];
                  let ot = secCeil[fsec], ob = secFloor[fsec], lo = secFloor[bsec];
                  if (secCeil[bsec] < ot) { ot = secCeil[bsec]; }
                  if (secFloor[bsec] > ob) { ob = secFloor[bsec]; lo = secFloor[fsec]; }
                  if (ot < tmCeilZ) { tmCeilZ = ot; }
                  if (ob > tmFloorZ) { tmFloorZ = ob; }
                  if (lo < tmDropZ) { tmDropZ = lo; }
                  if (lnSpecial[ld] > 0 && nSpecHit < 64) { nSpecHit = nSpecHit + 1; specHit[nSpecHit] = ld; }
                }
              }
            }
          }
        }
        k = k + 1;
        ld = bmList[k];
      }
      bx = bx + 1;
    }
    by = by + 1;
  }
}

let tryOk = 0;
function tryMove(m, x, y) {
  tryOk = 0;
  checkPosition(m, x, y);
  if (tmOk == 1) {
    let ok = 1;
    if (tmCeilZ - tmFloorZ < mHeight[m]) { ok = 0; }
    if (tmCeilZ - mZ[m] < mHeight[m]) { ok = 0; }
    if (tmFloorZ - mZ[m] > MAXSTEP) { ok = 0; }
    if (mod(Math.floor(mFlags[m] / F_MISSILE), 2) == 1) {
      ok = 1;
      if (tmCeilZ - tmFloorZ < mHeight[m] || mZ[m] + mHeight[m] > tmCeilZ || mZ[m] < tmFloorZ) { ok = 0; }
    } else {
      if (m != plMo && tmFloorZ - tmDropZ > MAXSTEP && mod(Math.floor(mFlags[m] / F_FLOAT), 2) == 0) { ok = 0; }
    }
    if (ok == 1) {
      let ox = mX[m], oy = mY[m];
      unlinkThing(m);
      mFloorZ[m] = tmFloorZ; mCeilZ[m] = tmCeilZ;
      mX[m] = x; mY[m] = y;
      linkThing(m);
      tryOk = 1;
      // crossed special lines (walk triggers)
      if (nSpecHit > 0) {
        let k = nSpecHit;
        while (k > 0) {
          let ld = specHit[k];
          let x1 = lnX1[ld], y1 = lnY1[ld], dx = lnDX[ld], dy = lnDY[ld];
          let so = dy * (ox - x1) - dx * (oy - y1), sn = dy * (x - x1) - dx * (y - y1);
          if ((so > 0 && sn <= 0) || (so <= 0 && sn > 0)) { crossSpecialLine(ld, m); }
          k = k - 1;
        }
      }
    }
  }
}

// ---- P_XYMovement for any mobj (players slide, missiles explode) ----
function xyMovement(m) {
  let mx = mMomX[m], my = mMomY[m];
  let isMissile = mod(Math.floor(mFlags[m] / F_MISSILE), 2);
  let steps = 1;
  if (Math.abs(mx) > 15 || Math.abs(my) > 15) { steps = 2; }
  if (Math.abs(mx) > 30 || Math.abs(my) > 30) { steps = 3; }
  let sx = mx / steps, sy = my / steps;
  let k = 0;
  while (k < steps && mUsed[m] == 1) {
    tryMove(m, mX[m] + sx, mY[m] + sy);
    if (tryOk == 0) {
      if (isMissile == 1) {
        if (tmHit > 0) { missileHit(m, tmHit); }
        explodeMissile(m); k = steps;
      } else {
        // slide: try each axis alone
        tryMove(m, mX[m] + sx, mY[m]);
        if (tryOk == 0) {
          mMomX[m] = 0; sx = 0;
          tryMove(m, mX[m], mY[m] + sy);
          if (tryOk == 0) { mMomY[m] = 0; sy = 0; }
        } else { mMomY[m] = 0; sy = 0; }
      }
    }
    k = k + 1;
  }
  if (mUsed[m] == 1 && isMissile == 0) {
    if (mZ[m] <= mFloorZ[m]) {
      mMomX[m] = mMomX[m] * FRICTION; mMomY[m] = mMomY[m] * FRICTION;
      if (Math.abs(mMomX[m]) < 0.06 && Math.abs(mMomY[m]) < 0.06) { mMomX[m] = 0; mMomY[m] = 0; }
    }
  }
}
function zMovement(m) {
  // floor/ceiling may move (doors, lifts): refresh from the sector
  let z = mZ[m] + mMomZ[m];
  if (mod(Math.floor(mFlags[m] / F_NOGRAVITY), 2) == 0) {
    if (z > mFloorZ[m]) { mMomZ[m] = mMomZ[m] - GRAVITY; if (mMomZ[m] < -40) { mMomZ[m] = -40; } }
  }
  if (z <= mFloorZ[m]) {
    if (m == plMo && mMomZ[m] < -8) { plDeltaVH = mMomZ[m] / 8; }
    z = mFloorZ[m];
    if (mMomZ[m] < 0) { mMomZ[m] = 0; }
    if (mod(Math.floor(mFlags[m] / F_MISSILE), 2) == 1) { explodeMissile(m); }
  }
  if (mUsed[m] == 1) {
    if (z + mHeight[m] > mCeilZ[m]) {
      z = mCeilZ[m] - mHeight[m];
      if (mMomZ[m] > 0) { mMomZ[m] = 0; }
      if (mod(Math.floor(mFlags[m] / F_MISSILE), 2) == 1) { explodeMissile(m); }
    }
    mZ[m] = z;
  }
}
