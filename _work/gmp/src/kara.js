// ============================================================
// Karatsuba (the subtractive form, as GMP's mpn_kara_mul_n): every
// product stays in S, a run of n limbs padded so each half down to the
// base case is a whole number of 16-limb tiles. sp: free scratch.
// ============================================================
let KARA_MIN = 112;           // multiplier limbs from which Karatsuba is used (measured in Entry)
let KARA_SQR_MIN = 300;       // (a schoolbook square is half the products)
let KARA_BASE_MAX = 64;       // largest base case (tiles)
let KARA_LIN = 30;            // the plan's weight of a linear pass against a tile product
let kara_base = 16;
let gmp_sres = 1;             // where in S the last product was left
let MUL_PIECE = 512;          // largest operand made in S at once (10P + 67 <= S_MAX)

// value: |S[x..x+h) - S[y..y+h)| into S[d..d+h); 1 if x >= y, else -1.
// The limbs are subtracted as they are, then one carry pass (into S[d+h],
// a carry of 0: the caller's next region)
function mpn_sabsdiff(d, x, y, h) {
    let k = h - 1; let s = 1;
    while (k >= 0) {
        if (S[x + k] != S[y + k]) { if (S[x + k] < S[y + k]) { s = -1; } break; }
        k = k - 1;
    }
    let p = x; let q = y;
    if (s < 0) { p = y; q = x; }
    k = 0;
    while (k < h) {
        S[d + k] = S[p + k] - S[q + k]; S[d + k + 1] = S[p + k + 1] - S[q + k + 1];
        S[d + k + 2] = S[p + k + 2] - S[q + k + 2]; S[d + k + 3] = S[p + k + 3] - S[q + k + 3];
        k = k + 4;
    }
    mpn_snorm(d, h);
    return s;
}

// S[r..r+2n): z0 in the low half, z2 in the high half, z = the signed
// middle product (n limbs at S[z..]); adds z0 + z2 + s*z at r + n/2
// (n is a multiple of 16)
function mpn_kara_fold(r, z, n, s) {
    let k = 0; let rn = r + n;
    if (s > 0) {
        while (k < n) {
            S[z + k] = S[r + k] + S[rn + k] + S[z + k]; S[z + k + 1] = S[r + k + 1] + S[rn + k + 1] + S[z + k + 1];
            S[z + k + 2] = S[r + k + 2] + S[rn + k + 2] + S[z + k + 2]; S[z + k + 3] = S[r + k + 3] + S[rn + k + 3] + S[z + k + 3];
            k = k + 4;
        }
    } else {
        while (k < n) {
            S[z + k] = S[r + k] + S[rn + k] - S[z + k]; S[z + k + 1] = S[r + k + 1] + S[rn + k + 1] - S[z + k + 1];
            S[z + k + 2] = S[r + k + 2] + S[rn + k + 2] - S[z + k + 2]; S[z + k + 3] = S[r + k + 3] + S[rn + k + 3] - S[z + k + 3];
            k = k + 4;
        }
    }
    let rh = r + n / 2; k = 0;
    while (k < n) {
        S[rh + k] = S[rh + k] + S[z + k]; S[rh + k + 1] = S[rh + k + 1] + S[z + k + 1];
        S[rh + k + 2] = S[rh + k + 2] + S[z + k + 2]; S[rh + k + 3] = S[rh + k + 3] + S[z + k + 3];
        k = k + 4;
    }
    mpn_snorm(rh, n + n / 2);
}

// S[r..r+2n) = S[a..a+n) * S[b..b+n)
function mpn_kara(r, a, b, n, sp) {
    if (n <= kara_base) { mpn_smul(r, a, n, b, n, 16); }
    else {
        let h = n / 2;
        mpn_kara(r, a, b, h, sp);
        mpn_kara(r + n, a + h, b + h, h, sp);
        let sa = mpn_sabsdiff(sp, a, a + h, h);
        let sb = mpn_sabsdiff(sp + h, b + h, b, h);
        mpn_kara(sp + n, sp, sp + h, h, sp + n * 2);
        mpn_kara_fold(r, sp + n, n, sa * sb);
    }
}

// S[r..r+2n) = S[a..a+n)^2
function mpn_ksqr_rec(r, a, n, sp) {
    if (n <= kara_base) { mpn_ssqr(r, a, n, 16); }
    else {
        let h = n / 2;
        mpn_ksqr_rec(r, a, h, sp);
        mpn_ksqr_rec(r + n, a + h, h, sp);
        let sa = mpn_sabsdiff(sp, a, a + h, h);
        mpn_ksqr_rec(sp + h, sp, h, sp + h + n);
        mpn_kara_fold(r, sp + h, n, -1);
    }
}

// value: the padded length for an n-limb operand (sets kara_base)
function mpn_kplan(n) {
    let L = 0; let pw = 1; let p3 = 1; let bestP = 0; let bestCost = 0; let bb = 0; let cost = 0;
    while (L < 14) {
        bb = idiv(n + pw * 16 - 1, pw * 16) * 16;
        if (bb <= KARA_BASE_MAX) {
            cost = p3 * bb * bb + KARA_LIN * bb * pw * L;
            if (bestP == 0 || cost < bestCost) { bestP = bb * pw; bestCost = cost; kara_base = bb; }
        }
        L = L + 1; pw = pw * 2; p3 = p3 * 3;
    }
    return bestP;
}

// value: limbs of the product of the heap runs M[px..px+xn) and
// M[py..py+yn) (xn >= yn), left at S[gmp_sres..]. S holds 8P + 66 limbs
// (one chunk of x) or 10P + nch P + 67 (the caller keeps it under S_MAX)
function mpn_kmul(px, xn, py, yn) {
    let P = mpn_kplan(yn);
    let nch = idiv(xn + P - 1, P);
    let sa = 1; let sb = sa + P; let sr = sb + P;
    if (nch == 1) {
        let sp = sr + P * 2 + 1;
        mpn_sneed(sp + P * 4 + 64);
        mpn_sload(sb, py, yn, P);
        mpn_sload(sa, px, xn, P);
        mpn_kara(sr, sa, sb, P, sp);
    } else {
        let rn = nch * P + P;
        let st = sr + rn + 1; let sp = st + P * 2 + 1;
        mpn_sneed(sp + P * 4 + 64);
        mpn_sload(sb, py, yn, P);
        mpn_szero(sr, rn + 1);
        let c = 0; let off = 0;
        while (c < nch) {
            let len = xn - off;
            if (len > P) { len = P; }
            mpn_sload(sa, px + off, len, P);
            mpn_kara(st, sa, sb, P, sp);
            let k = 0; let d = sr + off; let e = P * 2;
            while (k < e) { S[d + k] = S[d + k] + S[st + k]; k = k + 1; }
            c = c + 1; off = off + P;
        }
        mpn_snorm(sr, rn);
    }
    let n = xn + yn;
    if (S[sr + n - 1] == 0) { n = n - 1; }
    gmp_sres = sr;
    return n;
}

// value: limbs of the square of the heap run M[pa..pa+an), left at S[gmp_sres..]
function mpn_ksqr(pa, an) {
    let P = mpn_kplan(an);
    let sa = 1; let sr = sa + P; let sp = sr + P * 2 + 1;
    mpn_sneed(sp + P * 4 + 64);
    mpn_sload(sa, pa, an, P);
    mpn_ksqr_rec(sr, sa, P, sp);
    let n = an * 2;
    if (S[sr + n - 1] == 0) { n = n - 1; }
    gmp_sres = sr;
    return n;
}
