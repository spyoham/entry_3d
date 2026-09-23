# Can a low-rank proxy of the lm head preselect the top-k tokens?
import torch, numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
torch.manual_seed(0)
m = AutoModelForCausalLM.from_pretrained('model', dtype=torch.float32).eval()
tok = AutoTokenizer.from_pretrained('model')
text = open('wt2_test.txt', encoding='utf8').read()[:20000]
ids = tok(text, return_tensors='pt').input_ids[:, :1024]
with torch.no_grad():
    hs = m(ids, output_hidden_states=True).hidden_states[-1][0]      # final-norm output (N, 576)
E = m.model.embed_tokens.weight.data                                   # (V, 576)
L = hs @ E.T                                                           # exact logits
true_top = L.topk(40, dim=1).indices
def quant2(A, gs=64, L=4):
    # 2-bit, per (row, 64-col group) RMS scale, per-column 4-level kmeans (quick)
    m_, n = A.shape
    S = A.view(m_, -1, gs).pow(2).mean(-1).sqrt().clamp(min=1e-8)
    An = (A.view(m_, -1, gs) / S[..., None]).view(m_, n)
    qs = torch.quantile(An[torch.randperm(m_)[:20000]], (torch.arange(L) + 0.5) / L, dim=0).T
    for _ in range(8):
        a = (An.unsqueeze(-1) - qs.unsqueeze(0)).abs().argmin(-1)
        for l in range(L):
            msk = a == l
            qs[:, l] = torch.where(msk.sum(0) > 0, (An * msk).sum(0) / msk.sum(0).clamp(min=1), qs[:, l])
    a = (An.unsqueeze(-1) - qs.unsqueeze(0)).abs().argmin(-1)
    Aq = torch.gather(qs.T, 0, a) if False else qs[torch.arange(n)[None, :].expand(m_, n), a]
    return (Aq.view(m_, -1, gs) * S[..., None]).view(m_, n)
for basis in ['H', 'EH']:
    if basis == 'E': _, _, Vt = torch.linalg.svd(E, full_matrices=False)
    elif basis == 'H': _, _, Vt = torch.linalg.svd(hs, full_matrices=False)
    else:
        C = hs.T @ hs / hs.shape[0]; ev, evec = torch.linalg.eigh(C); Ch = evec @ torch.diag(ev.clamp(min=0).sqrt()) @ evec.T
        _, _, Vt = torch.linalg.svd(E @ Ch, full_matrices=False)
        # project in whitened coordinates: logits = (E Ch)(Ch^-1 h); keep top-r of E Ch
        Chi = evec @ torch.diag(1 / ev.clamp(min=1e-6).sqrt()) @ evec.T
    for r in [64, 128]:
        P = Vt[:r].T                                                    # (576, r)
        if basis == 'EH':
            A = (E @ Ch) @ P; z = hs @ Chi @ P
        else:
            A = E @ P; z = hs @ P
        for q in [4, 16]:
            Aq = quant2(A, gs=32, L=q)
            prox = z @ Aq.T
            for C in [200, 400]:
                pt = prox.topk(C, dim=1).indices
                rec = np.mean([len(set(true_top[i].tolist()) & set(pt[i].tolist())) / 40 for i in range(0, len(hs), 4)])
                rec1 = np.mean([true_top[i, 0].item() in set(pt[i].tolist()) for i in range(len(hs))])
                print(f'{basis} r={r} q2={q} C={C}: recall@40 {rec:.3f}  top1-in {rec1:.3f}', flush=True)
