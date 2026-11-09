// ===================================================================== test hooks (sim / headless)
// testCmd set from outside: 1 stand at (tX, tY, tZ) looking (tYaw, tPitch)
let botDone = 0;
let tCmd = '';
let testCmd = 0, tX = 0, tY = 0, tZ = 0, tYaw = 0, tPitch = 0, tStage = 0;
function testStep() {
  if (testCmd == 6) { testCmd = 0; thumbScene(); }
  // 8: a command (tCmd) as if typed
  if (testCmd == 8) { testCmd = 0; cmdFromBlock = 0; netUserAct = 1; runCommand(tCmd); netUserAct = 0; }
  // 12: online, the server named tCmd joined (when the list has it); 13: tCmd said in the chat
  if (testCmd == 12) { testCmd = 0; netEnter(); if (netMy == 0) { netClaim(); } let k = 1, f = 0; while (k <= NSRV) { if (srvHas(k) == 1) { if (shName == tCmd) { f = k; } } k = k + 1; } if (f > 0) { serverJoin(f); } else { tCmd = '없음'; } }
  // 14: the block at (tX, tY, tZ) into tStage
  if (testCmd == 14) { testCmd = 0; tStage = blockAt(tX, tY, tZ); }
  if (testCmd == 13) { testCmd = 0; netUserAct = 1; chatRun(tCmd); netUserAct = 0; }
  // 9: the kept world again (as 이어하기 on the title)
  if (testCmd == 9) { testCmd = 0; txClear(); loadGame(tStage); }
  // 10: a new world in place tStage, seed tCmd (as 새 세계 만들기)
  // 11: online (as the multiplayer screen), a server made (name tCmd) and joined
  if (testCmd == 11) { testCmd = 0; netEnter(); netClaim(); let k = srvCreate(tCmd, '시험 서버입니다', 1234, 1); if (k > 0) { txClear(); netJoin(k); } }
  if (testCmd == 10) { testCmd = 0; cwSeedText = tCmd; cwName = '시험'; cwMode = 0; worldNew(tStage); }
  // 4: to world tStage at (tX, tZ)
  if (testCmd == 4) { testCmd = 0; startTravel(tStage, tX, tZ, 1 + tStage * 0); if (tStage == 2) { travelKind = 2; } }
  if (testCmd == 5) { testCmd = 0; setBlock(tX, tY, tZ, tStage); }
  // 3: run stage tStage of the player's chunk once more (for timing)
  if (testCmd == 3) {
    let s = slotOf(idiv(Math.floor(px), 16), idiv(Math.floor(pz), 16));
    CKST[s] = tStage; CKSUB[s] = 0;
    chunkStage(s);
    CKST[s] = 5;
    testCmd = 0;
  }
  if (testCmd == 1) {
    px = tX; py = tY; pz = tZ; yaw = tYaw; pitch = tPitch; pvx = 0; pvy = 0; pvz = 0; fallTop = py;
    testCmd = 0;
  }
  // 2: one of each mob in a row ahead (they stand still), and a few items on the ground
  if (testCmd == 2) {
    let t = 1;
    while (t <= 7) {
      let ax = px + sind(yaw) * 5 + cosd(yaw) * (t - 4) * 1.4, az = pz + cosd(yaw) * 5 - sind(yaw) * (t - 4) * 1.4;
      findTop(Math.floor(ax), Math.floor(az));
      mobAdd(t, ax, topY + 1, az); 
      t = t + 1;
    }
    let e = 1;
    while (e <= NMOB) { if (ET[e] > 0) { EYAW[e] = yaw + 180 + (e - 4) * 20; EWY[e] = EYAW[e]; ETM[e] = 99; EST[e] = 0; } e = e + 1; }
    dropItem(4, 1, 0, px + sind(yaw) * 2, py + 1, pz + cosd(yaw) * 2, 0);
    dropItem(104, 1, 0, px + sind(yaw) * 2 + 0.5, py + 1, pz + cosd(yaw) * 2, 0);
    testCmd = 0;
  }
}

// 6: the thumbnail's cottage at (tX, tZ) (the commands of test/scene.txt), and a hotbar for the picture
let SCENE = ["/fill ~-16 ~-1 ~-16 ~16 ~-1 ~16 grass_block", "/fill ~-16 ~ ~-16 ~16 ~14 ~16 air", "/fill ~-16 ~-2 ~-16 ~16 ~-2 ~16 dirt", "/fill ~-3 ~-1 ~-2 ~3 ~-1 ~2 cobblestone", "/fill ~-3 ~ ~-2 ~3 ~3 ~2 oak_planks hollow", "/fill ~-3 ~ ~-2 ~-3 ~3 ~-2 oak_log", "/fill ~3 ~ ~-2 ~3 ~3 ~-2 oak_log", "/fill ~-3 ~ ~2 ~-3 ~3 ~2 oak_log", "/fill ~3 ~ ~2 ~3 ~3 ~2 oak_log", "/fill ~-4 ~3 ~-3 ~4 ~3 ~-3 spruce_stairs[facing=south]", "/fill ~-4 ~3 ~3 ~4 ~3 ~3 spruce_stairs[facing=north]", "/fill ~-4 ~4 ~-2 ~4 ~4 ~-2 spruce_stairs[facing=south]", "/fill ~-4 ~4 ~2 ~4 ~4 ~2 spruce_stairs[facing=north]", "/fill ~-4 ~5 ~-1 ~4 ~5 ~-1 spruce_stairs[facing=south]", "/fill ~-4 ~5 ~1 ~4 ~5 ~1 spruce_stairs[facing=north]", "/fill ~-4 ~5 ~0 ~4 ~5 ~0 spruce_slab", "/fill ~-3 ~4 ~-1 ~-3 ~4 ~1 oak_planks", "/fill ~3 ~4 ~-1 ~3 ~4 ~1 oak_planks", "/setblock ~0 ~ ~-2 oak_door[facing=north]", "/setblock ~0 ~1 ~-2 oak_door[facing=north,half=upper]", "/setblock ~-2 ~1 ~-2 glass_pane", "/setblock ~2 ~1 ~-2 glass_pane", "/setblock ~-3 ~1 ~0 glass_pane", "/setblock ~3 ~1 ~0 glass_pane", "/fill ~2 ~4 ~1 ~2 ~7 ~1 cobblestone", "/fill ~0 ~-1 ~-3 ~0 ~-1 ~-10 grass_path", "/fill ~-7 ~ ~-7 ~7 ~ ~-7 oak_fence", "/fill ~-7 ~ ~-6 ~-7 ~ ~4 oak_fence", "/fill ~7 ~ ~-6 ~7 ~ ~4 oak_fence", "/setblock ~0 ~ ~-7 oak_fence_gate", "/setblock ~-2 ~1 ~-7 lantern", "/setblock ~2 ~1 ~-7 lantern", "/fill ~-6 ~ ~-6 ~-2 ~ ~-4 poppy", "/fill ~-6 ~ ~-5 ~-2 ~ ~-5 dandelion", "/fill ~2 ~ ~-6 ~6 ~ ~-4 cornflower", "/fill ~2 ~ ~-5 ~6 ~ ~-5 red_tulip", "/setblock ~-4 ~ ~-3 barrel", "/setblock ~-5 ~ ~-3 oak_stairs[facing=west]", "/setblock ~4 ~ ~-3 flower_pot", "/setblock ~5 ~ ~-3 potted_red_tulip", "/fill ~-6 ~-1 ~-2 ~-4 ~-1 ~2 farmland_moist", "/fill ~-6 ~ ~-2 ~-4 ~ ~2 wheat_3", "/setblock ~-5 ~-1 ~0 water"];
function thumbScene() {
  findTop(tX, tZ);
  px = tX + 0.5; py = topY + 1; pz = tZ + 0.5; flying = 1;
  let k = 1;
  while (k <= SCENE.length) { runCommand(SCENE[k]); k = k + 1; }
  INVI[1] = I_oakStairs; INVN[1] = 64; INVI[2] = I_oakFence; INVN[2] = 24; INVI[3] = I_glassPane; INVN[3] = 32; INVI[4] = I_oakDoor; INVN[4] = 3;
  INVI[5] = I_redBed; INVN[5] = 1; INVI[6] = 29; INVN[6] = 8; INVI[7] = 132; INVN[7] = 1; INVI[8] = 27; INVN[8] = 48; INVI[9] = I_bread; INVN[9] = 5;
  hotSel = 1; gameMode = 0; hp = 17; food = 16; xpLevel = 7; xpPts = 9;
  autoView = 0; viewWant = 48; setView(48);
  // (the scene's own command messages are not part of the picture)
  CHT = []; CHTT = []; msgT = 0;
}
