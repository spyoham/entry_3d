// ============================================================
// mpf: floating point. A handle f has a mantissa (an mpz handle fM[f])
// and an exponent fE[f] in limbs: the value is mantissa * BASE^fE.
// fR[f] is the precision in limbs; results keep at most fR + 1 limbs
// (cut toward zero, as GMP).
// ============================================================
let fM = [];
let fE = [];
let fR = [];
let fFree = [];
let mpf_prec_default = 64;    // bits
let mpf_exp = 0;              // the exponent mpf_get_str hands back

// value: limbs for a precision of bits
function mp_prec_limbs(bits) {
    let n = idiv(bits * 3 + 68, 69);   // 23.25 bits a limb, rounded up
    return n + 1;
}

function mpf_set_default_prec(bits) { mpf_prec_default = bits; }
function mpf_get_default_prec() { return mpf_prec_default; }

// value: a new float, 0, with the default precision
function mpf_init() { return mpf_init2(mpf_prec_default); }
function mpf_init2(bits) {
    let h = 0;
    if (fFree.length > 0) { h = fFree[fFree.length]; fFree.removeAt(fFree.length); }
    else { fM.push(mpz_init()); fE.push(0); fR.push(0); h = fM.length; }
    zN[fM[h]] = 0; fE[h] = 0; fR[h] = mp_prec_limbs(bits);
    return h;
}
function mpf_clear(f) { fFree.push(f); }
function mpf_set_prec(f, bits) { fR[f] = mp_prec_limbs(bits); mpf_round(f); }
function mpf_set_prec_raw(f, bits) { fR[f] = mp_prec_limbs(bits); }
function mpf_get_prec(f) { return idiv((fR[f] - 1) * 69, 3); }

// keep at most prec + 1 limbs (drop low limbs, toward zero)
function mpf_round(f) {
    let z = fM[f];
    let n = Math.abs(zN[z]);
    let keep = fR[f] + 1;
    if (n > keep) {
        let d = n - keep;
        mpn_copyi(zP[z], zP[z] + d, keep);
        if (zN[z] < 0) { zN[z] = 0 - keep; } else { zN[z] = keep; }
        fE[f] = fE[f] + d;
    }
    // no zero limbs at the bottom
    n = Math.abs(zN[z]);
    if (n == 0) { fE[f] = 0; }
    else {
        let p = zP[z]; let k = 0;
        while (M[p + k] == 0) { k = k + 1; }
        if (k > 0) {
            mpn_copyi(p, p + k, n - k);
            if (zN[z] > 0) { zN[z] = n - k; } else { zN[z] = k - n; }
            fE[f] = fE[f] + k;
        }
    }
}

function mpf_swap(a, b) {
    let t = fM[a]; fM[a] = fM[b]; fM[b] = t;
    t = fE[a]; fE[a] = fE[b]; fE[b] = t;
    t = fR[a]; fR[a] = fR[b]; fR[b] = t;
}

function mpf_set(r, a) {
    if (r != a) { mpz_set(fM[r], fM[a]); fE[r] = fE[a]; mpf_round(r); }
}
function mpf_set_z(r, z) { mpz_set(fM[r], z); fE[r] = 0; mpf_round(r); }
function mpf_set_si(r, v) { mpz_set_si(fM[r], v); fE[r] = 0; mpf_round(r); }
function mpf_set_ui(r, v) { mpz_set_si(fM[r], Math.abs(v)); fE[r] = 0; mpf_round(r); }
// an Entry number (decimals too): through its 17 significant digits
function mpf_set_d(r, v) { mpf_set_str(r, str(v), 10); }
function mpf_set_q(r, q) {
    fR[mpf_tq] = Math.abs(zN[qN[q]]) + 1; fR[mpf_tq2] = Math.abs(zN[qD[q]]) + 1;
    mpf_set_z(mpf_tq, qN[q]);
    mpf_set_z(mpf_tq2, qD[q]);
    mpf_div(r, mpf_tq, mpf_tq2);
}
function mpf_init_set(a) { let h = mpf_init(); mpf_set(h, a); return h; }
function mpf_init_set_ui(v) { let h = mpf_init(); mpf_set_ui(h, v); return h; }
function mpf_init_set_si(v) { let h = mpf_init(); mpf_set_si(h, v); return h; }
function mpf_init_set_d(v) { let h = mpf_init(); mpf_set_d(h, v); return h; }
function mpf_init_set_str(s, base) { let h = mpf_init(); mpf_set_str(h, s, base); return h; }

// z = the mantissa of f scaled to exponent lo: floor(|f| / BASE^lo) with f's sign
function mpf_load(z, f, lo) {
    let m = fM[f]; let n = Math.abs(zN[m]); let e = fE[f];
    if (n == 0) { zN[z] = 0; }
    else {
        if (e >= lo) {
            let s = e - lo;
            _mpz_realloc(z, n + s);
            let p = zP[z];
            // (z may be m itself: copy from the top)
            let k = n - 1;
            while (k >= 0) { M[p + s + k] = M[zP[m] + k]; k = k - 1; }
            k = 0;
            while (k < s) { M[p + k] = 0; k = k + 1; }
            if (zN[m] < 0) { zN[z] = 0 - n - s; } else { zN[z] = n + s; }
        } else {
            let d = lo - e;
            if (d >= n) { zN[z] = 0; }
            else {
                _mpz_realloc(z, n - d);
                mpn_copyi(zP[z], zP[m] + d, n - d);
                if (zN[m] < 0) { zN[z] = 0 - n + d; } else { zN[z] = n - d; }
            }
        }
    }
}

// value: the limb position just above f's top limb (BASE^top > |f|)
function mpf_top(f) { return fE[f] + Math.abs(zN[fM[f]]); }

// r = a + b (sb flips b's sign: -1 for a subtraction)
function mpf_aors(r, a, b, sb) {
    let za = fM[a]; let zb = fM[b];
    if (zN[zb] == 0) { mpf_set(r, a); }
    else {
        if (zN[za] == 0) { mpf_set(r, b); zN[fM[r]] = zN[fM[r]] * sb; }
        else {
            let lo = fE[a];
            if (fE[b] < lo) { lo = fE[b]; }
            let top = mpf_top(a);
            if (mpf_top(b) > top) { top = mpf_top(b); }
            if (top - fR[r] - 2 > lo) { lo = top - fR[r] - 2; }
            mpf_load(mpf_ta, a, lo);
            mpf_load(mpf_tb, b, lo);
            zN[mpf_tb] = zN[mpf_tb] * sb;
            mpz_add(fM[r], mpf_ta, mpf_tb);
            fE[r] = lo;
            mpf_round(r);
        }
    }
}
function mpf_add(r, a, b) { mpf_aors(r, a, b, 1); }
function mpf_sub(r, a, b) { mpf_aors(r, a, b, -1); }
function mpf_add_ui(r, a, v) { mpf_set_ui(mpf_tc, v); fR[mpf_tc] = fR[r]; mpf_aors(r, a, mpf_tc, 1); }
function mpf_sub_ui(r, a, v) { mpf_set_ui(mpf_tc, v); fR[mpf_tc] = fR[r]; mpf_aors(r, a, mpf_tc, -1); }
function mpf_ui_sub(r, v, a) { mpf_set_ui(mpf_tc, v); fR[mpf_tc] = fR[r]; mpf_aors(r, mpf_tc, a, -1); }

function mpf_mul(r, a, b) {
    mpz_mul(fM[r], fM[a], fM[b]);
    fE[r] = fE[a] + fE[b];
    mpf_round(r);
}
function mpf_mul_ui(r, a, v) {
    mpz_mul_ui(fM[r], fM[a], v);
    fE[r] = fE[a];
    mpf_round(r);
}

// r = a / b: a quotient of prec + 1 limbs or a little more
function mpf_div(r, a, b) {
    if (zN[fM[b]] == 0) { gmp_errno = 1; }
    else {
        if (zN[fM[a]] == 0) { zN[fM[r]] = 0; fE[r] = 0; }
        else {
            if (fR[r] >= MPF_NEWTON_MIN && Math.abs(zN[fM[b]]) > 2) { mpf_div_newton(r, a, b); }
            else { mpf_div_school(r, a, b); }
        }
    }
}
function mpf_div_school(r, a, b) {
    let na = Math.abs(zN[fM[a]]); let nb = Math.abs(zN[fM[b]]);
    let k = fR[r] + 2 + nb - na;
    if (k < 0) { k = 0; }
    let ea = fE[a]; let eb = fE[b];
    mpf_load(mpf_ta, a, ea - k);
    mpz_tdiv_q(fM[r], mpf_ta, fM[b]);
    fE[r] = ea - k - eb;
    mpf_round(r);
}
function mpf_div_ui(r, a, v) { mpf_set_ui(mpf_tc, v); mpf_div(r, a, mpf_tc); }
function mpf_ui_div(r, v, a) { mpf_set_ui(mpf_tc, v); fR[mpf_tc] = fR[r]; mpf_div(r, mpf_tc, a); }

// r = sqrt(a), a >= 0
function mpf_sqrt(r, a) {
    if (zN[fM[a]] <= 0) { zN[fM[r]] = 0; fE[r] = 0; if (zN[fM[a]] < 0) { gmp_errno = 1; } }
    else {
        if (fR[r] >= MPF_SQRT_NEWTON_MIN) { mpf_sqrt_newton(r, a); }
        else { mpf_sqrt_school(r, a); }
    }
}
function mpf_sqrt_school(r, a) {
    let na = zN[fM[a]];
    let j = (fR[r] + 2) * 2 - na;
    if (j < 0) { j = 0; }
    let e = fE[a] - j;
    if (mod(e, 2) != 0) { j = j + 1; e = e - 1; }
    mpf_load(mpf_ta, a, e);
    mpz_sqrt(fM[r], mpf_ta);
    fE[r] = e / 2;
    mpf_round(r);
}
function mpf_sqrt_ui(r, v) { mpf_set_ui(mpf_tc, v); fR[mpf_tc] = fR[r]; mpf_sqrt(r, mpf_tc); }

function mpf_pow_ui(r, a, v) {
    mpf_set(mpf_td, a); fR[mpf_td] = fR[r];
    mpf_set_ui(r, 1);
    let e = v;
    while (e > 0) {
        if (mod(e, 2) == 1) { mpf_mul(r, r, mpf_td); }
        e = idiv(e, 2);
        if (e > 0) { mpf_mul(mpf_td, mpf_td, mpf_td); }
    }
}

function mpf_neg(r, a) { mpf_set(r, a); zN[fM[r]] = 0 - zN[fM[r]]; }
function mpf_abs(r, a) { mpf_set(r, a); zN[fM[r]] = Math.abs(zN[fM[r]]); }

// r = a * 2^k, a / 2^k
function mpf_mul_2exp(r, a, k) {
    mpz_mul_2exp(fM[r], fM[a], k); fE[r] = fE[a]; mpf_round(r);
}
function mpf_div_2exp(r, a, k) {
    fR[mpf_tc] = idiv(k, 23) + 3;
    mpf_set_ui(mpf_tc, 1); mpz_mul_2exp(fM[mpf_tc], fM[mpf_tc], k); mpf_round(mpf_tc);
    mpf_div(r, a, mpf_tc);
}

// ---------------- comparison ----------------
function mpf_sgn(a) { return mpz_sgn(fM[a]); }

// value: sign of a - b
function mpf_cmp(a, b) {
    let sa = mpz_sgn(fM[a]); let sb = mpz_sgn(fM[b]); let r = 0;
    if (sa != sb) { r = 1; if (sa < sb) { r = -1; } }
    else {
        if (sa != 0) {
            let ta = mpf_top(a); let tb = mpf_top(b);
            if (ta != tb) { r = 1; if (ta < tb) { r = -1; } }
            else {
                let na = Math.abs(zN[fM[a]]); let nb = Math.abs(zN[fM[b]]);
                let pa = zP[fM[a]]; let pb = zP[fM[b]];
                let i = 1;
                while (i <= na || i <= nb) {
                    let x = 0; let y = 0;
                    if (i <= na) { x = M[pa + na - i]; }
                    if (i <= nb) { y = M[pb + nb - i]; }
                    if (x != y) { r = 1; if (x < y) { r = -1; } break; }
                    i = i + 1;
                }
            }
            if (sa < 0) { r = 0 - r; }
        }
    }
    return r;
}
function mpf_cmp_si(a, v) { mpf_set_si(mpf_tc, v); return mpf_cmp(a, mpf_tc); }
function mpf_cmp_ui(a, v) { mpf_set_ui(mpf_tc, v); return mpf_cmp(a, mpf_tc); }
function mpf_cmp_d(a, v) { mpf_set_d(mpf_tc, v); return mpf_cmp(a, mpf_tc); }
function mpf_cmp_z(a, z) { mpf_set_z(mpf_tc, z); return mpf_cmp(a, mpf_tc); }

// value: 1 if a and b agree in their first bits bits (GMP's mpf_eq, by limbs)
function mpf_eq(a, b, bits) {
    mpf_sub(mpf_td, a, b);
    let r = 0;
    if (zN[fM[mpf_td]] == 0) { r = 1; }
    else {
        let t = mpf_top(a); if (mpf_top(b) > t) { t = mpf_top(b); }
        if (mpf_top(mpf_td) <= t - mp_prec_limbs(bits) + 1) { r = 1; }
    }
    return r;
}
// r = |a - b| / a
function mpf_reldiff(r, a, b) { mpf_sub(r, a, b); zN[fM[r]] = Math.abs(zN[fM[r]]); mpf_div(r, r, a); }

// ---------------- integer parts ----------------
// kind 0 trunc, 1 floor, 2 ceil
function mpf_int(r, a, kind) {
    mpf_set(r, a);
    if (fE[r] < 0) {
        let frac = 0;
        let n = Math.abs(zN[fM[r]]);
        let d = 0 - fE[r];
        if (d >= n) { frac = 1; zN[fM[r]] = 0; }
        else {
            let k = 0;
            while (k < d) { if (M[zP[fM[r]] + k] != 0) { frac = 1; } k = k + 1; }
            mpf_load(fM[r], r, 0);
        }
        fE[r] = 0;
        if (frac == 1) {
            if (kind == 1) { if (mpz_sgn(fM[a]) < 0) { mpz_sub_ui(fM[r], fM[r], 1); } }
            if (kind == 2) { if (mpz_sgn(fM[a]) > 0) { mpz_add_ui(fM[r], fM[r], 1); } }
        }
        mpf_round(r);
    }
}
function mpf_trunc(r, a) { mpf_int(r, a, 0); }
function mpf_floor(r, a) { mpf_int(r, a, 1); }
function mpf_ceil(r, a) { mpf_int(r, a, 2); }
function mpf_integer_p(a) {
    let r = 1;
    if (fE[a] < 0) { if (zN[fM[a]] != 0) { r = 0; } }
    return r;
}

// ---------------- conversion ----------------
function mpf_get_d(a) {
    let z = fM[a]; let n = Math.abs(zN[z]);
    let v = 0; let k = n - 1; let c = 0;
    while (k >= 0 && c < 3) { v = v * BASE + M[zP[z] + k]; k = k - 1; c = c + 1; }
    let e = fE[a] + k + 1;
    while (e > 0) { v = v * BASE; e = e - 1; }
    while (e < 0) { v = v / BASE; e = e + 1; }
    if (zN[z] < 0) { v = 0 - v; }
    return v;
}
function mpf_get_si(a) { mpf_trunc(mpf_td, a); return mpz_get_si(fM[mpf_td]) * mp_pow_base(fE[mpf_td]); }
function mpf_get_ui(a) { return Math.abs(mpf_get_si(a)); }
function mp_pow_base(e) { let v = 1; let k = 0; while (k < e) { v = v * BASE; k = k + 1; } return v; }
function mpz_set_f(z, f) { mpf_trunc(mpf_td, f); mpf_load(z, mpf_td, 0); }

// value: the significant digits (base 10), mpf_exp set so the number is
// 0.DIGITS * 10^mpf_exp; n digits (0: as many as the precision holds),
// rounded to nearest; a '-' in front when negative
function mpf_get_str(base, n, a) {
    let z = fM[a];
    let s = '0';
    mpf_exp = 0;
    if (zN[z] != 0) {
        let ds = mpz_get_str(10, z);
        let neg = 0;
        if (charAt(ds, 1) == '-') { neg = 1; ds = substr(ds, 2, strlen(ds)); }
        let len = strlen(ds);
        mpf_exp = len + fE[a] * BD;
        let want = n;
        if (want <= 0) { want = idiv(fR[a] * 7 * 1000 + 999, 1000); }
        if (len > want) {
            let up = 0;
            if (charAt(ds, want + 1) * 1 >= 5) { up = 1; }
            ds = substr(ds, 1, want);
            if (up == 1) {
                // add one to the last digit (9s carry)
                let k = want;
                while (k >= 1) { if (charAt(ds, k) != '9') { break; } k = k - 1; }
                if (k == 0) { ds = '1'; mpf_exp = mpf_exp + 1; }
                else {
                    if (k == 1) { ds = str(charAt(ds, 1) * 1 + 1); }
                    else { ds = str(substr(ds, 1, k - 1), charAt(ds, k) * 1 + 1); }
                }
            }
        }
        // trailing zeros off
        len = strlen(ds);
        while (len > 1) { if (charAt(ds, len) != '0') { break; } len = len - 1; }
        s = substr(ds, 1, len);
        if (neg == 1) { s = str('-', s); }
    }
    return s;
}

// r = the number in s: [-]digits[.digits][e|@[-]digits] (base 10)
function mpf_set_str(r, s, base) {
    let len = strlen(s); let i = 1; let neg = 0;
    while (i <= len) { if (str('#', charAt(s, i)) != '# ') { break; } i = i + 1; }
    if (i <= len) { if (charAt(s, i) == '-') { neg = 1; i = i + 1; } }
    if (i <= len) { if (charAt(s, i) == '+') { i = i + 1; } }
    let ds = '#'; let point = 0; let after = 0; let ex = 0; let ok = 1; let nd = 0;
    while (i <= len) {
        let x = charAt(s, i);
        if (x == '.') { if (point == 1) { ok = 0; } point = 1; }
        else {
            if (x == 'e' || x == 'E' || x == '@') { break; }
            if (indexOf('0123456789', x) == 0) { ok = 0; break; }
            ds = str(ds, x); nd = nd + 1;
            if (point == 1) { after = after + 1; }
        }
        i = i + 1;
    }
    if (i <= len) {
        // the exponent
        i = i + 1;
        let en = 0;
        if (i <= len) { if (charAt(s, i) == '-') { en = 1; i = i + 1; } }
        if (i <= len) { if (charAt(s, i) == '+') { i = i + 1; } }
        while (i <= len) { let x = charAt(s, i); if (indexOf('0123456789', x) == 0) { ok = 0; break; } ex = ex * 10 + x * 1; i = i + 1; }
        if (en == 1) { ex = 0 - ex; }
    }
    if (nd == 0) { ok = 0; }
    if (ok == 0) { gmp_errno = 2; }
    else {
        // digits * 10^(ex - after); make the power a multiple of 7
        let e10 = ex - after;
        let t = mod(e10, BD);
        let k = 0;
        while (k < t) { ds = str(ds, '0'); k = k + 1; }
        e10 = e10 - t;
        mpz_set_str(fM[r], substr(ds, 2, strlen(ds)), 10);
        fE[r] = e10 / BD;
        if (neg == 1) { zN[fM[r]] = 0 - zN[fM[r]]; }
        mpf_round(r);
    }
}

let mpf_ta = 0; let mpf_tb = 0; let mpf_tc = 0; let mpf_td = 0; let mpf_tq = 0; let mpf_tq2 = 0;
function mpf_setup() {
    mpf_ta = mpz_init(); mpf_tb = mpz_init();
    mpf_tc = mpf_init2(64); mpf_td = mpf_init2(64); mpf_tq = mpf_init2(64); mpf_tq2 = mpf_init2(64);
}

// ---------------- Newton: division and square root by multiplications ----------------
// (used above MPF_NEWTON_MIN limbs, where a multiplication by Karatsuba is
// cheaper than the schoolbook division's rows)
let MPF_NEWTON_MIN = 120;     // division (measured: even at 150 limbs)
let MPF_SQRT_NEWTON_MIN = 8;  // square root (Newton far ahead from 45 limbs on)
let nw_y = 0; let nw_t = 0; let nw_u = 0; let nw_1 = 0;

// nw_y = a first guess at 1/b (or 1/sqrt(b) when root is 1), two limbs good
function mpf_newton_start(b, root) {
    if (nw_y == 0) { nw_y = mpf_init2(64); nw_t = mpf_init2(64); nw_u = mpf_init2(64); nw_1 = mpf_init2(64); mpf_set_ui(nw_1, 1); }
    let z = fM[b]; let n = Math.abs(zN[z]); let p = zP[z];
    let top = M[p + n - 1];
    let e = fE[b] + n - 1;
    if (n >= 2) { top = top * BASE + M[p + n - 2]; e = e - 1; }
    if (n >= 3) { top = top + M[p + n - 3] / BASE; }
    // b = top * BASE^e
    fR[nw_y] = 3;
    if (root == 0) {
        // 1/b = (BASE^4 / top) * BASE^(-4-e)
        mpz_set_si(fM[nw_y], Math.round(100000000000000000000000000 / top * 100));
        fE[nw_y] = 0 - 4 - e;
        if (zN[z] < 0) { zN[fM[nw_y]] = 0 - zN[fM[nw_y]]; }
    } else {
        // 1/sqrt(b): make e even, then (BASE^2 / sqrt(top)) * BASE^(-2 - e/2)
        if (mod(e, 2) != 0) { top = top * BASE; e = e - 1; }
        mpz_set_si(fM[nw_y], Math.round(100000000000000 / Math.sqrt(top) * BASE));
        fE[nw_y] = 0 - 3 - e / 2;
    }
    mpf_round(nw_y);
}

// r = a / b
function mpf_div_newton(r, a, b) {
    let P = fR[r] + 2;
    mpf_newton_start(b, 0);
    let prec = 2;
    while (prec < P) {
        prec = prec * 2;
        if (prec > P) { prec = P; }
        // y = y + y (1 - b y)
        fR[nw_u] = prec + 1; mpf_set(nw_u, b);
        fR[nw_t] = prec + 1;
        mpf_mul(nw_t, nw_u, nw_y);
        mpf_sub(nw_t, nw_1, nw_t);   // (not mpf_ui_sub: its scratch may be the argument)
        mpf_mul(nw_t, nw_t, nw_y);
        fR[nw_y] = prec;
        mpf_add(nw_y, nw_y, nw_t);
    }
    mpf_mul(r, a, nw_y);
}

// r = sqrt(a), a > 0
function mpf_sqrt_newton(r, a) {
    let P = fR[r] + 2;
    mpf_newton_start(a, 1);
    let prec = 2;
    while (prec < P) {
        prec = prec * 2;
        if (prec > P) { prec = P; }
        // y = y + y (1 - a y^2) / 2
        fR[nw_u] = prec + 1; mpf_set(nw_u, a);
        fR[nw_t] = prec + 1;
        mpf_mul(nw_t, nw_y, nw_y);
        mpf_mul(nw_t, nw_t, nw_u);
        mpf_sub(nw_t, nw_1, nw_t);   // (not mpf_ui_sub: its scratch may be the argument)
        mpf_mul(nw_t, nw_t, nw_y);
        // halve: times 5000000 / BASE (mul_small keeps the sign out: put it back)
        let sg = zN[fM[nw_t]];
        mpz_mul_small(fM[nw_t], fM[nw_t], 5000000);
        if (sg < 0) { zN[fM[nw_t]] = 0 - zN[fM[nw_t]]; }
        fE[nw_t] = fE[nw_t] - 1;
        fR[nw_y] = prec;
        mpf_add(nw_y, nw_y, nw_t);
    }
    fR[nw_u] = P + 1; mpf_set(nw_u, a);
    mpf_mul(r, nw_u, nw_y);
}
