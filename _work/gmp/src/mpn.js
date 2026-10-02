// ============================================================
// mpn: limbs. A number is a run of limbs in base 10^7, least significant
// first. mpz/mpf numbers live in the heap list M; the arithmetic works in
// the scratch list S (multiplication tiles, carry passes, division).
// ============================================================
const BASE = 10000000;
const BD = 7;                 // decimal digits in a limb

let M = [];                   // limb heap
let S = [];                   // scratch
let mp_garbage = 0;           // heap limbs left behind by reallocations

// value: index of n fresh zero limbs at the end of the heap
function mp_alloc(n) {
    let p = M.length + 1;
    for (const _ of rep(n)) { M.push(0); }
    return p;
}

// make sure S has at least n limbs
function mpn_sneed(n) {
    let k = n - S.length;
    if (k > 0) { for (const _ of rep(k)) { S.push(0); } }
}

// S[p..p+n) = 0
function mpn_szero(p, n) {
    let k = p; let e = p + n - 7;
    while (k < e) { S[k] = 0; S[k + 1] = 0; S[k + 2] = 0; S[k + 3] = 0; S[k + 4] = 0; S[k + 5] = 0; S[k + 6] = 0; S[k + 7] = 0; k = k + 8; }
    e = p + n;
    while (k < e) { S[k] = 0; k = k + 1; }
}

// S[d..d+n) = M[s..s+n), then zeros up to d+np
function mpn_sload(d, s, n, np) {
    let k = 0; let e = n - 3;
    while (k < e) { S[d + k] = M[s + k]; S[d + k + 1] = M[s + k + 1]; S[d + k + 2] = M[s + k + 2]; S[d + k + 3] = M[s + k + 3]; k = k + 4; }
    while (k < n) { S[d + k] = M[s + k]; k = k + 1; }
    while (k < np) { S[d + k] = 0; k = k + 1; }
}

// M[d..d+n) = S[s..s+n)
function mpn_sstore(d, s, n) {
    let k = 0; let e = n - 3;
    while (k < e) { M[d + k] = S[s + k]; M[d + k + 1] = S[s + k + 1]; M[d + k + 2] = S[s + k + 2]; M[d + k + 3] = S[s + k + 3]; k = k + 4; }
    while (k < n) { M[d + k] = S[s + k]; k = k + 1; }
}

// M[d..d+n) = M[s..s+n) (d <= s or no overlap)
function mpn_copyi(d, s, n) {
    let k = 0;
    while (k < n) { M[d + k] = M[s + k]; k = k + 1; }
}

// carry pass over S[p..p+n): every limb into 0..BASE-1 (limbs may be
// negative or up to 2^53), the carry added into S[p+n]. Two statements a
// limb: the quotient into the other carry, the remainder in place (c and d
// take turns, so the old carry is still there for the remainder)
function mpn_snorm(p, n) {
    let c = 0; let d = 0; let k = p; let e = p + n - 3;
    while (k < e) {
        d = idiv(S[k] + c, BASE); S[k] = mod(S[k] + c, BASE);
        c = idiv(S[k + 1] + d, BASE); S[k + 1] = mod(S[k + 1] + d, BASE);
        d = idiv(S[k + 2] + c, BASE); S[k + 2] = mod(S[k + 2] + c, BASE);
        c = idiv(S[k + 3] + d, BASE); S[k + 3] = mod(S[k + 3] + d, BASE);
        k = k + 4;
    }
    e = p + n;
    while (k < e) { d = idiv(S[k] + c, BASE); S[k] = mod(S[k] + c, BASE); c = d; k = k + 1; }
    S[e] = S[e] + c;
}

// the carry pass over the first lim of the n limbs only (the rest is not wanted)
function mpn_snorm_to(p, n, lim) {
    let m = n;
    if (lim < m) { m = lim; }
    if (m > 0) { mpn_snorm(p, m); }
}

// the same, doubling every limb first
function mpn_snorm2(p, n) {
    let c = 0; let d = 0; let k = p; let e = p + n - 1;
    while (k < e) {
        d = idiv(S[k] * 2 + c, BASE); S[k] = mod(S[k] * 2 + c, BASE);
        c = idiv(S[k + 1] * 2 + d, BASE); S[k + 1] = mod(S[k + 1] * 2 + d, BASE);
        k = k + 2;
    }
    e = p + n;
    while (k < e) { d = idiv(S[k] * 2 + c, BASE); S[k] = mod(S[k] * 2 + c, BASE); c = d; k = k + 1; }
    S[e] = S[e] + c;
}

// tile size for n limbs
// tile size for n limbs: the least padded work, a 16-tile product costing
// 31, an 8-tile 39, a 4-tile 60 (measured, ns per limb product / 100)
function mpn_tile(n) {
    let p16 = idiv(n + 15, 16) * 16; let p8 = idiv(n + 7, 8) * 8; let p4 = idiv(n + 3, 4) * 4;
    let t = 16; let best = p16 * p16 * 31;
    if (p8 * p8 * 39 < best) { t = 8; best = p8 * p8 * 39; }
    if (p4 * p4 * 60 < best) { t = 4; }
    return t;
}

// S[r..r+an+bn) = S[a..a+an) * S[b..b+bn), both padded with zeros to a
// multiple of the tile (an, bn are the padded lengths)
function mpn_smul(r, a, an, b, bn, t) {
    if (t == 16) { mpn_mul_grid16(r, a, an, b, bn); }
    if (t == 8) { mpn_mul_grid8(r, a, an, b, bn); }
    if (t == 4) { mpn_mul_grid4(r, a, an, b, bn); }
}

function mpn_ssqr(r, a, n, t) {
    if (t == 16) { mpn_sqr_grid16(r, a, n); }
    if (t == 8) { mpn_sqr_grid8(r, a, n); }
    if (t == 4) { mpn_sqr_grid4(r, a, n); }
}

// value: limbs in S[p..p+n) without the zero limbs on top
function mpn_snormsize(p, n) {
    let k = p + n - 1;
    while (k >= p) { if (S[k] != 0) { break; } k = k - 1; }
    return k - p + 1;
}

// value: limbs in M[p..p+n) without the zero limbs on top
function mpn_normsize(p, n) {
    let k = p + n - 1;
    while (k >= p) { if (M[k] != 0) { break; } k = k - 1; }
    return k - p + 1;
}

// value: sign of M[a..a+n) - M[b..b+n)
function mpn_cmp(a, b, n) {
    let k = n - 1; let r = 0;
    while (k >= 0) {
        if (M[a + k] != M[b + k]) { r = 1; if (M[a + k] < M[b + k]) { r = -1; } break; }
        k = k - 1;
    }
    return r;
}

// M[r..) = M[a..a+an) + M[b..b+bn), an >= bn; value: limbs written (an or an+1)
function mpn_add(r, a, an, b, bn) {
    let c = 0; let k = 0; let t = 0;
    while (k < bn) { t = M[a + k] + M[b + k] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } M[r + k] = t; k = k + 1; }
    while (k < an) { t = M[a + k] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } M[r + k] = t; k = k + 1; }
    let n = an;
    if (c > 0) { M[r + an] = c; n = an + 1; }
    return n;
}

// M[r..) = M[a..a+an) - M[b..b+bn), a >= b; value: normalised size
function mpn_sub(r, a, an, b, bn) {
    let c = 0; let k = 0; let t = 0;
    while (k < bn) { t = M[a + k] - M[b + k] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } M[r + k] = t; k = k + 1; }
    while (k < an) { t = M[a + k] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } M[r + k] = t; k = k + 1; }
    return mpn_normsize(r, an);
}

// M[r..r+n) = M[a..a+n) * v + cin (v < BASE); value: the carry out
function mpn_mul_1(r, a, n, v, cin) {
    let c = cin; let k = 0; let t = 0;
    while (k < n) { t = M[a + k] * v + c; c = idiv(t, BASE); M[r + k] = t - c * BASE; k = k + 1; }
    return c;
}

// M[r..r+n) = M[a..a+n) / d (d < BASE, from the top); value: the remainder
function mpn_divrem_1(r, a, n, d) {
    let rem = 0; let k = n - 1; let t = 0; let q = 0;
    while (k >= 0) { t = rem * BASE + M[a + k]; q = idiv(t, d); rem = t - q * d; M[r + k] = q; k = k - 1; }
    return rem;
}

// value: M[a..a+n) mod d
function mpn_mod_1(a, n, d) {
    let rem = 0; let k = n - 1;
    while (k >= 0) { rem = mod(rem * BASE + M[a + k], d); k = k - 1; }
    return rem;
}
