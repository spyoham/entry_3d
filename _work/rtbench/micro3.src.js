// The mirror path of one sample, alone in a small function: what could a ray cost at best?
let T1 = []; let T2 = []; let T3 = []; let res = 0, frames = 0;
function init() { let i = 0; while (i < 300) { T1.push(mod(i * 7, 255)); T2.push(mod(i * 13, 255)); T3.push(mod(i * 29, 255)); i = i + 1; } }
function bench(n) {
  let lx = -480, ly = 700, lz = -420, LL = 896800, uy = 1016, fy_ = -125, ux = 0, uz = 0, fx_ = 0, fz_ = 1016, rx_ = 1024, rz_ = 0;
  let cmx = 0, cmy = 1945, cmz = -7372, dth = 8, v = -20, A0 = 90400;
  let sa = 0, sb = -300, sc = 7300, sk = 51020000, sg = 2196000, sr2 = 2359296, srk = 1572864, mrk = 9440, mgk = 9600, mbk = 9840, kr2 = 55296, ssp = 256;
  let it = 0, u = 0, s = 0;
  let A = 0, bq = 0, disc = 0, tq = 0, px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0, nl = 0, li = 0, dn = 0, rx = 0, ry = 0, rz = 0, ar = 0, sd = 0, spd = 0;
  let dw = 0, hp = 0, t2 = 0, ex = 0, ey = 0, ez = 0, kf2 = 0, fx = 0, fy = 0, fz = 0, wxx = 0, wzz = 0, fpar = 0, fi = 0, c2r = 0, c2g = 0, c2b = 0, qr = 0, qg = 0, qb = 0, si = 0;
  while (it < n) {
    u = mod(it, 60) - 30;
    A = u * u + A0;
    bq = sa * u + sg;
    disc = bq * bq - A * sk;
    if (disc < 0) { disc = 0; }
    tq = idiv((bq - Math.sqrt(disc)) * 4096, A);
    px = idiv(u * tq, 4096); py = idiv(v * tq, 4096); pz = idiv(300 * tq, 4096);
    nx = px - sa; ny = py - sb; nz = pz - sc;
    nl = nx * lx + ny * ly + nz * lz;
    li = 74;
    if (nl > 0) { li = 74 + idiv(nl * 182, srk); }
    spd = dth * 65536;
    dn = u * nx + v * ny + 300 * nz;
    rx = 2 * u - idiv(4 * dn * nx, sr2); ry = 2 * v - idiv(4 * dn * ny, sr2); rz = 600 - idiv(4 * dn * nz, sr2);
    ar = rx * rx + ry * ry + rz * rz;
    sd = rx * lx + ry * ly + rz * lz;
    if (sd > 0) { sd = sd * sd * 64; if (sd > ar * LL * 44) { spd = (idiv(T1[idiv(sd * 4, ar * LL) + 1] * ssp, 256) + dth) * 65536; } }
    dw = ry * uy + rz * fy_;
    if (dw < 0) {
      hp = cmy + idiv(py * uy + pz * fy_, 1024);
      t2 = idiv(hp * 4194304, 0 - dw);
      ex = idiv(rx * t2, 4096); ey = idiv(ry * t2, 4096); ez = idiv(rz * t2, 4096);
      kf2 = idiv(ex * ex + ey * ey + ez * ez, 59000000);
      fi = 253;
      if (kf2 < 50) {
        fx = px + ex; fy = py + ey; fz = pz + ez;
        wxx = cmx + idiv(fx * rx_ + fy * ux + fz * fx_, 1024);
        wzz = cmz + idiv(fx * rz_ + fy * uz + fz * fz_, 1024);
        fpar = mod(idiv(wxx, 1024) + idiv(wzz, 1024), 2);
        fi = kf2 * 4 + fpar * 2 + 1;
      }
      c2r = T1[fi]; c2g = T2[fi]; c2b = T3[fi];
    } else {
      si = idiv(dw * dw * 63, ar * 1048576) + 1;
      if (si > 64) { si = 64; }
      c2r = T1[si]; c2g = T2[si]; c2b = T3[si];
    }
    qr = idiv(mrk * li + c2r * kr2 + spd, 1048576); if (qr > 15) { qr = 15; }
    qg = idiv(mgk * li + c2g * kr2 + spd, 1048576); if (qg > 15) { qg = 15; }
    qb = idiv(mbk * li + c2b * kr2 + spd, 1048576); if (qb > 15) { qb = 15; }
    s = s + qr * 256 + qg * 16 + qb + 1;
    it = it + 1;
  }
  res = s;
}
on('start', 'cam', function () { init(); for (;;) { bench(7000); frames = frames + 1; } });
