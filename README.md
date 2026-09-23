# entry_3d

엔트리(Entry)에서 블록만으로 만든 3D 엔진과 게임 모음입니다.

## 작품
- **3D 엔진** (`3D v1` ~ `3D v5`): 범용 3D 엔진. 사용법은 `3D v5 사용설명서.md`
- **3D 레이싱** (`3D 레이싱 v1` ~ `v4`): F1 서킷 8개
- **3D 포탈 퍼즐**
- **DOOM (Freedoom E1M1)**
- **SmolLM2-135M / TinyStories LLM**: 2.67비트 양자화 언어 모델을 엔트리 블록으로 구현

## 폴더
- `*.ent`: 엔트리 작품 파일
- `_work/`: 각 작품의 빌드 스크립트와 파이프라인 (`doom`, `racing`, `engine3d`, `smollm`)
- `SmolLM2-135M 리스트/`: SmolLM2 가중치 리스트 데이터

용량이 큰 데이터셋, 모델 체크포인트, 외부 저장소는 `.gitignore`로 제외되어 있습니다.
