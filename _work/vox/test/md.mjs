// data sizes: node test/md.mjs
const b = await import('../build.mjs');
const { L, C, kinds } = b.makeData();
console.log('kinds', kinds, 'NCOL', C.NCOL, 'NBLOCK', C.NBLOCK, 'NITEM', C.NITEM);
console.log('big lists', Object.entries(L).filter(([k, v]) => v.length > 3000).map(([k, v]) => k + ':' + v.length).join(' '));
console.log('tabs', L.PALCN.join(','));
