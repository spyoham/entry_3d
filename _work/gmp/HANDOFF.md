# 엔트리 GMP — 작업 인계 메모 (2026-10-02, v1.0)

산출물: 루트 `엔트리 GMP v1.0.ent`, 설명서 `엔트리 GMP v1.0 설명서.md` (설명서 원본은 `doc.md`에서 `node mkdoc.mjs`로 채움)
빌드: `node build.mjs out.ent`

## 구조
- `ejs.mjs`: 레이싱의 EJS 컴파일러 복사본 + 바뀐 점
  - 결과값 함수를 문장으로 쓰면 오류(엔트리에서 로드 실패/실행 안 됨)
  - 빈 함수 본문에 `만약 <거짓>` 하나(빈 결과값 함수는 한 프레임 늦음)
  - JS 백엔드 비교는 `R.cmp`(엔트리처럼 숫자 모양 문자열을 숫자로: `'0' == ' '`)
  - 내장 함수: `sqr`(제곱 블록), `Math.log`, `timerHide`
- `lib.mjs`: 소스 순서와 Node 런타임(엔트리처럼 substring/char_at 범위 밖이면 예외, PLUS 규칙)
- `kernels.mjs`: 곱셈 타일·그리드 생성(4/8/16; add/set/half/dbl; hi/lo 잘린 곱)
- `src/mpn.js` 힙·작업 리스트·올림 정리, `kara.js` Karatsuba, `mpz.js`, `numth.js`(powm Barrett, BPSW, 제곱근…), `mpf.js`(Newton 나눗셈·제곱근), `mpq.js`, `setup.js`, `demo_calc.js`(π), `demo_ui.js`(메뉴)
- 임시 핸들 `gmp_t1..t9`는 함수마다 겹치지 않게 골라 씀(numth.js 주석 참고). 새 함수에서 쓸 때 호출 사슬에서 같은 번호를 쓰는지 꼭 확인.

## 시험
- `test/z.mjs`, `nt.mjs`, `fq.mjs`(NEWTON=3), `bpsw.mjs`, `pi.mjs`; `KARA=2 KBASE=16`로 Karatsuba 강제
- 실제 엔트리: `bench/diff.mjs snippet.js`(엔트리 vs JS), `bench/full.mjs`(PI=, MR= 환경 변수), `bench/mul.mjs`, `bench/prof.mjs <ent>`(블록 횟수), `bench/ui.mjs <ent> '[["1","200"]]'`(메뉴 입력 + 캡처)
- `erun.mjs`는 초시계 블록을 performance.now로 바꿔 잼(엔트리 초시계는 프레임 사이에만 움직임)

## 다음 후보
- mpf_get_str/set_str의 10진법 외 진법
- π: GMP처럼 이진 분할에서 공약수 제거(체), 나눗셈 마지막 곱을 Karp-Markstein로
- 곱셈: Toom-3(1000자리 이상)
