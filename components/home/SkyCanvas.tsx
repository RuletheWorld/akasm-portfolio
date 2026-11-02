"use client";
/**
 * Procedurally generated volumetric sky behind the cabin window (see lib/skyShader.ts).
 * - Seeded per load (or `?seed=12` for repeatable screenshots).
 * - Raymarched at reduced resolution (upscaled + softened by CSS), dithered, <= 30fps,
 *   and only while on screen and the tab is visible. `?skyperf` records GPU frame times.
 * - prefers-reduced-motion: keeps the 3D sky, drifting at a fifth of the speed (never swaps to 2D).
 * - Follows the theme (day <-> night) with a short crossfade.
 * - No WebGL (or ?static): paints a static seeded noise deck once with 2D canvas.
 */
import { useEffect, useRef } from "react";
import { SKY_FRAG, SKY_VERT, makeNoiseTable } from "@/lib/skyShader";

// Render scale vs CSS px (DPR capped at 1.5): ~0.55-0.8x CSS res, upscaled by the browser.
const RES = 0.55;
const isDark = () => document.documentElement.dataset.theme === "dark";

function pickSeed() {
  const q = new URLSearchParams(location.search).get("seed");
  const n = q === null ? NaN : Number(q);
  return Number.isFinite(n) ? n % 97 : Math.random() * 90 + 3;
}

export default function SkyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const seed = pickSeed();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(32, Math.round(cv.clientWidth * dpr * RES));
      const h = Math.max(32, Math.round(cv.clientHeight * dpr * RES));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
      return false;
    };

    const forceStatic = new URLSearchParams(location.search).has("static");
    const gl = forceStatic ? null : cv.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) {
      // static 2D fallback, still procedural
      const paint = () => { size(); paintFallback(cv, seed, isDark()); };
      paint();
      const mo = new MutationObserver(paint);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => mo.disconnect();
    }

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, SKY_VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SKY_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { paintFallback(cv, seed, isDark()); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uNight = gl.getUniformLocation(prog, "uNight");
    gl.uniform1f(gl.getUniformLocation(prog, "uSeed"), seed);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeNoiseTable(seed));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.uniform1i(gl.getUniformLocation(prog, "uNoise"), 0);
    const perf: number[] | null = new URLSearchParams(location.search).has("skyperf") ? [] : null;
    if (perf) (window as unknown as { __skyPerf: number[] }).__skyPerf = perf;
    const px = new Uint8Array(4);

    const st = { time: seed * 3.7, night: isDark() ? 1 : 0, target: isDark() ? 1 : 0, last: 0, raf: 0, visible: true, lost: false };

    const draw = () => {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, st.time);
      gl.uniform1f(uNight, st.night);
      if (!perf) { gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
      const t0 = performance.now();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // forces the GPU to finish
      perf.push(performance.now() - t0);
    };

    const frame = (now: number) => {
      st.raf = 0;
      if (st.lost || !st.visible || document.hidden) return;
      const dt = st.last ? Math.min(0.1, (now - st.last) / 1000) : 0;
      if (st.last && now - st.last < 32) { st.raf = requestAnimationFrame(frame); return; } // ~30fps cap
      st.last = now;
      // reduced motion: same sky, slower drift
      st.time += dt * (reduce.matches ? 0.2 : 1);
      st.night += (st.target - st.night) * Math.min(1, dt * 4.5);
      if (Math.abs(st.target - st.night) < 0.002) st.night = st.target;
      draw();
      st.raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(frame); } };

    size();
    kick();

    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); });
    io.observe(cv);
    const ro = new ResizeObserver(() => { if (size()) kick(); });
    ro.observe(cv);
    const mo = new MutationObserver(() => { st.target = isDark() ? 1 : 0; kick(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    reduce.addEventListener("change", kick);
    const onLost = (e: Event) => { e.preventDefault(); st.lost = true; };
    cv.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(st.raf);
      io.disconnect(); ro.disconnect(); mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", kick);
      cv.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="hw-clouds" aria-hidden />;
}

/* ---------- 2D fallback: same idea, computed once on the CPU at low resolution ---------- */
function paintFallback(cv: HTMLCanvasElement, seed: number, night: boolean) {
  const w = 72, h = Math.max(32, Math.round((72 * cv.clientHeight) / Math.max(1, cv.clientWidth)));
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  if (!g) return;
  const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 17.3) * 43758.5453; return s - Math.floor(s); };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x: number, y: number) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * noise(x, y); const nx = 1.6 * x - 1.2 * y; y = 1.2 * x + 1.6 * y; x = nx; a *= 0.5; } return v; };
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
  const sTop = night ? [0.03, 0.05, 0.13] : [0.42, 0.68, 0.97], sHz = night ? [0.18, 0.23, 0.38] : [0.9, 0.94, 0.99];
  const lit = night ? [0.58, 0.64, 0.8] : [1, 1, 0.99], shade = night ? [0.09, 0.11, 0.2] : [0.6, 0.68, 0.81];
  const img = g.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    const v = 1 - py / h;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      let col = mix(sHz, sTop, Math.pow(Math.max(0, (v - (night ? 0.26 : 0.5)) / (night ? 0.74 : 0.5)), 0.6));
      const d = (night ? 0.28 : 0.52) - v;
      if (d > 0) {
        const z = 0.28 / (d + 0.012), x = (u - 0.5) * (w / h) * z * 1.2 + seed, y = z * 1.4 + seed;
        const c = fbm(x, y), dens = Math.min(1, Math.max(0, (c - 0.3) / 0.4));
        const cc = mix(sHz, mix(shade, lit, dens), Math.min(1, d / 0.16));
        col = mix(col, cc, Math.min(1, d / 0.025));
      }
      const i = (py * w + px) * 4;
      img.data[i] = col[0] * 255; img.data[i + 1] = col[1] * 255; img.data[i + 2] = col[2] * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}
