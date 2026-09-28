// Builds 조각 만들기.html (repo root, opens straight from disk) and
// page.artifact.html (the same body, for publishing) from page.src.html,
// template.json (node build.mjs) and a sample voice.
// usage: node gen-page.mjs [lameDelaySamples]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const delay = Number(process.argv[2] || 0);
const tpl = fs.readFileSync(path.join(HERE, 'template.json'), 'utf8').replace(/</g, '\u003c');
const sample = cp.execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(HERE, 'voice.wav'), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 26 });
const body = fs.readFileSync(path.join(HERE, 'page.src.html'), 'utf8')
    .replace('/*TEMPLATE*/', () => tpl)
    .replace("'/*SAMPLE*/'", () => `'${sample.toString('base64')}'`)
    .replace('/*LAME_DELAY*/0', String(delay));
fs.writeFileSync(path.join(HERE, 'page.artifact.html'), body);
const full = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';
const out = path.join(HERE, '..', '..', '조각 만들기.html');
fs.writeFileSync(out, full);
console.log('wrote', out, full.length, 'bytes; lame delay', delay);
