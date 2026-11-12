// ===================================================================== the chat's swear words (v2.7.3)
// A chat line (not a command) has its Korean and English swear words turned into * before it goes
// (chatRun). The line is made into units first: a Hangul syllable or jamo, a Latin letter (lower
// case; 0 1 3 4 5 7 8 @ $ ! | read as the letters they stand for), or one space between words;
// anything else is left out, so 시.발, sh.it and f*ck join. A space between two single letters
// goes too (시 발, ㅅ ㅂ, f u c k), not one between words (다시 발견 stays).
// Korean words are patterns of syllables by their parts - first consonant / vowel / last consonant,
// each a set of letters (* any, _ no last consonant, - a jamo alone: ㅅㅂ) - so 씨발 시벌 쉬빨 씨팔
// are one pattern; they are looked for over the Korean units alone (시1발, 시x발). ^ at the front:
// only at a word's start, $ at the end: only at its end. English words are looked for in the
// Latin units with their spaces (this hit is not shit), a few (wtf, kys) only as whole words.
// Words that only look like one (시발점, 새끼 고양이, 조까지, peacock, cocktail) are let be.
// A line costs a few thousand steps, once, when it is sent: nothing while playing.
let SWPAT = [
  'ㅅㅆ/ㅣㅢㅟ/_,ㅂㅃㅍ/ㅏㅑㅓ/ㄹㄻㄼ', 'ㅆ/ㅣㅢㅟ/_,ㅂㅃㅍ/ㅏㅓ/_', '^ㅅ/ㅣㅟ/_,ㅂㅃ/ㅏ/_$', 'ㅆ/ㅡ/_,ㅂㅃ/ㅏㅓ/ㄹ', 'ㅅㅆ/-/_,ㅂㅃ/-/_',
  'ㅆ/ㅣ/_,ㅂ/ㅜ/_,ㄹ/ㅏㅓ/ㄹ', 'ㅆ/ㅣ/ㅂ,ㅅㅆ/ㅐㅔ/*', 'ㅆ/ㅣ/ㅂ,ㅎ/ㅏ/ㄹ', 'ㅆ/ㅣ/ㅂ,ㅊ/ㅏ/ㅇ', 'ㅆ/ㅣ/ㅂ,ㄴ/ㅕㅗ/ㄴㅁ', 'ㅆ/ㅑ/ㅇ',
  'ㅈㅉ/ㅗ/ㅈㅅ', 'ㅈ/ㅗ/_,ㄲ/ㅏ/_', 'ㅈㅉ/ㅗ/ㄴ,ㄴ/ㅏㅐㅑ/_', 'ㅈㅉ/ㅗ/ㄹ,ㄹ/ㅏㅐ/_', 'ㅈ/ㅗ/_,ㄴ/ㅐ/ㄴ', 'ㅈ/-/_,ㄴ/-/_',
  'ㅂㅃ/ㅕㅠㅣ/ㅇ,ㅅㅆ/ㅣ/ㄴ', 'ㅂ/-/_,ㅅ/-/_', 'ㄷ/ㅡ/ㅇ,ㅅ/ㅣ/ㄴ',
  'ㅅㅆ/ㅐㅒ/_,ㄲ/ㅣ/_', 'ㅅㅆ/ㅐ/ㄱ,ㄱㄲ/ㅣ/_', 'ㅅㅆ/ㅐ/_,ㅋ/ㅣ/_', 'ㄱ/ㅐㅔ/_,ㅅㅆ/ㅐㅔㅒ/_ㄱ,ㄱㄲ/ㅣ/_', 'ㅅ/-/_,ㄲ/-/_',
  'ㄱ/ㅐ/_,ㅈ/ㅏ/_,ㅅ/ㅣ/ㄱ', 'ㅎ/ㅜㅗ/_,ㄹ/ㅔㅐ/_,ㅈ/ㅏ/_,ㅅ/ㅣ/ㄱ', 'ㄱ/ㅐ/_,ㄱ/ㅏ/ㅌㅊ',
  'ㅁ/ㅣ/_,ㅊ/ㅣㅟ/ㄴ,ㄴ/ㅗㅓㅕ/ㅁㄴ', 'ㅈㅉ/ㅣ/_,ㄹ/ㅏㅓ/ㄹ', 'ㅈ/-/_,ㄹ/-/_', 'ㅇ/ㅕ/ㅁ,ㅂㅃ/ㅕ/ㅇ', 'ㅇ/ㅔㅐ/ㅁ,ㅊ/ㅏ/ㅇ',
  'ㄴ/ㅣ/_,ㅇ/ㅐㅔ/_,ㅁㅂ/ㅣ/_', 'ㄴ/ㅡ/_,ㄱ/ㅡ/ㅁ,ㅁ/ㅏ/_', 'ㄴ/ㅣ/_,ㅁ/ㅣ/_,ㄹ/ㅓㅏ/ㄹ',
  'ㅉ/ㅣ/ㄴ,ㄸ/ㅏ/_', 'ㄸ/ㅗ/_,ㄹ/ㅏ/_,ㅇ/ㅣ/_', 'ㄷ/ㅞ/_,ㅈ/ㅕㅓㅣ/_', 'ㅇ/ㅕ/ㅅ,ㅁ/ㅓ/ㄱ', '-/ㅗ/_'];
let SWEXC = ['시발점', '시발역', '시발택', '시발견', '시발표', '시발전', '시발사', '시발생', '시발급', '시발행', '시발매', '시발령', '시발음', '시발달', '시발명', '시발동', '시발송', '시발주', '시발효', '시발휘', '시발굴', '시발언', '시발각',
  '시바견', '시바이누', '새끼손', '새끼발', '새끼고양', '새끼강아', '새끼곰', '새끼돼지', '새끼양', '새끼소', '새끼닭', '새끼말', '새끼늑대', '새끼여우', '새끼토끼', '새끼거북', '새끼오리', '새끼새', '새끼줄', '새끼낳', '새끼를낳', '새끼치',
  '졸라서', '졸라도', '졸라맨', '졸라대', '졸라매', '조까지', '등신대',
  'peacock', 'cockroach', 'cocktail', 'cockpit', 'cockatoo', 'cockerel', 'hancock', 'hitchcock', 'prickly', 'dickens', 'scunthorpe', 'fukushima', 'fukuoka', 'retardant'];
let SWENG = ['fuck', 'fuk', 'fck', 'fvck', 'phuck', 'shit', 'bitch', 'biatch', 'asshole', 'dumbass', 'jackass', 'bastard', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'faggot', 'slut', 'whore', 'retard', 'cock', 'piss', 'prick', 'twat', 'wanker', 'wtf', 'stfu', 'kys'];
let SWEB = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1];
const SWJO = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ', SWUP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SWLO = 'abcdefghijklmnopqrstuvwxyz';
const SWLK = '0134578@$!|', SWLV = 'oieastbasii';
// the patterns read once: syllable specs SWSC SWSV SWSJ, each pattern's count SWSN, first SWSS, ^ SWSB, $ SWSE
let SWSC = [], SWSV = [], SWSJ = [], SWSN = [], SWSS = [], SWSB = [], SWSE = [], SWT = [], swReady = 0;
// the units SWU (SWP: their place in the line), first and then with the spaces between single letters gone
let SWU = [], SWP = [], SWU2 = [], SWP2 = [], SWRL = [], SWNU = [], SWPR = [], SWMK = [];
// the Korean units: SWKU (which unit), SWKC SWKV SWKJ its parts ('#' a space)
let SWKU = [], SWKC = [], SWKV = [], SWKJ = [];
let swS = '', swN = '', swOut = '', swHit = 0, swLat = 0, swKor = 0;
function swInit() {
  swReady = 1;
  SWSC = []; SWSV = []; SWSJ = []; SWSN = []; SWSS = []; SWSB = []; SWSE = [];
  let p = 1;
  while (p <= SWPAT.length) {
    gS = SWPAT[p];
    let b = 0, e = 0;
    if (charAt(gS, 1) == '^') { b = 1; gS = substr(gS, 2, strlen(gS)); }
    if (charAt(gS, strlen(gS)) == '$') { e = 1; gS = substr(gS, 1, strlen(gS) - 1); }
    splitBy(gS, ',');
    SWT = []; let i = 1;
    while (i <= SPL.length) { SWT.push(SPL[i]); i = i + 1; }
    SWSN.push(SWT.length); SWSS.push(SWSC.length + 1); SWSB.push(b); SWSE.push(e);
    i = 1;
    while (i <= SWT.length) { splitBy(SWT[i], '/'); SWSC.push(SPL[1]); SWSV.push(SPL[2]); SWSJ.push(SPL[3]); i = i + 1; }
    p = p + 1;
  }
}
// does Korean unit j fit spec q
function swSpec(j, q) {
  let r = 0;
  if (SWKC[j] != '#') {
    if (SWSC[q] == '*' || indexOf(SWSC[q], SWKC[j]) > 0) { if (SWSV[q] == '*' || indexOf(SWSV[q], SWKV[j]) > 0) { if (SWSJ[q] == '*' || indexOf(SWSJ[q], SWKJ[j]) > 0) { r = 1; } } }
  }
  return r;
}
function swMark(a, b) { let i = a; while (i <= b) { SWMK[i] = 1; i = i + 1; } swHit = 1; }
// are units a .. b free of the words that only look like one
function swFree(a, b) { let r = 1, i = a; while (i <= b) { if (SWPR[i] == 1) { r = 0; } i = i + 1; } return r; }
// the line with its swear words as *
function swFilter(s) {
  if (swReady == 0) { swInit(); }
  s = `${s}`;
  let n = strlen(s), i = 1;
  // 1 the units
  SWU = []; SWP = []; swLat = 0; swKor = 0;
  while (i <= n) {
    let c = charAt(s, i);
    if (c == ' ') { if (SWU.length > 0) { if (SWU[SWU.length] != ' ') { SWU.push(' '); SWP.push(i); } } }
    else {
      if (indexOf(HSY, c) > 0 || indexOf(HCO, c) > 0 || indexOf(HVO, c) > 0) { SWU.push(c); SWP.push(i); swKor = 1; }
      else { if (c == 'ㅄ') { SWU.push('ㅂ'); SWP.push(i); SWU.push('ㅅ'); SWP.push(i); swKor = 1; }
      else {
        let k = indexOf(SWUP, c);
        if (k > 0) { SWU.push(charAt(SWLO, k)); SWP.push(i); swLat = 1; }
        else { k = indexOf(SWLO, c); if (k > 0) { SWU.push(charAt(SWLO, k)); SWP.push(i); swLat = 1; }
        else { k = indexOf(SWLK, c); if (k > 0) { SWU.push(charAt(SWLV, k)); SWP.push(i); swLat = 1; } } }
      } }
    }
    i = i + 1;
  }
  swHit = 0;
  let m = SWU.length;
  if (m > 0 && (swKor == 1 || swLat == 1)) {
    // 2 each unit's word's length, and the spaces between single letters gone
    SWRL = []; i = 1;
    while (i <= m) { SWRL.push(0); i = i + 1; }
    let st = 1; i = 1;
    while (i <= m + 1) {
      let brk = 0;
      if (i > m) { brk = 1; } else { if (SWU[i] == ' ') { brk = 1; } }
      if (brk == 1) { let j = st; while (j < i) { SWRL[j] = i - st; j = j + 1; } st = i + 1; }
      i = i + 1;
    }
    SWU2 = []; SWP2 = []; i = 1;
    while (i <= m) {
      let keep = 1;
      if (SWU[i] == ' ') { if (i == m) { keep = 0; } else { if (i > 1) { if (SWRL[i - 1] == 1 && SWRL[i + 1] == 1) { keep = 0; } } } }
      if (keep == 1) { SWU2.push(SWU[i]); SWP2.push(SWP[i]); }
      i = i + 1;
    }
    let m2 = SWU2.length;
    // 3 the units as a line (swS), the same without spaces (swN, SWNU: which unit), the Korean ones apart
    swS = SWU2[1]; swN = ''; SWNU = []; SWPR = []; SWKU = []; SWKC = []; SWKV = []; SWKJ = [];
    i = 1;
    while (i <= m2) {
      let c = SWU2[i];
      if (i > 1) { swS = `${swS}${c}`; }
      SWPR.push(0);
      if (c == ' ') { SWKU.push(i); SWKC.push('#'); SWKV.push('#'); SWKJ.push('#'); }
      else {
        SWNU.push(i);
        if (SWNU.length == 1) { swN = c; } else { swN = `${swN}${c}`; }
        let h = indexOf(HSY, c);
        if (h > 0) {
          h = h - 1;
          SWKU.push(i); SWKC.push(charAt(HCO, idiv(h, 588) + 1)); SWKV.push(charAt(HVO, idiv(mod(h, 588), 28) + 1));
          let jj = mod(h, 28);
          if (jj == 0) { SWKJ.push('_'); } else { SWKJ.push(charAt(SWJO, jj)); }
        }
        else {
          if (indexOf(HCO, c) > 0) { SWKU.push(i); SWKC.push(c); SWKV.push('-'); SWKJ.push('_'); }
          else { if (indexOf(HVO, c) > 0) { SWKU.push(i); SWKC.push('-'); SWKV.push(c); SWKJ.push('_'); } }
        }
      }
      i = i + 1;
    }
    // 4 the words that only look like one
    let nn = SWNU.length, w = 1;
    while (w <= SWEXC.length) {
      let e = SWEXC[w], L = strlen(e), from = 1;
      while (from <= nn) {
        let k = indexOf(substr(swN, from, nn), e);
        if (k == 0) { from = nn + 1; }
        else { let a = from + k - 1, t = 0; while (t < L) { SWPR[SWNU[a + t]] = 1; t = t + 1; } from = a + 1; }
      }
      w = w + 1;
    }
    SWMK = []; i = 1;
    while (i <= n) { SWMK.push(0); i = i + 1; }
    // 5 Korean: every pattern from every unit (its first consonant first: cheap)
    let kn = SWKU.length;
    if (swKor == 1) {
      let j = 1;
      while (j <= kn) {
        let cj = SWKC[j];
        if (cj != '#') {
          let p = 1;
          while (p <= SWSN.length) {
            let L = SWSN[p], q = SWSS[p];
            if (j + L - 1 <= kn) { if (indexOf(SWSC[q], cj) > 0) {
              let ok = 1, t = 0;
              while (t < L) { if (ok == 1) { if (swSpec(j + t, q + t) == 0) { ok = 0; } } t = t + 1; }
              if (ok == 1) { if (SWSB[p] == 1) { if (j > 1) { if (SWKC[j - 1] != '#') { ok = 0; } } } }
              if (ok == 1) { if (SWSE[p] == 1) { if (j + L <= kn) { if (SWKC[j + L] != '#') { ok = 0; } } } }
              if (ok == 1) { t = 0; while (t < L) { if (SWPR[SWKU[j + t]] == 1) { ok = 0; } t = t + 1; } }
              if (ok == 1) { swMark(SWP2[SWKU[j]], SWP2[SWKU[j + L - 1]]); }
            } }
            p = p + 1;
          }
        }
        j = j + 1;
      }
    }
    // 6 English, in the Latin units with their spaces
    if (swLat == 1) {
      w = 1;
      while (w <= SWENG.length) {
        let e = SWENG[w], L = strlen(e), from = 1;
        while (from <= m2) {
          let k = indexOf(substr(swS, from, m2), e);
          if (k == 0) { from = m2 + 1; }
          else {
            let a = from + k - 1, ok = swFree(a, a + L - 1);
            if (SWEB[w] == 1) {
              if (a > 1) { if (indexOf(SWLO, SWU2[a - 1]) > 0) { ok = 0; } }
              if (a + L <= m2) { if (indexOf(SWLO, SWU2[a + L]) > 0) { ok = 0; } }
            }
            if (ok == 1) { swMark(SWP2[a], SWP2[a + L - 1]); }
            from = a + 1;
          }
        }
        w = w + 1;
      }
    }
  }
  // 7 the line again, the marked letters as *
  if (swHit == 1) {
    i = 1;
    while (i <= n) {
      let c = charAt(s, i);
      if (SWMK[i] == 1 && c != ' ') { c = '*'; }
      if (i == 1) { swOut = c; } else { swOut = `${swOut}${c}`; }
      i = i + 1;
    }
  } else { swOut = s; }
  return swOut;
}
