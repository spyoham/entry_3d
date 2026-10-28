// ===================================================================== vehicles (v1.1)
// A jeep, a pickup, a dune buggy and a motorbike (numbers in VK*: vehicles.mjs). A match puts NV of
// them on the spots the build chose (VS*). Anyone can drive one - the player with W/S/A/D, a bot to
// get to the zone. A vehicle is a box for collisions and bullets; it runs people over, crashes,
// burns out to a wreck that stays as cover. The body faces +z at yaw 0, like everything else.
const NV = 40;
let VK = [], VX = [], VY = [], VZ = [], VYAW = [], VPIT = [], VROL = [], VSPD = [], VVS = [], VHP = [], VDRV = [], VON = [], VTINT = [];
let VSTUCK = [], VREV = [], VLASTA = [], VSND = [];
let VUSED = [];
let EVEH = [], EVHT = [];
let vSelf = 0, plVeh = 0, vNear = 0, vNearD = 0, vTurn = 0, vLookT = 0;

function vehInit() {
  let i = 1;
  while (i <= NV) {
    VK.push(1); VX.push(0); VY.push(0); VZ.push(0); VYAW.push(0); VPIT.push(0); VROL.push(0); VSPD.push(0); VVS.push(0); VHP.push(0); VDRV.push(0); VON.push(0); VTINT.push(0);
    VSTUCK.push(0); VREV.push(0); VLASTA.push(0); VSND.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= MAXVP) { VUSED.push(0); i = i + 1; }
  i = 1;
  while (i <= NE) { EVEH.push(0); EVHT.push(-99); i = i + 1; }
}
// a new match: vehicles on spots chosen at random (each spot once)
function vehReset() {
  let i = 1;
  while (i <= N_VPX) { VUSED[i] = 0; i = i + 1; }
  i = 1;
  while (i <= NE) { EVEH[i] = 0; EVHT[i] = -99; i = i + 1; }
  plVeh = 0; vTurn = 0;
  let v = 1;
  while (v <= NV) {
    VON[v] = 0;
    let s = 0, tries = 0;
    while (s == 0) {
      let c = rand(1, N_VPX);
      if (VUSED[c] == 0) { s = c; }
      tries = tries + 1;
      if (tries > 30) { s = -1; }
    }
    if (s > 0) {
      VUSED[s] = 1;
      let k = VPK[s];
      if (k == 0 || rand(1, 100) > 70) {
        let r = rand(1, 100);
        k = 1;
        if (r > 34) { k = 2; }
        if (r > 54) { k = 3; }
        if (r > 78) { k = 4; }
      }
      VK[v] = k; VX[v] = VPX[s]; VZ[v] = VPZ[s]; VYAW[v] = VPA[s]; VSPD[v] = 0; VVS[v] = 0; VHP[v] = VKHP[k]; VDRV[v] = 0; VON[v] = 1;
      VTINT[v] = rand(0, 2) * 64; VSTUCK[v] = 0; VREV[v] = 0; VLASTA[v] = 0; VROL[v] = 0;
      vehGround(v, 1);
      VY[v] = gndB;
    }
    v = v + 1;
  }
}
// the ground under vehicle v: gndB, and its pitch and roll from the terrain (snap: at once)
function vehGround(v, snap) {
  let k = VK[v];
  let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
  let hl = VKHL[k] * 0.75, hw = VKHW[k];
  let hf = hAt(VX[v] + sn * hl, VZ[v] + cs * hl), hb = hAt(VX[v] - sn * hl, VZ[v] - cs * hl);
  let pt = atand((hf - hb) / (hl * 2));
  let rl = 0;
  if (k < 4) {
    let hr = hAt(VX[v] + cs * hw, VZ[v] - sn * hw), hlf = hAt(VX[v] - cs * hw, VZ[v] + sn * hw);
    rl = atand((hlf - hr) / (hw * 2));
  } else { rl = Math.max(-28, Math.min(28, vTurn * 0.35)); }
  if (snap == 1) { VPIT[v] = pt; VROL[v] = rl; } else { VPIT[v] = VPIT[v] + (pt - VPIT[v]) * 0.35; VROL[v] = VROL[v] + (rl - VROL[v]) * 0.3; }
  vSelf = v;
  scanBoxes(VX[v], VY[v] + 10, VZ[v], VKHW[k] * 0.6, 100, 70);
  vSelf = 0;
  // (roads lie 12 cm over the ground)
  gndB = Math.max(gndB, (hf + hb) / 2) + 6;
}
// is vehicle v blocked at (x, z) facing yaw? (boxes along its length, the sea, other vehicles)
let vHitV = 0;
function vehBlocked(v, x, z, yaw) {
  let k = VK[v], bl = 0;
  let cs = cosd(yaw), sn = sind(yaw), hl = VKHL[k] - VKHW[k] * 0.6, hw = VKHW[k];
  vSelf = v;
  let i = -1;
  vHitV = 0;
  while (i <= 1) {
    let px = x + sn * hl * i, pz = z + cs * hl * i;
    scanBoxes(px, VY[v] + 20, pz, hw, 130, 75);
    if (hitB == 1) { bl = 1; }
    if (hAt(px, pz) < -40) { bl = 1; }
    i = i + 1;
  }
  vSelf = 0;
  if (x < 1500 || z < 1500 || x > MAP - 1500 || z > MAP - 1500) { bl = 1; }
  return bl;
}
// one frame of vehicle v: throttle thr (-1..1), steer st (-1..1), brake br (0/1)
function vehDrive(v, thr, st, br, dt) {
  let k = VK[v];
  let mx = VKMAX[k];
  let c = Math.floor(VZ[v] / CS) * CELLS + Math.floor(VX[v] / CS) + 1;
  if (c >= 1) { if (c <= CELLS * CELLS) { if (RCN[c] == 0) { mx = mx * VKOFF[k]; } } }
  if (VON[v] != 1) { thr = 0; br = 1; }
  let sp = VSPD[v];
  if (thr > 0) { if (sp < 0) { sp = sp + 2400 * dt; } else { sp = sp + VKACC[k] * thr * dt * Math.max(0.15, 1 - sp / mx); } }
  if (thr < 0) { if (sp > 0) { sp = sp - 2400 * dt; } else { if (sp > 0 - mx * 0.3) { sp = sp - VKACC[k] * 0.6 * dt; } } }
  if (thr == 0) { sp = sp - sp * 0.55 * dt; if (Math.abs(sp) < 40) { sp = 0; } }
  if (br == 1) { if (sp > 0) { sp = Math.max(0, sp - 2800 * dt); } else { sp = Math.min(0, sp + 2800 * dt); } }
  if (sp > mx) { sp = sp - (sp - mx) * 2 * dt; }
  // up and down hills
  sp = sp - 980 * sind(VPIT[v]) * dt * 0.7;
  // turning: the circle tightens with the wheel, widens with speed
  vTurn = 0;
  let yaw0 = VYAW[v];
  if (Math.abs(sp) > 20) {
    let rate = st * sp / VKTURN[k] * 57.3 / (1 + Math.abs(sp) / 4200);
    rate = Math.max(-80, Math.min(80, rate));
    if (VVS[v] != 0) { rate = rate * 0.2; }
    VYAW[v] = VYAW[v] + rate * dt; vTurn = rate;
    if (VYAW[v] >= 360) { VYAW[v] = VYAW[v] - 360; }
    if (VYAW[v] < 0) { VYAW[v] = VYAW[v] + 360; }
  }
  let nx = VX[v] + sind(VYAW[v]) * sp * dt, nz = VZ[v] + cosd(VYAW[v]) * sp * dt;
  if (sp != 0) {
    if (vehBlocked(v, nx, nz, VYAW[v]) == 1) { if (vehBlocked(v, VX[v], VZ[v], yaw0) == 1) {
      // (already in something - out of it any way it goes)
      VX[v] = nx; VZ[v] = nz;
    } else {
      VYAW[v] = yaw0;
      // a crash: it bounces back; hard ones hurt the vehicle and who is in it
      let hit = Math.abs(sp);
      sp = 0 - sp * 0.25;
      if (hit > 650) {
        VHP[v] = VHP[v] - (hit - 650) * 0.16;
        if (Math.abs(VX[v] - camX) + Math.abs(VZ[v] - camZ) < 6000) { sfx('crash', 0); }
        if (hit > 1500) { if (VDRV[v] > 0) { hurt(VDRV[v], 0, (hit - 1500) / 45, 2, -1); } }
        fxAdd(nx, VY[v] + 80, nz, 1);
      }
    } } else { VX[v] = nx; VZ[v] = nz; }
  }
  VSPD[v] = sp;
  // the ground: follow it down a slope, fly off a crest
  vehGround(v, 0);
  let g = gndB;
  if (VY[v] > g + 25) {
    VVS[v] = VVS[v] - 980 * dt;
    VY[v] = VY[v] + VVS[v] * dt;
    if (VY[v] <= g) {
      if (VVS[v] < -700) { VHP[v] = VHP[v] + (VVS[v] + 700) * 0.1; }
      VY[v] = g; VVS[v] = 0;
    }
  } else {
    // a crest at speed lifts it off the ground
    if (g < VY[v] - 6) { if (Math.abs(sp) > 1400) { VVS[v] = sp * sind(VPIT[v]) * 0.5; } }
    VY[v] = g; if (VVS[v] < 0) { VVS[v] = 0; }
    if (VVS[v] > 0) { VY[v] = VY[v] + VVS[v] * dt; }
  }
  // people in the way; the engine is heard
  if (Math.abs(sp) > 350) { vehRunOver(v); }
  if (Math.abs(sp) > 500) { if (rand(1, 100) <= 6) { soundEvent(VX[v], VY[v], VZ[v], 7000, VDRV[v], 3); } }
  if (VHP[v] <= 0) { if (VON[v] == 1) { vehBlow(v); } }
}
// anyone standing in the vehicle's way is hit
function vehRunOver(v) {
  let k = VK[v];
  let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
  let e = 1;
  while (e <= NE) {
    if (EALIVE[e] == 1) { if (EVEH[e] == 0) { if (EAIR[e] == 0) {
      let px = EX[e], pz = EZ[e], py = EY[e];
      if (e == 1) { px = plX; pz = plZ; py = plY; }
      let dx = px - VX[v], dz = pz - VZ[v];
      if (Math.abs(dx) + Math.abs(dz) < 700) {
        let lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
        if (Math.abs(lx) < VKHW[k] + 35) { if (Math.abs(lz) < VKHL[k] + 35) { if (Math.abs(py - VY[v]) < 170) { if (gameT - EVHT[e] > 0.7) {
          EVHT[e] = gameT;
          let sp = Math.abs(VSPD[v]);
          // thrown aside
          let side = 1;
          if (lx < 0) { side = -1; }
          if (e == 1) { plX = plX + cs * side * 90; plZ = plZ - sn * side * 90; } else { EX[e] = EX[e] + cs * side * 90; EZ[e] = EZ[e] - sn * side * 90; }
          hurt(e, VDRV[v], sp / 100 * 4.2, 2, -1);
          VSPD[v] = VSPD[v] * 0.8;
          fxAdd(px, py + 100, pz, 2);
        } } } }
      }
    } } }
    e = e + 1;
  }
}
// the vehicle burns out: a blast, whoever is in it dies, it stays as a wreck
function vehBlow(v) {
  VON[v] = 2; VSPD[v] = 0;
  fxAdd(VX[v], VY[v] + 120, VZ[v], 3); fxAdd(VX[v], VY[v] + 200, VZ[v], 4);
  soundEvent(VX[v], VY[v], VZ[v], 40000, VLASTA[v], 1);
  sfxAt(SND_BOOM, VX[v], VZ[v]);
  let d = VDRV[v];
  if (d > 0) { vehOut(d, 0); hurt(d, VLASTA[v], 300, 2, -1); }
  let e = 1;
  while (e <= NE) {
    if (EALIVE[e] == 1) { if (EAIR[e] == 0) {
      let px = EX[e], pz = EZ[e];
      if (e == 1) { px = plX; pz = plZ; }
      let dd = Math.sqrt((px - VX[v]) * (px - VX[v]) + (pz - VZ[v]) * (pz - VZ[v]));
      if (dd < 600) { hurt(e, VLASTA[v], 70 * (1 - dd / 600), 2, -1); }
    } }
    e = e + 1;
  }
}
// e gets in vehicle v / gets out (drop: where to stand)
function vehIn(e, v) {
  EVEH[e] = v; VDRV[v] = e;
  if (e == 1) { plVeh = v; wAdsT = 0; ERELT[1] = 0; EUSE[1] = 0; sfx(SND_EQUIP, 0); vLookT = 0; }
  vehSeat(e);
}
function vehOut(e, place) {
  let v = EVEH[e];
  if (v > 0) {
    EVEH[e] = 0; VDRV[v] = 0;
    if (place == 1) {
      // beside the driver's door, else the other side, else behind
      let k = VK[v];
      let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
      let ok = 0, tries = 0, x = VX[v], z = VZ[v];
      while (ok == 0) {
        let ox = 0 - VKHW[k] - 75, oz = 0;
        if (tries == 1) { ox = VKHW[k] + 75; }
        if (tries == 2) { ox = 0; oz = 0 - VKHL[k] - 70; }
        if (tries == 3) { ox = 0; oz = VKHL[k] + 70; }
        x = VX[v] + cs * ox + sn * oz; z = VZ[v] - sn * ox + cs * oz;
        vSelf = v;
        scanBoxes(x, VY[v] + 40, z, PRAD, PH, 60);
        vSelf = 0;
        if (hitB == 0) { ok = 1; }
        tries = tries + 1;
        if (tries > 3) { ok = 1; }
      }
      scanBoxes(x, VY[v] + 150, z, PRAD, PH, 200);
      let y = Math.max(gndB, hAt(x, z));
      if (e == 1) { plX = x; plZ = z; plY = y; plVY = 0; } else { EX[e] = x; EZ[e] = z; EY[e] = y; EVY[e] = 0; }
      // jumping out at speed hurts
      let sp = Math.abs(VSPD[v]);
      if (sp > 900) { hurt(e, 0, (sp - 900) / 60, 2, -1); }
    }
    if (e == 1) { plVeh = 0; plEye = 160; sfx(SND_EQUIP, 0); }
  }
}
// the driver sits in the seat
function vehSeat(e) {
  let v = EVEH[e];
  let k = VK[v];
  let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
  let ox = 0 - VKHW[k] * 0.35, oz = 0 - VKHL[k] * 0.12;
  if (k == 4) { ox = 0; oz = 0 - 25; }
  let x = VX[v] + cs * ox + sn * oz, z = VZ[v] - sn * ox + cs * oz, y = VY[v] + VKSEAT[k] - 92 + Math.max(0, VPIT[v]) * 0;
  EX[e] = x; EY[e] = y; EZ[e] = z; EYAW[e] = VYAW[v]; EMOV[e] = 0; ECRO[e] = 0;
  if (e == 1) { plX = x; plY = y; plZ = z; }
}

// ---------------------------------------------------------------- the player
// the nearest free vehicle within reach: vNear (0: none), vNearD
function vehFindNear() {
  vNear = 0; vNearD = 330;
  let v = 1;
  while (v <= NV) {
    if (VON[v] == 1) { if (VDRV[v] == 0) {
      let dx = VX[v] - plX, dz = VZ[v] - plZ;
      if (Math.abs(dx) + Math.abs(dz) < 800) { if (Math.abs(VY[v] - plY) < 200) {
        let k = VK[v];
        let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
        let lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
        let d = Math.max(0, Math.abs(lx) - VKHW[k]) + Math.max(0, Math.abs(lz) - VKHL[k]);
        if (d < vNearD) { vNearD = d; vNear = v; }
      } }
    } }
    v = v + 1;
  }
}
// on foot: F gets in (when no item is nearer)
function playerVehCheck() {
  vehFindNear();
  if (vNear > 0) {
    if (keyHit(70) == 1) { if (pickItem == 0 || vNearD < pickD * 0.5) { vehIn(1, vNear); KHIT[70] = 0; } }
  }
}
// driving
function playerDrive(dt) {
  let v = plVeh;
  let thr = 0, st = 0, br = 0;
  if (key(87)) { thr = 1; }
  if (key(83)) { thr = -1; }
  if (key(68)) { st = st + 1; }
  if (key(65)) { st = st - 1; }
  if (key(32)) { br = 1; }
  vehDrive(v, thr, st, br, dt);
  if (EVEH[1] == v) {
    vehSeat(1);
    // the engine
    VSND[v] = VSND[v] - dt;
    if (VSND[v] <= 0) {
      VSND[v] = 0.42;
      let sp = Math.abs(VSPD[v]);
      if (sp < 500) { sfx('eng1', 0); } else { if (sp < 1700) { sfx('eng2', 0); } else { sfx('eng3', 0); } }
    }
    if (keyHit(70) == 1) { vehOut(1, 1); KHIT[70] = 0; }
  }
  plMoving = 0; plSprint = 0; plCrouch = 0; plGround = 1;
}
// the camera turns after the vehicle while the mouse is left alone
function driveLook(dt, mouseMoved) {
  if (mouseMoved == 1) { vLookT = 1.2; }
  vLookT = Math.max(0, vLookT - dt);
  if (vLookT <= 0) {
    if (Math.abs(VSPD[plVeh]) > 200) {
      let want = VYAW[plVeh];
      if (VSPD[plVeh] < 0) { want = want + 0; }
      let d = want - plYaw;
      if (d > 180) { d = d - 360; }
      if (d < -180) { d = d + 360; }
      plYaw = plYaw + d * Math.min(1, dt * 2.2);
      plPitch = plPitch + (-8 - plPitch) * Math.min(1, dt * 1.5);
    }
  }
}

// ---------------------------------------------------------------- bots
// the nearest free vehicle within r of (x, z) no other bot is walking to: v or 0
function vehFree(x, z, r) {
  let best = 0, bd = r, v = 1;
  while (v <= NV) {
    if (VON[v] == 1) { if (VDRV[v] == 0) {
      let d = Math.abs(VX[v] - x) + Math.abs(VZ[v] - z);
      if (d < bd) {
        let taken = 0, e = 2;
        while (e <= NE) { if (AVEH[e] == v) { taken = 1; } e = e + 1; }
        if (taken == 0) { bd = d; best = v; }
      }
    } }
    v = v + 1;
  }
  return best;
}
// a bot far from where it must go walks to a vehicle near it
function botWantVeh(e, far) {
  if (EVEH[e] == 0) { if (AVEH[e] == 0) { if (far > 15000) { if (gameT > 60) {
    let v = vehFree(EX[e], EZ[e], 9000);
    if (v > 0) { AVEH[e] = v; pathAsk(e, nearNode(VX[v], VY[v], VZ[v])); }
  } } } }
}
// a bot at the wheel (near the player): ahead along the zone's flow field, out when it is there,
// stuck, or someone close is in sight
function botDrive(e, dt) {
  let v = EVEH[e];
  botGunTick(e, dt);
  healStep(e, dt);
  if (gameT >= APER[e]) { APER[e] = gameT + 0.3; botPerceive(e); }
  let t = ATGT[e], out = 0;
  if (t > 0) { if (EALIVE[t] == 1) { if (gameT - ALT[e] < 3) {
    let dx = EX[t] - EX[e], dz = EZ[t] - EZ[e];
    if (dx * dx + dz * dz < 5000 * 5000) { out = 1; }
  } } }
  if (VON[v] != 1) { out = 1; }
  if (gameT >= AVTT[e]) {
    AVTT[e] = gameT + 0.6;
    let gx = znx, gz = znz;
    let n = nearNode(EX[e], EY[e], EZ[e]);
    if (n > 0) { if (FST[n] == fStamp) { let g = n, s = 0; while (s < 6) { if (FNX[g] > 0) { g = FNX[g]; } s = s + 1; } gx = NDX[g]; gz = NDZ[g]; } }
    AVTX[e] = gx; AVTZ[e] = gz;
  }
  let arrived = 1;
  if (zPhase > 0) { let zx = EX[e] - znx, zz = EZ[e] - znz; if (Math.sqrt(zx * zx + zz * zz) > znr * 0.6) { arrived = 0; } }
  let thr = 1, st = 0, br = 0;
  let dd = atan2d(AVTX[e] - VX[v], AVTZ[e] - VZ[v]) - VYAW[v];
  if (dd > 180) { dd = dd - 360; }
  if (dd < -180) { dd = dd + 360; }
  st = Math.max(-1, Math.min(1, dd / 30));
  if (Math.abs(dd) > 55) { thr = 0.4; }
  if (out == 1 || arrived == 1) { thr = 0; br = 1; }
  // stuck: back off a little and try again (a few times, then walk)
  if (VREV[v] > 0) { VREV[v] = VREV[v] - dt; thr = -1; st = 0 - st; br = 0; }
  else {
    if (thr > 0) { if (Math.abs(VSPD[v]) < 150) { VSTUCK[v] = VSTUCK[v] + dt; if (VSTUCK[v] > 1.4) { VSTUCK[v] = 0; VREV[v] = 1.2; AVSTK[e] = AVSTK[e] + 1; } } else { VSTUCK[v] = Math.max(0, VSTUCK[v] - dt); } }
  }
  if (AVSTK[e] > 4) { out = 1; thr = 0; br = 1; }
  vehDrive(v, thr, st, br, dt);
  if (EVEH[e] == v) {
    vehSeat(e);
    if (out == 1 || arrived == 1) { if (Math.abs(VSPD[v]) < 260) {
      vehOut(e, 1); AVSTK[e] = 0; ADEC[e] = 0; PLEN[e] = 0;
      if (t > 0) { if (out == 1) { AMODE[e] = MD_FIGHT; } }
    } }
  }
}

// ---------------------------------------------------------------- bullets
// where segment (x0..x1) first meets the body of vehicle v (below its windows): t, or 2
function segVeh(v, x0, y0, z0, x1, y1, z1) {
  let r = 2;
  let k = VK[v];
  let rd = VKRAD[k];
  if (Math.min(x0, x1) < VX[v] + rd) { if (Math.max(x0, x1) > VX[v] - rd) { if (Math.min(z0, z1) < VZ[v] + rd) { if (Math.max(z0, z1) > VZ[v] - rd) {
    let cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
    let ax = x0 - VX[v], az = z0 - VZ[v], bx = x1 - VX[v], bz = z1 - VZ[v];
    let lax = cs * ax - sn * az, laz = sn * ax + cs * az, lbx = cs * bx - sn * bz, lbz = sn * bx + cs * bz;
    let lay = y0 - VY[v], lby = y1 - VY[v];
    let top = 128;
    if (VKOPEN[k] == 1) { top = VKSEAT[k] - 5; }
    if (VON[v] == 2) { top = 150; }
    let t0 = 0, t1 = 1, ok = 1, ta = 0, tb = 0;
    let ddx = lbx - lax, ddy = lby - lay, ddz = lbz - laz;
    if (ddx == 0) { if (Math.abs(lax) > VKHW[k]) { ok = 0; } } else { ta = (0 - VKHW[k] - lax) / ddx; tb = (VKHW[k] - lax) / ddx; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
    if (ddz == 0) { if (Math.abs(laz) > VKHL[k]) { ok = 0; } } else { ta = (0 - VKHL[k] - laz) / ddz; tb = (VKHL[k] - laz) / ddz; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
    if (ddy == 0) { if (lay < 25 || lay > top) { ok = 0; } } else { ta = (25 - lay) / ddy; tb = (top - lay) / ddy; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
    if (ok == 1) { if (t0 <= t1) { r = t0; } }
  } } } }
  return r;
}
function vehShot(v, a, dm) {
  VHP[v] = VHP[v] - dm * 0.55;
  VLASTA[v] = a;
  if (a == 1) { hitMk = 0.12; hitMkC = '#a0a8b0'; }
  // the driver of a vehicle being shot knows where from
  if (VDRV[v] > 1) { botHurtBy(VDRV[v], a); }
  if (VHP[v] <= 0) { if (VON[v] == 1) { vehBlow(v); } }
}

// ---------------------------------------------------------------- drawing
function vehDyn() {
  let lim = (drawR + 1) * CS;
  let v = 1;
  while (v <= NV) {
    if (VON[v] > 0) { if (Math.abs(VX[v] - camX) < lim) { if (Math.abs(VZ[v] - camZ) < lim) { dynAdd(9000 + v, VX[v], VY[v], VZ[v]); } } }
    v = v + 1;
  }
}
function drawVeh(v, dist) {
  let k = VK[v];
  if (inView(VX[v], VY[v] + 100, VZ[v], VKRAD[k]) == 1) {
    let lod = 0;
    if (dist > 1800) { lod = 1; }
    if (dist > 6000) { lod = 2; }
    if (highView == 1) { lod = 2; }
    let tint = VTINT[v];
    if (VON[v] == 2) { tint = 192; }
    drawVehModel((VBASE + k - 1) * 3 + lod + 1, VX[v], VY[v], VZ[v], VYAW[v], VPIT[v], VROL[v], fogOf(dist), tint);
    // the rider of an open vehicle, after it
    if (VKOPEN[k] == 1) { let d = VDRV[v]; if (d > 0) { if (d > 1 || camThird == 1) { drawPerson(d, dist); } } }
  }
}
// a model in the world at (x, y, z): yaw, then pitch (nose up) and roll (right side down), cm units
function drawVehModel(q, x, y, z, yaw, pit, rol, fog, tint) {
  let cy = cosd(yaw), sy = sind(yaw), cp = cosd(pit), sp = sind(pit), cr = cosd(rol), sr = sind(rol);
  // the body's axes in the world: right (r), up (u), forward (f); pitched, then rolled about f
  let fx = sy * cp, fy = sp, fz = cy * cp;
  let ux0 = 0 - sy * sp, uy0 = cp, uz0 = 0 - cy * sp;
  let rx0 = cy, rz0 = 0 - sy;
  let rx = rx0 * cr - ux0 * sr, ry = 0 - uy0 * sr, rz = rz0 * cr - uz0 * sr;
  let ux = ux0 * cr + rx0 * sr, uy = uy0 * cr, uz = uz0 * cr + rz0 * sr;
  m11 = r11 * rx + r13 * rz; m12 = r11 * ux + r13 * uz; m13 = r11 * fx + r13 * fz;
  m21 = r21 * rx + r22 * ry + r23 * rz; m22 = r21 * ux + r22 * uy + r23 * uz; m23 = r21 * fx + r22 * fy + r23 * fz;
  m31 = r31 * rx + r32 * ry + r33 * rz; m32 = r31 * ux + r32 * uy + r33 * uz; m33 = r31 * fx + r32 * fy + r33 * fz;
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  t1 = r11 * dx + r13 * dz; t2 = r21 * dx + r22 * dy + r23 * dz; t3 = r31 * dx + r32 * dy + r33 * dz;
  let ex = 0 - dx, ey = 0 - dy, ez = 0 - dz;
  drawModel(q, rx * ex + ry * ey + rz * ez, ux * ex + uy * ey + uz * ez, fx * ex + fy * ey + fz * ez, fog, tint);
}

// (tests only: the harness sets testCmd) 1: the player on the ground beside vehicle 1; 2: in it
let testCmd = 0, tPF = 0, tLX = 0, tLY = 0, tLZ = 0, tYaw = 0, tPitch = 0;
function testStep() {
  // @test{
  if (testCmd == 1) {
    EAIR[1] = 0; gState = 2; plVY = 0;
    plX = VX[1] + cosd(VYAW[1]) * 300; plZ = VZ[1] - sind(VYAW[1]) * 300;
    scanBoxes(plX, 99999, plZ, PRAD, PH, 999999); plY = gndB; plYaw = VYAW[1]; plPitch = -5;
  }
  if (testCmd == 2) { if (plVeh == 0) { vehIn(1, 1); } }
  // 3: the player at (tLX, tLY, tLZ) inside the first instance of prefab tPF, looking tYaw (prefab frame), tPitch
  if (testCmd == 3) {
    let ti = 1;
    while (ti <= N_IPF) { if (IPF[ti] == tPF) { tPF = 0 - tPF; } else { ti = ti + 1; } if (tPF < 0) { tPF = 0 - tPF; ti = ti + 1000000; } }
    ti = ti - 1000000;
    if (ti >= 1) {
      let tr = IR[ti];
      let twx = tLX, twz = tLZ;
      if (tr == 1) { twx = tLZ; twz = 0 - tLX; }
      if (tr == 2) { twx = 0 - tLX; twz = 0 - tLZ; }
      if (tr == 3) { twx = 0 - tLZ; twz = tLX; }
      EAIR[1] = 0; gState = 2; plVY = 0;
      plX = IX[ti] + twx; plZ = IZ[ti] + twz; plY = IY[ti] + tLY;
      plYaw = tYaw + tr * 90; plPitch = tPitch;
    }
  }
  // @test}
  testCmd = 0;
}
