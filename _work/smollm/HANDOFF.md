# SmolLM2-135M in Entry — 작업 인계 메모

산출물: `C:\Users\spyoh\entry_3d\SmolLM2-135M (2.67비트).ent` + `SmolLM2-135M 사용설명서.md` (가중치 qat267_100m.pt → export267, ppl 33.2; 2비트판 데이터는 export2, ppl 50)

**미검증**: 최종 빌드의 수정 두 가지(decodeTok 누적변수를 전역으로 = 화면에 0이 끼던 버그, IT 끝 여백)는 Node 시뮬레이터로만 확인. 실제 엔트리에서는 수정 전 2비트 빌드로 "Once upon a time, the first time I"까지 참조와 일치함을 확인. 함수 지역변수는 빈 문자열을 0으로 읽는다(value || 0).

## 한 줄 요약
HuggingFace SmolLM2-135M(Llama 구조, 30층, d=576, 어휘 49152)을 **2비트(가중치 4개 = 1문자)**로
양자화 인지 학습(QAT)한 뒤, 엔트리 블록만으로 추론한다. 핵심은 **덧셈을 하지 않는 행렬곱**:
테이블 값을 "길이가 값인 문자열"로 만들고 `(A)와 (B) 합치기`로 이어 붙인 뒤 `(글자)의 길이`를 잰다.

## 파이프라인 (이 폴더)
```
py -3.12 qat.py --pattern attn=2,mlp=2,emb=2 --keep 0.0005 --tokens 20e6 --out qat2.pt   # GPU QAT (KD)
py -3.12 export.py qat2.pt                  # -> export/*.Q.u8 *.S.f32 *.LV.f32 *.K.i32 *.KV.f32, manifest/norms.json
node --max-old-space-size=8000 build.mjs out.ent                  # EJS 생성 + 컴파일 + 패킹
node --max-old-space-size=8000 --stack-size=8000 sim.mjs "Once upon a time" 8 --greedy   # 같은 프로그램을 Node에서 실행
py -3.12 ref.py "Once upon a time" 8        # export를 역양자화한 PyTorch 참조 (sim과 로짓 0.001 이내로 일치해야 함)
node run-ent.mjs out.ent --settle 8000 --script steps-ask.json --poll layerNo --until 3 --pollmax 800000
```
러너는 `entry-vibe-coding`에서 `node server.js` 필요 (업로드 한도를 400MB로 올려 둠: `ENT_MAX_MB`).
데이터: `data/fwe.bin`, `data/cosmo.bin` (SmolLM 코퍼스 샤드를 토큰화, uint16), `wt2_*` (평가용 WikiText-2).

다른 모델을 빌드할 때는 모델 디렉터리를 넘긴다(기본값은 SmolLM2인 `model/`):
```
py -3.12 conv_tok.py <모델디렉터리>                      # sentencepiece -> tokenizer.json
py -3.12 prep_tiny.py <모델디렉터리> data/tinystories-train-300m.txt data/tiny.bin
py -3.12 quant.py 3 --model <모델디렉터리> --data data/tinystories-valid.txt --gs 64   # PTQ 품질 확인
py -3.12 qat.py --model <모델디렉터리> --data data/tiny.bin --test data/tiny-valid.bin --pattern attn=2,mlp=2,emb=2 --out q.pt
EXPORT=<익스포트디렉터리> MODEL=<모델디렉터리> node build.mjs out.ent
```

| 파일 | 내용 |
|---|---|
| `qat.py` | 가짜 양자화(FQ autograd: uint8 코드만 저장) + KD. qkv, gate/up은 열 레벨 공유(한 입력 = 한 테이블) |
| `export.py` | 코드/스케일/레벨/희소 이상치(잔차로 저장!) 내보내기 |
| `build.mjs` | 행 문자열·LV 문자열·토크나이저 데이터 생성, 커널 EJS 생성, 패킹 |
| `src/runtime.js` | 레이어 순서, 임베딩, 어텐션 호출, SiLU, 샘플링, BPE 토크나이저, UTF-8 디코더, UI |
| `ejs.mjs` | engine3d의 EJS 컴파일러 + `sq/ask/answer/...` 내장, 지수표기 없는 숫자 리터럴 |
| `sim.mjs`, `sim_cmp.mjs`, `ref*.py` | Node 시뮬레이터와 PyTorch 참조 비교 도구 |
| `bench.mjs`, `analyze.mjs` | 블록 단가 마이크로벤치 |
| `state_copy.mjs` | .ent → .ent 변수/리스트 값 복사(큰 데이터 복원용) |
| `list_export.mjs`, `list_export2.mjs` | 큰 값을 txt로 빼고 비우기(불완전 — 아래 절 참고) |
| `save_test.mjs`, `panel_test.mjs` | 큰 프로젝트의 편집기 저장·변수 패널 열기 실측 |
| `probe.mjs`, `probe2.mjs` | playentry 업로드 한도 측정용 .ent 사다리 |
| `sizecalc.mjs`, `try_small2.py` | 후보 모델의 Entry 용량 계산 / 품질 샘플링 |

## 가중치 형식
`W[i,j] = S[i, j/64] * LV[j, q[i,j]]` — 행×64열 그룹 스케일, **열마다** 4개 레벨(k-means, 학습됨),
2비트 코드. 한 행의 연속한 4열 코드 = 8비트 = Latin-1 문자 1개. RMSNorm의 γ는 LV에 접어 넣음.
희소 이상치(0.05%)는 `(행, 열, 값-코드값)` 레코드로 따로 더한다.

행 문자열 = `[코드 NB*16자][블록 스케일 D_b 5자 × NB][오프셋 C 16자][행 스케일 RS 13자]`
(NB = n/64). 행렬 하나 = 문자열 하나(`WALL` 리스트 항목), 행은 `substr`로 잘라 쓴다(V8 SlicedString, O(1)).

## 커널 (build.mjs `genKernels`)
1. `prep_*`: 입력 X에서 `sx = 0.998*OFFP / max_j |X_j*LVM_j|`, `XS = X*sx`, `ISX = 1/(sx*rms)`.
2. `tb{b}`: 블록 b(64열)마다 조각 `PC = UH[v div 4096] ⊕ U[v mod 4096]` (v = round(XS*LV)+OFFP,
   2단 단항 문자열), 위치별 반쪽표 `ABP`(16+16), 표 `T_b[256p+code] = ABP[A] ⊕ ABP[16+B]`.
3. `rows9/rows24`: 한 행 = `RS * (Σ_b D_b * 길이(⊕ T_b[indexOf(ALP_p, charAt(RW,pos))]) − C) * ISX`.
   `ALP_p` = 패딩(`'가'`×256p) + 256자 알파벳 → indexOf 한 번으로 리스트 절대 인덱스가 나온다.
4. `rowsTop`: lm_head. 49152행을 저장하지 않고 top-40만 유지.

**정밀도**: 조각 오프셋 OFFP=350만(블록 로프 최대 4.48억 < V8 문자열 한도 5.36억).
처음엔 단일 단계(±2499)였는데 거대 활성값 차원 때문에 나머지 열 해상도가 부족해 행 출력 1% 오차 →
2단 조각으로 바꾸고 1e-5 수준이 됨.

## 측정 (실제 엔트리, 헤드리스 크롬)
* 블록 1개 ≈ 0.3~0.6µs, 단 `+ - × ÷`(calc_basic)는 BigNumber라 ≈ 2µs. `합치기`는 ≈ 0.2µs이고
  V8 로프라 길이와 무관하게 O(1). `(글자)의 길이`도 O(1).
* 조회 1회(7블록) ≈ 3.2µs. 레이어당 ≈ 4.6~5.1초, lm_head ≈ 27초 → **토큰당 약 2.5~3분**.
* 테이블 리스트는 변수 목록 **맨 앞**에 있어야 함(리스트 탐색이 선형, 뒤에 200개면 +3µs/조회).

## 함정 (전부 실제로 밟음)
* `+`는 한쪽이 `/^-?\d+\.?\d*$/`가 아니면 **문자열 이어붙이기**. `" 0123"`, `"1e-30"` 모두 해당.
  → 필드 값은 곱셈/뺄셈에만 쓰고, 컴파일러는 숫자 리터럴을 지수표기 없이 낸다.
* `==`는 공백/개행 문자열을 숫자 0으로 바꾼다 → 문자 분류는 `indexOf`, 토큰 비교는 `str('x', a)`.
* 숫자처럼 보이는 문자열 변수는 로드 시 숫자로 바뀐다 → 데이터 문자열은 영문자로 시작.
* 값 반환 함수 금지(호출당 2프레임). `for(;;)`는 매 반복 양보 → 함수 안에서는 `while(true)`.
* 희소 이상치는 "원래값"이 아니라 "원래값 − 코드값"을 저장해야 이중 계산이 안 된다.
* LVM(열 최댓값) 반올림 때문에 sx 여유는 상대값(0.998)으로.

## 큰 변수/리스트 데이터 되돌리기 (2026-09-23)
**데이터는 엔트리 편집기에 손으로 넣지 말고 .ent 파일을 스크립트로 패치한다.** 값이 큰 변수를
변수/리스트 패널에 붙여넣으면 렌더러가 죽는다(총 75.6M자). 파일로는 잘 열리고 저장도 된다.

* `SmolLM2-135M (2.67비트) v5.ent` (68.5MB) = 완성본. `EXPORT=export267 node --max-old-space-size=8000 build.mjs "<out>.ent"`
  한 줄로 다시 만들 수 있다(9.4초). 기존 56MB 파일과 WALL/LVALL/LVMALL/SPALL/MG/LVE/EXPT/SILU/DG/ALP*
  해시 일치 + 사용자가 지웠던 EMB(13.8M자)·VT·IT·BMP·ONES·LVEH·LVMEH까지 들어 있다.
  build.mjs/ejs.mjs/src/runtime.js는 v4 빌드(9-22 21:32) 이후 수정 없음 → v4와 같은 프로그램.
* `state_copy.mjs <donor.ent> <target.ent> <out.ent> [--only A,B] [--dry]`
  = 이름 기준으로 변수/리스트 **값만** 복사(블록·함수·id·순서는 target 그대로). 편집기에서 손본
  프로젝트에 데이터를 다시 얹을 때 쓴다. v5 → v4 결과: 코드 바이트 동일, 데이터 해시 v5와 동일.
* `SmolLM2-135M 리스트/*.txt`만으로는 **완전 복원 불가**. VT·IT·BMP는 제어문자(U+0001 등)를
  프로그램이 리터럴로 비교하므로 리매핑도, 한 줄 = 한 항목 저장도 안 돼서 애초에 내보내지 않았다.
  또 txt는 제어문자 리매핑판이라 ALP0-15/ALPH도 반드시 같은 리매핑판이어야 한다(섞으면 조회가 깨진다).
  → 복원은 txt가 아니라 v5.ent(또는 새 빌드)를 donor로 쓰는 쪽이 안전하다.
* 실측(로컬 편집기, 헤드리스): 로드 8~23초, 힙 약 610MB, 오류 없음, 레이어 계산 정상.
  속성 > 리스트 패널을 열고 WALL을 선택하는 것까지도 안 죽는다(렌더 2.7초).
  편집기 저장도 성공: `Entry.exportProject` → JSON 92.7MB → .ent 69.3MB, 7.3초.
  단 `entry-vibe-coding/server.js`의 `/api/export` 본문 한도가 25mb여서 413으로 막혔다 →
  `ENT_MAX_MB`(기본 400)mb로 올려 뒀다.
* playentry.org에는 못 올린다. 사이트가 변수/리스트 값 총량을 검사한다(엔트리 lang의
  `file_size_exceeded` = "변수 또는 리스트의 값이 너무 많아 작품을 불러올 수 없어요"; entry-js 안에는
  호출부가 없고 사이트 쪽 검사다). 배포는 .ent 파일로.
* 데이터 구성(총 75.6M자): WALL 51.0M(67%), EMB 13.8M(18%), LVALL 6.5M, SPALL 1.2M, LVMALL 1.0M,
  VT 0.68M, IT 0.63M, MG 0.43M. 줄일 수 있는 건 어휘(EMB/VT/IT)와 레이어 수(WALL 1.7M자/레이어)뿐.
  포장 방식을 바꿔도 효과가 없다: 2비트 4개 = 1문자가 이미 조밀하고, ASCII 6비트로 내리면 파일은
  조금 줄지만 조회 수가 33% 늘어난다.

## playentry.org 업로드 (2026-09-23 조사)
사이트 번들(`/_next/static/chunks/2629-*.js`)을 읽어 확인한 사실:

* **불러오기**: `.ent`를 `/rest/project/upload`에 multipart로 올린다. 서버가 **502**를 주면 클라이언트가
  `file_size_exceeded`("변수 또는 리스트의 값이 너무 많아…")를 띄운다. 클라이언트에는 크기 검사 코드도,
  기준 숫자도 없다 → 실제 한도는 **실측해야** 알 수 있다. 그래서 v3(파일 1.76MB, 함수 JSON 46.7MB)도
  같은 메시지로 거부됐던 것(변수 탓이 아니었다).
* **저장**: `Entry.exportProject()` 결과 전체를 GraphQL 뮤테이션(update `F.mB` / create `F.dt`)으로
  보내는데 **timeout 20초**다. 실패하면 크기와 무관하게 일반 "저장 실패" 안내가 뜬다.
* **데이터분석 테이블로 우회 불가**: CSV는 `/rest/project-table`로 따로 올라가지만
  `DataTableSource.toJSON()`이 `data: this.array`로 행 전체를 프로젝트 JSON에 다시 넣는다.
  (셀 3만 개 넘으면 "불러올 수는 있지만 편집할 수 없다"는 안내만 있고 하드 한도는 아니다.)
* **에셋(그림/소리)도 통로가 아니다**: 따로 업로드되지만 블록으로 픽셀/샘플을 읽을 수가 없다.
  공유 변수(클라우드)는 값이 작고 개수 제한이 있어 무의미. 작품을 쪼개도 작품 간 데이터 공유 수단이 없다.
* `probe.mjs <full.ent> <outDir> [MB,...]` = 프로그램은 그대로 두고 데이터(앞쪽 N개 레이어 +
  잘라낸 EMB)만 남겨 목표 크기의 .ent를 만든다. `probe2.mjs`는 잘 압축되는/랜덤한 채움 리스트로
  "파일 크기 한도냐 문서 크기 한도냐"를 가리는 한 쌍을 만든다. 만들어 둔 것은 `probe/`.
  프로그램만으로 이미 6.5MB(함수 4.2 + VT·IT·MG·BMP 1.8)라 그 아래로는 못 내려간다.
* **실측(사용자가 실제로 업로드)**: (project.json, .ent 파일) = 성공/실패
  → (8.3, 3.1) O · (10.9, 3.8) O · (13.8, 6.1) O · (15.1, 0.2) O · **(16.6, 8.3) X** · (19.5, 10.5) X.
  확실히 통과하는 상자는 **JSON ≤ 14MB 이고 파일 ≤ 6MB**.
  아직 두 가설이 남아 있다: (가) 문서 크기 한도 16MB(MongoDB BSON 한도), (나) 업로드 파일 한도 7~8MB.
  가리는 쌍을 만들어 뒀다 — `probe/A json 20.3MB (file 0.2MB).ent`(문서만 큼),
  `probe/B json 15.9MB (file 8.8MB).ent`(파일만 큼). A만 통과하면 (나), B만 통과하면 (가).
* 크기 환산: 전체 데이터 75.6M자 ≈ project.json 92.7MB, 파라미터당 **약 0.56자**.
  즉 데이터 예산 B자 ⇒ 파라미터 ≈ B/0.56. 20MB 예산이면 약 2500만, 10MB면 약 1200만 파라미터.
  135M을 올리는 방법은 없고, 사이트에서 "돌아가는" 판을 원하면 1000~2500만 파라미터급 모델을
  KD+QAT로 새로 만드는 수밖에 없다(토큰당 15~40초로 오히려 빨라짐). 필요한 작업:
  build.mjs의 D/NH/NKV/HD/FF/VOCAB 상수를 manifest에서 읽도록 일반화 + 어휘 축소(8k, EMB 13.8M→1.3M자)
  + 작은 라마 학생 모델 KD 학습.

## 사이트에 올릴 후보 모델 (2026-09-23 실측)
전제: 커널이 라마 구조(RMSNorm + SwiGLU + RoPE, 바이어스 없음, 임베딩 공유)를 가정하므로
후보는 `LlamaForCausalLM`만. 그룹 크기 gs = 16 × (문자당 가중치 수) = 4비트 32 / 2.67비트 48 / 2비트 64이고
**d와 FF가 gs로 나눠져야** 한다(안 되면 열을 패딩).

용량은 `sizecalc.mjs`로 계산한다. 행 문자 수 = 1.3125 × n/W + 29 (n = 입력 열 수, W = 문자당 가중치 수)
— 이 식은 실제 빌드의 WALL 50.96M자·EMB 13.81M자를 정확히 재현한다. **열당 레벨표(LVALL)는
2^비트에 비례**한다(4비트 = 16레벨 × 10자/열, 2.67비트 = 평균 6.67레벨, 2비트 = 4레벨) — 처음 4비트
견적을 낼 때 이걸 빼먹어서 12.8m을 13.5MB로 잘못 계산했다(실제 22.7MB). JSON 바이트/문자는 실측:
코드 문자열 1.374(WALL)·1.580(EMB), ASCII 표 1.0, 어휘표 약 1.6.

| 모델 (파라미터) | 4비트 | 2.67비트 | 2비트 |
|---|---|---|---|
| delphi v0-llama2-6.4m (6.9M) | 13.0MB / 7.4MB / 11초 | **9.4 / 5.3 / 8초** | 6.9 / 3.9 / 5.6초 |
| delphi v0-llama2-12.8m (14.5M) | 22.7 / 13.6 / 23초 | 15.3 / 9.1 / 16초 | **11.8 / 7.0 / 12초** |
| delphi v0-llama2-25.6m (25.4M) | 35.4 / 22.1 | 24.1 / 15.0 | 18.3 / 11.3 — 안 들어감 |
| tinyllama-15M (15.2M, 어휘 32000) | 24.3 / 15.7 | 17.4 / 11.2 | 14.9 / 9.8 — 안 들어감 |
| tinyllama-15M + 어휘 8k 축소 (8.3M) | 14.8 / 8.5 / 13초 | **10.2 / 5.9 / 8.9초** | 8.6 / 5.0 / 7초 |
| tinyllama-42M, SmolLM2-135M | — | 38.7 / 26.0, 108 / 78 | 안 들어감 |

(칸은 project.json MB / .ent 파일 MB / 토큰당 초. 확실히 통과하는 상자는 JSON ≤ 14MB & 파일 ≤ 6MB)

품질 실측(다운로드해서 직접 샘플링, `try_small2.py`):
* v0-llama2-12.8m → "Once upon a time, in a big forest, there was a small bird named Tim. Tim had a
  long neck and a pretty feather on his neck. He liked to play with his friends, the squirrel and the rabbit."
* tinyllama-15M → "Once upon a time, there was a boy named Timmy… he found a shiny rock on the ground."
  (샘플 문단 loss 1.118 = ppl 3.1)
* 함정: delphi v0 모델은 **자체 sentencepiece 4096 어휘**(`tokenizer.model`, 바이트 폴백)를 쓴다.
  `delphi-suite/stories-tokenizer`(byte-level BPE)와는 id가 4096개 중 154개만 일치 → 그걸로 돌리면
  단어는 나오지만 문장이 깨진다(loss 12.4). 평가할 때 반드시 모델 자신의 tokenizer.model을 써야 한다.
  sentencepiece 패키지가 이 환경에 없어서 `tokenizer.model`을 직접 프로토버프 스캔해 조각 목록을 뽑았다.
* GPT-Neo/NeoX 계열(roneneldan/TinyStories-*, EleutherAI/pythia-14m)은 LayerNorm·GELU·바이어스·부분
  로터리라 커널을 고쳐야 하고 품질도 낮아서 제외.

추천은 **v0-llama2-12.8m**: 어휘가 4096이라 EMB가 0.5M자(tinyllama-15M은 5.0M자)로 끝나고
lm_head가 8배 싸며, 그만큼을 본체에 쓸 수 있다(본체 13.0M vs 5.98M 파라미터). 비트폭은 한도
가설이 정해지면 결정 — (가) 문서 16MB면 2.67비트(15.3MB), (나) 파일 7~8MB면 2비트(11.8/7.0).
이미 검증된 상자 안에서만 가려면 **6.4m 2.67비트(9.4/5.3)** 또는 tinyllama-15M+어휘8k 2.67비트(10.2/5.9).
4비트는 레벨표 때문에 어느 모델도 안 들어간다 → PTQ만으로 끝내는 계획은 폐기, QAT가 필요하다.

### 진행 상황 (2026-09-23)
* **한도 확정**: 업로드 한도는 **프로젝트 문서 크기 약 16MB**(파일 크기 아님).
  JSON 15.9MB·파일 8.8MB = 통과, JSON 20.3MB·파일 0.2MB = 실패, JSON 16.6MB = 실패.
  MongoDB BSON 16MiB 한도와 일치. 목표는 **project.json ≤ 15.5MB**.
* **모델 확정**: 같은 텍스트에서 비트/문자(토크나이저가 다르면 ppl은 비교 불가) —
  **delphi-12.8m 0.9353 bpc vs tinyllama-15M 1.2842 bpc**. 어휘 4096 쪽이 27% 낫다. `bpc.py`.
* `model-delphi12.8m/` = 모델 + **변환한 tokenizer.json**(`conv_tok.py`).
  transformers 5.17의 LlamaConverter는 SpmExtractor 버그로 죽어서 병합 규칙을 직접 구현했다.
  sentencepiece와 인코딩이 5개 샘플(한글·이모지·개행 포함) 모두 완전 일치.
  sentencepiece·protobuf 패키지를 py -3.12에 설치했다.
* `build.mjs`가 이제 모델 디렉터리의 `config.json`에서 D/NH/NKV/HD/FF/VOCAB/rope_theta를 읽는다
  (`MODEL=... node build.mjs` 또는 `--model`). 함께 고친 것: RoPE 밑(100000 하드코딩 → rope_theta,
  delphi·tinyllama는 10000), `CSN[i+33]` → `CSN[i + HD/2 + 1]`. SmolLM2 빌드는 회귀 확인 완료
  (데이터 해시 v5와 동일, 코드도 난수 id만 다름).
* `quant.py`에 `--model` / `--data` 추가(텍스트 앞 절반 보정, 뒤 절반 평가), fp ppl도 출력.
  TinyStories 검증셋 `data/tinystories-valid.txt`(19MB), 학습용 토큰화는 `prep_tiny.py`.
* **양자화 실측**(delphi-12.8m, GPTQ, gs=64, TinyStories): fp ppl 12.05 →
  **3비트 17.42**(학습 없이도 문장 정상: "Once upon a time, there was a little boy named Tim.
  Tim loved to play with his toy car. One day, Tim's toy car broke.").
  엔트리 커널이 쓸 수 있는 건 2.67비트(3,3,2)라 실제 값은 2비트와 3비트 사이.

* **양자화 실측 2**(같은 슬라이스, EOS로 나눈 tiny-valid.bin 기준): fp(교사) ppl **4.375** →
  2.67비트 초기화(gs=48, 열별 k-means 레벨, 희소 0.05%) **14.04**, KD 12스텝만 돌려도 10.4.
  (quant.py의 12.05/17.4/51.5는 원문에 `<|endoftext|>` 리터럴이 섞인 스트림이라 절대값이 부풀어
  있다. 상대 열화만 의미 있음: 3비트 +45%, 2비트 +327%.) 2비트는 문장이 무너진다
  ("when when when…") → **2.67비트 + QAT**로 확정.
* `pad_model.py`로 FF 1024 → **1056** 패딩(gate/up에 0행, down에 0열 추가 = 수치적으로 동일,
  bpc 0.9353 그대로). 이러면 2.67비트 gs=48로 모든 행이 나눠진다.
* `build.mjs` 버그 2개 더: `cfg.rope_theta`가 없는 구형 config(delphi)에서 NaN → 기본 10000,
  그리고 **KV 그룹별로 복제되던 attnG/score/vacc를 하나로 합쳤다**(KK/VV를 그룹 구간으로 미리
  잘라 넘김: `substr(KS[...], kvo+1, kvo+HD*10)`). 함수가 8그룹 × 복제 → 1개가 되어
  **함수 3.58MB → 2.62MB**, delphi project.json **16.09MB → 15.13MB**(한도 아래로 내려감).
  위치당 substr 2번이 추가될 뿐이라 런타임 비용은 무시할 수준.
* 현재 delphi 스모크 빌드 실측: project.json **15.13MB** / .ent 7.9MB
  (WALL 8.87MB, 함수 2.62MB, LVALL 1.18MB, EMB 1.07MB, BMP 0.19MB, 나머지 0.7MB).
  더 줄일 여지: tb/abp/pieces를 블록 루프로(0.35MB), BMP 축소(0.19MB), LV 필드 10→8자(0.24MB).

### 완성: `TinyStories LLM 14M (2.67비트).ent` (2026-09-23)
`C:\Users\spyoh\entry_3d\` 에 .ent(7.31MB, **project.json 14.17MB** → 사이트 한도 아래) +
`TinyStories LLM 14M 사용설명서.md` + `TinyStories-LLM-LICENSES.txt`(모델 MIT, 말뭉치 CDLA-1.0).

* **QAT 결과**: 80M 토큰 9,765스텝 53.6분, 검증 ppl **4.78** (fp 교사 4.375, +9.3%).
  135M을 2.67비트로 줄였을 때가 +65%였으니 훨씬 좋다. 작은 모델이 KD 자기증류로 잘 회복된다.
* **토크나이저**: `src/runtime.js`에서 토크나이저를 떼어내 `src/tok-bbpe.js`(byte-level, SmolLM2용)와
  `src/tok-spm.js`(sentencepiece, ▁ + `<0xXX>` 바이트 폴백)로 나눴고, build.mjs가
  tokenizer.json의 `byte_fallback`을 보고 고른다. 새 전역 `HEXD`/`SPC` 추가.
  BOS는 붙이지 않는다(conv_tok.py가 만든 tokenizer.json에 post-processor가 없어 참조와 일치).
* **검증**: 시뮬레이터가 프롬프트를 `[432,440,261,403]`으로 토큰화 — HF 참조와 완전 일치.
  greedy 생성이 `ref.py`(역양자화 PyTorch)와 **토큰 단위로 동일**:
  "Once upon a time, there was a little girl named Lily. She had a".
  SmolLM2 빌드도 회귀 확인(sim 출력 동일).
* `src/runtime.js`에 남아 있던 하드코딩 차원(`192`=NKV*HD, `64`=HD)을 consts로 바꿨다.
  build.mjs consts에 NKV/HD 추가, 프로젝트 제목은 `TITLE` 환경변수.
* **실제 엔트리 실행**(헤드리스): 로드 9초, 힙 약 200MB, 오류 없음, 레이어당 8.7초 →
  토큰당 약 70초. 블록 프로파일(`--count`): 733k 블록/초, 행 커널(L803) 하나가 전체의 39%.
  토큰당 블록 수는 31M(135M판은 248M, 8배)이라, 135M판을 재던 때(1.5M 블록/초)와 같은 조건이면
  토큰당 30~35초일 것. 측정 당시 크롬 창이 여러 개 떠 있어 처리량이 절반이었다.

다음에 더 할 것: (1) 사이트 업로드 확인, (2) 속도 — tb/abp/pieces를 블록 루프로 만들면 함수가
0.35MB 줄고, 행 커널의 number 리터럴(전체 블록의 19%)을 줄일 여지가 있다.

## 남은 아이디어
1. lm_head 저랭크 프록시(은닉 PCA 64차원, 4비트) → 후보 200개만 정확 계산: 27초 → 약 6초.
   재현율(top-40) 0.80~0.84, top-1 포함 93%라 보류. `proxy_eval.py` 참고.
2. 프롬프트 토큰 배치 처리(인덱스 추출 공유) → 프롬프트 단계 20~35% 단축.
3. 어휘 축소(영어 16k) → lm_head 1/3.
4. 더 긴 QAT(1억 토큰 이상), 3비트 혼합(임베딩/어텐션) — 품질 개선.
