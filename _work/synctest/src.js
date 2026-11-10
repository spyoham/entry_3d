// ===================================================================== Entry Sync 저장 시험 (판 VER)
// Is what Entry Sync keeps for a work (the ?! lists of Block World's servers) still there after
// the work is overwritten with a new version? v1 writes known values; the work is overwritten
// with v2 the way a new version is put up; v2 reads them and says what is left.
// The names are Block World's own (?!m1 ?!m2 ?!e1 ?!gone), so it must be a work of its own.
let SY_ = 0;
let SY_m1 = [], SY_e1 = [], SY_gone = [];
let SY_m2 = [M2INIT];
let SY_시험값 = 0;
let DQ_시험값 = 0;
let gS = '', gR = '', gL = '', waitT = 0, upT = 0, msgT = 0, msg = ' ';

// what v1 wrote: a number c, the same in every place
function record() {
  let c = rand(1000, 9999);
  SY_m1 = [];
  SY_m1.push(`H^저장 시험^${nickname()}^${c}`); SY_m1.push(`${c}`); SY_m1.push(`판 ${VER}에서 ${dateHour()}시 ${dateMin()}분`);
  SY_m2 = []; SY_m2.push(`판 ${VER}이 서버에 쓴 값 ${c}`);
  SY_e1 = [];
  let i = 1;
  while (i <= 50) { SY_e1.push(i); i = i + 1; }
  SY_gone = []; SY_gone.push('지운 서버');
  SY_시험값 = c; DQ_시험값 = c;
  msg = `기록했습니다: 표지 ${c}`; msgT = 6;
}
function wipe() {
  SY_m1 = []; SY_m2 = []; SY_e1 = []; SY_gone = []; SY_시험값 = 0; DQ_시험값 = 0;
  msg = '모두 비웠습니다'; msgT = 4;
}
function mark(ok) {
  let r = '✕ 사라짐';
  if (ok == 1) { r = '○ 남음'; }
  return r;
}
function report() {
  let code = 0, mOk = 0, eOk = 0, vOk = 0, dOk = 0, gOk = 0, sum = 0, i = 1, n = 0;
  if (SY_m1.length >= 3) { if (indexOf(SY_m1[1], 'H^저장 시험^') == 1) { mOk = 1; code = SY_m1[2] * 1; } }
  while (i <= SY_e1.length) { sum = sum + SY_e1[i] * 1; i = i + 1; }
  if (SY_e1.length == 50 && sum == 1275) { eOk = 1; }
  if (code > 0) { if (SY_시험값 == code) { vOk = 1; } if (DQ_시험값 == code) { dOk = 1; } }
  if (SY_gone.length == 1) { if (SY_gone[1] == '지운 서버') { gOk = 1; } }
  n = mOk + eOk + vOk + gOk;
  gS = `Entry Sync 저장 시험 · 판 ${VER}\n`;
  if (SY_ == 1) { gS = `${gS}연결: 됨\n\n`; } else { gS = `${gS}연결: 안 됨 (Entry Sync 확장을 켜고 엔트리에 로그인한 뒤 다시 시작하세요)\n\n`; }
  gS = `${gS}표지 (?!m1에서): ${code}\n`;
  gS = `${gS}?!m1 서버 목록 (3줄)      ${mark(mOk)}  (${SY_m1.length}줄)\n`;
  gS = `${gS}?!e1 블록 기록 (50개)     ${mark(eOk)}  (${SY_e1.length}개)\n`;
  gS = `${gS}?!시험값 변수              ${mark(vOk)}  (${SY_시험값})\n`;
  gS = `${gS}?!gone 지운 서버 목록      ${mark(gOk)}  (${SY_gone.length}개)\n`;
  gS = `${gS}??시험값 (정지할 때 저장)  ${mark(dOk)}  (${DQ_시험값})\n`;
  gL = '(비어 있음)';
  if (SY_m2.length >= 1) { gL = `${SY_m2[1]}`; }
  gS = `${gS}?!m2 (파일의 시작값이 다름): ${gL}\n\n`;
  if (SY_ != 1) { gR = '판단할 수 없습니다: 연결되지 않았습니다'; }
  else {
    if (VER == 1) {
      if (n == 4) { gR = '기록됨. 이제 정지하고 이 창을 닫은 뒤(방이 비어야 저장됩니다) 같은 작품을 판 2로 덮어쓰세요'; }
      else { gR = '1을 누르면 기록합니다'; }
    } else {
      if (n == 4) { gR = '결론: 새 판으로 덮어써도 서버(맵) 기록이 남습니다'; }
      else { if (n == 0) { gR = '결론: 새 판으로 덮어쓰니 서버(맵) 기록이 사라졌습니다'; } else { gR = `결론: 일부만 남았습니다 (4가지 중 ${n}가지)`; } }
    }
  }
  gS = `${gS}${gR}\n\n1 기록하기 · 0 모두 비우기`;
  if (msgT > 0) { gS = `${gS}\n${msg}`; }
}
on('start', 'txt', function () {
  write('Entry Sync를 기다리는 중...');
  // (the room's values come a few seconds after the extension is on)
  waitT = 0;
  while (waitT < 7) { waitSec(0.5); waitT = waitT + 0.5; write(`Entry Sync에서 방의 기록을 받는 중... ${7 - waitT}초`); }
  for (;;) {
    report();
    write(gS);
    waitSec(0.5);
    if (msgT > 0) { msgT = msgT - 0.5; }
  }
});
on('key:49', 'txt', function () { if (waitT >= 7) { record(); } });
on('key:48', 'txt', function () { if (waitT >= 7) { wipe(); } });
