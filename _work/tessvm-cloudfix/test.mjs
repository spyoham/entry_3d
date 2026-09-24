// tessvm 0.3.9의 실제 page/cloud.js를 가짜 서버 소켓에 붙여, 보정 확장 없이/있이 비교한다.
//   node test.mjs        (_work/tessvm/ext 에 tessvm이 풀려 있어야 한다)
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const cloudSrc = new URL('../tessvm/ext/page/cloud.js', dir);
writeFileSync(new URL('cloud.tmp.mjs', dir), readFileSync(cloudSrc, 'utf8'));
const hookSrc = readFileSync(new URL('ext/hook.js', dir), 'utf8');

// 브라우저 WebSocket 흉내: 보낸 것을 기록하고, server()로 서버 메시지를 흘려 넣는다
class FakeWS extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url) {
        super();
        this.url = url;
        this.readyState = 1;
        this.sent = [];
        this._om = null;
        FakeWS.last = this;
    }
    get onmessage() { return this._om; }
    set onmessage(fn) { this._om = fn; }
    send(d) { this.sent.push(d); }
    close() { this.readyState = 3; }
    server(data) {
        const ev = new MessageEvent('message', { data });
        this._om?.(ev);
        this.dispatchEvent(ev);
    }
}

globalThis.window = globalThis;
globalThis.location = new URL('https://playentry.org/project/abc');
globalThis.fetch = async () => ({
    json: async () => ({ data: { cloudServerInfo: { url: 'https://cv.playentry.org', query: 'Q' } } }),
});
const { CloudClient } = await import(new URL('cloud.tmp.mjs', dir));

async function run(withHook) {
    globalThis.WebSocket = FakeWS;
    if (withHook) new Function(hookSrc)();
    const c = new CloudClient(
        'abc', 'csrf',
        [{ id: 'e1', variableType: 'variable', value: 'old' }, { id: 'e2', variableType: 'list', array: [] }],
        new Map([['t1', 'e1'], ['t2', 'e2']]),
        new Map([['e1', 't1'], ['e2', 't2']]),
        new Map([['t1', 'm1'], ['t2', 'm2']])
    );
    await c.connect();
    const ws = FakeWS.last;
    ws.server('0{"pingInterval":999999}');
    ws.server('42["welcome",{"variables":[{"id":"e1","variableType":"variable","value":"srv"}]}]');
    c.write('t1', '|alice,874');
    c.write('t2', [{ data: 'x' }]);
    ws.server('42["action",{"_id":"m1","id":"e1","variableType":"variable","type":"set","value":"|bob,500"}]');
    const got = c.read('t1');
    c.dispose();
    const actions = ws.sent.filter((s) => s.startsWith('42')).map((s) => JSON.parse(s.slice(s.indexOf('[')))[1]);
    return { actions, got };
}

let fail = 0;
const check = (name, ok, detail) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + JSON.stringify(detail)}`);
    if (!ok) fail++;
};

const before = await run(false);
console.log('보정 없음:', JSON.stringify(before.actions[0]), '원격 set 후 값:', before.got);
check('보정 없이 버그 재현 (data로 보냄)', 'data' in before.actions[0] && !('value' in before.actions[0]), before.actions[0]);

const after = await run(true);
console.log('보정 있음:', JSON.stringify(after.actions[0]), '원격 set 후 값:', after.got);
const [set, ins] = after.actions;
check('변수 set을 value로 보냄', set.value === '|alice,874' && !('data' in set), set);
check('_id, id, variableType 유지', set._id === 'm1' && set.id === 'e1' && set.variableType === 'variable', set);
check('리스트 insert는 그대로 (data 유지)', ins.type === 'insert' && ins.data === 'x' && !('value' in ins), ins);
check('다른 사람이 바꾼 값을 읽음', after.got === '|bob,500', after.got);

// 이미 올바른 메시지(엔트리 기본 실행기)와 socket.io가 아닌 소켓은 건드리지 않는다
const ok = '42["action",{"_id":"m1","id":"e1","variableType":"variable","type":"set","value":"v"}]';
const w1 = new WebSocket('wss://cv.playentry.org/?EIO=3&transport=websocket');
w1.send(ok);
check('올바른 메시지는 그대로', w1.sent[0] === ok, w1.sent[0]);
const bad = '42["action",{"_id":"m1","id":"e1","variableType":"variable","type":"set","data":"v"}]';
const w2 = new WebSocket('wss://example.org/other');
w2.send(bad);
check('socket.io가 아닌 소켓은 그대로', w2.sent[0] === bad, w2.sent[0]);
let seen;
w1.addEventListener('message', (e) => (seen = e.data));
w1.server('42["action",{"id":"e1","variableType":"variable","type":"set","value":"z"}]');
check('addEventListener로 받아도 data 채움', JSON.parse(seen.slice(2))[1].data === 'z', seen);
check('instanceof / 상수 유지', w1 instanceof WebSocket && WebSocket.OPEN === 1 && WebSocket.name === 'WebSocket', null);

// 두 번 로드돼도 한 번만 감싼다
const W = globalThis.WebSocket;
new Function(hookSrc)();
check('중복 로드 무시', globalThis.WebSocket === W, null);

unlinkSync(new URL('cloud.tmp.mjs', dir)); // 제3자 코드 사본은 남기지 않는다
console.log(fail ? `\n${fail}개 실패` : '\n모두 통과');
process.exit(fail ? 1 : 0);
