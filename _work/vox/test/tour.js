// The example film's tour (seed 1234): a scripted player in tessvm, run by test/tourrec.mjs.
// step() returns 1 (a frame to keep), 2 (a frame not kept: the world is being made), 0 (the end).
// Survival at the cottage (look round, pick a flower, put down stairs and a fence), then
// /gamemode creative: flying round the cottage, over a village, through the ashen depths
// (the ember forest, a fort bridge) and the void (the warden's island), and home at dusk.
module.exports.makeBot = function (io) {
  const { get, set, key, mouseDown } = io;
  const G = 37;                       // the cottage's ground (x 8, z 8)
  let phase = 0, f = 0;
  const cmd = (t) => { set('tCmd', t); set('testCmd', 8); };
  const cam = (x, y, z, yaw, pitch) => { set('px', x); set('py', y); set('pz', z); set('yaw', yaw); set('pitch', pitch); set('pvx', 0); set('pvy', 0); set('pvz', 0); set('fallTop', y); };
  const ready = () => get('gState') === 2 && get('nChunks') >= 46;   // (NOFF 49 is a constant, not a variable)
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const look = (cx, cz, x, z) => Math.atan2(cx - x, cz - z) * 180 / Math.PI;
  // each phase: frames it lasts (0: until it says so), what it does on frame k (t 0..1)
  const P = [
    // 0 the cottage, the day; wait for the world round it
    { n: 0, hold: 1, run: (k) => {
      if (k === 0) { set('tX', 8); set('tZ', 8); set('testCmd', 6); }
      if (k === 2) { set('flying', 0); set('tday', 0.08); set('helpT', 0); set('msgT', 0); set('wthr', 0); set('wthrT', 99999); cam(8.5, G, 3.2, 0, -6); }
      return k > 30 && ready();
    } },
    // 1 looking round the garden
    { n: 150, run: (k, t) => { set('yaw', lerp(0, -62, ease(t))); set('pitch', lerp(-6, -32, ease(t))); } },
    // 2 the poppy goes (click held)
    { n: 40, run: (k) => { mouseDown(k < 25); } },
    // 3 stairs where it was, then a fence by it
    { n: 90, run: (k) => {
      if (k === 0) key(49, true); if (k === 2) key(49, false);
      if (k === 10) key(70, true); if (k === 12) key(70, false);
      if (k === 20) set('yaw', -48);
      if (k === 40) key(50, true); if (k === 42) key(50, false);
      if (k === 50) key(70, true); if (k === 52) key(70, false);
    } },
    // 4 a step back, looking up at the house
    { n: 150, run: (k, t) => { key(83, k < 25); set('yaw', lerp(-48, 6, ease(t))); set('pitch', lerp(-32, 2, ease(t))); if (k === 149) key(83, false); } },
    // 5 creative
    { n: 70, run: (k) => { if (k === 5) cmd('/gamemode creative'); if (k === 30) cmd('/time set noon'); } },
    // 6 up and round the cottage
    { n: 420, run: (k, t) => {
      set('flying', 1);
      const a = lerp(-30, 200, ease(t)) * Math.PI / 180, r = lerp(9, 16, t), y = G + lerp(2, 10, Math.min(1, t * 2));
      const x = 8.5 + Math.sin(a) * r, z = 8.5 - Math.cos(a) * r;
      cam(x, y, z, look(8.5, 8.5, x, z), lerp(-12, -24, t));
    } },
    // 7 to the village (made while held)
    { n: 0, hold: 1, run: (k) => { if (k === 0) cam(148, 52, 196, look(177, 219, 148, 196), -22); return k > 20 && ready(); } },
    // 8 over the village
    { n: 540, run: (k, t) => { const x = lerp(148, 206, t), z = lerp(196, 240, t); cam(x, lerp(52, 47, t), z, look(177, 219, x, z) * 0.25 + lerp(50, 130, t) * 0.75, lerp(-22, -18, t)); } },
    // 9 to the ashen depths
    { n: 0, hold: 1, run: (k) => { if (k === 0) { cmd('/time set noon'); set('tStage', 1); set('tX', 4); set('tZ', -8); set('testCmd', 4); } return k > 30 && ready() && get('dim') === 1; } },
    // 10 through the ember forest to the indigo one
    { n: 480, run: (k, t) => { const x = lerp(10, -40, t), z = lerp(-4, -40, t); cam(x, lerp(28, 32, t), z, lerp(220, 250, t), lerp(-10, -16, t)); } },
    // 11 to a fort bridge
    { n: 0, hold: 1, run: (k) => { if (k === 0) cam(84, 31, 120.5, 90, -6); return k > 20 && ready(); } },
    // 12 along the bridge
    { n: 300, run: (k, t) => { cam(lerp(84, 118, t), 31, 120.5, 90, -4); } },
    // 13 to the void
    { n: 0, hold: 1, run: (k) => { if (k === 0) { set('tStage', 2); set('tX', 0); set('tZ', -40); set('testCmd', 4); } return k > 30 && ready() && get('dim') === 2; } },
    // 14 round the warden's island
    { n: 660, run: (k, t) => {
      const a = lerp(180, 440, t) * Math.PI / 180, r = lerp(62, 48, t);
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      cam(x, lerp(62, 70, t), z, look(0, 0, x, z), lerp(-14, -22, t));
    } },
    // 15 home at dusk
    { n: 0, hold: 1, run: (k) => {
      if (k === 0) { set('tStage', 0); set('tX', 8); set('tZ', -30); set('testCmd', 4); }
      if (get('dim') === 0 && get('gState') === 2) { cam(-6, G + 6, -8, 40, -14); set('tday', 0.47); }
      return k > 30 && get('dim') === 0 && ready();
    } },
    // 16 the cottage in the evening, the title
    { n: 540, run: (k, t) => {
      if (k === 60) cmd('/title @a title 블록 월드');
      if (k === 61) cmd('/title @a subtitle 블록 694종 · 구조물 · 세 개의 세계');
      const a = lerp(-50, 40, ease(t)) * Math.PI / 180, r = lerp(18, 13, t);
      const x = 8.5 + Math.sin(a) * r, z = 8.5 - Math.cos(a) * r;
      cam(x, G + lerp(6, 4, t), z, look(8.5, 8.5, x, z), lerp(-14, -10, t));
      set('tday', lerp(0.47, 0.5, t));
    } },
  ];
  return {
    step() {
      // a steady clock: one frame a tick, the view kept where it is
      set('kStep', 1); set('rtK', 1); set('autoView', 0);
      const p = P[phase];
      if (!p) return 0;
      const t = p.n ? f / (p.n - 1) : 0;
      const r = p.run(f, Math.min(1, t));
      f++;
      if ((p.n && f >= p.n) || (!p.n && r)) { phase++; f = 0; io.log('phase ' + phase); }
      return p.hold ? 2 : 1;
    },
  };
};
