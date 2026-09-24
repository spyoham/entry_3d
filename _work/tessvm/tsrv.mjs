// Static server for the tessvm harness: serves ext/ at /, and an unpacked .ent at /ent/
// usage: node tsrv.mjs [port]   ; POST /load?file=<abs .ent path> unpacks it into ./ent
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import url from 'node:url';
import zlib from 'node:zlib';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EXT = path.join(HERE, 'ext');
const ENT = path.join(HERE, 'ent');
const port = Number(process.argv[2] || 3100);
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
export function unpack(file) {
    fs.rmSync(ENT, { recursive: true, force: true });
    fs.mkdirSync(ENT, { recursive: true });
    const tarBuf = zlib.gunzipSync(fs.readFileSync(file));
    cp.execSync('tar -xf -', { cwd: ENT, input: tarBuf });
}
http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/load') {
        try { unpack(u.searchParams.get('file')); res.end('ok'); } catch (e) { res.statusCode = 500; res.end(String(e)); }
        return;
    }
    let p = decodeURIComponent(u.pathname);
    const f = p.startsWith('/ent/') ? path.join(ENT, p.slice(5)) : path.join(EXT, p);
    fs.readFile(f, (err, buf) => {
        if (err) { res.statusCode = 404; res.end('nf'); return; }
        res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
        res.setHeader('cache-control', 'no-store');
        res.end(buf);
    });
}).listen(port, () => console.log('tsrv on', port));
