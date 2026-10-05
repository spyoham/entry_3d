// ============================================================
// Entry Ray Tracer - constants, tables, scene
//
// Units
//   world: 1 unit = WS (1024). Everything the renderer adds, subtracts or
//          multiplies is a whole number (tessvm takes a fast path for those);
//          only a division or a root makes a fraction, and it is floored at once.
//   screen: u = -240..240 to the right, v = 135..-135 upwards, focal length FOC.
//          Run edges are kept in quarter units: X = 4u (-960..960).
// ============================================================
const WS = 1024;
const FOC = 300;
const FF = FOC * FOC;
const BIG = 1000000000000000000;
const NS = 1;                 // spheres
const RUNP = 5000;            // runs a store can hold (a list holds 5000 items at most on playentry)
const PALN = 4096;
const AMB = 74;               // light a shadowed point still gets, of 256
const DIFK = 182;             // the sun's share (AMB + DIFK = 256)
const CELL = 1024;            // floor tile
const C4 = 4 * CELL * 4194304; // a tile in the row's scaled world units (x 4 * 2^22)
const FOGDIV = 59000000;      // squared distance per fog step (step 63 = 60 units)
const GN = 32;                // shadow grid cells per side
const GOFF = 16384;           // world offset of the grid's corner
const FADE0 = 56;             // tiles per pixel (x256) where the floor pattern starts to fade
const FADE1 = 150;            //   ... and where it is gone
const NEARC = 24;
const CW = 512;               // room for one key row's rays, by pixel
const RG = 8;                 // the mirror map: cells along a cube face
const RG2 = RG * RG;
const RMN = 6 * RG2;
const SIGKR = 100 * 256;      // a mirror at least this strong has the edges in its reflection searched for

// ---- camera ----
let camX = 0, camY = 0, camZ = 0, yaw = 0, pitch = 0;
let gRx = 0, gRz = 0, gFx = 0, gFy = 0, gFz = 0, gUx = 0, gUy = 0, gUz = 0;
let gLx = 0, gLy = 0, gLz = 0, gLL = 0;
// ---- light (world, x1024) ----
let LWX = 0, LWY = 0, LWZ = 0;
// ---- quality ----
let rowH = 1, stride = 4, nrow = 270, v0 = 135, dither = 1, bisGap = 2;
// ---- the row being drawn (shared by the row's functions) ----
let rMode = 0, vreuse = 1;
let rK = 0, rV = 0, rA0 = 0, rYrow = 0, rDth = 8, rPc = 0, rPx0 = 0;
let bgN = 0, bgPtr = 1, bgVal = 0, bgMode = 0, rXs4 = 0, rZs4 = 0, rDxs = 0, rDzs = 0, rStX = 0, rStZ = 0;
// ---- counters ----
let nrun = 0, nused = 0, nsamp = 0, frames = 0, flatK = 63, rStamp = 8;
// the run store being filled: where its colour lists start, its first run - 1, its last run
let sBase = 0, sTwo = 0, sSpill = 0, sUsedA = 0;
// what mirrorCell and floorShade hand back
let mCell = 0, fShade = 0, mR = 0, mG = 0, mB = 0;
// 1: a small mirror triangle is traced once a picture; 2: never (TSML is 0 or 1, so 2 matches none)
let facetOnce = 1, weakStride = 1;
// 1: a faint mirror (below SIGKR) shows only floor and sky; 0: every mirror shows everything
let weakMirror = WEAK;

// ---- tables ----
let PAL = [];        // 4096 colours, index r*256 + g*16 + b + 1 (each 0..15)
let SKYR = [];       // sky by sin^2 of the elevation, 64 steps
let SKYG = [];
let SKYB = [];
let FLR = [];        // floor: fog step*4 + tile*2 + shadow + 1
let FLG = [];
let FLB = [];
let SPECT = [];      // highlight by cos^2 of the angle to the sun's mirror direction, 257 steps
let DTH = [];        // row dither offsets
let ROWSEQ = [];     // the order rows are drawn in
let ROWMD = [];      //   and how: 0 traced, 1 key row (traced and kept), 2 between two key rows
let CS = [];         // two key rows' rays: what they met (with the row's stamp) and their colour
let CC = [];

// ---- spheres: world ----
let SWX = [];
let SWY = [];
let SWZ = [];
let SRAD = [];
let SMR = [];        // colour 0..255
let SMG = [];
let SMB = [];
let SKR = [];        // mirror share 0..256
let SSPC = [];       // highlight strength 0..256
// ---- spheres: per frame (camera space) ----
let SA = [];         // centre: right, up, forward
let SB = [];
let SC = [];
let SK = [];         // a^2 + b^2 + c^2 - r^2
let SQ = [];         // b^2 + c^2 - r^2
let SR2 = [];        // r^2
let SRK = [];        // r * 1024
let SMRK = [];       // colour * (256 - mirror)
let SMGK = [];
let SMBK = [];
let SKR2 = [];       // mirror * 256
let SER = [];        // how the sphere looks in another mirror: colour * (1 - mirror)
let SEG = [];
let SEB = [];
let SEKR = [];       //   + sky * mirror
let SEKG = [];
let SEKB = [];
let SK0 = [];        // rows the sphere can be in
let SK1 = [];
let SS0 = [];        // rows its floor shadow can be in
let SS1 = [];
let SG = [];         // per row: b*v + c*FOC
let SHC = [];        // who can shade sphere i: SHC[SHC0[i] .. SHC1[i]-1]
let SHC0 = [];
let SHC1 = [];
let RFC = [];        // who can show in sphere i's mirror
let RFC0 = [];
let RFC1 = [];
let ACT = [];        // the spheres covering the stretch being traced
let RMAP = [];       // mirror maps: (i-1)*RMN + face*RG2 + a*RG + b + 1
let CDX = [];        // the cells' directions (x1024)
let CDY = [];
let CDZ = [];
let PAX = [];        // per pair, while a map is made: the line of centres and the cone's limit
let PAY = [];
let PAZ = [];
let PTH = [];
let GRID = [];       // floor shadow grid: 0 none, i one sphere, -1 several
let GTOUCH = [];
let ngt = 0;
// ---- per row ----
let SPX0 = [];       // spans of the row, sorted by left edge
let SPX1 = [];
let SPI = [];
let SPK = [];        // the same, packed for sorting
let ACE = [];        // where each thing over the stretch ends
let SHX0 = [];       // floor shadow intervals of the row
let SHX1 = [];
let BGX = [];        // background changes: at X the value becomes BGV
let BGV = [];
let FCL = [];        // the row's four floor colours: tile*2 + shadow + 1
let SKU = [];
// ---- runs ----
let RX0 = [];
let RX1 = [];
let RY = [];
let RN = [];
let HEAD = [];
let USED = [];
let RX0B = [];       // the second store
let RX1B = [];
let RYB = [];
let RNB = [];
let HEADB = [];
let USEDB = [];
let P3 = [1, 3, 9, 27, 81, 243, 729, 2187];

function fillList0() {
  let i = 0;
  while (i < RUNP) { RX0.push(0); RX1.push(0); RY.push(0); RN.push(0); RX0B.push(0); RX1B.push(0); RYB.push(0); RNB.push(0); i = i + 1; }
  i = 0;
  while (i < PALN) { HEAD.push(0); USED.push(0); HEADB.push(0); USEDB.push(0); i = i + 1; }
  i = 0;
  while (i < NS + NT + 3) { SPX0.push(0); SPX1.push(0); SPI.push(0); SHX0.push(0); SHX1.push(0); ACT.push(0); ACE.push(0); SPK.push(0); i = i + 1; }
  i = 0;
  while (i < NS + NM + 1) {
    SA.push(0); SB.push(0); SC.push(0); SK.push(0); SQ.push(0); SR2.push(0); SRK.push(0);
    SMRK.push(0); SMGK.push(0); SMBK.push(0); SKR2.push(0);
    SER.push(0); SEG.push(0); SEB.push(0); SEKR.push(0); SEKG.push(0); SEKB.push(0);
    SK0.push(0); SK1.push(0); SS0.push(0); SS1.push(0); SG.push(0);
    SHC0.push(0); SHC1.push(0); RFC0.push(0); RFC1.push(0);

    i = i + 1;
  }
  i = 0;
  while (i < NS * NS + 2) { SHC.push(0); RFC.push(0); i = i + 1; }
  i = 0;
  while (i < GN * GN) { GRID.push(0); GTOUCH.push(0); i = i + 1; }
  i = 0;
  while (i < 160) { BGX.push(0); BGV.push(0); SKU.push(0); i = i + 1; }
  i = 0;
  while (i < NS * RMN) { RMAP.push(0); i = i + 1; }
  i = 0;
  while (i < (NS + NM) * (NS + NM) + 1) { PAX.push(0); PAY.push(0); PAZ.push(0); PTH.push(0); i = i + 1; }
  // the cube's cells: face 0/1 = +x/-x (a = y, b = z), 2/3 = +y/-y (a = x, b = z), 4/5 = +z/-z (a = x, b = y)
  let f = 0;
  while (f < 6) {
    let ca = 0;
    while (ca < RG) {
      let cb = 0;
      while (cb < RG) {
        let s = (ca + 0.5) * 2 / RG - 1, t = (cb + 0.5) * 2 / RG - 1;
        let n = 1024 / Math.sqrt(1 + s * s + t * t);
        let sg = n;
        if (mod(f, 2) == 1) { sg = 0 - n; }
        if (f < 2) { CDX.push(Math.round(sg)); CDY.push(Math.round(s * n)); CDZ.push(Math.round(t * n)); }
        else {
          if (f < 4) { CDX.push(Math.round(s * n)); CDY.push(Math.round(sg)); CDZ.push(Math.round(t * n)); }
          else { CDX.push(Math.round(s * n)); CDY.push(Math.round(t * n)); CDZ.push(Math.round(sg)); }
        }
        cb = cb + 1;
      }
      ca = ca + 1;
    }
    f = f + 1;
  }
  i = 0;
  while (i < 4) { FCL.push(0); DTH.push(8); i = i + 1; }
  i = 0;
  while (i < 272) { ROWSEQ.push(0); ROWMD.push(0); i = i + 1; }
  i = 0;
  while (i < CW * 2 + 2) { CS.push(0); CC.push(0); i = i + 1; }
}

function buildTables() {
  // palette
  let r = 0;
  while (r < 16) {
    let g = 0;
    while (g < 16) {
      let b = 0;
      while (b < 16) { PAL.push(rgb(r * 17, g * 17, b * 17)); b = b + 1; }
      g = g + 1;
    }
    r = r + 1;
  }
  // sky: horizon haze -> zenith blue, by the sine of the elevation
  let i = 0;
  while (i < 64) {
    let w = Math.sqrt(Math.sqrt(i / 63));
    SKYR.push(Math.round(222 - 172 * w));
    SKYG.push(Math.round(232 - 124 * w));
    SKYB.push(Math.round(242 - 38 * w));
    i = i + 1;
  }
  // floor: two tiles, lit or shaded, fading into the horizon colour
  let litf = AMB + idiv(DIFK * LWY, 1024);
  let hzR = SKYR[1], hzG = SKYG[1], hzB = SKYB[1];
  flatK = 63;
  let k = 0;
  while (k < 64) {
    let fog = 1.16 * k / (k + 10);
    if (fog > 1) { fog = 1; }
    let tile = 0;
    while (tile < 2) {
      let br = 232, bg = 228, bb = 216;
      if (tile == 1) { br = 44; bg = 66; bb = 112; }
      let sh = 0;
      while (sh < 2) {
        let lf = litf;
        if (sh == 1) { lf = AMB; }
        FLR.push(Math.round(br * lf / 256 * (1 - fog) + hzR * fog));
        FLG.push(Math.round(bg * lf / 256 * (1 - fog) + hzG * fog));
        FLB.push(Math.round(bb * lf / 256 * (1 - fog) + hzB * fog));
        sh = sh + 1;
      }
      tile = tile + 1;
    }
    // from this fog step on the two tiles are one colour: a mirror need not tell them apart
    if (flatK == 63) {
      if (Math.abs(FLR[k * 4 + 1] - FLR[k * 4 + 3]) < 9) { if (Math.abs(FLB[k * 4 + 1] - FLB[k * 4 + 3]) < 9) { flatK = k; } }
    }
    k = k + 1;
  }
  // highlight: cos^2 -> cos^64
  i = 0;
  while (i <= 256) {
    let x = i / 256;
    x = x * x; x = x * x; x = x * x; x = x * x; x = x * x;
    SPECT.push(Math.round(255 * x));
    i = i + 1;
  }
}

function addSphere(x, y, z, r, cr, cg, cb, kr, sp) {
  SWX.push(Math.round(x * WS)); SWY.push(Math.round(y * WS)); SWZ.push(Math.round(z * WS)); SRAD.push(Math.round(r * WS));
  SMR.push(cr); SMG.push(cg); SMB.push(cb); SKR.push(kr); SSPC.push(sp);
}

function sceneInit() {
  // the sun (towards it), length 1024
  LWX = -480; LWY = 800; LWZ = -420;
  let n = Math.sqrt(LWX * LWX + LWY * LWY + LWZ * LWZ);
  LWX = Math.round(LWX * 1024 / n); LWY = Math.round(LWY * 1024 / n); LWZ = Math.round(LWZ * 1024 / n);
  //         x     y     z     r     colour          mirror  highlight
  addSphere(0, 1.1, 0, 1.1, 236, 240, 246, 216, 256);        // the one ball: chrome, and it moves (animate)
  if (ABL > 0) { let i = 1; while (i <= NS) { SKR[i] = 0; if (ABL == 1) { SSPC[i] = 0; } i = i + 1; } }
  // the spheres round the meshes, as entries NS + 1 on (for "can a ray get there" and for keeping the camera out)
  let m = 1;
  while (m <= NM) {
    SWX.push(MBCX[m]); SWY.push(MBCY[m]); SWZ.push(MBCZ[m]); SRAD.push(MBCR[m]);
    SR2[NS + m] = MBCR[m] * MBCR[m];
    m = m + 1;
  }
  camX = Math.round(5.5 * WS); camY = Math.round(1.8 * WS); camZ = Math.round(-7.8 * WS); yaw = -18; pitch = -7;
}

// the moving parts: t in seconds
function animate(t) {
  // the ball goes round behind the car, hopping
  let a = t * 44;
  SWX[1] = Math.round((-1.5 + sind(a) * 2.4) * WS);
  SWZ[1] = Math.round((4.5 + cosd(a) * 2.4) * WS);
  SWY[1] = Math.round((1.1 + 1.3 * Math.abs(sind(t * 120))) * WS);
  // the top drifts round a small circle, as a spinning top does
  MOX[3] = Math.round(sind(t * 70) * 0.4 * WS);
  MOZ[3] = Math.round(cosd(t * 70) * 0.4 * WS);
}
