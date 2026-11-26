// (v3.5, 11-26) The genre's redstone, written out plainly from how the Java edition (1.16.5) does it, for a world
// read from a save (mcworld.mjs): wire, torches, repeaters, comparators, lamps, redstone blocks, pistons, levers
// and buttons - the order every cell is told in, the ticks and their priorities, the pistons' block events and
// their moving blocks. It is what the game's own spark power (src/power.js) is checked against, tick by tick
// (test/calcref.mjs): a machine made in the genre works here as it does there, so where the two part, one of
// them is wrong.
//   const w = new RefWorld(); w.load(dir, ymin); w.press(x, y, z); w.lever(x, y, z); w.tick(); w.get(x, y, z)
import { eachBlock, eachChunk } from '../mcworld.mjs';

const DIRS = ['down', 'up', 'north', 'south', 'west', 'east'];          // Direction.values()
const VEC = { down: [0, -1, 0], up: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0] };
const OPP = { down: 'up', up: 'down', north: 'south', south: 'north', west: 'east', east: 'west' };
const HORIZ = ['north', 'east', 'south', 'west'];
const CW = { north: 'east', east: 'south', south: 'west', west: 'north' }, CCW = { north: 'west', west: 'south', south: 'east', east: 'north' };
const NB6 = ['west', 'east', 'down', 'up', 'north', 'south'];            // updateNeighborsAlways
const PRIO = { EXTREMELY_HIGH: -3, VERY_HIGH: -2, HIGH: -1, NORMAL: 0 };
const AIR = Object.freeze({ n: 'air' });
const states = new Map();
// a block state: one object for each (name, properties)
export function S(n, p = {}) {
  const k = n + '|' + Object.keys(p).sort().map((q) => q + '=' + p[q]).join(',');
  let s = states.get(k);
  if (!s) { s = Object.freeze({ n, ...p }); states.set(k, s); }
  return s;
}
const withP = (s, p) => { const o = { ...s, ...p }; const n = o.n; delete o.n; return S(n, o); };
const SOLID = /^(iron_block|.*concrete|sandstone|stone|bedrock|redstone_lamp|smooth_stone|.*_wool|quartz_block|.*terracotta|cobblestone|dirt|.*planks|gold_block|diamond_block|emerald_block|lapis_block|coal_block|bricks|stone_bricks|obsidian|netherrack)$/;
const isSolid = (s) => SOLID.test(s.n) || (/_slab$/.test(s.n) && s.type === 'double');
// (a top a wire, repeater or comparator may stand on)
const topSolid = (s) => isSolid(s) || s.n === 'glass' || /glass$/.test(s.n) || s.n === 'redstone_block' || (/_slab$/.test(s.n) && s.type !== 'bottom') || ((s.n === 'piston' || s.n === 'sticky_piston') && (s.extended !== 'true' || s.facing !== 'up')) || s.n === 'hopper';
const emits = (s) => /^(redstone_wire|redstone_torch|redstone_wall_torch|repeater|comparator|redstone_block|lever|.*_button|observer|.*pressure_plate|target|daylight_detector|tripwire_hook|trapped_chest|detector_rail)$/.test(s.n);
const isGate = (s) => s.n === 'repeater' || s.n === 'comparator';
const isPiston = (s) => s.n === 'piston' || s.n === 'sticky_piston';
const pistonBehavior = (s) => (/^(redstone_wire|redstone_torch|redstone_wall_torch|repeater|comparator|lever|.*_button|.*pressure_plate|tripwire.*)$/.test(s.n) ? 'destroy' : /^(obsidian|bedrock|moving_piston|piston_head)$/.test(s.n) ? 'block' : 'normal');

export class RefWorld {
  constructor({ wireOld = false } = {}) {
    this.b = new Map(); this.time = 0; this.ticks = []; this.sched = new Set(); this.cur = []; this.curSet = new Set(); this.tickId = 0;
    this.events = []; this.bes = []; this.cmp = new Map(); this.wiresGivePower = true; this.inBlockTick = false; this.burn = [];
    this.wireOld = wireOld; this.log = null; this.changed = null; this.eventSet = new Set(); this.pendingBes = []; this.tickingBes = false;
  }
  key(x, y, z) { return x + ',' + y + ',' + z; }
  get(x, y, z) { return this.b.get(x + ',' + y + ',' + z) || AIR; }
  put(x, y, z, s) { if (s === AIR) this.b.delete(x + ',' + y + ',' + z); else this.b.set(x + ',' + y + ',' + z, s); if (this.changed) this.changed.add(x + ',' + y + ',' + z); }
  load(dir, ymin = 0) {
    eachBlock(dir, (x, y, z, n, p) => {
      if (y < ymin) return;
      let s;
      if (n === 'redstone_wire') s = S(n, { power: String(p.power) });
      else if (n === 'repeater') s = S(n, { facing: p.facing, delay: String(p.delay), powered: p.powered });
      else if (n === 'comparator') s = S(n, { facing: p.facing, mode: p.mode, powered: p.powered });
      else if (/_wall_sign$|_sign$/.test(n)) s = S('sign');
      else s = S(n, p);
      this.b.set(x + ',' + y + ',' + z, s);
    });
    eachChunk(dir, (c) => { for (const t of c.blockEntities) if (t.id === 'minecraft:comparator' && t.y >= ymin) this.cmp.set(t.x + ',' + t.y + ',' + t.z, t.OutputSignal || 0); });
  }
  // ---------------------------------------------------------------- setting a block
  // flags: 1 tell the neighbours, 64 moved by a piston (2, 4, 16: nothing here - shapes are worked out when asked)
  set(x, y, z, s, flags) {
    const old = this.get(x, y, z);
    if (old === s) return false;
    this.put(x, y, z, s);
    const moved = (flags & 64) !== 0;
    this.onStateReplaced(old, x, y, z, s, moved);
    if (this.get(x, y, z).n === s.n) this.onBlockAdded(s, x, y, z, old, moved);
    if ((flags & 1) && this.get(x, y, z) === s) this.updateNeighborsAlways(x, y, z);
    return true;
  }
  onStateReplaced(old, x, y, z, neu, moved) {
    if (old.n === 'redstone_torch' || old.n === 'redstone_wall_torch') { if (!moved) for (const d of DIRS) { const v = VEC[d]; this.updateNeighborsAlways(x + v[0], y + v[1], z + v[2]); } }
    else if (isGate(old)) { if (moved || old.n === neu.n) return; this.updateTarget(x, y, z, old); }
    else if (old.n === 'redstone_wire') { if (moved || old.n === neu.n) return; for (const d of DIRS) { const v = VEC[d]; this.updateNeighborsAlways(x + v[0], y + v[1], z + v[2]); } this.wireUpdateOffsetNeighbors(x, y, z); }
    else if (old.n === 'lever' || /_button$/.test(old.n)) { if (moved || old.n === neu.n) return; if (old.powered === 'true') this.hungUpdate(old, x, y, z); }
    else if (isPiston(old)) { /* its head goes with it: not needed here */ }
    if (old.n === 'comparator' && neu.n !== 'comparator') this.cmp.delete(this.key(x, y, z));
  }
  onBlockAdded(s, x, y, z, old, moved) {
    if (s.n === 'redstone_torch' || s.n === 'redstone_wall_torch') { for (const d of DIRS) { const v = VEC[d]; this.updateNeighborsAlways(x + v[0], y + v[1], z + v[2]); } }
    else if (isGate(s)) this.updateTarget(x, y, z, s);
    else if (s.n === 'redstone_wire') { if (old.n === s.n) return; this.wireUpdate(x, y, z, s); for (const d of ['down', 'up']) { const v = VEC[d]; this.updateNeighborsAlways(x + v[0], y + v[1], z + v[2]); } this.wireUpdateOffsetNeighbors(x, y, z); }
    else if (isPiston(s)) { if (old.n !== s.n) this.pistonTryMove(x, y, z, s); }
  }
  wireUpdateOffsetNeighbors(x, y, z) {
    const upd = (a, b, c) => { if (this.get(a, b, c).n !== 'redstone_wire') return; this.updateNeighborsAlways(a, b, c); for (const d of DIRS) { const v = VEC[d]; this.updateNeighborsAlways(a + v[0], b + v[1], c + v[2]); } };
    for (const d of HORIZ) { const v = VEC[d]; upd(x + v[0], y, z + v[2]); }
    for (const d of HORIZ) { const v = VEC[d]; if (isSolid(this.get(x + v[0], y, z + v[2]))) upd(x + v[0], y + 1, z + v[2]); else upd(x + v[0], y - 1, z + v[2]); }
  }
  updateNeighborsAlways(x, y, z) { for (const d of NB6) { const v = VEC[d]; this.neighborUpdate(x + v[0], y + v[1], z + v[2]); } }
  updateNeighborsExcept(x, y, z, except) { for (const d of NB6) { if (d === except) continue; const v = VEC[d]; this.neighborUpdate(x + v[0], y + v[1], z + v[2]); } }
  neighborUpdate(x, y, z) {
    const s = this.get(x, y, z), n = s.n;
    if (n === 'air') return;
    if (n === 'redstone_wire') { if (topSolid(this.get(x, y - 1, z))) this.wireUpdate(x, y, z, s); else this.set(x, y, z, AIR, 3); }
    else if (n === 'repeater') this.repUpdatePowered(x, y, z, s);
    else if (n === 'comparator') this.cmpUpdatePowered(x, y, z, s);
    else if (n === 'redstone_torch' || n === 'redstone_wall_torch') { if ((s.lit === 'true') === this.torchShouldUnpower(x, y, z, s) && !this.isTicking(x, y, z, n)) this.schedule(x, y, z, n, 2, PRIO.NORMAL); }
    else if (n === 'redstone_lamp') { const lit = s.lit === 'true'; if (lit !== this.isReceivingPower(x, y, z)) { if (lit) this.schedule(x, y, z, n, 4, PRIO.NORMAL); else this.set(x, y, z, withP(s, { lit: 'true' }), 2); } }
    else if (isPiston(s)) this.pistonTryMove(x, y, z, s);
  }
  // ---------------------------------------------------------------- power
  weak(s, x, y, z, dir) {       // dir: from the one asking toward (x, y, z)
    const n = s.n;
    if (n === 'redstone_block') return 15;
    if (n === 'redstone_torch') return s.lit === 'true' && dir !== 'up' ? 15 : 0;
    if (n === 'redstone_wall_torch') return s.lit === 'true' && s.facing !== dir ? 15 : 0;
    if (n === 'repeater') return s.powered === 'true' && s.facing === dir ? 15 : 0;
    if (n === 'comparator') return s.powered === 'true' && s.facing === dir ? (this.cmp.get(this.key(x, y, z)) || 0) : 0;
    if (n === 'lever' || /_button$/.test(n)) return s.powered === 'true' ? 15 : 0;
    if (n === 'redstone_wire') {
      if (!this.wiresGivePower || dir === 'down') return 0;
      const i = +s.power;
      if (i === 0) return 0;
      if (dir === 'up') return i;
      return this.wirePointsTo(x, y, z, OPP[dir]) ? i : 0;
    }
    return 0;
  }
  strong(s, x, y, z, dir) {
    const n = s.n;
    if (n === 'redstone_torch' || n === 'redstone_wall_torch') return dir === 'down' ? this.weak(s, x, y, z, dir) : 0;
    if (isGate(s)) return this.weak(s, x, y, z, dir);
    if (n === 'lever' || /_button$/.test(n)) return s.powered === 'true' && this.hungDir(s) === dir ? 15 : 0;
    if (n === 'redstone_wire') return this.wiresGivePower ? this.weak(s, x, y, z, dir) : 0;
    return 0;
  }
  hungDir(s) { return s.face === 'ceiling' ? 'down' : s.face === 'floor' ? 'up' : s.facing; }
  strongAt(x, y, z, dir) { return this.strong(this.get(x, y, z), x, y, z, dir); }
  receivedStrong(x, y, z) {
    let i = 0;
    for (const d of DIRS) { const v = VEC[d]; i = Math.max(i, this.strongAt(x + v[0], y + v[1], z + v[2], d)); if (i >= 15) return i; }
    return i;
  }
  emitted(x, y, z, dir) {
    const s = this.get(x, y, z), i = this.weak(s, x, y, z, dir);
    return isSolid(s) ? Math.max(i, this.receivedStrong(x, y, z)) : i;
  }
  isEmitting(x, y, z, dir) { return this.emitted(x, y, z, dir) > 0; }
  receivedPower(x, y, z) {
    let i = 0;
    for (const d of DIRS) { const v = VEC[d]; const j = this.emitted(x + v[0], y + v[1], z + v[2], d); if (j >= 15) return 15; if (j > i) i = j; }
    return i;
  }
  isReceivingPower(x, y, z) { for (const d of DIRS) { const v = VEC[d]; if (this.emitted(x + v[0], y + v[1], z + v[2], d) > 0) return true; } return false; }
  // ---------------------------------------------------------------- wire
  connectsTo(s, dir) {
    if (s.n === 'redstone_wire') return true;
    if (s.n === 'repeater') return dir !== null && (s.facing === dir || OPP[s.facing] === dir);
    if (s.n === 'observer') return dir === s.facing;
    return emits(s) && dir !== null;
  }
  wireConn(x, y, z, d) {          // is the wire joined the way d (as it would be drawn)
    const v = VEC[d], nx = x + v[0], nz = z + v[2], nb = this.get(nx, y, nz);
    if (!isSolid(this.get(x, y + 1, z))) { if (topSolid(nb) && this.connectsTo(this.get(nx, y + 1, nz), null)) return true; }
    return this.connectsTo(nb, d) || (!isSolid(nb) && this.connectsTo(this.get(nx, y - 1, nz), null));
  }
  wirePointsTo(x, y, z, d) {
    const c = {}; for (const h of HORIZ) c[h] = this.wireConn(x, y, z, h);
    if (this.wireOld) {
      // (before 1.16: a lone wire all ways; else the way it is joined, and straight on when joined one way only)
      const any = HORIZ.some((h) => c[h]);
      if (!any) return true;
      return c[OPP[d]] && !c[CW[d]] && !c[CCW[d]];
    }
    const ns = c.north || c.south, ew = c.east || c.west;
    if (!ns) { c.west = true; c.east = true; }
    if (!ew) { c.north = true; c.south = true; }
    return c[d];
  }
  wirePower(x, y, z) {
    this.wiresGivePower = false;
    const i = this.receivedPower(x, y, z);
    this.wiresGivePower = true;
    let j = 0;
    if (i < 15) {
      const up = isSolid(this.get(x, y + 1, z));
      for (const d of HORIZ) {
        const v = VEC[d], nx = x + v[0], nz = z + v[2], nb = this.get(nx, y, nz);
        const pw = (s) => (s.n === 'redstone_wire' ? +s.power : 0);
        j = Math.max(j, pw(nb));
        if (isSolid(nb) && !up) j = Math.max(j, pw(this.get(nx, y + 1, nz)));
        else if (!isSolid(nb)) j = Math.max(j, pw(this.get(nx, y - 1, nz)));
      }
    }
    return Math.max(i, j - 1);
  }
  static bucket(x, y, z) { const h = ((y + z * 31) * 31 + x) | 0; return (h ^ (h >>> 16)) & 15; }
  wireUpdate(x, y, z, s) {
    const i = this.wirePower(x, y, z);
    if (+s.power !== i) {
      if (this.get(x, y, z) === s) this.set(x, y, z, withP(s, { power: String(i) }), 2);
      const set = [[x, y, z]]; for (const d of DIRS) { const v = VEC[d]; set.push([x + v[0], y + v[1], z + v[2]]); }
      const ord = set.map((p, k) => [RefWorld.bucket(p[0], p[1], p[2]), k, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const [, , p] of ord) this.updateNeighborsAlways(p[0], p[1], p[2]);
    }
  }
  // ---------------------------------------------------------------- torch
  torchShouldUnpower(x, y, z, s) {
    if (s.n === 'redstone_torch') return this.isEmitting(x, y - 1, z, 'down');
    const d = OPP[s.facing], v = VEC[d];
    return this.isEmitting(x + v[0], y + v[1], z + v[2], d);
  }
  burnedOut(x, y, z, add) {
    if (add) this.burn.push([x, y, z, this.time]);
    let i = 0;
    for (const e of this.burn) if (e[0] === x && e[1] === y && e[2] === z && ++i >= 8) return true;
    return false;
  }
  // ---------------------------------------------------------------- repeaters and comparators
  gatePower(x, y, z, s) {
    const v = VEC[s.facing], bx = x + v[0], bz = z + v[2];
    const i = this.emitted(bx, y, bz, s.facing);
    if (i >= 15) return i;
    const bs = this.get(bx, y, bz);
    return Math.max(i, bs.n === 'redstone_wire' ? +bs.power : 0);
  }
  gateSides(x, y, z, s, gatesOnly) {
    const one = (d) => {
      const v = VEC[d], sx = x + v[0], sz = z + v[2], bs = this.get(sx, y, sz);
      if (gatesOnly ? !isGate(bs) : !emits(bs)) return 0;
      if (bs.n === 'redstone_block') return 15;
      if (bs.n === 'redstone_wire') return +bs.power;
      return this.strongAt(sx, y, sz, d);
    };
    return Math.max(one(CW[s.facing]), one(CCW[s.facing]));
  }
  targetNotAligned(x, y, z, s) { const d = OPP[s.facing], v = VEC[d], t = this.get(x + v[0], y, z + v[2]); return isGate(t) && t.facing !== d; }
  updateTarget(x, y, z, s) {
    const d = OPP[s.facing], v = VEC[d], fx = x + v[0], fz = z + v[2];
    this.neighborUpdate(fx, y, fz);
    this.updateNeighborsExcept(fx, y, fz, s.facing);
  }
  repLocked(x, y, z, s) { return this.gateSides(x, y, z, s, true) > 0; }
  repUpdatePowered(x, y, z, s) {
    if (!topSolid(this.get(x, y - 1, z))) { this.set(x, y, z, AIR, 3); return; }
    if (this.repLocked(x, y, z, s)) return;
    const on = s.powered === 'true', pw = this.gatePower(x, y, z, s) > 0;
    if (on !== pw && !this.isTicking(x, y, z, 'repeater')) {
      let p = PRIO.HIGH;
      if (this.targetNotAligned(x, y, z, s)) p = PRIO.EXTREMELY_HIGH; else if (on) p = PRIO.VERY_HIGH;
      this.schedule(x, y, z, 'repeater', +s.delay * 2, p);
    }
  }
  cmpPower(x, y, z, s) { return this.gatePower(x, y, z, s); }
  cmpOut(x, y, z, s) {
    const i = this.cmpPower(x, y, z, s);
    if (s.mode === 'subtract') return Math.max(i - this.gateSides(x, y, z, s, false), 0);
    return i;
  }
  cmpHasPower(x, y, z, s) {
    const i = this.cmpPower(x, y, z, s);
    if (i === 0) return false;
    const j = this.gateSides(x, y, z, s, false);
    if (i > j) return true;
    return i === j && s.mode === 'compare';
  }
  cmpUpdatePowered(x, y, z, s) {
    if (!topSolid(this.get(x, y - 1, z))) { this.set(x, y, z, AIR, 3); return; }
    if (this.isTicking(x, y, z, 'comparator')) return;
    const i = this.cmpOut(x, y, z, s), j = this.cmp.get(this.key(x, y, z)) || 0;
    if (i !== j || (s.powered === 'true') !== this.cmpHasPower(x, y, z, s)) this.schedule(x, y, z, 'comparator', 2, this.targetNotAligned(x, y, z, s) ? PRIO.HIGH : PRIO.NORMAL);
  }
  // ---------------------------------------------------------------- levers and buttons
  hungUpdate(s, x, y, z) { this.updateNeighborsAlways(x, y, z); const v = VEC[OPP[this.hungDir(s)]]; this.updateNeighborsAlways(x + v[0], y + v[1], z + v[2]); }
  press(x, y, z) {
    const s = this.get(x, y, z);
    if (!/_button$/.test(s.n)) throw new Error('no button at ' + [x, y, z]);
    if (s.powered === 'true') return;
    const t = withP(s, { powered: 'true' });
    this.set(x, y, z, t, 3); this.hungUpdate(t, x, y, z);
    this.schedule(x, y, z, s.n, /stone/.test(s.n) ? 20 : 30, PRIO.NORMAL);
  }
  lever(x, y, z) {
    const s = this.get(x, y, z);
    if (s.n !== 'lever') throw new Error('no lever at ' + [x, y, z]);
    const t = withP(s, { powered: s.powered === 'true' ? 'false' : 'true' });
    this.set(x, y, z, t, 3); this.hungUpdate(t, x, y, z);
  }
  // ---------------------------------------------------------------- ticks
  schedule(x, y, z, n, delay, prio) {
    const k = x + ',' + y + ',' + z + ',' + n;
    if (this.sched.has(k)) return;
    this.sched.add(k);
    this.ticks.push({ x, y, z, n, k, time: this.time + delay, prio, id: this.tickId++ });
  }
  isTicking(x, y, z, n) { return this.curSet.has(x + ',' + y + ',' + z + ',' + n); }
  scheduledTick(t) {
    const { x, y, z } = t, s = this.get(x, y, z), n = s.n;
    if (n !== t.n) return;
    if (n === 'repeater') {
      if (this.repLocked(x, y, z, s)) return;
      const on = s.powered === 'true', pw = this.gatePower(x, y, z, s) > 0;
      if (on && !pw) this.set(x, y, z, withP(s, { powered: 'false' }), 2);
      else if (!on) { this.set(x, y, z, withP(s, { powered: 'true' }), 2); if (!pw) this.schedule(x, y, z, 'repeater', +s.delay * 2, PRIO.VERY_HIGH); }
    } else if (n === 'comparator') {
      const i = this.cmpOut(x, y, z, s), k = this.key(x, y, z), j = this.cmp.get(k) || 0;
      this.cmp.set(k, i);
      if (j !== i || s.mode === 'compare') {
        const bl = this.cmpHasPower(x, y, z, s), on = s.powered === 'true';
        if (on && !bl) this.set(x, y, z, withP(s, { powered: 'false' }), 2);
        else if (!on && bl) this.set(x, y, z, withP(s, { powered: 'true' }), 2);
        this.updateTarget(x, y, z, s);
      }
    } else if (n === 'redstone_torch' || n === 'redstone_wall_torch') {
      const bl = this.torchShouldUnpower(x, y, z, s);
      while (this.burn.length && this.time - this.burn[0][3] > 60) this.burn.shift();
      if (s.lit === 'true') {
        if (bl) { this.set(x, y, z, withP(s, { lit: 'false' }), 3); if (this.burnedOut(x, y, z, true)) this.schedule(x, y, z, n, 160, PRIO.NORMAL); }
      } else if (!bl && !this.burnedOut(x, y, z, false)) this.set(x, y, z, withP(s, { lit: 'true' }), 3);
    } else if (n === 'redstone_lamp') {
      if (s.lit === 'true' && !this.isReceivingPower(x, y, z)) this.set(x, y, z, withP(s, { lit: 'false' }), 2);
    } else if (/_button$/.test(n)) {
      if (s.powered === 'true') { this.set(x, y, z, withP(s, { powered: 'false' }), 3); this.hungUpdate(s, x, y, z); }
    }
  }
  tick() {
    this.time++;
    // the ticks due, by time, priority, the order asked
    const due = this.ticks.filter((t) => t.time <= this.time).sort((a, b) => a.time - b.time || a.prio - b.prio || a.id - b.id);
    this.ticks = this.ticks.filter((t) => t.time > this.time);
    for (const t of due) { this.sched.delete(t.k); this.curSet.add(t.k); }
    this.inBlockTick = true;
    for (const t of due) { this.curSet.delete(t.k); if (this.log) this.log('tick', t); this.scheduledTick(t); }
    // the pistons' block events (one asked twice is done once); the genre counts them as inside the tick too
    while (this.events.length) {
      const e = this.events.shift();
      this.eventSet.delete(e.k);
      const s = this.get(e.x, e.y, e.z);
      if (s.n === e.n) { if (this.log) this.log('event', e); this.pistonEvent(e.x, e.y, e.z, s, e.type); }
    }
    this.inBlockTick = false;
    // the moving blocks
    const list = this.bes; this.bes = []; const keep = [];
    this.tickingBes = true; this.pendingBes = [];
    for (const be of list) { if (be.removed) continue; this.beTick(be); if (!be.removed) keep.push(be); }
    this.tickingBes = false;
    this.bes = keep.concat(this.bes, this.pendingBes);
  }
  // ---------------------------------------------------------------- pistons
  addEvent(x, y, z, n, type) { const k = x + ',' + y + ',' + z + ',' + n + ',' + type; if (this.eventSet.has(k)) return; this.eventSet.add(k); this.events.push({ x, y, z, n, type, k }); }
  pistonShouldExtend(x, y, z, face) {
    for (const d of DIRS) { if (d === face) continue; const v = VEC[d]; if (this.isEmitting(x + v[0], y + v[1], z + v[2], d)) return true; }
    if (this.isEmitting(x, y, z, 'down')) return true;
    for (const d of DIRS) { if (d === 'down') continue; const v = VEC[d]; if (this.isEmitting(x + v[0], y + 1 + v[1], z + v[2], d)) return true; }
    return false;
  }
  beAt(x, y, z) { for (const be of this.bes.concat(this.pendingBes || [])) if (!be.removed && be.x === x && be.y === y && be.z === z) return be; return null; }
  pistonTryMove(x, y, z, s) {
    const dir = s.facing, bl = this.pistonShouldExtend(x, y, z, dir), ext = s.extended === 'true';
    if (bl && !ext) { if (this.pushCalc(x, y, z, dir, true)) this.addEvent(x, y, z, s.n, 0); }
    else if (!bl && ext) {
      const v = VEC[dir], bx = x + v[0] * 2, by = y + v[1] * 2, bz = z + v[2] * 2, bs = this.get(bx, by, bz);
      let i = 1;
      if (bs.n === 'moving_piston' && bs.facing === dir) { const be = this.beAt(bx, by, bz); if (be && be.extending && (be.last < 0.5 || this.time === be.savedTime || this.inBlockTick)) i = 2; }
      this.addEvent(x, y, z, s.n, i);
    }
  }
  movable(s, x, y, z, motion, canBreak, pistonDir) {
    if (s.n === 'obsidian') return false;
    if (y < 0 || (motion === 'down' && y === 0) || y > 255 || (motion === 'up' && y === 255)) return false;
    if (isPiston(s)) { if (s.extended === 'true') return false; }
    else {
      if (s.n === 'bedrock' || s.n === 'moving_piston') return false;
      const pb = pistonBehavior(s);
      if (pb === 'block') return false;
      if (pb === 'destroy') return canBreak;
    }
    return s.n !== 'comparator' && s.n !== 'sign';
  }
  // the genre's PistonHandler: { moved: [[x, y, z]], broken: [[x, y, z]] } or null
  pushCalc(x, y, z, dir, extend) {
    const moved = [], broken = [], has = (p) => moved.findIndex((q) => q[0] === p[0] && q[1] === p[1] && q[2] === p[2]);
    const motion = extend ? dir : OPP[dir], v = VEC[dir], mv = VEC[motion];
    const to = extend ? [x + v[0], y + v[1], z + v[2]] : [x + v[0] * 2, y + v[1] * 2, z + v[2] * 2];
    const first = this.get(...to);
    if (!this.movable(first, ...to, motion, false, dir)) {
      if (extend && pistonBehavior(first) === 'destroy' && first.n !== 'air') { broken.push(to); return { moved, broken }; }
      return null;
    }
    // tryMove(to, motion)
    const tryMove = (p, d) => {
      let bs = this.get(...p);
      if (bs.n === 'air') return true;
      if (!this.movable(bs, ...p, motion, false, d)) return true;
      if (p[0] === x && p[1] === y && p[2] === z) return true;
      if (has(p) > -1) return true;
      if (1 + moved.length > 12) return false;
      if (bs.n === 'slime_block' || bs.n === 'honey_block') throw new Error('sticky blocks are not written here');
      moved.push(p);
      let l = 1;
      for (;;) {
        const q = [p[0] + mv[0] * l, p[1] + mv[1] * l, p[2] + mv[2] * l];
        if (has(q) > -1) return true;
        bs = this.get(...q);
        if (bs.n === 'air') return true;
        if (!this.movable(bs, ...q, motion, true, motion) || (q[0] === x && q[1] === y && q[2] === z)) return false;
        if (pistonBehavior(bs) === 'destroy') { broken.push(q); return true; }
        if (moved.length >= 12) return false;
        moved.push(q);
        l++;
      }
    };
    if (!tryMove(to, motion)) return null;
    return { moved, broken };
  }
  addBe(be) { if (this.tickingBes) this.pendingBes.push(be); else this.bes.push(be); }
  pistonMove(x, y, z, s, dir, extend) {
    const v = VEC[dir], hx = x + v[0], hy = y + v[1], hz = z + v[2];
    if (!extend && this.get(hx, hy, hz).n === 'piston_head') this.set(hx, hy, hz, AIR, 20);
    const r = this.pushCalc(x, y, z, dir, extend);
    if (!r) return false;
    const { moved, broken } = r, map = new Map(), list2 = [];
    for (const p of moved) { const bs = this.get(...p); list2.push(bs); map.set(p.join(','), [p, bs]); }
    const md = VEC[extend ? dir : OPP[dir]], states2 = [];
    for (let k = broken.length - 1; k >= 0; k--) { const p = broken[k]; states2.push(this.get(...p)); this.set(...p, AIR, 18); }
    for (let k = moved.length - 1; k >= 0; k--) {
      const p = moved[k], bs = this.get(...p), q = [p[0] + md[0], p[1] + md[1], p[2] + md[2]];
      map.delete(q.join(','));
      this.set(...q, S('moving_piston', { facing: dir }), 68);
      this.addBe({ x: q[0], y: q[1], z: q[2], pushed: list2[k], facing: dir, extending: extend, source: false, progress: 0, last: 0, savedTime: -1 });
      states2.push(bs);
    }
    if (extend) {
      const head = S('piston_head', { facing: dir, type: s.n === 'sticky_piston' ? 'sticky' : 'normal', short: 'false' });
      map.delete(hx + ',' + hy + ',' + hz);
      this.set(hx, hy, hz, S('moving_piston', { facing: dir }), 68);
      this.addBe({ x: hx, y: hy, z: hz, pushed: head, facing: dir, extending: true, source: true, progress: 0, last: 0, savedTime: -1 });
    }
    for (const [p] of map.values()) this.set(...p, AIR, 82);
    let j = 0;
    for (let l = broken.length - 1; l >= 0; l--) { j++; this.updateNeighborsAlways(...broken[l]); }
    for (let l = moved.length - 1; l >= 0; l--) { j++; this.updateNeighborsAlways(...moved[l]); }
    if (extend) this.updateNeighborsAlways(hx, hy, hz);
    return true;
  }
  pistonEvent(x, y, z, s, type) {
    const dir = s.facing, bl = this.pistonShouldExtend(x, y, z, dir);
    if (bl && (type === 1 || type === 2)) { this.set(x, y, z, withP(s, { extended: 'true' }), 2); return; }
    if (!bl && type === 0) return;
    if (type === 0) {
      if (!this.pistonMove(x, y, z, s, dir, true)) return;
      this.set(x, y, z, withP(s, { extended: 'true' }), 67);
    } else {
      const v = VEC[dir], hx = x + v[0], hy = y + v[1], hz = z + v[2];
      const hb = this.beAt(hx, hy, hz);
      if (hb) this.beFinish(hb);
      this.set(x, y, z, S('moving_piston', { facing: dir }), 20);
      this.addBe({ x, y, z, pushed: withP(s, { extended: 'false' }), facing: dir, extending: false, source: true, progress: 0, last: 0, savedTime: -1 });
      this.updateNeighborsAlways(x, y, z);
      if (s.n === 'sticky_piston') {
        const bx = x + v[0] * 2, by = y + v[1] * 2, bz = z + v[2] * 2, bs = this.get(bx, by, bz);
        let done = false;
        if (bs.n === 'moving_piston') { const be = this.beAt(bx, by, bz); if (be && be.facing === dir && be.extending) { this.beFinish(be); done = true; } }
        if (!done) {
          if (type === 1 && bs.n !== 'air' && this.movable(bs, bx, by, bz, OPP[dir], false, dir) && (pistonBehavior(bs) === 'normal' || isPiston(bs))) this.pistonMove(x, y, z, s, dir, false);
          else this.set(hx, hy, hz, AIR, 3);
        }
      } else this.set(hx, hy, hz, AIR, 3);
    }
  }
  beTick(be) {
    be.savedTime = this.time;
    be.last = be.progress;
    if (be.last >= 1) {
      be.removed = true;
      if (this.get(be.x, be.y, be.z).n === 'moving_piston') { this.set(be.x, be.y, be.z, be.pushed, 67); this.neighborUpdate(be.x, be.y, be.z); }
      return;
    }
    be.progress = Math.min(1, be.progress + 0.5);
  }
  beFinish(be) {
    if (be.last < 1) {
      be.last = be.progress = 1; be.removed = true;
      if (this.get(be.x, be.y, be.z).n === 'moving_piston') { const s = be.source ? AIR : be.pushed; this.set(be.x, be.y, be.z, s, 3); this.neighborUpdate(be.x, be.y, be.z); }
    }
  }
}
