// ============================================================
// mpn: limbs. A number is a run of limbs in base 10^7, least significant
// first. mpz/mpf numbers live in the heap list M; the arithmetic works in
// the scratch list S (multiplication tiles, carry passes, division).
// ============================================================
const BASE = 10000000;
const BD = 7;                 // decimal digits in a limb

// playentry keeps at most 5000 items in a list (a push past that drops the
// oldest item): the heap M is a paged list (32 lists M1..M32 of 5000, see
// paged.mjs) and reuses freed blocks; the scratch S stays one plain list of
// at most S_MAX limbs, so every operation is cut to fit in it
const S_MAX = 5000;
let S = [];                   // scratch
let U = [];                   // staging for heap-to-heap copies
let M = paged(32, [S, U]);    // limb heap: M[1..mp_top] in use or in a free block
let mp_top = 0;
let mp_poison = 0;
let FBP = []; let FBN = [];   // free heap blocks: start, length

// value: index of n limbs (in a free block, else on top). When the
// heap is full: gmp_errno = 4 and a place past its end, so the first write
// there stops the program (an Entry list error) instead of overwriting
// other numbers
function mp_alloc(n) {
    // best fit: the smallest free block that holds n
    let p = 0; let i = 1; let b = 0;
    while (i <= FBP.length) {
        if (FBN[i] >= n) { if (b == 0) { b = i; } else { if (FBN[i] < FBN[b]) { b = i; } } }
        i = i + 1;
    }
    if (b > 0) {
        p = FBP[b];
        if (FBN[b] == n) { FBP.removeAt(b); FBN.removeAt(b); }
        else { FBP[b] = p + n; FBN[b] = FBN[b] - n; }
    }
    if (p == 0) {
        p = mp_top + 1;
        if (p + n - 1 > M__CAP) { gmp_errno = 4; p = M__CAP + 1; }
        else {
            mp_top = mp_top + n;
            if (M__len < mp_top) { M__grow(mp_top); }
        }
    }
    // (not cleared: every caller writes what it uses; the tests set
    // mp_poison to fill new blocks with junk and catch any that does not)
    if (mp_poison > 0) { if (p <= M__CAP) { M__fill(p, n, mp_poison); } }
    return p;
}

// give the heap limbs M[p..p+n) back
function mp_free(p, n) {
    if (n > 0) {
        let q = p; let m = n;
        // merge with the free blocks just before and just after
        let i = FBP.length;
        while (i > 0) {
            if (FBP[i] + FBN[i] == q) { q = FBP[i]; m = m + FBN[i]; FBP.removeAt(i); FBN.removeAt(i); }
            else {
                if (FBP[i] == q + m) { m = m + FBN[i]; FBP.removeAt(i); FBN.removeAt(i); }
            }
            i = i - 1;
        }
        if (q + m - 1 == mp_top) {
            mp_top = q - 1;
            // a free block now on top goes too
            i = FBP.length;
            while (i > 0) {
                if (FBP[i] + FBN[i] - 1 == mp_top) { mp_top = FBP[i] - 1; FBP.removeAt(i); FBN.removeAt(i); i = FBP.length; }
                else { i = i - 1; }
            }
        }
        else { FBP.push(q); FBN.push(m); }
    }
}

// make sure S has at least n limbs; gmp_errno = 4 past S_MAX
function mpn_sneed(n) {
    let k = n - S.length;
    if (n > S_MAX) { gmp_errno = 4; k = S_MAX - S.length; }
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
    if (n > 0) { M__toS(d, s, n); }
    if (np > n) { mpn_szero(d + n, np - n); }
}

// M[d..d+n) = S[s..s+n)
function mpn_sstore(d, s, n) {
    if (n > 0) { M__fromS(d, s, n); }
}

// M[d..d+n) = M[s..s+n) (d <= s or no overlap), through U a chunk at a time
function mpn_copyi(d, s, n) {
    let o = 0;
    if (n <= 4) { while (o < n) { M[d + o] = M[s + o]; o = o + 1; } }
    while (o < n) {
        let c = n - o;
        if (c > UH * 2) { c = UH * 2; }
        M__toU(1, s + o, c);
        M__fromU(d + o, 1, c);
        o = o + c;
    }
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

// ---- linear passes over the heap: a chunk of UH limbs at a time is copied
// into U (a page run, a few blocks a limb), worked on there and copied back,
// instead of a page look-up for every limb ----
const UH = 1024;
function mpn_uneed() {
    if (U.length < UH * 2) { for (const _ of rep(UH * 2 - U.length)) { U.push(0); } }
}
// (gmp_setup sizes U once: the passes below do not check)

// M[d..d+n) = M[s..s+n) for d >= s (overlap allowed): chunks from the top
function mpn_copyd(d, s, n) {
    let e = n;
    if (n <= 4) { while (e > 0) { e = e - 1; M[d + e] = M[s + e]; } }
    while (e > 0) {
        let m = e;
        if (m > UH * 2) { m = UH * 2; }
        e = e - m;
        M__toU(1, s + e, m);
        M__fromU(d + e, 1, m);
    }
}

// M[r..) = M[a..a+an) + M[b..b+bn), an >= bn; value: limbs written (an or an+1).
// r may be a or b
function mpn_add(r, a, an, b, bn) {
    let c = 0; let o = 0; let t = 0; let k = 0; let e = 0;
    if (bn <= 4) { while (o < bn) { t = M[a + o] + M[b + o] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } M[r + o] = t; o = o + 1; } }
    while (o < bn) {
        let m = bn - o;
        if (m > UH) { m = UH; }
        M__toU(1, a + o, m);
        M__toU(UH + 1, b + o, m);
        k = 1; e = m + 1;
        while (k < e) { t = U[k] + U[UH + k] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } U[k] = t; k = k + 1; }
        M__fromU(r + o, 1, m);
        o = o + m;
    }
    // the rest of a: the carry runs up (a limb or two), the others are copied
    while (o < an && c > 0) {
        t = M[a + o] + c; c = 0;
        if (t >= BASE) { t = t - BASE; c = 1; }
        M[r + o] = t; o = o + 1;
    }
    if (o < an) { if (r != a) { mpn_copyi(r + o, a + o, an - o); } }
    let n = an;
    if (c > 0) { M[r + an] = c; n = an + 1; }
    return n;
}

// M[r..) = M[a..a+an) - M[b..b+bn), a >= b; value: normalised size
function mpn_sub(r, a, an, b, bn) {
    let c = 0; let o = 0; let t = 0; let k = 0; let e = 0;
    if (bn <= 4) { while (o < bn) { t = M[a + o] - M[b + o] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } M[r + o] = t; o = o + 1; } }
    while (o < bn) {
        let m = bn - o;
        if (m > UH) { m = UH; }
        M__toU(1, a + o, m);
        M__toU(UH + 1, b + o, m);
        k = 1; e = m + 1;
        while (k < e) { t = U[k] - U[UH + k] - c; c = 0; if (t < 0) { t = t + BASE; c = 1; } U[k] = t; k = k + 1; }
        M__fromU(r + o, 1, m);
        o = o + m;
    }
    while (o < an && c > 0) {
        t = M[a + o] - c; c = 0;
        if (t < 0) { t = t + BASE; c = 1; }
        M[r + o] = t; o = o + 1;
    }
    if (o < an) { if (r != a) { mpn_copyi(r + o, a + o, an - o); } }
    return mpn_normsize(r, an);
}

// M[r..r+n) = M[a..a+n) * v + cin (v < BASE); value: the carry out
function mpn_mul_1(r, a, n, v, cin) {
    let c = cin; let o = 0; let t = 0; let k = 0; let e = 0;
    if (n <= 4) { while (o < n) { t = M[a + o] * v + c; c = idiv(t, BASE); M[r + o] = t - c * BASE; o = o + 1; } }
    while (o < n) {
        let m = n - o;
        if (m > UH * 2) { m = UH * 2; }
        M__toU(1, a + o, m);
        k = 1; e = m + 1;
        while (k < e) { t = U[k] * v + c; c = idiv(t, BASE); U[k] = t - c * BASE; k = k + 1; }
        M__fromU(r + o, 1, m);
        o = o + m;
    }
    return c;
}

// M[r..r+n) = M[a..a+n) / d (d < BASE, from the top); value: the remainder
function mpn_divrem_1(r, a, n, d) {
    let rem = 0; let o = n; let t = 0; let q = 0; let k = 0;
    while (o > 0) {
        let m = o;
        if (m > UH * 2) { m = UH * 2; }
        o = o - m;
        M__toU(1, a + o, m);
        k = m;
        while (k >= 1) { t = rem * BASE + U[k]; q = idiv(t, d); rem = t - q * d; U[k] = q; k = k - 1; }
        M__fromU(r + o, 1, m);
    }
    return rem;
}

// value: M[a..a+n) mod d
function mpn_mod_1(a, n, d) {
    let rem = 0; let o = n; let k = 0;
    while (o > 0) {
        let m = o;
        if (m > UH * 2) { m = UH * 2; }
        o = o - m;
        M__toU(1, a + o, m);
        k = m;
        while (k >= 1) { rem = mod(rem * BASE + U[k], d); k = k - 1; }
    }
    return rem;
}
