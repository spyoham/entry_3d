# 엔트리 다양체 이징 — 작업 인계 메모 (2026-11-09, v1.0)

산출물(루트): `엔트리 다양체 이징 v1.0.ent`, `엔트리 다양체 이징 v1.0 설명서.md`, `엔트리 다양체 이징 썸네일.png`
빌드: `node build.mjs "../../엔트리 다양체 이징 v1.0.ent"` (`START=k`로 처음 예시, 1~12)

## 요청
- 2026-11-09 "n차원 manifold 위에서 ease함수를 정의하고 그걸 가변성 폰트나 3차원 물체에 적용하는 .ent파일 작성(예시와 직접 조작 가능한 것 모두 만들기"
  → 한 작품에 예시 10개(자동 재생, 그대로 조작 가능) + 실험실 2개(폰트, 3D).

## 파일
- `src/math.js` exp(2^k 표 `POW2[k+65]`), atan2r, tanh/artanh, 슬롯 벡터 `V[s*10+i]`, 다양체 `mLog/mExp/mGeo/mBez`(mt 1 ℝ, 2 S, 3 H 푸앵카레, 4 T, 5 SO(3) 쿼터니언, 6 ℝ₊), 쿼터니언 도우미(`qMul qAxis qFromTo qMat qEuler qToEuler`)
- `src/ease.js` 이징 15가지 `ease(k, t)`, 사용자 cubic-bezier `BZ`(뉴턴 6번, 매크로)
- `src/font.js` 획 글꼴: `styleFrom`(AXV → 굵기·너비·기울기·각짐·대비·펜촉·색), `drawWord`, `drawStroke`(선분마다 채운 사각형, 마이터, 각진 끝, 0.35 px 겹침), `drawText`(펜으로 얇게: 축 이름·숫자)
- `src/rigf.js` 폰트: 키 `KEY[(k-1)*7+i]`, 켠 축 `ACT`, 지도 `axToM/mToAx`(S: 입체 사영, H: 가운데의 정규 좌표 `tanh(HD|y|/2)`, T: πy), `evalFont(mt, t)` → `KT`, 슬롯 2에 M의 점
- `src/rig3.js` 3D: 키 자리 슬롯 30 31, 방향 32 33, 크기·색 `K3`. `evalObj`(평행 이동 포함) → 40 41, `evalNaive`(위경도·오일러각) → 42 43. 카메라, 모형(비행기 4면, 상자 6면), `turnKey`, `rayHit`/`moveKey`(지구에서는 앞 포인터 점 → 지금 점의 회전을 자리와 방향에 함께)
- `src/view.js` 그리기: `bgFont/bgObj`(오브젝트 `bg`, `bgGen`이 바뀔 때만), `drawFg`(오브젝트 `pen`, `fgGen`), 이징 그래프, 다양체 그림(`M_view`, `mPic`, 앞뒤 두 번 그리는 `wire`), 지구, 회전 공
- `src/main.js` 예시 12개 `preset(p)`, 단추·키, 포인터(`uiPress` → `dragK`, `dragStep`), 재생(A→B, 쉼 `HOLD`, `rev`로 B→A), 위 글줄
- `glyphs.mjs` 글꼴 정의(선분·타원호, 15°마다, 둥근 점과 사각형 점) → 빌드가 `GX0..CHW` 리스트를 소스 앞에 붙임
- `ejs.mjs inline.mjs pack.mjs legacy.mjs paged.mjs erun.mjs sim.mjs`: `phys`에서 복사. 바꾼 점 아래
- 시험: `test/shot.mjs 예시 프레임 out.png t=0.5`(Node 그림), `test/ui.mjs`(단추·슬라이더·끌기·입력 전부, ALL PASS), `test/glyphs.mjs`(글꼴 4스타일), `test/probe.mjs 예시`(t별 축 값), `test/tess.mjs 예시`(tessvm vm, TEST=1의 OUT), `test/tess/*.json`(trun 스크립트)

## ejs·sim에서 바꾼 것 (phys판 대비)
- **아주 작은 숫자 상수를 지수 표기 없이**(`numStr`): `l + 0.0000001`이 `"1e-7"`로 컴파일되어 tessvm에서 글자 이어 붙이기 → 면 밝기가 수억 → 흰색. 순정(옛 `calc_plus`)에서는 멀쩡했다.
- sim: `asind/acosd`(범위 밖이면 오류, 엔트리처럼), `rgb`(change_rgb_to_hex), 오브젝트 `bg`.

## 알아낸 것
- 빌드 상수와 리스트 이름이 같으면(처음에 그래프 자리 `GX0`과 글꼴 `GX0`) 엔트리 빌드는 조용히 상수로 바꾸고 sim만 터진다 → 레이아웃 상수는 `EGX0` 등.
- 함수 지역 변수는 `''`를 못 담는다(0이 됨): 빈 글자 검사 대신 개수를 센다(`manifoldText`).
- 펜 선 층이 채우기 층 위라서(둘 다 시작할 때 채우기 → 선 순서로 만듦) 슬라이더 손잡이·표시점을 채우기로 그리면 선에 가려 `=` 모양이 된다 → 표시점은 펜으로(굵은 짧은 선, 원은 정사각형 + 45° 돌린 정사각형).
- 색은 `rgb()`(change_rgb_to_hex)로. 두 자리 16진 글자 표(`'00'`…)는 쓰지 않았다(tessvm이 숫자로 읽을 수 있어 보여서 바꿈 — 원인은 위의 1e-7이었고 표가 실제로 문제였는지는 확인 안 함).
- 쌍곡 지도: 처음의 선형 지도(`y·0.92/√n`)는 가운데로 휘는 정도가 작았다(굵기 0.97 → 0.63). 정규 좌표 지도(HD 2.6)로 0.97 → 0.34.
- erun의 `down` 바로 뒤 `up`은 클릭을 놓친다(한 틱 안). 150 ms 기다리면 잡힌다.

## 속도
- 순정(헤드리스 편집기, CreateJS): 3D 프레임 17~20 ms, 폰트 28~51 ms(비교·긴 단어일수록).
- tessvm: 틱 0.5~2.9 ms, 60프레임/초(`trun.mjs --script test/tess/tour.json`).

## 다음 후보
- 순정 폰트 가속: 획 점 변환·법선·오프셋 세 반복을 하나로, 직선 획은 점 2개라 반복 없이.
- 키 4개에서도 축별 이징(성분마다 다른 s로 de Casteljau).
- SPD 행렬(타원체 모양)이나 그라스만 다양체 같은 다른 다양체, 한글 글리프.
