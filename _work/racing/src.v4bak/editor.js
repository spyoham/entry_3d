// ============================================================
// editor.js - top-down circuit editor. Control points are dragged with the
// mouse; the ribbon preview is the real runtime geometry (buildTrack on
// slot 4), so what you draw is exactly what you drive.
// ============================================================
let edCX = 0;
let edCZ = 0;
let edZoom = 0.30;
let edSel = 0;
let edDrag = 0;
let edDirty = 1;
let edSX = 0;
let edSY = 0;
let edWasDown = 0;
let edKey = 0;

function edProj(x, z) {
    edSX = (x - edCX) * edZoom;
    edSY = (z - edCZ) * edZoom;
}

// a default oval so the editor never starts empty
function edReset() {
    let n = 14;
    let base = ctlOff[EDTRK];
    let i = 0;
    while (i < n) {
        let a = 360 * i / n;
        let r = 210 + 42 * sind(2 * a);
        ctlX[base + i + 1] = cosd(a) * r;
        ctlZ[base + i + 1] = sind(a) * r * 0.78;
        ctlY[base + i + 1] = 5 * sind(3 * a);
        ctlW[base + i + 1] = 9.5;
        ctlF[base + i + 1] = 0;
        i = i + 1;
    }
    ctlCnt[EDTRK] = n;
    edSel = 1;
    edDirty = 1;
}

function edInsert(after) {
    let n = ctlCnt[EDTRK];
    if (n < MAXCTL) {
        let base = ctlOff[EDTRK];
        let i = n;
        while (i > after) {
            ctlX[base + i + 1] = ctlX[base + i];
            ctlY[base + i + 1] = ctlY[base + i];
            ctlZ[base + i + 1] = ctlZ[base + i];
            ctlW[base + i + 1] = ctlW[base + i];
            ctlF[base + i + 1] = ctlF[base + i];
            i = i - 1;
        }
        ctlCnt[EDTRK] = n + 1;
    }
}

function edDelete(k) {
    let n = ctlCnt[EDTRK];
    if (n > 5) {
        let base = ctlOff[EDTRK];
        let i = k;
        while (i < n) {
            ctlX[base + i] = ctlX[base + i + 1];
            ctlY[base + i] = ctlY[base + i + 1];
            ctlZ[base + i] = ctlZ[base + i + 1];
            ctlW[base + i] = ctlW[base + i + 1];
            ctlF[base + i] = ctlF[base + i + 1];
            i = i + 1;
        }
        ctlCnt[EDTRK] = n - 1;
        if (edSel > n - 1) { edSel = n - 1; }
        edDirty = 1;
    }
}

// rotate the loop so that point k becomes the start / finish line
function edSetStart(k) {
    let n = ctlCnt[EDTRK];
    let base = ctlOff[EDTRK];
    let r = 1;
    while (r < k) {
        let x0 = ctlX[base + 1];
        let y0 = ctlY[base + 1];
        let z0 = ctlZ[base + 1];
        let w0 = ctlW[base + 1];
        let f0 = ctlF[base + 1];
        let i = 1;
        while (i < n) {
            ctlX[base + i] = ctlX[base + i + 1];
            ctlY[base + i] = ctlY[base + i + 1];
            ctlZ[base + i] = ctlZ[base + i + 1];
            ctlW[base + i] = ctlW[base + i + 1];
            ctlF[base + i] = ctlF[base + i + 1];
            i = i + 1;
        }
        ctlX[base + n] = x0; ctlY[base + n] = y0; ctlZ[base + n] = z0;
        ctlW[base + n] = w0; ctlF[base + n] = f0;
        r = r + 1;
    }
    edSel = 1;
    edDirty = 1;
}

function edToggleFlag(k, bit) {
    let base = ctlOff[EDTRK];
    let f = ctlF[base + k];
    let has = mod(idiv(f, bit), 2);
    if (has >= 1) { ctlF[base + k] = f - bit; } else { ctlF[base + k] = f + bit; }
    edDirty = 1;
}

// ---- input --------------------------------------------------------------
function edInput() {
    let base = ctlOff[EDTRK];
    let n = ctlCnt[EDTRK];
    let mx = mouseX();
    let my = mouseY();
    let down = mouseDown() ? 1 : 0;
    // world position under the cursor
    let wx = mx / edZoom + edCX;
    let wz = my / edZoom + edCZ;
    if (down > 0) {
        if (edWasDown == 0) {
            // pick the nearest control point within grabbing distance
            let bestK = 0;
            let bestD = 14 * 14;
            let i = 1;
            while (i <= n) {
                edProj(ctlX[base + i], ctlZ[base + i]);
                let dx = edSX - mx;
                let dy = edSY - my;
                let d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; bestK = i; }
                i = i + 1;
            }
            if (bestK > 0) { edSel = bestK; edDrag = 1; }
            else {
                // insert after whichever leg of the loop is closest
                let bi = 1;
                let bd = 1e12;
                i = 1;
                while (i <= n) {
                    let j = mod(i, n) + 1;
                    let ax = ctlX[base + i]; let az = ctlZ[base + i];
                    let bx = ctlX[base + j]; let bz = ctlZ[base + j];
                    let ex = bx - ax; let ez = bz - az;
                    let el = ex * ex + ez * ez;
                    let t = 0.5;
                    if (el > 0.001) { t = ((wx - ax) * ex + (wz - az) * ez) / el; }
                    if (t < 0) { t = 0; }
                    if (t > 1) { t = 1; }
                    let px = ax + ex * t - wx;
                    let pz = az + ez * t - wz;
                    let d = px * px + pz * pz;
                    if (d < bd) { bd = d; bi = i; }
                    i = i + 1;
                }
                edInsert(bi);
                ctlX[base + bi + 1] = wx;
                ctlZ[base + bi + 1] = wz;
                ctlY[base + bi + 1] = ctlY[base + bi];
                ctlW[base + bi + 1] = ctlW[base + bi];
                ctlF[base + bi + 1] = 0;
                edSel = bi + 1;
                edDrag = 1;
                edDirty = 1;
            }
        }
        if (edDrag > 0) {
            if (edSel > 0) {
                ctlX[base + edSel] = wx;
                ctlZ[base + edSel] = wz;
                edDirty = 1;
            }
        }
    } else { edDrag = 0; }
    edWasDown = down;

    // one action per key press
    let k = 0;
    if (key(88)) { k = 88; }          // X delete
    else if (key(81)) { k = 81; }     // Q narrower
    else if (key(69)) { k = 69; }     // E wider
    else if (key(82)) { k = 82; }     // R raise
    else if (key(70)) { k = 70; }     // F lower
    else if (key(84)) { k = 84; }     // T tunnel
    else if (key(74)) { k = 74; }     // J jump
    else if (key(66)) { k = 66; }     // B barrier
    else if (key(67)) { k = 67; }     // C checkpoint
    else if (key(83)) { k = 83; }     // S start line
    else if (key(78)) { k = 78; }     // N new
    if (k != edKey) {
        edKey = k;
        if (k == 88) { edDelete(edSel); }
        else if (k == 78) { edReset(); }
        else if (k == 83) { edSetStart(edSel); }
        else if (k == 84) { edToggleFlag(edSel, 1); }
        else if (k == 74) { edToggleFlag(edSel, 2); }
        else if (k == 66) { edToggleFlag(edSel, 4); }
        else if (k == 67) { edToggleFlag(edSel, 16); }
    }
    // held keys
    if (key(81)) { ctlW[base + edSel] = Math.max(5, ctlW[base + edSel] - 12 * dt); edDirty = 1; }
    if (key(69)) { ctlW[base + edSel] = Math.min(18, ctlW[base + edSel] + 12 * dt); edDirty = 1; }
    if (key(82)) { ctlY[base + edSel] = ctlY[base + edSel] + 18 * dt; edDirty = 1; }
    if (key(70)) { ctlY[base + edSel] = ctlY[base + edSel] - 18 * dt; edDirty = 1; }
    if (key(37)) { edCX = edCX - 260 * dt / edZoom; }
    if (key(39)) { edCX = edCX + 260 * dt / edZoom; }
    if (key(40)) { edCZ = edCZ - 260 * dt / edZoom; }
    if (key(38)) { edCZ = edCZ + 260 * dt / edZoom; }
    if (key(90)) { edZoom = Math.min(1.4, edZoom * (1 + 1.4 * dt)); }
    if (key(86)) { edZoom = Math.max(0.06, edZoom * (1 - 1.4 * dt)); }
}

// ---- draw ---------------------------------------------------------------
function edBox(x, y, r, col) {
    fill4(x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r, col);
}

function drawEditor() {
    eraseAll();
    fill4(0 - 240, 0 - 135, 240, 0 - 135, 240, 135, 0 - 240, 135, '#0e1422');
    // grid every 100 m
    let g = 0 - 1200;
    while (g <= 1200) {
        edProj(g, 0);
        let x = edSX;
        if (x > 0 - 240) { if (x < 240) { fill4(x - 0.5, 0 - 135, x + 0.5, 0 - 135, x + 0.5, 135, x - 0.5, 135, '#182236'); } }
        edProj(0, g);
        let y = edSY;
        if (y > 0 - 135) { if (y < 135) { fill4(0 - 240, y - 0.5, 240, y - 0.5, 240, y + 0.5, 0 - 240, y + 0.5, '#182236'); } }
        g = g + 100;
    }
    if (edDirty > 0) {
        buildTrack(EDTRK);
        edDirty = 0;
    }
    // road ribbon from the real geometry
    let i = 1;
    while (i <= NSEG) {
        let j = i + 1;
        let b0 = (i - 1) * PPR;
        let b1 = i * PPR;
        edProj(wvX[b0 + P_L], wvZ[b0 + P_L]);
        let ax = edSX; let ay = edSY;
        edProj(wvX[b0 + P_R], wvZ[b0 + P_R]);
        let bx = edSX; let by = edSY;
        edProj(wvX[b1 + P_R], wvZ[b1 + P_R]);
        let cx = edSX; let cy = edSY;
        edProj(wvX[b1 + P_L], wvZ[b1 + P_L]);
        let dx = edSX; let dy = edSY;
        let lo = ax;
        if (bx < lo) { lo = bx; } if (cx < lo) { lo = cx; }
        let hi = ax;
        if (bx > hi) { hi = bx; } if (cx > hi) { hi = cx; }
        if (hi > 0 - 244) {
            if (lo < 244) {
                let col = '#3a3f4c';
                if (sgTun[i] > 0) { col = '#20242e'; }
                else if (sgJmp[i] > 0) { col = '#7a5a20'; }
                else if (sgHW[i] > 0) { col = '#4a4450'; }
                fill4(ax, ay, bx, by, cx, cy, dx, dy, col);
            }
        }
        i = i + 1;
    }
    // checkpoints
    i = 1;
    while (i <= nCP) {
        let s = cpSeg[i];
        edProj(sgX[s], sgZ[s]);
        edBox(edSX, edSY, 3.5, i == 1 ? '#ffffff' : '#ffd24a');
        i = i + 1;
    }
    // control points
    let base = ctlOff[EDTRK];
    let n = ctlCnt[EDTRK];
    i = 1;
    while (i <= n) {
        edProj(ctlX[base + i], ctlZ[base + i]);
        let c = '#63d2ff';
        let f = ctlF[base + i];
        if (mod(f, 2) >= 1) { c = '#b07cff'; }
        else if (mod(idiv(f, 2), 2) >= 1) { c = '#ffb340'; }
        else if (mod(idiv(f, 4), 2) >= 1) { c = '#ff6f6f'; }
        if (i == edSel) { edBox(edSX, edSY, 6, '#ffffff'); }
        edBox(edSX, edSY, 4, c);
        i = i + 1;
    }
}
