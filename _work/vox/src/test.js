// ===================================================================== test hooks (sim / headless)
// testCmd set from outside: 1 stand at (tX, tY, tZ) looking (tYaw, tPitch)
let botDone = 0;
let testCmd = 0, tX = 0, tY = 0, tZ = 0, tYaw = 0, tPitch = 0, tStage = 0;
function testStep() {
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
