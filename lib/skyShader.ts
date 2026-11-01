/**
 * Volumetric sky for the cabin window. Original shader written for this site.
 *
 * A camera at cruising altitude raymarches four cloud levels:
 *   - near cumulus just below the plane (large, fast parallax)
 *   - a distant cumulus deck far below (dense, hazy, slow)
 *   - scattered mid cumulus above the plane (seen from beneath: dark bases, silver edges)
 *   - high cirrus wisps (a thin analytic sheet, very slow)
 * Density = Worley cells (cumulus puffs) shaped by fBm and a height profile.
 * Lighting = Beer–Lambert transmittance, 3-tap light march toward the sun/moon, a
 * powder term, and a two-lobe Henyey–Greenstein phase that gives silver linings.
 * Noise comes from a small seeded lookup table built in JS at runtime (no image files).
 */
export const SKY_VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const SKY_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uNight;
uniform float uSeed;
uniform sampler2D uNoise; // R: random, G: R shifted by (37,17), B: Worley 16 cells, A: Worley 32 cells

float N;
vec3 L;      // light direction (sun by day, moon by night)
vec3 lightCol;

float noise3(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z + f.xy;
  vec2 rg = texture2D(uNoise, (uv + 0.5) / 256.0).rg;
  return mix(rg.x, rg.y, f.z);
}
float fbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return v / 0.875;
}
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

// cloud density for a layer: y0..y1 altitude, sc scale, cov coverage, wx wind offset
float dens(vec3 p, float y0, float y1, float sc, float cov, float wx) {
  float h = (p.y - y0) / (y1 - y0);
  if (h < 0.0 || h > 1.0) return 0.0;
  vec3 q = p * sc; q.x += wx;
  float w = texture2D(uNoise, q.xz * 0.04 + uSeed * 0.013).b;             // cumulus cells
  float n = fbm3(q * 1.7 + uSeed);                                         // billows
  float e = texture2D(uNoise, q.xz * 0.16 + q.y * 0.05 + 0.31).a;          // worley erosion
  float shape = w * 0.85 + n * 0.5 - 0.62 + cov;
  float d = shape - h * h * 0.8 - (1.0 - e) * 0.16 * (1.0 - h * 0.4);
  d *= smoothstep(0.0, 0.1, h);
  return clamp(d * 2.4, 0.0, 1.0);
}

// march one slab; returns premultiplied colour + transmittance
vec4 layer(vec3 rd, float y0, float y1, float sc, float cov, float wx, float sigma, float maxLen,
           float steps, float jit, vec3 ambTop, vec3 ambBot, vec3 haze, float fogK) {
  float ta = y0 / rd.y, tb = y1 / rd.y;
  float tn = max(min(ta, tb), 0.0), tf = max(ta, tb);
  if (tf <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  if (tn >= maxLen) return vec4(0.0, 0.0, 0.0, 1.0);
  tf = min(tf, maxLen); // maxLen = furthest distance this layer is drawn; beyond it is haze
  float dt = (tf - tn) / steps;
  float t = tn + dt * jit;
  float T = 1.0, hit = -1.0;
  vec3 col = vec3(0.0);
  float c = dot(rd, L);
  float phase = mix(hg(c, 0.65), hg(c, -0.2), 0.45) * 16.0;
  float ls = (y1 - y0) * 0.16;
  for (int i = 0; i < 14; i++) {
    if (float(i) >= steps) break;
    vec3 p = rd * t;
    float d = dens(p, y0, y1, sc, cov, wx) * (1.0 - smoothstep(maxLen * 0.55, maxLen, t));
    if (d > 0.004) {
      if (hit < 0.0) hit = t;
      float ld = 0.0;
      for (int j = 1; j <= 3; j++) ld += dens(p + L * ls * float(j), y0, y1, sc, cov, wx);
      float beer = exp(-ld * ls * sigma * 1.1);
      float powder = mix(1.0, 1.0 - exp(-d * 4.0), 0.75 * (1.0 - max(c, 0.0)));
      float h = (p.y - y0) / (y1 - y0);
      vec3 S = lightCol * beer * powder * phase + mix(ambBot, ambTop, h) * 0.6;
      float st = exp(-d * sigma * dt);
      col += T * (1.0 - st) * S;
      T *= st;
      if (T < 0.03) break;
    }
    t += dt;
  }
  if (hit > 0.0) { float f = 1.0 - exp(-hit * fogK); col = mix(col, haze * (1.0 - T), f); }
  return vec4(col, T);
}

void main() {
  N = uNight;
  vec2 uv = gl_FragCoord.xy / uRes - 0.5;
  float asp = uRes.x / uRes.y;
  uv.x *= asp;
  float fov = 1.25;
  // night: look up a little so moon, stars and the mid layer sit below the half-closed shade
  float pitch = mix(-0.06, 0.24, N);
  vec3 rd = normalize(vec3(uv.x * fov, uv.y * fov + pitch, 1.0));

  vec3 sunDir = normalize(vec3(0.5, 0.75, 0.45)); // high, to the right: lit tops facing us
  vec3 moonDir = normalize(vec3(0.20 * asp * fov, -0.08 * fov + 0.24, 1.0));
  L = normalize(mix(sunDir, moonDir, N));
  lightCol = mix(vec3(1.0, 0.96, 0.88) * 1.25, vec3(0.62, 0.70, 0.92) * 0.55, N);

  vec3 skyTop = mix(vec3(0.30, 0.56, 0.93), vec3(0.015, 0.03, 0.08), N);
  vec3 skyHz  = mix(vec3(0.80, 0.88, 0.97), vec3(0.12, 0.16, 0.28), N);
  vec3 ground = mix(vec3(0.58, 0.67, 0.80), vec3(0.04, 0.06, 0.12), N);

  // interleaved-gradient dither for the march start (hides step banding)
  float jit = texture2D(uNoise, (floor(gl_FragCoord.xy) + 0.5) / 256.0 + 0.37).a * 0.5
            + fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 0.5; // dither

  vec3 col = vec3(0.0);
  float T = 1.0;
  float t = uTime;

  if (rd.y > 0.0) {
    // mid cumulus above the plane: seen from below, so bases are dark blue-grey
    vec4 m = layer(rd, 1.0, 1.8, 0.62, -0.14, t * 0.05 + 11.0, 7.0, 14.0, 12.0, jit,
                   mix(vec3(0.80, 0.86, 0.96), vec3(0.16, 0.20, 0.32), N),
                   mix(vec3(0.42, 0.50, 0.64), vec3(0.05, 0.07, 0.13), N), skyHz, 0.05);
    col += m.rgb; T *= m.a;
    // high cirrus: thin sheet far up, very slow
    vec3 cp = rd * (7.0 / rd.y);
    float ci = fbm3(vec3(cp.x * 0.07 + t * 0.004, cp.z * 0.3, uSeed)) * 0.7 + fbm3(vec3(cp.x * 0.5, cp.z * 1.6, uSeed + 3.0)) * 0.3;
    float ca = smoothstep(0.44, 0.72, ci) * 0.6 * exp(-length(cp.xz) * 0.012);
    vec3 cc = mix(vec3(1.0, 0.99, 0.97), vec3(0.42, 0.48, 0.66), N) * (0.85 + 0.35 * pow(max(dot(rd, L), 0.0), 6.0));
    col += T * ca * cc; T *= 1.0 - ca;
    // sky
    vec3 sky = mix(skyHz, skyTop, pow(smoothstep(0.0, 0.6, rd.y), 0.7));
    float sd = max(dot(rd, L), 0.0);
    sky += (1.0 - N) * (vec3(1.0, 0.95, 0.8) * pow(sd, 900.0) * 6.0 + vec3(1.0, 0.92, 0.75) * pow(sd, 12.0) * 0.35);
    sky += N * (vec3(0.95, 0.96, 1.0) * smoothstep(0.9993, 0.9996, sd) + vec3(0.5, 0.6, 0.9) * pow(sd, 40.0) * 0.25);
    vec2 sg = vec2(atan(rd.x, rd.z), rd.y) * 180.0;
    float sh = texture2D(uNoise, (floor(sg) + 0.5) / 256.0).r;
    float star = step(0.985, sh) * smoothstep(0.45, 0.0, length(fract(sg) - 0.5)) * (0.6 + 0.4 * sin(t * 1.3 + sh * 90.0));
    sky += N * star * smoothstep(0.02, 0.2, rd.y) * vec3(0.9, 0.93, 1.0);
    col += T * sky;
  } else {
    // near cumulus just below the plane: big, bright, fast parallax
    vec4 a = layer(rd, -1.0, -0.2, 0.7, -0.12, t * 0.16, 6.5, 16.0, 14.0, jit,
                   mix(vec3(0.92, 0.95, 1.0), vec3(0.20, 0.25, 0.38), N),
                   mix(vec3(0.50, 0.58, 0.72), vec3(0.06, 0.08, 0.15), N), skyHz, 0.03);
    col += a.rgb; T *= a.a;
    // distant deck far below: dense, hazy, slow
    if (T > 0.03) {
      vec4 b = layer(rd, -4.6, -3.8, 0.3, 0.24, t * 0.03 + 5.0, 5.0, 48.0, 8.0, jit,
                     mix(vec3(0.82, 0.88, 0.97), vec3(0.15, 0.19, 0.30), N),
                     mix(vec3(0.52, 0.60, 0.75), vec3(0.05, 0.07, 0.13), N), skyHz, 0.045);
      col += T * b.rgb; T *= b.a;
    }
    col += T * mix(ground, skyHz, exp(rd.y * 9.0));
  }
  // aerial haze toward the horizon
  col = mix(col, skyHz, exp(-abs(rd.y) * 26.0) * 0.75);
  col = col / (1.0 + col * 0.18); // gentle tone curve
  gl_FragColor = vec4(pow(col, vec3(0.97)), 1.0);
}
`;

/** Seeded lookup table for the shader: random + shifted random + two tileable Worley channels. */
export function makeNoiseTable(seed: number): Uint8Array {
  let s = (Math.floor(seed * 1000) ^ 0x9e3779b9) >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const S = 256, out = new Uint8Array(S * S * 4), r = new Uint8Array(S * S);
  for (let i = 0; i < r.length; i++) r[i] = (rnd() * 256) | 0;
  const worley = (cells: number) => {
    const pts = new Float32Array(cells * cells * 2);
    for (let i = 0; i < pts.length; i++) pts[i] = rnd();
    const cs = S / cells, ch = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const gx = Math.floor(x / cs), gy = Math.floor(y / cs);
      let best = 9;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const cx = gx + ox, cy = gy + oy, wx = (cx + cells) % cells, wy = (cy + cells) % cells, k = (wy * cells + wx) * 2;
        const dx = (cx + pts[k]) * cs - x, dy = (cy + pts[k + 1]) * cs - y;
        best = Math.min(best, (dx * dx + dy * dy) / (cs * cs));
      }
      ch[y * S + x] = Math.max(0, Math.min(255, (1 - Math.sqrt(best)) * 255)) | 0;
    }
    return ch;
  };
  const w1 = worley(16), w2 = worley(32);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, o = i * 4;
    out[o] = r[i];
    out[o + 1] = r[((y + 17) & 255) * S + ((x + 37) & 255)];
    out[o + 2] = w1[i];
    out[o + 3] = w2[i];
  }
  return out;
}
