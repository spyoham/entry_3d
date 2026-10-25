// Pack a project (objects with in-memory PNG/WAV assets) into an Entry .ent (tar.gz)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import cp from 'node:child_process';
import crypto from 'node:crypto';

export function packEnt(outFile, { name, objects, variables, functions, messages = [], tables = [], speed = 60, tmpDir }) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpDir, 'temp'), { recursive: true });
    const written = new Map();   // content hash -> fileurl
    const store = (buf, kind, ext) => {
        const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 32);
        const key = kind + h;
        if (written.has(key)) return { hash: h, fileurl: written.get(key) };
        const rel = `temp/${h.slice(0, 2)}/${h.slice(2, 4)}/${kind}/${h}.${ext}`;
        const abs = path.join(tmpDir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, buf);
        written.set(key, rel);
        return { hash: h, fileurl: rel };
    };
    const sceneId = 'sc01';
    const outObjects = objects.map((o) => {
        const pictures = (o.pictures || []).map((p) => {
            const { hash, fileurl } = store(p.buf, 'image', 'png');
            return { id: p.id, dimension: { width: p.w, height: p.h }, filename: hash, name: p.name, imageType: 'png', fileurl };
        });
        const sounds = (o.sounds || []).map((s) => {
            const { hash, fileurl } = store(s.buf, 'sound', s.ext || 'wav');
            return { id: s.id, name: s.name, fileurl, filename: hash, ext: '.' + (s.ext || 'wav'), duration: s.duration || 1 };
        });
        const ent = {
            x: 0, y: 0, regX: 0, regY: 0, scaleX: 1, scaleY: 1, rotation: 0, direction: 90, width: 1, height: 1, visible: true, font: 'undefinedpx ',
            ...(pictures[0] ? { width: pictures[0].dimension.width, height: pictures[0].dimension.height, regX: pictures[0].dimension.width / 2, regY: pictures[0].dimension.height / 2 } : {}),
            ...(o.entity || {}),
        };
        const out = {
            id: o.id, name: o.name, objectType: o.objectType || 'sprite', rotateMethod: 'free', scene: sceneId,
            sprite: { pictures, sounds }, selectedPictureId: pictures[0] ? pictures[0].id : undefined, lock: false,
            script: JSON.stringify(o.script && o.script.length ? o.script : [[]]), entity: ent,
        };
        if (o.objectType === 'textBox') { out.text = o.text || ''; out.entity.text = o.text || ''; }
        return out;
    });
    const project = {
        objects: outObjects,
        scenes: [{ id: sceneId, name: '장면 1' }],
        variables, messages, functions, tables, speed,
        interface: { canvasWidth: 480, menuWidth: 280, object: outObjects[0].id },
        expansionBlocks: [], aiUtilizeBlocks: [], hardwareLiteBlocks: [], externalModules: [], externalModulesLite: [],
        name, isPracticalCourse: false,
    };
    fs.writeFileSync(path.join(tmpDir, 'temp', 'project.json'), JSON.stringify(project));
    const tarFile = path.join(tmpDir, 'out.tar');
    cp.execSync(`tar -cf out.tar temp`, { cwd: tmpDir });
    fs.writeFileSync(outFile, zlib.gzipSync(fs.readFileSync(tarFile), { level: 9 }));
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return project;
}
