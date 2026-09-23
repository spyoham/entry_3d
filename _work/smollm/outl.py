import torch, math
from transformers import AutoModelForCausalLM
m = AutoModelForCausalLM.from_pretrained('model', dtype=torch.float32)
rows=[]
for n,p in m.named_parameters():
    if p.dim()==2:
        W=p.data; r=(W.abs().max()/W.pow(2).mean().sqrt()).item()
        g=W.view(W.shape[0],-1,64); gr=(g.abs().amax(-1)/g.pow(2).mean(-1).sqrt()).max().item()
        rows.append((r,gr,n))
rows.sort(reverse=True)
for r in rows[:12]: print(f'{r[0]:8.1f} {r[1]:6.2f} {r[2]}')
