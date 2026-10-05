let LA = []; let LB = []; let LC = []; let res = 0, frames = 0, mode = MODE;
function init() { let i = 0; while (i < 8) { LA.push(3000 + i * 400); LB.push(900 + i * 100); LC.push(5000 - i * 300); i = i + 1; } }
function fA(n) { 
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
  res = as; }
function fB(n) { let q0 = 0; let q1 = 0; let q2 = 0; let q3 = 0; let q4 = 0; let q5 = 0; let q6 = 0; let q7 = 0; let q8 = 0; let q9 = 0; let q10 = 0; let q11 = 0; let q12 = 0; let q13 = 0; let q14 = 0; let q15 = 0; let q16 = 0; let q17 = 0; let q18 = 0; let q19 = 0; let q20 = 0; let q21 = 0; let q22 = 0; let q23 = 0; let q24 = 0; let q25 = 0; let q26 = 0; let q27 = 0; let q28 = 0; let q29 = 0; let q30 = 0; let q31 = 0; let q32 = 0; let q33 = 0; let q34 = 0; let q35 = 0; let q36 = 0; let q37 = 0; let q38 = 0; let q39 = 0; let q40 = 0; let q41 = 0; let q42 = 0; let q43 = 0; let q44 = 0; let q45 = 0; let q46 = 0; let q47 = 0; let q48 = 0; let q49 = 0; let q50 = 0; let q51 = 0; let q52 = 0; let q53 = 0; let q54 = 0; let q55 = 0; let q56 = 0; let q57 = 0; let q58 = 0; let q59 = 0; let q60 = 0; let q61 = 0; let q62 = 0; let q63 = 0; let q64 = 0; let q65 = 0; let q66 = 0; let q67 = 0; let q68 = 0; let q69 = 0; let q70 = 0; let q71 = 0; let q72 = 0; let q73 = 0; let q74 = 0; let q75 = 0; let q76 = 0; let q77 = 0; let q78 = 0; let q79 = 0; let q80 = 0; let q81 = 0; let q82 = 0; let q83 = 0; let q84 = 0; let q85 = 0; let q86 = 0; let q87 = 0; let q88 = 0; let q89 = 0; let q90 = 0; let q91 = 0; let q92 = 0; let q93 = 0; let q94 = 0; let q95 = 0; let q96 = 0; let q97 = 0; let q98 = 0; let q99 = 0; let q100 = 0; let q101 = 0; let q102 = 0; let q103 = 0; let q104 = 0; let q105 = 0; let q106 = 0; let q107 = 0; let q108 = 0; let q109 = 0; let q110 = 0; let q111 = 0; let q112 = 0; let q113 = 0; let q114 = 0; let q115 = 0; let q116 = 0; let q117 = 0; let q118 = 0; let q119 = 0; let q120 = 0; let q121 = 0; let q122 = 0; let q123 = 0; let q124 = 0; let q125 = 0; let q126 = 0; let q127 = 0; let q128 = 0; let q129 = 0; let q130 = 0; let q131 = 0; let q132 = 0; let q133 = 0; let q134 = 0; let q135 = 0; let q136 = 0; let q137 = 0; let q138 = 0; let q139 = 0; let q140 = 0; let q141 = 0; let q142 = 0; let q143 = 0; let q144 = 0; let q145 = 0; let q146 = 0; let q147 = 0; let q148 = 0; let q149 = 0; 
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
  res = as; }
function fC(n) { 
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
   } }
function tiny(x) { res = res + x; }
function tinyL(x) { let q0 = 0; let q1 = 0; let q2 = 0; let q3 = 0; let q4 = 0; let q5 = 0; let q6 = 0; let q7 = 0; let q8 = 0; let q9 = 0; let q10 = 0; let q11 = 0; let q12 = 0; let q13 = 0; let q14 = 0; let q15 = 0; let q16 = 0; let q17 = 0; let q18 = 0; let q19 = 0; let q20 = 0; let q21 = 0; let q22 = 0; let q23 = 0; let q24 = 0; let q25 = 0; let q26 = 0; let q27 = 0; let q28 = 0; let q29 = 0; let q30 = 0; let q31 = 0; let q32 = 0; let q33 = 0; let q34 = 0; let q35 = 0; let q36 = 0; let q37 = 0; let q38 = 0; let q39 = 0; let q40 = 0; let q41 = 0; let q42 = 0; let q43 = 0; let q44 = 0; let q45 = 0; let q46 = 0; let q47 = 0; let q48 = 0; let q49 = 0; let q50 = 0; let q51 = 0; let q52 = 0; let q53 = 0; let q54 = 0; let q55 = 0; let q56 = 0; let q57 = 0; let q58 = 0; let q59 = 0; let q60 = 0; let q61 = 0; let q62 = 0; let q63 = 0; let q64 = 0; let q65 = 0; let q66 = 0; let q67 = 0; let q68 = 0; let q69 = 0; let q70 = 0; let q71 = 0; let q72 = 0; let q73 = 0; let q74 = 0; let q75 = 0; let q76 = 0; let q77 = 0; let q78 = 0; let q79 = 0; let q80 = 0; let q81 = 0; let q82 = 0; let q83 = 0; let q84 = 0; let q85 = 0; let q86 = 0; let q87 = 0; let q88 = 0; let q89 = 0; let q90 = 0; let q91 = 0; let q92 = 0; let q93 = 0; let q94 = 0; let q95 = 0; let q96 = 0; let q97 = 0; let q98 = 0; let q99 = 0; let q100 = 0; let q101 = 0; let q102 = 0; let q103 = 0; let q104 = 0; let q105 = 0; let q106 = 0; let q107 = 0; let q108 = 0; let q109 = 0; let q110 = 0; let q111 = 0; let q112 = 0; let q113 = 0; let q114 = 0; let q115 = 0; let q116 = 0; let q117 = 0; let q118 = 0; let q119 = 0; let q120 = 0; let q121 = 0; let q122 = 0; let q123 = 0; let q124 = 0; let q125 = 0; let q126 = 0; let q127 = 0; let q128 = 0; let q129 = 0; let q130 = 0; let q131 = 0; let q132 = 0; let q133 = 0; let q134 = 0; let q135 = 0; let q136 = 0; let q137 = 0; let q138 = 0; let q139 = 0; let q140 = 0; let q141 = 0; let q142 = 0; let q143 = 0; let q144 = 0; let q145 = 0; let q146 = 0; let q147 = 0; let q148 = 0; let q149 = 0; res = res + x; }
function fD(n) { let i = 0; while (i < n) { tiny(i); i = i + 1; } }
function fE(n) { let i = 0; while (i < n) { tinyL(i); i = i + 1; } }
function fF(n) { let q0 = 0; let q1 = 0; let q2 = 0; let q3 = 0; let q4 = 0; let q5 = 0; let q6 = 0; let q7 = 0; let q8 = 0; let q9 = 0; let q10 = 0; let q11 = 0; let q12 = 0; let q13 = 0; let q14 = 0; let q15 = 0; let q16 = 0; let q17 = 0; let q18 = 0; let q19 = 0; let q20 = 0; let q21 = 0; let q22 = 0; let q23 = 0; let q24 = 0; let q25 = 0; let q26 = 0; let q27 = 0; let q28 = 0; let q29 = 0; let q30 = 0; let q31 = 0; let q32 = 0; let q33 = 0; let q34 = 0; let q35 = 0; let q36 = 0; let q37 = 0; let q38 = 0; let q39 = 0; let q40 = 0; let q41 = 0; let q42 = 0; let q43 = 0; let q44 = 0; let q45 = 0; let q46 = 0; let q47 = 0; let q48 = 0; let q49 = 0; let q50 = 0; let q51 = 0; let q52 = 0; let q53 = 0; let q54 = 0; let q55 = 0; let q56 = 0; let q57 = 0; let q58 = 0; let q59 = 0; let q60 = 0; let q61 = 0; let q62 = 0; let q63 = 0; let q64 = 0; let q65 = 0; let q66 = 0; let q67 = 0; let q68 = 0; let q69 = 0; let q70 = 0; let q71 = 0; let q72 = 0; let q73 = 0; let q74 = 0; let q75 = 0; let q76 = 0; let q77 = 0; let q78 = 0; let q79 = 0; let q80 = 0; let q81 = 0; let q82 = 0; let q83 = 0; let q84 = 0; let q85 = 0; let q86 = 0; let q87 = 0; let q88 = 0; let q89 = 0; let q90 = 0; let q91 = 0; let q92 = 0; let q93 = 0; let q94 = 0; let q95 = 0; let q96 = 0; let q97 = 0; let q98 = 0; let q99 = 0; let q100 = 0; let q101 = 0; let q102 = 0; let q103 = 0; let q104 = 0; let q105 = 0; let q106 = 0; let q107 = 0; let q108 = 0; let q109 = 0; let q110 = 0; let q111 = 0; let q112 = 0; let q113 = 0; let q114 = 0; let q115 = 0; let q116 = 0; let q117 = 0; let q118 = 0; let q119 = 0; let q120 = 0; let q121 = 0; let q122 = 0; let q123 = 0; let q124 = 0; let q125 = 0; let q126 = 0; let q127 = 0; let q128 = 0; let q129 = 0; let q130 = 0; let q131 = 0; let q132 = 0; let q133 = 0; let q134 = 0; let q135 = 0; let q136 = 0; let q137 = 0; let q138 = 0; let q139 = 0; let q140 = 0; let q141 = 0; let q142 = 0; let q143 = 0; let q144 = 0; let q145 = 0; let q146 = 0; let q147 = 0; let q148 = 0; let q149 = 0; let q150 = 0; let q151 = 0; let q152 = 0; let q153 = 0; let q154 = 0; let q155 = 0; let q156 = 0; let q157 = 0; let q158 = 0; let q159 = 0; let q160 = 0; let q161 = 0; let q162 = 0; let q163 = 0; let q164 = 0; let q165 = 0; let q166 = 0; let q167 = 0; let q168 = 0; let q169 = 0; let q170 = 0; let q171 = 0; let q172 = 0; let q173 = 0; let q174 = 0; let q175 = 0; let q176 = 0; let q177 = 0; let q178 = 0; let q179 = 0; let q180 = 0; let q181 = 0; let q182 = 0; let q183 = 0; let q184 = 0; let q185 = 0; let q186 = 0; let q187 = 0; let q188 = 0; let q189 = 0; let q190 = 0; let q191 = 0; let q192 = 0; let q193 = 0; let q194 = 0; let q195 = 0; let q196 = 0; let q197 = 0; let q198 = 0; let q199 = 0; let q200 = 0; let q201 = 0; let q202 = 0; let q203 = 0; let q204 = 0; let q205 = 0; let q206 = 0; let q207 = 0; let q208 = 0; let q209 = 0; let q210 = 0; let q211 = 0; let q212 = 0; let q213 = 0; let q214 = 0; let q215 = 0; let q216 = 0; let q217 = 0; let q218 = 0; let q219 = 0; let q220 = 0; let q221 = 0; let q222 = 0; let q223 = 0; let q224 = 0; let q225 = 0; let q226 = 0; let q227 = 0; let q228 = 0; let q229 = 0; let q230 = 0; let q231 = 0; let q232 = 0; let q233 = 0; let q234 = 0; let q235 = 0; let q236 = 0; let q237 = 0; let q238 = 0; let q239 = 0; let q240 = 0; let q241 = 0; let q242 = 0; let q243 = 0; let q244 = 0; let q245 = 0; let q246 = 0; let q247 = 0; let q248 = 0; let q249 = 0; let q250 = 0; let q251 = 0; let q252 = 0; let q253 = 0; let q254 = 0; let q255 = 0; let q256 = 0; let q257 = 0; let q258 = 0; let q259 = 0; let q260 = 0; let q261 = 0; let q262 = 0; let q263 = 0; let q264 = 0; let q265 = 0; let q266 = 0; let q267 = 0; let q268 = 0; let q269 = 0; let q270 = 0; let q271 = 0; let q272 = 0; let q273 = 0; let q274 = 0; let q275 = 0; let q276 = 0; let q277 = 0; let q278 = 0; let q279 = 0; let q280 = 0; let q281 = 0; let q282 = 0; let q283 = 0; let q284 = 0; let q285 = 0; let q286 = 0; let q287 = 0; let q288 = 0; let q289 = 0; let q290 = 0; let q291 = 0; let q292 = 0; let q293 = 0; let q294 = 0; let q295 = 0; let q296 = 0; let q297 = 0; let q298 = 0; let q299 = 0; let q300 = 0; let q301 = 0; let q302 = 0; let q303 = 0; let q304 = 0; let q305 = 0; let q306 = 0; let q307 = 0; let q308 = 0; let q309 = 0; let q310 = 0; let q311 = 0; let q312 = 0; let q313 = 0; let q314 = 0; let q315 = 0; let q316 = 0; let q317 = 0; let q318 = 0; let q319 = 0; let q320 = 0; let q321 = 0; let q322 = 0; let q323 = 0; let q324 = 0; let q325 = 0; let q326 = 0; let q327 = 0; let q328 = 0; let q329 = 0; let q330 = 0; let q331 = 0; let q332 = 0; let q333 = 0; let q334 = 0; let q335 = 0; let q336 = 0; let q337 = 0; let q338 = 0; let q339 = 0; let q340 = 0; let q341 = 0; let q342 = 0; let q343 = 0; let q344 = 0; let q345 = 0; let q346 = 0; let q347 = 0; let q348 = 0; let q349 = 0; let q350 = 0; let q351 = 0; let q352 = 0; let q353 = 0; let q354 = 0; let q355 = 0; let q356 = 0; let q357 = 0; let q358 = 0; let q359 = 0; let q360 = 0; let q361 = 0; let q362 = 0; let q363 = 0; let q364 = 0; let q365 = 0; let q366 = 0; let q367 = 0; let q368 = 0; let q369 = 0; let q370 = 0; let q371 = 0; let q372 = 0; let q373 = 0; let q374 = 0; let q375 = 0; let q376 = 0; let q377 = 0; let q378 = 0; let q379 = 0; let q380 = 0; let q381 = 0; let q382 = 0; let q383 = 0; let q384 = 0; let q385 = 0; let q386 = 0; let q387 = 0; let q388 = 0; let q389 = 0; let q390 = 0; let q391 = 0; let q392 = 0; let q393 = 0; let q394 = 0; let q395 = 0; let q396 = 0; let q397 = 0; let q398 = 0; let q399 = 0; let i = 0; while (i < n) { tiny(i); i = i + 1; } }
on('start', 'cam', function () { init();
  for (;;) {
    if (mode == 1) { fA(50000); } if (mode == 2) { fB(50000); } if (mode == 3) { fC(50000); }
    if (mode == 4) { fD(5000); } if (mode == 5) { fE(5000); } if (mode == 6) { fF(5000); }
    frames = frames + 1; } });