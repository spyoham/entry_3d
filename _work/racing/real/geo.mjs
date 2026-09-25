// ============================================================
// real/geo.mjs - which real circuit each game slot is, and the map projection.
// World axes: x east, z north, metres, about the middle of the circuit
// (the renderer's right normal of a road heading +z is +x, so the map is not
// mirrored).
// ============================================================
export const CIRCUITS = [
    { slot: 1, id: 'mc-1929', pad: 420 },   // Monaco
    { slot: 2, id: 'be-1925', pad: 380 },   // Spa-Francorchamps
    { slot: 3, id: 'jp-1962', pad: 380 },   // Suzuka
    { slot: 4, id: 'gb-1948', pad: 380 },   // Silverstone
    { slot: 5, id: 'it-1922', pad: 380 },   // Monza
    { slot: 6, id: 'sg-2008', pad: 420 },   // Singapore (Marina Bay)
    { slot: 7, id: 'br-1940', pad: 380 },   // Interlagos
    { slot: 8, id: 'az-2016', pad: 420 },   // Baku
];

export function makeProj(lon0, lat0) {
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180);
    const kz = 110574;
    return {
        fwd: (lon, lat) => [(lon - lon0) * kx, (lat - lat0) * kz],
        inv: (x, z) => [lon0 + x / kx, lat0 + z / kz],
    };
}
export const lonLatToXZ = makeProj;
