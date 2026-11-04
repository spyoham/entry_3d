// ============================================================
// The store: every list the simulation and the picture use, made to their full
// length once at the start (writes are then plain `A[i] = v`; a scene that is
// loaded again only resets the counts)
// ============================================================

// ---- soft bodies: nodes ----
// P position, V velocity, F force, Q position before the step (fast mode),
// NIM 1 / mass (0: pinned), NMS mass, NKC NCD contact stiffness and damping,
// NCB the body it is in contact with (friction), NCS the step of that contact,
// U the stretch of the friction spring, NSB its soft body, NE energy density (colour)
let PX = [], PY = [], PZ = [], VX = [], VY = [], VZ = [], FX = [], FY = [], FZ = [];
let QX = [], QY = [], QZ = [], NIM = [], NMS = [], NKC = [], NCD = [], NCB = [], NCS = [];
let UX = [], UY = [], UZ = [], NSB = [], NE = [], NEC = [];
// fast mode: the velocity change, the residual, the search direction, its image
let DVX = [], DVY = [], DVZ = [], RRX = [], RRY = [], RRZ = [], PPX = [], PPY = [], PPZ = [], CX = [], CY = [], CZ = [];
// ---- soft bodies: tetrahedra ----
// TA..TD corners, M11..M33 the inverse of the rest shape, TV rest volume,
// TMU TLA TAL the Stable Neo-Hookean mu, lambda, alpha, TET viscosity
let TA = [], TB = [], TC = [], TD = [];
let M11 = [], M12 = [], M13 = [], M21 = [], M22 = [], M23 = [], M31 = [], M32 = [], M33 = [];
let TV = [], TMU = [], TLA = [], TAL = [], TET = [];
// (fast mode: the rotation of each tetrahedron, kept from step to step)
let TQW = [], TQX = [], TQY = [], TQZ = [];
let TR11 = [], TR12 = [], TR13 = [], TR21 = [], TR22 = [], TR23 = [], TR31 = [], TR32 = [], TR33 = [];
// surface nodes
let SVN = [];
// ---- soft bodies: one entry a body ----
let SBN0 = [], SBN1 = [], SBT0 = [], SBT1 = [], SBS0 = [], SBS1 = [], SBF0 = [], SBF1 = [];
let SBMU = [], SBH = [], SBC = [], SBE = [], SBNU = [], SBRHO = [], SBDT = [];
let SBX0 = [], SBX1 = [], SBY0 = [], SBY1 = [], SBZ0 = [], SBZ1 = [];
let nN = 0, nT = 0, nSV = 0, nSB = 0;

// ---- rigid bodies (1 is the ground: the plane y = 0, never moves) ----
// R position, RQ orientation (w x y z), RV velocity, RL angular momentum (world),
// RW angular velocity, RIM 1 / mass, RI inertia of the body's own axes, RII its inverse,
// RK kind (0 ground, 1 sphere, 2 box), RA RB RC radius / half sizes, RBR bounding radius,
// RE restitution, RMU friction, R11..R33 rotation (from RQ), RF RT force and torque
// from the soft bodies, RP RPW the pseudo velocities that push bodies apart
let RX = [], RY = [], RZ = [], RQW = [], RQX = [], RQY = [], RQZ = [];
let RVX = [], RVY = [], RVZ = [], RLX = [], RLY = [], RLZ = [], RWX = [], RWY = [], RWZ = [];
let RIM = [], RMS = [], RI1 = [], RI2 = [], RI3 = [], RII1 = [], RII2 = [], RII3 = [];
let RK = [], RA = [], RB = [], RC = [], RBR = [], RE = [], RMU = [], RCR = [], RCG = [], RCB = [];
let R11 = [], R12 = [], R13 = [], R21 = [], R22 = [], R23 = [], R31 = [], R32 = [], R33 = [];
let RFX = [], RFY = [], RFZ = [], RTX = [], RTY = [], RTZ = [];
let RPX = [], RPY = [], RPZ = [], RPWX = [], RPWY = [], RPWZ = [];
let RL0 = [], RL1 = [];
// soft contacts on each body: counted this step, and in the last (fast mode)
let RKC = [], RKN = [], REM = [];
// 1: only to be seen (a stand that holds what is pinned): soft bodies pass it by
let RNS = [];
let nR = 1;

// ---- contacts between rigid bodies ----
// CA CB the bodies (the normal points from B to A), CP the point, CN the normal, CD the depth
// (< 0: a gap), CAX.. CBX.. the arms, CT1 CT2 the tangents, CAN.. the angular answer of A
// to a unit push along n, t1, t2 (and CBN.. of B), CKN CKT1 CKT2 the effective masses,
// CVT the wanted normal speed, CLN CLT1 CLT2 CLP the impulses so far, CMU friction
let CA = [], CB = [], CPX = [], CPY = [], CPZ = [], CNX = [], CNY = [], CNZ = [], CD = [];
let CAX = [], CAY = [], CAZ = [], CBX = [], CBY = [], CBZ = [];
let CT1X = [], CT1Y = [], CT1Z = [], CT2X = [], CT2Y = [], CT2Z = [];
let CANX = [], CANY = [], CANZ = [], CA1X = [], CA1Y = [], CA1Z = [], CA2X = [], CA2Y = [], CA2Z = [];
let CBNX = [], CBNY = [], CBNZ = [], CB1X = [], CB1Y = [], CB1Z = [], CB2X = [], CB2Y = [], CB2Z = [];
let CKN = [], CKT1 = [], CKT2 = [], CVT = [], CLN = [], CLT1 = [], CLT2 = [], CLP = [], CMU = [];
let nC = 0, nCMax = 0, nP = 0, itSum = 0;
// each contact's key, and the keys and impulses of the last step's contacts
let CK = [], PK = [], PLN = [], PLT1 = [], PLT2 = [];
// corners of the two boxes of a pair (1..8 the first, 9..16 the second)
let KX = [], KY = [], KZ = [];
let SGX = [-1, 1, -1, 1, -1, 1, -1, 1], SGY = [-1, -1, 1, 1, -1, -1, 1, 1], SGZ = [-1, -1, -1, -1, 1, 1, 1, 1];
let EGA = [1, 3, 5, 7, 1, 2, 5, 6, 1, 2, 3, 4], EGB = [2, 4, 6, 8, 3, 4, 7, 8, 5, 6, 7, 8];

// ---- the picture ----
// render vertices: the soft nodes are 1..nN, the vertices of rigid bodies RVO + 1..
// (LX LY LZ in their body's own frame, LB the body); W world, S stage, TZ depth
let LX = [], LY = [], LZ = [], LB = [];
let WX = [], WY = [], WZ = [], SX = [], SY = [], TZ = [];
// faces: GA..GD corners (GD = 0: a triangle), GR GG GBL colour, GS the soft body (0: rigid),
// LK the next face in the same depth bucket, CL its colour this picture
let GA = [], GB = [], GC = [], GD = [], GR = [], GG = [], GBL = [], GS = [], LK = [], CL = [];
let HD = [];
let nL = 0, nF = 0;
let HX = [];

function allocAll() {
  let i = 1;
  while (i <= NCAP) {
    PX.push(0); PY.push(0); PZ.push(0); VX.push(0); VY.push(0); VZ.push(0); FX.push(0); FY.push(0); FZ.push(0);
    QX.push(0); QY.push(0); QZ.push(0); NIM.push(0); NMS.push(0); NKC.push(0); NCD.push(0); NCB.push(0); NCS.push(0);
    UX.push(0); UY.push(0); UZ.push(0); NSB.push(0); NE.push(0); NEC.push(0); SVN.push(0); NPD.push(0); CNL.push(0); CNA.push(0); CNB.push(0); CNC.push(0); CNT.push(0); ZD.push(1); ZB.push(1); KCN.push(0); KCD.push(0);
    DVX.push(0); DVY.push(0); DVZ.push(0); RRX.push(0); RRY.push(0); RRZ.push(0); PPX.push(0); PPY.push(0); PPZ.push(0); CX.push(0); CY.push(0); CZ.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= TCAP) {
    TA.push(0); TB.push(0); TC.push(0); TD.push(0);
    M11.push(0); M12.push(0); M13.push(0); M21.push(0); M22.push(0); M23.push(0); M31.push(0); M32.push(0); M33.push(0);
    TV.push(0); TMU.push(0); TLA.push(0); TAL.push(0); TET.push(0); TQW.push(1); TQX.push(0); TQY.push(0); TQZ.push(0);
    TR11.push(1); TR12.push(0); TR13.push(0); TR21.push(0); TR22.push(1); TR23.push(0); TR31.push(0); TR32.push(0); TR33.push(1);
    i = i + 1;
  }
  i = 1;
  while (i <= SBCAP) {
    SBN0.push(0); SBN1.push(0); SBT0.push(0); SBT1.push(0); SBS0.push(0); SBS1.push(0); SBF0.push(0); SBF1.push(0);
    SBMU.push(0); SBH.push(0); SBC.push(0); SBE.push(0); SBNU.push(0); SBRHO.push(0); SBDT.push(0);
    SBX0.push(0); SBX1.push(0); SBY0.push(0); SBY1.push(0); SBZ0.push(0); SBZ1.push(0); SBO.push(0);
    OX0.push(0); OX1.push(0); OY0.push(0); OY1.push(0); OZ0.push(0); OZ1.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= RCAP) {
    RX.push(0); RY.push(0); RZ.push(0); RQW.push(1); RQX.push(0); RQY.push(0); RQZ.push(0);
    RVX.push(0); RVY.push(0); RVZ.push(0); RLX.push(0); RLY.push(0); RLZ.push(0); RWX.push(0); RWY.push(0); RWZ.push(0);
    RIM.push(0); RMS.push(0); RI1.push(0); RI2.push(0); RI3.push(0); RII1.push(0); RII2.push(0); RII3.push(0);
    RK.push(0); RA.push(0); RB.push(0); RC.push(0); RBR.push(0); RE.push(0); RMU.push(0); RCR.push(0); RCG.push(0); RCB.push(0);
    R11.push(1); R12.push(0); R13.push(0); R21.push(0); R22.push(1); R23.push(0); R31.push(0); R32.push(0); R33.push(1);
    RFX.push(0); RFY.push(0); RFZ.push(0); RTX.push(0); RTY.push(0); RTZ.push(0);
    RPX.push(0); RPY.push(0); RPZ.push(0); RPWX.push(0); RPWY.push(0); RPWZ.push(0);
    RL0.push(0); RL1.push(0); SRC.push(0); RKC.push(0); RKN.push(1); REM.push(0); RNS.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= CCAP) {
    CA.push(0); CB.push(0); CPX.push(0); CPY.push(0); CPZ.push(0); CNX.push(0); CNY.push(0); CNZ.push(0); CD.push(0);
    CAX.push(0); CAY.push(0); CAZ.push(0); CBX.push(0); CBY.push(0); CBZ.push(0);
    CT1X.push(0); CT1Y.push(0); CT1Z.push(0); CT2X.push(0); CT2Y.push(0); CT2Z.push(0);
    CANX.push(0); CANY.push(0); CANZ.push(0); CA1X.push(0); CA1Y.push(0); CA1Z.push(0); CA2X.push(0); CA2Y.push(0); CA2Z.push(0);
    CBNX.push(0); CBNY.push(0); CBNZ.push(0); CB1X.push(0); CB1Y.push(0); CB1Z.push(0); CB2X.push(0); CB2Y.push(0); CB2Z.push(0);
    CKN.push(0); CKT1.push(0); CKT2.push(0); CVT.push(0); CLN.push(0); CLT1.push(0); CLT2.push(0); CLP.push(0); CMU.push(0);
    CK.push(0); PK.push(0); PLN.push(0); PLT1.push(0); PLT2.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= 16) { KX.push(0); KY.push(0); KZ.push(0); i = i + 1; }
  i = 1;
  while (i <= RCAP * 26) { PDE.push(0); i = i + 1; }
  i = 1;
  while (i <= HN) { HH.push(0); HS.push(0); i = i + 1; }
  i = 1;
  while (i <= HECAP) { HEN.push(0); HET.push(0); i = i + 1; }
  i = 1;
  while (i <= ZCAP) {
    SSA.push(0); SSB.push(0); SSC.push(0); SSD.push(0); SPX.push(0); SPY.push(0); SPZ.push(0); SNX.push(0); SNY.push(0); SNZ.push(0);
    SE1X.push(0); SE1Y.push(0); SE1Z.push(0); SE2X.push(0); SE2Y.push(0); SE2Z.push(0); S00.push(0); S01.push(0); S11.push(0); SDN.push(1);
    i = i + 1;
  }
  i = 1;
  while (i <= 64) { GRL.push(0); GRX.push(0); GRY.push(0); GRZ.push(0); i = i + 1; }
  i = 1;
  while (i <= TRCAP) {
    YA.push(0); YB.push(0); YC.push(0); Y1X.push(0); Y1Y.push(0); Y1Z.push(0); Y2X.push(0); Y2Y.push(0); Y2Z.push(0);
    YNX.push(0); YNY.push(0); YNZ.push(0); Y00.push(0); Y01.push(0); Y11.push(0); YDN.push(1);
    i = i + 1;
  }
  i = 1;
  while (i <= LCAP) { LX.push(0); LY.push(0); LZ.push(0); LB.push(0); i = i + 1; }
  i = 1;
  while (i <= RVO + LCAP) { WX.push(0); WY.push(0); WZ.push(0); SX.push(0); SY.push(0); TZ.push(0); i = i + 1; }
  i = 1;
  while (i <= FCAP) { GA.push(0); GB.push(0); GC.push(0); GD.push(0); GR.push(0); GG.push(0); GBL.push(0); GS.push(0); LK.push(0); CL.push('#000000'); i = i + 1; }
  i = 1;
  while (i <= NBK) { HD.push(0); i = i + 1; }
  i = 0;
  while (i < 256) { HX.push(str(charAt(HEX, idiv(i, 16) + 1), charAt(HEX, i % 16 + 1))); i = i + 1; }
}

// ---- rotation of a rigid body: R from RQ (normalised first) ----
function rigidMatrix(r) {
  let w = RQW[r], x = RQX[r], y = RQY[r], z = RQZ[r], n = 0;
  n = Math.sqrt(w * w + x * x + y * y + z * z);
  w = w / n; x = x / n; y = y / n; z = z / n;
  RQW[r] = w; RQX[r] = x; RQY[r] = y; RQZ[r] = z;
  R11[r] = 1 - 2 * (y * y + z * z); R12[r] = 2 * (x * y - w * z); R13[r] = 2 * (x * z + w * y);
  R21[r] = 2 * (x * y + w * z); R22[r] = 1 - 2 * (x * x + z * z); R23[r] = 2 * (y * z - w * x);
  R31[r] = 2 * (x * z - w * y); R32[r] = 2 * (y * z + w * x); R33[r] = 1 - 2 * (x * x + y * y);
}
// (ox, oy, oz) = (inverse world inertia of r) (vx, vy, vz)
function M_iinv(r, vx, vy, vz, ox, oy, oz) {
  iu1 = (R11[r] * vx + R21[r] * vy + R31[r] * vz) * RII1[r];
  iu2 = (R12[r] * vx + R22[r] * vy + R32[r] * vz) * RII2[r];
  iu3 = (R13[r] * vx + R23[r] * vy + R33[r] * vz) * RII3[r];
  ox = R11[r] * iu1 + R12[r] * iu2 + R13[r] * iu3;
  oy = R21[r] * iu1 + R22[r] * iu2 + R23[r] * iu3;
  oz = R31[r] * iu1 + R32[r] * iu2 + R33[r] * iu3;
}
// angular velocity from angular momentum
function rigidOmega(r) {
  let ox = 0, oy = 0, oz = 0;
  M_iinv(r, RLX[r], RLY[r], RLZ[r], ox, oy, oz);
  RWX[r] = ox; RWY[r] = oy; RWZ[r] = oz;
}
// angular momentum from angular velocity: L = R I R^T w
function rigidMomentum(r) {
  iu1 = (R11[r] * RWX[r] + R21[r] * RWY[r] + R31[r] * RWZ[r]) * RI1[r];
  iu2 = (R12[r] * RWX[r] + R22[r] * RWY[r] + R32[r] * RWZ[r]) * RI2[r];
  iu3 = (R13[r] * RWX[r] + R23[r] * RWY[r] + R33[r] * RWZ[r]) * RI3[r];
  RLX[r] = R11[r] * iu1 + R12[r] * iu2 + R13[r] * iu3;
  RLY[r] = R21[r] * iu1 + R22[r] * iu2 + R23[r] * iu3;
  RLZ[r] = R31[r] * iu1 + R32[r] * iu2 + R33[r] * iu3;
}
