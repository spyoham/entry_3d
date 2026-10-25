// ===================================================================== the player's body
let plX = 102400, plY = 0, plZ = 102400, plVY = 0, plGround = 1, plCrouch = 0, plSpeed = 0;
let plYaw = 0, plPitch = 0, plEye = 160, plMoving = 0, plSprint = 0, plNoclip = 0, plInBush = 0;
const PRAD = 32, PH = 178, PHC = 125, STEP = 48, GRAV = 1900, JUMPV = 520;

// move the body by (mx, mz) cm this frame, with collisions and stepping
function bodyMove(mx, mz, dt) {
  let hh = PH;
  if (plCrouch == 1) { hh = PHC; }
  if (plNoclip == 1) {
    plX = plX + mx; plZ = plZ + mz;
  } else {
    let nx = plX + mx, nz = plZ + mz;
    scanBoxes(nx, plY, nz, PRAD, hh, STEP);
    if (hitB == 0) { plX = nx; plZ = nz; }
    else {
      scanBoxes(nx, plY, plZ, PRAD, hh, STEP);
      if (hitB == 0) { plX = nx; }
      else {
        scanBoxes(plX, plY, nz, PRAD, hh, STEP);
        if (hitB == 0) { plZ = nz; }
      }
    }
    // the ground under the body where it now is
    scanBoxes(plX, plY, plZ, PRAD, hh, STEP);
    plInBush = bushB;
    let g = gndB;
    if (plY > g + 2) {
      plGround = 0;
      plVY = plVY - GRAV * dt;
      let ny = plY + plVY * dt;
      // a ceiling on the way up
      if (plVY > 0) { scanBoxes(plX, ny, plZ, PRAD, hh, 0); if (hitB == 1) { plVY = 0; ny = plY; } }
      if (ny <= g) { ny = g; plVY = 0; plGround = 1; }
      plY = ny;
    } else {
      plY = g; plGround = 1;
      if (plVY < 0) { plVY = 0; }
    }
    if (plVY > 0 && plGround == 1) { plGround = 0; }
  }
  // stay on the island
  if (plX < 2000) { plX = 2000; }
  if (plZ < 2000) { plZ = 2000; }
  if (plX > MAP - 2000) { plX = MAP - 2000; }
  if (plZ > MAP - 2000) { plZ = MAP - 2000; }
}

// walking from the keys (dt s)
function playerMove(dt) {
  let fw = 0, sd = 0;
  if (key(87)) { fw = fw + 1; }
  if (key(83)) { fw = fw - 1; }
  if (key(68)) { sd = sd + 1; }
  if (key(65)) { sd = sd - 1; }
  plCrouch = 0;
  if (key(67)) { plCrouch = 1; }
  plSprint = 0;
  let sp = 480;
  if (key(16)) { if (fw > 0) { if (plCrouch == 0) { sp = 640; plSprint = 1; } } }
  if (plCrouch == 1) { sp = 240; }
  if (plNoclip == 1) { sp = 4000; if (key(16)) { sp = 12000; } }
  if (fw != 0 && sd != 0) { sp = sp * 0.7071; }
  let syw = sind(plYaw), cyw = cosd(plYaw);
  let mx = (syw * fw + cyw * sd) * sp * dt, mz = (cyw * fw - syw * sd) * sp * dt;
  plMoving = 0;
  if (fw != 0 || sd != 0) { plMoving = 1; }
  if (plNoclip == 1) {
    if (key(32)) { plY = plY + sp * dt; }
    if (key(67)) { plY = plY - sp * dt; }
  } else {
    if (key(32)) { if (plGround == 1) { plVY = JUMPV; plY = plY + 3; } }
  }
  bodyMove(mx, mz, dt);
  let eye = 160;
  if (plCrouch == 1) { eye = 110; }
  plEye = plEye + (eye - plEye) * 0.35;
}
