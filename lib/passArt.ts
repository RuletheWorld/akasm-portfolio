/**
 * Boarding-pass artwork, drawn in code (original design for Raphael Merchant).
 * 984×480 logical px, rendered at 2× → 1968×960. Used as the 3D card texture
 * and, via toDataURL, by the static (non-WebGL) fallback.
 */
import { site } from "@/content/site";

export const PASS_W = 984, PASS_H = 480, PASS_SCALE = 2;

const INK = "#1b1a16", SOFT = "#7c7a72", FAINT = "#b9b6ad", BLUE = "#3a53ed", PAPER = "#fbf9f4", LINE = "#d9d6ea";

function fam(varName: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export async function passFonts() {
  const sans = fam("--font-geist-sans", "system-ui, sans-serif");
  const mono = fam("--font-dm-mono", "ui-monospace, monospace");
  try {
    await Promise.all([
      document.fonts.load(`500 20px ${sans}`),
      document.fonts.load(`400 20px ${sans}`),
      document.fonts.load(`400 20px ${mono}`),
      document.fonts.load(`500 20px ${mono}`),
    ]);
  } catch {}
  return { sans, mono };
}

type F = { sans: string; mono: string };

function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, ls = 0, align: CanvasTextAlign = "left") {
  g.font = font;
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls}px`;
  g.fillStyle = color;
  g.textAlign = align;
  g.fillText(s, x, y);
}

function field(g: CanvasRenderingContext2D, f: F, label: string, value: string, x: number, y: number, size = 22) {
  txt(g, label, x, y, `500 8.5px ${f.mono}`, BLUE, 1.4);
  txt(g, value, x, y + size + 4, `400 ${size}px ${f.mono}`, INK, 1.2);
}

function monogram(g: CanvasRenderingContext2D, f: F, x: number, y: number, s: number, fill = BLUE, ink = "#fff") {
  g.fillStyle = fill;
  roundRect(g, x, y, s, s, s * 0.22);
  g.fill();
  txt(g, site.monogram, x + s / 2, y + s * 0.68, `500 ${s * 0.46}px ${f.sans}`, ink, -0.5, "center");
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function paper(g: CanvasRenderingContext2D, seed: number) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, PASS_W, PASS_H);
  const r = rng(seed);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(80,70,40,${r() * 0.05})`;
    g.fillRect(r() * PASS_W, r() * PASS_H, 1, 1);
  }
}

/** Topographic contour lines — a nod to aerial / drone work. */
function contours(g: CanvasRenderingContext2D, cx: number, cy: number, n: number, seed: number, alpha = 0.55) {
  const r = rng(seed);
  const ph = Array.from({ length: 4 }, () => r() * Math.PI * 2);
  g.save();
  g.strokeStyle = LINE;
  g.globalAlpha = alpha;
  g.lineWidth = 0.8;
  for (let k = 1; k <= n; k++) {
    g.beginPath();
    const base = k * 17;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.04) {
      const w = 1 + 0.16 * Math.sin(3 * a + ph[0]) + 0.09 * Math.sin(5 * a + ph[1]) + 0.05 * Math.sin(7 * a + ph[2] + k * 0.2);
      const rr = base * w;
      const x = cx + Math.cos(a) * rr * 1.5, y = cy + Math.sin(a) * rr;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

/** Camera-aperture seal (six blades). */
function aperture(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  g.save();
  g.strokeStyle = FAINT;
  g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx, cy, R * 0.82, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82);
    g.lineTo(cx + Math.cos(a + 2.1) * R * 0.3, cy + Math.sin(a + 2.1) * R * 0.3);
    g.stroke();
  }
  g.restore();
}

function barcode(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  let cx = x;
  g.fillStyle = INK;
  while (cx < x + w) {
    const bw = r() < 0.6 ? 1.2 : r() < 0.7 ? 2.4 : 3.6;
    if (r() > 0.35) g.fillRect(cx, y, bw, h * (r() < 0.04 ? 0.7 : 1));
    cx += bw + (r() < 0.5 ? 1.2 : 2.2);
  }
}

function plane(g: CanvasRenderingContext2D, x: number, y: number, s: number, color = BLUE) {
  g.save();
  g.translate(x, y);
  g.scale(s / 24, s / 24);
  g.fillStyle = color;
  g.beginPath();
  // simple top-down airliner silhouette, pointing right
  g.moveTo(22, 12); g.lineTo(14, 10.6); g.lineTo(9, 3); g.lineTo(7, 3); g.lineTo(10, 10.4);
  g.lineTo(4.6, 10); g.lineTo(3, 7.6); g.lineTo(1.6, 7.6); g.lineTo(2.4, 12);
  g.lineTo(1.6, 16.4); g.lineTo(3, 16.4); g.lineTo(4.6, 14); g.lineTo(10, 13.6);
  g.lineTo(7, 21); g.lineTo(9, 21); g.lineTo(14, 13.4); g.closePath();
  g.fill();
  g.restore();
}

export function drawPassFront(c: HTMLCanvasElement, f: F) {
  c.width = PASS_W * PASS_SCALE; c.height = PASS_H * PASS_SCALE;
  const g = c.getContext("2d")!;
  g.setTransform(PASS_SCALE, 0, 0, PASS_SCALE, 0, 0);
  g.textBaseline = "alphabetic";
  const p = site.pass;
  paper(g, 7);
  const STUB = 742;
  contours(g, 210, 330, 9, 3, 0.65);
  contours(g, STUB + 150, 40, 6, 11, 0.5);

  // left hatch strip
  g.save();
  g.beginPath(); g.rect(0, 0, 14, PASS_H); g.clip();
  g.strokeStyle = BLUE; g.lineWidth = 2.2;
  for (let y = -20; y < PASS_H + 20; y += 7) { g.beginPath(); g.moveTo(-2, y); g.lineTo(16, y - 14); g.stroke(); }
  g.restore();

  // header
  monogram(g, f, 38, 28, 30);
  txt(g, p.airline, 80, 48, `500 13px ${f.mono}`, INK, 3);
  g.fillStyle = FAINT; g.fillRect(232, 34, 1, 18);
  txt(g, p.tagline, 246, 47, `400 9px ${f.mono}`, SOFT, 1.6);
  txt(g, "BOARDING PASS", STUB - 28, 47, `400 8.5px ${f.mono}`, SOFT, 1.4, "right");

  // passenger
  txt(g, "PASSENGER / PASSAGER", 38, 102, `500 8.5px ${f.mono}`, BLUE, 1.4);
  txt(g, site.passengerName, 38, 134, `400 27px ${f.mono}`, INK, 2);
  txt(g, site.title.toUpperCase(), 38, 154, `400 9px ${f.mono}`, SOFT, 1.5);

  field(g, f, "FLIGHT / VOL", p.flight, 470, 102, 18);
  field(g, f, "DATE", p.date, 590, 102, 18);

  // route
  txt(g, "FROM / DE", 470, 176, `500 8.5px ${f.mono}`, BLUE, 1.4);
  txt(g, p.from.code, 470, 214, `400 34px ${f.mono}`, INK, 3);
  txt(g, p.from.city, 470, 232, `400 8px ${f.mono}`, SOFT, 1.2);
  plane(g, 556, 192, 22);
  txt(g, "TO / À", 600, 176, `500 8.5px ${f.mono}`, BLUE, 1.4);
  txt(g, p.to.code, 600, 214, `400 34px ${f.mono}`, INK, 3);
  txt(g, p.to.city, 600, 232, `400 8px ${f.mono}`, SOFT, 1.2);

  // field row (boxed)
  g.strokeStyle = LINE; g.lineWidth = 1;
  roundRect(g, 38, 190, 400, 70, 8); g.stroke();
  const cols: [string, string][] = [["GATE", p.gate], ["BOARDING", p.boarding], ["SEAT", p.seat], ["ZONE", p.zone], ["CLASS", p.class]];
  cols.forEach(([l, v], i) => {
    const x = 54 + i * 76;
    txt(g, l, x, 214, `500 8px ${f.mono}`, BLUE, 1.3);
    txt(g, v, x, 242, `400 ${v.length > 4 ? 13 : 19}px ${f.mono}`, INK, 1.2);
  });

  aperture(g, 690, 290, 34);

  // fine print
  plane(g, 38, 290, 14, INK);
  const words = p.fineprint.split(" ");
  let line = "", ly = 298;
  g.font = `400 8.5px ${f.mono}`;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > 360) { txt(g, line, 60, ly, `400 8.5px ${f.mono}`, SOFT, 0.6); line = w; ly += 13; }
    else line = t;
  }
  txt(g, line, 60, ly, `400 8.5px ${f.mono}`, SOFT, 0.6);

  txt(g, `${p.cert} · CERTIFIED PILOT`, 470, 288, `400 8px ${f.mono}`, SOFT, 1.2);
  txt(g, "NOT VALID WITHOUT A PORTFOLIO", 470, 302, `400 8px ${f.mono}`, FAINT, 1.2);

  // barcode
  barcode(g, 38, 388, 640, 46, 42);
  txt(g, `${p.flight} ${p.from.code}${p.to.code} ${p.seat} 0001`, 38, 450, `400 8px ${f.mono}`, SOFT, 2.4);

  // perforation + notches
  g.save();
  g.strokeStyle = FAINT; g.setLineDash([3, 4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(STUB, 20); g.lineTo(STUB, PASS_H - 20); g.stroke();
  g.restore();

  // stub
  const sx = STUB + 22;
  monogram(g, f, sx, 28, 20);
  txt(g, p.airline, sx + 28, 43, `500 9px ${f.mono}`, INK, 2);
  field(g, f, "PASSENGER", site.name.toUpperCase(), sx, 86, 11);
  field(g, f, "FLIGHT", p.flight, sx, 136, 12);
  field(g, f, "DATE", p.date, sx + 90, 136, 12);
  field(g, f, "FROM", p.from.code, sx, 186, 14);
  plane(g, sx + 58, 196, 14);
  field(g, f, "TO", p.to.code, sx + 90, 186, 14);
  field(g, f, "SEAT", p.seat, sx, 236, 14);
  field(g, f, "GATE", p.gate, sx + 90, 236, 14);
  field(g, f, "CLASS", p.class, sx, 286, 12);
  // tiny 2D code
  const r = rng(99);
  g.fillStyle = INK;
  const q = 4.2, qx = sx, qy = 336;
  for (let i = 0; i < 17; i++) for (let j = 0; j < 17; j++) {
    const finder = (i < 4 && j < 4) || (i > 12 && j < 4) || (i < 4 && j > 12);
    if (finder ? (i % 3 === 0 || j % 3 === 0 || (i % 13 > 0 && j % 13 > 0 && i % 13 < 3 && j % 13 < 3)) : r() > 0.55) g.fillRect(qx + i * q, qy + j * q, q, q);
  }
  g.save();
  g.translate(PASS_W - 20, PASS_H / 2);
  g.rotate(Math.PI / 2);
  txt(g, "BOARDING PASS · RM", 0, 0, `400 8px ${f.mono}`, SOFT, 3, "center");
  g.restore();
  return c;
}

export function drawPassBack(c: HTMLCanvasElement, f: F) {
  c.width = PASS_W * PASS_SCALE; c.height = PASS_H * PASS_SCALE;
  const g = c.getContext("2d")!;
  g.setTransform(PASS_SCALE, 0, 0, PASS_SCALE, 0, 0);
  paper(g, 19);
  g.save();
  g.globalAlpha = 0.07;
  for (let y = 0; y < PASS_H + 40; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < PASS_W + 40; x += 80) {
    txt(g, site.monogram, x, y, `500 16px ${f.sans}`, BLUE, 0, "center");
  }
  g.restore();
  contours(g, PASS_W / 2, PASS_H / 2, 10, 5, 0.5);
  monogram(g, f, PASS_W / 2 - 40, PASS_H / 2 - 62, 80);
  txt(g, site.name.toUpperCase(), PASS_W / 2, PASS_H / 2 + 52, `400 13px ${f.mono}`, INK, 4, "center");
  txt(g, site.pass.tagline, PASS_W / 2, PASS_H / 2 + 74, `400 8.5px ${f.mono}`, SOFT, 1.8, "center");
  txt(g, "KEEP THIS PASS UNTIL THE FINAL FRAME SHIPS", PASS_W / 2, PASS_H - 30, `400 8px ${f.mono}`, FAINT, 2, "center");
  return c;
}
