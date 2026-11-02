/**
 * Procedural, tile-free city for the CV route map (components/home/journey).
 * Everything is generated from a fixed seed: a street grid, an airport by a lake,
 * soft low-poly blocks, parks, and one filleted route that visits every CV stop.
 * Units: 1 block = B world units. Ground is the XZ plane, +Y up.
 */
export const B = 12;
export const ROAD_W = 2.2, MAJOR_W = 3.2, ROUTE_W = 1.35;

/** Map extent in blocks. The lake starts just south of z = LAKE_Z. */
export const EXT = { x0: -11, x1: 20, z0: -21, z1: 3 } as const;
export const LAKE_Z = 3.35;
/** Airport rectangle in blocks (no grid, no buildings). */
export const AIRPORT = { x0: -10.6, x1: -1.6, z0: -3.4, z1: 3 } as const;
/** "Downtown": where the towers rise (blocks). */
const DOWNTOWN = { x: 14.5, z: -15.5 };

/** Route corners, in blocks. Integer coords sit on the street grid; the diagonals are ramps/expressway. */
const ROUTE: [number, number][] = [
  [-6.2, 1], [-2, 1], [-1, 0], [0, -1], [0, -3], [3, -3], [3, -5], [6, -5], [6, -7], [8, -7],
  [10, -9], [10, -12], [13, -12], [13, -15], [16, -15], [16, -18.6],
];
/** Stops, in drive order, as points on the route (blocks). Index 0 is Arrivals. */
export const STOP_POINTS: [number, number][] = [
  [-3.9, 1], [1.5, -3], [4.5, -5], [7, -7], [10, -10.5], [11.8, -12], [13, -14], [16, -17.4],
];

export type Path = { pts: Float32Array; tan: Float32Array; s: Float32Array; length: number; n: number };
export type Building = { x: number; z: number; w: number; d: number; h: number; tone: number };
export type Tree = { x: number; z: number; r: number };
export type Rect = { x: number; z: number; w: number; d: number };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Polyline with rounded (filleted) corners, resampled at ~`step` units. */
export function buildPath(corners: [number, number][], radius = 3.2, step = 0.4): Path {
  const P = corners.map(([x, z]) => [x * B, z * B]);
  const raw: number[][] = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], [cx, cz] = P[i + 1];
    const l1 = Math.hypot(bx - ax, bz - az), l2 = Math.hypot(cx - bx, cz - bz);
    const d1 = [(bx - ax) / l1, (bz - az) / l1], d2 = [(cx - bx) / l2, (cz - bz) / l2];
    const t = Math.min(radius, 0.45 * l1, 0.45 * l2); // tangent length of the fillet
    const p0 = [bx - d1[0] * t, bz - d1[1] * t], p2 = [bx + d2[0] * t, bz + d2[1] * t];
    // quadratic Bézier through the corner approximates the fillet
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      raw.push([a * p0[0] + b * bx + c * p2[0], a * p0[1] + b * bz + c * p2[1]]);
    }
  }
  raw.push(P[P.length - 1]);
  // resample evenly
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const length = cum[cum.length - 1], n = Math.ceil(length / step) + 1;
  const pts = new Float32Array(n * 2), tan = new Float32Array(n * 2), s = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / (n - 1)) * length;
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j] || 1, f = (d - cum[j]) / seg;
    pts[i * 2] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f;
    pts[i * 2 + 1] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f;
    s[i] = d;
  }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    const dx = pts[b * 2] - pts[a * 2], dz = pts[b * 2 + 1] - pts[a * 2 + 1], l = Math.hypot(dx, dz) || 1;
    tan[i * 2] = dx / l; tan[i * 2 + 1] = dz / l;
  }
  return { pts, tan, s, length, n };
}

/** Position + unit tangent at arc length `d`. */
export function sampleAt(p: Path, d: number, out = { x: 0, z: 0, tx: 0, tz: 1 }) {
  const f = Math.max(0, Math.min(1, d / p.length)) * (p.n - 1);
  const i = Math.min(p.n - 2, Math.floor(f)), k = f - i;
  out.x = p.pts[i * 2] + (p.pts[i * 2 + 2] - p.pts[i * 2]) * k;
  out.z = p.pts[i * 2 + 1] + (p.pts[i * 2 + 3] - p.pts[i * 2 + 1]) * k;
  const tx = p.tan[i * 2] + (p.tan[i * 2 + 2] - p.tan[i * 2]) * k, tz = p.tan[i * 2 + 1] + (p.tan[i * 2 + 3] - p.tan[i * 2 + 1]) * k;
  const l = Math.hypot(tx, tz) || 1;
  out.tx = tx / l; out.tz = tz / l;
  return out;
}

function nearestS(p: Path, x: number, z: number) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < p.n; i++) {
    const d = (p.pts[i * 2] - x) ** 2 + (p.pts[i * 2 + 1] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return p.s[best];
}

const inAirport = (x: number, z: number) => x > AIRPORT.x0 && x < AIRPORT.x1 && z > AIRPORT.z0 && z < AIRPORT.z1;

export type CityMap = {
  path: Path;
  stopS: number[];
  roads: Rect[];
  runways: Rect[];
  marks: Rect[];
  buildings: Building[];
  parks: Rect[];
  trees: Tree[];
  terminal: Rect;
};

export function generateCity(seed = 1102, lite = false): CityMap {
  const rnd = mulberry32(seed);
  const path = buildPath(ROUTE);
  const stopS = STOP_POINTS.map(([x, z]) => nearestS(path, x * B, z * B));

  // ── streets: a Manhattan grid, every 4th street wider, clipped around the airport and lake ──
  const roads: Rect[] = [];
  for (let i = EXT.x0; i <= EXT.x1; i++) {
    const w = i % 4 === 0 ? MAJOR_W : ROAD_W, x = i * B;
    const z1 = i > AIRPORT.x0 && i < AIRPORT.x1 ? AIRPORT.z0 : EXT.z1;
    roads.push({ x, z: ((EXT.z0 + z1) / 2) * B, w, d: (z1 - EXT.z0) * B + w });
  }
  for (let j = EXT.z0; j <= EXT.z1; j++) {
    const w = j % 4 === 0 || j === (EXT.z1 as number) ? MAJOR_W : ROAD_W, z = j * B;
    const x0 = j > AIRPORT.z0 && j < AIRPORT.z1 ? AIRPORT.x1 : EXT.x0;
    roads.push({ x: ((x0 + EXT.x1) / 2) * B, z, w: (EXT.x1 - x0) * B + w, d: w });
  }

  // ── airport: two runways with centreline dashes, an apron road and a terminal ──
  const runways: Rect[] = [], marks: Rect[] = [];
  for (const rz of [-2.1, -0.2]) {
    const x0 = (AIRPORT.x0 + 0.6) * B, x1 = (AIRPORT.x1 - 1.1) * B;
    runways.push({ x: (x0 + x1) / 2, z: rz * B, w: x1 - x0, d: 4.6 });
    for (let x = x0 + 4; x < x1 - 4; x += 6) marks.push({ x, z: rz * B, w: 2.6, d: 0.28 });
    for (const e of [x0 + 1.6, x1 - 1.6]) for (let k = -3; k <= 3; k++) if (k) marks.push({ x: e, z: rz * B + k * 0.55, w: 2.2, d: 0.26 });
  }
  const terminal: Rect = { x: -3.9 * B, z: 1.95 * B, w: 2.6 * B, d: 0.55 * B };

  // ── blocks: subdivided lots with soft boxes; parks with round trees ──
  const buildings: Building[] = [], parks: Rect[] = [], trees: Tree[] = [];
  const nearRoute = (cx: number, cz: number, half: number) => {
    for (let k = 0; k < path.n; k += 2) if (Math.abs(path.pts[k * 2] - cx) < half && Math.abs(path.pts[k * 2 + 1] - cz) < half) return true;
    return false;
  };
  const touchesRoute = (cx: number, cz: number) => {
    for (let k = 0; k < path.n; k += 3) if (Math.hypot(path.pts[k * 2] - cx, path.pts[k * 2 + 1] - cz) < B * 0.95) return true;
    return false;
  };
  const xs = lite ? [EXT.x0 + 3, EXT.x1 - 1] : [EXT.x0, EXT.x1];
  for (let i = xs[0]; i < xs[1]; i++) {
    for (let j = EXT.z0; j < EXT.z1; j++) {
      const cx = (i + 0.5) * B, cz = (j + 0.5) * B;
      if (inAirport(i + 0.5, j + 0.5) || inAirport(i + 0.05, j + 0.5) || inAirport(i + 0.95, j + 0.5)) continue;
      const inner = B - MAJOR_W - 1.4; // block plate size inside the kerbs
      if (nearRoute(cx, cz, inner / 2 + 0.6)) continue; // a diagonal ramp cuts this block
      if (rnd() < 0.07) {
        parks.push({ x: cx, z: cz, w: inner, d: inner });
        const nt = 5 + Math.floor(rnd() * 6);
        for (let t = 0; t < nt; t++) trees.push({ x: cx + (rnd() - 0.5) * inner * 0.8, z: cz + (rnd() - 0.5) * inner * 0.8, r: 0.7 + rnd() * 0.6 });
        continue;
      }
      const dd = Math.hypot(i + 0.5 - DOWNTOWN.x, j + 0.5 - DOWNTOWN.z);
      const tall = Math.exp(-(dd * dd) / (2 * 3.2 * 3.2));
      const shore = j >= EXT.z1 - 1 ? 0.6 : 1;
      const cap = touchesRoute(cx, cz) ? 4.5 + tall * 4 : Infinity;
      const split = rnd(), gap = 0.8;
      const lots: Rect[] = [];
      if (split < 0.2 + tall * 0.3) lots.push({ x: cx, z: cz, w: inner, d: inner });
      else if (split < 0.55) {
        const h = (inner - gap) / 2;
        const vert = rnd() < 0.5;
        for (const o of [-1, 1]) lots.push(vert ? { x: cx + o * (h + gap) / 2, z: cz, w: h, d: inner } : { x: cx, z: cz + o * (h + gap) / 2, w: inner, d: h });
      } else {
        const h = (inner - gap) / 2;
        for (const ox of [-1, 1]) for (const oz of [-1, 1]) lots.push({ x: cx + ox * (h + gap) / 2, z: cz + oz * (h + gap) / 2, w: h, d: h });
      }
      for (const l of lots) {
        if (rnd() < 0.07) continue; // the odd empty lot keeps it airy
        const set = 0.25 + rnd() * 0.5;
        let h = (1.4 + rnd() * 2.6) * shore + tall * (4 + rnd() * rnd() * 18);
        h = Math.min(h, cap);
        buildings.push({ x: l.x, z: l.z, w: Math.max(1.2, l.w - set), d: Math.max(1.2, l.d - set), h, tone: rnd() });
      }
    }
  }
  return { path, stopS, roads, runways, marks, buildings, parks, trees, terminal };
}
