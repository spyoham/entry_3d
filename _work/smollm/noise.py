import torch, math
import torch.nn.functional as F
from transformers import AutoModelForCausalLM
dev='cuda'
m = AutoModelForCausalLM.from_pretrained('model', dtype=torch.float32).to(dev).eval()
test_ids = torch.load('wt2_test_ids.pt')
@torch.no_grad()
def ppl(n=20, L=512):
    nll=0; cnt=0
    for i in range(n):
        x=test_ids[:, i*L:(i+1)*L].to(dev)
        logits=m(x).logits.float()
        nll+=F.cross_entropy(logits[0,:-1], x[0,1:], reduction='sum').item(); cnt+=L-1
    return math.exp(nll/cnt)
orig={n:p.data.clone() for n,p in m.named_parameters() if p.dim()==2}
print('base', ppl())
for tag, filt in [('linears', lambda n: 'embed' not in n), ('emb', lambda n: 'embed' in n)]:
    for rel in [0.014, 0.05]:
        torch.manual_seed(0)
        for n,p in m.named_parameters():
            if n in orig:
                p.data = orig[n].clone()
                if filt(n): p.data += torch.randn_like(p) * orig[n].pow(2).mean().sqrt() * rel
        print(tag, rel, ppl(), flush=True)
for n,p in m.named_parameters():
    if n in orig: p.data = orig[n].clone()
