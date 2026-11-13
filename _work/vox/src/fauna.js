// ===================================================================== (v3.0) the genre's other creatures
// A mob's state besides mobs.js's: ESZ its size (0.5 a young one; a puffed fish more), EOWN 1 tamed,
// 2 tamed and sitting, -1 one of a raid; EAGE below 0 the seconds till a young one is grown; ELOVE above
// 0 ready to breed, below 0 resting after it; EVAR marks (odd: a saddle, a raid captain, a charged
// mushroom, an armed drowned; a shell's opening; a horse's build in the rest); ETG the mob it goes for
// (below 0: the one it runs from; a horse's temper); ECNV seconds towards a change (drowned, rotted,
// cured), or a spirit's, a mite's, a stung bee's life.
let ESZ = [], EOWN = [], EAGE = [], ELOVE = [], EVAR = [], ETG = [], ECNV = [];
// petTgt: what the tamed wolves go for (the one that hurt the player or that the player hit); pKill 1
// while the player (or a pet) deals the blow (rare drops and xp come only then); hitBy the kind that hit
let petTgt = 0, pKill = 0, hitBy = 0, flyTY = 0, sleptDay = 0, kingE = 0;
function faunaInit() {
  ESZ = []; EOWN = []; EAGE = []; ELOVE = []; EVAR = []; ETG = []; ECNV = [];
  let i = 0;
  while (i < NMOB) { ESZ.push(1); EOWN.push(0); EAGE.push(0); ELOVE.push(0); EVAR.push(0); ETG.push(0); ECNV.push(0); i = i + 1; }
  petTgt = 0; kingE = 0; raidOn = 0;
}
function mobInit(e, t) {
  ESZ[e] = 1; EOWN[e] = 0; EAGE[e] = 0; ELOVE[e] = 0; EVAR[e] = 0; ETG[e] = 0; ECNV[e] = 0;
  if (MAI[t] == 13) { EHP[e] = rand(15, 30); EVAR[e] = 2 * rand(0, 99); if (t == M_BONEHORSE) { EHP[e] = 15; } }
  if (t == M_ZOMBIE || t == M_HUSK || t == M_DROWNED || t == M_ZOMBIEVILLAGER) { if (rand(1, 20) == 1) { ESZ[e] = 0.5; EAGE[e] = 0 - 999999; } }
  if (t == M_DROWNED) { if (rand(1, 16) == 1) { EVAR[e] = 1; } }
  if (t == M_SPRITE) { ECNV[e] = rand(30, 119); }
  if (t == M_VOIDMITE) { ECNV[e] = 120; }
  if (t == M_ELDERGUARDIAN) { ECNV[e] = 5; }
  if (t == M_TRADER) { ECNV[e] = rand(2400, 3600); }
  if (t == M_BONEKING) { EOWN[e] = 4; }
  if (t == M_BONEKING) { EST[e] = 8; ETM[e] = 10; EHP[e] = 100; }
}
function isBaby(e) { let r = 0; if (EAGE[e] < 0) { if (EAGE[e] > 0 - 999000) { r = 1; } } return r; }
// the zombie kinds (they turn villagers, go for them)
function isDead(t) { let r = 0; if (t == M_ZOMBIE || t == M_HUSK || t == M_DROWNED || t == M_ZOMBIEVILLAGER) { r = 1; } return r; }
function isRaider(t) { let r = 0; if (t == M_RAIDER || t == M_AXERAIDER || t == M_CONJURER || t == M_RAVAGER || t == M_WITCH) { r = 1; } return r; }

// ---------------------------------------------------------------- each frame, before a mob's step
// (it may take the step's way: golemT, golemWant, golemYaw as the iron keeper's hunt does)
function faunaStep(e, t, dt, dist) {
  let ai = MAI[t];
  if (EAGE[e] < 0) { EAGE[e] = EAGE[e] + dt; if (EAGE[e] >= 0) { EAGE[e] = 0; ESZ[e] = 1; } }
  if (ELOVE[e] > 0) { ELOVE[e] = Math.max(0, ELOVE[e] - dt); loveSeek(e, t); }
  else { if (ELOVE[e] < 0) { ELOVE[e] = Math.min(0, ELOVE[e] + dt); } }
  // changes: the dead drown (30 s under), the depths' folk rot under another sky (15 s), a cured one comes round
  if (t == M_ZOMBIE || t == M_HUSK) { if (headIn(e) == 1) { ECNV[e] = ECNV[e] + dt; if (ECNV[e] > 30) { ECNV[e] = 0; if (t == M_ZOMBIE) { ET[e] = M_DROWNED; } else { ET[e] = M_ZOMBIE; } } } else { ECNV[e] = 0; } }
  if (t == M_ASHPIG || t == M_ASHBOAR) { if (dim != 1) { ECNV[e] = ECNV[e] + dt; if (ECNV[e] > 15) { ECNV[e] = 0; if (t == M_ASHPIG) { ET[e] = M_ROTPIG; } else { ET[e] = M_ROTBOAR; } } } }
  if (t == M_ZOMBIEVILLAGER) { if (EVAR[e] == 2) { ECNV[e] = ECNV[e] - dt; if (ECNV[e] <= 0) { ET[e] = M_VILLAGER; EHP[e] = 20; EVAR[e] = 0; msgShow('좀비 마을 사람이 치료되었습니다', 2); sndPlay(6); } } }
  if (t == M_SPRITE || t == M_VOIDMITE || t == M_TRADER || (t == M_BEE && EVAR[e] == 1)) { ECNV[e] = ECNV[e] - dt; if (ECNV[e] <= 0) { ET[e] = 0; } }
  // the wanderer and water: hurt and away
  if (t == M_WANDERER) { if (mod(frameNo + e, 10) == 0) { let wb = blockAt(Math.floor(EX[e]), Math.floor(EY[e] + 0.5), Math.floor(EZ[e])); if (BLQ[wb + 1] == 7 || rainOn(Math.floor(EX[e]), Math.floor(EY[e] + 2.9), Math.floor(EZ[e])) == 1) { EHURT[e] = 0; mobHurt(e, 1, 0, 0); if (ET[e] > 0) { wanderTeleport(e); } } } }
  // the witch drinks to heal; the elder fish curse the miner; the dolphin's grace; the puffer puffs
  if (t == M_WITCH) { if (EHP[e] < 13) { if (rand(1, 150) == 1) { EHP[e] = EHP[e] + 4; sndPlay(6); } } }
  if (t == M_ELDERGUARDIAN) { ECNV[e] = ECNV[e] - dt; if (ECNV[e] <= 0) { ECNV[e] = 60; if (dist < 50 && mod(gameMode, 2) == 0) { if (EFT[19] < 60) { effectAdd(19, 300, 3); msgShow(`${MNAME[t]}의 저주: 채굴 피로`, 2); } } } }
  if (t == M_DOLPHIN) { if (inWater == 1 && dist < 6) { effectAdd(20, 5, 1); } }
  if (t == M_PUFFERFISH) {
    let d3 = Math.sqrt(dist * dist + (py + 0.8 - EY[e]) * (py + 0.8 - EY[e]));
    if (d3 < 2.5 && mod(gameMode, 2) == 0) { ESZ[e] = 1.6; if (d3 < 1.2 && EATK[e] <= 0) { EATK[e] = 1; hurtM(MDMG[t], `${MNAME[t]}에 찔렸습니다`); mobBite(e, t); } } else { ESZ[e] = 1; }
  }
  // the lit snow keeper melts where it is warm or wet, and leaves snow where it is cold
  if (t == M_SNOWKEEPER) {
    let bi = BIOM[wcol(Math.floor(EX[e]), Math.floor(EZ[e]))], fx0 = Math.floor(EX[e]), fz0 = Math.floor(EZ[e]), fy0 = Math.floor(EY[e] + 0.1);
    if (dim != 0 || bi == 4 || bi == 12 || bi == 14 || rainOn(fx0, fy0 + 2, fz0) == 1) { if (mod(frameNo + e, 30) == 0) { EHURT[e] = 0; mobHurt(e, 1, 0, 0); } }
    else { if (netSrv == 0 && EGND[e] == 1 && mod(frameNo + e, 8) == 0) { if (blockAt(fx0, fy0, fz0) == 0 && BSOL[blockAt(fx0, fy0 - 1, fz0) + 1] == 1) { setBlock(fx0, fy0, fz0, I_snowLayer); } } }
  }
  // water creatures on dry land: they flop and choke (a dolphin slowly; the spiny fish keep on)
  if (MSWIM[t] == 1) { if (BLQ[blockAt(Math.floor(EX[e]), Math.floor(EY[e] + 0.2), Math.floor(EZ[e])) + 1] != 7) {
    golemT = 1; golemWant = 0; golemYaw = EYAW[e];
    if (EGND[e] == 1) { if (rand(1, 20) == 1) { EVY[e] = 4; EYAW[e] = rand(0, 359); } }
    if (t != M_GUARDIAN && t != M_ELDERGUARDIAN) { ECNV[e] = ECNV[e] + dt; if (ECNV[e] > 1) { ECNV[e] = 0; if (t != M_DOLPHIN || rand(1, 60) == 1) { EHURT[e] = 0; mobHurt(e, 1, 0, 0); } } }
  } }
  if (t == M_RABBIT) { if (EGND[e] == 1) { if (Math.abs(EVX[e]) + Math.abs(EVZ[e]) > 0.4) { EVY[e] = 4.5; } } }
  // the king of the black bones: ten seconds of growing, then the blast; it mends a point a second
  if (t == M_BONEKING) {
    kingE = e;
    if (EST[e] == 8) { golemT = 1; golemWant = 0; golemYaw = EYAW[e] + 3; EHP[e] = Math.min(300, EHP[e] + 20 * dt); EVY[e] = 0; if (ETM[e] <= 0) { EST[e] = 0; explodeShared(EX[e], EY[e] + 1.5, EZ[e], 107); } }
    else { if (mod(frameNo, 30) == 0) { EHP[e] = Math.min(300, EHP[e] + 1); } }
  }
  // the guardians' beam: it takes three seconds of sight to strike
  if (MSHOT[t] == 8) { if (EST[e] == 7) {
    golemT = 1; golemWant = 0; golemYaw = atan2d(px - EX[e], pz - EZ[e]);
    if (dist > 16 || dead == 1 || sightLine(EX[e], EY[e] + 0.5, EZ[e], px, py + 1.2, pz) == 0) { EST[e] = 0; }
    else { if (ETM[e] <= 0) { EST[e] = 0; EATK[e] = 3; hurtM(MDMG[t], `${MNAME[t]}의 빛줄기에 맞았습니다`); } }
  } }
  // the armed drowned throw; an angry llama spits
  if (t == M_DROWNED && EVAR[e] == 1) { if (dist > 4 && dist < 14 && EATK[e] <= 0 && mod(gameMode, 2) == 0 && dead == 0 && difficulty > 0) { EATK[e] = 3; mobShoot(e, px, py + 1.2, pz); } }
  if (t == M_LLAMA && EST[e] == 4) { if (EATK[e] <= 0 && dist < 12 && dead == 0) { EATK[e] = 2; mobShoot(e, px, py + 1.4, pz); } if (ETM[e] <= 0) { EST[e] = 0; } }
  // the flying biters: spirits, the night's shades, an angry bee
  if (ai == 12) { flyBite(e, t, dt, dist); }
  // pets: sit, follow, fight for the player
  if ((EOWN[e] == 1 || EOWN[e] == 2) && ai != 13) {
    if (EOWN[e] == 2) { golemT = 1; golemWant = 0; golemYaw = EYAW[e]; }
    else {
      let tg = 0;
      if (t == M_WOLF) { tg = petTgt; if (tg > 0) { if (ET[tg] == 0 || EOWN[tg] > 0 || tg == e) { tg = 0; petTgt = 0; } } }
      if (tg > 0) { huntAt(e, t, tg); }
      else {
        if (dist > 14) { teleNear(e); }
        if (dist > 5) { golemT = 1; golemWant = 1.3; golemYaw = atan2d(px - EX[e], pz - EZ[e]); }
      }
    }
  }
  // riding: a saddled horse goes the way the rider looks
  if (riding == e) { rideStep(e, t, dt); }
  // hunters and the hunted
  if (golemT == 0) {
    let hk = huntKind(e, t, dist);
    if (hk > 0) { huntStep(e, t, hk); }
  }
  if (golemT == 0) { if (t == M_BOMBSHROOM || t == M_SKELETON || t == M_STRAY) {
    if (mod(frameNo + e * 3, 15) == 0) { ETG[e] = 0 - fleeFind(e, t); }
    let f = 0 - ETG[e];
    if (f > 0) { if (ET[f] > 0) { golemT = 1; golemWant = 1.2; golemYaw = atan2d(EX[e] - EX[f], EZ[e] - EZ[f]); if (t == M_BOMBSHROOM) { EST[e] = 0; } } }
  } }
}
// a bite's effect (poison, hunger, withering) on normal and hard
function mobBite(e, t) {
  petTgt = e;
  if (MHITE[t] > 0 && difficulty >= 2) { let s = MHITS[t]; if (difficulty == 3) { s = s * 2; } if (EFT[MHITE[t]] < s) { effectAdd(MHITE[t], s, 1); } }
}
// a tamed one too far away comes to the player's side
function teleNear(e) {
  let k = 0, x = 0, z = 0;
  while (k < 8) {
    x = Math.floor(px) + rand(-2, 2); z = Math.floor(pz) + rand(-2, 2);
    let y = Math.floor(py);
    if (blockAt(x, y, z) == 0 && blockAt(x, y + 1, z) == 0 && BSOL[blockAt(x, y - 1, z) + 1] == 1) { EX[e] = x + 0.5; EY[e] = y; EZ[e] = z + 0.5; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; k = 8; }
    k = k + 1;
  }
}

// ---------------------------------------------------------------- hunting
// 1 the hostile (the snow keeper), 2 a wild wolf's prey, 3 a fox's, 4 an ocelot's, 5 all (the rotted
// boar), 6 the village folk (the dead and the raiders, when the player is not near)
function huntKind(e, t, dist) {
  let k = 0;
  if (t == M_SNOWKEEPER) { k = 1; }
  if (t == M_WOLF && EOWN[e] == 0 && EST[e] != 4) { k = 2; }
  if (t == M_FOX) { k = 3; } if (t == M_OCELOT) { k = 4; } if (t == M_ROTBOAR) { k = 5; }
  if (isDead(t) == 1 || isRaider(t) == 1) { if (dist >= 16 || mod(gameMode, 2) == 1 || dead == 1) { k = 6; } }
  return k;
}
function preyOk(hk, u) {
  let r = 0;
  if (hk == 1) { if (MHOST[u] == 1 && u != M_BOMBSHROOM && u != M_WARDEN && u != M_BONEKING) { r = 1; } }
  if (hk == 2) { if (u == M_SHEEP || u == M_RABBIT || u == M_FOX || u == M_SKELETON || u == M_STRAY) { r = 1; } }
  if (hk == 3) { if (u == M_CHICKEN || u == M_RABBIT) { r = 1; } }
  if (hk == 4) { if (u == M_CHICKEN) { r = 1; } }
  if (hk == 5) { if (u != M_ROTBOAR && u != M_BOMBSHROOM && MSTILL[u] == 0 && u != M_NETPLAYER && MFLY[u] == 0 && MSWIM[u] != 1) { r = 1; } }
  if (hk == 6) { if (u == M_VILLAGER || u == M_TRADER) { r = 1; } }
  return r;
}
function huntStep(e, t, hk) {
  let f = ETG[e];
  if (f > 0) { if (ET[f] == 0) { f = 0; } }
  if (f <= 0 || mod(frameNo + e * 7, 30) == 0) {
    f = 0;
    let bd = 196, g = 1;
    if (hk == 1 || hk == 5) { bd = 256; }
    while (g <= NMOB) {
      if (g != e && ET[g] > 0) { if (preyOk(hk, ET[g]) == 1) { if (Math.abs(EY[g] - EY[e]) < 4) {
        let d = (EX[g] - EX[e]) * (EX[g] - EX[e]) + (EZ[g] - EZ[e]) * (EZ[g] - EZ[e]);
        if (d < bd) { bd = d; f = g; }
      } } }
      g = g + 1;
    }
    ETG[e] = f;
  }
  if (f > 0) { huntAt(e, t, f); }
}
function huntAt(e, t, f) {
  let dx = EX[f] - EX[e], dz = EZ[f] - EZ[e], d = Math.sqrt(dx * dx + dz * dz);
  golemT = 1; golemWant = 1; golemYaw = atan2d(dx, dz);
  if (t == M_WOLF || t == M_FOX || t == M_OCELOT) { golemWant = 1.4; }
  if (MSHOT[t] == 3) {
    if (d < 7) { golemWant = 0; }
    if (EATK[e] <= 0 && d < 12) { EATK[e] = 1; arrowShoot(EX[e] + dx / (d + 0.01) * 0.8, EY[e] + 1.4, EZ[e] + dz / (d + 0.01) * 0.8, EX[f], EY[f] + MH[ET[f]] * 0.6 + d * 0.06, EZ[f], 6); }
  } else {
    if (d < (MW[t] * ESZ[e] + MW[ET[f]] * ESZ[f]) / 2 + 0.8) { golemWant = 0; if (EATK[e] <= 0 && Math.abs(EY[f] - EY[e]) < 2) {
      EATK[e] = 1; hitBy = t; if (EOWN[e] > 0) { pKill = 1; }
      mobHurt(f, Math.max(1, MDMG[t]), dx, dz); hitBy = 0; pKill = 0;
    } }
  }
}
// the mushroom runs from cats, the archers from wolves
function fleeFind(e, t) {
  let r = 0, g = 1;
  while (g <= NMOB) {
    if (ET[g] > 0) {
      let u = ET[g], ok = 0;
      if (t == M_BOMBSHROOM) { if (u == M_CAT || u == M_OCELOT) { ok = 1; } } else { if (u == M_WOLF) { ok = 1; } }
      if (ok == 1) { if ((EX[g] - EX[e]) * (EX[g] - EX[e]) + (EZ[g] - EZ[e]) * (EZ[g] - EZ[e]) < 36) { r = g; } }
    }
    g = g + 1;
  }
  return r;
}

// ---------------------------------------------------------------- the flying biters
function flyBite(e, t, dt, dist) {
  let att = 1;
  if (t == M_BEE) { att = 0; if (EST[e] == 4 && EVAR[e] == 0) { att = 1; } }
  if (mod(gameMode, 2) == 1 || dead == 1 || difficulty == 0 || dist > 32) { att = 0; }
  flyTY = 0 - 999;
  if (att == 1) {
    let tx2 = px, tz2 = pz;
    flyTY = py + 0.9;
    if (t == M_PHANTOM) {
      if (EST[e] != 1) { let an = frameNo * 2 + e * 60; tx2 = px + sind(an) * 9; tz2 = pz + cosd(an) * 9; flyTY = py + 10; if (ETM[e] <= 0) { EST[e] = 1; ETM[e] = 4; } }
      else { if (ETM[e] <= 0) { EST[e] = 0; ETM[e] = rand(3, 8); } }
    }
    golemT = 1; golemWant = 1; golemYaw = atan2d(tx2 - EX[e], tz2 - EZ[e]);
    let dy = py + 0.9 - EY[e] - MH[t] / 2;
    if (dist < 1.2 && Math.abs(dy) < 1.2 && EATK[e] <= 0) {
      EATK[e] = 1; hurtM(MDMG[t], `${MNAME[t]}에게 당했습니다`); mobBite(e, t);
      if (t == M_PHANTOM) { EST[e] = 0; ETM[e] = rand(3, 8); }
      if (t == M_BEE) { EVAR[e] = 1; ECNV[e] = rand(20, 60); }
    }
  }
}
// their own way through the air (the spirits and shades through walls; the bees along them)
function flyFree(e, t, dt, tx, tz) {
  let a = Math.min(1, 3 * dt), ty = flyTY;
  EVX[e] = EVX[e] + (tx - EVX[e]) * a; EVZ[e] = EVZ[e] + (tz - EVZ[e]) * a;
  if (ty < -900) { ty = EY[e] + sind(frameNo * 3 + e * 50) * 0.8; if (BSOL[blockAt(Math.floor(EX[e]), Math.floor(EY[e]) - 1, Math.floor(EZ[e])) + 1] == 1) { ty = EY[e] + 1; } }
  EVY[e] = EVY[e] + ((ty - EY[e]) * 2 - EVY[e]) * a;
  if (t == M_BEE) {
    bmX = EX[e]; bmY = EY[e]; bmZ = EZ[e]; bmW = MW[t] / 2; bmH = MH[t]; bmStep = 0;
    bodyMove(EVX[e] * dt, EVY[e] * dt, EVZ[e] * dt);
    EX[e] = bmX; EY[e] = bmY; EZ[e] = bmZ;
  } else { EX[e] = EX[e] + EVX[e] * dt; EY[e] = EY[e] + EVY[e] * dt; EZ[e] = EZ[e] + EVZ[e] * dt; }
  EGND[e] = 0;
  EWALK[e] = EWALK[e] + 4 * dt;
}

// ---------------------------------------------------------------- shooting
// what each shooter throws (MSHOT): see blocks.mjs. Arrows' AEN for the mobs': an effect k x 1000 +
// seconds (100000 + that: a thrown potion; k 99 harming), -1 a trident, -2 spit, -3 a blast
let lastArr = 0;
function mobShoot(e, tx, ty, tz) {
  let t = ET[e], s = MSHOT[t], x = EX[e], y = EY[e] + 1.5 * ESZ[e], z = EZ[e];
  if (s == 0 || s == 1 || s == 4 || s == 6) {
    if (s == 1) { shotEn = 2030; } if (s == 4) { shotEn = 0 - 1; } if (s == 6) { shotEn = 0 - 2; }
    arrowShoot(x, y, z, tx, ty, tz, 0); shotEn = 0;
  }
  if (s == 2) {
    // the witch's potions: slowness from afar, poison while you are well, weakness near, else harming
    let k = 99, sec = 0, d = Math.sqrt((tx - x) * (tx - x) + (tz - z) * (tz - z));
    if (d >= 8 && fx(2) == 0) { k = 2; sec = 22; } else { if (hp >= 8 && fx(16) == 0) { k = 16; sec = 33; } else { if (d <= 3 && fx(18) == 0) { k = 18; sec = 67; } } }
    shotEn = 100000 + k * 1000 + sec; arrowShoot(x, y, z, tx, ty, tz, 0); shotEn = 0;
  }
  if (s == 5 || s == 7 || s == 10) {
    if (s == 7) { shotEn = 17010; } if (s == 10) { shotEn = 0 - 3; }
    arrowShoot(x, y - 0.4, z, tx, ty, tz, 2); shotEn = 0;
    if (s == 5) { ECNV[e] = ECNV[e] + 1; if (mod(ECNV[e], 3) != 0) { EATK[e] = 0.3; } }
  }
  if (s == 8) { EST[e] = 7; ETM[e] = 3; }
  if (s == 9) {
    ECNV[e] = ECNV[e] + 1;
    if (mod(ECNV[e], 3) == 0 && nKind(M_SPRITE) < 6) { let k = 0; while (k < 3) { mobAdd(M_SPRITE, x + rand(-10, 10) / 10, y + 0.5, z + rand(-10, 10) / 10); k = k + 1; } sndPlay(7); }
    else {
      // fangs: a ring round it when you are near, else a line of sixteen to you
      let dx = tx - x, dz = tz - z, d = Math.sqrt(dx * dx + dz * dz) + 0.01, k = 0;
      if (d < 3) { while (k < 8) { fangAt(x + sind(k * 45) * 1.5, EY[e], z + cosd(k * 45) * 1.5, 0); k = k + 1; } }
      else { while (k < 16) { fangAt(x + dx / d * (k + 1.2), EY[e], z + dz / d * (k + 1.2), k * 0.05); k = k + 1; } }
    }
  }
}
function fangAt(x, y, z, late) {
  let fy = Math.floor(y + 1), j = 0;
  while (j < 4 && BSOL[blockAt(Math.floor(x), fy - 1, Math.floor(z)) + 1] == 0) { fy = fy - 1; j = j + 1; }
  arrowShoot(x, fy, z, x + 1, fy, z, 11);
  if (lastArr > 0) { AVX[lastArr] = 0; AVY[lastArr] = 0; AVZ[lastArr] = 0; AAGE[lastArr] = 0 - late; AXX[lastArr] = x; }
}
// the conjurer's fangs (AON 12): up out of the ground, they bite once
function fangStep(a, dt) {
  if (AAGE[a] >= 0.4 && ASTK[a] == 0) {
    ASTK[a] = 1;
    if (Math.abs(AXX[a] - px) < 0.8 && Math.abs(AZZ[a] - pz) < 0.8 && Math.abs(AYY[a] - py) < 1.5) { hurtM(6, '송곳니에 물렸습니다'); }
  }
  if (AAGE[a] > 1.1) { AON[a] = 0; }
}
function drawFang(a, fog) {
  let t = AAGE[a];
  if (t > 0) { let h = Math.min(0.9, t * 3); if (t > 0.8) { h = Math.max(0, 0.9 - (t - 0.8) * 3); } fwSeg(AXX[a], AYY[a], AZZ[a], AXX[a], AYY[a] + h, AZZ[a], 0.12, CFANG, 20, fog); }
}
// a shot that hits the player (AON 1 or 3): its damage and what more it does
function shotHit(a) {
  let n = rand(2, 4), why = '화살에 맞았습니다', k = AEN[a];
  if (AON[a] == 3) { n = 5; why = '불덩이에 맞았습니다'; }
  if (k == 0 - 1) { n = 8; why = '물창에 찔렸습니다'; } if (k == 0 - 2) { n = 1; why = '침에 맞았습니다'; }
  if (k == 0 - 3) { n = 6; } if (k == 17010) { n = 8; why = '검은 해골에 맞았습니다'; }
  if (k >= 100000) { n = 0; }
  if (n > 0) { hurtM(n, why); }
  shotEffect(a);
}
function shotEffect(a) {
  let k = AEN[a];
  if (k > 0) {
    let ef = mod(idiv(k, 1000), 100), sec = mod(k, 1000);
    if (ef == 99) { hurtM(6, '마법에 당했습니다'); } else { if (ef > 0 && EFT[ef] < sec) { effectAdd(ef, sec, 1); } }
  }
  if (k == 0 - 3 || k == 17010) { explodeShared(AXX[a], AYY[a], AZZ[a], 1101); }
}
// a thrown potion breaking near the player splashes; a blast where a fireball stops
function shotStop(a) {
  if (AEN[a] >= 100000) { if ((AXX[a] - px) * (AXX[a] - px) + (AZZ[a] - pz) * (AZZ[a] - pz) < 6.25 && Math.abs(AYY[a] - py - 0.9) < 2.5) { shotEffect(a); } AON[a] = 0; }
  if (AEN[a] == 0 - 3 || AEN[a] == 17010) { shotEffect(a); AON[a] = 0; }
  if (AEN[a] < 0) { AON[a] = 0; }
}
function nKind(k) {
  let n = 0, e = 1;
  while (e <= NMOB) { if (ET[e] == k) { n = n + 1; } e = e + 1; }
  return n;
}

// ---------------------------------------------------------------- swimming
function swimPhys(e, t, dt, want) {
  let ty = EY[e] + sind(frameNo * 2 + e * 37) * 0.5;
  if (MSWIM[t] == 2 && want == 0) { ty = EY[e] - 1; }
  if (want != 0) { if (MHOST[t] == 1 || EST[e] == 4) { ty = py + 0.3; } }
  if (t == M_DOLPHIN) { if (rand(1, 300) == 1) { ty = EY[e] + 5; } }
  if (MSWIM[t] == 1 && t != M_DOLPHIN) { if (BLQ[blockAt(Math.floor(EX[e]), Math.floor(EY[e] + MH[t] * ESZ[e] + 0.3), Math.floor(EZ[e])) + 1] != 7) { ty = Math.min(ty, EY[e] - 0.3); } }
  EVY[e] = EVY[e] + ((ty - EY[e]) * 1.5 - EVY[e]) * Math.min(1, 3 * dt);
}

// ---------------------------------------------------------------- breeding, taming, riding
// the foods that breed a kind (MFOOD), or tame a horse (7, more of them)
function foodOk(g, id) {
  let r = 0;
  if (g == 1) { if (id == I_wheat) { r = 1; } }
  if (g == 2) { if (id == I_carrot || id == I_potato || id == I_beetroot) { r = 1; } }
  if (g == 3) { if (id == I_wheatSeeds || id == I_beetSeeds) { r = 1; } }
  if (g == 4) { if (id == 106 || id == 107 || id == 108 || id == 109 || id == 110 || id == 111 || id == 112 || id == I_muttonRaw || id == I_muttonCooked || id == I_rabbitRaw || id == I_rabbitCooked) { r = 1; } }
  if (g == 5) { if (id == I_codRaw || id == I_salmonRaw) { r = 1; } }
  if (g == 6) { if (id == I_carrot || id == I_goldenCarrot || id == I_flowerYellow) { r = 1; } }
  if (g == 7) { if (id == I_goldenApple || id == I_goldenCarrot) { r = 1; } }
  if (g == 8) { if (id == I_hayBale) { r = 1; } }
  if (g == 9) { if (id == I_berries) { r = 1; } }
  if (g == 10) { if (id == I_flowerRed || id == I_flowerYellow || (id >= I_tulipRed && id <= I_cornflower)) { r = 1; } }
  if (g == 11) { if (id == I_bamboo) { r = 1; } }
  if (g == 12) { if (id == I_seagrass) { r = 1; } }
  if (g == 13) { if (id == I_indigoSapling) { r = 1; } }
  if (g == 14) { if (id == I_emberSapling) { r = 1; } }
  return r;
}
// F on a mob with something in hand (1: it was taken)
let useR = 0;
function mobUse(e, id) {
  let t = ET[e];
  useR = 0;
  // the horse kind: saddle a tamed one, feed (tame or breed), get on
  if (MAI[t] == 13 || t == M_PIG || t == M_LAVAWALKER) {
    if (id == I_saddle && mod(EVAR[e], 2) == 0 && isBaby(e) == 0 && t != M_LLAMA && (EOWN[e] > 0 || MAI[t] != 13)) { EVAR[e] = EVAR[e] + 1; useR = 1; if (mod(gameMode, 2) == 0) { takeHeld(1); } sndPlay(6); }
    if (useR == 0 && MAI[t] == 13 && EOWN[e] == 0) { if (id == I_sugar || id == I_wheat || id == I_apple || id == I_hayBale || id == I_goldenCarrot || id == I_goldenApple) { ETG[e] = ETG[e] + 5; useR = 1; if (mod(gameMode, 2) == 0) { takeHeld(1); } msgShow(`${MNAME[t]}이(가) 먹었습니다`, 1.5); } }
  }
  if (useR == 0 && MFOOD[t] > 0) { if (foodOk(MFOOD[t], id) == 1) { if (MAI[t] != 13 || EOWN[e] > 0) { if ((t != M_WOLF && t != M_CAT) || EOWN[e] > 0) {
    if (isBaby(e) == 1) { EAGE[e] = EAGE[e] * 0.9; useR = 1; }
    else {
      if (t == M_WOLF && EHP[e] < 20) { EHP[e] = Math.min(20, EHP[e] + 4); useR = 1; }
      else { if (ELOVE[e] == 0) { ELOVE[e] = 30; useR = 1; msgShow(`${MNAME[t]}이(가) 짝을 찾습니다`, 1.5); } }
    }
    if (useR == 1) { if (mod(gameMode, 2) == 0) { takeHeld(1); } sndPlay(6); }
  } } } }
  // taming: a wolf with bones, a cat with fish, a parrot with seeds (a third of the times); an ocelot trusts
  if (useR == 0 && MTAME[t] > 0 && EOWN[e] == 0) { if (id == MTAME[t] || (t == M_CAT && id == I_salmonRaw)) {
    useR = 1; if (mod(gameMode, 2) == 0) { takeHeld(1); }
    if (rand(1, 3) == 1) { EOWN[e] = 1; EST[e] = 0; if (t == M_WOLF) { EHP[e] = 20; } msgShow(`${MNAME[t]}을(를) 길들였습니다`, 2); sndPlay(6); }
  } }
  if (useR == 0 && t == M_PARROT && id == I_cookie) { useR = 1; EHURT[e] = 0; mobHurt(e, 99, 0, 0); }
  // sit and stand
  if (useR == 0 && (EOWN[e] == 1 || EOWN[e] == 2) && MAI[t] != 13 && t != M_PARROT) { EOWN[e] = 3 - EOWN[e]; useR = 1; if (EOWN[e] == 2) { msgShow(`${MNAME[t]}이(가) 앉았습니다`, 1.5); } else { msgShow(`${MNAME[t]}이(가) 일어섰습니다`, 1.5); } }
  // the red mushroom cow sheared: a cow and five mushrooms
  if (useR == 0 && t == M_MOOSHROOM && ITTK[id + 1] == 5 && isBaby(e) == 0) { useR = 1; ET[e] = M_COW; dropItem(I_mushRed, 5, 0, EX[e], EY[e] + 1, EZ[e], 0); wearHeld(1); sndPlay(6); }
  // a zombie villager given a golden apple comes round in three to five minutes
  if (useR == 0 && t == M_ZOMBIEVILLAGER && id == I_goldenApple && EVAR[e] != 2) { useR = 1; EVAR[e] = 2; ECNV[e] = rand(180, 300); if (mod(gameMode, 2) == 0) { takeHeld(1); } msgShow('치료를 시작했습니다', 2); }
  // getting on
  if (useR == 0 && isBaby(e) == 0) { if (MAI[t] == 13 || ((t == M_PIG || t == M_LAVAWALKER) && mod(EVAR[e], 2) == 1)) { riding = e; useR = 1; ECNV[e] = 0; } }
  return useR;
}
// love: to the nearest one of its kind in love (a horse and a donkey make a mule)
function loveSeek(e, t) {
  let f = ETG[e];
  if (mod(frameNo + e, 10) == 0) {
    f = 0;
    let g = 1, bd = 64;
    while (g <= NMOB) {
      if (g != e && ELOVE[g] > 0 && isBaby(g) == 0) { if (ET[g] == t || (t == M_HORSE && ET[g] == M_DONKEY) || (t == M_DONKEY && ET[g] == M_HORSE)) {
        let d = (EX[g] - EX[e]) * (EX[g] - EX[e]) + (EZ[g] - EZ[e]) * (EZ[g] - EZ[e]);
        if (d < bd) { bd = d; f = g; }
      } }
      g = g + 1;
    }
    ETG[e] = f;
  }
  if (f > 0) { if (ET[f] > 0 && ELOVE[f] > 0) {
    let dx = EX[f] - EX[e], dz = EZ[f] - EZ[e];
    golemT = 1; golemWant = 0.8; golemYaw = atan2d(dx, dz);
    if (dx * dx + dz * dz < 1.6 + MW[t] * MW[t]) { babyMake(e, f); }
  } }
}
function babyMake(e, f) {
  let t = ET[e];
  if (t != ET[f]) { t = M_MULE; }
  ELOVE[e] = 0 - 300; ELOVE[f] = 0 - 300; ETG[e] = 0; ETG[f] = 0;
  mobAdd(t, (EX[e] + EX[f]) / 2, EY[e] + 0.1, (EZ[e] + EZ[f]) / 2);
  if (lastMob > 0) { ESZ[lastMob] = 0.5; EAGE[lastMob] = 0 - 1200; if (EOWN[e] > 0 && MAI[t] != 13) { EOWN[lastMob] = 1; } }
  xpAdd(rand(1, 7)); sndPlay(6);
}
// a ridden one: an untamed horse throws its rider (each try tames it more); a saddled one goes where the
// rider looks (W), jumps (Space); a pig with a carrot in the rider's hand, a lava walker with an indigo fungus
function rideStep(e, t, dt) {
  golemT = 1; golemWant = 0; golemYaw = EYAW[e];
  if (MAI[t] == 13 && EOWN[e] == 0) {
    ECNV[e] = ECNV[e] + dt;
    if (ECNV[e] > 1.5) {
      ECNV[e] = 0;
      if (rand(1, 100) <= 5 + ETG[e]) { EOWN[e] = 1; msgShow(`${MNAME[t]}을(를) 길들였습니다 (안장을 얹으면 탈 수 있습니다)`, 3); sndPlay(6); }
      else { riding = 0; py = py + 1; pvy = 4; ETG[e] = ETG[e] + 5; msgShow(`${MNAME[t]}이(가) 떨쳐냈습니다`, 2); }
    }
  } else {
    let ok = 0;
    if (MAI[t] == 13 && mod(EVAR[e], 2) == 1) { ok = 1; }
    if (t == M_PIG && INVI[hotSel] == I_carrot) { ok = 1; } if (t == M_LAVAWALKER && INVI[hotSel] == I_indigoSapling) { ok = 1; }
    if (ok == 1 && uiMode == 0) {
      golemYaw = yaw;
      if (key(87)) { golemWant = 0.7 + mod(idiv(EVAR[e], 2), 10) * 0.07; if (t == M_PIG || t == M_LAVAWALKER) { golemWant = 1.6; } }
      if (key(32) && EGND[e] == 1 && MAI[t] == 13) { EVY[e] = 7 + mod(idiv(EVAR[e], 20), 10) * 0.35; }
    }
  }
}
// where the rider sits
function rideY(e) { let t = ET[e], r = EY[e] + 0.25; if (MAI[t] == 13 || t == M_PIG || t == M_LAVAWALKER) { r = EY[e] + MH[t] * 0.82; } if (isCart(t) == 1) { r = EY[e] + 0.1; } return r; }
function rideOk(t) { let r = 0; if (t == 13 || isCart(t) == 1 || MAI[t] == 13 || t == M_PIG || t == M_LAVAWALKER) { r = 1; } return r; }

// ---------------------------------------------------------------- a mob's end (mobHurt, when it dies)
// the rare drops and xp (only a player's kill), the jelly lumps falling apart, the villager turned
function mobDies(e, t) {
  let bb = isBaby(e);
  if (grLoot == 1 && pKill == 1 && bb == 0) {
    let k = MR0[t];
    while (k < MR0[t] + MRN[t]) { if (rand(1, 1000) <= (MRP[k] + lootLv) * 10) { dropItem(MRI[k], 1, 0, EX[e], EY[e] + 0.5, EZ[e], 0); } k = k + 1; }
    if (MXP[t] > 0) { xpAdd(MXP[t]); }
  }
  if (MSPLIT[t] > 0) { let n = rand(2, 4), k = 0; while (k < n) { mobAdd(MSPLIT[t], EX[e] + rand(-5, 5) / 10, EY[e] + 0.3, EZ[e] + rand(-5, 5) / 10); k = k + 1; } }
  if (t == M_RAIDER && EVAR[e] == 1 && pKill == 1 && raidOn == 0) { effectAdd(21, 6000, Math.min(5, fx(21) + 1)); msgShow('불길한 징조를 얻었습니다 (마을에 가면 습격이 옵니다)', 3); }
  if (t == M_BONEKING) { kingE = 0; }
}
// a villager killed by the dead: one of them (half the times on normal, always on hard)
function villagerTurn(e) {
  let r = 0;
  if (ET[e] == M_VILLAGER && isDead(hitBy) == 1) { if (difficulty == 3 || (difficulty == 2 && rand(1, 2) == 1)) {
    ET[e] = M_ZOMBIEVILLAGER; EHP[e] = 20; EST[e] = 0; r = 1;
  } }
  return r;
}
// lightning: a pig becomes a rotted ash-folk, a villager a witch, a mushroom is charged
function boltMob(e) {
  let t = ET[e];
  if (t == M_PIG) { ET[e] = M_ROTPIG; EHP[e] = 20; }
  else { if (t == M_VILLAGER) { ET[e] = M_WITCH; EHP[e] = 26; }
  else { if (t == M_BOMBSHROOM) { EVAR[e] = 1; }
  else { if (t != M_MOOSHROOM) { EHURT[e] = 0; mobHurt(e, 5, 0, 0); } } } }
}

// ---------------------------------------------------------------- the shell-bug as the genre's shulker
// it opens to look and to shoot (EVAR: how far its lid is up, 0..60 tenths of a sixteenth), shut it
// takes a fifth of a blow and arrows glance off; hurt below half it may slip away
function shellLid(e, dt, want) {
  let o = 0;
  if (want == 1) { o = 60; } else { if (mod(frameNo + e * 13, 400) < 40) { o = 25; } }
  if (EVAR[e] < o) { EVAR[e] = Math.min(o, EVAR[e] + 120 * dt); } else { EVAR[e] = Math.max(o, EVAR[e] - 120 * dt); }
}

// ---------------------------------------------------------------- building: the snow keeper, the iron keeper, the king
// a carved pumpkin (or its lantern) on two snow blocks, or on a T of four iron blocks; three black skulls
// on a T of four wailing sands or soils
function buildMob(x, y, z, b) {
  if (b == I_carvedPumpkin || b == I_pumpkinLantern) {
    if (blockAt(x, y - 1, z) == 45 && blockAt(x, y - 2, z) == 45) { setBlock(x, y, z, 0); setBlock(x, y - 1, z, 0); setBlock(x, y - 2, z, 0); mobAdd(M_SNOWKEEPER, x + 0.5, y - 2, z + 0.5); msgShow(`${MNAME[M_SNOWKEEPER]}이(가) 생겼습니다`, 2); }
    else { if (blockAt(x, y - 1, z) == 41 && blockAt(x, y - 2, z) == 41) {
      let ax = 0;
      if (blockAt(x - 1, y - 1, z) == 41 && blockAt(x + 1, y - 1, z) == 41) { ax = 1; }
      if (blockAt(x, y - 1, z - 1) == 41 && blockAt(x, y - 1, z + 1) == 41) { ax = 2; }
      if (ax > 0) {
        setBlock(x, y, z, 0); setBlock(x, y - 1, z, 0); setBlock(x, y - 2, z, 0);
        if (ax == 1) { setBlock(x - 1, y - 1, z, 0); setBlock(x + 1, y - 1, z, 0); } else { setBlock(x, y - 1, z - 1, 0); setBlock(x, y - 1, z + 1, 0); }
        mobAdd(M_GOLEM, x + 0.5, y - 2, z + 0.5); if (lastMob > 0) { EOWN[lastMob] = 3; }
        msgShow(`${MNAME[M_GOLEM]}이(가) 생겼습니다`, 2);
      }
    } }
  }
  if (b == I_skullBlack) {
    let c = 0 - 1;
    while (c <= 1) {
      kingTry(x + c, y, z, 1, 0); kingTry(x, y, z + c, 0, 1);
      c = c + 1;
    }
  }
}
function soulAt(x, y, z) { let b = blockAt(x, y, z), r = 0; if (b == I_wailSand || b == I_wailSoil) { r = 1; } return r; }
function kingTry(x, y, z, ux, uz) {
  if (blockAt(x - ux, y, z - uz) == I_skullBlack && blockAt(x, y, z) == I_skullBlack && blockAt(x + ux, y, z + uz) == I_skullBlack) {
    if (soulAt(x - ux, y - 1, z - uz) == 1 && soulAt(x, y - 1, z) == 1 && soulAt(x + ux, y - 1, z + uz) == 1 && soulAt(x, y - 2, z) == 1) {
      setBlock(x - ux, y, z - uz, 0); setBlock(x, y, z, 0); setBlock(x + ux, y, z + uz, 0);
      setBlock(x - ux, y - 1, z - uz, 0); setBlock(x, y - 1, z, 0); setBlock(x + ux, y - 1, z + uz, 0); setBlock(x, y - 2, z, 0);
      mobAdd(M_BONEKING, x + 0.5, y - 2, z + 0.5);
      msgShow(`${MNAME[M_BONEKING]}이(가) 깨어납니다!`, 3); sndPlay(7);
    }
  }
}

// ---------------------------------------------------------------- spawning
// the genre's kinds by biome: a hostile one for a dark spot; animals for a chunk just made
function nightKind(x, y, z, sky) {
  let bi = BIOM[wcol(x, z)], r = rand(1, 100), t = M_ZOMBIE;
  if (r > 40) { t = M_SKELETON; } if (r > 66) { t = M_SPIDER; } if (r > 80) { t = M_BOMBSHROOM; } if (r > 94) { t = M_WANDERER; } if (r > 98) { t = M_WITCH; }
  if (t == M_ZOMBIE) { if (rand(1, 20) == 1) { t = M_ZOMBIEVILLAGER; } else { if (bi == 4 && sky == 1 && rand(1, 5) <= 4) { t = M_HUSK; } } }
  if (t == M_SKELETON) { if ((bi == 6 || bi == 19 || bi == 8) && sky == 1 && rand(1, 5) <= 4) { t = M_STRAY; } }
  if (bi == 13 && sky == 1 && rand(1, 3) == 1) { t = M_SLIME; }
  if (y < 40 && sky == 0) { chunkSeed(idiv(x, 16), idiv(z, 16), 9); if (rnd() < 0.1 && rand(1, 3) == 1) { t = M_SLIME; } }
  if (t == M_SLIME) { t = M_SLIME + rand(0, 2); }
  return t;
}
function animalKind(bi, water) {
  let r = rnd() * 100, t = rndI(1, 4);
  if (water == 1) {
    t = 0;
    if (bi == 0 || bi == 21 || bi == 20 || bi == 8 || bi == 1) {
      t = M_SQUID; if (r > 30) { t = M_COD; } if (r > 70) { t = M_DOLPHIN; } if (r > 82) { t = M_SALMON; }
      if (bi == 20) { t = M_REEFFISH; if (r > 60) { t = M_PUFFERFISH; } if (r > 85) { t = M_DOLPHIN; } }
      if (bi == 8) { t = M_SALMON; if (r > 60) { t = M_SQUID; } }
    }
  } else {
    if (bi == 2) { if (r > 70) { t = M_HORSE; } if (r > 88) { t = M_DONKEY; } if (r > 95) { t = M_BEE; } }
    if (bi == 3) { if (r > 80) { t = M_WOLF; } }
    if (bi == 18) { if (r > 60) { t = M_RABBIT; } if (r > 80) { t = M_BEE; } }
    if (bi == 5) { if (r > 60) { t = M_WOLF; } if (r > 80) { t = M_FOX; } }
    if (bi == 6 || bi == 19) { t = M_RABBIT; if (r > 50) { t = M_WHITEBEAR; } }
    if (bi == 4) { t = M_RABBIT; }
    if (bi == 12) { if (r > 50) { t = M_HORSE; } if (r > 80) { t = M_LLAMA; } }
    if (bi == 7) { if (r > 60) { t = M_LLAMA; } }
    if (bi == 11) { if (r > 30) { t = M_PARROT; } if (r > 60) { t = M_OCELOT; } if (r > 80) { t = M_PANDA; } }
    if (bi == 16) { t = M_MOOSHROOM; }
    if (bi == 1) { t = M_TURTLE; }
    if (bi == 14) { t = 0; }
  }
  return t;
}
// bats in the dark under ground; the night's shades over the sleepless; a bone horse in a storm
let batT = 0;
function spawnMore() {
  batT = batT + 1;
  if (mod(batT, 4) == 0 && nKind(M_BAT) < 4) {
    let x = Math.floor(px) + rand(-16, 16), z = Math.floor(pz) + rand(-16, 16), y = Math.floor(py) + rand(-8, 8);
    if (cOK(x, z) == 1 && y > 2 && y < WY - 2) { if (blockAt(x, y, z) == 0 && blockAt(x, y + 1, z) == 0) { if (lightAt(x + 0.5, y + 0.5, z + 0.5) <= 3 && idiv(LT[wi(x, y, z)], 16) == 0) { mobAdd(M_BAT, x + 0.5, y, z + 0.5); } } }
  }
  if (difficulty > 0 && mod(gameMode, 2) == 0) {
    if (mod(batT, 100) == 0 && dark >= 7 && dayN - sleptDay >= 3) { if (py < WY - 2 && idiv(LT[wi(Math.floor(px), Math.floor(py + 1.6), Math.floor(pz))], 16) >= 15) {
      let n = rand(1, 1 + difficulty), k = 0;
      while (k < n) { mobAdd(M_PHANTOM, px + rand(-6, 6), py + 20, pz + rand(-6, 6)); k = k + 1; }
    } }
    if (mod(batT, 1000) == 500 && rand(1, 4) == 1 && nKind(M_TRADER) == 0) { let a = rand(0, 359), x = Math.floor(px + sind(a) * 24), z = Math.floor(pz + cosd(a) * 24); if (cOK(x, z) == 1) { findTop(x, z); if (BLQ[blockAt(x, topY, z) + 1] == 0) { mobAdd(M_TRADER, x + 0.5, topY + 1.05, z + 0.5); mobAdd(M_LLAMA, x + 1.5, topY + 1.05, z + 0.5); mobAdd(M_LLAMA, x - 0.5, topY + 1.05, z + 1.5); } } }
    if (wthr == 2 && rand(1, 300) == 1) { let x = Math.floor(px) + rand(-20, 20), z = Math.floor(pz) + rand(-20, 20); if (cOK(x, z) == 1) { findTop(x, z); mobAdd(M_BONEHORSE, x + 0.5, topY + 1.05, z + 0.5); } }
  }
}

// ---------------------------------------------------------------- the raid
// The bad omen (from a raid captain killed) brought into a village: waves of raiders by its middle,
// five (three on easy, seven on hard); all of a wave down and the next comes; all down: the village's hero.
let raidOn = 0, raidX = 0, raidZ = 0, raidWave = 0, raidN = 0, raidT = 0;
function raidStep(dt) {
  raidT = raidT - dt;
  if (raidOn == 0) {
    if (raidT <= 0) {
      raidT = 2;
      if (fx(21) > 0 && dim == 0 && difficulty > 0 && mod(gameMode, 2) == 0) {
        locateStruct(1, Math.floor(px), Math.floor(pz));
        if (locOk == 1) { if ((locX - px) * (locX - px) + (locZ - pz) * (locZ - pz) < 2304) {
          raidOn = 1; raidX = locX; raidZ = locZ; raidWave = 0; raidN = 3 + 2 * (difficulty - 1) + EFL[21] - 1; EFT[21] = 0; raidT = 3;
          msgShow('습격이 시작됩니다!', 3); sndPlay(7);
        } }
      }
    }
  } else {
    let left = 0, e = 1;
    while (e <= NMOB) { if (ET[e] > 0 && EOWN[e] == 0 - 1) { left = left + 1; } e = e + 1; }
    raidLeft = left;
    if ((raidX - px) * (raidX - px) + (raidZ - pz) * (raidZ - pz) > 9216 || dead == 1 || dim != 0) { raidOn = 0; raidEnd(0); }
    else { if (left == 0 && raidT <= 0) {
      if (raidWave >= raidN) { raidOn = 0; raidEnd(1); }
      else { raidWave = raidWave + 1; raidT = 3; raidSpawn(raidWave); msgShow(`습격 ${raidWave}번째 물결`, 2); }
    } }
  }
}
let raidLeft = 0;
function raidSpawn(w) {
  let a = rand(0, 359), x = Math.floor(raidX + sind(a) * 30), z = Math.floor(raidZ + cosd(a) * 30);
  if (cOK(x, z) == 0) { x = Math.floor(px + sind(a) * 20); z = Math.floor(pz + cosd(a) * 20); }
  raidAdd(M_RAIDER, x, z, 2 + idiv(w, 2));
  if (w >= 2) { raidAdd(M_AXERAIDER, x, z, idiv(w, 2)); }
  if (w >= 3) { raidAdd(M_RAVAGER, x, z, 1); }
  if (w >= 4) { raidAdd(M_WITCH, x, z, 1); }
  if (w >= 5) { raidAdd(M_CONJURER, x, z, 1); }
}
function raidAdd(t, x, z, n) {
  let k = 0;
  while (k < n) {
    let xx = x + rand(-3, 3), zz = z + rand(-3, 3);
    if (cOK(xx, zz) == 1) { findTop(xx, zz); mobAdd(t, xx + 0.5, topY + 1.05, zz + 0.5); if (lastMob > 0) { EOWN[lastMob] = 0 - 1; } }
    k = k + 1;
  }
}
function raidEnd(won) {
  let e = 1;
  while (e <= NMOB) { if (EOWN[e] == 0 - 1) { EOWN[e] = 0; } e = e + 1; }
  if (won == 1) { effectAdd(22, 2400, 1); msgShow('습격을 막았습니다! 마을의 영웅', 3); sndPlay(6); } else { msgShow('습격이 끝났습니다', 2); }
}

// ---------------------------------------------------------------- the trident in the player's hand: thrown with F
function tridentThrow() {
  shotEn = 0 - 100 - INVD[hotSel];
  if (mod(gameMode, 2) == 1) { shotEn = 0 - 99; }
  arrowShoot(camX, camY - 0.1, camZ, camX + lookX * 10, camY - 0.1 + lookY * 10, camZ + lookZ * 10, 1);
  shotEn = 0;
  if (lastArr > 0) { AVX[lastArr] = AVX[lastArr] * 0.75; AVY[lastArr] = AVY[lastArr] * 0.75 + 1; AVZ[lastArr] = AVZ[lastArr] * 0.75; }
  if (mod(gameMode, 2) == 0) { INVI[hotSel] = 0; INVN[hotSel] = 0; INVD[hotSel] = 0; }
  sndPlay(2); swingT = 0.3;
}
// where it stops it lies (worn a point)
function tridentDrop(a) { if (AEN[a] != 0 - 99) { dropItem(I_trident, 1, 0 - AEN[a] - 100 + 1, AXX[a], AYY[a] + 0.3, AZZ[a], 0); } AON[a] = 0; }

// ---------------------------------------------------------------- the tamed kept with the world
let KPT = [], KPX = [], KPY = [], KPZ = [], KPH = [], KPO = [], KPV = [], KPS = [], KPD = [];
function petsDel(k) { KPT.removeAt(k); KPX.removeAt(k); KPY.removeAt(k); KPZ.removeAt(k); KPH.removeAt(k); KPO.removeAt(k); KPV.removeAt(k); KPS.removeAt(k); KPD.removeAt(k); }
function petsClear() { KPT = []; KPX = []; KPY = []; KPZ = []; KPH = []; KPO = []; KPV = []; KPS = []; KPD = []; }
// the other worlds' kept ones stay; this world's are taken from the living
function petsPack() {
  let k = KPT.length;
  while (k >= 1) { if (KPD[k] == dim) { petsDel(k); } k = k - 1; }
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0 && EOWN[e] >= 1 && EOWN[e] <= 3) { KPT.push(ET[e]); KPX.push(EX[e]); KPY.push(EY[e]); KPZ.push(EZ[e]); KPH.push(EHP[e]); KPO.push(EOWN[e]); KPV.push(EVAR[e]); KPS.push(EAGE[e]); KPD.push(dim); }
    e = e + 1;
  }
}
function petsRestore() {
  let k = KPT.length;
  while (k >= 1) {
    if (KPD[k] == dim) { mobAdd(KPT[k], KPX[k], KPY[k], KPZ[k]); if (lastMob > 0) { EHP[lastMob] = KPH[k]; EOWN[lastMob] = KPO[k]; EVAR[lastMob] = KPV[k]; EAGE[lastMob] = KPS[k]; if (KPS[k] < 0) { ESZ[lastMob] = 0.5; } } petsDel(k); }
    k = k - 1;
  }
  sleptDay = dayN;
}
