/** Decide whether the WebGL gate should run, or the static 2D pass instead. */
export function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(location.search);
  if (q.has("static")) return false;
  if (q.has("force3d")) return true; // used for headless screenshots (software GL)
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  if ((n.hardwareConcurrency ?? 8) <= 2 && (n.deviceMemory ?? 8) <= 2) return false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    return !/swiftshader|llvmpipe|softpipe|softwarepipe|basic render|generic renderer/i.test(r);
  } catch {
    return false;
  }
}
