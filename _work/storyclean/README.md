# 엔트리 이야기 일괄 삭제 (크롬 확장)

로그인한 계정으로 **자기 마이페이지**(`https://playentry.org/profile/<내 id>`)에 가면
오른쪽 아래에 패널이 뜬다. 남의 프로필이나 로그아웃 상태에서는 뜨지 않는다.

1. **내 엔트리 이야기 세기** — 내 글 id를 전부 모은다 (지우지 않음).
2. "되돌릴 수 없다는 것을 압니다"에 체크 → **N개 모두 삭제**.
3. 다 지운 뒤 목록을 다시 모아 남은 글(검색 색인이 늦게 따라온 것, 실패한 것)을 최대 5바퀴까지 다시 지운다.
   **멈추기**로 언제든 멈출 수 있다.

## 설치

`chrome://extensions` → 개발자 모드 켜기 → **압축해제된 확장 프로그램을 로드합니다** → 이 폴더(`_work/storyclean`).
크롬 111 이상 (콘텐츠 스크립트를 `world: "MAIN"`으로 띄운다).

## 쓰는 API (2026-11 사이트 코드에서 확인)

- 목록: `POST /graphql/SELECT_ENTRYSTORY` — `discussList(user: <내 id>, category: "free", term: "all", searchType: "scroll", pageParam: {display: 50, sort: "created"}, searchAfter)`; `searchAfter`로 다음 쪽.
- 삭제: `POST /graphql/REMOVE_DISCUSS` — `mutation REMOVE_DISCUSS($id: ID) { removeDiscuss(id: $id) { id } }` (사이트의 글 삭제 버튼과 같은 것).
- 헤더: `CSRF-Token` (`meta[name=csrf-token]`), `x-token` (`__NEXT_DATA__ … common.user.xToken`), `x-client-type: Client`, 쿠키 포함.
- 요청을 몰아 보내면 서버가 응답 없이 붙잡는다: 요청 사이 300 ms, 10 초 넘으면 끊고 2·4·6… 초 쉬었다 다시 (5번까지).
