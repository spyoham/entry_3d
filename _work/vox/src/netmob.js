// ===================================================================== (v3.0, 11-18) the mobs on a server, the same for everyone
// Before, every screen ran its own mobs: each player saw other animals and other monsters, and the
// monsters went only for the one whose screen they were on. Now each mob has one owner, the player
// whose game made it (spawned it, made its chunk, was given it): only the owner's game runs it, and
// writes it 4 times a second into its own line SY_qN (N its slot, as SY_pN). The others draw it
// from that line (a stand-in: ERK the owner's slot, ERU its number there), gliding to where it is.
// - A stand-in hit by a player: the blow goes to the owner ('g'); a kill comes back ('D') and the
//   killer gets the drops and the xp in their own world (things lying about are each screen's own).
// - The owner's monsters go for the nearest player on the server, not only for the owner: a blow
//   or a shot on another player is a 'H' event to them.
// - Using a stand-in (feeding, riding, shearing...): asked of the owner ('m'), who gives it ('M':
//   the whole mob) - the next click works. A mob that wanders far from its owner and near another
//   player is given to them too, and so are the owner's mobs when they leave the server or go to
//   another world; an owner gone without a word (its tab closed) leaves them to the lowest slot here.
// - The same chunk made on two screens makes the same animals (and structure mobs): their numbers
//   come from where they are (nmDet), so one already in another line is not made again, and of two
//   made at once the lower slot keeps its own.
// Not shared: the warden of the void (its fight is each screen's), the beam of the deep guardians
// and the elder's curse (on the owner), the tamed ones stay with their tamer.
let SY_q1 = '', SY_q2 = '', SY_q3 = '', SY_q4 = '', SY_q5 = '', SY_q6 = '', SY_q7 = '', SY_q8 = '';
let SY_q9 = '', SY_q10 = '', SY_q11 = '', SY_q12 = '', SY_q13 = '', SY_q14 = '', SY_q15 = '', SY_q16 = '';
// each mob: EUID its number (mine), ERK the owner's slot (0: mine), ERU its number in that line,
// QMX QMY QMZ QMW where the line says it is and looks, QMG the reading that saw it last
let EUID = [], ERK = [], ERU = [], QMX = [], QMY = [], QMZ = [], QMW = [], QMG = [];
let nmUid = 10000, nmDet = 0, nmGen = 0, nmWT = 0, nmGiveT = 0, nmKiller = 0, nmLast = '';
// the lines as last read, and whether a slot has stand-ins here
let NQS = [], NQON = [];
// the players on my server in my world (slots), for the monsters to go for
let NPL = [], NPLN = 0;
// the target a mob chose (mobTarget): 0 me, else the slot
let tgK = 0, tgX = 0, tgY = 0, tgZ = 0;

function nqGet(k) {
  let s = '';
  if (k == 1) { s = SY_q1; } if (k == 2) { s = SY_q2; } if (k == 3) { s = SY_q3; } if (k == 4) { s = SY_q4; }
  if (k == 5) { s = SY_q5; } if (k == 6) { s = SY_q6; } if (k == 7) { s = SY_q7; } if (k == 8) { s = SY_q8; }
  if (k == 9) { s = SY_q9; } if (k == 10) { s = SY_q10; } if (k == 11) { s = SY_q11; } if (k == 12) { s = SY_q12; }
  if (k == 13) { s = SY_q13; } if (k == 14) { s = SY_q14; } if (k == 15) { s = SY_q15; } if (k == 16) { s = SY_q16; }
  return `${s}`;
}
function nqPut(k, s) {
  if (k == 1) { SY_q1 = s; } if (k == 2) { SY_q2 = s; } if (k == 3) { SY_q3 = s; } if (k == 4) { SY_q4 = s; }
  if (k == 5) { SY_q5 = s; } if (k == 6) { SY_q6 = s; } if (k == 7) { SY_q7 = s; } if (k == 8) { SY_q8 = s; }
  if (k == 9) { SY_q9 = s; } if (k == 10) { SY_q10 = s; } if (k == 11) { SY_q11 = s; } if (k == 12) { SY_q12 = s; }
  if (k == 13) { SY_q13 = s; } if (k == 14) { SY_q14 = s; } if (k == 15) { SY_q15 = s; } if (k == 16) { SY_q16 = s; }
}
// (faunaInit: with the other per-mob lists)
function netMobInit() {
  EUID = []; ERK = []; ERU = []; QMX = []; QMY = []; QMZ = []; QMW = []; QMG = [];
  let i = 0;
  while (i < NMOB) { EUID.push(0); ERK.push(0); ERU.push(0); QMX.push(0); QMY.push(0); QMZ.push(0); QMW.push(0); QMG.push(0); i = i + 1; }
  if (NQS.length == 0) { i = 0; while (i < NSLOT) { NQS.push(''); NQON.push(0); i = i + 1; } }
  i = 1; while (i <= NSLOT) { NQS[i] = ''; NQON[i] = 0; i = i + 1; }
  nmLast = '';
}
// (mobAdd: a new mob is mine; its number from where it is when a chunk or a structure made it)
function netMobNew(e) {
  ERK[e] = 0; ERU[e] = 0;
  if (nmDet > 0) { EUID[e] = nmDet; nmDet = 0; } else { nmUid = nmUid + 1; if (nmUid > 999999) { nmUid = 10001; } EUID[e] = nmUid; }
}
// the number a chunk's or a structure's mob gets (the same on every screen)
function nmDetOf(x, y, z) { return 100000000 + mod(Math.floor(x * 2) * 7919 + Math.floor(y) * 131 + Math.floor(z * 2) * 104729, 800000000); }
// is a mob of that number in another player's line (then it is not made here)
function nmTaken(u) {
  let r = 0, k = 1;
  if (netSrv > 0) { while (k <= NSLOT) { if (k != netMy) { if (NQON[k] == 1) { if (indexOf(nqGet(k), `;${u},`) > 0) { r = 1; } } } k = k + 1; } }
  return r;
}
// does this mob go in my line
function nmShared(e) {
  let r = 0;
  if (ET[e] > 0) { if (ERK[e] == 0) { if (ET[e] != 10) { if (isProxy(e) == 0) { r = 1; } } } }
  return r;
}

// ---------------------------------------------------------------- each frame on a server (net.js netInServer)
function netMobsStep(dt) {
  // the players near me who can be hurt
  NPL = []; NPLN = 0;
  let k = 1;
  while (k <= NSLOT) {
    if (k != netMy) { if (NLIVE[k] == 1) { if (NSRVk[k] == netSrv) { if (NSTT[k] >= 2) { if (NDIM[k] == dim) { if (mod(NMODE[k], 2) == 0 && NHP[k] > 0) { NPL.push(k); NPLN = NPLN + 1; } } } } } }
    k = k + 1;
  }
  // the others' lines
  k = 1;
  while (k <= NSLOT) {
    if (k != netMy) {
      let want = 0;
      if (NLIVE[k] == 1) { if (NSRVk[k] == netSrv) { if (NSTT[k] >= 2) { if (netSt == 2) { want = 1; } } } }
      // (an owner gone without a word - the tab closed: its mobs are taken by the lowest slot in this world)
      if (want == 0) { if (NQON[k] == 1) { if (NLIVE[k] == 0 && nmAdopter() == 1) { nmAdopt(k); } else { nmDrop(k); } NQON[k] = 0; NQS[k] = ''; } }
      else { let s = nqGet(k); if (s != NQS[k]) { NQS[k] = s; NQON[k] = 1; nmRead(k, s); } }
    }
    k = k + 1;
  }
  // the stand-ins glide
  let e = 1, a = Math.min(1, 10 * dt);
  while (e <= NMOB) {
    if (ET[e] > 0) { if (ERK[e] > 0) {
      let ox = EX[e], oz = EZ[e];
      if (Math.abs(QMX[e] - EX[e]) + Math.abs(QMZ[e] - EZ[e]) + Math.abs(QMY[e] - EY[e]) > 6) { EX[e] = QMX[e]; EY[e] = QMY[e]; EZ[e] = QMZ[e]; }
      else { EX[e] = EX[e] + (QMX[e] - EX[e]) * a; EY[e] = EY[e] + (QMY[e] - EY[e]) * a; EZ[e] = EZ[e] + (QMZ[e] - EZ[e]) * a; }
      let dy = QMW[e] - EYAW[e];
      while (dy > 180) { dy = dy - 360; } while (dy < -180) { dy = dy + 360; }
      EYAW[e] = EYAW[e] + dy * a;
      EVX[e] = (EX[e] - ox) / Math.max(dt, 0.01); EVZ[e] = (EZ[e] - oz) / Math.max(dt, 0.01);
      EWALK[e] = EWALK[e] + Math.sqrt((EX[e] - ox) * (EX[e] - ox) + (EZ[e] - oz) * (EZ[e] - oz)) * 3.2;
      if (EHURT[e] > 0) { EHURT[e] = EHURT[e] - dt; }
    } }
    e = e + 1;
  }
  // mine gone far from me and near another player: theirs (before my line is written: a line still
  // holding a mob given away went out with the gift)
  nmGiveT = nmGiveT + dt;
  if (nmGiveT >= 1) { nmGiveT = 0; let q = nmGiveFar(32, 0); }
  // my line, 4 times a second
  nmWT = nmWT + dt;
  if (nmWT >= 0.25) { nmWT = 0; nmWrite(); }
}
// my mobs near me into my line: sid|world|;number,kind,x,y,z,yaw,hp,state,marks,size,flags;...
function nmWrite() {
  gS = `${netSid}|${dim}|`;
  let e = 1, n = 0;
  while (e <= NMOB) {
    if (nmShared(e) == 1) { if (n < 40) { if ((EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz) < 2304) {
      let fl = 0;
      if (EHURT[e] > 0.2) { fl = fl + 1; } if (EBURN[e] == 1 || EFIR[e] > 0) { fl = fl + 2; } if (ELOVE[e] > 0) { fl = fl + 4; } if (EOWN[e] > 0) { fl = fl + 8; }
      gS = `${gS};${EUID[e]},${ET[e]},${Math.round(EX[e] * 10) / 10},${Math.round(EY[e] * 10) / 10},${Math.round(EZ[e] * 10) / 10},${Math.round(EYAW[e])},${Math.ceil(EHP[e])},${EST[e]},${Math.round(EVAR[e])},${ESZ[e]},${fl}`;
      n = n + 1;
    } } }
    e = e + 1;
  }
  if (gS != nmLast) { nmLast = gS; nqPut(netMy, gS); }
}
// the stand-ins of slot k all gone
function nmDrop(k) {
  let e = 1;
  while (e <= NMOB) { if (ET[e] > 0) { if (ERK[e] == k) { ET[e] = 0; ERK[e] = 0; } } e = e + 1; }
}
let NMR = [];
// slot k's line read: its mobs made, moved, or gone
function nmRead(k, s) {
  splitBy(s, '|');
  if (SPL.length < 3) { nmDrop(k); }
  else {
    if (SPL[2] * 1 != dim) { nmDrop(k); }
    else {
      nmGen = nmGen + 1;
      splitBy(SPL[3], ';');
      NMR = [];
      let i = 2;
      while (i <= SPL.length) { NMR.push(SPL[i]); i = i + 1; }
      i = 1;
      while (i <= NMR.length) {
        splitBy(NMR[i], ',');
        if (SPL.length >= 11) {
          let u = SPL[1] * 1, t = SPL[2] * 1, x = SPL[3] * 1, y = SPL[4] * 1, z = SPL[5] * 1, e = 0, f = 1, mine = 0;
          while (f <= NMOB) { if (ET[f] > 0) { if (ERK[f] == k && ERU[f] == u) { e = f; } if (ERK[f] == 0 && EUID[f] == u) { mine = f; } } f = f + 1; }
          // (the same chunk's animal made here too: the lower slot keeps its own)
          if (mine > 0 && u >= 1000000) { if (k < netMy) { if (riding != mine && EOWN[mine] <= 0) { ET[mine] = 0; mine = 0; } } }
          if (mine == 0 || u < 1000000) {
            if (e == 0) { if (cOK(Math.floor(x), Math.floor(z)) == 1) { mobAdd(t, x, y, z); e = lastMob; if (e > 0) { ERK[e] = k; ERU[e] = u; EUID[e] = 0; } } }
            if (e > 0) {
              if (ET[e] != t) { ET[e] = t; }
              QMX[e] = x; QMY[e] = y; QMZ[e] = z; QMW[e] = SPL[6] * 1; EHP[e] = SPL[7] * 1; EST[e] = SPL[8] * 1; EVAR[e] = SPL[9] * 1; ESZ[e] = SPL[10] * 1;
              let fl = SPL[11] * 1;
              if (mod(fl, 2) == 1) { EHURT[e] = 0.4; }
              EBURN[e] = mod(idiv(fl, 2), 2); EFIR[e] = 0;
              ELOVE[e] = mod(idiv(fl, 4), 2);
              EOWN[e] = 0; if (mod(idiv(fl, 8), 2) == 1) { EOWN[e] = 1; }
              QMG[e] = nmGen;
            }
          }
        }
        i = i + 1;
      }
      // what is no longer in it: dead, gone or given away
      let e2 = 1;
      while (e2 <= NMOB) { if (ET[e2] > 0) { if (ERK[e2] == k) { if (QMG[e2] != nmGen) { ET[e2] = 0; ERK[e2] = 0; } } } e2 = e2 + 1; }
    }
  }
}
// am I the one in the lowest slot of those playing here, in this world
function nmAdopter() {
  let r = 1, j = 1;
  while (j < netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (NSTT[j] >= 2) { if (NDIM[j] == dim) { r = 0; } } } } j = j + 1; }
  if (netSt != 2) { r = 0; }
  return r;
}
function nmAdopt(k) {
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) { if (ERK[e] == k) {
      ERK[e] = 0;
      if (ERU[e] >= 1000000) { EUID[e] = ERU[e]; } else { nmUid = nmUid + 1; if (nmUid > 999999) { nmUid = 10001; } EUID[e] = nmUid; }
      ERU[e] = 0; EX[e] = QMX[e]; EY[e] = QMY[e]; EZ[e] = QMZ[e]; EOWN[e] = 0; EHURT[e] = 0; EVX[e] = 0; EVZ[e] = 0; ETM[e] = 1;
    } }
    e = e + 1;
  }
  nmWT = 99;
}
// leaving the server, a world: the stand-ins go
function netMobsClear() {
  let e = 1;
  while (e <= NMOB) { if (ET[e] > 0) { if (ERK[e] > 0) { ET[e] = 0; } } ERK[e] = 0; e = e + 1; }
  if (netMy > 0) { nqPut(netMy, ''); }
  nmLast = ''; let k = 1; while (k <= NSLOT) { NQS[k] = ''; NQON[k] = 0; k = k + 1; }
}

// ---------------------------------------------------------------- the monsters go for the nearest player
// (mobs.js mobStep0: tgK 0 me, else that slot; tgX tgY tgZ where)
function mobTarget(e) {
  tgK = 0; tgX = px; tgY = py; tgZ = pz;
  let best = 99999999, i = 1;
  if (mod(gameMode, 2) == 0 && dead == 0) { best = (px - EX[e]) * (px - EX[e]) + (pz - EZ[e]) * (pz - EZ[e]); }
  while (i <= NPLN) {
    let k = NPL[i], d = (NPX[k] - EX[e]) * (NPX[k] - EX[e]) + (NPZ[k] - EZ[e]) * (NPZ[k] - EZ[e]);
    if (d < best) { best = d; tgK = k; tgX = NPX[k]; tgY = NPY[k]; tgZ = NPZ[k]; }
    i = i + 1;
  }
}
// my mob's blow on another player (kx kz: the push)
function netMobStrike(e, t, kx, kz) {
  if (tgK > 0) { evAdd('H', `${NNICK[tgK]}^${t}^0^${MDMG[t]}^0^${Math.round(kx * 10) / 10}^${Math.round(kz * 10) / 10}`); }
}
// a shot of my mobs hits another player (mobs.js arrowsStep): 1 when one did
function netShotHits(a) {
  let r = 0, i = 1;
  while (i <= NPLN && r == 0) {
    let k = NPL[i];
    if (Math.abs(AXX[a] - NPX[k]) < 0.45 && Math.abs(AZZ[a] - NPZ[k]) < 0.45 && AYY[a] > NPY[k] && AYY[a] < NPY[k] + 1.8) {
      r = 1;
      evAdd('H', `${NNICK[k]}^0^1^${AEN[a]}^${AON[a]}^${Math.round(AVX[a] * 2) / 10}^${Math.round(AVZ[a] * 2) / 10}`);
      if (AEN[a] == 0 - 3 || AEN[a] == 17010) { explodeShared(AXX[a], AYY[a], AZZ[a], 1101); }
    }
    i = i + 1;
  }
  return r;
}
// another's mob hurt me: f = nick^kind^how(0 blow, 1 shot)^a^b^kx^kz
function nmHurtMe(f) {
  splitBy(f, '^');
  if (SPL.length >= 7) { if (SPL[1] == netNick) { if (netSt == 2 && dead == 0) {
    let t = SPL[2] * 1, a = SPL[4] * 1, b = SPL[5] * 1, kx = SPL[6] * 1, kz = SPL[7] * 1;
    if (SPL[3] * 1 == 0) {
      hurtM(a, `${MNAME[t]}에게 당했습니다`);
      if (MHITE[t] > 0 && difficulty >= 2) { let s = MHITS[t]; if (difficulty == 3) { s = s * 2; } if (EFT[MHITE[t]] < s) { effectAdd(MHITE[t], s, 1); } }
      pvy = 4;
    } else {
      // (fauna.js shotHit, from the shot's kind: the blast is the owner's, shared)
      let n = rand(2, 4), why = '화살에 맞았습니다';
      if (b == 3) { n = 5; why = '불덩이에 맞았습니다'; }
      if (a == 0 - 1) { n = 8; why = '물창에 찔렸습니다'; } if (a == 0 - 2) { n = 1; why = '침에 맞았습니다'; }
      if (a == 0 - 3) { n = 6; } if (a == 17010) { n = 8; why = '검은 해골에 맞았습니다'; }
      if (a >= 100000) { n = 0; }
      if (n > 0) { hurtM(n, why); }
      if (a > 0) { let ef = mod(idiv(a, 1000), 100), sec = mod(a, 1000); if (ef == 99) { hurtM(6, '마법에 당했습니다'); } else { if (ef > 0 && EFT[ef] < sec) { effectAdd(ef, sec, 1); } } }
    }
    pvx = pvx + kx; pvz = pvz + kz;
  } } }
}

// ---------------------------------------------------------------- hitting another's mob
// (mobs.js mobHurt: a blow on a stand-in goes to its owner, when a player (or a pet) dealt it; the
// rest - a blast, fire, a fall - runs on the owner's screen too)
function netMobHit(e, n, hx, hz) {
  if (pKill == 1 && n > 0 && EHURT[e] <= 0) {
    if (netSrv > 0 && netSt == 2) { evAdd('g', `${NNICK[ERK[e]]}^${ERU[e]}^${Math.round(n * 10) / 10}^${Math.round(hx * 100) / 100}^${Math.round(hz * 100) / 100}^${hitKb}^${hitFire}^${lootLv}`); }
    EHURT[e] = 0.5; sndPlay(4);
  }
}
// the owner: a blow from slot k on my mob
function nmHitMine(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 8) { if (SPL[1] == netNick) {
    let u = SPL[2] * 1, e = 0, i = 1;
    while (i <= NMOB) { if (ET[i] > 0) { if (ERK[i] == 0 && EUID[i] == u) { e = i; } } i = i + 1; }
    if (e > 0) {
      let n = SPL[3] * 1, fx0 = SPL[4] * 1, fz0 = SPL[5] * 1;
      hitKb = SPL[6] * 1; hitFire = SPL[7] * 1; lootLv = SPL[8] * 1; pKill = 1; nmKiller = k;
      mobHurt0(e, n, fx0, fz0);
      hitKb = 0; hitFire = 0; lootLv = 0; pKill = 0; nmKiller = 0;
      // (seen at once by everyone: hurt, or gone)
      nmWT = 99;
    }
  } }
}
// the owner: my mob killed by another player (mobHurt0 asks, in place of its drops): theirs to get
function netMobKilled(e, t, turned) {
  evAdd('D', `${NNICK[nmKiller]}^${t}^${Math.round(EX[e] * 10) / 10}^${Math.round(EY[e] * 10) / 10}^${Math.round(EZ[e] * 10) / 10}^${lootLv}^${isBaby(e)}^${Math.round(EVAR[e])}^${turned}`);
}
// the killer: the drops and xp of a mob I killed on another screen (mobHurt0 and mobDies, here)
function nmLoot(f) {
  splitBy(f, '^');
  if (SPL.length >= 9) { if (SPL[1] == netNick) {
    let t = SPL[2] * 1, x = SPL[3] * 1, y = SPL[4] * 1, z = SPL[5] * 1, lo = SPL[6] * 1, bb = SPL[7] * 1, vr = SPL[8] * 1, turned = SPL[9] * 1;
    if (grLoot == 1 && turned == 0 && bb == 0) {
      let k = MDROP0[t], n2 = 0;
      while (k < MDROP0[t] + MDROPN[t]) { n2 = rand(MDLO[k], MDHI[k] + lo); if (n2 > 0) { dropItem(MDI[k], n2, 0, x, y + 0.5, z, 0); } k = k + 1; }
      k = MR0[t];
      while (k < MR0[t] + MRN[t]) { if (rand(1, 1000) <= (MRP[k] + lo) * 10) { dropItem(MRI[k], 1, 0, x, y + 0.5, z, 0); } k = k + 1; }
      if (MXP[t] > 0) { xpAdd(MXP[t]); }
    }
    if (t == M_RAIDER && vr == 1 && raidOn == 0) { effectAdd(21, 6000, Math.min(5, fx(21) + 1)); msgShow('불길한 징조를 얻었습니다 (마을에 가면 습격이 옵니다)', 3); }
  } }
}

// ---------------------------------------------------------------- giving mobs to another player
let NMG = [];
// my mob e as it goes in a 'M' event: number,kind,x,y,z,yaw,hp,state,marks,size,age,own,love
function nmPack(e) {
  return `${EUID[e]},${ET[e]},${Math.round(EX[e] * 100) / 100},${Math.round(EY[e] * 100) / 100},${Math.round(EZ[e] * 100) / 100},${Math.round(EYAW[e])},${EHP[e]},${EST[e]},${EVAR[e]},${ESZ[e]},${EAGE[e]},${EOWN[e]},${ELOVE[e]}`;
}
// may e change hands (not tamed, not ridden, not a raid's or the bone king's)
function nmGivable(e) {
  let r = 0;
  if (nmShared(e) == 1) { if (EOWN[e] == 0 && riding != e && specMob != e) { r = 1; } }
  return r;
}
// the ones far from me (more than `far`, or all with `all`) and near another player go to the nearest
function nmGiveFar(far, all) {
  let e = 1, cnt = 0;
  NMG = []; let to = 0;
  while (e <= NMOB) {
    if (nmGivable(e) == 1) {
      let dm = (EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz);
      if (dm > far * far || all == 1) {
        let best = 576, bk = 0, i = 1;
        if (all == 1) { best = 1600; }
        while (i <= NSLOT) {
          if (i != netMy) { if (NLIVE[i] == 1) { if (NSRVk[i] == netSrv) { if (NSTT[i] >= 2) { if (NDIM[i] == dim) {
            let d = (NPX[i] - EX[e]) * (NPX[i] - EX[e]) + (NPZ[i] - EZ[e]) * (NPZ[i] - EZ[e]);
            if (d < best) { best = d; bk = i; }
          } } } } }
          i = i + 1;
        }
        // (one player a time, sixteen at most: one event)
        if (bk > 0) { if (to == 0) { to = bk; } if (bk == to && cnt < 16) { NMG.push(nmPack(e)); ET[e] = 0; cnt = cnt + 1; } }
      }
    }
    e = e + 1;
  }
  if (cnt > 0) { nmSend(to); nmWT = 99; }
  return cnt;
}
function nmSend(k) {
  gS2 = `${NNICK[k]}^${dim}^`;
  let i = 1;
  while (i <= NMG.length) { if (i > 1) { gS2 = `${gS2};`; } gS2 = `${gS2}${NMG[i]}`; i = i + 1; }
  evAdd('M', gS2);
}
// leaving the server: my mobs to whoever is near them (a few rounds: one player each)
function netMobsLeave() {
  if (netSrv > 0 && netSt == 2) { let r = 0; while (r < 6) { if (nmGiveFar(0, 1) == 0) { r = 6; } r = r + 1; } }
}
// mobs given to me (from slot k): f = nick^world^mob;mob;... (in another world now: not taken)
function nmTake(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 3) { if (SPL[1] == netNick) { if (netSt == 2 && SPL[2] * 1 == dim) {
    splitBy(SPL[3], ';');
    NMR = [];
    let i = 1;
    while (i <= SPL.length) { NMR.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= NMR.length) {
      splitBy(NMR[i], ',');
      if (SPL.length >= 13) {
        let u = SPL[1] * 1, e = 0, f2 = 1;
        while (f2 <= NMOB) { if (ET[f2] > 0) { if (ERK[f2] == k && ERU[f2] == u) { e = f2; } } f2 = f2 + 1; }
        if (e == 0) { mobAdd(SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1); e = lastMob; }
        if (e > 0) {
          ERK[e] = 0; ERU[e] = 0;
          // (a chunk's animal keeps its number; one made by a player gets one of mine)
          if (u >= 1000000) { EUID[e] = u; } else { nmUid = nmUid + 1; if (nmUid > 999999) { nmUid = 10001; } EUID[e] = nmUid; }
          ET[e] = SPL[2] * 1; EX[e] = SPL[3] * 1; EY[e] = SPL[4] * 1; EZ[e] = SPL[5] * 1; EYAW[e] = SPL[6] * 1; EWY[e] = EYAW[e];
          EHP[e] = SPL[7] * 1; EST[e] = SPL[8] * 1; EVAR[e] = SPL[9] * 1; ESZ[e] = SPL[10] * 1; EAGE[e] = SPL[11] * 1; EOWN[e] = SPL[12] * 1; ELOVE[e] = SPL[13] * 1;
          EHURT[e] = 0; EBURN[e] = 0; EFIR[e] = 0; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; ETM[e] = 1;
        }
      }
      i = i + 1;
    }
    nmWT = 99;
  } } }
}
// a stand-in used (blocks.js useKey0): asked of its owner
function netMobAsk(e) {
  if (netSrv > 0 && netSt == 2 && ERK[e] > 0) { evAdd('m', `${NNICK[ERK[e]]}^${ERU[e]}`); msgShow('다른 플레이어 곁의 생물입니다 - 한 번 더 누르세요', 1); }
}
// the owner, asked by slot k for my mob
function nmAsked(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 2) { if (SPL[1] == netNick) {
    let u = SPL[2] * 1, i = 1;
    NMG = [];
    while (i <= NMOB) { if (ET[i] > 0) { if (ERK[i] == 0 && EUID[i] == u) { if (nmGivable(i) == 1) { NMG.push(nmPack(i)); ET[i] = 0; } } } i = i + 1; }
    if (NMG.length > 0) { nmSend(k); nmWT = 99; }
  } }
}
