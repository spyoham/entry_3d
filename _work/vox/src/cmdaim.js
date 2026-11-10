// ===================================================================== who a command is for (v2.3)
// Before a command runs, its target word is read once here: a selector that is not one, or one
// that finds nobody, stops it with a message; a command for players alone does not touch the
// player when the player is not among its targets (before, /gamemode, /clear, /xp ... changed the
// player whatever the target said). On a server the other players a target finds get the command
// themselves, as `a` events (net.js) with the target made @s and ~ ^ made into this place.
let cmdAimOut = '', aimSent = '';
// a world without commands (made so: menu.js, kept: save.js); its world-making switch
let cheatsOn = 1, cwCheats = 1;
let AIMN = [];
// the word that names the players a command is for (0: none)
function cmdTargetAt(c) {
  let r = 0, n = CMW.length;
  if (c == 'give' || c == 'clear' || c == 'kill' || c == 'title' || c == 'spawnpoint' || c == 'enchant') { r = 2; }
  if (c == 'gamemode') { r = 3; }
  if (c == 'xp' || c == 'experience') { r = 3; }
  if (c == 'effect') { r = 2; if (cw(2) == 'give' || cw(2) == 'clear') { r = 3; } }
  if (c == 'replaceitem') { if (cw(2) == 'entity') { r = 3; } }
  if (c == 'item') { if (cw(2) == 'replace' && cw(3) == 'entity') { r = 4; } }
  if (c == 'tp' || c == 'teleport') { if (n >= 3) { if (isCoordW(cw(2)) == 0) { r = 2; } } }
  if (c == 'execute') { let k = 2, f = 0; while (k < n) { if (f == 0) { if (cw(k) == 'as') { f = k + 1; } } k = k + 1; } if (f == 0) { k = 2; while (k < n) { if (f == 0) { if (cw(k) == 'at') { f = k + 1; } } k = k + 1; } } r = f; }
  if (r > n) { r = 0; }
  return r;
}
// the commands that can be for mobs too (the rest are for players alone)
function aimMobs(c) {
  let r = 0;
  if (c == 'kill' || c == 'tp' || c == 'teleport' || c == 'execute') { r = 1; }
  return r;
}
function isCoordW(w) {
  let r = 0;
  if (isNum(w) == 1) { r = 1; }
  if (strlen(w) > 0) { if (charAt(w, 1) == '~' || charAt(w, 1) == '^') { r = 1; } }
  return r;
}
// a number as a coordinate word that stays where it is (a whole number would be the middle of the block)
function coordW(v) {
  let t = `${Math.round(v * 1000) / 1000}`;
  if (indexOf(t, '.') == 0) { t = `${t}.0`; }
  return t;
}
// the words of the command again (from CMW)
function cmdText() {
  let r = `/${cw(1)}`, i = 2;
  while (i <= CMW.length) { r = `${r} ${cw(i)}`; i = i + 1; }
  return r;
}
// 1: run it here; 0: not here (cmdAimOut says why, or to whom it went)
function cmdAim(c) {
  let r = 1, n = CMW.length;
  cmdAimOut = ''; aimSent = '';
  // /tp to someone: the place now (another player's too), as coordinates
  if (c == 'tp' || c == 'teleport') {
    if (n == 2 || n == 3) {
      let dw = cw(n);
      if (isCoordW(dw) == 0) {
        selParse(dw);
        let fx = 0, fy = 0, fz = 0, got = 0;
        if (selN > 0) { let e = SEL[1]; got = 1; if (e > 0) { fx = EX[e]; fy = EY[e]; fz = EZ[e]; } else { fx = px; fy = py; fz = pz; } }
        else { if (SELR.length > 0) { let j = SELR[1]; got = 1; fx = NPX[j]; fy = NPY[j]; fz = NPZ[j]; } }
        if (got == 0) { r = 0; cmdAimOut = aimNone(dw); }
        else { CMW.removeAt(n); CMW.push(coordW(fx)); CMW.push(coordW(fy)); CMW.push(coordW(fz)); n = CMW.length; }
      }
    }
  }
  let ti = 0;
  if (r == 1) { ti = cmdTargetAt(c); }
  if (ti > 0) {
    let tw = cw(ti);
    selParse(tw);
    if (selBad == 1) { r = 0; cmdAimOut = `알 수 없는 대상입니다: ${tw} (@s @p @a @r @e 또는 이름)`; }
    else {
      if (selN == 0 && SELR.length == 0) { r = 0; cmdAimOut = aimNone(tw); }
      else {
        // the other players: the command with them as @s, and ~ ^ as this place
        if (SELR.length > 0) {
          AIMN = [];
          let q = 1;
          while (q <= SELR.length) { AIMN.push(NNICK[SELR[q]]); q = q + 1; }
          let keep = tw;
          CMW[ti] = '@s';
          if (c == 'tp' || c == 'teleport' || c == 'spawnpoint') { if (n >= ti + 3) { coords(ti + 1); if (cOk == 1) { CMW[ti + 1] = coordW(cX); CMW[ti + 2] = coordW(cY); CMW[ti + 3] = coordW(cZ); } } }
          let t = netClean(cmdText());
          q = 1;
          while (q <= AIMN.length) { evAdd('a', `${AIMN[q]}^${t}`); if (q == 1) { aimSent = AIMN[q]; } else { aimSent = `${aimSent}, ${AIMN[q]}`; } q = q + 1; }
          CMW[ti] = keep;
        }
        if (selPlayer == 0 && selN == 0) { r = 0; }
        if (selPlayer == 0 && aimMobs(c) == 0) { r = 0; }
        // (here the player alone, as the target found it: @r and @p picked once)
        if (r == 1 && selPlayer == 1 && aimMobs(c) == 0) { CMW[ti] = '@s'; }
        if (r == 0) { if (strlen(aimSent) > 0) { cmdAimOut = `${aimSent} 님에게 보냈습니다`; } else { cmdAimOut = `플레이어에게만 쓰는 명령어입니다: ${tw}`; } }
      }
    }
  }
  return r;
}
function aimNone(w) {
  let r = `대상을 찾지 못했습니다: ${w}`;
  if (netSrv > 0) { if (charAt(w, 1) != '@') { r = `접속해 있지 않은 플레이어입니다: ${w}`; } }
  return r;
}
