// The candidates. Every one keeps the reference's shape: a value function of one parameter.
const sqn = (n, e) => (n ? ['op', 'square', sqn(n - 1, e)] : e);
const T = (t) => ({ t });
const L = 2.302585092994046;

// the reference (playentry.org/community/tips/68e24f40bd99ffbfb7b0681d): 10^k (1 + r/128)^128, three Newton steps
const newton = ['*', '$y', ['+', '1', ['-', 'x', ['op', 'ln', '$y']]]];
export const ref = {
    name: 'ref', locals: ['y'],
    body: [
        ['y', ['op', 'round', ['*', 'x', '0.43429448190325182765']]],
        ['y', ['*', ['cat', T('1e'), '$y'], sqn(7, ['+', '1', ['/', ['-', 'x', ['*', '$y', '2.302585092994045684']], '128']])]],
        ['y', newton], ['y', newton],
    ],
    ret: newton,
};

// n and r by the quotient and remainder blocks (plain doubles, no BigNumber),
// (1 + (r - L/2)/N)^N sqrt(10) by squaring, the power of ten glued on as text, one Newton step
export function d6(m = 26, name = 'd6') {
    const N = 2 ** m;
    // b = (r - C1) * C2,  b^N = e^(r - L/2) * sqrt(10)
    const C1 = L / 2 - N, C2 = Math.exp(L / (2 * N)) / N;
    const r = ['mod', 'x', String(L)], n = ['quot', 'x', String(L)];
    return {
        name, locals: ['y'],
        body: [['y', ['cat', ['cat', sqn(m, ['*', ['-', r, String(C1)], String(C2)]), T('e')], n]]],
        ret: ['*', '$y', ['-', '1', ['-', ['op', 'ln', '$y'], 'x']]],
    };
}

// ---- the ladder ----
// 10^(j/256) is eight square roots of the text "1e" + j: a table of 256 with no list.
// What is left, s in [0, g), g = L/256, goes into b = (s - C1) * C2, b^N = e^s (N = 2^m, off by at most h^2/4N).
const rtn = (n, e) => (n ? ['op', 'root', rtn(n - 1, e)] : e);
function ladder(m) {
    const N = 2 ** m, g = L / 256, h = g / 2;
    return { g, C1: h - N, C2: Math.exp(h / N + h * h / (4 * N * N)) / N };
}
// fast: quotient and remainder of the plain constant, one Newton step against x itself
export function fast(m = 10, name = 'fast') {
    const { g, C1, C2 } = ladder(m);
    const J = ['quot', 'x', String(g)];
    return {
        name, locals: ['y'],
        body: [['y', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', J, '256']]), sqn(m, ['*', ['-', ['mod', 'x', String(g)], String(C1)], String(C2)])], T('e')], ['quot', J, '256']]]],
        ret: ['-', '$y', ['*', '$y', ['-', ['op', 'ln', '$y'], 'x']]],
    };
}
// exact: L1 is ln 10 cut to 22 bits, so the remainder block gives x - n L1 with no rounding at all;
// r = that - n (ln 10 - L1) is then good to the last bit however large x is. The Newton step is
// against r, and the power of ten comes last (so 0 and Infinity come out where they should).
export const L1 = Math.round(L * 2 ** 20) / 2 ** 20;
export function exact(m = 10, name = 'exact') {
    const { g, C1, C2 } = ladder(m);
    const D = 4.44861721465267991e-7;   // ln 10 - L1
    const n = ['quot', 'x', String(L1)];
    return {
        name, locals: ['r', 'y'],
        body: [
            ['r', ['-', ['mod', 'x', String(L1)], ['*', n, String(D)]]],
            ['y', ['*', rtn(8, ['cat', T('1e'), ['quot', '$r', String(g)]]), sqn(m, ['*', ['-', ['mod', '$r', String(g)], String(C1)], String(C2)])]],
        ],
        ret: ['op', 'abs', ['cat', ['cat', ['*', '$y', ['-', '1', ['-', ['op', 'ln', '$y'], '$r']]], T('e')], n]],
    };
}

// ---- the ladder twice over ----
// The mantissa of a number may itself be glued in front of the "e": root^8(M + "e" + j) = M^(1/256) 10^(j/256).
// With M = root^8("1e" + j2) that is 10^(j1/256 + j2/65536) for sixteen roots and not one multiplication.
// What is left, s in [0, G), G = L/65536 = 3.5e-5, is the factor 1 + s (short of e^s by less than 6.2e-10).
export const G = L / 65536;
const lad2 = (J, inner = (j2) => rtn(8, ['cat', T('1e'), j2])) =>
    rtn(8, ['cat', ['cat', inner(['mod', J, '256']), T('e')], ['mod', ['quot', J, '256'], '256']]);
// y - y (ln y - x): the Newton step with nothing but MINUS (a PLUS would glue the text "1.5e3" on as text)
const polish = (y, x) => ['-', y, ['*', y, ['-', ['op', 'ln', y], x]]];
export function fast2(name = 'fast2', inner) {
    return {
        name, locals: ['y'],
        body: [
            ['y', ['quot', 'x', String(G)]],
            ['y', ['cat', ['cat', ['*', lad2('$y', inner), ['-', ['mod', 'x', String(G)], '-1']], T('e')], ['quot', '$y', '65536']]],
        ],
        ret: polish('$y', 'x'),
    };
}
// the same with the inner ladder read from a list of 256 (the place "1" + j: no addition for the index)
export const tbl1 = () => fast2('tbl1', (j2) => ['idx', 'E10', ['cat', T('1'), j2]]);
export function tables() {
    const E10 = Array(1255).fill(0);
    for (let j = 0; j < 256; j++) E10[Number('1' + j) - 1] = 10 ** (j / 256);
    return { E10 };
}
// exact: n and r1 = x - n L1 by the quotient and remainder of L1 (ln 10 cut to 22 bits: no rounding at all),
// r = r1 - n (ln 10 - L1), the Newton step against r, the power of ten last
export const DL = 4.44861721465267991e-7;   // ln 10 - L1
export function exact2(name = 'exact2') {
    const n = ['quot', 'x', String(L1)];
    return {
        name, locals: ['r', 'y'],
        body: [
            ['r', ['-', ['mod', 'x', String(L1)], ['*', n, String(DL)]]],
            ['y', ['quot', '$r', String(G)]],
            ['y', ['*', lad2('$y'), ['-', ['mod', '$r', String(G)], '-1']]],
        ],
        ret: ['op', 'abs', ['cat', ['cat', polish('$y', '$r'), T('e')], n]],
    };
}

// ---- exact, the short way ----
// G1 = L1/256 has 22 bits, so J = floor(x / G1) and s1 = x - J G1 come out of the quotient and remainder
// blocks with no rounding at all: x = J G1 + s1, e^x = 10^(J/256) e^s, s = s1 - J (ln 10 - L1)/256.
// s is at most 0.009 and good to 1e-18. e^s by ten squarings and one Newton step against s (ln of a
// number next to 1 loses nothing), times the ladder, the power of ten glued on last.
export const G1 = L1 / 256;
export function exactN(m = 10, name = 'exactN') {
    const N = 2 ** m, h = G1 / 2;
    const C1 = h - N, C2 = Math.exp(h / N + h * h / (4 * N * N)) / N;
    const J = ['quot', 'x', String(G1)];
    return {
        name, locals: ['s', 'y'],
        body: [
            ['s', ['-', ['mod', 'x', String(G1)], ['*', J, String(DL / 256)]]],
            ['y', sqn(m, ['*', ['-', '$s', String(C1)], String(C2)])],
        ],
        ret: ['op', 'abs', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', J, '256']]), polish('$y', '$s')], T('e')], ['quot', J, '256']]],
    };
}

// variants of fast, to weigh
// q: the scaling of b by a quotient and a glued "e-15" instead of a multiplication
export function fastq(m = 10, name = 'fastq') {
    const { g, C1, C2 } = ladderK(m);
    const J = ['quot', 'x', String(g)];
    const b = ['cat', ['-', ['quot', ['mod', 'x', String(g)], String(1e-15 / C2)], String(Math.round(C1 * C2 * 1e15))], T('e-15')];
    return { name, locals: ['y'],
        body: [['y', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', J, '256']]), sqn(m, b)], T('e')], ['quot', J, '256']]]],
        ret: polish('$y', 'x') };
}
// j: J kept in the local first
export function fastj(m = 10, name = 'fastj') {
    const { g, C1, C2 } = ladderK(m);
    return { name, locals: ['y'],
        body: [['y', ['quot', 'x', String(g)]],
            ['y', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', '$y', '256']]), sqn(m, ['*', ['-', ['mod', 'x', String(g)], String(C1)], String(C2)])], T('e')], ['quot', '$y', '256']]]],
        ret: polish('$y', 'x') };
}
function ladderK(m) { const N = 2 ** m, g = L / 256, h = g / 2; return { g, C1: h - N, C2: Math.exp(h / N + h * h / (4 * N * N)) / N }; }

// ---- the tangent ----
// tan(45 deg + t) = e^(2t + (4/3) t^3 + ...) (t in radians): no square term, and tan 45 is 1 on the dot.
// So tan(45 + r K)^(2^q), K = (90/pi) / 2^q degrees, is e^r but for r^3 / (6 4^q) - and a hair off K
// (a = U^2 / (8 4^q) for r in [0, U]) spreads that to a quarter, either side.
const tanK = (q, U) => (90 / Math.PI) / 2 ** q * (1 - U * U / (8 * 4 ** q));
const tang = (q, r, U) => sqn(q, ['op', 'tan', ['-', ['*', r, String(tanK(q, U))], '-45']]);
// fastT: n and r by the quotient and remainder of ln 10, the mantissa by the tangent squared q times,
// the power of ten glued on as text, one Newton step against x
export function fastT(q = 13, name = 'fastT') {
    return {
        name, locals: ['y'],
        body: [['y', ['cat', ['cat', tang(q, ['mod', 'x', String(L)], L), T('e')], ['quot', 'x', String(L)]]]],
        ret: polish('$y', 'x'),
    };
}
// exactT: as exactN (x = J G1 + s1 without rounding, s = s1 - J (ln 10 - L1)/256, the ladder for 10^(J/256)),
// e^s by the tangent squared once
export function exactT(q = 1, name = 'exactT') {
    const J = ['quot', 'x', String(G1)];
    return {
        name, locals: ['s', 'y'],
        body: [
            ['s', ['-', ['mod', 'x', String(G1)], ['*', J, String(DL / 256)]]],
            ['y', tang(q, '$s', G1)],
        ],
        ret: ['op', 'abs', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', J, '256']]), polish('$y', '$s')], T('e')], ['quot', J, '256']]],
    };
}
// exactR: no ladder - r = (x mod L1) - n (ln 10 - L1), the tangent, the Newton step against r
export function exactR(q = 13, name = 'exactR') {
    const n = ['quot', 'x', String(L1)];
    return {
        name, locals: ['r', 'y'],
        body: [
            ['r', ['-', ['mod', 'x', String(L1)], ['*', n, String(DL)]]],
            ['y', tang(q, '$r', L1)],
        ],
        ret: ['op', 'abs', ['cat', ['cat', polish('$y', '$r'), T('e')], n]],
    };
}
// fastTq: the angle scaled by a quotient and a glued "e-13" instead of a multiplication (to weigh)
export function fastTq(q = 13, name = 'fastTq') {
    const ang = ['cat', ['-', ['quot', ['mod', 'x', String(L)], String(1e-13 / tanK(q, L))], '-450000000000000'], T('e-13')];
    return { name, locals: ['y'],
        body: [['y', ['cat', ['cat', sqn(q, ['op', 'tan', ang]), T('e')], ['quot', 'x', String(L)]]]],
        ret: polish('$y', 'x') };
}

// ================= the two that ship =================
// the angle 45 + r K degrees as (floor(r / c) + 45e13) glued to "e-13": a quotient, a subtraction and a
// glue cost 2.6 us where a multiplication and a subtraction cost 3.1 (and 1e-13 degree is far below need)
const angle = (q, r, U) => ['cat', ['-', ['quot', r, String(1e-13 / tanK(q, U))], '-450000000000000'], T('e-13')];
const tangq = (q, r, U) => sqn(q, ['op', 'tan', angle(q, r, U)]);
export const Q_FAST = 13, Q_EXACT = 1;
// exp: e^x = 10^n e^r (n, r: quotient and remainder of ln 10), e^r = tan(45 + r K)^8192,
// the text mantissa + "e" + n, one Newton step y - y (ln y - x)
export const expFast = (name = 'exp', label = 'exp') => ({
    name, label, locals: ['y'],
    body: [['y', ['cat', ['cat', tangq(Q_FAST, ['mod', 'x', String(L)], L), T('e')], ['quot', 'x', String(L)]]]],
    ret: polish('$y', 'x'),
});
// exp 정밀: x = J G1 + s1 with no rounding, s = s1 - J (ln 10 - L1)/256, e^s = tan(45 + s K)^2 and a
// Newton step against s, times the ladder 10^((J mod 256)/256), the power of ten glued on last
export const expExact = (name = 'expx', label = 'exp 정밀') => {
    const J = ['quot', 'x', String(G1)];
    return {
        name, label, locals: ['s', 'y'],
        body: [
            ['s', ['-', ['mod', 'x', String(G1)], ['*', J, String(DL / 256)]]],
            ['y', tangq(Q_EXACT, '$s', G1)],
        ],
        ret: ['op', 'abs', ['cat', ['cat', ['*', rtn(8, ['cat', T('1e'), ['mod', J, '256']]), polish('$y', '$s')], T('e')], ['quot', J, '256']]],
    };
};
