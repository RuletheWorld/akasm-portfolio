/**
 * Procedural sky for the cabin window: a seeded fBm cloud deck seen in perspective
 * (far clouds drift slowly, near ones faster), high cirrus wisps, a sun by day and a
 * moon + stars by night. Original shader, written for this site.
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

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float N = uNight;
  // at night the half-closed shade covers the top, so the horizon and moon sit lower
  float hz = mix(0.5, 0.26, N);

  vec3 dTop = vec3(0.42, 0.68, 0.97), dHz = vec3(0.90, 0.94, 0.99);
  vec3 nTop = vec3(0.03, 0.05, 0.13), nHz = vec3(0.18, 0.23, 0.38);
  vec3 hzc = mix(dHz, nHz, N);

  // sky gradient
  float ty = clamp((uv.y - hz) / (1.0 - hz), 0.0, 1.0);
  vec3 col = mix(mix(dHz, dTop, pow(ty, 0.6)), mix(nHz, nTop, pow(ty, 0.5)), N);

  // sun by day, moon by night
  vec2 dv = (uv - mix(vec2(0.72, 0.84), vec2(0.70, 0.40), N)) * vec2(asp, 1.0);
  float dl = length(dv);
  col += (1.0 - N) * vec3(1.0, 0.97, 0.88) * 0.5 * exp(-dl * 8.0);
  col += N * vec3(0.70, 0.78, 1.0) * 0.22 * exp(-dl * 12.0);
  col = mix(col, vec3(0.92, 0.94, 1.0), N * smoothstep(0.05, 0.04, dl));

  // stars (night only, fade toward the horizon)
  vec2 sg = uv * vec2(asp, 1.0) * 70.0;
  float h = hash(floor(sg) + uSeed);
  float star = step(0.982, h) * smoothstep(0.22, 0.0, length(fract(sg) - 0.5));
  star *= 0.55 + 0.45 * sin(uTime * 1.3 + h * 70.0);
  col += vec3(0.9, 0.93, 1.0) * star * N * smoothstep(0.05, 0.3, ty) * step(0.07, dl);

  // high cirrus wisps
  float ci = fbm(vec2(uv.x * asp * 1.8 + uTime * 0.006 + uSeed, uv.y * 15.0 + uSeed * 0.3));
  float cm = smoothstep(0.55, 0.85, ci) * smoothstep(0.02, 0.15, ty) * (1.0 - smoothstep(0.35, 0.75, ty));
  col = mix(col, mix(vec3(1.0), vec3(0.32, 0.38, 0.54), N), cm * 0.4);

  // cloud deck in perspective: depth grows toward the horizon, so drift (constant in
  // world space) reads slow far away and fast up close, like layered parallax
  float d = hz + 0.02 - uv.y;
  if (d > 0.0) {
    float z = 0.28 / (d + 0.012);
    vec2 p = vec2((uv.x - 0.5) * asp * z * 1.2 + uTime * 0.045, z * 1.4) + uSeed;
    float c = fbm(p);
    float c2 = fbm(p * 2.3 + c * 1.5);
    float dens = smoothstep(0.30, 0.74, 0.62 * c + 0.48 * c2);
    float sh = clamp((fbm(p + vec2(0.05, 0.22)) - c) * 2.4 + 0.55 * (1.0 - dens), 0.0, 1.0);
    vec3 dayDeck = mix(vec3(1.0, 1.0, 0.99), vec3(0.60, 0.68, 0.81), sh);
    vec3 nightDeck = mix(vec3(0.58, 0.64, 0.80), vec3(0.12, 0.15, 0.27), sh);
    vec3 gap = mix(vec3(0.66, 0.73, 0.85), vec3(0.05, 0.07, 0.14), N);
    vec3 cc = mix(gap, mix(dayDeck, nightDeck, N), 0.5 + 0.5 * dens);
    cc = mix(hzc, cc, smoothstep(0.0, 0.16, d));
    col = mix(col, cc, smoothstep(0.0, 0.025, d));
  }
  gl_FragColor = vec4(col, 1.0);
}
`;
