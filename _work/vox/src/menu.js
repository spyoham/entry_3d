// ===================================================================== the menus (v2.1)
// The title over a slowly turning world, then the screens the genre has: the worlds kept (play,
// make, rename, delete, make again), a new world, the servers (join, by name, add, edit, delete,
// look again), a server's settings, the settings, and a message (thrown out of a server ...).
// scr: 0 title, 1 worlds, 2 new world, 3 delete a world?, 4 servers, 5 a server's settings,
// 6 a server by name, 7 settings, 8 a message, 9 help.
let scr = 0, menuTick = 0 - 9, panoReady = 0, panoGen = 0, panoYaw = 30, panoY = 50, splash = '', splashT = 0;
let selW = 0, selS = 0, listTop = 0, cwName = '새 세계', cwMode = 0, cwSeedText = '', cwSeed = 0, cwFlat = 0, cwFlatSpec = 'bedrock,2*dirt,grass_block';
let esName = '', esMotd = '', esSeedText = '', esSeed = 0, esMode = 0, esEdit = 0, dcName = '', esFlat = 0, esFlatSpec = 'bedrock,2*dirt,grass_block';
let msgTitle = '', msgBody = '', msgBody2 = '', msgBack = 0, menuKeep = 0;
const PANOSEED = 1234;
let SPLASHES = ['엔트리로 만들었습니다!', '블록이 1784가지!', '이제 함께 놉니다!', '플러그인을 만들어 보세요!', '세 개의 세계!', '불꽃가루로 움직여요!', '저장도 됩니다!', 'tessvm 덕분에!', '닉네임이 곧 계정!', '탄성 블록 비행기!', '구조물이 20가지!', '심연과 공허!', '마을 사람과 거래!', '피스톤이 여섯 방향!', '네모난 세상!', '오늘도 캐러 갑니다!'];
let HELPL = ['W A S D 걷기 · 스페이스 점프 · Shift 웅크리기 · R 달리기', '클릭 부수기·공격 · F 놓기·쓰기 · Q 버리기 · E 소지품', '1~9·휠 손에 들 칸 · G 시야 · F3 정보 · P 메뉴 · C 블록 복사(크리에이티브)', 'T 채팅 · / 명령어 (한/영 한글 · Tab 자동완성 · ↑↓ 지난 줄)', '멀티플레이: Tab을 누르고 있으면 접속한 사람들', '서버 관리자는 /op /ban /kick /whitelist /server /plugin /perm', '플러그인: /plugin add 이름 이벤트 조건 대상 명령', '자세한 것은 설명서를 보세요'];

function titleFrame(dt) {
  if (tickN - menuTick > 3) { menuEnter(); }
  menuTick = tickN;
  menuFrame(dt);
}
// the title again: a new splash, the world behind made again
function menuEnter() {
  // (a message just put up stays: the title comes after it)
  if (menuKeep == 1) { menuKeep = 0; } else { scr = 0; }
  panoReady = 0; panoGen = 0; txClear(); mouseFree(); uiMode = 0;
  splash = SPLASHES[rand(1, SPLASHES.length)]; splashT = 0;
  worldMigrate();
  if (netSrv > 0) { netLeave(); }
}
function menuGo(n) { scr = n; txClear(); listTop = 0; menuKeep = 0; }
function menuMsg(t, b) {
  msgTitle = t; msgBody = b; msgBody2 = '';
  if (strlen(b) > 44) { msgBody = substr(b, 1, 44); msgBody2 = substr(b, 45, strlen(b)); }
  msgBack = 0; if (netOn == 1) { msgBack = 4; }
  menuGo(8); menuKeep = 1;
}

// ---------------------------------------------------------------- the world behind the title
function panoStep(dt) {
  if (panoGen == 0) {
    panoGen = 1;
    thingsInit(); flatOn = 0; genStart(PANOSEED); genPhase = 0; gameMode = 1;
    px = 8.5; pz = 8.5; py = 60; dead = 0; headWater = 0; inLava = 0;
    setView(viewWant); fogR = 0 - 99; ctPos = NCOL * 192;
  }
  if (panoReady == 0) {
    chunkWork(8);
    if (nChunks >= NSTART) { findTop(8, 8); panoY = Math.max(SEA, topY) + 14; panoReady = 1; }
  }
  if (panoReady == 1) {
    worldFlush(); chunkWork(1); remeshSome(8);
    panoYaw = panoYaw + dt * 2.5;
    tday = 0.28; dim = 0; dimAmb = 0; daySky();
    camX = 8.5; camY = panoY; camZ = 8.5; camYaw = panoYaw; camPitch = 0 - 10; FOC = 210;
    renderWorld();
  }
}

// ---------------------------------------------------------------- each frame of the menus
let scrWas = 0 - 1;
function menuFrame(dt) {
  // (a screen changed by any way: the words of the one before go)
  if (scr != scrWas) { txClear(); scrWas = scr; }
  eraseAll();
  if (scr == 0) { panoStep(dt); if (panoReady == 0) { dirtBack(14); } }
  else { if (panoReady == 1) { panoStep(dt); penAlpha(45); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0); } else { panoStep(dt); dirtBack(14); } }
  // (v2.4.5) one screen a frame: a button that opened another screen let the same click go on into
  // it (the servers' 편집 hit the edit screen's 완료 at once, 다시 만들기 its 취소, 작품 정보 the
  // message's button, 싱글플레이 / 멀티플레이 a row of the list)
  let sc = scr;
  if (sc == 0) { scrTitle(dt); }
  if (sc == 1) { scrWorlds(); }
  if (sc == 2) { scrNewWorld(); }
  if (sc == 3) { scrDelWorld(); }
  if (sc == 4) { scrServers(); }
  if (sc == 5) { scrServerEdit(); }
  if (sc == 6) { scrDirect(); }
  if (sc == 7) { scrOptions(); }
  if (sc == 8) { scrMessage(); }
  if (sc == 9) { scrHelp(); }
  if (sc == 10) { scrDelServer(); }
  clickLatch = 0;
  fillStop();
}
// a row's place: is the mouse in it
function inBox(x0, y0, x1, y1) { let r = 0, mx = mouseX(), my = mouseY(); if (mx >= x0 && mx <= x1 && my <= y0 && my >= y1) { r = 1; } return r; }
// a box one writes in (click: the answer box)
function field(x0, y0, x1, y1, txt, ti) {
  let hot = inBox(x0, y0, x1, y1), c = '#a0a0a0';
  if (hot == 1) { c = '#ffffff'; }
  box(x0, y0, x1, y1, c); box(x0 + 1, y0 - 1, x1 - 1, y1 + 1, '#000000');
  tx(ti, txt, x0 + 5, (y0 + y1) / 2 + 1, 9, '#e0e0e0', 1);
  return hot;
}
function title2(t) { tx(1, t, 0, 118, 11, '#ffffff', 0); }

// ---------------------------------------------------------------- 0 the title
function scrTitle(dt) {
  splashT = splashT + dt;
  // the name, with its shadow
  tx(2, '블록 월드', 3, 77, 32, '#1a1a1a', 0);
  tx(3, '블록 월드', 0, 80, 32, '#e8e8e8', 0);
  let sz = 9 + Math.abs(sind(splashT * 300)) * 1.5;
  tx(4, splash, 118, 52, sz, '#ffff40', 0);
  let on = 1;
  button(-100, 30, 100, 10, '싱글플레이', 5, 1); if (btnHot == 1) { if (clickLatch == 1) { worldMigrate(); selW = 0; menuGo(1); } }
  button(-100, 4, 100, -16, '멀티플레이', 6, 1); if (btnHot == 1) { if (clickLatch == 1) { netEnter(); selS = 0; menuGo(4); } }
  button(-100, -22, 100, -42, '도움말', 7, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(9); } }
  button(-100, -54, -2, -74, '설정...', 8, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(7); } }
  button(2, -54, 100, -74, '작품 정보', 9, 1); if (btnHot == 1) { if (clickLatch == 1) { menuMsg('블록 월드', `블록 ${NKINDS}종 · 생물 군계 26 · 구조물 20 · 몹 20 · 멀티플레이와 플러그인`); msgBack = 0; } }
  tx(10, `블록 월드 v${VERSION}`, -236, -128, 7, '#ffffff', 1);
  tx(11, '엔트리 · tessvm · Entry Sync', 236, -128, 7, '#ffffff', 2);
}

// ---------------------------------------------------------------- 1 the worlds kept
function scrWorlds() {
  title2('세계 선택');
  box(-200, 104, 200, -66, '#000000');
  let k = 1, row = 0, ti = 30;
  while (k <= NWORLD) {
    if (worldHead(k) == 1) {
      let y0 = 100 - row * 34, y1 = y0 - 32;
      let hot = inBox(-150, y0, 150, y1);
      if (selW == k) { box(-152, y0 + 2, 152, y1 - 2, '#a0a0a0'); box(-151, y0 + 1, 151, y1 - 1, '#000000'); }
      drawIcon(2, -134, (y0 + y1) / 2, 11);
      let md = '서바이벌';
      if (wMode == 1) { md = '크리에이티브'; } if (wMode == 2) { md = '모험'; } if (wMode == 3) { md = '관전자'; }
      tx(ti, `${wName}`, -112, y0 - 8, 9, '#ffffff', 1);
      let wk = `시드 ${wSeed}`; if (wFlat != '-') { wk = `평지 (${flatPresetName(wFlat)})`; }
      tx(ti + 1, `${wDate} · ${md} 모드 · ${wk}`, -112, y0 - 21, 7, '#a0a0a0', 1);
      ti = ti + 2;
      if (hot == 1) { if (clickLatch == 1) { if (selW == k) { worldPlay(); } else { selW = k; } } }
      row = row + 1;
    }
    k = k + 1;
  }
  while (ti < 42) { txOff(ti); ti = ti + 1; }
  if (row == 0) { tx(29, '저장한 세계가 없습니다. 새 세계를 만들어 보세요', 0, 40, 9, '#c0c0c0', 0); } else { txOff(29); }
  let has = 0; if (selW > 0) { has = worldHead(selW); }
  button(-154, -76, -4, -96, '선택한 세계 플레이', 2, has); if (btnHot == 1) { if (clickLatch == 1) { worldPlay(); } }
  button(4, -76, 154, -96, '새 세계 만들기', 3, 1); if (btnHot == 1) { if (clickLatch == 1) { cwName = '새 세계'; cwMode = 0; cwSeedText = ''; cwSeed = 0; cwFlat = 0; cwFlatSpec = FLPS[1]; cwCheats = 1; menuGo(2); } }
  button(-154, -102, -80, -122, '이름 바꾸기', 4, has); if (btnHot == 1) { if (clickLatch == 1) { worldRename(selW); } }
  button(-76, -102, -2, -122, '삭제', 5, has); if (btnHot == 1) { if (clickLatch == 1) { menuGo(3); } }
  button(2, -102, 76, -122, '다시 만들기', 6, has); if (btnHot == 1) { if (clickLatch == 1) { let wq = worldHead(selW); cwName = `${wName} 다시`; cwMode = wMode; cwSeed = wSeed; cwSeedText = `${wSeed}`; cwFlat = 0; if (wFlat != '-') { cwFlat = 1; cwFlatSpec = wFlat; } menuGo(2); } }
  button(80, -102, 154, -122, '취소', 7, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(0); } }
}
function worldPlay() {
  if (selW > 0) { if (worldHead(selW) == 1) { txClear(); loadGame(selW); } }
}
function worldRename(k) {
  if (worldHead(k) == 1) {
    ask('세계의 새 이름');
    ansS = answer();
    hideAnswer();
    if (strlen(ansS) > 0) { worldGet(k); SVB[2] = netClean(ansS); worldPut(k); if (canSave() == 1) { AT_비동기저장(); } }
  }
}

// ---------------------------------------------------------------- 2 a new world
function scrNewWorld() {
  title2('새 세계 만들기');
  tx(20, '세계 이름', -100, 92, 8, '#a0a0a0', 1);
  if (field(-100, 86, 100, 66, cwName, 21) == 1) { if (clickLatch == 1) { ask('세계 이름'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { cwName = netClean(ansS); } } }
  let md = '서바이벌';
  if (cwMode == 1) { md = '크리에이티브'; }
  button(-100, 60, -2, 40, `게임 모드: ${md}`, 22, 1); if (btnHot == 1) { if (clickLatch == 1) { cwMode = 1 - cwMode; } }
  let ch = '켬'; if (cwCheats == 0) { ch = '끔'; }
  button(2, 60, 100, 40, `명령어 허용: ${ch}`, 31, 1); if (btnHot == 1) { if (clickLatch == 1) { cwCheats = 1 - cwCheats; } }
  if (cwMode == 0) { tx(23, '자원을 모으고, 만들고, 살아남으세요', 0, 33, 7, '#a0a0a0', 0); } else { tx(23, '모든 블록을 마음껏, 날 수 있고 죽지 않습니다', 0, 33, 7, '#a0a0a0', 0); }
  tx(24, '세계의 시드 (비우면 무작위)', -100, 22, 8, '#a0a0a0', 1);
  gS = ' '; if (strlen(cwSeedText) > 0) { gS = cwSeedText; }
  if (field(-100, 16, 100, -4, gS, 25) == 1) { if (clickLatch == 1) { ask('시드 (숫자나 글자, 비우면 무작위)'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { cwSeedText = netClean(ansS); } else { cwSeedText = ''; } } }
  let wk = '기본 지형'; if (cwFlat == 1) { wk = '평지'; }
  button(-100, -10, 100, -30, `세계 종류: ${wk}`, 26, 1); if (btnHot == 1) { if (clickLatch == 1) { cwFlat = 1 - cwFlat; } }
  if (cwFlat == 1) {
    button(-100, -36, 100, -56, `평지 프리셋: ${flatPresetName(cwFlatSpec)}`, 28, 1); if (btnHot == 1) { if (clickLatch == 1) { cwFlatSpec = FLPS[flatNextPreset(cwFlatSpec)]; } }
    if (field(-100, -62, 100, -82, flatShort(cwFlatSpec), 29) == 1) { if (clickLatch == 1) { cwFlatSpec = flatAsk(cwFlatSpec); } }
    tx(30, '층은 아래부터 · 2*dirt 는 흙 두 층 · 칸을 눌러 직접 (한국어 이름도)', 0, -89, 6, '#a0a0a0', 0);
  } else { txOff(28); txOff(29); tx(30, '산과 강, 동굴과 광물, 마을과 구조물이 있는 세계', 0, -40, 7, '#a0a0a0', 0); }
  let k = worldFree();
  if (k == 0) { tx(27, `세계는 ${NWORLD}개까지 저장됩니다. 하나를 지우세요`, 0, -95, 7, '#ff8080', 0); } else { txOff(27); }
  if (menuErrT > 0) { menuErrT = menuErrT - 1; tx(27, menuErr, 0, -95, 7, '#ff8080', 0); }
  button(-154, -102, -4, -122, '새 세계 만들기', 2, 1); if (btnHot == 1) { if (clickLatch == 1) { worldNew(k); } }
  button(4, -102, 154, -122, '취소', 3, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(1); } }
}
// a seed from words (the same words give the same world)
function seedOf(a) {
  let h = 7, k = 1;
  while (k <= strlen(a)) { h = mod(h * 31 + indexOf(ASCII, charAt(a, k)) + 13, 99999989); k = k + 1; }
  let r = h + 1;
  if (strlen(a) > 0) { if (`${a * 1}` == a) { r = Math.max(1, Math.floor(Math.abs(a * 1))); } }
  return r;
}
// the layers typed into Entry's box (kept as they were when they are wrong)
function flatAsk(spec) {
  ask('평지 층, 아래부터 쉼표로 (예: bedrock,3*stone,2*dirt,grass_block · 한국어 이름도)');
  ansS = answer(); hideAnswer();
  let r = spec;
  if (strlen(ansS) > 0) {
    let t = netClean(ansS);
    if (flatParse(t) == 0) { r = t; } else { menuErr = flatErr; menuErrT = 240; }
  }
  return r;
}
let menuErr = '', menuErrT = 0;
function worldNew(k) {
  let ok = 1;
  if (cwFlat == 1) { if (flatSet(cwFlatSpec) == 1) { menuErr = flatErr; menuErrT = 240; ok = 0; } } else { flatOn = 0; }
  if (ok == 1) { worldMake(k); }
}
function worldMake(k) {
  cheatsOn = cwCheats;
  let s = rand(1, 99999999);
  if (strlen(cwSeedText) > 0) { s = seedOf(cwSeedText); }
  worldCur = k; worldName = cwName; seedText = cwSeedText;
  gameMode = cwMode; defMode = cwMode;
  txClear();
  thingsInit();
  genStart(s);
  gState = 1;
}

// ---------------------------------------------------------------- 3 delete a world?
function scrDelWorld() {
  let wq = worldHead(selW);
  tx(1, '이 세계를 정말 지울까요?', 0, 50, 11, '#ffffff', 0);
  tx(2, `'${wName}'은(는) 영원히 사라집니다! (아주 오랫동안!)`, 0, 26, 9, '#c0c0c0', 0);
  button(-154, -60, -4, -80, '삭제', 3, 1); if (btnHot == 1) { if (clickLatch == 1) { worldClear(selW); if (canSave() == 1) { AT_저장(); } selW = 0; menuGo(1); } }
  button(4, -60, 154, -80, '취소', 4, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(1); } }
}

// ---------------------------------------------------------------- 10 delete a server? (v2.3)
let delS = 0;
function scrDelServer() {
  let h = srvHas(delS);
  tx(1, '이 서버를 정말 지울까요?', 0, 50, 11, '#ffffff', 0);
  tx(2, `'${shName}'의 세계와 기록, 플러그인이 모두 사라집니다! (되돌릴 수 없습니다)`, 0, 26, 8, '#c0c0c0', 0);
  if (h == 1) { if (srvCount(delS) > 0) { tx(3, '지금 접속한 사람이 있어서 지울 수 없습니다', 0, 6, 8, '#ff8080', 0); h = 0; } else { txOff(3); } }
  button(-154, -60, -4, -80, '삭제', 4, h); if (btnHot == 1) { if (clickLatch == 1) { svBackDrop(delS); srvDelete(delS); selS = 0; delS = 0; menuGo(4); } }
  button(4, -60, 154, -80, '취소', 5, 1); if (btnHot == 1) { if (clickLatch == 1) { delS = 0; menuGo(4); } }
}

// ---------------------------------------------------------------- 4 the servers
function scrServers() {
  title2('멀티플레이 게임');
  // the line, the account
  if (SY_ == 1) { tx(20, `닉네임 ${netNick} · 지금 ${netOnline()}명 온라인`, 0, 106, 7, '#a0ffa0', 0); }
  else { if (netClock - netStartT < 5) { tx(20, 'Entry Sync에 연결하는 중...', 0, 106, 7, '#ffff80', 0); } else { tx(20, 'Entry Sync 확장에 연결되지 않았습니다 (설명서의 멀티플레이를 보세요)', 0, 106, 7, '#ff8080', 0); } }
  box(-200, 100, 200, -66, '#000000');
  let k = 1, row = 0, ti = 30, shown = 0;
  while (k <= NSRV) {
    if (srvHas(k) == 1) {
      if (row >= listTop && shown < 6) {
        let y0 = 98 - shown * 27, y1 = y0 - 25;
        let hot = inBox(-160, y0, 160, y1);
        if (selS == k) { box(-162, y0 + 1, 162, y1 - 1, '#a0a0a0'); box(-161, y0, 161, y1, '#000000'); }
        drawIcon(serverIcon(k), -146, (y0 + y1) / 2, 9);
        let n = srvCount(k);
        tx(ti, `${shName}`, -128, y0 - 6, 8, '#ffffff', 1);
        tx(ti + 1, `${shMotd}`, -128, y0 - 17, 7, '#a0a0a0', 1);
        tx(ti + 2, `${n}/${shMax}`, 128, y0 - 6, 7, '#a0a0a0', 2);
        let bars = 0;
        if (SY_ == 1) { bars = 5; }
        let b = 0;
        while (b < 5) { let c = '#3a3a3a'; if (b < bars) { c = '#40e040'; } box(134 + b * 4, y0 - 9 + b * 2, 136 + b * 4, y0 - 11, c); b = b + 1; }
        gS2 = `주인 ${shOwner}`; if (shDay > 0) { let ago = dayNow() - shDay; if (ago >= 1) { gS2 = `${gS2} · ${ago}일 전`; } }
        tx(ti + 3, gS2, 156, y0 - 17, 6, '#808080', 2);
        ti = ti + 4;
        if (hot == 1) { if (clickLatch == 1) { if (selS == k) { serverJoin(k); } else { selS = k; } } }
        shown = shown + 1;
      }
      row = row + 1;
    }
    k = k + 1;
  }
  while (ti < 56) { txOff(ti); ti = ti + 1; }
  if (row == 0) { tx(29, '아직 서버가 없습니다. 서버 추가로 만들어 보세요', 0, 40, 9, '#c0c0c0', 0); } else { txOff(29); }
  // more than six: the wheel moves the list
  if (wheelAcc != 0) { listTop = Math.max(0, Math.min(Math.max(0, row - 6), listTop + wheelAcc)); wheelAcc = 0; }
  let has = 0, mine = 0;
  if (selS > 0) { has = srvHas(selS); if (has == 1) { if (shOwner == netNick || netNick == SUPER) { mine = 1; } } }
  let on = 0; if (SY_ == 1) { on = 1; }
  if (netMsg != '') { tx(28, netMsg, 0, -58, 7, '#ff8080', 0); } else { txOff(28); }
  button(-154, -76, -54, -96, '서버 접속', 2, has * on); if (btnHot == 1) { if (clickLatch == 1) { serverJoin(selS); } }
  button(-50, -76, 50, -96, '직접 연결', 3, on); if (btnHot == 1) { if (clickLatch == 1) { dcName = ''; menuGo(6); } }
  button(54, -76, 154, -96, '서버 추가', 4, on); if (btnHot == 1) { if (clickLatch == 1) { esEdit = 0; esName = `${netNick}의 서버`; esMotd = '블록 월드 서버'; esSeedText = ''; esMode = 0; menuGo(5); } }
  button(-154, -102, -80, -122, '편집', 5, mine); if (btnHot == 1) { if (clickLatch == 1) { srvHead(selS); esEdit = selS; esName = shName; esMotd = shMotd; menuGo(5); } }
  let canDel = 0; if (mine == 1) { if (srvCount(selS) == 0) { canDel = 1; } }
  button(-76, -102, -2, -122, '삭제', 6, canDel); if (btnHot == 1) { if (clickLatch == 1) { delS = selS; menuGo(10); } }
  button(2, -102, 76, -122, '새로 고침', 7, 1); if (btnHot == 1) { if (clickLatch == 1) { netMsg = ''; txClear(); } }
  button(80, -102, 154, -122, '취소', 8, 1); if (btnHot == 1) { if (clickLatch == 1) { netLeaveAll(); menuGo(0); } }
}
function serverIcon(k) {
  let r = 2, c = mod(k - 1, 8) + 1;
  if (c == 2) { r = 1; } if (c == 3) { r = 8; } if (c == 4) { r = 13; } if (c == 5) { r = 12; } if (c == 6) { r = 4; } if (c == 7) { r = 21; } if (c == 8) { r = 24; }
  return r;
}
function netOnline() {
  let n = 0, j = 1;
  while (j <= NSLOT) { if (NLIVE[j] == 1) { n = n + 1; } j = j + 1; }
  return n;
}
function serverJoin(k) {
  if (k > 0) {
    let e = netJoinCheck(k);
    if (strlen(e) > 1) { menuMsg('접속할 수 없습니다', e); }
    else { txClear(); netJoin(k); }
  }
}

// ---------------------------------------------------------------- 5 a server's settings (new or the owner's)
function scrServerEdit() {
  if (esEdit == 0) { title2('서버 추가'); } else { title2('서버 정보 편집'); }
  tx(20, '서버 이름', -100, 98, 8, '#a0a0a0', 1);
  if (field(-100, 92, 100, 72, esName, 21) == 1) { if (clickLatch == 1) { ask('서버 이름'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { esName = netClean(ansS); } } }
  tx(22, '서버 설명', -100, 62, 8, '#a0a0a0', 1);
  if (field(-100, 56, 100, 36, esMotd, 23) == 1) { if (clickLatch == 1) { ask('서버 설명 (목록에 보이는 한 줄)'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { esMotd = netClean(ansS); } } }
  if (esEdit == 0) {
    tx(24, '세계의 시드 (비우면 무작위)', -100, 26, 8, '#a0a0a0', 1);
    gS = ' '; if (strlen(esSeedText) > 0) { gS = esSeedText; }
    if (field(-100, 20, 100, 0, gS, 25) == 1) { if (clickLatch == 1) { ask('시드'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { esSeedText = netClean(ansS); } else { esSeedText = ''; } } }
    let md = '서바이벌'; if (esMode == 1) { md = '크리에이티브'; }
    button(-100, -6, -2, -24, `모드: ${md}`, 26, 1); if (btnHot == 1) { if (clickLatch == 1) { esMode = 1 - esMode; } }
    let wk = '기본 지형'; if (esFlat == 1) { wk = '평지'; }
    button(2, -6, 100, -24, `세계: ${wk}`, 28, 1); if (btnHot == 1) { if (clickLatch == 1) { esFlat = 1 - esFlat; } }
    if (esFlat == 1) {
      button(-100, -30, 100, -48, `평지 프리셋: ${flatPresetName(esFlatSpec)}`, 29, 1); if (btnHot == 1) { if (clickLatch == 1) { esFlatSpec = FLPS[flatNextPreset(esFlatSpec)]; } }
      if (field(-100, -54, 100, -72, flatShort(esFlatSpec), 30) == 1) { if (clickLatch == 1) { esFlatSpec = flatAsk(esFlatSpec); } }
    } else { txOff(29); txOff(30); }
    if (menuErrT > 0) { menuErrT = menuErrT - 1; tx(27, menuErr, 0, -84, 7, '#ff8080', 0); }
    else { tx(27, '만든 사람이 주인(관리자)이 됩니다. 들어가서 /plugin 으로 플러그인을 만드세요', 0, -84, 7, '#a0a0a0', 0); }
  }
  button(-154, -102, -4, -122, '완료', 2, 1); if (btnHot == 1) { if (clickLatch == 1) { serverSave(); } }
  button(4, -102, 154, -122, '취소', 3, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(4); } }
}
function serverSave() {
  if (esEdit == 0) {
    let s = rand(1, 99999999);
    if (strlen(esSeedText) > 0) { s = seedOf(esSeedText); }
    let fl = '-';
    if (esFlat == 1) { if (flatParse(esFlatSpec) == 0) { fl = esFlatSpec; } }
    let k = srvCreate(esName, esMotd, s, esMode, fl);
    if (k == 0) { menuMsg('서버를 만들 수 없습니다', `서버 자리 ${NSRV}개가 모두 찼습니다. 주인이 지우면 자리가 납니다`); } else { selS = k; menuGo(4); }
  } else { srvEdit(esEdit, esName, esMotd); menuGo(4); }
}

// ---------------------------------------------------------------- 6 a server by its name
function scrDirect() {
  title2('직접 연결');
  tx(20, '서버 이름', -100, 52, 8, '#a0a0a0', 1);
  gS = ' '; if (strlen(dcName) > 0) { gS = dcName; }
  if (field(-100, 46, 100, 26, gS, 21) == 1) { if (clickLatch == 1) { ask('서버 이름'); ansS = answer(); hideAnswer(); if (strlen(ansS) > 0) { dcName = netClean(ansS); } else { dcName = ''; } } }
  button(-154, -102, -4, -122, '서버 접속', 2, 1); if (btnHot == 1) { if (clickLatch == 1) {
    let k = 1, f = 0;
    while (k <= NSRV) { if (srvHas(k) == 1) { if (shName == dcName) { f = k; } } k = k + 1; }
    if (f == 0) { menuMsg('접속할 수 없습니다', `'${dcName}' 서버를 찾지 못했습니다`); } else { serverJoin(f); }
  } }
  button(4, -102, 154, -122, '취소', 3, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(4); } }
}

// ---------------------------------------------------------------- 7 the settings
function scrOptions() {
  title2('설정');
  button(-100, 70, 100, 50, `시야 거리: ${viewWant} 블록`, 2, 1); if (btnHot == 1) { if (clickLatch == 1) { if (mouseX() > 0) { viewWant = Math.min(48, viewWant + 4); } else { viewWant = Math.max(8, viewWant - 4); } } }
  button(-100, 44, 100, 24, `마우스 감도: ${Math.round(sens * 100)}%`, 3, 1); if (btnHot == 1) { if (clickLatch == 1) { if (mouseX() > 0) { sens = Math.min(2, sens + 0.1); } else { sens = Math.max(0.1, sens - 0.1); } } }
  let so = '끔'; if (sndOn == 1) { so = '켬'; }
  button(-100, 18, 100, -2, `소리: ${so}`, 4, 1); if (btnHot == 1) { if (clickLatch == 1) { sndOn = 1 - sndOn; } }
  tx(5, '왼쪽 반을 누르면 줄이고 오른쪽 반을 누르면 늘립니다', 0, -14, 7, '#a0a0a0', 0);
  button(-100, -102, 100, -122, '완료', 6, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(0); } }
}

// ---------------------------------------------------------------- 8 a message; 9 help
function scrMessage() {
  tx(1, msgTitle, 0, 50, 11, '#ffffff', 0);
  tx(2, msgBody, 0, 24, 9, '#c0c0c0', 0);
  if (strlen(msgBody2) > 0) { tx(3, msgBody2, 0, 10, 9, '#c0c0c0', 0); } else { txOff(3); }
  let lb = '타이틀 화면으로'; if (msgBack == 4) { lb = '서버 목록으로'; }
  button(-100, -60, 100, -80, lb, 4, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(msgBack); } }
}
function scrHelp() {
  title2('도움말');
  let i = 1;
  while (i <= HELPL.length) { tx(10 + i, HELPL[i], -196, 96 - i * 18, 8, '#e0e0e0', 1); i = i + 1; }
  button(-100, -102, 100, -122, '완료', 2, 1); if (btnHot == 1) { if (clickLatch == 1) { menuGo(0); } }
}
