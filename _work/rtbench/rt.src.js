// Ray tracing / ray marching cost probe. W, H, MODE (1 trace, 2 march), DRAW injected by the build.
const CELL = 480 / W;
const FOC = 300;
let PAL = [];
let DX = [];
let DY = [];
let NX = [];
let NY = [];
let NZ = [];
let ROW = [];
let frames = 0, cx = 0, cz = 0, steps = 0, runs = 0;
function init() {
  let i = 0;
  while (i < 64) { PAL.push(rgb(i * 4, i * 3 + 40, 255 - i * 2)); i = i + 1; }
  i = 0;
  while (i < W) { DX.push(idiv((i * 2 - W + 1) * 240, W)); ROW.push(0); i = i + 1; }
  i = 0;
  while (i < H) { DY.push(idiv((H - 1 - i * 2) * 240, W)); i = i + 1; }
  let y = 1;
  while (y <= H) {
    let x = 1;
    while (x <= W) {
      let l = Math.sqrt(DX[x] * DX[x] + DY[y] * DY[y] + FOC * FOC);
      NX.push(Math.round(DX[x] * 1024 / l)); NY.push(Math.round(DY[y] * 1024 / l)); NZ.push(Math.round(FOC * 1024 / l));
      x = x + 1;
    }
    y = y + 1;
  }
}
function sdf(x, y, z) {
  let d = Math.floor(Math.sqrt((x - cx) * (x - cx) + (y - 256) * (y - 256) + (z - cz) * (z - cz))) - 256;
  if (y < d) { d = y; }
  return d;
}
function traceRow(y) {
  let dy = DY[y];
  let ocx = 0 - cx, ocz = -1024 - cz;
  let cc = ocx * ocx + ocz * ocz - 65536;
  let x = 1;
  while (x <= W) {
    let dx = DX[x];
    let c = 0;
    let a = dx * dx + dy * dy + FOC * FOC;
    let b = ocx * dx + ocz * FOC;
    let disc = b * b - a * cc;
    let hit = 0;
    if (b < 0) { if (disc > 0) { hit = 1; } }
    if (hit == 1) {
      let t = idiv((0 - b - Math.floor(Math.sqrt(disc))) * 1024, a);
      let nx = ocx + idiv(dx * t, 1024), ny = idiv(dy * t, 1024), nz = ocz + idiv(FOC * t, 1024);
      c = idiv(nx * -120 + ny * 180 + nz * -130, 1100) + 8;
      if (c < 4) { c = 4; }
    } else {
      if (dy < 0) {
        let t = idiv(262144, 0 - dy);
        let hx = idiv(dx * t, 1024), hz = idiv(FOC * t, 1024) - 1024;
        c = 30 + mod(idiv(hx, 256) + idiv(hz, 256), 2) * 20;
        let sx = hx - cx, sz = hz - cz;
        let sb = sx * -120 + 46080 + sz * -130;
        if (sb < 0) { if (sb * sb - 63700 * (sx * sx + sz * sz) > 0) { c = idiv(c, 2); } }
      } else { c = 60; }
    }
    ROW[x] = c;
    x = x + 1;
  }
}
function marchRow(y) {
  let x = 1;
  let k = (y - 1) * W;
  while (x <= W) {
    let nx = NX[k + x], ny = NY[k + x], nz = NZ[k + x];
    let t = 0, n = 0, c = 60, d = 0;
    let px = 0, py = 0, pz = 0;
    while (n < 40) {
      px = idiv(nx * t, 1024); py = 256 + idiv(ny * t, 1024); pz = idiv(nz * t, 1024) - 1024;
      d = Math.floor(Math.sqrt((px - cx) * (px - cx) + (py - 256) * (py - 256) + (pz - cz) * (pz - cz))) - 256;
      if (py < d) { d = py; }
      n = n + 1;
      if (d < 3) { n = 100; }
      t = t + d;
      if (t > 6000) { n = 50; }
    }
    steps = steps + n;
    if (n >= 100) {
      let gx = sdf(px + 4, py, pz) - d, gy = sdf(px, py + 4, pz) - d, gz = sdf(px, py, pz + 4) - d;
      c = (gx * -30 + gy * 45 + gz * -32) + 30;
      if (c < 4) { c = 4; }
      if (c > 63) { c = 63; }
    }
    ROW[x] = c;
    x = x + 1;
  }
}
function drawRow(y) {
  let sy = 135 - (y - 0.5) * CELL;
  let x = 2, x0 = 1, cur = ROW[1];
  while (x <= W + 1) {
    let c = -1;
    if (x <= W) { c = ROW[x]; }
    if (c != cur) {
      penColorHex(PAL[cur + 1]);
      goto((x0 - 1) * CELL - 240, sy); penDown(); goto((x - 1) * CELL - 240, sy); penUp();
      runs = runs + 1;
      x0 = x; cur = c;
    }
    x = x + 1;
  }
}
on('start', 'cam', function () {
  hide(); init(); penSize(CELL);
  for (;;) {
    eraseAll();
    cx = Math.round(sind(frames * 3) * 400); cz = Math.round(cosd(frames * 3) * 300);
    let y = 1;
    while (y <= H) {
      if (MODE == 1) { traceRow(y); } else { marchRow(y); }
      if (DRAW == 1) { drawRow(y); }
      y = y + 1;
    }
    frames = frames + 1;
  }
});
