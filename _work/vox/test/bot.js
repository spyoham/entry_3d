// A survival speedrun bot for 블록 월드. It plays through the game's inputs only: where it looks
// (yaw / pitch, as the mouse would), keys, the mouse button and clicks on the screens. It reads
// the world's lists to know where things are (like a tool-assisted run).
// makeBot(io) -> { step() } ; io: get(name), set(name, v), list(name, i) (1-based), key(code, down),
// mouseDown(b), mouse(x, y), click(), log(s), frames()
function makeBot(io) {
  const WS = 224, WY = 64, NCH = 14, SEA = 30;
  const K = { W: 87, S: 83, SPACE: 32, SHIFT: 16, E: 69, F: 70, R: 82 };
  const NONSOLID = new Set([0, 7, 27, 28, 29, 30, 31, 35, 46, 47, 56, 57]);
  const PLACEABLE = [4, 48, 3, 1, 54, 49, 53, 21];      // blocks it builds with
  const mod = (a, b) => ((a % b) + b) % b;
  const fl = Math.floor;
  let log = (s) => io.log(`[${(io.get('tickN') / 60).toFixed(1)}s] ${s}`);
  const dbg = (s) => { if (io.dbg) log('  ' + s); };

  // ---------------------------------------------------------------- the world
  function blk(x, y, z) {
    if (y < 0) return 6;
    if (y >= WY) return 0;
    const cx = fl(x / 16), cz = fl(z / 16), s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
    if (io.list('CKST', s) >= 3 && io.list('CKX', s) === cx && io.list('CKZ', s) === cz) return io.list('W', (mod(x, WS) * WS + mod(z, WS)) * WY + y + 1);
    return -1;
  }
  const solid = (b) => b !== -1 && !NONSOLID.has(b);
  const P = () => ({ x: io.get('px'), y: io.get('py'), z: io.get('pz') });
  const cell = () => { const p = P(); return { x: fl(p.x), y: fl(p.y + 0.01), z: fl(p.z) }; };
  // nearest block of the ids (within r columns, in made chunks), by a scan round the player
  function nearest(ids, r, ylo = 1, yhi = WY - 2, skip = null) {
    const c = cell(); let best = null, bd = 1e9;
    for (let x = c.x - r; x <= c.x + r; x++) for (let z = c.z - r; z <= c.z + r; z++) {
      const cx = fl(x / 16), cz = fl(z / 16), s = mod(cx, NCH) * NCH + mod(cz, NCH) + 1;
      if (!(io.list('CKST', s) >= 3 && io.list('CKX', s) === cx && io.list('CKZ', s) === cz)) continue;
      const base = (mod(x, WS) * WS + mod(z, WS)) * WY + 1;
      for (let y = ylo; y <= yhi; y++) {
        if (!ids.includes(io.list('W', base + y))) continue;
        if (skip && skip(x, y, z)) continue;
        const d = (x - c.x) ** 2 + (z - c.z) ** 2 + ((y - c.y) * 1.5) ** 2;
        if (d < bd) { bd = d; best = { x, y, z }; }
      }
    }
    return best;
  }
  // ---------------------------------------------------------------- the inventory
  const inv = (s) => ({ id: io.list('INVI', s), n: io.list('INVN', s) });
  function count(id) { let n = 0; for (let s = 1; s <= 36; s++) if (io.list('INVI', s) === id) n += io.list('INVN', s); return n; }
  function slotOf(id, from = 1, to = 36) { for (let s = from; s <= to; s++) if (io.list('INVI', s) === id) return s; return 0; }
  function emptySlot(from = 1, to = 36) { for (let s = from; s <= to; s++) if (io.list('INVI', s) === 0) return s; return 0; }

  // ---------------------------------------------------------------- waiting and input
  function* ticks(n) { for (let i = 0; i < n; i++) yield; }
  function* frames(n) { const f0 = io.frames(); let k = 0; while (io.frames() < f0 + n && k < 600) { yield; k++; } }
  function* press(code) { io.key(code, true); yield* frames(2); io.key(code, false); yield* frames(1); }
  function face(tx, ty, tz) {
    const ex = io.get('px'), ey = io.get('py') + io.get('eyeH'), ez = io.get('pz');
    const dx = tx - ex, dy = ty - ey, dz = tz - ez;
    io.set('yaw', mod(Math.atan2(dx, dz) * 180 / Math.PI, 360));
    io.set('pitch', Math.max(-89, Math.min(89, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)));
  }
  function* select(id) {
    where = `select ${id}`;
    let s = slotOf(id, 1, 9);
    if (!s) {
      const from = slotOf(id, 10, 36);
      if (!from) return false;
      // into the hotbar: hover it on the inventory screen and press a number
      // (an empty slot, else one holding nothing it keeps using)
      const KEEP = new Set([133, 132, 145, 122, 124, ...PLACEABLE]);
      let hs = emptySlot(1, 9);
      for (let k = 9; k >= 1 && !hs; k--) if (!KEEP.has(io.list('INVI', k))) hs = k;
      if (!hs) hs = 9;
      yield* openInv();
      yield* hover(from); yield* press(48 + hs);
      yield* closeUI();
      s = hs;
    }
    if (io.get('hotSel') !== s) yield* press(48 + s);
    return true;
  }
  // ---------------------------------------------------------------- screens
  function slotPos(s) {
    const cg = io.get('cgSize');
    if (s <= 9) return [-72 + (s - 1) * 18, -78];
    if (s <= 36) return [-72 + mod(s - 10, 9) * 18, -18 - fl((s - 10) / 9) * 18];
    if (s <= 40) return [-72, 66 - (s - 37) * 18];
    if (s <= 49) { const k = s - 41; return cg === 2 ? [6 + mod(k, 2) * 18, 62 - fl(k / 2) * 18] : [-52 + mod(k, 3) * 18, 66 - fl(k / 3) * 18]; }
    if (s === 50) return cg === 2 ? [66, 53] : [40, 48];
    return { 51: [-24, 66], 52: [-24, 30], 53: [36, 48] }[s];
  }
  function* hover(s) {
    where = `hover ${s}`; const [x, y] = slotPos(s); io.mouse(x, y); yield* frames(2); }
  function* click(s, shift = false) {
    where = `click ${s} ${shift}`;
    yield* hover(s);
    if (io.get('uiHover') !== s) { dbg(`hover ${s}: got ${io.get('uiHover')}`); yield* frames(2); }
    if (shift) io.key(K.SHIFT, true);
    io.click(); yield* frames(2);
    if (shift) io.key(K.SHIFT, false);
    yield* frames(1);
  }
  function* openInv() {
    where = `openInv `; if (io.get('uiMode') === 0) { yield* press(K.E); } }
  function* closeUI() {
    where = `closeUI `; let k = 0; while (io.get('uiMode') !== 0 && k++ < 5) yield* press(K.E); }
  // fill the grid: cells [[gridIndex, id], ...]; then take the result (all: shift, into the inventory)
  function* craft(cells, all = false, stack = false) {
    where = `craft ${cells} ${all} ${stack}`;
    yield* putCursor();
    const ids = [...new Set(cells.map(c => c[1]))];
    for (const id of ids) {
      const s = slotOf(id);
      if (!s) { log(`craft: no ${id}`); return false; }
      yield* click(s);                                                        // the stack onto the cursor
      if (stack) { yield* click(41 + cells[0][0]); continue; }               // the whole stack
      for (const [g, gid] of cells) if (gid === id) yield* click(41 + g, true);  // one into each cell
      yield* click(s);                                                        // the rest back
    }
    yield* putCursor();
    if (io.get('craftOut') === 0) { log('craft: no result'); return false; }
    if (all) { yield* click(50, true); }
    else { yield* click(50); const e = emptySlot(1, 9) || emptySlot(); yield* click(e); }
    yield* putCursor();
    return true;
  }
  // whatever is on the cursor into an empty slot
  function* putCursor() {
    where = `putCursor `;
    for (let k = 0; k < 3 && io.get('curI') !== 0; k++) { const e = slotOf(io.get('curI')) || emptySlot(); if (!e) break; yield* click(e); }
  }
  const G2 = (r, c) => r * 2 + c, G3 = (r, c) => r * 3 + c;

  // ---------------------------------------------------------------- mining and placing
  function lavaNear(x, y, z) { for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]]) if (blk(x + a, y + b, z + c) === 35) return true; return false; }
  const PICKB = new Set([1, 4, 10, 11, 12, 16, 18, 21, 34, 36, 38, 39, 40, 41, 42, 43, 44, 48, 51, 52, 53, 54, 55]);
  function* mine(x, y, z, safe = true, depth = 0) {
    where = `mine ${x} ${y} ${z} ${safe} ${depth}`;
    if (depth > 3) return false;
    const b0 = blk(x, y, z);
    if (b0 === 0 || b0 === 7 || b0 === 35 || b0 === -1 || b0 === 47 || b0 === 56) return true;
    // obsidian only when that is what it came for (not in the way of walking or climbing)
    if (b0 === 34 && !hardOK) { dbg(`mine: obsidian in the way at ${x},${y},${z}`); return false; }
    if (PICKB.has(b0) && !fighting) { for (const id of [133, 132, 131, 130]) if (count(id)) { if (io.list('INVI', io.get('hotSel')) !== id) yield* select(id); break; } }
    if (safe && lavaNear(x, y, z)) { log(`mine: lava next to ${x},${y},${z}`); return false; }
    // never the block it stands on when lava is under it
    { const c = cell(); if (x === c.x && z === c.z && y < c.y) { for (let d = 1; d <= 4; d++) if (blk(x, y - d, z) === 35) { dbg('mine: lava under the floor'); return false; } } }
    let k = 0;
    let turned = false, far = 0;
    while (blk(x, y, z) === b0 && k < 900) {
      face(x + 0.5, y + 0.5, z + 0.5);
      // (the game picks what is looked at in its frame: a frame after turning)
      if (!turned) { yield* frames(1); turned = true; }
      // something else in the way: that first
      if (io.get('pickOn') === 1 && (io.get('pickX') !== x || io.get('pickY') !== y || io.get('pickZ') !== z)) {
        const ox = io.get('pickX'), oy = io.get('pickY'), oz = io.get('pickZ');
        dbg(`mine ${x},${y},${z}: in the way ${blk(ox, oy, oz)} at ${ox},${oy},${oz} (depth ${depth}) yaw ${io.get('yaw').toFixed(0)} pitch ${io.get('pitch').toFixed(0)} eye ${io.get('px').toFixed(2)},${(io.get('py') + io.get('eyeH')).toFixed(2)},${io.get('pz').toFixed(2)}`);
        io.mouseDown(false); yield;
        if (!(yield* mine(ox, oy, oz, safe, depth + 1))) return false;
        turned = false;
        continue;
      }
      io.mouseDown(true); yield; k++;
      // out of reach: give up
      if (io.get('pickOn') !== 1) { if (++far > 40) break; } else far = 0;
    }
    io.mouseDown(false); yield;
    if (blk(x, y, z) === b0) dbg(`mine failed ${b0} at ${x},${y},${z}: pick ${io.get('pickOn')} ${io.get('pickX')},${io.get('pickY')},${io.get('pickZ')} b ${io.get('pickB')} k ${k}`);
    return blk(x, y, z) !== b0;
  }
  // place block id into (x, y, z) against a solid neighbour
  function* place(id, x, y, z) {
    where = `place ${id} ${x} ${y} ${z}`;
    if (solid(blk(x, y, z))) return true;
    if (!(yield* select(id))) { log(`place: no ${id}`); return false; }
    const N = [[0, -1, 0, 3], [-1, 0, 0, 1], [1, 0, 0, 0], [0, 0, -1, 5], [0, 0, 1, 4], [0, 1, 0, 2]];
    for (const [a, b, c, f] of N) {
      if (!solid(blk(x + a, y + b, z + c))) continue;
      for (let k = 0; k < 6; k++) {
        face(x + 0.5 + a * 0.49, y + 0.5 + b * 0.49, z + 0.5 + c * 0.49);
        yield* frames(1);
        if (io.get('pickOn') === 1 && io.get('pickX') === x + a && io.get('pickY') === y + b && io.get('pickZ') === z + c && io.get('pickF') === f) {
          yield* press(K.F); yield* frames(1);
          if (solid(blk(x, y, z)) || blk(x, y, z) === id) return true;
        }
      }
    }
    return false;
  }
  function blockItem() { for (const id of PLACEABLE) if (count(id) > 0) return id; return 0; }

  // ---------------------------------------------------------------- moving (digging where it must)
  function* walkTo(x, z, tol = 0.22) {
    where = `walkTo ${x} ${z} ${tol}`;
    let k = 0, last = 1e9, still = 0, stuck = 0, d = 1e9;
    io.key(K.W, true); io.key(K.R, true);
    while (k++ < 400) {
      const p = P(); d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < tol) break;
      face(x + 0.5, p.y + io.get('eyeH'), z + 0.5);
      if (d > last - 0.005) { stuck++; still++; if (still > 20) { io.key(K.SPACE, true); yield; io.key(K.SPACE, false); still = 0; } } else still = 0;
      if (stuck > 90) break;
      last = d; yield;
    }
    io.key(K.W, false); io.key(K.R, false);
    yield* ticks(2);
    return d < 0.6;
  }
  // one step to the next cell (sx, sz) on the same level (or a block up / down)
  function* stepTo(nx, nz) {
    where = `stepTo ${nx} ${nz}`;
    const c = cell();
    // head room where it goes, and where it stands
    if (!(yield* mine(nx, c.y + 1, nz))) return false;
    const atFeet = blk(nx, c.y, nz);
    if (solid(atFeet)) {
      // a step up: jump onto it if the room is there
      if (!solid(blk(nx, c.y + 2, nz)) && !solid(blk(c.x, c.y + 2, c.z))) {
        face(nx + 0.5, c.y + 1.5, nz + 0.5);
        io.key(K.SPACE, true); io.key(K.W, true); yield* ticks(12); io.key(K.SPACE, false);
        yield* walkTo(nx, nz); io.key(K.W, false);
        if (cell().x === nx && cell().z === nz) return true;
      }
      if (!(yield* mine(nx, c.y, nz))) return false;
    }
    if (atFeet === 7 || atFeet === 35 || blk(nx, c.y + 1, nz) === 35) return false;
    // nothing to stand on: a short drop is fine, a deep one (or lava) gets a block
    if (!solid(blk(nx, c.y - 1, nz))) {
      let d = 1; while (d < 6 && !solid(blk(nx, c.y - d, nz)) && blk(nx, c.y - d, nz) !== 35 && blk(nx, c.y - d, nz) !== 7) d++;
      const under = blk(nx, c.y - d, nz);
      if (d > 3 || under === 35 || under === 7) { const b = blockItem(); if (!b || !(yield* place(b, nx, c.y - 1, nz))) return false; }
    }
    return yield* walkTo(nx, nz);
  }
  function* digDown() {
    where = `digDown `;
    const c = cell();
    const b1 = blk(c.x, c.y - 1, c.z), b2 = blk(c.x, c.y - 2, c.z), b3 = blk(c.x, c.y - 3, c.z);
    if ([b1, b2, b3].some(b => b === 35 || b === 7)) return false;
    if (!solid(b2) && !solid(b3)) return false;               // a cave under: not straight down
    if (b1 === 6) return false;
    yield* walkTo(c.x, c.z, 0.15);
    if (!(yield* mine(c.x, c.y - 1, c.z))) return false;
    yield* ticks(25);
    return cell().y < c.y;
  }
  function* pillarUp() {
    where = `pillarUp `;
    const T0 = T; const r = yield* pillarUp0(); dbg(`pillar ${r} ${T - T0} ticks`); return r;
  }
  function* pillarUp0() {
    where = `pillarUp0 `;
    const c = cell();
    if (!(yield* mine(c.x, c.y + 1, c.z))) return false;
    if (!(yield* mine(c.x, c.y, c.z))) return false;
    if (!(yield* mine(c.x, c.y + 2, c.z))) return false;
    const b = blockItem(); if (!b) { dbg('pillar: no blocks'); return false; }
    yield* select(b);
    // (sneaking: never off the edge of the column)
    io.key(K.SHIFT, true); yield* walkTo(c.x, c.z, 0.15); io.key(K.SHIFT, false);
    io.set('pitch', -89.5);
    io.key(K.SPACE, true); yield* ticks(3); io.key(K.SPACE, false);
    let k = 0;
    while (io.get('py') < c.y + 1.05 && k++ < 40) yield;
    face(c.x + 0.5, c.y - 0.5 + 0.49 + 0.5, c.z + 0.5);
    io.set('pitch', -89.5);
    const pyTop = io.get('py');
    yield* press(K.F);
    yield* ticks(20);
    if (cell().y <= c.y) dbg(`pillar failed at ${c.x},${c.y},${c.z}: py at press ${pyTop.toFixed(2)}, below ${blk(c.x, c.y - 1, c.z)}, here ${blk(c.x, c.y, c.z)}, head ${blk(c.x, c.y + 2, c.z)}, pick ${io.get('pickY')} f ${io.get('pickF')} sel ${io.list('INVI', io.get('hotSel'))}`);
    return cell().y > c.y;
  }
  // to (x, y, z): level first, then x, then z; around what it cannot go through
  let hardOK = false, hunting = false;
  let T = 0, swim = false, surfacing = false, where = '';
  function* goTo(x, y, z, near = 0) {
    where = `goTo ${x} ${y} ${z} ${near}`;
    let guard = 0, fails = 0;
    const T0 = T;
    while (guard++ < 600 && T - T0 < 1800) {
      yield* defend();
      yield* eatIfHungry();
      // food animals on the way (in the upper world, while it carries little food)
      if (!hunting && io.get('dim') === 0 && guard % 10 === 1 && FOODS.reduce((a, id) => a + count(id), 0) < 8) {
        const p = P(); let near = false;
        for (let i = 1; i <= 40 && !near; i++) { const t = io.list('ET', i); if ((t === 1 || t === 2 || t === 4) && (io.list('EX', i) - p.x) ** 2 + (io.list('EZ', i) - p.z) ** 2 < 100 && Math.abs(io.list('EY', i) - p.y) < 2) near = true; }
        if (near) { hunting = true; yield* hunt(8, 600); hunting = false; }
      }
      const c = cell();
      const dist = Math.abs(c.x - x) + Math.abs(c.z - z) + Math.abs(c.y - y);
      if (dist <= near) return true;
      let ok = true;
      if (c.y > y + 1 && Math.abs(c.x - x) + Math.abs(c.z - z) <= 2) ok = yield* digDown();
      else if (c.y < y && Math.abs(c.x - x) + Math.abs(c.z - z) <= 1) ok = yield* pillarUp();
      else if (c.y > y + 3 && fails === 0) ok = yield* digDown();
      else {
        let sx = Math.sign(x - c.x), sz = Math.sign(z - c.z);
        if (Math.abs(x - c.x) >= Math.abs(z - c.z) && sx !== 0) sz = 0; else sx = 0;
        if (fails % 2 === 1) { if (sx !== 0) { sz = Math.sign(z - c.z) || 1; sx = 0; } else { sx = Math.sign(x - c.x) || 1; sz = 0; } }
        if (sx === 0 && sz === 0) { ok = c.y < y ? yield* pillarUp() : yield* digDown(); }
        else ok = yield* stepTo(c.x + sx, c.z + sz);
      }
      if (!ok) { dbg(`goTo step failed at ${c.x},${c.y},${c.z} -> ${x},${y},${z}`); fails++; if (fails > 8) { log(`goTo stuck at ${c.x},${c.y},${c.z} -> ${x},${y},${z}`); return false; } }
      else fails = 0;
    }
    return false;
  }
  // stand next to (x, y, z) at its level (the cell beside it toward the player) and mine it
  function* fetch(t) {
    where = `fetch ${t}`;
    const c = cell();
    // a place to stand beside it, on the ground within reach (up to 3 below it), nearer side first
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort((a, b) => Math.hypot(t.x + a[0] - c.x, t.z + a[1] - c.z) - Math.hypot(t.x + b[0] - c.x, t.z + b[1] - c.z));
    let st = null;
    for (const [a, b] of sides) for (let dy = 1; dy >= -3 && !st; dy--) {
      const x = t.x + a, y = t.y + dy, z = t.z + b;
      if (!solid(blk(x, y, z)) && !solid(blk(x, y + 1, z)) && solid(blk(x, y - 1, z)) && blk(x, y, z) !== 7 && blk(x, y, z) !== 35) st = { x, y, z };
    }
    if (!st) { const [a, b] = sides[0]; st = { x: t.x + a, y: t.y, z: t.z + b }; }
    let g = yield* goTo(st.x, st.y, st.z, 0);
    if (!g) { const c2 = cell(); if (Math.hypot(c2.x - t.x, c2.y + 1 - t.y, c2.z - t.z) > 4) g = yield* goTo(t.x, t.y, t.z, 1); }
    hardOK = true; const m = yield* mine(t.x, t.y, t.z); hardOK = false;
    dbg(`fetch ${blk(t.x, t.y, t.z)} at ${t.x},${t.y},${t.z} from ${JSON.stringify(st)}: goTo ${g} mine ${m}, now at ${JSON.stringify(cell())}`);
    return m;
  }
  // the items lying about near: walk to them
  function* gather(r = 4) {
    where = `gather ${r}`;
    for (let k = 0; k < 6; k++) {
      let best = null, bd = r * r;
      const p = P();
      for (let i = 1; i <= 64; i++) {
        if (io.list('IID', i) === 0) continue;
        if (Math.abs(io.list('IYY', i) - p.y) > 1.2) continue;
        // only over solid floor all the way (never into a lava hole)
        { const ix = io.list('IXX', i), iz = io.list('IZZ', i), fy = fl(p.y) - 1; let ok = true;
          for (let t = 0; t <= 1.001 && ok; t += 0.2) { const b = blk(fl(p.x + (ix - p.x) * t), fy, fl(p.z + (iz - p.z) * t)); if (!solid(b) || b === 35) ok = false; }
          if (!ok) continue; }
        const d = (io.list('IXX', i) - p.x) ** 2 + (io.list('IZZ', i) - p.z) ** 2 + (io.list('IYY', i) - p.y) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      if (!best) return;
      yield* walkTo(fl(io.list('IXX', best)), fl(io.list('IZZ', best)), 0.3);
      yield* ticks(20);
    }
  }
  // fight what comes near (the slot with the best weapon in hand while at it)
  let fighting = false;
  // eat when hungry (whatever food it carries)
  const FOODS = [109, 107, 111, 105, 106, 108, 110, 112];
  function* eatIfHungry() {
    where = `eatIfHungry `;
    // (kept at 18 or more while hurt: that is when it heals)
    if (io.get('food') > (io.get('hp') < 20 ? 17 : 14) || io.get('uiMode') !== 0) return;
    const f = FOODS.find(id => count(id) > 0); if (!f) return;
    const keep = io.list('INVI', io.get('hotSel'));
    yield* select(f); yield* ticks(25); yield* press(K.F); yield* ticks(10);
    if (keep && count(keep)) yield* select(keep);
  }
  // a few animals for food (time-boxed)
  function* hunt(want = 3, limit = 2400) {
    where = `hunt ${want} ${limit}`;
    const T0 = T;
    while (FOODS.reduce((a, id) => a + count(id), 0) < want && T - T0 < limit) {
      const p = P(); let e = 0, bd = 40 * 40;
      for (let i = 1; i <= 40; i++) {
        const t = io.list('ET', i); if (t < 1 || t > 4 || t === 3) continue;
        if (Math.abs(io.list('EY', i) - p.y) > 3) continue;
        const d = (io.list('EX', i) - p.x) ** 2 + (io.list('EZ', i) - p.z) ** 2;
        if (d < bd) { bd = d; e = i; }
      }
      if (!e) return;
      for (let k = 0; k < 40 && io.list('ET', e) >= 1 && io.list('ET', e) <= 4; k++) {
        const ex = io.list('EX', e), ey = io.list('EY', e), ez = io.list('EZ', e), q = P();
        if ((ex - q.x) ** 2 + (ez - q.z) ** 2 > 6) { if (!(yield* walkTo(fl(ex), fl(ez), 1.6))) yield* stepTo(fl(ex), fl(ez)); continue; }
        face(ex, ey + 0.5, ez); yield* frames(1);
        if (io.get('mobPick') === e) io.click();
        yield* ticks(12);
      }
      yield* gather(4);
    }
  }
  function* defend() {
    where = `defend `;
    if (fighting) return;
    fighting = true;
    for (let k = 0; k < 200; k++) {
      const p = P(); let e = 0, bd = 3.2 * 3.2;
      for (let i = 1; i <= 40; i++) {
        const t = io.list('ET', i); if (t < 5 || t === 10) continue;
        const d = (io.list('EX', i) - p.x) ** 2 + (io.list('EZ', i) - p.z) ** 2 + (io.list('EY', i) - p.y) ** 2;
        if (d < bd) { bd = d; e = i; }
      }
      if (!e) break;
      if (count(145) && io.list('INVI', io.get('hotSel')) !== 145) yield* select(145);
      face(io.list('EX', e), io.list('EY', e) + 0.9, io.list('EZ', e));
      yield* frames(1);
      if (io.get('mobPick') === e) { io.click(); }
      yield* ticks(14);
    }
    fighting = false;
  }

  // ---------------------------------------------------------------- the run
  const tasks = [];
  const invText = () => { const o = []; for (let k = 1; k <= 36; k++) if (io.list('INVI', k)) o.push(`${k}:${io.list('INVI', k)}x${io.list('INVN', k)}`); return o.join(' ') + (io.get('curI') ? ` cur ${io.get('curI')}x${io.get('curN')}` : ''); };
  const stage = (s) => { log(s + '   | ' + invText()); io.set('msgText', s); io.set('msgT', 4); };
  let obsidian = false;
  function* getAll(ids, want, have, r = 40, ylo = 1, yhi = WY - 2) {
    where = `getAll ${ids} ${want} ${have} ${r} ${ylo} ${yhi}`;
    let guard = 0;
    const bad = new Set(); let miss = 0;
    while (have() < want && guard++ < 40) {
      const t = nearest(ids, r, ylo, yhi, (x, y, z) => bad.has(`${x},${y},${z}`) || lavaNear(x, y, z) || blk(x, y + 1, z) === 35 || (obsidian && blk(x, y - 1, z) === 35));
      if (!t) {
        // the land is maybe still being made, or nothing here: wait, then look further on
        if (miss < 3) { miss++; yield* ticks(90); continue; }
        if (miss < 6) { miss++; const c = cell(); yield* goTo(c.x + 14, c.y, c.z, 2); continue; }
        log(`none of ${ids} near`); return false;
      }
      if (!(yield* fetch(t))) bad.add(`${t.x},${t.y},${t.z}`);
      yield* gather(3);
    }
    return have() >= want;
  }
  function* tableHere() {
    where = `tableHere `;
    // the crafting table on the floor beside it (the way it looks first), opened
    const c = cell(), yw = io.get('yaw');
    const dx0 = Math.round(Math.sin(yw * Math.PI / 180)), dz0 = dx0 === 0 ? Math.sign(Math.cos(yw * Math.PI / 180)) || 1 : 0;
    let last = null;
    for (const [dx, dz] of [[dx0, dz0], [-dz0, dx0], [dz0, -dx0], [-dx0, -dz0]]) {
      const tx = c.x + dx, tz = c.z + dz;
      if ([blk(tx, c.y - 1, tz), blk(tx, c.y, tz), blk(tx, c.y + 1, tz)].some(b => b === 35 || b === 7)) continue;
      if (blk(tx, c.y, tz) !== 17) {
        if (!(yield* mine(tx, c.y, tz)) || !(yield* mine(tx, c.y + 1, tz))) continue;
        if (!solid(blk(tx, c.y - 1, tz))) { const b = blockItem(); if (!b || !(yield* place(b, tx, c.y - 1, tz))) continue; }
        if (!(yield* place(17, tx, c.y, tz))) continue;
      }
      last = { x: tx, y: c.y, z: tz };
      yield* openAt(tx, c.y, tz);
      if (io.get('uiMode') !== 0) return last;
    }
    return last || { x: c.x, y: c.y, z: c.z };
  }
  function* openAt(x, y, z) {
    where = `openAt ${x} ${y} ${z}`;
    for (let k = 0; k < 6 && io.get('uiMode') === 0; k++) {
      face(x + 0.5, y + 0.5, z + 0.5); yield* ticks(25);
      yield* press(K.F); yield* frames(2);
    }
    if (io.get('uiMode') === 0) log(`could not open ${blk(x, y, z)} at ${x},${y},${z}`);
  }
  function* takeTable(t) {
    where = `takeTable ${t}`; yield* closeUI(); yield* mine(t.x, t.y, t.z); yield* gather(3); }

  function* run() {
    where = `run `;
    while (io.get('gState') !== 2) yield;
    yield* ticks(30);
    stage('1. 나무');
    yield* getAll([13, 23, 25], 5, () => count(13) + count(23) + count(25), 40, SEA, WY - 2);
    yield* hunt(8, 4500);
    stage('2. 판자 · 막대기 · 작업대');
    yield* openInv();
    for (const id of [13, 23, 25]) if (count(id)) yield* craft([[G2(0, 0), id]], true, true);
    for (let n = 0; n < 3; n++) yield* craft([[G2(0, 0), 5], [G2(1, 0), 5]], true);
    dbg('after sticks: ' + invText());
    yield* craft([[G2(0, 0), 5], [G2(0, 1), 5], [G2(1, 0), 5], [G2(1, 1), 5]]);
    dbg('after table: ' + invText() + ' ui ' + io.get('uiMode') + ' out ' + io.get('craftOut'));
    yield* closeUI();
    let t = yield* tableHere();
    yield* craft([[G3(0, 0), 5], [G3(0, 1), 5], [G3(0, 2), 5], [G3(1, 1), 100], [G3(2, 1), 100]]);
    yield* takeTable(t);
    stage('3. 돌');
    const surf = cell();
    let k = 0; while (cell().y > surf.y - 4 && k++ < 10) { if (!(yield* digDown())) yield* stepTo(cell().x + 1, cell().z); }
    yield* getAll([1, 4], 11, () => count(4), 12, 2, WY - 2);
    t = yield* tableHere();
    yield* craft([[G3(0, 0), 4], [G3(0, 1), 4], [G3(0, 2), 4], [G3(1, 1), 100], [G3(2, 1), 100]]);
    yield* takeTable(t);
    stage('4. 철');
    yield* getAll([11], 4, () => count(11), 40, 2, 40);
    stage('5. 화로');
    yield* getAll([1, 4], 9, () => count(4), 10);
    t = yield* tableHere();
    yield* craft([[0, 4], [1, 4], [2, 4], [3, 4], [5, 4], [6, 4], [7, 4], [8, 4]]);
    yield* closeUI();
    const f = yield* tableHere2(18);
    yield* click(slotOf(11)); yield* click(51);
    yield* click(slotOf(5)); yield* click(52, true); yield* click(52, true); yield* click(52, true); yield* click(slotOf(5) || emptySlot());
    k = 0; while (io.list('FON', io.get('curFur')) < 4 && k++ < 3000) yield;
    yield* click(53); yield* click(emptySlot());
    yield* closeUI();
    yield* openAt(t.x, t.y, t.z);
    yield* craft([[G3(0, 0), 102], [G3(0, 1), 102], [G3(0, 2), 102], [G3(1, 1), 100], [G3(2, 1), 100]]);
    yield* takeTable(t); yield* mine(f.x, f.y, f.z);
    stage('6. 다이아몬드 · 청금석 · 부싯돌');
    yield* getAll([16], 6, () => count(104), 40, 2, 14);
    yield* getAll([40], 1, () => count(119), 40, 2, 20);
    yield* getAll([9], 1, () => count(118), 40, 2, WY - 2);
    t = yield* tableHere();
    yield* craft([[G3(0, 0), 104], [G3(0, 1), 104], [G3(0, 2), 104], [G3(1, 1), 100], [G3(2, 1), 100]]);
    yield* craft([[G3(0, 1), 104], [G3(1, 1), 104], [G3(2, 1), 100]]);
    yield* craft([[G3(0, 0), 102], [G3(1, 1), 118]]);
    yield* takeTable(t);
    stage('7. 흑요석');
    yield* select(133);
    // (only crust with stone under it: what drops over lava is lost)
    obsidian = true;
    // a broken frame on the surface first, then the crust over lava
    yield* getAll([34], 10, () => count(34), 64, SEA, WY - 2);
    if (count(34) < 10) yield* getAll([34], 10, () => count(34), 48, 4, 6);
    obsidian = false;
    stage('8. 불꽃 장막');
    hardOK = true; yield* buildGate(); hardOK = false;
    stage('9. 잿빛 심연');
    k = 0; while (io.get('dim') !== 1 && k++ < 2000) yield;
    while (io.get('gState') !== 2) yield;
    yield* ticks(30);
    // out of the veil
    const v = cell();
    for (const [a, b] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) { if (!solid(blk(v.x + a, v.y, v.z + b)) && blk(v.x + a, v.y, v.z + b) !== 47 && solid(blk(v.x + a, v.y - 1, v.z + b))) { yield* walkTo(v.x + a, v.z + b); break; } }
    if (blk(cell().x, cell().y, cell().z) === 47) yield* stepTo(v.x, v.z - 2);
    yield* select(133);
    yield* getAll([51], 7, () => count(123), 40, 8, WY - 4);
    yield* getAll([48], 24, () => count(48), 8, 8, WY - 4);
    stage('10. 공허의 열쇠');
    t = yield* tableHere();
    yield* craft([[G3(0, 0), 123], [G3(0, 1), 123], [G3(0, 2), 123], [G3(1, 0), 123], [G3(1, 1), 104], [G3(1, 2), 123], [G3(2, 0), 123], [G3(2, 1), 119], [G3(2, 2), 123]]);
    yield* takeTable(t);
    yield* select(124);
    // the 3 x 3 floor under its feet made whole, then the key on the middle of it (straight down)
    {
      const c0 = cell(), cand = [];
      const okAt = (x, y, z) => { if (solid(blk(x, y, z)) || solid(blk(x, y + 1, z))) return false; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const b = blk(x + dx, y - 1, z + dz); if (!solid(b) || b === 35 || b === 7 || b === 47) return false; } return true; };
      for (let dx = -10; dx <= 10; dx++) for (let dz = -10; dz <= 10; dz++) for (const dy of [0, -1, 1, -2, 2, -3, 3]) if (okAt(c0.x + dx, c0.y + dy, c0.z + dz)) cand.push({ x: c0.x + dx, y: c0.y + dy, z: c0.z + dz, d: Math.abs(dx) + Math.abs(dz) + 2 * Math.abs(dy) });
      cand.sort((a, b) => a.d - b.d);
      dbg(`void key spots ${cand.length}`);
      if (cand.length) yield* goTo(cand[0].x, cand[0].y, cand[0].z, 0);
      // none: down into the rock, where the floor all round is whole
      else { yield* digDown(); yield* digDown(); }
    }
    for (let tries = 0; tries < 6 && io.get('dim') === 1 && io.get('gState') !== 3; tries++) {
      const c = cell();
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!solid(blk(c.x + dx, c.y - 1, c.z + dz))) { const b = blockItem(); if (b) yield* place(b, c.x + dx, c.y - 1, c.z + dz); }
      yield* select(124); yield* walkTo(c.x, c.z, 0.15);
      io.set('pitch', -89.5); yield* ticks(25);
      yield* press(K.F); yield* ticks(90);
      if (io.get('gState') === 3 || io.get('dim') === 2) break;
      { const px = io.get('pickX'), py = io.get('pickY'), pz = io.get('pickZ'); const f = []; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) f.push(blk(px + dx, py, pz + dz));
        dbg(`void key: ${io.get('msgText')} pick ${io.get('pickOn')} ${px},${py},${pz} me ${JSON.stringify(cell())} floor ${f}`); }
      if (!(yield* digDown())) { yield* stepTo(c.x + 2, c.z); yield* stepTo(c.x + 3, c.z); }
    }
    stage('11. 공허의 섬');
    k = 0; while (io.get('dim') !== 2 && k++ < 2000) yield;
    while (io.get('gState') !== 2) yield;
    yield* ticks(60);
    yield* crystals();
    stage('12. 공허의 수호자');
    yield* bossFight();
    stage('13. 집으로');
    yield* goHome();
    stage('클리어!');
    log('CLEAR');
    io.set('botDone', 1);
    while (true) yield;
  }
  // a furnace (or another block) put down in front like the table, and opened
  function* tableHere2(id) {
    where = `tableHere2 ${id}`;
    const c = cell(), yw = io.get('yaw');
    const dx = Math.round(Math.sin(yw * Math.PI / 180)), dz = dx === 0 ? Math.sign(Math.cos(yw * Math.PI / 180)) || 1 : 0;
    // beside the table: the other way
    const tx = c.x - dz, tz = c.z + dx;
    yield* mine(tx, c.y, tz); yield* mine(tx, c.y + 1, tz);
    if (!solid(blk(tx, c.y - 1, tz))) { const b = blockItem(); if (b) yield* place(b, tx, c.y - 1, tz); }
    yield* place(id, tx, c.y, tz);
    yield* openAt(tx, c.y, tz);
    return { x: tx, y: c.y, z: tz };
  }
  // the obsidian frame (4 x 5 along x) in a room cut in front, then lit
  // where the frame goes: the floor under the room already solid ground, nothing liquid about
  function gateSpotOK(x0, y0, z0) {
    for (let x = x0 - 1; x <= x0 + 2; x++) for (let z = z0 - 2; z <= z0; z++) { const b = blk(x, y0 - 1, z); if (!solid(b) || b === 8 || b === 9 || b === 35 || b === 7) return false; }
    for (let x = x0 - 2; x <= x0 + 3; x++) for (let z = z0 - 3; z <= z0 + 1; z++) for (let y = y0 - 1; y <= y0 + 6; y++) { const b = blk(x, y, z); if (b === 7 || b === 35 || b === -1) return false; }
    return true;
  }
  function* buildGate() {
    where = `buildGate `;
    {
      const c0 = cell(); const cand = [];
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) for (const dy of [0, -1, 1]) if (gateSpotOK(c0.x + dx, c0.y + dy, c0.z + dz + 2)) cand.push({ x: c0.x + dx, y: c0.y + dy, z: c0.z + dz, d: Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2 });
      cand.sort((a, b) => a.d - b.d);
      dbg(`gate spot ${JSON.stringify(cand[0])} from ${JSON.stringify(c0)}`);
      dbg(`void key spots ${cand.length}`);
      if (cand.length) yield* goTo(cand[0].x, cand[0].y, cand[0].z, 0);
      // none: down into the rock, where the floor all round is whole
      else { yield* digDown(); yield* digDown(); }
    }
    const c = cell();
    // (it stands at (x0, z0 - 2) the whole time: in the room)
    const x0 = c.x, y0 = c.y, z0 = c.z + 2;
    // the room: x0-1 .. x0+2, y0 .. y0+4, z0-2 .. z0, and a floor under it
    for (let z = z0 - 2; z <= z0; z++) for (let x = x0 - 1; x <= x0 + 2; x++) for (let y = y0 + 4; y >= y0; y--) yield* mine(x, y, z);
    for (let z = z0 - 2; z <= z0; z++) for (let x = x0 - 1; x <= x0 + 2; x++) if (!solid(blk(x, y0 - 1, z))) yield* place(blockItem(), x, y0 - 1, z);
    yield* walkTo(x0, z0 - 2, 0.2);
    const S = blockItem();
    const O = 34;
    // (a frame cell holding anything else is cleared first)
    const placeO = function* (x, y, z) { if (blk(x, y, z) !== O) { yield* mine(x, y, z, false); yield* place(O, x, y, z); } if (blk(x, y, z) !== O) dbg(`gate: no obsidian at ${x},${y},${z} (${blk(x, y, z)}) nb ${[[0,-1,0],[-1,0,0],[1,0,0],[0,0,-1],[0,0,1],[0,1,0]].map(([a,b,c])=>blk(x+a,y+b,z+c))} pick ${io.get("pickOn")} ${io.get("pickX")},${io.get("pickY")},${io.get("pickZ")} f ${io.get("pickF")}`) };
    // a row at a time, standing a block higher for each (a top face is only seen from above)
    // (whatever is under the bottom row filled first)
    const support = function* (x, y, z, d) { if (d > 4 || solid(blk(x, y - 1, z))) return; yield* support(x, y - 1, z, d + 1); yield* place(S, x, y - 1, z); };
    for (let x = x0 - 1; x <= x0 + 2; x++) yield* support(x, y0, z0, 0);
    yield* place(S, x0 - 1, y0, z0); yield* place(S, x0 + 2, y0, z0);
    for (const x of [x0 - 1, x0 + 2]) if (!solid(blk(x, y0, z0))) dbg(`gate: corner ${x},${y0},${z0} not placed: S ${S} n ${count(S)} under ${blk(x, y0 - 1, z0)} under2 ${blk(x, y0 - 2, z0)} me ${JSON.stringify(P())} pick ${io.get('pickX')},${io.get('pickY')},${io.get('pickZ')} f ${io.get('pickF')}`);
    yield* placeO(x0, y0, z0); yield* placeO(x0 + 1, y0, z0);
    yield* placeO(x0 - 1, y0 + 1, z0); yield* placeO(x0 + 2, y0 + 1, z0);
    for (let y = y0 + 2; y <= y0 + 4; y++) {
      for (let n = 0; n < 3 && cell().y < y - 1; n++) yield* pillarUp();
      if (y <= y0 + 3) { yield* placeO(x0 - 1, y, z0); yield* placeO(x0 + 2, y, z0); }
      else { yield* place(S, x0 - 1, y, z0); yield* place(S, x0 + 2, y, z0); yield* placeO(x0, y, z0); yield* placeO(x0 + 1, y, z0); }
    }
    // back down
    for (let n = 0; n < 5 && cell().y > y0; n++) { const c1 = cell(); yield* mine(c1.x, c1.y - 1, c1.z, false); yield* ticks(25); }
    yield* select(122);
    face(x0 + 0.5, y0 + 0.99, z0 + 0.5); yield* ticks(30);
    for (let k = 0; k < 4 && blk(x0, y0 + 1, z0) !== 47; k++) { face(x0 + 0.5, y0 + 0.99, z0 + 0.5); yield* press(K.F); yield* ticks(25); }
    log(`gate: ${blk(x0, y0 + 1, z0)} msg ${io.get('msgText')} pick ${io.get('pickOn')} ${io.get('pickX')},${io.get('pickY')},${io.get('pickZ')} f ${io.get('pickF')} held ${io.list('INVI', io.get('hotSel'))} frame ${[[x0,y0],[x0+1,y0],[x0-1,y0+1],[x0-1,y0+2],[x0-1,y0+3],[x0+2,y0+1],[x0+2,y0+2],[x0+2,y0+3],[x0,y0+4],[x0+1,y0+4]].map(([a,b])=>blk(a,b,z0)).join('')} in ${[[x0,y0+1],[x0+1,y0+1],[x0,y0+2],[x0+1,y0+2],[x0,y0+3],[x0+1,y0+3]].map(([a,b])=>blk(a,b,z0)).join(',')}`);
    yield* walkTo(x0, z0 - 1); yield* walkTo(x0, z0);
    yield* ticks(200);
  }
  // the warding crystals: up a column 4 blocks out from each, break it from there, down again
  function pillar(k) {
    const a = (k * 45 + 10) * Math.PI / 180;
    return { x: Math.round(Math.cos(a) * 34), z: Math.round(Math.sin(a) * 34), h: 52 + mod(k * 5, 9), r: 2 + mod(k, 2) };
  }
  function* crystals() {
    where = `crystals `;
    // the nearest first, round the ring
    const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => { const p = P(), A = pillar(a), B = pillar(b); return Math.hypot(A.x - p.x, A.z - p.z) - Math.hypot(B.x - p.x, B.z - p.z); });
    const start = order[0], seq = []; for (let i = 0; i < 8; i++) seq.push((start + i) % 8);
    for (const k of [...seq, ...seq]) {
      const pl = pillar(k);
      if (blk(pl.x, pl.h + 1, pl.z) !== 57) continue;
      // a column 4 out (the inside of the ring first: the warden circles outside) that it can get to
      const ux = pl.x / Math.hypot(pl.x, pl.z), uz = pl.z / Math.hypot(pl.x, pl.z);
      const cols = [];
      for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) {
        const d2 = a * a + b * b; if (d2 < 16 || d2 > 18) continue;
        cols.push({ x: pl.x + a, z: pl.z + b, score: (a * ux + b * uz) + d2 * 0.01 });
      }
      cols.sort((p, q) => p.score - q.score);
      let gy = 45, there = false;
      for (const col of cols.slice(0, 4)) {
        gy = 45; while (gy > 20 && !solid(blk(col.x, gy - 1, col.z))) gy--;
        if (gy <= 20) continue;
        yield* goTo(col.x, gy, col.z, 0);
        const c1 = cell(); if (c1.x === col.x && c1.z === col.z && c1.y === gy) { there = true; break; }
        dbg(`crystal ${k}: could not get to ${col.x},${gy},${col.z} (at ${c1.x},${c1.y},${c1.z})`);
      }
      if (!there) { log(`crystal ${k}: no way to it`); continue; }
      let n = 0, nf = 0; while (cell().y < pl.h && n++ < 40 && nf < 3) { if (yield* pillarUp()) nf = 0; else { nf++; yield* ticks(20); } }
      io.key(K.SHIFT, true);
      for (let j = 0; j < 40 && blk(pl.x, pl.h + 1, pl.z) === 57; j++) {
        face(pl.x + 0.5, pl.h + 1.5, pl.z + 0.5); yield* frames(1);
        io.mouseDown(true); yield* ticks(4); io.mouseDown(false); yield* ticks(4);
      }
      io.key(K.SHIFT, false);
      log(`crystal ${k} ${blk(pl.x, pl.h + 1, pl.z) === 57 ? 'still there' : 'broken'}, hp ${io.get('hp')}`);
      n = 0; while (cell().y > gy && n++ < 30) { const c = cell(); io.key(K.SHIFT, true); yield* walkTo(c.x, c.z, 0.15); io.key(K.SHIFT, false); if (!(yield* mine(c.x, c.y - 1, c.z))) break; yield* ticks(9); }
      yield* gather(3);
    }
  }
  function* bossFight() {
    where = `bossFight `;
    yield* select(145);
    // (4.5 from where it perches: out of its touch, its big body still in reach)
    let gy = 45; while (gy > 20 && !solid(blk(0, gy - 1, 3))) gy--;
    yield* goTo(0, gy, 3, 0);
    let k = 0;
    while (io.get('bossDead') === 0 && k++ < 60 * 300) {
      if (k % 60 === 0) { yield* eatIfHungry(); if (io.list('INVI', io.get('hotSel')) !== 145) yield* select(145); }
      const e = io.get('bossE');
      if (k % 120 === 0 && e > 0) dbg(`boss hp ${io.list('EHP', e)} ph ${io.get('bossPh')} at ${io.list('EX', e).toFixed(1)},${io.list('EY', e).toFixed(1)},${io.list('EZ', e).toFixed(1)}; me hp ${io.get('hp')} at ${JSON.stringify(P())}`);
      if (e > 0 && io.list('ET', e) === 10) {
        const bx = io.list('EX', e), by = io.list('EY', e), bz = io.list('EZ', e);
        const p = P(), d = Math.hypot(bx - p.x, by + 1.5 - p.y - 1.6, bz - p.z);
        if (d < 6.2) {
          face(bx, by + 1.5, bz); yield* frames(1);
          if (io.get('bossPh') === 2 && k % 20 === 0) dbg(`perch: d ${d.toFixed(2)} pick ${io.get('mobPick')} boss ${bx.toFixed(1)},${by.toFixed(1)},${bz.toFixed(1)} me ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`);
          if (io.get('mobPick') === e) io.click();
          yield* ticks(6);
        } else {
          // wait under the middle
          if (Math.hypot(p.x - 0.5, p.z - 3.5) > 0.6) yield* walkTo(0, 3, 0.15);
          face(bx, by + 1.5, bz); yield;
        }
      } else yield;
    }
    log(`warden down, hp ${io.get('hp')}`);
    yield* ticks(60);
  }
  function* goHome() {
    where = `goHome `;
    let gy = 45; while (gy > 20 && blk(0, gy - 1, 0) !== 56) gy--;
    yield* goTo(0, gy, 1, 0);
    yield* walkTo(0, 0);
    let k = 0; while (io.get('dim') !== 0 && k++ < 2000) yield;
    while (io.get('gState') !== 2) yield;
    yield* ticks(120);
  }
  const gen = run();
  return {
    step() {
      T++;
      if (T % ((typeof process !== "undefined" && process.env.HB) ? +process.env.HB : 300) === 0) dbg(`@ ${where}`);
      // head under water: swim up (over whatever it is doing)
      const hb = blk(fl(io.get('px')), fl(io.get('py') + io.get('eyeH')), fl(io.get('pz')));
      if (hb === 7) { io.key(K.SPACE, true); swim = true; } else if (swim) { io.key(K.SPACE, false); swim = false; }
      // running out of air: nothing but up and forward until it breathes
      if (io.get('air') < 140 || (surfacing && hb === 7)) {
        if (!surfacing) { surfacing = true; for (const k of [K.S, K.SHIFT]) io.key(k, false); io.mouseDown(false); io.set('pitch', 0); }
        io.key(K.SPACE, true); io.key(K.W, true); return true;
      }
      if (surfacing) { surfacing = false; io.key(K.W, false); io.key(K.SPACE, false); }
      const r = gen.next(); return !r.done;
    },
    blk, nearest,
  };
}
if (typeof module !== 'undefined') module.exports = { makeBot };
