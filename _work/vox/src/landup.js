// ===================================================================== (v3.5) what was made in the world 128 high, moved up
// v3.4 and before: the world was 128 high and its sea's top at 30. From 24 up a block there was a block of
// the land of now, 33 lower; under that the depths were squeezed (a block there is 1.5 here). The land above
// the sea is the same land (terra.js keeps the densities where they were), so what stood at y stands at yUp(y)
// now: the changed blocks, chests, signs, the kept mobs, the players' places and beds - of the overworld (the
// other two worlds are as they were, and a flat world is where it was). Done once: a kept world when it is
// opened (worldUp), a server by the first of this version to come into it alone (serverUp), a map when it is
// pasted (mapUp). genVer / shGen / the map's own number say it is done.
function yUp(y0) {
  let y = y0 * 1, r = y - (0 - 33);
  if (y < 24) { r = Math.round(21 + y * 1.5); }
  return r;
}
// (a height kept with its world x 1000: the overworld's only; 400 and over are no heights)
function ydUp(v0) {
  let v = v0 * 1, r = v;
  if (v < 400) { r = yUp(v); }
  return r;
}
// a villager's job block (fauna.js jobPack): it was packed x 128 for the height - packed as now (x 256),
// moved up when sh is 1
function jobUp(p0, sh) {
  let p = p0 * 1, r = 0;
  if (p > 0) {
    let y = mod(p, 128), q = idiv(p, 128);
    if (sh == 1) { y = yUp(y); }
    r = q * 256 + y;
  }
  return r;
}
// ---------------------------------------------------------------- a kept world (save.js loadGame)
function worldUp() {
  let sh = 1, i = 1;
  if (flatOn == 1) { sh = 0; }
  if (sh == 1) {
    while (i <= EDY.length) { if (EDD[i] == 0) { EDY[i] = yUp(EDY[i]); } i = i + 1; }
    edIndex();
    i = 1; while (i <= SGY.length) { if (SGD[i] == 0) { SGY[i] = yUp(SGY[i]); } i = i + 1; }
    i = 1; while (i <= CBY.length) { if (CBD[i] == 0) { CBY[i] = yUp(CBY[i]); } i = i + 1; }
    i = 1; while (i <= LTY.length) { if (LTD[i] == 0) { LTY[i] = yUp(LTY[i]); } i = i + 1; }
    i = 1; while (i <= CMY.length) { if (CMD[i] == 0) { CMY[i] = yUp(CMY[i]); } i = i + 1; }
    i = 1; while (i <= FUY.length) { if (FUON[i] == 1) { FUY[i] = ydUp(FUY[i]); } i = i + 1; }
    i = 1; while (i <= CHY.length) { if (CHON[i] == 1) { CHY[i] = ydUp(CHY[i]); } i = i + 1; }
    i = 1; while (i <= KVY.length) { KVY[i] = ydUp(KVY[i]); i = i + 1; }
    i = 1; while (i <= LPY.length) { LPY[i] = ydUp(LPY[i]); i = i + 1; }
    if (svDim == 0) { svY = yUp(svY); }
    if (spawnDim == 0) { spawnY = yUp(spawnY); }
  }
  i = 1;
  while (i <= KPY.length) {
    let s2 = 0;
    if (sh == 1 && KPD[i] == 0) { s2 = 1; KPY[i] = yUp(KPY[i]); }
    if (KPT[i] == M_VILLAGER) { KPC[i] = jobUp(KPC[i], s2); }
    i = i + 1;
  }
}
// ---------------------------------------------------------------- a server (net.js netJoin: nobody else is in it)
// `x,y,z,world` (a chest's or a sign's key, where lava was poured)
function keyUp(s) {
  gS = s;
  splitBy(s, ',');
  if (SPL.length >= 4) { if (SPL[4] * 1 == 0) { gS = `${SPL[1]},${ydUp(SPL[2])},${SPL[3]},${SPL[4]}`; } }
  return gS;
}
// a player's line (net.js netUserPack): the place (2nd of world 4th) and the bed (11th of world 16th)
function userUp(d) {
  splitBy(d, '^');
  let n = SPL.length, j = 2, sd = 0;
  if (n >= 16) { sd = SPL[16] * 1; }
  gS = `${SPL[1]}`;
  while (j <= n) {
    let v = SPL[j];
    if (n >= 13) {
      if (j == 2) { if (SPL[4] * 1 == 0) { v = yUp(v); } }
      if (j == 11) { if (sd == 0) { v = yUp(v); } }
    }
    gS = `${gS}^${v}`;
    j = j + 1;
  }
  return gS;
}
// a kept mob's line (netkeep.js skRest: kind, y, ..., the 8th a villager's job block) of world w
function keptUp(r, w, sh) {
  gS = r;
  splitBy(r, ',');
  let n = SPL.length, j = 2, s2 = 0;
  if (sh == 1 && w == 0) { s2 = 1; }
  if (n >= 2) {
    gS = `${SPL[1]}`;
    while (j <= n) {
      let v = SPL[j];
      if (j == 2) { if (s2 == 1) { v = yUp(v); } }
      if (j == 8) { if (SPL[1] * 1 == M_VILLAGER) { v = jobUp(v, s2); } }
      gS = `${gS},${v}`;
      j = j + 1;
    }
  }
  return gS;
}
function serverUp(k) {
  let sh = 1, i = 1;
  if (flatOn == 1) { sh = 0; }
  if (sh == 1) {
    // the record of changed blocks, written whole (NEW - the record of a server I host - put back after)
    NEWK = [];
    while (i <= NEW.length) { NEWK.push(NEW[i]); i = i + 1; }
    NEW = [];
    let n = editLen(k);
    i = 1;
    while (i + 4 <= n) {
      let y = editItem(k, i + 1), d = editItem(k, i + 4) * 1;
      if (d == 0) { y = yUp(y); }
      NEW.push(editItem(k, i)); NEW.push(y); NEW.push(editItem(k, i + 2)); NEW.push(editItem(k, i + 3)); NEW.push(d);
      i = i + 5;
    }
    if (NEW.length == 0) { edGone(); }
    editsPut(k);
    NEW = []; i = 1;
    while (i <= NEWK.length) { NEW.push(NEWK[i]); i = i + 1; }
    NEWK = [];
    i = 1; while (i <= MCK.length) { MCK[i] = keyUp(MCK[i]); i = i + 1; }
    i = 1; while (i <= MSK.length) { MSK[i] = keyUp(MSK[i]); i = i + 1; }
    i = 1; while (i <= MLP.length) { MLP[i] = keyUp(MLP[i]); i = i + 1; }
    i = 1; while (i <= MUD.length) { MUD[i] = userUp(MUD[i]); i = i + 1; }
  }
  i = 1; while (i <= MKR.length) { MKR[i] = keptUp(MKR[i], MKW[i], sh); i = i + 1; }
  shGen = GENV;
  metaWrite(k);
}
// ---------------------------------------------------------------- a map pasted (mapdata.js mapTake)
// the parts `key^value~key^value...` with their keys moved up
function pairsUp(s) {
  gS2 = s;
  if (s != '-') {
    splitBy(s, '~');
    MPN = [];
    let i = 1;
    while (i <= SPL.length) { MPN.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= MPN.length) {
      let p = indexOf(MPN[i], '^'), t = MPN[i];
      if (p > 1) { t = `${keyUp(substr(MPN[i], 1, p - 1))}${substr(MPN[i], p, strlen(MPN[i]))}`; }
      if (i == 1) { gS2 = t; } else { gS2 = `${gS2}~${t}`; }
      i = i + 1;
    }
    MPN = [];
  }
  return gS2;
}
function mapUp() {
  let sh = 1, i = 1;
  if (mpFlat != '-') { sh = 0; }
  if (sh == 1) {
    while (i + 4 <= MPE.length) { if (MPE[i + 4] == 0) { MPE[i + 1] = yUp(MPE[i + 1]); } i = i + 5; }
    mpC = pairsUp(mpC); mpS = pairsUp(mpS); mpB = pairsUp(mpB);
  }
  i = 1;
  while (i + 10 <= MPK.length) {
    let s2 = 0;
    if (sh == 1 && MPK[i + 8] == 0) { s2 = 1; MPK[i + 2] = yUp(MPK[i + 2]); }
    if (MPK[i] == M_VILLAGER) { MPK[i + 10] = jobUp(MPK[i + 10], s2); }
    i = i + 11;
  }
  mpGen = GENV;
}
