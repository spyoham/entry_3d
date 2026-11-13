// (v2.9) enchanting as the genre's: 28 charms (ENKEY .. from build.mjs), kept in an item's slot number
// with its damage (d = code x 4096 + damage; an enchanted book's d is the code alone): the code is one
// number of mixed radix, a digit (0 .. top level) for each charm the item's class (ITECL) takes. So
// they go wherever the item goes - chests, the ground, saves, servers - as the damage did.
// The enchanting table (uiMode 11), the anvil (12: mending, joining two, books), the grindstone (takes
// the charms off), /enchant; the beacon (13) and the totem of undying are here too.

let ENL = [], ENA = [], ENB = [], enS = '', enS2 = '', enRs = 1, enSeed = 0;
function enInit() {
  ENL = []; ENA = []; ENB = [];
  let k = 0;
  while (k < 28) { ENL.push(0); ENA.push(0); ENB.push(0); k = k + 1; }
  enSeed = rand(1, 2000000000);
}
function enClass(id) { let r = 0; if (id > 0) { r = ITECL[id + 1]; } return r; }
function enOK(k, c) { let r = 0; if (c > 0) { r = ENOK[(k - 1) * 14 + c]; } return r; }
function enTB(k, c) { let r = 0; if (c > 0) { r = ENTB[(k - 1) * 14 + c]; } return r; }
// the code in d (0: none)
function enCode(id, d) {
  let c = enClass(id), r = 0;
  if (c == 14) { if (id == I_enchantedBook) { r = d; } }
  else { if (c > 0) { r = Math.round(d / 4096); if (r < 0) { r = 0; } } }
  return r;
}
// the damage in d (an old save's charm of v2.8 was a damage below 0: it stays one)
function dmgOf(d) { return d - 4096 * Math.round(d / 4096); }
// the levels of item id with d into ENL[1..28]
function enDec(id, d) {
  if (ENL.length < 28) { enInit(); }
  let c = enClass(id), e = enCode(id, d), k = 1;
  while (k <= 28) {
    ENL[k] = 0;
    if (enOK(k, c) == 1) { let r = ENMAX[k] + 1; ENL[k] = mod(e, r); e = idiv(e, r); }
    k = k + 1;
  }
}
// ENL back into a d for item id with the damage dm
function enEnc(id, dm) {
  let c = enClass(id), e = 0, k = 28;
  while (k >= 1) { if (enOK(k, c) == 1) { e = e * (ENMAX[k] + 1) + Math.min(ENMAX[k], ENL[k]); } k = k - 1; }
  let r = e * 4096 + dm;
  if (c == 14) { r = e; }
  return r;
}
function enLv(id, d, k) { enDec(id, d); return ENL[k]; }
function enHas(id, d) { let r = 0; if (enCode(id, d) > 0) { r = 1; } return r; }
function heldLv(k) { return enLv(INVI[hotSel], INVD[hotSel], k); }
// the armour piece in slot s (37 helmet .. 40 boots)
function armLv(s, k) { return enLv(INVI[s], INVD[s], k); }
function enName(k, l) {
  enS2 = ENKO[k];
  if (ENMAX[k] > 1) { enS2 = `${ENKO[k]} ${romanOf(l)}`; }
}
// the charms of an item as words, into enS
function enDesc(id, d) {
  enDec(id, d);
  enS = '-';
  let k = 1, n = 0;
  while (k <= 28) {
    if (ENL[k] > 0) { enName(k, ENL[k]); if (n == 0) { enS = enS2; } else { enS = `${enS}, ${enS2}`; } n = n + 1; }
    k = k + 1;
  }
}
// k and the levels in ENL: does another charm there exclude it?
function enClash(k) {
  let r = 0, j = 1;
  if (ENX[k] > 0) { while (j <= 28) { if (j != k) { if (ENL[j] > 0) { if (ENX[j] == ENX[k]) { r = 1; } } } j = j + 1; } }
  return r;
}

// ---------------------------------------------------------------- the enchanting table
// a random number of its own, the same each time for one seed (the table's offers stay till used)
function enRnd() { enRs = mod(enRs * 16807, 2147483647); return enRs / 2147483647; }
function enRndI(a, b) { return a + Math.floor(enRnd() * (b - a + 1)); }
let ENGK = [], ENGL = [], enTot = 0;
// the charms the table gives item id for lvl levels (seed s): into ENGK/ENGL
function enGen(id, lvl, s) {
  ENGK = []; ENGL = [];
  enRs = mod(s, 2147483646) + 1;
  let c = enClass(id), ab = ITENC[id + 1];
  if (ab > 0) {
    let m = lvl + 1 + enRndI(0, idiv(ab, 4)) + enRndI(0, idiv(ab, 4));
    m = Math.max(1, Math.round(m * (1 + (enRnd() + enRnd() - 1) * 0.15)));
    // what may come, at which level
    if (ENL.length < 28) { enInit(); }
    let k = 1;
    while (k <= 28) {
      ENA[k] = 0;
      if (enTB(k, c) == 1) { let l = ENMAX[k]; while (l >= 1 && ENP0[k] + ENPS[k] * (l - 1) > m) { l = l - 1; } ENA[k] = l; }
      ENL[k] = 0;
      k = k + 1;
    }
    let more = 1, p = m;
    while (more == 1) {
      // one by weight among those left that nothing taken excludes
      let tot = 0; k = 1;
      while (k <= 28) { if (ENA[k] > 0 && ENL[k] == 0) { if (enClash(k) == 0) { tot = tot + ENW[k]; } } k = k + 1; }
      if (tot == 0) { more = 0; }
      else {
        let v = enRnd() * tot, acc = 0, got = 0; k = 1;
        while (k <= 28) { if (got == 0) { if (ENA[k] > 0 && ENL[k] == 0) { if (enClash(k) == 0) { acc = acc + ENW[k]; if (v < acc) { got = k; } } } } k = k + 1; }
        if (got == 0) { more = 0; } else { ENL[got] = ENA[got]; ENGK.push(got); ENGL.push(ENA[got]); }
        if (enRnd() >= (p + 1) / 50) { more = 0; }
        p = Math.floor(p / 2);
      }
    }
  }
}
let ENCX = 0, ENCY = 0, ENCZ = 0, ENI = 0, ENN = 0, END = 0, ELI = 0, ELN = 0;
let ENC1 = 0, ENC2 = 0, ENC3 = 0, enOptI = 0 - 1, enOptD = 0, enOptS = 0, enHot = 0;
let ENOK1 = 0, ENOL1 = 0, ENOK2 = 0, ENOL2 = 0, ENOK3 = 0, ENOL3 = 0;
function enchOpen(x, y, z) { ENCX = x; ENCY = y; ENCZ = z; enOptI = 0 - 1; uiOpen(11); }
// bookshelves two out round the table, on its level and one up (15 at most)
function enShelves() {
  let n = 0, dx = 0 - 2;
  while (dx <= 2) {
    let dz = 0 - 2;
    while (dz <= 2) {
      if (Math.abs(dx) == 2 || Math.abs(dz) == 2) {
        let dy = 0;
        while (dy <= 1) { if (blockAt(ENCX + dx, ENCY + dy, ENCZ + dz) == I_bookshelf) { n = n + 1; } dy = dy + 1; }
      }
      dz = dz + 1;
    }
    dx = dx + 1;
  }
  return Math.min(15, n);
}
// the three offers for what is in the table (worked out again when it changes)
function enOffers() {
  if (ENI != enOptI || END != enOptD || enSeed != enOptS) {
    enOptI = ENI; enOptD = END; enOptS = enSeed;
    ENC1 = 0; ENC2 = 0; ENC3 = 0; ENOK1 = 0; ENOK2 = 0; ENOK3 = 0;
    if (ENI > 0 && ITENC[ENI + 1] > 0 && enHas(ENI, END) == 0) {
      let b = enShelves();
      enRs = mod(enSeed, 2147483646) + 1;
      let base = enRndI(1, 8) + idiv(b, 2) + enRndI(0, b);
      ENC1 = Math.max(1, idiv(base, 3)); ENC2 = idiv(base * 2, 3) + 1; ENC3 = Math.max(base, b * 2);
      enGen(ENI, ENC1, enSeed + 1); if (ENGK.length > 0) { ENOK1 = ENGK[1]; ENOL1 = ENGL[1]; } else { ENC1 = 0; }
      enGen(ENI, ENC2, enSeed + 2); if (ENGK.length > 0) { ENOK2 = ENGK[1]; ENOL2 = ENGL[1]; } else { ENC2 = 0; }
      enGen(ENI, ENC3, enSeed + 3); if (ENGK.length > 0) { ENOK3 = ENGK[1]; ENOL3 = ENGL[1]; } else { ENC3 = 0; }
    }
  }
}
// offer i taken: i levels and i lapis (as the genre's), the item charmed
function enTake(i) {
  let cost = ENC1, ok = 1, cr = 0;
  if (i == 2) { cost = ENC2; } if (i == 3) { cost = ENC3; }
  if (mod(gameMode, 2) == 1) { cr = 1; }
  if (cost <= 0 || ENI == 0) { ok = 0; }
  if (ok == 1 && cr == 0) {
    if (xpLevel < cost) { ok = 0; msgShow(`경험치 ${cost}레벨이 필요합니다`, 2); }
    else { if (ELI != 119 || ELN < i) { ok = 0; msgShow(`청금석 ${i}개가 필요합니다`, 2); } }
  }
  if (ok == 1) {
    enGen(ENI, cost, enSeed + i);
    let id = ENI;
    if (id == I_book) { id = I_enchantedBook; }
    enDec(id, 0);
    let k = 1;
    while (k <= ENGK.length) { ENL[ENGK[k]] = ENGL[k]; k = k + 1; }
    END = enEnc(id, dmgOf(END)); if (id == I_enchantedBook) { END = enEnc(id, 0); }
    ENI = id;
    if (cr == 0) { xpLevel = xpLevel - i; ELN = ELN - i; if (ELN <= 0) { ELI = 0; ELN = 0; } }
    enSeed = rand(1, 2000000000);
    enDesc(ENI, END); sndPlay(7); msgShow(`마법을 부여했습니다: ${enS}`, 3);
  }
}
function enTableScreen() {
  enOffers();
  enHot = 0;
  let i = 1;
  while (i <= 3) {
    let c = ENC1, k = ENOK1, l = ENOL1, y0 = 80 - (i - 1) * 21;
    if (i == 2) { c = ENC2; k = ENOK2; l = ENOL2; } if (i == 3) { c = ENC3; k = ENOK3; l = ENOL3; }
    let on = 0;
    gS = '-';
    if (c > 0) {
      enName(k, l);
      gS = `${c}레벨 · 청금석 ${i} · ${enS2}…`;
      on = 1;
      if (mod(gameMode, 2) == 0) { if (xpLevel < c || ELI != 119 || ELN < i) { on = 0; } }
    }
    button(-36, y0, 84, y0 - 18, gS, 104 + i, on); if (btnHot == 1) { enHot = i; }
    i = i + 1;
  }
}

// ---------------------------------------------------------------- the anvil
let ANX = 0, ANY = 0, ANZ = 0, AN1I = 0, AN1N = 0, AN1D = 0, AN2I = 0, AN2N = 0, AN2D = 0;
let anOut = 0, anOutD = 0, anCost = 0, anUse = 0, anWhy = '';
function anvilOpen(x, y, z) { ANX = x; ANY = y; ANZ = z; uiOpen(12); anvilMatch(); }
// the charm k's cost a level at the anvil (by its weight: 1 common .. 8 very rare; half from a book)
function enMult(k, book) {
  let r = 1;
  if (ENW[k] == 5) { r = 2; } if (ENW[k] == 2) { r = 4; } if (ENW[k] == 1) { r = 8; }
  if (book == 1) { r = Math.max(1, idiv(r, 2)); }
  return r;
}
// what the two in the anvil make: anOut, anOutD, anCost (levels), anUse (how many of the right one)
function anvilMatch() {
  anOut = 0; anOutD = 0; anCost = 0; anUse = 0; anWhy = '';
  let a = AN1I, b = AN2I;
  if (a > 0 && b > 0) {
    let ca = enClass(a), dur = ITDUR[a + 1], dm = 0, changed = 0, isBook = 0;
    if (dur > 0) { dm = dmgOf(AN1D); }
    enDec(a, AN1D); let k = 1; while (k <= 28) { ENA[k] = ENL[k]; k = k + 1; }
    // mending with its material, a quarter of it each
    let rep = ITREP[a + 1], isMat = 0;
    if (rep > 0) { if (b == rep) { isMat = 1; } } if (rep < 0) { if (ITTAG[b + 1] == 0 - rep) { isMat = 1; } }
    if (isMat == 1 && dur > 0) {
      if (dm > 0) {
        let q = Math.max(1, idiv(dur, 4)), n = 0;
        while (dm > 0 && n < AN2N) { dm = Math.max(0, dm - q); n = n + 1; }
        anUse = n; anCost = n; changed = 1;
      }
    } else {
      if (b == I_enchantedBook) { isBook = 1; }
      if (b == a || isBook == 1) {
        anUse = 1;
        // two of a kind: the life of both and a bit more
        if (b == a && dur > 0) {
          let left = (dur - dm) + (dur - dmgOf(AN2D)) + idiv(dur * 12, 100);
          let dm2 = Math.max(0, dur - left);
          if (dm2 < dm) { dm = dm2; anCost = anCost + 2; changed = 1; }
        }
        enDec(b, AN2D); k = 1; while (k <= 28) { ENB[k] = ENL[k]; k = k + 1; }
        k = 1; while (k <= 28) { ENL[k] = ENA[k]; k = k + 1; }
        k = 1;
        while (k <= 28) {
          if (ENB[k] > 0) {
            if (enOK(k, ca) == 1) {
              if (enClash(k) == 0) {
                let nl = Math.max(ENL[k], ENB[k]);
                if (ENL[k] == ENB[k]) { nl = Math.min(ENMAX[k], ENL[k] + 1); }
                if (nl != ENL[k]) { changed = 1; }
                ENL[k] = nl;
                anCost = anCost + nl * enMult(k, isBook);
              } else { anCost = anCost + 1; }
            } else { anCost = anCost + 1; }
          }
          k = k + 1;
        }
        k = 1; while (k <= 28) { ENA[k] = ENL[k]; k = k + 1; }
      }
    }
    if (changed == 1) {
      k = 1; while (k <= 28) { ENL[k] = ENA[k]; k = k + 1; }
      anOut = a; anOutD = enEnc(a, dm);
      if (anCost >= 40 && mod(gameMode, 2) == 0) { anOut = 0; anWhy = '너무 비쌉니다!'; }
    } else { anWhy = '이 둘로는 만들 수 없습니다'; }
  }
}
// the result taken: the levels paid, the two used, the anvil may wear (12 %)
function anvilTake(toInv) {
  if (anOut > 0) {
    let ok = 1;
    if (mod(gameMode, 2) == 0) { if (xpLevel < anCost) { ok = 0; msgShow(`경험치 ${anCost}레벨이 필요합니다`, 2); } }
    if (ok == 1) {
      let o = anOut, od = anOutD;
      if (toInv == 1) { addItem(o, 1, od); if (addLeft > 0) { dropItem(o, addLeft, od, px, py + 1, pz, 1); } } else { curI = o; curN = 1; curD = od; }
      if (mod(gameMode, 2) == 0) { xpLevel = xpLevel - anCost; }
      AN1I = 0; AN1N = 0; AN1D = 0;
      AN2N = AN2N - anUse; if (AN2N <= 0) { AN2I = 0; AN2N = 0; AN2D = 0; }
      sndPlay(6);
      if (mod(gameMode, 2) == 0) { if (rand(1, 100) <= 12) {
        let b = blockAt(ANX, ANY, ANZ), nb = 0 - 1;
        if (b == I_anvil) { nb = I_anvilChipped; } if (b == I_anvilChipped) { nb = I_anvilDamaged; } if (b == I_anvilDamaged) { nb = 0; }
        if (nb >= 0) { let a0 = netUserAct; netUserAct = 1; setBlock(ANX, ANY, ANZ, nb); netUserAct = a0; if (nb == 0) { msgShow('모루가 부서졌습니다', 2); sndPlay(7); uiClose(); } }
      } }
      anvilMatch();
    }
  }
}
function anvilScreen() {
  // the + and the arrow, the cost
  box(-38, 50, -30, 46, '#8b8b8b'); box(-36, 52, -32, 44, '#8b8b8b');
  box(14, 50, 26, 46, '#8b8b8b'); fillStop(); goto(26, 54); fillColorHex('#8b8b8b'); fillStart(); goto(32, 48); goto(26, 42);
  if (anOut > 0) {
    let c = '#80ff20';
    if (mod(gameMode, 2) == 0 && xpLevel < anCost) { c = '#ff6060'; }
    if (mod(gameMode, 2) == 1) { gS = '크리에이티브: 무료'; } else { gS = `마법 부여 비용: ${anCost}레벨`; }
    tx(108, gS, 84, 26, 8, c, 2);
  } else { if (strlen(anWhy) > 1) { tx(108, anWhy, 84, 26, 8, '#ff6060', 2); } else { txOff(108); } }
}

// ---------------------------------------------------------------- the grindstone: the charms off (curses stay), some experience back
function grindHeld() {
  let id = INVI[hotSel];
  if (enHas(id, INVD[hotSel]) == 1) {
    enDec(id, INVD[hotSel]);
    let k = 1, xp = 0;
    while (k <= 28) { if (ENL[k] > 0 && k != 27 && k != 28) { xp = xp + ENL[k] * 2; ENL[k] = 0; } k = k + 1; }
    let dm = 0; if (ITDUR[id + 1] > 0) { dm = dmgOf(INVD[hotSel]); }
    INVD[hotSel] = enEnc(id, dm);
    if (id == I_enchantedBook) { if (enCode(id, INVD[hotSel]) == 0) { INVI[hotSel] = I_book; INVD[hotSel] = 0; } }
    xpAdd(xp); sndPlay(6); msgShow('숫돌로 마법을 지웠습니다', 2);
  } else {
    if (ITDUR[id + 1] > 0 && dmgOf(INVD[hotSel]) > 0) {
      let d = INVD[hotSel], dm = dmgOf(d);
      INVD[hotSel] = d - dm + Math.max(0, dm - Math.ceil(ITDUR[id + 1] / 4)); xpAdd(2); msgShow('숫돌로 갈았습니다', 2);
    } else { msgShow('손에 든 마법 부여된 것의 마법을 지우거나, 닳은 도구를 갑니다', 2); }
  }
}

// ---------------------------------------------------------------- the effects of the charms
// the armour's protection for a hurt (by its words): the genre's points, 4 % each up to 20
function enEpf(why) {
  let p = 0, s = 37, all = 1, fire = 0, blast = 0, proj = 0, fall = 0;
  if (indexOf(why, '굶주렸') > 0 || indexOf(why, '물에 빠졌') > 0 || indexOf(why, '숨이 막혔') > 0 || indexOf(why, '세계 밖') > 0) { all = 0; }
  if (indexOf(why, '불') > 0 || indexOf(why, '용암') > 0 || indexOf(why, '뜨거') > 0) { fire = 1; }
  if (indexOf(why, '폭발') > 0 || indexOf(why, '터졌') > 0) { blast = 1; }
  if (indexOf(why, '화살') > 0 || indexOf(why, '탄환') > 0 || indexOf(why, '불덩이') > 0) { proj = 1; }
  if (indexOf(why, '떨어졌') > 0 && all == 1) { fall = 1; }
  if (all == 1) {
    while (s <= 40) {
      if (INVI[s] > 0) {
        enDec(INVI[s], INVD[s]);
        p = p + ENL[17];
        if (fire == 1) { p = p + 2 * ENL[18]; } if (blast == 1) { p = p + 2 * ENL[19]; } if (proj == 1) { p = p + 2 * ENL[20]; }
        if (fall == 1) { p = p + 3 * ENL[24]; }
      }
      s = s + 1;
    }
  }
  return Math.min(20, p);
}
// thorns: a mob that hit the player may be hurt back
function thornsHit(e) {
  if (ET[e] > 0) {
    let l = 0, s = 37;
    while (s <= 40) { if (INVI[s] > 0) { l = Math.max(l, armLv(s, 21)); } s = s + 1; }
    if (l > 0) { if (rand(1, 100) <= 15 * l) { EHURT[e] = 0; mobHurt(e, rand(1, 4), EX[e] - px, EZ[e] - pz); } }
  }
}
// what a charmed weapon adds against mob e (sharpness, smite on the undead, bane on spiders)
function enBonus(e) {
  enDec(INVI[hotSel], INVD[hotSel]);
  let r = 0, t = ET[e];
  if (ENL[1] > 0) { r = r + 0.5 * ENL[1] + 0.5; }
  if (ENL[2] > 0) { if (t == M_ZOMBIE || t == M_SKELETON || t == M_WRAITH || t == M_BLACKSKEL) { r = r + 2.5 * ENL[2]; } }
  if (ENL[3] > 0) { if (t == M_SPIDER || t == M_SHELLBUG) { r = r + 2.5 * ENL[3]; } }
  return r;
}
// the experience a mending item drinks first: 2 points of wear each
function mendXp(n) {
  let s = 36;
  while (s <= 40 && n > 0) {
    let k = s; if (s == 36) { k = hotSel; }
    let id = INVI[k];
    if (ITDUR[id + 1] > 0) { if (enLv(id, INVD[k], 12) > 0) {
      let dm = dmgOf(INVD[k]);
      if (dm > 0) { let r = Math.min(dm, n * 2); INVD[k] = INVD[k] - r; n = n - Math.ceil(r / 2); }
    } }
    s = s + 1;
  }
  return n;
}
// unbreaking: of n wear, how much lands (armour 60 % + 40 % / (l + 1), the rest 1 / (l + 1))
function enWear(id, d, n, arm) {
  let l = enLv(id, d, 11), r = n;
  if (l > 0) {
    r = 0;
    let i = 0;
    while (i < n) {
      if (arm == 1) { if (rand(0, 999) < 600 + 400 / (l + 1)) { r = r + 1; } }
      else { if (rand(1, l + 1) == 1) { r = r + 1; } }
      i = i + 1;
    }
  }
  return r;
}
// frost walker: the still water round the feet freezes for a while
let FWX = [], FWY = [], FWZ = [], FWT = [], fwStepT = 0;
function frostStep(dt) {
  fwStepT = fwStepT - dt;
  if (fwStepT <= 0) {
    fwStepT = 0.15;
    if (onGround == 1 && flying == 0 && gameMode != 3 && INVI[40] > 0) {
      let l = armLv(40, 26);
      if (l > 0) {
        let r = 2 + l, y = Math.floor(py - 0.5), dx = 0 - r;
        while (dx <= r) {
          let dz = 0 - r;
          while (dz <= r) {
            if (dx * dx + dz * dz <= r * r) {
              let x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
              if (blockAt(x, y, z) == 7 && blockAt(x, y + 1, z) == 0 && FWX.length < 96) {
                setBlock(x, y, z, 33); FWX.push(x); FWY.push(y + dim * 1000); FWZ.push(z); FWT.push(8 + rand(0, 40) / 10);
              }
            }
            dz = dz + 1;
          }
          dx = dx + 1;
        }
      }
    }
  }
  let k = FWX.length;
  while (k >= 1) {
    FWT[k] = FWT[k] - dt;
    if (FWT[k] <= 0) {
      let y = FWY[k] - dim * 1000;
      if (y >= 0 && y < WY) { if (cOK(FWX[k], FWZ[k]) == 1) { if (blockAt(FWX[k], y, FWZ[k]) == 33) { setBlock(FWX[k], y, FWZ[k], 7); } } }
      FWX.removeAt(k); FWY.removeAt(k); FWZ.removeAt(k); FWT.removeAt(k);
    }
    k = k - 1;
  }
}
// /enchant [target] <charm> [level]: a charm on the item in hand (any one with -f... as the genre: one
// it takes, not past the top level)
function cmdEnchant() {
  let a = 2, out = '';
  if (isSel(cw(a)) == 1) { a = a + 1; }
  let nm = lower(cw(a)), k = 0, j = 1, lv = 1;
  if (charAt(nm, 1) == 'm' && indexOf(nm, 'minecraft:') == 1) { nm = substr(nm, 11, strlen(nm)); }
  while (j <= 28) { if (ENKEY[j] == nm || ENKO[j] == replace(cw(a), '_', ' ')) { k = j; } j = j + 1; }
  if (CMW.length >= a + 1) { lv = Math.floor(cw(a + 1) * 1); }
  let id = INVI[hotSel];
  if (k == 0) { out = '알 수 없는 마법입니다 (/help enchant)'; }
  else {
    if (id == 0) { out = '손에 든 것이 없습니다'; }
    else {
      if (id == I_book) { id = I_enchantedBook; INVI[hotSel] = id; INVD[hotSel] = 0; }
      if (enOK(k, enClass(id)) == 0) { out = `${ITNAME[id + 1]}에는 ${ENKO[k]}을(를) 걸 수 없습니다`; }
      else {
        if (lv < 1 || lv > ENMAX[k]) { out = `${ENKO[k]}의 레벨은 1~${ENMAX[k]}입니다`; }
        else {
          enDec(id, INVD[hotSel]);
          if (enClash(k) == 1) { out = `${ENKO[k]}은(는) 이미 있는 마법과 함께 걸 수 없습니다`; }
          else {
            ENL[k] = lv;
            let dm = 0; if (ITDUR[id + 1] > 0) { dm = dmgOf(INVD[hotSel]); }
            INVD[hotSel] = enEnc(id, dm);
            enName(k, lv); out = `${ITNAME[id + 1]}에 ${enS2}을(를) 걸었습니다`;
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- the beacon
// its pyramid's levels (0 .. 4) of iron, gold, diamond, jade or abyss blocks, and the sky over it
function beaconBase(b) { let r = 0; if (b == 41 || b == 42 || b == 43 || b == I_blockJade || b == I_blockAbyss) { r = 1; } return r; }
function beaconLevel(x, y, z) {
  let lv = 0, go = 1;
  while (go == 1 && lv < 4) {
    let r = lv + 1, yy = y - r, dx = 0 - r;
    if (yy < 0) { go = 0; }
    while (dx <= r && go == 1) { let dz = 0 - r; while (dz <= r && go == 1) { if (beaconBase(blockAt(x + dx, yy, z + dz)) == 0) { go = 0; } dz = dz + 1; } dx = dx + 1; }
    if (go == 1) { lv = lv + 1; }
  }
  return lv;
}
function beaconSky(x, y, z) {
  let r = 1, yy = y + 1;
  while (yy < WY && r == 1) { let b = blockAt(x, yy, z); if (BSOL[b + 1] == 1 && BLOP[b + 1] == 1) { r = 0; } yy = yy + 1; }
  return r;
}
let BCX = [], BCY = [], BCZ = [], bcScan = 1, bcT = 0, BCL = [];
// the beacons: found in the world's log of changes (a beacon is never made by the world itself)
function beaconsStep(dt) {
  let n = 0;
  while (n < 100 && EDB.length > 0) {
    if (bcScan > EDB.length) { bcScan = 1; }
    let b = EDB[bcScan];
    if (b > 0) { if (BUSE[b + 1] == U_BEACON) { if (EDD[bcScan] == dim) { beaconNote(EDX[bcScan], EDY[bcScan], EDZ[bcScan]); } } }
    bcScan = bcScan + 1; n = n + 1;
  }
  bcT = bcT - dt;
  if (bcT <= 0) {
    bcT = 4;
    let k = BCX.length;
    while (k >= 1) {
      let x = BCX[k], y = BCY[k], z = BCZ[k], keep = 0;
      if (cOK(x, z) == 1) {
        let b = blockAt(x, y, z);
        if (BUSE[b + 1] == U_BEACON) {
          keep = 1;
          let lv = beaconLevel(x, y, z);
          if (lv > 0) { if (beaconSky(x, y, z) == 0) { lv = 0; } }
          BCL[k] = lv;
          let a = BAUX[b + 1];
          if (lv > 0 && a > 0) {
            let r = 10 + 10 * lv;
            if (Math.abs(px - x - 0.5) <= r && Math.abs(pz - z - 0.5) <= r && dead == 0) {
              let p = mod(a - 1, 5) + 1, s2 = idiv(a - 1, 5), ef = beaconEffect(p), sec = 9 + 2 * lv, l1 = 1;
              if (s2 == 2 && lv >= 4) { l1 = 2; }
              if (lv >= beaconNeed(p)) { if (fx(ef) <= l1) { if (EFT[ef] < sec) { effectAdd(ef, sec, l1); } } }
              if (s2 == 1 && lv >= 4) { if (fx(5) <= 1) { if (EFT[5] < sec) { effectAdd(5, sec, 1); } } }
            }
          }
        }
      }
      if (keep == 0) { if (cOK(x, z) == 1) { BCX.removeAt(k); BCY.removeAt(k); BCZ.removeAt(k); BCL.removeAt(k); } }
      k = k - 1;
    }
  }
}
function beaconNote(x, y, z) {
  let k = 1, f = 0;
  while (k <= BCX.length) { if (BCX[k] == x && BCY[k] == y && BCZ[k] == z) { f = k; } k = k + 1; }
  if (f == 0 && BCX.length < 24) { BCX.push(x); BCY.push(y); BCZ.push(z); BCL.push(0); bcT = Math.min(bcT, 0.2); }
}
function beaconsReset() { BCX = []; BCY = []; BCZ = []; BCL = []; bcScan = 1; bcT = 0; }
// a power of the beacon (1 speed, 2 haste, 3 resistance, 4 jump boost, 5 strength): the effect, the level it needs
function beaconEffect(p) { let r = 1; if (p == 2) { r = 3; } if (p == 3) { r = 6; } if (p == 4) { r = 4; } if (p == 5) { r = 14; } return r; }
function beaconNeed(p) { let r = 1; if (p == 3 || p == 4) { r = 2; } if (p == 5) { r = 3; } return r; }
// the beam: a light line from the beacon up (where the beacon is seen)
function beaconsDraw() {
  let k = 1;
  while (k <= BCX.length) {
    if (BCL[k] > 0) {
      let x = BCX[k] + 0.5, y = BCY[k] + 1, z = BCZ[k] + 0.5;
      if ((x - camX) * (x - camX) + (z - camZ) * (z - camZ) < viewR2) { if (sightLine(camX, camY, camZ, x, y + 0.2, z) == 1) {
        pkCorner(1, x, y, z); pkCorner(2, x, Math.min(WY + 40, y + 200), z);
        let za = PKZ[1], zb = PKZ[2], ax = PKX[1], ay = PKY[1], bx = PKX[2], by = PKY[2];
        if (za > NEARZ || zb > NEARZ) {
          if (za <= NEARZ) { let t = (NEARZ - za) / (zb - za); ax = ax + (bx - ax) * t; ay = ay + (by - ay) * t; za = NEARZ; }
          if (zb <= NEARZ) { let t = (NEARZ - zb) / (za - zb); bx = bx + (ax - bx) * t; by = by + (ay - by) * t; zb = NEARZ; }
          let sx0 = ax * FOC / za, sy0 = ay * FOC / za, sx1 = bx * FOC / zb, sy1 = by * FOC / zb;
          let dx = sx1 - sx0, dy = sy1 - sy0, l = Math.sqrt(dx * dx + dy * dy);
          if (l > 0.01) {
            let w0 = Math.max(0.6, 0.2 * FOC / za), w1 = Math.max(0.6, 0.2 * FOC / zb);
            let nx = 0 - dy / l, ny = dx / l;
            penAlpha(45);
            fillStop(); goto(sx0 + nx * w0, sy0 + ny * w0); fillColorHex('#c8f0ff'); fillStart(); goto(sx1 + nx * w1, sy1 + ny * w1); goto(sx1 - nx * w1, sy1 - ny * w1); goto(sx0 - nx * w0, sy0 - ny * w0);
            fillStop(); penAlpha(0);
            nFill = nFill + 1;
          }
        }
      } }
    }
    k = k + 1;
  }
}
// the beacon's screen: its level, the powers (a payment from the inventory each change)
let BNX = 0, BNY = 0, BNZ = 0, bnLv = 0, bnP = 0, bnS = 0, bnSel = 0;
function beaconOpen(x, y, z, b) {
  BNX = x; BNY = y; BNZ = z; bnLv = beaconLevel(x, y, z);
  if (bnLv > 0) { if (beaconSky(x, y, z) == 0) { bnLv = 0 - 1; } }
  let a = BAUX[b + 1];
  bnP = 0; bnS = 0; if (a > 0) { bnP = mod(a - 1, 5) + 1; bnS = idiv(a - 1, 5); }
  beaconNote(x, y, z);
  if (bnLv == 0) { msgShow('신호기 아래에 철·금·다이아몬드·비취·심연철 블록으로 피라미드(3×3부터)를 쌓아야 합니다', 3); }
  else { if (bnLv < 0) { msgShow('신호기 위로 하늘이 보여야 합니다', 2.5); } else { uiMode = 13; mouseFree(); txClear(); } }
}
// a payment item in the inventory (iron ingot, gold ingot, diamond, jade, abyss ingot): its slot
function beaconPaySlot() {
  let k = 1, r = 0;
  while (k <= 36) { let i = INVI[k]; if (r == 0) { if (i == I_ingotIron || i == I_ingotGold || i == I_diamond || i == I_jade || i == I_abyssIngot) { r = k; } } k = k + 1; }
  return r;
}
function beaconScreen() {
  penAlpha(40); box(-245, 140, 245, -140, '#000000'); fillStop(); penAlpha(0);
  tx(20, `신호기 · 피라미드 ${bnLv}층 · 범위 ${10 + 10 * bnLv}칸`, 0, 100, 12, '#ffffff', 0);
  tx(21, '1차 능력', -110, 78, 9, '#c0e0ff', 0);
  tx(22, '2차 능력 (4층)', 110, 78, 9, '#c0e0ff', 0);
  bnSel = 0;
  let p = 1;
  while (p <= 5) {
    let y0 = 70 - (p - 1) * 22, on = 0;
    if (bnLv >= beaconNeed(p)) { on = 1; }
    gS = `${EFKO[beaconEffect(p)]} (${beaconNeed(p)}층)`; if (p == bnP) { gS = `▶ ${gS} ◀`; }
    button(-190, y0, -30, y0 - 18, gS, 22 + p, on); if (btnHot == 1) { bnSel = p; }
    p = p + 1;
  }
  let on2 = 0; if (bnLv >= 4 && bnP > 0) { on2 = 1; }
  gS = '재생 I'; if (bnS == 1) { gS = `▶ ${gS} ◀`; }
  button(30, 70, 190, 52, gS, 28, on2); if (btnHot == 1) { bnSel = 11; }
  gS = '1차 능력 II'; if (bnP > 0) { gS = `${EFKO[beaconEffect(bnP)]} II`; } if (bnS == 2) { gS = `▶ ${gS} ◀`; }
  button(30, 48, 190, 30, gS, 29, on2); if (btnHot == 1) { bnSel = 12; }
  gS = '없음'; if (bnS == 0) { gS = `▶ ${gS} ◀`; }
  button(30, 26, 190, 8, gS, 30, on2); if (btnHot == 1) { bnSel = 13; }
  let pay = 1; if (mod(gameMode, 2) == 0) { if (beaconPaySlot() == 0) { pay = 0; } }
  button(-90, -50, 90, -70, '확인 (철·금 주괴, 다이아몬드, 비취, 심연철 주괴 1개)', 31, pay); if (btnHot == 1) { bnSel = 20; }
  button(-90, -76, 90, -94, '닫기', 32, 1); if (btnHot == 1) { bnSel = 21; }
  tx(33, '능력을 고르고 확인을 누르면 지불 아이템 1개를 써서 정합니다 (크리에이티브는 무료)', 0, -110, 7, '#c0c0c0', 0);
}
function beaconInput() {
  if (keyHit(69) == 1 || keyHit(27) == 1) { uiMode = 0; txClear(); lockReq(); }
  else { if (clickLatch == 1) {
    clickLatch = 0;
    if (bnSel >= 1 && bnSel <= 5) { bnP = bnSel; if (bnLv < 4) { bnS = 0; } }
    if (bnSel == 11) { bnS = 1; } if (bnSel == 12) { bnS = 2; } if (bnSel == 13) { bnS = 0; }
    if (bnSel == 21) { uiMode = 0; txClear(); lockReq(); }
    if (bnSel == 20) {
      if (bnP > 0) {
        let ok = 1;
        if (mod(gameMode, 2) == 0) { let s = beaconPaySlot(); if (s == 0) { ok = 0; } else { INVN[s] = INVN[s] - 1; if (INVN[s] <= 0) { INVI[s] = 0; INVN[s] = 0; INVD[s] = 0; } } }
        if (ok == 1) {
          let a = bnP + 5 * bnS, nb = I_beacon, k = 1;
          while (k < NBLOCK) { if (BUSE[k + 1] == U_BEACON && BAUX[k + 1] == a) { nb = k; } k = k + 1; }
          let a0 = netUserAct; netUserAct = 1; setBlock(BNX, BNY, BNZ, nb); netUserAct = a0;
          bcT = 0; sndPlay(7); msgShow(`신호기: ${EFKO[beaconEffect(bnP)]}`, 2);
          uiMode = 0; txClear(); lockReq();
        }
      } else { msgShow('1차 능력을 먼저 고르세요', 1.5); }
    }
  } }
}

// ---------------------------------------------------------------- the totem of undying
// held when a hurt would kill: 1 heart left, regeneration II 45 s, absorption II 5 s, fire resistance 40 s
let totemT = 0, absorb = 0;
function totemSave() {
  let r = 0;
  if (INVI[hotSel] == I_totem) {
    r = 1;
    INVI[hotSel] = 0; INVN[hotSel] = 0; INVD[hotSel] = 0;
    hp = 1; effectsInit();
    effectAdd(5, 45, 2); effectAdd(13, 5, 2); effectAdd(7, 40, 1);
    totemT = 1.6; fireT = 0; sndPlay(7);
    msgShow('불사의 토템이 죽음을 막았습니다!', 3);
    if (netSrv > 0) { evAdd('c', `${netNick}: 불사의 토템을 썼습니다`); }
  }
  return r;
}
function totemDraw(dt) {
  if (totemT > 0) {
    totemT = totemT - dt;
    let a = Math.min(1, totemT / 0.8);
    penAlpha(Math.round(100 - 60 * a)); box(-245, 140, 245, -140, '#f0d020'); fillStop(); penAlpha(0);
    let s = 6 + (1.6 - totemT) * 10;
    drawIcon(I_totem, 0, 20 + (1.6 - totemT) * 20, s);
  }
}

// a book with one charm at random (any but the curses, a level at random)
function enRandomBook() {
  if (ENL.length < 28) { enInit(); }
  let k = rand(1, 26), j = 1;
  while (j <= 28) { ENL[j] = 0; j = j + 1; }
  ENL[k] = rand(1, ENMAX[k]);
  return enEnc(I_enchantedBook, 0);
}
