// Check the renderer against a plain ray tracer: one ray per pixel, every sphere
// tested for every ray, in floating point. The model (tables, light, fog, the
// rounding of a colour) is the renderer's; the geometry is worked out afresh.
//   node test.mjs [--png]        prints the share of pixels that differ by more than one colour step
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { createSim, SS, W, H } from './sim.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const FOC = 300, AMB = 74, DIFK = 182, CELL = 1024, FOGDIV = 59000000, FADE0 = 56, FADE1 = 150;

export function reference(s) {
    const g = (n) => s.peek(n);
    const L = (n) => s.peek(n);                 // a list (array, 0-based here)
    const NS = L('SWX').length - g('NM');           // the last entries are the spheres round the meshes
    const camX = g('camX'), camY = g('camY'), camZ = g('camZ');
    const Rx = g('gRx'), Rz = g('gRz'), Fx = g('gFx'), Fy = g('gFy'), Fz = g('gFz'), Ux = g('gUx'), Uy = g('gUy'), Uz = g('gUz');
    const lx = g('gLx'), ly = g('gLy'), lz = g('gLz'), LL = g('gLL');
    const rowH = g('rowH'), nrow = g('nrow'), v0 = g('v0'), flatK = g('flatK');
    const SA = L('SA'), SB = L('SB'), SC = L('SC'), SRAD = L('SRAD'), SMRK = L('SMRK'), SMGK = L('SMGK'), SMBK = L('SMBK'), SKR2 = L('SKR2'), SSPC = L('SSPC');
    const SER = L('SER'), SEG = L('SEG'), SEB = L('SEB'), SEKR = L('SEKR'), SEKG = L('SEKG'), SEKB = L('SEKB');
    const SKY = [L('SKYR'), L('SKYG'), L('SKYB')], FL = [L('FLR'), L('FLG'), L('FLB')], SPECT = L('SPECT'), DTH = L('DTH');
    // the structure: triangles from the camera-space vertices (Moeller-Trumbore, in floating point)
    const VA = L('VA'), VB = L('VB'), VC = L('VC'), TV1 = L('TV1'), TV2 = L('TV2'), TV3 = L('TV3');
    const TLIT = L('TLIT'), TCL = L('TCL'), TCS = L('TCS'), TLc = [L('TLR'), L('TLG'), L('TLB')], TSc = [L('TSR'), L('TSG'), L('TSB')], TKR = L('TKR'), TMESH = L('TMESH'), TWN = [L('TWX'), L('TWY'), L('TWZ')], sunW = [g('LWX'), g('LWY'), g('LWZ')];
    const faces = (t) => TWN[0][t] * sunW[0] + TWN[1][t] * sunW[1] + TWN[2][t] * sunW[2] > 0.02 * 1048576;
    const tris = TV1.map((_, t) => {
        const p = [TV1[t], TV2[t], TV3[t]].map(i => [VA[i - 1], VB[i - 1], VC[i - 1]]);
        const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
        const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        return { p0: p[0], e1, e2, n };
    });
    // nearest triangle the ray enters, beyond tmin; returns [index, t]
    const hitTri = (ox, oy, oz, dx, dy, dz, tmin, skip = 0) => {
        let best = -1, bt = Infinity;
        for (let t = 0; t < tris.length; t++) {
            if (TMESH[t] === skip) continue;
            const T = tris[t];
            const den = T.n[0] * dx + T.n[1] * dy + T.n[2] * dz;
            if (den >= 0) continue;
            const px = dy * T.e2[2] - dz * T.e2[1], py = dz * T.e2[0] - dx * T.e2[2], pz = dx * T.e2[1] - dy * T.e2[0];
            const det = T.e1[0] * px + T.e1[1] * py + T.e1[2] * pz;
            if (Math.abs(det) < 1e-9) continue;
            const sx = ox - T.p0[0], sy = oy - T.p0[1], sz = oz - T.p0[2];
            const uu = (sx * px + sy * py + sz * pz) / det;
            if (uu < 0 || uu > 1) continue;
            const qx = sy * T.e1[2] - sz * T.e1[1], qy = sz * T.e1[0] - sx * T.e1[2], qz = sx * T.e1[1] - sy * T.e1[0];
            const vv = (dx * qx + dy * qy + dz * qz) / det;
            if (vv < 0 || uu + vv > 1) continue;
            const tt = (T.e2[0] * qx + T.e2[1] * qy + T.e2[2] * qz) / det;
            if (tt > tmin && tt < bt) { bt = tt; best = t; }
        }
        return [best, bt];
    };
    const sph = [];
    for (let i = 0; i < NS; i++) sph.push({ a: SA[i], b: SB[i], c: SC[i], r: SRAD[i], r2: SRAD[i] * SRAD[i] });
    const hitSphere = (ox, oy, oz, dx, dy, dz, skip) => {
        // nearest sphere along o + t d (t > 0); returns [index, t]
        const A = dx * dx + dy * dy + dz * dz;
        let best = -1, bt = Infinity;
        for (let j = 0; j < NS; j++) {
            if (j === skip) continue;
            const S = sph[j], wx = S.a - ox, wy = S.b - oy, wz = S.c - oz;
            const b = wx * dx + wy * dy + wz * dz;
            if (b <= 0) continue;
            const disc = b * b - A * (wx * wx + wy * wy + wz * wz - S.r2);
            if (disc <= 0) continue;
            const t = (b - Math.sqrt(disc)) / A;
            if (t < bt) { bt = t; best = j; }
        }
        return [best, bt];
    };
    const shaded = (px, py, pz, skip) => {
        if (hitTri(px, py, pz, lx, ly, lz, 24 / 4096)[0] >= 0) return true;
        for (let j = 0; j < NS; j++) {
            if (j === skip) continue;
            const S = sph[j], wx = S.a - px, wy = S.b - py, wz = S.c - pz;
            const wl = wx * lx + wy * ly + wz * lz;
            if (wl > 0 && wl * wl - (wx * wx + wy * wy + wz * wz - S.r2) * LL > 0) return true;
        }
        return false;
    };
    const q = (val, dth) => Math.min(15, Math.floor((val + dth) / 16));
    const envColour = (px, py, pz, rx, ry, rz, ar) => {
        const dw = ry * Uy + rz * Fy;
        if (dw < 0) {
            const hp = camY + (py * Uy + pz * Fy) / 1024;
            const t3 = hp * 1024 / -dw;
            const ex = rx * t3, ey = ry * t3, ez = rz * t3;
            const kf2 = Math.floor((ex * ex + ey * ey + ez * ez) / FOGDIV);
            let fi = 252;
            if (kf2 < flatK) {
                const fx = px + ex, fy = py + ey, fz = pz + ez;
                const wx = camX + (fx * Rx + fy * Ux + fz * Fx) / 1024, wz = camZ + (fx * Rz + fy * Uz + fz * Fz) / 1024;
                const par = ((Math.floor(wx / CELL) + Math.floor(wz / CELL)) % 2 + 2) % 2;
                fi = kf2 * 4 + par * 2 + (shaded(fx, fy, fz, -1) ? 1 : 0);
            } else if (kf2 < 63) fi = kf2 * 4;
            return [FL[0][fi], FL[1][fi], FL[2][fi]];
        }
        const si = Math.min(63, Math.floor(dw * dw * 63 / (ar * 1048576)));
        return [SKY[0][si], SKY[1][si], SKY[2][si]];
    };
    const out = new Uint8Array(480 * nrow * 3);          // colour levels 0..15 per channel
    const kind = new Uint16Array(480 * nrow);            // what the pixel shows (for the edge test)
    for (let k = 0; k < nrow; k++) {
        const v = v0 - k * rowH, A0 = v * v + FOC * FOC, dth = DTH[k % 4];
        const dyw = v * Uy + FOC * Fy;
        // the row's floor colours, as the renderer makes them (the floor is not dithered)
        let FC = null, kf = 0, cf = 0, tF = 0;
        const dthF = 8;
        if (dyw < 0) {
            const tq = Math.floor(camY * 4194304 / -dyw);
            tF = camY * 1024 / -dyw;
            kf = Math.min(63, Math.floor(tq * tq * A0 / (16777216 * FOGDIV)));
            const sqA = Math.floor(Math.sqrt(A0));
            const cpp = Math.floor(tq / (16 * CELL)), cpr = Math.floor(tq * Uy * rowH * sqA / (-dyw * 16 * CELL));
            const fm = Math.max(cpp, cpr);
            cf = 256;
            if (fm > FADE0) cf = Math.floor((FADE1 - fm) * 256 / (FADE1 - FADE0));
            if (cf < 0) cf = 0;
            if (kf >= flatK) cf = 0;
            FC = [];
            for (let sh = 0; sh < 2; sh++) {
                const fi = kf * 4 + sh;
                const c0 = [], c1 = [];
                for (let ch = 0; ch < 3; ch++) {
                    const fa = FL[ch][fi], fb = FL[ch][fi + 2];
                    c0.push(q(Math.floor(((fa + fb) * 256 + (fa - fb) * cf) / 512), dthF));
                    c1.push(q(Math.floor(((fa + fb) * 256 - (fa - fb) * cf) / 512), dthF));
                }
                FC[sh] = c0; FC[2 + sh] = c1;
            }
        }
        for (let p = 0; p < 480; p++) {
            const u = p - 240, o = (k * 480 + p) * 3;
            let [i, t] = hitSphere(0, 0, 0, u, v, FOC, -1);
            const [ti, tt] = hitTri(0, 0, 0, u, v, FOC, 0);
            let col, kd;
            if (ti >= 0 && tt < t) {
                // a triangle: flat, in the sun or not
                const px = u * tt, py = v * tt, pz = FOC * tt;
                const lit = faces(ti) && !shaded(px, py, pz, -1);
                const c = (lit ? TCL[ti] : TCS[ti]) - 1;
                col = [Math.floor(c / 256), Math.floor(c / 16) % 16, c % 16];
                kd = 300 + ti * 2 + (lit ? 0 : 1);
                const kq = TKR[ti];
                if (kq > 0) {
                    // a faint mirror: the flat colour and what the mirror ray meets
                    const T = tris[ti], nl = Math.hypot(T.n[0], T.n[1], T.n[2]), n = [T.n[0] / nl, T.n[1] / nl, T.n[2] / nl];
                    const dn = u * n[0] + v * n[1] + FOC * n[2];
                    const rx = 2 * u - 4 * dn * n[0], ry = 2 * v - 4 * dn * n[1], rz = 2 * FOC - 4 * dn * n[2];
                    const ar = rx * rx + ry * ry + rz * rz;
                    let c2;
                    const [j, t2] = hitSphere(px, py, pz, rx, ry, rz, -1);
                    const [tj, t3m] = hitTri(px, py, pz, rx, ry, rz, 24 / 4096, TMESH[ti]);     // (a mesh does not show in its own mirror)
                    if (tj >= 0 && t3m < t2) { const C = TLIT[tj] === 1 ? TLc : TSc; c2 = [C[0][tj], C[1][tj], C[2][tj]]; }
                    else if (j >= 0) {
                        const S2 = sph[j];
                        const n2 = (px + rx * t2 - S2.a) * lx + (py + ry * t2 - S2.b) * ly + (pz + rz * t2 - S2.c) * lz;
                        const l2 = AMB + (n2 > 0 ? Math.floor(n2 * DIFK / (S2.r * 1024)) : 0);
                        c2 = [Math.floor(SER[j] * l2 / 256) + SEKR[j], Math.floor(SEG[j] * l2 / 256) + SEKG[j], Math.floor(SEB[j] * l2 / 256) + SEKB[j]];
                    } else c2 = envColour(px, py, pz, rx, ry, rz, ar);
                    const base = lit ? TLc : TSc;
                    col = [0, 1, 2].map(ch => Math.min(15, Math.floor(((base[ch][ti] * (256 - kq) + c2[ch] * kq) * 256 + 524288) / 1048576)));
                }
            } else if (i >= 0) {
                const S = sph[i];
                const px = u * t, py = v * t, pz = FOC * t;
                const nx = px - S.a, ny = py - S.b, nz = pz - S.c;
                const nl = nx * lx + ny * ly + nz * lz;
                let li = AMB, lit = false;
                kd = 10 + i * 40;
                if (nl > 0) { lit = !shaded(px, py, pz, i); if (lit) li = AMB + Math.floor(nl * DIFK / (S.r * 1024)); else kd += 20; }
                let c2 = [0, 0, 0], spec = 0;
                const kr2 = SKR2[i], ssp = SSPC[i];
                if (kr2 > 0 || ssp > 0) {
                    const dn = u * nx + v * ny + FOC * nz;
                    const rx = 2 * u - 4 * dn * nx / S.r2, ry = 2 * v - 4 * dn * ny / S.r2, rz = 2 * FOC - 4 * dn * nz / S.r2;
                    const ar = rx * rx + ry * ry + rz * rz;
                    if (lit && ssp > 0) { const sd = rx * lx + ry * ly + rz * lz; if (sd > 0) spec = Math.floor(SPECT[Math.min(256, Math.floor(sd * sd * 256 / (ar * LL)))] * ssp / 256); }
                    if (kr2 > 0) {
                        const [j, t2] = hitSphere(px, py, pz, rx, ry, rz, i);
                        const [tj, t3m] = hitTri(px, py, pz, rx, ry, rz, 24 / 4096);
                        if (tj >= 0 && t3m < t2) {
                            const C = TLIT[tj] === 1 ? TLc : TSc;
                            c2 = [C[0][tj], C[1][tj], C[2][tj]];
                            if (kr2 >= 25600) kd += 5;
                        } else if (j >= 0) {
                            const T = sph[j];
                            const n2 = (px + rx * t2 - T.a) * lx + (py + ry * t2 - T.b) * ly + (pz + rz * t2 - T.c) * lz;
                            const l2 = AMB + (n2 > 0 ? Math.floor(n2 * DIFK / (T.r * 1024)) : 0);
                            c2 = [Math.floor(SER[j] * l2 / 256) + SEKR[j], Math.floor(SEG[j] * l2 / 256) + SEKG[j], Math.floor(SEB[j] * l2 / 256) + SEKB[j]];
                            if (kr2 >= 25600) kd += 1 + j;
                        } else {
                            const dw = ry * Uy + rz * Fy;
                            if (dw < 0) {
                                const hp = camY + (py * Uy + pz * Fy) / 1024;
                                const t3 = hp * 1024 / -dw;
                                const ex = rx * t3, ey = ry * t3, ez = rz * t3;
                                const kf2 = Math.floor((ex * ex + ey * ey + ez * ez) / FOGDIV);
                                let fi = 252;
                                if (kf2 < flatK) {
                                    const fx = px + ex, fy = py + ey, fz = pz + ez;
                                    const wx = camX + (fx * Rx + fy * Ux + fz * Fx) / 1024, wz = camZ + (fx * Rz + fy * Uz + fz * Fz) / 1024;
                                    const par = ((Math.floor(wx / CELL) + Math.floor(wz / CELL)) % 2 + 2) % 2;
                                    const sh = shaded(fx, fy, fz, -1) ? 1 : 0;
                                    fi = kf2 * 4 + par * 2 + sh;
                                    if (kr2 >= 25600) kd += 12 + par + sh * 2;
                                } else if (kf2 < 63) fi = kf2 * 4;
                                c2 = [FL[0][fi], FL[1][fi], FL[2][fi]];
                            } else {
                                const si = Math.min(63, Math.floor(dw * dw * 63 / (ar * 1048576)));
                                c2 = [SKY[0][si], SKY[1][si], SKY[2][si]];
                                if (kr2 >= 25600) kd += 11;
                            }
                        }
                    }
                }
                const mk = [SMRK[i], SMGK[i], SMBK[i]];
                col = [0, 1, 2].map(ch => Math.min(15, Math.floor((mk[ch] * li + c2[ch] * kr2 + (spec + 8) * 65536) / 1048576)));
            } else if (dyw < 0) {
                const wx = camX + tF * (u * Rx + v * Ux + FOC * Fx) / 1024, wz = camZ + tF * (u * Rz + v * Uz + FOC * Fz) / 1024;
                const par = ((Math.floor(wx / CELL) + Math.floor(wz / CELL)) % 2 + 2) % 2;
                const sh = kf < 63 && shaded(u * tF, v * tF, FOC * tF, -1) ? 1 : 0;
                col = FC[(cf > 0 ? par : 0) * 2 + sh];
                kd = 1 + (cf > 0 ? par : 0) + sh * 2;
            } else {
                const nn = dyw * dyw * 63;
                const si = Math.min(63, Math.floor(nn / (1048576 * (u * u + A0))));
                col = [q(SKY[0][si], dth), q(SKY[1][si], dth), q(SKY[2][si], dth)];
                kd = 5;
            }
            out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; kind[k * 480 + p] = kd;
        }
    }
    return { out, kind, nrow, rowH };
}

// share of pixels more than `tol` colour steps off; pixels next to an edge of the reference are counted apart
export function compare(s, ref, tol = 1) {
    const { out, kind, nrow, rowH } = ref;
    const px = s.pixels;
    let bad = 0, badEdge = 0, n = 0;
    const diff = new Uint8Array(480 * nrow * 3);
    for (let k = 0; k < nrow; k++) {
        const y = Math.min(H - 1, Math.floor((k + 0.5) * rowH * SS));
        for (let p = 1; p < 479; p++) {
            const o = (k * 480 + p) * 3, so = (y * W + p * SS) * 3;
            const d = Math.max(Math.abs(px[so] / 17 - out[o]), Math.abs(px[so + 1] / 17 - out[o + 1]), Math.abs(px[so + 2] / 17 - out[o + 2]));
            n++;
            const kd = kind[k * 480 + p];
            const edge = kind[k * 480 + p - 1] !== kd || kind[k * 480 + p + 1] !== kd || (p > 1 && kind[k * 480 + p - 2] !== kd) || (p < 478 && kind[k * 480 + p + 2] !== kd);
            diff[o] = diff[o + 1] = diff[o + 2] = out[o + 1] * 8;
            if (d > tol) { if (edge) { badEdge++; diff[o] = 255; diff[o + 1] = 160; } else { bad++; diff[o] = 255; diff[o + 1] = 0; diff[o + 2] = 255; } }
        }
    }
    return { bad: bad / n, badEdge: badEdge / n, diff };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const png = process.argv.includes('--png');
    // camera poses: x, y, z (units), yaw, pitch; then quality and stride
    const poses = [
        [0, 1.9, -7.2, 0, -7], [3.5, 1.2, -5, -35, -4], [-5, 3.5, -4, 50, -25], [0.3, 6, -0.4, 10, -78], [-2.2, 0.4, -4.2, 20, 12],
        [6, 0.9, 2, -110, 2], [0, 2.2, 3.4, 180, -15], [-1.2, 1, -3.9, 12, 0], [2.4, 2.6, -2.4, -40, -30], [-9, 4, -9, 45, -14],
        [7.6, 2.3, -1.6, -21, -13], [3.5, 3.2, 8.6, 160, -18], [5.6, 6.5, 3.6, 5, -78], [2.0, 1.0, 2.0, 55, 4],
        [5.5, 2.5, -7.8, -18, -9], [8.3, 1.7, -5.9, -20, -3], [4.2, 1.2, 0.4, 118, 6], [6.3, 5.5, -1.6, 0, -76],
    ];
    const modes = [[1, 1, 1, 0], [2, 4, 2, 0], [2, 4, 2, 1], [3, 3, 2, 1], [6, 5, 2, 1]];
    let worst = 0;
    for (const [qv, st, gap, vr] of modes) {
        const s = createSim({ consts: { QAUTO: 0, QSTART: qv } });
        s.frame();
        s.poke('vreuse', vr); s.call('setQuality(qLevel)');
        let line = `Q${qv} stride ${st} reuse ${vr}:`;
        for (let pi = 0; pi < poses.length; pi++) {
            const [x, y, z, yw, pt] = poses[pi];
            s.poke('camX', Math.round(x * 1024)); s.poke('camY', Math.round(y * 1024)); s.poke('camZ', Math.round(z * 1024)); s.poke('yaw', yw); s.poke('pitch', pt);
            s.poke('stride', st); s.poke('bisGap', gap);
            s.time = 0.37 * (pi + 1) * 7;
            s.frame(0);
            const ref = reference(s);
            const r = compare(s, ref);
            line += ` ${(r.bad * 100).toFixed(2)}/${(r.badEdge * 100).toFixed(2)}`;
            if (st === 1) worst = Math.max(worst, r.bad);
            if (png && (st === 1 || (st === 4 && vr === 1))) {
                await s.png(path.join(HERE, `t_${st}_${pi}.png`));
                await sharp(Buffer.from(r.diff), { raw: { width: 480, height: ref.nrow, channels: 3 } }).resize(960, 540, { kernel: 'nearest', fit: 'fill' }).png().toFile(path.join(HERE, `t_${st}_${pi}_diff.png`));
            }
        }
        console.log(line + '   (% off inside / % off at edges, per pose)');
    }
    console.log(worst < 0.004 ? 'PASS' : 'FAIL', 'worst inside share at stride 1:', (worst * 100).toFixed(3) + '%');
}
