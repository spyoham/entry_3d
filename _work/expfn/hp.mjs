// e^x of a double to a few hundred bits (BigInt fixed point), and the error of a double against it in ulps.
const P = 320n, ONE = 1n << P;
function toFixed(x) {   // a finite double -> fixed point, exactly
    const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x);
    const hi = b.getUint32(0), lo = b.getUint32(4);
    const e = (hi >>> 20) & 0x7ff, neg = hi >>> 31;
    let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    const ex = e ? (m |= 1n << 52n, e - 1075) : -1074;
    const v = ex >= 0 ? (m << BigInt(ex)) << P : (m << P) >> BigInt(-ex);
    return neg ? -v : v;
}
const mul = (a, b) => (a * b) >> P;
function expSmall(r) { let t = ONE, s = ONE; for (let k = 1n; k < 80n; k++) { t = mul(t, r) / k; s += t; if (t === 0n) break; } return s; }
// ln 2 = sum 1/(k 2^k)
let LN2 = 0n; for (let k = 1n; k < 400n; k++) LN2 += ONE / (k << k);
// -> { m, e }: e^x = m / 2^P * 2^e, m in [1, 2)
export function expHP(x) {
    const X = toFixed(x);
    let k = X / LN2; let r = X - k * LN2;
    if (r < 0n) { r += LN2; k -= 1n; }
    return { m: expSmall(r >> 8n) ** 256n >> (P * 255n), e: Number(k) };
}
// (v - e^x) in units of the last place of e^x
function parts(x) {   // x = m * 2^ex, m an integer
    const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x);
    const hi = b.getUint32(0), e = (hi >>> 20) & 0x7ff;
    const m = (BigInt(hi & 0xfffff) << 32n) | BigInt(b.getUint32(4));
    return e ? { m: m | (1n << 52n), ex: e - 1075 } : { m, ex: -1074 };
}
const shl = (v, n) => (n >= 0 ? v << BigInt(n) : v >> BigInt(-n));
export function ulpErr(v, x) {
    if (!Number.isFinite(v) || v < 0) return NaN;
    const t = expHP(x);
    let m = t.m, e = t.e;
    while (m >= 2n * ONE) { m >>= 1n; e++; }
    const lsb = Math.max(e - 52, -1074);            // the last place of e^x
    const pv = parts(v);
    const d = shl(pv.m, pv.ex - lsb + Number(P)) - shl(m, e - lsb);
    return Number((d * 1000n) >> P) / 1000;
}
if (process.argv[1].endsWith('hp.mjs')) for (const x of [0, 1, -1, 0.5, 100, -700, 709.7, -745]) console.log(x, Math.exp(x), ulpErr(Math.exp(x), x));

// ---- for tables: e^(a real number given in fixed point) rounded to the nearest double ----
// ln 10 = 3 ln 2 + ln 1.25, ln 1.25 = 2 atanh(1/9)
let AT = 0n; for (let k = 0n; k < 120n; k++) AT += ONE / ((2n * k + 1n) * 9n ** (2n * k + 1n));
export const LN10 = 3n * LN2 + 2n * AT;
export const FIX = { P, ONE };
export function expFixed(X) {   // X: fixed point -> nearest double to e^X
    let k = X / LN2; let r = X - k * LN2;
    if (r < 0n) { r += LN2; k -= 1n; }
    let m = expSmall(r >> 8n) ** 256n >> (P * 255n), e = Number(k);
    while (m >= 2n * ONE) { m >>= 1n; e++; }
    return Number(m >> (P - 90n)) / 2 ** 90 * 2 ** e;
}
export const fixToNumber = (X) => Number(X >> (P - 100n)) / 2 ** 100;
