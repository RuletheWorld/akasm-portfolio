/**
 * Decide whether the WebGL scenes (gate, sky, CV map) run, or their 2D fallbacks.
 * Rule: any WebGL context ⇒ 3D. Reduced motion only softens motion inside the scenes;
 * it never swaps to 2D. `?static` is the one manual 2D switch.
 */
let cached: boolean | null = null;

export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

export function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(location.search).has("static")) return false;
  return hasWebGL();
}

/** Scenes read this to calm motion (smaller hover, slower drift) — never to disable 3D. */
export const softMotion = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
