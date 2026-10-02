// ============================================================
// powers and number theory
// ============================================================
let PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
    101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199,
    211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331,
    337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457,
    461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599,
    601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733,
    739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877,
    881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
// products of runs of the primes above below 9*10^8 (one mod_1 for a run), and
// where each run ends in PRIMES
let PRPROD = [];
let PREND = [];
let PB = [];                  // exponent bits, least significant first
let mp_bits = 0;              // (for mpz_powm: how many)

function mp_prime_runs() {
    let i = 1; let p = 1;
    while (i <= PRIMES.length) {
        if (p * PRIMES[i] >= 900000000) { PRPROD.push(p); PREND.push(i - 1); p = 1; }
        p = p * PRIMES[i];
        i = i + 1;
    }
    PRPROD.push(p); PREND.push(PRIMES.length);
}

// PB = the bits of |e|, mp_bits of them
function mp_get_bits(e) {
    mpz_set(gmp_t1, e);
    let n = Math.abs(zN[gmp_t1]); let p = zP[gmp_t1];
    let k = PB.length;
    while (k > 0) { PB.removeAt(k); k = k - 1; }
    mp_bits = 0;
    while (n > 0) {
        let v = mpn_divrem_1(p, p, n, 1048576);
        n = mpn_normsize(p, n);
        let j = 0;
        while (j < 20) { PB.push(mod(v, 2)); v = idiv(v, 2); j = j + 1; }
    }
    k = PB.length;
    while (k > 0) { if (PB[k] == 1) { break; } k = k - 1; }
    mp_bits = k;
}

// ---------------- Barrett modular arithmetic on S ----------------
// the modulus m (k limbs), mu = floor(BASE^2k / m) (k+1 limbs) and the
// running value x live in S; products are padded to bkp limbs
let bk = 0; let bkp = 0; let bt = 16; let bkara = 0; let bkb = 16;
let bOG = 0; let bOM = 0; let bOU = 0; let bOX = 0; let bOY = 0; let bOT = 0; let bOQ1 = 0; let bOQ2 = 0; let bOQ3 = 0; let bOR2 = 0; let bOP = 0; let bSP = 0;
let bmu = 0;                  // mpz handle of mu (made once)
let bmod = 0;                 // mpz handle: the modulus mu belongs to

// set up S for modulus m (|m| >= BASE, two limbs or more), w: window bits
function mpn_bsetup(m, w) {
    bk = Math.abs(zN[m]);
    if (bmu == 0) { bmu = mpz_init(); bmod = mpz_init(); }
    if (mpz_cmpabs(bmod, m) != 0) {
        mpz_set(bmod, m); zN[bmod] = bk;
        mpz_set_si(bmu, 1);
        let k = 0;
        while (k < bk * 2) { mpz_mul_small(bmu, bmu, BASE); k = k + 1; }
        mpz_divrem_abs(bmu, 0, bmu, bmod);
    }
    bkara = 0;
    if (bk + 1 >= KARA_SQR_MIN) {
        bkara = 1; bkp = mpn_kplan(bk + 1); bkb = kara_base; bt = 16;
    } else {
        bt = mpn_tile(bk + 1); bkp = idiv(bk + 1 + bt - 1, bt) * bt;
    }
    let np = 1;
    let j = 1;
    while (j < w) { np = np * 2; j = j + 1; }
    bOM = 1; bOU = bOM + bkp; bOX = bOU + bkp; bOY = bOX + bkp; bOT = bOY + bkp;
    bOQ1 = bOT + bkp * 2 + 1; bOQ2 = bOQ1 + bkp; bOQ3 = bOQ2 + bkp * 2 + 1; bOR2 = bOQ3 + bkp;
    bOP = bOR2 + bkp * 2 + 1; bOG = bOP + bkp * np; bSP = bOG + bkp * 8 + 1;
    mpn_sneed(bSP + bkp * 4 + 64);
    mpn_sload(bOM, zP[bmod], bk, bkp);
    mpn_sload(bOU, zP[bmu], Math.abs(zN[bmu]), bkp);
}

// S[d..d+bkp) = S[s..s+bkp)
function mpn_scopy(d, s, n) {
    let k = 0;
    while (k < n) { S[d + k] = S[s + k]; k = k + 1; }
}

// x = (S[bOT..], 2k limbs) mod m, into S[bOX..]
function mpn_bred() {
    // (globals are looked up linearly in Entry: locals in the loops)
    let k = bk; let kp = bkp; let ox = bOX; let om = bOM; let ot = bOT; let oq1 = bOQ1; let oq2 = bOQ2; let oq3 = bOQ3; let or2 = bOR2;
    let i = 0;
    while (i <= k) { S[oq1 + i] = S[ot + k - 1 + i]; i = i + 1; }
    while (i < kp) { S[oq1 + i] = 0; i = i + 1; }
    if (bkara == 1) { kara_base = bkb; mpn_kara(bOQ2, oq1, bOU, kp, bSP); }
    else {
        if (bt == 16) { mpn_mul_grid16hi(bOQ2, oq1, kp, bOU, kp, k - 2); }
        if (bt == 8) { mpn_mul_grid8hi(bOQ2, oq1, kp, bOU, kp, k - 2); }
        if (bt == 4) { mpn_mul_grid4hi(bOQ2, oq1, kp, bOU, kp, k - 2); }
    }
    i = 0;
    while (i <= k) { S[oq3 + i] = S[oq2 + k + 1 + i]; i = i + 1; }
    while (i < kp) { S[oq3 + i] = 0; i = i + 1; }
    if (bkara == 1) { mpn_kara(or2, oq3, om, kp, bSP); }
    else {
        if (bt == 16) { mpn_mul_grid16lo(or2, oq3, kp, om, kp, k + 1); }
        if (bt == 8) { mpn_mul_grid8lo(or2, oq3, kp, om, kp, k + 1); }
        if (bt == 4) { mpn_mul_grid4lo(or2, oq3, kp, om, kp, k + 1); }
    }
    // x = (t - r2) mod BASE^(k+1)
    let c = 0; let t = 0; i = 0;
    while (i <= k) { t = S[ot + i] - S[or2 + i] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } S[ox + i] = t; i = i + 1; }
    // at most a few m too much
    let go = 1;
    while (go == 1) {
        go = 0;
        if (S[ox + k] > 0) { go = 1; }
        else {
            i = k - 1;
            go = 1;
            while (i >= 0) {
                if (S[ox + i] != S[om + i]) { if (S[ox + i] < S[om + i]) { go = 0; } break; }
                i = i - 1;
            }
        }
        if (go == 1) {
            c = 0; i = 0;
            while (i <= k) { t = S[ox + i] - S[om + i] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } S[ox + i] = t; i = i + 1; }
        }
    }
}

// x = x^2 mod m
function mpn_bsqr() {
    if (bkara == 1) { kara_base = bkb; mpn_ksqr_rec(bOT, bOX, bkp, bSP); }
    else { mpn_ssqr(bOT, bOX, bkp, bt); }
    mpn_bred();
}

// x = x * S[y..] mod m
function mpn_bmul(y) {
    if (bkara == 1) { kara_base = bkb; mpn_kara(bOT, bOX, y, bkp, bSP); }
    else { mpn_smul(bOT, bOX, bkp, y, bkp, bt); }
    mpn_bred();
}

// x = b^e mod m (b already reduced, e > 0); bits in PB
function mpn_bpow(b, w) {
    let np = 1; let j = 1;
    while (j < w) { np = np * 2; j = j + 1; }
    // odd powers b, b^3, b^5 ... at bOP + bkp*i
    mpn_sload(bOP, zP[b], Math.abs(zN[b]), bkp);
    if (np > 1) {
        mpn_scopy(bOX, bOP, bkp);
        mpn_bsqr();
        mpn_scopy(bOY, bOX, bkp);
        j = 1;
        while (j < np) {
            mpn_scopy(bOX, bOP + bkp * (j - 1), bkp);
            mpn_bmul(bOY);
            mpn_scopy(bOP + bkp * j, bOX, bkp);
            j = j + 1;
        }
    }
    // left to right, windows of up to w bits ending in a 1
    let i = mp_bits; let first = 1;
    while (i >= 1) {
        if (PB[i] == 0) { mpn_bsqr(); i = i - 1; }
        else {
            let lo = i - w + 1;
            if (lo < 1) { lo = 1; }
            while (PB[lo] == 0) { lo = lo + 1; }
            let v = 0; j = i;
            while (j >= lo) { v = v * 2 + PB[j]; j = j - 1; }
            if (first == 1) { mpn_scopy(bOX, bOP + bkp * idiv(v, 2), bkp); first = 0; }
            else {
                j = i;
                while (j >= lo) { mpn_bsqr(); j = j - 1; }
                mpn_bmul(bOP + bkp * idiv(v, 2));
            }
            i = lo - 1;
        }
    }
}

// r = x
function mpn_bget(r) {
    _mpz_realloc(r, bk);
    mpn_sstore(zP[r], bOX, bk);
    zN[r] = mpn_normsize(zP[r], bk);
}

// ---- register operations (registers: S[bOG + bkp*i], i = 0..7) ----
function mpn_breg(i) { return bOG + bkp * i; }
// S[d] = S[x] * S[y] mod m
function mpn_bmulr(d, x, y) {
    if (bkara == 1) { kara_base = bkb; mpn_kara(bOT, x, y, bkp, bSP); }
    else { mpn_smul(bOT, x, bkp, y, bkp, bt); }
    mpn_bred();
    mpn_scopy(d, bOX, bkp);
}
function mpn_bsqrr(d, x) {
    if (bkara == 1) { kara_base = bkb; mpn_ksqr_rec(bOT, x, bkp, bSP); }
    else { mpn_ssqr(bOT, x, bkp, bt); }
    mpn_bred();
    mpn_scopy(d, bOX, bkp);
}
// value: 1 if S[x] (k+1 limbs) >= m
function mpn_bge(x) {
    let k = bk; let om = bOM; let r = 1;
    if (S[x + k] == 0) {
        let i = k - 1;
        while (i >= 0) {
            if (S[x + i] != S[om + i]) { if (S[x + i] < S[om + i]) { r = 0; } break; }
            i = i - 1;
        }
    }
    return r;
}
// S[d] = S[x] -/+ m in place helpers; s = 1 add m, -1 subtract m
function mpn_baddm(x, s) {
    let k = bk; let om = bOM; let c = 0; let t = 0; let i = 0;
    while (i <= k) {
        t = S[x + i] + S[om + i] * s + c; c = 0;
        if (t < 0) { t = t + BASE; c = -1; }
        if (t >= BASE) { t = t - BASE; c = 1; }
        S[x + i] = t; i = i + 1;
    }
}
// S[d] = S[x] + S[y] mod m (d may be x or y)
function mpn_baddr(d, x, y) {
    let k = bk; let c = 0; let t = 0; let i = 0;
    while (i <= k) { t = S[x + i] + S[y + i] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } S[d + i] = t; i = i + 1; }
    if (mpn_bge(d) == 1) { mpn_baddm(d, -1); }
}
// S[d] = S[x] - S[y] mod m
function mpn_bsubr(d, x, y) {
    let k = bk; let c = 0; let t = 0; let i = 0;
    while (i <= k) { t = S[x + i] - S[y + i] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } S[d + i] = t; i = i + 1; }
    if (c == 1) { mpn_baddm(d, 1); S[d + k] = 0; }
}
// S[d] = S[x] / 2 mod m (m odd)
function mpn_bhalfr(d, x) {
    mpn_scopy(d, x, bkp);
    if (mod(S[d], 2) == 1) { mpn_baddm(d, 1); }
    let rem = 0; let k = bk; let t = 0; let q = 0;
    while (k >= 0) { t = rem * BASE + S[d + k]; q = idiv(t, 2); rem = t - q * 2; S[d + k] = q; k = k - 1; }
}
// value: 1 if S[x] == 0
function mpn_bzero(x) {
    let r = 1; let i = 0; let k = bk;
    while (i <= k) { if (S[x + i] != 0) { r = 0; break; } i = i + 1; }
    return r;
}
// S[d] = v mod m for a small whole number v (|v| < BASE)
function mpn_bsetr(d, v) {
    let i = 0;
    while (i < bkp) { S[d + i] = 0; i = i + 1; }
    S[d] = Math.abs(v);
    if (v < 0) {
        // m - |v|
        let k = bk; let c = 0; let t = 0; let om = bOM;
        i = 0;
        while (i < k) { t = S[om + i] - S[d + i] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } S[d + i] = t; i = i + 1; }
    }
}

// value: 1 if pp_n is a strong Lucas probable prime (Selfridge's D, P = 1);
// 0 composite. pp_n odd, not a square, > 1000000
let lc_d = 0;
function mp_lucas() {
    if (lc_d == 0) { lc_d = mpz_init(); }
    let res = 0;
    // D = 5, -7, 9, -11, ... with (D/n) = -1
    let D = 5; let go = 1; let j = 0;
    while (go == 1) {
        mpz_set_si(lc_d, D);
        j = mpz_jacobi(lc_d, pp_n);
        if (j == -1) { go = 0; }
        else {
            if (j == 0) { if (mpz_cmpabs_ui(pp_n, Math.abs(D)) != 0) { go = -1; } }
            if (go == 1) { if (D > 0) { D = 0 - D - 2; } else { D = 2 - D; } }
        }
    }
    if (go == 0) {
        let Q = (1 - D) / 4;
        // n + 1 = d * 2^s
        mpz_add_ui(lc_d, pp_n, 1);
        let s = 0;
        while (mod(M[zP[lc_d]], 2) == 0) {
            let vz = mpn_divrem_1(zP[lc_d], zP[lc_d], zN[lc_d], 2);
            zN[lc_d] = mpn_normsize(zP[lc_d], zN[lc_d]);
            s = s + 1;
        }
        mp_get_bits(lc_d);
        mpn_bsetup(pp_n, 1);
        let rU = mpn_breg(0); let rV = mpn_breg(1); let rQk = mpn_breg(2); let rD = mpn_breg(3); let rQ = mpn_breg(4); let rT = mpn_breg(5);
        mpn_bsetr(rU, 1); mpn_bsetr(rV, 1); mpn_bsetr(rQk, Q); mpn_bsetr(rD, D); mpn_bsetr(rQ, Q);
        let i = mp_bits - 1;
        while (i >= 1) {
            // double: U = U V, V = V^2 - 2 Q^k, Q^k = (Q^k)^2
            mpn_bmulr(rU, rU, rV);
            mpn_bsqrr(rV, rV);
            mpn_bsubr(rV, rV, rQk); mpn_bsubr(rV, rV, rQk);
            mpn_bsqrr(rQk, rQk);
            if (PB[i] == 1) {
                // U, V = (U + V) / 2, (D U + V) / 2; Q^k = Q Q^k
                mpn_bmulr(rT, rD, rU);
                mpn_baddr(rT, rT, rV);
                mpn_baddr(rU, rU, rV);
                mpn_bhalfr(rU, rU);
                mpn_bhalfr(rV, rT);
                mpn_bmulr(rQk, rQk, rQ);
            }
            i = i - 1;
        }
        if (mpn_bzero(rU) == 1 || mpn_bzero(rV) == 1) { res = 1; }
        let r = 1;
        while (res == 0 && r < s) {
            mpn_bsqrr(rV, rV);
            mpn_bsubr(rV, rV, rQk); mpn_bsubr(rV, rV, rQk);
            if (mpn_bzero(rV) == 1) { res = 1; }
            mpn_bsqrr(rQk, rQk);
            r = r + 1;
        }
    }
    return res;
}

// value: window bits for an exponent of n bits
function mp_window(n) {
    let w = 1;
    if (n > 8) { w = 3; }
    if (n > 64) { w = 4; }
    if (n > 256) { w = 5; }
    return w;
}

// value: a^e mod m for Entry numbers (m < 94906265: products stay exact)
function mp_powm_small(a, m) {
    let x = 1; let i = mp_bits; let b = mod(a, m);
    while (i >= 1) {
        x = mod(x * x, m);
        if (PB[i] == 1) { x = mod(x * b, m); }
        i = i - 1;
    }
    return mod(x, m);
}

// r = b^e mod m (e < 0: the inverse of b to the power -e)
function mpz_powm(r, b, e, m) {
    if (zN[m] == 0) { gmp_errno = 1; }
    else {
        mpz_set(gmp_t2, m); zN[gmp_t2] = Math.abs(zN[gmp_t2]);
        if (zN[e] < 0) { let ok = mpz_invert(gmp_t3, b, gmp_t2); }
        else { mpz_mod(gmp_t3, b, gmp_t2); }
        mp_get_bits(e);
        let k = zN[gmp_t2];
        if (mp_bits == 0) { mpz_set_si(r, 1); if (k == 1) { if (M[zP[gmp_t2]] == 1) { zN[r] = 0; } } }
        else {
            if (k == 1 && M[zP[gmp_t2]] < 94906265) {
                mpz_set_si(r, mp_powm_small(mpz_get_si(gmp_t3), M[zP[gmp_t2]]));
            } else {
                if (k == 2 && M[zP[gmp_t2] + 1] < 9) {
                    mpz_set_si(r, mp_powm_small(mpz_get_si(gmp_t3), mpz_get_si(gmp_t2)));
                } else {
                    let w = mp_window(mp_bits);
                    mpn_bsetup(gmp_t2, w);
                    mpn_bpow(gmp_t3, w);
                    mpn_bget(r);
                }
            }
        }
    }
}

function mpz_powm_ui(r, b, v, m) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_powm(r, b, gmp_t4, m); }

// r = b^v
function mpz_pow_ui(r, b, v) {
    mpz_set(gmp_t5, b);
    mpz_set_si(r, 1);
    let e = Math.abs(v);
    let bits = 0; let t = e;
    while (t > 0) { bits = bits + 1; t = idiv(t, 2); }
    let i = bits - 1;
    while (i >= 0) {
        mpz_mul(r, r, r);
        let p = 1; let j = 0;
        while (j < i) { p = p * 2; j = j + 1; }
        if (mod(idiv(e, p), 2) == 1) { mpz_mul(r, r, gmp_t5); }
        i = i - 1;
    }
}
function mpz_ui_pow_ui(r, b, v) { mpz_set_si(gmp_t6, Math.abs(b)); mpz_pow_ui(r, gmp_t6, v); }

// ---------------- gcd ----------------
function mpz_gcd(r, a, b) {
    mpz_set(gmp_t1, a); zN[gmp_t1] = Math.abs(zN[gmp_t1]);
    mpz_set(gmp_t2, b); zN[gmp_t2] = Math.abs(zN[gmp_t2]);
    while (zN[gmp_t2] != 0) {
        mpz_divrem_abs(0, gmp_t3, gmp_t1, gmp_t2);
        mpz_swap(gmp_t1, gmp_t2);
        mpz_swap(gmp_t2, gmp_t3);
    }
    mpz_set(r, gmp_t1);
}
// value: gcd(a, v); r (when not 0) gets it too
function mpz_gcd_ui(r, a, v) {
    mpz_set_si(gmp_t4, Math.abs(v));
    if (v == 0) { mpz_set(gmp_t4, a); zN[gmp_t4] = Math.abs(zN[gmp_t4]); }
    else { mpz_gcd(gmp_t4, a, gmp_t4); }
    if (r > 0) { mpz_set(r, gmp_t4); }
    return mpz_get_si(gmp_t4);
}
function mpz_lcm(r, a, b) {
    if (zN[a] == 0 || zN[b] == 0) { zN[r] = 0; }
    else {
        mpz_gcd(gmp_t4, a, b);
        mpz_divrem_abs(gmp_t5, 0, a, gmp_t4);
        mpz_mul(r, gmp_t5, b);
        zN[r] = Math.abs(zN[r]);
    }
}
function mpz_lcm_ui(r, a, v) { mpz_set_si(gmp_t6, Math.abs(v)); mpz_lcm(r, a, gmp_t6); }

// g = gcd(a, b) = a*s + b*t (s or t may be 0: not wanted)
let gx_q = 0; let gx_r0 = 0; let gx_r1 = 0; let gx_s0 = 0; let gx_s1 = 0; let gx_t0 = 0; let gx_t1 = 0; let gx_w = 0;
function mpz_gcdext(g, s, t, a, b) {
    if (gx_q == 0) { gx_q = mpz_init(); gx_r0 = mpz_init(); gx_r1 = mpz_init(); gx_s0 = mpz_init(); gx_s1 = mpz_init(); gx_t0 = mpz_init(); gx_t1 = mpz_init(); gx_w = mpz_init(); }
    mpz_set(gx_r0, a); mpz_set(gx_r1, b);
    mpz_set_si(gx_s0, 1); mpz_set_si(gx_s1, 0);
    mpz_set_si(gx_t0, 0); mpz_set_si(gx_t1, 1);
    while (zN[gx_r1] != 0) {
        mpz_tdiv_q(gx_q, gx_r0, gx_r1);
        mpz_mul(gx_w, gx_q, gx_r1); mpz_sub(gx_w, gx_r0, gx_w); mpz_swap(gx_r0, gx_r1); mpz_swap(gx_r1, gx_w);
        mpz_mul(gx_w, gx_q, gx_s1); mpz_sub(gx_w, gx_s0, gx_w); mpz_swap(gx_s0, gx_s1); mpz_swap(gx_s1, gx_w);
        mpz_mul(gx_w, gx_q, gx_t1); mpz_sub(gx_w, gx_t0, gx_w); mpz_swap(gx_t0, gx_t1); mpz_swap(gx_t1, gx_w);
    }
    if (zN[gx_r0] < 0) { zN[gx_r0] = 0 - zN[gx_r0]; zN[gx_s0] = 0 - zN[gx_s0]; zN[gx_t0] = 0 - zN[gx_t0]; }
    if (g > 0) { mpz_set(g, gx_r0); }
    if (s > 0) { mpz_set(s, gx_s0); }
    if (t > 0) { mpz_set(t, gx_t0); }
}

// value: 1 and r = a^-1 mod |m| when it exists, else 0 (r unchanged)
function mpz_invert(r, a, m) {
    let ok = 0;
    mpz_set(gmp_t8, m); zN[gmp_t8] = Math.abs(zN[gmp_t8]);
    if (zN[gmp_t8] != 0) {
        mpz_gcdext(gmp_t7, gmp_t6, 0, a, gmp_t8);
        if (zN[gmp_t7] == 1 && M[zP[gmp_t7]] == 1) {
            ok = 1;
            mpz_mod(r, gmp_t6, gmp_t8);
            if (zN[gmp_t8] == 1) { if (M[zP[gmp_t8]] == 1) { ok = 0; } }
        }
    }
    if (ok == 0) { gmp_errno = 3; }
    return ok;
}

// value: the Jacobi symbol (a/b), b odd > 0
function mpz_jacobi(a, b) {
    mpz_mod(gmp_t1, a, b);
    mpz_set(gmp_t2, b); zN[gmp_t2] = Math.abs(zN[gmp_t2]);
    let j = 1;
    while (zN[gmp_t1] != 0) {
        while (mod(M[zP[gmp_t1]], 2) == 0) {
            let n = zN[gmp_t1];
            let vz = mpn_divrem_1(zP[gmp_t1], zP[gmp_t1], n, 2);
            zN[gmp_t1] = mpn_normsize(zP[gmp_t1], n);
            let r8 = mod(M[zP[gmp_t2]], 8);
            if (r8 == 3 || r8 == 5) { j = 0 - j; }
        }
        mpz_swap(gmp_t1, gmp_t2);
        if (mod(M[zP[gmp_t1]], 4) == 3) { if (mod(M[zP[gmp_t2]], 4) == 3) { j = 0 - j; } }
        mpz_divrem_abs(0, gmp_t3, gmp_t1, gmp_t2);
        mpz_swap(gmp_t1, gmp_t3);
    }
    if (zN[gmp_t2] != 1 || M[zP[gmp_t2]] != 1) { j = 0; }
    return j;
}
function mpz_legendre(a, p) { return mpz_jacobi(a, p); }
function mpz_kronecker(a, b) { return mpz_jacobi(a, b); }

// ---------------- roots ----------------
let SQSH = [];                // shifts of the precision ladder
let sq_n = 0; let sq_x = 0; let sq_y = 0; let sq_q = 0;

// r = floor(sqrt(|a|)); rem (when not 0) = |a| - r^2
function mpz_sqrtrem(r, rem, a) {
    if (sq_n == 0) { sq_n = mpz_init(); sq_x = mpz_init(); sq_y = mpz_init(); sq_q = mpz_init(); }
    mpz_set(gmp_t1, a); zN[gmp_t1] = Math.abs(zN[gmp_t1]);
    let L = zN[gmp_t1];
    let k = SQSH.length;
    while (k > 0) { SQSH.removeAt(k); k = k - 1; }
    // the ladder: each step drops half the limbs (an even count)
    let s = 0; let m = L;
    SQSH.push(0);
    while (m > 2) { let d = idiv(m, 4); if (d < 1) { d = 1; } s = s + d; m = m - d * 2; SQSH.push(s); }
    // top: an Entry number
    let top = SQSH[SQSH.length];
    let v = 0; k = L - 1;
    while (k >= top * 2) { v = v * BASE + M[zP[gmp_t1] + k]; k = k - 1; }
    let x = Math.floor(Math.sqrt(v));
    while (x * x > v) { x = x - 1; }
    while ((x + 1) * (x + 1) <= v) { x = x + 1; }
    mpz_set_si(sq_x, x);
    let lv = SQSH.length - 1;
    while (lv >= 1) {
        let sh = SQSH[lv + 1];
        let s0 = SQSH[lv];
        // n at this rung: the limbs from 2*s0 up
        let nn = L - s0 * 2;
        _mpz_realloc(sq_n, nn);
        mpn_copyi(zP[sq_n], zP[gmp_t1] + s0 * 2, nn);
        zN[sq_n] = mpn_normsize(zP[sq_n], nn);
        // start above the root: (x + 1) * BASE^(sh - s0)
        mpz_add_ui(sq_x, sq_x, 1);
        let j = sh - s0;
        while (j > 0) { mpz_mul_small(sq_x, sq_x, BASE); j = j - 1; }
        // Newton from above
        let go = 1;
        while (go == 1) {
            mpz_divrem_abs(sq_q, 0, sq_n, sq_x);
            mpz_add(sq_y, sq_x, sq_q);
            let vz = mpn_divrem_1(zP[sq_y], zP[sq_y], zN[sq_y], 2);
            zN[sq_y] = mpn_normsize(zP[sq_y], zN[sq_y]);
            if (mpz_cmp(sq_y, sq_x) < 0) { mpz_swap(sq_x, sq_y); } else { go = 0; }
        }
        lv = lv - 1;
    }
    if (rem > 0) { mpz_mul(sq_y, sq_x, sq_x); mpz_sub(rem, gmp_t1, sq_y); }
    mpz_set(r, sq_x);
}
function mpz_sqrt(r, a) { mpz_sqrtrem(r, 0, a); }

// value: 1 if a is a perfect square
function mpz_perfect_square_p(a) {
    let r = 0;
    if (zN[a] >= 0) { mpz_sqrtrem(gmp_t9, gmp_t8, a); if (zN[gmp_t8] == 0) { r = 1; } }
    return r;
}

// r = floor(a^(1/n)) (a >= 0, or n odd); value: 1 if exact
let rt_x = 0; let rt_y = 0; let rt_p = 0;
function mpz_root(r, a, n) {
    if (rt_x == 0) { rt_x = mpz_init(); rt_y = mpz_init(); rt_p = mpz_init(); }
    let neg = 0;
    if (zN[a] < 0) { neg = 1; }
    mpz_set(gmp_t1, a); zN[gmp_t1] = Math.abs(zN[gmp_t1]);
    let exact = 0;
    if (n == 1 || zN[gmp_t1] == 0) { mpz_set(rt_x, gmp_t1); exact = 1; }
    else {
        // from above: 2^ceil(bits/n)
        mpz_set(gmp_t2, gmp_t1);
        let bits = mpz_bits_exact(gmp_t2);
        mpz_set_si(rt_x, 1);
        mpz_mul_2exp(rt_x, rt_x, idiv(bits + n - 1, n));
        let go = 1;
        while (go == 1) {
            // y = ((n-1) x + a / x^(n-1)) / n
            mpz_pow_ui(rt_p, rt_x, n - 1);
            mpz_divrem_abs(rt_y, 0, gmp_t1, rt_p);
            mpz_mul_small(gmp_t3, rt_x, n - 1);
            mpz_add(rt_y, rt_y, gmp_t3);
            mpz_tdiv_q_ui(rt_y, rt_y, n);
            if (mpz_cmp(rt_y, rt_x) < 0) { mpz_swap(rt_x, rt_y); } else { go = 0; }
        }
        mpz_pow_ui(rt_p, rt_x, n);
        if (mpz_cmp(rt_p, gmp_t1) == 0) { exact = 1; }
    }
    mpz_set(r, rt_x);
    if (neg == 1) { zN[r] = 0 - zN[r]; }
    return exact;
}
function mpz_perfect_power_p(a) {
    let r = 0;
    mpz_set(gmp_t6, a); zN[gmp_t6] = Math.abs(zN[gmp_t6]);
    if (mpz_cmp_si(gmp_t6, 1) <= 0) { r = 1; }
    else {
        mpz_set(gmp_t5, gmp_t6);
        let bits = mpz_bits_exact(gmp_t5);
        let n = 2;
        while (n <= bits) {
            if (mpz_root(gmp_t5, gmp_t6, n) == 1) { r = 1; break; }
            n = n + 1;
        }
    }
    return r;
}

// ---------------- primes ----------------
// value: 2 surely prime, 1 probably prime, 0 composite (|n| is tested)
let pp_n = 0; let pp_d = 0; let pp_a = 0; let pp_n1 = 0; let pp_x = 0;
function mpz_probab_prime_p(n, reps) {
    if (pp_n == 0) { pp_n = mpz_init(); pp_d = mpz_init(); pp_a = mpz_init(); pp_n1 = mpz_init(); pp_x = mpz_init(); mp_prime_runs(); }
    mpz_set(pp_n, n); zN[pp_n] = Math.abs(zN[pp_n]);
    let res = 1; let decided = 0;
    let nn = zN[pp_n]; let p = zP[pp_n];
    // small numbers: trial division decides
    if (nn <= 1) {
        let v = 0;
        if (nn == 1) { v = M[p]; }
        if (v < 2) { res = 0; decided = 1; }
        else {
            if (v < 1000000) {
                res = 2; let i = 1;
                while (i <= PRIMES.length) {
                    let q = PRIMES[i];
                    if (q * q > v) { break; }
                    if (mod(v, q) == 0) { res = 0; break; }
                    i = i + 1;
                }
                decided = 1;
            }
        }
    }
    if (decided == 0) {
        // trial division by the primes below 1000
        let g = 1; let i = 1;
        while (g <= PRPROD.length) {
            let rr = mpn_mod_1(p, nn, PRPROD[g]);
            while (i <= PREND[g]) {
                if (mod(rr, PRIMES[i]) == 0) { if (mpz_cmp_si(pp_n, PRIMES[i]) != 0) { res = 0; decided = 1; } }
                i = i + 1;
            }
            if (decided == 1) { break; }
            g = g + 1;
        }
        if (decided == 0) {
            if (mpz_cmp_si(pp_n, 1000000) < 0) { res = 2; decided = 1; }
        }
        if (decided == 0) {
            // as GMP: Baillie-PSW (Miller-Rabin to base 2, then a strong
            // Lucas test), then reps - 24 more Miller-Rabin rounds
            mpz_sub_ui(pp_n1, pp_n, 1);
            mpz_set(pp_d, pp_n1);
            let s = 0;
            while (mod(M[zP[pp_d]], 2) == 0) {
                let vz = mpn_divrem_1(zP[pp_d], zP[pp_d], zN[pp_d], 2);
                zN[pp_d] = mpn_normsize(zP[pp_d], zN[pp_d]);
                s = s + 1;
            }
            mpz_set_si(pp_a, 2);
            if (mp_miller_rabin(s) == 0) { res = 0; }
            else {
                if (mpz_perfect_square_p(pp_n) == 1) { res = 0; }
                else { if (mp_lucas() == 0) { res = 0; } }
            }
            if (res > 0) {
                // no Baillie-PSW pseudoprime below 2^64 exists
                mpz_set_str(pp_x, '18446744073709551616', 10);
                if (mpz_cmp(pp_n, pp_x) < 0) { res = 2; }
                else {
                    let r = 24;
                    while (r < reps) {
                        mpz_sub_ui(pp_x, pp_n, 3); mpz_urandomm(pp_a, mp_rand_state(), pp_x); mpz_add_ui(pp_a, pp_a, 2);
                        if (mp_miller_rabin(s) == 0) { res = 0; break; }
                        r = r + 1;
                    }
                }
            }
        }
    }
    return res;
}

// value: 1 if pp_n passes one Miller-Rabin round with base pp_a
// (n - 1 = pp_d * 2^s, pp_n1 = n - 1)
function mp_miller_rabin(s) {
    let ok = 0;
    mpz_powm(pp_x, pp_a, pp_d, pp_n);
    if (mpz_cmp_si(pp_x, 1) == 0 || mpz_cmp(pp_x, pp_n1) == 0) { ok = 1; }
    else {
        // square in place: S still holds the Barrett set-up when n is large
        let big = 1;
        if (zN[pp_n] == 1) { if (M[zP[pp_n]] < 94906265) { big = 0; } }
        if (zN[pp_n] == 2) { if (M[zP[pp_n] + 1] < 9) { big = 0; } }
        let j = 1;
        while (j < s) {
            if (big == 1) { mpn_bsqr(); mpn_bget(pp_x); }
            else { let m = mpz_get_si(pp_n); let v = mpz_get_si(pp_x); mpz_set_si(pp_x, mod(v * v, m)); }
            if (mpz_cmp(pp_x, pp_n1) == 0) { ok = 1; break; }
            if (mpz_cmp_si(pp_x, 1) == 0) { break; }
            j = j + 1;
        }
    }
    return ok;
}

// r = the next prime above a
function mpz_nextprime(r, a) {
    mpz_set(gmp_t8, a);
    if (mpz_cmp_si(gmp_t8, 2) < 0) { mpz_set_si(r, 2); }
    else {
        mpz_add_ui(r, gmp_t8, 1);
        if (mpz_even_p(r) == 1) { if (mpz_cmp_si(r, 2) != 0) { mpz_add_ui(r, r, 1); } }
        while (mpz_probab_prime_p(r, 25) == 0) { mpz_add_ui(r, r, 2); }
    }
}

// ---------------- factorial, binomial, Fibonacci ----------------
// r = lo * (lo+1) * ... * hi, by halves (products of about equal size)
let PRL = [];                 // handles per depth
function mp_prod_range(r, lo, hi, depth) {
    if (hi - lo < 16) {
        mpz_set_si(r, 1);
        let c = 1; let i = lo;
        while (i <= hi) {
            if (c * i >= BASE) { mpz_mul_small(r, r, c); c = 1; }
            c = c * i; i = i + 1;
        }
        mpz_mul_small(r, r, c);
    } else {
        while (PRL.length < depth) { PRL.push(mpz_init()); }
        let mid = idiv(lo + hi, 2);
        mp_prod_range(PRL[depth], lo, mid, depth + 1);
        mp_prod_range(r, mid + 1, hi, depth + 1);
        mpz_mul(r, r, PRL[depth]);
    }
}
function mpz_fac_ui(r, n) {
    if (n < 2) { mpz_set_si(r, 1); }
    else {
        mpz_set_si(gmp_t9, 0);
        mp_prod_range(gmp_t9, 2, n, 1);
        mpz_set(r, gmp_t9);
    }
}
function mpz_2fac_ui(r, n) {
    mpz_set_si(gmp_t1, 1);
    let i = n;
    while (i > 1) { mpz_mul_si(gmp_t1, gmp_t1, i); i = i - 2; }
    mpz_set(r, gmp_t1);
}
function mpz_primorial_ui(r, n) {
    mpz_set_si(gmp_t1, 1);
    let i = 2;
    while (i <= n) {
        let pr = 1; let q = 2;
        while (q * q <= i) { if (mod(i, q) == 0) { pr = 0; break; } q = q + 1; }
        if (pr == 1) { mpz_mul_si(gmp_t1, gmp_t1, i); }
        i = i + 1;
    }
    mpz_set(r, gmp_t1);
}
// r = binomial(n, k)
function mpz_bin_ui(r, n, k) {
    mpz_set(gmp_t3, n);
    mpz_set_si(gmp_t2, 1);
    let i = 1;
    while (i <= k) {
        mpz_mul(gmp_t2, gmp_t2, gmp_t3);
        mpz_divexact_ui(gmp_t2, gmp_t2, i);
        mpz_sub_ui(gmp_t3, gmp_t3, 1);
        i = i + 1;
    }
    if (k < 0) { zN[gmp_t2] = 0; }
    mpz_set(r, gmp_t2);
}
function mpz_bin_uiui(r, n, k) { mpz_set_si(gmp_t7, n); mpz_bin_ui(r, gmp_t7, k); }

// r = F(n), by doubling: F(2k) = F(k)(2F(k+1) - F(k)), F(2k+1) = F(k)^2 + F(k+1)^2
let fb_a = 0; let fb_b = 0; let fb_c = 0;
function mpz_fib_ui(r, n) {
    if (fb_a == 0) { fb_a = mpz_init(); fb_b = mpz_init(); fb_c = mpz_init(); }
    mpz_set_si(fb_a, 0); mpz_set_si(fb_b, 1);
    let bits = 0; let t = n;
    while (t > 0) { bits = bits + 1; t = idiv(t, 2); }
    let i = bits - 1;
    while (i >= 0) {
        mpz_mul_small(fb_c, fb_b, 2); mpz_sub(fb_c, fb_c, fb_a); mpz_mul(fb_c, fb_c, fb_a);
        mpz_mul(fb_a, fb_a, fb_a); mpz_mul(fb_b, fb_b, fb_b); mpz_add(fb_b, fb_b, fb_a);
        mpz_swap(fb_a, fb_c);
        let p = 1; let j = 0;
        while (j < i) { p = p * 2; j = j + 1; }
        if (mod(idiv(n, p), 2) == 1) { mpz_add(fb_c, fb_a, fb_b); mpz_swap(fb_a, fb_b); mpz_swap(fb_b, fb_c); }
        i = i - 1;
    }
    mpz_set(r, fb_a);
}
function mpz_fib2_ui(r, r1, n) {
    mpz_fib_ui(r, n);
    if (n > 0) { mpz_fib_ui(r1, n - 1); } else { mpz_set_si(r1, 1); }
}
function mpz_lucnum_ui(r, n) {
    // L(n) = F(n-1) + F(n+1)
    if (n == 0) { mpz_set_si(r, 2); }
    else { mpz_fib_ui(gmp_t6, n + 1); mpz_fib_ui(r, n - 1); mpz_add(r, r, gmp_t6); }
}

// ---------------- random numbers ----------------
// a state is a seed in RS (Park-Miller, products below 2^47)
let RS = [];
let gmp_rand_default = 0;
function gmp_randinit_default() { RS.push(rand(1, 2147483646)); return RS.length; }
function gmp_randinit_mt() { return gmp_randinit_default(); }
function gmp_randseed_ui(st, seed) { RS[st] = mod(Math.abs(seed), 2147483646) + 1; }
function gmp_randclear(st) { RS[st] = 1; }
function mp_rand_state() {
    if (gmp_rand_default == 0) { gmp_rand_default = gmp_randinit_default(); }
    return gmp_rand_default;
}
// value: the next 31-bit draw of state st
function mp_rand_next(st) {
    let x = mod(RS[st] * 48271, 2147483647);
    RS[st] = x;
    return x;
}
// value: a random limb
function mp_rand_limb(st) { return mod(mp_rand_next(st) * 8 + mod(mp_rand_next(st), 8), BASE); }

// r = a random number in 0 .. 2^bits - 1
function mpz_urandomb(r, st, bits) {
    let nl = idiv(bits, 23) + 2;
    _mpz_realloc(r, nl);
    let k = 0;
    while (k < nl) { M[zP[r] + k] = mp_rand_limb(st); k = k + 1; }
    zN[r] = mpn_normsize(zP[r], nl);
    mpz_set_si(gmp_t9, 1); mpz_mul_2exp(gmp_t9, gmp_t9, bits);
    mpz_mod(r, r, gmp_t9);
}
// r = a random number in 0 .. n - 1
function mpz_urandomm(r, st, n) {
    let nl = Math.abs(zN[n]) + 1;
    mpz_set(gmp_t8, n); zN[gmp_t8] = Math.abs(zN[gmp_t8]);
    _mpz_realloc(r, nl);
    let k = 0;
    while (k < nl) { M[zP[r] + k] = mp_rand_limb(st); k = k + 1; }
    zN[r] = mpn_normsize(zP[r], nl);
    mpz_mod(r, r, gmp_t8);
}
