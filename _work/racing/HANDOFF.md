# ENTRY RACING 3D — 작업 인계 메모 (2026-09-26, v6.0)

산출물: `3D 레이싱 v6.0.ent` ← 최신, 설명서 `3D 레이싱 v6.0 설명서.md` (v5.2는 루트 `old/`로), 썸네일 `3D 레이싱 썸네일.png`
빌드: `node real/prep.mjs && node build.mjs racing60.ent` → `globals 491, lists 558, functions 323, handlers 3`, .ent 1.19 MB, **project.json 15.42 MB**
(온라인 저장 문턱 추정 16.17 MB까지 0.75 MB. 더 늘릴 때는 함수 블록 줄이기 먼저)

## 요청과 한 것
"썸네일 찍어 편집해서 png로" → 모나코 헤어핀(링 189, 6번 차 첫 바퀴, 차 7대·야자수·바다·곶). 임시 자유 카메라 빌드(thK 훅, 게임엔 없음) +
`_work/tessvm/thumbshot.mjs`(ULTRA 1920×1080, `look` 옵션) + `thumb/edit_thumb.py`(색·비네팅·메뉴풍 제목).
"4,5,6,7 추가(4는 현실과 최대한 비슷하게)":
- 4 서킷 15-19: `real/geo.mjs`에 it-1953 hu-1986 es-1991 sa-2021 us-2023, fetch → prep META(고저차 35/35/30/3/6, 벽, 나무, 색).
  - ctl 리스트 5000 한도: 새 5곳만 `ctlK 1.15`(제어점 간격 ×1.15) → 총 4946(에디터 48 포함). 더 늘리려면 ctl*2 리스트 분리 필요.
  - 제다 `lineStart`(지도 피트 조각 대신 f1-circuits 출발선), `avenue`(야자수 34 m 간격 양쪽), `masts`(조명탑). 라스베이거스 `masts`.
  - 새 모델 31 sphere(46정점, 재질 idx.sphere 4색), 32 strat(48), 33 eiffel(42). NMAT 280→288(colTab 4608). 명소 종류 prep에서 이름으로.
  - 야간: 하늘 어둡게(DUSK 자동 [8,10,26]), trkHillT 도시 블록(sg, sa, us). trkT0 +[33,45,40,34,17].
  - NTRK 19, EDTRK 20. 고스트 pb*(1-8) pb*2(9-16) pb*3(17-20), pbBase oPB2 0/1/2. RT_L15..19/RT_W15..19.
  - **세이브 필드 고정 배치**: 17-24/25-32(1-8), 36 TRKV, 37-42 랩·43-48 레이스(9-14), **49-53 랩·54-58 레이스(15-19)**. mergeRec이 명시적 번호로 읽음
    (예전 NTRK 기반 공식은 19에서 43-48을 밀어 옛 기록을 잘못 읽었을 것). 백업 코드 nF 48/58 허용, SVMAX 400→520(최대 450자).
  - 기록 탭 2열 10행, BEST RACE 줄 tx 44.
- 5 피트 휠건(rules.js pmStep/pmDone/drawPitGame): 플레이어 정차 때만. 마커 `0.5-0.5cos(t·330°)`, 초록 ±0.17, 중앙 ±0.07.
  결과마다 pmBusy(0.2/0.45/1.1 s, 실제로 기다림), 1초 안 누르면 자동. 완벽 약 2.34 s, 무입력 약 5.3 s. 노즈 수리 pmMin 이상.
- 6 사진 모드 ST_PHOTO 15(ST_FORM이 14): 일시정지·리플레이에서 O(pollAction pkSt[22], NPK 22). photoSeg는 전체 링 2칸 간격 스캔.
  HUD는 updateHud 페이지 전환으로 비우고 도움말만(SPACE 토글).
- 7 AUTO: gfxSel 1-4(4=AUTO, gfx=3으로 빌드), gfQ가 setupCam의 lodF2/3·scnFar2·scnHi2·scnSz(정수로 반올림)·cullAhead·landFar2와
  cullSegments sideR에 곱해짐. gfAutoStep(main 루프): dateSec마다 프레임 수, <48 두 번 → −0.1(최저 0.45, 그 아래면 gfx 2), ≥57 다섯 번 → +0.05(afCap까지), gfQ≥0.7이면 gfx 3.
- 시험: 새 `t7/pitgame.mjs`, `t7/photoauto.mjs`(sim.mjs `R.dateSecFn`으로 시계 바꿈), `t7/circstats.mjs`. mkb는 그래픽 4개(`% 4`).
  intrude(새 5곳, RUNOFF 포함) 0, offdiag 1 m 초과 0, v30·keys·multi·savecode·slots·tilt(19)·pinned·alloc·share·wall·stuck PASS.
  prof의 "tuned top speed"는 v5.2에서도 FAIL(기대 공식 낡음).
- 서킷 가이드 표: 최저 속도 = rlV 최솟값, 전개 구간 = rlV ≥ 최고속 95% 비율(기존 표와 맞춤).
- tessvm: 새 5곳 HIGH·ULTRA 57–60 fps.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-26, v5.2)

산출물: `3D 레이싱 v5.2.ent` ← 최신, 설명서 `3D 레이싱 v5.2 설명서.md` (v5.1은 루트 `old/`로)
빌드: `node build.mjs racing52.ent` → `globals 449, lists 555, functions 315, handlers 3`

## 요청과 한 것
"다른 최적화 방법은?" → 아이디어 7개를 `최적화 아이디어.md`에 저장 → "1,2,5만, 1번 시험" → "2,5 진행(효과 있는 것만 적용)"
- 1 tessvm 커널: 효과 없음, 보류. 확장은 JS 커널만 씀. 게다가 v3.3의 빈 리스트 저장(allocLists) 때문에 커널이 첫 호출에서 영구 정지
  (v5.1의 루트 43개도 한 번도 안 돎). 미리 채운 시험 빌드에서도 호출당 복사 ~170 µs vs 계산 ~12 µs. 도구 `_work/tessvm/kprobe.mjs`, `kslots.mjs`.
- 2 그리기 호출 줄이기: A 색 캐시, B 작은 폴리곤(2%뿐), C 마지막 goto 생략 — 모두 오차 범위라 넣지 않음.
- 5 물리·AI 정수화(적용):
  - `sampleTrack` 13링 탐색을 `sgXi/sgZi` cm로.
  - `carsCm()`(phys.js): `caXi/caZi` cm, game.js에서 updateTow 전과 둘째 이후 슬라이스의 aiDrive 전에 부름. aiDrive가 모든 carPhys보다 먼저 돌아 그 사이 위치가 안 바뀜.
    `updateTow`·`aiDrive` 차 사이 거리는 정수 차 × 방향(×BS 정수) / ZU.
  - 0 곱하기 건너뛰기: aiPlan `aw`(직선의 av 0), carPhys `topK`·`aeroG`(drs/tow/ers/dmg 0).
  - aiPlan 상수 `0.50000000003141593`은 String이 `0.500000000031416`(15자리)이라 꼬리가 짧았음 → `0.49999999996858407`.
    긴 꼬리 상수는 `String(c)`의 소수 자릿수가 16 이상인지 확인할 것.
- 결과(tessvm HIGH, 번갈아 3회 평균 tick, v5.1→v5.2): 모나코 5.41→5.35, 멜버른 4.24→3.97, 스즈카 4.46→4.19 ms.
  모나코 toFixed 3057→2377, decimalsBelow 9402→7541 /프레임.
- 벤치 방법: `t7/mkb.mjs`로 키 스크립트 → `_work/tessvm/trun.mjs`를 빌드끼리 번갈아 3회, race2–4 tick 평균(한 빌드 첫 회가 자주 튐).
- 테스트: v30 10/10, keys, multi A–G, tilt, pinned, wall, stuck(400 s 전원 완주), offdiag 6곳 240 s 1 m 넘는 이탈 0.
- 남은 느린 지점은 `최적화 아이디어.md` 5번 참고(그리기 쪽이 더 큼).

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-26, v5.1)

산출물: `3D 레이싱 v5.1.ent` ← 최신, 설명서 `3D 레이싱 v5.1 설명서.md` (v5.0은 루트 `old/`로)
빌드: `node build.mjs racing51.ent` → `globals 449, lists 553, functions 314, handlers 3`

## 요청과 한 것
"연산블록 관련해서 최적화 할게 있을까?" → "진행해줘"
- 측정: tessvm `cast.js`(엔트리 BigNumber 흉내)에 임시 계수기를 달아(`trun.mjs` castStart/castStop; 끝나면 원본 복구) 느린 길(snap→toFixed,
  decimalsBelow) 호출 위치를 셈. 모나코 HIGH 프레임당 toFixed 5.6천·decimalsBelow 1.4만. CPU 프로파일로는 cast.js 함수 전체가 게임 틱의 약 절반.
- 알아낸 것: 느린 길의 주범은 "짧은 소수"보다 **상쇄 뺄셈**(비슷한 두 소수의 차, 결과의 자릿수 격자 안에 피연산자 꼬리가 다 들어감).
  꼬리를 길게 해도(LONGK) 뺄셈은 그대로 느림 → 정수화만이 해법. 정수끼리는 Number.isInteger 뒤 바로 반환.
- 바꾼 것: `drawEdgeLines`(링별 `sgE0/sgE1` ×4096, idiv), `drawStartLine`(1/8을 정수로), `cullSegments` 앞쪽·옆 훑기
  (`sgXi/sgZi` cm, `chXi/csXi/tanHalfI` ×1024, `sgMgi`, `segStepI`, `farCull2i`, `SCNMI`; visD는 m²로 되돌려 저장),
  `drawScnIn`(`sgNXi/sgNZi/sgWi`, `scOfS`, `rgD` cm²), `drawScn`(`scXi/scYi/scZi`, ringFast에서 계산), aiPlan 가중 상수,
  `ringFast()`(buildTrack 13단계: 위 정수 사본 + sgX/Y/Z/DX/DZ/NX/NZ/W에 LONGK 1.0000000003141593).
- 결과(tessvm HIGH, 번갈아 3회 평균 tick): 모나코 5.51→5.32, 멜버른 4.53→4.34, 스파 3.90→3.74 ms(약 4%). 화면 픽셀 비교 최대 54px.
- 더 할 수 있는 것: sampleTrack·aiPlan·aiDrive·updateTow·carPhys의 위치 차(상쇄 뺄셈)를 mm 정수로, quad의 안개 단계를 정수로
  (단, pvZ를 쓰는 모든 경로—drawScn·drawCar·projSlots—가 정수 깊이도 써야 함).

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v5.0)

산출물: `3D 레이싱 v5.0.ent` ← 최신, 설명서 `3D 레이싱 v5.0 설명서.md` (v4.3은 루트 `old/`로)
빌드: `node real/prep.mjs && node build.mjs racing50.ent` → `globals 442, lists 541, functions 313, handlers 3`, .ent 1.04 MB

## 요청과 한 것
"실제로 있는 f1레이싱 맵을 실제와 최대한 비슷하게 5개이상 추가해줘" → 6개: 9 바레인(bh-2002), 10 멜버른(au-1953), 11 몬트리올(ca-1978),
12 레드불 링(at-1969), 13 잔드보르트(nl-1948), 14 오스틴 COTA(us-2012). 모두 `real/` 파이프라인(geo.mjs CIRCUITS, prep.mjs META).
- `f1tracks.mjs`: 새 정의(하늘·땅·런오프·폭; 배치는 SQUARE 자리표시자, 실제 자료가 없을 때만), `TURNS` 14개. 멜버른은 hill[1]=1(도심 스카이라인).
- `prep.mjs` META: 고저차 레드불 65, COTA 41, 멜버른·몬트리올 4, 나머지 SRTM. 멜버른은 OSM에 raceway도 피트 레인도 없어 f1-circuits 첫 점이 출발(피트 직선).
  대관람차는 트랙에서 1.5 km 안만(멜버른 스타 4 km 제외).
- 트랙 수: `NTRK 14`, `EDTRK 15`. 고스트 PB 저장은 한 리스트 5000 한도로 `pbX/Z/W`(1-8) + `pbX2/Z2/W2`(9-15), `pbBase(tk)` → `oPB`, `oPB2`.
  `RT_L9..14`, `RT_W9..14`, rtGet/SetK·G 14갈래. 저장 레코드: 17-24/25-32는 그대로(1-8), 36 TRKV, **37-42 랩·43-48 레이스(9-14)**,
  mergeRec은 필드가 있으면 읽음. `pF` 48 → 64. 백업 코드 nF 48 허용, 37번 이후 숫자 검사. 도전과제 13은 2^NTRK − 1.
  프로필 기록 탭 2열 7행(칸 25-38, 최고 레이스 줄은 39로). 챔피언십 14라운드, 메뉴 `ALL 14`. `trkT0` 15개.
- 테스트: `t7/intrude.mjs`가 NTRK 전체. 새 6개 침범 0(런오프 포함), AI 큰 이탈 0, 랩 103–158 s. v30 10/10, keys, multi(E는 가끔 타이밍으로 실패, 재실행 PASS·옛 코드도 동일),
  savecode 31, slots, tilt(14), pinned, alloc PASS. tessvm 멜버른 HIGH 59–60, 멜버른·몬트리올 ULTRA 59–60.
- 남은 것: 몬트리올 바이오스피어, COTA 전망탑 모델 없음. 잔드보르트 바다는 자료 범위(패드 400 m) 밖이라 안 보임.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v4.3)

산출물: `3D 레이싱 v4.3.ent` ← 최신, 설명서 `3D 레이싱 v4.3 설명서.md` (v4.2는 루트 `old/`로)
빌드: `node build.mjs racing43.ent` → `globals 428, lists 538, functions 312, handlers 3`

## 요청과 한 것
"모든 맵에서 폴리곤 정렬에 약간씩 버그가 있어. 예를들면 건물 폴리곤이 트랙 벽보다 나중에 그려진다거나."
- 원인 1: 단위 안에서 drawSeg(도로·벽·터널) 뒤에 drawScnIn → 벽 뒤 건물이 벽을 덮음(터널 위 건물도 천장을 덮음).
- 원인 2: 풍경은 가까운 링 하나에만 매달림 → 긴 건물의 먼 끝이 더 먼 링의 벽을 덮음.
- `render.js`: drawSeg를 `drawSegGround`(띠·런오프·교량 밑면)와 `drawSeg`(도로·연석·벽·터널·선)로 나눔. renderWorld 단위 순서:
  땅 → drawScnIn pass 1 → drawSeg → 고스트·차 → drawScnIn pass 2(카메라가 도로 밖, 물체와 같은 쪽일 때만; 아니면 리스트를 안 돈다) → 연기·불꽃.
  cullSegments가 그 프레임에 그리는 링을 `rgF`(frameId)와 `rgD`(거리²)로 찍고, 긴 물체는 다른 끝 링이 더 멀고 그려지면 여기서 건너뜀.
- `track.js scFile/snLink`: `scOf`(링 법선 방향 오프셋), `scRa/scRb`(바닥 네 모서리가 걸친 링, ±12), 노드 풀 `scnO/scnN`(2×NSCENE), 링 리스트는 |scOf| 큰 것부터.
  (이름 `snO`는 리플레이 스냅샷 리스트와 겹쳐서 scnO.)
- 확인: sim 콕핏 카메라로 링 12개마다 렌더(옛/새 비교, `placeCar` → `updateCam` → `renderWorld`; sim `peek`에서 리스트 대입은 안 먹는다),
  모나코·바쿠에서 벽을 덮던 건물이 벽 뒤로. 테스트 v30 10/10, keys, tilt, pinned, alloc, intrude PASS.
  tessvm 모나코 ULTRA: 처음엔 tick +1.5 ms(drawScnIn 5.5%) → 링 거리 미리 계산, 2차 순회 생략으로 v4.2와 오차 범위.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v4.2)

산출물: `3D 레이싱 v4.2.ent` ← 최신, 설명서 `3D 레이싱 v4.2 설명서.md` (v4.1은 루트 `old/`로)
빌드: `node real/prep.mjs && node build.mjs racing42.ent` → `globals 427, lists 531, functions 309, handlers 3`, .ent 0.88 MB

## 요청과 한 것
"다리 같은데에서는 옆에 잔디를 그리면 안되고 주변 도로가 보이게" → 예상 보고 뒤 "하이 전용으로 B(교차로 주변 지형), 울트라 전용으로 C(전체 지형), 주변지형이 어느정도 현실적으로"
+ 도중 제보: 모나코(페어몬트 헤어핀)에서 옆 구간의 잔디/포장 띠가 도로를 덮는 현상(모든 그래픽).
- 다리(`F_BRIDGE` 32): P_GL/GR을 도로 끝 −1.3 m로 → 잔디 사각형이 옆면(`M_deck`), 밑면은 다음 링도 다리일 때. 제방 `F_EMB` 64(윗길 ±130점),
  다리 아래 `F_UNDER` 128(아랫길 ±15점, 정렬 거리 ×1.25+400). `cullSegments`: 다리가 낀 단위는 st=1(아니면 옆면이 들판으로 늘어나 하늘에 가는 선).
- 지형: prep `Tat`(흐린 DEM × terrain + 근처 랩 eyAbs 가중 평균), 격자(`terrain` → build `tgHD/tgCD` 문자열, `tgX0/Z0/C/NX/NZ`), 칸 = 종류 + 4×등급.
  제외: 도로에서 40 m + 0.2칸 안, 물, 건물 35% 이상(모나코 483, 싱가포르 652, 바쿠 651칸). 런타임 `loadLand`(buildTrack 11b) → `tgH/tgK/tgM`, 3×3 조각 `tp*`(NTP 640).
  `cullSegments`가 조각을 visI 음수로 넣고 `renderWorld`가 `drawLand`. 가까운 조각(4칸 = tgC×4 안)만 칸마다.
  팔레트 `forest`, `deck` 가족(NMAT 280). 물체 dy도 Tat 기준(도로 14→90 m 램프, −40..160).
- 잔디 띠: ctl `gl/gr`(띠 끝 땅 높이, ULTRA와 F_EMB에서 사용), `sl/sr`(다른 구간에 닿기 전까지의 폭) → `sgSL/SR`, 런오프도 그 안.
  띠 끝 45 m 안에 더 낮은 구간 → gl을 그 높이로 + F_EMB(모든 그래픽). sampleTrack도 띠 경사를 따른다.
- `drawSky`: 지평선 아래 땅 색을 6단(카메라 높이/화면 거리로 안개 단계).
- `gfSide` ULTRA 450 → 300 m.
- 측정(tessvm): 스즈카 HIGH 58–60, 스파 ULTRA 59–60(tick 4.6–5.1), 스즈카 ULTRA 58–60(5.6–7.4), 모나코 ULTRA 52–60(v4.1 47–59).
  sim에서 프레임당: 스즈카 ULTRA 링 51·조각 30·풍경 193·면 646. 주의: sim의 `s.png`는 다시 그리지 않는다(`renderWorld()`를 부른 뒤 저장).
- 테스트: v30 10/10, keys, tilt, pinned, alloc, intrude(도로/런오프) PASS, AI 큰 이탈 0.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v4.1)

산출물: `3D 레이싱 v4.1.ent` ← 최신, 설명서 `3D 레이싱 v4.1 설명서.md` (v4.0은 루트 `old/`로)
빌드: `node real/prep.mjs && node build.mjs racing41.ent` → `globals 421, lists 495, functions 306, handlers 3`

## 요청과 한 것
"트랙을 달릴때 트랙이 오밀조밀한 구간에서는 옆 트랙부분도 보이게 해줘. 그리고, 일단 모나코맵에서 건물이 트랙안으로 삐져나온것을 발견했어. 수정해줘(다른트랙에도 삐져나온 부분 없는지 검사)"
- `render.js cullSegments`: 앞쪽 훑기(−CULLBACK..cullAhead) 다음에 나머지 링을 `gfSide`[180, 300, 450] m 안이면 단위로 더함(거리로 st 1/2/3,
  먼 곳은 (d − R)/segStep 건너뜀). 기존 삽입 정렬이 거리순으로 맞춘다. 차·풍경·연기도 그 단위에서 그려진다.
  확인: 모나코 라스카스에서 출발 직선, 스즈카 아랫길에서 윗길 다리(sim 스크린샷), tessvm HIGH 59–60 fps 유지.
- 침범 원인: 모나코 터널 위 건물(overTun, chk 0)이 도로 높이에서 시작해 터널 안으로 5.3 m. `prep.mjs`에서 바닥을 8.3 m(TUNH 7 + GRASSD 1 + 여유)로.
  `track.js scClear`: 가까운(d < 30 m) 링은 링 사이 1/4 지점도 재고, 런오프는 max(이 링, 다음 링).
- 새 테스트 `t7/intrude.mjs [trk..] [--list] [--margin m]`: 모든 풍경 바닥을 1 m 간격으로 모든 도로 구간(선분)과 비교. `RUNOFF=1`은 리얼리스틱 규칙
  (피트 레인)과 런오프(링 사이 선형으로 좁아짐)를 도로로 친다. 터널 링은 지붕(도로 +6 m)보다 낮은 것만. sim 리스트는 0부터(인덱스 k = 항목 k+1)라는 것 주의.
  결과: 도로만 / 런오프 포함 모두 8개 서킷 0개.
- 메뉴 버전 표시 `F1 EDITION / v4.1`(v4.0에서 v3.3으로 남아 있었다).
- 테스트: v30 10/10, keys, tilt, pinned, alloc PASS.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v4.0)

산출물: `3D 레이싱 v4.0.ent` ← 최신, 설명서 `3D 레이싱 v4.0 설명서.md` (v3.3은 루트 `old/`로)
빌드: `node real/prep.mjs && node build.mjs racing40.ent` → `globals 421, lists 494, functions 306, handlers 3`, **.ent 0.79 MB, project.json 약 12.5 MB**

## 요청과 한 것
"이제 트랙을 실제와 최대한 비슷하게(풍경과 트랙모양 등) 만들어줘(tessvm 에서 50fps방어가 목표)"
사용자 결정: 기록(서킷 최고 랩·레이스, 랭킹, WR 고스트)은 새로 시작 / 트랙은 실제 길이 그대로(스파 링 간격 15 m 감수).

### 실제 서킷 파이프라인 (`real/`)
- `real/fetch.mjs [id...]` → `real/cache/`(git 제외): bacinger/f1-circuits(MIT) 중심선, Overpass(OSM, ODbL) 건물·물·숲·공원·경주로 등(`*.osm.json`),
  관계는 구성원 도형까지 따로(`*.rel.json`: `out tags geom`은 관계 구성원을 빼먹는다), 이름난 명소(`*.sights.json`),
  OpenTopoData SRTM30(랩 8 m 간격 + 12 km 원 64방향 `*.elev.json`, 60 m 격자 `*.grid.json`). Overpass는 자주 바쁘다(재시도 내장, User-Agent 필요).
- `real/prep.mjs` → `real/circuits.json`(git 포함, 빌드 입력). 서킷별 설정은 파일 맨 위 `META`.
  - 중심선: 2 m로 다시 샘플 → 같은 방향 14 m 안의 OSM raceway 점으로 끌어당김(스파·몬자·스즈카 100%, 실버스톤 94%, 인테를라고스 97%; 시가지는 일반 도로라 0–22%)
    → 끌린 곳은 약하게, 아닌 곳은 강하게 다듬기 → 곡률 따라 5–26 m 제어점(간격 변화 제한, 캐트멀-롬이 튀지 않게).
  - 출발: 피트 레인(이름·`raceway=pit_lane`, 서포트/내셔널/카트 제외) 가운데와 **같은 방향으로 달리는** 가장 가까운 점(모나코는 수영장 구간이 반대로 달림).
  - 방향: x 동, z 북(게임 오른쪽 법선 = +x, 뒤집힘 없음). 원점은 중심선 bbox 가운데.
  - 높이: SRTM 중앙값(42 m)+박스 평균 → 공식 고저차(`range`)로 스케일 → 경사 19% 제한 → 출발 = 0. 터널은 입·출구 직선 보간.
  - 터널: raceway `tunnel=yes`(모나코는 18 m뿐) + 시가지 서킷이 1500 m² 넘는 건물 아래를 지나는 곳, `tunnelExt`로 입구 연장. 모나코 약 460 m.
  - 스즈카 다리: 가장 가까운 교차점, SRTM 높은 쪽이 윗길, 11.8 m가 되게 윗길 +70%/아랫길 −30% 코사인 범프. 거더는 풍경 레코드 `bridge`.
  - 바쿠 성곽 구간: 메이든 타워 750 m 안에서 480 m 동안 가장 많이 오르는 곳을 반폭 4.2 m로(`narrowClimb`).
  - 풍경 레코드: block(건물 = 단위 상자 늘림), stand(`building=grandstand`, 트랙 향함), pine/oak/palm(숲 13 m·공원 26 m 격자, 거리로 솎음, 가로수·단독 나무),
    sheet(30 m 격자: 물 다각형 안 또는 해안선 오른쪽=바다, 최대 5×5칸), yacht(모나코 항구), 명소(casino, mbs=SkyPark, wheel=big_wheel, flame×3, maiden, wing).
    이름 없는 명소는 `sightsLL` 좌표의 건물에 맞춤(모나코 카지노). 명소 주변 건물은 빼고, 명소는 3 km까지 찾는다.
  - 건물: OBB(볼록 껍질 회전), 채움 < 0.62면 긴 축으로 반 나누기(2단계). 높이 height → levels×3.2 → 종류별 기본. 5 m 묻음.
    `merge`(모나코·인테를라고스·바쿠): 높이 72% 이상 비슷한 이웃을 채움 0.74 이상·한 변 90 m 이하일 때 합침(모나코 114, 인테를라고스 373, 바쿠 126번).
    점수 √면적·√높이/(거리+22)로 `nB`개. 등급: 상위 30% = 1(LOW), `hi`(기본 55%, 모나코 36%, 인테를라고스 50%)까지 = 2(HIGH), 나머지 3(ULTRA).
  - 지면 높이 `dy`: (격자 높이 − 도로 SRTM) × `terrain` × 도로에서 14→90 m 램프(SRTM은 DSM이라 숲·건물 윗면이 섞여서 줄임).
  - 지평선: 원 64방향 → 6°(60칸) tan, 2.5 km 안 = 앞 능선 `hN`, 밖 = 뒤 능선 `hF`, 지구 곡률 0.87 보정.
- `real/plot.py slot out.png [tier]`: 위에서 본 그림(도로·터널 빨강·출발 초록·건물·물·나무·명소). 새 서킷 확인은 이걸로 먼저.
- `REALTRK=0`이면 `f1tracks.mjs`가 옛 손그림 서킷을 쓴다(비교 테스트용).

### 게임 쪽
- `build.mjs`: 모델 `block`(29), `sheet`(30) 추가(면만 두 번 적어 가까운/먼 단계 공유). 건물 색 12가지(`idx.bld` + 4×색, NMAT 240→264, colTab 4224).
  풍경 레코드: 64진 21자(`RSA`, `RSW`) → 서킷당 150개씩 문자열(`rsD`, `rsOff`, `rsCh`), 모델별 크기 단위 `gtQ`(block/sheet 0.1 m, 나머지 0.01배).
  `trkReal`, 지평선 `hlN/hlF`(9×60), 실제 서킷 `trkHillK` 1.15·`trkHillT` 0(싱가포르만 1). `gfScnSz` [45, 60, 90].
  고스트 `GHDT` 0.25 → **0.4 s**(PBN 540 × 0.4 = 216 s; AI 스파 랩 약 170 s).
- `track.js`: `placeReal`(레코드 풀기, 등급 ≤ gfx만, 검사 대상이 도로에 걸리면 링에서 바깥으로 3번까지 밀고 안 되면 버림), `scKY/scKZ/scKR`(축별 크기),
  `scFill`은 에디터 테마 4만 남김(서킷별 테마·물·성벽 산포 삭제), `sgCurvA`(링 안의 가장 급한 곡률, 스플라인 샘플에서; 평균×1.6+0.002 이하).
- `render.js`: `drawScn` 축별 배율, 크기 컬링(`rr·scnSz < 깊이`면 안 그림), **상자는 카메라 쪽 벽 2개 + 지붕(위에서 볼 때)만 quad()로**, 실제 지평선(`hlOn`).
- `ai.js`: 앞보기·조준점·가까운 코너 창을 링 수 대신 미터(`AIREF` 8.5 m 기준)로, 조준점과 레이싱 라인은 링 사이 보간, 코너 속도는 `sgCurvA`.
  (시도했다 되돌린 것: 조준점 sag 14→10, nearCv에 뒤 링 포함 — 둘 다 이탈이 늘었다.)
- `phys.js`: 차체 경사를 차 위치(caU)로 두 링 사이 보간(15 m 링에서 1° 넘게 틀렸다, t7/tilt).
- `profile.js`: 랭킹 `RT_K*`→`RT_L*`, WR 고스트 `RT_G*`→`RT_W*`(새 이름 = 빈 표). 저장 레코드 36번째 칸 `TRKV`(4); 없거나 작으면 서킷 기록 17–32칸 무시.
  `savecode.js`: nF 36 허용(옛 32/35 코드도 받되 서킷 기록은 무시).

## 측정
- 서킷(prep 출력): 모나코 3.27 km·고저 42 m·터널 약 460 m / 스파 6.96·104 / 스즈카 5.79·40(다리 11.8 m) / 실버스톤 5.86·14 / 몬자 5.77·13 /
  싱가포르 4.89·4 / 인테를라고스 4.29·43 / 바쿠 5.93·24(성곽 480 m). 풍경 레코드 546–1088개(등급별 LOW 174–314, HIGH 299–610).
- AI 이탈(240 s, 8대, `offdiag.mjs`): 1 m 넘게 벗어남 9번 → **0번**(모든 서킷). 스치기(1 m 이하)는 서킷당 0–11번(몬자 시케인 연석, 라 수르스 안쪽).
  AI 랩(아케이드, 300 s): 모나코 115 s, 스파 168, 스즈카 152, 실버스톤 153, 몬자 121, 싱가포르 144, 인테를라고스 116, 바쿠 158.
- tessvm(`t7/mkb.mjs` + `_work/tessvm/trun.mjs`, AI 차 카메라 `camCar`): HIGH 8개 모두 59–60 fps(tick 3–5 ms), ULTRA 57–60(tick 4–7.7 ms).
  `--throttle 3` HIGH: 모나코 44–58(v3.3 같은 조건 49–59), 스파 59–60; 앞선 측정에서 인테를라고스 50–57, 바쿠 52–59. LOW는 throttle 3에서도 58–60.
  원인 추적: 프로파일에서 drawScn 3.0% → 6.0%, 건물을 빼면 모나코가 v3.3보다 빨라짐 → 병합·상자 면 선별·등급 조정.
- 테스트: v30 10/10, keys 3/3, multi 7/7, savecode 31/31, alloc, pinned, tilt(새·옛 서킷 모두) PASS. prof의 "tuned top speed"와 slots의 "REWRITTEN EVERY FRAME"은 v3.3에서도 같음.

## 남은 일 / 주의
- project.json 12.5 MB: 온라인 저장이 20초 제한(클라이언트 타임아웃)에 걸릴 수 있다. 콘솔에서 `setTimeout` 20000→120000 패치로 저장(메모리 참고). 근본 해결은 함수 블록(11 MB) 줄이기.
- 링 460개 고정이라 긴 서킷은 링 간격 12–15 m. 더 촘촘히 하려면 정점 버퍼(5000칸)를 나눠야 한다.
- 시가지 서킷(싱가포르·바쿠·모나코 일부)은 OSM에 경주로 선이 없어 손으로 딴 중심선 그대로(다듬기만).
- 몬자 옛 뱅킹은 없다(OSM 경주로로 넣을 수 있음). 피트 레인은 게임 규칙상 항상 왼쪽.
- 새 전역 리스트를 0으로 만들면 allocLists 대상(ALLOCMIN). `sgCurvA`, `scKY/KZ/KR`가 그렇다.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v3.3)

산출물: `3D 레이싱 v3.3.ent` ← 최신, 설명서 `3D 레이싱 v3.3 설명서.md` (v3.2는 루트 `old/`로)
빌드: `node build.mjs racing33.ent` → `globals 417, lists 481, functions 304, handlers 3`, **.ent 717 KB, project.json 12.39 MB**

## 요청과 한 것
"3.1부터 파일 내용물중 어떤게 한도를 초과해서 그런지 온라인에 저장이 안되. 기능은 유지하면서 한도 초과한 부분 용량을 줄일수있을까?"
- 측정(`node t7/entsize.mjs a.ent b.ent`)
  - project.json: v3.0 16,148,378 B(저장됨), v3.1 16,194,322 B(저장 안 됨), v3.2 16,257,202 B.
  - 16 MiB(MongoDB 문서 한도로 보인다) 근처다. 엔트리 온라인이 다시 직렬화하는 형식이라, 우리 파일로 약 16.17 MB가 문턱으로 추정된다.
  - 구성: 함수(블록 4.7만 개) 10.8 MB, 리스트 5.1 MB. 리스트 중 **3.98 MB가 전부 0인 리스트**다(리플레이 rp*, 정점 pv*/ps*/wv*, 링 sg*, 마크 mk*, 고스트 pb* 등).
- 수정
  - `build.mjs` buildData 끝: 길이 ≥ 64(ALLOCMIN)이고 전부 0인 리스트(tx* 제외: 글상자 시작 스크립트가 읽음)를 빈 배열로 내보낸다. 105개, 144,323칸.
  - `declPrelude`가 `allocLists()`를 생성한다. 길이별 루프 15개이고, 현재 길이부터 목표 길이까지만 push한다.
  - pen3 시작 스크립트의 **첫 줄**에서 `allocLists()`를 부른다.
  - 결과: project.json 16.26 → 12.39 MB, .ent 1.10 → 0.72 MB. tessvm 컴파일 0.9 → 0.6초, 채우기는 시작 0.47초 안에 끝난다(순정 엔트리는 더 걸릴 수 있다).
- 테스트 중 찾은 버그 두 개도 고쳤다.
  - **AI 리프트 앤 코스트(v3.0)**: 목표 속도 −9 m/s 안이면 스로틀을 뗐다. 느린 구간에서는 늘 그 안이라 연료가 조금 모자란 AI가 5 m/s로 기어갔다(멈춘 AI 신고의 다른 원인으로 보인다). 이제 28 m/s 넘을 때만 한다.
  - **벽에 끼인 차 복구(v3.1)**: 4.5 m/s 미만이면 세고, 8 m/s가 넘으면 초기화한다. 전에는 2.5 / 6 m/s였다.
- 시험
  - `node t7/alloc.mjs`: 105개가 시작 뒤 원래 길이이고 전부 0이다. 두 번 불러도 늘지 않는다. PASS.
  - `t7/pinned.mjs`: 12번 모두 PASS(0.9–7초).
  - v30 10개, keys 3개, multi 7개, savecode(시작처럼 allocLists 호출 추가), prof, slots, tilt, wall, stuck(3개 조건)이 모두 정상이다.
  - tessvm(`_work/tessvm/alloc33.json`): 오류 0, 메뉴와 레이스 54–59 fps.
- **주의**: 새 전역 리스트를 0으로 채워 만들면 자동으로 실행 시 채우기 대상이 된다. 시작 스크립트보다 먼저 읽는 곳(글상자 등)이 있으면 ALLOCMIN이나 제외 목록을 조정한다.
  sim 테스트에서 프레임 없이 함수를 바로 부를 때는 먼저 `s.frame()`이나 `allocLists()`를 호출한다.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v3.2)

산출물: `3D 레이싱 v3.2.ent` ← 최신, 설명서 `3D 레이싱 v3.2 설명서.md` (v3.1은 루트 `old/`로)
빌드: `node build.mjs racing32.ent` → `globals 417, lists 481, functions 303, handlers 3`

## 요청과 한 것
"저장된 데이터 불러오기를 하면 불러와지는데 조작이 안되고, 새로고침안하고 정지후 다시 실행하면 갑자기 아케이드 레이싱이 시작되는 오류가 있어 고쳐줘"
- 원인(재현: `node t7/keys.mjs`, v3.1 코드에서 A·B FAIL): 메뉴 키는 `pollAction`이 **이전 프레임과 다른 키**를 새 입력으로 받는다.
  - 엔트리는 `Entry.pressedKeys`를 정지해도 비우지 않는다(entryjs utils.js: keydown push / keyup splice만 한다).
    눌린 채로 남은 키가 있으면 새 실행 첫 프레임에 '새로 눌림'으로 잡힌다. 엔터면 메인 메뉴 1행(RACE, 기본 아케이드)이 바로 시작된다.
  - 코드 입력(ask)을 엔터로 제출하면 그 엔터가 게임에도 들어가서, 불러오자마자 PROFILE이 메뉴로 튕긴다(tessvm에서 확인).
  - 맥에서 Cmd+V로 붙여넣으면 브라우저가 V의 keyup을 보내지 않는다(알려진 동작). V(86)가 눌린 채 남으면,
    다른 키를 뗄 때마다 k가 86으로 돌아와 V가 다시 입력되고, PROFILE에서는 불러오기 창이 계속 다시 뜬다(= 조작 불가).
    순정 엔트리에서 직접 재현하지는 못했다. 증상과 브라우저 동작으로 추정한 원인이다.
- 수정(`main.js`)
  - `pollAction`을 키마다 풀어 썼다. `key()`는 상수 키코드만 받기 때문이다.
  - `pkSt[1..NPK]`: 한 번 떼는 것을 볼 때까지 그 키를 무시한다. `keysStale()`이 전부 1로 만들고, keyPrev·edKey2도 초기화한다.
    호출하는 곳은 시작(pen3 start, initGame 뒤), 백업 코드 ask 뒤(savecode.js svLoad), 트랙 코드 ask 뒤(share.js shImport)다.
    에디터 K/I도 같은 방식이다(슬롯 20·21).
  - 정말로 계속 눌린 채인 키는 무시되고 다른 키는 동작한다. 그 키를 다시 눌렀다 떼면 되살아난다.
- 시험
  - `node t7/keys.mjs`: A(엔터를 누른 채 시작해도 메뉴 유지), B(불러온 뒤 V가 남고 엔터가 눌려 있어도 PROFILE 유지, 창이 다시 안 뜸, ESC·아래 키 동작), C(다시 누르면 동작). 모두 PASS.
  - tessvm(`_work/tessvm/sv3.json`, `node ../racing/t7/mkcode.mjs 테스터`로 만든 유효 코드): 불러온 뒤 PROFILE에 머물고 ESC·위아래가 동작한다.
  - 기존 테스트(slots, savecode, prof, multi 7, v30 10)는 모두 통과한다.
- 주의: 운전 키(W/S/A/D 등)는 `key()`를 직접 읽어서 이 보호를 받지 않는다(ask와는 관계없다).

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v3.1)

산출물: `3D 레이싱 v3.1.ent` ← 최신, 설명서 `3D 레이싱 v3.1 설명서.md` (v3.0은 루트 `old/`로)
빌드: `node build.mjs racing31.ent` → `globals 417, lists 480, functions 302, handlers 3`

## 요청과 한 것
"일부 AI가 벽에 박고 아무것도 안하는 현상을 발견했어 수정해줘"
- 재현(`node t7/stuck.mjs 2 1 400`, 모나코 리얼리스틱): 앞날개를 잃은 AI가 연석 위에서 벽에 비스듬히 끼어 300초 동안 서 있었다.
  고립 탈출(caStuck: 1.6초 뒤 1.8초 후진)은 벽에 긁혀 −0.5~−0.9 m/s밖에 안 나오고, 다시 전진하면 벽으로 들어갔다.
  checkRecovery는 잔디·자갈(surf ≥ 2)에만 작동해서 연석(surf 1)이나 도로 위에서는 발동하지 않았다.
- 수정(`ai.js`): 레이스 중 AI가 속도 2.5 m/s 아래로 **6초** 넘게 있으면(`caStkT`, 6 m/s가 넘으면 0으로 초기화) `aiRescue`로 되돌린다.
  같은 링에서 도로 가운데 쪽(오프셋 ×0.3, 벽에서 2.5 m 안쪽)으로 옮기고, 트랙 방향으로 6 m/s로 출발시킨다.
  피트 정차·홀드·리타이어·완주·포메이션·출발 대기는 제외한다. 피트 출구(caPit 4)에서는 15초가 지나야 발동하고 피트 상태를 끝낸다.
- 시험
  - `node t7/pinned.mjs`: 모나코 벽에 60°로 박아 둔 차가 4.5초 만에 다시 54 km/h를 넘는다.
  - `node t7/stuck.mjs rules trk secs wx lapSel`: 6초 넘게 멈춘 AI의 상태를 출력한다. 피트 정차와 DNF는 빼고, 다시 움직인 시각도 찍는다.
    8개 조건(리얼리스틱·아케이드, 비·마름)에서 더는 나오지 않는다.
  - `t7/v30.mjs`는 10개 전부 PASS, 아케이드 경기도 정상이다.
- 주의: zsh에서 `for a in "2 1 400"`로 인자를 넘기려면 `${=a}`를 써야 한다(단어로 나누지 않는다).

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v3.0)

산출물: `3D 레이싱 v3.0.ent` ← 최신, 설명서 `3D 레이싱 v3.0 설명서.md` (v2.6은 루트 `old/`로)
빌드: `node build.mjs racing30.ent` → `globals 417, lists 479, functions 301, handlers 3`
**버전 규칙(사용자)**: x.y. 조금 바뀌면 y를 올리고, 크게 바뀌면 x를 올리고 y=0으로 한다. 이슈 #1 반영은 큰 업데이트라 3.0이다.

## 요청과 한 것
"https://github.com/spyoham/entry_3d/issues/1 이 이슈에 있는 기능을 없는것은 모두 구현해줘.(리얼리스틱에서만 다 구현하고,
가벼운것 위주인 아케이드에는 괜찮아보이는것 일부만 넣어줘)" — 이슈 26개 항목. 표는 루트 설명서에 있다.
- 새 파일 `src/race3.js`(rules.js 다음): 노면(`trkReset/trkStep/carWet`: 고무, 온도, NZ=16 구역 물, 드라이 라인),
  `carTick3`(브레이크 온도·페이드, 연료·무게·모드, 고장. simCarStep의 0.1초 틱에서 호출), `fuelLap/fuelUp`, `retireCar`, VSC(`deployVSC/vscStep`),
  `blueStep`(updateGaps 0.3초, 두 규칙 모두), `cockpitKey`(F=70, 1=49, 2=50), 포메이션 랩(`ST_FORM=14`, formBegin/Step/Park/Skip/End/AI),
  예선 세션(`qBegin/qCut/qLapDone/qGrid`, `caQ1..3`, `qIn`, `caQOut`).
- `phys.js`: 출력/최고속 감소(`caPowD/caTopD`: 모드·고장·연료 없음), 무게(`caMassD`, MASSK 0.10), 락업(R_SIM: 축별 요구 > 그립×2.4 → `caLock/caLockR`,
  AI는 실수 아닐 때 0.97배로 조절), 브레이크 페이드(`caBrD`), `trkGripK`, 윙 배분(`caFWb`×공력 비율), 디퍼렌셜(`caDiff`), 공기압(`caPres`), 앞바퀴 락업 연기.
  **새 per-car 리스트는 모두 0이 중립이다**(GHOST/세이프티카 슬롯은 따로 설정할 필요가 없다).
- `rules.js`: tyreGrip이 `caWet`와 플랫스팟(`whFS`)을 쓴다. simCarStep은 amb=`trkTemp`, 락업→플랫스팟, 공기압·디퍼렌셜 발열/마모.
  wxStep은 아케이드에서만 wetL을 직접 바꾼다(리얼리스틱은 구역 평균). aiStrategy에 언더컷/커버/오버컷/VSC(`caStrat`, `caUcL`).
  addDamage의 큰 사고 → 35% VSC. deploySC가 VSC를 끈다. endQuali는 qGrid 정렬. flagsStep은 VSC 중 추월에 페널티를 준다.
- `ai.js`: gk/bdec에 트랙 그립·무게·페이드, 압박 실수 1.8배, `caMisK` 2 = 바깥으로 밀림. VSC 속도(rlV×VSCK), 포메이션(formAI, 칸 앞 260 m부터 가운데, 40 m부터 자기 칸 쪽),
  블루 플래그 양보, DNF는 굴러서 갓길로, 리프트 앤 코스트(`caLC`). 추월 루프는 주차된 차와 DNF 차를 건너뛴다.
- `game.js`: 팀 성격(`tm*`, 두 규칙 모두 top/aero/wear), placeCar에서 v3 상태 초기화와 `fuelUp`, initCars가 `caGSeg/caGOff/caGrid/gOrd` 기록,
  startGrid가 리얼리스틱 GP/CH면 `formBegin`, updateLap에 fuelLap과 예선(`qLapOk`, 아웃랩 뒤 매 랩 `qLapDone`), updateRanks에서 DNF −60000, checkRecovery는 DNF를 건너뛴다.
- 차고: `suF`(프론트윙), `suW`=리어윙, `suD`, `suP`. 11줄(`TUROWS`), 글자 슬롯 라벨 24–34 / 값 44–54 / 55–57. 기록 33–35칸(옛 기록이면 suF=suW).
  백업 코드는 nF 32나 35를 받는다.
- HUD: 오른쪽 패널을 12 px 간격으로 다시 배치했다(슬롯 24–29, 32 연료, 33 브레이크). 34는 블루 플래그/VSC 델타, 38은 점검 창의 BALANCE.
  예선 Q 라벨, 포메이션 라벨, 타워 OUT, 결과 DNF/RETIRED, 일시정지 화면에 키 안내(28).
- 보정값: `FUELK 0.72`(스로틀 거리 비율), `BRH 9`, `BRC 0.08`, 연료 = 100·n/max(n,4)·1.03+1.5 kg, `FAILK 0.045`.
- 시험
  - `node t7/v30.mjs`: 10개 전부 PASS. 예선 A, VSC B, 블루 C, 리타이어 D, 락업 E, 구역 비 F, 키·세팅 G, 트랙 H, AI 전략 I, 플레이어 리타이어 J.
  - `node t7/fuel.mjs trk lapSel secs`: 연료, 리프트 앤 코스트, 브레이크를 잰다.
  - `node t7/form.mjs trk`: 포메이션 랩.
  - 슬롯 테스트는 포메이션과 카운트를 나눠서 본다. ppit는 포메이션을 건너뛴다.
  - 기존 테스트는 모두 통과한다. 타이어 평균 온도는 이제 노면 온도에 따라 서킷마다 다르다(스파 약 86°C, 인테를라고스 약 110°C).
  - tessvm(`_work/tessvm/wh30.json`): 오류 0, 56–60 fps.
- 남은 일/주의
  - 락업은 키보드 브레이크가 켜고 끄기뿐이라 젖은 노면에서 잘 생긴다(의도). AI는 실수할 때만 잠근다.
  - 옐로 플래그와 브레이크 바이어스 세팅은 이미 있던 기능이다.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v2.6)

산출물: `3D 레이싱 v2.6.ent` ← 최신, 설명서 `3D 레이싱 v2.6 설명서.md` (v12는 루트 `old/`로)
빌드: `node build.mjs racing26.ent` → `globals 387, lists 425, functions 276, handlers 3`
버전 이름: 사용자가 "버전 2.6으로 저장"을 요청해서 v12 다음을 **v2.6**으로 했다(메뉴 표시 `F1 EDITION / v2.6`).

## 요청과 한 것
"경사에서 차가 기울어지는 것을 구현하고(좌우,전후로 모두), 리얼리스틱에서 각 바퀴 상태 점검을 만들어줘
(레이싱카 운용에 따라 바퀴 온도,마모등의 상태가 달라지게) 그리고 이는 버전 2.6으로 저장해줘"
- **차체 기울기** (`phys.js` body attitude): 구간 경사 `(sgY[s+1]−sgY[s−1])/(2·segStep)`와 뱅크 `tand(bank)`(도로 위일 때만, caU로 보간)를
  차의 앞(fx,fz)·오른쪽(fz,−fx) 방향 성분으로 나눠 `grPitch = −atan(경사·fD − tb·fN)`, `grRoll = atan(경사·rD − tb·rN)`.
  부호: caPitch +는 코 숙임, caRoll +는 오른쪽이 올라감(`render.js` drawCar). 동적 항의 부호가 거꾸로였다
  (코너 안쪽으로 기울고, 가속에 코가 숙여졌다). 이제 `roll = aLat·0.16`, `pitch = −acc·0.10`(±9/±7 제한), 그 위에 지면 각도를 더한다.
  공중에서는 비행 경로 각도 0.7배, 롤 유지. 필터 `6·dt`. 콕핏/T캠 `camPitch = −2.5/−4 − caPitch·0.9`, 콕핏 `camRoll = caRoll·0.8`
  (카메라 피치는 +가 위를 봄 — 차와 반대).
- **바퀴별 타이어** (`rules.js`): `whT/whW/whG[(c−1)·4+k]`(k 1 FL, 2 FR, 3 RL, 4 RR), 컴파운드별 `tyTlo/tyThi/tyTbl`.
  `simCarStep`에서 차마다 0.1초 시계 `caWhT`(placeCar에서 엇갈림)로 갱신. 일 = 가로 하중(u=aLat/(mu+0.5), aLat>0 우코너 → 왼쪽이 바깥),
  브레이크(앞 1.4/뒤 0.6, 브레이크 바이어스 반영), 저속 트랙션(뒤), 슬립(phys가 넘기는 `phSlF/phSlR`, 드리프트), 잠김, 연석.
  온도 `+1.15·(0.30·spf + 1.25·√일)·tread − 0.012·(1+v/150)·(1+1.5·wetL)·(T−amb)`(잔디 냉각 ×1.6, amb = 34 − 18·wetL).
  √로 서킷 간 차이를 줄였다(선형일 때 몬자 80°C, 인테를라고스 앞 140°C).
  마모 use = 예전 차 전체 식을 바퀴별로 나눈 것 × (T>hi면 `1+(T−hi)/12`, T<lo−8이면 `1+(lo−8−T)/40`). 마모는 ST_RACE에서만.
  `tyreGrip`: 바퀴 그립 = 마모(예전 곡선) × 저온(`0.006/°C`, 최대 −15%) × 고온(`0.006/°C`, 최대 −15%).
  `caWK` = 컴파운드·날씨 × 평균, `caAxF/caAxR` = 축 평균/전체 평균 − 1(**0이 중립** — 세이프티카·아케이드는 0),
  phys에서 `gripF·(1+caAxF)`, `gripR·(1+caAxR)`. `caWear` = **가장 닳은 바퀴**(AI 피트 판단 30%, HUD 막대).
  `oTyG` = 온도·마모 없는 컴파운드 값(startGrid 레이싱 라인 속도 프로파일용). 세이프티카(caTy 0)는 건너뜀.
- **점검** (`whCheck`, simStep마다): `whSt` 1 OK, 2 WARMING, 3 COLD, 4 HOT, 5 OVERHEAT, 6 WORN. 우선순위는 `whRank`.
  조언 `whAdv/whAdvC`. 과열·다 닳음은 처음 한 번 무전(`whRadT` 12초).
  HUD: 왼쪽 아래 작은 차 그림(menu.js drawSimHud 펜, 슬롯 40–43 온도/%, 39 안내), **I**(73, pollAction·raceKeys)로
  점검 창 `whShow`(펜 패널 + 슬롯 44–49).
- 시험
  - `node t7/tilt.mjs`: 8개 서킷의 가장 가파른 곳과 가장 기운 뱅크, 0/90/45/30°. 앞뒤·좌우 1 m 노면 샘플과 비교해 전부 1° 안.
  - `node t7/whcal.mjs [secs]` (`WX=2`는 비, `WH="..."`로 값 덮어쓰기): 서킷별 바퀴 평균 온도. 미디엄 87–103°C, 웻 43–48°C.
  - `node t7/wheels.mjs trk secs`: 한 경기 동안 바퀴 로그.
  - `node t7/sign.mjs`: 조향·롤·피치 부호.
  - 기존 테스트 race·sim2·ppit·dmg·tl·wall·multi·prof·drivetest2는 이전과 같다. 최고 랩은 v12와 1% 안.
  - tessvm(`_work/tessvm/wh26.json`, 예선에서 W, I): 오류 0, 57.6 fps, 화면 확인.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v12)

산출물: `3D 레이싱 v12.ent` ← 최신, 설명서 `3D 레이싱 v12 설명서.md` (v11은 루트 `old/`로)
빌드: `node build.mjs racing12.ent` → `globals 379, lists 410, functions 275, handlers 3`

## 요청과 한 것
"주행로 벽에 레이싱카가 부딪쳤을 때 아주 살짝만 닿아도 속도가 빨리 줄어드는 걸 완화해줘"
- 원인: `phys.js` 방호벽 처리가 접촉한 **물리 스텝마다** `×0.84`(세면 ×0.66), 게다가 벽 쪽 속도를 ×1.35로 반사.
  60fps(tessvm)에서 0.5° 스침이 1초 뒤 216 → 6 km/h. 프레임 수에 따라 달랐다(10fps 36 km/h).
- 바꾼 것: 벽 쪽으로 들어가는 성분(`into`)만 반사(반발 0.25), 접선 속도는 `0.35·into·1.25`만큼 마찰로 감소,
  `into > 5`면 추가로 `×(1 − min(0.3, (into−5)·0.02))`와 요 감쇠, 접촉 중 `×(1 − 0.25·dt)`. 데미지·불꽃·흔들림 조건은 그대로.
- 시험: `node t7/wall.mjs [fps]`(모나코 벽 옆 216 km/h, 각도 0.5–30°), `FPS=20 node drivetest2.mjs trk ai|flat 150`(1·6·8번).
  무제동 벽 타기는 여전히 정상 주행보다 훨씬 느리다. 정상 주행 최고 랩은 2–4초 빨라졌다.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v11)

산출물: `3D 레이싱 v11.ent` ← 최신, 설명서 `3D 레이싱 v11 설명서.md` (v10은 루트 `old/`로)
빌드: `node build.mjs racing11.ent` → `globals 379, lists 410, functions 275, handlers 3`

## 요청과 한 것
"저장기능은 그대로 두고, 저장이 안됐을 때를 대비해서 암호화된 계정 정보를 복사하고 불러올 수 있게(유효한 문자열은 얼마 없게),
테이블 기능에서 문자열을 복사할 수 있어"
- `src/savecode.js` 백업 코드: `S`+버전+소금2+본문(기록 32칸을 SVSYM 13기호로, 닉네임·소금 키 스트림으로 밀기)+검사 8자(키 해시 2개 × 20비트).
  글자는 share.js의 SHA/shDigit 재사용. 불러오기는 `mergeRec(0)`(큰 값 우선), `pLoaded` 전에는 막음(서버 기록과 이중 합산 방지).
- 복사: 순정 엔트리 = 표 `svtb` 2행 1열 + `open_table`. tessvm = `$CLIPBOARD`(tessvm이 허락을 받고 복사; tessvm 표는 캔버스라 선택 불가).
- ejs `tableSet/tableShow`, `pack.mjs` tables, `consts.HANGUL`(한글 음절 11172자, 닉네임 글자 구별 — 엔트리에 글자 코드 블록 없음), `lists.svV`.
- PROFILE: C 복사, V 불러오기, 슬롯 38 안내(모든 사람), 39 도움말. 테스터 메시지도 슬롯 38.
- 시험: `node t7/savecode.mjs 20000` 전부 PASS. tessvm 하네스(`_work/tessvm/sv.json`, `sv2.json`, 14 s 기다린 뒤 PROFILE)로 C/V 실제 동작,
  tessvm이 만든 코드를 sim이 읽음(계산 일치). 순정 엔트리 표 창에서의 복사는 미확인.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v10)

산출물: `3D 레이싱 v10.ent` ← 최신, 설명서 `3D 레이싱 v10 설명서.md` (v9는 루트 `old/`로)
빌드: `node build.mjs racing10.ent` → `globals 371, lists 409, functions 265, handlers 3`

## 요청과 한 것
"그냥 항상 저장을 시도하도록 바꿔줘" (tessvm 제작자가 몇 달 안에 고친다고 답함, 그동안은 보조 확장 `_work/tessvm-cloudfix`)
- `profile.js`: `writeOK()`/`oWOK` 삭제 → `saveProfile`, `rankStep`의 `rankSubmit`이 `$TESSVM`과 상관없이 쓴다.
- `menu.js`: "(NOT SAVED)", "SAVE IS READ-ONLY" 안내 삭제, 버전 표시 v10.
- 아래 v8 절의 "tessvm에서 저장 안 됨 — 게임 대응"은 이제 지난 이야기다. tessvm만(보정 확장 없이) 쓰면 저장 확인이 실패해 재시도가 이어진다.
- 시험: `t7/multi.mjs` A–G PASS (JIT=300 포함). 실제 서버 + tessvm + 보정 확장은 미확인.
### 실제 서버 확인 (2026-09-25) — 새로고침하면 날아가는 진짜 원인
- 작품 `6aaf887a12df6ed51464f910`(v10)과 편집기에서 직접 만든 테스트 작품 `6ab545a367a7268f142237bf` **둘 다**
  GraphQL `SELECT_PROJECT`의 `hasRealTimeVariable: null`, `realTimeVariable: null`, `/cv` 소켓 welcome의 `variables: []`.
  작품 JSON의 변수에는 `isRealTime: true`가 정상으로 있다(레이싱 33개, 테스트 1개).
- 사이트 `setCloudServer`는 `hasRealTimeVariable`일 때만 `Entry.cloudVariable.connect()` → **순정 엔트리도 접속하지 않는다**.
  tessvm을 끄고 테스트 작품에서 3번 클릭(값 3) → 새로고침 → 0. tessvm은 서버 `_id`가 없어 `sendAction`을 보내지도 않는다.
- entryjs에는 서버에 실시간 변수를 등록하는 호출이 없다(`cloudVariable.create` 호출자 없음) → 등록은 서버 쪽 조건. 엔트리에 문의 필요.

---

# ENTRY RACING 3D — 작업 인계 메모 (2026-09-25, v9)

산출물: `3D 레이싱 v9.ent` ← 최신, 설명서 `3D 레이싱 v9 설명서.md` (v8 파일은 루트 `old/`로 옮김 — 사용자 규칙: 루트에는 작품별 최신판만)
빌드: `node build.mjs racing9.ent` → `globals 372, lists 409, functions 266, handlers 3` (Windows에서는 ffmpeg로 MP3 인코딩)

## 요청과 한 것
1. "메인화면 선택이 너무 많다, 카테고리로 묶어라" → 메뉴 페이지(main.js `mnPage/mnRow/mnItem/mnBuild/mnOpen/mnBack`).
   페이지 0: 1 START, 20 RACE SETUP, 21 CAR & GARAGE, 12 PROFILE, 22 SETTINGS, 13 EDITOR.
   1: 2 3 6 7 8 9 1 23 / 2: 4 5 23 / 3: 10 11 23 (23 = BACK, ESC도 뒤로). 행에는 **v8 항목 번호**가 들어가서
   `menuSel`은 여전히 v8 항목 → menuChange/hudCard/카드 그림은 그대로. 카테고리 행의 카드는 `cardOf()`로 대표 항목 카드.
   `rowY = 70 − 17·(i−1)`, 빈 행 텍스트는 hudMenu가 지움, hud `sub = menuSel + 100·mnPage`. 위치 표시 슬롯 23.
2. "실시간 변수 동시 쓰기로 먼저 보낸 요청이 덮어써지는 것 고려했나" → v8 이후 수정에서 이미 읽기-합치기-쓰기 + 2 s 확인 + 무작위 백오프 재시도.
   v9에서 구멍 2개를 더 막음:
   - `verifySave`: XP 비교 → **저장한 줄(`pSavedRec`) 전체가 그대로 있는지**(또는 XP가 더 큰 내 줄). XP 없는 차고 변경의 무음 롤백 방지.
   - 세계 기록 고스트: 동시에 두 명이 1위를 세우면 RT_G에 2위의 고스트가 남을 수 있었음. `rankStep` 확인에서 1위가 RT_G 머리
     (`닉,ms,`)를 보고 아니면 `wrUpload` 재시도(최대 8회), `loadWrGhost`는 RT_K 1위와 머리가 맞을 때만 사용.
   - `t7/multi.mjs`에 F(차고 변경), G(동시 1위 고스트) 추가, `JIT=ms` 환경변수로 메시지별 무작위 지연. JIT=300에서 v8 G 10/20 실패 → v9 0/20.
   - `t7/slots.mjs`는 메뉴 페이지×행을 모두 돈다(56화면, 움직이는 값 3개 외 충돌 없음).

---

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

## "새로고침하면 초기화" — 원인 (v8 이후)
사용자: "멈췄다 다시 실행하면 저장되는데 새로고침하면 초기화됨."
- playentry 사이트 번들(`_next/static/chunks/2629-*.js`)의 `setCloudServer(project, info)`:
  `project.hasRealTimeVariable`이면 `Entry.cloudVariable.setDefaultData(project.realTimeVariable)` → `connect()` →
  **`this.isWorkspace() && 작품 주인 == 로그인 사용자`이면 `Entry.cloudVariable.disable()`**(서버에 changeMode offline → 소켓 닫힘).
  꺼진 뒤의 쓰기는 로컬 dmet에만 반영된다.
- entryjs `variable.syncModel_`은 정지 때 공유·실시간 변수를 스냅숏으로 되돌리지 않는다 → 멈췄다 다시 실행하면 남는다.
  새로고침하면 서버 값으로 돌아간다. **편집 화면에서 시험한 것이 원인일 가능성이 크다.** 작품 페이지(`/project/id`)에서 시험해야 한다.
- 참고: 공유 변수(isCloud)는 소켓이 아니라 사이트가 **정지 때** 전체 값을 API로 저장한다(`variables.filter(isCloud)`) → 동시 접속에 약하다. 그래서 실시간 변수가 맞다.
- 테스트 버튼: 닉네임 `코딩재미있어`(menu.js `TESTNICK`)이면 PROFILE 1탭에 TEST +1000 XP(클릭 또는 X).
  tessvm 하네스는 `trun.mjs --nick 이름`으로 로그인 사용자를 흉내 낸다.
- 저장 확인(`verifySave`)은 현재 XP가 아니라 **저장한 XP**(`pSavedXP`)와 비교한다(저장 직후 XP가 늘면 충돌로 오인하던 문제).

## tessvm에서 저장 안 됨 — 원인 (v8 이후)
사용자: "tessvm 확장을 켜면 저장이 안 되지만 끄면 되는 것 같다(실시간 변수만 있는 작품에서 테스트)."
- tessvm 0.3.9 `page/cloud.js`: 변수 set을 `{type:'set', data}`로 보낸다. 엔트리(dmet.js)는 `{type:'set', value}`이고 서버도 `value`를 읽는다.
  받을 때도 `action.data`를 읽는다. 연결 전 쓰기는 버린다. 가짜 소켓으로 확인했고, 수정 diff는 `_work/tessvm/cloud-fix.diff`, 설명은 `_work/tessvm/tessvm-실시간변수-버그.md`.
- 게임 대응: `profile.js writeOK()` — `$TESSVM == 1`이면 저장 칸, 랭킹, 고스트, RT_SYNC를 쓰지 않는다(읽기는 한다).
  메뉴에 "(NOT SAVED)", PROFILE에 안내. 확장이 고쳐지면 이 조건만 지운다.

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
