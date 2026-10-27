// ===================================================================== people
// Entity 1 is the player, 2..NE the bots. One set of lists for everyone: the same code
// shoots, hurts, heals and loots for the player and the bots.
const NE = 50;
let EX = [], EY = [], EZ = [], EYAW = [], EPIT = [], EHP = [], EALIVE = [], EBOOST = [];
let EHEL = [], EHELD = [], EVES = [], EVESD = [], EPACK = [];
let EG1 = [], EG2 = [], EG3 = [], EA1 = [], EA2 = [], EA3 = [], EM1 = [], EM2 = [], EM3 = [], ECUR = [];
let EAMMO = [], EBAND = [], EKIT = [], EMED = [], EDRK = [], EPILL = [], EFRAG = [], ESMK = [];
let EKILLS = [], EDMG = [], ENAME = [], ECLO = [], ESKIN = [], ERANK = [];
let EFIRE = [], ERELT = [], EBOLT = [], EADS = [], ECRO = [], ESPD = [], EPH = [], EHURT = [], ELASTA = [], ESHOT = [], EUSE = [], EUSEK = [];
let EVY = [], EGND = [], EMOV = [], EBURST = [], ESEEN = [];
let alive = 0;
let BOTNAMES = ['돌개바람', '새벽늑대', '검은매', '조용한곰', '불나방', '은빛여우', '바다사자', '들고양이', '산까치', '번개', '초록뱀', '구름표범', '철새', '하늘소', '모래폭풍', '얼음송곳', '붉은달', '들소', '갈매기', '청설모', '너구리', '호랑나비', '흑곰', '수리부엉이', '천둥', '여우비', '바람개비', '부엉이', '살쾡이', '해오라기', '독수리', '물수리', '노루', '고라니', '까마귀', '반딧불', '바위게', '해달', '참매', '두더지', '산양', '불곰', '흰여우', '오소리', '꿩', '물총새', '스라소니', '삵', '자라', '돌고래', '황새', '두루미', '멧돼지', '박쥐', '뻐꾸기'];
let CLOTHS = [MT_cloth1, MT_cloth2, MT_cloth3, MT_cloth4, MT_cloth5, MT_cloth6, MT_cloth7, MT_cloth8];
let CLOL = [], SKINL = [];

function peopleInit() {
  let i = 1;
  while (i <= NE) {
    EX.push(0); EY.push(0); EZ.push(0); EYAW.push(0); EPIT.push(0); EHP.push(100); EALIVE.push(0); EBOOST.push(0);
    EHEL.push(0); EHELD.push(0); EVES.push(0); EVESD.push(0); EPACK.push(0);
    EG1.push(0); EG2.push(0); EG3.push(0); EA1.push(0); EA2.push(0); EA3.push(0); EM1.push(0); EM2.push(0); EM3.push(0); ECUR.push(1);
    EBAND.push(0); EKIT.push(0); EMED.push(0); EDRK.push(0); EPILL.push(0); EFRAG.push(0); ESMK.push(0);
    EKILLS.push(0); EDMG.push(0); ENAME.push(''); ECLO.push(1); ESKIN.push(1); ERANK.push(0);
    EFIRE.push(0); ERELT.push(0); EBOLT.push(0); EADS.push(0); ECRO.push(0); ESPD.push(0); EPH.push(0); EHURT.push(-99); ELASTA.push(0); ESHOT.push(-99); EUSE.push(0); EUSEK.push(0);
    EVY.push(0); EGND.push(1); EMOV.push(0); EBURST.push(0); ESEEN.push(0);
    let k = 1;
    while (k <= 6) { EAMMO.push(0); k = k + 1; }
    i = i + 1;
  }
  CLOL.push(MT_cloth1); CLOL.push(MT_cloth2); CLOL.push(MT_cloth3); CLOL.push(MT_cloth4); CLOL.push(MT_cloth5); CLOL.push(MT_cloth6); CLOL.push(MT_cloth7); CLOL.push(MT_cloth8);
  SKINL.push(MT_skin1); SKINL.push(MT_skin2); SKINL.push(MT_skin3);
}
function peopleReset() {
  let i = 1;
  while (i <= NE) {
    EHP[i] = 100; EALIVE[i] = 1; EBOOST[i] = 0; EHEL[i] = 0; EHELD[i] = 0; EVES[i] = 0; EVESD[i] = 0; EPACK[i] = 0;
    EG1[i] = 0; EG2[i] = 0; EG3[i] = 0; EA1[i] = 0; EA2[i] = 0; EA3[i] = 0; EM1[i] = 0; EM2[i] = 0; EM3[i] = 0; ECUR[i] = 1;
    EBAND[i] = 0; EKIT[i] = 0; EMED[i] = 0; EDRK[i] = 0; EPILL[i] = 0; EFRAG[i] = 0; ESMK[i] = 0;
    EKILLS[i] = 0; EDMG[i] = 0; ERANK[i] = 0; EFIRE[i] = 0; ERELT[i] = 0; EBOLT[i] = 0; EADS[i] = 0; ECRO[i] = 0; ESPD[i] = 0;
    EHURT[i] = -99; ELASTA[i] = 0; ESHOT[i] = -99; EUSE[i] = 0; EUSEK[i] = 0; EVY[i] = 0; EGND[i] = 1; EMOV[i] = 0; EBURST[i] = 0;
    let k = 1;
    while (k <= 6) { EAMMO[(i - 1) * 6 + k] = 0; k = k + 1; }
    ECLO[i] = rand(1, 8); ESKIN[i] = rand(1, 3);
    if (i == 1) { ENAME[i] = myName; } else { ENAME[i] = BOTNAMES[mod(i * 7 + matchSeed, BOTNAMES.length) + 1]; }
    i = i + 1;
  }
  alive = NE;
}

// ---------------------------------------------------------------- the box figure
// a person is drawn as boxes in the body's frame (x right, y up, z forward), each turned
// about x at a joint (limbs swing), then the body's yaw, then the camera.
// per box: the centre in view (cm) and the three unit axes in view
let PBN = 0;
let PCX = [], PCY = [], PCZ = [], PHX = [], PHY = [], PHZ = [], PA = [], PM = [], PO = [];
let bm11 = 0, bm12 = 0, bm13 = 0, bm21 = 0, bm22 = 0, bm23 = 0, bm31 = 0, bm32 = 0, bm33 = 0, btx = 0, bty = 0, btz = 0;
let bYaw = 0, pFog = 0, sunX = 0, sunZ = 0;
function peopleDrawInit() {
  let i = 1;
  while (i <= 20) { PCX.push(0); PCY.push(0); PCZ.push(0); PHX.push(0); PHY.push(0); PHZ.push(0); PA.push(0); PM.push(0); PO.push(0); i = i + 1; }
}
// add a box: joint (jx, jy, jz) in the body frame, turned a degrees (forward swing), the box's
// centre at (0, oy, oz) from the joint, half sizes hx, hy, hz, colour base mat
function pbox(jx, jy, jz, a, oy, oz, hx, hy, hz, mat) {
  PBN = PBN + 1;
  let ca = cosd(a), sa = sind(a);
  // the centre in the body frame
  let bx = jx, by = jy + oy * ca + oz * sa, bz = jz - oy * sa + oz * ca;
  PCX[PBN] = bm11 * bx + bm12 * by + bm13 * bz + btx;
  PCY[PBN] = bm21 * bx + bm22 * by + bm23 * bz + bty;
  PCZ[PBN] = bm31 * bx + bm32 * by + bm33 * bz + btz;
  PHX[PBN] = hx; PHY[PBN] = hy; PHZ[PBN] = hz; PA[PBN] = a; PM[PBN] = mat;
}
// draw the boxes far to near
function pflush() {
  let i = 1;
  while (i <= PBN) { PO[i] = i; i = i + 1; }
  // insertion sort by depth (far first)
  i = 2;
  while (i <= PBN) {
    let k = PO[i], j = i, go = 1;
    while (go == 1) {
      if (j <= 1) { go = 0; } else { if (PCZ[PO[j - 1]] < PCZ[k]) { PO[j] = PO[j - 1]; j = j - 1; } else { go = 0; } } }
    PO[j] = k;
    i = i + 1;
  }
  i = 1;
  while (i <= PBN) { drawPBox(PO[i]); i = i + 1; }
  PBN = 0;
}
let pcx = [], pcy = [], pcz = [];
// (the box's axes in view, its centre, half sizes, material: for pface)
let pkUx = 0, pkUy = 0, pkUz = 0, pkVx = 0, pkVy = 0, pkVz = 0, pkWx = 0, pkWy = 0, pkWz = 0;
let pkCx = 0, pkCy = 0, pkCz = 0, pkHx = 0, pkHy = 0, pkHz = 0, pkMat = 0;
function drawPBox(k) {
  let a = PA[k], ca = cosd(a), sa = sind(a);
  // axes in view: X = col1, Y = ca*col2 + sa*col3... (body Y axis turned: (0, ca, -sa)), Z: (0, sa, ca)
  pkUx = bm11; pkUy = bm21; pkUz = bm31;
  pkVx = bm12 * ca - bm13 * sa; pkVy = bm22 * ca - bm23 * sa; pkVz = bm32 * ca - bm33 * sa;
  pkWx = bm12 * sa + bm13 * ca; pkWy = bm22 * sa + bm23 * ca; pkWz = bm32 * sa + bm33 * ca;
  pkCx = PCX[k]; pkCy = PCY[k]; pkCz = PCZ[k]; pkHx = PHX[k]; pkHy = PHY[k]; pkHz = PHZ[k];
  // all eight corners in front of the eye?
  if (pkCz - Math.abs(pkUz * pkHx) - Math.abs(pkVz * pkHy) - Math.abs(pkWz * pkHz) > NEAR) {
    let du = pkUx * pkCx + pkUy * pkCy + pkUz * pkCz, dv = pkVx * pkCx + pkVy * pkCy + pkVz * pkCz, dw = pkWx * pkCx + pkWy * pkCy + pkWz * pkCz;
    pkMat = PM[k];
    // shading: the world normals of the faces against the sun (yaw, then the swing)
    let syw = sind(bYaw), cyw = cosd(bYaw);
    let sX = 0.55 * cyw + 0.56 * syw;
    let sY = 0.62 * ca - sa * (0.55 * syw - 0.56 * cyw);
    let sZ = 0.62 * sa + ca * (0.55 * syw - 0.56 * cyw);
    if (du < 0 - pkHx) { pface(1, 1, sX); } else { if (du > pkHx) { pface(1, -1, 0 - sX); } }
    if (dv < 0 - pkHy) { pface(2, 1, sY); } else { if (dv > pkHy) { pface(2, -1, 0 - sY); } }
    if (dw < 0 - pkHz) { pface(3, 1, sZ); } else { if (dw > pkHz) { pface(3, -1, 0 - sZ); } }
  }
}
// one face of the box: axis ax (1 x, 2 y, 3 z), side sg; corners from the other two axes
// (v1.2: a function, no longer written out six times in drawPBox - fewer blocks)
function pface(ax, sg, lit) {
  let ex = 0, ey = 0, ez = 0, fx = 0, fy = 0, fz = 0, gx = 0, gy = 0, gz = 0;
  if (ax == 1) { ex = pkUx * pkHx * sg; ey = pkUy * pkHx * sg; ez = pkUz * pkHx * sg; fx = pkVx * pkHy; fy = pkVy * pkHy; fz = pkVz * pkHy; gx = pkWx * pkHz; gy = pkWy * pkHz; gz = pkWz * pkHz; }
  if (ax == 2) { ex = pkVx * pkHy * sg; ey = pkVy * pkHy * sg; ez = pkVz * pkHy * sg; fx = pkWx * pkHz; fy = pkWy * pkHz; fz = pkWz * pkHz; gx = pkUx * pkHx; gy = pkUy * pkHx; gz = pkUz * pkHx; }
  if (ax == 3) { ex = pkWx * pkHz * sg; ey = pkWy * pkHz * sg; ez = pkWz * pkHz * sg; fx = pkUx * pkHx; fy = pkUy * pkHx; fz = pkUz * pkHx; gx = pkVx * pkHy; gy = pkVy * pkHy; gz = pkVz * pkHy; }
  let ox = pkCx + ex, oy = pkCy + ey, oz = pkCz + ez;
  let sh = Math.round(3.6 + lit * 3.4);
  if (sh < 0) { sh = 0; }
  if (sh > 7) { sh = 7; }
  fillStop();
  goto((ox + fx + gx) * FOC / (oz + fz + gz), (oy + fy + gy) * FOC / (oz + fz + gz));
  fillColorHex(CT[pkMat + sh * 8 + pFog + 1]);
  fillStart();
  goto((ox + fx - gx) * FOC / (oz + fz - gz), (oy + fy - gy) * FOC / (oz + fz - gz));
  goto((ox - fx - gx) * FOC / (oz - fz - gz), (oy - fy - gy) * FOC / (oz - fz - gz));
  goto((ox - fx + gx) * FOC / (oz - fz + gz), (oy - fy + gy) * FOC / (oz - fz + gz));
  nPoly = nPoly + 1;
}
// the body -> view matrix of entity e (cm, unit axes)
function bodyMatrix(x, y, z, yaw) {
  bYaw = yaw;
  let cs = cosd(yaw), sn = sind(yaw);
  // body -> world: wx = cs*bx + sn*bz, wz = -sn*bx + cs*bz, wy = by
  let R11 = r11 / 16384, R13 = r13 / 16384, R21 = r21 / 16384, R22 = r22 / 16384, R23 = r23 / 16384, R31 = r31 / 16384, R32 = r32 / 16384, R33 = r33 / 16384;
  bm11 = R11 * cs - R13 * sn; bm12 = 0; bm13 = R11 * sn + R13 * cs;
  bm21 = R21 * cs - R23 * sn; bm22 = R22; bm23 = R21 * sn + R23 * cs;
  bm31 = R31 * cs - R33 * sn; bm32 = R32; bm33 = R31 * sn + R33 * cs;
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  btx = R11 * dx + R13 * dz; bty = R21 * dx + R22 * dy + R23 * dz; btz = R31 * dx + R32 * dy + R33 * dz;
}

// entity e at distance dist (cm)
function drawPerson(e, dist) {
  pFog = fogOf(dist);
  let x = EX[e], y = EY[e], z = EZ[e];
  // a soft shadow on the ground
  if (dist < 6000) { M_shadow(x, y, z); }
  bodyMatrix(x, y, z, EYAW[e]);
  let cl = CLOL[ECLO[e]], sk = SKINL[ESKIN[e]];
  let ph = EPH[e], mv = EMOV[e], cr = ECRO[e];
  let swing = sind(ph) * 32 * mv, swing2 = 0 - swing;
  let knee1 = 0 - Math.max(0, sind(ph + 60)) * 45 * mv, knee2 = 0 - Math.max(0, sind(ph + 240)) * 45 * mv;
  let hipY = 92, sh = 146, lean = 0;
  if (cr == 1) { hipY = 58; sh = 110; swing = 70 + swing * 0.3; swing2 = 70 - swing * 0.3; knee1 = -115; knee2 = -100; lean = 12; }
  // v1.1: sitting in a vehicle (astride a motorbike)
  let seated = 0;
  if (EVEH[e] > 0) { seated = 1; swing = 82; swing2 = 82; knee1 = -88; knee2 = -88; lean = 8; if (VK[EVEH[e]] == 4) { swing = 62; swing2 = 62; knee1 = -70; knee2 = -70; lean = 22; } }
  let vest = MT_vest1 + (EVES[e] - 1) * 64;
  if (EVES[e] == 0) { vest = cl; }
  let gl = 32;
  let g = gunNow(e);
  if (g > 0) { if (GCLS[g] == 1) { gl = 12; } else { if (GCLS[g] >= 4) { gl = 46; } } }
  if (dist < 1900) {
    // legs: thigh at the hip, shin at the knee
    pbox(-9, hipY, 0, swing, -20, 0, 7, 20, 7.5, cl);
    pbox(9, hipY, 0, swing2, -20, 0, 7, 20, 7.5, cl);
    let k1y = hipY - 40 * cosd(swing), k1z = 40 * sind(swing), k2y = hipY - 40 * cosd(swing2), k2z = 40 * sind(swing2);
    pbox(-9, k1y, k1z, swing + knee1, -20, 0, 6.5, 20, 7, cl);
    pbox(9, k2y, k2z, swing2 + knee2, -20, 0, 6.5, 20, 7, cl);
    pbox(-9, k1y, k1z, swing + knee1, -42, 3, 6.5, 3, 9, MT_boots);
    pbox(9, k2y, k2z, swing2 + knee2, -42, 3, 6.5, 3, 9, MT_boots);
    pbox(0, hipY + 6, lean * 0.3, lean, 0, 0, 15, 8, 10, cl);
    pbox(0, hipY + 15, lean * 0.6, lean, 22, 0, 18, 22, 11, vest);
    if (EPACK[e] > 0) { pbox(0, hipY + 15, lean * 0.6, lean, 26, -16, 13, 19, 6, MT_pack); }
    pbox(0, sh + 6, lean * 1.2, 0, 11, 2, 10, 11, 10, sk);
    if (EHEL[e] > 0) { pbox(0, sh + 6, lean * 1.2, 0, 20, 1, 11.5, 5, 12, MT_helm1 + (EHEL[e] - 1) * 64); } else { pbox(0, sh + 6, lean * 1.2, 0, 21, 0, 10.5, 2.5, 10.5, MT_hair); }
    // arms holding the gun forward
    pbox(-17, sh, lean, 62, -14, 0, 5, 14, 5, cl);
    pbox(17, sh, lean, 55, -14, 0, 5, 14, 5, cl);
    pbox(-14, sh - 13, 22 + lean, 92, -12, 0, 4.5, 12, 4.5, sk);
    pbox(12, sh - 15, 18 + lean, 95, -10, 0, 4.5, 10, 4.5, sk);
    // the gun
    if (seated == 0) { pbox(5, sh - 18, 30 + lean, 92, 0, 0, 2.6, gl, 4, MT_gunBlack); }
  } else {
    if (dist < 8000) {
      pbox(-9, hipY, 0, swing, -44, 0, 7.5, 44, 8, cl);
      pbox(9, hipY, 0, swing2, -44, 0, 7.5, 44, 8, cl);
      pbox(0, hipY + 6, lean * 0.6, lean, 30, 0, 18, 30, 11, vest);
      pbox(0, sh + 6, lean * 1.2, 0, 11, 2, 10.5, 11.5, 10.5, sk);
      pbox(0, sh - 14, 24 + lean, 92, 0, 0, 14, 24, 6, cl);
    } else {
      pbox(0, hipY, 0, 0, -46, 0, 16, 46, 9, cl);
      pbox(0, hipY + 6, 0, lean, 34, 0, 19, 34, 12, vest);
      pbox(0, sh + 6, 0, 0, 11, 0, 11, 12, 11, sk);
    }
  }
  pflush();
}
function M_shadow(x, y, z) {
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  // a dark square on the ground under the feet (four corners through the camera)
  shadowPt(x - 35, y + 3, z - 35); s1 = shX; s2 = shY;
  if (shOK == 1) {
    shadowPt(x + 35, y + 3, z - 35); s3 = shX; s4 = shY;
    if (shOK == 1) {
      fillStop(); goto(s1, s2); fillColorHex(CT[MT_hair + 2 * 8 + pFog + 1]); fillStart(); goto(s3, s4);
      shadowPt(x + 35, y + 3, z + 35); goto(shX, shY);
      shadowPt(x - 35, y + 3, z + 35); goto(shX, shY);
      if (shOK == 0) { fillStop(); }
    }
  }
}
let shX = 0, shY = 0, shOK = 0;
function shadowPt(x, y, z) {
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  let vz = r31 * dx + r32 * dy + r33 * dz;
  shOK = 0;
  if (vz > NZ) { shX = (r11 * dx + r13 * dz) * FOC / vz; shY = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz; shOK = 1; }
}
