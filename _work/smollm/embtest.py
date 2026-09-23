import torch, math, sys
sys.argv=['x','3']
src=open('quant.py',encoding='utf8').read()
exec(src.split('def get_calib')[0])
@torch.no_grad()
def ppl(m, n=10, L=512):
    nll=0; cnt=0
    for i in range(n):
        x=test_ids[:, i*L:(i+1)*L].to(dev); out=m(x, labels=x); nll+=out.loss.item()*(L-1); cnt+=L-1
    return math.exp(nll/cnt)
E0 = model.model.embed_tokens.weight.data.float().clone()
print('base', ppl(model))
def test(tag, What, tie=True):
    rel = ((What-E0).norm()/E0.norm()).item()
    if tie:
        model.model.embed_tokens.weight.data = What; model.lm_head.weight = model.model.embed_tokens.weight
        print(tag, 'rel', round(rel,4), 'ppl', round(ppl(model),2), flush=True)
    else:
        # input side only / output side only
        model.lm_head.weight = torch.nn.Parameter(E0.clone()); model.model.embed_tokens.weight.data = What
        p1 = ppl(model)
        model.model.embed_tokens.weight.data = E0.clone(); model.lm_head.weight = torch.nn.Parameter(What)
        p2 = ppl(model)
        print(tag, 'rel', round(rel,4), 'input-only ppl', round(p1,2), 'output-only ppl', round(p2,2), flush=True)
        model.model.embed_tokens.weight.data = E0.clone(); model.lm_head.weight = model.model.embed_tokens.weight
for gs in [0, 64, 32]:
    S, LV, Q, What = quantize_matrix(E0, None, 3, rtn=True, gs=gs)
    test(f'rtn3 gs{gs}', What, tie=False)
