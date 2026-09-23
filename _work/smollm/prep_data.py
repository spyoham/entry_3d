import pyarrow.parquet as pq, numpy as np
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained('model')
EOS = tok.eos_token_id
def run(path, target, out):
    pf = pq.ParquetFile(path)
    buf = []; n = 0
    for rg in range(pf.num_row_groups):
        texts = pf.read_row_group(rg, columns=['text']).column('text').to_pylist()
        enc = tok(texts, add_special_tokens=False)['input_ids']
        for e in enc:
            buf.append(np.array(e + [EOS], dtype=np.uint16)); n += len(e) + 1
        print(path, n, flush=True)
        if n >= target: break
    np.concatenate(buf).tofile(out)
run('data/fwe0.parquet', 150_000_000, 'data/fwe.bin')
run('data/cosmo0.parquet', 70_000_000, 'data/cosmo.bin')
