// ===================================================================== navigation
// Nodes from the build: outdoor ones a cell (8 neighbours by a bit mask) and the ones inside
// buildings (rooms, doors, stairs; edges in NEL). Paths: A* spread over frames, one search at a
// time from a queue. The zone: a flow field (Dijkstra from the safe zone's centre) every node
// follows toward the zone.
let NDOFF = [1, 65, 64, 63, -1, -65, -64, -63];
let NDCOST = [3200, 4525, 3200, 4525, 3200, 4525, 3200, 4525];
const NPATH = 48;
let PATH = [], PLEN = [], PIDX = [];
// A*
let AG = [], AP = [], ASTMP = [], ACLOSE = [], HN = [], HF = [];
let hSize = 0, aStamp = 0, aOn = 0, aBot = 0, aGoal = 0, aStart = 0, aExp = 0;
let AQ = [];
let aqHead = 1, aqTail = 1;
let AQG = [];
// flow field
let FD = [], FNX = [], FST = [], FHN = [], FHF = [];
let fhSize = 0, fOn = 0, fStamp = 0, fTarget = 0;

function navInit() {
  let i = 1, n = NDX.length;
  while (i <= n) { AG.push(0); AP.push(0); ASTMP.push(0); ACLOSE.push(0); FD.push(0); FNX.push(0); FST.push(0); i = i + 1; }
  i = 1;
  while (i <= n + 10) { HN.push(0); HF.push(0); FHN.push(0); FHF.push(0); i = i + 1; }
  i = 1;
  while (i <= NE * NPATH) { PATH.push(0); i = i + 1; }
  i = 1;
  while (i <= NE) { PLEN.push(0); PIDX.push(1); i = i + 1; }
  i = 1;
  while (i <= 64) { AQ.push(0); AQG.push(0); i = i + 1; }
  i = 1;
  while (i <= 200) { RTMP.push(0); i = i + 1; }
}

// the node nearest to (x, y, z): the cell's outdoor node or a node of the building in the cell
function nearNode(x, y, z) {
  let c = Math.floor(z / CS) * CELLS + Math.floor(x / CS) + 1;
  if (c < 1) { c = 1; }
  if (c > CELLS * CELLS) { c = CELLS * CELLS; }
  let best = CN[c], bd = 999999999;
  if (best > 0) { bd = nd2(best, x, y, z); }
  let b = CIB[c];
  if (b > 0) {
    let k = IN0[b], ke = k + INN[b];
    while (k < ke) { let d = nd2(k, x, y, z); if (d < bd) { bd = d; best = k; } k = k + 1; }
  }
  // nothing here: the neighbours' outdoor nodes
  if (best == 0) {
    let j = 1;
    while (j <= 8) { let c2 = c + NDOFF[j]; if (c2 >= 1) { if (c2 <= CELLS * CELLS) { let m = CN[c2]; if (m > 0) { let d = nd2(m, x, y, z); if (d < bd) { bd = d; best = m; } } } } j = j + 1; }
  }
  return best;
}
function nd2(k, x, y, z) {
  return (NDX[k] - x) * (NDX[k] - x) + (NDZ[k] - z) * (NDZ[k] - z) + (NDY[k] - y) * (NDY[k] - y) * 4;
}

// ---------------------------------------------------------------- A*
// ask for a path for bot e to node goal (from the node it stands nearest)
function pathAsk(e, goal) {
  let dup = 0, i = aqHead;
  while (i != aqTail) { if (AQ[i] == e) { AQG[i] = goal; dup = 1; } i = mod(i, 64) + 1; }
  if (aOn == 1) { if (aBot == e) { aGoal = goal; dup = 0; aOn = 0; } }
  if (dup == 0) {
    if (mod(aqTail, 64) + 1 != aqHead) { AQ[aqTail] = e; AQG[aqTail] = goal; aqTail = mod(aqTail, 64) + 1; }
  }
  PLEN[e] = 0; PIDX[e] = 1;
}
function heapPush(n, f) {
  hSize = hSize + 1;
  let i = hSize, go = 1;
  while (go == 1) {
    if (i <= 1) { go = 0; } else {
      let p = idiv(i, 2);
      if (HF[p] > f) { HN[i] = HN[p]; HF[i] = HF[p]; i = p; } else { go = 0; }
    }
  }
  HN[i] = n; HF[i] = f;
}
let hTopN = 0;
function heapPop() {
  hTopN = HN[1];
  let ln = HN[hSize], lf = HF[hSize];
  hSize = hSize - 1;
  let i = 1, go = 1;
  while (go == 1) {
    let c = i * 2;
    if (c > hSize) { go = 0; } else {
      if (c + 1 <= hSize) { if (HF[c + 1] < HF[c]) { c = c + 1; } }
      if (HF[c] < lf) { HN[i] = HN[c]; HF[i] = HF[c]; i = c; } else { go = 0; }
    }
  }
  HN[i] = ln; HF[i] = lf;
}
// do up to budget expansions of the current search (starting the next one if none)
function pathWork(budget) {
  if (aOn == 0) {
    if (aqHead != aqTail) {
      aBot = AQ[aqHead]; aGoal = AQG[aqHead]; aqHead = mod(aqHead, 64) + 1;
      if (EALIVE[aBot] == 1) {
        aStart = nearNode(EX[aBot], EY[aBot], EZ[aBot]);
        if (aStart > 0) { if (aGoal > 0) {
          aStamp = aStamp + 1; hSize = 0; aExp = 0;
          AG[aStart] = 0; AP[aStart] = 0; ASTMP[aStart] = aStamp;
          heapPush(aStart, hz(aStart));
          aOn = 1;
        } }
      }
    }
  }
  let n = 0;
  while (n < budget) {
    if (aOn == 1) {
      if (hSize == 0) { aOn = 0; pathDirect(aBot, aGoal); }
      else {
        heapPop();
        let u = hTopN;
        if (ACLOSE[u] != aStamp) {
          ACLOSE[u] = aStamp;
          if (u == aGoal) { aOn = 0; pathStore(aBot, u); }
          else {
            aExp = aExp + 1;
            if (aExp > 2600) { aOn = 0; pathDirect(aBot, aGoal); }
            else { M_expand(u); }
          }
        }
      }
    }
    n = n + 1;
  }
}
function hz(k) {
  let dx = NDX[k] - NDX[aGoal], dz = NDZ[k] - NDZ[aGoal];
  return Math.sqrt(dx * dx + dz * dz) * 1.1;
}
function M_relax(u, v, w) {
  if (ACLOSE[v] != aStamp) {
    let g = AG[u] + w;
    if (ASTMP[v] != aStamp || g < AG[v]) {
      ASTMP[v] = aStamp; AG[v] = g; AP[v] = u;
      heapPush(v, g + hz(v));
    }
  }
}
function M_expand(u) {
  if (NDK[u] == 0) {
    let msk = NDM[u], j = 1;
    while (msk > 0) {
      if (mod(msk, 2) == 1) { let v = CN[NDC[u] + NDOFF[j]]; M_relax(u, v, NDCOST[j]); }
      msk = idiv(msk, 2);
      j = j + 1;
    }
  }
  let k = NE0[u], ke = k + NEN[u];
  while (k < ke) {
    let v2 = NEL[k];
    let w2 = Math.abs(NDX[v2] - NDX[u]) + Math.abs(NDZ[v2] - NDZ[u]) + Math.abs(NDY[v2] - NDY[u]) * 2 + 50;
    M_relax(u, v2, w2);
    k = k + 1;
  }
}
// the path found: from the goal back by parents, then reversed into the bot's buffer
let RTMP = [];
function pathStore(e, goal) {
  let n = 0, u = goal;
  while (u > 0) { n = n + 1; if (n <= 200) { RTMP[n] = u; } u = AP[u]; }
  if (n > 200) { n = 200; }
  let base = (e - 1) * NPATH, m = Math.min(n, NPATH), i = 1;
  // the first NPATH nodes from the start (the end is asked for again on arrival)
  while (i <= m) { PATH[base + i] = RTMP[n - i + 1]; i = i + 1; }
  PLEN[e] = m; PIDX[e] = 1;
  if (m > 1) { PIDX[e] = 2; }
}
function pathDirect(e, goal) {
  PATH[(e - 1) * NPATH + 1] = goal; PLEN[e] = 1; PIDX[e] = 1;
}

// ---------------------------------------------------------------- the flow field to the zone
function flowStart(x, z) {
  fTarget = nearNode(x, hAt(x, z), z);
  if (fTarget > 0) {
    fStamp = fStamp + 1; fhSize = 0;
    FD[fTarget] = 0; FNX[fTarget] = fTarget; FST[fTarget] = fStamp;
    M_fpush(fTarget, 0);
    fOn = 1;
  }
}
function M_fpush(n, f) {
  fhSize = fhSize + 1;
  let fi = fhSize, fgo = 1;
  while (fgo == 1) {
    if (fi <= 1) { fgo = 0; } else {
      let fp = idiv(fi, 2);
      if (FHF[fp] > f) { FHN[fi] = FHN[fp]; FHF[fi] = FHF[fp]; fi = fp; } else { fgo = 0; }
    }
  }
  FHN[fi] = n; FHF[fi] = f;
}
function flowWork(budget) {
  let n = 0;
  while (n < budget) {
    if (fOn == 1) {
      if (fhSize == 0) { fOn = 0; } else {
        // pop
        let u = FHN[1], uf = FHF[1];
        let ln = FHN[fhSize], lf = FHF[fhSize];
        fhSize = fhSize - 1;
        let i = 1, go = 1;
        while (go == 1) {
          let c = i * 2;
          if (c > fhSize) { go = 0; } else {
            if (c + 1 <= fhSize) { if (FHF[c + 1] < FHF[c]) { c = c + 1; } }
            if (FHF[c] < lf) { FHN[i] = FHN[c]; FHF[i] = FHF[c]; i = c; } else { go = 0; }
          }
        }
        FHN[i] = ln; FHF[i] = lf;
        if (uf <= FD[u]) {
          // the edges are the same both ways: whoever reaches u steps to u next
          if (NDK[u] == 0) {
            let msk = NDM[u], j = 1;
            while (msk > 0) {
              if (mod(msk, 2) == 1) { let v = CN[NDC[u] + NDOFF[j]]; M_frelax(u, v, NDCOST[j]); }
              msk = idiv(msk, 2);
              j = j + 1;
            }
          }
          let k = NE0[u], ke = k + NEN[u];
          while (k < ke) {
            let v2 = NEL[k];
            M_frelax(u, v2, Math.abs(NDX[v2] - NDX[u]) + Math.abs(NDZ[v2] - NDZ[u]) + Math.abs(NDY[v2] - NDY[u]) * 2 + 50);
            k = k + 1;
          }
        }
      }
    }
    n = n + 1;
  }
}
function M_frelax(u, v, w) {
  let g = FD[u] + w;
  if (FST[v] != fStamp || g < FD[v]) {
    FST[v] = fStamp; FD[v] = g; FNX[v] = u;
    M_fpush(v, g);
  }
}
