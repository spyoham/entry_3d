// ===================================================================== keeping a world (v2.1)
// The save manager's way (tessvm, and the Entry Save Manager extension on playentry): every global
// whose entry name starts with @ is kept between runs, calling the empty function @저장 writes them
// out (@비동기저장 without waiting), and @확장프로그램 is 1 while that can be done. (In EJS the
// names are AT_..., see ejs.mjs.) The world is kept as its seed and what was changed in it (the ED*
// log, made short first: one entry a cell), with the player, the inventory, the chests, furnaces,
// signs, command blocks, the time, the weather, the game rules and the progress.
// Everything goes into one list, @블록월드, in one order (svWrite), and comes back in it (svRead).
let AT_블록월드 = [];
let AT_확장프로그램 = 0;
function AT_저장() { }
function AT_비동기저장() { }
let svP = 0, svDim = 0, svX = 0, svY = 0, svZ = 0, svYaw = 0, svPitch = 0, saveT = 0, saveMsgT = 0;
let SVTAG = 'BW21';

function svN(v) { AT_블록월드.push(v); }
function rdN() { svP = svP + 1; return AT_블록월드[svP - 1]; }
function M_svL(L) { svN(L.length); let q = 1; while (q <= L.length) { svN(L[q]); q = q + 1; } }
function M_rdL(L) { L = []; let nn = rdN(), q = 0; while (q < nn) { L.push(rdN()); q = q + 1; } }

// is there a world kept
function svHas() {
  let r = 0;
  if (AT_블록월드.length > 10) { if (AT_블록월드[1] == SVTAG) { r = 1; } }
  return r;
}
function canSave() {
  let r = 0;
  if (AT_확장프로그램 == 1) { r = 1; }
  return r;
}

// ---------------------------------------------------------------- the log of changes, by chunk
// A chunk made again puts back only its own entries: EDN[k] is the entry before k in the same
// chunk, and the newest one of each chunk is found by a hash of the chunk (EKK key, EKV entry).
// (Going through the whole log for every chunk was 20 ms a tick at 60000 entries, then 390.)
let EDN = [], EKK = [], EKV = [], EKU = [], EKN = 8192, RPS = [], rpGen = 0, edNext = 20000;
function edKey(cx, cz) { return (cx + 50000) * 100000 + cz + 50000 + dim * 10000000000; }
// the place of a chunk's newest entry in EKV (made when `make` is 1)
let ekAt = 0;
function edSlot(key, make) {
  let h = mod(key, EKN) + 1, t = 0, go = 1;
  ekAt = 0;
  while (go == 1 && t < EKN) {
    if (EKU[h] == 0) { go = 0; if (make == 1) { EKU[h] = 1; EKK[h] = key; EKV[h] = 0; ekAt = h; } }
    else { if (EKK[h] == key) { ekAt = h; go = 0; } else { h = h + 1; if (h > EKN) { h = 1; } t = t + 1; } }
  }
}
function edLink(k) {
  let d0 = dim;
  dim = EDD[k];
  edSlot(edKey(idiv(EDX[k], 16), idiv(EDZ[k], 16)), 1);
  dim = d0;
  if (ekAt > 0) { EDN[k] = EKV[ekAt]; EKV[ekAt] = k; } else { EDN[k] = 0; }
}
function edPush(x, y, z, b) {
  EDX.push(x); EDY.push(y); EDZ.push(z); EDB.push(b); EDD.push(dim); EDN.push(0);
  edLink(EDX.length);
}
// the whole index again (a new world, the log made short, a kept world read)
function edIndex() {
  if (EKU.length == 0) { let i = 0; while (i < EKN) { EKK.push(0); EKV.push(0); EKU.push(0); i = i + 1; } }
  else { let i = 1; while (i <= EKN) { EKU[i] = 0; i = i + 1; } }
  EDN = [];
  let k = 1;
  while (k <= EDX.length) { EDN.push(0); edLink(k); k = k + 1; }
}
// a chunk just made gets its changes back: newest first, each cell once
function edReplay(cx, cz) {
  if (EDN.length != EDX.length) { edIndex(); }
  if (RPS.length == 0) { let i = 0; while (i < 256 * WY) { RPS.push(0); i = i + 1; } }
  edSlot(edKey(cx, cz), 0);
  if (ekAt > 0) {
    rpGen = rpGen + 1;
    let k = EKV[ekAt];
    while (k > 0) {
      let c = (mod(EDX[k], 16) * 16 + mod(EDZ[k], 16)) * WY + EDY[k] + 1;
      if (RPS[c] != rpGen) { RPS[c] = rpGen; W[(mod(EDX[k], WS) * WS + mod(EDZ[k], WS)) * WY + EDY[k] + 1] = EDB[k]; }
      k = EDN[k];
    }
  }
}

// ---------------------------------------------------------------- the log of changes made short
// (the last change of each cell is what counts; redstone and water write the same cells over and over)
let EHK = [], EHG = [], EHV = [], ehGen = 0, EHN = 65536;
function edCompact() {
  if (EHK.length == 0) { let i = 0; while (i < EHN) { EHK.push(0); EHG.push(0); EHV.push(0); i = i + 1; } }
  ehGen = ehGen + 1;
  let n = EDX.length, k = 1, used = 0;
  // the last place of each cell
  while (k <= n) {
    let key = hsKey(EDX[k], EDY[k], EDZ[k]) + EDD[k] * 1000000000000, h = mod(key, EHN) + 1, go = 1, t = 0;
    while (go == 1 && t < EHN) {
      if (EHG[h] != ehGen) { EHG[h] = ehGen; EHK[h] = key; EHV[h] = k; go = 0; used = used + 1; }
      else { if (EHK[h] == key) { EHV[h] = k; go = 0; } else { h = h + 1; if (h > EHN) { h = 1; } t = t + 1; } }
    }
    k = k + 1;
  }
  // kept in order: an entry stays when it is the last of its cell
  let w = 0;
  k = 1;
  while (k <= n) {
    let key = hsKey(EDX[k], EDY[k], EDZ[k]) + EDD[k] * 1000000000000, h = mod(key, EHN) + 1, go = 1, t = 0, last = 0;
    while (go == 1 && t < EHN) {
      if (EHG[h] != ehGen) { go = 0; }
      else { if (EHK[h] == key) { last = EHV[h]; go = 0; } else { h = h + 1; if (h > EHN) { h = 1; } t = t + 1; } }
    }
    if (last == k) {
      w = w + 1;
      EDX[w] = EDX[k]; EDY[w] = EDY[k]; EDZ[w] = EDZ[k]; EDB[w] = EDB[k]; EDD[w] = EDD[k];
    }
    k = k + 1;
  }
  while (EDX.length > w) { EDX.removeAt(EDX.length); EDY.removeAt(EDY.length); EDZ.removeAt(EDZ.length); EDB.removeAt(EDB.length); EDD.removeAt(EDD.length); }
  edIndex();
  // (made short again when it has doubled: many cells really changed do not make it short)
  edNext = Math.max(20000, w * 2);
}

// ---------------------------------------------------------------- writing
function svWrite() {
  edCompact();
  AT_블록월드 = [];
  svN(SVTAG); svN(seed); svN(seedText); svN(gameMode); svN(defMode); svN(difficulty);
  svN(dim); svN(px); svN(py); svN(pz); svN(yaw); svN(pitch); svN(flying);
  svN(hp); svN(food); svN(sat); svN(air); svN(xpPts); svN(xpLevel);
  svN(tday); svN(dayN); svN(gameTicks); svN(wthr); svN(wthrT);
  svN(spawnX); svN(spawnY); svN(spawnZ); svN(spawnDim); svN(spawnSet);
  svN(lodeOn); svN(lodeX); svN(lodeZ); svN(anchorCh); svN(bossDead); svN(bossWake); svN(hotSel); svN(viewWant);
  M_svL(INVI); M_svL(INVN); M_svL(INVD);
  M_svL(GRV); M_svL(EFT); M_svL(EFL);
  M_svL(EDX); M_svL(EDY); M_svL(EDZ); M_svL(EDB); M_svL(EDD);
  M_svL(SGX); M_svL(SGY); M_svL(SGZ); M_svL(SGT); M_svL(SGD);
  M_svL(CBX); M_svL(CBY); M_svL(CBZ); M_svL(CBT); M_svL(CBD);
  M_svL(LTX); M_svL(LTY); M_svL(LTZ); M_svL(LTT); M_svL(LTD);
  M_svL(CMX); M_svL(CMY); M_svL(CMZ); M_svL(CMD); M_svL(CML);
  M_svL(FUX); M_svL(FUY); M_svL(FUZ); M_svL(FUON); M_svL(FII); M_svL(FIN); M_svL(FFI); M_svL(FFN); M_svL(FOI); M_svL(FON); M_svL(FUB); M_svL(FUBM); M_svL(FUP); M_svL(FUF);
  // the chests in use (and shell boxes carried): their number, place and 27 slots
  let c = 1, nc = 0;
  while (c <= NCHEST) { if (CHON[c] > 0) { nc = nc + 1; } c = c + 1; }
  svN(nc);
  c = 1;
  while (c <= NCHEST) {
    if (CHON[c] > 0) {
      svN(c); svN(CHON[c]); svN(CHX[c]); svN(CHY[c]); svN(CHZ[c]);
      let k = 1;
      while (k <= 27) { let s = (c - 1) * 27 + k; svN(CHI[s]); svN(CHN[s]); svN(CHD[s]); k = k + 1; }
    }
    c = c + 1;
  }
  svN('END');
}
// wait 1: until it is written (the menu); 0: it goes on its own (the timer)
function saveGame(wait) {
  if (canSave() == 1) {
    if (gState == 2 && dead == 0) {
      svWrite();
      if (wait == 1) { AT_저장(); } else { AT_비동기저장(); }
      saveT = 0;
      msgShow(`세계를 저장했습니다 (바꾼 블록 ${EDX.length}개)`, 2);
    }
  } else { msgShow('저장할 수 없습니다: tessvm(또는 엔트리 저장 관리자 확장)에서 실행해야 합니다', 3); }
}
// every five minutes on its own, and the log made short when it grows long
function saveStep(dt) {
  saveT = saveT + dt;
  if (saveT > 300) { saveT = 0; if (canSave() == 1) { saveGame(0); } }
  if (EDX.length > edNext) { edCompact(); }
}

// ---------------------------------------------------------------- reading: the kept world again
function loadGame() {
  svP = 2;
  let s = rdN();
  seedText = rdN();
  gameMode = rdN(); defMode = rdN();
  thingsInit();
  genStart(s);
  genPhase = 0;
  difficulty = rdN();
  svDim = rdN(); svX = rdN(); svY = rdN(); svZ = rdN(); svYaw = rdN(); svPitch = rdN(); flying = rdN();
  hp = rdN(); food = rdN(); sat = rdN(); air = rdN(); xpPts = rdN(); xpLevel = rdN();
  tday = rdN(); dayN = rdN(); gameTicks = rdN(); wthr = rdN(); wthrT = rdN();
  spawnX = rdN(); spawnY = rdN(); spawnZ = rdN(); spawnDim = rdN(); spawnSet = rdN();
  lodeOn = rdN(); lodeX = rdN(); lodeZ = rdN(); anchorCh = rdN(); bossDead = rdN(); bossWake = rdN(); hotSel = rdN(); viewWant = rdN();
  M_rdL(INVI); M_rdL(INVN); M_rdL(INVD);
  M_rdL(GRV); M_rdL(EFT); M_rdL(EFL);
  grSync();
  M_rdL(EDX); M_rdL(EDY); M_rdL(EDZ); M_rdL(EDB); M_rdL(EDD);
  edIndex();
  M_rdL(SGX); M_rdL(SGY); M_rdL(SGZ); M_rdL(SGT); M_rdL(SGD);
  M_rdL(CBX); M_rdL(CBY); M_rdL(CBZ); M_rdL(CBT); M_rdL(CBD);
  M_rdL(LTX); M_rdL(LTY); M_rdL(LTZ); M_rdL(LTT); M_rdL(LTD);
  M_rdL(CMX); M_rdL(CMY); M_rdL(CMZ); M_rdL(CMD); M_rdL(CML);
  M_rdL(FUX); M_rdL(FUY); M_rdL(FUZ); M_rdL(FUON); M_rdL(FII); M_rdL(FIN); M_rdL(FFI); M_rdL(FFN); M_rdL(FOI); M_rdL(FON); M_rdL(FUB); M_rdL(FUBM); M_rdL(FUP); M_rdL(FUF);
  // the chests: all empty, then the kept ones
  CHX = []; CHY = []; CHZ = []; CHON = []; CHI = []; CHN = []; CHD = [];
  let i = 0;
  while (i < NCHEST) { CHX.push(0); CHY.push(0); CHZ.push(0); CHON.push(0); i = i + 1; }
  i = 0;
  while (i < NCHEST * 27) { CHI.push(0); CHN.push(0); CHD.push(0); i = i + 1; }
  let nc = rdN(), j = 0;
  while (j < nc) {
    let c = rdN();
    CHON[c] = rdN(); CHX[c] = rdN(); CHY[c] = rdN(); CHZ[c] = rdN();
    let k = 1;
    while (k <= 27) { let q = (c - 1) * 27 + k; CHI[q] = rdN(); CHN[q] = rdN(); CHD[q] = rdN(); k = k + 1; }
    j = j + 1;
  }
  curI = 0; curN = 0; curD = 0;
  FOC = 210; saveT = 0;
  // the world round the kept place is made (as when going between worlds), then arriveKept
  startTravel(svDim, svX, svZ, 6);
  helpT = 0;
}
// where the kept player stood (a little up if a block is there now)
function arriveKept() {
  px = svX; py = svY; pz = svZ; yaw = svYaw; pitch = svPitch; pvx = 0; pvy = 0; pvz = 0;
  let k = 0;
  solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3);
  while (solidHit == 1 && k < WY) { py = py + 1; k = k + 1; solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3); }
  dead = 0; uiMode = 0;
  if (dim == 2) { if (bossDead == 0) { bossSpawn(); } }
  msgShow('저장한 세계로 돌아왔습니다', 3);
}
