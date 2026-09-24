// tessvm 실시간 변수 보정 (tessvm 0.3.x 임시 대응)
//
// tessvm은 엔트리 실시간 변수 서버(/cv 소켓)에 변수 값을 { type: 'set', data } 로 보내는데,
// 엔트리와 서버는 { type: 'set', value } 를 쓴다. 그래서 값이 저장되지 않고,
// 다른 사람이 바꾼 값(value)도 tessvm은 data에서 찾느라 읽지 못한다.
//
// 이 스크립트는 페이지의 WebSocket을 감싸서 socket.io 소켓의 메시지 형식만 바꾼다.
//   보낼 때: 변수 set에 data만 있으면 value로 옮긴다.
//   받을 때: 변수 set에 value만 있으면 data에도 복사한다.
// 이미 올바른 메시지(엔트리 기본 실행기, 또는 고쳐진 tessvm)는 그대로 둔다.
// 새 요청을 만들지 않고, 페이지가 보내는 메시지만 고친다.
(() => {
    const Native = window.WebSocket;
    if (!Native || Native.__tessvmCloudFix) return;

    const TAG = '[tessvm 보정]';
    // socket.io v2 이벤트 패킷: 42 + (응답 번호) + JSON 배열
    const FRAME = /^42(\d*)(\[[\s\S]*\])$/;

    // 실시간 변수 서버 주소는 cloudServerInfo가 정해서(예: wss://cv.playentry.org/?...) 경로로 가릴 수 없다.
    // socket.io 소켓(EIO= 쿼리)만 보고, 나머지는 메시지 모양(변수 set)으로 가린다.
    function isCloudUrl(url) {
        try {
            return new URL(String(url), location.href).searchParams.has('EIO');
        } catch (e) {
            return false;
        }
    }

    // fix(action)이 action을 고쳤으면 true
    function rewrite(msg, fix) {
        if (typeof msg !== 'string') return msg;
        const m = FRAME.exec(msg);
        if (!m) return msg;
        let arr;
        try {
            arr = JSON.parse(m[2]);
        } catch (e) {
            return msg;
        }
        const action = arr[1];
        if (arr[0] !== 'action' || !action || action.variableType !== 'variable' || action.type !== 'set') {
            return msg;
        }
        if (!fix(action)) return msg;
        return '42' + m[1] + JSON.stringify(arr);
    }

    const fixOut = (msg) =>
        rewrite(msg, (a) => {
            if (!('data' in a) || 'value' in a) return false;
            a.value = a.data;
            delete a.data;
            return true;
        });

    const fixIn = (msg) =>
        rewrite(msg, (a) => {
            if (!('value' in a) || 'data' in a) return false;
            a.data = a.value;
            return true;
        });

    function fixEvent(ev) {
        const data = fixIn(ev.data);
        if (data === ev.data) return ev;
        return new MessageEvent('message', { data, origin: ev.origin, lastEventId: ev.lastEventId });
    }

    const nativeOnMessage = Object.getOwnPropertyDescriptor(Native.prototype, 'onmessage');
    const wrapped = new WeakMap(); // 원래 리스너 → 감싼 리스너

    class PatchedWebSocket extends Native {
        constructor(url, protocols) {
            super(url, protocols);
            this.__cloudFix = isCloudUrl(url);
            this.__onmessage = null;
            if (this.__cloudFix) console.log(TAG, 'socket.io 소켓 보정 중:', String(url).split('?')[0]);
        }

        send(data) {
            return super.send(this.__cloudFix ? fixOut(data) : data);
        }

        get onmessage() {
            return this.__onmessage;
        }

        set onmessage(fn) {
            this.__onmessage = fn;
            const handler =
                this.__cloudFix && typeof fn === 'function' ? (ev) => fn.call(this, fixEvent(ev)) : fn;
            nativeOnMessage.set.call(this, handler);
        }

        addEventListener(type, listener, options) {
            if (this.__cloudFix && type === 'message' && typeof listener === 'function') {
                const original = listener;
                if (!wrapped.has(original)) wrapped.set(original, (ev) => original.call(this, fixEvent(ev)));
                listener = wrapped.get(original);
            }
            return super.addEventListener(type, listener, options);
        }

        removeEventListener(type, listener, options) {
            if (type === 'message' && wrapped.has(listener)) listener = wrapped.get(listener);
            return super.removeEventListener(type, listener, options);
        }
    }

    Object.defineProperty(PatchedWebSocket, 'name', { value: 'WebSocket' });
    Object.defineProperty(PatchedWebSocket, '__tessvmCloudFix', { value: true });
    window.WebSocket = PatchedWebSocket;
})();
