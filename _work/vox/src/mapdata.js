// ===================================================================== (v3.2) the map as a text: copied out, pasted in
// A world is its seed and what was changed in it. mapCopy puts that in one line of text and hands it
// to the viewer's clipboard (tessvm's $CLIPBOARD: the work writes it, the viewer is asked to copy); on
// the new-world and the new-server screens the viewer pastes such a text (Ctrl+V writes $CLIPBOARD) and
// the world or server is made from it.
//   BWMAP1|seed|flat|genVer|warden gone|blocks|chests|signs|command blocks|kept mobs|chunks' animals made|more
//   blocks: x,y,z,block,world;...      chests: x,y,z,world^27 slots id.n.wear,...~...
//   signs and command blocks: x,y,z,world^text~...      kept mobs: 11 numbers each;...      (an empty part: -)
//   (v3.5, 11-26) more (a twelfth part, a map without it is read as before): name=numbers;name=numbers...
//     hash=x,y,z[,1]   what is added to a cell before the wire's hashing (power.js hashPlace): a machine of the
//                  genre moved from where it was made settles in the order it did there; (11-28) with the 1 the
//                  map is the genre's mirrored, east for west (the genre's x is the first number less this x)
//     spawn=x,y,z,yaw   where the player begins        keep=cx,cz,cx,cz...   the chunks the world keeps made
//     cmp=x,y,z,level,...   the outputs of the comparators that are on (they would read 15 till their first tick)
// In a single game the player copies their world (with its kept animals and village folk); on a server
// its owner copies the server's record (blocks, chests, signs and, (v3.4), the mobs it keeps:
// netkeep.js). Pasted into a server the command blocks of the text are left out.
let $CLIPBOARD = '';
let mpOut = '', mpOn = 0, mpLate = 0, mpLen = 0, mpSeed = 0, mpFlat = '-', mpGen = 1, mpBoss = 0, mpC = '-', mpS = '-', mpB = '-', mpNE = 0;
let mpX = '-', mpSpOn = 0, mpSpX = 0, mpSpY = 0, mpSpZ = 0, mpYaw = 0 - 1;
let MPE = [], MPK = [], MPA = [], MPN = [], MPI = [], MPQ = [];
function mpPush(w, v) { if (w == 1) { MPE.push(v); } if (w == 2) { MPK.push(v); } if (w == 3) { MPA.push(v); } if (w == 4) { MPQ.push(v); } }
// a text of a sign or a command, safe between the separators (put back by netDec)
function mapEnc(s) { return replace(replace(replace(`${s}`, '|', '｜'), '~', '∼'), '^', '＾'); }
// the numbers of a part (between , and ;) into list w (1 MPE the blocks, 2 MPK the kept mobs, 3 MPA)
function mapNums(s, w) {
  let n = strlen(s), i = 1, cur = ' ', has = 0;
  while (i <= n) {
    let c = charAt(s, i);
    if (c == ',' || c == ';') { if (has == 1) { mpPush(w, cur * 1); } cur = ' '; has = 0; }
    else { if (has == 0) { cur = c; has = 1; } else { cur = `${cur}${c}`; } }
    i = i + 1;
  }
  if (has == 1) { if (cur != '-') { mpPush(w, cur * 1); } }
}
// may the one playing copy the map: anyone their own world, a server its owner
function mapMay() {
  let r = 1;
  if (netSrv > 0) { r = 0; if (netNick == shOwner || netNick == SUPER) { r = 1; } }
  return r;
}

// ---------------------------------------------------------------- out
function mapCopy() {
  if (mapMay() == 1) {
    if (netSrv > 0) { mapOutServer(); } else { mapOutWorld(); }
    $CLIPBOARD = mpOut;
    mpLen = strlen(mpOut);
    if (isTess == 1) { msgShow(`맵 데이터 ${strlen(mpOut)}자 - 뜨는 창에서 복사를 누르세요`, 5); } else { msgShow('맵 데이터 복사는 tessvm에서만 됩니다', 4); }
  } else { msgShow('서버의 맵 데이터는 서버 주인만 복사할 수 있습니다', 3); }
}
function mapOutWorld() {
  edCompact();
  mpOut = `BWMAP1|${seed}|${flatKept()}|${genVer}|${bossDead}|`;
  let i = 1, n = EDX.length;
  if (n == 0) { mpOut = `${mpOut}-`; }
  while (i <= n) { mpOut = `${mpOut}${EDX[i]},${EDY[i]},${EDZ[i]},${EDB[i]},${EDD[i]};`; i = i + 1; }
  // the chests in use, as a server keeps them
  mpOut = `${mpOut}|`;
  let c = 1, any = 0;
  while (c <= NCHEST) {
    if (CHON[c] == 1) {
      let base = (c - 1) * 27, k = 1, full = 0;
      while (k <= 27) { if (CHI[base + k] > 0) { full = 1; } k = k + 1; }
      if (full == 1) {
        let d = idiv(CHY[c], 1000);
        if (any == 1) { mpOut = `${mpOut}~`; }
        mpOut = `${mpOut}${CHX[c]},${CHY[c] - d * 1000},${CHZ[c]},${d}^`;
        k = 1;
        while (k <= 27) { if (k > 1) { mpOut = `${mpOut},`; } mpOut = `${mpOut}${CHI[base + k]}.${CHN[base + k]}.${CHD[base + k]}`; k = k + 1; }
        any = 1;
      }
    }
    c = c + 1;
  }
  if (any == 0) { mpOut = `${mpOut}-`; }
  mpOut = `${mpOut}|`;
  i = 1;
  if (SGX.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= SGX.length) { if (i > 1) { mpOut = `${mpOut}~`; } mpOut = `${mpOut}${SGX[i]},${SGY[i]},${SGZ[i]},${SGD[i]}^${mapEnc(SGT[i])}`; i = i + 1; }
  mpOut = `${mpOut}|`;
  i = 1;
  if (CBX.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= CBX.length) { if (i > 1) { mpOut = `${mpOut}~`; } mpOut = `${mpOut}${CBX[i]},${CBY[i]},${CBZ[i]},${CBD[i]}^${mapEnc(CBT[i])}`; i = i + 1; }
  // the kept mobs: the ones lying kept and (for the writing only) the living ones to keep
  mpOut = `${mpOut}|`;
  let kn = KPT.length;
  keptAll(0);
  i = 1;
  if (KPT.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= KPT.length) { mpOut = `${mpOut}${KPT[i]},${Math.round(KPX[i] * 100) / 100},${Math.round(KPY[i] * 100) / 100},${Math.round(KPZ[i] * 100) / 100},${KPH[i]},${KPO[i]},${KPV[i]},${Math.round(KPS[i])},${KPD[i]},${KPG[i]},${KPC[i]};`; i = i + 1; }
  while (KPT.length > kn) { petsDel(KPT.length); }
  mpOut = `${mpOut}|`;
  i = 1;
  if (CAK.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= CAK.length) { mpOut = `${mpOut}${CAK[i]};`; i = i + 1; }
  // ((11-26) what a map brought over came with, and the comparators' outputs)
  mpOut = `${mpOut}|hash=${hoX},${hoY},${hoZ},${hoM};spawn=${Math.round(spawnX * 10) / 10},${spawnY},${Math.round(spawnZ * 10) / 10},-1`;
  if (KCX.length > 0) {
    mpOut = `${mpOut};keep=`;
    i = 1;
    while (i <= KCX.length) { if (i > 1) { mpOut = `${mpOut},`; } mpOut = `${mpOut}${KCX[i]},${KCZ[i]}`; i = i + 1; }
  }
  let cany = 0;
  i = 1;
  while (i <= CMX.length) {
    if (CMD[i] == 0 && CML[i] > 0) { if (cany == 0) { cany = 1; mpOut = `${mpOut};cmp=`; } else { mpOut = `${mpOut},`; } mpOut = `${mpOut}${CMX[i]},${CMY[i]},${CMZ[i]},${CML[i]}`; }
    i = i + 1;
  }
}
// (v3.5, 11-26) the twelfth part of a map: name=numbers;... (the numbers of one name into MPQ)
function mapMore(at) {
  mpSpOn = 0; mpYaw = 0 - 1;
  if (mpX != '-') {
    splitBy(mpX, ';');
    MPN = [];
    let i = 1;
    while (i <= SPL.length) { MPN.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= MPN.length) {
      let t = MPN[i], eq = indexOf(t, '=');
      if (eq > 1) {
        let nm = substr(t, 1, eq - 1), q = 1;
        MPQ = [];
        if (eq < strlen(t)) { mapNums(substr(t, eq + 1, strlen(t)), 4); }
        if (nm == 'hash') { if (MPQ.length >= 3) { let hm = 0; if (MPQ.length >= 4) { hm = MPQ[4]; } hashSet(MPQ[1], MPQ[2], MPQ[3], hm); } }
        if (nm == 'spawn') { if (MPQ.length >= 3) { mpSpOn = 1; mpSpX = MPQ[1]; mpSpY = MPQ[2]; mpSpZ = MPQ[3]; if (MPQ.length >= 4) { mpYaw = MPQ[4]; } } }
        if (nm == 'keep') { while (q + 1 <= MPQ.length) { keepAdd(MPQ[q], MPQ[q + 1]); q = q + 2; } }
        if (nm == 'cmp') { while (q + 3 <= MPQ.length) { CMX.push(MPQ[q]); CMY.push(MPQ[q + 1]); CMZ.push(MPQ[q + 2]); CMD.push(0); CML.push(MPQ[q + 3]); q = q + 4; } }
      }
      i = i + 1;
    }
    MPN = []; MPQ = [];
  }
}
function mapOutServer() {
  // (the host: what it holds and has not written yet goes into the record first)
  // ((11-28) and its machines as they are now)
  if (netHost == 1) { if (editDirty == 1) { editsWrite(); } if (stDirty == 1) { stKeep(); } }
  mpOut = `BWMAP1|${shSeed}|${shFlat}|${shGen}|${shBoss}|`;
  let n = editLen(netSrv), i = 1;
  // ((v3.3, 11-20) but the cell of no world an emptied record holds (net.js edGone))
  let cells = 0, hb = baseOf();
  if (hb > 0) { let p = 3, bn = baseLen(hb); bsN = 0; while (p <= bn) { baseCells(baseItem(hb, p), 1); p = p + 1; } cells = bsN; }
  // ((11-28) the machines' state after the part of the record it was kept after, as a game coming in reads them)
  let hs = stHead(), cut = n;
  if (hs == 1) { if (stL < n) { cut = stL; } }
  while (i + 4 <= cut) { if (editItem(netSrv, i + 4) * 1 < 9) { cells = cells + 1; mpOut = `${mpOut}${editItem(netSrv, i)},${editItem(netSrv, i + 1)},${editItem(netSrv, i + 2)},${editItem(netSrv, i + 3)},${editItem(netSrv, i + 4)};`; } i = i + 5; }
  if (hs == 1) { bsN = 0; stApply(1); cells = cells + bsN; }
  while (i + 4 <= n) { if (editItem(netSrv, i + 4) * 1 < 9) { cells = cells + 1; mpOut = `${mpOut}${editItem(netSrv, i)},${editItem(netSrv, i + 1)},${editItem(netSrv, i + 2)},${editItem(netSrv, i + 3)},${editItem(netSrv, i + 4)};`; } i = i + 5; }
  if (cells == 0) { mpOut = `${mpOut}-`; }
  mpOut = `${mpOut}|`;
  i = 1;
  if (MCK.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= MCK.length) { if (i > 1) { mpOut = `${mpOut}~`; } mpOut = `${mpOut}${MCK[i]}^${MCD[i]}`; i = i + 1; }
  mpOut = `${mpOut}|`;
  i = 1;
  if (MSK.length == 0) { mpOut = `${mpOut}-`; }
  while (i <= MSK.length) { if (i > 1) { mpOut = `${mpOut}~`; } mpOut = `${mpOut}${MSK[i]}^${MST[i]}`; i = i + 1; }
  // ((v3.4) the kept mobs)
  mpOut = `${mpOut}|-|`;
  skToMap();
  mpOut = `${mpOut}|-`;
  // (the twelfth part only when the map it was made from had one: a map of eleven parts stays one)
  if (hb > 0) { if (baseItem(hb, 2) != '-') { mpOut = `${mpOut}|${baseItem(hb, 2)}`; } }
}

// ---------------------------------------------------------------- in
// (the menus: a screen where a map may be pasted is opened - what is on the clipboard now is not taken
// by itself, only what is pasted from now on, or with the button)
function mapWatch() { mpOn = 0; mpLen = strlen($CLIPBOARD); MPE = []; MPK = []; MPA = []; }
// what was pasted, when it is a map: 1 taken, 0 not a map
function mapTake() {
  let r = 0;
  mpLen = strlen($CLIPBOARD);
  if (mpLen > 12) { if (substr($CLIPBOARD, 1, 7) == 'BWMAP1|') {
    splitBy($CLIPBOARD, '|');
    if (SPL.length >= 11) {
      mpSeed = SPL[2] * 1; mpFlat = SPL[3]; mpGen = SPL[4] * 1; mpBoss = SPL[5] * 1;
      mpC = SPL[7]; mpS = SPL[8]; mpB = SPL[9];
      mpX = '-'; if (SPL.length >= 12) { mpX = SPL[12]; }
      MPE = []; MPK = []; MPA = [];
      mapNums(SPL[6], 1); mapNums(SPL[10], 2); mapNums(SPL[11], 3);
      mpNE = idiv(MPE.length, 5);
      // ((v3.5) a map of the world 128 high: moved up with the land (landup.js))
      if (GENV >= 3 && mpGen < GENV) { mapUp(); }
      if (mpSeed >= 1) { r = 1; }
    }
  } }
  mpOn = r;
  return r;
}
// each frame of such a screen: something new on the clipboard is looked at; the button's words
function mapPasteStep() {
  if (strlen($CLIPBOARD) != mpLen) { if (mapTake() == 0) { menuErr = '붙여넣은 글이 맵 데이터가 아닙니다'; menuErrT = 240; } }
}
function mapLabel() {
  gS2 = '맵 데이터 붙여넣기';
  if (mpOn == 1) { gS2 = `맵: 블록 ${mpNE}개 (빼기)`; }
  return gS2;
}
// (the button: with a map, it is put away; without, what is on the clipboard is tried)
function mapButton() {
  if (mpOn == 1) { mpOn = 0; }
  else { if (mapTake() == 0) { menuErr = 'Ctrl+V로 맵 데이터를 붙여넣으세요 (게임 메뉴의 맵 데이터 복사로 만든 글)'; menuErrT = 300; } }
}
// the parts of text k^v~k^v... into MPI (k, v, k, v ...)
function mapPairs(s) {
  MPI = [];
  if (s != '-') {
    splitBy(s, '~');
    MPN = [];
    let i = 1;
    while (i <= SPL.length) { MPN.push(SPL[i]); i = i + 1; }
    i = 1;
    while (i <= MPN.length) { splitBy(MPN[i], '^'); if (SPL.length >= 2) { MPI.push(SPL[1]); MPI.push(SPL[2]); } i = i + 1; }
    MPN = [];
  }
}
// a new single world from the map (menu.js worldMake, after genStart)
function mapToWorld() {
  // ((v3.4) the land is this version's, whatever the map was made with)
  genVer = GENV; bossDead = mpBoss;
  let i = 1;
  while (i + 4 <= MPE.length) { edPushD(MPE[i], MPE[i + 1], MPE[i + 2], MPE[i + 3], MPE[i + 4]); i = i + 5; }
  // (the chests: when the world is made - its stores are emptied then (main.js): mapLate)
  mpLate = 1;
  mapPairs(mpS);
  i = 1;
  while (i + 1 <= MPI.length) { splitBy(MPI[i], ','); if (SPL.length >= 4) { SGX.push(SPL[1] * 1); SGY.push(SPL[2] * 1); SGZ.push(SPL[3] * 1); SGD.push(SPL[4] * 1); SGT.push(netDec(MPI[i + 1])); } i = i + 2; }
  mapPairs(mpB);
  i = 1;
  while (i + 1 <= MPI.length) { splitBy(MPI[i], ','); if (SPL.length >= 4) { CBX.push(SPL[1] * 1); CBY.push(SPL[2] * 1); CBZ.push(SPL[3] * 1); CBD.push(SPL[4] * 1); CBT.push(netDec(MPI[i + 1])); } i = i + 2; }
  i = 1;
  while (i + 10 <= MPK.length) {
    KPT.push(MPK[i]); KPX.push(MPK[i + 1]); KPY.push(MPK[i + 2]); KPZ.push(MPK[i + 3]); KPH.push(MPK[i + 4]); KPO.push(MPK[i + 5]); KPV.push(MPK[i + 6]); KPS.push(MPK[i + 7]); KPD.push(MPK[i + 8]); KPG.push(MPK[i + 9]); KPC.push(MPK[i + 10]);
    i = i + 11;
  }
  i = 1;
  while (i <= MPA.length) { CAK.push(MPA[i]); i = i + 1; }
  // ((11-26) and what else it came with)
  mapMore(0);
  mpOn = 0; MPE = []; MPK = []; MPA = []; MPI = [];
}
function mapLate() {
  if (mpLate == 1) {
    mpLate = 0;
    // ((11-26) where the map has the player begin)
    if (mpSpOn == 1) { spawnX = mpSpX; spawnY = mpSpY; spawnZ = mpSpZ; }
    mapPairs(mpC);
    let i = 1;
    while (i + 1 <= MPI.length) { netChestLoad(MPI[i], MPI[i + 1]); i = i + 2; }
    MPI = [];
  }
}
// ---------------------------------------------------------------- (v3.5, 11-26) a server's map: its base
// A server made from a map had the map's blocks in its record (SY_e: five numbers a block), and the host writes the
// record whole - made short first - at every change once it is past 30,000 numbers: a map of 58,000 blocks could
// not be a server (the user: "서버에도 불러올수 있게 바꿔줘"). Now a map of more than BASEMIN blocks goes into a list
// of its own, one of the pool SY_b1..NBASE (build.mjs), written once by the one who makes the server and by nobody
// after; the record holds what was changed since, as in any server. Whoever comes in reads the base, then the
// record (net.js netEnter). A list of the pool is a server's by the id in its first item (baseOf); one whose id is
// no server's any more is free (baseFree) - so NBASE servers at a time can have a base.
//   item 1  B^<the server's id>^<blocks>      (a base left by another server in that place is not this one's)
//   item 2  the map's twelfth part (hash, spawn, keep, cmp) or -      (a small map with such a part has these two)
//   items 3..  BASEPC blocks each, ten letters a block in the 64 digits of PA (pack.mjs):
//              x + 131072 (3), z + 131072 (3), y + 256 * world (2), block (2)
// SRVMAP blocks at most: a base of about 900,000 letters (what the room server takes at once is not known; a list
// goes whole in one message).
const BASEMIN = 3000, BASEPC = 500;
let bsN = 0, mpId = '-', mpBase = 0;
function b64three(v) { gS = `${gS}${charAt(PA, idiv(v, 4096) + 1)}${charAt(PA, mod(idiv(v, 64), 64) + 1)}${charAt(PA, mod(v, 64) + 1)}`; }
function b64two(v) { gS = `${gS}${charAt(PA, idiv(v, 64) + 1)}${charAt(PA, mod(v, 64) + 1)}`; }
function baseWrite(k, big) {
  baseClear(k);
  basePush(k, `B^${mpId}^${mpNE}`);
  basePush(k, mpX);
  if (big == 1) {
    let i = 1, n = 0;
    gS = '';
    while (i + 4 <= MPE.length) {
      let x = MPE[i] + 131072, y = MPE[i + 1], z = MPE[i + 2] + 131072, b = MPE[i + 3], d = MPE[i + 4];
      if (x >= 0 && x < 262144 && z >= 0 && z < 262144 && y >= 0 && y < 256 && d >= 0 && d < 9 && b >= 0 && b < 4096) {
        b64three(x); b64three(z); b64two(y + d * 256); b64two(b);
        n = n + 1;
        if (n >= BASEPC) { basePush(k, gS); gS = ''; n = 0; }
      }
      i = i + 5;
    }
    if (n > 0) { basePush(k, gS); }
    gS = '';
  }
}
// (a list of the pool given up: one line that is no base - an empty list is not kept by the room)
function baseGone(s) { if (s >= 1) { baseClear(s); basePush(s, 'X'); } }
// the id of the server the list s of the pool is the base of ('-': of none)
function baseId(s) {
  gS2 = '-';
  if (baseLen(s) >= 2) { splitBy(baseItem(s, 1), '^'); if (SPL.length >= 2) { if (SPL[1] == 'B') { gS2 = SPL[2]; } } }
  return gS2;
}
// which list of the pool is the base of the server whose header is in sh* (0: it has none)
function baseOf() {
  let s = 1, r = 0, id = shId;
  while (s <= NBASE) { if (r == 0) { if (baseId(s) == id) { r = s; } } s = s + 1; }
  return r;
}
// a list of the pool no server has (0: none): empty, given up, or of a server that is no more
// ((11-28) the pool holds the machines' states too (S^id^cells^when^L: net.js stKeep). When no list is free the
// state written longest ago gives its up - never a base. top 1: looked for from the pool's end (for a state: the
// work of before knows the first twelve lists only and takes a base's from the beginning))
let BFI = [];
function bpFree(top) {
  let j = 1, r = 0, k = 1, old = 0, oldT = 0;
  BFI = [];
  while (k <= NSRV) { if (srvHas(k) == 1) { BFI.push(shId); } k = k + 1; }
  while (j <= NBASE) {
    let s = j;
    if (top == 1) { s = NBASE + 1 - j; }
    if (r == 0) {
      let used = 0;
      if (baseLen(s) >= 2) {
        splitBy(baseItem(s, 1), '^');
        if (SPL.length >= 2) { if (SPL[1] == 'B' || SPL[1] == 'S') {
          let id = SPL[2], isSt = 0, t = 0;
          if (SPL[1] == 'S') { isSt = 1; if (SPL.length >= 4) { t = SPL[4] * 1; } }
          k = 1;
          while (k <= BFI.length) { if (BFI[k] == id) { used = 1; } k = k + 1; }
          if (used == 1) { if (isSt == 1) { if (old == 0 || t < oldT) { old = s; oldT = t; } } }
        } }
      }
      if (used == 0) { r = s; }
    }
    j = j + 1;
  }
  BFI = [];
  if (r == 0) { r = old; }
  return r;
}
function baseFree() { let r = bpFree(0); return r; }
// the blocks of one piece: into the log of changes (how 0), or as a map's text onto mpOut (how 1)
function baseCells(s, how) {
  let n = strlen(s), j = 1;
  while (j + 9 <= n) {
    let x = (indexOf(PA, charAt(s, j)) - 1) * 4096 + (indexOf(PA, charAt(s, j + 1)) - 1) * 64 + indexOf(PA, charAt(s, j + 2)) - 131073;
    let z = (indexOf(PA, charAt(s, j + 3)) - 1) * 4096 + (indexOf(PA, charAt(s, j + 4)) - 1) * 64 + indexOf(PA, charAt(s, j + 5)) - 131073;
    let yd = (indexOf(PA, charAt(s, j + 6)) - 1) * 64 + indexOf(PA, charAt(s, j + 7)) - 1;
    let b = (indexOf(PA, charAt(s, j + 8)) - 1) * 64 + indexOf(PA, charAt(s, j + 9)) - 1;
    let d = idiv(yd, 256), y = yd - d * 256;
    // ((11-28) how 2: only where this screen has not the cell made - a machine's state taken over (net.js stAdopt))
    if (how == 0) { edPushD(x, y, z, b, d); }
    if (how == 1) { mpOut = `${mpOut}${x},${y},${z},${b},${d};`; }
    if (how == 2) { if (d != dim || cOK(x, z) == 0) { edPushD(x, y, z, b, d); } }
    bsN = bsN + 1;
    j = j + 10;
  }
}
// coming into the server whose header is in sh*: its map into the log, and what the map came with (1: it has a base)
function baseLoad() {
  let k = baseOf(), r = 0, n = 0, p = 3;
  mpX = '-'; bsN = 0;
  if (k > 0) {
    r = 1; n = baseLen(k);
    mpX = baseItem(k, 2);
    while (p <= n) { baseCells(baseItem(k, p), 0); p = p + 1; }
  }
  return r;
}
// ---------------------------------------------------------------- (v3.5, 11-28) a server's machines: their state
// What the spark engine changed on the host's screen and is other than it was (save.js EDO), written by the host
// when the machines stand still (net.js stKeep) and read by whoever comes in, after the base and the record:
//   few cells (STSMALL)   lines of the settings   E^h^cells^L^comparators   E^p^piece ...
//   more                  a list of the pool      S^id^cells^when^L, the comparators, the pieces
// a piece: BASEPC cells of ten letters as a base's; the comparators: x,y,z,world,output;... (- none); L: how many
// numbers the record held then - what the record got after is newer than the state and is read after it.
// the list of the pool that is the state of the server whose header is in sh* (0: none)
function stOf() {
  let s = 1, r = 0, pre = `S^${shId}^`, n = 0;
  n = strlen(pre);
  while (s <= NBASE) { if (r == 0) { if (baseLen(s) >= 2) { if (substr(baseItem(s, 1), 1, n) == pre) { r = s; } } } s = s + 1; }
  return r;
}
// where that state is (after metaRead of the server): stSlot the list of the pool or 0 (the settings' lines), stL,
// stCells, stCmpS the comparators; 1 when there is one
function stHead() {
  let r = 0;
  stSlot = stOf(); stL = 0; stCells = 0; stCmpS = '-';
  if (stSlot > 0) {
    splitBy(baseItem(stSlot, 1), '^');
    if (SPL.length >= 5) { stCells = SPL[3] * 1; stL = SPL[5] * 1; stCmpS = baseItem(stSlot, 2); r = 1; } else { stSlot = 0; }
  } else {
    if (MEV.length > 0) { splitBy(MEV[1], '^'); if (SPL.length >= 5) { if (SPL[2] == 'h') { stCells = SPL[3] * 1; stL = SPL[4] * 1; stCmpS = SPL[5]; r = 1; } } }
  }
  return r;
}
// its cells (after stHead): into the log as the engine's own (how 0; 2: only where this screen has them not made),
// or onto a map's text (1)
function stApply(how) {
  let p = 3, n = 0;
  stWorld = 1;
  if (stSlot > 0) { n = baseLen(stSlot); while (p <= n) { baseCells(baseItem(stSlot, p), how); p = p + 1; } }
  else { p = 2; while (p <= MEV.length) { if (substr(MEV[p], 1, 4) == 'E^p^') { baseCells(substr(MEV[p], 5, strlen(MEV[p])), how); } p = p + 1; } }
  stWorld = 0;
}
// its comparators' outputs in place of what the game holds (after the map's own: mapMore)
function stCmp() {
  if (stCmpS != '-') {
    MPQ = []; mapNums(stCmpS, 4);
    CMX = []; CMY = []; CMZ = []; CMD = []; CML = [];
    let q = 1;
    while (q + 4 <= MPQ.length) { CMX.push(MPQ[q]); CMY.push(MPQ[q + 1]); CMZ.push(MPQ[q + 2]); CMD.push(MPQ[q + 3]); CML.push(MPQ[q + 4]); q = q + 5; }
    MPQ = [];
  }
}
// a new server k from the map (menu.js serverSave, after srvCreate: its seed and kind were the map's)
function mapToServer(k) {
  shGen = GENV; shBoss = mpBoss;
  NEW = [];
  let i = 1, big = 0;
  if (mpNE > BASEMIN) { big = 1; }
  if (big == 0) { while (i + 4 <= MPE.length) { NEW.push(MPE[i]); NEW.push(MPE[i + 1]); NEW.push(MPE[i + 2]); NEW.push(MPE[i + 3]); NEW.push(MPE[i + 4]); i = i + 5; } }
  if (NEW.length == 0) { edGone(); }
  editsPut(k);
  if (big == 1 || mpX != '-') { if (mpBase > 0) { mpId = shId; baseWrite(mpBase, big); } }
  mapPairs(mpC);
  i = 1;
  while (i + 1 <= MPI.length) { MCK.push(MPI[i]); MCD.push(MPI[i + 1]); i = i + 2; }
  mapPairs(mpS);
  i = 1;
  while (i + 1 <= MPI.length) { MSK.push(MPI[i]); MST.push(netClean(MPI[i + 1])); i = i + 2; }
  skFromMap();
  metaWrite(k);
  NEW = []; mpOn = 0; MPE = []; MPK = []; MPA = []; MPI = [];
}
