# tessvm 0.3.9 — 실시간 변수가 저장되지 않는 문제

**증상:** 실시간 변수만 쓰는 엔트리 작품을 playentry 작품 페이지에서 실행했을 때, tessvm 확장을 켜면 값이 저장되지 않고, 끄면 저장된다.

## 원인

`page/cloud.js`의 `CloudClient`가 엔트리 클라우드 변수 서버와 주고받는 **작업(operation) 형식이 엔트리와 다르다.**

엔트리(entryjs `src/extensions/dmet.js`, `dmetVariable.getOperation`)가 변수 값을 바꿀 때 보내는 형식:
```js
{ _id, id, variableType: 'variable', type: 'set', value }
```
서버는 `value`를 읽어 저장하고(`#set(operation) { const { value } = operation; ... }`), 같은 형식으로 다른 접속자에게 전달한다.

tessvm이 보내는 형식(`write()` → `sendAction`):
```js
{ _id, id, variableType: 'variable', type: 'set', data: value }   // value 대신 data
```

1. **(핵심) 쓰기:** 값이 `data`에 들어 있어서 서버가 읽지 못한다. 값이 저장되지 않거나 빈 값으로 저장된다.
2. **받기:** `handleAction`이 `action.data`를 읽어서, 서버가 전달한 다른 사람의 값(`value`)이 `undefined`가 된다. 실행 중 실시간 갱신이 반영되지 않는다.
3. **연결 전 쓰기:** 소켓이 열리기 전(`readyState !== OPEN`)에 쓴 값은 그냥 버리고 다시 보내지 않는다. 이미 `this.values`에 기록해서, 다음 flush에서도 "바뀌지 않음"으로 보고 넘어간다.
4. **(참고, 패치 안 함) 덮어쓰기:** 원격 변경이 오면 `vm.readStore()`가 저장된 모든 변수를 저장소 값으로 되돌린다(`runtime/engine.js`). 아직 flush(1초 주기)되지 않은 작품의 쓰기가 사라질 수 있다.
   `readStore`가 `written` 기준으로 flush되지 않은 변수는 건너뛰면 해결된다.

## 확인

가짜 소켓으로 원본과 수정본을 비교했다(`node`).
```
tessvm 0.3.9: [{"_id":"m1","id":"e1","variableType":"variable","type":"set","data":"|alice,874"}]   원격 set 후 값: undefined
patched     : [{..."type":"set","value":"before-connect"},{..."type":"set","value":"|alice,874"}]     원격 set 후 값: "|bob,500"
```

## 수정안

`cloud-fix.diff`(이 폴더)를 확장의 `page/cloud.js`에 적용한다.
- 변수 `set`을 보낼 때 `value`를 쓴다.
- 받을 때 `action.value`를 읽는다(없으면 `action.data`).
- 연결 전 쓰기를 큐에 모았다가 `welcome` 뒤에 보낸다.

## 게임 쪽 대응 (3D 레이싱 v8)

확장이 고쳐지기 전까지, 게임은 tessvm에서 실행되면(`$TESSVM == 1`) 저장·랭킹을 **읽기만 하고 쓰지 않는다**(`profile.js writeOK`).
잘못된 형식으로 쓰면, 같은 저장 칸이나 랭킹을 쓰는 다른 플레이어의 데이터까지 지울 수 있기 때문이다.
화면에는 "TESSVM EXTENSION: SAVE IS READ-ONLY ... TURN IT OFF TO SAVE"가 나온다.
확장이 고쳐지면 `writeOK()`의 조건만 지우면 된다.
