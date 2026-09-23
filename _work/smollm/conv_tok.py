# Convert a sentencepiece tokenizer.model (Llama style: ▁ prefix + <0xXX> byte fallback) into
# the HF fast tokenizer.json that build.mjs reads, and verify it against sentencepiece itself.
#   py -3.12 conv_tok.py <model dir>
#
# transformers 5.17's own LlamaConverter crashes (SpmExtractor bug), so the merge extraction is
# done here: for every piece, every split into two known pieces is a merge candidate; candidates
# are ordered by the piece's sentencepiece score. This is the same rule transformers uses.
import sys, json, os
import sentencepiece as spm
from tokenizers import Tokenizer, decoders, normalizers
from tokenizers.models import BPE

d = sys.argv[1]
sp = spm.SentencePieceProcessor(model_file=os.path.join(d, 'tokenizer.model'))
pieces = [(sp.id_to_piece(i), sp.get_score(i)) for i in range(sp.get_piece_size())]
vocab = {p: i for i, (p, s) in enumerate(pieces)}
scores = dict(pieces)

merges = []
for piece, score in pieces:
    if len(piece) < 2 or piece.startswith('<'):
        continue
    local = []
    for k in range(1, len(piece)):
        l, r = piece[:k], piece[k:]
        if l in vocab and r in vocab:
            local.append((l, r, score))
    local.sort(key=lambda x: (vocab[x[0]], vocab[x[1]]))
    merges.extend(local)
merges.sort(key=lambda x: x[2], reverse=True)
merges = [(a, b) for a, b, _ in merges]

tok = Tokenizer(BPE(vocab, merges, unk_token='<unk>', fuse_unk=True, byte_fallback=True))
tok.normalizer = normalizers.Sequence([normalizers.Prepend('▁'), normalizers.Replace(' ', '▁')])
tok.decoder = decoders.Sequence([
    decoders.Replace('▁', ' '), decoders.ByteFallback(), decoders.Fuse(), decoders.Strip(content=' ', left=1),
])
tok.add_special_tokens(['<unk>', '<s>', '</s>'])
out = os.path.join(d, 'tokenizer.json')
tok.save(out)
j = json.load(open(out, encoding='utf-8'))
print('wrote', out, os.path.getsize(out), 'bytes;', 'vocab', len(j['model']['vocab']),
      'merges', len(j['model']['merges']), 'byte_fallback', j['model'].get('byte_fallback'))

texts = ["Once upon a time, there was a little girl named Lily.",
         'Tom said, "Hi!" and ran to the park with his dog.',
         "The 3 cats slept; then they woke up at 7 o'clock.",
         "A café 이모지 \U0001f600 test.",
         "\n\nOne day, Spot and Kitty played."]
bad = 0
for t in texts:
    a, b = sp.encode(t), tok.encode(t, add_special_tokens=False).ids
    ok = a == b
    bad += not ok
    print('ok  ' if ok else 'DIFF', repr(t[:42]), a[:12], '' if ok else b[:12])
    dec = tok.decode(b)
    if dec != t:
        print('     decode differs:', repr(dec[:70]))
print('encode mismatches:', bad, '/', len(texts))
