# Bits per character on a raw text file - the only fair way to compare models that use
# different tokenizers (perplexity per token is not comparable across vocabularies).
#   py -3.12 bpc.py <text file> <model dir> [<model dir> ...]
import sys, math, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

path = sys.argv[1]
text = open(path, encoding='utf-8').read()
text = text[len(text) // 2:][:400_000]          # same slice quant.py evaluates on
dev = 'cuda' if torch.cuda.is_available() else 'cpu'

for d in sys.argv[2:]:
    tok = AutoTokenizer.from_pretrained(d)
    m = AutoModelForCausalLM.from_pretrained(d, dtype=torch.float32).to(dev).eval()
    ids = tok(text, return_tensors='pt').input_ids[0]
    L, nll, ntok = 512, 0.0, 0
    with torch.no_grad():
        for i in range(0, (ids.numel() // L) * L, L):
            x = ids[i:i + L].unsqueeze(0).to(dev)
            nll += m(x, labels=x).loss.item() * (L - 1)
            ntok += L - 1
    used = tok.decode(ids[:ntok + 1])           # characters those tokens actually cover
    bpc = nll / math.log(2) / len(used)
    print(f'{d:28s} vocab {m.config.vocab_size:>6}  {ntok} tokens over {len(used)} chars  '
          f'ppl/token {math.exp(nll / ntok):7.3f}  **{bpc:.4f} bits/char**')
