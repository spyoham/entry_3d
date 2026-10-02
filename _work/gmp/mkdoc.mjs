// Fill doc.md's {{...}} with the API list and the measured numbers
// usage: node mkdoc.mjs out.md
import fs from 'node:fs';
import cp from 'node:child_process';
const api = cp.execSync('node apilist.mjs md').toString().trim();
const napi = (api.match(/— (\d+)개/g) || []).reduce((s, x) => s + Number(x.match(/\d+/)[0]), 0);
const fin = fs.readFileSync('bench/final.txt', 'utf8');
const p10k = fs.readFileSync('bench/p10k.txt', 'utf8');
const mul = fs.existsSync('bench/mul.txt') ? fs.readFileSync('bench/mul.txt', 'utf8') : '';
const pi = {}; for (const m of (fin + p10k).matchAll(/pi (\d+): total ([\d.]+) s \(split ([\d.]+), sqrt ([\d.]+), div ([\d.]+)\)/g)) pi[m[1]] = m.slice(2).map(Number);
const mr = {}; for (const m of fin.matchAll(/M(\d+): ([\d.]+) s -> (\d)/g)) mr[m[1]] = [Number(m[2]), m[3]];
const micro = `| 블록 | 시간 |
|---|---|
| 반복 한 바퀴 (조건·증가·딜레이 제거 블록) | 4.2 µs |
| 지역 변수 정하기 | 1.2 µs |
| \`+ − ×\` (BigNumber를 거침, 수 크기와 무관) | 약 1.0 µs |
| \`÷\` | 2.0 µs |
| \`몫\`·\`나머지\` (일반 계산) | 0.6 µs |
| \`제곱\` | 0.4 µs |
| 리스트 항목 읽기 / 바꾸기 | 0.4 / 1.6 µs |
| 전역 변수 읽기 / **정하기** | 1.0 / **5.6 µs** |
| 함수 호출 (지역 변수 0개 / 6개) | 6 / 20 µs |
| 결과값 함수 (본문이 비면) | **한 프레임 (33 ms)** |

곱셈 안쪽 반복의 방식별 비용 (64×64자리, 곱 하나에):

| 방식 | 시간 |
|---|---|
| 이중 반복 (행 단위) | 11.2 µs |
| 행 단위, 4배 펼침 | 8.9 µs |
| 열 단위(Comba), 8배 펼침 | 7.3 µs |
| 파라미터 타일 8×8 | 3.9 µs |
| **파라미터 타일 16×16** | **3.1 µs** |
| 파라미터 타일 32×32 | 3.6 µs |
| 제곱 타일 16×16 / 32×32 (곱 하나 환산) | 2.0 / 1.7 µs |`;
const steps = `| 단계 | π 1000자리 | M127 판정 | M521 판정 |
|---|---|---|---|
| 처음 (타일 곱셈, Knuth 나눗셈, 밀러-라빈 10번) | 2.95초 | 4.03초 | 84.15초 |
| + 올림 정리 2문장·4배 펼침, 타일 크기 고르기, Barrett 지역 변수 | 1.58초 | 3.91초 | 61.15초 |
| + 0 채우기 없애기, 제곱 2ab 타일 | 1.57초 | 3.49초 | 57.90초 |
| + BPSW (GMP와 같은 판정 방식) | 1.57초 | **0.94초** | **15.23초** |

- **Newton 나눗셈·제곱근** (π 3000자리): Knuth 방식 20.86초 → Newton 7.74초. 그중 √10005가 12.43초 → 1.02초.
  - π 300자리에서도 제곱근은 Newton이 빨라서(0.25초 → 0.07초) 8자리부터 씁니다.
  - 나눗셈은 150자리 근처에서 두 방식이 비슷해서 120자리부터 씁니다.
- **Karatsuba** (곱셈 한 번): 384자리 507ms → 373ms, 192자리 133ms → 119ms, 128자리 61ms → 58ms, 64자리는 오히려 느림.
  - 제곱은 학교식 제곱 타일이 곱의 절반만 계산하므로 300자리부터 씁니다.
  - 기본 크기를 32자리로 줄이면 0 채움 때문에 훨씬 느려졌습니다(384자리 729ms).`;
const row = (n) => pi[n] ? `| π ${n}자리 | ${pi[n][0].toFixed(2)}초 | 이진 분할 ${pi[n][1].toFixed(2)} · √ ${pi[n][2].toFixed(2)} · 곱셈·나눗셈 ${pi[n][3].toFixed(2)} |` : '';
const mrow = (p, d) => mr[p] ? `| 2^${p}−1 (${d}자리) 소수 판정 | ${mr[p][0].toFixed(2)}초 | \`mpz_probab_prime_p\` → ${mr[p][1]} |` : '';
let final = `| 작업 | 시간 | 내역 |\n|---|---|---|\n` + [row(100), row(1000), row(3000), row(10000), mrow(127, 39), mrow(521, 157), mrow(607, 183), mrow(1279, 386)].filter(Boolean).join('\n');
if (mul) final += '\n\n곱셈 한 번 (`mpz_mul`, 같은 크기 두 수):\n\n' + mul.trim();
final += '\n\n(데모 화면에 나오는 시간은 앞뒤로 한 프레임씩 기다리므로 0.03초쯤 더 깁니다.)';
let doc = fs.readFileSync('doc.md', 'utf8');
doc = doc.replaceAll('{{NAPI}}', String(napi)).replace('{{API}}', api).replace('{{MICRO}}', micro).replace('{{STEPS}}', steps).replace('{{FINAL}}', final)
    .replace('{{PI1000}}', pi[1000] ? pi[1000][0].toFixed(1) : '?').replace('{{M521}}', mr[521] ? mr[521][0].toFixed(0) : '?');
fs.writeFileSync(process.argv[2] || 'out.md', doc);
console.log('napi', napi, 'pi', Object.keys(pi), 'mr', Object.keys(mr));
