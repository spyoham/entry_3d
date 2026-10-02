// ============================================================
// internal scratch integers, made by the first mpz_init
// ============================================================
let gmp_ready = 0;
let gmp_t1 = 0; let gmp_t2 = 0; let gmp_t3 = 0; let gmp_t4 = 0; let gmp_t5 = 0;
let gmp_t6 = 0; let gmp_t7 = 0; let gmp_t8 = 0; let gmp_t9 = 0;
let gmp_tm = 0;                // mpz_mul_big's accumulator

function gmp_setup() {
    gmp_ready = 1;
    mpn_uneed();
    gmp_t1 = mpz_init(); gmp_t2 = mpz_init(); gmp_t3 = mpz_init(); gmp_t4 = mpz_init(); gmp_t5 = mpz_init();
    gmp_t6 = mpz_init(); gmp_t7 = mpz_init(); gmp_t8 = mpz_init(); gmp_t9 = mpz_init();
    gmp_tm = mpz_init();
    mpf_setup();
}

// zero h when it was made (a library scratch number)
function gmp_zero(h) { if (h > 0) { zN[h] = 0; } }

// give the heap back: the library's scratch numbers are cleared and every
// number keeps only the limbs it uses (values are kept). Call it after a
// big computation (the demos do after each one)
function gmp_trim() {
    gmp_zero(gmp_t1); gmp_zero(gmp_t2); gmp_zero(gmp_t3); gmp_zero(gmp_t4); gmp_zero(gmp_t5);
    gmp_zero(gmp_t6); gmp_zero(gmp_t7); gmp_zero(gmp_t8); gmp_zero(gmp_t9); gmp_zero(gmp_tm);
    gmp_zero(mpf_ta); gmp_zero(mpf_tb);
    if (mpf_tc > 0) { gmp_zero(fM[mpf_tc]); gmp_zero(fM[mpf_td]); gmp_zero(fM[mpf_tq]); gmp_zero(fM[mpf_tq2]); }
    if (nw_y > 0) { gmp_zero(fM[nw_y]); gmp_zero(fM[nw_t]); gmp_zero(fM[nw_u]); }
    if (dv_a > 0) { gmp_zero(fM[dv_a]); gmp_zero(fM[dv_b]); gmp_zero(fM[dv_c]); }
    gmp_zero(dv_q); gmp_zero(dv_r); gmp_zero(dv_d);
    gmp_zero(bmu); gmp_zero(bmod); gmp_zero(lc_d); gmp_zero(pw_x);
    gmp_zero(gx_q); gmp_zero(gx_r0); gmp_zero(gx_r1); gmp_zero(gx_s0); gmp_zero(gx_s1); gmp_zero(gx_t0); gmp_zero(gx_t1); gmp_zero(gx_w);
    gmp_zero(sq_n); gmp_zero(sq_x); gmp_zero(sq_y); gmp_zero(sq_q);
    gmp_zero(rt_x); gmp_zero(rt_y); gmp_zero(rt_p);
    gmp_zero(pp_n); gmp_zero(pp_d); gmp_zero(pp_a); gmp_zero(pp_n1); gmp_zero(pp_x);
    gmp_zero(fb_a); gmp_zero(fb_b); gmp_zero(fb_c);
    gmp_zero(mpq_t1); gmp_zero(mpq_t2); gmp_zero(mpq_t3); gmp_zero(mpq_t4);
    let i = 1;
    while (i <= PRL.length) { gmp_zero(PRL[i]); i = i + 1; }
    i = 1;
    while (i <= zP.length) { mpz_shrink(i); i = i + 1; }
    gmp_compact();
}

// slide every block down to the bottom of the heap, in address order (no
// holes left; only between operations: nothing else may hold a position)
let HO = [];                  // handles in address order
function gmp_compact() {
    let k = HO.length;
    while (k > 0) { HO.removeAt(k); k = k - 1; }
    // insertion sort of the handles by address
    let h = 1;
    while (h <= zP.length) {
        let j = HO.length;
        while (j > 0) { if (zP[HO[j]] < zP[h]) { break; } j = j - 1; }
        HO.insertAt(j + 1, h);
        h = h + 1;
    }
    let dst = 1; let i = 1;
    while (i <= HO.length) {
        h = HO[i];
        if (zP[h] != dst) { mpn_copyi(dst, zP[h], zA[h]); zP[h] = dst; }
        dst = dst + zA[h];
        i = i + 1;
    }
    mp_top = dst - 1;
    k = FBP.length;
    while (k > 0) { FBP.removeAt(k); FBN.removeAt(k); k = k - 1; }
}

// compact when the holes take more than an eighth of the heap
function gmp_compact_if() {
    let f = 0; let i = 1;
    while (i <= FBN.length) { f = f + FBN[i]; i = i + 1; }
    if (f * 8 > mp_top) { gmp_compact(); }
}
