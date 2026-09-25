// ============================================================
// real/fetch.mjs - download what the real circuits are built from, once.
//   * centrelines: bacinger/f1-circuits (MIT), the racing line of each
//     circuit as lon/lat, starting at the line and running the race direction
//   * surroundings: OpenStreetMap through Overpass (ODbL) - buildings, water,
//     woods, parks, the raceway itself (tunnels, pit lane)
//   * heights: SRTM 30 m through OpenTopoData, along the lap and on a ring
//     of points out to 12 km for the skyline
// Everything lands in real/cache/ (not in git); prep.mjs turns it into
// real/circuits.json, which is.
// usage: node real/fetch.mjs [circuit ids...]
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { CIRCUITS, lonLatToXZ } from './geo.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, 'cache');
fs.mkdirSync(CACHE, { recursive: true });
const UA = 'entry-racing-track-builder/1.0 (personal hobby project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(u, opts = {}, tries = 8) {
    for (let t = 0; t < tries; t++) {
        try {
            const r = await fetch(u, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
            const s = await r.text();
            if (s[0] === '{' || s[0] === '[') return JSON.parse(s);
            console.log('  retry', t + 1, r.status, (s.match(/Error<\/strong>: ([^<]*)/) || [])[1] || s.slice(0, 80));
        } catch (e) { console.log('  retry', t + 1, e.message); }
        await sleep(8000 + t * 6000);
    }
    throw new Error('gave up on ' + u.slice(0, 120));
}

// ---- centrelines ----
const GJ = path.join(CACHE, 'f1-circuits.geojson');
if (!fs.existsSync(GJ)) {
    const r = await fetch('https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson');
    fs.writeFileSync(GJ, await r.text());
}
const gj = JSON.parse(fs.readFileSync(GJ, 'utf8'));

const want = process.argv.slice(2);
for (const C of CIRCUITS) {
    if (want.length && !want.includes(C.id)) continue;
    const feat = gj.features.find((f) => f.properties.id === C.id);
    if (!feat) throw new Error('no centreline for ' + C.id);
    const line = feat.geometry.coordinates;
    fs.writeFileSync(path.join(CACHE, C.id + '.line.json'), JSON.stringify({ props: feat.properties, line }));
    let lo0 = 1e9, lo1 = -1e9, la0 = 1e9, la1 = -1e9;
    for (const [lo, la] of line) { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.min(la0, la); la1 = Math.max(la1, la); }
    const cla = (la0 + la1) / 2;
    const padLa = C.pad / 111320, padLo = C.pad / (111320 * Math.cos(cla * Math.PI / 180));
    const bb = [la0 - padLa, lo0 - padLo, la1 + padLa, lo1 + padLo].map((v) => v.toFixed(5)).join(',');
    console.log(C.id, feat.properties.Name, line.length, 'points, bbox', bb);

    // ---- OpenStreetMap ----
    const OSM = path.join(CACHE, C.id + '.osm.json');
    if (!fs.existsSync(OSM)) {
        const q = `[out:json][timeout:240][maxsize:400000000];
(
  way["building"](${bb});
  relation["building"](${bb});
  way["building:part"](${bb});
  way["natural"~"^(water|wood|coastline|tree_row|scrub|bay|beach|cliff)$"](${bb});
  relation["natural"~"^(water|wood|bay)$"](${bb});
  way["landuse"~"^(forest|grass|meadow|farmland|residential|commercial|industrial|retail|construction|railway|orchard|vineyard)$"](${bb});
  relation["landuse"~"^(forest|residential)$"](${bb});
  way["waterway"~"^(river|canal|riverbank|dock)$"](${bb});
  way["leisure"~"^(park|stadium|marina|garden|golf_course|pitch)$"](${bb});
  relation["leisure"~"^(park|marina)$"](${bb});
  way["highway"="raceway"](${bb});
  way["man_made"~"^(pier|breakwater|tower|bridge)$"](${bb});
  way["harbour"](${bb});
  way["amenity"="parking"](${bb});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${bb});
  way["railway"="rail"](${bb});
  node["natural"="tree"](${bb});
);
out tags geom;`;
        const d = await getJSON('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q));
        fs.writeFileSync(OSM, JSON.stringify(d));
        console.log('  osm', d.elements.length, 'elements');
        await sleep(4000);
    }

    // ---- heights: along the lap (every ~8 m) and a skyline ring ----
    const ELV = path.join(CACHE, C.id + '.elev.json');
    if (!fs.existsSync(ELV)) {
        const pts = [];
        for (let i = 0; i < line.length; i++) {
            const a = line[i], b = line[(i + 1) % line.length];
            const d = Math.hypot((b[0] - a[0]) * 111320 * Math.cos(a[1] * Math.PI / 180), (b[1] - a[1]) * 111320);
            const n = Math.max(1, Math.round(d / 8));
            for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
        }
        // the skyline: 64 bearings x distances out to 12 km from the middle
        const clo = (lo0 + lo1) / 2;
        const ring = [];
        const DIST = [600, 900, 1300, 1800, 2500, 3300, 4300, 5500, 7000, 9000, 12000];
        for (let a = 0; a < 64; a++) for (const r of DIST) {
            const th = a * 2 * Math.PI / 64;
            ring.push([clo + Math.sin(th) * r / (111320 * Math.cos(cla * Math.PI / 180)), cla + Math.cos(th) * r / 111320]);
        }
        const all = pts.concat(ring);
        const out = [];
        for (let i = 0; i < all.length; i += 100) {
            const chunk = all.slice(i, i + 100);
            const q = chunk.map(([lo, la]) => la.toFixed(6) + ',' + lo.toFixed(6)).join('|');
            const d = await getJSON('https://api.opentopodata.org/v1/srtm30m?interpolation=bilinear&locations=' + q);
            for (const r of d.results) out.push(r.elevation);
            await sleep(1100);
        }
        fs.writeFileSync(ELV, JSON.stringify({ lap: pts.map((p, i) => [p[0], p[1], out[i]]), ring: ring.map((p, i) => [p[0], p[1], out[pts.length + i]]), dist: DIST, centre: [clo, cla] }));
        console.log('  elevation', out.length, 'samples, lap', Math.min(...out.slice(0, pts.length)), '..', Math.max(...out.slice(0, pts.length)));
    }

    // ---- the lie of the land round the circuit: a 60 m height grid ----
    const GRD = path.join(CACHE, C.id + '.grid.json');
    if (!fs.existsSync(GRD)) {
        const [a0, b0, a1, b1] = bb.split(',').map(Number);
        const step = 60;
        const nLa = Math.ceil((a1 - a0) * 110574 / step) + 1;
        const nLo = Math.ceil((b1 - b0) * 111320 * Math.cos(cla * Math.PI / 180) / step) + 1;
        const all = [];
        for (let r = 0; r < nLa; r++) for (let c = 0; c < nLo; c++) all.push([b0 + (b1 - b0) * c / (nLo - 1), a0 + (a1 - a0) * r / (nLa - 1)]);
        const out = [];
        for (let i = 0; i < all.length; i += 100) {
            const q = all.slice(i, i + 100).map(([lo, la]) => la.toFixed(6) + ',' + lo.toFixed(6)).join('|');
            const d = await getJSON('https://api.opentopodata.org/v1/srtm30m?interpolation=bilinear&locations=' + q);
            for (const r of d.results) out.push(r.elevation);
            await sleep(1100);
        }
        fs.writeFileSync(GRD, JSON.stringify({ bbox: [a0, b0, a1, b1], nLa, nLo, h: out }));
        console.log('  grid', nLa, 'x', nLo);
    }

    // ---- relations again with their members' shapes (the query above
    //      prints tags only for them: 'out tags geom' leaves members out) ----
    const REL = path.join(CACHE, C.id + '.rel.json');
    if (!fs.existsSync(REL)) {
        const q = `[out:json][timeout:240];
(
  relation["building"](${bb});
  relation["natural"~"^(water|wood|bay)$"](${bb});
  relation["landuse"~"^(forest|residential)$"](${bb});
  relation["leisure"~"^(park|marina)$"](${bb});
  relation["waterway"="riverbank"](${bb});
);
out geom;`;
        const d = await getJSON('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q));
        fs.writeFileSync(REL, JSON.stringify(d));
        console.log('  relations', d.elements.length);
        await sleep(4000);
    }

    // ---- named sights the scenery has its own models for ----
    const EXT = path.join(CACHE, C.id + '.sights.json');
    if (!fs.existsSync(EXT)) {
        const [a0, b0, a1, b1] = bb.split(',').map(Number);
        const w = 0.03;   // a little wider: a Ferris wheel or a tower is seen from far off
        const bx = [a0 - w, b0 - w, a1 + w, b1 + w].map((v) => v.toFixed(5)).join(',');
        const q = `[out:json][timeout:120];
(
  nwr["attraction"="big_wheel"](${bx});
  nwr["building"]["height"](if: t["height"] > 120)(${bx});
  nwr["man_made"="tower"]["height"](if: t["height"] > 80)(${bx});
);
out tags center;`;
        const d = await getJSON('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q));
        fs.writeFileSync(EXT, JSON.stringify(d));
        console.log('  sights', d.elements.length);
        await sleep(4000);
    }
}
void lonLatToXZ;
