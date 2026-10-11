// exp with a list. T[j + 1] = 10^(j/4096): one read of it stands for twelve bits of the exponent.
//   e^x = 10^n * T[j] * e^s,  J = floor(x / G) = 4096 n + j,  s = x - J G  (under 5.7e-4)
// The tail e^s is one tangent: tan(45 + atan-free) -
//   tan(45 deg + (90/pi) sin(s)) = e^(s - s^5/30...)   (sin s is the Gudermannian of s but for s^5/30)
// so no squaring, hence nothing to magnify a rounding, hence no Newton step.
import { LN10, FIX, expFixed, fixToNumber } from './hp.mjs';
const T = (t) => ({ t });
const K = 4096;
export const LISTKEY = 'EXPT';   // the key of the list in makeFunction's listIds
export function table() {
    return Array.from({ length: K }, (_, j) => expFixed(LN10 * BigInt(j) / BigInt(K)));
}
// the place j + 1 of the list with no addition: j + ".5", rounded
const cell = (J) => ['idx', LISTKEY, ['op', 'round', ['cat', ['mod', J, String(K)], T('.5')]]];
const R2D = 180 / Math.PI;
// tail(sdeg): sdeg is s in degrees
const tail = (sdeg) => ['op', 'tan', ['-', ['*', ['op', 'sin', sdeg], String(90 / Math.PI)], '-45']];

// quick: G = ln 10 / 4096 as it comes (the remainder is rounded like x itself is: wrong by about |x| 1e-16)
export function quick(name = 'tblQ') {
    const G = 2.302585092994046 / K;
    // s in degrees as floor(s / c) glued to "e-18"
    const sdeg = ['cat', ['quot', ['mod', 'x', String(G)], String(1e-18 / R2D)], T('e-18')];
    return {
        name, label: 'exp 표', locals: ['J'],
        body: [['J', ['quot', 'x', String(G)]]],
        ret: ['*', ['cat', ['cat', cell('$J'), T('e')], ['quot', '$J', String(K)]], tail(sdeg)],
    };
}
// exact: G1 is ln 10 / 4096 cut to `bits` bits, so J G1 and x - J G1 are not rounded; what was cut off, J D,
// is taken off the tail (both scaled to 1e-18 degree by a quotient, so the subtraction is of whole numbers)
export function consts(bits) {
    // L1 = ln 10 to `bits` significant bits (it lies in [2, 4): the last bit is 2^(2 - bits))
    const sh = BigInt(bits - 2);
    const L1n = (LN10 + (FIX.ONE >> (sh + 1n))) >> (FIX.P - sh);      // integer, L1 = L1n / 2^sh
    const L1 = Number(L1n) / 2 ** Number(sh);
    const D = fixToNumber(LN10 - (L1n << (FIX.P - sh)));               // ln 10 - L1
    return { L1, G1: L1 / K, D, Dc: D / K };
}
export function exact(bits = 32, name = 'tblX') {
    const { G1, Dc } = consts(bits);
    const N1 = ['quot', ['mod', 'x', String(G1)], String(1e-18 / R2D)];
    const N2 = ['quot', '$J', String(1e-18 / R2D / Dc)];
    return {
        name, label: 'exp 표', locals: ['J'],
        body: [['J', ['quot', 'x', String(G1)]]],
        ret: ['*', ['cat', ['cat', cell('$J'), T('e')], ['quot', '$J', String(K)]], tail(['cat', ['-', N1, N2], T('e-18')])],
    };
}
// the one that ships
export const LIST = 'exp 표';
export const expTable = () => ({ ...exact(31, 'expt'), label: 'exp 표' });

// the same with the angle 45 + (90/pi) sin as (floor(sin / c) + 45e19) glued to "e-19" (a quotient for a multiplication)
export function exactq(bits = 31, name = 'tblXq') {
    const f = exact(bits, name);
    const sdeg = f.ret[2][2][1][1][2];
    f.ret[2] = ['op', 'tan', ['cat', ['-', ['quot', ['op', 'sin', sdeg], String(1e-19 / (90 / Math.PI))], '-450000000000000000000'], T('e-19')]];
    return f;
}
if (process.argv[1].endsWith('tbl.mjs')) { for (let b = 24; b <= 32; b++) console.log(b, consts(b)); const t = table(); console.log(t[0], t[1], t[2048], t[4095], 10 ** (2048 / 4096)); }
