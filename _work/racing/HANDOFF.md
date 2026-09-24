# ENTRY RACING 3D — 작업 인계 메모 (2026-09-24, v8)

산출물: `3D 레이싱 v8.ent` (1.19 MB) ← 최신, 설명서 `3D 레이싱 v8 설명서.md`, 소개 `3D 레이싱 소개.md`
빌드: `node build.mjs racing8.ent` → `globals 353, lists 406, functions 255, handlers 3`
v7 소스는 git 기록에 있다(`40a8c73`). 로컬은 sparse-checkout이라 `build.v*.mjs`/`src.v*bak` 백업을 새로 만들지 않았다.

## 요청 (사용자)
"다른 차 소리(적당한 크기로), 맵별 최고 기록 및 최고 기록을 고스트 모드로 보여주는 시스템, 혼자 하기 시스템, 도전과제 시스템, 레벨 시스템과 자동차 튜닝.
그리고 실시간 리스트는 엔트리에서 오류가 많기로 유명하기 때문에(저장이 안 됨) 실시간 변수를 사용해서 랭킹 시스템과 게임 데이터 저장 시스템."

## 새 파일·구조
- `src/profile.js`: 실시간 변수(RT_S1..16 저장, RT_K1..8 랭킹, RT_G1..8 세계 기록 고스트), 닉네임(`whoAmI`, `get_nickname` 블록),
  레벨(`levelFromXP/addXP`), 팝업(`popPush/popStep`), 도전과제(`unlock`), 경기 통계(`statsReset/statsStep/raceOver`), 랩 처리(`lapDone`),
  튜닝 적용(`tuneCar`), 저장(`buildRec/parseRec/applyRec/loadProfile/saveProfile/profileStep`), 랭킹(`rankParse/rankBuild/rankAll/rankSubmit`),
  고스트 인코딩(`wrUpload/loadWrGhost/pickGhost`), 연습 보조(`practiceAssist/backOnTrack`).
- ejs: 전역 이름이 `RT_`로 시작하면 `isRealTime: true`. 내장 `nickname()`.
- 고스트 재구성(game.js): 모든 모드에서 0.25 s 간격 기록(`ghostRec`: grX/Z/W), 서킷 최고 랩이면 `lapGhost`가 pb*[(tk−1)·PBN + i]에 보관(PBN 540 → 135 s),
  타임트라이얼은 gh*를 재생(`updateGhost`, y·seg는 sampleTrack). 옛 gb*/0.1 s 방식은 없앴다.
- `M_PR 4` 연습 모드: 혼자 하는 경로는 `gMode >= M_TT`로 묶었다(그리드, nLaps, DRS, 마모 없음, SC 없음, HUD). 브레이크 보조는 rlV 속도 프로파일 기준.
- 상태 `ST_TUNE 12`(차고: showroomCam + 턴테이블), `ST_PROF 13`(프로필 4탭). 메뉴 13줄(`NMENU`), `rowY = 77 − 12.8·(i−1)`.
  텍스트 슬롯 `NTX 80`: 메뉴 라벨 24–36, 값 37–49, 카드 50–76, 팝업 77–78. 프로필 탭이 바뀌면 24부터 지운다(`hudSub = prTab`).
- 튜닝 배율 리스트(차마다): `caAeroK, caBrkK, caBias, caSusp, caWearK` — AI와 세이프티카는 1/1/0/0/1.
- 다른 차 소리: `enginewav.mjs`의 `aiWav(ratio, amp)` → 소리 `ai<1..6><1..2>`(16 kHz 0.5 s, 비율 0.62–1.5, 크기 0.46/0.2). `sound.js otherCars()`.
  tessvm에서 이름으로 재생되는 것을 확인(`ai41`, `ai31`, `ai61` …).

## 저장 형식
- 레코드: `|nick,xp,upE,upA,upB,upT,suW+3,suG+3,suB+3,suS+3,achMask,races,wins,pods,km,circMask,lap1..8(ms),race1..8(ms)` (32필드).
- 칸 = 레코드를 이어 붙인 문자열(기본값 `|`). 저장 = 다시 읽기 → 내 레코드 빼기 → 끝에 붙이기 → 2400자 넘으면 앞에서부터 지우기.
  방금 읽은 칸이 비었는데 캐시가 있으면 캐시를 기준으로 쓴다. 불러오기는 `gt > 1.5`에 한 번, 저장은 조용한 화면에서 3 s마다 최대 한 번.
- 게스트(닉네임이 비었거나 ' ' 또는 'guest')는 아무것도 쓰지 않는다. tessvm은 사용자 ID를 `ab****`로 가리므로 ID 대신 닉네임을 쓴다.
- 고스트: `nick,ms,` + 첫 점 x, z(3자리, 0.2 m, +16384) + 점마다 dx, dz(2자리, +512). Monza 한 랩 1306자.

## 검증
- `node t7/prof.mjs trk`: alice 레이스 → XP·도전과제·저장·랭킹·고스트 → bob 새 프로필 저장 → 두 사람 다시 불러오기 일치 → 게스트 쓰기 없음
  → 60명 저장 뒤 칸 2349자(≤ 2400) → 세계 기록 고스트 복원(323샘플) 후 트랙 위 재생 → 튜닝 수치 → 연습 브레이크 보조 → B 복귀. 모두 PASS.
- `node t7/slots.mjs`: 13줄 × 두 규칙, 차고, 프로필 4탭 포함 42화면 충돌 없음.
- tessvm: 13줄 메뉴·차고·프로필·고스트 카드 스크린샷, 다른 차 소리 재생, 싱가포르 ULTRA 아케이드 5.1–5.2 ms / 리얼리스틱 5.9–6.0 ms.
- **온라인 동기화는 시험하지 못했다**(playentry 업로드·로그인 필요). 실시간 변수 한 개의 최대 길이도 모른다.

## 실시간 저장 — 동시 접속 수정 (v8 이후)
사용자: "동접자가 2명 이상이어도 잘 작동하는지 확인해 줘, 저장이 잘 안 되는 것 같아."
- 엔트리 소스(entryjs `src/extensions/CloudVariable.js`, `class/variable/variable.js`, `blocks/block_variable.js`)에서 확인한 동작:
  실시간 변수 `set`은 서버로 보내고 **ack를 받아야** 로컬 값이 바뀐다(`set_variable` 블록은 그 Promise를 기다린다).
  `get`은 로컬 dmet 사본(없으면 value_). 서버 값은 소켓 `welcome`으로 **시작 뒤에** 온다. 여러 명이 쓰면 last-write-wins.
- 옛 코드의 문제(모델로 재현): ① 1.5 s에 불러오기 → welcome 전이면 새 프로필 → 저장하면 기존 기록을 덮음(XP 5000 → 0).
  ② 같은 칸 동시 저장이면 매번 한 명 손실. ③ 같은 랭킹 동시 등록이면 3명 중 2명 손실.
- 고친 것(profile.js): `RT_SYNC`('ok'를 보면 동기화됨, 12 s까지 안 보이면 새 작품·오프라인으로 보고 진행) → `loadProfile(1)`은 받아온 기록에 그 전 진행을 **더한다**(`mergeRec(1)`).
  저장 전 `mergeRec(0)`(XP·통계 max, 도전과제 OR, 서킷 비트 OR, 기록 min, 튜닝은 이번 판에 안 바꿨으면 서버 것) → 쓰기 → 2 s 뒤 `verifySave` → 밀려났으면 `rand(0.2,1.6)·min(6,n)` s 뒤 재시도(포기하지 않음).
  랭킹은 `lapDone`이 `pendRk/pendG`에 적어 두고 조용한 화면에서 `rankStep`이 등록 → 2 s 뒤 확인 → 재시도. 조용한 화면에 일시정지·예선 결과도 넣었다.
- 시험: `node t7/multi.mjs [지연ms] [welcome s]` — sim의 `R.rtNet`에 서버 모델을 꽂는다(ejs JS 백엔드가 `RT_*`를 `R.rtGet/rtSet`으로 보낸다).
  120 ms/3 s ×3회, 400 ms/6 s 모두 A~E PASS. `t7/prof.mjs`는 서버가 없으니 13 s 기다린다.
- 남는 한계: 같은 사람이 두 기기에서 **동시에** 플레이하면 XP는 큰 쪽만 남는다(더해지지 않는다). 실시간 변수 한 개의 길이 제한은 여전히 모른다.

## 소리는 MP3 (v8 이후 수정)
- 온라인 엔트리는 WAV 업로드를 받지 않는다. `enginewav.mjs toMp3()`가 `lame -m m -b 64`(없으면 ffmpeg)로 인코딩한다(엔진 64 kbps, 다른 차 48 kbps).
- 크롬 decodeAudioData는 LAME 갭리스 헤더를 무시해 앞뒤에 무음이 붙는다(0.5 s → 0.576 s). 그래서 루프 재시작을 엔진 0.14 s, 다른 차 0.10 s 앞당겨 겹친다.
- 빌드에 `lame` 또는 `ffmpeg`가 필요하다(이 Mac은 homebrew에 둘 다 있음).

## 주의
- 시뮬레이터에서 `peek`로 JS를 직접 쓸 때 리스트는 0부터다(`caThr[0]`이 1번 차). 테스트를 쓰다 두 번 틀렸다.
- 로컬 저장소는 sparse-checkout이다. 루트에 새 파일을 추가하려면 먼저 `git sparse-checkout add '/파일'`.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-24, v7)

산출물: `3D 레이싱 v7.ent` (980 KB) ← 최신 (v1–v6 보존), 설명서 `3D 레이싱 v7 설명서.md`
빌드: `node build.mjs racing7.ent` → `globals 264, lists 382, functions 205, handlers 3`
v6 소스 백업: `build.v6.mjs`, `src.v6bak/`, `f1car.v6.mjs`
작업 환경이 macOS로 바뀜. 경로가 Windows에 묶여 있던 곳을 저장소 상대 경로로 바꿨다(아래 "환경").

## 요청 (사용자)
"리얼리스틱 모드로 게임플레이 기능을 다 넣고, 아케이드 모드는 캐주얼하게 AI 성격만 넣고 지금 게임플레이 유지.
연출은 ULTRA 또는 HIGH에서만 일부/전체를 켜고, 트랙 공유 코드와 엔진 사운드까지."

## 새 소스 파일 (SRC_FILES 순서: util track render phys ai game **rules fx sound share** editor menu hud main)
| 파일 | 내용 |
|---|---|
| `src/rules.js` | 리얼리스틱: 날씨(wxSetup/wxStep), 타이어(tyreGrip/fitTyre/pickTyre/simCarStep), 데미지(addDamage), 피트 레인(buildPitLane/pitStep/pitStop/aiStrategy), 페널티·트랙 리밋(limitsStep/penalise), 황색기(incident/yellowAt/flagsStep), 세이프티카(maybeSC/deploySC/scStep), 예선(aiQualiTimes/beginQuali/endQuali), 최종 순위(classify) |
| `src/fx.js` | 불꽃·파편(sparkBurst/debris/stepSparks/drawSparksIn), 해 질 녘(todStep), 리플레이(rpRec/enterReplay/replayPose/replayStep/exitReplay), TV 카메라(buildTvCams/tvFind/tvCam) |
| `src/sound.js` | 엔진음 루프(engineSound) |
| `src/share.js` | 공유 코드(shEncode/shDecode/shImport) |
| `enginewav.mjs` | 엔진 WAV 합성(빌드 때, 7400 rpm 기준 1.5 s 루프, 22 kHz mono) |

## 구조 변경
- 상태 추가: `ST_QUALI 9`, `ST_QRES 10`, `ST_REPLAY 11`. `rules` 1 ARCADE / 2 REALISTIC(`R_ARC/R_SIM`).
- `setupRace`를 `carStats`(성능) / `placeCar`(배치·상태 초기화) / `initCars`(그리드, 예선 순서면 `caGrid`) / `raceReset` / `startGrid`로 나눔.
  리얼리스틱 GP·챔피언십은 `setupRace → beginQuali`(혼자, nCars 1) → `endQuali`(ST_QRES 표) → ENTER → `startGrid`.
  `restartRace()`는 예선 그리드를 유지한다(`keepGrid`).
- 카메라는 `camCar`를 따라간다(리플레이용). 렌더러의 링 스캔 시작점은 `caSeg[1]`이 아니라 `camSeg`(모든 카메라 함수가 설정).
- 그립: `wetK` 대신 차마다 `caWK[c]`. 아케이드는 `caWK = wetK`(비 0.8), 리얼리스틱은 `wetK = 1`이고 `caWK`가 타이어×노면×마모.
  AI(`aiPlan`)와 `speedProfile`도 이 값을 쓴다(아케이드에서 speedProfile에 caWK를 넘기면 wetK가 두 번 곱해지니 주의).
- 날씨는 `wetL`(노면, 그립) / `rainI`(비) / `rainVis`·`wetVis`(그림). 아케이드는 `applyWeather`가 wx로 고정 설정.
  `buildTrack`의 하늘·안개·팔레트는 `refreshAtmos()`로 분리 — 젖음(`wetVis`)과 해 질 녘(`todK`)이 0.06–0.08 바뀔 때마다 다시 굽는다.
- 노면 코드 6 = 피트 레인(`sgRTL = 6`, 폭 `sgRWL`, 왼쪽). `sgPit` 1 레인 / 2 박스(차 c의 박스 = `pitBox0 + c - 1`).
  레인 구간은 벽을 없앤다(시가지). 타이어 배리어는 레인 옆에 놓지 않는다. 피트 건물은 `scClear`가 알아서 밀어낸다.
- 차 슬롯 9(`GHOST`)는 타임트라이얼 고스트 **또는** 세이프티카(`scCar`, 도색 10 `SAFETY`). 렌더러는 `ghostOn || scCar`면 슬롯 9를 그린다.
- 차 모델의 앞날개 면에 `cfW = 1`(f1car.mjs의 `wing` 플래그). `caWing[c] > 0`이면 그 면을 건너뛴다.
- 텍스트 슬롯 `NTX 64 → 76`. 메뉴 라벨 24–34, 값 35–45, 카드 50–75(`cardRow r`: 51+r / 61+r). 레이스 리얼리스틱 패널 24–31.
  에디터 공유 코드 28–35. 검사: `node t7/slots.mjs`(11줄 메뉴 × 두 규칙 + 예선·결과·리플레이·에디터).

## 리얼리스틱 수치 (조정한 값과 근거)
- 타이어(`tyDry / tyWet / tyLife`): S 1.06/0.56/0.42, M 1.00/0.54/0.62, H 0.955/0.52/0.88, I 0.90/0.78/0.75, W 0.82/0.84/0.80.
  교차점: 젖음 0.31에서 슬릭=INTER, 0.57에서 INTER=WET. 마모 그립 = `0.80 + 0.20·w`, w < 0.25면 ×`(0.85 + 0.6·w)`.
- 마모율 `caWR = WEARK / (tyLife · raceDur)`, `WEARK 1.0`, `raceDur = estLap · max(min(laps, 20), 4)`, `estLap = 이상적 랩 × 1.30`.
  평균 부하가 약 0.6이라 1.0. 10랩 실버스톤 실측: 소프트 출발 6–7랩에 미디엄, 미디엄 출발 9랩에 소프트(1스톱).
- AI 예선 `QK 1.33` = 실측 (AI 최고 랩 / 이상적 랩) × 스킬, 서킷 1·2·4·6에서 1.29–1.36 (`node t7/qcal.mjs trk secs`).
- AI 성격: 여유 `AIMARG + 0.012·agg`, 실수 확률 `err·0.016/s`(코너 앞, 1.2 s 동안 그립 과대평가 ×1.07), 랩 페이스 `1 − err·U(0, 0.012)`.
  처음 값(0.025 / 0.035 / ×1.10)은 트랙 리밋 위반이 3랩에 12회 → 지금 2회(아케이드), 0–1회(리얼리스틱).
- 트랙 리밋: 차 중심이 흰 선 밖 1 m 이상, 0.6 s 이상, 첫 랩 제외. AI 데미지도 코너 속도 계산에 반영한다(안 하면 위반이 13회).
- 접촉 데미지: 추돌 `(hv − 4.5)·0.09`, 옆 `(hv − 6)·0.03`(첫 랩 혼전에서 0.1–0.3대). 벽 `(|vn| − 6)·0.075`.
  0.3 넘는 한 방이면 황색기 + 세이프티카 확률 `min(0.8, (d − 0.3)·1.6)`, 레이스당 1회, 3랩 이상, 마지막 랩 제외.
- 세이프티카: `aiVlim × 0.60`, 대열은 앞차와 `(gap − 13)·0.35` 속도 조절, `max(28 s, estLap·0.85)` 뒤 IN THIS LAP,
  피트 입구에서 사라진 뒤 선두가 결승선을 지나면 그린(`t7/sim2.mjs sc`: 대열 순위 변동 0).
- 피트: 리미터 22.2 m/s, 정차 2.2–2.8 s + 데미지 수리 `2 + 4·dmg`. AI는 입구 30–6링 전에서 결정한다(`aiStrategy`).
- ERS: 가속 +2.4 m/s², 최고속 +2%, 소모 0.13/s, 충전 `0.17·brake/s`(랩당 0.62까지).

## 연출 (gfx 2 HIGH / 3 ULTRA)
- **반투명은 `#rrggbbaa`가 아니라 붓 투명도 블록(`penAlpha` = `set_brush_tranparency`)**으로 한다.
  tessvm(과 엔트리)의 `set_fill_color`는 `#rrggbb`로 정규화하고 8자리는 검정으로 만든다. 붓 투명도는 채우기에도 걸리고,
  펜 그룹 순서가 유지되니 화가 알고리즘 깊이 순서도 맞는다. 쓴 뒤에는 꼭 `penAlpha(0)` (render.js `penTr`로 추적).
- 도장(stamp)은 tessvm에서 모든 펜 그림 **위**에 따로 얹혀서 깊이 순서가 깨진다 — 연기에 쓰지 않았다.
- 리플레이: `RPN 550 × RPC 9` 링 버퍼(`rpX/Y/Z/W/S/V`, 4950칸), 0.1 s 간격. 들어갈 때 `rpSnap(1)`으로 실제 상태를 저장, 나올 때 복원.
  재생 중 안 보이는 차는 `caFin = 9`(렌더러가 caFin ≥ 2를 숨김). TV 카메라는 `tvCam`이 `camSeg`를 차보다 30링 뒤에서 시작하게 둔다(카메라가 뒤를 봄).
- 불꽃·파편 풀 `NSPK 40`, 스크래치 슬롯 `SCRBASE + 3/4`. 브레이크 열 `caHeat`(phys)은 ULTRA에서만 휠(kind 4)을 주황으로.
- 해 질 녘: `todK = raceT / (estLap·laps·1.1) · 0.85`, 하늘은 `trkDusk*`로, 팔레트·차 조명 ×(1 − 0.3·todK).

## 사운드
- `sound_speed_set`(엔트리·tessvm 모두 0.5–2로 자름, 모든 소리에 즉시 적용)으로 음높이 = rpm / 7400.
- 루프 재시작: 남은 루프 시간(`engRem`, 재생 속도로 줄어듦)이 다음 프레임분보다 적으면 다시 재생 → 끝부분이 겹쳐 끊김이 없다.
  WAV 양 끝 50 ms 페이드. 볼륨(전역)은 스로틀로 48–90 %.
- tessvm 확인: 버퍼 디코딩 1, AudioContext running, 재생 중 2개 겹침, 속도 1.4–1.6 (`/tmp` 스크립트로 `vm.audio` 훅).

## 공유 코드
- `R` + 노드 수 2자리 + 노드당 7자리(x, z 각 2자리 4 m 격자 ±2 km / y 1자리 2 m / 폭 1자리 0.5 m / 플래그 1자리) + 체크섬 2자리, Crockford base32.
- 입력은 `ask_and_wait` / `get_canvas_input_value`(ejs: `ask()`, `answer()`, 시작할 때 `hideAnswer()`).
  묻는 동안 메인 루프가 멈추므로 끝나면 프레임 시계(`lastT`, `rtK`)를 초기화한다. 왕복 테스트: `node t7/share.mjs`.

## 테스트 도구 (v7)
- `node t7/race.mjs trk rules secs [wx] [gfx] [lapSel] [mode]` — 레이스 스모크(플레이어도 AI), 예선 → 그리드 자동.
- `node t7/sim2.mjs sc|rain|pits trk secs` — 세이프티카 강제 / 비 강제(40 s) / 10랩 전략.
- `node t7/ppit.mjs trk` — 플레이어 피트 스톱 흐름. `t7/tl.mjs`, `t7/tl_arc.mjs` — 트랙 리밋 위반 추적(NOPERS=1이면 성격 끔).
- `node t7/dmg.mjs trk secs forceSC` — 데미지 발생 추적. `t7/tod.mjs` — 해 질 녘 스크린샷. `t7/qcal.mjs` — 예선 계수.
- `node t7/mkt.mjs out.json '{json}'` — tessvm 키 스크립트(11줄 메뉴: rules/trk/wx/gfx/laps/mode, menuShots, extraFile).
- `trun.mjs`에 `type`(문자열 입력)과 `press` 스텝 추가, 하네스가 소리 파일 경로도 `/ent/`로 바꾼다.
- 주의: 시뮬레이터의 `peek('식')`은 리스트를 **0부터** 읽는 JS 배열로 본다(`caGrip[0]`이 1번 차).
- 주의: 엔트리 `rand(a, b)`는 둘 다 정수면 정수만 준다. 확률은 `rand(0.0001, 0.9999)`로(시뮬레이터도 이제 같게 동작).

## 환경 (macOS로 옮기며)
- `ejs.mjs / sim.mjs / run-ent.mjs / carpreview.mjs / plottracks.mjs / rlplot.mjs / tessvm/trun.mjs`의
  `createRequire('C:/Users/spyoh/...')` → `createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url))`.
- `entry-vibe-coding`은 저장소 루트에 clone(무시됨) 후 `npm install`, 헤드리스는 `npx playwright install chromium`.
- tessvm 확장은 위의 CRX 명령으로 `_work/tessvm/ext/`에 풀었다(버전 0.3.9).
- 순정 엔트리 러너(`run-ent.mjs`)는 이번에 돌리지 못했다: `npm run setup`이 디스크 부족(ENOSPC)으로 실패. 새 블록은 모두 엔트리 기본 블록
  (`sound_speed_set`, `ask_and_wait`, `get_canvas_input_value`, `set_visible_answer`, `set_brush_tranparency`)이다.

## 남은 아이디어
1. 순정 엔트리에서 v7 확인(붓 투명도가 채우기에 걸리는지, 소리 재생 속도).
2. 세이프티카 도색이 F1 모델이다(로드카 모델이 버퍼에 없음). 차 정점 버퍼 여유가 없어서 두 번째 모델은 어렵다.
3. 리플레이를 레이스 전체로 늘리려면 샘플 간격을 늘리거나 차별 리스트로 나눠야 한다(리스트 5000칸 제한).
4. 2인 분할 화면, 커리어 모드(v6 아이디어 목록에서 이번에 안 한 것).

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-24, v6)

산출물: `C:\Users\spyoh\entry_3d\3D 레이싱 v6.ent` (734 KB) ← 최신 (v1–v5 보존), 설명서 `3D 레이싱 v6 설명서.md`
빌드: `node build.mjs racing6.ent` → `globals 198, lists 296, functions 137, handlers 3`
v5 소스 백업: `build.v5.mjs`, `src.v5bak/`, `f1car.v5.mjs`, `f1tracks.v5.mjs`

플레이어는 **tessvm**(크롬 확장: Entry→Tess 디컴파일→JS 컴파일→pixi 렌더)로 돌린다. 이제 성능 판단 기준은 tessvm.

## tessvm 테스트 환경 (`_work/tessvm/`)
- 확장 CRX를 받아 `ext/`에 풀었다(제3자 코드라 git 제외). 다시 받기:
  `curl -sL -o tessvm.crx "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=130.0&acceptformat=crx2,crx3&x=id%3Dmdakllbjgeemolgfefbkbjfcoaknnfkk%26uc"`
  → 파일에서 `PK\x03\x04` 이후를 zip으로 잘라 `ext/`에 풀기. `ext/harness/index.html`만 git에 있다.
- `node tsrv.mjs` (포트 3100: `ext/` + 풀린 .ent) → `node trun.mjs file.ent --script s.json [--throttle 4]`
  스텝: `wait/down/up/shot/eval/fps(틱 ms·flush ms)/profStart/profStop(Entry 함수별 CPU)`.
  하네스는 확장의 `toTessProject` + `boot`를 그대로 쓰고, 구글 폰트로 나눔고딕코딩을 로드한다(playentry와 같게).
- `mkbench.mjs trk gfx out.json 9 shotPrefix` (메뉴 조작→레이스 벤치), `mktour.mjs prefix` (메뉴 전체 스크린샷).

## tessvm 성능 모델 (측정)
- 틱 = 고정 1/60초, `maxCatchUp 4`. **타이머도 틱 기반** → 틱이 느리면 게임이 슬로모션.
  v6은 `$TESSVM == 1`일 때 `get_date SECOND`로 실제 초당 틱을 세어 dt 배율 `rtK` (main.js `realTimeScale`).
- `+ - ×`는 엔트리 BigNumber 흉내(`cast.js`): 정수끼리 ~3 ns, 긴 소수 ~15–45 ns,
  **짧은 꼬리이거나 상쇄가 있는 소수 뺄셈은 decimalsBelow + toFixed로 130–250 ns** (161.86 − 147.66 같은 것).
  나눗셈은 |결과| ≥ 1e-3이면 싸다. 프로파일상 v5 프레임의 ~70%가 정점 변환의 이 연산이었다.
  → **정수 고정소수점**: 월드 cm 정수(`WU`), 카메라 축 ×16384(`BS`), 뷰 단위 1/ZU m, 화면 1/16(`QS`).
  풍경 모델 cm 정수, 차 모델 mm 정수, 차 법선 ×1024, 면 평면 오프셋 mm×1024. `drawScn`은 모델→뷰 정수 행렬 1개.
- 풍경·차는 경계구 절두체 컬링(`gtR`, 차 3.2 m). 싱가포르 ULTRA 13–21 → 5–6 ms/틱.
- 함수 호출은 제너레이터 트램펄린(싸다). `wait_until_true(not continue)` 트릭은 tessvm도 인식한다(무양보 루프).
- 데이터 리스트 소수는 `longTail()`로 상대 3e-10 흔든다(효과는 작음; 주범은 상쇄 뺄셈).

## v6에서 한 것
1. **풍경 침범**: `scPut`이 놓을 때 `scClear`(모델 상자 `gtX0/X1/Z0/Z1` × 배율, 회전)로 **서킷 전체** 링과 거리 검사.
   도로 + 연석 + 런오프(+0.8 m)에 닿으면 바깥으로 최대 3번 밀고, 안 되면 버린다. 먼 링은 `(d − 30)/segStep`만큼 건너뜀.
   dist 0 랜드마크(갠트리/호텔/다리)는 제외. 몬자 BANKING은 도로를 가로막고 있어서 `dist 34, face`로.
   검사: `node scncheck.mjs [gfx] [trks]` (의도된 5개만 남음), `node t6/lmcheck.mjs`.
2. **최적화**: 위 tessvm 항목. 순정 엔트리도 HIGH 레이스 1.9 → 2.55 fps.
3. **오브젝트 2개**: `txt`(줄바꿈 글상자, 폭 1000 고정 → "크기 정하기"가 정확한 글자 배율, 왼쪽 정렬) + `pen3`.
   `txt`가 복제본 64개(`NTX`) 생성, 복제본별 변수 `txt$slot`/`txt$v`.
   **ejs 새 기능**: `let obj$name` = 그 오브젝트 전용 변수(복제본마다 따로), `textColorHex(expr)`, `dateSec()`.
   `tx(i, s, x, y, 크기, 색, 정렬)`이 칸을 채우고 바뀌었을 때만 `txV` 증가. 가운데/오른쪽 정렬은 고정폭 추정(`TXCW` 0.5em)
   → 값 열은 전부 왼쪽 정렬로 배치(글꼴이 달라도 안 틀어짐).
   칸 배정: 1–23 레이스 HUD/타워, 24–41 메뉴 행·결과표, 42–64 카드. **칸 충돌 검사 `node t6/slots.mjs`**.
4. **메뉴** (`src/menu.js`): 메인 메뉴 + 미리보기 카드(3D 지도 `drawMap3D`, 카드 속 3D 차 `drawCardCar` —
   카메라 저장/복원 + `scrOX/scrOY` 화면 이동), 차고(턴테이블 `drawTurntable`, 차는 월드를 다 그린 뒤 그림),
   서킷 화면. 차 성능치는 build가 phys 식으로 적분(`ctKmh/ct100/ct200/ctGL/ctGH/ctKg`, 막대 `ctB1..4`).
5. **메뉴 카메라**: 조준점도 u로 보간 + yaw/pitch 이징. `node t6/camsmooth.mjs`로 v5 대비 저크 비교.

## 함정 (v6에서 새로 발견)
- tessvm은 `bgColor`가 없는 글상자를 **흰 배경**으로 그린다(컴파일러 기본값 #ffffff) → `bgColor: 'transparent'` 명시.
- Entry "크기 정하기"는 (폭×sx + 높이×sy)/2 기준이고 일반 글상자는 폭이 글자에 따라 변함 → 줄바꿈 글상자로 고정.
- Entry 함수는 중간 `return` 불가 → 컬링은 `vis` 플래그로 감싼다. ejs는 매개변수 재대입 불가.
- sim에서 함수 매개변수 이름 `R`은 런타임 객체를 가린다(쓰지 말 것).
- `v5shots.mjs`의 텍스트 출력은 옛 글상자 기준이라 이제 undefined — 글자 확인은 tessvm 하네스 스크린샷으로.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-23, v5)

산출물: `C:\Users\spyoh\entry_3d\3D 레이싱 v5.ent` (646 KB) ← 최신 (v1–v4 보존), 설명서 `3D 레이싱 v5 설명서.md`
빌드: `node build.mjs racing5.ent` → `globals 226, lists 259, functions 114, handlers 33`
v4 소스 백업: `build.v4.mjs`, `src.v4bak/`

전제(사용자): 확장 프로그램이 블록 코드를 컴파일해 약 100배 빠르게 돌린다. 리스트 5000칸 제한은 그대로.
→ 헤드리스 프로파일에서 v4 프레임의 ~95%가 블록 실행, 그리기(easel)는 몇 %뿐이었다. 확장 환경에서는
**그리기(폴리곤 수)가 병목**이 되므로, 남는 연산은 "그리기는 싸고 계산은 비싼" 기능(조명·물리·AI·모드)에 쓰고
폴리곤은 그래픽 옵션(LOW/HIGH/ULTRA)으로 조절하게 했다.

## v5에서 한 것
### 그래픽
- **F1 오픈휠 차** (`f1car.mjs`): 로프트(앞/뒤 단면이 다른 상자) + 육각 바퀴. 2단 LOD
  (실루엣 64정점/38면, 풀 208정점/95면). 노즈·프런트윙(플랩·엔드플레이트)·사이드포드·헤일로·헬멧·에어박스·
  디퓨저·리어윙·레인라이트, 앞바퀴가 조향각만큼 돈다.
  - 볼록하지 않아 백페이스 컬링만으로는 순서가 안 맞는다 → 빌드가 **8방향별로 면을 뒤→앞 정렬**(`coLo/coHi`),
    렌더러는 카메라가 차를 보는 방위(45° 단위)로 순서를 고른다.
  - **런타임 조명**: 면 법선(`cnX/Y/Z`)·태양, 차 단위 안개, `rgb()`로 직접 색 → 리버리 색이 팔레트와 무관.
  - 비용: 모델→뷰를 차마다 3×3 행렬 하나로 합성(정점당 곱 9개), 카메라·태양을 **차 로컬 좌표로** 옮겨서
    백페이스 사전검사가 면당 내적 1개 + 빌드 상수(`cfP` 평면 오프셋). 1.0M → 0.73M 블록/프레임(출발 그리드).
  - 가까운 K대만 풀 모델(`gfFull` LOW 1 / HIGH 4 / ULTRA 8, `pickCarDetail`), 나머지 실루엣, 더 멀면 카드 1장.
  - 도색 9종(`lv*` 리스트, 9번 = 고스트), 드라이버 이름 `drvName/drvShort`.
- **정점 버퍼**: `NSEG 480→460` (차 모델 272정점 자리). (461×10)+272+8+48 = 4938 ≤ 5000.
- 흰 **트랙 가장자리 선**(연석이 있으면 연석 안쪽), **그리드 박스**(`sgGrid`), 미니맵 차 색은 리버리.
- **그래픽 옵션** `gfx` 1/2/3: LOD 밴드 거리 `gfLod2/3`, 풍경 거리 `gfScn`, 풍경 풀모델 반경 `gfScnHi`,
  차 LOD `gfCar/gfCarM/gfFull`, 안개 거리 배율 `gfFog`, ULTRA는 풍경 산포 한 겹 더(`gfDen`). 바꾸면 buildTrack.
- **비**: 하늘 회색, 안개 거리 ×0.62, 팔레트 전체를 어둡게(loadPalette), 화면 빗줄기(속도에 따라 기울기),
  차 뒤 물보라(연기 풀 재사용, `NSMOKE 96`), 레인라이트 상시 점등, 그립 ×0.80(`wetK`, AI 계산에도 반영),
  스키드마크 없음.
- HUD: F1식 **5개 스타트 라이트**, 15칸 **레브 LED**(녹/적/청), 기어, DRS 표시(회색 / 주황 "DRS E" / 녹색 OPEN),
  섹터 기록·라이브 델타(보라=개인 최고, 노랑=느림, 녹/적 델타), 왼쪽 **타이밍 타워**(0.3초마다 갱신),
  메뉴 뒤 어두운 카드(`drawPanel`), 제목/부제는 상태에 따라 `goto`로 이동.
- 카메라 4종: 추격 / 콕핏 / 원거리 / **T캠**(에어박스 위, 노즈와 앞바퀴가 보임).
- **레이싱 라인 어시스트**(L 키): 트랙 로드 때 최소곡률 라인(`buildRacingLine`, 이웃 6→3→1링 이완 90회)과
  그 곡률로 만든 속도 프로파일(`speedProfile`, 제동 20 m/s² 역방향 패스). 도로에 띠로 그리고
  내 속도 대비 녹(가속) / 주황(리프트) / 빨강(제동).
  - AI에게 이 라인을 따르게 한 A/B(8서킷×100초): 4곳에서 느려지고 이탈 증가 → AI는 v4 라인 유지(`AIRL = 0`).

### 게임플레이
- **모드**: GRAND PRIX(1경기) / CHAMPIONSHIP(8라운드, 25-18-15-12-10-8-6-4점, 경기 후 순위표 `ST_STAND`)
  / TIME TRIAL(혼자, 무제한 랩, **고스트**).
- 메뉴 9항목: 시작, 모드, 차, 트랙, AI 레벨, **랩 수(1/3/5/10)**, **날씨**, **그래픽**, 에디터.
- 그리드: 플레이어 6번째 출발. AI 도색은 플레이어 팀과 겹치지 않게.
- **슬립스트림**: 앞차 40 m 이내·측면 2.4 m 이내 → 최고속 +3.5%, 항력 −30% (`updateTow`, 프레임당 1회).
- **DRS**: 가장 긴 직선 2개(360 m 초과)를 자동 탐지(`sgDRS`), 존 진입 때 1회 판정(2랩째부터, 앞차와 1초 이내,
  타임트라이얼은 항상). AI는 자동, 플레이어는 **E**. 브레이크를 밟으면 닫힘. 효과: 최고속 +5%, 항력 −35%, 다운포스 −25%.
- 섹터 3개(링 번호 1/3, 2/3), 개인 최고 섹터, 최고 랩 대비 **라이브 델타**(`bsT/csT` 링별 랩타임).
- 고스트: 0.1초 간격 샘플(`gr*` 기록 → 최고 랩이면 `gb*`로 복사, 최대 3000샘플 = 5분). 같은 서킷 재시작 시 유지.
  고스트는 실제 차보다 먼저 그려서 겹쳐도 내 차를 가리지 않는다.
- 결과표: 순위·이름·팀·기록/격차. 피니시 뒤에도 AI가 계속 달려 들어온다
  (v4는 `aiDrive`가 `raceState != 3`이면 브레이크를 밟아서 AI가 멈췄다).
- 차-차 충돌: 원 대신 **차 기준 직사각형**(길이 4.9, 폭 1.95) 겹침 → 얕은 축으로 밀어냄 + 요 흔들림.
- 차종 4개를 F1 세팅으로: ROSSO R5(균형) / ARGENTO W(저항 적음) / AZURE RB(다운포스) / ARANCIA MC(트랙션).

### 엔진
- **프레임 시계 스무딩**(`frameClock`): 프로젝트 타이머는 60Hz로 갱신돼서, 60fps 근처 이상(확장 사용 시)에서는
  대부분의 프레임이 dt=0을 읽는다 → dt를 지수평균하고 sim 시계를 실제 시계 쪽으로 천천히 당긴다.
- 시간 포맷터가 BLANK 대신 명시적 0채움 → 표의 열이 맞는다(`fmtMs`, `padR`).

## 함정 (v5에서 새로 발견)
- **`rgb()`에 소수를 넣으면 파랑 채널이 망가진다.** `Entry.rgb2hex = '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)`
  — r, g는 시프트가 정수로 자르지만 b는 그대로 더해져 `#d61f23.b33` 같은 문자열 → 검은색. b만 `Math.floor`.
  `sim.mjs`의 rgb도 이제 똑같이 동작하고, 잘못된 색 문자열은 검정으로 칠한다.
- Bash 도구에서 따옴표가 든 heredoc이 가끔 깨진다 → 편집 스크립트는 파일로 쓰거나 `python3 - <<'EOF'`.
- node 코드 안에서 `/tmp/...` 문자열은 `C:\tmp`가 된다(명령 인자일 때만 MSYS가 변환). 테스트 산출물은 `t5/`.

## 성능 (순정 Entry, 헤드리스)
- 출발 그리드 HIGH: 약 73만 블록/프레임(8대 밀집), 레이스 중 LOW 42–49만. 약 1.5–3.4 fps(v4는 3.4).
  확장(≈100배) 기준으로는 블록 비용이 수 ms 수준 → 폴리곤 수(HIGH 250–650장)가 지배할 것.
- 순정 Entry로 할 거면 GRAPHICS LOW 권장.

## 테스트 도구 (v5 추가)
- `node f1car.mjs` (정점/면 수), `node carpreview.mjs out.png` (8방향×2티어 미리보기, 게임과 같은 규칙)
- `node v5shots.mjs trk prefix` — env `GFX WX MODE CAM SECS` (시뮬레이터 스크린샷 + HUD 문자열)
- `node v5flow.mjs rounds fps` — 챔피언십 흐름(결과표→순위표→다음 라운드), DRS/슬립스트림/섹터. env `LAPSEL`
- `node rlplot.mjs out.png` — 8서킷 레이싱 라인·속도 프로파일 평면도
- `node mkscript5.mjs N out.json tag mode wx gfx secs` — 실제 Entry 키 스크립트 (9항목 메뉴용)
- `t5/dt.mjs trk secs` (env `AIRL`) — AI 라인 A/B

## 남은 아이디어
1. 타이어 마모·피트스톱(피트레인 경로가 필요), 차 손상.
2. AI 속도 계산을 레이싱 라인 곡률 기반으로 바꾸면 라인 추종도 이득일 수 있다(지금은 중심선 곡률).
3. 폴리곤 예산: 확장 환경에서 fps를 재서 `gf*` 표를 조정.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-21, v4)

산출물: `C:\Users\spyoh\entry_3d\3D 레이싱 v4.ent` (475 KB) ← 최신 (v3, v2, v1 보존)
빌드: `node build.mjs racing.ent` → `globals 147, lists 199, functions 76, handlers 18`
v3 소스 백업: `build.v3.mjs`, `src.v3bak/`

## v4에서 한 것 (요청 3가지)

### 1. 휙휙 움직이는 조작감 완화
- 플레이어 조향을 **속도 제한 방식**으로: `STEERIN 2.4`/s(감을 때), `STEEROUT 3.8`/s(풀 때). 예전 `min(1,10·dt)`은
  저프레임(dt 0.2 s)에서 키 한 번에 풀락이었다.
- 요 관성 `YAWK 1.0`(예전 1.6), 요 감쇠 1.6/s, 최대 조향각이 속도에 따라 30°→8°(42 m/s 이상).
- 카메라·차체 롤을 프레임률 무관 스무딩(`k·dt/(1+k·dt)`)으로, 추격 카메라 요 3.2/s·위치 6.5/s.

### 2. 코너를 300으로 돌 수 있던 문제 (진짜 원인 = 물리 버그)
- `carPhys`가 속도를 **새 차체 방향 축에 다시 투영**해서, 차가 돌면 운동량도 공짜로 같이 돌았다.
  AI 조향으로 브레이크 없이 풀스로틀만 해도 HARBOUR NIGHT(90° 코너) 평균 274 km/h, 이탈 0%, 랩 53초(AI 80초).
- 수정: 속도를 측정한 **옛 축**으로 되돌려 놓는다. 이제 코너링은 타이어 힘으로만 된다(저속 크롤은 운동학 모델).
- 직선 속도는 그대로 두고 넣은 요인:
  - 그립 = `caGrip·(GRIP0 15.5 + AERO 0.0019·v²)` — 다운포스라 고속 스위퍼는 되고 헤어핀은 안 된다.
  - 마찰원: 브레이크 중 횡그립 −40%·브레이크량. 저속 풀스로틀 −6%.
  - 피크 슬립(7.5°) 넘기면 그립 감소(앞 −20%, 뒤 −16%): 과조향은 언더스티어.
  - 앞바퀴 횡력의 종방향 성분(스크럽)으로 코너에서 감속.
  - 벽 긁기 속도 ×0.84, 정면 충돌 ×0.66.
  - 런오프: 자갈(속도 상한 ×0.32, 구름저항 0.85), 거친 아스팔트 런오프(×0.55).
  - **트랙 리밋**: 네 바퀴가 0.6초 이상 밖이면 그 랩은 기록 삭제(`lapBad`).
- AI 재조정: 새 그립식으로 코너 속도 계산(`AIMARG 0.84`), 제동거리에서 1세그먼트 공짜 거리 버그 수정,
  현재 세그먼트 코너도 반영, 필요 이상 조향락 금지(형상각+피크슬립), 핸드브레이크 제거.
  → 8개 서킷 AI 이탈률 0–2%. 풀스로틀 무제동은 시가지에선 완주 불가, 나머지는 느리거나 랩 삭제.

### 3. F1 서킷 8개 + 실제 같은 주변 환경
`f1tracks.mjs`: 서킷을 **지도 좌표의 코너점 + 반경**(fillet)으로 기술 (인터라고스·바쿠는 직선/각도/반경 방식).
이름 붙은 위치(`s3` 직선 시작, `c3` 코너 정점, `e3` 출구)로 고저·폭·터널·랜드마크를 코너에 묶는다.
`node plottracks.mjs tracks.png` 로 레이아웃 그림 확인.

| # | 서킷 | 길이 | 특징 |
|---|---|---|---|
| 1 | MONACO | 3.2 km | 전 구간 벽, 터널(위에 호텔), 카지노, 항구·요트, 야자수, 폭 4.6–5.2 |
| 2 | SPA | 4.7 km | 오 루주 ±40 m 고저, 아르덴 침엽수림, 자갈/아스팔트 혼합 |
| 3 | SUZUKA | 4.7 km | 8자 교차 — **입체교차 다리**(윗길 +11.8 m, 벽), 관람차, 자갈 |
| 4 | SILVERSTONE | 3.9 km | 평탄 비행장, The Wing, 격납고, 아스팔트 런오프 |
| 5 | MONZA | 3.8 km | 긴 직선·시케인·파라볼리카, 공원 숲, 옛 뱅킹, 광고 갠트리 |
| 6 | SINGAPORE | 3.9 km | 야간 시가지, 마리나 베이 샌즈, 싱가포르 플라이어, 유리 빌딩 |
| 7 | INTERLAGOS | 3.6 km | 반시계, 세나 S, 고저, 언덕의 집들, 호수 |
| 8 | BAKU | 5.3 km | 석양, 성벽 구간(폭 4.2), 메이든 타워, 플레임 타워 3동, 카스피해 |

- 링당 점 8 → **10** (`OL/OR` = 런오프 바깥 끝). `NSEG 400→480` (버퍼 4922/5000, 빌드가 검사).
- 런오프: 코너 바깥에 자동 생성(`buildTrack` 4c), 코너 3세그 전~9세그 후까지. 자갈 16 m / 아스팔트 13 m / 잔디 3 m.
  표면 코드: 0 도로, 1 연석, 2 잔디, 3 월드 밖, 4 자갈, 5 아스팔트 런오프.
- 런오프 뒤 **타이어 배리어**(빨강 띠), 시가지 벽엔 스폰서 색 페인트, 서킷별 도로 재질(시가지는 어두운 아스팔트),
  지면(잔디/포장/어두운 포장/모래), 원경(산맥 or 도시 스카이라인), 하늘색.
- 새 모델 14종: tyres, palm, yacht, wheel(관람차, 양면), mbs, flame, casino, maiden, gantry, banking, bridge, wing, hangar, citywall.
- **팔레트를 런타임 생성**: 하늘별 색표 리스트 대신 `matR/G/B`에서 트랙 로드 때 240×16번 `rgb()`.
- 랜드마크 표(`lm*` 리스트): 트랙별 u 위치·거리·방향(정사각/도로향/절대 yaw)·높이 오프셋. 다리는 절대 yaw.
- 차에 **바퀴 4개**(16면) 추가.
- 에디터 트랙 슬롯 4 → `EDTRK`(9). 트랙 선택 화면에 서킷 소개 줄(`trkInfo`).

## 테스트 도구 (v4 추가)
- `drivetest2.mjs trk ai|flat secs` — 플레이어 차를 AI 조향으로. flat = 브레이크 없이 풀스로틀(악용 검사).
- `drivetest.mjs trk smart fps secs` — 키보드식 on/off 입력 봇.
- `offdiag.mjs trk` / `trace.mjs trk from to` — 코스 이탈 원인(안/바깥, 속도, 조향) 추적.
- `f1shots.mjs 1,2,3 8,25` — 시뮬레이터 스크린샷. `mkscript.mjs N` — 실제 Entry에서 N번 서킷 선택→레이스 스크립트.
- 주의: `analyze.mjs`의 속도 프로파일은 아직 예전 그립(21 m/s²) 기준이다.
- 주의: src 파일은 LF로 통일했다 (CRLF면 여러 줄 문자열 치환이 조용히 실패한다).

## 성능
실제 Entry(헤드리스)에서 약 3.3–3.5 fps (v3 4.5). 폴리곤 110–230장. 원인: 링당 점 증가, 런오프 쿼드, 풍경 밀도.
줄이려면 `placeScenery`의 `mod(i, 2)`/`mod(i, 4)` 산포와 타이어 배리어 `mod(i, 3)` 간격을 늘릴 것.

---

# (이전) v3 인계 메모 (2026-09-20)

산출물: `C:\Users\spyoh\entry_3d\3D 레이싱 v3.ent` (394 KB)  ← 최신
        v2 (379 KB) 풍경·신트랙·AI난이도 / v1 (222 KB) 그 이전
빌드: `node build.mjs racing.ent` → `globals 141, lists 174, functions 74, handlers 18`

## v3에서 한 것

### 리스트 5000개 제한 대응
- **빌드가 5000개를 넘는 리스트를 만들면 에러로 멈춘다** (`build.mjs`의 크기 가드).
- 걸린 건 `colTab` 하나였다. 3(하늘) × 176(재질) × 16(안개) = **8448개**.
  → 하늘별로 `colA`/`colB`/`colC` 세 개의 데이터 리스트(각 2816)로 쪼개고,
  `buildTrack`이 현재 서킷의 것을 런타임 `colTab`(2816)으로 복사한다(`loadPalette`).
  덤으로 폴리곤마다 계산하던 인덱스에서 트랙 베이스(`colBase`)가 사라져 **핫 패스가 더 싸졌다**.
- 현재 최대 리스트는 정점 버퍼 3280개. 이 버퍼가 `(NSEG+1)*PPR`이므로
  **`NSEG`는 620 정도가 상한**이다 (`build.mjs`의 `NSEG` 주석에 적어뒀다).

### 트랙 미니맵 (붓으로)
- `buildTrack` 9단계에서 서킷 외곽선을 한 번 계산한다: 바운딩 박스를 84 px 상자에 맞추고
  52개 샘플의 좌/우 가장자리 점을 `mmLX/mmLY/mmRX/mmRY`에 넣어둔다.
- `drawMinimap()`이 프레임 맨 끝에서 그린다 — 어두운 패널 1장, 리본 52장,
  시작선 표시, 차량마다 마름모(색은 그 차의 도색, 내 차는 흰색에 더 크게).
  매 프레임 새로 그리는 비용은 약 55장 × 63블록 ≈ 3.5k 블록.

### 관중석·관제탑 계열 구조물 4종 추가
| 모델 | 내용 |
|---|---|
| `ctrl` | 관제탑 — 기둥 위에 유리 관제실, 꼭대기에 안테나 |
| `pits` | 피트 빌딩 — 차고 셔터 띠 + 옥상 테라스, 52 m 길이 |
| `stand2` | 2층 관중석 — 아래/위 관중석, 사이 라이저, 캔틸레버 지붕 |
| `terrace` | 지붕 없는 개방형 관중석 |
- 배치: 스타트/피니시 안쪽에 **피트 빌딩을 6세그먼트(57 m)마다** 깔아 연속된 피트레인을 만들고,
  그 위로 관제탑, 맞은편에 2층 관중석 + 조명탑. 느린 코너마다 관중석과 테라스를 마주보게 둔다.

### 이에 따른 최적화
- 구조물이 늘면서 3.1 fps / 실시간 0.39배까지 떨어졌다. 두 가지로 되돌렸다:
  - **풍경 전용 컬링 거리** `SCNFAR2` (약 270 m). 도로는 520 m까지 보이지만 건물은
    그보다 훨씬 앞에서 그리기를 멈춘다 — 400 m 건물은 몇 픽셀인데 모델 하나 값을 다 낸다.
  - 프레임 델타 상한 0.18 → **0.30**, 서브스텝 상한 4 → **6**.
- 결과: **4.5 fps, 실시간의 0.94배** (프레임당 약 24만 블록). AI 코스 이탈률 2% 유지.

## v2에서 한 것 (요청 4가지)

### 1. 주변 풍경 — 관중석 / 강 / 나무 / 건물
- `build.mjs`의 `sceneryModels()`: 박스·피라미드로 짜맞춘 모델 (v2에서 11종, v3에서 15종)
  — 침엽수, 활엽수, 낮은 건물, 고층 빌딩, 관중석, 조명탑, 바위, 천막, 수면, 광고판, 생울타리
  (+v3: 관제탑, 피트 빌딩, 2층 관중석, 개방형 테라스).
- **모델마다 2단 LOD**를 한 풀에 담았다. 정점·면 목록이 `[저해상도, 고해상도]` 순이라
  먼 것은 앞쪽 `vLo`개 정점만 변환하고 앞쪽 `fLo`개 면만 그린다 (나무 16면 → 8면).
- `src/track.js`의 `placeScenery()`가 트랙 생성 시 **결정적 LCG**로 한 번 배치한다.
  트랙마다 테마가 다르다: 1번 공원(활엽수·천막·생울타리), 2번 협곡(바위·침엽수),
  3번 항구(고층 빌딩·조명탑). 물은 세 트랙 모두 한쪽 옆으로 흐른다.
- **클리핑**: 모든 면이 기존 `quad()`를 그대로 통과한다 — 근평면 Sutherland-Hodgman 클리핑,
  부호면적 백페이스 컬링, 화면밖 기각. 그래서 관중석 안쪽을 지나가도 정상적으로 잘린다.
- **깊이 정렬**: 오브젝트를 옆에 선 세그먼트의 연결 리스트(`scHead`/`scNext`)에 달아두고
  그 세그먼트의 드로우 유닛과 같이 그린다. 화가 알고리즘이 도로·차량과 알아서 정렬해준다.
  - 터널 구간은 배치에서 제외했다. 안 그러면 바깥 나무가 터널 벽 위에 그려진다.
  - 세그먼트 컬링의 측면 여유를 `SCNM = 120 m` 넓혔다. 안 그러면 화면 가장자리의 큰 건물이 사라진다.
- **원경 능선**(`drawHills`): 실제 지오메트리가 아니라 화면공간 띠지만, 프로필을
  **월드 방위각**으로 색인해서 카메라가 돌면 같이 지나간다. 2겹으로 원근감을 준다.
- 트랙별 지면 재질을 추가했다 — 1번 잔디, 2번 마른 흙, 3번 야간용 어두운 지면.

### 2. 최고 속도
- 원인은 차량 스펙이 아니라 **항력**이었다. `v²×0.0085`가 어떤 차든 110 km/h에서 막았다.
- 항력 `0.00013`, 구름저항 `0.020`으로 낮추고 토크 곡선을 `0.18 + 0.82·f(0.45+0.55f)`로 바꿨다.
  최고속은 **하드 리미터**로 정확히 지킨다(공중에서는 해제).
- 차량: VIPER GT 317 / RALLY-X 274 / BULLET S 367 / DRIFTER 302 km/h. 0-100 km/h 2.1초.
- 잔디 패널티도 완화 (`topMul 0.44→0.55`, `rollRes 0.50→0.30`) — 빠져나올 수는 있게.

### 3. 트랙 — 더 복잡하고 다이내믹하게
- 방사 하모닉을 버리고 **"직선 몇 m, 몇 도 코너, 반지름 몇 m"** 로 기술하는 방식으로 바꿨다
  (`circuit()` in build.mjs). 닫힘 오차는 직선 길이에 최소자승으로 분배해 정확히 이어진다.
  회전각 총합은 자동으로 360°에 맞춰 정규화한다.
- `NSEG 200 → 400`, 링 간격 9.5 m.
- `node analyze.mjs` 로 설계 즉시 수치 검증 가능 (길이/최고·최저 코너속도/랩타임/최소반경):

| 트랙 | 길이 | 최고 | 최저 | 평균 | 250km/h 이상 | 최소 반경 | 이상적 랩 |
|---|---|---|---|---|---|---|---|
| SUNSET RING | 3794 m | 317 | 109 | 233 km/h | 35% | 44 m | 62 s |
| CANYON RALLY | 3772 m | 316 | 95 | 185 km/h | 7% | 33 m | 78 s |
| HARBOUR NIGHT | 4154 m | 317 | 105 | 210 km/h | 27% | 40 m | 78 s |

  700 m 피트 직선, 고속 스위퍼, 헤어핀, 시케인, 고저차 ±36 m, 터널, 점프대가 모두 들어있다.

### 4. AI 난이도
- 메인 메뉴에 **AI LEVEL** 항목 추가: `ROOKIE / AMATEUR / PRO / ACE / INSANE`.
  한 단계가 상대 전원의 출력·그립·최고속(`aiPow`)과 판단력(`aiSkl`)을 동시에 스케일한다.
- 실측 AI 최고속: ROOKIE 195 / PRO 265 / INSANE 299 km/h.

### AI 주행 품질 (원래 "너무 쉬움"의 진짜 원인)
세 가지 버그를 잡아 **코스 이탈률 24% → 1%**, 중간 속도 114 → 176 km/h가 됐다.
1. **속도 결정이 틀렸다.** 시야 안 최악 코너 속도로 *항상* 달려서 직선에서도 기어갔다.
   → 코너마다 "지금 이 속도로 가도 제동거리 안에 들어오는가"를 계산해 최솟값을 쓴다.
2. **조준점이 너무 멀어 코너 안쪽을 잘라 들어갔다** (이탈의 100%가 안쪽이었다).
   → 반지름 R 코너를 d만큼 앞을 보고 달리면 안쪽으로 `d²/8R` 파고든다. 이 값이 노면을
   벗어나지 않도록 조준 거리를 제한한다.
3. **브레이크 게인이 약했다.** 목표 속도보다 7 m/s 초과해야 풀 브레이크였는데,
   목표가 접근에 따라 서서히 내려가므로 그 조건이 성립하지 않았다. → 2.2 m/s로.
- 코스 밖에서는 레이싱 라인 대신 **도로 중앙**을 조준한다(예전엔 못 돌아왔다).

### 저프레임 대응
- 프레임 델타 상한 `0.09 → 0.18` (v3에서 0.30), 그리고 **물리·조작을 55 ms 이하 슬라이스로 서브스텝**한다.
  타이밍·점수·카메라는 프레임 클럭 그대로. 이게 없으면 저프레임에서 AI가 12 m를 눈감고 달린다.
- AI의 도로 탐색(`aiPlan`)은 프레임당 1회, 조향·가감속(`aiDrive`)은 서브스텝마다.

## 현재 성능 (헤드리스 Chrome 기준)
- 레이스: **약 4.5 fps, 실시간의 0.94배**, 프레임당 약 24만 블록, 그려지는 폴리곤 약 115장.
- 메뉴(트랙만): 약 10 fps, 12만 블록.
- 풍경이 프레임의 절반 정도를 쓴다 (`projSlots` + `quad` + `drawScn`).
  더 줄이려면 `placeScenery`의 산포 밀도(`mod(i, 2)`, `mod(i, 5)`)를 낮추면 바로 가벼워진다.

## 파일 구성
| 파일 | 내용 |
|---|---|
| `ejs.mjs` | JS 부분집합 → Entry 블록 컴파일러 |
| `build.mjs` | 서킷 생성기, 176색 팔레트, 하늘별 안개 테이블, 차량·풍경 모델, 미니맵 상수 |
| `analyze.mjs` | 서킷 속도 프로파일 분석 (`node analyze.mjs`) |
| `tune.mjs` | 서킷 설계용 실험 하네스 |
| `src/track.js` | 스플라인 → 400링, 정점버퍼, 뱅킹·곡률, 터널/점프/방호벽, 풍경 배치, `sampleTrack()` |
| `src/render.js` | 카메라, LOD 병합 컬링, 근평면 클리핑, 화가 알고리즘, 하늘/능선/풍경/그림자/연기 |
| `src/phys.js` | 바이시클 모델, 노면별 접지력, 드리프트, 충돌 |
| `src/ai.js` | `aiPlan` (도로 읽기) + `aiDrive` (조작) |
| `src/game.js` | 상태머신, 서브스텝 루프, 랩/순위/기록, 카메라 |
| `src/editor.js`, `src/hud.js`, `src/main.js` | 에디터 / HUD / 진입점 |
| `run-ent.mjs` | 헤드리스 러너 (키 스크립트, 스크린샷, 블록 프로파일러) |

## Entry 고유 함정 (v1에서 발견, 계속 유효)
- **텍스트 정렬 상수가 반대**다: `Entry.TEXT_ALIGNS = ['center','left','right']` → 0=가운데, 1=왼쪽.
- **빈 문자열 `''`이 `0`과 같다고 비교된다** (비교 블록이 느슨한 `!=`를 쓴다).
  게다가 로드 시 `!variable.value → 0`. → `src/util.js`의 `BLANK = '\u200B'`를 쓸 것.
- 값 반환 함수는 호출당 2프레임. 이른 `return`은 컴파일러가 거부한다.
- 펜 오브젝트는 `hide()` 상태에서도 그려진다.

## 검증 완료 (실제 Entry, `run-ent.mjs`)
메뉴 5항목 · 차량/트랙/난이도 선택 · 카운트다운(정지) · 8대 출발 · 80초 연속 레이스 무오류 ·
랩/순위/기록 · 드리프트·연기·스키드마크 · 일시정지/재개/재시작/메인메뉴 · 결과 화면 ·
추격/콕핏/원거리 카메라 · 트랙 1·2·3 풍경과 터널·점프·방호벽 · 트랙 에디터(생성→주행).

## 남은 아이디어
1. 펜 채우기에 알파가 없어 타이어 연기가 불투명한 마름모로 보인다.
2. 풍경을 더 줄이고 싶으면 배치 밀도, 더 늘리고 싶으면 `NSCENE`(760)과 산포 주기를 조정.
3. `drawCar`의 14면 모델과 `quad()` 호출 수가 다음 최적화 표적.

## 조작
W/↑ 가속, S/↓ 브레이크·후진, A/D·←/→ 조향, Space 핸드브레이크,
C 카메라 전환, P 일시정지, R 재시작, M 메인메뉴, ENTER 확정, 화살표 메뉴 이동.
에디터: 드래그 이동, 빈 곳 클릭 추가, X 삭제, Q/E 폭, R/F 높이, T 터널, J 점프, B 방호벽,
C 체크포인트, S 시작선, N 새 타원, Z/V 줌, 화살표 이동, ENTER 주행, ESC 나가기.

## 명령
```
node build.mjs racing.ent                                    # 빌드
node analyze.mjs                                             # 서킷 속도 프로파일
node run-ent.mjs racing.ent --ms 5000 --shot a.png --script steps.json
TOPN=20 node run-ent.mjs racing.ent --count 8000 --script bench.json   # 블록 프로파일
```
러너를 쓰려면 먼저 `entry-vibe-coding`에서 `node server.js`.
