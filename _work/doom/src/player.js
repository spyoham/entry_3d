// ============================================================
// Player: input -> thrust / turning (p_user.c), view height & bob
// ============================================================
let inFwd = 0, inSide = 0, inTurn = 0, inRun = 0, inFire = 0, inUse = 0, inUseHeld = 0, inWeapon = 0;
let mouseLastX = 0, mouseTurn = 0, turnHeld = 0;

function readInput() {
  inFwd = 0; inSide = 0; inTurn = 0; inFire = 0; inUse = 0; inWeapon = 0;
  inRun = 0;
  if (key(16)) { inRun = 1; }
  if (key(87) || key(38)) { inFwd = inFwd + 1; }
  if (key(83) || key(40)) { inFwd = inFwd - 1; }
  if (key(65)) { inSide = inSide - 1; }
  if (key(68)) { inSide = inSide + 1; }
  if (key(37) || key(81)) { inTurn = inTurn + 1; }
  if (key(39) || key(69)) { inTurn = inTurn - 1; }
  if (key(17) || key(70) || mouseDown()) { inFire = 1; }
  if (key(32)) {
    if (inUseHeld == 0) { inUse = 1; }
    inUseHeld = 1;
  } else { inUseHeld = 0; }
  if (key(49)) { inWeapon = 1; }
  if (key(50)) { inWeapon = 2; }
  if (key(51)) { inWeapon = 3; }
  if (key(52)) { inWeapon = 4; }
  if (key(53)) { inWeapon = 5; }
  if (key(54)) { inWeapon = 6; }
  if (key(55)) { inWeapon = 7; }
  // mouse: horizontal movement turns the view
  let mxp = mouseX();
  mouseTurn = 0;
  if (Math.abs(mxp - mouseLastX) < 200) { mouseTurn = (mouseLastX - mxp) * 0.6; }
  mouseLastX = mxp;
}

function playerThink() {
  let m = plMo;
  if (plHealth > 0) {
    // turning (slow for the first tics like Doom)
    if (inTurn != 0) {
      turnHeld = turnHeld + 1;
      let sp = 3.5;
      if (inRun == 1) { sp = 7; }
      if (turnHeld < 6) { sp = 1.8; }
      plAng = plAng + inTurn * sp;
    } else { turnHeld = 0; }
    plAng = mod(plAng + mouseTurn, 360);
    mAng[m] = plAng;
    // thrust (forwardmove 25/50, sidemove 24/40, x2048 / 65536)
    let onGround = 0;
    if (mZ[m] <= mFloorZ[m]) { onGround = 1; }
    if (onGround == 1) {
      let fw = 25, sd = 24;
      if (inRun == 1) { fw = 50; sd = 40; }
      if (inFwd != 0) {
        mMomX[m] = mMomX[m] + cosd(plAng) * inFwd * fw / 32;
        mMomY[m] = mMomY[m] + sind(plAng) * inFwd * fw / 32;
      }
      if (inSide != 0) {
        mMomX[m] = mMomX[m] + sind(plAng) * inSide * sd / 32;
        mMomY[m] = mMomY[m] - cosd(plAng) * inSide * sd / 32;
      }
    }
    if (inUse == 1) { useLines(); }
  } else {
    // dead: fall to the floor view, turn toward the killer
    if (plViewH > 6) { plViewH = plViewH - 1; }
    if (inUse == 1) { restartLevel = 1; }
  }
  if (mMomX[m] != 0 || mMomY[m] != 0) { xyMovement(m); }
  zMovement(m);
  // view height (P_CalcHeight)
  let mv = mMomX[m] * mMomX[m] + mMomY[m] * mMomY[m];
  plBob = mv / 4;
  if (plBob > 16) { plBob = 16; }
  if (plHealth > 0) {
    plViewH = plViewH + plDeltaVH;
    if (plViewH > VIEWHEIGHT) { plViewH = VIEWHEIGHT; plDeltaVH = 0; }
    if (plViewH < VIEWHEIGHT / 2) { plViewH = VIEWHEIGHT / 2; if (plDeltaVH <= 0) { plDeltaVH = 1; } }
    if (plDeltaVH != 0) { plDeltaVH = plDeltaVH + 0.25; if (plDeltaVH == 0) { plDeltaVH = 0.001; } }
  }
  let bobz = plBob / 2 * sind(levelTime * 360 / 20);
  if (plHealth <= 0) { bobz = 0; }
  vz = mZ[m] + plViewH + bobz;
  if (vz > mCeilZ[m] - 4) { vz = mCeilZ[m] - 4; }
  vx = mX[m]; vy = mY[m]; vang = plAng;
  plX = mX[m]; plY = mY[m]; plZ = mZ[m]; plSec = mSec[m];
  // step-up smoothing: when the floor rose under us, lower the view and recover
  if (mZ[m] > plLastZ && onGroundLast == 1 && mZ[m] - plLastZ <= MAXSTEP) {
    plViewH = plViewH - (mZ[m] - plLastZ);
    plDeltaVH = (VIEWHEIGHT - plViewH) / 8;
  }
  plLastZ = mZ[m];
  onGroundLast = 0;
  if (mZ[m] <= mFloorZ[m]) { onGroundLast = 1; }
}
let plLastZ = 0, onGroundLast = 1, restartLevel = 0;
