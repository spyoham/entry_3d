# 엔트리 GMP — 작업 인계 메모 (2026-10-03, v1.1)

산출물: 루트 `엔트리 GMP v1.1.ent`, 설명서 `엔트리 GMP v1.1 설명서.md` (v1.0 파일도 그대로 둠).
설명서 원본은 `doc.md`, `node mkdoc.mjs "../../엔트리 GMP v1.1 설명서.md"`로 채움(숫자는 `bench/final.txt`, `bench/p10k.txt`).
빌드: `node build.mjs out.ent`

## v1.1: 순정 엔트리 리스트 5000칸 한도
- playentry의 entryjs(2026-09-21판, `lib/entry-js/dist/entry.min.js?v=260921-…`)는 리스트 `LIST_MAX_LENGTH = 5000`.
  push/insert로 넘기면 `array_.slice(-5000)`(맨 앞이 지워짐) + 경고 토스트, 작품 로드 때도 잘림. 칸 바꾸기는 한도 없음(없는 칸은 오류).
  v1.0은 힙 `M` 하나라 π ~700자리부터 깨지고 토스트 폭주로 멈춤. tessvm은 한도 없음.
- 로컬 편집기 `entry-vibe-coding/public/lib/entry-js/dist/entry.min.js`를 **playentry 최신판으로 바꿔 둠**(원래 것은 `entry.min.js.local-bak`). 엔진 차이를 보려면 둘을 바꿔 가며.
- `paged.mjs`: 소스의 `let M = paged(32, [S, U]);` 한 줄을 `M1..M32` + 도우미로 펼침(소스 글 단계, 그래서 프로파일 줄 번호가 맞음).
  `M[i]`→`M__get`, `M[i]=v`→`M__set`, `M.push`→`M__push`, `M.length`→`M__len`(AST 단계). 도우미: `M__toS/fromS/toU/fromU`(페이지 단위 복사),
  `M__addS`(올림 더하기, 값 함수), `M__fill`, `M__grow`. `GMP_PAGE`, `GMP_PAGES` 환경 변수로 쪽 크기/수를 바꿔 시험.
- 힙: 빈 구간 목록 `FBP/FBN`(best fit, 이웃 합치기, 꼭대기면 `mp_top` 내림). `mp_alloc`은 0으로 안 채움(시험은 `mp_poison`으로 쓰레기 채움).
  힙이 차면 `gmp_errno = 4`, 위치는 `M__CAP + 1`(쓰는 순간 리스트 오류로 멈춤: 조용히 다른 수를 덮지 않게).
  `_mpz_newalloc`(값 안 옮김), `mpz_droplow`(낮은 자리 버리기를 복사 없이), `mpz_shrink`.
- `gmp_trim()`(라이브러리 임시 수 비우기 + 전부 shrink + `gmp_compact`), `gmp_compact()`(주소 순서로 당기기: **계산 도중에 부르면 안 됨** — 함수들이 위치를 지역 변수에 들고 있음).
  π 이진 분할은 d ≤ 5 합치기 뒤 자식 수를 비우고 `gmp_compact_if()`(빈틈 > 1/8). π 20000 최대 힙 64.4k(전에는 86k), 한도 160k. 힙 30k limb 넘을 때만(작은 π에선 당기기가 오히려 느림).
- `S`는 5000칸 이하: 512 limb(`MUL_PIECE`) 넘는 곱은 `mpz_mul_big`(조각 곱을 `M__addS`로 누적, 결과는 `gmp_tm`에 만들고 swap).
  `mpn_kmul`/`mpn_ksqr`는 힙 위치를 받음, 한 덩어리면 8P+66칸. Knuth가 안 들어가는 나눗셈은 `mpz_divrem_newton`(mpf Newton 역수 + 나머지 보정).
  Barrett은 `mpn_bsetup`이 먼저 칸 수를 재서 `b_ok`; 안 되면 `mp_powm_plain`, MR 제곱 루프는 mpz 곱/나머지, Lucas는 -1 → probab_prime_p가 MR 24번.
  한계: powm Barrett ≤ 127 limb(889자리), Lucas ≤ 223 limb(1561자리).
- 선형 힙 루프(`mpn_add/sub/mul_1/divrem_1/mod_1/copyi/copyd`)는 `U`(2048칸)로 1024씩 옮겨 계산, 4 limb 이하는 바로 `M[..]`.
- 고친 버그: `mpz_set_f`가 `mpf_td`(64비트)로 잘라 큰 값이 틀림 → `mpf_load(z, f, 0)`. `mpf_div_school`이 `mpz_tdiv_q`(→ `mpz_div_any`의 `gmp_t6/t7`)를 불러 바깥 나눗셈의 임시 수를 덮던 것 → `mpz_divrem_abs` 직접.
- 데모: 메뉴마다 `ui_reset()`(이전 결과 비우고 `gmp_trim`), 계산기 결과 추정 20만 자리 넘으면 거절(`CALC_MAX`).
- **자릿수 뷰어**(`src/demo_ui.js`의 `vw_*`, 글상자 오브젝트 `viewer`): π·긴 결과를 50자리×15줄로. 키(↑↓ ←→ PgUp/PgDn Home End Enter Esc), 글 끌기, `▓░` 막대 누르기/끌기.
  `▓`와 `░`은 나눔고딕코딩에서 폭이 같음(`█`/`│`는 다름: `bench/glyph` 시험). 뷰어 반복은 핸들러 안의 `for(;;)`(프레임마다 쉼, JS 백엔드는 함수 안 yield 불가).
  컴파일러에 `listShow(L)`/`listHide(L)`(show_list/hide_list) 추가.

## 시간 (playentry 엔진, 헤드리스)
- π 700: v1.0 0.90초 → v1.1 0.97초(같은 엔진). π 1000 1.62초, 3000 7.92초, 10000 75초, 20000 274초(`bench/final.txt`, `bench/p10k.txt`). M127 1.0초, M521 15.3초, M1279 145초(v1.0과 같음).
- 큰 곱은 512 limb 조각의 학교식 조합이라 아주 큰 크기에서 v1.0(한 번에 Karatsuba)보다 느림. 개선 후보: 힙 수준 Karatsuba 한 단계(조각 곱 25→~20개 환산).

## 구조
- `ejs.mjs`: 레이싱의 EJS 컴파일러 복사본 + 바뀐 점
  - 결과값 함수를 문장으로 쓰면 오류(엔트리에서 로드 실패/실행 안 됨)
  - 빈 함수 본문에 `만약 <거짓>` 하나(빈 결과값 함수는 한 프레임 늦음)
  - JS 백엔드 비교는 `R.cmp`(엔트리처럼 숫자 모양 문자열을 숫자로: `'0' == ' '`), 리스트 push/insert는 5000칸 넘으면 예외(`LIST_MAX`)
  - 내장 함수: `sqr`(제곱 블록), `Math.log`, `timerHide`, `listShow`, `listHide`
  - `paged.mjs`로 paged 리스트 펼치기(두 백엔드 모두)
- `lib.mjs`: 소스 순서와 Node 런타임(엔트리처럼 substring/char_at 범위 밖이면 예외, PLUS 규칙)
- `kernels.mjs`: 곱셈 타일·그리드 생성(4/8/16; add/set/half/dbl; hi/lo 잘린 곱)
- `src/mpn.js` 힙·작업 리스트·올림 정리·선형 루프, `kara.js` Karatsuba, `mpz.js`(조각 곱, Newton 나눗셈), `numth.js`(powm Barrett/plain, BPSW, 제곱근…),
  `mpf.js`(Newton 나눗셈·제곱근), `mpq.js`, `setup.js`(임시 수, `gmp_trim`, `gmp_compact`), `demo_calc.js`(π), `demo_ui.js`(메뉴, 뷰어)
- 임시 핸들 `gmp_t1..t9`는 함수마다 겹치지 않게 골라 씀(numth.js 주석 참고). 새 함수에서 쓸 때 호출 사슬에서 같은 번호를 쓰는지 꼭 확인.
  `gmp_tm`은 `mpz_mul_big` 전용, `dv_*`는 `mpz_divrem_newton` 전용, `pw_x`는 `mp_powm_plain` 전용.

## 시험
- `test/z.mjs`, `nt.mjs`, `fq.mjs`(NEWTON=3), `bpsw.mjs`, `bigdiv.mjs`(QUICK=1, CASES='[[a,b]]'), `pi.mjs`(PI_N=1000,20000)
- 조건: `GMP_PAGE=97 GMP_PAGES=400`(쪽 경계 시험; pi 20000은 GMP_PAGES=1700), `MULP=37`, `KARA=2 KBASE=16`, `POISON=`(기본 켜짐)
- 실제 엔트리: `bench/full.mjs`(PI=, MR=, OUT=, TO=), `bench/prof.mjs <ent>`(블록 횟수), `bench/ui3.mjs <ent> '<steps>'`(ask/key/hold/drag/click/shot/state; 화면은 `bench/v_*.png`),
  `bench/ui2.mjs`(긴 계산 중 상태 폴링)
- `erun.mjs`는 초시계 블록을 performance.now로 바꿔 잼(엔트리 초시계는 프레임 사이에만 움직임). Windows에서 서버 띄우기 경로를 고침(`fileURLToPath`).
- tessvm: `_work/tessvm`에서 `node tsrv.mjs` 후 `node trun.mjs ../gmp/gmp.ent --script s.json --vars vw_top`. 키는 `press`가 한 틱 안에 끝나 안 잡힘 → `down`/`wait`/`up`.
  스크립트의 shot 경로는 `C:/...` 꼴(Node가 `/c/...`를 못 찾음).

## 다음 후보
- 힙 수준 Karatsuba(512 limb 넘는 곱), Newton 안의 곱을 위쪽 절반만
- mpf_get_str/set_str의 10진법 외 진법
- π: GMP처럼 이진 분할에서 공약수 제거(체), 나눗셈 마지막 곱을 Karp-Markstein로
- 곱셈: Toom-3(1000자리 이상)
