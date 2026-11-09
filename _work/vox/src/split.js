// ===================================================================== SPLIT=1: the work in three objects
// `pen` runs the game (time, keys, the player, the world being made, the mobs) and draws the title
// and loading screens; `view` draws the 3D world, `hud` the HUD and the screens in front of it.
// Each draws (and erases) only its own strokes; they meet through frameSeq, which `pen` moves on
// after every frame of play.
let viewSeq = 0, hudSeq = 0;
on('start', 'view', function () {
  waitUntil(TXS.length >= NTX);
  hide(); penUp();
  let shown = 0;
  for (;;) {
    if (gState == 2) {
      if (frameSeq != viewSeq) { viewSeq = frameSeq; eraseAll(); drawView(); shown = 1; }
    } else { if (shown == 1) { eraseAll(); shown = 0; } }
  }
});
on('start', 'hud', function () {
  waitUntil(TXS.length >= NTX);
  hide(); penUp();
  let shown = 0;
  for (;;) {
    if (gState == 2) {
      if (frameSeq != hudSeq) { hudSeq = frameSeq; eraseAll(); drawUI(uiDt); shown = 1; }
    } else { if (shown == 1) { eraseAll(); shown = 0; } }
  }
});
