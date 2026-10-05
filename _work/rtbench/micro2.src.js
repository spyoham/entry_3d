let LA = []; let LB = []; let LC = []; let res = 0, frames = 0, mode = MODE;
function init() { let i = 0; while (i < 8) { LA.push(3000 + i * 400); LB.push(900 + i * 100); LC.push(5000 - i * 300); i = i + 1; } }
function fG(n) { 
  let ai = 0, as = 0, awx = 0, awy = 0, awz = 0, ab = 0, ad = 0, aj = 0;
  while (ai < n) { 
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    ai = ai + 1;
  }
  res = as; if (res == -5) { 
  let c0_i = 0, c0_s = 0, c0_wx = 0, c0_wy = 0, c0_wz = 0, c0_b = 0, c0_d = 0, c0_j = 0;
  while (c0_i < n) { 
    c0_j = mod(c0_i, 6) + 1;
    c0_wx = LA[c0_j] - c0_i; c0_wy = LB[c0_j] - 37; c0_wz = LC[c0_j] - c0_i * 2;
    c0_b = c0_wx * 311 + c0_wy * 207 + c0_wz * 590;
    if (c0_b > 0) {
      c0_d = c0_b * c0_b - 480000 * (c0_wx * c0_wx + c0_wy * c0_wy + c0_wz * c0_wz - 1000000);
      if (c0_d > 0) { c0_s = c0_s + idiv(c0_b - Math.sqrt(c0_d), 1000); }
    }
    c0_i = c0_i + 1;
  }
   }
if (res == -6) { 
  let c1_i = 0, c1_s = 0, c1_wx = 0, c1_wy = 0, c1_wz = 0, c1_b = 0, c1_d = 0, c1_j = 0;
  while (c1_i < n) { 
    c1_j = mod(c1_i, 6) + 1;
    c1_wx = LA[c1_j] - c1_i; c1_wy = LB[c1_j] - 37; c1_wz = LC[c1_j] - c1_i * 2;
    c1_b = c1_wx * 311 + c1_wy * 207 + c1_wz * 590;
    if (c1_b > 0) {
      c1_d = c1_b * c1_b - 480000 * (c1_wx * c1_wx + c1_wy * c1_wy + c1_wz * c1_wz - 1000000);
      if (c1_d > 0) { c1_s = c1_s + idiv(c1_b - Math.sqrt(c1_d), 1000); }
    }
    c1_i = c1_i + 1;
  }
   }
if (res == -7) { 
  let c2_i = 0, c2_s = 0, c2_wx = 0, c2_wy = 0, c2_wz = 0, c2_b = 0, c2_d = 0, c2_j = 0;
  while (c2_i < n) { 
    c2_j = mod(c2_i, 6) + 1;
    c2_wx = LA[c2_j] - c2_i; c2_wy = LB[c2_j] - 37; c2_wz = LC[c2_j] - c2_i * 2;
    c2_b = c2_wx * 311 + c2_wy * 207 + c2_wz * 590;
    if (c2_b > 0) {
      c2_d = c2_b * c2_b - 480000 * (c2_wx * c2_wx + c2_wy * c2_wy + c2_wz * c2_wz - 1000000);
      if (c2_d > 0) { c2_s = c2_s + idiv(c2_b - Math.sqrt(c2_d), 1000); }
    }
    c2_i = c2_i + 1;
  }
   }
if (res == -8) { 
  let c3_i = 0, c3_s = 0, c3_wx = 0, c3_wy = 0, c3_wz = 0, c3_b = 0, c3_d = 0, c3_j = 0;
  while (c3_i < n) { 
    c3_j = mod(c3_i, 6) + 1;
    c3_wx = LA[c3_j] - c3_i; c3_wy = LB[c3_j] - 37; c3_wz = LC[c3_j] - c3_i * 2;
    c3_b = c3_wx * 311 + c3_wy * 207 + c3_wz * 590;
    if (c3_b > 0) {
      c3_d = c3_b * c3_b - 480000 * (c3_wx * c3_wx + c3_wy * c3_wy + c3_wz * c3_wz - 1000000);
      if (c3_d > 0) { c3_s = c3_s + idiv(c3_b - Math.sqrt(c3_d), 1000); }
    }
    c3_i = c3_i + 1;
  }
   }
if (res == -9) { 
  let c4_i = 0, c4_s = 0, c4_wx = 0, c4_wy = 0, c4_wz = 0, c4_b = 0, c4_d = 0, c4_j = 0;
  while (c4_i < n) { 
    c4_j = mod(c4_i, 6) + 1;
    c4_wx = LA[c4_j] - c4_i; c4_wy = LB[c4_j] - 37; c4_wz = LC[c4_j] - c4_i * 2;
    c4_b = c4_wx * 311 + c4_wy * 207 + c4_wz * 590;
    if (c4_b > 0) {
      c4_d = c4_b * c4_b - 480000 * (c4_wx * c4_wx + c4_wy * c4_wy + c4_wz * c4_wz - 1000000);
      if (c4_d > 0) { c4_s = c4_s + idiv(c4_b - Math.sqrt(c4_d), 1000); }
    }
    c4_i = c4_i + 1;
  }
   }
if (res == -10) { 
  let c5_i = 0, c5_s = 0, c5_wx = 0, c5_wy = 0, c5_wz = 0, c5_b = 0, c5_d = 0, c5_j = 0;
  while (c5_i < n) { 
    c5_j = mod(c5_i, 6) + 1;
    c5_wx = LA[c5_j] - c5_i; c5_wy = LB[c5_j] - 37; c5_wz = LC[c5_j] - c5_i * 2;
    c5_b = c5_wx * 311 + c5_wy * 207 + c5_wz * 590;
    if (c5_b > 0) {
      c5_d = c5_b * c5_b - 480000 * (c5_wx * c5_wx + c5_wy * c5_wy + c5_wz * c5_wz - 1000000);
      if (c5_d > 0) { c5_s = c5_s + idiv(c5_b - Math.sqrt(c5_d), 1000); }
    }
    c5_i = c5_i + 1;
  }
   }
if (res == -11) { 
  let c6_i = 0, c6_s = 0, c6_wx = 0, c6_wy = 0, c6_wz = 0, c6_b = 0, c6_d = 0, c6_j = 0;
  while (c6_i < n) { 
    c6_j = mod(c6_i, 6) + 1;
    c6_wx = LA[c6_j] - c6_i; c6_wy = LB[c6_j] - 37; c6_wz = LC[c6_j] - c6_i * 2;
    c6_b = c6_wx * 311 + c6_wy * 207 + c6_wz * 590;
    if (c6_b > 0) {
      c6_d = c6_b * c6_b - 480000 * (c6_wx * c6_wx + c6_wy * c6_wy + c6_wz * c6_wz - 1000000);
      if (c6_d > 0) { c6_s = c6_s + idiv(c6_b - Math.sqrt(c6_d), 1000); }
    }
    c6_i = c6_i + 1;
  }
   }
if (res == -12) { 
  let c7_i = 0, c7_s = 0, c7_wx = 0, c7_wy = 0, c7_wz = 0, c7_b = 0, c7_d = 0, c7_j = 0;
  while (c7_i < n) { 
    c7_j = mod(c7_i, 6) + 1;
    c7_wx = LA[c7_j] - c7_i; c7_wy = LB[c7_j] - 37; c7_wz = LC[c7_j] - c7_i * 2;
    c7_b = c7_wx * 311 + c7_wy * 207 + c7_wz * 590;
    if (c7_b > 0) {
      c7_d = c7_b * c7_b - 480000 * (c7_wx * c7_wx + c7_wy * c7_wy + c7_wz * c7_wz - 1000000);
      if (c7_d > 0) { c7_s = c7_s + idiv(c7_b - Math.sqrt(c7_d), 1000); }
    }
    c7_i = c7_i + 1;
  }
   }
if (res == -13) { 
  let c8_i = 0, c8_s = 0, c8_wx = 0, c8_wy = 0, c8_wz = 0, c8_b = 0, c8_d = 0, c8_j = 0;
  while (c8_i < n) { 
    c8_j = mod(c8_i, 6) + 1;
    c8_wx = LA[c8_j] - c8_i; c8_wy = LB[c8_j] - 37; c8_wz = LC[c8_j] - c8_i * 2;
    c8_b = c8_wx * 311 + c8_wy * 207 + c8_wz * 590;
    if (c8_b > 0) {
      c8_d = c8_b * c8_b - 480000 * (c8_wx * c8_wx + c8_wy * c8_wy + c8_wz * c8_wz - 1000000);
      if (c8_d > 0) { c8_s = c8_s + idiv(c8_b - Math.sqrt(c8_d), 1000); }
    }
    c8_i = c8_i + 1;
  }
   }
if (res == -14) { 
  let c9_i = 0, c9_s = 0, c9_wx = 0, c9_wy = 0, c9_wz = 0, c9_b = 0, c9_d = 0, c9_j = 0;
  while (c9_i < n) { 
    c9_j = mod(c9_i, 6) + 1;
    c9_wx = LA[c9_j] - c9_i; c9_wy = LB[c9_j] - 37; c9_wz = LC[c9_j] - c9_i * 2;
    c9_b = c9_wx * 311 + c9_wy * 207 + c9_wz * 590;
    if (c9_b > 0) {
      c9_d = c9_b * c9_b - 480000 * (c9_wx * c9_wx + c9_wy * c9_wy + c9_wz * c9_wz - 1000000);
      if (c9_d > 0) { c9_s = c9_s + idiv(c9_b - Math.sqrt(c9_d), 1000); }
    }
    c9_i = c9_i + 1;
  }
   }
if (res == -15) { 
  let c10_i = 0, c10_s = 0, c10_wx = 0, c10_wy = 0, c10_wz = 0, c10_b = 0, c10_d = 0, c10_j = 0;
  while (c10_i < n) { 
    c10_j = mod(c10_i, 6) + 1;
    c10_wx = LA[c10_j] - c10_i; c10_wy = LB[c10_j] - 37; c10_wz = LC[c10_j] - c10_i * 2;
    c10_b = c10_wx * 311 + c10_wy * 207 + c10_wz * 590;
    if (c10_b > 0) {
      c10_d = c10_b * c10_b - 480000 * (c10_wx * c10_wx + c10_wy * c10_wy + c10_wz * c10_wz - 1000000);
      if (c10_d > 0) { c10_s = c10_s + idiv(c10_b - Math.sqrt(c10_d), 1000); }
    }
    c10_i = c10_i + 1;
  }
   }
if (res == -16) { 
  let c11_i = 0, c11_s = 0, c11_wx = 0, c11_wy = 0, c11_wz = 0, c11_b = 0, c11_d = 0, c11_j = 0;
  while (c11_i < n) { 
    c11_j = mod(c11_i, 6) + 1;
    c11_wx = LA[c11_j] - c11_i; c11_wy = LB[c11_j] - 37; c11_wz = LC[c11_j] - c11_i * 2;
    c11_b = c11_wx * 311 + c11_wy * 207 + c11_wz * 590;
    if (c11_b > 0) {
      c11_d = c11_b * c11_b - 480000 * (c11_wx * c11_wx + c11_wy * c11_wy + c11_wz * c11_wz - 1000000);
      if (c11_d > 0) { c11_s = c11_s + idiv(c11_b - Math.sqrt(c11_d), 1000); }
    }
    c11_i = c11_i + 1;
  }
   }
if (res == -17) { 
  let c12_i = 0, c12_s = 0, c12_wx = 0, c12_wy = 0, c12_wz = 0, c12_b = 0, c12_d = 0, c12_j = 0;
  while (c12_i < n) { 
    c12_j = mod(c12_i, 6) + 1;
    c12_wx = LA[c12_j] - c12_i; c12_wy = LB[c12_j] - 37; c12_wz = LC[c12_j] - c12_i * 2;
    c12_b = c12_wx * 311 + c12_wy * 207 + c12_wz * 590;
    if (c12_b > 0) {
      c12_d = c12_b * c12_b - 480000 * (c12_wx * c12_wx + c12_wy * c12_wy + c12_wz * c12_wz - 1000000);
      if (c12_d > 0) { c12_s = c12_s + idiv(c12_b - Math.sqrt(c12_d), 1000); }
    }
    c12_i = c12_i + 1;
  }
   }
if (res == -18) { 
  let c13_i = 0, c13_s = 0, c13_wx = 0, c13_wy = 0, c13_wz = 0, c13_b = 0, c13_d = 0, c13_j = 0;
  while (c13_i < n) { 
    c13_j = mod(c13_i, 6) + 1;
    c13_wx = LA[c13_j] - c13_i; c13_wy = LB[c13_j] - 37; c13_wz = LC[c13_j] - c13_i * 2;
    c13_b = c13_wx * 311 + c13_wy * 207 + c13_wz * 590;
    if (c13_b > 0) {
      c13_d = c13_b * c13_b - 480000 * (c13_wx * c13_wx + c13_wy * c13_wy + c13_wz * c13_wz - 1000000);
      if (c13_d > 0) { c13_s = c13_s + idiv(c13_b - Math.sqrt(c13_d), 1000); }
    }
    c13_i = c13_i + 1;
  }
   }
if (res == -19) { 
  let c14_i = 0, c14_s = 0, c14_wx = 0, c14_wy = 0, c14_wz = 0, c14_b = 0, c14_d = 0, c14_j = 0;
  while (c14_i < n) { 
    c14_j = mod(c14_i, 6) + 1;
    c14_wx = LA[c14_j] - c14_i; c14_wy = LB[c14_j] - 37; c14_wz = LC[c14_j] - c14_i * 2;
    c14_b = c14_wx * 311 + c14_wy * 207 + c14_wz * 590;
    if (c14_b > 0) {
      c14_d = c14_b * c14_b - 480000 * (c14_wx * c14_wx + c14_wy * c14_wy + c14_wz * c14_wz - 1000000);
      if (c14_d > 0) { c14_s = c14_s + idiv(c14_b - Math.sqrt(c14_d), 1000); }
    }
    c14_i = c14_i + 1;
  }
   }
if (res == -20) { 
  let c15_i = 0, c15_s = 0, c15_wx = 0, c15_wy = 0, c15_wz = 0, c15_b = 0, c15_d = 0, c15_j = 0;
  while (c15_i < n) { 
    c15_j = mod(c15_i, 6) + 1;
    c15_wx = LA[c15_j] - c15_i; c15_wy = LB[c15_j] - 37; c15_wz = LC[c15_j] - c15_i * 2;
    c15_b = c15_wx * 311 + c15_wy * 207 + c15_wz * 590;
    if (c15_b > 0) {
      c15_d = c15_b * c15_b - 480000 * (c15_wx * c15_wx + c15_wy * c15_wy + c15_wz * c15_wz - 1000000);
      if (c15_d > 0) { c15_s = c15_s + idiv(c15_b - Math.sqrt(c15_d), 1000); }
    }
    c15_i = c15_i + 1;
  }
   }
if (res == -21) { 
  let c16_i = 0, c16_s = 0, c16_wx = 0, c16_wy = 0, c16_wz = 0, c16_b = 0, c16_d = 0, c16_j = 0;
  while (c16_i < n) { 
    c16_j = mod(c16_i, 6) + 1;
    c16_wx = LA[c16_j] - c16_i; c16_wy = LB[c16_j] - 37; c16_wz = LC[c16_j] - c16_i * 2;
    c16_b = c16_wx * 311 + c16_wy * 207 + c16_wz * 590;
    if (c16_b > 0) {
      c16_d = c16_b * c16_b - 480000 * (c16_wx * c16_wx + c16_wy * c16_wy + c16_wz * c16_wz - 1000000);
      if (c16_d > 0) { c16_s = c16_s + idiv(c16_b - Math.sqrt(c16_d), 1000); }
    }
    c16_i = c16_i + 1;
  }
   }
if (res == -22) { 
  let c17_i = 0, c17_s = 0, c17_wx = 0, c17_wy = 0, c17_wz = 0, c17_b = 0, c17_d = 0, c17_j = 0;
  while (c17_i < n) { 
    c17_j = mod(c17_i, 6) + 1;
    c17_wx = LA[c17_j] - c17_i; c17_wy = LB[c17_j] - 37; c17_wz = LC[c17_j] - c17_i * 2;
    c17_b = c17_wx * 311 + c17_wy * 207 + c17_wz * 590;
    if (c17_b > 0) {
      c17_d = c17_b * c17_b - 480000 * (c17_wx * c17_wx + c17_wy * c17_wy + c17_wz * c17_wz - 1000000);
      if (c17_d > 0) { c17_s = c17_s + idiv(c17_b - Math.sqrt(c17_d), 1000); }
    }
    c17_i = c17_i + 1;
  }
   }
if (res == -23) { 
  let c18_i = 0, c18_s = 0, c18_wx = 0, c18_wy = 0, c18_wz = 0, c18_b = 0, c18_d = 0, c18_j = 0;
  while (c18_i < n) { 
    c18_j = mod(c18_i, 6) + 1;
    c18_wx = LA[c18_j] - c18_i; c18_wy = LB[c18_j] - 37; c18_wz = LC[c18_j] - c18_i * 2;
    c18_b = c18_wx * 311 + c18_wy * 207 + c18_wz * 590;
    if (c18_b > 0) {
      c18_d = c18_b * c18_b - 480000 * (c18_wx * c18_wx + c18_wy * c18_wy + c18_wz * c18_wz - 1000000);
      if (c18_d > 0) { c18_s = c18_s + idiv(c18_b - Math.sqrt(c18_d), 1000); }
    }
    c18_i = c18_i + 1;
  }
   }
if (res == -24) { 
  let c19_i = 0, c19_s = 0, c19_wx = 0, c19_wy = 0, c19_wz = 0, c19_b = 0, c19_d = 0, c19_j = 0;
  while (c19_i < n) { 
    c19_j = mod(c19_i, 6) + 1;
    c19_wx = LA[c19_j] - c19_i; c19_wy = LB[c19_j] - 37; c19_wz = LC[c19_j] - c19_i * 2;
    c19_b = c19_wx * 311 + c19_wy * 207 + c19_wz * 590;
    if (c19_b > 0) {
      c19_d = c19_b * c19_b - 480000 * (c19_wx * c19_wx + c19_wy * c19_wy + c19_wz * c19_wz - 1000000);
      if (c19_d > 0) { c19_s = c19_s + idiv(c19_b - Math.sqrt(c19_d), 1000); }
    }
    c19_i = c19_i + 1;
  }
   }
if (res == -25) { 
  let c20_i = 0, c20_s = 0, c20_wx = 0, c20_wy = 0, c20_wz = 0, c20_b = 0, c20_d = 0, c20_j = 0;
  while (c20_i < n) { 
    c20_j = mod(c20_i, 6) + 1;
    c20_wx = LA[c20_j] - c20_i; c20_wy = LB[c20_j] - 37; c20_wz = LC[c20_j] - c20_i * 2;
    c20_b = c20_wx * 311 + c20_wy * 207 + c20_wz * 590;
    if (c20_b > 0) {
      c20_d = c20_b * c20_b - 480000 * (c20_wx * c20_wx + c20_wy * c20_wy + c20_wz * c20_wz - 1000000);
      if (c20_d > 0) { c20_s = c20_s + idiv(c20_b - Math.sqrt(c20_d), 1000); }
    }
    c20_i = c20_i + 1;
  }
   }
if (res == -26) { 
  let c21_i = 0, c21_s = 0, c21_wx = 0, c21_wy = 0, c21_wz = 0, c21_b = 0, c21_d = 0, c21_j = 0;
  while (c21_i < n) { 
    c21_j = mod(c21_i, 6) + 1;
    c21_wx = LA[c21_j] - c21_i; c21_wy = LB[c21_j] - 37; c21_wz = LC[c21_j] - c21_i * 2;
    c21_b = c21_wx * 311 + c21_wy * 207 + c21_wz * 590;
    if (c21_b > 0) {
      c21_d = c21_b * c21_b - 480000 * (c21_wx * c21_wx + c21_wy * c21_wy + c21_wz * c21_wz - 1000000);
      if (c21_d > 0) { c21_s = c21_s + idiv(c21_b - Math.sqrt(c21_d), 1000); }
    }
    c21_i = c21_i + 1;
  }
   }
if (res == -27) { 
  let c22_i = 0, c22_s = 0, c22_wx = 0, c22_wy = 0, c22_wz = 0, c22_b = 0, c22_d = 0, c22_j = 0;
  while (c22_i < n) { 
    c22_j = mod(c22_i, 6) + 1;
    c22_wx = LA[c22_j] - c22_i; c22_wy = LB[c22_j] - 37; c22_wz = LC[c22_j] - c22_i * 2;
    c22_b = c22_wx * 311 + c22_wy * 207 + c22_wz * 590;
    if (c22_b > 0) {
      c22_d = c22_b * c22_b - 480000 * (c22_wx * c22_wx + c22_wy * c22_wy + c22_wz * c22_wz - 1000000);
      if (c22_d > 0) { c22_s = c22_s + idiv(c22_b - Math.sqrt(c22_d), 1000); }
    }
    c22_i = c22_i + 1;
  }
   }
if (res == -28) { 
  let c23_i = 0, c23_s = 0, c23_wx = 0, c23_wy = 0, c23_wz = 0, c23_b = 0, c23_d = 0, c23_j = 0;
  while (c23_i < n) { 
    c23_j = mod(c23_i, 6) + 1;
    c23_wx = LA[c23_j] - c23_i; c23_wy = LB[c23_j] - 37; c23_wz = LC[c23_j] - c23_i * 2;
    c23_b = c23_wx * 311 + c23_wy * 207 + c23_wz * 590;
    if (c23_b > 0) {
      c23_d = c23_b * c23_b - 480000 * (c23_wx * c23_wx + c23_wy * c23_wy + c23_wz * c23_wz - 1000000);
      if (c23_d > 0) { c23_s = c23_s + idiv(c23_b - Math.sqrt(c23_d), 1000); }
    }
    c23_i = c23_i + 1;
  }
   }
if (res == -29) { 
  let c24_i = 0, c24_s = 0, c24_wx = 0, c24_wy = 0, c24_wz = 0, c24_b = 0, c24_d = 0, c24_j = 0;
  while (c24_i < n) { 
    c24_j = mod(c24_i, 6) + 1;
    c24_wx = LA[c24_j] - c24_i; c24_wy = LB[c24_j] - 37; c24_wz = LC[c24_j] - c24_i * 2;
    c24_b = c24_wx * 311 + c24_wy * 207 + c24_wz * 590;
    if (c24_b > 0) {
      c24_d = c24_b * c24_b - 480000 * (c24_wx * c24_wx + c24_wy * c24_wy + c24_wz * c24_wz - 1000000);
      if (c24_d > 0) { c24_s = c24_s + idiv(c24_b - Math.sqrt(c24_d), 1000); }
    }
    c24_i = c24_i + 1;
  }
   }
if (res == -30) { 
  let c25_i = 0, c25_s = 0, c25_wx = 0, c25_wy = 0, c25_wz = 0, c25_b = 0, c25_d = 0, c25_j = 0;
  while (c25_i < n) { 
    c25_j = mod(c25_i, 6) + 1;
    c25_wx = LA[c25_j] - c25_i; c25_wy = LB[c25_j] - 37; c25_wz = LC[c25_j] - c25_i * 2;
    c25_b = c25_wx * 311 + c25_wy * 207 + c25_wz * 590;
    if (c25_b > 0) {
      c25_d = c25_b * c25_b - 480000 * (c25_wx * c25_wx + c25_wy * c25_wy + c25_wz * c25_wz - 1000000);
      if (c25_d > 0) { c25_s = c25_s + idiv(c25_b - Math.sqrt(c25_d), 1000); }
    }
    c25_i = c25_i + 1;
  }
   }
if (res == -31) { 
  let c26_i = 0, c26_s = 0, c26_wx = 0, c26_wy = 0, c26_wz = 0, c26_b = 0, c26_d = 0, c26_j = 0;
  while (c26_i < n) { 
    c26_j = mod(c26_i, 6) + 1;
    c26_wx = LA[c26_j] - c26_i; c26_wy = LB[c26_j] - 37; c26_wz = LC[c26_j] - c26_i * 2;
    c26_b = c26_wx * 311 + c26_wy * 207 + c26_wz * 590;
    if (c26_b > 0) {
      c26_d = c26_b * c26_b - 480000 * (c26_wx * c26_wx + c26_wy * c26_wy + c26_wz * c26_wz - 1000000);
      if (c26_d > 0) { c26_s = c26_s + idiv(c26_b - Math.sqrt(c26_d), 1000); }
    }
    c26_i = c26_i + 1;
  }
   }
if (res == -32) { 
  let c27_i = 0, c27_s = 0, c27_wx = 0, c27_wy = 0, c27_wz = 0, c27_b = 0, c27_d = 0, c27_j = 0;
  while (c27_i < n) { 
    c27_j = mod(c27_i, 6) + 1;
    c27_wx = LA[c27_j] - c27_i; c27_wy = LB[c27_j] - 37; c27_wz = LC[c27_j] - c27_i * 2;
    c27_b = c27_wx * 311 + c27_wy * 207 + c27_wz * 590;
    if (c27_b > 0) {
      c27_d = c27_b * c27_b - 480000 * (c27_wx * c27_wx + c27_wy * c27_wy + c27_wz * c27_wz - 1000000);
      if (c27_d > 0) { c27_s = c27_s + idiv(c27_b - Math.sqrt(c27_d), 1000); }
    }
    c27_i = c27_i + 1;
  }
   }
if (res == -33) { 
  let c28_i = 0, c28_s = 0, c28_wx = 0, c28_wy = 0, c28_wz = 0, c28_b = 0, c28_d = 0, c28_j = 0;
  while (c28_i < n) { 
    c28_j = mod(c28_i, 6) + 1;
    c28_wx = LA[c28_j] - c28_i; c28_wy = LB[c28_j] - 37; c28_wz = LC[c28_j] - c28_i * 2;
    c28_b = c28_wx * 311 + c28_wy * 207 + c28_wz * 590;
    if (c28_b > 0) {
      c28_d = c28_b * c28_b - 480000 * (c28_wx * c28_wx + c28_wy * c28_wy + c28_wz * c28_wz - 1000000);
      if (c28_d > 0) { c28_s = c28_s + idiv(c28_b - Math.sqrt(c28_d), 1000); }
    }
    c28_i = c28_i + 1;
  }
   }
if (res == -34) { 
  let c29_i = 0, c29_s = 0, c29_wx = 0, c29_wy = 0, c29_wz = 0, c29_b = 0, c29_d = 0, c29_j = 0;
  while (c29_i < n) { 
    c29_j = mod(c29_i, 6) + 1;
    c29_wx = LA[c29_j] - c29_i; c29_wy = LB[c29_j] - 37; c29_wz = LC[c29_j] - c29_i * 2;
    c29_b = c29_wx * 311 + c29_wy * 207 + c29_wz * 590;
    if (c29_b > 0) {
      c29_d = c29_b * c29_b - 480000 * (c29_wx * c29_wx + c29_wy * c29_wy + c29_wz * c29_wz - 1000000);
      if (c29_d > 0) { c29_s = c29_s + idiv(c29_b - Math.sqrt(c29_d), 1000); }
    }
    c29_i = c29_i + 1;
  }
   }
if (res == -35) { 
  let c30_i = 0, c30_s = 0, c30_wx = 0, c30_wy = 0, c30_wz = 0, c30_b = 0, c30_d = 0, c30_j = 0;
  while (c30_i < n) { 
    c30_j = mod(c30_i, 6) + 1;
    c30_wx = LA[c30_j] - c30_i; c30_wy = LB[c30_j] - 37; c30_wz = LC[c30_j] - c30_i * 2;
    c30_b = c30_wx * 311 + c30_wy * 207 + c30_wz * 590;
    if (c30_b > 0) {
      c30_d = c30_b * c30_b - 480000 * (c30_wx * c30_wx + c30_wy * c30_wy + c30_wz * c30_wz - 1000000);
      if (c30_d > 0) { c30_s = c30_s + idiv(c30_b - Math.sqrt(c30_d), 1000); }
    }
    c30_i = c30_i + 1;
  }
   }
if (res == -36) { 
  let c31_i = 0, c31_s = 0, c31_wx = 0, c31_wy = 0, c31_wz = 0, c31_b = 0, c31_d = 0, c31_j = 0;
  while (c31_i < n) { 
    c31_j = mod(c31_i, 6) + 1;
    c31_wx = LA[c31_j] - c31_i; c31_wy = LB[c31_j] - 37; c31_wz = LC[c31_j] - c31_i * 2;
    c31_b = c31_wx * 311 + c31_wy * 207 + c31_wz * 590;
    if (c31_b > 0) {
      c31_d = c31_b * c31_b - 480000 * (c31_wx * c31_wx + c31_wy * c31_wy + c31_wz * c31_wz - 1000000);
      if (c31_d > 0) { c31_s = c31_s + idiv(c31_b - Math.sqrt(c31_d), 1000); }
    }
    c31_i = c31_i + 1;
  }
   }
if (res == -37) { 
  let c32_i = 0, c32_s = 0, c32_wx = 0, c32_wy = 0, c32_wz = 0, c32_b = 0, c32_d = 0, c32_j = 0;
  while (c32_i < n) { 
    c32_j = mod(c32_i, 6) + 1;
    c32_wx = LA[c32_j] - c32_i; c32_wy = LB[c32_j] - 37; c32_wz = LC[c32_j] - c32_i * 2;
    c32_b = c32_wx * 311 + c32_wy * 207 + c32_wz * 590;
    if (c32_b > 0) {
      c32_d = c32_b * c32_b - 480000 * (c32_wx * c32_wx + c32_wy * c32_wy + c32_wz * c32_wz - 1000000);
      if (c32_d > 0) { c32_s = c32_s + idiv(c32_b - Math.sqrt(c32_d), 1000); }
    }
    c32_i = c32_i + 1;
  }
   }
if (res == -38) { 
  let c33_i = 0, c33_s = 0, c33_wx = 0, c33_wy = 0, c33_wz = 0, c33_b = 0, c33_d = 0, c33_j = 0;
  while (c33_i < n) { 
    c33_j = mod(c33_i, 6) + 1;
    c33_wx = LA[c33_j] - c33_i; c33_wy = LB[c33_j] - 37; c33_wz = LC[c33_j] - c33_i * 2;
    c33_b = c33_wx * 311 + c33_wy * 207 + c33_wz * 590;
    if (c33_b > 0) {
      c33_d = c33_b * c33_b - 480000 * (c33_wx * c33_wx + c33_wy * c33_wy + c33_wz * c33_wz - 1000000);
      if (c33_d > 0) { c33_s = c33_s + idiv(c33_b - Math.sqrt(c33_d), 1000); }
    }
    c33_i = c33_i + 1;
  }
   }
if (res == -39) { 
  let c34_i = 0, c34_s = 0, c34_wx = 0, c34_wy = 0, c34_wz = 0, c34_b = 0, c34_d = 0, c34_j = 0;
  while (c34_i < n) { 
    c34_j = mod(c34_i, 6) + 1;
    c34_wx = LA[c34_j] - c34_i; c34_wy = LB[c34_j] - 37; c34_wz = LC[c34_j] - c34_i * 2;
    c34_b = c34_wx * 311 + c34_wy * 207 + c34_wz * 590;
    if (c34_b > 0) {
      c34_d = c34_b * c34_b - 480000 * (c34_wx * c34_wx + c34_wy * c34_wy + c34_wz * c34_wz - 1000000);
      if (c34_d > 0) { c34_s = c34_s + idiv(c34_b - Math.sqrt(c34_d), 1000); }
    }
    c34_i = c34_i + 1;
  }
   }
if (res == -40) { 
  let c35_i = 0, c35_s = 0, c35_wx = 0, c35_wy = 0, c35_wz = 0, c35_b = 0, c35_d = 0, c35_j = 0;
  while (c35_i < n) { 
    c35_j = mod(c35_i, 6) + 1;
    c35_wx = LA[c35_j] - c35_i; c35_wy = LB[c35_j] - 37; c35_wz = LC[c35_j] - c35_i * 2;
    c35_b = c35_wx * 311 + c35_wy * 207 + c35_wz * 590;
    if (c35_b > 0) {
      c35_d = c35_b * c35_b - 480000 * (c35_wx * c35_wx + c35_wy * c35_wy + c35_wz * c35_wz - 1000000);
      if (c35_d > 0) { c35_s = c35_s + idiv(c35_b - Math.sqrt(c35_d), 1000); }
    }
    c35_i = c35_i + 1;
  }
   }
if (res == -41) { 
  let c36_i = 0, c36_s = 0, c36_wx = 0, c36_wy = 0, c36_wz = 0, c36_b = 0, c36_d = 0, c36_j = 0;
  while (c36_i < n) { 
    c36_j = mod(c36_i, 6) + 1;
    c36_wx = LA[c36_j] - c36_i; c36_wy = LB[c36_j] - 37; c36_wz = LC[c36_j] - c36_i * 2;
    c36_b = c36_wx * 311 + c36_wy * 207 + c36_wz * 590;
    if (c36_b > 0) {
      c36_d = c36_b * c36_b - 480000 * (c36_wx * c36_wx + c36_wy * c36_wy + c36_wz * c36_wz - 1000000);
      if (c36_d > 0) { c36_s = c36_s + idiv(c36_b - Math.sqrt(c36_d), 1000); }
    }
    c36_i = c36_i + 1;
  }
   }
if (res == -42) { 
  let c37_i = 0, c37_s = 0, c37_wx = 0, c37_wy = 0, c37_wz = 0, c37_b = 0, c37_d = 0, c37_j = 0;
  while (c37_i < n) { 
    c37_j = mod(c37_i, 6) + 1;
    c37_wx = LA[c37_j] - c37_i; c37_wy = LB[c37_j] - 37; c37_wz = LC[c37_j] - c37_i * 2;
    c37_b = c37_wx * 311 + c37_wy * 207 + c37_wz * 590;
    if (c37_b > 0) {
      c37_d = c37_b * c37_b - 480000 * (c37_wx * c37_wx + c37_wy * c37_wy + c37_wz * c37_wz - 1000000);
      if (c37_d > 0) { c37_s = c37_s + idiv(c37_b - Math.sqrt(c37_d), 1000); }
    }
    c37_i = c37_i + 1;
  }
   }
if (res == -43) { 
  let c38_i = 0, c38_s = 0, c38_wx = 0, c38_wy = 0, c38_wz = 0, c38_b = 0, c38_d = 0, c38_j = 0;
  while (c38_i < n) { 
    c38_j = mod(c38_i, 6) + 1;
    c38_wx = LA[c38_j] - c38_i; c38_wy = LB[c38_j] - 37; c38_wz = LC[c38_j] - c38_i * 2;
    c38_b = c38_wx * 311 + c38_wy * 207 + c38_wz * 590;
    if (c38_b > 0) {
      c38_d = c38_b * c38_b - 480000 * (c38_wx * c38_wx + c38_wy * c38_wy + c38_wz * c38_wz - 1000000);
      if (c38_d > 0) { c38_s = c38_s + idiv(c38_b - Math.sqrt(c38_d), 1000); }
    }
    c38_i = c38_i + 1;
  }
   }
if (res == -44) { 
  let c39_i = 0, c39_s = 0, c39_wx = 0, c39_wy = 0, c39_wz = 0, c39_b = 0, c39_d = 0, c39_j = 0;
  while (c39_i < n) { 
    c39_j = mod(c39_i, 6) + 1;
    c39_wx = LA[c39_j] - c39_i; c39_wy = LB[c39_j] - 37; c39_wz = LC[c39_j] - c39_i * 2;
    c39_b = c39_wx * 311 + c39_wy * 207 + c39_wz * 590;
    if (c39_b > 0) {
      c39_d = c39_b * c39_b - 480000 * (c39_wx * c39_wx + c39_wy * c39_wy + c39_wz * c39_wz - 1000000);
      if (c39_d > 0) { c39_s = c39_s + idiv(c39_b - Math.sqrt(c39_d), 1000); }
    }
    c39_i = c39_i + 1;
  }
   }
if (res == -45) { 
  let c40_i = 0, c40_s = 0, c40_wx = 0, c40_wy = 0, c40_wz = 0, c40_b = 0, c40_d = 0, c40_j = 0;
  while (c40_i < n) { 
    c40_j = mod(c40_i, 6) + 1;
    c40_wx = LA[c40_j] - c40_i; c40_wy = LB[c40_j] - 37; c40_wz = LC[c40_j] - c40_i * 2;
    c40_b = c40_wx * 311 + c40_wy * 207 + c40_wz * 590;
    if (c40_b > 0) {
      c40_d = c40_b * c40_b - 480000 * (c40_wx * c40_wx + c40_wy * c40_wy + c40_wz * c40_wz - 1000000);
      if (c40_d > 0) { c40_s = c40_s + idiv(c40_b - Math.sqrt(c40_d), 1000); }
    }
    c40_i = c40_i + 1;
  }
   }
if (res == -46) { 
  let c41_i = 0, c41_s = 0, c41_wx = 0, c41_wy = 0, c41_wz = 0, c41_b = 0, c41_d = 0, c41_j = 0;
  while (c41_i < n) { 
    c41_j = mod(c41_i, 6) + 1;
    c41_wx = LA[c41_j] - c41_i; c41_wy = LB[c41_j] - 37; c41_wz = LC[c41_j] - c41_i * 2;
    c41_b = c41_wx * 311 + c41_wy * 207 + c41_wz * 590;
    if (c41_b > 0) {
      c41_d = c41_b * c41_b - 480000 * (c41_wx * c41_wx + c41_wy * c41_wy + c41_wz * c41_wz - 1000000);
      if (c41_d > 0) { c41_s = c41_s + idiv(c41_b - Math.sqrt(c41_d), 1000); }
    }
    c41_i = c41_i + 1;
  }
   }
if (res == -47) { 
  let c42_i = 0, c42_s = 0, c42_wx = 0, c42_wy = 0, c42_wz = 0, c42_b = 0, c42_d = 0, c42_j = 0;
  while (c42_i < n) { 
    c42_j = mod(c42_i, 6) + 1;
    c42_wx = LA[c42_j] - c42_i; c42_wy = LB[c42_j] - 37; c42_wz = LC[c42_j] - c42_i * 2;
    c42_b = c42_wx * 311 + c42_wy * 207 + c42_wz * 590;
    if (c42_b > 0) {
      c42_d = c42_b * c42_b - 480000 * (c42_wx * c42_wx + c42_wy * c42_wy + c42_wz * c42_wz - 1000000);
      if (c42_d > 0) { c42_s = c42_s + idiv(c42_b - Math.sqrt(c42_d), 1000); }
    }
    c42_i = c42_i + 1;
  }
   }
if (res == -48) { 
  let c43_i = 0, c43_s = 0, c43_wx = 0, c43_wy = 0, c43_wz = 0, c43_b = 0, c43_d = 0, c43_j = 0;
  while (c43_i < n) { 
    c43_j = mod(c43_i, 6) + 1;
    c43_wx = LA[c43_j] - c43_i; c43_wy = LB[c43_j] - 37; c43_wz = LC[c43_j] - c43_i * 2;
    c43_b = c43_wx * 311 + c43_wy * 207 + c43_wz * 590;
    if (c43_b > 0) {
      c43_d = c43_b * c43_b - 480000 * (c43_wx * c43_wx + c43_wy * c43_wy + c43_wz * c43_wz - 1000000);
      if (c43_d > 0) { c43_s = c43_s + idiv(c43_b - Math.sqrt(c43_d), 1000); }
    }
    c43_i = c43_i + 1;
  }
   }
if (res == -49) { 
  let c44_i = 0, c44_s = 0, c44_wx = 0, c44_wy = 0, c44_wz = 0, c44_b = 0, c44_d = 0, c44_j = 0;
  while (c44_i < n) { 
    c44_j = mod(c44_i, 6) + 1;
    c44_wx = LA[c44_j] - c44_i; c44_wy = LB[c44_j] - 37; c44_wz = LC[c44_j] - c44_i * 2;
    c44_b = c44_wx * 311 + c44_wy * 207 + c44_wz * 590;
    if (c44_b > 0) {
      c44_d = c44_b * c44_b - 480000 * (c44_wx * c44_wx + c44_wy * c44_wy + c44_wz * c44_wz - 1000000);
      if (c44_d > 0) { c44_s = c44_s + idiv(c44_b - Math.sqrt(c44_d), 1000); }
    }
    c44_i = c44_i + 1;
  }
   }
if (res == -50) { 
  let c45_i = 0, c45_s = 0, c45_wx = 0, c45_wy = 0, c45_wz = 0, c45_b = 0, c45_d = 0, c45_j = 0;
  while (c45_i < n) { 
    c45_j = mod(c45_i, 6) + 1;
    c45_wx = LA[c45_j] - c45_i; c45_wy = LB[c45_j] - 37; c45_wz = LC[c45_j] - c45_i * 2;
    c45_b = c45_wx * 311 + c45_wy * 207 + c45_wz * 590;
    if (c45_b > 0) {
      c45_d = c45_b * c45_b - 480000 * (c45_wx * c45_wx + c45_wy * c45_wy + c45_wz * c45_wz - 1000000);
      if (c45_d > 0) { c45_s = c45_s + idiv(c45_b - Math.sqrt(c45_d), 1000); }
    }
    c45_i = c45_i + 1;
  }
   }
if (res == -51) { 
  let c46_i = 0, c46_s = 0, c46_wx = 0, c46_wy = 0, c46_wz = 0, c46_b = 0, c46_d = 0, c46_j = 0;
  while (c46_i < n) { 
    c46_j = mod(c46_i, 6) + 1;
    c46_wx = LA[c46_j] - c46_i; c46_wy = LB[c46_j] - 37; c46_wz = LC[c46_j] - c46_i * 2;
    c46_b = c46_wx * 311 + c46_wy * 207 + c46_wz * 590;
    if (c46_b > 0) {
      c46_d = c46_b * c46_b - 480000 * (c46_wx * c46_wx + c46_wy * c46_wy + c46_wz * c46_wz - 1000000);
      if (c46_d > 0) { c46_s = c46_s + idiv(c46_b - Math.sqrt(c46_d), 1000); }
    }
    c46_i = c46_i + 1;
  }
   }
if (res == -52) { 
  let c47_i = 0, c47_s = 0, c47_wx = 0, c47_wy = 0, c47_wz = 0, c47_b = 0, c47_d = 0, c47_j = 0;
  while (c47_i < n) { 
    c47_j = mod(c47_i, 6) + 1;
    c47_wx = LA[c47_j] - c47_i; c47_wy = LB[c47_j] - 37; c47_wz = LC[c47_j] - c47_i * 2;
    c47_b = c47_wx * 311 + c47_wy * 207 + c47_wz * 590;
    if (c47_b > 0) {
      c47_d = c47_b * c47_b - 480000 * (c47_wx * c47_wx + c47_wy * c47_wy + c47_wz * c47_wz - 1000000);
      if (c47_d > 0) { c47_s = c47_s + idiv(c47_b - Math.sqrt(c47_d), 1000); }
    }
    c47_i = c47_i + 1;
  }
   }
if (res == -53) { 
  let c48_i = 0, c48_s = 0, c48_wx = 0, c48_wy = 0, c48_wz = 0, c48_b = 0, c48_d = 0, c48_j = 0;
  while (c48_i < n) { 
    c48_j = mod(c48_i, 6) + 1;
    c48_wx = LA[c48_j] - c48_i; c48_wy = LB[c48_j] - 37; c48_wz = LC[c48_j] - c48_i * 2;
    c48_b = c48_wx * 311 + c48_wy * 207 + c48_wz * 590;
    if (c48_b > 0) {
      c48_d = c48_b * c48_b - 480000 * (c48_wx * c48_wx + c48_wy * c48_wy + c48_wz * c48_wz - 1000000);
      if (c48_d > 0) { c48_s = c48_s + idiv(c48_b - Math.sqrt(c48_d), 1000); }
    }
    c48_i = c48_i + 1;
  }
   }
if (res == -54) { 
  let c49_i = 0, c49_s = 0, c49_wx = 0, c49_wy = 0, c49_wz = 0, c49_b = 0, c49_d = 0, c49_j = 0;
  while (c49_i < n) { 
    c49_j = mod(c49_i, 6) + 1;
    c49_wx = LA[c49_j] - c49_i; c49_wy = LB[c49_j] - 37; c49_wz = LC[c49_j] - c49_i * 2;
    c49_b = c49_wx * 311 + c49_wy * 207 + c49_wz * 590;
    if (c49_b > 0) {
      c49_d = c49_b * c49_b - 480000 * (c49_wx * c49_wx + c49_wy * c49_wy + c49_wz * c49_wz - 1000000);
      if (c49_d > 0) { c49_s = c49_s + idiv(c49_b - Math.sqrt(c49_d), 1000); }
    }
    c49_i = c49_i + 1;
  }
   }
if (res == -55) { 
  let c50_i = 0, c50_s = 0, c50_wx = 0, c50_wy = 0, c50_wz = 0, c50_b = 0, c50_d = 0, c50_j = 0;
  while (c50_i < n) { 
    c50_j = mod(c50_i, 6) + 1;
    c50_wx = LA[c50_j] - c50_i; c50_wy = LB[c50_j] - 37; c50_wz = LC[c50_j] - c50_i * 2;
    c50_b = c50_wx * 311 + c50_wy * 207 + c50_wz * 590;
    if (c50_b > 0) {
      c50_d = c50_b * c50_b - 480000 * (c50_wx * c50_wx + c50_wy * c50_wy + c50_wz * c50_wz - 1000000);
      if (c50_d > 0) { c50_s = c50_s + idiv(c50_b - Math.sqrt(c50_d), 1000); }
    }
    c50_i = c50_i + 1;
  }
   }
if (res == -56) { 
  let c51_i = 0, c51_s = 0, c51_wx = 0, c51_wy = 0, c51_wz = 0, c51_b = 0, c51_d = 0, c51_j = 0;
  while (c51_i < n) { 
    c51_j = mod(c51_i, 6) + 1;
    c51_wx = LA[c51_j] - c51_i; c51_wy = LB[c51_j] - 37; c51_wz = LC[c51_j] - c51_i * 2;
    c51_b = c51_wx * 311 + c51_wy * 207 + c51_wz * 590;
    if (c51_b > 0) {
      c51_d = c51_b * c51_b - 480000 * (c51_wx * c51_wx + c51_wy * c51_wy + c51_wz * c51_wz - 1000000);
      if (c51_d > 0) { c51_s = c51_s + idiv(c51_b - Math.sqrt(c51_d), 1000); }
    }
    c51_i = c51_i + 1;
  }
   }
if (res == -57) { 
  let c52_i = 0, c52_s = 0, c52_wx = 0, c52_wy = 0, c52_wz = 0, c52_b = 0, c52_d = 0, c52_j = 0;
  while (c52_i < n) { 
    c52_j = mod(c52_i, 6) + 1;
    c52_wx = LA[c52_j] - c52_i; c52_wy = LB[c52_j] - 37; c52_wz = LC[c52_j] - c52_i * 2;
    c52_b = c52_wx * 311 + c52_wy * 207 + c52_wz * 590;
    if (c52_b > 0) {
      c52_d = c52_b * c52_b - 480000 * (c52_wx * c52_wx + c52_wy * c52_wy + c52_wz * c52_wz - 1000000);
      if (c52_d > 0) { c52_s = c52_s + idiv(c52_b - Math.sqrt(c52_d), 1000); }
    }
    c52_i = c52_i + 1;
  }
   }
if (res == -58) { 
  let c53_i = 0, c53_s = 0, c53_wx = 0, c53_wy = 0, c53_wz = 0, c53_b = 0, c53_d = 0, c53_j = 0;
  while (c53_i < n) { 
    c53_j = mod(c53_i, 6) + 1;
    c53_wx = LA[c53_j] - c53_i; c53_wy = LB[c53_j] - 37; c53_wz = LC[c53_j] - c53_i * 2;
    c53_b = c53_wx * 311 + c53_wy * 207 + c53_wz * 590;
    if (c53_b > 0) {
      c53_d = c53_b * c53_b - 480000 * (c53_wx * c53_wx + c53_wy * c53_wy + c53_wz * c53_wz - 1000000);
      if (c53_d > 0) { c53_s = c53_s + idiv(c53_b - Math.sqrt(c53_d), 1000); }
    }
    c53_i = c53_i + 1;
  }
   }
if (res == -59) { 
  let c54_i = 0, c54_s = 0, c54_wx = 0, c54_wy = 0, c54_wz = 0, c54_b = 0, c54_d = 0, c54_j = 0;
  while (c54_i < n) { 
    c54_j = mod(c54_i, 6) + 1;
    c54_wx = LA[c54_j] - c54_i; c54_wy = LB[c54_j] - 37; c54_wz = LC[c54_j] - c54_i * 2;
    c54_b = c54_wx * 311 + c54_wy * 207 + c54_wz * 590;
    if (c54_b > 0) {
      c54_d = c54_b * c54_b - 480000 * (c54_wx * c54_wx + c54_wy * c54_wy + c54_wz * c54_wz - 1000000);
      if (c54_d > 0) { c54_s = c54_s + idiv(c54_b - Math.sqrt(c54_d), 1000); }
    }
    c54_i = c54_i + 1;
  }
   }
if (res == -60) { 
  let c55_i = 0, c55_s = 0, c55_wx = 0, c55_wy = 0, c55_wz = 0, c55_b = 0, c55_d = 0, c55_j = 0;
  while (c55_i < n) { 
    c55_j = mod(c55_i, 6) + 1;
    c55_wx = LA[c55_j] - c55_i; c55_wy = LB[c55_j] - 37; c55_wz = LC[c55_j] - c55_i * 2;
    c55_b = c55_wx * 311 + c55_wy * 207 + c55_wz * 590;
    if (c55_b > 0) {
      c55_d = c55_b * c55_b - 480000 * (c55_wx * c55_wx + c55_wy * c55_wy + c55_wz * c55_wz - 1000000);
      if (c55_d > 0) { c55_s = c55_s + idiv(c55_b - Math.sqrt(c55_d), 1000); }
    }
    c55_i = c55_i + 1;
  }
   }
if (res == -61) { 
  let c56_i = 0, c56_s = 0, c56_wx = 0, c56_wy = 0, c56_wz = 0, c56_b = 0, c56_d = 0, c56_j = 0;
  while (c56_i < n) { 
    c56_j = mod(c56_i, 6) + 1;
    c56_wx = LA[c56_j] - c56_i; c56_wy = LB[c56_j] - 37; c56_wz = LC[c56_j] - c56_i * 2;
    c56_b = c56_wx * 311 + c56_wy * 207 + c56_wz * 590;
    if (c56_b > 0) {
      c56_d = c56_b * c56_b - 480000 * (c56_wx * c56_wx + c56_wy * c56_wy + c56_wz * c56_wz - 1000000);
      if (c56_d > 0) { c56_s = c56_s + idiv(c56_b - Math.sqrt(c56_d), 1000); }
    }
    c56_i = c56_i + 1;
  }
   }
if (res == -62) { 
  let c57_i = 0, c57_s = 0, c57_wx = 0, c57_wy = 0, c57_wz = 0, c57_b = 0, c57_d = 0, c57_j = 0;
  while (c57_i < n) { 
    c57_j = mod(c57_i, 6) + 1;
    c57_wx = LA[c57_j] - c57_i; c57_wy = LB[c57_j] - 37; c57_wz = LC[c57_j] - c57_i * 2;
    c57_b = c57_wx * 311 + c57_wy * 207 + c57_wz * 590;
    if (c57_b > 0) {
      c57_d = c57_b * c57_b - 480000 * (c57_wx * c57_wx + c57_wy * c57_wy + c57_wz * c57_wz - 1000000);
      if (c57_d > 0) { c57_s = c57_s + idiv(c57_b - Math.sqrt(c57_d), 1000); }
    }
    c57_i = c57_i + 1;
  }
   }
if (res == -63) { 
  let c58_i = 0, c58_s = 0, c58_wx = 0, c58_wy = 0, c58_wz = 0, c58_b = 0, c58_d = 0, c58_j = 0;
  while (c58_i < n) { 
    c58_j = mod(c58_i, 6) + 1;
    c58_wx = LA[c58_j] - c58_i; c58_wy = LB[c58_j] - 37; c58_wz = LC[c58_j] - c58_i * 2;
    c58_b = c58_wx * 311 + c58_wy * 207 + c58_wz * 590;
    if (c58_b > 0) {
      c58_d = c58_b * c58_b - 480000 * (c58_wx * c58_wx + c58_wy * c58_wy + c58_wz * c58_wz - 1000000);
      if (c58_d > 0) { c58_s = c58_s + idiv(c58_b - Math.sqrt(c58_d), 1000); }
    }
    c58_i = c58_i + 1;
  }
   }
if (res == -64) { 
  let c59_i = 0, c59_s = 0, c59_wx = 0, c59_wy = 0, c59_wz = 0, c59_b = 0, c59_d = 0, c59_j = 0;
  while (c59_i < n) { 
    c59_j = mod(c59_i, 6) + 1;
    c59_wx = LA[c59_j] - c59_i; c59_wy = LB[c59_j] - 37; c59_wz = LC[c59_j] - c59_i * 2;
    c59_b = c59_wx * 311 + c59_wy * 207 + c59_wz * 590;
    if (c59_b > 0) {
      c59_d = c59_b * c59_b - 480000 * (c59_wx * c59_wx + c59_wy * c59_wy + c59_wz * c59_wz - 1000000);
      if (c59_d > 0) { c59_s = c59_s + idiv(c59_b - Math.sqrt(c59_d), 1000); }
    }
    c59_i = c59_i + 1;
  }
   }
if (res == -65) { 
  let c60_i = 0, c60_s = 0, c60_wx = 0, c60_wy = 0, c60_wz = 0, c60_b = 0, c60_d = 0, c60_j = 0;
  while (c60_i < n) { 
    c60_j = mod(c60_i, 6) + 1;
    c60_wx = LA[c60_j] - c60_i; c60_wy = LB[c60_j] - 37; c60_wz = LC[c60_j] - c60_i * 2;
    c60_b = c60_wx * 311 + c60_wy * 207 + c60_wz * 590;
    if (c60_b > 0) {
      c60_d = c60_b * c60_b - 480000 * (c60_wx * c60_wx + c60_wy * c60_wy + c60_wz * c60_wz - 1000000);
      if (c60_d > 0) { c60_s = c60_s + idiv(c60_b - Math.sqrt(c60_d), 1000); }
    }
    c60_i = c60_i + 1;
  }
   }
if (res == -66) { 
  let c61_i = 0, c61_s = 0, c61_wx = 0, c61_wy = 0, c61_wz = 0, c61_b = 0, c61_d = 0, c61_j = 0;
  while (c61_i < n) { 
    c61_j = mod(c61_i, 6) + 1;
    c61_wx = LA[c61_j] - c61_i; c61_wy = LB[c61_j] - 37; c61_wz = LC[c61_j] - c61_i * 2;
    c61_b = c61_wx * 311 + c61_wy * 207 + c61_wz * 590;
    if (c61_b > 0) {
      c61_d = c61_b * c61_b - 480000 * (c61_wx * c61_wx + c61_wy * c61_wy + c61_wz * c61_wz - 1000000);
      if (c61_d > 0) { c61_s = c61_s + idiv(c61_b - Math.sqrt(c61_d), 1000); }
    }
    c61_i = c61_i + 1;
  }
   }
if (res == -67) { 
  let c62_i = 0, c62_s = 0, c62_wx = 0, c62_wy = 0, c62_wz = 0, c62_b = 0, c62_d = 0, c62_j = 0;
  while (c62_i < n) { 
    c62_j = mod(c62_i, 6) + 1;
    c62_wx = LA[c62_j] - c62_i; c62_wy = LB[c62_j] - 37; c62_wz = LC[c62_j] - c62_i * 2;
    c62_b = c62_wx * 311 + c62_wy * 207 + c62_wz * 590;
    if (c62_b > 0) {
      c62_d = c62_b * c62_b - 480000 * (c62_wx * c62_wx + c62_wy * c62_wy + c62_wz * c62_wz - 1000000);
      if (c62_d > 0) { c62_s = c62_s + idiv(c62_b - Math.sqrt(c62_d), 1000); }
    }
    c62_i = c62_i + 1;
  }
   }
if (res == -68) { 
  let c63_i = 0, c63_s = 0, c63_wx = 0, c63_wy = 0, c63_wz = 0, c63_b = 0, c63_d = 0, c63_j = 0;
  while (c63_i < n) { 
    c63_j = mod(c63_i, 6) + 1;
    c63_wx = LA[c63_j] - c63_i; c63_wy = LB[c63_j] - 37; c63_wz = LC[c63_j] - c63_i * 2;
    c63_b = c63_wx * 311 + c63_wy * 207 + c63_wz * 590;
    if (c63_b > 0) {
      c63_d = c63_b * c63_b - 480000 * (c63_wx * c63_wx + c63_wy * c63_wy + c63_wz * c63_wz - 1000000);
      if (c63_d > 0) { c63_s = c63_s + idiv(c63_b - Math.sqrt(c63_d), 1000); }
    }
    c63_i = c63_i + 1;
  }
   }
if (res == -69) { 
  let c64_i = 0, c64_s = 0, c64_wx = 0, c64_wy = 0, c64_wz = 0, c64_b = 0, c64_d = 0, c64_j = 0;
  while (c64_i < n) { 
    c64_j = mod(c64_i, 6) + 1;
    c64_wx = LA[c64_j] - c64_i; c64_wy = LB[c64_j] - 37; c64_wz = LC[c64_j] - c64_i * 2;
    c64_b = c64_wx * 311 + c64_wy * 207 + c64_wz * 590;
    if (c64_b > 0) {
      c64_d = c64_b * c64_b - 480000 * (c64_wx * c64_wx + c64_wy * c64_wy + c64_wz * c64_wz - 1000000);
      if (c64_d > 0) { c64_s = c64_s + idiv(c64_b - Math.sqrt(c64_d), 1000); }
    }
    c64_i = c64_i + 1;
  }
   }
if (res == -70) { 
  let c65_i = 0, c65_s = 0, c65_wx = 0, c65_wy = 0, c65_wz = 0, c65_b = 0, c65_d = 0, c65_j = 0;
  while (c65_i < n) { 
    c65_j = mod(c65_i, 6) + 1;
    c65_wx = LA[c65_j] - c65_i; c65_wy = LB[c65_j] - 37; c65_wz = LC[c65_j] - c65_i * 2;
    c65_b = c65_wx * 311 + c65_wy * 207 + c65_wz * 590;
    if (c65_b > 0) {
      c65_d = c65_b * c65_b - 480000 * (c65_wx * c65_wx + c65_wy * c65_wy + c65_wz * c65_wz - 1000000);
      if (c65_d > 0) { c65_s = c65_s + idiv(c65_b - Math.sqrt(c65_d), 1000); }
    }
    c65_i = c65_i + 1;
  }
   }
if (res == -71) { 
  let c66_i = 0, c66_s = 0, c66_wx = 0, c66_wy = 0, c66_wz = 0, c66_b = 0, c66_d = 0, c66_j = 0;
  while (c66_i < n) { 
    c66_j = mod(c66_i, 6) + 1;
    c66_wx = LA[c66_j] - c66_i; c66_wy = LB[c66_j] - 37; c66_wz = LC[c66_j] - c66_i * 2;
    c66_b = c66_wx * 311 + c66_wy * 207 + c66_wz * 590;
    if (c66_b > 0) {
      c66_d = c66_b * c66_b - 480000 * (c66_wx * c66_wx + c66_wy * c66_wy + c66_wz * c66_wz - 1000000);
      if (c66_d > 0) { c66_s = c66_s + idiv(c66_b - Math.sqrt(c66_d), 1000); }
    }
    c66_i = c66_i + 1;
  }
   }
if (res == -72) { 
  let c67_i = 0, c67_s = 0, c67_wx = 0, c67_wy = 0, c67_wz = 0, c67_b = 0, c67_d = 0, c67_j = 0;
  while (c67_i < n) { 
    c67_j = mod(c67_i, 6) + 1;
    c67_wx = LA[c67_j] - c67_i; c67_wy = LB[c67_j] - 37; c67_wz = LC[c67_j] - c67_i * 2;
    c67_b = c67_wx * 311 + c67_wy * 207 + c67_wz * 590;
    if (c67_b > 0) {
      c67_d = c67_b * c67_b - 480000 * (c67_wx * c67_wx + c67_wy * c67_wy + c67_wz * c67_wz - 1000000);
      if (c67_d > 0) { c67_s = c67_s + idiv(c67_b - Math.sqrt(c67_d), 1000); }
    }
    c67_i = c67_i + 1;
  }
   }
if (res == -73) { 
  let c68_i = 0, c68_s = 0, c68_wx = 0, c68_wy = 0, c68_wz = 0, c68_b = 0, c68_d = 0, c68_j = 0;
  while (c68_i < n) { 
    c68_j = mod(c68_i, 6) + 1;
    c68_wx = LA[c68_j] - c68_i; c68_wy = LB[c68_j] - 37; c68_wz = LC[c68_j] - c68_i * 2;
    c68_b = c68_wx * 311 + c68_wy * 207 + c68_wz * 590;
    if (c68_b > 0) {
      c68_d = c68_b * c68_b - 480000 * (c68_wx * c68_wx + c68_wy * c68_wy + c68_wz * c68_wz - 1000000);
      if (c68_d > 0) { c68_s = c68_s + idiv(c68_b - Math.sqrt(c68_d), 1000); }
    }
    c68_i = c68_i + 1;
  }
   }
if (res == -74) { 
  let c69_i = 0, c69_s = 0, c69_wx = 0, c69_wy = 0, c69_wz = 0, c69_b = 0, c69_d = 0, c69_j = 0;
  while (c69_i < n) { 
    c69_j = mod(c69_i, 6) + 1;
    c69_wx = LA[c69_j] - c69_i; c69_wy = LB[c69_j] - 37; c69_wz = LC[c69_j] - c69_i * 2;
    c69_b = c69_wx * 311 + c69_wy * 207 + c69_wz * 590;
    if (c69_b > 0) {
      c69_d = c69_b * c69_b - 480000 * (c69_wx * c69_wx + c69_wy * c69_wy + c69_wz * c69_wz - 1000000);
      if (c69_d > 0) { c69_s = c69_s + idiv(c69_b - Math.sqrt(c69_d), 1000); }
    }
    c69_i = c69_i + 1;
  }
   }
if (res == -75) { 
  let c70_i = 0, c70_s = 0, c70_wx = 0, c70_wy = 0, c70_wz = 0, c70_b = 0, c70_d = 0, c70_j = 0;
  while (c70_i < n) { 
    c70_j = mod(c70_i, 6) + 1;
    c70_wx = LA[c70_j] - c70_i; c70_wy = LB[c70_j] - 37; c70_wz = LC[c70_j] - c70_i * 2;
    c70_b = c70_wx * 311 + c70_wy * 207 + c70_wz * 590;
    if (c70_b > 0) {
      c70_d = c70_b * c70_b - 480000 * (c70_wx * c70_wx + c70_wy * c70_wy + c70_wz * c70_wz - 1000000);
      if (c70_d > 0) { c70_s = c70_s + idiv(c70_b - Math.sqrt(c70_d), 1000); }
    }
    c70_i = c70_i + 1;
  }
   }
if (res == -76) { 
  let c71_i = 0, c71_s = 0, c71_wx = 0, c71_wy = 0, c71_wz = 0, c71_b = 0, c71_d = 0, c71_j = 0;
  while (c71_i < n) { 
    c71_j = mod(c71_i, 6) + 1;
    c71_wx = LA[c71_j] - c71_i; c71_wy = LB[c71_j] - 37; c71_wz = LC[c71_j] - c71_i * 2;
    c71_b = c71_wx * 311 + c71_wy * 207 + c71_wz * 590;
    if (c71_b > 0) {
      c71_d = c71_b * c71_b - 480000 * (c71_wx * c71_wx + c71_wy * c71_wy + c71_wz * c71_wz - 1000000);
      if (c71_d > 0) { c71_s = c71_s + idiv(c71_b - Math.sqrt(c71_d), 1000); }
    }
    c71_i = c71_i + 1;
  }
   }
if (res == -77) { 
  let c72_i = 0, c72_s = 0, c72_wx = 0, c72_wy = 0, c72_wz = 0, c72_b = 0, c72_d = 0, c72_j = 0;
  while (c72_i < n) { 
    c72_j = mod(c72_i, 6) + 1;
    c72_wx = LA[c72_j] - c72_i; c72_wy = LB[c72_j] - 37; c72_wz = LC[c72_j] - c72_i * 2;
    c72_b = c72_wx * 311 + c72_wy * 207 + c72_wz * 590;
    if (c72_b > 0) {
      c72_d = c72_b * c72_b - 480000 * (c72_wx * c72_wx + c72_wy * c72_wy + c72_wz * c72_wz - 1000000);
      if (c72_d > 0) { c72_s = c72_s + idiv(c72_b - Math.sqrt(c72_d), 1000); }
    }
    c72_i = c72_i + 1;
  }
   }
if (res == -78) { 
  let c73_i = 0, c73_s = 0, c73_wx = 0, c73_wy = 0, c73_wz = 0, c73_b = 0, c73_d = 0, c73_j = 0;
  while (c73_i < n) { 
    c73_j = mod(c73_i, 6) + 1;
    c73_wx = LA[c73_j] - c73_i; c73_wy = LB[c73_j] - 37; c73_wz = LC[c73_j] - c73_i * 2;
    c73_b = c73_wx * 311 + c73_wy * 207 + c73_wz * 590;
    if (c73_b > 0) {
      c73_d = c73_b * c73_b - 480000 * (c73_wx * c73_wx + c73_wy * c73_wy + c73_wz * c73_wz - 1000000);
      if (c73_d > 0) { c73_s = c73_s + idiv(c73_b - Math.sqrt(c73_d), 1000); }
    }
    c73_i = c73_i + 1;
  }
   }
if (res == -79) { 
  let c74_i = 0, c74_s = 0, c74_wx = 0, c74_wy = 0, c74_wz = 0, c74_b = 0, c74_d = 0, c74_j = 0;
  while (c74_i < n) { 
    c74_j = mod(c74_i, 6) + 1;
    c74_wx = LA[c74_j] - c74_i; c74_wy = LB[c74_j] - 37; c74_wz = LC[c74_j] - c74_i * 2;
    c74_b = c74_wx * 311 + c74_wy * 207 + c74_wz * 590;
    if (c74_b > 0) {
      c74_d = c74_b * c74_b - 480000 * (c74_wx * c74_wx + c74_wy * c74_wy + c74_wz * c74_wz - 1000000);
      if (c74_d > 0) { c74_s = c74_s + idiv(c74_b - Math.sqrt(c74_d), 1000); }
    }
    c74_i = c74_i + 1;
  }
   }
if (res == -80) { 
  let c75_i = 0, c75_s = 0, c75_wx = 0, c75_wy = 0, c75_wz = 0, c75_b = 0, c75_d = 0, c75_j = 0;
  while (c75_i < n) { 
    c75_j = mod(c75_i, 6) + 1;
    c75_wx = LA[c75_j] - c75_i; c75_wy = LB[c75_j] - 37; c75_wz = LC[c75_j] - c75_i * 2;
    c75_b = c75_wx * 311 + c75_wy * 207 + c75_wz * 590;
    if (c75_b > 0) {
      c75_d = c75_b * c75_b - 480000 * (c75_wx * c75_wx + c75_wy * c75_wy + c75_wz * c75_wz - 1000000);
      if (c75_d > 0) { c75_s = c75_s + idiv(c75_b - Math.sqrt(c75_d), 1000); }
    }
    c75_i = c75_i + 1;
  }
   }
if (res == -81) { 
  let c76_i = 0, c76_s = 0, c76_wx = 0, c76_wy = 0, c76_wz = 0, c76_b = 0, c76_d = 0, c76_j = 0;
  while (c76_i < n) { 
    c76_j = mod(c76_i, 6) + 1;
    c76_wx = LA[c76_j] - c76_i; c76_wy = LB[c76_j] - 37; c76_wz = LC[c76_j] - c76_i * 2;
    c76_b = c76_wx * 311 + c76_wy * 207 + c76_wz * 590;
    if (c76_b > 0) {
      c76_d = c76_b * c76_b - 480000 * (c76_wx * c76_wx + c76_wy * c76_wy + c76_wz * c76_wz - 1000000);
      if (c76_d > 0) { c76_s = c76_s + idiv(c76_b - Math.sqrt(c76_d), 1000); }
    }
    c76_i = c76_i + 1;
  }
   }
if (res == -82) { 
  let c77_i = 0, c77_s = 0, c77_wx = 0, c77_wy = 0, c77_wz = 0, c77_b = 0, c77_d = 0, c77_j = 0;
  while (c77_i < n) { 
    c77_j = mod(c77_i, 6) + 1;
    c77_wx = LA[c77_j] - c77_i; c77_wy = LB[c77_j] - 37; c77_wz = LC[c77_j] - c77_i * 2;
    c77_b = c77_wx * 311 + c77_wy * 207 + c77_wz * 590;
    if (c77_b > 0) {
      c77_d = c77_b * c77_b - 480000 * (c77_wx * c77_wx + c77_wy * c77_wy + c77_wz * c77_wz - 1000000);
      if (c77_d > 0) { c77_s = c77_s + idiv(c77_b - Math.sqrt(c77_d), 1000); }
    }
    c77_i = c77_i + 1;
  }
   }
if (res == -83) { 
  let c78_i = 0, c78_s = 0, c78_wx = 0, c78_wy = 0, c78_wz = 0, c78_b = 0, c78_d = 0, c78_j = 0;
  while (c78_i < n) { 
    c78_j = mod(c78_i, 6) + 1;
    c78_wx = LA[c78_j] - c78_i; c78_wy = LB[c78_j] - 37; c78_wz = LC[c78_j] - c78_i * 2;
    c78_b = c78_wx * 311 + c78_wy * 207 + c78_wz * 590;
    if (c78_b > 0) {
      c78_d = c78_b * c78_b - 480000 * (c78_wx * c78_wx + c78_wy * c78_wy + c78_wz * c78_wz - 1000000);
      if (c78_d > 0) { c78_s = c78_s + idiv(c78_b - Math.sqrt(c78_d), 1000); }
    }
    c78_i = c78_i + 1;
  }
   }
if (res == -84) { 
  let c79_i = 0, c79_s = 0, c79_wx = 0, c79_wy = 0, c79_wz = 0, c79_b = 0, c79_d = 0, c79_j = 0;
  while (c79_i < n) { 
    c79_j = mod(c79_i, 6) + 1;
    c79_wx = LA[c79_j] - c79_i; c79_wy = LB[c79_j] - 37; c79_wz = LC[c79_j] - c79_i * 2;
    c79_b = c79_wx * 311 + c79_wy * 207 + c79_wz * 590;
    if (c79_b > 0) {
      c79_d = c79_b * c79_b - 480000 * (c79_wx * c79_wx + c79_wy * c79_wy + c79_wz * c79_wz - 1000000);
      if (c79_d > 0) { c79_s = c79_s + idiv(c79_b - Math.sqrt(c79_d), 1000); }
    }
    c79_i = c79_i + 1;
  }
   }
if (res == -85) { 
  let c80_i = 0, c80_s = 0, c80_wx = 0, c80_wy = 0, c80_wz = 0, c80_b = 0, c80_d = 0, c80_j = 0;
  while (c80_i < n) { 
    c80_j = mod(c80_i, 6) + 1;
    c80_wx = LA[c80_j] - c80_i; c80_wy = LB[c80_j] - 37; c80_wz = LC[c80_j] - c80_i * 2;
    c80_b = c80_wx * 311 + c80_wy * 207 + c80_wz * 590;
    if (c80_b > 0) {
      c80_d = c80_b * c80_b - 480000 * (c80_wx * c80_wx + c80_wy * c80_wy + c80_wz * c80_wz - 1000000);
      if (c80_d > 0) { c80_s = c80_s + idiv(c80_b - Math.sqrt(c80_d), 1000); }
    }
    c80_i = c80_i + 1;
  }
   }
if (res == -86) { 
  let c81_i = 0, c81_s = 0, c81_wx = 0, c81_wy = 0, c81_wz = 0, c81_b = 0, c81_d = 0, c81_j = 0;
  while (c81_i < n) { 
    c81_j = mod(c81_i, 6) + 1;
    c81_wx = LA[c81_j] - c81_i; c81_wy = LB[c81_j] - 37; c81_wz = LC[c81_j] - c81_i * 2;
    c81_b = c81_wx * 311 + c81_wy * 207 + c81_wz * 590;
    if (c81_b > 0) {
      c81_d = c81_b * c81_b - 480000 * (c81_wx * c81_wx + c81_wy * c81_wy + c81_wz * c81_wz - 1000000);
      if (c81_d > 0) { c81_s = c81_s + idiv(c81_b - Math.sqrt(c81_d), 1000); }
    }
    c81_i = c81_i + 1;
  }
   }
if (res == -87) { 
  let c82_i = 0, c82_s = 0, c82_wx = 0, c82_wy = 0, c82_wz = 0, c82_b = 0, c82_d = 0, c82_j = 0;
  while (c82_i < n) { 
    c82_j = mod(c82_i, 6) + 1;
    c82_wx = LA[c82_j] - c82_i; c82_wy = LB[c82_j] - 37; c82_wz = LC[c82_j] - c82_i * 2;
    c82_b = c82_wx * 311 + c82_wy * 207 + c82_wz * 590;
    if (c82_b > 0) {
      c82_d = c82_b * c82_b - 480000 * (c82_wx * c82_wx + c82_wy * c82_wy + c82_wz * c82_wz - 1000000);
      if (c82_d > 0) { c82_s = c82_s + idiv(c82_b - Math.sqrt(c82_d), 1000); }
    }
    c82_i = c82_i + 1;
  }
   }
if (res == -88) { 
  let c83_i = 0, c83_s = 0, c83_wx = 0, c83_wy = 0, c83_wz = 0, c83_b = 0, c83_d = 0, c83_j = 0;
  while (c83_i < n) { 
    c83_j = mod(c83_i, 6) + 1;
    c83_wx = LA[c83_j] - c83_i; c83_wy = LB[c83_j] - 37; c83_wz = LC[c83_j] - c83_i * 2;
    c83_b = c83_wx * 311 + c83_wy * 207 + c83_wz * 590;
    if (c83_b > 0) {
      c83_d = c83_b * c83_b - 480000 * (c83_wx * c83_wx + c83_wy * c83_wy + c83_wz * c83_wz - 1000000);
      if (c83_d > 0) { c83_s = c83_s + idiv(c83_b - Math.sqrt(c83_d), 1000); }
    }
    c83_i = c83_i + 1;
  }
   }
if (res == -89) { 
  let c84_i = 0, c84_s = 0, c84_wx = 0, c84_wy = 0, c84_wz = 0, c84_b = 0, c84_d = 0, c84_j = 0;
  while (c84_i < n) { 
    c84_j = mod(c84_i, 6) + 1;
    c84_wx = LA[c84_j] - c84_i; c84_wy = LB[c84_j] - 37; c84_wz = LC[c84_j] - c84_i * 2;
    c84_b = c84_wx * 311 + c84_wy * 207 + c84_wz * 590;
    if (c84_b > 0) {
      c84_d = c84_b * c84_b - 480000 * (c84_wx * c84_wx + c84_wy * c84_wy + c84_wz * c84_wz - 1000000);
      if (c84_d > 0) { c84_s = c84_s + idiv(c84_b - Math.sqrt(c84_d), 1000); }
    }
    c84_i = c84_i + 1;
  }
   }
if (res == -90) { 
  let c85_i = 0, c85_s = 0, c85_wx = 0, c85_wy = 0, c85_wz = 0, c85_b = 0, c85_d = 0, c85_j = 0;
  while (c85_i < n) { 
    c85_j = mod(c85_i, 6) + 1;
    c85_wx = LA[c85_j] - c85_i; c85_wy = LB[c85_j] - 37; c85_wz = LC[c85_j] - c85_i * 2;
    c85_b = c85_wx * 311 + c85_wy * 207 + c85_wz * 590;
    if (c85_b > 0) {
      c85_d = c85_b * c85_b - 480000 * (c85_wx * c85_wx + c85_wy * c85_wy + c85_wz * c85_wz - 1000000);
      if (c85_d > 0) { c85_s = c85_s + idiv(c85_b - Math.sqrt(c85_d), 1000); }
    }
    c85_i = c85_i + 1;
  }
   }
if (res == -91) { 
  let c86_i = 0, c86_s = 0, c86_wx = 0, c86_wy = 0, c86_wz = 0, c86_b = 0, c86_d = 0, c86_j = 0;
  while (c86_i < n) { 
    c86_j = mod(c86_i, 6) + 1;
    c86_wx = LA[c86_j] - c86_i; c86_wy = LB[c86_j] - 37; c86_wz = LC[c86_j] - c86_i * 2;
    c86_b = c86_wx * 311 + c86_wy * 207 + c86_wz * 590;
    if (c86_b > 0) {
      c86_d = c86_b * c86_b - 480000 * (c86_wx * c86_wx + c86_wy * c86_wy + c86_wz * c86_wz - 1000000);
      if (c86_d > 0) { c86_s = c86_s + idiv(c86_b - Math.sqrt(c86_d), 1000); }
    }
    c86_i = c86_i + 1;
  }
   }
if (res == -92) { 
  let c87_i = 0, c87_s = 0, c87_wx = 0, c87_wy = 0, c87_wz = 0, c87_b = 0, c87_d = 0, c87_j = 0;
  while (c87_i < n) { 
    c87_j = mod(c87_i, 6) + 1;
    c87_wx = LA[c87_j] - c87_i; c87_wy = LB[c87_j] - 37; c87_wz = LC[c87_j] - c87_i * 2;
    c87_b = c87_wx * 311 + c87_wy * 207 + c87_wz * 590;
    if (c87_b > 0) {
      c87_d = c87_b * c87_b - 480000 * (c87_wx * c87_wx + c87_wy * c87_wy + c87_wz * c87_wz - 1000000);
      if (c87_d > 0) { c87_s = c87_s + idiv(c87_b - Math.sqrt(c87_d), 1000); }
    }
    c87_i = c87_i + 1;
  }
   }
if (res == -93) { 
  let c88_i = 0, c88_s = 0, c88_wx = 0, c88_wy = 0, c88_wz = 0, c88_b = 0, c88_d = 0, c88_j = 0;
  while (c88_i < n) { 
    c88_j = mod(c88_i, 6) + 1;
    c88_wx = LA[c88_j] - c88_i; c88_wy = LB[c88_j] - 37; c88_wz = LC[c88_j] - c88_i * 2;
    c88_b = c88_wx * 311 + c88_wy * 207 + c88_wz * 590;
    if (c88_b > 0) {
      c88_d = c88_b * c88_b - 480000 * (c88_wx * c88_wx + c88_wy * c88_wy + c88_wz * c88_wz - 1000000);
      if (c88_d > 0) { c88_s = c88_s + idiv(c88_b - Math.sqrt(c88_d), 1000); }
    }
    c88_i = c88_i + 1;
  }
   }
if (res == -94) { 
  let c89_i = 0, c89_s = 0, c89_wx = 0, c89_wy = 0, c89_wz = 0, c89_b = 0, c89_d = 0, c89_j = 0;
  while (c89_i < n) { 
    c89_j = mod(c89_i, 6) + 1;
    c89_wx = LA[c89_j] - c89_i; c89_wy = LB[c89_j] - 37; c89_wz = LC[c89_j] - c89_i * 2;
    c89_b = c89_wx * 311 + c89_wy * 207 + c89_wz * 590;
    if (c89_b > 0) {
      c89_d = c89_b * c89_b - 480000 * (c89_wx * c89_wx + c89_wy * c89_wy + c89_wz * c89_wz - 1000000);
      if (c89_d > 0) { c89_s = c89_s + idiv(c89_b - Math.sqrt(c89_d), 1000); }
    }
    c89_i = c89_i + 1;
  }
   }
if (res == -95) { 
  let c90_i = 0, c90_s = 0, c90_wx = 0, c90_wy = 0, c90_wz = 0, c90_b = 0, c90_d = 0, c90_j = 0;
  while (c90_i < n) { 
    c90_j = mod(c90_i, 6) + 1;
    c90_wx = LA[c90_j] - c90_i; c90_wy = LB[c90_j] - 37; c90_wz = LC[c90_j] - c90_i * 2;
    c90_b = c90_wx * 311 + c90_wy * 207 + c90_wz * 590;
    if (c90_b > 0) {
      c90_d = c90_b * c90_b - 480000 * (c90_wx * c90_wx + c90_wy * c90_wy + c90_wz * c90_wz - 1000000);
      if (c90_d > 0) { c90_s = c90_s + idiv(c90_b - Math.sqrt(c90_d), 1000); }
    }
    c90_i = c90_i + 1;
  }
   }
if (res == -96) { 
  let c91_i = 0, c91_s = 0, c91_wx = 0, c91_wy = 0, c91_wz = 0, c91_b = 0, c91_d = 0, c91_j = 0;
  while (c91_i < n) { 
    c91_j = mod(c91_i, 6) + 1;
    c91_wx = LA[c91_j] - c91_i; c91_wy = LB[c91_j] - 37; c91_wz = LC[c91_j] - c91_i * 2;
    c91_b = c91_wx * 311 + c91_wy * 207 + c91_wz * 590;
    if (c91_b > 0) {
      c91_d = c91_b * c91_b - 480000 * (c91_wx * c91_wx + c91_wy * c91_wy + c91_wz * c91_wz - 1000000);
      if (c91_d > 0) { c91_s = c91_s + idiv(c91_b - Math.sqrt(c91_d), 1000); }
    }
    c91_i = c91_i + 1;
  }
   }
if (res == -97) { 
  let c92_i = 0, c92_s = 0, c92_wx = 0, c92_wy = 0, c92_wz = 0, c92_b = 0, c92_d = 0, c92_j = 0;
  while (c92_i < n) { 
    c92_j = mod(c92_i, 6) + 1;
    c92_wx = LA[c92_j] - c92_i; c92_wy = LB[c92_j] - 37; c92_wz = LC[c92_j] - c92_i * 2;
    c92_b = c92_wx * 311 + c92_wy * 207 + c92_wz * 590;
    if (c92_b > 0) {
      c92_d = c92_b * c92_b - 480000 * (c92_wx * c92_wx + c92_wy * c92_wy + c92_wz * c92_wz - 1000000);
      if (c92_d > 0) { c92_s = c92_s + idiv(c92_b - Math.sqrt(c92_d), 1000); }
    }
    c92_i = c92_i + 1;
  }
   }
if (res == -98) { 
  let c93_i = 0, c93_s = 0, c93_wx = 0, c93_wy = 0, c93_wz = 0, c93_b = 0, c93_d = 0, c93_j = 0;
  while (c93_i < n) { 
    c93_j = mod(c93_i, 6) + 1;
    c93_wx = LA[c93_j] - c93_i; c93_wy = LB[c93_j] - 37; c93_wz = LC[c93_j] - c93_i * 2;
    c93_b = c93_wx * 311 + c93_wy * 207 + c93_wz * 590;
    if (c93_b > 0) {
      c93_d = c93_b * c93_b - 480000 * (c93_wx * c93_wx + c93_wy * c93_wy + c93_wz * c93_wz - 1000000);
      if (c93_d > 0) { c93_s = c93_s + idiv(c93_b - Math.sqrt(c93_d), 1000); }
    }
    c93_i = c93_i + 1;
  }
   }
if (res == -99) { 
  let c94_i = 0, c94_s = 0, c94_wx = 0, c94_wy = 0, c94_wz = 0, c94_b = 0, c94_d = 0, c94_j = 0;
  while (c94_i < n) { 
    c94_j = mod(c94_i, 6) + 1;
    c94_wx = LA[c94_j] - c94_i; c94_wy = LB[c94_j] - 37; c94_wz = LC[c94_j] - c94_i * 2;
    c94_b = c94_wx * 311 + c94_wy * 207 + c94_wz * 590;
    if (c94_b > 0) {
      c94_d = c94_b * c94_b - 480000 * (c94_wx * c94_wx + c94_wy * c94_wy + c94_wz * c94_wz - 1000000);
      if (c94_d > 0) { c94_s = c94_s + idiv(c94_b - Math.sqrt(c94_d), 1000); }
    }
    c94_i = c94_i + 1;
  }
   }
if (res == -100) { 
  let c95_i = 0, c95_s = 0, c95_wx = 0, c95_wy = 0, c95_wz = 0, c95_b = 0, c95_d = 0, c95_j = 0;
  while (c95_i < n) { 
    c95_j = mod(c95_i, 6) + 1;
    c95_wx = LA[c95_j] - c95_i; c95_wy = LB[c95_j] - 37; c95_wz = LC[c95_j] - c95_i * 2;
    c95_b = c95_wx * 311 + c95_wy * 207 + c95_wz * 590;
    if (c95_b > 0) {
      c95_d = c95_b * c95_b - 480000 * (c95_wx * c95_wx + c95_wy * c95_wy + c95_wz * c95_wz - 1000000);
      if (c95_d > 0) { c95_s = c95_s + idiv(c95_b - Math.sqrt(c95_d), 1000); }
    }
    c95_i = c95_i + 1;
  }
   }
if (res == -101) { 
  let c96_i = 0, c96_s = 0, c96_wx = 0, c96_wy = 0, c96_wz = 0, c96_b = 0, c96_d = 0, c96_j = 0;
  while (c96_i < n) { 
    c96_j = mod(c96_i, 6) + 1;
    c96_wx = LA[c96_j] - c96_i; c96_wy = LB[c96_j] - 37; c96_wz = LC[c96_j] - c96_i * 2;
    c96_b = c96_wx * 311 + c96_wy * 207 + c96_wz * 590;
    if (c96_b > 0) {
      c96_d = c96_b * c96_b - 480000 * (c96_wx * c96_wx + c96_wy * c96_wy + c96_wz * c96_wz - 1000000);
      if (c96_d > 0) { c96_s = c96_s + idiv(c96_b - Math.sqrt(c96_d), 1000); }
    }
    c96_i = c96_i + 1;
  }
   }
if (res == -102) { 
  let c97_i = 0, c97_s = 0, c97_wx = 0, c97_wy = 0, c97_wz = 0, c97_b = 0, c97_d = 0, c97_j = 0;
  while (c97_i < n) { 
    c97_j = mod(c97_i, 6) + 1;
    c97_wx = LA[c97_j] - c97_i; c97_wy = LB[c97_j] - 37; c97_wz = LC[c97_j] - c97_i * 2;
    c97_b = c97_wx * 311 + c97_wy * 207 + c97_wz * 590;
    if (c97_b > 0) {
      c97_d = c97_b * c97_b - 480000 * (c97_wx * c97_wx + c97_wy * c97_wy + c97_wz * c97_wz - 1000000);
      if (c97_d > 0) { c97_s = c97_s + idiv(c97_b - Math.sqrt(c97_d), 1000); }
    }
    c97_i = c97_i + 1;
  }
   }
if (res == -103) { 
  let c98_i = 0, c98_s = 0, c98_wx = 0, c98_wy = 0, c98_wz = 0, c98_b = 0, c98_d = 0, c98_j = 0;
  while (c98_i < n) { 
    c98_j = mod(c98_i, 6) + 1;
    c98_wx = LA[c98_j] - c98_i; c98_wy = LB[c98_j] - 37; c98_wz = LC[c98_j] - c98_i * 2;
    c98_b = c98_wx * 311 + c98_wy * 207 + c98_wz * 590;
    if (c98_b > 0) {
      c98_d = c98_b * c98_b - 480000 * (c98_wx * c98_wx + c98_wy * c98_wy + c98_wz * c98_wz - 1000000);
      if (c98_d > 0) { c98_s = c98_s + idiv(c98_b - Math.sqrt(c98_d), 1000); }
    }
    c98_i = c98_i + 1;
  }
   }
if (res == -104) { 
  let c99_i = 0, c99_s = 0, c99_wx = 0, c99_wy = 0, c99_wz = 0, c99_b = 0, c99_d = 0, c99_j = 0;
  while (c99_i < n) { 
    c99_j = mod(c99_i, 6) + 1;
    c99_wx = LA[c99_j] - c99_i; c99_wy = LB[c99_j] - 37; c99_wz = LC[c99_j] - c99_i * 2;
    c99_b = c99_wx * 311 + c99_wy * 207 + c99_wz * 590;
    if (c99_b > 0) {
      c99_d = c99_b * c99_b - 480000 * (c99_wx * c99_wx + c99_wy * c99_wy + c99_wz * c99_wz - 1000000);
      if (c99_d > 0) { c99_s = c99_s + idiv(c99_b - Math.sqrt(c99_d), 1000); }
    }
    c99_i = c99_i + 1;
  }
   }
if (res == -105) { 
  let c100_i = 0, c100_s = 0, c100_wx = 0, c100_wy = 0, c100_wz = 0, c100_b = 0, c100_d = 0, c100_j = 0;
  while (c100_i < n) { 
    c100_j = mod(c100_i, 6) + 1;
    c100_wx = LA[c100_j] - c100_i; c100_wy = LB[c100_j] - 37; c100_wz = LC[c100_j] - c100_i * 2;
    c100_b = c100_wx * 311 + c100_wy * 207 + c100_wz * 590;
    if (c100_b > 0) {
      c100_d = c100_b * c100_b - 480000 * (c100_wx * c100_wx + c100_wy * c100_wy + c100_wz * c100_wz - 1000000);
      if (c100_d > 0) { c100_s = c100_s + idiv(c100_b - Math.sqrt(c100_d), 1000); }
    }
    c100_i = c100_i + 1;
  }
   }
if (res == -106) { 
  let c101_i = 0, c101_s = 0, c101_wx = 0, c101_wy = 0, c101_wz = 0, c101_b = 0, c101_d = 0, c101_j = 0;
  while (c101_i < n) { 
    c101_j = mod(c101_i, 6) + 1;
    c101_wx = LA[c101_j] - c101_i; c101_wy = LB[c101_j] - 37; c101_wz = LC[c101_j] - c101_i * 2;
    c101_b = c101_wx * 311 + c101_wy * 207 + c101_wz * 590;
    if (c101_b > 0) {
      c101_d = c101_b * c101_b - 480000 * (c101_wx * c101_wx + c101_wy * c101_wy + c101_wz * c101_wz - 1000000);
      if (c101_d > 0) { c101_s = c101_s + idiv(c101_b - Math.sqrt(c101_d), 1000); }
    }
    c101_i = c101_i + 1;
  }
   }
if (res == -107) { 
  let c102_i = 0, c102_s = 0, c102_wx = 0, c102_wy = 0, c102_wz = 0, c102_b = 0, c102_d = 0, c102_j = 0;
  while (c102_i < n) { 
    c102_j = mod(c102_i, 6) + 1;
    c102_wx = LA[c102_j] - c102_i; c102_wy = LB[c102_j] - 37; c102_wz = LC[c102_j] - c102_i * 2;
    c102_b = c102_wx * 311 + c102_wy * 207 + c102_wz * 590;
    if (c102_b > 0) {
      c102_d = c102_b * c102_b - 480000 * (c102_wx * c102_wx + c102_wy * c102_wy + c102_wz * c102_wz - 1000000);
      if (c102_d > 0) { c102_s = c102_s + idiv(c102_b - Math.sqrt(c102_d), 1000); }
    }
    c102_i = c102_i + 1;
  }
   }
if (res == -108) { 
  let c103_i = 0, c103_s = 0, c103_wx = 0, c103_wy = 0, c103_wz = 0, c103_b = 0, c103_d = 0, c103_j = 0;
  while (c103_i < n) { 
    c103_j = mod(c103_i, 6) + 1;
    c103_wx = LA[c103_j] - c103_i; c103_wy = LB[c103_j] - 37; c103_wz = LC[c103_j] - c103_i * 2;
    c103_b = c103_wx * 311 + c103_wy * 207 + c103_wz * 590;
    if (c103_b > 0) {
      c103_d = c103_b * c103_b - 480000 * (c103_wx * c103_wx + c103_wy * c103_wy + c103_wz * c103_wz - 1000000);
      if (c103_d > 0) { c103_s = c103_s + idiv(c103_b - Math.sqrt(c103_d), 1000); }
    }
    c103_i = c103_i + 1;
  }
   }
if (res == -109) { 
  let c104_i = 0, c104_s = 0, c104_wx = 0, c104_wy = 0, c104_wz = 0, c104_b = 0, c104_d = 0, c104_j = 0;
  while (c104_i < n) { 
    c104_j = mod(c104_i, 6) + 1;
    c104_wx = LA[c104_j] - c104_i; c104_wy = LB[c104_j] - 37; c104_wz = LC[c104_j] - c104_i * 2;
    c104_b = c104_wx * 311 + c104_wy * 207 + c104_wz * 590;
    if (c104_b > 0) {
      c104_d = c104_b * c104_b - 480000 * (c104_wx * c104_wx + c104_wy * c104_wy + c104_wz * c104_wz - 1000000);
      if (c104_d > 0) { c104_s = c104_s + idiv(c104_b - Math.sqrt(c104_d), 1000); }
    }
    c104_i = c104_i + 1;
  }
   }
if (res == -110) { 
  let c105_i = 0, c105_s = 0, c105_wx = 0, c105_wy = 0, c105_wz = 0, c105_b = 0, c105_d = 0, c105_j = 0;
  while (c105_i < n) { 
    c105_j = mod(c105_i, 6) + 1;
    c105_wx = LA[c105_j] - c105_i; c105_wy = LB[c105_j] - 37; c105_wz = LC[c105_j] - c105_i * 2;
    c105_b = c105_wx * 311 + c105_wy * 207 + c105_wz * 590;
    if (c105_b > 0) {
      c105_d = c105_b * c105_b - 480000 * (c105_wx * c105_wx + c105_wy * c105_wy + c105_wz * c105_wz - 1000000);
      if (c105_d > 0) { c105_s = c105_s + idiv(c105_b - Math.sqrt(c105_d), 1000); }
    }
    c105_i = c105_i + 1;
  }
   }
if (res == -111) { 
  let c106_i = 0, c106_s = 0, c106_wx = 0, c106_wy = 0, c106_wz = 0, c106_b = 0, c106_d = 0, c106_j = 0;
  while (c106_i < n) { 
    c106_j = mod(c106_i, 6) + 1;
    c106_wx = LA[c106_j] - c106_i; c106_wy = LB[c106_j] - 37; c106_wz = LC[c106_j] - c106_i * 2;
    c106_b = c106_wx * 311 + c106_wy * 207 + c106_wz * 590;
    if (c106_b > 0) {
      c106_d = c106_b * c106_b - 480000 * (c106_wx * c106_wx + c106_wy * c106_wy + c106_wz * c106_wz - 1000000);
      if (c106_d > 0) { c106_s = c106_s + idiv(c106_b - Math.sqrt(c106_d), 1000); }
    }
    c106_i = c106_i + 1;
  }
   }
if (res == -112) { 
  let c107_i = 0, c107_s = 0, c107_wx = 0, c107_wy = 0, c107_wz = 0, c107_b = 0, c107_d = 0, c107_j = 0;
  while (c107_i < n) { 
    c107_j = mod(c107_i, 6) + 1;
    c107_wx = LA[c107_j] - c107_i; c107_wy = LB[c107_j] - 37; c107_wz = LC[c107_j] - c107_i * 2;
    c107_b = c107_wx * 311 + c107_wy * 207 + c107_wz * 590;
    if (c107_b > 0) {
      c107_d = c107_b * c107_b - 480000 * (c107_wx * c107_wx + c107_wy * c107_wy + c107_wz * c107_wz - 1000000);
      if (c107_d > 0) { c107_s = c107_s + idiv(c107_b - Math.sqrt(c107_d), 1000); }
    }
    c107_i = c107_i + 1;
  }
   }
if (res == -113) { 
  let c108_i = 0, c108_s = 0, c108_wx = 0, c108_wy = 0, c108_wz = 0, c108_b = 0, c108_d = 0, c108_j = 0;
  while (c108_i < n) { 
    c108_j = mod(c108_i, 6) + 1;
    c108_wx = LA[c108_j] - c108_i; c108_wy = LB[c108_j] - 37; c108_wz = LC[c108_j] - c108_i * 2;
    c108_b = c108_wx * 311 + c108_wy * 207 + c108_wz * 590;
    if (c108_b > 0) {
      c108_d = c108_b * c108_b - 480000 * (c108_wx * c108_wx + c108_wy * c108_wy + c108_wz * c108_wz - 1000000);
      if (c108_d > 0) { c108_s = c108_s + idiv(c108_b - Math.sqrt(c108_d), 1000); }
    }
    c108_i = c108_i + 1;
  }
   }
if (res == -114) { 
  let c109_i = 0, c109_s = 0, c109_wx = 0, c109_wy = 0, c109_wz = 0, c109_b = 0, c109_d = 0, c109_j = 0;
  while (c109_i < n) { 
    c109_j = mod(c109_i, 6) + 1;
    c109_wx = LA[c109_j] - c109_i; c109_wy = LB[c109_j] - 37; c109_wz = LC[c109_j] - c109_i * 2;
    c109_b = c109_wx * 311 + c109_wy * 207 + c109_wz * 590;
    if (c109_b > 0) {
      c109_d = c109_b * c109_b - 480000 * (c109_wx * c109_wx + c109_wy * c109_wy + c109_wz * c109_wz - 1000000);
      if (c109_d > 0) { c109_s = c109_s + idiv(c109_b - Math.sqrt(c109_d), 1000); }
    }
    c109_i = c109_i + 1;
  }
   }
if (res == -115) { 
  let c110_i = 0, c110_s = 0, c110_wx = 0, c110_wy = 0, c110_wz = 0, c110_b = 0, c110_d = 0, c110_j = 0;
  while (c110_i < n) { 
    c110_j = mod(c110_i, 6) + 1;
    c110_wx = LA[c110_j] - c110_i; c110_wy = LB[c110_j] - 37; c110_wz = LC[c110_j] - c110_i * 2;
    c110_b = c110_wx * 311 + c110_wy * 207 + c110_wz * 590;
    if (c110_b > 0) {
      c110_d = c110_b * c110_b - 480000 * (c110_wx * c110_wx + c110_wy * c110_wy + c110_wz * c110_wz - 1000000);
      if (c110_d > 0) { c110_s = c110_s + idiv(c110_b - Math.sqrt(c110_d), 1000); }
    }
    c110_i = c110_i + 1;
  }
   }
if (res == -116) { 
  let c111_i = 0, c111_s = 0, c111_wx = 0, c111_wy = 0, c111_wz = 0, c111_b = 0, c111_d = 0, c111_j = 0;
  while (c111_i < n) { 
    c111_j = mod(c111_i, 6) + 1;
    c111_wx = LA[c111_j] - c111_i; c111_wy = LB[c111_j] - 37; c111_wz = LC[c111_j] - c111_i * 2;
    c111_b = c111_wx * 311 + c111_wy * 207 + c111_wz * 590;
    if (c111_b > 0) {
      c111_d = c111_b * c111_b - 480000 * (c111_wx * c111_wx + c111_wy * c111_wy + c111_wz * c111_wz - 1000000);
      if (c111_d > 0) { c111_s = c111_s + idiv(c111_b - Math.sqrt(c111_d), 1000); }
    }
    c111_i = c111_i + 1;
  }
   }
if (res == -117) { 
  let c112_i = 0, c112_s = 0, c112_wx = 0, c112_wy = 0, c112_wz = 0, c112_b = 0, c112_d = 0, c112_j = 0;
  while (c112_i < n) { 
    c112_j = mod(c112_i, 6) + 1;
    c112_wx = LA[c112_j] - c112_i; c112_wy = LB[c112_j] - 37; c112_wz = LC[c112_j] - c112_i * 2;
    c112_b = c112_wx * 311 + c112_wy * 207 + c112_wz * 590;
    if (c112_b > 0) {
      c112_d = c112_b * c112_b - 480000 * (c112_wx * c112_wx + c112_wy * c112_wy + c112_wz * c112_wz - 1000000);
      if (c112_d > 0) { c112_s = c112_s + idiv(c112_b - Math.sqrt(c112_d), 1000); }
    }
    c112_i = c112_i + 1;
  }
   }
if (res == -118) { 
  let c113_i = 0, c113_s = 0, c113_wx = 0, c113_wy = 0, c113_wz = 0, c113_b = 0, c113_d = 0, c113_j = 0;
  while (c113_i < n) { 
    c113_j = mod(c113_i, 6) + 1;
    c113_wx = LA[c113_j] - c113_i; c113_wy = LB[c113_j] - 37; c113_wz = LC[c113_j] - c113_i * 2;
    c113_b = c113_wx * 311 + c113_wy * 207 + c113_wz * 590;
    if (c113_b > 0) {
      c113_d = c113_b * c113_b - 480000 * (c113_wx * c113_wx + c113_wy * c113_wy + c113_wz * c113_wz - 1000000);
      if (c113_d > 0) { c113_s = c113_s + idiv(c113_b - Math.sqrt(c113_d), 1000); }
    }
    c113_i = c113_i + 1;
  }
   }
if (res == -119) { 
  let c114_i = 0, c114_s = 0, c114_wx = 0, c114_wy = 0, c114_wz = 0, c114_b = 0, c114_d = 0, c114_j = 0;
  while (c114_i < n) { 
    c114_j = mod(c114_i, 6) + 1;
    c114_wx = LA[c114_j] - c114_i; c114_wy = LB[c114_j] - 37; c114_wz = LC[c114_j] - c114_i * 2;
    c114_b = c114_wx * 311 + c114_wy * 207 + c114_wz * 590;
    if (c114_b > 0) {
      c114_d = c114_b * c114_b - 480000 * (c114_wx * c114_wx + c114_wy * c114_wy + c114_wz * c114_wz - 1000000);
      if (c114_d > 0) { c114_s = c114_s + idiv(c114_b - Math.sqrt(c114_d), 1000); }
    }
    c114_i = c114_i + 1;
  }
   }
if (res == -120) { 
  let c115_i = 0, c115_s = 0, c115_wx = 0, c115_wy = 0, c115_wz = 0, c115_b = 0, c115_d = 0, c115_j = 0;
  while (c115_i < n) { 
    c115_j = mod(c115_i, 6) + 1;
    c115_wx = LA[c115_j] - c115_i; c115_wy = LB[c115_j] - 37; c115_wz = LC[c115_j] - c115_i * 2;
    c115_b = c115_wx * 311 + c115_wy * 207 + c115_wz * 590;
    if (c115_b > 0) {
      c115_d = c115_b * c115_b - 480000 * (c115_wx * c115_wx + c115_wy * c115_wy + c115_wz * c115_wz - 1000000);
      if (c115_d > 0) { c115_s = c115_s + idiv(c115_b - Math.sqrt(c115_d), 1000); }
    }
    c115_i = c115_i + 1;
  }
   }
if (res == -121) { 
  let c116_i = 0, c116_s = 0, c116_wx = 0, c116_wy = 0, c116_wz = 0, c116_b = 0, c116_d = 0, c116_j = 0;
  while (c116_i < n) { 
    c116_j = mod(c116_i, 6) + 1;
    c116_wx = LA[c116_j] - c116_i; c116_wy = LB[c116_j] - 37; c116_wz = LC[c116_j] - c116_i * 2;
    c116_b = c116_wx * 311 + c116_wy * 207 + c116_wz * 590;
    if (c116_b > 0) {
      c116_d = c116_b * c116_b - 480000 * (c116_wx * c116_wx + c116_wy * c116_wy + c116_wz * c116_wz - 1000000);
      if (c116_d > 0) { c116_s = c116_s + idiv(c116_b - Math.sqrt(c116_d), 1000); }
    }
    c116_i = c116_i + 1;
  }
   }
if (res == -122) { 
  let c117_i = 0, c117_s = 0, c117_wx = 0, c117_wy = 0, c117_wz = 0, c117_b = 0, c117_d = 0, c117_j = 0;
  while (c117_i < n) { 
    c117_j = mod(c117_i, 6) + 1;
    c117_wx = LA[c117_j] - c117_i; c117_wy = LB[c117_j] - 37; c117_wz = LC[c117_j] - c117_i * 2;
    c117_b = c117_wx * 311 + c117_wy * 207 + c117_wz * 590;
    if (c117_b > 0) {
      c117_d = c117_b * c117_b - 480000 * (c117_wx * c117_wx + c117_wy * c117_wy + c117_wz * c117_wz - 1000000);
      if (c117_d > 0) { c117_s = c117_s + idiv(c117_b - Math.sqrt(c117_d), 1000); }
    }
    c117_i = c117_i + 1;
  }
   }
if (res == -123) { 
  let c118_i = 0, c118_s = 0, c118_wx = 0, c118_wy = 0, c118_wz = 0, c118_b = 0, c118_d = 0, c118_j = 0;
  while (c118_i < n) { 
    c118_j = mod(c118_i, 6) + 1;
    c118_wx = LA[c118_j] - c118_i; c118_wy = LB[c118_j] - 37; c118_wz = LC[c118_j] - c118_i * 2;
    c118_b = c118_wx * 311 + c118_wy * 207 + c118_wz * 590;
    if (c118_b > 0) {
      c118_d = c118_b * c118_b - 480000 * (c118_wx * c118_wx + c118_wy * c118_wy + c118_wz * c118_wz - 1000000);
      if (c118_d > 0) { c118_s = c118_s + idiv(c118_b - Math.sqrt(c118_d), 1000); }
    }
    c118_i = c118_i + 1;
  }
   }
if (res == -124) { 
  let c119_i = 0, c119_s = 0, c119_wx = 0, c119_wy = 0, c119_wz = 0, c119_b = 0, c119_d = 0, c119_j = 0;
  while (c119_i < n) { 
    c119_j = mod(c119_i, 6) + 1;
    c119_wx = LA[c119_j] - c119_i; c119_wy = LB[c119_j] - 37; c119_wz = LC[c119_j] - c119_i * 2;
    c119_b = c119_wx * 311 + c119_wy * 207 + c119_wz * 590;
    if (c119_b > 0) {
      c119_d = c119_b * c119_b - 480000 * (c119_wx * c119_wx + c119_wy * c119_wy + c119_wz * c119_wz - 1000000);
      if (c119_d > 0) { c119_s = c119_s + idiv(c119_b - Math.sqrt(c119_d), 1000); }
    }
    c119_i = c119_i + 1;
  }
   }
if (res == -125) { 
  let c120_i = 0, c120_s = 0, c120_wx = 0, c120_wy = 0, c120_wz = 0, c120_b = 0, c120_d = 0, c120_j = 0;
  while (c120_i < n) { 
    c120_j = mod(c120_i, 6) + 1;
    c120_wx = LA[c120_j] - c120_i; c120_wy = LB[c120_j] - 37; c120_wz = LC[c120_j] - c120_i * 2;
    c120_b = c120_wx * 311 + c120_wy * 207 + c120_wz * 590;
    if (c120_b > 0) {
      c120_d = c120_b * c120_b - 480000 * (c120_wx * c120_wx + c120_wy * c120_wy + c120_wz * c120_wz - 1000000);
      if (c120_d > 0) { c120_s = c120_s + idiv(c120_b - Math.sqrt(c120_d), 1000); }
    }
    c120_i = c120_i + 1;
  }
   }
if (res == -126) { 
  let c121_i = 0, c121_s = 0, c121_wx = 0, c121_wy = 0, c121_wz = 0, c121_b = 0, c121_d = 0, c121_j = 0;
  while (c121_i < n) { 
    c121_j = mod(c121_i, 6) + 1;
    c121_wx = LA[c121_j] - c121_i; c121_wy = LB[c121_j] - 37; c121_wz = LC[c121_j] - c121_i * 2;
    c121_b = c121_wx * 311 + c121_wy * 207 + c121_wz * 590;
    if (c121_b > 0) {
      c121_d = c121_b * c121_b - 480000 * (c121_wx * c121_wx + c121_wy * c121_wy + c121_wz * c121_wz - 1000000);
      if (c121_d > 0) { c121_s = c121_s + idiv(c121_b - Math.sqrt(c121_d), 1000); }
    }
    c121_i = c121_i + 1;
  }
   }
if (res == -127) { 
  let c122_i = 0, c122_s = 0, c122_wx = 0, c122_wy = 0, c122_wz = 0, c122_b = 0, c122_d = 0, c122_j = 0;
  while (c122_i < n) { 
    c122_j = mod(c122_i, 6) + 1;
    c122_wx = LA[c122_j] - c122_i; c122_wy = LB[c122_j] - 37; c122_wz = LC[c122_j] - c122_i * 2;
    c122_b = c122_wx * 311 + c122_wy * 207 + c122_wz * 590;
    if (c122_b > 0) {
      c122_d = c122_b * c122_b - 480000 * (c122_wx * c122_wx + c122_wy * c122_wy + c122_wz * c122_wz - 1000000);
      if (c122_d > 0) { c122_s = c122_s + idiv(c122_b - Math.sqrt(c122_d), 1000); }
    }
    c122_i = c122_i + 1;
  }
   }
if (res == -128) { 
  let c123_i = 0, c123_s = 0, c123_wx = 0, c123_wy = 0, c123_wz = 0, c123_b = 0, c123_d = 0, c123_j = 0;
  while (c123_i < n) { 
    c123_j = mod(c123_i, 6) + 1;
    c123_wx = LA[c123_j] - c123_i; c123_wy = LB[c123_j] - 37; c123_wz = LC[c123_j] - c123_i * 2;
    c123_b = c123_wx * 311 + c123_wy * 207 + c123_wz * 590;
    if (c123_b > 0) {
      c123_d = c123_b * c123_b - 480000 * (c123_wx * c123_wx + c123_wy * c123_wy + c123_wz * c123_wz - 1000000);
      if (c123_d > 0) { c123_s = c123_s + idiv(c123_b - Math.sqrt(c123_d), 1000); }
    }
    c123_i = c123_i + 1;
  }
   }
if (res == -129) { 
  let c124_i = 0, c124_s = 0, c124_wx = 0, c124_wy = 0, c124_wz = 0, c124_b = 0, c124_d = 0, c124_j = 0;
  while (c124_i < n) { 
    c124_j = mod(c124_i, 6) + 1;
    c124_wx = LA[c124_j] - c124_i; c124_wy = LB[c124_j] - 37; c124_wz = LC[c124_j] - c124_i * 2;
    c124_b = c124_wx * 311 + c124_wy * 207 + c124_wz * 590;
    if (c124_b > 0) {
      c124_d = c124_b * c124_b - 480000 * (c124_wx * c124_wx + c124_wy * c124_wy + c124_wz * c124_wz - 1000000);
      if (c124_d > 0) { c124_s = c124_s + idiv(c124_b - Math.sqrt(c124_d), 1000); }
    }
    c124_i = c124_i + 1;
  }
   }
if (res == -130) { 
  let c125_i = 0, c125_s = 0, c125_wx = 0, c125_wy = 0, c125_wz = 0, c125_b = 0, c125_d = 0, c125_j = 0;
  while (c125_i < n) { 
    c125_j = mod(c125_i, 6) + 1;
    c125_wx = LA[c125_j] - c125_i; c125_wy = LB[c125_j] - 37; c125_wz = LC[c125_j] - c125_i * 2;
    c125_b = c125_wx * 311 + c125_wy * 207 + c125_wz * 590;
    if (c125_b > 0) {
      c125_d = c125_b * c125_b - 480000 * (c125_wx * c125_wx + c125_wy * c125_wy + c125_wz * c125_wz - 1000000);
      if (c125_d > 0) { c125_s = c125_s + idiv(c125_b - Math.sqrt(c125_d), 1000); }
    }
    c125_i = c125_i + 1;
  }
   }
if (res == -131) { 
  let c126_i = 0, c126_s = 0, c126_wx = 0, c126_wy = 0, c126_wz = 0, c126_b = 0, c126_d = 0, c126_j = 0;
  while (c126_i < n) { 
    c126_j = mod(c126_i, 6) + 1;
    c126_wx = LA[c126_j] - c126_i; c126_wy = LB[c126_j] - 37; c126_wz = LC[c126_j] - c126_i * 2;
    c126_b = c126_wx * 311 + c126_wy * 207 + c126_wz * 590;
    if (c126_b > 0) {
      c126_d = c126_b * c126_b - 480000 * (c126_wx * c126_wx + c126_wy * c126_wy + c126_wz * c126_wz - 1000000);
      if (c126_d > 0) { c126_s = c126_s + idiv(c126_b - Math.sqrt(c126_d), 1000); }
    }
    c126_i = c126_i + 1;
  }
   }
if (res == -132) { 
  let c127_i = 0, c127_s = 0, c127_wx = 0, c127_wy = 0, c127_wz = 0, c127_b = 0, c127_d = 0, c127_j = 0;
  while (c127_i < n) { 
    c127_j = mod(c127_i, 6) + 1;
    c127_wx = LA[c127_j] - c127_i; c127_wy = LB[c127_j] - 37; c127_wz = LC[c127_j] - c127_i * 2;
    c127_b = c127_wx * 311 + c127_wy * 207 + c127_wz * 590;
    if (c127_b > 0) {
      c127_d = c127_b * c127_b - 480000 * (c127_wx * c127_wx + c127_wy * c127_wy + c127_wz * c127_wz - 1000000);
      if (c127_d > 0) { c127_s = c127_s + idiv(c127_b - Math.sqrt(c127_d), 1000); }
    }
    c127_i = c127_i + 1;
  }
   }
if (res == -133) { 
  let c128_i = 0, c128_s = 0, c128_wx = 0, c128_wy = 0, c128_wz = 0, c128_b = 0, c128_d = 0, c128_j = 0;
  while (c128_i < n) { 
    c128_j = mod(c128_i, 6) + 1;
    c128_wx = LA[c128_j] - c128_i; c128_wy = LB[c128_j] - 37; c128_wz = LC[c128_j] - c128_i * 2;
    c128_b = c128_wx * 311 + c128_wy * 207 + c128_wz * 590;
    if (c128_b > 0) {
      c128_d = c128_b * c128_b - 480000 * (c128_wx * c128_wx + c128_wy * c128_wy + c128_wz * c128_wz - 1000000);
      if (c128_d > 0) { c128_s = c128_s + idiv(c128_b - Math.sqrt(c128_d), 1000); }
    }
    c128_i = c128_i + 1;
  }
   }
if (res == -134) { 
  let c129_i = 0, c129_s = 0, c129_wx = 0, c129_wy = 0, c129_wz = 0, c129_b = 0, c129_d = 0, c129_j = 0;
  while (c129_i < n) { 
    c129_j = mod(c129_i, 6) + 1;
    c129_wx = LA[c129_j] - c129_i; c129_wy = LB[c129_j] - 37; c129_wz = LC[c129_j] - c129_i * 2;
    c129_b = c129_wx * 311 + c129_wy * 207 + c129_wz * 590;
    if (c129_b > 0) {
      c129_d = c129_b * c129_b - 480000 * (c129_wx * c129_wx + c129_wy * c129_wy + c129_wz * c129_wz - 1000000);
      if (c129_d > 0) { c129_s = c129_s + idiv(c129_b - Math.sqrt(c129_d), 1000); }
    }
    c129_i = c129_i + 1;
  }
   } }
function fH(n) { 
  let ai = 0, as = 0, awx = 0, awy = 0, awz = 0, ab = 0, ad = 0, aj = 0;
  while (ai < n) { 
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    ai = ai + 1;
  }
  res = as; }
function fI(n) { 
  let ai = 0, as = 0, awx = 0, awy = 0, awz = 0, ab = 0, ad = 0, aj = 0;
  while (ai < n) { 
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    ai = ai + 1;
  }
  res = as; }
function fJ(n) { 
  let ai = 0, as = 0, awx = 0, awy = 0, awz = 0, ab = 0, ad = 0, aj = 0;
  while (ai < n) { 
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    aj = mod(ai, 6) + 1;
    awx = LA[aj] - ai; awy = LB[aj] - 37; awz = LC[aj] - ai * 2;
    ab = awx * 311 + awy * 207 + awz * 590;
    if (ab > 0) {
      ad = ab * ab - 480000 * (awx * awx + awy * awy + awz * awz - 1000000);
      if (ad > 0) { as = as + idiv(ab - Math.sqrt(ad), 1000); }
    }
    ai = ai + 1;
  }
  res = as; if (res == -5) { 
  let c0_i = 0, c0_s = 0, c0_wx = 0, c0_wy = 0, c0_wz = 0, c0_b = 0, c0_d = 0, c0_j = 0;
  while (c0_i < n) { 
    c0_j = mod(c0_i, 6) + 1;
    c0_wx = LA[c0_j] - c0_i; c0_wy = LB[c0_j] - 37; c0_wz = LC[c0_j] - c0_i * 2;
    c0_b = c0_wx * 311 + c0_wy * 207 + c0_wz * 590;
    if (c0_b > 0) {
      c0_d = c0_b * c0_b - 480000 * (c0_wx * c0_wx + c0_wy * c0_wy + c0_wz * c0_wz - 1000000);
      if (c0_d > 0) { c0_s = c0_s + idiv(c0_b - Math.sqrt(c0_d), 1000); }
    }
    c0_i = c0_i + 1;
  }
   }
if (res == -6) { 
  let c1_i = 0, c1_s = 0, c1_wx = 0, c1_wy = 0, c1_wz = 0, c1_b = 0, c1_d = 0, c1_j = 0;
  while (c1_i < n) { 
    c1_j = mod(c1_i, 6) + 1;
    c1_wx = LA[c1_j] - c1_i; c1_wy = LB[c1_j] - 37; c1_wz = LC[c1_j] - c1_i * 2;
    c1_b = c1_wx * 311 + c1_wy * 207 + c1_wz * 590;
    if (c1_b > 0) {
      c1_d = c1_b * c1_b - 480000 * (c1_wx * c1_wx + c1_wy * c1_wy + c1_wz * c1_wz - 1000000);
      if (c1_d > 0) { c1_s = c1_s + idiv(c1_b - Math.sqrt(c1_d), 1000); }
    }
    c1_i = c1_i + 1;
  }
   }
if (res == -7) { 
  let c2_i = 0, c2_s = 0, c2_wx = 0, c2_wy = 0, c2_wz = 0, c2_b = 0, c2_d = 0, c2_j = 0;
  while (c2_i < n) { 
    c2_j = mod(c2_i, 6) + 1;
    c2_wx = LA[c2_j] - c2_i; c2_wy = LB[c2_j] - 37; c2_wz = LC[c2_j] - c2_i * 2;
    c2_b = c2_wx * 311 + c2_wy * 207 + c2_wz * 590;
    if (c2_b > 0) {
      c2_d = c2_b * c2_b - 480000 * (c2_wx * c2_wx + c2_wy * c2_wy + c2_wz * c2_wz - 1000000);
      if (c2_d > 0) { c2_s = c2_s + idiv(c2_b - Math.sqrt(c2_d), 1000); }
    }
    c2_i = c2_i + 1;
  }
   }
if (res == -8) { 
  let c3_i = 0, c3_s = 0, c3_wx = 0, c3_wy = 0, c3_wz = 0, c3_b = 0, c3_d = 0, c3_j = 0;
  while (c3_i < n) { 
    c3_j = mod(c3_i, 6) + 1;
    c3_wx = LA[c3_j] - c3_i; c3_wy = LB[c3_j] - 37; c3_wz = LC[c3_j] - c3_i * 2;
    c3_b = c3_wx * 311 + c3_wy * 207 + c3_wz * 590;
    if (c3_b > 0) {
      c3_d = c3_b * c3_b - 480000 * (c3_wx * c3_wx + c3_wy * c3_wy + c3_wz * c3_wz - 1000000);
      if (c3_d > 0) { c3_s = c3_s + idiv(c3_b - Math.sqrt(c3_d), 1000); }
    }
    c3_i = c3_i + 1;
  }
   }
if (res == -9) { 
  let c4_i = 0, c4_s = 0, c4_wx = 0, c4_wy = 0, c4_wz = 0, c4_b = 0, c4_d = 0, c4_j = 0;
  while (c4_i < n) { 
    c4_j = mod(c4_i, 6) + 1;
    c4_wx = LA[c4_j] - c4_i; c4_wy = LB[c4_j] - 37; c4_wz = LC[c4_j] - c4_i * 2;
    c4_b = c4_wx * 311 + c4_wy * 207 + c4_wz * 590;
    if (c4_b > 0) {
      c4_d = c4_b * c4_b - 480000 * (c4_wx * c4_wx + c4_wy * c4_wy + c4_wz * c4_wz - 1000000);
      if (c4_d > 0) { c4_s = c4_s + idiv(c4_b - Math.sqrt(c4_d), 1000); }
    }
    c4_i = c4_i + 1;
  }
   }
if (res == -10) { 
  let c5_i = 0, c5_s = 0, c5_wx = 0, c5_wy = 0, c5_wz = 0, c5_b = 0, c5_d = 0, c5_j = 0;
  while (c5_i < n) { 
    c5_j = mod(c5_i, 6) + 1;
    c5_wx = LA[c5_j] - c5_i; c5_wy = LB[c5_j] - 37; c5_wz = LC[c5_j] - c5_i * 2;
    c5_b = c5_wx * 311 + c5_wy * 207 + c5_wz * 590;
    if (c5_b > 0) {
      c5_d = c5_b * c5_b - 480000 * (c5_wx * c5_wx + c5_wy * c5_wy + c5_wz * c5_wz - 1000000);
      if (c5_d > 0) { c5_s = c5_s + idiv(c5_b - Math.sqrt(c5_d), 1000); }
    }
    c5_i = c5_i + 1;
  }
   }
if (res == -11) { 
  let c6_i = 0, c6_s = 0, c6_wx = 0, c6_wy = 0, c6_wz = 0, c6_b = 0, c6_d = 0, c6_j = 0;
  while (c6_i < n) { 
    c6_j = mod(c6_i, 6) + 1;
    c6_wx = LA[c6_j] - c6_i; c6_wy = LB[c6_j] - 37; c6_wz = LC[c6_j] - c6_i * 2;
    c6_b = c6_wx * 311 + c6_wy * 207 + c6_wz * 590;
    if (c6_b > 0) {
      c6_d = c6_b * c6_b - 480000 * (c6_wx * c6_wx + c6_wy * c6_wy + c6_wz * c6_wz - 1000000);
      if (c6_d > 0) { c6_s = c6_s + idiv(c6_b - Math.sqrt(c6_d), 1000); }
    }
    c6_i = c6_i + 1;
  }
   }
if (res == -12) { 
  let c7_i = 0, c7_s = 0, c7_wx = 0, c7_wy = 0, c7_wz = 0, c7_b = 0, c7_d = 0, c7_j = 0;
  while (c7_i < n) { 
    c7_j = mod(c7_i, 6) + 1;
    c7_wx = LA[c7_j] - c7_i; c7_wy = LB[c7_j] - 37; c7_wz = LC[c7_j] - c7_i * 2;
    c7_b = c7_wx * 311 + c7_wy * 207 + c7_wz * 590;
    if (c7_b > 0) {
      c7_d = c7_b * c7_b - 480000 * (c7_wx * c7_wx + c7_wy * c7_wy + c7_wz * c7_wz - 1000000);
      if (c7_d > 0) { c7_s = c7_s + idiv(c7_b - Math.sqrt(c7_d), 1000); }
    }
    c7_i = c7_i + 1;
  }
   }
if (res == -13) { 
  let c8_i = 0, c8_s = 0, c8_wx = 0, c8_wy = 0, c8_wz = 0, c8_b = 0, c8_d = 0, c8_j = 0;
  while (c8_i < n) { 
    c8_j = mod(c8_i, 6) + 1;
    c8_wx = LA[c8_j] - c8_i; c8_wy = LB[c8_j] - 37; c8_wz = LC[c8_j] - c8_i * 2;
    c8_b = c8_wx * 311 + c8_wy * 207 + c8_wz * 590;
    if (c8_b > 0) {
      c8_d = c8_b * c8_b - 480000 * (c8_wx * c8_wx + c8_wy * c8_wy + c8_wz * c8_wz - 1000000);
      if (c8_d > 0) { c8_s = c8_s + idiv(c8_b - Math.sqrt(c8_d), 1000); }
    }
    c8_i = c8_i + 1;
  }
   }
if (res == -14) { 
  let c9_i = 0, c9_s = 0, c9_wx = 0, c9_wy = 0, c9_wz = 0, c9_b = 0, c9_d = 0, c9_j = 0;
  while (c9_i < n) { 
    c9_j = mod(c9_i, 6) + 1;
    c9_wx = LA[c9_j] - c9_i; c9_wy = LB[c9_j] - 37; c9_wz = LC[c9_j] - c9_i * 2;
    c9_b = c9_wx * 311 + c9_wy * 207 + c9_wz * 590;
    if (c9_b > 0) {
      c9_d = c9_b * c9_b - 480000 * (c9_wx * c9_wx + c9_wy * c9_wy + c9_wz * c9_wz - 1000000);
      if (c9_d > 0) { c9_s = c9_s + idiv(c9_b - Math.sqrt(c9_d), 1000); }
    }
    c9_i = c9_i + 1;
  }
   }
if (res == -15) { 
  let c10_i = 0, c10_s = 0, c10_wx = 0, c10_wy = 0, c10_wz = 0, c10_b = 0, c10_d = 0, c10_j = 0;
  while (c10_i < n) { 
    c10_j = mod(c10_i, 6) + 1;
    c10_wx = LA[c10_j] - c10_i; c10_wy = LB[c10_j] - 37; c10_wz = LC[c10_j] - c10_i * 2;
    c10_b = c10_wx * 311 + c10_wy * 207 + c10_wz * 590;
    if (c10_b > 0) {
      c10_d = c10_b * c10_b - 480000 * (c10_wx * c10_wx + c10_wy * c10_wy + c10_wz * c10_wz - 1000000);
      if (c10_d > 0) { c10_s = c10_s + idiv(c10_b - Math.sqrt(c10_d), 1000); }
    }
    c10_i = c10_i + 1;
  }
   }
if (res == -16) { 
  let c11_i = 0, c11_s = 0, c11_wx = 0, c11_wy = 0, c11_wz = 0, c11_b = 0, c11_d = 0, c11_j = 0;
  while (c11_i < n) { 
    c11_j = mod(c11_i, 6) + 1;
    c11_wx = LA[c11_j] - c11_i; c11_wy = LB[c11_j] - 37; c11_wz = LC[c11_j] - c11_i * 2;
    c11_b = c11_wx * 311 + c11_wy * 207 + c11_wz * 590;
    if (c11_b > 0) {
      c11_d = c11_b * c11_b - 480000 * (c11_wx * c11_wx + c11_wy * c11_wy + c11_wz * c11_wz - 1000000);
      if (c11_d > 0) { c11_s = c11_s + idiv(c11_b - Math.sqrt(c11_d), 1000); }
    }
    c11_i = c11_i + 1;
  }
   }
if (res == -17) { 
  let c12_i = 0, c12_s = 0, c12_wx = 0, c12_wy = 0, c12_wz = 0, c12_b = 0, c12_d = 0, c12_j = 0;
  while (c12_i < n) { 
    c12_j = mod(c12_i, 6) + 1;
    c12_wx = LA[c12_j] - c12_i; c12_wy = LB[c12_j] - 37; c12_wz = LC[c12_j] - c12_i * 2;
    c12_b = c12_wx * 311 + c12_wy * 207 + c12_wz * 590;
    if (c12_b > 0) {
      c12_d = c12_b * c12_b - 480000 * (c12_wx * c12_wx + c12_wy * c12_wy + c12_wz * c12_wz - 1000000);
      if (c12_d > 0) { c12_s = c12_s + idiv(c12_b - Math.sqrt(c12_d), 1000); }
    }
    c12_i = c12_i + 1;
  }
   }
if (res == -18) { 
  let c13_i = 0, c13_s = 0, c13_wx = 0, c13_wy = 0, c13_wz = 0, c13_b = 0, c13_d = 0, c13_j = 0;
  while (c13_i < n) { 
    c13_j = mod(c13_i, 6) + 1;
    c13_wx = LA[c13_j] - c13_i; c13_wy = LB[c13_j] - 37; c13_wz = LC[c13_j] - c13_i * 2;
    c13_b = c13_wx * 311 + c13_wy * 207 + c13_wz * 590;
    if (c13_b > 0) {
      c13_d = c13_b * c13_b - 480000 * (c13_wx * c13_wx + c13_wy * c13_wy + c13_wz * c13_wz - 1000000);
      if (c13_d > 0) { c13_s = c13_s + idiv(c13_b - Math.sqrt(c13_d), 1000); }
    }
    c13_i = c13_i + 1;
  }
   }
if (res == -19) { 
  let c14_i = 0, c14_s = 0, c14_wx = 0, c14_wy = 0, c14_wz = 0, c14_b = 0, c14_d = 0, c14_j = 0;
  while (c14_i < n) { 
    c14_j = mod(c14_i, 6) + 1;
    c14_wx = LA[c14_j] - c14_i; c14_wy = LB[c14_j] - 37; c14_wz = LC[c14_j] - c14_i * 2;
    c14_b = c14_wx * 311 + c14_wy * 207 + c14_wz * 590;
    if (c14_b > 0) {
      c14_d = c14_b * c14_b - 480000 * (c14_wx * c14_wx + c14_wy * c14_wy + c14_wz * c14_wz - 1000000);
      if (c14_d > 0) { c14_s = c14_s + idiv(c14_b - Math.sqrt(c14_d), 1000); }
    }
    c14_i = c14_i + 1;
  }
   }
if (res == -20) { 
  let c15_i = 0, c15_s = 0, c15_wx = 0, c15_wy = 0, c15_wz = 0, c15_b = 0, c15_d = 0, c15_j = 0;
  while (c15_i < n) { 
    c15_j = mod(c15_i, 6) + 1;
    c15_wx = LA[c15_j] - c15_i; c15_wy = LB[c15_j] - 37; c15_wz = LC[c15_j] - c15_i * 2;
    c15_b = c15_wx * 311 + c15_wy * 207 + c15_wz * 590;
    if (c15_b > 0) {
      c15_d = c15_b * c15_b - 480000 * (c15_wx * c15_wx + c15_wy * c15_wy + c15_wz * c15_wz - 1000000);
      if (c15_d > 0) { c15_s = c15_s + idiv(c15_b - Math.sqrt(c15_d), 1000); }
    }
    c15_i = c15_i + 1;
  }
   }
if (res == -21) { 
  let c16_i = 0, c16_s = 0, c16_wx = 0, c16_wy = 0, c16_wz = 0, c16_b = 0, c16_d = 0, c16_j = 0;
  while (c16_i < n) { 
    c16_j = mod(c16_i, 6) + 1;
    c16_wx = LA[c16_j] - c16_i; c16_wy = LB[c16_j] - 37; c16_wz = LC[c16_j] - c16_i * 2;
    c16_b = c16_wx * 311 + c16_wy * 207 + c16_wz * 590;
    if (c16_b > 0) {
      c16_d = c16_b * c16_b - 480000 * (c16_wx * c16_wx + c16_wy * c16_wy + c16_wz * c16_wz - 1000000);
      if (c16_d > 0) { c16_s = c16_s + idiv(c16_b - Math.sqrt(c16_d), 1000); }
    }
    c16_i = c16_i + 1;
  }
   }
if (res == -22) { 
  let c17_i = 0, c17_s = 0, c17_wx = 0, c17_wy = 0, c17_wz = 0, c17_b = 0, c17_d = 0, c17_j = 0;
  while (c17_i < n) { 
    c17_j = mod(c17_i, 6) + 1;
    c17_wx = LA[c17_j] - c17_i; c17_wy = LB[c17_j] - 37; c17_wz = LC[c17_j] - c17_i * 2;
    c17_b = c17_wx * 311 + c17_wy * 207 + c17_wz * 590;
    if (c17_b > 0) {
      c17_d = c17_b * c17_b - 480000 * (c17_wx * c17_wx + c17_wy * c17_wy + c17_wz * c17_wz - 1000000);
      if (c17_d > 0) { c17_s = c17_s + idiv(c17_b - Math.sqrt(c17_d), 1000); }
    }
    c17_i = c17_i + 1;
  }
   }
if (res == -23) { 
  let c18_i = 0, c18_s = 0, c18_wx = 0, c18_wy = 0, c18_wz = 0, c18_b = 0, c18_d = 0, c18_j = 0;
  while (c18_i < n) { 
    c18_j = mod(c18_i, 6) + 1;
    c18_wx = LA[c18_j] - c18_i; c18_wy = LB[c18_j] - 37; c18_wz = LC[c18_j] - c18_i * 2;
    c18_b = c18_wx * 311 + c18_wy * 207 + c18_wz * 590;
    if (c18_b > 0) {
      c18_d = c18_b * c18_b - 480000 * (c18_wx * c18_wx + c18_wy * c18_wy + c18_wz * c18_wz - 1000000);
      if (c18_d > 0) { c18_s = c18_s + idiv(c18_b - Math.sqrt(c18_d), 1000); }
    }
    c18_i = c18_i + 1;
  }
   }
if (res == -24) { 
  let c19_i = 0, c19_s = 0, c19_wx = 0, c19_wy = 0, c19_wz = 0, c19_b = 0, c19_d = 0, c19_j = 0;
  while (c19_i < n) { 
    c19_j = mod(c19_i, 6) + 1;
    c19_wx = LA[c19_j] - c19_i; c19_wy = LB[c19_j] - 37; c19_wz = LC[c19_j] - c19_i * 2;
    c19_b = c19_wx * 311 + c19_wy * 207 + c19_wz * 590;
    if (c19_b > 0) {
      c19_d = c19_b * c19_b - 480000 * (c19_wx * c19_wx + c19_wy * c19_wy + c19_wz * c19_wz - 1000000);
      if (c19_d > 0) { c19_s = c19_s + idiv(c19_b - Math.sqrt(c19_d), 1000); }
    }
    c19_i = c19_i + 1;
  }
   }
if (res == -25) { 
  let c20_i = 0, c20_s = 0, c20_wx = 0, c20_wy = 0, c20_wz = 0, c20_b = 0, c20_d = 0, c20_j = 0;
  while (c20_i < n) { 
    c20_j = mod(c20_i, 6) + 1;
    c20_wx = LA[c20_j] - c20_i; c20_wy = LB[c20_j] - 37; c20_wz = LC[c20_j] - c20_i * 2;
    c20_b = c20_wx * 311 + c20_wy * 207 + c20_wz * 590;
    if (c20_b > 0) {
      c20_d = c20_b * c20_b - 480000 * (c20_wx * c20_wx + c20_wy * c20_wy + c20_wz * c20_wz - 1000000);
      if (c20_d > 0) { c20_s = c20_s + idiv(c20_b - Math.sqrt(c20_d), 1000); }
    }
    c20_i = c20_i + 1;
  }
   }
if (res == -26) { 
  let c21_i = 0, c21_s = 0, c21_wx = 0, c21_wy = 0, c21_wz = 0, c21_b = 0, c21_d = 0, c21_j = 0;
  while (c21_i < n) { 
    c21_j = mod(c21_i, 6) + 1;
    c21_wx = LA[c21_j] - c21_i; c21_wy = LB[c21_j] - 37; c21_wz = LC[c21_j] - c21_i * 2;
    c21_b = c21_wx * 311 + c21_wy * 207 + c21_wz * 590;
    if (c21_b > 0) {
      c21_d = c21_b * c21_b - 480000 * (c21_wx * c21_wx + c21_wy * c21_wy + c21_wz * c21_wz - 1000000);
      if (c21_d > 0) { c21_s = c21_s + idiv(c21_b - Math.sqrt(c21_d), 1000); }
    }
    c21_i = c21_i + 1;
  }
   }
if (res == -27) { 
  let c22_i = 0, c22_s = 0, c22_wx = 0, c22_wy = 0, c22_wz = 0, c22_b = 0, c22_d = 0, c22_j = 0;
  while (c22_i < n) { 
    c22_j = mod(c22_i, 6) + 1;
    c22_wx = LA[c22_j] - c22_i; c22_wy = LB[c22_j] - 37; c22_wz = LC[c22_j] - c22_i * 2;
    c22_b = c22_wx * 311 + c22_wy * 207 + c22_wz * 590;
    if (c22_b > 0) {
      c22_d = c22_b * c22_b - 480000 * (c22_wx * c22_wx + c22_wy * c22_wy + c22_wz * c22_wz - 1000000);
      if (c22_d > 0) { c22_s = c22_s + idiv(c22_b - Math.sqrt(c22_d), 1000); }
    }
    c22_i = c22_i + 1;
  }
   }
if (res == -28) { 
  let c23_i = 0, c23_s = 0, c23_wx = 0, c23_wy = 0, c23_wz = 0, c23_b = 0, c23_d = 0, c23_j = 0;
  while (c23_i < n) { 
    c23_j = mod(c23_i, 6) + 1;
    c23_wx = LA[c23_j] - c23_i; c23_wy = LB[c23_j] - 37; c23_wz = LC[c23_j] - c23_i * 2;
    c23_b = c23_wx * 311 + c23_wy * 207 + c23_wz * 590;
    if (c23_b > 0) {
      c23_d = c23_b * c23_b - 480000 * (c23_wx * c23_wx + c23_wy * c23_wy + c23_wz * c23_wz - 1000000);
      if (c23_d > 0) { c23_s = c23_s + idiv(c23_b - Math.sqrt(c23_d), 1000); }
    }
    c23_i = c23_i + 1;
  }
   }
if (res == -29) { 
  let c24_i = 0, c24_s = 0, c24_wx = 0, c24_wy = 0, c24_wz = 0, c24_b = 0, c24_d = 0, c24_j = 0;
  while (c24_i < n) { 
    c24_j = mod(c24_i, 6) + 1;
    c24_wx = LA[c24_j] - c24_i; c24_wy = LB[c24_j] - 37; c24_wz = LC[c24_j] - c24_i * 2;
    c24_b = c24_wx * 311 + c24_wy * 207 + c24_wz * 590;
    if (c24_b > 0) {
      c24_d = c24_b * c24_b - 480000 * (c24_wx * c24_wx + c24_wy * c24_wy + c24_wz * c24_wz - 1000000);
      if (c24_d > 0) { c24_s = c24_s + idiv(c24_b - Math.sqrt(c24_d), 1000); }
    }
    c24_i = c24_i + 1;
  }
   }
if (res == -30) { 
  let c25_i = 0, c25_s = 0, c25_wx = 0, c25_wy = 0, c25_wz = 0, c25_b = 0, c25_d = 0, c25_j = 0;
  while (c25_i < n) { 
    c25_j = mod(c25_i, 6) + 1;
    c25_wx = LA[c25_j] - c25_i; c25_wy = LB[c25_j] - 37; c25_wz = LC[c25_j] - c25_i * 2;
    c25_b = c25_wx * 311 + c25_wy * 207 + c25_wz * 590;
    if (c25_b > 0) {
      c25_d = c25_b * c25_b - 480000 * (c25_wx * c25_wx + c25_wy * c25_wy + c25_wz * c25_wz - 1000000);
      if (c25_d > 0) { c25_s = c25_s + idiv(c25_b - Math.sqrt(c25_d), 1000); }
    }
    c25_i = c25_i + 1;
  }
   }
if (res == -31) { 
  let c26_i = 0, c26_s = 0, c26_wx = 0, c26_wy = 0, c26_wz = 0, c26_b = 0, c26_d = 0, c26_j = 0;
  while (c26_i < n) { 
    c26_j = mod(c26_i, 6) + 1;
    c26_wx = LA[c26_j] - c26_i; c26_wy = LB[c26_j] - 37; c26_wz = LC[c26_j] - c26_i * 2;
    c26_b = c26_wx * 311 + c26_wy * 207 + c26_wz * 590;
    if (c26_b > 0) {
      c26_d = c26_b * c26_b - 480000 * (c26_wx * c26_wx + c26_wy * c26_wy + c26_wz * c26_wz - 1000000);
      if (c26_d > 0) { c26_s = c26_s + idiv(c26_b - Math.sqrt(c26_d), 1000); }
    }
    c26_i = c26_i + 1;
  }
   }
if (res == -32) { 
  let c27_i = 0, c27_s = 0, c27_wx = 0, c27_wy = 0, c27_wz = 0, c27_b = 0, c27_d = 0, c27_j = 0;
  while (c27_i < n) { 
    c27_j = mod(c27_i, 6) + 1;
    c27_wx = LA[c27_j] - c27_i; c27_wy = LB[c27_j] - 37; c27_wz = LC[c27_j] - c27_i * 2;
    c27_b = c27_wx * 311 + c27_wy * 207 + c27_wz * 590;
    if (c27_b > 0) {
      c27_d = c27_b * c27_b - 480000 * (c27_wx * c27_wx + c27_wy * c27_wy + c27_wz * c27_wz - 1000000);
      if (c27_d > 0) { c27_s = c27_s + idiv(c27_b - Math.sqrt(c27_d), 1000); }
    }
    c27_i = c27_i + 1;
  }
   }
if (res == -33) { 
  let c28_i = 0, c28_s = 0, c28_wx = 0, c28_wy = 0, c28_wz = 0, c28_b = 0, c28_d = 0, c28_j = 0;
  while (c28_i < n) { 
    c28_j = mod(c28_i, 6) + 1;
    c28_wx = LA[c28_j] - c28_i; c28_wy = LB[c28_j] - 37; c28_wz = LC[c28_j] - c28_i * 2;
    c28_b = c28_wx * 311 + c28_wy * 207 + c28_wz * 590;
    if (c28_b > 0) {
      c28_d = c28_b * c28_b - 480000 * (c28_wx * c28_wx + c28_wy * c28_wy + c28_wz * c28_wz - 1000000);
      if (c28_d > 0) { c28_s = c28_s + idiv(c28_b - Math.sqrt(c28_d), 1000); }
    }
    c28_i = c28_i + 1;
  }
   }
if (res == -34) { 
  let c29_i = 0, c29_s = 0, c29_wx = 0, c29_wy = 0, c29_wz = 0, c29_b = 0, c29_d = 0, c29_j = 0;
  while (c29_i < n) { 
    c29_j = mod(c29_i, 6) + 1;
    c29_wx = LA[c29_j] - c29_i; c29_wy = LB[c29_j] - 37; c29_wz = LC[c29_j] - c29_i * 2;
    c29_b = c29_wx * 311 + c29_wy * 207 + c29_wz * 590;
    if (c29_b > 0) {
      c29_d = c29_b * c29_b - 480000 * (c29_wx * c29_wx + c29_wy * c29_wy + c29_wz * c29_wz - 1000000);
      if (c29_d > 0) { c29_s = c29_s + idiv(c29_b - Math.sqrt(c29_d), 1000); }
    }
    c29_i = c29_i + 1;
  }
   }
if (res == -35) { 
  let c30_i = 0, c30_s = 0, c30_wx = 0, c30_wy = 0, c30_wz = 0, c30_b = 0, c30_d = 0, c30_j = 0;
  while (c30_i < n) { 
    c30_j = mod(c30_i, 6) + 1;
    c30_wx = LA[c30_j] - c30_i; c30_wy = LB[c30_j] - 37; c30_wz = LC[c30_j] - c30_i * 2;
    c30_b = c30_wx * 311 + c30_wy * 207 + c30_wz * 590;
    if (c30_b > 0) {
      c30_d = c30_b * c30_b - 480000 * (c30_wx * c30_wx + c30_wy * c30_wy + c30_wz * c30_wz - 1000000);
      if (c30_d > 0) { c30_s = c30_s + idiv(c30_b - Math.sqrt(c30_d), 1000); }
    }
    c30_i = c30_i + 1;
  }
   }
if (res == -36) { 
  let c31_i = 0, c31_s = 0, c31_wx = 0, c31_wy = 0, c31_wz = 0, c31_b = 0, c31_d = 0, c31_j = 0;
  while (c31_i < n) { 
    c31_j = mod(c31_i, 6) + 1;
    c31_wx = LA[c31_j] - c31_i; c31_wy = LB[c31_j] - 37; c31_wz = LC[c31_j] - c31_i * 2;
    c31_b = c31_wx * 311 + c31_wy * 207 + c31_wz * 590;
    if (c31_b > 0) {
      c31_d = c31_b * c31_b - 480000 * (c31_wx * c31_wx + c31_wy * c31_wy + c31_wz * c31_wz - 1000000);
      if (c31_d > 0) { c31_s = c31_s + idiv(c31_b - Math.sqrt(c31_d), 1000); }
    }
    c31_i = c31_i + 1;
  }
   }
if (res == -37) { 
  let c32_i = 0, c32_s = 0, c32_wx = 0, c32_wy = 0, c32_wz = 0, c32_b = 0, c32_d = 0, c32_j = 0;
  while (c32_i < n) { 
    c32_j = mod(c32_i, 6) + 1;
    c32_wx = LA[c32_j] - c32_i; c32_wy = LB[c32_j] - 37; c32_wz = LC[c32_j] - c32_i * 2;
    c32_b = c32_wx * 311 + c32_wy * 207 + c32_wz * 590;
    if (c32_b > 0) {
      c32_d = c32_b * c32_b - 480000 * (c32_wx * c32_wx + c32_wy * c32_wy + c32_wz * c32_wz - 1000000);
      if (c32_d > 0) { c32_s = c32_s + idiv(c32_b - Math.sqrt(c32_d), 1000); }
    }
    c32_i = c32_i + 1;
  }
   }
if (res == -38) { 
  let c33_i = 0, c33_s = 0, c33_wx = 0, c33_wy = 0, c33_wz = 0, c33_b = 0, c33_d = 0, c33_j = 0;
  while (c33_i < n) { 
    c33_j = mod(c33_i, 6) + 1;
    c33_wx = LA[c33_j] - c33_i; c33_wy = LB[c33_j] - 37; c33_wz = LC[c33_j] - c33_i * 2;
    c33_b = c33_wx * 311 + c33_wy * 207 + c33_wz * 590;
    if (c33_b > 0) {
      c33_d = c33_b * c33_b - 480000 * (c33_wx * c33_wx + c33_wy * c33_wy + c33_wz * c33_wz - 1000000);
      if (c33_d > 0) { c33_s = c33_s + idiv(c33_b - Math.sqrt(c33_d), 1000); }
    }
    c33_i = c33_i + 1;
  }
   }
if (res == -39) { 
  let c34_i = 0, c34_s = 0, c34_wx = 0, c34_wy = 0, c34_wz = 0, c34_b = 0, c34_d = 0, c34_j = 0;
  while (c34_i < n) { 
    c34_j = mod(c34_i, 6) + 1;
    c34_wx = LA[c34_j] - c34_i; c34_wy = LB[c34_j] - 37; c34_wz = LC[c34_j] - c34_i * 2;
    c34_b = c34_wx * 311 + c34_wy * 207 + c34_wz * 590;
    if (c34_b > 0) {
      c34_d = c34_b * c34_b - 480000 * (c34_wx * c34_wx + c34_wy * c34_wy + c34_wz * c34_wz - 1000000);
      if (c34_d > 0) { c34_s = c34_s + idiv(c34_b - Math.sqrt(c34_d), 1000); }
    }
    c34_i = c34_i + 1;
  }
   }
if (res == -40) { 
  let c35_i = 0, c35_s = 0, c35_wx = 0, c35_wy = 0, c35_wz = 0, c35_b = 0, c35_d = 0, c35_j = 0;
  while (c35_i < n) { 
    c35_j = mod(c35_i, 6) + 1;
    c35_wx = LA[c35_j] - c35_i; c35_wy = LB[c35_j] - 37; c35_wz = LC[c35_j] - c35_i * 2;
    c35_b = c35_wx * 311 + c35_wy * 207 + c35_wz * 590;
    if (c35_b > 0) {
      c35_d = c35_b * c35_b - 480000 * (c35_wx * c35_wx + c35_wy * c35_wy + c35_wz * c35_wz - 1000000);
      if (c35_d > 0) { c35_s = c35_s + idiv(c35_b - Math.sqrt(c35_d), 1000); }
    }
    c35_i = c35_i + 1;
  }
   }
if (res == -41) { 
  let c36_i = 0, c36_s = 0, c36_wx = 0, c36_wy = 0, c36_wz = 0, c36_b = 0, c36_d = 0, c36_j = 0;
  while (c36_i < n) { 
    c36_j = mod(c36_i, 6) + 1;
    c36_wx = LA[c36_j] - c36_i; c36_wy = LB[c36_j] - 37; c36_wz = LC[c36_j] - c36_i * 2;
    c36_b = c36_wx * 311 + c36_wy * 207 + c36_wz * 590;
    if (c36_b > 0) {
      c36_d = c36_b * c36_b - 480000 * (c36_wx * c36_wx + c36_wy * c36_wy + c36_wz * c36_wz - 1000000);
      if (c36_d > 0) { c36_s = c36_s + idiv(c36_b - Math.sqrt(c36_d), 1000); }
    }
    c36_i = c36_i + 1;
  }
   }
if (res == -42) { 
  let c37_i = 0, c37_s = 0, c37_wx = 0, c37_wy = 0, c37_wz = 0, c37_b = 0, c37_d = 0, c37_j = 0;
  while (c37_i < n) { 
    c37_j = mod(c37_i, 6) + 1;
    c37_wx = LA[c37_j] - c37_i; c37_wy = LB[c37_j] - 37; c37_wz = LC[c37_j] - c37_i * 2;
    c37_b = c37_wx * 311 + c37_wy * 207 + c37_wz * 590;
    if (c37_b > 0) {
      c37_d = c37_b * c37_b - 480000 * (c37_wx * c37_wx + c37_wy * c37_wy + c37_wz * c37_wz - 1000000);
      if (c37_d > 0) { c37_s = c37_s + idiv(c37_b - Math.sqrt(c37_d), 1000); }
    }
    c37_i = c37_i + 1;
  }
   }
if (res == -43) { 
  let c38_i = 0, c38_s = 0, c38_wx = 0, c38_wy = 0, c38_wz = 0, c38_b = 0, c38_d = 0, c38_j = 0;
  while (c38_i < n) { 
    c38_j = mod(c38_i, 6) + 1;
    c38_wx = LA[c38_j] - c38_i; c38_wy = LB[c38_j] - 37; c38_wz = LC[c38_j] - c38_i * 2;
    c38_b = c38_wx * 311 + c38_wy * 207 + c38_wz * 590;
    if (c38_b > 0) {
      c38_d = c38_b * c38_b - 480000 * (c38_wx * c38_wx + c38_wy * c38_wy + c38_wz * c38_wz - 1000000);
      if (c38_d > 0) { c38_s = c38_s + idiv(c38_b - Math.sqrt(c38_d), 1000); }
    }
    c38_i = c38_i + 1;
  }
   }
if (res == -44) { 
  let c39_i = 0, c39_s = 0, c39_wx = 0, c39_wy = 0, c39_wz = 0, c39_b = 0, c39_d = 0, c39_j = 0;
  while (c39_i < n) { 
    c39_j = mod(c39_i, 6) + 1;
    c39_wx = LA[c39_j] - c39_i; c39_wy = LB[c39_j] - 37; c39_wz = LC[c39_j] - c39_i * 2;
    c39_b = c39_wx * 311 + c39_wy * 207 + c39_wz * 590;
    if (c39_b > 0) {
      c39_d = c39_b * c39_b - 480000 * (c39_wx * c39_wx + c39_wy * c39_wy + c39_wz * c39_wz - 1000000);
      if (c39_d > 0) { c39_s = c39_s + idiv(c39_b - Math.sqrt(c39_d), 1000); }
    }
    c39_i = c39_i + 1;
  }
   }
if (res == -45) { 
  let c40_i = 0, c40_s = 0, c40_wx = 0, c40_wy = 0, c40_wz = 0, c40_b = 0, c40_d = 0, c40_j = 0;
  while (c40_i < n) { 
    c40_j = mod(c40_i, 6) + 1;
    c40_wx = LA[c40_j] - c40_i; c40_wy = LB[c40_j] - 37; c40_wz = LC[c40_j] - c40_i * 2;
    c40_b = c40_wx * 311 + c40_wy * 207 + c40_wz * 590;
    if (c40_b > 0) {
      c40_d = c40_b * c40_b - 480000 * (c40_wx * c40_wx + c40_wy * c40_wy + c40_wz * c40_wz - 1000000);
      if (c40_d > 0) { c40_s = c40_s + idiv(c40_b - Math.sqrt(c40_d), 1000); }
    }
    c40_i = c40_i + 1;
  }
   }
if (res == -46) { 
  let c41_i = 0, c41_s = 0, c41_wx = 0, c41_wy = 0, c41_wz = 0, c41_b = 0, c41_d = 0, c41_j = 0;
  while (c41_i < n) { 
    c41_j = mod(c41_i, 6) + 1;
    c41_wx = LA[c41_j] - c41_i; c41_wy = LB[c41_j] - 37; c41_wz = LC[c41_j] - c41_i * 2;
    c41_b = c41_wx * 311 + c41_wy * 207 + c41_wz * 590;
    if (c41_b > 0) {
      c41_d = c41_b * c41_b - 480000 * (c41_wx * c41_wx + c41_wy * c41_wy + c41_wz * c41_wz - 1000000);
      if (c41_d > 0) { c41_s = c41_s + idiv(c41_b - Math.sqrt(c41_d), 1000); }
    }
    c41_i = c41_i + 1;
  }
   }
if (res == -47) { 
  let c42_i = 0, c42_s = 0, c42_wx = 0, c42_wy = 0, c42_wz = 0, c42_b = 0, c42_d = 0, c42_j = 0;
  while (c42_i < n) { 
    c42_j = mod(c42_i, 6) + 1;
    c42_wx = LA[c42_j] - c42_i; c42_wy = LB[c42_j] - 37; c42_wz = LC[c42_j] - c42_i * 2;
    c42_b = c42_wx * 311 + c42_wy * 207 + c42_wz * 590;
    if (c42_b > 0) {
      c42_d = c42_b * c42_b - 480000 * (c42_wx * c42_wx + c42_wy * c42_wy + c42_wz * c42_wz - 1000000);
      if (c42_d > 0) { c42_s = c42_s + idiv(c42_b - Math.sqrt(c42_d), 1000); }
    }
    c42_i = c42_i + 1;
  }
   }
if (res == -48) { 
  let c43_i = 0, c43_s = 0, c43_wx = 0, c43_wy = 0, c43_wz = 0, c43_b = 0, c43_d = 0, c43_j = 0;
  while (c43_i < n) { 
    c43_j = mod(c43_i, 6) + 1;
    c43_wx = LA[c43_j] - c43_i; c43_wy = LB[c43_j] - 37; c43_wz = LC[c43_j] - c43_i * 2;
    c43_b = c43_wx * 311 + c43_wy * 207 + c43_wz * 590;
    if (c43_b > 0) {
      c43_d = c43_b * c43_b - 480000 * (c43_wx * c43_wx + c43_wy * c43_wy + c43_wz * c43_wz - 1000000);
      if (c43_d > 0) { c43_s = c43_s + idiv(c43_b - Math.sqrt(c43_d), 1000); }
    }
    c43_i = c43_i + 1;
  }
   }
if (res == -49) { 
  let c44_i = 0, c44_s = 0, c44_wx = 0, c44_wy = 0, c44_wz = 0, c44_b = 0, c44_d = 0, c44_j = 0;
  while (c44_i < n) { 
    c44_j = mod(c44_i, 6) + 1;
    c44_wx = LA[c44_j] - c44_i; c44_wy = LB[c44_j] - 37; c44_wz = LC[c44_j] - c44_i * 2;
    c44_b = c44_wx * 311 + c44_wy * 207 + c44_wz * 590;
    if (c44_b > 0) {
      c44_d = c44_b * c44_b - 480000 * (c44_wx * c44_wx + c44_wy * c44_wy + c44_wz * c44_wz - 1000000);
      if (c44_d > 0) { c44_s = c44_s + idiv(c44_b - Math.sqrt(c44_d), 1000); }
    }
    c44_i = c44_i + 1;
  }
   }
if (res == -50) { 
  let c45_i = 0, c45_s = 0, c45_wx = 0, c45_wy = 0, c45_wz = 0, c45_b = 0, c45_d = 0, c45_j = 0;
  while (c45_i < n) { 
    c45_j = mod(c45_i, 6) + 1;
    c45_wx = LA[c45_j] - c45_i; c45_wy = LB[c45_j] - 37; c45_wz = LC[c45_j] - c45_i * 2;
    c45_b = c45_wx * 311 + c45_wy * 207 + c45_wz * 590;
    if (c45_b > 0) {
      c45_d = c45_b * c45_b - 480000 * (c45_wx * c45_wx + c45_wy * c45_wy + c45_wz * c45_wz - 1000000);
      if (c45_d > 0) { c45_s = c45_s + idiv(c45_b - Math.sqrt(c45_d), 1000); }
    }
    c45_i = c45_i + 1;
  }
   }
if (res == -51) { 
  let c46_i = 0, c46_s = 0, c46_wx = 0, c46_wy = 0, c46_wz = 0, c46_b = 0, c46_d = 0, c46_j = 0;
  while (c46_i < n) { 
    c46_j = mod(c46_i, 6) + 1;
    c46_wx = LA[c46_j] - c46_i; c46_wy = LB[c46_j] - 37; c46_wz = LC[c46_j] - c46_i * 2;
    c46_b = c46_wx * 311 + c46_wy * 207 + c46_wz * 590;
    if (c46_b > 0) {
      c46_d = c46_b * c46_b - 480000 * (c46_wx * c46_wx + c46_wy * c46_wy + c46_wz * c46_wz - 1000000);
      if (c46_d > 0) { c46_s = c46_s + idiv(c46_b - Math.sqrt(c46_d), 1000); }
    }
    c46_i = c46_i + 1;
  }
   }
if (res == -52) { 
  let c47_i = 0, c47_s = 0, c47_wx = 0, c47_wy = 0, c47_wz = 0, c47_b = 0, c47_d = 0, c47_j = 0;
  while (c47_i < n) { 
    c47_j = mod(c47_i, 6) + 1;
    c47_wx = LA[c47_j] - c47_i; c47_wy = LB[c47_j] - 37; c47_wz = LC[c47_j] - c47_i * 2;
    c47_b = c47_wx * 311 + c47_wy * 207 + c47_wz * 590;
    if (c47_b > 0) {
      c47_d = c47_b * c47_b - 480000 * (c47_wx * c47_wx + c47_wy * c47_wy + c47_wz * c47_wz - 1000000);
      if (c47_d > 0) { c47_s = c47_s + idiv(c47_b - Math.sqrt(c47_d), 1000); }
    }
    c47_i = c47_i + 1;
  }
   }
if (res == -53) { 
  let c48_i = 0, c48_s = 0, c48_wx = 0, c48_wy = 0, c48_wz = 0, c48_b = 0, c48_d = 0, c48_j = 0;
  while (c48_i < n) { 
    c48_j = mod(c48_i, 6) + 1;
    c48_wx = LA[c48_j] - c48_i; c48_wy = LB[c48_j] - 37; c48_wz = LC[c48_j] - c48_i * 2;
    c48_b = c48_wx * 311 + c48_wy * 207 + c48_wz * 590;
    if (c48_b > 0) {
      c48_d = c48_b * c48_b - 480000 * (c48_wx * c48_wx + c48_wy * c48_wy + c48_wz * c48_wz - 1000000);
      if (c48_d > 0) { c48_s = c48_s + idiv(c48_b - Math.sqrt(c48_d), 1000); }
    }
    c48_i = c48_i + 1;
  }
   }
if (res == -54) { 
  let c49_i = 0, c49_s = 0, c49_wx = 0, c49_wy = 0, c49_wz = 0, c49_b = 0, c49_d = 0, c49_j = 0;
  while (c49_i < n) { 
    c49_j = mod(c49_i, 6) + 1;
    c49_wx = LA[c49_j] - c49_i; c49_wy = LB[c49_j] - 37; c49_wz = LC[c49_j] - c49_i * 2;
    c49_b = c49_wx * 311 + c49_wy * 207 + c49_wz * 590;
    if (c49_b > 0) {
      c49_d = c49_b * c49_b - 480000 * (c49_wx * c49_wx + c49_wy * c49_wy + c49_wz * c49_wz - 1000000);
      if (c49_d > 0) { c49_s = c49_s + idiv(c49_b - Math.sqrt(c49_d), 1000); }
    }
    c49_i = c49_i + 1;
  }
   }
if (res == -55) { 
  let c50_i = 0, c50_s = 0, c50_wx = 0, c50_wy = 0, c50_wz = 0, c50_b = 0, c50_d = 0, c50_j = 0;
  while (c50_i < n) { 
    c50_j = mod(c50_i, 6) + 1;
    c50_wx = LA[c50_j] - c50_i; c50_wy = LB[c50_j] - 37; c50_wz = LC[c50_j] - c50_i * 2;
    c50_b = c50_wx * 311 + c50_wy * 207 + c50_wz * 590;
    if (c50_b > 0) {
      c50_d = c50_b * c50_b - 480000 * (c50_wx * c50_wx + c50_wy * c50_wy + c50_wz * c50_wz - 1000000);
      if (c50_d > 0) { c50_s = c50_s + idiv(c50_b - Math.sqrt(c50_d), 1000); }
    }
    c50_i = c50_i + 1;
  }
   }
if (res == -56) { 
  let c51_i = 0, c51_s = 0, c51_wx = 0, c51_wy = 0, c51_wz = 0, c51_b = 0, c51_d = 0, c51_j = 0;
  while (c51_i < n) { 
    c51_j = mod(c51_i, 6) + 1;
    c51_wx = LA[c51_j] - c51_i; c51_wy = LB[c51_j] - 37; c51_wz = LC[c51_j] - c51_i * 2;
    c51_b = c51_wx * 311 + c51_wy * 207 + c51_wz * 590;
    if (c51_b > 0) {
      c51_d = c51_b * c51_b - 480000 * (c51_wx * c51_wx + c51_wy * c51_wy + c51_wz * c51_wz - 1000000);
      if (c51_d > 0) { c51_s = c51_s + idiv(c51_b - Math.sqrt(c51_d), 1000); }
    }
    c51_i = c51_i + 1;
  }
   }
if (res == -57) { 
  let c52_i = 0, c52_s = 0, c52_wx = 0, c52_wy = 0, c52_wz = 0, c52_b = 0, c52_d = 0, c52_j = 0;
  while (c52_i < n) { 
    c52_j = mod(c52_i, 6) + 1;
    c52_wx = LA[c52_j] - c52_i; c52_wy = LB[c52_j] - 37; c52_wz = LC[c52_j] - c52_i * 2;
    c52_b = c52_wx * 311 + c52_wy * 207 + c52_wz * 590;
    if (c52_b > 0) {
      c52_d = c52_b * c52_b - 480000 * (c52_wx * c52_wx + c52_wy * c52_wy + c52_wz * c52_wz - 1000000);
      if (c52_d > 0) { c52_s = c52_s + idiv(c52_b - Math.sqrt(c52_d), 1000); }
    }
    c52_i = c52_i + 1;
  }
   }
if (res == -58) { 
  let c53_i = 0, c53_s = 0, c53_wx = 0, c53_wy = 0, c53_wz = 0, c53_b = 0, c53_d = 0, c53_j = 0;
  while (c53_i < n) { 
    c53_j = mod(c53_i, 6) + 1;
    c53_wx = LA[c53_j] - c53_i; c53_wy = LB[c53_j] - 37; c53_wz = LC[c53_j] - c53_i * 2;
    c53_b = c53_wx * 311 + c53_wy * 207 + c53_wz * 590;
    if (c53_b > 0) {
      c53_d = c53_b * c53_b - 480000 * (c53_wx * c53_wx + c53_wy * c53_wy + c53_wz * c53_wz - 1000000);
      if (c53_d > 0) { c53_s = c53_s + idiv(c53_b - Math.sqrt(c53_d), 1000); }
    }
    c53_i = c53_i + 1;
  }
   }
if (res == -59) { 
  let c54_i = 0, c54_s = 0, c54_wx = 0, c54_wy = 0, c54_wz = 0, c54_b = 0, c54_d = 0, c54_j = 0;
  while (c54_i < n) { 
    c54_j = mod(c54_i, 6) + 1;
    c54_wx = LA[c54_j] - c54_i; c54_wy = LB[c54_j] - 37; c54_wz = LC[c54_j] - c54_i * 2;
    c54_b = c54_wx * 311 + c54_wy * 207 + c54_wz * 590;
    if (c54_b > 0) {
      c54_d = c54_b * c54_b - 480000 * (c54_wx * c54_wx + c54_wy * c54_wy + c54_wz * c54_wz - 1000000);
      if (c54_d > 0) { c54_s = c54_s + idiv(c54_b - Math.sqrt(c54_d), 1000); }
    }
    c54_i = c54_i + 1;
  }
   }
if (res == -60) { 
  let c55_i = 0, c55_s = 0, c55_wx = 0, c55_wy = 0, c55_wz = 0, c55_b = 0, c55_d = 0, c55_j = 0;
  while (c55_i < n) { 
    c55_j = mod(c55_i, 6) + 1;
    c55_wx = LA[c55_j] - c55_i; c55_wy = LB[c55_j] - 37; c55_wz = LC[c55_j] - c55_i * 2;
    c55_b = c55_wx * 311 + c55_wy * 207 + c55_wz * 590;
    if (c55_b > 0) {
      c55_d = c55_b * c55_b - 480000 * (c55_wx * c55_wx + c55_wy * c55_wy + c55_wz * c55_wz - 1000000);
      if (c55_d > 0) { c55_s = c55_s + idiv(c55_b - Math.sqrt(c55_d), 1000); }
    }
    c55_i = c55_i + 1;
  }
   }
if (res == -61) { 
  let c56_i = 0, c56_s = 0, c56_wx = 0, c56_wy = 0, c56_wz = 0, c56_b = 0, c56_d = 0, c56_j = 0;
  while (c56_i < n) { 
    c56_j = mod(c56_i, 6) + 1;
    c56_wx = LA[c56_j] - c56_i; c56_wy = LB[c56_j] - 37; c56_wz = LC[c56_j] - c56_i * 2;
    c56_b = c56_wx * 311 + c56_wy * 207 + c56_wz * 590;
    if (c56_b > 0) {
      c56_d = c56_b * c56_b - 480000 * (c56_wx * c56_wx + c56_wy * c56_wy + c56_wz * c56_wz - 1000000);
      if (c56_d > 0) { c56_s = c56_s + idiv(c56_b - Math.sqrt(c56_d), 1000); }
    }
    c56_i = c56_i + 1;
  }
   }
if (res == -62) { 
  let c57_i = 0, c57_s = 0, c57_wx = 0, c57_wy = 0, c57_wz = 0, c57_b = 0, c57_d = 0, c57_j = 0;
  while (c57_i < n) { 
    c57_j = mod(c57_i, 6) + 1;
    c57_wx = LA[c57_j] - c57_i; c57_wy = LB[c57_j] - 37; c57_wz = LC[c57_j] - c57_i * 2;
    c57_b = c57_wx * 311 + c57_wy * 207 + c57_wz * 590;
    if (c57_b > 0) {
      c57_d = c57_b * c57_b - 480000 * (c57_wx * c57_wx + c57_wy * c57_wy + c57_wz * c57_wz - 1000000);
      if (c57_d > 0) { c57_s = c57_s + idiv(c57_b - Math.sqrt(c57_d), 1000); }
    }
    c57_i = c57_i + 1;
  }
   }
if (res == -63) { 
  let c58_i = 0, c58_s = 0, c58_wx = 0, c58_wy = 0, c58_wz = 0, c58_b = 0, c58_d = 0, c58_j = 0;
  while (c58_i < n) { 
    c58_j = mod(c58_i, 6) + 1;
    c58_wx = LA[c58_j] - c58_i; c58_wy = LB[c58_j] - 37; c58_wz = LC[c58_j] - c58_i * 2;
    c58_b = c58_wx * 311 + c58_wy * 207 + c58_wz * 590;
    if (c58_b > 0) {
      c58_d = c58_b * c58_b - 480000 * (c58_wx * c58_wx + c58_wy * c58_wy + c58_wz * c58_wz - 1000000);
      if (c58_d > 0) { c58_s = c58_s + idiv(c58_b - Math.sqrt(c58_d), 1000); }
    }
    c58_i = c58_i + 1;
  }
   }
if (res == -64) { 
  let c59_i = 0, c59_s = 0, c59_wx = 0, c59_wy = 0, c59_wz = 0, c59_b = 0, c59_d = 0, c59_j = 0;
  while (c59_i < n) { 
    c59_j = mod(c59_i, 6) + 1;
    c59_wx = LA[c59_j] - c59_i; c59_wy = LB[c59_j] - 37; c59_wz = LC[c59_j] - c59_i * 2;
    c59_b = c59_wx * 311 + c59_wy * 207 + c59_wz * 590;
    if (c59_b > 0) {
      c59_d = c59_b * c59_b - 480000 * (c59_wx * c59_wx + c59_wy * c59_wy + c59_wz * c59_wz - 1000000);
      if (c59_d > 0) { c59_s = c59_s + idiv(c59_b - Math.sqrt(c59_d), 1000); }
    }
    c59_i = c59_i + 1;
  }
   } }
on('start', 'cam', function () { init();
  for (;;) {
    if (mode == 1) { fG(50000); } if (mode == 2) { fH(8000); } if (mode == 3) { fI(4000); } if (mode == 4) { fJ(8000); }
    frames = frames + 1; } });