// ============================================================
// internal scratch integers, made by the first mpz_init
// ============================================================
let gmp_ready = 0;
let gmp_t1 = 0; let gmp_t2 = 0; let gmp_t3 = 0; let gmp_t4 = 0; let gmp_t5 = 0;
let gmp_t6 = 0; let gmp_t7 = 0; let gmp_t8 = 0; let gmp_t9 = 0;

function gmp_setup() {
    gmp_ready = 1;
    gmp_t1 = mpz_init(); gmp_t2 = mpz_init(); gmp_t3 = mpz_init(); gmp_t4 = mpz_init(); gmp_t5 = mpz_init();
    gmp_t6 = mpz_init(); gmp_t7 = mpz_init(); gmp_t8 = mpz_init(); gmp_t9 = mpz_init();
    mpf_setup();
}
