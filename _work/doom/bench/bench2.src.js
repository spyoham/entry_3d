const N = 2000;
let r_call = 0, r_vcall = 0, frames = 0, mode = 0, t0 = 0, g = 0;
function inc(x) { g = g + x; }
function benchCall() { let i = 0; while (i < N) { inc(i); i = i + 1; } }
function sq(x) { return x * x; }
function vcallOnce() { g = sq(3); }
on('start', 'stamper', function () {
  timerStart();
  mode = 0; frames = 0; t0 = timer();
  for (;;) {
    if (mode == 0) { benchCall(); }
    if (mode == 1) { vcallOnce(); }
    frames = frames + 1;
    if (timer() - t0 > 2) {
      if (mode == 0) { r_call = 1000000 * (timer() - t0) / frames / N; }
      if (mode == 1) { r_vcall = frames / (timer() - t0); }
      mode = mode + 1; frames = 0; t0 = timer();
    }
  }
});
