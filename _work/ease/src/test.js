let OUT = [];
let done = 0;
function testStep() {
  if (done == 0) {
    eraseAll();
    camera(); evalObj(0.3); placeModel(40, 41, gScale, 0);
    fillModel(gHue, 0.62, 1);
    OUT.push(cR); OUT.push(cG); OUT.push(cB);
    done = 1;
  }
}
