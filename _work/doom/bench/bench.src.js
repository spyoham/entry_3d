const N = 50;
let r_local = 0, r_global = 0, r_list = 0, r_stamp = 0, r_empty = 0, r_call = 0, g_s = 0, g_i = 0, frames = 0, mode = 0, t0 = 0;
let A = [];
function benchLocal() { let s = 0, i = 0; while (i < N) { s = s + i * 2; i = i + 1; } }
function benchEmpty() { let i = 0; while (i < N) { i = i + 1; } }
function benchGlobal() { g_s = 0; g_i = 0; while (g_i < N) { g_s = g_s + g_i * 2; g_i = g_i + 1; } }
function benchList() { let s = 0, i = 0; while (i < N) { s = s + A[1 + i % 100]; i = i + 1; } }
function sq(x) { return x * x; }
function benchCall() { let s = 0, i = 0; while (i < N) { s = sq(i); i = i + 1; } }
function stampMany(n) {
  let i = 0;
  while (i < n) {
    costume(1 + i % 8); goto(-240 + i % 480, -100 + i % 200); resetSize(); stretchW(3); stretchH(i % 50); stamp();
    i = i + 1;
  }
}
// us per iteration given fps f with N iterations per frame (minus ~0 baseline)
on('start', 'stamper', function () {
  timerStart();
  let k = 0;
  while (k < 100) { A.push(k); k = k + 1; }
  mode = 4; frames = 0; t0 = timer();
  for (;;) {
    if (mode == 0) { benchEmpty(); }
    if (mode == 1) { benchLocal(); }
    if (mode == 2) { benchGlobal(); }
    if (mode == 3) { benchList(); }
    if (mode == 4) { benchCall(); }
    if (mode == 5) { eraseAll(); stampMany(1000); }
    frames = frames + 1;
    if (timer() - t0 > 2) {
      let us = 1000000 * (timer() - t0) / frames / N;
      if (mode == 0) { r_empty = us; }
      if (mode == 1) { r_local = us; }
      if (mode == 2) { r_global = us; }
      if (mode == 3) { r_list = us; }
      if (mode == 4) { r_call = us; }
      if (mode == 5) { r_stamp = frames / (timer() - t0); }
      mode = mode + 1; frames = 0; t0 = timer();
    }
  }
});
