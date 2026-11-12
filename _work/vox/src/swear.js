// ===================================================================== the chat's swear words (v2.7.3, v2.7.4)
// A chat line (not a command) has its Korean and English swear words turned into * before it goes
// (chatRun). The line is made into units first: a Hangul syllable or jamo, a Latin letter (lower
// case; 0 1 3 4 5 7 8 @ $ ! | read as the letters they stand for), or one space between words;
// anything else is left out, so 시.발, sh.it and f*ck join. A space between two single letters
// goes too (시 발, ㅅ ㅂ, f u c k), not one between words (다시 발견 stays).
// Korean words are patterns of syllables by their parts - first consonant / vowel / last consonant,
// each a set of letters (* any, _ no last consonant, - a jamo alone: ㅅㅂ) - looked for over the
// Korean units alone (시1발, 시x발). ^ at the front: only at a word's start, $ at the end: only at
// its end. English words are looked for in the Latin units with their spaces (this hit is not
// shit), a few (wtf, kys) only as whole words. Words that only look like one (시발점, 새끼 고양이,
// 조까지, peacock, cocktail) are let be.
// (v2.7.4) Harder to get round: each set takes the letters that look or sound alike - a plain
// consonant its tense one (ㅅ ㅆ, ㅂ ㅃ, ㅈ ㅉ, ㄱ ㄲ, ㄷ ㄸ), a vowel its family (ㅐ ㅒ ㅔ ㅖ ㅙ ㅞ,
// ㅏ ㅑ ㅘ, ㅓ ㅕ ㅝ, ㅗ ㅛ, ㅜ ㅠ, ㅣ ㅢ ㅟ), so 섀끼 쉐끼 쇄끼 븅신 시봘 죤나 are the words; '=' before
// a set keeps it as written (썅 is not 쌍). Between the syllables of a word: jamo alone (시ㅋ발,
// 병ㅡ신, 시ㅣ발) and a syllable's vowel said again (시이발, 씨이이발) are skipped; a last
// consonant written apart is the syllable's (바ㄹ, 바알, 벼어엉신, 조온나); jamo spelt out make a
// syllable (ㅅㅣㅂㅏㄹ), and l I 1 | ! after a consonant jamo are ㅣ (ㅅl발). In English a letter said
// more than once is once (fuuuck, shiiit, asssshole).
// A line costs a few thousand steps, once, when it is sent: nothing while playing.
let SWPAT = [
  'ㅅ/ㅣ/_,ㅂㅍ/=ㅏㅑㅘㅓㅝ/ㄹㄻㄼ', 'ㅆ/ㅣ/_,ㅂㅍ/ㅏㅓ/_', '^ㅅ/ㅣ/_,ㅂ/ㅏ/_$', 'ㅆ/ㅡ/_,ㅂ/ㅏㅓ/ㄹ', 'ㅅ/-/_,ㅂ/-/_', 'ㅅ/-/_,ㅂㅍ/ㅏㅓ/ㄹ', 'ㅅ/ㅣ/_,ㅂ/-/_',
  'ㅅ/ㅣ/_,ㅂ/ㅜ/_,ㄹ/ㅏㅓ/ㄹ', 'ㅆ/ㅣ/ㅂ,ㅅ/ㅐ/*', 'ㅆ/ㅣ/ㅂ,ㅎ/ㅏ/ㄹ', 'ㅆ/ㅣ/ㅂ,ㅊ/ㅏ/ㅇ', 'ㅆ/ㅣ/ㅂ,ㄴ/ㅕㅗ/ㄴㅁ', 'ㅅ/ㅣ/ㅂ,ㅇ/ㅏㅓ/ㄹ',
  'ㅆ/=ㅑ/ㅇ', 'ㅆ/ㅏ/ㅇ,ㄴ/ㅕㅗ/ㄴㅁ',
  '=ㅈ/ㅗ/ㅈㅅㄷ', 'ㅉ/ㅗ/ㅅㄷ', '=ㅈ/ㅗ/_,ㄲ/ㅏ/_', 'ㅈ/ㅗ/ㄴ,ㄴ/ㅏㅐ/_', 'ㅈ/ㅗ/ㄹ,ㄹ/ㅏㅐ/_', 'ㅈ/ㅗ/ㄹ,ㄴ/ㅏ/_', 'ㅈ/ㅗ/_,ㄴ/ㅐ/ㄴ', 'ㅈ/-/_,ㄴ/-/_',
  'ㅂ/ㅕㅠㅣ/ㅇ,ㅅ/ㅣ/ㄴ', 'ㅂ/-/_,ㅅ/-/_', 'ㅂ/-/_,ㅅ/ㅣ/ㄴ', 'ㅂ/ㅕㅠ/ㅇ,ㅅ/-/_', 'ㄷ/ㅡ/ㅇ,ㅅ/ㅣ/ㄴ',
  'ㅅ/ㅐ/_,ㄲ/ㅣ/_', '^ㅅ/ㅐ/ㄱ,ㄱ/ㅣ/_', 'ㅅ/ㅐ/_,ㅋ/ㅣ/_', 'ㅅ/ㅐ/ㄱ,ㅎ/ㅣ/_', '^ㅅ/=ㅐㅒ/_,ㄱ/ㅣ/_$', 'ㄱ/ㅐ/_,ㅅ/ㅐ/_ㄱ,ㄱㅋㅎ/ㅣ/_',
  'ㅅ/ㅐ/_,ㄲ/=ㅑ/_', 'ㅅ/-/_,ㄲ/-/_', 'ㅅ/ㅐ/_,ㄲ/-/_', 'ㅅ/-/_,ㄲ/ㅣ/_',
  'ㄱ/ㅐ/_,ㅈ/ㅏ/_,ㅅ/ㅣ/ㄱ', 'ㅎ/ㅜㅗ/_,ㄹ/ㅔ/_,ㅈ/ㅏ/_,ㅅ/ㅣ/ㄱ', 'ㄱ/ㅐ/_,ㄱ/ㅏ/ㅌㅊ',
  'ㅁ/ㅣ/_,ㅊ/ㅣ/ㄴ,ㄴ/ㅗㅓ/ㅁㄴ', 'ㅈ/ㅣ/_,ㄹ/ㅏㅓ/ㄹ', 'ㅈ/-/_,ㄹ/-/_', 'ㅇ/ㅕ/ㅁ,ㅂ/ㅕ/ㅇ', 'ㅇ/ㅔ/ㅁ,ㅊ/ㅏ/ㅇ',
  'ㄴ/ㅣ/_,ㅇ/ㅐ/_,ㅁㅂ/ㅣ/_', 'ㄴ/ㅡ/_,ㄱ/ㅡ/ㅁ,ㅁ/ㅏ/_', 'ㄴ/ㅣ/_,ㅁ/ㅣ/_,ㄹ/ㅓㅏ/ㄹ',
  'ㅉ/ㅣ/ㄴ,ㄸ/ㅏ/_', 'ㄷ/ㅗ/_,ㄹ/ㅏ/_,ㅇ/ㅣ/_', 'ㄷ/=ㅞ/_,ㅈ/ㅕㅣ/_', 'ㅇ/ㅕ/ㅅ,ㅁ/ㅓ/ㄱ', '-/ㅗ/_'];
let SWEXC = ['시발점', '시발역', '시발택', '시발견', '시발표', '시발전', '시발사', '시발생', '시발급', '시발행', '시발매', '시발령', '시발음', '시발달', '시발명', '시발동', '시발송', '시발주', '시발효', '시발휘', '시발굴', '시발언', '시발각', '시뻘',
  '시바견', '시바이누', '새끼손', '새끼발', '새끼고양', '새끼강아', '새끼곰', '새끼돼지', '새끼양', '새끼소', '새끼닭', '새끼말', '새끼늑대', '새끼여우', '새끼토끼', '새끼거북', '새끼오리', '새끼새', '새끼줄', '새끼낳', '새끼를낳', '새끼치',
  '루세끼', '두세끼', '시세끼', '한세끼', '밥세끼', '세끼밥', '세끼식', '세끼먹', '세끼씩', '세끼째', '세끼다먹', '세끼를먹', '세끼를챙', '세끼챙', '되새기', '색끼리', '색기리',
  '졸라서', '졸라도', '졸라맨', '졸라대', '졸라매', '조까지', '등신대', '엄벙', '졸래졸래', '쫄래쫄래',
  'peacock', 'cockroach', 'cocktail', 'cockpit', 'cockatoo', 'cockerel', 'hancock', 'hitchcock', 'prickly', 'dickens', 'dickinson', 'scunthorpe', 'fukushima', 'fukuoka', 'retardant', 'retardation', 'shiitake', 'shitake', 'snigger', 'niggard'];
// (SWEB: 1 a whole word only)
let SWENG = ['fuck', 'fuk', 'fck', 'fvck', 'phuck', 'shit', 'bitch', 'biatch', 'asshole', 'dumbass', 'jackass', 'bastard', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'faggot', 'slut', 'whore', 'retard', 'cock', 'piss', 'prick', 'twat', 'wanker', 'wtf', 'stfu', 'kys',
  'tlqkf', 'qudtls', 'whssk', 'wlfkf', 'rotorl'];
let SWEB = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0];
// the vowels that pass for one another, and each plain consonant's tense one
let SWVF = ['ㅏㅑㅘ', 'ㅓㅕㅝ', 'ㅗㅛ', 'ㅜㅠ', 'ㅐㅒㅔㅖㅙㅞ', 'ㅣㅢㅟ', 'ㅡ'];
const SWPL = 'ㄱㄷㅂㅅㅈ', SWTN = 'ㄲㄸㅃㅆㅉ', SWLI = 'lI1|!';
const SWJO = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ', SWUP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SWLO = 'abcdefghijklmnopqrstuvwxyz';
const SWLK = '0134578@$!|', SWLV = 'oieastbasii';
// the patterns read once: syllable specs SWSC SWSV SWSJ, each pattern's count SWSN, first SWSS, ^ SWSB, $ SWSE;
// the English words with their letters said once SWENC, how many times each SWENR (piss: 1112)
let SWSC = [], SWSV = [], SWSJ = [], SWSN = [], SWSS = [], SWSB = [], SWSE = [], SWT = [], SWENC = [], SWENR = [], swReady = 0;
// the units SWU (SWP: their place in the line), first and then with the spaces between single letters gone
let SWU = [], SWP = [], SWU2 = [], SWP2 = [], SWRL = [], SWNU = [], SWPR = [], SWMK = [];
// the Korean units: their parts SWKC SWKV SWKJ ('#' a space, '-' none: a jamo alone), SWKA .. SWKB the
// units (SWU2) they are made of, SWKF 1 a jamo alone (skipped between a word's syllables)
let SWKC = [], SWKV = [], SWKJ = [], SWKA = [], SWKB = [], SWKF = [];
// the Latin line with a letter said again once (swC), SWCA .. SWCB the units each of its letters is
let SWCA = [], SWCB = [];
let swS = '', swN = '', swC = '', swOut = '', swX = '', swLV = '', swLJ = '', swHit = 0, swLat = 0, swKor = 0, swKN = 0;
// a set with the letters that pass for its own (k 1 a consonant, 2 a vowel)
function swAddCh(c) { if (indexOf(swX, c) == 0) { swX = `${swX}${c}`; } }
function swWiden(s, k) {
  swX = s;
  if (charAt(s, 1) == '=') { swX = substr(s, 2, strlen(s)); }
  else {
    if (s != '*' && s != '-') {
      let n = strlen(s), i = 1;
      while (i <= n) {
        let c = charAt(s, i);
        if (k == 1) { let t = indexOf(SWPL, c); if (t > 0) { swAddCh(charAt(SWTN, t)); } }
        if (k == 2) { let f = 1; while (f <= SWVF.length) { if (indexOf(SWVF[f], c) > 0) { let g = 1; while (g <= strlen(SWVF[f])) { swAddCh(charAt(SWVF[f], g)); g = g + 1; } } f = f + 1; } }
        i = i + 1;
      }
    }
  }
  return swX;
}
function swInit() {
  swReady = 1;
  SWSC = []; SWSV = []; SWSJ = []; SWSN = []; SWSS = []; SWSB = []; SWSE = []; SWENC = []; SWENR = [];
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
    while (i <= SWT.length) {
      splitBy(SWT[i], '/');
      gS = SPL[1]; gS2 = SPL[2]; swOut = SPL[3];
      SWSC.push(swWiden(gS, 1));
      // (a vowel alone - ㅗ - is its shape: as written)
      if (gS == '-') { SWSV.push(gS2); } else { SWSV.push(swWiden(gS2, 2)); }
      SWSJ.push(swWiden(swOut, 1));
      i = i + 1;
    }
    p = p + 1;
  }
  let w = 1;
  while (w <= SWENG.length) {
    gS = SWENG[w]; swX = charAt(gS, 1); gS2 = '';
    let i = 2, r = 1;
    while (i <= strlen(gS) + 1) {
      let nw = 1;
      if (i <= strlen(gS)) { if (charAt(gS, i) == charAt(gS, i - 1)) { nw = 0; } }
      if (nw == 1) { gS2 = `${gS2}${r}`; r = 1; if (i <= strlen(gS)) { swX = `${swX}${charAt(gS, i)}`; } } else { r = r + 1; }
      i = i + 1;
    }
    SWENC.push(swX); SWENR.push(gS2);
    w = w + 1;
  }
}
// does Korean unit j fit spec q (its first consonant and vowel: swFit; and its last one too: swSpec)
function swFit(j, q) {
  let r = 0;
  if (SWKC[j] != '#') {
    if (SWSC[q] == '*' || indexOf(SWSC[q], SWKC[j]) > 0) { if (SWSV[q] == '*' || indexOf(SWSV[q], SWKV[j]) > 0) { r = 1; } }
  }
  return r;
}
function swSpec(j, q) {
  let r = 0;
  if (swFit(j, q) == 1) { if (SWSJ[q] == '*' || indexOf(SWSJ[q], SWKJ[j]) > 0) { r = 1; } }
  return r;
}
// two vowels of one family
function swSame(a, b) {
  let r = 0;
  if (a == b) { r = 1; }
  else { let f = 1; while (f <= SWVF.length) { if (indexOf(SWVF[f], a) > 0) { if (indexOf(SWVF[f], b) > 0) { r = 1; } } f = f + 1; } }
  return r;
}
// is unit k vowel v said again (이 after 시, 아 or ㅏ after 바)
function swEcho(k, v) {
  let r = 0;
  if (k <= swKN) {
    if (SWKC[k] == 'ㅇ') { if (SWKJ[k] == '_') { r = swSame(SWKV[k], v); } }
    else { if (SWKC[k] == '-') { r = swSame(SWKV[k], v); } }
  }
  return r;
}
// pattern p from Korean unit j: the last unit of it (0: not there)
function swWalk(j, p) {
  let L = SWSN[p], q0 = SWSS[p], pos = j, t = 0, ok = 1, last = 0;
  swLV = '-'; swLJ = '_';
  while (t < L && ok == 1) {
    let q = q0 + t;
    // (between syllables: jamo alone, and the last vowel said again)
    if (t > 0) {
      let sk = 0, go = 1;
      while (go == 1) {
        go = 0;
        if (pos <= swKN) { if (sk < 8) { if (swSpec(pos, q) == 0) {
          if (SWKF[pos] == 1 && SWSV[q] != '-') { go = 1; }
          else { if (swLJ == '_') { if (swEcho(pos, swLV) == 1) { go = 1; } } }
        } } }
        if (go == 1) { pos = pos + 1; sk = sk + 1; }
      }
    }
    if (pos > swKN) { ok = 0; }
    else {
      if (swSpec(pos, q) == 1) { swLV = SWKV[pos]; swLJ = SWKJ[pos]; last = pos; pos = pos + 1; }
      else {
        // (its last consonant written apart: 바ㄹ, 바알, 벼어엉)
        let k = 0;
        if (SWKJ[pos] == '_' && SWSJ[q] != '*') { if (indexOf(SWSJ[q], '_') == 0) { if (swFit(pos, q) == 1) {
          let e = pos + 1, n2 = 0;
          while (n2 < 4 && swEcho(e, SWKV[pos]) == 1) { e = e + 1; n2 = n2 + 1; }
          if (e <= swKN) {
            if (SWKF[e] == 1 && SWKV[e] == '-') { if (indexOf(SWSJ[q], SWKC[e]) > 0) { k = e; } }
            else { if (SWKC[e] == 'ㅇ') { if (swSame(SWKV[e], SWKV[pos]) == 1) { if (indexOf(SWSJ[q], SWKJ[e]) > 0) { k = e; } } } }
          }
        } } }
        if (k > 0) { swLV = SWKV[pos]; swLJ = '!'; last = k; pos = k + 1; } else { ok = 0; }
      }
    }
    t = t + 1;
  }
  if (ok == 0) { last = 0; }
  return last;
}
function swMark(a, b) { let i = a; while (i <= b) { SWMK[i] = 1; i = i + 1; } swHit = 1; }
// are units a .. b free of the words that only look like one
function swFree(a, b) { let r = 1, i = a; while (i <= b) { if (SWPR[i] == 1) { r = 0; } i = i + 1; } return r; }
// a Korean unit
function swKPush(c, v, jo, a, b, f) { SWKC.push(c); SWKV.push(v); SWKJ.push(jo); SWKA.push(a); SWKB.push(b); SWKF.push(f); }
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
      // (l I 1 | ! after a consonant jamo: ㅣ - ㅅl발)
      let li = 0;
      if (SWU.length > 0) { if (indexOf(SWLI, c) > 0) { if (indexOf(HCO, SWU[SWU.length]) > 0) { li = 1; } } }
      if (li == 1) { SWU.push('ㅣ'); SWP.push(i); }
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
    // 3 the units as a line (swS), the same without spaces (swN, SWNU: which unit), with a letter said
    // again once (swC), the Korean ones apart (a consonant jamo and a vowel jamo after it: a syllable)
    swS = SWU2[1]; swN = ''; swC = ''; SWNU = []; SWPR = []; SWCA = []; SWCB = [];
    SWKC = []; SWKV = []; SWKJ = []; SWKA = []; SWKB = []; SWKF = [];
    i = 1;
    while (i <= m2) {
      let c = SWU2[i];
      if (i > 1) { swS = `${swS}${c}`; }
      SWPR.push(0);
      let same = 0;
      if (i > 1) { if (c != ' ') { if (SWU2[i - 1] == c) { same = 1; } } }
      if (same == 1) { SWCB[SWCB.length] = i; }
      else { SWCA.push(i); SWCB.push(i); if (SWCA.length == 1) { swC = c; } else { swC = `${swC}${c}`; } }
      if (c != ' ') { SWNU.push(i); if (SWNU.length == 1) { swN = c; } else { swN = `${swN}${c}`; } }
      i = i + 1;
    }
    i = 1;
    while (i <= m2) {
      let c = SWU2[i];
      if (c == ' ') { swKPush('#', '#', '#', i, i, 0); }
      else {
        let h = indexOf(HSY, c);
        if (h > 0) {
          h = h - 1;
          let jj = mod(h, 28);
          gS = '_'; if (jj > 0) { gS = charAt(SWJO, jj); }
          swKPush(charAt(HCO, idiv(h, 588) + 1), charAt(HVO, idiv(mod(h, 588), 28) + 1), gS, i, i, 0);
        }
        else {
          if (indexOf(HCO, c) > 0) {
            let v = 0;
            if (i < m2) { if (indexOf(HVO, SWU2[i + 1]) > 0) { v = 1; } }
            if (v == 1) { swKPush(c, SWU2[i + 1], '_', i, i + 1, 0); i = i + 1; }
            else { swKPush(c, '-', '_', i, i, 1); }
          }
          else { if (indexOf(HVO, c) > 0) { swKPush('-', c, '_', i, i, 1); } }
        }
      }
      i = i + 1;
    }
    swKN = SWKC.length;
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
    if (swKor == 1) {
      let j = 1;
      while (j <= swKN) {
        let cj = SWKC[j];
        if (cj != '#') {
          let p = 1;
          while (p <= SWSN.length) {
            if (indexOf(SWSC[SWSS[p]], cj) > 0) {
              let last = swWalk(j, p), ok = 1;
              if (last == 0) { ok = 0; }
              if (ok == 1) { if (SWSB[p] == 1) { if (j > 1) { if (SWKC[j - 1] != '#' && SWKF[j - 1] == 0) { ok = 0; } } } }
              if (ok == 1) { if (SWSE[p] == 1) {
                let e = last + 1;
                if (swLJ == '_') { while (swEcho(e, swLV) == 1) { e = e + 1; } }
                if (e <= swKN) { if (SWKC[e] != '#' && SWKF[e] == 0) { ok = 0; } }
              } }
              if (ok == 1) { ok = swFree(SWKA[j], SWKB[last]); }
              if (ok == 1) { swMark(SWP2[SWKA[j]], SWP2[SWKB[last]]); }
            }
            p = p + 1;
          }
        }
        j = j + 1;
      }
    }
    // 6 English, in the Latin units with their spaces, a letter said again once (but not fewer times
    // than in the word: pistol is not piss)
    if (swLat == 1) {
      let mc = SWCA.length;
      w = 1;
      while (w <= SWENG.length) {
        let e = SWENC[w], L = strlen(e), from = 1, hm = mc;
        while (from <= hm) {
          let k = indexOf(substr(swC, from, hm), e);
          if (k == 0) { from = hm + 1; }
          else {
            let a = from + k - 1, ua = SWCA[a], ub = SWCB[a + L - 1], t = 0;
            let ok = swFree(ua, ub);
            while (t < L) { if (SWCB[a + t] - SWCA[a + t] + 1 < charAt(SWENR[w], t + 1) * 1) { ok = 0; } t = t + 1; }
            if (SWEB[w] == 1) {
              if (ua > 1) { if (indexOf(SWLO, SWU2[ua - 1]) > 0) { ok = 0; } }
              if (ub < m2) { if (indexOf(SWLO, SWU2[ub + 1]) > 0) { ok = 0; } }
            }
            if (ok == 1) { swMark(SWP2[ua], SWP2[ub]); }
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
