const N = 5000;
let gfirst = 0, r_gfirst = 0, r_glast = 0, r_clone = 0, r_orig = 0, frames = 0, mode = 0, t0 = 0, isclone = 0;
let p1=0,p2=0,p3=0,p4=0,p5=0,p6=0,p7=0,p8=0,p9=0,p10=0,p11=0,p12=0,p13=0,p14=0,p15=0,p16=0,p17=0,p18=0,p19=0,p20=0,p21=0,p22=0,p23=0,p24=0,p25=0,p26=0,p27=0,p28=0,p29=0,p30=0;
let glast = 0;
function bFirst() { gfirst = 0; while (gfirst < N) { gfirst = gfirst + 1; } }
function bLast() { glast = 0; while (glast < N) { glast = glast + 1; } }
function stampMany(n) {
  let i = 0;
  while (i < n) {
    costume(1 + i % 8); goto(-240 + i % 480, -100 + i % 200); resetSize(); stretchW(3); stretchH(i % 50); stamp();
    i = i + 1;
  }
}
on('start', 'stamper', function () {
  timerStart();
  mode = 0; frames = 0; t0 = timer();
  for (;;) {
    if (mode == 0) { bFirst(); }
    if (mode == 1) { bLast(); }
    if (mode == 2) { eraseAll(); stampMany(1000); }
    frames = frames + 1;
    if (timer() - t0 > 2) {
      if (mode == 0) { r_gfirst = 1000000 * (timer() - t0) / frames / N; }
      if (mode == 1) { r_glast = 1000000 * (timer() - t0) / frames / N; }
      if (mode == 2) { r_orig = frames / (timer() - t0); eraseAll(); isclone = 1; cloneSelf(); stopThread(); }
      mode = mode + 1; frames = 0; t0 = timer();
    }
  }
});
on('clone', 'stamper', function () {
  frames = 0; t0 = timer();
  for (;;) {
    eraseAll(); stampMany(1000);
    frames = frames + 1;
    r_clone = frames / (timer() - t0);
  }
});
