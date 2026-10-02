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
// before a demo: the last one's numbers go, the heap is compacted
function ui_reset() {
    mpz_set_si(ui_n, 0); mpz_set_si(ui_a, 0); mpz_set_si(ui_b, 0); mpz_set_si(ui_r, 0); mpz_set_si(ui_q, 0);
    gmp_errno = 0;
    gmp_trim();
}
const CALC_MAX = 200000;      // the calculator's largest result (digits): the heap holds 160000 limbs

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
    vw_open(str('π = 3.  (', sec_str(pi_t_all), ')'), substr(pi_str, 3, strlen(pi_str)));
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
        let ps = mpz_get_str(10, ui_r);
        if (strlen(ps) > 120) { vw_open('다음 소수', ps); }
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
    // the result's size first: a power or a factorial can outgrow the heap
    let est = 0;
    if (ok == 1) {
        let da = mpz_sizeinbase(ui_a, 10); let db = mpz_sizeinbase(ui_b, 10);
        if (op == '*') { est = da + db; }
        if (op == '^') { if (db > 7) { est = CALC_MAX + 1; } else { est = da * mpz_get_ui(ui_b); } }
        if (op == '!') {
            if (da > 7) { est = CALC_MAX + 1; }
            else { let n = mpz_get_ui(ui_a); if (n > 2) { est = Math.round(n * (Math.log(n) - 1) / Math.log(10)); } }
        }
        if (est > CALC_MAX) { ok = 2; }
    }
    if (ok == 0) { ui_text = '식을 읽지 못했습니다. 예) 2 ^ 1000'; }
    if (ok == 2) { ui_text = str('결과가 너무 큽니다\n(약 ', est, '자리: 계산기는\n', CALC_MAX, '자리까지 됩니다)'); }
    if (ok == 1) {
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
        if (strlen(rs) > 120) { vw_open(str(name, ' 결과'), rs); }
        gmp_trim();
    }
}

// ---------------- the digit viewer: every digit, scrolled ----------------
// a text box over the whole stage: VW_ROWS lines of VW_W digits (groups of
// ten), each line led by the place of its first digit, and a scroll bar of
// characters on the right. The keys, dragging the text or the bar move it.
const VW_W = 50;
const VW_ROWS = 15;
const VW_LH = 15.6;           // line height on the stage (12px font)
const VW_Y0 = 117;            // stage y of the first digit line's middle
const VW_BARX = 160;          // stage x right of the digits: the bar's side
const VW_PAD = '                                                                        ';
let vw_on = 0;                // 1 while the viewer is open
let vw_want = 0;              // a demo left something to view
let vw_text = ' ';
let vw_src = '0';             // the digits
let vw_head = ' ';
let vw_n = 0; let vw_lines = 0; let vw_top = 0;
let vw_ku = 0; let vw_kd = 0; let vw_kpu = 0; let vw_kpd = 0;
let vw_drag = 0; let vw_bar = 0; let vw_my = 0; let vw_mt = 0; let vw_quit = 0;

// open the viewer on the digits s (head: what they are)
function vw_open(head, s) {
    vw_head = head; vw_src = s; vw_n = strlen(s);
    vw_lines = idiv(vw_n + VW_W - 1, VW_W);
    vw_top = 0; vw_drag = 0; vw_quit = 1;
    vw_want = 1;
}

// vw_text = the lines from vw_top on
function vw_render() {
    let maxTop = vw_lines - VW_ROWS;
    if (maxTop < 0) { maxTop = 0; }
    if (vw_top > maxTop) { vw_top = maxTop; }
    if (vw_top < 0) { vw_top = 0; }
    let first = vw_top * VW_W + 1;
    let last = (vw_top + VW_ROWS) * VW_W;
    if (last > vw_n) { last = vw_n; }
    // the bar: a thumb of th lines at tpos
    let th = VW_ROWS; let tpos = 0;
    if (maxTop > 0) {
        th = Math.round(VW_ROWS * VW_ROWS / vw_lines);
        if (th < 1) { th = 1; }
        tpos = Math.round((VW_ROWS - th) * vw_top / maxTop);
    }
    let t = str(vw_head, '   ', first, '~', last, '번째 / ', vw_n, '자리');
    let i = 0;
    while (i < VW_ROWS) {
        let ln = vw_top + i;
        let row = ' ';
        if (ln < vw_lines) {
            let a = ln * VW_W + 1;
            let lab = str('      ', a);
            row = substr(lab, strlen(lab) - 5, strlen(lab));
            let g = 0;
            while (g < 5) {
                let s0 = a + g * 10;
                if (s0 <= vw_n) {
                    let e0 = s0 + 9;
                    if (e0 > vw_n) { e0 = vw_n; }
                    row = str(row, ' ', substr(vw_src, s0, e0));
                }
                g = g + 1;
            }
        }
        // pad out to the bar's column (the digits take 6 + 5 * 11 characters)
        row = substr(str(row, VW_PAD), 1, 68);
        if (i >= tpos && i < tpos + th) { row = str(row, '▓'); } else { row = str(row, '░'); }
        t = str(t, '\n', row);
        i = i + 1;
    }
    vw_text = str(t, '\n', '↑↓ 한 줄  ←→ 한 쪽  Home·End 처음·끝  끌어서 이동  Enter 메뉴');
}

// one frame of the viewer: the keys and the mouse move it; vw_on = 0 to leave
function vw_step() {
    let top = vw_top;
    // up / down: a line now, then every frame while held
    if (key('38')) { vw_ku = vw_ku + 1; if (vw_ku == 1 || vw_ku > 18) { top = top - 1; } } else { vw_ku = 0; }
    if (key('40')) { vw_kd = vw_kd + 1; if (vw_kd == 1 || vw_kd > 18) { top = top + 1; } } else { vw_kd = 0; }
    // a page: left, right, page up, page down (every 6th frame while held)
    if (key('37') || key('33')) { vw_kpu = vw_kpu + 1; if (vw_kpu == 1 || (vw_kpu > 18 && mod(vw_kpu, 6) == 0)) { top = top - VW_ROWS; } } else { vw_kpu = 0; }
    if (key('39') || key('34')) { vw_kpd = vw_kpd + 1; if (vw_kpd == 1 || (vw_kpd > 18 && mod(vw_kpd, 6) == 0)) { top = top + VW_ROWS; } } else { vw_kpd = 0; }
    if (key('36')) { top = 0; }
    if (key('35')) { top = vw_lines; }
    // the mouse: drag the text, or point at the bar
    if (mouseDown()) {
        if (vw_drag == 0) {
            vw_drag = 1; vw_my = mouseY(); vw_mt = vw_top; vw_bar = 0;
            if (mouseX() > VW_BARX) { vw_bar = 1; }
        }
        if (vw_bar == 1) {
            let f = (VW_Y0 - mouseY()) / (VW_LH * (VW_ROWS - 1));
            if (f < 0) { f = 0; }
            if (f > 1) { f = 1; }
            top = Math.round(f * (vw_lines - VW_ROWS));
        } else {
            top = vw_mt + Math.round((mouseY() - vw_my) / VW_LH);
        }
    } else { vw_drag = 0; }
    // Enter or Esc: back to the menu (once the key that opened it is up)
    if (key('13') || key('27')) { if (vw_quit == 0) { vw_on = 0; } } else { vw_quit = 0; }
    if (top != vw_top) { vw_top = top; vw_render(); }
}

on('start', 'main', function () {
    timerStart();
    timerHide();
    ui_setup();
    for (;;) {
        ui_text = str(ui_text, '\n[메뉴] 1 π  2 소수 판정  3 다음 소수  4 계산기');
        ask('번호?');
        let c = answer() * 1;
        vw_want = 0;
        if (c >= 1 && c <= 4) { ui_reset(); }
        if (c == 1) { demo_pi(); }
        if (c == 2) { demo_prime(); }
        if (c == 3) { demo_next(); }
        if (c == 4) { demo_calc(); }
        // a long result: the viewer, a frame at a time, until Enter
        if (vw_want == 1) {
            listHide(RES); listHide(LOG);
            vw_render(); vw_on = 1;
            for (;;) {
                vw_step();
                if (vw_on == 0) { break; }
            }
            vw_text = ' ';
            listShow(RES); listShow(LOG);
        }
    }
});

on('start', 'screen', function () {
    for (;;) { write(ui_text); }
});

on('start', 'viewer', function () {
    hide();
    for (;;) {
        if (vw_on == 1) { show(); toFront(); write(vw_text); }
        else { hide(); }
    }
});
