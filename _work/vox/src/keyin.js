// ===================================================================== the typed line: Korean and Tab (v2.2)
// tessvm reads the keys by where they sit (event.code), so the line gets the Latin key whatever
// the system's input method says. The 2-set Korean layout is put together here: 한/영 (or Alt)
// switches, the syllable being made is hcC (first consonant 0..18) hcV (vowel 0..20) hcJ (last
// consonant 1..27, 0 none), -1 for none. A whole syllable is HSY's (11172, made by the build).
let hanMode = 0, hcC = 0 - 1, hcV = 0 - 1, hcJ = 0, hcS = '';
const HCO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', HVO = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
// A..Z: a consonant by its first-consonant number, a vowel 100 + its number (HKS: with Shift)
let HKN = [6, 117, 14, 11, 3, 5, 18, 108, 102, 104, 100, 120, 118, 113, 101, 105, 7, 0, 2, 9, 106, 17, 12, 16, 112, 15];
let HKS = [6, 117, 14, 11, 4, 5, 18, 108, 102, 104, 100, 120, 118, 113, 103, 107, 8, 1, 2, 10, 106, 17, 13, 16, 112, 15];
// a first consonant as a last one (0: it cannot be: ㄸ ㅃ ㅉ)
let HCJ = [1, 2, 4, 7, 0, 8, 16, 17, 0, 19, 20, 21, 22, 0, 23, 24, 25, 26, 27];
// a last consonant: the last one it leaves when split (0: it is one), and its final sound as a first consonant
let HJA = [0, 0, 1, 0, 4, 4, 0, 0, 8, 8, 8, 8, 8, 8, 8, 0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let HJB = [0, 1, 9, 2, 12, 18, 3, 5, 0, 6, 7, 9, 16, 17, 18, 6, 7, 9, 9, 10, 11, 12, 14, 15, 16, 17, 18];
// a vowel made of two: the first and the second (-1: a single one)
let HVA = [-1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 8, 8, -1, -1, 13, 13, 13, -1, -1, 18, -1];
let HVB = [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 20, -1, -1, 4, 5, 20, -1, -1, 20, -1];

// the syllable being made, as a letter (hcS; '' when none)
function hanStr() {
  hcS = '';
  if (hcC >= 0 && hcV >= 0) { hcS = charAt(HSY, (hcC * 21 + hcV) * 28 + hcJ + 1); }
  else { if (hcC >= 0) { hcS = charAt(HCO, hcC + 1); } else { if (hcV >= 0) { hcS = charAt(HVO, hcV + 1); } } }
}
function hanCommit() {
  if (hcC >= 0 || hcV >= 0) { hanStr(); tline = `${tline}${hcS}`; }
  hcC = 0 - 1; hcV = 0 - 1; hcJ = 0;
}
function hanKey(c, sh) {
  let k = HKN[c - 64];
  if (sh == 1) { k = HKS[c - 64]; }
  if (k < 100) {
    if (hcC >= 0 && hcV >= 0) {
      if (hcJ == 0) {
        if (HCJ[k + 1] > 0) { hcJ = HCJ[k + 1]; } else { hanCommit(); hcC = k; }
      } else {
        // two last consonants that go together (ㄱㅅ ㄴㅈ ㄴㅎ ㄹㄱ ... ㅂㅅ)
        let j = 1, f = 0;
        while (j <= 27) { if (HJA[j] == hcJ && HJA[j] > 0 && HJB[j] == k) { f = j; } j = j + 1; }
        if (f > 0) { hcJ = f; } else { hanCommit(); hcC = k; }
      }
    } else { hanCommit(); hcC = k; }
  } else {
    let v = k - 100;
    if (hcC >= 0 && hcV >= 0 && hcJ > 0) {
      // the last consonant goes over to the next syllable (값 + ㅏ = 갑사)
      let nc = HJB[hcJ];
      if (HJA[hcJ] > 0) { hcJ = HJA[hcJ]; } else { hcJ = 0; }
      hanCommit(); hcC = nc; hcV = v;
    } else {
      if (hcV >= 0) {
        let j = 0, f = 0 - 1;
        while (j <= 20) { if (HVA[j + 1] == hcV && HVB[j + 1] == v) { f = j; } j = j + 1; }
        if (f >= 0) { hcV = f; } else { hanCommit(); hcV = v; }
      } else { hcV = v; }
    }
  }
}
// Backspace takes the syllable apart one letter at a time (1: it did)
function hanBack() {
  let r = 1;
  if (hcJ > 0) { hcJ = HJA[hcJ]; }
  else { if (hcV >= 0) { hcV = HVA[hcV + 1]; }
  else { if (hcC >= 0) { hcC = 0 - 1; } else { r = 0; } } }
  return r;
}
function hanClear() { hcC = 0 - 1; hcV = 0 - 1; hcJ = 0; }

// ---------------------------------------------------------------- Tab: the words that fit
// ACN/ACS: a command and what its words after it are: #p a target (players and @), #i an item,
// #b a block, #m a mob, #e an effect, #g a game rule, #s a structure, #v a biome, #c a command,
// #n a banned name, #o an op, #W whitelist names or players, #l a plugin, #X execute's own;
// other words are the choices, by |. ACNET are the server's (online only).
let ACN = ['give', 'clear', 'kill', 'gamemode', 'defaultgamemode', 'gamerule', 'effect', 'time', 'weather', 'toggledownfall',
  'tp', 'teleport', 'summon', 'setblock', 'fill', 'clone', 'difficulty', 'spawnpoint', 'setworldspawn', 'seed',
  'save-all', 'say', 'me', 'tell', 'msg', 'w', 'list', 'locate', 'locatebiome', 'title',
  'xp', 'experience', 'execute', 'spectate', 'replaceitem', 'item', 'playsound', 'enchant', 'help'];
let ACS = ['#p #i', '#p #i', '#p', 'survival|creative|adventure|spectator #p', 'survival|creative|adventure|spectator', '#g true|false', 'give|clear #p #e', 'set|add|query day|night|noon|midnight', 'clear|rain|thunder', '-',
  '#p #p', '#p #p', '#m ~ ~ ~', '~ ~ ~ #b destroy|keep|replace', '~ ~ ~ ~ ~ ~ #b destroy|hollow|keep|outline|replace #b', '~ ~ ~ ~ ~ ~ ~ ~ ~ replace|masked', 'peaceful|easy|normal|hard', '#p ~ ~ ~', '~ ~ ~', '-',
  '-', '-', '-', '#p', '#p', '#p', '-', '#s', '#v', '#p title|subtitle|actionbar|clear|reset|times',
  'add|set|query #p', 'add|set|query #p', '#X', '#p #p', 'entity #p weapon.mainhand|hotbar.0|hotbar.1|hotbar.2|hotbar.3|hotbar.4|hotbar.5|hotbar.6|hotbar.7|hotbar.8|armor.head|armor.chest|armor.legs|armor.feet #i', 'replace entity #p weapon.mainhand|hotbar.0|armor.head|armor.chest|armor.legs|armor.feet with #i', '-', '#p', '#c'];
let ACNET = ['op', 'deop', 'ban', 'pardon', 'unban', 'kick', 'whitelist', 'server', 'plugin'];
let ACSNET = ['#p', '#o', '#p', '#n', '#n', '#p', 'add|remove|on|off|list #W', 'motd|name|pvp|mode|max on|off|survival|creative|adventure', '-'];
let ACL = [], ACW = [];
let acI = 0, acCyc = 0, acDirty = 1, acBase = '', acPart = '', acLow = '', acT = '', acCmd = '';

// the first letter ('~' for none: charAt past the end is an error)
function ch1(w) {
  let r = '~';
  if (strlen(w) > 0) { r = charAt(w, 1); }
  return r;
}
// the k-th word of a spec (acT; '-' when there is none)
function acTok(spec, k) {
  let i = 1, n = strlen(spec), w = 1, st = 1;
  acT = '-';
  while (i <= n + 1) {
    let sp = 0;
    if (i > n) { sp = 1; } else { if (indexOf(' ', charAt(spec, i)) == 1) { sp = 1; } }
    if (sp == 1) { if (w == k && i > st) { acT = substr(spec, st, i - 1); } w = w + 1; st = i + 1; }
    i = i + 1;
  }
}
// one more word if it starts with what is typed (letters in either case)
function acTry(w) {
  if (ACL.length < 200) {
    let n = strlen(acPart), ok = 0;
    if (n == 0) { ok = 1; }
    else {
      if (strlen(w) >= n) {
        let h = substr(w, 1, n);
        if (h == acPart) { ok = 1; } else { if (lower(h) == acLow) { ok = 1; } }
      }
    }
    if (ok == 1) {
      // (not twice)
      let j = 1;
      while (j <= ACL.length) { if (ACL[j] == w) { ok = 0; } j = j + 1; }
      if (ok == 1) { ACL.push(w); }
    }
  }
}
// a name with spaces is typed with _ (the commands read both)
function acName(nm) {
  if (nm != ' ') { if (strlen(nm) > 0) { acTry(replace(nm, ' ', '_')); } }
}
function acChoices(t) {
  let i = 1, n = strlen(t), st = 1;
  while (i <= n + 1) {
    let cut = 0;
    if (i > n) { cut = 1; } else { if (charAt(t, i) == '|') { cut = 1; } }
    if (cut == 1) { if (i > st) { acTry(substr(t, st, i - 1)); } st = i + 1; }
    i = i + 1;
  }
}
function acPlayers() {
  acTry('@s'); acTry('@p'); acTry('@a'); acTry('@r'); acTry('@e');
  if (ch1(acPart) != '@') {
    if (netSrv > 0) {
      acTry(netNick);
      let j = 1;
      while (j <= NSLOT) { if (j != netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { acTry(NNICK[j]); } } } j = j + 1; }
    } else {
      if (netNickOk() == 1) { acTry(`${nickname()}`); }
      acTry('플레이어');
    }
  }
}
function acCommands() {
  let k = 1;
  while (k <= ACN.length) { acTry(ACN[k]); k = k + 1; }
  if (netSrv > 0) {
    k = 1;
    while (k <= ACNET.length) { acTry(ACNET[k]); k = k + 1; }
    // (the plugins' own commands)
    k = 1;
    while (k <= PLE.length) { if (PLE[k] == 'command') { if (PLO[k] == 1) { acTry(PLC[k]); } } k = k + 1; }
  }
}
function acKind(t) {
  if (t == '#p') { acPlayers(); }
  if (t == '#c') { acCommands(); }
  if (t == '#i' || t == '#b') {
    let id = 1, nmax = NITEM;
    if (t == '#b') { nmax = NBLOCK; acTry('air'); }
    while (id < nmax) {
      let ok = 1;
      if (ITNAME[id + 1] == ' ') { ok = 0; }
      if (id < NBLOCK) { if (BSTATE[id + 1] != 0) { ok = 0; } }
      if (ok == 1) { acTry(ITKEY[id + 1]); acName(ITNAME[id + 1]); }
      id = id + 1;
    }
  }
  if (t == '#m') { let k = 1; while (k <= NMOBT) { if (MKEY[k] != 'netPlayer') { acTry(MKEY[k]); acName(MNAME[k]); } k = k + 1; } }
  if (t == '#e') { let k = 1; while (k <= EFK.length) { acTry(EFK[k]); acName(EFKO[k]); k = k + 1; } }
  if (t == '#g') { let k = 1; while (k <= GRS.length) { acTry(GRS[k]); k = k + 1; } }
  if (t == '#s') { let k = 1; while (k <= STKEY.length) { acTry(STKEY[k]); acName(STNAME[k]); k = k + 1; } }
  if (t == '#v') { let k = 1; while (k <= BKEYS.length) { acTry(BKEYS[k]); acName(BNAMES[k]); k = k + 1; } }
  if (t == '#n') { let k = 1; while (k <= MBAN.length) { acTry(MBAN[k]); k = k + 1; } }
  if (t == '#o') { let k = 1; while (k <= MOP.length) { acTry(MOP[k]); k = k + 1; } }
  if (t == '#l') { let k = 1; while (k <= PLN.length) { acTry(PLN[k]); k = k + 1; } }
}
// the words that fit where the line ends: ACL, the line before the word acBase, the word acPart
function acBuild(line) {
  ACL = []; acI = 0;
  let n = strlen(line), ws = 0, i = 1;
  while (i <= n) { if (indexOf(' ', charAt(line, i)) == 1) { ws = i; } i = i + 1; }
  let isCmd = 0;
  if (ch1(line) == '/') { isCmd = 1; }
  let st = ws + 1;
  if (isCmd == 1 && ws == 0) { st = 2; }
  acBase = ''; acPart = '';
  if (st > 1) { acBase = substr(line, 1, st - 1); }
  if (st <= n) { acPart = substr(line, st, n); }
  // (a command inside: /plugin add ... me /give ...)
  if (ch1(acPart) == '/') { acBase = `${acBase}/`; if (strlen(acPart) > 1) { acPart = substr(acPart, 2, strlen(acPart)); } else { acPart = ''; } }
  acLow = lower(acPart);
  if (isCmd == 0) {
    // chat: the players' names
    if (strlen(acPart) > 0) { acPlayers(); let k = ACL.length; while (k >= 1) { if (ch1(ACL[k]) == '@') { ACL.removeAt(k); } k = k - 1; } }
  } else {
    // the whole words before this one
    ACW = [];
    if (ws > 2) { cmdSplit(substr(line, 2, ws - 1)); let k = 1; while (k <= CMW.length) { ACW.push(CMW[k]); k = k + 1; } }
    let done = ACW.length, s0 = 1, k = 1;
    // execute ... run <a command>; plugin add <name> <event> <who> <a command>
    while (k <= done) {
      let w = lower(ACW[k]), c0 = '';
      if (s0 <= done) { c0 = lower(ACW[s0]); }
      if (w == 'run' && c0 == 'execute' && k > s0) { s0 = k + 1; }
      if (c0 == 'plugin' || c0 == 'pl' || c0 == 'plugins') { if (k == s0 + 1 && w == 'add') { if (done >= s0 + 4) { s0 = s0 + 5; k = s0 - 1; } } }
      k = k + 1;
    }
    let ap = done + 1 - s0;
    if (ap == 0) { acCommands(); }
    else {
      acCmd = lower(ACW[s0]);
      if (ch1(acCmd) == '/' && strlen(acCmd) > 1) { acCmd = substr(acCmd, 2, strlen(acCmd)); }
      let spec = '-';
      k = 1;
      while (k <= ACN.length) { if (ACN[k] == acCmd) { spec = ACS[k]; } k = k + 1; }
      if (netSrv > 0) { k = 1; while (k <= ACNET.length) { if (ACNET[k] == acCmd) { spec = ACSNET[k]; } k = k + 1; } }
      if (acCmd == 'pl' || acCmd == 'plugins') { spec = ACSNET[9]; }
      let prev = lower(ACW[done]);
      if (spec == '#X') {
        if (prev == 'as' || prev == 'at' || prev == 'entity') { acPlayers(); }
        else { if (prev == 'if' || prev == 'unless') { acChoices('entity|block'); }
        else { acChoices('as|at|positioned|rotated|if|unless|run'); } }
      } else {
        if (acCmd == 'plugin' || acCmd == 'pl' || acCmd == 'plugins') {
          if (netSrv > 0) {
            let sub = '';
            if (ap >= 2) { sub = lower(ACW[s0 + 1]); }
            if (ap == 1) { acChoices('add|list|rules|del|on|off|help'); }
            if (ap == 2) { if (sub != 'add') { acKind('#l'); } }
            if (ap == 3) { if (sub == 'add') { acChoices('join|quit|chat|break|place|command|timer|death|respawn'); } }
            if (ap == 4) { if (sub == 'add') { acChoices('me|all'); } }
          }
        } else {
          acTok(spec, ap);
          let t = acT;
          if (t == '#W') { if (prev == 'remove') { let q = 1; while (q <= MWL.length) { acTry(MWL[q]); q = q + 1; } } else { acPlayers(); } }
          else { if (charAt(t, 1) == '#') { acKind(t); } else { if (t != '-') { acChoices(t); } } }
        }
      }
    }
  }
}
// what fits, over the line: the one Tab put in is in [ ]
function acShow() {
  if (ACL.length == 0) { txOff(122); }
  else {
    let s = ' ', k = 1, w = 0;
    if (acI > 3) { k = acI - 2; s = '… '; }
    // (the text box is about 94 half-width letters wide at this size: the rest is left for "Tab:" and "… (n)")
    let more = 1;
    while (k <= ACL.length && more == 1) {
      let it = ACL[k];
      if (k == acI) { it = `[${it}]`; }
      let iw = emOf(it) * 2 + 2;
      if (w + iw > 78 && w > 0) { more = 0; } else { s = `${s}${it}  `; w = w + iw; k = k + 1; }
    }
    if (k <= ACL.length) { s = `${s}… (${ACL.length})`; }
    if (acI == 0) { s = `Tab: ${s}`; }
    tx(122, s, -236, -31, 7, '#a0e0a0', 1);
  }
}
// Tab puts in the first that fits, the next Tab the next one (Shift+Tab back); one alone ends with a space
function acTab(sh) {
  if (acCyc == 1 && ACL.length > 1) {
    if (sh == 1) { acI = acI - 1; if (acI < 1) { acI = ACL.length; } } else { acI = acI + 1; if (acI > ACL.length) { acI = 1; } }
    tline = `${acBase}${ACL[acI]}`;
  } else {
    acBuild(tline);
    if (ACL.length == 1) { tline = `${acBase}${ACL[1]} `; acDirty = 1; }
    else { if (ACL.length > 1) { acI = 1; if (sh == 1) { acI = ACL.length; } tline = `${acBase}${ACL[acI]}`; acCyc = 1; } }
  }
}
