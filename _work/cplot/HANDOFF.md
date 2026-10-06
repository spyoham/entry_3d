# 엔트리 복소함수 그래퍼 — 작업 인계 메모

산출물: 루트 `엔트리 복소함수 그래퍼 v<버전>.ent`, `엔트리 복소함수 그래퍼 v<버전> 설명서.md`
빌드: `node build.mjs out.ent` (BENCH=1 재기, BENCH=2 엔진 자체 시험은 `ebench.mjs`, `test/engine.mjs`가 알아서 빌드)

## 요청 (2026-10-06)
1. "복소함수 그래핑계산기 기획해줘" → 기획(v1.0 정의역 색칠+계산기, v1.1 감마·제타·매개변수·영점, v1.2 반복·격자, v2.0 3D 곡면·리만 구)
2. "복잡한 함수가 도저히 순정엔트리로 안되면 tessvm용으로 목표 바꾸고, v2.0목표까지 순차적으로 진행해서 계속 만들어줘"
   → 순정에서 돈다(느림). 순정은 4픽셀 칸까지가 기본, tessvm은 1픽셀. 목표는 바꾸지 않음.

## 파일
- `src/vm.js` 벡터 연산(v_*), `execOp`, `runProg`. `src/compile.js` 식 → 프로그램. `src/ext.js` 뒤 버전이 붙는 자리.
  `src/render.js` 색칠·펜 복제본·단계. `src/main.js` 조작·표시·속도. `src/bench.js` 엔진 안 측정(작품에는 안 들어감).
- `tables.mjs` 빌드 때 표(2의 거듭제곱, 팔레트 OKLCH). `ejs.mjs`는 rt판 사본 + 바뀐 점(아래).
- `sim.mjs` Node 시뮬레이터(스레드·복제본·오브젝트 변수·펜·ask·키·마우스, 펜 → PNG).
- `erun.mjs` 실제 엔트리 엔진(오프라인 편집기) 조작·화면·프로파일. `ebench.mjs` 연산별 µs.
- tessvm: `cd ../tessvm && node trun.mjs ../cplot/x.ent --script ../cplot/test/tess/tour.json --vars budget,rLevel --gpu` (서버 3100이 떠 있어야 함: `node tsrv.mjs`)

## 시험
`node test/vm.mjs`, `node test/render.mjs`, `node test/ui.mjs`, `node test/engine.mjs [entry|tessvm|both]`

## ejs.mjs에서 바꾼 것 (rt판 대비)
- JS 백엔드: `obj$name`(오브젝트 변수)은 `R.self[...]`로 — 복제본마다 따로. `/`는 `R.div`(소수 20자리 반올림 흉내).
- 반복이 없는 함수는 상수 풀을 만들지 않음(`execOp`처럼 비교만 많은 함수가 호출마다 수십 µs를 썼음).

## 엔진에서 알아낸 것
- **나눗셈 20자리**: 엔트리 DIVIDE는 `BigNumber.dividedBy`(DECIMAL_PLACES 20). tessvm `divNum`도 0.001 미만 몫을 `toFixed(20)`. → `M_div`.
- **함수 지역 변수는 NaN을 못 담음**(`value || 0`), `''`도 0. 시뮬레이터도 그렇게 흉내 냄.
- **복제본 위치**: 만든 엔티티 바로 아래(그 엔티티의 펜 획보다도 아래). tessvm도 같음. → 복제본은 원본만 만든다.
- **글상자**: `lineBreak: false` + 왼쪽 정렬이면 x가 왼쪽 끝이고 배경이 글 크기에 맞음(두 엔진 같음). `lineBreak: true`는 글의 세로 위치가 엔진마다 다름.
- **PLUS에 지수 표기 숫자 글자 금지**: `x + 1e-25`는 글자 이어 붙이기가 된다(`isNumber`가 `1e-25`를 숫자로 안 봄). 곱셈·뺄셈·비교는 괜찮음.
- 순정(헤드리스 편집기) 비용: 칸당 채우기 12 + 연산(add 19, mul 31, div 87, exp 86, ln 57, sin 102, tan 137 µs) + 색칠 90. 함수 호출 약 40µs.
  프로파일: 인터프리터(Scope 생성, getParams) 45%, 캔버스 45%. 펜 획은 프레임마다 다시 그려짐(획당 0.7~1µs).
- tessvm: 칸당 약 10µs(예제 1). 획이 있어도 쉴 때 비용 없음. `redrawPen`은 그 오브젝트의 획 전부를 다시 봄 → 띠 나누기.
- 헤드리스 편집기가 안 뜨면 `entry-vibe-coding/public/lib/entry-tool/dist/`가 비었는지 볼 것(`.setup-cache/entry-tool/dist`에서 복사).
- Bash 도구의 heredoc 안 `\n`은 줄바꿈이 된다. 소스에 `\n` 글자를 넣을 때는 `String.fromCharCode(92)`.

## 해 봤다가 그만둔 것 / 다음 후보
- 순정 가속: 레지스터를 리스트 하나씩으로(색인 덧셈 제거), 반복 2~4배 펼침 — 각각 10~20%로 추정, 안 함.
- 줄 사이 보간으로 칸 수 줄이기 — 안 함.

---

# v1.1 (2026-10-06) — 감마·제타, 영점·극 찾기, a와 t

- `src/ext.js`: `v_gamma`(Lanczos g=7 + 반사), `v_zeta`(Borwein 16/32/64항 + 함수 방정식), 이름 `gamma` `zeta` `t` `a`.
  `tables.mjs`에 Borwein 가중치(`zetaWeights`, BigInt), `LNK`(ln k), `SPF`(가장 작은 소인수).
  `M_lanczos(gr, gi, x, y, pr, pi)`는 e^(pr + i pi)를 지수에 더해 곱한다(제타 반사에서 큰 감마 × 작은 인수가 중간에 넘치지 않게).
- 매개변수 칸: 상수 칸의 마지막 둘(`PT_OFF`, `PA_OFF`). 스택 종류 1(실행 때 계산). 그림은 `startPass`에서 잡은 값(`pT`, `pAr`, `pAi`)을 조각마다 다시 써넣고, 읽어내기·계산기는 `setParams()`로 최신 값을 쓴다.
- t가 흐르면 프레임마다 `vgen`이 늘어 첫 단계만 되풀이된다. 그런 프레임은 몫을 다 못 채우므로 "몫의 절반 이상 쓴 프레임"을 일한 프레임으로 센다(안 그러면 tessvm에서 16픽셀 칸에 머묾).
- `findNear`: 뉴턴법을 f와 1/f에 한 번씩, 도착점 둘레 원(2픽셀, 16점)의 편각 바퀴 수로 확인. 극을 f에 `z + f/f'`로 찾으면 차분 오차로 2주기에 빠진다 → 세 값을 역수로 바꿔 보통 뉴턴법. h는 걸음의 1/10로 줄임.
- `M_div` 3단: 몫이 1e-153보다 작으면 분모도 1e-150배 한다.
- `fmt`는 `fmtD` 자리(기본 5, 계산기·영점 10). `fmtc`는 `1i` 대신 `i`.
- 시험: vm 186식 13716값, engine 2234수(두 엔진 PASS), ui(클릭·a·t·예제 20개), render.
- 순정에서 `zeta(z)` 4픽셀 칸 그림 약 20초(칸당 약 2ms), tessvm 칸당 약 0.03ms.
- Bash heredoc 대신 편집 스크립트는 Write로 파일을 만들어 `node`로 돌릴 것(이스케이프 문제 없음).

---

# v1.2 (2026-10-06) — 반복(iter, esc), 격자 그림

- `src/ext2.js`: 프로그램 안의 반복. `O_LOOP 반복레지스터 표시레지스터 횟수*2+시작`, 본문, `O_ITSTEP`/`O_ESCSTEP`, `O_ENDLOOP`. `runProg`가 `ENDLOOP`에서 `loopAt`으로 되돌아간다(`live == 0`이면 그만).
  - 컴파일: 이름을 읽자마자 `c_iterBegin`(레지스터 둘, `O_LOOP` 내보냄). 본문 안의 `z`는 반복 레지스터(종류 2), `c`는 레지스터 1(화면 점). 쉼표(연산자 코드 9)는 `(` 까지 연산자를 비우고 `itComma = 1`. 닫는 괄호에서 `c_func3`이 횟수 상수를 꺼내 `PB[itPc]`를 채운다.
  - `esc`의 결과: 달아난 횟수 v(매끄럽게) → 2^frac(v) · e^(i·15°·v). 안 달아나면 0.
- 격자 그림(`gridStep`, 오브젝트 `grid`): 보이는 영역의 Re z = k·u, Im z = k·u (u = 눈금/4) 선마다 96점. 한 프레임에 `budget / 96`개 선. 켜져 있는 동안 색칠은 더 곱게 가지 않는다(`passDone`).
- 예제 25개. `setExample`이 보기를 처음으로 돌리고, `EXN`에 있으면 그 예제의 중심·a를 쓴다.
- 속도 추정: `progCost()`(반복은 횟수만큼, 제타 40, 감마 12)로 식이 바뀔 때 `budget`을 비례 조정.
- 시험: vm 203식 14940값(`iter`/`esc`는 c = -2 ± 1e-9i 제외: 혼돈), engine 2438수, ui(격자, 예제 25개).
- 순정: `esc(z^2+c, 60)` 4픽셀 칸 약 21초. tessvm: 2픽셀 칸까지 약 2.5초.
