# Export a QAT checkpoint into raw arrays for the Entry builder.
#   export/<name>.Q.u8     codes (m*n uint8, row major)      level index per weight
#   export/<name>.S.f32    row-group scales (m * n/gs)
#   export/<name>.LV.f32   per-column levels (n * Lmax), padded levels = 0
#   export/<name>.K.i32    [row, col] of sparse exact weights  (keep option)
#   export/<name>.KV.f32   their values
#   export/norms.json, export/manifest.json
# usage: py -3.12 export.py qat.pt
import torch, json, os, sys, numpy as np
from transformers import AutoModelForCausalLM

ck = torch.load(sys.argv[1], map_location='cpu')
OUT = sys.argv[2] if len(sys.argv) > 2 else 'export'
st = ck['state']; args = ck['args']
os.makedirs(OUT, exist_ok=True)
man = {'gs': args['gs'], 'pattern': args['pattern'], 'mats': {}}

names = sorted({k.rsplit('.', 1)[0] for k in st})
for name in names:
    W = st[name + '.W'].float(); S = st[name + '.S'].float(); LV = st[name + '.LV'].float()
    bits = st[name + '.bits']; mask = st[name + '.mask']
    m, n = W.shape; gs = args['gs']
    Wm = torch.where(mask, torch.zeros_like(W), W)
    Wn = (Wm.view(m, -1, gs) / S[..., None]).view(m, n)
    lv = LV.sort(-1).values
    mid = (lv[:, 1:] + lv[:, :-1]) / 2
    Q = torch.searchsorted(mid.contiguous(), Wn.T.contiguous()).T
    Lmax = lv.shape[1]
    Lj = (2 ** bits).long()
    Lmax = lv.shape[1]
    # QAT value of every weight (padded levels can be picked when a learned scale collapses)
    Wq = S.repeat_interleave(gs, 1) * torch.gather(lv, 1, Q.T.contiguous()).T
    Wq = torch.where(mask, W, Wq)
    bad = Q >= Lj[None, :]
    Q = torch.minimum(Q, (Lj - 1)[None, :].expand_as(Q))
    lvx = lv.clone()
    for j in range(n): lvx[j, Lj[j]:] = 0
    Wcode = S.repeat_interleave(gs, 1) * torch.gather(lvx, 1, Q.T.contiguous()).T
    Q.to(torch.uint8).numpy().tofile(f'{OUT}/{name}.Q.u8')
    S.numpy().astype(np.float32).tofile(f'{OUT}/{name}.S.f32')
    lvx.numpy().astype(np.float32).tofile(f'{OUT}/{name}.LV.f32')
    # sparse residuals: kept outliers and clamped padded-level picks
    sp = mask | bad
    ki = sp.nonzero().int()
    kv = (Wq[sp] - Wcode[sp]).float()
    ki.numpy().astype(np.int32).tofile(f'{OUT}/{name}.K.i32')
    kv.numpy().astype(np.float32).tofile(f'{OUT}/{name}.KV.f32')
    if bad.any(): print(name, 'clamped padded picks:', int(bad.sum()))
    man['mats'][name] = {'m': m, 'n': n, 'Lmax': Lmax, 'bits': bits.tolist()[:12], 'nkeep': int(sp.sum())}
    # sanity: code + sparse residual reproduces the QAT forward weight
    What = Wcode.clone(); What[sp] += kv
    assert torch.allclose(What, Wq, atol=1e-6), name

norms = {}
for k, v in ck['norms'].items(): norms[k] = v.float().tolist()
json.dump(norms, open(f'{OUT}/norms.json', 'w'))
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)
print('exported', len(names), 'matrices')
