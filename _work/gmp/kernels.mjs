// Generated EJS: the multiplication tiles and the loops that drive them.
// A tile multiplies T limbs by T limbs with every operand handed in as a
// function parameter (an O(1) read in Entry, where a list read with an index
// sum costs four blocks) and adds the 2T-1 column sums into S[p..].
export const TILES = [4, 8, 16];
// tile rows between two carry passes: a limb may take 80 products of
// (10^7)^2 before 2^53; a doubled (2ab) tile row counts twice
export const GROUP = { 4: 20, 8: 10, 16: 5 };
export const GROUP2 = { 4: 10, 8: 5, 16: 2 };

// kind: 'add' S[p+k] += ..., 'set' S[p+k] = ..., 'half' (+= below column
// T-1, = from there: the columns the tile to its left already reached),
// 'dbl' S[p+k] += 2 * (...)
function mulTile(T, kind) {
    const ps = []; for (let i = 1; i <= T; i++) ps.push('a' + i); for (let i = 1; i <= T; i++) ps.push('b' + i);
    let body = '';
    for (let k = 0; k <= 2 * T - 2; k++) {
        const terms = [];
        for (let i = 0; i < T; i++) { const j = k - i; if (j >= 0 && j < T) terms.push(`a${i + 1} * b${j + 1}`); }
        const sum = terms.join(' + ');
        const add = kind === 'add' || kind === 'dbl' || (kind === 'half' && k <= T - 2);
        const rhs = kind === 'dbl' ? `(${sum}) * 2` : sum;
        body += add ? `    S[p + ${k}] = S[p + ${k}] + ${rhs};\n` : `    S[p + ${k}] = ${rhs};\n`;
    }
    const name = kind === 'add' ? `mpn_mul_tile${T}` : `mpn_mul_tile${T}${kind}`;
    return `function ${name}(p, ${ps.join(', ')}) {\n${body}}\n`;
}
function sqrTile(T) {
    const ps = []; for (let i = 1; i <= T; i++) ps.push('a' + i);
    let body = '';
    for (let k = 0; k <= 2 * T - 2; k++) {
        const terms = []; let sq = '';
        for (let i = 0; i < T; i++) { const j = k - i; if (j > i && j < T) terms.push(`a${i + 1} * a${j + 1}`); if (j === i) sq = `sqr(a${i + 1})`; }
        let e = terms.length ? `(${terms.join(' + ')}) * 2` : '';
        if (sq) e = e ? `${e} + ${sq}` : sq;
        body += `    S[p + ${k}] = S[p + ${k}] + ${e};\n`;
    }
    return `function mpn_sqr_tile${T}(p, ${ps.join(', ')}) {\n${body}}\n`;
}
const args = (base, T) => Array.from({ length: T }, (_, u) => `S[${base}${u ? ' + ' + u : ''}]`).join(', ');

// S[r..r+an+bn) = S[a..a+an) * S[b..b+bn): an, bn multiples of T; the
// region need not be zero: the first tile row writes its columns, the rest
// is cleared. cut (kind 'hi'): only tiles reaching column cut; (kind 'lo'):
// only tiles starting below column cut, and only columns below cut are
// put in order. Normalised at the end.
function mulGrid(T, kind) {
    const keep = kind === 'hi' ? `i + j + ${2 * T - 2} >= cut` : kind === 'lo' ? `i + j < cut` : null;
    const call = (k) => `mpn_mul_tile${T}${k}(ri + j, ${args('ai', T)}, ${args('bj', T)});`;
    const name = kind ? `mpn_mul_grid${T}${kind}` : `mpn_mul_grid${T}`;
    const params = kind ? '(r, a, an, b, bn, cut)' : '(r, a, an, b, bn)';
    // the 'lo' grid only puts columns below cut in order
    const lim = (len) => kind === 'lo' ? `mpn_snorm_to(r + i0, ${len}, cut - i0)` : `mpn_snorm(r + i0, ${len})`;
    const row0 = kind
        ? `mpn_szero(r, an + bn);`
        : `mpn_szero(r + bn + ${T - 1}, an - ${T - 1});`;
    const tile = kind
        ? `if (${keep}) { ${call('')} }`
        : `if (i == 0) { if (j == 0) { ${call('set')} } else { ${call('half')} } } else { ${call('')} }`;
    return `function ${name}${params} {
    ${row0}
    let i = 0; let g = 0; let i0 = 0;
    while (i < an) {
        let ai = a + i; let j = 0; let bj = b; let ri = r + i;
        while (j < bn) {
            ${tile}
            j = j + ${T}; bj = bj + ${T};
        }
        i = i + ${T}; g = g + 1;
        if (g == ${GROUP[T]}) { ${lim('i - i0 + bn')}; g = 0; i0 = i; }
    }
    ${lim('an + bn - i0')};
}
`;
}
// S[r..r+2n) = S[a..a+n)^2, n a multiple of T: the tiles off the diagonal
// add 2ab, the diagonal ones a^2; one carry pass
function sqrGrid(T) {
    return `function mpn_sqr_grid${T}(r, a, n) {
    mpn_szero(r, n * 2);
    let i = 0; let g = 0; let i0 = 0;
    while (i < n) {
        let ai = a + i; let j = i + ${T}; let bj = a + j;
        while (j < n) {
            mpn_mul_tile${T}dbl(r + i + j, ${args('ai', T)}, ${args('bj', T)});
            j = j + ${T}; bj = bj + ${T};
        }
        i = i + ${T}; g = g + 1;
        if (g == ${GROUP2[T]}) { mpn_snorm(r + i0 * 2, i + n - i0 * 2); g = 0; i0 = i; }
    }
    i = 0;
    while (i < n) { let ai = a + i; mpn_sqr_tile${T}(r + i * 2, ${args('ai', T)}); i = i + ${T}; }
    mpn_snorm(r, n * 2);
}
`;
}
export function kernelSource() {
    let s = '';
    for (const T of TILES) {
        s += mulTile(T, 'add') + mulTile(T, 'set') + mulTile(T, 'half') + mulTile(T, 'dbl') + sqrTile(T);
        s += mulGrid(T, null) + mulGrid(T, 'hi') + mulGrid(T, 'lo') + sqrGrid(T);
    }
    return s;
}
