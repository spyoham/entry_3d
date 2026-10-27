// ===================================================================== bots
// Near the player (FULL): they move with collisions, see (a view cone, line of sight, a detection
// meter that fills faster for a close, moving or shooting target), hear (shots, steps), and fight
// with a reaction time, an aim error that settles while they track, lead, recoil, bursts, strafing,
// cover and peeking. Far away (ABSTRACT): they walk the nav graph, loot what is really there and
// fight each other by a model of their guns, armour and skill.
const MD_LOOT = 1, MD_MOVE = 2, MD_FIGHT = 3, MD_HEAL = 4, MD_HOLD = 5;
let AMODE = [], ATGT = [], ALX = [], ALY = [], ALZ = [], ALT = [], AVIS = [], AREACT = [], AERR = [], AERX = [], AERY = [];
let ASKILL = [], AAGR = [], ADEC = [], APER = [], AFULL = [], AGOAL = [], AGK = [], ADX = [], ADZ = [];
let ACOV = [], ACX = [], ACZ = [], APEEK = [], APEEKT = [], ASTR = [], ASTRT = [], ASTK = [], ASPX = [], ASPZ = [];
let AHX = [], AHZ = [], AHT = [], AALERT = [], ALOOTB = [], ALOOTT = [], ABURST = [], ABURSTT = [], AHEAD = [];
let ATVX = [], ATVZ = [], ATPX = [], ATPZ = [], ADMGT = [], ALASTH = [], ASWT = [], AABS = [], ANADE = [];
let EAIR = [], AJT = [], AJX = [], AJZ = [], ALDX = [], ALDZ = [], ALDT = [];
let DET = [], BLOOT = [];
// v1.1: the vehicle a bot walks to (AVEH), where a driving bot heads (AVTX/Z, renewed at AVTT)
let AVEH = [], AVTX = [], AVTZ = [], AVTT = [], AVSTK = [], ASMK = [];
let abTurn = 1, diff = 2;
// sound events: a ring of 32 (position, how far it carries, who, kind, when)
let SEX = [], SEY = [], SEZ = [], SER = [], SEW = [], SEK = [], SET = [];
let seTop = 0;

function aiInit() {
  let i = 1;
  while (i <= NE) {
    AMODE.push(0); ATGT.push(0); ALX.push(0); ALY.push(0); ALZ.push(0); ALT.push(-99); AVIS.push(0); AREACT.push(0); AERR.push(0); AERX.push(0); AERY.push(0);
    ASKILL.push(1); AAGR.push(0.5); ADEC.push(0); APER.push(0); AFULL.push(0); AGOAL.push(0); AGK.push(0); ADX.push(0); ADZ.push(0);
    ACOV.push(0); ACX.push(0); ACZ.push(0); APEEK.push(0); APEEKT.push(0); ASTR.push(1); ASTRT.push(0); ASTK.push(0); ASPX.push(0); ASPZ.push(0);
    AHX.push(0); AHZ.push(0); AHT.push(-99); AALERT.push(-99); ALOOTB.push(0); ALOOTT.push(0); ABURST.push(0); ABURSTT.push(0); AHEAD.push(0);
    ATVX.push(0); ATVZ.push(0); ATPX.push(0); ATPZ.push(0); ADMGT.push(0); ALASTH.push(0); ASWT.push(0); AABS.push(0); ANADE.push(0);
    EAIR.push(0); AJT.push(0); AJX.push(0); AJZ.push(0); ALDX.push(0); ALDZ.push(0); ALDT.push(0);
    AVEH.push(0); AVTX.push(0); AVTZ.push(0); AVTT.push(0); AVSTK.push(0); ASMK.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= NE * NE) { DET.push(0); i = i + 1; }
  i = 1;
  while (i <= IPF.length) { BLOOT.push(0); i = i + 1; }
  i = 1;
  while (i <= 32) { SEX.push(0); SEY.push(0); SEZ.push(0); SER.push(0); SEW.push(0); SEK.push(0); SET.push(-99); i = i + 1; }
}
function aiReset() {
  let i = 1;
  while (i <= NE) {
    AMODE[i] = MD_LOOT; ATGT[i] = 0; ALT[i] = -99; AVIS[i] = 0; ACOV[i] = 0; PLEN[i] = 0; PIDX[i] = 1; AHT[i] = -99; AALERT[i] = -99; ALOOTB[i] = 0;
    // skill: the level sets the range; aggression: the bot's own
    let sk = 0.85 + rand(0, 100) / 100 * 0.35;
    if (diff == 1) { sk = 0.55 + rand(0, 100) / 100 * 0.25; }
    if (diff == 3) { sk = 1.15 + rand(0, 100) / 100 * 0.4; }
    ASKILL[i] = sk; AAGR[i] = rand(15, 95) / 100; ADEC[i] = 0; APER[i] = rand(0, 100) / 500; AFULL[i] = 0; ANADE[i] = 0;
    AVEH[i] = 0; AVTT[i] = 0; AVSTK[i] = 0; ASMK[i] = 0;
    i = i + 1;
  }
  i = 1;
  while (i <= NE * NE) { DET[i] = 0; i = i + 1; }
  i = 1;
  while (i <= IPF.length) { BLOOT[i] = 0; i = i + 1; }
  i = 1;
  while (i <= 32) { SET[i] = -99; i = i + 1; }
}
// something made a noise at (x, y, z) heard within r cm; kind 1 shot, 2 bullet strike, 3 steps
function soundEvent(x, y, z, r, who, kind) {
  seTop = mod(seTop, 32) + 1;
  SEX[seTop] = x; SEY[seTop] = y; SEZ[seTop] = z; SER[seTop] = r; SEW[seTop] = who; SEK[seTop] = kind; SET[seTop] = gameT;
  // the player hears it: a mark on the screen toward it (and the sound, by distance)
  if (who != 1) { if (EALIVE[1] == 1) {
    let dx = x - plX, dz = z - plZ;
    let d = Math.sqrt(dx * dx + dz * dz);
    if (d < r * 1.3) { soundMark(dx, dz, kind, d); if (kind == 1) { sfxShot(who, d); } }
  } }
}

// ---------------------------------------------------------------- one bot, every frame
function botsStep(dt) {
  let e = 2;
  while (e <= NE) {
    if (EALIVE[e] == 1) {
      if (EAIR[e] > 0) { botAir(e, dt); }
      else {
        let dx = EX[e] - plX, dz = EZ[e] - plZ;
        let d2 = dx * dx + dz * dz;
        if (AFULL[e] == 1) { if (d2 > 34000 * 34000) { AFULL[e] = 0; AABS[e] = gameT; } }
        else { if (d2 < 30000 * 30000) { AFULL[e] = 1; if (EAIR[1] > 0) { AFULL[e] = 1; } } }
        if (AFULL[e] == 1) { if (EVEH[e] > 0) { botDrive(e, dt); } else { botFull(e, dt); } }
      }
    }
    e = e + 1;
  }
  // two far bots a frame
  let k = 0;
  while (k < 2) {
    abTurn = abTurn + 1;
    if (abTurn > NE) { abTurn = 2; }
    if (EALIVE[abTurn] == 1) { if (EAIR[abTurn] == 0) { if (AFULL[abTurn] == 0) {
      let t = gameT - AABS[abTurn];
      if (t > 0.05) { botAbstract(abTurn, Math.min(t, 3)); AABS[abTurn] = gameT; }
    } } }
    k = k + 1;
  }
}

function botFull(e, dt) {
  botGunTick(e, dt);
  healStep(e, dt);
  if (gameT >= APER[e]) { APER[e] = gameT + 0.2; botPerceive(e); }
  if (gameT >= ADEC[e]) { ADEC[e] = gameT + 0.45 + rand(0, 10) / 100; botDecide(e); }
  let m = AMODE[e];
  let sp = 0;
  if (m == MD_FIGHT) { botFight(e, dt); }
  else {
    ECRO[e] = 0; EADS[e] = 0;
    if (m == MD_HEAL) {
      // v1.1: threatened lately - behind something first
      let hx = 0, hz = 0;
      if (ACOV[e] == 0) { if (gameT - AHT[e] < 12 || gameT - EHURT[e] < 12) { findCover(e, AHX[e], AHZ[e]); } }
      if (ACOV[e] == 1) { hx = ACX[e] - EX[e]; hz = ACZ[e] - EZ[e]; }
      let hd = Math.sqrt(hx * hx + hz * hz);
      if (hd > 80) { ECRO[e] = 0; botFace(e, atan2d(hx, hz), dt, 360); botStep(e, hx / hd * 520, hz / hd * 520, dt); }
      else {
        if (EUSE[e] <= 0) { let h = bestHeal(e); if (h > 0) { useHeal(e, h); } else { AMODE[e] = MD_HOLD; ACOV[e] = 0; } }
        ECRO[e] = 1;
        botLook(e, dt);
        botStep(e, 0, 0, dt);
      }
    } else {
      if (m == MD_HOLD) { botLook(e, dt); botStep(e, 0, 0, dt); }
      else { botTravel(e, dt); }
    }
  }
  // take what is underfoot
  if (m == MD_LOOT || m == MD_HOLD) { botPickNear(e); }
}

// ---------------------------------------------------------------- seeing and hearing
function botPerceive(e) {
  let ey = EY[e] + 155, ex = EX[e], ez = EZ[e];
  let syw = sind(EYAW[e]), cyw = cosd(EYAW[e]);
  let alert = 0;
  if (gameT - AALERT[e] < 7) { alert = 1; }
  let cone = 0.5;
  if (alert == 1) { cone = -0.1; }
  let sk = ASKILL[e], los = 0;
  AVIS[e] = 0;
  let f = 1;
  while (f <= NE) {
    if (f != e) { if (EALIVE[f] == 1) { if (EAIR[f] == 0) {
      let k = (e - 1) * NE + f;
      let dx = EX[f] - ex, dz = EZ[f] - ez, dy = EY[f] + 120 - ey;
      let d = Math.sqrt(dx * dx + dz * dz + 1);
      let seen = 0;
      if (d < fogD * 0.92) {
        let fw = (dx * syw + dz * cyw) / d;
        if (fw > cone || d < 500) {
          // a ray for the ones that matter: the target, the player, anyone close
          let worth = 0;
          if (f == ATGT[e] || f == 1 || d < 6000 || DET[k] > 0.2) { worth = 1; }
          if (worth == 1) { if (los < 6) {
            los = los + 1;
            let ty = EY[f] + 120;
            if (ECRO[f] == 1) { ty = EY[f] + 85; }
            rayCast(ex, ey, ez, EX[f], ty, EZ[f]);
            if (rayT >= 1) { if (smokeBlocks(ex, ey, ez, EX[f], ty, EZ[f]) == 0) { seen = 1; } }
            if (seen == 1) { if (d > 2500) { if (rayTerrain(ex, ey, ez, EX[f], ty + 30, EZ[f], Math.min(14, Math.floor(d / 1500) + 3)) < 1) { seen = 0; } } }
            if (seen == 0) {
              // the head over a low wall
              rayCast(ex, ey, ez, EX[f], ty + 40, EZ[f]);
              if (rayT >= 1) { if (smokeBlocks(ex, ey, ez, EX[f], ty + 40, EZ[f]) == 0) { seen = 1; } }
            }
          } }
        }
      }
      if (seen == 1) {
        let rate = 2.4 / (0.25 + d / 2600) * sk;
        if (EMOV[f] > 1.1) { rate = rate * 1.4; }
        if (EMOV[f] < 0.1) { rate = rate * 0.65; }
        if (gameT - ESHOT[f] < 1.5) { rate = rate * 3; }
        if (ECRO[f] == 1) { rate = rate * 0.6; }
        if (f == 1) { if (plInBush == 1) { rate = rate * 0.4; } }
        if (alert == 1) { rate = rate * 1.5; }
        if (EVEH[f] > 0) { rate = rate * 1.8; }
        DET[k] = Math.min(1.6, DET[k] + rate * 0.2);
        if (DET[k] >= 1) {
          // seen: keep the one that is the bigger threat (nearer, or shooting me)
          let take = 0;
          if (ATGT[e] == 0 || EALIVE[ATGT[e]] == 0) { take = 1; }
          else { if (ATGT[e] != f) { let td = Math.abs(EX[ATGT[e]] - ex) + Math.abs(EZ[ATGT[e]] - ez); if (d < td * 0.6 || AVIS[e] == 0) { take = 1; } if (ELASTA[e] == f) { if (gameT - EHURT[e] < 2) { take = 1; } } } }
          if (take == 1) { botAcquire(e, f, d); }
          if (ATGT[e] == f) {
            AVIS[e] = 1;
            // (the target's speed, smoothed: the lead is steadier)
            ATVX[e] = ATVX[e] * 0.45 + (EX[f] - ATPX[e]) * 5 * 0.55; ATVZ[e] = ATVZ[e] * 0.45 + (EZ[f] - ATPZ[e]) * 5 * 0.55;
            ATPX[e] = EX[f]; ATPZ[e] = EZ[f];
            ALX[e] = EX[f]; ALY[e] = EY[f]; ALZ[e] = EZ[f]; ALT[e] = gameT;
          }
        }
      } else {
        DET[k] = Math.max(0, DET[k] - 0.08);
      }
    } } }
    f = f + 1;
  }
  // sounds since the last look
  let i = 1;
  while (i <= 32) {
    if (SET[i] > ALASTH[e]) { if (SEW[i] != e) {
      let dx = SEX[i] - ex, dz = SEZ[i] - ez;
      let d = Math.sqrt(dx * dx + dz * dz);
      if (d < SER[i]) {
        AALERT[e] = gameT;
        if (AVIS[e] == 0) {
          // where it came from, roughly
          let err = d * 0.12 / sk;
          AHX[e] = SEX[i] + rand(-100, 100) / 100 * err; AHZ[e] = SEZ[i] + rand(-100, 100) / 100 * err; AHT[e] = gameT;
          // a shot close by, or a bullet striking near me: someone is after me
          if (SEW[i] > 0) { if (SEK[i] == 2 || d < 3000) { let k2 = (e - 1) * NE + SEW[i]; DET[k2] = Math.max(DET[k2], 0.55); } }
        }
      }
    } }
    i = i + 1;
  }
  ALASTH[e] = gameT;
}
function botAcquire(e, f, d) {
  if (ATGT[e] != f) {
    ATGT[e] = f;
    // reaction time and the first aim error grow with distance and fall with skill
    let sk = ASKILL[e];
    AREACT[e] = gameT + (0.17 + rand(0, 100) / 100 * 0.22) / sk + d / 32000;
    AERR[e] = (2.6 + d / 2300) / sk;
    let a = rand(0, 359);
    AERX[e] = cosd(a); AERY[e] = sind(a) * 0.7;
    AHEAD[e] = 0;
    if (rand(1, 100) <= (sk - 0.6) * 45) { AHEAD[e] = 1; }
    if (d < 1500) { if (rand(1, 100) <= (sk - 0.5) * 40) { AHEAD[e] = 1; } }
    ATPX[e] = EX[f]; ATPZ[e] = EZ[f]; ATVX[e] = 0; ATVZ[e] = 0;
    ABURST[e] = 0; ABURSTT[e] = 0; ACOV[e] = 0;
  }
}
// hit by a: know where it came from
function botHurtBy(v, a) {
  if (v > 1) {
    AALERT[v] = gameT;
    if (a > 0) {
      let k = (v - 1) * NE + a;
      DET[k] = Math.max(DET[k], 0.85);
      if (ATGT[v] == 0 || AVIS[v] == 0) {
        let err = 300 / ASKILL[v];
        AHX[v] = EX[a] + rand(-100, 100) / 100 * err; AHZ[v] = EZ[a] + rand(-100, 100) / 100 * err; AHT[v] = gameT;
        if (ATGT[v] == 0) { ATGT[v] = a; ALX[v] = AHX[v]; ALY[v] = EY[a]; ALZ[v] = AHZ[v]; ALT[v] = gameT - 1.5; }
      }
      ADMGT[v] = gameT;
    }
  }
}

// ---------------------------------------------------------------- deciding
function gearScore(e) {
  let s = 0;
  if (EG1[e] > 0) { s = s + GTIER[EG1[e]] * 2; }
  if (EG2[e] > 0) { s = s + GTIER[EG2[e]]; }
  if (EG3[e] > 0) { s = s + 1; }
  s = s + EVES[e] + EHEL[e] + EPACK[e] * 0.5;
  if (EBAND[e] + EKIT[e] + EMED[e] > 0) { s = s + 1; }
  return s;
}
function botDecide(e) {
  let t = ATGT[e];
  let fresh = 0;
  if (t > 0) { if (EALIVE[t] == 1) { if (gameT - ALT[e] < 9) { fresh = 1; } } else { ATGT[e] = 0; } }
  let armed = 0;
  if (EG1[e] + EG2[e] + EG3[e] > 0) { armed = 1; }
  let mode = MD_HOLD;
  // where the zone stands
  let zin = 1, zd = 0;
  if (zPhase > 0) {
    let dx = EX[e] - znx, dz = EZ[e] - znz;
    zd = Math.sqrt(dx * dx + dz * dz);
    if (zd > znr * 0.85) { zin = 0; }
    let cx = EX[e] - zcx, cz = EZ[e] - zcz;
    if (Math.sqrt(cx * cx + cz * cz) > zr) { zin = -1; }
  }
  let gs = gearScore(e);
  let want = 7;
  if (gameT > 420) { want = 4; }
  if (fresh == 1) { if (armed == 1) { mode = MD_FIGHT; } else { mode = MD_MOVE; } }
  if (mode != MD_FIGHT) {
    if (EHP[e] < 78 || EBOOST[e] < 30) { if (bestHeal(e) > 0) { if (gameT - EHURT[e] > 3) { mode = MD_HEAL; } } }
    if (mode != MD_HEAL) {
      // the zone first when it presses
      let press = 0;
      if (zin == -1) { press = 1; }
      if (zin == 0) { if (zWait < (zd - znr * 0.7) / 450 + 45 || gs >= want) { press = 1; } }
      if (press == 1) { mode = MD_MOVE; AGK[e] = 2; botWantVeh(e, zd - znr); }
      else {
        if (gs < want) { mode = MD_LOOT; }
        else {
          if (gameT - AHT[e] < 12) { if (AAGR[e] > 0.45) { mode = MD_MOVE; AGK[e] = 3; } }
          if (mode == MD_HOLD) { if (rand(1, 100) <= 30) { mode = MD_MOVE; AGK[e] = 4; } }
        }
      }
    }
  }
  if (mode != AMODE[e]) { PLEN[e] = 0; AGOAL[e] = 0; ACOV[e] = 0; }
  if (mode != MD_MOVE) { AVEH[e] = 0; }
  AMODE[e] = mode;
  if (mode == MD_FIGHT) { botPickGun(e); }
  // goals for travelling
  if (mode == MD_LOOT) { if (PLEN[e] == 0 || ALOOTB[e] == 0) { botLootGoal(e); } }
  if (mode == MD_MOVE) { if (AVEH[e] == 0) { if (PLEN[e] == 0 || PIDX[e] > PLEN[e]) { botMoveGoal(e); } } }
}
// the nearest building not looted yet (within 250 m): its first room node
function botLootGoal(e) {
  let best = 0, bd = 25000;
  let cx = Math.floor(EX[e] / CS), cz = Math.floor(EZ[e] / CS);
  let r = 0;
  while (r <= 7) {
    let dz = 0 - r;
    while (dz <= r) {
      let dx = 0 - r;
      while (dx <= r) {
        if (Math.abs(dx) == r || Math.abs(dz) == r) {
          let gx = cx + dx, gz = cz + dz;
          if (gx >= 0 && gx < CELLS && gz >= 0 && gz < CELLS) {
            let b = CIB[gz * CELLS + gx + 1];
            if (b > 0) { if (BLOOT[b] == 0) { if (INN[b] > 0) {
              let ddx = IX[b] - EX[e], ddz = IZ[b] - EZ[e];
              let d = Math.sqrt(ddx * ddx + ddz * ddz);
              // the zone: not out there
              let ok = 1;
              if (zPhase > 0) { let zx = IX[b] - znx, zz = IZ[b] - znz; if (Math.sqrt(zx * zx + zz * zz) > znr) { ok = 0; } }
              if (ok == 1) { if (d < bd) { bd = d; best = b; } }
            } } }
          }
        }
        dx = dx + 1;
      }
      dz = dz + 1;
    }
    r = r + 1;
    if (best > 0) { if (r > 2) { r = 99; } }
  }
  ALOOTB[e] = best;
  if (best > 0) {
    // a room deep inside (the last node of the building's list)
    let k = IN0[best] + rand(1, INN[best]) - 1;
    AGOAL[e] = k; ALOOTT[e] = gameT;
    pathAsk(e, k);
  } else { AMODE[e] = MD_MOVE; AGK[e] = 4; botMoveGoal(e); }
}
function botMoveGoal(e) {
  let k = AGK[e], g = 0;
  if (k == 2) {
    // into the zone: follow the flow field from where I stand
    let n = nearNode(EX[e], EY[e], EZ[e]);
    if (n > 0) { if (FST[n] == fStamp) { let s = 0; g = n; while (s < 30) { g = FNX[g]; s = s + 1; } } }
    if (g == 0) { g = nearNode(znx + rand(-500, 500) * znr / 1000, 0, znz + rand(-500, 500) * znr / 1000); }
  }
  if (k == 3) { g = nearNode(AHX[e], EY[e], AHZ[e]); }
  if (k == 4 || g == 0) {
    // somewhere nearby inside the zone
    let a = rand(0, 359), d = rand(3000, 12000);
    let x = EX[e] + sind(a) * d, z = EZ[e] + cosd(a) * d;
    if (zPhase > 0) { let zx = x - znx, zz = z - znz; let dd = Math.sqrt(zx * zx + zz * zz); if (dd > znr * 0.8) { x = znx + zx / dd * znr * 0.5; z = znz + zz / dd * znr * 0.5; } }
    g = nearNode(x, hAt(x, z), z);
  }
  if (g > 0) { AGOAL[e] = g; pathAsk(e, g); }
}

// ---------------------------------------------------------------- moving
// follow the path; looting: once there, visit the rooms and take things
function botTravel(e, dt) {
  // v1.1: on the way to a vehicle: in when there
  let av = AVEH[e];
  if (av > 0) {
    if (VON[av] != 1 || VDRV[av] > 0) { AVEH[e] = 0; av = 0; }
    else {
      let vx = VX[av] - EX[e], vz = VZ[av] - EZ[e];
      let vd = Math.sqrt(vx * vx + vz * vz);
      if (vd < VKHL[VK[av]] + 120) { vehIn(e, av); AVEH[e] = 0; AVTT[e] = 0; AVSTK[e] = 0; PLEN[e] = 0; }
      else { if (PLEN[e] == 0 || PIDX[e] > PLEN[e] || vd < 900) {
        botFace(e, atan2d(vx, vz), dt, 360); botStep(e, vx / vd * 560, vz / vd * 560, dt); av = -1;
        // (no nearer for a while: something is in the way - forget the vehicle)
        if (vd < AVSTK[e] - 40 || AVSTK[e] == 0) { AVSTK[e] = vd; AVTT[e] = gameT; } else { if (gameT - AVTT[e] > 3) { AVEH[e] = 0; AVSTK[e] = 0; PLEN[e] = 0; ADEC[e] = 0; } }
      } }
    }
  }
  if (av >= 0) { botWalk(e, dt); }
}
function botWalk(e, dt) {
  let sp = 470;
  if (AMODE[e] == MD_MOVE) { if (AGK[e] == 2) { sp = 600; } if (AGK[e] == 3) { sp = 380; } }
  let n = PLEN[e], i = PIDX[e];
  if (n > 0) {
    if (i <= n) {
      let nd = PATH[(e - 1) * NPATH + i];
      let dx = NDX[nd] - EX[e], dz = NDZ[nd] - EZ[e];
      let d = Math.sqrt(dx * dx + dz * dz);
      if (d < 90) { if (Math.abs(NDY[nd] - EY[e]) < 160) { PIDX[e] = i + 1; } }
      if (d > 1) { botFace(e, atan2d(dx, dz), dt, 360); botStep(e, dx / d * sp, dz / d * sp, dt); }
      // stuck: jump, then ask again
      ASTK[e] = ASTK[e] + dt;
      if (ASTK[e] > 1.2) {
        let mx = EX[e] - ASPX[e], mz = EZ[e] - ASPZ[e];
        if (mx * mx + mz * mz < 60 * 60) {
          if (EGND[e] == 1) { EVY[e] = JUMPV; EY[e] = EY[e] + 3; }
          if (ASTK[e] > 3.5) { PLEN[e] = 0; ADEC[e] = 0; ASTK[e] = 0; }
        } else { ASTK[e] = 0; ASPX[e] = EX[e]; ASPZ[e] = EZ[e]; }
      }
    } else {
      // arrived
      if (AMODE[e] == MD_LOOT) {
        let b = ALOOTB[e];
        // something lying in this room: walk over to it first
        if (b > 0) { if (botFetch(e, dt) == 1) { b = 0 - 1; } }
        if (b > 0) {
          if (gameT - ALOOTT[e] > 9 || PIDX[e] > PLEN[e]) {
            // another room of the same building, or done with it
            if (gameT - ALOOTT[e] > 14) { BLOOT[b] = 1; ALOOTB[e] = 0; PLEN[e] = 0; ADEC[e] = 0; }
            else { let k = IN0[b] + rand(1, INN[b]) - 1; pathAsk(e, k); }
          }
        } else { PLEN[e] = 0; ADEC[e] = 0; }
      } else { PLEN[e] = 0; ADEC[e] = 0; }
      botStep(e, 0, 0, dt);
    }
  } else { botLook(e, dt); botStep(e, 0, 0, dt); }
}
// look around (no target): turn now and then
function botLook(e, dt) {
  if (gameT - AHT[e] < 6) { botFace(e, atan2d(AHX[e] - EX[e], AHZ[e] - EZ[e]), dt, 200); }
  else { if (rand(1, 100) <= 2) { ADX[e] = mod(EYAW[e] + rand(-120, 120), 360); } botFace(e, ADX[e], dt, 90); }
  EPIT[e] = EPIT[e] * 0.9;
}
function atan2d(x, z) {
  let a = 0;
  if (Math.abs(z) < 0.0001) { if (x > 0) { a = 90; } else { a = 270; } }
  else { a = atand(x / z); if (z < 0) { a = a + 180; } }
  if (a < 0) { a = a + 360; }
  return a;
}
// turn the body toward yaw y at most rate degrees a second
function botFace(e, y, dt, rate) {
  let d = y - EYAW[e];
  if (d > 180) { d = d - 360; }
  if (d < -180) { d = d + 360; }
  let m = rate * dt;
  if (d > m) { d = m; }
  if (d < 0 - m) { d = 0 - m; }
  EYAW[e] = EYAW[e] + d;
  if (EYAW[e] >= 360) { EYAW[e] = EYAW[e] - 360; }
  if (EYAW[e] < 0) { EYAW[e] = EYAW[e] + 360; }
}
// one step with velocity (vx, vz) cm/s: collisions, stairs, gravity, the walk animation
function botStep(e, vx, vz, dt) {
  let hh = PH;
  if (ECRO[e] == 1) { hh = PHC; vx = vx * 0.5; vz = vz * 0.5; }
  let x = EX[e], y = EY[e], z = EZ[e];
  let nx = x + vx * dt, nz = z + vz * dt;
  if (vx != 0 || vz != 0) {
    scanBoxes(nx, y, nz, PRAD, hh, STEP);
    if (hitB == 0) { x = nx; z = nz; }
    else {
      scanBoxes(nx, y, z, PRAD, hh, STEP);
      if (hitB == 0) { x = nx; } else { scanBoxes(x, y, nz, PRAD, hh, STEP); if (hitB == 0) { z = nz; } }
    }
  }
  scanBoxes(x, y, z, PRAD, hh, STEP);
  let g = gndB;
  if (y > g + 2 || EVY[e] > 0) {
    EGND[e] = 0;
    EVY[e] = EVY[e] - GRAV * dt;
    y = y + EVY[e] * dt;
    if (y <= g) { y = g; EVY[e] = 0; EGND[e] = 1; }
  } else { y = g; EGND[e] = 1; EVY[e] = 0; }
  let mvx = x - EX[e], mvz = z - EZ[e];
  let spd = Math.sqrt(mvx * mvx + mvz * mvz) / dt;
  EMOV[e] = spd / 480;
  EPH[e] = EPH[e] + spd * dt * 0.75;
  if (EPH[e] > 360) { EPH[e] = EPH[e] - 360; }
  EX[e] = x; EY[e] = y; EZ[e] = z;
  // running feet are heard nearby
  if (spd > 420) { if (rand(1, 100) <= 8) { soundEvent(x, y, z, 2200, e, 3); } }
}
// walk to the nearest item within 7 m on this floor (1: walking to one, 0: none)
function botFetch(e, dt) {
  let c = Math.floor(EZ[e] / CS) * CELLS + Math.floor(EX[e] / CS) + 1;
  let best = 0, bd = 700, r = 0;
  if (c >= 1) { if (c <= CELLS * CELLS) {
    let k = WCH[c];
    while (k > 0) {
      if (WIT[k] != 53) { if (Math.abs(WY[k] - EY[e]) < 140) {
        let dx = WX[k] - EX[e], dz = WZ[k] - EZ[e];
        let d = Math.sqrt(dx * dx + dz * dz);
        // (one underfoot was offered already and not wanted)
        if (d > 45) { if (d < bd) { bd = d; best = k; } }
      } }
      k = WNX[k];
    }
  } }
  if (best > 0) {
    let dx = WX[best] - EX[e], dz = WZ[best] - EZ[e];
    if (bd > 60) { botFace(e, atan2d(dx, dz), dt, 360); botStep(e, dx / bd * 380, dz / bd * 380, dt); }
    botPickNear(e);
    // an item it does not want stays: give up on it after a while
    if (gameT - ALOOTT[e] > 16) { best = 0; }
    if (best > 0) { r = 1; }
  }
  return r;
}
// take things lying within reach
function botPickNear(e) {
  let c = Math.floor(EZ[e] / CS) * CELLS + Math.floor(EX[e] / CS) + 1;
  if (c >= 1) { if (c <= CELLS * CELLS) {
    let k = WCH[c], n = 0;
    while (k > 0) {
      let nx = WNX[k];
      if (n < 3) {
        let dx = WX[k] - EX[e], dz = WZ[k] - EZ[e];
        if (dx * dx + dz * dz < 160 * 160) { if (Math.abs(WY[k] - EY[e]) < 120) { if (WIT[k] != 53) { takeItem(e, k); if (tookLast == 0) { WYAW[k] = WYAW[k] + 0; } n = n + 1; } } }
      }
      k = nx;
    }
  } }
}

// ---------------------------------------------------------------- guns of a bot
function botGunTick(e, dt) {
  EFIRE[e] = Math.max(0, EFIRE[e] - dt);
  EBOLT[e] = Math.max(0, EBOLT[e] - dt);
  ASWT[e] = Math.max(0, ASWT[e] - dt);
  if (ERELT[e] > 0) { ERELT[e] = ERELT[e] - dt; if (ERELT[e] <= 0) { ERELT[e] = 0; reloadDone(e); } }
}
// the best gun for the distance to the target, with ammo
function botPickGun(e) {
  let d = 99999;
  if (ATGT[e] > 0) { let dx = ALX[e] - EX[e], dz = ALZ[e] - EZ[e]; d = Math.sqrt(dx * dx + dz * dz); }
  let best = 0, bs = -99, s = 1;
  while (s <= 3) {
    let g = EG1[e], m = EM1[e];
    if (s == 2) { g = EG2[e]; m = EM2[e]; }
    if (s == 3) { g = EG3[e]; m = EM3[e]; }
    if (g > 0) { if (m + ammoOf(e, GAMMO[g]) > 0) {
      let sc = GTIER[g] * 2;
      let c = GCLS[g];
      if (d < 2000) { if (c == 2 || c == 6) { sc = sc + 4; } if (c == 5) { sc = sc - 3; } }
      if (d > 8000) { if (c == 4 || c == 5) { sc = sc + 4; } if (c == 2 || c == 6 || c == 1) { sc = sc - 4; } }
      if (m == 0) { sc = sc - 1; }
      if (sc > bs) { bs = sc; best = s; }
    } }
    s = s + 1;
  }
  if (best > 0) { if (best != ECUR[e]) { ECUR[e] = best; ERELT[e] = 0; ASWT[e] = 0.6; } }
}

// ---------------------------------------------------------------- fighting
function botFight(e, dt) {
  let t = ATGT[e];
  if (t == 0 || EALIVE[t] == 0) { ATGT[e] = 0; AMODE[e] = MD_HOLD; botStep(e, 0, 0, dt); }
  else {
    let g = gunNow(e);
    let sk = ASKILL[e];
    let vis = AVIS[e];
    let tx = ALX[e], ty = ALY[e], tz = ALZ[e];
    if (vis == 1) { tx = EX[t]; ty = EY[t]; tz = EZ[t]; }
    let dx = tx - EX[e], dz = tz - EZ[e];
    let d = Math.sqrt(dx * dx + dz * dz) + 1;
    // reloading: behind cover if there is time
    if (g > 0) { if (ERELT[e] <= 0) { if (magNow(e) == 0) { startReload(e); } else { if (vis == 0) { if (magNow(e) * 3 < magSize(g, attNow(e))) { startReload(e); } } } } }
    if (g == 0) { botPickGun(e); }
    // ---- aim
    let aimY = ty + 125;
    if (ECRO[t] == 1) { aimY = ty + 88; }
    if (AHEAD[e] == 1) { aimY = aimY + 33; }
    let lead = 0;
    if (g > 0) { lead = flightT(g, d) * (0.4 + sk * 0.5); }
    let ax = tx + ATVX[e] * lead, az = tz + ATVZ[e] * lead;
    let adx = ax - EX[e], adz = az - EZ[e], ady = aimY - (EY[e] + 155);
    let ad = Math.sqrt(adx * adx + adz * adz) + 1;
    // the error settles while tracking; moving makes it worse
    AERR[e] = AERR[e] * Math.max(0, 1 - dt * (1.0 + sk * 1.5));
    let floor = 0.48 / sk + d / 25000;
    if (EMOV[e] > 0.3) { floor = floor + 1.0 / sk; }
    if (EMOV[t] > 0.6) { floor = floor + 0.6; }
    if (ECRO[t] == 1) { floor = floor + 0.2; }
    let er = AERR[e] + floor;
    let wantY = atan2d(adx, adz) + AERX[e] * er;
    let wantP = atand(ady / ad) + gravComp(g, ad) + AERY[e] * er;
    let turn = 160 + 260 * sk;
    botFace(e, wantY, dt, turn);
    let dp = wantP - EPIT[e];
    let pm = turn * dt;
    if (dp > pm) { dp = pm; }
    if (dp < 0 - pm) { dp = 0 - pm; }
    EPIT[e] = EPIT[e] + dp;
    // ---- shoot
    if (g > 0) { if (vis == 1) { if (gameT >= AREACT[e]) { if (EFIRE[e] <= 0) { if (EBOLT[e] <= 0) { if (ERELT[e] <= 0) { if (ASWT[e] <= 0) { if (magNow(e) > 0) {
      let yd = Math.abs(wantY - EYAW[e]);
      if (yd > 180) { yd = 360 - yd; }
      if (yd < 3 + er) { if (d < GRANGE[g] * 3) {
        // the rhythm: close - hold; middle - bursts; far - taps
        let go = 0;
        if (ABURSTT[e] > 0) { ABURSTT[e] = ABURSTT[e] - dt; }
        else {
          go = 1;
          if (d > 2500) { if (mod(GMODE[g], 8) >= 4 || mod(GMODE[g], 4) >= 2) {
            ABURST[e] = ABURST[e] + 1;
            let len = 4;
            if (d > 7000) { len = 1; }
            if (ABURST[e] >= len) { ABURST[e] = 0; ABURSTT[e] = 0.18 + d / 30000 + rand(0, 100) / 400; }
          } }
          if (GCLS[g] == 4 || GCLS[g] == 1) { ABURSTT[e] = 0.12 + rand(0, 100) / 500; }
        }
        if (go == 1) {
          let spread = GHIP[g];
          if (d > 1500) { spread = GADS[g] * 1.4; EADS[e] = 1; if (attIn(attNow(e), 2) >= 6) { spread = spread * 0.75; } } else { EADS[e] = 0; }
          if (ECRO[e] == 1) { spread = spread * 0.85; }
          if (EMOV[e] > 0.3) { spread = spread + 1.0; }
          fireGun(e, EX[e], EY[e] + 155, EZ[e], EYAW[e], EPIT[e], spread / Math.max(0.6, sk));
          // recoil the bot must pull back down
          EPIT[e] = EPIT[e] + GRV[g] * Math.max(0.15, 1.15 - sk * 0.6);
          AERR[e] = AERR[e] + GRH[g] * Math.max(0.2, 1.05 - sk * 0.55);
          if (Math.abs(EX[e] - plX) + Math.abs(EZ[e] - plZ) < 40000) { sfxShotAt(e); }
        }
      } }
    } } } } } } } }
    // ---- move
    let mvx = 0, mvz = 0, sp = 300;
    let ux = dx / d, uz = dz / d;
    let c = 3;
    if (g > 0) { c = GCLS[g]; }
    // the distance this gun wants
    let wantD = 3500;
    if (c == 2 || c == 6) { wantD = 1200; }
    if (c == 1) { wantD = 1500; }
    if (c == 4 || c == 5) { wantD = 9000; }
    let low = 0;
    if (EHP[e] < 40) { low = 1; }
    // v1.1: shot at by someone not seen: get behind something before looking for them
    if (vis == 0) { if (ACOV[e] == 0) { if (gameT - EHURT[e] < 2.5) { findCover(e, tx, tz); } } }
    // low and in the open with the enemy in sight: smoke between, then away
    if (low == 1) { if (vis == 1) { if (ACOV[e] == 0) { if (ESMK[e] > 0) { if (gameT > ASMK[e]) { if (d > 700) {
      ASMK[e] = gameT + 15;
      throwNade(e, EX[e] + dx / d * 450, EY[e], EZ[e] + dz / d * 450, 2);
      findCover(e, tx, tz);
    } } } } } }
    // cover: when hurt, or reloading, or a long fight
    if (ACOV[e] == 0) { if (low == 1 || ERELT[e] > 0 || d > 3500) { if (rand(1, 100) <= 25) { findCover(e, tx, tz); } } }
    if (ACOV[e] == 1) {
      let cdx = ACX[e] - EX[e], cdz = ACZ[e] - EZ[e];
      let cd = Math.sqrt(cdx * cdx + cdz * cdz);
      if (cd > 80) { mvx = cdx / cd; mvz = cdz / cd; sp = 560; ECRO[e] = 0; }
      else {
        // peeking: hidden (crouched, reload, heal) then out to shoot
        APEEKT[e] = APEEKT[e] - dt;
        if (APEEKT[e] <= 0) { APEEK[e] = 1 - APEEK[e]; if (APEEK[e] == 1) { APEEKT[e] = 1.2 + rand(0, 100) / 100 * 1.2; } else { APEEKT[e] = 0.9 + rand(0, 100) / 100; } }
        if (APEEK[e] == 1) { ECRO[e] = 0; mvx = 0 - uz * ASTR[e] * 0.6; mvz = ux * ASTR[e] * 0.6; sp = 250; }
        else { ECRO[e] = 1; if (low == 1) { if (EUSE[e] <= 0) { let h = bestHeal(e); if (h > 0) { if (vis == 0) { useHeal(e, h); } } } } }
        if (gameT - ALT[e] > 8) { ACOV[e] = 0; }
      }
    } else {
      ECRO[e] = 0;
      // strafe across the line of fire, now one way now the other
      ASTRT[e] = ASTRT[e] - dt;
      if (ASTRT[e] <= 0) { ASTRT[e] = 0.3 + rand(0, 100) / 100 * 0.6; if (rand(1, 100) <= 60) { ASTR[e] = 0 - ASTR[e]; } }
      mvx = 0 - uz * ASTR[e]; mvz = ux * ASTR[e];
      // close in, or keep away
      if (vis == 1) {
        if (d > wantD * 1.3) { mvx = mvx * 0.5 + ux; mvz = mvz * 0.5 + uz; }
        if (d < wantD * 0.5) { mvx = mvx * 0.6 - ux * 0.7; mvz = mvz * 0.6 - uz * 0.7; }
        // a long shot: stand still, crouch
        if (d > 6000) { if (c >= 3) { mvx = mvx * 0.2; mvz = mvz * 0.2; if (sk > 0.8) { ECRO[e] = 1; } } }
        if (c == 5) { mvx = 0; mvz = 0; }
      } else {
        // lost sight: go where it was last seen (carefully), or push if they are weak
        let hunt = gameT - ALT[e];
        if (hunt > 1.5) {
          if (PLEN[e] == 0) { if (hunt < 2.5 || AAGR[e] > 0.5) { pathAsk(e, nearNode(tx, ty, tz)); } }
          botTravel(e, dt);
          mvx = 0; mvz = 0;
        }
        // a grenade over the cover they hide behind
        if (EFRAG[e] > 0) { if (hunt > 2) { if (d > 900) { if (d < 3200) { if (gameT > ANADE[e]) { ANADE[e] = gameT + 8; throwNade(e, tx, ty, tz, 1); } } } } }
      }
      // pushing a weak or reloading enemy
      if (AAGR[e] > 0.55) { if (vis == 1) { if (EHP[t] < 45 || ERELT[t] > 0) { mvx = ux; mvz = uz; sp = 500; } } }
    }
    if (low == 1) { if (ACOV[e] == 0) { if (vis == 1) { mvx = mvx * 0.4 - ux * 0.8; mvz = mvz * 0.4 - uz * 0.8; } } }
    let ml = Math.sqrt(mvx * mvx + mvz * mvz);
    if (ml > 0.01) { botStep(e, mvx / ml * sp, mvz / ml * sp, dt); } else { botStep(e, 0, 0, dt); }
  }
}
// aim a little higher for the drop over long distances
function gravComp(g, d) {
  let a = 0;
  if (g > 0) { a = atand(dropAt(g, d) / d); }
  return a;
}
// a spot behind the nearest solid prop (between me and the threat), within 14 m
function findCover(e, tx, tz) {
  let cx = Math.floor(EX[e] / CS), cz = Math.floor(EZ[e] / CS);
  let best = 0, bd = 1400, bx = 0, bz = 0;
  let iz = cz - 1;
  while (iz <= cz + 1) {
    let ix = cx - 1;
    while (ix <= cx + 1) {
      if (ix >= 0 && ix < CELLS && iz >= 0 && iz < CELLS) {
        let c = iz * CELLS + ix + 1;
        let i = CI0[c], ie = i + CIN[c];
        while (i < ie) {
          let pf = IPF[i];
          if (PFCV[pf] == 1) {
            let ox = IX[i] - tx, oz = IZ[i] - tz;
            let ol = Math.sqrt(ox * ox + oz * oz) + 1;
            let rr = PFR[pf] * 0.75 + 70;
            let sx = IX[i] + ox / ol * rr, sz = IZ[i] + oz / ol * rr;
            let ddx = sx - EX[e], ddz = sz - EZ[e];
            let d = Math.sqrt(ddx * ddx + ddz * ddz);
            if (d < bd) {
              scanBoxes(sx, EY[e], sz, PRAD, PHC, STEP);
              if (hitB == 0) { bd = d; best = i; bx = sx; bz = sz; }
            }
          }
          i = i + 1;
        }
      }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
  if (best > 0) { ACOV[e] = 1; ACX[e] = bx; ACZ[e] = bz; APEEK[e] = 0; APEEKT[e] = 0.8; }
}

// ---------------------------------------------------------------- far away
function botAbstract(e, dt) {
  healStep(e, dt);
  if (EHP[e] < 60) { if (EUSE[e] <= 0) { let h = bestHeal(e); if (h > 0) { useHeal(e, h); } } }
  // a fight with another far bot nearby
  let foe = ATGT[e];
  if (foe > 0) { if (EALIVE[foe] == 0 || AFULL[foe] == 1) { foe = 0; ATGT[e] = 0; } }
  if (EVEH[e] > 0) { foe = 0; ATGT[e] = 0; }
  if (foe == 0) { if (EVEH[e] == 0) {
    if (rand(1, 100) <= 30) {
      let f = rand(2, NE);
      if (f != e) { if (EALIVE[f] == 1) { if (EAIR[f] == 0) { if (AFULL[f] == 0) {
        let dx = EX[f] - EX[e], dz = EZ[f] - EZ[e];
        if (dx * dx + dz * dz < 14000 * 14000) { if (rand(1, 100) <= 75) { if (EVEH[f] == 0) { ATGT[e] = f; ATGT[f] = e; foe = f; } } }
      } } } }
    }
  } }
  // v1.1: no gun, or nothing to shoot with: no fight - it goes on its way (two such bots paired
  // used to stand where they were for good)
  if (foe > 0) {
    let g0 = gunNow(e);
    if (g0 == 0) { botPickGun(e); g0 = gunNow(e); }
    let can = 0;
    if (g0 > 0) { if (magNow(e) + ammoOf(e, GAMMO[g0]) > 0) { can = 1; } }
    if (can == 0) { foe = 0; ATGT[e] = 0; }
  }
  if (foe > 0) {
    let g = gunNow(e);
    if (g == 0) { botPickGun(e); g = gunNow(e); }
    if (g > 0) {
      let dx = EX[foe] - EX[e], dz = EZ[foe] - EZ[e];
      let d = Math.sqrt(dx * dx + dz * dz);
      let hit = Math.max(0.06, Math.min(0.6, 0.42 * ASKILL[e] - d / 40000 + EHEL[e] * 0.01 + GTIER[g] * 0.02));
      if (attIn(attNow(e), 2) >= 6) { if (d > 8000) { hit = hit + 0.06; } }
      let shots = dt / GINT[g] * 0.35;
      let dm = GDMG[g] * shots * hit;
      let ab = Math.min(magNow(e) + ammoOf(e, GAMMO[g]), Math.ceil(shots));
      if (ab > 0) {
        if (EM1[e] + EM2[e] + EM3[e] > 0) { setMag(e, Math.max(0, magNow(e) - ab)); } else { ammoAdd(e, GAMMO[g], 0 - ab); }
        hurt(foe, e, dm * (1 - EVES[foe] * 0.1), 2, g);
        ESHOT[e] = gameT;
        if (rand(1, 100) <= 40) { soundEvent(EX[e], EY[e] + 150, EZ[e], 30000, e, 1); }
        if (magNow(e) == 0) { if (ammoOf(e, GAMMO[g]) > 0) { reloadDone(e); } }
      }
    }
  } else {
    // travel along the path (no collisions out here: the edges are walkable)
    if (PLEN[e] == 0 || PIDX[e] > PLEN[e]) {
      if (PLEN[e] > 0) {
        // arrived somewhere: loot it if it is a building
        let nd = PATH[(e - 1) * NPATH + PLEN[e]];
        let b = NDB[nd];
        if (b > 0) { botLootBuilding(e, b); }
      }
      ADEC[e] = 0;
      botDecideFar(e);
    } else {
      let nd = PATH[(e - 1) * NPATH + PIDX[e]];
      let dx = NDX[nd] - EX[e], dz = NDZ[nd] - EZ[e];
      let d = Math.sqrt(dx * dx + dz * dz);
      let step = 450 * dt;
      if (EVEH[e] > 0) { step = 1500 * dt; }
      if (d <= step) { EX[e] = NDX[nd]; EY[e] = NDY[nd]; EZ[e] = NDZ[nd]; PIDX[e] = PIDX[e] + 1; }
      else { EX[e] = EX[e] + dx / d * step; EZ[e] = EZ[e] + dz / d * step; EY[e] = EY[e] + (NDY[nd] - EY[e]) * step / d; EYAW[e] = atan2d(dx, dz); }
      // the vehicle goes along (on the ground under the bot)
      let v = EVEH[e];
      if (v > 0) { VX[v] = EX[e]; VZ[v] = EZ[e]; VYAW[v] = EYAW[e]; VSPD[v] = 1500; vehGround(v, 1); VY[v] = gndB; EY[e] = VY[v] + VKSEAT[VK[v]] - 92; }
    }
  }
}
function botDecideFar(e) {
  let gs = gearScore(e);
  let zin = 1;
  if (zPhase > 0) { let dx = EX[e] - znx, dz = EZ[e] - znz; if (Math.sqrt(dx * dx + dz * dz) > znr * 0.85) { zin = 0; } }
  if (zin == 0) {
    AMODE[e] = MD_MOVE; AGK[e] = 2;
    // a long way: into a vehicle that stands near (walked to in no time out here)
    if (EVEH[e] == 0) { let dzx = EX[e] - znx, dzz = EZ[e] - znz; if (Math.sqrt(dzx * dzx + dzz * dzz) > znr + 18000) { let v = vehFree(EX[e], EZ[e], 6000); if (v > 0) { vehIn(e, v); } } }
    botMoveGoal(e);
  }
  else {
    if (EVEH[e] > 0) { let v = EVEH[e]; vehOut(e, 1); VSPD[v] = 0; }
    if (gs < 8) { AMODE[e] = MD_LOOT; botLootGoal(e); }
    else { AMODE[e] = MD_MOVE; AGK[e] = 4; botMoveGoal(e); }
  }
}
// take the items of building b that lie within reach of its rooms
function botLootBuilding(e, b) {
  let c = Math.floor(IZ[b] / CS) * CELLS + Math.floor(IX[b] / CS) + 1;
  let k = WCH[c], n = 0;
  while (k > 0) {
    let nx = WNX[k];
    if (n < 12) { if (WIT[k] != 53) {
      let dx = WX[k] - IX[b], dz = WZ[k] - IZ[b];
      if (dx * dx + dz * dz < 1500 * 1500) { takeItem(e, k); n = n + 1; }
    } }
    k = nx;
  }
  BLOOT[b] = 1;
  ALOOTB[e] = 0;
}

// ---------------------------------------------------------------- landing
// bot e jumps at time jt from (jx, jz), lands at (lx, lz) at time lt
function botAir(e, dt) {
  if (EAIR[e] == 2) {
    // in the plane
    if (gameT >= AJT[e]) { EAIR[e] = 1; }
    EX[e] = planeX; EZ[e] = planeZ; EY[e] = planeY;
  } else {
    let t = (gameT - AJT[e]) / (ALDT[e] - AJT[e]);
    if (t >= 1) {
      EAIR[e] = 0; EX[e] = ALDX[e]; EZ[e] = ALDZ[e];
      scanBoxes(EX[e], 99999, EZ[e], PRAD, PH, 999999);
      EY[e] = gndB; EVY[e] = 0; AMODE[e] = MD_LOOT; ADEC[e] = 0; AABS[e] = gameT; AVEH[e] = 0;
    } else {
      EX[e] = AJX[e] + (ALDX[e] - AJX[e]) * t; EZ[e] = AJZ[e] + (ALDZ[e] - AJZ[e]) * t;
      let gy = hAt(ALDX[e], ALDZ[e]);
      // free fall to 120 m over the ground, then the canopy
      if (t < 0.3) { EY[e] = planeY + (gy + 12000 - planeY) * t / 0.3; } else { EY[e] = gy + 12000 * (1 - t) / 0.7; }
      EYAW[e] = atan2d(ALDX[e] - AJX[e], ALDZ[e] - AJZ[e]);
    }
  }
}
