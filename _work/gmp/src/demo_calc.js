// ============================================================
// demos built on the library: pi (Chudnovsky, binary splitting, as
// GMP's gmp-chudnovsky.c) and Miller-Rabin
// ============================================================
let chP = []; let chQ = []; let chT = [];   // P, Q, T handles per depth
let chN = 0;                                // terms
let ch_w = 0;
let pi_str = '';                            // the digits, "3.14159..."
let pi_t_bs = 0; let pi_t_sqrt = 0; let pi_t_div = 0; let pi_t_str = 0; let pi_t_all = 0;

// P, Q, T of the terms [a, b) into depth d
function chud_bs(a, b, d) {
    while (chP.length < d + 1) { chP.push(mpz_init()); chQ.push(mpz_init()); chT.push(mpz_init()); }
    if (b - a == 1) {
        if (a == 0) { mpz_set_si(chP[d], 1); mpz_set_si(chQ[d], 1); mpz_set_si(chT[d], 13591409); }
        else {
            // P = (6a-5)(2a-1)(6a-1), Q = a^3 * 640320^3 / 24, T = P (13591409 + 545140134 a) (-1)^a
            mpz_set_si(chP[d], 6 * a - 5);
            mpz_mul_si(chP[d], chP[d], 2 * a - 1);
            mpz_mul_si(chP[d], chP[d], 6 * a - 1);
            mpz_set_si(chQ[d], a);
            mpz_mul_si(chQ[d], chQ[d], a);
            mpz_mul_si(chQ[d], chQ[d], a);
            mpz_mul_si(chQ[d], chQ[d], 26680);
            mpz_mul_si(chQ[d], chQ[d], 640320);
            mpz_mul_si(chQ[d], chQ[d], 640320);
            mpz_set_si(ch_w, 545140134);
            mpz_mul_si(ch_w, ch_w, a);
            mpz_add_ui(ch_w, ch_w, 13591409);
            mpz_mul(chT[d], chP[d], ch_w);
            if (mod(a, 2) == 1) { mpz_neg(chT[d], chT[d]); }
        }
    } else {
        let m = idiv(a + b, 2);
        chud_bs(a, m, d + 1);
        mpz_swap(chP[d], chP[d + 1]); mpz_swap(chQ[d], chQ[d + 1]); mpz_swap(chT[d], chT[d + 1]);
        chud_bs(m, b, d + 1);
        // T = Tl Qr + Pl Tr, P = Pl Pr, Q = Ql Qr
        mpz_mul(chT[d], chT[d], chQ[d + 1]);
        mpz_mul(ch_w, chP[d], chT[d + 1]);
        mpz_add(chT[d], chT[d], ch_w);
        if (b < chN) { mpz_mul(chP[d], chP[d], chP[d + 1]); }
        mpz_mul(chQ[d], chQ[d], chQ[d + 1]);
    }
}

// (Entry's timer moves only between frames: a frame passes before each reading)
function mp_clock() { waitSec(0); }

// pi_str = pi to n digits after the point
function pi_compute(n) {
    if (ch_w == 0) { ch_w = mpz_init(); }
    mp_clock();
    let t0 = timer();
    let bits = idiv((n + 20) * 3322, 1000) + 64;
    chN = idiv(n * 1000, 14181) + 2;
    chud_bs(0, chN, 1);
    mp_clock();
    let t1 = timer();
    pi_t_bs = t1 - t0;
    // pi = 426880 sqrt(10005) Q / T
    let fq = mpf_init2(bits); let ft = mpf_init2(bits); let fs = mpf_init2(bits);
    mpf_sqrt_ui(fs, 10005);
    mp_clock();
    let t2 = timer();
    pi_t_sqrt = t2 - t1;
    mpf_set_z(fq, chQ[1]);
    mpf_mul_ui(fq, fq, 426880);
    mpf_mul(fq, fq, fs);
    mpf_set_z(ft, chT[1]);
    mpf_div(fq, fq, ft);
    mp_clock();
    let t3 = timer();
    pi_t_div = t3 - t2;
    let ds = mpf_get_str(10, n + 10, fq);
    while (strlen(ds) < n + 1) { ds = str(ds, '0'); }
    pi_str = str(substr(ds, 1, 1), '.', substr(ds, 2, n + 1));
    mp_clock();
    pi_t_str = timer() - t3;
    pi_t_all = timer() - t0;
    mpf_clear(fq); mpf_clear(ft); mpf_clear(fs);
}
