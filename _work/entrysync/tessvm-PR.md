feat: tessvm 실행기로 실행되는 작품 지원

## 📋 변경 사항

- `extension/inject.js`에 tessvm 실행기 지원을 추가했습니다(8번 섹션, 추가된 코드만 약 260줄).
- 엔트리 페이지에서의 기존 동작은 바뀌지 않습니다. `window.tessvm`이 없으면 추가된 코드는 아무 일도 하지 않습니다.
- `content.js`, `manifest.json`, 서버는 수정하지 않았습니다.

## 🎯 변경 이유

[tessvm for Entry](https://chromewebstore.google.com/detail/mdakllbjgeemolgfefbkbjfcoaknnfkk)는 작품 페이지의 엔트리 iframe을 비우고 그 자리에 자체 실행기를 띄우는 확장 프로그램입니다. 이때 페이지에 `window.Entry`가 없기 때문에, 지금의 Entry Sync는 tessvm으로 실행하는 사람에게는 아무 동작도 하지 않습니다. `?!` 연결 표시 변수도 0에 머물고, 동기화도 저장도 되지 않습니다.

tessvm은 실행기를 `window.tessvm`(`{ vm, start, stop, ... }`)에 올려 둡니다. `vm.variables`의 각 변수·리스트는 `{ name, value, array: [{ data }], revision, setValue(), touch() }` 형태이고, 값을 쓸 때마다 `revision`이 1씩 올라갑니다. `setValue`는 스스로 올리고, 리스트 블록은 `touch()`를 부릅니다. 이번 변경은 이 구조를 이용합니다.

- 페이지를 주기적으로 확인하는 기존 폴링(200ms)에서 `window.tessvm.vm`을 찾으면 `vm.tick`, `vm.start`, `vm.stop`, `vm.reset`에 연결합니다.
- 방 데이터(`ENTRY_SYNC_APPLY_INITIAL_DATA`)와 다른 사람의 변경(`ENTRY_SYNC_REMOTE_VAR_UPDATE`, `ENTRY_SYNC_REMOTE_LIST_UPDATE`)을 tessvm 변수에 넣습니다. 작품을 불러오기 전에 도착한 데이터는 보관했다가 연결되는 순간 넣습니다.
- 매 틱이 끝나면 `revision`이 바뀐 `!!`·`?!` 변수와 리스트만 `ENTRY_SYNC_VAR_CHANGED`, `ENTRY_SYNC_LIST_CHANGED`로 보냅니다. 한 틱에 여러 번 바뀌어도 마지막 값을 한 번만 보냅니다.
- 시작하면 `ENTRY_SYNC_ENGINE_RUN`을 보내고, 정지하거나 페이지를 떠나면 `??`·`?!` 스냅숏을 담아 `ENTRY_SYNC_ENGINE_STOP` 또는 `ENTRY_SYNC_PAGE_UNLOAD`를 보냅니다.
- `?!` 연결 표시 변수를 1 또는 -1로 맞춥니다.
- tessvm은 정지할 때 변수를 작품에 저장된 값으로 되돌립니다. 그래서 되돌린 직후에 최신 방 값과 로컬 값을 다시 넣어, 정지 화면과 다음 실행이 엔트리에서처럼 최신 값에서 이어지게 했습니다.
- 규칙은 엔트리 경로와 같습니다. 실행 직후 방 데이터가 올 때까지(최대 4초) 생긴 로컬 변경은 보내지 않고, 리스트는 통째로 보내며, 원격에서 받은 값은 되돌려 보내지 않습니다.
- 팝업의 변수 인식(`REQ_ENTRY_VARS_INSPECTION`)도 tessvm 변수로 답합니다.

## 🔗 관련 Issue

없음

## 🧪 테스트

playentry.org에서 쓰는 것과 같은 tessvm 0.3.9 실행기를 Playwright(Chromium)로 띄웠습니다. 여기에 이 PR의 `inject.js`를 넣고, 테스트 스크립트가 `content.js`와 서버 역할을 대신했습니다. 실제 `?!` 리스트 11개를 쓰는 레이싱 게임으로 21개 항목을 확인했고, 모두 통과했습니다.

- 방 데이터가 오기 전에는 아무것도 보내지 않음
- 방 데이터(예전 세이브, 랭킹)가 작품에 들어감
- 작품이 바꾼 리스트가 통째로, 다른 사람의 기록을 유지한 채 전송됨
- 다른 사람의 랭킹 변경이 반영되고, 그 값이 되돌아가지 않음
- 일반 변수: 원격 값 반영, `?!`는 실시간 전송, `??`는 실시간 전송하지 않음
- 정지 시 스냅숏에 최신 `??`·`?!` 값이 담김, 정지 화면과 재시작 후에도 값 유지, 정지·재시작만으로는 아무것도 보내지 않음
- `?!` 연결 표시 변수가 1이 됨, 페이지 오류 없음

같은 게임을 실제 엔트리 런타임에서 돌리는 기존 테스트도 그대로 통과해서, 엔트리 경로에는 영향이 없는 것을 확인했습니다.

- [x] Chrome에서 테스트했습니다. (Playwright Chromium, tessvm 실행기)
- [x] 기존 기능이 정상적으로 작동하는지 확인했습니다.
- [x] 새로운 오류가 발생하지 않는지 확인했습니다.
- [ ] 필요한 경우 다른 환경에서도 테스트했습니다. (실제 playentry.org + 실제 서버에서는 아직 확인하지 못했습니다.)

## 📸 스크린샷 / 영상

해당 없음 (UI 변경 없음)

## ⚠️ 주의 사항

- tessvm의 내부 구조(`window.tessvm.vm`, `Variable.revision`)에 기대고 있습니다. tessvm이 이 구조를 바꾸면 이 부분만 동작하지 않게 되고, 엔트리 경로에는 영향이 없습니다.
- tessvm 쪽에서 `isCloud`나 `isRealTime`이 켜진 `?!`, `!!`, `??` 변수는 엔트리 경로와 마찬가지로 끄고, tessvm 자체 클라우드 저장 대상에서도 뺍니다.

## ✅ 최종 체크리스트

- [x] 코드가 정상적으로 작동합니다.
- [x] 불필요한 파일이나 변경 사항을 포함하지 않았습니다.
- [x] 개인정보, API Key, 토큰 등의 민감한 정보를 포함하지 않았습니다.
- [x] 관련 문서가 필요한 경우 문서를 업데이트했습니다. (사용 방법이 바뀌지 않아 문서 변경은 없습니다.)
- [x] PR의 변경 사항을 설명했습니다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
