// The stroke font: each glyph is a few strokes (polylines made of lines and elliptic arcs)
// on a cap height of 100. Every point is kept twice: on the round arc and on the square
// that holds it (the SQAR axis goes from one to the other). Lines are the same in both.
//   L(x1, y1, x2, y2)                  a line
//   A(cx, cy, rx, ry, a0, a1)          an arc from angle a0 to a1 (degrees, anticlockwise
//                                      when a1 > a0), sampled every 15 degrees
//   closed(...)                        a stroke that returns to its start
const L = (x1, y1, x2, y2) => ({ t: 'L', x1, y1, x2, y2 });
const A = (cx, cy, rx, ry, a0, a1) => ({ t: 'A', cx, cy, rx, ry, a0, a1 });
const closed = (...p) => ({ closed: true, p });
const open = (...p) => ({ closed: false, p });

const O = (cx, cy, rx, ry) => closed(A(cx, cy, rx, ry, 0, 360));
export const GLYPHS = {
    'A': [76, open(L(0, 0, 38, 100), L(38, 100, 76, 0)), open(L(15, 36, 61, 36))],
    'B': [62, open(L(0, 0, 0, 100), L(0, 100, 30, 100), A(30, 75, 25, 25, 90, -90), L(30, 50, 0, 50)), open(L(0, 50, 34, 50), A(34, 25, 28, 25, 90, -90), L(34, 0, 0, 0))],
    'C': [80, open(A(42, 50, 42, 50, 40, 320))],
    'D': [72, closed(L(0, 0, 0, 100), L(0, 100, 28, 100), A(28, 50, 44, 50, 90, -90))],
    'E': [60, open(L(60, 100, 0, 100), L(0, 100, 0, 0), L(0, 0, 60, 0)), open(L(0, 50, 50, 50))],
    'F': [58, open(L(58, 100, 0, 100), L(0, 100, 0, 0)), open(L(0, 52, 48, 52))],
    'G': [86, open(A(43, 50, 43, 50, 40, 360), L(86, 50, 48, 50))],
    'H': [68, open(L(0, 0, 0, 100)), open(L(68, 0, 68, 100)), open(L(0, 50, 68, 50))],
    'I': [0, open(L(0, 0, 0, 100))],
    'J': [50, open(L(50, 100, 50, 30), A(25, 30, 25, 30, 0, -180))],
    'K': [66, open(L(0, 0, 0, 100)), open(L(64, 100, 0, 36)), open(L(24, 58, 66, 0))],
    'L': [54, open(L(0, 100, 0, 0), L(0, 0, 54, 0))],
    'M': [86, open(L(0, 0, 0, 100), L(0, 100, 43, 12), L(43, 12, 86, 100), L(86, 100, 86, 0))],
    'N': [68, open(L(0, 0, 0, 100), L(0, 100, 68, 0), L(68, 0, 68, 100))],
    'O': [92, O(46, 50, 46, 50)],
    'P': [60, open(L(0, 0, 0, 100), L(0, 100, 32, 100), A(32, 73, 28, 27, 90, -90), L(32, 46, 0, 46))],
    'Q': [92, O(46, 50, 46, 50), open(L(58, 24, 94, -8))],
    'R': [64, open(L(0, 0, 0, 100), L(0, 100, 32, 100), A(32, 74, 27, 26, 90, -90), L(32, 48, 0, 48)), open(L(30, 48, 64, 0))],
    'S': [64, open(A(33, 75, 29, 25, 25, 270), A(33, 25, 31, 25, 90, -155))],
    'T': [70, open(L(0, 100, 70, 100)), open(L(35, 100, 35, 0))],
    'U': [68, open(L(0, 100, 0, 34), A(34, 34, 34, 34, 180, 360), L(68, 34, 68, 100))],
    'V': [72, open(L(0, 100, 36, 0), L(36, 0, 72, 100))],
    'W': [104, open(L(0, 100, 25, 0), L(25, 0, 52, 100), L(52, 100, 79, 0), L(79, 0, 104, 100))],
    'X': [68, open(L(0, 100, 68, 0)), open(L(0, 0, 68, 100))],
    'Y': [72, open(L(0, 100, 36, 48), L(36, 48, 72, 100)), open(L(36, 48, 36, 0))],
    'Z': [66, open(L(2, 100, 64, 100), L(64, 100, 0, 0), L(0, 0, 66, 0))],
    '0': [66, O(33, 50, 33, 50)],
    '1': [30, open(L(0, 78, 30, 100), L(30, 100, 30, 0))],
    '2': [62, open(A(31, 70, 29, 30, 160, -35), L(54.8, 52.8, 0, 0), L(0, 0, 62, 0))],
    '3': [62, open(A(31, 74, 27, 26, 150, -90), A(31, 24, 31, 24, 90, -150))],
    '4': [68, open(L(52, 0, 52, 100), L(52, 100, 0, 30), L(0, 30, 68, 30))],
    '5': [62, open(L(58, 100, 8, 100), L(8, 100, 9.5, 58.5), A(31, 34, 31, 34, 134, -150))],
    '6': [66, O(33, 32, 33, 32), open(L(52, 100, 3, 45))],
    '7': [62, open(L(0, 100, 62, 100), L(62, 100, 18, 0))],
    '8': [66, O(33, 75, 27, 25), O(33, 25, 33, 25)],
    '9': [66, O(33, 68, 33, 32), open(L(14, 0, 63, 55))],
    ' ': [24],
    '.': [2, open(L(1, 0, 1, 1))],
    ',': [8, open(L(8, 6, 0, -16))],
    '!': [2, open(L(1, 100, 1, 30)), open(L(1, 0, 1, 1))],
    '?': [56, open(A(28, 72, 28, 28, 160, -60), L(42, 47.8, 30, 30)), open(L(30, 0, 30, 1))],
    '-': [36, open(L(0, 44, 36, 44))],
    ':': [2, open(L(1, 50, 1, 51)), open(L(1, 0, 1, 1))],
    "'": [2, open(L(1, 100, 1, 72))],
    '/': [44, open(L(0, -6, 44, 106))],
    '+': [56, open(L(0, 46, 56, 46)), open(L(28, 18, 28, 74))],
    '=': [56, open(L(0, 60, 56, 60)), open(L(0, 32, 56, 32))],
    '(': [26, open(A(46, 50, 46, 60, 120, 240))],
    ')': [26, open(A(-20, 50, 46, 60, 60, -60))],
    '#': [60, closed(L(0, 0, 60, 0), L(60, 0, 60, 100), L(60, 100, 0, 100))],
};
// glyph order: index k is the k-th character of LOOKUP; lower case letters use the upper
// case glyph (the runtime subtracts 26)
export const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-:\'/+=()#';
export const LOOKUP = CHARS.slice(0, 26) + 'abcdefghijklmnopqrstuvwxyz' + CHARS.slice(26);

const r4 = (v) => Math.round(v * 1000) / 1000;
function arcPoints(p) {
    const out = [];
    const dir = p.a1 >= p.a0 ? 1 : -1;
    const angs = [p.a0];
    // every multiple of 15 strictly between the ends (the square's corners at 45 + 90k)
    let a = dir > 0 ? Math.floor(p.a0 / 15) * 15 + 15 : Math.ceil(p.a0 / 15) * 15 - 15;
    while (dir > 0 ? a < p.a1 - 0.01 : a > p.a1 + 0.01) { if (Math.abs(a - p.a0) > 0.01) angs.push(a); a += 15 * dir; }
    angs.push(p.a1);
    for (const g of angs) {
        const c = Math.cos(g * Math.PI / 180), s = Math.sin(g * Math.PI / 180), m = Math.max(Math.abs(c), Math.abs(s));
        out.push([p.cx + p.rx * c, p.cy + p.ry * s, p.cx + p.rx * c / m, p.cy + p.ry * s / m]);
    }
    return out;
}
// flat lists: points (round x y, square x y), strokes (first point, count, closed), glyphs
export function buildFont() {
    const GX0 = [], GY0 = [], GX1 = [], GY1 = [], SKS = [], SKN = [], SKC = [], CHS = [], CHN = [], CHW = [];
    for (const ch of CHARS) {
        const g = GLYPHS[ch];
        if (!g) throw new Error('no glyph ' + ch);
        const [w, ...strokes] = g;
        CHS.push(SKS.length + 1); CHN.push(strokes.length); CHW.push(w);
        for (const st of strokes) {
            const pts = [];
            for (const p of st.p) {
                const add = p.t === 'L' ? [[p.x1, p.y1, p.x1, p.y1], [p.x2, p.y2, p.x2, p.y2]] : arcPoints(p);
                for (const q of add) {
                    const last = pts[pts.length - 1];
                    if (last && Math.abs(last[0] - q[0]) < 0.2 && Math.abs(last[1] - q[1]) < 0.2) continue;
                    pts.push(q);
                }
            }
            if (st.closed && pts.length > 2) {
                const f = pts[0], l = pts[pts.length - 1];
                if (Math.abs(f[0] - l[0]) < 0.01 && Math.abs(f[1] - l[1]) < 0.01) pts.pop();
            }
            SKS.push(GX0.length + 1); SKN.push(pts.length); SKC.push(st.closed ? 1 : 0);
            for (const q of pts) { GX0.push(r4(q[0])); GY0.push(r4(q[1])); GX1.push(r4(q[2])); GY1.push(r4(q[3])); }
        }
    }
    return { GX0, GY0, GX1, GY1, SKS, SKN, SKC, CHS, CHN, CHW };
}
