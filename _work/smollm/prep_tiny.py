# Tokenize a TinyStories text dump into a uint16 .bin for qat.py.
#   py -3.12 prep_tiny.py <model dir> <in.txt> <out.bin> [max tokens]
# Stories in the dump are separated by a line "<|endoftext|>"; each becomes one sequence
# terminated by the tokenizer's eos id.
import sys, numpy as np
from transformers import AutoTokenizer

d, inp, out = sys.argv[1:4]
limit = float(sys.argv[4]) if len(sys.argv) > 4 else float('inf')
tok = AutoTokenizer.from_pretrained(d)
eos = tok.eos_token_id if tok.eos_token_id is not None else 2
text = open(inp, encoding='utf-8').read()
stories = [s.strip() for s in text.split('<|endoftext|>')]
buf, n = [], 0
B = 512
for i in range(0, len(stories), B):
    chunk = [s for s in stories[i:i + B] if s]
    if not chunk:
        continue
    for e in tok(chunk, add_special_tokens=False)['input_ids']:
        buf.append(np.array(e + [eos], dtype=np.uint16))
        n += len(e) + 1
    if i % (B * 20) == 0:
        print(f'{i}/{len(stories)} stories, {n/1e6:.1f}M tokens', flush=True)
    if n >= limit:
        break
np.concatenate(buf).tofile(out)
print('wrote', out, f'{n/1e6:.2f}M tokens')
