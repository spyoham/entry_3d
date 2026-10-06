// Build-time tables: powers of two and 2^(j/32) for exp, and the palette.
export const NH = 72, NL = 10;

// OKLCH -> sRGB (0..1 each, may be out of range)
function oklch(L, C, hDeg) {
    const h = hDeg * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
    return lin.map(v => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
}
const inGamut = (c) => c.every(v => v >= -0.0005 && v <= 1.0005);
const hex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
// the colour of hue cell hi (0..NH-1: phase hi*360/NH .. +360/NH) and lightness step li (0..NL-1)
export function colourOf(hi, li, { L0 = 0.56, L1 = 0.86, C = 0.17, H0 = 29 } = {}) {
    const L = L0 + (L1 - L0) * (li + 0.5) / NL, h = H0 + (hi + 0.5) * 360 / NH;
    let lo = 0, hi2 = C;
    if (inGamut(oklch(L, C, h))) return hex(oklch(L, C, h));
    for (let i = 0; i < 20; i++) { const mid = (lo + hi2) / 2; if (inGamut(oklch(L, mid, h))) lo = mid; else hi2 = mid; }
    return hex(oklch(L, lo, h));
}
// PAL[r * NL + c]: r = 1 .. NH + 1 is the phase from -180 degrees in steps of 360 / NH (row NH + 1
// repeats row 1), c = 1 .. NL the lightness. Entries 1 .. NL are spare (c = 0 of row 1 reads the
// last of them). Then black (zero) and white (infinity).
export function palette(opt) {
    const out = [];
    for (let r = 0; r <= NH + 1; r++) for (let li = 0; li < NL; li++) out.push(colourOf((((r === 0 ? NH : r) - 1) + NH / 2) % NH, li, opt));
    out.push('#000000', '#ffffff');
    return out;
}
export function tableSource(opt) {
    const p2 = [];
    for (let q = -1080; q <= 1030; q++) p2.push(q < -1074 ? 0 : q > 1023 ? Number.MAX_VALUE : Math.pow(2, q));
    const ext = [];
    for (let j = 0; j < 32; j++) ext.push(Math.pow(2, j / 32));
    return `let P2 = [${p2.join(',')}];\nlet EXT = [${ext.join(',')}];\nlet PAL = [${palette(opt).map(c => `'${c}'`).join(',')}];\n`;
}
