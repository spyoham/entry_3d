# 엔트리 GMP v1.0 — 설명서

`엔트리 GMP v1.0.ent`는 **GNU MP(GMP)처럼 큰 수를 다루는 함수 묶음**을 엔트리 블록만으로 만든 작품입니다. 엔트리의 숫자는 2^53(약 9×10^15)을 넘으면 정확도가 깨지는데, 이 작품의 함수를 쓰면 수천~수만 자리 정수·분수·소수를 정확하게 계산할 수 있습니다.

- **mpz**(정수), **mpq**(분수), **mpf**(부동소수) 함수 191개. 이름은 GNU MP와 같습니다(`mpz_add`, `mpz_powm`, `mpf_sqrt`, `mpq_canonicalize` …).
- **데모**: 원주율(Chudnovsky 공식, GMP의 `gmp-chudnovsky.c`와 같은 방법), 밀러-라빈 소수 판정, 다음 소수, 큰 수 계산기.
- 실제 엔트리 엔진(entryjs)에서 시간을 재 가며 최적화했습니다. 예를 들어 π 1000자리는 1.5초, 2^521−1 소수 판정은 15초가 걸립니다.

## 1. 데모 사용법
▶ 시작을 누르면 왼쪽 위 글상자에 메뉴가 나오고, 아래 입력칸에 번호를 넣습니다.

| 번호 | 하는 일 | 입력 예 |
|---|---|---|
| 1 | 원주율 n자리 (10~20000) | `1000` |
| 2 | 소수 판정 + 밀러-라빈 라운드별 과정 | `1000000007`, `M127`(= 2^127−1), `M521` |
| 3 | 입력보다 큰 첫 소수 (`mpz_nextprime`) | `1000000000000`, `M89` |
| 4 | 계산기: 두 수와 연산을 띄어 써서 | `2 ^ 1000`, `1000 !`, `12 g 18`, `123456789 * 987654321` |

- 계산기 연산은 `+ - * / % ^ g(최대공약수) !(팩토리얼)`입니다.
- 긴 결과는 오른쪽 **[결과] 리스트**에 25자리씩 나뉘어 들어갑니다. 리스트를 내려 보며 확인하거나, 엔트리의 리스트 내보내기로 복사할 수 있습니다.
- 왼쪽 아래 **[기록] 리스트**에는 지금까지 한 계산과 걸린 시간이 남습니다.
- 계산하는 동안에는 화면이 멈춘 것처럼 보입니다. 엔트리는 블록을 한 프레임 안에서 끝까지 실행하기 때문입니다(아래 4장).

## 2. 함수 쓰는 법 (GNU MP와 다른 점)
엔트리 함수는 변수를 "참조로" 넘길 수 없어서, **수 하나를 번호(핸들)로 가리킵니다.** 나머지는 GMP와 같습니다.

```
a = mpz_init()                 // GMP: mpz_t a; mpz_init(a);
b = mpz_init_set_str('123456789012345678901234567890', 10)
mpz_mul(a, b, b)               // a = b²
mpz_powm(a, b, a, b)           // 결과 자리 먼저: GMP와 같은 인자 순서
s = mpz_get_str(10, a)         // GMP: mpz_get_str(NULL, 10, a)
p = mpz_probab_prime_p(b, 25)  // 2 확실히 소수, 1 아마도 소수, 0 합성수
```

- **초기화**: `mpz_init`, `mpq_init`, `mpf_init`, `mpf_init2(비트)`, `mpz_init_set_…`은 새 번호를 **돌려주는 값 블록**입니다. 다 쓰면 `mpz_clear(번호)`로 돌려주면 다시 쓰입니다.
- **값 블록과 명령 블록**: GMP에서 `void`인 함수는 명령 블록, 값을 돌려주는 함수(`mpz_cmp`, `mpz_get_str`, `mpz_probab_prime_p`, `mpz_invert`, `mpz_root` …)는 값 블록입니다.
- **문자열**: `mpz_get_str(진법, 수)`, `mpq_get_str(진법, 수)`는 버퍼 인자가 없습니다. 진법은 2~62를 지원하고, 음수 진법은 대문자로 씁니다(GMP와 같음). `mpz_set_str(수, 문자열, 진법)`은 명령 블록이고, 읽지 못하면 변수 `gmp_errno`가 2가 됩니다. 진법 0이면 `0x`·`0b`·`0` 접두어로 진법을 정합니다.
- **mpf_get_str(진법, 자릿수, 수)**: GMP처럼 소수점 없는 숫자만 돌려주고, 지수는 변수 `mpf_exp`에 넣습니다. 값은 `0.숫자 × 10^mpf_exp`입니다. 지금은 10진법만 지원합니다.
- **`_ui`/`_si` 인자**: 엔트리 숫자(2^53 아래 정수)를 받습니다.
- **mpf 정밀도**: `mpf_set_default_prec(비트)`, `mpf_init2(비트)`(새 번호), `mpf_set_prec(번호, 비트)`. 결과는 0 쪽으로 잘립니다(GMP처럼 정확한 반올림은 하지 않음).
- **mpq**: 연산 결과는 늘 기약분수입니다. 직접 분자·분모를 넣었다면 `mpq_canonicalize`를 부르세요(GMP와 같음). `mpq_numref(q)`, `mpq_denref(q)`는 분자·분모의 mpz 번호를 돌려줍니다.
- **소수 판정**: `mpz_probab_prime_p(n, reps)`는 GMP 6.2 이후와 같은 방식입니다. 1000 이하 소수로 나눠 본 뒤 **BPSW**(밑 2 밀러-라빈 + 강한 루카스 검사)를 하고, reps가 24보다 크면 무작위 밑으로 밀러-라빈을 `reps − 24`번 더 합니다. 2^64 아래는 BPSW만으로 확정되므로 2를 돌려줍니다.
- **오류**: 0으로 나누면 `gmp_errno = 1`, 역원이 없으면 3입니다.

### 함수 목록 (191개)
### mpz — 99개

- 명령 블록: `mpz_2fac_ui(r, n)`, `mpz_abs(r, a)`, `mpz_add(r, a, b)`, `mpz_add_ui(r, a, v)`, `mpz_addmul(r, a, b)`, `mpz_addmul_ui(r, a, v)`, `mpz_bin_ui(r, n, k)`, `mpz_bin_uiui(r, n, k)`, `mpz_cdiv_q(q, n, d)`, `mpz_cdiv_q_ui(q, n, v)`, `mpz_cdiv_qr(q, r, n, d)`, `mpz_cdiv_qr_ui(q, r, n, v)`, `mpz_cdiv_r(r, n, d)`, `mpz_cdiv_r_ui(r, n, v)`, `mpz_clear(h)`, `mpz_divexact(q, n, d)`, `mpz_divexact_ui(q, n, v)`, `mpz_fac_ui(r, n)`, `mpz_fdiv_q(q, n, d)`, `mpz_fdiv_q_ui(q, n, v)`, `mpz_fdiv_qr(q, r, n, d)`, `mpz_fdiv_qr_ui(q, r, n, v)`, `mpz_fdiv_r(r, n, d)`, `mpz_fdiv_r_ui(r, n, v)`, `mpz_fib_ui(r, n)`, `mpz_fib2_ui(r, r1, n)`, `mpz_gcd(r, a, b)`, `mpz_gcdext(g, s, t, a, b)`, `mpz_lcm(r, a, b)`, `mpz_lcm_ui(r, a, v)`, `mpz_lucnum_ui(r, n)`, `mpz_mod(r, n, d)`, `mpz_mod_ui(r, n, v)`, `mpz_mul(r, a, b)`, `mpz_mul_2exp(r, a, k)`, `mpz_mul_si(r, a, v)`, `mpz_mul_ui(r, a, v)`, `mpz_neg(r, a)`, `mpz_nextprime(r, a)`, `mpz_pow_ui(r, b, v)`, `mpz_powm(r, b, e, m)`, `mpz_powm_ui(r, b, v, m)`, `mpz_primorial_ui(r, n)`, `mpz_set(r, a)`, `mpz_set_f(z, f)`, `mpz_set_si(r, v)`, `mpz_set_str(r, s, base)`, `mpz_set_ui(r, v)`, `mpz_sqrt(r, a)`, `mpz_sqrtrem(r, rem, a)`, `mpz_sub(r, a, b)`, `mpz_sub_ui(r, a, v)`, `mpz_submul(r, a, b)`, `mpz_submul_ui(r, a, v)`, `mpz_swap(a, b)`, `mpz_tdiv_q(q, n, d)`, `mpz_tdiv_q_ui(q, n, v)`, `mpz_tdiv_qr(q, r, n, d)`, `mpz_tdiv_qr_ui(q, r, n, v)`, `mpz_tdiv_r(r, n, d)`, `mpz_tdiv_r_ui(r, n, v)`, `mpz_ui_pow_ui(r, b, v)`, `mpz_ui_sub(r, v, a)`, `mpz_urandomb(r, st, bits)`, `mpz_urandomm(r, st, n)`
- 값 블록: `mpz_cdiv_ui(n, v)`, `mpz_cmp(a, b)`, `mpz_cmp_si(a, v)`, `mpz_cmp_ui(a, v)`, `mpz_cmpabs(a, b)`, `mpz_cmpabs_ui(a, v)`, `mpz_congruent_p(a, c, d)`, `mpz_divisible_p(n, d)`, `mpz_divisible_ui_p(n, v)`, `mpz_even_p(a)`, `mpz_fdiv_ui(n, v)`, `mpz_gcd_ui(r, a, v)`, `mpz_get_d(a)`, `mpz_get_si(a)`, `mpz_get_str(base, a)`, `mpz_get_ui(a)`, `mpz_init()`, `mpz_init_set(a)`, `mpz_init_set_si(v)`, `mpz_init_set_str(s, base)`, `mpz_init_set_ui(v)`, `mpz_init2(bits)`, `mpz_invert(r, a, m)`, `mpz_jacobi(a, b)`, `mpz_kronecker(a, b)`, `mpz_legendre(a, p)`, `mpz_odd_p(a)`, `mpz_perfect_power_p(a)`, `mpz_perfect_square_p(a)`, `mpz_probab_prime_p(n, reps)`, `mpz_root(r, a, n)`, `mpz_sgn(a)`, `mpz_sizeinbase(a, base)`, `mpz_tdiv_ui(n, v)`

### mpq — 34개

- 명령 블록: `mpq_abs(r, a)`, `mpq_add(r, a, b)`, `mpq_canonicalize(q)`, `mpq_clear(q)`, `mpq_div(r, a, b)`, `mpq_div_2exp(r, a, k)`, `mpq_get_den(z, q)`, `mpq_get_num(z, q)`, `mpq_inv(r, a)`, `mpq_mul(r, a, b)`, `mpq_mul_2exp(r, a, k)`, `mpq_neg(r, a)`, `mpq_set(r, a)`, `mpq_set_d(r, v)`, `mpq_set_den(r, z)`, `mpq_set_f(r, f)`, `mpq_set_num(r, z)`, `mpq_set_si(r, n, d)`, `mpq_set_str(r, s, base)`, `mpq_set_ui(r, n, d)`, `mpq_set_z(r, z)`, `mpq_sub(r, a, b)`, `mpq_swap(a, b)`
- 값 블록: `mpq_cmp(a, b)`, `mpq_cmp_si(a, n, d)`, `mpq_cmp_ui(a, n, d)`, `mpq_cmp_z(a, z)`, `mpq_denref(q)`, `mpq_equal(a, b)`, `mpq_get_d(q)`, `mpq_get_str(base, q)`, `mpq_init()`, `mpq_numref(q)`, `mpq_sgn(q)`

### mpf — 54개

- 명령 블록: `mpf_abs(r, a)`, `mpf_add(r, a, b)`, `mpf_add_ui(r, a, v)`, `mpf_ceil(r, a)`, `mpf_clear(f)`, `mpf_div(r, a, b)`, `mpf_div_2exp(r, a, k)`, `mpf_div_ui(r, a, v)`, `mpf_floor(r, a)`, `mpf_mul(r, a, b)`, `mpf_mul_2exp(r, a, k)`, `mpf_mul_ui(r, a, v)`, `mpf_neg(r, a)`, `mpf_pow_ui(r, a, v)`, `mpf_reldiff(r, a, b)`, `mpf_set(r, a)`, `mpf_set_d(r, v)`, `mpf_set_default_prec(bits)`, `mpf_set_prec(f, bits)`, `mpf_set_prec_raw(f, bits)`, `mpf_set_q(r, q)`, `mpf_set_si(r, v)`, `mpf_set_str(r, s, base)`, `mpf_set_ui(r, v)`, `mpf_set_z(r, z)`, `mpf_sqrt(r, a)`, `mpf_sqrt_ui(r, v)`, `mpf_sub(r, a, b)`, `mpf_sub_ui(r, a, v)`, `mpf_swap(a, b)`, `mpf_trunc(r, a)`, `mpf_ui_div(r, v, a)`, `mpf_ui_sub(r, v, a)`
- 값 블록: `mpf_cmp(a, b)`, `mpf_cmp_d(a, v)`, `mpf_cmp_si(a, v)`, `mpf_cmp_ui(a, v)`, `mpf_cmp_z(a, z)`, `mpf_eq(a, b, bits)`, `mpf_get_d(a)`, `mpf_get_default_prec()`, `mpf_get_prec(f)`, `mpf_get_si(a)`, `mpf_get_str(base, n, a)`, `mpf_get_ui(a)`, `mpf_init()`, `mpf_init_set(a)`, `mpf_init_set_d(v)`, `mpf_init_set_si(v)`, `mpf_init_set_str(s, base)`, `mpf_init_set_ui(v)`, `mpf_init2(bits)`, `mpf_integer_p(a)`, `mpf_sgn(a)`

### gmp — 4개

- 명령 블록: `gmp_randclear(st)`, `gmp_randseed_ui(st, seed)`
- 값 블록: `gmp_randinit_default()`, `gmp_randinit_mt()`

## 3. 어떻게 만들었나
### 수 표현
- 수 하나는 **10^7진법 자리(limb)**의 줄입니다. 낮은 자리가 앞에 오고, 모든 수가 리스트 `M` 하나(힙)에 들어 있습니다.
- 정수 번호 h마다 `zP[h]`(시작 위치), `zN[h]`(쓰는 자리 수, 음수면 음수: GMP의 `_mp_size`와 같은 방식), `zA[h]`(확보한 자리 수)가 있습니다.
- 10^7진법인 까닭: 자리끼리 곱해도 10^14 < 2^53이라 정확하고, 그런 곱을 80개까지 더해도 넘치지 않습니다. 10진법이라 문자열 변환이 그대로 됩니다.
- 계산은 작업 리스트 `S`에서 하고 결과만 `M`으로 옮깁니다.

### 곱셈: 파라미터 타일
- 엔트리 함수의 **파라미터 읽기는 O(1)**이지만, `S[i + 3]` 같은 리스트 읽기는 블록 4개(리스트·덧셈·변수·숫자)가 듭니다.
- 그래서 16자리 × 16자리 곱을 통째로 펼친 함수(`mpn_mul_tile16`, 파라미터 33개)를 만들고, 피연산자 32개를 파라미터로 넘깁니다. 열(column) 31개를 문장 31개로 한 번에 더합니다.
- 곱 하나에 블록 약 5.5개로, 단순한 이중 반복(블록 10개 이상)보다 2.3배 빠릅니다.
- 제곱은 대각선 타일(`mpn_sqr_tile`)과 2ab를 더하는 타일로 곱셈 수를 반으로 줄입니다.
- 첫 타일 행은 더하지 않고 바로 쓰는 변형(`set`, `half`)을 써서 결과 영역을 0으로 비우는 일을 없앴습니다.
- 크기에 따라 4·8·16 타일 중 0 채움 낭비가 가장 적은 것을 고릅니다.
- 112자리(limb) 이상은 **Karatsuba**(GMP의 `mpn_kara_mul_n`처럼 뺄셈 형태), 그 아래는 타일 곱셈입니다.

### 올림 정리
- 곱을 모아 둔 뒤 올림을 한 번에 정리합니다. 자리마다 `몫`·`나머지` 블록(엔트리에서 BigNumber를 거치지 않는 일반 계산) 두 문장으로 하고, 두 지역 변수를 번갈아 써서 4자리씩 펼쳤습니다.

### 나눗셈·제곱근
- 작은 수는 Knuth의 알고리즘 D, 큰 정밀도(120자리 이상)의 mpf 나눗셈과 제곱근은 **Newton 반복**(곱셈만 씀)입니다.

### 모듈러 거듭제곱(`mpz_powm`)
- **Barrett 축소**입니다. 몫 추정에 필요한 위쪽 절반 곱과 나머지에 필요한 아래쪽 절반 곱만 타일로 계산합니다.
- 지수는 2진 창(window) 방법(최대 5비트)으로 처리합니다.
- 모듈러스가 9490만 아래면 엔트리 숫자로 바로 계산합니다.

### 원주율
- Chudnovsky 급수를 **이진 분할**로 합칩니다. P, Q, T를 재귀로 곱해 올라갑니다.
- 마지막에 π = 426880·√10005·Q / T를 mpf로 한 번 계산합니다(GMP 예제 `gmp-chudnovsky.c`와 같은 구조).

### 엔트리에서만 생기는 함정 (만들면서 찾은 것)
- **결과값 함수를 문장으로 쓰면** 작품이 열리지 않거나, 함수 안에서는 그 블록이 실행되지 않습니다. 컴파일러가 막도록 했습니다.
- 결과값 함수 본문이 비어 있으면 한 프레임이 늦어집니다. 컴파일러가 빈 본문에 아무 일도 하지 않는 `만약` 블록을 넣습니다.
- 비교 블록은 숫자처럼 보이는 문자열을 숫자로 바꾼 뒤 비교합니다. 그래서 `'0' = ' '`가 참입니다(`Number(' ')`가 0). 문자는 `'#' + 글자`로 붙여서 비교합니다.
- `(문자열)의 a번째부터 b번째까지`는 범위를 벗어나면 **오류로 멈추고**, a > b면 둘을 바꿉니다.
- 함수 지역 변수에 빈 문자열을 넣으면 0으로 읽힙니다.
- 초시계는 프레임 사이에만 갱신되므로, 데모는 시간을 잴 때 앞뒤로 한 프레임 기다립니다.

## 4. 시간 비교 (실제 엔트리 엔진, 헤드리스 크롬)
모든 반복에는 **반복 딜레이 제거 블록**(`<이번 반복 건너뛰기>가 아니다 이(가) 될 때까지 기다리기`)이 들어가 있습니다. 그래서 반복이 프레임마다 쉬지 않고 한 프레임 안에서 돕니다.

### 블록 비용 (반복 한 바퀴에 더해지는 시간)
| 블록 | 시간 |
|---|---|
| 반복 한 바퀴 (조건·증가·딜레이 제거 블록) | 4.2 µs |
| 지역 변수 정하기 | 1.2 µs |
| `+ − ×` (BigNumber를 거침, 수 크기와 무관) | 약 1.0 µs |
| `÷` | 2.0 µs |
| `몫`·`나머지` (일반 계산) | 0.6 µs |
| `제곱` | 0.4 µs |
| 리스트 항목 읽기 / 바꾸기 | 0.4 / 1.6 µs |
| 전역 변수 읽기 / **정하기** | 1.0 / **5.6 µs** |
| 함수 호출 (지역 변수 0개 / 6개) | 6 / 20 µs |
| 결과값 함수 (본문이 비면) | **한 프레임 (33 ms)** |

곱셈 안쪽 반복의 방식별 비용 (64×64자리, 곱 하나에):

| 방식 | 시간 |
|---|---|
| 이중 반복 (행 단위) | 11.2 µs |
| 행 단위, 4배 펼침 | 8.9 µs |
| 열 단위(Comba), 8배 펼침 | 7.3 µs |
| 파라미터 타일 8×8 | 3.9 µs |
| **파라미터 타일 16×16** | **3.1 µs** |
| 파라미터 타일 32×32 | 3.6 µs |
| 제곱 타일 16×16 / 32×32 (곱 하나 환산) | 2.0 / 1.7 µs |

### 최적화 단계별 시간
| 단계 | π 1000자리 | M127 판정 | M521 판정 |
|---|---|---|---|
| 처음 (타일 곱셈, Knuth 나눗셈, 밀러-라빈 10번) | 2.95초 | 4.03초 | 84.15초 |
| + 올림 정리 2문장·4배 펼침, 타일 크기 고르기, Barrett 지역 변수 | 1.58초 | 3.91초 | 61.15초 |
| + 0 채우기 없애기, 제곱 2ab 타일 | 1.57초 | 3.49초 | 57.90초 |
| + BPSW (GMP와 같은 판정 방식) | 1.57초 | **0.94초** | **15.23초** |

- **Newton 나눗셈·제곱근** (π 3000자리): Knuth 방식 20.86초 → Newton 7.74초. 그중 √10005가 12.43초 → 1.02초.
  - π 300자리에서도 제곱근은 Newton이 빨라서(0.25초 → 0.07초) 8자리부터 씁니다.
  - 나눗셈은 150자리 근처에서 두 방식이 비슷해서 120자리부터 씁니다.
- **Karatsuba** (곱셈 한 번): 384자리 507ms → 373ms, 192자리 133ms → 119ms, 128자리 61ms → 58ms, 64자리는 오히려 느림.
  - 제곱은 학교식 제곱 타일이 곱의 절반만 계산하므로 300자리부터 씁니다.
  - 기본 크기를 32자리로 줄이면 0 채움 때문에 훨씬 느려졌습니다(384자리 729ms).

### 지금 판(v1.0)
| 작업 | 시간 | 내역 |
|---|---|---|
| π 100자리 | 0.19초 | 이진 분할 0.08 · √ 0.05 · 곱셈·나눗셈 0.05 |
| π 1000자리 | 1.49초 | 이진 분할 0.64 · √ 0.24 · 곱셈·나눗셈 0.59 |
| π 3000자리 | 7.47초 | 이진 분할 3.41 · √ 0.82 · 곱셈·나눗셈 3.23 |
| π 10000자리 | 56.75초 | 이진 분할 28.74 · √ 8.73 · 곱셈·나눗셈 19.25 |
| 2^127−1 (39자리) 소수 판정 | 0.95초 | `mpz_probab_prime_p` → 1 |
| 2^521−1 (157자리) 소수 판정 | 15.31초 | `mpz_probab_prime_p` → 1 |
| 2^607−1 (183자리) 소수 판정 | 25.24초 | `mpz_probab_prime_p` → 1 |
| 2^1279−1 (386자리) 소수 판정 | 143.19초 | `mpz_probab_prime_p` → 1 |

곱셈 한 번 (`mpz_mul`, 같은 크기 두 수):

| 자리(limb) | 10진 자릿수 | 곱셈 | 제곱 |
|---|---|---|---|
| 16 | 112 | 2.2 ms | 1.7 ms |
| 32 | 224 | 5.8 ms | 4.7 ms |
| 64 | 448 | 17.3 ms | 13.0 ms |
| 128 | 896 | 59.0 ms | 42.3 ms |
| 256 | 1792 | 209.8 ms | 139.9 ms |
| 512 | 3584 | 750.4 ms | 629.1 ms |

(데모 화면에 나오는 시간은 앞뒤로 한 프레임씩 기다리므로 0.03초쯤 더 깁니다.)

## 5. 시험한 것
- 같은 프로그램을 Node에서 JS로 돌려 **BigInt**와 비교합니다. JS 백엔드도 엔트리처럼 비교 블록·`substring`·`char_at`·지역 변수의 동작을 흉내 냅니다.
  - `test/z.mjs`(mpz 사칙·문자열·진법 4128개)
  - `test/nt.mjs`(powm·제곱근·gcd·역원·야코비·소수·팩토리얼 등 5172개)
  - `test/fq.mjs`(mpf·mpq 867개, Newton 경로 강제 포함)
  - `test/bpsw.mjs`(2^64 근처 전수 비교, 카마이클 수, 밑 2 강한 의사소수 37062개)
  - `test/pi.mjs`(π 3000자리까지 Machin 공식과 비교)
- Karatsuba를 모든 크기에 강제로 써도 같은 결과가 나오는지 확인했습니다(`KARA=2`).
- **실제 엔트리 차분 시험**: `bench/diff.mjs`로 같은 코드를 엔트리와 JS에서 돌려 결과가 같은지 확인했습니다.
- 데모는 헤드리스 엔트리 편집기에 메뉴 입력을 넣어 화면을 찍어 확인했습니다(`bench/ui.mjs`).

## 6. 파일
- 작품: `엔트리 GMP v1.0.ent`
- 소스: `_work/gmp/src/*.js`(EJS: 엔트리 블록으로 컴파일되는 JS 부분집합), 곱셈 타일 생성기 `kernels.mjs`
- 빌드: `cd _work/gmp && node build.mjs out.ent`
- 측정: `bench/full.mjs`(π·소수 판정), `bench/mul.mjs`(곱셈 크기별), `bench/micro.mjs`·`kern*.mjs`(블록 비용), `bench/prof.mjs`(블록 실행 횟수 프로파일)
