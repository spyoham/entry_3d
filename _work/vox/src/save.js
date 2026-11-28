// ===================================================================== keeping a world (v2.1)
// The save manager's way (tessvm, and the Entry Save Manager extension on playentry): every global
// whose entry name starts with @ is kept between runs, calling the empty function @저장 writes them
// out (@비동기저장 without waiting), and @확장프로그램 is 1 while that can be done. (In EJS the
// names are AT_..., see ejs.mjs.) The world is kept as its seed and what was changed in it (the ED*
// log, made short first: one entry a cell), with the player, the inventory, the chests, furnaces,
// signs, command blocks, the time, the weather, the game rules and the progress.
// Five worlds can be kept, @세계1..5, each one list in one order (svWrite into SVB, then copied
// into its place; loadGame reads it back): BW22, its name, the mode, when it was last played, then
// the world. (@블록월드 was the one world of before: moved into @세계1 once.)
let AT_블록월드 = [];
let AT_세계1 = [], AT_세계2 = [], AT_세계3 = [], AT_세계4 = [], AT_세계5 = [];
let AT_확장프로그램 = 0;
function AT_저장() { }
function AT_비동기저장() { }
let SVB = [];
let svP = 0, svDim = 0, svX = 0, svY = 0, svZ = 0, svYaw = 0, svPitch = 0, saveT = 0, saveMsgT = 0;
let SVTAG = 'BW22', worldCur = 0, worldName = '새 세계';
const NWORLD = 5;

function svN(v) { SVB.push(v); }
function rdN() { svP = svP + 1; return SVB[svP - 1]; }
function M_svL(L) { svN(L.length); let q = 1; while (q <= L.length) { svN(L[q]); q = q + 1; } }
function M_rdL(L) { L = []; let nn = rdN(), q = 0; while (q < nn) { L.push(rdN()); q = q + 1; } }
function M_fromW(L) { SVB = []; let q = 1; while (q <= L.length) { SVB.push(L[q]); q = q + 1; } }
function M_toW(L) { L = []; let q = 1; while (q <= SVB.length) { L.push(SVB[q]); q = q + 1; } }
// world k into SVB / SVB into world k / world k emptied
function worldGet(k) { if (k == 1) { M_fromW(AT_세계1); } if (k == 2) { M_fromW(AT_세계2); } if (k == 3) { M_fromW(AT_세계3); } if (k == 4) { M_fromW(AT_세계4); } if (k == 5) { M_fromW(AT_세계5); } }
function worldPut(k) { if (k == 1) { M_toW(AT_세계1); } if (k == 2) { M_toW(AT_세계2); } if (k == 3) { M_toW(AT_세계3); } if (k == 4) { M_toW(AT_세계4); } if (k == 5) { M_toW(AT_세계5); } }
function worldClear(k) { if (k == 1) { AT_세계1 = []; } if (k == 2) { AT_세계2 = []; } if (k == 3) { AT_세계3 = []; } if (k == 4) { AT_세계4 = []; } if (k == 5) { AT_세계5 = []; } }
// a world's header (wName wMode wDate): is it there
let wName = '', wMode = 0, wDate = '', wSeed = 0, wFlat = '-';
function worldHead(k) {
  let r = 0, a = '', n = 0;
  if (k == 1) { n = AT_세계1.length; if (n >= 5) { a = AT_세계1[1]; wName = AT_세계1[2]; wMode = AT_세계1[3]; wDate = AT_세계1[4]; wSeed = AT_세계1[5]; } }
  if (k == 2) { n = AT_세계2.length; if (n >= 5) { a = AT_세계2[1]; wName = AT_세계2[2]; wMode = AT_세계2[3]; wDate = AT_세계2[4]; wSeed = AT_세계2[5]; } }
  if (k == 3) { n = AT_세계3.length; if (n >= 5) { a = AT_세계3[1]; wName = AT_세계3[2]; wMode = AT_세계3[3]; wDate = AT_세계3[4]; wSeed = AT_세계3[5]; } }
  if (k == 4) { n = AT_세계4.length; if (n >= 5) { a = AT_세계4[1]; wName = AT_세계4[2]; wMode = AT_세계4[3]; wDate = AT_세계4[4]; wSeed = AT_세계4[5]; } }
  if (k == 5) { n = AT_세계5.length; if (n >= 5) { a = AT_세계5[1]; wName = AT_세계5[2]; wMode = AT_세계5[3]; wDate = AT_세계5[4]; wSeed = AT_세계5[5]; } }
  if (n > 10) { if (a == SVTAG) { r = 1; } }
  // the kind of world: the last two items
  wFlat = '-';
  if (r == 1) {
    if (k == 1) { if (AT_세계1[n - 1] == 'FLAT') { wFlat = AT_세계1[n]; } }
    if (k == 2) { if (AT_세계2[n - 1] == 'FLAT') { wFlat = AT_세계2[n]; } }
    if (k == 3) { if (AT_세계3[n - 1] == 'FLAT') { wFlat = AT_세계3[n]; } }
    if (k == 4) { if (AT_세계4[n - 1] == 'FLAT') { wFlat = AT_세계4[n]; } }
    if (k == 5) { if (AT_세계5[n - 1] == 'FLAT') { wFlat = AT_세계5[n]; } }
  }
  return r;
}
function worldFree() {
  let k = 1, r = 0;
  while (k <= NWORLD) { if (r == 0) { if (worldHead(k) == 0) { r = k; } } k = k + 1; }
  return r;
}
// the one world of before: into @세계1 (or the first free place)
function worldMigrate() {
  if (AT_블록월드.length > 10) { if (AT_블록월드[1] == 'BW21') {
    let k = worldFree();
    if (k > 0) {
      SVB = [];
      SVB.push(SVTAG); SVB.push('내 세계'); SVB.push(AT_블록월드[4]); SVB.push('');
      let q = 2;
      while (q <= AT_블록월드.length) { SVB.push(AT_블록월드[q]); q = q + 1; }
      worldPut(k);
      AT_블록월드 = [];
      if (canSave() == 1) { svPut(0); }
    }
  } }
}
function dateText() { return `${dateYear()}.${dateMonth()}.${dateDay()} ${dateHour()}:${padN(dateMin(), 2)}`; }
// is there a world kept (any)
function svHas() {
  let r = 0, k = 1;
  while (k <= NWORLD) { if (worldHead(k) == 1) { r = 1; } k = k + 1; }
  return r;
}
function canSave() {
  let r = 0;
  if (AT_확장프로그램 == 1) { r = 1; }
  return r;
}
// ((v3.0) tessvm writes every @ name at once, and puts back what its storage answered when the
// work starts - an answer that does not come (the extension's worker slow to wake: 5 s, the
// extension updated under an open page) is taken as nothing kept, the @ lists stay empty, and the
// next write of anything (a server's copy, the bans' copy 20 s after Entry Sync is on, a new world)
// wrote those empty lists over every world kept. The game cannot ask again nor tell such a start
// from a first one, so: svSeen, looked at in the first tick - 1 something came back, 0 nothing
// (a first start, or the answer lost). With 0 nothing is written on its own (the copies, the
// timer) until the player has seen the title's word about it and gone on (a new world, a server).
// @저장표 is 1 in every write, so even a store holding only empty lists reads as kept.
let AT_저장표 = 0;
let svSeen = 0 - 1;
function svLook() {
  if (svSeen < 0) {
    svSeen = 0;
    if (AT_저장표 == 1) { svSeen = 1; }
    if (AT_블록월드.length > 0 || AT_세계1.length > 0 || AT_세계2.length > 0 || AT_세계3.length > 0 || AT_세계4.length > 0 || AT_세계5.length > 0) { svSeen = 1; }
    if (AT_서버백업.length > 0 || AT_전체차단.length > 0 || AT_차단표시.length > 0) { svSeen = 1; }
  }
}
// the player went on past the word: writing is theirs now
function svAck() { if (svSeen == 0) { svSeen = 2; } }
// may the game write on its own (a copy, the timer)
function svAuto() {
  let r = 0;
  if (canSave() == 1 && svSeen > 0) { r = 1; }
  return r;
}
// a write: waiting for it (1) or not (0)
function svPut(wait) {
  AT_저장표 = 1;
  if (wait == 1) { AT_저장(); } else { AT_비동기저장(); }
}

// ---------------------------------------------------------------- the log of changes, by chunk
// A chunk made again puts back only its own entries: EDN[k] is the entry before k in the same
// chunk, and the newest one of each chunk is found by a hash of the chunk (EKK key, EKV entry).
// (Going through the whole log for every chunk was 20 ms a tick at 60000 entries, then 390.)
let EDN = [], EKK = [], EKV = [], EKU = [], EKN = 8192, RPS = [], rpGen = 0, edNext = 20000, rpParts = 0;
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
// (v3.5, 11-26) A cell's entry is found by the cell (ECK the cell's key, 0 a free place; ECV its newest entry;
// ECN places, used while the log has fewer than ECMAX entries): a cell changed again takes its entry's place
// whenever it was last changed. It was looked for among the last 48 entries of its chunk - enough for a clock
// and a few lamps; in a machine of thousands of parts a chunk the next change of a cell was never among them, the
// log grew by an entry for every switch and was made short again every few sums (a sixth of the time a
// calculator of 58,000 blocks took to add).
// ((11-26) a cell's place is not its key mod ECN: the key is 256 times the column's number plus the height, so every
// cell of one height fell into 512 of the 131,072 places - a floor of 3,600 blocks, a map's slab, did not fit within
// the 64 tries and each of its cells was written as a new entry at every change. The column's number plus a
// multiple of the height spreads them.)
// ((11-28) edDup: an entry may have been written for a cell that has one already - only then is there anything to
// make short. With the cells' table on no cell is written twice, and a world of 58,000 changed blocks was gone
// through twice at every save, a save every two minutes: seconds each on the page.)
let ECK = [], ECV = [], ECN = 131072, ECMAX = 90000, ecOn = 0, edDup = 1;
// (v3.5, 11-28) On a server the spark engine's own changes were in nobody's record (the circuits run on every
// screen: net.js netEdit) - a machine was, for whoever came back to an empty server, as its map or its builder's
// hands had left it: the number typed into a calculator gone, and with the pistons alone written down (the piston
// log of v3.2) a machine left at work came back broken. EDO, by the log's entries while on a server: the block a
// cell had before the engine first changed it (-1: it had no entry; -2: the engine has not changed it). A cell
// written by anyone's hand, or read from the server's record, is nobody's but theirs again (-2). The host writes
// the cells that are other than they were into the server's state when its machines stand still (net.js stKeep);
// stWorld: what is written now is the engine's (power.js rsStep) or that state being read; stDirty: something of
// it changed since it was last written.
let EDO = [], stWorld = 0, stDirty = 0;
function edPush(x, y, z, b) {
  let k = 0, n = 0, f = 0, key = hsKey(x, y, z) + dim * 4000000000000, h = mod((x + 60000) * 120000 + z + 60000 + y * 2731 + dim * 7919, ECN) + 1, go = 1;
  if (ecOn == 1) {
    while (go == 1 && n < 64) {
      if (ECK[h] == 0) { go = 0; }
      else { if (ECK[h] == key) { f = ECV[h]; go = 0; } else { h = h + 1; if (h > ECN) { h = 1; } n = n + 1; } }
    }
  } else {
    // (v2.4.3) a cell changed again soon (a spark clock, a lamp, a door): its newest entry, among the
    // chunk's last few, takes the new block; replay takes each cell's newest entry anyway, so it reads the same
    edSlot(edKey(idiv(x, 16), idiv(z, 16)), 0);
    if (ekAt > 0) { k = EKV[ekAt]; }
    while (k > 0 && n < 48 && f == 0) {
      if (EDX[k] == x && EDY[k] == y && EDZ[k] == z && EDD[k] == dim) { f = k; }
      k = EDN[k]; n = n + 1;
    }
  }
  if (f > 0) {
    if (netSrv > 0) {
      if (stWorld == 1) { if (EDO[f] == 0 - 2) { EDO[f] = EDB[f]; } stDirty = 1; }
      else { if (EDO[f] != 0 - 2) { EDO[f] = 0 - 2; stDirty = 1; } }
    }
    EDB[f] = b;
  }
  else {
    EDX.push(x); EDY.push(y); EDZ.push(z); EDB.push(b); EDD.push(dim); EDN.push(0);
    if (netSrv > 0) { if (stWorld == 1) { EDO.push(0 - 1); stDirty = 1; } else { EDO.push(0 - 2); } }
    edLink(EDX.length);
    // (its place among the cells: the free one the search ended at)
    if (ecOn == 1) { if (go == 0) { ECK[h] = key; ECV[h] = EDX.length; } else { edDup = 1; } if (EDX.length >= ECMAX) { ecOn = 0; } }
    else { edDup = 1; }
  }
}
// the whole index again (a new world, the log made short, a kept world read)
function edIndex() {
  // (whoever filled the log may have written a cell twice: edCompact, which has not, says so after)
  edDup = 1;
  if (EKU.length == 0) { let i = 0; while (i < EKN) { EKK.push(0); EKV.push(0); EKU.push(0); i = i + 1; } }
  else { let i = 1; while (i <= EKN) { EKU[i] = 0; i = i + 1; } }
  EDN = [];
  let k = 1;
  while (k <= EDX.length) { EDN.push(0); edLink(k); k = k + 1; }
  // ((11-26) and each cell's newest entry by the cell)
  if (ECK.length == 0) { let i = 0; while (i < ECN) { ECK.push(0); ECV.push(0); i = i + 1; } }
  else { let i = 1; while (i <= ECN) { if (ECK[i] != 0) { ECK[i] = 0; } i = i + 1; } }
  ecOn = 0;
  if (EDX.length < ECMAX) {
    ecOn = 1;
    let d0 = dim;
    k = 1;
    while (k <= EDX.length) {
      let key = hsKey(EDX[k], EDY[k], EDZ[k]) + EDD[k] * 4000000000000, h = mod((EDX[k] + 60000) * 120000 + EDZ[k] + 60000 + EDY[k] * 2731 + EDD[k] * 7919, ECN) + 1, go = 1, n = 0;
      while (go == 1 && n < 64) {
        if (ECK[h] == 0) { ECK[h] = key; ECV[h] = k; go = 0; }
        else { if (ECK[h] == key) { ECV[h] = k; go = 0; } else { h = h + 1; if (h > ECN) { h = 1; } n = n + 1; } }
      }
      k = k + 1;
    }
    dim = d0;
  }
}
// a chunk just made gets its changes back: newest first, each cell once
function edReplay(cx, cz) {
  if (EDN.length != EDX.length) { edIndex(); }
  if (RPS.length == 0) { let i = 0; while (i < 256 * WY) { RPS.push(0); i = i + 1; } }
  edSlot(edKey(cx, cz), 0);
  rpParts = 0;
  if (ekAt > 0) {
    rpGen = rpGen + 1;
    let k = EKV[ekAt];
    while (k > 0) {
      let c = (mod(EDX[k], 16) * 16 + mod(EDZ[k], 16)) * WY + EDY[k] + 1;
      if (RPS[c] != rpGen) {
        RPS[c] = rpGen; W[(mod(EDX[k], WS) * WS + mod(EDZ[k], WS)) * WY + EDY[k] + 1] = EDB[k];
        // (v2.3.1) a spark part: looked at again once the world goes on - what was due later (a
        // clock's next switch) is not kept, and nothing asked the parts again, so a clock stood still
        // ((v3.5, 11-26) once the chunks round this one have come: world.js sparkReady, edReview)
        if (BRS[EDB[k] + 1] > 0) { rpParts = 1; }
        // (v2.3.2) and the liquid by it flows again (what flows is not in the log)
        fluidReplay(EDX[k], EDY[k], EDZ[k]);
        // ((v3.4, 11-21) a hopper works by its store, made when it is put (je.js) - a hopper that came with a pasted
        // map or a server's record had none (an empty one is in no text), and stood dead: every machine of the
        // example map made from its text, and of any server once everybody had left)
        if (BKIND[EDB[k] + 1] == I_hopper) { if (EDD[k] == dim) { chestAt(EDX[k], EDY[k], EDZ[k]); } }
      }
      k = EDN[k];
    }
  }
}

// (v3.5, 11-26) the parts of a chunk put back, looked at (each cell of the log once; what is there now)
function edReview(cx, cz) {
  edSlot(edKey(cx, cz), 0);
  if (ekAt > 0) {
    rpGen = rpGen + 1;
    let k = EKV[ekAt];
    while (k > 0) {
      let c = (mod(EDX[k], 16) * 16 + mod(EDZ[k], 16)) * WY + EDY[k] + 1;
      if (RPS[c] != rpGen) {
        RPS[c] = rpGen;
        if (BRS[W[(mod(EDX[k], WS) * WS + mod(EDZ[k], WS)) * WY + EDY[k] + 1] + 1] > 0) { rsNotify(EDX[k], EDY[k], EDZ[k], 4); }
      }
      k = EDN[k];
    }
  }
}

// ---------------------------------------------------------------- the log of changes made short
// (the last change of each cell is what counts; redstone and water write the same cells over and over)
let EHK = [], EHG = [], EHV = [], ehGen = 0, EHN = 65536;
function edCompact() {
  if (edDup == 1) { edCompactDo(); } else { edNext = Math.max(20000, EDX.length * 2); }
}
function edCompactDo() {
  let n = EDX.length, k = 1, used = 0, eo = 0;
  // ((11-28) on a server: what the engine changed goes along with its entry)
  if (EDO.length == n) { eo = 1; }
  // ((11-28) the table at least twice the log: it was 65,536 places whatever the log - a log of more cells than
  // that found no place for the rest and DROPPED them (a map of 90,000 blocks kept as a world lost a third at its
  // first save), and near that many it went round the table for every entry)
  while (EHN < n * 2) { EHN = EHN * 2; }
  while (EHK.length < EHN) { EHK.push(0); EHG.push(0); EHV.push(0); }
  ehGen = ehGen + 1;
  // the last place of each cell
  while (k <= n) {
    let key = hsKey(EDX[k], EDY[k], EDZ[k]) + EDD[k] * 4000000000000, h = mod((EDX[k] + 60000) * 120000 + EDZ[k] + 60000 + EDY[k] * 2731 + EDD[k] * 7919, EHN) + 1, go = 1, t = 0;
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
    let key = hsKey(EDX[k], EDY[k], EDZ[k]) + EDD[k] * 4000000000000, h = mod((EDX[k] + 60000) * 120000 + EDZ[k] + 60000 + EDY[k] * 2731 + EDD[k] * 7919, EHN) + 1, go = 1, t = 0, last = 0;
    while (go == 1 && t < EHN) {
      if (EHG[h] != ehGen) { go = 0; }
      else { if (EHK[h] == key) { last = EHV[h]; go = 0; } else { h = h + 1; if (h > EHN) { h = 1; } t = t + 1; } }
    }
    if (last == k) {
      w = w + 1;
      EDX[w] = EDX[k]; EDY[w] = EDY[k]; EDZ[w] = EDZ[k]; EDB[w] = EDB[k]; EDD[w] = EDD[k];
      if (eo == 1) { EDO[w] = EDO[k]; }
    }
    k = k + 1;
  }
  while (EDX.length > w) { EDX.removeAt(EDX.length); EDY.removeAt(EDY.length); EDZ.removeAt(EDZ.length); EDB.removeAt(EDB.length); EDD.removeAt(EDD.length); }
  if (eo == 1) { while (EDO.length > w) { EDO.removeAt(EDO.length); } }
  edIndex();
  edDup = 0;
  // (made short again when it has doubled: many cells really changed do not make it short)
  edNext = Math.max(20000, w * 2);
}

// ---------------------------------------------------------------- writing
function svWrite() {
  edCompact();
  SVB = [];
  svN(SVTAG); svN(worldName); svN(gameMode); svN(dateText()); svN(seed); svN(seedText); svN(gameMode); svN(defMode); svN(difficulty);
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
  // ((v2.7) cakes, composters, anchors; leaves a player put - before CHEAT / FLAT, which the list of
  // worlds reads from the end)
  svN('JE27'); M_svL(KVX); M_svL(KVY); M_svL(KVZ); M_svL(KVK); M_svL(KVV); M_svL(LPX); M_svL(LPY); M_svL(LPZ);
  // (v2.3: the kind of world; read from the end for the list)
  // ((v2.8) world edit on or off in this world)
  svN('WEDIT'); svN(weSingle);
  // ((v3.0) the tamed and the built keepers)
  // ((v3.2) with the living ones to keep, for the writing only; the rest of what a kept mob is, the chunks
  // whose animals were made, the kind of the land)
  let kn = KPT.length;
  keptAll(0); svN('PETS'); M_svL(KPT); M_svL(KPX); M_svL(KPY); M_svL(KPZ); M_svL(KPH); M_svL(KPO); M_svL(KPV); M_svL(KPS); M_svL(KPD);
  svN('KEPT'); M_svL(KPG); M_svL(KPC); M_svL(CAK); svN(genVer);
  while (KPT.length > kn) { petsDel(KPT.length); }
  svN('CHEAT'); svN(cheatsOn);
  // ((v3.5, 11-26) what a map brought over came with: the place its cells are hashed at, the chunks kept made)
  // (before FLAT: the list of worlds looks for that one at the very end - worldHead)
  svN('HASH'); svN(hoX); svN(hoY); svN(hoZ);
  svN('MIRX'); svN(hoM);
  svN('KEEP'); M_svL(KCX); M_svL(KCZ);
  svN('FLAT'); svN(flatKept());
  worldPut(worldCur);
}
// wait 1: until it is written (the menu); 0: it goes on its own (the timer)
function saveGame(wait) {
  if (canSave() == 1 && netSrv == 0 && worldCur > 0) {
    if (gState == 2 && dead == 0) {
      svWrite();
      svPut(wait);
      saveT = 0;
      msgShow(`세계를 저장했습니다 (바꾼 블록 ${EDX.length}개)`, 2);
    }
  } else { if (netSrv == 0) { msgShow('저장할 수 없습니다: tessvm(또는 엔트리 저장 관리자 확장)에서 실행해야 합니다', 3); } }
}
// every five minutes on its own, and the log made short when it grows long
function saveStep(dt) {
  saveT = saveT + dt;
  if (saveT > 120) { saveT = 0; if (svAuto() == 1) { if (netSrv == 0) { saveGame(0); } } }
  if (EDX.length > edNext) { edCompact(); }
}

// ---------------------------------------------------------------- reading: the kept world again
function loadGame(k) {
  worldGet(k); worldCur = k; svSeen = 1;
  svP = 2;
  worldName = rdN(); svP = svP + 2;
  let s = rdN();
  seedText = rdN();
  gameMode = rdN(); defMode = rdN();
  thingsInit();
  genStart(s);
  // ((11-28) what the spark engine had yet to do is this world's only if it is the one just left and kept: power.js rsWorldNew)
  if (rsOwn != k) { rsWorldNew(); }
  rsOwn = 0;
  genPhase = 0; genVer = 0;
  difficulty = rdN();
  svDim = rdN(); svX = rdN(); svY = rdN(); svZ = rdN(); svYaw = rdN(); svPitch = rdN(); flying = rdN();
  hp = rdN(); food = rdN(); sat = rdN(); air = rdN(); xpPts = rdN(); xpLevel = rdN();
  tday = rdN(); dayN = rdN(); gameTicks = rdN(); wthr = rdN(); wthrT = rdN();
  spawnX = rdN(); spawnY = rdN(); spawnZ = rdN(); spawnDim = rdN(); spawnSet = rdN();
  lodeOn = rdN(); lodeX = rdN(); lodeZ = rdN(); anchorCh = rdN(); bossDead = rdN(); bossWake = rdN(); hotSel = rdN(); viewWant = rdN();
  M_rdL(INVI); M_rdL(INVN); M_rdL(INVD);
  M_rdL(GRV); M_rdL(EFT); M_rdL(EFL);
  // ((v2.9) a save from before has 12 effects: 14 now)
  while (EFT.length < 27) { EFT.push(0); } while (EFL.length < 27) { EFL.push(0); }
  // ((v3.3) a save from before has 40 slots: the other hand is the 41st)
  while (INVI.length < 41) { INVI.push(0); INVN.push(0); INVD.push(0); }
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
  flatOn = 0; cheatsOn = 1; weSingle = 1;
  keepClear(); hashSet(0, 0, 0, 0);
  KVX = []; KVY = []; KVZ = []; KVK = []; KVV = []; LPX = []; LPY = []; LPZ = [];
  petsClear();
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'JE27') { svP = svP + 2; M_rdL(KVX); M_rdL(KVY); M_rdL(KVZ); M_rdL(KVK); M_rdL(KVV); M_rdL(LPX); M_rdL(LPY); M_rdL(LPZ); svP = svP - 1; } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'WEDIT') { svP = svP + 2; weSingle = rdN(); svP = svP - 1; } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'PETS') { svP = svP + 2; M_rdL(KPT); M_rdL(KPX); M_rdL(KPY); M_rdL(KPZ); M_rdL(KPH); M_rdL(KPO); M_rdL(KPV); M_rdL(KPS); M_rdL(KPD); svP = svP - 1; } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'KEPT') { svP = svP + 2; M_rdL(KPG); M_rdL(KPC); M_rdL(CAK); genVer = rdN(); svP = svP - 1; } }
  while (KPG.length < KPT.length) { KPG.push(0); } while (KPC.length < KPT.length) { KPC.push(0); }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'CHEAT') { svP = svP + 2; cheatsOn = rdN(); svP = svP - 1; } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'HASH') { svP = svP + 2; hoX = rdN(); hoY = rdN(); hoZ = rdN(); svP = svP - 1; } }
  // ((11-28) the map was put down mirrored)
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'MIRX') { svP = svP + 2; hashSet(hoX, hoY, hoZ, rdN()); svP = svP - 1; } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'KEEP') {
    svP = svP + 2;
    let kn = rdN(), kq = 0;
    MPQ = [];
    while (kq < kn) { MPQ.push(rdN()); kq = kq + 1; }
    kn = rdN(); kq = 0;
    while (kq < kn) { keepAdd(MPQ[kq + 1], rdN()); kq = kq + 1; }
    MPQ = [];
    svP = svP - 1;
  } }
  if (svP + 2 <= SVB.length) { if (SVB[svP + 1] == 'FLAT') { svP = svP + 2; let fbad = flatSet(rdN()); svP = svP - 1; } }
  // ((v3.4) every world has the land of this version, whatever it was made with (the user: the old lands are
  // not kept); where it begins, for one who dies without a bed
  // ((v3.5) and one made in the world 128 high has what was built in it moved up with the land: landup.js)
  genOld = 0; if (genVer < GENV) { genOld = 1; if (GENV >= 3) { worldUp(); } }
  genVer = GENV;
  genCentre();
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
  petsRestore();
  if (dim == 2) { if (bossDead == 0) { bossSpawn(); } }
  msgShow('저장한 세계로 돌아왔습니다', 3);
  if (genOld == 1) { genOld = 0; msgShow('v3.5 전에 만든 세계입니다 - 세계가 256칸 높이가 되어 지은 것을 땅과 함께 33칸 위로 옮겼습니다', 8); }
}
