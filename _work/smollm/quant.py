# Quantize SmolLM2-135M into the Entry-kernel format and measure perplexity.
#
# Format (every Linear, and the tied embedding / lm_head):
#     W[i, j] ~= s[i] * LV[j, q[i, j]]
#   s  : one scale per output row
#   LV : L = 2**bits levels per INPUT column (1-D k-means), free at run time
#        because the Entry table builder multiplies x[j] by LV[j, :] anyway
#   q  : bits-bit code per weight
# Codes are fitted column by column with GPTQ error feedback.
#
# usage: py -3.12 quant.py <bits> [--rtn] [--save out.pt] [--nsamples 128]
import torch, math, sys, time, argparse
from transformers import AutoModelForCausalLM, AutoTokenizer

ap = argparse.ArgumentParser()
ap.add_argument('bits', type=float)
ap.add_argument('--rtn', action='store_true')
ap.add_argument('--save', default=None)
ap.add_argument('--nsamples', type=int, default=128)
ap.add_argument('--seqlen', type=int, default=512)
ap.add_argument('--bits_map', default='')   # e.g. "down=3,v=3,emb=3"
ap.add_argument('--evaln', type=int, default=40)
ap.add_argument('--actorder', action='store_true')
ap.add_argument('--skip', default='')
ap.add_argument('--gs', type=int, default=0)   # group size for row-group scales (0 = per row)
ap.add_argument('--model', default='model')    # HF directory (default: the SmolLM2 copy)
ap.add_argument('--data', default='')          # plain-text corpus; first half calibrates, second half evaluates
args = ap.parse_args()
dev = 'cuda'
torch.manual_seed(0)

tok = AutoTokenizer.from_pretrained(args.model)
model = AutoModelForCausalLM.from_pretrained(args.model, torch_dtype=torch.float32).to(dev).eval()
if args.data:
    txt = open(args.data, encoding='utf8').read()
    half = len(txt) // 2
    train_ids = tok(txt[:min(half, 3_000_000)], return_tensors='pt').input_ids[0]
    test_ids = tok(txt[half:half + 1_500_000], return_tensors='pt').input_ids
else:
    test_ids = torch.load('wt2_test_ids.pt')
    train_text = open('wt2_train.txt', encoding='utf8').read()
    train_ids = tok(train_text[:3_000_000], return_tensors='pt').input_ids[0]

bits_map = {}
for kv in filter(None, args.bits_map.split(',')):
    k, v = kv.split('='); bits_map[k] = float(v)


def bits_for(name):
    for k, v in bits_map.items():
        if k in name: return v
    return args.bits


def kmeans1d(x, L, iters=12):
    """x: (m, n) columns are independent problems. returns levels (n, L) sorted."""
    m, n = x.shape
    qs = torch.linspace(0, 1, L + 2, device=x.device)[1:-1]
    lv = torch.quantile(x, qs, dim=0).T.contiguous()  # (n, L)
    for _ in range(iters):
        d = (x.T.unsqueeze(-1) - lv.unsqueeze(1)).abs()   # (n, m, L)
        a = d.argmin(-1)                                  # (n, m)
        oh = torch.nn.functional.one_hot(a, L).float()   # (n, m, L)
        cnt = oh.sum(1)
        s = torch.einsum('nm,nml->nl', x.T, oh)
        lv = torch.where(cnt > 0, s / cnt.clamp(min=1), lv)
    return lv.sort(-1).values


def assign(col, lv):
    """col (m,), lv (L,) -> codes (m,), values (m,)"""
    d = (col.unsqueeze(-1) - lv.unsqueeze(0)).abs()
    a = d.argmin(-1)
    return a, lv[a]


def quantize_matrix(W, H, bits, rtn=False, blocksize=128, percdamp=0.01, actorder=False, gs=0):
    """W (m, n); H (n, n) Hessian or None.
    returns S (m, n/gs) row-group scales, LV (n, L), Q (m, n), What (m, n)"""
    L = int(round(2 ** bits))
    W = W.clone().float()
    m, n = W.shape
    gs = gs or n
    ng = n // gs
    S = torch.zeros(m, ng, device=W.device)
    LV = torch.zeros(n, L, device=W.device)
    Q = torch.zeros(m, n, dtype=torch.long, device=W.device)
    What = torch.zeros_like(W)
    if H is None:
        H = torch.eye(n, device=W.device)
    H = H.clone()
    dead = torch.diag(H) == 0
    H[dead, dead] = 1; W[:, dead] = 0
    if rtn:
        Hinv = torch.eye(n, device=W.device)
    else:
        damp = percdamp * torch.mean(torch.diag(H))
        H += torch.eye(n, device=W.device) * damp
        Hinv = torch.linalg.cholesky(torch.cholesky_inverse(torch.linalg.cholesky(H)), upper=True)
    bs = max(blocksize, gs) if gs < n else blocksize
    for i1 in range(0, n, bs):
        i2 = min(i1 + bs, n)
        W1 = W[:, i1:i2].clone()
        Err1 = torch.zeros_like(W1)
        Hinv1 = Hinv[i1:i2, i1:i2]
        for i in range(i2 - i1):
            col = i1 + i
            if col % gs == 0:
                g = col // gs
                blk = W1[:, i:i + gs] if col + gs <= i2 else torch.cat([W1[:, i:], W[:, i2:col + gs]], 1)
                S[:, g] = blk.pow(2).mean(1).sqrt().clamp(min=1e-8)
            sg = S[:, col // gs]
            w = W1[:, i]
            wn = w / sg
            lv = kmeans1d(wn[:, None], L)[0]
            a, qv = assign(wn, lv)
            LV[col] = lv; Q[:, col] = a
            qw = qv * sg
            What[:, col] = qw
            err = (w - qw) / Hinv1[i, i]
            if not rtn:
                W1[:, i:] -= err[:, None] * Hinv1[i, i:][None, :]
            Err1[:, i] = err
        if not rtn:
            W[:, i2:] -= Err1 @ Hinv[i1:i2, i2:]
    return S, LV, Q, What


def get_calib():
    xs = []
    g = torch.Generator().manual_seed(0)
    for _ in range(args.nsamples):
        i = torch.randint(0, train_ids.numel() - args.seqlen - 1, (1,), generator=g).item()
        xs.append(train_ids[i:i + args.seqlen])
    return torch.stack(xs)


@torch.no_grad()
def ppl(m, n=None, L=512):
    n = n or args.evaln
    nll = 0; cnt = 0
    for i in range(n):
        x = test_ids[:, i * L:(i + 1) * L].to(dev)
        out = m(x, labels=x)
        nll += out.loss.item() * (L - 1); cnt += L - 1
    return math.exp(nll / cnt)


@torch.no_grad()
def run():
    t0 = time.time()
    print(f'fp ppl={ppl(model):.3f}  ({test_ids.numel()} test tokens, {train_ids.numel()} calib tokens)', flush=True)
    calib = get_calib().to(dev)
    layers = model.model.layers
    # capture layer-0 inputs
    cache = {}
    class Catch(torch.nn.Module):
        def __init__(s, mod): super().__init__(); s.mod = mod
        def forward(s, x, **kw):
            cache.setdefault('x', []).append(x); cache['kw'] = kw; raise ValueError
    layers[0] = Catch(layers[0])
    for b in range(0, calib.shape[0], 16):
        try: model(calib[b:b + 16])
        except ValueError: pass
    layers[0] = layers[0].mod
    xs = cache['x']; kw = cache['kw']
    result = {}
    names = ['self_attn.q_proj', 'self_attn.k_proj', 'self_attn.v_proj', 'self_attn.o_proj', 'mlp.gate_proj', 'mlp.up_proj', 'mlp.down_proj']
    groups = [['self_attn.q_proj', 'self_attn.k_proj', 'self_attn.v_proj'], ['self_attn.o_proj'], ['mlp.gate_proj', 'mlp.up_proj'], ['mlp.down_proj']]
    for li, layer in enumerate(layers):
        mods = {n: layer.get_submodule(n) for n in names}
        for grp in groups:
            H = {}
            def hook(name):
                def f(mod, inp, out):
                    x = inp[0].reshape(-1, inp[0].shape[-1]).float()
                    H[name] = H.get(name, 0) + x.T @ x
                return f
            hs = [mods[grp[0]].register_forward_hook(hook(grp[0]))]
            for x in xs: layer(x, **kw)
            for h in hs: h.remove()
            Hg = H[grp[0]] / (len(xs) * xs[0].shape[0] * xs[0].shape[1])
            for n in grp:
                if any(k and k in n for k in args.skip.split(',')): continue
                W = mods[n].weight.data.float()
                s, LV, Q, What = quantize_matrix(W, Hg, bits_for(n), rtn=args.rtn, gs=args.gs)
                mods[n].weight.data = What.to(mods[n].weight.dtype)
                result[f'{li}.{n}'] = (s.cpu(), LV.cpu(), Q.to(torch.uint8).cpu())
        xs = [layer(x, **kw)[0] if isinstance(layer(x, **kw), tuple) else layer(x, **kw) for x in xs]
        print(f'layer {li} done {time.time() - t0:.0f}s', flush=True)
    # tied embedding / lm_head: Hessian from final-norm outputs
    Hh = 0; cnt = 0
    for x in xs:
        h = model.model.norm(x).reshape(-1, x.shape[-1])
        Hh = Hh + h.T @ h; cnt += h.shape[0]
    E = model.model.embed_tokens.weight.data.float()
    if 'emb' in args.skip.split(','): What = E; s = LV = Q = torch.zeros(1)
    else: s, LV, Q, What = quantize_matrix(E, Hh / cnt, bits_for('emb'), rtn=args.rtn, gs=args.gs)
    model.model.embed_tokens.weight.data = What
    model.lm_head.weight = model.model.embed_tokens.weight
    result['emb'] = (s.cpu(), LV.cpu(), Q.to(torch.uint8).cpu())
    print(f'bits={args.bits} gs={args.gs} map={bits_map} rtn={args.rtn} ppl={ppl(model):.3f}  ({time.time() - t0:.0f}s)')
    if args.save: torch.save(result, args.save)
    g = tok("Once upon a time", return_tensors='pt').input_ids.to(dev)
    print(repr(tok.decode(model.generate(g, max_new_tokens=30, do_sample=False)[0])))


run()
