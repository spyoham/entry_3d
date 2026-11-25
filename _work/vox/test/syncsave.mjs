// (v3.5) What does the REAL Entry Sync room server do with the save a workspace (the editor page) sends -
// when the author clears the work and brings its code back from the locker, the lists are gone for a while
// and come back empty. A room of its own (a made-up id), dummy data, plain web sockets doing what the
// extension's content.js 1.1.2 does.   node test/syncsave.mjs
const WSURL = 'wss://entry-sync.entry-sync.workers.dev/ws';
const room = process.env.ROOM || [...Array(24)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tab = 0;
// one visit: connect, wait for what the room holds, do f, close; gives what the room held at the start
async function visit(name, f) {
  const ws = new WebSocket(`${WSURL}?room=${room}&tab=t${++tab}`);
  let init = null; const got = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); got.push(m.type); if (m.type === 'INIT_ROOM_STATUS') init = m; if (m.type === 'FULL_SYNC_UPDATE') init = { data: m.payload, full: true }; };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('socket error')); });
  ws.send(JSON.stringify({ type: 'GET_LATEST_DATA', roomId: room }));
  for (let i = 0; i < 40 && !init; i++) await sleep(100);
  await sleep(600);
  const lists = ((init && init.data && init.data.syncData) || {}).lists || {};
  const vars = ((init && init.data && init.data.syncData) || {}).variables || {};
  const show = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, Array.isArray(v) ? v.join('/').slice(0, 40) : JSON.stringify(v)]));
  console.log(`${name}: the room holds lists ${JSON.stringify(show)} variables ${JSON.stringify(vars)}`);
  if (f) { await f(ws); await sleep(1500); }
  ws.close();
  await sleep(2500);
  return { lists, vars, got };
}
const list = (ws, name, array) => ws.send(JSON.stringify({ type: 'LIST_CHANGE', name, array }));
const save = (ws, lists, variables = {}, isWorkspacePage = true) => ws.send(JSON.stringify({ type: 'SAVE_DATA_ONLY', userId: 'u_test', isWorkspacePage, roomId: room, payload: null, syncData: { variables, lists } }));
console.log('room', room);
await visit('1 a player', async (ws) => { list(ws, '?!m1', ['H^one', 'O^a']); list(ws, '?!m2', ['H^two']); list(ws, '?!e1', [1, 2, 3, 4, 0]); ws.send(JSON.stringify({ type: 'VAR_CHANGE', name: '?!gbr', value: 7 })); });
const r2 = await visit('2 the room after everybody left');
const kept = (r, k) => Array.isArray(r.lists[k]) && r.lists[k].length > 0;
console.log(kept(r2, '?!m1') && kept(r2, '?!m2') && kept(r2, '?!e1') ? 'ok   the three lists are kept by the room' : 'FAIL the room did not keep them');
// the editor, lists being deleted one by one: a save that holds only what is left
await visit('3 the editor saves with one list only (the others deleted there)', async (ws) => { save(ws, { '?!m2': ['H^two'] }); });
const r4 = await visit('4 after');
console.log(`     a list missing from the editor's save: ${kept(r4, '?!m1') ? 'STAYS in the room' : 'is GONE from the room'}`);
// the editor, the code brought back: the lists are there again and empty
await visit('5 the editor saves with the lists empty (the code brought back)', async (ws) => { save(ws, { '?!m1': [], '?!m2': [], '?!e1': [] }); });
const r6 = await visit('6 after');
console.log(`     a list empty in the editor's save: ${kept(r6, '?!m2') ? 'STAYS in the room' : 'is GONE from the room'} (m1 ${kept(r6, '?!m1')}, m2 ${kept(r6, '?!m2')}, e1 ${kept(r6, '?!e1')}, the variable ${JSON.stringify(r6.vars)})`);
// the same from a play page (a stop there)
if (kept(r6, '?!m2')) {
  await visit('7 a play page stops with the lists empty', async (ws) => { save(ws, { '?!m1': [], '?!m2': [], '?!e1': [] }, {}, false); });
  const r8 = await visit('8 after');
  console.log(`     a list empty in a play page's save: ${kept(r8, '?!m2') ? 'STAYS in the room' : 'is GONE from the room'}`);
}
process.exit(0);
