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
  netItemInit();
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
// ((v3.4) or in the server's record of kept mobs: it comes back from there (netkeep.js))
function nmTaken(u) {
  let r = nmInLine(u);
  if (r == 0) { if (netSrv > 0) { if (skFind(u) > 0) { r = 1; } } }
  return r;
}
function nmInLine(u) {
  let r = 0, k = 1;
  if (netSrv > 0) { while (k <= NSLOT) { if (k != netMy) { if (NQON[k] == 1) { if (indexOf(nqGet(k), `;${u},`) > 0) { r = 1; } } } k = k + 1; } }
  return r;
}
// does this mob go in my line
function nmShared(e) {
  let r = 0;
  if (ET[e] > 0) { if (ERK[e] == 0) { if (isProxy(e) == 0) { r = 1; } } }
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
      if (EST[e] == 7) { ETM[e] = Math.max(0, ETM[e] - dt); }
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
  let e = 1, n = 0, ps = 1;
  // ((v3.4) the ones with a number of their own first (a chunk's, a structure's, the kept): with more
  // than 40 near me one left out of the line would be made a second time on another screen)
  // ((v3.4, 11-22) and 24 places more for the rest: where forty kept ones stood (a village, a farm) no monster
  // of mine was in the line - nobody else saw it, could hit it or was seen to be hit by it)
  let lim = 40;
  while (ps <= 2) {
  e = 1;
  if (ps == 2) { lim = n + 24; }
  while (e <= NMOB) {
    if (nmShared(e) == 1) { if ((ps == 1 && EUID[e] >= 1000000) || (ps == 2 && EUID[e] < 1000000)) { if (n < lim) { if ((EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz) < 2304 || ET[e] == 10) {
      let fl = 0;
      if (EHURT[e] > 0.2) { fl = fl + 1; } if (EBURN[e] == 1 || EFIR[e] > 0) { fl = fl + 2; } if (ELOVE[e] > 0) { fl = fl + 4; } if (EOWN[e] > 0 && EOWN[e] < 4) { fl = fl + 8; }
      // ((v3.2) a deep guardian's beam: the slot of the one it is on, from 16 up)
      if (MSHOT[ET[e]] == 8) { if (EST[e] == 7) { if (ETG[e] > 0) { fl = fl + 16 * ETG[e]; } else { fl = fl + 16 * netMy; } } }
      gS = `${gS};${EUID[e]},${ET[e]},${Math.round(EX[e] * 10) / 10},${Math.round(EY[e] * 10) / 10},${Math.round(EZ[e] * 10) / 10},${Math.round(EYAW[e])},${Math.ceil(EHP[e])},${EST[e]},${Math.round(EVAR[e])},${ESZ[e]},${fl}`;
      n = n + 1;
    } } } }
    e = e + 1;
  }
  ps = ps + 1;
  }
  nmItemsLine();
  if (gS != nmLast) { nmLast = gS; nqPut(netMy, gS); }
}
// the stand-ins of slot k all gone
function nmDrop(k) {
  nmItemsDrop(k);
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
      nmIts = ' '; if (SPL.length >= 4) { nmIts = SPL[4]; }
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
          if (mine > 0 && u >= 1000000) { if (k < netMy) { if (riding != mine && EOWN[mine] <= 0) { skLet(u); ET[mine] = 0; mine = 0; } } }
          if (mine == 0 || u < 1000000) {
            if (e == 0) { if (cOK(Math.floor(x), Math.floor(z)) == 1) { mobAdd(t, x, y, z); e = lastMob; if (e > 0) { ERK[e] = k; ERU[e] = u; EUID[e] = 0; } } }
            if (e > 0) {
              if (ET[e] != t) { ET[e] = t; }
              if (SPL[8] * 1 == 7) { if (EST[e] != 7) { ETM[e] = 3; } }
              QMX[e] = x; QMY[e] = y; QMZ[e] = z; QMW[e] = SPL[6] * 1; EHP[e] = SPL[7] * 1; EST[e] = SPL[8] * 1; EVAR[e] = SPL[9] * 1; ESZ[e] = SPL[10] * 1;
              let fl = SPL[11] * 1;
              if (fl >= 16) { ETG[e] = idiv(fl, 16); if (ETG[e] == netMy) { ETG[e] = 0; } }
              // ((v3.4, 11-22) the owner's mark of a blow: not while it may be my own blow coming back. It shut
              // the stand-in for 0.4 s from each line that had it - the lines come a quarter second apart and a
              // quarter second late, so after every blow of mine the mob could not be hit for 0.9 s or more, where
              // one's own takes a blow each half second: half the blows of a fight were lost.)
              if (mod(fl, 2) == 1) { if (netClock - EMH[e] > 1.2) { EHURT[e] = 0.4; } }
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
      nmItemsRead(k);
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
  nmItemsAdopt(k);
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
  nmItemsDrop(0);
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
    // ((v3.4, 11-22) EMH: when I hit it - see nmRead)
    EHURT[e] = 0.5; EMH[e] = netClock; sndPlay(4);
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
      // ((v3.4, 11-22) the blow waited out its half second on the hitter's screen; here it comes a little early
      // or late as the line goes, and one that came early was thrown away: up to 0.3 s early is taken)
      if (EHURT[e] <= 0.3) { EHURT[e] = 0; }
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
// my mob e as it goes in a 'M' event: number,kind,x,y,z,yaw,hp,state,marks,size,age,own,love,
// ((v3.2) and what a villager's trades and work hang on) its ETG and ECNV
function nmPack(e) {
  return `${EUID[e]},${ET[e]},${Math.round(EX[e] * 100) / 100},${Math.round(EY[e] * 100) / 100},${Math.round(EZ[e] * 100) / 100},${Math.round(EYAW[e])},${EHP[e]},${EST[e]},${EVAR[e]},${ESZ[e]},${EAGE[e]},${EOWN[e]},${ELOVE[e]},${ETG[e]},${ECNV[e]}`;
}
// may e change hands (not tamed, not ridden, not a raid's or the bone king's)
function nmGivable(e) {
  let r = 0;
  if (nmShared(e) == 1) { if ((EOWN[e] == 0 || EOWN[e] == 5) && riding != e && specMob != e) { r = 1; } }
  return r;
}
// the ones far from me (more than `far`, or all with `all`) and near another player go to the nearest
function nmGiveFar(far, all) {
  let e = 1, cnt = 0;
  NMG = []; let to = 0;
  while (e <= NMOB) {
    // ((v3.2) the warden changes hands only when its owner goes (then however far the next player is))
    if (nmGivable(e) == 1 && (ET[e] != 10 || all == 1)) {
      let dm = (EX[e] - px) * (EX[e] - px) + (EZ[e] - pz) * (EZ[e] - pz);
      if (dm > far * far || all == 1) {
        let best = 576, bk = 0, i = 1;
        if (all == 1) { best = 1600; }
        if (ET[e] == 10) { best = 99999999; }
        while (i <= NSLOT) {
          if (i != netMy) { if (NLIVE[i] == 1) { if (NSRVk[i] == netSrv) { if (NSTT[i] >= 2) { if (NDIM[i] == dim) {
            let d = (NPX[i] - EX[e]) * (NPX[i] - EX[e]) + (NPZ[i] - EZ[e]) * (NPZ[i] - EZ[e]);
            if (d < best) { best = d; bk = i; }
          } } } } }
          i = i + 1;
        }
        // (one player a time, sixteen at most: one event)
        if (bk > 0) { if (to == 0) { to = bk; } if (bk == to && cnt < 16) { NMG.push(nmPack(e)); skLet(EUID[e]); ET[e] = 0; cnt = cnt + 1; } }
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
    let i = 1, useE = 0;
    while (i <= SPL.length) { NMR.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= NMR.length) {
      splitBy(NMR[i], ',');
      if (SPL.length >= 13) {
        let u = SPL[1] * 1, e = 0, f2 = 1;
        while (f2 <= NMOB) { if (ET[f2] > 0) { if (ERK[f2] == k && ERU[f2] == u) { e = f2; } } f2 = f2 + 1; }
        if (e == 0) { mobAdd(SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1); e = lastMob; }
        if (e > 0) {
          if (k == nmWantK && u == nmWantU && netClock - nmWantT < 3) { useE = e; }
          ERK[e] = 0; ERU[e] = 0;
          // (a chunk's animal keeps its number; one made by a player gets one of mine)
          if (u >= 1000000) { EUID[e] = u; } else { nmUid = nmUid + 1; if (nmUid > 999999) { nmUid = 10001; } EUID[e] = nmUid; }
          ET[e] = SPL[2] * 1; EX[e] = SPL[3] * 1; EY[e] = SPL[4] * 1; EZ[e] = SPL[5] * 1; EYAW[e] = SPL[6] * 1; EWY[e] = EYAW[e];
          EHP[e] = SPL[7] * 1; EST[e] = SPL[8] * 1; EVAR[e] = SPL[9] * 1; ESZ[e] = SPL[10] * 1; EAGE[e] = SPL[11] * 1; EOWN[e] = SPL[12] * 1; ELOVE[e] = SPL[13] * 1;
          if (SPL.length >= 15) { ETG[e] = SPL[14] * 1; ECNV[e] = SPL[15] * 1; }
          EHURT[e] = 0; EBURN[e] = 0; EFIR[e] = 0; EVX[e] = 0; EVY[e] = 0; EVZ[e] = 0; ETM[e] = 1;
        }
      }
      i = i + 1;
    }
    nmWT = 99;
    if (useE > 0) { nmWantK = 0; if (mobPick == useE && uiMode == 0) { let a0 = netApplying; netApplying = 0; placeCool = 0; useKey0(); netApplying = a0; } }
  } } }
}
// a stand-in used (blocks.js useKey0): asked of its owner
function netMobAsk(e) {
  // ((v3.1) remembered: when it comes (nmTake) and I still look at it, the click goes on by itself - it took two)
  if (netSrv > 0 && netSt == 2 && ERK[e] > 0) { evAdd('m', `${NNICK[ERK[e]]}^${ERU[e]}`); nmWantK = ERK[e]; nmWantU = ERU[e]; nmWantT = netClock; }
}
// the owner, asked by slot k for my mob
function nmAsked(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 2) { if (SPL[1] == netNick) {
    let u = SPL[2] * 1, i = 1;
    NMG = [];
    while (i <= NMOB) { if (ET[i] > 0) { if (ERK[i] == 0 && EUID[i] == u) { if (nmGivable(i) == 1 && ET[i] != 10) { NMG.push(nmPack(i)); skLet(u); ET[i] = 0; } } } i = i + 1; }
    if (NMG.length > 0) { nmSend(k); nmWT = 99; }
  } }
}

// ===================================================================== (v3.1) things lying about, and arrows
// The things on the ground were each screen's own: what one player dropped or dug nobody else saw.
// Now they go in the owner's line after the mobs (sid|world|mobs|;number,id,count,wear,x,y,z;...): the
// screen a thing fell on owns it and runs it; the others show a stand-in (IRK the owner's slot, IRU its
// number) with no weight of its own. Walking onto a stand-in asks the owner for it ('P'); the owner, if
// it is still there, takes it away and gives it ('T') - so two players never both get it.
// Arrows (and what else arrowShoot sends: fireballs, potions, tridents) are told as they fly off ('S'):
// the other screens fly a harmless one (APW -1) to look at; what it hits is still the shooter's to say.
let IUID = [], IRK = [], IRU = [], IRG = [], IQX = [], IQY = [], IQZ = [];
let niUid = 0, nmIts = '', nmWantK = 0, nmWantU = 0, nmWantT = 0 - 99;
function netItemInit() {
  IUID = []; IRK = []; IRU = []; IRG = []; IQX = []; IQY = []; IQZ = [];
  let i = 0;
  while (i < NITM) { IUID.push(0); IRK.push(0); IRU.push(0); IRG.push(0); IQX.push(0); IQY.push(0); IQZ.push(0); i = i + 1; }
}
// (dropItem: a new thing is mine)
function netItemNew(s) { niUid = niUid + 1; if (niUid > 99999) { niUid = 1; } IUID[s] = niUid; IRK[s] = 0; IRU[s] = 0; }
// a stand-in each frame (itemsStep): to where its owner says; mine to ask for when I stand on it
function netItemStep(i, dt) {
  let a = Math.min(1, 12 * dt);
  IAGE[i] = IAGE[i] + dt;
  IXX[i] = IXX[i] + (IQX[i] - IXX[i]) * a; IYY[i] = IYY[i] + (IQY[i] - IYY[i]) * a; IZZ[i] = IZZ[i] + (IQZ[i] - IZZ[i]) * a;
  if (dead == 0 && gameMode != 3) { if (IAGE[i] > 0.5) {
    let dx = px - IXX[i], dy = py + 0.8 - IYY[i], dz = pz - IZZ[i];
    if (dx * dx + dy * dy + dz * dz < 0.8) { if (netSrv > 0 && netSt == 2) { evAdd('P', `${NNICK[IRK[i]]}^${IRU[i]}`); IAGE[i] = 0 - 1; } }
  } }
}
// (nmWrite: my things near me, after the mobs)
function nmItemsLine() {
  let i = 1, n = 0;
  gS = `${gS}|`;
  while (i <= NITM) {
    if (IID[i] > 0) { if (IRK[i] == 0) { if (n < 40) { if ((IXX[i] - px) * (IXX[i] - px) + (IZZ[i] - pz) * (IZZ[i] - pz) < 2304) {
      gS = `${gS};${IUID[i]},${IID[i]},${INN[i]},${IDU[i]},${Math.round(IXX[i] * 10) / 10},${Math.round(IYY[i] * 10) / 10},${Math.round(IZZ[i] * 10) / 10}`;
      n = n + 1;
    } } } }
    i = i + 1;
  }
}
// (nmRead: slot k's things, nmIts)
function nmItemsRead(k) {
  splitBy(nmIts, ';');
  NMR = [];
  let i = 2;
  while (i <= SPL.length) { NMR.push(SPL[i]); i = i + 1; }
  i = 1;
  while (i <= NMR.length) {
    splitBy(NMR[i], ',');
    if (SPL.length >= 7) {
      let u = SPL[1] * 1, f = 0, free = 0, j = 1;
      while (j <= NITM) { if (IID[j] > 0) { if (IRK[j] == k && IRU[j] == u) { f = j; } } else { if (free == 0) { free = j; } } j = j + 1; }
      if (f == 0) { if (free > 0) { f = free; IRK[f] = k; IRU[f] = u; IUID[f] = 0; IXX[f] = SPL[5] * 1; IYY[f] = SPL[6] * 1; IZZ[f] = SPL[7] * 1; IVX[f] = 0; IVY[f] = 0; IVZ[f] = 0; IAGE[f] = 0; } }
      if (f > 0) { IID[f] = SPL[2] * 1; INN[f] = SPL[3] * 1; IDU[f] = SPL[4] * 1; IQX[f] = SPL[5] * 1; IQY[f] = SPL[6] * 1; IQZ[f] = SPL[7] * 1; IRG[f] = nmGen; }
    }
    i = i + 1;
  }
  i = 1;
  while (i <= NITM) { if (IID[i] > 0) { if (IRK[i] == k) { if (IRG[i] != nmGen) { IID[i] = 0; IRK[i] = 0; } } } i = i + 1; }
}
function nmItemsDrop(k) {
  let i = 1;
  // (k 0: every stand-in)
  while (i <= NITM) { if (IRK[i] > 0) { if (k == 0 || IRK[i] == k) { IID[i] = 0; IRK[i] = 0; } } i = i + 1; }
}
// (an owner gone without a word: its things are mine, with its mobs)
function nmItemsAdopt(k) {
  let i = 1;
  while (i <= NITM) { if (IID[i] > 0) { if (IRK[i] == k) { netItemNew(i); IXX[i] = IQX[i]; IYY[i] = IQY[i]; IZZ[i] = IQZ[i]; } } i = i + 1; }
}
// the owner: slot k stands on my thing - theirs, if it is still here
function nmItemAsked(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 2) { if (SPL[1] == netNick) {
    let u = SPL[2] * 1, i = 1, s = 0;
    while (i <= NITM) { if (IID[i] > 0) { if (IRK[i] == 0 && IUID[i] == u) { s = i; } } i = i + 1; }
    // ((v3.2) a third field: the host's hopper it is for, sent back with it)
    let tag = 0; if (SPL.length >= 3) { tag = SPL[3] * 1; }
    if (s > 0) { evAdd('T', `${NNICK[k]}^${IID[s]}^${INN[s]}^${IDU[s]}^${tag}`); IID[s] = 0; nmWT = 99; }
  } }
}
// (v3.2) the host's hopper c under another's thing (items.js hopperWork): asked for when it has room
function netItemHopper(i, c) {
  if (IAGE[i] > 0.5) { if (chestRoom(c, IID[i], IDU[i]) == 1) { evAdd('P', `${NNICK[IRK[i]]}^${IRU[i]}^${c}`); IAGE[i] = 0 - 1; } }
}
// (it came: into that hopper; what does not go in lies on it, mine now)
function hopperGot(c, id, n, du) {
  let ok = 0, a0 = netApplying;
  if (c <= CHON.length) { if (CHON[c] == 1) { if (idiv(CHY[c], 1000) == dim) { ok = 1; } } }
  netApplying = 0;
  if (ok == 1) {
    let go = 1;
    while (n > 0 && go == 1) { if (chestTake(c, id, 1, du) == 1) { n = n - 1; } else { go = 0; } }
    if (n > 0) { dropItem(id, n, du, CHX[c] + 0.5, CHY[c] - dim * 1000 + 1.1, CHZ[c] + 0.5, 0); }
  } else { dropItem(id, n, du, px, py + 1, pz, 0); }
  netApplying = a0;
}
// given to me (what does not fit falls here, mine)
function nmItemGot(f) {
  splitBy(f, '^');
  if (SPL.length >= 4) { if (SPL[1] == netNick) {
    let id = SPL[2] * 1, n = SPL[3] * 1, du = SPL[4] * 1, tag = 0;
    if (SPL.length >= 5) { tag = SPL[5] * 1; }
    if (tag > 0) { hopperGot(tag, id, n, du); }
    else {
      addItem(id, n, du);
      if (addLeft < n) { sndPlay(6); }
      if (addLeft > 0) { dropItem(id, addLeft, du, px, py + 1, pz, 0); if (lastItem > 0) { IAGE[lastItem] = 0 - 2; } }
    }
  } }
}
// an arrow of mine flies off (arrowShoot): told to the others
// ((v3.2) with what else it carries: ASTK (a rocket's fuse, the slot a shell-bug's bolt goes for) and its
// age (fangs wait under the ground); so thrown things, rockets, bolts and fangs are seen too)
function netArrowSay(a) {
  if (a > 0) { if (netSrv > 0) { if (netSt == 2) { if (netApplying == 0) {
    let st = ASTK[a];
    if (AON[a] == 5) { if (st == 0) { st = netMy; } }
    evAdd('S', `${dim}^${Math.round(AXX[a] * 100) / 100}^${Math.round(AYY[a] * 100) / 100}^${Math.round(AZZ[a] * 100) / 100}^${Math.round(AVX[a] * 100) / 100}^${Math.round(AVY[a] * 100) / 100}^${Math.round(AVZ[a] * 100) / 100}^${AON[a]}^${AEN[a]}^${st}^${Math.round(AAGE[a] * 100) / 100}`);
  } } } }
}
// another's arrow: one to look at here (APW -1: it hurts nothing, drops nothing)
function nmArrow(k, f) {
  splitBy(f, '^');
  if (SPL.length >= 9) { if (SPL[1] * 1 == dim) { if (cOK(Math.floor(SPL[2] * 1), Math.floor(SPL[4] * 1)) == 1) {
    let i = 1, a = 0;
    while (i <= NARR) { if (a == 0) { if (AON[i] == 0) { a = i; } } i = i + 1; }
    if (a > 0) {
      AXX[a] = SPL[2] * 1; AYY[a] = SPL[3] * 1; AZZ[a] = SPL[4] * 1; AVX[a] = SPL[5] * 1; AVY[a] = SPL[6] * 1; AVZ[a] = SPL[7] * 1;
      AON[a] = SPL[8] * 1; AEN[a] = SPL[9] * 1; AAGE[a] = 0; ASTK[a] = 0; APW[a] = 0 - k;
      if (SPL.length >= 11) { ASTK[a] = SPL[10] * 1; AAGE[a] = SPL[11] * 1; }
      // (a bolt for me: mine to be hit by; for another: the slot it goes for)
      if (AON[a] == 5) { if (ASTK[a] == netMy) { ASTK[a] = 0; } }
    }
  } } }
}
