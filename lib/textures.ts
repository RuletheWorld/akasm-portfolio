import * as THREE from "three";

const canvas = (s: number, h = s) => Object.assign(document.createElement("canvas"), { width: s, height: h });

/** Warm plastic "paper" base with stains and specks. */
export function makePaperTexture(base = "#e8ddc6", s = 512) {
  const c = canvas(s), g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 20 + Math.random() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(120,96,60,.07)"); gr.addColorStop(1, "rgba(120,96,60,0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 1100; i++) {
    g.fillStyle = `rgba(60,50,30,${Math.random() * 0.12})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Brushed micro-scratches, used as bump + roughness. */
export function makeScratchTexture(s = 512) {
  const c = canvas(s), g = c.getContext("2d")!;
  g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1300; i++) {
    const x = Math.random() * s, y = Math.random() * s, l = 4 + Math.random() * 26;
    const a = Math.random() * 0.18;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    g.lineWidth = 0.6 + Math.random() * 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3.4, 0.68);
  return t;
}

export type LcdStatus = "idle" | "near" | "error" | "granted";
export const LCD: Record<LcdStatus, [string, string]> = {
  idle: ["READY", "#7d857c"],
  near: ["READING", "#d9a013"],
  error: ["ERROR", "#e0483a"],
  granted: ["SUCCESS", "#35c56d"],
};
export const LED: Record<LcdStatus, string> = { idle: "#b3aea1", near: "#d9a013", error: "#e0483a", granted: "#1e9e52" };

export function drawLcd(ctx: CanvasRenderingContext2D, s: LcdStatus) {
  const [txt, col] = LCD[s];
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = "#0d0f0d"; ctx.fillRect(0, 0, W, H);
  // ghost segments (unlit "~" glyphs, as on a real 14-seg panel)
  ctx.font = '62px "DSEG14 Classic"';
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "8px";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.035)";
  ctx.fillText("~~~~~~~", W / 2, H / 2 + 2);
  ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col;
  ctx.fillText(txt, W / 2, H / 2 + 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,.35)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1); // scanlines
  const gl = ctx.createLinearGradient(0, 0, 0, H);
  gl.addColorStop(0, "rgba(255,255,255,.05)"); gl.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
}
