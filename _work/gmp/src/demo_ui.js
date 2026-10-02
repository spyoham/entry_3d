// ============================================================
// the demo program: a menu, pi, Miller-Rabin, next prime, a calculator
// ============================================================
let ui_text = '엔트리 GMP — GNU MP의 mpz·mpq·mpf를\n엔트리 블록으로';
let RES = [];                 // shown on the stage: the long result, a row at a time
let LOG = [];                 // shown on the stage: what was done and how long it took
let ui_n = 0; let ui_a = 0; let ui_b = 0; let ui_r = 0; let ui_q = 0;

function res_clear() {
    let k = RES.length;
    while (k > 0) { RES.removeAt(k); k = k - 1; }
}
// RES = s cut into rows of w characters
function res_put(s, w) {
    res_clear();
    let n = strlen(s); let i = 1;
    while (i <= n) {
        let e = i + w - 1;
        if (e > n) { e = n; }
        RES.push(substr(s, i, e)); i = i + w;
    }
}
function log_put(s) {
    LOG.insertAt(1, s);
    if (LOG.length > 30) { LOG.removeAt(LOG.length); }
}
// value: t seconds as text, 3 digits
// (a reading is good to about a frame: 1/60 s)
function sec_str(t) { return str(Math.round(t * 100) / 100, '초'); }
// value: s shortened to at most n characters
function short_str(s, n) {
    let r = s;
    if (strlen(s) > n) { r = str(substr(s, 1, n - 20), ' … ', substr(s, strlen(s) - 14, strlen(s)), ' (', strlen(s), '자리)'); }
    return r;
}
// the text box draws ui_text; a frame passes so it shows before a long sum
function ui_busy(s) { ui_text = s; waitSec(0.05); }

function ui_setup() {
    if (ui_n == 0) { ui_n = mpz_init(); ui_a = mpz_init(); ui_b = mpz_init(); ui_r = mpz_init(); ui_q = mpz_init(); }
}

// value: 1 if the answer was read into ui_n: digits, or M<p> for 2^p - 1
function ui_read_num(s) {
    let ok = 1;
    let t = str('#', s);
    if (strlen(t) < 2) { ok = 0; }
    else {
        t = substr(t, 2, strlen(t));
        if (charAt(t, 1) == 'M' || charAt(t, 1) == 'm') {
            if (strlen(t) < 2) { t = 'M0'; }
        let p = substr(t, 2, strlen(t)) * 1;
            if (p < 2 || p > 50000) { ok = 0; }
            else { mpz_ui_pow_ui(ui_n, 2, p); mpz_sub_ui(ui_n, ui_n, 1); }
        } else {
            gmp_errno = 0;
            mpz_set_str(ui_n, t, 10);
            if (gmp_errno != 0) { ok = 0; }
        }
    }
    return ok;
}

function demo_pi() {
    ui_text = '원주율 π\nChudnovsky 공식을 이진 분할로 (GMP의\ngmp-chudnovsky.c와 같은 방법)\n\n몇 자리까지 구할까요? (10 ~ 20000)';
    ask('자릿수?');
    let n = Math.floor(answer() * 1);
    if (n < 10) { n = 10; }
    if (n > 20000) { n = 20000; }
    ui_busy(str('원주율 ', n, '자리 계산 중…\n(Chudnovsky 공식, 이진 분할, mpz + mpf)'));
    pi_compute(n);
    res_put(pi_str, 25);
    ui_text = str('π = ', substr(pi_str, 1, 26), '…\n\n', n, '자리: ', sec_str(pi_t_all),
        '\n · 이진 분할 ', sec_str(pi_t_bs), '\n · √10005 ', sec_str(pi_t_sqrt), '\n · 곱셈·나눗셈 ', sec_str(pi_t_div),
        '\n모든 자리는 [결과] 리스트에');
    log_put(str('π ', n, '자리 ', sec_str(pi_t_all)));
}

// Miller-Rabin, round by round, written with the mpz functions alone
let mr_d = 0; let mr_x = 0; let mr_a = 0; let mr_n1 = 0;
let mr_res = 0;
function demo_mr_rounds(n, rounds) {
    if (mr_d == 0) { mr_d = mpz_init(); mr_x = mpz_init(); mr_a = mpz_init(); mr_n1 = mpz_init(); }
    // n - 1 = d * 2^s
    mpz_sub_ui(mr_n1, n, 1);
    mpz_set(mr_d, mr_n1);
    let s = 0;
    while (mpz_even_p(mr_d) == 1) { mpz_tdiv_q_ui(mr_d, mr_d, 2); s = s + 1; }
    RES.push(str('n-1 = d × 2^', s));
    let st = gmp_randinit_default();
    gmp_randseed_ui(st, 2026);
    let r = 1; let res = 1;
    while (r <= rounds) {
        mp_clock();
        let t0 = timer();
        // the first base is 2, then random ones in 2 .. n-2
        if (r == 1) { mpz_set_si(mr_a, 2); }
        else { mpz_sub_ui(mr_x, n, 3); mpz_urandomm(mr_a, st, mr_x); mpz_add_ui(mr_a, mr_a, 2); }
        mpz_powm(mr_x, mr_a, mr_d, n);
        let pass = 0;
        if (mpz_cmp_ui(mr_x, 1) == 0 || mpz_cmp(mr_x, mr_n1) == 0) { pass = 1; }
        let j = 1;
        while (pass == 0 && j < s) {
            mpz_mul(mr_x, mr_x, mr_x);
            mpz_mod(mr_x, mr_x, n);
            if (mpz_cmp(mr_x, mr_n1) == 0) { pass = 1; }
            if (mpz_cmp_ui(mr_x, 1) == 0) { j = s; }
            j = j + 1;
        }
        let verdict = '통과';
        if (pass == 0) { verdict = '실패 → 합성수'; res = 0; }
        mp_clock();
        RES.push(str(r, '라운드 ', verdict, ' ', sec_str(timer() - t0)));
        RES.push(str('  a = ', short_str(mpz_get_str(10, mr_a), 24)));
        if (pass == 0) { break; }
        r = r + 1;
    }
    mr_res = res;
}

function demo_prime() {
    ui_text = '소수 판정 (밀러-라빈)\nmpz_probab_prime_p(n, 25): GMP처럼\nBPSW(밀러-라빈 + 루카스) 뒤 추가 라운드\n\n수를 입력하세요\n예) 1000000007\n    M127 (= 2^127 - 1), M521, M607';
    ask('수?');
    if (ui_read_num(answer()) == 0) { ui_text = '수를 읽지 못했습니다.'; }
    else {
        if (mpz_cmp_ui(ui_n, 4) < 0) { ui_text = str(mpz_get_str(10, ui_n), ': 작은 수는 바로 판정합니다. → ', mpz_probab_prime_p(ui_n, 25)); }
        else {
            let digits = mpz_sizeinbase(ui_n, 10);
            ui_busy(str(digits, '자리 수를 판정하는 중…'));
            res_clear();
            res_put(str('n = ', mpz_get_str(10, ui_n)), 25);
            let t0 = timer();
            let p = mpz_probab_prime_p(ui_n, 25);
            mp_clock();
            let t1 = timer() - t0;
            let word = '합성수';
            if (p == 1) { word = '아마도 소수 (probably prime)'; }
            if (p == 2) { word = '확실히 소수 (definitely prime)'; }
            RES.push(str('probab_prime_p → ', p, ' ', sec_str(t1)));
            if (mpz_even_p(ui_n) == 0) {
                RES.push('— 밀러-라빈 한 라운드씩 —');
                mp_clock();
                let t2 = timer();
                demo_mr_rounds(ui_n, 5);
                mp_clock();
                t2 = timer() - t2;
                RES.push(str('5라운드: ', sec_str(t2)));
            }
            ui_text = str(digits, '자리 수\n→ ', word, '\n\nmpz_probab_prime_p(n, 25) = ', p, '\n', sec_str(t1), '\n라운드별 과정은 [결과] 리스트에');
            log_put(str('소수 판정 ', digits, '자리 → ', p, ' ', sec_str(t1)));
        }
    }
}

function demo_next() {
    ui_text = '다음 소수 (mpz_nextprime)\n\n이 수보다 큰 첫 소수를 찾습니다\n예) 1000000000000\n    M89 (= 2^89 - 1)';
    ask('수?');
    if (ui_read_num(answer()) == 0) { ui_text = '수를 읽지 못했습니다.'; }
    else {
        ui_busy('다음 소수를 찾는 중…');
        let t0 = timer();
        mpz_nextprime(ui_r, ui_n);
        mp_clock();
        let t1 = timer() - t0;
        mpz_sub(ui_a, ui_r, ui_n);
        res_put(mpz_get_str(10, ui_r), 25);
        ui_text = str('다음 소수 =\n', short_str(mpz_get_str(10, ui_r), 60), '\n\n(입력 + ', mpz_get_str(10, ui_a), ')\n', sec_str(t1));
        log_put(str('다음 소수 ', sec_str(t1)));
    }
}

// a OP b with OP one of + - * / % ^ g(gcd), or n! - the parts split at spaces
function demo_calc() {
    ui_text = '계산기 (mpz)\n띄어쓰기로 나눠 입력:\n  123456789 * 987654321\n  2 ^ 1000      (거듭제곱)\n  1000 !        (팩토리얼)\n연산: + - * / % ^ g(최대공약수) !';
    ask('식?');
    let s = str(answer(), ' ');
    let k = indexOf(s, ' ');
    let ok = 1; let op = '?';
    if (k < 2) { ok = 0; }
    else {
        gmp_errno = 0;
        mpz_set_str(ui_a, substr(s, 1, k - 1), 10);
        let rest = str(substr(s, k, strlen(s)), '  ');
        op = charAt(rest, 2);
        if (op != '!') {
            if (strlen(rest) < 6) { ok = 0; }
            else { mpz_set_str(ui_b, substr(rest, 4, strlen(rest)), 10); }
        }
        if (gmp_errno != 0) { ok = 0; }
    }
    if (ok == 0) { ui_text = '식을 읽지 못했습니다. 예) 2 ^ 1000'; }
    else {
        ui_busy('계산 중…');
        let t0 = timer(); let name = '?';
        if (op == '+') { mpz_add(ui_r, ui_a, ui_b); name = 'mpz_add'; }
        if (op == '-') { mpz_sub(ui_r, ui_a, ui_b); name = 'mpz_sub'; }
        if (op == '*') { mpz_mul(ui_r, ui_a, ui_b); name = 'mpz_mul'; }
        if (op == '/') { mpz_tdiv_qr(ui_r, ui_q, ui_a, ui_b); name = 'mpz_tdiv_qr'; }
        if (op == '%') { mpz_mod(ui_r, ui_a, ui_b); name = 'mpz_mod'; }
        if (op == '^') { mpz_pow_ui(ui_r, ui_a, mpz_get_ui(ui_b)); name = 'mpz_pow_ui'; }
        if (op == 'g') { mpz_gcd(ui_r, ui_a, ui_b); name = 'mpz_gcd'; }
        if (op == '!') { mpz_fac_ui(ui_r, mpz_get_ui(ui_a)); name = 'mpz_fac_ui'; }
        mp_clock();
        let t1 = timer() - t0;
        let rs = mpz_get_str(10, ui_r);
        res_put(rs, 25);
        if (op == '/') { RES.push(str('나머지 ', mpz_get_str(10, ui_q))); }
        ui_text = str(name, '\n→ ', short_str(rs, 70), '\n\n', sec_str(t1), '\n모든 자리는 [결과] 리스트에');
        log_put(str(name, ' ', sec_str(t1)));
    }
}

on('start', 'main', function () {
    timerStart();
    timerHide();
    ui_setup();
    for (;;) {
        ui_text = str(ui_text, '\n[메뉴] 1 π  2 소수 판정  3 다음 소수  4 계산기');
        ask('번호?');
        let c = answer() * 1;
        if (c == 1) { demo_pi(); }
        if (c == 2) { demo_prime(); }
        if (c == 3) { demo_next(); }
        if (c == 4) { demo_calc(); }
    }
});

on('start', 'screen', function () {
    for (;;) { write(ui_text); }
});
