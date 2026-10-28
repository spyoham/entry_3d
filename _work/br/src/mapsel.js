// ===================================================================== v1.3: the maps
// Every map's lists are in the work, packed (build.mjs): mapLoad(m) puts map m's into the lists the
// game reads (loadMapLists, made by the build), then works out what was left out to save room:
// where each cell's things, ground and road pieces start, where each node's edges start.
let curMap = 0, mapSel = 1, fogSky = '#b9c3c9';
let SITEN = [], CI0 = [], TC0 = [], RC0 = [], NE0 = [], CT = [], TPA = [], TPB = [], TPC = [], TPD = [];
function mapsInit() {
  let i = 1;
  while (i <= CELLS * CELLS) { CI0.push(0); TC0.push(0); RC0.push(0); i = i + 1; }
  i = 1;
  while (i <= MAXND) { NE0.push(0); i = i + 1; }
  i = 1;
  while (i <= MAXTP) { TPA.push(0); TPB.push(0); TPC.push(0); TPD.push(0); i = i + 1; }
}
function mapLoad(m) {
  loadMapLists(m);
  curMap = m;
  let a = 1, b = 1, c = 1, i = 1;
  while (i <= CELLS * CELLS) { CI0[i] = a; TC0[i] = b; RC0[i] = c; a = a + CIN[i]; b = b + TCN[i]; c = c + RCN[i]; i = i + 1; }
  a = 1; i = 1;
  while (i <= N_NDX) { NE0[i] = a; a = a + NEN[i]; i = i + 1; }
  makeColours(m);
  // the land's quads: a cell of plain land has one on its corners, the rest (shore, water) stored
  let p = 1, q = 1, k = 0, g0 = 0;
  c = 1;
  while (c <= CELLS * CELLS) {
    g0 = idiv(c - 1, CELLS) * GRID + mod(c - 1, CELLS) + 1;
    if (Math.min(TH[g0], TH[g0 + 1], TH[g0 + GRID], TH[g0 + GRID + 1]) >= 0) { TPA[p] = g0; TPB[p] = g0 + GRID; TPC[p] = g0 + GRID + 1; TPD[p] = g0 + 1; p = p + 1; }
    else { k = 0; while (k < TCN[c]) { TPA[p] = TQA[q]; TPB[p] = TQB[q]; TPC[p] = TQC[q]; TPD[p] = TQD[q]; p = p + 1; q = q + 1; k = k + 1; } }
    c = c + 1;
  }
  // the ground's points: the grid's corners, then the extra points of shores, roads and skirts
  let n = GRID * GRID + N_EXX;
  i = 1;
  while (i <= n) {
    if (i <= GRID * GRID) { WPX[i] = mod(i - 1, GRID) * CS; WPZ[i] = idiv(i - 1, GRID) * CS; WPY[i] = TH[i]; }
    else { WPX[i] = EXX[i - GRID * GRID]; WPY[i] = EXY[i - GRID * GRID]; WPZ[i] = EXZ[i - GRID * GRID]; }
    i = i + 1;
  }
  // the town names, the sky and the sea
  while (SITEN.length > 0) { SITEN.removeAt(SITEN.length); }
  i = 1;
  while (i <= N_SITEX) { SITEN.push(MAPSN[MAPS0[m] + i]); i = i + 1; }
  skyTop = MSKY1[m]; skyMid = MSKY2[m]; fogSky = MSKY3[m]; seaCol = MSKY4[m];
}
// the colour table: each material's colour (or the map's own) in 8 shades, each in 8 steps of the
// map's fog - as build.mjs colourTables would make it
let HEXS = '0123456789abcdef';
function hex2(v) {
  let x = Math.max(0, Math.min(255, Math.round(v)));
  return `${charAt(HEXS, idiv(x, 16) + 1)}${charAt(HEXS, mod(x, 16) + 1)}`;
}
function makeColours(m) {
  let fr = MFOGR[m], fg = MFOGG[m], fb = MFOGB[m];
  let i = 1, t = 1;
  while (i <= NMAT) {
    let r = MATR[i], g = MATG[i], b = MATB[i];
    let o = MOV0[m] + 1, oe = MOV0[m] + 1 + MOVN[m];
    while (o < oe) { if (MOVM[o] == i - 1) { r = MOVR[o]; g = MOVG[o]; b = MOVB[o]; } o = o + 1; }
    let s = 0;
    while (s < 8) {
      let k = 0.5 + s / 14, f = 0;
      while (f < 8) {
        let fo = 0;
        if (f > 0) { fo = Math.min(0.92, f / 7 * 0.92); }
        let col = `#${hex2(r * k * (1 - fo) + fr * fo)}${hex2(g * k * (1 - fo) + fg * fo)}${hex2(b * k * (1 - fo) + fb * fo)}`;
        if (t > CT.length) { CT.push(col); } else { CT[t] = col; }
        t = t + 1; f = f + 1;
      }
      s = s + 1;
    }
    i = i + 1;
  }
}
// the menu: one button a map (a click loads it, so the picture beside shows it)
function mapButtons() {
  tx(50, '맵', -30, 99, 8, C_DIM, 1);
  let k = 1;
  while (k <= NMAP) {
    if (btn(-30, 92 - k * 22, 50, 108 - k * 22, 46 + k, MAPN[k], b01(mapSel == k), 9) == 1) { mapSel = k; if (curMap != k) { mapLoad(k); } }
    k = k + 1;
  }
}
