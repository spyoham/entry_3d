// ============================================================
// mpz: integers. A handle h (1, 2, ...) owns the heap limbs M[zP[h]..]
// (zA[h] of them); zN[h] is GMP's _mp_size: the number of limbs in use,
// negative for a negative number, 0 for zero.
// ============================================================
let zP = [];
let zN = [];
let zA = [];
let zFree = [];
let gmp_errno = 0;            // 1: division by zero, 2: bad string, 3: no inverse
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITSU = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// value: a new integer, 0
function mpz_init() {
    if (gmp_ready == 0) { gmp_setup(); }
    let h = 0;
    if (zFree.length > 0) {
        h = zFree[zFree.length];
        zFree.removeAt(zFree.length);
        zN[h] = 0;
    } else {
        zP.push(mp_alloc(4));
        zN.push(0);
        zA.push(4);
        h = zP.length;
    }
    return h;
}

// value: a new integer with room for n bits
function mpz_init2(bits) {
    let h = mpz_init();
    _mpz_realloc(h, idiv(bits, 23) + 2);
    return h;
}

function mpz_clear(h) {
    zN[h] = 0;
    zFree.push(h);
}

// make room for n limbs (the value is kept)
function _mpz_realloc(h, n) {
    if (zA[h] < n) {
        let na = n + idiv(n, 4) + 4;
        let np = mp_alloc(na);
        mpn_copyi(np, zP[h], Math.abs(zN[h]));
        mp_garbage = mp_garbage + zA[h];
        zP[h] = np;
        zA[h] = na;
    }
}

function mpz_swap(a, b) {
    let t = zP[a]; zP[a] = zP[b]; zP[b] = t;
    t = zN[a]; zN[a] = zN[b]; zN[b] = t;
    t = zA[a]; zA[a] = zA[b]; zA[b] = t;
}

function mpz_set(r, a) {
    if (r != a) {
        let n = Math.abs(zN[a]);
        _mpz_realloc(r, n);
        mpn_copyi(zP[r], zP[a], n);
        zN[r] = zN[a];
    }
}

// n: a whole number up to 2^53 (Entry numbers)
function mpz_set_si(r, v) {
    let n = Math.abs(v);
    _mpz_realloc(r, 3);
    let p = zP[r];
    let k = 0;
    while (n > 0) { M[p + k] = mod(n, BASE); n = idiv(n, BASE); k = k + 1; }
    if (v < 0) { k = 0 - k; }
    zN[r] = k;
}

function mpz_set_ui(r, v) { mpz_set_si(r, Math.abs(v)); }

function mpz_init_set(a) { let h = mpz_init(); mpz_set(h, a); return h; }
function mpz_init_set_ui(v) { let h = mpz_init(); mpz_set_si(h, Math.abs(v)); return h; }
function mpz_init_set_si(v) { let h = mpz_init(); mpz_set_si(h, v); return h; }
function mpz_init_set_str(s, base) { let h = mpz_init(); mpz_set_str(h, s, base); return h; }

// value: the number (exact below 2^53)
function mpz_get_si(a) {
    let n = Math.abs(zN[a]); let p = zP[a]; let v = 0; let k = n - 1;
    while (k >= 0) { v = v * BASE + M[p + k]; k = k - 1; }
    if (zN[a] < 0) { v = 0 - v; }
    return v;
}
function mpz_get_ui(a) { return Math.abs(mpz_get_si(a)); }

// value: the nearest Entry number (top three limbs)
function mpz_get_d(a) {
    let n = Math.abs(zN[a]); let p = zP[a]; let v = 0; let k = n - 1; let e = 0;
    while (k >= 0) {
        if (e < 3) { v = v * BASE + M[p + k]; } else { v = v * BASE; }
        e = e + 1; k = k - 1;
    }
    if (zN[a] < 0) { v = 0 - v; }
    return v;
}

function mpz_neg(r, a) { mpz_set(r, a); zN[r] = 0 - zN[r]; }
function mpz_abs(r, a) { mpz_set(r, a); zN[r] = Math.abs(zN[r]); }

// ---------------- comparison ----------------
function mpz_sgn(a) {
    let s = 0;
    if (zN[a] > 0) { s = 1; }
    if (zN[a] < 0) { s = -1; }
    return s;
}

// value: sign of |a| - |b|
function mpz_cmpabs(a, b) {
    let an = Math.abs(zN[a]); let bn = Math.abs(zN[b]); let r = 0;
    if (an != bn) { r = 1; if (an < bn) { r = -1; } }
    else { r = mpn_cmp(zP[a], zP[b], an); }
    return r;
}

// value: sign of a - b
function mpz_cmp(a, b) {
    let r = 0;
    if (zN[a] != zN[b]) { r = 1; if (zN[a] < zN[b]) { r = -1; } }
    else { r = mpn_cmp(zP[a], zP[b], Math.abs(zN[a])); if (zN[a] < 0) { r = 0 - r; } }
    return r;
}

function mpz_cmp_si(a, v) { mpz_set_si(gmp_t9, v); return mpz_cmp(a, gmp_t9); }
function mpz_cmp_ui(a, v) { mpz_set_si(gmp_t9, Math.abs(v)); return mpz_cmp(a, gmp_t9); }
function mpz_cmpabs_ui(a, v) { mpz_set_si(gmp_t9, Math.abs(v)); return mpz_cmpabs(a, gmp_t9); }

function mpz_odd_p(a) {
    let r = 0;
    if (zN[a] != 0) { r = mod(M[zP[a]], 2); }
    return r;
}
function mpz_even_p(a) { return 1 - mpz_odd_p(a); }

// ---------------- add / sub ----------------
// r = a + b, the sizes signed as given (bs flipped for a subtraction)
function mpz_aors(r, a, as, b, bs) {
    let an = Math.abs(as); let bn = Math.abs(bs);
    let x = a; let xs = as; let y = b; let ys = bs;
    let big = 1;
    if (an < bn) { big = 0; }
    if (an == bn) { if (mpn_cmp(zP[a], zP[b], an) < 0) { big = 0; } }
    if (big == 0) { x = b; xs = bs; y = a; ys = as; let t = an; an = bn; bn = t; }
    let n = 0;
    if (bn == 0) {
        mpz_set(r, x); zN[r] = xs;
    } else {
        let same = 0;
        if (xs > 0) { if (ys > 0) { same = 1; } } else { if (ys < 0) { same = 1; } }
        if (same == 1) {
            _mpz_realloc(r, an + 1);
            n = mpn_add(zP[r], zP[x], an, zP[y], bn);
        } else {
            _mpz_realloc(r, an);
            n = mpn_sub(zP[r], zP[x], an, zP[y], bn);
        }
        if (xs < 0) { n = 0 - n; }
        zN[r] = n;
    }
}

function mpz_add(r, a, b) { mpz_aors(r, a, zN[a], b, zN[b]); }
function mpz_sub(r, a, b) { mpz_aors(r, a, zN[a], b, 0 - zN[b]); }
function mpz_add_ui(r, a, v) { mpz_set_si(gmp_t9, Math.abs(v)); mpz_aors(r, a, zN[a], gmp_t9, zN[gmp_t9]); }
function mpz_sub_ui(r, a, v) { mpz_set_si(gmp_t9, Math.abs(v)); mpz_aors(r, a, zN[a], gmp_t9, 0 - zN[gmp_t9]); }
function mpz_ui_sub(r, v, a) { mpz_set_si(gmp_t9, Math.abs(v)); mpz_aors(r, gmp_t9, zN[gmp_t9], a, 0 - zN[a]); }

// ---------------- multiplication ----------------
// r = |a| * v, 0 <= v < BASE (the sign is the caller's)
function mpz_mul_small(r, a, v) {
    let an = Math.abs(zN[a]);
    if (an == 0 || v == 0) { zN[r] = 0; }
    else {
        _mpz_realloc(r, an + 1);
        let c = mpn_mul_1(zP[r], zP[a], an, v, 0);
        if (c > 0) { M[zP[r] + an] = c; an = an + 1; }
        zN[r] = an;
    }
}

function mpz_mul_si(r, a, v) {
    let neg = 0;
    if (zN[a] < 0) { neg = 1; }
    if (v < 0) { neg = 1 - neg; }
    if (Math.abs(v) < BASE) { mpz_mul_small(r, a, Math.abs(v)); }
    else { mpz_set_si(gmp_t9, Math.abs(v)); zN[r] = zN[a]; mpz_mul(r, a, gmp_t9); zN[r] = Math.abs(zN[r]); }
    if (neg == 1) { zN[r] = 0 - zN[r]; }
}
function mpz_mul_ui(r, a, v) { mpz_mul_si(r, a, Math.abs(v)); }

// r = a * b
function mpz_mul(r, a, b) {
    let an = Math.abs(zN[a]); let bn = Math.abs(zN[b]);
    let neg = 0;
    if (zN[a] < 0) { neg = 1; }
    if (zN[b] < 0) { neg = 1 - neg; }
    if (an == 0 || bn == 0) { zN[r] = 0; }
    else {
        if (a == b) { mpz_sqr_abs(r, a); }
        else {
            let x = a; let y = b;
            if (an < bn) { x = b; y = a; let t = an; an = bn; bn = t; }
            if (bn == 1) { mpz_mul_small(r, x, M[zP[y]]); }
            else { mpz_mul_abs(r, x, an, y, bn); }
        }
        if (neg == 1) { zN[r] = 0 - zN[r]; }
    }
}

// r = |x| * |y|, xn >= yn >= 2
function mpz_mul_abs(r, x, xn, y, yn) {
    let n = 0;
    if (yn >= KARA_MIN) {
        n = mpn_kmul(x, xn, y, yn);
    } else {
        let t = mpn_tile(yn);
        let xp = idiv(xn + t - 1, t) * t; let yp = idiv(yn + t - 1, t) * t;
        let sa = 1; let sb = 1 + xp; let sr = sb + yp;
        mpn_sneed(sr + xp + yp + 2);
        mpn_sload(sa, zP[x], xn, xp);
        mpn_sload(sb, zP[y], yn, yp);
        mpn_smul(sr, sa, xp, sb, yp, t);
        n = xn + yn;
        if (S[sr + n - 1] == 0) { n = n - 1; }
        gmp_sres = sr;
    }
    _mpz_realloc(r, n);
    mpn_sstore(zP[r], gmp_sres, n);
    zN[r] = n;
}

// r = a^2 (positive)
function mpz_sqr_abs(r, a) {
    let an = Math.abs(zN[a]); let n = 0;
    if (an == 1) { let v = M[zP[a]]; mpz_set_si(r, v * v); }
    else {
        if (an >= KARA_SQR_MIN) {
            n = mpn_ksqr(a, an);
        } else {
            let t = mpn_tile(an);
            let ap = idiv(an + t - 1, t) * t;
            let sr = 1 + ap;
            mpn_sneed(sr + ap * 2 + 2);
            mpn_sload(1, zP[a], an, ap);
            mpn_ssqr(sr, 1, ap, t);
            n = an * 2;
            if (S[sr + n - 1] == 0) { n = n - 1; }
            gmp_sres = sr;
        }
        _mpz_realloc(r, n);
        mpn_sstore(zP[r], gmp_sres, n);
        zN[r] = n;
    }
}

function mpz_addmul(r, a, b) { mpz_mul(gmp_t8, a, b); mpz_add(r, r, gmp_t8); }
function mpz_submul(r, a, b) { mpz_mul(gmp_t8, a, b); mpz_sub(r, r, gmp_t8); }
function mpz_addmul_ui(r, a, v) { mpz_mul_ui(gmp_t8, a, v); mpz_add(r, r, gmp_t8); }
function mpz_submul_ui(r, a, v) { mpz_mul_ui(gmp_t8, a, v); mpz_sub(r, r, gmp_t8); }

// r = a * 2^k
function mpz_mul_2exp(r, a, k) {
    mpz_set(r, a);
    let neg = 0;
    if (zN[r] < 0) { neg = 1; }
    zN[r] = Math.abs(zN[r]);
    let e = k;
    while (e >= 20) { mpz_mul_small(r, r, 1048576); e = e - 20; }
    let m = 1;
    while (e > 0) { m = m * 2; e = e - 1; }
    if (m > 1) { mpz_mul_small(r, r, m); }
    if (neg == 1) { zN[r] = 0 - zN[r]; }
}

// ---------------- division ----------------
// Knuth's algorithm D on the scratch list: S[u..u+nn] (nn+1 limbs, the top
// one may be 0) by S[v..v+dn), dn >= 2, the top limb of v >= BASE/2. The
// quotient goes to S[q..q+nn-dn], the remainder stays in S[u..u+dn).
function mpn_sdivrem(u, nn, v, dn, q) {
    let vt = S[v + dn - 1]; let vs = S[v + dn - 2];
    let j = nn - dn;
    let num = 0; let qh = 0; let rh = 0; let go = 0; let c = 0; let k = 0; let t = 0; let uj = 0;
    while (j >= 0) {
        uj = u + j;
        num = S[uj + dn] * BASE + S[uj + dn - 1];
        qh = idiv(num, vt); rh = num - qh * vt;
        go = 1;
        while (go == 1) {
            go = 0;
            if (qh >= BASE) { go = 1; } else { if (qh * vs > rh * BASE + S[uj + dn - 2]) { go = 1; } }
            if (go == 1) { qh = qh - 1; rh = rh + vt; if (rh >= BASE) { go = 0; } }
        }
        if (qh > 0) {
            c = 0; k = 0;
            while (k < dn) { t = S[uj + k] - qh * S[v + k] + c; c = idiv(t, BASE); S[uj + k] = t - c * BASE; k = k + 1; }
            t = S[uj + dn] + c; S[uj + dn] = t;
            if (t < 0) {
                qh = qh - 1; c = 0; k = 0;
                while (k < dn) { t = S[uj + k] + S[v + k] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } S[uj + k] = t; k = k + 1; }
                S[uj + dn] = S[uj + dn] + c;
            }
        }
        S[q + j] = qh;
        j = j - 1;
    }
}

// q = |n| / |d|, r = |n| mod |d| (either may be 0: not wanted); d != 0
function mpz_divrem_abs(q, r, n, d) {
    let nn = Math.abs(zN[n]); let dn = Math.abs(zN[d]);
    let small = 0;
    if (nn < dn) { small = 1; }
    if (nn == dn) { if (mpn_cmp(zP[n], zP[d], nn) < 0) { small = 1; } }
    if (small == 1) {
        if (r > 0) { mpz_set(r, n); zN[r] = nn; }
        if (q > 0) { zN[q] = 0; }
    } else {
        if (dn == 1) {
            let dv = M[zP[d]];
            let rem = 0;
            if (q > 0) {
                _mpz_realloc(q, nn);
                rem = mpn_divrem_1(zP[q], zP[n], nn, dv);
                zN[q] = mpn_normsize(zP[q], nn);
            } else { rem = mpn_mod_1(zP[n], nn, dv); }
            if (r > 0) { mpz_set_si(r, rem); }
        } else {
            mpn_sneed(nn * 2 + dn + 8);
            // normalise: the divisor's top limb >= BASE/2
            let f = idiv(BASE, M[zP[d] + dn - 1] + 1);
            let su = 1; let sv = nn + 3; let sq = sv + dn + 1;
            mpn_sload(su, zP[n], nn, nn + 1);
            mpn_sload(sv, zP[d], dn, dn);
            if (f > 1) { mpn_smul_1(su, nn + 1, f); mpn_smul_1(sv, dn, f); }
            mpn_sdivrem(su, nn, sv, dn, sq);
            let qn = nn - dn + 1;
            if (q > 0) {
                _mpz_realloc(q, qn);
                mpn_sstore(zP[q], sq, qn);
                zN[q] = mpn_normsize(zP[q], qn);
            }
            if (r > 0) {
                if (f > 1) { mpn_sdivrem_1(su, dn, f); }
                _mpz_realloc(r, dn);
                mpn_sstore(zP[r], su, dn);
                zN[r] = mpn_normsize(zP[r], dn);
            }
        }
    }
}

// S[p..p+n) *= v in place (the carry out is dropped: the caller left room)
function mpn_smul_1(p, n, v) {
    let c = 0; let k = p; let e = p + n; let t = 0;
    while (k < e) { t = S[k] * v + c; c = idiv(t, BASE); S[k] = t - c * BASE; k = k + 1; }
}

// S[p..p+n) /= d in place
function mpn_sdivrem_1(p, n, d) {
    let rem = 0; let k = p + n - 1; let t = 0; let qq = 0;
    while (k >= p) { t = rem * BASE + S[k]; qq = idiv(t, d); rem = t - qq * d; S[k] = qq; k = k - 1; }
}

// the three roundings; kind 0 truncate, 1 floor, 2 ceiling
function mpz_div_any(q, r, n, d, kind) {
    if (zN[d] == 0) { gmp_errno = 1; }
    else {
        let ns = zN[n]; let ds = zN[d];
        // the divisor may be q or r: keep a copy
        mpz_set(gmp_t7, d);
        let wantr = r;
        if (kind > 0) { if (wantr == 0) { wantr = gmp_t6; } }
        if (wantr == q) { wantr = gmp_t6; }
        mpz_divrem_abs(q, wantr, n, gmp_t7);
        let qneg = 0;
        if (ns < 0) { qneg = 1; }
        if (ds < 0) { qneg = 1 - qneg; }
        if (q > 0) { if (qneg == 1) { zN[q] = 0 - zN[q]; } }
        if (wantr > 0) { if (ns < 0) { zN[wantr] = 0 - zN[wantr]; } }
        if (kind > 0) {
            if (zN[wantr] != 0) {
                let adj = 0;
                if (kind == 1) { if (qneg == 1) { adj = -1; } }
                if (kind == 2) { if (qneg == 0) { adj = 1; } }
                if (adj != 0) {
                    if (q > 0) { mpz_set_si(gmp_t9, adj); mpz_add(q, q, gmp_t9); }
                    if (adj < 0) { mpz_add(wantr, wantr, gmp_t7); } else { mpz_sub(wantr, wantr, gmp_t7); }
                }
            }
            if (r > 0) { if (r != wantr) { mpz_set(r, wantr); } }
        } else {
            if (r > 0) { if (r != wantr) { mpz_set(r, wantr); } }
        }
    }
}

function mpz_tdiv_q(q, n, d) { mpz_div_any(q, 0, n, d, 0); }
function mpz_tdiv_r(r, n, d) { mpz_div_any(0, r, n, d, 0); }
function mpz_tdiv_qr(q, r, n, d) { mpz_div_any(q, r, n, d, 0); }
function mpz_fdiv_q(q, n, d) { mpz_div_any(q, 0, n, d, 1); }
function mpz_fdiv_r(r, n, d) { mpz_div_any(0, r, n, d, 1); }
function mpz_fdiv_qr(q, r, n, d) { mpz_div_any(q, r, n, d, 1); }
function mpz_cdiv_q(q, n, d) { mpz_div_any(q, 0, n, d, 2); }
function mpz_cdiv_r(r, n, d) { mpz_div_any(0, r, n, d, 2); }
function mpz_cdiv_qr(q, r, n, d) { mpz_div_any(q, r, n, d, 2); }
function mpz_divexact(q, n, d) { mpz_div_any(q, 0, n, d, 0); }

// r = n mod |d|, 0 <= r < |d|
function mpz_mod(r, n, d) {
    mpz_set(gmp_t5, d); zN[gmp_t5] = Math.abs(zN[gmp_t5]);
    mpz_div_any(0, r, n, gmp_t5, 1);
}

// the _ui forms: d a whole number > 0 up to 2^53
function mpz_tdiv_q_ui(q, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, 0, n, gmp_t4, 0); }
function mpz_tdiv_r_ui(r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(0, r, n, gmp_t4, 0); }
function mpz_tdiv_qr_ui(q, r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, r, n, gmp_t4, 0); }
function mpz_fdiv_q_ui(q, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, 0, n, gmp_t4, 1); }
function mpz_fdiv_r_ui(r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(0, r, n, gmp_t4, 1); }
function mpz_fdiv_qr_ui(q, r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, r, n, gmp_t4, 1); }
function mpz_cdiv_q_ui(q, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, 0, n, gmp_t4, 2); }
function mpz_cdiv_r_ui(r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(0, r, n, gmp_t4, 2); }
function mpz_cdiv_qr_ui(q, r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, r, n, gmp_t4, 2); }
function mpz_mod_ui(r, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(0, r, n, gmp_t4, 1); }
function mpz_divexact_ui(q, n, v) { mpz_set_si(gmp_t4, Math.abs(v)); mpz_div_any(q, 0, n, gmp_t4, 0); }

// value: |n| mod v (0 <= v < 2^53), the remainder of a truncating division
function mpz_tdiv_ui(n, v) {
    let r = 0;
    if (v < 900000000) { r = mpn_mod_1(zP[n], Math.abs(zN[n]), v); }
    else { mpz_set_si(gmp_t4, v); mpz_divrem_abs(0, gmp_t3, n, gmp_t4); r = mpz_get_si(gmp_t3); }
    return r;
}
// value: n mod v in 0..v-1
function mpz_fdiv_ui(n, v) {
    let r = mpz_tdiv_ui(n, v);
    if (zN[n] < 0) { if (r > 0) { r = v - r; } }
    return r;
}
function mpz_cdiv_ui(n, v) {
    let r = mpz_tdiv_ui(n, v);
    if (zN[n] > 0) { if (r > 0) { r = v - r; } }
    return r;
}
function mpz_divisible_ui_p(n, v) {
    let r = 0;
    if (mpz_tdiv_ui(n, v) == 0) { r = 1; }
    return r;
}
function mpz_divisible_p(n, d) {
    let r = 0;
    if (zN[d] == 0) { if (zN[n] == 0) { r = 1; } }
    else { mpz_divrem_abs(0, gmp_t3, n, d); if (zN[gmp_t3] == 0) { r = 1; } }
    return r;
}
function mpz_congruent_p(a, c, d) {
    mpz_sub(gmp_t2, a, c);
    return mpz_divisible_p(gmp_t2, d);
}

// ---------------- strings ----------------
// value: the digits of a in base 2..62 (a minus sign in front)
function mpz_get_str(base, a) {
    let n = Math.abs(zN[a]); let p = zP[a];
    let s = '';
    if (n == 0) { s = '0'; }
    else {
        if (base == 10) {
            s = str(M[p + n - 1]);
            let k = n - 2;
            while (k >= 0) { s = str(s, substr(str(BASE + M[p + k]), 2, 8)); k = k - 1; }
        } else {
            let b = Math.abs(base);
            let digs = DIGITS;
            if (base < 0 || b > 36) { digs = DIGITSU; }
            // chunks of c digits: b^c < BASE
            let c = 1; let bc = b;
            while (bc * b < BASE) { bc = bc * b; c = c + 1; }
            // (a local never holds '': Entry reads it back as 0)
            s = '#';
            mpz_set(gmp_t3, a); zN[gmp_t3] = n;
            let q = zP[gmp_t3];
            while (n > 0) {
                let rem = mpn_divrem_1(q, q, n, bc);
                n = mpn_normsize(q, n);
                let k = 0;
                while (k < c) {
                    if (n > 0 || rem > 0) { s = str(charAt(digs, mod(rem, b) + 1), s); }
                    rem = idiv(rem, b); k = k + 1;
                }
            }
            s = substr(s, 1, strlen(s) - 1);
        }
        if (zN[a] < 0) { s = str('-', s); }
    }
    return s;
}

// value: digits in base (exact for powers of 2 and 10, else at most 1 too big, as GMP)
function mpz_sizeinbase(a, base) {
    let n = Math.abs(zN[a]); let r = 1;
    if (n > 0) {
        if (base == 10) { r = (n - 1) * BD + strlen(str(M[zP[a] + n - 1])); }
        else {
            let bits = (n - 1) * 23.253496664211536 + Math.log(M[zP[a] + n - 1] + 1) / Math.log(2);
            r = Math.floor(bits * Math.log(2) / Math.log(base)) + 1;
            if (base == 2) { mpz_set(gmp_t3, a); r = mpz_bits_exact(gmp_t3); }
        }
    }
    return r;
}

// value: bits in |t| (t is destroyed)
function mpz_bits_exact(t) {
    let n = Math.abs(zN[t]); let p = zP[t]; let bits = 0;
    zN[t] = n;
    while (n > 1) { let vz = mpn_divrem_1(p, p, n, 1048576); n = mpn_normsize(p, n); bits = bits + 20; }
    let v = M[p];
    while (v > 0) { v = idiv(v, 2); bits = bits + 1; }
    return bits;
}

// r = the number in s (base 2..62; 0: a 0x / 0b / 0 prefix decides; spaces
// are skipped); gmp_errno 2 when s holds no number
function mpz_set_str(r, s, base) {
    let len = strlen(s); let i = 1; let neg = 0;
    // (a character is compared after a '#': Entry turns ' ' and '0' alike into 0)
    while (i <= len) { if (str('#', charAt(s, i)) != '# ') { break; } i = i + 1; }
    if (i <= len) { if (charAt(s, i) == '-') { neg = 1; i = i + 1; } }
    let b = base;
    let c0 = '#';
    if (i <= len) { c0 = str('#', charAt(s, i)); }
    if (b == 0) {
        b = 10;
        if (c0 == '#0') {
            b = 8; i = i + 1;
            if (i <= len) {
                let x = charAt(s, i);
                if (x == 'x' || x == 'X') { b = 16; i = i + 1; }
                if (x == 'b' || x == 'B') { b = 2; i = i + 1; }
            }
            if (i > len) { i = i - 1; b = 10; }
        }
    }
    // the digits, spaces dropped, after a '#' (a local never holds '')
    let ds = '#';
    let ok = 1;
    let digs = DIGITS;
    if (b > 36) { digs = DIGITSU; }
    let k = i;
    while (k <= len) {
        let x = charAt(s, k);
        if (str('#', x) != '# ') {
            let d = indexOf(digs, x) - 1;
            if (b <= 36) { if (d >= 36) { d = d - 26; } }
            if (d < 0 || d >= b) { ok = 0; break; }
            ds = str(ds, x);
        }
        k = k + 1;
    }
    let n = strlen(ds) - 1;
    if (n == 0) { ok = 0; }
    if (ok == 0) { gmp_errno = 2; }
    else {
        if (b == 10) {
            let nl = idiv(n + BD - 1, BD);
            _mpz_realloc(r, nl);
            let p = zP[r]; let e = n + 1; let j = 0;
            while (e > 1) {
                let st = e - BD + 1;
                if (st < 2) { st = 2; }
                M[p + j] = substr(ds, st, e) * 1;
                e = st - 1; j = j + 1;
            }
            zN[r] = mpn_normsize(p, nl);
        } else {
            let c = 1; let bc = b;
            while (bc * b < BASE) { bc = bc * b; c = c + 1; }
            let nl = idiv(n, c) + 2;
            _mpz_realloc(r, nl);
            let p = zP[r]; let sz = 0; let j = 2;
            while (j <= n + 1) {
                let v = 0; let m = 1; let t = 0;
                while (t < c && j <= n + 1) {
                    let d = indexOf(digs, charAt(ds, j)) - 1;
                    if (b <= 36) { if (d >= 36) { d = d - 26; } }
                    v = v * b + d; m = m * b; t = t + 1; j = j + 1;
                }
                let cy = mpn_mul_1(p, p, sz, m, v);
                if (cy > 0) { M[p + sz] = cy; sz = sz + 1; }
            }
            zN[r] = sz;
        }
        if (neg == 1) { zN[r] = 0 - zN[r]; }
    }
}
