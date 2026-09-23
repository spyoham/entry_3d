import torch, time, sys, os
from transformers import AutoModelForCausalLM, AutoTokenizer

dev='cuda'
tok=AutoTokenizer.from_pretrained('model')
model=AutoModelForCausalLM.from_pretrained('model', torch_dtype=torch.float32).to(dev).eval()

text=open("wt2_test.txt",encoding="utf8").read()
ids=tok(text,return_tensors='pt').input_ids[:, :40*512]
torch.save(ids,'wt2_test_ids.pt')
def ppl(m, n=40, L=512):
    nll=0; cnt=0
    with torch.no_grad():
        for i in range(n):
            x=ids[:, i*L:(i+1)*L].to(dev)
            out=m(x, labels=x)
            nll+=out.loss.item()*(L-1); cnt+=L-1
    return float(torch.exp(torch.tensor(nll/cnt)))
print('fp32 ppl', ppl(model))
g=tok("Once upon a time", return_tensors='pt').input_ids.to(dev)
print(tok.decode(model.generate(g, max_new_tokens=30, do_sample=False)[0]))
