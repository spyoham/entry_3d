// ===================================================================== commands on a server (v2.1)
// netCmd sets netCmdHit (1: answered here) and netCmdOut. Everybody may use help, list, tell
// (msg, w), me and the commands of the plugins; the rest is for the server's ops (and the owner).
let netCmdHit = 0, netCmdOut = '';
// (v2.4.5) a name typed with other capitals than a player here has: that player's own name
function nickFix(w) {
  let r = w;
  if (isNickWord(w) == 0) {
    let lw = lower(w), j = 1;
    while (j <= NSLOT) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (lower(NNICK[j]) == lw) { r = NNICK[j]; } } } j = j + 1; }
  }
  return r;
}
function netCmd(c) {
  netCmdHit = 1; netCmdOut = '';
  let n = nickFix(cw(2)), sub = lower(cw(2));
  if (plugCommand(c, ' ') == 1) { netCmdOut = ''; }
  else {
    if (cmdFromBlock == 0 && permOk(netNick, c) == 0) {
      netCmdOut = '이 명령어는 서버 관리자만 쓸 수 있습니다 (관리자가 /perm 으로 허락할 수 있습니다)';
      if (cmdLevel(c) == 2) { netCmdOut = '이 명령어는 서버 주인만 쓸 수 있습니다'; }
    }
    else {
      if ((c == 'ban' || c == 'kick' || c == 'deop') && n == SUPER) { netCmdOut = `${SUPER} 님은 모든 서버의 관리자입니다`; }
      else { if (c == 'perm' || c == 'permission' || c == 'perms') { netCmdOut = netPermCmd(sub); }
      else { if (c == 'list') { netCmdOut = netListText(); }
      else { if (c == 'tell' || c == 'msg' || c == 'w') { let t = netClean(wordsFrom(3, CMW.length)); evAdd('w', `${n}^${t}`); netCmdOut = `${n} 님에게 속삭임: ${t}`; }
      else { if (c == 'me') { let t = `* ${netNick} ${netClean(wordsFrom(2, CMW.length))}`; if (netQuiet == 0) { evAdd('c', t); } netCmdOut = netDec(t); }
      else { if (c == 'say') { let t = `[${netNick}] ${netClean(plainText(wordsFrom(2, CMW.length)))}`; if (cmdFromBlock == 2) { t = netClean(plainText(wordsFrom(2, CMW.length))); } if (netQuiet == 0) { evAdd('c', t); } netCmdOut = netDec(t); }
      else { if (c == 'op') { netWish(`op^${n}`); netCmdOut = `${n} 님을 관리자로 만들었습니다`; }
      else { if (c == 'deop') { if (n == shOwner) { netCmdOut = '서버 주인은 관리자에서 뺄 수 없습니다'; } else { netWish(`deop^${n}`); netCmdOut = `${n} 님을 관리자에서 뺐습니다`; } }
      else { if (c == 'ban') { if (n == shOwner) { netCmdOut = '서버 주인은 차단할 수 없습니다'; } else { let why = '관리자의 결정'; if (CMW.length >= 3) { why = netClean(wordsFrom(3, CMW.length)); } netWish(`ban^${n}^${why}`); evAdd('k', `${n}^이 서버에서 차단되었습니다: ${why}`); netCmdOut = `${n} 님을 차단했습니다`; } }
      else { if (c == 'pardon' || c == 'unban') { netWish(`pardon^${n}`); netCmdOut = `${n} 님의 차단을 풀었습니다`; }
      else { if (c == 'kick') { let why = '서버에서 쫓겨났습니다'; if (CMW.length >= 3) { why = netClean(wordsFrom(3, CMW.length)); } evAdd('k', `${n}^${why}`); netCmdOut = `${n} 님을 내보냈습니다`; }
      else { if (c == 'whitelist') { netCmdOut = netWhitelist(sub, cw(3)); }
      else { if (c == 'server') { netCmdOut = netServerCmd(sub); }
      else { if (c == 'plugin' || c == 'plugins' || c == 'pl') { netCmdOut = netPluginCmd(sub); }
      else { netCmdHit = 0; } } } } } } } } } } } } } }
    }
  }
}
// ---------------------------------------------------------------- who may use what (v2.3)
// A command is for everyone (0), the ops (1: the default but for help list tell me) or the owner (2):
// /perm set <command> all|op|owner. A player may be let use one (or every: *) whatever its level:
// /perm allow <nick> <command>, /perm deny <nick> <command>. Kept in the server's settings (R and G).
// The one nickname SUPER is an op of every server, can not be banned, kicked or made no op, and may
// change and delete any server.
const SUPER = '코딩재미있어';
function cmdCanon(c) {
  let r = c;
  if (c == 'teleport') { r = 'tp'; } if (c == 'experience') { r = 'xp'; } if (c == 'msg' || c == 'w') { r = 'tell'; }
  if (c == 'pl' || c == 'plugins') { r = 'plugin'; } if (c == 'unban') { r = 'pardon'; } if (c == 'permission' || c == 'perms') { r = 'perm'; }
  if (c == '?') { r = 'help'; } if (c == 'item') { r = 'replaceitem'; } if (c == 'save-all') { r = 'save'; }
  return r;
}
function cmdLvDefault(c) {
  let r = 1;
  if (c == 'help' || c == 'list' || c == 'tell' || c == 'me' || c == 'seed') { r = 0; }
  return r;
}
function cmdLevel(c) {
  c = cmdCanon(c);
  let r = cmdLvDefault(c), i = 1;
  while (i <= MPC.length) { if (MPC[i] == c) { r = MPL[i]; } i = i + 1; }
  if (c == 'perm' && r < 1) { r = 1; }
  return r;
}
function permOk(nick, c) {
  c = cmdCanon(c);
  let lv = cmdLevel(c), r = 0;
  if (nick == SUPER) { r = 1; }
  if (lv == 0) { r = 1; }
  if (lv == 1) { if (isOp(nick) == 1) { r = 1; } }
  if (lv == 2) { if (nick == shOwner) { r = 1; } }
  let i = 1;
  while (i <= MGN.length) { if (MGN[i] == nick) { if (MGC[i] == c || MGC[i] == '*') { r = 1; } } i = i + 1; }
  return r;
}
let LVNAME = ['모두', '관리자', '주인'];
function netPermCmd(sub) {
  gS = '-';
  let a = lower(cw(3)), b = lower(cw(4));
  if (sub == 'set') {
    let c = cmdCanon(bare(a)), lv = 0 - 1;
    if (b == 'all' || b == 'everyone' || b == '0' || b == '모두') { lv = 0; }
    if (b == 'op' || b == '1' || b == '관리자') { lv = 1; }
    if (b == 'owner' || b == '2' || b == '주인') { lv = 2; }
    if (lv < 0 || strlen(c) == 0) { gS = '/perm set <명령어> all|op|owner'; }
    else { if (c == 'perm' && lv == 0) { gS = '/perm 은 모두에게 열 수 없습니다'; } else { netWish(`pset^${c}^${lv}`); gS = `/${c} 을(를) 쓸 수 있는 사람: ${LVNAME[lv + 1]}`; } }
  }
  if (sub == 'allow' || sub == 'deny') {
    let who = cw(3), c = cmdCanon(bare(b));
    if (strlen(who) == 0 || strlen(c) == 0) { gS = `/perm ${sub} <닉네임> <명령어|*>`; }
    else {
      if (c == 'all') { c = '*'; }
      netWish(`p${sub}^${netClean(who)}^${c}`);
      let what = `/${c}`; if (c == '*') { what = '모든 명령어'; }
      if (sub == 'allow') { gS = `${who} 님이 ${what}을(를) 쓸 수 있게 했습니다`; } else { gS = `${who} 님의 ${what} 허락을 거뒀습니다`; }
    }
  }
  if (sub == 'reset') { netWish('preset'); gS = '명령어 권한을 처음대로 했습니다'; }
  if (sub == 'help') { gS = '/perm · /perm set <명령어> all|op|owner · /perm allow|deny <닉네임> <명령어|*> · /perm reset · /perm check <닉네임>'; }
  if (sub == 'check') {
    let who = cw(3), i = 1, m = 0;
    gS = `${who} 님이 쓸 수 있는 것:`;
    while (i <= ACN.length) { if (permOk(who, ACN[i]) == 1) { gS = `${gS} /${ACN[i]}`; m = m + 1; } i = i + 1; }
    i = 1; while (i <= ACNET.length) { if (permOk(who, ACNET[i]) == 1) { gS = `${gS} /${ACNET[i]}`; m = m + 1; } i = i + 1; }
    if (m == 0) { gS = `${gS} 없음`; }
  }
  if (gS == '-') {
    let i = 1;
    gS = '모두: /help /list /tell /me /seed';
    while (i <= MPC.length) { if (MPL[i] == 0) { gS = `${gS} /${MPC[i]}`; } i = i + 1; }
    gS2 = ' '; i = 1; while (i <= MPC.length) { if (MPL[i] == 2) { gS2 = `${gS2}/${MPC[i]} `; } i = i + 1; }
    if (strlen(gS2) > 1) { gS = `${gS} · 주인만:${gS2}`; }
    gS = `${gS} · 나머지는 관리자`;
    if (MGN.length > 0) { gS = `${gS} · 따로 허락:`; i = 1; while (i <= MGN.length) { let c = `/${MGC[i]}`; if (MGC[i] == '*') { c = '모두'; } gS = `${gS} ${MGN[i]}(${c})`; i = i + 1; } }
    gS = `${gS} · /perm help`;
  }
  return gS;
}
function netListText() {
  let j = 1, n = 0;
  gS = ' ';
  while (j <= NSLOT) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (NSTT[j] >= 1) { n = n + 1; if (n == 1) { gS = NNICK[j]; } else { gS = `${gS}, ${NNICK[j]}`; } } } } j = j + 1; }
  return `접속한 플레이어 ${n}명 (최대 ${shMax}명): ${gS}`;
}
function netWhitelist(sub, n) {
  gS = '-';
  if (sub == 'add') { netWish(`wladd^${n}`); gS = `${n} 님을 화이트리스트에 넣었습니다`; }
  if (sub == 'remove') { netWish(`wldel^${n}`); gS = `${n} 님을 화이트리스트에서 뺐습니다`; }
  if (sub == 'on') { netWish('set^wl^1'); gS = '화이트리스트를 켰습니다 (목록에 있는 사람과 관리자만 들어옵니다)'; }
  if (sub == 'off') { netWish('set^wl^0'); gS = '화이트리스트를 껐습니다'; }
  if (gS == '-') { let i = 1; gS = '화이트리스트:'; while (i <= MWL.length) { gS = `${gS} ${MWL[i]}`; i = i + 1; } }
  return gS;
}
function netServerCmd(sub) {
  gS = '-'; let v = cw(3);
  if (sub == 'motd') { let t = netClean(wordsFrom(3, CMW.length)); netWish(`set^motd^${t}`); gS = `서버 설명을 바꿨습니다: ${t}`; }
  if (sub == 'name') { let t = netClean(wordsFrom(3, CMW.length)); netWish(`set^name^${t}`); gS = `서버 이름을 바꿨습니다: ${t}`; }
  if (sub == 'pvp') { let p = 0; if (lower(v) == 'on' || v == '1' || lower(v) == 'true') { p = 1; } netWish(`set^pvp^${p}`); gS = `플레이어끼리 싸우기: ${p}`; }
  if (sub == 'mode') { let m = 0; if (lower(v) == 'creative' || v == '1') { m = 1; } if (lower(v) == 'adventure' || v == '2') { m = 2; } netWish(`set^mode^${m}`); gS = `새로 오는 사람의 게임 모드: ${MODEKO[m + 1]}`; }
  if (sub == 'max') { netWish(`set^max^${v}`); gS = `최대 인원: ${v}`; }
  // ((v2.7) the owner only: may lava and TNT be put on this server)
  if (sub == 'lava' || sub == 'tnt') {
    if (netNick != shOwner && netNick != SUPER) { gS = '서버 주인만 바꿀 수 있습니다'; }
    else {
      let p = 0; if (lower(v) == 'on' || v == '1' || lower(v) == 'true') { p = 1; }
      netWish(`set^${sub}^${p}`);
      let nm = '용암'; if (sub == 'tnt') { nm = 'TNT'; }
      if (p == 1) { gS = `${nm} 놓기: 허용`; } else { gS = `${nm} 놓기: 금지 (서버 주인만 놓을 수 있습니다)`; }
    }
  }
  if (gS == '-') { let wk = '기본 지형'; if (shFlat != '-') { wk = `평지 ${shFlat}`; } gS = `${shName} · 주인 ${shOwner} · ${wk} · 시드 ${shSeed} · 싸움 ${shPvp} · 용암 ${shLava} · TNT ${shTnt} · 모드 ${MODEKO[shMode + 1]} · 최대 ${shMax} · 화이트리스트 ${shWl} (/server motd|name|pvp|mode|max|lava|tnt)`; }
  return gS;
}
// /plugin add 이름 이벤트[:조건] me|all 명령 ...   /plugin list   /plugin rules 이름   /plugin del 이름 [번호]   /plugin on|off 이름
function netPluginCmd(sub) {
  gS = '-'; let nm = cw(3);
  if (sub == 'add') {
    let ev = lower(cw(4)), who = lower(cw(5)), cond = '*', c = indexOf(ev, ':');
    if (c > 0) { cond = substr(ev, c + 1, strlen(ev)); ev = substr(ev, 1, c - 1); }
    if (who != 'me' && who != 'all') { gS = '대상은 me(일어난 사람) 또는 all(모두)입니다'; }
    else { if (CMW.length < 6) { gS = '명령이 없습니다: /plugin add 이름 이벤트[:조건] me|all /명령'; }
    else {
      let cmd = netClean(wordsFrom(6, CMW.length));
      netWish(`padd^${netClean(nm)}^${ev}^${netClean(cond)}^${who}^${cmd}`);
      gS = `플러그인 ${nm}: ${ev}(${cond}) 때 ${who} ${cmd}`;
    } }
  }
  if (sub == 'del' || sub == 'remove') { let k = 0; if (CMW.length >= 4) { k = cw(4) * 1; } netWish(`pdel^${nm}^${k}`); gS = `플러그인 ${nm}의 규칙을 지웠습니다`; }
  if (sub == 'on') { netWish(`pon^${nm}`); gS = `플러그인 ${nm}을(를) 켰습니다`; }
  if (sub == 'off') { netWish(`poff^${nm}`); gS = `플러그인 ${nm}을(를) 껐습니다`; }
  if (sub == 'rules') {
    let i = 1, m = 0;
    while (i <= PLN.length) { if (PLN[i] == nm) { m = m + 1; cmdOut(`${m}. ${PLE[i]}:${PLC[i]} ${PLT[i]} ${PLX[i]}`); } i = i + 1; }
    gS = `플러그인 ${nm}: 규칙 ${m}개`;
  }
  if (sub == 'help') { gS = '/plugin add 이름 이벤트[:조건] me|all /명령 · 이벤트 join quit chat break place command timer death respawn · {player} {x} {y} {z} {msg} {server} {online}'; }
  if (gS == '-') {
    let i = 1;
    gS = '플러그인:';
    NMW = [];
    while (i <= PLN.length) {
      let seen = 0, j = 1;
      while (j <= NMW.length) { if (NMW[j] == PLN[i]) { seen = 1; } j = j + 1; }
      if (seen == 0) { NMW.push(PLN[i]); let st = '꺼짐'; if (PLO[i] == 1) { st = '켜짐'; } gS = `${gS} ${PLN[i]}(${st})`; }
      i = i + 1;
    }
    gS = `${gS} · /plugin help`;
  }
  return gS;
}
