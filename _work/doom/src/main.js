// ============================================================
// Main loop and game flow (runs in the world-stamper clone)
//  gameState: 0 title, 1 skill menu, 2 playing, 3 intermission
// ============================================================
let dbgMode = 0, plHealth = 100, fps = 0, fpsFrames = 0, fpsT0 = 0;
let kEnter = 0, kUp = 0, kDown = 0, kEsc = 0, exitDelay = 0, lvlStartT = 0, detKeyHeld = 0;
let pw2 = [1, 2, 4, 8, 16, 32, 64, 128];

function levelStart() {
  let i = 1;
  // restore the map
  while (i <= NSECTORS) {
    secFloor[i] = secFloor0[i]; secCeil[i] = secCeil0[i]; secLight[i] = secLight0[i]; secSpecial[i] = secSpecial0[i];
    secSoundTarget[i] = 0; secSoundValid[i] = 0; secMover[i] = 0;
    i = i + 1;
  }
  i = 1;
  while (i <= lnX1.length) { lnSpecial[i] = lnSpecial0[i]; lnSeen[i] = 0; i = i + 1; }
  i = 1;
  while (i <= sdTop.length) { sdTop[i] = sdTop0[i]; sdMid[i] = sdMid0[i]; sdBot[i] = sdBot0[i]; i = i + 1; }
  i = 1;
  while (i <= sgX1.length) { segTex(i); i = i + 1; }
  // no things
  i = 1;
  while (i <= NSUBSECTORS) { ssThing[i] = 0; i = i + 1; }
  i = 1;
  while (i <= BMW * BMH) { bmThing[i] = 0; i = i + 1; }
  i = MAXMOBJ;
  freeHead = 0;
  while (i > 0) { mUsed[i] = 0; mSpr[i] = 0; mThk[i] = 0; mSSNext[i] = freeHead; freeHead = i; i = i - 1; }
  nThk = 0;
  levelSpecials();
  // things for the skill
  killsTotal = 0; itemsTotal = 0;
  let sb = 4;
  if (skill <= 2) { sb = 1; }
  if (skill == 3) { sb = 2; }
  i = 1;
  while (i <= thX.length) {
    let t = thType[i];
    if (t > 0 && mod(Math.floor(thFlags[i] / sb), 2) == 1) {
      let z = -30000;
      if (mod(Math.floor(tyFlags[t] / F_SPAWNCEIL), 2) == 1) { z = 30000; }
      spawnMobj(thX[i], thY[i], z, t);
      let m = spawnResult;
      if (m > 0) {
        mAng[m] = thAng[i];
        if (mod(Math.floor(thFlags[i] / 8), 2) == 1) { mFlags[m] = mFlags[m] + F_AMBUSH; }
        if (mod(Math.floor(mFlags[m] / F_COUNTKILL), 2) == 1) { killsTotal = killsTotal + 1; }
        if (mod(Math.floor(mFlags[m] / F_COUNTITEM), 2) == 1) { itemsTotal = itemsTotal + 1; }
        if (mTics[m] != -1) { addThinker(m); mTics[m] = rand(1, mTics[m]); }
      }
    }
    i = i + 1;
  }
  // player
  spawnMobj(PSTARTX, PSTARTY, -30000, T_PLAYER);
  plMo = spawnResult;
  mAng[plMo] = PSTARTA; plAng = PSTARTA;
  mSpr[plMo] = 0;
  plHealth = 100; plViewH = VIEWHEIGHT; plDeltaVH = 0;
  plKills = 0; plItems = 0; plSecrets = 0;
  plDamageCount = 0; plBonusCount = 0; plAttacker = 0;
  weaponsReset();
  msgText = ''; msgTime = 0; hudDirty = 1; amOn = 0;
  restartLevel = 0; exitLevel = 0; exitDelay = 0; levelTime = 0;
  faceCos = HP_FACE0; faceTimer = 0;
  playerThink();
}

function runTics() {
  let now = timer();
  let n = Math.floor((now - tLast) * 35);
  if (n > 4) { n = 4; tLast = now - 4 / 35; }
  tLast = tLast + n / 35;
  while (n > 0 && gameState == 2) {
    readInput();
    // automap toggle (Tab / M)
    if (key(9) || key(77)) { if (amKeyHeld == 0) { amOn = 1 - amOn; } amKeyHeld = 1; } else { amKeyHeld = 0; }
    // detail toggle (L)
    if (key(76)) {
      if (detKeyHeld == 0) {
        lowDetail = 1 - lowDetail;
        if (lowDetail == 1) { gMinW = 8; gLodIZ = 1 / 500; gTol = 5; msgText = 'Low detail'; }
        else { gMinW = MINW; gLodIZ = LODIZ; gTol = TOL; msgText = 'High detail'; }
        msgTime = 70;
      }
      detKeyHeld = 1;
    } else { detKeyHeld = 0; }
    playerThink();
    movePsprites();
    runThinkers();
    runMovers();
    runLights();
    if (nButtons > 0) { runButtons(); }
    if (plHealth > 0) { playerSectorSpecial(); }
    faceThink();
    gametic = gametic + 1;
    levelTime = levelTime + 1;
    if (restartLevel == 1) { levelStart(); }
    if (exitLevel == 1) {
      exitDelay = exitDelay + 1;
      if (exitDelay > 30) { startIntermission(); }
    }
    n = n - 1;
  }
}

function startIntermission() {
  gameState = 3; wiStage = 0; wiTimer = 0;
  wiKills = 0; wiItems = 0; wiSecrets = 0; wiTime = 0;
  stopSounds();
  scrDirty = 1;
  eraseAll();
}
function pct(a, b) {
  pctResult = 100;
  if (b > 0) { pctResult = Math.floor(a * 100 / b); }
}
let pctResult = 0;

// title / menu / intermission input (edge-triggered keys)
function menuTick() {
  let e = 0, u = 0, d = 0, esc = 0;
  if (key(13) || key(32)) { e = 1; }
  if (key(38)) { u = 1; }
  if (key(40)) { d = 1; }
  if (key(27)) { esc = 1; }
  let pe = 0, pu = 0, pd = 0, pesc = 0;
  if (e == 1 && kEnter == 0) { pe = 1; }
  if (u == 1 && kUp == 0) { pu = 1; }
  if (d == 1 && kDown == 0) { pd = 1; }
  if (esc == 1 && kEsc == 0) { pesc = 1; }
  kEnter = e; kUp = u; kDown = d; kEsc = esc;
  if (gameState == 0) {
    if (pe == 1) { gameState = 1; playSound('PISTOL'); scrDirty = 1; }
  } else {
    if (gameState == 1) {
      if (pu == 1) { skill = skill - 1; if (skill < 1) { skill = 5; } playSound('PSTOP'); scrDirty = 1; }
      if (pd == 1) { skill = skill + 1; if (skill > 5) { skill = 1; } playSound('PSTOP'); scrDirty = 1; }
      if (pesc == 1) { gameState = 0; scrDirty = 1; }
      if (pe == 1) {
        playSound('PISTOL');
        levelStart();
        gameState = 2;
        tLast = timer();
        lvlStartT = timer();
      }
    } else {
      if (gameState == 3) {
        wiTimer = wiTimer + 1;
        let old = wiStage;
        if (wiStage == 0 && wiTimer > 20) { wiStage = 1; }
        if (wiStage == 1) { pct(plKills, killsTotal); wiKills = wiKills + 4; if (wiKills >= pctResult) { wiKills = pctResult; wiStage = 2; playSound('BAREXP'); } else { playSound('PISTOL'); } }
        if (wiStage == 2) { pct(plItems, itemsTotal); wiItems = wiItems + 4; if (wiItems >= pctResult) { wiItems = pctResult; wiStage = 3; playSound('BAREXP'); } }
        if (wiStage == 3) { pct(plSecrets, secretsTotal); wiSecrets = wiSecrets + 4; if (wiSecrets >= pctResult) { wiSecrets = pctResult; wiStage = 4; playSound('BAREXP'); } }
        if (wiStage == 4) { wiTime = levelTime / 35; wiStage = 5; }
        scrDirty = 1;
        if (pe == 1) {
          if (wiStage < 5) {
            pct(plKills, killsTotal); wiKills = pctResult; pct(plItems, itemsTotal); wiItems = pctResult;
            pct(plSecrets, secretsTotal); wiSecrets = pctResult; wiTime = levelTime / 35; wiStage = 5;
          } else { gameState = 0; }
        }
      }
    }
  }
}

// touch every costume once so Entry starts loading the images (it loads lazily)
function preload(n) {
  let i = 1;
  while (i <= n) { costume(i); i = i + 1; }
  costume(1);
}
// The main loop runs on the original 'world' object (not a clone): when Entry
// finishes loading images it re-sorts the stage (Stage.sortZorder) and drops
// clones from the display list, which would put a clone's stamps on top.
on('start', 'world', function () {
  show();
  timerStart();
  renderInit();
  gameInit();
  thingsInit();
  specialsInit();
  gameState = 0; scrDirty = 1;
  tLast = timer();
  fpsT0 = timer();
  let cleared = 0;
  for (;;) {
    if (gameState == 2) {
      runTics();
      if (gameState == 2) {
        pspriteView();
        if (amOn == 0) {
          if (dbgMode != 2) { renderView(); }
          if (dbgMode != 1) { drawItems(); }
        } else { eraseAll(); }
        cleared = 0;
      }
    } else {
      if (cleared == 0) { eraseAll(); goto(0, -400); cleared = 1; }
      menuTick();
    }
    fpsFrames = fpsFrames + 1;
    if (timer() - fpsT0 >= 1) { fps = Math.round(fpsFrames / (timer() - fpsT0)); fpsFrames = 0; fpsT0 = timer(); }
  }
});
