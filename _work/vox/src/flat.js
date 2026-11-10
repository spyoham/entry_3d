// ===================================================================== flat worlds (v2.3)
// A flat world is its layers from the bottom up, the genre's way: "bedrock,2*dirt,grass_block"
// (n*name is n layers; names are block keys or Korean names, _ for a space). The surface world is
// the layers everywhere: no caves, ores, plants, trees or structures (the other worlds are as ever).
// flatOn says which kind the world is, flatSpec is kept with the world (save.js, a server's header).
let flatOn = 0, flatSpec = 'bedrock,2*dirt,grass_block', flatTop = 0, flatErr = '';
let FLB = [];
// the presets (the first is the default)
let FLPN = ['기본 평지', '깊은 평지', '물 세계', '눈 평지', '사막', '장치 준비', '구름 위'];
let FLPS = ['bedrock,2*dirt,grass_block', 'bedrock,59*stone,3*dirt,grass_block', 'bedrock,5*stone,5*dirt,5*sand,90*water',
  'bedrock,3*stone,3*dirt,snowy_grass_block,snow', 'bedrock,3*stone,52*sandstone,8*sand', 'bedrock,3*stone,52*sandstone', 'bedrock,80*air,glass'];
const FLMAX = 120;

// the layers into FLB (a block a layer, from y 0); flatErr says what is wrong (then 1)
function flatParse(spec) {
  FLB = []; flatErr = ''; flatTop = 0;
  let s = replace(spec, ' ', ''), n = strlen(s), i = 1, st = 1, bad = 0;
  while (i <= n + 1 && bad == 0) {
    let cut = 0;
    if (i > n) { cut = 1; } else { if (charAt(s, i) == ',') { cut = 1; } }
    if (cut == 1) {
      if (i > st) {
        let t = substr(s, st, i - 1), cnt = 1, nm = t, star = indexOf(t, '*');
        if (star > 0) {
          nm = '';
          if (star < strlen(t)) { nm = substr(t, star + 1, strlen(t)); }
          cnt = 0 - 1;
          if (star > 1) { let w = substr(t, 1, star - 1); if (isNum(w) == 1) { cnt = Math.floor(w * 1); } }
          if (cnt < 1) { bad = 1; flatErr = `층 수가 이상합니다: ${t}`; }
        }
        if (bad == 0) {
          let b = 0 - 1;
          // (not a number: ' ' == '0' as numbers would find a nameless block)
          if (strlen(nm) > 0) { if (isNum(nm) == 0) { b = blockByName(lower(nm)); } }
          if (b < 0) { bad = 1; flatErr = `모르는 블록입니다: ${nm}`; }
          else {
            let k = 0;
            while (k < cnt && FLB.length < FLMAX) { FLB.push(b); k = k + 1; }
            if (cnt > 0 && FLB.length >= FLMAX) { if (k < cnt) { bad = 1; flatErr = `층이 너무 많습니다 (모두 ${FLMAX}층까지)`; } }
          }
        }
      }
      st = i + 1;
    }
    i = i + 1;
  }
  if (bad == 0 && FLB.length == 0) { bad = 1; flatErr = '층이 하나도 없습니다'; }
  if (bad == 1) { FLB = []; }
  // (the top layer that is not air)
  let y = 1;
  while (y <= FLB.length) { if (FLB[y] != 0) { flatTop = y - 1; } y = y + 1; }
  return bad;
}
// one column of the flat surface world
function genFlat(x, z) {
  let ci = wcol(x, z), i = (ci - 1) * WY + 1, y = 0, n = FLB.length;
  HMAP[ci] = flatTop; BIOM[ci] = 2;
  while (y < WY) {
    if (y < n) { W[i] = FLB[y + 1]; } else { W[i] = 0; }
    LT[i] = 0;
    y = y + 1; i = i + 1;
  }
}
// a flat world from spec (or a world with its land: '-'): 1 when the spec was wrong
function flatSet(spec) {
  let bad = 0;
  flatOn = 0;
  if (spec != '-') { bad = flatParse(spec); if (bad == 0) { flatOn = 1; flatSpec = spec; } }
  return bad;
}
// the spec as kept (a normal world: '-')
function flatKept() {
  let r = '-';
  if (flatOn == 1) { r = flatSpec; }
  return r;
}
// the preset after the one whose layers are these
function flatNextPreset(spec) {
  let k = 1, at = 0;
  while (k <= FLPS.length) { if (FLPS[k] == spec) { at = k; } k = k + 1; }
  at = at + 1; if (at > FLPS.length) { at = 1; }
  return at;
}
function flatPresetName(spec) {
  let k = 1, r = '직접 지정';
  while (k <= FLPS.length) { if (FLPS[k] == spec) { r = FLPN[k]; } k = k + 1; }
  return r;
}
// a long spec shortened for a field
function flatShort(spec) {
  let r = spec;
  if (strlen(spec) > 40) { r = `${substr(spec, 1, 38)}…`; }
  return r;
}
