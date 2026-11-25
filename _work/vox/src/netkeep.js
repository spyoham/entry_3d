// ===================================================================== (v3.4) the mobs a server keeps
// A server kept no mobs: an animal or a villager lived while its owner (the player whose game runs it,
// netmob.js) was near, and was gone with them - so a trading hall, a pen or an iron farm was empty the
// next time the server was played, and a map pasted into a new server came without its mobs. Now the
// server has a record of them, with its settings (a line K^number^world^x^z^kind,y,hp,own,marks,age,ETG,ECNV
// each): the village folk and the iron keepers always, an animal once a player fed it, bred it, or made
// it (an egg, /summon), and all the kept mobs of a pasted map.
// - The record holds the living ones too: the owner says a kept mob again ('J') when it changed or went
//   more than 3 blocks, looked at once a second - a tab closed loses a second of them, not the mob.
// - A kept mob lives only near a player: 48 blocks from its owner (where the owner's line ends) and with
//   nobody to give it to, it is said and put to sleep; a player within 40 blocks of a record nobody has
//   alive wakes it (after two looks 2 s apart, so that a death told meanwhile is heard first), with its
//   own number - two who wake the same one are seen to as two who made the same chunk (the lower slot's stays).
// - A kept mob's end ('j') takes it out of the record; a structure's own (a village's people) stays in it
//   as dead (world 9), so the village does not make it again - as a single world makes them once.
// The numbers: a chunk's or a structure's mob keeps its own (from 1,000,000; netmob.js), another gets
// one from SKB up. Not kept here: the tamed (their tamer's, as before), monsters, the wandering trader.
const SKB = 2000000000;
const SKMAX = 120;
// the record (everybody has it, from the settings; the host writes it): number, world, x, z, the rest
let MKU = [], MKW = [], MKX = [], MKZ = [], MKR = [];
// the kept ones alive in my game: number, what was said of it last (skSig), where
let SKL = [], SKS = [], SKPX = [], SKPZ = [], SKA = [];
// the ones dead lately (not woken while the record still has them), the ones seen missing at the last look
let NKX = [], SKC = [], SKD = [];
let skT = 0, skN = 0, skOut = '', skOutN = 0;

function skReset() { SKL = []; SKS = []; SKPX = []; SKPZ = []; SKA = []; NKX = []; SKC = []; SKD = []; skT = 0 - 3; skN = 0; skOut = ''; skOutN = 0; }
function skClear() { MKU = []; MKW = []; MKX = []; MKZ = []; MKR = []; }
function skFind(u) { let r = 0, i = 1; while (i <= MKU.length) { if (MKU[i] == u) { r = i; } i = i + 1; } return r; }
function skMine(u) { let r = 0, i = 1; while (i <= SKL.length) { if (SKL[i] == u) { r = i; } i = i + 1; } return r; }
// no longer mine to speak for (given away, asleep): not its end
function skLet(u) { let i = skMine(u); if (i > 0) { SKL.removeAt(i); SKS.removeAt(i); SKPX.removeAt(i); SKPZ.removeAt(i); } }
function skDelAt(i) { MKU.removeAt(i); MKW.removeAt(i); MKX.removeAt(i); MKZ.removeAt(i); MKR.removeAt(i); }
// may my mob e be in the record
function skKind(e) {
  let r = 0, t = ET[e];
  if (t > 0) { if (ERK[e] == 0 && EOWN[e] == 0) { if (MHOST[t] == 0 && t != 12 && isProxy(e) == 0 && t != M_TRADER && t != M_SPRITE && t != M_VOIDMITE) { r = 1; } } }
  // ((v3.4, 11-21) a monster that rode a cart or a boat (EOWN 5) stays, as in a single world)
  if (t > 0) { if (ERK[e] == 0 && EOWN[e] == 5) { r = 1; } }
  return r;
}
function skRest(e) { return `${ET[e]},${Math.round(EY[e] * 100) / 100},${Math.round(EHP[e] * 10) / 10},${EOWN[e]},${EVAR[e]},${Math.round(EAGE[e])},${ETG[e]},${Math.round(ECNV[e] * 10) / 10}`; }
// what makes it worth saying again (a villager's trades and work; ETG and ECNV of the others are timers and aims)
function skSig(e) {
  gS2 = `${ET[e]},${Math.ceil(EHP[e])},${EVAR[e]},${isBaby(e)}`;
  if (ET[e] == M_VILLAGER) { gS2 = `${gS2},${ETG[e]},${ECNV[e]}`; }
  return gS2;
}
// what of a record's rest is worth writing at once (skRest: kind, y, health, owner, look, age, ETG, ECNV - the
// place, the height and the age move all the time; ETG and ECNV are a villager's trades and work)
function skCore(r) {
  splitBy(r, ',');
  gS2 = r;
  if (SPL.length >= 8) {
    let bb = 0; if (SPL[6] * 1 < 0) { bb = 1; }
    gS2 = `${SPL[1]},${Math.ceil(SPL[3] * 1)},${SPL[4]},${SPL[5]},${bb}`;
    if (SPL[1] * 1 == M_VILLAGER) { gS2 = `${gS2},${SPL[7]},${SPL[8]}`; }
  }
  return gS2;
}
// an entry into the record here (the host's goes out with the settings)
function skPut(u, d, x, z, r) {
  let i = skFind(u), nw = 0;
  if (i == 0) { nw = 1; if (MKU.length >= SKMAX) { skDelAt(1); } MKU.push(u); MKW.push(d); MKX.push(x); MKZ.push(z); MKR.push(r); }
  else {
    // (what it is changed - its kind, health, owner, look, a villager's trades and work, another world: at once too)
    if (MKW[i] != d) { nw = 1; } else { if (netHost == 1) { let c0 = skCore(MKR[i]); if (skCore(r) != c0) { nw = 1; } } }
    MKW[i] = d; MKX[i] = x; MKZ[i] = z; MKR[i] = r;
  }
  i = 1;
  while (i <= NKX.length) { if (NKX[i] == u) { NKX.removeAt(i); } else { i = i + 1; } }
  // ((v3.4, 11-22) a new one goes into the settings at once; one that only moved or changed, within 15 s
  // (hostStep: skDirty). Each was written at once, and on a server with twenty animals walking about the host
  // sent the whole settings every second, read anew by everybody - seen in the real room, test/realsync TWO=1 MAP=1)
  if (netHost == 1) { if (nw == 1) { metaDirty = 1; } else { skDirty = 1; } }
}
// my mob e said: into the record here, and to the others (six in an event)
function skSay(e) {
  let u = EUID[e], x = Math.round(EX[e] * 100) / 100, z = Math.round(EZ[e] * 100) / 100;
  let r = skRest(e);
  skPut(u, dim, x, z, r);
  if (skOutN > 0) { skOut = `${skOut};`; }
  skOut = `${skOut}${netSrv}^${u}^${dim}^${x}^${z}^${r}`;
  skOutN = skOutN + 1;
  if (skOutN >= 6) { skFlush(); }
  let i = skMine(u);
  if (i == 0) { SKL.push(u); SKS.push(' '); SKPX.push(0); SKPZ.push(0); i = SKL.length; }
  SKS[i] = skSig(e); SKPX[i] = EX[e]; SKPZ[i] = EZ[e];
}
function skFlush() { if (skOutN > 0) { evAdd('J', skOut); skOut = ''; skOutN = 0; } }
// heard ('J': server^number^world^x^z^rest;...)
function skHear(f) {
  splitBy(f, ';');
  NMR = [];
  let i = 1;
  while (i <= SPL.length) { NMR.push(SPL[i]); i = i + 1; }
  i = 1;
  while (i <= NMR.length) {
    splitBy(NMR[i], '^');
    if (SPL.length >= 6) { if (SPL[1] * 1 == netSrv) { skPut(SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1, SPL[6]); } }
    i = i + 1;
  }
}
// a kept mob's end: out of the record (a structure's own stays in it, as dead)
function skDead(u) {
  let i = skFind(u);
  if (i > 0) {
    if (u >= 100000000 && u < SKB) { MKW[i] = 9; MKX[i] = 0; MKZ[i] = 0; MKR[i] = '-'; } else { skDelAt(i); }
    if (netHost == 1) { metaDirty = 1; }
  }
  NKX.push(u); if (NKX.length > 60) { NKX.removeAt(1); }
  skLet(u);
}
function skHearGone(f) { splitBy(f, '^'); if (SPL.length >= 2) { if (SPL[1] * 1 == netSrv) { skDead(SPL[2] * 1); } } }
// a mob a player fed, bred or made: kept from now on
function skMark(e) {
  if (netSrv > 0 && netSt == 2 && e > 0) { if (skKind(e) == 1) {
    if (EUID[e] < 1000000) { EUID[e] = SKB + rand(1, 999999999); }
    if (skMine(EUID[e]) == 0) { skSay(e); }
  } }
}
// (mobsStep: its chunk went out of the window) said once more, asleep in the record
function skAway(e) {
  if (netSrv > 0) { if (ERK[e] == 0) { if (skMine(EUID[e]) > 0) { skSay(e); skLet(EUID[e]); } } }
}
// leaving the server or the world: all of mine said as they are now; they are not mine after
function skLeave() {
  if (netSrv > 0 && netSt == 2) {
    let e = 1;
    while (e <= NMOB) { if (ET[e] > 0) { if (ERK[e] == 0) { if (skMine(EUID[e]) > 0) { if (skKind(e) == 1) { skSay(e); } } } } e = e + 1; }
    skFlush();
  }
  SKL = []; SKS = []; SKPX = []; SKPZ = []; SKC = [];
}
// is the one of that number alive on some screen: mine, a stand-in here, or in another's line
function skAlive(u) {
  let r = 0, e = 1;
  while (e <= NMOB) { if (ET[e] > 0) { if (ERK[e] == 0) { if (EUID[e] == u) { r = 1; } } else { if (ERU[e] == u) { r = 1; } } } e = e + 1; }
  if (r == 0) { r = nmInLine(u); }
  if (r == 0) { let i = 1; while (i <= NKX.length) { if (NKX[i] == u) { r = 1; } i = i + 1; } }
  return r;
}
// once a second: my kept ones looked at - new ones taken in, changed ones said, far ones put to sleep,
// the ones no longer here told dead
function skMineLook() {
  SKA = [];
  let i = 1;
  while (i <= SKL.length) { SKA.push(0); i = i + 1; }
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) { if (ERK[e] == 0) { if (isProxy(e) == 0) {
      let u = EUID[e], k = skMine(u), kd = skKind(e);
      if (k == 0) { if (kd == 1) {
        // (one of the record that came to me - given, taken over, woken by a chunk: mine to speak for)
        if (u >= 1000000 && skFind(u) > 0) { SKL.push(u); SKS.push(skSig(e)); SKPX.push(EX[e]); SKPZ.push(EZ[e]); k = SKL.length; }
        // ((v3.4, 11-21) and a rider that stays, with the cart or boat it sits in)
        // (a keeper once it has stood a minute (EAGE counts the looks): one of an iron farm lives ten seconds, and
        // each written into the server's settings and out again had everybody read them anew)
        else {
          let en = 0;
          if (ET[e] == M_VILLAGER || EOWN[e] == 5) { en = 1; }
          if (ET[e] == M_MINECART || ET[e] == M_BOAT) { if (ETG[e] > 0) { en = 1; } }
          if (ET[e] == M_GOLEM) { EAGE[e] = EAGE[e] + 1; if (EAGE[e] >= 60) { en = 1; } }
          if (en == 1) { skMark(e); k = skMine(EUID[e]); }
        }
      } }
      while (SKA.length < SKL.length) { SKA.push(1); }
      if (k > 0) { if (kd == 1) {
        SKA[k] = 1;
        let dx = EX[e] - px, dz = EZ[e] - pz;
        if (dx * dx + dz * dz >= 2304 && riding != e) { skSay(e); SKA[k] = 2; ET[e] = 0; }
        else {
          let mx = EX[e] - SKPX[k], mz = EZ[e] - SKPZ[k];
          if (mx * mx + mz * mz > 9) { skSay(e); } else { if (skSig(e) != SKS[k]) { skSay(e); } }
        }
      } }
    } } }
    e = e + 1;
  }
  i = Math.min(SKL.length, SKA.length);
  while (i >= 1) {
    if (SKA[i] == 0) { let u = SKL[i]; skDead(u); evAdd('j', `${netSrv}^${u}`); }
    else { if (SKA[i] == 2) { skLet(SKL[i]); } }
    i = i - 1;
  }
}
// every other second: the record's ones near me that nobody has alive come back
function skWake() {
  SKD = [];
  let i = 1, n = MKU.length;
  while (i <= n) {
    if (MKW[i] == dim) {
      let dx = MKX[i] - px, dz = MKZ[i] - pz;
      if (dx * dx + dz * dz < 1600) { let u = MKU[i]; if (skAlive(u) == 0) {
        let was = 0, j = 1, made = 0;
        while (j <= SKC.length) { if (SKC[j] == u) { was = 1; } j = j + 1; }
        if (was == 1) {
          let fx0 = Math.floor(MKX[i]), fz0 = Math.floor(MKZ[i]);
          if (cOK(fx0, fz0) == 1) { if (CKST[slotOf(idiv(fx0, 16), idiv(fz0, 16))] >= 4) { made = skMake(i); } }
        }
        if (made == 0) { SKD.push(u); }
      } }
    }
    i = i + 1;
  }
  SKC = [];
  i = 1;
  while (i <= SKD.length) { SKC.push(SKD[i]); i = i + 1; }
  SKD = [];
}
function skMake(i) {
  let r = 0, u = MKU[i], x = MKX[i], z = MKZ[i];
  splitBy(MKR[i], ',');
  if (SPL.length >= 8) {
    nmDet = u; mobAdd(SPL[1] * 1, x, SPL[2] * 1, z); nmDet = 0;
    let e = lastMob;
    if (e > 0) {
      EHP[e] = SPL[3] * 1; EOWN[e] = SPL[4] * 1; EVAR[e] = SPL[5] * 1; EAGE[e] = SPL[6] * 1; ETG[e] = SPL[7] * 1; ECNV[e] = SPL[8] * 1; EST[e] = 0;
      if (EAGE[e] < 0 && EAGE[e] > 0 - 999000) { ESZ[e] = 0.5; }
      if (skMine(u) == 0) { SKL.push(u); SKS.push(skSig(e)); SKPX.push(EX[e]); SKPZ.push(EZ[e]); }
      nmWT = 99; r = 1;
    }
  }
  return r;
}
// each frame on a server (net.js netInServer)
function skStep(dt) {
  skT = skT + dt;
  if (skT >= 1) {
    skT = 0; skN = skN + 1;
    skMineLook();
    if (mod(skN, 2) == 0) { skWake(); }
    skFlush();
  }
}
// a map's kept mobs into the record of a new server (mapdata.js mapToServer: MPK, 11 numbers each):
// nobody's on a server (a tamed one would be whoever comes first's)
function skFromMap() {
  skClear();
  let i = 1;
  while (i + 10 <= MPK.length) {
    if (MKU.length < SKMAX) {
      MKU.push(SKB + rand(1, 999999999)); MKW.push(MPK[i + 8]); MKX.push(MPK[i + 1]); MKZ.push(MPK[i + 3]);
      let ow = 0; if (MPK[i + 5] == 5) { ow = 5; }
      MKR.push(`${MPK[i]},${MPK[i + 2]},${MPK[i + 4]},${ow},${MPK[i + 6]},${MPK[i + 7]},${MPK[i + 9]},${MPK[i + 10]}`);
    }
    i = i + 11;
  }
}
// the record as a map's kept mobs (mapOutServer), mine said first
function skToMap() {
  let e = 1;
  while (e <= NMOB) { if (ET[e] > 0) { if (ERK[e] == 0) { if (skMine(EUID[e]) > 0) { if (skKind(e) == 1) { skSay(e); } } } } e = e + 1; }
  skFlush();
  NMR = [];
  let i = 1, any = 0;
  while (i <= MKU.length) { if (MKW[i] < 9) { NMR.push(`${MKW[i]},${MKX[i]},${MKZ[i]},${MKR[i]}`); } i = i + 1; }
  i = 1;
  while (i <= NMR.length) {
    splitBy(NMR[i], ',');
    if (SPL.length >= 11) { mpOut = `${mpOut}${SPL[4]},${SPL[2]},${SPL[5]},${SPL[3]},${SPL[6]},${SPL[7]},${SPL[8]},${SPL[9]},${SPL[1]},${SPL[10]},${SPL[11]};`; any = 1; }
    i = i + 1;
  }
  if (any == 0) { mpOut = `${mpOut}-`; }
  NMR = [];
}
