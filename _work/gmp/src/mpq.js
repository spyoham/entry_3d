// ============================================================
// mpq: rationals. A handle q owns two integers: qN[q] / qD[q], kept in
// lowest terms with a positive denominator (after mpq_canonicalize, as GMP).
// ============================================================
let qN = [];
let qD = [];
let qFree = [];
let mpq_t1 = 0; let mpq_t2 = 0; let mpq_t3 = 0; let mpq_t4 = 0;

function mpq_init() {
    if (mpq_t1 == 0) { mpq_t1 = 1; mpq_t1 = mpz_init(); mpq_t2 = mpz_init(); mpq_t3 = mpz_init(); mpq_t4 = mpz_init(); }
    let h = 0;
    if (qFree.length > 0) { h = qFree[qFree.length]; qFree.removeAt(qFree.length); }
    else { qN.push(mpz_init()); qD.push(mpz_init()); h = qN.length; }
    zN[qN[h]] = 0; mpz_set_si(qD[h], 1);
    return h;
}
function mpq_clear(q) { qFree.push(q); }

// value: the numerator / denominator integers themselves (GMP's mpq_numref)
function mpq_numref(q) { return qN[q]; }
function mpq_denref(q) { return qD[q]; }

function mpq_canonicalize(q) {
    if (zN[qD[q]] == 0) { gmp_errno = 1; }
    else {
        if (zN[qD[q]] < 0) { zN[qD[q]] = 0 - zN[qD[q]]; zN[qN[q]] = 0 - zN[qN[q]]; }
        if (zN[qN[q]] == 0) { mpz_set_si(qD[q], 1); }
        else {
            mpz_gcd(mpq_t1, qN[q], qD[q]);
            if (mpz_cmp_si(mpq_t1, 1) != 0) {
                mpz_divexact(qN[q], qN[q], mpq_t1);
                mpz_divexact(qD[q], qD[q], mpq_t1);
            }
        }
    }
}

function mpq_set(r, a) { mpz_set(qN[r], qN[a]); mpz_set(qD[r], qD[a]); }
function mpq_set_z(r, z) { mpz_set(qN[r], z); mpz_set_si(qD[r], 1); }
function mpq_set_si(r, n, d) { mpz_set_si(qN[r], n); mpz_set_si(qD[r], d); mpq_canonicalize(r); }
function mpq_set_ui(r, n, d) { mpz_set_si(qN[r], Math.abs(n)); mpz_set_si(qD[r], Math.abs(d)); mpq_canonicalize(r); }
function mpq_set_num(r, z) { mpz_set(qN[r], z); }
function mpq_set_den(r, z) { mpz_set(qD[r], z); }
function mpq_get_num(z, q) { mpz_set(z, qN[q]); }
function mpq_get_den(z, q) { mpz_set(z, qD[q]); }
function mpq_swap(a, b) {
    let t = qN[a]; qN[a] = qN[b]; qN[b] = t;
    t = qD[a]; qD[a] = qD[b]; qD[b] = t;
}
// r = f exactly
function mpq_set_f(r, f) {
    mpz_set(qN[r], fM[f]);
    mpz_set_si(qD[r], 1);
    let e = fE[f];
    while (e > 0) { mpz_mul_small(qN[r], qN[r], BASE); if (zN[fM[f]] < 0) { zN[qN[r]] = 0 - Math.abs(zN[qN[r]]); } e = e - 1; }
    while (e < 0) { mpz_mul_small(qD[r], qD[r], BASE); e = e + 1; }
    mpq_canonicalize(r);
}
// an Entry number (decimals too)
function mpq_set_d(r, v) {
    mpf_set_d(mpf_td, v);
    mpq_set_f(r, mpf_td);
}

// "a/b" or "a" in base 2..62
function mpq_set_str(r, s, base) {
    let k = indexOf(s, '/');
    if (k < 2 || k >= strlen(s)) { mpz_set_str(qN[r], s, base); mpz_set_si(qD[r], 1); }
    else {
        mpz_set_str(qN[r], substr(s, 1, k - 1), base);
        mpz_set_str(qD[r], substr(s, k + 1, strlen(s)), base);
    }
}
function mpq_get_str(base, q) {
    let s = mpz_get_str(base, qN[q]);
    if (mpz_cmp_si(qD[q], 1) != 0) { s = str(s, '/', mpz_get_str(base, qD[q])); }
    return s;
}
function mpq_get_d(q) {
    mpf_set_q(mpf_td, q);
    return mpf_get_d(mpf_td);
}

// r = a/b + c/d = (ad + cb) / bd, s: -1 for a subtraction
function mpq_aors(r, a, b, s) {
    mpz_mul(mpq_t1, qN[a], qD[b]);
    mpz_mul(mpq_t2, qN[b], qD[a]);
    if (s < 0) { zN[mpq_t2] = 0 - zN[mpq_t2]; }
    mpz_mul(mpq_t3, qD[a], qD[b]);
    mpz_add(qN[r], mpq_t1, mpq_t2);
    mpz_swap(qD[r], mpq_t3);
    mpq_canonicalize(r);
}
function mpq_add(r, a, b) { mpq_aors(r, a, b, 1); }
function mpq_sub(r, a, b) { mpq_aors(r, a, b, -1); }
function mpq_mul(r, a, b) {
    mpz_mul(mpq_t1, qN[a], qN[b]);
    mpz_mul(mpq_t3, qD[a], qD[b]);
    mpz_swap(qN[r], mpq_t1);
    mpz_swap(qD[r], mpq_t3);
    mpq_canonicalize(r);
}
function mpq_div(r, a, b) {
    if (zN[qN[b]] == 0) { gmp_errno = 1; }
    else {
        mpz_mul(mpq_t1, qN[a], qD[b]);
        mpz_mul(mpq_t3, qD[a], qN[b]);
        mpz_swap(qN[r], mpq_t1);
        mpz_swap(qD[r], mpq_t3);
        mpq_canonicalize(r);
    }
}
function mpq_neg(r, a) { mpq_set(r, a); zN[qN[r]] = 0 - zN[qN[r]]; }
function mpq_abs(r, a) { mpq_set(r, a); zN[qN[r]] = Math.abs(zN[qN[r]]); }
function mpq_inv(r, a) {
    if (zN[qN[a]] == 0) { gmp_errno = 1; }
    else {
        mpq_set(r, a);
        mpz_swap(qN[r], qD[r]);
        if (zN[qD[r]] < 0) { zN[qD[r]] = 0 - zN[qD[r]]; zN[qN[r]] = 0 - zN[qN[r]]; }
    }
}
function mpq_mul_2exp(r, a, k) { mpq_set(r, a); mpz_mul_2exp(qN[r], qN[r], k); mpq_canonicalize(r); }
function mpq_div_2exp(r, a, k) { mpq_set(r, a); mpz_mul_2exp(qD[r], qD[r], k); mpq_canonicalize(r); }

function mpq_sgn(q) { return mpz_sgn(qN[q]); }
// value: sign of a - b
function mpq_cmp(a, b) {
    mpz_mul(mpq_t1, qN[a], qD[b]);
    mpz_mul(mpq_t2, qN[b], qD[a]);
    return mpz_cmp(mpq_t1, mpq_t2);
}
function mpq_cmp_si(a, n, d) {
    mpz_set_si(mpq_t4, d);
    mpz_mul(mpq_t1, qN[a], mpq_t4);
    mpz_set_si(mpq_t4, n);
    mpz_mul(mpq_t2, mpq_t4, qD[a]);
    let r = mpz_cmp(mpq_t1, mpq_t2);
    if (d < 0) { r = 0 - r; }
    return r;
}
function mpq_cmp_ui(a, n, d) { return mpq_cmp_si(a, Math.abs(n), Math.abs(d)); }
function mpq_cmp_z(a, z) {
    mpz_mul(mpq_t2, z, qD[a]);
    return mpz_cmp(qN[a], mpq_t2);
}
function mpq_equal(a, b) {
    let r = 0;
    if (mpz_cmp(qN[a], qN[b]) == 0) { if (mpz_cmp(qD[a], qD[b]) == 0) { r = 1; } }
    return r;
}
